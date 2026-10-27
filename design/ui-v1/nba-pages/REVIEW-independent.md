# Independent review: NBA Team and League pages (design/ui-v1/nba-pages)

Reviewer: independent senior TV product design reviewer. Read: `SPEC.md`, all 22 mocks and their 2x PNGs (each at full
size), `pages.css`, `UI-SPEC.md` v1.2, `BRAND.md` v5.4, `CONTEXT.md`, `NEXT.md`, the live `app/tv/js/focus.js`,
`screens/nba.js`, `cards.js`, `games.js`, and the raw ESPN files (`espn/news29.json` in particular).

## Overall score: 6.8 / 10

This is a strong, well-built design. The IA idea (a section row inside the NBA tab), the team header, the schedule rail
that opens on "last two results + next game", the Leaders and Team stats layouts and the story reader all feel like a
sports app from a real studio, and the spec is detailed and honest about what it couldn't check. What keeps the score
down is the area that matters most to this owner: **the spoiler shield still leaks results in several places the spec
doesn't cover**, and some of those leaks show on the first screen of the NBA tab. There are also a few focus-engine
claims that don't hold when checked against `focus.js`, and some brand and spec mismatches. All of these can be fixed
inside the current design. None of them needs a new concept.

## Scores by area

| Area | Score | One line |
|---|---|---|
| Information architecture and navigation | 7.5 | The section row is the right call; the team chip is last (5 presses), OK on a leader goes deep into a roster, Back depth differs per section |
| Visual craft and hierarchy | 8.0 | Polished and consistent with the hub; the header and leader card are the stars; small craft bugs (divider lines, peeks, an orphan title) |
| 10-foot legibility and TV safe area | 7.5 | 14 px floor held (badges at 12 aside); table data at 15 px is at the floor for primary numbers; menu runs to y 515 |
| Tables and scrolling on a TV | 8.0 | Moves in whole rows, has a scroll bar, sticky column names and a scrolled layout; one rule conflict; standings is 11 columns wide |
| Spoiler-shield correctness | 5.0 | Careful thinking, but records on pre-game cards, opponent pages, the player sheet, a focused Reveal and the storage limits all leak or break |
| States | 7.0 | Good coverage; the ESPN-down mock contradicts the spec; playoffs are thin; long-name limits were mis-measured |
| Consistency with the app and brand | 7.0 | Fits the app well; uses the compact LIVE pill where the brand forbids it, darkens real team colours, and the hub and team page disagree on the same game |
| Buildability with the focus engine | 7.0 | Mostly native containers; "nothing extra to build" isn't true for Down into Leaders and Team stats; the virtualised fixed-slot rail needs a navHook |
| Fit to the owner | 7.5 | Grizzlies-first, real colours, ambitious, polished; let down by the shield gaps and the team chip's position |

## Top problems, ranked, with concrete fixes

### 1. Records on pre-game surfaces leak the unseen result (must fix)

`games.js:168` `hidden(g)` is false for any game whose state is `pre`, and `cards.js:60/73` hide the record only when the
card's own game is hidden. So tonight's Grizzlies vs Jazz hero and card show **"Grizzlies 3-0"** while Sunday's Kings
game is unseen. The 3-0 includes that result, and 2 visible wins plus 3-0 means the hidden game was a win. This pages'
spec makes it worse: the hero is now *always* there (it shows the next game on off days), so the leak is on the first
screen of the NBA tab (`nba-entry.png`). The same happens on Home's Tonight row, the pre-game game page header and the
Jazz page's "vs Grizzlies" context. SPEC 8 only fixes the team page header.
**Fix:** one shared rule in `games.js`: `recordFor(team)` returns the record counted from seen finals (or nothing,
with an eye-off) whenever that team has an unseen final in scope. Every card, hero, header, leader card subtitle and
table uses it. Add this row to the SPEC 8 table and a shield variant of `nba-entry`.

### 2. In My team mode, the opponent's surfaces tell you who won (must fix)

The scope is "your team", but a result has two sides. With Grizzlies at Kings unseen:
- the pushed **Kings page** header shows `0-3`, `L3` and the Pacific rank, and its other tiles are visible, so you can
  work out the hidden one;
- the Kings' **game cards on other days** show `0-3`;
- **Standings in My team mode** only protect both conferences in All games mode. An unseen game against an East team
  (at Celtics) leaves the Celtics' row live in the East table;
- **News rule 2** covers stories "tagged with the team". A Kings-only recap ("Kings fall to 0-3") or a story tagged
  only with the event's opponent isn't covered.
**Fix:** define the scope of an unseen final as *both teams in it*. Apply the header rule (record from seen finals, no
streak or seed) to the opponent's page and records. Apply the kept-copy rule to any table that contains either team.
Extend news rule 2 to stories tagged with the opponent and published after tip-off (say within 72 h).

### 3. "Reveal results" is focused by default (must fix)

SPEC 8 says the Standings cover card has "`Reveal results` focused", and `standings-shield.png` shows the ring on
Reveal results. UI-SPEC AC-B1 says a reveal is "a Reveal button you have to move to; **never a plain OK**". And this
button doesn't reveal one game: it "marks every final in scope up to now as seen". One habitual OK after entering
Standings undoes the shield for everything. In All games mode that is the whole league.
**Fix:** focus `Show the East` (or the first table row) on the cover card. Put Reveal second. Make it name the game
(`Reveal Grizzlies at Kings`), and confirm when it would reveal more than one game ("Reveal 6 results?"). Re-render
`standings-shield.png` with the focus on the table.

### 4. The player sheet, roster sort and leaders hooks aren't shielded (must fix)

SPEC 8 hides PTS, FG% and 3P% in the roster table, but leaves the rest open:
- **The player sheet** (7.6) under the shield isn't covered at all. It shows `34.7 PTS`, `56.3 FG%`, and its one
  button reads `☆ 1st in the NBA in points`.
- **The roster sorts by points** by default. With PTS hidden, the order still shows who scored most, and the order
  changes after the hidden game.
- **The hold-OK item `In the league leaders`** appears "only if he is top 10", which gives the same information away.
- **Ranks and roster hide**, while Standings, Leaders and Team stats show a kept copy. That's two different behaviours
  for the same idea.
**Fix:** under the shield:
- the sheet shows MIN, REB and AST only, like the player's hidden game panel, with no leaders button;
- the roster sorts by jersey number and the Sort pill says so;
- the leaders menu item is dropped;
- the season ranks use the same kept team-stats copy, labelled "As of before Grizzlies at Kings", instead of `Hidden`.

### 5. Seen storage and kept copies fail in normal use (must fix)

These are three separate failures:
- **The 300-id cap** fails in All games mode. `Reveal results` marks every final in scope as seen, which is over 300 by
  December, so old ids get evicted and old games become unseen again. "Earliest unseen tip-off" then jumps back to
  October, and Standings is covered for good.
- **"Shield copies: one per fetch, newest 10"** keeps only about 100 minutes of fetches at the 10-minute refresh. After
  that much browsing after the game, every copy from before tip-off has been evicted.
- **Copies only exist if the owner opened the page before tip-off.** Games are at 01:00 to 03:00 Reykjavik time and
  are watched the next day, so often there is no copy and the page shows only a cover card.
**Fix:**
- Store a watermark ("everything before T is seen") plus ids after T, so there's no cap.
- Pin one snapshot per in-scope game: when the scoreboard (already polled) sees your team's game change from `pre` to
  `in`, fetch standings, leaders and team stats once and keep that copy, keyed by event id, until the game is seen.
- Drop "newest 10" for those pinned copies.

### 6. A covered story's reader is undefined, and story bodies are never checked (should fix)

The covered preview says "OK opens it with the result hidden", but SPEC 6 doesn't say what the reader shows.
Separately, SPEC 8 says "the 30-player round-up stays", yet that story (`news29.json`, published 26 Oct 17:56Z, tagged
with 30 teams including MEM) meets rule 2: tagged with the team and published after tip-off. So there's an unstated
round-up exception, and nothing checks its *body*, which may well mention "Jerome's 31 on Sunday". The All-games score
regex `\b\d{2,3}[-–]\d{2,3}\b` misses records (`3-0`), "4th straight win", "won by 11" and "31 points".
**Fix:**
- OK on a covered story opens a cover card with a `Reveal Grizzlies at Kings` button you have to move to.
- Write the round-up exception down.
- In both shield modes, scan the fetched body before showing it. Replace any paragraph that names the team, its
  players or the opponent, or that contains a record or score pattern (`\b\d{1,3}[-–]\d{1,3}\b`, or
  `(win|loss|beat|fell|straight)` near a name), with `· a result is hidden here ·`.

### 7. Down from the section row doesn't land where the spec says (should fix)

SPEC 2.2 says this works "with nothing extra to build". But `focus.js neighbour()` scores containers as
`gap + ortho * 4`:
- From the **Leaders** chip (x 252 to 357), the leader card (x 272 to 912, overlap 0) beats the category column (ends
  at 248). Down lands on the card, not on the selected category.
- From the **Team stats** chip, the ranked list beats the column, so Down lands on a list row.
- **Up from the Standings body** goes to the conference chips first, then to the section row. That's three Ups to the
  top bar, not two as written.
**Fix:** give the section row a `navHook('down')` that focuses `screen._entry()` for the current section. Fix the Up
wording. Add a `drive.js` check per section.

### 8. The IA wastes presses on the owner's main destination (should fix)

- **The Grizzlies chip is last:** 5 Rights from Games. For this owner it is the most-used page after Games. Order the
  row `Games · [crest] Grizzlies · Standings · Leaders · Team stats · News`.
- **OK on a leader** opens his team page "with focus on his roster row". That's the bottom section of a long page, in
  its scrolled layout. It loses context, and the thing you picked (the player) needs a hold OK. OK should open the
  player sheet over Leaders, with a `<Team> page` button in it.
- **OK on a game page team tab** now navigates away. People press OK on tabs out of habit. Use a `Grizzlies page`
  button in the box-score body (or the tab's hold-OK menu) instead.
- **Back depth differs per section:** Standings goes row → conference chips? → section chip; Team stats goes list →
  category → chip; elsewhere content → chip. Use one rule: Back from content goes to the section chip, and that's it.
- **The day chips under the hero** control the grid below them, while the hero above "always shows your next game".
  Say plainly that the hero ignores the selected day, or the cause and effect reads backwards.
- **Section chips switch "on focus if cached, else on OK".** The same chip behaves differently on different days.
  Pick one: always switch on focus and show the skeleton, or always switch on OK.

### 9. Brand and spec mismatches (should fix)

- **`a-live compact` (19 px, 12 px text)** is used in standings rows and the legend. BRAND v5.4 decision 4 allows the
  compact pill "only inside guide cells and the top-bar NBA tab; everywhere else the pill is 22 px". A 32 px row fits
  the 22 px pill.
- **Team colours are darkened** (Memphis `#4E6799`, Thunder `#006FB0`). The owner's rule is the teams' real colours.
  The Grizzlies' own navy `#12173F` is a real official colour with chalk text: use that, or keep `#5D76A9` with ink
  text.
- **The hub and the team page disagree at the same moment (23:40, tip-off 01:00).** The hub hero says `Watch pre-game`
  plus `Box score`, and the team page says `Remind me` plus `Game page` (`nba-entry.png` vs `team-top.png`). Use one
  state table (SPEC 7.1) for both heroes, and one label for the same destination.
- **`state-down.png` shows a LIVE pill** on the Timberwolves, but SPEC 3 and 9 say "no LIVE pills" when ESPN is down.
  It also shows `Try again` focused, while SPEC 9 says it is "reachable, not taken".
- **Dwell times differ:** 250 ms for section chips, 150 ms for categories, and the contact-sheet caption for Leaders
  says 250. The CSS header comment points to "SPEC 2.4" for selectors that are in 2.5.

### 10. Long names and craft details (should fix / nits)

- **The leader card's name box is 252 px, not the 280 the spec states** (measured: `.tx` runs from left 236 to right
  150 on a 640 card). `Shai Gilgeous-Alexander` (275 px) and `Giannis Antetokounmpo` (267 px) ellipsize, and they're
  exactly the players who lead categories. `Victor Wembanyama` is exactly 252. Fix: 20 px when the name is over
  240 px, or let it take 2 lines, since the card has the height.
- **The team header's next-game line truncates in the mock itself:** `01:00 vs Griz…` (`team-other.png`). `vs
  Timberwolves` and `at Trail Blazers` will always truncate. Fix: put the time on the label line (`NEXT · TONIGHT
  01:00`) and give the opponent the full line.
- **Divider lines** still draw next to the highlighted and focused rows: measured `#3C3452` at y 322 under the
  Grizzlies row in `standings-top` and `standings-row`. `.nb-tr.mine + .nb-tr::before` can't match because every row
  is wrapped in its own absolutely positioned div. Put the line on the wrapper, or use a class.
- **The hold-OK menu on a game card ends at y 515** (pixel-measured: border at 514 to 515), past the 513 line the spec
  says nothing crosses. The audit exempted floating menus. Open it upward when it would cross.
- **`team-top.png` ends with a lone "Season ranks" heading** at y 480 to 505 with nothing under it. It reads as a
  layout bug. Peek the top 20 px of the rank tiles, or drop the heading until you scroll.
- **Peeking tiles at x 936 and 908 show sliced text** (`S…`, `Fr`, `T-1`). UI-SPEC v1.2 fixed sliced text in Home's
  peek. Fade the peek's text, or show only the tile surface past x 912.
- **Standings has 11 columns at 15 px**, and `text-3` (`#C8C4D8`) is barely different from `text-2` (`#D2CEE2`), so
  the dimmed GB, HOME and ROAD columns don't actually recede. Consider W, L and PCT at 16 to 17 px, HOME and ROAD at a
  lighter weight, or dropping HOME and ROAD for a `Last 10 / Streak` focus.
- **The news list isn't in time order** (1 h, 1 h, 22 min, 5 h…). Sort by `published`.
- **The rule that keeps one row of margin** conflicts with "switch layout only on a row the top layout can't show":
  focusing row 9 in Standings leaves no row below it. Say which rule wins (the margin rule should).

### 11. Playoffs and "seen" semantics (should fix before the playoffs)

- **In the playoffs the schedule itself is a spoiler.** "If necessary" games appear and disappear, a Game 7 exists
  only at 3-3, and after an elimination the header's "Next" and the hub hero lose their game. Under the shield, show
  games up to 7 as `Game 5 · if needed` until the series is seen, and keep the hero on the last game.
- **"Watched = seen" is now permanent.** With catch-up next (NEXT.md 1, "Watch from tip-off"), tuning in for a minute
  at Q1, or opening a replay, would mark the game seen for good. Mark it permanently seen only when playback reaches
  the final, or on an explicit reveal. A short tune-in stays session-only, as today.

## Must-fix, should-fix, nits

**Must fix (before build):**
1. Records from seen finals on every surface, including pre-game heroes and cards (#1)
2. An unseen final's scope is both teams: opponent pages, records, tables and opponent-tagged news (#2)
3. Reveal is never the default focus, and it names or confirms what it reveals (#3)
4. Shield rules for the player sheet, roster sort, leaders menu and ranks (#4)
5. Seen watermark, plus one pinned snapshot per in-scope game at tip-off (#5)

**Should fix:**
- A defined covered-story reader, body scanning, and a broader score and record pattern (#6)
- Section-row Down entry via a navHook (#7)
- Chip order, OK on leaders, OK on game tabs, one Back rule, the day-chip and hero relationship, one switching rule (#8)
- The 22 px LIVE pill, real team colours, one hero state table, the state-down mock (#9)
- The leader name width and the next-game line (#10, first two)
- Playoff schedule and permanent-seen semantics (#11)

**Nits:**
- divider lines next to highlighted and focused rows;
- the menu crossing y 513;
- the orphan "Season ranks" heading;
- sliced peek text;
- standings column hierarchy;
- news sort order;
- the rule conflict at row 9;
- the dwell-time numbers and the SPEC 2.4/2.5 reference;
- the `Sat 31 Oct / Sun 00:00` night-rule tile could read more simply as `SAT 31 OCT · late` with `00:00`, for a
  sleepy viewer;
- `ESPN · 22:51` and `showing 22:51` say the same thing twice.

## What is good

- **The IA.** Every list is one press from the section row, Up always gets you out, and other teams' pages are pushed
  with Back returning to the opener (by `data-key`). It respects the top bar's 7-tab limit and is well argued in the
  spec.
- **The team header.** The plate bleeds off the card, the record is in Barlow, the seed and streak are spelled out, and
  next-game, channel and buttons sit in one card. It's the best screen in the set and feels like a broadcast graphic.
- **The schedule rail.** It opens with the next game in slot 3 and the last two results to its left, which answers
  "how did we do, and when's the next one" with zero presses. CH+/CH− jump a month. W/L is carried by the letter, never
  by red or green.
- **Leaders.** The #1 player gets a hero card on his team plate with the headshot standing on the edge. Your team's
  players are marked with the team bar. Ties show `T-` ranks.
- **Team stats.** The category column doubles as a "how are we doing" summary (your rank in each), and the list opens
  centred on your team.
- **Tables.** The inset ring is pixel-checked (3 px white at y 290 to 293 and 319 to 322 on the Grizzlies row), rows
  scroll whole, nothing is drawn below y 513, there's a scroll bar inside the safe line, and the scrolled layout keeps
  a context line.
- **News.** List plus preview adds no extra stops. The reader is a proper long-read sheet (about 70 characters a line,
  17/27 chalk, an opaque footer, no text under it). It never uses ESPN's "stitcher" score graphic, and it filters out
  WNBA and video stories. The data check is real: 4 of 25 stories are fantasy or betting, raised as a decision for the
  owner.
- **The shield's ambition.** Treating records, streaks, seeds, averages and headlines as spoilers, and keeping a copy
  of the standings from before the game instead of blanking them, is exactly right. The fixes above complete it rather
  than replace it.
- **The spec.** ESPN paths and fields, a refresh table, a port checklist, an adapted audit with a pixel ring check, and
  honest "couldn't verify" notes.

## What I measured, and what I couldn't verify

**Measured:**
- **Rings:** inset rings on `standings-row`, `team-roster` and `leaders-row`, by pixel column scans of the 2x PNGs
  (3 px white, inside the row).
- **Hold-OK menu:** its bottom edge at y 514 to 515.
- **Divider:** the line under the highlighted row at y 322.
- **Text in every mock**, with Playwright:
  - The smallest text is 14 px except the 12 px LIVE and STORY badges, which are allowed.
  - Text past the safe lines: only in the right-edge rail peeks; the hub card's `NBA League Pass` ends at x 913 (in the
    existing hub); and the reader's off-viewport paragraphs, which are clipped.
- **Leader name box:** 252 px, with the overflow widths of four long names.
- **Code:** the `focus.js` neighbour scoring for Down from the Leaders and Team stats chips (worked through from the
  code; not run in the app). The shield code paths in `games.js` and `cards.js` behind problem 1.
- **ESPN news tags:** `news29.json`. The round-up is tagged with 30 teams including MEM. The Jazz preview's event tag is
  tonight's game, so only rule 2 covers it.

**Couldn't verify:**
- how it looks on the real OLED (ring bloom, the team plate colours, 15 px table text from the sofa);
- the frame rate of table and rail scrolling on the TV's chip;
- whether ESPN's `byathlete` leaders endpoint works per category as described;
- story HTML beyond the two fetched stories;
- I did not run `tools/audit.js` myself, or drive the mocks with the remote.
