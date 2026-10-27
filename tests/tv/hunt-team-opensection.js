// Hunt: sections opened from elsewhere (Season ranks -> Team stats; the roster's player sheet -> Leaders; a pushed
// team page's Season ranks -> Team stats), then Up / Back from there.  node tests/tv/drive.js <out> hunt-team-opensection
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const h = require('./hunt-games-lib.js')(ctx);
  const { ev, check, where, shown, selChip, start, toChip } = h;
  await start();
  await toChip('team', 900);
  await key('ArrowDown', 1, 400); await key('ArrowDown', 1, 400); await key('ArrowDown', 1, 800);
  let a = await where('season ranks');
  await key('ArrowRight', 2, 300); a = await where('ranks: 3rd tile');
  await key('Enter', 1, 1200); a = await where('OK: team stats');
  check(await shown() === 'teamstats' && await selChip() === 'teamstats', `Team stats shown and its chip selected (${await shown()} / ${await selChip()})`);
  await shot('ranks-to-teamstats');
  const rk = await ev(() => document.querySelector('#topbar').classList.contains('away') || document.querySelector('.nb-sec').classList.contains('away'));
  check(!rk, 'the bar and section row are back (not stepped away)');
  // Up from the category column: the section row, on the Team stats chip
  for (let i = 0; i < 12; i++) { const x = await h.act(); if (x.sec || x.tab) break; await key('ArrowUp', 1, 150); }
  a = await where('up to the row');
  check(a.sec === 'teamstats', `Up lands on the Team stats chip (${a.sec})`);
  await p.waitForTimeout(700);
  check(await shown() === 'teamstats', `and Team stats stays shown (${await shown()})`);
  await shot('teamstats-up');
  // Back from Team stats' content after openSection
  await key('ArrowDown', 1, 500); await key('Escape', 1, 500); a = await where('back from teamstats');
  check(a.sec === 'teamstats', `Back goes to the Team stats chip (${a.sec})`);

  // the roster's player sheet: 1st in the NBA in points -> Leaders
  await toChip('team', 900);
  await key('ArrowDown', 1, 400); await key('ArrowDown', 1, 400); await key('ArrowDown', 3, 800);
  a = await where('roster row 1');
  await key('Enter', 1, 1200); a = await where('sheet');
  if (a.act === 'leaders') {
    await key('Enter', 1, 1200); a = await where('leaders');
    check(await shown() === 'leaders', `Leaders shown (${await shown()})`);
    await shot('sheet-to-leaders');
    for (let i = 0; i < 12; i++) { const x = await h.act(); if (x.sec || x.tab) break; await key('ArrowUp', 1, 150); }
    a = await where('up to the row');
    check(a.sec === 'leaders', `Up lands on the Leaders chip (${a.sec})`);
    await p.waitForTimeout(700);
    check(await shown() === 'leaders', `and Leaders stays shown (${await shown()})`);
    await shot('leaders-up');
  } else console.log('   (no leaders button)');

  // a pushed team page's Season ranks -> Team stats: from a pushed page, the NBA tab; Back?
  await toChip('games', 900);
  await key('ArrowDown', 2, 400); a = await where('grid card');
  await h.hold(); await key('Enter', 1, 1500); a = await where('pushed page');
  const pushedAbbr = await ev(() => window.__tunerTest && document.querySelector('[data-screen="team"] .nb-plate .nk')?.textContent);
  console.log('   pushed:', pushedAbbr);
  await key('ArrowDown', 2, 800); a = await where('pushed: ranks');
  await key('Enter', 1, 1500); a = await where('pushed ranks -> ?');
  console.log('   screen:', await h.screen(), 'shown:', await shown());
  await shot('pushed-ranks-teamstats');
  const teamCat = await ev(() => document.querySelector('[data-s="teamstats"] .nb-tr.mine, [data-s="teamstats"] .mine')?.textContent?.trim().slice(0, 40));
  console.log('   teamstats highlighted row:', teamCat);
  await key('Escape', 1, 600); a = await where('back from there');
  console.log('   screen after back:', await h.screen());
  h.done();
};
