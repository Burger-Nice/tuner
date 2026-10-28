const HC = require('./home-common.js');
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  await HC(ctx, {});
  await p.evaluate(() => window.__tunerTest.go('home')); await HC.waitRows(p, 8); await p.waitForTimeout(1500);
  await key('PageDown', 1, 1200); await key('ArrowDown', 1, 600);
  const info = () => p.evaluate(() => { const r = document.querySelector('[data-screen="home"] .hf-row.cur'); return { cards: [...r.querySelectorAll('.hf-track > *')].map((c) => c.dataset.i + ':' + c.className).join(' '), act: document.activeElement.className + ' ' + document.activeElement.dataset.i }; });
  console.log(await info());
  await key('ArrowRight', 1, 500); console.log(await info(), await p.evaluate(() => JSON.stringify(window.__hfDbg)));
  await shot('nba');
};
