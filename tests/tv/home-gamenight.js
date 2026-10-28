// Game night on Home with the shield on (design/ui-v1/home-final/SPEC.md 0.10, 0.11, 8; mock 04): the Grizzlies at the
// Jazz live (Tue 27 Oct 02:00, hidden): the game is the first line, its card the Sharp plate; the picture is the two
// teams with ON NOW and Score hidden, no quarter, no clock, both records "as of tip-off"; the NBA tab drops its pill;
// Hold OK offers Reveal score with its one-step confirm (Keep hidden focused); Right is From tip-off; the NBA row's card
// for the hidden game says hidden. Then the morning after: LAST NIGHT · Replay · Score hidden, Watch from tip-off.
// Run: node tests/tv/drive.js <out> home-gamenight
const setup = require('./catchup-lib.js');
const HC = require('./home-common.js');
const { screenText, spoilers, JAZZ } = setup;
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const { check } = HC;
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto('http://127.0.0.1:8777/tv.html'); await p.waitForTimeout(800);
  await ev((H) => { localStorage.setItem('tuner.cinemetaBase', JSON.stringify(`${H}/addon/cinemeta`)); localStorage.setItem('tuner.tmdbBase', JSON.stringify(`${H}/tmdb/3`)); localStorage.setItem('tuner.tmdbImg', JSON.stringify(`${H}/tmdb-img`)); localStorage.setItem('tuner.tmdbKey', JSON.stringify('test-tmdb-token')); }, HC.H);
  await setup(ctx, { at: '2026-10-27T02:00:00Z', state: 'in' });
  const home = async () => { await ev(() => window.__tunerTest.go('home')); for (let i = 0; i < 20 && !(await ev(() => document.querySelector('[data-screen="home"] .hf-e[data-key="line:game"]'))); i++) await p.waitForTimeout(500); await p.waitForTimeout(1500); };
  await home();
  const L = await HC.lineup(p);
  console.log(L.join('\n'));
  check('the game is the first line, lit', /^\*GAME NIGHT/.test(L[0]) && (await HC.focusKey(p)) === 'line:game');
  check('its line: On now · the channel · Score hidden', /On now · .* · Score hidden/.test(L[0]), L[0]);
  check('both records "as of tip-off"', /Grizzlies \S+ · Jazz \S+ · as of tip-off/.test(L[0]));
  check('Watch live · → From tip-off · Hold Reveal, more', /Watch live/.test(L[0]) && /From tip-off/.test(L[0]) && /Reveal, more/.test(L[0]));
  const field = await ev(() => document.querySelector('[data-screen="home"] .hf-field.vis')?.innerText.replace(/\s+/g, ' ') || '');
  console.log('field:', field);
  check('the picture is the two teams: ON NOW, Score hidden', /ON NOW/.test(field) && /Score hidden/.test(field), field);
  check('the records under the crests "as of tip-off"', /Grizzlies \d+-\d+ · as of tip-off/.test(field));
  check('the lit line is the Sharp plate', await ev(() => document.querySelector('[data-screen="home"] .hf-e.on').classList.contains('sharp')));
  const txt = await screenText(p);
  const s = spoilers(txt);
  check('shield sweep: no score, no result', !s.length, s.join(' ; '));
  check('no quarter and no clock anywhere on Home', !/\b(Q[1-4]|1ST|2ND|3RD|4TH|HALF)\b|\b6:41\b/i.test(txt), (txt.match(/\b(Q[1-4]|1ST|2ND|3RD|4TH|HALF)\b|\b6:41\b/i) || [])[0]);
  check('the NBA tab has no LIVE pill while the game is lit', await ev(() => !document.querySelector('#topbar [data-tab="nba"] .a-live')));
  await shot('gamenight');
  // Hold OK: Reveal score, then its confirm with Keep hidden focused
  await HC.hold(p);
  const menu = await ev(() => [...document.querySelectorAll('.ctxmenu .lr')].map((r) => r.textContent).join(' | '));
  check('Hold: Watch live, Reveal score, Game page', /Watch live/.test(menu) && /Reveal score/.test(menu) && /Game page/.test(menu), menu);
  for (let i = 0; i < 6 && !/Reveal score/.test(await ev(() => document.activeElement.textContent)); i++) await key('ArrowDown', 1, 150);
  await key('Enter', 1, 700);
  const conf = await ev(() => document.querySelector('#overlays .menu')?.innerText.replace(/\s+/g, ' ') || '');
  check('the confirm: Reveal Grizzlies at Jazz? · Keep hidden focused', /Reveal Grizzlies at Jazz\?/.test(conf) && /Keep hidden/.test(await ev(() => document.activeElement.textContent)), conf);
  await shot('gamenight-reveal');
  await key('Enter', 1, 700);
  check('Keep hidden: still hidden', /Score hidden/.test((await HC.lineup(p))[0]));
  // the NBA row: the hidden game's card says hidden
  await key('PageDown', 1, 1500);
  const gc = await ev((id) => document.querySelector(`[data-screen="home"] .gc[data-g="${id}"]`)?.innerText.replace(/\s+/g, ' ') || '', JAZZ);
  check('in the rows, the hidden game\'s card: hidden', /hidden/i.test(gc) && !/55|51/.test(gc), gc);
  const t2 = await screenText(p), s2 = spoilers(t2);
  check('shield sweep: the rows', !s2.length, s2.join(' ; '));
  check('no quarter and no clock in the rows', !/\b(Q[1-4]|1ST|2ND|3RD|4TH|HALF)\b|\b6:41\b/i.test(t2), gc);
  await shot('gamenight-rows');
  await key('PageUp', 1, 900);
  // Right: From tip-off
  await key('ArrowRight', 1, 2500);
  const R = await ev(() => window.__replay?.R);
  check('Right: From tip-off plays the replay from tip-off', R?.kind === 'game' && R.startAt === R.tipoffAt, JSON.stringify(R || {}).slice(0, 80));
  await ev(() => { window.__replayTest?.event({ type: 'exit', played: 0 }); });
  // the morning after
  await setup(ctx, { at: '2026-10-27T10:40:00Z', state: 'post' });
  await home();
  const M = await HC.lineup(p);
  console.log(M.join('\n'));
  check('the morning after: LAST NIGHT, Replay, Score hidden, Watch from tip-off', /^\*LAST NIGHT/.test(M[0]) && /Score hidden/.test(M[0]) && /Watch from tip-off/.test(M[0]), M[0]);
  const s3 = spoilers(await screenText(p));
  check('shield sweep: the morning after', !s3.length, s3.join(' ; '));
  await shot('gamenight-morning');
};
