# airglow: next round

Where things stand: v0.2.66 is on the TV (Philips 55OLED810/12); catch-up, subtitles + real quality and add-ons are
built on `tv-redesign` and pass CI. The TV app lives in `app/tv/` (HTML/CSS/ES modules in a Capacitor WebView) and
`android/app/src/main/java/app/tuner/player/` (the native Media3 player and the Capacitor plugin).
Pushing `tv-redesign` to `main` releases (version 0.2.<run>), and the TV updates itself from `android.json`. Work happens
on `tv-redesign`; CI there (`gh workflow run build.yml --ref tv-redesign`) builds and runs the emulator test
(`tests/android-test-boot.js`) before anything is merged to `main`.

## Done (see CONTEXT.md)

Team and League pages, best-quality game channel, the playback diagnosis, catch-up / rewatch, subtitles + real quality
per copy, add-ons (Stremio protocol, direct links only).

## Left from the built features

- **Catch-up:** pause / rewind on live turning into the programme's replay, "Try a replay" on a failed channel, the
  "expired" caption on a replay past the archive's days (`design/ui-v1/catchup/SPEC.md`).
- **Subtitles:** subtitle add-ons other than OpenSubtitles are fetched but not listed in the Subtitles sheet.
- **Add-ons:** what `design/ui-v1/addons/SPEC.md` marks for later. Torrents stay out (direct links only).
- **Out of scope for now:** VOD "Pause and load ahead".

## Next features

1. **Reminders.** Set from a guide programme or a game. In the app: a card at the right moment. Over other apps
   (PS5 on HDMI): an overlay card ("tips off in 5 min · OK to watch") using "Display over other apps", fired by an
   exact alarm even when airglow isn't open; OK switches to airglow and tunes. If the TV won't draw over HDMI,
   fall back to a notification and the in-app card.
2. **Google TV home screen.** Continue watching and "your team plays tonight" on the TV's own home screen (Watch
   Next via androidx.tvprovider, or whatever Google TV on this Philips actually shows).
3. **Multiview.** Two games side by side (two ExoPlayers), if the TV's chip decodes two streams at once.
4. **A web version** (a friend's VIDAA TV): needs a hosted server for the provider's streams; ask the owner first.

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

## House rules

In `CLAUDE.md` (read automatically by Claude Code).
