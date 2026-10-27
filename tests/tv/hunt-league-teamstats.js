// Bug hunt: Team stats D-pad and flood tours; Back from a team page opened far down the list; team "None".
// node tests/tv/drive.js <out> hunt-league-teamstats
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where, seen, flood, boxes, text } = H;
  await H.start({});
  const visRows = () => boxes('.ts-tb .nb-in > .nb-tr:not(.off)');
  await H.go('teamstats'); await p.waitForTimeout(1500);
  await key('ArrowDown', 1, 300); await key('ArrowRight', 1, 400); let a = await where('right: your row');
  await flood('ArrowDown', 35, 40); await p.waitForTimeout(700); a = await seen('flood down'); await shot('flood-down');
  let r = await visRows(); check(r.length === 11 && r.every((x) => x.top >= 156 && x.bot <= 487), `11 whole rows after the flood (${r.length}: ${r[0]?.top}-${r[r.length - 1]?.bot})`);
  await flood('ArrowUp', 35, 40); await p.waitForTimeout(700); a = await seen('flood up'); await shot('flood-up');
  console.log('  visible sections:', await ev(() => [...document.querySelectorAll('.nb-s')].filter((s) => !s.hidden).map((s) => s.dataset.s).join()));
  // single steps: from the bottom up to row 1, focus never on a hidden row
  await H.go('teamstats'); await key('ArrowDown', 1, 300); await key('ArrowRight', 1, 400); await flood('ArrowDown', 35, 40); await p.waitForTimeout(600);
  for (let i = 0; i < 30; i++) { await key('ArrowUp', 1, 360); a = await H.act(); if (!a.key) break; if (a.hid || a.box[1] < 156 || a.box[3] > 487) check(false, `Up #${i + 1}: ${a.key} hidden=${a.hid} [${a.box}]`); }
  a = await where('Up past row 1');
  // OK on row 28 and Back
  await H.go('teamstats'); await key('ArrowDown', 1, 300); await key('ArrowRight', 1, 400); await flood('ArrowDown', 35, 40); await p.waitForTimeout(500);
  await key('ArrowUp', 2, 400); const row = await where('row 28');
  await key('Enter', 1, 1500); await where('team page');
  await key('Escape', 1, 1200); a = await where('back'); await shot('back-row28');
  check(a.key === row.key && !a.hid && a.box[1] >= 156 && a.box[3] <= 487, `Back returns to row 28, in view (${a.key} [${a.box}] hidden=${a.hid})`);
  r = await visRows(); console.log('  visible rows:', r.length, r[0]?.t.slice(0, 20), '…', r[r.length - 1]?.t.slice(0, 20));
  // Back from a row: the chip, the list recentred
  await key('Escape', 1, 400); a = await where('back to chip'); check(a.sec === 'teamstats', 'Back: the Team stats chip');
  // the column flood with the dwell: only the last category draws
  await key('ArrowDown', 1, 300); await flood('ArrowDown', 12, 40); await p.waitForTimeout(600); a = await where('column flood');
  check(a.cat === 'avgTurnovers' && /TURNOVERS/.test(await text('.ts-th')), `flood down the column ends on Turnovers, its list showing (${await text('.ts-th')})`);
  // Turnovers: lower is better, rank 1 = fewest
  const top = await ev(() => [...document.querySelectorAll('.ts-tb .nb-tr')].slice(0, 3).map((x) => x.querySelector('.c-val').textContent));
  const last = await ev(() => [...document.querySelectorAll('.ts-tb .nb-tr')].slice(-1).map((x) => x.querySelector('.c-val').textContent));
  check(+top[0] <= +last[0], `Turnovers: rank 1 has the fewest (${top} … ${last})`);
  const bar1 = await ev(() => document.querySelector('.ts-tb .nb-tr .c-bar i').style.width);
  console.log('  turnovers rank-1 bar width:', bar1);
  // team None
  await ev(async () => { const st = await import('/tv/js/state.js'); st.saveSettings({ nbaTeam: '' }); st.emit('nba'); }); await p.waitForTimeout(600);
  await H.go('teamstats'); await p.waitForTimeout(800); await shot('none');
  await key('ArrowDown', 1, 300); await key('ArrowRight', 1, 400); a = await where('team None: right'); await seen('team None right');
  console.log('  section row:', await text('.nb-sec'));
  H.done();
};
