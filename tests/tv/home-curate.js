// Home's rows curated (the owner's first-day report, items 7-9 and 11): with his kind of add-on catalogs (two Netflix
// lists, Formula racing, Basketball, Live events, an add-on's "Popular" that is Cinemeta's again, a "TRB watchlist", a
// list with posterless and non-IMDb entries): no two rows with one name, no sports or event rows, his watchlist named
// for what it is, every poster has its art, TMDB's lists lead (trending, a service once each, his decade…) and the
// add-ons' lists are extras; without a key the rows are curated the same way. The Channels row's text never collides.
// Run: node tests/tv/drive.js <out> home-curate
const HC = require('./home-common.js');
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const { check } = HC;
  const ev = (f, a) => p.evaluate(f, a);
  const norm = (n) => n.toLowerCase().replace(/\bthe\b/g, '').replace(/[^a-z0-9]+/g, '');
  const look = async (label) => {
    await ev(() => window.__tunerTest.go('home')); await HC.waitRows(p, 8); await p.waitForTimeout(2500);
    const pg = await ev(async () => { const R = await import('/tv/js/rows.js'); const g = R.pageNow(); return { rows: g.rows.map((r) => ({ id: r.id, kind: r.kind, name: r.name || '', n: r.items?.length || 0, posters: (r.items || []).every((x) => x.poster), items: (r.items || []).map((x) => x.imdb || x.id) })), src: g.src }; });
    const names = pg.rows.filter((r) => r.name).map((r) => r.name);
    console.log(label, names.join(' · '));
    check(`${label}: no two rows with the same name`, new Set(names.map(norm)).size === names.length, names.join(', '));
    check(`${label}: no sports, racing, events or odd lists`, !names.some((x) => /formula|racing|basketball|live events|event|mixed bag|grand prix/i.test(x)));
    check(`${label}: no add-on's internal list names (TRB)`, !names.some((x) => /\bTRB\b/.test(x)));
    check(`${label}: every title in a row has a poster`, pg.rows.every((r) => r.posters));
    const sv = names.filter((x) => /^(New on|On) /.test(x)).map((x) => x.replace(/^(New on|On) /, ''));
    check(`${label}: a streaming service once`, new Set(sv).size === sv.length, sv.join(', '));
    const ids = pg.rows.filter((r) => r.kind !== 'addon' || !/Stremio/.test(r.name)).flatMap((r) => r.items);
    check(`${label}: a title in one row only (his own lists aside)`, ids.length === new Set(ids).size);
    check(`${label}: the add-ons' lists are extras (2 at most with a key, 4 without)`, pg.rows.filter((r) => r.kind === 'addon' && !/Stremio/.test(r.name)).length <= (pg.src.key ? 2 : 4));
    return { pg, names };
  };
  await HC(ctx, { junk: true });
  await ev(() => { const acc = JSON.parse(localStorage.getItem('tuner.accounts'))[0]; localStorage.setItem(`tuner.a:${acc.id}:recents`, JSON.stringify(['1000', '1005', '1001', '1003', '1006', '1007', '1008'])); });
  await p.reload(); await p.waitForTimeout(4000);
  const k = await look('with a key');
  check('with a key: Trending this week', k.names.includes('Trending this week'));
  check('with a key: New on a streaming service', k.names.some((x) => /^New on /.test(x)));
  check('with a key: a decade row', k.names.some((x) => /^From the /.test(x)));
  check('with a key: most rows are TMDB\'s', k.pg.src.tmdb >= Math.ceil(k.pg.src.rows / 2), JSON.stringify(k.pg.src));
  check('with a key: In Icelandic (not Á íslensku)', k.names.includes('In Icelandic') && !k.names.some((x) => /íslensku/.test(x)));
  check('with a key: 12 to 20 rows', k.pg.rows.length >= 12 && k.pg.rows.length <= 20, k.pg.rows.length);
  await ev(() => window.__tunerTest.go('account', { group: 'provider' })); await p.waitForTimeout(800);
  const acct = await ev(() => document.querySelector('[data-screen="account"]').innerText.replace(/\s+/g, ' '));
  check('Account > Provider says TMDB is working and how many rows it made', /TMDB: working · \d+ of \d+ Home rows from TMDB/.test(acct), (acct.match(/TMDB:[^·]*·[^·]*/) || [''])[0]);
  // the Channels row: names and programmes stay inside their cards
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(1500);
  await key('PageDown', 1, 1200);
  for (let i = 0; i < 25; i++) { if (/^ch:/.test(await HC.focusKey(p))) break; await key('ArrowDown', 1, 300); }
  await p.waitForTimeout(600);
  const ch = await ev(() => [...document.querySelectorAll('[data-screen="home"] .hf-w.chn:not(.pk)')].map((c) => { const b = c.getBoundingClientRect(); const parts = [...c.querySelectorAll('.ln,.u,.n,.tile')].map((x) => x.getBoundingClientRect()); const over = parts.some((r) => r.right > b.right + 1 || r.left < b.left - 1); const ln = c.querySelector('.ln').getBoundingClientRect(), u = c.querySelector('.u').getBoundingClientRect(); return { over, clash: ln.bottom > u.top + 1, txt: c.innerText.replace(/\s+/g, ' ') }; }));
  check('Channels: every card\'s text inside its card, no lines over each other', ch.length >= 3 && ch.every((c) => !c.over && !c.clash), JSON.stringify(ch.slice(0, 3)));
  await shot('channels');
  // without a key: the same curation over Cinemeta's lists and the add-ons'
  await HC(ctx, { junk: true, key: false });
  const n = await look('without a key');
  check('without a key: his watchlist, named for what it is', n.names.includes('Your Stremio watchlist'), n.names.join(', '));
  check('without a key: at least 8 rows', n.pg.rows.length >= 8, n.pg.rows.length);
};
