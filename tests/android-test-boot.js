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
  const shot = async (name) => { report('shot', { name, state: state() }); await wait(3000); };
  const press = async (keys, name, after = 3000) => { report('keys', { keys, name, state: state() }); await wait(keys.length * 1200 + after); report('after', { name, state: state() }); };
  const type = async (text, name) => { report('keys', { keys: [], text, name, state: state() }); await wait(4000); report('after', { name, state: state() }); };
  window.addEventListener('error', (e) => report('error', String(e.message)));

  window.addEventListener('load', async () => {
    try {
      localStorage.setItem('tuner.nbaBase', JSON.stringify(`${API}/espn`));
      await until(() => $('#xtServer') && !$('#login').hidden);
      await wait(1500);
      report('boot', { tv: document.documentElement.classList.contains('tv'), bridge: !!window.tuner, state: state() });

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
      await press(['DPAD_DOWN', 'DPAD_CENTER'], 'guide', 3500);
      await press(['DPAD_DOWN', 'DPAD_DOWN', 'DPAD_UP'], 'guide-preview', 2500);

      // Search: moving onto it keeps the keyboard down; OK brings it up; typing filters
      await press(['DPAD_LEFT', 'DPAD_UP'], 'search-focus-no-keyboard');
      await press(['DPAD_CENTER'], 'search-ok-keyboard');
      await type('NBA', 'search-typed');
      await press(['BACK'], 'search-results');
      $('#liveQ').value = '';
      $('#liveQ').dispatchEvent(new Event('input', { bubbles: true }));
      await wait(800);

      // Watch in the native player: zap, OK for the info and score, Back
      ($('#liveInner .ch.on') || $('#liveInner .ch')).focus();
      await press(['DPAD_CENTER'], 'player', 9000);
      await press(['DPAD_DOWN'], 'player-zap', 6000);
      await press(['DPAD_UP'], 'player-back-to-nba', 6000);
      await press(['DPAD_CENTER'], 'player-ok-score', 2000);
      await press(['BACK'], 'back-in-app', 3000);

      window.__tunerTest.go('nba');
      await until(() => $('.gcard'));
      await wait(1500);
      ($('.gcard.on') || $('.gcard')).focus();
      await shot('nba');

      window.__tunerTest.go('movie');
      await until(() => $('#movieGrid .poster'), 30000);
      await wait(1500);
      $('#movieGrid .poster').focus();
      await press(['DPAD_RIGHT'], 'movies');
      await press(['DPAD_CENTER'], 'detail', 2500);
      await press(['DPAD_CENTER'], 'vod', 8000);
      await press(['DPAD_RIGHT', 'DPAD_RIGHT'], 'vod-seek', 2000);
      await press(['BACK'], 'vod-closed', 3000);

      window.__tunerTest.go('settings');
      await wait(1500);
      await shot('account');
      report('done', state());
    } catch (e) {
      report('error', String((e && e.stack) || e));
      report('done', {});
    }
  });
})();
