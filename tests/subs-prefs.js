// node tests/subs-prefs.js -> Account > Languages' subtitle settings, the move from today's `subLang`
// (design/ui-v1/subtitles/SPEC.md 6.2, 14: the owner's answers of 27 Oct 2026), and the per-title memory
// (subpick, subtime: "Early or late" in 0.5 s steps, the series' release rule).
const { app, runner } = require('./fixtures/subs/lib.js');
const { t, done } = runner('subs-prefs');

(async () => {
  const P = await app('subs/prefs.js');
  const owner = { langs: ['English', 'Icelandic'], subLang: 'auto' };
  let m = P.migrate(owner);
  t('his "auto" -> Always, with Icelandic, English (his answer)', m.subMode === 'always' && m.subLangs.join() === 'Icelandic,English');
  t('... and today\'s player gets Icelandic as its preferred language', m.subLang === 'Icelandic');
  t('no subLang saved at all counts as auto', P.migrate({ langs: ['English'] }).subLangs.join() === 'Icelandic,English');
  t('"off" -> Off', P.migrate({ subLang: 'off' }).subMode === 'off' && P.migrate({ subLang: 'off' }).subLang === 'off');
  m = P.migrate({ langs: ['English', 'Icelandic', 'Spanish'], subLang: 'Spanish' });
  t('a language -> Always, that language first, then the rest of Shown first', m.subMode === 'always' && m.subLangs.join() === 'Spanish,English,Icelandic' && m.subLang === 'Spanish');
  t('a new install: Always, with Shown first (nothing saved for the list)', (() => { const x = P.migrate({ langs: ['Swedish'] }, { hasAccounts: false }); return x.subMode === 'always' && !x.subLangs && P.subPrefs({ langs: ['Swedish'], ...x }).langs.join() === 'Swedish'; })());
  t('runs once: nothing to do when subMode is there', P.migrate({ subMode: 'off', subLang: 'auto' }) === null);
  const p = P.subPrefs({ langs: ['English', 'Icelandic'], ...P.migrate(owner) });
  t('the defaults after the move: Always, Icelandic, English, sounds left out, OpenSubtitles on', p.mode === 'always' && p.langs.join() === 'Icelandic,English' && p.shown.join() === 'English,Icelandic' && p.sounds === false && p.online === true);
  const rv = P.rowValues({ langs: ['English', 'Icelandic'], ...P.migrate(owner) });
  t('the rows read as the mock: English, Icelandic · Always · Icelandic, English · Leave out · On', rv.shown === 'English, Icelandic' && rv.mode === 'Always' && rv.langs === 'Icelandic, English' && rv.sounds === 'Leave out' && rv.online === true);
  t('Off and OpenSubtitles off', P.subPrefs({ subMode: 'off', subOnline: false }).mode === 'off' && P.subPrefs({ subOnline: false }).online === false);
  t('the player\'s one setting follows: Off -> off; Always -> the first language', P.legacySubLang(P.subPrefs({ subMode: 'off' })) === 'off' && P.legacySubLang(P.subPrefs({ subMode: 'always', subLangs: ['English'] })) === 'English');
  t('an unknown mode reads as Always', P.subPrefs({ subMode: 'sometimes' }).mode === 'always');

  // ---- the memory ----
  const data = {};
  const store = { get: (k, d) => (k in data ? JSON.parse(data[k]) : d), set: (k, v) => { data[k] = JSON.stringify(v); } };
  const mem = P.makeMemory(store);
  t('0.5 s steps, up to 60 s', P.step(1.26) === 1.5 && P.step(-0.74) === -0.5 && P.step(75) === 60 && P.step(-61) === -60);
  mem.setOffset('movie:1', 'movie:11', '10465720', 1.5);
  t('Early or late, remembered for title + copy + file', mem.offset('movie:1', 'movie:11', '10465720') === 1.5 && mem.offset('movie:1', 'movie:12', '10465720') === 0);
  t('kept in the store (survives a restart)', P.makeMemory(store).offset('movie:1', 'movie:11', '10465720') === 1.5);
  mem.setOffset('episode:101', 'episode:101', 'f1', -2, { series: 'series:9', release: 'severance.s01e01.tepes' });
  t('a series: the next episode starts from the last value for the same release', mem.offsetFor('episode:102', 'episode:102', 'f2', { series: 'series:9', release: 'severance.s01e01.tepes' }) === -2);
  t('... not for another release', mem.offsetFor('episode:102', 'episode:102', 'f3', { series: 'series:9', release: 'other' }) === 0);
  t('... and an episode\'s own value wins', (mem.setOffset('episode:102', 'episode:102', 'f2', 0.5), mem.offsetFor('episode:102', 'episode:102', 'f2', { series: 'series:9', release: 'severance.s01e01.tepes' }) === 0.5));
  mem.setOffset('movie:1', 'movie:11', '10465720', 0);
  t('back to "As downloaded" forgets it', !Object.keys(store.get('submem', {})).includes('subtime:movie:1:movie:11:10465720'));
  mem.setPick('movie:1', { source: 'opensubtitles', id: '10465720', lang: 'Icelandic' });
  t('the per-title pick: subpick:<title key>', mem.pick('movie:1').id === '10465720' && store.get('submem')['subpick:movie:1'].v.lang === 'Icelandic');
  t('"Still off?" after two big changes', mem.noteBigChange('movie:1') === false && mem.noteBigChange('movie:1') === true);
  mem.forget('movie:1');
  t('forget a title', mem.pick('movie:1') === null);
  for (let i = 0; i < 700; i++) mem.setOffset(`movie:${i}`, 'c', 's', 1);
  t('at most 600 entries, the oldest out', Object.keys(store.get('submem')).length === 600);
  done();
})();
