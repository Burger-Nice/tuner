// Skip intro / recap and where the credits start (design/ui-v1/skip/SPEC.md): an episode's or a film's segments from
// TheIntroDB (community timestamps, by IMDb id and season/episode), kept 30 days per title on the TV (a miss for a day).
//   segmentsFor({ imdb, season, episode, durationMs }) -> { intro, recap, credits, preview } (each [{ start, end }] in ms;
//   a credits or preview end of 0 runs to the end) | null (not in the database, not answering)
import { store } from './state.js';

const BASE = () => store.get('introBase', 'https://api.theintrodb.org/v4');   // (tuner.introBase: a fake one in the tests)
const KEEP = 30 * 864e5, MISS = 864e5;
const mem = new Map();
const keyOf = ({ imdb, season, episode }) => `intro:${imdb}:${season ?? ''}:${episode ?? ''}`;

// one clean list: an intro or recap needs its end (a missing start is the file's start), credits and previews need their
// start (a missing end is the end of the file); 0/0 is "confirmed absent" and is dropped
function clean(list, endRequired) {
  return (Array.isArray(list) ? list : []).map((x) => ({ start: x?.start_ms == null ? null : +x.start_ms, end: x?.end_ms == null ? null : +x.end_ms }))
    .filter((x) => (endRequired ? x.end > 0 : x.start != null && x.start >= 0) && !(x.start === 0 && x.end === 0) && !(x.end != null && x.start != null && x.end <= x.start))
    .map((x) => ({ start: x.start ?? 0, end: x.end ?? 0 }))
    .sort((a, b) => a.start - b.start);
}
export function parseSegments(d) {
  if (!d || typeof d !== 'object') return null;
  const out = { intro: clean(d.intro, true), recap: clean(d.recap, true), credits: clean(d.credits, false), preview: clean(d.preview, false) };
  return out.intro.length || out.recap.length || out.credits.length || out.preview.length ? out : null;
}

export async function segmentsFor(q) {
  if (!q?.imdb || !/^tt\d{5,10}$/.test(q.imdb)) return null;
  const k = keyOf(q);
  const hit = mem.get(k) || (await window.Core?.cache?.get(k).catch?.(() => null)) || null;
  if (hit && Date.now() - hit.at < (hit.v ? KEEP : MISS)) { mem.set(k, hit); return hit.v; }
  const p = new URLSearchParams({ imdb_id: q.imdb });
  if (q.season != null) { p.set('season', q.season); p.set('episode', q.episode); }
  if (q.durationMs > 0) p.set('duration_ms', Math.round(q.durationMs));
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(`${BASE()}/media?${p}`, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (r.status === 404) { keep(k, null); return null; }
    if (!r.ok) return hit?.v || null;   // (busy or down: what we had, asked again next time)
    const v = parseSegments(await r.json());
    keep(k, v);
    return v;
  } catch { return hit?.v || null; } finally { clearTimeout(t); }
}
function keep(k, v) { const rec = { at: Date.now(), v }; mem.set(k, rec); window.Core?.cache?.set(k, rec); }
