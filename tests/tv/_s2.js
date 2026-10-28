const HC = require('./home-common.js');
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  await HC(ctx, {});
  await p.evaluate(() => window.__tunerTest.go('home')); await HC.waitRows(p, 8); await p.waitForTimeout(1500);
  await key('PageDown', 1, 1200);
  const n = await p.evaluate(() => document.querySelectorAll('[data-screen="home"] .hf-row').length);
  for (let r = 0; r < n; r++) {
    const seq = [];
    for (let i = 0; i < 9; i++) { seq.push((await HC.focusKey(p)).slice(-12)); await key('ArrowRight', 1, 250); }
    const name = await p.evaluate(() => document.querySelector('[data-screen="home"] .hf-row.cur .rt').childNodes[0].textContent);
    console.log(name, '|', seq.join(' '));
    await key('ArrowDown', 1, 500);
  }
};
