// Bug hunt: the 30-minute stream cache ignores changes to the add-on list. Turn Northlight off (or add one) and the
// title page opened again shows the same copies as before.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(2500);
  const open = () => ev(async () => { const a = await import('/tv/js/actions.js'), c = await import('/tv/js/catalog.js'); a.openDetail(c.catalog.movie.titles.find((x) => x.name === 'The Long Night')); });
  const pill = () => ev(() => document.querySelector('[data-screen="detail"] [data-act="version"]')?.innerText.replace(/\s+/g, ' ') || '(none)');
  await open(); await p.waitForTimeout(7500);
  const p1 = await pill(); console.log('pill with Northlight on:', p1);
  await key('Escape', 1, 600);
  // Account > Add-ons > Northlight: Turn off
  await ev(async () => { const A = await import('/tv/js/addons.js'); A.setOn(A.addons().find((a) => a.manifest.name === 'Northlight'), false); });
  await open(); await p.waitForTimeout(2500); await shot('after-off');
  const p2 = await pill(); console.log('pill with Northlight off:', p2);
  check('Northlight off: its copies are gone from the page', !/Northlight/.test(p2), p2);
  await key('Escape', 1, 600);
  // Remove it altogether
  await ev(async () => { const A = await import('/tv/js/addons.js'); A.removeAddon(A.addons().find((a) => a.manifest.name === 'Northlight')); });
  await open(); await p.waitForTimeout(2500); await shot('after-remove');
  const p3 = await pill(); console.log('pill with Northlight removed:', p3);
  check('Northlight removed: its copies are gone from the page', !/Northlight/.test(p3), p3);
  await key('ArrowDown', 1, 300); await key('Enter', 1, 700); await shot('copies-after-remove');
  const rows = await ev(() => [...document.querySelectorAll('.menu.ad-copies .lr.ad-two')].map((r) => r.innerText.replace(/\s+/g, ' ')).slice(0, 4).join(' | '));
  console.log('Copies:', rows);
};
