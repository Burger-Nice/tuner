// UI sounds (design/sound-v1, SOUND.md): the launch, focus moves, OK, Back, sheets opening and closing, toggles. Web Audio,
// with the sound set's rules: one sound per key press (the most important wins), minimum gaps, held keys tick softly every
// ~150 ms, nothing that a key didn't cause, and nothing at all while the native player is on screen (it plays its own alert).
//   sfx.init()  sfx.mode('on' | 'quiet' | 'off')  sfx.launch(t0)  sfx.play(name)  sfx.request(name)  sfx.dir(k, repeat)
//   sfx.focused(el)  sfx.zone('player' | 'ui')
import { native } from './native.js';
const BASE = 'tv/sounds/';
// p = priority inside one key press (the highest wins), cd = minimum ms between two plays of the same sound
const DEF = {
  'launch-full': { p: 5 }, 'launch-brief': { p: 4 },
  focus: { p: 1, cd: 60 }, select: { p: 3, cd: 120 }, back: { p: 3, cd: 150 }, open: { p: 4, cd: 200 }, close: { p: 4, cd: 200 },
  'toggle-on': { p: 3, cd: 150 }, 'toggle-off': { p: 3, cd: 150 },
};
const NO_KEY_NEEDED = new Set(['launch-full', 'launch-brief']);
const LEVEL = { on: 1, quiet: 0.5, off: 0 };   // quiet = -6 dB
const REPEAT_EVERY = 125, REPEAT_GAIN = 0.6;    // a held key: every third ~50 ms repeat, softer
const RATE = { up: 1.1225, down: 0.8409 };      // the tick is A5: up lands on B5, down on F#5, both in the key
const KEY_WINDOW = 300;                         // ms after a key in which request() is still honoured

let ctx = null, level = 'on', zone = 'ui';
// On the TV the key sounds go through Android's SoundPool (native.sfx): the WebView's audio path sits a buffer behind it,
// and that delay is what made the sounds trail the remote. The launch stays on Web Audio, which can start part-way in.
let nat = false;
const bufs = {}, loading = {}, last = {};
let pend = null, pendOpts = null, flushing = false;
let dirAt = -1e9, dirRepeat = false, dirKey = '', lastRepeatTick = -1e9;
let keysDown = 0, keyAt = -1e9;

export const sfx = {
  init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC({ latencyHint: 'interactive' });
    const wake = () => { if (zone !== 'player' && ctx.state !== 'running') ctx.resume().catch(() => {}); };
    ['keydown', 'pointerdown'].forEach((ev) => document.addEventListener(ev, wake, true));
    // Keys held now or a moment ago: what lets request() play. The remote's Back arrives as a made-up keydown with no
    // keyup, so made-up events only count as "a key a moment ago", and a count left over after 1 s of no keys is cleared.
    document.addEventListener('keydown', (e) => { if (e.isTrusted && !e.repeat) keysDown++; keyAt = performance.now(); }, true);
    document.addEventListener('keyup', (e) => { if (e.isTrusted) keysDown = Math.max(0, keysDown - 1); keyAt = performance.now(); }, true);
    window.addEventListener('blur', () => { keysDown = 0; });
    // the launch first; the reduced-motion one only when that's what will play
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const order = [reduce ? 'launch-brief' : 'launch-full', ...Object.keys(DEF).filter((n) => !n.startsWith('launch'))];
    if (native?.sfx) native.sfx.load(order.filter((n) => !n.startsWith('launch'))).then((r) => { nat = r?.loaded > 0; }).catch(() => {});
    for (const n of order) loading[n] = fetch(`${BASE}${n}.wav`).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((buf) => { bufs[n] = buf; }).catch(() => {});
  },
  mode(m) { if (m in LEVEL) level = m; },
  level: () => level,
  // For Account > Sound: whether the TV's audio is up and how many sounds loaded.
  status: () => ({ audio: ctx ? ctx.state : 'none', loaded: Object.keys(bufs).length, total: Object.keys(DEF).length - 1, native: nat }),
  // The WebView stays awake under the native player: suspend so nothing can chime over the programme.
  zone(z) {
    zone = z;
    if (!ctx) return;
    if (z === 'player') ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {});
  },

  play(name, { rate = 1, gain = 1, cd, offset = 0 } = {}) {
    const d = DEF[name], b = bufs[name];
    if (!d || !LEVEL[level] || document.hidden || zone === 'player') return false;
    const viaNative = nat && !NO_KEY_NEEDED.has(name);
    if (!viaNative && (!ctx || !b || ctx.state !== 'running')) return false;
    const now = performance.now();
    if (now - (last[name] ?? -1e9) < (cd ?? d.cd ?? 0)) return false;
    last[name] = now;
    if (viaNative) { native.sfx.play(name, rate, LEVEL[level] * gain); return true; }
    const s = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime, v = LEVEL[level] * gain;
    s.buffer = b; s.playbackRate.value = rate;
    // Started part-way into the file (a late launch): fade in over 4 ms so it can't click.
    if (offset > 0) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.004); } else g.gain.value = v;
    s.connect(g); g.connect(ctx.destination);
    s.onended = () => { s.disconnect(); g.disconnect(); };
    s.start(0, offset);
    return true;
  },

  // The launch sound lines up with the animation that began at t0: time already gone is skipped from the start of the file
  // (its first 100 ms are silent). Half the reported output latency is added: the TV delays its picture too, and a sound
  // ahead of the picture is noticed sooner than one behind it.
  // The owner's choice: the long launch (with the warm swell and the breath), and no sound on the wipe.
  async launch(t0, name = 'launch-full') {
    if (!ctx || !LEVEL[level]) return false;
    await Promise.race([loading[name], new Promise((r) => setTimeout(r, 400))]);
    if (ctx.state === 'suspended') await Promise.race([ctx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 150))]);
    const late = (performance.now() - t0) / 1000 + 0.5 * ((ctx.outputLatency || 0) + (ctx.baseLatency || 0));
    return sfx.play(name, { offset: Math.min(0.28, Math.max(0, late)), cd: 0 });
  },

  // One key press can ask for several sounds (OK on a row that opens a sheet: select, then open): the highest priority wins.
  request(name, opts) {
    const d = DEF[name];
    if (!d) return;
    if (keysDown > 0 && performance.now() - keyAt > 1000) keysDown = 0;
    if (!NO_KEY_NEEDED.has(name) && !(keysDown > 0 || performance.now() - keyAt < KEY_WINDOW)) return;   // not caused by a key
    if (!pend || d.p >= DEF[pend].p) { pend = name; pendOpts = opts; }
    if (flushing) return;
    flushing = true;
    queueMicrotask(() => { flushing = false; const n = pend, o = pendOpts; pend = pendOpts = null; if (n) sfx.play(n, o); });
  },

  // ---- focus ticks: dir() before every key-driven move, focused() from one tvfocus listener
  dir(k, repeat) { dirAt = performance.now(); dirRepeat = !!repeat; dirKey = k; },
  focused(el) {
    if (performance.now() - dirAt > 80) return;   // a focus change no direction key caused (a sheet opening, a screen loading)
    let gain = 1;
    if (el?.closest?.('.kb, .kbrow')) gain = 0.5;  // the on-screen keyboard: half level
    if (dirRepeat) {
      const now = performance.now();
      if (now - lastRepeatTick < REPEAT_EVERY) return;
      lastRepeatTick = now; gain *= REPEAT_GAIN;
    }
    // no two ticks identical, without going out of tune: +/- 5 cents and +/- 0.7 dB
    const rate = (RATE[dirKey] || 1) * (1 + (Math.random() - 0.5) * 0.006);
    gain *= Math.pow(10, ((Math.random() - 0.5) * 1.4) / 20);
    sfx.play('focus', { rate, gain });
  },
};
