// Bug hunt, the natural repro of "Up from a section lands on another chip and switches the section": reach Standings by
// keys, sit on your team's row while the 10-minute refresh lands, then press Up twice.
// node tests/tv/drive.js <out> hunt-league-up2
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where } = H;
  await H.start({ clock: new Date().toISOString() });
  await ev(() => window.__tunerTest.go('nba')); await p.waitForTimeout(1500);
  await key('ArrowUp', 1, 300); await where('top bar?');
  await key('ArrowDown', 1, 400); await where('down');
  // onto the section row by Back (the Games chip), then Right x2 to Standings
  await key('Escape', 1, 400); await where('Back: chip');
  await key('ArrowRight', 2, 500); await p.waitForTimeout(1500); let a = await where('Standings chip');
  await key('ArrowDown', 2, 400); a = await where('your row');
  console.log('  row mem (1):', await ev(() => { const r = document.querySelector('.nb-sec'); return r._mem ? `${r._mem.dataset.sec} connected=${r._mem.isConnected}` : 'none'; }));
  const upToRow = async () => { for (let i = 0; i < 6; i++) { await key('ArrowUp', 1, 350); if ((await H.act()).conf) break; } await key('ArrowUp', 1, 400); await p.waitForTimeout(700); };
  await upToRow(); a = await where('Up to the section row (before the refresh)');
  const v1 = await ev(() => [...document.querySelectorAll('.nb-s')].filter((s) => !s.hidden).map((s) => s.dataset.s).join());
  check(a.sec === 'standings' && v1 === 'standings', `before the refresh: Up x2 from your row lands on the Standings chip (${a.sec}, showing ${v1})`);
  await key('ArrowDown', 2, 400); await where('your row again');
  console.log('  meta before:', await H.text('.nb-sec .meta'));
  for (let i = 0; i < 66; i++) { await p.clock.runFor(10e3); await p.waitForTimeout(30); }
  await p.waitForTimeout(1500);
  console.log('  meta after 11 min:', await H.text('.nb-sec .meta'));
  console.log('  row mem:', await ev(() => { const r = document.querySelector('.nb-sec'); return r._mem ? `${r._mem.dataset.sec} connected=${r._mem.isConnected}` : 'none'; }));
  await upToRow(); a = await where('Up to the section row after the refresh'); await p.waitForTimeout(700); await shot('after-up');
  const v2 = await ev(() => [...document.querySelectorAll('.nb-s')].filter((s) => !s.hidden).map((s) => s.dataset.s).join());
  check(a.sec === 'standings' && v2 === 'standings', `after the 10-minute refresh: Up x2 from your row lands on the Standings chip (${a.sec}, showing ${v2})`);
  H.done();
};
