// The CI walkthrough (tests/android-test-boot.js) in Chromium instead of the emulator: start the servers with
// tests/tv/serve.sh --test, then node tests/tv/walkthrough.js <out dir>. The three native-player checks fail in a
// browser (there's no player there); everything else should pass.
const { chromium } = require('playwright');
const out = process.argv[2];
require('fs').mkdirSync(out, { recursive: true });
const KEY = { DPAD_UP: 'ArrowUp', DPAD_DOWN: 'ArrowDown', DPAD_LEFT: 'ArrowLeft', DPAD_RIGHT: 'ArrowRight', DPAD_CENTER: 'Enter', BACK: 'Escape' };
(async () => {
  const b = await chromium.launch({ args: ['--disable-web-security'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.goto('http://127.0.0.1:8778/index.html');
  const seen = new Set(); let n = 0; const start = Date.now();
  const ack = (name) => fetch('http://127.0.0.1:8899/_report', { method: 'POST', body: JSON.stringify({ step: 'ack', data: { name } }) });
  while (Date.now() - start < 300000) {
    const reports = await (await fetch('http://127.0.0.1:8899/_reports')).json();
    for (const [i, r] of reports.entries()) {
      if (seen.has(i)) continue; seen.add(i);
      if (r.step === 'ack' || r.step === 'after') continue;
      if (r.step === 'check') { console.log(`${r.data.ok ? 'PASS' : 'FAIL'} ${r.data.name} [${r.data.focus}]${r.data.took ? ' ' + r.data.took + 'ms' : ''}`); continue; }
      if (r.step === 'error' || r.step === 'boot') console.log(r.step, JSON.stringify(r.data).slice(0, 300));
      if (r.step === 'keys') { for (const k of r.data.keys) { await p.keyboard.press(KEY[k]); await p.waitForTimeout(250); } await p.waitForTimeout(500); }
      if (r.step === 'shot' || r.step === 'keys') { await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${r.data.name}.png` }); await ack(r.data.name); }
    }
    if (reports.some((r) => r.step === 'done')) { console.log('done', (Date.now() - start) / 1000 + 's'); break; }
    await new Promise((r) => setTimeout(r, 200));
  }
  await b.close();
})();
