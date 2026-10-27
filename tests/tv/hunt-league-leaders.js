// Bug hunt: Leaders with 10 players (as ESPN sends), long names, a tie for 1st; D-pad and flood tours, the player sheet
// and its team button, hold OK, ESPN down with a copy. node tests/tv/drive.js <out> hunt-league-leaders
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where, seen, flood, hold, text, boxes, json } = H;
  const base = H.fx('byathlete.json');
  const PEOPLE = [['Shai Gilgeous-Alexander', 'OKC', 25], ['Giannis Antetokounmpo', 'MIL', 15], ['Ty Jerome', 'MEM', 29], ['Victor Wembanyama', 'SA', 24], ['Karl-Anthony Towns', 'NY', 18],
    ['Anthony Edwards', 'MIN', 16], ['Jaren Jackson Jr.', 'MEM', 29], ['Donovan Mitchell', 'CLE', 5], ['Cade Cunningham', 'DET', 8], ['Nikola Jokic', 'DEN', 7]];
  const PTS = [33.1, 33.1, 30.2, 29.0, 29.0, 28.4, 27.0, 26.5, 26.5, 25.0];
  const ten = JSON.parse(JSON.stringify(base));
  ten.athletes = PEOPLE.map(([n, t, id], i) => {
    const a = JSON.parse(JSON.stringify(base.athletes[i % base.athletes.length]));
    Object.assign(a.athlete, { id: String(9000 + i), displayName: n, shortName: n, teamShortName: t, teamId: String(id), teamName: t });
    a.categories.find((x) => x.name === 'offensive').values[0] = PTS[i];
    return a;
  });
  const net = { fail: false };
  let calls = 0;
  await H.start({ routes: [[/127\.0\.0\.1:8899\/espnweb\/common\/v3\/sports\/basketball\/nba\/statistics\/byathlete/, (r) => { calls++; return net.fail ? json(r, { e: 1 }, 503) : json(r, ten); }]] });
  await H.go('leaders'); await p.waitForTimeout(1500);
  await key('ArrowDown', 1, 400); let a = await where('entry');
  check(a.cat === 'pts', 'entry: Points');
  await shot('leaders-10');
  const card = await text('.nb-lead .rk'); check(/T-1st/i.test(card), `a tie for 1st reads T-1st (${card})`);
  const nm = await ev(() => { const n = document.querySelector('.nb-lead .nm'); const b = n.getBoundingClientRect(); return { w: Math.round(b.width), sw: n.scrollWidth, cw: n.clientWidth, fs: getComputedStyle(n).fontSize, t: n.textContent }; });
  check(nm.sw <= nm.cw + 1 && nm.fs === '20px', `"${nm.t}" (23 chars) steps to 20 px and fits the 252 px box (font ${nm.fs}, box ${nm.w}, text ${nm.sw})`);
  const rks = await ev(() => [...document.querySelectorAll('.nb-lrows .nb-tr .c-rk')].map((e) => e.textContent));
  console.log('  rows ranks:', rks.join(' '));
  check(rks[0] === '1' || rks[0] === 'T-1', `the second player (tied for 1st) shows rank 1, not 2 (${rks[0]})`);
  check(rks[3] === '4' && rks[2] === '4' || rks[2] === '4' && rks[3] === '4', `29.0 / 29.0 tie repeats the rank (${rks[2]}, ${rks[3]})`);
  const rowsB = await boxes('.nb-lrows .nb-tr');
  check(rowsB.length === 9 && rowsB.every((r) => r.bot <= 513), `rows 2-10 inside y 513 (${rowsB.length}, last bottom ${rowsB[rowsB.length - 1]?.bot})`);
  const ovf = await ev(() => [...document.querySelectorAll('.nb-lrows .nb-tr .nm, .nb-lrows .nb-tr .c-tm')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
  console.log('  clipped row texts:', ovf);
  // walk: right -> card, down x9 -> row 10, down again
  await key('ArrowRight', 1, 400); a = await where('card');
  await key('ArrowDown', 9, 250); a = await where('row 10'); await seen('row 10');
  await key('ArrowDown', 1, 400); a = await where('down from row 10'); await seen('down from row 10');
  await key('ArrowRight', 1, 300); a = await where('right from a row'); check(a.key.startsWith('pl:'), 'Right from a row stays');
  await key('ArrowLeft', 1, 300); a = await where('left from a row'); check(a.cat === 'pts', 'Left: back to the selected category');
  // flood the column: one fetch per category landed on, not one per press
  calls = 0; await flood('ArrowDown', 12, 40); await p.waitForTimeout(800); a = await where('flood column down');
  console.log('  byathlete fetches during the flood:', calls);
  check(a.cat === 'fg' && await ev(() => document.querySelector('.nb-cats .sel')?.dataset.cat) === 'fg', 'flood ends on Field goal %, selected');
  await shot('flood-fg');
  await flood('ArrowUp', 12, 40); await p.waitForTimeout(800); a = await where('flood column up'); await seen('flood up');
  check(a.cat === 'pts', `flood up ends on Points (${a.cat || a.sec})`);
  // back to Points by single presses
  await H.go('leaders'); await key('ArrowDown', 1, 300); for (let i = 0; i < 6; i++) await key('ArrowUp', 1, 350); await p.waitForTimeout(500); await where('Points again');
  // the player sheet from a row, its team button, Back
  await key('ArrowRight', 1, 300); await key('ArrowDown', 6, 250); const row = await where('Jaren Jackson row?');
  await key('Enter', 1, 1200); a = await where('sheet'); await shot('sheet');
  const sheet = await boxes('#overlays .ov .sheet, #overlays .ov [class*="sheet"]');
  console.log('  sheet boxes:', JSON.stringify(sheet.slice(0, 2)));
  console.log('  sheet text:', (await text('#overlays .ov')).slice(0, 220));
  await key('Escape', 1, 600); a = await where('back from sheet'); check(a.key === row.key, `Back from the sheet returns to the row (${a.key})`);
  await key('Enter', 1, 1200); a = await where('sheet again');
  if (a.act === 'team') {
    await key('Enter', 1, 1500); a = await where('team page from the sheet'); await shot('team-from-sheet');
    const scr = await ev(() => window.__tunerTest.state().screen); console.log('  screen:', scr);
    await key('Escape', 1, 1200); a = await where('back from the team page'); await shot('back-to-leaders');
    check(a.key === row.key && !a.hid, `Back from the team page returns to Leaders on the row (${a.key || a.sec || a.cat})`);
    console.log('  overlay open:', await H.ovOpen());
  } else check(false, `the sheet's focus is its team button (${a.act})`);
  await H.closeAll();
  // hold OK on the card: the menu inside the safe area
  await H.go('leaders'); await key('ArrowDown', 1, 300); await key('ArrowRight', 1, 300); await hold(); await shot('card-hold');
  const m = await boxes('#overlays .ctxmenu'); console.log('  menu:', JSON.stringify(m), await text('#overlays .ctxmenu .lr'));
  check(m.length === 1 && m[0].top >= 27 && m[0].bot <= 513 && m[0].l >= 48 && m[0].r <= 912, 'card menu inside the safe area');
  await key('Escape', 1, 400);
  // hold OK on row 10
  await key('ArrowDown', 9, 200); await hold(); await shot('row10-hold');
  const m2 = await boxes('#overlays .ctxmenu'); check(m2.length === 1 && m2[0].bot <= 513, `row 10 menu inside 513 (${JSON.stringify(m2)})`);
  await key('Escape', 1, 400);
  // ESPN down with the copy: can Try again be reached from Points?
  await H.go('leaders'); console.log('  selected:', await ev(() => document.querySelector('.nb-cats .sel')?.dataset.cat));
  net.fail = true; await ev(async () => { const m = await import('/tv/js/league.js'); await m.want('leaders:pts', { force: true }); }); await p.waitForTimeout(600);
  await shot('down-copy');
  const pill = await boxes('.ld-note [data-act="retry"]'); console.log('  Try again pill:', JSON.stringify(pill));
  let reached = false;
  for (const path of [['ArrowDown'], ['ArrowLeft', 'ArrowDown']]) {
    await H.go('leaders'); await key('ArrowDown', 1, 300); await key('ArrowRight', 1, 300); await key('ArrowDown', 9, 200);
    for (const k2 of path) { await key(k2, 1, 120); }
    a = await H.act(); if (a.act === 'retry') reached = true;
    console.log(`  path row10 + ${path}: ${a.act || a.cat || a.key}`);
  }
  const sel = await ev(() => document.querySelector('.nb-cats .sel')?.dataset.cat);
  check(reached, `Try again under the column is reachable on Points without changing category (selected now ${sel})`);
  H.done();
};
