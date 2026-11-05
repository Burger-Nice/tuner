// Records (SPEC 4, 6.1): blobs the server can't read, a per-account sequence, compare-and-set per record, one previous
// version per record per UTC day for 30 days, the mass-delete guard with `wipe` naming the collections it may empty
// (review 3, S4), the caps (8 MB with the oldest previous versions dropped first, review 3), the undo listing.
import { now, fail, dayStart } from './util.js';
import { within, shield } from './counters.js';

const CAP = 8 * 1024 * 1024, CAP_RECORDS = 5000, MAX_BODY = 256 * 1024, MAX_RECORDS = 100, PER_DAY = 2000;
const COLS = new Set(['providers', 'keys', 'addons', 'favs', 'progress', 'plays', 'rows', 'titles', 'shield', 'settings', 'snapshots', 'devices-meta']);
const ID = /^[A-Za-z0-9_:.-]{1,64}$/, B64 = /^[A-Za-z0-9_-]*$/;

export const seqOnly = async (req, env, K, body, ctx) => ({ seq: (await env.DB.prepare('SELECT seq FROM accounts WHERE id = ?').bind(ctx.account).first('seq')) || 0, now: now() });

export async function pull(req, env, K, body, ctx) {
  const u = new URL(req.url), since = Math.max(0, +u.searchParams.get('since') || 0), limit = Math.min(200, Math.max(1, +u.searchParams.get('limit') || 100));
  const a = await env.DB.prepare('SELECT seq, purged_seq FROM accounts WHERE id = ?').bind(ctx.account).first();
  if (since > 0 && since < a.purged_seq) return { reset: true, seq: a.seq, now: now() };
  const { results } = await env.DB.prepare('SELECT col, id, ver, iv, blob, deleted, seq FROM records WHERE account_id = ? AND seq > ? ORDER BY seq LIMIT ?').bind(ctx.account, since, limit + 1).all();
  const more = results.length > limit, rows = results.slice(0, limit);
  return { records: rows.map(out), seq: more ? rows[rows.length - 1].seq : Math.max(a.seq, since), more, now: now() };
}
const out = (r) => ({ col: r.col, id: r.id, ver: r.ver, iv: r.iv, blob: r.blob, deleted: !!r.deleted, seq: r.seq });

// A by-ids read (the held deletes keep the server's copy until the person chooses, review 3 S3)
export async function getMany(req, env, K, body, ctx) {
  const keys = (Array.isArray(body.ids) ? body.ids : []).slice(0, MAX_RECORDS).filter((x) => COLS.has(x?.col) && ID.test(String(x?.id))).map((x) => `${x.col}/${x.id}`);
  if (!keys.length) return { records: [], now: now() };
  const { results } = await env.DB.prepare("SELECT col, id, ver, iv, blob, deleted, seq FROM records WHERE account_id = ? AND (col || '/' || id) IN (SELECT value FROM json_each(?))").bind(ctx.account, JSON.stringify(keys)).all();
  return { records: results.map(out), now: now() };
}

export async function push(req, env, K, body, ctx, raw) {
  const CAP_BYTES = (env.TEST_MODE === 'true' && +env.CAP_BYTES) || CAP;
  if (raw.length > MAX_BODY) fail(413, 'too_large');
  if (!(await shield(env.RL_SYNC, `sync:${ctx.account}`))) fail(429, 'slow_down');
  const recs = Array.isArray(body.records) ? body.records : null;
  if (!recs || recs.length > MAX_RECORDS) fail(400, 'bad_request');
  const wipe = new Set(Array.isArray(body.wipe) ? body.wipe.filter((c) => COLS.has(c)) : []);
  const seen = new Set();
  for (const r of recs) {
    const k = `${r?.col}/${r?.id}`;
    if (!COLS.has(r?.col) || !ID.test(String(r.id)) || seen.has(k) || !Number.isInteger(r.ver) || !Number.isInteger(r.baseVer) || r.baseVer < 0 || r.ver <= r.baseVer) fail(400, 'bad_request');
    if (!r.deleted && (typeof r.iv !== 'string' || !B64.test(r.iv) || r.iv.length !== 16 || typeof r.blob !== 'string' || !B64.test(r.blob) || r.blob.length > 90000)) fail(400, 'bad_request');
    seen.add(k);
  }
  if (!(await within(env, `pushes:${ctx.account}:${dayStart()}`, PER_DAY, 864e5))) fail(429, 'slow_down');
  const t = now();
  const { results: cur } = await env.DB.prepare("SELECT col, id, ver, deleted, length(blob) AS len FROM records WHERE account_id = ? AND (col || '/' || id) IN (SELECT value FROM json_each(?))")
    .bind(ctx.account, JSON.stringify([...seen])).all();
  const have = new Map(cur.map((r) => [`${r.col}/${r.id}`, r]));
  const conflict = [], held = [], ok = [];
  for (const r of recs) {
    const s = have.get(`${r.col}/${r.id}`);
    if ((s?.ver || 0) !== r.baseVer) { conflict.push({ col: r.col, id: r.id, ver: s?.ver || 0 }); continue; }
    if (r.deleted && (!s || s.deleted)) continue;   // (nothing to delete)
    ok.push(r);
  }
  // The mass-delete guard: more than half of a collection and at least five, unless `wipe` names that collection
  const dels = {};
  for (const r of ok) if (r.deleted) (dels[r.col] ||= []).push(r);
  for (const [col, list] of Object.entries(dels)) {
    if (list.length < 5 || wipe.has(col)) continue;
    const live = await env.DB.prepare('SELECT COUNT(*) AS n FROM records WHERE account_id = ? AND col = ? AND deleted = 0').bind(ctx.account, col).first('n');
    if (list.length > live / 2) for (const r of list) { held.push({ col, id: r.id }); ok.splice(ok.indexOf(r), 1); }
  }
  const acc = await env.DB.prepare('SELECT seq, record_count, bytes, prev_bytes FROM accounts WHERE id = ?').bind(ctx.account).first();
  let addN = 0, addB = 0;
  for (const r of ok) { const s = have.get(`${r.col}/${r.id}`); if (!s) addN++; addB += (r.deleted ? 0 : r.blob.length) - (s?.len || 0); }
  if (acc.record_count + addN > CAP_RECORDS) fail(413, 'too_many_records');
  // The cap counts the previous versions too; at the cap the oldest of those go first, before a write is refused
  if (acc.bytes + acc.prev_bytes + addB > CAP_BYTES) await makeRoom(env, ctx.account, acc.bytes + addB, CAP_BYTES);
  if (acc.bytes + addB > CAP_BYTES) fail(413, 'quota');
  const day = dayStart(t), stmts = [], upserts = [], prevs = [];
  ok.forEach((r, i) => {
    const s = have.get(`${r.col}/${r.id}`);
    if (s && r.deleted && r.col === 'plays' && wipe.has('plays')) {
      // Forget my taste: the server keeps no copy of the forgotten history either (review 3, S8)
      stmts.push(env.DB.prepare('DELETE FROM records_prev WHERE account_id = ? AND col = ? AND id = ?').bind(ctx.account, r.col, r.id));
    } else if (s) {
      prevs.push([stmts.length, s.len || 0]);
      stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO records_prev (account_id, col, id, ver, iv, blob, deleted, replaced_at, by_device)
        SELECT account_id, col, id, ver, iv, blob, deleted, ?, by_device FROM records WHERE account_id = ? AND col = ? AND id = ? AND ver = ?
        AND NOT EXISTS (SELECT 1 FROM records_prev p WHERE p.account_id = ? AND p.col = ? AND p.id = ? AND p.replaced_at >= ?)`)
        .bind(t, ctx.account, r.col, r.id, r.baseVer, ctx.account, r.col, r.id, day));
    }
    upserts.push(stmts.length);
    stmts.push(env.DB.prepare(`INSERT INTO records (account_id, col, id, ver, iv, blob, deleted, seq, updated_at, by_device)
      VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT seq FROM accounts WHERE id = ?) + ?, ?, ?)
      ON CONFLICT(account_id, col, id) DO UPDATE SET ver = excluded.ver, iv = excluded.iv, blob = excluded.blob, deleted = excluded.deleted,
        seq = excluded.seq, updated_at = excluded.updated_at, by_device = excluded.by_device WHERE records.ver = ?`)
      .bind(ctx.account, r.col, r.id, r.ver, r.deleted ? '' : r.iv, r.deleted ? '' : r.blob, r.deleted ? 1 : 0, ctx.account, i + 1, t, ctx.device || null, r.baseVer));
  });
  if (ok.length) {
    stmts.push(env.DB.prepare('UPDATE accounts SET seq = seq + ?, record_count = record_count + ?, bytes = MAX(0, bytes + ?) WHERE id = ?').bind(ok.length, addN, addB, ctx.account));
    const res = await env.DB.batch(stmts);
    upserts.forEach((at, i) => { if (!res[at]?.meta?.changes) conflict.push({ col: ok[i].col, id: ok[i].id, ver: -1 }); });   // (moved since the read: re-read it)
    const pb = prevs.reduce((n, [at, len]) => n + (res[at]?.meta?.changes ? len : 0), 0);
    if (pb) await env.DB.prepare('UPDATE accounts SET prev_bytes = prev_bytes + ? WHERE id = ?').bind(pb, ctx.account).run();
  }
  const seq = await env.DB.prepare('SELECT seq FROM accounts WHERE id = ?').bind(ctx.account).first('seq');
  return { ok: true, conflict, held, seq, now: t };
}
// At the cap the oldest previous versions go first, before any write is refused (review 3)
async function makeRoom(env, account, want, CAP_BYTES) {
  const prev = (await env.DB.prepare('SELECT COALESCE(SUM(length(blob)), 0) AS b FROM records_prev WHERE account_id = ?').bind(account).first('b')) || 0;
  let over = want + prev - CAP_BYTES, freed = 0;
  if (over <= 0) { await env.DB.prepare('UPDATE accounts SET prev_bytes = ? WHERE id = ?').bind(prev, account).run(); return; }
  const { results } = await env.DB.prepare('SELECT col, id, ver, length(blob) AS len FROM records_prev WHERE account_id = ? ORDER BY replaced_at LIMIT 500').bind(account).all();
  const gone = [];
  for (const r of results) { if (over <= 0) break; gone.push(r); over -= r.len || 0; freed += r.len || 0; }
  await env.DB.batch([...gone.map((r) => env.DB.prepare('DELETE FROM records_prev WHERE account_id = ? AND col = ? AND id = ? AND ver = ?').bind(account, r.col, r.id, r.ver)),
    env.DB.prepare('UPDATE accounts SET prev_bytes = ? WHERE id = ?').bind(Math.max(0, prev - freed), account)]);
}

// The previous versions since a time, each record's earliest one (the state at the start of that day), with the
// ver it was written under: the client opens, re-encrypts and pushes them (SPEC 4.4).
export async function undo(req, env, K, body, ctx) {
  const u = new URL(req.url), since = +u.searchParams.get('since') || 0, col = u.searchParams.get('col') || null, off = Math.max(0, +u.searchParams.get('after') || 0);
  if (col && !COLS.has(col)) fail(400, 'bad_request');
  const { results } = await env.DB.prepare(`SELECT col, id, ver, iv, blob, deleted, replaced_at FROM records_prev p WHERE account_id = ? AND replaced_at >= ? AND (? IS NULL OR col = ?)
    AND replaced_at = (SELECT MIN(replaced_at) FROM records_prev q WHERE q.account_id = p.account_id AND q.col = p.col AND q.id = p.id AND q.replaced_at >= ?)
    ORDER BY col, id LIMIT 101 OFFSET ?`).bind(ctx.account, since, col, col, since, off).all();
  return { records: results.slice(0, 100).map((r) => ({ col: r.col, id: r.id, ver: r.ver, iv: r.iv, blob: r.blob, deleted: !!r.deleted, replacedAt: r.replaced_at })), more: results.length > 100, next: off + 100, now: now() };
}
