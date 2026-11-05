// Invite codes (SPEC 2.10) and the owner code's single use (SPEC 7.3, review 3 S5).
// The invite field arrives exactly as typed. An invite code is AIRGLOW-XXXX-XXXX in RFC 8628's base-20 letters
// (case, spaces and dashes don't matter for it); anything else is tried as the owner code, compared after NFKC and
// trim, case-sensitive, constant-time, while it is unclaimed, with an account-wide cap on wrong tries.
import { b64u, sha256, now, fail, same, enc } from './util.js';
import { within } from './counters.js';

export const LETTERS = 'BCDFGHJKLMNPQRSTVWXZ';
export function letters(n) {
  let out = '';
  while (out.length < n) for (const b of crypto.getRandomValues(new Uint8Array(n * 2))) if (b < 240 && out.length < n) out += LETTERS[b % 20];
  return out;
}
const inviteLetters = (raw) => {
  const s = raw.toUpperCase().replace(/[\s-]/g, '').replace(/^AIRGLOW/, '');
  return new RegExp(`^[${LETTERS}]{8}$`).test(s) ? s : null;
};
const codeHash = async (l) => b64u(await sha256(`airglow/v1/invite|${l}`));
const OWNER_TRIES = 20, HOUR = 3600e3;

// Returns { owner, stmts }: the statements that spend the code, run in the account's batch (a second use fails there).
export async function useInvite(env, K, raw, accountId, t) {
  if (env.OPEN_SIGNUP === 'true' && !raw.trim()) return { owner: false, stmts: [] };
  const l = inviteLetters(raw);
  if (l) {
    const h = await codeHash(l);
    const inv = await env.DB.prepare('SELECT * FROM invites WHERE code_hash = ?').bind(h).first();
    if (!inv || inv.used_at || inv.expires_at < t) fail(403, 'bad_invite');
    return { owner: false, stmts: [
      env.DB.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').bind(`invite-used:${h}`, accountId),   // (fails on a second use: the batch rolls back)
      env.DB.prepare('UPDATE invites SET used_at = ?, used_by = ? WHERE code_hash = ?').bind(t, accountId, h),
    ] };
  }
  const code = env.OWNER_CODE ? String(env.OWNER_CODE).normalize('NFKC').trim() : '';
  const claimed = await env.DB.prepare("SELECT 1 AS x FROM meta WHERE key = 'owner_claimed'").first();
  if (!code || claimed) fail(403, 'bad_invite');
  if (!(await within(env, 'owner-tries', OWNER_TRIES, HOUR))) fail(403, 'bad_invite');   // (counted whether right or wrong: a grinder runs out)
  const typed = raw.normalize('NFKC').trim();
  const ok = same(await sha256(typed), await sha256(code)) && typed.length > 0;
  if (!ok) fail(403, 'bad_invite');
  return { owner: true, stmts: [env.DB.prepare("INSERT INTO meta (key, value) VALUES ('owner_claimed', ?)").bind(accountId)] };
}

export async function listInvites(req, env, K, body, ctx) {
  const since = monthStart();
  const { results } = await env.DB.prepare('SELECT created_at, expires_at, used_at FROM invites WHERE made_by = ? ORDER BY created_at DESC LIMIT 20').bind(ctx.account).all();
  const made = results.filter((r) => r.created_at >= since).length;
  return { invites: results.map((r) => ({ createdAt: r.created_at, expiresAt: r.expires_at, usedAt: r.used_at })), left: Math.max(0, perMonth(env) - made), openSignup: env.OPEN_SIGNUP === 'true' };
}
export async function makeInvite(req, env, K, body, ctx) {
  const since = monthStart();
  const made = await env.DB.prepare('SELECT COUNT(*) AS n FROM invites WHERE made_by = ? AND created_at >= ?').bind(ctx.account, since).first('n');
  if (made >= perMonth(env)) fail(429, 'no_invites_left');
  const l = letters(8), t = now(), exp = t + 7 * 864e5;
  await env.DB.prepare('INSERT INTO invites (code_hash, made_by, created_at, expires_at) VALUES (?, ?, ?, ?)').bind(await codeHash(l), ctx.account, t, exp).run();
  return { code: `AIRGLOW-${l.slice(0, 4)}-${l.slice(4)}`, expiresAt: exp, left: perMonth(env) - made - 1 };
}
const perMonth = (env) => +env.INVITES_PER_MONTH || 10;
const monthStart = () => { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); };
void enc;
