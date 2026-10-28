// node tools/render.js [page.html ...] -> png/<page>.png at 1920 x 1080 (960 x 540 @2). Needs Playwright: NODE_PATH=$(npm root -g).
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const root = path.resolve(__dirname, '..');
  fs.mkdirSync(path.join(root, 'png'), { recursive: true });
  const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(root).filter((f) => f.endsWith('.html'));
  const b = await chromium.launch();
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
    p.on('pageerror', (e) => console.error('PAGEERROR', f, e.message));
    p.on('requestfailed', (r) => console.error('MISSING', f, r.url()));
    await p.goto('file://' + path.join(root, f)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(root, 'png', f.replace(/\.html$/, '.png')) }); await p.close();
    console.log('wrote png/' + f.replace(/\.html$/, '.png'));
  }
  await b.close();
})();
