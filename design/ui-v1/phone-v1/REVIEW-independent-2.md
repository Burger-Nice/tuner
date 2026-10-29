# airglow iPhone v1.1: independent review 2

Reviewed: `SPEC.md` (with its v1.1 changes), `PORT-NATIVE.md`, the ten mocks in `png/` at 3× and `contact-sheet.png`,
and `phone.css`. I compared them with the TV designs they translate (`home-final/png/01`, `04`; `player-v2/png/01`,
`09`), checked each point in `REVIEW-independent-1.md`, and checked the build claims against the repo
(`app/player.js`, `app/app.js`, `app/core.js`, `scripts/build-web.js`, `capacitor.config.json`, `package.json`,
`ios/App/App/Info.plist`, `node_modules/mpegts.js`). Benchmarks: the ESPN, NBA, YouTube TV, Apple TV and Netflix
iPhone apps as they are in 2026. Coordinates are in pt on the 393 × 852 frame.

**Overall: 8.0 / 10.** v1.1 is a real answer to review 1. The shell decision is now correct (everything in HTML,
nothing native beyond configuration). The portrait player is no longer crowded. Most of the visual should-fixes are
done, and done well. Two things are left before a builder starts. First, the fallback for streams that aren't HLS
can't work in this app as it is configured, and the doc says it can. That makes one test on the owner's line (live
*and* catch-up as `.m3u8`) a go / no-go for the build, not a note. Second, the Live guide still cuts off `Next`, which
v1.1 reports as fixed.

---

## 1. The design, screen by screen

### 01 Home, evening
- **Fixed, and better for it.** The card now starts below Mark's face (y ≈ 262), so the picture reads as a picture,
  the way Apple TV's and Netflix's heroes do. The row's reason (`Because you watch Always Sunny, The Office + 12 more`)
  has its own 13 pt line, and the line fits. The `…` disc is 44 pt. The doc now says the first row is a peek by design.
- **The facts line breaks badly.** `S2 · E3 · Who Is Alive? · 21 min left ·` wraps, leaving a separator at the end of
  line 1 and `Ends 21:02 [4K]` on line 2. Either break before the separator (draw each fact as an inline-block, with
  the separator attached to the start of the next fact) or drop `21 min left` here, because the bar already shows it.
  It's small, but it's the first thing he reads.
- Premium: yes. On craft it matches the Apple TV app's Continue card.

### 02 Home, game night
- **Still the strongest screen.** The `NBA` tab label now stays, with the LIVE badge on the icon's corner. The card
  has no skew, so the split and the plates are the only Sharp angles, and that reads as a choice. The reason line
  (`6 games · 2 live · 2 final · 2 later`) has room. Nothing from ESPN or the NBA app's home screen gets you to the
  game this fast.
- The `ON NOW` slab's top edge is about 3 pt under `3-0 · as of tip-off`. Give it 8 pt.
- `It's Always Sunny  Short · S18 · E10 · 2…` truncates. That's acceptable on an unlit line (it's a facts tail), but
  `Short` costs the room, so drop it on the phone.
- The first card in `Tonight in the NBA` repeats the game from the card above. This is fine on Home, because it's a
  row of the night's games, unlike the hub's list. Nothing to change.

### 03 Live
- **Partly fixed.** The LIVE pill now sits on the channel's name line, the programme name reads in full, the
  Favourites chip has one icon, and the stars are gone from the group. **But `Next` is still cut off on every row**:
  `Next Fréttir 2…`, `Next Grey's A…`, `Next NBA Co…`, `Next Match of…`, `Next NBA: Cel…`. The doc's line `until 20:55 ·
  Next Fréttir 20:55` repeats the time, because the next programme starts when this one ends. Drop the second time:
  `until 20:55 · Next Fréttir`. If that still doesn't fit, shorten the bar from 55 to 40 pt. This was must-fix 7, and
  v1.1 reports it as done.
- The `Now 20:41 · Wed 28 Oct` row runs straight into the hint `Tap plays · swipe to favourite` with no separator, and
  the hint touches the right gutter. Put the hint on its own 13 pt line, or shorten it to `Swipe to favourite`.
- `Last watched`: `112 · Sky Cinema Action HD · 2…` truncates, and the progress bar is drawn empty. Drop the channel
  number on this card, and give the bar its fill.
- Against YouTube TV's 2026 guide this list holds up, and keeping `Next` on every row is better than theirs, once
  you can actually read it.

### 04 NBA hub
- **Fixed.** The hero's game isn't repeated in the list. Both hero buttons are 44 pt. The cards look like ESPN's
  Scores list, with the Sharp time plates that are this app's own.
- The eyebrow still looks like a double space: `YOUR TEAM` then a wide gap before `· NBA · TIP-OFF`. It seems to be
  two spans with letter-spacing and a margin between them. Make it one string, `Your team · NBA · Tip-off`, as the doc
  says.
- The day-chip row ends in `6 games ·` cut off at the right edge, with a hanging separator. Either let it scroll as a
  chip or say `6 games` alone. `yours above` has no room.
- `AT` in Sharp italic between the two team rows is a nice ESPN-like detail. Keep it.

### 05 Title page (series)
- **Fixed.** The discs are 44 pt, the copy line fits on one line (`4K HDR, 5.1 · best of 3 · Icelandic subs · plays
  here`), and there are 16 pt above the season chips. This is the most Apple-TV-grade screen in the set.
- The tab bar shows `Library` selected, but the path in the mocks reaches this page from Home (`Resume` / the
  Marquee). A pushed page belongs to the tab it was pushed from. Make the mock agree with §2's stack model.
- The eyebrow `SERIES  DRAMA · SCI-FI · THRILLER` uses colour as its first separator. That's fine, and it matches
  the TV.

### 06 Player, portrait (the game)
- **Fixed, and now right for iOS.** The X is top-left. AirPlay and PiP sit on the video, top-right, where ESPN,
  YouTube TV and the system player put them. There's one `Subs & audio` button, the transport row has no zap
  chevrons, the shield corner sits on the bottom scrim, and the zap ring is in view without scrolling. The doc now
  defines what auto-hides (only the video's overlay). This is a clean, credible sports player.
- **The numbers disagree.** The corner says `You're in Q2 · 1:32 behind live`, but the track puts the thumb in Q2 and
  the live dot past Q3, a quarter and more ahead. 1:32 reads as one and a half minutes. The TV (`player-v2/09`) says
  only `You're in Q2`. Use the TV's words, or the real gap (`41 min behind live`). He will be watching this from
  tip-off at work, so it's the line he'll check.
- **Two gutter breaks.** The label `Subs & audio` is wider than its 44 pt disc and starts about 4 pt from the screen
  edge. The `Game` chip ends about 4 pt from the right edge. Both should sit inside the 16 pt gutter. Either drop the
  labels under the round buttons (the TV has none, and the sheet titles say what they are) or set the row with
  `justify-content: space-between` inside the gutters. Then tighten the action chips (padding 12 → 10) so the three
  fit.
- `[4K]` in the title block and `Mobile data · 720p` on the picture say two different things. When the data saver
  caps the stream, the badge should say what's playing (`720p`), or be dropped. See §5 on whether the cap can be
  enforced at all.
- The Q3 tick isn't drawn on the track (the label is). This is a nit.
- `Back to live` still has a red tint on the chip as well as the pill (`.pv-act.tolive`, 12 % red). It's much quieter
  now, so this is a nit.

### 07 Player, landscape (an episode)
- **Fixed.** No status bar, 65 pt black at both short edges, a 25 pt top inset, and `Ends 21:02 · 13 min left ·
  −12:50` with the bar at 72 %, which all agree. It is the TV's `player-v2/01` on a phone, very faithful. The four iOS
  buttons (CC, AirPlay, PiP, Options) sit at the right of the buttons row, and every target is 44 pt or more.
- **A game in landscape isn't specified.** §3.7 describes landscape for an episode, and for live channels (the
  banner), but not for the case the owner cares about most: a game from tip-off, rotated. Add one line: landscape for
  a game is `player-v2/09` (the title block, `Score hidden / You're in Q2` top-right, −1 m / +1 m, `Skip to Q3`,
  `Back to live` and `Game` on the left of the buttons row, the iOS four on the right, and the track with its chapter
  ticks and `End hidden`). The builder shouldn't have to guess this.

### 08 Account
- **Fixed.** It's a pushed page with a back chevron and no avatar, the provider line fits, and the new `Connections ·
  1 of 2 in use` row is a good answer to the stream limit.
- Truncation in three subtitles: `The TV is watching Sky Cine…`, `Scores hidden until you have…`, `Cinemeta,
  Northlight · from your Str…`. iOS grouped lists allow a two-line subtitle. Either allow two lines, or shorten the
  copy (`Until you've watched`, `Cinemeta, Northlight`).
- The chevron and the large title sit side by side. iOS puts the back button on the nav-bar row, with the large
  title under it. That's acceptable as the house style, but keep the chevron's 44 pt hit area (`.ac-back` has it).

### 09 Sign-in
- **Fixed.** Typing the login is the right call for tonight. The `Sign in` pill is filled only when the fields are,
  the spacing is fixed, and the privacy line clears the home indicator.
- **The fields have no labels once filled.** `line.provider.tv` / `birgir` / `•••` are fine for him today, but
  placeholders vanish when you type. Add 12 pt labels above the fields (`Server`, `Username`, `Password`). Also
  specify the input attributes, because on an iPhone they decide whether sign-in works at all: `autocapitalize="off"
  autocorrect="off" spellcheck="false"` on the server and the username (iOS would type `Birgir`), `inputmode="url"`
  on the server, and `autocomplete="username"` / `current-password` so Passwords can fill them.
- The privacy line `Nothing leaves the phone but the login, sent to your provider` isn't true. The phone also talks
  to ESPN, TMDB (with his key) and Stremio. Say `Your login goes only to your provider.`
- The step chips aren't aligned: chip 2 is vertically centred while 1 and 3 are top-aligned, and chip 3 hyphenates
  `add-ons` across two lines. Use one alignment, and `TMDB, add-ons`.

### 10 Library (new)
- **Good.** The segmented control, the shelf chips, the context line, 3 across with captions, and the `4K` and `MKV`
  chips. The scroll bubble `#313 of 3,000+` is the TV's idea and works on a phone. It looks like Apple TV's library,
  with better art.
- The `MKV` chip sits on top of the Anchorman logo's ink. Put the chips at the bottom-left of the poster (where Apple
  and Netflix put badges), or let `art.js` pick the corner away from the logo.
- `Comedy · Popular` in the context line, with a `Popular` chip that isn't selected, reads as two different
  `Popular`s. Call the sort what it is (`Comedy · most popular`).
- The Library's own search icon, next to the Search tab, gives two ways in. Fine if it searches within the library;
  say so in §3.4.

### Across screens
- The 130 pt tab-bar fade is in `phone.css` (`.ph-tabfade`), but it reads weakly in the renders (posters at full
  strength under the bar on 01 and 10). It's on brand either way. This is a nit.
- Type, spacing and the token use are consistent. Every target I measured is 44 pt or more, and the chips are 36 pt.

**Premium vs off.** Next to ESPN, NBA, YouTube TV, Apple TV and Netflix, this now looks like one of them. 02, 04, 05
and 07 are at Apple TV / ESPN level. What still marks it as unfinished is truncation where the text matters: Live's
`Next`, Account's subtitles, and the orphan separators on 01 and 04. The builder can fix all of these in CSS and
copy.

---

## 2. Flow

| Task | Taps | Note |
|---|---|---|
| His team's game live (game night) | 1: Home › `Watch live` | best in class |
| The same from tip-off | 1: Home › `From tip-off` | the key use at work; depends on catch-up as HLS (§5) |
| The game before tip-off | 1: NBA › `Watch pre-game`, or 2 from Home | |
| A channel | 2: Live › row, or 1 on `Last watched` › `Tune` | |
| Resume a show | 1: Home › `Resume` | |

- **The gestures now have one job each, and the table is right for iOS.** Swipe down dismisses in portrait. The X
  works in both orientations. There's no edge-swipe exit. Double-tap on the edges seeks, and the zap swipe happens
  only in landscape's middle third. This matches the system player and YouTube.
- Swipe-down dismiss says "keeps playing in PiP if PiP is on". From an inline `<video>` in a WKWebView, iOS enters
  PiP automatically on a swipe home only in some cases. Don't promise automatic PiP until it's tested. The PiP button
  always works. Test this on the phone on day one (§5).
- Rotation (open item 1) is left to the owner on the real phone. That's the right call.

## 3. Faithfulness
9 / 10, as before. It uses the TV's words, order, tokens, Sharp plates and the v2 bar. Each departure is stated with
its reason (the index sheet, the guide rows, no card skew, `Morant 27.8` dropped). The one place the phone *adds*
words, `1:32 behind live`, is the place it's wrong, which is an argument for staying with the TV's words.

## 4. The spoiler shield
Holds on every mock. `Score hidden` appears on the Marquee, the hero, the player corner and the facts line. Records
read `as of tip-off`, the track stops at the live point, and `End hidden` is shown as the eye-off icon. The masked
names appear in the guide and the ring. v1.1 fixed both of review 1's points. The seen store is per device (correct:
unsynced can only over-hide), and Now Playing, PiP's title and the `Remind me` text go through `namesOf`.
- One stale sentence. §0.9 still implies the seen store gets copied, but with typed sign-in there is no hand-off to
  copy it. Say that the phone starts empty and over-hides games he watched on the TV until he taps Reveal. That's
  the safe default.
- `Remind me` is drawn on 04, but its plugin (`@capacitor/local-notifications`) is open item 9 and not in
  PORT-NATIVE's plugin list. Either add the plugin (it's small, and the masked text is already specified) or hide the
  button in v1. A button that does nothing is worse than no button.

## 5. Buildability

**The direction is right.** HTML everywhere, a `<video playsinline x-webkit-airplay="allow">`, the old phone loader
reused (`app/player.js` 66–90: native HLS on iOS, then hls.js, then mpegts.js), `webkitSetPresentationMode` for PiP
(`app.js` 1194, checked), `navigator.mediaSession` for the lock screen, and the screens rewritten on lifted models.
The reuse table (§5) is now honest. The `PhonePage` facts are corrected. The plays-here term and the Infuse / VLC
schemes are a proven pattern. A builder can start on this, with these corrections:

1. **The mpegts.js fallback can't work as configured. Make the HLS test a go / no-go and cover catch-up too.**
   - `capacitor.config.json` has `CapacitorHttp.enabled: true`. That patches `window.fetch` / XHR to go through native
     code and return the whole body when the request completes. mpegts.js reads the stream with `self.fetch`
     (checked in `node_modules/mpegts.js`), and a live `.ts` never completes, so nothing ever plays. Without the
     patch, the WebView's own fetch from `capacitor://localhost` to the provider needs CORS headers, which Xtream
     panels don't send.
   - On the `ManagedMediaSource` path, mpegts.js sets `video.disableRemotePlayback = true` (checked). So there is **no
     AirPlay** on that path, not "AirPlay mirrors" as PORT-NATIVE says.
   - So in practice the phone plays only what AVFoundation plays natively: HLS, MP4 and MOV. The test before the
     build must try **both** `/live/<u>/<p>/<id>.m3u8` **and** the catch-up form `core.js` tries first
     (`/timeshift/<u>/<p>/<mins>/<stamp>/<id>.m3u8`, line 274) on the owner's line. `From tip-off` at work is the
     reason the app exists.
   - If live HLS is off, the plan B has to be named now: a small native piece (an AVPlayer plugin, or a local
     TS-to-HLS remux), or the VLC hand-off for live. Don't leave the builder to find out at 3 am.
   - Rewrite PORT-NATIVE "The streams" §1 and open item 2 to say this. The hls.js path is irrelevant on iOS (native
     HLS wins first), so drop it from the iOS story.
2. **The status bar plugin vs `Info.plist`.** `ios/App/App/Info.plist` has `UIViewControllerBasedStatusBarAppearance`
   = false. `@capacitor/status-bar` needs it true to hide the bar, which 07 relies on. Add it to PORT-NATIVE's
   `Info.plist` list. Also, `@capacitor/status-bar` and `@capacitor/screen-orientation` aren't "core" or "already
   there". They're not in `package.json`. They have to be installed (`npm i` plus `cap sync`), and the doc should
   say so.
3. **The data saver can't cap native HLS from JS.** On iOS the `<video>` plays HLS through AVFoundation, which picks
   the variant itself (there's no `autoLevelCapping`; `preferredPeakBitRate` isn't reachable from the page). Xtream
   live is usually one variant anyway. So `Mobile data · 720p` can only be true when the provider offers a separate
   lower-quality channel or copy. Otherwise the chip should say `Mobile data` and the stream plays at its own
   quality. Say this in §0.11, so the chip doesn't promise what isn't happening.
4. **`phone.css` hard-codes the insets** (`--ph-top: 59px`, `--ph-bot: 34px`, `top: 59px` on `.ph-top`, `.dt-back`,
   `.dt-more`, `.ac-back`, and no `env()` anywhere), while the doc says `env()` throughout. The doc calls the file
   the one to "sit beside app.css in a phone build", so make the tokens `env(safe-area-inset-top)` /
   `env(safe-area-inset-bottom)` (with the mock values as fallbacks) before it's copied.
5. **Background audio and auto-PiP from WKWebView** aren't guaranteed. The `audio` background mode and the
   `.playback` session are right and necessary, but WebKit may still pause an inline `<video>` on lock, or skip
   automatic PiP when the app is left. List it as the day-one device test, beside the HLS test, and keep
   `Keep playing when you leave` honest by what that test shows.
6. Small, all correct and specified: `capacitor.js` copied for `phone` (`build-web.js` line 35 copies it only for
   `tv`, as the doc notes), `LSApplicationQueriesSchemes` for Infuse / VLC, `mediaTypesRequiringUserActionForPlayback
   = []`, the AppDelegate audio session, and AltStore delivery (CONTEXT.md agrees). Typed sign-in reuses `core.js`'s
   Xtream / M3U login, which already works on the existing iPhone app. That's sound.

---

## 6. Scores

| | Score | Why |
|---|---|---|
| Looks and craft | 8.0 | 02, 04, 05, 07 at Apple TV / ESPN level; the face clear on 01; a calm, credible portrait player. Held back by text cut where it matters (Live's `Next`, Account), two orphan separators and the 06 gutter breaks |
| Clarity | 8.0 | The hierarchy is clear and the TV's words carry. `Next N…`, `1:32 behind live` vs the track, and `4K` vs `720p` say less than they seem to |
| Ease of use | 8.5 | One tap to the game live, from tip-off, or to resume. Gestures with one job each. Account has a way back. The landscape game layout is missing from the doc |
| Faithfulness | 9.0 | The TV app on a phone, departures explained |
| Buildability | 7.0 | Up from 5: the right architecture, honest reuse, correct facts. But the TS fallback is dead under CapacitorHttp and MMS kills AirPlay, so the HLS test (live and catch-up) decides the build. The status-bar plist conflict, the missing plugins, an unenforceable data saver and hard-coded insets are all small |
| Brand fit | 8.5 | Tokens, Outfit / Inter, the gradient pill as the one action, LIVE red only for LIVE, Sharp only for sport |
| **Overall** | **8.0** | The design alone is about 8.2. The build plan is now real, with one fact to verify before the first line is written |

---

## 7. Fix list

### Must fix
1. **PORT-NATIVE "The streams" + SPEC open item 2:** say that the mpegts.js fallback won't run in this shell
   (CapacitorHttp buffers `self.fetch`; without it CORS blocks; on MMS `disableRemotePlayback` means no AirPlay). Make
   the owner's-line test a go / no-go for **both** live `.m3u8` and catch-up `/timeshift/…/.m3u8`, and name the plan B
   if live HLS is off (an AVPlayer plugin, a local remux, or the VLC hand-off).
2. **03 Live:** make `Next` readable on every row: `until 20:55 · Next Fréttir` (no second time), with the bar
   shortened if needed. Separate the hint from the `Now` line.
3. **06 portrait:** fix `You're in Q2 · 1:32 behind live` so it agrees with the track (the TV's `You're in Q2`, or
   the real gap). Bring `Subs & audio` and `Game` inside the 16 pt gutters.
4. **§3.7:** specify the game in landscape (`player-v2/09` with the phone's buttons and gestures).

### Should fix
1. PORT-NATIVE: `UIViewControllerBasedStatusBarAppearance` → true for `@capacitor/status-bar`. List
   `status-bar`, `screen-orientation` (and `local-notifications` if `Remind me` ships) as packages to install, not
   core.
2. §0.11: the data saver can't cap native HLS from JS. The chip says `720p` only when a lower copy was actually
   chosen, and the `4K` badge follows what's playing.
3. `phone.css`: insets through `env(safe-area-inset-*)`, with 59 / 34 only as fallbacks.
4. 09: field labels, and `autocapitalize="off"`, `autocorrect="off"`, `inputmode="url"` and `autocomplete` on the
   fields. Make the privacy line true (`Your login goes only to your provider`).
5. `Remind me`: ship the local-notifications plugin with the masked text, or hide the button in v1.
6. §0.9: with typed sign-in, the phone's seen store starts empty and over-hides. Remove the copy-once idea.
7. Day-one device test, beside the HLS one: background audio on lock, and automatic PiP from inline playback. Word
   `Keep playing when you leave` and the swipe-down dismiss by its result.
8. 08: no truncated subtitles (two lines or shorter copy).
9. 01: the facts line breaks before a separator, never after one.

### Nits
- 02: 8 pt between `as of tip-off` and the `ON NOW` slab. Drop `Short` from the Always Sunny line.
- 03: `Last watched` without the channel number, and its bar filled.
- 04: the eyebrow as one string. `6 games` without the hanging separator.
- 05: the tab bar shows the tab the page was pushed from (Home on this path).
- 06: draw the Q3 tick. `Back to live` without the chip tint.
- 09: step chips aligned. `TMDB, add-ons` without the hyphen break.
- 10: the `MKV` / `4K` chips away from the logo's ink (bottom-left). `Comedy · most popular`. Say what the Library's
  own search searches.
- The tab-bar fade a little stronger in the renders.
