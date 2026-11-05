// A test client: the real crypto (app/tv/js/account/crypto.js) against the Worker's handler, in process.
import { handle } from '../src/router.js';
import { localEnv } from './server.js';
import * as K from '../../app/tv/js/account/crypto.js';
export { K };
export function setup(over = {}) {
  const env = localEnv(over);
  const call = async (method, path, body, { token, ip = '203.0.113.7', raw } = {}) => {
    const headers = { 'content-type': 'application/json', 'x-test-ip': ip };
    if (token) headers.authorization = `Bearer ${token}`;
    const r = await handle(new Request(`https://acct.test${path}`, { method, headers, body: method === 'GET' ? undefined : raw ?? (body ? JSON.stringify(body) : undefined) }), env);
    const text = await r.text();
    return { status: r.status, body: text ? JSON.parse(text) : null };
  };
  return { env, call };
}
// Fast KDF for tests that don't test the KDF: the floor still applies, so derive once and reuse
let cached = null;
export async function signupOwner(call, { email = 'owner@example.com', pw = 'correct horse battery', invite = 'copper kettle quiet harbour', device = { name: "Birgir's iPhone", kind: 'phone' }, ip } = {}) {
  if (!cached || cached.pw !== pw) cached = { pw, keys: await K.newAccountKeys(pw) };
  const k = cached.keys;
  const r = await call('POST', '/v1/signup', { invite, email, device, ...k.body }, { ip });
  return { r, k };
}
export async function loginWith(call, email, pw, extra = {}, opts = {}) {
  const { kdf } = (await call('POST', '/v1/prelogin', { email })).body;
  const { ak } = await K.deriveKeys(pw, kdf);
  return call('POST', '/v1/login', { email, authKey: K.b64u(ak), device: { name: 'Laptop', kind: 'pc' }, ...extra }, opts);
}
