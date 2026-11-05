// Subkeys from the Worker's two secrets (SPEC 5.4, 5.8): never the secrets themselves.
import { enc, hkdf, hmac, b64u, unb64u, sha256, now, same } from './util.js';

const memo = new Map();
export async function keysOf(env) {
  const tag = `${env.PEPPER}|${env.TOKEN_SECRET}|${env.PEPPER_PREV || ''}`;
  if (memo.has(tag)) return memo.get(tag);
  const p = enc(env.PEPPER), t = enc(env.TOKEN_SECRET);
  const k = {
    auth: await hkdf(p, 'airglow/v1/pepper-auth'),
    ip: await hkdf(p, 'airglow/v1/pepper-ip'),
    fake: await hkdf(p, 'airglow/v1/pepper-fake-salt'),
    access: await hkdf(t, 'airglow/v1/access'),
    refresh: await hkdf(t, 'airglow/v1/refresh'),
    authPrev: env.PEPPER_PREV ? await hkdf(enc(env.PEPPER_PREV), 'airglow/v1/pepper-auth') : null,
  };
  memo.clear(); memo.set(tag, k);
  return k;
}
export const authHash = async (key, saltB64, akB64) => b64u(await hmac(key, new Uint8Array([...unb64u(saltB64), ...unb64u(akB64)])));
export const ipHash = async (K, s) => b64u((await hmac(K.ip, s)).slice(0, 12));

// Access tokens: base64url(JSON) "." HMAC. They carry the refresh generation they were issued with (review 3, M1).
export async function signAccess(K, { sub, dev = null, gen = 0, scope = 'full', ttl = 3600 }) {
  const p = b64u(enc(JSON.stringify({ sub, dev, gen, scope, exp: Math.floor(now() / 1000) + ttl })));
  return `${p}.${b64u(await hmac(K.access, p))}`;
}
export async function readAccess(K, tok) {
  const [p, sig] = String(tok || '').split('.');
  if (!p || !sig) return null;
  if (!same(b64u(await hmac(K.access, p)), sig)) return null;
  try {
    const o = JSON.parse(new TextDecoder().decode(unb64u(p)));
    return o.exp * 1000 > now() ? o : null;
  } catch { return null; }
}
// Refresh tokens are "<deviceId>.<secret>"; the successor is deterministic (SPEC 5.8), so a retry recomputes it.
export const successor = async (K, dev, secret) => b64u(await hmac(K.refresh, `${dev}|${secret}`));
export const tokenHash = async (secret) => b64u(await sha256(`airglow/v1/refresh|${secret}`));
