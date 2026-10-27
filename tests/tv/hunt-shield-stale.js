// The schedule kept on the TV is from before last night's game (the Kings game still 'pre' in it), and ESPN is slow to
// send a fresh one (8 s here). Until it lands nothing knows the Kings game was played, so nothing is hidden: Home shows
// ESPN's 3-0. Run: node tests/tv/drive.js <out> hunt-shield-stale
module.exports = async (ctx) => {
  const { p, shot } = ctx;
  const L = require('./hunt-shield-lib.js')(ctx);
  await L.start({
    shield: 'mine',
    before: async () => {
      await L.ev(async (id) => {
        const d = await window.NBA.schedule('MEM');
        for (const g of d.games) if (g.id === id) { g.state = 'pre'; g.home.score = g.away.score = ''; }
        await window.Core.cache.set('nba:schedule:MEM', { data: d, at: Date.now() - 20 * 3600e3 });   // kept yesterday evening
      }, L.SAC_ID);
      await p.route('**/espn/teams/29/schedule', async (r) => { await new Promise((ok) => setTimeout(ok, 8000)); return r.fallback(); });
    },
  });
  // (start() waits 4.5 s after the reload)
  console.log('unseen now:', await L.G((m) => m.unseenFor().map((g) => `${g.away.abbr}@${g.home.abbr}`)));
  await L.ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(300);
  await L.scan('home, schedule not in yet'); await shot('home-stale');
  await p.waitForTimeout(6000);
  console.log('unseen later:', await L.G((m) => m.unseenFor().map((g) => `${g.away.abbr}@${g.home.abbr}`)));
  await L.scan('home, schedule in'); await shot('home-fresh');
};
