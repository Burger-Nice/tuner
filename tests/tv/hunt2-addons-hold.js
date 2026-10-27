// Bug hunt (D-pad tour): hold OK on an add-on row: Turn off, Turn on, Remove (focus after each), Move to the bottom
// and OK, the sheet's Remove, Back twice.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { ok, check, hold, where } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  await ev(() => window.__tunerTest.go('account')); await p.waitForTimeout(900);
  await ev(() => document.querySelector('[data-g="addons"]').click()); await p.waitForTimeout(1500);
  const focusRow = (n) => ev((n) => { const r = [...document.querySelectorAll('[data-screen="account"] .ad-row')].find((x) => x.querySelector('.a').textContent === n); r?.focus(); r?.dispatchEvent(new CustomEvent('tvfocus', { bubbles: true })); }, n);
  await focusRow('Kestrel'); await p.waitForTimeout(300);
  await hold(p); await key('ArrowDown', 1, 200); await ok(p, 'hold: Turn off', 'Turn off'); await key('Enter', 1, 600);
  console.log('after Turn off:', await where(p)); await shot('after-off');
  await hold(p); await key('ArrowDown', 1, 200); await ok(p, 'hold: Turn on', 'Turn on'); await key('Enter', 1, 600);
  console.log('after Turn on:', await where(p));
  await hold(p); await key('ArrowDown', 2, 200); console.log('hold 3rd row:', await where(p)); await key('Enter', 1, 800);
  const w = await where(p); console.log('after Hide/Remove:', w); await shot('after-remove');
  check('focus on a row after removing', /ad-row/.test(w), w);
  // Move Northlight to the bottom and drop it
  await focusRow('Northlight'); await p.waitForTimeout(300);
  await hold(p); await key('Enter', 1, 400); await key('ArrowDown', 8, 200); await shot('move-bottom');
  const lifted = await ev(() => { const r = document.querySelector('.ad-row.lift'); if (!r) return null; const b = r.getBoundingClientRect(); return { txt: r.innerText.replace(/\s+/g, ' '), top: b.top / (document.documentElement.clientHeight / 540), bottom: b.bottom / (document.documentElement.clientHeight / 540) }; });
  check('the lifted row stays inside the safe area', lifted && lifted.bottom <= 513, JSON.stringify(lifted));
  await key('Enter', 1, 600);
  const order = await ev(() => [...document.querySelectorAll('[data-screen="account"] .ad-row .a')].map((x) => x.textContent).join(', '));
  console.log('order:', order, '· focus', await where(p));
  await key('Escape', 1, 400); console.log('Back:', await where(p));
  await key('Escape', 1, 400); console.log('Back x2:', await where(p));
};
