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
  await shot('after-back-from-picker');
  await key('ArrowDown', 1, 400);
  await log('then one ▼');
  await key('ArrowUp', 1, 400);
  await log('then one ▲');
  await key('Enter', 1, 600);
  await log('then OK');
  await shot('after-ok');
  check('still on the title page', await ev(() => !document.querySelector('[data-screen="detail"]').hidden), '');
};
