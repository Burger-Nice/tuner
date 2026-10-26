// airglow v5.1 assets: final Soft mark (no blur filters anywhere), lockup with a two-weight wordmark, icon, adaptive layers, banner.
const W = require('./wordmarks.json'); const P = require('./palette.js');
const r = n => +n.toFixed(2);
const svg = (vb, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${extra}>${body}</svg>`;
const TRI = 'M38 22L88 50L38 78Z';
const tri = (fill, o = 1, tx = 0, ty = 0, sw = 10) => `<g transform="translate(${tx} ${ty})"><path d="${TRI}" fill="${fill}" stroke="${fill}" stroke-width="${sw}" stroke-linejoin="round" opacity="${o}"/></g>`;
const lin = (id) => `<linearGradient id="${id}g" x1="10" y1="80" x2="92" y2="20" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.pink}"/><stop offset="1" stop-color="${P.orchid}"/></linearGradient>`;
const rad = (id, o = 0.5, cx = 56, cy = 50, rr = 58, col = P.orchid) => `<radialGradient id="${id}r" cx="${cx}" cy="${cy}" r="${rr}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${col}" stop-opacity="${o}"/><stop offset=".55" stop-color="${col}" stop-opacity="${r(o * 0.38)}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
// the UI mark: gradient play triangle, one hard offset echo (-9,+6) at 28%, radial glow (a vector gradient, not a blur)
const markBody = (id, o = {}) => `<defs>${lin(id)}${o.glow === false ? '' : rad(id, o.glowO ?? 0.5)}</defs>${o.glow === false ? '' : `<circle cx="56" cy="50" r="58" fill="url(#${id}r)"/>`}${o.echo === false ? '' : tri(o.echoCol || P.orchid, o.echoO ?? 0.28, -9, 6)}${tri(o.front || `url(#${id}g)`)}`;
const MARK_VB = '-12 -8 124 116';
// wordmark: "air" 500 (chalk, 78%) + "glow" 700 (chalk). The i-dot can be a small play triangle (dotDot: true).
const g = (key) => W[key];
const splitSub = (d) => d.split(/(?=M)/);
function wordmark(opt = {}) {
  const a = g('air5'), b = g('glow7'), gap = 12;
  const gi = a.glyphs[1], subs = splitSub(gi.d); const dotIdx = subs.findIndex(s => { const ys = [...s.matchAll(/[ML]\s*[-\d.]+\s+(-?[\d.]+)/g)].map(m => +m[1]); return Math.min(...ys) < -85 || /-9\d|-10\d/.test(s.slice(0, 40)); });
  let aPaths = a.glyphs.map((gl, i) => i !== 1 ? `<path d="${gl.d}"/>` : (opt.triDot ? `<path d="${subs.filter((_, j) => j !== dotIdx).join('')}"/>` : `<path d="${gl.d}"/>`)).join('');
  let dot = '';
  if (opt.triDot && dotIdx >= 0) { const nums = [...subs[dotIdx].matchAll(/(-?[\d.]+)\s+(-?[\d.]+)/g)].map(m => [+m[1], +m[2]]); const xs = nums.map(n => n[0]), ys = nums.map(n => n[1]); const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, s = 15;
    dot = `<path d="M${r(cx - s * 0.55)} ${r(cy - s)}L${r(cx + s * 0.95)} ${r(cy)}L${r(cx - s * 0.55)} ${r(cy + s)}Z" fill="${P.pink}" stroke="${P.pink}" stroke-width="5" stroke-linejoin="round"/>`; }
  const bx = (a.bbox.x2 - b.bbox.x1) + gap;
  return { w: bx + (b.bbox.x2 - b.bbox.x1) + 0, x1: a.bbox.x1, body: `<g fill="${P['text-1']}" opacity="0.78">${aPaths}</g>${dot}<g fill="${P['text-1']}" transform="translate(${r(bx)} 0)">${b.glyphs.map(gl => `<path d="${gl.d}"/>`).join('')}</g>` };
}
const baseline = () => ({ w: g('all7').bbox.x2 - g('all7').bbox.x1, x1: g('all7').bbox.x1, body: `<g fill="${P['text-1']}">${g('all7').glyphs.map(gl => `<path d="${gl.d}"/>`).join('')}</g>` });
// lockup: mark box (x -12..112) + wordmark scaled to cap 62 (x-height ~43), baseline y 71
function lockup(id, wm = wordmark()) { const s = 0.62, x0 = 112 - wm.x1 * s; return { w: 112 + 12 + wm.w * s + 6 + 6, vbx: -12, vby: -8, h: 116, body: markBody(id) + `<g transform="translate(${r(x0)} 71) scale(${s})">${wm.body}</g>` }; }
const lockupSvg = (id = 'lk', wm) => { const l = lockup(id, wm); return svg(`${l.vbx} ${l.vby} ${r(l.w)} ${l.h}`, l.body, `width="${r(l.w)}" height="${l.h}"`); };

// ---- icon: ink triangle on the pink to orchid tile (chalk on a pink/orchid tile fails contrast; ink is 5.2-6.3:1) ----
const tileGrad = (id, sz) => `<linearGradient id="${id}" x1="0" y1="${sz}" x2="${sz}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.pink}"/><stop offset="1" stop-color="${P.orchid}"/></linearGradient>`;
const iconGlyph = (id, o = {}) => `${o.glow ? `<defs>${rad(id, 0.16, 56, 50, 56, '#FFFFFF')}</defs><circle cx="56" cy="50" r="56" fill="url(#${id}r)"/>` : ''}${tri(P['ink-on-brand'], 0.2, -9, 6)}${tri(P['ink-on-brand'])}`;
const icon = () => svg('0 0 512 512', `<defs>${tileGrad('ti', 512)}</defs><rect width="512" height="512" fill="url(#ti)"/><g transform="translate(262 258) scale(4.5) translate(-56 -50)">${iconGlyph('tg', { glow: true })}</g>`, 'width="1024" height="1024"');
const iconFg = () => svg('0 0 108 108', `<g transform="translate(55 54) scale(0.5) translate(-56 -50)">${iconGlyph('fg')}</g>`, 'width="108" height="108"');
const iconBg = () => svg('0 0 108 108', `<defs>${tileGrad('bg', 108)}</defs><rect width="108" height="108" fill="url(#bg)"/>`, 'width="108" height="108"');
// ---- small mark (<= 32 px): plain gradient triangle, nothing that can smudge ----
const markSmall = () => svg('30 14 68 72', `<defs>${lin('sm')}</defs>${tri('url(#smg)')}`, 'width="68" height="72"');
const mark = () => svg(MARK_VB, markBody('mk'), 'width="124" height="116"');
// ---- banner 320x180: canvas + two vector radial glows (no filters) + lockup ----
const banner = () => { const l = lockup('bn'), s = 0.5, bw = l.w * s; const rg = (id, cx, cy, rr, col, o) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${rr}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${col}" stop-opacity="${o}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
  return svg('0 0 320 180', `<defs>${rg('bn1', 40, 20, 190, P.violet, 0.9)}${rg('bn2', 290, 175, 200, P.orchid, 0.55)}${rg('bn3', 130, 200, 140, P.pink, 0.45)}</defs><rect width="320" height="180" fill="${P['bg-0']}"/><rect width="320" height="180" fill="url(#bn1)"/><rect width="320" height="180" fill="url(#bn2)"/><rect width="320" height="180" fill="url(#bn3)"/><svg x="${r((320 - bw) / 2)}" y="${r(90 - 58 * s - 4)}" width="${r(bw)}" height="${r(l.h * s)}" viewBox="${l.vbx} ${l.vby} ${r(l.w)} ${l.h}">${l.body}</svg>`, 'width="320" height="180"'); };
module.exports = { P, mark, markSmall, lockupSvg, wordmark, baseline, icon, iconFg, iconBg, banner, markBody, MARK_VB, svg, r };
