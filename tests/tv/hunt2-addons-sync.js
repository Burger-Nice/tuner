// Bug hunt: an add-on he unticked on "Your Stremio add-ons" (Public Domain Movies starts unticked) comes back on the
// next keep-in-step sync (a cold start, or opening Add-ons a minute later), with a toast.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { ok, check, H } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, {});
  const toAddons = async () => { await ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(900); await ev(() => document.querySelector('[data-g="addons"]').click()); await p.waitForTimeout(600); await ev(() => document.querySelector('[data-screen="account"] [data-act="ad:add"]').focus()); };
  await toAddons();
  await key('Enter', 1, 700); await key('Enter', 1, 1500);
  await fetch(`${H}/_stremio/approve`);
  await p.waitForTimeout(4500);
  await ok(p, 'found: Add N add-ons', (w) => /Add \d add-ons/.test(w)); await shot('found');
  const found = await ev(() => [...document.querySelectorAll('.ad-imp .ad-lr')].map((r) => (r.querySelector('.ck.on') ? '[x] ' : '[ ] ') + r.querySelector('.a').textContent));
  console.log(found.join('\n'));
  await key('Enter', 1, 1200);
  const names = () => ev(() => [...document.querySelectorAll('[data-screen="account"] .ad-row .a')].map((r) => r.textContent));
  const before = await names();
  check('after import: no Public Domain Movies', !before.includes('Public Domain Movies'), before.join(', '));
  // a cold start: the sync runs 8 s after the session
  await p.reload(); await p.waitForTimeout(11000);
  await toAddons(); await p.waitForTimeout(1500); await shot('after-restart');
  const after = await names();
  check('after a restart: still no Public Domain Movies', !after.includes('Public Domain Movies'), after.join(', '));
};
