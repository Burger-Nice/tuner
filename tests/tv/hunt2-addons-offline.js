// Bug hunt (bad network): the TV's own internet drops for a minute while he opens three title pages. Every add-on
// counts 3 failures and becomes "Not answering" for 30 minutes, so when the internet is back, no add-on is asked
// (not even with Look again).
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(2500);
  const open = (name) => ev(async (name) => { const a = await import('/tv/js/actions.js'), c = await import('/tv/js/catalog.js'); a.openDetail(c.catalog.movie.titles.find((x) => x.name === name)); }, name);
  // the internet drops (every add-on request fails to connect)
  await p.route(/127\.0\.0\.1:8899\/addon\//, (r) => r.abort('internetdisconnected'));
  for (const n of ['The Long Night', 'Northern Lights', 'Glacier']) { await ev(async () => { const A = await import('/tv/js/addons.js'); A.forgetStreams('movie', 'tt9000001'); A.forgetStreams('movie', 'tt9000002'); }); await open(n); await p.waitForTimeout(1500); await key('Escape', 1, 400); }
  // and comes back
  await p.unroute(/127\.0\.0\.1:8899\/addon\//);
  console.log(await ev(async () => { const A = await import('/tv/js/addons.js'); return A.addons().map((a) => `${a.manifest.name}: ${A.STATE_WORDS[A.stateOf(a)]} ${A.healthLine(a)}`).join('\n'); }));
  await ev(async () => { const A = await import('/tv/js/addons.js'); A.forgetStreams('movie', 'tt9000001'); });
  await open('The Long Night'); await p.waitForTimeout(3000); await shot('back-online');
  const pill = await ev(() => document.querySelector('[data-screen="detail"] [data-act="version"]')?.innerText.replace(/\s+/g, ' ') || '(no pill)');
  check('internet back: Northlight\'s copies are on the page again', /Northlight/.test(pill), pill);
};
