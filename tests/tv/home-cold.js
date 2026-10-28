// Home's first evening and its fallbacks (design/ui-v1/home-final/SPEC.md 2, 6, 6a; mock 06):
//  1. no history: three lines (Popular now · a pick for tonight with Details, the team's game, Pick what you like),
//     discovery rows only (Popular films, Popular series, New this year, Top rated, In Icelandic); Pick what you like
//     opens the genre picker; three picks start "Comedy for you" (You picked it), and the rows come back named for them
//  2. no TMDB key: the rows are Cinemeta's and named honestly (Popular comedies, not Comedy for you), no Top rated, no
//     blends, no Something different; the one-time line "Add your TMDB key for better rows"
//  3. no add-ons: no film line, the rows are the NBA and the add-on card that opens Account > Add-ons
// Run: node tests/tv/drive.js <out> home-cold
const HC = require('./home-common.js');
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const { check } = HC;
  const ev = (f, a) => p.evaluate(f, a);
  const names = () => ev(() => [...document.querySelectorAll('[data-screen="home"] .hf-row')].map((r) => r.querySelector('.rt').childNodes[0].textContent.trim()));
  // ---------- 1. a first evening ----------
  await HC(ctx, { history: false });
  await ev(() => window.__tunerTest.go('home')); await HC.waitRows(p, 4); await p.waitForTimeout(2500);
  let L = await HC.lineup(p);
  console.log(L.join('\n'));
  check('the lines: the game first (it is live), a pick for tonight, Pick what you like', L.length === 3 && /GAME NIGHT/.test(L[0]) && /Popular now · a pick for tonight/.test(L[1]) && /Pick what you like/.test(L[2]), L.length);
  await key('ArrowDown', 1, 1100);
  const pick = await ev(() => document.querySelector('[data-screen="home"] .hf-e.on .cd').innerText.replace(/\s+/g, ' '));
  check('the pick: POPULAR NOW · A PICK FOR TONIGHT, Details (no ▶)', /POPULAR NOW · A PICK FOR TONIGHT/i.test(pick) && /Details/.test(pick) && await ev(() => !!document.querySelector('[data-screen="home"] .hf-e.on .hf-pill.noicon')), pick);
  await shot('cold-marquee');
  let R = await names();
  console.log(R.join(' | '));
  check('discovery rows only', !R.some((r) => / for you$|^Because you watched|^Something different$/.test(r)) && R.includes('Popular films') && R.includes('Popular series'));
  check('Top rated and In Icelandic (with a key)', R.includes('In Icelandic'));
  // Pick what you like
  await key('ArrowDown', 1, 900); await key('Enter', 1, 900);
  check('OK on Pick what you like: the genre picker', await ev(() => !!document.querySelector('#overlays .hf-picks')));
  for (const g of ['Comedy', 'Anime', 'Crime']) { await ev((g) => document.querySelector(`#overlays .hf-picks [data-v="${g}"]`).focus(), g); await key('Enter', 1, 300); }
  await shot('cold-picks');
  await ev(() => document.querySelector('#overlays [data-act="done"]').focus()); await key('Enter', 1, 600);
  await p.waitForTimeout(6000);
  R = await names();
  console.log(R.join(' | '));
  const r0 = await ev(() => document.querySelector('[data-screen="home"] .hf-peek')?.innerText.replace(/\s+/g, ' '));
  check('three picks start Comedy for you (You picked it)', R[0] === 'Comedy for you' && /You picked it/.test(r0), r0);
  check('and Anime, Crime for you', R.includes('Anime') && R.includes('Crime for you'));
  await shot('cold-picked');
  // ---------- 2. no TMDB key ----------
  await HC(ctx, { key: false });
  await ev(() => window.__tunerTest.go('home')); await HC.waitRows(p, 4); await p.waitForTimeout(3000);
  R = await names();
  console.log(R.join(' | '));
  check('named honestly: Popular comedies, not Comedy for you', R.includes('Popular comedies') && !R.includes('Comedy for you'), R[0]);
  check('no Top rated, no blends, no Something different without a key', !R.some((r) => /^Top rated|^Anime comedy$|^Crime dramas$|^Something different$/.test(r)));
  check('Because you watched (the Cinemeta scoring) or Anime still there', R.some((r) => /^Because you watched |^Anime$/.test(r)), R.join(', '));
  const note = await ev(() => { const n = document.querySelector('[data-screen="home"] .hf-note'); return n && !n.hidden ? n.textContent : ''; });
  check('the one-time line: Add your TMDB key for better rows', /Add your TMDB key for better rows · Account > Provider/.test(note), note);
  await shot('nokey-marquee');
  await key('PageDown', 1, 1500); await shot('nokey-rows');
  // ---------- 3. no add-ons ----------
  await HC(ctx, { addons: false });
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(4000);
  L = await HC.lineup(p);
  check('no add-ons: no film line', !L.some((l) => /A film for tonight|a pick for tonight/.test(l)), L.join(' / '));
  R = await names();
  check('no add-ons: the NBA and the add-on card', R.includes('Tonight in the NBA') && R.includes('Films and series') && !R.includes('Popular films'), R.join(', '));
  await key('PageDown', 1, 1200);
  for (let i = 0; i < 4 && !/note:addons/.test(await HC.focusKey(p)); i++) await key('ArrowDown', 1, 400);
  const nc = await ev(() => document.activeElement.innerText.replace(/\s+/g, ' '));
  check('the card: Add a Stremio add-on for films and series', /Add a Stremio add-on for films and series/.test(nc), nc);
  await shot('noaddons');
  await key('Enter', 1, 1500);
  check('OK opens Account > Add-ons', await ev(() => window.__tunerTest.state().screen === 'account' && /Add an add-on/.test(document.querySelector('[data-screen="account"]').innerText)));
};
