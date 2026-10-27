// Bug hunt: Leaders' season note on a cold start straight to Leaders (ESPN's season says 2027-28); Standings hold OK
// "Make the Knicks my team" from the East table. node tests/tv/drive.js <out> hunt-league-misc
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where, text, json, hold } = H;
  const st = H.fx('standings.json'); st.season.displayName = '2027-28';
  await H.start({ routes: [[/espnweb\/v2\/sports\/basketball\/nba\/standings/, (r) => json(r, st)]] });
  await H.go('leaders'); await p.waitForTimeout(1500);
  const n1 = await text('.ld-note-box'); console.log('  note (Leaders first):', n1); await shot('leaders-note-cold');
  await H.go('standings'); await p.waitForTimeout(1200); console.log('  standings line:', await text('.st-ctx'));
  await H.go('leaders'); await p.waitForTimeout(800);
  const n2 = await text('.ld-note-box'); console.log('  note (after Standings):', n2);
  check(n1 === n2, `the Leaders note names the same season either way (${n1.slice(0, 20)} / ${n2.slice(0, 20)})`);
  // Make the Knicks my team from the East
  await H.go('standings'); await key('ArrowDown', 1, 300); await key('ArrowRight', 1, 700); await key('ArrowDown', 1, 400);
  for (let i = 0; i < 15; i++) { const a = await H.act(); if (a.key === 'tm:NY') break; await key('ArrowDown', 1, 250); }
  let a = await where('Knicks row'); await hold(); await key('ArrowDown', 1, 250); await key('Enter', 1, 500); await key('ArrowRight', 1, 250); await key('Enter', 1, 1200);
  a = await where('after Make my team'); await shot('knicks-mine');
  console.log('  chips:', await text('.st-sub .chip'), '| team chip:', await text('.nb-sec [data-sec="team"]'), '| sel:', await ev(() => document.querySelector('.st-sub .chip.sel')?.dataset.conf));
  check(a.key === 'tm:NY' && !a.hid, `focus stays on the Knicks row (${a.key})`);
  H.done();
};
