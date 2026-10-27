// Bug hunt (flood tour): ▼ held through an add-on chip's grid while the next pages are slow (2.5 s each), then a genre
// switch while a page is still on its way, then Back.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { ok, check, where } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  await p.route(/\/addon\/cinemeta\/catalog\/movie\/top\/.*skip=/, async (route) => { await new Promise((r) => setTimeout(r, 2500)); route.continue().catch(() => {}); });
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(3000);
  await key('ArrowUp', 1, 400);
  for (let i = 0; i < 14; i++) { if (/PopularCinemeta/.test(await where(p))) break; await key('ArrowRight', 1, 120); }
  await ok(p, 'Popular chip', 'PopularCinemeta'); await key('Enter', 1, 2000);
  await key('ArrowDown', 1, 400);
  const trace = [];
  for (let i = 0; i < 40; i++) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(60); if (i % 5 === 4) trace.push(await ev(() => { const a = document.activeElement; return (a?.dataset?.i ?? a?.dataset?.act ?? a?.className) + ''; })); }
  console.log('focus while held:', trace.join(' '));
  await shot('flood-held');
  const st = await ev(() => { const a = document.activeElement; const g = document.querySelector('[data-screen="movie"] .lib-grid'); return { on: a?.dataset?.i, cls: a?.className, inGrid: g.contains(a), skel: g.querySelectorAll('.ad-skel').length, max: Math.max(...[...g.querySelectorAll('.pc')].map((c) => +c.dataset.i)) }; });
  check('held ▼: focus still in the grid', st.inGrid, JSON.stringify(st));
  await p.waitForTimeout(3000);
  const st2 = await ev(() => { const a = document.activeElement; const g = document.querySelector('[data-screen="movie"] .lib-grid'); return { on: a?.dataset?.i, inGrid: g.contains(a), skel: g.querySelectorAll('.ad-skel').length, max: Math.max(...[...g.querySelectorAll('.pc')].map((c) => +c.dataset.i)) }; });
  check('after the page: focus kept, more titles', st2.inGrid && st2.max > st.max, JSON.stringify(st2));
  await shot('flood-after');
  // a genre switch while a page is on its way
  for (let i = 0; i < 30; i++) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(60); }
  for (let i = 0; i < 40; i++) { if (/genre/.test(await where(p))) break; await key('ArrowUp', 1, 80); }
  await ok(p, 'the Genre button', 'genre'); await key('Enter', 1, 500); await key('ArrowDown', 2, 150); await key('Enter', 1, 300);
  await p.waitForTimeout(3500); await shot('genre-after');
  const g = await ev(() => ({ head: document.querySelector('[data-screen="movie"] [data-head]').innerText.replace(/\s+/g, ' ').slice(0, 120), genres: [...new Set([...document.querySelectorAll('[data-screen="movie"] .pc .cap')].map((c) => c.textContent))].slice(0, 8) }));
  console.log(JSON.stringify(g));
  await key('Escape', 1, 600); console.log('after Back:', await where(p));
  await key('Escape', 1, 600); console.log('after Back x2:', await where(p), await ev(() => window.__tunerTest.state().screen));
};
