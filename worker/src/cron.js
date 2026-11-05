// Daily housekeeping (SPEC 6.2): expired codes, old tombstones (their seq becomes the reset horizon), 30 days of
// previous versions and snapshots, counters, audit rows, revoked devices.
import { now } from './util.js';

export async function housekeeping(env) {
  const t = now(), D = 864e5;
  await env.DB.prepare(`UPDATE accounts SET purged_seq = MAX(purged_seq, COALESCE((SELECT MAX(seq) FROM records r WHERE r.account_id = accounts.id AND r.deleted = 1 AND r.updated_at < ?), 0))`).bind(t - 90 * D).run();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM device_codes WHERE expires_at < ?').bind(t - D),
    env.DB.prepare('DELETE FROM records WHERE deleted = 1 AND updated_at < ?').bind(t - 90 * D),
    env.DB.prepare('DELETE FROM records_prev WHERE replaced_at < ?').bind(t - 30 * D),
    env.DB.prepare("DELETE FROM records WHERE col = 'snapshots' AND updated_at < ?").bind(t - 30 * D),
    env.DB.prepare('DELETE FROM counters WHERE window_start < ?').bind(t - D),
    env.DB.prepare('DELETE FROM audit WHERE at < ?').bind(t - 180 * D),
    env.DB.prepare('DELETE FROM devices WHERE revoked_at IS NOT NULL AND revoked_at < ?').bind(t - 30 * D),
    env.DB.prepare(`UPDATE accounts SET record_count = (SELECT COUNT(*) FROM records r WHERE r.account_id = accounts.id),
      bytes = (SELECT COALESCE(SUM(length(blob)), 0) FROM records r WHERE r.account_id = accounts.id),
      prev_bytes = (SELECT COALESCE(SUM(length(blob)), 0) FROM records_prev p WHERE p.account_id = accounts.id)`),
  ]);
}
