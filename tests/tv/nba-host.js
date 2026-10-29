// The NBA tab's section row: Games is the default, Down lands on the hero, chips switch on focus, Back goes to the chip.
module.exports = async ({ p, shot, key, log }) => {
  const ev = (f, a) => p.evaluate(f, a);
  await require('./signin.js')({ p, key });
  await p.waitForTimeout(3000);
  await ev(() => window.__tunerTest.go('nba')); await p.waitForTimeout(2500);
  await log('nba entry'); await shot('nba-games');
  await key('ArrowDown', 3, 300); await log('down x3'); await shot('nba-grid');
  await key('ArrowDown', 1, 400); await log('down x4'); await shot('nba-grid-2');
  await key('Escape', 1, 400); await log('back'); await shot('nba-back');
  await key('ArrowRight', 1, 500); await log('right (team chip)'); await shot('nba-team');
  await key('ArrowRight', 1, 500); await log('right (standings)');
  await key('ArrowDown', 1, 300); await log('down');
  await key('Escape', 1, 300); await log('back');
  await key('Escape', 1, 300); await log('back 2');
  // A box score kept from earlier never puts an old score and state back over a newer scoreboard (hunt 3: the hero stuck LIVE)
  const kept = await ev(async () => {
    const G = await import('./tv/js/games.js');
    const g = G.myGame(); if (!g) return 'no game today';
    const st = g.state, old = JSON.parse(JSON.stringify(g));
    old.state = 'in'; old.home.score = '1'; old.away.score = '2'; old.clock = '9:99';
    G.nba.sums.set(g.id, { at: Date.now() - 3600e3, game: old, box: [], plays: [], teams: [] });
    await G.retryScores();
    const n = G.myGame();
    return n.home.score !== '1' && n.clock !== '9:99' && n.state === st ? 'ok' : `stale: ${n.state} ${n.away.score}-${n.home.score} ${n.clock}`;
  });
  console.log(`${kept === 'ok' ? 'OK  ' : 'FAIL'} an old box score doesn't override the scoreboard`, kept);
};
