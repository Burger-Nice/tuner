const HC = require('./home-common.js');
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  await HC(ctx, {});
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('tuner.settings')||'{}'); }); 
  await p.evaluate(() => window.__tunerTest.go('home')); await HC.waitRows(p, 8); await p.waitForTimeout(1500);
  await shot('mq');
  await key('PageDown', 1, 1200);
  const n = await p.evaluate(() => document.querySelectorAll('[data-screen="home"] .hf-row').length);
  for (let i = 0; i < n + 1; i++) {
    const st = await p.evaluate(() => { const a = document.activeElement, b = a.getBoundingClientRect(), r = a.closest('.hf-row'); return `${r?.querySelector('.rt').childNodes[0].textContent} y=${Math.round(b.top)}-${Math.round(b.bottom)} ${a.dataset.key}`; });
    console.log(i, st);
    if (i === 0 || i === n - 1 || i === 8) await shot('row' + i);
    await key('ArrowDown', 1, 450);
  }
};
