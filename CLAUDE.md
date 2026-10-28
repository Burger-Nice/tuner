# airglow (repo name: tuner)

An ad-free IPTV app for Xtream Codes and M3U providers, built for one owner: a Memphis Grizzlies fan who watches on a
Philips 55" OLED (55OLED810/12, Google TV) with the remote. The TV app comes first; the Windows and phone builds
exist but are on hold. The brand is "airglow" (the repo and Android package are still `tuner` / `app.tuner`).
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
- `app/core.js` providers (Xtream + M3U, with `catchup()` replay links), settings and storage. `app/nba.js` ESPN's public JSON. `app/titles.js` title matching.
- `android/app/src/main/java/app/tuner/player/`: `PlayerActivity` (Media3 player and its overlays: channel list,
  game panel, options, quality, subtitles…), `TunerPlayerPlugin` (the JS bridge, updater, UI sounds), `ListPanel`,
  `GamePanel`, `VodControls`, `Ui` (tokens, icons); the diagnosis `Diag`, `PathView`; catch-up `Timeline`, `Replay`, `Card`,
  `LivePause`; the copy check `Probe`, subtitles `Subs`, `SrtTrack`; add-ons `Handover` (hand a link to another app),
  `PhonePage` (the page a phone opens to type into the TV), `Launch`. Each feature's native side: its `PORT-NATIVE.md`. JS → native via `command` (meta, game, ring, tune, queue, versions…);
  native → JS via events (track, need, pick, version, progress, setting, exit…).
- `scripts/build-web.js tv` builds `www/` for the TV APK.

## Build, test, release

- Local: `tests/tv/serve.sh` starts the fake provider + fake ESPN (127.0.0.1:8899, demo/demo) and serves the app at
  127.0.0.1:8777/tv.html. `node tests/tv/drive.js <outdir> <script>` drives it with the remote's keys in Playwright
  and takes screenshots (see `tests/tv/example-layout.js`). `tests/tv/serve.sh --test` + `node tests/tv/walkthrough.js
  <outdir>` runs the CI walkthrough in a browser (the 3 native-player checks can't pass there; restart the fake provider
  between walkthrough runs, it keeps the reports). NBA page scripts: `tests/tv/nba-{host,league,news,team}.js`, and the
  bug-hunt scripts `tests/tv/hunt-*.js`. Home: `tests/tv/home-{marquee,gamenight,rows,cold,library,curate}.js` (a fake TMDB,
  `tests/mock-tmdb.js`, on the fake provider; `home-common.js` seeds an owner-like history).
- CI (`.github/workflows/build.yml`, `gh workflow run build.yml --ref tv-redesign`) builds Windows, Android, iOS and runs
  `tests/android-test-boot.js` on an Android TV emulator (45 checks; the run fails if a check fails or the test doesn't finish). Its screenshots and `reports.json` are uploaded
  to the `android-test` release as `android-test-shots.tgz`.
- Local Android build: the SDK is at `/root/android-sdk`: `export ANDROID_HOME=/root/android-sdk; node scripts/build-web.js tv;
  npx cap sync android; cd android && ./gradlew assembleDebug --no-daemon -q` (Maven sometimes answers 429: retry).
- Work on `tv-redesign`. Pushing it to `main` releases v0.3.<run> (bump the middle number in `build.yml`'s `VERSION` for
  each big release, 1.0 once it's solid on the TV; the TV orders updates by the run number, not the name) and the TV updates itself from `android.json`.
  **The release job doesn't wait for the emulator test**, so run CI on `tv-redesign` and see it pass first.
- On the owner's TV over adb (same network): see `NEXT.md`.

## Owner's rules

- Wait for an explicit "release" (or "go") before pushing to `main`.
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

- Some channels still say "No guide information" on the owner's provider; Account > Provider > Check the guide shows
  what the provider sends (the guide has a full-table fallback and a clock-offset fix, untested on the real provider).
- Minor: Search's ▼ past the last result jumps to the keyboard; the channel-number toast can cover a guide row.
- Built and passing CI, not yet on the TV: catch-up / rewatch, subtitles + real quality, add-ons. Unbuilt bits are in `NEXT.md`.
