// Drives the Google TV app inside the emulator on CI. Remote-control presses (D-pad, OK, Back) and typing
// are sent by tests/android-shots.js through adb when this script asks for them, and it screenshots each step.
window.TUNER_TEST = true;
(function () {
  const API = window.TEST_API || 'http://10.0.2.2:8899';
  const report = (step, data) => fetch(`${API}/_report`, { method: 'POST', body: JSON.stringify({ step, data }) }).catch(() => {});
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const state = () => window.__tunerTest?.state();
  const until = async (fn, ms = 20000) => { for (let t = 0; t < ms && !fn(); t += 250) await wait(250); return !!fn(); };
  // Each step waits until android-shots.js says it has pressed the keys and taken the screenshot.
  const acked = async (name) => {
    for (let t = 0; t < 60000; t += 500) {
      try { if ((await (await fetch(`${API}/_reports`)).json()).some((r) => r.step === 'ack' && r.data?.name === name)) return; } catch {}
      await wait(500);
    }
  };
  const step = async (data, after) => { report(data.keys ? 'keys' : 'shot', { ...data, state: state() }); await acked(data.name); if (after) await wait(after); report('after', { name: data.name, state: state() }); };
  const shot = (name) => step({ name });
  const press = (keys, name, after = 0) => step({ keys, name }, after);
  const type = (text, name) => step({ keys: [], text, name });
  window.addEventListener('error', (e) => report('error', String(e.message)));

  window.addEventListener('load', async () => {
    try {
      localStorage.setItem('tuner.nbaBase', JSON.stringify(`${API}/espn`));
      await until(() => $('#xtServer') && !$('#login').hidden);
      await wait(1500);
      report('boot', { tv: document.documentElement.classList.contains('tv'), bridge: !!window.tuner, ua: navigator.userAgent, size: `${innerWidth}x${innerHeight}@${devicePixelRatio}`, font: getComputedStyle(document.documentElement).fontSize, state: state() });

      // Sign in: the keyboard must stay down while moving over the boxes, and come up on OK.
      $('#xtServer').focus();
      await press(['DPAD_DOWN', 'DPAD_UP'], 'login-move-no-keyboard');
      await press(['DPAD_CENTER'], 'login-ok-keyboard');
      await press(['BACK'], 'login-keyboard-closed');
      $('#xtServer').value = `${API}/get.php?username=demo&password=demo`;
      $('#xtServer').dispatchEvent(new Event('change'));
      $('#xtForm').requestSubmit();

      // Home
      await until(() => $('#homeRows .hcard'), 30000);
      await wait(2500);
      report('login', { tv: document.documentElement.classList.contains('tv'), bridge: !!window.tuner, rows: [...document.querySelectorAll('.hrow h3')].map((h) => h.textContent) });
      await shot('home');
      await press(['DPAD_DOWN', 'DPAD_RIGHT'], 'home-move');
      await press(['DPAD_LEFT', 'DPAD_LEFT', 'DPAD_LEFT'], 'menu-open');

      // Guide: Live in the menu, OK, then move through the channels
      await press(['DPAD_DOWN', 'DPAD_CENTER'], 'guide');
      await press(['DPAD_DOWN', 'DPAD_DOWN', 'DPAD_UP'], 'guide-preview');
      await press(['DPAD_DOWN'], 'guide-not-a-game');

      // Search: moving onto it keeps the keyboard down; OK brings it up; typing filters
      await press(['DPAD_LEFT', 'DPAD_UP'], 'search-focus-no-keyboard');
      await press(['DPAD_CENTER'], 'search-ok-keyboard');
      await type('NBA', 'search-typed');
      await press(['BACK'], 'search-results');
      $('#liveQ').value = '';
      $('#liveQ').dispatchEvent(new Event('input', { bubbles: true }));
      await wait(800);

      // Watch the NBA channel in the native player: OK opens the score and box score at the side, left/right
      // switch team, OK closes it; left/right then open the options; zap down, the channel list, back up; Back
      $('#liveInner .ch').focus();
      await press(['DPAD_CENTER'], 'player');
      await press(['DPAD_CENTER'], 'player-stats', 3000);
      await press(['DPAD_RIGHT'], 'player-stats-other-team');
      await press(['DPAD_CENTER'], 'player-stats-closed');
      await press(['DPAD_RIGHT'], 'player-options');
      await press(['BACK'], 'player-options-closed');
      await press(['DPAD_DOWN'], 'player-zap');
      // Off a game, OK brings up the channel list over the picture
      await press(['DPAD_CENTER'], 'player-channels');
      await press(['BACK'], 'player-channels-closed');
      await press(['DPAD_UP'], 'player-back-to-nba');
      await press(['BACK'], 'back-in-app');

      window.__tunerTest.go('nba');
      await until(() => $('.gcard'));
      await wait(1500);
      ($('.gcard.on') || $('.gcard')).focus();
      await shot('nba');
      // Picking a team's box score keeps focus on that tab, so the other team is one press away
      await until(() => $('#nbaDetail [data-ntab="home"]'));
      $('#nbaDetail [data-ntab="home"]').focus();
      await press(['DPAD_CENTER'], 'nba-home-tab');
      report('nba-tab-focus', { focus: document.activeElement?.dataset?.ntab || document.activeElement?.className || '' });
      await press(['DPAD_LEFT', 'DPAD_CENTER'], 'nba-away-tab');
      report('nba-tab-focus', { focus: document.activeElement?.dataset?.ntab || document.activeElement?.className || '' });

      window.__tunerTest.go('movie');
      await until(() => $('#movieGrid .poster'), 30000);
      await wait(1500);
      // Sort & filter chips: OK opens the choices from the right, down + OK picks, focus comes back to the chip;
      // down from the chips goes into the grid, never the menu
      $('#movieFilters [data-chip="sort"]').focus();
      await press(['DPAD_CENTER'], 'movies-sort-sheet');
      await press(['DPAD_DOWN', 'DPAD_CENTER'], 'movies-sorted');
      report('chip-focus', { focus: document.activeElement?.dataset?.chip || document.activeElement?.className || '' });
      await press(['DPAD_RIGHT', 'DPAD_RIGHT', 'DPAD_CENTER'], 'movies-genre-sheet');
      await press(['DPAD_DOWN', 'DPAD_CENTER'], 'movies-genre-picked');
      await press(['DPAD_DOWN'], 'movies-down-into-grid');
      report('chip-down', { focus: document.activeElement?.className || '', inMenu: !!document.activeElement?.closest('.rail') });
      $('#movieFilters [data-chip="clear"]')?.click();
      await wait(800);
      $('#movieGrid .poster').focus();
      await press(['DPAD_RIGHT'], 'movies');
      await press(['DPAD_CENTER'], 'detail');
      await press(['DPAD_CENTER'], 'vod');
      // Down opens the options: Subtitles (pick English), then Picture size (Zoom)
      await press(['DPAD_DOWN'], 'vod-options');
      await press(['DPAD_CENTER'], 'vod-subtitle-menu');
      await press(['DPAD_DOWN', 'DPAD_CENTER'], 'vod-subtitles-on', 2000);
      await press(['DPAD_DOWN', 'DPAD_DOWN', 'DPAD_CENTER'], 'vod-picture-menu');
      await press(['DPAD_DOWN', 'DPAD_CENTER'], 'vod-zoom');
      await press(['DPAD_RIGHT', 'DPAD_RIGHT'], 'vod-seek');
      await press(['BACK'], 'vod-closed');

      $('#sheet .close')?.click();
      await wait(500);
      window.__tunerTest.go('settings');
      await wait(1500);
      $('#settingsPage .srow')?.focus();
      await wait(600); // let the WebView repaint the focused row before the capture
      await shot('account');
      $('#settingsPage [data-set="team"]')?.focus();
      await press(['DPAD_CENTER'], 'account-team-sheet');
      await press(['BACK'], 'account-sheet-closed');
      report('done', state());
    } catch (e) {
      report('error', String((e && e.stack) || e));
      report('done', {});
    }
  });
})();
