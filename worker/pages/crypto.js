// airglow accounts: the encryption (design/ui-v1/accounts-v1/SPEC.md 5). WebCrypto only, no imports, so the same
// file runs in the TV's WebView, WKWebView, Electron, Node (the tests) and the Worker's /tv page (a copy in
// worker/pages, kept equal by tests/account-crypto-test.js).
const C = globalThis.crypto, SUB = C.subtle;
const te = new TextEncoder(), td = new TextDecoder();
export const KDF_FLOOR = 600000, KDF_CEIL = 5000000, KDF_DEFAULT = 600000;

export const b64u = (bytes) => { let s = ''; const b = new Uint8Array(bytes); for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const unb64u = (s) => { s = String(s); const t = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); const o = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) o[i] = t.charCodeAt(i); return o; };
export const random = (n) => C.getRandomValues(new Uint8Array(n));
const bytes = (x) => (typeof x === 'string' ? te.encode(x) : new Uint8Array(x));

export class WeakKdf extends Error { constructor() { super('This server asked for a weak key. Not signing in.'); this.code = 'weak_kdf'; } }
// Floor and ceiling (SPEC 5.2): anything else is refused before anything is derived
export function checkKdf(k) {
  if (!k || k.alg !== 'pbkdf2-sha256' || !Number.isInteger(k.iterations) || k.iterations < KDF_FLOOR || k.iterations > KDF_CEIL) throw new WeakKdf();
  if (unb64u(k.salt).length < 16) throw new WeakKdf();
  return k;
}
export const newKdf = () => ({ alg: 'pbkdf2-sha256', iterations: KDF_DEFAULT, salt: b64u(random(16)) });
export const normPassword = (pw) => String(pw).normalize('NFKC');   // never trimmed

export async function hkdf(ikm, info, salt = '', bits = 256) {
  const k = await SUB.importKey('raw', bytes(ikm), 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await SUB.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: bytes(salt), info: te.encode(info) }, k, bits));
}
export async function sha256(x) { return new Uint8Array(await SUB.digest('SHA-256', bytes(x))); }

// mk = PBKDF2(pw, salt, n); wk and ak from it by HKDF (SPEC 5.2). mk is never kept.
export async function deriveKeys(pw, kdf) {
  checkKdf(kdf);
  const base = await SUB.importKey('raw', te.encode(normPassword(pw)), 'PBKDF2', false, ['deriveBits']);
  const mk = new Uint8Array(await SUB.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64u(kdf.salt), iterations: kdf.iterations }, base, 256));
  const wk = await hkdf(mk, 'airglow/v1/wrap'), ak = await hkdf(mk, 'airglow/v1/auth');
  mk.fill(0);
  return { wk, ak };
}

// AES-256-GCM boxes as "iv.ct" (base64url), with additional data
const aesKey = (k, use) => (k instanceof CryptoKey ? k : SUB.importKey('raw', bytes(k), 'AES-GCM', false, use));
export async function seal(key, plain, aad, iv = random(12)) {
  const ct = await SUB.encrypt({ name: 'AES-GCM', iv, additionalData: te.encode(aad) }, await aesKey(key, ['encrypt']), bytes(plain));
  return `${b64u(iv)}.${b64u(ct)}`;
}
export async function open(key, box, aad) {
  const [iv, ct] = String(box).split('.');
  return new Uint8Array(await SUB.decrypt({ name: 'AES-GCM', iv: unb64u(iv), additionalData: te.encode(aad) }, await aesKey(key, ['decrypt']), unb64u(ct)));
}
export const wrapKey = (wk, dk, iv) => seal(wk, dk, 'airglow/v1/dk', iv);
export const unwrapKey = (wk, box) => open(wk, box, 'airglow/v1/dk');

// encKey and idKey from dk (SPEC 4.3); dk_check proves a device holds the right dk
export async function subkeys(dk) {
  const e = await hkdf(dk, 'airglow/v1/records'), i = await hkdf(dk, 'airglow/v1/ids');
  return {
    enc: await SUB.importKey('raw', e, 'AES-GCM', false, ['encrypt', 'decrypt']),
    id: await SUB.importKey('raw', i, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
  };
}
export const makeDkCheck = (keys, iv) => seal(keys.enc, 'airglow', 'airglow/v1/check', iv);
export async function dkCheckOk(keys, box) { try { return td.decode(await open(keys.enc, box, 'airglow/v1/check')) === 'airglow'; } catch { return false; } }
// Record ids: the HMAC of the natural key, 22 characters (SPEC 5.6)
export async function recordId(keys, natural) { return b64u(new Uint8Array(await SUB.sign('HMAC', keys.id, te.encode(natural)))).slice(0, 22); }
const recAad = (accountId, col, id, ver) => `${accountId}/${col}/${id}/${ver}`;
export async function encryptRecord(keys, accountId, col, id, ver, obj, iv) {
  const [ivs, blob] = (await seal(keys.enc, JSON.stringify(obj), recAad(accountId, col, id, ver), iv)).split('.');
  return { iv: ivs, blob };
}
export async function decryptRecord(keys, accountId, rec) {
  return JSON.parse(td.decode(await open(keys.enc, `${rec.iv}.${rec.blob}`, recAad(accountId, rec.col, rec.id, rec.ver))));
}

// The recovery key (SPEC 5.3): 100 random bits as 20 Crockford base-32 characters in five groups
const CROCK = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function newRecoveryKey() { const b = random(13); b[12] &= 0xf0; return b; }
export function recoveryText(b) {
  let bits = '', out = '';
  for (const x of b) bits += x.toString(2).padStart(8, '0');
  for (let i = 0; i < 20; i++) out += CROCK[parseInt(bits.slice(i * 5, i * 5 + 5), 2)];
  return out.match(/.{4}/g).join('-');
}
// Lenient: I and L read as 1, O as 0, any case, dashes and spaces ignored. null when it isn't 20 characters.
export function parseRecoveryKey(text) {
  const s = String(text || '').toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
  if (s.length !== 20 || [...s].some((c) => !CROCK.includes(c))) return null;
  const bits = [...s].map((c) => CROCK.indexOf(c).toString(2).padStart(5, '0')).join('') + '0000';
  return Uint8Array.from(bits.match(/.{8}/g).map((x) => parseInt(x, 2)));
}
const RSALT = 'airglow/v1/recovery';   // a constant: a password change can't break recovery (SPEC 5.3)
export async function recoveryKeys(rk) { return { rwk: await hkdf(rk, 'airglow/v1/recovery-wrap', RSALT), rak: await hkdf(rk, 'airglow/v1/recovery-auth', RSALT) }; }
export const wrapRecovery = (wk, rk, iv) => seal(wk, rk, 'airglow/v1/rk', iv);
export const unwrapRecovery = (wk, box) => open(wk, box, 'airglow/v1/rk');

// Everything a sign-up sends (SPEC 2.2): new keys from the password, a new dk and rk, the three wraps and the check
export async function newAccountKeys(pw) {
  const kdf = newKdf(), { wk, ak } = await deriveKeys(pw, kdf), dk = random(32), rk = newRecoveryKey();
  const { rwk, rak } = await recoveryKeys(rk), keys = await subkeys(dk);
  return {
    dk, rk, rkText: recoveryText(rk), keys,
    body: { kdf, authKey: b64u(ak), wrappedKey: await wrapKey(wk, dk), recoveryWrappedKey: await wrapKey(rwk, dk), recoveryAuthKey: b64u(rak), recoveryKeyWrappedByPw: await wrapRecovery(wk, rk), dkCheck: await makeDkCheck(keys) },
  };
}
// A password change, or the new password after a recovery: new wraps for the same dk and rk (SPEC 2.7, 2.8)
export async function rewrap(pw, dk, rk) {
  const kdf = newKdf(), { wk, ak } = await deriveKeys(pw, kdf);
  return { kdf, newAuthKey: b64u(ak), wrappedKey: await wrapKey(wk, dk), recoveryKeyWrappedByPw: await wrapRecovery(wk, rk) };
}

// Handing dk to a TV (SPEC 5.5): ECDH P-256, HKDF with the code as salt, AES-GCM with an AAD both ends know
export async function tvKeyPair() {
  const kp = await SUB.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const pub = new Uint8Array(await SUB.exportKey('raw', kp.publicKey));
  return { priv: kp.privateKey, pub: b64u(pub), k: b64u(await sha256(pub)) };
}
export const pubHash = async (pubB64) => b64u(await sha256(unb64u(pubB64)));
const hoAad = (code, k) => `airglow/v1/handover|${code}|${k}`;
async function hoKey(priv, pubB64, code) {
  const pub = await SUB.importKey('raw', unb64u(pubB64), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await SUB.deriveBits({ name: 'ECDH', public: pub }, priv, 256));
  return hkdf(shared, 'airglow/v1/handover', code);
}
export async function handoverSeal(dk, tvPub, code, iv) {
  const e = await SUB.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const [ivs, ct] = (await seal(await hoKey(e.privateKey, tvPub, code), dk, hoAad(code, await pubHash(tvPub)), iv)).split('.');
  return { ePub: b64u(new Uint8Array(await SUB.exportKey('raw', e.publicKey))), iv: ivs, ct };
}
export async function handoverOpen(tv, box, code) {
  return open(await hoKey(tv.priv, box.ePub, code), `${box.iv}.${box.ct}`, hoAad(code, tv.k));
}
