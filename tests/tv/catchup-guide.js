// Catch-up in the guide (design/ui-v1/catchup/SPEC.md 4): the history mark on kept channels, ◀ from now back in time to
// last night's game, the past cells (kept, not kept, the game), the day and Now pills, OK on the game (from tip-off) and
// on a kept programme (from its start), Back returning to now. The morning after: Tue 27 Oct 10:40, the Jazz game hidden.
// Run: node tests/tv/drive.js <out> catchup-guide
const setup = require('./catchup-lib.js');
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  await setup(ctx);
  const where = () => ev(() => { const a = document.activeElement; return `${a.className} s=${a.dataset.s ? new Date(+a.dataset.s).toISOString().slice(5, 16) : ''} ${a.dataset.past ? 'past' : ''}${a.dataset.gone || ''} "${(a.textContent || '').trim().slice(0, 50)}"`; });
  const ok = (label, cond, extra = '') => console.log(`${cond ? 'OK  ' : 'FAIL'} ${label} ${extra}`);
  const panel = () => ev(() => document.querySelector('.g-now')?.innerText.replace(/\s+/g, ' '));
  await ev(() => window.__tunerTest.go('live')); await p.waitForTimeout(3000);
  // onto US: ESPN HD (kept 3 days), on now
  const rowName = () => ev(() => document.activeElement.closest('.g-row')?.querySelector('.nm')?.textContent || '');
  for (let i = 0; i < 6 && !(await rowName()).includes('ESPN'); i++) await key('ArrowDown', 1, 400);
  await p.waitForTimeout(800);
  console.log('kept marks:', await ev(() => [...document.querySelectorAll('.g-ch')].map((c) => `${c.querySelector('.num')?.textContent}${c.querySelector('.cu-arc') ? '⟲' : ''}`).join(' ')));
  console.log('now panel:', await panel());
  ok('on now hint names the replays', (await panel()).includes('Replays for 3 days'));
  await shot('guide-now');
  // ◀ back in time, to the game at 01:00
  let w = '';
  for (let i = 0; i < 30; i++) { await key('ArrowLeft', 1, 260); w = await where(); if (/Grizzlies|g-ch/.test(w)) break; }
  await p.waitForTimeout(1200);
  w = await where(); console.log('reached:', w);
  ok('◀ reached the game', w.includes('Grizzlies'));
  console.log('ruler:', await ev(() => document.querySelector('.g-time')?.innerText.replace(/\s+/g, ' ')));
  console.log('now panel:', await panel());
  ok('the game: from tip-off, description hidden', (await panel()).includes('OK watch from tip-off') && (await panel()).includes('Description hidden'));
  await shot('guide-past-game');
  const rows = await ev(() => [...document.querySelectorAll('.g-row')].map((r) => r.querySelector('.g-ch .nm')?.textContent + ': ' + [...r.querySelectorAll('.g-cell')].map((c) => `${c.className.replace('g-cell fx', '').trim()}[${c.innerText.replace(/\s+/g, ' ')}]`).join(' ')).join('\n'));
  console.log(rows);
  // OK: from tip-off (the browser has no TV player: what was sent is kept in window.__replay)
  await key('Enter', 1, 2500);
  const R = await ev(() => { const r = window.__replay?.R; return r && { kind: r.kind, title: r.title, startAt: r.startAt, tipoffAt: r.tipoffAt, chapters: r.chapters.map((c) => `${c.label}@${Math.round(c.at / 60000)}m`).join(' '), hidden: r.hidden, link: r.sources[r.source]?.links[0]?.url.replace(/^.*timeshift\//, ''), sources: r.sources.map((s) => s.name).join(' | ') }; });
  console.log('replay:', JSON.stringify(R));
  ok('the replay starts on the game\'s own start string, .m3u8 first', !!R && /\/210\/2026-10-27:01-00\/1001\.m3u8$/.test(R.link || ''), R?.link);
  ok('tip-off is about 12 min in (the first play at 01:12)', R && Math.abs(R.tipoffAt / 60000 - 12.8) < 2);
  // down to a channel that isn't kept, at the same time
  await key('ArrowDown', 2, 500); await p.waitForTimeout(600);
  w = await where(); console.log('down x2:', w); console.log('now panel:', await panel());
  ok('not kept: outlined cell, OK watches it live', w.includes('cu-gone') && (await panel()).includes('no replays on this channel'));
  await shot('guide-past-gone');
  // RÚV keeps 3 days: back to Mon 20:00 Coastline
  for (let i = 0; i < 6 && !(await rowName()).includes('RÚV'); i++) await key('ArrowDown', 1, 400);
  await p.waitForTimeout(1500);
  for (let i = 0; i < 12; i++) { w = await where(); if (w.includes('Coastline')) break; await key('ArrowLeft', 1, 400); }
  await p.waitForTimeout(800);
  w = await where(); console.log('RÚV:', w); console.log('now panel:', await panel());
  ok('a kept programme: OK play from its start', w.includes('Coastline') && (await panel()).includes('OK play from 20:00'));
  await shot('guide-past');
  await key('Enter', 1, 1500);
  console.log('replay:', await ev(() => { const r = window.__replay?.R; return `${r?.kind} ${r?.title} ${r?.sources[0]?.links[0]?.url.replace(/^.*timeshift\//, '')}`; }));
  // Back: the window returns to now
  await key('Escape', 1, 900);
  w = await where(); console.log('back:', w);
  ok('Back returns to now', w.includes(' now') || w.includes('now'));
  console.log('ruler:', await ev(() => document.querySelector('.g-time')?.innerText.replace(/\s+/g, ' ')));
  await shot('guide-back');
  // the guide is asked again once its 10 minutes are up (the short guide runs dry after a few hours otherwise, hunt 3)
  let asked = 0; const onReq = (r) => { if (/get_short_epg/.test(r.url())) asked++; };
  p.on('request', onReq);
  await p.clock.fastForward('11:00'); await key('ArrowDown', 1, 500); await key('ArrowUp', 1, 500); await p.waitForTimeout(2500);
  p.off('request', onReq);
  ok('the guide is asked again after 10 minutes', asked > 0, `${asked} requests`);
  const { spoilers } = setup;
  console.log('spoilers in the guide:', JSON.stringify(spoilers(rows)));
};
