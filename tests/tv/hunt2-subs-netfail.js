// Bug hunt: OpenSubtitles' list answers, but every file download fails (subs5.strem.io 503), then a slow list (12 s).
// SPEC 7.6: a file that fails is skipped and the next tried, up to 3; the pill should never promise subtitles that
// nothing downloaded. Run: node tests/tv/drive.js <out> hunt2-subs-netfail
const SC = require('./subs-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check } = SC.C;
  const ev = (f, a) => p.evaluate(f, a);
  await SC({ p, key }, { delay: 200 });
  await SC.forget(p);
  let files = 0;
  await p.route('https://subs5.strem.io/**', (r) => { files++; r.fulfill({ status: 503, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' }); });
  // (forget the downloaded files kept from other runs)
  await ev(async () => { localStorage.removeItem('tuner.subsFiles'); });
  await p.reload(); await p.waitForTimeout(4000);
  const D = '[data-screen="detail"]';
  await SC.open(p, 'movie', 'Oppenheimer', 2023);
  await p.waitForTimeout(8000);
  const pl = await SC.text(p, `${D} .row-flex .pillbtn`);
  const slot = (await SC.text(p, `${D} .st-side`))[0] || '';
  const fp = await ev(async () => { const s = await import('/tv/js/subs.js'); const c = await import('/tv/js/catalog.js'); const u = await import('/tv/js/util.js'); const t = c.catalog.movie.titles.find((x) => x.name === 'Oppenheimer'); const x = s.forPlayer(u.keyOf(t), {}); return x && { pick: x.pick, files: x.files.length, list: x.list.map((l) => `${l.lang}:${l.source}:${l.ready}`), status: x.status }; });
  console.log('downloads tried', files, JSON.stringify(fp));
  check('nothing downloaded, so the pill does not name a language', !/Subtitles: (Icelandic|English)$/.test(pl[1]), `${pl[1]} | ${slot}`);
  await shot('files-down');
  await key('ArrowDown', 1, 250); await key('ArrowRight', 1, 250); await key('Enter', 1, 800);
  const rows = await SC.text(p, '.sheet.st-sheet .lr');
  console.log(rows.join(' | '));
  await shot('files-down-sheet');
  await key('Escape', 1, 400);
};
