// TMDB API v3 for Home's rows and the library's shelves (design/ui-v1/home-final/SPEC.md 6a): discover, top rated,
// anime (keyword 210024 in Japanese), Icelandic, recommendations, and a title's IMDb id. Cinemeta stays the source of
// ids, metas, episodes and search; titles play through the add-ons' copies as before.
// The key is the owner's own (TMDB's free "API Read Access Token", or the older 32-character API key). It is typed
// once (Account > Provider > TMDB key, or sent from his phone) and kept on this TV only: never in the repo, never
// logged, never in an error message. Without one, every caller falls back to Cinemeta and names its row honestly.
// TMDB's terms: free for non-commercial use with attribution (Account > About), nothing kept longer than 6 months (the
// longest kept here is 30 days), no use of its data to train or run a model (the rows are counting rules).
import { store, emit } from './state.js';

const BASE = () => store.get('tmdbBase', 'https://api.themoviedb.org/3');
const IMG = () => store.get('tmdbImg', 'https://image.tmdb.org/t/p');
export const ANIME_KW = 210024;

// ---------- the key ----------
export const tmdbKey = () => store.get('tmdbKey', '') || '';
// a key TMDB refused (401) counts as none until he sets one again
export const hasKey = () => !!tmdbKey() && !store.get('tmdbBad', false);
export function setKey(k) { store.set('tmdbKey', String(k || '').trim()); store.del('tmdbBad'); mem.clear(); emit('tmdb', 'key'); }
export function clearKey() { store.del('tmdbKey'); store.del('tmdbBad'); mem.clear(); emit('tmdb', 'key'); }
// What Account shows: never the key, only that it's set and how it ends
export const keyLabel = () => (tmdbKey() ? `Set · ends ${tmdbKey().slice(-4)}` : 'Not set');
const v3Key = (k) => /^[0-9a-f]{32}$/i.test(k);
// Only a token's or a key's own characters: a pasted line with spaces or quotes is trimmed to them
export const cleanKey = (s) => String(s || '').trim().replace(/^bearer\s+/i, '').replace(/^["']|["']$/g, '');
export const looksLikeKey = (s) => /^[A-Za-z0-9._-]{32,1024}$/.test(cleanKey(s));

// ---------- requests: 4 in the air, cached in memory and IndexedDB ----------
let inAir = 0;
const waiting = [];
const slot = () => new Promise((r) => { if (inAir < 4) { inAir++; r(); } else waiting.push(r); });
const free = () => { const n = waiting.shift(); if (n) n(); else inAir--; };
const mem = new Map();
const remember = (k, v) => { mem.delete(k); mem.set(k, v); while (mem.size > 250) mem.delete(mem.keys().next().value); };
let backoffUntil = 0;
const qs = (p) => Object.entries(p || {}).filter(([, v]) => v !== undefined && v !== null && v !== '').sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
// How TMDB has been answering on this TV (Account > Provider shows it: the owner can tell us what his TV sees)
export const status = { ok: 0, fail: 0, last: '', lastAt: 0, okAt: 0 };
const failed = (e) => { status.fail++; status.last = e.message; status.lastAt = Date.now(); return e; };
export class TmdbError extends Error { constructor(kind) { super(kind === 'nokey' ? 'No TMDB key' : kind === 'auth' ? 'TMDB refused the key' : kind === 'busy' ? 'TMDB asked us to slow down' : 'TMDB did not answer'); this.kind = kind; } }

// One GET. ttl: how long its answer is good (ms). A stale copy is used when TMDB is busy or unreachable.
async function raw(path, params, k) {
  const q = qs(v3Key(k) ? { ...params, api_key: k } : params);
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 10000);
  try {
    return await fetch(`${BASE()}${path}${q ? `?${q}` : ''}`, { signal: ctl.signal, cache: 'no-store', headers: v3Key(k) ? { Accept: 'application/json' } : { Accept: 'application/json', Authorization: `Bearer ${k}` } });
  } finally { clearTimeout(t); }
}
export async function get(path, params = {}, { ttl = 12 * 3600e3 } = {}) {
  const k = tmdbKey();
  if (!k || store.get('tmdbBad', false)) throw new TmdbError('nokey');
  const ck = `tm:${path}?${qs(params)}`;
  const hit = mem.get(ck) || await window.Core.cache.get(ck);
  if (hit && Date.now() - hit.at < ttl) { remember(ck, hit); return hit.v; }
  if (Date.now() < backoffUntil) { if (hit) return hit.v; throw new TmdbError('busy'); }
  await slot();
  try {
    let r;
    try { r = await raw(path, params, k); } catch { if (hit) return hit.v; throw failed(new TmdbError('down')); }
    if (r.status === 429) {
      backoffUntil = Date.now() + (+r.headers.get('retry-after') || 2) * 1000;
      if (hit) return hit.v;
      throw failed(new TmdbError('busy'));
    }
    if (r.status === 401) { store.set('tmdbBad', true); emit('tmdb', 'key'); throw failed(new TmdbError('auth')); }
    if (!r.ok) { if (hit) return hit.v; throw failed(new TmdbError('down')); }
    const v = await r.json();
    status.ok++; status.okAt = Date.now();
    const rec = { at: Date.now(), v };
    remember(ck, rec);
    window.Core.cache.set(ck, rec);
    keep(ck);
    return v;
  } finally { free(); }
}
// The newest 600 answers are kept on the device (and none longer than its ttl is used; 30 days at most)
function keep(k) {
  const ix = store.get('tmdbIx', []).filter((x) => x !== k); ix.push(k);
  while (ix.length > 600) window.Core.cache.set(ix.shift(), null);
  store.set('tmdbIx', ix);
}
export function forgetCache() { for (const k of store.get('tmdbIx', [])) window.Core.cache.set(k, null); store.set('tmdbIx', []); mem.clear(); }
// Is this key good? { ok, why } (Account asks before keeping it)
export async function checkKey(k) {
  k = cleanKey(k);
  if (!looksLikeKey(k)) return { ok: false, why: 'That doesn\'t look like a TMDB key' };
  try {
    const r = await raw('/authentication', {}, k);
    if (r.status === 401) return { ok: false, why: 'TMDB says this key isn\'t valid' };
    if (!r.ok) return { ok: false, why: 'TMDB didn\'t answer. Try again in a minute' };
    return { ok: true };
  } catch { return { ok: false, why: 'TMDB didn\'t answer. Is the TV online?' }; }
}

// ---------- genres: the app's names (Cinemeta's) <-> TMDB's ids ----------
const MOVIE_G = { 28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller', 10752: 'War', 37: 'Western' };
const TV_G = { 10759: ['Action', 'Adventure'], 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Family', 9648: 'Mystery', 10765: ['Sci-Fi', 'Fantasy'], 10768: 'War', 37: 'Western' };
const ID_OF = { movie: Object.fromEntries(Object.entries(MOVIE_G).map(([id, n]) => [n, +id])), series: { Action: 10759, Adventure: 10759, Animation: 16, Comedy: 35, Crime: 80, Documentary: 99, Drama: 18, Family: 10751, Mystery: 9648, 'Sci-Fi': 10765, Fantasy: 10765, War: 10768, Western: 37, Thriller: 9648 } };
export const genreId = (kind, name) => ID_OF[kind === 'series' ? 'series' : 'movie'][name] || null;
export const genreNames = (kind, ids) => [...new Set((ids || []).flatMap((id) => [].concat((kind === 'series' ? TV_G : MOVIE_G)[id] || [])))];
// A row's own exclusions (a comedy row without dramas, thrillers and war films: TMDB's Comedy holds Parasite and Pulp
// Fiction), by the app's genre names; the builder's table (SPEC 6, "a table the builder tunes")
const EXCLUDE = {
  movie: { Comedy: [18, 53, 27, 80, 9648, 10752], Horror: [35, 16], Romance: [27, 53], Action: [99], Crime: [35, 16], Thriller: [35, 16], 'Sci-Fi': [99], Drama: [99] },
  series: { Comedy: [10768, 99, 10763, 10764, 10767], Horror: [35, 16], Crime: [16, 10762], Drama: [10764, 10767, 99], 'Sci-Fi': [99] },
};
export const exclusions = (kind, name) => (EXCLUDE[kind === 'series' ? 'series' : 'movie'][name] || []);

// ---------- images ----------
export const img = (p, w) => (p ? `${IMG()}/${w === 'original' ? 'original' : `w${w}`}${p}` : '');

// ---------- results as the app's items ----------
// { kind, id ('tm:movie:123' until the IMDb id is known), tmdb, imdb, name, year, poster, background, genres, rating,
//   votes, overview, lang, src: 'tmdb' }
export function item(r, kind) {
  const k = kind === 'tv' || kind === 'series' ? 'series' : 'movie';
  const date = r.release_date || r.first_air_date || '';
  const known = imdbMem.get(`${k}:${r.id}`);
  return {
    kind: k, tmdb: r.id, imdb: known || '', id: known || `tm:${k}:${r.id}`, name: r.title || r.name || r.original_title || r.original_name || '',
    year: +String(date).slice(0, 4) || 0, poster: img(r.poster_path, 342), background: img(r.backdrop_path, 1280),
    genres: genreNames(k, r.genre_ids || (r.genres || []).map((g) => g.id)), rating: Math.round((+r.vote_average || 0) * 10) / 10, votes: +r.vote_count || 0,
    overview: r.overview || '', lang: r.original_language || '', anime: (r.genre_ids || []).includes(16) && r.original_language === 'ja' ? 'maybe' : '', src: 'tmdb',
  };
}
// /discover/{movie,tv}: one page of 20. params use TMDB's names. -> { items, total, pages }
export async function discover(kind, params, page = 1) {
  const type = kind === 'series' ? 'tv' : 'movie';
  const d = await get(`/discover/${type}`, { include_adult: false, language: 'en-US', ...params, page }, { ttl: 12 * 3600e3 });
  return { items: (d?.results || []).map((r) => item(r, kind)), total: +d?.total_results || 0, pages: +d?.total_pages || 0 };
}
// /trending/{all,movie,tv}/week: what is watched most this week (films and series, people left out)
export async function trending(kind = 'all', page = 1) {
  const type = kind === 'series' ? 'tv' : kind === 'movie' ? 'movie' : 'all';
  const d = await get(`/trending/${type}/week`, { language: 'en-US', page }, { ttl: 12 * 3600e3 });
  return (d?.results || []).filter((r) => type !== 'all' || r.media_type === 'movie' || r.media_type === 'tv').map((r) => item(r, type === 'all' ? r.media_type : kind));
}
// Streaming services (TMDB's watch providers, JustWatch's data; the US lists, the fullest): name -> TMDB provider id
export const SERVICES = [
  { key: 'netflix', name: 'Netflix', id: 8, re: /netflix/i },
  { key: 'disney', name: 'Disney+', id: 337, re: /disney/i },
  { key: 'max', name: 'Max', id: 1899, re: /\bhbo\b|\bmax\b/i },
  { key: 'apple', name: 'Apple TV+', id: 350, re: /apple/i },
  { key: 'prime', name: 'Prime Video', id: 9, re: /prime|amazon/i },
  { key: 'hulu', name: 'Hulu', id: 15, re: /hulu/i },
  { key: 'paramount', name: 'Paramount+', id: 531, re: /paramount/i },
  { key: 'peacock', name: 'Peacock', id: 386, re: /peacock/i },
  { key: 'crunchyroll', name: 'Crunchyroll', id: 283, re: /crunchyroll/i },
  { key: 'skyshowtime', name: 'SkyShowtime', id: 1773, re: /skyshowtime/i },
  { key: 'viaplay', name: 'Viaplay', id: 76, re: /viaplay/i },
];
export const serviceOf = (text) => SERVICES.find((x) => x.re.test(String(text || ''))) || null;
export async function recommendations(kind, tmdbId) {
  const type = kind === 'series' ? 'tv' : 'movie';
  const d = await get(`/${type}/${tmdbId}/recommendations`, { language: 'en-US', page: 1 }, { ttl: 24 * 3600e3 });
  return (d?.results || []).map((r) => item(r, kind));
}
// A title's details: its IMDb id, keywords (anime), runtime, logo, language. Kept 30 days.
const imdbMem = new Map();
export async function details(kind, tmdbId) {
  const type = kind === 'series' ? 'tv' : 'movie';
  const d = await get(`/${type}/${tmdbId}`, { append_to_response: 'external_ids,keywords,images', include_image_language: 'en,null', language: 'en-US' }, { ttl: 30 * 864e5 });
  if (!d) return null;
  const kws = (d.keywords?.keywords || d.keywords?.results || []).map((x) => x.id);
  const logo = (d.images?.logos || []).find((l) => l.iso_639_1 === 'en') || (d.images?.logos || [])[0];
  const out = {
    imdb: d.external_ids?.imdb_id || d.imdb_id || '', kws, lang: d.original_language || '', runtime: +d.runtime || +(d.episode_run_time || [])[0] || 0,
    logo: logo ? img(logo.file_path, 500) : '', backdrop: img(d.backdrop_path, 1280), poster: img(d.poster_path, 342), genres: genreNames(kind, (d.genres || []).map((g) => g.id)), overview: d.overview || '',
    country: (d.production_countries || []).map((c) => c.name).concat(d.origin_country || []).filter(Boolean), anime: kws.includes(ANIME_KW) && d.original_language === 'ja',
  };
  if (out.imdb) { imdbMem.set(`${kind === 'series' ? 'series' : 'movie'}:${tmdbId}`, out.imdb); rememberImdb(kind, tmdbId, out.imdb); }
  return out;
}
// tmdb -> imdb answers, kept small in localStorage so the rows' cards carry the IMDb id on the next start
const IMDB_KEY = 'tmdbImdb';
(() => { for (const [k, v] of Object.entries(store.get(IMDB_KEY, {}))) imdbMem.set(k, v); })();
let saveT = 0;
function rememberImdb(kind, id, imdb) {
  clearTimeout(saveT);
  saveT = setTimeout(() => { const o = Object.fromEntries([...imdbMem].slice(-1500)); store.set(IMDB_KEY, o); }, 1500);
}
// The IMDb id of a TMDB item (one details call, kept 30 days)
export async function imdbOf(it) {
  if (it.imdb) return it.imdb;
  const hit = imdbMem.get(`${it.kind}:${it.tmdb}`);
  if (hit) return hit;
  const d = await details(it.kind, it.tmdb).catch(() => null);
  return d?.imdb || '';
}
// The TMDB id of an IMDb title (history titles whose Cinemeta meta has no moviedb_id)
export async function findByImdb(imdb) {
  const d = await get(`/find/${imdb}`, { external_source: 'imdb_id' }, { ttl: 30 * 864e5 });
  const m = d?.movie_results?.[0], t = d?.tv_results?.[0];
  return m ? { kind: 'movie', tmdb: m.id } : t ? { kind: 'series', tmdb: t.id } : null;
}
