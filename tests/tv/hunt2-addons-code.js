// Bug hunt: the Stremio code screen after 10 minutes (a new code, "The last code ran out"), and the phone signing in
// with the old code just after it was replaced.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check, where, H } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { at: '2026-10-27T21:00:00Z' });
  await ev(() => window.__tunerTest.go('account')); await p.clock.runFor(900);
  await ev(() => document.querySelector('[data-g="addons"]').click()); await p.clock.runFor(600);
  await ev(() => document.querySelector('[data-screen="account"] [data-act="ad:add"]').focus());
  await key('Enter', 1, 50); await p.clock.runFor(700); await key('Enter', 1, 50); await p.clock.runFor(1500);
  const c1 = await ev(() => document.querySelector('.ad-code')?.innerText.replace(/\s/g, ''));
  for (let i = 0; i < 205; i++) await p.clock.runFor(3000);
  await p.waitForTimeout(500); await p.clock.runFor(1000);
  await shot('code-renewed');
  const c2 = await ev(() => document.querySelector('.ad-code')?.innerText.replace(/\s/g, ''));
  const txt = await ev(() => [...document.querySelectorAll('.ad-full')].pop()?.innerText || '');
  check('after 10 min: a new code', c1 && c2 && c1 !== c2, `${c1} -> ${c2}`);
  check('says the last code ran out', /The last code ran out/.test(txt));
  console.log('focus:', await where(p), '· reads', (await fetch(`${H}/_stremio/state`).then((r) => r.json())).reads);
};
