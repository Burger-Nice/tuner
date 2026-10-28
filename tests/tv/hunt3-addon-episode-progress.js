// The owner's report: episodes watched from an add-on copy, then the show page still said Play S1 · E1. An add-on
// copy saves progress under its Cinemeta id (tt…:season:episode); the show page must count it on the provider's episode.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  await ev(() => window.__tunerTest.go('series')); await p.waitForTimeout(2000);
  const setup = await ev(async () => {
    const [CA, IM, ST, AC] = await Promise.all(['catalog', 'imdb', 'state', 'actions'].map((m) => import(`/tv/js/${m}.js`)));
    await CA.ensure('series');
    const it = CA.catalog.series.items[0];
    const t = CA.catalog.series.titleById?.get(it.id) || CA.catalog.series.titleById?.get(String(it.id)) || it;
    IM.pickMatch(t, 'tt0472954');
    const now = Date.now();
    ST.S.progress['episode:tt0472954:1:1'] = { t: 1, d: 1, at: now - 60000, item: { kind: 'episode', id: 'tt0472954:1:1', season: 1, ep: 1 }, done: true };
    ST.S.progress['episode:tt0472954:1:2'] = { t: 600, d: 1320, at: now, item: { kind: 'episode', id: 'tt0472954:1:2', season: 1, ep: 2 } };
    AC.openDetail(t);
    return t.name;
  });
  await p.waitForTimeout(4000); await shot('addon-episode-progress');
  const s = await ev(() => ({ play: document.querySelector('[data-screen="detail"] [data-act="play"]')?.innerText, done: document.querySelectorAll('[data-screen="detail"] .ep.done').length, part: document.querySelectorAll('[data-screen="detail"] .ep .prog').length }));
  check('watched from an add-on copy: the show page resumes S1 · E2, E1 ticked, E2 part-watched', /Resume S1 · E2/.test(s.play || '') && s.done >= 1 && s.part >= 1, `${setup}: ${JSON.stringify(s)}`);
};
