// Bug hunt: scroll bars (Standings top + scrolled, Team stats, News): the track and thumb inside y 27-513, the thumb
// inside its track, the thumb at the end when the last row shows. node tests/tv/drive.js <out> hunt-league-bars
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where, flood } = H;
  const bar = (sel) => ev((s) => { const b = document.querySelector(s); if (!b || b.hidden || b.closest('[hidden]')) return null; const r = b.getBoundingClientRect(), t = b.firstElementChild.getBoundingClientRect(); return { track: [Math.round(r.top), Math.round(r.bottom)], thumb: [Math.round(t.top), Math.round(t.bottom)] }; }, sel);
  const ok = (b, label) => { if (!b) return check(false, `${label}: no bar`); check(b.thumb[0] >= b.track[0] - 1 && b.thumb[1] <= b.track[1] + 1 && b.track[1] <= 513 && b.thumb[1] <= 513, `${label}: track ${b.track} thumb ${b.thumb}`); };
  await H.start({});
  await H.go('standings'); await p.waitForTimeout(1200);
  ok(await bar('.lg-st .st-bar'), 'standings top');
  await key('ArrowDown', 2, 300); await key('ArrowDown', 5, 300);
  await p.waitForTimeout(600); ok(await bar('.lg-st .st-bar'), 'standings row 9 (scrolled)');
  await flood('ArrowDown', 20, 40); await p.waitForTimeout(800); ok(await bar('.lg-st .st-bar'), 'standings last row');
  await shot('st-last');
  await H.go('teamstats'); await p.waitForTimeout(1200);
  ok(await bar('.ts-bar'), 'team stats first');
  await key('ArrowDown', 1, 300); await key('ArrowRight', 1, 400); await flood('ArrowDown', 35, 40); await p.waitForTimeout(800);
  await where('ts last'); ok(await bar('.ts-bar'), 'team stats last row'); await shot('ts-last');
  await H.go('news'); await p.waitForTimeout(1500);
  ok(await bar('.nb-s[data-s="news"] .nb-sbar'), 'news first');
  await key('ArrowDown', 1, 300); await flood('ArrowDown', 30, 40); await p.waitForTimeout(800);
  await where('news last'); ok(await bar('.nb-s[data-s="news"] .nb-sbar'), 'news last row'); await shot('news-last');
  const rows = await H.boxes('.nb-s[data-s="news"] .nb-nrow:not(.off)');
  check(rows.every((r) => r.bot <= 513), `news rows inside 513 (${rows.map((r) => `${r.top}-${r.bot}`).join(' ')})`);
  H.done();
};
