// node tools/render.js [page.html ...]   -> png/<page>.png at 1920 x 1080 (960 x 540 @2), then png/contact-sheet.png
// (design/ui-v1/diagnosis/tools/render.js, with the contact sheet grouped: On the title page, Around the app, In the player)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const root = path.resolve(__dirname, '..');
  fs.mkdirSync(path.join(root, 'png'), { recursive: true });
  const pages = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'pages.json'), 'utf8'));
  const files = process.argv.slice(2).length ? process.argv.slice(2) : pages.map((p) => p.file);
  const b = await chromium.launch();
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
    p.on('pageerror', (e) => console.error('PAGEERROR', f, e.message));
    p.on('requestfailed', (r) => console.error('MISSING', f, r.url()));
    await p.goto('file://' + path.join(root, f)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(root, 'png', f.replace(/\.html$/, '.png')) }); await p.close();
    console.log('wrote png/' + f.replace(/\.html$/, '.png'));
  }
  if (process.argv.slice(2).length) { await b.close(); return; }
  // contact sheet: 4 across, each at 480 x 270 with its number, name and one line on what it shows, in three groups
  let n = 0;
  const groups = ['On the title page', 'Around the app', 'In the player'].map((g) => `<h2>${g}</h2><div class="g">${pages.filter((pg) => pg.group === g).map((pg) => `<figure><img src="../png/${pg.file.replace(/\.html$/, '.png')}"><figcaption><b>${++n}. ${pg.title}</b><span>${pg.note}</span></figcaption></figure>`).join('')}</div>`).join('');
  const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="../../../../app/tv/brand/fonts.css"><style>
  body{margin:0;background:#15131D;color:#F3EFE6;font:500 13px/17px "Inter Variable",sans-serif;padding:28px 28px 8px}
  h1{font:700 26px/30px Outfit,sans-serif;margin:0 0 4px}h2{font:700 20px/26px Outfit,sans-serif;margin:22px 0 12px}p.s{margin:0 0 6px;color:#C8C4D8;font-size:14px}
  .g{display:grid;grid-template-columns:repeat(4,480px);gap:22px 20px}figure{margin:0}img{width:480px;height:270px;display:block;border-radius:6px;border:1px solid #3C3452}
  figcaption{padding:7px 2px 0}figcaption b{display:block;font-weight:650;font-size:14px}figcaption span{display:block;color:#C8C4D8;margin-top:2px}</style>
  <h1>airglow · subtitles that are always there, and real quality for every copy</h1><p class="s">Mocks at 960 x 540 (rendered 2x). Tue 27 Oct 2026, 21:30 on the owner's TV (Reykjavik time). OpenSubtitles, Cinemeta and IMDb data checked with curl that day; the provider's copies are illustrative. Spec: SPEC.md.</p>${groups}`;
  const tmp = path.join(root, 'tools', '_contact.html'); fs.writeFileSync(tmp, html);
  const p = await b.newPage({ viewport: { width: 28 * 2 + 4 * 480 + 3 * 20, height: 800 }, deviceScaleFactor: 1 });
  await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(root, 'png', 'contact-sheet.png'), fullPage: true }); await p.close(); fs.unlinkSync(tmp);
  console.log('wrote png/contact-sheet.png');
  await b.close();
})();
