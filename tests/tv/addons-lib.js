// The add-ons in the library (design/ui-v1/home-final/SPEC.md 7; design/ui-v1/addons/SPEC.md 4.2 as the library now is):
// Movies lists the add-ons' titles only (the provider is live TV); another add-on's catalog is a chip with its name and
// the add-on's; Popular pages with Cinemeta's skip, a page that fails shows inline and ▼ tries again; a shelf whose
// first page fails shows its own card with Try again; New is this year's titles.
// Run: node tests/tv/drive.js <out> addons-lib   (mocks: movies-addon, movies-addon-more, movies-addon-down)
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check, H } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(3500);
  const chips = await ev(() => [...document.querySelectorAll('[data-screen="movie"] .lib-chips .chip')].map((c) => c.textContent));
  console.log('chips:', chips.join(' | '));
  check('an add-on\'s catalog is a chip: its name and the add-on', chips.some((c) => /^Public Domain Movies/.test(c)));
  check('Cinemeta\'s Featured is never read', !chips.some((c) => /Featured/.test(c)));
  const keys = await ev(() => [...document.querySelectorAll('[data-screen="movie"] .lb-p')].map((x) => x.dataset.key));
  check('Popular: Cinemeta\'s titles first (Tenzing), never the provider\'s', keys[0] === 'movie:tt9000010'.replace(/^/, 't:') && keys.every((k) => /:tt\d+$/.test(k)), keys.slice(0, 3).join(' '));
  await shot('movies-addon');
  // paging: the second page fails inline, then comes on ▼
  await fetch(`${H}/_addons/fail?what=page2`);
  await ev(async () => { for (const k of JSON.parse(localStorage.getItem('tuner.adCatIx') || '[]')) await window.Core.cache.set(k, null); });
  await key('ArrowDown', 1, 500); for (let i = 0; i < 9; i++) await key('ArrowDown', 1, 350);
  await p.waitForTimeout(1500); await shot('movies-addon-more');
  check('inline: the next page didn\'t come', await ev(() => /next page didn't come/.test(document.querySelector('[data-screen="movie"] .lb-more')?.innerText || '')));
  await fetch(`${H}/_addons/ok`);
  await key('ArrowDown', 1, 2500);
  const n = await ev(() => Math.max(...[...document.querySelectorAll('[data-screen="movie"] .lb-p')].map((c) => +c.dataset.i)));
  check('▼ tried again: page 2 is in', n > 50, `last index ${n}`);
  // the add-on's own catalog
  await key('Escape', 1, 900); await key('ArrowDown', 1, 600); await key('ArrowUp', 1, 600);
  await ev(() => [...document.querySelectorAll('[data-screen="movie"] .lib-chips .chip')].find((c) => /^Public Domain Movies/.test(c.textContent))?.focus());
  await key('Enter', 1, 2500);
  const pdm = await ev(() => [...document.querySelectorAll('[data-screen="movie"] .lb-p')].map((x) => x.dataset.key));
  check('its catalog: Night of the Living Dead', pdm.includes('t:movie:tt0063350'), pdm.join(' '));
  // a first page that fails: the shelf's own card, then Try again
  await fetch(`${H}/_addons/fail?what=catalog`);
  await ev(async () => { for (const k of JSON.parse(localStorage.getItem('tuner.adCatIx') || '[]')) await window.Core.cache.set(k, null); const AD = await import('/tv/js/addons.js'); });
  await ev(() => document.querySelector('[data-screen="movie"] [data-chip="g:Sci-Fi"]').focus()); await key('Enter', 1, 12000);   // (a shelf not read yet this session)
  await shot('movies-addon-down');
  check('the first page fails: the shelf isn\'t answering, Try again', await ev(() => /isn't answering/.test(document.querySelector('[data-screen="movie"] .lb-grid').innerText) && !!document.querySelector('[data-screen="movie"] [data-act="retry"]')));
  await fetch(`${H}/_addons/ok`);
  await ev(() => document.querySelector('[data-screen="movie"] [data-act="retry"]').focus()); await key('Enter', 1, 3000);
  await shot('movies-addon-new');
  check('Try again: the shelf comes', await ev(() => document.querySelectorAll('[data-screen="movie"] .lb-p').length > 3 && /Sci-Fi/.test(document.querySelector('[data-screen="movie"] [data-head]').textContent)));
  // New: this year's titles (Cinemeta's year catalog, its genre a year)
  await ev(() => document.querySelector('[data-screen="movie"] [data-chip="new"]').focus()); await key('Enter', 1, 2500);
  const years = await ev(() => [...document.querySelectorAll('[data-screen="movie"] .lb-p')].length);
  check('New: this year\'s titles', years > 6 && await ev(() => /New/.test(document.querySelector('[data-screen="movie"] [data-head]').textContent)), years);
};
