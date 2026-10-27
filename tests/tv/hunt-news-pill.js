// Bug hunt: News with the list kept and ESPN down: the keys on the Try again pill (Left / Up / Down / Back).
// node tests/tv/drive.js <out> hunt-news-pill
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where, json } = H;
  const net = { fail: false };
  await H.start({ routes: [[/127\.0\.0\.1:8899\/espn\/news(\?|$)/, (r) => (net.fail ? json(r, { e: 1 }, 503) : r.continue())]] });
  await H.go('news'); await p.waitForTimeout(1500);
  net.fail = true; await ev(async () => { const m = await import('/tv/js/league.js'); await m.want('news', { force: true }); }); await p.waitForTimeout(800);
  const vis = () => ev(() => [...document.querySelectorAll('.nb-s')].filter((s) => !s.hidden).map((s) => s.dataset.s).join());
  for (const k of ['ArrowLeft', 'ArrowDown', 'ArrowUp']) {
    await H.go('news'); await key('ArrowDown', 1, 300); await key('ArrowDown', 2, 300); const from = await where('row 3');
    await key('ArrowRight', 1, 300); await where('Try again');
    await key(k, 1, 700); const a = await where(`${k} from Try again`);
    console.log('  showing:', await vis());
    if (k === 'ArrowLeft') check(a.key === from.key, `Left from Try again returns to the list row (${a.key || a.act})`);
    if (k === 'ArrowUp') check(a.sec === 'news' && (await vis()) === 'news', `Up from Try again: the News chip, News still showing (${a.sec}, ${await vis()})`);
    await shot(`pill-${k}`);
  }
  H.done();
};
