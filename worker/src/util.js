// Small helpers: base64url, HMAC / HKDF / SHA-256 over WebCrypto, JSON answers, the caller's address.
const te = new TextEncoder();
export const enc = (s) => te.encode(s);
export const b64u = (bytes) => { let s = ''; const b = new Uint8Array(bytes); for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const unb64u = (s) => { const t = atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)); const out = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) out[i] = t.charCodeAt(i); return out; };
export const rand = (n) => crypto.getRandomValues(new Uint8Array(n));
export const now = () => Date.now();
export const cat = (...parts) => { const a = parts.map((p) => (typeof p === 'string' ? enc(p) : new Uint8Array(p))); const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let o = 0; for (const x of a) { out.set(x, o); o += x.length; } return out; };
export async function sha256(data) { return new Uint8Array(await crypto.subtle.digest('SHA-256', typeof data === 'string' ? enc(data) : data)); }
export async function hmac(keyBytes, data) {
  const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, typeof data === 'string' ? enc(data) : data));
}
export async function hkdf(ikm, info, salt = new Uint8Array(0), bits = 256) {
  const k = await crypto.subtle.importKey('raw', typeof ikm === 'string' ? enc(ikm) : ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: typeof salt === 'string' ? enc(salt) : salt, info: enc(info) }, k, bits));
}
// Constant-time comparison (crypto.subtle.timingSafeEqual on Workers; the same loop elsewhere)
export function same(a, b) {
  a = typeof a === 'string' ? enc(a) : new Uint8Array(a); b = typeof b === 'string' ? enc(b) : new Uint8Array(b);
  if (a.length !== b.length) return false;
  if (crypto.subtle.timingSafeEqual) return crypto.subtle.timingSafeEqual(a, b);
  let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0;
}
export const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS', 'Access-Control-Max-Age': '86400' };
export const json = (body, status = 200, extra = {}) => new Response(body == null ? null : JSON.stringify(body), { status, headers: { ...(body == null ? {} : { 'content-type': 'application/json' }), 'cache-control': 'no-store', ...CORS, ...extra } });
export class Fail extends Error { constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra; } }
export const fail = (status, code, extra) => { throw new Fail(status, code, extra); };
export function ipOf(req, env) {
  return (env.TEST_MODE === 'true' && req.headers.get('x-test-ip')) || req.headers.get('cf-connecting-ip') || '0.0.0.0';
}
// IPv4 exactly, IPv6 by its /64 (the same-network check and the per-address limits)
export function netOf(ip) {
  if (!ip.includes(':')) return ip;
  let [head, tail] = ip.split('::');
  const h = head ? head.split(':') : [], t = tail != null ? (tail ? tail.split(':') : []) : null;
  const full = t ? [...h, ...Array(8 - h.length - t.length).fill('0'), ...t] : h;
  return full.slice(0, 4).map((x) => parseInt(x || '0', 16).toString(16)).join(':') + '::/64';
}
export const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');
export const dayStart = (t = Date.now()) => t - (t % 864e5);
