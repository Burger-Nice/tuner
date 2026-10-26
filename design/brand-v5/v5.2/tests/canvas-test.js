// Does the canvas tint fight artwork? Synthetic poster-like art (skin tone, foliage, sunset, teal water, noir) on three canvases. node tests/canvas-test.js
const fs = require('fs'), path = require('path');
const art = [
 ['portrait', 'radial-gradient(ellipse 38% 30% at 50% 36%,#d9a07e 0,#b97a5c 55%,transparent 60%),radial-gradient(ellipse 60% 40% at 50% 100%,#2a3a4f 0,transparent 70%),linear-gradient(#5a4638,#2b2220)'],
 ['forest', 'linear-gradient(180deg,#9bb98a 0,#4d7d49 38%,#1f3d27 100%)'],
 ['sunset', 'linear-gradient(180deg,#2c2b57 0,#c4577a 45%,#f1a14e 70%,#3a2018 100%)'],
 ['sea', 'linear-gradient(180deg,#bfe3e8 0,#3aa0a8 45%,#0d3d4a 100%)'],
 ['noir', 'linear-gradient(135deg,#d8d8d4 0,#6c6c6a 50%,#1c1c1c 100%)'],
 ['desert', 'linear-gradient(180deg,#e9c58f 0,#c88a52 55%,#6a3b24 100%)']];
const canv = [['v5.1 canvas #171323 (C .032)', '#171323', '#2C2839'], ['v5.2 canvas #121019 (C .019)', '#121019', '#2D2B35'], ['neutral reference #121214 (C 0)', '#121214', '#2B2B2E']];
const row = ([n, bg, s1]) => `<div style="background:${bg};padding:16px 20px 18px;border-top:1px solid #000"><div style="font:600 12px system-ui;color:#C8C4D8;margin-bottom:10px">${n}</div><div style="display:flex;gap:14px">${art.map(([k, g]) => `<div style="width:130px"><div style="height:176px;border-radius:10px;background:${g}"></div><div style="height:26px;margin-top:6px;border-radius:8px;background:${s1}"></div></div>`).join('')}</div></div>`;
fs.writeFileSync(path.join(__dirname, 'canvas-test.html'), `<!doctype html><meta charset="utf-8"><body style="margin:0;width:900px">${canv.map(row).join('')}`);
