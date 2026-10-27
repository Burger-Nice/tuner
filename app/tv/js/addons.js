// Stremio-compatible add-ons (design/ui-v1/addons/SPEC.md): the list (keyed by a hash of each add-on's link), their
// manifests, catalog / meta / stream / subtitles requests (timeouts, at most 6 in the air, caches, health), Cinemeta for
// details and IMDb ids, and the Stremio account (link-code sign-in, email, reading the add-on collection, sign-out).
// Rule 0 (SPEC 0): only direct http(s) links become copies; torrents, magnet links and anything that needs Stremio's
// own streaming server are dropped and never shown.
// Secrets: an add-on's link (it can hold a debrid key) and every stream link. They are never logged, never put in an
// error message or a toast, never written to disk except the add-on list itself (like the provider's password), and
// shown at most as their host (hostOf). A copy's link is a non-enumerable property, so saving the copy (Continue
// watching, progress) never writes it.
import { S, store, scoped, emit, on } from './state.js';
import { native } from './native.js';
import { readName, originalLang } from './copies.js';

const CINEMETA = () => store.get('cinemetaBase', 'https://v3-cinemeta.strem.io');
const STREMIO_API = () => store.get('stremioApi', 'https://api.strem.io');
const STREMIO_LINK = () => store.get('stremioLink', 'https://link.stremio.com');
const CINEMETA_ID = 'com.linvo.cinemeta';

// ---------- small helpers ----------
export function hashOf(s) { let h = 2166136261; s = String(s || ''); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); }
export const baseOf = (u) => String(u || '').replace(/\/manifest\.json(\?.*)?$/i, '').replace(/\/+$/, '');
// stremio://host/x/manifest.json is the https link (SPEC 3.5)
export const normLink = (u) => { let s = String(u || '').trim(); if (/^stremio:\/\//i.test(s)) s = 'https://' + s.slice(10); if (!/\/manifest\.json$/i.test(s.split('?')[0]) && /^https?:\/\//i.test(s)) s = s.replace(/\/+$/, '') + '/manifest.json'; return s; };
export const hostOf = (u) => { try { return new URL(u).host; } catch { return ''; } };
// a link whose path holds more than the add-on's own name (a configured add-on: settings or a key in the path)
export const hasConfig = (u) => { try { return new URL(u).pathname.split('/').some((p) => p.length > 24); } catch { return false; } };
// HTML entities from Cinemeta ("Judith O&apos;Dea"): decoded here, escaped again where it is drawn (SPEC 4.3)
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export const decode = (s) => String(s ?? '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()] ?? m));
const strip = (s) => decode(String(s ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

// ---------- requests: at most 6 add-on requests in the air, app-wide (SPEC 5.4) ----------
let inAir = 0;
const queue = [];
const slot = () => new Promise((r) => { if (inAir < 6) { inAir++; r(); } else queue.push(r); });
const free = () => { const n = queue.shift(); if (n) n(); else inAir--; };
export class AddonError extends Error { constructor(kind, status) { super(kind === 'timeout' ? 'No answer in time' : kind === 'notjson' ? 'Not an add-on answer' : kind === 'http' ? `It answered ${status}` : 'Could not reach it'); this.kind = kind; this.status = status; } }
// GET or POST JSON. Errors never carry the link (it can hold a key).
async function getJSON(url, { ms = 10000, body, raw } = {}) {
  await slot();
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try {
    let r;
    try { r = await fetch(url, body ? { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' }, signal: ctl.signal, cache: 'no-store' } : { signal: ctl.signal, cache: 'no-store' }); }
    catch (e) { throw new AddonError(e.name === 'AbortError' ? 'timeout' : 'down'); }
    let text;
    try { text = await r.text(); } catch (e) { throw new AddonError(e.name === 'AbortError' ? 'timeout' : 'down'); }
    if (raw) return { status: r.status, type: r.headers.get('content-type') || '', text };
    if (!r.ok && !/^\s*[{[]/.test(text)) throw new AddonError('http', r.status);
    try { return JSON.parse(text); } catch { throw new AddonError('notjson', r.status); }
  } finally { clearTimeout(t); free(); }
}
const extraPath = (extra) => { const e = Object.entries(extra || {}).filter(([, v]) => v !== undefined && v !== '' && v !== null); return e.length ? '/' + e.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : ''; };
const resUrl = (a, resource, type, id, extra) => `${baseOf(a.url)}/${resource}/${type}/${encodeURIComponent(id)}${extraPath(extra)}.json`;

// ---------- the list (SPEC 3, 11.3): per provider account, keyed by the hash of each link ----------
// { key, url, manifest, at, on, catalogs: { 'type:id': on }, from: 'stremio'|'list'|'link'|'phone'|'typed', kind, health }
let list = null, listFor = null;
const LKEY = () => scoped('addons');
export function addons() {
  if (!S.acc) return [];
  if (listFor !== S.acc.id) { list = store.get(LKEY(), []); listFor = S.acc.id; }
  return list;
}
function saveList() { if (S.acc) store.set(LKEY(), list); emit('addons'); }
on('session', () => {
  list = null; listFor = null; streamCache.clear();
  // keeping in step with Stremio: at every start (a little after, so the start-up stays quick)
  if (S.acc) setTimeout(() => { if (S.acc) { refreshManifests(); stremioSync({ toast: (m) => emit('addon-toast', m) }).catch(() => {}); } }, 8000);
});
export const byKey = (k) => addons().find((a) => a.key === k) || null;
export const enabled = () => addons().filter((a) => a.on && a.manifest);
// The same add-on set up twice (one manifest id, two links): the second gets a short label (SPEC 3.3)
const DEBRID = [[/real-?debrid|\brd\b/i, 'RD'], [/all-?debrid|\bad\b/i, 'AD'], [/premiumize|\bpm\b/i, 'PM'], [/torbox|\btb\b/i, 'TB'], [/debrid-?link|\bdl\b/i, 'DL']];
export function label(a) {
  const name = decode(a.manifest?.name || hostOf(a.url) || 'Add-on');
  const same = addons().filter((x) => x.manifest?.id && x.manifest.id === a.manifest?.id);
  if (same.length < 2 || same[0] === a) return name;
  let txt = ''; try { txt = decodeURIComponent(a.url); } catch { txt = a.url; }
  const d = DEBRID.find(([re]) => re.test(txt) || re.test(a.manifest?.name || ''));
  return `${name} · ${d ? d[1] : same.indexOf(a) + 1}`;
}
// the logo tile's letters: a name's own capitals (OpenSubtitles -> OS, WatchHub -> WH), else the first two words'
export const initialsOf = (a) => {
  const w = decode(a.manifest?.name || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter((x) => x && !/^v?\d+(\.\d+)*$/i.test(x));
  const caps = (w[0] || '').match(/\p{Lu}/gu) || [];
  return (caps.length >= 2 ? caps.slice(0, 2).join('') : w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2)).toUpperCase();
};

// resources as objects, with their own types and id prefixes (an absent idPrefixes means every id: SPEC S4)
const resources = (m) => (m?.resources || []).map((r) => (typeof r === 'string' ? { name: r } : r));
export function supports(a, resource, type, id) {
  const m = a.manifest; if (!m) return false;
  const r = resources(m).find((x) => x.name === resource); if (!r) return false;
  const types = r.types || m.types || [];
  if (type && !types.includes(type)) return false;
  const pre = r.idPrefixes || m.idPrefixes;
  return !id || !pre?.length || pre.some((p) => String(id).startsWith(p));
}
// catalogs: extra[] and the older extraSupported / extraRequired (SPEC S4)
function extrasOf(c) {
  const ex = (c.extra || []).map((e) => ({ ...e }));
  for (const n of c.extraSupported || []) if (!ex.some((e) => e.name === n)) ex.push({ name: n });
  for (const n of c.extraRequired || []) { const e = ex.find((x) => x.name === n); if (e) e.isRequired = true; else ex.push({ name: n, isRequired: true }); }
  return ex;
}
// What a catalog is for: 'chip' (a chip in Movies or Series), 'search' (only used by Search), or null (never listed:
// a required extra other than genre, SPEC 3.1.3)
export function catalogRole(c) {
  const ex = extrasOf(c), req = ex.filter((e) => e.isRequired).map((e) => e.name);
  if (req.includes('search')) return 'search';
  if (req.some((n) => n !== 'genre')) return null;
  if (!['movie', 'series'].includes(c.type)) return null;
  return 'chip';
}
export const catalogKey = (c) => `${c.type}:${c.id}`;
export const genreOf = (c) => extrasOf(c).find((e) => e.name === 'genre') || null;
export const searchable = (c) => extrasOf(c).some((e) => e.name === 'search');
export const pageable = (c) => extrasOf(c).some((e) => e.name === 'skip');
export function catalogName(a, c) {
  const n = decode(c.name || '') || label(a);
  if (a.manifest?.id === CINEMETA_ID && c.id === 'year') return `${n}`;   // (its genre is required, and is a year: "this year first")
  return n;
}
// The defaults (v1.2): the first two catalogs of each type per add-on start on, the rest off
function defaultCatalogs(m) {
  const out = {}, seen = {};
  for (const c of m.catalogs || []) { if (catalogRole(c) !== 'chip') continue; seen[c.type] = (seen[c.type] || 0) + 1; out[catalogKey(c)] = seen[c.type] <= 2; }
  return out;
}
export const catalogOn = (a, c) => (a.catalogs?.[catalogKey(c)] ?? defaultCatalogs(a.manifest || {})[catalogKey(c)] ?? false);
export function setCatalog(a, c, v) { a.catalogs = { ...defaultCatalogs(a.manifest || {}), ...(a.catalogs || {}), [catalogKey(c)]: !!v }; saveList(); }
// The chips for Movies or Series: every switched-on catalog of every enabled add-on, in add-on order (SPEC 4.2)
export function chipCatalogs(type) {
  const out = [];
  for (const a of enabled()) for (const c of a.manifest.catalogs || []) if (c.type === type && catalogRole(c) === 'chip' && catalogOn(a, c)) out.push({ a, c, key: `${a.key}:${catalogKey(c)}`, name: catalogName(a, c), by: label(a) });
  return out;
}
// Is there an enabled stream add-on that covers this catalog's type and id prefix (SPEC S10)?
export function coveredByStreams(a, c) {
  const pre = resources(a.manifest).find((r) => r.name === 'catalog')?.idPrefixes || a.manifest.idPrefixes || ['tt'];
  return enabled().some((s) => isStreamAddon(s) && pre.some((p) => supports(s, 'stream', c.type, p)));
}
const isStreamAddon = (a) => resources(a.manifest).some((r) => r.name === 'stream');

// ---------- what it is, what it gives (SPEC 3.1.1, 3.1.2) ----------
// kind: counts of what its streams turned out to be: { d (direct links), e (other apps), i (info), t (torrent only), n (titles answered) }
export function gives(a) {
  const m = a.manifest || {}, k = a.kind || {}, out = [];
  if (isStreamAddon(a)) {
    if (k.n >= 1 && !k.d && k.t && !k.e && !k.i) out.push(['A catalog only: its films come as torrents', 'torrents']);
    else if (k.n >= 1 && !k.d && k.e && !k.i) out.push(['Where else to watch it: rent, buy or subscribe', 'apps']);
    else if (k.n >= 1 && !k.d && k.i) out.push(['Extras: notes about films', 'info']);
    else out.push([m.types?.includes('series') ? 'Copies of films and series' : 'Copies of films', 'copies']);
  }
  if (resources(m).some((r) => r.name === 'subtitles')) out.push([m.types?.includes('series') ? 'Subtitles for films and series' : 'Subtitles for films', 'subtitles']);
  const cats = (m.catalogs || []).filter((c) => catalogRole(c) === 'chip');
  if (cats.length) out.push([`Catalogs${resources(m).some((r) => r.name === 'meta') ? ' and details' : ''} · ${[...new Set(cats.map((c) => decode(c.name || '') || decode(m.name)))].slice(0, 3).join(', ')}`, 'catalogs']);
  return out;
}
export const givesLine = (a) => gives(a).map(([t]) => t).join(' · ') || 'Nothing airglow shows yet';
// An add-on that only ever sent info or other-app links is never waited for (SPEC M3)
export const neverWaited = (a) => { const g = gives(a).map(([, w]) => w); return g.includes('info') || g.includes('apps') || g.includes('torrents'); };
// 3.1.2: On, Off, Catalog only, Needs setup, Not answering, Not an add-on any more, Checking…
export function stateOf(a) {
  if (!a.manifest) return a.health?.notAddon ? 'gone' : 'checking';
  if (a.health?.notAddon) return 'gone';
  if (!a.on) return 'off';
  if (isDown(a)) return 'down';
  if (a.manifest.behaviorHints?.configurationRequired && !hasConfig(a.url)) return 'setup';
  if (gives(a).some(([, w]) => w === 'torrents') && (a.kind?.n || 0) >= 20) return 'catalog';
  if (!isStreamAddon(a) && !resources(a.manifest).some((r) => r.name === 'subtitles') && (a.manifest.catalogs || []).length && !resources(a.manifest).some((r) => r.name === 'meta')) return 'catalog';
  return 'on';
}
export const STATE_WORDS = { on: 'On', off: 'Off', catalog: 'Catalog only', setup: 'Needs setup', down: 'Not answering', gone: 'Not an add-on any more', checking: 'Checking…' };

// ---------- health: 3 timeouts in 10 min = Not answering, not asked for 30 min (SPEC 9) ----------
const isDown = (a) => (a.health?.downUntil || 0) > Date.now();
function failed(a, err) {
  const h = (a.health ||= {});
  const now = Date.now();
  if (err.kind === 'notjson') { h.notAddon = h.notAddon || now; saveList(); return; }
  if (err.kind !== 'timeout' && err.kind !== 'down') return;
  h.fails = [...(h.fails || []).filter((t) => now - t < 10 * 60e3), now];
  if (h.fails.length >= 3) { h.downUntil = now + 30 * 60e3; h.downSince = h.fails[0]; }
  saveList();
}
function worked(a) { const h = (a.health ||= {}); const was = h.notAddon || h.downUntil || h.fails?.length; h.lastOk = Date.now(); delete h.notAddon; delete h.downUntil; h.fails = []; if (was) saveList(); }
export function healthLine(a) {
  const h = a.health || {}, t = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (h.notAddon) return `Opens a web page now${h.lastOk ? ` · last worked ${new Date(h.lastOk).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}`;
  if (isDown(a)) return `No answer in 10 s, 3 times since ${t(h.downSince || Date.now())} · tries again ${t(h.downUntil)}`;
  return '';
}
// A request to one add-on, with its health kept
async function ask(a, resource, type, id, extra, ms) {
  try { const d = await getJSON(resUrl(a, resource, type, id, extra), { ms }); worked(a); return d; }
  catch (e) { failed(a, e); throw e; }
}

// ---------- manifests ----------
// Reads <base>/manifest.json (6 s). { ok, manifest } or { ok: false, why: 'a web page' | 'nothing' | 'down' | 'not an add-on' }
export async function readManifest(link) {
  const url = normLink(link);
  if (!/^https?:\/\//i.test(url)) return { ok: false, why: 'not a link airglow can open' };
  let r;
  try { r = await getJSON(url, { ms: 6000, raw: true }); } catch (e) { return { ok: false, why: e.kind === 'timeout' ? 'no answer' : 'nothing' }; }
  let m = null; try { m = JSON.parse(r.text); } catch {}
  if (!m) return { ok: false, why: /html/i.test(r.type) || /^\s*</.test(r.text) ? 'a web page' : r.text.trim() ? 'something that isn\'t an add-on' : 'nothing' };
  if (!m.id || !m.name || !Array.isArray(m.resources)) return { ok: false, why: 'something that isn\'t an add-on' };
  return { ok: true, url, manifest: m };
}
// Manifests are read again after 24 h (in the background, when an add-on is used)
async function freshen(a) {
  if (a.manifest && Date.now() - (a.at || 0) < 24 * 3600e3) return;
  const r = await readManifest(a.url);
  if (r.ok) { a.manifest = r.manifest; a.at = Date.now(); worked(a); saveList(); }
  else if (r.why === 'a web page' || r.why === 'something that isn\'t an add-on') failed(a, new AddonError('notjson'));
}
export function refreshManifests() { for (const a of addons()) freshen(a).catch(() => {}); }

// Adds one (every way in ends at the confirm, SPEC 3.6). Returns the record. Choices made for the same add-on under an
// older address carry over when the manifest id, host and a newer version say it's the same one (SPEC 3.3).
export function addAddon({ url, manifest }, from = 'typed') {
  const key = 'ad' + hashOf(url);
  const l = addons();
  let a = l.find((x) => x.key === key);
  if (a) { a.manifest = manifest; a.at = Date.now(); a.on = true; saveList(); return a; }
  a = { key, url, manifest, at: Date.now(), on: true, catalogs: defaultCatalogs(manifest), from, kind: {}, health: {} };
  l.push(a);
  saveList();
  return a;
}
export function removeAddon(a) { const l = addons(), i = l.indexOf(a); if (i >= 0) l.splice(i, 1); if (a.from === 'stremio') hideFromStremio(a); saveList(); }
export function setOn(a, v) { a.on = !!v; saveList(); }
export function move(a, to) { const l = addons(), i = l.indexOf(a); if (i < 0) return; l.splice(i, 1); l.splice(Math.max(0, Math.min(l.length, to)), 0, a); saveList(); }
export const orderOf = (a) => addons().indexOf(a) + 1;

// ---------- Cinemeta: details, search, IMDb ids (SPEC 4.3; RANKING.md 4.1) ----------
// The installed Cinemeta when there is one, else Stremio's own: it is airglow's source of IMDb details either way.
const cinemetaAddon = () => enabled().find((a) => a.manifest.id === CINEMETA_ID) || { key: 'cinemeta', url: `${CINEMETA()}/manifest.json`, manifest: { id: CINEMETA_ID, name: 'Cinemeta', resources: ['catalog', 'meta', 'addon_catalog'], types: ['movie', 'series'], idPrefixes: ['tt'], catalogs: [] }, builtin: true };
const metaMem = new Map();
const META_DAYS = 7;
// A title's details (the first enabled add-on with meta for this id's prefix; for tt ids that is Cinemeta)
export async function meta(type, id) {
  if (!id) return null;
  const ck = `${type}:${id}`;
  const hit = metaMem.get(ck);
  if (hit && Date.now() - hit.at < META_DAYS * 86400e3) return hit.v;
  const saved = await window.Core.cache.get(`ad:meta:${ck}`);
  if (saved && Date.now() - saved.at < META_DAYS * 86400e3) { metaMem.set(ck, saved); return saved.v; }
  const who = [...enabled().filter((a) => supports(a, 'meta', type, id)), ...(String(id).startsWith('tt') ? [cinemetaAddon()] : [])];
  for (const a of who) {
    try {
      const d = a.builtin ? await getJSON(resUrl(a, 'meta', type, id), { ms: 10000 }) : await ask(a, 'meta', type, id, null, 10000);
      const m = d?.meta;
      if (!m?.name) continue;   // an unknown id answers a meta with no name: none
      const v = cleanMeta(m, type, a);
      const rec = { at: Date.now(), v };
      metaMem.set(ck, rec);
      window.Core.cache.set(`ad:meta:${ck}`, rec);
      keepIndex(`ad:meta:${ck}`);
      return v;
    } catch {}
  }
  return null;
}
// the last 500 metas are kept on the device
function keepIndex(k) {
  const ix = store.get('adMetaIx', []).filter((x) => x !== k); ix.push(k);
  while (ix.length > 500) window.Core.cache.set(ix.shift(), null);
  store.set('adMetaIx', ix);
}
const minutes = (r) => { const m = String(r || '').match(/(\d+)\s*h(?:\s*(\d+))?|(\d+)\s*min/i); return m ? (m[1] ? +m[1] * 60 + (+m[2] || 0) : +m[3]) : 0; };
function cleanMeta(m, type, a) {
  const arr = (x) => (Array.isArray(x) ? x : x ? String(x).split(',') : []).map((s) => decode(String(s).trim())).filter(Boolean);
  const year = +String(m.year || m.releaseInfo || '').match(/\d{4}/)?.[0] || 0;
  return {
    id: m.id, imdb: m.imdb_id || (String(m.id).startsWith('tt') ? m.id : ''), type: m.type || type, name: decode(m.name), year,
    releaseInfo: decode(m.releaseInfo || ''), released: m.released || '', description: decode(m.description || ''), runtime: minutes(m.runtime),
    genres: arr(m.genres || m.genre), cast: arr(m.cast).slice(0, 6), director: arr(m.director).slice(0, 2), imdbRating: m.imdbRating || '',
    poster: m.poster || '', background: m.background || '', logo: m.logo || '', country: decode(m.country || ''),
    moviedb: +m.moviedb_id || 0, tvdb: +m.tvdb_id || 0, trailers: (m.trailerStreams || []).filter((t) => t.ytId).map((t) => ({ ytId: t.ytId, title: decode(t.title || 'Trailer') })),
    videos: (m.videos || []).map((v) => ({ id: v.id, season: +v.season || 0, episode: +v.episode || +v.number || 0, name: decode(v.name || v.title || ''), released: v.released || '', thumbnail: v.thumbnail || '', overview: decode(v.overview || v.description || '') })),
    from: label(a),
  };
}
// Cinemeta search (RANKING.md 4.1 step 4, and the picker): [{ id, name, year, type, poster }]
export async function cinemetaSearch(type, q) {
  const a = cinemetaAddon();
  try {
    const d = await getJSON(resUrl(a, 'catalog', type, 'top', { search: q }), { ms: 10000 });
    return (d?.metas || []).map((m) => ({ id: m.imdb_id || m.id, name: decode(m.name), year: +String(m.releaseInfo || m.year || '').match(/\d{4}/)?.[0] || 0, type: m.type || type, poster: m.poster || '', releaseInfo: m.releaseInfo || '' }));
  } catch { return null; }
}

// ---------- catalogs (SPEC 4.2): IndexedDB, 6 h, stale while revalidating ----------
const catMem = new Map();
// One page: { metas, stale } or throws. skip = titles received so far.
export async function catalogPage(a, c, { genre, skip = 0, search } = {}) {
  const extra = {};
  const g = genreOf(c);
  if (search) extra.search = search;
  if (genre) extra.genre = genre;
  else if (g?.isRequired && g.options?.length) extra.genre = g.options[0];   // (Cinemeta's New: its first year)
  if (skip) extra.skip = skip;
  const ck = `ad:cat:${a.key}:${c.type}:${c.id}:${extraPath(extra)}`;
  const mem = catMem.get(ck);
  if (mem && Date.now() - mem.at < 6 * 3600e3) return mem.v;
  const saved = !search && (await window.Core.cache.get(ck));
  const load = async () => {
    const d = await ask(a, 'catalog', c.type, c.id, extra, 10000);
    const v = (d?.metas || []).filter((m) => m && m.id && m.name).map((m) => ({ id: m.imdb_id || m.id, type: m.type || c.type, name: decode(m.name), poster: m.poster || '', year: +String(m.releaseInfo || m.year || '').match(/\d{4}/)?.[0] || 0, releaseInfo: decode(m.releaseInfo || ''), released: m.released || '', genres: (m.genres || m.genre || []).map(decode), imdbRating: m.imdbRating || '', director: (Array.isArray(m.director) ? m.director : m.director ? [m.director] : []).map(decode) }));
    const rec = { at: Date.now(), v };
    catMem.set(ck, rec);
    if (!search) window.Core.cache.set(ck, rec);
    return v;
  };
  if (saved?.v) {
    catMem.set(ck, saved);
    if (Date.now() - saved.at > 6 * 3600e3) load().then(() => emit('addon-catalog', ck)).catch(() => {});
    return saved.v;
  }
  return load();
}
// Search: every enabled catalog with a search extra (SPEC 6), one request each. -> [{ a, c, metas | null (no answer) }]
export function searchCatalogs() {
  const out = [];
  for (const a of enabled()) for (const c of a.manifest.catalogs || []) if (['movie', 'series'].includes(c.type) && searchable(c)) out.push({ a, c });
  return out;
}

// ---------- streams: who is asked, and turning a stream into a copy (SPEC 5.4, 11.4) ----------
// His country for countryWhitelist: the TV's own region (Android Settings, from the native side), never the
// provider's; unknown = nothing dropped (v1.2). ISO 3166-1 alpha-3, lowercase.
const A3 = { IS: 'isl', US: 'usa', GB: 'gbr', UK: 'gbr', FR: 'fra', DE: 'deu', ES: 'esp', IT: 'ita', NL: 'nld', SE: 'swe', NO: 'nor', DK: 'dnk', FI: 'fin', PL: 'pol', PT: 'prt', BR: 'bra', CA: 'can', AU: 'aus', IE: 'irl', NZ: 'nzl', BE: 'bel', CH: 'che', AT: 'aut', MX: 'mex', AR: 'arg', TR: 'tur', IN: 'ind', JP: 'jpn', KR: 'kor' };
export function region() {
  const r = String(store.get('tvRegion', '') || native?.info?.()?.region || '').trim();
  if (/^[a-z]{3}$/i.test(r)) return r.toLowerCase();
  return A3[r.toUpperCase()] || '';
}
const DIRECT = /^https?:\/\//i;
const STREMIO_SERVER = /^https?:\/\/(127\.0\.0\.1|localhost):11470\b/i;
// One stream -> { copy } | { ext } | { info } | { trailer } | { detail } | { drop: 'torrent' | 'country' | 'other' }
function sort(s, a, ctx) {
  const bh = s.behaviorHints || {};
  if (s.infoHash || s.nzbUrl || s.rarUrls || s.zipUrls || s['7zipUrls'] || s.tgzUrls || s.tarUrls) return { drop: 'torrent' };
  if (s.ytId) return { trailer: { ytId: s.ytId, title: strip(s.title || s.name || 'Trailer') } };
  if (s.externalUrl) {
    const u = String(s.externalUrl);
    const m = u.match(/^stremio:\/\/\/detail\/(movie|series)\/([^/]+)/);
    if (m) return { detail: { type: m[1], id: decodeURIComponent(m[2]).split(':')[0] } };
    if (/^stremio:/i.test(u)) return { drop: 'other' };
    if (s.androidTvUrl || OTHER_APPS.test(hostOf(u))) return { ext: { name: strip(s.name || hostOf(u)), how: strip(s.title || s.description || ''), androidTvUrl: s.androidTvUrl || '', url: u, from: label(a) } };
    return { info: { from: label(a), text: strip(s.title || s.description || s.name || '') } };
  }
  if (!s.url) return { info: { from: label(a), text: strip(s.title || s.description || s.name || '') } };
  if (!DIRECT.test(s.url) || STREMIO_SERVER.test(s.url)) return { drop: 'torrent' };
  const wl = bh.countryWhitelist;
  if (Array.isArray(wl) && wl.length && ctx.region && !wl.map((x) => String(x).toLowerCase()).includes(ctx.region)) return { drop: 'country' };
  const claim = readName(s);
  const filename = bh.filename || '';
  const ident = filename ? `${filename}|${bh.videoSize || claim.size || ''}` : bh.bingeGroup ? `${bh.bingeGroup}|${s.title || s.description || ''}` : `${s.name || ''}|${s.title || s.description || ''}`;
  const copy = {
    id: `cp:${a.key}:${hashOf(ident)}`, key: `cp:${a.key}:${hashOf(ident)}`, source: label(a), addonKey: a.key, order: ctx.order,
    lang: claim.lang || ctx.origin || '', claim, checked: null, size: bh.videoSize || claim.size || 0, match: ctx.match, notReady: claim.notReady,
    binge: bh.bingeGroup || '', filename, headers: bh.proxyHeaders?.request || null,
    subs: (s.subtitles || []).filter((x) => x && DIRECT.test(x.url || '')).map((x) => ({ id: x.id, lang: x.lang, label: x.label || '' })),
  };
  Object.defineProperty(copy, 'url', { value: s.url, enumerable: false });   // a secret: never saved, never shown
  if (copy.subs.length) Object.defineProperty(copy, 'subUrls', { value: (s.subtitles || []).map((x) => x.url), enumerable: false });
  return { copy };
}
const OTHER_APPS = /(^|\.)(primevideo\.com|amazon\.[a-z.]+|netflix\.com|max\.com|hbomax\.com|disneyplus\.com|apple\.com|hulu\.com|peacocktv\.com|paramountplus\.com|play\.google\.com|youtube\.com|mubi\.com|viaplay\.[a-z]+|skyshowtime\.com)$/i;

// Asking: per title (a film's IMDb id, an episode's tt…:s:e), every enabled stream add-on for its type and prefix, all
// at once, 10 s each. Answers are kept 30 min (debrid links expire), the last 50 titles, in memory only.
const streamCache = new Map();   // `${type}:${id}` -> ask
// match: the title's IMDb match level ('sure' | 'likely'), origin: the film's original language (an unnamed copy's)
export function askStreams(type, id, { match = 'sure', origin = '' } = {}) {
  const ck = `${type}:${id}`;
  const hit = streamCache.get(ck);
  if (hit && Date.now() - hit.at < 30 * 60e3) { hit.match = match; return hit; }
  const who = enabled().filter((a) => supports(a, 'stream', type, id) && stateOf(a) !== 'setup');
  const q = { at: Date.now(), type, id, match, results: new Map(), listeners: new Set(), done: null };
  q.on = (f) => { q.listeners.add(f); return () => q.listeners.delete(f); };
  const changed = () => { for (const f of q.listeners) { try { f(q); } catch {} } emit('addon-streams', ck); };
  const ctx = { region: region(), origin };
  const all = who.map(async (a) => {
    const r = { a, state: isDown(a) ? 'down' : 'asking', copies: [], ext: [], info: [], trailers: [], details: [], dropped: { torrent: 0, country: 0, other: 0 } };
    q.results.set(a.key, r);
    if (r.state === 'down') return;
    try {
      const d = await ask(a, 'stream', type, id, null, 10000);
      for (const s of d?.streams || []) {
        if (!s || typeof s !== 'object') continue;
        const x = sort(s, a, { ...ctx, order: orderOf(a), match: q.match });
        if (x.copy) r.copies.push(x.copy); else if (x.ext) r.ext.push(x.ext); else if (x.info) { if (x.info.text) r.info.push(x.info); } else if (x.trailer) r.trailers.push(x.trailer); else if (x.detail) r.details.push(x.detail); else r.dropped[x.drop]++;
      }
      r.state = 'done';
      learn(a, r, (d?.streams || []).length);
    } catch (e) { r.state = e.kind === 'timeout' ? 'timeout' : 'failed'; }
    changed();
  });
  q.done = Promise.all(all).then(() => q);
  streamCache.set(ck, q);
  while (streamCache.size > 50) streamCache.delete(streamCache.keys().next().value);
  if (who.length) changed();
  return q;
}
export const forgetStreams = (type, id) => streamCache.delete(`${type}:${id}`);
// the add-on's kind, learnt from its answers (SPEC 3.1.1)
function learn(a, r, n) {
  if (!n) return;
  const k = (a.kind ||= {});
  k.n = (k.n || 0) + 1;
  if (r.copies.length) k.d = (k.d || 0) + 1;
  else if (r.ext.length) k.e = (k.e || 0) + 1;
  else if (r.info.length) k.i = (k.i || 0) + 1;
  else if (r.dropped.torrent) k.t = (k.t || 0) + 1;
  saveList();
}
// Who is still asking, for the pill-row slot and the one wait: never info-only, other-app-only or Not answering ones
export const stillAsking = (q) => (q ? [...q.results.values()].filter((r) => r.state === 'asking' && !neverWaited(r.a)).map((r) => label(r.a)) : []);
export const copiesOf = (q) => (q ? [...q.results.values()].flatMap((r) => r.copies) : []);

// Subtitles from add-ons (SPEC 7), for the subtitles work: every enabled subtitles add-on for this type and id, 8 s
// each. extras: { filename, videoSize, videoHash } from the copy (no link is opened). -> [{ from, subtitles: [...] }]
export async function askSubtitles(type, id, extras) {
  const who = enabled().filter((a) => supports(a, 'subtitles', type, id));
  return Promise.all(who.map(async (a) => {
    try { const d = await ask(a, 'subtitles', type, id, extras, 8000); return { from: label(a), key: a.key, subtitles: (d?.subtitles || []).filter((s) => s && DIRECT.test(s.url || '')) }; }
    catch (e) { return { from: label(a), key: a.key, error: e.kind }; }
  }));
}

// ---------- Stremio's own add-on list (SPEC 3.4): Cinemeta's addon_catalog ----------
export async function stremioList(which) {
  const a = cinemetaAddon();
  const d = await getJSON(resUrl(a, 'addon_catalog', 'all', which), { ms: 10000 });
  return (d?.addons || []).filter((x) => x?.transportUrl && x.manifest).map((x) => ({ url: x.transportUrl, manifest: x.manifest, desc: strip(x.manifest.description || '') }));
}

// ---------- the Stremio account (SPEC 3.3) ----------
// The key is kept like the provider's password (this account's storage), never logged, never shown.
const SKEY = () => scoped('stremio');
export const stremioSignedIn = () => !!(S.acc && store.get(SKEY(), null)?.authKey);
export const stremioState = () => (S.acc ? store.get(SKEY(), null) : null);
const setStremio = (v) => { if (v) store.set(SKEY(), v); else store.del(SKEY()); emit('addons'); };
const apiErr = (d) => d?.error ? Object.assign(new Error(d.error.message || 'Stremio said no'), { code: d.error.code, wrongEmail: !!d.error.wrongEmail }) : null;
export async function stremioCreateCode() {
  const d = await getJSON(`${STREMIO_LINK()}/api/v2/create?type=Create`, { ms: 10000 });
  if (!d?.result?.code) throw apiErr(d) || new Error('No code');
  return { code: d.result.code, link: d.result.link || `https://link.stremio.com/${d.result.code}`, at: Date.now() };
}
// null while nobody has signed in (Stremio's code 101), else the key (and it is stored)
export async function stremioReadCode(code) {
  const d = await getJSON(`${STREMIO_LINK()}/api/v2/read?type=Read&code=${encodeURIComponent(code)}`, { ms: 10000 });
  if (d?.result?.authKey) { setStremio({ authKey: d.result.authKey, at: Date.now(), keep: true }); return d.result.authKey; }
  return null;
}
export async function stremioLogin(email, password) {
  const d = await getJSON(`${STREMIO_API()}/api/login`, { ms: 15000, body: { type: 'Login', email, password, facebook: false } });
  const e = apiErr(d); if (e) throw e;
  if (!d?.result?.authKey) throw new Error('Stremio didn\'t sign you in');
  setStremio({ authKey: d.result.authKey, email: d.result.user?.email || email, at: Date.now(), keep: true });
  return true;
}
// Sign out: logout first, then forget the key (SPEC S11). keepAddons false removes the ones from Stremio too.
export async function stremioSignOut(keepAddons = true) {
  const s = stremioState();
  if (s?.authKey) { try { await getJSON(`${STREMIO_API()}/api/logout`, { ms: 8000, body: { type: 'Logout', authKey: s.authKey } }); } catch {} }
  setStremio(null);
  if (!keepAddons) { list = addons().filter((a) => a.from !== 'stremio'); saveList(); }
}
export const setKeepInStep = (v) => { const s = stremioState(); if (s) setStremio({ ...s, keep: !!v }); };
// Reads the collection (never writes it: no addonCollectionSet). -> { usable: [{ url, manifest, start }], left: [{ name, why }], total }
// A bad key ({"error":{"code":1}}) means he was signed out: the add-ons stay as they were.
export async function stremioCollection() {
  const s = stremioState();
  if (!s?.authKey) throw new Error('Not signed in');
  const d = await getJSON(`${STREMIO_API()}/api/addonCollectionGet`, { ms: 15000, body: { type: 'AddonCollectionGet', authKey: s.authKey, update: true } });
  if (d?.error?.code === 1) { setStremio({ ...s, signedOut: true }); throw Object.assign(new Error('Stremio signed you out'), { signedOut: true }); }
  const e = apiErr(d); if (e) throw e;
  const usable = [], left = [];
  for (const x of d?.result?.addons || []) {
    const url = String(x.transportUrl || ''), m = x.manifest || {};
    const why = /\/stremio\/v1\/?$/.test(url) ? 'an older kind of add-on; v3 does the same'
      : STREMIO_SERVER.test(url) ? 'needs the Stremio app on this TV'
      : /^ipf?n?s:\/\//i.test(url) || /^ip[fn]s:/i.test(url) ? 'a kind of link airglow can\'t open'
      : !(m.types || []).some((t) => t === 'movie' || t === 'series') ? ((m.types || []).some((t) => t === 'channel' || t === 'tv') ? 'channels aren\'t in airglow yet' : 'airglow doesn\'t show what it gives yet')
      : '';
    if (why) left.push({ name: decode(m.name || hostOf(url)), why });
    else usable.push({ url, manifest: m, start: !knownUnplayable(m) });
  }
  if (s.signedOut) setStremio({ ...s, signedOut: false });
  return { usable, left, total: (d?.result?.addons || []).length };
}
// an add-on known to give nothing playable here starts unticked (SPEC S20)
const knownUnplayable = (m) => !!m.behaviorHints?.p2p || /publicdomainmovies/i.test(m.id || '');
// Keeping in step: new ones at the end (a toast each), removed ones go if they came from Stremio; airglow's own choices
// (off, order, catalog switches) are kept by link hash. At start-up and on opening Add-ons, at most once a minute.
let lastSync = 0;
export async function stremioSync({ force = false, toast } = {}) {
  const s = stremioState();
  if (!s?.authKey || s.keep === false || s.signedOut) return null;
  if (!force && Date.now() - lastSync < 60e3) return null;
  lastSync = Date.now();
  let got;
  try { got = await stremioCollection(); } catch (e) { if (e.signedOut) emit('addons'); return null; }
  const l = addons(), keys = new Set();
  const added = [];
  for (const x of got.usable) {
    const key = 'ad' + hashOf(x.url);
    keys.add(key);
    const a = l.find((y) => y.key === key);
    if (a) { if (!a.manifest || Date.now() - (a.at || 0) > 24 * 3600e3) { a.manifest = x.manifest; a.at = Date.now(); } continue; }
    if (s.hidden?.includes(key)) continue;
    // the same add-on at a new address: its choices move over (same id, same host, a newer version)
    const old = l.find((y) => y.from === 'stremio' && y.manifest?.id === x.manifest.id && hostOf(y.url) === hostOf(x.url) && newer(x.manifest.version, y.manifest?.version) && !got.usable.some((z) => 'ad' + hashOf(z.url) === y.key));
    if (old) { old.key = key; old.url = x.url; old.manifest = x.manifest; old.at = Date.now(); continue; }
    l.push({ key, url: x.url, manifest: x.manifest, at: Date.now(), on: true, catalogs: defaultCatalogs(x.manifest), from: 'stremio', kind: {}, health: {} });
    added.push(decode(x.manifest.name));
  }
  for (let i = l.length - 1; i >= 0; i--) if (l[i].from === 'stremio' && !keys.has(l[i].key)) l.splice(i, 1);
  setStremio({ ...stremioState(), syncedAt: Date.now() });
  saveList();
  if (toast) for (const n of added) toast(`${n} came from your Stremio account`);
  return { added, got };
}
const newer = (a, b) => { const p = (v) => String(v || '0').split('.').map((x) => +x || 0); const x = p(a), y = p(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
// "Hide in airglow" for one from Stremio: it stays in his Stremio account and doesn't come back on the next sync
function hideFromStremio(a) { const s = stremioState(); if (s) setStremio({ ...s, hidden: [...new Set([...(s.hidden || []), a.key])] }); }
// The import (add-stremio-found): adds the ticked ones
export function importFromStremio(picked) {
  for (const x of picked) addAddon({ url: x.url, manifest: x.manifest }, 'stremio').from = 'stremio';
  const s = stremioState(); if (s) setStremio({ ...s, syncedAt: Date.now() });
  lastSync = Date.now();
  saveList();
}

// ---------- the phone page and other apps: native hooks (design/ui-v1/addons/PORT-NATIVE.md) ----------
// The page the TV serves on the home network (SPEC 3.5) and the safe intent launcher (SPEC 5.6) are native work; the
// app uses them once TunerPlayer.info() says so (phonePage, openApp).
export const phonePageReady = () => !!native?.info?.()?.phonePage && !!native?.phone;
export const openAppReady = () => !!native?.info?.()?.openApp && !!native?.openApp;
