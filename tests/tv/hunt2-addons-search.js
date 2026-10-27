// Bug hunt: Search's From add-ons block. A title whose add-on id has a colon (kitsu:44042, tmdb:603: Kitsu, TMDB
// add-ons) can't be opened; Cinemeta slow (the caption), Cinemeta failing.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check, where } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  await p.route(/\/addon\/cinemeta\/catalog\/series\/top\/search=hai/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ metas: [{ id: 'kitsu:44042', type: 'series', name: 'Haikyu!!', releaseInfo: '2014', poster: '' }] }) }));
  await p.route(/\/addon\/cinemeta\/catalog\/movie\/top\/search=hai/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ metas: [{ id: 'tmdb:603', type: 'movie', name: 'Haiku Matrix', releaseInfo: '1999', poster: '' }] }) }));
  await ev(() => window.__tunerTest.go('search')); await p.waitForTimeout(1200);
  for (const ch of 'HAI') { await ev((ch) => document.querySelector(`[data-screen="search"] [data-key="${ch}"]`).click(), ch); await p.waitForTimeout(80); }
  await p.waitForTimeout(2500); await shot('search-hai');
  const rows = await ev(() => [...document.querySelectorAll('[data-screen="search"] [data-res^="a:"]')].map((r) => r.dataset.res + ' ' + r.innerText.replace(/\s+/g, ' ')));
  console.log(rows.join('\n'));
  for (const res of ['a:series:kitsu:44042', 'a:movie:tmdb:603']) {
    await ev((res) => document.querySelector(`[data-screen="search"] [data-res="${res}"]`)?.focus(), res);
    const before = await ev(() => window.__tunerTest.state().screen);
    await key('Enter', 1, 1500);
    const after = await ev(() => window.__tunerTest.state().screen);
    check(`OK on ${res} opens its page`, after === 'detail', `${before} -> ${after}`);
    if (after === 'detail') { await shot('detail-' + res.split(':')[2]); await key('Escape', 1, 800); }
  }
};
