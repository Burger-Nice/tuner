# airglow TV: catch-up, v1.1

The design spec for watching past broadcasts: the guide before now, "Watch from tip-off", finished games, replays from the
provider's Movies when it keeps no archive, and the player's timeline (pause, rewind, skip, back to live). It extends
`design/ui-v1/UI-SPEC.md` v1.2 and `design/ui-v1/nba-pages/SPEC.md` v1.1 (focus rules, the hero state table, the spoiler
shield and its seen model). Everything not said here follows those two. **Where this spec says a replay overrides
nba-pages 8.1, this spec wins.**

- **The mocks** are real HTML at the 960 x 540 canvas. They link the app's own `app/tv/brand/tokens.css`, `ui.css`,
  `app.css` and `nba.css`, plus `catchup.css` (new classes, all `cu-`, written to be appended to `app/tv/app.css`).
  The player mocks draw the native overlays in HTML at dp = CSS px, with the `Ui.java` tokens, as `design/ui-v1/player/`
  did.
- **The scenario.** The owner's TV, Reykjavik time (UTC all year), shield `My team`:
  - **The morning after:** Tue 27 Oct 2026, 10:40. Last night the Grizzlies played at the Jazz (tip-off 01:00, the
    "Mon 26 Oct · late" game of the night rule). He was asleep; the game is unseen. `NBA League Pass 4` carried it and
    keeps 3 days.
  - **The live ones:** the same game. `player-tipoff`: at 01:52 (live in Q2) he starts from tip-off. `player-halftime`:
    he has reached halftime in his replay (aired 02:08) while live is at 02:31 (Q3 started live at 02:22).
    `home-behind`: 02:35, he left his replay in Q1.
  - The ESPN schedule (opponents, dates, the Kings and Warriors results) is real, from `nba-pages/data.json`. The Jazz
    game's clock times, the provider's channels, guide, archive days and videos are illustrative, as are the other
    games' finals and the box-score figures; the mocks say so.

| File | What it is |
|---|---|
| `SPEC.md` | this |
| `*.html` (33) | the mocks; `png/*.png` are their 2x renders, `png/contact-sheet.png` shows them all in three groups |
| `catchup.css` | the new CSS |
| `tools/build.js` | builds every mock from one scenario (so times agree across mocks), and `tools/pages.json` |
| `tools/render.js` | the PNGs and the contact sheet |
| `tools/audit.js` | the self-check (section 11): the nba-pages audit plus SPOILER and CONTAIN |
| `REVIEW-independent.md` | the review of v1.0 (6.3 / 10) that v1.1 answers |

## v1.1 changes: an answer to every review point

### Must fix

**M1. Stopping a replay early revealed the game for the session. Accepted.** A replay **never reveals, not even for the
session**; this overrides nba-pages 8.1 for replays. Only the replay's own final buzzer (with M6's margin) or a Reveal
makes a game seen. The replay is a new `replay` state in `games.js`, separate from `watch`; it never calls
`setWatching` or `revealed.add`. Section 6.10, 7, port 10.4.

**M2. The live buzzer marked the game seen while he was behind, and the player's feeds showed the final. Accepted.**
(a) `buzzer()` marks a game seen only when it is watched **at the live point**, never while a replay of it is open.
(b) New `asAired(g, wallclock)` builds score, clock, plays and chapters from the summary's plays up to a wallclock
time. **Every** player-side feed of that game goes through it during a replay: the score bug, the game panel, the Live
games row, the banner, the `meta` command. Section 6.10, port 10.4 and 10.9.

**M3. Watching behind live gave the live state away. Accepted, all three parts.**
- `player-tipoff` line 2 now says where *you* are (`You're in Q1`), never where live is. The rule is written (6.2).
- `Back to live` stays for the whole replay of a channel, game live or not (6.3).
- A new hero row, **"Live, you're behind in a replay"**: `▶ Resume` · `Back to live` · `Game page`, with your position on
  the slab (`home-behind`, new). While that replay is unfinished and the game hidden: no live clock on that game's hero,
  card or Live-games row (they say `You're in Q1`); the LIVE pills (top bar, hero, card) follow the clock, shown until
  tip-off + 3 h 30, so their going away tells nothing; the channel's on-now title in On now and the guide is the game's
  own for that window (`NBA: Grizzlies at Jazz`), never the post-game show's (7.2).

**M4. Choose a video showed raw titles where they're most dangerous. Accepted.** Under the shield, any title naming
either team of a hidden game, or one of their players, undated or dated from its tip-off on, goes through the news rule
already in `games.js` (`telling()`, the score pattern of S6, and `OT|2OT|overtime|W |L |win|beat`), **whatever the
scope**. If it could tell, the row reads `Video naming the Grizzlies and the Jazz` / `added Tue 27 Oct 08:14 · 1080p`
/ `Name hidden`. `choose-video` is redrawn with the case you actually reach it in: unmatched videos, two hidden.

**M5. Playing a matched video from Movies went around the shield. Accepted.** A matched video of a hidden game: OK on
its card (Movies, Search, Continue watching) opens **the game page**, never the movie detail page (no duration, rating,
plot, backdrop or More like this). Wherever it starts, it plays in the `video` timeline (hidden end, no remaining time,
no `Ends at`) and its progress is stored under `rp:<gameId>`. A held scrub runs on to the end of the bar and jumps to
the video's end only on release, so where it stops tells nothing (6.4, 5.8).

**M6. A wrong clock offset could land "Watch from tip-off" on the post-game show. Accepted, all four parts.**
1. **Anchor on the panel's own programme:** when the full table has the game's programme, the timeshift link uses that
   programme's own `start` string as the panel wrote it (no zone conversion). A separate per-account `archiveShift`,
   learnt from `Not the game?` or a Sync that agrees, replaces the reuse of `epgShift` (3.5).
2. **Margins:** `asAired` shows nothing later than the position − 90 s (Sync may tighten it to − 30 s). Seen, `markSeen`
   and the box score come at the buzzer + 2 min **of played time**. Nothing visible changes in the player when
   `markSeen` happens: `Score hidden` stays until you leave or the window ends.
3. **`Not the game?`** in Options during a replay (`player-replay-options`, `player-notgame`, both new): `Go 1 hour
   later` / `Go 1 hour earlier` / `Other sources`, stored per account. In section 8.
4. **The window ends before the buzzer:** airglow fetches the next 60 min without a word, up to twice, before showing
   `Replay ended` (6.7).

**M7. Scrubbing could say OT or the end before the picture did. Accepted.** "Reached" means **played**, not the thumb.
During a scrub the bubble never names a chapter past Q4 (`Q4 · 2:31:00` for everything after the Q4 start), no tick or
label appears, the chapter row doesn't change, and only playback across the buzzer (M6's margin) marks the game seen
(6.4).

**M8. No key for the game panel in a replay. Accepted.** A `Game` button (the scoreboard glyph) in the bar's right
group, after `Back to live`, and a `Game panel` row first in Options during a replay (`player-replay-options`). With
the bar hidden, the first ◀ or ▶ shows the bar and seeks, as movies do. After the map switches back to live, key repeats
are dropped and ▶ is ignored for 800 ms, so a held ▶ that reaches the live point doesn't open the live panel (6.1).

**M9. Rewinding a channel that isn't kept doesn't work as written. Accepted: option (a).** A channel the provider
doesn't keep **rewinds only inside the stream's own seekable window**: on HLS, ◀ works inside
`player.getSeekableRange()` (30 to 60 s on most Xtream panels) and the bar shows that real span (`player-paused-local`,
redrawn: `This channel rewinds 45 s`). On a progressive `.ts` stream it **pauses only**; resuming after the buffer has
run out goes back to live with the toast `Back to live: this channel doesn't rewind`. A local ring cache (option b) is
a separate milestone, costed in 12.7.

**M10. Seeking inside a `.ts` timeshift needed a design. Accepted.** The seek model is in 6.5: taps coalesce (one
request 600 ms after the last press); a scrub moves only the thumb and the bubble and asks once on release; seeks
inside the buffer stay local; replays try the `.m3u8` link first; the old stream is released before the new one is
asked for; a connection-limit answer gets its own card and retries by itself (`player-connlimit`, new).

**M11. Two mocks were visibly broken and the audit passed both. Accepted.**
- `game-noreplay`: `.state.big` (ui.css) won over `.cu-state`. The rule is now `.state.big.cu-state{width:680px}`;
  the three buttons sit inside the 680 px card.
- `player-panel-live`: four tabs now fit 280 dp (padding 9, gap 4, `.nv-tabs.cu-t`), and `Back closes` moved under the
  button (the nit).
- **The audit catches both now:** a new CONTAIN check fails a control poking out of its card, panel, bar or tab row.
  `--inject-v10` puts the v1.0 CSS back and it reports `CONTAIN: .btn.f "Look again" pokes 36 px out of .state.big`,
  `.btn2 "Reveal Grizzlies at Jazz" … 35 px` and `.act "Sync" pokes 24 px out of .nv-tabs.cu-t` (section 11).

**M12. The team's remembered channel played without checking it carried the game. Accepted.** `teamChannel` counts only
when its table at tip-off matches the game, or at least names no other game. Without a table (M3U), it ranks below a
matched video and the sources sheet marks it `Not confirmed`. The channel you watched a game on is now kept across
restarts (`nbaWatchedOn`, pruned with the seen ids after 8 days). Section 3.2.

### Should fix

**S1. The "game ended live" card told by appearing. Accepted, and made stricter.** Under the shield, `Back to live` in a
hidden game's replay **always** opens one neutral card, `Going live may show the score` / `NBA League Pass 4 is live
now. Your replay stays where you left it.` / `Stay in the replay` · `Go live`, whatever the game is doing live and from
any quarter. The review suggested from the Q4 start; from any quarter costs one press and never tells
(`player-golive`, redrawn).

**S2. Expiry dates were wrong and disagreed. Accepted.** One formatter, `keptUntil(tip, days)`: window start + days,
read with the night rule. The Jazz game is kept until **Thu 29 Oct · late** (Fri 00:45), the Kings game until
**Wed 28 Oct · late** (Thu 00:45). Home, the hub, the team header and the game page now use the same caption
(`NBA League Pass 4` / `Kept until Thu 29 Oct · late`).

**S3. The failure states needed splitting. Accepted.** Section 6.7 now has: the replay didn't start (no more
`(3 links tried)`), the connection limit (`player-connlimit`), the archive isn't ready yet, the video failed, and every
source failed. Section 12 adds "archive not ready" to the TV checks.

**S4. Guide text the morning after. Accepted.** `telling()` runs over the titles and descriptions of every programme on a
sports channel from a hidden game's tip-off to + 72 h (post-game, highlight and studio shows, re-airs), in the guide,
the Now panel, On now, the banner and Up next. An NBA studio show on now gets a quiet line instead of its description:
`[eye-off] May show last night's results (spoiler shield)` (`live-archive`). The three morning-after guide mocks are now
marked `shield`, so the SPOILER check runs on them.

**S5. The sources sheet broke its own rule. Accepted.** `about 20 min` and `no ads` are gone.

**S6. The score mask matched dates. Accepted.** Dates go first (`yyyy-mm-dd`, `dd.mm.yyyy`, `dd-mm`, `mm/dd`), then the
mask takes only two numbers of 60 to 199: `\b(6\d|[7-9]\d|1\d\d)\s?[-–]\s?(6\d|[7-9]\d|1\d\d)\b`. The audit strips dates
the same way.

**S7. The delay means something else in the archive. Accepted.** A per-channel `replayDelay`, starting at
`delayFor(ch) − 20 s` (the live client latency the archive doesn't have). `Sync` in a replay passes the replay's
wallclock as `seenAt` to `recentClocks()`, and stores `replayDelay`, never the live delay (6.4).

**S8. The behind-live hero needs an owner decision. Accepted** as owner decision 13.7: for a hidden live game you
haven't started, is the primary `Watch live` (this design) or `From tip-off`?

**S9. The audit couldn't see this design's risks. Accepted.** Every morning-after mock is marked `shield` (33 of 33),
CONTAIN is new, and SPOILER now also fails `Live is in …`, `Ends at`, `n min left`, a result word (`Final`, `won`,
`beat`, `W 1…`), and OT spelled any way, after stripping dates (section 11).

**S10. Hold ◀ through three days. Accepted in part.** 4.4 now says ▲ from the top row reaches the group chip at any
time, in the past too. **CH± with ◀ held for a day: not adopted.** Remotes send one key at a time (no chords), so it
would be a hidden mode. CH± keeps one meaning (page six rows), and hold ◀ covers a day in about 2 s.

**S11. One game, two dates. Accepted.** The Now panel's line 2 for a matched game adds the game's own label:
`Tue 01:00 to 03:30 · the Mon 26 Oct · late game` (`live-past-game`).

**S12. A re-air's slot length is a hint. Accepted.** Under the shield, a matched re-air of a hidden game is drawn from its
start to start + 2 h 30, with its start time only (`live-archive`).

### Nits (all fixed)
- `player-halftime`'s times: the scenario above now says what each mock shows (you at 02:08, live at 02:31).
- The Continue-watching card reads `Stopped in Q3` without the cut date.
- `player-panel-live`: `Back closes` sits under the button.
- `player-paused-local`'s hint bar has `▼ Options`.
- 5.4 says the covered card isn't focusable while the menu is open (the menu is a layer).
- `Kept` / `Not kept`: an owner call, decision 13.8. The words stay consistent until then.
- The first time `Seen at the final buzzer` shows, it reads `Seen at the final buzzer (the scores show then)` (6.2).
- `NBA.matchGame` returns a game, not a score: the port list adds `matchScore()` (10.4).
- `Watch again` lifts from its right edge, now in 2.3.

---

## 0. The idea in one paragraph

Nothing new to learn. **A replay lives where the thing lives**: a past programme in the guide, a game on its hero, card,
tile and game page. Everything you can watch again carries one mark, the **history glyph** (a clock turning back). OK
plays it. Playing anything from the past gives you the **movie bar you already know** (◀▶ 10 s, OK pause, ▲ the
buttons), plus what a game needs: quarter marks, `Skip to Q3`, the `Game` button, `Back to live`. Where a replay comes
from (the channel's archive, or a full-game video in the provider's Movies) is airglow's problem: it picks the best and
lets you change it with hold OK. Under the shield, **a replay never tells you anything the picture hasn't shown you
yet**: not the score, not the live game's state, not the end of the bar, not whether there was overtime, and it never
counts as seen until its own final buzzer has played.

## 1. Where catch-up lives (the IA decision)

**No new tab, no "Catch-up" section.** The top bar keeps its 7 destinations.

| Surface | What catch-up adds | Mocks |
|---|---|---|
| Live (the guide) | ◀ from now goes back in time on kept channels; kept programmes play from their start | `live-archive`, `live-past`, `live-past-game`, `live-past-gone` |
| Home hero, NBA hub hero, team header | `From tip-off` on a live game; the morning after, your team's unseen game is the hero; your place in a replay you left | `home-replay`, `home-replay-resume`, `home-live-tipoff`, `home-behind`, `nba-hub-replay` |
| Game cards, schedule tiles | the history glyph; hold OK starts with `Watch from tip-off` | `nba-hub-replay`, `nba-card-menu-replay`, `team-schedule-replay`, `team-tile-menu` |
| Game page | the shield card offers the replay first; a seen final gets `Watch again`; nothing found says so | `game-replay-shield`, `game-replay-seen`, `game-noreplay` |
| Where it plays from | hold OK on any watch button lists every source; `Choose a video` for a manual pick | `sources-sheet`, `choose-video` |
| The player | the timeline bar, quarter skips, the Game button, Back to live, pause and rewind live TV, the replay panel, the failure cards | the 16 `player-*` mocks |

**Why not a Catch-up tab or a "Replays" row:** the owner watches one thing above all, the Grizzlies, and the morning
after he should land on that game with one OK (`home-replay`). A separate list would be a second place to look for the
same game. Other games' replays are one day chip away on the hub (`Yesterday`), where the finals already are.

## 2. Rules every catch-up surface follows

### 2.1 Words

| Thing | Word on screen | Never |
|---|---|---|
| Anything you can watch again | the history glyph; `Replay` where a word fits | "Catch-up", "Timeshift", "Archive" |
| A game from its start | `Watch from tip-off` (heroes, menus, cards); `From tip-off` (second button, player) | "Restart" |
| A programme from its start | `Start over` (live), the ⏮ button (timeline) | |
| A seen game again | `Watch again` | |
| Behind the live point | `40 min behind live`, `You're in Q1`, `Back to live` | `Live is in …` (the live state, M3) |
| A channel the provider keeps | `Kept 3 days`, `Kept until Thu 29 Oct · late` (one formatter, S2) | |
| A channel it doesn't | `Not kept by your provider` | "Unavailable", "Error" |
| A video in Movies | `Full game in Movies`, `Full game · Memphis feed`, `Condensed game` | the provider's title for a hidden game |
| A failure | what happened, in the owner's words: `NBA League Pass 4's replay didn't start`, `Your provider allows 1 stream` | link counts, codes |

### 2.2 Geometry (all inside the TV safe area x 48 to 912, y 27 to 513)

| What | Value |
|---|---|
| Guide | unchanged (UI-SPEC 3, 5.3): Now panel y 80 to 152, ruler y 158, 6 rows of 48 + 4, the last ending at y 500, axis 656 px = 2.5 h |
| Day pill | `.cu-day` at the left end of the time axis, 24 high, surface-2, chalk Inter 650 14; ticks under it are dropped (x < 112) |
| Now pill off to the right | `.cu-nowr` at the right end of the axis, `Now 10:40 ›`, the gradient, ink Inter 700 14; ticks within 150 px of it are dropped |
| Kept mark | the history glyph, 16 px chalk, under the channel number (the 30 px number column: no width taken from the name) |
| Kept programme | a normal cell (surface-1), the glyph before its time; the watched part a 3 px gradient bar at the bottom |
| Not kept | an outlined cell: transparent, 1 px `--a-border`, title `text-3` 500 |
| Badge | `.cu-badge`, 24 high, surface-2, chalk Inter 650 14, glyph 16: `Replay`. Neutral: red is LIVE only |
| Card mark | `.cu-rpl` in a game card's status row, in the TV-name slot: glyph 16 + `Replay` Inter 650 14 chalk |
| Tile mark | `.cu-g`: the glyph 18 px at the right end of a schedule tile's result line |
| Shield cards on the game page | `.state.big.cu-state`, **680 wide** (three buttons fit), padding 20/28/13, y 230 to 509; the last text ends at y 495 |
| Sources sheet | the right sheet (420, x 492 to 912, y 27 to 513), rows 64 |
| Choose a video | a menu 600 wide at x 180, y 40 to about 500, rows 64 |
| Hold-OK menus | `.ctxmenu.cu-w`, 292 wide (`Reveal Grizzlies at Jazz` on one line), rows 48 |
| Native tabs | `.nv-tabs.cu-t`: span padding 9, gap 4, so four tabs fit the 280 dp panel |
| Player timeline | section 6.2 |

### 2.3 Focus and keys

- The engine as it is (`focus.js`, nba-pages 2.2). One ring. Guide cells inset; buttons ring + 1.05 (the first of a row
  lifts from its left edge, a right-hand button such as `Watch again` from its right edge); menu rows ring only; native
  rows inset.
- **Entry focus is never a Reveal** (nba-pages 8.2), and on catch-up surfaces it is the watch button when there is one:
  `Watch from tip-off`, `Resume`, `Look again`.
- **Hold OK on any watch button** (`Watch from tip-off`, `From tip-off`, `Watch again`, `Resume`) opens the sources sheet
  (5.6). It carries `data-hold`, as `Watch live` does for other channels.
- **OK means one thing** (UI-SPEC 6): in the guide OK plays the focused programme: live if it is on now, from its start
  if kept, the channel live if not kept, the details card if later.

### 2.4 Port notes (selectors)

The mocks use `.f` / `.f-ring` / `.f-in`; the app uses `:focus` on `.fx`. Add:
- `.g-cell.fx:focus .cu-wp{left:3px;right:3px;bottom:3px}` (the watched bar inside the inset ring, as `.prog` already);
- `.g-cell.cu-gone.fx:focus b{color:var(--a-text-1)}`;
- ring only: `.ctxmenu.cu-w .lr.fx:focus`, `.cu-srcs .lr.fx:focus` (as `.lr`).

### 2.5 Text, numbers, time

- 14 px minimum. Times 24 h. Games use the night rule (`Mon 26 Oct · late`); the guide uses calendar dates (it is a time
  axis), and a matched game's Now panel adds the game's own label (S11).
- **Player times:** `aired 01:52` is when a moment was broadcast; `38:12` is time since the start of the replay;
  `40 min behind live` is the distance to live. **Never a remaining time, an end time or the live game's state for a
  hidden game** (7).

## 3. Where a replay comes from

### 3.1 Three kinds of source

| Kind | What it is | Where it comes from | Gives |
|---|---|---|---|
| **Channel replay** | what a kept channel broadcast | `S.src.catchup(ch, start, end)` (`core.js`): Xtream links (`timeshift/…ts`, `…m3u8`, `timeshift.php`), M3U by its `catchup` mode | any start inside the channel's `archive` days; quarter marks and the as-aired score |
| **Full-game video** | a video in the provider's Movies named for the game | `catalog.movie`, matched by 3.3 | a file: seek anywhere; no quarter marks |
| **Live window** | what a live stream lets you seek | HLS `getSeekableRange()` | 30 to 60 s of rewind on a channel that isn't kept (M9) |

### 3.2 Which channel carried a game (`replaySources(g)`, cached per game for 1 h)

`findFeeds` / `bestChannel` (`games.js`) look at the guide **on now**; a finished game needs it **at tip-off**, which
the short guide doesn't hold. In order:

1. **Your pick for this game** (`replayPick[gameId]`, from the sources sheet).
2. **The channel you watched it on**, if kept. Kept across restarts: `nbaWatchedOn` `{ gameId: chId }`, written by
   `setWatching` and the replay, pruned with the seen ids after 8 days (M12). Today's `lastSeen` is in memory only.
3. **Channels named for the game** (event channels, `matchScore(ch.name, g) ≥ 10`), if kept.
4. **Kept channels whose table had the game at tip-off:** the full table (`get_simple_data_table`, 4.6) of kept NBA /
   League Pass channels first, then kept sports channels, at most 12 tables, through the guide queue (3 at a time). A
   programme matches when it spans tip-off + 5 min and `matchScore(title, g) ≥ 10`.
5. **Your team's remembered channel** (`teamChannel`), **only** when its table at tip-off matches the game, or names no
   other game (M12). With no table at all (M3U) it ranks below matched videos and the sheet says `Not confirmed`.
6. **Full-game videos** (3.3).

A channel replay counts only while its window start is inside the archive (`tip-off − 15 min ≥ now − archive days`)
and, when the table says so, the programme's `has_archive` is 1.

### 3.3 Matching a video to a game

A video in `catalog.movie` is a **full-game video** of game `g` when:
- **both teams** are named: `matchScore(name, g) ≥ 10` (nickname or city of each side; `@`, `at`, `vs`, `v` between
  them, either order). `NBA.matchGame` returns a game, not a score, so the port adds `matchScore` beside it;
- **a date** in the title matches the game's US Eastern or UTC date, within a day: `2026-10-26`, `26.10.2026`,
  `26-10-2026`, `10/26/2026`, `10/26`, `26 Oct`, `Oct 26`, with or without the year. With **no date**, only if it was
  added (Xtream `added`) within 3 days after the tip-off and those teams played only once in that window;
- it isn't **highlights** (`highlights|top plays|recap`).

Then: **condensed** (`condensed|mini|in 20 min`); **feed** (the team whose city, nickname or broadcaster, e.g.
ESPN's `FDSSE`, `KJZZ`, appears next to `feed|home|away`, or alone); **quality** (the tags `titles.js` strips);
**language** (the prefix). A category named `NBA`, `Basketball` or `Replays` relaxes the date to 2 days. Matching is in
memory, so on a videos-only provider every card can show its mark at once.

### 3.4 Ranking (what `Watch from tip-off` plays)

1. **Your pick.** 2. **Channel replays**, best picture first (`quality()`), then the channel you watched on: only these
have quarter marks and the as-aired score. 3. **Full games**, your team's feed first, then quality, then your
languages; `Not confirmed` team channels after them (M12). 4. **Condensed games.** A source that fails moves the next
up, on the failure card. The order is owner decision 13.1.

### 3.5 The replay window and the clock (what airglow asks for, M6)

| Replay of | From | Length | Why |
|---|---|---|---|
| A game | the matched programme's own `start` (raw panel string), else scheduled tip-off − 15 min | **3 h 30**, extended by 60 min up to twice if the buzzer hasn't played (6.7) | a fixed length means the bar never tells how long the game ran |
| A programme | its start | its length + 2 min | guide times are rarely exact |
| Live rewind | the programme's start, or 2 h before now if longer ago | to now, growing | the bar shows the programme |

**The clock, in this order:**
1. **The table's programme**, when the game was matched in it: the link gets that programme's `start` string as the
   panel wrote it (`2026-10-27 01:00:00` → `2026-10-27:01-00`), with no zone conversion and no `epgShift`. The panel's
   archive is cut by its own clock, so its own string is the one thing sure to line up.
2. **Otherwise** (named channels, M3U, a programme not in the table): ESPN's time in the panel's zone (`acc.tz`) +
   **`archiveShift`**, a new per-account value (default 0) learnt from `Not the game?` (± 1 h) or a replay Sync that
   disagrees with the guess by more than 10 min. `catchup()` stops taking `epgShift` off: the guide's offset is a
   different clock.
3. **Positions inside the window:** tip-off at `first play wallclock − window start (true time) + replayDelay − 10 s`,
   where the true window start is the guide start + `epgShift` (case 1) or the ESPN-based guess (case 2), and
   `replayDelay` starts at `delayFor(ch) − 20 s` (S7). Without plays: the scheduled tip-off.

## 4. The guide (`live-archive`, `live-past`, `live-past-game`, `live-past-gone`)

### 4.1 What changes

- **Kept channels** carry the history glyph under their number, always (`live-archive`).
- **◀ from the programme on now** goes to the previous programme on a kept channel, moving the window back an hour
  when it must; on a channel that isn't kept it goes to the channel column, as today. **Hold ◀** keeps going (one draw
  per frame while it repeats): a day back takes about 2 s.
- **How far:** to the channel's archive or the first programme its table holds, whichever is later. At that edge ◀
  goes to the channel column.
- The window is shared by all rows. A row that isn't kept shows its past as **one outlined cell** (`Not kept by your
  provider` / `OK watches ESPN live`), focusable, so ▲▼ keep the time and focus never jumps an hour.
- **The ruler:** the day pill names the day at the left edge; when now is off to the right, `Now 10:40 ›` sits at the
  right end.
- **Back** in the past returns the window to now, on the same channel's programme on now. A second Back focuses the Live
  tab (UI-SPEC 6).

### 4.2 Cells

| Cell | Look | Sub-line | OK | Now panel, right |
|---|---|---|---|---|
| On now | as today | `◂ 10:00` / times; LIVE for a live game | tunes live | `OK tune · Hold OK favourite`, and on a kept channel `◀ earlier · kept 3 days` |
| Past, kept | normal | glyph + times | from its start, or resumes (the watched bar) | `OK play from 20:00` / `OK resume at 20:34`, `Back returns to now` |
| Past, kept, your game | normal | glyph + times | **from tip-off**, not the pre-game | `OK watch from tip-off`, `Back returns to now` |
| Past, not kept (channel not kept, `has_archive` 0, older than the archive) | outlined | `OK watches ESPN live` | tunes live | `OK watch ESPN live`, `Back returns to now` |
| Past, loading | `bg-1`, `Loading earlier programmes…` | – | tunes live | – |
| Past, nothing this far back | outlined, `No guide this far back` | `OK watches it live` | tunes live | – |
| Later | as today | times | the details card | as today |
| Later, a matched re-air of a hidden game (S12) | drawn from its start to start + 2 h 30 | its start only | the details card | as today |

Hold OK still favourites the channel, anywhere in the row.

### 4.3 The Now panel

- **A past programme:** the tile with the glyph disc in its corner; the title and the `Replay` badge; line 2 channel ·
  `Mon 26 Oct` · `20:00 to 21:00` · `watched 34 min` and a 70 px bar; line 3 the description.
- **Your game:** line 2 `NBA League Pass 4 · Tue 01:00 to 03:30 · the Mon 26 Oct · late game` (S11); line 3
  `[eye-off] Description hidden (spoiler shield)`.
- **A sports programme from a hidden game's tip-off to + 72 h** (S4): its title and description go through `telling()`;
  a match is replaced (`[eye-off] May show last night's results (spoiler shield)` for the description; the title
  becomes the channel's generic one, `NBA League Pass 4 · studio show`). An NBA studio show on now always gets the line
  (`live-archive`).
- **Not kept:** `Earlier on ESPN` / `not kept by your provider` / `Kept channels show the history mark under their
  number.` (`live-past-gone`).

### 4.4 Keys

| Element | ◀ | ▶ | ▲▼ | OK | Hold OK | Back |
|---|---|---|---|---|---|---|
| Programme on now | earlier (kept), else the channel column | next | channels, same time; ▲ from the top row: the group chip | tune | favourite | tab |
| Past cell | earlier, to the archive edge, then the channel column | later, back to now and on | channels, same time; ▲ from the top row: the group chip, in the past too (S10) | per 4.2 | favourite | the window returns to now |
| Channel column | – | the cell at the time you were at | channels | tune | favourite | as the cell |
| CH± | pages six rows at the same time (unchanged; no day jump: remotes send no chords, S10) | | | | | |

### 4.5 States

- **Offline:** kept cells keep their look; OK says `Offline · replays need the provider`.
- **The table failed:** `Earlier programmes didn't load · OK still tunes`, tried again in 30 s (as `guideFailed`).
- **M3U accounts** have no guide (`m3u().epg` returns nothing), so no past is drawn. Games still replay (3.2 needs
  only the channel and ESPN's times; `Not confirmed` when the channel is a guess), and live rewind works.

### 4.6 Data

- Past programmes come from `get_simple_data_table`, fetched for a kept channel the first time its row goes before now,
  through the guide queue (on-screen rows first), kept 10 minutes. It brings `has_archive` and the raw `start` string
  (3.5) when the panel sends them.
- Rows that aren't kept need no past data.
- `epgShift` moves the guide's display as today; it no longer goes into the replay link (3.5).

## 5. NBA surfaces

### 5.1 The hero state table, catch-up rows (Home hero, hub hero, team header)

These extend nba-pages 7.1; the primary is the entry focus.

| When | Primary | Secondary | Third | Caption | Slab |
|---|---|---|---|---|---|
| Live, not started by you, a replay source exists | `▶ Watch live` (decision 13.7) | `⏮ From tip-off` | `Box score` (shield: `Reveal score`) | moves to the status row: `LIVE · NBA · NBA League Pass 4` (`home-live-tipoff`) | the live clock, as today |
| **Live, you're behind in a replay** (you left it unfinished) | `▶ Resume` | `Back to live` (shield: the card of 6.7) | `Game page` | moves to the status row | **your position**: `Q1` `8:20` / `You stopped here` (`home-behind`) |
| **The morning after:** final, hidden, a replay exists | `▶ Watch from tip-off` | `Game page` | – | `NBA League Pass 4` / `Kept until Thu 29 Oct · late`, or `Full game in Movies` / `Memphis feed` | `REPLAY` / `Score hidden` (`home-replay`) |
| Final, hidden, you stopped partway | `▶ Resume` | `⏮ From tip-off` | `Game page` | – | `Q3` `6:41` / `You stopped here` (`home-replay-resume`) |
| Final, hidden, no replay found yet | `Game page` | – | – | `No replay yet` / `airglow keeps looking` | `END` / `Score hidden` |
| Final, seen (or shield off), within 12 h, a replay exists | `Box score` | `▶ Watch again` | – | `Final · W 123–112` | `FINAL` / `Full time` |

- The hub hero drops `Plays` when three buttons show.
- **Home's hero priority (UI-SPEC 5.2):** your team from 3 h before tip-off to 30 min after the final (live includes
  the behind-in-a-replay row) > **your team's last game, hidden, with a replay**, from 30 min after the final until the
  first of: its buzzer has played in a replay or you reveal it; its replay expires; 48 h pass; the next game's 3 h
  window opens > resume > the last channel.
- **"Behind in a replay"** lasts until the replay's buzzer plays, you reveal, or 12 h pass. During it, for that game
  (7.2): no live clock anywhere, LIVE pills on the clock, the channel's title held.
- Records stay `recordFor` (partial with the eye-off) on heroes and the team header.

### 5.2 Continue watching

A replay you stopped is a card (`home-replay-resume`): the team colours as art, crests top right, `NBA · Replay`,
`Grizzlies at Jazz`, `Stopped in Q3` (a video without chapters: `Stopped 1 h 12 min in`). **Never minutes left.** Its
bar is on the window's scale. OK resumes; hold OK: `From tip-off`, `Game page`, `Remove`. A matched video started from
Movies is stored under `rp:<gameId>` and shows this card, not a movie card (M5).

### 5.3 Game cards (`nba-hub-replay`)

- A final or live game with a replay shows `⟲ Replay` in the status row, in the TV-name slot.
- Your team's games are looked up when the schedule loads; other games when their card has had focus for 600 ms or
  their page opens; on a videos-only provider, all at once (3.3).
- **A card whose plate is hidden drops its two records** (the partial record cut `Grizzlies` to `Griz…`).
- Behind in a replay, the card's status reads `LIVE · You're in Q1` (7.2).
- The day row's caption adds `⟲ = replay` while the day shown has one.

### 5.4 Hold-OK menus (`nba-card-menu-replay`, `team-tile-menu`)

| On | Rows, in order (first focused) |
|---|---|
| A final with a replay | `▶ Watch from tip-off`, `<Away> page`, `<Home> page` (tile: `<Opponent> page`), `Open the game`, `Reveal <game>` (hidden only, always last) |
| A live game with a replay | `▶ Watch live`, `⏮ From tip-off`, then as above |
| No replay | as nba-pages 1 |

**Placement (a fix to nba-pages 2.5):** below the card if it fits by y 513; else above if it covers neither the card
nor a team colour; **else beside the card** (x = card right + 16, or card left − 16 − 292), y clamped to 27 to 513. The
cards under the menu aren't focusable while it is open (the menu is a layer), so covering one is fine.

### 5.5 The game page (`game-replay-shield`, `game-replay-seen`, `game-noreplay`)

| State | Tab row, right side | Body | Entry focus |
|---|---|---|---|
| Live, replay exists | `▶ Watch live` (btn sm), `⏮ From tip-off` (btn2 sm) | as today | the first tab |
| Live, behind in a replay | `▶ Resume`, `Back to live` | the shield card while hidden (`Resume` first) | Resume |
| Final, hidden, replay exists | – | `Grizzlies at Jazz is hidden` / `Watch it from tip-off: it counts as seen at the replay's final buzzer.` / `▶ Watch from tip-off` · `Reveal Grizzlies at Jazz` / `NBA League Pass 4 · kept until Thu 29 Oct · late · hold OK: other sources` | **Watch from tip-off** |
| Final, hidden, nothing found | – | `No replay of this game yet` / `Full games often reach Movies a few hours after the final. airglow looks every hour until Thu.` / `↻ Look again` · `Choose a video` · `Reveal Grizzlies at Jazz` / `Looked at 10:32 in 4 channel archives and 312 NBA videos` | **Look again** |
| Final, seen | `Kept until Wed 28 Oct · late` · `▶ Watch again` | the box score | the first tab |

- Plays stays dropped while hidden (nba-pages).
- **A fix:** `game.js` `entry()` focuses `[data-act="reveal"]` first today (line 115); the entry is the card's first
  button.
- `replaySources` runs again hourly while a hidden game has none, up to 3 days, and when the movie catalog refreshes.

### 5.6 The sources sheet (`sources-sheet`)

- Opened by hold OK on any watch button, and by `Other sources (n)` in the player's Options during a replay.
- Right sheet 420: `Watch Grizzlies at Jazz` / `From tip-off · Mon 26 Oct · late`. Rows 64: icon (glyph for a channel,
  film for a video, search for the last row), airglow's name, a detail line, `Best` on airglow's choice or `Not
  confirmed` (M12). Last row `Choose a video…`. **No durations and nothing airglow can't know** (S5: no "no ads").
- OK plays from tip-off and remembers it for this game. Back closes. Focus starts on the current choice.

### 5.7 Choose a video (`choose-video`)

- You reach it from `game-noreplay` (nothing matched) or the sheet. It lists every video naming either team, newest
  first. Up to 40 rows; the list scrolls.
- **The shield rule (M4), whatever the scope:** a title naming either team of a hidden game, or one of their players,
  that is undated or dated from its tip-off on, goes through `telling()` + the score pattern of S6 +
  `OT|2OT|overtime|W |L |win|beat|lost`. If anything matches, or the title can't be read with certainty, the row reads
  `Video naming the Grizzlies and the Jazz` / `added Tue 27 Oct 08:14 · 1080p` / `Name hidden` with the eye-off as its
  icon. Videos dated before the tip-off (a preview, a game you've seen) keep their title.

### 5.8 Movies and Search, under the shield (M5)

A video matched to a hidden game:
- **Card** (Movies, Search, Continue watching): title `Grizzlies at Jazz`, meta `Mon 26 Oct · Full game`, the matchup art
  instead of the provider's poster, no rating, no duration.
- **OK opens the game page**, never the movie detail page (whose duration, rating, plot, backdrop and More like this,
  full of other copies of the game, would all tell).
- **Play** from anywhere uses the `video` timeline (6.3), progress under `rp:<gameId>`.
- When the game is seen, the video goes back to the provider's title, poster and detail page.

## 6. The player (native: `PlayerActivity`, `VodControls`, `GamePanel`, `Ui`)

### 6.1 Two key maps, and when each applies

| Map | When | Keys |
|---|---|---|
| **Live** | a live channel at the live point | as today (UI-SPEC 7): ▲▼ zap, OK channels, ◀ Options, ▶ game panel, hold OK last channel; ⏯ (if the remote has it) pauses |
| **Timeline** | a movie, an episode, a kept programme, a game replay, live TV you paused or rewound | as movies: **◀▶ 10 s** (hold: faster every second, ×2 to ×32), **OK pause / play**, **▲ the buttons** (the `Game` button among them), **▼ Options**, Back hides the bar then leaves; ⏯ pause; ⏪⏩ ∓10 s (hold scrubs); CH± and digits leave the timeline and tune that channel live |

- The map changes only when you press something that says so (⏯, `Rewind and pause`, `From tip-off`, a past
  programme), and the bar is on screen when it happens.
- With the bar hidden, the first ◀ or ▶ shows the bar and seeks (as movies).
- **Reaching the live point** (seeking forward to it, or `Back to live`) restores the live map; the bar shows `Live`
  for 2 s and the hint bar reads `▲ ▼ Change channel`. **For 800 ms after the switch, key repeats are dropped and ▶ is
  ignored**, so a held ▶ doesn't open the live game panel (M8).
- **Back** with the bar hidden leaves the player, as a movie (decision 13.3).

### 6.2 The timeline bar (`player-tipoff`; in dp)

| Part | Value |
|---|---|
| Top block | `nv-vtop`: left 48, top 30. Title Outfit 700 28/32; sub Inter 500 16/22 `text-2`. At the right, `cu-pos`: line 1 Inter 650 18/22 chalk (`40 min behind live`, `Score hidden`, `Ends at 11:06` for a programme), line 2 Inter 500 15/20 `text-2`: **your position** (`You're in Q1`, `Halftime`), never the live game's. The first time it shows: `Seen at the final buzzer (the scores show then)`, later `Seen at the final buzzer` |
| Bar | left 48, right 48, bottom 64 dp: **y 344 to 476**, radius 16, `Ui.BANNER` (bg-1 92%), padding 16 / 20 / 10 |
| Buttons row | 44 high. Circles 44 (`vb`: ⏯, ⏮, `−1m`, `+1m` in Inter 700 15, `Game` with the scoreboard glyph); pills 40 high (btn2 sm). Gaps 10. The right group (`Back to live`, `Game`, CC, Audio, Picture) is pinned right |
| Track | 6 dp, 14 below the buttons, x 68 to 892 (**824 dp**). Played part: the gradient. Thumb 18 dp chalk; focused 22 dp with the ring |
| Not yet aired | from the live point to the end of the window: bg-1 with a 1 dp dashed `border-strong` outline |
| Live point | a 14 dp red dot with a 2 dp panel-coloured edge, and the 22 dp LIVE pill 12 dp to its right (to its left within 90 dp of the end) |
| Chapter ticks | 2 x 14 dp `text-2` at each chapter start: Tip-off, Q2, Half, Q3, Q4; OT only once **played** |
| Chapter row | 24 high: labels Inter 500 14 `text-3` centred on their ticks; the chapter you're in chalk 650. Ends: elapsed `34:10` and remaining `−25:50` (programmes, movies), or `[eye-off] End hidden` (a hidden game) |
| Scrubbing | the bubble above the bar (chalk, ink 700 15/20), centred on the thumb: `Q3 · 1:12:00`; **never a chapter past Q4** (M7); the speed chip `▶▶ ×8` beside it |
| Hint bar | `OK Pause · ◀ ▶ 10 s, hold for faster · ▲ Buttons · ▼ Options · Back Hide`; on the buttons it names what OK does (`OK Skip to Q3`) |
| Hides | after 4 s while playing; never while paused |

### 6.3 Buttons, per kind

| Playing | Left group | Right group |
|---|---|---|
| A game replay (channel) | ⏯ · ⏮ (tip-off) · `−1m` · `+1m` · `Skip to <next>` | **`Back to live` (always, M3)** · `Game` · CC · Audio · Picture |
| A game video (Movies) | ⏯ · ⏮ (start) · `−1m` · `+1m` | `Game` · CC · Audio · Picture |
| A kept programme | ⏯ · ⏮ (its start) · `−1m` · `+1m` · `Next programme ›` | CC · Audio · Picture |
| Live TV rewound or paused, kept | ⏯ · ⏮ (programme start) · `−1m` · `+1m` | `Back to live` · CC · Audio · Picture |
| Live TV paused, not kept | ⏯ · `−10` · `+10` (HLS window only; `.ts`: ⏯ only) | `Back to live` · CC · Audio · Picture |
| A movie or episode | as today | as today |

**The skip button** names where it goes: Q1 `Skip to Q2`; Q2 `Skip to Q3` (over halftime); halftime `Skip halftime`;
Q3 `Skip to Q4`. **From Q4 on there is none, shield or not.** It lands 10 s before the quarter's first play.

### 6.4 Chapters, the as-aired game and seen (M2, M6, M7, S7)

- **Chapters** come from the ESPN summary: each period's first play `wallclock` (`at` in `app/nba.js`); Half is the last
  play of Q2. In the replay: **position = wallclock − true window start + `replayDelay`** (3.5).
- **`asAired(g, wallclock)`** (new, `games.js`): from the summary's plays with `at ≤ wallclock`, the score (the last
  play's away/home), period, clock, the plays list and the chapters reached. During a replay **every** player feed of
  that game uses `asAired(g, airedAt(position) − 90 s)` (Sync can tighten the margin to 30 s): the score bug, the game
  panel, the Live games row, the banner, `meta`. Never `show(g)` / `delayed(g)`, which return the final for a finished
  game.
- **"Reached" means played** (M7): a chapter counts when the **played** position passes it; a scrub, a seek or the thumb
  never does. OT ticks and rows appear only once played.
- **Seen:** when the played position passes the buzzer (the last play's wallclock) + 2 min, the replay calls
  `markSeen`. **Nothing in the player changes at that moment**: `Score hidden` stays until you leave or the window
  ends; the box score appears the next time the panel opens.
- **Videos** have no chapters: no ticks, no skip; seen when playback reaches the video's last 2 %.
- **Sync** in a replay passes the replay's aired time as `seenAt` to `recentClocks()` and stores `replayDelay` for the
  channel (S7). A Sync that moves the guess by more than 10 min updates `archiveShift` instead (3.5).

### 6.5 Seeking (M10)

| What | How |
|---|---|
| Taps (◀▶, ±1m, skip) | coalesce: one request 600 ms after the last press; the thumb moves at once |
| A scrub (held ◀▶) | moves only the thumb and the bubble; one request on release |
| Inside what is buffered | a local seek, no request |
| The link | replays try the `.m3u8` link first (usually a VOD playlist that seeks), then `.ts` / `timeshift.php`. A `.ts` link is minute-granular: ask from the minute, then seek the seconds locally |
| Each new request | the old stream is released first (`player.stop()`), then the new link is asked for; the reconnect spinner (no text) shows after 1 s |
| Connection limit (403, "max connections") | `player-connlimit`: `Your provider allows 1 stream` / `Close it on your other devices, or wait a few seconds. Trying again in 5 s.` / `Try again now`; retries by itself 3 times |
| A video past its end (M5) | a scrub can run on to the end of the bar; on release past the real end it jumps to the last 5 s |

### 6.6 Options

| Playing | Rows (first focused) |
|---|---|
| Live, a game, kept channel (`player-options-live`) | `Sync score` · **`Watch from tip-off`** (focused when opened from ◀) · **`Rewind and pause`** · Other feeds · Subtitles · Audio · Picture size · Favourite · Score on picture (7 rows show; it scrolls) |
| Live, no game, kept | **`Start over`** (`from 10:15`) · **`Rewind and pause`** · Subtitles · Audio · Picture size · Favourite · Score on picture |
| A game replay (`player-replay-options`) | **`Game panel`** · **`Other sources (3)`** · **`Not the game?`** · `Sync score` · Subtitles · Audio · Picture size |
| A kept programme | Subtitles · Audio · Picture size · Speed |

**`Not the game?`** (`player-notgame`): `If the replay starts on the wrong show, move it. airglow remembers this for your
provider.` / `Go 1 hour later` (`It shows what was on before the game`) / `Go 1 hour earlier` (`It starts mid-game, or
after the game`) / `Other sources`. OK moves the window by an hour, restarts at tip-off and stores `archiveShift ± 1 h`.

### 6.7 Cards

| Card | When | Content | Focus |
|---|---|---|---|
| **Going live may show the score** (`player-golive`) | under the shield, `Back to live` in a hidden game's replay, **always** (S1) | `Going live may show the score` / `NBA League Pass 4 is live now. Your replay stays where you left it.` / `Stay in the replay` · `Go live` | **Stay**; Back stays |
| **The replay didn't start** (`player-replay-failed`) | every link of a channel replay failed | `This replay didn't start` / `NBA League Pass 4's replay didn't start.` / the next source as a row / `Try again`, `Back closes` | the next source |
| **One stream** (`player-connlimit`) | the provider answered "max connections" | 6.5 | Try again now |
| **Not ready yet** | rewind or `From tip-off` within the last minutes, and the archive answers 404 | `The last few minutes aren't in the replay yet` / `Try again in a minute` / `Back to live` | Back to live |
| **The video didn't start** | a video failed | as the replay card, with the next source | the next source |
| **Every source failed** | nothing left | `Grizzlies at Jazz didn't start from any source` / `Choose a video` · `Game page` · `Back closes` | Choose a video |
| **Up next** (programmes) | the last 10 s of a kept programme | `Next on BBC One · 21:00 Night Circuit` (titles through `telling()` the morning after, S4) | – |
| **Replay ended** | the window's end, after up to two silent 60-min extensions without reaching the buzzer (M6.4) | `Replay ended` / `Box score` · `Watch again` (or `Reveal` naming the game, if still hidden) | Box score |

### 6.8 Pause and rewind live TV (M9)

- **Kept channel** (`player-paused`): pausing keeps the live link paused while its buffer holds. Seeking back past the
  buffer, or resuming after it ran out, switches to a channel replay from that moment (3.5). The bar is the programme,
  the live point and how far behind you are; `Back to live` returns to the live link.
- **Not kept, HLS** (`player-paused-local`): ◀ and `−10` work inside `getSeekableRange()`; the bar is that span
  (`45 s ago` to LIVE); `This channel rewinds 45 s`.
- **Not kept, progressive `.ts`**: pause only. Resuming after the buffer has run out goes back to live with the toast
  `Back to live: this channel doesn't rewind`.
- **The banner** of a kept channel adds the glyph as a tag beside HD and CC. **The hint bar** adds `⏯ Pause` when the
  remote has the key (`KeyCharacterMap.deviceHasKey(KEYCODE_MEDIA_PLAY_PAUSE)`); otherwise `◀ Options` leads to
  `Rewind and pause`.

### 6.9 The game panel

- **Watching live, kept channel** (`player-panel-live`): as today (the reveal you asked for), plus a foot button
  `⏮ From tip-off`, ▼ from the table, and `Back closes` under it. Tabs use the NBA's three-letter codes (`UTA`) and
  `.cu-t` spacing, so `Sync` fits.
- **In a game replay** (`player-replay-panel`, opened by the `Game` button or `Game panel` in Options): `asAired`. The
  plate shows the score as aired, `Q2 6:41 · as aired`. Tabs `Quarters · Plays · Sync`. Quarters: `Tip-off · 01:12`,
  `Q2`, `Halftime`, `Q3`, `Q4` with their aired times (OT rows only once played); the current one `surface-2`; OK jumps
  there. Plays up to the moment. **No box score until the buzzer + 2 min has played.**
- **In a video replay:** the plate reads `Replay`, no score (no timing to align), and the panel lists the other sources.

### 6.10 The replay state (M1, M2)

`games.js` gets `replay = { gameId, chId, kind, windowStart, played, airedAt }`, set by the player's `position` events.
- It **never** calls `setWatching` or `revealed.add`; a replay reveals nothing, not even for the session (overrides
  nba-pages 8.1).
- `watch` stays for live watching only. Opening a replay clears `watch` for that game.
- `buzzer(g)` marks seen only when `watch.gameId === g.id` **and** the player is at the live point (no replay open for
  that game).
- `behindReplay(g)` is true while a replay of a live or recent game is unfinished; it drives 5.1, 5.3 and 7.2.

### 6.11 One connection

A replay uses the player's one stream: going to a replay replaces the live link; `Back to live` replaces it back. No
preview, no second stream (UI-SPEC 3.5).

## 7. The spoiler shield, for replays

Scope, seen and Reveal are nba-pages 8.1, except: **a replay never reveals, not even for the session** (6.10).

### 7.1 Before and while it plays

| Where | Under the shield, for a hidden game |
|---|---|
| Every surface before it plays | no score, no `Final`, no winner, no OT; records partial; the slab `REPLAY / Score hidden` |
| The bar | **never shows where the game ends**: a fixed window, no remaining time, no `Ends at`, no end mark, `[eye-off] End hidden` |
| Chapters | Tip-off to Q4 shown ahead; **OT only once played** (6.4) |
| Skip | none from Q4 on, shield or not |
| Scrub bubble | the chapter (never past Q4) and time since tip-off |
| Game panel, score bug, Live games row, banner | `asAired`, 90 s behind the picture; no box score until the buzzer + 2 min has played |
| Line 2 of the top block | your position, never the live game's state |
| Back to live | always the neutral card (6.7) |
| `markSeen` | never visible in the player when it happens |
| The "Grizzlies are live" chip | not shown while you're in that game's replay |
| Videos | airglow's name and art, the game page instead of the detail page, the hidden-end timeline, `rp:<gameId>` (5.8) |
| Choose a video | the M4 rule, whatever the scope (5.7) |
| Sources sheet | no durations |
| Guide and programme text | `telling()` over sports programmes from tip-off to + 72 h (4.3); matched re-airs drawn 2 h 30 with no end time |
| Continue watching | `Stopped in Q3`, never minutes left |
| Seen | the replay's buzzer + 2 min of played time, the end of a video, or a Reveal |

### 7.2 Outside the player while you're behind in a replay (M3)

While `behindReplay(g)` and `g` is hidden:
- **That game's** hero, card and Live-games row show `You're in Q1`, never the live clock; the slab shows your position.
- **The LIVE pills** for that game (top-bar NBA tab, hero, card) follow the clock: shown from tip-off to tip-off + 3 h 30,
  whatever the game does, so their going away tells nothing.
- **The channel's on-now title** (On now card, guide cell and Now panel, banner) is the game's own (`NBA: Grizzlies at
  Jazz`) from tip-off to tip-off + 3 h 30, never the post-game show's.
- Other games keep the My team rule (their scores show).

**With the shield off** nothing is hidden, and a replay still never shows the box score ahead of the moment you're
watching: a replay is watched as if live.

## 8. States

| State | What shows | Focus |
|---|---|---|
| No archive, no matching video | no marks; the "no replay found yet" hero row; the game page says so (`game-noreplay`) | Look again |
| The replay landed on the wrong show | `Not the game?` in Options (`player-notgame`); the correction is kept per account | Go 1 hour later |
| The archive fails, the video fails, every source fails, one stream, not ready yet | the cards of 6.7 | per 6.7 |
| The window ends before the buzzer | up to two silent 60-min extensions, then `Replay ended` | Box score |
| A replay expired | the mark goes; a hidden game's card says `The channel replay expired Thu 29 Oct · late` when nothing else is left | – |
| Videos only | the same surfaces, `Full game in Movies` captions; no quarter marks | as 5.1 |
| Team channel without a guide (M3U) | `Not confirmed` in the sheet, ranked below videos | – |
| Behind in a replay of a live game | `home-behind`; 7.2 | Resume |
| Guide table loading / failed | `Loading earlier programmes…` / `Earlier programmes didn't load · OK still tunes` | stays |
| Offline | marks stay; OK says `Offline · replays need the provider` | stays |
| Account allows one connection | a replay replaces live (6.11); 6.5's limit card | – |
| Team `None` | no morning-after hero; marks, menus and the game page as for any game | – |
| Shield off | the seen-final row (`Watch again`); provider titles | – |

## 9. Data

| Need | Where | Notes |
|---|---|---|
| Kept, how long | `archive` on live items (`core.js`) | days; 0 = not kept |
| The replay link | `S.src.catchup(ch, start, end)` | for replays: `.m3u8` first; the table's raw `start` when matched; `archiveShift` instead of `epgShift` (3.5) |
| Past programmes | `get_simple_data_table`, lazily per kept row | `has_archive`, raw `start` |
| Tip-off, chapters, buzzer, as aired | ESPN summary plays, `wallclock` (`at`) | fetched when a replay starts; read only through `asAired` |
| Delays | `delayFor(ch)` (live), new `replayDelay[ch]` (replays) | `replayDelay` starts at `delayFor − 20 s` |
| Clock correction | new `archiveShift` per account | `Not the game?`, a replay Sync |
| Seen | `markSeen` from the replay's played buzzer + 2 min | `{ upTo, ids }` |
| The replay | new `replay` state (6.10) | never `watch` / `revealed` |
| Watched on | new `nbaWatchedOn` `{ gameId: chId }`, persisted | replaces in-memory `lastSeen` for 3.2 |
| Your source pick | new `replayPick[gameId]` | pruned with the seen ids |
| Where you stopped | the progress store, `rp:<gameId>` or `rp:<chId>:<start>` | also for videos started from Movies |
| Videos | `catalog.movie` (`name`, `cat`, `added`, `url`) | `matchScore` (3.3) |
| Text masks | `telling()`, `SCORE` (S6), result words | `games.js` |

## 10. Port checklist

1. **CSS:** `catchup.css` into `app.css`, with the selectors of 2.4.
2. **`guide.js`:** the full table per kept channel on demand; `pastFor(ch, from)`; `has_archive`; the raw `start`.
3. **`live.js`:** the window may start before now; the cell kinds of 4.2; the day and right-hand Now pills; ◀ past now
   on kept rows; ▲ to the group chip from the top row in the past; Back returns to now; the Now panel of 4.3, with
   `telling()` over sports programmes (S4) and matched re-airs drawn 2 h 30.
4. **`games.js`:**
   - `matchScore(text, g)` beside `NBA.matchGame`;
   - `replaySources(g)` (3.2 to 3.4), `nbaWatchedOn`, `replayPick`;
   - **the `replay` state** (6.10): no `setWatching`, no `revealed.add`; `buzzer()` only at the live point;
     `behindReplay(g)`;
   - **`asAired(g, wallclock)`** and the chapter list from plays;
   - seen from the played buzzer + 2 min; `replayDelay`; `archiveShift`;
   - the morning-after hero rule; the text masks (S6, M4).
5. **`cards.js`:** the hero rows of 5.1 (with behind-in-a-replay); `⟲ Replay`; hidden cards drop records; `You're in
   Q1` on that game's card; LIVE pills on the clock (7.2); the replay card for Continue watching.
6. **`game.js`:** the tab-row buttons and the shield cards of 5.5; the entry fix (never Reveal).
7. **Team page tiles:** the mark; the hold-OK rows. **`ui.js` `contextMenu()`:** the placement rule of 5.4.
8. **Sheets:** the sources sheet (5.6), Choose a video with the M4 rule (5.7). **Movies / Search / Continue watching:**
   5.8 (the game page instead of the detail page).
9. **`player.js` → native:** a `replay` command (`{ kind, links, windowStart, windowMs, startAt, chapters, buzzerAt, live,
   hidden }`); events `position` (played and aired time), `seen`, `source-failed`, `conn-limit`; **during a replay the
   `meta` / `game` commands carry `asAired` data only**.
10. **`VodControls`:** the timeline variant (6.2, 6.3), the `Game` button, the bubble rules (never past Q4), `End hidden`,
    the seek model (6.5). **`PlayerActivity`:** the two key maps and the 800 ms ▶ guard (6.1); pause and the HLS window
    (6.8); live ↔ replay links; Options rows and `Not the game?` (6.6); the cards (6.7); the silent extensions.
    **`GamePanel`:** the replay variant, the foot button, `.cu-t` tabs.
11. **`tests/tv/drive.js` scripts:** the guide to the archive edge and Back to now; OK on each cell kind; the
    morning-after hero; **a shield script** that walks every surface of section 7, in and out of a replay behind live,
    and fails on any score, remaining time, end time, OT, result word or live state of the hidden game (the audit's
    SPOILER rule, run on the app); a seek-flood script (20 taps in 2 s must make one request).

## 11. Self-check (`node tools/audit.js`; ring data in `tools/audit-rings.json`)

**The checks** are the nba-pages audit's, adapted to the `cu-` classes and the timeline: one ring; text under 14 px;
text overlaps; text against boxes; clipping of text and rings; the safe area; contrast; team colour near LIVE or touching
a ring; plate contrast; the RING pixel check; floating boxes inside y 27 to 513 and x 48 to 912 (**v1.1: also the
shield cards, the timeline bar, native panels and cards**); a focused Reveal; peeking tiles.

**New in v1.1: CONTAIN.** A control (button, pill, chip, menu row, native row, tab, badge, LIVE pill) whose box pokes
more than 1 px out of its card, panel, bar or tab row fails (a lifted control may grow by its own lift).

**SPOILER, extended in v1.1.** On a mock marked `<meta name="shield" content="unseen">` (**33 of 33**: every mock is the
morning after or the live game), after dates are stripped (S6), it fails any visible score (`\d{2,3}–\d{2,3}`), score
plate, remaining time (`−m:ss`), `Ends at`, `n min left`, OT spelled any way, a result word (`Final`, `won`, `beat`,
`W 1…`), and the live state (`Live is in …`), outside an element marked `data-other` (another game, a seen game, a
programme that isn't the game) or `data-moment` (the score as aired, 6.9).

**Tested by injecting faults:**
- `node tools/audit.js --inject` adds a score, a remaining time and a focused Reveal to every shield mock: **all 33**
  fail with `SPOILER: a score`, `SPOILER: a remaining time` and `SHIELD: the focused element is a Reveal`.
- `node tools/audit.js --inject-v10` puts the v1.0 CSS back and the v1.0 line `Live is in Q2`: it reports
  `CONTAIN: .btn.f "Look again" pokes 36 px out of .state.big`, `.btn2 "Reveal Grizzlies at Jazz" pokes 35 px`,
  `.act "Sync" pokes 24 px out of .nv-tabs.cu-t` (the two visual bugs the review found), and `SPOILER: the live state
  "Live is in Q2"` on the 5 timeline mocks with a position line.

**Result: 33 pages, 0 findings.**

**Fixed during v1.1, from the audit and the renders:** the two review bugs (M11); a CONTAIN-clean `Not the game?` panel
(a cut sub-line, shortened); the whole-page `data-other` marking on four mocks was too broad (an injected score passed
on them), now only their bars and headers are marked.

| Mock | Focused | Ring white, all sides | Ring box | To the safe edge |
|---|---|---|---|---|
| live-archive | programme on now (inset) | 100% | 256, 192, 383, 240 | 165 |
| live-past | Coastline (inset) | 100% | 387, 348, 646, 396 | 117 |
| live-past-game | the Grizzlies game (inset) | 100% | 650, 192, 908, 240 | 4 |
| live-past-gone | the outlined ESPN cell (inset) | 100% | 256, 296, 908, 344 | 4 |
| home-replay | Watch from tip-off | 100% | 68, 207, 316, 263 | 19.7 |
| home-replay-resume | Resume | 100% | 68, 207, 224, 263 | 19.7 |
| home-live-tipoff | Watch live | 100% | 68, 207, 245, 263 | 19.7 |
| home-behind | Resume | 100% | 68, 207, 224, 263 | 19.7 |
| nba-hub-replay | the Grizzlies card | 100% | 43, 372, 339, 512 | −5.2 (ring in the margin) |
| nba-card-menu-replay | Watch from tip-off (menu row) | 100% | 340, 259, 624, 317 | 196 |
| game-replay-shield | Watch from tip-off | 100% | 231, 417, 479, 473 | 39.6 |
| game-replay-seen | Watch again | 100% | 746, 168, 917, 216 | −5.2 |
| game-noreplay | Look again (inside the 680 px card, x 140 to 820) | 100% | 156, 413, 339, 469 | 43.7 |
| choose-video | the first video | 100% | 188, 116, 772, 190 | 89 |
| sources-sheet | NBA League Pass 4 | 100% | 508, 103, 896, 177 | 16 |
| team-schedule-replay | the Jazz tile | 100% | 482, 352, 700, 472 | 41.1 |
| team-tile-menu | Watch from tip-off (menu row) | 100% | 496, 148, 780, 206 | 121 |
| player-tipoff, -replay, -scrub, -programme, -paused, -paused-local, -video-replay | the seek thumb | by eye (below) | 32 x 32 at y 411 to 443 | 70 |
| player-halftime | Skip halftime | 100% | 279, 355, 442, 405 | 108 |
| player-replay-panel | Q3 row (inset) | 100% | 643, 326, 901, 374 | 11 |
| player-options-live | Watch from tip-off (inset) | 100% | 59, 132, 377, 180 | 11 |
| player-replay-options | Not the game? (inset) | 100% | 59, 184, 377, 232 | 11 |
| player-notgame | Go 1 hour later (inset) | 100% | 59, 124, 397, 172 | 11 |
| player-golive | Stay in the replay | 100% | 344, 385, 517, 433 | 79.9 |
| player-replay-failed | the next source (inset) | 100% | 249, 327, 711, 383 | 130 |
| player-connlimit | Try again now | 100% | 240, 387, 418, 435 | 77.8 |
| player-panel-live | From tip-off | 100% | 646, 349, 810, 395 | 102.3 |

**Notes:**
- "−5.2" is the ring of an item on the safe line; its box and text are inside, and v1.2 allows a ring 6 px past it.
- **The thumb's ring** is a 22 dp circle that the RING check can't sample (its corner skip covers the whole circle), so
  its 100% proves nothing; checked by eye on all seven renders.
- Node counts: 11 (a card over video) to 208 (the guide), under the 250 target.

**Couldn't verify:** anything on the real TV (section 12); the native drawing (the player mocks are HTML in dp with `Ui`
tokens, not Java views); contrast over real video; that ESPN's `wallclock` lines up with the broadcast within
`replayDelay`; the engineering requirements of 6.4 to 6.10, which only the app's shield script (10.11) can test.

## 12. What only the TV (and the owner's provider) can tell

1. **Does the provider keep the NBA channels?** Add to Account > Provider > Check the guide a line per kept channel
   (`NBA League Pass 4 · kept 3 days`) and `Try a replay`, which plays 10 s of the last finished programme on the first
   kept channel. If none is kept, everything still works from videos; with neither, the surfaces say so.
2. **Which link plays and seeks:** `.m3u8` (expected to seek) vs `.ts` (minute-granular, a new request per seek).
3. **A window that runs into the future** (from tip-off on a live game): does the panel accept 210 min ending after now
   and play up to the live point? If not, airglow asks again from the current position near the end of what it has.
4. **The panel's clock:** whether the table's raw `start` string lines up with the archive (3.5 case 1), and how often
   `archiveShift` is needed. A first replay of a non-game programme with a known start is the test.
5. **`has_archive` and the table's depth** on this panel.
6. **"Not ready yet":** how many minutes behind now the archive answers (panels write it in chunks).
7. **A local ring cache** (the deferred option b of M9): a `CacheDataSource` over a bounded disk cache. At the provider's
   top quality (about 8 Mbit/s) 10 minutes is about 600 MB of the TV's storage, written continuously while live TV
   plays. Measure free storage, write speed and the low-memory killer before planning it.
8. **The remote:** whether the 55OLED810 remote sends ⏯ / ⏪ / ⏩. The design never needs them.
9. **ESPN wallclock vs the picture,** and whether `replayDelay = delayFor − 20 s` is the right start.
10. **The provider's video names** for NBA replays, to tune 3.3 and the M4 rule.
11. **Connection limits** when one stream is released and the next asked for (6.5): how long the panel holds the slot.

## 13. Decisions for the owner

1. **Which source plays first:** the channel replay (quarter skips, the as-aired score, ads included; this design) or
   a full-game video when there is one.
2. **The morning-after hero** holds your unseen game up to 48 h or until the next game's window. Shorter? Longer?
3. **Back on rewound live TV:** leaves the player (as a movie; this design), or jumps to live first?
4. **Matched NBA videos in Movies** under the shield: airglow's name and art, opening the game page (this design), or
   taken out of Movies altogether.
5. **Condensed games:** offered last (this design), or not at all.
6. Still open from nba-pages: should watching from Q4 on already count as seen (this design: the buzzer)?
7. **A hidden live game you haven't started** (S8): primary `Watch live` (this design) or `From tip-off`?
8. **The words** `Kept 3 days` / `Not kept by your provider`, or the plainer `Replays for 3 days` / `No replays on this
   channel`?
