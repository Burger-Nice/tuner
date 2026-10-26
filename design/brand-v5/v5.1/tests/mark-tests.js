// Mark exploration for airglow Soft v5.1: renders each candidate at 1024 (PNG file), 96, 48 and 24 px plus blurred. node tests/mark-tests.js
const fs = require('fs'), path = require('path');
const P = { ink: '#0C0B12', chalk: '#F3EFE6', orchid: '#D048F2', pink: '#FF5CB8', violet: '#5B2BD9' };
const G = (id) => `<defs><linearGradient id="${id}" x1="10" y1="80" x2="92" y2="20" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.pink}"/><stop offset="1" stop-color="${P.orchid}"/></linearGradient></defs>`;
const TRI = 'M38 22L88 50L38 78Z';
const tri = (fill, o = 1, tx = 0, ty = 0, sc = 1) => `<g transform="translate(${tx} ${ty}) translate(50 50) scale(${sc}) translate(-50 -50)"><path d="${TRI}" fill="${fill}" stroke="${fill}" stroke-width="10" stroke-linejoin="round" opacity="${o}"/></g>`;
const screen = (fill, o = 1, tx = 0, ty = 0, sc = 1, hole = false) => `<g transform="translate(${tx} ${ty}) translate(50 50) scale(${sc}) translate(-50 -50)"><rect x="6" y="22" width="88" height="56" rx="13" fill="${fill}" opacity="${o}"${hole ? ' mask="url(#hole)"' : ''}/></g>`;
const holeDefs = `<defs><mask id="hole" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="#fff"/><path d="M41 38V62L63 50Z" fill="#000" stroke="#000" stroke-width="5" stroke-linejoin="round"/></mask></defs>`;
const C = [
  ['M1  v5 Soft: halo + 3 blurred echoes (baseline)', id => `<defs><filter id="${id}b1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter><filter id="${id}b5" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="6"/></filter></defs>${G(id + 'g')}<g filter="url(#${id}b5)">${tri(P.orchid, .5, 0, 0, 1.28)}</g>${[3, 2, 1].map(i => `<g filter="url(#${id}b1)">${tri(i === 3 ? P.violet : P.orchid, [0, .16, .32, .55][4 - i], -9 * i, 0, 1 - .08 * i)}</g>`).join('')}${tri(`url(#${id}g)`)}`, 'blur'],
  ['M2  glowing screen, play knocked out, hard offset glow', id => `${G(id + 'g')}${holeDefs}${screen(P.orchid, .26, 0, 5, 1.12)}${screen(`url(#${id}g)`, 1, 0, 0, 1, true)}`, 'hard'],
  ['M3  triangle + ONE hard offset echo (-10,+6) at 30%', id => `${G(id + 'g')}${tri(P.orchid, .3, -10, 6)}${tri(`url(#${id}g)`)}`, 'hard'],
  ['M4  triangle inside a larger hard-edged glow triangle', id => `${G(id + 'g')}${tri(P.orchid, .2, -4, 0, 1.42)}${tri(`url(#${id}g)`)}`, 'hard'],
  ['M5  screen + play + hard offset echo screen (-7,+6)', id => `${G(id + 'g')}${holeDefs}${screen(P.orchid, .3, -7, 6)}${screen(`url(#${id}g)`, 1, 0, 0, 1, true)}`, 'hard'],
  ['M6  triangle + two hard echoes, 22% and 10%, offset down-left', id => `${G(id + 'g')}${tri(P.orchid, .1, -20, 12)}${tri(P.orchid, .22, -10, 6)}${tri(`url(#${id}g)`)}`, 'hard'],
  ['M7  screen, hard glow, play ink-filled (not cut) for contrast', id => `${G(id + 'g')}${screen(P.orchid, .26, 0, 5, 1.12)}${screen(`url(#${id}g)`)}<path d="M41 38V62L63 50Z" fill="${P.ink}" stroke="${P.ink}" stroke-width="5" stroke-linejoin="round"/>`, 'hard'],
  ['M8  triangle, flat orchid echo as an underlay plate, no gradient', id => `<path d="M30 30L82 56L30 82Z" fill="${P.orchid}" opacity=".35" stroke="${P.orchid}" stroke-width="9" stroke-linejoin="round"/>${tri(P.chalk)}`, 'hard'],
];
const svg = (id, f) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -8 116 116">${f(id)}</svg>`;
const out = __dirname; let cells = '';
C.forEach(([name, f, kind], i) => { const id = 'c' + i; const s = svg(id, f); fs.writeFileSync(path.join(out, `mark-M${i + 1}.svg`), s); const u = 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
  const tile = `<span class="tile"><img src="${u}" width="64"></span>`;
  cells += `<div class="c"><div class="t">${name}${kind === 'blur' ? ' <em>(uses blur filters)</em>' : ''}</div><div class="r"><img src="${u}" width="150"><img src="${u}" width="96"><img src="${u}" width="48"><img src="${u}" width="24"><span style="filter:blur(2.4px)"><img src="${u}" width="64"></span>${tile}</div></div>`; });
fs.writeFileSync(path.join(out, 'mark-tests.html'), `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#14111E;color:#a29fb4;font:12px system-ui;padding:22px;width:1800px}h1{font-size:14px;letter-spacing:.1em;text-transform:uppercase;color:#fff;margin:0 0 6px}p{margin:0 0 14px;max-width:1300px}.g{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.c{background:#1c1730;border:1px solid #2c2540;border-radius:12px;padding:10px 14px}.t{color:#fff;font-weight:600;margin-bottom:6px}.t em{color:#ffb4b4;font-style:normal;font-weight:400}.r{display:flex;gap:26px;align-items:center}.tile{display:inline-grid;place-items:center;width:84px;height:84px;border-radius:19px;background:linear-gradient(135deg,#4a1f9e,#8a2fc0)}</style>
<h1>airglow Soft: mark candidates</h1><p>Each row: 150 px, 96, 48, 24 px, blurred 64 px (across the room), then on a dark-violet icon tile. The 1024 px renders are exported as PNG files (mark-M#-1024.png). Question: does the idea survive 24 px and blur, without blur filters, and is it more than a stock play button?</p><div class="g">${cells}</div>`);
console.log('mark tests written');
