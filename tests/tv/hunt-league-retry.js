// Bug hunt: ESPN down with a copy kept (SPEC 3 / 9): reaching Try again by key, the 60 s retry, what a Try again that
// works does to focus. node tests/tv/drive.js <out> hunt-league-retry
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where, json } = H;
  const net = { fail: false };
  const hits = [];
  await p.route(/127\.0\.0\.1:8899\/espnweb\//, async (r) => { hits.push(r.request().url().replace(/.*espnweb/, '')); return net.fail ? json(r, { e: 1 }, 503) : r.continue(); });
  await H.start({ clock: new Date().toISOString() });
  const force = (k) => ev(async (k) => { const m = await import('/tv/js/league.js'); await m.want(k, { force: true }); }, k);
  const tick = async (ms) => { for (let t = 0; t < ms; t += 10e3) { await p.clock.runFor(10e3); await p.waitForTimeout(60); } await p.waitForTimeout(800); };

  // Standings: West, Right East, Right -> Try again?
  await H.go('standings'); await p.waitForTimeout(1200);
  net.fail = true; await force('standings'); await p.waitForTimeout(500);
  await key('ArrowDown', 1, 300); await key('ArrowRight', 2, 400); let a = await where('standings: right x2 from West');
  check(a.act === 'retry', 'Standings: Try again is reached with Right from the conference chips');
  hits.length = 0; await tick(180e3);
  console.log('  standings requests in 3 min (young copy, ESPN down):', hits.length, hits.slice(0, 3));
  check(hits.some((u) => /standings/.test(u)), 'Standings: retries within 3 minutes while ESPN is down');
  await shot('standings-down-3min');
  net.fail = false; await key('Enter', 1, 1500); a = await where('standings: Try again worked');
  check(!a.none && !a.hid, 'Standings: focus after Try again is on something visible');
  console.log('  legend now:', await H.text('.st-sub .legend'));

  // (Leaders' Try again under the column: hunt-league-leaders.js)
  // Team stats: Right from the column lands on your row; Up from the list's first visible row -> the notice?
  await H.go('teamstats'); await p.waitForTimeout(1200);
  net.fail = true; await force('teamStats'); await p.waitForTimeout(500);
  await key('ArrowDown', 1, 300); await key('ArrowRight', 1, 400); await where('teamstats: right');
  for (let i = 0; i < 31; i++) { await key('ArrowUp', 1, 200); a = await H.act(); if (a.act === 'retry' || a.sec || a.tab) break; }
  a = await where('teamstats: Up from the list');
  check(a.act === 'retry', 'Team stats: Try again is reached with Up from the list');
  hits.length = 0; await tick(180e3);
  console.log('  team stats requests in 3 min:', hits.length, hits.slice(0, 3));
  check(hits.some((u) => /byteam/.test(u)), 'Team stats: retries within 3 minutes while ESPN is down');
  if (a.act === 'retry') { net.fail = false; await key('Enter', 1, 1500); a = await where('teamstats: Try again worked'); check(!a.none && !a.hid, 'Team stats: focus visible after Try again'); }
  H.done();
};
