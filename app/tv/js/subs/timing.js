// The timing check (design/ui-v1/subtitles/SPEC.md 3.4): line a downloaded file up with the copy before it shows,
// anchored to the copy wherever possible. Plain functions, no app imports; about 15 ms per pair of 3,000-cue files.
//
// A file's timing is its cue starts (seconds, sorted). A fix is { speed, offset }: a cue at t shows at t * speed + offset.

export const SPEEDS = [1, 25 / 23.976, 23.976 / 25, 24 / 23.976, 23.976 / 24, 25 / 24, 24 / 25];
export const TOL = 0.3;            // one-to-one pairs within 0.3 s
export const ACCEPT = 0.4;         // the best must score 0.4 or more ...
export const RATIO = 2;            // ... and 2x the best wrong speed ...
export const THIRD = 0.3;          // ... and 0.3 or more in each third of the film
export const SKIP = 0.25;          // under this against an anchor, the file is another film or cut: skip it
export const MIN_SHIFT = 2;        // unanchored at the right speed, only an offset of 2 s or more moves the file
export const SPAN = 30;            // offsets searched: +- 30 s ...
export const BIN = 0.1;            // ... in 0.1 s bins

export const startsOf = (cues) => Float64Array.from(cues.map((c) => c.s)).sort();
const lowerBound = (a, x) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; } return lo; };

// The symmetric match: one-to-one pairs (ref start, candidate start * speed + offset) within TOL, divided by
// min(n_ref, n_cand). `lo`/`hi` limit it to the refs in [lo, hi) and the candidates that land there (the thirds).
export function score(ref, cand, speed, offset, lo = -Infinity, hi = Infinity) {
  let i = lowerBound(ref, lo), j = 0, pairs = 0, nr = 0, nc = 0;
  const iEnd = lowerBound(ref, hi);
  nr = iEnd - i;
  // the candidates that land inside [lo, hi)
  const m = (k) => cand[k] * speed + offset;
  while (j < cand.length && m(j) < lo) j++;
  const j0 = j;
  let jEnd = j; while (jEnd < cand.length && m(jEnd) < hi) jEnd++;
  nc = jEnd - j0;
  if (!nr || !nc) return 0;
  while (i < iEnd && j < jEnd) {
    const d = ref[i] - m(j);
    if (Math.abs(d) <= TOL) { pairs++; i++; j++; } else if (d < 0) i++; else j++;
  }
  return pairs / Math.min(nr, nc);
}

// The offset at one speed: a histogram of (ref start - cand start * speed) over +- SPAN s in BIN bins; its top 3 bins
// scored with the symmetric match. -> { offset, score }
export function bestOffset(ref, cand, speed) {
  const nb = Math.round((2 * SPAN) / BIN) + 1, h = new Uint32Array(nb);
  for (let j = 0; j < cand.length; j++) {
    const t = cand[j] * speed;
    for (let i = lowerBound(ref, t - SPAN); i < ref.length && ref[i] <= t + SPAN; i++) h[Math.round((ref[i] - t + SPAN) / BIN)]++;
  }
  const top = [];
  for (let b = 0; b < nb; b++) {
    if (top.length < 3 || h[b] > h[top[top.length - 1]]) { top.push(b); top.sort((x, y) => h[y] - h[x]); if (top.length > 3) top.pop(); }
  }
  let best = { offset: 0, score: 0 };
  for (const b of top) {
    const off = Math.round((b * BIN - SPAN) * 10) / 10, s = score(ref, cand, speed, off);
    if (s > best.score) best = { offset: off, score: s };
  }
  return best;
}

// Every speed, the winner, the best wrong speed, and the winner in each third of the reference's span.
// -> { speed, offset, score, wrong, ratio, thirds: [a, b, c] }
export function compare(ref, cand) {
  if (!ref.length || !cand.length) return { speed: 1, offset: 0, score: 0, wrong: 0, ratio: 0, thirds: [0, 0, 0] };
  const all = SPEEDS.map((speed) => ({ speed, ...bestOffset(ref, cand, speed) }));
  const win = all.reduce((a, b) => (b.score > a.score ? b : a));
  // a wrong speed: every speed but the winner (the 1.0x vs 25/23.976 kind of difference, never the winner itself)
  const wrong = Math.max(...all.filter((x) => x !== win).map((x) => x.score));
  const a = ref[0], L = ref[ref.length - 1] - a;
  const thirds = [0, 1, 2].map((k) => score(ref, cand, win.speed, win.offset, k ? a + (k * L) / 3 : -Infinity, k < 2 ? a + ((k + 1) * L) / 3 : Infinity));
  return { speed: win.speed, offset: win.offset, score: win.score, wrong, ratio: wrong ? win.score / wrong : Infinity, thirds };
}
export const accepted = (r) => r.score >= ACCEPT && r.score >= RATIO * r.wrong && r.thirds.every((t) => t >= THIRD);

// The length bound (SPEC 3.4.3): the last cue within 60 s of the one before it starts, after the fix, before the
// copy's end + 2%. True when the copy's length isn't known.
export function fitsLength(cues, fix, copyLen) {
  if (!copyLen || !cues.length) return true;
  let last = cues[cues.length - 1];
  for (let i = cues.length - 1; i > 0; i--) if (cues[i].s - cues[i - 1].s <= 60) { last = cues[i]; break; }
  return last.s * fix.speed + fix.offset <= copyLen * 1.02;
}

// A file's release (SPEC v1.1 M2): movieReleaseName, lowercased, with the HI / SDH / CC tokens and the extension
// removed. Two files of one release are the same timing, so they are never a pair.
export const releaseOf = (f) => String(f.movieReleaseName || f.subtitleFileName || '').toLowerCase()
  .replace(/\.(srt|vtt|sub|ass|ssa|txt)$/, '').replace(/(^|[^a-z0-9])(hi|sdh|cc)(?=[^a-z0-9]|$)/g, '$1').replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');

const near = (a, b) => Math.abs(a - b) < 1e-6;
const isPal = (speed) => !near(speed, 1);

// ---------- the whole check for one file (SPEC 3.4, the anchor table) ----------
// file:    { id, cues, release, fps (its fpsMilli / 1000, or 0), m ('h' = made for this copy) }
// ctx:     { copyFps (from the check, 0 if unknown), copyLen (s, 0 if unknown),
//            hashFile (a downloaded file with m 'h', any language, or null),
//            others (other downloaded files, any language, for the reference pair) }
// -> { verdict, anchored, speed, offset, skip, words, why: {...numbers} }
//   verdict: 'made' (the fingerprint file itself) | 'lined' (lined up with this copy, anchored) |
//            'pair' (lined up with other subtitles) | 'fixed' (timing fixed to fit this film) | 'unchecked' |
//            'skip' (another film or cut, against an anchor: try the next file)
export const WORDS = {
  made: 'Made for this copy', lined: 'Lined up with this copy', pair: 'Lined up with other subtitles',
  fixed: 'Timing fixed to fit this film', unchecked: 'Timing not checked', skip: 'Skipped: these looked like another film',
};
const out = (verdict, fix, why = {}) => ({ verdict, anchored: verdict === 'made' || verdict === 'lined', speed: fix.speed, offset: fix.offset, skip: verdict === 'skip', words: WORDS[verdict], why });
const NONE = { speed: 1, offset: 0 };

// Two other files that agree: different releases, 0.4+ and 2x the wrong speeds between them. The first such pair in
// the order given (the caller lists the best files first). -> { a, b, r } | null
export function findPair(files, cache = new Map()) {
  for (let i = 0; i < files.length; i++) for (let j = i + 1; j < files.length; j++) {
    const a = files[i], b = files[j];
    if (!a.release || a.release === b.release) continue;
    const k = `${a.id}|${b.id}`;
    if (!cache.has(k)) cache.set(k, compare(startsOf(a.cues), startsOf(b.cues)));
    const r = cache.get(k);
    if (r.score >= ACCEPT && r.score >= RATIO * r.wrong) return { a, b, r };
  }
  return null;
}

export function checkFile(file, ctx = {}) {
  const { copyLen = 0, hashFile = null, others = [] } = ctx;
  if (file.m === 'h') return out('made', NONE);
  const cand = startsOf(file.cues);
  // 1. the fingerprint file (any language) is the copy's own timing: any speed, any offset, and a tick
  if (hashFile && hashFile.id !== file.id) {
    const r = compare(startsOf(hashFile.cues), cand), fix = { speed: r.speed, offset: r.offset };
    if (accepted(r) && fitsLength(file.cues, fix, copyLen)) return out('lined', fix, r);
    return out(r.score < SKIP ? 'skip' : 'unchecked', NONE, r);
  }
  // 2. two other files that agree, scaled to the copy's frame rate
  const pool = others.filter((f) => f.id !== file.id && f.release !== file.release && f.cues?.length);
  const pair = findPair(pool, ctx.pairCache);
  if (pair) {
    // The pair's own rate: the one of its files whose fpsMilli is known (the add-on's 23976 on most), with a pair that
    // agrees at a PAL speed taken at the first file's. The copy's rate from the check; when it isn't known yet the
    // pair's rate is assumed (most copies are 23.976) and the check runs again when the copy's rate arrives.
    const pairFps = pair.a.fps || (isPal(pair.r.speed) ? 0 : pair.b.fps) || 23.976;
    const copyFps = ctx.copyFps || pairFps;
    const k = pairFps / copyFps;                      // a 23.976 pair on a 25 fps copy: 23.976 / 25
    const ref = startsOf(pair.a.cues).map((t) => t * k);
    const r = compare(ref, cand);
    const speedFix = isPal(r.speed);
    const fix = speedFix ? { speed: r.speed, offset: r.offset } : { speed: 1, offset: Math.abs(r.offset) >= MIN_SHIFT ? r.offset : 0 };
    const why = { ...r, pair: [pair.a.id, pair.b.id], pairScore: pair.r.score, copyFps: ctx.copyFps || 0, assumedFps: !ctx.copyFps };
    if (accepted(r) && fitsLength(file.cues, fix, copyLen)) return out(speedFix ? 'fixed' : 'pair', fix, why);
    return out(r.score < SKIP ? 'skip' : 'unchecked', NONE, why);
  }
  // 3. no anchor: shown as downloaded
  return out('unchecked', NONE);
}

// Where a cue shows with the automatic fix and his own steps (Early or late, in 0.5 s steps).
export const shown = (t, fix, mine = 0) => t * fix.speed + fix.offset + mine;
