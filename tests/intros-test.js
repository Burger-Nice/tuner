// TheIntroDB answers as intros.js reads them (real answers for It's Always Sunny, 27 Oct 2026), and the per-show rules
// of skipshow.js (design/ui-v1/skip/SPEC.md 4). Run: node tests/intros-test.js
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

  // ---- design/ui-v1/skip/SPEC.md 4.1, 4.3, 4.4 (skipshow.js); 9.3 and 9.4 run in the player (SkipRulesTest.java) ----
  const K = await import('../app/tv/js/skipshow.js');
  const now = Date.parse('2026-10-27T21:30:00Z'), H = 3600e3, D = 24 * H;
  const ep = (season, e, id = `${season}${e}`) => ({ kind: 'episode', id, seriesId: 75805, season, ep: e });
  const rec = (it, t, d, at = now - H, done) => ({ t, d, at, item: it, ...(done ? { done: true } : {}) });
  const prog = (recs) => ({ of: (it) => recs.find((r) => r.item.id === it.id) || null, all: () => recs });
  // 4.3: the episode before
  const e1 = ep(1, 1), e2 = ep(1, 2), fin = ep(1, 24), s2e1 = ep(2, 1);
  t('4.3 binge: the queue\'s item before, played past 80%', K.watchedBefore(e2, e1, prog([rec(e1, 1100, 1321)]), now) === true);
  t('4.3 binge: the item before at 70% does not count', K.watchedBefore(e2, e1, prog([rec(e1, 925, 1321)]), now) === false);
  t('4.3 binge: a season\'s E1 after the finale in the queue', K.watchedBefore(s2e1, fin, prog([rec(fin, 2550, 2600)]), now) === true);
  t('4.3 binge: a finale marked watched (done) counts', K.watchedBefore(s2e1, fin, prog([rec(fin, 1, 1, now - H, true)]), now) === true);
  t('4.3 on its own: E-1 of the same season watched in the last 3 days', K.watchedBefore(e2, null, prog([rec(e1, 1300, 1321, now - 2 * D)]), now) === true);
  t('4.3 on its own: E-1 watched 4 days ago does not count', K.watchedBefore(e2, null, prog([rec(e1, 1300, 1321, now - 4 * D)]), now) === false);
  t('4.3 on its own: 5 s of the episode before does not count', K.watchedBefore(e2, null, prog([rec(e1, 5, 1321)]), now) === false);
  t('4.3 on its own: a season\'s E1 gets the button (the finale is not E-1)', K.watchedBefore(s2e1, null, prog([rec(fin, 2600, 2600)]), now) === false);
  t('4.3 another show\'s item before in the queue: falls back to E-1', K.watchedBefore(e2, { ...e1, id: 'x', seriesId: 1 }, prog([rec(e1, 1300, 1321)]), now) === true);
  t('4.3 a film has no recap rule', K.watchedBefore({ kind: 'movie', id: 5 }, null, prog([]), now) === false);
  // 4.1: Account and the show combine
  t('4.1 Off in Account wins over the show', K.introMode('off', { choice: 'auto' }, now) === 'off');
  t('4.1 the show\'s Skip by itself wins over Account\'s button', K.introMode('button', { choice: 'auto' }, now) === 'auto');
  t('4.1 the show\'s Show a button wins over Account\'s auto', K.introMode('auto', { choice: 'button' }, now) === 'button');
  t('4.1 Same as Account follows Account', K.introMode('auto', { choice: null }, now) === 'auto' && K.introMode('button', null, now) === 'button');
  t('4.1 doubtful: buttons for 7 days', K.introMode('auto', { choice: 'auto', doubtfulUntil: now + D }, now) === 'button' && K.introMode('auto', { choice: 'auto', doubtfulUntil: now - 1 }, now) === 'auto');
  // 4.4: the offer
  const pressed = (eps, extra = {}) => ({ choice: null, pressed: eps, letGo: 0, ...extra });
  t('4.4 offer: one counted press in another episode', K.offerDue('button', pressed(['S1E1']), 'S1E2', now) === true);
  t('4.4 no offer: the only press was in this episode', K.offerDue('button', pressed(['S1E2']), 'S1E2', now) === false);
  t('4.4 no offer with Account on Skip by itself (nothing to offer)', K.offerDue('auto', pressed(['S1E1']), 'S1E2', now) === false);
  t('4.4 no offer when the show already has a choice', K.offerDue('button', pressed(['S1E1'], { choice: 'button' }), 'S1E2', now) === false);
  t('4.4 no offer after 2 let go', K.offerDue('button', pressed(['S1E1'], { letGo: 2 }), 'S1E2', now) === false && K.offerDue('button', pressed(['S1E1'], { letGo: 1 }), 'S1E2', now) === true);
  t('4.4 no offer while doubtful', K.offerDue('button', pressed(['S1E1'], { doubtfulUntil: now + D }), 'S1E2', now) === false);
  let sh = K.afterSkip(null, { how: 'press', part: 'intro', level: 'likely', episode: 'S1E1', back: false }, now);
  t('4.4 a press on a Likely match does not count', sh.pressed.length === 0);
  sh = K.afterSkip(sh, { how: 'press', part: 'intro', level: 'sure', episode: 'S1E1', back: true }, now);
  t('4.4 a skip he went back from does not count', sh.pressed.length === 0);
  sh = K.afterSkip(sh, { how: 'press', part: 'recap', level: 'sure', episode: 'S1E1', back: false }, now);
  t('4.4 a Skip recap press does not count', sh.pressed.length === 0);
  sh = K.afterSkip(sh, { how: 'press', part: 'intro', level: 'sure', episode: 'S1E1', back: false }, now);
  sh = K.afterSkip(sh, { how: 'press', part: 'intro', level: 'sure', episode: 'S1E1', back: false }, now);
  t('4.4 presses count once per episode', sh.pressed.join() === 'S1E1' && K.offerDue('button', sh, 'S1E2', now));
  sh = K.afterLetGo(K.afterLetGo(sh));
  t('4.4 let go twice: never asked again, the choice unset (SK-25)', !K.offerDue('button', sh, 'S1E3', now) && sh.choice === null);
  t('4.4 yes on the offer sets Skip by itself', K.afterChoice(sh, 'auto').choice === 'auto' && K.afterChoice(sh, null).choice === null);
  // 4.3: the doubtful mark (review 4: intro go-backs after a skip by itself, in two episodes within 7 days)
  const self = (episode, extra = {}) => ({ how: 'self', part: 'intro', level: 'sure', episode, back: true, anchored: false, ...extra });
  let d1 = K.afterSkip(null, self('S1E2'), now);
  t('4.3 one go-back after a skip by itself: not doubtful yet', !K.doubtful(d1, now));
  t('4.3 a second go-back in the same episode: still not', !K.doubtful(K.afterSkip(d1, self('S1E2'), now + H), now + H));
  t('4.3 a recap go-back does not count', !K.doubtful(K.afterSkip(d1, self('S1E3', { part: 'recap' }), now + H), now + H));
  t('4.3 a go-back with an anchored file does not count', !K.doubtful(K.afterSkip(d1, self('S1E3', { anchored: true }), now + H), now + H));
  t('4.3 a go-back after a pressed skip does not count', !K.doubtful(K.afterSkip(d1, self('S1E3', { how: 'press' }), now + H), now + H));
  t('4.3 the first go-back 8 days ago has gone', !K.doubtful(K.afterSkip(d1, self('S1E3'), now + 8 * D), now + 8 * D));
  const d2 = K.afterSkip(d1, self('S1E3'), now + H);
  t('4.3 go-backs in two episodes within 7 days: doubtful for 7 days (SK-32)', K.doubtful(d2, now + H) && K.doubtful(d2, now + 7 * D) && !K.doubtful(d2, now + H + 7 * D + 1));
  t('4.3 doubtful: buttons even in a yes-show, recaps too', K.introMode('button', { ...d2, choice: 'auto' }, now + 2 * H) === 'button');
  t('4.3 any pick in Intros in this show clears the mark', !K.doubtful(K.afterChoice(d2, 'auto'), now + 2 * H) && !K.doubtful(K.afterChoice(d2, null), now + 2 * H));
  t('episode keys', K.episodeKey(ep(2, 1)) === 'S2E1' && K.episodeKey({ kind: 'movie' }) === '');
  console.log(`intros: ${n} cases, ${bad} failed`);
  process.exitCode = bad ? 1 : 0;
})();
