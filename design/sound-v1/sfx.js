// airglow UI sounds: the reference player for the web UI (Chrome 113 WebView, Web Audio). Copy to app/tv/js/sfx.js and
// the WAVs from out/ to app/tv/sounds/. SOUND.md (Integration) says where each call goes. The same rules apply to a native
// SoundPool player: same files, same gains, same priorities, same rate limits.
//
//   sfx.init()               once, at start-up: decodes every file (about 0.5 MB of PCM), wakes on the first key
//   sfx.mode('on'|'quiet'|'off')   the Account setting (SOUND.md, Settings)
//   sfx.request('select')    "play this unless something more important is requested in the same key press"
//   sfx.play('launch')       play now (launch, wipe, alert)
//   sfx.dir(k, repeat)       call for every direction key, before move(); stamps "this focus change was a key press"
//   sfx.focused(el)          call from one 'tvfocus' listener on #app; plays the tick (or nothing)
//   sfx.bump(repeat)         a direction key that could not move (optional, off by default)
const BASE = 'sounds/';
// p = priority inside one key press (the highest wins), cd = minimum ms between two plays of the same sound
const DEF = {
  launch: { p: 5 }, 'launch-wipe': { p: 4 }, 'launch-brief': { p: 4 },
  focus: { p: 1, cd: 60 }, select: { p: 3, cd: 120 }, back: { p: 3, cd: 150 }, open: { p: 4, cd: 200 }, close: { p: 4, cd: 200 },
  'toggle-on': { p: 3, cd: 150 }, 'toggle-off': { p: 3, cd: 150 }, bump: { p: 1, cd: 400 }, alert: { p: 6, cd: 3000 },
};
const LEVEL = { on: 1, quiet: 0.5, off: 0 };   // quiet = -6 dB
const REPEAT_EVERY = 150, REPEAT_GAIN = 0.6;    // a held key ticks every 150 ms at -4.4 dB, not every 50 ms
const RATE = { up: 1.059, down: 0.944 };        // +/- one semitone for vertical moves; left and right are the reference pitch

let ctx = null, level = 'on', zone = 'ui', bumpOn = false;
const bufs = {}, last = {};
let pend = null, pendOpts = null, flushing = false;
let dirAt = -1e9, dirRepeat = false, dirKey = "", lastRepeatTick = -1e9;

export const sfx = {
  init(base = BASE, inline = null) {   // inline: { name: base64 WAV }, used by preview.html (file:// cannot fetch)
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC({ latencyHint: 'interactive', sampleRate: 48000 });   // the files are 48 kHz: no resampling
    const wake = () => { if (ctx.state !== 'running') ctx.resume().catch(() => {}); };
    ['keydown', 'pointerdown'].forEach((ev) => document.addEventListener(ev, wake, true));
    for (const n of Object.keys(DEF)) {
      const get = inline ? Promise.resolve(Uint8Array.from(atob(inline[n]), (c) => c.charCodeAt(0)).buffer) : fetch(`${base}${n}.wav`).then((r) => r.arrayBuffer());
      get.then((b) => ctx.decodeAudioData(b)).then((buf) => { bufs[n] = buf; }).catch(() => {});
    }
  },
  mode(m) { if (m in LEVEL) level = m; },
  zone(z) { zone = z; },                       // 'player': nothing but the alert plays
  bumpEnabled(on) { bumpOn = !!on; },
  state: () => ({ ctx: ctx?.state, level, loaded: Object.keys(bufs).length, baseLatency: ctx?.baseLatency, outputLatency: ctx?.outputLatency }),

  play(name, { rate = 1, gain = 1, cd } = {}) {
    const d = DEF[name], b = bufs[name];
    if (!ctx || !d || !b || !LEVEL[level] || document.hidden) return false;
    if (zone === 'player' && name !== 'alert') return false;
    if (ctx.state !== 'running') return false;   // a suspended context would play the sound late, in a burst: drop it
    const now = performance.now();
    if (now - (last[name] ?? -1e9) < (cd ?? d.cd ?? 0)) return false;
    last[name] = now;
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = b; s.playbackRate.value = rate; g.gain.value = LEVEL[level] * gain;
    s.connect(g); g.connect(ctx.destination);
    s.onended = () => { s.disconnect(); g.disconnect(); };
    s.start();
    return true;
  },

  // One key press can ask for several sounds (OK on a card: select; the card opens a sheet: open). The highest priority wins.
  request(name, opts) {
    const d = DEF[name]; if (!d) return;
    if (!pend || d.p >= DEF[pend].p) { pend = name; pendOpts = opts; }
    if (flushing) return;
    flushing = true;
    queueMicrotask(() => { flushing = false; const n = pend, o = pendOpts; pend = pendOpts = null; if (n) sfx.play(n, o); });
  },

  // ---- focus ticks
  dir(k, repeat) { dirAt = performance.now(); dirRepeat = !!repeat; dirKey = k; },
  focused(el) {
    if (performance.now() - dirAt > 80) return;             // not from a key press (a sheet taking focus, a screen loading, Back restoring)
    let gain = 1;
    if (el?.closest?.('.kb')) gain = 0.5;                    // the on-screen keyboard: half level (SOUND.md, On-screen keyboard)
    if (dirRepeat) {                                         // held key: one tick per 150 ms, softer
      const now = performance.now();
      if (now - lastRepeatTick < REPEAT_EVERY) return;
      lastRepeatTick = now; gain *= REPEAT_GAIN;
    }
    const jitter = 1 + (Math.random() - 0.5) * 0.02;         // +/- 1 %: no two ticks identical
    sfx.play('focus', { rate: (RATE[dirKey] || 1) * jitter, gain });
  },
  bump(repeat) { if (bumpOn && !repeat) sfx.play('bump'); },
};
