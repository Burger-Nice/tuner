// Bug hunt (S10): with no add-on that gives copies switched on (Northlight and Kestrel off; WatchHub, which only links
// to other apps, and Public Domain Movies, torrents only, still on), Cinemeta's Popular chip still shows every title,
// not "only titles your provider has"; its add-on-only titles then have no copy to play.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  // WatchHub and PDM have answered before (their kind is learnt): other apps / torrents only
  await ev(async () => { const A = await import('/tv/js/addons.js'); for (const a of A.addons()) { if (/Northlight|Kestrel/.test(a.manifest.name)) A.setOn(a, false); if (a.manifest.name === 'WatchHub') a.kind = { n: 5, e: 5 }; if (/Public Domain/.test(a.manifest.name)) a.kind = { n: 25, t: 25 }; } A.setOn(A.addons()[0], true); });
  console.log(await ev(async () => { const A = await import('/tv/js/addons.js'); return A.addons().map((a) => `${a.manifest.name}: ${A.STATE_WORDS[A.stateOf(a)]} · ${A.givesLine(a)}`).join('\n'); }));
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(2500);
  await ev(() => { const c = [...document.querySelectorAll('[data-screen="movie"] .lib-chips .chip')].find((x) => x.textContent === 'PopularCinemeta'); c.focus(); c.click(); });
  await p.waitForTimeout(2500); await shot('popular-no-copies');
  const head = await ev(() => document.querySelector('[data-screen="movie"] [data-head]').innerText.replace(/\s+/g, ' '));
  const n = await ev(() => document.querySelectorAll('[data-screen="movie"] .pc').length);
  check('caption: only titles your provider has', /only titles your provider has/.test(head), `${head.slice(0, 100)} · ${n} posters`);
};
