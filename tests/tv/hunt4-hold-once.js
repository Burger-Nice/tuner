// The owner's report: holding OK opened the hold menu twice. A TV remote waits ~500 ms before its first repeat and its
// WebView doesn't mark repeats, so a hold is: a keydown, a plain keydown ~500 ms later, then one every 50 ms. One menu.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  await ev(() => window.__tunerTest.go('live')); await p.waitForTimeout(3000);
  console.log('held on:', await ev(() => { const c = document.querySelector('[data-screen="live"] [data-hold]'); c?.focus(); return c ? c.className + ' ' + c.textContent.slice(0, 30) : 'nothing'; }));
  const down = () => ev(() => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true })));
  await ev(() => { window.__holds = 0; document.addEventListener('tvhold', () => { window.__holds++; }, true); });
  const t0 = Date.now();
  await down();
  await p.waitForTimeout(520); await down();               // the first repeat, not marked as one
  while (Date.now() - t0 < 1600) { await p.waitForTimeout(50); await down(); }
  await ev(() => document.activeElement.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true })));
  await p.waitForTimeout(600); await shot('hold-once');
  const holds = await ev(() => window.__holds);
  console.log(holds === 1 ? 'ok  ' : 'FAIL', `one hold is one hold (${holds} hold events)`);
};
