// Tuner colour palette v2.2: OKLCH is the source of truth, hex is derived. node checks/palette.js prints the table + contrast.
const c = require('./color.js');
const H = 262;   // neutral hue: complement of the accent (82 + 180), midnight blue of the Grizzlies navy (h264-273)
const N = (L, C) => c.neutral(L, H, C, 0.0015);          // on-hue 8-bit colour (hue stays 261.6-261.8 on every step)
const out = {
  // surfaces: even OKLCH lightness steps of .042, constant chroma .013
  // (the five on-hue 8-bit grid points nearest the targets .198/.240/.282/.324/.366; hand-picked from color.neutral candidates so steps stay .040-.044)
  'bg-0': '#12161D', 'bg-1': '#1C2027', 'surface-1': '#262A31', 'surface-2': '#30343B', 'surface-3': '#3B3F46',
  'line': N(.340, .013), 'line-strong': N(.430, .013), 'outline': N(.605, .013),
  'text-4': N(.540, .012), 'text-3': N(.756, .012), 'text-2': N(.850, .010), 'text-1': c.neutral(.965, H, .005, 0.003, 0.002, 0.009),
  // brand: dial amber-gold
  'accent': c.fit(.826, .162, 82), 'accent-hover': c.fit(.864, .145, 85), 'accent-press': c.fit(.746, .150, 78),
  'on-accent': c.fit(.199, .025, 71),
  // status: live (on-air tally), danger (conventional red, v2.2), warning, success
  'live': c.fit(.660, .198, 25), 'live-text': c.fit(.785, .125, 25),
  'danger': c.fit(.635, .195, 20), 'danger-text': c.fit(.790, .125, 20),
  'success': c.fit(.776, .151, 160), 'warning': c.fit(.760, .150, 56),
};
out.focus = '#FFFFFF';
module.exports = out;
if (require.main === module) {
  for (const [k, v] of Object.entries(out)) { const [L, C, h] = c.hex2oklch(v); console.log(k.padEnd(13), v, L.toFixed(3), C.toFixed(3), h.toFixed(1).padStart(5), c.hex2rgb(v).map(x => Math.round(x * 255)).join(',')); }
  const ks = ['bg-0', 'bg-1', 'surface-1', 'surface-2', 'surface-3'];
  console.log('steps', ks.slice(1).map((k, i) => (c.hex2oklch(out[k])[0] - c.hex2oklch(out[ks[i]])[0]).toFixed(3)).join(' '));
  for (const f of ['danger', 'danger-text', 'live', 'live-text', 'warning', 'text-3']) console.log(f.padEnd(12), ks.map(b => c.ratio(out[f], out[b]).toFixed(2)).join(' '));
}
