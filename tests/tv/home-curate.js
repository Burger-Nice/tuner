// Home's rows curated (the owner's first-day report, items 7-9 and 11): with his kind of add-on catalogs (two Netflix
// lists, Formula racing, Basketball, Live events, an add-on's "Popular" that is Cinemeta's again, a "TRB watchlist", a
// list with posterless and non-IMDb entries): no two rows with one name, no sports or event rows, his watchlist named
// for what it is, every poster has its art, TMDB's lists lead (trending, a service once each, his decade…) and the
// add-ons' lists are off on Home at first (the owner's choice: his Stremio watchlist and an Icelandic list stay, the
// Icelandic one inside In Icelandic); without a key the rows are curated the same way. An older version's page is never
// shown; a slow TMDB still makes most rows; the switches in Account > Home rows change the page. The Channels row's text
// never collides.
// Run: node tests/tv/drive.js <out> home-curate
const HC = require('./home-common.js');
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const { check } = HC;
  const ev = (f, a) => p.evaluate(f, a);
  const norm = (n) => n.toLowerCase().replace(/\bthe\b/g, '').replace(/[^a-z0-9]+/g, '');
  // the page worked out (not a preview, not building), up to 90 s
  const pageDone = async () => { for (let t = 0; t < 90000; t += 500) { if (await ev(async () => { const R = await import('/tv/js/rows.js'); const g = R.pageNow(); return !!(g && !g.preview && g.src && !R.isBuilding()); })) return true; await p.waitForTimeout(500); } return false; };
  const look = async (label) => {
    await ev(() => window.__tunerTest.go('home')); await HC.waitRows(p, 8);
    await pageDone(); await p.waitForTimeout(1500);
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
  // an older version's page kept from today (an update): never shown, the new one is worked out at once; and a slow TMDB
  // (every answer 700 ms late, a TV over a real network): its rows still make the page
  await ev(async () => { const acc = JSON.parse(localStorage.getItem('tuner.accounts'))[0]; localStorage.setItem(`tuner.a:${acc.id}:recents`, JSON.stringify(['1000', '1005', '1001', '1003', '1006', '1007', '1008']));
    const R = await import('/tv/js/rows.js');
    await window.Core.cache.set(`a:${acc.id}:homePage`, { acc: acc.id, day: R.dayNo(), at: Date.now(), sig: 'k|a|0|||9', rows: [{ id: 'addon:old', kind: 'addon', type: 'poster', name: 'Formula racing', reason: 'From your add-ons', items: [{ kind: 'movie', id: 'tt9500000', imdb: 'tt9500000', name: 'Grand Prix 1', year: 2026, poster: 'x.jpg', genres: [] }] }] }); });
  await fetch(`${HC.H}/_tmdb/slow?ms=700`);
  await p.reload(); await p.waitForTimeout(4000);
  const k = await look('with a key');
  await fetch(`${HC.H}/_tmdb/slow?ms=0`);
  check('an older version\'s page is not shown after an update', !k.names.includes('Formula racing'));
  check('a slow TMDB (700 ms an answer): most rows are still TMDB\'s', k.pg.src.tmdb >= Math.ceil(k.pg.src.rows / 2), JSON.stringify(k.pg.src));
  check('the add-ons\' own lists are off on Home at first', !k.pg.rows.some((r) => r.kind === 'addon' && !/Stremio/.test(r.name)), k.names.join(', '));
  check('his Stremio watchlist stays, as one row', k.names.filter((x) => /Stremio/.test(x)).length === 1 && k.names.includes('Your Stremio watchlist'), k.names.filter((x) => /Stremio/.test(x)).join());
  const isl = k.pg.rows.filter((r) => r.kind === 'iceland');
  const islA = await ev(async (H) => (await fetch(`${H}/addon/shelfie/catalog/series/isl.json`).then((r) => r.json())).metas.map((m) => m.id), HC.H);
  const ii = isl[0]?.items || [], lastA = Math.max(...ii.map((x, i) => (islA.includes(x) ? i : -1))), firstT = ii.findIndex((x) => !islA.includes(x));
  check('one In Icelandic row: the add-on\'s Icelandic list first, then TMDB\'s', isl.length === 1 && ii.some((x) => islA.includes(x)) && (firstT < 0 || lastA < firstT), `${isl.length} rows, ${ii.length} titles, add-on's up to ${lastA}, TMDB's from ${firstT}`);
  // Account > Home rows switches do something on the page
  const toggled = async (kind, on) => { await ev(async ([kind, on]) => { const R = await import('/tv/js/rows.js'); R.setRowOn(kind, on); }, [kind, on]); await p.waitForTimeout(300); await pageDone(); return ev(async () => { const R = await import('/tv/js/rows.js'); const g = R.pageNow(); return [...g.rows.map((r) => ({ kind: r.kind, name: r.name || '' })), ...(g.dropped || []).filter((d) => /^addon:/.test(d[0]) && !/Stremio|p:/.test(d[0])).map((d) => ({ kind: 'addon', name: `${d[0]} (left out: ${d[1]})`, out: true }))]; }); };
  let t = await toggled('addon', true);
  check('Lists from your add-ons on: their lists are in the running again (2 rows at most)', t.filter((r) => r.kind === 'addon' && !/Stremio/.test(r.name)).length >= 1 && t.filter((r) => r.kind === 'addon' && !r.out && !/Stremio/.test(r.name)).length <= 2, t.filter((r) => r.kind === 'addon').map((r) => r.name).join());
  t = await toggled('addon', false);
  check('… and off again: gone', !t.some((r) => r.kind === 'addon' && !/Stremio/.test(r.name)));
  t = await toggled('trending', false);
  check('Trending this week off: gone', !t.some((r) => r.name === 'Trending this week'));
  t = await toggled('trending', true);
  check('… and on again: back', t.some((r) => r.name === 'Trending this week'));
  await ev(() => window.__tunerTest.go('account', { group: 'home' })); await p.waitForTimeout(800);
  const hr = await ev(() => document.querySelector('[data-screen="account"]').innerText.replace(/\s+/g, ' '));
  check('Account > Home rows: Refresh, with when and from what', /Refresh Home rows .*Worked out at \d\d:\d\d.* \d+ rows, \d+ from TMDB/.test(hr), (hr.match(/Refresh Home rows.{0,80}/) || [''])[0]);
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
