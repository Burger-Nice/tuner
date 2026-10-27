// Hunt: the NBA tab's section row. Dwell switching, flicks, Down before the dwell, OK, Back x3, Up into the bar,
// tabs away and back, the remembered section.  node tests/tv/drive.js <out> hunt-games-row
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const h = require('./hunt-games-lib.js')(ctx);
  const { ev, check, where, shown, selChip, start, flood, toChip } = h;
  await start();
  let a = await where('cold start');
  check(a.act === 'primary' || /Watch|Remind|Box/.test(a.text), 'cold start focus is the hero primary');
  check(await selChip() === 'games' && await shown() === 'games', 'Games is selected and shown');

  // Up from the Games hero: the Games chip (the selected section), not the chip nearest in line
  await key('ArrowUp', 1, 120); a = await where('up from hero (120 ms)');
  await shot('up-from-hero');
  check(a.sec === 'games', `Up from the hero goes to the Games chip (${a.sec})`);
  await p.waitForTimeout(600);
  console.log('   600 ms later, shown:', await shown(), 'sel:', await selChip());
  check(await shown() === 'games', `staying put after Up from the hero keeps Games (now ${await shown()})`);
  await shot('up-from-hero-later');

  await toChip('games');
  await key('ArrowUp', 1, 300); a = await where('up from chip');
  check(a.tab === 'nba', 'Up from the chip goes to the NBA tab');
  await key('ArrowDown', 1, 400); a = await where('down from the tab');
  check(a.scr === 'nba', 'Down from the tab returns to the NBA screen');

  // a 120 ms pass over the team chip: no switch
  await toChip('games');
  await key('ArrowRight', 1, 120); await key('ArrowLeft', 1, 600);
  check(await selChip() === 'games' && await shown() === 'games', `a 120 ms pass over the team chip doesn't switch (${await shown()})`);

  // Right x2, then Down before the dwell fires
  await key('ArrowRight', 1, 60); await key('ArrowRight', 1, 80);
  a = await where('on standings chip (80ms)');
  await key('ArrowDown', 1, 600);
  a = await where('down before dwell');
  console.log('   shown:', await shown(), 'sel:', await selChip());
  await shot('down-before-dwell');
  check(await shown() === 'standings', `Down from the Standings chip, pressed before the 250 ms dwell, lands in Standings (shown: ${await shown()}, focus ${a.key || a.act || a.text})`);

  // flick across all chips with the key held
  await toChip('games');
  await flood('ArrowRight', 12, 45);
  await p.waitForTimeout(700);
  a = await where('after flick right');
  check(a.sec === 'news', `flick ends on News (${a.sec})`);
  check(await selChip() === 'news' && await shown() === 'news', `News is the section shown (${await shown()}, sel ${await selChip()})`);
  await shot('flick-right');
  await flood('ArrowLeft', 12, 45);
  await p.waitForTimeout(700);
  a = await where('after flick left');
  check(a.sec === 'games' && await shown() === 'games', `flick back ends on Games (${await shown()})`);
  // one press each 260 ms: each dwell fires just as the next press lands
  for (let i = 0; i < 5; i++) await key('ArrowRight', 1, 260);
  await p.waitForTimeout(800);
  a = await where('steps right 260ms');
  check(await shown() === a.sec && (await ev(() => document.querySelectorAll('[data-screen="nba"] .nb-s:not([hidden])').length)) === 1, `one section shown, the focused chip's (${await shown()} / ${a.sec})`);
  await shot('steps-right');

  // held Up from the row never reaches the top bar
  await flood('ArrowUp', 6, 45); await p.waitForTimeout(300);
  a = await where('held up on the row');
  check(a.scr === 'nba', `held Up stays off the top bar (${a.scr})`);

  // OK on a chip switches at once and goes in
  await toChip('games');
  await key('ArrowRight', 1, 30); await key('ArrowRight', 1, 30); await key('Enter', 1, 900);
  a = await where('OK on Standings chip');
  check(await shown() === 'standings' && a.scr === 'nba' && !a.sec, `OK on a chip switches at once and goes in (${await shown()}, ${a.sec || a.key || a.text})`);

  // Back: chip, then the NBA tab, then Home
  await key('Escape', 1, 400); a = await where('back 1');
  check(a.sec === 'standings', 'Back 1 -> the Standings chip');
  await key('Escape', 1, 400); a = await where('back 2');
  check(a.tab === 'nba', 'Back 2 -> the NBA tab');
  await key('Escape', 1, 900); a = await where('back 3');
  check(await h.screen() === 'home', 'Back 3 -> Home');

  // NBA again: the section is remembered
  await ev(() => window.__tunerTest.go('nba')); await p.waitForTimeout(1500);
  a = await where('NBA again');
  check(await selChip() === 'standings' && await shown() === 'standings', `the section is remembered (${await selChip()})`);
  await shot('remembered');
  // via the top bar's dwell: Left to Live then back Right to NBA
  await toChip('standings', 300);
  await key('ArrowUp', 1, 300); a = await where('to top bar');
  await key('ArrowLeft', 1, 700); a = await where('on Live tab (dwelled)');
  await key('ArrowRight', 1, 700); a = await where('back on NBA tab');
  check(await selChip() === 'standings', `top-bar dwell back to NBA keeps Standings (${await selChip()})`);
  await key('ArrowDown', 1, 500); a = await where('down from NBA tab');
  check(a.scr === 'nba' && !a.hid, 'Down from the tab lands in NBA');
  await shot('down-from-tab');

  // Games scrolled (grid row 2), then away via go() and back
  await toChip('games');
  await key('ArrowDown', 4, 400); a = await where('games grid row 2');
  await shot('grid-scrolled');
  console.log('   bar away:', await ev(() => document.querySelector('#topbar').classList.contains('away')));
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(1200);
  await ev(() => window.__tunerTest.go('nba')); await p.waitForTimeout(1500);
  a = await where('nba after home');
  const st = await ev(() => ({ bar: document.querySelector('#topbar').classList.contains('away'), row: document.querySelector('.nb-sec').classList.contains('away'), tf: document.querySelector('[data-s="games"] .page').style.transform }));
  console.log('   state:', JSON.stringify(st));
  await shot('nba-after-home');
  check(st.bar === st.row, 'bar and section row agree after coming back');
  h.done();
};
