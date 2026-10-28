// Home's browsing rows (design/ui-v1/home-final/SPEC.md 0.2-0.6, 3, 4, 6, 12; mocks 02, 03, 09, 10): P− from the
// Marquee lands on row 1 (Comedy for you, its reason naming the shows he watches); the index names the rows in order
// and the row that peeks is its next name; every row has a reason; a title is in one row only; the blend row (Anime
// comedy, "Two things you watch, together"); Because you watched; Your shows (wide cards); the NBA row; Hold OK's menu
// with Why this row? and Hide this row; Not interested; OK opens the title's page and Back returns to the card; See all
// opens the shelf; Back goes to row 1 first, then the Marquee; P+ goes to the Marquee; the safe area of every card kind;
// the node count.
// Run: node tests/tv/drive.js <out> home-rows
const HC = require('./home-common.js');
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const { check } = HC;
  const ev = (f, a) => p.evaluate(f, a);
  await HC(ctx, {});
  await ev(() => window.__tunerTest.go('home')); await HC.waitRows(p, 8); await p.waitForTimeout(1200);
  const page = await ev(async () => { const R = await import('/tv/js/rows.js'); const pg = R.pageNow(); return { rows: pg.rows.map((r) => ({ id: r.id, name: r.name, reason: r.reason, n: r.items?.length || 0, items: (r.items || []).map((x) => x.imdb || `${x.kind}|${x.name}|${x.year}`) })), dropped: pg.dropped }; });
  console.log(page.rows.map((r) => `${r.id} ${r.name || ''} (${r.n})`).join('\n'));
  // P−: the rows, on row 1
  await key('PageDown', 1, 1500);
  const shown = await ev(() => [...document.querySelectorAll('[data-screen="home"] .hf-row')].map((r) => r.querySelector('.rt').childNodes[0].textContent.trim()));
  check('P−: row 1 is Comedy for you', /^t:/.test(await HC.focusKey(p)) && shown[0] === 'Comedy for you', shown[0]);
  const rt0 = await ev(() => document.querySelector('[data-screen="home"] .hf-row.cur .rt').innerText.replace(/\s+/g, ' '));
  check('its reason names the shows he watches', /Comedy for you Because you watch .+(, .+ and \d+ more| and .+)$/.test(rt0), rt0);
  check('12 to 20 rows', shown.length >= 12 && shown.length <= 20, shown.length);
  check('every row has a reason line', await ev(() => [...document.querySelectorAll('[data-screen="home"] .hf-row .rt')].every((r) => r.querySelector('span:last-child')?.textContent.trim())));
  const all = page.rows.flatMap((r) => r.items);
  check('a title in one row only', all.length === new Set(all).size, `${all.length} titles`);
  check('a blend row: Anime comedy', shown.includes('Anime comedy'));
  check('Because you watched …', shown.some((x) => /^Because you watched /.test(x)), shown.filter((x) => /^Because/.test(x)).join());
  check('Your shows, Tonight in the NBA, Channels never dropped (when they have something)', shown.includes('Your shows') && shown.includes('Tonight in the NBA') && shown[shown.length - 1] === 'Browse your library');
  check('the NBA row is row 2 on a game day', shown[1] === 'Tonight in the NBA');
  check('no source names in the rows\' titles and reasons', !(await ev(() => /Cinemeta|TMDB/.test(document.querySelector('[data-screen="home"] .hf-stack').textContent))));
  // the index and the peek, row by row
  let okIdx = true, okPeek = true, okCol = true;
  const nodes0 = await ev(() => document.querySelectorAll('[data-screen="home"] *').length);
  for (let i = 0; i < shown.length; i++) {
    const st = await ev(() => {
      const ix = [...document.querySelectorAll('[data-screen="home"] .hf-index span')].map((x) => x.textContent);
      const cur = document.querySelector('[data-screen="home"] .hf-index .cur')?.textContent;
      const rows = [...document.querySelectorAll('[data-screen="home"] .hf-row')], ci = rows.findIndex((r) => r.classList.contains('cur'));
      const nx = rows[ci + 1]?.querySelector('.rt').childNodes[0].textContent.trim() || null;
      const ixNext = ix[ix.indexOf(cur) + 1];
      return { cur, me: rows[ci]?.querySelector('.rt').childNodes[0].textContent.trim(), nx, ixNext, col: document.querySelector('[data-screen="home"] .hf-col').innerText.trim() };
    });
    if (st.cur !== st.me) okIdx = false;
    if (st.nx && st.ixNext && !/more$/.test(st.ixNext) && st.nx !== st.ixNext) okPeek = false;
    if (!st.col) okCol = false;
    if (i === 0) await shot('rows-1');
    if (st.me === 'Anime comedy') await shot('rows-blend');
    if (st.me === 'Your shows') await shot('rows-yourshows');
    if (st.me === 'Tonight in the NBA') await shot('rows-nba');
    if (i < shown.length - 1) await key('ArrowDown', 1, 450);
  }
  check('the index marks the row he is on', okIdx);
  check('the row that peeks is the index\'s next name', okPeek);
  check('the column answers every row', okCol);
  const nodes = await ev(() => document.querySelectorAll('[data-screen="home"] *').length);
  check('node count under 400 on the page (rows near the focus only)', nodes < 400 && nodes0 < 400, `${nodes0} / ${nodes}`);
  check('the end: End of Home · P+ Back to the top', await ev(() => /End of Home\s*P\+\s*Back to the top/.test(document.querySelector('[data-screen="home"] .hf-end.nx')?.innerText || '')));
  await shot('rows-end');
  // Back: row 1 first, then the Marquee's first line, then the tab
  await key('Escape', 1, 900);
  check('Back from a deeper row: row 1', /Comedy for you/.test(await ev(() => document.querySelector('[data-screen="home"] .hf-index .cur')?.textContent)) && /^t:/.test(await HC.focusKey(p)));
  await key('Escape', 1, 900);
  check('Back from row 1: the Marquee, its first line', (await HC.focusKey(p)) === 'line:game', await HC.focusKey(p));
  await key('Escape', 1, 600);
  check('Back from the Marquee: the Home tab', (await HC.focusKey(p)) === 'home', await HC.focusKey(p));
  await key('ArrowDown', 1, 600);
  // P−, then into the blend row: its reason
  await key('PageDown', 1, 1200);
  for (let i = 0; i < shown.indexOf('Anime comedy'); i++) await key('ArrowDown', 1, 350);
  const blend = await ev(() => document.querySelector('[data-screen="home"] .hf-row.cur .rt').innerText.replace(/\s+/g, ' '));
  check('the blend: Two things you watch, together · comedy + anime', /^Anime comedy.*Two things you watch, together · comedy \+ anime/.test(blend), blend);
  const col = await HC.column(p);
  check('the blend\'s titles are anime (Japanese) comedies', /Animation|Anime|Comedy/.test(col) && /Japan/.test(col), col);
  // Hold OK: Play now · Save · Details · Not interested · Why this row? · Hide this row
  await HC.hold(p);
  const menu = await ev(() => [...document.querySelectorAll('.ctxmenu .lr')].map((r) => r.textContent).join(' | '));
  check('Hold: Play now · Save · Details · Not interested · Why this row? · Hide this row', menu === 'Play now | Save | Details | Not interested | Why this row? | Hide this row', menu);
  for (let i = 0; i < 4; i++) await key('ArrowDown', 1, 150);
  await key('Enter', 1, 900);
  const why = await ev(() => document.querySelector('#overlays .hf-why')?.innerText.replace(/\s+/g, ' ') || '');
  check('Why this row?: the share and the titles behind it', /Anime comedy/.test(why) && /\d+ % of what you watch is comedy and anime/.test(why) && /Spy x Family/.test(why), why);
  await shot('rows-why');
  await key('Escape', 1, 500);
  // Not interested: out of the rows from the next page
  const first = await HC.focusKey(p);
  await HC.hold(p); for (let i = 0; i < 3; i++) await key('ArrowDown', 1, 150); await key('Enter', 1, 700);
  const ni = await ev(() => Object.keys(JSON.parse(localStorage.getItem(`tuner.a:${JSON.parse(localStorage.getItem('tuner.accounts'))[0].id}:notInterested`) || '{}')).length);
  check('Not interested is kept (30 days)', ni >= 1, first);
  // OK on a poster: the title's page; Back returns to the same card
  await key('ArrowRight', 1, 400);
  const k1 = await HC.focusKey(p);
  await key('Enter', 1, 2500);
  check('OK on a poster opens its page', await ev(() => window.__tunerTest.state().screen === 'detail'));
  await shot('rows-detail');
  await key('Escape', 1, 1500);
  check('Back returns to the same card', (await HC.focusKey(p)) === k1, `${k1} vs ${await HC.focusKey(p)}`);
  // Hide this row: gone from Home on the next visit; Account > Home rows lists it under Hidden
  await HC.hold(p); for (let i = 0; i < 5; i++) await key('ArrowDown', 1, 150); await key('Enter', 1, 700);
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(2500);
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(3500);
  const after = await ev(() => [...document.querySelectorAll('[data-screen="home"] .hf-row')].map((r) => r.querySelector('.rt').childNodes[0].textContent.trim()));
  check('Hide this row: the row is gone on the next visit', !after.includes('Anime comedy'), after.join(', '));
  await ev(() => window.__tunerTest.go('account', { group: 'home' })); await p.waitForTimeout(1000);
  check('Account > Home rows lists it under Hidden', await ev(() => /Hidden[\s\S]*Anime comedy[\s\S]*Show again/i.test(document.querySelector('[data-screen="account"]').innerText)));
  await shot('account-home-rows');
  // the wide and game rows: their first card's ring inside x 48
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(2000);
  await key('PageDown', 1, 1200);
  const rings = {};
  for (let i = 0; i < after.length; i++) {
    const r = await ev(() => { const a = document.activeElement, b = a.getBoundingClientRect(); const t = a.closest('.hf-row').className.split(' ')[1]; return { t, l: b.left - 5, r: b.right + 5 }; });
    if (!rings[r.t]) rings[r.t] = r;
    await key('ArrowDown', 1, 400);
  }
  console.log(JSON.stringify(rings));
  check('the first card of every row kind: its ring inside x 48–912', Object.values(rings).every((r) => r.l >= 48 && r.r <= 912), Object.entries(rings).map(([t, r]) => `${t} ${r.l.toFixed(1)}`).join(' '));
  // See all at the end of a poster row: the Movies or Series tab with that shelf
  await key('PageUp', 1, 900); await key('PageDown', 1, 1200);
  for (let i = 0; i < 40; i++) { const k = await HC.focusKey(p); if (/^all:/.test(k)) break; await key('ArrowRight', 1, 120); }
  check('Right past the last card: See all', /^all:/.test(await HC.focusKey(p)));
  await shot('rows-seeall');
  await key('Enter', 1, 2500);
  const lib = await ev(() => ({ s: window.__tunerTest.state().screen, h: document.querySelector(`[data-screen="${window.__tunerTest.state().screen}"] [data-head]`)?.innerText.replace(/\s+/g, ' ') }));
  check('See all opens the shelf (Comedy)', /^(movie|series)$/.test(lib.s) && /Comedy/.test(lib.h), JSON.stringify(lib).slice(0, 120));
};
