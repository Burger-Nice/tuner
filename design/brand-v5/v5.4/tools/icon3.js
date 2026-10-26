// v5.3 icon builders. Tile gradient + wedge + SOLID band colours (computed from the tile colour under each band; no transparency, no glow).
const c = require('./color.js'), P = require('./palette.js'), M3 = require('./mark3.js'), { FINAL } = require('./lockup3.js'); const r = n => +n.toFixed(2);
const hx = h => c.hex2rgb(h).map(v => v * 255);
const toHex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mixRgb = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
// tile gradient: from bottom-left (t=0) to top-right (t=1) of the 512 tile, stops [[t,hex],...]
function tileAt(stops, x, y, S, H) { const t = Math.max(0, Math.min(1, ((x / S) + (1 - y / (H || S))) / 2)); for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { const [t0, h0] = stops[i - 1], [t1, h1] = stops[i]; return mixRgb(hx(h0), hx(h1), (t - t0) / (t1 - t0)); } return hx(stops[stops.length - 1][1]); }
const TILES = {
  owner: [[0, '#5B2BD9'], [.5, '#E04BFF'], [1, '#FF5CB8']],            // the v5 tile (pink to violet)
  deep: [[0, '#4F24C4'], [.55, '#B83BEA'], [1, '#E2449E']],             // chalk-safe: no light pink anywhere near the wedge
  warm: [[0, '#F95BAC'], [1, '#D540F5']],
  banner: [[0, '#4F24C4'], [.55, '#A030CC'], [1, '#C03C8C']],         // v5.4 final: the banner ramp, right end deepened so chalk is 4.5:1 or better behind the lockup
  family: [[0, '#4F24C4'], [.55, '#B83BEA'], [1, '#E2449E']],        // the owner's pink-to-violet tile (v5.3 ramp, kept by owner decision); icon and banner share it
};
const V = {
  I1: { name: 'owner tile (pink to violet), chalk wedge, chalk-tint bands', tile: 'owner', wedge: '#F3EFE6', band: [.26, .46, .66], bandMix: '#F3EFE6' },
  I2: { name: 'deepened tile (violet to orchid to deep pink), chalk wedge, chalk-tint bands', tile: 'deep', wedge: '#F3EFE6', band: [.22, .42, .62], bandMix: '#F3EFE6' },
  I3: { name: 'v5.2 tile (pink to orchid), ink wedge, ink-tint bands', tile: 'warm', wedge: P['ink-on-brand'], band: [.16, .32, .5], bandMix: P['ink-on-brand'] },
  I4: { name: 'v5.2 tile, ink wedge, bands in the mark colours (violet to orchid)', tile: 'warm', wedge: P['ink-on-brand'], bandCols: ['#5B2BD9', '#7B34E0', '#9B3AE8'] },
};
// geometry: mark scale s, centred optically on the tile (mass between bbox centre and centroid)
function place(S, s, o = {}) { const m = M3.build('x', { ...FINAL, ...o }); const bbox = (m.x0 + m.x1) / 2, mass = m.mass; const cx = bbox * 0.5 + mass * 0.5; return { m, tx: S / 2 - cx * s, ty: S / 2, s }; }
function iconParts(variant, S = 512, s = 3.2, o = {}) { const v = V[variant], stops = TILES[v.tile], { m, tx, ty } = place(S, s, o); const mk = { ...FINAL, ...o };
  const n = mk.n || 3, cols = []; for (let i = 0; i < n; i++) { const k = n - i, bx = -k * mk.step + mk.step / 2, by = 0; const px = tx + bx * s, py = ty + by * s; const tile = tileAt(stops, px, py, S);
    cols.push(v.bandCols ? v.bandCols[i] : toHex(mixRgb(tile, hx(v.bandMix), (v.band.slice(-n))[i]))); }
  const mm = M3.build('ic', { ...mk, bandFills: cols, frontFill: v.wedge });
  const tileDef = `<linearGradient id="tile" x1="0" y1="${S}" x2="${S}" y2="0" gradientUnits="userSpaceOnUse">${stops.map(([t, h]) => `<stop offset="${t}" stop-color="${h}"/>`).join('')}</linearGradient>`;
  const fg = `<g transform="translate(${r(tx)} ${r(ty)}) scale(${s})">${mm.body}</g>`;
  return { tileDef, fg, S, defs: mm.defs, cols, tx, ty, s, stops, m }; }
const iconSvg = (variant, S = 512, s = 3.2, o = {}) => { const p = iconParts(variant, S, s, o); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S * 2}" height="${S * 2}"><defs>${p.tileDef}${p.defs}</defs><rect width="${S}" height="${S}" fill="url(#tile)"/>${p.fg}</svg>`; };
// min contrast of the wedge against the tile in a ring around the wedge (wedge edge to 10 px out), 512 tile space
function ringContrast(variant, S = 512, s = 3.2) { const p = iconParts(variant, S, s), v = V[variant], L = FINAL.L, H = FINAL.H; const A = [p.tx, p.ty - H / 2 * s], B = [p.tx + L * s, p.ty], C = [p.tx, p.ty + H / 2 * s];
  const inside = (x, y) => { const d = (P1, P2) => (x - P2[0]) * (P1[1] - P2[1]) - (P1[0] - P2[0]) * (y - P2[1]); const d1 = d([x, y], A) , s1 = ((B[0]-A[0])*(y-A[1])-(B[1]-A[1])*(x-A[0])), s2 = ((C[0]-B[0])*(y-B[1])-(C[1]-B[1])*(x-B[0])), s3 = ((A[0]-C[0])*(y-C[1])-(A[1]-C[1])*(x-C[0])); return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0); };
  const dist = (x, y) => { const seg = (P, Q) => { const t = Math.max(0, Math.min(1, ((x - P[0]) * (Q[0] - P[0]) + (y - P[1]) * (Q[1] - P[1])) / ((Q[0] - P[0]) ** 2 + (Q[1] - P[1]) ** 2))); return Math.hypot(x - (P[0] + t * (Q[0] - P[0])), y - (P[1] + t * (Q[1] - P[1]))); }; return Math.min(seg(A, B), seg(B, C), seg(C, A)); };
  const lum = a => { const l = a.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * l[0] + .7152 * l[1] + .0722 * l[2]; };
  const wl = lum(hx(v.wedge)); let min = 99; for (let x = A[0] - 12; x < B[0] + 12; x += 4) for (let y = A[1] - 12; y < C[1] + 12; y += 4) { if (inside(x, y)) continue; if (dist(x, y) > 14) continue; if (x < A[0]) continue; const tl = lum(tileAt(p.stops, x, y, S)); const R = (Math.max(wl, tl) + .05) / (Math.min(wl, tl) + .05); if (R < min) min = R; } return min; }
V.F1 = { name: 'v5.4 family tile (plum to magenta to pink), chalk wedge, chalk-tint solid bands', tile: 'family', wedge: '#F3EFE6', band: [.3, .5, .7], bandMix: '#F3EFE6' };
module.exports = { iconParts, iconSvg, ringContrast, V, TILES, tileAt, hx, toHex, mixRgb, place };
