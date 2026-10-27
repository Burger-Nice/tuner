# airglow TV: Home v2, v1.0

The design spec for the new Home tab: a billboard that is the thing you came for, then rows in the order they matter,
with the channels at the bottom. It replaces `design/ui-v1/UI-SPEC.md` 5.2 (Home) and keeps everything else of that
spec, of `nba-pages/SPEC.md` (the shield's seen model, team identity) and of `catchup/SPEC.md` 5.1 (the hero's catch-up
rows). Where this spec and those disagree about Home, this spec wins.

- **The mocks** are real HTML at the 960 × 540 canvas. They link the app's own `app/tv/brand/tokens.css`, `ui.css`,
  `app.css`, `nba.css` and `design/ui-v1/catchup/catchup.css`, plus `home-v2.css` (the new classes, all `hv-`, written to
  be appended to `app/tv/app.css`).
- **The scenario.** The owner's TV, Reykjavik time (UTC all year), shield `My team`, languages Icelandic then English,
  Stremio signed in (Cinemeta plus a debrid add-on). The 26 Oct 2026 slate is the real one (`nba-pages/data.json`);
  Grizzlies at Jazz tips off at 01:00 on the 27th (the "Mon 26 Oct · late" game of the night rule). The provider's
  channels, guide, titles, clocks and scores are stand-ins (the kit's fictional titles and procedural art).
  - **Game night:** Tue 27 Oct 01:52, Q2, he is watching the game (the reveal), `home-live`; 00:11, `home-pre`.
  - **The morning after:** Tue 27 Oct 10:40, the game unseen, a replay kept, `home-morning`.
  - **A normal evening:** Wed 28 Oct 20:41, no Grizzlies game, an episode half-watched, `home-evening`,
    `home-scrolled`, `home-channels`, `home-card-menu`, `home-offline`.
  - **Nothing to continue:** Sat 31 Oct 21:10, `home-discover`; **first start**, `home-first`.

| File | What it is |
|---|---|
| `RESEARCH.md` | what Netflix, Apple TV, Google TV, Disney+, Max, Plex, Infuse and Stremio do, and what carries over |
| `SPEC.md` | this |
| `BRAND-CHECK.md` | every mock against the brand rules, the departures argued |
| `*.html` (11) | the mocks; `png/*.png` are their 2× renders, `png/contact-sheet.png` shows them all |
| `home-v2.css` | the new CSS |
| `tools/build.js` | builds every mock from one scenario, and `tools/pages.json` |
| `tools/render.js` | the PNGs and the contact sheet |
| `tools/audit.js` | the self-check (section 11): the catch-up audit plus PRIMARY, ORDER, PEEK, BAR, HERO, SLABTXT |

## 0. The idea in one paragraph

Home opens on one big thing: your team's game when there is one (live, about to start, or last night's replay under the
shield), else the episode or film you are in the middle of, else a title you have not seen, chosen for you and said
plainly why. Under it, rows in the order they matter to one person: what you were watching, the NBA tonight, new
episodes of your shows, titles like the last one you finished, top picks, what is new, 4K, Icelandic, what you saved, and
last of all the channels (favourites first, then recent). Every row says why it exists, hides when it is empty, and can
be switched off or moved in Account > Home rows. Nothing plays by itself, nothing rotates under your thumb, and the
spoiler shield covers every card the same way it covers the rest of the app.

## 1. Decisions (each answers to UI-SPEC 1's principles; the research is in RESEARCH.md)

1. **One billboard, no carousel, no timer.** The focused button is the thing you came for and never changes its meaning
   on its own (UI-SPEC principle 4, review S3-4). A discovery pick changes once a day, between visits, never while Home
   is on screen.
2. **Continue watching is row 1 whenever it has items** (Plex's rule, Apple's Up Next). On a game day the game is the
   billboard, so resume is Down, OK: the same two presses UX-CHECK SF11 asked for. When nothing is in progress the row is
   simply absent; nothing says "empty".
3. **The channels go last.** The owner: "most NBA games are on a new channel… it can be there but not at top". The
   Channels row is favourites first, then the channels watched lately, and it is the last row. The last-channel hero is
   gone; the guide (Live) is one tab away.
4. **Every row names its reason** in its title or subtitle ("Because you watched Night Circuit", "Popular this week ·
   English first", "Icelandic, or with Icelandic subtitles"). No "Recommended for you" without saying from what.
5. **No trailers, no previews, no motion on the billboard** beyond the focus lift and the 12° wipe when a game changes
   state. Every app that autoplayed a hero added an off switch later (RESEARCH 2.6); an IPTV provider has no trailers;
   the brand bans masked video. The opt-in muted slab preview of UI-SPEC 3.5 stays as it is.
6. **Art first.** The billboard shows the title's backdrop (Cinemeta `background`, else the provider's TMDB
   `backdrop_path`), the wide cards show stills or backdrops under a bottom scrim, title rows show posters with captions
   below. Where only a poster exists it stands upright on the canvas; a poster is never stretched, blurred or mirrored.
7. **Two card sizes and one game card.** Wide 198 × 111 (16:9) for things in progress, new episodes and channels; 2:3
   posters 124 × 186 for titles; the NBA hub's 272 × 124 game card unchanged. Four wide cards, three game cards or six
   posters across, plus a peek.
8. **The shield covers Home exactly as it covers the hub** (nba-pages 8, catch-up 7): hidden plates, "Ended", partial
   records, "May show results" on studio shows, no result words, matched videos masked. Under `My team` the other games
   show their scores (the My team rule).
9. **Rows are a setting.** Account > Home rows lists every row with a toggle and its place; hold OK moves it. Continue
   watching is pinned first and can only be switched off. Hidden rows stay hidden; thin rows (fewer than 3 items) hide
   themselves until they fill.
10. **Cheap to draw.** At most 3 rows mounted (the focused one and its neighbours), 8 cards each, images decoded at slot
    size by the native layer, one redraw per data event, nothing re-laid out on a focus move (section 9).

## 2. Layout (960 × 540, safe x 48 to 912, y 27 to 513)

| Element | Geometry |
|---|---|
| Top bar | as UI-SPEC 3 (y 32 to 72), over the billboard under a top scrim (`.hv-st`, 0 to 96, bg-0 86 % to 0) |
| Billboard `.hv-bb` | x 0 to 960, y 0 to 292, full-bleed. Title states: the backdrop under `.hv-sx` (left-to-right, the detail page's stops) and `.hv-sy` (bottom 150 px to bg-0). Game states: the brand's flat bg-1 to bg-0 ramp with `grain.png` |
| Column `.hv-col` | x 48, y 90, width 540: eyebrow (22 high) · title Outfit 700 34/40, 2 lines at most · meta 15/20 · synopsis 16/21, 2 lines (discovery) or the progress bar 320 wide (continue) |
| Buttons `.hv-btns` | x 48, y 242 to 286, gap 20; primary `.btn` first and focused; a 14 px caption after the last button when there is one |
| Game column | status row y 92 (Your team · LIVE · NBA · channel · synced); plates y 128 to 216 (88 high, crest 64, name Outfit 700 26, record 15), score Barlow 800 italic 64 between them; the away plate bleeds to x 0, the home plate ends by x 625 |
| Slab `.hv-slab` | from x 632 at the bottom (678 at the top) to the right edge, y 84 to 292; content ink on the gradient: Barlow 60 (two lines, `Q2` / `4:12`) and a 14 px caps caption; all text inside x 912 |
| Row block | title Outfit 700 22/28 at x 48 (+ a 14 px subtitle), then the cards 10 px below (12 for posters), then 24 px to the next block. Pitch: wide 173, game 186, poster 302 |
| Row 1 | title y 298, cards y 336 |
| Rails | `.track` flex, gap 24, first card at x 48; cards past x 912 bleed (the peek); a card that slid out on the left is clipped at x 36 (the app's `clip-path`, so no sliver in the margin) |
| Cards | wide `.wc` 198 × 111 radius 16; game `.gc` 272 × 124; poster `.pc` 124 × 186 radius 12 + caption 14 px below; end card same box, dashed |
| Scrolled | the page `translateY` so the focused row's title sits at y 84; the bar is away; `.hv-cover` (0 to 84) fades the row above; `.ctxline` "Home · <row>" at y 27; `.hv-edge` fades the last 34 px |
| Offline pill | `.offline-bar` bottom right, inside the safe line (y 481 to 513) |

**Lift rule.** A row's cards must end at y ≤ 513 with their ring when the row is focused. Rows 1 of the wide and game
kinds do (bottom 447 / 460); a poster row directly under the billboard does not (336 + 186 = 522), so focusing it lifts
the page by the overshoot (19 px) and hides the bar like any lift; Up from it puts the page back and the billboard's
primary takes focus. A peeking row (its cards cross the safe line) shows art only, and its title only when the title
ends by y 513 (audit PEEK).

## 3. The billboard

### 3.1 Priority (what shows when)

Decided from cached data before first paint and locked for 3 s after the launch (UI-SPEC 5.2); its *content* (a score,
a clock) updates inside the lock, its *kind* does not.

| # | When | Kind |
|---|---|---|
| 1 | `Your team first` is on and your team's game is within its window: 3 h before tip-off to 30 min after the final, the behind-in-a-replay row until tip-off + 3 h 30 | **Game** (3.2) |
| 2 | Your team's last game is hidden (shield) with a replay, from 30 min after the final until the buzzer plays in a replay, you reveal it, the replay expires, 48 h pass or the next game's window opens (catch-up 5.1) | **Game, morning after** (3.2) |
| 3 | Something is in progress (a film, an episode, a replay) and was touched in the last 7 days, or the next episode of a show you finished an episode of in the last 7 days | **Continue** (3.3) |
| 4 | None of the above and the catalog has loaded | **Discover** (3.4): the day's pick |
| 5 | The channel list has not loaded yet (first start, or a cold cache) | **Welcome** (3.5) |

The last channel is no longer a billboard kind (owner decision). Row 1 of a kind-1 or kind-2 Home is Continue watching
when it has items, so resume stays two presses away.

### 3.2 Game (`home-live`, `home-pre`, `home-morning`, and catch-up's `home-live-tipoff` / `home-behind` rows)

The broadcast lower-third on the canvas: status row, two team plates with the score or `VS` or the shield tile between
them, the buttons, the slab off the right edge. The state table is UI-SPEC 5.2 plus catch-up 5.1, unchanged in meaning;
the strings and what goes where:

| State | Status row | Between the plates | Buttons (primary first, focused) | Caption | Slab |
|---|---|---|---|---|---|
| Pre, channel known | `YOUR TEAM` · `NBA · TIP-OFF` | `VS` | `Watch pre-game` · `Game page` | `In 49 min` / `NBA League Pass 4` | `49 MIN` / `TIP-OFF 01:00` (minutes under 10 h, else the time) |
| Pre, no channel | same | `VS` | `Choose channel` · `Open guide` | `No channel found yet` / `Your pick is remembered` | same |
| Live, revealed (you are watching it or the shield is off) | `YOUR TEAM` · LIVE · `NBA · NBA League Pass 4` · ◷ `Synced · 38 s` | `48 – 51` | `Watch live` · `From tip-off` (when a replay source exists) · `Box score` | none when three buttons; `On NBA League Pass 4` / `Hold OK for 2 more channels` when two | `Q2` / `4:12` / `LIVE · SYNCED` (`LIVE` when not synced, `HALF` at halftime, `SCORES UNAVAILABLE` when ESPN is stale) |
| Live, hidden | `YOUR TEAM` · LIVE · `NBA · NBA League Pass 4` | `Score hidden` tile | `Watch live` · `From tip-off` · `Reveal score` | none | `ON NOW` / `SCORE HIDDEN` (no period, no clock: catch-up S4) |
| Live, you are behind in a replay | `YOUR TEAM` · LIVE (on the clock) · `NBA · NBA League Pass 4` | `Score hidden` | `Resume` · `Back to live` · `Game page` | none | `Q1` / `8:20` / `YOU STOPPED HERE` |
| Final, hidden, a replay exists (the morning after) | `YOUR TEAM` · `NBA · MON 26 OCT · LATE` | `Score hidden` | `Watch from tip-off` · `Game page` | `NBA League Pass 4` / `Replays for 3 days` | `REPLAY` / `SCORE HIDDEN` |
| Final, hidden, you stopped partway | same | `Score hidden` | `Resume` · `From tip-off` · `Game page` | none | `Q3` / `6:41` / `YOU STOPPED HERE` |
| Final, hidden, no replay yet | same | `Score hidden` | `Game page` · `Pick the channel` | `No replay yet` / `airglow keeps looking` | `END` / `SCORE HIDDEN` |
| Final, seen (or shield off), within 30 min | `YOUR TEAM` · `NBA · FINAL` | `112 – 104` | `Box score` · `Watch again` (when a replay exists) | `Final · W 112–104` | `FINAL` / `FULL TIME` (`AFTER OVERTIME`) |

Rules: the time is shown once (the slab carries the clock, so the status row does not); records are `recordFor`
(partial with the eye-off under the shield); hold OK on any watch button opens the sources sheet (catch-up 5.1); the
away plate's colour field runs to the screen edge, the home plate ends before the slab; LIVE is always the dot plus the
word, 8 px or more from any team colour (audit). The muted preview of UI-SPEC 3.5 (opt-in) replaces the slab's clock
plate exactly as before, as a rectangle under the drawn slant.

### 3.3 Continue (`home-evening`)

| Element | String / rule |
|---|---|
| Eyebrow | `CONTINUE WATCHING` (pink-text) · `S1 · E3 · NIGHT CIRCUIT` (an episode: season, episode, the series when the title line is the episode's name; else `FILM`; a replay: `NBA · REPLAY` or `<channel> · REPLAY`) |
| Title | the series name for an episode (`Night Circuit`), the film's clean title, the matchup for a replay (`Grizzlies at Kings`); 2 lines at most, then an ellipsis. When Cinemeta has a `logo` for the title, the logo (72 px high at most, 360 wide) replaces the text |
| Meta | `2024 · Thriller · 49 min · [4K] · 21 min left`; a replay: `NBA · Replay · Stopped in Q3` (never minutes left, catch-up 5.2) |
| Progress | the gradient bar, 320 wide |
| Buttons | `Resume` (focused) · `Start over` · `Details`; a replay: `Resume` · `From tip-off` · `Game page` |
| Art | the title's backdrop; for an episode the episode still when the add-on has one, else the series backdrop |

The billboard's own title is not repeated in Continue watching. Next episode (the one after a finished episode, within
7 days) is the same kind with the eyebrow `UP NEXT · S1 · E4 · NIGHT CIRCUIT` and the primary `Play`; no progress bar.

### 3.4 Discover (`home-discover`, `home-first`)

When nothing is in progress: the day's pick, computed once a day (at the first draw after 04:00, or when the catalog
changes), from the titles that are **unseen** (not in History, not in Continue watching, not marked watched), in his
languages (`Shown first` languages or with subtitles in them), rated 7.0 or better where a rating exists, from the
provider's Popular sort (catalog.js `popular`) merged with the add-ons' Popular catalogs; ties broken by a fixed daily
seed so the pick holds for the day. A title with a backdrop (Cinemeta `background` or TMDB) wins over one without when
the scores are within 10 %.

| Element | String / rule |
|---|---|
| Eyebrow | `TOP PICK FOR YOU` · `THRILLER · FROM YOUR ADD-ONS` (genre, then where it comes from: `FROM YOUR PROVIDER` / `FROM YOUR ADD-ONS` / `POPULAR THIS WEEK` on a first start) |
| Title | as 3.3 |
| Meta | `★ 7.8 · 2024 · Thriller · 2h 06m · [4K]` (`Series · 2 seasons` for a series; `[IS]` when the title is Icelandic) |
| Synopsis | 2 lines of the add-on's or provider's description; 1 line when the title wraps to two |
| Buttons | `Play` (focused) · `Details` · `Save`; caption `Also from Cinemeta` (the title is on the provider and an add-on) / `From your provider` / `From Northlight` (an add-on's name when only it has it). `Save` becomes `Saved ✓` and is not focusable once saved |
| Art | the backdrop; with only a poster, `.hv-pst` upright at the right (128 × 192, y 96) on the canvas |

`Play` plays the best copy (copies RANKING.md) as the title page's Play would; a series plays S1 · E1. Hold OK on `Play`
opens the copies sheet. "Not interested" (hold OK on the pick's poster in a row, or `Details` then hold OK) removes the
title from the pick and from the discovery rows for 30 days.

### 3.5 Welcome (first start before the catalog is in; `UI-SPEC 5.11` loading)

The billboard is the flat ramp with the eyebrow `WELCOME TO AIRGLOW`, the title `Your channels, films and series are
loading`, no buttons focusable except `Open the guide` (primary) once the channel list is in; skeleton rows (flat
surface-1 blocks, no shimmer) stand where Top picks and Tonight in the NBA will be. The first discover pick appears
with the catalog; focus moves to it only if nothing is focused yet (never away from a button the owner reached).

### 3.6 Motion

The billboard never animates on its own. A kind change (game → continue at the window's end) cross-fades 200 ms. A
game state change inside the game kind (pre → live, live → final) plays the 280 ms 12° live wipe across the billboard
(UI-SPEC 4), once. Focus moves: the ring swaps instantly, the lift is 200 ms. Reduced motion: 120 ms fades.

## 4. The rows

### 4.1 Order and hiding

Default order (Account > Home rows can switch any off and move 2 to 10):

| # | Row title | Subtitle | Card | Items | When it shows |
|---|---|---|---|---|---|
| 1 | `Continue watching` | – | wide | up to 16 | pinned first; hidden when empty |
| 2 | `Tonight in the NBA` / `Last night in the NBA` / `Today in the NBA` | `1 live · 1 later · 3 final` (counts never spoil) / `As of 20:12` offline | game, next-game | your team's next game first (when it is not the billboard), then the slate ordered live, upcoming, final | a slate exists today or yesterday; else the next-game card alone with the title `Your team` |
| 3 | `New in your shows` | – | wide | up to 12 | episodes added to the provider or an add-on in the last 14 days for series he watched any episode of or saved |
| 4 | `Because you watched Night Circuit` | – | poster | 7 + `See all` | the last title he finished (or passed 80 % of) in the last 30 days; `moreLikeThis` scoring; unseen titles only; a new seed each time a title is finished |
| 5 | `Top picks for you` | `Popular this week · English first` (the languages setting's first name) | poster | 7 + `See all` | Popular, his languages, unseen, provider and add-ons merged; the day's pick leads it when it is not the billboard |
| 6 | `New on your provider` | `Last 14 days` | poster | 7 + `214 more` | movies and series by `added`, his languages first; the end card's count is the rest |
| 7 | `In 4K` | `Checked copies` | poster | 7 + `See all` | titles with a copy airglow has checked at 2160p (subtitles SPEC 6.1); named-only 4K is left out |
| 8 | `Á íslensku` | `Icelandic, or with Icelandic subtitles` | poster | 7 + `See all` | the first language of `Shown first` that is not English: titles in it, or with checked subtitles in it; the row is named in that language's own name (Account > Languages owns the list) |
| 9 | `Saved for later` | – | poster | 7 + `Saved` | saved movies and series not started yet, newest save first |
| 10 | `Channels` | `Favourites and recent` | wide (channel) | up to 16 | favourites in Saved's order, then `recents`; the billboard's own channel not repeated |

A row with fewer than 3 items hides (Continue watching and the NBA row show from 1). A title appears in at most one of
rows 4 to 9 (the earlier row keeps it) and never in a row while it is the billboard or in Continue watching. The Series
tab's equivalents: `Series to start` (first start only, in place of Because you watched: Popular series unseen).

### 4.2 Naming the NBA row

`Tonight in the NBA` from 12:00 until the last game of the day has ended; `Last night in the NBA` from 04:00 until 12:00
when yesterday's slate exists; `Today in the NBA` for a day slate with a game before 18:00. The night rule of nba-pages
(a game after midnight belongs to the evening before) decides which slate is "tonight".

### 4.3 The next-game card (`home-discover`, `home-first`)

A game card with one matchup line: status `YOUR TEAM` (pink-text) · the day (`Thu`, `Sun`, `Tomorrow`, `Today`), the
opponent's crest and `vs Lakers` / `at Nuggets`, a second line `2-2 · Thu 29 Oct` (the opponent's record as the shield
lets it be seen, then the date), and the tip-off plate `23:30` / `tip-off`. OK opens the game page. It leads the row only
while the game is outside the billboard's window; inside it the billboard has it and the card is dropped.

## 5. Cards

| Card | Size | Contents |
|---|---|---|
| **Wide, continue** `.wc` | 198 × 111, radius 16, 1 px border | art (still or backdrop) · a 14 px caps label top-left when there is one (`S1 E3`; `NBA · REPLAY` with the two crests top-right) · title Inter 650 16 + meta 14 at the bottom over the scrim (`S1 · E3 · 21 min left`, `Film · 1h 17m left`, `Stopped in Q3`) · the gradient progress bar flush |
| **Wide, new episode** | same | label `NEW` · `Signal Hill` · `S3 · E8 · Added today` (`Yesterday`, `Mon`, `3 Oct`) |
| **Wide, channel** | same | the channel tile (28, the provider's logo or the two-letter rule) and LIVE when a game is on it, top-left; the number top-right in a dark chip · programme title + channel name at the bottom · progress of the programme; no guide: the channel name as the title and `No guide information` as the meta (`May show results` with the eye-off under the shield, catch-up 4.3) |
| **Game** `.gc` | 272 × 124 | nba-pages 5.3 / catch-up 5.3 unchanged (hidden plate, `Ended`, the `⟲ Replay` mark) |
| **Next game** `.gc.next` | 272 × 124 | 4.3 |
| **Poster** `.pc` | 124 × 186 + caption | the provider's or add-on's poster · `4K` top-left when checked · a language badge top-right when not in his languages · the [tv] mark bottom-right when an add-on's title is on the provider too (addons 4.2) · a resume bar when started · caption: the clean title, then `2024 · ★ 8.4` (or the genre without a rating) |
| **End card** `.endcard` | the row's card box, dashed | `See all` (opens Movies or Series with the row's sort and filters set), `214 more` (New on your provider: the rest), `Saved` (the Saved tab) |
| **Masked** | wide or poster | a hidden game's video or a title that could tell: catch-up 5.8 (airglow's name and team colours, `Name hidden`) |

Focus on every card: the ring + 1.05 lift; the first card grows to the right (transform-origin 0 50 %); captions sit
14 px under a poster so the ring clears them.

## 6. Focus, scroll and keys

- **Entry focus:** the billboard's primary button, from launch, from the tab and from Back (UI-SPEC 6). Returning from
  the player or a title page: the card that was opened, by `data-key`, at its row's remembered position.
- **▲ ▼** move between the billboard's button row and the rows; each row remembers its focused card (`data-mem`). From
  the billboard ▲ is the top bar. From row 1 ▲ is the billboard's primary (not its last-focused button: the primary is
  the thing you came for). From the last row ▼ stops.
- **◀ ▶** move along a row; both edges stop (no exit to the bar). ▶ past the last item reaches the end card when the
  row has one. The track slides so the focused card keeps the first slot (x 48); cards that slid out are clipped at x 36.
- **Lift:** focusing row k ≥ 2 translates the page so row k's title is at y 84, the bar steps away and the context line
  shows `Home · <row title>`. Row 1 lifts only when its cards would cross the safe line (section 2). Auto-repeat: no
  smooth scroll, the ring moves instantly (UI-SPEC 4).
- **OK** on a card: continue → resume; new episode → play it; poster → the title page (never play: he has not seen it);
  channel → tune (the zap ring is the group it came from: favourites or all); game → the game page (a live game: the
  hub's rule, Watch live from the game page or the card's hold menu); next game → the game page; end card → the list.
  OK on a billboard button does what it says. **OK means one thing per element; hold OK is always the menu.**
- **Hold OK menus** (first row focused):
  - continue card: `Resume` · `Start over` · `Details` · `Mark watched` · `Remove from Home` (the item leaves Continue
    watching and the billboard; History keeps it); a replay: catch-up 5.2's menu plus `Remove from Home`
  - new episode: `Play` · `Series page` · `Mark watched`
  - poster: `Save to Saved` (`Remove from Saved`) · `Details` · `Not interested` (30 days out of the discovery rows)
  - channel: `Save to Saved` (`Remove from Saved`) · `Open in the guide`
  - game: the hub's `gameMenu`; next game: `Game page` · `Remind me` (greyed `Reminders come with the next update` until
    NEXT.md 1 ships)
  - billboard buttons: the watch buttons open the sources sheet (catch-up); `Play` the copies sheet; `Save` nothing
- **Back:** in the rows, scroll to the top and focus the Home tab (the tab rule); on the billboard, exit (the second Back
  of UI-SPEC AC-P10). A menu closes to its card.
- **Digits** on Home tune a channel number as in Live (unchanged).

## 7. States

| State | What Home shows |
|---|---|
| Loading (cold start, nothing cached) | 3.5 Welcome: the ramp, the eyebrow and title, skeleton rows; focus on nothing until a button exists; the launch holds as UI-SPEC 8 |
| Loading (cache) | Home as last drawn, redrawn once per data event (section 9) |
| A row's data not in yet | the row is absent, not a skeleton; rows appear in order as their data lands, below the focused row only (a row never inserts above the focus) |
| Nothing in progress | no Continue watching row; the billboard is the day's pick (3.4) |
| No NBA data (ESPN down) | the NBA row shows the cached slate with `As of 20:12`; a game billboard's slab reads `SCORES UNAVAILABLE`; no LIVE pills |
| No add-ons | Top picks and Because you watched come from the provider alone (no [tv] marks, no `FROM YOUR ADD-ONS`) |
| Offline with a cache (`home-offline`) | the billboard, Continue watching, the slate marked `As of …`, the catalog rows; `New in your shows` left out (it needs the provider); no LIVE pills, no clocks; the pill `Offline · showing what airglow remembers` bottom right, never focusable; everything still opens what is cached |
| Offline, no cache | the launch's offline card (UI-SPEC 5.11), not Home |
| Shield `My team` | the game billboard per 3.2; the Grizzlies card hidden in the NBA row, others with scores; studio shows `May show results`; matched videos masked in every row; no result word, no OT, no end time anywhere (audit SPOILER) |
| Shield `All games` | every game card hidden; the NBA row's subtitle counts still show |
| Provider with no VOD (M3U live only) | rows 3 to 9 absent; Home is the billboard, the NBA row and Channels |
| Row switched off | gone; the setting's row says `Off` |

## 8. Settings: Account > Home rows (`home-rows-setting`)

Two panes as today. Rows:
- `Your team first` · toggle · `On game days your team's game is the big card on Home` (exists)
- `Tell me when my team is live` · toggle · `A quiet chip while you watch something else` (exists)
- the label `ROWS, IN ORDER`, then one 56 px row per Home row: the grip (none on the pinned row), its number, its title,
  one line on what it is (4.1's "when it shows" in plain words: `Always first`, `Your team's next game, then tonight's
  games`, `New episodes of shows you watch or saved`, `Like the last title you finished`, `Popular this week in your
  languages, unseen`, `Added in the last 14 days`, `Copies airglow has checked`, `Icelandic, or with Icelandic
  subtitles`, `Saved titles you have not started`, `Favourites and recent, at the bottom`) and the toggle with the word
  `On` / `Off`.
- The hint under the list: ⓘ `OK turns a row off or on · Hold OK moves it · 4 of 10`.
- **OK** toggles. **Hold OK** lifts the row (Saved's reorder: ring + 1.02, `▲▼` move it, OK drops it, Back puts it
  back). Continue watching has no grip and does not move. `Reset order` is the last row of the list.
- Home redraws on the next entry, not while Account is open.

## 9. Data and performance

- **Rows mounted:** the billboard plus at most 3 rows (the focused one and its neighbours); each row mounts 8 cards and
  appends the rest only when ▶ reaches the sixth. Row heights are fixed per kind (section 2), so a row's position is
  arithmetic, never a layout read; `placeRails` keeps its no-read rule (card widths are fixed).
- **Redraws:** one `setHtml` per data event (`nba`, `progress`, `catalog`, `feeds`, `replays`, `favs`, `addons`,
  `league`), diffed by `data-key`; a score or clock change re-texts the billboard's nodes only. Nothing redraws under
  the launch except a hero change (home.js's existing rule). The rows below the first mounted ones are computed after
  `launchDone` and the first paint, in an idle callback, in order.
- **Images:** the native layer (`shouldInterceptRequest` → Coil) sizes them: billboard 1920 × 600 at most, wide cards
  396 × 222, posters 248 × 372, stills 396 × 222, crests 128; `sized()` asks for those. The billboard's image is decoded
  before the launch wipe (it is part of "Home ready"); a card's image loads lazily (`loading="lazy"`), and a card draws
  its scrim and text before the image arrives so nothing jumps.
- **Backdrops:** Cinemeta `background` by IMDb id (`imdb.js`), else Xtream `get_vod_info` / `get_series_info`
  `backdrop_path[0]` (fetched once for the billboard's title only, cached 30 days), else the poster upright (3.4), else
  the initials tile. Stills: an add-on's episode `thumbnail`, else the series backdrop.
- **The day's pick** (3.4) and the Because you watched list are computed at most once a day and when their seed changes,
  cached in IndexedDB with the catalog's `PREP` version; Top picks reuse the Movies tab's Popular order (no second sort).
- **Shield checks** run on card data before markup (`videoMask`, `show`, `recordFor`), never on the DOM.
- **No new CSS cost:** three flat scrims (two-stop and the detail page's four-stop), no filter, no mask on moving
  pixels, no shadow but the ring; transforms and opacity only; `will-change` on the focused card only.
- **Budget:** 250 UI nodes on the busiest mock (`home-morning`, art excluded; the kit's target is about 250), 93 on the
  settings page.

## 10. Strings (every string on Home v2, in one place)

Eyebrows: `YOUR TEAM`, `CONTINUE WATCHING`, `UP NEXT`, `TOP PICK FOR YOU`, `POPULAR THIS WEEK`, `WELCOME TO AIRGLOW`,
`NBA · TIP-OFF`, `NBA · FINAL`, `NBA · MON 26 OCT · LATE`, `NBA · NBA LEAGUE PASS 4`, `FILM`, `S1 · E3 · NIGHT CIRCUIT`,
`THRILLER · FROM YOUR ADD-ONS`, `FROM YOUR PROVIDER`, `ANIMATION · 4,812 FILMS ON YOUR PROVIDER`.
Slab: `Q2` `4:12` `LIVE · SYNCED`, `LIVE`, `HALF`, `ON NOW` `SCORE HIDDEN`, `49 MIN` `TIP-OFF 01:00`, `REPLAY`,
`END`, `FINAL` `FULL TIME` / `AFTER OVERTIME`, `YOU STOPPED HERE`, `SCORES UNAVAILABLE`.
Buttons: `Watch live`, `Watch pre-game`, `From tip-off`, `Watch from tip-off`, `Box score`, `Reveal score`, `Game page`,
`Choose channel`, `Open guide`, `Pick the channel`, `Resume`, `Back to live`, `Start over`, `Details`, `Play`, `Save`,
`Saved ✓`, `Watch again`, `Open the guide`.
Captions: `On NBA League Pass 4`, `Hold OK for 2 more channels`, `In 49 min`, `No channel found yet`, `Your pick is
remembered`, `Replays for 3 days`, `No replay yet`, `airglow keeps looking`, `Final · W 112–104`, `Also from Cinemeta`,
`From your provider`, `From Northlight`, `Synced · 38 s`, `Score hidden`, `21 min left`, `Stopped in Q3`.
Rows: section 4.1's titles and subtitles; `Series to start`; `Your team`; the NBA counts `1 live · 1 later · 3 final`,
`5 final`, `4 later`, `As of 20:12`.
Cards: `S1 E3`, `NEW`, `NBA · REPLAY`, `Added today`, `Yesterday`, `Film`, `No guide information`, `May show results`,
`Ended`, `Final`, `hidden`, `tip-off`, `See all`, `214 more`, `Saved`, `Name hidden`.
Menus: section 6. Settings: section 8. Offline: `Offline · showing what airglow remembers`. Context line: `Home · <row>`.

## 11. Self-check (`node tools/audit.js`; ring data in `tools/audit-rings.json`)

On all 11 mocks, 0 findings: one focus ring per screen; no two texts overlap; no text touches a box it is not in; nothing
clipped; nothing but art and rails outside the safe area; contrast 4.5:1 on every flat ground; the ring is read back
from the pixels on all four sides; no amber, yellow or non-LIVE red; 24 h clocks; SPOILER (no score, result word, OT or
end time outside `data-other` on the shield mock); CONTAIN; TRUNC; RAILFOCUS (a focusable row's cards end by 513);
RINGTEXT; team colour 8 px from LIVE and never under a ring; and the Home checks: **PRIMARY** (one gradient button, and
it is the focused element on an unscrolled Home), **ORDER** (Continue watching first, Channels last), **PEEK** (a
peeking row shows art only, nothing sliced), **BAR** (the bar away and the context line on, only when scrolled; the
billboard unmounted when scrolled), **HERO** (the column ends before x 600, the buttons at y 242 to 286), **SLABTXT**.
`--inject` plants a second primary, a swapped row order, a visible caption in a peek row and a score on the shield mock:
16 findings, every new check fires.

## 12. Acceptance

| ID | Task | Result |
|---|---|---|
| H-P1 | Cold launch on a game day to your team's stream | 1 (OK on Watch live); 2 with Choose channel |
| H-P2 | Launch on a game day to resume | 2 (▼, OK) |
| H-P3 | Launch with no game to resume | 1 (Resume focused) |
| H-P4 | Launch with nothing in progress to something to watch | 1 (Play on the pick) or 2 (Details, then Play) |
| H-P5 | Home to tonight's other games | ▼ ▼ from the billboard (row 2), OK on a card = 3 |
| H-P6 | Home to a favourite channel | Channels is the last row: ▼ × (rows on) then OK; from the top bar Live is one ◀ ▶ away, and digits tune directly. Accepted cost (owner decision 1.3) |
| H-P7 | Remove a title from Continue watching | hold OK, ▼ × 4, OK = 6; `Mark watched` is 5 |
| H-P8 | Switch a row off | Account, Home rows, the row, OK |
| H-F1 | One ring; nothing steals focus; the billboard's kind never changes under the thumb | section 3.1's lock, the audit's PRIMARY |
| H-F2 | A row never inserts above the focused row | section 7 |
| H-B1 | No spoiler on any Home surface under the shield | section 7, audit SPOILER on `home-morning` |
| H-Q1 | No collisions, clipping or safe-area misses | 11 pages, 0 findings |
| H-L1 | Home interactive within 2 s of a warm start | the billboard and row 1 are the first paint; rows 2+ after `launchDone` (section 9); to measure on the TV |

## 13. Port notes (for the engineer; no app code was written in this round)

- `screens/home.js`: `draw()` becomes billboard + rows from one row plan (`rowPlan()` returns `[{id, title, sub, kind,
  items}]` honouring Account > Home rows); `ROW_TOP` goes, row tops are computed from the kinds' pitches; `placeRails`
  gains the lift rule; mount 3 rows, 8 cards each; the idle-time fill of rows below.
- `cards.js`: `wideCard` (continue, new episode, channel) replaces `liveCard` / `contCard`'s `.hc` markup; `poster` gets
  `mine` and `prog` already; `nextGameCard`; the billboard builders (`bbGame` from `gameHero` / `replayHero` with the
  `hv-` layout, `bbContinue`, `bbDiscover`, `bbWelcome`).
- `app.css`: append `home-v2.css`; drop `.hc` and the `.rail.peek .hc` rules once nothing uses them; the grain url
  becomes `brand/sprites/grain.png`.
- `catalog.js`: `recentlyAdded(days)`, `newEpisodesFor(seriesIds)`, `inLanguage(lang)`, `checked4K()` helpers over the
  prepared lists; `addons.js` exposes `popularCatalog()` and `background`/`logo` by IMDb id.
- `state.js`: `hiddenFromHome` (Remove from Home), `notInterested` (30 days), `homeRows` (order and toggles),
  `dailyPick` (date, id).
- Native: Coil size hints for the new slots (section 9).
- `tests/tv/`: a Home walkthrough script (billboard kinds, row order, Remove from Home, the rows setting).

## 14. Decisions for the owner (with the recommended answers)

1. **The discovery pick's primary: `Play` or `Details`?** Recommended `Play` (Apple's Top Shelf and Netflix both lead
   with play; the synopsis is on the billboard so he can decide there; a wrong OK is one Back).
2. **The channels row: last, or just below the NBA row?** Recommended last, as he asked ("not at top"); digits and the
   Live tab reach a channel faster than any row would.
3. **`Á íslensku` as a row of its own, or Icelandic titles mixed into Top picks with the `IS` badge?** Recommended a row
   of its own (a small, clear shelf for the few Icelandic titles a provider has), named in Icelandic, switched off in
   Home rows if he never uses it.
