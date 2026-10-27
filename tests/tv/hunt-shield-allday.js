// All games mode: last night's finals are only known from yesterday's scoreboard (dayGames(-1), fetched once, 4 s after
// start). FAIL=1 makes that one fetch answer 503: then the Knicks' loss last night (unseen) shows in their record on
// tonight's card and in the Brunson "0-3 start" headline. Run: [FAIL=1] node tests/tv/drive.js <out> hunt-shield-allday
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const L = require('./hunt-shield-lib.js')(ctx);
  L.setBoard(L.board([L.jazz(), L.mk({ id: '900001', date: '2026-10-27T00:00Z', away: 'NY', home: 'PHI', ar: '0-3', hr: '2-1' })]));
  L.days['20261025'] = { day: { date: '2026-10-25' }, events: [
    L.withRecords(L.sched.events.find((e) => e.id === L.SAC_ID), { MEM: '3-0', SAC: '0-3' }),
    L.mk({ id: '900002', date: '2026-10-25T23:30Z', away: 'BOS', home: 'NY', state: 'post', as: 110, hs: 98, ar: '2-1', hr: '0-3' }),
  ] };
  if (process.env.FAIL) L.failDays.add('20261025');
  await L.start({ shield: 'all' });
  await p.waitForTimeout(3000);
  console.log('FAIL', !!process.env.FAIL, 'unseen:', await L.G((m) => m.unseenFor().map((g) => `${g.away.abbr}@${g.home.abbr}`)));
  await L.ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(2000);
  console.log('home cards:', await L.text('.gc'));
  await shot('home');
  await L.toSection(0);
  console.log('hub cards:', await L.text('.gc'));
  await shot('hub');
  await L.toSection(5); await p.waitForTimeout(2000);
  const rows = await L.ev(() => [...document.querySelectorAll('.nb-s[data-s="news"] .nb-nrow')].map((r) => `${r.classList.contains('cov') ? 'COV ' : '    '}${r.querySelector('b').textContent.slice(0, 80)}`));
  console.log(rows.join('\n'));
  await key('ArrowDown', 1, 400); await key('ArrowDown', 14, 250); await p.waitForTimeout(500); await shot('news');
  await L.toSection(2); await key('ArrowDown', 1, 400); await key('ArrowRight', 0); await shot('standings-west');
  console.log('standings:', await L.text('.st-sub .legend'), '|', await L.text('.st-msg'));
};
