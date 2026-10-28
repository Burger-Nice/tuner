// Shared by the Home scripts (design/ui-v1/home-final/SPEC.md): the fake add-ons (Cinemeta, Northlight), the fake TMDB
// (tests/mock-tmdb.js) and an owner-like history on the page's clock (Wed 28 Oct 2026 20:41, Reykjavik = UTC):
// comedy series (Always Sunny 8 episodes, The Office 5, The Studio 3), anime comedy (Spy x Family, One Punch Man,
// KonoSuba), crime dramas (Breaking Bad, Narcos), three finished comedies; Severance S2 E3 part-watched (Continue
// watching) and Slow Horses up to S6 E3 (3 new episodes).
// opts: { at (ISO), key: false (no TMDB key), history: false (a first evening), addons: false (no add-ons),
//         shield, team, plays: [[slug, episodes]] (instead of the owner's), progress: false,
//         junk: true (the Shelfie catalog add-on, like the owner's: two Netflix lists, racing, basketball, a watchlist…) }
const C = require('./addons-common.js');
const T = require('../mock-tmdb.js');
const H = C.H;
const id = (slug) => T.bySlug(slug).imdb;
const OWNER = [['superbad', 1], ['sunny', 8], ['office', 5], ['lebowski', 1], ['studio', 3], ['spyxfamily', 4], ['inbruges', 1], ['onepunch', 3], ['konosuba', 2], ['breakingbad', 6], ['narcos', 2], ['slowhorses', 3]];
module.exports = async (ctx, opts = {}) => {
  const { p, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  const at = opts.at || '2026-10-28T20:41:00Z';
  await fetch(`${H}/_tmdb/reset`).catch(() => {});
  await C({ p, key }, { addons: opts.addons !== false, at });
  const plays = opts.history === false ? [] : (opts.plays || OWNER).flatMap(([slug, n], k) => {
    const x = T.bySlug(slug);
    const now = Date.parse(at);
    return Array.from({ length: n }, (_, e) => ({ imdb: x.imdb, type: x.type, name: x.name, year: x.year, season: x.type === 'series' ? ({ slowhorses: 6, sunny: 18 }[slug] || 1) : 0, episode: x.type === 'series' ? e + 1 : 0, from: 0, to: x.runtime * 60, completion: 1, at: now - (k * 2 + (n - e)) * 3600e3 * 7, source: 'test' }));
  });
  const sev = T.bySlug('severance');
  await ev(async ({ H, key, plays, sev, progress, shield, team, at, junk }) => {
    const acc = JSON.parse(localStorage.getItem('tuner.accounts') || '[]')[0];
    const pre = `a:${acc.id}:`;
    if (junk) {
      const m = await fetch(`${H}/addon/shelfie/manifest.json`).then((r) => r.json());
      const list = JSON.parse(localStorage.getItem(`tuner.${pre}addons`) || '[]').filter((a) => a.key !== 'adshelfie');
      list.push({ key: 'adshelfie', url: `${H}/addon/shelfie/manifest.json`, manifest: m, at: Date.now(), on: true, catalogs: Object.fromEntries(m.catalogs.map((c) => [`${c.type}:${c.id}`, true])), from: 'stremio', kind: {}, health: {} });
      localStorage.setItem(`tuner.${pre}addons`, JSON.stringify(list));
    }
    localStorage.setItem('tuner.tmdbBase', JSON.stringify(`${H}/tmdb/3`));
    localStorage.setItem('tuner.tmdbImg', JSON.stringify(`${H}/tmdb-img`));
    if (key) localStorage.setItem('tuner.tmdbKey', JSON.stringify('test-tmdb-token')); else localStorage.removeItem('tuner.tmdbKey');
    localStorage.removeItem('tuner.tmdbBad');
    for (const k of ['hiddenRows', 'notInterested', 'rowStats', 'rowsOff', 'picks', 'finishes', 'hfLine', 'homeHidden', 'progress', 'favs', 'favOrder']) localStorage.removeItem(`tuner.${pre}${k}`);
    localStorage.removeItem('tuner.hfHints'); localStorage.removeItem('tuner.hfKeyNote');
    localStorage.setItem(`tuner.${pre}playsFrom`, JSON.stringify(Date.now()));
    // (TMDB's and Cinemeta's answers from an earlier run are kept: drop them, so each run reads the fake servers)
    for (const k of JSON.parse(localStorage.getItem('tuner.tmdbIx') || '[]')) await window.Core.cache.set(k, null);
    localStorage.removeItem('tuner.tmdbIx'); localStorage.removeItem('tuner.tmdbImdb');
    for (const k of JSON.parse(localStorage.getItem('tuner.adCatIx') || '[]')) await window.Core.cache.set(k, null);
    for (const k of JSON.parse(localStorage.getItem('tuner.adMetaIx') || '[]')) await window.Core.cache.set(k, null);
    localStorage.removeItem('tuner.adCatIx'); localStorage.removeItem('tuner.adMetaIx');
    await window.Core.cache.set(`${pre}plays`, plays);
    await window.Core.cache.set(`${pre}homePage`, null);
    if (progress) {
      const now = Date.parse(at);
      const it = { kind: 'episode', id: `${sev.imdb}:2:3`, name: 'Who Is Alive?', season: 2, ep: 3, seriesId: sev.imdb, seriesName: 'Severance', imdbSeries: sev.imdb, poster: `${H}/tmdb-img/original/severance-bg.jpg`, year: '2022',
        copy: { source: 'Northlight', addonKey: 'x', key: 'cp:x:sev', binge: 'northlight|1080p|web', kind: 'series', tkey: sev.imdb, tid: sev.imdb, title: 'Severance', runtime: 3000 } };
      localStorage.setItem(`tuner.${pre}progress`, JSON.stringify({ [`episode:${it.id}`]: { t: 1740, d: 3000, at: now - 3600e3, item: it } }));
    }
    const s = JSON.parse(localStorage.getItem('tuner.settings') || '{}');
    s.shield = shield || 'mine'; s.nbaTeam = team || 'MEM';
    localStorage.setItem('tuner.settings', JSON.stringify(s));
  }, { H, key: opts.key !== false, plays, sev: { imdb: sev.imdb }, progress: opts.progress !== false && opts.history !== false, shield: opts.shield, team: opts.team, at, junk: !!opts.junk });
  await p.reload(); await p.waitForTimeout(4500);
};
module.exports.id = id;
module.exports.T = T;
module.exports.H = H;
// What Home shows, as text
module.exports.lineup = (p) => p.evaluate(() => [...document.querySelectorAll('[data-screen="home"] .hf-e')].map((e) => `${e.classList.contains('on') ? '*' : ' '}${e.querySelector(e.classList.contains('on') ? '.cd' : '.t').innerText.replace(/\s+/g, ' ').trim()}`));
module.exports.rowsNow = (p) => p.evaluate(() => [...document.querySelectorAll('[data-screen="home"] .hf-row')].map((r) => r.querySelector('.rt').innerText.replace(/\s+/g, ' ').trim()));
module.exports.index = (p) => p.evaluate(() => document.querySelector('[data-screen="home"] .hf-index')?.innerText.replace(/\n/g, ' | ') || '');
module.exports.column = (p) => p.evaluate(() => document.querySelector('[data-screen="home"] .hf-col')?.innerText.replace(/\s+/g, ' ').trim() || '');
module.exports.focusKey = (p) => p.evaluate(() => document.activeElement?.dataset?.key || document.activeElement?.dataset?.tab || document.activeElement?.className || '');
module.exports.waitRows = async (p, n = 3, ms = 20000) => { for (let t = 0; t < ms; t += 500) { const k = await p.evaluate(() => document.querySelectorAll('[data-screen="home"] .hf-row').length); if (k >= n) return k; await p.waitForTimeout(500); } return 0; };
module.exports.hold = C.hold;
module.exports.check = C.check;
