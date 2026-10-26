// Wordmark tests: baseline Outfit 700, two-weight, two-weight + play-triangle i-dot. node tests/word-tests.js
const fs = require('fs'), path = require('path'); const A = require('../tools/assets.js');
const V = [['W1 baseline: Outfit Bold lowercase (v5)', A.baseline()], ['W2 two-weight: air 500 (78%) + glow 700', A.wordmark()], ['W3 two-weight + play-triangle i-dot', A.wordmark({ triDot: true })]];
let cells = '';
for (const [n, wm] of V) { const lk = A.lockupSvg('w' + Math.random().toString(36).slice(2, 5), wm); const u = 'data:image/svg+xml;utf8,' + encodeURIComponent(lk);
  cells += `<div class="c"><div class="t">${n}</div><div class="r"><img src="${u}" style="height:120px"><img src="${u}" style="height:44px"><img src="${u}" style="height:28px"><img src="${u}" style="height:20px"><span style="filter:blur(2.2px)"><img src="${u}" style="height:50px"></span></div></div>`; }
fs.writeFileSync(path.join(__dirname, 'word-tests.html'), `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#171323;color:#a29fb4;font:12px system-ui;padding:20px;width:1500px}.c{background:#201D2A;border:1px solid #3C3452;border-radius:12px;padding:10px 16px;margin-bottom:10px}.t{color:#fff;font-weight:600;margin-bottom:6px}.r{display:flex;gap:30px;align-items:center}</style>${cells}`);
console.log('ok');
