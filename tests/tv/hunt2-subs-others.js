// Bug hunt: a language picked in the title page's Other languages, then the app started again (the TV's next day).
// Run: node tests/tv/drive.js <out> hunt2-subs-others
const SC = require('./subs-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check, ok } = SC.C;
  const ev = (f, a) => p.evaluate(f, a);
  await SC({ p, key }, { delay: 200 });
  await SC.forget(p);
  const D = '[data-screen="detail"]';
  const pills = () => SC.text(p, `${D} .row-flex .pillbtn`);
  const state = () => ev(async () => { const s = await import('/tv/js/subs.js'); const c = await import('/tv/js/catalog.js'); const u = await import('/tv/js/util.js'); const t = c.catalog.movie.titles.find((x) => x.name === 'Oppenheimer'); const k = u.keyOf(t); const st = s.subState(k); const fp = s.forPlayer(k, {}); return { pick: s.subMemory().pick(k), langs: st?.langs.map((l) => `${l.lang}:${l.source}:${l.ready}`), files: fp?.files.map((f) => f.lang) }; });
  await SC.open(p, 'movie', 'Oppenheimer', 2023);
  await p.waitForTimeout(5000);
  await key('ArrowDown', 1, 250); await key('ArrowRight', 1, 250);
  await ok(p, 'Subtitles pill', 'subs');
  await key('Enter', 1, 700);
  for (let i = 0; i < 6 && !/others/.test(await SC.C.where(p)); i++) await key('ArrowDown', 1, 150);
  await ok(p, 'Other languages', 'others'); await key('Enter', 1, 600);
  // Spanish: the 'S' languages are after some; find it
  for (let i = 0; i < 40 && !/Spanish/.test(await SC.C.where(p)); i++) await key('ArrowDown', 1, 80);
  await ok(p, 'Spanish', 'Spanish'); await key('Enter', 1, 3000);
  let pl = await pills();
  check('picked: Subtitles: Spanish', pl[1] === 'Subtitles: Spanish', pl[1]);
  console.log('before restart', JSON.stringify(await state()));
  await shot('spanish-picked');
  // the app starts again (the next day): the same title page
  await p.reload(); await p.waitForTimeout(4000);
  await ev(() => { window.__probeLog = []; });
  await SC.open(p, 'movie', 'Oppenheimer', 2023);
  await p.waitForTimeout(5000);
  pl = await pills();
  const st = await state();
  console.log('after restart', JSON.stringify(st));
  check('after restart: the pill still says Spanish', pl[1] === 'Subtitles: Spanish', pl[1]);
  check('after restart: a Spanish file is downloaded for the player', (st.files || []).includes('Spanish'), JSON.stringify(st.files));
  await key('ArrowDown', 1, 250); await key('ArrowRight', 1, 250); await key('Enter', 1, 1500);
  const rows = await SC.text(p, '.sheet.st-sheet .lr');
  console.log(rows.join(' | '));
  await p.waitForTimeout(4000);
  const rows2 = await SC.text(p, '.sheet.st-sheet .lr');
  check('after restart, 5 s later: the sheet no longer says "getting it…"', !rows2.some((r) => /Spanish.*getting it/.test(r)), rows2.join(' | '));
  await shot('spanish-after-restart-sheet');
};
