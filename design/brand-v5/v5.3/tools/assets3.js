// v5.3 final assets. Mark = the v5 Soft echo mark, refined: crisp solid bands, no blur, no glow, no filters, no sprites.
const fs = require('fs'), path = require('path'); const M3 = require('./mark3.js'), P = require('./palette.js'), L3 = require('./lockup3.js'), I3 = require('./icon3.js');
const r = n => +n.toFixed(2); const { FINAL, SMALL } = L3; const dir = path.join(__dirname, '..', 'assets');
const GAP = 26;                                                   // lockup A, tightened from 30 to 26
const W = (s, vb, w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">${s}</svg>`;
// ---- mark (on canvas / dark) and small mark (<= 40 px: two bands, wider steps) ----
const mark = () => M3.svgMark('mk', FINAL, 6);
const markSmall = () => M3.svgMark('ms', SMALL, 5);
const lockup = () => L3.lockupSvg('lk', 'A', { lk: { gap: GAP } });
// ---- icon: deepened tile (violet to orchid to deep pink) + chalk wedge + solid chalk-tint bands ----
const S_ICON = 3.5, BANDS = [.3, .5, .7]; I3.V.I2.band = BANDS;
const icon = () => I3.iconSvg('I2', 512, S_ICON);
const iconSmall = () => { I3.V.I2.band = [.5, .72]; const s = I3.iconSvg('I2', 512, 4.3, SMALL).replace('width="1024" height="1024"', 'width="256" height="256"'); I3.V.I2.band = BANDS; return s; };
const FG_S = 0.66;                                                 // 108 canvas, whole mark inside the 66 dp safe circle (checked on the board)
const iconFg = () => { const p = I3.iconParts('I2', 108, FG_S); return W(`<defs>${p.defs}</defs>${p.fg}`, '0 0 108 108', 108, 108); };
const iconBg = () => { const p = I3.iconParts('I2', 108, FG_S); return W(`<defs>${p.tileDef}</defs><rect width="108" height="108" fill="url(#tile)"/>`, '0 0 108 108', 108, 108); };
// ---- banners 320x180 ----
const banner = () => { const l = L3.lockup('bn', 'A', { lk: { gap: GAP } }); const w = 236, sc = w / l.vb[2], h = l.vb[3] * sc;
  return W(`<rect width="320" height="180" fill="${P['bg-0']}"/><svg x="${r((320 - w) / 2)}" y="${r((180 - h) / 2)}" width="${r(w)}" height="${r(h)}" viewBox="${l.vb.map(r).join(' ')}">${l.body}</svg>`, '0 0 320 180', 320, 180); };
// gradient alternative: pink to orchid field, ink wordmark, ink wedge with ink-tint solid bands
const bannerGradient = () => { const stops = I3.TILES.warm, field = (x, y) => { const vx = 320, vy = -120, t = Math.max(0, Math.min(1, ((x) * vx + (y - 150) * vy) / (vx * vx + vy * vy))); return I3.mixRgb(I3.hx(stops[0][1]), I3.hx(stops[1][1]), t); };
  const w = 236, l0 = L3.lockup('x', 'A', { lk: { gap: GAP } }), sc = w / l0.vb[2], ox = (320 - w) / 2, oy = (180 - l0.vb[3] * sc) / 2;
  const cols = [0, 1, 2].map(i => { const px = ox + (6 + i * 14 * 1.4) * sc, py = 90; return I3.toHex(I3.mixRgb(field(px, py), I3.hx(P['ink-on-brand']), [.18, .34, .52][i])); });
  const l = L3.lockup('bg', 'A', { lk: { gap: GAP }, ink: P['ink-on-brand'], mark: { frontFill: P['ink-on-brand'], bandFills: cols } });
  return W(`<defs><linearGradient id="bgf" x1="0" y1="150" x2="320" y2="30" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${stops[0][1]}"/><stop offset="1" stop-color="${stops[1][1]}"/></linearGradient></defs><rect width="320" height="180" fill="url(#bgf)"/><svg x="${r(ox)}" y="${r(oy)}" width="${r(w)}" height="${r(l.vb[3] * sc)}" viewBox="${l.vb.map(r).join(' ')}">${l.body}</svg>`, '0 0 320 180', 320, 180); };
function writeAll() { fs.mkdirSync(dir, { recursive: true });
  const f = { 'mark.svg': mark(), 'mark-small.svg': markSmall(), 'lockup.svg': lockup(), 'icon-1024.svg': icon(), 'icon-small.svg': iconSmall(), 'icon-foreground.svg': iconFg(), 'icon-background.svg': iconBg(), 'banner.svg': banner(), 'banner-gradient.svg': bannerGradient() };
  for (const [k, v] of Object.entries(f)) fs.writeFileSync(path.join(dir, k), v); console.log('assets written', Object.keys(f).length); }
module.exports = { mark, markSmall, lockup, icon, iconSmall, iconFg, iconBg, banner, bannerGradient, writeAll };
if (require.main === module) writeAll();
