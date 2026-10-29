// Catch-up when the guide can't tell which channel showed the game (the owner's provider: no Watch from tip-off at all).
// The provider's archive tables answer empty, so airglow finds no replay by itself; Home's hero offers Pick the channel,
// the game page too; picking US: ESPN HD plays it from tip-off and is remembered (the hero then says Watch from tip-off).
// Run: node tests/tv/drive.js <out> catchup-pick
const setup = require('./catchup-lib.js');
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  const ok = (label, cond, extra = '') => console.log(`${cond ? 'OK  ' : 'FAIL'} ${label} ${extra}`);
  const hero = (scr = 'nba') => ev((s) => document.querySelector(`[data-screen="${s}"] .hero-plate`)?.innerText.replace(/\s+/g, ' '), scr);
  const kind = (scr = 'nba') => ev((s) => document.querySelector(`[data-screen="${s}"] .hero-plate`)?.dataset.rowKind || '', scr);
  await setup(ctx);
  await p.route(/get_simple_data_table/, (r) => r.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ epg_listings: [] }) }));
  await p.reload(); await p.waitForTimeout(5000);
  // and no full-game video of it in Movies (a fresh list object, so the video index is built again)
  await ev(async () => { const C = await import('/tv/js/catalog.js'), CU = await import('/tv/js/catchup.js'); await C.ensure('movie'); const m = C.catalog.movie; C.catalog.movie = { ...m, items: m.items.filter((x) => !/grizzlies|jazz|memphis|utah/i.test(x.name)) }; CU.forgetReplays(); });
  await ev(() => window.__tunerTest.go('nba'));
  for (let i = 0; i < 30 && (await kind()) !== 'looking'; i++) await p.waitForTimeout(500);
  await p.waitForTimeout(1500);
  console.log('hero:', await hero(), '| kind', await kind());
  ok('no replay found: the NBA tab\'s hero offers Pick the channel', /Pick the channel/.test(await hero()), await hero());
  await shot('home-looking');
  // the game page
  await ev(() => document.querySelector('[data-screen="nba"] .hero-plate [data-act="primary"]')?.focus()); await key('Enter', 1, 2500);   // (Game page)
  const gp = await ev(() => document.querySelector('[data-screen="game"]')?.innerText.replace(/\s+/g, ' '));
  ok('the game page: Pick the channel', /Pick the channel/.test(gp), gp.slice(0, 200));
  await ev(() => document.querySelector('[data-screen="game"] [data-act="pickch"]')?.focus()); await key('Enter', 1, 1200);
  await shot('pick-sheet');
  const rows = await ev(() => [...document.querySelectorAll('#overlays .lr')].map((r) => r.innerText.replace(/\s+/g, ' ')));
  console.log('channels:', rows.slice(0, 6).join(' | '));
  ok('the sheet lists kept channels', rows.length > 0 && rows.some((r) => /ESPN/.test(r)), `${rows.length} rows`);
  const i = rows.findIndex((r) => /US: ESPN HD/.test(r));
  for (let k = 0; k < i; k++) await key('ArrowDown', 1, 120);
  await key('Enter', 1, 3000);
  const played = await ev(() => JSON.stringify(window.__replay || window.__lastReplay || null)?.slice(0, 300));
  console.log('played:', played);
  ok('it plays US: ESPN HD from tip-off', /ESPN/.test(played || ''), played);
  await shot('played');
  // remembered: Home's game line now has Watch from tip-off
  await ev(() => { try { window.__replayTest?.({ type: 'exit', played: 0 }); } catch {} });
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(3000);
  // (Home's Marquee, home-final SPEC 4: the game's line, its lit card)
  const gl = () => ev(() => { const e = document.querySelector('[data-screen="home"] .hf-e[data-key="line:game"]'); return e ? `${e.dataset.rowKind} ${e.innerText.replace(/\s+/g, ' ')}` : ''; });
  console.log('game line after:', await gl());
  ok('remembered: Home\'s game line has the replay (Resume or Watch from tip-off)', /Watch from tip-off|Resume/.test(await gl()), await gl());
};
