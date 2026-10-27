// The reference for SPEC 5.0 (the copy ranking shared with design/ui-v1/subtitles) and 11.4 (reading a copy's name).
// Plain functions, no app imports, so the engineer can port them into app/tv/js and tools/copies-test.js can prove them.

// ---------- 11.4: what a stream's name, description and file name claim (review S2: whole tokens only) ----------
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
  c.notReady = /⏳|\bdownload(ing)?\b/i.test(String(stream.name || ''));
  return c;
}

// ---------- 5.0.1: the one ranking (amends subtitles SPEC 5.4) ----------
// A copy: { source:'provider'|<add-on name>, order (add-on order, provider 0), checked:{res,hdr,dv,dvProfile,mbps,plays,len}|null,
//           claim: readName(), lang, match:'sure'|'likely', len (seconds, checked), failed, notReady, pinned }
const CLASS = { '4K': 4, '1080p': 3, '720p': 2, SD: 1, '': 0 };
const KIND = { bluray: 3, web: 2, tv: 1, dvd: 1, '': 0, cinema: -1 };
function facts(c, ctx) {
  const k = c.checked;
  let cls = CLASS[(k && k.res) || c.claim.res || ''];
  // a starved copy drops a class (subtitles 5.4)
  if (k && k.mbps && ((cls === 4 && k.mbps < 8) || (cls === 3 && k.mbps < 2.5))) cls -= 1;
  // review S3: a copy faster than 0.7 x the measured speed goes after every copy that fits (band 1 in rank())
  const tooFast = !!(k && k.mbps && ctx.speedMbps && k.mbps > 0.7 * ctx.speedMbps);
  // review S3: Dolby Vision on a Blu-ray/remux claim is usually profile 7: counted as HDR10 until the check reads the profile
  let range = k ? (k.dv && (k.dvProfile !== 7 || ctx.dv7) ? 3 : k.hdr === 'HDR10' || k.hdr === 'HDR10+' ? 2 : k.hdr === 'HLG' ? 1 : 0)
    : (c.claim.dv && !(c.claim.kind === 'bluray' || c.claim.remux) ? 3 : c.claim.dv || c.claim.hdr ? 2 : 0);
  return { tooFast, cls, range, kind: KIND[c.claim.kind || ''], checked: !!k, mbps: (k && k.mbps) || 0, size: c.size || c.claim.size || 0 };
}
function rank(copies, ctx = {}) {
  const langs = ctx.langs || ['English'];
  const lr = (c) => { const l = (c.checked && c.checked.lang) || c.lang || c.claim.lang; if (!l || l === 'Multi') return 1; const i = langs.indexOf(l); return i < 0 ? 9 : 0; };
  const band = (c, f) => (c.failed || c.notReady ? 4 : c.claim.kind === 'cinema' ? 3 : c.source !== 'provider' && c.match !== 'sure' ? 2 : f.tooFast ? 1 : 0);   // M4, M5, S3, cinema last
  const key = (c) => { const f = facts(c, ctx); return [c.pinned ? 0 : 1, band(c, f), lr(c), c.checked && c.checked.plays === false ? 1 : 0, -f.cls, f.checked ? 0 : 1, -f.kind, -f.range, -f.mbps, c.source === 'provider' ? 0 : 1, c.order || 0, -f.size]; };
  return [...copies].sort((a, b) => { const x = key(a), y = key(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; });
}

// ---------- 5.0.3: the match levels (amends subtitles 3.2) ----------
// cand: rows with this key (from the ratings file, counted per key), year: the provider's or 0, tmdb/moviedb: ids when known,
// len: the provider copy's checked length (min), runtime: Cinemeta's (min), picked: his answer
function matchLevel({ cand = [], year = 0, tmdb, moviedb, len, runtime, picked, kind = 'movie' }) {
  if (picked) return 'sure';
  if (tmdb && moviedb && +tmdb === +moviedb) return 'sure';
  const near = year ? cand.filter((r) => Math.abs(r.year - year) <= 1) : kind === 'series' ? cand : [];
  if (near.length !== 1) return 'unsure';                                     // none, or 2+ (review M5: no year on a film is never enough)
  if (len && runtime) return Math.abs(len - runtime) / runtime <= 0.08 ? 'sure' : 'unsure';   // the length agrees, or it's another film / cut
  return 'likely';
}

// ---------- 8.2: a copy that plays but is a placeholder (review M4) ----------
const notReadyByLength = (lenSec, runtimeMin) => !!(lenSec && runtimeMin && lenSec < 0.5 * runtimeMin * 60);

module.exports = { readName, rank, matchLevel, notReadyByLength };
