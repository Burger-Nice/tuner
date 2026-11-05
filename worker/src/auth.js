// Accounts and sessions (SPEC 2.2–2.11, 5.4, 5.8, review 3 M1): prelogin, signup with an invite or the owner code,
// login (and the /tv page's one-shot), the refresh rotation with its theft check, sign-outs, the devices, the password
// and recovery-key changes, recovery, deleting the account.
import { b64u, unb64u, rand, now, fail, str, same, hmac, sha256, ipOf } from './util.js';
import { authHash, ipHash, signAccess, successor, tokenHash } from './keys.js';
import { count, bump, within, shield } from './counters.js';
import { useInvite } from './invites.js';

export const KDF_DEFAULT = 600000, KDF_FLOOR = 600000, KDF_CEIL = 5000000;
const MAX_DEVICES = 10;
const MIN10 = 600e3, HOUR = 3600e3;

const b64len = (v, n) => { if (typeof v !== 'string' || v.length > 400) return false; try { return unb64u(v).length === n; } catch { return false; } };
const box = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{20,400}$/.test(v);
export const normEmail = (e) => String(e || '').trim().toLowerCase().normalize('NFKC');
const okEmail = (e) => e.length >= 3 && e.length <= 200 && /^[^\s@]+@[^\s@]+$/.test(e);
function kdfOf(k) {
  if (!k || k.alg !== 'pbkdf2-sha256' || !Number.isInteger(k.iterations) || k.iterations < KDF_FLOOR || k.iterations > KDF_CEIL || !b64len(k.salt, 16)) fail(400, 'bad_kdf');
  return k;
}
const deviceOf = (d) => ({ name: str(d?.name, 60) || 'A device', kind: ['tv', 'phone', 'pc', 'web'].includes(d?.kind) ? d.kind : 'other', platform: str(d?.platform, 40) });
const kdfOut = (a) => ({ alg: a.kdf_alg, iterations: a.kdf_iter, salt: a.kdf_salt });
export const audit = (env, account, event, device, ip, detail) => env.DB.prepare('INSERT INTO audit (account_id, at, event, device_id, ip_hash, detail) VALUES (?, ?, ?, ?, ?, ?)').bind(account, now(), event, device || null, ip || null, detail || null).run();

async function checkAuth(env, K, a, ak, field = 'auth_hash') {
  if (!b64len(ak, 32)) return false;
  if (same(await authHash(K.auth, a.auth_salt, ak), a[field] || '')) return true;
  if (K.authPrev && field === 'auth_hash' && same(await authHash(K.authPrev, a.auth_salt, ak), a.auth_hash)) {
    await env.DB.prepare('UPDATE accounts SET auth_hash = ? WHERE id = ?').bind(await authHash(K.auth, a.auth_salt, ak), a.id).run();   // re-HMAC'd under the new pepper
    return true;
  }
  return false;
}
// A new device row and its first token pair (generation 1).
export async function newDevice(env, K, accountId, dev, how, approvedBy = null) {
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM devices WHERE account_id = ? AND revoked_at IS NULL').bind(accountId).first('n');
  if (n >= MAX_DEVICES) fail(403, 'too_many_devices');
  const id = b64u(rand(12)), secret = b64u(rand(32)), t = now();
  await env.DB.prepare(`INSERT INTO devices (id, account_id, name, kind, platform, how, created_at, last_seen, approved_by, refresh_hash, refresh_gen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).bind(id, accountId, dev.name, dev.kind, dev.platform, how, t, t, approvedBy, await tokenHash(secret)).run();
  return { deviceId: id, access: await signAccess(K, { sub: accountId, dev: id, gen: 1 }), refresh: `${id}.${secret}` };
}
export async function revoke(env, where, args, why) {
  await env.DB.prepare(`UPDATE devices SET revoked_at = ?, revoked_why = ?, refresh_hash = NULL, refresh_prev_hash = NULL WHERE revoked_at IS NULL AND ${where}`).bind(now(), why, ...args).run();
}
const account = (env, id) => env.DB.prepare('SELECT * FROM accounts WHERE id = ?').bind(id).first();
const keysOut = (a) => ({ account: { id: a.id, email: a.email, owner: !!a.is_owner }, wrappedKey: a.wrapped_key, recoveryKeyWrappedByPw: a.recovery_key_wrapped_by_pw, dkCheck: a.dk_check, kdf: kdfOut(a), keyVersion: a.key_version });

export async function prelogin(req, env, K, body) {
  const email = normEmail(body.email);
  if (!okEmail(email)) fail(400, 'bad_email');
  const a = await env.DB.prepare('SELECT kdf_alg, kdf_iter, kdf_salt FROM accounts WHERE email = ?').bind(email).first();
  if (a) return { kdf: kdfOut(a) };
  // An unknown email gets the current default and a salt that stays the same for it (no "does it exist" answer)
  return { kdf: { alg: 'pbkdf2-sha256', iterations: KDF_DEFAULT, salt: b64u((await hmac(K.fake, email)).slice(0, 16)) } };
}

export async function signup(req, env, K, body) {
  const ip = ipOf(req, env), iph = await ipHash(K, ip);
  if (!(await within(env, `signup:${iph}`, 5, HOUR))) fail(429, 'slow_down');
  const email = normEmail(body.email);
  if (!okEmail(email)) fail(400, 'bad_email');
  const kdf = kdfOf(body.kdf);
  for (const f of ['authKey', 'recoveryAuthKey']) if (!b64len(body[f], 32)) fail(400, 'bad_request');
  for (const f of ['wrappedKey', 'recoveryWrappedKey', 'recoveryKeyWrappedByPw', 'dkCheck']) if (!box(body[f])) fail(400, 'bad_request');
  const id = b64u(rand(16)), t = now(), salt = b64u(rand(16));
  // The invite (or the owner code, once) is checked and spent in the same batch as the account is made
  const spend = await useInvite(env, K, String(body.invite ?? ''), id, t);
  if (await env.DB.prepare('SELECT 1 AS x FROM accounts WHERE email = ?').bind(email).first()) fail(409, 'email_taken');
  const stmts = [
    env.DB.prepare(`INSERT INTO accounts (id, email, created_at, kdf_alg, kdf_iter, kdf_salt, auth_salt, auth_hash, wrapped_key, dk_check,
      recovery_wrapped_key, recovery_auth_hash, recovery_key_wrapped_by_pw, recovery_set_at, is_owner) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, email, t, kdf.alg, kdf.iterations, kdf.salt, salt, await authHash(K.auth, salt, body.authKey), body.wrappedKey, body.dkCheck,
        body.recoveryWrappedKey, await authHash(K.auth, salt, body.recoveryAuthKey), body.recoveryKeyWrappedByPw, t, spend.owner ? 1 : 0),
    ...spend.stmts,
  ];
  try { await env.DB.batch(stmts); } catch (e) {
    if (/UNIQUE|constraint/i.test(String(e?.message || e))) { if (await env.DB.prepare('SELECT 1 AS x FROM accounts WHERE email = ?').bind(email).first()) fail(409, 'email_taken'); fail(403, 'bad_invite'); }
    throw e;
  }
  const d = await newDevice(env, K, id, deviceOf(body.device), 'password');
  await audit(env, id, spend.owner ? 'signup-owner' : 'signup', d.deviceId, iph);
  return { ...keysOut(await account(env, id)), ...d };
}

export async function login(req, env, K, body) {
  const ip = ipOf(req, env), iph = await ipHash(K, ip);
  if (!(await shield(env.RL_LOGIN, `login:${iph}`))) fail(429, 'slow_down');
  const email = normEmail(body.email);
  const a = okEmail(email) ? await env.DB.prepare('SELECT * FROM accounts WHERE email = ?').bind(email).first() : null;
  const failKey = `loginfail:${a?.id || email}:${iph}`;
  if ((await count(env, failKey, MIN10)) >= 5) fail(429, 'slow_down');
  if (!a || !(await checkAuth(env, K, a, body.authKey))) {
    if (!a) await hmac(K.auth, 'x');   // (about the same work either way)
    await bump(env, failKey, MIN10);
    fail(401, 'bad_login');
  }
  if (body.oneShot) {
    // The /tv page: a 5-minute token good for the lookup and the approval only; no refresh token, no device row
    await audit(env, a.id, 'login-web', null, iph);
    return { ...keysOut(a), access: await signAccess(K, { sub: a.id, scope: 'approve', ttl: 300 }) };
  }
  const d = await newDevice(env, K, a.id, deviceOf(body.device), 'password');
  await audit(env, a.id, 'login', d.deviceId, iph);
  return { ...keysOut(a), ...d };
}

// The rotation (SPEC 5.8 with review 3, M1). "Used" = the first authenticated call with an access token of the current
// generation (index.js sets refresh_used_at), or a refresh that presents the current token.
export async function token(req, env, K, body) {
  const [dev, secret] = String(body.refresh || '').split('.');
  if (!dev || !secret) fail(400, 'bad_request');
  const d = await env.DB.prepare('SELECT * FROM devices WHERE id = ?').bind(dev).first();
  if (!d || d.revoked_at) return revokedAnswer(d);
  const h = await tokenHash(secret);
  if (d.refresh_hash && same(h, d.refresh_hash)) {
    const next = await successor(K, dev, secret), gen = d.refresh_gen + 1, t = now();
    const r = await env.DB.prepare(`UPDATE devices SET refresh_prev_hash = refresh_hash, refresh_hash = ?, refresh_gen = ?, refresh_rotated_at = ?, refresh_used_at = NULL, last_seen = ?
      WHERE id = ? AND refresh_hash = ? AND revoked_at IS NULL`).bind(await tokenHash(next), gen, t, t, dev, h).run();
    if (!r.meta?.changes) return token(req, env, K, body);   // (a concurrent rotation: it is now the previous token)
    return { access: await signAccess(K, { sub: d.account_id, dev, gen }), refresh: `${dev}.${next}` };
  }
  if (d.refresh_prev_hash && same(h, d.refresh_prev_hash) && !d.refresh_used_at) {
    // A retry after a lost answer or a crash before the new token was stored: the same successor again
    const next = await successor(K, dev, secret);
    if (!same(await tokenHash(next), d.refresh_hash)) fail(500, 'token_mismatch');
    return { access: await signAccess(K, { sub: d.account_id, dev, gen: d.refresh_gen }), refresh: `${dev}.${next}` };
  }
  // The previous token after its successor was used, or an older one: a second holder. The device is signed out.
  await revoke(env, 'id = ?', [dev], 'reuse');
  await audit(env, d.account_id, 'token-reuse', dev, await ipHash(K, ipOf(req, env)));
  return revokedAnswer({ revoked_why: 'reuse' });
}
export function revokedAnswer(d) {
  const [why, by] = String(d?.revoked_why || 'gone').split('|');
  return { status: 401, body: { error: 'revoked', why, by: by || undefined } };
}

export async function logout(req, env, K, body, ctx) { await revoke(env, 'id = ?', [ctx.device], 'signout'); return null; }
export async function logoutAll(req, env, K, body, ctx) {
  const me = ctx.dev;
  // A TV only confirms with OK (SPEC 2.5); a phone or a PC confirms with the password
  if (me.kind !== 'tv') { const a = await account(env, ctx.account); if (!(await checkAuth(env, K, a, body.authKey))) fail(401, 'bad_login'); }
  await revoke(env, 'account_id = ?', [ctx.account], `everywhere|${me.name}`);
  await audit(env, ctx.account, 'logout-all', ctx.device);
  return null;
}

export async function devices(req, env, K, body, ctx) {
  const { results } = await env.DB.prepare(`SELECT d.id, d.name, d.kind, d.platform, d.how, d.created_at, d.last_seen, d.approved_by, a.name AS approver, a.revoked_at AS approver_gone
    FROM devices d LEFT JOIN devices a ON a.id = d.approved_by WHERE d.account_id = ? AND d.revoked_at IS NULL ORDER BY d.created_at`).bind(ctx.account).all();
  const tried = await env.DB.prepare("SELECT at FROM audit WHERE account_id = ? AND event = 'recover-fail' AND at > ? ORDER BY at DESC LIMIT 3").bind(ctx.account, now() - 30 * 864e5).all();
  return {
    devices: results.map((d) => ({ id: d.id, name: d.name, kind: d.kind, platform: d.platform, how: d.how, approvedBy: d.approved_by === 'web' ? 'the web page' : d.approver || null,
      approverSignedOut: !!d.approver_gone, createdAt: d.created_at, lastSeen: d.last_seen, active: now() - d.last_seen < 10 * 60e3, this: d.id === ctx.device })),
    recoveryAttempts: tried.results.map((r) => r.at), max: MAX_DEVICES,
  };
}
export async function renameDevice(req, env, K, body, ctx, id) {
  const name = str(body.name, 60).trim();
  if (!name) fail(400, 'bad_request');
  await env.DB.prepare('UPDATE devices SET name = ? WHERE id = ? AND account_id = ?').bind(name, id, ctx.account).run();
  return null;
}
export async function removeDevice(req, env, K, body, ctx, id) {
  await revoke(env, 'id = ? AND account_id = ?', [id, ctx.account], `removed|${ctx.dev.name}`);
  return null;
}

export async function password(req, env, K, body, ctx) {
  const a = await account(env, ctx.account);
  if (!(await checkAuth(env, K, a, body.authKey))) fail(401, 'bad_login');
  const kdf = kdfOf(body.kdf);
  if (!b64len(body.newAuthKey, 32) || !box(body.wrappedKey) || !box(body.recoveryKeyWrappedByPw)) fail(400, 'bad_request');
  // The recovery auth hash is HMAC'd with the account's auth salt, so a new salt re-HMACs it too: the server keeps
  // the old salt for it instead (recovery doesn't depend on the password, SPEC 5.3)
  await env.DB.prepare('UPDATE accounts SET kdf_alg = ?, kdf_iter = ?, kdf_salt = ?, auth_hash = ?, wrapped_key = ?, recovery_key_wrapped_by_pw = ? WHERE id = ?')
    .bind(kdf.alg, kdf.iterations, kdf.salt, await authHash(K.auth, a.auth_salt, body.newAuthKey), body.wrappedKey, body.recoveryKeyWrappedByPw, a.id).run();
  if (body.signOutOthers) await revoke(env, 'account_id = ? AND id != ?', [a.id, ctx.device], `everywhere|${ctx.dev.name}`);
  await audit(env, a.id, 'password', ctx.device);
  return { keyVersion: a.key_version };
}
export async function recoveryKey(req, env, K, body, ctx) {
  const a = await account(env, ctx.account);
  if (!(await checkAuth(env, K, a, body.authKey))) fail(401, 'bad_login');
  if (!b64len(body.recoveryAuthKey, 32) || !box(body.recoveryWrappedKey) || !box(body.recoveryKeyWrappedByPw)) fail(400, 'bad_request');
  await env.DB.prepare('UPDATE accounts SET recovery_wrapped_key = ?, recovery_auth_hash = ?, recovery_key_wrapped_by_pw = ?, recovery_set_at = ? WHERE id = ?')
    .bind(body.recoveryWrappedKey, await authHash(K.auth, a.auth_salt, body.recoveryAuthKey), body.recoveryKeyWrappedByPw, now(), a.id).run();
  await audit(env, a.id, 'recovery-key', ctx.device);
  return null;
}
// The recovery wrap itself is sent back for an email + proof only (the device needs it to unwrap dk)
export async function recoverStart(req, env, K, body) {
  const email = normEmail(body.email);
  const a = okEmail(email) ? await env.DB.prepare('SELECT * FROM accounts WHERE email = ?').bind(email).first() : null;
  if (!a) fail(401, 'bad_recovery');
  if ((await count(env, `recover:${a.id}`, HOUR)) >= 5) fail(429, 'slow_down');
  if (!(await checkAuth(env, K, a, body.recoveryAuthKey, 'recovery_auth_hash'))) {
    await bump(env, `recover:${a.id}`, HOUR);
    await audit(env, a.id, 'recover-fail', null, await ipHash(K, ipOf(req, env)));
    fail(401, 'bad_recovery');
  }
  return { recoveryWrappedKey: a.recovery_wrapped_key, kdf: kdfOut(a) };
}
export async function recover(req, env, K, body) {
  await recoverStart(req, env, K, body);
  const a = await env.DB.prepare('SELECT * FROM accounts WHERE email = ?').bind(normEmail(body.email)).first();
  const kdf = kdfOf(body.kdf);
  if (!b64len(body.newAuthKey, 32) || !box(body.wrappedKey) || !box(body.recoveryKeyWrappedByPw)) fail(400, 'bad_request');
  await env.DB.prepare('UPDATE accounts SET kdf_alg = ?, kdf_iter = ?, kdf_salt = ?, auth_hash = ?, wrapped_key = ?, recovery_key_wrapped_by_pw = ? WHERE id = ?')
    .bind(kdf.alg, kdf.iterations, kdf.salt, await authHash(K.auth, a.auth_salt, body.newAuthKey), body.wrappedKey, body.recoveryKeyWrappedByPw, a.id).run();
  await revoke(env, 'account_id = ?', [a.id], 'recovered');
  const d = await newDevice(env, K, a.id, deviceOf(body.device), 'recovery');
  await audit(env, a.id, 'recover', d.deviceId, await ipHash(K, ipOf(req, env)));
  return { ...keysOut(await account(env, a.id)), ...d };
}
export async function deleteAccount(req, env, K, body, ctx) {
  const a = await account(env, ctx.account);
  if (!(await checkAuth(env, K, a, body.authKey))) fail(401, 'bad_login');
  await env.DB.batch(['records', 'records_prev', 'devices', 'invites'].map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE ${t === 'invites' ? 'made_by' : 'account_id'} = ?`).bind(a.id))
    .concat([env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(a.id), env.DB.prepare('UPDATE audit SET account_id = NULL WHERE account_id = ?').bind(a.id)]));
  await audit(env, null, 'account-deleted', null, null, b64u((await sha256(a.email)).slice(0, 12)));
  return null;
}
