// A hidden game in overtime: UI-SPEC AC-B1 lists "OT" among what the shield covers (it tells you the game was tied after
// 48 minutes). The live clock reads 'OT 3:12' / slab 'OT' on the surfaces. Run: node tests/tv/drive.js <out> hunt-shield-ot
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const L = require('./hunt-shield-lib.js')(ctx);
  L.setBoard(L.board([L.jazz({ state: 'in', home: 110, away: 110, period: 5, clock: '3:12', detail: '3:12 - OT' }), L.mk({ id: '900001', date: '2026-10-27T00:00Z', away: 'NY', home: 'PHI', state: 'in', as: 120, hs: 118, period: 6, clock: '0:40', detail: '0:40 - 2OT', ar: '0-3', hr: '2-1' })]));
  await L.start({ shield: process.env.MODE || 'mine', clock: '2026-10-27T03:40:00Z' });
  const ot = async (label) => {
    const hits = await L.ev(() => [...document.querySelectorAll('body *')].filter((e) => !e.children.length && e.getBoundingClientRect().width && /\b\d?OT\b|overtime/i.test(e.textContent)).map((e) => e.textContent.trim().slice(0, 40)));
    console.log(label.padEnd(16), 'hidden MEM', await L.G((m, id) => m.hidden(m.gameById(id)), L.JAZZ_ID), '| OT shown:', JSON.stringify(hits));
  };
  await L.ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(2000); await ot('home'); await shot('home');
  await L.toSection(0); await ot('hub'); await shot('hub');
  await L.toSection(1); await ot('team'); await shot('team');
  await L.ev(async (id) => (await import('/tv/js/router.js')).push('game', { id }), L.JAZZ_ID); await p.waitForTimeout(1500); await ot('game page'); await shot('game');
};
