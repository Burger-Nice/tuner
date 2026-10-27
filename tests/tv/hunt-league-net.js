// Bug hunt: bad network on Standings, Leaders, Team stats (SPEC 9): ESPN down with nothing kept, Try again that works,
// down with a copy kept, slow answers, empty answers.
//   node tests/tv/drive.js <out> hunt-league-net [down|copy|slow|empty]
const mode = process.argv[4] || 'down';
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where, text, json, seen } = H;
  const net = { fail: false, delay: 0, empty: false };
  const WEB = /127\.0\.0\.1:8899\/espnweb\//;
  await p.route(WEB, async (r) => {
    if (net.delay) await new Promise((f) => setTimeout(f, net.delay));
    if (net.fail) return json(r, { error: 'down' }, 503);
    if (net.empty) { const u = r.request().url(); return json(r, /standings/.test(u) ? { children: [] } : /byathlete/.test(u) ? { categories: [], athletes: [] } : { categories: [], teams: [] }); }
    return r.continue();
  });
  const meta = () => text('.nb-sec .meta');
  if (mode === 'down' || mode === 'empty') {
    net.fail = mode === 'down'; net.empty = mode === 'empty';
    await H.start({});
    for (const sec of ['standings', 'leaders', 'teamstats']) {
      await H.go(sec); await p.waitForTimeout(2000);
      console.log(`--- ${sec}: meta "${await meta()}"`);
      let a = await where('chip'); check(a.sec === sec, `${sec}: focus stays on the chip`);
      await shot(`${mode}-${sec}`);
      console.log('  body:', (await text(`.nb-s[data-s="${sec}"]`)).slice(0, 200));
      await key('ArrowDown', 1, 400); a = await where('down');
      if (mode === 'down') check(a.act === 'retry', `${sec}: Down from the chip lands on Try again (${a.act || a.cat || a.conf})`);
      await key('ArrowDown', 1, 400); a = await where('down 2');
      if (sec !== 'standings') { await key('ArrowRight', 1, 400); a = await where('right'); await seen(`${sec} right`); }
      if (mode === 'down') {
        // ESPN back: Try again
        await H.go(sec); await p.waitForTimeout(300);
        await key('ArrowDown', 1, 400); if (sec !== 'standings') { await key('ArrowRight', 1, 400); }
        a = await where('on try again?');
        net.fail = false;
        await key('Enter', 1, 2000); a = await seen(`${sec} after a Try again that worked`);
        await where('after try again'); await shot(`${mode}-${sec}-back`);
        console.log(`  meta "${await meta()}"`);
        net.fail = true;
      }
    }
  }
  if (mode === 'copy') {
    await H.start({ clock: new Date().toISOString() });
    for (const sec of ['standings', 'leaders', 'teamstats']) {
      net.fail = false;
      await H.go(sec); await p.waitForTimeout(1500);
      await key('ArrowDown', sec === 'standings' ? 2 : 1, 400); if (sec !== 'standings') await key('ArrowRight', 1, 400);
      await key('ArrowDown', 2, 400);
      const before = await where(`${sec} on a row`);
      net.fail = true;
      const k = sec === 'standings' ? 'standings' : sec === 'teamstats' ? 'teamStats' : 'leaders:pts';
      await ev(async (k) => { const m = await import('/tv/js/league.js'); await m.want(k, { force: true }); }, k); await p.waitForTimeout(800);
      const a = await where('after the failed refresh');
      check(a.key === before.key && JSON.stringify(a.box) === JSON.stringify(before.box), `${sec}: focus stays where it was (${before.key} -> ${a.key})`);
      console.log(`  meta "${await meta()}"`);
      await shot(`copy-${sec}`);
      // reach Try again
      let found = false;
      for (const path of [['ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowRight', 'ArrowRight'], ['ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown'], ['ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp']]) {
        await H.go(sec); await key('ArrowDown', 1, 300); if (sec !== 'standings') await key('ArrowRight', 1, 300);
        for (const k2 of path) { await key(k2, 1, 250); const x = await H.act(); if (x.act === 'retry') { found = true; break; } }
        if (found) break;
      }
      const x = await where('try again reached?'); check(found, `${sec}: Try again is reachable (${x.act})`);
      if (found) { await shot(`copy-${sec}-retry`); net.fail = false; await key('Enter', 1, 1500); await seen(`${sec}: after Try again worked`); await where('after'); console.log(`  meta "${await meta()}"`); }
      // clock: retries every 60 s while ESPN is down (the copy is only a minute old)
      net.fail = true;
      await ev(async (k) => { const m = await import('/tv/js/league.js'); await m.want(k, { force: true }); }, k); await p.waitForTimeout(500);
      let n = 0; const count = (r) => { if (WEB.test(r.url())) n++; };
      p.on('request', count);
      for (let i = 0; i < 13; i++) { await p.clock.runFor(10e3); await p.waitForTimeout(100); }
      await p.waitForTimeout(1000);
      p.off('request', count);
      check(n >= 1, `${sec}: retried within 130 s while ESPN is down and the copy is young (${n} requests)`);
    }
  }
  if (mode === 'slow') {
    net.delay = 6000;
    await H.start({});
    for (const sec of ['standings', 'leaders', 'teamstats']) {
      await H.go(sec); await p.waitForTimeout(600);
      console.log(`--- ${sec}: meta "${await meta()}"`); await shot(`slow-${sec}`);
      await key('ArrowDown', 1, 300); await key('ArrowDown', 1, 300); await key('ArrowRight', 1, 300);
      const b = await where('moved during loading');
      await p.waitForTimeout(6500);
      const a = await where('after it landed'); await seen(`${sec} after a slow answer`);
      check(a.key === b.key && a.cat === b.cat && a.conf === b.conf, `${sec}: focus stays where it was when the data lands`);
      await shot(`slow-${sec}-landed`);
    }
  }
  H.done();
};
