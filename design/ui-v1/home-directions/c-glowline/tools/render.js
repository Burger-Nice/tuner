// node tools/render.js [page.html ...] -> png/<page>.png at 1920 x 1080 (960 x 540 @2). Needs Playwright: NODE_PATH=$(npm root -g).
// Without arguments renders every *.html in the folder, then png/contact-sheet.png.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const root = path.resolve(__dirname, '..');
  const args = process.argv.slice(2);
  const files = args.length ? args : fs.readdirSync(root).filter((f) => /^\d.*\.html$/.test(f)).sort();
  const b = await chromium.launch();
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
    p.on('pageerror', (e) => console.error('PAGEERROR', f, e.message));
    p.on('requestfailed', (r) => console.error('MISSING', f, r.url()));
    await p.goto('file://' + path.join(root, f)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(root, 'png', f.replace(/\.html$/, '.png')) }); await p.close();
    console.log('wrote png/' + f.replace(/\.html$/, '.png'));
  }
  if (args.length) { await b.close(); return; }
  const figs = files.map((f) => `<figure><img src="../png/${f.replace(/\.html$/, '.png')}"><figcaption>${f.replace(/\.html$/, '')}</figcaption></figure>`).join('');
  const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="../../../../../app/tv/brand/fonts.css"><style>
  body{margin:0;background:#15131D;color:#F3EFE6;font:600 15px/20px "Inter Variable",sans-serif;padding:28px}
  h1{font:700 28px/32px Outfit,sans-serif;margin:0 0 18px}.g{display:grid;grid-template-columns:repeat(2,880px);gap:22px 24px}
  figure{margin:0}img{width:880px;height:495px;display:block;border-radius:8px;border:1px solid #3C3452}figcaption{padding:8px 2px 0;color:#C8C4D8}</style>
  <h1>airglow · Home direction C · Glowline</h1><div class="g">${figs}</div>`;
  const tmp = path.join(root, 'tools', '_contact.html'); fs.writeFileSync(tmp, html);
  const p = await b.newPage({ viewport: { width: 28 * 2 + 2 * 880 + 24, height: 600 }, deviceScaleFactor: 1 });
  await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(root, 'png', 'contact-sheet.png'), fullPage: true }); await p.close(); fs.unlinkSync(tmp);
  console.log('wrote png/contact-sheet.png'); await b.close();
})();
