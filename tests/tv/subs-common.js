// Shared by the subtitles title-page scripts (tests/tv/subs-*.js; design/ui-v1/subtitles/SPEC.md 0): the owner's
// scenario on the fake provider. Adds to what the fake provider sends (the page's requests are answered here, so the
// fake provider and the other scripts are untouched):
// - four copies of Oppenheimer named as in SPEC 0 (stream ids 7001-7004) and "EN| The Lion King" (7010);
// - the ratings file's rows for them and Severance (the fake provider's series 9005), Cinemeta's metas and its search
//   for "The Lion King" (1994, 2019, Mufasa);
// - OpenSubtitles (opensubtitles-v3.strem.io): Oppenheimer's real list of 96 files and Severance S1 E1's real list of
//   65, with files rebuilt from Oppenheimer's real cue timings (tests/fixtures/subs; the words are stand-ins), and a
//   switch that makes it not answer (state.down);
// - a fake native quality check (window.__probeEngine, subs.js) with what SPEC 0's table says each copy really is,
//   state.delay ms each, and the TV's "plays here" (window.__playable): the DTS-HD-only copy has no sound.
// opts: { at: ISO time (default the scenario's Tue 27 Oct 2026 21:30 UTC), delay: ms per check, settings: patch }
const path = require('path');
const zlib = require('zlib');
const fs = require('fs');
const C = require('./addons-common.js');
const FX = path.join(__dirname, '../fixtures/subs');
const gun = (n) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(FX, n))));
const timing = gun('timing.json.gz').files;
const oppList = gun('oppenheimer-list.json.gz');
const sevList = gun('severance-s1e1-list.json.gz');
const byId = Object.fromEntries(Object.values(timing).map((f) => [f.id, f]));
const WORDS = { eng: ['You know what this is.', 'I don\'t think we have the time.', 'What do you want from me?', 'We can do this here.'], ice: ['Ég veit það ekki.', 'Hvað er að þér?', 'Það er ekki hægt núna.', 'Við erum hér.'] };
const two = (n) => String(n).padStart(2, '0');
const stamp = (ms) => `${two(Math.floor(ms / 3600000))}:${two(Math.floor(ms / 60000) % 60)}:${two(Math.floor(ms / 1000) % 60)},${String(ms % 1000).padStart(3, '0')}`;
function srt(d, lang, { upTo = Infinity, shift = 0 } = {}) {
  let ms = shift; const w = WORDS[lang] || WORDS.eng, out = [];
  for (let i = 0; i < d.length; i++) { ms += d[i]; if (ms > upTo) break; out.push(`${i + 1}\r\n${stamp(ms)} --> ${stamp(ms + 1800)}\r\n${w[i % w.length]}\r\n`); }
  return out.join('\r\n');
}
const H = C.H;
const MIN = 60;
// SPEC 0: what the check finds for each copy
const ENG = (mime, ch) => [{ mime, ch, lang: 'eng', tagged: true }];
const PROBES = {
  7001: { size: 21.6e9, dur: 180 * MIN, mbps: 15, formats: { video: { w: 3840, h: 1600, fps: 23.976, transfer: 'pq' }, audio: ENG('audio/eac3', 6), text: [] } },
  7002: { size: 9.8e9, dur: 180 * MIN, mbps: 6.6, formats: { video: { w: 1920, h: 800, fps: 23.976 }, audio: ENG('audio/ac3', 6), text: [{ lang: 'eng', tagged: true }, { lang: 'spa', tagged: true }] } },
  7003: { size: 4.1e9, dur: 180 * MIN, mbps: 2.8, formats: { video: { w: 1920, h: 800, fps: 23.976 }, audio: ENG('audio/mp4a-latm', 2), text: [] } },
  7004: { size: 34.5e9, dur: 180 * MIN, mbps: 22, formats: { video: { w: 3840, h: 2160, fps: 23.976, transfer: 'pq', dv: { profile: 8 } }, audio: ENG('audio/vnd.dts.hd', 6), text: [] } },
  7005: { size: 9.1e9, dur: 180 * MIN, mbps: 6.1, formats: { video: { w: 1920, h: 800, fps: 23.976 }, audio: [{ mime: 'audio/ac3', ch: 6, lang: 'ice', tagged: true }], text: [] } },
  7010: { status: 'couldnt', why: 'busy' },
  70100: { size: 6.2e9, dur: 57 * MIN, mbps: 14, formats: { video: { w: 3840, h: 2160, fps: 23.976, transfer: 'hlg' }, audio: ENG('audio/eac3', 6), text: [] } },
};
const VOD0 = [
  ['EN| Oppenheimer 4K', 7001], ['EN| Oppenheimer FHD', 7002], ['EN| Oppenheimer (2023) 4K UHD', 7003], ['MULTI| Oppenheimer 2160p DV', 7004],
].map(([name, id]) => ({ num: 900 + id - 7000, name, stream_type: 'movie', stream_id: id, stream_icon: `${H}/img/p${id % 8}.jpg`, rating: '8.2', added: String(1790000000 + id), category_id: '11', container_extension: 'mkv', year: '2023' }))
  .concat([{ num: 920, name: 'EN| The Lion King', stream_type: 'movie', stream_id: 7010, stream_icon: `${H}/img/p3.jpg`, rating: '8.5', added: '1790000100', category_id: '11', container_extension: 'mp4' }]);
const META = {
  tt15398776: { id: 'tt15398776', type: 'movie', name: 'Oppenheimer', year: '2023', releaseInfo: '2023', runtime: '180 min', country: 'United States, United Kingdom', director: ['Christopher Nolan'], cast: ['Cillian Murphy', 'Emily Blunt'], genres: ['Drama', 'History'], moviedb_id: 872585 },
  tt0110357: { id: 'tt0110357', type: 'movie', name: 'The Lion King', year: '1994', releaseInfo: '1994', runtime: '89 min', country: 'United States', director: ['Roger Allers', 'Rob Minkoff'], genres: ['Animation'], moviedb_id: 8587 },
  tt6105098: { id: 'tt6105098', type: 'movie', name: 'The Lion King', year: '2019', releaseInfo: '2019', runtime: '118 min', country: 'United States', director: ['Jon Favreau'], genres: ['Adventure'], moviedb_id: 420818 },
  tt13186482: { id: 'tt13186482', type: 'movie', name: 'Mufasa: The Lion King', year: '2024', releaseInfo: '2024', runtime: '118 min', country: 'United States', director: ['Barry Jenkins'], genres: ['Adventure'], moviedb_id: 762509 },
  tt11280740: { id: 'tt11280740', type: 'series', name: 'Severance', year: '2015', releaseInfo: '2015–', runtime: '49 min', country: 'United States', genres: ['Drama', 'Mystery', 'Sci-Fi'],
    videos: [[1, 6], [2, 8], [3, 4]].flatMap(([s, n]) => Array.from({ length: n }, (_, e) => ({ id: `tt11280740:${s}:${e + 1}`, season: s, episode: e + 1, name: ['Arrival', 'The Storm', 'Whiteout', 'Thaw', 'Aftershock', 'Home', 'Ice', 'Melt'][e], released: '2015-01-01T00:00:00.000Z' }))) },
};
const J = (r, obj) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(obj) });

module.exports = async ({ p, key }, opts = {}) => {
  const state = { down: false, lists: 0, files: 0 };
  // opts.dub: a fifth copy, Icelandic-dubbed (a non-English prefix foreign to the film's countries: RANKING.md 5)
  const VOD = opts.dub ? [...VOD0, { ...VOD0[1], num: 905, name: 'IS| Oppenheimer (2023)', stream_id: 7005 }] : VOD0;
  // the provider: the extra copies (its own answers otherwise)
  await p.route(/127\.0\.0\.1:8899\/player_api\.php\?.*action=get_vod_(streams|info)/, async (r) => {
    const u = new URL(r.request().url());
    if (u.searchParams.get('action') === 'get_vod_info' && +u.searchParams.get('vod_id') >= 7000) {
      const id = +u.searchParams.get('vod_id');
      return J(r, { info: id === 7010 ? { plot: 'Simba, a lion cub, flees his kingdom after his father\'s death, and must one day return to claim it.', genre: 'Family, Adventure' } : { plot: 'J. Robert Oppenheimer leads the Manhattan Project, then faces a hearing that puts his loyalty on trial.', genre: 'Drama, History', director: 'Christopher Nolan', cast: 'Cillian Murphy, Emily Blunt', duration: '3h 0m', rating: '8.2', releasedate: '2023-07-21' }, movie_data: {} });
    }
    const res = await r.fetch();
    const list = await res.json();
    if (u.searchParams.get('action') === 'get_vod_streams') list.push(...VOD);
    J(r, list);
  });
  await p.route(`${H}/ratings.json`, async (r) => {
    const d = await (await r.fetch()).json();
    d.movies.push(['oppenheimer', 2023, 82, 900000, [0], '', 15398776], ['lion king', 1994, 85, 1100000, [0], '', 110357], ['lion king', 2019, 68, 280000, [0], '', 6105098]);
    d.series.push(['severance', 2015, 87, 250000, [0], '', 11280740]);
    J(r, d);
  });
  await p.route(/\/addon\/cinemeta\/(meta\/(movie|series)\/(tt\d+)\.json|catalog\/movie\/top\/search=[^/]*lion[^/]*\.json)$/i, (r) => {
    const u = r.request().url(), m = /meta\/(?:movie|series)\/(tt\d+)\.json$/.exec(u);
    if (m) return META[m[1]] ? J(r, { meta: META[m[1]] }) : r.fallback();
    J(r, { metas: ['tt0110357', 'tt6105098', 'tt13186482'].map((id) => ({ id, imdb_id: id, type: 'movie', name: META[id].name, releaseInfo: META[id].year })) });
  });
  // OpenSubtitles
  await p.route('https://opensubtitles-v3.strem.io/**', (r) => {
    state.lists++;
    if (state.down) return r.fulfill({ status: 503, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' });
    const u = r.request().url();
    const ep = /tt11280740:1:(\d+)[./]/.exec(u);
    // (Severance: S1 E1's real list for every episode of season 1, its names moved to that episode)
    J(r, /tt15398776/.test(u) ? oppList : ep ? { ...sevList, subtitles: sevList.subtitles.map((x) => ({ ...x, episode: +ep[1], subtitleFileName: String(x.subtitleFileName || '').replace('S01E01', `S01E${two(ep[1])}`) })) } : { subtitles: [], cacheMaxAge: 600 });
  });
  const will = Object.values(timing).find((f) => /Will1869$/.test(f.movieReleaseName || ''))?.d || Object.values(timing)[0].d;
  await p.route('https://subs5.strem.io/**', (r) => {
    state.files++;
    const n = r.request().url().split('/').pop();
    const row = oppList.subtitles.find((s) => s.url.endsWith('/' + n));
    const f = row && byId[row.id];
    const hdr = { 'Access-Control-Allow-Origin': '*' };
    if (f) return r.fulfill({ status: 200, contentType: 'application/x-subrip; charset=utf-8', headers: hdr, body: srt(f.d, f.lang) });
    const sev = sevList.subtitles.find((s) => s.url.endsWith('/' + n));
    // Severance's files: one episode's worth of the same cues, two releases 0.7 s apart (the French label is English text)
    if (sev) return r.fulfill({ status: 200, contentType: 'application/x-subrip; charset=utf-8', headers: hdr, body: srt(will, 'eng', { upTo: 55 * 60e3, shift: sev.id === '8984054' ? 700 : 0 }) });
    r.fulfill({ status: 404, headers: hdr, body: '' });
  });
  await C({ p, key }, { at: opts.at || '2026-10-27T21:30:00Z' });
  await fakes(p, opts);
  return state;
};
// his settings (SPEC 14): Always, Icelandic then English; Shown first English, Icelandic; the fake check and TV.
// over: { stream id: what its check finds } in place of PROBES' entries
async function fakes(p, opts = {}, over = {}) {
  await p.evaluate(({ PROBES, delay, patch }) => {
    const s = JSON.parse(localStorage.getItem('tuner.settings') || '{}');
    Object.assign(s, { langs: ['English', 'Icelandic'], subMode: 'always', subLangs: ['Icelandic', 'English'], subOnline: true }, patch || {});
    localStorage.setItem('tuner.settings', JSON.stringify(s));
    window.__probeLog = [];
    window.__probes = PROBES;   // (a script can change what a copy is)
    window.__probeEngine = (job) => new Promise((res) => {
      const id = +job.url.split('/').pop().split('.')[0];
      window.__probeLog.push(id);
      const r = window.__probes[id];
      setTimeout(() => res(r ? { status: 'ok', etag: '', hash: '', ...r } : { status: 'couldnt', why: 'no fake' }), window.__probeDelay ?? delay);
    });
    window.__playable = async ({ copies }) => Object.fromEntries(copies.map((c) => [c.id, { video: true, audio: !(c.formats.audio || []).every((a) => /dts/.test(a.mime)), reason: '' }]));
  }, { PROBES: { ...PROBES, ...over }, delay: opts.delay ?? 300, patch: opts.settings });
}
// helpers
module.exports.open = (p, kind, name, year) => p.evaluate(async ({ kind, name, year }) => {
  const a = await import('/tv/js/actions.js'), c = await import('/tv/js/catalog.js');
  await c.ensure(kind);
  const t = c.catalog[kind].titles.find((x) => x.name === name && (!year || +x.year === year));
  if (!t) throw new Error(`no ${name}`);
  a.openDetail(t);
}, { kind, name, year });
module.exports.text = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => e.innerText.replace(/\s+/g, ' ').trim()), sel);
module.exports.forget = (p) => p.evaluate(async () => {   // a clean start for subtitles and checks (per account)
  const acc = JSON.parse(localStorage.getItem('tuner.accounts') || '[]')[0];
  const pre = `tuner.a:${acc.id}:`;
  for (const k of Object.keys(localStorage)) if (k.startsWith(pre + 'submem') || k.startsWith(pre + 'probeBudget')) localStorage.removeItem(k);
  await window.Core.cache.set(`probes:${acc.id}`, null);
});
// forget the IMDb answers and some copies' kept checks, and start the app again (the match and the checks run again)
module.exports.unlearn = async (p, ids, over = {}, opts = {}) => {
  await p.evaluate(async (ids) => {
    const acc = JSON.parse(localStorage.getItem('tuner.accounts') || '[]')[0];
    localStorage.removeItem(`tuner.a:${acc.id}:imdb`);
    const k = `probes:${acc.id}`, c = (await window.Core.cache.get(k)) || {};
    for (const x of Object.keys(c)) if (ids.some((id) => x.endsWith(`:movie:${id}`))) delete c[x];
    await window.Core.cache.set(k, c);
  }, ids);
  await p.reload(); await p.waitForTimeout(4000);
  await fakes(p, opts, over);
};
module.exports.C = C;
