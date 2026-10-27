// node tests/subs-probes.js -> the quality check's queue, budget and cache (design/ui-v1/subtitles/SPEC.md 5.2, 5.3)
// with a fake clock, a fake native check and a fake account; and what a result means for the copy ranking.
const { app, runner } = require('./fixtures/subs/lib.js');
const { t, done } = runner('subs-probes');

(async () => {
  const P = await app('subs/probes.js');
  const C = await app('copies.js');
  const flush = async () => { for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r)); };
  function world(opts = {}) {
    const w = { now: Date.UTC(2026, 9, 27, 20, 0), timers: [], calls: [], streams: 0, cons: 0, consCalls: 0, saved: null, budget: null, results: {}, hold: null };
    const deps = {
      now: () => w.now,
      setTimer: (f, ms) => { const id = Symbol(); w.timers.push({ id, at: w.now + ms, f }); return id; },
      clearTimer: (id) => { w.timers = w.timers.filter((x) => x.id !== id); },
      streamsInUse: () => w.streams,
      activeCons: async () => { w.consCalls++; return w.cons; },
      engine: (job, signal) => { w.calls.push({ key: job.key, at: w.now }); if (w.hold) return new Promise((res) => { signal.addEventListener('abort', () => res({ status: 'couldnt', why: 'cancelled' })); w.release = () => res(w.results[job.key] || ok(job)); }); return Promise.resolve(w.results[job.key] || ok(job)); },
      load: async () => opts.cache || {},
      save: (c) => { w.saved = JSON.parse(JSON.stringify(c)); },
      budgetStore: { get: () => w.budget, set: (v) => { w.budget = { ...v }; } },
    };
    w.q = P.makeProbes(deps);
    w.advance = async (ms) => { const end = w.now + ms; for (;;) { await flush(); const due = w.timers.filter((x) => x.at <= end).sort((a, b) => a.at - b.at)[0]; if (!due) break; w.timers = w.timers.filter((x) => x !== due); w.now = Math.max(w.now, due.at); due.f(); } w.now = end; await flush(); };
    return w;
  }
  const ok = (job) => ({ status: 'ok', size: 21.6e9, etag: '"x"', hash: 'abcdef0123456789', dur: 10800, mbps: 0, formats: { video: { w: 3840, h: 1600, fps: 23.976, transfer: 'pq', mime: 'video/hevc' }, audio: [{ mime: 'audio/eac3', ch: 6, lang: 'eng', tagged: true }], text: [] } });
  const jobs = (n, p = 'm') => Array.from({ length: n }, (_, i) => ({ key: `acc:movie:${p}${i}`, url: `http://x/${p}${i}.mkv`, headers: {} }));

  // ---- the title page: at once, one at a time ----
  let w = world();
  await w.q.want(jobs(4), 'title');
  await w.advance(10);
  t('the title page\'s copies: all four checked at once, one after another', w.calls.length === 4 && w.calls.every((c) => c.at === w.calls[0].at), w.calls.map((c) => c.at - w.calls[0].at).join(','));
  t('active_cons read once, before the batch', w.consCalls === 1);
  t('cached: a second ask starts nothing', (await w.q.want(jobs(4), 'title'), await w.advance(10), w.calls.length === 4));
  t('the cache was saved', Object.keys(w.saved).length === 4 && w.saved['acc:movie:m0'].hash === 'abcdef0123456789');

  // ---- the background: 60 s apart ----
  w = world();
  await w.q.want(jobs(3, 'c'), 'continue');
  await w.advance(1000);
  t('Continue watching: the first at once', w.calls.length === 1);
  await w.advance(59e3);
  t('... the next after 60 s', w.calls.length === 2 && w.calls[1].at - w.calls[0].at >= 60e3, `${(w.calls[1]?.at - w.calls[0].at) / 1e3} s`);
  await w.advance(61e3);
  t('... and the third 60 s after that', w.calls.length === 3);

  // ---- order: title page, Continue watching, Saved ----
  w = world();
  await w.q.want(jobs(2, 's'), 'saved');
  await w.q.want(jobs(2, 'c'), 'continue');
  await w.q.want(jobs(1, 't'), 'title');
  await w.advance(5 * 60e3);
  t('order: the title page, then Continue watching, then Saved', w.calls.map((c) => c.key.split(':')[2]).join(' ') === 't0 c0 c1 s0 s1', w.calls.map((c) => c.key.split(':')[2]).join(' '));

  // ---- never while the account is in use ----
  w = world(); w.streams = 1;
  await w.q.want(jobs(2), 'title');
  await w.advance(10 * 60e3);
  t('the player (or a preview) open: nothing starts', w.calls.length === 0 && w.q.status().why === 'streams in use');
  w.streams = 0; w.q.poke();
  await w.advance(2000);
  t('... closed: the checks run', w.calls.length === 2);
  w = world(); w.cons = 1;
  await w.q.want(jobs(2), 'title');
  await w.advance(4 * 60e3);
  t('another device on the account (active_cons 1): nothing starts', w.calls.length === 0 && w.consCalls === 1);
  w.cons = 0;
  await w.advance(2 * 60e3);
  t('... re-read 5 min later, 0: the checks run', w.calls.length === 2 && w.consCalls === 2);

  // ---- Play cancels the check in flight, and it runs again later ----
  w = world(); w.hold = true;
  await w.q.want(jobs(1), 'title');
  await w.advance(10);
  t('a check in flight', w.q.status().running === 'acc:movie:m0');
  w.q.cancel(); w.streams = 1;
  await w.advance(10);
  t('Play cancels it, nothing kept', !w.q.peek('acc:movie:m0') && w.q.status().running === '');
  w.streams = 0; w.hold = false; w.q.poke();
  await w.advance(70e3);
  t('... and it runs again once the player closes', w.calls.length === 2 && !!w.q.peek('acc:movie:m0'));

  // ---- the budget: 60 a day ----
  w = world();
  await w.q.want(jobs(65), 'title');
  await w.advance(10);
  t('60 a day', w.calls.length === 60 && w.q.status().why === 'today\'s checks are used');
  w.now = Date.UTC(2026, 9, 28, 10, 0); w.q.poke();
  await w.advance(5000);
  t('... and the rest the next day', w.calls.length === 65);

  // ---- refusals: back off 30 min; two in a day stop checks for the day ----
  w = world(); w.results['acc:movie:m0'] = { status: 'refused', why: '458' };
  await w.q.want(jobs(2), 'title');
  await w.advance(10);
  t('a refusal: nothing more for 30 min', w.calls.length === 1 && w.q.status().why === 'backing off');
  await w.advance(29 * 60e3);
  t('... still nothing at 29 min', w.calls.length === 1);
  await w.advance(2 * 60e3);
  t('... at 30 min the queue goes on (and the refused copy is retried)', w.calls.length >= 2, `${w.calls.length}`);
  t('a second refusal stops checks for the day', w.q.status().why === 'backing off' || w.q.status().why === 'refused twice today');
  await w.advance(40 * 60e3);
  t('... for the day', w.q.status().why === 'refused twice today', w.q.status().why);

  // ---- the cache: 60 days, size / ETag at play start ----
  const old = { 'acc:movie:m0': { key: 'acc:movie:m0', at: Date.UTC(2026, 7, 20), used: 0, status: 'ok', size: 5, etag: 'a' }, 'acc:movie:m1': { key: 'acc:movie:m1', at: Date.UTC(2026, 9, 1), used: 0, status: 'ok', size: 7, etag: 'b', formats: null } };
  w = world({ cache: old });
  await w.q.ready();
  t('kept 60 days: a 68-day-old result is gone, a 26-day-old one is there', !w.q.peek('acc:movie:m0') && !!w.q.peek('acc:movie:m1'));
  t('the size seen at play start changed: checked again', w.q.noteStart('acc:movie:m1', { size: 8 }) === true && !w.q.peek('acc:movie:m1'));
  t('the same size and ETag: kept', (w = world({ cache: old }), await w.q.ready(), w.q.noteStart('acc:movie:m1', { size: 7, etag: 'b' }) === false));

  // ---- 'unavailable' (a build without the native check) counts nothing and keeps nothing ----
  w = world(); w.results['acc:movie:m0'] = { status: 'unavailable' };
  await w.q.want(jobs(1), 'title');
  await w.advance(10);
  t('no check on this build: nothing counted, nothing kept', !w.q.peek('acc:movie:m0') && (w.budget?.n || 0) === 0);

  // ---- what a result means ----
  const e = { status: 'ok', size: 21.6e9, dur: 10800, formats: ok().formats };
  const k = P.checkedOf(e);
  t('3840 x 1600 HDR10 is 4K HDR10', k.res === '4K' && k.hdr === 'HDR10' && !k.dv && k.fps === 23.976);
  t('the picture\'s share: 21.6 GB over 3 h, less E-AC3\'s 0.77: 15.2 Mb/s', k.mbps === 15.2, k.mbps);
  t('1920 x 800 is 1080p; 1280 x 534 720p; 720 x 400 SD', P.resClass(1920, 800) === '1080p' && P.resClass(1280, 534) === '720p' && P.resClass(720, 400) === 'SD');
  t('nominal sound rates: AAC 0.2, AC3 0.64, E-AC3 0.77, DTS 1.5, DTS-HD and TrueHD 4', [['audio/mp4a-latm', 0.2], ['audio/ac3', 0.64], ['audio/eac3', 0.77], ['audio/vnd.dts', 1.5], ['audio/vnd.dts.hd', 4], ['audio/true-hd', 4]].every(([m, r]) => P.soundRate({ mime: m }) === r));
  const sub = P.checkedOf({ ...e, formats: { ...e.formats, text: [{ lang: 'eng', tagged: false }, { lang: 'spa', tagged: true }, { lang: 'ice', forced: true, tagged: true }] } });
  t('subtitles in the file: an untagged track is "probably English", forced ones don\'t count', sub.subsInFile.join() === 'English,Spanish' && sub.inFile[0].tagged === false);
  const untagged = P.checkedOf({ ...e, formats: { ...e.formats, audio: [{ mime: 'audio/ac3', ch: 6, lang: 'eng', tagged: false }] } });
  t('an untagged sound track: language English for ranking, but no tagged sound (never a dub by it)', untagged.lang === 'English' && untagged.taggedSound === '');
  t('Dolby Vision profile 8 on a PQ base: DV and HDR10', (() => { const x = P.checkedOf({ ...e, formats: { ...e.formats, video: { w: 3840, h: 2160, transfer: 'pq', dv: { profile: 8 } } } }); return x.dv && x.dvProfile === 8 && x.hdr === 'HDR10'; })());
  t('"couldnt" and head-only without formats mean unchecked', P.checkedOf({ status: 'couldnt' }) === null && P.checkedOf({ status: 'head-only', formats: null }) === null);
  // into the shared ranking: the named-4K 1080p copy loses to the real 4K one (the Oppenheimer mock's copies a and c)
  const real4k = C.providerCopy({ id: 'a', name: 'EN| Oppenheimer 4K' }, { checked: k });
  const fake4k = C.providerCopy({ id: 'c', name: 'EN| Oppenheimer (2023) 4K UHD' }, { checked: P.checkedOf({ status: 'ok', size: 4.1e9, dur: 10800, formats: { video: { w: 1920, h: 800 }, audio: [{ mime: 'audio/mp4a-latm', ch: 2, lang: 'eng' }], text: [] } }) });
  const ranked = C.rank([fake4k, real4k], { langs: ['English', 'Icelandic'], runtime: 10860 });
  t('checked results rank: the real 4K above the "4K UHD" that is 1080p', ranked[0].id === 'a', ranked.map((c) => c.id).join(' '));
  done();
})();
