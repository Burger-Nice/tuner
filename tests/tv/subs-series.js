// A series (design/ui-v1/subtitles/SPEC.md 4.6; mock detail-series): Severance on the fake provider, matched by the
// ratings file. The pill by Play describes the episode Play plays (S1 E1: "Subtitles: English", there is no Icelandic),
// the meta line has that episode's checked facts (4K HDR), the focused tile's subtitles ride on its synopsis line once
// it has had focus for 1 s (its list is asked for then, not before), the sheet names the episode, and Play hands the
// player the episode with its subtitles prepared.
// Run: node tests/tv/drive.js <out> subs-series
const SC = require('./subs-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check, ok } = SC.C;
  const ev = (f, a) => p.evaluate(f, a);
  const state = await SC({ p, key }, { delay: 300 });
  const D = '[data-screen="detail"]';
  await SC.open(p, 'series', 'Severance');
  await p.waitForTimeout(4500);
  const pl = await SC.text(p, `${D} .row-flex .pillbtn`);
  check('Play S1 · E1 focused', /Play S1 · E1/.test(await SC.C.where(p)), await SC.C.where(p));
  check('the pill describes S1 E1: Subtitles: English', pl.includes('Subtitles: English'), pl.join(' | '));
  const tags = await ev((D) => [...document.querySelectorAll(`${D} .metaline .tag`)].map((t) => `${t.innerText}${t.querySelector('.ad-tk') ? '✓' : ''}`).join(' '), D);
  check('the meta line: S1 E1\'s checked 4K HDR', /^4K✓ HDR✓ 5\.1✓/.test(tags), tags);
  const lists0 = state.lists;
  await key('ArrowDown', 2, 400); await ok(p, 'the episode row: E1', 'ep:1:1');
  await key('ArrowRight', 1, 200); await ok(p, 'E2', 'ep:1:2');
  await p.waitForTimeout(400);
  check('no list asked for E2 before 1 s of focus', state.lists === lists0, `${state.lists - lists0} asked`);
  await p.waitForTimeout(2500);
  const syn = (await SC.text(p, `${D} .epsyn`))[0] || '';
  check('E2\'s synopsis line: English subtitles, from OpenSubtitles (no Icelandic)', /^E2 · The Storm\s*English subtitles, from OpenSubtitles \(no Icelandic\)\s*Snow closes/.test(syn), syn);
  await shot('detail-series');
  const box = await ev((D) => { const r = document.querySelector(`${D} .epsyn`).getBoundingClientRect(); return { right: Math.round(r.right), bottom: Math.round(r.bottom) }; }, D);
  check('the synopsis line inside the safe area', box.right <= 912 && box.bottom <= 513, JSON.stringify(box));
  // the sheet for the episode Play plays
  await key('ArrowUp', 2, 300);
  for (let i = 0; i < 4 && !/subs/.test(await SC.C.where(p)); i++) await key('ArrowRight', 1, 150);
  await ok(p, 'the Subtitles pill', 'subs');
  await key('Enter', 1, 700);
  const hd = (await SC.text(p, '.sheet.st-sheet .t-cap'))[0];
  const rows = await SC.text(p, '.sheet.st-sheet .lr');
  check('the sheet names the episode', /^Severance · S1 · E1, matched (by name and year|on IMDb)$/.test(hd), hd);
  check('the sheet: Icelandic none, English lined up with other subtitles (no tick), Not this series?', /^Icelandic None for this episode$/.test(rows[0]) && /^English OpenSubtitles · lined up with other subtitles$/.test(rows[1]) && rows.some((r) => /^Not this series\? Match it again$/.test(r)), rows.join(' | '));
  await key('Escape', 1, 400);
  // Play: the episode, with what the player gets ready
  for (let i = 0; i < 4 && !/play/.test(await SC.C.where(p)); i++) await key('ArrowLeft', 1, 150);
  await ev(() => { window.__lastVod = null; });
  await key('Enter', 1, 600);
  const v = await ev(() => (window.__lastVod || [])[0]);
  check('Play: S1 E1', v && /\/70100\.mp4$/.test(v.url), v?.url);
  const fp = await ev(async () => { const s = await import('/tv/js/subs.js'); const x = s.forPlayer('episode:70100', { copyId: 'episode:70100' }); return x && { pick: x.pick, files: x.files.map((f) => `${f.lang} ${f.verdict}`), status: x.status }; });
  check('what the player gets for S1 E1: English, timed', fp?.pick?.lang === 'English' && fp.files.some((f) => /^English pair/.test(f)), JSON.stringify(fp));
};
