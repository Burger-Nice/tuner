// Bug hunt: Standings D-pad and flood tours. node tests/tv/drive.js <out> hunt-league-standings
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where, seen, flood, text, hold, closeAll, boxes, act } = H;
  await H.start({});
  await H.go('standings'); await p.waitForTimeout(1500);
  await where('chip');
  // Up from the section chip: top bar; Down back
  await key('ArrowUp', 1, 300); let a = await where('up from chip'); check(!!a.tab || /top|tab/.test(a.cls), 'Up from the chip goes to the top bar');
  await key('ArrowDown', 1, 300); a = await where('down from top bar');
  await key('ArrowDown', 1, 300); a = await where('down');
  // chips: Left from West, Right from East
  await H.go('standings'); await key('ArrowDown', 1, 300);
  await key('ArrowLeft', 1, 300); a = await where('left from West'); check(a.conf === 'West', 'Left from West stays');
  await key('ArrowRight', 2, 300); a = await where('right x2 from West'); check(a.conf === 'East', 'Right from East stays on East');
  await p.waitForTimeout(500); await shot('east');
  await key('ArrowLeft', 1, 600);
  // flood Down from the chips through the table and back up
  await key('ArrowDown', 1, 300); await where('row');
  await flood('ArrowDown', 25, 40); await p.waitForTimeout(600); a = await seen('flood down'); await shot('flood-down');
  check(a.key === 'tm:SAC', `flood down ends on the last row (${a.key})`);
  let rows = await boxes('.lg-st .nb-in > .nb-tr:not(.off)');
  check(rows.every((r) => r.top >= 80 && r.bot <= 513), `rows inside 80-513 after flood (${rows.length}: ${rows[0]?.top}..${rows[rows.length - 1]?.bot})`);
  check(await ev(() => document.querySelector('.lg-st').classList.contains('sc')), 'scrolled layout after flood');
  await flood('ArrowUp', 25, 40); await p.waitForTimeout(600); a = await seen('flood up'); await shot('flood-up');
  check(!!a.key || !!a.conf, `flood up lands on a row or the chips (${a.key || a.conf})`);
  console.log('  scrolled after flood up:', await ev(() => document.querySelector('.lg-st').classList.contains('sc')), 'bar away:', await ev(() => document.querySelector('.nb-sec').classList.contains('away')));
  // one Up at a time from the last row: never lost, the top layout comes back at row 1
  await key('ArrowDown', 1, 300); await flood('ArrowDown', 25, 40); await p.waitForTimeout(500);
  await H.go('standings'); await key('ArrowDown', 2, 300); await flood('ArrowDown', 25, 40); await p.waitForTimeout(500);
  for (let i = 0; i < 16; i++) {
    await key('ArrowUp', 1, 380); a = await act(); if (a.conf) { console.log(`  reached the chips after ${i + 1} Ups`); break; }
    const sc = await ev(() => document.querySelector('.lg-st').classList.contains('sc'));
    const r = await boxes('.lg-st .nb-in > .nb-tr:not(.off)');
    const vis = !a.hid && a.box[1] >= (sc ? 80 : 194) - 1 && a.box[3] <= 514;
    if (!vis || a.none) check(false, `Up #${i + 1}: focus ${a.key || a.conf} [${a.box}] hidden=${a.hid} sc=${sc}`);
    if (i === 6) await shot('up-walk-7');
  }
  a = await where('after 16 Ups');
  // Up into the section row and the top bar from the conf chip
  // Back twice from a row: chip, then the NBA tab
  await H.go('standings'); await key('ArrowDown', 2, 350); await where('row 1?');
  await key('ArrowDown', 9, 250); await where('row 10');
  await key('Escape', 1, 400); a = await where('back 1'); check(a.sec === 'standings', 'Back 1: the Standings chip');
  check(!(await ev(() => document.querySelector('.lg-st').classList.contains('sc'))), 'Back 1 restores the top layout');
  await key('Escape', 1, 400); a = await where('back 2'); check(a.tab === 'nba' || /NBA/.test(a.text), `Back 2: the NBA tab (${a.text})`);
  await key('ArrowDown', 1, 400); a = await where('down from NBA tab');
  await key('ArrowDown', 1, 400); a = await where('down again');
  // hold OK on the last row (a menu near the bottom: inside 27-513)
  await H.go('standings'); await key('ArrowDown', 2, 300); await flood('ArrowDown', 25, 40); await p.waitForTimeout(500);
  await hold(); await shot('hold-last');
  const m = await boxes('#overlays .ctxmenu');
  check(m.length && m.every((b) => b.top >= 27 && b.bot <= 513), `hold-OK menu inside 27-513 (${JSON.stringify(m)})`);
  a = await where('menu focus');
  await key('Escape', 1, 400); a = await where('after menu Back'); check(a.key === 'tm:SAC', `menu Back returns to the row (${a.key})`);
  check(await ev(() => document.querySelector('.lg-st').classList.contains('sc')), 'still scrolled after the menu');
  // OK on a scrolled row → team page; Back: the row, scrolled layout and top bar state
  await key('Enter', 1, 1500); await where('team page');
  await key('Escape', 1, 1000); a = await where('back from team'); await shot('back-from-team-scrolled');
  check(a.key === 'tm:SAC' && !a.hid, `Back from the team page returns to the Kings row, visible (${a.key} [${a.box}])`);
  console.log('  sc:', await ev(() => document.querySelector('.lg-st').classList.contains('sc')), 'row away:', await ev(() => document.querySelector('.nb-sec').classList.contains('away')), 'bar:', await ev(() => document.querySelector('#topbar,.topbar')?.className));
  // fast flick across the conference chips
  await key('Escape', 1, 400); await key('ArrowDown', 1, 300);
  for (let i = 0; i < 10; i++) { await key(i % 2 ? 'ArrowLeft' : 'ArrowRight', 1, 60); }
  await p.waitForTimeout(700); a = await where('after flick'); await shot('after-flick');
  const ctxl = await text('.st-ctx');
  check(a.conf === 'West' && await ev(() => document.querySelector('.st-sub .chip.sel')?.dataset.conf) === 'West', `flick ends on West, West selected (${a.conf}, sel ${await ev(() => document.querySelector('.st-sub .chip.sel')?.dataset.conf)})`);
  // section chips: flick across them
  await key('ArrowUp', 1, 300);
  for (let i = 0; i < 12; i++) await key(i < 6 ? 'ArrowRight' : 'ArrowLeft', 1, 70);
  await p.waitForTimeout(800); a = await where('section flick'); await shot('section-flick');
  console.log('  visible sections:', await ev(() => [...document.querySelectorAll('.nb-s')].filter((s) => !s.hidden).map((s) => s.dataset.s)));
  H.done();
};
