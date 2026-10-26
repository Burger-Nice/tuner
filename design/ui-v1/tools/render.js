// node tools/render.js tv/home.html [tv/live.html ...]   -> png/tv-home.png (1920x1080 for a 960x540@2 mock)
// Size comes from <meta name="mock-size" content="960x540@2">. Needs playwright (NODE_PATH=$(npm root -g)).
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const root = path.resolve(__dirname, '..'); const files = process.argv.slice(2);
  const b = await chromium.launch();
  for (const f of files) {
    const abs = path.resolve(root, f); const src = fs.readFileSync(abs, 'utf8');
    const m = /name="mock-size" content="(\d+)x(\d+)@(\d+(?:\.\d+)?)"/.exec(src) || [0, 960, 540, 2];
    const p = await b.newPage({ viewport: { width: +m[1], height: +m[2] }, deviceScaleFactor: +m[3] });
    p.on('pageerror', (e) => console.error('PAGEERROR', f, e.message)); p.on('console', (c) => { if (c.type() === 'error') console.error('CONSOLE', f, c.text()); });
    await p.goto('file://' + abs); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    const out = path.join(root, 'png', path.relative(root, abs).replace(/\.html$/, '.png').replace(/[\\/]/g, '-'));
    await p.screenshot({ path: out }); await p.close(); console.log('wrote', path.relative(root, out));
  }
  await b.close();
})();
