// Bug hunt: single Up presses from each League section's content to the section row (which chip, does the section change?)
// node tests/tv/drive.js <out> hunt-league-up
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where } = H;
  await H.start({});
  const vis = () => ev(() => [...document.querySelectorAll('.nb-s')].filter((s) => !s.hidden).map((s) => s.dataset.s).join(','));
  for (const [sec, downs, right] of [['standings', 1, 0], ['standings', 2, 0], ['leaders', 1, 0], ['leaders', 1, 1], ['teamstats', 1, 0], ['teamstats', 1, 1], ['news', 1, 0]]) {
    await H.go(sec); await p.waitForTimeout(1200);
    await key('ArrowDown', downs, 400); if (right) await key('ArrowRight', 1, 400);
    const from = await where(`${sec} start`);
    // Up until the section row
    let a;
    for (let i = 0; i < 12; i++) { await key('ArrowUp', 1, 400); a = await H.act(); if (a.sec || a.tab) break; }
    await p.waitForTimeout(700);
    a = await where(`${sec}: up lands`);
    const v = await vis();
    check(a.sec === sec && v === sec, `${sec} (from ${from.key || from.conf || from.cat}): Up reaches the section row on its own chip, the section stays (chip ${a.sec}, showing ${v})`);
    await shot(`up-${sec}-${downs}${right}`);
  }
  H.done();
};
