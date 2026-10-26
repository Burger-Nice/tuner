// v5.3 mark: the v5 Soft echo mark, refined. Hard-edged geometry, solid colour steps, no blur, no glow, no filters.
// Front wedge + n stepped bands behind it (left of it). Units: front base edge at x=0, vertically centred on y=0.
const c = require('./color.js'), P = require('./palette.js'); const M2 = require('./mark2.js');
const r2 = n => +n.toFixed(2);
function rp(pts, rad) { return M2.rp(pts, rad); }
// colour steps back to front, interpolated in OKLCH (short hue arc)
const lch = h => c.hex2oklch(h);
function mixLch(a, b, t) { const A = lch(a), B = lch(b); let dh = B[2] - A[2]; if (dh > 180) dh -= 360; if (dh < -180) dh += 360; return c.fit(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, (A[2] + dh * t + 360) % 360); }
function steps(n, from, to) { return Array.from({ length: n }, (_, i) => mixLch(from, to, n === 1 ? 0.5 : i / (n - 1))); }
const DEF = { L: 62, H: 70, rb: 6, ra: 8, n: 3, step: 11, dh: 0.09, gap: 2, rr: 4, from: '#6A33E6', to: '#C23DF2', grad: 'diag', bandFills: null, frontFill: null, pink: P.pink, orchid: P.orchid };
function build(id, o = {}) {
  o = { ...DEF, ...o }; const { L, H, n, step, dh, gap } = o; const slope = H / (2 * L);
  const front = M2.tri(0, -H / 2, H / 2, L, o.ra, o.rb);
  const cols = o.bandFills || steps(n, o.from, o.to);
  let bands = '';
  for (let i = 0; i < n; i++) {                       // i = 0 back ... n-1 nearest the front
    const k = n - i;                                  // layers behind the front
    const x = -k * step, Hi = H * (1 - k * dh), w = (gap > 0 ? step - gap : step + 6);
    const hr = Hi / 2 - w * slope;
    const d = rp([[x, -Hi / 2], [x + w, -hr], [x + w, hr], [x, Hi / 2]], [o.rr, gap > 0 ? o.rr * 0.8 : 1, gap > 0 ? o.rr * 0.8 : 1, o.rr]);
    bands += `<path d="${d}" fill="${cols[i]}"/>`;
  }
  const gx = o.grad === 'horiz' ? [0, 0, L, 0] : o.grad === 'vert' ? [0, -H / 2, 0, H / 2] : [0, -H / 2, L, H / 2];
  const defs = `<linearGradient id="${id}g" x1="${gx[0]}" y1="${gx[1]}" x2="${gx[2]}" y2="${gx[3]}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${o.pink}"/><stop offset="1" stop-color="${o.orchid}"/></linearGradient>`;
  const frontP = `<path d="${front}" fill="${o.frontFill || `url(#${id}g)`}"/>`;
  const x0 = -n * step, x1 = L;
  // optical centre: horizontal centroid of the union (front mass dominates), vertical 0
  const area = (Hh, W) => Hh * W / 2; let A = area(H, L), mx = L / 3; let tot = A, sx = A * mx;  // front: triangle centroid at 1/3 of its length from the base
  for (let i = 0; i < n; i++) { const k = n - i, Hi = H * (1 - k * dh), x = -k * step, w = step; const a = Hi * w * 0.9; tot += a; sx += a * (x + w / 2); }
  return { defs, body: bands + frontP, x0, x1, H, mass: sx / tot, cols };
}
// standalone svg, padded; centred on bbox centre (bbox centre, not mass)
function svgMark(id, o = {}, pad = 6, extraDefs = '', bgBody = '') { const m = build(id, o); const w = m.x1 - m.x0 + pad * 2, h = m.H + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r2(m.x0 - pad)} ${r2(-h / 2)} ${r2(w)} ${r2(h)}" width="${r2(w)}" height="${r2(h)}"><defs>${m.defs}${extraDefs}</defs>${bgBody}${m.body}</svg>`; }
module.exports = { build, svgMark, steps, mixLch, DEF };
