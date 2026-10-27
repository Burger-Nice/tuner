// Hunt: hold ◀ in the guide through three days (catch-up 4.1, 4.4: a held ◀ draws once a frame, a day in about 2 s, and at
// the archive's edge goes to the channel column); then ▼▲ in the deep past, ▲ to the group chip, Back to now.
// Key repeats are sent as the TV sends them (keydown with repeat, ~25 a second).
// Run: node tests/tv/drive.js <out> hunt2-catchup-flood
const setup = require('./catchup-lib.js');
const { screenText, spoilers } = setup;
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  const where = () => ev(() => { const a = document.activeElement; return `${a.className.replace('fx', '').trim()} s=${a.dataset.s ? new Date(+a.dataset.s).toISOString().slice(5, 16) : ''} ${a.dataset.past ? 'past' : ''}${a.dataset.gone || ''} "${(a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 50)}"`; });
  const rowName = () => ev(() => document.activeElement.closest('.g-row')?.querySelector('.nm')?.textContent || '');
  const held = (k, n, gap = 40) => ev(async ({ k, n, gap }) => {
    const fire = (type, repeat) => document.activeElement.dispatchEvent(new KeyboardEvent(type, { key: k, code: k, repeat, bubbles: true, cancelable: true }));
    fire('keydown', false);
    for (let i = 0; i < n; i++) { await new Promise((r) => setTimeout(r, gap)); fire('keydown', true); }
    fire('keyup', false);
  }, { k, n, gap });
  await setup(ctx);
  await ev(() => window.__tunerTest.go('live')); await p.waitForTimeout(3000);
  for (let i = 0; i < 6 && !(await rowName()).includes('ESPN'); i++) await key('ArrowDown', 1, 400);
  await p.waitForTimeout(1500);
  const t0 = Date.now();
  await held('ArrowLeft', 75);   // 3 s held
  console.log(`after 3 s of ◀ (${Date.now() - t0} ms):`, await where(), '| day pill', await ev(() => document.querySelector('.cu-day')?.textContent));
  await held('ArrowLeft', 75);
  await p.waitForTimeout(1500);
  console.log('after 6 s of ◀:', await where(), '| day pill', await ev(() => document.querySelector('.cu-day')?.textContent));
  await shot('flood-edge');
  // one more ◀ at the edge, then ▶ back into the cells
  await key('ArrowLeft', 1, 600); console.log('◀ again:', await where());
  await key('ArrowRight', 1, 900); console.log('▶:', await where());
  // ▼ through rows at the same time: kept / not kept
  for (let i = 0; i < 4; i++) { await key('ArrowDown', 1, 500); console.log(`▼ ${i + 1}:`, (await rowName()).padEnd(26), await where()); }
  await shot('flood-down');
  // ▲ held to the top row, then once more: the group chip
  await held('ArrowUp', 20); await p.waitForTimeout(800);
  console.log('▲ held:', await where());
  await key('ArrowUp', 1, 600); console.log('▲ from the top:', await where());
  await key('ArrowDown', 1, 900); console.log('▼ back:', await where());
  const s = spoilers(await screenText(p)); console.log('spoilers:', JSON.stringify(s));
  await key('Escape', 1, 1200); console.log('Back:', await where(), '| day pill', await ev(() => document.querySelector('.cu-day')?.textContent || 'none'));
  await key('Escape', 1, 800); console.log('Back again:', await where());
  await shot('flood-back');
};
