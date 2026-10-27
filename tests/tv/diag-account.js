// Account > Provider > Check the connection (design/ui-v1/diagnosis): the row, the sheet while it runs, and its verdict.
// In a browser the TV and Wi-Fi links read "Checked on the TV itself"; the provider and the last channel are real
// (the fake provider). Tune a channel first so there is a last channel to sample.
module.exports = async ({ p, shot, key, log }) => {
  const ev = (f, a) => p.evaluate(f, a);
  await require('./signin.js')({ p, key });
  await p.waitForTimeout(3000);
  await ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(1500);
  await key('ArrowDown', 3, 250); await log('provider rows');
  for (let i = 0; i < 6 && !(await ev(() => document.activeElement?.dataset?.act === 'conncheck')); i++) await key('ArrowDown', 1, 250);
  await log('on the check row'); await shot('acct-provider');
  await key('Enter', 1, 300); await log('running'); await shot('acct-check-running');
  await p.waitForTimeout(9000); await log('after 9 s'); await shot('acct-check-later');
  await p.waitForFunction(() => document.querySelector('.dg-sheet [data-act="again"]'), null, { timeout: 80000 }).catch(() => {});
  await log('done'); await shot('acct-check-done');
  await key('Escape', 1, 400); await log('closed');
};
