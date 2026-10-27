// Hunt: the shield on my surfaces (My team, the Kings final unseen). Games hero/cards, the team page with no pinned
// copy (Season ranks' Reveal must be a button you can move to), the tile menu's Reveal, the roster Sort menu.
//   node tests/tv/drive.js <out> hunt-team-shield [pin]
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const h = require('./hunt-games-lib.js')(ctx);
  const { ev, check, where, start, hold, toChip } = h;
  const pin = process.argv[4] === 'pin';
  await start({ shield: 'mine', pin });
  let a = await where('games entry');
  console.log('   hero:', await ev(() => document.querySelector('[data-s="games"] .hero-plate')?.innerText.replace(/\s+/g, ' ')));
  console.log('   row meta:', await ev(() => document.querySelector('.nb-sec .meta')?.innerText));
  const kings = await ev(() => [...document.querySelectorAll('[data-s="games"] .gc')].filter((c) => /Kings/.test(c.innerText)).map((c) => c.innerText.replace(/\s+/g, ' ')));
  console.log('   Kings cards today:', kings);
  await shot('games-shield');
  await toChip('team', 1500);
  await key('ArrowDown', 1, 400); a = await where('header');
  console.log('   rec:', await ev(() => document.querySelector('[data-s="team"] .nb-rec')?.innerText.replace(/\s+/g, ' ')));
  await key('ArrowDown', 1, 500); a = await where('schedule');
  console.log('   ranks title:', await ev(() => [...document.querySelectorAll('[data-s="team"] .nb-title')][1]?.innerText.replace(/\s+/g, ' ')));
  const note = await ev(() => document.querySelector('[data-s="team"] .nb-notice')?.innerText.replace(/\s+/g, ' '));
  console.log('   ranks notice:', note);
  // walk down: every stop
  const stops = [];
  for (let i = 0; i < 4; i++) { await key('ArrowDown', 1, 700); const x = await h.act(); stops.push(x.key || x.act || x.text.slice(0, 20)); if (i === 0) await shot('shield-down-1'); }
  console.log('   down stops:', stops.join(' > '));
  if (note) check(stops.includes('reveal'), `the Season ranks Reveal button can be reached going down (${stops.join(' > ')})`);
  // and up from news
  for (let i = 0; i < 6; i++) { const x = await h.act(); if (x.key?.startsWith('n:')) break; await key('ArrowUp', 1, 500); }
  a = await where('news');
  await key('ArrowUp', 1, 700); a = await where('up from news');
  if (note) check(a.act === 'reveal', `Up from News reaches the Season ranks Reveal (${a.act || a.key})`);
  await shot('shield-up-from-news');
  // the tile menu: Reveal last and not focused; reveal from it
  await key('Escape', 1, 500); await key('ArrowDown', 2, 500);
  await key('ArrowLeft', 1, 400); a = await where('Kings tile');
  await hold();
  const rows = await ev(() => [...document.querySelectorAll('.ctxmenu .lr')].map((r) => r.textContent + (r === document.activeElement ? '*' : '')));
  console.log('   tile menu:', rows.join(' | '));
  check(!rows[0].includes('Reveal') && !rows.some((r) => r.includes('Reveal') && r.endsWith('*')), 'Reveal is not first and not focused');
  await key('ArrowDown', rows.length - 1, 200); a = await where('reveal row');
  await key('Enter', 1, 1200); a = await where('after reveal');
  check(a.key === 'g:401909867', `focus stays on the tile after Reveal (${a.key})`);
  console.log('   tile now:', await ev(() => document.activeElement.innerText.replace(/\s+/g, ' ')));
  console.log('   rec now:', await ev(() => document.querySelector('[data-s="team"] .nb-rec')?.innerText.replace(/\s+/g, ' ')));
  console.log('   row meta now:', await ev(() => document.querySelector('.nb-sec .meta')?.innerText));
  await shot('after-reveal');
  h.done();
};
