// The accounts crypto (app/tv/js/account/crypto.js, SPEC 5): known answers checked against Node's own crypto, pinned
// vectors every client must keep opening (tests/fixtures/account-vectors.json: a handover box, a record, the wraps),
// "change the password, then recover", the KDF floor and ceiling, lenient recovery keys, and the Worker page's copy.
// Run: node tests/account-crypto-test.js   (--make prints fresh vectors; only when the format changes on purpose)
import assert from 'node:assert/strict';
import nodeCrypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as K from '../app/tv/js/account/crypto.js';

const hex = (b) => Buffer.from(b).toString('hex'), unhex = (h) => new Uint8Array(Buffer.from(h, 'hex'));
const VEC = new URL('./fixtures/account-vectors.json', import.meta.url);
let fails = 0;
const check = async (name, f) => { try { await f(); console.log('ok  ', name); } catch (e) { fails++; console.log('FAIL', name, '\n    ', e.message); } };
// A fixed P-256 key for the TV in the vectors (a real TV makes a fresh, non-extractable one per code)
const TVJWK = { kty: 'EC', crv: 'P-256', x: 'gI0GAILBdu7T53akrFmMyGcsF3n5dO7MmwNBHKW5SV0', y: 'SLW_xSffzlPWrHEVI30DHM_4egVwt3NQqeUD7nMFpps', d: '0_NxaRPUMQoAJt50Gz8YiTr8gRTwyEaCumd-MToTmIo' };
async function fixedTv() {
  const priv = await crypto.subtle.importKey('jwk', TVJWK, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const pubKey = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: TVJWK.x, y: TVJWK.y }, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
  const pub = K.b64u(new Uint8Array(await crypto.subtle.exportKey('raw', pubKey)));
  return { priv, pub, k: await K.pubHash(pub) };
}
const IN = { pw: 'Correct horse battery staple ✓', salt: 'AAECAwQFBgcICQoLDA0ODw', dk: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', rk: 'a1b2c3d4e5f60718293a4b5c60', code: 'WDJBMH', iv: '0a0b0c0d0e0f101112131415', acct: 'acct-1' };

if (process.argv.includes('--make')) {
  const kdf = { alg: 'pbkdf2-sha256', iterations: 600000, salt: IN.salt }, { wk, ak } = await K.deriveKeys(IN.pw, kdf);
  const dk = unhex(IN.dk), rk = unhex(IN.rk), iv = unhex(IN.iv), keys = await K.subkeys(dk), tv = await fixedTv();
  const { rwk, rak } = await K.recoveryKeys(rk);
  console.log(JSON.stringify({
    wk: hex(wk), ak: hex(ak), rwk: hex(rwk), rak: hex(rak), rkText: K.recoveryText(rk),
    wrappedKey: await K.wrapKey(wk, dk, iv), recoveryWrappedKey: await K.wrapKey(rwk, dk, iv), recoveryKeyWrappedByPw: await K.wrapRecovery(wk, rk, iv),
    dkCheck: await K.makeDkCheck(keys, iv), recordId: await K.recordId(keys, 'favs|pid1|live:42'),
    record: await K.encryptRecord(keys, IN.acct, 'favs', 'x', 3, { kind: 'live', item: { id: 42 } }, iv),
    handover: await K.handoverSeal(dk, tv.pub, IN.code, iv), tvPub: tv.pub,
  }, null, 2));
  process.exit(0);
}
const V = JSON.parse(readFileSync(VEC, 'utf8'));
const kdf = { alg: 'pbkdf2-sha256', iterations: 600000, salt: IN.salt };

await check('PBKDF2 + HKDF match Node\'s own implementation', async () => {
  const { wk, ak } = await K.deriveKeys(IN.pw, kdf);
  const mk = nodeCrypto.pbkdf2Sync(Buffer.from(IN.pw.normalize('NFKC')), Buffer.from(K.unb64u(IN.salt)), 600000, 32, 'sha256');
  assert.equal(hex(wk), Buffer.from(nodeCrypto.hkdfSync('sha256', mk, Buffer.alloc(0), 'airglow/v1/wrap', 32)).toString('hex'));
  assert.equal(hex(ak), Buffer.from(nodeCrypto.hkdfSync('sha256', mk, Buffer.alloc(0), 'airglow/v1/auth', 32)).toString('hex'));
  assert.equal(hex(wk), V.wk); assert.equal(hex(ak), V.ak);
});
await check('the recovery keys use the constant salt (Node agrees) and the pinned values', async () => {
  const { rwk, rak } = await K.recoveryKeys(unhex(IN.rk));
  assert.equal(hex(rak), Buffer.from(nodeCrypto.hkdfSync('sha256', Buffer.from(IN.rk, 'hex'), Buffer.from('airglow/v1/recovery'), 'airglow/v1/recovery-auth', 32)).toString('hex'));
  assert.equal(hex(rwk), V.rwk); assert.equal(hex(rak), V.rak);
  assert.equal(K.recoveryText(unhex(IN.rk)), V.rkText);
});
await check('the pinned wraps, the check, a record and a record id open as they did', async () => {
  const wk = unhex(V.wk), rwk = unhex(V.rwk), dk = unhex(IN.dk), keys = await K.subkeys(dk);
  assert.equal(hex(await K.unwrapKey(wk, V.wrappedKey)), IN.dk);
  assert.equal(hex(await K.unwrapKey(rwk, V.recoveryWrappedKey)), IN.dk);
  assert.equal(hex(await K.unwrapRecovery(wk, V.recoveryKeyWrappedByPw)), IN.rk);
  assert.ok(await K.dkCheckOk(keys, V.dkCheck));
  assert.equal(await K.recordId(keys, 'favs|pid1|live:42'), V.recordId);
  assert.deepEqual(await K.decryptRecord(keys, IN.acct, { col: 'favs', id: 'x', ver: 3, ...V.record }), { kind: 'live', item: { id: 42 } });
  await assert.rejects(K.decryptRecord(keys, IN.acct, { col: 'favs', id: 'x', ver: 2, ...V.record }), 'the ver is in the AAD');
  await assert.rejects(K.decryptRecord(keys, 'acct-2', { col: 'favs', id: 'x', ver: 3, ...V.record }), 'the account is in the AAD');
});
await check('the pinned handover box opens on the TV; the wrong code does not', async () => {
  const tv = await fixedTv();
  assert.equal(tv.pub, V.tvPub);
  assert.equal(hex(await K.handoverOpen(tv, V.handover, IN.code)), IN.dk);
  await assert.rejects(K.handoverOpen(tv, V.handover, 'WDJBMX'));
  const fresh = await K.tvKeyPair(), box = await K.handoverSeal(unhex(IN.dk), fresh.pub, 'BCDFGH');
  assert.equal(hex(await K.handoverOpen(fresh, box, 'BCDFGH')), IN.dk);
});
await check('change the password, then recover: dk and rk survive both', async () => {
  const a = await K.newAccountKeys('first password 12');
  const pre = await K.deriveKeys('first password 12', a.body.kdf);
  assert.equal(hex(await K.unwrapKey(pre.wk, a.body.wrappedKey)), hex(a.dk));
  const changed = await K.rewrap('second password 12', a.dk, a.rk);
  assert.notEqual(changed.kdf.salt, a.body.kdf.salt, 'a fresh KDF salt');
  const after = await K.deriveKeys('second password 12', changed.kdf);
  assert.equal(hex(await K.unwrapKey(after.wk, changed.wrappedKey)), hex(a.dk));
  // recover with the key typed loosely, against the recovery wrap made at sign-up
  const typed = a.rkText.toLowerCase().replace(/-/g, ' ').replace(/1/g, 'l').replace(/0/g, 'O');
  const { rwk, rak } = await K.recoveryKeys(K.parseRecoveryKey(typed));
  assert.equal(K.b64u(rak), a.body.recoveryAuthKey);
  assert.equal(hex(await K.unwrapKey(rwk, a.body.recoveryWrappedKey)), hex(a.dk));
  assert.equal(K.recoveryText(await K.unwrapRecovery(after.wk, changed.recoveryKeyWrappedByPw)), a.rkText);
});
await check('the KDF floor and ceiling, and unknown algorithms, are refused before anything is derived', async () => {
  for (const k of [{ ...kdf, iterations: 599999 }, { ...kdf, iterations: 5000001 }, { ...kdf, alg: 'argon2id' }, { ...kdf, salt: 'AAAA' }, null]) await assert.rejects(K.deriveKeys('x', k), K.WeakKdf);
});
await check('recovery keys: 20 characters, five groups, lenient reading, nonsense refused', async () => {
  const rk = K.newRecoveryKey(), t = K.recoveryText(rk);
  assert.match(t, /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/);
  assert.equal(hex(K.parseRecoveryKey(t)), hex(rk));
  assert.equal(K.parseRecoveryKey('too short'), null); assert.equal(K.parseRecoveryKey('UUUU-UUUU-UUUU-UUUU-UUUU'), null);
});
await check('the Worker page\'s copy is the same file', async () => {
  assert.equal(readFileSync(new URL('../worker/pages/crypto.js', import.meta.url), 'utf8'), readFileSync(new URL('../app/tv/js/account/crypto.js', import.meta.url), 'utf8'));
});
await check('the iPhone\'s and the Windows app\'s account screens are the same file', async () => {
  assert.equal(readFileSync(new URL('../app/desktop/acctui.js', import.meta.url), 'utf8'), readFileSync(new URL('../app/phone/acctui.js', import.meta.url), 'utf8'));
});
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
