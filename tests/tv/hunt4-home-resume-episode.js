// The owner's report: OK on Continue watching (Home) didn't start an add-on episode. An add-on-only series' episode
// with progress, then OK on the Marquee's Continue line and on the Continue watching card: the player is handed a copy.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  const made = await ev(async () => {
    const [T, ST, AD] = await Promise.all(['titlecopies', 'state', 'addons'].map((m) => import(`/tv/js/${m}.js`)));
    const m = (await (await fetch('http://127.0.0.1:8899/addon/cinemeta/catalog/series/top.json')).json()).metas.find((x) => /^tt95/.test(x.id));
    const imdb = m.id;
    const q = AD.askStreams('series', `${imdb}:1:2`, { match: 'sure' }); await q.done;
    const c = AD.copiesOf(q)[0];
    const t = { kind: 'series', key: imdb, id: imdb, name: m.name, poster: m.poster, year: m.year, versions: [], addon: { type: 'series' } };
    const it = T.addonItem(t, Object.assign(c, { providerLenSec: 2700 }), { match: { id: imdb, level: 'sure' } }, { vid: { id: `${imdb}:1:2` }, season: 1, ep: 2, name: 'Episode 2' });
    ST.recordProgress(it, 900, 2700, true);
    return { name: m.name, imdb, copy: !!c };
  });
  console.log('recorded', JSON.stringify(made));
  await p.reload(); await p.waitForTimeout(4000);
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(3000);
  await shot('home');
  const lit = await ev(() => document.activeElement?.innerText?.slice(0, 80));
  console.log('focus on Home:', JSON.stringify(lit));
  await key('ArrowDown', 1, 900);   // (a game night: the game is line 1, Continue line 2)
  console.log('lit:', JSON.stringify(await ev(() => document.activeElement?.innerText?.slice(0, 60))));
  await ev(() => { window.__lastVod = null; });
  await key('Enter', 1, 100);
  for (let i = 0; i < 80 && !(await ev(() => !!window.__lastVod)); i++) await p.waitForTimeout(100);
  const a = await ev(() => (window.__lastVod || [])[0] || null);
  check('OK on the Marquee\'s first line (Continue) plays the episode', !!a, JSON.stringify(a && { title: a.title, sub: a.sub, startAt: a.startAt }));
  await shot('after-marquee-ok');
  // the Continue watching card in the rows
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(2000);
  const card = await ev((n) => { const c = [...document.querySelectorAll('[data-screen="home"] .fx')].find((x) => x.closest('[data-row]') && x.textContent.includes(n) && /E2|S1/.test(x.textContent + (x.getAttribute('aria-label') || ''))) || [...document.querySelectorAll('[data-screen="home"] [data-row] .fx')].find((x) => x.textContent.includes(n)); return c ? (c.focus(), c.textContent.slice(0, 60)) : ''; }, made.name);
  console.log('card:', card);
  await ev(() => { window.__lastVod = null; });
  await key('Enter', 1, 100);
  for (let i = 0; i < 80 && !(await ev(() => !!window.__lastVod)); i++) await p.waitForTimeout(100);
  const b = await ev(() => (window.__lastVod || [])[0] || null);
  check('OK on the Continue watching card plays the episode', !!b, JSON.stringify(b && { title: b.title, sub: b.sub }));
  await shot('after-card-ok');
};
