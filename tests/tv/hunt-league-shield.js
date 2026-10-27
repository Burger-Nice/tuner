// Bug hunt: the shield's copies on Standings, Leaders (10 players), Team stats: can the Reveal be reached by key, what
// happens to focus after it, does anything of the hidden result leak. node tests/tv/drive.js <out> hunt-league-shield
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where, seen, text, json, boxes } = H;
  const base = H.fx('byathlete.json');
  const ten = JSON.parse(JSON.stringify(base));
  ten.athletes = Array.from({ length: 10 }, (_, i) => { const a = JSON.parse(JSON.stringify(base.athletes[i % 5])); a.athlete.id = String(base.athletes[i % 5].athlete.id + (i >= 5 ? '0' : '')); a.athlete.displayName += i >= 5 ? ' II' : ''; a.categories.find((x) => x.name === 'offensive').values[0] = 40 - i; return a; });
  await H.start({ settings: { shield: 'mine' }, seen: { upTo: 0, ids: [] }, routes: [[/byathlete/, (r) => json(r, ten)]] });
  const at = await ev(async () => {
    const L = await import('/tv/js/league.js'), G = await import('/tv/js/games.js');
    await L.want('schedule:MEM');
    const [standings, teamStats, ...ld] = await Promise.all([NBA.standings(), NBA.teamStats(), ...NBA.LEADERS.map((c) => NBA.leaders(c.key, 10))]);
    const mem = standings.confs.flatMap((c) => c.teams).find((t) => t.abbr === 'MEM');
    Object.assign(mem, { w: 2, l: 0, streak: 'W2', l10: '2-0', home: '1-0', road: '1-0' });
    const leaders = Object.fromEntries(NBA.LEADERS.map((c, i) => [c.key, ld[i]]));
    const g = G.unseenFor().filter((x) => x.home.abbr === 'MEM' || x.away.abbr === 'MEM').sort((a, b) => a.date - b.date)[0];
    await window.Core.cache.set(`nba:pin:${g.date}`, { at: Date.now(), standings, teamStats, leaders });
    window.Core.store.set('nbaPins', [g.date]);
    return `${g.away.abbr} at ${g.home.abbr}; unseen: ${G.unseenFor().length}`;
  });
  console.log('pinned:', at);
  await p.reload(); await p.waitForTimeout(4000);

  // Standings: West shows the copy; the Reveal sits at the end of the chip row, past East
  await H.go('standings'); await p.waitForTimeout(2000); await shot('st-copy');
  console.log('  legend:', await text('.st-sub .legend'));
  await key('ArrowDown', 1, 400); await where('West');
  await key('ArrowRight', 1, 400); let a = await where('East (held 400 ms)');
  console.log('  table now:', await text('.st-ctx'), '| legend:', await text('.st-sub .legend'));
  await key('ArrowRight', 1, 400); a = await where('Right again'); await shot('st-reveal-reach');
  check(a.act === 'reveal', `Standings: the West copy's Reveal is reachable at a normal pace (${a.act || a.conf})`);
  // Leaders (10 rows): the 'Reveal it' pill under the column
  await H.go('leaders'); await p.waitForTimeout(1500); await shot('ld-copy');
  console.log('  note:', await text('.ld-note'), JSON.stringify(await boxes('.ld-note .fx')));
  let got = false;
  await key('ArrowDown', 1, 400); await key('ArrowRight', 1, 300); await key('ArrowDown', 9, 200); await key('ArrowDown', 1, 300); a = await where('ld: Down from row 10'); got = got || a.act === 'reveal';
  await key('ArrowLeft', 1, 300); await key('ArrowDown', 1, 300); a = await where('ld: Left, Down'); got = got || a.act === 'reveal';
  console.log('  category now:', await ev(() => document.querySelector('.nb-cats .sel')?.dataset.cat));
  check(got, 'Leaders: the copy\'s Reveal is reachable from Points');
  // Team stats: the notice above the list
  await H.go('teamstats'); await p.waitForTimeout(1500); await shot('ts-copy');
  await key('ArrowDown', 1, 400); await key('ArrowRight', 1, 400);
  for (let i = 0; i < 31; i++) { await key('ArrowUp', 1, 150); a = await H.act(); if (!a.key) break; }
  a = await where('ts: Up from the list'); check(a.act === 'reveal', `Team stats: Up from the list reaches the Reveal (${a.act || a.sec})`);
  await H.go('standings'); await p.waitForTimeout(800);
  // fast: Right Right
  await key('ArrowLeft', 1, 600); await key('ArrowRight', 1, 80); await key('ArrowRight', 1, 400); a = await where('fast Right Right');
  if (a.act === 'reveal') {
    await key('Enter', 1, 800); a = await where('after Reveal'); await shot('st-after-reveal'); await seen('Standings after Reveal');
    console.log('  confirm?', await text('#overlays .menu h3'));
    if (await H.ovOpen()) { a = await where('confirm focus'); check(!/Reveal/.test(a.text), 'confirm: Cancel focused'); await key('ArrowRight', 1, 300); await where('right'); await key('Enter', 1, 1200); a = await where('after confirming'); await seen('after confirming the reveal'); await shot('st-revealed'); }
  }
  H.done();
};
