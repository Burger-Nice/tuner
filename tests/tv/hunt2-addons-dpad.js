// Bug hunt (D-pad tour + bad network) on the add-on screens: the code screen when Stremio can't be reached, Back from
// each step, Your Stremio add-ons (◀ into the list, ▼ to the last row), the email screen, Stremio's list.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { ok, check, where, H } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, {});
  const toAddons = async () => { await ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(900); await ev(() => document.querySelector('[data-g="addons"]').click()); await p.waitForTimeout(600); await ev(() => document.querySelector('[data-screen="account"] [data-act="ad:add"]').focus()); };
  const ovs = () => ev(() => document.querySelectorAll('#overlays .ov').length);
  await toAddons();
  // the code screen, Stremio unreachable
  await p.route(/stremio-link\/api\/v2\/create/, (r) => r.abort());
  await key('Enter', 1, 700); await key('Enter', 1, 1500); await shot('code-down');
  await ok(p, 'code down: Try again focused', 'retry');
  const txt = await ev(() => [...document.querySelectorAll('.ad-full')].pop().innerText.replace(/\s+/g, ' '));
  console.log('code screen:', txt.slice(0, 260));
  await key('ArrowRight', 1, 200); console.log('→ from Try again:', await where(p));
  await p.unroute(/stremio-link\/api\/v2\/create/);
  await key('ArrowLeft', 1, 200); await key('Enter', 1, 1500); await shot('code-retry');
  await ok(p, 'after Try again: the email button', 'email');
  check('the code tiles are drawn', await ev(() => /[A-Z0-9]{4}/.test(document.querySelector('.ad-code')?.innerText.replace(/\s/g, '') || '')));
  // Back from the code screen: the four ways, then the list
  await key('Escape', 1, 500); console.log('Back from code:', await where(p), 'overlays', await ovs());
  await key('Escape', 1, 500); console.log('Back from ways:', await where(p), 'overlays', await ovs());
  // the found screen
  await key('Enter', 1, 600); await key('Enter', 1, 1500);
  await fetch(`${H}/_stremio/approve`); await p.waitForTimeout(4500);
  await ok(p, 'found: Add', (w) => /Add \d add-ons/.test(w));
  await key('ArrowLeft', 1, 300); console.log('◀ from Add:', await where(p));
  await key('ArrowDown', 8, 200); console.log('▼ x8:', await where(p)); await shot('found-bottom');
  const vis = await ev(() => { const a = document.activeElement.getBoundingClientRect(); const box = document.activeElement.closest('.sheet-body').getBoundingClientRect(); return { a: [a.top, a.bottom], box: [box.top, box.bottom] }; });
  check('the last row is scrolled into view', vis.a[0] >= vis.box[0] - 1 && vis.a[1] <= vis.box[1] + 1, JSON.stringify(vis));
  await key('Enter', 1, 300); console.log('ticked last:', await ev(() => document.querySelector('[data-act="add"]').innerText));
  await key('ArrowRight', 1, 300); console.log('▶ from the list:', await where(p));
  await key('ArrowUp', 1, 300); console.log('▲ from Add:', await where(p));
  await key('Escape', 1, 500); console.log('Back from found:', await where(p), 'overlays', await ovs(), 'rows', await ev(() => document.querySelectorAll('[data-screen="account"] .ad-row').length));
  await shot('after-back-found');
};
module.exports.after = true;
