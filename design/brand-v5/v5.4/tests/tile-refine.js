// v5.4 icon tile options vs a Twitch-like tile. node tests/tile-refine.js
const fs = require('fs'), path = require('path'); const I = require('../tools/icon3.js'), c = require('../tools/color.js'); const url = s => 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
const lc = (L, C, h) => c.fit(L, C, h);
const T = {
  T0: ['v5.3 tile (violet to orchid to deep pink)', [[0, '#4F24C4'], [.55, '#B83BEA'], [1, '#E2449E']]],
  T1: ['reviewer ramp: warm magenta, no violet (#D03BC0 / #C0399A)', [[0, '#C0399A'], [1, '#D03BC0']]],
  T2: ['plum-to-pink sweep: deep plum #6E2397 (hue 325) through magenta to pink', [[0, lc(.43, .19, 328)], [.5, lc(.56, .24, 331)], [1, '#E2449E']]],
  T3: ['owner look, violet kept small and turned plum: plum only in the bottom-left corner', [[0, lc(.40, .18, 322)], [.28, lc(.52, .24, 329)], [.62, '#C23FC4'], [1, '#E2449E']]],
  T4: ['magenta to rose, one family: #B8329E bottom-left to #E2449E top-right', [[0, '#B8329E'], [.5, '#CF3CB4'], [1, '#E2449E']]],
};
const tw = '#9146FF'; const dE = (a, b) => c.dE(a, b);
function stats(stops) { const arr = []; for (let x = 0; x < 512; x += 16) for (let y = 0; y < 512; y += 16) arr.push(dE(I.toHex(I.tileAt(stops, x, y, 512)), tw)); arr.sort((p, q) => p - q); return { mean: arr.reduce((s, v) => s + v, 0) / arr.length, min: arr[0], p10: arr[Math.floor(arr.length * .1)] }; }
let cells = ''; for (const [k, [name, stops]] of Object.entries(T)) { I.TILES[k] = stops; I.V[k] = { name, tile: k, wedge: '#F3EFE6', band: [.3, .5, .7], bandMix: '#F3EFE6' }; const s = I.iconSvg(k, 512, 3.5); fs.writeFileSync(path.join(__dirname, `tile-${k}.svg`), s); const st = stats(stops), rc = I.ringContrast(k, 512, 3.5);
  console.log(k, 'mean', st.mean.toFixed(1), 'p10', st.p10.toFixed(1), 'min', st.min.toFixed(1), 'ring', rc.toFixed(2)); const u = url(s);
  cells += `<div class="c"><div class="t"><b>${k}</b> ${name}<br>dE to Twitch: mean ${st.mean.toFixed(1)}, lowest 10% ${st.p10.toFixed(1)}; chalk ring ${rc.toFixed(2)}:1</div><div class="r"><img src="${u}" width="160" style="border-radius:36px"><div style="width:160px;height:160px;border-radius:36px;background:${tw};display:grid;place-items:center;color:#fff;font:700 28px system-ui">tw</div><img src="${u}" width="64" style="border-radius:14px"><div style="width:64px;height:64px;border-radius:14px;background:${tw}"></div><img src="${u}" width="40" style="border-radius:9px"></div></div>`; }
fs.writeFileSync(path.join(__dirname, 'tile-refine.html'), `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#15131D;color:#BBB7CB;font:12px/16px system-ui;padding:22px;width:1500px}.g{display:grid;grid-template-columns:1fr 1fr;gap:14px}.c{background:#1E1B28;border:1px solid #3C3452;border-radius:12px;padding:12px}.t{color:#F3EFE6;margin-bottom:8px}.r{display:flex;gap:20px;align-items:center}</style><div class="g">${cells}</div>`);
