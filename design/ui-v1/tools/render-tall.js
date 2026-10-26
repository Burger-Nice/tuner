// node tools/render-tall.js overview-final.html png/overview-final.png  (full page at 1x)
const { chromium } = require('playwright'); const path = require('path');
(async () => { const [i, o] = process.argv.slice(2); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1000 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.resolve(i)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500); await p.screenshot({ path: o, fullPage: true }); await b.close(); console.log('wrote', o); })();
