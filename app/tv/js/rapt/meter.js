// The Try Rapt page's numbers: frame times while the picture fades and while focus moves along a shelf, the pictures
// the page holds, and the WebView's own JS heap figure where it gives one. Only numbers leave (reportFacts), never a
// link or a title (design/ui-v1/error-reports/SPEC.md; report-scrub.js's 'manual' schema lists each one).
const blank = () => ({ n: 0, frames: 0, sum: 0, max: 0, long: 0 });
const KINDS = ['fade', 'move', 'launch'];
export const stats = { fade: blank(), move: blank(), launch: blank() };
const until = { fade: 0, move: 0, launch: 0 };
let raf = 0, lastT = 0;

// kind: 'fade' (the canvas cross-fade), 'move' (focus moving, a held key) or 'launch'. ms: how long to watch from now.
export function watch(kind, ms) {
  const now = performance.now();
  if (now >= until[kind]) stats[kind].n++;
  until[kind] = Math.max(until[kind], now + ms);
  if (!raf) { lastT = 0; raf = requestAnimationFrame(tick); }
}
function tick(t) {
  raf = 0;
  if (lastT) {
    const dt = t - lastT;
    for (const k of KINDS) {
      if (t > until[k] + 20) continue;
      const s = stats[k];
      s.frames++; s.sum += dt; s.max = Math.max(s.max, dt);
      if (dt > 50) s.long++;
    }
  }
  lastT = t;
  if (t < Math.max(until.fade, until.move, until.launch) + 20) raf = requestAnimationFrame(tick);
}
export function stopWatching() { if (raf) cancelAnimationFrame(raf); raf = 0; until.fade = until.move = until.launch = 0; }
export function resetStats() { for (const k of KINDS) stats[k] = blank(); }
const avg = (s) => (s.frames ? s.sum / s.frames : 0);
const r1 = (x) => Math.round(x * 10) / 10;

// The JS heap as the WebView reports it (Chromium's performance.memory: rounded, and only this page's JS, not the
// pictures' decoded pixels). null where there's no such figure.
export function heap() {
  const m = performance?.memory;
  if (!m || !m.usedJSHeapSize) return null;
  return { used: Math.round(m.usedJSHeapSize / 1048576), limit: Math.round(m.jsHeapSizeLimit / 1048576) };
}
// Pictures this page holds: loaded <img> elements with a picture in them, split into backdrops and posters
export function held(root) {
  const n = { backdrops: 0, posters: 0, waiting: 0 };
  for (const img of root.querySelectorAll('img[src]')) {
    const done = img.complete && img.naturalWidth > 0;
    if (!done) { n.waiting++; continue; }
    if (img.closest('.r-bd')) n.backdrops++; else n.posters++;
  }
  return n;
}

export function lines(root, extra) {
  const f = stats.fade, m = stats.move, l = stats.launch, h = heap(), p = held(root);
  return [
    `Fades <b>${f.n}</b> · worst <b>${Math.round(f.max)}</b> · avg <b>${r1(avg(f))}</b> ms`,
    `Moves · worst <b>${Math.round(m.max)}</b> · avg <b>${r1(avg(m))}</b> ms`,
    `Launch · worst <b>${Math.round(l.max)}</b> · avg <b>${r1(avg(l))}</b> ms`,
    `Frames over 50 ms <b>${f.long + m.long + l.long}</b>`,
    `Pictures held <b>${p.backdrops}</b> big · <b>${p.posters}</b> posters`,
    h ? `JS heap <b>${h.used}</b> of ${h.limit} MB` : 'Memory: not reported here',
    extra.speech,
    extra.sound,
  ];
}

// What a report from this page carries: numbers and fixed words only
export function reportFacts(root, extra) {
  const f = stats.fade, m = stats.move, l = stats.launch, h = heap(), p = held(root);
  return {
    raptFades: f.n, raptFadeMax: Math.round(f.max), raptFadeAvg: r1(avg(f)), raptFadeFrames: f.frames,
    raptMoveMax: Math.round(m.max), raptMoveAvg: r1(avg(m)), raptMoveFrames: m.frames, raptLaunchMax: Math.round(l.max), raptLaunchAvg: r1(avg(l)), raptSlowFrames: f.long + m.long + l.long,
    raptBackdrops: p.backdrops, raptPosters: p.posters,
    raptHeapMb: h ? h.used : undefined, raptHeapLimitMb: h ? h.limit : undefined,
    raptSpeech: extra.speech, raptSounds: extra.sounds, raptSoundPath: extra.soundPath,
    raptFilms: extra.films, raptSeries: extra.series, raptPlays: extra.plays,
  };
}
