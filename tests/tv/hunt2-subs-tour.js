// Bug hunt, D-pad tour: the Subtitles sheet's "Match it again", Back out of it, None of these, and picking the film again.
// Run: node tests/tv/drive.js <out> hunt2-subs-tour
const SC = require('./subs-common.js');
module.exports = async ({ p, shot, key, log }) => {
  const { check, ok, where } = SC.C;
  const ev = (f, a) => p.evaluate(f, a);
  await SC({ p, key }, { delay: 200 });
  await SC.forget(p);
  const D = '[data-screen="detail"]';
  const pills = () => SC.text(p, `${D} .row-flex .pillbtn`);
  await SC.open(p, 'movie', 'Oppenheimer', 2023);
  await p.waitForTimeout(5000);
  await key('ArrowDown', 1, 250); await key('ArrowRight', 1, 250);
  await ok(p, 'Subtitles pill', 'subs');
  const openMatch = async () => {
    await key('Enter', 1, 700);
    for (let i = 0; i < 8 && !/match/.test(await where(p)); i++) await key('ArrowDown', 1, 150);
    await ok(p, 'Match it again', 'match'); await key('Enter', 1, 2500);
  };
  await openMatch();
  await shot('match-again');
  const rows = await SC.text(p, '.menu.ad-match .lr');
  console.log(rows.join(' | '));
  await log('focus in the picker');
  check('the picker focuses the film it is matched to (Oppenheimer)', /Oppenheimer/.test(await where(p)), await where(p));
  await key('Escape', 1, 600);
  await log('after Back');
  check('Back from the picker: focus on the Subtitles pill (or back in the sheet)', /subs|match/.test(await where(p)), await where(p));
  // None of these
  for (let i = 0; i < 3 && !/subs/.test(await where(p)); i++) await key('Escape', 1, 400);
  await openMatch();
  for (let i = 0; i < 10 && !/none/.test(await where(p)); i++) await key('ArrowDown', 1, 150);
  await ok(p, 'None of these', 'none'); await key('Enter', 1, 2000);
  let pl = await pills();
  const slot = (await SC.text(p, `${D} .st-side`))[0] || '';
  console.log('after None of these:', pl.join(' | '), '|', slot);
  await log('focus after None of these');
  check('None of these: Subtitles: none (no downloads)', /^Subtitles: (none|Off)$/.test(pl[1] || pl[0]), pl.join(' | '));
  const fp = await ev(async () => { const s = await import('/tv/js/subs.js'); const c = await import('/tv/js/catalog.js'); const u = await import('/tv/js/util.js'); const t = c.catalog.movie.titles.find((x) => x.name === 'Oppenheimer'); const x = s.forPlayer(u.keyOf(t), {}); return x && { pick: x.pick, files: x.files.length, status: x.status }; });
  check('None of these: the player gets no downloaded subtitles', fp && fp.files === 0, JSON.stringify(fp));
  await shot('none-of-these');
  // pick the film again
  for (let i = 0; i < 4 && !/subs/.test(await where(p)); i++) await key('ArrowRight', 1, 150);
  await ok(p, 'Subtitles pill again', 'subs');
  await key('Enter', 1, 800);
  const sr = await SC.text(p, '.sheet.st-sheet .lr');
  console.log('sheet after None:', sr.join(' | '));
  await shot('sheet-after-none');
  for (let i = 0; i < 8 && !/match/.test(await where(p)); i++) await key('ArrowDown', 1, 150);
  await ok(p, 'Match it again (after None)', 'match'); await key('Enter', 1, 2500);
  for (let i = 0; i < 6 && !/Oppenheimer/.test(await where(p)); i++) await key('ArrowUp', 1, 150);
  await ok(p, 'Oppenheimer row', 'Oppenheimer'); await key('Enter', 1, 4000);
  pl = await pills();
  console.log('after picking it again:', pl.join(' | '));
  check('picked again: Subtitles: Icelandic', pl.includes('Subtitles: Icelandic'), pl.join(' | '));
  await shot('picked-again');
};
