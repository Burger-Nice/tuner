// Hunt: pages opened from the All teams picker: where focus lands (SPEC 7.7: the header's primary button), for teams
// whose data isn't cached yet.  node tests/tv/drive.js <out> hunt-team-picker
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const h = require('./hunt-games-lib.js')(ctx);
  const { ev, check, where, start, hold } = h;
  await start();
  await key('ArrowDown', 2, 400); await hold(); await key('Enter', 1, 1500);
  let a = await where('pushed');
  const teams = ['MIN', 'BOS', 'DEN', 'NY', 'LAL', 'CHI'];
  let n = 0;
  for (const t of teams) {
    for (let i = 0; i < 3 && (await h.act()).act !== 'all'; i++) { const x = await h.act(); if (x.act === 'mine') await key('ArrowRight', 1, 300); else await key('ArrowUp', 1, 300); }
    await key('Enter', 1, 700);
    await ev((t) => { const c = document.querySelector(`.tp-pick [data-pick="${t}"]`); c.focus(); c.dispatchEvent(new CustomEvent('tvfocus', { bubbles: true })); }, t);
    await key('Enter', 1, 1500);
    a = await where(`opened ${t}`);
    const okk = ['watch', 'game', 'box', 'retry'].includes(a.act);
    if (okk) n++;
    if (!okk && !n) await shot(`picker-${t}`);
  }
  check(n === teams.length, `pages opened from the picker land on the header primary (${n}/${teams.length})`);
  h.done();
};
