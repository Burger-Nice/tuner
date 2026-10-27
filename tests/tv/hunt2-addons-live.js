// Bug hunt (live-update tour): the Copies menu redraws when a slow add-on answers. Focus on a row without a copy key
// (Watch in another app, Trailer, Which film is this?) jumps to "Always the best copy".
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check, where } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(2500);
  const open = (name, year) => ev(async ({ name, year }) => { const a = await import('/tv/js/actions.js'), c = await import('/tv/js/catalog.js'); a.openDetail(c.catalog.movie.titles.find((x) => x.name === name && +x.year === year)); }, { name, year });
  // A. The Long Night: Kestrel answers after 6 s
  await open('The Long Night', 2000); await p.waitForTimeout(1200);
  await key('ArrowDown', 1, 250); await key('Enter', 1, 600);
  for (let i = 0; i < 12; i++) { if (/Trailer/.test(await where(p))) break; await key('ArrowDown', 1, 100); }
  const was = await where(p); await shot('copies-on-trailer');
  await p.waitForTimeout(6500); await shot('copies-after-kestrel');
  const now = await where(p);
  check('focus stays on Trailer when Kestrel answers', /Trailer/.test(now), `was ${was} · now ${now}`);
  await key('Escape', 1, 500); await key('Escape', 1, 600);
  // B. Northern Lights (Likely): Kestrel times out after 10 s
  await ev(async () => { (await import('/tv/js/addons.js')).forgetStreams('movie', 'tt9000002'); });
  await open('Northern Lights', 2001); await p.waitForTimeout(1200);
  await key('ArrowDown', 1, 250); await key('Enter', 1, 600);
  for (let i = 0; i < 12; i++) { if (/Which film/.test(await where(p))) break; await key('ArrowDown', 1, 100); }
  const was2 = await where(p);
  await p.waitForTimeout(10500); await shot('copies-after-timeout');
  const now2 = await where(p);
  check('focus stays on Which film is this? when Kestrel times out', /Which film/.test(now2), `was ${was2} · now ${now2}`);
};
