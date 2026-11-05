// node tools/render.js [page.html ...] -> png/<page>.png at each page's own size (the mock-size meta: 960x540@2 for the TV,
// 393x852@3 for the iPhone, 1920x1080@1 for Windows), then png/contact-sheet.png. Needs Playwright: NODE_PATH=$(npm root -g);
// PW_CHROME=<a chromium or headless shell binary> when Playwright's own download is missing.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const root = path.resolve(__dirname, '..');
  fs.mkdirSync(path.join(root, 'png'), { recursive: true });
  const pages = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'pages.json'), 'utf8'));
  const files = process.argv.slice(2).length ? process.argv.slice(2) : pages.map((p) => p.file);
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
  const size = (f) => { const m = fs.readFileSync(path.join(root, f), 'utf8').match(/mock-size" content="(\d+)x(\d+)@(\d)/); return { w: +m[1], h: +m[2], s: +m[3] }; };
  for (const f of files) {
    const { w, h, s } = size(f);
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: s });
    p.on('pageerror', (e) => console.error('PAGEERROR', f, e.message));
    p.on('requestfailed', (r) => console.error('MISSING', f, r.url()));
    await p.goto('file://' + path.join(root, f)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(root, 'png', f.replace(/\.html$/, '.png')) }); await p.close();
    console.log('wrote png/' + f.replace(/\.html$/, '.png'));
  }
  if (process.argv.slice(2).length) { await b.close(); return; }
  let n = 0;
  const grid = pages.map((pg) => { const { w, h } = size(pg.file); const kind = w === 1920 ? 'win' : w === 960 ? 'tv' : 'ph'; return `<figure class="${kind}"><img src="../png/${pg.file.replace(/\.html$/, '.png')}"><figcaption><b>${++n}. ${pg.title}</b><span>${pg.note}</span></figcaption></figure>`; }).join('');
  const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="../../../../app/tv/brand/fonts.css"><style>
  body{margin:0;background:#15131D;color:#F3EFE6;font:500 13px/17px "Inter Variable",sans-serif;padding:28px 28px 8px}
  h1{font:700 26px/30px Outfit,sans-serif;margin:0 0 4px}p.s{margin:0 0 18px;color:#C8C4D8;font-size:14px}
  .g{display:flex;flex-wrap:wrap;gap:22px 20px;align-items:flex-start}figure{margin:0}img{display:block;border:1px solid #3C3452;background:#000}
  figure.tv{width:640px}figure.tv img{width:640px;height:360px;border-radius:6px}
  figure.ph{width:300px}figure.ph img{width:300px;height:650px;border-radius:22px}
  figure.win{width:1300px}figure.win img{width:1300px;height:731px;border-radius:6px}
  figcaption{padding:7px 2px 0}figcaption b{display:block;font-weight:650;font-size:14px}figcaption span{display:block;color:#C8C4D8;margin-top:2px}</style>
  <h1>airglow · accounts and sync, v1</h1><p class="s">The TV at 960 x 540 (2x), the iPhone at 393 x 852 (3x), the Windows app at 1920 x 1080. One evening: Wed 28 Oct 2026, Reykjavik; the owner signs his living-room TV in from his phone. Spec: SPEC.md.</p><div class="g">${grid}</div>`;
  const tmp = path.join(root, 'tools', '_contact.html'); fs.writeFileSync(tmp, html);
  const p = await b.newPage({ viewport: { width: 28 * 2 + 1300, height: 800 }, deviceScaleFactor: 1 });
  await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(root, 'png', 'contact-sheet.png'), fullPage: true }); await p.close(); fs.unlinkSync(tmp);
  console.log('wrote png/contact-sheet.png');
  await b.close();
})();
