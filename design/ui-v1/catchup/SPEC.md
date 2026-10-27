# airglow TV: catch-up, v1.0

The design spec for watching past broadcasts: the guide before now, "Watch from tip-off", finished games, replays from the
provider's Movies when it keeps no archive, and the player's timeline (pause, rewind, skip, back to live). It extends
`design/ui-v1/UI-SPEC.md` v1.2 and `design/ui-v1/nba-pages/SPEC.md` v1.1 (focus rules, hero state table, the spoiler
shield and its seen model). Everything not said here follows those two.

- **The mocks** are real HTML at the 960 x 540 canvas. They link the app's own `app/tv/brand/tokens.css`, `ui.css`,
  `app.css` and `nba.css`, plus `catchup.css`. `catchup.css` holds the new classes, all prefixed `cu-`, written to be
  appended to `app/tv/app.css`. The player mocks draw the native overlays in HTML at dp = CSS px, with the same tokens
  (`Ui.java`), as `design/ui-v1/player/` did.
- **The scenario.** The owner's TV, Reykjavik time (UTC all year), shield `My team`:
  - **The morning after:** Tue 27 Oct 2026, 10:40. Last night the Grizzlies played at the Jazz (tip-off 01:00, the
    "Mon 26 Oct · late" game of the night rule). He was asleep; the game is unseen. The provider's channel
    `NBA League Pass 4` carried it and keeps 3 days.
  - **The live ones:** the same game at 01:52 (Q2) and 02:08 (halftime).
  - The ESPN schedule (opponents, dates, the Kings and Warriors results) is real, from `nba-pages/data.json`. The Jazz
    game's clock times, the provider's channels, guide, archive days and videos are illustrative. So are the other
    games' finals and the box-score figures, which the mocks say.

| File | What it is |
|---|---|
| `SPEC.md` | this |
| `*.html` (29) | the mocks; `png/*.png` are their 2x renders, `png/contact-sheet.png` shows all of them in three groups |
| `catchup.css` | the new CSS |
| `tools/build.js` | builds every mock from one scenario (so the times agree across mocks), and `tools/pages.json` |
| `tools/render.js` | the PNGs and the contact sheet |
| `tools/audit.js` | the self-check (section 11), the nba-pages audit plus a SPOILER check |

---

## 0. The idea in one paragraph

Nothing new to learn. **A replay lives where the thing lives**: a past programme in the guide, a game on its hero, card,
tile and game page. Everything you can watch again carries one mark, the **history glyph** (a clock turning back).
OK plays it. Playing anything from the past gives you the **movie bar you already know** (◀▶ 10 s, OK pause, ▲ the
buttons), plus what a game needs: quarter marks, "Skip to Q3", "Back to live". Where a replay comes from (the
channel's archive, or a full-game video in the provider's Movies) is airglow's problem, not yours: it picks the best
and lets you change it with hold OK. And under the shield, a replay never tells you anything the broadcast hasn't
shown you yet: not the score, not the end of the bar, not whether there was overtime.

## 1. Where catch-up lives (the IA decision)

**No new tab, no "Catch-up" section.** The top bar keeps its 7 destinations.

| Surface | What catch-up adds | Mocks |
|---|---|---|
| Live (the guide) | ◀ from now goes back in time on channels the provider keeps; kept programmes play from their start | `live-archive`, `live-past`, `live-past-game`, `live-past-gone` |
| Home hero, NBA hub hero, team header | `Watch from tip-off` for a live game; the morning after, your team's unseen game is the hero | `home-replay`, `home-replay-resume`, `home-live-tipoff`, `nba-hub-replay` |
| Game cards, schedule tiles | the history glyph; hold OK starts with `Watch from tip-off` | `nba-hub-replay`, `nba-card-menu-replay`, `team-schedule-replay`, `team-tile-menu` |
| Game page | the shield card offers the replay first; a seen final gets `Watch again`; nothing found says so | `game-replay-shield`, `game-replay-seen`, `game-noreplay` |
| Where it plays from | hold OK on any watch button lists every source; `Choose a video` for a manual pick | `sources-sheet`, `choose-video` |
| The player | the timeline bar, quarter skips, Back to live, pause and rewind live TV, the replay game panel | the 13 `player-*` mocks |

**Why not a Catch-up tab or a "Replays" row:** the owner watches one thing above all, the Grizzlies, and the morning
after he should land on that game with one OK (`home-replay`). A separate list of replays would be a second place
to look for the same game. Other games' replays are one day chip away on the hub (`Yesterday`), where the finals
already are.

## 2. Rules every catch-up surface follows

### 2.1 Words

| Thing | Word on screen | Never |
|---|---|---|
| Anything you can watch again | the history glyph; `Replay` where a word fits | "Catch-up", "Timeshift", "Archive" in titles |
| A game from its start | `Watch from tip-off` (heroes, menus, cards); `From tip-off` (second button, player) | "Restart", "From the beginning" |
| A programme from its start | `Start over` (live), the ⏮ button (timeline) | |
| A seen game again | `Watch again` | |
| Behind the live point | `40 min behind live`, `Back to live` | |
| A channel the provider keeps | `Kept 3 days` | |
| A channel it doesn't | `Not kept by your provider` | "Unavailable", "Error" |
| A video in Movies | `Full game in Movies`, `Full game · Memphis feed`, `Condensed game` | the provider's raw title for an unseen game |

### 2.2 Geometry (all inside the TV safe area x 48 to 912, y 27 to 513)

| What | Value |
|---|---|
| Guide | unchanged (UI-SPEC 3, 5.3): Now panel y 80 to 152, ruler y 158, 6 rows of 48 + 4, the last ending at y 500, axis 656 px = 2.5 h |
| Day pill (guide) | `.cu-day` at the left end of the time axis, 24 high, surface-2, chalk Inter 650 14; ticks under it are dropped (x < 112) |
| Now pill off to the right | `.cu-nowr` at the right end of the axis: `Now 10:40 ›`, the gradient, ink Inter 700 14; ticks within 150 px of it are dropped |
| Kept mark (guide) | the history glyph, 16 px chalk, under the channel number (the number column is 30 px wide: no width is taken from the name) |
| Kept programme | a normal cell (surface-1) with the glyph before its time; watched part: a 3 px gradient bar at the bottom |
| Not kept | an outlined cell: transparent fill, 1 px `--a-border`, title `text-3` 500 |
| Badge | `.cu-badge`, 24 high, surface-2, chalk Inter 650 14, glyph 16: `Replay`. Neutral: red is LIVE only |
| Card mark | `.cu-rpl` in the game card's status row, in the TV-name slot: glyph 16 + `Replay` Inter 650 14 chalk |
| Tile mark | `.cu-g`: the glyph 18 px at the right end of a schedule tile's result line |
| Shield cards on the game page | `.state.big.cu-state`, 680 wide (three buttons fit), padding 20/28/13, y 230 to 509; the last text ends at y 495 |
| Sources sheet | the right sheet (420, x 492 to 912, y 27 to 513), rows 64 high |
| Choose a video | a menu 600 wide at x 180, y 40 to 482, rows 64 high |
| Hold-OK menus | `.ctxmenu.cu-w`, 292 wide (so `Reveal Grizzlies at Jazz` stays on one line), rows 48 |
| Player timeline | section 6.2 |

### 2.3 Focus and keys

- The engine as it is (`focus.js`, nba-pages SPEC 2.2). One ring. Rings and lifts as today: guide cells inset, buttons
  ring + 1.05 (the first of a row lifts from its left edge), menu rows ring only, native rows inset.
- **Entry focus is never a Reveal** (nba-pages 8.2), and on catch-up surfaces it is the watch button when there is
  one: `Watch from tip-off`, `Resume`, `Look again`.
- **Hold OK on any watch button** (`Watch from tip-off`, `From tip-off`, `Watch again`, `Resume`) opens the sources sheet
  (5.6). It carries `data-hold`, as `Watch live` already does for other channels.
- **OK means one thing** (UI-SPEC 6): in the guide, OK plays the focused programme: live if it is on now, from its
  start if it is kept, live if it isn't kept (the channel as it is now), the details card if it is later.

### 2.4 Port notes (selectors)

The mocks use `.f` / `.f-ring` / `.f-in`; the app uses `:focus` on `.fx`. Add:
- inset, as the other guide cells: `.g-cell.cu-rp.fx:focus, .g-cell.cu-gone.fx:focus` (already covered by
  `.g-cell.fx:focus`); keep the watched bar inside the ring: `.g-cell.fx:focus .cu-wp{left:3px;right:3px;bottom:3px}`;
- `.g-cell.cu-gone.fx:focus b{color:var(--a-text-1)}`;
- ring only: `.ctxmenu.cu-w .lr.fx:focus`, `.cu-srcs .lr.fx:focus` (as `.lr`).

### 2.5 Text, numbers, time

- 14 px minimum, as everywhere. Times 24 h. The night rule of nba-pages 2.3 for games (`Mon 26 Oct · late`).
- **The guide uses calendar dates** (it is a time axis): the day pill reads the date at the left edge, and the
  midnight tick reads `Tue 00:00`.
- **Player times:** `aired 01:52` is the wall-clock time a moment was broadcast; `38:12` is time since the start of the
  replay; `40 min behind live` is the distance to the live point. Never a remaining time for an unseen game (7).

## 3. Where a replay comes from

### 3.1 Three kinds of source

| Kind | What it is | Where it comes from | Gives |
|---|---|---|---|
| **Channel replay** | what a kept channel broadcast, from the provider's archive | `xtream().catchup(ch, start, end)` and `m3u().catchup(...)` (`app/core.js`): three Xtream links tried in order (`/timeshift/…ts`, `…m3u8`, `timeshift.php`), M3U by its `catchup` mode | any start time inside the channel's `archive` days; quarter marks and the as-aired score (ESPN's play clock is wall-clock) |
| **Full-game video** | a video in the provider's Movies named for the game ("NBA 2026-10-26 Grizzlies vs Jazz") | the movie catalog (`catalog.movie`), matched in 3.3 | a file: seek anywhere; no quarter marks (its timing is unknown) |
| **Live buffer** | what the TV still holds of the channel you are watching | ExoPlayer's back buffer | pause and rewind for a couple of minutes on a channel that isn't kept (6.8) |

### 3.2 Which channel carried a game

`findFeeds` / `bestChannel` (`app/tv/js/games.js`) find channels for a game **on now** (`onNow(list, now)` or at
tip-off + 1 min, from the short guide). A finished game needs the guide **at tip-off**, which the short guide
(`get_short_epg`, now and next) doesn't hold. New `replaySources(g)`, cached per game for 1 h:

1. **Your pick for this game**, if you chose one in the sources sheet (`replayPick[gameId]`).
2. **The channel you watched it on** (`lastSeen` in `games.js`), if kept.
3. **Your team's remembered channel** (`teamChannel`), if kept.
4. **Channels named for the game** (event channels, `NBA.matchGame(ch.name)`), if kept.
5. **Kept channels whose guide had the game at tip-off:** the full table (`get_simple_data_table`, 4.6) of kept NBA /
   League Pass channels first, then kept sports channels, at most 12 tables, through the guide queue (3 at a time).
   A programme matches when it spans tip-off + 5 min and `NBA.matchGame(title)` returns this game.
6. **Full-game videos** (3.3).

A channel replay counts only while `tip-off − 15 min ≥ now − archive days`, and, when the table says so, only if the
programme's `has_archive` is 1.

### 3.3 Matching a video to a game

A video in `catalog.movie` is a **full-game video** of game `g` when all of these hold:
- **Both teams** are named (`NBA.matchGame` scores 10 or more: nickname or city of each side; "@", "at", "vs" and
  "v" between them in either order);
- **a date** in the title matches the game's US Eastern date or its UTC date, within a day. Formats:
  `2026-10-26`, `26.10.2026`, `26-10-2026`, `10/26/2026`, `10/26`, `26 Oct`, `Oct 26`, with or without the year.
  With **no date** in the title, it matches only when the video was added (Xtream `added`) within 3 days after the
  tip-off and those two teams played only once in that window;
- it isn't **highlights** (`highlights|top plays|recap` is dropped).

Then it is classified:
- **Condensed** when the title says `condensed|mini|in 20 min`;
- **Feed**: the team whose city, nickname or broadcaster (ESPN's `broadcasts` names per team, e.g. `FDSSE`, `KJZZ`)
  appears next to `feed`, `home`, `away`, or alone. Unknown feed is fine;
- **Quality** from the tags `titles.js` already strips (4K, 1080p, 720p), **language** from the prefix (`EN|`).

Category names help but don't decide: a video in a category named `NBA`, `Basketball` or `Replays` needs only the
teams and a date within 2 days. Videos are matched in memory, so on a provider with no archive every card on the
hub can show its mark at once.

### 3.4 Ranking (what `Watch from tip-off` plays)

1. **Your pick** for this game.
2. **Channel replays**, best picture first (`quality()` in `games.js`), then the channel you watched on.
   Why first: only a channel replay has the quarter marks and the as-aired score.
3. **Full games**, your team's feed first, then quality, then your languages.
4. **Condensed games**, last.

A channel replay that fails moves the next source up, on the failure card (`player-replay-failed`). The order is an
owner decision to confirm (13).

### 3.5 The replay window (what airglow asks the archive for)

| Replay of | From | Length | Why |
|---|---|---|---|
| A game | scheduled tip-off − 15 min | **always 3 h 30 min** | covers late tips, long games and double overtime; a fixed length means the bar never tells how long the game ran (7) |
| A programme | its start | its length + 2 min | the guide's times are rarely exact |
| Live rewind | the programme's start, or 2 h before now if that is longer ago | to now, growing | the bar shows the programme |

Playback starts at **tip-off as ESPN logged it** (the first play's `wallclock`, `at` in `app/nba.js`) **+ the channel's
score delay** (`delayFor(ch)`, 60 s until you sync) **− 10 s** so you see the jump ball. Without plays, at the
scheduled tip-off.

## 4. The guide (`live-archive`, `live-past`, `live-past-game`, `live-past-gone`)

### 4.1 What changes

- **Kept channels** carry the history glyph under their number, at all times (`live-archive`). This is how you learn
  which channels go back.
- **◀ from the programme on now** goes to the previous programme on a kept channel, and moves the window back an hour
  when it has to. On a channel that isn't kept it goes to the channel column, as today. **Hold ◀** keeps going (one
  draw per frame while it repeats, as today): a day back takes about 2 s.
- **How far:** to the channel's archive (`archive` days) or the first programme its table holds, whichever is later.
  At that edge ◀ goes to the channel column.
- The window is shared by all rows (it is a grid). A row that isn't kept shows its past as **one outlined cell**,
  `Not kept by your provider` / `OK watches ESPN live` (`live-past`). It is focusable, so ▲▼ keep the time you are at
  and focus never jumps to another hour.
- **The ruler:** the day pill names the day at the left edge (`Mon 26 Oct`); when now is off to the right, the pill
  `Now 10:40 ›` sits at the right end (`live-past`).
- **Back** in the past returns the window to now, on the same channel's programme on now. A second Back focuses the
  Live tab (the one Back rule, UI-SPEC 6).

### 4.2 Cells

| Cell | Look | Sub-line | OK | Now panel right side |
|---|---|---|---|---|
| On now | as today | `◂ 10:00` / times, LIVE for a live game | tunes live | `OK tune · Hold OK favourite` and, on a kept channel, `◀ earlier · kept 3 days` |
| Past, kept | as a normal cell | glyph + times | plays it from its start, or resumes where you stopped (the watched bar) | `OK play from 20:00` / `OK resume at 20:34`, `Back returns to now` |
| Past, kept, your game | as a normal cell | glyph + times | **plays from tip-off**, not from the pre-game (◀ in the player reaches it) | `OK watch from tip-off`, `Back returns to now` |
| Past, not kept (channel not kept, `has_archive` 0, or older than the archive) | outlined, `text-3` title | `OK watches ESPN live` | tunes the channel live | `OK watch ESPN live`, `Back returns to now` |
| Past, loading (the table is on its way) | `bg-1`, `Loading earlier programmes…` | – | tunes live | – |
| Past, nothing in the table this far back | outlined, `No guide this far back` | `OK watches it live` | tunes live | – |
| Later | as today | times | the details card (as today) | as today |

Hold OK still favourites the channel, anywhere in the row (one gesture, UI-SPEC 12).

### 4.3 The Now panel on a past programme

- **Tile:** the programme art or the channel logo, with a 26 px disc holding the glyph in its corner.
- **Title row:** the title, then the `Replay` badge.
- **Line 2:** channel · `Mon 26 Oct` · `20:00 to 21:00` · `watched 34 min` with a 70 px bar, when you started it.
- **Line 3:** the description; under the shield, for a matched game: `[eye-off] Description hidden (spoiler shield)`.
- Not kept: the title `Earlier on ESPN`, line 2 `not kept by your provider`, line 3
  `Kept channels show the history mark under their number.` (`live-past-gone`).

### 4.4 Keys

| Element | ◀ | ▶ | ▲▼ | OK | Hold OK | Back |
|---|---|---|---|---|---|---|
| Programme on now | earlier programme (kept), else the channel column | next | channels, same time | tune | favourite | tab |
| Past cell | earlier, to the archive edge, then the channel column | later, back to now and on | channels, same time | play / resume / tip-off / live (4.2) | favourite | the window returns to now |
| Channel column | – | the cell at the time you were at | channels | tune | favourite | as the cell |
| CH± | pages six rows, at the same time (unchanged) | | | | | |

### 4.5 States

- **Offline:** kept cells keep their look; OK says `Offline · replays need the provider`.
- **The table failed:** the row's past is `Earlier programmes didn't load · OK still tunes`, tried again in 30 s (as
  `guideFailed`).
- **M3U accounts** have no guide today (`m3u().epg` returns nothing), so the past isn't drawn for them. Games still
  replay (3.2 needs only the channel and ESPN's times), and live rewind works.

### 4.6 Data

- Past programmes come from `get_simple_data_table` (the full table `core.js` already falls back to), fetched for a
  kept channel the first time its row goes before now, through the guide queue (`guide.js`, on-screen rows first),
  kept 10 minutes like the short guide. It brings `has_archive` when the panel sends it.
- Rows that aren't kept need no past data (one outlined cell), so going back costs only the kept rows' tables.
- The provider's clock offset (`acc.epgShift`) is applied to the past as to now; `catchup()` already takes it off
  again for the link.

## 5. NBA surfaces

### 5.1 The hero state table, catch-up rows (Home hero, hub hero, team header)

These rows extend nba-pages 7.1. The primary is the entry focus.

| When | Primary | Secondary | Third | Caption | Slab |
|---|---|---|---|---|---|
| Live, a replay source exists | `▶ Watch live` | `⏮ From tip-off` | `Box score` (shield: `Reveal score`) | moves to the status row: `LIVE · NBA · NBA League Pass 4` (`home-live-tipoff`) | as today |
| **The morning after:** final, hidden by the shield, a replay exists | `▶ Watch from tip-off` | `Game page` | – | `NBA League Pass 4` / `Kept until Thu 29 Oct`, or `Full game in Movies` / `Memphis feed` | `REPLAY` / `Score hidden` (`home-replay`) |
| Final, hidden, you stopped partway | `▶ Resume` | `⏮ From tip-off` | `Game page` | – | `Q3` `6:41` / `You stopped here` (`home-replay-resume`) |
| Final, hidden, no replay found yet | `Game page` | – | – | `No replay yet` / `airglow keeps looking` | `END` / `Score hidden` |
| Final, seen (or shield off), within 12 h, a replay exists | `Box score` | `▶ Watch again` | – | `Final · W 123–112` | `FINAL` / `Full time` |

- **The hub hero** drops `Plays` when three buttons show.
- **The morning-after rule (Home's hero priority, UI-SPEC 5.2):** after "your team from 3 h before tip-off to 30 min
  after the final" comes **your team's last game, hidden, with a replay**. It holds the hero from 30 min after the
  final until the first of: you watch it to the final buzzer or reveal it; its replay expires; 48 h pass; the next
  game's 3 h window opens. Then resume, then the last channel, as today.
- **Records** stay `recordFor` (partial with the eye-off) on heroes and the team header.
- The slab's `REPLAY` is Barlow 800 italic (three words or fewer, brand rule) and fits the 171 px of content width.

### 5.2 Continue watching

A replay you stopped partway is a card in Continue watching (`home-replay-resume`): the two team colours as its art,
crests at the top right, `NBA · Replay`, `Grizzlies at Jazz`, `Stopped in Q3 · Mon 26 Oct`. **Never minutes left**
(7). Its bar is on the fixed 3 h 30 scale. OK resumes; hold OK: `From tip-off`, `Game page`, `Remove`.

### 5.3 Game cards (`nba-hub-replay`)

- A final or live game with a replay shows `⟲ Replay` in the status row, in place of the TV name.
- Your team's games are looked up when the schedule loads; other games when their card has been focused for 600 ms or
  their game page opens (a table probe each); on a provider whose replays are videos, all cards at once (3.3).
- **A card whose plate is hidden drops its two records.** The hidden plate already says the game is hidden, and the
  partial record with its eye-off cut `Grizzlies` to `Griz…` in the 272 px card. Heroes and the team header keep it.
- The day row's caption adds `⟲ = replay` while the day shown has one.

### 5.4 Hold-OK menus (`nba-card-menu-replay`, `team-tile-menu`)

| On | Rows, in order (first focused) |
|---|---|
| A final with a replay (card or tile) | `▶ Watch from tip-off`, `<Away> page`, `<Home> page` (tile: `<Opponent> page`), `Open the game`, `Reveal <game>` (only when hidden, always last) |
| A live game with a replay | `▶ Watch live`, `⏮ From tip-off`, then as above |
| No replay | as nba-pages 1 |

**Placement (a fix to nba-pages 2.5):** below the card when it fits by y 513; else above when it neither covers the card
nor touches a team colour; **else beside the card** (x = card right + 16, or card left − 16 − 292), y clamped to 27 to
513. On the hub's first grid row a 5-row menu fits only beside (`nba-card-menu-replay`).

### 5.5 The game page (`game-replay-shield`, `game-replay-seen`, `game-noreplay`)

| State | Tab row, right side | Body | Entry focus |
|---|---|---|---|
| Live, replay exists | `▶ Watch live` (btn sm) and `⏮ From tip-off` (btn2 sm) | as today | the first tab |
| Final, hidden, replay exists | – | the shield card: `Grizzlies at Jazz is hidden` / `Watch it from tip-off: it counts as seen at the replay's final buzzer.` / `▶ Watch from tip-off` · `Reveal Grizzlies at Jazz` / `NBA League Pass 4 · kept until Thu 01:00 · hold OK for other sources` | **Watch from tip-off** |
| Final, hidden, nothing found | – | `No replay of this game yet` / `Full games often reach Movies a few hours after the final. airglow looks every hour until Thu.` / `↻ Look again` · `Choose a video` · `Reveal Grizzlies at Jazz` / `Looked at 10:32 in 4 channel archives and 312 NBA videos` | **Look again** |
| Final, seen | `Kept until Wed` · `▶ Watch again` (btn sm, lifts from its right edge) | the box score, as today | the first tab |

- Plays stays dropped while the game is hidden (nba-pages).
- **A fix:** `game.js`'s `entry()` focuses `[data-act="reveal"]` first today; nba-pages 8.2 says a Reveal is never the
  default. The entry is the card's first button.
- "Looks every hour": `replaySources` runs again hourly while a hidden game has none, up to 3 days, and when the movie
  catalog refreshes.

### 5.6 The sources sheet (`sources-sheet`)

- **Opened by** hold OK on any watch button (2.3), and by `Other sources (n)` in the player's Options during a replay.
- Right sheet 420. `Watch Grizzlies at Jazz` / `From tip-off · Mon 26 Oct · late`. Rows 64: icon (glyph for a channel
  replay, film for a video, search for the last row), airglow's name for it, a detail line, `Best` on airglow's
  choice. The last row is `Choose a video…`.
- **OK** plays it from tip-off and remembers it for this game. Back closes. Focus starts on the current choice.
- The foot says why the order is what it is: `The channel replay comes first: it has the quarter skips and the synced score.`

### 5.7 Choose a video (`choose-video`)

- Every video naming either team, the ones with a date nearest the game first, then by `added`. Up to 40 rows; the
  list scrolls (`scrollList`).
- **An unseen game in scope gets airglow's own name** (`Grizzlies at Jazz` / `Mon 26 Oct · Full game · Memphis feed ·
  1080p`): provider titles can carry the score ("Grizzlies 118-112 Jazz"). Videos of seen games and other teams keep
  the provider's title, with any `\d{2,3}[-–]\d{2,3}` replaced by `· ·` while the shield is on in `All games`.

### 5.8 Movies and Search, under the shield

A video matched to an unseen game in scope shows in Movies, Search and Continue watching as airglow's card: title
`Grizzlies at Jazz`, meta `Mon 26 Oct · Full game`, and the matchup art (the two team colours and crests) in place of
the provider's poster, which can print the score. Its description is hidden. When seen, it goes back to the
provider's title and poster.

## 6. The player (native: `PlayerActivity`, `VodControls`, `GamePanel`, `Ui`)

### 6.1 Two key maps, and when each applies

| Map | When | Keys |
|---|---|---|
| **Live** | a live channel at the live point | as today (UI-SPEC 7): ▲▼ zap, OK channels, ◀ Options, ▶ game panel, hold OK last channel. New: ⏯ (if the remote has it) pauses |
| **Timeline** | anything with a seek bar: a movie, an episode, a kept programme, a game replay, live TV you paused or rewound | as movies today: **◀▶ 10 s** (hold: faster every second, ×2 to ×32), **OK pause / play**, **▲ the buttons**, **▼ Options**, Back hides the bar then leaves; ⏯ pause; ⏪⏩ ∓10 s (hold scrubs); CH± and digits leave the timeline and tune that channel live |

- The change of map is never hidden: you get the timeline only by pressing something that says so (⏯, `Rewind and
  pause`, `From tip-off`, a past programme), and the bar is on screen when it happens.
- **Reaching the live point** (seeking forward to it, or `Back to live`) puts the live map back. The bar shows `Live`
  for 2 s, and the hint bar reads `▲ ▼ Change channel` while it does.
- **Back** with the bar hidden leaves the player, as for a movie (13 asks the owner whether Back should return to live
  first on a rewound channel).

### 6.2 The timeline bar (`player-tipoff`; drawn in dp)

| Part | Value |
|---|---|
| Top block | `nv-vtop`: left 48, top 30. Title Outfit 700 28/32; sub Inter 500 16/22 `text-2`. At the right, `cu-pos`: line 1 Inter 650 18/22 chalk (`40 min behind live`, `Score hidden`, `Ends at 11:06`), line 2 Inter 500 15/20 `text-2` |
| Bar | left 48, right 48, bottom 64 dp: **y 344 to 476**, radius 16, `Ui.BANNER` (bg-1 92%), padding 16 / 20 / 10 |
| Buttons row | 44 high. Circles 44 (`vb`: ⏯, ⏮, `−1m`, `+1m` in Inter 700 15); pills 40 high (btn2 sm, 2 dp border-strong). Gaps 10. The right group (Back to live, CC, Audio, Picture) is pinned right |
| Track | 6 dp, 14 below the buttons, x 68 to 892 (**824 dp**). Played part: the gradient (the seek fill, UI-SPEC 7). Thumb 18 dp chalk; focused 22 dp with the ring |
| Not yet aired | from the live point to the end of the window: bg-1 with a 1 dp dashed `border-strong` outline (a live game, live TV) |
| Live point | a 14 dp red dot (`Ui.LIVE`) with a 2 dp panel-coloured edge, and the 22 dp LIVE pill in the chapter row, 12 dp to its right (to its left within 90 dp of the end, `player-paused-local`) |
| Chapter ticks | 2 x 14 dp, `text-2`, at each chapter start: Tip-off, Q2, Half, Q3, Q4 (OT only once reached) |
| Chapter row | 24 high under the track: labels Inter 500 14 `text-3` centred on their ticks; the chapter you're in chalk 650. At the ends: elapsed `34:10` and remaining `−25:50` (programmes, movies), or `[eye-off] End hidden` (an unseen game) |
| Scrubbing | the bubble (chalk, ink 700 15/20) **above the bar**, centred on the thumb (y 306 to 334): `Q3 · 1:12:00` (chapter · time since tip-off), or `20:34` for a programme; the speed chip `▶▶ ×8` beside it (`player-scrub`) |
| Hint bar | as today: `OK Pause · ◀ ▶ 10 s, hold for faster · ▲ Buttons · ▼ Options · Back Hide`; on the buttons it names what OK does (`OK Skip to Q3`) |
| Hides | after 4 s while playing (as movies); never while paused |

### 6.3 Buttons, per kind

| Playing | Left group | Right group |
|---|---|---|
| A game replay (channel) | ⏯ · ⏮ (to tip-off) · `−1m` · `+1m` · `Skip to <next>` | `Back to live` while the game is live · CC · Audio · Picture |
| A game video (Movies) | ⏯ · ⏮ (to the start) · `−1m` · `+1m` | CC · Audio · Picture |
| A kept programme | ⏯ · ⏮ (its start) · `−1m` · `+1m` · `Next programme ›` | CC · Audio · Picture |
| Live TV rewound or paused, kept channel | ⏯ · ⏮ (the programme's start) · `−1m` · `+1m` | `Back to live` · CC · Audio · Picture |
| Live TV paused, channel not kept | ⏯ · `−10` · `+10` | `Back to live` · CC · Audio · Picture |
| A movie or episode | as today | as today |

**The skip button** names where it goes: in Q1 `Skip to Q2`; in Q2 `Skip to Q3` (it skips halftime too); during
halftime `Skip halftime` (`player-halftime`); in Q3 `Skip to Q4`. **From Q4 on there is no skip button, shield or
not**, so its absence never says whether overtime came. It lands 10 s before the quarter's first play.

### 6.4 Where the chapters come from

- Each chapter's start is the `wallclock` of the first ESPN play of that period (`at` in `app/nba.js`); Half is the
  last play of Q2. In the replay: **position = wallclock − window start + the channel's score delay** (`delayFor`).
  `Sync` (6.6) corrects the delay; a corrected delay is stored for the channel, as live.
- The final buzzer is the last play's wallclock + the delay. **Passing it marks the game seen** (`markSeen`, nba-pages
  8.1). Stopping before it keeps it hidden (seen for the session only, as today).
- Videos from Movies have no chapters (their timing is unknown): no ticks, no skip button; seen at the end of the video
  (or within its last 2 %).

### 6.5 Options (`player-options-live`)

| Playing | Rows (first focused) |
|---|---|
| Live, a game, kept channel | `Sync score` (stays first, AC-P8b) · **`Watch from tip-off`** (`Tipped off at 01:12`, focused when opened from ◀) · **`Rewind and pause`** (`Kept 3 days on this channel`) · Other feeds · Subtitles · Audio · Picture size · Favourite · Score on picture. Seven rows show; the panel scrolls (hint: `▲ ▼ Move · 2 more below`) |
| Live, no game, kept channel | **`Start over`** (`from 10:15`) · **`Rewind and pause`** · Subtitles · Audio · Picture size · Favourite · Score on picture |
| A game replay | **`Other sources (3)`** (the sources sheet's rows) · `Sync score` · Subtitles · Audio · Picture size · Score on picture |
| A kept programme | Subtitles · Audio · Picture size · Speed |

`Rewind and pause` pauses at the live point and shows the bar, with ⏮ ready.

### 6.6 The game panel (▶)

- **Watching live, kept channel** (`player-panel-live`): as today (the reveal you asked for), plus a foot button
  `⏮ From tip-off`, ▼ from the table. Team tabs use the NBA's three-letter codes (`UTA`, not ESPN's `UTAH`) so `Sync`
  fits the 280 dp panel.
- **In a game replay** (`player-replay-panel`): the game **as it stood at this moment of the replay**, the same reveal
  rule as live (UI-SPEC 6): the plate shows the score as aired, `Q2 6:41 · as aired`. Tabs `Quarters · Plays · Sync`.
  Quarters lists `Tip-off · 01:12`, `Q2`, `Halftime`, `Q3`, `Q4` with their aired times (OT rows only once reached);
  the current one is `surface-2`; **OK jumps there**. Plays shows the plays up to this moment. **No box score until the
  final buzzer** (its totals are the final's). Foot: `OK jumps there. The box score comes after the final buzzer.`
- **In a video replay:** the plate reads `Replay`, no score (no timing to align it), and the panel lists the other
  sources.

### 6.7 Cards

| Card | When | Content | Focus |
|---|---|---|---|
| **The game ended live** (`player-golive`) | `Back to live` (or seeking to the live point) after the live game has ended, while it is hidden | `The game has ended live` / `Going live shows the result: NBA League Pass 4 is on the post-game show.` / `Stay in the replay` · `Go live` | **Stay**; Back stays too |
| **The replay didn't start** (`player-replay-failed`) | all three links of a channel replay failed | `This replay didn't start` / `NBA League Pass 4's archive didn't answer (3 links tried).` / the next source as a row / `Try again`, `Back closes` | the next source (1 press) |
| **Up next** (programmes) | the last 10 s of a kept programme | `Next on BBC One · 21:00 Night Circuit`, the countdown ring; binds OK only while the bar is hidden (UI-SPEC 6) | – |
| **The replay window ended** | the end of a game's 3 h 30 | `Replay ended` / `Box score` · `Watch again` (the game is seen by then, or `Reveal` names it) | Box score |

### 6.8 Pause and rewind live TV

- **Kept channel** (`player-paused`): pausing keeps the live link paused for as long as its buffer holds. Seeking back
  past the buffer, or resuming after it ran out, switches to a channel replay from that moment (the window of 3.5).
  The bar is the programme (`10:15` to `11:00`), the live point, and how far behind you are. `Back to live` returns
  to the live link.
- **Not kept** (`player-paused-local`): the live buffer only. ExoPlayer keeps a back buffer
  (`DefaultLoadControl.Builder().setBackBuffer(ms, true)`) sized to what the TV's memory allows, 2 min in the mock;
  the bar is that span (`2 min ago` to LIVE), with `−10` / `+10`. Paused past it, play resumes at the live point with
  the toast `Back to live: airglow holds 2 min of US: ESPN HD`.
- **The banner** of a kept channel adds the glyph as a tag beside HD and CC. **The hint bar** adds `⏯ Pause` when the
  remote has the key (`KeyCharacterMap.deviceHasKey(KEYCODE_MEDIA_PLAY_PAUSE)`), else `◀ Options` already leads to
  `Rewind and pause`.

### 6.9 One connection

A replay uses the player's one stream: going to a replay replaces the live link, `Back to live` replaces it back. No
preview, no second stream (UI-SPEC 3.5).

## 7. The spoiler shield, for replays

Scope, seen and reveal are nba-pages 8.1. What catch-up adds:

| Where | Under the shield, for a hidden game |
|---|---|
| Every surface before it plays | no score, no `Final`, no winner, no OT; records partial (nba-pages); the slab `REPLAY / Score hidden` |
| The bar | **never shows where the game ends**: a fixed 3 h 30 window, no remaining time, no `Ends at`, no end mark, `[eye-off] End hidden` at the right (`player-replay`) |
| Chapters | Tip-off to Q4 shown ahead (their spacing tells nothing); **OT ticks, labels and rows only once you reach them** |
| Skip | none from Q4 on, shield or not (6.3) |
| Scrub bubble | the chapter and time since tip-off only |
| Game panel, score bug | the game as aired at this moment (6.6), never further; no box score until the buzzer |
| Back to live | the confirm card once the game has ended live (6.7) |
| The "Grizzlies are live" chip | not shown while you are in that game's replay |
| Videos | airglow's name and matchup art in Movies, Search, Continue watching and the pickers (5.7, 5.8); no duration in the sources sheet's rows |
| Guide | the description hidden (as today); a matched game's guide title has any score pattern replaced by `· ·` |
| Continue watching | `Stopped in Q3`, never minutes left |
| Seen | at the final buzzer of the replay (6.4), or at the end of a video; Reveal as today |

**With the shield off**, nothing is hidden, and a replay still never shows the box score ahead of the moment you're
watching: a replay is watched as if live.

## 8. States

| State | What shows | Focus |
|---|---|---|
| The provider keeps nothing, no videos match | no marks anywhere; the morning after, the hero follows the table's "no replay found yet" row; the game page says it plainly (`game-noreplay`) | Look again |
| Kept, but the archive fails | the failure card with the next source (`player-replay-failed`) | the next source |
| A replay expired | the mark goes; a hidden game's card says `The channel replay expired Thu 01:00` when nothing else is left | – |
| Videos only (no archive) | the same surfaces, captions `Full game in Movies` (`nba-hub-replay`); no quarter marks (6.4) | as the table |
| Guide table loading | `Loading earlier programmes…` (`live-past`) | stays |
| Offline | marks stay; OK says `Offline · replays need the provider` | stays |
| M3U account | no past in the guide; game replays and rewind work (4.5) | – |
| Account allows one connection | as today; a replay replaces live (6.9) | – |
| Team `None` | no morning-after hero; marks, menus and the game page as for any game | – |
| Shield off | the seen-final row of 5.1 (`Watch again`); provider titles shown | – |
| Two games tipped at once, one channel | each game's replay is its own window (3.5); the guide match picks the programme at that game's tip-off | – |

## 9. Data

| Need | Where | Notes |
|---|---|---|
| Is a channel kept, how long | `archive` on live items (`core.js`: Xtream `tv_archive` / `tv_archive_duration`; M3U `catchup`, `catchup-days`, `tvg-rec`, `timeshift`) | days; 0 = not kept |
| The replay link | `S.src.catchup(ch, start, end)` | three Xtream links in order; M3U by mode. `epgShift` taken off for the panel's clock |
| Past programmes | `get_simple_data_table` (Xtream), lazily per kept row (4.6) | `has_archive` per programme when sent |
| Tip-off, chapters, buzzer | ESPN summary plays, `wallclock` (`at`) | fetched when a replay starts; never displayed beyond the playback moment |
| The channel's delay | `delayFor(ch)`, 60 s default | the same store as live |
| Seen | `markSeen` at the buzzer | nba-pages `{ upTo, ids }` |
| Your source pick | new `replayPick[gameId]` (scoped store) | dropped with the seen ids after 8 days |
| Where you stopped | the progress store, keyed `rp:<gameId>` (game) or `rp:<chId>:<start>` (programme) | position on the replay window |
| Videos | `catalog.movie` items (`name`, `cat`, `added`, `url`) | matched in memory (3.3) |
| Sources cache | `replaySources(g)` per game, 1 h; again hourly while a hidden game has none, up to 3 days | |

## 10. Port checklist

1. **CSS:** `catchup.css` into `app.css`, with the selectors of 2.4.
2. **`guide.js`:** the full table per kept channel on demand; `pastFor(ch, from)`; `has_archive`.
3. **`live.js`:** the window may start before now (to the row's archive edge); cell kinds of 4.2; the day pill and
   the right-hand Now pill in `ruler()`; ◀ past the now column on kept rows; Back returns the window to now; OK per 4.2;
   the Now panel of 4.3.
4. **`games.js`:** `replaySources(g)` (3.2 to 3.4); the morning-after rule; seen at the buzzer of a replay; the
   chapter list from plays.
5. **`cards.js`:** the hero rows of 5.1; `⟲ Replay` on game cards; hidden cards drop records; the replay card for
   Continue watching.
6. **`game.js`:** the tab-row buttons and the two shield cards of 5.5; the entry fix (never Reveal).
7. **Team page tiles:** the mark; the hold-OK rows. **`ui.js` `contextMenu()`:** the placement rule of 5.4.
8. **Sheets:** the sources sheet (5.6), Choose a video (5.7). **Movies / Search:** the shield rule of 5.8.
9. **`player.js` → native:** a `replay` command (`{ kind: 'game'|'programme'|'video', links, windowStart, windowMs,
   startAt, chapters, buzzerAt, live, hidden }`); events `position`, `seen`, `source-failed`.
10. **`VodControls`:** the timeline variant (6.2, 6.3): window, live point, not-yet-aired part, ticks and chapter row,
    the skip button, the bubble above the bar, `End hidden`. **`PlayerActivity`:** the two key maps (6.1), the live back
    buffer (6.8), switching live ↔ replay links on seek, the Options rows (6.5), the cards (6.7). **`GamePanel`:** the
    replay variant (6.6), the foot button, three-letter tabs.
11. **`tests/tv/drive.js` scripts:** the guide back to the archive edge and Back to now; OK on each cell kind; the
    morning-after hero; a shield script that opens every surface of section 7 and fails on any score, remaining time
    or OT for the hidden game (the audit's SPOILER rule, run on the app).

## 11. Self-check (`node tools/audit.js`; ring data in `tools/audit-rings.json`)

**The checks** are the nba-pages audit's, adapted to the `cu-` classes and the player's timeline: one ring; text under
14 px; text overlaps; text against boxes; clipping of text and rings; the safe area; contrast; team colour near LIVE
or touching a ring; plate contrast; the RING pixel check; floating boxes inside y 27 to 513 and x 48 to 912; a focused
Reveal; peeking tiles. The floating-box check now also covers the shield cards, the timeline bar, native panels and cards.

**New: SPOILER.** On a mock marked `<meta name="shield" content="unseen">` (21 of the 29), it fails any visible score
(`\d{2,3}–\d{2,3}`), any remaining time (`−m:ss`), any `OT`, and any game-card plate holding two numbers, outside an
element marked `data-other` (another game shown by the My team rule, or a seen game) or `data-moment` (the score as
aired at the playback moment, 6.6).

**Tested by injecting faults** (`node tools/audit.js --inject` adds a score, a remaining time and a focused Reveal to
every shield mock): every one of the 21 fails with `SPOILER: a score`, `SPOILER: a remaining time` and
`SHIELD: the focused element is a Reveal`.

**Result: 29 pages, 0 findings.**

**Fixed during the work, from the audit and from looking at the renders:**
- the guide's watched bar and the programme-on-now bar covered the inset ring's bottom (`FAILRING 0%`): both now sit
  inside the ring when focused;
- the sources sheet's text was flagged on the slab under the scrim: the audit now skips the slab for text in a modal
  over a scrim (the sheet covers it);
- the hold-OK menu crossed y 513 at 515: now beside the card at y 255 to 511;
- a date in a seen game's video title ("2026-10-25") read as a score: those rows are marked `data-other`;
- `ESPN` in a 32 px initials tile escaped it: the mocks use `ES` (the app shows the provider's logo);
- by eye: the archive glyph took width from channel names (moved under the number); a tick label sat under the Now
  pill; the LIVE label collided with the Q3 label; the scrub bubble covered the skip button (moved above the bar);
  the hub card cut `Grizzlies` to `Griz…` (records dropped from hidden cards, 5.3); `Reveal Grizzlies at Jazz`
  wrapped in the 236 px menu (now 292); the game page's shield card ran past y 513 (its box ended at 518 after the text fix; now 509, and the box check covers it).

| Mock | Focused | Ring white, all sides | Ring box | To the safe edge |
|---|---|---|---|---|
| live-archive | programme on now (inset) | 100% | 256, 192, 383, 240 | 165 |
| live-past | Coastline (inset) | 100% | 387, 348, 646, 396 | 117 |
| live-past-game | the Grizzlies game (inset) | 100% | 650, 192, 908, 240 | 4 |
| live-past-gone | the outlined ESPN cell (inset) | 100% | 256, 296, 908, 344 | 4 |
| home-replay | Watch from tip-off | 100% | 68, 207, 316, 263 | 19.7 |
| home-replay-resume | Resume | 100% | 68, 207, 224, 263 | 19.7 |
| home-live-tipoff | Watch live | 100% | 68, 207, 245, 263 | 19.7 |
| nba-hub-replay | the Grizzlies card | 100% | 43, 372, 339, 512 | −5.2 (ring in the margin) |
| nba-card-menu-replay | Watch from tip-off (menu row) | 100% | 340, 259, 624, 317 | 196 |
| game-replay-shield | Watch from tip-off | 100% | 231, 417, 479, 473 | 39.6 |
| game-replay-seen | Watch again | 100% | 746, 168, 917, 216 | −5.2 |
| game-noreplay | Look again | 100% | 156, 417, 339, 473 | 39.7 |
| choose-video | the first video | 100% | 188, 116, 772, 190 | 89 |
| sources-sheet | NBA League Pass 4 | 100% | 508, 103, 896, 177 | 16 |
| team-schedule-replay | the Jazz tile | 100% | 482, 352, 700, 472 | 41.1 |
| team-tile-menu | Watch from tip-off (menu row) | 100% | 496, 148, 780, 206 | 121 |
| player-tipoff, -replay, -scrub, -programme, -paused, -paused-local, -video-replay | the seek thumb | by eye (see below) | 32 x 32 at y 411 to 443 | 70 |
| player-halftime | Skip halftime | 100% | 279, 355, 442, 405 | 108 |
| player-replay-panel | Q3 row (inset) | 100% | 643, 326, 901, 374 | 11 |
| player-options-live | Watch from tip-off row (inset) | 100% | 59, 132, 377, 180 | 11 |
| player-golive | Stay in the replay | 100% | 344, 385, 517, 433 | 79.9 |
| player-replay-failed | the next source (inset) | 100% | 249, 327, 711, 383 | 130 |
| player-panel-live | From tip-off | 100% | 646, 349, 810, 395 | 102.3 |

**Notes:**
- **"−5.2"** is the ring of an item on the safe line; its box and text are inside, and v1.2 allows a ring 6 px past it.
- **The thumb's ring** is a 22 dp circle: the RING check skips its corners by its radius, which leaves nothing to sample
  on a circle that small, so its "100%" proves nothing. It was checked by eye on all seven renders.
- Node counts: 16 (a card over video) to 208 (the guide), under the 250 target.

**Couldn't verify:**
- anything on the real TV (section 12);
- the native drawing: the player mocks are HTML at dp sizes with `Ui` tokens, not the Java views;
- contrast over real video (the audit measures flat grounds; the bar is 92% bg-1, as the movie bar);
- that ESPN's play `wallclock` lines up with the broadcast within the stored delay.

## 12. What only the TV (and the owner's provider) can tell

1. **Does the provider keep the NBA channels?** Unknown today. Add to Account > Provider > Check the guide a line per
   kept channel (`NBA League Pass 4 · kept 3 days`) and a `Try a replay` button that plays 10 s of the last finished
   programme on the first kept channel. If none is kept, everything in this spec still works from videos (3.3), and
   with neither, the surfaces say so (8).
2. **Which of the three Xtream links plays**, and whether `.ts` or `.m3u8` seeks inside a replay. If a link can't seek,
   each seek past the buffer asks for a new link starting at the target (a 1 to 2 s wait, shown as the reconnect
   spinner without text).
3. **A window that runs into the future** (a live game from tip-off): does the panel accept a 210 min duration that
   ends after now, and does it keep playing up to the live point? If not, airglow asks again from the current position
   when it nears the end of what it has.
4. **The panel's clock zone** for the timeshift start (`acc.tz`) and the guide offset (`epgShift`): a replay that starts
   an hour off shows at once (the picture isn't the programme). The `Sync` correction of 6.4 covers minutes, not hours.
5. **`has_archive`** in `get_simple_data_table` on this panel, and how many days the table holds.
6. **The remote:** whether the 55OLED810's remote sends ⏯ / ⏪ / ⏩ (`KEYCODE_MEDIA_*`). The design never needs them.
7. **Back-buffer memory** for pausing a channel that isn't kept: how many minutes of the provider's top quality fit
   without the TV's low-memory killer stepping in (start at 2 min, measure).
8. **ESPN's wallclock vs the picture:** how far off the quarter marks land on this provider's NBA channels, and whether
   the stored delay (from Sync on live) fixes it for replays too.
9. **The provider's video names** for NBA replays (date formats, feed words), to tune 3.3.
10. **Connection limits** when switching between the live link and a replay link quickly (seeking).

## 13. Decisions for the owner

1. **Which source plays first:** the channel replay (quarter skips, the as-aired score, ads included) or a full-game
   video when there is one (often no ads, but no quarter skips). This design picks the channel replay.
2. **The morning-after hero** holds your unseen game for up to 48 h or until the next game's window. Shorter? Longer?
3. **Back on rewound live TV**: leaves the player (as a movie), or jumps to live first?
4. **Matched NBA videos in Movies** under the shield: shown with airglow's name and art (this design), or taken out of
   Movies altogether since they live under NBA.
5. **Condensed games** offered, last in the list (this design), or not at all.
6. Still open from nba-pages: whether watching from Q4 on should already count as seen (this design: the final
   buzzer).
