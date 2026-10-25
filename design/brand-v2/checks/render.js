// Render HTML/SVG files to PNG with Playwright. Usage: node render.js <in.html|in.svg> <out.png> [width] [height] [scale]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [inp, out, w = '1600', h = '900', scale = '1'] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +scale });
  await page.goto('file://' + path.resolve(inp));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: out, fullPage: false, omitBackground: inp.endsWith('.svg') });
  await browser.close();
})();
