// Hunt: the Games hero when today's scoreboard doesn't carry your team's game (the hero comes from the team schedule):
// do the plates still show records (SPEC 1.1 / nba-entry.png)?  node tests/tv/drive.js <out> hunt-games-hero
module.exports = async (ctx) => {
  const { p, shot } = ctx;
  const h = require('./hunt-games-lib.js')(ctx);
  const { ev, check, where, start } = h;
  const b = { ...h.board, events: h.board.events.filter((e) => e.id !== '401909875') };
  await p.route('**/espn/scoreboard*', (r) => r.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(b) }));
  await start({ noRoute: true });
  await where('entry');
  const hero = await ev(() => document.querySelector('[data-s="games"] .hero-plate')?.innerText.replace(/\s+/g, ' '));
  console.log('   hero:', hero);
  const recs = await ev(() => [...document.querySelectorAll('[data-s="games"] .hero-plate .rc')].map((r) => r.textContent));
  console.log('   records:', JSON.stringify(recs));
  check(recs.every((r) => r), 'both plates carry a record');
  await shot('hero-from-schedule');
  h.done();
};
