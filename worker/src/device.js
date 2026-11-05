// Signing a TV in (SPEC 2.3, 5.5, 6.1): RFC 8628's device flow, with the approver wrapping the data key for the TV.
import { b64u, rand, now, fail, str, ipOf, netOf, same } from './util.js';
import { ipHash, tokenHash } from './keys.js';
import { within, count, bump, shield } from './counters.js';
import { letters } from './invites.js';
import { newDevice, audit } from './auth.js';

const TTL = 600e3, MIN10 = 600e3;
const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
const netHash = async (K, req, env) => ipHash(K, `net|${netOf(ipOf(req, env))}`);

export async function code(req, env, K, body) {
  const iph = await ipHash(K, ipOf(req, env));
  if (!(await within(env, `code:${iph}`, 20, 3600e3))) fail(429, 'slow_down');
  const pub = str(body.pub, 200);
  if (!/^[A-Za-z0-9_-]{80,100}$/.test(pub)) fail(400, 'bad_request');
  const dc = b64u(rand(32)), t = now(), net = await netHash(K, req, env);
  for (let i = 0; i < 5; i++) {
    const uc = letters(6);
    try {
      await env.DB.prepare('INSERT INTO device_codes (device_code_hash, user_code, tv_name, tv_kind, tv_pub, tv_net, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(await tokenHash(dc), uc, str(body.name, 60) || 'TV', str(body.kind, 20) || 'tv', pub, net, t, t + TTL).run();
      const origin = new URL(req.url).origin;
      return { device_code: dc, user_code: uc, verification_uri: `${origin}/tv`, verification_uri_complete: `${origin}/tv/${uc}`, expires_in: TTL / 1000, interval: 5 };
    } catch (e) { if (!/UNIQUE|constraint/i.test(String(e?.message || e))) throw e; }
  }
  fail(503, 'busy');
}

// The TV's poll. RFC 8628 3.5: authorization_pending, slow_down (+5 s), expired_token, access_denied.
export async function poll(req, env, K, body) {
  const h = await tokenHash(String(body.device_code || ''));
  if (!(await shield(env.RL_POLL, `poll:${h}`))) return { status: 400, body: { error: 'slow_down' } };
  const c = await env.DB.prepare('SELECT * FROM device_codes WHERE device_code_hash = ?').bind(h).first();
  const t = now();
  if (!c || c.expires_at < t || c.status === 'used' || c.status === 'expired') return { status: 400, body: { error: 'expired_token' } };
  if (c.last_poll && t - c.last_poll < c.poll_gap * 1000 - 1500) {
    await env.DB.prepare('UPDATE device_codes SET poll_gap = poll_gap + 5, last_poll = ? WHERE device_code_hash = ?').bind(t, h).run();
    return { status: 400, body: { error: 'slow_down' } };
  }
  if (c.status === 'denied') {
    await env.DB.prepare("UPDATE device_codes SET status = 'used' WHERE device_code_hash = ?").bind(h).run();
    return { status: 400, body: { error: 'access_denied' } };
  }
  if (c.status !== 'approved') {
    await env.DB.prepare('UPDATE device_codes SET last_poll = ? WHERE device_code_hash = ?').bind(t, h).run();
    return { status: 400, body: { error: 'authorization_pending' } };
  }
  // Approved: used once (a second poll can't take another device row)
  const r = await env.DB.prepare("UPDATE device_codes SET status = 'used', box = NULL WHERE device_code_hash = ? AND status = 'approved'").bind(h).run();
  if (!r.meta?.changes) return { status: 400, body: { error: 'expired_token' } };
  const a = await env.DB.prepare('SELECT id, email, dk_check, key_version, is_owner FROM accounts WHERE id = ?').bind(c.account_id).first();
  if (!a) return { status: 400, body: { error: 'access_denied' } };
  const d = await newDevice(env, K, a.id, { name: c.tv_name, kind: c.tv_kind === 'tv' ? 'tv' : 'other', platform: 'android' }, 'phone', c.approved_by_device);
  await audit(env, a.id, 'device-approved', d.deviceId, null, c.approved_by_device);
  return { ...d, box: JSON.parse(c.box), dkCheck: a.dk_check, keyVersion: a.key_version, account: { id: a.id, email: a.email, owner: !!a.is_owner } };
}

async function pending(env, uc) {
  const c = await env.DB.prepare('SELECT * FROM device_codes WHERE user_code = ?').bind(uc).first();
  return c && c.status === 'pending' && c.expires_at > now() ? c : null;
}
// The approver's lookup: needs an account; a code that matches nothing counts against that account and its address.
export async function lookup(req, env, K, body, ctx, rawCode) {
  const iph = await ipHash(K, ipOf(req, env)), key = `lookup:${ctx.account}:${iph}`;
  if ((await count(env, key, MIN10)) >= 5) fail(429, 'slow_down');
  const c = await pending(env, normCode(rawCode));
  if (!c) { await bump(env, key, MIN10); fail(404, 'no_code'); }
  return { name: c.tv_name, kind: c.tv_kind, pub: c.tv_pub, askedAt: c.created_at, expiresAt: c.expires_at, sameNetwork: same(c.tv_net || '', await netHash(K, req, env)), now: now() };
}
export async function approve(req, env, K, body, ctx) {
  // Only a device that signed in with the password or the recovery key (or the /tv page's one-shot) may approve
  if (ctx.scope !== 'approve' && !['password', 'recovery'].includes(ctx.dev?.how)) fail(403, 'cannot_approve');
  const b = body.box;
  if (!b || typeof b !== 'object' || !/^[A-Za-z0-9_-]{80,100}$/.test(String(b.ePub)) || !/^[A-Za-z0-9_-]{16}$/.test(String(b.iv)) || !/^[A-Za-z0-9_-]{40,100}$/.test(String(b.ct))) fail(400, 'bad_request');
  const c = await pending(env, normCode(body.user_code));
  if (!c) fail(404, 'no_code');
  const r = await env.DB.prepare("UPDATE device_codes SET status = 'approved', account_id = ?, box = ?, approved_by_device = ? WHERE user_code = ? AND status = 'pending'")
    .bind(ctx.account, JSON.stringify({ ePub: b.ePub, iv: b.iv, ct: b.ct }), ctx.device || 'web', c.user_code).run();
  if (!r.meta?.changes) fail(404, 'no_code');
  return null;
}
export async function deny(req, env, K, body, ctx) {
  await env.DB.prepare("UPDATE device_codes SET status = 'denied' WHERE user_code = ? AND status = 'pending'").bind(normCode(body.user_code)).run();
  return null;
}
