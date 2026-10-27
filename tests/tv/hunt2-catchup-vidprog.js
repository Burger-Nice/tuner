// Hunt: a full-game video's progress the morning after (catch-up 5.2: "Its bar is on the window's scale", M5: a hidden
// video shows no end). Replays play: Full-game video first; the player reports 72 min played of a 140 min video, exits.
// What does Continue watching (card, bar) and the Home hero show?
// Run: node tests/tv/drive.js <out> hunt2-catchup-vidprog
const setup = require('./catchup-lib.js');
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  await setup(ctx, { replaysPlay: 'video' });
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(4000);
  await key('Enter', 1, 2500);
  console.log('playing:', await ev(() => `${window.__replay?.R.kind} ${window.__replay?.R.sources[window.__replay.R.source].name}`));
  await ev(() => { window.__replayTest.event({ type: 'position', played: 72 * 60e3, duration: 140 * 60e3 }); window.__replayTest.event({ type: 'exit', played: 72 * 60e3 }); });
  await p.waitForTimeout(800);
  console.log('progress:', await ev(() => { const s = window.__tunerTest; for (const k of Object.keys(localStorage)) if (/:progress$/.test(k)) { const o = JSON.parse(localStorage.getItem(k)); const x = o['rp:401909875']; return x && JSON.stringify({ t: x.t, d: x.d, pos: x.item.pos }); } }));
  await ev(() => window.__tunerTest.go('live')); await p.waitForTimeout(800);
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(3000);
  console.log('hero:', await ev(() => document.querySelector('[data-screen="home"] .hero-plate')?.innerText.replace(/\s+/g, ' ')));
  console.log('cont card:', await ev(() => [...document.querySelectorAll('[data-rail="cont"] .hc')].map((c) => `${c.innerText.replace(/\s+/g, ' ')} bar=${c.querySelector('.prog i')?.style.width}`).join(' | ')));
  await key('ArrowDown', 1, 600); await shot('cont');
};
