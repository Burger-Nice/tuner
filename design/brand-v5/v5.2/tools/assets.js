// airglow v5.2 assets: final Soft mark (no blur filters anywhere), lockup with a two-weight wordmark, icon, adaptive layers, banner.
const W = require('./wordmarks.json'); const P = require('./palette.js');
const r = n => +n.toFixed(2);
const svg = (vb, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${extra}>${body}</svg>`;
const M2 = require('./mark2.js'); const SHAPE = M2.OWN2;   // v5.2 shape: 69 long, apex r11, base r6 (own proportion)
const CX = 67.5;                                            // visual centre of the shape (x 33..102, y 17..83)
const lin = (id) => `<linearGradient id="${id}g" x1="10" y1="80" x2="96" y2="20" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.pink}"/><stop offset="1" stop-color="${P.orchid}"/></linearGradient>`;
const rad = (id, o = 0.5, cx = CX, cy = 50, rr = 58, col = P.orchid) => `<radialGradient id="${id}r" cx="${cx}" cy="${cy}" r="${rr}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${col}" stop-opacity="${o}"/><stop offset=".55" stop-color="${col}" stop-opacity="${r(o * 0.38)}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
const coreG = (id) => `<radialGradient id="${id}c" cx="46" cy="50" r="46" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFD3EA"/><stop offset=".45" stop-color="${P.pink}"/><stop offset="1" stop-color="${P.orchid}"/></radialGradient>`;
const shape = (fill, o = 1, tx = 0, ty = 0) => `<g transform="translate(${tx} ${ty})"><path d="${SHAPE}" fill="${fill}" opacity="${o}"/></g>`;
// the UI mark: one shape, lit from inside (hot core at the base, pink to orchid toward the apex) + radial glow disc (vector gradient, not a blur). No echo.
const markBody = (id, o = {}) => `<defs>${coreG(id)}${o.glow === false ? '' : rad(id, o.glowO ?? 0.55)}</defs>${o.glow === false ? '' : `<circle cx="${CX}" cy="50" r="58" fill="url(#${id}r)"/>`}${shape(o.front || `url(#${id}c)`)}`;
const MARK_VB = '4 -8 126 116';
// wordmark: "air" 500 (chalk, 78%) + "glow" 700 (chalk). The i-dot can be a small play triangle (dotDot: true).
const g = (key) => W[key];
const splitSub = (d) => d.split(/(?=M)/);
function wordmark(opt = {}) {
  const col = opt.ink ? P['ink-on-brand'] : P['text-1'], airO = opt.ink ? 1 : 0.78;
  const a = g('air5'), b = g('glow7'), gap = 8;
  const gi = a.glyphs[1], subs = splitSub(gi.d); const dotIdx = subs.findIndex(s => { const ys = [...s.matchAll(/[ML]\s*[-\d.]+\s+(-?[\d.]+)/g)].map(m => +m[1]); return Math.min(...ys) < -85 || /-9\d|-10\d/.test(s.slice(0, 40)); });
  let aPaths = a.glyphs.map((gl, i) => i !== 1 ? `<path d="${gl.d}"/>` : (opt.triDot ? `<path d="${subs.filter((_, j) => j !== dotIdx).join('')}"/>` : `<path d="${gl.d}"/>`)).join('');
  let dot = '';
  if (opt.triDot && dotIdx >= 0) { const nums = [...subs[dotIdx].matchAll(/(-?[\d.]+)\s+(-?[\d.]+)/g)].map(m => [+m[1], +m[2]]); const xs = nums.map(n => n[0]), ys = nums.map(n => n[1]); const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, s = 15;
    dot = `<path d="M${r(cx - s * 0.55)} ${r(cy - s)}L${r(cx + s * 0.95)} ${r(cy)}L${r(cx - s * 0.55)} ${r(cy + s)}Z" fill="${P.pink}" stroke="${P.pink}" stroke-width="5" stroke-linejoin="round"/>`; }
  const bx = (a.bbox.x2 - b.bbox.x1) + gap;
  return { w: bx + (b.bbox.x2 - b.bbox.x1) + 0, x1: a.bbox.x1, body: `<g fill="${col}" opacity="${airO}">${aPaths}</g>${dot}<g fill="${col}" transform="translate(${r(bx)} 0)">${b.glyphs.map(gl => `<path d="${gl.d}"/>`).join('')}</g>` };
}
const baseline = () => ({ w: g('all7').bbox.x2 - g('all7').bbox.x1, x1: g('all7').bbox.x1, body: `<g fill="${P['text-1']}">${g('all7').glyphs.map(gl => `<path d="${gl.d}"/>`).join('')}</g>` });
// lockup: mark box (x 4..130) + wordmark scaled to cap 62, baseline y 71. opt.ink: flat ink mark + ink wordmark (for the gradient banner), no glow.
function lockup(id, wm = wordmark(), opt = {}) { const s = 0.62, start = 121, x0 = start - wm.x1 * s; return { w: start - 4 + wm.w * s + 10, vbx: 4, vby: -8, h: 116, body: (opt.ink ? `${bloom(id, 45, 50, 56)}${shape(P['ink-on-brand'])}` : markBody(id)) + `<g transform="translate(${r(x0)} 71) scale(${s})">${wm.body}</g>` }; }
const lockupSvg = (id = 'lk', wm, opt) => { const l = lockup(id, wm, opt); return svg(`${l.vbx} ${l.vby} ${r(l.w)} ${l.h}`, l.body, `width="${r(l.w)}" height="${l.h}"`); };

// ---- icon: ink triangle on the pink to orchid tile (chalk on a pink/orchid tile fails contrast; ink is 5.2-6.3:1) ----
const tileGrad = (id, sz) => `<linearGradient id="${id}" x1="0" y1="${sz}" x2="${sz}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.pink}"/><stop offset="1" stop-color="${P.orchid}"/></linearGradient>`;
const BLOOM = '#FFC2E1';
// bloom: radial #FFC2E1 at 55% centred on the wedge base, fading to 0, painted under the ink wedge (a vector gradient, no filter)
const bloom = (id, cx, cy, rr) => `<defs><radialGradient id="${id}b" cx="${cx}" cy="${cy}" r="${rr}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${BLOOM}" stop-opacity=".55"/><stop offset="1" stop-color="${BLOOM}" stop-opacity="0"/></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="${rr}" fill="url(#${id}b)"/>`;
const iconGlyph = (id, o = {}) => `${o.glow ? bloom(id, 45, 50, 56) : ''}${shape(P['ink-on-brand'])}`;
const icon = () => svg('0 0 512 512', `<defs>${tileGrad('ti', 512)}</defs><rect width="512" height="512" fill="url(#ti)"/><g transform="translate(271 256) scale(3.8) translate(-67.5 -50)">${iconGlyph('tg', { glow: true })}</g>`, 'width="1024" height="1024"');
const iconFg = () => svg('0 0 108 108', `<g transform="translate(58 54) scale(0.5) translate(-67.5 -50)">${iconGlyph('fg', { glow: true })}</g>`, 'width="108" height="108"');
const iconBg = () => svg('0 0 108 108', `<defs>${tileGrad('bg', 108)}</defs><rect width="108" height="108" fill="url(#bg)"/>`, 'width="108" height="108"');
// ---- small mark (<= 32 px): plain gradient triangle, nothing that can smudge ----
const markSmall = () => svg('28 12 80 76', `<defs>${coreG('sm')}</defs>${shape('url(#smc)')}`, 'width="80" height="76"');
const mark = () => svg(MARK_VB, markBody('mk'), 'width="126" height="116"');
// ---- banner 320x180: the icon's sibling. Pink to orchid field (no violet), ink lockup. ----
const banner = () => { const l = lockup('bn', wordmark({ ink: true }), { ink: true }), s = 0.5, bw = l.w * s;
  return svg('0 0 320 180', `<defs><linearGradient id="bnf" x1="0" y1="150" x2="320" y2="30" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.pink}"/><stop offset="1" stop-color="${P.orchid}"/></linearGradient></defs><rect width="320" height="180" fill="url(#bnf)"/><svg x="${r((320 - bw) / 2)}" y="${r(90 - 58 * s)}" width="${r(bw)}" height="${r(l.h * s)}" viewBox="${l.vbx} ${l.vby} ${r(l.w)} ${l.h}">${l.body}</svg>`, 'width="320" height="180"'); };
// quiet alternative (v5.1 banner idea, no violet-led field): canvas with orchid/pink glows and the chalk lockup
const bannerDark = () => { const l = lockup('bd'), s = 0.5, bw = l.w * s; const rg = (id, cx, cy, rr, col, o) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${rr}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${col}" stop-opacity="${o}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
  return svg('0 0 320 180', `<defs>${rg('bd1', 60, 30, 190, P.orchid, 0.5)}${rg('bd2', 290, 175, 200, P.pink, 0.4)}</defs><rect width="320" height="180" fill="${P['bg-0']}"/><rect width="320" height="180" fill="url(#bd1)"/><rect width="320" height="180" fill="url(#bd2)"/><svg x="${r((320 - bw) / 2)}" y="${r(90 - 58 * s)}" width="${r(bw)}" height="${r(l.h * s)}" viewBox="${l.vbx} ${l.vby} ${r(l.w)} ${l.h}">${l.body}</svg>`, 'width="320" height="180"'); };
module.exports = { P, mark, markSmall, lockupSvg, wordmark, baseline, icon, iconFg, iconBg, banner, bannerDark, markBody, MARK_VB, svg, r, SHAPE, CX };
