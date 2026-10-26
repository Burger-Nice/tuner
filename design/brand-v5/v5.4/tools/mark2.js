// v5.2 mark geometry: rounded polygons with per-corner radii (no strokes needed), variants for the mark decision.
const P = require('./palette.js'); const r = n => +n.toFixed(2);
function rp(pts, rad) { let d = ''; const n = pts.length; for (let i = 0; i < n; i++) { const p0 = pts[(i + n - 1) % n], p = pts[i], p1 = pts[(i + 1) % n]; const u1 = [p0[0] - p[0], p0[1] - p[1]], u2 = [p1[0] - p[0], p1[1] - p[1]]; const l1 = Math.hypot(...u1), l2 = Math.hypot(...u2); u1[0] /= l1; u1[1] /= l1; u2[0] /= l2; u2[1] /= l2;
  const th = Math.acos(u1[0] * u2[0] + u1[1] * u2[1]), dd = rad[i] / Math.tan(th / 2); const a = [p[0] + u1[0] * dd, p[1] + u1[1] * dd], b = [p[0] + u2[0] * dd, p[1] + u2[1] * dd];
  d += `${i ? 'L' : 'M'}${r(a[0])} ${r(a[1])}A${rad[i]} ${rad[i]} 0 0 1 ${r(b[0])} ${r(b[1])}`; } return d + 'Z'; }
// triangle: base x = bx, vertical extent y0..y1, VISUAL length vis (base to rounded apex), apex radius ra, base radius rb
function tri(bx, y0, y1, vis, ra, rb) { const hh = (y1 - y0) / 2, cy = (y0 + y1) / 2; let L = vis; for (let i = 0; i < 40; i++) { const al = Math.atan(hh / L); L = vis + (ra / Math.sin(al) - ra); } return rp([[bx, y0], [bx + L, cy], [bx, y1]], [rb, ra, rb]); }
const STOCK = tri(33, 17, 83, 60, 5, 5);            // v5.1 equivalent (stroked 10 px triangle)
const OWN = tri(33, 17, 83, 65, 14, 6);
const OWN2 = tri(33, 17, 83, 69, 11, 6);          // tuned: longer, apex r11             // 8% longer, apex r14, base r6
const lin = id => `<linearGradient id="${id}g" x1="10" y1="80" x2="96" y2="20" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.pink}"/><stop offset="1" stop-color="${P.orchid}"/></linearGradient>`;
const glow = (id, cx = 60, o = 0.5) => `<radialGradient id="${id}r" cx="${cx}" cy="50" r="58" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.orchid}" stop-opacity="${o}"/><stop offset=".55" stop-color="${P.orchid}" stop-opacity="${r(o * .38)}"/><stop offset="1" stop-color="${P.orchid}" stop-opacity="0"/></radialGradient>`;
const core = (id, cx = 52, rr = 40) => `<radialGradient id="${id}c" cx="${cx}" cy="50" r="${rr}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFD3EA"/><stop offset=".45" stop-color="${P.pink}"/><stop offset="1" stop-color="${P.orchid}"/></radialGradient>`;
const g = (d, fill, o = 1, tx = 0, ty = 0, extra = '') => `<g transform="translate(${tx} ${ty})"><path d="${d}" fill="${fill}" ${extra} opacity="${o}"/></g>`;
const VB = '-6 -8 130 116';
const wrap = (id, defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}"><defs>${defs}</defs>${body}</svg>`;
const disc = id => `<circle cx="60" cy="50" r="58" fill="url(#${id}r)"/>`;
// variants
const V = {
  P1: ['v5.1 stock triangle + stock echo (-9,+6) 28% (baseline)', id => wrap(id, lin(id) + glow(id), disc(id) + g(STOCK, P.orchid, .28, -9, 6) + g(STOCK, `url(#${id}g)`))],
  P2: ['stock triangle, echo offset (-15,+10) at 40% (reviewer a)', id => wrap(id, lin(id) + glow(id), disc(id) + g(STOCK, P.orchid, .4, -15, 10) + g(STOCK, `url(#${id}g)`))],
  P3: ['own proportion, no echo: 8% longer, apex r14, base r6 (reviewer b)', id => wrap(id, lin(id) + glow(id), disc(id) + g(OWN, `url(#${id}g)`))],
  P4: ['own proportion + lit core (radial highlight inside the shape), no echo', id => wrap(id, core(id) + glow(id, 60, .55), disc(id) + g(OWN, `url(#${id}c)`))],
  P5: ['own proportion + OUTLINED ghost (stroke 5, offset -14,+9): line, not shadow', id => wrap(id, lin(id) + glow(id), disc(id) + g(OWN, 'none', .75, -14, 9, `stroke="${P.orchid}" stroke-width="5" stroke-linejoin="round"`) + g(OWN, `url(#${id}g)`))],
  P6: ['plain stock triangle, no echo, glow disc only (reviewer c)', id => wrap(id, lin(id) + glow(id), disc(id) + g(STOCK, `url(#${id}g)`))],
  P8: ['tuned shape (69 long, apex r11, base r6) + lit core at the base (cx 46), no echo', id => wrap(id, core(id, 46, 46) + glow(id, 60, .55), disc(id) + g(OWN2, `url(#${id}c)`))],
  P9: ['tuned shape + lit core (cx 52, r40), no echo', id => wrap(id, core(id, 52, 40) + glow(id, 60, .55), disc(id) + g(OWN2, `url(#${id}c)`))],
  P7: ['own proportion + lit core + outlined ghost', id => wrap(id, core(id) + glow(id, 60, .55), disc(id) + g(OWN, 'none', .75, -14, 9, `stroke="${P.orchid}" stroke-width="5" stroke-linejoin="round"`) + g(OWN, `url(#${id}c)`))],
};
module.exports = { rp, tri, STOCK, OWN, OWN2, lin, glow, core, g, V, VB, wrap, disc };
