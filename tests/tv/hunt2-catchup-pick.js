// Hunt: a pick in the sources sheet is "remembered for this game" (catch-up 3.4 rule 1, 5.6). Default setting (channel
// replay first): hold OK on Watch from tip-off, pick the Memphis-feed video, leave; then OK on Watch from tip-off: what plays?
// Run: node tests/tv/drive.js <out> hunt2-catchup-pick
const setup = require('./catchup-lib.js');
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  const hold = async () => { await p.keyboard.down('Enter'); await p.waitForTimeout(700); await p.keyboard.up('Enter'); await p.waitForTimeout(800); };
  const R = () => ev(() => { const r = window.__replay?.R; return r ? `${r.kind} src=${r.sources[r.source]?.name}` : 'none'; });
  const home = async () => { await ev(() => window.__tunerTest.go('home')); for (let i = 0; i < 40 && !(await ev(() => document.querySelector('[data-screen="home"] .hero-plate')?.dataset.rowKind)); i++) await p.waitForTimeout(500); await p.waitForTimeout(800); };
  await setup(ctx);
  await home();
  await hold();
  await key('ArrowDown', 1, 300);
  console.log('picking:', await ev(() => document.activeElement.innerText.replace(/\s+/g, ' ')));
  await key('Enter', 1, 2000);
  console.log('played from the sheet:', await R(), '| stored pick:', await ev(async () => JSON.stringify((await import('./tv/js/games.js')).replayPick('401909875'))));
  await ev(() => window.__replayTest.event({ type: 'exit', played: 1000 }));
  await ev(() => { window.__replay = null; });
  await home();
  console.log('hero:', await ev(() => document.querySelector('[data-screen="home"] .hero-plate')?.innerText.replace(/\s+/g, ' ')));
  await shot('hero-after-pick');
  await key('Enter', 1, 2500);
  console.log('Watch from tip-off now plays:', await R());
};
