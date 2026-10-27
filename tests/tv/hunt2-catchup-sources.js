// Hunt: Replays play (Account › NBA) and the sources sheet (catch-up 5.6, 13.1). Ask each time: Watch from tip-off opens
// the sheet (the channel replay focused); Full-game video first: the hero's caption and what plays; a pick in the sheet
// is remembered (the sheet opens on it next time, the game page's caption names it); Back closes; then the game page.
// Run: node tests/tv/drive.js <out> hunt2-catchup-sources
const setup = require('./catchup-lib.js');
const { JAZZ, screenText, spoilers } = setup;
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  const hold = async () => { await p.keyboard.down('Enter'); await p.waitForTimeout(700); await p.keyboard.up('Enter'); await p.waitForTimeout(800); };
  const focused = () => ev(() => { const a = document.activeElement; return `${a.className} ${a.dataset.act || ''} "${(a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60)}"`; });
  const hero = () => ev(() => document.querySelector('[data-screen="home"] .hero-plate')?.innerText.replace(/\s+/g, ' '));
  const home = async () => { await ev(() => window.__tunerTest.go('home')); for (let i = 0; i < 40 && !(await ev(() => document.querySelector('[data-screen="home"] .hero-plate')?.dataset.rowKind)); i++) await p.waitForTimeout(500); await p.waitForTimeout(800); };
  const sheet = () => ev(() => document.querySelector('.cu-srcs')?.innerText.replace(/\s+/g, ' ') || '(no sheet)');
  const R = () => ev(() => { const r = window.__replay?.R; return r ? `${r.kind} src=${r.sources[r.source]?.name} startAt=${Math.round(r.startAt / 60000)}m` : 'none'; });

  for (const mode of ['ask', 'video']) {
    await setup(ctx, { replaysPlay: mode });
    await home();
    console.log(`[${mode}] hero:`, await hero(), '| focus', await focused());
    await shot(`${mode}-hero`);
    await ev(() => { window.__replay = null; });
    await key('Enter', 1, 2000);
    console.log(`[${mode}] OK on the primary → sheet:`, await sheet(), '| focus', await focused(), '| replay', await R());
    await shot(`${mode}-after-ok`);
    if (await ev(() => !!document.querySelector('.cu-srcs'))) {
      // pick the second row (a video), Back from nothing
      await key('ArrowDown', 1, 300);
      console.log(`[${mode}] picking:`, await focused());
      await key('Enter', 1, 2000);
      console.log(`[${mode}] played:`, await R());
      await ev(() => window.__replayTest.event({ type: 'exit', played: 1000 }));
      await home();
      console.log(`[${mode}] hero after the pick:`, await hero());
      await hold();
      console.log(`[${mode}] hold OK → sheet:`, await sheet(), '| focus', await focused());
      await key('Escape', 1, 600);
      console.log(`[${mode}] after Back:`, await focused());
    }
    // the game page: its caption
    await home();
    await key('ArrowRight', 1, 300); await key('Enter', 1, 2500);
    console.log(`[${mode}] game page card:`, await ev(() => document.querySelector('.cu-state')?.innerText.replace(/\s+/g, ' ')), '| focus', await focused());
    await shot(`${mode}-game`);
    const s = spoilers(await screenText(p)); if (s.length) console.log('LEAK', s);
  }
};
