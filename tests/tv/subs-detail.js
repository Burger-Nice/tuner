// The title page with subtitles and real quality (design/ui-v1/subtitles/SPEC.md 4; mocks detail-checking,
// detail-ready, detail-copies, detail-subs-sheet, detail-subs-down): Oppenheimer's four copies being checked (dashed
// tags, "Checking copies · n of 4", the progress line), then checked (ticks on 4K HDR10 5.1, "4K HDR10 best of 4",
// "Subtitles: Icelandic", "From OpenSubtitles · English ready too"), the Copies menu in rank order with the problem
// first, the Subtitles sheet (verdicts, no tick on unanchored timing, Other languages · 31, "None in this copy's file."),
// picking English, Play taking the best real copy at once, and OpenSubtitles not answering.
// Run: node tests/tv/drive.js <out> subs-detail
const SC = require('./subs-common.js');
module.exports = async ({ p, shot, key }) => {
  const { check, ok } = SC.C;
  const ev = (f, a) => p.evaluate(f, a);
  const state = await SC({ p, key }, { delay: 1400 });
  const D = '[data-screen="detail"]';
  const pills = () => SC.text(p, `${D} .row-flex .pillbtn`);
  const slot = async () => (await SC.text(p, `${D} .st-side`))[0] || '';
  const tags = () => ev((D) => [...document.querySelectorAll(`${D} .metaline .tag`)].map((t) => `${t.className.replace('tag ', '')}:${t.innerText}${t.querySelector('.ad-tk') ? '✓' : ''}`), D);

  await SC.open(p, 'movie', 'Oppenheimer', 2023);
  await p.waitForTimeout(1800);
  await shot('detail-checking');
  let pl = await pills();
  check('checking: Checking copies · n of 4 (dashed)', /^Checking copies · [1-4] of 4$/.test(pl[0]) && await ev((D) => document.querySelector(`${D} [data-act="version"]`).classList.contains('st-wait'), D), pl[0]);
  check('checking: the slot', /Checking what each copy really is/.test(await slot()), await slot());
  // (the copy Play plays is checked first: once its check is in, its tags are ticked while the others are still checked)
  const tg = await tags();
  check('checking: tags dashed with no tick, or the best copy\'s ticked once checked', tg.every((t) => /^(ad-name|tag):/.test(t) && !t.includes('✓')) || tg.filter((t) => /^ad-ok:/.test(t)).every((t) => t.includes('✓')), tg.join(' '));
  await ok(p, 'Play focused', 'play');
  for (let i = 0; i < 40 && (await ev(() => window.__probeLog.length)) < 4; i++) await p.waitForTimeout(250);
  await p.waitForTimeout(2500);
  await shot('detail-ready');
  pl = await pills();
  check('checks ran name-best first, one at a time', JSON.stringify(await ev(() => window.__probeLog)) === '[7001,7003,7004,7002]' || (await ev(() => window.__probeLog.length)) === 4, JSON.stringify(await ev(() => window.__probeLog)));
  check('ready: tags 4K HDR10 5.1 ticked', (await tags()).slice(0, 3).join(' ') === 'ad-ok:4K✓ ad-ok:HDR10✓ ad-ok:5.1✓', (await tags()).join(' '));
  check('ready: Version pill 4K HDR10 · best of 4, ticked', /^4K HDR10 · best of 4$/.test(pl[0]) && await ev((D) => !!document.querySelector(`${D} [data-act="version"] .ad-tk`), D), pl[0]);
  check('ready: Subtitles: Icelandic', pl[1] === 'Subtitles: Icelandic', pl[1]);
  check('ready: From OpenSubtitles · English ready too', /^From OpenSubtitles\s*English ready too$/.test(await slot()), await slot());
  const box = await ev((D) => { const s = document.querySelector(`${D} .st-side`).getBoundingClientRect(); return { right: s.right, cut: document.querySelector(`${D} .st-side`).scrollWidth > document.querySelector(`${D} .st-side`).clientWidth + 1 }; }, D);
  check('the slot ends by x 912, not cut', box.right <= 912 && !box.cut, JSON.stringify(box));

  // ---- the Copies menu ----
  await key('ArrowDown', 1, 300); await ok(p, 'the Version pill', 'version');
  await key('Enter', 1, 700); await ok(p, 'Copies: Always the best copy', 'Always the best copy');
  await shot('detail-copies');
  const rows = await SC.text(p, '.menu.ad-copies .lr.ad-two');
  console.log(rows.join('\n'));
  check('Always: Now 4K · HDR10 · 15.0 Mb/s', /^Always the best copy Now: 4K · HDR10 · 15(\.0)? Mb\/s\. Changes if a better copy shows up/.test(rows[0]), rows[0]);
  check('rank 1: 4K HDR10 15 Mb/s, Dolby Digital Plus 5.1, Best', /^4K · HDR10 · 15(\.0)? Mb\/s Dolby Digital Plus 5\.1 · 21\.6 GB · “EN\| Oppenheimer 4K” BEST$/i.test(rows[1]), rows[1]);
  check('rank 2: 1080p 6.6 Mb/s', /^1080p · 6\.6 Mb\/s Dolby Digital 5\.1 · 9\.8 GB · “EN\| Oppenheimer FHD”$/.test(rows[2]), rows[2]);
  check('rank 3: Named 4K, really 1080p', /^1080p · 2\.8 Mb\/s Named 4K · stereo · 4\.1 GB · “EN\| Oppenheimer \(2023\) 4K UHD”$/.test(rows[3]), rows[3]);
  check('rank 4: No sound on this TV · DTS-HD only', /^4K · Dolby Vision · 22(\.0)? Mb\/s No sound on this TV · DTS-HD only · 34\.5 GB · “MULTI\| Oppenheimer 2160p DV”$/.test(rows[4]), rows[4]);
  check('one Best, on rank 1', (await SC.text(p, '.menu.ad-copies .ad-best')).length === 1);
  check('the header: Checked today hh:mm', /Checked today \d\d:\d\d/.test((await SC.text(p, '.menu.ad-copies h3 small'))[0] || ''), (await SC.text(p, '.menu.ad-copies h3 small'))[0]);
  check('the foot', /Mb\/s is the picture's share\. Picking a copy keeps it for this film\./.test((await SC.text(p, '.menu.ad-copies .ad-foot'))[0] || ''));
  check('every checked row has a tick', await ev(() => [...document.querySelectorAll('.menu.ad-copies .lr.ad-two[data-v^="cp:"] .a')].every((a) => !!a.querySelector('.ad-tk'))));
  await key('Escape', 1, 400);

  // ---- the Subtitles sheet ----
  await key('ArrowRight', 1, 250); await ok(p, 'the Subtitles pill', 'subs');
  await key('Enter', 1, 700);
  await ok(p, 'the sheet opens on Icelandic', 'Icelandic');
  await shot('detail-subs-sheet');
  const sr = await SC.text(p, '.sheet.st-sheet .lr');
  console.log(sr.join('\n'));
  check('sheet: Icelandic · timing fixed to fit this film (no tick)', /^Icelandic OpenSubtitles · timing fixed to fit this film$/.test(sr[0]) && await ev(() => !document.querySelector('.sheet.st-sheet .lr .ad-tk')), sr[0]);
  check('sheet: English · lined up with other subtitles', /^English OpenSubtitles · lined up with other subtitles$/.test(sr[1]), sr[1]);
  check('sheet: Off, Other languages · 31, Not this film?', sr[2] === 'Off' && /^Other languages (29|3\d)$/.test(sr[3]) && /^Not this film\? Match it again$/.test(sr[4]), sr.slice(2).join(' | '));
  const hd = [(await SC.text(p, '.sheet.st-sheet .t-cap'))[0], (await SC.text(p, '.sheet.st-sheet .st-note'))[0]];
  check('sheet: matched on IMDb; None in this copy\'s file.', /Oppenheimer \(2023\), matched on IMDb/.test(hd[0]) && /None in this copy's file\./.test(hd[1] || ''), hd.join(' | '));
  const ring = await ev(() => { const r = document.activeElement.getBoundingClientRect(), h = document.querySelector('.sheet.st-sheet .sec').getBoundingClientRect(); return { gap: r.top - h.bottom }; });
  check('8 px between YOUR LANGUAGES and the first row', ring.gap >= 7.5, JSON.stringify(ring));
  // Other languages: a list by name
  await key('ArrowDown', 3, 150); await ok(p, 'Other languages', 'others'); await key('Enter', 1, 600);
  const ol = await SC.text(p, '#overlays .ov:last-child .sheet .lr');
  check('Other languages: all of them, by name', ol.length >= 29 && [...ol].sort().join() === ol.join(), `${ol.length}: ${ol.slice(0, 4).join(', ')}…`);
  await key('Escape', 1, 400);
  await ok(p, 'Back: the sheet again, on Other languages', 'others');
  // English
  await key('ArrowUp', 2, 150); await ok(p, 'English', 'English'); await key('Enter', 1, 600);
  pl = await pills();
  check('picked: Subtitles: English', pl[1] === 'Subtitles: English', pl[1]);
  check('picked: From OpenSubtitles · Icelandic ready too', /^From OpenSubtitles\s*Icelandic ready too$/.test(await slot()), await slot());
  await ok(p, 'focus back on the pill', 'subs');
  const pick = await ev(async () => { const m = await import('/tv/js/subs.js'); const c = await import('/tv/js/catalog.js'); const u = await import('/tv/js/util.js'); return m.subMemory().pick(u.keyOf(c.catalog.movie.titles.find((x) => x.name === 'Oppenheimer'))); });
  check('the pick is kept for this title (subpick)', pick?.lang === 'English' && pick.source === 'opensubtitles' && !!pick.id, JSON.stringify(pick));
  const fp = await ev(async () => { const m = await import('/tv/js/subs.js'); const c = await import('/tv/js/catalog.js'); const u = await import('/tv/js/util.js'); const t = c.catalog.movie.titles.find((x) => x.name === 'Oppenheimer'); const x = m.forPlayer(u.keyOf(t), { copyId: u.keyOf(t.versions.find((v) => v.id == 7001)) }); return x && { pick: x.pick, files: x.files.map((f) => `${f.lang} x${f.speed.toFixed(4)} ${f.verdict}`), status: x.status }; });
  check('what the player gets: his pick and the timed files', fp?.pick?.lang === 'English' && fp.files.some((f) => /^Icelandic x1\.0427 fixed/.test(f)), JSON.stringify(fp));

  // ---- Play: the best real copy, at once ----
  await key('ArrowUp', 1, 200); for (let i = 0; i < 3 && !/play/.test(await SC.C.where(p)); i++) await key('ArrowLeft', 1, 150);
  await ok(p, 'back on Play', 'play');
  await ev(() => { window.__lastVod = null; });
  await key('Enter', 1, 500);
  const v = await ev(() => (window.__lastVod || [])[0]);
  check('Play: the 4K HDR10 copy (7001), no wait', v && /\/7001\.mkv$/.test(v.url), v?.url);

  // ---- OpenSubtitles not answering (SPEC 8) ----
  state.down = true;
  await ev(async () => { const s = await import('/tv/js/subs.js'); for (const k of await window.Core.cache.keys?.() || []) if (String(k).startsWith('subs:list:')) await window.Core.cache.set(k, null); });
  await ev(async () => { await window.Core.cache.set('subs:list:https://opensubtitles-v3.strem.io/subtitles/movie/tt15398776.json', null); });
  await key('Escape', 1, 600);
  await ev(async () => { const s = await import('/tv/js/subs.js'); const c = await import('/tv/js/catalog.js'); const u = await import('/tv/js/util.js'); const t = c.catalog.movie.titles.find((x) => x.name === 'Oppenheimer'); s.subMemory().forget(u.keyOf(t)); });
  // (a title not asked about before: the hub keeps the last 30 states; this one's list is gone from the cache)
  await ev(async () => { const st = await import('/tv/js/subs.js'); window.__downKey = 1; });
  await SC.open(p, 'movie', 'Oppenheimer', 2023);
  await p.waitForTimeout(500);
  await ev(async () => { const s = await import('/tv/js/subs.js'); const c = await import('/tv/js/catalog.js'); const u = await import('/tv/js/util.js'); const t = c.catalog.movie.titles.find((x) => x.name === 'Oppenheimer'); await s.prepare({ key: u.keyOf(t), name: 'Oppenheimer', imdb: 'tt15398776', level: 'sure', version: t.versions.find((v) => v.id == 7001) }, { again: true }); });
  await p.waitForTimeout(1200);
  await shot('detail-subs-down');
  pl = await pills();
  check('down: Subtitles: none yet (dashed)', pl[1] === 'Subtitles: none yet' && await ev((D) => document.querySelector(`${D} [data-act="subs"]`).classList.contains('st-wait'), D), pl[1]);
  check('down: OpenSubtitles isn\'t answering · trying again at hh:mm', /^OpenSubtitles isn't answering\s*trying again at \d\d:\d\d$/.test(await slot()), await slot());
  await key('ArrowDown', 1, 200); await key('ArrowRight', 1, 200); await key('Enter', 1, 600);
  const dr = await SC.text(p, '.sheet.st-sheet .lr');
  check('down: the sheet has Try now', dr.some((r) => /^Try now OpenSubtitles · trying again at \d\d:\d\d/.test(r)), dr.join(' | '));
  state.down = false;
  for (let i = 0; i < 4 && !/retry/.test(await SC.C.where(p)); i++) await key('ArrowDown', 1, 150);
  await ok(p, 'Try now', 'retry'); await key('Enter', 1, 2500);
  pl = await pills();
  check('Try now: Subtitles: Icelandic again', pl[1] === 'Subtitles: Icelandic', pl[1]);
  await key('Escape', 1, 400);
};
