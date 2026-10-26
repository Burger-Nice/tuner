module.exports = async ({ p, shot, key, log }) => {
  const ev = (f, a) => p.evaluate(f, a);
  await require('./signin.js')({ p, key });
  await p.waitForTimeout(3000);
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(3500);
  await ev(() => document.querySelector('.lib-grid .pc.fx')?.focus()); await p.waitForTimeout(300);
  for (let i = 0; i < 3; i++) { await key('ArrowDown', 1, 350); }
  await log('grid row 4'); await shot('grid-down3');
  await key('ArrowDown', 1, 350); await log('grid row 5'); await shot('grid-down4');
  // the longest description in the catalog
  await key('Enter'); await p.waitForTimeout(2500); await shot('detail');
  console.log('more like this:', await ev(() => [...document.querySelectorAll('.wc .tx b')].map((b) => b.textContent).join(' | ')));
  await ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(1200);
  await ev(() => document.querySelector('[data-screen="account"] .arow.fx')?.focus()); await p.waitForTimeout(300);
  await log('account'); await shot('account');
  await key('ArrowDown', 2, 250); await shot('account-2');
};
