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
      localStorage.setItem('tuner.nbaBase', JSON.stringify(`${API}/espn`)); localStorage.setItem('tuner.nbaWebBase', JSON.stringify(`${API}/espnweb`)); localStorage.setItem('tuner.nbaContentBase', JSON.stringify(`${API}/espncontent`));
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
      // Sync score from the game panel's Sync tab: the clock list comes up
      window.__lastClocks = -1;
      await press(['DPAD_RIGHT', 'DPAD_RIGHT', 'DPAD_RIGHT'], 'player-sync-tab', 600);
      await press(['DPAD_CENTER'], 'player-sync', 4000);
      check('sync score lists the game clocks', window.__lastClocks > 0);
      await press(['BACK'], 'player-sync-closed');
      await press(['BACK'], 'player-right-closed');
      check('still in the player', state()?.watching);

      // Playback diagnosis (design/ui-v1/diagnosis): the debug intent shows each cause from made-up readings
      const diag = (cause, name, after = 600) => step({ keys: [], adb: ['am', 'broadcast', '-a', 'app.tuner.player.DIAG', '-p', 'app.tuner.player', '--es', 'diag', cause], name }, after);
      window.__diag = null;
      await diag('provider-slow', 'diag-provider-slow');
      check('diagnosis card: the provider is slow', window.__diag?.cause === 'provider-slow' && window.__diag?.surface === 'card', { diag: window.__diag });
      await diag('wifi', 'diag-wifi-weak');
      check('diagnosis card: weak Wi-Fi', window.__diag?.cause === 'wifi' && window.__diag?.surface === 'card', { diag: window.__diag });
      await diag('no-internet', 'diag-no-internet');
      await diag('wifi-gone', 'diag-wifi-too-weak');
      await diag('limit', 'diag-limit');
      await diag('checking', 'diag-checking');
      await diag('puck', 'diag-puck');
      await diag('fail-off', 'diag-fail-channel-off');
      check('failure card: the channel is off', window.__diag?.cause === 'off' && window.__diag?.surface === 'failed', { diag: window.__diag });
      await diag('decoder', 'diag-fail-decoder');
      await diag('options', 'diag-options-during-stall');   // ◀ with the card up: Options with Connection first and focused
      await press(['DPAD_CENTER'], 'diag-connection-panel', 800);
      check('Options > Connection opens the panel', window.__diag?.surface === 'panel', { diag: window.__diag });
      await press(['BACK'], 'diag-panel-back-to-options');
      await press(['BACK'], 'diag-options-closed');
      await diag('stutter', 'diag-stutter-chip');
      await diag('offline-chip', 'diag-offline-chip');
      await diag('clear', 'diag-cleared');
      // A real slow channel: the fake provider sends Channel 317 at 0.4 of real time, so the player's own checks run
      window.__diag = null;
      await press(['3', '1', '7'], 'diag-real-tune', 1000);
      await until(() => window.__diag?.surface === 'card' && window.__diag?.cause !== 'checking', 45000);
      await shot('diag-real-slow-channel');
      check('a slow channel gets a diagnosis card', window.__diag?.surface === 'card', { diag: window.__diag });
      await press(['LAST_CHANNEL'], 'diag-real-back', 2500);   // (back to the first channel: the tune clears the card)
      // Back closes the player (a failure card, if the slow channel got that far, takes one Back first)
      for (let k = 0; k < 3 && state()?.watching; k++) await press(['BACK'], k ? `player-closed-${k + 1}` : 'player-closed', 1500);

      await press(['BACK'], 'back-to-tab');
      check('back focuses the tab', document.activeElement?.classList.contains('tab'));

      // Catch-up (design/ui-v1/catchup): the native player's side. US: ESPN HD keeps 3 days at the fake provider and carries
      // LA Clippers at Los Angeles Lakers, live (ESPN's plays are moved to now), so: live Options and the game panel with
      // Watch from tip-off, live TV paused on the timeline, then the game's replay from tip-off on that channel (the
      // guide's own call for a past game, watchOnChannel), its timeline bar, a quarter skip, the game panel, Back to live.
      try {
        const mod = (m) => import(`./tv/js/${m}.js`);
        const [{ catalog }, G, RP, PL, GD] = await Promise.all([mod('catalog'), mod('games'), mod('replay'), mod('player'), mod('guide')]);
        const espn = catalog.live?.items.find((c) => c.archive > 0 && /ESPN/.test(c.name));
        check('catch-up: the native player speaks the replay protocol', PL.replayNative());
        await PL.playLive(espn, catalog.live.items, 'All channels');
        await until(() => state()?.watching && G.watch.gameId, 15000);
        await wait(3000);
        const g = G.gameById(G.watch.gameId) || G.gameById('401909851');
        await press(['DPAD_LEFT'], 'player-catchup-live-options', 800);   // a kept channel with a game: Watch from tip-off focused
        await press(['BACK'], 'player-catchup-live-options-closed');
        await press(['DPAD_RIGHT', 'DPAD_DOWN', 'DPAD_DOWN'], 'player-catchup-live-panel', 800);   // the game panel's From tip-off
        await press(['BACK'], 'player-catchup-live-panel-closed');
        await press(['MEDIA_PLAY_PAUSE'], 'player-catchup-live-paused', 1500);   // live TV paused, on the timeline
        await press(['DPAD_UP', 'DPAD_RIGHT', 'DPAD_RIGHT', 'DPAD_RIGHT', 'DPAD_RIGHT'], 'player-catchup-live-paused-buttons');
        await press(['DPAD_CENTER'], 'player-catchup-back-to-live', 1500);
        check('catch-up: still live after Back to live', state()?.watching && PL.ctx.cur?.kind === 'live');
        // the game's replay from tip-off on ESPN: the programme on at tip-off is the window (case 1 of 3.5)
        await G.fetchSummary(g.id);
        const tip = G.chaptersOf(g.id).list.find((c) => c.key === 'tip')?.at || g.date;
        const table = await GD.pastFor(espn, { urgent: true }).catch(() => []);
        const prog = table.find((x) => x.start <= tip && x.end > tip) || { start: Math.floor(tip / 3600e3) * 3600e3, end: Math.floor(tip / 3600e3) * 3600e3 + 3 * 3600e3, title: `NBA: ${g.away.name} at ${g.home.name}`, raw: '' };
        await RP.watchOnChannel(g, espn, prog);
        await until(() => PL.ctx.cur?.kind === 'replay' && window.__replayTest?.state()?.played > 0, 20000);
        const R = window.__replay?.R;
        check('catch-up: a game replay started in the native player', !!R && !window.__replay.standIn && PL.ctx.cur?.kind === 'replay' && window.__replayTest?.state()?.played > 0,
          { kind: R?.kind, tipoffAt: R?.tipoffAt, chapters: (R?.chapters || []).map((c) => `${c.key}@${Math.round(c.at / 1000)}s`).join(' '), link: R?.sources?.[R.source]?.links?.[0]?.url, played: window.__replayTest?.state()?.played });
        await press(['DPAD_CENTER'], 'player-replay-timeline', 1500);   // OK pauses: the bar stays up (the archive's clip is 30 s long)
        await press(['DPAD_UP', 'DPAD_RIGHT', 'DPAD_RIGHT', 'DPAD_RIGHT', 'DPAD_RIGHT'], 'player-replay-skip-focused');
        const q2 = (R?.chapters || []).find((c) => c.key === 'q2');
        await press(['DPAD_CENTER'], 'player-replay-skipped', 3000);
        await until(() => q2 && window.__replayTest?.state()?.played >= q2.at - 75000, 10000);   // (from the minute: up to 59 s early)
        check('catch-up: Skip to Q2 lands 10 s before Q2', !!q2 && Math.abs(window.__replayTest?.state()?.played - (q2.at - 10000)) < 61000, { played: window.__replayTest?.state()?.played, q2: q2?.at });
        await press(['DPAD_RIGHT', 'DPAD_RIGHT', 'DPAD_CENTER'], 'player-replay-game-panel', 1000);   // the Game button (after Back to live)
        await press(['DPAD_DOWN', 'DPAD_DOWN'], 'player-replay-panel-quarters');
        await press(['BACK'], 'player-replay-panel-closed');
        await press(['DPAD_DOWN'], 'player-replay-options', 800);   // ▼ Options: Game panel, Other sources, Not the game?, Sync score
        await press(['BACK'], 'player-replay-options-closed');
        await press(['DPAD_UP', 'DPAD_RIGHT', 'DPAD_RIGHT', 'DPAD_RIGHT', 'DPAD_RIGHT', 'DPAD_RIGHT'], 'player-replay-golive-focused');
        await press(['DPAD_CENTER'], 'player-replay-back-to-live', 4000);
        await until(() => PL.ctx.cur?.kind === 'live', 15000);
        check('catch-up: Back to live tunes the channel live', state()?.watching && PL.ctx.cur?.kind === 'live');
      } catch (e) { report('error', `catch-up: ${(e && e.stack) || e}`); }
      for (let k = 0; k < 3 && state()?.watching; k++) await press(['BACK'], `player-catchup-closed-${k + 1}`, 1500);
      await press(['BACK'], 'back-to-tab-2');

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
      // The NBA tab's sections: Down from a chip lands on its content, Back returns to the chip
      const sec = async (k, name) => { document.querySelector(`[data-sec="${k}"]`)?.focus(); document.querySelector(`[data-sec="${k}"]`)?.click(); await wait(2500); await shot(name); };
      await sec('standings', 'nba-standings');
      await press(['DPAD_DOWN', 'DPAD_DOWN'], 'nba-standings-row');
      check('standings row focused', !!document.activeElement?.closest('[data-s="standings"]') && document.activeElement?.dataset?.key?.startsWith('tm:'));
      await press(['BACK'], 'nba-standings-back');
      check('back to the Standings chip', document.activeElement?.dataset?.sec === 'standings');
      await sec('team', 'nba-team');
      await press(['DPAD_DOWN', 'DPAD_DOWN'], 'nba-team-schedule');
      await press(['DPAD_DOWN'], 'nba-team-ranks');
      check('team page scrolls to Season ranks', !!document.activeElement?.closest('[data-s="team"]'));
      await press(['BACK'], 'nba-team-back');

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

      // Account > Provider > Check the connection: the sheet as it runs, then its verdict
      window.__tunerTest.go('account');
      await wait(1200);
      document.querySelector('.arow[data-act="conncheck"]')?.focus();
      await press(['DPAD_CENTER'], 'account-conncheck-running');
      await until(() => document.querySelector('.dg-sheet [data-act="again"]'), 75000);
      await shot('account-conncheck-done');
      check('the connection check finishes', !!document.querySelector('.dg-sheet [data-act="again"]'), { rows: [...document.querySelectorAll('.dg-sheet .dg-vn')].map((x) => x.textContent).join(' | ') });
      await press(['BACK'], 'account-conncheck-closed');

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
