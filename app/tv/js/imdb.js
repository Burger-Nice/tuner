// The IMDb match: one answer per provider title, shared by add-on copies, catalogs and subtitles
// (design/ui-v1/copies/RANKING.md 4). Where the id comes from, in order, stopping at the first that answers:
//   1 a tt id in the provider's info; 2 the ratings file v2 (strict: key + year ± 1, rows counted per key);
//   3 the provider's TMDB id against Cinemeta's moviedb_id (TVDB too for a series); 4 Cinemeta search; 5 asking him.
// The level (Sure / Likely / Unsure) is copies.js matchLevel(). His pick is kept for good; other answers 7 days.
import { S, store, scoped, emit } from './state.js';
import { imdbRows, catalog } from './catalog.js';
import { matchLevel, recheck } from './copies.js';
import { meta, cinemetaSearch, enabled } from './addons.js';

const AKEY = () => scoped('imdb');
const answers = () => (S.acc ? store.get(AKEY(), {}) : {});
const keyOf = (t) => `${t.kind}:${t.key || t.id}`;
const titleKey = (t) => t.versions?.[0]?._ck || t.versions?.[0]?._key || window.Titles.clean(t.name || '').key;
function save(t, a) { const m = answers(); m[keyOf(t)] = { ...a, at: Date.now() }; const ks = Object.keys(m); if (ks.length > 3000) ks.sort((x, y) => m[x].at - m[y].at).slice(0, ks.length - 3000).forEach((k) => delete m[k]); store.set(AKEY(), m); }
export const savedMatch = (t) => answers()[keyOf(t)] || null;
const lengths = new Map();   // title key -> the provider copy's checked length in minutes (the subtitles check fills it)

// -> { id, level: 'sure'|'likely'|'unsure', via, meta, cands: [{ id, year }] (for the picker), why }
const pending = new Map();
export function matchTitle(t, info = {}) {
  if (t.addon) return Promise.resolve({ id: t.id, level: 'sure', via: 'add-on' });   // an add-on title is its own id
  const k = keyOf(t);
  if (!pending.has(k)) pending.set(k, run(t, info).finally(() => setTimeout(() => pending.delete(k), 0)));
  return pending.get(k);
}
async function run(t, info) {
  const kind = t.kind === 'series' ? 'series' : 'movie';
  const old = savedMatch(t);
  if (old?.picked) return { ...old, level: 'sure', meta: old.id ? await meta(kind, old.id) : null };
  if (old?.none) return { id: '', level: 'unsure', via: 'none', none: true };
  const fresh = old && Date.now() - old.at < 7 * 86400e3 && (old.level !== 'unsure' || Date.now() - old.at < 86400e3);
  const len = lengths.get(keyOf(t)) || 0;
  if (fresh && !len) return { ...old, meta: old.id ? await meta(kind, old.id) : null };
  const year = +t.year || 0;
  const tmdb = +(info.tmdb || t.versions?.find((v) => v.tmdb)?.tmdb || 0);
  let out, missed = false;   // (missed: Cinemeta gave no details for a candidate: maybe a blip, so a weaker answer isn't kept)
  // 1. the provider's own tt id
  if (info.imdb) out = { id: info.imdb, level: 'sure', via: 'provider' };
  // 2. the ratings file, rows counted per key
  const rows = out ? [] : await imdbRows(kind, titleKey(t));
  const near = year ? rows.filter((r) => Math.abs(r.year - year) <= 1) : rows;
  // 3. TMDB (and for a series TVDB) against Cinemeta, for the candidates the file has (the near ones first)
  if (!out && tmdb && rows.length) {
    for (const r of [...near, ...rows.filter((x) => !near.includes(x))].slice(0, 3)) {
      const m = await meta(kind, r.id);
      if (!m) missed = true;
      if (m?.moviedb && m.moviedb === tmdb) { out = { id: r.id, level: 'sure', via: 'tmdb', meta: m }; break; }
    }
  }
  if (!out && rows.length) {
    const one = near.length === 1 ? near[0] : null;
    const m = one ? await meta(kind, one.id) : null;
    if (one && !m) missed = true;
    const level = matchLevel({ cand: rows, year, kind, len, runtime: m?.runtime || 0 });
    out = { id: level === 'unsure' ? '' : one.id, level, via: 'ratings', meta: m, cands: near.length > 1 ? near : rows.slice(0, 6) };
  }
  // 4. Cinemeta search (accepted only with a year, or with no year on a single exact name)
  if (!out) {
    const res = await cinemetaSearch(kind, t.name);
    if (res?.length) {
      const words = (s) => window.Titles.norm(s).split(' ').filter(Boolean);
      const mine = words(t.name);
      const shared = (r) => { const w = words(r.name); return w.filter((x) => mine.includes(x)).length / Math.max(1, Math.max(w.length, mine.length)); };
      let pick = null, search = '';
      if (year) {
        pick = res.find((r) => r.year && Math.abs(r.year - year) <= 1 && shared(r) >= 0.6) || (res[0].year && Math.abs(res[0].year - year) <= 1 && shared(res[0]) > 0 ? res[0] : null);
        search = pick ? 'year' : '';
      } else {
        const exact = res.filter((r) => window.Titles.norm(r.name) === window.Titles.norm(t.name));
        if (exact.length === 1) { pick = exact[0]; search = 'exact'; }
      }
      // TMDB on the search results too
      if (tmdb) for (const r of res.slice(0, 3)) { const m = await meta(kind, r.id); if (m?.moviedb === tmdb) { out = { id: r.id, level: 'sure', via: 'tmdb', meta: m }; break; } }
      if (!out && pick) {
        const m = await meta(kind, pick.id);
        const level = matchLevel({ cand: [], year, kind, len, runtime: m?.runtime || 0, search });
        out = { id: level === 'unsure' ? '' : pick.id, level, via: 'search', meta: m, cands: res.slice(0, 6) };
      }
      if (!out) out = { id: '', level: 'unsure', via: 'search', cands: res.slice(0, 6) };
    } else out = { id: '', level: 'unsure', via: res ? 'none' : 'offline', cands: [] };
  }
  // two or more films of the name, and the copy's checked length known: exactly one within 5% and the others more than
  // 10% away is accepted without asking (subtitles SPEC v1.1 S9)
  if (kind === 'movie' && out.level === 'unsure' && len && (out.cands || []).length >= 2) {
    const ms = (await Promise.all(out.cands.slice(0, 6).map((c) => meta(kind, c.id)))).filter((m) => m?.runtime);
    const off = (m) => Math.abs(len - m.runtime) / m.runtime;
    const inside = ms.filter((m) => off(m) <= 0.05);
    if (inside.length === 1 && ms.every((m) => m === inside[0] || off(m) > 0.1)) out = { id: inside[0].id, level: 'sure', via: 'length', meta: inside[0], cands: out.cands };
  }
  // the series' own ids: TMDB or TVDB agreeing make it Sure (RANKING.md 4.3)
  if (kind === 'series' && out.id && out.level !== 'sure') {
    const m = out.meta || await meta(kind, out.id);
    if (m && ((tmdb && m.moviedb === tmdb) || (info.tvdb && m.tvdb === +info.tvdb))) out = { ...out, level: 'sure', via: tmdb && m.moviedb === tmdb ? 'tmdb' : 'tvdb', meta: m };
  }
  if (out.id && !out.meta) out.meta = await meta(kind, out.id);
  if (out.via !== 'offline' && !(missed && out.level !== 'sure')) save(t, { id: out.id, level: out.level, via: out.via });
  return out;
}
// His answer from "Which film is this?" (subtitles 4.5, shared): a pick is Sure for this title from now on; None of
// these keeps the provider's copy only (no add-on copies, no downloaded subtitles). Picking a Likely add-on copy also
// counts as his pick (SPEC 5.2).
export function pickMatch(t, id) { save(t, id ? { id, level: 'sure', via: 'picked', picked: true } : { id: '', level: 'unsure', via: 'none', none: true }); emit('imdb', keyOf(t)); }
// The subtitles check's hook: the provider copy's checked length (minutes). A Likely film becomes Sure within 8%, and is
// dropped when more than 8% off (RANKING.md 4.2). Returns 'sure' | 'drop' | 'keep'.
export async function noteLength(t, lenMin) {
  const was = lengths.get(keyOf(t));
  lengths.set(keyOf(t), lenMin);
  const a = savedMatch(t);
  // an Unsure film between several of its name: the length may decide it (run(), above)
  if (a && !a.picked && !a.none && a.level === 'unsure' && t.kind === 'movie' && !was) { emit('imdb', keyOf(t)); return 'keep'; }
  if (!a || a.picked || a.level !== 'likely' || t.kind !== 'movie' || !a.id) return 'keep';
  const m = await meta('movie', a.id);
  const v = recheck(lenMin, m?.runtime || 0);
  if (v === 'sure') save(t, { ...a, level: 'sure' });
  else if (v === 'drop') save(t, { ...a, id: '', level: 'unsure' });
  if (v !== 'keep') emit('imdb', keyOf(t));
  return v;
}

// The provider's titles by IMDb id, for catalogs and Search (the [tv] mark, "also on your provider"): from his answers
// and the ratings file's strict index (one row within ± 1 year), no network. Built once per catalog list.
const byId = { movie: null, series: null };
export async function providerByImdb(kind) {
  const c = catalog[kind];
  if (!c?.titles) return new Map();
  if (byId[kind]?.c === c) return byId[kind].m;
  const m = new Map(), ans = answers();
  for (const t of c.titles) {
    const a = ans[keyOf(t)];
    if (a?.id && a.level !== 'unsure') { m.set(a.id, t); continue; }
    const rows = await imdbRows(kind, titleKey(t));
    if (!rows.length) continue;
    const y = +t.year || 0;
    const near = y ? rows.filter((r) => Math.abs(r.year - y) <= 1) : kind === 'series' ? rows : [];
    if (near.length === 1 && !m.has(near[0].id)) m.set(near[0].id, t);
  }
  byId[kind] = { c, m };
  return m;
}
export const forgetIndex = () => { byId.movie = byId.series = null; };
// Are add-on copies worth asking for at all? (an enabled stream add-on)
export const anyStreamAddon = () => enabled().some((a) => (a.manifest.resources || []).some((r) => (typeof r === 'string' ? r : r.name) === 'stream'));
