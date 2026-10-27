// Hunt: a hidden game tied at the end of regulation (ESPN: state 'in', period 4, 0:00, "End of 4th"): does any surface
// tell it's going to overtime? (catch-up 7.1: no OT; a hidden live game with a replay source.) Live 03:20.
// Run: node tests/tv/drive.js <out> hunt2-catchup-endq4
module.exports = async (ctx) => {
  const { p, shot } = ctx;
  const L = require('./hunt-shield-lib.js')(ctx);
  L.setBoard(L.board([L.jazz({ state: 'in', home: 108, away: 108, period: 4, clock: '0:00', detail: 'End of 4th' })]));
  await L.start({ shield: 'mine', clock: '2026-10-27T03:20:00Z' });
  const look = async (label) => {
    const hits = await L.ev(() => [...document.querySelectorAll('body *')].filter((e) => !e.children.length && e.getBoundingClientRect().width && /End Q4|Q4\s*0:00|0:00|End of/i.test(e.textContent)).map((e) => e.textContent.trim().slice(0, 40)));
    console.log(label.padEnd(12), 'hidden', await L.G((m, id) => m.hidden(m.gameById(id)), L.JAZZ_ID), '| shown:', JSON.stringify(hits));
  };
  await L.ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(3000); await look('home'); await shot('home');
  await L.toSection(0); await look('hub'); await shot('hub');
  await L.toSection(1); await look('team'); await shot('team');
  await L.ev(async (id) => (await import('/tv/js/router.js')).push('game', { id }), L.JAZZ_ID); await p.waitForTimeout(1500); await look('game page'); await shot('game');
};
