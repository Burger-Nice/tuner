// v2.2 lockup / mark study: renders option SVGs to checks/options/ and the comparison sheet checks/lockup-options.html. node checks/options.js
// (checks/study22*.js hold the earlier exploratory sheets that fed this one.)
const fs = require('fs'), path = require('path');
const { T, tParts, UNER, UNER_W, GAP, r } = require('./geometry.js');
const S = require('./study22.js');          // parametric builder: edge ticks, slits, needle pointer, channel
const P = require('./palette.js');
const AMBER = P.accent, WHITE = P['text-1'];
const dir = path.join(__dirname, 'options'); fs.mkdirSync(dir, { recursive: true });
const letters = () => UNER.map(l => `<path${l.x ? ` transform="translate(${l.x} 0)"` : ''}${l.e ? ' fill-rule="evenodd"' : ''} d="${l.d}"/>`).join('');
const tk = (d, w, h, edge) => ({ d, w, h, edge });
const edge = [19.5, 29.5].map(d => tk(d, 3.9, 11.5, 'bot')), slit = [tk(19.5, 2.6, 12, 'mid'), tk(27.5, 2.6, 7, 'mid')];
const base = { W: 84, H: 23, nW: 23, P: 0, tip: 23, g: 0 };
const files = {};
const put = (name, s, mode, gap = GAP) => { const l = S.lock(s, mode, gap); files[name] = { l, s, mode }; fs.writeFileSync(path.join(dir, name + '.svg'), S.svg(l)); };

// 0: v2.1 as shipped (97 wide, tapered 22->28 stem, six lower-edge ticks, two-tone)
{ const W = 97, cx = 48.5, ticks = [20, 30.5, 41], tw = 3.9; let tick = [];
  for (const d of ticks) { tick.push([cx - d - tw / 2, cx - d + tw / 2], [cx + d - tw / 2, cx + d + tw / 2]); } tick.sort((a, b) => b[0] - a[0]);
  let bar = `M0 0H${W}V23`; for (const [a, b] of tick) bar += `H${r(b)}V11.5H${r(a)}V23`; bar += 'H0Z';
  const needle = `M37.5 0H59.5L62.5 100H34.5Z`;
  const l = { w: W + 10 + UNER_W, h: 100, top: 0, body: `<path fill="${AMBER}" d="${bar}"/><path fill="${WHITE}" d="${needle}"/><g fill="${WHITE}" transform="translate(${W + 10} 0)">${letters()}</g>` };
  files['0-v2.1-two-tone-ticks'] = { l }; fs.writeFileSync(path.join(dir, '0-v2.1-two-tone-ticks.svg'), S.svg(l)); }
put('1-needle-proud-review-1a', { ...base, P: 14, tip: 14, ticks: edge }, 'two');
put('2-two-tone-channel-slits', { ...base, g: 3, ticks: slit }, 'two');
put('3-all-amber-plain', { ...base, ticks: [] }, 'amber');
put('4-all-amber-channel-CHOSEN', { ...base, g: 3, ticks: [] }, 'amber');
{ // 5 segmented scale: arms cut into two blocks (ticks as full-height gaps)
  const g = 3, cx = 42, nl = cx - 11.5 - g, w = (nl - g) / 2; let bar = ''; for (let i = 0; i < 2; i++) { const a = i * (w + g); bar += `M${r(a)} 0H${r(a + w)}V23H${r(a)}Z`; const b = 84 - a - w; bar += `M${r(b)} 0H${r(b + w)}V23H${r(b)}Z`; }
  const l = { w: 84 + GAP + UNER_W, h: 100, top: 0, body: `<path fill="${AMBER}" d="${bar} M30.5 0H53.5V100H30.5Z"/><g fill="${WHITE}" transform="translate(${84 + GAP} 0)">${letters()}</g>` };
  files['5-segmented-scale'] = { l }; fs.writeFileSync(path.join(dir, '5-segmented-scale.svg'), S.svg(l)); }
// gap study on the chosen lockup
for (const g of [3, 8, 14]) put(`gap-${g}`, { ...base, g: 3, ticks: [] }, 'amber', g);

const img = (f, h, extra = '') => `<img src="options/${f}.svg" style="height:${h}px;${extra}">`;
const row = (title, note, f, verdict, pick) => `<section${pick ? ' class="pick"' : ''}><div class="lab"><b>${title}</b><span>${note}</span><em>${verdict}</em></div>
  <div class="cells">${img(f, 100)}${img(f, 34)}${img(f, 20)}${img(f, 14)}${img(f, 50, 'filter:grayscale(1)')}${img(f, 50, 'filter:blur(1.6px)')}${img(f, 50, 'filter:grayscale(1) blur(1.6px)')}</div></section>`;
const markOnly = (key, s, mode) => { const top = -s.P - 3; return `<svg viewBox="-3 ${top} ${s.W + 6} ${106 + s.P}" width="64" style="margin-left:18px">${S.mark(s, mode)}</svg>`; };
fs.writeFileSync(path.join(__dirname, 'lockup-options.html'), `<!doctype html><meta charset="utf-8"><title>Lockup and mark options v2.2</title><style>
body{margin:0;background:${P['bg-0']};color:${P['text-3']};font:12px/1.4 system-ui,sans-serif;padding:28px 32px;width:2300px}
h1{font:600 13px system-ui;letter-spacing:.1em;text-transform:uppercase;margin:0 0 18px;color:${P['text-2']}}
section{display:grid;grid-template-columns:330px 1fr;gap:28px;align-items:end;padding:20px 0;border-top:1px solid ${P.line}}
.lab b{display:block;color:${P['text-1']};font-size:13px;margin-bottom:4px}.lab span{display:block}.lab em{display:block;font-style:normal;color:${P['text-2']};margin-top:4px}
.cells{display:flex;gap:30px;align-items:flex-end}.cells img{display:block}
.pick{background:${P['bg-1']};margin:0 -14px;padding:20px 14px;border-left:3px solid ${AMBER}}
</style><h1>v2.2 study · rows: 100 / 34 / 20 / 14 px tall · greyscale · blur (squint) · greyscale + blur</h1>
${row('0 · v2.1 as shipped', 'Two-tone, 97-wide bar, tapered 22→28 stem, six lower-edge ticks.', '0-v2.1-two-tone-ticks', 'Review: reads as a ruler; amber/white is 1.56:1 so in greyscale the bar is a grey cap; stem tapers; T sits loose from the U.')}
${row('1 · needle proud (review fix 1a)', 'Needle stands 14 units above the bar.', '1-needle-proud-review-1a', 'REJECTED: at icon size the amber version reads as a cross / dagger (see the cross test at the bottom of this sheet). A mark that reads as a cross is not usable.')}
${row('2 · two-tone + needle channel + slit scale', 'White needle, 3-unit channels, two hairline slits per side.', '2-two-tone-channel-slits', 'REJECTED: slits turn to speckle below 34 px; two-tone still fades in greyscale and blur.')}
${row('3 · all-amber T, plain', 'Amber T, no marks.', '3-all-amber-plain', 'Strongest at every size, but no tuner idea at all: just an amber letter.')}
<div>${row('4 · all-amber T, needle channel · CHOSEN', 'The stem is the needle: full height, straight, 23 wide. It cuts the scale (crossbar) in two with a 3-unit channel on each side.', '4-all-amber-channel-CHOSEN', 'One sentence: "a T whose stem slices the bar". Survives greyscale, blur and 14 px (channel closes gracefully; mark-small drops it under 64 device px). Amber is 13% of the lockup filled area (v2.1: 5%, measured by pixel count).', 1)}</div>
${row('5 · segmented scale', 'Arms cut into blocks by full-height gaps standing in for ticks.', '5-segmented-scale', 'REJECTED: reads as a barcode / quotation marks; busier than 4 with no extra meaning.')}
<h1 style="margin-top:26px">Gap study (T bar end to U), chosen mark: 3 · 8 (chosen) · 14</h1>
<section><div class="lab"><b>Spacing</b><span>Stem-to-U is 38.5 at gap 8 (v2.1: 44.5 and tapered; review target 36–38). 3 collides with the U at small sizes, 14 breaks the word.</span></div>
<div class="cells"><img src="options/gap-3.svg" style="height:80px"><img src="options/gap-8.svg" style="height:80px"><img src="options/gap-14.svg" style="height:80px"></div></section>
<h1 style="margin-top:26px">Cross test: the proud-needle mark at icon size, amber (left) vs chosen (right)</h1>
<section><div class="lab"><b>1 vs 4 at 64 px</b><span>A short pointer on a T reads as a cross or a sword hilt before it reads as a needle.</span></div>
<div class="cells">${markOnly('1', { ...base, P: 14, tip: 14, ticks: edge }, 'amber')}${markOnly('4', { ...base, g: 3, ticks: [] }, 'amber')}</div></section>
`);
console.log('options written');
