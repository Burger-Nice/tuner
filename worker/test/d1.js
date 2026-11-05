// A D1 stand-in over node:sqlite for the tests and the local Worker (tests/mock-accounts.js): prepare / bind /
// first / all / run / batch, with D1's answer shapes. Foreign keys on, as D1 has them.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIG = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const val = (v) => { if (v === undefined) throw new Error('D1_TYPE_ERROR: undefined bound'); return typeof v === 'boolean' ? (v ? 1 : 0) : v; };
class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...a) { return new Stmt(this.db, this.sql, a.map(val)); }
  get reads() { return /^\s*select/i.test(this.sql) || /\breturning\b/i.test(this.sql); }
  async first(col) { const r = this.db.prepare(this.sql).get(...this.args); return r ? (col ? r[col] : { ...r }) : null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args).map((r) => ({ ...r })), success: true, meta: {} }; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; }
  exec() {
    if (this.reads) { const results = this.db.prepare(this.sql).all(...this.args).map((r) => ({ ...r })); return { results, success: true, meta: { changes: results.length } }; }
    const r = this.db.prepare(this.sql).run(...this.args); return { results: [], success: true, meta: { changes: Number(r.changes) } };
  }
}
export function makeD1(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
  const has = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'accounts'").get();
  if (!has) for (const f of readdirSync(MIG).filter((x) => x.endsWith('.sql')).sort()) db.exec(readFileSync(join(MIG, f), 'utf8'));
  return {
    raw: db,
    prepare: (sql) => new Stmt(db, sql),
    async batch(stmts) {
      db.exec('BEGIN');
      try { const out = stmts.map((s) => s.exec()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    async exec(sql) { db.exec(sql); return { count: 1 }; },
  };
}
// The Rate Limiting binding: a fixed 60 s window, as the real one is configured
export function makeLimiter(limit) {
  const m = new Map();
  return { async limit({ key }) { const t = Date.now(), w = m.get(key); if (!w || t - w.at > 60e3) { m.set(key, { at: t, n: 1 }); return { success: true }; } w.n++; return { success: w.n <= limit }; } };
}
