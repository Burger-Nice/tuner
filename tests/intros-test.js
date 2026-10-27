// TheIntroDB answers as intros.js reads them (real answers for It's Always Sunny, 27 Oct 2026). Run: node tests/intros-test.js
globalThis.window = globalThis.window || {};
globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem: () => {}, removeItem: () => {} };
(async () => {
  const { parseSegments } = await import('../app/tv/js/intros.js');
  let n = 0, bad = 0;
  const t = (name, ok, got) => { n++; if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ' ' + JSON.stringify(got)}`); };
  let s = parseSegments({ tvdb_id: 75805, type: 'tv', season: 1, episode: 1, intro: [{ start_ms: 104000, end_ms: 131646 }], credits: [{ start_ms: 1288000, end_ms: null }] });
  t('S1 E1: the intro 1:44 to 2:12', s?.intro[0].start === 104000 && s.intro[0].end === 131646, s);
  t('S1 E1: the credits from 21:28 to the end (end 0)', s?.credits[0].start === 1288000 && s.credits[0].end === 0, s);
  s = parseSegments({ intro: [{ start_ms: 96400, end_ms: 126700 }], credits: [{ start_ms: 1222550, end_ms: 1269900 }] });
  t('S5 E3: credits with an end', s?.credits[0].end === 1269900, s);
  s = parseSegments({ intro: [{ start_ms: 0, end_ms: 0 }], recap: [{ start_ms: null, end_ms: 45000 }] });
  t('a recap from the start (start null), the intro confirmed absent (0/0) dropped', s?.recap[0].start === 0 && s.recap[0].end === 45000 && !s.intro.length, s);
  t('only 0/0: nothing', parseSegments({ intro: [{ start_ms: 0, end_ms: 0 }] }) === null);
  t('an end before its start is dropped', parseSegments({ intro: [{ start_ms: 9000, end_ms: 5000 }] }) === null);
  t('junk: nothing', parseSegments('x') === null && parseSegments({ intro: 'x' }) === null);
  console.log(`intros: ${n} cases, ${bad} failed`);
  process.exitCode = bad ? 1 : 0;
})();
