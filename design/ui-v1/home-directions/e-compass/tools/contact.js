// node tools/contact.js -> png/contact-sheet.png (the three renders side by side, with their names). Needs Playwright: NODE_PATH=$(npm root -g).
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const os = require('os');
(async () => {
  const root = path.resolve(__dirname, '..'); const shots = ['evening', 'gamenight', 'browse'];
  const html = `<body style="margin:0;background:#15131D;font:600 22px Inter,sans-serif;color:#C8C4D8;display:flex;gap:24px;padding:24px">` +
    shots.map((s) => `<div><img src="file://${path.join(root, 'png', s + '.png')}" style="width:960px;display:block;border-radius:12px"><div style="margin-top:10px">${s}.html</div></div>`).join('') + `</body>`;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 3000, height: 620 } });
  const tmp = path.join(os.tmpdir(), 'compass-contact.html'); fs.writeFileSync(tmp, html); await p.goto('file://' + tmp); await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(root, 'png', 'contact-sheet.png'), fullPage: true }); await b.close(); console.log('wrote png/contact-sheet.png');
})();
