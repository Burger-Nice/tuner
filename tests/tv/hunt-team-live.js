// Hunt: live data under focus on the team page and the Games hero: the Jazz game tips off (pre -> in) and then goes
// final while focus sits on the header's second button / a schedule tile / the hub hero.
//   node tests/tv/drive.js <out> hunt-team-live
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const h = require('./hunt-games-lib.js')(ctx);
  const { ev, check, where, start, toChip } = h;
  await start();
  const CORS = { 'Access-Control-Allow-Origin': '*' };
  const setBoard = async (state) => {
    const b = JSON.parse(JSON.stringify(h.board));
    const e = b.events.find((x) => x.id === '401909875');
    const c = e.competitions[0];
    c.status = c.status || {}; c.status.type = c.status.type || {};
    if (state === 'in') { Object.assign(c.status.type, { state: 'in', name: 'STATUS_IN_PROGRESS', completed: false, shortDetail: '8:12 - 1st Qtr', detail: '8:12 - 1st Quarter' }); c.status.period = 1; c.status.displayClock = '8:12'; c.competitors.forEach((x, i) => { x.score = String(10 + i * 3); }); }
    if (state === 'post') { Object.assign(c.status.type, { state: 'post', name: 'STATUS_FINAL', completed: true, shortDetail: 'Final', detail: 'Final' }); c.status.period = 4; c.competitors.forEach((x, i) => { x.score = String(100 + i * 7); x.winner = i === 1; }); }
    e.status = c.status;
    await p.unroute('**/espn/scoreboard*');
    await p.route('**/espn/scoreboard*', (r) => r.fulfill({ contentType: 'application/json', headers: CORS, body: JSON.stringify(b) }));
    await p.clock.fastForward(16000); await p.waitForTimeout(1500);
  };
  await toChip('team', 1200);
  await key('ArrowDown', 1, 400); await key('ArrowRight', 1, 400);
  let a = await where('header: Game page');
  await setBoard('in');
  a = await where('after tip-off');
  console.log('   buttons:', await ev(() => document.querySelector('[data-s="team"] .nb-btns')?.innerText.replace(/\s+/g, ' ')));
  check(a.act !== 'watch', `live data doesn't move focus from the second button to the primary (${a.act} "${a.text}")`);
  await shot('tipoff-header');
  // a schedule tile
  await key('ArrowDown', 1, 500); a = await where('tile');
  const tk = a.key;
  await setBoard('post');
  a = await where('after final');
  check(a.key === tk, `the tile keeps focus when the game goes final (${a.key})`);
  console.log('   buttons:', await ev(() => document.querySelector('[data-s="team"] .nb-btns')?.innerText.replace(/\s+/g, ' ')));
  await shot('final-tile');
  // the hub hero: Game page (secondary) focused when it tips off
  h.done();
};
