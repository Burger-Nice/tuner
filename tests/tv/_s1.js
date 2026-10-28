const HC = require('./home-common.js');
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  await HC(ctx, {});
  await p.evaluate(() => window.__tunerTest.go('home')); await HC.waitRows(p, 8); await p.waitForTimeout(1500);
  await shot('mq');
  console.log(await HC.lineup(p));
  for (let i=0;i<3;i++){ await key('ArrowDown',1,700); await shot('down'+i); }
  await key('ArrowUp',1,700); await shot('up');
};
