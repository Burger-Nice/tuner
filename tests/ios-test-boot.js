// Drives the iPhone app through its main screens inside the simulator on CI.
// Only included in test builds (scripts/build-web.js with TUNER_TEST set).
window.TUNER_TEST = true;
(function () {
  const API = window.TEST_API || 'http://127.0.0.1:8899';
  const report = (step, data) => fetch(`${API}/_report`, { method: 'POST', body: JSON.stringify({ step, data }) }).catch(() => {});
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  // Ask CI for a screenshot, then give it time to take it.
  const shot = async (name) => { report('shot', { name, state: window.__tunerTest?.state() }); await wait(3500); };
  window.addEventListener('error', (e) => report('error', String(e.message)));
  try { localStorage.setItem('tuner.nbaBase', JSON.stringify(`${API}/espn`)); } catch {}

  window.addEventListener('load', async () => {
    try {
      await wait(2000);
      await shot('login');
      $('#xtServer').value = `${API}/get.php?username=demo&password=demo`;
      $('#xtServer').dispatchEvent(new Event('input'));
      $('#xtForm').requestSubmit();
      for (let i = 0; i < 60 && !$('#liveInner .ch'); i++) await wait(500);
      report('login', { channels: document.querySelectorAll('#liveInner .ch').length });

      window.__tunerTest.tune(0); // NBA 01: Memphis Grizzlies @ Golden State Warriors
      await wait(9000);
      await shot('live');
      $('#livePtabs [data-p="now"]').click();
      await wait(1500);
      await shot('now');
      $('#livePtabs [data-p="chans"]').click();

      window.__tunerTest.go('movie');
      for (let i = 0; i < 40 && !$('#movieGrid .poster'); i++) await wait(500);
      await wait(1500);
      await shot('movies');
      $('#movieGrid .poster[data-i="1"]').click();
      await wait(2000);
      await shot('detail');
      $('#sheet [data-act="play"]').click();
      await wait(8000);
      const v = $('#vodVideo');
      report('vod', { t: v.currentTime, w: v.videoWidth, err: !$('#vodMsg').hidden });
      await shot('vod');
      $('#vpBack').click();
      await wait(800);
      $('#sheet [data-act="close"]')?.click();

      window.__tunerTest.go('nba');
      for (let i = 0; i < 30 && !$('.gcard'); i++) await wait(500);
      await wait(1500);
      await shot('nba');
      $('.gcard').click();
      for (let i = 0; i < 30 && !$('#nbaDetail table.box'); i++) await wait(500);
      await wait(1000);
      await shot('game');

      window.__tunerTest.go('settings');
      await wait(1000);
      await shot('account');
      report('done', window.__tunerTest.state());
    } catch (e) {
      report('error', String(e && e.stack || e));
      report('done', {});
    }
  });
})();
