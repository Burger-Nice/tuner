// Hunt: how often the team page's body is rebuilt after the schedule rail moves (pushed page), and holds that fail.
//   node tests/tv/drive.js <out> hunt-team-hold2
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const h = require('./hunt-games-lib.js')(ctx);
  const { ev, check, where, start, hold } = h;
  await start();
  await key('ArrowDown', 2, 400); let a = await where('games card');
  await hold(); await key('Enter', 1, 1500); a = await where('pushed');
  await ev(() => {
    window.__rw = [];
    const t0 = performance.now();
    const mo = new MutationObserver((ms) => { for (const m of ms) if (m.target.classList?.contains('tp-body')) window.__rw.push(Math.round(performance.now() - t0)); });
    mo.observe(document.querySelector('[data-screen="team"] .tp-body'), { childList: true });
    window.__t0 = t0;
  });
  await key('ArrowDown', 1, 500); a = await where('tile');
  let fails = 0, tries = 0;
  for (let i = 0; i < 8; i++) {
    await key(i % 2 ? 'ArrowRight' : 'ArrowLeft', 1, 100);
    const t = await ev(() => Math.round(performance.now() - window.__t0));
    await hold(); tries++;
    const m = await ev(() => !!document.querySelector('.ctxmenu'));
    console.log(`   move at ${t} ms, hold -> menu ${m}; rewrites so far: ${await ev(() => window.__rw.join(','))}`);
    if (m) await key('Escape', 1, 300); else { fails++; await shot(`hold-failed-${i}`); if (await h.screen() !== 'team') await key('Escape', 1, 900); }
  }
  check(!fails, `every hold on a schedule tile opens its menu (${tries - fails}/${tries})`);
  h.done();
};
