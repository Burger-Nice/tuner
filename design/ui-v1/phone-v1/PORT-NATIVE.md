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

## The streams (built: review 2, M1)

1. **HLS only.** Live is `/live/<user>/<pass>/<id>.m3u8` (core.js's hls source); the `<video>` plays it natively
   (AVFoundation). **There is no MPEG-TS fallback**: CapacitorHttp buffers `fetch`, so mpegts.js never gets a live body,
   and without the patch Xtream panels send no CORS headers; on ManagedMediaSource mpegts.js would also switch AirPlay
   off. hls.js ships only for a desktop browser (the Playwright tests): the iPhone never loads it.
2. **Catch-up and replays:** core.js `catchup()`'s first link, the `.m3u8` timeshift form; From tip-off is replay.js's
   stand-in VOD mode (the first link, its progress on the window's scale), so the phone player draws the chapters, the
   live point and `End hidden` from what replay.js announces (`replay-started`).
3. **When a stream won't play:** a clear message on the video (`This stream won't play on this iPhone`, the provider's
   answer when known) with `Try again` and **Open in VLC** (`vlc-x-callback://x-callback-url/stream?url=<encoded>`, the
   `.ts` link for live); an MKV copy says `Only an MKV copy` with **Open in Infuse** (`infuse://x-callback-url/play?url=…`).
   The provider's limit is a named state (`Your provider allows 1 stream · another device is using it`, from the
   account info's `max_connections` / `active_cons`).
4. **Account › Provider › Check streams on this iPhone** tries a live channel's `.m3u8` (a sports channel first) and a
   catch-up `.m3u8` of a kept channel's finished programme the way the player does, and says plainly whether each
   plays here (the result is kept on the phone). That is the owner's day-one test.
5. **Add-on copies:** the plays-here term is `copies.js` key 3 (`playsNow`), given by the phone (`app/phone/detail.js`):
   MP4 / M4V / MOV / HLS play; a copy whose link or file name is MKV / AVI / WebM doesn't. A title with only MKV copies
   gets `Open in Infuse` as its pill and `Only MKV copies · Infuse or VLC plays them`.
6. **Day-one device tests** (can't be proven in CI): background audio on lock, automatic PiP when leaving the app (the
   PiP button always works), AirPlay to the TV.

## Plugins (installed as packages, not core)

`@capacitor/status-bar` (hides the bar in the landscape player; needs `UIViewControllerBasedStatusBarAppearance` true,
set) and `@capacitor/screen-orientation` (the tabs locked to portrait, unlocked in the player), both 8.x in
`package.json`; `npx cap sync ios` adds them to `CapApp-SPM`. `Remind me` is hidden in v1 (no local notifications yet).
The WebView's media flags are set in `SceneDelegate.swift` (`AirglowViewController`), the audio session in
`AppDelegate.swift`.

## The build and delivery

- `scripts/build-web.js phone` builds `www/` from `app/phone.html` + `app/tv/js` (the data modules) + `app/phone/`
  (the views) and must copy `capacitor.js` as the `tv` target does (line 35); then `npx cap sync ios`.
- Delivery stays **AltStore** (CONTEXT.md): a side-loaded IPA re-signed every 7 days; no App Store review. The owner's
  Apple ID signs it. Updates: the phone shows the TV's version beside its own in Account › Updates and says "AltStore
  refreshes it".
