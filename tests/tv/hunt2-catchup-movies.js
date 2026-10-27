// Hunt: hidden-game videos in Movies, the morning after (catch-up 5.8, M4/N3/S5). The Movies grid sorted by Recently
// added (the NBA videos lead it); on a masked poster: what focus shows, hold OK (Save to Saved: its toast), OK (Choose a
// video on that row, Play this video under it); then Saved › Movies and Search.
// Run: node tests/tv/drive.js <out> hunt2-catchup-movies
const setup = require('./catchup-lib.js');
const { screenText, spoilers } = setup;
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  const report = (label, text) => { const s = spoilers(text || ''); console.log(`${s.length ? 'LEAK' : 'ok  '} ${label}: ${String(text).slice(0, 400)}${s.length ? `\n      -> ${s.join(' ; ')}` : ''}`); };
  const hold = async () => { await p.keyboard.down('Enter'); await p.waitForTimeout(700); await p.keyboard.up('Enter'); await p.waitForTimeout(700); };
  await setup(ctx);
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(4500);
  // sort: Recently added
  await ev(async () => { const s = await import('./tv/js/state.js'); });
  const masked = () => ev(() => [...document.querySelectorAll('.lib-grid .pc[data-masked]')].map((c) => `${c.dataset.i}:${c.dataset.masked}:${c.innerText.replace(/\s+/g, ' ')}`).join(' | '));
  // pick Sort › Recently added
  for (let i = 0; i < 4 && !(await ev(() => document.activeElement.dataset.act === 'sort')); i++) await key('ArrowUp', 1, 300);
  await key('Enter', 1, 700);
  console.log('sort menu:', await ev(() => [...document.querySelectorAll('#overlays .lr')].map((r) => r.textContent.trim()).join(' | ')));
  for (let i = 0; i < 8 && !/Recently added/.test(await ev(() => document.activeElement.textContent)); i++) await key('ArrowDown', 1, 250);
  await key('Enter', 1, 1500);
  console.log('masked posters:', await masked());
  report('Movies screen', await screenText(p));
  await shot('movies-recent');
  // onto the first poster, then the first masked one ('named': the highlights title)
  await key('ArrowDown', 2, 400);
  const target = await ev(() => { const c = [...document.querySelectorAll('.lib-grid .pc[data-masked="named"]')][0]; return c ? +c.dataset.i : -1; });
  const cur = await ev(() => +document.activeElement.dataset.i);
  console.log('named at', target, 'focus at', cur);
  for (let i = cur; i < target; i++) await key('ArrowRight', 1, 250);
  for (let i = cur; i > target; i--) await key('ArrowLeft', 1, 250);
  await p.waitForTimeout(600);
  console.log('focused:', await ev(() => document.activeElement.innerText.replace(/\s+/g, ' ')));
  report('Movies, masked poster focused', await screenText(p));
  await shot('movies-masked-focus');
  await hold();
  console.log('menu:', await ev(() => [...document.querySelectorAll('.ctxmenu .lr')].map((r) => r.textContent.trim()).join(' | ')));
  await key('Enter', 1, 300);   // Save to Saved
  const toastText = await ev(() => document.querySelector('.toast, #toast, [class*="toast"]')?.innerText.replace(/\s+/g, ' ') || '');
  report('toast after Save to Saved', toastText);
  await shot('movies-saved-toast');
  await p.waitForTimeout(3500);
  // OK on it: Choose a video on that row
  await key('Enter', 1, 1800);
  report('Choose a video', await ev(() => document.querySelector('#overlays')?.innerText.replace(/\s+/g, ' ')));
  console.log('choose focus:', await ev(() => document.activeElement.innerText.replace(/\s+/g, ' ')));
  await shot('movies-choose');
  await key('Escape', 1, 600);
  // Saved › Movies
  await ev(() => window.__tunerTest.go('saved')); await p.waitForTimeout(2000);
  for (let i = 0; i < 3; i++) { if (await ev(() => document.activeElement.dataset.tabS === 'movie')) break; await key('ArrowRight', 1, 600); }
  await p.waitForTimeout(800);
  report('Saved › Movies', await screenText(p));
  await shot('saved-movies');
};
