// Bug hunt: Back from "Your Stremio add-ons" leaves focus nowhere (the code path: the four ways stay on screen without
// focus; the signed-in path: Account with nothing focused). What the next keys do.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { where, H } = C;
  const ev = (f, a) => p.evaluate(f, a);
  const ovs = () => ev(() => [...document.querySelectorAll('#overlays .ov')].map((o) => o.firstElementChild?.nextElementSibling?.className || o.firstElementChild?.className).join(' / '));
  const act = () => ev(() => { const a = document.activeElement; return a === document.body ? 'BODY' : `${a.tagName}.${a.className}`; });
  await C({ p, key }, {});
  const toAddons = async () => { await ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(900); await ev(() => document.querySelector('[data-g="addons"]').click()); await p.waitForTimeout(600); await ev(() => document.querySelector('[data-screen="account"] [data-act="ad:add"]').focus()); };
  await toAddons();
  // A. not signed in: the four ways > the code > (signed in on the phone) > Your Stremio add-ons > Back
  await key('Enter', 1, 700); await key('Enter', 1, 1500);
  await fetch(`${H}/_stremio/approve`); await p.waitForTimeout(4500);
  console.log('A found:', await where(p));
  await key('Escape', 1, 600); await shot('A-after-back');
  console.log('A after Back: active', await act(), '· overlays', await ovs());
  await key('ArrowDown', 1, 300); console.log('A then ▼:', await act(), await where(p));
  await key('Escape', 1, 600); console.log('A then Back:', await act(), await where(p), '· overlays', await ovs());
  // B. signed in now: Add an add-on > Use your Stremio account > Your Stremio add-ons > Back
  await toAddons(); await p.waitForTimeout(300);
  await key('Enter', 1, 700); await key('Enter', 1, 1500);
  console.log('B found:', await where(p));
  await key('Escape', 1, 600); await shot('B-after-back');
  console.log('B after Back: active', await act(), '· overlays', await ovs());
  await key('ArrowDown', 1, 300); console.log('B then ▼:', await act(), await where(p));
};
