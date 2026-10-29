# airglow iPhone, v1: the TV app, translated to a phone

The owner's direction: "just make what we've made, but for iPhone." So this is not a new concept. It is the TV app as it
stands (Home with the Marquee and the personal rows, Live with the guide, NBA with its sections and the shield, the
Movies / Series library, the title pages, Search, Saved, Account) on a 393 × 852 pt screen, driven by a thumb: a tab
bar, scrolling lists, taps and swipes, the iOS player. Every screen below says how it maps from the TV and which
modules it reuses, so the builder ports the layout, not the logic. The reason it is being built now: he wants to watch
the NBA at work, on iOS.

| File | What |
|---|---|
| `SPEC.md` | this: decisions, research, the frame, each screen (mapping, layout, states, gestures, reuse), the player, sign-in, open items |
| `01` … `09` `.html` | the mocks at 393 × 852 pt (`07` at 852 × 393), real art: the TV's Cinemeta / metahub files (`../home-final/art`) and ESPN's crests (`../nba-pages/img`) |
| `png/*.png`, `png/contact-sheet.png` | the renders at 3× (1179 × 2556; the landscape one 2556 × 1179) and the sheet |
| `phone.css` | the phone classes (`ph-*`, `hm-*`, `lv-*`, `nb-*`, `dt-*`, `pv-*`, `ac-*`, `si-*`) on the TV's tokens; written to sit beside `app/tv/app.css` in a phone build |
| `tools/build.js`, `tools/render.js`, `tools/pages.json` | builds the pages from one timeline; renders them (Playwright) |

The timeline is home-final's: Wed 28 Oct 2026 20:41 in Reykjavik, shield `My team`, add-ons Cinemeta and `Northlight`,
the Grizzlies at Portland Thu 29 Oct 02:00; `02` and `06` are Thu 03:12 to 03:14 with the game on.

| Also | |
|---|---|
| `PORT-NATIVE.md` | the native side, short: WebView flags, `Info.plist` keys, the audio session, the streams (HLS first, mpegts.js over ManagedMediaSource as the fallback), the MKV hand-off, AltStore |
| `REVIEW-independent-1.md` | the review of v1.0 (7.2; the design 7.6, buildability 5) that v1.1 answers |
| `10-library.html` | new in v1.1: the Library tab (Movies, Comedy, deep) |

---

## v1.1 changes (an answer to the review; the build starts from this)

**The shell and the player are HTML in the existing Capacitor phone app. No native screens.**
- §0.2, §2, §0.14, §3.6: the tab bar is an HTML pill (`position: fixed`, `backdrop-filter`), sheets are `ui.js`'s
  `openOverlay` with two snap heights (medium, full), long-press is an HTML menu (`contextMenu`), the search field is
  ours. The SwiftUI and UIKit names are gone from the spec.
- §0.8, §3.7: the player is an HTML5 `<video>` in the WebView with the v2 controls in HTML (the old phone player,
  `app/player.js`, already tries HLS, then MPEG-TS, then native). HLS first (Xtream serves `.m3u8`), `mpegts.js` over
  `ManagedMediaSource` (iOS 17.1+) as the fallback; PiP by `webkitSetPresentationMode` / `requestPictureInPicture`,
  AirPlay by the element's picker. The native side is a configuration list, `PORT-NATIVE.md`, not a plugin.
- §0.11a, §3.5, `copies.js`: a **plays-here** ranking term on iOS (MP4 / HLS first); an MKV-only title says so and
  offers `Open in Infuse / VLC`. The library card carries an `MKV` chip (`10`).
- §0.10, §3.8, `09`: **sign-in types the provider login once** (then the team, the TMDB key typed or sent from the TV's
  phone page, the Stremio account code, as on the TV). "Sign in with your TV" moves to open items with the facts
  corrected (`PhonePage` listens on 8790, only while its screen is open, 10 minutes, a 6-digit code with a 5-try
  lock, no `/ping`; it receives, it does not send).
- Delivery: AltStore, as before.

**Must-fixes in the mocks.** `06`: AirPlay and PiP are on the video (top-right), one `Subs & audio` button, no
chevrons in the transport row, the X top-left, the shield corner on the bottom scrim, the zap ring in view; §3.7 says
what auto-hides (only the video's overlay). Gestures: one job each (§3.7). `03`: the LIVE pill on the channel's name
line, the times and `Next` with room (`until 20:55 · Next Fréttir 20:55`).

**Should-fixes.** `01` / `02`: the row's reason on its own line; the subject's face clear of the card (`--pos`, the card
48 pt lower and lighter); `02`: the `NBA` label stays and the LIVE badge sits on the icon; the card's skew is gone (the
Sharp angle belongs to the split and the plates; the card keeps a gradient edge). `04`: the hero's game is not
repeated in the list (`6 games · yours above`), the hero's buttons are 44 pt, `Your team · NBA · Tip-off`. `05`: the
copy line on one line, 16 pt above the season chips. `07`: no status bar, aspect-fit with 65 pt black at the short
edges, 24 pt top inset, `Ends 21:02 · 13 min left · −12:50` agree. `08`: a pushed page with Back and no avatar; the
provider line untruncated; `Connections · 1 of 2 in use · the TV is watching …`. Everywhere: 44 pt targets
(`.dt-back`, `.dt-more`, `.pv-close`, `.ph-top .ib`, `.nb-hero .act`, `.pv-act`, the `…` disc). The shield: the seen
store is per device (§0.9); Now Playing, PiP and the `Remind me` text go through it (§3.7). A named diagnosis state
for the provider's stream limit (§3.7). `10-library` is mocked; the game page is not (open item 10). Safe areas
through `env()` (§0.13, §2). Nits: the `Favourites` chip keeps its icon and drops the dot; no stars inside the
Favourites group; the guide's hint retires after 5 showings; `09` spacing and the privacy line above the home
indicator; §3.1 says the first row is a peek by design; `Morant 27.8` is dropped from the phone's game line (no room;
the fan line keeps rank, streak, `as of tip-off`).

---

## 0. Decisions (each with its reason)

1. **Same sections, same words, same art; only the surface changes.** Home is still the Marquee over the personal
   rows; Live is still the guide with its group chip; NBA has the same section row (`Games · [crest] Grizzlies ·
   Standings · Leaders · Team stats · News`); the title page has the same facts line, the same copy line and the same
   pill; the player wears the v2 bar. *Why:* the owner said so, and the TV design has been through five reviews. A
   phone that looks like the TV is also the phone he can use without learning anything.
2. **A tab bar with four tabs and the search tab: Home, Live, NBA, Library, and Search at the trailing end**, drawn
   in HTML (a fixed glass pill; v1.1). The TV's seven destinations (Search, Home, Live, NBA, Movies, Series, Saved)
   become four plus Search. **Library** holds Movies, Series and Saved as a segmented control at its top. Account is
   the avatar at the top right of every tab, exactly where the TV has it, and opens as a pushed page with Back.
   *Why:* Apple's guidance (section 1): fewer tabs are easier, overflow (a More tab) hides content, and iOS 26 puts a
   dedicated search tab at the trailing end, which an HTML bar can mirror. Movies and Series are one kind of browsing
   on a phone (the same library, the same grid), so one tab with a switch loses nothing the TV has.
3. **NBA is one tap from Home on a game day, and the tab says so.** The Marquee's game line is the first line when
   the game is live or within 3 h of tip-off (the TV's rule), its card opens in place with `Watch live` and `From
   tip-off`, and the NBA tab carries the LIVE pill while the game is on (the TV's top-bar rule). *Why:* the brief's
   one hard requirement, and the TV already has the rule; the tab's pill is the phone's version of the top-bar pill.
4. **The Marquee stacks.** The picture is the top 470 pt (the backdrop under the same cap and scrims), the lit line is
   its card in place (the eyebrow, the logo at 46 pt of ink, the facts, one line, the bar, the pill), the other lines
   sit under it as 44 pt rows with their facts and a chevron, and the first browsing row peeks under them. Tapping an
   unlit line lights it: its card opens in place and the picture answers it after a 600 ms rest, the lines under it
   slide by the card's height (the TV's "nothing above moves" rule). *Why:* this is the TV's lineup turned from a
   column beside the picture into a column under it; a phone is portrait, so the picture goes on top and the text
   under, as the Apple TV app and Netflix do.
5. **The rows scroll vertically, the cards horizontally, and the index becomes a sheet.** The TV's row index (six
   names at the right) has no room on 393 pt. The row title keeps its reason (`Because you watch Always Sunny…`) and
   the right end of every row title is `15 rows ▾`: a sheet listing every row by name (the current one marked) that
   jumps to it. *Why:* the index's job was "where am I and what is below"; a sheet answers it on a phone without
   taking the row's width. The `New row` tag, `Not interested` and `Hide this row` live on the card's long-press
   menu, the TV's hold-OK menu.
6. **The guide is a list of channel rows, not a time grid.** Each row is the channel's number, logo tile and name,
   the programme on now with its progress bar and times, and `Next …`; LIVE pills where the TV draws them; the
   favourite star. The group chip row (`Favourites · 10`, `All channels`, `Sports`, …) is the TV's group picker. Tap
   plays; the chevron opens the channel's day (the TV's time axis, one channel at a time, with the archive to the
   left); swipe left favourites; long-press is the TV's hold-OK menu. *Why:* a six-channel time grid at 2.5 h needs 656
   pt; YouTube TV's 2025–26 mobile guide (section 1) made the same move to rows with now / next. The TV's Now panel
   becomes a card at the top for the last channel watched.
7. **The NBA hub is the TV's, stacked.** The section chips scroll sideways; the hero is your team's game with the
   tip-off slab (the Sharp 12° plate on the right, `02:00 · TIP-OFF`, or the clock, or `Score hidden`); the day chips
   under it drive the grid; the game cards are the TV's cards at full width (status line, two team rows with their
   colour edges and records, the plate at the right). *Why:* the hub spec's hero-state table and the shield's per-surface
   rules apply unchanged; cards at full width read like ESPN's and the NBA app's Scores lists, which he knows.
8. **The player is an HTML5 `<video>` in the WebView wearing the TV's v2 bar, in two orientations** (v1.1).
   Portrait: the video 16:9 under the status bar with the X, AirPlay and PiP on it and the shield's corner on its
   bottom scrim; under it the title block, the track with its chapter ticks up to the live point, the ends row, one
   transport row (`Subs & audio`, −1 m, pause, +1 m, Options), the game actions (`Skip to Q3`, `Back to live`,
   `Game`), and the zap ring as a list. Landscape: full screen, no status bar, the v2 bar on the bottom scrim, the
   title block top-left, `Ends 21:02` top-right, the iOS buttons (CC, AirPlay, PiP, Options) at the right of the
   buttons row. *Why:* the bar's words and order are the TV's, reviewed twice, and the logic behind them (`games.js`,
   `replay.js`, `subs.js`, `quality.js`, `conncheck.js`) is JavaScript that runs as it is in the WebView; the old
   phone player (`app/player.js`) already drives a `<video>` through HLS, MPEG-TS and native. Apple's rule for a
   custom player (section 1) is to keep the system player's habits: tap to toggle, double-tap the edges to seek,
   drag the bar to scrub, PiP and AirPlay where the system puts them. `PORT-NATIVE.md` lists what iOS needs.
9. **The shield is the TV's, byte for byte.** `Score hidden`, `ON NOW` without a clock, records `as of tip-off`, the
   timeline that stops at the live point, `End hidden`, the Reveal behind a confirm. The seen store (`games.js`
   `{ upTo, ids }`) is **per device** (v1.1: the provider holds no app data; unsynced is spoiler-safe, a device can only
   over-hide). The phone never reveals what the TV would hide, and its own new surfaces go through the shield too:
   the lock screen's Now Playing title and artwork, PiP's title, the `Remind me` notification's text (the masked game
   name, never an ESPN headline). *Why:* `games.js` already does it; the phone only draws its answers.
10. **Sign-in types the provider login once, as on the TV** (v1.1): Xtream or M3U, then the team and the shield,
    then the TMDB key (typed, or sent from the TV's phone page, which already exists for that) and the add-ons from
    the Stremio account with its code. *Why:* it is what `screens/first.js` and `screens/account.js` do today, so it
    builds tonight. "Sign in with your TV" (the TV shows a code and a QR, the phone pulls the login over the LAN) is
    open item 6 with the facts corrected: it needs a new, confirmed, send-out path on the TV's `PhonePage`, which
    today only receives.
11. **A data-saver quality choice, on by default on mobile data.** `Best on Wi-Fi · 720p on mobile data`, a toggle in
    Account › Playback and a chip on the player (`Mobile data · 720p`) that opens the quality sheet. *Why:* the
    brief's note; the copy ranking (`copies.js`) already knows each copy's resolution, and HLS variants are picked by
    capping the level (hls.js `autoLevelCapping`; on the native HLS path the provider's lower-quality copy).
11a. **Copies are ranked by whether they play here** (v1.1). On iOS the `<video>` plays MP4 / M4V / MOV (H.264,
    HEVC; AAC, AC-3 on most devices) and HLS; it refuses MKV, AVI, DTS and TrueHD. `copies.js` gets a plays-here term
    first in the order; the library card marks an MKV-only title (`10`); its title page says `Only MKV copies · Open in
    Infuse` with the hand-off button (`PORT-NATIVE.md`). *Why:* without it `best of 3 copies` would promise and then
    fail; Infuse and VLC are the two players every iPhone IPTV user already has.
12. **Dark only, the TV's tokens, Dynamic Type where it is cheap.** The phone scale is Outfit 700 32 (large titles),
    24, 20; Inter 16 body, 14 secondary, 13 caption, 12 labels and badges (the TV's 14-pt floor was for 3 m; iOS body
    is 17 and caption 12). Body and row text follow the system's text size up to the `xxLarge` step (the Marquee's
    card, the cards and the player's bar are fixed). *Why:* one brand; the owner sets his phone's text size like
    everyone else.
13. **Safe areas are respected everywhere**, through `viewport-fit=cover` and `env(safe-area-inset-*)` (v1.1), never
    hard-coded: 59 pt top and 34 pt bottom on the 15 Pro the mocks draw (62 / 34 on a 16 Pro, 20 / 0 on an SE), 16 pt
    side gutters; the tab bar floats 8 pt above the bottom inset; content scrolls under it (a fade keeps the last row
    readable). The player in landscape keeps its text 80 pt in from the short edges, clear of the island.
14. **Touch targets are 44 pt or bigger**, chips 36 pt (Apple allows 28 for chips in a row), rows 50 to 84 pt. Every
    hold-OK menu on the TV is a long-press menu here (`ui.js` `contextMenu` drawn as a bottom sheet, the same items in
    the same order; a 500 ms press with the light haptic).
15. **Nothing moves by itself** (UI-SPEC 1.4 holds): no carousel, no autoplay, no reordering while a tab is on screen,
    the picture swaps only after the rest.

---

## 1. Research (what was read, and which decision it backs)

Read directly in October 2026 unless marked (S) for "from published summaries": many sites were unreachable from
this session (9to5Mac, Tom's Guide, Android Central, Six Colors, the NBA's support site), so those are (S).

**Apple, Human Interface Guidelines**
- *Tab bars* (read; updated June 2026 for Liquid Glass): a tab bar is for navigation, not actions; keep it visible
  except under a modal; "it's generally easier to navigate among fewer tabs"; avoid overflow (the More tab hides
  content); never hide or disable a tab; single-word labels, filled symbols; on iOS the bar floats over content on
  Liquid Glass, can minimise on scroll with an accessory (the Music MiniPlayer), and "can include a dedicated search
  tab at the trailing end". → Decision 2 (four tabs + Search), the floating bar, the LIVE badge on the NBA tab as a
  pill rather than a red count badge (a badge is for "critical information"; we use the house LIVE pill instead).
  [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- *Playing video* (read): "use the system video player", and if custom, "reference the behavior and interface of the
  system video player"; always the original aspect ratio (aspect-fit for 16:9, no embedded letterbox); PiP is expected;
  black loading screen with a centred spinner after 2 s; resume without asking; after exiting playback show the
  content's detail view with a resume option. → Decision 8; the player's loading state; Back to the title page / the
  guide row with `Resume`. [Playing video](https://developer.apple.com/design/human-interface-guidelines/playing-video)
- *Lists and tables* (read): rows for text that must be scanned; grouped style with headers for settings; a
  disclosure chevron for drilling in; keep row text short, truncate at the end. → The guide rows, Account's grouped
  lists, the episode list. [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
- Apple's safe-area and touch-target rules (44 × 44 pt) as in *Layout*; iPhone 15 Pro: 393 × 852 pt at 3×, top inset 59,
  bottom 34. → Decisions 13 and 14.
- iOS 26's tab-bar behaviour (WWDC25 session 284, S): the bar minimises on scroll, a search tab at the trailing
  end, a bottom accessory for a mini player. → Mirrored in HTML: the bar minimises on scroll in the rows and the
  guide; a playing stream's mini bar above it is open item 4.

**The apps named in the brief (2025–2026)**
- Apple TV app, iOS 26 (S): redesigned with Liquid Glass, vertical posters, new player controls; Continue Watching on
  top of Home. → Portrait posters in the rows (the TV's 2:3 cards), Continue watching first.
- Netflix iPhone, April 2026 redesign (S): the search moved into the bottom bar, category chips across the top of
  Home, a vertical Clips feed. → The search tab; chips as the group / section pickers; no clips feed (decision 15).
- YouTube TV mobile Live Guide, early 2026 (S): rows of channels with the programme on now and a cleaner look (the
  mobile guide shows what is on, not what is coming up, which users disliked); a long-press sheet with the preview,
  description and actions. → Decision 6, with `Next …` kept on every row and the channel's day one chevron away.
- ESPN and Apple Sports (S, 2026): Scores lists of full-width game cards with crests, records, time and the TV
  network; Apple Sports hides betting odds by a setting, neither hides scores. The NBA app's Hide Scores (S, its
  support page) hides scores, records and other game-revealing details across the app, set from the Account icon. →
  Decision 7's card shape; our shield stays stronger than any of them (records as of tip-off, the timeline's end).
- Netflix's TV sign-in from a phone (S, help.netflix.com): a QR on the TV scanned by the phone, or a code typed at
  `netflix.com/tv2`; Disney+'s eight-digit code at `/begin`. → Decision 10, reversed.

**The house specs this one inherits** (so nothing is re-decided here): `home-final/SPEC.md` (the Marquee, the rows,
the engine, the library), `player-v2/SPEC.md` (the bar), `nba-pages/SPEC.md` (the hub and the League pages, the
shield per surface), `catchup/SPEC.md` (replays, the timeline), `subtitles/`, `copies/RANKING.md`, `addons/SPEC.md`,
`brand-v5/v5.4/BRAND.md` (tokens, Sharp, LIVE).

---

## 2. The frame (every tab)

| Element | Geometry |
|---|---|
| Status bar | the system's; the clock at the left, the island 125 × 37 at y 11; nothing of ours above `env(safe-area-inset-top)` (59 on the 15 Pro, 62 on the 16 Pro, 20 on an SE), the page is `viewport-fit=cover` |
| Top bar | y 59 to 103: the mark (26 pt) on Home, else the tab's large title (Outfit 700 32); at the right the tab's own buttons (Live: search; NBA: `ESPN · 20:41`) and the avatar (34 pt, the gradient disc; a dot on it when Updates has one) |
| Content | from y 112; 16 pt gutters; rows and cards edge to edge inside them |
| Tab bar | an HTML pill, `position: fixed`, 58 pt high, `env(safe-area-inset-bottom)` − 8 from the bottom, 16 pt in from the sides: bg-1 at 78 % with `backdrop-filter: blur(24px)` (WKWebView draws it), a 1 pt chalk line, Home, Live, NBA, Library (icon 24 + label 11, labels never change), the selected tab on a chalk-tint pill, the LIVE badge on the NBA icon's corner while a game is on; the search tab a 58 pt disc at the trailing end; a 130 pt fade under content so the last row stays readable. It minimises to the selected tab's icon while a list scrolls down (a class toggled by the scroll direction) and comes back on a scroll up |
| Home indicator | the system's |
| Back | `router.js`'s stack: a chevron top-left on pushed pages and a left-edge swipe handled in JS (`touchstart` within 20 pt of the edge); tapping the selected tab returns to its root (the TV's Back model: tab roots stay where you left them) |

Sheets are `ui.js`'s `openOverlay` drawn as bottom sheets with two heights (medium: pickers, the radio menus, the
long-press menu; full: lists such as the 15 rows, the sources sheet, Choose a video); a drag down or the scrim closes
them. Toasts are the TV's, 44 pt above the tab bar.

---

## 3. The screens

### 3.1 Home (`01-home-evening`, `02-home-gamenight`)

**From the TV:** `screens/home.js` (the Marquee's lines, the lit card, game night) and `rows.js` / `shelves.js` /
`tmdb.js` / `art.js` (the rows, the page, the taste profile, the backdrops' cap and glow). The phone reuses all of them:
`home.js`'s line model (`kind`: continue / new / pick / game, the 3-or-4 rule, the morning-after rule) and `rows.js`'s
page are read as data; only the draw changes.

| TV | Phone |
|---|---|
| the picture full-bleed, the lineup at x 56 | the picture is the top 470 pt (`--pos` per title with the subject in the top 280 pt, so the card never boxes a face; the cap from the 32 pt copy, the top scrim for the bar, the bottom scrim to canvas); the lineup starts at y 286 |
| the lit line is its card in the column | the lit line is its card across the width (`.hm-card`: radius 18, the glow colour to canvas, a 1 pt chalk line): eyebrow, logo 46 pt (else the name Outfit 700 26), the facts with badges, one line, the bar 180 × 4, the actions: the pill (`Resume`, `Play`, `Watch live`, `Tune`, `Details` on a pick) full width beside one ghost button (`Episodes`, `From tip-off`, `More popular films`) and `…` (the hold-OK menu) |
| the unlit lines, Outfit 30 at 66 % | 44 pt rows, Outfit 700 20 at 78 % + the facts in 13 pt, a chevron; a tap lights the line (its card opens in place, the picture answers after 600 ms) |
| the peek, `P− Browse · 15 rows` | the first row peeks under the lines **by design** (about 100 pt of posters above the tab bar; the Marquee is the point of the first screen, the rows start one scroll down); its title row ends in `15 rows ▾` (the index sheet) and its reason sits on its own line under the title |
| game night: the two fields, crests 150 | the fields fill the top 470 pt (the split at 62 %, 12°), crests 96 at y 112 with names and `as of tip-off`, the `ON NOW` chip and the `Score hidden` plate at y 254, the game's card with a gradient edge (no skew on a 361 pt card: the Sharp angle belongs to the split and the plates) |
| the rows: picture area + column + index + one row | the rows: each row is its title (Outfit 700 20), its reason (13 pt, one line, ellipsis), `15 rows ▾`, then its cards in a horizontal scroll (posters 108 × 162 radius 10, 10 pt gutters, 3.4 visible; wide cards 198 × 111; game cards 250 × 118 the TV's shape); no picture area, no column: the title's facts are one tap away on its title page |
| OK Details / hold OK menu | tap opens Details; long-press is the menu (`Play now`, `Save`, `Not interested`, `Why this row?`, `Hide this row`) |

States: as home-final §2 (loading with and without a cache, offline with a cache: the Offline pill top right and
`Needs a connection to play` under the lit line; no add-ons: `Add a Stremio add-on for films and series` in the
footer, tapping it opens Account › Add-ons; empty rows absent; late mode; the morning after). The tab bar minimises
while the rows scroll down and comes back on a scroll up.

### 3.2 Live (`03-live`)

**From the TV:** `screens/live.js` (groups, favourites, the group chip, the Now panel's programme view, tuning, the
hold-OK menu), `guide.js` (now / next, the queue 3 at a time on-screen rows first, the clock offset), `catchup.js` /
`replay.js` (the archive, `Earlier`, kept programmes), `games.js` (`gameOn`, which channels carry a game, the shield on
a programme that is a game).

| TV | Phone |
|---|---|
| the Now panel (thumbnail, title, channel, times, progress, the line) | the top card (`.lv-now`): the last channel watched (or the lit row's programme when the list is scrolled with a selection), `Tune` and `Earlier` (the archive) |
| the ruler and six rows by time | `Now 20:41 · Wed 28 Oct` and the hint (5 showings, then gone); then channel rows (84 pt, three lines): the name with the LIVE pill when the TV draws one (and the favourite star outside the Favourites group), the programme on now (a game under the shield reads the TV's masked name), then the progress bar, `until 20:55` and `Next Fréttir 20:55` with room; `No guide information` as on the TV |
| ◀ ▶ along time | the chevron opens the channel's day: a vertical list of its programmes with the archive above now (`catchup` §4: kept programmes play from their start, gone ones are grey) |
| group chip + the groups sheet | the chip row (`Favourites · 10`, `All channels`, the provider's groups, `Sports` first when a game is on) |
| hold OK favourite with undo toast | swipe left (a JS touch handler on the row, 88 pt reveal): `Favourite` / `Unfavourite` with the undo toast; long-press: the hold-OK menu (favourite, open the channel's day, which game it carries) |
| digits jump | the search button top right: by number or name |
| CH± pages | scroll |

States: loading (rows with the channel column filled and a sheen where the guide has not landed), guide failed (`Guide
not answering · Try again` under the ruler, the rows keep their names), no provider (the sign-in card in place of the
list), offline (the rows from the cache, no LIVE pills, no progress).

### 3.3 NBA (`04-nba-hub`)

**From the TV:** `screens/nba.js` (the section host), `nba/hub.js` (the hero's state table, the day chips, the cards),
`nba/team.js`, `nba/standings.js`, `nba/leaders.js`, `nba/teamstats.js`, `nba/news.js`, `nba/player.js`, `nba/picker.js`,
`league.js` (ESPN data, kept in IndexedDB), `games.js` (the shield, `bestChannel`, feeds, replays), `screens/game.js`
and `screens/team.js` (pushed pages).

| TV | Phone |
|---|---|
| the section row at y 80 | the chip row under the title, scrolling sideways, the last section remembered |
| the hero 192 pt with the slab at 26 % | the hero card: eyebrow (`Your team · NBA · Tip-off`), two team rows (edge, crest 40, name Outfit 19, record / `3rd in the West`), the slab at the right (`02:00 / TIP-OFF`; `80 MIN` inside 80 min; the clock when live and seen; `Score hidden` under the shield), the pill + `Remind me`, the caption line |
| day chips y 332 | the day chips (`‹ Tue`, `Today · 28 Oct`, `Thu ›`, `6 games`) |
| the grid 3 × 272 | full-width cards (the status line with the network at the right, two team rows, the plate: tip time / `Q2 9:36` + the score stack / `Score hidden` / `Final`), the Grizzlies card first |
| hold OK on a card | long-press: `<Away> page`, `<Home> page`, `Remind me`, `Open the game`, `Watch from tip-off` |
| Standings, Leaders, Team stats, News, Team, player sheet | the same pages stacked: tables scroll vertically with their column heads pinned; the leaders' category column becomes a chip row; the team page's schedule rail scrolls sideways; the player sheet is a medium sheet; News is a list with the preview on top; every shield cover (`West standings are hidden`, `A story about a game you haven't seen`) is the TV's card with `Keep it hidden` and `Reveal …` |

States: nba-pages §9 (ESPN down: the copy stays, no LIVE pills, the time once, `Try again`; loading: flat blocks in
the final layout; team None: `Teams` opens the picker). Pull to refresh on the hub and the League pages
(`stale-while-revalidate` as the TV).

### 3.4 Library (Movies · Series · Saved)

**From the TV:** `screens/lib.js` (the add-on library: Popular, New, Top rated, genres, the add-ons' catalogs; Sort /
Filters / Jump), `shelves.js` (`Pager`, `shelves(kind)`, `genreShelf`), `screens/saved.js`, `catalog.js`. Mock `10-library`: the
segmented control `Movies · Series · Saved` under the title, the shelf chips (`Popular`, `New`, `Top rated`,
`Comedy`, …), the context line (`Comedy · Popular · 3,000+ films · Sort · Filters`), the TV's grid at 3 posters across
(2:3, 10 pt gutters) with the caption under each (name, `2014 · 1h 39m · 8.1`), a `4K` chip where a copy is known
and an `MKV` chip when no copy plays here (decision 11a), the scroll bubble (`#313 of 3,000+`) while the list is
flung or its edge dragged, Sort and Filters as a medium sheet. The owner's decision stands: the library is the
add-ons, never the provider's VOD.

### 3.5 The title page (`05-title-series`)

**From the TV:** `screens/detail.js` (the facts line, the plot, the pill's verb, seasons and episodes, Save,
`Mark watched`), `titlecopies.js` + `copies.js` (the copy line: `4K HDR, 5.1 · best of 3 copies`), `titlesubs.js` +
`subs/*` (the subtitles pill and sheet), `imdb.js`, `shelves.js` (`openItem`: the IMDb id first), `rows.js` (`plays`).

| TV | Phone |
|---|---|
| the backdrop, the text at x 48 | the backdrop as the top 400 pt under the cap and scrims; the back chevron and `…` on 40 pt discs at y 61 |
| `SERIES · THRILLER · SCI-FI`, the title, the facts | the eyebrow, the logo 54 pt (else the name Outfit 700 28), `★ 8.7 · 2022– · 2 seasons · TV-MA · 4K · EN`, the plot clamped at 2 lines (tap expands) |
| `Resume S1 · E3` · `Save` · `Subtitles: English` | the pill full width beside `Saved` and the CC button (the subtitles sheet); under them the copy line with the tick (`4K HDR, 5.1 · best of 3 · Icelandic subs · plays here`); when no copy plays here the pill reads `Open in Infuse` and the line `Only MKV copies · Infuse or VLC plays them` |
| season chips, the episode rail, the lit episode's line | the season chips with `10 episodes · 3 left`; the episodes as a vertical list (still 132 × 74 with the number chip, the tick for watched, the progress bar; name, duration or `21 min left`, one line of the episode; the one you are on in pink-text) |
| hold OK on the pill | long-press the pill: `Start over`, `Choose a copy` (the sources sheet), `Mark watched` |

A film: the same page without seasons; `Play` / `Resume`; `More like this` as a row under the plot.

### 3.6 Search and Saved

`screens/search.js` behind the search tab (our own field at the top of the Search screen, autofocused, results as
the TV's: channels, titles and games in sections; the keyboard is the phone's, which is the point). Saved is the Library's third segment
(`screens/saved.js`).

### 3.7 The player (`06-player-portrait`, `07-player-landscape`)

**From the TV:** `player.js` (the JS side: `meta`, `game`, `ring`, `tune`, `queue`, `versions`; events `track`,
`need`, `pick`, `progress`, `exit`), `games.js` (the per-channel delay, `chaptersOf`, `asAired`, the replay state,
`behindReplay`), `replay.js`, `catchup.js`, `subs.js` + `subs/*` (the subtitle renderer draws over the video in HTML,
as the TV's `SrtTrack` does natively), `quality.js`, `conncheck.js` (the diagnosis), `intros.js` / `skipshow.js` (Skip
intro, Up next). **The element** is an HTML5 `<video playsinline x-webkit-airplay="allow">` driven by the old phone
player's loader (`app/player.js`: HLS natively, else `hls.js`, else `mpegts.js`, in that order; on iOS 17.1+ `mpegts.js`
runs over `ManagedMediaSource`). The controls are the v2 bar's classes (`pv-*`) in HTML. PiP is
`video.webkitSetPresentationMode('picture-in-picture')` (`app.js` 1194 already does it), AirPlay is the element's
picker (`webkitShowPlaybackTargetPicker()`), the lock screen is `navigator.mediaSession`. What iOS needs is
`PORT-NATIVE.md`.

**Portrait (the game, `06`)**

| Part | Geometry |
|---|---|
| the video | under the status bar, 16:9 aspect-fit (221 pt on 393); over it the top scrim (80 pt) with the **X** (44 pt, top-left), **AirPlay and PiP** (44 pt discs, top-right); the bottom scrim (90 pt) with the **shield corner** (`Score hidden` / `You're in Q2 · 1:32 behind live`, or `Ends 21:02` / `21 min left`) at the left and the data-saver chip (`Mobile data · 720p`, opens the quality sheet) at the right |
| the title block | the name Outfit 700 22 (or the logo 36 pt), `NBA League Pass 4 · Thu 29 Oct · late · 4K`, the st-what line with the tick (`From tip-off · the archive copy · HLS`) |
| the track | the TV's: played in the gradient, the thumb 18 (22 while dragging, with the bubble), the ticks at Tip-off / Q2 / Half / Q3 up to the live point, the live dot, the dashed `ahead` segment to the right end |
| the ends row | the chapter names, the compact LIVE pill at the live point, the eye-off at the right end (`End hidden`; the TV's words, the icon alone because 361 pt holds no more) |
| the transport row | `Subs & audio` (one button: the subtitles and audio sheet), −1 m, pause 60 pt, +1 m, Options (the TV's Options panel as a sheet: picture size, quality, connection, speed, intros). An episode: −10, pause, +10 |
| the actions | `Skip to Q3` (the next unplayed chapter), `Back to live` (a neutral chip carrying the one LIVE pill), `Game` (the game panel as a sheet: quarters, plays, Sync); an episode: `Next episode ›` |
| the zap ring | `Channels · Favourites · 4 of 10 · All channels ›` and the ring as rows (the current one ringed in pink-tint); tap tunes. No channel buttons: the list is the zapper in portrait |

**What hides:** only the video's own overlay (the X, AirPlay, PiP, the shield corner, the chip) after 4 s without a
touch, never while paused; the bands under the video stay. A tap on the video brings the overlay back; a second tap
toggles pause.

**Landscape (an episode, `07`)**: full screen, **the status bar hidden**, the video aspect-fit (16:9 on 19.5:9
leaves 65 pt black at each short edge, where the island and the home indicator live); the X at x 70, y 26; the title
block from x 124, 24 pt down (logo 36, the episode, the st-what line); the corner at the right (`Ends 21:02 · 13 min
left`); the buttons row at y 262 (−10, pause 52, +10, `Next episode ›`, then CC, AirPlay, PiP, Options at the right);
the track at y 326; the ends row at y 352 (`34:10 … −12:50`) with the gesture hint (`double-tap the edges 10 s · drag
the bar`) until it has shown 5 times (the TV's hint rule); the scrims the TV's; everything hides after 4 s, a tap
brings it back. Live in landscape wears the channel banner (`player-v2` 06 and 13): the number, the tile, the channel,
the programme, the third line, the tags.

**Gestures, one job each (v1.1):**

| Gesture | Where | Does |
|---|---|---|
| tap | the video | shows the overlay / the bar; a second tap toggles pause |
| double-tap | the left or right third of the video | seeks 10 s (a game: 1 min), the TV's ◀ ▶ |
| drag | the track | scrubs (the bubble; `▶▶ ×8` on a long drag) |
| swipe down | the video, portrait | dismisses the player (the iOS norm); the stream keeps playing in PiP if PiP is on, else stops |
| X | top-left, both orientations | leaves the player (Back to the title page or the guide row with `Resume`, Apple's rule) |
| swipe up / down | the **middle third** of the video, **landscape only**, live only | zaps through the ring (the TV's ▲ ▼) |
| pinch | the video | toggles aspect-fill (the HIG's two modes) |
| rotate | | switches the layout without stopping playback (open item 1 on the rotation lock) |

No edge-swipe exit in the player (it would collide with the track's left end), and no vertical gesture in portrait
(Notification Centre and the swipe-down dismiss own it).

**States:** loading (black with the spinner after 2 s, the title block already drawn), stalled (the diagnosis card:
`conncheck.js`'s connection check, `Try another copy`), **the provider's limit** (a named state: `Your provider allows
1 stream · the TV is using it`, from `core.js`'s account info `max_connections` / `active_cons` when a stream fails),
paused (the picture 35 % darker, the Paused tag; live pause as the TV's `2:40 behind live`), behind live (the corner,
`Back to live`), the shield (`Score hidden`, `End hidden`, the timeline's ahead segment), Up next (the countdown ring
chip at the credits), Skip intro (the chip), subtitles (chalk Inter 600 at 5.3 % of the video's height, drawn in
HTML over the element), no copy that plays here (`Only MKV copies · Open in Infuse`), PiP (the system's window; the
app's tab stays where it was; the PiP title is the masked name), background (audio continues for a game or a channel
when the data-saver setting allows; the lock screen shows the masked title and the artwork).

### 3.8 Account (`08-account`) and sign-in (`09-signin`)

**From the TV:** `screens/account.js` (Provider, Playback, NBA with `teamSheet`, Languages, Home rows, Updates,
About), `screens/addons.js` (the add-ons pane, the Stremio account link), `qr.js`, `tmdb.js` (the key check,
`N of M rows`), `screens/first.js` (sign-in: Xtream and M3U, verifying), `core.js` (providers, settings, storage),
`state.js`, `session.js`.

Account is the TV's groups as grouped lists on a **pushed page with Back** (from the avatar; no avatar on it):
**Provider** (the line, `Active`, expiry; `Connections · 1 of 2 in use · the TV is watching Sky Cinema Action`, from
the account info; `Refresh channels and guide` on the provider page), **Playback** (`Data saver on mobile data`,
`Subtitles` with the languages under it, `Keep playing when you leave` (PiP); `Match frame rate` is not a phone
setting), **NBA** (`Your team`, `Spoiler shield`: Off / My team / All, the TV's radio sheet), **Films and series**
(`Add-ons`, `TMDB key`, `Home rows`), **App** (`Updates`: the phone's version, `AltStore refreshes it`; `About`;
`Sign out`).

Sign-in (`09`, first run): the lockup and one line; the three steps as chips (`1 · Provider`, `2 · Your team`, `3 ·
Films`); the card `Your provider` (`Xtream Codes · M3U link`, the three fields with `Show` on the password, `Sign in`
as the pill once the fields are filled, the TV's ghost before; verifying is `screens/first.js`'s state); the line
under it says what comes next, as on the TV: the team and the shield (`teamSheet`), the TMDB key (typed, or sent
from the TV's phone page: `tmdbKeyScreen`, `phoneKeyReady`), the add-ons from the Stremio account with its code
(`screens/addons.js`, `qr.js`). Errors are neutral (the dashed field and one sentence, brand §6). The privacy line sits
above `env(safe-area-inset-bottom)`.

---

## 4. States every screen shares

| State | What shows |
|---|---|
| No provider | the sign-in card in Home's Marquee slot, in Live's list and in NBA's hero's place (`Sign in to watch`; the NBA tab still shows ESPN's scores and the shield: the League pages work without a provider, as on the TV) |
| Offline with a cache | the pill `Offline · showing what airglow remembers` under the top bar on every tab; no LIVE pills, no clocks, `Needs a connection to play` on every play button; the player's diagnosis card when a stream drops |
| Loading | the final layout with flat blocks (the TV's rule), never a spinner on a page; the player's black screen and spinner after 2 s |
| Empty | the TV's neutral card: icon disc, title, one sentence, one button (`No favourites yet · Swipe a channel left to add one`, `Nothing saved`, `No add-ons · Add one from Stremio`) |
| An error | neutral, icon + text on surface-1, `Try again`; never red (red is LIVE) |

---

## 5. What is reused, and what the phone writes (corrected in v1.1)

The data modules port as they are: they import nothing from the TV's views. The screens do not: `screens/home.js`
(1,162 lines), `screens/live.js`, `screens/detail.js`, `nba/hub.js` and friends mix their model with HTML, `focus.js`,
`router.js` and `ui.js`. **The phone rewrites the views** (`app/phone/*.js`, one file per screen, on the classes in
`phone.css`) and **reads the models** through the exports those screens already have, extracting a model function
where one is missing (the TV keeps working: the extraction is a move, not a change; `tests/tv/*.js` guard it).

| Phone screen | Reused as is | Model lifted out of a TV screen | Written for the phone |
|---|---|---|---|
| Home | `rows.js`, `shelves.js`, `tmdb.js`, `art.js`, `state.js`, `catalog.js` | `screens/home.js`: the lines (`kind`, the 3-or-4 rule, the morning after, `gameLit`), the lit card's facts | the stacked layout, tap-to-light, the rows' sheet, the tab bar |
| Live | `guide.js`, `catchup.js`, `catalog.js`, `games.js` (`gameOn`, feeds) | `screens/live.js`: `groups()`, `groupName`, the row's programme view (`programmeView`), tune; `replay.js`: `playProgramme`, `programmeProgress` | the channel rows, the channel's day page, swipe to favourite |
| NBA | `league.js`, `games.js`, `app/nba.js`, `nba/common.js` | `nba/hub.js`: the hero state table, the day's games; `nba/standings.js`, `leaders.js`, `teamstats.js`, `news.js`, `team.js`: their data shapes | the stacked hub, full-width cards, chip rows for the leaders' categories, the tables |
| Library, Search, Saved | `shelves.js` (`Pager`, `shelves`, `genreShelf`, `savedItems`, `historyItems`), `catalog.js` | `screens/lib.js`: Sort / Filters state; `screens/search.js`: the query and sections | the 3-across grid, the segmented control, the search field |
| Title page | `copies.js` (+ the plays-here term), `imdb.js`, `subs/*` | `screens/detail.js`: the facts line, the pill's verb, seasons and episodes; `titlecopies.js`: a title's copies; `titlesubs.js`: the pill's state | the episode list, the sheets, the Infuse hand-off |
| Player | `games.js`, `replay.js`, `catchup.js`, `subs.js`, `quality.js`, `conncheck.js`, `intros.js`, `skipshow.js`, `app/player.js` (the loader) | `player.js`: the command / event vocabulary, kept as the contract between the controls and the element | the `<video>` host, the v2 bar in HTML, the gestures, the two layouts, PiP / AirPlay / media session |
| Account, sign-in | `core.js`, `state.js`, `session.js`, `tmdb.js`, `addons.js`, `qr.js` | `screens/account.js`: the groups and their rows, `teamSheet`; `screens/addons.js`: `addonsPane`, `tmdbKeyScreen`; `screens/first.js`: verify | the grouped lists, the pushed page |
| Everything | `util.js`, `ui.js` (sheets, menus, toasts drawn as bottom sheets) | | the frame (§2); `focus.js` is not used (touch) |

The build: `scripts/build-web.js phone` produces `www/` from `app/phone.html` + `app/tv/js` + `app/phone/` instead
of the old `app/index.html` / `app/app.js`, copies `capacitor.js` as the `tv` target does, then `npx cap sync ios`.
The native side is `PORT-NATIVE.md`; delivery is AltStore.

---

## 6. Open items

1. **Rotation:** the player follows the phone's orientation lock (so a user with the lock on gets portrait; a
   landscape button on the portrait player forces landscape through `@capacitor/screen-orientation`, as YouTube's
   does). Decide with the owner on the real phone.
2. **The owner's line and `.m3u8`:** test it before the build (`PORT-NATIVE.md`). If HLS output is off, live plays
   through `mpegts.js` over `ManagedMediaSource` (iOS 17.1+): PiP and background audio still work on the element;
   AirPlay of an MSE stream mirrors the screen.
3. **The channel banner in portrait** (live TV, not a game): the mock shows the game; a live channel in portrait wears
   the banner's facts in the title block (number, tile, channel, programme, times, the third line).
4. **A mini player** above the tab bar while a game plays in the background (audio) is an HTML strip; not in this round.
5. **Dynamic Type** beyond `xxLarge` (accessibility sizes): the cards would need a single-column layout; out of scope.
6. **"Sign in with your TV"** (the TV shows a code and a QR, the phone pulls the login over the LAN): the TV's
   `PhonePage` listens on **8790**, only while its screen is open and for **10 minutes**, with a **6-digit code and a
   5-try lock**, and it **receives** (the TMDB key, with a confirm on the TV); it has no `/ping`. Sending the provider
   password out is a new direction of trust: the QR would carry host, port and a one-time token; a typed code would
   make the TV ask `Send your login to this phone?` first; no subnet scan (iOS's Local Network prompt, and slow). Needs
   `NSCameraUsageDescription` and a barcode plugin for the scanner. After v1.
7. **Episode stills:** Cinemeta's episode thumbnails (the mock reuses the backdrop as a stand-in).
8. **Haptics and sounds:** the TV's UI sounds play on the phone only for the launch and a tune (the owner's sounds are
   final); a light haptic on tune and on reveal (`@capacitor/haptics`); off when the phone is silent.
9. **Push for `Remind me`:** a local notification at tip-off minus 10 (`@capacitor/local-notifications`); its text is
   the masked game name under the shield.
10. **Mocks still owed:** the game page with its shield covers, Search, the channel's day, the Reveal confirm, the
    long-press menu and the `15 rows` sheet (the builder works from the TV's and this spec's rules).
11. **A real broadcast frame** for `06` (the court is drawn, as in `player-v2`).
12. **MKV on the phone itself** (VLCKit in the WebView app) if the Infuse / VLC hand-off annoys the owner.
