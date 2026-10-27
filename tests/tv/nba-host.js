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
};
