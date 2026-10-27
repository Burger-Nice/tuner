// Catch-up on Home (design/ui-v1/catchup/SPEC.md 5.1, 5.2): the hero state table's catch-up rows.
//  1. the morning after (10:40): Watch from tip-off · Game page, REPLAY / Score hidden, the channel and "Until Thu 29 · late"
//  2. hold OK on it: the sources sheet; OK there plays (window.__replay); you stop in Q3: Resume · From tip-off · Game page
//     with Q3 on the slab, and the Continue watching card "Stopped in Q3"
//  3. live, not started (02:00, Q2): Watch live · From tip-off · Reveal score, ON NOW / Score hidden
//  4. watch live → From tip-off → leave in Q1 → Home (02:35): Resume · Back to live · Game page, "You're in Q1"; Back to
//     live asks first (Stay in the replay focused)
//  5. the shield off, seen: Box score · Watch again
// Run: node tests/tv/drive.js <out> catchup-home
const setup = require('./catchup-lib.js');
const { JAZZ, TIP, screenText, spoilers } = setup;
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  const ok = (label, cond, extra = '') => console.log(`${cond ? 'OK  ' : 'FAIL'} ${label} ${extra}`);
  const hold = async () => { await p.keyboard.down('Enter'); await p.waitForTimeout(650); await p.keyboard.up('Enter'); await p.waitForTimeout(600); };
  const hero = () => ev(() => document.querySelector('[data-screen="home"] .hero-plate')?.innerText.replace(/\s+/g, ' '));
  const kind = () => ev(() => document.querySelector('[data-screen="home"] .hero-plate')?.dataset.rowKind || '');
  const focused = () => ev(() => { const a = document.activeElement; return `${a.dataset.act || a.className} "${(a.textContent || '').trim().slice(0, 40)}"`; });
  const home = async () => { await ev(() => window.__tunerTest.go('home')); for (let i = 0; i < 20 && !(await kind()); i++) await p.waitForTimeout(500); await p.waitForTimeout(800); };
  const sweep = async (label) => { const s = spoilers(await screenText(p)); ok(`shield sweep: ${label}`, !s.length, s.join(' ; ')); };

  // ---------- 1. the morning after ----------
  await setup(ctx);
  await home();
  console.log('hero:', await hero(), '| kind', await kind(), '| focus', await focused());
  ok('morning after: Watch from tip-off focused', (await kind()) === 'morning' && (await focused()).includes('Watch from tip-off'));
  ok('the caption: the channel and until when', /US: ESPN HD.*Until Thu 29 · late/.test(await hero()));
  await sweep('home, the morning after');
  await shot('home-replay');
  // ---------- 2. the sources sheet, play, stop in Q3 ----------
  await hold();
  console.log('sheet:', await ev(() => document.querySelector('.cu-srcs')?.innerText.replace(/\s+/g, ' ')));
  ok('the sources sheet opens on the best', (await focused()).includes('US: ESPN HD'));
  await shot('sources-sheet');
  await key('Enter', 1, 2500);
  const R = await ev(() => window.__replay?.R);
  ok('OK in the sheet plays from tip-off', R?.kind === 'game' && R.startAt === R.tipoffAt, `${R?.startAt}`);
  // the player reports a position in Q3 (aired about 02:20), then closes
  await ev(() => { const t = window.__replay.R; window.__replayTest.event({ type: 'position', played: 80 * 60e3 + 60 * 60e3 }); window.__replayTest.event({ type: 'exit', played: 140 * 60e3 }); });
  await p.waitForTimeout(1500); await home();
  console.log('hero:', await hero(), '| kind', await kind());
  ok('stopped partway: Resume · From tip-off · Game page', (await kind()) === 'resume' && /Resume.*From tip-off.*Game page/.test(await hero()));
  ok('the slab: your position', /Q[34].*You stopped here/i.test(await hero()));
  await sweep('home, stopped partway');
  await shot('home-replay-resume');
  await key('ArrowDown', 1, 700);
  console.log('continue watching:', await ev(() => document.activeElement.innerText.replace(/\s+/g, ' ')));
  ok('Continue watching: Stopped in Q…, no minutes left', /Stopped in Q/.test(await ev(() => document.activeElement.innerText)) && !/left/.test(await ev(() => document.activeElement.innerText)));
  await hold();
  console.log('card menu:', await ev(() => [...document.querySelectorAll('.ctxmenu .lr')].map((r) => r.textContent).join(' | ')));
  await key('Escape', 1, 500);

  // ---------- 3. live, not started ----------
  await setup(ctx, { at: '2026-10-27T02:00:00Z', state: 'in' });
  await home();
  console.log('hero:', await hero(), '| kind', await kind(), '| focus', await focused());
  ok('live with a replay: Watch live · From tip-off · Reveal score', (await kind()) === 'live-tipoff' && /Watch live.*From tip-off.*Reveal score/.test(await hero()));
  ok('the slab: ON NOW / Score hidden, no clock', /ON NOW.*Score hidden/i.test(await hero()) && !/Q2|6:41/.test(await hero()));
  await sweep('home, live');
  await shot('home-live-tipoff');
  // ---------- 4. From tip-off, leave in Q1 ----------
  await key('ArrowRight', 1, 400); ok('From tip-off', (await focused()).includes('From tip-off'));
  await key('Enter', 1, 2500);
  await ev(() => { window.__replayTest.event({ type: 'position', played: 25 * 60e3 }); window.__replayTest.event({ type: 'exit', played: 25 * 60e3 }); });
  await p.clock.fastForward('35:00');
  await home();
  console.log('hero:', await hero(), '| kind', await kind(), '| focus', await focused());
  ok('behind: Resume · Back to live · Game page', (await kind()) === 'behind' && /Resume.*Back to live.*Game page/.test(await hero()));
  ok('the slab: Q1 and You stopped here', /Q1.*You stopped here/i.test(await hero()));
  await sweep('home, behind in a replay');
  await shot('home-behind');
  await key('ArrowRight', 1, 400); await key('Enter', 1, 900);
  console.log('back to live asks:', await ev(() => document.querySelector('#overlays .menu')?.innerText.replace(/\s+/g, ' ')), '| focus', await focused());
  ok('Back to live asks first, Stay focused', (await focused()).includes('Stay in the replay'));
  await shot('home-behind-golive');
  await key('Escape', 1, 500);
  // the game card in Tonight's games / the hub reads You're in Q1
  console.log('rows:', await ev(() => [...document.querySelectorAll('[data-screen="home"] .gc .st')].map((x) => x.innerText.replace(/\s+/g, ' ')).join(' | ')));

};
