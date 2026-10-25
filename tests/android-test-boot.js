// Drives the Android TV app inside the emulator on CI. Remote-control presses (D-pad, OK, Back)
// are sent by tests/android-shots.js through adb when this script asks for them.
window.TUNER_TEST = true;
(function () {
  const API = window.TEST_API || 'http://10.0.2.2:8899';
  const report = (step, data) => fetch(`${API}/_report`, { method: 'POST', body: JSON.stringify({ step, data }) }).catch(() => {});
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const state = () => window.__tunerTest?.state();
  const shot = async (name) => { report('shot', { name, state: state() }); await wait(3000); };
  const press = async (keys, name, after = 4000) => { report('keys', { keys, name, state: state() }); await wait(keys.length * 1200 + after); };
  window.addEventListener('error', (e) => report('error', String(e.message)));

  window.addEventListener('load', async () => {
    try {
      localStorage.setItem('tuner.nbaBase', JSON.stringify(`${API}/espn`));
      await wait(2500);
      $('#xtServer').value = `${API}/get.php?username=demo&password=demo`;
      $('#xtServer').dispatchEvent(new Event('input'));
      $('#xtForm').requestSubmit();
      for (let i = 0; i < 60 && !$('#liveInner .ch'); i++) await wait(500);
      report('login', { channels: document.querySelectorAll('#liveInner .ch').length, tv: document.documentElement.classList.contains('tv') });
      await wait(1500);
      await shot('live');
      // Remote: move down the channel list, then OK to watch.
      $('#liveInner .ch').focus();
      await press(['DPAD_DOWN', 'DPAD_DOWN', 'DPAD_UP', 'DPAD_UP'], 'remote-list', 1500);
      await press(['DPAD_CENTER'], 'player', 9000);
      await press(['DPAD_DOWN'], 'player-zap', 6000);
      await press(['DPAD_UP'], 'player-back-to-nba', 6000);
      await press(['DPAD_CENTER'], 'player-ok-score', 2500);
      await press(['BACK'], 'back-in-app', 3000);
      report('after-player', state());

      window.__tunerTest.go('nba');
      for (let i = 0; i < 30 && !$('.gcard'); i++) await wait(500);
      await wait(1500);
      await shot('nba');
      $('.gcard').click();
      await wait(3000);
      await shot('game');

      window.__tunerTest.go('movie');
      for (let i = 0; i < 40 && !$('#movieGrid .poster'); i++) await wait(500);
      await wait(1500);
      await shot('movies');
      $('#movieGrid .poster[data-i="1"]').click();
      await wait(2500);
      await shot('detail');
      $('#sheet [data-act="play"]').focus();
      await press(['DPAD_CENTER'], 'vod', 8000);
      await press(['DPAD_RIGHT', 'DPAD_RIGHT'], 'vod-seek', 2000);
      await press(['BACK'], 'vod-closed', 3000);
      report('vod-progress', JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.endsWith(':progress')) || '') || '{}'));

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
