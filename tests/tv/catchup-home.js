// Catch-up on Home (design/ui-v1/catchup/SPEC.md 5.1, 5.2, on the Marquee of design/ui-v1/home-final/SPEC.md 4, 8):
// the game's line through the catch-up states.
//  1. the morning after (10:40): LAST NIGHT, Watch from tip-off, → Game page, Score hidden, the replay's channel and
//     until when
//  2. Hold OK on it: the sources sheet; OK there plays (window.__replay); you stop in Q3: Resume, → From tip-off, "You
//     stopped in Q3", and Your shows' card "Stopped in Q3" (no minutes left)
//  3. live, not started (02:00, Q2): Watch live, → From tip-off, Hold Reveal, more; ON NOW / Score hidden, no clock
//  4. Right (From tip-off) → leave in Q1 → Home (02:35): Resume, → Back to live, "You stopped in Q1"; Back to live
//     asks first (Stay in the replay focused)
// Run: node tests/tv/drive.js <out> catchup-home
const setup = require('./catchup-lib.js');
const { screenText, spoilers } = setup;
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  const ok = (label, cond, extra = '') => console.log(`${cond ? 'OK  ' : 'FAIL'} ${label} ${extra}`);
  const hold = async () => { await p.keyboard.down('Enter'); await p.waitForTimeout(650); await p.keyboard.up('Enter'); await p.waitForTimeout(600); };
  const line = () => ev(() => { const e = document.querySelector('[data-screen="home"] .hf-e[data-key="line:game"]'); return e ? (e.classList.contains('on') ? e.querySelector('.cd') : e.querySelector('.t')).innerText.replace(/\s+/g, ' ') : ''; });
  const kind = () => ev(() => document.querySelector('[data-screen="home"] .hf-e[data-key="line:game"]')?.dataset.rowKind || '');
  const field = () => ev(() => document.querySelector('[data-screen="home"] .hf-field.vis')?.innerText.replace(/\s+/g, ' ') || '');
  const focused = () => ev(() => { const a = document.activeElement; return `${a.dataset.key || a.dataset.act || a.className} "${(a.textContent || '').trim().slice(0, 40)}"`; });
  const home = async () => { await ev(() => window.__tunerTest.go('home')); for (let i = 0; i < 20 && !(await kind()); i++) await p.waitForTimeout(500); await p.waitForTimeout(1200); };
  const sweep = async (label) => { const s = spoilers(await screenText(p)); ok(`shield sweep: ${label}`, !s.length, s.join(' ; ')); };

  // ---------- 1. the morning after ----------
  await setup(ctx);
  await home();
  console.log('line:', await line(), '| kind', await kind(), '| focus', await focused());
  ok('morning after: the game line lit, LAST NIGHT, Watch from tip-off', (await kind()) === 'morning' && /line:game/.test(await focused()) && /LAST NIGHT/i.test(await line()) && /Watch from tip-off/.test(await line()));
  ok('Score hidden, → Game page', /Score hidden/.test(await line()) && /Game page/.test(await line()));
  ok('the replay: the channel and until when', /US: ESPN HD.*replays until Thu 29( Oct)? · late/.test(await line()), await line());
  ok('the picture: REPLAY / Score hidden', /REPLAY/.test(await field()) && /Score hidden/.test(await field()), await field());
  await sweep('home, the morning after');
  await shot('home-replay');
  // ---------- 2. the sources sheet, play, stop in Q3 ----------
  await hold();
  console.log('sheet:', await ev(() => document.querySelector('.cu-srcs')?.innerText.replace(/\s+/g, ' ')));
  ok('Hold: the sources sheet, on the best', (await focused()).includes('US: ESPN HD'));
  await shot('sources-sheet');
  await key('Enter', 1, 2500);
  const R = await ev(() => window.__replay?.R);
  ok('OK in the sheet plays from tip-off', R?.kind === 'game' && R.startAt === R.tipoffAt, `${R?.startAt}`);
  await ev(() => { window.__replayTest.event({ type: 'position', played: 80 * 60e3 + 60 * 60e3 }); window.__replayTest.event({ type: 'exit', played: 140 * 60e3 }); });
  await p.waitForTimeout(1500); await home();
  console.log('line:', await line(), '| kind', await kind());
  ok('stopped partway: Resume, → From tip-off', (await kind()) === 'resume' && /Resume/.test(await line()) && /From tip-off/.test(await line()));
  ok('the card: you stopped in Q3 (or Q4), no score', /stopped in Q[34]/i.test(await line()) && /Score hidden/.test(await line()), await line());
  await sweep('home, stopped partway');
  await shot('home-replay-resume');
  // Your shows: the replay's card says where he stopped, never minutes left
  await key('PageDown', 1, 1500);
  for (let i = 0; i < 16 && !/^p:rp:/.test(await ev(() => document.activeElement?.dataset?.key || '')); i++) await key('ArrowDown', 1, 350);
  const card = await ev(() => document.activeElement.innerText.replace(/\s+/g, ' '));
  ok('Your shows: Stopped in Q…, no minutes left', /Stopped in Q/.test(card) && !/left/.test(card), card);
  await hold();
  console.log('card menu:', await ev(() => [...document.querySelectorAll('.ctxmenu .lr')].map((r) => r.textContent).join(' | ')));
  ok('its menu: Resume, From tip-off, Game page, Remove', /Resume \| From tip-off \| Game page \| Remove/.test(await ev(() => [...document.querySelectorAll('.ctxmenu .lr')].map((r) => r.textContent).join(' | '))));
  await key('Escape', 1, 500);

  // ---------- 3. live, not started ----------
  await setup(ctx, { at: '2026-10-27T02:00:00Z', state: 'in' });
  await home();
  console.log('line:', await line(), '| kind', await kind(), '| focus', await focused());
  ok('live with a replay: Watch live, → From tip-off, Hold Reveal, more', (await kind()) === 'live-tipoff' && /Watch live/.test(await line()) && /From tip-off/.test(await line()) && /Reveal, more/.test(await line()));
  ok('the picture: ON NOW / Score hidden, no clock', /ON NOW/.test(await field()) && /Score hidden/.test(await field()) && !/Q2|6:41/.test(await field()), await field());
  await sweep('home, live');
  await shot('home-live-tipoff');
  // ---------- 4. From tip-off, leave in Q1 ----------
  await key('ArrowRight', 1, 2500);
  ok('Right: From tip-off', (await ev(() => window.__replay?.R?.startAt)) === (await ev(() => window.__replay?.R?.tipoffAt)));
  await ev(() => { window.__replayTest.event({ type: 'position', played: 25 * 60e3 }); window.__replayTest.event({ type: 'exit', played: 25 * 60e3 }); });
  await p.clock.fastForward('35:00');
  await home();
  console.log('line:', await line(), '| kind', await kind(), '| focus', await focused());
  ok('behind: Resume, → Back to live', (await kind()) === 'behind' && /Resume/.test(await line()) && /Back to live/.test(await line()));
  ok('the card: you stopped in Q1', /stopped in Q1/i.test(await line()), await line());
  await sweep('home, behind in a replay');
  await shot('home-behind');
  await key('ArrowRight', 1, 900);
  console.log('back to live asks:', await ev(() => document.querySelector('#overlays .menu')?.innerText.replace(/\s+/g, ' ')), '| focus', await focused());
  ok('Back to live asks first, Stay focused', (await focused()).includes('Stay in the replay'));
  await shot('home-behind-golive');
  await key('Escape', 1, 500);
};
