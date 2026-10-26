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
  - `js/games.js` NBA: scoreboard, box scores, the spoiler shield, the per-channel score delay, which channels carry a game.
  - `js/player.js` talks to the native player (commands and events). `js/sfx.js` UI sounds (Android SoundPool via the
    plugin for no delay; Web Audio for the launch sound). `js/launch.js` the launch animation.
  - `js/screens/` home, live (the guide), nba (hub), game, lib (Movies/Series), detail, search, saved, account, first (sign-in).
  - Styles: `ui.css` (the design kit) and `app.css` (app-specific), `launch.css`.
- `app/core.js` providers (Xtream + M3U), settings and storage. `app/nba.js` ESPN's public JSON. `app/titles.js` title matching.
- `android/app/src/main/java/app/tuner/player/`: `PlayerActivity` (Media3 player and its overlays: channel list,
  game panel, options, quality, subtitles…), `TunerPlayerPlugin` (the JS bridge, updater, UI sounds), `ListPanel`,
  `GamePanel`, `VodControls`, `Ui` (tokens, icons). JS → native via `command` (meta, game, ring, tune, queue, versions…);
  native → JS via events (track, need, pick, version, progress, setting, exit…).
- `scripts/build-web.js tv` builds `www/` for the TV APK.

## Build, test, release

- Local: `tests/tv/serve.sh` starts the fake provider + fake ESPN (127.0.0.1:8899, demo/demo) and serves the app at
  127.0.0.1:8777/tv.html. `node tests/tv/drive.js <outdir> <script>` drives it with the remote's keys in Playwright
  and takes screenshots (see `tests/tv/example-layout.js`). `tests/tv/serve.sh --test` + `node tests/tv/walkthrough.js
  <outdir>` runs the CI walkthrough in a browser (the 3 native-player checks can't pass there).
- CI (`.github/workflows/build.yml`, `gh workflow run build.yml --ref tv-redesign`) builds Windows, Android, iOS and runs
  `tests/android-test-boot.js` on an Android TV emulator (14 checks). Its screenshots and `reports.json` are uploaded
  to the `android-test` release as `android-test-shots.tgz`.
- Work on `tv-redesign`. Pushing it to `main` releases v0.2.<run> and the TV updates itself from `android.json`.
  **The release job doesn't wait for the emulator test**, so run CI on `tv-redesign` and see it pass first.
- On the owner's TV over adb (same network): see `NEXT.md`.

## Owner's rules

- Wait for an explicit "release" (or "go") before pushing to `main`.
- Commit as `git -c user.name="Tuner" -c user.email="birgirsveinn@gmail.com"`; no AI model names in commits or code.
- Never commit the Android signing key or its password (only in the `TUNER_KEY_PASSWORD` secret; never ask for it).
  Don't make the repo private.
- Design and brand work: a brand/UX agent designs, an independent reviewer scores it (out of 10), and it goes back
  below 7.5 (never tell the reviewer the bar). Brand and design history: `design/` (brand-v5, ui-v1/UI-SPEC.md, sound-v1).
- Team colours are the teams' real colours. The sounds' design is final; they just have to play instantly.
- The owner writes casually and tests on the real TV. Explain in plain words, say what you verified and what you
  couldn't, and ask before anything outward-facing.

## Known open items

- Some channels still say "No guide information" on the owner's provider; Account > Provider > Check the guide shows
  what the provider sends (the guide has a full-table fallback and a clock-offset fix, untested on the real provider).
- Minor: Search's ▼ past the last result jumps to the keyboard; the channel-number toast can cover a guide row.
