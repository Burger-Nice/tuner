// Bug hunt: boundary data on Standings / Leaders / Team stats: preseason (0-0, no seeds), team None, partial JSON,
// standings reordering under focus (live update), tied seeds.
//   node tests/tv/drive.js <out> hunt-league-boundary [pre|none|partial|live]
const mode = process.argv[4] || 'pre';
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where, seen, flood, text, json, boxes } = H;
  const st = H.fx('standings.json');
  const setStat = (e, name, value, display) => { const s = e.stats.find((x) => x.name === name || x.type === name); if (s) { s.value = value; s.displayValue = display ?? String(value); } };
  let body = st, routes = [];
  const STAND = /127\.0\.0\.1:8899\/espnweb\/v2\/sports\/basketball\/nba\/standings/;
  if (mode === 'pre') {
    body = JSON.parse(JSON.stringify(st));
    for (const c2 of body.children) for (const e of c2.standings.entries) { setStat(e, 'wins', 0); setStat(e, 'losses', 0); setStat(e, 'winPercent', 0, '.000'); setStat(e, 'gamesBehind', 0, '-'); setStat(e, 'streak', 0, '-'); setStat(e, 'playoffSeed', 0, '0'); }
    const ath = H.fx('byathlete.json'); ath.athletes = [];
    const bt = H.fx('byteam.json'); for (const t of bt.teams) for (const c2 of t.categories) if (c2.values) c2.values = c2.values.map(() => 0);
    routes = [[STAND, (r) => json(r, body)], [/byathlete/, (r) => json(r, ath)], [/byteam/, (r) => json(r, bt)]];
  }
  if (mode === 'partial') {
    body = JSON.parse(JSON.stringify(st));
    const w = body.children.find((x) => /West/.test(x.name));
    w.standings.entries.forEach((e, i) => { if (i % 3 === 0) e.stats = e.stats.filter((s) => !['streak', 'Last Ten Games', 'Home', 'Road', 'gamesBehind'].includes(s.name)); if (i === 4) delete e.team.displayName; });
    const ath = H.fx('byathlete.json'); ath.athletes.forEach((a, i) => { if (i === 1) delete a.athlete.headshot; if (i === 2) delete a.athlete.teamShortName; if (i === 3) a.athlete.position = null; });
    const bt = H.fx('byteam.json'); bt.teams[0].categories = bt.teams[0].categories.slice(0, 2); delete bt.teams[1].team.displayName;
    routes = [[STAND, (r) => json(r, body)], [/byathlete/, (r) => json(r, ath)], [/byteam/, (r) => json(r, bt)]];
  }
  let flip = false;
  if (mode === 'live') {
    // the second answer moves the Grizzlies from 4th to 1st and the Kings up; tied seeds for 2 teams
    const alt = JSON.parse(JSON.stringify(st));
    const w = alt.children.find((x) => /West/.test(x.name));
    for (const e of w.standings.entries) {
      const ab = e.team.abbreviation, seed = e.stats.find((s) => s.name === 'playoffSeed');
      if (ab === 'MEM') { seed.value = 1; setStat(e, 'wins', 4); }
      else if (seed.value < 4) seed.value += 1;
      if (ab === 'SAC') { seed.value = 9; setStat(e, 'wins', 2); setStat(e, 'losses', 2); }
    }
    routes = [[STAND, (r) => json(r, flip ? alt : st)]];
  }
  if (mode === 'none') routes = [];
  await H.start({ settings: mode === 'none' ? { nbaTeam: 'none' } : {}, routes });
  for (const sec of ['standings', 'leaders', 'teamstats']) {
    if (mode === 'live' && sec !== 'standings') break;
    await H.go(sec); await p.waitForTimeout(1500);
    console.log(`--- ${sec}: row "${await text('.nb-sec')}"`);
    await shot(`${mode}-${sec}`);
    console.log('  text:', (await text(`.nb-s[data-s="${sec}"] .st-sub, .nb-s[data-s="${sec}"] .lg-panel, .nb-s[data-s="${sec}"] .ts-msg, .nb-s[data-s="${sec}"] .nb-lead`)).slice(0, 200));
    await key('ArrowDown', 1, 400); let a = await where('down');
    await key(sec === 'standings' ? 'ArrowDown' : 'ArrowRight', 1, 400); a = await where('into the content'); await seen(`${sec} content`);
    if (sec === 'standings') {
      const rows = await ev(() => [...document.querySelectorAll('.lg-st .nb-in > .nb-tr')].map((r) => r.querySelector('.c-seed').textContent + ':' + r.querySelector('.nm').textContent));
      console.log('  rows:', rows.slice(0, 6).join(' | '));
      console.log('  bands:', await text('.lg-st .nb-band'));
      if (mode === 'pre') {
        const names = rows.map((x) => x.split(':')[1]);
        check(JSON.stringify(names) === JSON.stringify([...names].sort((x, y) => x.localeCompare(y))), 'preseason: alphabetical');
        check(rows.every((x) => x.startsWith(':')), 'preseason: no seeds');
        check(!(await text('.lg-st .nb-band')), 'preseason: no bands');
      }
      if (mode === 'none') {
        check(a.key && (await ev(() => document.querySelector('.lg-st .nb-in .nb-tr')?.dataset.key)) === a.key, `team None: Down lands on row 1 (${a.key})`);
        console.log('  second chip:', await text('.nb-sec [data-sec="team"]'));
      }
      if (mode === 'partial') {
        const cells = await ev(() => [...document.querySelectorAll('.lg-st .nb-in > .nb-tr')].slice(0, 6).map((r) => [...r.querySelectorAll('span.c')].map((s) => s.textContent).join(' ')));
        console.log('  cells:', cells.join(' / '));
      }
      if (mode === 'live') {
        await key('ArrowDown', 1, 400); const on = await where('on a row'); // Houston (row 5)
        await flood('ArrowDown', 6, 40); await p.waitForTimeout(500); const b = await where('on row 11?');
        const scB = await ev(() => document.querySelector('.lg-st .nb-in').style.transform);
        flip = true; await ev(async () => { const m = await import('/tv/js/league.js'); await m.want('standings', { force: true }); }); await p.waitForTimeout(900);
        const a2 = await where('after the reorder'); await shot('live-reorder');
        const scA = await ev(() => document.querySelector('.lg-st .nb-in').style.transform);
        check(a2.key === b.key && !a2.hid && a2.box[1] >= 80 && a2.box[3] <= 513, `focus follows the team after the reorder and stays in view (${b.key} -> ${a2.key} [${a2.box}] hidden=${a2.hid})`);
        console.log('  scroll before/after:', scB, scA);
        const r2 = await ev(() => [...document.querySelectorAll('.lg-st .nb-in > .nb-tr')].map((r) => r.querySelector('.c-seed').textContent + ':' + r.dataset.key.slice(3)));
        console.log('  new order:', r2.join(' '));
        // 'nba' polls (scores every 15 s) while on a row: nothing moves
        for (let i = 0; i < 3; i++) { await ev(async () => { const s = await import('/tv/js/state.js'); s.emit('nba'); }); await p.waitForTimeout(200); }
        const a3 = await where('after nba polls'); check(a3.key === a2.key && JSON.stringify(a3.box) === JSON.stringify(a2.box), 'polls leave focus and scroll alone');
        // go up to row 1 one press at a time
        for (let i = 0; i < 16; i++) { await key('ArrowUp', 1, 350); const x = await H.act(); if (x.conf) break; if (x.hid || x.box[1] < 80 || x.box[3] > 513) check(false, `Up #${i + 1} after reorder: ${x.key} [${x.box}] hidden=${x.hid}`); }
        await where('up to the chips');
      }
    }
    if (sec === 'leaders') { const c2 = await text('.nb-lead'); console.log('  card:', c2.slice(0, 120)); console.log('  rows:', (await text('.nb-lrows .nb-tr')).slice(0, 200)); }
    if (sec === 'teamstats') { console.log('  cats:', await text('.ts .nb-cats')); console.log('  first rows:', (await text('.ts-tb .nb-tr')).slice(0, 160)); }
    await shot(`${mode}-${sec}-in`);
  }
  H.done();
};
