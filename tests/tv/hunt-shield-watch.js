// Tuning in for a moment, then leaving the player: the game is revealed for this session only (SPEC 8.1). But the
// player's exit doesn't clear games.js `watch`, so when the game ends later (you're on Home, or watching a film) the
// "final buzzer while watching" rule marks it seen for good, and after a restart its score shows everywhere.
// Run: node tests/tv/drive.js <out> hunt-shield-watch
module.exports = async (ctx) => {
  const { p, shot } = ctx;
  const L = require('./hunt-shield-lib.js')(ctx);
  L.setBoard(L.board([L.jazz({ state: 'in', home: 30, away: 28, period: 1, clock: '4:10', detail: '4:10 - 1st' })]));
  await L.start({ shield: 'mine', clock: '2026-10-27T01:20:00Z' });
  const st = async (label) => console.log(label.padEnd(30), 'state', await L.G((m, id) => m.gameById(id)?.state + ' ' + m.nba.today.length + ' ' + m.nba.todayDay, L.JAZZ_ID), 'hidden', await L.G((m, id) => m.hidden(m.gameById(id)), L.JAZZ_ID), '| watch', JSON.stringify(await L.G((m) => m.watch)), '| seen', await L.seen());
  await st('live, not watched');
  // what player.js linkChannel() does when you tune to the channel carrying it (Q1, 4:10 left)
  const ch = await L.G((m, id) => m.bestChannel(m.gameById(id))?.id || 'ch1', L.JAZZ_ID);
  await L.G((m, a) => m.setWatching(a.id, a.ch), { id: L.JAZZ_ID, ch });
  await st('tuned in');
  // ... and Back out of the player: its 'exit' event only clears ctx.cur (player.js), nothing in games.js
  await st('left the player');
  // two hours later the game ends while you're on Home
  L.setBoard(L.board([L.jazz({ state: 'post', home: 101, away: 118, period: 4, detail: 'Final' })]));
  await p.clock.fastForward('00:20'); await p.waitForTimeout(1500);
  await st('final (not watching)');
  // next day: a restart
  await p.reload(); await p.waitForTimeout(5000);
  await st('after restart');
  await L.toSection(1); await shot('team-after-restart');
  console.log('team header:', await L.text('.nb-s[data-s="team"] .nb-btns'), '| sched', await L.text('.nb-s[data-s="team"] .nb-title small'));
};
