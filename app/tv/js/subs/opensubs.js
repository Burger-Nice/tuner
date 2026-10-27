// OpenSubtitles through Stremio's public add-on (opensubtitles-v3.strem.io), and choosing among its files
// (design/ui-v1/subtitles/SPEC.md 3.1, 3.3, 10.2). Plain functions with no app imports; fetch is passed in.
import { langName } from './lang.js';
import { releaseOf } from './timing.js';

export const ADDON = 'https://opensubtitles-v3.strem.io';
export const LIST_TIMEOUT = 8000;          // "Add-on down or slow (8 s)"
export const MAX_FILE = 2 * 1024 * 1024;   // a file over 2 MB is dropped

// /subtitles/movie/tt15398776.json, /subtitles/series/tt11280740:1:1.json, and with the copy's fingerprint
// /subtitles/movie/tt15398776/videoHash=<16 hex>&videoSize=<bytes>.json (the add-on lists files "made for this copy",
// "m":"h", first; an unknown fingerprint just returns the IMDb list).
export function listUrl({ imdb, season, episode, hash, size, base = ADDON }) {
  if (!/^tt\d{5,10}$/.test(String(imdb || ''))) return '';
  const ep = season != null && episode != null && season !== '' && episode !== '';
  const id = ep ? `${imdb}:${+season}:${+episode}` : imdb;
  const extra = hash && /^[0-9a-f]{16}$/.test(hash) && size > 0 ? `/videoHash=${hash}&videoSize=${size}` : '';
  return `${base}/subtitles/${ep ? 'series' : 'movie'}/${id}${extra}.json`;
}

// An episode a file name names: S01E08, s1.e8, 1x08, "Season 1 Episode 8" -> [{ s, e }] (a double episode gives two)
export function namedEpisodes(name) {
  const t = String(name || ''), out = [];
  let m = /(?:^|[^a-z0-9])s(\d{1,2})[ ._-]?e(\d{1,3})(?:(?:[ ._-]?e|-)(\d{1,3}))?(?![0-9])/i.exec(t);
  if (m) { out.push({ s: +m[1], e: +m[2] }); if (m[3] && +m[3] > +m[2] && +m[3] - +m[2] < 4) for (let e = +m[2] + 1; e <= +m[3]; e++) out.push({ s: +m[1], e }); return out; }
  m = /(?:^|[^a-z0-9])(\d{1,2})x(\d{2,3})(?![0-9])/i.exec(t);
  if (m) return [{ s: +m[1], e: +m[2] }];
  m = /season[ ._-]?(\d{1,2})[ ._-]*episode[ ._-]?(\d{1,3})/i.exec(t);
  if (m) return [{ s: +m[1], e: +m[2] }];
  return out;
}
// A file for another episode (verified: Severance S1 E1's list has "Severance - 01x08 - ...").
export function wrongEpisode(f, season, episode) {
  if (season == null || episode == null) return false;
  const eps = [...namedEpisodes(f.subtitleFileName), ...namedEpisodes(f.movieReleaseName)];
  return eps.length > 0 && !eps.some((x) => x.s === +season && x.e === +episode);
}

// The add-on's rows -> files: { id, url, code, lang (the app's name, '' if unknown), m, fileName, release, fps,
// order (the add-on's), nameSounds }
export function normalise(list, { season, episode } = {}) {
  const rows = Array.isArray(list?.subtitles) ? list.subtitles : [];
  const out = [];
  rows.forEach((r, i) => {
    if (!r || !r.url || !r.lang) return;
    if (wrongEpisode(r, season, episode)) return;
    const fileName = String(r.subtitleFileName || '');
    // (the format is sniffed from the body once downloaded, not from the name: the add-on converts some files)
    out.push({
      id: String(r.id || r.url), url: String(r.url), code: String(r.lang), lang: langName(r.lang), m: r.m === 'h' ? 'h' : String(r.m || ''),
      fileName, release: releaseOf(r), fps: +r.fpsMilli > 0 ? +r.fpsMilli / 1000 : 0, order: i,
      nameSounds: /(^|[^a-z0-9])(hi|sdh|cc)([^a-z0-9]|$)/i.test(fileName.replace(/\.(srt|vtt)$/i, '')),
    });
  });
  return out;
}

export async function fetchList(q, { fetch = globalThis.fetch, timeout = LIST_TIMEOUT } = {}) {
  const url = listUrl(q);
  if (!url) return { ok: false, why: 'no id', files: [] };
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) return { ok: false, why: `answered ${r.status}`, files: [] };
    const j = await r.json();
    return { ok: true, files: normalise(j, q), maxAge: +j.cacheMaxAge || 0 };
  } catch (e) {
    return { ok: false, why: ctl.signal.aborted ? 'slow' : String(e.message || e), files: [] };
  } finally { clearTimeout(t); }
}

// A file's body: text (UTF-8 from the add-on), at most 2 MB. -> { ok, bytes } | { ok:false, why }
export async function fetchFile(url, { fetch = globalThis.fetch, timeout = 15000 } = {}) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) return { ok: false, why: `answered ${r.status}` };
    const len = +r.headers.get('content-length') || 0;
    if (len > MAX_FILE) return { ok: false, why: 'too big' };
    const b = new Uint8Array(await r.arrayBuffer());
    if (b.length > MAX_FILE) return { ok: false, why: 'too big' };
    return { ok: true, bytes: b };
  } catch (e) {
    return { ok: false, why: ctl.signal.aborted ? 'slow' : String(e.message || e) };
  } finally { clearTimeout(t); }
}

// ---------- ranking within a language (SPEC 3.3) ----------
// 1. made for this copy ("m":"h"); 2. not a file with sounds, unless he prefers them (the name, or, once downloaded,
// 8%+ of its cues); 3. fpsMilli within 0.1% of the copy's frame rate; 4. the add-on's order.
export function rankFiles(files, { preferSounds = false, copyFps = 0 } = {}) {
  const snd = (f) => (f.sounds ?? f.nameSounds) ? 1 : 0;
  const key = (f) => [f.m === 'h' ? 0 : 1, preferSounds ? 1 - snd(f) : snd(f), copyFps && f.fps && Math.abs(f.fps - copyFps) / copyFps <= 0.001 ? 0 : 1, f.order];
  return [...files].sort((a, b) => { const x = key(a), y = key(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; });
}
export function byLang(files) {
  const m = new Map();
  for (const f of files) { if (!f.lang || f.dropped) continue; if (!m.has(f.lang)) m.set(f.lang, []); m.get(f.lang).push(f); }
  return m;
}

// ---------- what shows (SPEC 3.1) ----------
// prefs: { mode: 'always'|'foreign'|'off', langs: [subtitle languages in order], shown: [Shown first], sounds, online }
// copy:  { soundLang, dub, inFile: [{ lang, forced, tagged }] }
// files: the add-on's files (normalised; dropped ones are skipped)
// -> { on: { lang, source: 'file'|'opensubtitles', track?, file? } | null, offReason, perLang: [{ lang, source, track?, files }],
//      ready: [other languages ready], missing: [his languages with none] }
export function choose(prefs, copy = {}, files = [], opts = {}) {
  const langs = prefs.langs?.length ? prefs.langs : prefs.shown || ['English'];
  const groups = byLang(prefs.online === false ? [] : files);
  const full = (copy.inFile || []).filter((t) => !t.forced && t.lang);
  const perLang = langs.map((lang) => {
    const track = full.find((t) => t.lang === lang);
    if (track) return { lang, source: 'file', track, files: groups.get(lang) || [] };
    const fs = rankFiles(groups.get(lang) || [], { preferSounds: !!prefs.sounds, copyFps: opts.copyFps || 0 });
    return fs.length ? { lang, source: 'opensubtitles', file: fs[0], files: fs } : { lang, source: '', files: [] };
  });
  const have = perLang.filter((p) => p.source);
  const first = have[0] || null;
  let offReason = '';
  if (prefs.mode === 'off') offReason = 'off';
  else if (copy.dub) offReason = 'dub';                   // a dub isn't the translation the subtitles were made from
  else if (prefs.mode === 'foreign' && copy.soundLang && (prefs.shown || []).includes(copy.soundLang)) offReason = 'your language';
  const on = !offReason && first ? { lang: first.lang, source: first.source, track: first.track, file: first.file } : null;
  return { on, offReason, perLang, ready: have.filter((p) => p !== first).map((p) => p.lang), missing: perLang.filter((p) => !p.source).map((p) => p.lang) };
}

// ---------- which files to download for the title page (SPEC 3.5: up to 4, about 1 MB) ----------
// the best file of each of his first two languages that the copy's file doesn't have, plus the timing reference: the
// fingerprint file (any language) or, failing that, two more files of two other releases (his languages first, then
// English, then the most listed) so every file shown has a pair of others to be checked against.
export function downloadPlan(prefs, copy, files, opts = {}) {
  const c = choose(prefs, copy, files, opts);
  const want = [];
  const add = (f) => { if (f && !want.includes(f) && want.length < 4) want.push(f); };
  for (const p of c.perLang.slice(0, 2)) if (p.source === 'opensubtitles') add(p.file);
  const usable = files.filter((f) => !f.dropped && f.lang);
  const hashFile = usable.find((f) => f.m === 'h');
  if (hashFile) add(hashFile);
  else {
    const counts = byLang(usable);
    // his languages first (a pair there is downloaded anyway), then English (the most timed), then the most listed
    const mine = [...(prefs.langs?.length ? prefs.langs : prefs.shown || []), 'English'];
    const order = [...counts.keys()].sort((a, b) => { const x = mine.indexOf(a), y = mine.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y) || counts.get(b).length - counts.get(a).length; });
    // the pair: two releases that are neither each other's nor any file above's (each file is checked against two
    // OTHER files that agree), with a known frame rate first (the reference is scaled by it)
    const taken = new Set(want.map((f) => f.release));
    for (const lang of order) {
      const fs = rankFiles(counts.get(lang), { copyFps: opts.copyFps || 0 }).filter((f) => f.release && !taken.has(f.release) && !want.includes(f)).sort((a, b) => (b.fps > 0) - (a.fps > 0));
      const pick = [], rel = new Set();
      for (const f of fs) { if (!rel.has(f.release)) { pick.push(f); rel.add(f.release); } if (pick.length === 2) break; }
      if (pick.length === 2 && want.length <= 2) { pick.forEach(add); break; }
    }
  }
  return { choice: c, files: want };
}
