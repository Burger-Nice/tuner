// Rapt's UI sounds (design/sound-v2), for the Try Rapt page only. The same instant path as sfx.js: Android's SoundPool
// through the plugin (native.sfx; the files are tv/sounds/rapt/*.wav, which the plugin reads as "rapt/<name>"), and Web
// Audio where there is no plugin (a desktop browser, the tests). sound-v2's rules: v1's for when a sound plays (one
// per key, the 125 ms gate on a held key at 0.6 of the level, nothing while the player is up), but focus at rate 1 in
// every direction. The launch (Reel, Settle ending) plays through Web Audio, like the app's launch today.
import { native } from '../native.js';
import { settings } from '../state.js';
import { watching } from '../player.js';

const NAMES = ['focus', 'select', 'back', 'open', 'close', 'toggle-on', 'toggle-off'];
const GAP = { focus: 0, select: 120, back: 150, open: 200, close: 200, 'toggle-on': 150, 'toggle-off': 150 };
const LEVEL = { on: 1, quiet: 0.5, off: 0 };
const HELD_GATE = 125, HELD_GAIN = 0.6;

let nat = null;            // the names SoundPool has loaded (null: not asked yet)
let ctx = null;            // Web Audio: the browser fallback and the launch
const bufs = {}, last = {};
let heldAt = -1e9;

const level = () => LEVEL[settings().sounds || 'on'] ?? 1;
const quiet = () => !level() || document.hidden || watching();

export const raptSound = {
  // How they play on this device, for the readout: 'soundpool' | 'webaudio' | 'none' | 'loading'
  path() { if (native?.sfx) return nat == null ? 'loading' : nat.size ? 'soundpool' : 'webaudio'; return ctx ? 'webaudio' : 'none'; },
  init() {
    if (native?.sfx && nat == null) {
      nat = new Set();
      native.sfx.load(NAMES.map((n) => `rapt/${n}`)).then((r) => { nat = new Set((Array.isArray(r?.loaded) ? r.loaded : []).map((n) => String(n).replace(/^rapt\//, ''))); }).catch(() => {});
    }
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC({ latencyHint: 'interactive' });
    }
    if (ctx && !native?.sfx) for (const n of NAMES) if (!bufs[n]) load(n, `tv/sounds/rapt/${n}.wav`);
  },
  // Leaving the page: the Web Audio context goes (its buffers with it); SoundPool keeps its few kB until the app ends.
  close() {
    if (ctx) { ctx.close().catch(() => {}); ctx = null; }
    for (const k of Object.keys(bufs)) delete bufs[k];
    for (const k of Object.keys(loading)) delete loading[k];
  },
  play(name, { held = false } = {}) {
    if (!(name in GAP) || quiet()) return false;
    const now = performance.now();
    if (held) { if (now - heldAt < HELD_GATE) return false; heldAt = now; }
    if (now - (last[name] ?? -1e9) < GAP[name]) return false;
    last[name] = now;
    const gain = level() * (held ? HELD_GAIN : 1);
    if (nat?.has(name)) { native.sfx.play(`rapt/${name}`, 1, gain); return true; }
    if (native?.sfx && nat && !nat.size && ctx && !bufs[name]) load(name, `tv/sounds/rapt/${name}.wav`);   // (SoundPool refused them: Web Audio from the next press)
    return webPlay(bufs[name], gain);
  },
  // The launch sound, started in the frame the animation starts (its own Web Audio, closed again with the page)
  async launch() {
    if (quiet()) return false;
    raptSound.init();
    if (!ctx) return false;
    if (ctx.state === 'suspended') await Promise.race([ctx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 150))]);
    const b = bufs.reel || await Promise.race([load('reel', 'tv/rapt/sound/reel-settle.wav'), new Promise((r) => setTimeout(r, 600))]);
    return webPlay(b || bufs.reel, level());
  },
  preloadLaunch() { raptSound.init(); if (ctx && !bufs.reel) load('reel', 'tv/rapt/sound/reel-settle.wav'); },
};

const loading = {};
function load(name, url) {
  if (!loading[name]) loading[name] = fetch(url).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((buf) => { bufs[name] = buf; return buf; }).catch(() => { delete loading[name]; return null; });
  return loading[name];
}
function webPlay(b, gain) {
  if (!ctx || !b) return false;
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  const s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = b; g.gain.value = gain;
  s.connect(g); g.connect(ctx.destination);
  s.onended = () => { s.disconnect(); g.disconnect(); };
  s.start();
  return true;
}
