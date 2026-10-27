// Hunt: your team's section. Header, schedule rail (window, slots, ends, flood, CH±), Season ranks / News rails (flood,
// peek), the roster (flood to the end, whole rows, sort, Up/Down edges), Back from deep, and the safe area at each stop.
//   node tests/tv/drive.js <out> hunt-team-page
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const h = require('./hunt-games-lib.js')(ctx);
  const { ev, check, where, shown, start, flood, toChip, offSafe } = h;
  await start();
  await toChip('team', 1000);
  await key('ArrowDown', 1, 400); let a = await where('header primary');
  console.log('   offsafe top:', JSON.stringify(await offSafe()));
  await key('ArrowRight', 1, 300); a = await where('header right');
  await key('ArrowRight', 1, 300); a = await where('header right 2');
  await key('ArrowDown', 1, 500); a = await where('schedule tile (from button 2)');
  check(a.key === 'g:401909875', `Down from the header lands on the next game (${a.key})`);
  const slot = () => ev(() => { const a = document.activeElement; return [...a.parentElement.children].indexOf(a); });
  const rail = () => ev(() => [...document.querySelectorAll('.tp-sched > *')].map((t) => { const r = t.getBoundingClientRect(); return `${t.dataset.key?.slice(-3)}${t.classList.contains('pk') ? 'p' : ''}@${Math.round(r.left)}`; }).join(' '));
  console.log('   rail:', await rail(), 'slot', await slot());
  // flood right to the season's end
  await flood('ArrowRight', 90, 40); await p.waitForTimeout(800);
  a = await where('after flood right');
  console.log('   rail:', await rail(), 'slot', await slot());
  await shot('sched-end');
  const end = await ev(() => { const a = document.activeElement, r = a.getBoundingClientRect(); return { r: [r.left, r.right].map(Math.round), pk: a.classList.contains('pk') }; });
  check(end.r[1] <= 912 && !end.pk, `the last game's tile is whole and inside x 912 (${end.r})`);
  const txtPast = await ev(() => [...document.querySelectorAll('.tp-sched > *')].filter((t) => !t.classList.contains('pk') && t.getBoundingClientRect().right > 913).map((t) => t.dataset.key));
  check(!txtPast.length, `no tile with text past x 912 (${txtPast})`);
  // CH- a month back, CH+ a month on
  await key('PageDown', 1, 500); a = await where('CH- (a month back)');
  await key('PageUp', 1, 500); a = await where('CH+');
  // flood left to the first game
  await flood('ArrowLeft', 95, 40); await p.waitForTimeout(800);
  a = await where('after flood left');
  console.log('   rail:', await rail(), 'slot', await slot());
  check(await slot() === 0, 'the first game sits in slot 1 at the start');
  await shot('sched-start');
  // Up from the schedule: the header; then the section row
  await key('ArrowUp', 1, 400); a = await where('up from schedule');
  check(a.scr === 'nba' && /btn/.test(a.cls), 'Up from the schedule: the header buttons');
  await key('ArrowUp', 1, 400); a = await where('up from header');
  check(a.sec === 'team', `Up from the header: the team chip (${a.sec})`);
  await key('ArrowDown', 1, 400); a = await where('down again');
  await key('ArrowDown', 1, 400); a = await where('schedule again');
  console.log('   rail:', await rail(), 'slot', await slot());
  // Season ranks rail: flood right
  await key('ArrowDown', 1, 700); a = await where('ranks');
  await flood('ArrowRight', 15, 45); await p.waitForTimeout(700);
  a = await where('ranks end');
  const rk = await ev(() => [...document.querySelectorAll('.tp-ranks > *')].map((t) => { const r = t.getBoundingClientRect(); return `${(t.dataset.key || '').slice(3, 9)}${t.classList.contains('pk') ? 'p' : ''}@${Math.round(r.left)}-${Math.round(r.right)}`; }).join(' '));
  console.log('   ranks:', rk);
  check(a.rect[2] <= 918 && a.rect[0] >= 40, `last rank tile on screen (${a.rect})`);
  await shot('ranks-end');
  console.log('   offsafe ranks:', JSON.stringify(await offSafe()));
  await flood('ArrowLeft', 15, 45); await p.waitForTimeout(700);
  a = await where('ranks start');
  // News rail
  await key('ArrowDown', 1, 700); a = await where('news');
  await flood('ArrowRight', 15, 45); await p.waitForTimeout(700);
  a = await where('news end');
  console.log('   news:', await ev(() => [...document.querySelectorAll('.tp-news > *')].map((t) => `${t.classList.contains('pk') ? 'p' : ''}@${Math.round(t.getBoundingClientRect().left)}`).join(' ')));
  check(a.rect[2] <= 918, `last news card on screen (${a.rect})`);
  await shot('news-end');
  console.log('   offsafe news:', JSON.stringify(await offSafe()));
  // OK on a news card: the reader; Back returns to the card
  const nk = a.key;
  await key('Enter', 1, 1500); a = await where('news OK');
  await shot('news-reader');
  await key('Escape', 1, 700); a = await where('reader back');
  check(a.key === nk, `Back from the story returns to its card (${a.key})`);
  // Roster: flood down to the end
  await key('ArrowDown', 1, 700); a = await where('roster row 1');
  await flood('ArrowDown', 25, 45); await p.waitForTimeout(800);
  a = await where('roster end');
  const rr = await ev(() => [...document.querySelectorAll('.tp-roster > .nb-tr')].map((r) => { const b = r.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; }).filter(([t, b]) => b > 0 && t < 540));
  console.log('   rows on screen:', rr.length, JSON.stringify(rr.slice(-3)));
  check(rr.every(([t, b]) => b <= 513.5 || t >= 540), 'roster: nothing below 513');
  check(a.rect[3] <= 513, `last row inside (${a.rect})`);
  await shot('roster-end');
  console.log('   offsafe roster:', JSON.stringify(await offSafe()));
  // flood up: where does it stop?
  await flood('ArrowUp', 25, 45); await p.waitForTimeout(800);
  a = await where('roster after flood up');
  await shot('roster-flood-up');
  // back into the roster: Down x3 from the header... go to row 1 by the page's hooks
  for (let i = 0; i < 8; i++) { const x = await h.act(); if (x.key?.startsWith('pl:')) break; await key('ArrowDown', 1, 500); }
  await key('ArrowUp', 1, 400); a = await where('pill');
  check(a.act === 'sort', 'Up from row 1: the Sort pill');
  for (const want of ['Rebounds', 'Assists', 'Minutes', 'Field goal %', '3-point %', 'Jersey number', 'Name', 'Points']) {
    await key('Enter', 1, 600);
    const opts = await ev(() => [...document.querySelectorAll('.tp-sortm .lr')].map((x) => x.textContent.trim()));
    const i = opts.findIndex((o) => o.startsWith(want));
    const cur = await ev(() => [...document.querySelectorAll('.tp-sortm .lr')].indexOf(document.activeElement));
    if (i !== cur) await key(i > cur ? 'ArrowDown' : 'ArrowUp', Math.abs(i - cur), 150);
    await key('Enter', 1, 700);
    a = await where(`sorted ${want}`);
    check(a.act === 'sort', `after sorting by ${want}, focus is back on the pill`);
    const rows = await ev(() => [...document.querySelectorAll('.tp-roster > .nb-tr')].map((r) => [...r.querySelectorAll('.c, .nm')].map((c) => c.textContent.trim())));
    console.log(`   ${want}: ${rows.slice(0, 3).map((r) => r.join(' ')).join(' | ')}  ...  ${rows.slice(-2).map((r) => r.join(' ')).join(' | ')}`);
    console.log('     pill:', await ev(() => document.querySelector('.tp-pill')?.textContent), '| small:', await ev(() => document.querySelector('.tp-pill')?.parentElement.querySelector('small')?.textContent));
    if (want === 'Jersey number') { const j = rows.map((r) => r[0] === '' ? 999 : +r[0]); check(j.every((v, k) => !k || v >= j[k - 1]), `jersey order ascending (${j.join(',')})`); }
    if (want === 'Name') { const nm = rows.map((r) => r[1]); check(nm.every((v, k) => !k || v.localeCompare(nm[k - 1]) >= 0), 'name order'); await shot('sort-name'); }
  }
  // Down from the pill: the first row; Back from the roster: the chip and the top
  await key('ArrowDown', 3, 300);
  await key('Escape', 1, 600); a = await where('back from roster');
  check(a.sec === 'team', 'Back from the roster: the team chip');
  const st = await ev(() => ({ bar: document.querySelector('#topbar').classList.contains('away'), row: document.querySelector('.nb-sec').classList.contains('away'), sy: document.querySelector('[data-s="team"] .tp-body').style.getPropertyValue('--sy') }));
  console.log('   state:', JSON.stringify(st));
  check(!st.bar && !st.row && st.sy === '0px', 'the page is back at the top');
  await shot('back-top');
  await key('ArrowDown', 1, 400); a = await where('down after back');
  check(/btn/.test(a.cls) && a.scr === 'nba', `Down after Back: the header (${a.text})`);
  await key('ArrowDown', 1, 400); a = await where('schedule after back');
  console.log('   rail:', await rail(), 'slot', await slot());
  check(a.key === 'g:401909875', `the schedule is back on the next game (${a.key})`);
  h.done();
};
