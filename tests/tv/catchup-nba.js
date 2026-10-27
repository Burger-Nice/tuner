// Catch-up on the NBA tab and the game page (design/ui-v1/catchup/SPEC.md 5.1, 5.3 to 5.7): the hub's hero and the
// Grizzlies card with its Replay mark and hold-OK menu, the game page's shield card (Watch from tip-off, then Reveal),
// the team page's header and schedule tile (the mark, the menu), Choose a video with hidden names, the "no replay yet"
// card (Fri 30 Oct, the archive gone and no videos), and with the shield off the seen row (Box score · Watch again).
// Run: node tests/tv/drive.js <out> catchup-nba
const setup = require('./catchup-lib.js');
const { JAZZ, screenText, spoilers } = setup;
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  const ok = (label, cond, extra = '') => console.log(`${cond ? 'OK  ' : 'FAIL'} ${label} ${extra}`);
  const hold = async () => { await p.keyboard.down('Enter'); await p.waitForTimeout(650); await p.keyboard.up('Enter'); await p.waitForTimeout(700); };
  const focused = () => ev(() => { const a = document.activeElement; return `${a.className} ${a.dataset.act || a.dataset.key || a.dataset.tabG || ''} "${(a.textContent || '').trim().slice(0, 40)}"`; });
  const sweep = async (label) => { const s = spoilers(await screenText(p)); ok(`shield sweep: ${label}`, !s.length, s.join(' ; ')); };
  const menu = () => ev(() => [...document.querySelectorAll('.ctxmenu .lr')].map((r) => `${r.textContent}${r === document.activeElement ? ' (focused)' : ''}`).join(' | '));
  const toHub = async () => { await ev(() => window.__tunerTest.go('nba')); await p.waitForTimeout(2500); for (let i = 0; i < 20 && !(await ev(() => document.querySelector('[data-screen="nba"] .hero-plate[data-row-kind]'))); i++) await p.waitForTimeout(500); };

  // ---------- the hub, the morning after ----------
  await setup(ctx);
  await toHub();
  console.log('hub hero:', await ev(() => document.querySelector('[data-screen="nba"] .hero-plate')?.innerText.replace(/\s+/g, ' ')));
  console.log('hub focus:', await focused());
  for (let i = 0; i < 3 && !(await focused()).includes('Watch from tip-off'); i++) await key('ArrowDown', 1, 400);
  ok('hub: Watch from tip-off is the entry', (await focused()).includes('Watch from tip-off'));
  await sweep('hub');
  await shot('nba-hub-replay');
  // the day before: last night's cards. (The hub's hero is your team's game and its card isn't repeated under it, so
  // the card is looked at with no team and the shield on every game.)
  await setup(ctx, { shield: 'all', team: 'none' });
  await toHub();
  for (let i = 0; i < 3 && !(await ev(() => !!document.activeElement.dataset.day)); i++) await key('ArrowDown', 1, 400);
  await key('ArrowLeft', 1, 3000);
  await key('ArrowDown', 1, 600);
  for (let i = 0; i < 6 && !(await focused()).includes(JAZZ); i++) await key('ArrowRight', 1, 300);
  await p.waitForTimeout(2500);
  console.log('card:', await focused(), '| day caption:', await ev(() => document.querySelector('.nb-days .t-cap')?.innerText.replace(/\s+/g, ' ')));
  console.log('cards:', await ev(() => [...document.querySelectorAll('.nba-grid .gc')].slice(0, 3).map((c) => c.innerText.replace(/\s+/g, ' ')).join(' | ')));
  ok('the Grizzlies card: Replay mark, no records', /Replay/.test(await ev(() => document.activeElement.innerText)) && !/\d-\d/.test(await ev(() => document.activeElement.innerText)));
  await sweep('hub, yesterday');
  await shot('nba-hub-yesterday');
  await hold();
  console.log('card menu:', await menu());
  ok('card menu: Watch from tip-off first, Reveal last', /^Watch from tip-off \(focused\).*Reveal Grizzlies at Jazz$/.test(await menu()));
  await shot('nba-card-menu-replay');
  await key('Escape', 1, 400);
  // ---------- the game page ----------
  await key('Enter', 1, 2500);
  console.log('game page:', await ev(() => document.querySelector('[data-screen="game"]')?.innerText.replace(/\s+/g, ' ')));
  ok('game page: the entry is Watch from tip-off', (await focused()).includes('Watch from tip-off'));
  ok('game page: the caption names the replay', /US: ESPN HD · replays until Thu 29 Oct · late · hold OK: other sources/.test(await ev(() => document.querySelector('.cu-state')?.innerText.replace(/\s+/g, ' '))));
  await sweep('game page');
  await shot('game-replay-shield');
  // Choose a video from the sources sheet
  await hold();
  for (let i = 0; i < 8 && !(await focused()).includes('Choose a video'); i++) await key('ArrowDown', 1, 250);
  await key('Enter', 1, 1500);
  console.log('choose a video:', await ev(() => [...document.querySelectorAll('.menu.cu-srcs .lr')].filter((r) => !r.hidden).map((r) => r.innerText.replace(/\s+/g, ' ')).join(' | ')));
  ok('Choose a video: telling names hidden', !/118|highlights/i.test(await ev(() => document.querySelector('.menu.cu-srcs')?.innerText)) && /Name hidden/.test(await ev(() => document.querySelector('.menu.cu-srcs')?.innerText)));
  await sweep('choose a video');
  await shot('choose-video');
  await key('Escape', 1, 500); await key('Escape', 1, 1200);
  // ---------- the team page ----------
  await setup(ctx);
  await ev(() => window.__tunerTest.go('nba')); await p.waitForTimeout(1500);
  await key('ArrowUp', 1, 300); await key('ArrowLeft', 3, 100); await key('ArrowRight', 1, 1500);
  await key('ArrowDown', 1, 600);
  console.log('team header:', await ev(() => document.querySelector('[data-screen="nba"] .nb-head')?.innerText.replace(/\s+/g, ' ')));
  ok('team header: Watch from tip-off', (await focused()).includes('Watch from tip-off'));
  await key('ArrowDown', 1, 600);
  for (let i = 0; i < 4 && !(await focused()).includes(JAZZ); i++) await key('ArrowLeft', 1, 400);
  console.log('tile:', await ev(() => document.activeElement.innerText.replace(/\s+/g, ' ')), '| mark', await ev(() => !!document.activeElement.querySelector('.cu-g')));
  console.log('schedule:', await ev(() => [...document.querySelectorAll('.nb-title')][0]?.innerText.replace(/\s+/g, ' ')));
  await sweep('team page');
  await shot('team-schedule-replay');
  await hold();
  console.log('tile menu:', await menu());
  ok('tile menu: Watch from tip-off first', /^Watch from tip-off \(focused\)/.test(await menu()));
  await shot('team-tile-menu');
  await key('Escape', 1, 400);

  // ---------- Movies: the hidden game's videos ----------
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(3500);
  const grid = await ev(() => [...document.querySelectorAll('.lib-grid .pc')].filter((c) => c.dataset.masked).map((c) => `${c.dataset.masked}: ${c.innerText.replace(/\s+/g, ' ')}`).join(' | '));
  console.log('masked in Movies:', grid || '(none in view)');
  await ev(() => window.__tunerTest.go('search')); await p.waitForTimeout(1500);
  await p.keyboard.type('grizzlies', { delay: 80 }); await p.waitForTimeout(1500);
  console.log('search:', await ev(() => document.querySelector('[data-right]')?.innerText.replace(/\s+/g, ' ')));
  ok('search: no telling title', !/118|highlights/i.test(await ev(() => document.querySelector('[data-right]')?.innerText)));
  await sweep('search');
  await shot('search-masked');

  // ---------- no replay yet: Fri 30 Oct, the archive gone, no videos ----------
  await p.route('**/player_api.php*action=get_vod_streams*', async (r) => {
    const res = await r.fetch(); const list = await res.json();
    r.fulfill({ response: res, body: JSON.stringify(list.filter((m) => !/Grizzlies|Jazz/.test(m.name))) });
  });
  await ev(async () => { const c = await import('./tv/js/catalog.js'); await c.forget(); });
  await setup(ctx, { at: '2026-10-30T10:40:00Z' });
  await toHub();
  // open the game page from the team's schedule
  await key('ArrowUp', 1, 300); await key('ArrowLeft', 3, 100); await key('ArrowRight', 1, 1500); await key('ArrowDown', 2, 600);
  for (let i = 0; i < 6 && !(await focused()).includes(JAZZ); i++) await key('ArrowLeft', 1, 400);
  await key('Enter', 1, 4000);
  console.log('no replay:', await ev(() => document.querySelector('.cu-state')?.innerText.replace(/\s+/g, ' ')), '| focus', await focused());
  ok('no replay yet: Look again focused', (await focused()).includes('Look again'));
  await shot('game-noreplay');

  // ---------- the shield off: the seen row ----------
  await p.unroute('**/player_api.php*action=get_vod_streams*');
  await setup(ctx, { shield: 'off' });
  await toHub();
  console.log('hub hero (seen):', await ev(() => document.querySelector('[data-screen="nba"] .hero-plate')?.innerText.replace(/\s+/g, ' ')));
  ok('seen: Box score · Watch again', /Box score.*Watch again/.test(await ev(() => document.querySelector('[data-screen="nba"] .hero-plate')?.innerText.replace(/\s+/g, ' '))));
  await shot('nba-hub-seen');
};
