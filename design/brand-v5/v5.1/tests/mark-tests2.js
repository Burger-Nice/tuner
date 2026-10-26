// Round 2: glow as a hard vector shape (no blur filter). Also icon-tile tests next to Twitch / YouTube-style tiles. node tests/mark-tests2.js
const fs = require('fs'), path = require('path');
const P = { ink: '#0C0B12', chalk: '#F3EFE6', orchid: '#D048F2', pink: '#FF5CB8', violet: '#5B2BD9', yt: '#FF0000' };
const G = (id) => `<defs><linearGradient id="${id}g" x1="10" y1="80" x2="92" y2="20" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.pink}"/><stop offset="1" stop-color="${P.orchid}"/></linearGradient></defs>`;
const TRI = 'M38 22L88 50L38 78Z';
const tri = (fill, o = 1, tx = 0, ty = 0, sc = 1, sw = 10) => `<g transform="translate(${tx} ${ty}) translate(50 50) scale(${sc}) translate(-50 -50)"><path d="${TRI}" fill="${fill}" stroke="${fill}" stroke-width="${sw}" stroke-linejoin="round" opacity="${o}"/></g>`;
const N = [
  ['N1  M4a: concentric glow triangle, flat 20%', id => `${G(id)}${tri(P.orchid, .2, -4, 0, 1.42)}${tri(`url(#${id}g)`)}`],
  ['N2  glow plate: one big triangle with a LEFT-TO-RIGHT alpha gradient (light spilling left)', id => `${G(id)}<defs><linearGradient id="${id}p" x1="86" y1="50" x2="6" y2="50" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.orchid}" stop-opacity=".5"/><stop offset="1" stop-color="${P.orchid}" stop-opacity="0"/></linearGradient></defs>${tri(`url(#${id}p)`, 1, -6, 0, 1.5)}${tri(`url(#${id}g)`)}`],
  ['N3  radial glow disc (vector radialGradient, no blur)', id => `${G(id)}<defs><radialGradient id="${id}r" cx="56" cy="50" r="58" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.orchid}" stop-opacity=".6"/><stop offset=".55" stop-color="${P.orchid}" stop-opacity=".22"/><stop offset="1" stop-color="${P.orchid}" stop-opacity="0"/></radialGradient></defs><circle cx="56" cy="50" r="58" fill="url(#${id}r)"/>${tri(`url(#${id}g)`)}`],
  ['N4  N3 glow + one hard offset echo (-9,+6) at 28%', id => `${G(id)}<defs><radialGradient id="${id}r" cx="56" cy="50" r="58" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.orchid}" stop-opacity=".5"/><stop offset="1" stop-color="${P.orchid}" stop-opacity="0"/></radialGradient></defs><circle cx="56" cy="50" r="58" fill="url(#${id}r)"/>${tri(P.orchid, .28, -9, 6)}${tri(`url(#${id}g)`)}`],
  ['N5  N2 + N3 (spill plate and radial glow)', id => `${G(id)}<defs><linearGradient id="${id}p" x1="86" y1="50" x2="6" y2="50" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.orchid}" stop-opacity=".42"/><stop offset="1" stop-color="${P.orchid}" stop-opacity="0"/></linearGradient><radialGradient id="${id}r" cx="60" cy="50" r="46" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.orchid}" stop-opacity=".45"/><stop offset="1" stop-color="${P.orchid}" stop-opacity="0"/></radialGradient></defs>${tri(`url(#${id}p)`, 1, -6, 0, 1.5)}<circle cx="60" cy="50" r="46" fill="url(#${id}r)"/>${tri(`url(#${id}g)`)}`],
];
const svg = (id, f) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -8 124 116">${f(id)}</svg>`;
const out = __dirname; const url = s => 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
let cells = '';
N.forEach(([name, f], i) => { const id = 'n' + i; const s = svg(id, f); fs.writeFileSync(path.join(out, `mark-N${i + 1}.svg`), s); const u = url(s);
  cells += `<div class="c"><div class="t">${name}</div><div class="r"><img src="${u}" width="170"><img src="${u}" width="96"><img src="${u}" width="48"><img src="${u}" width="24"><span style="filter:blur(2.4px)"><img src="${u}" width="64"></span></div></div>`; });
// icon tile tests (chosen: N2 mark; tiles at 96 px) next to references
const mk = (s, w) => `<img src="${url(s)}" width="${w}">`;
const t = (bg, inner, label) => `<div style="text-align:center;font-size:11px;color:#a29fb4"><div style="width:96px;height:96px;border-radius:22px;background:${bg};display:grid;place-items:center;overflow:hidden">${inner}</div>${label}</div>`;
const chalkMark = svg('tc', id => `<defs><linearGradient id="${id}p" x1="86" y1="50" x2="6" y2="50" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>${tri(`url(#${id}p)`, 1, -6, 0, 1.5)}${tri(P.chalk)}`);
const inkMark = svg('ti', id => tri(P.ink));
const sc = svg('ts', id => `<rect x="6" y="22" width="88" height="56" rx="13" fill="${P.chalk}"/><path d="M41 38V62L63 50Z" fill="${P.violet}" stroke="${P.violet}" stroke-width="5" stroke-linejoin="round"/>`);
const ytMark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="6" y="22" width="88" height="56" rx="13" fill="#fff"/><path d="M41 38V62L63 50Z" fill="#E50000"/></svg>`;
const tiles = [
  t('linear-gradient(135deg,#5a22b8,#c03fe0)', mk(chalkMark, 80), 'A chalk on violet to orchid'), t('linear-gradient(135deg,#8a2fd0,#c03fe0)', mk(chalkMark, 80), 'A2 lighter'),
  t('linear-gradient(135deg,#FF5CB8,#D048F2)', mk(inkMark, 80), 'B ink on pink to orchid'), t('#9146FF', mk(chalkMark, 80), 'Twitch-like'), t('#FF0000', mk(ytMark, 90), 'YouTube-like (red, rounded screen)'), t('linear-gradient(135deg,#FF5CB8,#D048F2)', mk(sc, 90), 'M2 screen idea on our colours'),
].join('');
fs.writeFileSync(path.join(out, 'mark-tests2.html'), `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#14111E;color:#a29fb4;font:12px system-ui;padding:22px;width:1800px}h1{font-size:14px;letter-spacing:.1em;text-transform:uppercase;color:#fff;margin:0 0 6px}p{margin:0 0 14px;max-width:1300px}.g{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.c{background:#1c1730;border:1px solid #2c2540;border-radius:12px;padding:10px 14px}.t{color:#fff;font-weight:600;margin-bottom:6px}.r{display:flex;gap:26px;align-items:center}.tl{display:flex;gap:22px;margin-top:16px;background:#08070c;padding:16px;border-radius:14px}</style>
<h1>airglow Soft: round 2, glow as a vector shape (no blur filter)</h1><p>Rows: 170, 96, 48, 24 px, blurred 64 px. Below: icon tile tests at 96 px, including the screen idea (M2) beside a YouTube-style tile to show the silhouette collision.</p><div class="g">${cells}</div><div class="tl">${tiles}</div>`);
console.log('ok');
