#!/usr/bin/env node
// airglow sound set v1.2: a small deterministic synthesizer. No dependencies, no samples, no randomness except a seeded PRNG.
//   node design/sound-v1/synth.js            renders every sound to design/sound-v1/out/*.wav (48 kHz, 16-bit, mono)
//   node design/sound-v1/synth.js focus      renders only the named sounds
// It also writes out/manifest.json (timing, gain, rate limits for the engineer), out/report.txt (the measured numbers)
// and out/sounds.js (the WAVs as base64, so preview.html works from file://).
//
// THE RECIPES ARE DATA (the RECIPES table below). To change a sound, edit its numbers and run the script again;
// every file is normalised to its own loudness target (`m`, momentary LUFS) and capped at its peak ceiling (`ceil`).
//
// Musical rules (SOUND.md, Concept): one key (D major pentatonic: D E F# A B), one timbre family (soft glass:
// a sine with a few weak partials), and a stepped echo (discrete repeats, never a reverb wash) as the sonic
// equivalent of the three stepped bands: "a signal travels and leaves an afterimage".
//   up a fifth = forward / confirm   down a fifth = back
//   a breath rising to F#5 = open    a breath falling to D5 = close
//   lit (bright, with an echo) = on  dim (dark, no echo) = off
'use strict';
const fs = require('fs');
const path = require('path');

const SR = 48000;
const OUT = path.join(__dirname, 'out');

// ---------------------------------------------------------------- notes (D major pentatonic, equal temperament, A4 = 440)
const NOTE = { D4: 293.665, A4: 440, D5: 587.330, E5: 659.255, 'F#5': 739.989, A5: 880, B5: 987.767, D6: 1174.659, E6: 1318.510, 'F#6': 1479.978, A6: 1760, E7: 2637.021 };

// ---------------------------------------------------------------- timbres: [ratio, amplitude, decay multiplier]
// v1.1: the detuned twin is now 1.0012 at 0.13 (v1 had 1.0035 at 0.45, which beat at 2 to 5 Hz in the tails: a warble, which is the shimmer the brand refuses).
const GLASS = [[1, 1, 1], [2, 0.26, 0.55], [3, 0.09, 0.38], [4.17, 0.05, 0.22], [1.0012, 0.13, 1.0]];   // the signature: a sine, a soft octave, a trace of "tink", a barely-detuned twin
const SOFT = [[1, 1, 1], [2, 0.18, 0.5], [3, 0.04, 0.3]];                                               // rounder, for navigation
const TICK = [[1, 1, 1], [2, 0.15, 0.5]];                                                              // the focus tick: a near-pure sine; the touch comes from the grain
const BRIGHT = [[1, 1, 1], [2, 0.42, 0.6], [3, 0.2, 0.45], [4.17, 0.08, 0.25], [1.0012, 0.13, 1.0]];   // the Sharp dialect: same notes, tighter and brighter
const WARM = [[1, 1, 1], [2, 0.75, 0.9], [3, 0.4, 0.8], [4, 0.12, 0.7], [1.0012, 0.15, 1.0]];          // the low swell (launch-full only): its upper partials carry it on a small speaker

// ---------------------------------------------------------------- the recipes
// dur: file length (s). tail: final raised-cosine fade (s). lp/hp: master filters (Hz). m: target momentary LUFS (400 ms
// K-weighted max). ceil: sample-peak ceiling (dBFS). meta: how the app should use it.
// A tone layer: { type:'tone', t, f, gain, att, tau, partials, glide?, bend?, dur?, rel?, lp?, echo?, choke? }
//    tau > 0: a struck note (attack, then exponential decay). no tau: a swell (attack, hold, release over `rel`).
//    glide: { to: Hz, time: s }   bend: semitones the pitch starts above f and falls with time constant `bendTau`
//    echo: [{ d: s, g: gain, lp: Hz }]   discrete repeats, each one darker: the afterimage
//    choke: true  each repeat REPLACES the one before (a 5 ms fade of the dry note, and of every repeat but the last, at the next repeat's
//           start), so the repeats read as steps and not as a tail. Spacing: the band spacing x 3, so two more staircases follow the first.
// A noise layer: { type:'noise', t, dur, gain, f0, f1, q, peak (0..1, where the swell peaks), tau? (struck), att?, lp? }
const STAIR = (t0, step, notes, gain, extra) => notes.map((n, i) => ({
  type: 'tone', t: t0 + i * step, f: NOTE[n], gain: gain[i], att: extra.att, tau: extra.tau, dur: extra.dur, partials: extra.partials, lp: extra.lp,
  choke: true, echo: extra.echo,
}));
const CHORD = (t0, g, tau, att, partials, echo) => [['D5', 0.90, 0], ['F#5', 0.85, 0.012], ['A5', 1.0, 0.024], ['E6', 0.42, 0.040]].map(([n, v, off]) => ({
  type: 'tone', t: t0 + off, f: NOTE[n], gain: v * g, att, tau, dur: 1.0, partials, lp: 6500, choke: true, echo,
}));
const RECIPES = {
  // ---- launch: synced to launch.css. Bands step out 100/190/280 ms, the wedge settles 700-1400, letters 880-1720,
  //      the lockup is whole at ~1.5 s, the app wipes at 2.0 s (launch-wipe is a separate file, played when the wipe starts).
  // v1.1/v1.2: the default launch is the two gestures that carry the identity (the staircase and the chord) with a soft swell bridging the gap: heard on every cold start.
  launch: {
    dur: 2.2, tail: 0.20, hp: 150, lp: 8500, m: -31, ceil: -11,
    meta: { cls: 'hero', prio: 5, note: 'cold start only: sfx.launch(t0) in the same frame that launch.js adds l-run; never loops; if the launch holds (not ready at 2 s) it simply ends in silence' },
    layers: [
      // the three bands step out (100 / 190 / 280 ms, the CSS times): D5 F#5 A5. Each repeats at +270 ms and +540 ms (3 x the 90 ms band spacing, darker):
      // the first staircase is followed by two quieter ones, each replacing the last (choke), so you hear three steps and their afterimage
      ...STAIR(0.100, 0.090, ['D5', 'F#5', 'A5'], [0.95, 1.05, 1.15], { att: 0.007, tau: 0.16, dur: 0.9, partials: GLASS, lp: 6500, echo: [{ d: 0.320, g: 0.30, lp: 4200 }, { d: 0.640, g: 0.13, lp: 3000 }] }),
      // the lockup is whole (the last letter is ~80 % in at 1.5 s): D5 F#5 A5 E6 struck together, 12 ms between voices so it blooms, one short decay, two darker repeats
      // v1.2: a soft swell under the wedge bridges the gap between the staircase and the chord (about -25 dB, no plateau); no breath
      { type: 'tone', t: 0.60, f: NOTE.D4, gain: 0.10, att: 0.24, rel: 0.62, dur: 1.45, partials: WARM, lp: 2600 },
      { type: 'tone', t: 0.66, f: NOTE.A4, gain: 0.07, att: 0.24, rel: 0.62, dur: 1.45, partials: WARM, lp: 2600 },
      ...CHORD(1.52, 0.75, 0.14, 0.012, GLASS, [{ d: 0.220, g: 0.30, lp: 3800 }, { d: 0.440, g: 0.13, lp: 2800 }]),
    ],
  },

  // the long version, kept as an option (SOUND.md, Launch): adds the warm swell under the wedge and the breath under the letters.
  'launch-full': {
    dur: 2.4, tail: 0.25, hp: 150, lp: 8500, m: -31, ceil: -11,
    meta: { cls: 'hero', prio: 5, note: 'optional long launch, same sync as launch; swap the file name to use it' },
    layers: [
      ...STAIR(0.100, 0.090, ['D5', 'F#5', 'A5'], [0.95, 1.05, 1.15], { att: 0.007, tau: 0.16, dur: 0.9, partials: GLASS, lp: 6500, echo: [{ d: 0.320, g: 0.30, lp: 4200 }, { d: 0.640, g: 0.13, lp: 3000 }] }),
      { type: 'tone', t: 0.60, f: NOTE.D4, gain: 0.24, att: 0.24, rel: 0.62, dur: 1.45, partials: WARM, lp: 2600 },
      { type: 'tone', t: 0.66, f: NOTE.A4, gain: 0.17, att: 0.24, rel: 0.62, dur: 1.45, partials: WARM, lp: 2600 },
      { type: 'noise', t: 0.86, dur: 0.80, gain: 0.7, f0: 1500, f1: 4200, q: 1.1, peak: 0.72, lp: 5000 },
      { type: 'tone', t: 0.88, f: NOTE.D5, gain: 0.10, att: 0.30, rel: 0.45, dur: 0.95, glide: { to: NOTE.A5, time: 0.80 }, partials: [[1, 1, 1], [2, 0.12, 1]] },
      ...CHORD(1.52, 0.75, 0.14, 0.012, GLASS, [{ d: 0.220, g: 0.30, lp: 3800 }, { d: 0.440, g: 0.13, lp: 2800 }]),
    ],
  },

  // the wipe (2000-2500): air, not a swoosh. Starts when the app starts the 8 degree slab; it follows the wipe's slow-fast-slow easing.
  'launch-wipe': {
    dur: 0.56, tail: 0.14, hp: 200, lp: 7000, m: -34, ceil: -16,
    meta: { cls: 'hero', prio: 4, note: 'play when launch.js adds l-wiping (also when the launch was held: it plays when the wipe really starts)' },
    layers: [
      { type: 'noise', t: 0.02, dur: 0.50, gain: 1, f0: 650, f1: 3800, q: 1.3, peak: 0.55, lp: 5500 },
      { type: 'tone', t: 0.10, f: NOTE.A4, gain: 0.10, att: 0.14, rel: 0.25, dur: 0.46, glide: { to: NOTE.D6, time: 0.40 }, partials: [[1, 1, 1], [2, 0.1, 1]] },
    ],
  },

  // reduced motion (wedge alone, then a 120 ms fade): just the resolve, played WITH the fade (finish()), because that is when something happens on screen
  'launch-brief': {
    dur: 1.0, tail: 0.20, hp: 150, lp: 8500, m: -32, ceil: -11,
    meta: { cls: 'hero', prio: 4, note: 'reduced-motion launch: play in finish() together with l-fading, not at begin()' },
    layers: [...CHORD(0.04, 0.9, 0.14, 0.018, GLASS, [{ d: 0.220, g: 0.30, lp: 3800 }, { d: 0.440, g: 0.13, lp: 2800 }])],
  },

  // ---- navigation
  // focus: the most frequent sound. A fingertip on glass, 45 ms. Nearly subliminal. Pitched per direction in the player: up = B5, down = F#5 (SOUND.md, Held keys).
  // v1.1: more tactile (a stronger grain, a nearly pure tone) so it is a touch, not a pip.
  focus: {
    dur: 0.055, tail: 0.014, hp: 200, lp: 8000, m: -43, ceil: -14,
    meta: { cls: 'nav', prio: 1, cooldownMs: 60, repeatEveryMs: 125, repeatGain: 0.6, rateUp: 1.1225, rateDown: 0.8409, note: 'only on a key-driven move that changed focus; held keys: see SOUND.md, Held keys' },
    layers: [
      { type: 'tone', t: 0, f: NOTE.A5, gain: 1, att: 0.0018, tau: 0.0105, dur: 0.052, partials: TICK },
      { type: 'noise', t: 0, dur: 0.02, gain: 0.70, f0: 2600, f1: 2600, q: 1.1, peak: 0.1, tau: 0.003, att: 0.0006 },
    ],
  },

  // select / OK: a rising fifth (D5 then A5, 60 ms apart: audible as a gesture, not a blip), one soft echo on the last note. "Forward".
  select: {
    dur: 0.150, tail: 0.050, hp: 180, lp: 8000, m: -37, ceil: -12,
    meta: { cls: 'nav', prio: 3, cooldownMs: 120, note: 'OK on anything that is not a toggle, not a keyboard key, and does not open a layer (those have their own sound)' },
    layers: [
      { type: 'tone', t: 0, f: NOTE.D5, gain: 0.8, att: 0.0025, tau: 0.030, dur: 0.1, partials: SOFT },
      { type: 'tone', t: 0.060, f: NOTE.A5, gain: 1.0, att: 0.0025, tau: 0.032, dur: 0.09, partials: SOFT, echo: [{ d: 0.045, g: 0.20, lp: 3200 }] },
      { type: 'noise', t: 0, dur: 0.02, gain: 0.10, f0: 2400, f1: 2400, q: 1.1, peak: 0.1, tau: 0.003, att: 0.0006 },
    ],
  },

  // back: the mirror of select: a falling fifth (A5 then D5, 62 ms apart), a little darker, no echo. "Back out".
  back: {
    dur: 0.150, tail: 0.050, hp: 180, lp: 6200, m: -38, ceil: -13,
    meta: { cls: 'nav', prio: 3, cooldownMs: 150, note: 'Back that closes a page or goes back; silent when Back leaves the app; never on a held Back' },
    layers: [
      { type: 'tone', t: 0, f: NOTE.A5, gain: 0.85, att: 0.003, tau: 0.030, dur: 0.1, partials: SOFT, lp: 4200 },
      { type: 'tone', t: 0.062, f: NOTE.D5, gain: 1.0, att: 0.003, tau: 0.032, dur: 0.088, partials: SOFT, lp: 4200 },
    ],
  },

  // open: a sheet or menu slides in. v1.1: led by a breath that rises 600 -> 3000 Hz and lands on F#5. "In".
  open: {
    dur: 0.160, tail: 0.060, hp: 180, lp: 7000, m: -38, ceil: -14,
    meta: { cls: 'nav', prio: 4, cooldownMs: 200, note: 'in openOverlay(); replaces the select sound for the OK that opened it' },
    layers: [
      { type: 'noise', t: 0, dur: 0.115, gain: 1.0, f0: 600, f1: 3000, q: 1.0, peak: 0.6, lp: 5000 },
      { type: 'tone', t: 0.090, f: NOTE['F#5'], gain: 0.85, att: 0.004, tau: 0.032, dur: 0.07, partials: SOFT, echo: [{ d: 0.04, g: 0.18, lp: 3000 }] },
    ],
  },

  // close: the breath falls 3000 -> 600 Hz and lands on D5, a little darker. "Out".
  close: {
    dur: 0.140, tail: 0.050, hp: 180, lp: 6200, m: -39, ceil: -15,
    meta: { cls: 'nav', prio: 4, cooldownMs: 200, note: 'in closeTop() (Back closed a sheet), NOT in closeOverlay(): a pick that closes a menu is an OK' },
    layers: [
      { type: 'noise', t: 0, dur: 0.095, gain: 1.0, f0: 3000, f1: 600, q: 1.0, peak: 0.4, lp: 4000 },
      { type: 'tone', t: 0.070, f: NOTE.D5, gain: 0.85, att: 0.004, tau: 0.030, dur: 0.07, partials: SOFT, lp: 4200 },
    ],
  },

  // toggles: lit = on (bright E6 with a stepped echo: the afterimage), dim = off (a darker B5, no echo)
  'toggle-on': {
    dur: 0.115, tail: 0.040, hp: 200, lp: 8500, m: -37, ceil: -13,
    meta: { cls: 'nav', prio: 3, cooldownMs: 150, note: 'a Settings toggle turned on' },
    layers: [
      { type: 'tone', t: 0, f: NOTE.E6, gain: 1, att: 0.0025, tau: 0.030, dur: 0.1, partials: [[1, 1, 1], [2, 0.2, 0.5], [3, 0.06, 0.3]], echo: [{ d: 0.050, g: 0.30, lp: 3800 }] },
      { type: 'tone', t: 0, f: NOTE.A5, gain: 0.35, att: 0.0025, tau: 0.026, dur: 0.1, partials: SOFT },
    ],
  },
  'toggle-off': {
    dur: 0.085, tail: 0.035, hp: 180, lp: 4800, m: -39, ceil: -15,
    meta: { cls: 'nav', prio: 3, cooldownMs: 150, note: 'a Settings toggle turned off' },
    layers: [
      { type: 'tone', t: 0, f: NOTE.B5, gain: 1, att: 0.003, tau: 0.024, dur: 0.08, partials: [[1, 1, 1], [2, 0.14, 0.5]], lp: 3000 },
    ],
  },

  // bump: "can't go further". A soft, dull knock (E4 with a small pitch drop). Optional, off by default (SOUND.md, Bump).
  bump: {
    dur: 0.075, tail: 0.022, hp: 170, lp: 3200, m: -42, ceil: -15,
    meta: { cls: 'nav', prio: 1, cooldownMs: 400, note: 'optional (off by default): a NEW key press that could not move; never a held key' },
    layers: [
      { type: 'tone', t: 0, f: 329.63, gain: 1, att: 0.002, tau: 0.016, dur: 0.07, bend: 4, bendTau: 0.012, partials: [[1, 1, 1], [2, 0.7, 0.7], [3, 0.35, 0.5]] },
      { type: 'noise', t: 0, dur: 0.03, gain: 0.09, f0: 1100, f1: 1100, q: 0.9, peak: 0.1, tau: 0.005, att: 0.0008 },
    ],
  },

  // alert: "your team is live" in the player. v1.1: an octave up (D6 F#6 A6, E7 on top) so it clears commentary and crowd (which live in 300 Hz-1 kHz),
  // in the Sharp dialect (tighter, brighter), repeats at 3 x the 95 ms step with choke: three steps and two darker staircases. The only sound allowed over programme audio.
  alert: {
    dur: 0.75, tail: 0.18, hp: 300, lp: 8500, m: -28.5, ceil: -12,
    meta: { cls: 'alert', prio: 6, cooldownMs: 3000, note: 'with the action chip, from native code; never in the first 10 s after a tune; once per chip; only if Sounds is not Off' },
    layers: [
      // v1.2: one repeat only (three steps and their echo: a six-note figure, not a doorbell)
      ...STAIR(0, 0.095, ['D6', 'F#6', 'A6'], [0.8, 0.9, 1.0], { att: 0.003, tau: 0.10, dur: 0.6, partials: BRIGHT, lp: 6500, echo: [{ d: 0.285, g: 0.28, lp: 4800 }] }),
      { type: 'tone', t: 0.19, f: NOTE.E7, gain: 0.22, att: 0.003, tau: 0.10, dur: 0.3, partials: SOFT, lp: 6000 },
    ],
  },
};

// ---------------------------------------------------------------- tiny DSP
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const db2lin = (d) => Math.pow(10, d / 20), lin2db = (x) => 20 * Math.log10(Math.max(x, 1e-12));
const ss = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const rc = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));   // raised cosine 0..1

function biquad(x, type, fc, q = Math.SQRT1_2) {
  const w = 2 * Math.PI * fc / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    y[i] = v; x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
  }
  return y;
}
function onePole(x, fc) {
  const a = 1 - Math.exp(-2 * Math.PI * fc / SR), y = new Float64Array(x.length);
  let s = 0;
  for (let i = 0; i < x.length; i++) { s += a * (x[i] - s); y[i] = s; }
  return y;
}

// ---------------------------------------------------------------- layers
function renderTone(L, N) {
  const out = new Float64Array(N), t0 = Math.round(L.t * SR), len = Math.min(N - t0, Math.round((L.dur ?? 1) * SR));
  if (len <= 0) return out;
  const parts = L.partials || SOFT, att = Math.max(L.att ?? 0.004, 0.0008), rel = L.rel ?? 0.02;
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let f = L.f;
    if (L.glide) f = L.f + (L.glide.to - L.f) * ss(t / L.glide.time);
    if (L.bend) f = f * Math.pow(2, (L.bend / 12) * Math.exp(-t / (L.bendTau ?? 0.02)));
    ph += 2 * Math.PI * f / SR;
    const a = rc(t / att);
    let s = 0;
    for (const [r, amp, tm] of parts) {
      const e = L.tau ? Math.exp(-t / (L.tau * tm)) : 1;
      s += amp * e * Math.sin(r * ph);
    }
    // a struck note gets a short raised-cosine release at the end of its length; a swell releases over `rel`
    const endFade = rc((len - i) / SR / (L.tau ? Math.min(rel, 0.03) : rel));
    out[t0 + i] = s * a * endFade * L.gain;
  }
  return out;
}

function renderNoise(L, N, rng) {
  const out = new Float64Array(N), t0 = Math.round(L.t * SR), len = Math.min(N - t0, Math.round(L.dur * SR));
  if (len <= 0) return out;
  const peak = Math.min(0.95, Math.max(0.05, L.peak ?? 0.5)), gam = Math.log(0.5) / Math.log(peak);
  // TPT state-variable bandpass, cutoff swept exponentially f0 -> f1
  let ic1 = 0, ic2 = 0;
  const k = 1 / (L.q ?? 1);
  const buf = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    const u = i / len, fc = L.f0 * Math.pow(L.f1 / L.f0, u);
    const g = Math.tan(Math.PI * fc / SR), a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v0 = rng() * 2 - 1, v3 = v0 - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    buf[i] = v1 * k;   // bandpass, unity gain at the centre
  }
  const sh = L.lp ? onePole(buf, L.lp) : buf;
  for (let i = 0; i < len; i++) {
    const u = i / len, t = i / SR;
    const env = L.tau ? rc(t / Math.max(L.att ?? 0.001, 0.0005)) * Math.exp(-t / L.tau) * rc((len - i) / SR / 0.004)
      : Math.pow(Math.sin(Math.PI * Math.pow(u, gam)), 2);
    out[t0 + i] = sh[i] * env * L.gain * 1.7;
  }
  return out;
}

function chokeAt(src, sec) {   // fade the buffer to zero over 5 ms starting at `sec`: the next repeat replaces this one
  const out = Float64Array.from(src), i0 = Math.round(sec * SR), n = Math.round(0.005 * SR);
  for (let i = Math.max(0, i0); i < out.length; i++) out[i] *= i < i0 + n ? rc(1 - (i - i0) / n) : 0;
  return out;
}
function addEchoes(dry, echoes, mix, L) {
  echoes.forEach((e, k) => {
    const d = Math.round(e.d * SR);
    let src = e.lp ? onePole(dry, e.lp) : dry;
    if (L.choke && k < echoes.length - 1) src = chokeAt(src, L.t + (echoes[k + 1].d - e.d));
    for (let i = 0; i + d < mix.length; i++) mix[i + d] += src[i] * e.g;
  });
}

function render(name, R, seed, opt = {}) {
  const N = Math.round(R.dur * SR), mix = new Float64Array(N), rng = mulberry32(seed);
  for (const L of R.layers) {
    let b = L.type === 'noise' ? renderNoise(L, N, rng) : renderTone(L, N);
    if (L.lp && L.type === 'tone') b = onePole(b, L.lp);
    const dry = L.echo && L.choke ? chokeAt(b, L.t + L.echo[0].d) : b;
    for (let i = 0; i < N; i++) mix[i] += dry[i];
    if (L.echo) addEchoes(b, L.echo, mix, L);
  }
  // master: no rumble (2nd order high-pass), no hiss/harshness (2nd order low-pass), a raised-cosine fade that ends at exactly 0
  let y = biquad(mix, 'hp', R.hp ?? 150);
  y = biquad(y, 'lp', R.lp ?? 9000);
  const tailN = Math.round((R.tail ?? 0.02) * SR);
  for (let i = 0; i < N; i++) {
    const fromEnd = N - 1 - i;
    if (fromEnd < tailN) y[i] *= rc(fromEnd / tailN);
  }
  y[N - 1] = 0; y[0] = 0;
  if (opt.raw) return { y };   // un-normalised (for A/B energy comparisons between layers)
  // normalise to the loudness target, then enforce the peak ceiling
  const m0 = momentaryMax(y);
  let g = db2lin(R.m - m0);
  let pk = peak(y) * g, limited = false;
  if (lin2db(pk) > R.ceil) { g *= db2lin(R.ceil - lin2db(pk)); limited = true; }
  for (let i = 0; i < N; i++) y[i] *= g;
  return { y, limited, gainDb: lin2db(g) };
}

// ---------------------------------------------------------------- measurement (ITU-R BS.1770 K-weighting at 48 kHz)
function kweight(x) {
  const f = (x, b, a) => {
    const y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) { const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2; y[i] = v; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; }
    return y;
  };
  return f(f(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [-1.69065929318241, 0.73248077421585]), [1, -2, 1], [-1.99004745483398, 0.99007225036621]);
}
function momentaryMax(x) {   // max 400 ms K-weighted loudness, the file padded with 400 ms of silence each side
  const w = Math.round(0.4 * SR), pad = new Float64Array(x.length + 2 * w); pad.set(x, w);
  const k = kweight(pad), sq = new Float64Array(k.length + 1);
  for (let i = 0; i < k.length; i++) sq[i + 1] = sq[i] + k[i] * k[i];
  let best = 0;
  for (let i = 0; i + w <= k.length; i += 48) best = Math.max(best, (sq[i + w] - sq[i]) / w);
  return -0.691 + 10 * Math.log10(Math.max(best, 1e-14));
}
function peak(x) { let p = 0; for (const v of x) p = Math.max(p, Math.abs(v)); return p; }
function truePeak(x) {   // 4x oversampled (windowed sinc, 32 taps per phase)
  let p = 0; const T = 16;
  for (let i = 0; i < x.length; i++) {
    p = Math.max(p, Math.abs(x[i]));
    for (let ph = 1; ph < 4; ph++) {
      const fr = ph / 4; let s = 0;
      for (let j = -T + 1; j <= T; j++) {
        const idx = i + j; if (idx < 0 || idx >= x.length) continue;
        const d = j - fr, sinc = Math.sin(Math.PI * d) / (Math.PI * d), win = 0.5 + 0.5 * Math.cos(Math.PI * d / (T + 1));
        s += x[idx] * sinc * win;
      }
      p = Math.max(p, Math.abs(s));
    }
  }
  return p;
}
function fftPower(x, n = 8192) {   // averaged Hann-windowed power spectrum
  const re = new Float64Array(n), im = new Float64Array(n), acc = new Float64Array(n / 2);
  let frames = 0;
  const hop = n / 2;
  for (let start = 0; start === 0 || start + n <= x.length + hop; start += hop) {
    re.fill(0); im.fill(0);
    for (let i = 0; i < n; i++) { const v = start + i < x.length ? x[start + i] : 0; re[i] = v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))); }
    fft(re, im);
    for (let i = 0; i < n / 2; i++) acc[i] += re[i] * re[i] + im[i] * im[i];
    frames++;
    if (x.length <= n) break;
  }
  return acc.map((v) => v / frames);
}
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ur = re[i + j], ui = im[i + j], vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j] = ur + vr; im[i + j] = ui + vi; re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
function analyse(name, R, y) {
  const n = y.length, pw = fftPower(y), bin = SR / 8192;
  const band = (a, b) => { let s = 0; for (let i = Math.ceil(a / bin); i < Math.min(pw.length, Math.floor(b / bin)); i++) s += pw[i]; return s; };
  const tot = band(0, SR / 2) || 1;
  let cen = 0; for (let i = 1; i < pw.length; i++) cen += i * bin * pw[i]; cen /= tot;
  const e = (a, b) => 100 * band(a, b) / tot;
  const edge = (from, to) => { let m = 0; for (let i = from + 1; i < to; i++) m = Math.max(m, Math.abs(y[i] - y[i - 1])); return m; };
  const ms2 = Math.round(0.002 * SR), pk = peak(y);
  let maxD = 0; for (let i = 1; i < n; i++) maxD = Math.max(maxD, Math.abs(y[i] - y[i - 1]));
  let onset = 0; while (onset < n && Math.abs(y[onset]) < pk * 0.01) onset++;
  let mean = 0; for (const v of y) mean += v; mean /= n;
  let ssq = 0; for (const v of y) ssq += v * v;
  let last = n - 1; while (last > 0 && Math.abs(y[last]) < pk * 0.003) last--;   // -50 dB
  return {
    name, ms: Math.round(n / SR * 1000), peakDb: lin2db(pk), tpDb: lin2db(truePeak(y)), rmsDb: lin2db(Math.sqrt(ssq / n)),
    mLufs: momentaryMax(y), crest: lin2db(pk) - lin2db(Math.sqrt(ssq / n)),
    first: y[0], last: y[n - 1], dcDb: lin2db(Math.abs(mean)),
    startStepDb: lin2db(edge(0, ms2)), endStepDb: lin2db(edge(n - ms2, n)), maxStepVsPeak: maxD / pk,
    onsetMs: onset / SR * 1000, audibleEndMs: last / SR * 1000,
    centroid: cen, lf150: e(0, 150), b150_500: e(150, 500), b500_2k: e(500, 2000), b2k_6k: e(2000, 6000), hf6k: e(6000, SR / 2),
  };
}

// ---------------------------------------------------------------- output
function wav16(y) {
  const n = y.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(y[i] * 32767))), 44 + i * 2);
  return b;
}
function readBack(buf) {   // what a player will actually decode (16-bit), for the analysis
  const n = (buf.length - 44) / 2, y = new Float64Array(n);
  for (let i = 0; i < n; i++) y[i] = buf.readInt16LE(44 + i * 2) / 32767;
  return y;
}

function main() {
  const only = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  const names = Object.keys(RECIPES).filter((n) => !only.length || only.includes(n));
  const rows = [], manifest = {}, b64 = {};
  let seed = 1;
  for (const name of Object.keys(RECIPES)) {
    const R = RECIPES[name]; seed++;
    if (!names.includes(name)) continue;
    const { y, limited, gainDb } = render(name, R, 1000 + seed * 7919);
    const buf = wav16(y);
    fs.writeFileSync(path.join(OUT, name + '.wav'), buf);
    const a = analyse(name, R, readBack(buf)); a.limited = limited; a.gainDb = gainDb; a.target = R.m; a.ceil = R.ceil;
    rows.push(a);
    manifest[name] = { file: name + '.wav', durationMs: a.ms, sampleRate: SR, bits: 16, channels: 1, peakDbfs: +a.peakDb.toFixed(1), momentaryLufs: +a.mLufs.toFixed(1), ...R.meta };
    b64[name] = buf.toString('base64');
  }
  if (!only.length) {
    fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ about: 'airglow sound set v1; play every file at gain 1.0 x the user level (SOUND.md 6)', sampleRate: SR, sounds: manifest }, null, 2) + '\n');
    fs.writeFileSync(path.join(OUT, 'sounds.js'), '// generated by synth.js: the WAVs as base64 and the manifest, for preview.html (works from file://)\nwindow.AIRGLOW_SOUNDS = ' + JSON.stringify(b64) + ';\nwindow.AIRGLOW_MANIFEST = ' + JSON.stringify(manifest) + ';\n');
  }
  const f = (v, d = 1) => v.toFixed(d);
  const lines = [];
  lines.push('name           ms   peak  tpeak  rms   M-max  crest | first   last  startStep endStep maxStep/pk dc  | onset  end50dB | centroid  <150  150-500 500-2k 2-6k  >6k | target ceil limited');
  for (const a of rows) lines.push(
    `${a.name.padEnd(13)} ${String(a.ms).padStart(5)} ${f(a.peakDb).padStart(6)} ${f(a.tpDb).padStart(6)} ${f(a.rmsDb).padStart(6)} ${f(a.mLufs).padStart(6)} ${f(a.crest).padStart(5)} | ` +
    `${(a.first * 32767).toFixed(0).padStart(5)} ${(a.last * 32767).toFixed(0).padStart(6)} ${f(a.startStepDb).padStart(8)} ${f(a.endStepDb).padStart(8)} ${f(a.maxStepVsPeak, 2).padStart(9)} ${f(a.dcDb, 0).padStart(5)} | ` +
    `${f(a.onsetMs, 1).padStart(6)} ${f(a.audibleEndMs, 0).padStart(7)} | ${f(a.centroid, 0).padStart(8)} ${f(a.lf150).padStart(5)} ${f(a.b150_500).padStart(7)} ${f(a.b500_2k).padStart(7)} ${f(a.b2k_6k).padStart(5)} ${f(a.hf6k).padStart(5)} | ${f(a.target)} ${f(a.ceil, 0)} ${a.limited ? 'LIMITED' : ''}`);
  lines.push('', 'peak/tpeak/rms in dBFS (tpeak = 4x oversampled true peak), M-max = highest 400 ms K-weighted loudness (LUFS), crest in dB, steps in dBFS (first/last 2 ms), band columns = % of spectral energy.');
  const txt = lines.join('\n') + '\n';
  if (!only.length) fs.writeFileSync(path.join(OUT, 'report.txt'), txt);
  process.stdout.write(txt);
}
if (require.main === module) main();
module.exports = { RECIPES, render, analyse, fftPower };
