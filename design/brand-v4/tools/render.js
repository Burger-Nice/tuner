// node tools/render.js in.html out.png width height [scale]   (Playwright, waits for fonts)
const { chromium } = require('playwright'); const path = require('path');
(async () => { const [i, o, w, h, sc = '1'] = process.argv.slice(2); const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +sc });
  await p.goto('file://' + path.resolve(i)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
  await p.screenshot({ path: o, fullPage: o.includes('directions') }); await b.close(); })();
