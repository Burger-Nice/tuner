// Hunt: pushed team pages several deep (game card -> team -> its schedule tile's opponent -> All teams -> another),
// Back to each opener, the tools row, Make my team, long names.  node tests/tv/drive.js <out> hunt-team-pushed
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const h = require('./hunt-games-lib.js')(ctx);
  const { ev, check, where, shown, start, hold, toChip, offSafe } = h;
  await start();
  const head = () => ev(() => { const s = document.querySelector('[data-screen="team"]'); return { name: s?.querySelector('.nb-plate')?.innerText.replace(/\s+/g, ' '), tools: s?.querySelector('.tp-tools')?.innerText.replace(/\s+/g, ' '), rec: s?.querySelector('.nb-rec')?.innerText.replace(/\s+/g, ' '), next: s?.querySelector('.nb-next')?.innerText.replace(/\s+/g, ' ') }; });
  await key('ArrowDown', 2, 400); let a = await where('games card');
  const card = a.key;
  await hold(); await key('Enter', 1, 1500); a = await where('page 1 entry');
  console.log('   page 1:', JSON.stringify(await head()));
  check(/btn/.test(a.cls) && a.scr === 'team', 'page 1: focus on the header primary');
  await shot('page1');
  console.log('   offsafe:', JSON.stringify(await offSafe()));
  await key('ArrowUp', 1, 400); a = await where('page 1 up');
  check(a.act === 'mine', 'Up: the tools row');
  await key('ArrowUp', 1, 400); a = await where('page 1 up 2');
  check(a.tab != null && a.scr === 'topbar', `Up again: the top bar (${a.scr})`);
  await key('ArrowDown', 1, 400); a = await where('down from bar');
  check(a.scr === 'team', `Down from the bar returns to the page (${a.scr} ${a.act || a.text})`);
  // to the schedule, move the window, hold OK on a tile, open its opponent page
  for (let i = 0; i < 4; i++) { const x = await h.act(); if (x.key?.startsWith('g:')) break; await key('ArrowDown', 1, 400); }
  await key('ArrowLeft', 1, 300); a = await where('page 1 tile');
  const tile1 = a.key;
  await hold();
  console.log('   tile menu:', await ev(() => [...document.querySelectorAll('.ctxmenu .lr')].map((r) => r.textContent).join(' | ')));
  await shot('tile-menu');
  await key('Enter', 1, 1500); a = await where('page 2 entry');
  console.log('   page 2:', JSON.stringify(await head()));
  check(a.scr === 'team' && /btn/.test(a.cls), 'page 2 entry on the header primary');
  await shot('page2');
  // All teams -> Timberwolves
  await key('ArrowUp', 1, 300); await key('ArrowRight', 1, 300); a = await where('All teams');
  await key('Enter', 1, 700); a = await where('picker');
  await shot('picker');
  const pk = await ev(() => { const m = document.querySelector('.tp-pick'); const r = m.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); });
  check(pk[1] >= 27 && pk[3] <= 513, `picker inside the safe area (${pk})`);
  // walk the picker: right to the end, down to the second conference
  await key('ArrowRight', 6, 120); a = await where('picker right x6');
  await key('ArrowDown', 3, 150); a = await where('picker down x3');
  await key('ArrowDown', 1, 150); a = await where('picker down (into East?)');
  await shot('picker-east');
  // find MIN
  await ev(() => { const c = document.querySelector('.tp-pick [data-pick="MIN"]'); c.focus(); c.dispatchEvent(new CustomEvent('tvfocus', { bubbles: true })); });
  await key('Enter', 1, 1500); a = await where('page 3 (MIN)');
  check(['watch','game','box','retry'].includes(a.act), `a page opened from the picker: focus on the header primary (${a.act || a.text})`);
  await p.waitForTimeout(1500); a = await where('page 3, 1.5 s later');
  console.log('   page 3:', JSON.stringify(await head()));
  await shot('page3-wolves');
  console.log('   offsafe:', JSON.stringify(await offSafe()));
  // POR via the picker, its header (long name)
  if ((await h.act()).act !== 'all') { await key('ArrowUp', 1, 300); await key('ArrowRight', 1, 300); }
  await key('Enter', 1, 700);
  await ev(() => { const c = document.querySelector('.tp-pick [data-pick="POR"]'); c.focus(); c.dispatchEvent(new CustomEvent('tvfocus', { bubbles: true })); });
  await key('Enter', 1, 1500); a = await where('page 4 (POR)');
  check(['watch','game','box','retry'].includes(a.act), `page 4 from the picker: focus on the header primary (${a.act || a.text})`);
  console.log('   page 4:', JSON.stringify(await head()));
  await shot('page4-blazers');
  const plate = await ev(() => { const n = document.querySelector('[data-screen="team"] .nb-plate .nk'); return n ? [n.scrollWidth, n.clientWidth, n.getBoundingClientRect().right] : null; });
  console.log('   nickname box:', plate);
  // Back x4: each opener
  await key('Escape', 1, 1200); a = await where('back 1');
  console.log('   ', JSON.stringify(await head()));
  check(a.act === 'all' && /Timberwolves/.test((await head()).name), `Back 1: the Timberwolves page, on All teams (${a.act})`);
  await key('Escape', 1, 1200); a = await where('back 2');
  console.log('   ', JSON.stringify(await head()));
  check(a.act === 'all', `Back 2: page 2 on All teams (${a.act})`);
  await key('Escape', 1, 1200); a = await where('back 3');
  console.log('   ', JSON.stringify(await head()));
  check(a.key === tile1, `Back 3: page 1 on the tile it was opened from (${a.key} vs ${tile1})`);
  const sy = await ev(() => document.querySelector('[data-screen="team"] .tp-body').style.getPropertyValue('--sy'));
  console.log('   page 1 --sy', sy);
  await shot('back3');
  await key('Escape', 1, 1200); a = await where('back 4');
  check(a.key === card && await h.screen() === 'nba', `Back 4: the game card (${a.key})`);
  const st = await ev(() => ({ bar: document.querySelector('#topbar').classList.contains('away'), row: document.querySelector('.nb-sec').classList.contains('away') }));
  check(!st.bar && !st.row, `bar and row showing (${JSON.stringify(st)})`);

  // Make my team on a pushed page
  await hold(); await key('ArrowDown', 1, 200); await key('Enter', 1, 1500); a = await where('home side page');
  const other = (await head()).name;
  await key('ArrowUp', 1, 300); a = await where('make mine');
  await key('Enter', 1, 600); await key('ArrowRight', 1, 200); a = await where('confirm yes');
  await key('Enter', 1, 1200); a = await where('after yes');
  console.log('   tools:', (await head()).tools, '| status:', await ev(() => document.querySelector('[data-screen="team"] .nb-head .st')?.innerText));
  await shot('made-mine');
  check(a.act === 'all', 'focus on All teams after making them my team');
  await key('Escape', 1, 1200); a = await where('back to nba');
  const chip = await ev(() => document.querySelector('.nb-sec [data-sec="team"]')?.textContent);
  console.log('   team chip now:', chip, '(was opened page:', other, ')');
  check(other.includes(chip), `the section row's team chip follows (${chip})`);
  await shot('chip-after-make');
  // the team section now shows that team
  await toChip('team', 1200);
  console.log('   team section plate:', await ev(() => document.querySelector('[data-s="team"] .nb-plate')?.innerText.replace(/\s+/g, ' ')));
  await key('ArrowDown', 1, 500); a = await where('team section entry');
  await shot('team-section-new');
  // the Games hero now: your new team's game, or none
  await toChip('games', 1200);
  console.log('   games hero:', await ev(() => document.querySelector('[data-s="games"] .hero-plate')?.innerText.replace(/\s+/g, ' ').slice(0, 80)));
  await shot('games-after-make');
  h.done();
};
