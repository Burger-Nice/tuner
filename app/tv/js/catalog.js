// Channels, movies and series: loaded from the copy saved on the device (so the app opens instantly), checked with the
// provider in the background, tagged (language, quality, subtitles, genres), rated from IMDb, and for movies and series
// merged so every title is one card with its language and quality versions behind it.
import { S, store, settings, scoped, emit } from './state.js';
import { breathe, sleep } from './util.js';

const { Titles } = window;
export const catalog = { live: null, movie: null, series: null };
const pending = {}, fresh = {};
let refreshQ = Promise.resolve();
export let lastKey = Date.now();
document.addEventListener('keydown', () => (lastKey = Date.now()), true);
// Set by the player module: true while the native player is on screen.
export const busy = { watching: () => false, showing: () => false, gameOn: () => false };

export function resetCatalogs() { for (const k in catalog) { catalog[k] = null; delete fresh[k]; delete pending[k]; } }

const cacheable = () => S.acc && (S.acc.type === 'xtream' || !!S.acc.url);
// The saved copy keeps what prepare() and the ratings worked out, so the next start skips that work (bump PREP when
// prepare() changes what it computes).
// One version per kind, so changing how one kind is prepared doesn't redo the others (3 is what every kind has had
// since separator channel names were cleaned up).
const PREP = { live: 3, movie: 3, series: 3 };
const KEEP = new Set(['_s', '_sep', '_lang', '_q', '_hdr', '_sub', '_genres', '_hot', '_title', '_key', '_ck', '_cy', '_ir', '_iv', '_pop', '_top']);
// Saved in parts of 5,000 with a breath between, read the same way: one record of 60,000 films froze the remote for
// seconds each time it was written or read. (kind is the same on every item and is put back on reading.)
const PART = 5000;
const leanItem = (x) => { const o = {}; for (const k in x) if (k !== 'kind' && (k[0] !== '_' || KEEP.has(k))) o[k] = x[k]; return o; };
const saving = {};
function save(kind, c) {
  if (!cacheable()) return;
  const key = cacheKey(kind), my = S.epoch;
  const run = async () => {
    const n = Math.ceil(c.items.length / PART);
    for (let i = 0; i < n; i++) {
      if (my !== S.epoch) return;
      await window.Core.cache.set(`${key}:p${i}`, c.items.slice(i * PART, (i + 1) * PART).map(leanItem));
      await breathe();
    }
    // the head last: a list is only read back once every part of it is there
    await window.Core.cache.set(key, { at: c.at || Date.now(), pv: c.pv, rated: !!c._rated, cats: c.cats, kind, parts: n, count: c.items.length });
  };
  saving[kind] = (saving[kind] || Promise.resolve()).then(run, run);
}
async function readSaved(kind) {
  const key = cacheKey(kind);
  const head = await window.Core.cache.get(key);
  if (!head) return null;
  if (head.items) return head;   // saved before lists were split into parts
  const items = [];
  for (let i = 0; i < head.parts; i++) {
    const part = await window.Core.cache.get(`${key}:p${i}`);
    if (!part) return null;
    for (const x of part) { x.kind = head.kind; items.push(x); }
    await breathe();
  }
  return items.length === head.count ? { ...head, items } : null;
}
function cacheKey(kind) {
  const a = S.acc;
  const who = `${a.type}|${a.server || ''}|${a.username || ''}|${a.password || ''}|${a.url || ''}`;
  let h = 2166136261;
  for (let i = 0; i < who.length; i++) h = Math.imul(h ^ who.charCodeAt(i), 16777619);
  return `${a.id}:${(h >>> 0).toString(36)}:${kind}`;
}
export const cacheAt = (kind) => catalog[kind]?._at || 0;
// Refresh: forget the saved lists so the next open asks the provider.
export async function forget() { if (S.acc) for (const k of ['live', 'movie', 'series']) await window.Core.cache.set(cacheKey(k), null); resetCatalogs(); }

export function ensure(kind) {
  if (catalog[kind]) return Promise.resolve(catalog[kind]);
  if (!pending[kind]) {
    const my = S.epoch;
    const load = async () => {
      if (cacheable()) {
        const hit = await readSaved(kind);
        if (my !== S.epoch) throw new Error('stale');
        if (hit?.items?.length) {
          // Channels are checked for changes every couple of hours, films and series every six.
          if (Date.now() - hit.at > (kind === 'live' ? 2 : 6) * 3600e3) refreshLater(kind, my);
          hit._cached = true;
          hit._rated = !!hit.rated && hit.pv === PREP[kind];
          return hit;
        }
      }
      const c = await S.src[kind]();
      if (my !== S.epoch) throw new Error('stale');
      c.at = Date.now();
      return c;
    };
    pending[kind] = load()
      .then((c) => prepare(kind, c))
      .then((c) => {
        if (my !== S.epoch) throw new Error('stale');
        catalog[kind] = c;
        // Ratings (and the save) after the screen has something to show; a copy saved rated needs neither.
        if (kind === 'live') { if (!c._cached || c._unprepared) save(kind, c); }
        else if (!c._rated) rateLib(kind, c).then(async (rated) => {
          if (rated && catalog[kind] === c) { await mergeLib(kind, c); emit('catalog', kind); }
          if (my === S.epoch && (rated || !c._cached || c._unprepared)) save(kind, c);
        });
        else if (c._unprepared) save(kind, c);
        emit('catalog', kind);
        return c;
      })
      .finally(() => delete pending[kind]);
  }
  return pending[kind];
}

// A refresh is a big download and seconds of work: done while you're watching in the TV player (nothing of this app is on
// screen then) or after a minute without a key, and never in the first 3 minutes after the app starts.
const started = Date.now();
const settled = async () => { while (Date.now() - started < 180000 || busy.gameOn() || !(busy.watching() || Date.now() - lastKey > 60000)) await sleep(3000); };
function refreshLater(kind, my) {
  refreshQ = refreshQ.then(async () => {
    await sleep(5000);
    await settled();
    if (my !== S.epoch) return;
    try {
      const c = await S.src[kind]();
      if (my !== S.epoch) return;
      c.at = Date.now();
      await prepare(kind, c);
      if (kind !== 'live' && await rateLib(kind, c)) await mergeLib(kind, c);
      await settled();
      if (my !== S.epoch) return;
      save(kind, c);
      // Swap it in now unless that section is on screen (then on its next open), so two copies aren't kept.
      if (busy.showing(kind)) fresh[kind] = c;
      else { catalog[kind] = c; emit('catalog', kind); }
    } catch {}
  });
}
// A section takes the newer list the next time it's opened, never under the viewer's thumb.
export function takeFresh(kind) {
  const c = fresh[kind];
  if (!c) return false;
  delete fresh[kind];
  catalog[kind] = c;
  emit('catalog', kind);
  return true;
}

// ---------- names, languages, quality ----------
const LANG_CODES = {
  EN: 'English', ENG: 'English', US: 'English', USA: 'English', UK: 'English', GB: 'English', AU: 'English',
  FR: 'French', FRA: 'French', FRE: 'French', VF: 'French', DE: 'German', GER: 'German', DEU: 'German',
  ES: 'Spanish', ESP: 'Spanish', SPA: 'Spanish', LAT: 'Spanish', IT: 'Italian', ITA: 'Italian',
  PT: 'Portuguese', POR: 'Portuguese', BR: 'Portuguese', NL: 'Dutch', DUT: 'Dutch', NED: 'Dutch',
  TR: 'Turkish', TUR: 'Turkish', AR: 'Arabic', ARA: 'Arabic', ARAB: 'Arabic', PL: 'Polish', POL: 'Polish',
  RU: 'Russian', RUS: 'Russian', HI: 'Hindi', HIN: 'Hindi', IN: 'Hindi', SE: 'Swedish', SV: 'Swedish', SWE: 'Swedish',
  NO: 'Norwegian', NOR: 'Norwegian', DK: 'Danish', DA: 'Danish', DAN: 'Danish', FI: 'Finnish', FIN: 'Finnish',
  IS: 'Icelandic', ISL: 'Icelandic', ICE: 'Icelandic', GR: 'Greek', GRE: 'Greek', RO: 'Romanian', ROM: 'Romanian',
  HU: 'Hungarian', HUN: 'Hungarian', CZ: 'Czech', CZE: 'Czech', AL: 'Albanian', ALB: 'Albanian',
  EXYU: 'Balkan', YU: 'Balkan', HR: 'Balkan', RS: 'Balkan', KR: 'Korean', KOR: 'Korean', JP: 'Japanese', JPN: 'Japanese',
  CN: 'Chinese', CHI: 'Chinese', FA: 'Persian', IR: 'Persian', KU: 'Kurdish', KUR: 'Kurdish', UR: 'Urdu', PK: 'Urdu',
  TA: 'Tamil', TAM: 'Tamil', TE: 'Telugu', PH: 'Filipino', TH: 'Thai', VN: 'Vietnamese', HE: 'Hebrew', IL: 'Hebrew',
  BG: 'Bulgarian', UA: 'Ukrainian', UKR: 'Ukrainian',
};
export const LANG_SHORT = Object.fromEntries(Object.entries({ English: 'EN', French: 'FR', German: 'DE', Spanish: 'ES', Italian: 'IT', Portuguese: 'PT', Dutch: 'NL', Turkish: 'TR', Arabic: 'AR', Polish: 'PL', Russian: 'RU', Hindi: 'HI', Swedish: 'SV', Norwegian: 'NO', Danish: 'DA', Finnish: 'FI', Icelandic: 'IS', Greek: 'EL', Romanian: 'RO', Hungarian: 'HU', Czech: 'CS', Albanian: 'SQ', Balkan: 'YU', Korean: 'KO', Japanese: 'JA', Chinese: 'ZH', Persian: 'FA', Kurdish: 'KU', Urdu: 'UR', Tamil: 'TA', Telugu: 'TE', Filipino: 'TL', Thai: 'TH', Vietnamese: 'VI', Hebrew: 'HE', Bulgarian: 'BG', Ukrainian: 'UK' }));
const LANG_WORDS = [
  [/\b(english)\b/i, 'English'], [/\b(french|fran[cç]ais)\b/i, 'French'], [/\b(german|deutsch)\b/i, 'German'],
  [/\b(spanish|espa[nñ]ol|castellano|latino)\b/i, 'Spanish'], [/\b(italian|italiano)\b/i, 'Italian'],
  [/\b(portuguese|portugu[eê]s|brasil)\b/i, 'Portuguese'], [/\b(dutch|nederlands)\b/i, 'Dutch'], [/\b(turkish|t[uü]rk)/i, 'Turkish'],
  [/\b(arabic)\b|عربي/i, 'Arabic'], [/\b(polish|polski)\b/i, 'Polish'], [/\b(russian)\b/i, 'Russian'], [/\b(hindi|bollywood)\b/i, 'Hindi'],
  [/\b(swedish|svensk)/i, 'Swedish'], [/\b(norwegian|norsk)/i, 'Norwegian'], [/\b(danish|dansk)/i, 'Danish'], [/\b(finnish|suomi)\b/i, 'Finnish'],
  [/\b(icelandic|[ií]slensk)/i, 'Icelandic'], [/\b(greek)\b/i, 'Greek'], [/\b(korean|k-?drama)\b/i, 'Korean'], [/\b(japanese)\b/i, 'Japanese'],
  [/\b(chinese|mandarin|cantonese)\b/i, 'Chinese'], [/\b(persian|farsi)\b/i, 'Persian'], [/\b(tamil)\b/i, 'Tamil'], [/\b(telugu)\b/i, 'Telugu'],
];
const GENRES = [
  [/action/i, 'Action'], [/advent/i, 'Adventure'], [/anim(?!e)|cartoon/i, 'Animation'], [/\banime\b/i, 'Anime'], [/comed|com[ée]di|kom[öo]d|commedia|stand.?up/i, 'Comedy'],
  [/crime|gangster/i, 'Crime'], [/docu/i, 'Documentary'], [/dram/i, 'Drama'], [/family/i, 'Family'], [/fantas/i, 'Fantasy'],
  [/horr|terror|grusel/i, 'Horror'], [/\bkids?\b|child|enfant|kinder|infantil|junior/i, 'Kids'], [/music|concert/i, 'Music'], [/myster/i, 'Mystery'],
  [/roman/i, 'Romance'], [/sci.?fi|science fiction/i, 'Sci-Fi'], [/sport/i, 'Sport'], [/thrill|suspense/i, 'Thriller'], [/\bwar\b/i, 'War'],
  [/western/i, 'Western'], [/christmas|holiday/i, 'Christmas'], [/reality/i, 'Reality'], [/history|historic/i, 'History'],
];
const codeAt = (s, re) => { const m = s.match(re); return m && LANG_CODES[m[1].toUpperCase().replace(/[^A-Z]/g, '')]; };
const PREFIX = /^\W*([A-Za-z]{2,4}(?:-?YU)?)\s*[|:\-–—\]\)•▎▶►»┃]/, SUFFIX = /[|:\-–—\[(•]\s*([A-Z]{2,4})\W*$/;
export function langOf(s, strict) {
  const c = codeAt(s, PREFIX) || (!strict && codeAt(s, SUFFIX));
  if (c) return c;
  if (strict) return '';
  for (const [re, name] of LANG_WORDS) if (re.test(s)) return name;
  return '';
}
export const QUALITY_ORDER = ['4K', 'Full HD', 'HD', 'SD'];
export function qualityOf(s) {
  return /\b(4k|uhd|2160p?)\b/i.test(s) ? '4K' : /\b(fhd|1080p?)\b/i.test(s) ? 'Full HD' : /\b(hd|720p?)\b/i.test(s) ? 'HD' : /\bsd\b/i.test(s) ? 'SD' : '';
}
const HDR = /\b(hdr10\+?|hdr|dolby ?vision|dv)\b/i;
const SUBS = /multi[ -]?subs?|\bsubs?\b|subtitle|vostfr|\bsubbed\b/i;
const KEEP_CAPS = /^(4K|UHD|FHD|HD|SD|HDR|TV|UK|US|USA|EN|NBA|NFL|MLB|NHL|UFC|WWE|BBC|HBO|DC|3D|VIP|II|III|IV|VI|VII|VIII|IX|XI|XII|FBI|CIA|NCIS|CSI|SWAT|USA)$/;
const sentence = (s) => s.toLowerCase().replace(/[\p{L}\p{N}+']+/gu, (w) => (KEEP_CAPS.test(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)));
export function prettyCat(name) {
  let rest = name, tag = '';
  const m = name.match(PREFIX) || name.match(SUFFIX);
  if (m && LANG_CODES[m[1].toUpperCase().replace(/[^A-Z]/g, '')]) {
    tag = m[1].toUpperCase();
    rest = (name.slice(0, m.index) + name.slice(m.index + m[0].length)).replace(/^[\s|:\-–—•▎┃]+|[\s|:\-–—•▎┃]+$/g, '');
  }
  if (rest === rest.toUpperCase() && /[A-Z]{3}/.test(rest)) rest = sentence(rest);
  return { name: rest || name, tag };
}
// "EN| THE LONG TAKE 2023 FHD" -> "The Long Take" (the year and quality become meta and tags).
const TAGS = /\b(4k|uhd|2160p?|1080p?|720p?|fhd|hd|sd|hdr10\+?|hdr|dv|dolby vision|hevc|h ?26[45]|x26[45]|multi[ -]?subs?|subs?|subbed|dual|vostfr|vf|vo|imax|3d|web-?dl|web-?rip|blu-?ray|bdrip|remux|multi)\b/gi;
const LEAD = /^\s*(?:[[(|┃]\s*[A-Za-z]{2,5}(?:-[A-Za-z]{2})?\s*[\])|┃]|[A-Z]{2,5}(?:-[A-Z]{2})?\s*[:|\-–—┃])\s*/;
export function prettyTitle(raw) {
  let s = String(raw || '');
  for (let i = 0; i < 2; i++) s = s.replace(LEAD, '');
  let bracketYear = false;
  s = s.replace(/[([]\s*(?:19|20)\d{2}\s*[)\]]/g, () => { bracketYear = true; return ' '; });
  if (!/\s/.test(s.trim()) && /\./.test(s)) s = s.replace(/\./g, ' ');   // Tidewater.2020.1080p
  s = s.replace(/[ᴴᴰ]+/g, ' ').replace(TAGS, ' ').replace(/\bS\d{1,2}(?:E\d{1,3})?\b(?:\s*-\s*S\d{1,2}\b)?|\bseason \d+\b/gi, ' ').replace(/\[\s*\]|\(\s*\)/g, ' ');
  // A bare year at the end is the release year, unless the name already had one in brackets ("Blade Runner 2049 (2017)").
  if (!bracketYear) s = s.replace(/\s((?:19|20)\d{2})\s*$/, ' ');
  s = s.replace(/\s{2,}/g, ' ').replace(/^[\s|:\-–—•▎┃]+|[\s|:\-–—•▎┃,]+$/g, '').trim();
  if (s && s === s.toUpperCase() && /[A-Z]{3}/.test(s)) s = sentence(s);
  return s || String(raw || '').trim();
}

// ---------- tagging and ranking ----------
const HOT = /popular|trending|\btop ?(10|20|50|100)\b|most watched|box ?office|blockbuster|\bhot\b/i;
const YEAR = new Date().getFullYear();
function popularity(x) {
  const recent = 1 / (1 + Math.max(0, YEAR - (+x.year || YEAR - 5)) / 3);
  const hot = x._hot ? 1.5 : 0;
  if (x._iv) return Math.log10(x._iv + 10) * (1 + 1.5 * recent) + x._ir / 10 + hot;
  const fresh = x.added && Date.now() / 1000 - x.added < 60 * 86400 ? 0.5 : 0;
  return ((parseFloat(x.rating) || 5.5) / 10) * 3 * (1 + 1.5 * recent) + fresh + hot;
}
const topScore = (x) => (x._iv ? (x._iv / (x._iv + 5000)) * x._ir + (5000 / (x._iv + 5000)) * 6.6 : (parseFloat(x.rating) || 0) * 0.6);
const genreSets = new Map();
const sharedGenres = (list) => { const key = list.join('|'); let g = genreSets.get(key); if (!g) genreSets.set(key, (g = list)); return g; };

async function prepare(kind, c) {
  c._at = c.at || Date.now();
  const done = c.pv === PREP[kind];   // a saved copy that was prepared already
  c._unprepared = !done;
  c.pv = PREP[kind];
  await breathe();   // the saved copy was just read in one go: let the remote through before the next step
  if (!done) for (let i = 0; i < c.items.length; i++) {
    const x = c.items[i];
    // "##### AT&T RAW #####", "==== SPORTS ====": providers' section separators; keep the words, drop the decoration
    if (kind === 'live' && /^[#=*~_\-\s]{3,}|[#=*~_\-\s]{3,}$/.test(x.name)) { x.name = x.name.replace(/^[#=*~_\-\s]{3,}|[#=*~_\-\s]{3,}$/g, '').trim() || x.name; x._sep = true; }
    x._s = Titles.norm(x.name);
    if (i % 5000 === 4999) await breathe();
  }
  c.byId = new Map();
  for (let i = 0; i < c.items.length; i++) { c.byId.set(c.items[i].id, c.items[i]); if (i % 20000 === 19999) await breathe(); }
  c.catName = new Map(c.cats.map((x) => [x.id, x.name]));
  if (kind === 'live') return c;
  if (done) { await mergeLib(kind, c); return c; }
  const byCat = new Map();
  for (const k of c.cats) byCat.set(k.id, { lang: langOf(k.name), q: qualityOf(k.name), sub: SUBS.test(k.name), hot: HOT.test(k.name), genres: GENRES.filter(([re]) => re.test(k.name)).map(([, g]) => g) });
  const none = { lang: '', q: '', sub: false, hot: false, genres: [] };
  for (let i = 0; i < c.items.length; i++) {
    if (i % 2000 === 1999) await breathe();
    const x = c.items[i], k = byCat.get(x.cat) || none;
    x._lang = langOf(x.name, true) || k.lang;
    x._q = qualityOf(x.name) || k.q;
    x._hdr = HDR.test(x.name);
    x._sub = k.sub || SUBS.test(x.name);
    x._genres = x.genre ? sharedGenres([...new Set([...k.genres, ...String(x.genre).split(/[,/|]/).map((g) => g.trim()).filter(Boolean)])]) : k.genres;
    x._hot = k.hot;
    x._title = prettyTitle(x.name);
    const cl = Titles.clean(x.name);
    x._key = cl.key || Titles.norm(x._title);
    x._ck = cl.key || '';
    x._cy = cl.year || 0;
    if (!x.year && cl.year) x.year = String(cl.year);
    x._pop = popularity(x);
    x._top = topScore(x);
  }
  await mergeLib(kind, c);
  return c;
}

// ---------- IMDb ratings (a weekly file built from IMDb's free datasets, scripts/build-ratings.js) ----------
const RATINGS_URL = 'https://github.com/Burger-Nice/tuner/releases/download/ratings/ratings.json';
const imdb = { m: null, s: null, genres: [], loading: null };
function loadRatings() {
  if (imdb.loading) return imdb.loading;
  imdb.loading = (async () => {
    let d = await window.Core.cache.get('ratings');
    if (!d?.movies || Date.now() - (d.fetched || 0) > 7 * 86400e3) {
      try {
        const r = await fetch(RATINGS_URL, { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const got = await r.json();
        if (!got?.movies) throw new Error('no data');
        got.fetched = Date.now();
        d = got;
        window.Core.cache.set('ratings', d);
      } catch { if (!d?.movies) return false; }
    }
    const index = async (rows) => {
      const byKey = new Map(), byTitle = new Map();
      for (let i = 0; i < rows.length; i++) {
        const [key, year, r10, votes, g, alt] = rows[i];
        const e = { r: r10 / 10, n: votes, g };
        for (const k of alt ? [key, alt] : [key]) {
          if (!byKey.has(k + '|' + year)) byKey.set(k + '|' + year, e);
          if (!byTitle.has(k)) byTitle.set(k, e);
        }
        if (i % 5000 === 4999) await breathe();
      }
      return { byKey, byTitle };
    };
    imdb.genres = d.genres || [];
    imdb.m = await index(d.movies);
    imdb.s = await index(d.series || []);
    return true;
  })();
  return imdb.loading;
}
function matchImdb(x, kind) {
  const ix = kind === 'movie' ? imdb.m : imdb.s;
  const key = x._ck, year = x._cy;
  if (!ix || !key) return null;
  const y = +x.year || year;
  if (y) for (const yy of [y, y - 1, y + 1]) { const e = ix.byKey.get(key + '|' + yy); if (e) return e; }
  return !y || kind === 'series' ? ix.byTitle.get(key) || null : null;
}
// Returns true when ratings were added (the titles then need merging again).
async function rateLib(kind, c) {
  if (!c || c._rated || !(await loadRatings())) return false;
  c._rated = true;
  for (let i = 0; i < c.items.length; i++) {
    const x = c.items[i], e = matchImdb(x, kind);
    if (e) {
      x._ir = e.r; x._iv = e.n;
      if (e.g?.length) x._genres = sharedGenres([...new Set([...(x._genres || []), ...e.g.map((g) => imdb.genres[g])])]);
      x._pop = popularity(x);
      x._top = topScore(x);
    }
    if (i % 1500 === 1499) await breathe();
  }
  return true;
}

// ---------- one card per title ----------
// Provider items with the same cleaned title and year are versions of one title (languages, qualities, cuts).
const qRank = (q) => { const i = QUALITY_ORDER.indexOf(q); return i < 0 ? 4 : i; };
export const prefLangs = () => settings().langs || ['English'];
const verKey = () => scoped('ver');
export function versionLabel(v) {
  return [v._lang || 'Original', [v._q || 'SD', v._hdr ? 'HDR' : ''].filter(Boolean).join(' '), v._sub ? 'Subtitles' : ''].filter(Boolean).join(' · ');
}
// Your language first, then the best quality; a version you picked before wins.
export function defaultVersion(t) {
  if (t.versions.length === 1) return t.versions[0];
  const picked = store.get(verKey(), {})[t.key];
  const hit = picked && t.versions.find((v) => v.id === picked);
  if (hit) return hit;
  const langs = prefLangs();
  const lr = (v) => { const i = langs.indexOf(v._lang); return i < 0 ? (v._lang ? 20 : 10) : i; };
  return [...t.versions].sort((a, b) => lr(a) - lr(b) || qRank(a._q) - qRank(b._q))[0];
}
export function pickVersion(t, v) { const m = store.get(verKey(), {}); m[t.key] = v.id; store.set(verKey(), m); }

// In chunks, so the remote keeps working while tens of thousands of titles are grouped.
async function mergeLib(kind, c) {
  const groups = new Map();
  for (let i = 0; i < c.items.length; i++) {
    const x = c.items[i];
    const k = x._key + '|' + (kind === 'movie' ? x.year || '' : '');
    let g = groups.get(k);
    if (!g) groups.set(k, (g = []));
    g.push(x);
    if (i % 8000 === 7999) await breathe();
  }
  const titles = [];
  let n = 0;
  for (const [key, vs] of groups) {
    if (++n % 4000 === 0) await breathe();
    const first = vs[0];
    const t = {
      kind, key, id: first.id, name: first._title, raw: first.name, year: first.year, versions: vs,
      poster: (vs.find((v) => v.poster) || first).poster, cat: first.cat,
      added: Math.max(...vs.map((v) => v.added || 0)), rating: first.rating,
      _s: first._ts || (first._ts = Titles.norm(first._title)), _ir: first._ir, _iv: first._iv,
      _pop: Math.max(...vs.map((v) => v._pop || 0)), _top: Math.max(...vs.map((v) => v._top || 0)),
      _langs: new Set(vs.map((v) => v._lang).filter(Boolean)), _qs: new Set(vs.map((v) => v._q).filter(Boolean)),
      _sub: vs.some((v) => v._sub), _hdr: vs.some((v) => v._hdr),
      _genres: vs.length === 1 ? first._genres : sharedGenres([...new Set(vs.flatMap((v) => v._genres || []))]),
    };
    t._lang = t._langs.has('English') ? 'English' : first._lang;
    t._q = QUALITY_ORDER.find((q) => t._qs.has(q)) || '';
    titles.push(t);
  }
  c.titles = titles;
  c.titleById = new Map(); for (const t of titles) for (const v of t.versions) c.titleById.set(v.id, t);
  c.facets = facets(titles);
  c._sorted = {};
}

// ---------- browse: view chips, sort, filters, jump ----------
export const SORTS = [
  ['popular', 'Popular', 'IMDb, this week'], ['rating', 'Top rated', 'IMDb, high to low'], ['year', 'Newest', 'release year'],
  ['added', 'Recently added', 'to your provider'], ['az', 'Title', 'A to Z'],
];
const sorters = {
  popular: (a, b) => (b._pop || 0) - (a._pop || 0),
  rating: (a, b) => (b._top || 0) - (a._top || 0),
  year: (a, b) => (+b.year || 0) - (+a.year || 0) || b.added - a.added,
  added: (a, b) => b.added - a.added,
  az: (a, b) => a.name.localeCompare(b.name),
};
export const DECADES = [['2020s', 2020, 2099], ['2010s', 2010, 2019], ['2000s', 2000, 2009], ['Older', 0, 1999]];
export const IMDB_MIN = [['6+', 6], ['7+', 7], ['8+', 8]];
// A filter set: { lang: 'mine' | 'all' | <language>, genre: 'Comedy' | ['Comedy', 'Action'] (any of them),
// q: 'hd' | '4K', sub: true, imdb: 7, decade: '2010s' }
export const genresOf = (f) => (f.genre ? [].concat(f.genre) : []);
let L = ['English'];   // your languages, read once per browse() / optionCounts() call
function match(t, f, skip) {
  if (skip !== 'lang' && f.lang && f.lang !== 'all') {
    if (f.lang === 'mine') { if (t._langs.size && ![...t._langs].some((l) => L.includes(l))) return false; }
    else if (!t._langs.has(f.lang)) return false;
  }
  if (skip !== 'genre' && f.genre && !(Array.isArray(f.genre) ? f.genre.some((g) => t._genres?.includes(g)) : t._genres?.includes(f.genre))) return false;
  if (skip !== 'q' && f.q && !(f.q === '4K' ? t._qs.has('4K') : t._qs.has('4K') || t._qs.has('Full HD') || t._qs.has('HD'))) return false;
  if (skip !== 'sub' && f.sub && !t._sub) return false;
  if (skip !== 'imdb' && f.imdb && !((t._ir || 0) >= f.imdb)) return false;
  if (skip !== 'decade' && f.decade) { const d = DECADES.find((x) => x[0] === f.decade), y = +t.year || 0; if (!d || y < d[1] || y > d[2]) return false; }
  return true;
}
function facets(titles) {
  const genre = new Map();
  for (const t of titles) for (const g of t._genres || []) genre.set(g, (genre.get(g) || 0) + 1);
  return { genres: [...genre.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g) };
}
export const filterCount = (f) => ['lang', 'genre', 'q', 'sub', 'imdb', 'decade'].filter((k) => f[k] && !(k === 'lang' && f[k] === 'all')).length;
// English (your languages) first, then titles with no language marked, then the rest.
function langFirst(list) {
  const rank = (t) => (L.includes(t._lang) ? 0 : t._lang ? 2 : 1);
  return list.map((t, i) => [rank(t), i, t]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((e) => e[2]);
}
export function browse(kind, view) {
  const c = catalog[kind];
  if (!c?.titles) return [];
  L = prefLangs();
  const sort = sorters[view.sort] ? view.sort : 'popular';
  let base = c._sorted[sort];
  if (!base) base = c._sorted[sort] = [...c.titles].sort(sorters[sort]);
  // Language-first order is worked out once per sort (filtering keeps the order).
  if (view.langFirst !== false && sort !== 'az') {
    const k = 'lf:' + sort + ':' + L.join(',');
    base = c._sorted[k] || (c._sorted[k] = langFirst(base));
  }
  return filterCount(view.f) ? base.filter((t) => match(t, view.f)) : base.slice();
}
// Live counts for the Filters sheet: each option counted against every other active filter.
export function optionCounts(kind, view, key, values) {
  const c = catalog[kind], f = view.f;
  L = prefLangs();
  const pool = c.titles.filter((t) => match(t, f, key));
  const counts = values.map(() => 0);
  if (key === 'genre' || (key === 'lang' && values.every((v) => v !== 'mine' && v !== 'all'))) {
    // one walk over each title's own genres or languages instead of a test per option
    const at = new Map(values.map((v, i) => [v, i]));
    for (const t of pool) for (const v of key === 'genre' ? t._genres || [] : t._langs) { const i = at.get(v); if (i !== undefined) counts[i]++; }
    return counts;
  }
  const fs = values.map((v) => ({ [key]: v }));
  for (const t of pool) for (let i = 0; i < fs.length; i++) if (match(t, fs[i], '')) counts[i]++;
  return counts;
}
// Every section's counts for the Filters sheet in one walk over the titles: a title counts towards a section when it
// passes every other active filter. Genres and languages are counted from the title's own lists.
// sections: [[key, values]] (undefined = "Any", not counted); returns { key: counts[] }.
export function facetCounts(kind, f, sections) {
  const c = catalog[kind];
  L = prefLangs();
  const active = ['lang', 'genre', 'q', 'sub', 'imdb', 'decade'].filter((k) => f[k] && !(k === 'lang' && f[k] === 'all')).map((k) => [k, { [k]: f[k] }]);
  const out = {}, plan = [];
  for (const [key, vals] of sections) {
    const counts = vals.map(() => 0);
    out[key] = counts;
    const at = new Map(), rest = [];
    vals.forEach((v, i) => {
      if (v === undefined || v === 'all') return;
      if (key === 'genre' || (key === 'lang' && v !== 'mine')) at.set(v, i); else rest.push([i, { [key]: v }]);
    });
    plan.push({ key, counts, at, rest });
  }
  for (const t of c?.titles || []) {
    let failed = null, nf = 0;
    for (const [k, one] of active) if (!match(t, one, '')) { failed = k; if (++nf > 1) break; }
    if (nf > 1) continue;
    for (const s of plan) {
      if (nf === 1 && failed !== s.key) continue;
      if (s.at.size) for (const v of s.key === 'genre' ? t._genres || [] : t._langs || []) { const i = s.at.get(v); if (i !== undefined) s.counts[i]++; }
      for (const [i, one] of s.rest) if (match(t, one, '')) s.counts[i]++;
    }
  }
  return out;
}
// Jump follows the sort: rank bands for Popular and Top rated, years for Newest, letters for Title, months for Recently added.
export function jumpTargets(view, list) {
  const out = [];
  if (view.sort === 'popular' || view.sort === 'rating') {
    for (const [label, at] of [['Top 100', 0], ['101–500', 100], ['501–1,000', 500], ['The rest', 1000]]) if (at < list.length) out.push([label, at]);
  } else if (view.sort === 'year') {
    const seen = new Set();
    list.forEach((t, i) => { const d = t.year ? Math.floor(+t.year / 10) * 10 + 's' : 'No year'; if (!seen.has(d)) { seen.add(d); out.push([d, i]); } });
  } else if (view.sort === 'az') {
    const seen = new Set();
    list.forEach((t, i) => { const ch = /[a-z]/i.test(t.name[0]) ? t.name[0].toUpperCase() : '#'; if (!seen.has(ch)) { seen.add(ch); out.push([ch, i]); } });
  } else {
    const seen = new Set();
    list.forEach((t, i) => { if (!t.added) return; const d = new Date(t.added * 1000).toLocaleDateString([], { month: 'short', year: 'numeric' }); if (!seen.has(d)) { seen.add(d); out.push([d, i]); } });
  }
  return out.slice(0, 26);
}

// ---------- search: word-prefix matching over everything ----------
// "harb" finds Harbor Lights, Harbour Rescue and Cold Harbour (a word starts with it), never Tidewater.
export function searchAll(q, limit = 30) {
  const words = Titles.norm(q).split(' ').filter(Boolean);
  if (!words.length) return { live: [], movie: [], series: [] };
  const hit = (s) => { const ws = ` ${s}`; return words.every((w) => ws.includes(' ' + w)); };
  const score = (t) => (t._s.startsWith(words[0]) ? 0 : 1);
  const pick = (list) => { const out = []; for (const t of list) { if (hit(t._s)) out.push(t); if (out.length > 400) break; } return out.sort((a, b) => score(a) - score(b) || (b._pop || 0) - (a._pop || 0)).slice(0, limit); };
  return {
    live: catalog.live ? pick(catalog.live.items) : [],
    movie: catalog.movie?.titles ? pick(catalog.movie._sorted.popular || catalog.movie.titles) : [],
    series: catalog.series?.titles ? pick(catalog.series._sorted.popular || catalog.series.titles) : [],
  };
}
