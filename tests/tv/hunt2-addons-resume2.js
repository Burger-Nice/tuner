// Bug hunt: resuming an add-on copy from Continue watching sends the player runtime 0 (the not-ready rule is off), and
// picks the same copy even when its name now says it is downloading (a debrid cache that expired).
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check } = C;
  const ev = (f, a) => p.evaluate(f, a);
  await C({ p, key }, { addons: true });
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(2500);
  // from the title page: what Play sends
  const fromPage = await ev(async () => {
    const T = await import('/tv/js/titlecopies.js'), c = await import('/tv/js/catalog.js'), st = await import('/tv/js/state.js');
    const t = c.catalog.movie.titles.find((x) => x.name === 'The Long Night');
    const tc = T.titleCopies(t); await tc.start({ tmdb: 4401 }); await tc.q.done;
    const best = tc.copies().find((x) => x.source === 'Northlight' && /remux/i.test(x.filename));
    const it = T.addonItem(t, best, tc);
    st.recordProgress(it, 3600, 7200, true);
    tc.destroy();
    return { runtime: it._entry.runtime, key: best.key, file: best.filename };
  });
  console.log('from the title page:', JSON.stringify(fromPage));
  // the next day: the same file, but Northlight's name now says it is downloading
  await p.route(/\/addon\/northlight\/.*\/stream\/movie\/tt9000001\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ streams: [
    { name: 'Northlight [download]\n4K', title: 'The.Long.Night.2000.2160p.BluRay.REMUX.DV.HDR.TrueHD.Atmos\n💾 51.6 GB', url: 'http://127.0.0.1:8899/addon-media/eyJx/short.mp4', behaviorHints: { filename: 'The.Long.Night.2000.2160p.BluRay.REMUX.DV.HDR.TrueHD.Atmos.mkv', videoSize: 51.6e9, bingeGroup: 'northlight|4k|remux' } },
    { name: 'Northlight\n1080p', title: 'The.Long.Night.2000.1080p.BluRay\n💾 14.2 GB', url: 'http://127.0.0.1:8899/addon-media/eyJx/bluray.mp4', behaviorHints: { filename: 'The.Long.Night.2000.1080p.BluRay.mkv', videoSize: 14.2e9 } },
  ] }) }));
  await ev(async () => { (await import('/tv/js/addons.js')).forgetStreams('movie', 'tt9000001'); window.__lastVod = null; });
  await ev(async () => { const a = await import('/tv/js/actions.js'), st = await import('/tv/js/state.js'); const row = st.continueRows().find((r) => r.item.id === 'tt9000001'); a.resumeItem(row.item); });
  for (let i = 0; i < 140; i++) { if (await ev(() => !!window.__lastVod)) break; await p.waitForTimeout(100); }
  const v = await ev(() => { const e = (window.__lastVod || [])[0]; return e && { runtime: e.runtime, copyKey: e.copyKey, startAt: e.startAt, file: /short/.test(e.url) ? 'the placeholder (short.mp4)' : 'another' }; });
  console.log('resumed:', JSON.stringify(v));
  check('resume sends the film\'s runtime (not-ready rule on)', v && v.runtime === fromPage.runtime, `runtime ${v?.runtime} (title page sent ${fromPage.runtime})`);
  check('resume skips the copy that now says downloading', v && v.file !== 'the placeholder (short.mp4)', v?.file);
};
