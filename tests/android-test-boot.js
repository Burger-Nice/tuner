// Drives the Google TV app (the airglow TV interface, app/tv/) inside the emulator on CI. Remote presses (D-pad, OK,
// Back) are sent by tests/android-shots.js through adb when this script asks for them, and it screenshots each step.
window.TUNER_TEST = true;
(function () {
  const API = window.TEST_API || 'http://10.0.2.2:8899';
  const report = (step, data) => fetch(`${API}/_report`, { method: 'POST', body: JSON.stringify({ step, data }) }).catch(() => {});
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const state = () => window.__tunerTest?.state();
  const until = async (fn, ms = 20000) => { for (let t = 0; t < ms && !fn(); t += 250) await wait(250); return !!fn(); };
  const acked = async (name) => {
    for (let t = 0; t < 60000; t += 500) {
      try { if ((await (await fetch(`${API}/_reports`)).json()).some((r) => r.step === 'ack' && r.data?.name === name)) return; } catch {}
      await wait(500);
    }
  };
  const step = async (data, after) => { report(data.keys ? 'keys' : 'shot', { ...data, state: state() }); await acked(data.name); if (after) await wait(after); report('after', { name: data.name, state: state() }); };
  const shot = (name) => step({ name });
  const press = (keys, name, after = 0) => step({ keys, name }, after);
  const focused = () => { const a = document.activeElement; return a ? `${a.className} ${Object.entries(a.dataset || {}).map(([k, v]) => `${k}=${v}`).join(' ')}`.trim() : ''; };
  const check = (name, ok, data) => report('check', { name, ok: !!ok, focus: focused(), ...data });
  window.addEventListener('error', (e) => report('error', String(e.message)));
  window.addEventListener('unhandledrejection', (e) => report('error', String(e.reason?.stack || e.reason)));

  window.addEventListener('load', async () => {
    try {
      localStorage.setItem('tuner.nbaBase', JSON.stringify(`${API}/espn`));
      await until(() => $('[data-act="type"]'), 30000);
      await until(() => !$('#app').classList.contains('l-on'), 15000);   // the launch animation has finished
      await wait(800);
      const t0 = performance.now();
      report('boot', { bridge: !!window.Capacitor?.isNativePlatform?.(), ua: navigator.userAgent, size: `${innerWidth}x${innerHeight}@${devicePixelRatio}`, modules: typeof window.__tunerTest, state: state() });
      await shot('welcome');

      // Sign in: the keyboard comes up only on OK, Back puts it away again.
      await press(['DPAD_CENTER'], 'type-it-here');
      check('server field focused', document.activeElement?.id === 'fServer');
      await press(['DPAD_DOWN', 'DPAD_UP'], 'fields-move-no-keyboard');
      await press(['DPAD_CENTER'], 'field-ok-keyboard');
      await press(['BACK'], 'field-keyboard-closed');
      $('#fServer').value = `${API}/get.php?username=demo&password=demo`;
      $('#fServer').dispatchEvent(new Event('focusout', { bubbles: true }));
      $('#fServer').readOnly = false; $('#fServer').blur();
      $('[data-act="signin"]').focus();
      await press(['DPAD_CENTER'], 'signing-in', 3000);
      await until(() => $('[data-act="done"]') || state()?.screen === 'home', 30000);
      await shot('three-choices');
      await press(['DPAD_CENTER'], 'home', 2500);
      check('home after sign-in', state()?.screen === 'home', { took: Math.round(performance.now() - t0) });
      check('hero primary focused', document.activeElement?.dataset?.act === 'primary' || document.activeElement?.dataset?.act === 'resume' || document.activeElement?.dataset?.act === 'tune');

      // Home: down to the rail, along it, up to the bar
      await press(['DPAD_DOWN'], 'home-rail');
      check('rail card focused', document.activeElement?.classList.contains('hc'));
      await press(['DPAD_RIGHT', 'DPAD_RIGHT'], 'home-rail-right');
      await press(['DPAD_UP', 'DPAD_UP'], 'home-bar');
      check('top bar focused', document.activeElement?.classList.contains('tab'));

      // Live: one Right on the bar switches tab (the remote stays on the bar), Down goes into the guide
      await press(['DPAD_RIGHT'], 'live-tab', 1200);
      check('live tab, bar keeps focus', state()?.screen === 'live' && document.activeElement?.classList.contains('tab'));
      await press(['DPAD_DOWN'], 'guide');
      check('guide cell focused', document.activeElement?.classList.contains('g-cell'));
      await press(['DPAD_DOWN', 'DPAD_DOWN', 'DPAD_RIGHT'], 'guide-moved');
      await press(['DPAD_UP', 'DPAD_UP', 'DPAD_UP'], 'guide-group-chip');
      await press(['DPAD_CENTER'], 'guide-groups');
      await press(['BACK'], 'guide-groups-closed');
      document.querySelector('.g-row .g-ch')?.focus();   // OK on the channel tunes what's on
      await press(['DPAD_CENTER'], 'player', 3000);
      check('native player up', state()?.watching);
      // The player's own panels: OK the channel list, ◀ from it the groups (asked of the app), ◀ Options, ▶ the game or what's on
      await press(['DPAD_CENTER'], 'player-channels', 800);
      await press(['DPAD_DOWN', 'DPAD_DOWN'], 'player-channels-move');
      await press(['DPAD_LEFT'], 'player-groups', 800);
      await press(['BACK'], 'player-groups-back');
      await press(['BACK'], 'player-channels-closed');
      await press(['DPAD_LEFT'], 'player-options');
      await press(['BACK'], 'player-options-closed');
      await press(['DPAD_RIGHT'], 'player-right', 800);
      await press(['BACK'], 'player-right-closed');
      check('still in the player', state()?.watching);
      await press(['BACK'], 'player-closed', 1500);

      await press(['BACK'], 'back-to-tab');
      check('back focuses the tab', document.activeElement?.classList.contains('tab'));

      // NBA hub and a game page (each section starts from its tab, so one miss doesn't carry over)
      const tab = async (name) => { window.__tunerTest.go(name); await wait(1500); document.querySelector(`#topbar [data-tab="${name}"]`)?.focus(); };
      await tab('nba');
      await shot('nba');
      await press(['DPAD_DOWN'], 'nba-in');
      await press(['DPAD_RIGHT', 'DPAD_CENTER'], 'nba-game', 2000);
      check('game page', state()?.screen === 'game');
      await press(['DPAD_RIGHT'], 'nba-game-other-team');
      await press(['DPAD_RIGHT'], 'nba-game-plays');
      await press(['BACK'], 'nba-game-closed');

      // Movies: grid, scroll, detail, play
      await tab('movie');
      await wait(1500);
      await shot('movies');
      await press(['DPAD_DOWN'], 'movies-in');
      check('poster focused', document.activeElement?.classList.contains('pc'));
      await press(['DPAD_DOWN', 'DPAD_DOWN'], 'movies-scrolled');
      await press(['DPAD_UP', 'DPAD_UP', 'DPAD_UP', 'DPAD_UP'], 'movies-header');
      await press(['DPAD_CENTER'], 'movies-sort');
      await press(['BACK'], 'movies-sort-closed');
      await press(['DPAD_DOWN', 'DPAD_DOWN', 'DPAD_CENTER'], 'detail', 1500);
      check('detail page', state()?.screen === 'detail');
      await press(['DPAD_CENTER'], 'vod', 3500);
      check('vod in the native player', state()?.watching);
      await press(['DPAD_DOWN'], 'vod-options');
      await press(['BACK'], 'vod-options-closed');
      await press(['DPAD_UP'], 'vod-buttons');
      await press(['DPAD_RIGHT', 'DPAD_RIGHT'], 'vod-buttons-moved');
      await press(['BACK'], 'vod-controls-hidden');
      await press(['DPAD_RIGHT'], 'vod-seek');
      await press(['BACK'], 'vod-controls-hidden-2');
      await press(['BACK'], 'vod-closed', 1500);
      await press(['BACK'], 'detail-closed');

      // Series detail with episodes
      await tab('series');
      await wait(1500);
      await shot('series');
      await press(['DPAD_DOWN', 'DPAD_CENTER'], 'series-detail', 2500);
      await press(['DPAD_DOWN', 'DPAD_DOWN', 'DPAD_RIGHT'], 'series-episodes');
      await press(['BACK'], 'series-closed');

      // Search with the on-screen keyboard: H, A gives suggestions
      await tab('search');
      await press(['DPAD_DOWN'], 'search-keyboard', 800);
      await press(['DPAD_RIGHT', 'DPAD_DOWN', 'DPAD_CENTER'], 'search-h');
      await press(['DPAD_UP', 'DPAD_LEFT', 'DPAD_CENTER'], 'search-ha');

      // Account
      window.__tunerTest.go('account');
      await wait(1000);
      await shot('account');
      await press(['DPAD_LEFT', 'DPAD_DOWN', 'DPAD_DOWN'], 'account-nba');
      await press(['DPAD_RIGHT', 'DPAD_DOWN', 'DPAD_CENTER'], 'account-shield');
      await press(['DPAD_DOWN', 'DPAD_CENTER'], 'account-shield-on');
      window.__tunerTest.go('home');
      await wait(1500);
      await shot('home-shielded');
      report('done', state());
    } catch (e) {
      report('error', String((e && e.stack) || e));
      report('done', {});
    }
  });
})();
