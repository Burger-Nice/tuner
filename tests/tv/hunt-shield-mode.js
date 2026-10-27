// Changing the shield's mode: My team -> All games (stricter) and Off -> My team. The Kings final (Sun 25 Oct, 01:00,
// 22 h 40 min before now) is unseen in My team; setShield() moves "seen" to 12 h back on every change, so it turns seen.
// Run: node tests/tv/drive.js <out> hunt-shield-mode
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const L = require('./hunt-shield-lib.js')(ctx);
  await L.start({ shield: 'mine' });
  const st = async (label) => console.log(label.padEnd(30), 'mode', await L.G((m) => m.shieldMode()), '| unseen', JSON.stringify(await L.G((m) => m.unseenFor().map((g) => `${g.away.abbr}@${g.home.abbr}`))), '| MEM', JSON.stringify(await L.G((m) => m.recordFor({ abbr: 'MEM', record: '3-0' }))), '| seen', await L.seen());
  await st('My team');
  // Account > NBA > Spoiler shield > All games (the radio menu calls setShield)
  await L.ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(1500);
  await L.G((m) => m.setShield('all')); await p.waitForTimeout(500);
  await st('-> All games');
  await L.toSection(0); await shot('hub-after-all'); console.log('hub rc:', await L.text('.hero-plate .rc'));
  await L.toSection(1); await shot('team-after-all'); console.log('team rec:', await L.text('.nb-s[data-s="team"] .nb-rec'));
  // fresh start, then Off and back on
  await L.start({ shield: 'mine' });
  await st('My team again');
  await L.G((m) => m.setShield('off')); await L.G((m) => m.setShield('mine')); await p.waitForTimeout(500);
  await st('Off -> My team');
};
