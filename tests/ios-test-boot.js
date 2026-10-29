// Drives the iPhone app (app/phone.html, design/ui-v1/phone-v1) through its main screens inside the simulator on CI:
// sign in, Home, Live and a channel in the player (HLS in WKWebView's own player), the NBA hub and a game page, a
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
  const shot = async (name) => { report('shot', { name, state: T()?.state() }); await wait(3500); };
  const check = (name, ok, detail = '') => report('check', { name, ok: !!ok, detail: String(detail).slice(0, 300) });
  const until = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (f()) return true; } catch { /* not yet */ } await wait(400); } return false; };
  const player = () => window.__phonePlayer?.state() || null;
  window.addEventListener('error', (e) => report('error', String(e.message)));
  window.addEventListener('unhandledrejection', (e) => report('error', String(e.reason?.stack || e.reason)));
  try { for (const [k, v] of Object.entries({ nbaBase: `${API}/espn`, nbaWebBase: `${API}/espnweb`, nbaContentBase: `${API}/espncontent` })) localStorage.setItem(`tuner.${k}`, JSON.stringify(v)); } catch {}

  window.addEventListener('load', async () => {
    try {
      await until(() => T(), 10000);
      await wait(1500);
      check('opens on sign in', T().state().screen === 'signin', JSON.stringify(T().state()));
      await shot('signin');
      $('#siServer').value = API.replace(/^https?:\/\//, '');
      $('#siUser').value = 'demo';
      $('#siPass').value = 'demo';
      $('#siGo').click();
      check('sign in reaches the team step', await until(() => $('[data-act="done"]'), 20000), $('.si-err')?.textContent || '');
      await shot('signin-team');
      $('[data-act="done"]')?.click();
      await wait(4000);
      check('Home', T().state().screen === 'home' && !!$('.hm-card'), $('.hm-card')?.innerText.replace(/\s+/g, ' ').slice(0, 120));
      await shot('home');

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
      await wait(3000);
      await shot('library');
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
  });
})();
