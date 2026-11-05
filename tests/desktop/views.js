// The Windows app's views in Chromium (no Electron, no mpv: tests/desktop/stub.js stands in for window.tuner) against
// the fake provider and fake ESPN: sign in, Home (the Marquee, the rows, hover), the guide (drag, the panel, a tune),
// the player (the v2 bar, keys, the docked panel, the mini player's hand-off), NBA, Movies and a title page, the
// palette, the shortcuts sheet, Saved, Account (Windows), multiview (the picker, two tiles, the audio), 1366 x 768.
// Screenshots go to <outdir>. Run: tests/tv/serve.sh (the fake servers and app/ on 8777), then
// node tests/desktop/views.js <outdir>
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const out = path.resolve(process.argv[2] || '.tmp/desktop-shots');
const APP = process.env.DESKTOP_URL || 'http://127.0.0.1:8777/desktop.html';
const H = 'http://127.0.0.1:8899';
fs.mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(56)} ${String(detail).slice(0, 200)}`); return ok; };

(async () => {
  const b = await chromium.launch({ args: ['--disable-web-security', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message}\n${(e.stack || '').split('\n').slice(0, 3).join(' | ')}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|404|favicon/.test(m.text())) errs.push(`CONSOLE ${m.text()}`); });
  await fetch(`${H}/_stremio/reset`).catch(() => {});
  await p.addInitScript({ path: path.join(__dirname, 'stub.js') });
  await p.addInitScript((H) => {
    window.TUNER_TEST = 1;
    for (const [k, v] of Object.entries({ nbaBase: `${H}/espn`, nbaWebBase: `${H}/espnweb`, nbaContentBase: `${H}/espncontent`, cinemetaBase: `${H}/addon/cinemeta`, stremioApi: `${H}/stremio-api`, stremioLink: `${H}/stremio-link`, ratingsUrl: `${H}/ratings.json`, tmdbBase: `${H}/tmdb/3`, tmdbImg: `${H}/tmdb-img` })) if (!localStorage.getItem(`tuner.${k}`)) localStorage.setItem(`tuner.${k}`, JSON.stringify(v));
  }, H);
  let n = 0;
  const shot = async (name) => { await p.waitForTimeout(600); await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); };
  const ev = (f, a) => p.evaluate(f, a);
  const state = () => ev(() => window.__tunerTest?.state());
  const wait = async (f, ms = 10000, a) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(f, a).catch(() => false)) return true; await p.waitForTimeout(200); } return false; };
  const click = async (sel) => { const e = await p.waitForSelector(sel, { timeout: 8000 }); await e.click(); await p.waitForTimeout(350); };
  const key = async (k) => { await p.keyboard.press(k); await p.waitForTimeout(350); };

  await p.goto(APP);
  check('the shell loads', await wait(() => window.__desktopReady && window.__tunerTest), JSON.stringify(await state().catch(() => null)));
  // sign in
  // airglow accounts (design/ui-v1/accounts-v1): the account card leads; the provider card is the second door
  check('sign in leads with the airglow account', await wait(() => /No other sign-in/.test(document.querySelector('.si-card')?.textContent || '')));
  await shot('signin-account');
  await click('[data-act="noacct"]');
  await wait(() => document.querySelector('#siServer'));
  await shot('signin');
  await p.fill('#siServer', H); await p.fill('#siUser', 'demo'); await p.fill('#siPass', 'demo');
  await click('#siGo');
  check('signed in', await wait(() => window.__tunerTest.state().acc, 15000));
  await wait(() => document.querySelector('[data-act="done"]'), 8000);
  // the fake Stremio account's add-ons and a TMDB key, as Account would bring them (the phone flows' way)
  await ev(async (H) => {
    const acc = JSON.parse(localStorage.getItem('tuner.accounts') || '[]')[0];
    const pre = `tuner.a:${acc.id}:`;
    localStorage.setItem(pre + 'stremio', JSON.stringify({ authKey: 'AK-test-1', at: Date.now(), keep: true }));
    const r = await fetch(`${H}/stremio-api/api/addonCollectionGet`, { method: 'POST', body: JSON.stringify({ authKey: 'AK-test-1' }) }).then((x) => x.json());
    const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
    const ok = r.result.addons.filter((x) => /\/addon\/(cinemeta|northlight|kestrel)/.test(x.transportUrl));
    localStorage.setItem(pre + 'addons', JSON.stringify(ok.map((x) => ({ key: 'ad' + hash(x.transportUrl), url: x.transportUrl, manifest: x.manifest, at: Date.now(), on: true, catalogs: Object.fromEntries((x.manifest.catalogs || []).filter((c) => !(c.extra || []).some((e) => e.isRequired && e.name !== 'genre')).map((c) => [`${c.type}:${c.id}`, true])), from: 'stremio', kind: {}, health: {} }))));
    localStorage.setItem('tuner.tmdbKey', JSON.stringify('test-tmdb-token'));
  }, H);
  await click('[data-act="done"]').catch(() => {});
  await p.reload();
  await wait(() => window.__desktopReady, 10000);
  check('Home after sign-in', await wait(() => window.__tunerTest.state().screen === 'home', 8000), (await state())?.screen);
  await wait(() => document.querySelectorAll('.pg-home .hm-lineup .e, .pg-home .hm-card').length >= 1, 10000);
  await wait(() => document.querySelectorAll('.pg-home .row').length >= 1, 15000);
  await p.waitForTimeout(1500);
  const home = await ev(() => ({ lines: document.querySelectorAll('.hm-lineup > *').length, card: !!document.querySelector('.hm-card'), rows: document.querySelectorAll('.pg-home .row').length, side: document.querySelectorAll('#dk-side .sb-i').length, rail: document.documentElement.classList.contains('side-rail') }));
  check('Home: the lineup with its lit card, the rows, the sidebar', home.card && home.lines >= 1 && home.rows >= 1 && home.side === 6 && !home.rail, JSON.stringify(home));
  await shot('home');
  // hover a line: its card opens in place after 150 ms
  const l2 = await p.$('.hm-lineup .e[data-line]');
  if (l2) { const i = await l2.getAttribute('data-line'); await l2.hover(); await p.waitForTimeout(500); check('Home: hover lights a line (its card opens in place)', await ev((i) => document.querySelector('.hm-card')?.dataset.line === i, i)); }
  // scroll to the rows, hover a poster
  await ev(() => document.querySelector('.pg-home').scrollTo(0, 700));
  await p.waitForTimeout(500);
  const post = await p.$('.pg-home .poster[data-i]');
  if (post) { await post.hover(); await p.waitForTimeout(300); }
  await shot('home-rows');
  // right-click: the TV's hold-OK menu
  if (post) { await post.click({ button: 'right' }); await p.waitForTimeout(300); check('Home: right-click on a poster opens its menu at the pointer', await ev(() => !!document.querySelector('#floats .fl.cm .menu'))); await shot('home-menu'); await key('Escape'); }

  // the guide
  await key('Control+2');
  check('Ctrl 2 opens Live', (await state()).screen === 'live');
  await wait(() => document.querySelectorAll('.gd-c').length > 4, 15000);
  await p.waitForTimeout(1200);
  const gd = await ev(() => ({ rows: document.querySelectorAll('.gd-r').length, cells: document.querySelectorAll('.gd-c').length, flag: !!document.querySelector('.gd-flag'), panel: !!document.querySelector('.gd-panel h2') }));
  check('Live: the grid, the Now flag, the panel', gd.rows >= 6 && gd.cells > 4 && gd.flag && gd.panel, JSON.stringify(gd));
  await shot('guide');
  // drag pans time
  const t0 = await ev(() => document.querySelector('.gd-ruler span')?.textContent);
  const g = await p.$('.gd-cells');
  const bb = await g.boundingBox();
  await p.mouse.move(bb.x + 600, bb.y + 30); await p.mouse.down(); await p.mouse.move(bb.x + 200, bb.y + 30, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(300);
  check('Live: dragging pans the guide along time', (await ev(() => document.querySelector('.gd-ruler span')?.textContent)) !== t0, `${t0} -> ${await ev(() => document.querySelector('.gd-ruler span')?.textContent)}`);
  await key('n');
  // tune the first channel: the player
  await click('.gd-r .gd-ch');
  check('the player opens on a tune (theater)', await wait(() => window.__tunerTest.state().player?.playing, 8000), JSON.stringify((await state()).player));
  await p.mouse.move(900, 500); await p.waitForTimeout(400);
  await shot('player-live');
  check('the player: the title strip names the way back', await ev(() => /Back|Live/.test(document.querySelector('#dk-tbar .pv-back')?.textContent || '')));
  await key('PageDown');
  await p.waitForTimeout(400);
  check('PgDn zaps', await ev(() => window.__stub.log.filter((x) => x[0] === 'load').length >= 2));
  await key('l'); await shot('player-channels'); await key('Escape');
  await key('o'); check('O opens Options', await ev(() => /Options/.test(document.querySelector('#floats .menu')?.textContent || ''))); await shot('player-options'); await key('Escape');
  await key('p');
  check('P: the picture moves to the mini player (the same mpv)', await wait(() => window.__stub.log.some((x) => x[0] === 'move' && x[2] === 'mini')) && !(await state()).player?.layout?.fs);
  await shot('mini-sidebar');
  await key('Control+p');
  check('Ctrl P brings it back to theater', await wait(() => window.__stub.log.filter((x) => x[0] === 'move' && x[2] === 'main').length >= 1));
  await key('Control+w');
  check('Ctrl W closes the player', await wait(() => !window.__tunerTest.state().player));

  // NBA
  await key('Control+3');
  await wait(() => document.querySelector('.pg-nba .gcard, .pg-nba .nb-hero'), 12000);
  await p.waitForTimeout(1200);
  await shot('nba-hub');
  check('NBA: game cards', await ev(() => document.querySelectorAll('.pg-nba .gcard').length >= 1));
  await key('Control+ArrowRight'); await p.waitForTimeout(800); await shot('nba-team');
  await key('Control+ArrowRight'); await p.waitForTimeout(1200); await shot('nba-standings');
  await key('Control+ArrowLeft'); await key('Control+ArrowLeft');
  const gc = await p.$('.pg-nba .gcard');
  if (gc) { await gc.click(); await wait(() => window.__tunerTest.state().screen === 'game', 6000); await p.waitForTimeout(1500); await shot('nba-game'); await key('Alt+ArrowLeft'); }

  // Movies, a title page
  await key('Control+4');
  await wait(() => document.querySelectorAll('.pg-lib .poster[data-i] img').length >= 4, 15000);
  await p.waitForTimeout(800);
  await shot('movies');
  const mp = await p.$('.pg-lib .poster[data-i]');
  if (mp) { await mp.click(); check('a title page opens', await wait(() => window.__tunerTest.state().screen === 'detail', 10000)); await p.waitForTimeout(2500); await shot('title'); }
  await key('Control+5');
  await wait(() => document.querySelectorAll('.pg-lib .poster[data-i]').length >= 4, 15000);
  const sp = await p.$('.pg-lib .poster[data-i]');
  if (sp) {
    await sp.click(); await wait(() => window.__tunerTest.state().screen === 'detail', 10000); await p.waitForTimeout(3000); await shot('title-series');
    // an episode plays (an add-on copy, in the fake mpv): the v2 bar for an episode, seeking, Up next's queue, Esc stops it
    await ev(() => document.querySelector('.pg-detail .ep')?.click());
    const vod = await wait(() => window.__tunerTest.state().player?.mode === 'vod' && window.__tunerTest.state().player.playing, 15000);
    check('an episode plays from the title page', vod, JSON.stringify((await state()).player));
    if (vod) {
      await p.mouse.move(800, 500); await p.waitForTimeout(300);
      await key('ArrowRight'); await key('ArrowRight');
      check('→ seeks 10 s', await ev(() => window.__stub.log.some((x) => x[0] === 'cmd' && x[2] === 'seek')));
      await shot('player-episode');
      await key('c'); check('C opens Subtitles', await ev(() => /Subtitles/.test(document.querySelector('#floats .menu')?.textContent || ''))); await key('Escape');
      await key('Escape'); await key('Escape');
      check('Esc leaves: an episode stops (no mini player)', await wait(() => !window.__tunerTest.state().player, 4000), JSON.stringify((await state()).player));
    }
  }

  // the palette, the sheet
  await key('Control+k');
  check('Ctrl K opens the palette', await ev(() => !!document.querySelector('.pal input')));
  await p.keyboard.type('griz'); await p.waitForTimeout(900);
  check('the palette finds the team and its actions', await ev(() => document.querySelectorAll('.pal-r').length >= 2), await ev(() => [...document.querySelectorAll('.pal-r b')].map((x) => x.textContent).slice(0, 5).join(' | ')));
  await shot('palette');
  await key('Escape');
  await key('Control+k'); await p.keyboard.type('3'); await p.waitForTimeout(400);
  check('digits in the palette: Tune channel 3', await ev(() => /Tune channel 3/.test(document.querySelector('.pal-r b')?.textContent || '')), await ev(() => [...document.querySelectorAll('.pal-r b')].map((x) => x.textContent).slice(0, 3).join(' | ') + ' q=' + document.querySelector('.pal input')?.value));
  await key('Escape');
  await key('Shift+?');
  check('? opens the shortcuts sheet', await ev(() => !!document.querySelector('.ks-cols')));
  await shot('shortcuts');
  await key('Escape');

  // Saved, Account
  await key('Control+6'); await p.waitForTimeout(600); await shot('saved');
  await key('Control+,'); await p.waitForTimeout(600);
  await click('[data-grp="windows"]'); await p.waitForTimeout(400); await shot('account-windows');

  // multiview: the picker, a channel, a second one, the audio
  await key('Control+Shift+M');
  check('Ctrl Shift M opens multiview with the picker', await wait(() => window.__tunerTest.state().mv?.picker));
  await wait(() => document.querySelectorAll('.mv-pr [data-mv="addc"]').length >= 2, 6000);
  const adds = await p.$$('.mv-pr [data-mv="addc"]');
  if (adds.length < 2) { await p.fill('#mv-q', 'channel'); await p.waitForTimeout(400); }
  for (let k = 0; k < 2; k++) { await ev(() => document.querySelector('.mv-pr:not(.placed) [data-mv="addc"]')?.click()); await p.waitForTimeout(600); }
  const mv = (await state()).mv;
  check('multiview: two tiles playing, one with the audio', mv && mv.slots.filter((s) => s.kind === 'ch').length >= 2, JSON.stringify(mv));
  await shot('multiview');
  await key('2'); check('2 moves the audio to tile 2', (await state()).mv?.audio === 1);
  await key('Escape'); await key('Escape');
  check('leaving multiview: the audio tile becomes the player', await wait(() => window.__tunerTest.state().player?.playing, 6000), JSON.stringify((await state()).player));
  await key('Control+w');

  // 1366 x 768: the rail, the small lineup
  await p.setViewportSize({ width: 1366, height: 768 });
  await key('Control+1');
  await p.waitForTimeout(1500);
  check('1366: the sidebar folds to the rail', (await state()).rail);
  await shot('home-1366');

  // game night at small windows: the lit card keeps clear of the crests, the records line and the ON NOW / score plates
  for (const [w, h] of [[1024, 768], [1366, 768], [1920, 1080]]) {
    await p.setViewportSize({ width: w, height: h });
    await key('Control+1');
    await p.waitForTimeout(1200);
    // light the game's line (it is the lead when a game is on, else the last one)
    for (let k = 0; k < 5 && !(await ev(() => !!document.querySelector('.pg-home .field'))); k++) {
      const es = await p.$$('.hm-lineup .e[data-line]');
      if (!es.length) break;
      await es[Math.min(k, es.length - 1)].hover(); await p.waitForTimeout(900);
    }
    const gn = await ev(() => {
      const r = (e) => { const b = e?.getBoundingClientRect(); return b ? { l: b.left, t: b.top, r: b.right, b: b.bottom } : null; };
      const card = r(document.querySelector('.hm-card'));
      const parts = [...document.querySelectorAll('.pg-home .field .side .crest, .pg-home .field .side b, .pg-home .field .side span, .pg-home .field .gn-score .clock, .pg-home .field .gn-score .plate')].map((e) => ({ n: e.className || e.tagName, ...r(e) }));
      return { card, parts, field: !!document.querySelector('.pg-home .field') };
    });
    const hit = gn.field && gn.card ? gn.parts.filter((x) => x.l < gn.card.r && x.r > gn.card.l && x.t < gn.card.b && x.b > gn.card.t) : null;
    check(`${w}: game night's card clears the crests, records and plates`, gn.field && gn.card && !hit.length, gn.field ? JSON.stringify({ card: gn.card, hit }) : 'no game field lit');
    await shot(`gamenight-${w}`);
  }

  const fatal = errs.filter((e) => !/ResizeObserver/.test(e));
  check('no page errors', !fatal.length, `${fatal.length} errors`);
  for (const e of fatal.slice(0, 6)) console.log('  ', e);
  fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 1));
  await b.close();
  const bad = results.filter((r) => !r.ok);
  console.log(`${results.length} checks, ${bad.length} failed`);
  process.exit(bad.length ? 1 : 0);
})();
