// Movies with add-on catalogs (design/ui-v1/addons/SPEC.md 4.2): the chips after the provider's, past a divider; an
// add-on chip's grid in its own order with the [tv] mark on titles the provider has; paging (the skeleton row, a page
// that fails inline, ▼ to try again); hold OK on a chip (Hide this chip); a first page that fails (the full card).
// Run: node tests/tv/drive.js <out> addons-lib   (mocks: movies-addon, movies-chip-menu, movies-addon-more, movies-addon-down)
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { ok, check, hold, H } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(3500);
  const chips = await ev(() => [...document.querySelectorAll('[data-screen="movie"] .lib-chips .chip')].map((c) => c.textContent));
  console.log('chips:', chips.join(' | '));
  check('add-on chips after the provider\'s', chips.includes('PopularCinemeta') && chips.includes('NewCinemeta') && !chips.includes('FeaturedCinemeta'));
  await key('ArrowUp', 1, 400);
  for (let i = 0; i < 12; i++) { const w = await C.where(p); if (/PopularCinemeta/.test(w)) break; await key('ArrowRight', 1, 150); }
  await ok(p, 'the Popular Cinemeta chip', 'PopularCinemeta'); await key('Enter', 1, 2500); await shot('movies-addon');
  const head = await ev(() => document.querySelector('[data-screen="movie"] [data-head]').innerText.replace(/\s+/g, ' '));
  check('caption: Popular from Cinemeta · also on your provider', /Popular from Cinemeta/.test(head) && /also on your provider/.test(head), head.slice(0, 90));
  const marks = await ev(() => [...document.querySelectorAll('[data-screen="movie"] .pc')].filter((c) => c.querySelector('.ad-mine')).map((c) => c.querySelector('.cap').textContent));
  check('[tv] on The Long Night and Northern Lights', marks.includes('The Long Night') && marks.includes('Northern Lights'), marks.join(', '));
  check('Sort and Jump go', await ev(() => !document.querySelector('[data-screen="movie"] [data-act="sort"]') && !!document.querySelector('[data-screen="movie"] [data-act="genre"]')));
  // paging: the second page fails, then comes on ▼
  await fetch(`${H}/_addons/fail?what=page2`);
  await key('ArrowDown', 1, 500); await key('ArrowDown', 8, 350); await p.waitForTimeout(1200); await shot('movies-addon-more');
  check('inline: Cinemeta didn\'t send the next page', await ev(() => /didn't send the next page/.test(document.querySelector('[data-screen="movie"] .ad-more')?.innerText || '')));
  await fetch(`${H}/_addons/ok`);
  await key('ArrowDown', 1, 1500);
  const n = await ev(() => { const g = document.querySelector('[data-screen="movie"] .lib-grid'); return Math.max(...[...g.querySelectorAll('.pc')].map((c) => +c.dataset.i)); });
  check('▼ tried again: page 2 is in', n > 50, `last index ${n}`);
  await key('ArrowDown', 6, 400); await p.waitForTimeout(800); await shot('movies-addon-end');
  // hold OK on the chip
  await key('ArrowUp', 20, 60); await p.waitForTimeout(500); await key('ArrowUp', 1, 400);
  await ok(p, 'back on the chip', 'PopularCinemeta');
  await hold(p); await ok(p, 'chip menu: Hide this chip', 'Hide this chip'); await shot('movies-chip-menu'); await key('Escape', 1, 400);
  // the first page fails
  await fetch(`${H}/_addons/fail?what=catalog`);
  await key('ArrowRight', 1, 200); await ok(p, 'the New Cinemeta chip', 'NewCinemeta'); await key('Enter', 1, 12000); await shot('movies-addon-down');
  await ok(p, 'down: Try again', 'adretry');
  await fetch(`${H}/_addons/ok`);
  await key('Enter', 1, 2500); await shot('movies-addon-new');
  check('New opens on its first year (2026)', await ev(() => /2026/.test(document.querySelector('[data-screen="movie"] [data-head]').innerText)));
  // Hide this chip
  await key('ArrowUp', 1, 300); await hold(p); await key('Enter', 1, 800);
  const chips2 = await ev(() => [...document.querySelectorAll('[data-screen="movie"] .lib-chips .chip')].map((c) => c.textContent));
  check('the New chip is hidden', !chips2.includes('NewCinemeta'), chips2.slice(-3).join(' | '));
  await ok(p, 'focus back on a chip', 'chip');
};
