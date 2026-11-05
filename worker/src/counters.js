// The limits the Rate Limiting binding can't express (SPEC 6.3): rows in `counters`, a fixed window each.
import { now } from './util.js';

export async function count(env, key, windowMs) {
  const r = await env.DB.prepare('SELECT n, window_start FROM counters WHERE key = ?').bind(key).first();
  return r && r.window_start > now() - windowMs ? r.n : 0;
}
export async function bump(env, key, windowMs) {
  const t = now(), cut = t - windowMs;
  const r = await env.DB.prepare(`INSERT INTO counters (key, n, window_start) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET n = CASE WHEN window_start <= ? THEN 1 ELSE n + 1 END,
      window_start = CASE WHEN window_start <= ? THEN ? ELSE window_start END RETURNING n`).bind(key, t, cut, cut, t).first();
  return r?.n || 1;
}
// Counts this attempt and says whether it is within the limit.
export const within = async (env, key, limit, windowMs) => (await bump(env, key, windowMs)) <= limit;
// The per-minute shield (the binding is permissive and eventually consistent; a missing binding lets everything by)
export async function shield(binding, key) {
  if (!binding?.limit) return true;
  try { return (await binding.limit({ key })).success !== false; } catch { return true; }
}
