# airglow: next round

Where things stand: v0.2.58 is on the TV (Philips 55OLED810/12). The TV app lives in `app/tv/` (HTML/CSS/ES modules in a
Capacitor WebView) and `android/app/src/main/java/app/tuner/player/` (the native Media3 player and the Capacitor plugin).
Pushing `tv-redesign` to `main` releases (version 0.2.<run>), and the TV updates itself from `android.json`. Work happens
on `tv-redesign`; CI there (`gh workflow run build.yml --ref tv-redesign`) builds and runs the emulator test
(`tests/android-test-boot.js`) before anything is merged to `main`.

## The features, in this order

1. **Catch-up.** Rewind live TV, "Watch from tip-off" on a game, and past programmes in the guide (◀ before now)
   for channels the provider archives (Xtream `tv_archive` / `tv_archive_duration`, the `timeshift` URL; M3U
   `catchup` attributes). Plays in the native player with a seek bar.
2. **Reminders.** Set from a guide programme or a game. In the app: a card at the right moment. Over other apps
   (PS5 on HDMI): an overlay card ("tips off in 5 min · OK to watch") using "Display over other apps", fired by an
   exact alarm even when airglow isn't open; OK switches to airglow and tunes. If the TV won't draw over HDMI,
   fall back to a notification and the in-app card.
3. **Team page and League page.** The team: schedule with tip-off and TV, recent results, record, roster with stats,
   news. The league: standings by conference (W-L, PCT, GB, streak, last 10), league leaders, team stat ranks, NBA
   news. ESPN's public JSON (site.api.espn.com, site.web.api.espn.com), like the existing scores in `app/nba.js`.
4. **Google TV home screen.** Continue watching and "your team plays tonight" on the TV's own home screen (Watch
   Next via androidx.tvprovider, or whatever Google TV on this Philips actually shows).
5. **Multiview.** Two games side by side (two ExoPlayers), if the TV's chip decodes two streams at once.

Questions to answer on the real TV first: the OS / API level, whether an overlay draws over an HDMI input, whether
"Display over other apps" can be switched on in Settings (or needs `adb shell appops set app.tuner
SYSTEM_ALERT_WINDOW allow`), what the Google TV home screen shows from a sideloaded app, how many decoders there are
(`MediaCodecList`, `getMaxSupportedInstances`), and what the provider sends for catch-up and the guide (the guide still
says "No guide information" on some channels: Account > Provider > Check the guide shows the raw answer).

## Working from a computer on the TV's network

1. On the TV: Settings > System > About > tap "Android TV OS build" 7 times to unlock Developer options; then
   Settings > System > Developer options > turn on USB debugging and Network debugging (or Wireless debugging).
   Note the TV's IP address (Settings > Network).
2. On the computer: install Android platform-tools (adb), then `adb connect <tv-ip>:5555` (Wireless debugging on
   Android 11+ may ask to pair first: `adb pair <ip>:<pair-port>` with the code shown on the TV). Accept the prompt
   on the TV.
3. Handy: `adb install -r Tuner-TV.apk` (from the latest release or a CI run), `adb logcat | grep -i tuner`,
   `adb exec-out screencap -p > tv.png`, and Chrome's `chrome://inspect` to debug the app's WebView on the TV.

## House rules (from the owner)

- Commit as `git -c user.name="Tuner" -c user.email="birgirsveinn@gmail.com"`. Never commit the Android signing key or
  its password (it lives only in the TUNER_KEY_PASSWORD secret; don't ask for it). Don't make the repo private.
- Wait for an explicit "release" before pushing to `main`.
- Brand and design work: a brand/UX agent designs, an independent reviewer scores it, and it goes back for another
  round below 7.5 (don't tell the reviewer the bar). Team colours are the teams' real colours.
- Sounds: the design stays as it is; they just have to be instant.
