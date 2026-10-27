// The copy kept at tip-off vs a tune-in: tuning in reveals the game for this session only, but the next scoreboard poll's
// prunePins() drops the copy (the game no longer counts as unseen). After a restart the game is unseen again and its
// tables show the cover card instead of the copy. Run: node tests/tv/drive.js <out> hunt-shield-pins
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const L = require('./hunt-shield-lib.js')(ctx);
  // seen up to Sun noon + the Kings game seen: only tonight's Jazz game can be unseen
  L.setBoard(L.board([L.jazz({ state: 'in', home: 30, away: 28, period: 1, clock: '4:10', detail: '4:10 - 1st' })]));
  await L.start({ shield: 'mine', clock: '2026-10-27T01:20:00Z', seen: { upTo: Date.parse('2026-10-26T12:00:00Z'), ids: [] } });
  await p.waitForTimeout(3000);
  const pins = () => L.ev(() => localStorage.getItem('tuner.nbaPins'));
  console.log('at start (mid-game launch: copy fetched)  pins', await pins());
  const ch = await L.G((m, id) => m.bestChannel(m.gameById(id))?.id || 'ch1', L.JAZZ_ID);
  await L.G((m, a) => m.setWatching(a.id, a.ch), { id: L.JAZZ_ID, ch });
  await L.G((m) => m.setWatching(null, null));   // (as if the player cleared it on exit)
  await p.clock.fastForward('00:20'); await p.waitForTimeout(1500);
  console.log('tuned in and out, next poll                pins', await pins(), '| seen', await L.seen());
  await p.reload(); await p.waitForTimeout(5000);
  console.log('after restart: hidden', await L.G((m, id) => m.hidden(m.gameById(id)), L.JAZZ_ID), '| pins', await pins());
  await L.toSection(2); await key('ArrowDown', 1, 500); await shot('standings-after-restart');
  console.log('standings:', await L.text('.st-sub .legend'), '|', await L.text('.st-msg b'));
};
