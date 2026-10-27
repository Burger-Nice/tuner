// Which film is this? from the subtitles side (design/ui-v1/subtitles/SPEC.md 3.2, 4.5; mocks detail-which-film,
// detail-match): "EN| The Lion King" has no year, two IMDb films have the name and its copy couldn't be checked, so the
// pill asks ("Subtitles: which film is it?", "Two films are called The Lion King"); OK opens the picker (the length is
// unknown, rows title / year · length · director, Search by another name, None of these); picking 1994 gives the 1994
// film's subtitles (none on OpenSubtitles). Then, with the copy's length checked (89 min), the match is made without
// asking (exactly one within 5%, the other more than 10% away).
// Run: node tests/tv/drive.js <out> subs-match
const SC = require('./subs-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check, ok } = SC.C;
  const ev = (f, a) => p.evaluate(f, a);
  await SC({ p, key }, { delay: 300 });
  const D = '[data-screen="detail"]';
  const pills = () => SC.text(p, `${D} .row-flex .pillbtn`);
  const slot = async () => (await SC.text(p, `${D} .st-side`))[0] || '';
  await SC.open(p, 'movie', 'The Lion King');
  await p.waitForTimeout(3000);
  let pl = await pills();
  check('one copy: no Version pill', pl.length === 1, pl.join(' | '));
  check('the pill asks: Subtitles: which film is it?', pl[0] === 'Subtitles: which film is it?', pl[0]);
  check('Two films are called The Lion King', (await slot()) === 'Two films are called The Lion King', await slot());
  await key('ArrowDown', 1, 300); await ok(p, 'the Subtitles pill', 'subs');
  await shot('detail-which-film');
  await key('Enter', 1, 1500);
  await ok(p, 'the picker: the first result focused (no length)', 'The Lion King1994');
  await shot('detail-match');
  const hd = (await SC.text(p, '.menu.ad-match .ad-qq'))[0];
  check('header: this copy\'s length is unknown', /From the Cinemeta search for “The Lion King” · this copy's length is unknown/.test(hd), hd);
  const rows = await SC.text(p, '.menu.ad-match .lr.ad-two');
  console.log(rows.join('\n'));
  check('rows: 1994, 2019, Mufasa, Search by another name, None of these', /^The Lion King 1994 · 1 h 29 min · Roger Allers, Rob Minkoff$/.test(rows[0]) && /^The Lion King 2019 · 1 h 58 min · Jon Favreau$/.test(rows[1]) && /^Mufasa: The Lion King 2024 · 1 h 58 min · Barry Jenkins$/.test(rows[2]) && /^Search by another name On the keyboard$/.test(rows[3]) && /^None of these Keep this copy only: no add-on copies, no downloaded subtitles$/.test(rows[4]), '');
  check('the foot', /Your pick is remembered for this title, for subtitles and copies alike\./.test((await SC.text(p, '.menu.ad-match .ad-foot'))[0] || ''));
  // Search by another name: the field, then back
  await key('ArrowDown', 3, 150); await ok(p, 'Search by another name', 'search'); await key('Enter', 1, 500);
  check('Search by another name: a field on the keyboard', await ev(() => document.activeElement?.id === 'wfName'));
  await key('Escape', 1, 1500);
  await ok(p, 'Back: the picker again', 'The Lion King1994');
  await key('Enter', 1, 2500);
  pl = await pills();
  const m = await ev(async () => { const I = await import('/tv/js/imdb.js'), c = await import('/tv/js/catalog.js'); return I.savedMatch(c.catalog.movie.titles.find((x) => x.name === 'The Lion King')); });
  check('picked 1994: kept as his pick', m?.id === 'tt0110357' && m.picked, JSON.stringify(m));
  check('picked: Subtitles: none found (nothing on OpenSubtitles)', pl[0] === 'Subtitles: none found', pl[0]);
  check('picked: Not in the file, none on OpenSubtitles', (await slot()) === 'Not in the file, none on OpenSubtitles', await slot());
  await key('Enter', 1, 700);
  check('the sheet: your pick', /The Lion King \(1994\), your pick/.test((await SC.text(p, '.sheet.st-sheet .t-cap'))[0] || ''), (await SC.text(p, '.sheet.st-sheet .t-cap'))[0]);
  check('the sheet: Icelandic and English none for this film, Off on', /Icelandic None for this film/.test((await SC.text(p, '.sheet.st-sheet .lr'))[0]) && await ev(() => document.activeElement?.dataset.act === 'off'));
  await key('Escape', 1, 400); await key('Escape', 1, 600);

  // ---- the length decides (SPEC v1.1 S9) ----
  await SC.unlearn(p, [7010], { 7010: { status: 'ok', size: 1.6e9, dur: 89 * 60 + 20, formats: { video: { w: 1920, h: 1036, fps: 23.976 }, audio: [{ mime: 'audio/ac3', ch: 6, lang: 'eng', tagged: true }], text: [] } } });
  await SC.open(p, 'movie', 'The Lion King');
  await p.waitForTimeout(4000);
  const m2 = await ev(async () => { const I = await import('/tv/js/imdb.js'), c = await import('/tv/js/catalog.js'); return I.savedMatch(c.catalog.movie.titles.find((x) => x.name === 'The Lion King')); });
  check('the checked 89 min copy: the 1994 film, without asking', m2?.id === 'tt0110357' && m2.level === 'sure' && m2.via === 'length', JSON.stringify(m2));
  pl = await pills();
  check('no ask: Subtitles: none found', pl[0] === 'Subtitles: none found', pl.join(' | '));
  await shot('detail-matched-by-length');
};
