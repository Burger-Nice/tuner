// Bug hunt: Stremio signed him out (a dead key). "Use your Stremio account" goes straight to Your Stremio add-ons,
// which says "Sign in again from Add an add-on" — the same way, which loops; it never shows the code.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check, where } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { signedIn: true });
  await ev(() => { const acc = JSON.parse(localStorage.getItem('tuner.accounts'))[0]; localStorage.setItem(`tuner.a:${acc.id}:stremio`, JSON.stringify({ authKey: 'DEAD-key', at: Date.now(), keep: true })); });
  await p.reload(); await p.waitForTimeout(3000);
  await ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(900);
  await ev(() => document.querySelector('[data-g="addons"]').click()); await p.waitForTimeout(1500);
  for (let round = 1; round <= 2; round++) {
    await ev(() => document.querySelector('[data-screen="account"] [data-act="ad:add"]').focus());
    await key('Enter', 1, 700); await key('Enter', 1, 1800); await shot('round' + round);
    const txt = await ev(() => [...document.querySelectorAll('.ad-full')].pop()?.innerText.replace(/\s+/g, ' ') || '(no full screen)');
    const code = await ev(() => !!document.querySelector('.ad-code'));
    console.log(`round ${round}:`, txt.slice(0, 140), '· code screen', code);
    check(`round ${round}: the code screen to sign in again`, code, '');
    await key('Escape', 1, 500); await key('Escape', 1, 500);
  }
  const pane = await ev(() => document.querySelector('[data-screen="account"] [data-act="ad:resign"]')?.innerText.replace(/\s+/g, ' ') || '(no resign row)');
  console.log('pane row:', pane);
};
