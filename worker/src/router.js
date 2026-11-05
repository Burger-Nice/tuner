// airglow accounts: the router (design/ui-v1/accounts-v1/SPEC.md 6). A plain fetch router; every route names the
// token scopes it accepts and anything unlisted is refused (deny by default, review 3). CORS * without credentials:
// auth is a bearer token, and Electron's page sends Origin: null.
import { json, Fail, ipOf } from './util.js';
import { keysOf, readAccess } from './keys.js';
import * as A from './auth.js';
import * as D from './device.js';
import * as Y from './sync.js';
import * as I from './invites.js';

export const VERSION = '1.0.0';
const PUBLIC = null, FULL = ['full'], APPROVE = ['full', 'approve'];
// [method, path pattern, handler, scopes (null = no token), owner only]
const ROUTES = [
  ['POST', '/v1/prelogin', A.prelogin, PUBLIC],
  ['POST', '/v1/signup', A.signup, PUBLIC],
  ['POST', '/v1/login', A.login, PUBLIC],
  ['POST', '/v1/token', A.token, PUBLIC],
  ['POST', '/v1/recover/start', A.recoverStart, PUBLIC],
  ['POST', '/v1/recover', A.recover, PUBLIC],
  ['POST', '/v1/device/code', D.code, PUBLIC],
  ['POST', '/v1/device/token', D.poll, PUBLIC],
  ['POST', '/v1/device/approve', D.approve, APPROVE],
  ['POST', '/v1/device/deny', D.deny, APPROVE],
  ['GET', /^\/v1\/device\/([A-Za-z-]{6,8})$/, D.lookup, APPROVE],
  ['POST', '/v1/logout', A.logout, FULL],
  ['POST', '/v1/logout-all', A.logoutAll, FULL],
  ['GET', '/v1/devices', A.devices, FULL],
  ['PATCH', /^\/v1\/devices\/([A-Za-z0-9_-]{8,40})$/, A.renameDevice, FULL],
  ['DELETE', /^\/v1\/devices\/([A-Za-z0-9_-]{8,40})$/, A.removeDevice, FULL],
  ['POST', '/v1/password', A.password, FULL],
  ['POST', '/v1/recovery-key', A.recoveryKey, FULL],
  ['DELETE', '/v1/account', A.deleteAccount, FULL],
  ['GET', '/v1/sync/seq', Y.seqOnly, FULL],
  ['GET', '/v1/sync', Y.pull, FULL],
  ['POST', '/v1/sync', Y.push, FULL],
  ['POST', '/v1/sync/get', Y.getMany, FULL],
  ['GET', '/v1/undo', Y.undo, FULL],
  ['GET', '/v1/invites', I.listInvites, FULL, true],
  ['POST', '/v1/invites', I.makeInvite, FULL, true],
];
const ready = (env) => !!(env.PEPPER && env.TOKEN_SECRET && env.DB);

async function authed(req, env, K, scopes, ownerOnly) {
  const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const p = await readAccess(K, tok);
  if (!p) return { fail: json({ error: 'unauthorized' }, 401) };
  if (!scopes.includes(p.scope)) return { fail: json({ error: 'scope' }, 403) };
  if (p.scope === 'approve') return ownerOnly ? { fail: json({ error: 'scope' }, 403) } : { ctx: { account: p.sub, device: null, scope: p.scope, dev: null } };
  const d = await env.DB.prepare('SELECT d.*, a.is_owner FROM devices d JOIN accounts a ON a.id = d.account_id WHERE d.id = ?').bind(p.dev).first();
  if (!d || d.account_id !== p.sub || d.revoked_at) { const r = A.revokedAnswer(d); return { fail: json(r.body, r.status) }; }
  if (ownerOnly && !d.is_owner) return { fail: json({ error: 'not_owner' }, 403) };
  // The first call with an access token of the current refresh generation marks that generation used (review 3, M1)
  const t = Date.now(), mark = p.gen === d.refresh_gen && !d.refresh_used_at;
  if (mark || t - d.last_seen > 5 * 60e3) {
    await env.DB.prepare('UPDATE devices SET last_seen = ?, refresh_used_at = CASE WHEN refresh_gen = ? AND refresh_used_at IS NULL THEN ? ELSE refresh_used_at END WHERE id = ?').bind(t, p.gen, t, d.id).run();
  }
  return { ctx: { account: p.sub, device: d.id, scope: p.scope, dev: d } };
}

export async function handle(req, env) {
  const url = new URL(req.url), path = url.pathname;
  if (req.method === 'OPTIONS') return json(null, 204);
  if (path === '/v1/health') return json({ ok: true, version: VERSION, ready: ready(env) });
  if (path.startsWith('/tv/') && env.ASSETS) {
    // /tv/<code> is the same page with the code filled in from the address (pages/tv.html reads it)
    return env.ASSETS.fetch(new Request(new URL('/tv', url), req));
  }
  if (!path.startsWith('/v1/')) return env.ASSETS ? env.ASSETS.fetch(req) : json({ error: 'not_found' }, 404);
  if (!ready(env)) return json({ error: 'not_ready' }, 503);
  let m = null;
  const route = ROUTES.find(([meth, pat]) => meth === req.method && (typeof pat === 'string' ? pat === path : (m = path.match(pat))));
  if (!route) return json({ error: 'not_found' }, 404);
  const [, , fn, scopes, ownerOnly] = route;
  try {
    const K = await keysOf(env);
    let ctx = null;
    if (scopes) { const a = await authed(req, env, K, scopes, ownerOnly); if (a.fail) return a.fail; ctx = a.ctx; }
    let raw = '', body = {};
    if (req.method !== 'GET') {
      raw = await req.text();
      if (raw.length > 300 * 1024) return json({ error: 'too_large' }, 413);
      if (raw) { try { body = JSON.parse(raw); } catch { return json({ error: 'bad_request' }, 400); } }
      if (!body || typeof body !== 'object') body = {};
    }
    const r = await fn(req, env, K, body, ctx, m ? m[1] : raw, raw);
    if (r && r.status && r.body) return json(r.body, r.status);
    return r == null ? json(null, 204) : json(r);
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.code, ...(e.extra || {}) }, e.status);
    console.error('airglow worker', path, e?.message);   // (no bodies, no addresses)
    return json({ error: 'server' }, 500);
  }
}

void ipOf;
