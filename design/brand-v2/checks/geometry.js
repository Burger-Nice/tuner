// Tuner logo geometry v2.2. Units: cap height = 100 (T top y=0, baseline y=100).
// The mark IS the T of the wordmark: one drawing, used 1:1 in the lockup. Concept: the stem is the needle and it cuts the scale (the crossbar) in two.
const r = n => +n.toFixed(2);

const T = {
  W: 84,    // overall width (= the v1 wordmark T)
  H: 23,    // crossbar thickness = wordmark stem (23)
  nW: 23,   // stem / needle width, straight (v2.1 tapered 22->28; the taper is gone)
  g: 3,     // channel between the stem and each half of the scale
};
function tParts(s = T) {
  const cx = s.W / 2, nl = cx - s.nW / 2, nr = cx + s.nW / 2;
  const needle = `M${r(nl)} 0H${r(nr)}V100H${r(nl)}Z`;                                  // the needle: full height
  const barL = `M0 0H${r(nl - s.g)}V${s.H}H0Z`, barR = `M${r(nr + s.g)} 0H${r(s.W)}V${s.H}H${r(nr + s.g)}Z`; // the scale, cut by the needle
  const solid = `M0 0H${s.W}V${s.H}H${r(nr)}V100H${r(nl)}V${s.H}H0Z`;                  // channel-free T for small sizes
  return { needle, bar: barL + barR, full: `${barL}${barR}${needle}`, solid, cx };
}

// ---- UNER (outlined, custom wide grotesque; stem 23, cap 100). Offsets relative to the U origin. ----
const UNER = [
  { x: 0,   d: 'M0 0H23V57C23 69.5 31.5 77 45 77C58.5 77 67 69.5 67 57V0H90V59C90 86 72 100 45 100C18 100 0 86 0 59Z' },
  { x: 104, d: 'M0 100V0H25L67 61V0H92V100H67L25 39V100Z' },
  { x: 210, d: 'M0 0H78V23H23V39H72V61H23V77H78V100H0Z' },
  { x: 302, e: 1, d: 'M0 0H52C74 0 88 12 88 33C88 47 80 57 67 61L90 100H64L45 64H23V100H0Z M23 21V44H50C57 44 64 40 64 32.5C64 25 57 21 50 21Z' },
];
const UNER_W = 392;
const GAP = 8; // bar end -> U. Stem-to-U = 38.5 (v2.1: 44.5 + taper); 14 between the other letters, but a T always needs optical kerning
module.exports = { T, tParts, UNER, UNER_W, GAP, r };
