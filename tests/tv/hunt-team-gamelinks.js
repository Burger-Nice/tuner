// Hunt: the game page's team-page links under the shield (the Kings final unseen): where focus lands when the page opens
// (SPEC 8.2: a Reveal is never the default focus), the hold-OK menu on a team tab, Back.
//   node tests/tv/drive.js <out> hunt-team-gamelinks
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const h = require('./hunt-games-lib.js')(ctx);
  const { ev, check, where, start, hold, toChip } = h;
  await start({ shield: 'mine', pin: true });
  await toChip('team', 1500);
  await key('ArrowDown', 2, 500); await key('ArrowLeft', 1, 400);
  let a = await where('Kings tile (hidden)');
  await key('Enter', 1, 1500); a = await where('game page entry');
  await shot('game-hidden-entry');
  check(a.act !== 'reveal', `the game page doesn't open on its Reveal button (${a.act || a.text})`);
  // to the tabs, hold OK on the away tab
  for (let i = 0; i < 3; i++) { const x = await h.act(); if (x.cls.includes('chip')) break; await key('ArrowUp', 1, 300); }
  a = await where('tab');
  await hold();
  console.log('   tab menu:', await ev(() => [...document.querySelectorAll('.ctxmenu .lr')].map((r) => r.textContent).join(' | ')));
  await shot('game-hidden-tab-menu');
  await key('Enter', 1, 1500); a = await where('team page from the tab');
  console.log('   page:', await ev(() => document.querySelector('[data-screen="team"] .nb-plate')?.innerText.replace(/\s+/g, ' ')), '| tools:', await ev(() => document.querySelector('.tp-tools')?.innerText.replace(/\s+/g, ' ')));
  await key('Escape', 1, 1200); a = await where('back to the tab');
  check(a.cls.includes('chip') && a.scr === 'game', `Back returns to the tab (${a.text})`);
  h.done();
};
