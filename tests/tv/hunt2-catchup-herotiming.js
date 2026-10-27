// Hunt: the morning after, from a cold start: when does Home's hero become "Watch from tip-off", and what is it (and
// what does OK do) before that? (catch-up 5.1 Home priority; UI-SPEC: the hero is chosen before first paint and kept
// 3 s so the focused button never changes under your thumb.) Last channel: US: ESPN HD.
// Run: node tests/tv/drive.js <out> hunt2-catchup-herotiming
const setup = require('./catchup-lib.js');
module.exports = async (ctx) => {
  const { p, shot } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  await setup(ctx);
  await ev(async () => { const s = await import('./tv/js/state.js'); s.store.set(s.scoped('lastLive'), '1001'); });
  // a cold start: the app's caches of the catalogs stay (as on the TV), the page starts again
  const t0 = Date.now();
  await p.reload();
  let last = '';
  for (let i = 0; i < 260; i++) {
    const h = await ev(() => {
      const hp = document.querySelector('[data-screen="home"] .hero-plate');
      const launch = document.querySelector('#launch, .launch');
      const vis = launch && getComputedStyle(launch).display !== 'none' && !launch.hidden && +getComputedStyle(launch).opacity > 0.05;
      return `${vis ? '[launch] ' : ''}${hp?.dataset.rowKind || ''} ${hp?.querySelector('.btn')?.textContent || ''} | focus: ${document.activeElement?.textContent?.trim().slice(0, 30)}`;
    }).catch(() => 'n/a');
    if (h !== last) { console.log(`${String(Date.now() - t0).padStart(6)} ms  ${h}`); last = h; if (/Watch$|Watch \|/.test(h)) await shot('hero-before'); }
    if (!globalThis.__s8 && Date.now() - t0 > 8000) { globalThis.__s8 = 1; console.log('at 8 s:', await ev(() => document.querySelector('[data-screen="home"] .hero-plate')?.innerText.replace(/\s+/g, ' '))); await shot('hero-at-8s'); }
    if (/morning/.test(h)) break;
    await p.waitForTimeout(200);
  }
  await shot('hero-after');
  console.log('debug:', await ev(async () => { const g = await import('./tv/js/games.js'); const c = await import('./tv/js/catchup.js'); const mine = g.knownGames().filter((x) => x.home.abbr === 'MEM' || x.away.abbr === 'MEM').filter((x) => x.state === 'post').sort((a, b) => b.date - a.date)[0]; return JSON.stringify({ today: g.nba.todayDay, n: g.knownGames().length, last: mine && [mine.id, new Date(mine.date).toISOString(), g.hidden(mine)], reps: mine && c.replaysOf(mine)?.length, busy: mine && c.replaysBusy(mine), morning: !!c.morningGame(), now: new Date().toISOString() }); }));
};
module.exports.debug = true;
