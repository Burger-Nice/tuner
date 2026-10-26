// airglow UI sounds v1.1: the reference player for the web UI (Chrome 113 WebView, Web Audio). Copy to app/tv/js/sfx.js and
// the WAVs from out/ to app/tv/sounds/. SOUND.md (Integration) says where each call goes. The same rules apply to a native
// SoundPool player: same files, same gains, same priorities, same rate limits.
//
//   sfx.init()                     once, at start-up: decodes every file (launch first), wakes on the first key
//   sfx.mode('on'|'quiet'|'off')   the Account setting (SOUND.md, Settings)
//   sfx.launch(t0)                 cold start: plays launch.wav in sync with the animation that began at t0 (performance.now())
//   sfx.request('select')          "play this unless something more important is requested in the same key press"; ignored unless a key
//                                  is down or was released < 300 ms ago, so an overlay opened by code never chimes
//   sfx.play('launch-wipe')        play now (wipe, brief, alert)
//   sfx.dir(k, repeat)             call for every direction key, before move(); stamps "this focus change was a key press"
//   sfx.focused(el)                call from one 'tvfocus' listener on #app; plays the tick (or nothing)
//   sfx.bump(repeat)               a direction key that could not move (optional, off by default)
//   sfx.zone('player')             the native player is on screen: the context is suspended and nothing plays; sfx.zone('ui') on return
const BASE = 'sounds/';
// p = priority inside one key press (the highest wins), cd = minimum ms between two plays of the same sound
const DEF = {
  launch: { p: 5 }, 'launch-full': { p: 5 }, 'launch-wipe': { p: 4 }, 'launch-brief': { p: 4 },
  focus: { p: 1, cd: 60 }, select: { p: 3, cd: 120 }, back: { p: 3, cd: 150 }, open: { p: 4, cd: 200 }, close: { p: 4, cd: 200 },
  'toggle-on': { p: 3, cd: 150 }, 'toggle-off': { p: 3, cd: 150 }, bump: { p: 1, cd: 400 }, alert: { p: 6, cd: 3000 },
};
const NO_KEY_NEEDED = new Set(['launch', 'launch-full', 'launch-wipe', 'launch-brief', 'alert']);
const LEVEL = { on: 1, quiet: 0.5, off: 0 };   // quiet = -6 dB
const REPEAT_EVERY = 125, REPEAT_GAIN = 0.6;    // a held key ticks about every 150 ms (a remote repeats every ~50 ms; a 125 ms gate passes every third repeat even with jitter, 6 to 8 a second) at -4.4 dB
const RATE = { up: 1.1225, down: 0.8409 };      // the focus tick is A5: up lands on B5, down on F#5, both in the key; left and right are the reference pitch
const KEY_WINDOW = 300;                         // ms after a key goes up in which request() is still honoured

let ctx = null, level = 'on', zone = 'ui', bumpOn = false;
const bufs = {}, loading = {}, last = {};
let pend = null, pendOpts = null, flushing = false;
let dirAt = -1e9, dirRepeat = false, dirKey = '', lastRepeatTick = -1e9;
let keysDown = 0, keyAt = -1e9;

export const sfx = {
  init(base = BASE, inline = null) {   // inline: { name: base64 WAV }, used by preview.html (file:// cannot fetch)
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC({ latencyHint: 'interactive' });   // the browser's own rate: Web Audio resamples a 48 kHz buffer for free
    const wake = () => { if (zone !== 'player' && ctx.state !== 'running') ctx.resume().catch(() => {}); };
    ['keydown', 'pointerdown'].forEach((ev) => document.addEventListener(ev, wake, true));
    document.addEventListener('keydown', (e) => { if (!e.repeat) keysDown++; keyAt = performance.now(); }, true);
    document.addEventListener('keyup', () => { keysDown = Math.max(0, keysDown - 1); keyAt = performance.now(); }, true);
    window.addEventListener('blur', () => { keysDown = 0; });
    // the launch files first: they are the ones needed before anyone has touched a key
    const first = ['launch', 'launch-brief', 'launch-wipe'], order = [...first, ...Object.keys(DEF).filter((n) => !first.includes(n))];
    for (const n of order) {
      const get = inline ? Promise.resolve(Uint8Array.from(atob(inline[n]), (c) => c.charCodeAt(0)).buffer) : fetch(`${base}${n}.wav`).then((r) => r.arrayBuffer());
      loading[n] = get.then((b) => ctx.decodeAudioData(b)).then((buf) => { bufs[n] = buf; }).catch(() => {});
    }
  },
  mode(m) { if (m in LEVEL) level = m; },
  bumpEnabled(on) { bumpOn = !!on; },
  // The native player is a separate surface on top of a WebView that stays awake: suspend the context so nothing can chime under it.
  zone(z) {
    zone = z;
    if (!ctx) return;
    if (z === 'player') ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {});
  },
  state: () => ({ ctx: ctx?.state, level, zone, loaded: Object.keys(bufs).length, baseLatency: ctx?.baseLatency, outputLatency: ctx?.outputLatency }),

  play(name, { rate = 1, gain = 1, cd, offset = 0 } = {}) {
    const d = DEF[name], b = bufs[name];
    if (!ctx || !d || !b || !LEVEL[level] || document.hidden) return false;
    if (zone === 'player') return false;
    if (ctx.state !== 'running') return false;   // a suspended context would play the sound late, in a burst: drop it
    const now = performance.now();
    if (now - (last[name] ?? -1e9) < (cd ?? d.cd ?? 0)) return false;
    last[name] = now;
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = b; s.playbackRate.value = rate; g.gain.value = LEVEL[level] * gain;
    s.connect(g); g.connect(ctx.destination);
    s.onended = () => { s.disconnect(); g.disconnect(); };
    s.start(0, offset);
    return true;
  },

  // The launch: the sound has to line up with the animation that began at t0. Whatever has already elapsed (waiting for the file to decode,
  // this call itself) plus the output latency is skipped from the start of the file; the first 100 ms of launch.wav are silent, so up to
  // ~100 ms of lateness costs nothing, and more than that cuts into the first note (capped at 280 ms, then the staircase is simply late).
  async launch(t0, name = 'launch') {
    if (!ctx) return false;
    await Promise.race([loading[name], new Promise((r) => setTimeout(r, 400))]);
    const late = (performance.now() - t0) / 1000 + (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
    return sfx.play(name, { offset: Math.min(0.28, Math.max(0, late)), cd: 0 });
  },

  // One key press can ask for several sounds (OK on a card: select; the card opens a sheet: open). The highest priority wins.
  request(name, opts) {
    const d = DEF[name]; if (!d) return;
    if (!NO_KEY_NEEDED.has(name) && !(keysDown > 0 || performance.now() - keyAt < KEY_WINDOW)) return;   // not caused by a key: stay silent
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
    if (dirRepeat) {                                         // held key: one tick per 125 ms, softer
      const now = performance.now();
      if (now - lastRepeatTick < REPEAT_EVERY) return;
      lastRepeatTick = now; gain *= REPEAT_GAIN;
    }
    // no two ticks identical, without going out of tune: +/- 0.3 % pitch (5 cents) and +/- 0.7 dB
    const rate = (RATE[dirKey] || 1) * (1 + (Math.random() - 0.5) * 0.006);
    gain *= Math.pow(10, (Math.random() - 0.5) * 1.4 / 20);
    sfx.play('focus', { rate, gain });
  },
  bump(repeat) { if (bumpOn && !repeat) sfx.play('bump'); },
};
