// Bug hunt: News states (SPEC 9): loading, ESPN down with nothing / with the list kept, Try again, no news, the refresh
// timer; the no-photo crests' order. node tests/tv/drive.js <out> hunt-news-states
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where, seen, text, json, boxes } = H;
  const news = H.fx('news.json');
  // Phoenix visits Oklahoma City: no photo -> the crests should read PHX at OKC
  const phx = news.articles.find((a) => /Phoenix visits Oklahoma City/.test(a.headline)); phx.images = [];
  const net = { fail: true, empty: false, delay: 0 };
  let hits = 0;
  await H.start({ clock: new Date().toISOString(), routes: [[/127\.0\.0\.1:8899\/espn\/news(\?|$)/, async (r) => {
    if (/team=/.test(r.request().url())) return r.continue();
    hits++;
    if (net.delay) await new Promise((f) => setTimeout(f, net.delay));
    return net.fail ? json(r, { e: 1 }, 503) : json(r, net.empty ? { articles: [] } : news);
  }]] });
  const tick = async (ms) => { for (let t = 0; t < ms; t += 10e3) { await p.clock.runFor(10e3); await p.waitForTimeout(60); } await p.waitForTimeout(800); };
  // ESPN down, nothing kept
  await H.go('news'); await p.waitForTimeout(2000); await shot('down-nothing');
  console.log('  state:', await text('.nb-s[data-s="news"] .nw-st'), '| meta:', await text('.nb-sec .meta'));
  let a = await where('chip'); await key('ArrowDown', 1, 400); a = await where('down'); check(a.act === 'retry', 'down, nothing kept: Down lands on Try again');
  await key('ArrowDown', 1, 300); await key('ArrowLeft', 1, 300); await key('ArrowRight', 1, 300); a = await where('arrows on Try again'); await seen('Try again');
  hits = 0; await tick(130e3); console.log('  requests in 130 s (nothing kept):', hits); check(hits >= 1, 'retries every minute with nothing kept');
  net.fail = false; await key('Enter', 1, 1500); a = await where('after Try again worked'); await shot('try-again-worked');
  check(a.key && a.key.startsWith('n:'), `Try again worked: focus on the first story (${a.key || a.sec || a.act})`);
  // list kept, ESPN down again
  net.fail = true; await ev(async () => { const m = await import('/tv/js/league.js'); await m.want('news', { force: true }); }); await p.waitForTimeout(800);
  await shot('down-kept'); console.log('  down note:', await text('.nb-s[data-s="news"] .nw-down'), '| meta:', await text('.nb-sec .meta'));
  const nb = await boxes('.nb-s[data-s="news"] .nw-down, .nb-s[data-s="news"] .nb-prev h2, .nb-s[data-s="news"] .nb-prev .lb');
  console.log('  boxes:', JSON.stringify(nb));
  a = await where('focus'); await key('ArrowRight', 1, 400); a = await where('Right from the list'); check(a.act === 'retry', `kept list: Right reaches Try again (${a.act || a.key})`);
  await key('ArrowLeft', 1, 300); a = await where('Left back'); check(a.key && a.key.startsWith('n:'), 'Left from Try again: back on the list');
  // the 60 s retry with a young list
  hits = 0; await tick(130e3); console.log('  requests in 130 s (young list kept, ESPN down):', hits); check(hits >= 1, 'retries every minute while ESPN is down (list kept)');
  // try again from deep in the list
  net.fail = false; await key('ArrowDown', 9, 250); const deep = await where('row 10');
  await key('ArrowRight', 1, 300); await key('Enter', 1, 1500); a = await where('after Try again (from row 10)');
  check(a.key === deep.key, `after Try again, focus goes back to the row it came from (${deep.key} -> ${a.key})`);
  // the 10 min refresh while shown
  hits = 0; await tick(11 * 60e3); console.log('  requests in 11 min while shown:', hits); check(hits >= 1, 'refreshes within 11 minutes while shown');
  // no news
  net.empty = true; await ev(async () => { const m = await import('/tv/js/league.js'); await m.want('news', { force: true }); }); await p.waitForTimeout(800);
  a = await where('no news'); await shot('no-news'); await seen('no news');
  console.log('  state:', await text('.nb-s[data-s="news"] .nw-st'));
  await H.go('news'); await key('ArrowDown', 1, 300); a = await where('Down with no news');
  net.empty = false; await ev(async () => { const m = await import('/tv/js/league.js'); await m.want('news', { force: true }); }); await p.waitForTimeout(800);
  // no-photo crests: away first
  await ev(async () => { const f = await import('/tv/js/focus.js'); const r = [...document.querySelectorAll('.nb-s[data-s="news"] .nb-nrow')].find((x) => /Phoenix visits/.test(x.textContent)); f.focus(r); }); await p.waitForTimeout(500);
  await shot('phx-okc');
  const order = await ev(() => [...document.querySelectorAll('.nb-s[data-s="news"] .nb-prev .nb-noph img')].map((i) => i.dataset.ini || i.src.split('/').pop()));
  check(order[0] === 'PHX' || /phx/i.test(order[0]), `Phoenix visits Oklahoma City: crests away first (${order.join(' at ')})`);
  H.done();
};
