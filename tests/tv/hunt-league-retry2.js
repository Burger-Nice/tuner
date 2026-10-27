// Bug hunt: Standings, ESPN down with a copy: OK on Try again once ESPN answers. Which conference shows after?
// node tests/tv/drive.js <out> hunt-league-retry2
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where, json } = H;
  const net = { fail: false };
  await p.route(/127\.0\.0\.1:8899\/espnweb\//, async (r) => (net.fail ? json(r, { e: 1 }, 503) : r.continue()));
  await H.start({});
  await H.go('standings'); await p.waitForTimeout(1200);
  net.fail = true; await ev(async () => { const m = await import('/tv/js/league.js'); await m.want('standings', { force: true }); }); await p.waitForTimeout(500);
  await key('ArrowDown', 1, 300); await key('ArrowRight', 2, 400); await where('on Try again'); await shot('on-try-again');
  const before = await ev(() => document.querySelector('.st-sub .chip.sel')?.dataset.conf);
  net.fail = false; await key('Enter', 1, 1500);
  const a = await where('after it worked'); await shot('after-try-again');
  const after = await ev(() => document.querySelector('.st-sub .chip.sel')?.dataset.conf);
  check(before === after, `the conference stays the same after Try again (${before} -> ${after}), focus ${a.conf || a.act}`);
  // and when it fails again: where does focus go?
  net.fail = true; await ev(async () => { const m = await import('/tv/js/league.js'); await m.want('standings', { force: true }); }); await p.waitForTimeout(500);
  await H.go('standings'); await key('ArrowDown', 1, 300); await key('ArrowRight', 2, 400); await where('on Try again (2)');
  await key('Enter', 1, 1500); await where('after a Try again that failed');
  H.done();
};
