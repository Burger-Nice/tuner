// Drives the iPhone app (app/phone.html, design/ui-v1/phone-v1) through its main screens inside the simulator on CI:
// sign in, Home, Live and a channel in the player (HLS in WKWebView's own player), the NBA hub and a game page, the NBA
// tab's sections (a team page, Leaders, the player sheet, Team stats, Standings: inside the screen's width), a
// replay from a kept channel's day (the catch-up .m3u8), Account and Check streams on this iPhone.
// Only included in test builds (scripts/build-web.js with TUNER_TEST set). Each check is reported as
// { step: 'check', data: { name, ok, detail } }; CI fails the run when one fails or the test doesn't finish.
window.TUNER_TEST = true;
(function () {
  const API = window.TEST_API || 'http://127.0.0.1:8899';
  const report = (step, data) => fetch(`${API}/_report`, { method: 'POST', body: JSON.stringify({ step, data }) }).catch(() => {});
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const T = () => window.__tunerTest;
  // a screenshot: CI's ios-shots.js takes it and answers shot-done; wait for that (a slow capture once made every
  // later picture the last screen)
  let shots = 0;
  const shot = async (name) => {
    const n = `${++shots}-${name}`;
    report('shot', { name: n, state: T()?.state() });
    const t = Date.now();
    while (Date.now() - t < 25000) { try { const r = await (await fetch(`${API}/_reports`)).json(); if (r.some((x) => x.step === 'shot-done' && x.data?.name === n)) break; } catch {} await wait(500); }
    await wait(300);
  };
  const check = (name, ok, detail = '') => report('check', { name, ok: !!ok, detail: String(detail).slice(0, 300) });
  const until = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (f()) return true; } catch { /* not yet */ } await wait(400); } return false; };
  const player = () => window.__phonePlayer?.state() || null;
  // every element inside the phone's width: it may only reach past it inside a box that scrolls or clips sideways and
  // is itself inside the screen (WebKit sized the Library grid by its titles' one-line width once)
  const overflow = (sel) => {
    const root = document.querySelector(sel), W = innerWidth, bad = [];
    if (!root) return { n: 1, bad: ['no ' + sel] };
    const inside = (r) => r.right <= W + 0.5 && r.left >= -0.5;
    // clipped by a box (scrolling or overflow hidden) that is inside the screen
    const clipped = (e) => { for (let a = e.parentElement; a && a !== root; a = a.parentElement) { if (getComputedStyle(a).overflowX !== 'visible' && inside(a.getBoundingClientRect())) return true; } return false; };
    for (const e of root.querySelectorAll('*')) {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height || inside(r) || clipped(e)) continue;
      bad.push(`${e.tagName.toLowerCase()}.${String(e.className && e.className.baseVal != null ? e.className.baseVal : e.className).split(' ')[0]} ${Math.round(r.left)}..${Math.round(r.right)}`);
    }
    return { n: bad.length, bad: bad.slice(0, 4) };
  };
  window.addEventListener('error', (e) => report('error', String(e.message)));
  window.addEventListener('unhandledrejection', (e) => report('error', String(e.reason?.stack || e.reason)));
  try { for (const [k, v] of Object.entries({ nbaBase: `${API}/espn`, nbaWebBase: `${API}/espnweb`, nbaContentBase: `${API}/espncontent`, cinemetaBase: `${API}/addon/cinemeta`, stremioApi: `${API}/stremio-api`, stremioLink: `${API}/stremio-link`, ratingsUrl: `${API}/ratings.json`, tmdbBase: `${API}/tmdb/3`, tmdbImg: `${API}/tmdb-img` })) localStorage.setItem(`tuner.${k}`, JSON.stringify(v)); } catch {}
  const PHASE = 'tuner.iosTestPhase';

  // phase 1: sign in, then the fake Stremio account's add-ons and a TMDB key (as Account would set them), and reload
  window.addEventListener('load', async () => {
    try {
      await until(() => T(), 10000);
      await wait(1500);
      if (sessionStorage.getItem(PHASE) === '2') return phase2();
      check('opens on sign in', T().state().screen === 'signin', JSON.stringify(T().state()));
      await shot('signin');
      $('#siServer').value = API.replace(/^https?:\/\//, '');
      $('#siUser').value = 'demo';
      $('#siPass').value = 'demo';
      $('#siGo').click();
      check('sign in reaches the team step', await until(() => $('[data-act="done"]'), 20000), $('.si-err')?.textContent || '');
      await shot('signin-team');
      const acc = JSON.parse(localStorage.getItem('tuner.accounts') || '[]')[0];
      const pre = `tuner.a:${acc.id}:`;
      try {
        const r = await fetch(`${API}/stremio-api/api/addonCollectionGet`, { method: 'POST', body: JSON.stringify({ authKey: 'AK-test-1' }) }).then((x) => x.json());
        const hash = (x) => { let h = 2166136261; for (let i = 0; i < x.length; i++) h = Math.imul(h ^ x.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
        const ok = r.result.addons.filter((x) => /\/addon\/(cinemeta|northlight|kestrel)/.test(x.transportUrl));
        localStorage.setItem(pre + 'addons', JSON.stringify(ok.map((x) => ({ key: 'ad' + hash(x.transportUrl), url: x.transportUrl, manifest: x.manifest, at: Date.now(), on: true, catalogs: Object.fromEntries((x.manifest.catalogs || []).filter((c) => !(c.extra || []).some((e) => e.isRequired && e.name !== 'genre')).map((c) => [`${c.type}:${c.id}`, true])), from: 'stremio', kind: {}, health: {} }))));
        localStorage.setItem(pre + 'stremio', JSON.stringify({ authKey: 'AK-test-1', at: Date.now(), keep: true, syncedAt: Date.now() }));
        localStorage.setItem('tuner.tmdbKey', JSON.stringify('test-tmdb-token'));
        check('the fake add-ons are set', ok.length > 0, ok.length);
      } catch (e) { check('the fake add-ons are set', false, e.message); }
      sessionStorage.setItem(PHASE, '2');
      location.reload();
    } catch (e) {
      report('error', String(e && e.stack || e));
      report('done', {});
    }
  });
  async function phase2() {
    try {
      sessionStorage.removeItem(PHASE);
      shots = 2;
      await wait(4000);
      check('Home', T().state().screen === 'home' && !!$('.hm-card'), $('.hm-card')?.innerText.replace(/\s+/g, ' ').slice(0, 120));
      await shot('home');
      await until(() => /Trending/.test(document.querySelector('.row .sec-h')?.innerText || ''), 25000);
      document.querySelector('[data-screen="home"]').scrollTo({ top: 640 });
      await wait(1500);
      check('Home: rows with TMDB\'s (Trending first)', /Trending/.test(document.querySelector('.row .sec-h')?.innerText || ''), document.querySelector('.row .sec-h')?.innerText);
      await shot('home-rows');
      document.querySelector('[data-screen="home"]').scrollTo({ top: 0 });

      T().go('live');
      check('Live: channel rows', await until(() => document.querySelectorAll('.lv-ch[data-i]').length > 3, 20000));
      await wait(3000);
      await shot('live');
      $('.lv-ch[data-i="0"]').click();
      check('the player opens on a channel', await until(() => player(), 10000));
      const live = await until(() => player()?.playing || player()?.err, 25000);
      check('live HLS plays in the iPhone player', live && player()?.playing, JSON.stringify(player()));
      await wait(2000);
      await shot('player-live');
      window.__phonePlayer?.close();
      await wait(1000);

      T().go('nba');
      check('NBA: the hero or the day\'s cards', await until(() => document.querySelectorAll('.nb-hero, .gcard').length > 0, 20000));
      await wait(1500);
      await shot('nba');
      const gid = $('.nb-hero')?.dataset.g || $('.gcard[data-g]')?.dataset.g;
      if (gid) {
        T().push('game', { id: gid });
        check('a game page', await until(() => T().state().screen === 'game' && $('[data-screen="game"]').innerText.length > 20, 10000));
        await wait(2500);
        await shot('game');
      }

      // the NBA tab in depth (the TV's sections), in WebKit's own layout: every element inside the screen's width
      if (T().state().screen === 'game') T().back();
      T().go('nba');
      await wait(1000);
      const secs = [...document.querySelectorAll('[data-screen="nba"] [data-sec]')].map((c) => c.textContent.trim());
      check('NBA: the sections Games · team · Standings · Leaders · Team stats · News', secs.length === 6 && secs[0] === 'Games' && secs.slice(2).join() === 'Standings,Leaders,Team stats,News', secs.join(' · '));
      const fits = (name, sel = '#ph-screens > section:not([hidden])') => { const o = overflow(sel); check(`${name}: inside the screen's width`, o.n === 0 && document.documentElement.scrollWidth <= innerWidth, o.n ? o.bad.join(' | ') : `${innerWidth} wide`); };
      document.querySelector('[data-screen="nba"] [data-sec="team"]').click();
      check('NBA: your team\'s page (schedule, roster)', await until(() => $('.tp-head') && document.querySelectorAll('.tp-sched .tp-gt[data-g]').length > 3 && document.querySelectorAll('.tp-ro tr[data-pl]').length > 3, 20000), $('.tp-head')?.innerText.replace(/\s+/g, ' ').slice(0, 100));
      await wait(1500);
      fits('NBA team page');
      await shot('nba-team');
      document.querySelector('[data-screen="nba"] [data-sec="leaders"]').click();
      check('NBA: Leaders (the leader\'s card and rows)', await until(() => $('.ld-card') && document.querySelectorAll('.ld-row').length >= 3, 15000), `${document.querySelectorAll('.ld-row').length} rows`);
      await wait(1000);
      fits('NBA Leaders');
      const lc = $('.ld-card')?.getBoundingClientRect();
      check('NBA Leaders: the card inside the screen', lc && lc.left >= 0 && lc.right <= innerWidth, lc ? `${Math.round(lc.left)}..${Math.round(lc.right)} of ${innerWidth}` : '');
      await shot('nba-leaders');
      $('.ld-card').click();
      check('NBA: the player sheet', await until(() => /last games/i.test($('.pl-b')?.innerText || ''), 10000), ($('.pl-b')?.innerText || 'no sheet').replace(/\s+/g, ' ').slice(0, 120));
      await wait(1200);
      fits('NBA player sheet', '#ph-sheets');
      await shot('nba-player');
      document.querySelector('#ph-sheets .sh-ov:last-child .scrim')?.click();
      await wait(600);
      document.querySelector('[data-screen="nba"] [data-sec="teamstats"]').click();
      check('NBA: Team stats (30 teams)', await until(() => document.querySelectorAll('.ts-row[data-team]').length === 30, 15000));
      fits('NBA Team stats');
      document.querySelector('[data-screen="nba"] [data-sec="standings"]').click();
      await until(() => document.querySelectorAll('.box-t.st tr[data-team]').length > 10, 15000);
      fits('NBA Standings');
      T().push('team', { abbr: 'SAC' });
      check('NBA: another team\'s page (pushed)', await until(() => T().state().screen === 'team' && $('[data-screen="team"] .tp-head') && document.querySelectorAll('[data-screen="team"] .tp-ro tr[data-pl]').length > 3, 20000));
      await wait(1500);
      fits('NBA pushed team page');
      await shot('nba-team-pushed');
      T().back();
      document.querySelector('[data-screen="nba"] [data-sec="games"]')?.click();

      // a replay of a kept programme: the catch-up .m3u8 in the iPhone player
      T().push('day', { id: '1001' });
      await until(() => document.querySelectorAll('.lv-day .p').length > 0, 15000);
      const past = [...document.querySelectorAll('.lv-day .p')].find((x) => !x.classList.contains('gone') && !x.classList.contains('now') && /Replay/.test(x.innerText));
      check('the channel\'s day lists kept programmes', !!past);
      if (past) {
        past.click();
        check('a kept programme opens as a replay', await until(() => player()?.replay, 15000), JSON.stringify(player()));
        const ok = await until(() => player()?.playing || player()?.err, 25000);
        check('the replay\'s catch-up HLS plays in the iPhone player', ok && player()?.playing && /\.m3u8$/.test(player()?.url || ''), JSON.stringify(player()));
        await wait(2000);
        await shot('player-replay');
        window.__phonePlayer?.close();
        await wait(1000);
      }

      T().go('lib');
      check('Library: posters', await until(() => document.querySelectorAll('.lb-grid .poster[data-i]').length >= 6, 15000));
      await wait(2000);
      const g = [...document.querySelectorAll('.lb-grid .poster[data-i]')].slice(0, 6).map((p) => p.getBoundingClientRect());
      check('Library: an even grid, 3 across, inside the screen', g.length === 6 && Math.abs(g[0].width - g[1].width) < 1 && Math.abs(g[0].top - g[2].top) < 1 && g[3].top > g[0].bottom && g[2].right <= innerWidth, JSON.stringify(g.map((r) => [Math.round(r.left), Math.round(r.top), Math.round(r.width)])));
      // (the owner's phone: long one-line titles widened the whole grid past the screen in WebKit, worse as pages came)
      const cap = document.querySelector('.lb-grid .poster[data-i="1"] .cap');
      if (cap?.firstChild) cap.firstChild.textContent = 'The Lord of the Rings: The Fellowship of the Ring (Extended Edition)';
      await wait(300);
      const gw = document.querySelector('.lb-grid').getBoundingClientRect(), g2 = [...document.querySelectorAll('.lb-grid .poster[data-i]')].slice(0, 3).map((p) => p.getBoundingClientRect());
      check('Library: a very long title keeps the grid inside the screen, 3 even columns', gw.right <= innerWidth + 0.5 && Math.abs(g2[0].width - g2[1].width) < 1 && g2[2].right <= innerWidth, JSON.stringify({ grid: [Math.round(gw.left), Math.round(gw.width)], cols: g2.map((r) => [Math.round(r.left), Math.round(r.width)]), w: innerWidth }));
      await shot('library');
      document.querySelector('.lb-grid .poster[data-i="0"]').click();
      await until(() => T().state().screen === 'detail' && document.querySelector('.dt-head .what'), 15000);
      await wait(5000);
      check('a title page: copy line, credits or More like this', !!document.querySelector('.dt-head .what') && !!document.querySelector('.credits, .dt-more-h'), document.querySelector('.dt-head .what')?.innerText);
      await shot('title');
      document.querySelector('[data-screen="detail"]').scrollTo({ top: 600 });
      await wait(800);
      await shot('title-more');
      T().back();

      // the player in WebKit: the film's own subtitle track (movie.mp4 carries an English one) drawn inside the
      // picture, not off it (the owner's iPhone: bottom right, off screen); then Options > Copies switches in place
      try {
        const C = await import('./tv/js/catalog.js');
        await C.ensure('movie');
        T().push('detail', { title: C.catalog.movie.titles.find((x) => x.name === 'The Long Night') });
        await until(() => $('.dt-head [data-act="play"]') && /Kestrel|plays here/.test($('.dt-head')?.innerText || ''), 20000);
        await wait(2500);
        $('.dt-head [data-act="play"]').click();
        const vp = await until(() => player()?.playing, 25000);
        check('a film plays in the iPhone player', vp, JSON.stringify(player()));
        const v = $('#ph-player video');
        const kinds = (t) => t.kind === 'subtitles' || t.kind === 'captions';
        const inband = await until(() => [...v.textTracks].some(kinds), 8000);
        if (!inband) { const tr = v.addTextTrack('subtitles', 'English', 'en'); tr.addCue(new VTTCue(0, 3600, 'A subtitle line for the test')); }
        window.__phonePlayer.subs();
        await wait(600);
        [...document.querySelectorAll('#ph-sheets .sh-ov:last-child .lr')].find((x) => /English|eng|Subtitles/i.test(x.innerText) && !/off|size/i.test(x.innerText))?.click();
        const shown = await until(() => $('.pv-subs:not([hidden]) span'), 12000);
        await wait(500);
        const vr = v.getBoundingClientRect(), s = Math.min(vr.width / v.videoWidth, vr.height / v.videoHeight);
        const pic = { l: vr.left + (vr.width - v.videoWidth * s) / 2, t: vr.top + (vr.height - v.videoHeight * s) / 2 };
        pic.r = pic.l + v.videoWidth * s; pic.b = pic.t + v.videoHeight * s;
        const sp = $('.pv-subs:not([hidden]) span')?.getBoundingClientRect();
        const ok = sp && sp.left >= pic.l - 0.5 && sp.right <= pic.r + 0.5 && sp.top >= pic.t - 0.5 && sp.bottom <= pic.b + 0.5 && sp.left >= 0 && sp.right <= innerWidth && sp.top >= 0 && sp.bottom <= innerHeight;
        const modes = [...v.textTracks].filter(kinds).map((t) => t.mode).join();
        check('subtitles: the cue inside the video\'s picture and the window', shown && ok, JSON.stringify({ inband, sp: sp && [sp.left, sp.top, sp.right, sp.bottom].map(Math.round), pic: [pic.l, pic.t, pic.r, pic.b].map(Math.round), video: [vr.left, vr.top, vr.right, vr.bottom].map(Math.round), win: [innerWidth, innerHeight], text: $('.pv-subs')?.textContent, modes }));
        check('subtitles: WebKit\'s own drawing is off inline (the track hidden, its cues ours)', !/showing/.test(modes), modes);
        await shot('player-subs');
        window.__phonePlayer.copies();
        await wait(800);
        const rows = [...document.querySelectorAll('#ph-sheets .sh-ov:last-child .lr')].map((x) => x.innerText.replace(/\s+/g, ' '));
        check('Copies opens from the player', rows.length >= 3 && rows.some((r) => /playing/.test(r)) && rows.some((r) => /plays here/.test(r)), rows.join(' | '));
        await shot('player-copies');
        const before = player();
        [...document.querySelectorAll('#ph-sheets .sh-ov:last-child .lr')].find((x) => /plays here/.test(x.innerText))?.click();
        const sw = await until(() => { const st = player(); return st && st.copy !== before.copy && st.playing && st.t > 1; }, 25000);
        const after = player();
        check('switching copies plays the other one from about the same time', sw && after.t > before.t - 9 && after.t < before.t + 4, `${before.copy} ${before.t.toFixed(1)} s -> ${after?.copy} ${after?.t.toFixed(1)} s`);
        await shot('player-switched');
        window.__phonePlayer?.close();
        await wait(800);
        T().back();
      } catch (e) { check('the player\'s subtitles and copies', false, String(e && e.stack || e)); }
      T().go('search');
      await wait(800);
      const q = $('#sr-q');
      if (q) { q.value = 'nba'; q.dispatchEvent(new Event('input')); }
      check('Search finds channels', await until(() => document.querySelectorAll('.sr-row[data-ch]').length > 0, 8000));
      await shot('search');

      T().push('account');
      await wait(1000);
      $('[data-act="check"]')?.click();
      const done = await until(() => /Checked/.test($('.chk')?.innerText || '') && !$('.chk .spin'), 90000);
      const txt = $('.chk')?.innerText.replace(/\s+/g, ' ') || '';
      check('Check streams on this iPhone answered', done, txt);
      check('Check streams: live and replays play on this iPhone', /Live channels play here/.test(txt) && /Replays play here/.test(txt), txt);
      await shot('account-check');
      report('done', T().state());
    } catch (e) {
      report('error', String(e && e.stack || e));
      report('done', {});
    }
  }
})();
