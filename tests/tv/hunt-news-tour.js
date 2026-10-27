// Bug hunt: News D-pad / flood tours, the preview, the reader (keys, footer, buttons, Back), live refresh under focus.
// node tests/tv/drive.js <out> hunt-news-tour
module.exports = async (c) => {
  const { p, shot, key } = c;
  const H = require('./hunt-league-lib.js')(c);
  const { ev, check, where, seen, flood, text, boxes, json, hold } = H;
  const news = H.fx('news.json');
  const story = H.fx('story.json');
  const net = { extra: null, storyDelay: 0, storyFail: false };
  // a premium story and one with no photo and two teams
  news.articles[0].premium = true;
  const noPh = news.articles.find((a) => /Cleveland and Minnesota/.test(a.headline)); noPh.images = [];
  await H.start({ routes: [
    [/127\.0\.0\.1:8899\/espn\/news(\?|$)/, (r) => { const u = r.request().url(); if (/team=/.test(u)) return r.continue(); const d = JSON.parse(JSON.stringify(news)); if (net.extra) d.articles.unshift(net.extra); return json(r, d); }],
    [/127\.0\.0\.1:8899\/espncontent\//, async (r) => { if (net.storyDelay) await new Promise((f) => setTimeout(f, net.storyDelay)); return net.storyFail ? json(r, {}, 503) : json(r, story); }],
  ] });
  const prevH = () => ev(() => document.querySelector('.nb-s[data-s="news"] .nb-prev h2')?.textContent || '');
  const rowH = () => ev(() => document.activeElement?.querySelector?.('b')?.textContent || '');
  await H.go('news'); await p.waitForTimeout(1500); await shot('news');
  const n = await ev(() => document.querySelectorAll('.nb-s[data-s="news"] .nb-nrow').length); console.log('  stories:', n);
  await key('ArrowDown', 1, 400); let a = await where('entry');
  // one press at a time to the end: focus visible, the preview follows
  for (let i = 1; i < n + 1; i++) {
    await key('ArrowDown', 1, 330); a = await H.act();
    if (a.hid || a.box[1] < 128 || a.box[3] > 513) check(false, `row ${i + 1}: hidden or outside the list (${a.key} [${a.box}] hidden=${a.hid})`);
    const ph = await prevH(), rh = await rowH();
    if (!/hidden by the shield/.test(rh) && ph !== rh) check(false, `row ${i + 1}: preview "${ph.slice(0, 30)}" != row "${rh.slice(0, 30)}"`);
  }
  a = await where('last row'); await shot('news-last');
  // Right / Left on a row
  await key('ArrowRight', 1, 300); a = await where('right from a row'); check(!!a.key, 'Right from a row stays in the list (nothing to focus on the right)');
  // flood up / down
  await flood('ArrowUp', 30, 40); await p.waitForTimeout(700); a = await where('flood up'); await seen('flood up');
  console.log('  section showing:', await ev(() => [...document.querySelectorAll('.nb-s')].filter((s) => !s.hidden).map((s) => s.dataset.s).join()));
  await H.go('news'); await p.waitForTimeout(400); await key('ArrowDown', 1, 300);
  await flood('ArrowDown', 30, 40); await p.waitForTimeout(700); a = await where('flood down'); await seen('flood down');
  check((await prevH()) === (await rowH()), 'after the flood the preview shows the focused story');
  // the premium story (first) and the no-photo one
  await H.go('news'); await key('ArrowDown', 1, 300);
  const top = () => ev(async () => { const f = await import('/tv/js/focus.js'); f.focus(document.querySelector('.nb-s[data-s="news"] .nb-nrow')); });
  const toRow = async (re) => { await top(); await p.waitForTimeout(400); for (let i = 0; i < n; i++) { if (re.test(await rowH())) return true; await key('ArrowDown', 1, 200); } return false; };
  await H.go('news'); await key('ArrowDown', 1, 300); await toRow(/Cleveland and Minnesota/); await p.waitForTimeout(400); await shot('no-photo-preview');
  console.log('  no-photo preview:', await ev(() => document.querySelector('.nb-s[data-s="news"] .nb-prev .ph')?.innerHTML.slice(0, 160)));
  // the reader on a story with 2 team buttons
  await key('Enter', 1, 1500); a = await where('reader'); await shot('reader');
  const rb = await boxes('#overlays .nb-read'); check(rb.length === 1 && rb[0].l === 140 && rb[0].r === 820 && rb[0].top === 27 && rb[0].bot === 513, `reader box x 140-820, y 27-513 (${JSON.stringify(rb.map(({ l, r, top, bot }) => [l, r, top, bot]))})`);
  console.log('  foot:', await text('#overlays .nb-read .foot'));
  await key('ArrowLeft', 1, 200); await key('ArrowRight', 1, 200); a = await where('left/right on the body'); check(a.cls.includes('bd'), 'Left/Right keep the body');
  for (let i = 0; i < 30; i++) { await key('ArrowDown', 1, 300); a = await H.act(); if (a.act === 'team') break; }
  a = await where('end: buttons'); await shot('reader-buttons');
  console.log('  foot:', await text('#overlays .nb-read .foot'), '| buttons:', await text('#overlays .nb-rbtns'));
  check(a.act === 'team' && !a.hid && a.box[3] <= 513 - 44, `the team button is visible above the footer (${JSON.stringify(a.box)})`);
  await key('ArrowRight', 1, 300); a = await where('right on the buttons'); await seen('second team button');
  await key('ArrowDown', 1, 300); a = await where('down on the buttons');
  await key('ArrowUp', 1, 400); a = await where('up from the buttons'); check(a.cls.includes('bd'), 'Up from the buttons goes back to the body');
  console.log('  foot:', await text('#overlays .nb-read .foot'));
  for (let i = 0; i < 30; i++) { await key('ArrowDown', 1, 250); a = await H.act(); if (a.act === 'team') break; }
  const row = await ev(() => document.querySelector('.nb-s[data-s="news"] .nb-nrow:focus, .nb-s[data-s="news"] .nb-nrow')?.dataset.key);
  await key('Enter', 1, 1500); a = await where('team page from the reader'); console.log('  screen:', await ev(() => window.__tunerTest.state().screen));
  await key('Escape', 1, 1200); a = await where('back from the team page'); await shot('back-from-team');
  check(a.key && a.key.startsWith('n:') && !a.hid, `Back from the team page returns to the story row (${a.key || a.sec || a.cls})`);
  // Back from the reader returns to the row, ring on
  await key('Enter', 1, 1200); await where('reader again'); await key('Escape', 1, 600); a = await where('Back from the reader'); check(a.key && a.key.startsWith('n:'), 'Back closes the reader, focus on the row');
  // the premium story
  await H.go('news'); await key('ArrowDown', 1, 300); await toRow(/Jalen Williams, Cason Wallace injured/); await p.waitForTimeout(400); await shot('premium-preview');
  console.log('  premium row:', await ev(() => document.activeElement.textContent));
  await key('Enter', 1, 1200); await shot('premium-reader'); console.log('  premium reader:', (await text('#overlays .nb-read .bd')).slice(0, 300));
  await key('Escape', 1, 500);
  // story text slow, then failing
  net.storyDelay = 3000;
  await top(); await p.waitForTimeout(300); await key('ArrowDown', 3, 300); await key('Enter', 1, 500); await shot('story-loading'); console.log('  loading:', (await text('#overlays .nb-read .bd')).slice(-80));
  await key('ArrowDown', 1, 300); const y1 = await ev(() => document.querySelector('#overlays .nb-read .in').style.transform);
  await p.waitForTimeout(3500); await shot('story-landed');
  const y2 = await ev(() => document.querySelector('#overlays .nb-read .in').style.transform);
  console.log('  scroll before/after the text landed:', y1, y2, '| foot:', await text('#overlays .nb-read .foot'));
  a = await where('focus after the story landed'); check(a.cls.includes('bd'), 'focus stays on the body when the text lands');
  await key('Escape', 1, 500); net.storyDelay = 0; net.storyFail = true;
  await key('ArrowDown', 1, 300); await key('Enter', 1, 1500); await shot('story-failed'); console.log('  failed:', (await text('#overlays .nb-read .bd')).slice(-100));
  await key('Escape', 1, 500); net.storyFail = false;
  // a new story arrives while focused on row 8
  await H.go('news'); await key('ArrowDown', 1, 300); await top(); await p.waitForTimeout(300); await key('ArrowDown', 7, 300); const before = await where('row 8');
  net.extra = JSON.parse(JSON.stringify(news.articles[2])); Object.assign(net.extra, { id: 99999999, headline: 'BREAKING: a new story at the top', published: new Date().toISOString() });
  await ev(async () => { const m = await import('/tv/js/league.js'); await m.want('news', { force: true }); }); await p.waitForTimeout(900);
  a = await where('after the refresh'); await shot('news-refresh');
  check(a.key === before.key && !a.hid, `a new story at the top: focus stays on the same story (${before.key} -> ${a.key})`);
  check(JSON.stringify(a.box) === JSON.stringify(before.box), `and it doesn't jump (${before.box} -> ${a.box})`);
  check((await prevH()) === (await rowH()), 'the preview still matches the focused story');
  // hold OK on a row
  await hold(); await shot('news-hold'); console.log('  after hold OK: overlay', await H.ovOpen(), await text('#overlays .ov'.slice(0, 40)));
  await H.closeAll();
  // Back from a row: the chip; again: the NBA tab
  await key('Escape', 1, 400); a = await where('Back 1'); check(a.sec === 'news', 'Back: the News chip');
  await key('Escape', 1, 400); a = await where('Back 2'); check(a.tab === 'nba', 'Back again: the NBA tab');
  await key('ArrowDown', 1, 400); await where('Down from the tab'); await key('ArrowDown', 1, 400); a = await where('Down again');
  console.log('  first row focused?', a.key, 'first row:', await ev(() => document.querySelector('.nb-s[data-s="news"] .nb-nrow')?.dataset.key));
  H.done();
};
