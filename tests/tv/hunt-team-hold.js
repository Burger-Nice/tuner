// Hunt: hold OK on a schedule tile right after moving the rail (pushed page and your team's section). Does the tile
// element survive (redraws replace it?) and does the menu open?  node tests/tv/drive.js <out> hunt-team-hold
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const h = require('./hunt-games-lib.js')(ctx);
  const { ev, check, where, start, hold, toChip } = h;
  await start();
  // count body rewrites: watch the tiles' identity
  const watch = () => ev(() => {
    window.__rewrites = 0;
    const mo = new MutationObserver((ms) => { for (const m of ms) if (m.type === 'childList' && m.target.classList?.contains('tp-body')) window.__rewrites++; });
    document.querySelectorAll('.tp-body').forEach((b) => mo.observe(b, { childList: true }));
  });
  const trial = async (label) => {
    await key('ArrowLeft', 1, 300);
    let a = await where(`${label}: tile`);
    await watch();
    await ev(() => { window.__tile = document.activeElement; });
    for (let t = 0; t < 4; t++) {
      await p.waitForTimeout(1000);
      const same = await ev(() => window.__tile === document.activeElement && window.__tile.isConnected);
      console.log(`   +${t + 1}s same element: ${same}, body rewrites: ${await ev(() => window.__rewrites)}`);
    }
    await hold();
    const m = await ev(() => [...document.querySelectorAll('.ctxmenu .lr')].map((r) => r.textContent).join(' | '));
    console.log(`   menu: ${m}`);
    check(!!m, `${label}: hold OK on the tile opens its menu`);
    await shot(`${label}-hold`);
    if (m) await key('Escape', 1, 400);
  };
  // your team's section
  await toChip('team', 1000);
  await key('ArrowDown', 2, 500);
  await trial('section');
  // several holds in a row, each right after a move
  let ok = 0;
  for (let i = 0; i < 4; i++) {
    await key(i % 2 ? 'ArrowRight' : 'ArrowLeft', 1, 250);
    await hold();
    const m = await ev(() => !!document.querySelector('.ctxmenu'));
    if (m) { ok++; await key('Escape', 1, 300); } else { const s = await h.screen(); if (s !== 'nba') { await key('Escape', 1, 800); } }
  }
  console.log(`   section: ${ok}/4 holds right after a move opened the menu`);
  check(ok === 4, `section: every hold right after a move opens the menu (${ok}/4)`);
  // a pushed page from a live game card
  await toChip('games', 900);
  await key('ArrowDown', 2, 400); await hold(); await key('Enter', 1, 1500);
  await where('pushed');
  await key('ArrowDown', 1, 500);
  await trial('pushed');
  ok = 0;
  for (let i = 0; i < 4; i++) {
    await key(i % 2 ? 'ArrowRight' : 'ArrowLeft', 1, 250);
    await hold();
    const m = await ev(() => !!document.querySelector('.ctxmenu'));
    if (m) { ok++; await key('Escape', 1, 300); }
  }
  console.log(`   pushed: ${ok}/4 holds right after a move opened the menu`);
  check(ok === 4, `pushed: every hold right after a move opens the menu (${ok}/4)`);
  h.done();
};
