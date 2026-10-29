// node tools/contrast.js [page.html ...] : the contrast of every text in the top block, the corner, the banner, the ends row
// and the hint bar against what is really behind it (the picture, the scrims and the text's own shadow), per mock. The
// pixels are read back through a canvas in the page, so the tool needs nothing but Playwright.
// Method: the text is made transparent (its shadow still draws), the page is shot at 1x, and the pixels inside each
// text's box are read; the backdrop luminance is the box's median (the shadow is strongest at the strokes) and its 90th
// percentile (the worst gaps). Contrast = (L_text + .05) / (L_back + .05), WCAG. Needs Playwright: NODE_PATH=$(npm root -g).
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const root = path.resolve(__dirname, '..');
const SEL = '.pv-top h1, .pv-top .sub, .pv-top .what, .pv-top .line, .pv-tr b, .pv-tr span, .pv-bn .ch, .pv-bn .pg, .pv-bn .l3, .pv-ends .l, .pv-ends .r, .pv-ends .ch, .pv-hint > span, .lbl';
const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
(async () => {
  const pages = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'pages.json'), 'utf8'));
  const files = process.argv.slice(2).length ? process.argv.slice(2) : pages.map((p) => p.file);
  const b = await chromium.launch();
  let worst = 99, worstWhere = '';
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
    await p.goto('file://' + path.join(root, f)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
    const items = await p.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetWidth > 0).map((e) => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { name: e.className || e.tagName.toLowerCase(), text: e.textContent.trim().slice(0, 28), x: r.left, y: r.top, w: r.width, h: r.height, color: cs.color };
    }), SEL);
    await p.addStyleTag({ content: `${SEL} { color: transparent !important; } ${SEL} svg { visibility: hidden }` });
    await p.waitForTimeout(100);
    const shot = (await p.screenshot()).toString('base64');
    const data = await p.evaluate((b64) => new Promise((ok) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = 960; c.height = 540; const g = c.getContext('2d'); g.drawImage(im, 0, 0); ok(Array.from(g.getImageData(0, 0, 960, 540).data)); }; im.src = 'data:image/png;base64,' + b64; }), shot);
    const png = { data };
    const rows = [];
    for (const it of items) {
      const ls = [];
      for (let y = Math.max(0, it.y | 0); y < Math.min(540, it.y + it.h); y++) for (let x = Math.max(0, it.x | 0); x < Math.min(960, it.x + it.w); x++) { const i = (y * 960 + x) * 4; ls.push(lum(png.data[i], png.data[i + 1], png.data[i + 2])); }
      ls.sort((a, c) => a - c);
      const med = ls[ls.length >> 1], p90 = ls[Math.floor(ls.length * 0.9)];
      const m = it.color.match(/\d+/g).map(Number); const lt = lum(m[0], m[1], m[2]);
      const c = (lo) => lt > lo ? (lt + 0.05) / (lo + 0.05) : (lo + 0.05) / (lt + 0.05);
      rows.push({ text: it.text, med: c(med), p90: c(p90) });
      if (c(med) < worst) { worst = c(med); worstWhere = f + ' "' + it.text + '"'; }
    }
    const bad = rows.filter((r) => r.med < 4.5);
    console.log(f + ': ' + rows.length + ' texts, lowest ' + Math.min(...rows.map((r) => r.med)).toFixed(2) + ':1 (median backdrop), ' + Math.min(...rows.map((r) => r.p90)).toFixed(2) + ':1 (90th)' + (bad.length ? '  FAIL ' + bad.map((r) => `"${r.text}" ${r.med.toFixed(2)}`).join(', ') : '  pass'));
    await p.close();
  }
  console.log('worst: ' + worst.toFixed(2) + ':1 at ' + worstWhere);
  await b.close();
})();
