// Films and series from the add-ons and TMDB (design/ui-v1/home-final/SPEC.md 6a, 7): one item shape for Home's rows
// and the Movies / Series library, the sources (Cinemeta's catalogs, TMDB's lists, the other add-ons' catalogs), the
// shelves and their paging, and opening a title (its IMDb id first, then the title page and the add-ons' copies).
// The provider is live TV only here: its films and series are never listed. A title the provider also has opens the
// provider's page, where its copy is ranked with the add-ons' (the quiet fallback of SPEC 0.8).
import { S, store, scoped, favList } from './state.js';
import { catalog, ensure } from './catalog.js';
import * as AD from './addons.js';
import * as TM from './tmdb.js';
import { providerByImdb } from './imdb.js';
import { openDetail } from './actions.js';
import { toast } from './ui.js';

// ---------- the item ----------
// { kind: 'movie'|'series', id (the IMDb id, or 'tm:<kind>:<n>' until it is known), imdb, tmdb, name, year, poster,
//   background, logo, genres, rating, overview, country, lang, runtime (min), director, cast, anime, src }
const firstCountry = (c) => String(Array.isArray(c) ? c[0] || '' : c || '').split(',')[0].trim();
export function fromCinemeta(m, kind) {
  return {
    kind: m.type === 'series' || kind === 'series' ? 'series' : 'movie', id: m.id, imdb: String(m.id).startsWith('tt') ? m.id : '', tmdb: +m.moviedb || 0,
    name: m.name, year: +m.year || 0, poster: m.poster || '', background: m.background || '', logo: m.logo || '', genres: m.genres || [],
    rating: parseFloat(m.imdbRating) || 0, overview: m.description || '', country: m.country || '', lang: '', runtime: +m.runtime || 0,
    director: m.director || [], cast: m.cast || [], anime: false, src: 'cinemeta',
  };
}
// The same title from two sources (a TMDB id and an IMDb id): its name, year and kind
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
export const dkey = (it) => `${it.kind}|${norm(it.name)}|${it.year || ''}`;
export const sameTitle = (a, b) => (a.imdb && b.imdb ? a.imdb === b.imdb : dkey(a) === dkey(b));
// The detail page's title for an item (an add-on title: Cinemeta's details, the add-ons' copies)
export const asTitle = (it, imdb = it.imdb) => ({
  kind: it.kind, key: imdb, id: imdb, name: it.name, poster: it.poster, year: it.year ? String(it.year) : '', versions: [], _qs: new Set(), _langs: new Set(),
  _genres: it.genres || [], _ir: it.rating || 0, addon: { type: it.kind },
});
// Anime (SPEC 0.7): TMDB's keyword 210024 in Japanese; without TMDB, Animation with Japan as the first country, minus
// the films that only look it (a Western studio's co-production filed under Japan)
const NOT_ANIME = new Set(['the boy and the heron'].map(norm));
export const animeByMeta = (m) => (m?.genres || []).includes('Animation') && firstCountry(m.country) === 'Japan' && !NOT_ANIME.has(norm(m.name));
export { firstCountry };

// ---------- genres ----------
export const GENRES = {
  movie: ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'],
  series: ['Action', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'Mystery', 'Sci-Fi', 'War', 'Western'],
};
// Cinemeta's other names for the same genres
const ALIAS = { 'Science Fiction': 'Sci-Fi', 'Sci-fi': 'Sci-Fi', 'Action & Adventure': 'Action', 'Sci-Fi & Fantasy': 'Sci-Fi', 'War & Politics': 'War', Musical: 'Music', Kids: 'Family' };
export const canon = (g) => ALIAS[g] || g;
export const plural = (g) => ({ Action: 'action films', Adventure: 'adventures', Animation: 'animation', Comedy: 'comedies', Crime: 'crime films', Documentary: 'documentaries', Drama: 'dramas', Family: 'family films', Fantasy: 'fantasy', History: 'history', Horror: 'horror', Music: 'music films', Mystery: 'mysteries', Romance: 'romances', 'Sci-Fi': 'sci-fi', Thriller: 'thrillers', War: 'war films', Western: 'westerns', Anime: 'anime' }[g] || String(g).toLowerCase());
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const Plural = (g) => cap(plural(g));

// art at its slot's size: metahub's small poster for a 124 px poster, TMDB's w342
export const posterSmall = (u) => String(u || '').replace(/\/poster\/(medium|large)\//, '/poster/small/').replace(/(image\.tmdb\.org\/t\/p\/)(w\d+|original)\//, '$1w342/');

// ---------- sources ----------
// Cinemeta: top (a genre or none) and year (its genre is a year), paged by what came so far (it sends 49 or 50)
export async function cinemeta(kind, cat, { genre, skip = 0 } = {}) {
  const v = await AD.cinemetaPage(kind, cat, { genre, skip });
  return v.map((m) => fromCinemeta(m, kind));
}
// TMDB's discover with a row's rules: a votes floor, the family exclusion for a grown-up genre (unless he watches
// enough animation and family films), the row's own exclusions. g: the app's genre name or 'Anime'; and: a second
// genre (a blend). -> { items, total, pages }
export async function tmdbList(kind, { g, and, sort = 'popularity.desc', minVotes, minRating, lang, page = 1, family = false, since, until } = {}) {
  const p = { sort_by: sort };
  const ids = [], without = new Set();
  const anime = g === 'Anime' || and === 'Anime';
  for (const x of [g, and].filter((y) => y && y !== 'Anime')) {
    const id = TM.genreId(kind, x);
    if (!id) return { items: [], total: 0, pages: 0 };   // (TV has no Horror, Thriller has no TV genre of its own)
    ids.push(id);
    TM.exclusions(kind, x).forEach((e) => without.add(e));
  }
  if (anime) { p.with_keywords = TM.ANIME_KW; p.with_original_language = 'ja'; ids.push(16); }
  if (ids.length) p.with_genres = [...new Set(ids)].join(',');
  if (!anime && !family && g && !['Animation', 'Family'].includes(g) && and !== 'Animation' && and !== 'Family') { without.add(16); without.add(10751); }
  for (const id of ids) without.delete(id);
  if (without.size) p.without_genres = [...without].join(',');
  if (lang) p.with_original_language = lang;
  if (minVotes) p['vote_count.gte'] = minVotes;
  if (minRating) p['vote_average.gte'] = minRating;
  if (since) p[kind === 'series' ? 'first_air_date.gte' : 'primary_release_date.gte'] = since;
  if (until) p[kind === 'series' ? 'first_air_date.lte' : 'primary_release_date.lte'] = until;
  if (lang === 'is') p.language = 'is-IS';
  const r = await TM.discover(kind, p, page);
  // every genre row re-filters by the title's own genres (a catalog page is a candidate list, not the row: SPEC 6.5)
  const need = [g, and].filter((y) => y && y !== 'Anime');
  r.items = r.items.filter((it) => need.every((x) => it.genres.includes(x) || (kind === 'series' && x === 'Thriller' && it.genres.includes('Mystery'))));
  if (anime) r.items.forEach((it) => (it.anime = true));
  if (lang === 'is') r.items.forEach((it) => (it.lang = 'is'));
  return r;
}
// Films and series in one list, in the proportion he watches them (share: films' share, 0..1)
export function interleave(films, series, share = 0.5) {
  const out = [], a = [...films], b = [...series];
  let fa = 0;
  while (a.length || b.length) {
    const film = !b.length || (a.length > 0 && fa < share * (out.length + 1));
    out.push(film ? a.shift() : b.shift());
    if (film) fa++;
  }
  return out;
}

// ---------- the library's shelves (SPEC 7) ----------
// { key, kind, label, src, genre?, addon?, cat? }. src: 'popular' | 'new' | 'top' | 'genre' | 'anime' | 'iceland' |
// 'addon' | 'saved' | 'history'
export function shelves(kind) {
  const key = TM.hasKey();
  const out = [
    { key: 'popular', kind, label: 'Popular', src: 'popular' },
    { key: 'new', kind, label: 'New', src: 'new' },
    ...(key ? [{ key: 'top', kind, label: 'Top rated', src: 'top' }] : []),
    { key: 'anime', kind, label: 'Anime', src: 'anime' },
    ...(key ? [{ key: 'iceland', kind, label: 'Á íslensku', src: 'iceland' }] : []),
  ];
  for (const x of AD.chipCatalogs(kind)) if (!AD.isCinemeta(x.a)) out.push({ key: x.key, kind, label: x.name, by: x.by, src: 'addon', a: x.a, c: x.c });
  out.push({ key: 'saved', kind, label: 'Saved', src: 'saved' }, { key: 'history', kind, label: 'History', src: 'history' });
  return out;
}
export const genreShelf = (kind, g) => ({ key: `g:${g}`, kind, label: g, src: 'genre', genre: g });
// A shelf read page by page: TMDB 20 at a time (page), Cinemeta 50 (skip). Titles are listed once.
export class Pager {
  constructor(shelf, { onlyKey = false } = {}) {
    this.shelf = shelf; this.items = []; this.seen = new Set(); this.page = 0; this.got = 0; this.end = false; this.total = 0; this.busy = null; this.failed = false;
    this.tm = TM.hasKey() && ['top', 'genre', 'anime', 'iceland'].includes(shelf.src);
    if (onlyKey && !this.tm) this.end = true;
  }
  // "#313 of 3,214" (TMDB's count), "3,000+" (Cinemeta has no total: SPEC 7), or what's loaded at the end
  totalLabel() {
    if (this.end) return this.items.length.toLocaleString();
    if (this.tm && this.total) return this.total.toLocaleString();
    return this.got >= 3000 ? '3,000+' : `${this.items.length.toLocaleString()}+`;
  }
  more() {
    if (this.end) return Promise.resolve([]);
    if (!this.busy) this.busy = this.read().then((fresh) => { this.busy = null; this.failed = false; return fresh; }, (e) => { this.busy = null; this.failed = true; throw e; });
    return this.busy;
  }
  add(list) {
    const fresh = [];
    for (const it of list) {
      const k = it.imdb || dkey(it);
      if (this.seen.has(k) || this.seen.has(dkey(it))) continue;
      this.seen.add(k); this.seen.add(dkey(it));
      this.items.push(it); fresh.push(it);
    }
    return fresh;
  }
  async read() {
    const { shelf } = this, kind = shelf.kind;
    if (shelf.src === 'saved' || shelf.src === 'history') {
      this.end = true;
      return this.add(shelf.src === 'saved' ? savedItems(kind) : historyItems(kind));
    }
    if (shelf.src === 'addon') {
      const v = await AD.catalogPage(shelf.a, shelf.c, { genre: shelf.genre, skip: this.got });
      this.got += v.length;
      const fresh = this.add(v.map((m) => fromCinemeta(m, kind)));
      if (!v.length || !fresh.length || !AD.pageable(shelf.c)) this.end = true;
      return fresh;
    }
    if (this.tm) {
      this.page++;
      const o = shelf.src === 'top' ? { sort: 'vote_average.desc', minVotes: kind === 'series' ? 150 : 300 }
        : shelf.src === 'genre' ? { g: shelf.genre, minVotes: 100 }
        : shelf.src === 'anime' ? { g: 'Anime', and: shelf.genre, minVotes: kind === 'series' ? 50 : 150, sort: kind === 'series' ? 'vote_average.desc' : 'popularity.desc' }
        : { lang: 'is', minVotes: 10 };
      if (shelf.src === 'top' && shelf.genre) o.g = shelf.genre;
      // a genre's (or anime's) own order: Top rated under its votes floor, New newest first (out already)
      if (shelf.tmOrder === 'top') Object.assign(o, { sort: 'vote_average.desc', minVotes: kind === 'series' ? 150 : 300 });
      if (shelf.tmOrder === 'new') Object.assign(o, { sort: kind === 'series' ? 'first_air_date.desc' : 'primary_release_date.desc', minVotes: 30, until: new Date().toISOString().slice(0, 10) });
      const r = await tmdbList(kind, { ...o, page: this.page });
      this.total = r.total;
      const fresh = this.add(r.items);
      if (this.page >= Math.min(r.pages, 500) || !r.items.length) this.end = true;
      return fresh;
    }
    // Cinemeta: Popular (top), New (top sorted by year when a genre is set: year takes a year as its genre), a genre
    // re-filtered by the titles' own genres, anime from Animation with Japan first
    const genre = shelf.src === 'genre' ? shelf.genre : shelf.src === 'anime' ? 'Animation' : undefined;
    let v;
    if (shelf.src === 'new' && !shelf.genre) v = await cinemeta(kind, 'year', { genre: String(new Date().getFullYear()), skip: this.got });
    else v = await cinemeta(kind, 'top', { genre: genre || shelf.genre, skip: this.got });
    this.got += v.length;
    let list = v;
    if (genre) list = list.filter((it) => it.genres.map(canon).includes(genre));
    if (shelf.src === 'anime') list = list.filter((it) => animeByMeta(it)).map((it) => ({ ...it, anime: true }));
    if (shelf.genre && shelf.src === 'new') list = list.sort((a, b) => b.year - a.year);
    const fresh = this.add(list);
    if (!v.length || this.got > 10000) this.end = true;
    return fresh;
  }
}
// Saved add-on titles (Saved > Movies / Series keeps the title objects) and what he watched (History)
export function savedItems(kind) {
  return favList(kind).filter((f) => f.addon || String(f.id).startsWith('tt')).map((f) => ({ kind, id: f.id, imdb: f.id, tmdb: 0, name: f.name, year: +f.year || 0, poster: f.poster || '', background: '', logo: '', genres: f._genres || [], rating: f._ir || 0, overview: '', country: '', lang: '', runtime: 0, director: [], cast: [], anime: false, src: 'saved' }));
}
export function historyItems(kind) {
  const seen = new Set(), out = [];
  for (const p of Object.values(S.progress || {}).sort((a, b) => b.at - a.at)) {
    const it = p.item;
    if (!it || it.kind === 'rp') continue;
    const imdb = it.kind === 'episode' ? it.imdbSeries || '' : String(it.id).startsWith('tt') ? it.id : '';
    const k = it.kind === 'episode' ? 'series' : 'movie';
    if (!imdb || k !== kind || seen.has(imdb)) continue;
    seen.add(imdb);
    out.push({ kind, id: imdb, imdb, tmdb: 0, name: it.kind === 'episode' ? it.seriesName || it._title : it._title || it.name, year: +it.year || 0, poster: it.poster || '', background: '', logo: '', genres: [], rating: 0, overview: '', country: '', lang: '', runtime: 0, director: [], cast: [], anime: false, src: 'history' });
  }
  return out;
}

// ---------- opening a title ----------
// The IMDb id (a TMDB item asks TMDB once), then the provider's page when it has the title, else the add-on title's.
export async function imdbOfItem(it) {
  if (it.imdb) return it.imdb;
  if (String(it.id).startsWith('tt')) return it.id;
  if (it.tmdb && TM.hasKey()) { const id = await TM.imdbOf(it).catch(() => ''); if (id) { it.imdb = id; return id; } }
  // (no key any more, or TMDB doesn't know it: Cinemeta's search by name and year)
  const hits = await AD.cinemetaSearch(it.kind, it.name).catch(() => null);
  const h = (hits || []).find((x) => norm(x.name) === norm(it.name) && (!it.year || !x.year || Math.abs(x.year - it.year) <= 1));
  if (h) it.imdb = h.id;
  return it.imdb || '';
}
export async function titleOf(it) {
  const imdb = await imdbOfItem(it);
  if (!imdb) return null;
  const prov = catalog[it.kind] ? (await providerByImdb(it.kind)).get(imdb) : null;
  return prov || asTitle(it, imdb);
}
export async function openItem(it) {
  let slow = setTimeout(() => toast(`Opening ${it.name}…`, 1500), 600);
  const t = await titleOf(it).catch(() => null);
  clearTimeout(slow);
  if (!t) { toast(`airglow couldn't find ${it.name}'s details right now`, 3500); return null; }
  openDetail(t);
  return t;
}
// The provider's films and series are read only for its copies of what the add-ons list (the quiet fallback): once,
// in the background, never before the first screen is up
export function warmProvider(kind) { if (S.acc && !catalog[kind]) ensure(kind).catch(() => {}); }
export const hiddenKey = () => scoped('notInterested');
export const notInterested = () => (S.acc ? store.get(hiddenKey(), {}) : {});
