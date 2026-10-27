// Hunt: behind in a replay while the live game ends (catch-up 7.2: LIVE pills on the clock, the channel's title held,
// nothing changes when the real game ends). 02:00 live → From tip-off → leave in Q1; then at 02:40 ESPN says Final.
// Every surface is read for that game: did anything change because the real game ended?
// Run: node tests/tv/drive.js <out> hunt2-catchup-behindfinal
const setup = require('./catchup-lib.js');
const { JAZZ, screenText, spoilers } = setup;
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  const focused = () => ev(() => { const a = document.activeElement; return `${a.className} ${a.dataset.act || a.dataset.key || ''} "${(a.textContent || '').trim().slice(0, 50)}"`; });
  const go = async (s, wait = 3000) => { await ev((x) => window.__tunerTest.go(x), s); await p.waitForTimeout(wait); };
  const snap = async (label) => {
    const r = await ev((id) => {
      const out = {};
      out.topbarLive = !!document.querySelector('#topbar .a-live, #topbar .live, #topbar [class*="live"]');
      out.topbar = document.querySelector('#topbar')?.innerHTML.match(/live[^"]*"/gi)?.join(',') || '';
      const scr = document.querySelector('#screens [data-screen]:not([hidden])');
      out.screen = scr?.dataset.screen;
      out.hero = scr?.querySelector('.hero-plate')?.innerText.replace(/\s+/g, ' ');
      out.heroLive = !!scr?.querySelector('.hero-plate .a-live, .hero-plate .livep, .hero-plate [class*="live"]');
      out.cards = [...(scr?.querySelectorAll('.gc[data-g="' + id + '"]') || [])].map((c) => c.innerText.replace(/\s+/g, ' ')).join(' | ');
      out.tiles = [...(scr?.querySelectorAll('.nb-gt[data-g="' + id + '"]') || [])].map((c) => c.innerText.replace(/\s+/g, ' ') + (c.querySelector('[class*="live"]') ? ' [LIVEPILL]' : '')).join(' | ');
      out.onNow = [...(scr?.querySelectorAll('.hc') || [])].filter((c) => /ESPN|Grizzlies|Jazz/.test(c.innerText)).map((c) => c.innerText.replace(/\s+/g, ' ') + (c.querySelector('.tp [class*="live"]') ? ' [LIVEPILL]' : '')).join(' | ');
      return out;
    }, JAZZ);
    console.log(`--- ${label}`, JSON.stringify(r, null, 0));
    const s = spoilers(await screenText(p));
    if (s.length) console.log('   SPOILERS:', s.join(' ; '));
    return r;
  };

  const restore = async () => { await ev(() => { const o = JSON.parse(sessionStorage.getItem('keep') || '{}'); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }); await p.reload(); await p.waitForTimeout(4500); };
  // 02:00, live in Q2: From tip-off, leave in Q1
  await setup(ctx, { at: '2026-10-27T02:00:00Z', state: 'in' });
  await go('home', 4000);
  await key('ArrowRight', 1, 400);
  console.log('focus', await focused());
  await key('Enter', 1, 3000);
  await ev(() => { window.__replayTest.event({ type: 'position', played: 25 * 60e3 }); window.__replayTest.event({ type: 'exit', played: 25 * 60e3 }); });
  await p.waitForTimeout(800);
  // keep what the replay wrote, across the next setup (which clears it): into sessionStorage
  await ev(() => { const o = {}; for (const k of Object.keys(localStorage)) if (/progress|nbaWatchedOn|replayPick|archiveShift|replayDelay/.test(k)) o[k] = localStorage.getItem(k); sessionStorage.setItem('keep', JSON.stringify(o)); });
  console.log('kept:', await ev(() => Object.keys(JSON.parse(sessionStorage.getItem('keep'))).join(', ')));

  // A. 02:35, still live (control)
  await setup(ctx, { at: '2026-10-27T02:35:00Z', state: 'in' }); await restore();
  await go('home', 4000); const aHome = await snap('A home (live)'); await shot('A-home');
  await go('nba', 4000); await snap('A hub (live)');
  await go('live', 4000);
  const guideRow = () => ev(() => { const r = [...document.querySelectorAll('.g-row')].find((x) => /ESPN/.test(x.querySelector('.nm')?.textContent)); const c = r?.querySelector('.g-cell.now') || r?.querySelector('.g-cell'); return r ? `${c?.innerText.replace(/\s+/g, ' ')} ${r.querySelector('[class*="live"]') ? '[LIVEPILL] ' + r.querySelector('[class*="live"]').className : ''}` : 'no row'; });
  console.log('A guide ESPN:', await guideRow());
  for (let i = 0; i < 6 && !(await ev(() => document.activeElement.closest('.g-row')?.querySelector('.nm')?.textContent || '')).includes('ESPN'); i++) await key('ArrowDown', 1, 400);
  await p.waitForTimeout(800);
  console.log('A now panel:', await ev(() => document.querySelector('.g-now')?.innerText.replace(/\s+/g, ' ')), '| live pill', await ev(() => !!document.querySelector('.g-now [class*="live"]')));
  await shot('A-guide');

  // B. 02:40, the game is final on ESPN (still inside tip-off + 3 h 30): does anything change?
  await setup(ctx, { at: '2026-10-27T02:40:00Z', state: 'post' }); await restore();
  console.log('B ESPN day held?', await ev(async () => { const m = await import('./tv/js/games.js'); return `${m.nba.todayDay} games=${m.nba.today.map((g) => g.id + ':' + g.state).join(',')} heldLive=${m.heldLive(m.gameById('401909875'))} behind=${m.behindReplay(m.gameById('401909875'))}`; }));
  await go('home', 4000); await snap('B home (final)'); await shot('B-home');
  await go('nba', 4000); await snap('B hub (final)'); await shot('B-hub');
  await go('live', 4000);
  console.log('B guide ESPN:', await guideRow());
  for (let i = 0; i < 6 && !(await ev(() => document.activeElement.closest('.g-row')?.querySelector('.nm')?.textContent || '')).includes('ESPN'); i++) await key('ArrowDown', 1, 400);
  await p.waitForTimeout(800);
  console.log('B now panel:', await ev(() => document.querySelector('.g-now')?.innerText.replace(/\s+/g, ' ')), '| live pill', await ev(() => !!document.querySelector('.g-now [class*="live"]')));
  await shot('B-guide');
  console.log('B guide groups:', await ev(() => document.querySelector('[data-screen="live"] .g-grp, [data-screen="live"] .chip.sel')?.innerText));
  // the team page (Grizzlies): header and the Jazz tile
  await ev(async () => { const r = await import('./tv/js/router.js'); r.push('team', { abbr: 'MEM' }); });
  await p.waitForTimeout(4000);
  await snap('B team page (final)'); await shot('B-team');
  console.log('B team head:', await ev(() => document.querySelector('.nb-head')?.innerText.replace(/\s+/g, ' ')));
  // the game page
  await ev(async (id) => { const r = await import('./tv/js/router.js'); r.push('game', { id }); }, JAZZ);
  await p.waitForTimeout(3000);
  console.log('B game page:', await ev(() => document.querySelector('[data-screen="game"]')?.innerText.replace(/\s+/g, ' ')), '| focus', await focused());
  await shot('B-game');
};
