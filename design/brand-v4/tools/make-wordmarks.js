// Outlines the four wordmarks (per glyph, cap height normalised to 100) into tools/wordmarks.json. One-off: needs opentype.js and the @fontsource woff files.
// usage: NODE_PATH=<dir with node_modules> node tools/make-wordmarks.js <fontsource-dir>
const opentype = require('opentype.js'), fs = require('fs'), path = require('path');
const FS = process.argv[2];
const spec = {
  airglow: { text: 'airglow', font: 'outfit/files/outfit-latin-700-normal.woff', track: 0.0 },
  flare:   { text: 'FLARE',   font: 'barlow-condensed/files/barlow-condensed-latin-800-italic.woff', track: 0.035 },
  skylit:  { text: 'SKYLIT',  font: 'playfair-display/files/playfair-display-latin-900-normal.woff', track: 0.07 },
  // alternates shown on the board in the same face as the direction they sit under
  airtime: { text: 'airtime', font: 'outfit/files/outfit-latin-700-normal.woff', track: 0.0 },
  tipoff:  { text: 'TIPOFF',  font: 'barlow-condensed/files/barlow-condensed-latin-800-italic.woff', track: 0.03 },
  primetime:{ text: 'PRIMETIME', font: 'playfair-display/files/playfair-display-latin-900-normal.woff', track: 0.05 },
};
const f2 = n => (+n.toFixed(2)).toString();
const pathD = p => p.commands.map(c => c.type === 'Z' ? 'Z' : c.type + [c.x1, c.y1, c.x2, c.y2, c.x, c.y].filter(v => v !== undefined).map(f2).join(' ')).join('');
const out = {};
for (const [k, s] of Object.entries(spec)) {
  const b = fs.readFileSync(path.join(FS, s.font)); const font = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const H = font.charToGlyph('H').getBoundingBox(), cap = H.y2, size = 100, sc = size / font.unitsPerEm, k100 = 100 / (cap * sc);
  const glyphs = [...s.text].map(c => font.charToGlyph(c)); let x = 0; const gl = [];
  glyphs.forEach((g, i) => {
    const p = g.getPath(x, 0, size * k100); // baseline at y=0, cap top at -100
    const bb0 = p.getBoundingBox(); gl.push({ ch: s.text[i], d: pathD(p), x, x1: +bb0.x1.toFixed(2), x2: +bb0.x2.toFixed(2) });
    x += g.advanceWidth * sc * k100 + s.track * 100 + (glyphs[i + 1] ? font.getKerningValue(g, glyphs[i + 1]) * sc * k100 : 0);
  });
  // true ink bounds
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  glyphs.forEach((g, i) => { const bb = g.getPath(gl[i].x, 0, size * k100).getBoundingBox(); minX = Math.min(minX, bb.x1); maxX = Math.max(maxX, bb.x2); minY = Math.min(minY, bb.y1); maxY = Math.max(maxY, bb.y2); });
  out[k] = { text: s.text, glyphs: gl.map(g => ({ ch: g.ch, d: g.d, x1: g.x1, x2: g.x2 })), bbox: { x1: +minX.toFixed(2), x2: +maxX.toFixed(2), y1: +minY.toFixed(2), y2: +maxY.toFixed(2) }, font: s.font.split('/')[0] };
}
fs.writeFileSync(path.join(__dirname, 'wordmarks.json'), JSON.stringify(out));
for (const [k, v] of Object.entries(out)) console.log(k, JSON.stringify(v.bbox));
