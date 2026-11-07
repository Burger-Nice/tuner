// The sync engine (design/ui-v1/accounts-v1/SPEC.md 4, with review 3's fixes): each collection is read from the
// device's own stores (§4.2a: nothing is renamed; providers map acc.id <-> pid through the account's provider record),
// compared with what was last synced, pulled and merged by its rule (rules.js), pushed with compare-and-set. Deletes the
// server holds back stay local with their plaintext until the person picks Sync them / Undo them; `wipe` names the
// collections a confirmed action may empty. Local first: nothing here ever blocks a screen.
import { S, store, emit, on } from '../state.js';
import * as acct from './acct.js';
import * as K from './crypto.js';
import * as R from './rules.js';

const Core = window.Core;
export const SHARED = ['name', 'nbaTeam', 'shield', 'langs', 'subLang', 'subMode', 'subLangs', 'subSounds', 'subOnline', 'replaysPlay', 'skipIntro', 'heroGame', 'gameNight', 'scoreBug', 'liveAlert'];
const YEAR = 365 * 864e5, MAX_REQ = 100, MAX_BYTES = 230 * 1024, BLOB_MAX = 88000;   // (the server takes a record's blob up to 90,000)
const waiting = new Map();   // records the server refused: key -> the value's hash (tried again once the value changes)
const user = () => acct.me()?.id;
const uKey = (k) => `u:${user()}:${k}`;
const stable = (v) => (v === undefined ? 'u' : JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((y) => [y, x[y]])) : x)));
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36) + s.length.toString(36); };
const hash = (v) => fnv(stable(v));
const strip = (o) => (o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined)) : o);
const accountsList = () => store.get('accounts', []);
const withPid = () => accountsList().filter((a) => a.pid);
const bucket = (k) => parseInt(fnv(k).slice(0, 4), 36) % 16;

// ---------- the collections (§4.2) ----------
// read(): Map natural -> value; write(Map natural -> value | null); merge(local, remote, ctx); keyOf(natural): the
// store key behind it (its change time stands for the local value's `at`).
function providerFields(a) { return strip({ pid: a.pid, natural: R.natural(a), type: a.type, server: a.server, username: a.username, password: a.password, url: a.url, name: a.name, tz: a.tz }); }
const ADAPTERS = {
  providers: {
    read: () => new Map(withPid().filter((a) => !(a.type === 'm3u' && !a.url)).map((a) => [`prov|${a.pid}`, providerFields(a)])),
    keyOf: () => 'accounts',
    write(ch) {
      let list = accountsList();
      for (const [n, v] of ch) {
        const pid = n.slice(5);
        if (v === null) { for (const a of list.filter((x) => x.pid === pid)) dropProvider(a); list = list.filter((x) => x.pid !== pid); continue; }
        const { pid: _p, natural, ...f } = v;
        let i = list.findIndex((x) => x.pid === pid);
        if (i < 0) {
          // the same login on this device under another id: the lower pid wins on every device, so they converge
          const j = list.findIndex((x) => R.natural(x) === natural);
          if (j >= 0) { if (!list[j].pid || pid < list[j].pid) { list[j] = { ...list[j], ...f, pid }; } continue; }
          list.push({ id: Math.random().toString(36).slice(2, 10), ...f, pid, fromAccount: true });
        } else list[i] = { ...list[i], ...f, pid };
      }
      store.set('accounts', list); S.accounts = list;
      emit('acct-providers');
    },
  },
  keys: {
    read() { const m = new Map(), t = store.get('tmdbKey', ''), s = store.get(uKey('stremio'), null); if (t) m.set('key|tmdb', { key: t }); if (s) m.set('key|stremio', s); return m; },
    keyOf: (n) => (n === 'key|tmdb' ? 'tmdbKey' : uKey('stremio')),
    write(ch) {
      for (const [n, v] of ch) {
        if (n === 'key|tmdb') { if (v?.key) store.set('tmdbKey', v.key); else store.del('tmdbKey'); store.del('tmdbBad'); emit('tmdb', 'key'); }
        if (n === 'key|stremio') { if (v) store.set(uKey('stremio'), v); else store.del(uKey('stremio')); }
      }
    },
  },
  addons: {
    read() {
      const list = store.get(uKey('addons'), []), m = new Map();
      for (const a of list) { if (!a?.url) continue; let v = strip({ ...a, health: undefined }); if (JSON.stringify(v).length > 60000) v = { ...v, manifest: undefined }; m.set(`addon|${a.url}`, v); }
      if (list.length) m.set('addons-order', { keys: list.map((a) => a.url) });
      return m;
    },
    keyOf: () => uKey('addons'),
    merge: (l, r, c) => (c.n === 'addons-order' ? R.order(l, r, c.localAt, c.remoteAt) : R.lww(l, r, c.localAt, c.remoteAt)),
    write(ch) {
      let list = store.get(uKey('addons'), []);
      for (const [n, v] of ch) {
        if (n === 'addons-order') continue;
        const url = n.slice(6), i = list.findIndex((a) => a.url === url);
        if (v === null) { if (i >= 0) list.splice(i, 1); } else if (i >= 0) list[i] = { ...list[i], ...v, manifest: v.manifest || list[i].manifest }; else list.push(v);
      }
      const ord = ch.get('addons-order');
      if (ord?.keys) list.sort((a, b) => { const x = ord.keys.indexOf(a.url), y = ord.keys.indexOf(b.url); return (x < 0 ? 1e9 : x) - (y < 0 ? 1e9 : y); });
      store.set(uKey('addons'), list);
    },
  },
  favs: {
    read() {
      const m = new Map();
      for (const a of withPid()) {
        const f = store.get(`a:${a.id}:favs`, {});
        for (const [k, v] of Object.entries(f)) m.set(`fav|${a.pid}|${k}`, v);
        const o = store.get(`a:${a.id}:favOrder`, []);
        if (o.length) m.set(`favorder|${a.pid}`, { keys: o });
      }
      return m;
    },
    keyOf: (n) => { const a = withPid().find((x) => x.pid === n.split('|')[1]); return a ? `a:${a.id}:${n.startsWith('favorder') ? 'favOrder' : 'favs'}` : ''; },
    merge: (l, r, c) => (c.n.startsWith('favorder') ? R.order(l, r, c.localAt, c.remoteAt) : R.lww(l, r, c.localAt, c.remoteAt)),
    write(ch) {
      const by = new Map();
      for (const [n, v] of ch) { const [kind, pid, ...rest] = n.split('|'); if (!by.has(pid)) by.set(pid, []); by.get(pid).push([kind, rest.join('|'), v]); }
      for (const [pid, list] of by) {
        const a = withPid().find((x) => x.pid === pid); if (!a) continue;
        const favs = store.get(`a:${a.id}:favs`, {}); let order = store.get(`a:${a.id}:favOrder`, []);
        for (const [kind, k, v] of list) {
          if (kind === 'favorder') { if (v?.keys) order = [...v.keys]; continue; }
          if (v === null) delete favs[k]; else favs[k] = v;
        }
        order = order.filter((k) => favs[k]); for (const k of Object.keys(favs)) if (!order.includes(k)) order.push(k);
        store.set(`a:${a.id}:favs`, favs); store.set(`a:${a.id}:favOrder`, order);
        if (S.acc?.id === a.id) { S.favs = favs; S.favOrder = order; emit('favs'); }
      }
    },
  },
  progress: {
    read() {
      const m = new Map(), cut = Date.now() - YEAR;   // (pruned at a year, SPEC 4.2)
      for (const a of withPid()) for (const [k, v] of Object.entries(store.get(`a:${a.id}:progress`, {}))) if ((v?.at || 0) > cut) m.set(`prog|${a.pid}|${k}`, v);
      return m;
    },
    keyOf: (n) => { const a = withPid().find((x) => x.pid === n.split('|')[1]); return a ? `a:${a.id}:progress` : ''; },
    merge: (l, r) => (r === null ? l : R.newest(l, r)),
    write(ch) {
      const by = new Map();
      for (const [n, v] of ch) { const [, pid, ...rest] = n.split('|'); if (!by.has(pid)) by.set(pid, []); by.get(pid).push([rest.join('|'), v]); }
      for (const [pid, list] of by) {
        const a = withPid().find((x) => x.pid === pid); if (!a) continue;
        const p = store.get(`a:${a.id}:progress`, {});
        for (const [k, v] of list) { if (v === null) delete p[k]; else p[k] = v; }
        store.set(`a:${a.id}:progress`, p);
        if (S.acc?.id === a.id) { S.progress = p; emit('progress'); }
      }
    },
  },
  plays: {
    // Union by playId across parts; a part missing here is never a delete (the device keeps only its newest 2,000:
    // review 3), so only Forget my taste's explicit wipe tombstones parts.
    implicitDelete: false,
    async read() {
      const local = R.withIds((await Core.cache.get(uKey('plays'))) || []);
      const known = Object.values(st.recs).filter((r) => r.col === 'plays' && !r.deleted && r.v?.plays).map((r) => r.v.plays);
      const all = R.plays([local, ...known], forgetUpTo());
      return new Map(Object.entries(R.partsOf(all)).map(([k, ps]) => [`plays|${k}`, { plays: ps }]));
    },
    keyOf: () => uKey('plays'),
    merge: (l, r) => (r === null ? l : { plays: R.plays([l?.plays, r.plays], forgetUpTo()) }),
    async write(ch) {
      const local = R.withIds((await Core.cache.get(uKey('plays'))) || []);
      const merged = R.plays([local, ...[...ch.values()].filter(Boolean).map((v) => v.plays)], forgetUpTo());
      await Core.cache.set(uKey('plays'), merged.slice(-2000));
    },
  },
  rows: {
    read() {
      const m = new Map();
      for (const k of ['picks', 'hiddenRows', 'rowsOff', 'notInterested', 'forget']) { const v = store.get(uKey(k), null); if (v != null) m.set(`rows|${k}`, v); }
      return m;
    },
    keyOf: (n) => uKey(n.slice(5)),
    merge: (l, r, c) => (c.n === 'rows|notInterested' ? R.notInterested(l, r) : c.n === 'rows|forget' ? R.forget(l, r, acct.now()) : R.lww(l, r, c.localAt, c.remoteAt)),
    async write(ch) {
      for (const [n, v] of ch) { const k = n.slice(5); if (v === null) store.del(uKey(k)); else store.set(uKey(k), k === 'forget' ? { upTo: R.clamp(v.upTo, acct.now()) } : v); }
      if (ch.has('rows|forget')) await ADAPTERS.plays.write(new Map());   // (drops what the new upTo forgets)
    },
  },
  titles: {
    // The IMDb notes in 16 parts (up to 3,000 notes would pass 64 KB in one); the learnt intro skips in one
    read() {
      const m = new Map(), notes = store.get(uKey('imdb'), {});
      for (const [k, v] of Object.entries(notes)) { const n = `titles|imdb|${bucket(k)}`; if (!m.has(n)) m.set(n, {}); m.get(n)[k] = v; }
      const sk = store.get(uKey('skipShows'), null); if (sk && Object.keys(sk).length) m.set('titles|skipShows', sk);
      return m;
    },
    keyOf: (n) => uKey(n.includes('imdb') ? 'imdb' : 'skipShows'),
    merge: (l, r) => (r === null ? l : R.perKey(l, r)),
    write(ch) {
      for (const [n, v] of ch) {
        if (n === 'titles|skipShows') { if (v) store.set(uKey('skipShows'), v); else store.del(uKey('skipShows')); continue; }
        const b = +n.split('|')[2], notes = store.get(uKey('imdb'), {});
        for (const k of Object.keys(notes)) if (bucket(k) === b && !(v && k in v)) delete notes[k];
        Object.assign(notes, v || {});
        store.set(uKey('imdb'), notes);
      }
    },
  },
  shield: {
    read() { const v = store.get('nbaSeen', null); return new Map(v ? [['shield|nbaSeen', { since: v.since || 0, upTo: R.clamp(v.upTo, acct.now()), ids: v.ids || [] }]] : []); },
    keyOf: () => 'nbaSeen',
    merge: (l, r) => (r === null ? l : R.shield(l, r, acct.now())),
    write(ch) { const v = ch.get('shield|nbaSeen'); if (v) store.set('nbaSeen', R.shield(v, null, acct.now())); },
  },
  settings: {
    read() {
      const s = Core.settings(), at = store.get('settingsAt', {}), v = {};
      for (const k of SHARED) if (s[k] !== undefined && (store.get('settings', {})[k] !== undefined)) v[k] = [s[k], at[k] || 0];
      return new Map(Object.keys(v).length ? [['settings|shared', v]] : []);
    },
    keyOf: () => 'settings',
    merge: (l, r) => (r === null ? l : R.perKey(l, r)),
    write(ch) {
      const v = ch.get('settings|shared'); if (!v) return;
      const raw = store.get('settings', {}), at = store.get('settingsAt', {});
      for (const [k, [val, t]] of Object.entries(v)) if (SHARED.includes(k) && (t || 0) >= (at[k] || 0)) { raw[k] = val; at[k] = t || 0; }
      store.set('settings', raw); store.set('settingsAt', at);
      const m = acct.me(); if (m && raw.name && raw.name !== m.name) store.set('acct', { ...m, name: raw.name });
    },
  },
  snapshots: { implicitDelete: false, read: () => new Map(), keyOf: () => '', write() {} },
};
export const COLS = Object.keys(ADAPTERS);
const forgetUpTo = () => R.clamp(store.get(uKey('forget'), null)?.upTo || 0, acct.now());
function dropProvider(a) {
  for (const k of ['favs', 'favOrder', 'progress', 'recents', 'liveCat', 'lastLive', 'movieView', 'seriesView', 'delays', 'teamCh', 'ver']) store.del(`a:${a.id}:${k}`);
  store.del('info:' + a.id); store.del('m3u:' + a.id);
  if (S.acc?.id === a.id) emit('acct-provider-gone', a);
}

// ---------- the state: what was last synced (IndexedDB, per account) ----------
let st = { cursor: 0, recs: {}, held: {}, wipe: {} }, stFor = null, saveT = 0;
const SKEY = () => `acct:${user()}:state`;
async function loadState() {
  if (stFor === user()) return st;
  const v = await Core.cache.get(SKEY());
  st = { cursor: 0, recs: {}, held: {}, wipe: {}, ...(v || {}) };
  stFor = user();
  return st;
}
function saveState() { clearTimeout(saveT); const u = user(); saveT = setTimeout(() => { if (u && u === user()) Core.cache.set(SKEY(), st); }, 500); }
const ids = new Map();
const idOf = async (n) => { if (!ids.has(n)) ids.set(n, await K.recordId(acct.keys(), n)); return ids.get(n); };
// When each synced store key last changed here (kept apart from the state: it changes every few seconds in playback)
let chg = null, chgFor = null;
const CKEY = () => `tuner.acctChanged.${user()}`;
const changed = () => { if (chgFor !== user()) { try { chg = JSON.parse(localStorage.getItem(CKEY()) || '{}'); } catch { chg = {}; } chgFor = user(); } return chg; };
const localAt = (a, n) => changed()[a.keyOf(n)] || 0;

// ---------- status for the screens ----------
let status = { state: 'idle', lastSync: 0, error: null, held: 0 };
export const syncStatus = () => ({ ...status, lastSync: st.lastSync || status.lastSync, held: Object.keys(st.held || {}).length, waiting: waiting.size });
// The Account line for a sync that stopped: what happened in plain words, with the short reason in brackets (so a
// report from the owner says which one it was)
export function problemText(y) {
  const e = y?.error || '';
  const w = e === 'slow_down' ? 'airglow\'s server asked to slow down' : e === 'quota' || e === 'too_many_records' ? 'Your airglow account is full'
    : e === 'server' || e === 'not_ready' ? 'airglow\'s server didn\'t answer' : e === 'unauthorized' || e === 'scope' ? 'airglow couldn\'t sign this device in to sync'
      : 'Syncing stopped on this device';
  return `${w} · trying again in 2 min${y?.detail ? ` (${y.detail})` : ''}`;
}
function setStatus(p) { status = { ...status, ...p }; emit('acct-sync', syncStatus()); }

// ---------- pull ----------
async function pull({ apply = true } = {}) {
  const u = user(), keys = acct.keys();
  let more = true, reset = null;
  while (more) {
    const r = await acct.authed('GET', `/v1/sync?since=${st.cursor}&limit=200`);
    if (r.reset) { reset = new Set(); st.cursor = 0; continue; }
    const by = new Map();
    for (const rec of r.records) { if (!ADAPTERS[rec.col]) continue; if (!by.has(rec.col)) by.set(rec.col, []); by.get(rec.col).push(rec); }
    for (const [col, list] of by) {
      const a = ADAPTERS[col], local = apply ? await a.read() : new Map(), ch = new Map();
      for (const rec of list) {
        const key = `${col}/${rec.id}`, old = st.recs[key];
        reset?.add(key);
        if (old && rec.ver < old.ver) continue;   // a replayed older version is refused (SPEC 4.3)
        let plain = null;
        if (!rec.deleted) { try { plain = await K.decryptRecord(keys, u, rec); } catch { console.warn('airglow sync: a record failed to open', col); continue; } }
        const n = plain?.n || old?.n;
        if (!n) { st.recs[key] = { col, ver: rec.ver, deleted: true }; continue; }
        const rv = plain ? plain.v : null, lv = local.get(n);
        const dirty = old ? hash(lv) !== old.h : lv !== undefined;
        const kept = !dirty ? rv : (a.merge || ((l, x, c) => R.lww(l, x, c.localAt, c.remoteAt)))(lv, rv, { n, localAt: localAt(a, n) || Date.now(), remoteAt: plain?.at || 0 });
        if (apply && hash(kept) !== hash(lv)) { ch.set(n, kept === undefined ? null : kept); local.set(n, kept); }
        st.recs[key] = { col, n, ver: rec.ver, h: hash(rv), v: col === 'snapshots' ? undefined : rv, at: plain?.at || 0, deleted: !!rec.deleted };
      }
      if (ch.size) await quiet(() => a.write(ch));
    }
    st.cursor = r.seq; more = r.more;
  }
  if (reset) {
    // A cursor older than the tombstone horizon: the records the server no longer has go, unless changed here
    for (const [key, rec] of Object.entries(st.recs)) if (!reset.has(key)) delete st.recs[key];
  }
  saveState();
}
let applying = false;
async function quiet(f) { applying = true; try { await f(); } finally { applying = false; } emit('acct-data'); }

// ---------- push ----------
async function push() {
  const u = user(), keys = acct.keys(), out = [], wipeOut = [];
  for (const [col, a] of Object.entries(ADAPTERS)) {
    if (col === 'snapshots') continue;
    const local = await a.read(), seen = new Set();
    for (const [n, v] of local) {
      const id = await idOf(n), key = `${col}/${id}`, rec = st.recs[key];
      seen.add(key);
      if (st.held[key]) continue;
      if (rec && !rec.deleted && rec.h === hash(v)) continue;
      out.push({ col, id, n, v, baseVer: rec?.ver || 0 });
    }
    // st.wipe[col]: 'all' tombstones every record of it (Forget my taste); true sends this round's deletes in it with
    // `wipe` naming it (Remove provider, Clear Continue watching). Other collections' deletes stay guarded.
    const mode = st.wipe[col];
    if (mode === 'all') { for (const [key, rec] of Object.entries(st.recs)) if (rec.col === col && !rec.deleted) wipeOut.push({ col, id: key.slice(col.length + 1), n: rec.n, v: null, baseVer: rec.ver }); continue; }
    if (a.implicitDelete === false) continue;
    for (const [key, rec] of Object.entries(st.recs)) if (rec.col === col && !rec.deleted && !seen.has(key) && !st.held[key]) (mode ? wipeOut : out).push({ col, id: key.slice(col.length + 1), n: rec.n, v: null, baseVer: rec.ver });
  }
  for (const [key, h] of Object.entries(st.held)) if (h.release) wipeOut.push({ col: h.col, id: key.slice(h.col.length + 1), n: h.n, v: null, baseVer: h.ver });
  let conflict = false;
  // One record the server refuses (too big, or anything else it calls a bad request) never stops the rest: the batch is
  // sent again one record at a time and that record waits here (kept in memory by its value, so it isn't tried on every
  // round). An add-on too big for one record goes without its manifest (each device reads the manifest itself).
  const seal = async (o, ver, v) => ({ col: o.col, id: o.id, baseVer: o.baseVer, ver, ...(await K.encryptRecord(keys, u, o.col, o.id, ver, { n: o.n, at: R.clamp(Date.now(), acct.now()), v })) });
  const refused = (e) => e?.status === 400 || e?.status === 413;
  const apply = (r, batch) => {
    const bad = new Set(r.conflict.map((c) => `${c.col}/${c.id}`)), held = new Set(r.held.map((c) => `${c.col}/${c.id}`));
    if (bad.size) conflict = true;
    for (const [o, b] of batch) {
      const key = `${o.col}/${o.id}`;
      if (bad.has(key)) continue;
      if (held.has(key)) { const rec = st.recs[key]; st.held[key] = { col: o.col, n: o.n, v: rec?.v, ver: rec?.ver || o.baseVer }; continue; }
      if (st.held[key]) delete st.held[key];
      st.recs[key] = { col: o.col, n: o.n, ver: b.ver, h: hash(o.v === null ? null : o.v), v: o.v === null ? null : o.v, at: Date.now(), deleted: o.v === null };
    }
    if (r.seq === st.cursor + batch.length - bad.size - held.size) st.cursor = r.seq;   // (nobody else wrote in between)
    saveState();
  };
  const wait = (o) => { waiting.set(`${o.col}/${o.id}`, hash(o.v)); };
  const send = async (list, wipe) => {
    let i = 0;
    while (i < list.length) {
      const batch = [];
      let bytes = 0;
      while (i < list.length && batch.length < MAX_REQ) {
        const o = list[i], ver = o.baseVer + 1;
        if (o.v !== null && waiting.get(`${o.col}/${o.id}`) === hash(o.v)) { i++; continue; }
        let body = o.v === null ? { col: o.col, id: o.id, baseVer: o.baseVer, ver, deleted: true } : await seal(o, ver, o.v);
        if (body.blob && body.blob.length > BLOB_MAX && o.col === 'addons' && o.v?.manifest) body = await seal(o, ver, { ...o.v, manifest: undefined });
        if (body.blob && body.blob.length > BLOB_MAX) { wait(o); i++; continue; }
        const size = JSON.stringify(body).length;
        if (batch.length && bytes + size > MAX_BYTES) break;
        batch.push([o, body]); bytes += size; i++;
      }
      if (!batch.length) continue;
      try { apply(await acct.authed('POST', '/v1/sync', { records: batch.map(([, b]) => b), ...(wipe ? { wipe } : {}) }), batch); }
      catch (e) {
        if (!refused(e)) throw e;
        if (batch.length === 1) { wait(batch[0][0]); console.warn('airglow sync: a record was refused', batch[0][0].col, e.code); continue; }
        for (const one of batch) {
          try { apply(await acct.authed('POST', '/v1/sync', { records: [one[1]], ...(wipe ? { wipe } : {}) }), [one]); }
          catch (e2) { if (!refused(e2)) throw e2; wait(one[0]); console.warn('airglow sync: a record was refused', one[0].col, e2.code); }
        }
      }
    }
  };
  await send(out, null);
  const wipeCols = [...new Set(wipeOut.map((o) => o.col))];
  if (wipeOut.length) await send(wipeOut, wipeCols);
  st.wipe = {}; saveState();
  return conflict;
}

// ---------- running it ----------
let busy = null, timer = 0, paused = false, again = false;
export function syncNow() {
  if (busy) { again = true; return busy; }
  busy = run().finally(() => { busy = null; if (again) { again = false; schedule(1000); } });
  return busy;
}
let busyCheck = () => false;
export const setBusy = (f) => { busyCheck = f; };   // (the TV: nothing syncs while a stream plays, SPEC 4.5)
async function run() {
  if (!acct.me() || !(await acct.hasKeys())) return;
  if (busyCheck()) { schedule(60e3); return; }
  await loadState();
  setStatus({ state: 'syncing' });
  try {
    for (let round = 0; round < 3; round++) { await pull(); if (!(await push())) break; }
    st.lastSync = Date.now(); saveState();
    setStatus({ state: 'idle', error: null, detail: '', lastSync: st.lastSync });
  } catch (e) {
    console.warn('airglow sync failed', e?.code || e?.message || e);
    setStatus({ state: e.code === 'offline' ? 'offline' : 'error', error: e.code || 'app', detail: e.code ? (e.status ? `${e.code} ${e.status}` : e.code) : String(e?.message || e).slice(0, 80) });
    if (e.code !== 'revoked') schedule(2 * 60e3);
  }
}
export function schedule(ms = 5000) { clearTimeout(timer); if (!acct.me() || paused) return; timer = setTimeout(syncNow, ms); }
export function pause(on) { paused = !!on; if (!on) schedule(3000); }
// The idle poll: one read of the account's sequence; a pull only when it moved (SPEC 4.5)
async function poll() {
  if (!acct.me() || paused || busy) return;
  try { await loadState(); const r = await acct.authed('GET', '/v1/sync/seq'); if (r.seq !== st.cursor) syncNow(); } catch { /* offline: next time */ }
}
let started = false;
export function start() {
  if (started) return; started = true;
  setInterval(poll, 15 * 60e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(1500); });
  schedule(2500);
}

// A synced key changed on this device: note when (the merge's local time), sync 5 s later
const SYNCED = /^(accounts|tmdbKey|nbaSeen|settings|u:[^:]+:(addons|stremio|picks|hiddenRows|rowsOff|notInterested|forget|imdb|skipShows|plays)|a:[^:]+:(favs|favOrder|progress))$/;
Core.store.onChange = Core.cache.onChange = (k) => {
  if (applying || !acct.me() || !SYNCED.test(k)) return;
  changed()[k] = Date.now(); try { localStorage.setItem(CKEY(), JSON.stringify(chg)); } catch { /* full */ }
  schedule(5000);
};
acct.beforeSignOut(async () => { await loadState(); await pull(); await push(); });

// ---------- held deletes (SPEC 4.4, review 3 S3) ----------
export async function syncHeld() { await loadState(); for (const h of Object.values(st.held)) h.release = true; saveState(); return syncNow(); }
export async function undoHeld() {
  await loadState();
  const by = new Map();
  for (const h of Object.values(st.held)) { if (!h.v && h.v !== 0) continue; if (!by.has(h.col)) by.set(h.col, new Map()); by.get(h.col).set(h.n, h.v); }
  for (const [col, ch] of by) await quiet(() => ADAPTERS[col].write(ch));
  st.held = {}; saveState(); setStatus({});
}

// ---------- confirmed actions that empty a collection (`wipe` names it, review 3 S4) ----------
export async function wipeCollection(col, all = false) { if (!acct.me()) return; await loadState(); st.wipe[col] = all ? 'all' : true; saveState(); schedule(1500); }
// Forget my taste: forget = now (clamped) on every device, the plays parts tombstoned, the server's copies dropped
export async function forgetTaste() {
  if (!acct.me()) return;
  store.set(uKey('forget'), { upTo: R.clamp(Date.now(), acct.now()) });
  await Core.cache.set(uKey('plays'), []);
  await wipeCollection('plays', true);
}

// ---------- Undo changes since… (the client re-encrypts, SPEC 4.4) ----------
export async function undoSince(t) {
  await loadState();
  const u = user(), keys = acct.keys();
  let after = 0, more = true, n = 0;
  const by = new Map();
  while (more) {
    const r = await acct.authed('GET', `/v1/undo?since=${t}&after=${after}`);
    for (const rec of r.records) {
      if (!ADAPTERS[rec.col] || rec.col === 'snapshots') continue;
      let plain = null;
      if (!rec.deleted) { try { plain = await K.decryptRecord(keys, u, rec); } catch { continue; } }
      const nat = plain?.n || st.recs[`${rec.col}/${rec.id}`]?.n; if (!nat) continue;
      if (!by.has(rec.col)) by.set(rec.col, new Map());
      by.get(rec.col).set(nat, plain ? plain.v : null); n++;
    }
    more = r.more; after = r.next;
  }
  await pull();
  for (const [col, ch] of by) await ADAPTERS[col].write(ch);   // (not quiet: these are this device's changes, pushed as new versions)
  emit('acct-data');
  await syncNow();
  return n;
}

// ---------- snapshots (SPEC 2.6): the device's local state before the merge question, in 24,000-character parts ----------
export async function uploadSnapshot(data) {
  await loadState();
  const u = user(), keys = acct.keys(), dev = acct.me().deviceId, day = new Date().toISOString().slice(0, 10);
  const text = JSON.stringify(data), parts = [];
  // (each part is stringified again inside its record, which escapes every quote, then sealed and written in base64:
  // 24,000 characters stay under the server's 90,000 per record even when most are escaped; one part per request)
  for (let i = 0; i * 24000 < text.length; i++) parts.push(text.slice(i * 24000, (i + 1) * 24000));
  for (let i = 0; i < parts.length; i += 1) {
    const batch = [];
    for (let j = i; j < Math.min(parts.length, i + 1); j++) {
      const n = `snap|${dev}|${day}|${j + 1}|${parts.length}`, id = await idOf(n), ver = (st.recs[`snapshots/${id}`]?.ver || 0) + 1;
      batch.push({ col: 'snapshots', id, baseVer: ver - 1, ver, ...(await K.encryptRecord(keys, u, 'snapshots', id, ver, { n, at: Date.now(), v: { name: acct.deviceInfo().name, day, part: j + 1, of: parts.length, text: parts[j] } })) });
    }
    await acct.authed('POST', '/v1/sync', { records: batch });
  }
}
export async function snapshots() {
  await loadState();
  const out = new Map(), cut = Date.now() - 30 * 864e5;
  for (const [key, r] of Object.entries(st.recs)) {
    if (r.col !== 'snapshots' || r.deleted || !r.n) continue;
    const [, dev, day, part, of] = r.n.split('|'), k = `${dev}|${day}`;
    if (Date.parse(day) < cut) continue;
    if (!out.has(k)) out.set(k, { dev, day, of: +of, ids: [] });
    out.get(k).ids[+part - 1] = key.slice(10);
  }
  return [...out.values()].filter((s) => s.ids.filter(Boolean).length === s.of).sort((a, b) => (a.day < b.day ? 1 : -1));
}
export async function readSnapshot(s) {
  const r = await acct.authed('POST', '/v1/sync/get', { ids: s.ids.map((id) => ({ col: 'snapshots', id })) });
  const parts = [];
  for (const rec of r.records) { const p = await K.decryptRecord(acct.keys(), user(), rec); parts[p.v.part - 1] = p.v.text; }
  return { name: (await K.decryptRecord(acct.keys(), user(), r.records[0])).v.name, data: JSON.parse(parts.join('')) };
}

// ---------- signing out: the synced stores leave this device (SPEC 2.5) ----------
acct.onWipe(async (m) => {
  if (!m) return;
  clearTimeout(timer);
  const pre = `tuner.u:${m.id}:`;
  try { for (const k of Object.keys(localStorage)) if (k.startsWith(pre)) localStorage.removeItem(k); } catch { /* none */ }
  await Core.cache.set(`u:${m.id}:plays`, null); await Core.cache.set(`u:${m.id}:homePage`, null); await Core.cache.set(`acct:${m.id}:state`, null);
  if (stFor === m.id && Object.values(st.recs).some((r) => r.n === 'key|tmdb' && !r.deleted)) { store.del('tmdbKey'); store.del('tmdbBad'); }
  const list = accountsList(), kept = [];
  for (const a of list) { if (a.fromAccount) dropProvider(a); else { const { pid, ...x } = a; kept.push(x); } }
  store.set('accounts', kept); S.accounts = kept;
  if (S.acc && !kept.some((a) => a.id === S.acc.id)) { store.del('active'); emit('acct-provider-gone', S.acc); }
  st = { cursor: 0, recs: {}, held: {}, wipe: {} }; stFor = null; ids.clear();
  try { localStorage.removeItem(`tuner.acctChanged.${m.id}`); } catch { /* none */ } chgFor = null;
  emit('acct-data');
});
on('acct', () => { ids.clear(); });
