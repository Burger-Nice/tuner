// node tests/subs-choose.js -> the add-on's lists and choosing among them (design/ui-v1/subtitles/SPEC.md 3.1, 3.3,
// 3.5, 10.2), on the real lists for Oppenheimer, Severance S1 E1 and the fingerprint test (tests/fixtures/subs).
const { app, json, runner } = require('./fixtures/subs/lib.js');
const { t, done } = runner('subs-choose');

(async () => {
  const O = await app('subs/opensubs.js');
  const opp = json('oppenheimer-list.json.gz'), sev = json('severance-s1e1-list.json.gz'), brk = json('breakin-hash-list.json.gz');
  const owner = { mode: 'always', langs: ['Icelandic', 'English'], shown: ['English', 'Icelandic'], sounds: false, online: true };

  // ---- the request ----
  t('a film', O.listUrl({ imdb: 'tt15398776' }) === 'https://opensubtitles-v3.strem.io/subtitles/movie/tt15398776.json');
  t('an episode', O.listUrl({ imdb: 'tt11280740', season: 1, episode: 1 }) === 'https://opensubtitles-v3.strem.io/subtitles/series/tt11280740:1:1.json');
  t('with the fingerprint', O.listUrl({ imdb: 'tt0086998', hash: '8e245d9679d31e12', size: 12909756 }) === 'https://opensubtitles-v3.strem.io/subtitles/movie/tt0086998/videoHash=8e245d9679d31e12&videoSize=12909756.json');
  t('no id, or a bad fingerprint: no request / no fingerprint', O.listUrl({ imdb: '' }) === '' && O.listUrl({ imdb: 'tt0086998', hash: 'xyz', size: 5 }).endsWith('tt0086998.json'));

  // ---- Oppenheimer ----
  const files = O.normalise(opp);
  const by = O.byLang(files);
  t('96 files, 6 English, 1 Icelandic', files.length === 96 && by.get('English').length === 6 && by.get('Icelandic').length === 1, `${files.length}`);
  const en = O.rankFiles(by.get('English'));
  t('English ranked: the three without sounds first, in the add-on\'s order', en.slice(0, 3).every((f) => !f.nameSounds) && en.slice(3).every((f) => f.nameSounds) && en[0].id === '9767889', en.map((f) => f.fileName.slice(-28)).join(' | '));
  t('prefer sounds: the three with sounds first', O.rankFiles(by.get('English'), { preferSounds: true }).slice(0, 3).every((f) => f.nameSounds));
  t('the frame rate breaks a tie (fpsMilli within 0.1%)', O.rankFiles([{ ...en[0], fps: 25, order: 0 }, { ...en[1], order: 1 }], { copyFps: 23.976 })[0].order === 1);
  const c = O.choose(owner, { soundLang: 'English', inFile: [] }, files);
  t('his order: Icelandic shows, English is ready too', c.on?.lang === 'Icelandic' && c.on.source === 'opensubtitles' && c.ready[0] === 'English' && !c.missing.length);
  const plan = O.downloadPlan(owner, { soundLang: 'English', inFile: [] }, files);
  t('the title page downloads 4 files: Icelandic, the best English, and two more English releases (each shown file gets a pair of others)', plan.files.length === 4 && plan.files[0].lang === 'Icelandic' && plan.files[1].id === '9767889' && plan.files.slice(2).every((f) => f.lang === 'English') && new Set(plan.files.map((f) => f.release)).size === 4, plan.files.map((f) => `${f.lang} ${f.release}`).join(' | '));
  t('no pair from Arabic (8 files, more than English) when his languages have one', plan.files.every((f) => f.lang !== 'Arabic'));
  // in the file first (an English track in the copy's file)
  const inFile = O.choose(owner, { soundLang: 'English', inFile: [{ lang: 'English', forced: false }, { lang: 'Spanish', forced: false }] }, files);
  t('Icelandic downloaded beats English in the file (his order); English is in the file', inFile.on.lang === 'Icelandic' && inFile.perLang[1].source === 'file');
  const icelandicInFile = O.choose(owner, { inFile: [{ lang: 'Icelandic', forced: false }] }, files);
  t('a full Icelandic track in the file wins over a download', icelandicInFile.on.source === 'file' && icelandicInFile.on.lang === 'Icelandic');
  t('a forced-only track doesn\'t count', O.choose(owner, { inFile: [{ lang: 'Icelandic', forced: true }] }, files).on.source === 'opensubtitles');
  // the settings
  t('Off: nothing on, still listed', O.choose({ ...owner, mode: 'off' }, {}, files).on === null && O.choose({ ...owner, mode: 'off' }, {}, files).perLang[0].source === 'opensubtitles');
  t('Only when the sound isn\'t yours: an English copy shows none', O.choose({ ...owner, mode: 'foreign' }, { soundLang: 'English' }, files).on === null);
  t('Only when the sound isn\'t yours: a Korean copy shows Icelandic', O.choose({ ...owner, mode: 'foreign' }, { soundLang: 'Korean' }, files).on.lang === 'Icelandic');
  t('a dub: off by default', O.choose(owner, { soundLang: 'Icelandic', dub: true }, files).offReason === 'dub');
  t('OpenSubtitles off: the file\'s own only', O.choose({ ...owner, online: false }, { inFile: [] }, files).on === null);
  t('English, Icelandic order: English shows', O.choose({ ...owner, langs: ['English', 'Icelandic'] }, {}, files).on.lang === 'English');
  t('no saved subtitle languages: Shown first', O.choose({ ...owner, langs: [] }, {}, files).on.lang === 'English');
  const tooMany = O.downloadPlan({ ...owner, langs: ['Icelandic', 'English', 'Spanish', 'French'] }, {}, files);
  t('at most 4 files', tooMany.files.length <= 4);

  // ---- Severance S1 E1: no Icelandic, and a file for another episode ----
  const all = sev.subtitles.length;
  const sf = O.normalise(sev, { season: 1, episode: 1 });
  t('65 files listed; the "01x08" one is dropped', all === 65 && sf.length === 64 && !sf.some((f) => /01x08/.test(f.fileName)));
  const sc = O.choose(owner, { soundLang: 'English' }, sf);
  t('English shows, "No Icelandic"', sc.on.lang === 'English' && sc.missing[0] === 'Icelandic');
  t('episode names: S01E01, s1.e1, 1x01, Season 1 Episode 1, S01E01E02', O.namedEpisodes('Show.S01E01.srt')[0].e === 1 && O.namedEpisodes('show s1.e1')[0].s === 1 && O.namedEpisodes('Show - 1x01 - x')[0].e === 1 && O.namedEpisodes('Show Season 1 Episode 1')[0].e === 1 && O.namedEpisodes('Show.S01E01E02.srt').length === 2);
  t('a double episode file is kept for its second episode', !O.wrongEpisode({ subtitleFileName: 'Show.S01E01E02.srt' }, 1, 2));
  t('a name with no episode is kept; films are never filtered', !O.wrongEpisode({ subtitleFileName: 'Severance.srt' }, 1, 1) && !O.wrongEpisode({ subtitleFileName: 'Show.S01E08.srt' }));
  t('1080p, x264 and 5.1 are not episodes', O.namedEpisodes('Oppenheimer.2023.1080p.BluRay.x264.DDP5.1').length === 0);

  // ---- the fingerprint list: files made for this copy come first ----
  const bf = O.normalise(brk);
  t('Breakin\' by its fingerprint: 54 files, 4 made for this copy, the first listed first', bf.length === 54 && bf.filter((f) => f.m === 'h').length === 4 && bf[0].m === 'h');
  const be = O.rankFiles(O.byLang(bf).get('English'));
  t('the fingerprint file ranks first in its language', be[0].m === 'h');
  const bp = O.downloadPlan({ ...owner, langs: ['Danish', 'English'] }, {}, bf);
  t('the plan takes a fingerprint file as the timing reference (no pair needed)', bp.files.some((f) => f.m === 'h') && bp.files.length <= 3);
  t('rows without a link or a language are dropped (the format is sniffed from the body later)', O.normalise({ subtitles: [{ id: 1, lang: 'eng', subtitleFileName: 'a.srt' }, { id: 2, url: 'y', subtitleFileName: 'a.srt' }, { id: 3, url: 'z', lang: 'eng', subtitleFileName: 'a.txt' }] }).length === 1);
  t('an unknown id\'s answer', O.normalise({ subtitles: [], cacheMaxAge: 600 }).length === 0);

  // ---- fetchList with a fake add-on: down, slow, ok ----
  const fake = (status, body, ms = 0) => async (u, o) => { await new Promise((r, j) => { const x = setTimeout(r, ms); o?.signal?.addEventListener('abort', () => { clearTimeout(x); j(new Error('aborted')); }); }); return { ok: status === 200, status, json: async () => body, headers: new Map() }; };
  let r = await O.fetchList({ imdb: 'tt15398776' }, { fetch: fake(200, opp) });
  t('fetchList: ok', r.ok && r.files.length === 96);
  r = await O.fetchList({ imdb: 'tt15398776' }, { fetch: fake(503, {}) });
  t('fetchList: down', !r.ok && /503/.test(r.why));
  r = await O.fetchList({ imdb: 'tt15398776' }, { fetch: fake(200, opp, 300), timeout: 50 });
  t('fetchList: slow (the 8 s limit, shortened here)', !r.ok && r.why === 'slow');
  done();
})();
