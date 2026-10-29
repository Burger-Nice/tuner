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

---

## 0. Decisions (each with its reason)

1. **Same sections, same words, same art; only the surface changes.** Home is still the Marquee over the personal
   rows; Live is still the guide with its group chip; NBA has the same section row (`Games · [crest] Grizzlies ·
   Standings · Leaders · Team stats · News`); the title page has the same facts line, the same copy line and the same
   pill; the player wears the v2 bar. *Why:* the owner said so, and the TV design has been through five reviews. A
   phone that looks like the TV is also the phone he can use without learning anything.
2. **A tab bar with four tabs and the search tab: Home, Live, NBA, Library, and Search at the trailing end.** The
   TV's seven destinations (Search, Home, Live, NBA, Movies, Series, Saved) become four plus Search. **Library** holds
   Movies, Series and Saved as a segmented control at its top. Account is the avatar at the top right of every tab,
   exactly where the TV has it. *Why:* Apple's guidance (section 1): fewer tabs are easier, overflow (a More tab)
   hides content, and iOS 26 reserves a dedicated search tab at the trailing end. Movies and Series are one kind of
   browsing on a phone (the same library, the same grid), so one tab with a switch loses nothing the TV has.
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
8. **The player is the TV's v2 bar in two orientations.** Portrait: the video 16:9 under the status bar, then the
   title block, the track with its chapter ticks up to the live point, the ends row, the transport row (−1 m, channel
   up, pause, channel down, +1 m), the game actions (`Skip to Q3`, `Back to live`, `Game`), the iOS row (Subtitles,
   Audio, AirPlay, PiP, Options), and the zap ring as a list. Landscape: full screen, the v2 bar on the bottom scrim,
   the title block top-left, `Ends 21:02` top-right, the iOS buttons at the right of the buttons row. *Why:* the bar's
   words and order are the TV's, reviewed twice; AVPlayerViewController's own controls would lose the chapters, the
   shield's `End hidden` and the zap ring, so the controls are ours, on an AVPlayer layer, with the system's AirPlay
   route button and PiP controller (section 1, Apple's rule: a custom player should mirror the system one's
   habits, which these controls do: tap to toggle, double-tap the edges to seek, swipe to scrub).
9. **The shield is the TV's, byte for byte.** `Score hidden`, `ON NOW` without a clock, records `as of tip-off`, the
   timeline that stops at the live point, `End hidden`, the Reveal behind a confirm, the seen store shared with the
   TV through the provider account. The phone never reveals what the TV would hide. *Why:* `games.js` already does it;
   the phone only draws its answers.
10. **"Sign in with your TV."** The TV's Account › Provider gets `Send to your phone`: a six-character code and a QR.
    The phone types the code or scans it, finds the TV on the same Wi-Fi (the TV already runs `PhonePage`, the small
    HTTP server a phone opens to type the TMDB key into the TV) and pulls the provider login, the team, the shield
    mode, the add-ons and the TMDB key. Xtream and M3U by hand stay below it. *Why:* every big service signs a TV in
    from a phone with a code or a QR (Netflix's `netflix.com/tv2`, Disney+'s eight-digit code); here the direction is
    reversed because the TV is the one that is signed in. The owner must never retype a provider password on a phone
    keyboard.
11. **A data-saver quality choice, on by default on mobile data.** `Best on Wi-Fi · 720p on mobile data`, a toggle in
    Account › Playback and a chip on the player (`Mobile data · 720p`) that opens the quality sheet. *Why:* the
    brief's note; the copy ranking (`copies.js`) already knows each copy's resolution, and the provider's streams
    carry their variants.
12. **Dark only, the TV's tokens, Dynamic Type where it is cheap.** The phone scale is Outfit 700 32 (large titles),
    24, 20; Inter 16 body, 14 secondary, 13 caption, 12 labels and badges (the TV's 14-pt floor was for 3 m; iOS body
    is 17 and caption 12). Body and row text follow the system's text size up to the `xxLarge` step (the Marquee's
    card, the cards and the player's bar are fixed). *Why:* one brand; the owner sets his phone's text size like
    everyone else.
13. **Safe areas are respected everywhere.** 59 pt top (status bar and the Dynamic Island), 34 pt bottom (the home
    indicator), 16 pt side gutters; the tab bar floats 26 pt from the bottom; content scrolls under it (a fade keeps
    the last row readable). The player in landscape keeps its text 64 pt in from the short edges, clear of the island.
14. **Touch targets are 44 pt or bigger**, chips 36 pt (Apple allows 28 for chips in a row), rows 50 to 72 pt. Every
    hold-OK menu on the TV is a long-press context menu here (the system's, with the same items in the same order).
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
- iOS 26's tab-bar API (WWDC25 session 284, S): `tabBarMinimizeBehavior(.onScrollDown)`, `Tab(role: .search)`,
  `tabViewBottomAccessory`. → The bar minimises on scroll in the rows and the guide; a playing stream's mini bar is
  the bottom accessory (open item 4).

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
| Status bar | the system's; the clock at the left, the island 125 × 37 at y 11 (nothing of ours above y 59) |
| Top bar | y 59 to 103: the mark (26 pt) on Home, else the tab's large title (Outfit 700 32); at the right the tab's own buttons (Live: search; NBA: `ESPN · 20:41`) and the avatar (34 pt, the gradient disc; a dot on it when Updates has one) |
| Content | from y 112; 16 pt gutters; rows and cards edge to edge inside them |
| Tab bar | floating, 58 pt high, 26 pt from the bottom, 16 pt in from the sides: a glass pill (bg-1 at 78 % under the system blur) with Home, Live, NBA, Library (icon 24 + label 11), the selected tab on a chalk-tint pill; the search tab a 58 pt disc at the trailing end; a 120 pt fade under content so the last row stays readable |
| Home indicator | the system's |
| Back | the system's: a chevron top-left on pushed pages, the edge swipe, and tapping the selected tab returns to its root (the TV's Back model: tab roots stay where you left them) |

Sheets are the system's (`.presentationDetents`): medium for pickers and menus (the radio menus of `ui.js`), large
for lists (the 15 rows, the sources sheet, Choose a video). Toasts are the TV's, 44 pt above the tab bar.

---

## 3. The screens

### 3.1 Home (`01-home-evening`, `02-home-gamenight`)

**From the TV:** `screens/home.js` (the Marquee's lines, the lit card, game night) and `rows.js` / `shelves.js` /
`tmdb.js` / `art.js` (the rows, the page, the taste profile, the backdrops' cap and glow). The phone reuses all of them:
`home.js`'s line model (`kind`: continue / new / pick / game, the 3-or-4 rule, the morning-after rule) and `rows.js`'s
page are read as data; only the draw changes.

| TV | Phone |
|---|---|
| the picture full-bleed, the lineup at x 56 | the picture is the top 470 pt (`--pos` per title, the cap from the 32 pt copy, the top scrim for the bar, the bottom scrim to canvas); the lineup starts at y 238 |
| the lit line is its card in the column | the lit line is its card across the width (`.hm-card`: radius 18, the glow colour to canvas, a 1 pt chalk line): eyebrow, logo 46 pt (else the name Outfit 700 26), the facts with badges, one line, the bar 180 × 4, the actions: the pill (`Resume`, `Play`, `Watch live`, `Tune`, `Details` on a pick) full width beside one ghost button (`Episodes`, `From tip-off`, `More popular films`) and `…` (the hold-OK menu) |
| the unlit lines, Outfit 30 at 66 % | 44 pt rows, Outfit 700 20 at 78 % + the facts in 13 pt, a chevron; a tap lights the line (its card opens in place, the picture answers after 600 ms) |
| the peek, `P− Browse · 15 rows` | the first row peeks under the lines; its title row ends in `15 rows ▾` (the index sheet) |
| game night: the two fields, crests 150 | the fields fill the top 470 pt (the split at 62 %, 12°), crests 96 at y 112 with names and `as of tip-off`, the `ON NOW` chip and the `Score hidden` plate at y 254, the Sharp card (5° here: 12° on a 200 pt card would cost 42 pt of width) |
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
| the ruler and six rows by time | `Now 20:41 · Wed 28 Oct` and the hint; then channel rows (72 pt): number, tile (the logo on its colour, else the abbreviation), the name with the favourite star, the programme on now (LIVE pill when the TV draws one; a game under the shield reads the TV's masked name), the progress bar and `20:35 to 20:55 · Next Fréttir 20:55`; `No guide information` as on the TV |
| ◀ ▶ along time | the chevron opens the channel's day: a vertical list of its programmes with the archive above now (`catchup` §4: kept programmes play from their start, gone ones are grey) |
| group chip + the groups sheet | the chip row (`Favourites · 10`, `All channels`, the provider's groups, `Sports` first when a game is on) |
| hold OK favourite with undo toast | swipe left: `Favourite` / `Unfavourite` with the undo toast; long-press: the hold-OK menu (favourite, open the channel's day, which game it carries) |
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
Filters / Jump), `shelves.js` (`Pager`, `shelves(kind)`, `genreShelf`), `screens/saved.js`, `catalog.js`. No mock this
round: it is the TV's grid at 3 posters across (108 × 162, 10 pt gutters), the shelf chips in a row at the top
(`Popular`, `New`, `Top rated`, `Comedy`, …), the segmented control `Movies · Series · Saved` in the title bar, the
scroll bubble (`#313 of 3,000+`) while the scrollbar is dragged, Sort and Filters as a medium sheet. The owner's
decision stands: the library is the add-ons, never the provider's VOD.

### 3.5 The title page (`05-title-series`)

**From the TV:** `screens/detail.js` (the facts line, the plot, the pill's verb, seasons and episodes, Save,
`Mark watched`), `titlecopies.js` + `copies.js` (the copy line: `4K HDR, 5.1 · best of 3 copies`), `titlesubs.js` +
`subs/*` (the subtitles pill and sheet), `imdb.js`, `shelves.js` (`openItem`: the IMDb id first), `rows.js` (`plays`).

| TV | Phone |
|---|---|
| the backdrop, the text at x 48 | the backdrop as the top 400 pt under the cap and scrims; the back chevron and `…` on 40 pt discs at y 61 |
| `SERIES · THRILLER · SCI-FI`, the title, the facts | the eyebrow, the logo 54 pt (else the name Outfit 700 28), `★ 8.7 · 2022– · 2 seasons · TV-MA · 4K · EN`, the plot clamped at 2 lines (tap expands) |
| `Resume S1 · E3` · `Save` · `Subtitles: English` | the pill full width beside `Saved` and the CC button (the subtitles sheet); under them the copy line with the tick |
| season chips, the episode rail, the lit episode's line | the season chips with `10 episodes · 3 left`; the episodes as a vertical list (still 132 × 74 with the number chip, the tick for watched, the progress bar; name, duration or `21 min left`, one line of the episode; the one you are on in pink-text) |
| hold OK on the pill | long-press the pill: `Start over`, `Choose a copy` (the sources sheet), `Mark watched` |

A film: the same page without seasons; `Play` / `Resume`; `More like this` as a row under the plot.

### 3.6 Search and Saved

`screens/search.js` behind the search tab (the system's search field in the tab bar, results as the TV's: channels,
titles and games in sections; the keyboard is the phone's, which is the point). Saved is the Library's third segment
(`screens/saved.js`).

### 3.7 The player (`06-player-portrait`, `07-player-landscape`)

**From the TV:** `player.js` (commands and events: `meta`, `game`, `ring`, `tune`, `queue`, `versions`; events `track`,
`need`, `pick`, `progress`, `exit`), `games.js` (the per-channel delay, `chaptersOf`, `asAired`, the replay state,
`behindReplay`), `replay.js`, `catchup.js`, `subs.js` + `subs/*`, `quality.js`, `conncheck.js` (the diagnosis),
`intros.js` / `skipshow.js` (Skip intro, Up next). The native side is new on iOS: an `AVPlayer` with
`AVPlayerLayer`, `AVRoutePickerView` (AirPlay), `AVPictureInPictureController`, `AVPlayerItem.externalMetadata` for
the lock screen and PiP, HLS natively (the provider's HLS and the add-ons' direct links; the TS streams the Android
player takes through Media3 are open item 2). The v2 bar's port checklist (`player-v2/player-v2.css`, class per
view) is the checklist here too, in SwiftUI or UIKit.

**Portrait (the game, `06`)**

| Part | Geometry |
|---|---|
| the video | y 59 to 280, 16:9 aspect-fit; over it the top scrim (80 pt), the close chevron (40 pt disc, top-left), the corner block (`Score hidden` / `You're in Q2`, or `Ends 21:02` / `21 min left`), the data-saver chip bottom-right (`Mobile data · 720p`, opens the quality sheet) |
| the title block | y 292: the name Outfit 700 22 (or the logo 36 pt), `NBA League Pass 4 · Thu 29 Oct · late · 4K`, the st-what line with the tick |
| the track | y 362: the TV's: played in the gradient, the thumb 18 (22 while dragging, with the bubble), the ticks at Tip-off / Q2 / Half / Q3 up to the live point, the live dot, the dashed `ahead` segment to the right end |
| the ends row | y 388: the chapter names, the compact LIVE pill at the live point, the eye-off at the right end (`End hidden`; the TV's words, the icon alone because 361 pt holds no more) |
| the transport row | y 420: −1 m, channel up, pause 60 pt, channel down, +1 m (an episode: −10, pause, +10, Next episode) |
| the actions | y 492: `Skip to Q3` (the next unplayed chapter), `Back to live`, `Game` (the game panel as a sheet: quarters, plays, Sync) |
| the iOS row | y 546: Subtitles, Audio, AirPlay, PiP, Options (the TV's Options panel as a sheet: subtitles, audio, picture size, quality, connection, speed, frame rate, intros) |
| the zap ring | y 628: `Channels · Favourites · 4 of 10 · All channels ›` and the ring as rows (the current one ringed in pink-tint); tap tunes; the channel buttons step through this ring |

**Landscape (an episode, `07`)**: the video full screen, aspect-fit (16:9 on 19.5:9 leaves 65 pt black each side,
where the island and the home indicator live); the close X at x 58; the title block from x 110 (logo 36, the episode,
the st-what line); the corner at the right; the buttons row at y 262 (−10, pause 52, +10, `Next episode ›`, then
Subtitles, Audio, AirPlay, PiP, Options at the right); the track at y 326; the ends row at y 352 with the gesture hint
(`‹ › swipe 10 s · double-tap the edges`) until it has shown 5 times (the TV's hint rule); the scrims the TV's.
Live in landscape wears the channel banner (`player-v2` 06 and 13): the number, the tile, the channel, the
programme, the third line, the tags; channel up / down by a vertical swipe on the picture.

**Gestures:** tap toggles the controls (auto-hide 4 s; never while paused); double-tap the left or right third seeks
10 s (a game: 1 min); a horizontal drag on the track scrubs (the bubble, the chip `▶▶ ×8` on a long drag); a vertical
swipe on a live picture zaps; pinch toggles aspect-fill (the HIG's two modes); the system's edge swipe and the close
button leave the player; rotating the phone switches the layout without stopping playback (open item 1 on the
rotation lock).

**States:** loading (black with the spinner after 2 s, the title block already drawn), stalled (the diagnosis card:
`conncheck.js`'s connection check, `Try another copy`), paused (the picture 35 % darker, the Paused tag; live pause as
the TV's `2:40 behind live`), behind live (the corner, `Back to live`), the shield (`Score hidden`, `End hidden`, the
timeline's ahead segment), Up next (the countdown ring chip at the credits), Skip intro (the chip), subtitles (chalk
Inter 600 at 5.3 % of the video's height), no copy (`Nothing to play yet · Check the add-ons`), PiP (the system's
window; the app's tab stays where it was), background (audio continues for a game or a channel when the data-saver
setting allows; the lock screen shows the title and the artwork).

### 3.8 Account (`08-account`) and sign-in (`09-signin`)

**From the TV:** `screens/account.js` (Provider, Playback, NBA with `teamSheet`, Languages, Home rows, Updates,
About), `screens/addons.js` (the add-ons pane, the Stremio account link), `qr.js`, `tmdb.js` (the key check,
`N of M rows`), `screens/first.js` (sign-in: Xtream and M3U, verifying), `core.js` (providers, settings, storage),
`state.js`, `session.js`.

Account is the TV's groups as iOS grouped lists: **Provider** (the line, `Active`, expiry, channels; `Sign in with
your TV`; `Refresh channels and guide` and `Connections` on the provider page), **Playback** (`Data saver on mobile
data`, `Subtitles`, `Keep playing when you leave` (PiP), `Match frame rate` is not a phone setting), **NBA** (`Your
team`, `Spoiler shield`: Off / My team / All, the TV's radio sheet), **Films and series** (`Add-ons`, `TMDB key`,
`Home rows`), **App** (`Updates`: TestFlight or AltStore say what is new; the TV's version shown beside it, `About`,
`Sign out`). Languages sits under Subtitles.

Sign-in (first run and `Sign in with your TV`): the lockup, one line; the card `Sign in with your TV` (the six code
boxes, `Scan the TV's code`, what it brings); `or sign in by hand`: `Xtream Codes · M3U link`, the three fields, `Sign
in` (the ghost button becomes the pill once the fields are filled; verifying is the TV's state), the privacy line.
Errors are neutral (the dashed field and one sentence, brand §6).

**How the hand-off works** (the builder's note): the TV's Account › Provider › `Send to your phone` shows a code
(`A7K3PQ`: 6 of 32 characters, no 0/O/1/I) and a QR (`airglow://tv?host=192.168.1.23&port=8777&code=A7K3PQ`) for 5
minutes; `PhonePage` gains `GET /handoff?code=…` answering, once, the provider lines, the team, the shield mode, the
add-ons' manifests and the TMDB key, over the LAN only; the phone types or scans, calls it, and the TV shows `Sent to
your phone ✓`. Typing the code without scanning: the phone finds the TV by trying the local subnet's `/ping` on the
TV's port (the TV already answers it for the phone page); if it cannot, it asks for the TV's address, which the TV's
page shows.

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

## 5. What is reused, in one table

| Phone screen | TV modules reused unchanged | New on the phone |
|---|---|---|
| Home | `screens/home.js` (lines, lit card, game night, `gameLit`), `rows.js`, `shelves.js`, `tmdb.js`, `art.js`, `cards.js` | the stacked layout, the tap-to-light, the rows' sheet, the tab bar |
| Live | `screens/live.js`, `guide.js`, `catchup.js`, `replay.js`, `games.js` (`gameOn`, feeds), `catalog.js` | the channel rows, the channel's day page, swipe to favourite |
| NBA | `screens/nba.js`, `nba/*`, `league.js`, `games.js`, `screens/game.js`, `screens/team.js`, `app/nba.js` | the stacked hub, full-width cards, chip rows for the leaders' categories |
| Library, Search, Saved | `screens/lib.js`, `screens/search.js`, `screens/saved.js`, `shelves.js`, `catalog.js` | the 3-across grid, the segmented control, the system search field |
| Title page | `screens/detail.js`, `titlecopies.js`, `copies.js`, `titlesubs.js`, `subs/*`, `imdb.js` | the episode list, the sheets |
| Player | `player.js` (the JS side), `games.js`, `replay.js`, `catchup.js`, `subs.js`, `quality.js`, `conncheck.js`, `intros.js`, `skipshow.js` | the native iOS player (AVPlayer, AirPlay, PiP, lock screen), the two layouts, the gestures |
| Account, sign-in | `screens/account.js`, `screens/addons.js`, `qr.js`, `screens/first.js`, `core.js`, `state.js`, `session.js` | the grouped lists, `Sign in with your TV`, the data-saver setting |
| Everything | `ui.js` (sheets, menus, toasts become the system's), `util.js`, `focus.js` is not used (touch) | the frame (§2) |

The build: `scripts/build-web.js phone` already produces a phone `www/`; it should bundle `app/tv/js` with a phone
entry (`app/phone.html` + `app/phone/`) instead of the old `app/index.html` / `app/app.js`, and the Capacitor iOS
project at `ios/` gains the player plugin (the Android `TunerPlayerPlugin`'s command / event contract, re-implemented).

---

## 6. Open items

1. **Rotation:** the player follows the phone's orientation lock (so a user with the lock on gets portrait; a
   landscape button on the portrait player forces landscape, as YouTube's does). Decide with the owner on the real phone.
2. **TS streams:** AVPlayer plays HLS; a provider's raw MPEG-TS needs a remux (the old phone build used `mpegts.js` in
   the WebView, which cannot do PiP or AirPlay). Try the provider's HLS variant first (Xtream serves `.m3u8`); if a
   channel only has TS, play it in the WebView without PiP and say so in the Options sheet.
3. **The channel banner in portrait** (live TV, not a game): the mock shows the game; a live channel in portrait wears
   the banner's facts in the title block (number, tile, channel, programme, times, the third line).
4. **A mini player** as the tab bar's accessory while a game plays in the background (audio) is cheap in iOS 26 and
   worth a try after the first build; not in this round.
5. **Dynamic Type** beyond `xxLarge` (accessibility sizes): the cards would need a single-column layout; out of scope.
6. **The hand-off's `PhonePage` endpoint** (§3.8) is new on the TV side; until it ships the phone signs in by hand.
7. **Episode stills:** Cinemeta's episode thumbnails (the mock reuses the backdrop as a stand-in).
8. **Haptics and sounds:** the TV's UI sounds play on the phone only for the launch and a tune (the owner's sounds are
   final); a light haptic on tune and on reveal; off when the phone is silent.
9. **Push for `Remind me`:** a local notification at tip-off minus 10 (the TV's reminder is in-app).
10. **A real broadcast frame** for `06` (the court is drawn, as in `player-v2`).
