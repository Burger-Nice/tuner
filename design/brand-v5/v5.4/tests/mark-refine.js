// v5.3 refinement sheet. node tests/mark-refine.js ; render with tools/render.js ; 1024 px PNGs with tests/export-refine.js
const fs = require('fs'), path = require('path'); const { svgMark, DEF } = require('../tools/mark3.js');
const V = {
  R1: ['v5 literal, crisp: 3 solid bands, tucked behind each other, scales .905/.81/.715, apex r7.5 (tuned)', { gap: 0, step: 10, dh: .095, L: 62, H: 70, rb: 6, ra: 7.5, rr: 5.5 }],
  R2: ['R1 with 2-unit gaps between layers (reads as stacked cards, not a smear)', { gap: 2, step: 11, dh: .09, L: 60, H: 71, rb: 5.5, ra: 5.5 }],
  R3: ['wider steps (13) and steeper stairs, gaps 2.5, apex r8', { gap: 2.5, step: 13, dh: .11, L: 64, H: 70, ra: 8 }],
  R4: ['two bands only (14 each): the reduced version', { n: 2, gap: 3, step: 15, dh: .12, L: 64, H: 70, ra: 8 }],
  R5: ['long soft-nosed wedge (68 x 66, apex r11) + 3 bands', { gap: 2.5, step: 12, dh: .1, L: 68, H: 66, ra: 11 }],
  R6: ['R3 with a horizontal gradient (pink to orchid along the travel)', { gap: 2.5, step: 13, dh: .11, L: 64, H: 70, ra: 8, grad: 'horiz' }],
  R7: ['R1 tuned: touching bands, hairline 1-unit cut, step 10, scales .90/.80/.70, apex r7', { gap: 1, step: 11, dh: .10, L: 62, H: 70, rb: 6, ra: 7, rr: 5 }],
  R8: ['equal-height bars (control: the skip-back / fast-forward read)', { gap: 3, step: 11, dh: 0, L: 62, H: 70, ra: 8 }],
  R9: ['no violet: bands step from dark orchid to orchid', { gap: 2.5, step: 13, dh: .11, L: 64, H: 70, ra: 8, from: '#7A2FA8', to: '#BE3DE0' }],
  R10: ['R1 reduced to two touching bands (the small-size version)', { n: 2, gap: 0, step: 13, dh: .11, L: 62, H: 70, rb: 6, ra: 7, rr: 5 }],
};
const url = s => 'data:image/svg+xml;utf8,' + encodeURIComponent(s); let cells = '';
Object.entries(V).forEach(([k, [name, o]]) => { const s = svgMark(k.toLowerCase(), o); fs.writeFileSync(path.join(__dirname, `mark-${k}.svg`), s); const u = url(s);
  cells += `<div class="c"><div class="t">${k}  ${name}</div><div class="r"><img src="${u}" height="130"><img src="${u}" height="75"><img src="${u}" height="38"><img src="${u}" height="19"><span style="filter:blur(2.2px)"><img src="${u}" height="50"></span></div></div>`; });
fs.writeFileSync(path.join(__dirname, 'mark-refine.html'), `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#15131D;color:#BBB7CB;font:12px system-ui;padding:22px;width:1500px}h1{font-size:14px;letter-spacing:.1em;text-transform:uppercase;color:#fff;margin:0 0 6px}.g{display:grid;grid-template-columns:1fr 1fr;gap:14px}.c{background:#1E1B28;border:1px solid #3C3452;border-radius:12px;padding:12px}.t{color:#F3EFE6;margin-bottom:8px}.r{display:flex;gap:26px;align-items:center;height:140px}</style><h1>v5.3 echo mark refinement. Heights shown ~ 1024 px render scaled to 130, then 75 (96 px), 38 (48 px), 19 (24 px), blurred</h1><div class="g">${cells}</div>`);
