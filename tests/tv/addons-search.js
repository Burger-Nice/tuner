// Search with add-ons (design/ui-v1/addons/SPEC.md 6): the provider's results first, then "From add-ons" after 3 letters
// and a 600 ms pause; titles not out yet and titles the provider has are left out; ▼ goes into the add-on block; a
// row opens the add-on title's page. Run: node tests/tv/drive.js <out> addons-search   (mock: search-addons)
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { ok, check } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(2500);
  await ev(() => window.__tunerTest.go('search')); await p.waitForTimeout(1500);
  await key('Delete', 0);
  await p.keyboard.type('dune', { delay: 120 }); await p.waitForTimeout(400);
  const early = await ev(() => document.querySelector('[data-right]').innerText);
  check('nothing from add-ons before the pause', !/From add-ons/i.test(early));
  await p.waitForTimeout(1500); await shot('search-addons');
  const txt = await ev(() => document.querySelector('[data-right]').innerText.replace(/\s+/g, ' '));
  console.log(txt.slice(0, 300));
  check('From add-ons · Cinemeta', /From add-ons Cinemeta/i.test(txt));
  check('Dune (1984) · David Lynch', /Dune Movie ?1984 ?David Lynch/.test(txt));
  check('Dune Prophecy (series)', /Dune Prophecy Series/.test(txt));
  check('Dune: Part Three (2027) left out', !/Part Three/.test(txt));
  // into the results, then ▼ into the add-on block
  await key('ArrowRight', 6, 100); await ok(p, 'in the results', 'rrow');
  await key('ArrowUp', 1, 300); await ok(p, 'the add-on block: Dune', 'sa:tt9000012'); await shot('search-addons-focus');
  await key('Enter', 1, 2500); await shot('search-open-dune');
  check('Dune\'s page: details from Cinemeta', await ev(() => /Not on your provider · details from Cinemeta/.test(document.querySelector('[data-screen="detail"]')?.innerText || '')));
  await key('Escape', 1, 800);
  // a title the provider has stays in the provider's block only
  await ev(() => window.__tunerTest.go('search')); await p.waitForTimeout(600);
  for (let i = 0; i < 6; i++) await key('Backspace', 1, 60);
  await p.keyboard.type('long night', { delay: 80 }); await p.waitForTimeout(2200); await shot('search-provider-has');
  check('The Long Night: not repeated from add-ons', !(await ev(() => !!document.querySelector('[data-res^="a:movie:tt9000001"]'))));
};
