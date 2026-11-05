// The Worker (SPEC 9.1's list, plus review 3's M1, S4, S5, S7, S8 cases). Run: cd worker && npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, signupOwner, loginWith, K } from './helpers.js';

test('health, and 503 on /v1/* until both secrets exist', async () => {
  const { call } = setup({ PEPPER: undefined });
  assert.deepEqual((await call('GET', '/v1/health')).body, { ok: true, version: '1.0.0', ready: false });
  assert.equal((await call('POST', '/v1/prelogin', { email: 'a@b.c' })).status, 503);
  const ok = setup();
  assert.equal((await ok.call('GET', '/v1/health')).body.ready, true);
});

test('the owner code works once, exactly as typed; wrong tries are capped account-wide', async () => {
  const { call } = setup();
  const bad = await signupOwner(call, { invite: 'Copper kettle quiet harbour' });   // (case-sensitive)
  assert.equal(bad.r.status, 403); assert.equal(bad.r.body.error, 'bad_invite');
  const { r } = await signupOwner(call, { invite: '  copper kettle quiet harbour ' });   // (NFKC and trim)
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.account.owner, true);
  const again = await signupOwner(call, { email: 'b@example.com' });
  assert.equal(again.r.status, 403, 'spent');
  // a fresh Worker: 20 wrong tries in the hour from many addresses, then even the right one waits
  const w = setup();
  for (let i = 0; i < 20; i++) assert.equal((await signupOwner(w.call, { invite: `guess ${i}`, ip: `198.51.100.${i}` })).r.status, 403);
  assert.equal((await signupOwner(w.call, { ip: '192.0.2.1' })).r.status, 403);
});

test('invites: made by the owner, one use, typed in any case; signup limited per address', async () => {
  const { call } = setup();
  const { r } = await signupOwner(call);
  const inv = await call('POST', '/v1/invites', {}, { token: r.body.access });
  assert.match(inv.body.code, /^AIRGLOW-[BCDFGHJKLMNPQRSTVWXZ]{4}-[BCDFGHJKLMNPQRSTVWXZ]{4}$/);
  const keys = await K.newAccountKeys('another long password');
  const friend = await call('POST', '/v1/signup', { invite: inv.body.code.toLowerCase().replace('airglow-', ''), email: 'friend@example.com', device: { name: 'Phone', kind: 'phone' }, ...keys.body }, { ip: '198.51.100.9' });
  assert.equal(friend.status, 200, JSON.stringify(friend.body)); assert.equal(friend.body.account.owner, false);
  const twice = await call('POST', '/v1/signup', { invite: inv.body.code, email: 'f2@example.com', ...keys.body }, { ip: '198.51.100.9' });
  assert.equal(twice.status, 403);
  assert.equal((await call('POST', '/v1/invites', {}, { token: friend.body.access })).status, 403, 'owner only');
  for (let i = 0; i < 3; i++) await call('POST', '/v1/signup', { invite: 'nope', email: `x${i}@e.com`, ...keys.body }, { ip: '198.51.100.9' });
  assert.equal((await call('POST', '/v1/signup', { invite: 'nope', email: 'y@e.com', ...keys.body }, { ip: '198.51.100.9' })).status, 429);
});

test('prelogin hides whether an account exists; login; five wrong from one address slow that address only', async () => {
  const { call } = setup();
  await signupOwner(call);
  const a = await call('POST', '/v1/prelogin', { email: 'nobody@example.com' }), b = await call('POST', '/v1/prelogin', { email: 'nobody@example.com' });
  assert.deepEqual(a.body, b.body); assert.equal(a.body.kdf.iterations, 600000);
  assert.equal((await loginWith(call, 'owner@example.com', 'correct horse battery')).status, 200);
  for (let i = 0; i < 5; i++) assert.equal((await loginWith(call, 'owner@example.com', 'wrong password!!', {}, { ip: '198.51.100.50' })).status, 401);
  assert.equal((await loginWith(call, 'owner@example.com', 'correct horse battery', {}, { ip: '198.51.100.50' })).body.error, 'slow_down');
  assert.equal((await loginWith(call, 'owner@example.com', 'correct horse battery', {}, { ip: '198.51.100.51' })).status, 200);
});

test('the device flow: code, lookup with the same-network answer, approve with a box only the TV opens, poll', async () => {
  const { call, env } = setup();
  const { r, k } = await signupOwner(call, { ip: '203.0.113.7' });
  const tv = await K.tvKeyPair();
  const c = await call('POST', '/v1/device/code', { name: 'Philips TV', kind: 'tv', pub: tv.pub }, { ip: '203.0.113.7' });
  assert.match(c.body.user_code, /^[BCDFGHJKLMNPQRSTVWXZ]{6}$/);
  assert.equal((await call('POST', '/v1/device/token', { device_code: c.body.device_code })).body.error, 'authorization_pending');
  const look = await call('GET', `/v1/device/${c.body.user_code}`, null, { token: r.body.access, ip: '203.0.113.7' });
  assert.equal(look.body.sameNetwork, true); assert.equal(await K.pubHash(look.body.pub), tv.k);
  assert.equal((await call('GET', `/v1/device/${c.body.user_code}`, null, { token: r.body.access, ip: '198.51.100.1' })).body.sameNetwork, false);
  const box = await K.handoverSeal(k.dk, look.body.pub, c.body.user_code);
  assert.equal((await call('POST', '/v1/device/approve', { user_code: c.body.user_code, box }, { token: r.body.access })).status, 204);
  // polled again at once: slow_down (RFC 8628 3.5); after the interval, the tokens
  assert.equal((await call('POST', '/v1/device/token', { device_code: c.body.device_code })).body.error, 'slow_down');
  env.DB.raw.prepare('UPDATE device_codes SET last_poll = last_poll - 20000').run();
  const done = await call('POST', '/v1/device/token', { device_code: c.body.device_code });
  assert.ok(done.body.refresh, JSON.stringify(done.body));
  const dk = await K.handoverOpen(tv, done.body.box, c.body.user_code);
  assert.deepEqual([...dk], [...k.dk]);
  assert.ok(await K.dkCheckOk(await K.subkeys(dk), done.body.dkCheck));
  assert.equal((await call('POST', '/v1/device/token', { device_code: c.body.device_code })).body.error, 'expired_token', 'used once');
  // a TV (signed in with a phone) can't approve another
  const c2 = await call('POST', '/v1/device/code', { name: 'Bedroom TV', kind: 'tv', pub: tv.pub });
  const ap2 = await call('POST', '/v1/device/approve', { user_code: c2.body.user_code, box }, { token: done.body.access });
  assert.equal(ap2.body.error, 'cannot_approve');
  const devs = await call('GET', '/v1/devices', null, { token: r.body.access });
  assert.equal(devs.body.devices.find((d) => d.kind === 'tv').approvedBy, "Birgir's iPhone");
});

test('the /tv page one-shot: lookup and approve only (deny by default elsewhere)', async () => {
  const { call } = setup();
  await signupOwner(call);
  const o = await loginWith(call, 'owner@example.com', 'correct horse battery', { oneShot: true });
  assert.equal(o.body.refresh, undefined); assert.ok(o.body.wrappedKey);
  for (const [m, p] of [['GET', '/v1/sync?since=0'], ['GET', '/v1/devices'], ['POST', '/v1/logout-all'], ['GET', '/v1/sync/seq'], ['POST', '/v1/invites']]) assert.equal((await call(m, p, {}, { token: o.body.access })).status, 403, p);
  const tv = await K.tvKeyPair();
  const c = await call('POST', '/v1/device/code', { name: 'TV', kind: 'tv', pub: tv.pub });
  assert.equal((await call('GET', `/v1/device/${c.body.user_code}`, null, { token: o.body.access })).status, 200);
});

test('approver lookups that match nothing: five per 10 minutes per account and address', async () => {
  const { call } = setup();
  const { r } = await signupOwner(call);
  for (let i = 0; i < 5; i++) assert.equal((await call('GET', '/v1/device/BCDBCD', null, { token: r.body.access })).status, 404);
  assert.equal((await call('GET', '/v1/device/BCDBCD', null, { token: r.body.access })).body.error, 'slow_down');
});

test('device codes: 20 an hour per address', async () => {
  const { call } = setup();
  const tv = await K.tvKeyPair();
  for (let i = 0; i < 20; i++) assert.equal((await call('POST', '/v1/device/code', { name: 'TV', pub: tv.pub }, { ip: '198.51.100.77' })).status, 200);
  assert.equal((await call('POST', '/v1/device/code', { name: 'TV', pub: tv.pub }, { ip: '198.51.100.77' })).status, 429);
});

test('refresh: a lost answer then a retry is re-issued; the theft check fires (review 3, M1)', async () => {
  const { call } = setup();
  const { r } = await signupOwner(call);
  const r0 = r.body.refresh;
  // lost response: rotate, never use the new pair, retry with the old token -> the same pair again
  const a = await call('POST', '/v1/token', { refresh: r0 });
  const b = await call('POST', '/v1/token', { refresh: r0 });
  assert.equal(a.body.refresh, b.body.refresh);
  // crash before use: still the same, however many times
  assert.equal((await call('POST', '/v1/token', { refresh: r0 })).body.refresh, a.body.refresh);
  // the device uses its new access token: generation used; the old token is now a second holder's
  assert.equal((await call('GET', '/v1/sync/seq', null, { token: a.body.access })).status, 200);
  const reuse = await call('POST', '/v1/token', { refresh: r0 });
  assert.deepEqual(reuse.body, { error: 'revoked', why: 'reuse' });
  assert.equal((await call('GET', '/v1/sync/seq', null, { token: a.body.access })).body.error, 'revoked', 'revoked_at read on every call');
});

test('refresh: the thief refreshes first and syncs, then the owner refreshes -> revoked', async () => {
  const { call } = setup();
  const { r } = await signupOwner(call);
  const stolen = r.body.refresh;
  const thief = await call('POST', '/v1/token', { refresh: stolen });
  assert.equal((await call('GET', '/v1/sync?since=0', null, { token: thief.body.access })).status, 200);
  const owner = await call('POST', '/v1/token', { refresh: stolen });
  assert.equal(owner.body.error, 'revoked');
  assert.equal((await call('POST', '/v1/token', { refresh: thief.body.refresh })).body.error, 'revoked', 'the thief is out too');
});

test('refresh: a rotation that presents the current token counts as use; older tokens revoke', async () => {
  const { call } = setup();
  const { r } = await signupOwner(call);
  const g2 = await call('POST', '/v1/token', { refresh: r.body.refresh });
  const g3 = await call('POST', '/v1/token', { refresh: g2.body.refresh });   // (g2 presented: g2 used)
  assert.equal((await call('POST', '/v1/token', { refresh: g2.body.refresh })).body.refresh, g3.body.refresh, 'g2 is the previous; g3 unused: re-issued');
  assert.equal((await call('POST', '/v1/token', { refresh: r.body.refresh })).body.error, 'revoked', 'two generations back');
});

test('sign out one device, everywhere (a TV needs no password), and the reason reaches the device', async () => {
  const { call } = setup();
  const { r } = await signupOwner(call);
  const l = await loginWith(call, 'owner@example.com', 'correct horse battery');
  assert.equal((await call('DELETE', `/v1/devices/${l.body.deviceId}`, null, { token: r.body.access })).status, 204);
  assert.deepEqual((await call('GET', '/v1/devices', null, { token: l.body.access })).body, { error: 'revoked', why: 'removed', by: "Birgir's iPhone" });
  assert.equal((await call('POST', '/v1/logout-all', { authKey: K.b64u(new Uint8Array(32)) }, { token: r.body.access })).status, 401, 'a phone confirms with the password');
  const l2 = await loginWith(call, 'owner@example.com', 'correct horse battery');
  const { ak } = await K.deriveKeys('correct horse battery', (await call('POST', '/v1/prelogin', { email: 'owner@example.com' })).body.kdf);
  assert.equal((await call('POST', '/v1/logout-all', { authKey: K.b64u(ak) }, { token: l2.body.access })).status, 204);
  assert.deepEqual((await call('POST', '/v1/token', { refresh: r.body.refresh })).body, { error: 'revoked', why: 'everywhere', by: 'Laptop' });
});

test('password change keeps the data and the recovery; then recover; then the old password fails', async () => {
  const { call } = setup();
  const { r, k } = await signupOwner(call);
  const pre = (await call('POST', '/v1/prelogin', { email: 'owner@example.com' })).body.kdf;
  const old = await K.deriveKeys('correct horse battery', pre);
  const nw = await K.rewrap('a brand new password', k.dk, k.rk);
  assert.equal((await call('POST', '/v1/password', { authKey: K.b64u(old.ak), ...nw, signOutOthers: false }, { token: r.body.access })).status, 200);
  const l = await loginWith(call, 'owner@example.com', 'a brand new password');
  assert.equal(l.status, 200);
  const { wk } = await K.deriveKeys('a brand new password', l.body.kdf);
  assert.deepEqual([...await K.unwrapKey(wk, l.body.wrappedKey)], [...k.dk]);
  assert.equal(K.recoveryText(await K.unwrapRecovery(wk, l.body.recoveryKeyWrappedByPw)), k.rkText, 'Show it: with the password');
  // recover with the key typed loosely
  const typed = k.rkText.toLowerCase().replace(/-/g, ' ').replace(/1/g, 'l').replace(/0/g, 'o');
  const rk = K.parseRecoveryKey(typed); const { rwk, rak } = await K.recoveryKeys(rk);
  const st = await call('POST', '/v1/recover/start', { email: 'owner@example.com', recoveryAuthKey: K.b64u(rak) });
  assert.equal(st.status, 200);
  const dk = await K.unwrapKey(rwk, st.body.recoveryWrappedKey);
  const third = await K.rewrap('third password here', dk, rk);
  const rec = await call('POST', '/v1/recover', { email: 'owner@example.com', recoveryAuthKey: K.b64u(rak), ...third, device: { name: 'iPhone', kind: 'phone' } });
  assert.equal(rec.status, 200); assert.ok(rec.body.refresh);
  assert.equal((await call('POST', '/v1/token', { refresh: l.body.refresh })).body.error, 'revoked', 'a recovery signs every device out');
  assert.equal((await loginWith(call, 'owner@example.com', 'a brand new password')).status, 401);
  // five wrong recovery keys lock recovery for the hour, and Devices says so
  const bad = K.b64u(new Uint8Array(32));
  for (let i = 0; i < 5; i++) await call('POST', '/v1/recover/start', { email: 'owner@example.com', recoveryAuthKey: bad });
  assert.equal((await call('POST', '/v1/recover/start', { email: 'owner@example.com', recoveryAuthKey: K.b64u(rak) })).body.error, 'slow_down');
  assert.equal((await call('GET', '/v1/devices', null, { token: rec.body.access })).body.recoveryAttempts.length, 3);
});

const enc = (k, acct, col, id, ver, obj) => K.encryptRecord(k.keys, acct, col, id, ver, obj);
test('sync: push, pull, compare-and-set conflict, 256 KB refused, server time in every answer', async () => {
  const { call } = setup();
  const { r, k } = await signupOwner(call);
  const t = { token: r.body.access }, acct = r.body.account.id;
  const p = await call('POST', '/v1/sync', { records: [{ col: 'favs', id: 'a1', baseVer: 0, ver: 1, ...await enc(k, acct, 'favs', 'a1', 1, { v: 1 }) }] }, t);
  assert.equal(p.body.seq, 1); assert.ok(p.body.now);
  const c = await call('POST', '/v1/sync', { records: [{ col: 'favs', id: 'a1', baseVer: 0, ver: 1, ...await enc(k, acct, 'favs', 'a1', 1, { v: 2 }) }] }, t);
  assert.deepEqual(c.body.conflict, [{ col: 'favs', id: 'a1', ver: 1 }]);
  const pull = await call('GET', '/v1/sync?since=0', null, t);
  assert.equal(pull.body.records.length, 1); assert.ok(pull.body.now);
  assert.deepEqual(await K.decryptRecord(k.keys, acct, pull.body.records[0]), { v: 1 });
  assert.equal((await call('GET', '/v1/sync/seq', null, t)).body.seq, 1);
  const big = 'A'.repeat(89000), recs = [];
  for (let i = 0; i < 3; i++) recs.push({ col: 'plays', id: `p${i}`, baseVer: 0, ver: 1, iv: 'AAAAAAAAAAAAAAAA', blob: big });
  assert.equal((await call('POST', '/v1/sync', { records: recs }, t)).status, 413);
  // a record moved between two devices' read and write: AAD binds ver, so a swapped-in older blob fails to open
  const swapped = { ...pull.body.records[0], ver: 2 };
  await assert.rejects(K.decryptRecord(k.keys, acct, swapped));
});

test('the mass-delete guard: held without wipe; wipe names the collection; another collection stays guarded', async () => {
  const { call } = setup();
  const { r, k } = await signupOwner(call);
  const t = { token: r.body.access }, acct = r.body.account.id;
  const mk = async (col, n) => { const out = []; for (let i = 0; i < n; i++) out.push({ col, id: `${col}${i}`, baseVer: 0, ver: 1, ...await enc(k, acct, col, `${col}${i}`, 1, { i }) }); return out; };
  await call('POST', '/v1/sync', { records: [...await mk('progress', 8), ...await mk('favs', 8)] }, t);
  const del = (col, n) => Array.from({ length: n }, (_, i) => ({ col, id: `${col}${i}`, baseVer: 1, ver: 2, deleted: true }));
  const a = await call('POST', '/v1/sync', { records: del('progress', 6) }, t);
  assert.equal(a.body.held.length, 6);
  const b = await call('POST', '/v1/sync', { records: [...del('progress', 6), ...del('favs', 6)], wipe: ['progress'] }, t);
  assert.equal(b.body.held.length, 6); assert.ok(b.body.held.every((h) => h.col === 'favs'));
  const left = (await call('GET', '/v1/sync?since=0', null, t)).body.records.filter((x) => x.col === 'progress' && x.deleted).length;
  assert.equal(left, 6);
  // the held ones can be read back by id (Undo them is local after this)
  const got = await call('POST', '/v1/sync/get', { ids: [{ col: 'favs', id: 'favs0' }] }, t);
  assert.deepEqual(await K.decryptRecord(k.keys, acct, got.body.records[0]), { i: 0 });
});

test('undo: the previous blob with the ver it was written under, re-encrypted by the client, pushed back', async () => {
  const { call } = setup();
  const { r, k } = await signupOwner(call);
  const t = { token: r.body.access }, acct = r.body.account.id, since = Date.now() - 1000;
  await call('POST', '/v1/sync', { records: [{ col: 'settings', id: 's', baseVer: 0, ver: 1, ...await enc(k, acct, 'settings', 's', 1, { team: 'good' }) }] }, t);
  await call('POST', '/v1/sync', { records: [{ col: 'settings', id: 's', baseVer: 1, ver: 2, ...await enc(k, acct, 'settings', 's', 2, { team: 'bad' }) }] }, t);
  await call('POST', '/v1/sync', { records: [{ col: 'settings', id: 's', baseVer: 2, ver: 3, ...await enc(k, acct, 'settings', 's', 3, { team: 'worse' }) }] }, t);
  const u = await call('GET', `/v1/undo?since=${since}`, null, t);
  assert.equal(u.body.records.length, 1, 'one per record per day: the first predecessor');
  const old = await K.decryptRecord(k.keys, acct, u.body.records[0]);
  assert.deepEqual(old, { team: 'good' });
  const back = await call('POST', '/v1/sync', { records: [{ col: 'settings', id: 's', baseVer: 3, ver: 4, ...await enc(k, acct, 'settings', 's', 4, old) }] }, t);
  assert.equal(back.body.conflict.length, 0);
});

test('Forget my taste: a plays wipe leaves no previous copies on the server', async () => {
  const { call, env } = setup();
  const { r, k } = await signupOwner(call);
  const t = { token: r.body.access }, acct = r.body.account.id;
  const recs = []; for (let i = 0; i < 6; i++) recs.push({ col: 'plays', id: `m${i}`, baseVer: 0, ver: 1, ...await enc(k, acct, 'plays', `m${i}`, 1, { plays: [i] }) });
  await call('POST', '/v1/sync', { records: recs }, t);
  await call('POST', '/v1/sync', { records: recs.map((x) => ({ ...x, baseVer: 1, ver: 2, ...{} })).map((x, i) => ({ ...x, iv: recs[i].iv })) }, t);
  const dels = recs.map((x) => ({ col: 'plays', id: x.id, baseVer: 2, ver: 3, deleted: true }));
  const w = await call('POST', '/v1/sync', { records: dels, wipe: ['plays'] }, t);
  assert.equal(w.body.held.length, 0);
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM records_prev WHERE col = 'plays'").get().n, 0);
});

test('the 8 MB cap: the oldest previous versions go first, then writes are refused', async () => {
  const { call, env } = setup({ CAP_BYTES: '400000' });
  const { r } = await signupOwner(call);
  const t = { token: r.body.access };
  const blob = 'B'.repeat(60000), iv = 'AAAAAAAAAAAAAAAA';
  for (let i = 0; i < 3; i++) await call('POST', '/v1/sync', { records: [{ col: 'plays', id: `x${i}`, baseVer: 0, ver: 1, iv, blob }] }, t);
  for (let i = 0; i < 3; i++) await call('POST', '/v1/sync', { records: [{ col: 'plays', id: `x${i}`, baseVer: 1, ver: 2, iv, blob }] }, t);
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM records_prev').get().n, 3);
  const p = await call('POST', '/v1/sync', { records: [{ col: 'plays', id: 'y', baseVer: 0, ver: 1, iv, blob }] }, t);
  assert.equal(p.status, 200, JSON.stringify(p.body));
  assert.ok(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM records_prev').get().n < 3, 'previous versions dropped');
  for (let i = 0; i < 3; i++) await call('POST', '/v1/sync', { records: [{ col: 'plays', id: `z${i}`, baseVer: 0, ver: 1, iv, blob }] }, t);
  assert.equal((await call('POST', '/v1/sync', { records: [{ col: 'plays', id: 'w', baseVer: 0, ver: 1, iv, blob }] }, t)).body.error, 'quota');
});

test('delete account: the password, then everything on the server goes', async () => {
  const { call, env } = setup();
  const { r } = await signupOwner(call);
  const { ak } = await K.deriveKeys('correct horse battery', (await call('POST', '/v1/prelogin', { email: 'owner@example.com' })).body.kdf);
  assert.equal((await call('DELETE', '/v1/account', { authKey: K.b64u(ak) }, { token: r.body.access })).status, 204);
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM devices').get().n, 0);
  assert.equal((await call('GET', '/v1/devices', null, { token: r.body.access })).body.error, 'revoked');
});
