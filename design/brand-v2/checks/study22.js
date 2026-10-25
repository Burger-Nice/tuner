// v2.2 study: needle breaks the scale (review fix 1/2/3). Builds variant marks + lockups, renders greyscale / blur / small sizes. node checks/study22.js
const fs = require('fs'), path = require('path');
const { UNER, UNER_W } = require('./geometry.js');
const P = require('./palette.js');
const r = n => +n.toFixed(2);
const letters = () => UNER.map(l => `<path${l.x ? ` transform="translate(${l.x} 0)"` : ''}${l.e ? ' fill-rule="evenodd"' : ''} d="${l.d}"/>`).join('');
// spec: W bar width, H bar thickness, nW stem width, P pointer height above the bar, tip pointer tip width, g gap bar<->needle, ticks [{d,w,h,edge}]
function build(s) {
  const cx = s.W / 2, nl = cx - s.nW / 2, nr = cx + s.nW / 2;
  const needle = `M${r(cx - s.tip / 2)} ${-s.P}H${r(cx + s.tip / 2)}L${r(nr)} 0V100H${r(nl)}V0Z`;
  const arm = (x0, x1, side) => { // outline of one arm with notches
    const nt = s.ticks.map(t => { const c = side < 0 ? cx - t.d : cx + t.d; return { a: c - t.w / 2, b: c + t.w / 2, h: t.h, e: t.edge }; })
      .filter(t => t.a >= x0 - 0.01 && t.b <= x1 + 0.01);
    const top = nt.filter(t => t.e === 'top').sort((p, q) => p.a - q.a), bot = nt.filter(t => t.e === 'bot').sort((p, q) => q.a - p.a), mid = nt.filter(t => t.e === 'mid');
    let d = `M${r(x0)} 0`; for (const t of top) d += `H${r(t.a)}V${r(t.h)}H${r(t.b)}V0`; d += `H${r(x1)}V${r(s.H)}`;
    for (const t of bot) d += `H${r(t.b)}V${r(s.H - t.h)}H${r(t.a)}V${r(s.H)}`; d += `H${r(x0)}Z`; for (const t of mid) { const y0 = (s.H - t.h) / 2; d += `M${r(t.a)} ${r(y0)}V${r(y0 + t.h)}H${r(t.b)}V${r(y0)}Z`; } return d; };
  const g = s.g || 0;
  const bar = g ? arm(0, nl - g, -1) + arm(nr + g, s.W, 1) : (() => { // single piece behind the needle
    const a = arm(0, s.W, -1); return a; })();
  // when g==0 build one outline with ticks on both sides: reuse arm for each half then join under the needle
  const barJoined = g ? bar : arm(0, nl, -1) + arm(nr, s.W, 1) + `M${r(nl)} 0H${r(nr)}V${r(s.H)}H${r(nl)}Z`;
  return { needle, bar: barJoined, W: s.W, cx, top: -s.P };
}
const AMBER = P.accent, WHITE = P['text-1'], INK = P['bg-0'];
function mark(s, mode) { // returns svg body in mark units
  const m = build(s);
  if (mode === 'two') return `<path fill="${AMBER}" fill-rule="evenodd" d="${m.bar}"/><path fill="${WHITE}" d="${m.needle}"/>`;
  if (mode === 'amber') return `<path fill="${AMBER}" fill-rule="evenodd" d="${m.bar}"/><path fill="${AMBER}" d="${m.needle}"/>`;
  if (mode === 'ink') return `<path fill="${INK}" fill-rule="evenodd" d="${m.bar}"/><path fill="${INK}" d="${m.needle}"/>`;
}
function lock(s, mode, gap) { const m = build(s); const x = s.W + gap; const top = -s.P;
  return { w: x + UNER_W, h: 100 - top, top, body: mark(s, mode) + `<g fill="${WHITE}" transform="translate(${r(x)} 0)">${letters()}</g>` }; }
const svg = l => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${l.top} ${r(l.w)} ${l.h}">${l.body}</svg>`;
module.exports = { build, mark, lock, svg, r, AMBER, WHITE, INK };
if (require.main === module) {
  const out = path.join(__dirname, 'study22'); fs.mkdirSync(out, { recursive: true });
  const T = (d, w, h, edge) => ({ d, w, h, edge });
  const base = { W: 84, H: 23, nW: 23, P: 0, tip: 23, g: 0 };
  const V = {
    'a-v2.1 (taper, flush)':   { W: 97, H: 23, nW: 23, P: 0, tip: 23, g: 0, ticks: [20, 30.5, 41].map(d => T(d, 3.9, 11.5, 'bot')) , _old: 1 },
    'b-straight stem only':    { ...base, ticks: [19.5, 29.5].map(d => T(d, 3.9, 11.5, 'bot')) },
    'c-proud needle flat tip': { ...base, P: 14, tip: 14, ticks: [19.5, 29.5].map(d => T(d, 3.9, 11.5, 'bot')) },
    'd-proud + top-edge scale':{ ...base, P: 14, tip: 14, ticks: [T(19.5, 4, 11.5, 'top'), T(29.5, 3, 6, 'top')] },
    'e-proud, no ticks':       { ...base, P: 14, tip: 14, ticks: [] },
    'f-proud pointed':         { ...base, P: 18, tip: 6, ticks: [19.5, 29.5].map(d => T(d, 3.9, 11.5, 'bot')) },
    'g-proud + gaps (shape)':  { ...base, P: 14, tip: 14, g: 3, ticks: [19.5, 29.5].map(d => T(d, 3.9, 11.5, 'bot')) },
    'h-proud + gaps + top scale': { ...base, P: 14, tip: 14, g: 3, ticks: [T(19.5, 4, 11.5, 'top'), T(29.5, 3, 6, 'top')] },
  };
  let html = `<body style="margin:0;background:${INK};color:#8a909a;font:11px sans-serif;padding:20px;width:1900px">`;
  for (const [n, s] of Object.entries(V)) {
    const lk = s._old ? null : lock(s, 'two', 8); const lkA = s._old ? null : lock(s, 'amber', 8);
    if (!lk) continue;
    fs.writeFileSync(path.join(out, n.split('-')[0] + '-two.svg'), svg(lk)); fs.writeFileSync(path.join(out, n.split('-')[0] + '-amber.svg'), svg(lkA));
    const u2 = `data:image/svg+xml;utf8,${encodeURIComponent(svg(lk))}`, uA = `data:image/svg+xml;utf8,${encodeURIComponent(svg(lkA))}`;
    html += `<div style="display:flex;gap:26px;align-items:flex-end;border-bottom:1px solid #2a2e36;padding:10px 0"><div style="width:130px">${n}</div>
      <img src="${u2}" style="height:92px"><img src="${u2}" style="height:30px"><img src="${u2}" style="height:18px"><img src="${u2}" style="height:46px;filter:grayscale(1)"><img src="${u2}" style="height:46px;filter:blur(1.4px)">
      <img src="${uA}" style="height:92px"><img src="${uA}" style="height:18px"><img src="${uA}" style="height:46px;filter:grayscale(1)">
      <span style="display:inline-block;width:56px;height:56px;background:${INK}"><svg viewBox="${-4} ${-s.P - 4} ${s.W + 8} ${100 + s.P + 8}" width="56" height="56">${mark(s, 'two')}</svg></span>
      <span style="display:inline-block;width:24px;height:24px"><svg viewBox="${-4} ${-s.P - 4} ${s.W + 8} ${100 + s.P + 8}" width="24" height="24">${mark(s, 'two')}</svg></span></div>`;
  }
  fs.writeFileSync(path.join(out, 'study.html'), html);
}
