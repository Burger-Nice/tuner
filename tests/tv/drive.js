// Drives the TV UI in Chromium against the fake provider, with the remote's keys. Start the servers first
// (tests/tv/serve.sh), then: node tests/tv/drive.js <out dir> <script> — <script>.js (next to this file) exports
// async ({ p, shot, key, log }) => {}: p is the Playwright page (960x540, 2x), shot(name) saves a numbered PNG,
// key('ArrowDown', times, waitMs), log(label) prints what has focus. Enter = OK, Escape = Back.
// window.__tunerTest.go('<screen>') jumps to a screen (home, live, nba, movie, series, saved, search, account, first).
const { chromium } = require('playwright');
const out = process.argv[2];
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--disable-web-security'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.addInitScript(() => { localStorage.setItem('tuner.nbaBase', JSON.stringify('http://127.0.0.1:8899/espn')); window.TUNER_TEST = 1; });
  await p.goto('http://127.0.0.1:8777/tv.html');
  await p.waitForTimeout(1200);
  let n = 0;
  const shot = async (name) => { await p.waitForTimeout(450); await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); };
  const key = async (k, times = 1, wait = 120) => { for (let i = 0; i < times; i++) { await p.keyboard.press(k); await p.waitForTimeout(wait); } };
  const focused = () => p.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}.${a.className} ${Object.entries(a.dataset).map(([k, v]) => k + '=' + v).join(' ')} "${(a.textContent || '').trim().slice(0, 40)}"` : 'none'; });
  const log = async (label) => console.log(label.padEnd(22), await focused());
  global.ctx = { p, shot, key, log, focused };
  await require(require('path').resolve(__dirname, `${process.argv[3] || 'example-layout'}.js`))(global.ctx);
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
