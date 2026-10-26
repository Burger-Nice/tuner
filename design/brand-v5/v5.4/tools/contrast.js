// WCAG 2.x contrast for the airglow v5.1 tokens. node tools/contrast.js  (body >= 4.5, large/non-text >= 3)
const c = require('./color.js'), P = require('./palette.js');
const mix = (fg, a, bg) => { const f = c.hex2rgb(fg), b = c.hex2rgb(bg); return '#' + f.map((v, i) => Math.round((v * a + b[i] * (1 - a)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase(); };
const mid = (a, b) => { const x = c.hex2rgb(a), y = c.hex2rgb(b); return '#' + x.map((v, i) => Math.round((v + y[i]) / 2 * 255).toString(16).padStart(2, '0')).join('').toUpperCase(); };
const S = ['bg-0', 'bg-1', 'surface-1', 'surface-2', 'surface-3'];
const rows = []; const add = (kind, fg, bg, fv, bv, need) => rows.push({ kind, fg, bg, ratio: c.ratio(fv, bv), need });
for (const f of ['text-1', 'text-2', 'text-3', 'pink-text', 'orchid-text']) for (const b of S) add('text', f, b, P[f], P[b], 4.5);
for (const f of ['live-text', 'ok']) for (const b of S.slice(0, 4)) add('text', f, b, P[f], P[b], 4.5);   // status text never sits on surface-3 (pressed/chip fill)
for (const f of ['pink', 'orchid', 'violet-ui']) for (const b of S.slice(0, 4)) add('non-text', f, b, P[f], P[b], 3);   // fills/strokes: bg-0 .. surface-2
for (const b of S.slice(0, 4)) add('non-text', 'live', b, P.live, P[b], 3);
for (const b of S) add('non-text', 'focus', b, P.focus, P[b], 3);
for (const b of S.slice(0, 4)) add('disabled', 'text-4', b, P['text-4'], P[b], 0);
for (const b of ['surface-1', 'surface-2']) add('non-text', 'border-strong', b, P['border-strong'], P[b], 3);
for (const b of ['surface-1', 'surface-2', 'surface-3']) add('step', 'surface step vs canvas', b, P[b], P['bg-0'], 0);
add('decor', 'border', 'surface-1', P.border, P['surface-1'], 0); add('decor', 'violet (anchor only)', 'bg-0', P.violet, P['bg-0'], 0);
// labels on the pink to orchid gradient (buttons, tile): left, middle, right
const gm = mid(P.pink, P.orchid);
for (const [n, h] of [['pink', P.pink], ['mid', gm], ['orchid', P.orchid]]) { add('text', 'ink-on-brand', 'gradient ' + n, P['ink-on-brand'], h, 4.5); add('text', 'chalk', 'gradient ' + n, P['text-1'], h, 0); }
add('text', 'text-1 over brand tile', 'tile violet end #5B22B8', P['text-1'], '#5B22B8', 4.5);
add('text', 'live-text', 'live-soft@surface-1', P['live-text'], mix(P.live, .16, P['surface-1']), 4.5);
add('text', 'pink-text on pink-soft@surface-1 (chip)', 'chip', P['pink-text'], mix(P.pink, .14, P['surface-1']), 4.5);
add('non-text', 'focus ring', 'bg-0 (via 2px gap)', P.focus, P['bg-0'], 3);
module.exports = { rows, gm };
if (require.main === module) { const pad = (s, n) => String(s).padEnd(n); let fails = 0; console.log(pad('kind', 10) + pad('foreground', 36) + pad('background', 26) + pad('ratio', 9) + 'verdict');
  for (const r of rows) { const ok = r.ratio >= r.need; if (!ok && r.need) fails++; console.log(pad(r.kind, 10) + pad(r.fg, 36) + pad(r.bg, 26) + pad(r.ratio.toFixed(2) + ':1', 9) + (r.need === 0 ? 'info' : ok ? 'pass ' + r.need : 'FAIL ' + r.need)); } console.log('failures:', fails); }
