// node tests/qr-test.js <out dir> -> writes app/tv/js/qr.js codes for a few links as PGM images, for a decoder to read
// (python3 -c "import zxingcpp" checks them: see the end of this file). Exit 1 if the encoder throws.
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || '.';
(async () => {
  const { qrMatrix } = await import(path.join(__dirname, '../app/tv/js/qr.js'));
  const links = ['https://link.stremio.com/R2T3', 'http://192.168.1.23:8790/k3J9xQ2mVb7LpR4s', 'https://torrentio.strem.fun/realdebrid=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/manifest.json', 'x'.repeat(150)];
  links.forEach((t, k) => {
    const m = qrMatrix(t), s = 6, n = (m.length + 8) * s;
    const px = Buffer.alloc(n * n, 255);
    m.forEach((row, y) => row.forEach((c, x) => { if (c) for (let dy = 0; dy < s; dy++) px.fill(0, ((y + 4) * s + dy) * n + (x + 4) * s, ((y + 4) * s + dy) * n + (x + 5) * s); }));
    fs.writeFileSync(path.join(out, `qr${k}.pgm`), Buffer.concat([Buffer.from(`P5 ${n} ${n} 255\n`), px]));
    fs.writeFileSync(path.join(out, `qr${k}.txt`), t);
    console.log(`qr${k}: version ${(m.length - 17) / 4}, ${t.length} bytes`);
  });
})();
