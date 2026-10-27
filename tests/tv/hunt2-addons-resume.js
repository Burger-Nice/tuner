// Bug hunt: Continue watching of an add-on copy (SPEC 8.3, 5.4): what is stored (no link), how long OK on the card
// takes (Home never asks ahead; resuming waits for every add-on, the slowest too), and the copy gone.
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check, where } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(2500);
  const made = await ev(async () => {
    const T = await import('/tv/js/titlecopies.js'), c = await import('/tv/js/catalog.js'), st = await import('/tv/js/state.js');
    const t = c.catalog.movie.titles.find((x) => x.name === 'The Long Night');
    const tc = T.titleCopies(t); await tc.start({});
    await tc.q.done;
    const best = tc.copies().find((x) => x.source !== 'provider');
    const it = T.addonItem(t, best, tc);
    st.recordProgress(it, 61, 120, true);
    tc.destroy();
    return { best: best.key, source: best.source };
  });
  console.log('recorded', JSON.stringify(made));
  const stored = await ev(() => Object.entries(localStorage).filter(([k]) => /progress/.test(k)).map(([, v]) => v).join(''));
  check('progress stores no link or key', !/addon-media|eyJ|SECRET/.test(stored), stored.slice(0, 200));
  // a cold start, then OK on the Continue watching card
  await p.reload(); await p.waitForTimeout(4000);
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(1500);
  const card = await ev(() => { const c = [...document.querySelectorAll('[data-screen="home"] .fx')].find((x) => /Long Night/.test(x.textContent)); if (c) c.focus(); return !!c; });
  check('a Continue watching card for The Long Night', card, await where(p));
  await ev(() => { window.__lastVod = null; });
  const t0 = Date.now();
  await key('Enter', 1, 100); await shot('resume-asking');
  let ms = -1;
  for (let i = 0; i < 140; i++) { if (await ev(() => !!window.__lastVod)) { ms = Date.now() - t0; break; } await p.waitForTimeout(100); }
  const v = await ev(() => (window.__lastVod || [])[0] || null);
  check('resume plays within 2 s (Northlight answers in ms)', ms >= 0 && ms < 2000, `took ${ms} ms · source ${v?.source} · copyKey ${v?.copyKey === made.best} · startAt ${v?.startAt}`);
  // the copy gone: Northlight now sends a different file
  await ev(async () => { (await import('/tv/js/addons.js')).forgetStreams('movie', 'tt9000001'); window.__lastVod = null; });
  await p.route(/\/addon\/northlight\/.*\/stream\/movie\/tt9000001\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ streams: [{ name: 'Northlight\n1080p', title: 'The.Long.Night.2000.1080p.WEB-DL\n💾 4 GB', url: 'http://127.0.0.1:8899/addon-media/eyJx/new.mp4', behaviorHints: { filename: 'The.Long.Night.2000.1080p.WEB-DL.mkv', videoSize: 4e9 } }] }) }));
  await p.waitForTimeout(500);
  await ev(() => { const c = [...document.querySelectorAll('[data-screen="home"] .fx')].find((x) => /Long Night/.test(x.textContent)); c?.focus(); });
  await key('Enter', 1, 100);
  for (let i = 0; i < 140; i++) { if (await ev(() => !!window.__lastVod)) break; await p.waitForTimeout(100); }
  await shot('resume-gone');
  const toasts = await ev(() => [...document.querySelectorAll('.toast, [class*=toast]')].map((x) => x.innerText).join(' | '));
  const v2 = await ev(() => (window.__lastVod || [])[0] || null);
  console.log('gone: source', v2?.source, 'startAt', v2?.startAt, 'toasts:', toasts);
};
