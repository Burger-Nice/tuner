// Bug hunt (bad network): Cinemeta doesn't answer the first time a title page opens. The IMDb match falls back to
// "Likely" (the TMDB check needs Cinemeta) and that answer is kept for 7 days: when Cinemeta is back, the add-on copies
// still sit under "might be another film" and Play waits and then plays the provider's copy.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(2500);
  const open = () => ev(async () => { const a = await import('/tv/js/actions.js'), c = await import('/tv/js/catalog.js'); a.openDetail(c.catalog.movie.titles.find((x) => x.name === 'The Long Night')); });
  const saved = () => ev(() => { const k = Object.keys(localStorage).find((x) => x.endsWith(':imdb')); return k ? JSON.stringify(Object.entries(JSON.parse(localStorage.getItem(k))).find(([kk]) => /long/i.test(kk) || true)) : '(none)'; });
  const pill = () => ev(() => document.querySelector('[data-screen="detail"] [data-act="version"]')?.innerText.replace(/\s+/g, ' ') || '(no pill)');
  await p.route(/\/addon\/cinemeta\/meta\//, (r) => r.abort('timedout'));
  await open(); await p.waitForTimeout(3000); await shot('cinemeta-down');
  console.log('Cinemeta down: pill', await pill(), '· saved', await saved());
  await key('Escape', 1, 500);
  await p.unroute(/\/addon\/cinemeta\/meta\//);
  await p.reload(); await p.waitForTimeout(4000);
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(2000);
  await open(); await p.waitForTimeout(3000); await shot('cinemeta-back');
  const pl = await pill();
  console.log('Cinemeta back (after a restart): pill', pl, '· saved', await saved());
  check('Cinemeta back: Sure again, Northlight\'s 4K is the best copy', /Northlight/.test(pl), pl);
};
