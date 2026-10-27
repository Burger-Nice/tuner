// Hunt: deep flows on the team page. A story's team button from a pushed page (Back to the card, scrolled), the player
// sheet from the roster (OK, hold OK -> Player card, keys inside, Back), a player who hasn't played, Back from a deep
// scrolled pushed page.  node tests/tv/drive.js <out> hunt-team-deep
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const h = require('./hunt-games-lib.js')(ctx);
  const { ev, check, where, start, hold, toChip, offSafe } = h;
  await start();
  const sy = (scr) => ev((scr) => document.querySelector(scr === 'team' ? '[data-screen="team"] .tp-body' : '[data-s="team"] .tp-body')?.style.getPropertyValue('--sy'), scr);
  // a pushed page (game card), down to its News rail
  await key('ArrowDown', 2, 400); await hold(); await key('Enter', 1, 1500);
  let a = await where('pushed A');
  for (let i = 0; i < 5; i++) { const x = await h.act(); if (x.key?.startsWith('n:')) break; await key('ArrowDown', 1, 600); }
  await key('ArrowRight', 1, 400); a = await where('A news card 2');
  const card = a.key;
  console.log('   A --sy', await sy('team'));
  await key('Enter', 1, 1500); a = await where('reader');
  // scroll the reader to its end, then the team buttons
  for (let i = 0; i < 40; i++) { const x = await h.act(); if (x.act === 'team') break; await key('ArrowDown', 1, 120); }
  a = await where('reader team button');
  await shot('reader-end');
  if (a.act === 'team') {
    await key('Enter', 1, 1500); a = await where('pushed B');
    console.log('   B:', await ev(() => document.querySelector('[data-screen="team"] .nb-plate')?.innerText.replace(/\s+/g, ' ')));
    await key('Escape', 1, 1500); a = await where('back to A');
    check(a.key === card, `Back from B returns to A's news card (${a.key} vs ${card})`);
    const s = await sy('team');
    console.log('   A --sy after back', s, 'bar away', await ev(() => document.querySelector('#topbar').classList.contains('away')));
    check(s !== '0px', 'A is still scrolled to its News');
    await shot('back-to-A-news');
    console.log('   offsafe:', JSON.stringify(await offSafe()));
  }
  // A: roster, OK on a row: the sheet; keys inside; Back
  await key('ArrowDown', 1, 700); a = await where('A roster row 1');
  await key('ArrowDown', 3, 200); a = await where('A roster row 4');
  const row = a.key;
  await key('Enter', 1, 1200); a = await where('sheet');
  const sheet = await ev(() => { const s = document.querySelector('.nb-pl'); const r = s.getBoundingClientRect(); return { box: [r.left, r.top, r.right, r.bottom].map(Math.round), text: s.innerText.replace(/\s+/g, ' ') }; });
  console.log('   sheet:', JSON.stringify(sheet));
  check(sheet.box[1] >= 27 && sheet.box[3] <= 513 && sheet.box[2] <= 912, `sheet inside the safe area (${sheet.box})`);
  await shot('sheet');
  for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) { await key(k, 1, 200); const x = await h.act(); if (x.none || !x.ov) check(false, `${k} inside the sheet keeps focus in it (${x.scr})`); }
  await key('Escape', 1, 600); a = await where('sheet closed');
  check(a.key === row, `Back closes the sheet onto the row (${a.key})`);
  // hold OK: Player card
  await hold();
  console.log('   row menu:', await ev(() => [...document.querySelectorAll('.ctxmenu .lr')].map((r) => r.textContent).join(' | ')));
  const m = await ev(() => { const r = document.querySelector('.ctxmenu').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); });
  check(m[1] >= 27 && m[3] <= 513, `row menu inside (${m})`);
  await shot('row-menu');
  await key('Enter', 1, 1200); a = await where('player card');
  check(a.ov, 'Player card opens the sheet');
  await key('Escape', 1, 600); a = await where('closed');
  check(a.key === row, `Back returns to the row (${a.key})`);
  // the last rows: Hasn't played; the sheet for him
  await key('ArrowDown', 20, 150); a = await where('last row');
  await key('Enter', 1, 1200); a = await where('sheet: hasn\'t played');
  console.log('   sheet:', await ev(() => document.querySelector('.nb-pl')?.innerText.replace(/\s+/g, ' ')));
  const nm = await ev(() => { const n = document.querySelector('.nb-pl h3'); return n ? [n.scrollWidth, n.clientWidth] : null; });
  console.log('   name box', nm);
  await shot('sheet-0gp');
  await key('Escape', 1, 600);
  // Back from deep on the pushed page: where does it go?
  await key('Escape', 1, 1200); a = await where('back from A roster');
  console.log('   screen', await h.screen());
  check(await h.screen() === 'nba', `Back from a pushed page's roster returns to the opener (screen ${await h.screen()})`);
  h.done();
};
