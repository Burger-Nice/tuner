// The Games section's other days: Yesterday holds the unseen Kings final (and a Knicks final). The cards, counts and
// hold-OK menu must not tell it. Run: [MODE=all] node tests/tv/drive.js <out> hunt-shield-days
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const L = require('./hunt-shield-lib.js')(ctx);
  L.days['20261025'] = { day: { date: '2026-10-25' }, events: [
    L.withRecords(L.sched.events.find((e) => e.id === L.SAC_ID), { MEM: '3-0', SAC: '0-3' }),
    L.mk({ id: '900002', date: '2026-10-25T23:30Z', away: 'BOS', home: 'NY', state: 'post', as: 110, hs: 98, ar: '2-1', hr: '0-3', period: 5 }),
  ] };
  await L.start({ shield: process.env.MODE || 'mine' });
  await L.toSection(0);
  await key('ArrowDown', 1, 400);
  for (let i = 0; i < 4 && !(await L.ev(() => !!document.activeElement.dataset.day)); i++) await key('ArrowDown', 1, 300);
  await key('ArrowLeft', 1, 2500); await L.scan('yesterday'); await shot('yesterday');
  console.log('cards:', await L.text('.gc'), '| counts:', await L.text('.nb-days .t-cap'));
  await key('ArrowDown', 1, 400); console.log('on', await L.where()); await L.hold(); await shot('card-menu');
  console.log('menu:', await L.text('.ctxmenu'));
  await key('Escape', 1, 400); await key('Enter', 1, 1500); await L.scan('game page'); await shot('game');
  console.log('game page focus:', await L.where());
};
