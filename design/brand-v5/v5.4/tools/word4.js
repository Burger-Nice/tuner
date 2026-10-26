// v5.4 wordmark builder. Outfit 700 "airglow" (tools/wordmarks.json all7), outlined. Options: split colour, tracking, a wedge for the i-dot.
const W = require('./wordmarks.json').all7, P = require('./palette.js'), M2 = require('./mark2.js'); const r = n => +n.toFixed(2);
const nums = d => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(m => [+m[1], +m[2]]);
const OPTS = {
  W0: { name: 'v5.3 single weight, all chalk (stock)', split: false, track: 0, dot: false },
  W1: { name: 'air chalk + glow in the pink to orchid gradient', split: true, track: 0, dot: false },
  W2: { name: 'W1 + tracking -2% (the i stands apart)', split: true, track: 2.9, dot: false },
  W3: { name: 'W2 + the i-dot is the mark wedge (small custom touch)', split: true, track: 2.9, dot: true },
};
function build(id, o = {}) { const opt = { ...OPTS.W3, ...o }; const chalk = opt.air || P['text-1'], ink = opt.glowFill; const sh = i => -opt.track * i;
  const g = W.glyphs.map((gl, i) => ({ ...gl, i, x1: gl.x1 + sh(i), x2: gl.x2 + sh(i) }));
  const gx1 = g[3].x1, gx2 = g[6].x2;
  const defs = `<linearGradient id="${id}wg" x1="${r(gx1)}" y1="0" x2="${r(gx2)}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.pink}"/><stop offset="1" stop-color="${P.orchid}"/></linearGradient>`;
  const glowFill = opt.split ? (opt.glowFill || `url(#${id}wg)`) : chalk;
  let out = '';
  g.forEach((gl, i) => { let d = gl.d, extra = '';
    if (i === 1 && opt.dot) { const subs = d.split(/(?=M)/); const di = subs.findIndex(s => Math.min(...nums(s).map(p => p[1])) < -85); const dn = nums(subs[di]); const xs = dn.map(p => p[0]), ys = dn.map(p => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), w = x1 - x0, h = y1 - y0;
      d = subs.filter((_, j) => j !== di).join(''); const hh = h * 1.3, vis = w * 1.08, cy = (y0 + y1) / 2; extra = `<path d="${M2.tri(x0 - w * 0.02, cy - hh / 2, cy + hh / 2, vis, w * 0.17, w * 0.14)}" fill="${opt.dotFill || P.pink}"/>`; }
    const fill = i >= 3 ? glowFill : chalk; out += `<g transform="translate(${r(sh(i))} 0)"><path d="${d}" fill="${fill}"/>${extra}</g>`; });
  return { defs, body: out, x1: g[0].x1, x2: g[6].x2 }; }
module.exports = { build, OPTS };
