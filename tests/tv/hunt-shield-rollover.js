// All games mode, airglow left open across ESPN's day change: last night's Knicks game (seen live as unseen/hidden) drops
// off "today" when ESPN's day moves on, and yesterday's board is never fetched again (dayGames(-1) runs once at start).
// Then the Knicks' record on the next day's card counts the unseen result. Run: node tests/tv/drive.js <out> hunt-shield-rollover
module.exports = async (ctx) => {
  const { p, shot } = ctx;
  const L = require('./hunt-shield-lib.js')(ctx);
  const ny = (o) => L.mk({ id: '900001', date: '2026-10-27T00:00Z', away: 'NY', home: 'PHI', ar: '0-3', hr: '2-1', ...o });
  L.setBoard(L.board([L.jazz(), ny()]));
  await L.start({ shield: 'all' });
  await p.waitForTimeout(5000);
  const state = async (label) => {
    console.log(label.padEnd(26), 'unseen', JSON.stringify(await L.G((m) => m.unseenFor().map((g) => `${g.away.abbr}@${g.home.abbr}:${g.state}`))),
      '| NY record', JSON.stringify(await L.G((m) => { const g = m.nba.today.find((x) => x.away.abbr === 'NY' || x.home.abbr === 'NY'); if (!g) return null; const s = g.away.abbr === 'NY' ? g.away : g.home; return m.recordFor(s); })));
  };
  await state('23:40 NY@PHI pre');
  // tip-off and the final (the poll: 2 min when nothing is live, 15 s when something is)
  L.setBoard(L.board([L.jazz(), ny({ state: 'in', as: 50, hs: 55, period: 2, clock: '5:00' })]));
  await p.clock.fastForward('02:10'); await p.waitForTimeout(1500);
  await state('NY@PHI live');
  L.setBoard(L.board([L.jazz({ state: 'in', home: 60, away: 62, period: 3 }), ny({ state: 'post', as: 99, hs: 104, ar: '0-4', hr: '3-1' })]));
  await p.clock.fastForward('02:10'); await p.waitForTimeout(1500);
  await state('NY@PHI final (unseen)');
  // next morning: ESPN's day is the 27th; the Knicks play the Celtics tonight, ESPN's record 0-4 counts the PHI loss
  L.setBoard({ ...L.sb, day: { date: '2026-10-27' }, events: [L.mk({ id: '900003', date: '2026-10-28T00:00Z', away: 'NY', home: 'BOS', ar: '0-4', hr: '3-1' })] });
  await p.clock.fastForward('10:00:00'); await p.waitForTimeout(2500);
  await state('next day, NY@BOS pre');
  await L.ev(() => window.__tunerTest.go('nba')); await p.waitForTimeout(2000);
  await L.toSection(0);
  console.log('hub cards:', await L.text('.gc'));
  await shot('hub-next-day');
};
