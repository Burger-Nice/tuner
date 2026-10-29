// node tools/render.js [page.html ...] -> png/<page>.png at 1179 x 2556 (393 x 852 @3; landscape 852 x 393 @3), then png/contact-sheet.png.
// Needs Playwright: NODE_PATH=$(npm root -g).
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const root = path.resolve(__dirname, '..');
  fs.mkdirSync(path.join(root, 'png'), { recursive: true });
  const pages = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'pages.json'), 'utf8'));
  const files = process.argv.slice(2).length ? process.argv.slice(2) : pages.map((p) => p.file);
  const b = await chromium.launch();
  for (const f of files) {
    const land = /landscape/.test(f);
    const p = await b.newPage({ viewport: land ? { width: 852, height: 393 } : { width: 393, height: 852 }, deviceScaleFactor: 3 });
    p.on('pageerror', (e) => console.error('PAGEERROR', f, e.message));
    p.on('requestfailed', (r) => console.error('MISSING', f, r.url()));
    await p.goto('file://' + path.join(root, f)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(root, 'png', f.replace(/\.html$/, '.png')) }); await p.close();
    console.log('wrote png/' + f.replace(/\.html$/, '.png'));
  }
  if (process.argv.slice(2).length) { await b.close(); return; }
  let n = 0;
  const grid = pages.map((pg) => `<figure class="${/landscape/.test(pg.file) ? 'land' : ''}"><img src="../png/${pg.file.replace(/\.html$/, '.png')}"><figcaption><b>${++n}. ${pg.title}</b><span>${pg.note}</span></figcaption></figure>`).join('');
  const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="../../../../app/tv/brand/fonts.css"><style>
  body{margin:0;background:#15131D;color:#F3EFE6;font:500 13px/17px "Inter Variable",sans-serif;padding:28px 28px 8px}
  h1{font:700 26px/30px Outfit,sans-serif;margin:0 0 4px}p.s{margin:0 0 18px;color:#C8C4D8;font-size:14px}
  .g{display:flex;flex-wrap:wrap;gap:22px 20px;align-items:flex-start}figure{margin:0;width:393px}figure.land{width:852px;order:99}img{width:393px;height:852px;display:block;border-radius:28px;border:1px solid #3C3452}
  figure.land img{width:852px;height:393px}figcaption{padding:7px 2px 0}figcaption b{display:block;font-weight:650;font-size:14px}figcaption span{display:block;color:#C8C4D8;margin-top:2px}</style>
  <h1>airglow · iPhone, v1</h1><p class="s">Mocks at 393 x 852 pt (rendered 3x). The same evening as the TV's Home: Wed 28 Oct 2026, Reykjavik, shield My team. Spec: SPEC.md.</p><div class="g">${grid}</div>`;
  const tmp = path.join(root, 'tools', '_contact.html'); fs.writeFileSync(tmp, html);
  const p = await b.newPage({ viewport: { width: 28 * 2 + 4 * 393 + 3 * 20, height: 800 }, deviceScaleFactor: 1 });
  await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(root, 'png', 'contact-sheet.png'), fullPage: true }); await p.close(); fs.unlinkSync(tmp);
  console.log('wrote png/contact-sheet.png');
  await b.close();
})();
