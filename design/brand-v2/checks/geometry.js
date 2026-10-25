// Tuner logo geometry. Units: cap height = 100 (needle top y=0, baseline y=100).
// The mark IS the T of the wordmark: one drawing, used 1:1 in the lockup.
const r = n => +n.toFixed(2);

// ---- the mark / the T ----
const T = {
  W: 97,            // scale bar width
  H: 23,            // scale bar thickness = wordmark stem (23)
  tw: 3.9, th: 11.5,// tick width / height (knocked out of the bar's lower edge)
  ticks: [20, 30.5, 41], // tick centres, distance from the needle axis (mirrored), pitch 10.5
  nt: 22, nb: 28,   // needle width at the top / at the baseline (avg 25 ~ stem 23)
};
function tParts(s = T) {
  const cx = s.W / 2, tk = [];
  for (const d of s.ticks) { tk.push([cx - d - s.tw / 2, cx - d + s.tw / 2]); tk.push([cx + d - s.tw / 2, cx + d + s.tw / 2]); }
  tk.sort((a, b) => b[0] - a[0]);
  let bar = `M0 0H${r(s.W)}V${r(s.H)}`;
  for (const [a, b] of tk) bar += `H${r(b)}V${r(s.H - s.th)}H${r(a)}V${r(s.H)}`;
  bar += 'H0Z';
  const barSmall = `M0 0H${r(s.W)}V${r(s.H)}H0Z`;
  const needle = `M${r(cx - s.nt / 2)} 0H${r(cx + s.nt / 2)}L${r(cx + s.nb / 2)} 100H${r(cx - s.nb / 2)}Z`;
  return { bar, barSmall, needle, cx };
}

// ---- UNER (outlined, custom wide grotesque; stem 23, cap 100). Offsets relative to the U origin. ----
const UNER = [
  { x: 0,   d: 'M0 0H23V57C23 69.5 31.5 77 45 77C58.5 77 67 69.5 67 57V0H90V59C90 86 72 100 45 100C18 100 0 86 0 59Z' },
  { x: 104, d: 'M0 100V0H25L67 61V0H92V100H67L25 39V100Z' },
  { x: 210, d: 'M0 0H78V23H23V39H72V61H23V77H78V100H0Z' },
  { x: 302, e: 1, d: 'M0 0H52C74 0 88 12 88 33C88 47 80 57 67 61L90 100H64L45 64H23V100H0Z M23 21V44H50C57 44 64 40 64 32.5C64 25 57 21 50 21Z' },
];
const UNER_W = 392;
const GAP = 10; // bar end -> U. The bar is only 23 tall, so the open space under its arm adds optical gap; 10 matches the U-N-E-R rhythm
module.exports = { T, tParts, UNER, UNER_W, GAP, r };
