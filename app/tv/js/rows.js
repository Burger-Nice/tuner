// Home's browsing rows (design/ui-v1/home-final/SPEC.md 6): the play log, the taste profile, the row candidates, the
// page (Netflix's shape: candidates, then a greedy page under the TV's limits), names and reasons, the daily refresh,
// cold start, the too-few fallbacks and "Why this row?". Everything is local: nothing about what he watches leaves the
// TV (TMDB and Cinemeta are asked for lists and titles, never told what he watched).
// Where it departs from the SPEC: the profile is worked out on the main thread after the launch (it is a few
// milliseconds for 2,000 plays, so a worker would cost more than it saves); the grip in Account > Home rows is left out
// (rows are switched on and off; their order is the engine's).
import { S, store, scoped, on, emit, continueRows } from './state.js';
import { catalog } from './catalog.js';
import * as AD from './addons.js';
import * as TM from './tmdb.js';
import { savedMatch, anyStreamAddon } from './imdb.js';
import { myGame } from './games.js';
import { videoMask } from './catchup.js';
import { fromCinemeta, dkey, canon, plural, Plural, cinemeta, tmdbList, interleave, animeByMeta, firstCountry, notInterested, hiddenKey, GENRES } from './shelves.js';

const H = 3600e3, DAY = 864e5, MAX_ROWS = 20, ROW_WAIT = 6000;
// The day turns at 04:00 (the profile and the page are worked out once a day)
export const dayNo = (t = Date.now()) => Math.floor((t - new Date(t).getTimezoneOffset() * 60e3 - 4 * H) / DAY);
const hash = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
function seeded(list, seed) {
  const a = [...list]; let x = seed || 1;
  for (let i = a.length - 1; i > 0; i--) { x = Math.imul(x ^ (x >>> 15), 2246822507) ^ Math.imul(x ^ (x >>> 13), 3266489909); x >>>= 0; const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const k = (n) => (S.acc ? scoped(n) : `x:${n}`);
const shortName = (n) => String(n || '').replace(/^It's\s+/i, '').replace(/\s+in Philadelphia$/i, '').replace(/\s*[:–-]\s.*$/, '').trim();

// ---------- the play log (SPEC 6: Signals) ----------
// One record per playback longer than 3 minutes: { imdb, type, name, year, season, episode, from, to, completion, at,
// source }; one that resumes within 30 minutes extends the last. Kept in IndexedDB, the newest 2,000.
let plays = [], playsFor = null, loading = null;
const PKEY = () => `a:${S.acc.id}:plays`;
export function loadPlays() {
  if (!S.acc) return Promise.resolve([]);
  if (playsFor === S.acc.id && loading) return loading;
  playsFor = S.acc.id; plays = [];
  const acc = S.acc.id;
  loading = (async () => {
    const v = await window.Core.cache.get(PKEY());
    if (S.acc?.id !== acc) return plays;
    plays = Array.isArray(v) ? v : [];
    if (!store.get(k('playsFrom'))) { migrate(); store.set(k('playsFrom'), Date.now()); savePlays(); }
    return plays;
  })();
  return loading;
}
let saveT = 0;
function savePlays() { clearTimeout(saveT); const acc = S.acc?.id; saveT = setTimeout(() => { if (S.acc?.id === acc) window.Core.cache.set(PKEY(), plays.slice(-2000)); }, 800); }
on('session', () => { playsFor = null; loading = null; plays = []; prof = null; page = null; cur = null; });
// An item's identity in the log: its IMDb id (an add-on copy carries it; a provider copy through its match), the
// series' for an episode. Live channels and replays are not titles.
const matchOf = (kind, id) => {
  const t = kind === 'movie' ? catalog.movie?.titleById?.get(id) : catalog.series?.titles?.find((x) => String(x.id) === String(id));
  const a = t ? savedMatch(t) : savedMatch({ kind, id });
  return a?.id && a.level !== 'unsure' ? a.id : '';
};
export function idOf(it) {
  if (!it || it.kind === 'rp' || it.kind === 'live' || it._masked) return null;
  if (it.kind === 'movie' && videoMask(it)) return null;   // (a hidden game's video is no taste)
  if (it.kind === 'episode') {
    const imdb = it.imdbSeries || (/^tt\d+:/.test(it.id) ? String(it.id).split(':')[0] : '') || (it.copy ? '' : matchOf('series', it.seriesId));
    return imdb ? { imdb, type: 'series', name: it.seriesName || it._title || '', year: 0, season: +it.season || 0, episode: +it.ep || 0 } : null;
  }
  if (it.kind !== 'movie') return null;
  const imdb = /^tt\d+$/.test(it.id) ? it.id : it.copy ? '' : matchOf('movie', it.id);
  return imdb ? { imdb, type: 'movie', name: it._title || it.name || '', year: +it.year || 0, season: 0, episode: 0 } : null;
}
// The first start of this version: one record per Continue watching / History entry that has an IMDb id
function migrate() {
  const out = [];
  for (const p of Object.values(S.progress || {})) {
    const id = idOf(p.item);
    if (!id || !p.d) continue;
    out.push({ ...id, from: 0, to: p.t, completion: p.done ? 1 : Math.min(1, p.t / p.d), at: p.at || Date.now(), source: 'history' });
  }
  plays = [...out.sort((a, b) => a.at - b.at), ...plays];
}
let cur = null;   // the playback in progress: { key, id…, from, to, d, wall }
on('play-pos', ({ it, t, d }) => {
  if (!S.acc) return;
  const id = idOf(it);
  if (!id) return;
  const key = `${id.imdb}:${id.season}:${id.episode}`;
  if (cur && cur.key !== key) flush();
  if (!cur) cur = { key, ...id, from: t, to: t, d, wall: Date.now(), last: Date.now(), source: it.copy ? it.copy.source || 'add-on' : 'provider' };
  cur.to = Math.max(cur.to, t); cur.d = d || cur.d; cur.last = Date.now();
});
on('player-closed', () => flush());
on('watched-item', (it) => { const id = idOf(it); if (!id) return; loadPlays().then(() => { add({ ...id, from: 0, to: 0, completion: 1, at: Date.now(), source: 'marked' }, 0); finished(); }); });
function flush() {
  const c = cur; cur = null;
  if (!c) return;
  const completion = c.d ? Math.min(1, c.to / c.d) : 0;
  const span = Math.max(c.to - c.from, (c.last - c.wall) / 1000);
  loadPlays().then(() => {
    const done = add({ imdb: c.imdb, type: c.type, name: c.name, year: c.year, season: c.season, episode: c.episode, from: c.from, to: c.to, completion, at: Date.now(), source: c.source }, span);
    if (done && completion >= 0.9) finished();
  });
}
function add(rec, span) {
  const last = [...plays].reverse().find((p) => p.imdb === rec.imdb && p.season === rec.season && p.episode === rec.episode);
  if (last && rec.at - last.at < 30 * 60e3) { last.to = Math.max(last.to, rec.to); last.completion = Math.max(last.completion, rec.completion); last.at = rec.at; savePlays(); return true; }
  if (span < 180 && rec.completion < 0.9) return false;
  plays.push(rec);
  if (plays.length > 2200) plays = plays.slice(-2000);
  savePlays();
  return true;
}
// A finish: the profile and the page are worked out again (between visits: Home never reorders under his thumb)
function finished() { prof = null; store.set(k('finishes'), (store.get(k('finishes'), 0) || 0) + 1); emit('rows-stale'); }
export const playsNow = () => plays;
export const forTest = { add: (r) => { plays.push({ from: 0, to: 0, completion: 1, at: Date.now(), source: 'test', season: 0, episode: 0, year: 0, ...r }); savePlays(); prof = null; }, clear: () => { plays = []; savePlays(); prof = null; page = null; }, flush };

// ---------- what a title in his history is (Cinemeta's meta, TMDB's keywords for anime) ----------
async function animeOf(type, m) {
  if (!m) return false;
  if (!TM.hasKey()) return animeByMeta(m);
  try {
    let id = m.moviedb;
    if (!id) id = (await TM.findByImdb(m.imdb || m.id))?.tmdb;
    if (!id) return animeByMeta(m);
    const d = await TM.details(type, id);
    return !!d?.anime;
  } catch { return animeByMeta(m); }
}
// a title's genres as the profile counts them: Anime is its own genre (its Animation and Action weight go to Anime)
const genresFor = (m, anime) => {
  let g = [...new Set((m?.genres || []).map(canon))].filter((x) => GENRES.movie.includes(x) || GENRES.series.includes(x));
  if (anime) g = ['Anime', ...g.filter((x) => x !== 'Animation' && x !== 'Action')];
  return g.slice(0, 3);
};

// ---------- the taste profile (SPEC 6) ----------
// w = completion × 0.5^(days / 30); a series counts per episode, at most 3 a week; a title's weight is split across
// its genres so the shares add up to 100 %.
let prof = null, profBusy = null;
export async function profile() {
  if (prof && prof.day === dayNo() && prof.acc === S.acc?.id && !(prof.partial && Date.now() - prof.at > 5 * 60e3)) return prof;
  if (profBusy) return profBusy;
  profBusy = compute().finally(() => { profBusy = null; });
  return profBusy;
}
async function compute() {
  await loadPlays();
  const now = Date.now(), byTitle = new Map(), weekCount = new Map();
  for (const p of plays) {
    const days = (now - p.at) / DAY;
    const wk = `${p.imdb}:${Math.floor(p.at / (7 * DAY))}`;
    if (p.type === 'series') { const n = weekCount.get(wk) || 0; if (n >= 3) continue; weekCount.set(wk, n + 1); }
    const w = Math.max(0, Math.min(1, p.completion)) * Math.pow(0.5, days / 30);
    const t = byTitle.get(p.imdb) || { imdb: p.imdb, type: p.type, name: p.name, year: p.year, w: 0, eps: new Set(), month: 0, lastAt: 0, finishedAt: 0 };
    t.w += w;
    if (p.type === 'series') t.eps.add(`${p.season}:${p.episode}`);
    if (now - p.at < 30 * DAY) t.month += p.type === 'series' ? 1 : 1;
    t.lastAt = Math.max(t.lastAt, p.at);
    if (p.completion >= 0.9) t.finishedAt = Math.max(t.finishedAt, p.at);
    byTitle.set(p.imdb, t);
  }
  const titles = [...byTitle.values()].sort((a, b) => b.lastAt - a.lastAt).slice(0, 160);
  // their metas (kept 7 days by addons.js), a few at a time; on a slow network (a first start: nothing kept yet) the taste
  // is worked out from what came in 8 s, and again in 5 minutes when the rest is kept (the page waits for it)
  const until = Date.now() + 8000;
  let partial = false;
  const inTime = (pr) => Promise.race([pr, new Promise((_, no) => setTimeout(() => no(new Error('slow')), Math.max(0, until - Date.now())))]);
  for (let i = 0; i < titles.length; i += 6) {
    if (Date.now() >= until) { partial = true; break; }
    await Promise.all(titles.slice(i, i + 6).map(async (t) => {
      t.meta = await inTime(AD.meta(t.type, t.imdb)).catch((e) => { if (e?.message === 'slow') partial = true; return null; });
      t.anime = await inTime(animeOf(t.type, t.meta)).catch(() => false);
      t.genres = genresFor(t.meta, t.anime);
      t.name = t.meta?.name || t.name;
      t.country = firstCountry(t.meta?.country || '');
    }));
  }
  const G = {}, P = {}, type = { movie: 0, series: 0 }, heavy = {}, monthG = {};
  let W = 0, monthW = 0;
  for (const t of titles) {
    if (!t.genres?.length || !t.w) continue;
    W += t.w; type[t.type] += t.w;
    for (const g of t.genres) { G[g] = (G[g] || 0) + t.w / t.genres.length; (heavy[g] ||= []).push(t); }
    for (let i = 0; i < t.genres.length; i++) for (let j = i + 1; j < t.genres.length; j++) { const pk = [t.genres[i], t.genres[j]].sort().join('+'); P[pk] = (P[pk] || 0) + t.w; }
    if (t.month) { monthW += t.month; for (const g of t.genres) monthG[g] = (monthG[g] || 0) + t.month / t.genres.length; }
  }
  const share = Object.fromEntries(Object.entries(G).map(([g, v]) => [g, W ? v / W : 0]));
  // the cold-start chips: 10 % each, forgotten after 20 plays
  const picks = plays.length < 20 ? picked() : [];
  if (picks.length) {
    const scale = W ? 0.7 : 0;
    for (const g of Object.keys(share)) share[g] *= scale;
    for (const g of picks) share[g] = (share[g] || 0) + (W ? 0.1 : 1 / picks.length);
  }
  for (const g of Object.keys(heavy)) heavy[g].sort((a, b) => b.w - a.w);
  const finishedT = titles.filter((t) => t.finishedAt).sort((a, b) => b.finishedAt - a.finishedAt);
  prof = {
    acc: S.acc?.id, day: dayNo(), at: Date.now(), partial, W, share, pairs: P, heavy, picks, titles, monthG, monthW,
    filmShare: type.movie + type.series ? type.movie / (type.movie + type.series) : 0.5,
    finished: finishedT.length, seeds: finishedT.slice(0, 10),
    seen: new Set(titles.map((t) => t.imdb)), seenKeys: new Set(titles.map((t) => dkey({ kind: t.type, name: t.name, year: t.meta?.year || t.year }))),
    familyShare: (share.Animation || 0) + (share.Family || 0),
  };
  return prof;
}
// The genres he picked on a first evening (Pick what you like)
export const picked = () => (S.acc ? store.get(k('picks'), []) : []);
export function setPicks(list) { store.set(k('picks'), list.slice(0, 3)); prof = null; page = null; emit('rows-stale'); }
export function forgetTaste() { store.set(k('picks'), []); loadPlays().then(() => { plays = []; savePlays(); prof = null; page = null; emit('rows-stale'); }); }

// ---------- what is new in his shows (home-v2 9.3) ----------
// Followed series: the ones in his log (the last 90 days) and Continue watching. For each, the episodes after the
// furthest one he has seen that are out; new = the newest of them came out in the last 30 days.
export async function followed() {
  await loadPlays();
  const now = Date.now(), last = new Map();
  const note = (imdb, s, e, at, name) => { const x = last.get(imdb) || { imdb, s: 0, e: 0, at: 0, name }; if (s > x.s || (s === x.s && e > x.e)) { x.s = s; x.e = e; } x.at = Math.max(x.at, at); x.name = x.name || name; last.set(imdb, x); };
  for (const p of plays) if (p.type === 'series' && now - p.at < 90 * DAY && p.season > 0) note(p.imdb, p.season, p.episode, p.at, p.name);
  for (const p of Object.values(S.progress || {})) { const id = idOf(p.item); if (id?.type === 'series' && id.season > 0) note(id.imdb, id.season, id.episode, p.at, id.name); }
  const list = [...last.values()].sort((a, b) => b.at - a.at).slice(0, 10);
  const out = [];
  await Promise.all(list.map(async (x) => {
    const m = await AD.meta('series', x.imdb, { maxAge: 20 * H }).catch(() => null);
    if (!m) return;
    const eps = (m.videos || []).filter((v) => v.season > 0).sort((a, b) => a.season - b.season || a.episode - b.episode);
    const out1 = eps.filter((v) => (v.season > x.s || (v.season === x.s && v.episode > x.e)) && v.released && Date.parse(v.released) <= now);
    const newest = out1.reduce((t, v) => Math.max(t, Date.parse(v.released) || 0), 0);
    out.push({ imdb: x.imdb, name: m.name || x.name, meta: m, at: x.at, next: out1[0] || null, count: out1.length, fresh: newest && now - newest < 30 * DAY, newest });
  }));
  return out.sort((a, b) => b.at - a.at);
}

// ---------- page state: hidden rows, not interested, row stats, hints ----------
export const hiddenRows = () => (S.acc ? store.get(k('hiddenRows'), {}) : {});
export function hideRow(row) { const m = hiddenRows(); m[row.id] = { name: row.name, at: Date.now() }; store.set(k('hiddenRows'), m); emit('rows-stale'); }
export function unhideRow(id) { const m = hiddenRows(); delete m[id]; store.set(k('hiddenRows'), m); page = null; emit('rows-stale'); }
// Not interested: out of every personal and discovery row for 30 days
export function notWanted(it) { const m = notInterested(); m[it.imdb || dkey(it)] = Date.now() + 30 * DAY; m[dkey(it)] = Date.now() + 30 * DAY; store.set(hiddenKey(), m); }
const unwanted = () => { const m = notInterested(), now = Date.now(); return new Set(Object.entries(m).filter(([, t]) => t > now).map(([x]) => x)); };
const stats = () => (S.acc ? store.get(k('rowStats'), {}) : {});
export function enteredRow(id) { const s = stats(); (s[id] ||= { first: Date.now() }).entered = Date.now(); store.set(k('rowStats'), s); }
export function scrolledEnd(id) { const s = stats(); (s[id] ||= { first: Date.now() }).end = dayNo(); store.set(k('rowStats'), s); }
// Hints that go away: each one shows until that key was used on that kind of line five times (SPEC 5)
export const hintShown = (kind, keyName) => (store.get('hfHints', {})[`${kind}:${keyName}`] || 0) < 5;
export function hintUsed(kind, keyName) { const m = store.get('hfHints', {}); m[`${kind}:${keyName}`] = (m[`${kind}:${keyName}`] || 0) + 1; store.set('hfHints', m); }
export const resetHints = () => store.set('hfHints', {});
export function resetRows() { store.set(k('hiddenRows'), {}); store.set(hiddenKey(), {}); store.set(k('rowStats'), {}); store.set(k('rowsOff'), {}); page = null; emit('rows-stale'); }
// Account > Home rows: a kind of row switched off
export const rowsOff = () => (S.acc ? store.get(k('rowsOff'), {}) : {});
export function setRowOn(kind, on) { const m = rowsOff(); if (on) delete m[kind]; else m[kind] = true; store.set(k('rowsOff'), m); page = null; emit('rows-stale'); }
export const ROW_KINDS = [['yourshows', 'Your shows'], ['nba', 'Tonight in the NBA'], ['genre', 'Your genres'], ['blend', 'Blends of two of your genres'], ['because', 'Because you watched'], ['different', 'Something different'], ['popular', 'Popular films and series'], ['trending', 'Trending this week'], ['services', 'New on the streaming services'], ['new', 'New this year'], ['top', 'Top rated'], ['gems', 'Hidden gems'], ['decades', 'A decade you like'], ['short', 'Films under 100 minutes'], ['family', 'Family night'], ['anime', 'Anime'], ['iceland', 'In Icelandic'], ['addon', 'Your add-ons\' catalogs'], ['saved', 'Saved'], ['library', 'Browse your library'], ['channels', 'Channels']];

// ---------- the candidates (SPEC 6: Row candidates) ----------
const BLENDS = { 'Anime+Comedy': 'Anime comedy', 'Action+Anime': 'Action anime', 'Crime+Drama': 'Crime dramas', 'Crime+Thriller': 'Crime thrillers', 'Sci-Fi+Thriller': 'Sci-fi thrillers', 'Comedy+Romance': 'Rom-coms', 'Comedy+Horror': 'Horror comedies', 'Comedy+Drama': 'Comedy dramas', 'Documentary+Sport': 'Sports documentaries', 'Mystery+Thriller': 'Mystery thrillers', 'Action+Comedy': 'Action comedies', 'Adventure+Fantasy': 'Fantasy adventures', 'Drama+History': 'Period dramas' };
export const blendName = (a, b) => BLENDS[[a, b].sort().join('+')] || `${a} and ${b.toLowerCase()}`;
const because = (ts) => {
  const n = ts.map((t) => shortName(t.name)).filter(Boolean);
  if (!n.length) return 'Because you watch it';
  if (n.length === 1) return `Because you watch ${n[0]}`;
  if (n.length === 2) return `Because you watch ${n[0]} and ${n[1]}`;
  return `Because you watch ${n[0]}, ${n[1]} and ${n.length - 2} more`;
};
// TMDB's films and series for a row, in the proportion he watches them
async function mixed(o, share) {
  const { kindOpts, ...rest } = o;
  const [a, b] = await Promise.all(['movie', 'series'].map((kind) => tmdbList(kind, { ...rest, minVotes: typeof o.minVotes === 'object' ? o.minVotes?.[kind] : o.minVotes, ...(kindOpts?.[kind] || {}) }).catch(() => ({ items: [] }))));
  return interleave(a.items, b.items, share);
}
async function cinemetaMixed(cat, { genre, share = 0.5, pages = 1 } = {}) {
  const get = async (kind) => { let out = []; for (let i = 0; i < pages; i++) { const v = await cinemeta(kind, cat, { genre: cat === 'year' ? String(new Date().getFullYear()) : genre, skip: out.length }).catch(() => []); out = out.concat(v); if (v.length < 40) break; } return out; };
  const [a, b] = await Promise.all([get('movie'), get('series')]);
  const f = (l) => (genre && cat !== 'year' ? l.filter((it) => it.genres.map(canon).includes(genre)) : l);
  return interleave(f(a), f(b), share);
}
// The Cinemeta scoring for Because you watched without a key: shared genres 2 points each, the director 3, cast 1
// each (3 at most), the same decade 1
async function cinemetaBecause(seed, share) {
  const m = seed.meta; if (!m) return [];
  const g = (m.genres || []).map(canon)[0];
  const pool = await cinemetaMixed('top', { genre: g, share, pages: 2 });
  const dec = Math.floor((+m.year || 0) / 10);
  const score = (it) => (it.genres || []).map(canon).filter((x) => (m.genres || []).map(canon).includes(x)).length * 2
    + ((it.director || []).some((d) => (m.director || []).includes(d)) ? 3 : 0) + Math.min(3, (it.cast || []).filter((c) => (m.cast || []).includes(c)).length) + (Math.floor((it.year || 0) / 10) === dec ? 1 : 0);
  return pool.map((it) => ({ it, s: score(it) })).filter((x) => x.s >= 3).sort((a, b) => b.s - a.s).map((x) => x.it);
}
// Because you watched (TMDB): a candidate's score is how many of his last finished titles recommend it
async function recommended(seeds, share) {
  const count = new Map(), by = new Map(), items = new Map();
  await Promise.all(seeds.slice(0, 8).map(async (t) => {
    let id = t.meta?.moviedb;
    if (!id) id = (await TM.findByImdb(t.imdb).catch(() => null))?.tmdb;
    if (!id) return;
    const recs = await TM.recommendations(t.type, id).catch(() => []);
    for (const it of recs) { const key = dkey(it); count.set(key, (count.get(key) || 0) + 1); items.set(key, it); (by.get(key) || by.set(key, []).get(key)).push(t); }
  }));
  const ranked = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => items.get(key));
  // X: the seed that contributed most to the top 20
  const contrib = new Map();
  for (const it of ranked.slice(0, 20)) for (const t of by.get(dkey(it)) || []) contrib.set(t.imdb, (contrib.get(t.imdb) || 0) + 1);
  const x = seeds.find((t) => t.imdb === [...contrib.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]) || seeds[0];
  void share;
  return { items: ranked.slice(0, 30), seed: x };
}

// ---------- the add-ons' catalogs: which make a row, and under what name ----------
// Only lists made for browsing films and series make a row (an allow-list): his own Stremio lists, a streaming
// service's list, and popular / new / top / a genre. Sports, racing, live events, channels and odd add-on lists never do.
const DENY = /sport|\bf1\b|formula|racing|motor|\bnba\b|\bnfl\b|\bnhl\b|\bmlb\b|\bufc\b|\bmma\b|\bwwe\b|soccer|football|basket|boxing|tennis|golf|cricket|rugby|hockey|\blive\b|\bevents?\b|channels?\b|\biptv\b|tv guide|radio|youtube|podcast|\bxxx\b|adult|porn|18\+|hentai|torrent|\brss\b|calendar|upcoming|coming soon|trailers?|\bcams?\b|\btest\b|debug|\bother\b/i;
const PERSONAL = /watch ?list|library|\bmy\b|history|watched|favou?rites?|collection|continue|trakt|\bliked?\b|for you|\blists?\b/i;
const BROWSE = /popular|trending|\btop\b|\bnew\b|latest|recent|featured|\bbest\b|rated|imdb|release|\bhot\b|discover|classic|award|oscar|acclaim|\bgems?\b|binge|must[- ]watch|blockbuster|\bcult\b/i;
const GENERIC = /^(movies?|films?|series|shows?|tv( shows| series)?|catalog(ue)?)$/i;
const withType = (name, type) => (/film|movie|series|show|\btv\b/i.test(name) ? name : `${name} ${type === 'series' ? 'series' : 'films'}`);
const allGenres = new Set([...GENRES.movie, ...GENRES.series, 'Anime', 'Sci-Fi', 'Science Fiction']);
export function classifyCatalog(x) {
  const name = String(x.name || '').replace(/\s+/g, ' ').trim(), text = `${name} ${x.c?.id || ''}`, who = `${x.by || ''} ${x.a?.manifest?.name || ''} ${x.a?.manifest?.id || ''}`;
  if (!name || DENY.test(text) || DENY.test(who)) return null;
  if (PERSONAL.test(name)) {
    const wl = /watch ?list/i.test(name);
    return wl ? { key: 'p:watchlist', kind: 'personal', name: 'Your Stremio watchlist', reason: 'What you saved in Stremio' } : { key: 'p:stremio', kind: 'personal', name: 'From your Stremio', reason: 'Your Stremio library' };
  }
  const sv = TM.serviceOf(text) || (GENERIC.test(name) ? TM.serviceOf(who) : null);
  if (sv) return { key: `s:${sv.key}`, kind: 'service', svc: sv.key, name: `On ${sv.name}`, reason: `Films and series on ${sv.name}` };
  const genre = canon(name.replace(/\s+(films?|movies?|series|shows?)$/i, ''));
  if (BROWSE.test(name) || allGenres.has(genre)) return { key: `b:${name.toLowerCase()}:${x.c?.type}`, kind: 'browse', name: withType(name, x.c?.type), reason: x.by ? `From ${x.by}` : 'From your add-ons' };
  return null;
}
const normName = (n) => String(n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\bthe\b/g, '').replace(/[^a-z0-9]+/g, '');

// The candidate rows for this profile, in the SPEC's slots. Each: { id, kind, group: 'P'|'B'|'D'|'A' (anchor),
// type: 'poster'|'wide'|'game'|'channel'|'door'|'note', name, reason, get() -> items, see (the library shelf), drop }
function candidates(p, { key, gameDay }) {
  const share = p.filmShare, out = [];
  const off = rowsOff();
  const P = [], B = [], D = [];
  const personal = p.finished >= 3 || p.picks.length;
  const genres = Object.entries(p.share).filter(([g]) => g !== 'Animation' || !p.share.Anime).sort((a, b) => b[1] - a[1]);
  if (personal && !off.genre) {
    for (const [g, s] of genres) {
      const slots = Math.min(3, Math.max(s >= 0.12 || p.picks.includes(g) ? 1 : 0, Math.round(8 * s)));
      if (!slots) continue;
      const hv = (p.heavy[g] || []).filter((t) => t.w > 0);
      const reason = hv.length ? because(hv) : 'You picked it';
      const fam = p.familyShare >= 0.05;
      for (let i = 0; i < slots; i++) {
        const id = i === 0 ? `genre:${g}` : i === 1 ? `genre2:${g}` : `genre3:${g}`;
        const name = !key && g !== 'Anime' ? (i === 0 ? `Popular ${plural(g)}` : i === 1 ? `More ${plural(g)}` : `${Plural(g)} from the last two years`)
          : i === 0 ? (g === 'Anime' ? 'Anime' : `${g} for you`) : i === 1 ? `More ${plural(g)} for you` : `${Plural(g)} from the last two years`;
        const since = i === 2 ? `${new Date().getFullYear() - 2}-01-01` : undefined;
        P.push({ id, group: 'P', kind: 'genre', genre: g, slot: i, type: 'poster', name, reason: i === 2 ? 'Recent, in a kind you watch' : reason, see: { kind: share >= 0.5 ? 'movie' : 'series', shelf: g === 'Anime' ? 'anime' : `g:${g}` },
          get: async () => {
            if (key) return mixed({ g, minVotes: g === 'Anime' ? { movie: 150, series: 50 } : 100, minRating: 6.5, family: fam, page: i === 1 ? 2 : 1, since, kindOpts: g === 'Anime' ? { series: { sort: 'vote_average.desc' } } : undefined }, share);
            if (g === 'Anime') { const l = await cinemetaMixed('top', { genre: 'Animation', share, pages: 3 }); return l.filter(animeByMeta).map((it) => ({ ...it, anime: true })); }
            // (Cinemeta's genre list re-filtered as TMDB's would be: no animation or family titles in a grown-up genre's
            // row unless he watches them, and anime is its own row)
            const l = (await cinemetaMixed('top', { genre: g, share, pages: i + 1 })).filter((it) => fam || ['Animation', 'Family'].includes(g) || !it.genres.some((x) => x === 'Animation' || x === 'Family'));
            return (i === 1 ? l.slice(20) : i === 2 ? l.filter((it) => it.year >= new Date().getFullYear() - 2) : l).filter((it) => !it.rating || it.rating >= 6.5);
          } });
      }
    }
    // blends: two of his genres he watches together (P[a,b] ≥ 3 full plays, both ≥ 8 %)
    if (key && !off.blend) {
      const pairs = Object.entries(p.pairs).filter(([pk, w]) => { const [a, b] = pk.split('+'); return w >= 3 * 0.5 && (p.share[a] || 0) >= 0.08 && (p.share[b] || 0) >= 0.08; }).sort((a, b) => b[1] - a[1]).slice(0, 2);
      for (const [pk] of pairs) {
        const [a, b] = pk.split('+').sort((x, y) => (p.share[y] || 0) - (p.share[x] || 0));   // a: the larger
        B.push({ id: `blend:${pk}`, group: 'B', kind: 'blend', genre: a, other: b, type: 'poster', name: blendName(a, b), reason: `Two things you watch, together · ${a.toLowerCase()} + ${b.toLowerCase()}`, see: { kind: share >= 0.5 ? 'movie' : 'series', shelf: a === 'Anime' || b === 'Anime' ? 'anime' : `g:${a}` },
          fallback: { name: a === 'Anime' ? 'Anime' : `${a} for you`, reason: `Not enough ${blendName(a, b).toLowerCase()} yet`, genre: a },
          get: () => mixed({ g: a, and: b, minVotes: a === 'Anime' || b === 'Anime' ? { movie: 100, series: 50 } : 100, minRating: 6.5, family: true }, share) });
      }
    }
    if (p.seeds.length && !off.because) {
      const seed = p.seeds[0];
      let recP = null;
      const recs = () => (recP ||= recommended(p.seeds, share));
      // two more, each from one title he finished (the ones that are not the first row's X)
      for (const n of [1, 2]) {
        if (p.seeds.length <= n) break;
        P.push({ id: `because${n + 1}`, group: 'P', kind: 'because', slot: n, type: 'poster', name: `Because you watched ${shortName(p.seeds[n].name)}`, reason: 'Same kind of thing', see: null,
          get: async (row) => {
            const x = key ? (await recs().catch(() => null))?.seed : seed;
            const t = p.seeds.filter((y) => y.imdb !== x?.imdb)[n - 1];
            if (!t) return [];
            row.name = `Because you watched ${shortName(t.name)}`;
            row.reason = `Same kind of thing · ${(t.genres || []).filter((g) => g !== 'Anime').slice(0, 2).join(' · ') || 'Anime'}`;
            if (!key) return cinemetaBecause(t, share);
            const id = t.meta?.moviedb || (await TM.findByImdb(t.imdb).catch(() => null))?.tmdb;
            return id ? TM.recommendations(t.type, id).catch(() => []) : [];
          } });
      }
      P.push({ id: 'because', group: 'P', kind: 'because', type: 'poster', name: `Because you watched ${shortName(seed.name)}`, reason: `Same kind of thing · ${(seed.genres || []).filter((g) => g !== 'Anime').slice(0, 2).join(' · ') || 'Anime'}`, see: null,
        get: async (row) => {
          if (key) { const r = await recs(); if (r.seed && r.seed !== seed) { row.name = `Because you watched ${shortName(r.seed.name)}`; row.reason = `Same kind of thing · ${(r.seed.genres || []).filter((g) => g !== 'Anime').slice(0, 2).join(' · ')}`; } return r.items; }
          return cinemetaBecause(seed, share);
        } });
    }
  }
  // Something different: a kind he rarely watches (< 3 %), rated 7.5 and up (TMDB only)
  if (key && personal && !off.different) {
    const pool = seeded(['Documentary', 'History', 'Western', 'War', 'Music', 'Mystery', 'Romance', 'Fantasy', 'Adventure'], hash(dayNo()));
    const g = pool.find((x) => (p.share[x] || 0) < 0.03);
    if (g) out.push({ id: 'different', group: 'S', kind: 'different', genre: g, type: 'poster', name: 'Something different', reason: `${Plural(g)} · a kind you rarely watch, rated 7.5 and up`, see: { kind: 'movie', shelf: `g:${g}` },
      get: () => mixed({ g, minVotes: 300, minRating: 7.5, family: true }, share) });
  }
  // ---------- discovery (home-final SPEC 6: Discovery slots; widened on the owner's first-day report) ----------
  // With his TMDB key the page is mostly TMDB's lists (trending, the services, top rated, hidden gems, his decade,
  // genres, short films); the add-ons' own catalogs are curated extras (section below), never the body of the page.
  const filmsFirst = share >= 0.5, fam = p.familyShare >= 0.05, now = new Date(), today = now.toISOString().slice(0, 10);
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  const two = (kind, o) => Promise.all([1, 2].map((page) => tmdbList(kind, { ...o, page }).catch(() => ({ items: [] })))).then((r) => r.flatMap((x) => x.items));
  const d = (ord, row) => D.push({ group: 'D', type: 'poster', ord, ...row });
  const pop = (kind) => ({ id: `popular:${kind}`, kind: 'popular', name: kind === 'movie' ? 'Popular films' : 'Popular series', reason: 'Popular now', see: { kind, shelf: 'popular' }, small: kind === 'movie' ? !filmsFirst : filmsFirst, get: () => cinemeta(kind, 'top').then((l) => l) });
  if (!off.popular) { d(2, pop(filmsFirst ? 'movie' : 'series')); d(6, pop(filmsFirst ? 'series' : 'movie')); }
  if (key && !off.trending) d(1, { id: 'trending', kind: 'trending', name: 'Trending this week', reason: 'What people are watching this week', see: null,
    get: async () => (await Promise.all([1, 2].map((pg) => TM.trending('all', pg).catch(() => [])))).flat().filter((it) => fam || !(it.genres || []).includes('Family')) });
  if (!off.new) d(9, { id: 'new', kind: 'new', name: 'New this year', reason: 'Released this year', see: { kind: filmsFirst ? 'movie' : 'series', shelf: 'new' }, get: () => cinemetaMixed('year', { share }) });
  // the streaming services: the ones his add-ons have lists for first, then the big ones; each once
  const cats = [...AD.chipCatalogs('movie'), ...AD.chipCatalogs('series')].filter((x) => !AD.isCinemeta(x.a));
  if (key && !off.services) {
    const mine = [];
    for (const x of cats) { const sv = TM.serviceOf(`${x.name} ${x.c.id}`); if (sv && !mine.includes(sv)) mine.push(sv); }
    const list = [...mine, ...['netflix', 'disney', 'max', 'apple', 'prime'].map((x) => TM.SERVICES.find((y) => y.key === x)).filter((y) => !mine.includes(y))].slice(0, 3);
    list.forEach((sv, i) => d([4, 8, 13][i], { id: `service:${sv.key}`, svc: sv.key, kind: 'service', drop: i >= 2 ? 1 : 0, name: `New on ${sv.name}`, reason: `Popular on ${sv.name} from the last year`, see: null,
      get: () => mixed({ provider: sv.id, since: yearAgo, until: today, minVotes: 20, noKids: !fam }, share) }));
  }
  if (key && !off.top) {
    d(7, { id: 'top:movie', kind: 'top', name: 'Top rated films', reason: 'Rated 8.0 and up', see: { kind: 'movie', shelf: 'top' }, get: () => two('movie', { sort: 'vote_average.desc', minVotes: 1000, minRating: 8, family: true }) });
    d(10, { id: 'top:series', kind: 'top', name: 'Top rated series', reason: 'Rated 8.0 and up', see: { kind: 'series', shelf: 'top' }, get: () => two('series', { sort: 'vote_average.desc', minVotes: 300, minRating: 8, family: true, noKids: !fam }) });
    const tg = genres.find(([g]) => g !== 'Anime')?.[0];
    if (tg && personal) d(19, { id: `topg:${tg}`, kind: 'top', drop: 2, name: `Top rated ${plural(tg)}`, reason: 'Rated 7.5 and up', see: { kind: filmsFirst ? 'movie' : 'series', shelf: `g:${tg}` }, get: () => mixed({ g: tg, sort: 'vote_average.desc', minVotes: { movie: 300, series: 150 }, minRating: 7.5, family: fam }, share) });
  }
  if (key && !off.gems) d(11, { id: 'gems', kind: 'gems', name: 'Hidden gems', reason: 'Rated 7.5 and up, and not many have found them yet', see: null,
    get: () => mixed({ minRating: 7.5, minVotes: 150, maxVotes: 1500, noKids: !fam }, share) });
  // his decade (the one most of his older titles come from), else the 90s or the 2000s by the day
  if (key && !off.decades) {
    const dw = {};
    for (const t of p.titles) { const y = +t.meta?.year || +t.year || 0; if (y && y < now.getFullYear() - 8) dw[Math.floor(y / 10) * 10] = (dw[Math.floor(y / 10) * 10] || 0) + t.w; }
    const top = Object.entries(dw).sort((a, b) => b[1] - a[1])[0];
    const mineD = top && p.W && top[1] / p.W >= 0.1 ? +top[0] : 0;
    const dec = mineD || seeded([1990, 2000], hash(`d${dayNo()}`))[0];
    const lbl = dec >= 2000 ? `${dec}s` : `${String(dec).slice(2)}s`;
    d(12, { id: `decade:${dec}`, kind: 'decade', name: `From the ${lbl}`, reason: mineD ? `You watch a lot from the ${lbl} · rated 7 and up` : `The best liked of the ${lbl}`, see: null,
      get: () => mixed({ since: `${dec}-01-01`, until: `${dec + 9}-12-31`, minVotes: { movie: 1000, series: 200 }, minRating: 7, noKids: !fam }, share) });
  }
  // genres to browse when his own rows are few (a first evening, a short history): the day's pick of well-liked kinds
  if (!off.genre) {
    const mineG = new Set(P.filter((r) => r.kind === 'genre').map((r) => r.genre));
    const want = Math.max(0, 3 - mineG.size);
    seeded(['Thriller', 'Sci-Fi', 'Action', 'Comedy', 'Crime', 'Drama', 'Mystery', 'Adventure'], hash(`g${dayNo()}`)).filter((g) => !mineG.has(g)).slice(0, want).forEach((g, i) => d([3, 5, 14][i], {
      id: `dgenre:${g}`, kind: 'dgenre', genre: g, name: `Popular ${plural(g)}`, reason: `Well liked ${plural(g)}, films and series`, see: { kind: filmsFirst ? 'movie' : 'series', shelf: `g:${g}` },
      get: async () => (key ? mixed({ g, minVotes: 300, minRating: 6.8, family: fam }, share)
        : (await cinemetaMixed('top', { genre: g, share, pages: 2 })).filter((it) => fam || !it.genres.some((x) => x === 'Animation' || x === 'Family')).filter((it) => !it.rating || it.rating >= 6.5)) }));
  }
  if (key && !off.short) d(15, { id: 'short', kind: 'short', name: 'Films under 100 minutes', reason: 'Rated 7 and up · done before it gets late', see: null,
    get: () => two('movie', { runtime: [70, 100], minRating: 7, minVotes: 500, noKids: !fam }) });
  if (key && fam && !off.family) d(16, { id: 'family', kind: 'family', name: 'Family night', reason: 'Films and series for everyone on the sofa', see: { kind: 'movie', shelf: 'g:Family' },
    get: () => mixed({ g: 'Family', minVotes: 200, minRating: 6.8, family: true }, share) });
  if (!off.anime && !(personal && p.share.Anime >= 0.12) && (p.share.Anime || 0) > 0) d(17, { id: 'anime', kind: 'anime', name: 'Anime', reason: because(p.heavy.Anime || []), see: { kind: 'series', shelf: 'anime' }, get: () => (key ? mixed({ g: 'Anime', minVotes: { movie: 150, series: 50 }, kindOpts: { series: { sort: 'vote_average.desc' } } }, share) : cinemetaMixed('top', { genre: 'Animation', share, pages: 3 }).then((l) => l.filter(animeByMeta))) });
  if (!off.iceland && key) d(18, { id: 'iceland', kind: 'iceland', name: 'In Icelandic', reason: 'Icelandic films and series', see: { kind: filmsFirst ? 'movie' : 'series', shelf: 'iceland' }, get: () => mixed({ lang: 'is', minVotes: 10, family: true }, share) });
  // the add-ons' own catalogs, curated: his Stremio lists, a streaming service's list (once per service), and lists made
  // for browsing (popular, new, top, a genre); sports, live events, channels and odd lists never make a row
  if (!off.addon) {
    const groups = new Map();
    for (const x of cats) {
      const c = classifyCatalog(x);
      if (!c) continue;
      const g = groups.get(c.key) || { ...c, cats: [] };
      g.cats.push(x); groups.set(c.key, g);
    }
    [...groups.values()].sort((a, b) => (b.kind === 'personal') - (a.kind === 'personal')).forEach((g) => d(g.kind === 'personal' ? 20 : 21, {
      id: `addon:${g.key}`, kind: 'addon', akind: g.kind, svc: g.svc, personal: g.kind === 'personal', drop: g.kind === 'personal' ? 0 : 1, name: g.name, reason: g.reason,
      see: { kind: g.cats[0].c.type, shelf: g.cats[0].key },
      get: async () => {
        const lists = await Promise.all(g.cats.map((x) => AD.catalogPage(x.a, x.c, {}).then((v) => v.map((m) => fromCinemeta(m, x.c.type))).catch(() => [])));
        return lists.length > 1 ? interleave(lists[0], lists.slice(1).flat(), 0.5) : lists[0] || [];
      } }));
  }
  D.sort((a, b) => a.ord - b.ord);
  return { P, B, D, S: out, gameDay };
}

// ---------- the page (SPEC 6: Selection) ----------
// { day, at, rows: [{ id, kind, type, name, reason, items?, isNew, see, live? }] }; live rows (Your shows, the NBA,
// Saved, the doors, Channels) are drawn from what the app has at the time, not kept.
let page = null, building = null;
const PAGE = () => `a:${S.acc.id}:homePage`;
const sig = () => `${TM.hasKey() ? 'k' : 'n'}|${anyStreamAddon() ? 'a' : '-'}|${store.get(k('finishes'), 0)}|${picked().join(',')}|${Object.keys(rowsOff()).join(',')}|${AD.chipCatalogs('movie').length + AD.chipCatalogs('series').length}`;
export async function cachedPage() {
  if (page && page.acc === S.acc?.id) return page;
  const v = S.acc ? await window.Core.cache.get(PAGE()) : null;
  if (v && v.acc === S.acc?.id) page = v;
  return page;
}
export const pageNow = () => (page && page.acc === S.acc?.id ? page : null);
export const pageStale = () => { const p = pageNow(); return !p || p.preview || p.day !== dayNo() || p.sig !== sig() || (p.partial && Date.now() - p.at > 5 * 60e3); };
on('rows-stale', () => { if (page) page.sig = ''; });
export function buildPage({ force = false } = {}) {
  if (!S.acc) return Promise.resolve(null);
  if (!force && !pageStale()) return Promise.resolve(page);
  if (!building) building = build().then((pg) => { building = null; return pg; }, (e) => { building = null; throw e; });
  return building;
}
async function build() {
  const acc = S.acc.id;
  // nothing to show yet (a first start, a cleared cache): Your shows, the NBA, Saved and Channels at once, while the taste
  // and the rows' first pages come
  if (!pageNow() && anyStreamAddon()) {
    const pv = { acc, day: dayNo(), at: Date.now(), sig: '', preview: true, rows: layout({ P: [], B: [], D: [], S: [] }, [], { key: TM.hasKey(), gameDay: !!myGame(), st: stats(), hiddenR: hiddenRows() }).rows };
    page = pv; emit('rows', pv);
  }
  const p = await profile();
  const key = TM.hasKey(), gameDay = !!myGame();
  const st = stats(), today = dayNo(), firstBuild = !Object.keys(st).length;
  const out = { acc, day: today, at: Date.now(), sig: sig(), rows: [], firstBuild, gameDay };
  const unw = unwanted(), hiddenR = hiddenRows();
  if (!anyStreamAddon()) {
    out.rows = [{ id: 'yourshows', type: 'wide', live: 'yourshows', kind: 'yourshows', group: 'A' }, { id: 'nba', type: 'game', live: 'nba', kind: 'nba' }, { id: 'channels', type: 'channel', live: 'channels', kind: 'channels' }, { id: 'noaddons', type: 'note', live: 'noaddons', kind: 'note', name: 'Films and series', reason: 'Add a Stremio add-on for films and series' }];
    return finish(out);
  }
  const c = candidates(p, { key, gameDay });
  const all = [...c.P, ...c.B, ...c.D, ...c.S].filter((r) => !hiddenR[r.id]);
  // their first pages, 3 lanes at a time (TMDB answers in about 20 KB; Cinemeta's are kept 6 h by addons.js); a row that
  // hasn't answered in 6 s is left out of this page (the page is built again in 5 minutes, its answer cached by then).
  // With no page to show yet (a first start, a cleared cache), the rows that have come are drawn as they come.
  const fetchRow = async (r) => {
    try { r.items = await Promise.race([r.get(r), new Promise((_, no) => setTimeout(() => no(new Error('slow')), ROW_WAIT))]); } catch (e) { r.items = []; if (e?.message === 'slow') out.partial = true; }
    if (S.acc?.id !== acc) return;
    // a row he scrolled to the end of yesterday starts further on today
    if (st[r.id]?.end === today - 1 && r.items.length > 12) r.items = [...r.items.slice(8), ...r.items.slice(0, 8)];
    // a title without a poster never makes a row (it read as broken from the sofa); an add-on's entry without an IMDb
    // id is not a film or a series (an event, a race, a channel); his own Stremio lists keep what he has seen
    r.items = (r.items || []).filter((it) => it && it.name && it.poster && (r.kind !== 'addon' || /^tt\d+$/.test(it.imdb || it.id)) && !unw.has(it.imdb) && !unw.has(dkey(it)) && (r.personal || (!p.seen.has(it.imdb) && !p.seenKeys.has(dkey(it)))) && !videoMask({ kind: 'movie', id: it.id, name: it.name }) && !(it.year > new Date().getFullYear()));
    if (r.group === 'P' || r.group === 'B') r.items = [...seeded(r.items.slice(0, 20), hash(`${today}:${r.id}`)), ...r.items.slice(20)];
    r.done = true;
    preview();
  };
  let lastPv = 0;
  const preview = () => {
    if (pageNow() && !pageNow().preview) return;
    const n = all.filter((r) => r.done).length;
    if (n < 3 || n === all.length || Date.now() - lastPv < 1200) return;
    lastPv = Date.now();
    // (on copies: the layout renames a blend that falls back, and the real page is laid out from the rows themselves)
    const m = new Map(), cl = (r) => { if (!m.has(r)) m.set(r, { ...r, items: r.done ? r.items : [] }); return m.get(r); };
    const pc = { P: c.P.map(cl), B: c.B.map(cl), D: c.D.map(cl), S: c.S.map(cl) };
    const pv = { ...out, rows: layout(pc, all.map(cl), { key, gameDay, st, hiddenR }).rows, preview: true };
    page = pv;
    emit('rows', pv);
  };
  const queue = [...all];
  await Promise.all([0, 1, 2].map(async () => { while (queue.length && S.acc?.id === acc) await fetchRow(queue.shift()); }));
  if (S.acc?.id !== acc) return null;
  const L = layout(c, all, { key, gameDay, st, hiddenR });
  out.dropped = L.dropped;
  out.src = L.src;
  out.rows = L.rows;
  return finish(out);
}
// The page's rows from the rows' first pages (SPEC 6): priority, diversity, the order, at most MAX_ROWS.
function layout(c, all, { key, gameDay, st, hiddenR }) {
  // the personal rows in their slots: a blend takes a slot of its smaller genre (it outranks that genre's plain row);
  // a blend whose smaller genre had no row of its own goes after the larger genre's first row
  const Pc = [], blends = [...c.B];
  for (const r of c.P) {
    const bi = blends.findIndex((b) => b.other === r.genre && r.slot === 0);
    if (bi >= 0) { Pc.push(blends.splice(bi, 1)[0]); continue; }
    Pc.push(r);
  }
  for (const b of blends) { const i = Pc.findIndex((r) => r.genre === b.genre); Pc.splice(i >= 0 ? i + 1 : Pc.length, 0, b); }
  // diversity (SPEC 6.5): a title in one row only, a row overlapping a placed one by more than 30 % is skipped, a row
  // under 6 hides (a blend falls back to its larger genre's row and says so). Titles go to the personal rows first and
  // discovery takes what is left: "the earlier row" is the earlier by priority, not on screen (a departure: Popular
  // sits high on the page and would otherwise take every title his own rows want). Discovery rows are deep (30 to 50
  // titles), so they lose only their duplicates. The page is laid out from the rows that survive, so the personal and
  // discovery rows still alternate.
  const placed = new Set(), kept = new Map(), dropped = [];
  // (in priority: each genre's own row, the blends, Because you watched, the genres' further rows, Something
  // different, then discovery)
  // (the add-ons' catalogs come last: with a key TMDB's lists are the page, the add-ons' lists the extras)
  const rank = (r) => (r.kind === 'genre' && r.slot === 0 ? 0 : r.group === 'B' ? 1 : r.kind === 'because' && !r.slot ? 2 : r.group === 'P' ? 3 : r.group === 'S' ? 4 : r.kind === 'addon' && !r.personal ? 6 : 5);
  const prio = [...Pc, ...c.S, ...c.D].map((r, i) => [r, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([r]) => r);
  // the 30 % test is for a row that is a variant of one placed (a genre's second and third rows, Top rated in a genre):
  // other rows only lose their duplicates
  const variant = (r) => (r.kind === 'genre' && r.slot > 0) || r.id.startsWith('topg:');
  // every other row (but the personal genres' first rows, Because you watched and his own lists) is skipped when most of
  // its first 20 are titles already placed: an add-on's "Popular" is Cinemeta's Popular again
  const repeatable = (r) => (r.kind === 'genre' && r.slot === 0) || r.group === 'B' || r.personal || r.kind === 'because';
  const names = new Set(), svcs = new Set();
  let addonsKept = 0;
  const addonCap = key ? 2 : 4;
  const hasGenreRow = (g) => [...kept.values()].some((r) => r.kind === 'genre' && r.genre === g && r.slot === 0);
  const taken = (it) => placed.has(it.imdb || dkey(it)) || placed.has(dkey(it));
  for (const r of prio) {
    if (hiddenR[r.id]) continue;
    const top = r.items.slice(0, 20), over = top.filter(taken).length;
    if (variant(r) && top.length && over / top.length > 0.3) { dropped.push([r.id, 'overlap', over, top.length]); continue; }
    if (!repeatable(r) && top.length && over / top.length > 0.6) { dropped.push([r.id, 'overlap', over, top.length]); continue; }
    if (r.svc && svcs.has(r.svc)) { dropped.push([r.id, 'service']); continue; }
    if (names.has(normName(r.name))) { dropped.push([r.id, 'name']); continue; }
    if (r.kind === 'addon' && !r.personal && addonsKept >= addonCap) { dropped.push([r.id, 'addons']); continue; }
    // (his own Stremio lists are shown whole: they are his, not suggestions, so they neither lose nor take titles)
    let items = r.personal ? r.items : r.items.filter((it) => !taken(it));
    if (items.length < 6 && r.group === 'B' && r.fallback && !hasGenreRow(r.fallback.genre)) {
      const pool = (all.find((x) => x.id === `genre:${r.fallback.genre}`)?.items) || [];
      const fb = pool.filter((it) => !taken(it));
      if (fb.length >= 6) { items = fb; r.name = r.fallback.name; r.reason = r.fallback.reason; r.id = `${r.id}:fb`; r.kind = 'genre'; r.slot = 0; }
    }
    if (items.length < 6) { dropped.push([r.id, 'few', items.length, r.items.length]); continue; }
    items = items.slice(0, rank(r) < 5 ? 20 : 30);   // (a personal row keeps 20, so the next personal row has titles too)
    if (!r.personal) for (const it of items) { placed.add(it.imdb || dkey(it)); placed.add(dkey(it)); }
    names.add(normName(r.name)); if (r.svc) svcs.add(r.svc); if (r.kind === 'addon' && !r.personal) addonsKept++;
    kept.set(r, { ...r, items });
  }
  const keep = (l) => l.filter((r) => kept.has(r)).map((r) => kept.get(r));
  const P = keep(Pc), D = keep(c.D), Sx = keep(c.S);
  // the order: row 1 the top browsing row; personal and discovery alternate; Your shows after the personal rows; then
  // the rest of discovery with Something different; Saved, Browse your library and Channels last
  const seq = [];
  const off = rowsOff();
  const first = P.shift() || D.shift();
  if (first) seq.push(first);
  if (gameDay && !off.nba) seq.push({ id: 'nba', type: 'game', live: 'nba', kind: 'nba', group: 'A' });
  while (P.length) { if (D.length) seq.push(D.shift()); seq.push(P.shift()); }
  if (!off.yourshows) seq.push({ id: 'yourshows', type: 'wide', live: 'yourshows', kind: 'yourshows', group: 'A' });
  if (!gameDay && !off.nba) seq.push({ id: 'nba', type: 'game', live: 'nba', kind: 'nba', group: 'A' });
  const rest = [...D];
  if (Sx.length) rest.splice(Math.min(1, rest.length), 0, ...Sx);
  seq.push(...rest);
  if (!off.saved) seq.push({ id: 'saved', type: 'poster', live: 'saved', kind: 'saved', group: 'A' });
  if (!off.library) seq.push({ id: 'library', type: 'door', live: 'library', kind: 'library', group: 'A' });
  if (!off.channels) seq.push({ id: 'channels', type: 'channel', live: 'channels', kind: 'channels', group: 'A' });
  const rows = seq.filter((r) => !hiddenR[r.id]);
  // MAX_ROWS at most (20: the owner asked for more rows than the SPEC's 16), dropped in this order: the add-ons' lists
  // (not his own), a third service, Top rated in a genre, the third personal row of a genre, short films, the third
  // Because you watched, New this year, the smaller Popular, a second blend, a genre's second row
  const dropOrder = [(r) => r.kind === 'addon' && r.drop, (r) => r.kind === 'service' && r.drop, (r) => r.id.startsWith('topg:'), (r) => r.kind === 'genre' && r.slot === 2, (r) => r.id === 'short', (r) => r.kind === 'because' && r.slot === 2, (r) => r.id === 'new', (r) => r.kind === 'popular' && r.small, (r, list) => r.group === 'B' && list.filter((x) => x.group === 'B').indexOf(r) > 0, (r) => r.kind === 'genre' && r.slot === 1, (r) => r.id === 'gems' || r.kind === 'decade'];
  for (const f of dropOrder) { while (rows.length > MAX_ROWS) { const i = rows.findIndex((r) => f(r, rows)); if (i < 0) break; rows.splice(i, 1); } }
  // a row he hasn't entered in 14 days drops a slot a week and leaves after 28 days (it stays in Movies / Series)
  const now = Date.now();
  for (let i = rows.length - 1; i >= 1; i--) {
    const r = rows[i], s = st[r.id];
    if (r.live || !s) continue;
    const idle = (now - (s.entered || s.first)) / DAY;
    if (now - s.first < 14 * DAY || idle < 14) continue;
    if (idle >= 28) { rows.splice(i, 1); continue; }
    const by = Math.floor((idle - 14) / 7) + 1, j = Math.min(rows.length - 1, i + by);
    rows.splice(j, 0, rows.splice(i, 1)[0]);
  }
  // dropped: what the page left out and why (the tests and Why this row read it); src: what the rows came from (Account >
  // Provider shows it, so a TV that can't reach TMDB says so)
  const src = { rows: rows.filter((r) => !r.live).length, tmdb: rows.filter((r) => !r.live && r.items?.some((it) => it.src === 'tmdb')).length, addon: rows.filter((r) => r.kind === 'addon').length, key, tmdbErr: TM.status.fail ? TM.status.last : '' };
  return { dropped, src, rows: rows.map((r) => ({ id: r.id, kind: r.kind, type: r.type, live: r.live, name: r.name, reason: r.reason, genre: r.genre, other: r.other, see: r.see, group: r.group, items: r.items?.map(slim) })) };
}
const slim = (it) => ({ kind: it.kind, id: it.id, imdb: it.imdb, tmdb: it.tmdb, name: it.name, year: it.year, poster: it.poster, background: it.background, logo: it.logo, genres: it.genres, rating: it.rating, overview: String(it.overview || '').slice(0, 420), country: it.country, lang: it.lang, runtime: it.runtime, anime: it.anime });
function finish(out) {
  const st = stats();
  for (const r of out.rows) {
    if (!st[r.id]) st[r.id] = { first: Date.now(), tag: !out.firstBuild && r.group !== 'A' };
    r.isNew = !!st[r.id].tag && Date.now() - st[r.id].first < 7 * DAY;
  }
  store.set(k('rowStats'), st);
  page = out;
  window.Core.cache.set(PAGE(), out);
  emit('rows', out);
  return out;
}

// ---------- the Marquee's picks ----------
// A film for tonight: an unseen film whose runtime is known, ending before midnight, rated 6.5 or more, best first;
// his top genres first when he has some. Late (after 23:00) it is Something short (an unseen episode under 45 min).
export async function filmTonight() {
  const p = await profile();
  const unw = unwanted();
  const now = new Date(), midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const pool = await cinemeta('movie', 'top').catch(() => []);
  const top = Object.entries(p.share).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);
  const ok = pool.filter((it) => it.runtime && Date.now() + it.runtime * 60e3 < midnight && it.rating >= 6.5 && !p.seen.has(it.imdb) && !unw.has(it.imdb) && !videoMask({ kind: 'movie', id: it.id, name: it.name }));
  const score = (it) => (it.genres || []).map(canon).filter((g) => top.includes(g)).length * 0.6 + it.rating;
  return ok.sort((a, b) => score(b) - score(a))[0] || null;
}
// Cold start: Popular now · a pick for tonight (Cinemeta's most popular film he hasn't seen)
export async function coldPick() {
  const pool = await cinemeta('movie', 'top').catch(() => []);
  const unw = unwanted();
  return pool.find((it) => (!it.rating || it.rating >= 6.5) && !unw.has(it.imdb) && !videoMask({ kind: 'movie', id: it.id, name: it.name })) || pool[0] || null;
}
export async function hasHistory() { await loadPlays(); return plays.length > 0 || continueRows().length > 0; }

// ---------- Why this row? (SPEC 6: Telling him why) ----------
export async function whyRow(row) {
  const p = await profile();
  const g = row.genre;
  if (row.kind === 'blend' && g && row.other) {
    const both = p.titles.filter((t) => t.genres?.includes(g) && t.genres?.includes(row.other)).sort((x, y) => y.w - x.w);
    const pct = p.W ? Math.round((both.reduce((n, t) => n + t.w, 0) / p.W) * 100) : 0;
    const ts = both.slice(0, 3).map((t) => `${shortName(t.name)}${t.type === 'series' && t.eps.size > 1 ? ` (${t.eps.size} episodes)` : ''}`);
    return { title: row.name, lines: [`${pct} % of what you watch is ${g.toLowerCase()} and ${String(row.other).toLowerCase()} in the same title`, ts.join(', ')].filter(Boolean) };
  }
  if ((row.kind === 'genre' || row.kind === 'blend') && g) {
    const pct = p.monthW ? Math.round(((p.monthG[g] || 0) / p.monthW) * 100) : Math.round((p.share[g] || 0) * 100);
    const ts = (p.heavy[g] || []).slice(0, 3).map((t) => `${shortName(t.name)}${t.type === 'series' && t.eps.size > 1 ? ` (${t.eps.size} episodes)` : ''}`);
    const lead = p.picks.includes(g) && !ts.length ? `You picked ${plural(g)} on your first evening` : `${pct} % of what you watched in the last month is ${g === 'Sci-Fi' ? 'sci-fi' : g.toLowerCase()}`;
    return { title: row.name, lines: [lead, ts.join(', '), row.kind === 'blend' ? `You watch ${g.toLowerCase()} and ${String(row.other).toLowerCase()} in the same titles` : ''].filter(Boolean) };
  }
  if (row.kind === 'because') return { title: row.name, lines: ['Titles that TMDB lists as like the ones you finished last', row.reason] };
  if (row.kind === 'different') return { title: row.name, lines: [`${Plural(g)} are under 3 % of what you watch`, 'Rated 7.5 and up, so it is a safe try'] };
  return { title: row.name, lines: [row.reason || ''] };
}
export { shortName, because };
