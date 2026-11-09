# airglow (repo name: tuner)

An ad-free IPTV app for Xtream Codes and M3U providers, built for one owner: a Memphis Grizzlies fan who watches on a
Philips 55" OLED (55OLED810/12, Google TV) with the remote. The TV app comes first; the Windows app (desktop-v1) is
being built; the phone build exists. The brand is "airglow" (the repo and Android package are still `tuner` / `app.tuner`).
The whole story so far (what was asked, decided and shipped) is in `CONTEXT.md`; the plan for what's next is in `NEXT.md`.

## How it fits together

- `app/tv.html` + `app/tv/` is the TV interface: plain ES modules, no framework, in a Capacitor WebView. The design
  canvas is 960x540 CSS px; the TV safe area is x 48–912, y 27–513 (keep text and focused items inside it).
  - `js/main.js` start-up, keys, Back, the Offline bar. `js/router.js` screens, the top bar, Back stack.
  - `js/focus.js` the D-pad focus engine. Focusable things have class `fx` and live in containers: `[data-row]`,
    `[data-col]`, `[data-grid][data-cols]`. Grid/row edges stop sideways unless the container has `data-exit`.
    Sheets push a layer. `util.js` `setHtml` redraws only on change and puts focus back by path; cards carry
    `data-key` (channel / game / title identity) so focus follows the item, not its position.
  - `js/ui.js` sheets, menus, toasts (`openOverlay`, `radioMenu`, `contextMenu`, `scrollList`).
  - `js/catalog.js` channel / movie / series lists (saved in IndexedDB in parts, prepared once, `PREP` versions per kind).
  - `js/guide.js` the EPG: a queue (3 at a time, on-screen rows first), retries, the provider clock offset.
  - `js/games.js` NBA: scoreboard, box scores, the spoiler shield (seen store `{ upTo, ids }`, `recordFor`, copies kept at
    tip-off, the news scan), the per-channel score delay, which channels carry a game, `bestChannel` (best quality).
  - `js/league.js` the Team/League pages' ESPN data (peek/want, kept in IndexedDB, 'league' events).
  - `js/screens/nba.js` the NBA tab host: section row `Games · [crest] team · Standings · Leaders · Team stats · News`,
    each section a module in `js/nba/` (hub, standings, leaders, teamstats, news, team, player sheet, picker, common).
    `js/screens/team.js` another team's page (pushed). Design: `design/ui-v1/nba-pages/SPEC.md`.
  - Catch-up / rewatch (`design/ui-v1/catchup/SPEC.md`): `js/catchup.js` (which programmes and games have a replay, the
    provider's archive), `js/replay.js` (Watch from tip-off, the replay actions); `core.js` `catchup()` / `table()` make the links.
  - Subtitles and real quality per copy (`design/ui-v1/subtitles/`, `design/ui-v1/copies/RANKING.md`): `js/subs/*`
    (parse, languages, timing, OpenSubtitles, the file hash, the copy checks queue `probes.js`, prefs), `js/subs.js`,
    `js/titlesubs.js` (the title page's pill and sheet), `js/quality.js`, `js/copies.js` (the one copy ranking, tested by
    `tests/copies-test.js`), `js/titlecopies.js` (a title's copies from the provider and add-ons), `js/imdb.js`.
  - Add-ons, Stremio protocol, direct links only (`design/ui-v1/addons/SPEC.md`): `js/addons.js`, `js/screens/addons.js`,
    `js/qr.js` (the Stremio account link code).
  - `js/conncheck.js` the playback diagnosis's connection check (`design/ui-v1/diagnosis/`).
  - `js/player.js` talks to the native player (commands and events). `js/sfx.js` UI sounds (Android SoundPool via the
    plugin for no delay; Web Audio for the launch sound). `js/launch.js` the launch animation.
  - Home (`design/ui-v1/home-final/SPEC.md`): `js/screens/home.js` the Marquee (3 lines, 4 on a game day, the lit one
    its card in place, the picture after a 600 ms rest, game night) and the browsing rows (index, reasons, P−/P+, Back to
    row 1 first); `js/rows.js` the row engine (the `plays` log migrated from progress, the taste profile, candidates,
    the page, cold start's genre picker, Why this row?, hidden rows, Not interested); `js/shelves.js` the item shape,
    Cinemeta / TMDB / add-on shelves and their paging, opening a title (its IMDb id first); `js/tmdb.js` TMDB v3 with the
    owner's key (Account > Provider, typed or sent from the phone page; never in the repo; cached, 4 at a time);
    `js/art.js` the 32 px probe (the brightness cap, the glow) and logos cropped to their ink. Styles: `home.css`.
  - `js/screens/` home, live (the guide), nba (the NBA tab host), team, game, lib (Movies/Series: the add-on library,
    never the provider's VOD), detail, search, saved, account, first (sign-in).
  - Styles: `ui.css` (the design kit) and `app.css` (app-specific), `launch.css`, `nba*.css` (the NBA pages).
- Error reports (Sentry; `design/ui-v1/error-reports/SPEC.md` and its "As built"): the rule is that no link, provider or
  add-on address, channel identity or secret ever leaves the device.
  - JS on all three apps:
    - `app/vendor/sentry.js` is `@sentry/browser` 11.11.0 bundled by `scripts/build-sentry.js` at postinstall.
    - `report-scrub.js` rebuilds every report from an allowlist. Messages become types or codes, links and hosts are
      blanked, and it also defines `AppError`.
    - `report-boot.js` starts Sentry before `core.js`.
    - `reports.js` gives the modules `note()`, `screen()` and `problem()`.
  - TV native: `Reports.java`, `App.java`, and the plugin's `reports()`.
  - The real address (`reports.json`) is only in builds from `main`.
  - Read reports with the Sentry connector: org `biggi-qu` (EU, `https://de.sentry.io`), project `airglow`,
    `search_issues`.
  - Tests:
    - `tests/report-scrub-test.js`
    - `ReportsTest`
    - `tests/tv/reports-leak.js` (`serve.sh` starts the fake ingest `tests/mock-sentry.js` on :8791)
    - the emulator's leak probe
  - Our own errors throw `AppError(code, text)`: the text is shown on screen, and the code is what a report carries.
- airglow accounts (`design/ui-v1/accounts-v1/SPEC.md`, its "As built"): `app/tv/js/account/` shared by all three apps:
  `crypto.js` (WebCrypto: KDF with floor/ceiling, wraps, records, the TV handover, recovery keys), `acct.js` (session,
  tokens, the per-platform secure store: TV Keystore `Secret.java`, iPhone Keychain plugin, Windows safeStorage),
  `sync.js` (the collections over the device's own stores, §4.2a; CAS, held deletes, wipe, undo, snapshots),
  `rules.js` (the merge rules, `tests/account-merge-test.js`), `merge.js` (the first sign-in's question), `device.js`
  (the TV's code flow), `flow.js`. `state.js` `scoped()` puts person keys under `u:<account>:` when signed in. Screens:
  TV `screens/first.js` (door, code, typed), `screens/merge.js`, Account's first group; iPhone and Windows
  `acctui.js` (one file, copied). `worker/` the Cloudflare Worker + D1 (`npm test` there; `tests/mock-accounts.js` runs
  it on :8790 for the app tests, started by serve.sh); flows: `tests/tv/account-code.js`, `tests/phone/account.js`,
  `tests/desktop/account.js`. Host `https://acct.airglow-tv.workers.dev`; never rename the `acct` Worker (its PEPPER).
- `app/core.js` providers (Xtream + M3U, with `catchup()` replay links), settings and storage. `app/nba.js` ESPN's public JSON. `app/titles.js` title matching.
- `android/app/src/main/java/app/tuner/player/`: `PlayerActivity` (Media3 player and its overlays: channel list,
  game panel, options, quality, subtitles…), `TunerPlayerPlugin` (the JS bridge, updater, UI sounds), `ListPanel`,
  `GamePanel`, `VodControls`, `Ui` (tokens, icons), the player controls v2 (`design/ui-v1/player-v2/`: `Track` the one bar,
  `Hud` the shared scrims, title block, buttons row and labels); the diagnosis `Diag`, `PathView`; catch-up `Timeline`, `Replay`, `Card`,
  `LivePause`; the copy check `Probe`, subtitles `Subs`, `SrtTrack`; add-ons `Handover` (hand a link to another app),
  `PhonePage` (the page a phone opens to type into the TV), `Launch`. Each feature's native side: its `PORT-NATIVE.md`. JS → native via `command` (meta, game, ring, tune, queue, versions…);
  native → JS via events (track, need, pick, version, progress, setting, exit…).
- The iPhone app (`design/ui-v1/phone-v1/`, PORT-NATIVE.md there): `app/phone.html` + `app/phone/` (the views: tab bar,
  sheets, Home, Live, NBA (`nba.js` the section host and Games; `nbateam.js` team pages, `nbaleague.js` Standings /
  Leaders / Team stats, `nbanews.js`, `nbaplayer.js` the player sheet, `nbagame.js` the game page, `nbakit.js` Reveal and the
  shield's notes), Library, title page, Search, Account, sign-in, and `player.js`, an HTML5 `<video>` with the v2
  controls that stands in for the native player behind the TV's protocol: `bridge.js` sets `window.TUNER_NATIVE`, which
  `app/tv/js/native.js` uses). It reuses `app/tv/js`'s data modules as they are. HLS only; VLC / Infuse hand-off.
  Test: `node scripts/build-web.js phone`, serve `www/` on 8779, `node tests/phone/flows.js <outdir>`;
  CI's simulator test is `tests/ios-test-boot.js`.
- The Windows app (`design/ui-v1/desktop-v1/SPEC.md`, v1.1 §9): Electron (`main.js`: the windows, the hosts, the overlay's
  pointer hit-testing, the mini window, tray, reminders, media keys, window memory, updater; `preload.js` the `window.tuner`
  surface; `mpv.js` `MpvInstance`, one mpv per picture over JSON IPC). Each picture is a plain Win32 host window
  (`app/desktop/win32.js` over koffi) with mpv `--wid` inside it; plan A (a child of the window, proved on CI) or C (an owned
  popup; Account > Windows > the picture). Everything that floats is built in the page in `#floats` and mirrored to a
  never-focused transparent overlay window while a picture is up (`float.js` → `overlay.html`/`overlay.js`, clicks replayed by
  path). Views: `app/desktop.html` + `app/desktop/` (`main.js` title bar, sidebar, keys; `ui.js` pages with history, right
  sheets, menus at the pointer; `keys.js` the one key map and the ? sheet; `palette.js` Ctrl K; `home`, `live` (the guide
  grid), `nba*` (from the iPhone's), `library`, `detail`, `search`, `saved`, `account` (two panes, Windows); `player.js` the host
  behind TUNER_NATIVE with the v2 bar, the docked game panel, skip intro / Up next, subtitles via `sub-add memory://`, the mini
  player by moving the host; `multiview.js`; `reminders.js`; `bridge.js` as the phone's). Tests: `node tests/desktop/views.js
  <outdir>` (Chromium, `tests/desktop/stub.js` fakes `window.tuner`; serve.sh first; `PW=<a playwright with browsers>`), and on
  CI's `windows-test` job `tests/desktop/windows.js --app` (the spike with real OS input and screen grabs, then the app's flows
  in `app-windows.js`; screenshots in the `windows-test` release). `npm start` runs it from the repo.
- `scripts/build-web.js tv` builds `www/` for the TV APK (`phone` for the iPhone app).

## Build, test, release

- **The owner's Windows PC (from 8 Nov):** the repo is at `C:\tuner`. Installed:
  - Node 24 and gh (signed in as Burger-Nice).
  - Temurin JDK 21 (`JAVA_HOME` set).
  - The Android SDK at `%LOCALAPPDATA%\Android\Sdk` (`ANDROID_HOME` set; platform 36, build-tools 35 and 36; Google's
    new `android sdk install …` CLI replaces sdkmanager there).
  - Python 3.13 (use `py -3`; `python3` is the Microsoft Store stub, which `serve.sh` skips).
  - ffmpeg (winget).
  - adb.
  - Playwright's own Chromium (`npx playwright install chromium`; no `executablePath`, and `PW=$PWD/node_modules/playwright`
    for the desktop test).

  How to build and test there:
  - TV APK: `node scripts/build-web.js tv; npx cap sync android; cd android; .\gradlew.bat assembleDebug`. Afterwards,
    `git checkout` the two `capacitor*.gradle` files that `cap sync` rewrites.
  - `bash tests/tv/serve.sh` works in Git Bash. A shell opened before the installs may need the new PATH. If it's
    stopped from outside a terminal, kill its `node`/`python` children on 8777/8899/8790 by hand.
  - No adb to the TV: the owner uses the TV a lot and prefers updates through the app's own updater.
  - The iPhone app only builds on CI (no Mac).
- Local Playwright (the cloud container): the repo's `node_modules/playwright` doesn't match the container's browser; launch with
  `executablePath: '/opt/pw-browsers/chromium'` (a `-r` preload that patches `chromium.launch` works for drive.js), or
  `PW=$(npm root -g)/playwright` for the desktop views test.
- Local: `tests/tv/serve.sh` starts the fake provider + fake ESPN (127.0.0.1:8899, demo/demo) and serves the app at
  127.0.0.1:8777/tv.html. `node tests/tv/drive.js <outdir> <script>` drives it with the remote's keys in Playwright
  and takes screenshots (see `tests/tv/example-layout.js`). `tests/tv/serve.sh --test` + `node tests/tv/walkthrough.js
  <outdir>` runs the CI walkthrough in a browser (the 3 native-player checks can't pass there; restart the fake provider
  between walkthrough runs, it keeps the reports). NBA page scripts: `tests/tv/nba-{host,league,news,team}.js`, and the
  bug-hunt scripts `tests/tv/hunt-*.js`. Home: `tests/tv/home-{marquee,gamenight,rows,cold,library,curate}.js` (a fake TMDB,
  `tests/mock-tmdb.js`, on the fake provider; `home-common.js` seeds an owner-like history).
- CI (`.github/workflows/build.yml`, `gh workflow run build.yml --ref tv-redesign [-f tests=tv|phone|windows]`; `tests=phone` skips the
  40-minute TV emulator for iPhone-only changes, `tv` skips the simulator, `windows` runs only the Windows desktop test; a change in `app/tv/js` or `app/core.js` needs both) builds Windows, Android, iOS and runs
  `tests/android-test-boot.js` on an Android TV emulator (about 57 checks; the run fails if a check fails or the test doesn't finish). Its screenshots and `reports.json` are uploaded
  to the `android-test` release as `android-test-shots.tgz`.
- Local Android build: the SDK is at `/root/android-sdk`: `export ANDROID_HOME=/root/android-sdk; node scripts/build-web.js tv;
  npx cap sync android; cd android && ./gradlew assembleDebug --no-daemon -q` (Maven sometimes answers 429: retry).
- Work on `tv-redesign`. Pushing it to `main` releases v0.4.<run> (bump the middle number in `build.yml`'s `VERSION` for
  each big release, 1.0 once it's solid on the TV; the TV orders updates by the run number, not the name) and the TV updates itself from `android.json`.
  **The release job doesn't wait for the emulator test**, so run CI on `tv-redesign` and see it pass first.
- On the owner's TV over adb (same network): see `NEXT.md`.

## Owner's rules

- Wait for an explicit "release" (or "go") before pushing to `main`. "Just release" means push now without waiting for
  the emulator run (the release job never waits for it); run CI on `tv-redesign` otherwise.
- Commit as `git -c user.name="Tuner" -c user.email="birgirsveinn@gmail.com"`; no AI model names in commits or code.
- Never commit the Android signing key or its password (only in the `TUNER_KEY_PASSWORD` secret; never ask for it).
  Don't make the repo private.
- Always research first (current sources, patterns proven at scale, linked in the spec's Research section); prefer
  what's been tested and done before over untested inventions, and say where a design departs and why.
- Design and brand work: a brand/UX agent designs, an independent reviewer scores it (out of 10), and it goes back
  below 7.5 (never tell the reviewer the bar). Brand and design history: `design/` (brand-v5, ui-v1/UI-SPEC.md, sound-v1).
- Pick the model for the job (the owner wants quality): big design work on the most capable model (Fable 5.1);
  independent design reviews on Opus 5.5 (strong judgement, and a different model from the designer); building on
  Opus 5.5; bug hunts and other report-only checking on Sonnet 5.5; quick lookups on Haiku 5.5.
- Team colours are the teams' real colours. The sounds' design is final; they just have to play instantly.
- The owner writes casually and tests on the real TV. Explain in plain words, say what you verified and what you
  couldn't, and ask before anything outward-facing.

## Known open items

- Error reports (released 0.4.127, 8 Nov). The TV's report arrived.
  - Still to try: "Send a report now" from the iPhone and Windows, and reading them back.
  - Then add 'production' to the Sentry email alert's environment filter.
  - CI flakes: the iPhone simulator's "live HLS plays" check and the Windows real-input checks fail now and then (a rerun
    passes).
  - Windows main-process crashes are v2 (SPEC D11).

- Some channels still say "No guide information" on the owner's provider; Account > Provider > Check the guide shows
  what the provider sends (the guide has a full-table fallback and a clock-offset fix, untested on the real provider).
- The Home rows' source on his TV: Account > Provider shows "TMDB: working · N of M Home rows from TMDB" (or the error).
- The WebView draws just-off-screen content ahead (a memory cost). Since 9 Nov it's off while the player is up (`MainActivity`
  onPause/onResume) after AIRGLOW-3 (the page killed for memory behind the player); if the app still reloads by itself, turn it off for good.
- Released in 0.4.125 (8 Nov): the file's own English subtitles first, the Copies lists' extra facts, English
  descriptions via TMDB. Next up: themes (Grizzlies, OLED black, mood ones). Unbuilt bits are in `NEXT.md`.
- English first everywhere (the owner's rule, 7 Nov): `copies.js` `rank()` puts English first whatever Shown first
  says; subtitles likewise (`subs/opensubs.js` `choose()`, `Subs.java`); descriptions in English (`addons.js`
  `looksEnglish`, `englishText`, `tmdbOverview`; `tests/english-test.js`). A blanked description is looked up again
  (`englishPlot`: Cinemeta by IMDb id or exact name, then TMDB); metas kept before the 9 Nov check are fetched again (`EN_CHECK`).
- Progress after the page dies behind the player (AIRGLOW-3): `player.js` keeps the play in `playingNow` and the page that
  comes back takes it over (`info().playing`), or saves the retained `exit` event's position.
- Accounts sync (`account/sync.js`): a record the server refuses waits on the device (`waiting`), the rest syncs; the
  first sign-in's merge retries (`flow.js` `mergeLater`); Account's sync line names the reason (`problemText`).
