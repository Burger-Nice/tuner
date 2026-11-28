// Try Rapt (design/brand-v7/rapt/BUILD-PLAN.md section 2; app/tv/js/rapt/try.js): opens Account > About > Try Rapt
// with the remote's keys, moves along both shelves, opens Type and the launch, switches the sounds, and checks:
// one focused element on the page, the picture changes after focus rests, text and focus inside the safe area
// (x 48-912, y 27-513), Classic's sounds come back when the page is left, and no console errors.
// Run: tests/tv/serve.sh, then node tests/tv/drive.js <out dir> rapt-try   (exits 1 when a check fails)
const C = require('./addons-common.js');
module.exports = async ({ p, shot, key, log }) => {
  const ev = (f, a) => p.evaluate(f, a);
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  let fails = 0;
  const ok = (cond, what) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`); if (!cond) fails++; };
  const wait = (ms) => p.waitForTimeout(ms);

  // the fake add-ons (Cinemeta's catalogs: his Films and Series), signed in to the fake provider
  await C({ p, key }, { addons: true });
  await ev(() => localStorage.removeItem('tuner.raptSounds'));   // (the default: the new set)

  // Account > About > Try Rapt, by keys: Back to the groups, down to About, right into its rows, down to the last
  const openPage = async (pic) => {
    await ev(() => window.__tunerTest.go('account')); await wait(1200);
    await key('Escape', 1, 250);
    for (let i = 0; i < 12 && !(await ev(() => document.activeElement?.dataset?.g === 'about')); i++) await key('ArrowDown', 1, 200);
    ok(await ev(() => document.activeElement?.dataset?.g === 'about'), 'Account: the About group by keys');
    await key('ArrowRight', 1, 300);
    for (let i = 0; i < 15 && !(await ev(() => document.activeElement?.dataset?.act === 'rapt')); i++) await key('ArrowDown', 1, 200);
    ok(await ev(() => document.activeElement?.dataset?.act === 'rapt'), 'About: the Try Rapt row');
    if (pic) await shot('about-row');
    await key('Enter', 1, 300);
    await p.waitForFunction(() => !!document.querySelector('[data-screen="rapt"]:not([hidden]) .r-shelf[data-shelf="0"] .r-p'), null, { timeout: 15000 });
    await wait(1500);
  };
  await openPage(true);
  await log('page open');

  const st = () => ev(() => {
    const root = document.querySelector('[data-screen="rapt"]');
    const a = document.activeElement;
    const bd = root.querySelector('.r-bd.vis img');
    return {
      open: !root.hidden, inPage: root.contains(a), focusN: document.querySelectorAll(':focus').length, poster: a?.classList.contains('r-p'),
      key: a?.dataset?.key || a?.dataset?.a || '', bg: bd?.getAttribute('src') || '', lit: root.dataset.lit || '', title: root.querySelector('.r-block h1')?.textContent || '',
      films: root.querySelectorAll('.r-shelf[data-shelf="0"] .r-p').length, series: root.querySelectorAll('.r-shelf[data-shelf="1"] .r-p').length,
      shelf: [...root.querySelectorAll('.r-shelf')].findIndex((s) => !s.hidden), font: getComputedStyle(root).fontFamily,
      fontOk: document.fonts.check('800 60px "Funnel Display"'), heldPosters: root.querySelectorAll('.r-p img').length,
      read: root.querySelector('.r-read').innerText,
    };
  });
  // nothing he reads and nothing focused outside the safe area (posters clipped by the shelf don't count: not drawn)
  const safe = () => ev(() => {
    const root = document.querySelector('[data-screen="rapt"]'), bad = [];
    const inShelf = (el) => el.closest('.r-clip');
    const check = (el, why) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const sh = inShelf(el);
      if (sh) { const s = sh.getBoundingClientRect(); if (r.right <= s.left || r.left >= s.right) return; }
      // (a hero title's box starts 3 px left of the line, as final.css draws it: its letters' side bearing, so the ink is on 48)
      const lx = el.tagName === 'H1' ? 44.5 : 47.5;
      if (r.left < lx || r.right > 912.5 || r.top < 26.5 || r.bottom > 513.5) bad.push(`${why} ${el.className || el.tagName} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.right)},${Math.round(r.bottom)} "${(el.textContent || '').trim().slice(0, 30)}"`);
    };
    for (const el of root.querySelectorAll('*')) {
      if (el.closest('.rl-launch') || el.closest('[hidden]') || getComputedStyle(el).visibility === 'hidden') continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (own) check(el, 'text');
      else if (el.classList.contains('r-p') || el.classList.contains('r-pill')) check(el, 'item');
    }
    if (root.contains(document.activeElement)) check(document.activeElement, 'focus');
    return bad;
  });

  let s = await st();
  ok(s.open && s.inPage && s.focusN === 1, `one focused element, on the page (${s.key})`);
  ok(s.poster, 'focus starts on a poster');
  ok(s.films >= 10, `Films shelf from the add-ons' Popular (${s.films} posters)`);
  ok(/Funnel Display/.test(s.font) && s.fontOk, 'Funnel Display is the page\'s font and has loaded');
  ok(!!s.bg, 'a picture behind the first film');
  ok(s.heldPosters <= 14, `posters holding a picture: ${s.heldPosters} (only those in view and two either side)`);
  await shot('rest');
  let bad = await safe(); ok(!bad.length, `safe area at rest${bad.length ? ': ' + bad.join(' | ') : ''}`);

  // along the Films shelf: the picture waits for focus to rest (250 ms), then changes
  const lit0 = s.lit, t0 = s.title;
  ok(lit0 === s.key, 'the canvas shows the focused film');
  await key('ArrowRight', 3, 60);
  s = await st();
  ok(s.lit === lit0, 'while focus moves the picture stays');
  await wait(900);
  s = await st();
  ok(s.focusN === 1 && s.poster, 'one focused element after moving right');
  ok(s.lit === s.key && s.lit !== lit0 && s.title !== t0 && !!s.bg, `the picture and the title followed focus once it rested (${t0} -> ${s.title})`);
  await shot('films-right3');
  // held Right: nothing changes while held, then it stops where it was let go
  // (a held key: Playwright sends a repeat for each down() while the key is down, as a remote does every ~50 ms)
  for (let i = 0; i < 14; i++) { await p.keyboard.down('ArrowRight'); await wait(50); }
  const mid = await st();
  await p.keyboard.up('ArrowRight'); await wait(900);
  s = await st();
  ok(mid.lit !== mid.key, "while Right is held the picture doesn't follow");
  ok(s.lit === s.key, `the picture caught up where the key was let go (${s.title})`);
  await shot('films-held');
  bad = await safe(); ok(!bad.length, `safe area along the shelf${bad.length ? ': ' + bad.join(' | ') : ''}`);

  // down to Series, along it, and back up
  await key('ArrowDown', 1, 400); await wait(800);
  s = await st();
  ok(s.shelf === 1 && s.poster && s.focusN === 1, `Down: the Series shelf (${s.series} posters)`);
  ok(s.series >= 10, 'Series shelf filled');
  ok(s.lit === s.key, 'the picture is the series');
  const litS = s.lit;
  await key('ArrowRight', 2, 160); await wait(900);
  s = await st();
  ok(s.lit !== litS && s.lit === s.key, 'the picture follows along Series');
  await shot('series-right2');
  bad = await safe(); ok(!bad.length, `safe area on Series${bad.length ? ': ' + bad.join(' | ') : ''}`);
  await key('ArrowUp', 1, 400);
  s = await st(); ok(s.shelf === 0 && s.poster, 'Up: back to Films, the same poster');
  // up to the actions row (a pill fills, the keycap goes), then the test row
  await key('ArrowUp', 1, 300);
  s = await st(); ok(s.key === 'play' && s.focusN === 1, 'Up: the Play pill');
  ok(await ev(() => getComputedStyle(document.querySelector('[data-screen="rapt"] .r-block .r-key')).visibility === 'hidden'), 'the OK keycap hides while a pill has focus');
  await shot('play-pill');
  await key('ArrowUp', 1, 300);
  s = await st(); ok(s.key === 'sounds', 'Up: the test row (Sounds)');

  // the sounds switch: the new set plays here and today's is quiet; then today's
  const level = () => ev(async () => (await import('/tv/js/sfx.js')).sfx.level());
  ok((await level()) === 'off', 'with the new set, today\'s sounds are quiet on the page');
  ok(/new set/.test(s.read), 'readout says the new set');
  await key('Enter', 1, 400);
  s = await st();
  ok(/today/.test(s.read) && (await level()) === 'on' && (await ev(() => localStorage.getItem('tuner.raptSounds'))) === '"v1"', 'Sounds switched to today\'s set (kept on this TV)');
  await shot('sounds-today');
  await key('Enter', 1, 400);
  ok((await level()) === 'off' && /new set/.test((await st()).read), 'and back to the new set');

  // the readout
  s = await st();
  ok(/Fades \d+ · worst \d+ · avg [\d.]+ ms/.test(s.read) && /Pictures held \d+ big/.test(s.read) && /Speech recognition/.test(s.read), `the readout: ${s.read.replace(/\n/g, ' / ')}`);
  ok(/Fades [1-9]/.test(s.read), 'fades were measured');
  await shot('readout');

  // Type: the six sizes on a plate; Back closes it and focus comes back
  await key('ArrowRight', 2, 250);
  s = await st(); ok(s.key === 'type', 'the Type pill');
  await key('Enter', 1, 500);
  const sizes = await ev(() => [...document.querySelectorAll('[data-screen="rapt"] .r-dlg .r-ty span')].map((e) => parseFloat(getComputedStyle(e).fontSize)));
  ok(sizes.join() === '60,44,28,20,18,17', `the six sizes: ${sizes.join(', ')}`);
  s = await st(); ok(s.key === 'close' && s.focusN === 1, 'focus is inside the plate');
  await shot('type');
  bad = await safe(); ok(!bad.length, `safe area with Type open${bad.length ? ': ' + bad.join(' | ') : ''}`);
  await key('Escape', 1, 400);
  s = await st(); ok(s.open && s.key === 'type', 'Back closes the plate, focus back on Type');

  // the launch: Reel inside the page
  await key('ArrowLeft', 1, 250);
  s = await st(); ok(s.key === 'launch', 'the Launch pill');
  await key('Enter', 1, 0);
  await wait(100); await shot('launch-reel');   // (shot() waits 450 ms first: about 550 ms in)
  await wait(300); await shot('launch-lockup');   // (about 1300 ms)
  ok(await ev(() => document.querySelector('[data-screen="rapt"]').classList.contains('rl-on')), 'the launch is up');
  await wait(1200);
  ok(await ev(() => !document.querySelector('[data-screen="rapt"]').classList.contains('rl-on')), 'the launch ended and left the page as it was');
  s = await st(); ok(s.focusN === 1 && s.inPage, 'one focused element after the launch');
  await shot('after-launch');

  // Play: OK on a poster asks the add-ons for the best copy and hands it to the player, as Home's Play now does (in a
  // browser there is no native player: the app counts the hand-over in window.__vodCount)
  await key('ArrowDown', 3, 350);
  s = await st(); ok(s.poster, `back on a poster (${s.title})`);
  const before = await ev(() => window.__vodCount || 0);
  await key('Enter', 1, 200);
  await p.waitForFunction((n) => (window.__vodCount || 0) > n, before, { timeout: 15000 }).catch(() => {});
  const vod = await ev(() => ({ n: window.__vodCount || 0, title: window.__lastVod?.[0]?.title || '' }));
  ok(vod.n > before, `OK on a poster started the player's play (${vod.title})`);
  s = await st(); ok(s.open && s.inPage, 'still on the page after Play');

  // Back leaves the page; Classic's sounds are back
  await key('Escape', 1, 600);
  s = await st();
  ok(!s.open && (await ev(() => window.__tunerTest.state().screen)) === 'account', 'Back leaves the page to Account');
  ok((await level()) === 'on', 'today\'s sounds are back outside the page');
  ok(await ev(() => document.querySelector('[data-screen="rapt"]').querySelectorAll('img[src]').length === 0), 'the page let go of every picture');

  // Send a report: the readout's numbers reach the (fake) ingest through the real Sentry SDK and the scrub; no title,
  // no link, no add-on address does
  const INGEST = 'http://127.0.0.1:8791';
  await fetch(`${INGEST}/_reset`).catch(() => {});
  await p.addInitScript(() => { window.TUNER_REPORTS = { app: 'tv', release: '0.0.0-test', env: 'test', test: true, dsn: 'http://k@127.0.0.1:8791/1' }; });
  await p.reload(); await wait(4000);
  await openPage(false);
  const titles = await ev(() => [...document.querySelectorAll('[data-screen="rapt"] .r-p')].length);
  await key('ArrowUp', 2, 300); await key('ArrowRight', 4, 200);
  ok((await st()).key === 'report', 'the Send a report pill');
  await key('Enter', 1, 300);
  let sent = '';
  for (let i = 0; i < 20 && !/raptFadeMax/.test(sent); i++) { await wait(500); sent = (await fetch(`${INGEST}/_got`).then((r) => r.json()).catch(() => [])).map((x) => x.bytes).join('\n'); }   // (what the app sent; not the browser's own request headers)
  ok(/raptFadeMax/.test(sent) && /raptPosters/.test(sent) && /raptSounds/.test(sent), "the report carries the readout's numbers");
  const leaked = ['127.0.0.1:8899', 'tt90', 'addon/', 'http://127', 'image', '.jpg', 'Breaking Bad', 'Tenzing', 'Glacier'].filter((x) => sent.includes(x));
  ok(!leaked.length, `no title, link or address in the report (${titles} titles on the page)${leaked.length ? ': ' + leaked.join(', ') : ''}`);

  const real = errs.filter((e) => !/Failed to load resource/.test(e));
  ok(!real.length, `no console errors${real.length ? ': ' + real.join(' | ') : ''}`);
  if (errs.length > real.length) console.log(`(${errs.length - real.length} missing pictures on the fake servers, not counted)`);
  console.log(fails ? `${fails} check(s) failed` : 'all checks passed');
  if (fails) throw new Error(`${fails} check(s) failed`);
};
