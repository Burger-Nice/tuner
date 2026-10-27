// Hunt: entry focus on Games when the hero arrives after the first draw (your team's game only on its schedule).
//   node tests/tv/drive.js <out> hunt-games-hero2
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const h = require('./hunt-games-lib.js')(ctx);
  const { ev, check, where, start } = h;
  const b = { ...h.board, events: h.board.events.filter((e) => e.id !== '401909875') };
  await p.route('**/espn/scoreboard*', (r) => r.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(b) }));
  // a slow schedule, so the hero arrives after the first draw
  await p.route('**/espn/teams/*/schedule', async (r) => { await new Promise((res) => setTimeout(res, 2500)); await r.continue(); });
  await start({ noRoute: true, go: false });
  await ev(() => window.__tunerTest.go('nba'));
  for (const t of [300, 800, 1500, 2500, 3500, 5000]) { await p.waitForTimeout(t === 300 ? 300 : 700); await where(`+~${t} ms`); }
  await shot('entry-after-hero');
  const a = await h.act();
  check(a.act === 'primary' || a.key?.startsWith('g:'), `focus is on the hero primary or where it was (${a.act || a.key} "${a.text}")`);
  h.done();
};
