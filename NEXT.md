# airglow: next round

Where things stand (8 Nov): v0.4.125 is on the TV (Philips 55OLED810/12); the iPhone app (AltStore) and the Windows
app ship from the same release. 0.4.125 has the file's own English subtitles first, English descriptions (Cinemeta,
then TMDB), and the Copies lists' extra facts (sound, codec, size, language, release group); its iPhone test passed,
the TV emulator passed on the version just before. The TV app lives in `app/tv/`, the iPhone's in `app/phone/`,
Windows' in `app/desktop/` + `main.js`
/ `mpv.js`; all three share `app/tv/js`. Pushing `tv-redesign` to `main` releases v0.4.<run>; the TV updates itself.
CI: `gh workflow run build.yml --ref tv-redesign -f tests=both|tv|phone|windows`.

**Built, not released (8 Nov):** error reports through Sentry on all three apps (`design/ui-v1/error-reports/`):
the Sentry project `airglow` (EU) is set up, and Account › About/App has "Send error reports" and "Send a report now".
Themes are on hold: the owner wants them redone with his design plugins and may do a full rebrand first
(`design/ui-v1/themes/RESEARCH.md` holds the research).

**Open (8 Nov): sound out of sync on add-on episodes** (his report, after 0.4.127):
- TV speakers, a steady delay, add-on (Stremio) episodes. Switching to another copy a couple of times fixed it.
- The next build has Media3 1.6.0 → 1.11.1. Its 1.8.0 notes list better start-up when audio doesn't begin exactly at
  the requested position, which is what a resume does.
- "Send a report now" now carries what's playing: sound format, channels, `audioOut` (pcm = decoded, eac3/ac3/dts =
  passed to the TV's chip), container, resumed, underruns.
- If it comes back, ask him for a report while it's off, and read it in Sentry.

**First thing to check with the owner:** after 0.4.119, did his TV's add-ons and movies come back (Account's sync line
should say Synced)? If not, the line now names the reason (code, or file:line).

## Done (see CONTEXT.md)

The iPhone app v1 and its NBA tab, the Windows app (desktop-v1), airglow accounts and sync, English first (copies,
sound, descriptions, subtitles), speed pass 2 (instant Home logos).

Team and League pages, best-quality game channel, the playback diagnosis, catch-up / rewatch, subtitles + real quality
per copy, add-ons (Stremio protocol, direct links only).

## Left from the built features

- **Catch-up:** pause / rewind on live turning into the programme's replay, "Try a replay" on a failed channel and in
  Account > Provider, Check the guide's Replays line per kept channel, the "expired" caption on a replay past the
  archive's days (`design/ui-v1/catchup/SPEC.md`). After a matched re-air, the next
  programme shows its real start, not `·` (S3).
- **Subtitles:** subtitle add-ons other than OpenSubtitles are fetched but not listed in the Subtitles sheet. RANKING.md
  4.3's series rules: "This episode's length is unusual for this series" (`episodeNote` unused) and a series made Sure by
  its episodes' lengths (`imdb.js` never passes `epLens`).
- **Add-ons:** what `design/ui-v1/addons/SPEC.md` marks for later. Torrents stay out (direct links only). From bug hunt 2:
  Home asking ahead for
  the first Continue watching add-on card (SPEC 5.4); the setup card without a Stremio sign-in (the phone page has no
  paste-the-setup state, SPEC 3.5/3.7); Search's "4K from Northlight" on a provider title (SPEC 6); "Only titles your
  provider has" counting add-ons that give no copies (S10); Back from the Add-ons list landing on the avatar (SPEC 2.2).
- **Out of scope for now:** VOD "Pause and load ahead".

## airglow accounts (built, design/ui-v1/accounts-v1)

The Worker is live at `https://acct.airglow-tv.workers.dev` (CI's `accounts` job deploys it on manual runs of
`tv-redesign` and on `main`). What the owner does once: make his account on the iPhone or the PC with
`Create an account with an invite`, typing his `AIRGLOW_OWNER_CODE` phrase in the invite field; keep the recovery key.
Then the TV: Account › airglow account › Sign in on your phone (or the first screen). Open items: SPEC §11 (an
`airglow://` QR, whether the three-letter step shows on his home network, the in-app scanner, Argon2id).

**Never rename or delete the `acct` Worker:** its `PEPPER` goes with it, and then nobody can sign in again or recover
(signed-in devices keep working; the data stays safe). Rotate with `PEPPER_PREV`, never by deleting.

## Small things left from 7–8 Nov
- The owner's TV: confirm the sync recovered (above). Windows: still no report from his laptop.
- Subtitles: the "file's own English first" switch is untested against a real file with several text tracks; the
  iPhone (HLS) rarely has in-stream text tracks and still uses OpenSubtitles.
- Descriptions: an add-on title with neither an IMDb nor a TMDB id keeps no description rather than a foreign one.
- Ideas offered on 7 Nov (his pick pending): the Google TV home screen row, reminders over other apps, skip intro
  from chapters / learnt per show, Home asking ahead for the first Continue watching copy (instant play), multiview.

## Next features

The owner's pick list (29 Oct), in my suggested order:
1. **Reminders.** Set from a guide programme or a game. In the app: a card at the right moment. Over other apps
   (PS5 on HDMI): an overlay card ("tips off in 5 min · OK to watch") using "Display over other apps", fired by an
   exact alarm even when airglow isn't open; OK switches to airglow and tunes. If the TV won't draw over HDMI,
   fall back to a notification and the in-app card.
2. **Google TV home screen.** Continue watching and "your team plays tonight" on the TV's own home screen (Watch
   Next via androidx.tvprovider, or whatever Google TV on this Philips actually shows).
3. **Multiview.** Two games side by side (two ExoPlayers), if the TV's chip decodes two streams at once.
4. **Skip intro backup.** When TheIntroDB doesn't know an episode: the file's "Intro"/"Credits" chapters, or learnt per
   series (he skips once by hand; the next episodes offer the same skip). The owner still owes us: Options > Intros in
   this show on an episode with no chip ("Not known for this episode" or not).
5. **A simple mode for his mom's TV:** big text, fewer rows, Icelandic first, no NBA unless she wants it.
6. **A web version** (a friend's VIDAA TV): needs a hosted server for the provider's streams; ask the owner first.

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
