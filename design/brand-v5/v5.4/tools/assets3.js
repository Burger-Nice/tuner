// v5.3 final assets. Mark = the v5 Soft echo mark, refined: crisp solid bands, no blur, no glow, no filters, no sprites.
const fs = require('fs'), path = require('path'); const M3 = require('./mark3.js'), P = require('./palette.js'), L3 = require('./lockup3.js'), I3 = require('./icon3.js');
const r = n => +n.toFixed(2); const { FINAL, SMALL } = L3; const dir = path.join(__dirname, '..', 'assets');
const GAP = 26;                                                   // lockup A, tightened from 30 to 26
const W = (s, vb, w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">${s}</svg>`;
// ---- mark (on canvas / dark) and small mark (<= 40 px: two bands, wider steps) ----
const mark = () => M3.svgMark('mk', FINAL, 6);
const markSmall = () => M3.svgMark('ms', SMALL, 5);
const lockup = () => L3.lockupSvg('lk', 'A', { lk: { gap: GAP } });                                   // 40 px and up, on bg-0: gradient glow, wedge i-dot
const lockupCompact = () => L3.lockupSvg('lc', 'A', { lk: { gap: GAP }, word: { dot: false } });         // under 40 px: round i-dot
const CH = P['text-1'], chalkBands = [.3, .5, .7].map(a => `${CH}" fill-opacity="${a}`);
const lockupChalk = () => L3.lockupSvg('ch', 'A', { lk: { gap: GAP }, mark: { frontFill: CH, bandFills: chalkBands }, word: { split: false, dot: true, dotFill: CH } });        // any surface except bg-0, 40 px and up
const lockupChalkCompact = () => L3.lockupSvg('cc', 'A', { lk: { gap: GAP }, mark: { frontFill: CH, bandFills: chalkBands }, word: { split: false, dot: false } });   // any surface, under 40 px
// ---- icon: deepened tile (violet to orchid to deep pink) + chalk wedge + solid chalk-tint bands ----
const S_ICON = 3.5, BANDS = [.3, .5, .7]; I3.V.F1.band = BANDS;
const icon = () => I3.iconSvg('F1', 512, S_ICON);
const iconSmall = () => { I3.V.F1.band = [.5, .72]; const s = I3.iconSvg('F1', 512, 4.3, SMALL).replace('width="1024" height="1024"', 'width="256" height="256"'); I3.V.F1.band = BANDS; return s; };
// adaptive foreground: largest scale whose conservative outline (apex and the back band corners) stays inside radius 32 dp of the centre (safe radius is 33)
const fgRadius = (sc) => { const p = I3.iconParts('F1', 108, sc), m = FINAL, n = m.n || 3, pts = [[p.tx + m.L * sc, p.ty]]; const Hb = m.H * (1 - n * m.dh) / 2; pts.push([p.tx - n * m.step * sc, p.ty - Hb * sc], [p.tx - n * m.step * sc, p.ty + Hb * sc], [p.tx, p.ty - m.H / 2 * sc], [p.tx, p.ty + m.H / 2 * sc]); return Math.max(...pts.map(q => Math.hypot(q[0] - 54, q[1] - 54))); };
let FG_S = 0.66; while (fgRadius(FG_S) > 32) FG_S = +(FG_S - 0.005).toFixed(3);
const iconFg = () => { const p = I3.iconParts('F1', 108, FG_S); return W(`<defs>${p.defs}</defs>${p.fg}`, '0 0 108 108', 108, 108); };
const iconBg = () => { const p = I3.iconParts('F1', 108, FG_S); return W(`<defs>${p.tileDef}</defs><rect width="108" height="108" fill="url(#tile)"/>`, '0 0 108 108', 108, 108); };
// mark-micro: plain gradient wedge for under 24 px (no bands)
const markMicro = () => { const M2 = require('./mark2.js'); const d = M2.tri(0, -35, 35, FINAL.L, FINAL.ra, FINAL.rb); return W(`<defs><linearGradient id="mi" x1="0" y1="-35" x2="${FINAL.L}" y2="35" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${P.pink}"/><stop offset="1" stop-color="${P.orchid}"/></linearGradient></defs><path d="${d}" fill="url(#mi)"/>`, `-3 -38 ${FINAL.L + 6} 76`, FINAL.L + 6, 76); };
// ---- banners 320x180: the primary is the icon's sibling (same ramp, chalk wedge + chalk-tint solid bands, chalk wordmark); the dark one is the alternative ----
const banner = () => { const stops = I3.TILES.banner, vx = 320, vy = -180, field = (x, y) => { const t = Math.max(0, Math.min(1, (x * vx + (y - 180) * vy) / (vx * vx + vy * vy))); const seg = (a, b, u) => I3.mixRgb(I3.hx(a), I3.hx(b), u); for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return seg(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0])); return I3.hx(stops[stops.length - 1][1]); };
  const w = 244, chalk = P['text-1'], l0 = L3.lockup('x', 'A', { lk: { gap: GAP } }), sc = w / l0.vb[2], ox = (320 - w) / 2, oy = (180 - l0.vb[3] * sc) / 2;
  const cols = [0, 1, 2].map(i => I3.toHex(I3.mixRgb(field(ox + (8 + i * 14) * sc, 90), I3.hx(chalk), [.3, .5, .7][i])));
  const l = L3.lockup('bg', 'A', { lk: { gap: GAP }, mark: { frontFill: chalk, bandFills: cols }, word: { split: false, dot: false } });
  return W(`<defs><linearGradient id="bgf" x1="0" y1="180" x2="320" y2="0" gradientUnits="userSpaceOnUse">${stops.map(([t, h]) => `<stop offset="${t}" stop-color="${h}"/>`).join('')}</linearGradient></defs><rect width="320" height="180" fill="url(#bgf)"/><svg x="${r(ox)}" y="${r(oy)}" width="${r(w)}" height="${r(l.vb[3] * sc)}" viewBox="${l.vb.map(r).join(' ')}">${l.body}</svg>`, '0 0 320 180', 320, 180); };
const bannerDark = () => { const l = L3.lockup('bn', 'A', { lk: { gap: GAP }, word: { dot: false } }); const w = 236, sc = w / l.vb[2], h = l.vb[3] * sc;
  return W(`<rect width="320" height="180" fill="${P['bg-0']}"/><svg x="${r((320 - w) / 2)}" y="${r((180 - h) / 2)}" width="${r(w)}" height="${r(h)}" viewBox="${l.vb.map(r).join(' ')}">${l.body}</svg>`, '0 0 320 180', 320, 180); };
function writeAll() { fs.mkdirSync(dir, { recursive: true });
  const f = { 'mark.svg': mark(), 'mark-small.svg': markSmall(), 'lockup.svg': lockup(), 'lockup-compact.svg': lockupCompact(), 'lockup-chalk.svg': lockupChalk(), 'lockup-chalk-compact.svg': lockupChalkCompact(), 'icon-1024.svg': icon(), 'icon-small.svg': iconSmall(), 'icon-foreground.svg': iconFg(), 'icon-background.svg': iconBg(), 'banner.svg': banner(), 'banner-dark.svg': bannerDark(), 'mark-micro.svg': markMicro() };
  for (const [k, v] of Object.entries(f)) fs.writeFileSync(path.join(dir, k), v); console.log('assets written', Object.keys(f).length); }
module.exports = { lockupCompact, lockupChalk, mark, markSmall, markMicro, lockup, icon, iconSmall, iconFg, iconBg, banner, bannerDark, writeAll, get FG_S() { return FG_S; } };
if (require.main === module) writeAll();
