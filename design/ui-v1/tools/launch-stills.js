// node tools/launch-stills.js -> png/launch-<t>.png for a set of instants, plus a storyboard
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const root = path.resolve(__dirname, '..');
  const shots = [['0', 't=0'], ['150', 't=150'], ['300', 't=300'], ['450', 't=450'], ['600', 't=600'], ['820', 't=820'], ['960', 't=960'], ['1100', 't=1100'], ['hold', 't=820&loading=1'], ['slow', 't=820&state=slow'], ['off', 't=820&state=off'], ['rm', 't=0&rm=1']];
  for (const [n, qs] of shots) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
    await p.goto('file://' + root + '/launch/index.html?' + qs); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(root, 'png', `launch-${n}.png`) }); await p.close(); console.log('wrote launch-' + n);
  }
  await b.close();
})();
