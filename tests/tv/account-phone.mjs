// A stand-in iPhone for tests/tv/account-*.js: signs the owner up (or in) against the local Worker and approves the
// TV's code with the same calls and crypto the app makes (app/tv/js/account/crypto.js). --count lists what the
// server holds, decrypted with the account's key.
import * as K from '../../app/tv/js/account/crypto.js';
const U = 'http://127.0.0.1:8790', EMAIL = 'owner@example.com', PW = 'correct horse battery';
const call = async (m, p, b, t) => { const r = await fetch(U + p, { method: m, headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: b ? JSON.stringify(b) : undefined }); const x = await r.text(); if (!r.ok) throw new Error(`${p} ${r.status} ${x}`); return x ? JSON.parse(x) : null; };
async function session() {
  const { kdf } = await call('POST', '/v1/prelogin', { email: EMAIL });
  try {
    const { wk, ak } = await K.deriveKeys(PW, kdf);
    const r = await call('POST', '/v1/login', { email: EMAIL, authKey: K.b64u(ak), device: { name: 'Test iPhone', kind: 'phone' } });
    return { r, dk: await K.unwrapKey(wk, r.wrappedKey) };
  } catch {
    const a = await K.newAccountKeys(PW);
    const r = await call('POST', '/v1/signup', { invite: 'copper kettle quiet harbour', email: EMAIL, device: { name: 'Test iPhone', kind: 'phone' }, ...a.body });
    return { r, dk: a.dk };
  }
}
const { r, dk } = await session();
if (process.argv[2] === '--count') {
  const keys = await K.subkeys(dk), n = {};
  const all = await call('GET', '/v1/sync?since=0&limit=200', null, r.access);
  for (const rec of all.records) { if (rec.deleted) continue; await K.decryptRecord(keys, r.account.id, rec); n[rec.col] = (n[rec.col] || 0) + 1; }
  console.log(Object.entries(n).map(([k, v]) => `${k}:${v}`).join(' '));
} else {
  const code = process.argv[2];
  const tv = await call('GET', `/v1/device/${code}`, null, r.access);
  await call('POST', '/v1/device/approve', { user_code: code, box: await K.handoverSeal(dk, tv.pub, code) }, r.access);
  console.log(`approved ${code} for ${tv.name} (same network: ${tv.sameNetwork})`);
}
