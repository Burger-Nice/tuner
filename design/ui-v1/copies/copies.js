// The reference code for design/ui-v1/copies/RANKING.md: the one copy ranking, the one Play wait and the IMDb match
// levels, shared by design/ui-v1/subtitles and design/ui-v1/addons. Plain functions with no app imports, so the
// engineer can port them into app/tv/js and copies-test.js can prove them. If this file and RANKING.md ever differ,
// RANKING.md is the rule and this file is the bug.
// Started from design/ui-v1/addons/tools/copies.js (readName is unchanged); rank(), waitPlan(), matchLevel() and isDub()
// follow RANKING.md v1.0 (subtitles review 2, M3).

// ---------- RANKING.md 6: what a stream's name, description and file name claim (whole tokens only) ----------
// The file extension goes first, then the text is split on anything that isn't a letter or a digit, so ".ts" files,
// "DTS", "DVDRip", "HDRip", "webcam" and the "sd" inside words can't be misread.
const TOK = (s) => ` ${String(s || '').toLowerCase().replace(/\.(mkv|mp4|m4v|avi|ts|m2ts|webm|mov)\b/g, ' ').replace(/[^a-z0-9+]+/g, ' ')} `;
const has = (t, words) => words.some((w) => t.includes(` ${w} `));
function readName(stream) {
  const raw = [stream.name, stream.description || stream.title, stream.behaviorHints?.filename].filter(Boolean).join(' ');
  const t = TOK(raw);
  const c = {};
  c.res = has(t, ['2160p', '4k', 'uhd']) ? '4K' : has(t, ['1080p', '1080i', 'fhd']) ? '1080p' : has(t, ['720p']) ? '720p' : has(t, ['480p', '576p', 'sd']) ? 'SD' : '';
  c.dv = has(t, ['dv', 'dovi', 'dolby vision']) || / dolby vision /.test(t);
  c.hdr = has(t, ['hdr10+', 'hdr10plus']) ? 'HDR10+' : has(t, ['hdr10', 'hdr']) ? 'HDR10' : has(t, ['hlg']) ? 'HLG' : '';
  c.kind = has(t, ['cam', 'hdcam', 'camrip', 'ts', 'hdts', 'telesync', 'tc', 'telecine']) ? 'cinema'
    : has(t, ['remux', 'bluray', 'blu ray', 'bdrip', 'brrip', 'bdremux']) || / blu ray /.test(t) ? 'bluray'
    : has(t, ['web', 'webdl', 'web dl', 'webrip']) || / web dl /.test(t) ? 'web'
    : has(t, ['hdtv', 'pdtv', 'dsr']) ? 'tv' : has(t, ['dvdrip', 'dvd']) ? 'dvd' : '';
  c.remux = has(t, ['remux', 'bdremux']);
  const sz = stream.behaviorHints?.videoSize || ((m) => (m ? parseFloat(m[1]) * (/g/i.test(m[2]) ? 1e9 : 1e6) : 0))(String(raw).match(/(\d+(?:\.\d+)?)\s?(GB|MB)\b/i));
  c.size = sz || 0;
  c.lang = has(t, ['multi', 'dual']) ? 'Multi' : has(t, ['ita', 'italian']) ? 'Italian' : has(t, ['fre', 'french', 'vff', 'vf']) ? 'French' : has(t, ['ger', 'german']) ? 'German' : has(t, ['spa', 'spanish', 'latino']) ? 'Spanish' : '';
  c.dub = /með íslensku tali|islensku tali|\bisl(\.|\s)?tal\b|\bdubbed\b|\bdub\b/i.test(String(raw));   // RANKING.md 5: a name that says "dubbed"
  c.notReady = /⏳|\bdownload(ing)?\b/i.test(String(stream.name || ''));
  return c;
}

// ---------- RANKING.md 2: the one ranking ----------
// A copy: { id, source:'provider'|<add-on name>, order (add-on order, provider 0), lang, claim: readName(),
//   checked: { res, hdr, dv, dvProfile, mbps, plays, lang, len (s), subsInFile:[langs], ch (channels) } | null,
//   match:'sure'|'likely'|'unsure' (add-on copies), failed, notReady, pinned, size }
// ctx: { langs (Shown first, in order), speedMbps (Diag's last measured), dv7 (TV plays profile 7), runtime (s, IMDb),
//   playsNow(copy) -> true|false|undefined (decided now, from the stored formats and the audio route; RANKING.md 2 key 3) }
const CLASS = { '4K': 4, '1080p': 3, '720p': 2, SD: 1, '': 0 };
const KIND = { bluray: 3, web: 2, '': 1, tv: 0, dvd: 0, cinema: 0 };          // RANKING.md key 8: unknown above TV and DVD
// RANKING.md 2 key 10 and band b: the picture's bitrate. Checked: measured. Unchecked: estimated from size x 8 / IMDb
// runtime (add-ons review 2, S1), so the speed band and the bitrate key reach add-on copies before they have played.
function mbpsOf(c, ctx) {
  const k = c.checked; if (k && k.mbps) return { v: k.mbps, est: false };
  const size = c.size || c.claim.size || 0, rt = ctx.runtime || 0;
  return size && rt ? { v: (size * 8) / rt / 1e6, est: true } : { v: 0, est: true };
}
// Diag's last measured speed counts only when it is under 7 days old (add-ons review 2, S1); with none, there is no cap
const speedOf = (ctx) => (ctx.speedMbps && (!ctx.speedAgeDays || ctx.speedAgeDays <= 7) ? ctx.speedMbps : 0);
function facts(c, ctx) {
  const k = c.checked, m = mbpsOf(c, ctx), sp = speedOf(ctx);
  let cls = CLASS[(k && k.res) || c.claim.res || ''];
  if (k && k.mbps && ((cls === 4 && k.mbps < 8) || (cls === 3 && k.mbps < 2.5))) cls -= 1;   // a starved copy drops a class (measured only)
  const tooFast = !!(m.v && sp && m.v > 0.7 * sp);
  // range: Dolby Vision (the TV plays its profile) > HDR10 (HDR10+ counts as HDR10) > HLG > none.
  // A name claiming DV on a Blu-ray or remux counts as HDR10 until the check reads the profile (usually profile 7).
  const range = k ? (k.dv && (k.dvProfile !== 7 || ctx.dv7) ? 3 : k.hdr === 'HDR10' || k.hdr === 'HDR10+' ? 2 : k.hdr === 'HLG' ? 1 : 0)
    : (c.claim.dv && !(c.claim.kind === 'bluray' || c.claim.remux) ? 3 : c.claim.dv || c.claim.hdr ? 2 : 0);
  // sound: 7.1 > 5.1 > stereo; Atmos counts only when parsed (k.atmos)
  const sound = k ? (k.atmos ? 3 : k.ch >= 8 ? 2 : k.ch >= 6 ? 1 : 0) : 0;
  return { tooFast, cls, range, kind: KIND[c.claim.kind || ''], checked: !!k, mbps: m.v, sound, size: c.size || c.claim.size || 0 };
}
const langOf = (c) => (c.checked && c.checked.lang) || c.lang || c.claim.lang || '';
// key 4: the index in Shown first; Multi or unknown after his languages and before others
function langRank(c, langs) { const l = langOf(c); const i = langs.indexOf(l); return i >= 0 ? i : !l || l === 'Multi' ? langs.length : langs.length + 1; }
// key 3: plays on this TV, decided now. Unknown (unchecked) counts as playing.
const plays = (c, ctx) => { const v = ctx.playsNow ? ctx.playsNow(c) : c.checked ? c.checked.plays : undefined; return v === false ? false : true; };
// key 5: the main cut. ONE tolerance for "the same cut", everywhere: 5% (a PAL copy of the same cut runs 4% short).
// The main cut = within 5% of IMDb's runtime, else the most common checked length.
const CUT = 0.05;
function mainCut(copies, ctx) {
  const lens = copies.map((c) => c.checked && c.checked.len).filter(Boolean);
  const ref = ctx.runtime || (lens.length ? lens.map((l) => [l, lens.filter((m) => Math.abs(m - l) / l <= CUT).length]).sort((a, b) => b[1] - a[1])[0][0] : 0);
  return (len) => !len || !ref || Math.abs(len - ref) / ref <= CUT;
}
const cutLabel = (len, ref) => (!len || !ref || Math.abs(len - ref) / ref <= CUT ? '' : len > ref ? 'Longer cut' : 'Shorter cut');
// band (key 2): a fits; b faster than 0.7 x the measured speed; c add-on copy whose match isn't Sure; d cinema recording;
// e failed or not ready this session
const band = (c, f) => (c.failed || c.notReady ? 4 : c.claim.kind === 'cinema' ? 3 : c.source !== 'provider' && c.match !== 'sure' ? 2 : f.tooFast ? 1 : 0);
function rank(copies, ctx = {}) {
  const langs = ctx.langs || ['English'];
  const inMain = mainCut(copies, ctx);
  const key = (c) => {
    const f = facts(c, ctx);
    const pin = c.pinned && !c.failed && plays(c, ctx) ? 0 : 1;            // key 1: a pin that hasn't failed and plays now
    const subs = c.checked && (c.checked.subsInFile || []).some((l) => langs.includes(l)) ? 0 : 1;
    return [pin, band(c, f), plays(c, ctx) ? 0 : 1, langRank(c, langs), inMain(c.checked && c.checked.len) ? 0 : 1, -f.cls, c.source === 'provider' && !f.checked ? 1 : 0, -f.kind, -f.range, -f.mbps, -f.sound, subs, c.source === 'provider' ? 0 : 1, c.order || 0, -f.size];
  };
  return [...copies].sort((a, b) => { const x = key(a), y = key(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; });
}
// RANKING.md 2.1: what the Copies menu says about a pin that Play passes over
function pinNote(copies, ctx = {}) {
  const p = copies.find((c) => c.pinned); if (!p) return '';
  if (p.failed) return 'Your pick didn\'t play this time';
  if (!plays(p, ctx)) return 'Your pick has no sound on this TV right now';
  return '';
}

// ---------- RANKING.md 3: the one wait before Play ----------
// It never waits for a copy check, on any account. It waits (one 4 s budget from the press) only for stream add-ons
// that haven't answered, while the best copy in hand is below 4K and below the best its language could give.
// ctx: { best (the top copy now), asking: [add-ons still asking, not info-only, not marked Not answering],
//        uncheckedBetter (provider copies whose names claim better), maxCons, langBest ('4K' if any copy in his top
//        language could be 4K) }
function waitPlan({ best, asking = [], uncheckedBetter = [], maxCons = 1 } = {}) {
  void uncheckedBetter; void maxCons;                                       // never a reason to wait (RANKING.md 3.1)
  const bestCls = best ? ((best.checked && best.checked.res) || best.claim.res || '') : '';
  if (!asking.length || bestCls === '4K') return { wait: false, budgetMs: 0, for: [] };
  return { wait: true, budgetMs: 4000, for: asking.map((a) => a.name || a) };
}

// ---------- RANKING.md 4: the IMDb match levels (Sure / Likely / Unsure) ----------
// cand: ratings-file rows with this key (counted per key), year: the provider's or 0, tmdb/moviedb: ids when known,
// len: the provider copy's checked length (min), runtime: Cinemeta's (min), picked: his answer, kind: movie|series|episode
function matchLevel({ cand = [], year = 0, tmdb, moviedb, tvdb, tvdbMeta, len, runtime, picked, kind = 'movie', epLens = [] }) {
  if (picked) return 'sure';
  if (tmdb && moviedb && +tmdb === +moviedb) return 'sure';
  if (kind === 'series' && tvdb && tvdbMeta && +tvdb === +tvdbMeta) return 'sure';
  // "2+ rows" means 2+ rows within ± 1 year of the provider's year; with no year, any 2+ rows (one rule for both designs)
  const near = year ? cand.filter((r) => Math.abs(r.year - year) <= 1) : kind !== 'movie' ? cand : [];
  if (near.length !== 1) return 'unsure';                                     // none, or 2+; no year on a film is never enough
  if (kind === 'movie' && len && runtime) return Math.abs(len - runtime) / runtime <= 0.08 ? 'sure' : 'unsure';
  // a series: Cinemeta gives ONE runtime for the whole series, so one long or short episode decides nothing. Sure when
  // most (2 or more of the first 3) checked episodes are within 8% of it; otherwise it stays Likely (never Unsure by length)
  if (kind === 'series' && runtime && epLens.length >= 2) { const ok = epLens.slice(0, 3).filter((l) => Math.abs(l - runtime) / runtime <= 0.08).length; if (ok >= 2) return 'sure'; }
  return 'likely';
}
// an episode's own verdict: a length that doesn't match is that episode's note, never the series' level
const episodeNote = (lenMin, seriesRuntimeMin) => (lenMin && seriesRuntimeMin && Math.abs(lenMin - seriesRuntimeMin) / seriesRuntimeMin > 0.08 ? 'This episode\'s length doesn\'t match IMDb' : '');
// RANKING.md 4.2: what each level allows
const allows = (level) => ({
  subtitles: level === 'sure' || level === 'likely',                          // Likely downloads, and is re-checked when the length arrives
  addonCopiesEqual: level === 'sure',                                         // Likely: listed after the provider's, "might be another film"
  catalogMerge: level !== 'unsure',
  ask: level === 'unsure',
});
// when the copy's length arrives after a Likely match: keep, or drop with a one-line note
const recheck = (lenMin, runtimeMin) => (!lenMin || !runtimeMin ? 'keep' : Math.abs(lenMin - runtimeMin) / runtimeMin <= 0.08 ? 'sure' : 'drop');

// ---------- RANKING.md 5: a dub (subtitles default off; no which-film ask) ----------
// A dub is a copy whose sound language differs from the film's original language. Cinemeta has no language, so the
// original is taken as the languages of the countries it lists; when that can't be known, it isn't a dub.
const COUNTRY_LANG = { 'United States': ['English'], 'United Kingdom': ['English'], Canada: ['English', 'French'], Australia: ['English'], Ireland: ['English'], 'New Zealand': ['English'], Iceland: ['Icelandic'], France: ['French'], Germany: ['German'], Austria: ['German'], Spain: ['Spanish'], Mexico: ['Spanish'], Italy: ['Italian'], Sweden: ['Swedish'], Norway: ['Norwegian'], Denmark: ['Danish'], Finland: ['Finnish'], Poland: ['Polish'], Japan: ['Japanese'], 'South Korea': ['Korean'], China: ['Chinese'], India: ['Hindi'], Brazil: ['Portuguese'], Portugal: ['Portuguese'], Netherlands: ['Dutch'], Belgium: ['Dutch', 'French'], Switzerland: ['German', 'French', 'Italian'] };
function isDub({ sound, country = '', nameSaysDub = false }) {
  if (nameSaysDub) return true;
  if (!sound || !country) return false;
  const cs = String(country).split(',').map((s) => s.trim()).filter(Boolean);
  if (cs.some((c) => !COUNTRY_LANG[c])) return false;                         // a country we can't map: not sure, so not a dub
  return !cs.some((c) => COUNTRY_LANG[c].includes(sound));
}

// ---------- RANKING.md 2 band e: a copy that plays but is a placeholder (add-ons 8.2) ----------
// A film: under 50% of IMDb's runtime. An episode: under 50% of the provider episode's own length when there is one,
// else under an absolute floor of 3 minutes (never a fraction of the series runtime: specials and short episodes are real).
// The add-on's own ⏳ / "download" marker counts either way (readName().notReady).
const notReadyByLength = (lenSec, runtimeMin) => !!(lenSec && runtimeMin && lenSec < 0.5 * runtimeMin * 60);
function episodeNotReady({ lenSec, providerLenSec }) {
  if (!lenSec) return false;
  if (providerLenSec) return lenSec < 0.5 * providerLenSec;
  return lenSec < 180;
}

module.exports = { readName, rank, pinNote, waitPlan, matchLevel, episodeNote, allows, recheck, isDub, notReadyByLength, episodeNotReady, cutLabel, CUT };
