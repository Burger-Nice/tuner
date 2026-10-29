// The iPhone app's main flows in Chromium at 393 x 852 (touch, 3x) against the fake provider and fake ESPN
// (design/ui-v1/phone-v1/SPEC.md): sign in, Home, Live and a channel (the player opens and plays HLS), the NBA hub,
// a game page and From tip-off (the replay plays its .m3u8), Library and a title page, Search, Account and Check
// streams on this iPhone, the player in landscape. Screenshots go to <outdir>.
// Run: tests/tv/serve.sh (the fake servers), node scripts/build-web.js phone, then serve www/ on 8779
// (python3 -m http.server 8779 --directory www), then: node tests/phone/flows.js <outdir>
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2] || '.tmp/phone-shots';
const APP = process.env.PHONE_URL || 'http://127.0.0.1:8779/index.html';
const H = 'http://127.0.0.1:8899';
fs.mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(44)} ${detail}`); return ok; };
(async () => {
  const b = await chromium.launch({ args: ['--disable-web-security', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|404|favicon/.test(m.text())) errs.push(`CONSOLE ${m.text()}`); });
  await fetch(`${H}/_stremio/reset`).catch(() => {});
  await p.addInitScript((H) => {
    window.TUNER_TEST = 1;
    for (const [k, v] of Object.entries({ nbaBase: `${H}/espn`, nbaWebBase: `${H}/espnweb`, nbaContentBase: `${H}/espncontent`, cinemetaBase: `${H}/addon/cinemeta`, stremioApi: `${H}/stremio-api`, stremioLink: `${H}/stremio-link`, ratingsUrl: `${H}/ratings.json`, tmdbBase: `${H}/tmdb/3`, tmdbImg: `${H}/tmdb-img` })) if (!localStorage.getItem(`tuner.${k}`)) localStorage.setItem(`tuner.${k}`, JSON.stringify(v));
  }, H);
  let n = 0;
  const shot = async (name) => { await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); };
  const ev = (f, a) => p.evaluate(f, a);
  const state = () => ev(() => window.__tunerTest?.state());
  const tap = async (sel) => { if (/data-tab/.test(sel)) await ev(() => document.querySelector('#ph-tabs').classList.remove('mini')); const el = await p.waitForSelector(sel, { timeout: 8000 }); await el.tap(); await p.waitForTimeout(400); };
  const wait = async (f, ms = 10000, a) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(f, a).catch(() => false)) return true; await p.waitForTimeout(250); } return false; };
  const text = (sel) => ev((s) => document.querySelector(s)?.innerText || '', sel);

  await p.goto(APP);
  await p.waitForTimeout(1500);
  check('starts on sign in', (await state())?.screen === 'signin');
  // the fields as an iPhone types them (review 2, S4)
  const attrs = await ev(() => { const s = document.querySelector('#siServer'), u = document.querySelector('#siUser'), pw = document.querySelector('#siPass'); return { s: [s.getAttribute('autocapitalize'), s.getAttribute('autocorrect'), s.getAttribute('inputmode')], u: [u.getAttribute('autocapitalize'), u.getAttribute('autocomplete')], pw: pw.getAttribute('autocomplete'), labels: [...document.querySelectorAll('.si-card label')].map((l) => l.textContent) }; });
  check('sign-in fields: labels and iPhone attributes', attrs.s.join() === 'off,off,url' && attrs.u.join() === 'off,username' && attrs.pw === 'current-password' && attrs.labels.join() === 'Server,Username,Password', JSON.stringify(attrs));
  await shot('signin');
  await p.fill('#siServer', '127.0.0.1:8899');
  await p.fill('#siUser', 'demo');
  await p.fill('#siPass', 'demo');
  await tap('#siGo');
  check('sign in reaches the team step', await wait(() => !!document.querySelector('[data-act="done"]'), 15000));
  await shot('signin-team');
  // the fake Stremio account's add-ons, as Account > Add-ons > Sign in would bring them (the fake API answers any login)
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
  await tap('[data-act="done"]');
  await p.waitForTimeout(1500);
  check('Home after sign in', (await state())?.screen === 'home');
  await p.reload();
  await p.waitForTimeout(5000);
  const home = await ev(() => ({ card: document.querySelector('.hm-card')?.innerText || '', lines: document.querySelectorAll('.hm-lines .e').length, rows: document.querySelectorAll('.row').length, tabs: !document.querySelector('#ph-tabs').hidden }));
  check('Home: the Marquee card and its lines', home.card.length > 5, `${home.lines} lines · ${home.card.replace(/\s+/g, ' ').slice(0, 80)}`);
  check('Home: rows under it', home.rows >= 1, `${home.rows} rows`);
  check('the tab bar shows', home.tabs);
  await shot('home');
  await ev(() => document.querySelector('#ph-screens > section:not([hidden])').scrollTo({ top: 700 }));
  await p.waitForTimeout(400);
  await shot('home-rows');
  await ev(() => document.querySelector('#ph-screens > section:not([hidden])').scrollTo({ top: 0 }));
  await p.waitForTimeout(300);
  await ev(() => document.querySelector('#ph-tabs').classList.remove('mini'));
  // the facts line never ends on a separator (review 2, S9): the separators are CSS on the next fact
  check('facts: no text separators to strand', await ev(() => ![...document.querySelectorAll('.facts > span')].some((s) => /·\s*$/.test(s.textContent))));

  // ---------- Live ----------
  await tap('[data-tab="live"]');
  check('Live: channel rows', await wait(() => document.querySelectorAll('.lv-ch[data-i]').length > 3, 10000));
  await wait(() => [...document.querySelectorAll('.lv-ch .nx')].length > 0, 8000);
  const nx = await ev(() => [...document.querySelectorAll('.lv-ch .nx .tx')].map((x) => ({ t: x.textContent, cut: x.scrollWidth > x.clientWidth + 1 })).slice(0, 6));
  check('Live: until · Next on the rows, one time only', nx.length > 0 && nx.every((x) => /^until \d\d:\d\d( · Next .+)?$/.test(x.t)), JSON.stringify(nx.slice(0, 2)));
  await shot('live');
  // swipe a row left: favourite
  const box = await (await p.$('.lv-ch[data-i="1"]')).boundingBox();
  await ev(() => document.querySelector('.lv-ch[data-i="1"]').dataset.name = '1');
  const cdp = await ctx.newCDPSession(p);
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', box.x + 300, box.y + 40);
  for (let i = 1; i <= 8; i++) { await touch('touchMove', box.x + 300 - i * 18, box.y + 40); await p.waitForTimeout(16); }
  await touch('touchEnd');
  await p.waitForTimeout(600);
  check('Live: swipe left favourites', await ev(() => /favourites/.test(document.querySelector('#toast')?.innerText || '')), await text('#toast'));
  // the channel's day
  await tap('.lv-ch[data-i="0"] .chev');
  check('the channel\'s day opens', await wait(() => window.__tunerTest.state().screen === 'day' && document.querySelectorAll('.lv-day .p').length > 0, 8000));
  await shot('day');
  await ev(() => window.__tunerTest.back());
  await p.waitForTimeout(500);
  // tune: the player opens with the channel's .m3u8
  await tap('.lv-ch[data-i="0"]');
  check('the player opens on a channel', await wait(() => !!window.__phonePlayer?.state(), 8000));
  const ps = await ev(() => window.__phonePlayer.state());
  check('live plays its HLS link (.m3u8)', /\/live\/demo\/demo\/\d+\.m3u8$/.test(ps.url), ps.url);
  const played = await wait(() => window.__phonePlayer.state()?.playing, 15000);
  check('the live stream plays (picture)', played, JSON.stringify(await ev(() => window.__phonePlayer.state())));
  await shot('player-live');
  const ring = await ev(() => document.querySelectorAll('.pv-zap .lv-ch').length);
  check('the zap ring is listed under the video', ring > 2, `${ring} rows`);
  await ev(() => window.__phonePlayer.close());
  await p.waitForTimeout(600);
  check('closing the player returns to Live', (await state())?.screen === 'live' && !(await ev(() => window.__phonePlayer.state())));

  // ---------- NBA ----------
  await tap('[data-tab="nba"]');
  check('NBA: the hero or the day\'s cards', await wait(() => document.querySelectorAll('.nb-hero, .gcard').length > 0, 12000));
  const nb = await ev(() => ({ hero: document.querySelector('.nb-hero')?.innerText.replace(/\s+/g, ' ') || '', cards: document.querySelectorAll('.nb-grid .gcard').length, heroId: document.querySelector('.nb-hero')?.dataset.g || '', listIds: [...document.querySelectorAll('.nb-grid .gcard')].map((c) => c.dataset.g) }));
  check('NBA: the hero\'s game isn\'t repeated in the list', !nb.heroId || !nb.listIds.includes(nb.heroId), `${nb.cards} cards · ${nb.hero.slice(0, 90)}`);
  await shot('nba');
  // the shield: no score digits on a hidden card
  const leak = await ev(() => [...document.querySelectorAll('.gcard')].filter((c) => /Score hidden/.test(c.innerText) && /\b\d{2,3}\s*\n?\s*\d{2,3}\b/.test(c.querySelector('.plate')?.innerText || '')).length);
  check('NBA: a hidden card shows no score', leak === 0);
  await ev(() => [...document.querySelectorAll('[data-sec]')].find((x) => x.dataset.sec === 'standings').click());
  await wait(() => !!document.querySelector('.box-t, .cover'), 8000);
  await shot('nba-standings');
  await ev(() => [...document.querySelectorAll('[data-sec]')].find((x) => x.dataset.sec === 'games').click());
  await p.waitForTimeout(500);
  // a game page, and From tip-off where the game has started
  const gid = await ev(() => { const h = document.querySelector('.nb-hero')?.dataset.g; if (h) return h; const all = [...document.querySelectorAll('.gcard[data-g]')]; const live = all.find((c) => /Live|Ended|Final|hidden/i.test(c.innerText)); return (live || all[0])?.dataset.g || ''; });
  if (gid) {
    await ev((id) => window.__tunerTest.push('game', { id }), gid);
    check('a game page opens', await wait(() => window.__tunerTest.state().screen === 'game' && document.querySelector('[data-screen="game"]').innerText.length > 20, 8000));
    await p.waitForTimeout(1500);
    await shot('game');
    // From tip-off on the game page (the fake provider's game channel keeps no archive: then airglow says it's looking)
    const tip = await p.$('[data-screen="game"] [data-gact="tipoff"]');
    if (tip) {
      await tip.tap();
      const rp = await wait(() => window.__phonePlayer?.state()?.replay, 8000);
      check('From tip-off: the replay, or "airglow keeps looking"', rp || /keeps looking/.test(await text('#toast')), rp ? 'replay' : await text('#toast'));
      if (rp) { await ev(() => window.__phonePlayer.close()); await p.waitForTimeout(600); }
    }
  } else check('a game to open', false);
  // a replay from a kept channel's day (catch-up): the player's replay mode and its .m3u8 link
  await ev(() => window.__tunerTest.push('day', { id: '1001' }));
  await wait(() => document.querySelectorAll('.lv-day .p').length > 0, 8000);
  const past = await ev(() => { const b = [...document.querySelectorAll('.lv-day .p')].find((x) => !x.classList.contains('gone') && !x.classList.contains('now') && /Replay/.test(x.innerText)); if (b) { b.click(); return b.innerText.replace(/\s+/g, ' '); } return ''; });
  check('the channel\'s day lists kept programmes', !!past, past);
  if (past) {
    const rp = await wait(() => window.__phonePlayer?.state()?.replay, 12000);
    const st = await ev(() => window.__phonePlayer?.state());
    check('a kept programme opens as a replay', rp, JSON.stringify(st));
    check('the replay plays its catch-up .m3u8', /\/timeshift\/demo\/demo\/\d+\/[\d-]+:[\d-]+\/\d+\.m3u8$/.test(st?.url || ''), st?.url || '');
    check('the replay plays (picture)', await wait(() => window.__phonePlayer.state()?.playing, 12000));
    await shot('player-replay');
    const corner = await text('.pv-corner');
    check('the replay\'s corner: Ends and time left', /Ends \d\d:\d\d/.test(corner), corner.replace(/\s+/g, ' '));
    await p.setViewportSize({ width: 852, height: 393 });
    await p.waitForTimeout(800);
    check('landscape: the full-screen layout', await ev(() => document.querySelector('.pv')?.classList.contains('land')));
    await shot('player-landscape');
    await p.setViewportSize({ width: 393, height: 852 });
    await p.waitForTimeout(400);
    await ev(() => window.__phonePlayer.close());
    await p.waitForTimeout(800);
  }


  // ---------- Library and a title ----------
  await tap('[data-tab="lib"]');
  check('Library: posters 3 across', await wait(() => document.querySelectorAll('.lb-grid .poster[data-i]').length >= 3, 15000));
  await shot('library');
  await tap('.lb-grid .poster[data-i="0"]');
  check('a title page opens', await wait(() => window.__tunerTest.state().screen === 'detail' && !!document.querySelector('.dt-head [data-act="play"], .dt-head [data-act="infuse"]'), 12000));
  await wait(() => !!document.querySelector('.dt-head .what'), 8000);
  await p.waitForTimeout(1500);
  await shot('title');
  const what = await text('.dt-head .what');
  check('the copy line', what.length > 3, what.replace(/\s+/g, ' '));
  const playBtn = await p.$('.dt-head [data-act="play"]');
  if (playBtn) {
    await playBtn.tap();
    const opened = await wait(() => !!window.__phonePlayer?.state(), 12000);
    const st = await ev(() => window.__phonePlayer?.state());
    check('Play opens the player on a copy', opened, JSON.stringify(st));
    await wait(() => window.__phonePlayer?.state()?.playing || window.__phonePlayer?.state()?.err, 12000);
    await shot('player-vod');
    await ev(() => window.__phonePlayer?.close());
    await p.waitForTimeout(500);
  }
  await ev(() => window.__tunerTest.back());

  // ---------- Search ----------
  await tap('[data-tab="search"]');
  await p.fill('#sr-q', 'nba');
  check('Search finds channels', await wait(() => document.querySelectorAll('.sr-row[data-ch]').length > 0, 6000));
  await shot('search');

  // ---------- Account ----------
  await ev(() => window.__tunerTest.push('account'));
  await p.waitForTimeout(600);
  const acc = await text('[data-screen="account"]');
  check('Account: provider, connections, NBA, add-ons', /Active/.test(acc) && /Connections/.test(acc) && /Spoiler shield/.test(acc) && /Add-ons/.test(acc), acc.replace(/\s+/g, ' ').slice(0, 120));
  await tap('[data-act="check"]');
  const done = await wait(() => document.querySelectorAll('.chk .dotk').length >= 2 && !document.querySelector('.chk .spin') && /Checked/.test(document.querySelector('.chk')?.innerText || ''), 60000);
  const chk = await text('.chk');
  check('Check streams on this iPhone: live and replay answered', done, chk.replace(/\s+/g, ' '));
  check('Check streams: both play here (fake provider)', /Live · Live channels play here/.test(chk) && /Replays play here/.test(chk));
  await shot('account-check');

  check('no page errors', !errs.length, errs.slice(0, 5).join(' | '));
  fs.writeFileSync(`${out}/results.json`, JSON.stringify({ results, errs }, null, 1));
  const bad = results.filter((r) => !r.ok);
  console.log(`${results.length} checks, ${bad.length} failed`);
  await b.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
