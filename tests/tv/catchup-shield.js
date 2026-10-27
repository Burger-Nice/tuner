// The shield sweep for catch-up (design/ui-v1/catchup/SPEC.md 7, 10.11): with the Grizzlies at the Jazz hidden, walks
// every surface and fails on a score, a result word, OT, a remaining or end time or the live state of that game
// (other games' cards may show theirs, as on the hub). Two states:
//  A. the morning after, unwatched: Home, the hub, the game page, the team page, the guide (on now and last night),
//     Movies, Search, Choose a video, the sources sheet
//  B. live (02:00): Watch live, then From tip-off (the session reveal goes), leave in Q1, 02:35: Home, the hub card,
//     the game page, the guide (the channel holds the game's own title), the player's as-aired data; then the replay's
//     buzzer + 2 min plays: seen for good
// Run: node tests/tv/drive.js <out> catchup-shield
const setup = require('./catchup-lib.js');
const { JAZZ, screenText, spoilers } = setup;
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  let fails = 0;
  const ok = (label, cond, extra = '') => { if (!cond) fails++; console.log(`${cond ? 'OK  ' : 'FAIL'} ${label} ${extra}`); };
  const hold = async () => { await p.keyboard.down('Enter'); await p.waitForTimeout(650); await p.keyboard.up('Enter'); await p.waitForTimeout(800); };
  const sweep = async (label) => { await p.waitForTimeout(600); const s = spoilers(await screenText(p)); ok(`sweep: ${label}`, !s.length, s.join(' ; ')); };
  const go = async (s, wait = 2500) => { await ev((x) => window.__tunerTest.go(x), s); await p.waitForTimeout(wait); };
  const focused = () => ev(() => { const a = document.activeElement; return `${a.className} ${a.dataset.act || a.dataset.key || ''} "${(a.textContent || '').trim().slice(0, 40)}"`; });

  // ---------- A. the morning after ----------
  await setup(ctx);
  await go('home', 4000); await sweep('A home');
  await hold(); await sweep('A sources sheet'); await key('Escape', 1, 500);
  await go('nba', 4000); await sweep('A hub');
  await ev((id) => window.__tunerTest.go('home'), JAZZ);
  await go('home', 2000); await key('ArrowRight', 1, 400); await key('Enter', 1, 3000);   // Game page
  await sweep('A game page');
  await hold(); for (let i = 0; i < 8 && !(await focused()).includes('Choose a video'); i++) await key('ArrowDown', 1, 250);
  await key('Enter', 1, 1500); await sweep('A choose a video'); await shot('A-choose');
  await key('Escape', 1, 500);
  await go('nba', 2000); await key('ArrowUp', 1, 300); await key('ArrowLeft', 3, 100); await key('ArrowRight', 1, 2500);
  await sweep('A team page');
  await go('live', 3000); await sweep('A guide, now');
  for (let i = 0; i < 4 && !(await ev(() => document.activeElement.closest('.g-row')?.querySelector('.nm')?.textContent || '')).includes('ESPN'); i++) await key('ArrowDown', 1, 400);
  for (let i = 0; i < 30; i++) { await key('ArrowLeft', 1, 220); if ((await focused()).includes('Grizzlies') || (await focused()).includes('g-ch')) break; }
  await p.waitForTimeout(1200);
  await sweep('A guide, last night'); await shot('A-guide');
  await go('movie', 4000); await sweep('A movies');
  await go('search', 1500); await p.keyboard.type('jazz', { delay: 80 }); await p.waitForTimeout(1500); await sweep('A search'); await shot('A-search');

  // ---------- B. live, watched live, then From tip-off, left in Q1 ----------
  await setup(ctx, { at: '2026-10-27T02:00:00Z', state: 'in' });
  await go('home', 4000); await sweep('B home, live');
  await key('Enter', 1, 1500);   // Watch live (in the browser: the channel is linked, the game revealed for the session)
  await p.waitForTimeout(1500);
  console.log('watching live reveals for the session:', await ev(async () => { const m = await import('./tv/js/games.js'); return m.revealed.has('401909875'); }));
  await go('home', 2000);
  await key('ArrowRight', 1, 400); console.log('focus:', await focused());
  await key('Enter', 1, 3000);   // From tip-off
  console.log('after From tip-off, revealed:', await ev(async () => { const m = await import('./tv/js/games.js'); return m.revealed.has('401909875'); }));
  const g = await ev(() => { window.__replayTest.event({ type: 'position', played: 24 * 60e3 }); return window.__replayTest.state(); });
  console.log('the player\'s as-aired data in Q1:', JSON.stringify({ clock: g?.game?.clock, score: g?.game?.score, box: g?.game?.box?.away?.rows?.length, chapters: g?.game?.chapters?.map((c) => c.label).join(' ') }));
  ok('as aired: Q1, no box score', /^Q1/.test(g?.game?.clock || '') && !g?.game?.box?.away?.rows?.length);
  await ev(() => window.__replayTest.event({ type: 'exit', played: 24 * 60e3 }));
  await p.clock.fastForward('35:00');
  await go('home', 3000); await sweep('B home, behind'); await shot('B-home-behind');
  ok('B hero: behind', (await ev(() => document.querySelector('[data-screen="home"] .hero-plate')?.dataset.rowKind)) === 'behind');
  await go('nba', 3500); await sweep('B hub, behind');
  await go('live', 3000);
  const espn = await ev(() => [...document.querySelectorAll('.g-row')].find((r) => /ESPN/.test(r.querySelector('.nm')?.textContent))?.querySelector('.g-cell.now')?.innerText.replace(/\s+/g, ' '));
  console.log('ESPN on now:', espn);
  ok('B the channel holds the game\'s own title', /Grizzlies at Jazz/.test(espn || ''));
  await sweep('B guide, behind');
  await go('home', 2000); await key('ArrowRight', 2, 300); await key('Enter', 1, 3000);
  await sweep('B game page, behind'); await shot('B-game-behind');
  console.log('game page:', await ev(() => document.querySelector('[data-screen="game"]')?.innerText.replace(/\s+/g, ' ')), '| focus', await focused());
  ok('B game page: Resume first', (await focused()).includes('Resume'));

  // ---------- the replay's buzzer + 2 min plays: seen for good ----------
  await setup(ctx);
  await go('home', 4000); await key('Enter', 1, 3000);
  const R = await ev(() => window.__replay?.R);
  await ev(() => window.__replayTest.event({ type: 'position', played: 60 * 60e3 }));
  console.log('seen at Q2?', await ev(async () => (await import('./tv/js/games.js')).seenForGood({ id: '401909875', date: Date.parse('2026-10-27T01:00:00Z') })));
  await ev(() => window.__replayTest.event({ type: 'position', played: 200 * 60e3 }));
  const seen = await ev(async () => (await import('./tv/js/games.js')).seenForGood({ id: '401909875', date: Date.parse('2026-10-27T01:00:00Z') }));
  ok('seen at the replay\'s buzzer + 2 min', seen);
  await ev(() => window.__replayTest.event({ type: 'exit', played: 200 * 60e3 }));
  await go('home', 3000);
  console.log('hero after the buzzer:', await ev(() => document.querySelector('[data-screen="home"] .hero-plate')?.innerText.replace(/\s+/g, ' ')));
  console.log(fails ? `${fails} FAILED` : 'all passed');
};
