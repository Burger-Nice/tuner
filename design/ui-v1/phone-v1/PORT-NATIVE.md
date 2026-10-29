# airglow iPhone v1.1: the native side (short)

Everything is HTML in the Capacitor WebView: the tab bar, the sheets (`ui.js` `openOverlay`), the long-press menus,
the search field, and the player (an HTML5 `<video>` with the v2 controls in HTML). No native screens, no big plugin.
What iOS has to be told is below; it is all configuration plus the small bits the existing phone build already has.

## The WebView (`ios/App`, Capacitor 8)

| Setting | Value | Why |
|---|---|---|
| `allowsInlineMediaPlayback` | true (Capacitor's default for `WKWebViewConfiguration`) | the video plays inside the page, not in the system full-screen player |
| `allowsPictureInPictureMediaPlayback` | true (default) | `video.webkitSetPresentationMode('picture-in-picture')` works (app.js 1194 already calls it) |
| `mediaTypesRequiringUserActionForPlayback` | `[]` | `play()` from the app's own tap handlers, resume after a tune, Up next |
| `allowsAirPlayForMediaPlayback` | true (default) | the `<video>` gets AirPlay; the picker is `video.webkitShowPlaybackTargetPicker()` (WebKit), with `x-webkit-airplay="allow"` on the element |
| `viewport-fit=cover` in `phone.html` | | the page draws under the island and the home indicator; the layout uses `env(safe-area-inset-*)` |
| `capacitor.config.json` `ios.contentInset: "never"`, `scrollEnabled: false` | as today | the app scrolls its own lists |
| the status bar | hidden by the app while the player is in landscape (`StatusBar` plugin, already a Capacitor core plugin), light content elsewhere | `07` |
| `UISupportedInterfaceOrientations` | portrait + both landscapes (as today) | the player rotates; the tabs lock to portrait from JS (`screen.orientation.lock('portrait')` is not on iOS Safari: use the `@capacitor/screen-orientation` plugin, `lock({ orientation: 'portrait' })` on the tabs, `unlock()` in the player) |

## `Info.plist` (what is there and what is added)

Already there (`ios/App/App/Info.plist`): `NSAppTransportSecurity` › `NSAllowsArbitraryLoads` (providers are plain http),
`UIBackgroundModes` › `audio` (sound and PiP keep going), `UIStatusBarStyle` light, `NSLocalNetworkUsageDescription`.

Add:
- `NSLocalNetworkUsageDescription` text: "airglow talks to your provider and to your TV on this network" (unchanged key).
- `LSApplicationQueriesSchemes`: `infuse`, `vlc-x-callback`, `vlc` (the MKV hand-off below; iOS refuses `canOpenURL` on
  schemes not listed).
- `UIRequiresFullScreen` false (as is). No camera key: there is no scanner in v1.1.

## The audio session

Capacitor's WebView uses the shared `AVAudioSession`. In `AppDelegate` set it once:
`try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)` and `setActive(true)` before the
first play, so the video plays with the silent switch on, keeps playing in the background (with the `audio` mode) and
shows on the lock screen. The lock screen / Now Playing text comes from the `<video>`'s media session
(`navigator.mediaSession.metadata`): **title and artwork go through the shield** (`games.js` `namesOf` / the masked
name), never ESPN's headline.

## The streams

1. **Live, Xtream:** ask for the HLS form first, `/live/<user>/<pass>/<id>.m3u8`; the `<video>` plays it natively
   (`canPlayType('application/vnd.apple.mpegurl')`, app/player.js 67). **Check the owner's line answers `.m3u8` before
   the build** (some panels have HLS output off). If it does not, the `.ts` form plays through `mpegts.js` 1.8.2 over
   `ManagedMediaSource` (iOS 17.1+; mpegts.js has the MMS path, app/player.js 72) — same element, so PiP, AirPlay and
   background audio still work for the element (AirPlay of an MSE stream mirrors; say so in Options › Connection).
2. **Catch-up and replays:** the provider's `timeshift` / `streaming` URLs, HLS where offered, else as 1.
3. **Add-on copies:** `copies.js` gains a **plays-here** term on iOS: MP4 / M4V / MOV (H.264 or HEVC, AAC) and HLS rank
   first; MKV, AVI, DTS / TrueHD audio rank last and are marked `MKV` on the card. A title whose only copies are MKV
   shows `Open in Infuse` (or VLC) on the title page: `infuse://x-callback-url/play?url=<encoded>` and
   `vlc-x-callback://x-callback-url/stream?url=<encoded>` (the TV's `Handover` idea, as a URL scheme). Subtitles for a
   handed-off copy are not carried.
4. **The connection limit:** `core.js` reads the Xtream account info (`max_connections`, `active_cons`); the player's
   diagnosis card has a named state `Your provider allows 1 stream · the TV is using it` when a stream fails and
   `active_cons >= max_connections`.

## The build and delivery

- `scripts/build-web.js phone` builds `www/` from `app/phone.html` + `app/tv/js` (the data modules) + `app/phone/`
  (the views) and must copy `capacitor.js` as the `tv` target does (line 35); then `npx cap sync ios`.
- Delivery stays **AltStore** (CONTEXT.md): a side-loaded IPA re-signed every 7 days; no App Store review. The owner's
  Apple ID signs it. Updates: the phone shows the TV's version beside its own in Account › Updates and says "AltStore
  refreshes it".
- `@capacitor/screen-orientation` and `@capacitor/status-bar` are the only plugins beyond the core (`App`, `Http`).
