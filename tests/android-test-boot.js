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

      // Subtitles and real quality (design/ui-v1/subtitles, PORT-NATIVE.md 4): the quality check on the fake film (its
      // size and OpenSubtitles fingerprint, the same as the JS gives), no partial reads, a refusal, plays on this TV;
      // then the film with Icelandic and English subtitles from a fake OpenSubtitles add-on at the fake provider: a line
      // drawn by the player's own view, Options > Subtitles, Early or late (▶ moves the next line 0.5 s later, saved by
      // the app), Match a line, and Options > Quality opening no connection.
      try {
        const TP = window.Capacitor?.Plugins?.TunerPlayer;
        const info = await TP.info();
        check('subtitles: the player says probe and subs', info.probe === true && info.subs === 1, { info: JSON.stringify(info) });
        const film = `${API}/movie/demo/demo/5000.mp4`;
        const pr = await TP.probe({ id: 'test:movie:5000', url: film, headers: {} });
        const want = await (await fetch(`${API}/_film`)).json();   // (made by CI's own ffmpeg: here it was 2,547,988 bytes, c66f32bd101993f2)
        check('quality check: the fake film (206 head and tail, fingerprint, tracks)', pr.status === 'ok' && pr.size === want.size && pr.hash === want.hash && pr.formats?.video?.w === 1280 && pr.formats?.audio?.length === 1 && pr.dur > 55,
          { status: pr.status, size: pr.size, hash: pr.hash, want: JSON.stringify(want), dur: pr.dur, why: pr.why, ms: pr.ms, formats: JSON.stringify(pr.formats) });
        const nr = await TP.probe({ id: 'test:norange', url: `${API}/movie-norange/demo/demo/5000.mp4`, headers: {} });
        check('quality check: no partial reads gives head-only, no fingerprint', nr.status === 'head-only' && !nr.hash, { status: nr.status, why: nr.why, video: JSON.stringify(nr.formats?.video || null) });
        const rf = await TP.probe({ id: 'test:refuse', url: `${API}/movie-refuse/demo/demo/5000.mp4`, headers: {} });
        check('quality check: a 458 is refused', rf.status === 'refused', { status: rf.status, why: rf.why });
        const pl = await TP.playable({ copies: [{ id: 'film', formats: pr.formats }, { id: 'dts', formats: { video: pr.formats?.video, audio: [{ mime: 'audio/vnd.dts.hd', ch: 6, rate: 48000 }] } }] });
        check('plays on this TV: the fake film plays', pl.film?.video && pl.film?.audio, { playable: JSON.stringify(pl) });
        report('note', { playable: pl });
        // the film, with his settings (SPEC 14: Always, Icelandic then English) and the fake add-on
        localStorage.setItem('tuner.subsBase', JSON.stringify(`${API}/subs-addon`));
        const mod = (m) => import(`./tv/js/${m}.js`);
        const [SU, CA, U, ST, PL] = await Promise.all(['subs', 'catalog', 'util', 'state', 'player'].map(mod));
        ST.saveSettings({ subMode: 'always', subLangs: ['Icelandic', 'English'] });
        await CA.ensure('movie');
        const t = [...CA.catalog.movie.titleById.values()][0];
        const v = t.versions[0];
        const key = U.keyOf(t);
        const st = await SU.prepare({ key, name: t.name, imdb: 'tt9000101', level: 'sure', version: v });
        check('subtitles: Icelandic from the fake add-on', st.status === 'ready' && st.on?.lang === 'Icelandic', { pill: st.pill, side: st.side });
        await PL.playVod(v, { restart: true });
        await until(() => state()?.watching, 10000);
        await wait(2500);
        const subsNow = (name, after = 300) => step({ keys: [], adb: ['am', 'broadcast', '-a', 'app.tuner.player.DIAG', '-p', 'app.tuner.player', '--es', 'subs', '1'], name }, after);
        window.__subs = null;
        await subsNow('player-subs-line', 600);
        await until(() => window.__subs, 3000);
        check('subtitles: a downloaded line is drawn by the player', /on=Icelandic/.test(window.__subs?.state || '') && window.__subs?.shown > 0 && /Ég|Hvað|Það|Við/.test(window.__subs?.last || ''), { subs: JSON.stringify(window.__subs) });
        await press(['MEDIA_PAUSE'], 'player-subs-paused');   // (the film is 60 s long: paused for the panels, which step it as he would)
        await press(['CAPTIONS'], 'player-subs-panel', 800);   // Options > Subtitles: Off, From OpenSubtitles, Icelandic (on), Early or late, English
        await press(['DPAD_DOWN'], 'player-subs-early-or-late-row');
        await press(['DPAD_CENTER'], 'player-subs-timing', 800);   // the strip, at the top; the subtitles stay in view
        await press(['DPAD_RIGHT'], 'player-subs-timing-later');   // 0.5 s later
        window.__subs = null;
        await subsNow('player-subs-timing-state');
        await until(() => window.__subs, 3000);
        const mem = SU.subMemory();
        check('Early or late: ▶ moves the next line by 0.5 s, saved for this film', window.__subs?.mine === 0.5 && window.__subs?.strip === 'strip' && mem?.offset(key, U.keyOf(v), '9000101-is') === 0.5,
          { subs: JSON.stringify(window.__subs), saved: mem?.offset(key, U.keyOf(v), '9000101-is') });
        await press(['DPAD_DOWN'], 'player-subs-match-a-line', 800);   // Match a line: the next line's words
        await press(['BACK'], 'player-subs-match-cancelled');
        await press(['DPAD_CENTER'], 'player-subs-timing-done');
        // Options > Quality opens no connection (only what the checks stored)
        const hits = async () => (await (await fetch(`${API}/_hits?prefix=/movie/`)).json()).n;
        const before = await hits();
        await press(['DPAD_DOWN'], 'player-subs-options', 800);
        await press(['DPAD_DOWN', 'DPAD_DOWN', 'DPAD_CENTER'], 'player-quality', 800);
        await wait(1500);
        const after = await hits();
        check('Options > Quality opens no connection', after === before, { before, after });
        await press(['BACK'], 'player-quality-back');
        await press(['BACK'], 'player-quality-closed');
      } catch (e) { report('error', `subtitles: ${(e && e.stack) || e}`); }
      for (let k = 0; k < 3 && state()?.watching; k++) await press(['BACK'], `player-subs-closed-${k + 1}`, 1500);

      // Add-ons (design/ui-v1/addons/PORT-NATIVE.md 7): the fake add-ons on the fake provider's port (their links follow
      // the request's Host, so 10.0.2.2 here). The Long Night (film 5000) plays Northlight's 4K remux with its proxy
      // header (User-Agent: Northlight/1.0, checked at the fake server); the torrent, magnet and Stremio-server copies
      // never reach the player; the 4K web copy is a 30 s "still downloading" clip (Cinemeta's runtime is 2 min), so it
      // hands over to the next copy with no progress saved; the phone page answers on the TV's own address; the safe
      // launcher refuses a missing app and unsafe links.
      try {
        const TP = window.Capacitor?.Plugins?.TunerPlayer;
        const info = await TP.info();
        check('add-ons: the player says addons, phonePage and openApp', info.addons === true && info.phonePage === true && info.openApp === true, { info: JSON.stringify(info) });
        for (const [k, v] of [['cinemetaBase', '/addon/cinemeta'], ['stremioApi', '/stremio-api'], ['stremioLink', '/stremio-link'], ['ratingsUrl', '/ratings.json']]) localStorage.setItem(`tuner.${k}`, JSON.stringify(API + v));
        const mod = (m) => import(`./tv/js/${m}.js`);
        const [AD, TC, IM, CA, PL, ST] = await Promise.all(['addons', 'titlecopies', 'imdb', 'catalog', 'player', 'state'].map(mod));
        const col = await (await fetch(`${API}/stremio-api/api/addonCollectionGet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authKey: 'AK-test-1' }) })).json();
        for (const x of (col.result?.addons || []).filter((x) => /\/addon\/(cinemeta|northlight)\//.test(x.transportUrl))) AD.addAddon({ url: x.transportUrl, manifest: x.manifest }, 'stremio');
        const ev = [];
        const off = await TP.addListener('event', (e) => { if (['addon-state', 'copy-notready', 'copy-failed', 'track', 'need'].includes(e.type)) ev.push({ ...e, at: Date.now() }); });
        const addonState = async (name) => { const n = ev.length; await step({ keys: [], adb: ['am', 'broadcast', '-a', 'app.tuner.player.DIAG', '-p', 'app.tuner.player', '--es', 'addon', '1'], name }, 300); await until(() => ev.slice(n).some((e) => e.type === 'addon-state'), 3000); return ev.slice(n).reverse().find((e) => e.type === 'addon-state')?.state || ''; };
        await CA.ensure('movie');
        const t = CA.catalog.movie.titleById.get('5000') || CA.catalog.movie.titleById.get(5000);
        IM.pickMatch(t, 'tt9000001');
        const tc = TC.titleCopies(t, () => {});
        await tc.start({ tmdb: 4401 });
        await until(() => tc.answered(), 15000);
        const all = tc.copies(), ad = all.filter((c) => c.source !== 'provider');
        check('add-ons: only direct links reach the copies (no torrent, magnet or Stremio server)', ad.length >= 3 && ad.every((c) => /^https?:\/\//.test(c.url || '') && !/11470|magnet:/.test(c.url || '')),
          { copies: all.map((c) => `${c.source}: ${c.filename || c.v?.name || ''}`).join(' | ') });
        const remux = ad.find((c) => /REMUX/i.test(c.filename || '')), web = ad.find((c) => /WEB-DL/i.test(c.filename || '') && /2160p/.test(c.filename || ''));
        // Play: Northlight's 4K remux, with its proxy header on its own data source
        tc.pick(remux.key);
        tc.play({ now: true, restart: true });
        await until(() => state()?.watching, 10000);
        await wait(3500);
        await shot('player-addon-remux');
        const ent = PL.ctx.cur?.items?.[0]?._entry || {};
        const seen = await (await fetch(`${API}/_seen?prefix=/addon-media/`)).json();
        const st1 = await addonState('player-addon-state');
        check('add-ons: the remux plays with Northlight\'s User-Agent', seen.some((l) => /remux\.mkv/.test(l) && /ua=Northlight\/1\.0/.test(l)) && /source=Northlight/.test(st1) && /headers=User-Agent/.test(st1),
          { seen: seen.slice(-4).map((l) => l.replace(/\/addon-media\/[^/]+\//, '/addon-media/…/')).join(' | '), state: st1, copies: (ent.copies || []).length });
        await press(['DPAD_DOWN'], 'player-addon-options', 800);
        await press(['DPAD_DOWN', 'DPAD_DOWN', 'DPAD_CENTER'], 'player-addon-quality', 800);   // Quality: the copies, best first, at 384
        await press(['BACK'], 'player-addon-quality-back');
        await press(['BACK'], 'player-addon-options-closed');
        for (let k = 0; k < 3 && state()?.watching; k++) await press(['BACK'], `player-addon-closed-${k + 1}`, 1500);
        // the 4K web copy: a 30 s placeholder, handed over to the next copy, nothing saved for it
        delete ST.S.progress['movie:tt9000001'];
        const n0 = ev.length;
        tc.pick(web.key);
        tc.play({ now: true, restart: true });
        await until(() => ev.slice(n0).some((e) => e.type === 'copy-notready'), 20000);
        const saved = ST.S.progress['movie:tt9000001'];
        await shot('player-addon-not-ready');
        const nr = ev.slice(n0).find((e) => e.type === 'copy-notready');
        await until(() => nr && ev.slice(n0).some((e) => e.type === 'track' && e.at > nr.at), 15000);
        await wait(3000);
        const st2 = await addonState('player-addon-handed-over');
        check('add-ons: a placeholder hands over to the next copy, with no progress saved', !!nr && nr.key === web.key && !saved && /notReady=false/.test(st2) && /auto=1/.test(st2) && !st2.includes(`key=${web.key} `),
          { notready: nr?.key, web: web?.key, saved: JSON.stringify(saved || null), state: st2, need: ev.filter((e) => e.type === 'need').map((e) => `${e.what}:${e.key || ''}`).join(' ') });
        for (let k = 0; k < 3 && state()?.watching; k++) await press(['BACK'], `player-addon-closed-${k + 4}`, 1500);
        off?.remove?.();
        tc.pick(null);
        // the phone page: on the TV's own address while it's open; a sent link comes back as an event; 5 wrong codes lock it
        const PH = [];
        const offP = await TP.addListener('phone', (e) => PH.push(e));
        const r = await TP.startPhonePage({ token: 'Tst0phonepage1234', code: '482193', port: 8790 });
        const base = `http://${r.address}`;
        const page = await (await fetch(`${base}/`)).text();
        const sent = await (await fetch(`${base}/Tst0phonepage1234/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'stremio://10.0.2.2:8899/addon/kestrel/manifest.json' }) })).json();
        const bad = await fetch(`${base}/Tst0phonepage1234/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://example.com/page' }) });
        await wait(500);
        check('phone page: answers on the TV\'s address and passes a manifest link on', /^\d+\.\d+\.\d+\.\d+:\d+$/.test(r.address || '') && /Send to your TV/.test(page) && sent.ok === true && bad.status === 400 && PH.some((e) => e.type === 'sent' && e.url === 'https://10.0.2.2:8899/addon/kestrel/manifest.json'),
          { address: r.address, sent: JSON.stringify(sent), bad: bad.status, events: JSON.stringify(PH) });
        for (let k = 0; k < 5; k++) await fetch(`${base}/code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: '000000' }) });
        const right = await fetch(`${base}/code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: '482193' }) });
        check('phone page: 5 wrong codes lock it', PH.some((e) => e.type === 'locked') && right.status === 423, { status: right.status, events: JSON.stringify(PH) });
        await TP.stopPhonePage();
        offP?.remove?.();
        // Watch in another app: a missing app, a file link and an app's own content link are all refused
        const oa = await TP.openApp({ uri: 'intent://x.example/y#Intent;scheme=https;package=com.example.notinstalled;end' });
        const of = await TP.openApp({ uri: 'file:///sdcard/x.html' });
        const oc = await TP.openApp({ uri: 'intent://x#Intent;scheme=content;package=app.tuner.player;component=app.tuner.player/.MainActivity;end' });
        check('another app: a missing app and unsafe links are refused', oa.ok === false && of.ok === false && oc.ok === false, { missing: JSON.stringify(oa), file: JSON.stringify(of), content: JSON.stringify(oc) });
      } catch (e) { report('error', `add-ons: ${(e && e.stack) || e}`); }
      for (let k = 0; k < 3 && state()?.watching; k++) await press(['BACK'], `player-addon-closed-${k + 7}`, 1500);

      // Skip intro / recap and Up next at the credits (design/ui-v1/skip/SPEC.md 14): the fake TheIntroDB at the fake
      // provider (its real answers for It's Always Sunny and Lost), two fake series matched to them, episodes that play a
      // 22:01 clip. Seeks go through the debug intent, with no key, so the OK guard's 1.5 s of quiet holds.
      try {
        const TP = window.Capacitor?.Plugins?.TunerPlayer;
        const info = await TP.info();
        check('skip: the player takes the segments command', info.segments === true, { info: JSON.stringify(info) });
        localStorage.setItem('tuner.introBase', JSON.stringify(`${API}/introdb/v4`));
        const mod = (m) => import(`./tv/js/${m}.js`);
        const [CA, PL, ST, IM, AC] = await Promise.all(['catalog', 'player', 'state', 'imdb', 'actions'].map(mod));
        ST.saveSettings({ skipIntro: 'button' });
        await CA.ensure('series');
        const [sunny, lost] = CA.catalog.series.items;
        // (the match is kept per title, as the title page picks it: the series list's title, not its raw item)
        const titleOf = (it) => CA.catalog.series.titleById?.get(it.id) || CA.catalog.series.titleById?.get(String(it.id)) || it;
        IM.pickMatch(titleOf(sunny), 'tt0472954');
        IM.pickMatch(titleOf(lost), 'tt0411008');
        const epsOf = (t) => AC.episodesOf({ seriesId: t.id, seriesName: t.name, poster: t.poster });
        const bc = ['am', 'broadcast', '-a', 'app.tuner.player.DIAG', '-p', 'app.tuner.player', '--es', 'skip'];
        // (quick steps: no screenshot and no waits at the emulator's end, the chips live only a few seconds)
        const skKeys = async (name, arg, keys, after = 200) => { window.__skip = null; await step({ keys, adb: [...bc, arg], name, quick: true }, after); await until(() => window.__skip, 3000); return window.__skip?.state || ''; };
        const sk = (name, arg = 'state', after = 200) => skKeys(name, arg, [], after);
        const quick = (keys, name, after = 0) => step({ keys, name, quick: true }, after);
        // (one failed check must not leave the rest on a paused picture)
        const resume = async (name) => { const x = await sk(name); if (/playing=false/.test(x) && !/upnext=true|end=true/.test(x)) await sk(`${name}-play`, 'play', 800); };
        const poll = async (name, ok, ms) => { let s = ''; for (let t0 = Date.now(), k = 0; Date.now() - t0 < ms; k++) { s = await sk(`${name}-${k}`); if (ok(s)) break; await wait(300); } return s; };
        const pos = (s) => +(/pos=(\d+)/.exec(s) || [])[1];
        const has = (s, re) => re.test(s);
        const eps = await epsOf(sunny), s1 = eps.filter((e) => +e.season === 1);
        await PL.playVod(s1[0], { queue: eps, restart: true });
        await until(() => state()?.watching, 10000);
        await wait(3500);
        // SK-1: from 1:40 with no key, the Skip intro chip at 1:44
        await sk('skip-sunny-e1-seek', 'seek:100000', 1500);
        let s = await poll('skip-chip', (x) => has(x, /chip=skip /), 9000);
        await shot('player-skip-chip');
        check('skip SK-1: the Skip intro chip at 1:44', has(s, /chip=skip .*title=Skip intro sub=/) && pos(s) >= 103500 && pos(s) <= 107500, { s });
        // SK-2: OK after a second skips to 2:11.1, the way-back chip says Intro skipped / 28 s
        await wait(1200);
        await quick(['DPAD_CENTER'], 'skip-ok', 900);
        await shot('player-skip-skipped');
        // SK-5: OK on the way-back chip (a pressed skip, it binds 0.5 s after the jump) goes back to 1:44 while its 5 s
        // run; the window is left alone; ▲ lands on Play. (The state is read just before that OK.)
        s = await skKeys('skip-go-back', 'state', ['DPAD_CENTER'], 600);
        check('skip SK-2: OK skips to the intro\'s end − 0.5 s, the way-back chip', has(s, /chip=back .*title=Intro skipped sub=28 s ok=go back/) && pos(s) >= 131000 && pos(s) <= 136500, { s });
        s = await sk('skip-after-back');
        const back = s;
        await press(['DPAD_UP'], 'skip-back-buttons', 300);
        s = await sk('skip-back-focus');
        check('skip SK-5: back to 1:44, no chip again, ▲ lands on Play', has(back, /chip=none /) && pos(back) >= 103800 && pos(back) <= 107000 && has(back, /intro@104000-131646:once:alone/) && has(s, /focus=play /) && has(s, /pill=Skip intro /), { back, s });
        await press(['BACK'], 'skip-back-controls-hidden', 1600);
        await resume('skip-credits-playing');
        // SK-16 and SK-33: the credits at 21:28: Next episode in 15 s; with the controls up the keys go and the count goes on
        await sk('skip-credits-seek', 'seek:1286000', 1500);
        s = await poll('skip-upnext', (x) => has(x, /upnext=true /), 8000);
        await shot('player-upnext-credits');
        const up = s;
        await press(['DPAD_UP'], 'skip-upnext-controls', 1500);
        const upCtl = await sk('skip-upnext-controls-state');
        await quick(['BACK'], 'skip-upnext-controls-hidden', 300);
        const upBack = await sk('skip-upnext-keys-back');
        const n0 = +(/Next episode in (\d+) s/.exec(up) || [])[1], n1 = +(/Next episode in (\d+) s/.exec(upCtl) || [])[1];
        check('skip SK-33: controls up while Up next counts: no key column, the count goes on, the keys come back', has(upCtl, /upnext=true .*upKeys=false/) && n1 < n0 && has(upBack, /upKeys=true/), { up, upCtl, upBack });
        s = await poll('skip-upnext-moved-on', (x) => has(x, /index=1 /), 22000);
        check('skip SK-16: Up next at 21:28 counts 15 s, then S1 E2 plays and S1 E1 is marked watched', pos(up) >= 1287000 && pos(up) <= 1291500 && n0 >= 13 && has(s, /index=1 /) && !!ST.progressOf(s1[0])?.done, { up, s, e1: JSON.stringify(ST.progressOf(s1[0]) || null) });
        // SK-7: ▲ during a fresh intro lands on Skip intro (the last of the left group); OK skips; focus on the seek thumb
        await wait(2500);
        await resume('skip-e2-playing');
        await sk('skip-e2-seek', 'seek:80000', 1800);
        s = await poll('skip-e2-chip', (x) => has(x, /chip=skip /), 6000);
        await press(['DPAD_UP'], 'skip-e2-buttons', 300);
        const pillUp = await sk('skip-e2-pill');
        await shot('player-skip-bar');
        await quick(['DPAD_CENTER'], 'skip-e2-pill-ok', 300);
        s = await sk('skip-e2-pill-skipped');
        await shot('player-back-pill');
        check('skip SK-7: ▲ lands on Skip intro, OK skips, focus on the seek thumb, Back to intro in the row', has(pillUp, /focus=Skip intro /) && pos(s) >= 105300 && pos(s) <= 108500 && has(s, /focus=seek /) && has(s, /pill=Back to intro:back /), { pillUp, s });
        await press(['BACK'], 'skip-e2-controls-hidden', 7000);   // (the way-back chip comes back with its 5 s, then goes)
        await resume('skip-e2-credits-playing');
        // SK-17: Back on Up next: no count again, the queue stays, the picture holds at the end with the end card
        await sk('skip-e2-credits', 'seek:1249000', 1500);
        await poll('skip-e2-upnext', (x) => has(x, /upnext=true /), 8000);
        await quick(['BACK'], 'skip-e2-stay', 300);
        const stay = await sk('skip-e2-stay-state');
        await sk('skip-e2-near-end', 'seek:1312000', 1500);
        s = await poll('skip-e2-end', (x) => has(x, /end=true /), 16000);
        await shot('player-upnext-end');
        check('skip SK-17: Back stays (the queue kept, the pause at the end set), then the end card with the picture held', has(stay, /upnext=false .*stay=true .*pauseAtEnd=true/) && +(/of=(\d+)/.exec(stay) || [])[1] === eps.length && has(s, /end=true upTitle=Next episode upKeys=true/) && has(s, /playing=false/), { stay, s });
        if (state()?.watching) await press(['BACK'], 'skip-end-card-closes', 2000);   // (Back on Home would leave the app)
        await until(() => !state()?.watching, 5000);
        // SK-10: Lost S2 E1 reached by Up next from the season before (played to the end): its recap skips by itself
        const leps = await epsOf(lost), fin = leps.find((e) => +e.season === 1 && +e.ep === 6);
        await PL.playVod(fin, { queue: leps, restart: true });
        await until(() => state()?.watching, 10000);
        await wait(3500);
        await sk('skip-lost-near-end', 'seek:1301000', 1500);
        s = await poll('skip-lost-recap', (x) => has(x, /chip=back .*title=Recap skipped/), 30000);
        await shot('player-recap-skipped');
        check('skip SK-10: Lost S2 E1 after the season before, by Up next: the recap skips by itself, Recap skipped', has(s, /chip=back .*title=Recap skipped sub=26 s/) && has(s, /index=1 /) && pos(s) >= 27000 && has(s, /recapSelf=true/), { s });
      } catch (e) { report('error', `skip: ${(e && e.stack) || e}`); }
      for (let k = 0; k < 3 && state()?.watching; k++) await press(['BACK'], `player-skip-closed-${k + 1}`, 1500);

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
      // (Account has the Add-ons group after Provider now: the NBA group is clicked rather than counted to)
      document.querySelector('.gl[data-g="nba"]')?.click();
      await wait(600);
      document.querySelector('.gl[data-g="nba"]')?.focus();
      await shot('account-nba');
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
