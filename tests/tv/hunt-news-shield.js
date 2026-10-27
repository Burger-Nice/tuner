// Bug hunt: News under the shield (SPEC 6, 8.3), at the mocks' moment (Mon 26 Oct 23:40, the Kings final of Sun unseen):
// covered rows and preview, the card (Keep it hidden / Reveal), focus after each, no result text anywhere.
// node tests/tv/drive.js <out> hunt-news-shield
const fs = require('fs'), path = require('path');
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where, seen, text, json } = H;
  const sched = H.fx('schedule-29.json'), sb = H.fx('scoreboard.json');
  const jazz = sched.events.find((e) => e.id === '401909875');
  const board = { ...sb, day: { date: '2026-10-26' }, events: [jazz, ...sb.events.filter((e) => e.id !== '401909850')] };
  await H.start({ clock: '2026-10-26T23:40:00Z', settings: { shield: 'mine' }, seen: { upTo: Date.parse('2026-10-25T12:00:00Z'), ids: [] },
    routes: [[/127\.0\.0\.1:8899\/espn\/scoreboard/, (r) => json(r, board)]] });
  const SPOIL = /123-112|aim for 4th straight win|Sacramento faces San Antonio on 3-game slide|Ty Jerome scores 31/;
  const leak = async (label) => {
    const t = await ev(() => [...document.querySelectorAll('.nb-s[data-s="news"] .nb-nrow, .nb-s[data-s="news"] .nb-prev, #overlays .ov')].filter((e) => !e.closest('[hidden]')).map((e) => e.textContent).join(' || '));
    const m = t.match(SPOIL); check(!m, `${label}: no result shows${m ? ` (found "${m[0]}")` : ''}`);
  };
  await H.go('news'); await p.waitForTimeout(3000);
  console.log('  unseen:', await ev(async () => { const G = await import('/tv/js/games.js'); return G.unseenFor().map((g) => `${g.away.abbr}@${g.home.abbr}`).join(); }));
  const rows = await ev(() => [...document.querySelectorAll('.nb-s[data-s="news"] .nb-nrow')].map((r) => `${r.classList.contains('cov') ? 'COV ' : ''}${r.querySelector('b').textContent.slice(0, 50)}`));
  console.log(rows.join('\n'));
  await leak('the list');
  await shot('shield-list');
  // walk every row: the preview never shows a result (incl. during the 150 ms before it updates)
  await key('ArrowDown', 1, 400);
  for (let i = 0; i < rows.length; i++) { await key('ArrowDown', 1, 60); await leak(`row ${i + 2} (fast)`); }
  await p.waitForTimeout(400); await leak('after the walk');
  // the first covered row
  const ci = rows.findIndex((r) => r.startsWith('COV'));
  await ev(async (i) => { const f = await import('/tv/js/focus.js'); f.focus(document.querySelectorAll('.nb-s[data-s="news"] .nb-nrow')[i]); }, ci); await p.waitForTimeout(500);
  await where('covered row'); await shot('covered-preview'); console.log('  preview:', await text('.nb-s[data-s="news"] .nb-prev'));
  await key('Enter', 1, 700); let a = await where('OK: the card'); await shot('covered-card');
  check(a.act === 'keep', 'the card opens with Keep it hidden focused');
  const cardBox = await H.boxes('#overlays .nb-covcard'); console.log('  card:', JSON.stringify(cardBox.map(({ l, r, top, bot }) => [l, r, top, bot])), await text('#overlays .nb-covcard'));
  await key('Escape', 1, 500); a = await where('Back closes the card'); check(a.key && a.key.startsWith('n:') && !(await H.ovOpen()), 'Back closes the card, focus on the row');
  await key('Enter', 1, 600); await key('Enter', 1, 600); a = await where('Keep it hidden'); check(a.key && a.key.startsWith('n:'), 'Keep it hidden: back on the row');
  await leak('after Keep it hidden');
  const rowKey = a.key;
  await key('Enter', 1, 600); await key('ArrowRight', 1, 300); a = await where('Reveal'); check(a.act === 'reveal', 'Right: the Reveal');
  await key('Enter', 1, 1500); a = await where('after Reveal'); await shot('after-reveal');
  console.log('  overlay:', (await text('#overlays .ov')).slice(0, 120));
  check(await ev(() => !!document.querySelector('#overlays .nb-read')), 'Reveal opens the story');
  await key('Escape', 1, 700); a = await where('Back from the story'); await shot('after-reveal-back');
  check(a.key === rowKey && !a.cls.includes('cov'), `Back: the same row, now uncovered (${a.key} ${a.cls})`);
  console.log(await ev(() => [...document.querySelectorAll('.nb-s[data-s="news"] .nb-nrow')].map((r) => `${r.classList.contains('cov') ? 'COV ' : ''}${r.querySelector('b').textContent.slice(0, 50)}`).join('\n')));
  H.done();
};
