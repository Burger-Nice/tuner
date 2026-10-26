// v5.3 lockup + icon builders (no blur, no glow). Wordmark: Outfit 700 "airglow", single weight, outlined (tools/wordmarks.json all7, cap height 100, baseline 0).
const W = require('./wordmarks.json'), P = require('./palette.js'), M3 = require('./mark3.js'), Wd = require('./word4.js'); const r = n => +n.toFixed(2);
const word = W.all7, wx1 = word.bbox.x1, wx2 = word.bbox.x2;
const FINAL = { gap: 0, step: 10, dh: .095, L: 62, H: 70, rb: 6, ra: 7.5, rr: 5.5 };           // R1 (tuned)
const SMALL = { n: 2, gap: 0, step: 13, dh: .11, L: 62, H: 70, rb: 6, ra: 7, rr: 5 };           // R10
// lockup variants. m = mark scale, cy = mark centre y (baseline = 0, up is negative), gap = apex to first letter
const LK = { A: { m: 1.40, cy: -49, gap: 30 }, B: { m: 1.20, cy: -36, gap: 26 }, C: { m: 1.30, cy: -44, gap: 34 } };
function lockup(id, v = 'A', o = {}) { const { m, cy, gap } = { ...LK[v], ...(o.lk || {}) }; const mk = M3.build(id, { ...FINAL, ...(o.mark || {}) });
  const wd = Wd.build(id + 'w', o.word || {}); const wx1 = wd.x1, wx2 = wd.x2; const mw = (mk.x1 - mk.x0) * m, ox = -mk.x0 * m;                                  // mark placed from x=0
  const wordX = mw + gap - wx1; const x2 = wordX + wx2;
  const top = Math.min(-102.83, cy - mk.H * m / 2) - 6, bot = Math.max(30.88, cy + mk.H * m / 2) + 6;
  const body = `<defs>${mk.defs}${wd.defs}</defs><g transform="translate(${r(ox)} ${r(cy)}) scale(${m})">${mk.body}</g><g transform="translate(${r(wordX)} 0)">${wd.body}</g>`;
  return { vb: [-6, top, x2 + 12, bot - top], body, h: bot - top }; }
const lockupSvg = (id, v, o) => { const l = lockup(id, v, o); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${l.vb.map(r).join(' ')}" width="${r(l.vb[2])}" height="${r(l.vb[3])}">${l.body}</svg>`; };
module.exports = { lockup, lockupSvg, FINAL, SMALL, LK };
