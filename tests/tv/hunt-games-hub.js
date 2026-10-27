// Hunt: the Games section. Hero, day chips, grid scrolling (every row, safe area), Up back out, flood on the day chip,
// hold-OK menus on cards (top and scrolled rows), Back to the card, a live update under focus, Home's Tonight row.
//   node tests/tv/drive.js <out> hunt-games-hub
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const h = require('./hunt-games-lib.js')(ctx);
  const { ev, check, where, shown, selChip, start, flood, toChip, hold, offSafe } = h;
  await start();
  let a = await where('entry');
  await shot('games-entry');
  console.log('   hero text:', await ev(() => document.querySelector('[data-s="games"] .hero-plate')?.innerText.replace(/\s+/g, ' ')));
  console.log('   day row:', await ev(() => document.querySelector('[data-s="games"] .nb-days')?.innerText.replace(/\s+/g, ' ')));
  const below = await ev(() => [...document.querySelectorAll('[data-s="games"] .gc')].filter((c) => { const r = c.getBoundingClientRect(); return r.top < 540 && r.bottom > 513.5; }).map((c) => `${c.dataset.key} ${Math.round(c.getBoundingClientRect().top)}`));
  check(!below.length, `nothing drawn below y 513 in the top layout (${below.join(', ')})`);
  // Down through the whole grid
  const n = await ev(() => document.querySelectorAll('[data-s="games"] .gc').length);
  console.log('   cards:', n);
  await key('ArrowDown', 1, 400); a = await where('down 1 (day row)');
  check(a.day === '0', 'Down from the hero: the day chip');
  const rows = Math.ceil(n / 3);
  for (let r = 0; r < rows + 1; r++) {
    await key('ArrowDown', 1, 500); a = await where(`down: grid row ${r + 1}`);
    const vis = await ev(() => [...document.querySelectorAll('[data-s="games"] .gc')].map((c) => { const b = c.getBoundingClientRect(); return [c.dataset.key, Math.round(b.top), Math.round(b.bottom)]; }).filter(([, t, b]) => b > 84 && t < 540));
    const bad = vis.filter(([, t, b]) => b > 513.5 || t < 27);
    check(a.rect[3] <= 518 && a.rect[1] >= 27, `row ${r + 1}: focused card inside the screen (${a.rect})`);
    if (bad.length) console.log('   cards crossing 27/513:', JSON.stringify(bad));
    if (r === 1 || r === rows - 1) await shot(`grid-row-${r + 1}`);
  }
  // Up all the way
  const ups = [];
  for (let i = 0; i < rows + 4; i++) { await key('ArrowUp', 1, 350); const x = await h.act(); ups.push(x.key || (x.day ? `day${x.day}` : '') || x.act || (x.sec ? `chip:${x.sec}` : '') || (x.tab ? `tab:${x.tab}` : '?')); if (x.tab) break; }
  console.log('   up path:', ups.join(' > '));
  check(ups.includes('day0'), 'Up from the grid passes the day row');
  const ix = ups.findIndex((u) => u.startsWith('chip:'));
  check(ix > 0 && ups[ix] === 'chip:games', `Up from the hero lands on the Games chip (${ups[ix]})`);

  // day chips: Right, then a flood of Rights, then Left back to today
  await toChip('games'); await key('ArrowDown', 2, 400); a = await where('day chip');
  await key('ArrowRight', 1, 1200); a = await where('tomorrow');
  console.log('   day row:', await ev(() => document.querySelector('[data-s="games"] .nb-days')?.innerText.replace(/\s+/g, ' ')));
  console.log('   hero still:', await ev(() => document.querySelector('[data-s="games"] .hero-plate')?.innerText.replace(/\s+/g, ' ').slice(0, 60)));
  await shot('tomorrow');
  await flood('ArrowRight', 10, 50); await p.waitForTimeout(1500);
  a = await where('after flood right');
  const lbl = await ev(() => document.querySelector('[data-s="games"] [data-day="0"]')?.textContent);
  console.log('   label:', lbl, ' offset cards:', await ev(() => document.querySelectorAll('[data-s="games"] .gc').length));
  await shot('flood-days');
  check(a.day === '0', `focus stays on the day chip after the flood (${a.day || a.key})`);
  await flood('ArrowLeft', 11, 50); await p.waitForTimeout(1500);
  a = await where('after flood left');
  console.log('   label:', await ev(() => document.querySelector('[data-s="games"] [data-day="0"]')?.textContent));
  for (let i = 0; i < 12; i++) { const l = await ev(() => document.querySelector('[data-s="games"] [data-day="0"]')?.textContent); if (/^Today/.test(l)) break; await key(/Yesterday|Sun|Sat|Fri/.test(l) && !/Tomorrow/.test(l) ? 'ArrowRight' : 'ArrowLeft', 1, 900); }
  console.log('   label now:', await ev(() => document.querySelector('[data-s="games"] [data-day="0"]')?.textContent));

  // hold OK on a top-row card: the menu, Back closes it onto the card, the second row opens that team's page
  await key('ArrowDown', 1, 500); a = await where('top-row card');
  const card = a.key;
  await hold(); await shot('card-menu');
  const menu = await ev(() => { const m = document.querySelector('.ctxmenu'); const r = m.getBoundingClientRect(); return { rows: [...m.querySelectorAll('.lr')].map((x) => x.textContent + (x === document.activeElement ? '*' : '')), box: [r.left, r.top, r.right, r.bottom].map(Math.round) }; });
  console.log('   menu:', JSON.stringify(menu));
  check(menu.box[1] >= 27 && menu.box[3] <= 513 && menu.box[0] >= 48 && menu.box[2] <= 912, `menu inside the safe area (${menu.box})`);
  await key('Escape', 1, 400); a = await where('back closes menu');
  check(a.key === card, 'Back closes the menu onto the card');
  await hold(); await key('ArrowDown', 1, 200); await key('Enter', 1, 1500); a = await where('home team page');
  await shot('card-home-page');
  console.log('   page:', await ev(() => document.querySelector('[data-screen="team"] .nb-plate')?.innerText.replace(/\s+/g, ' ')), '| tools:', await ev(() => document.querySelector('.tp-tools')?.innerText.replace(/\s+/g, ' ')));
  await key('Escape', 1, 1000); a = await where('back to card');
  check(a.key === card, `Back from the team page returns to the card (${a.key})`);
  // the pushed page leaves the bar / row in the right state
  const st = await ev(() => ({ bar: document.querySelector('#topbar').classList.contains('away'), row: document.querySelector('.nb-sec').classList.contains('away') }));
  check(!st.bar && !st.row, `bar and row showing after Back (${JSON.stringify(st)})`);

  // a scrolled row: hold OK there; the game page and Back
  await key('ArrowDown', 2, 500); a = await where('row 3 card');
  const card3 = a.key;
  await hold(); await shot('card-menu-scrolled');
  const m3 = await ev(() => { const m = document.querySelector('.ctxmenu'); const r = m.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); });
  check(m3[1] >= 27 && m3[3] <= 513, `scrolled menu inside the safe area (${m3})`);
  await key('ArrowDown', 2, 200); await key('Enter', 1, 1500); a = await where('open the game');
  check(await h.screen() === 'game', 'Open the game opens the game page');
  await key('Escape', 1, 1000); a = await where('back from game');
  check(a.key === card3, `Back from the game returns to the scrolled card (${a.key})`);
  const st3 = await ev(() => ({ bar: document.querySelector('#topbar').classList.contains('away'), row: document.querySelector('.nb-sec').classList.contains('away'), tf: document.querySelector('[data-s="games"] .page').style.transform, cover: !document.querySelector('[data-s="games"] .hub-cover').hidden }));
  console.log('   after back:', JSON.stringify(st3));
  check(st3.bar === st3.row && (!!st3.tf === st3.bar), 'scrolled layout consistent after Back (bar, row, page shift)');
  await shot('back-from-game-scrolled');

  // live update under focus: a live game in the top row goes final, the list re-orders
  await key('Escape', 1, 500);
  await toChip('games'); await key('ArrowDown', 3, 500); await key('ArrowRight', 1, 300); a = await where('focus a live card');
  const k0 = a.key;
  const before = await ev(() => [...document.querySelectorAll('[data-s="games"] .gc')].map((c) => c.dataset.key));
  // end the first live game in the board (and every one after it) so the order changes
  const b2 = JSON.parse(JSON.stringify(h.board));
  for (const e of b2.events) if (e.status?.type?.state === 'in') { e.status.type.state = 'post'; e.status.type.completed = true; e.status.type.shortDetail = 'Final'; e.status.type.name = 'STATUS_FINAL'; break; }
  await p.unroute('**/espn/scoreboard*');
  await p.route('**/espn/scoreboard*', (r) => r.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(b2) }));
  await p.clock.fastForward(16000); await p.waitForTimeout(1500);
  const after = await ev(() => [...document.querySelectorAll('[data-s="games"] .gc')].map((c) => c.dataset.key));
  a = await where('after the update');
  console.log('   order before:', before.slice(0, 4).join(' '), '| after:', after.slice(0, 4).join(' '));
  check(a.key === k0, `focus stays on the same game after the re-order (${k0} -> ${a.key})`);
  await shot('after-live-update');

  // Home's Tonight row: hold OK
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(1500);
  const has = await ev(() => !!document.querySelector('[data-screen="home"] [data-rail="games"] .gc'));
  console.log('   home tonight row:', has);
  if (has) {
    await ev(() => { const c = document.querySelector('[data-screen="home"] [data-rail="games"] .gc:nth-child(2)'); c.focus(); c.dispatchEvent(new CustomEvent('tvfocus', { bubbles: true })); }); await p.waitForTimeout(500);
    a = await where('home tonight card');
    const hk = a.key;
    await hold(); await shot('home-card-menu');
    const hm = await ev(() => { const m = document.querySelector('.ctxmenu'); const r = m.getBoundingClientRect(); return { rows: [...m.querySelectorAll('.lr')].map((x) => x.textContent), box: [r.left, r.top, r.right, r.bottom].map(Math.round) }; });
    console.log('   home menu:', JSON.stringify(hm));
    const cardTeams = await ev(() => [...document.activeElement.querySelectorAll('.nm')].map((x) => x.textContent));
    console.log('   card teams:', cardTeams);
    check(hm.rows[0]?.startsWith(cardTeams[0]) && hm.rows[1]?.startsWith(cardTeams[1]), 'Home menu names the card\'s teams');
    check(hm.box[3] <= 513 && hm.box[1] >= 27, `Home menu inside the safe area (${hm.box})`);
    await key('Enter', 1, 1500); a = await where('home: away page');
    console.log('   tools:', await ev(() => document.querySelector('.tp-tools')?.innerText.replace(/\s+/g, ' ')));
    await shot('home-team-page');
    await key('Escape', 1, 1000); a = await where('back to home card');
    check(a.key === hk && a.scr === 'home', `Back returns to the Home card (${a.key})`);
  }
  console.log('offsafe now:', (await offSafe()).slice(0, 8));
  h.done();
};
