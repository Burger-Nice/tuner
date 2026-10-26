// airglow v5.1 palette: OKLCH-derived, every pair checked in tools/contrast.js. node tools/palette.js prints the table.
const c = require('./color.js');
const maxC = (L, h) => { let lo = 0, hi = 0.4; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; c.inGamut(c.oklch2lin(L, m, h)) ? lo = m : hi = m; } return lo; };
const H = 295;                                    // ink hue (violet-black), chroma ~ .022-.03
const N = (L, C = 0.02) => c.neutral(L, H, C, 0.004, 0.012, 0.03);
const P = {
  // surfaces: canvas lifted so no channel is below 18/255; ~.045 lightness steps so cards actually separate (v5: 1.04-1.5:1)
  'bg-0': N(.180, .018), 'bg-1': N(.232, .02), 'surface-1': N(.295), 'surface-2': N(.358), 'surface-3': N(.425),
  'border': '#3C3452',                              // 1 px outline on cards and tiles (decorative, ~1.5:1)
  'border-strong': c.neutral(.65, H, .04, .004, .025, .06),
  // text
  'text-1': '#F3EFE6', 'text-2': c.neutral(.86, H, .028, .004, .018, .04), 'text-3': c.neutral(.83, H, .03, .004, .02, .045), 'text-4': c.neutral(.55, H, .03, .004, .02, .045),
  // brand: chroma pulled ~8% from the gamut edge (v5: orchid #E04BFF)
  'pink': c.fit(.70, 0.92 * maxC(.70, 352), 352), 'orchid': c.fit(.66, 0.9 * maxC(.66, 320), 320),
  'violet': '#5B2BD9',                              // gradient anchor under LARGE fills only: 2.6:1 on ink, never a line or text
  'violet-ui': c.fit(.68, 0.19, 292),
  'pink-text': c.fit(.85, 0.10, 352), 'orchid-text': c.fit(.83, 0.11, 322),   // brand colours as TEXT (>= 4.5:1 on every surface)                // violet allowed as a UI stroke / progress end (>= 4.5:1 on ink)
  // status
  'live': '#FF4B4B', 'live-text': '#FF8F8F', 'ok': '#47D394',
  'ink-on-brand': '#14101F',                        // text / glyph on pink-orchid fills
  'focus': '#FFFFFF',
};
module.exports = P; module.exports.maxC = maxC;
if (require.main === module) { for (const [k, v] of Object.entries(P)) { if (typeof v !== 'string') continue; const [L, C, h] = c.hex2oklch(v); console.log(k.padEnd(14), v, L.toFixed(3), C.toFixed(3), h.toFixed(0).padStart(3), c.hex2rgb(v).map(x => Math.round(x * 255)).join(',')); }
  console.log('orchid chroma / max', (c.hex2oklch(P.orchid)[1] / maxC(c.hex2oklch(P.orchid)[0], c.hex2oklch(P.orchid)[2])).toFixed(2), 'pink', (c.hex2oklch(P.pink)[1] / maxC(c.hex2oklch(P.pink)[0], c.hex2oklch(P.pink)[2])).toFixed(2)); }
