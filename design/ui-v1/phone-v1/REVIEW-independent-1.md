# airglow iPhone v1: independent review 1

Reviewed: `SPEC.md`, the nine mocks (`01`–`09` HTML and `png/` at 3×), `contact-sheet.png`, `phone.css`, against the TV
designs they translate (`home-final/png/01`, `04`; `player-v2/png/01`, `06`) and the code the SPEC says it reuses
(`app/tv/js/*`, `scripts/build-web.js`, `android/.../player/PhonePage.java`, `ios/App`). Benchmarks: the ESPN, NBA,
YouTube TV, Apple TV and Netflix iPhone apps as they stand in 2026. Coordinates are in pt (393 × 852 frame).

**Overall: 7.2 / 10.** It's a faithful, on-brand translation that looks like the TV app and gets the owner to his
team's game in one tap. What holds it back is the build: the SPEC asks for native SwiftUI parts in a WebView app,
leaves open where the player's controls live, and gets some facts about the TV's code wrong.

---

## 1. The design, screen by screen

### 01 Home, a normal evening
- **What works.** It reads as the TV's Marquee right away: the eyebrow, the Severance logo, the facts with the `4K`
  badge, the bar, `Resume` as the one pink pill, and three unlit lines in Outfit at reduced opacity. The 44 pt unlit
  rows (y 494–600) meet the target. The art is used well, and the gradient pill against the dark glass card looks premium.
- **The card covers the face.** The card starts at y 238, about where Mark's face sits in the 470 pt picture. All you
  see of the art is the ceiling and the top of a head. Apple TV and Netflix put the title on a bottom scrim over the
  lower third and keep the subject clear. Here the subject is boxed out. Use `--pos` per title to pull the subject
  higher, or move the card down about 40 pt and lighten its fill so the art shows through.
- **The row title crams three things into one line (y 640).** `Comedy for you` + `Because you watch...` + `15 rows ▾`
  in 393 pt cuts the reason down to "Because you watch...", which tells him nothing. The reason is the whole point of
  the line (home-final §rows). Put the reason on its own 13 pt line under the title, and keep `15 rows ▾` at the right
  of the title.
- **The first row is mostly below the fold.** Only about 100 pt of posters shows above the tab bar. That's acceptable
  because the Marquee is the point, but say so in the SPEC: the first row is meant as a peek, not a row to browse.
- The `…` disc is 40 pt across (y 420). Give it a 44 pt hit area.

### 02 Home, game night
- **Strongest screen.** The two team colour fields with the 12° split, crests on discs, `as of tip-off` under both
  records, the italic `ON NOW` slab and the `Score hidden` plate are true to the TV's `04-game-night` and stronger
  than anything ESPN or the NBA app put on a home screen. `Watch live` and `From tip-off` are side by side, one tap each.
- **The card uses 5° here, against 12° everywhere else.** The SPEC explains why (width), but beside the 12° split
  right above it, the card looks slightly off rather than chosen. Either take the card to 12° with a narrower inner
  inset, or drop the skew on the card and leave the Sharp angle to the split and the plates.
- **The NBA tab's label disappears (tab bar, y 790).** The `LIVE` pill takes the place of the word `NBA`. A tab's
  label shouldn't change; Apple's tab-bar rule is to keep it stable. Keep `NBA` and set a compact LIVE pill (or the
  red dot) on the icon's top-right corner, like a badge.
- The `Tonight in the NBA` title line has the same three-in-one-line crush as on 01 (`6 games · 2 live...`).

### 03 Live
- **What works.** The rows (number · tile · channel ★ · programme · bar · times) are the YouTube TV pattern done
  well. The `Last watched` card is a good stand-in for the TV's Now panel, and the group chips are right.
- **`Next …` is truncated to two letters on every row** (`Next Fr...`, `Next Gr...`, `Next N...`). The SPEC's §1 says
  keeping Next is the reason this guide beats YouTube TV's. In the mock it carries no information. Give the times
  and Next their own line (use the 55 pt progress bar as that line's leading element and drop the `to`: `20:35–20:55 ·
  Next Fréttir`), or drop the end time on the row.
- `Super Sunday: Liverp...` is cut off by the LIVE pill. Put the pill on the channel-name line (y 497), where
  there's room.
- The star after every channel name in the `Favourites` group repeats itself. Show it only in `All channels` and the
  provider's groups.
- `• ☰ Favourites 10` stacks a dot and an icon in one chip. Keep one of them.
- The hint `Tap plays · swipe to favourite` should follow the TV's hint rule (shown 5 times, then gone), not stay for good.

### 04 NBA hub
- **What works.** The hero with the pink tip-off slab is ESPN-grade. The full-width game cards with team-colour edges,
  crests, records and the skewed time plate look like ESPN's Scores list, which he knows. Section chips that run off
  the right edge are the right affordance.
- **The hero's game shows twice.** The first card in the list (y 474) is the same Grizzlies game as the hero right
  above it. On a phone that costs a whole screen-height of attention. Leave it out of the list when it's the hero, or
  collapse it to a one-line `Your team · in the card above`.
- Hero eyebrow `YOUR TEAM  NBA · TIP-OFF`: a double space where a separator belongs. Use `Your team · NBA · Tip-off`.
- `Watch pre-game` and `Remind me` are 40 pt tall (`.nb-hero .act`). The main action on the tab should be 44 pt or more.
- The Thu 02:00 game is filed under `Today · 28 Oct`. That's correct (ESPN's US date, "tonight"), but `Thu ›` right
  beside it invites confusion. The card's `Tonight` status line already covers it, so this is a nit.

### 05 Title page (series)
- **What works.** This is the cleanest screen: the logo at 54 pt, the facts with outlined badges, a two-line plot,
  `Resume S2 · E3` as the pill, `Saved` and CC, and episodes as a list with ticks, progress and the current episode in
  pink. It matches Apple TV's series page.
- **The copy line wraps onto two lines and runs into the season chips** (y 462–480, about 6 pt gap). Give 12–16 pt
  above the chips, or shorten it to one line (`4K HDR, 5.1 · best of 3 · Icelandic subs`) with the add-on name on tap.
- The back and `…` discs are 40 pt. Give them 44 pt hit areas.
- Episode 3's text slides under the tab bar with no fade. The SPEC's 120 pt fade isn't drawn in this mock.

### 06 Player, portrait (the game)
- **What works.** The 16:9 video under the island, `Score hidden / You're in Q2` in the corner, the TV's track with
  chapter ticks up to the live point and the dashed `ahead`, `Skip to Q3` / `Back to live` / `Game`, and the zap ring
  as a list that marks which channels carry the game. The shield is intact.
- **It's too dense, and the controls are in non-iOS places.** Under the video there are five stacked bands
  (transport, actions, a 5-button iOS row with labels, then Channels). ESPN, YouTube TV and Apple TV all put
  **AirPlay and PiP on the video's top bar**, and Apple's player folds **subtitles and audio into one button**.
  Move AirPlay and PiP onto the picture (top-right, beside the corner block, or the corner block moves under the
  video), merge Subtitles and Audio into one menu, and keep Options. That removes the iOS row (about 80 pt) and lifts
  the Channels list into view.
- **Channel up/down chevrons in the transport row (`^` `v` beside pause)** read as collapse/expand on a phone, not as
  zapping. Nobody zaps with buttons on iPhone, and the ring list just below does the job. Drop them from portrait (keep
  −1 m · pause · +1 m), or label them `CH`.
- **The close chevron points down** (y 70), which on iOS means "minimise to a mini player" (YouTube, Music). There's
  no mini player in this round (open item 4). Use an X or a back chevron until there is.
- `Back to live` has a red-outlined chip *and* a LIVE pill inside it. One red signal is enough: the pill on a neutral chip.

### 07 Player, landscape (an episode)
- **What works.** It's the TV's `player-v2/01` almost exactly: the title block, `Ends 21:02`, the buttons row, the
  track and the ends row. Very faithful.
- **It contradicts the SPEC.** The SPEC (and `phone.css` line 28) says the video is aspect-fit with about 65 pt of black
  at each side. The render runs the art edge to edge under the island side, and the status bar shows. iOS hides the
  status bar in landscape on Face ID iPhones, and a playing video should too. Render it as specified: black sides and
  no status bar.
- The title block crowds the top edge: the logo's top is about 20 pt from the edge, and it sits against the status-bar
  clock. Once the status bar is gone this is fine. Keep about 24 pt of top inset.
- The numbers disagree: `21 min left` against `−25:50`, and at 20:49 `Ends 21:02` means 13 min left. This comes from
  the TV mock, but the phone is where he'll check it. Make the three agree.
- The 9 buttons in one row sit between the face and the bar. That's acceptable in landscape. All are 44 pt or more.

### 08 Account
- **What works.** Clean iOS grouped lists, the right groups, brand-pink switches, and the team crest as the row icon.
  It looks like a settings screen should.
- **No way back.** The tab bar shows `Home` selected, there's no back chevron, and the page shows its own avatar
  top-right. Account opens from the avatar, so present it as a pushed page with a back chevron (and no avatar), or
  as a large sheet with `Done`. Netflix and the NBA app both use the sheet.
- `Expires 19 Nov · 24 days left · 1,...` is truncated. Drop the channel count from this line (it's on the provider page).

### 09 Sign-in
- **What works.** The lockup, the one line, and `Sign in with your TV` with the six code boxes and a gradient
  `Scan the TV's code` pill. The pink-ringed next box is a nice touch. Doing it by hand comes second, which is the
  right priority for a man who must never type a provider password on a phone.
- `or sign in by hand` sits about 6 pt under the card, almost touching its edge. Give it 16 pt.
- The privacy line at the bottom runs under the home indicator (y 840). Scroll padding needs
  `env(safe-area-inset-bottom)`.
- Before the fields are filled, `Sign in` is a grey pill that reads as disabled-and-broken. Use the TV's ghost style,
  not a filled grey.

### Screens not mocked
Library (a whole tab), Search (a whole tab), the game page and box score with its shield covers, the channel's day,
the Reveal confirm, the long-press menu and the `15 rows` sheet aren't mocked. The SPEC describes them and the builder
can work from the TV, but Library and the game page are what he'll open most after Home. They should be mocked before
anyone polishes them.

---

## 2. Flow

| Task | Taps | Note |
|---|---|---|
| His team's game live, game night | 1 (Home › `Watch live`) | ESPN and the NBA app need 2–3 |
| The same, from tip-off | 1 (`From tip-off`) | |
| The game 5 h out | 2 (tap the game line, then the pill) or 2 (NBA tab › `Watch pre-game`) | fine |
| A channel | 2 (Live tab › row) | |
| Resume a show | 1 (Home › `Resume`) | |

The tap counts are excellent. These are the problems:
- **The gestures conflict in the player.** The SPEC gives the same surfaces several jobs: the system edge swipe leaves
  the player, a horizontal drag seeks 10 s (the landscape hint `‹ › swipe 10 s`), a vertical swipe zaps live, and the
  down-chevron suggests swipe-down to dismiss. On iOS a vertical swipe from the top edge is also Notification Centre.
  Assign them: **swipe down on the picture to dismiss** (portrait; the iOS norm), the X in landscape, no edge-swipe exit,
  zap by vertical swipe only in landscape and only inside the middle third of the picture.
- **Auto-hide in portrait is undefined.** The controls sit under the video, not over it. Say that only the video's
  own overlay (the corner block, the chips) hides after 4 s, and the bands under it stay put.
- **Watching at work hits the provider's stream limit.** Most Xtream lines allow 1–2 connections. If the TV at home is
  still on a channel, the phone's stream will fail or kick the TV. `core.js` already reads the account info. Show
  `Your provider allows 1 stream · the TV is using it` in the player's diagnosis card, not a generic stall.
- Back to the Live row or title page with `Resume` after leaving the player follows Apple's rule. Good.

## 3. Faithfulness to the TV app
Very high (9/10). It uses the TV's words (`Score hidden`, `as of tip-off`, `End hidden`, `From tip-off`, `Back to live`),
order, tokens, Sharp plates, LIVE pills, the card grammar and the copy line. Every departure is explained (the index
sheet, guide rows, the 5° card). One small loss: the TV's game-night facts line carries `Morant 27.8`, and the phone
drops it. That's fine, but say so.

## 4. The spoiler shield
Every screen holds: no unseen score, records `as of tip-off`, the track stops at the live point, `End hidden`.
These still need fixing:
- **§0.9's claim "the seen store shared with the TV through the provider account" isn't true and can't be.** Xtream
  holds no app data. The seen store (`games.js` `seenStore`) is per device in IndexedDB. Unsynced is spoiler-safe (a
  device can only over-hide), so v1 should say: per device, and the hand-off copies the TV's `{ upTo, ids }` once.
- **New phone-only surfaces must go through the shield:** the lock screen / Now Playing / PiP metadata
  (`externalMetadata` title and artwork: the masked name, never an ESPN headline), the `Remind me` local
  notification's text (open item 9), and any future widget or Live Activity. List them in §3.7 / §6 so the builder
  doesn't wire ESPN's game name straight into Now Playing.

## 5. Buildability (the weak part)

1. **The SPEC writes native SwiftUI into a WebView app.** `tabBarMinimizeBehavior`, `Tab(role: .search)`, `the
   system's search field in the tab bar`, `.presentationDetents`, `the system's context menu`, and Liquid Glass "under
   the system blur" are all native UIKit/SwiftUI. A Capacitor WebView build can't use them for its own HTML UI. Either
   (a) say they are HTML replicas (the tab bar as a fixed `backdrop-filter` pill, sheets from `ui.js`'s
   `openOverlay` with detent-like snap points, long-press as an HTML menu) and spec those, or (b) commit to a native
   shell, which is a different and much bigger project. (a) is the right call. Rewrite §0.2, §2, §0.14 and §3.6 to match.
2. **The player's architecture is undecided, and it's the biggest cost in the project.** "The controls are ours … in
   SwiftUI or UIKit" means re-writing the v2 bar, zap ring, game panel, options, the diagnosis and the subtitle
   renderer natively. Android's equivalent is about 12,300 lines of Java (`android/.../player/*.java`). The pattern
   proven in Capacitor apps is a native `AVPlayerLayer` view under a transparent `WKWebView`, with the controls in
   HTML reusing the TV modules' logic. The plugin only exposes the TV plugin's command/event contract plus AirPlay
   (`AVRoutePickerView` placed natively at a rect the web asks for), PiP and Now Playing. Pick this explicitly and
   write the iOS plugin's interface (commands, events, the video rect) in a `PORT-NATIVE.md`, as every other feature has.
3. **Which formats AVPlayer plays decides what works at all.** AVPlayer plays HLS and MP4/MOV only. (a) Xtream live is
   usually `.ts`. Most panels also serve `.m3u8`, but some lines have HLS output turned off. **Test the owner's line
   for `.m3u8` live before building anything.** It's his whole use case (NBA at work), and open item 2's fallback
   (mpegts.js in the WebView: no PiP, no AirPlay, no background audio) would gut the player. (b) **Stremio add-on
   direct links are very often MKV** (HEVC, E-AC3/DTS), which AVPlayer refuses. The SPEC doesn't mention it. On iOS
   the copy ranking (`copies.js`) needs a "plays on this device" term, and the SPEC needs a fallback: hand off to
   Infuse/VLC through their URL schemes, like Android's `Handover`, or bundle VLCKit. Without this, many films will
   show `best of 3 copies` and then fail.
4. **"Reused unchanged" overstates it.** The data modules port cleanly: `rows.js`, `guide.js`, `catalog.js`,
   `copies.js`, `league.js` and `state.js` import nothing from the UI, and `games.js` / `catchup.js` import only
   `launch.js`. But `screens/home.js` (1,162 lines), `screens/live.js`, `screens/detail.js` and `nba/hub.js` mix
   model, HTML, `focus.js`, `router.js` and `ui.js`. So do `replay.js`, `titlecopies.js` and `player.js`. Either the
   builder splits each screen into an exported model plus a TV view (a refactor the TV must survive), or the phone
   rewrites the views. Say which in §5, and correct the table.
5. **The hand-off's facts about `PhonePage` are wrong.** It listens on **8790** (not 8777). It runs **only while its
   screen is open, for 10 minutes at most**. It has **no `/ping`**. Its code is **6 digits with a 5-try lock** (not 6 of 32
   letters). Its job today is to *receive* from a phone, with a confirm on the TV. A `GET /handoff` that sends the
   provider password and TMDB key out is a new direction of trust. Keep the existing pattern: the QR carries
   host:port and a token. Only the QR path should work without the TV's confirm. A typed code should make the TV ask
   "Send your login to this phone?" before answering. Drop the subnet scan: iOS shows the Local Network prompt and
   scanning a /24 is slow. Use the QR, or have the user type the address the TV shows. iOS needs
   `NSLocalNetworkUsageDescription`, `NSAllowsLocalNetworking` (ATS for plain http on the LAN) and
   `NSCameraUsageDescription` (the scanner, a native or Capacitor barcode plugin). The phone's `www/` today doesn't
   ship `capacitor.js` (`build-web.js` adds it only for `tv`). The phone build needs it for any plugin.
6. **Hard-coded safe areas.** 59 / 34 pt is the iPhone 15 Pro. Use `viewport-fit=cover` and
   `env(safe-area-inset-*)` throughout (16 Pro is 402 × 874; an SE has no island).
7. **Native iOS work, listed:** the player plugin (AVPlayer and layer, AirPlay route button, PiP controller,
   `MPNowPlayingInfoCenter`, `UIBackgroundModes: audio`, `AVAudioSession .playback`), orientation forcing (a
   screen-orientation plugin), the QR scanner, local notifications for `Remind me`, haptics. Plus a decision for the
   owner on distribution (TestFlight needs a paid developer account, and an IPTV app may not pass external review,
   while internal testing skips it; AltStore re-signs every 7 days). That's outward-facing, so ask him before building.

---

## 6. Scores

| | Score | Why |
|---|---|---|
| Looks and craft | 7.5 | Premium on 02, 04 and 05: real art, Sharp plates, good type contrast. Let down by the card boxing the art on 01, the crammed row titles, truncated guide rows, the dense portrait player, and 40 pt targets claimed as 44 |
| Clarity | 7.5 | The hierarchy is clear and the TV's words carry. `Next N...`, `Because you watch...` and the duplicate hero card are information shown and then lost |
| Ease of use | 7.5 | One tap to the game live or from tip-off, one tap to resume. The player's gestures conflict, portrait auto-hide is undefined, zap buttons sit in the wrong place, and Account has no way back |
| Faithfulness | 9 | The TV app, translated, as he asked. Each departure has a reason |
| Buildability | 5 | Native APIs in a WebView, no player architecture, AVPlayer's format limits (TS, MKV) unaddressed, the reuse table overstated, the hand-off built on wrong facts about `PhonePage` |
| Brand fit | 8.5 | Tokens, Outfit/Inter, gradient, LIVE red kept for LIVE, Sharp only where it means sport |
| **Overall** | **7.2** | The design weighs most and is good, about 7.6 on its own. The SPEC isn't yet a plan a builder can start on without making the player and shell decisions himself |

---

## 7. Fix list

### Must fix
1. **§5 / §0.2 / §2 / §0.14 (shell):** replace the SwiftUI APIs (`tabBarMinimizeBehavior`, `Tab(role:.search)`,
   `.presentationDetents`, system context menus and search field) with the HTML equivalents the Capacitor build will
   actually draw, and spec them.
2. **§3.7 (player architecture):** decide on a native `AVPlayerLayer` under a transparent WebView, with the controls
   in HTML (recommended), versus native controls. Write the iOS plugin contract (commands, events, video rect,
   AirPlay/PiP/Now Playing) in a `PORT-NATIVE.md`.
3. **§6.2 + `copies.js` (playable formats):** verify the owner's line serves `.m3u8` live before the build. Add the
   MKV/HEVC answer for add-on links (a "plays here" ranking term plus an Infuse/VLC hand-off or VLCKit).
4. **§3.8 hand-off:** correct the `PhonePage` facts (port 8790, open only on its screen for 10 min, no `/ping`, a 6-digit
   code with a 5-try lock). Have the TV confirm before it sends secrets on a typed code. Drop the subnet scan. List the
   Info.plist keys and the camera scanner. Add `capacitor.js` to the phone build.
5. **06 portrait player:** AirPlay and PiP go onto the video, Subtitles and Audio merge into one, channel ± comes out
   of the transport row, the iOS row goes, and Channels moves up. Define what hides in portrait.
6. **Player gestures (§3.7):** one job per gesture. Swipe down dismisses, the X in landscape, no edge-swipe exit, the
   zap swipe only in landscape's middle third.
7. **03 Live rows:** `Next …` must be readable (its own line or a shorter time format). Move the LIVE pill off the
   programme line.

### Should fix
1. **01 / 02 row titles:** the reason on its own line under the title.
2. **01 Marquee:** keep the subject's face clear of the card (`--pos` or the card lower and lighter).
3. **02 tab bar:** keep the `NBA` label and badge the icon with LIVE.
4. **04 hub:** the hero's game not repeated as the first card. Hero buttons at 44 pt.
5. **08 Account:** a pushed page with Back (no avatar) or a sheet with `Done`. Untruncate the provider line.
6. **Everywhere:** 44 pt hit areas for the 40 pt discs and buttons (`.dt-back`, `.dt-more`, `.pv-close`, `.ph-top .ib`,
   `.nb-hero .act`, `.pv-act`). Safe areas through `env()`, not 59/34.
7. **07 landscape:** render as specified (aspect-fit black sides, no status bar). Make `Ends`, `min left` and the
   remaining time agree.
8. **Shield §0.9:** a per-device seen store, copied once by the hand-off. Add the shield to Now Playing / PiP
   metadata and the `Remind me` notification text.
9. **Stream limit:** a named diagnosis state for "the provider allows N streams, the TV is using it".
10. **Mocks for** Library, Search, the game page with its shield covers, and the channel's day.
11. **06 close control:** an X, not a down chevron, until there is a mini player.
12. **Distribution:** ask the owner (TestFlight internal vs AltStore) before the build. It needs his Apple account.

### Nits
- 02: the card's 5° against the 12° split. Pick one.
- 03: drop the star in the Favourites group. One of the dot or the icon on the `Favourites` chip. The hint retires after 5 showings.
- 04: the eyebrow separator (`Your team · NBA · Tip-off`). Look at `Today · 28 Oct` against `Thu ›` with a 02:00 game.
- 05: 12–16 pt between the copy line and the season chips. Draw the tab-bar fade.
- 06: one red signal on `Back to live`.
- 09: 16 pt above `or sign in by hand`. The privacy line clears the home indicator. `Sign in` as the ghost, not filled grey.
- 07: 24 pt of top inset for the title block.
- §3.1: say that the first row on Home is a peek, by design.
