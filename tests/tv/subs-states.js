// The title page's other states (design/ui-v1/subtitles/SPEC.md 3.1, 4.2, 6.1, 8; mocks detail-resume, movies-tags):
// a dubbed copy picked in Copies (subtitles start off, no which-film ask), the time left winning the slot on a Resume
// (and Resume playing the copy he was watching), Subtitles Off in Account, checks waiting while a stream is in use
// ("4K · not checked"), the posters' real-quality tags (filled when checked, dashed when only a name says so), the 4K
// chip following the checks, and Continue watching asking for checks.
// Run: node tests/tv/drive.js <out> subs-states
const SC = require('./subs-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check, ok } = SC.C;
  const ev = (f, a) => p.evaluate(f, a);
  await SC({ p, key }, { delay: 200, dub: true });
  const D = '[data-screen="detail"]';
  const pills = () => SC.text(p, `${D} .row-flex .pillbtn`);
  const slot = async () => (await SC.text(p, `${D} .st-side`))[0] || '';
  const opp = (f) => ev(async (f) => { const c = await import('/tv/js/catalog.js'); const t = c.catalog.movie.titles.find((x) => x.name === 'Oppenheimer'); return new Function('t', 'm', f)(t, { state: await import('/tv/js/state.js'), subs: await import('/tv/js/subs.js'), util: await import('/tv/js/util.js') }); }, f);

  // ---- posters: dashed until checked ----
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(2500);
  const tagOf = () => ev(() => { const pc = [...document.querySelectorAll('[data-screen="movie"] .pc')].find((x) => /Oppenheimer/.test(x.querySelector('.cap')?.innerText || '')); const tg = pc?.querySelector('.tl .tag'); return tg ? `${tg.className}:${tg.innerText}` : pc ? 'none' : 'not on screen'; });
  const t0 = await tagOf();
  check('poster before any check: dashed 4K (the names say so)', /ad-name:4K/.test(t0) || t0 === 'not on screen', t0);

  // ---- a dub: picked in Copies ----
  await SC.open(p, 'movie', 'Oppenheimer', 2023);
  for (let i = 0; i < 40 && (await ev(() => window.__probeLog.length)) < 5; i++) await p.waitForTimeout(250);
  await p.waitForTimeout(1500);
  check('five copies: best of 5', /best of 5/.test((await pills())[0]), (await pills())[0]);
  await key('ArrowDown', 1, 300); await key('Enter', 1, 700);
  for (let i = 0; i < 8 && !/IS\|/.test(await SC.C.where(p)); i++) await key('ArrowDown', 1, 150);
  const rowIs = (await SC.text(p, '.menu.ad-copies .lr.ad-two')).find((r) => /IS\|/.test(r));
  check('the Icelandic copy ranks after the English ones', /^1080p · 6\.1 Mb\/s Dolby Digital 5\.1 · 9\.1 GB · “IS\| Oppenheimer \(2023\)”$/.test(rowIs || ''), rowIs);
  await key('Enter', 1, 1200);
  let pl = await pills();
  check('picked: your pick', /your pick/.test(pl[0]), pl[0]);
  check('a dub: Subtitles: Off', pl[1] === 'Subtitles: Off', pl[1]);
  check('a dub: Off for a dubbed copy · Icelandic and English ready', /^Off for a dubbed copy\s*Icelandic and English ready$/.test(await slot()), await slot());
  await shot('detail-dub');
  await key('ArrowRight', 1, 200); await key('Enter', 1, 700);
  check('a dub: the sheet says so, Off focused', await ev(() => document.activeElement?.dataset.act === 'off' && /This copy is dubbed, so they start off/.test(document.activeElement.innerText)));
  await key('Escape', 1, 400);
  // back to Always the best copy
  await key('ArrowLeft', 1, 200); await key('Enter', 1, 700); await key('Enter', 1, 900);
  pl = await pills();
  check('Always the best copy again: Subtitles: Icelandic', pl[1] === 'Subtitles: Icelandic' && /best of 5/.test(pl[0]), pl.join(' | '));

  // ---- Resume: the time left wins the slot; Resume plays the copy he was watching ----
  await opp("const v = t.versions.find((x) => x.id == 7002); m.state.recordProgress(v, 4078, 10800, true); return 1;");
  await key('Escape', 1, 600); await SC.open(p, 'movie', 'Oppenheimer', 2023); await p.waitForTimeout(1500);
  await shot('detail-resume');
  check('Resume 1:07:58 focused', /Resume 1:07:58/.test(await SC.C.where(p)), await SC.C.where(p));
  check('the slot: the time left (1h 52m left)', /^1h 52m left$/.test(await slot()), await slot());
  pl = await pills();
  check('the pill keeps its words: Subtitles: Icelandic', pl[1] === 'Subtitles: Icelandic', pl[1]);
  await ev(() => { window.__lastVod = null; });
  await key('Enter', 1, 500);
  const v = await ev(() => (window.__lastVod || [])[0]);
  check('Resume plays the FHD copy he was watching, from 1:07:58', v && /\/7002\.mkv$/.test(v.url) && v.startAt === 4078, v && `${v.url} @${v.startAt}`);
  await opp("delete m.state.S.progress[m.util.keyOf(t.versions.find((x) => x.id == 7002))]; return 1;");

  // ---- Subtitles Off in Account ----
  await ev(async () => { const s = await import('/tv/js/subs.js'); s.saveSubSettings({ subMode: 'off' }); });
  await key('Escape', 1, 600); await SC.open(p, 'movie', 'Oppenheimer', 2023); await p.waitForTimeout(1500);
  pl = await pills();
  check('Off in Account: Subtitles: Off', pl[1] === 'Subtitles: Off', pl[1]);
  check('Off in Account: Icelandic and English ready', /^Icelandic and English ready$/.test(await slot()), await slot());
  await ev(async () => { const s = await import('/tv/js/subs.js'); s.saveSubSettings({ subMode: 'always' }); });

  // ---- posters once checked; the 4K chip ----
  await key('Escape', 1, 800);
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(1500);
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(600);
  await ev(() => window.__tunerTest.go('movie')); await p.waitForTimeout(1500);
  const t1 = await tagOf();
  check('poster once checked: filled 4K, no tick', /ad-ok:4K/.test(t1) || t1 === 'not on screen', t1);
  const q = await ev(async () => { const c = await import('/tv/js/catalog.js'); await import('/tv/js/quality.js'); const t = c.catalog.movie.titles.find((x) => x.name === 'Oppenheimer'); const l = c.catalog.movie.titles.find((x) => x.name === 'The Lion King'); return [c.qualityHook.q(t, '4K'), c.qualityHook.q(l, '4K')]; });
  check('the 4K filter: Oppenheimer checked 4K; the Lion King left to its name', q[0] === true && q[1] === null, JSON.stringify(q));
  await shot('movies-tags');

  // ---- checks wait while a stream is in use ----
  await SC.unlearn(p, [7001, 7002, 7003, 7004, 7005], {}, { dub: true });
  await ev(async () => { const s = await import('/tv/js/subs.js'); s.setPreviewing(true); });
  await SC.open(p, 'movie', 'Oppenheimer', 2023); await p.waitForTimeout(2000);
  pl = await pills();
  check('a stream in use: 4K · not checked (dashed), no check ran', /^4K · not checked$/.test(pl[0]) && (await ev(() => window.__probeLog.length)) === 0, `${pl[0]} · ${await ev(() => window.__probeLog.length)} checks`);
  await key('ArrowDown', 1, 300); await key('Enter', 1, 700);
  const nr = await SC.text(p, '.menu.ad-copies .lr.ad-two');
  console.log(nr.join('\n'));
  // (a copy whose old check the harness couldn't forget may still show it: the rows without one say so, without a tick)
  const unk = await ev(() => [...document.querySelectorAll('.menu.ad-copies .lr.ad-two[data-v^="cp:"]')].filter((r) => !/Mb\/s/.test(r.innerText)).map((r) => ({ t: r.innerText, tick: !!r.querySelector('.ad-tk') })));
  check('Copies: Not checked yet, no tick', unk.length >= 3 && unk.every((r) => /Not checked yet/.test(r.t) && !r.tick), `${unk.length} unchecked rows`);
  await key('Escape', 1, 400);
  await ev(async () => { const s = await import('/tv/js/subs.js'); s.setPreviewing(false); });
  await p.waitForTimeout(2500);
  check('the preview stopped: the checks ran', (await ev(() => window.__probeLog.length)) >= 1, `${await ev(() => window.__probeLog.length)} checks`);
  // Continue watching asks for its copies (in the background)
  await key('Escape', 1, 600);
  await opp("m.state.recordProgress(t.versions.find((x) => x.id == 7003), 900, 10800, true); return 1;");
  await SC.unlearn(p, [7003], {}, { dub: true });
  await ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(3000);
  const st = await opp("return [m.subs.checkFor(t.versions.find((x) => x.id == 7003)), m.subs.probeStatus()];");
  check('Continue watching: its copy is asked for (background, 60 s apart)', !!st[0] || st[1].queued >= 1, JSON.stringify(st).slice(0, 200));
};
