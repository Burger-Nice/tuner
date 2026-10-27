// Bug hunt: a series only add-ons have (Dune Prophecy, from Cinemeta's Popular series chip): its page, seasons,
// episodes, Play, Back.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check, where } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  await ev(() => window.__tunerTest.go('series')); await p.waitForTimeout(2500);
  await ev(async () => { const a = await import('/tv/js/actions.js'); a.openDetail({ kind: 'series', key: 'tt9000013', id: 'tt9000013', name: 'Dune Prophecy', year: '2024', versions: [], _qs: new Set(), _langs: new Set(), _genres: [], addon: { type: 'series' } }); });
  await p.waitForTimeout(3500); await shot('addon-series');
  const s = await ev(() => ({ play: document.querySelector('[data-screen="detail"] [data-act="play"], [data-screen="detail"] [data-act="wait"]')?.innerText, eps: document.querySelectorAll('[data-screen="detail"] .ep').length, chips: [...document.querySelectorAll('[data-screen="detail"] [data-season]')].map((c) => c.textContent).join(','), syn: document.querySelector('[data-screen="detail"] .epsyn')?.innerText }));
  console.log(JSON.stringify(s));
  console.log('focus:', await where(p));
  await ev(() => { window.__lastVod = null; });
  await key('Enter', 1, 3000);
  const v = await ev(() => (window.__lastVod || [])[0] || null);
  check('Play on an add-on-only series plays an episode', !!v, v ? `${v.id} ${v.source}` : 'nothing played · ' + await where(p));
};
