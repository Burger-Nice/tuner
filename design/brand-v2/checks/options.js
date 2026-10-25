// Lockup exploration: renders option SVGs to checks/options/ and the comparison sheet checks/lockup-options.html. node checks/options.js
const fs = require('fs'), path = require('path');
const { T, tParts, UNER, UNER_W, GAP, r } = require('./geometry.js');
const P = require('./palette.js');
const AMBER = P.accent, WHITE = P['text-1'];
const dir = path.join(__dirname, 'options'); fs.mkdirSync(dir, { recursive: true });
const letters = (sc = 1) => UNER.map(l => `<path${l.x ? ` transform="translate(${l.x} 0)"` : ''}${l.e ? ' fill-rule="evenodd"' : ''} d="${l.d}"/>`).join('');
const svg = (w, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(w)} 100">${body}</svg>`;
const opts = {};

// 1 v1 geometry as the T (mark scaled so needle = cap, 116 wide, 4 ticks/side, thin needle)
{ const K = 100 / 76, s = { W: 88 * K, H: 18 * K, tw: 3 * K, th: 9 * K, ticks: [12, 20, 28, 36].map(x => x * K), nt: 14 * K, nb: 20 * K };
  const t = tParts(s); opts['1-v1-mark-as-the-T'] = svg(s.W + 10 + UNER_W, `<path fill="${AMBER}" d="${t.bar}"/><path fill="${WHITE}" d="${t.needle}"/><g fill="${WHITE}" transform="translate(${r(s.W + 10)} 0)">${letters()}</g>`); }
// 2 FINAL: redrawn T (97 wide, 23 thick, needle 22-28, 3 ticks/side)
{ const t = tParts(); opts['2-T-redrawn-two-tone'] = svg(T.W + GAP + UNER_W, `<path fill="${AMBER}" d="${t.bar}"/><path fill="${WHITE}" d="${t.needle}"/><g fill="${WHITE}" transform="translate(${T.W + GAP} 0)">${letters()}</g>`); }
// 3 all-amber T (needle amber too)
{ const t = tParts(); opts['3-T-all-amber'] = svg(T.W + GAP + UNER_W, `<path fill="${AMBER}" d="${t.bar} ${t.needle}"/><g fill="${WHITE}" transform="translate(${T.W + GAP} 0)">${letters()}</g>`); }
// 4 scale spans the word: amber band over everything, UNER hangs under it at 74%
{ const W = T.W + 12 + UNER_W, cx = T.W / 2, tk = []; for (let x = 6; x + 4 <= W - 4; x += 12) if (Math.abs(x + 2 - cx) > 20) tk.push([x, x + 4]);
  tk.sort((a, b) => b[0] - a[0]); let p = `M0 0H${W}V23`; for (const [a, b] of tk) p += `H${b}V12H${a}V23`; p += 'H0Z';
  const nd = `M${cx - 11} 0H${cx + 11}L${cx + 14} 100H${cx - 14}Z`;
  opts['4-scale-spans-the-word'] = svg(W, `<path fill="${AMBER}" d="${p}"/><g fill="${WHITE}" transform="translate(${T.W + 12} 26) scale(.74)">${letters()}</g><path fill="${WHITE}" d="${nd}"/>`); }
// 5 gap study of the chosen T
for (const g of [3, 10, 16]) { const t = tParts(); opts[`2-gap-${g}`] = svg(T.W + g + UNER_W, `<path fill="${AMBER}" d="${t.bar}"/><path fill="${WHITE}" d="${t.needle}"/><g fill="${WHITE}" transform="translate(${T.W + g} 0)">${letters()}</g>`); }

for (const [n, s] of Object.entries(opts)) fs.writeFileSync(path.join(dir, n + '.svg'), s);
const row = (title, note, file, extra = '') => {
  const u = `options/${file}.svg`;
  return `<section><div class="lab"><b>${title}</b><span>${note}</span></div>
  <div class="cells"><img src="${u}" style="height:104px"><img src="${u}" style="height:34px"><img src="${u}" style="height:22px"><img src="${u}" style="height:14px">
  <img src="${u}" style="height:46px;filter:blur(1.1px)" title="squint / TV-distance"><div class="lt"><img src="${u}" style="height:34px;filter:brightness(0)"></div>${extra}</div></section>`; };
fs.writeFileSync(path.join(__dirname, 'lockup-options.html'), `<!doctype html><meta charset="utf-8"><title>Lockup options</title><style>
body{margin:0;background:${P['bg-0']};color:${P['text-3']};font:12px/1.4 system-ui,sans-serif;padding:28px 32px;width:1940px}
h1{font:600 13px system-ui;letter-spacing:.1em;text-transform:uppercase;margin:0 0 18px;color:${P['text-2']}}
section{display:grid;grid-template-columns:250px 1fr;gap:28px;align-items:end;padding:22px 0;border-top:1px solid ${P.line}}
.lab b{display:block;color:${P['text-1']};font-size:13px;margin-bottom:4px}.lab span{display:block;max-width:220px}
.cells{display:flex;gap:34px;align-items:flex-end}.cells img{display:block}.lt{background:#F2F3F6;padding:12px 16px}
.pick{background:${P['bg-1']};margin:0 -14px;padding:0 14px;border-left:3px solid ${AMBER}}
</style><h1>Lockup options · rows read: 104 px · 34 px · 22 px · 14 px tall · squint (blur) · one-colour on light</h1>
${row('0  v1: mark beside TUNER', 'Two T\'s in a row ("T TUNER"). The thing the owner flagged.', '0-v1-mark-beside-TUNER')}
${row('1  v1 mark used as the T', 'Old geometry dropped in as the T. T is 16% wider than any letter and its needle (18 top) is lighter than the 23 stems: logo-in-a-word.', '1-v1-mark-as-the-T')}
<div class="pick">${row('2  T redrawn as the mark (CHOSEN)', 'Same two-tone needle-through-scale, redrawn to the letter grid: bar 97x23 (stem = 23), needle 22-28, 6 ticks. Mark and T are one drawing.', '2-T-redrawn-two-tone')}</div>
${row('3  T all amber', 'Strongest at 14 px and the most colour, but the needle loses its white and no longer matches the standalone mark.', '3-T-all-amber')}
${row('4  Scale spans the word', 'A dial strip over the whole word. Ownable, but letters shrink to 74%, amber becomes 40% of the lockup (not an accent), and it mushes below 22 px.', '4-scale-spans-the-word')}
<h1 style="margin-top:26px">Gap study (T bar end to U): 3 · 10 (chosen) · 16</h1>
<section><div class="lab"><b>Spacing</b><span>The bar is only 23 tall, so the open space under its arm adds optical gap; 10 matches the rhythm of U-N-E-R; 3 collides at small sizes, 16 breaks the word.</span></div>
<div class="cells"><img src="options/2-gap-3.svg" style="height:70px"><img src="options/2-gap-10.svg" style="height:70px"><img src="options/2-gap-16.svg" style="height:70px"></div></section>
`);
console.log('options written');
