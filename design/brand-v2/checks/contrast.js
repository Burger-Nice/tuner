// WCAG 2.x contrast for the Tuner v2.1 palette (values from palette.js, the OKLCH source of truth). node checks/contrast.js
// Body text >= 4.5:1, large text (>=24px / 18.66px bold) >= 3:1, non-text (icons, borders, focus) >= 3:1.
const c = require('./color.js'), P = require('./palette.js');
const mix = (fg, a, bg) => { const f = c.hex2rgb(fg), b = c.hex2rgb(bg); return '#' + f.map((v, i) => Math.round((v * a + b[i] * (1 - a)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase(); };
const SURF = ['bg-0', 'bg-1', 'surface-1', 'surface-2', 'surface-3'];
const rows = [];
const add = (kind, fg, bg, fgv, bgv, need) => rows.push({ kind, fg, bg, ratio: c.ratio(fgv, bgv), need });
// text tokens on every surface
for (const f of ['text-1', 'text-2', 'text-3', 'accent', 'accent-hover', 'live-text', 'danger-text', 'success', 'warning'])
  for (const b of SURF) add('text', f, b, P[f], P[b], 4.5);
// non-text
for (const f of ['accent', 'live', 'danger', 'focus', 'outline']) for (const b of SURF.slice(0, f === 'outline' ? 4 : 5)) add('non-text', f, b, P[f], P[b], 3);
// disabled + decorative (no requirement, documented)
for (const b of ['bg-0', 'bg-1']) add('disabled', 'text-4', b, P['text-4'], P[b], 0);
for (const b of ['bg-0', 'bg-1', 'surface-1']) add('decor', 'line', b, P.line, P[b], 0);
// buttons
add('text', 'on-accent', 'accent', P['on-accent'], P.accent, 4.5);
add('text', 'on-accent', 'accent-hover', P['on-accent'], P['accent-hover'], 4.5);
add('text', 'on-accent', 'accent-press', P['on-accent'], P['accent-press'], 4.5);
add('text', 'bg-0 (on-light ink)', 'accent', P['bg-0'], P.accent, 4.5);
add('text', 'text-1', 'live', P['text-1'], P.live, 3); // white on a live fill: large/bold label only
// tinted pills on surface-1 / surface-2
for (const s of ['surface-1', 'surface-2']) {
  const lsoft = mix(P.live, 0.16, P[s]), asoft = mix(P.accent, 0.14, P[s]);
  add('text', `live-text on live-soft@${s}`, 'pill', P['live-text'], lsoft, 4.5);
  add('text', `accent on accent-soft@${s}`, 'chip', P.accent, asoft, 4.5);
}
// focus ring with 2px canvas gap: ring is always seen against bg-0 and the gap (bg-0), never against amber
add('non-text', 'focus ring', 'bg-0 gap', P.focus, P['bg-0'], 3);
add('rule', 'focus ring WITHOUT gap (why the gap exists)', 'accent button', P.focus, P.accent, 0);
if (require.main === module) {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('kind', 10) + pad('foreground', 40) + pad('background', 18) + pad('ratio', 9) + 'verdict');
  let fails = 0;
  for (const r of rows) { const ok = r.ratio >= r.need; if (!ok && r.need) fails++; console.log(pad(r.kind, 10) + pad(r.fg + ' ' + (P[r.fg] || ''), 40) + pad(r.bg, 18) + pad(r.ratio.toFixed(2) + ':1', 9) + (r.need === 0 ? 'n/a (' + r.kind + ')' : ok ? 'pass ' + r.need : 'FAIL ' + r.need)); }
  console.log('\nfailures:', fails);
}
module.exports = { rows };
