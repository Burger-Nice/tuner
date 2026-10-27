# airglow TV: the NBA Team and League pages

Design spec for the engineer. It extends `design/ui-v1/UI-SPEC.md` v1.2 (layout system, type, focus, Sharp/Soft split,
team-colour safeguards, spoiler shield), and everything not said here follows that spec. The mocks are real HTML at the
960 x 540 canvas. They link the app's own `app/tv/brand/tokens.css`, `ui.css` and `app.css`, plus `pages.css` (the new
classes, all prefixed `nb-`, written so they can be appended to `app/tv/app.css`). The data is real ESPN data fetched on
Mon 26 Oct 2026 at 23:37, shown as the owner's TV would show it at 23:40 Reykjavik time (UTC all year).

| File | What it is |
|---|---|
| `SPEC.md` | this |
| `*.html` (22) | the mocks; `png/*.png` are their 2x renders, `png/contact-sheet.png` shows all of them |
| `pages.css` | the new CSS (tables, category column, leader card, news list and reader, team header, schedule and rank tiles, player sheet) |
| `data.json` | the ESPN fields the pages use, extracted from the raw responses; `img/` holds logos, headshots and news photos at 2x display size |
| `tools/extract.js` | raw ESPN JSON to `data.json` + `img/` (`node tools/extract.js <espn-dir> <espn2-dir>`) |
| `tools/build.js` | `data.json` to the mocks; `tools/render.js` makes the PNGs and the contact sheet; `tools/audit.js` is the self-check (section 13) |

---

## 1. Where the pages live (the IA decision)

**The NBA tab gets a section row:** `Games · Standings · Leaders · Team stats · News · [crest] Grizzlies`.

- It sits at **y 80 to 120**, where the hub's "NBA" title and day chips are now. The title goes because the top bar already says NBA.
- The League page is four sections (Standings, Leaders, Team stats, News), not one long page. Each is a single screen
  with one job, and each is one press from the row.
- The last chip is **your team** (the crest plus its nickname). Its section *is* your team page.
- **Games** is the hub you have now. It is the default on a cold start, because watching games is what the tab is for.
  The app remembers the last section until it closes. Re-entering the tab from the top bar opens that section.
- **Any other team's page is a screen pushed on top** (`push('team', { abbr })`), with the same layout. Back returns to
  the row, card or story that opened it. You reach it from:

| From | How |
|---|---|
| Standings row | OK |
| Team stats row | OK |
| Leaders row or the leader card | OK opens the player's team, with focus on his roster row (the player sheet is hold OK) |
| Game card (hub grid, Home's Tonight row) | **hold OK** opens a menu: `<Away> page` (focused), `<Home> page`, `Remind me` (before tip-off only), `Open the game` (`nba-card-menu.png`) |
| Game page | **OK on a team's box-score tab** (the tab is already selected by focus, so OK used to do nothing). The tab row's caption reads `OK Team page · ▼ scroll` while a team tab is focused |
| Team page schedule tile | hold OK opens a menu: `<Opponent> page`, `Open the game`, `Remind me` |
| News story | the reader's buttons at the end of the story: one `<Team> page` button per tagged team, up to 2 |
| Pushed team page | `All teams` opens the team picker: 30 crests in a 6-column grid, by conference, your team first |

**Why not one long League page:** standings alone are 30 rows. Leaders, ranks and news below them would sit 30+ presses
down. A section row puts every list one press from the top, and Up always gets you out.

**Why not a separate tab in the top bar:** the bar already has 7 destinations (Android TV's guidance is 3 to 7). The
pages are NBA, so they belong under NBA.

**No team set (team "None"):** the last chip reads `Teams` and opens the team picker. Picking a team pushes its page,
and that page offers `Make the <team> my team`.

### 1.1 The Games section (the one change to the existing hub)

- The section row costs 44 px, so the **day chips move from above the hero to under it**. They sit at y 332 to 368.
- The hero keeps its 192 px at **y 128** (where it is today).
- The grid moves from y 368 to **380**. The first row's card bottom is at 504, and its scaled ring reaches 512, inside 513 (`nba-entry.png`).
- The "Tonight · n games" title is dropped. The selected chip already says `Today · Mon 26 Oct`, and the counts move to the right end of the day row.
- **The hero is always there when you have a team**, so the day row never jumps when you change day. On a day your
  team doesn't play, the hero shows your team's *next* game (pre-game state with Remind me). With team "None" there's no
  hero, and the day row sits at y 128 for good.
- Focus moves **Up from the grid** to the day row, then to the hero buttons, then to the section row, then to the top bar. Entry focus is still the hero's primary button.

---

## 2. Rules every new screen follows

### 2.1 Geometry

| What | Value |
|---|---|
| Section row | `.nb-sec` at x 48, y 80, h 40. Chips `.chip.lg` (36 high, 8 gap). Right end: `ESPN · 23:37` (when the data was fetched), or `Shield: My team` with the eye-off glyph when the shield is on |
| Content top | **y 128** on every section, and on the pushed team page (which uses y 80 to 120 for its tools row, section 7.7) |
| Sub-row (Standings' conference chips) | y 128 to 164 |
| Table header | `.nb-th`, 24 high, Inter 650 14 caps +0.06em, `text-3`, opaque `bg-0` |
| Table rows | `.nb-tr`, **32 high**, Inter 500 15 (numbers tabular). Leaders and Team stats rows are 30. A 1 px `--a-border` line between rows (inset 12 px); no line next to a highlighted or focused row |
| Table width | x 48 to 900 (852). The **scroll bar** sits at x 906 to 910 (4 px, `surface-2` track, `text-3` thumb), inside the safe line |
| Category column (Leaders, Team stats) | `.nb-cats` at x 48, w 200, rows 34 high with a 4 gap (10 rows fit y 128 to 504) |
| Right panel next to the column | x 272 to 912 |
| Nothing is drawn below y 513 | Long tables draw **whole rows only**. A row that doesn't fit isn't drawn; the scroll bar says there is more (`standings-top.png` shows rows 1 to 9 ending at y 510) |

### 2.2 Focus and keys (all on `focus.js` as it is)

- **Containers:**
  - the section row and every chip row: `[data-row]`
  - category columns, table bodies and the news list: `[data-col]`
  - schedule, rank and news rails: `[data-row]` (they slide)
  - the team picker: `[data-grid][data-cols="6"]`
- **Up from the first row of any section goes to the section row, and Up again to the top bar.** That's the engine's
  nearest-container rule, with nothing extra to build. **Down from the section row** goes to the section's entry
  (named per screen below).
- **Rings:**
  - Table rows (32 or 30 px, no gap) use the **inset ring** (`.f-in`: 3 px white inside the row, `surface-3` fill, no
    scale). That is the approved dense variant (UI-SPEC 3.2): a ring that is inside the row can't be clipped by the
    table's viewport or overlap the next row.
  - Everything else uses the outer ring: chips, category rows, news rows and pills get the ring only; buttons, schedule
    tiles, rank tiles and news cards get the ring plus the 1.05 lift.
  - A lifted item in the first column grows to the right (`transform-origin: 0 50%`), as in the Home rails.
- **Scrolling a table:**
  - The body moves in whole rows, 320 ms, 0 ms while a key repeats.
  - The focused row always keeps **one whole row** (and so at least 14 px) between itself and the viewport edge
    whenever there is more in that direction. This is the same rule as `ui.js scrollList`.
  - Moving into a row that the top layout can't show switches the screen to its **scrolled layout**:
    - the top bar and section row slide away (as Movies does);
    - the context line `NBA · Standings · Western Conference · 2026-27` shows at y 27 (`.nb-ctx`) over the 84 px cover band (`.nb-cover`);
    - the column names move to y 52, and the body runs from y 80 to 513 (`standings-scrolled.png`).
  - Going Up past the first body row restores the top layout.
- **Back:**
  - Anywhere in a section's content, Back scrolls to the top and focuses that section's chip.
  - Back on a section chip focuses the top bar's NBA tab (the global rule).
  - On a pushed team page, Back returns to the opener (focus restored by `data-key`).
  - A sheet closes with Back.
- **Identity keys for `setHtml` focus restore:**
  - `data-key="tm:<ABBR>"` on standings, team-stats and team-picker rows
  - `pl:<id>` on leader and roster rows
  - `g:<id>` on schedule tiles (already used by game cards)
  - `n:<id>` on stories
  - Live data never moves focus.
- **Section chips switch on focus** after a 250 ms dwell, if the section is cached. Otherwise they switch on OK, the
  top bar's rule. **Category rows** (Leaders, Team stats) switch the right panel on focus after 150 ms, like the game
  page's tabs.

### 2.3 Text, numbers and time

- **Type:** nothing is below 14 px except badges. All figures are tabular. Big Sharp numbers (Barlow italic 800) are
  used only for a record, a leader's value, a rank ordinal or a jersey number: three words or a number, as the brand rule allows.
- **Team names:**
  - Tables use `team.displayName` ("Minnesota Timberwolves").
  - Tiles, cards and the header use `shortDisplayName` ("Timberwolves").
  - A name that doesn't fit ends in an ellipsis on a block span, never on the flex row (UI-SPEC v1.1 rule).
  - The team header splits the name: location as a 14 px caps eyebrow, nickname 30 px. "PORTLAND / Trail Blazers" and "MINNESOTA / Timberwolves" fit without shrinking.
- **Number formats:**
  - Win percentages are ESPN's displayValue (`.750`, `1.000`).
  - Games behind: `–` for the leader, else ESPN's value (`0.5`).
  - Averages have 1 decimal place; percentages have 1 decimal place and no % sign in tables (the column name says %).
  - Ties in ranks show as `T-2nd`.
  - Streaks are ESPN's (`W3`).
  - A player who hasn't played shows `–` in every average and `Hasn't played` after his name. Players are sorted to the bottom, by name.
- **Night rule** (new, for a European viewer):
  - A tip-off between 00:00 and 06:00 local belongs to the evening before.
  - Tonight's 01:00 game is `Tonight · 01:00`.
  - A later one is dated by its evening, with the true day on the time: `THU 29 OCT` above `Fri 02:00`.
  - Date = local date of (tip-off − 6 h).
  - Times are 24-hour local (`hm()`).
- **Relative times:** `In 1 h 20 min` before tip-off. News ages: `22 min ago`, `5 h ago`, `Yesterday`, then the date.

### 2.4 Team colour (UI-SPEC 3.4, owner decision: the teams' real colours)

- **Plates** use the team's primary from `teamPalette()`, darkened where needed (Memphis `#4E6799`, Thunder `#006FB0`),
  with a 4 px bar in the secondary.
  - Plates appear on the team header, the leader card behind the headshot, and the player sheet.
  - Text on a plate is chalk or ink, whichever passes 4.5:1.
- **The 4 px team bar** in the secondary (`.tedge`) marks your team's rows in standings, leaders and team stats. Your
  team's row also gets a `surface-1` fill and a bold name.
- **The safeguards hold:**
  - No team colour within 8 px of a LIVE pill. In standings the pill sits after the name, ≥ 200 px from the bar.
  - No team colour touches a ring, except a row's own bar inside its own inset ring.
  - LIVE is always the dot plus the word.
  - No team colour on buttons, rings or selected states.
- **Crests** are the ESPN logo in the neutral disc: 24 in tables, 28/32 on tiles, 64 in the header. Sizes `.team.s24/.s28/.s32` are new.

### 2.5 Port notes

- The mocks mark focus with `.f` / `.f-ring` / `.f-in`. The app uses `:focus` on `.fx`, so add these to app.css:
  - ring only: `.nb-cat.fx:focus, .nb-nrow.fx:focus, .nb-sec .chip.fx:focus`
  - ring plus lift: `.nb-gt.fx:focus, .nb-rk.fx:focus, .nb-nc.fx:focus`
  - inset ring: `.nb-tr.fx:focus` (with `background: var(--a-surface-3)`)
  - first-in-rail lift origin: `.nb-rail .fx:first-child:focus { transform-origin: 0 50% }`
- `.nb-lead` (the 640 px leader card) gets the ring only, no lift.
- Hold OK uses the existing `data-hold` and `contextMenu()`.

---

## 3. Standings (`standings-top`, `standings-row`, `standings-scrolled`, `standings-shield`, `state-down`)

**Layout (top):**
- **y 128:** chips `West` / `East`. Your team's conference is first and selected. Right end: the legend
  `1 to 6 make the playoffs · 7 to 10 play in · [LIVE] playing now` (14 px `text-3`).
- **y 168 to 192:** column names: `#` · crest · `TEAM` · `W` · `L` · `PCT` · `GB` · `STRK` · `L10` · `HOME` · `ROAD`.
- **y 194 to 513:** the body (`.nb-tb`).
- **Column widths:** seed 24 (right, 650 `text-3`); crest 24 (margins 14 / 12); name flex (about 290); W 44 (bold); L 44;
  PCT 64; GB 52 (`text-3`); STRK 60; L10 60; HOME 68 (`text-3`); ROAD 68 (`text-3`).
- **Play-in lines:**
  - Between seeds 6 and 7 a 28 px band (`.nb-band`) reads `PLAY-IN TOURNAMENT · 7 TO 10` with a dashed `border-strong` line.
  - Between 10 and 11 another band reads `OUTSIDE THE PLAY-IN`.
  - Bands are not focusable; focus steps over them.
- **First screen:** rows 1 to 9 and the play-in band, ending at y 510.
- **Scrolled layout:**
  - context line at y 27, column names at y 52, body from y 80 to 513: 13 rows plus bands.
  - The last row (15th) sits at y 456 to 488, with its inset ring fully inside (`standings-scrolled.png`).
- **Playing now:** a compact LIVE pill after the team's name (from the scoreboard: teams in a game with state `in`).
  It shows no score, so it is safe under the shield.
- **Order:** ESPN's `playoffSeed`, then PCT. ESPN can give two teams the same seed (BOS and CLE are both 8 in the East
  today): show it as given, in that order.

**Focus and keys:**

| Element | Entry | ◀▶ | OK | Hold OK | Back |
|---|---|---|---|---|---|
| Conference chips | Down from the section row lands on the selected chip | move; focus switches the table (150 ms) | select | – | section chip |
| Row | Down from the chips: your team's row if it is on screen, else row 1 | nothing (the row edge stops) | that team's page | menu: `<Team> page`, `Make the <team> my team` | scroll to top, chips |

**States:**
- **Loading** (nothing cached): flat `surface-1` blocks in the row shape; focus stays on the section chip.
- **ESPN down** with a copy (`state-down.png`): the copy stays, with no LIVE pills. The legend is replaced by
  `ESPN isn't answering · showing 22:51` plus a focusable `Try again` pill. The section-row time shows the copy's time.
  It retries by itself every 60 s.
- **ESPN down, nothing cached:** the existing state card (`wifiOff`, `Scores aren't reachable`, ESPN's error), with a
  `Try again` button focused.
- **Preseason** (no games played): every row shows 0-0, ordered alphabetically, with no seeds. The legend reads
  `Season starts Tue 20 Oct`.
- **Off-season:** last season's final table, titled `2025-26 final standings` in the legend. Seeds 1 to 6 get a small
  `Playoffs` caption after the name. Once the bracket exists, a `Playoffs` chip (seeded pairs, series results) can be
  added after East; it isn't designed here.
- **Shield:** section 8.

## 4. Leaders (`leaders`, `leaders-row`)

**Layout:**
- **Category column** at x 48, y 128: `Points PTS`, `Rebounds REB`, `Assists AST`, `Steals STL`, `Blocks BLK`,
  `3-pointers 3PM`, `Field goal % FG%`.
  - The selected category is `surface-2` with a pink dot, chalk text and `pink-text` abbreviation.
  - Below the column, from y 428: `Per game, 2026-27. ESPN's qualified players.`
- **Leader card** `.nb-lead` at x 272, y 128, 640 x 96, radius 16, `surface-1`:
  - the #1 player's team plate: a 210 px skewed parallelogram in the primary with a 4 px secondary edge;
  - his ESPN headshot, 126 x 92, standing on the card's bottom edge, and the team crest (32) top-left;
  - text from x +236: `1ST IN THE NBA` (14 caps `pink-text`), the name (Outfit 700 24), `Memphis Grizzlies · Guard` (14 `text-2`);
  - at the right, the value in Barlow 56 (`34.7`) and `PTS PER GAME`.
- **Rows 2 to 10** at x 272, y 236, 30 high: rank (ties repeat the rank) · crest 24 · name · team nickname (`text-3`,
  150) · value (16 700, right).
  - All 9 fit (to y 506), so there is no scroll.
  - Your team's players get the team bar, `surface-1` and a bold name (Boozer, 4th in rebounds, `leaders-row.png`).

**Focus and keys:**
- **Entry:** the selected category.
- **▶** from the column goes to the leader card. **▲▼** walk the card, then rows 2 to 10. **◀** goes back to the column.
- **OK on a player:** his team page, with focus on his roster row.
- **Hold OK:** menu `Player card` (the sheet in 7.6), `<Team> page`.

**States:**
- **Loading:** column real, right side blocks.
- **Empty** (preseason): `Leaders start after the first games` in the card's place.
- **ESPN down:** cached with time, as in Standings.
- **Shield:** section 8.

## 5. Team stats (`teamstats`)

**Layout:**
- **Category column** (10 rows, 34 high): Points · Points allowed · Rebounds · Assists · Field goal % · 3-point % ·
  3-pointers made · Steals · Blocks · Turnovers.
  - Each row shows **your team's rank** at the right (`9th`, `T-2nd`, `25th`). The column alone is the "how are we
    doing" summary.
  - Lower is better for Points allowed and Turnovers.
- **Right side:**
  - column names at y 128 (`# · TEAM · <STAT> A GAME`);
  - 30 rows of 30 px from y 156, **11 visible**;
  - each row: rank · crest · full name · a 200 px bar (`surface-2` track; the fill is `border-strong`, your team's is
    the brand gradient, scaled from the worst value at 18% to the best at 100%) · value.
- **When a category is shown, the list scrolls so your team's row is in the middle** (Assists: rows 14 to 24 with the
  Grizzlies T-18th, `teamstats.png`).

**Focus and keys:**
- **Entry:** the selected category. **▶** goes to the list, on your team's row.
- **OK on a row:** that team's page.
- **Back:** to the category, then to the section chip.

## 6. News (`news`, `news-shield`, `news-article`)

**Layout: a list on the left and a preview of the focused story on the right** (the guide's Now-panel idea: the
preview is display only, so it adds no stops).
- **List** `.nb-nlist` at x 48, y 128, w 392:
  - 6 rows, 60 high, 4 gap, so the last ends at y 508;
  - each row: the headline (Inter 650 15/18, 2 lines, ellipsis), and at y +41 the meta (`Thunder · 1 h ago`; `NBA`
    when 4 or more teams are tagged);
  - focus: ring plus `surface-2`;
  - the list scrolls in whole rows with one row of margin, 25 stories.
- **Preview** `.nb-prev` at x 464, y 128, w 448:
  - photo 448 x 224 (radius 16);
  - label row at y 364 (`STORY · 1 H AGO · NBA INSIDERS`, 14 caps);
  - headline (Outfit 700 22/26, 2 lines);
  - summary (`description`, 15/21 `text-2`, 3 lines, ends by y 509);
  - updates 150 ms after focus settles.
- **No photo:**
  - previews and recaps show both teams' crests on `surface-2`, away first with `at` between them (`.nb-noph`);
  - other stories show the first tagged team's crest;
  - **never ESPN's "stitcher" graphic, which prints the final score.**
- **Filtered out:**
  - videos (`type: "Media"`): the TV can't play them;
  - WNBA stories (league category 59) that ESPN's NBA feed carries;
  - premium (`premium: true`) stories are kept but say `ESPN+` in the label, and their reader shows the summary only.

**The reader** (`news-article.png`): OK on a story opens a centred sheet.
- **Size:** x 140 to 820 (680 wide), y 27 to 513, radius 24, `bg-1`, over the scrim. The list row loses its ring while
  the sheet is up.
- **Content:**
  - photo 176 high, fading into the sheet;
  - label (`[STORY] 1 H AGO · 6 MIN READ`);
  - headline (Outfit 700 28/34);
  - byline (`NBA Insiders · ESPN`, 14 `text-3`);
  - the story in paragraphs (Inter 500 **17/27, chalk**; the first paragraph `text-2`). The text column is 600 px,
    about 70 characters a line.
- **Footer:** 44 px, opaque, `Back closes` on the left and `▼ More` on the right. The text never runs under it: the
  viewport ends at y 469 with a 40 px fade. There is a scroll bar at the right edge.
- **Keys:**
  - Focus is the text body itself (`.inner.fx`, no ring), exactly as the title page's Full description sheet;
    **▼▲ scroll 240 px** (about 9 lines, 320 ms) and hold repeats.
  - At the end, **▼ moves to the action row**: one `<Team> page` button per tagged team (up to 2; not for round-ups
    with 4 or more teams). `▼ More` becomes `▲ Back to the top`.
  - Back closes and focus returns to the story's row.
- **The text** comes from ESPN's content API (section 10). Strip it to paragraphs: drop `<script>`, `<iframe>`,
  `<figure>`, `<aside>`, any element with `class*="inline"` or `ad`, and paragraphs under 30 characters. Decode the
  entities.
- **If the full text fails**, the reader shows the `description` and `ESPN only sent the summary of this story.`
- Nothing opens a web browser.

## 7. Your team page, and any team's (`team-top`, `team-schedule`, `team-ranks`, `team-roster`, `team-player`, `team-other`, `team-shield`, `team-shield-news`, `state-loading`)

One page, top to bottom: **header**, **Schedule** (one rail), **Season ranks** (rail), **News** (rail), **Roster** (table).
The roster comes last because it is the only long part, so nothing waits behind its 18 rows.

### 7.1 Header (`.nb-head`, x 48 to 912, y 128 to 312, radius 16, `surface-1`)

| Part | Position (in the card) | Content |
|---|---|---|
| Status row | x 24, y 12, h 24 | `YOUR TEAM` (pink-text label, your team only) · `2026-27 · REGULAR SEASON` (`text-2` label). When the team is live: `[LIVE] Q2 4:12 at Jazz` here; it ends ≥ 8 px above the plate (the plate starts at y 44) |
| Plate | x 0 to 392 (bleeding off the card's left), y 44 to 116 | team plate: crest 64 at x 24, then `MEMPHIS` (14 caps) over `Grizzlies` (Outfit 700 30), text chalk or ink by `teamPalette().fg` |
| Record | x 412, y 44, h 72 | `3-0` Barlow italic 56, then `4th in the West` (Inter 650 17) over `W3 · 1st in Southwest` (14 `text-2`; ESPN's `standingSummary` minus "Division") |
| Next game | x 660 to 892, 1 px `--a-border` on its left | `NEXT · TONIGHT` (label), crest 28 + `01:00 at Jazz` (650 17, ellipsis), the best TV name (`NBA League Pass`; national networks first, then League Pass, never "DAZN", "+" or "App" feeds) |
| Buttons | x 24, y 128, h 44 (`data-row`) | primary + secondary as below; caption on the right: `Tips off in 1 h 20 min` / `Also on KJZZ-TV and Jazz+` |

**Buttons by the next game's state** (the primary is the entry focus):

| When | Primary | Secondary | Caption |
|---|---|---|---|
| More than 30 min to tip-off | `🔔 Remind me` (toggle: `✓ Reminder set`, OK again removes it, toast `Reminder removed`) | `Game page` | `Tips off in 1 h 20 min` / other channels |
| 30 min to tip-off, channel known | `▶ Watch pre-game` | `Remind me` / `Reminder set` | `On <channel>` / `Hold OK for n more channels` |
| No channel known | `Choose channel` (the existing sheet) | `Game page` | `No channel found yet` / `Your pick is remembered` |
| Live | `▶ Watch live` (hold OK lists the other feeds) | `Box score` (shield: `Reveal score`, a button you move to, never the default) | `Q2 4:12 · 48–51` (shield: `Score hidden`) |
| Final, within 12 h | `Box score` | none | `Final · W 123–112` (shield: `Ended · result hidden`) |
| Off-season | none: the button row holds `Season starts Tue 20 Oct` or `Off-season · the schedule comes out in August` | – | – |

`Remind me` uses the Reminders feature (NEXT.md item 2, which ships before these pages). Until it exists, the
secondary moves up to primary and Remind me is not drawn.

### 7.2 Schedule (title y 324, rail y 360 to 464)

- **The title** reads `Schedule  3-0 · 77 to go · ◀ results · ▶ coming up`.
- **One rail for the whole season, oldest on the left.** It opens with the **next game in the third slot** (x 492) and
  the last two results to its left, so the first screen answers "how did we do, and when's the next one"
  (`team-top.png`).
- **The focused tile stays in the third slot** while the rail can scroll, and moves to slots 1 and 2 at the start of
  the season (`team-schedule.png`: focus on at Kings, with vs Jazz and at Warriors to its left).
- **CH+ / CH−** jump a month. 82 games, virtualised: 8 tiles mounted.
- **Tile** `.nb-gt` 198 x 104, radius 16, `surface-1`, 24 gap:
  - date label (`FRI 23 OCT`, 14 caps `text-3`; the next game reads `TONIGHT` in pink-text and `NEXT`);
  - crest 32 and `at Warriors` / `vs Jazz` (650 16);
  - a result row: `W 111–108` (both chalk 700/650) or `L 123–132` (`text-2`; the letter carries the meaning, never
    green or red), or `01:00 · League Pass` / `Fri 02:00 · League Pass`, or `[LIVE] Q3 7:29`;
  - the next game's tile is `surface-2`.
- **OK on a tile:** the game page (finals, live) or the pre-game page.
- **Hold OK:** menu `<Opponent> page`, `Open the game`, `Remind me` (upcoming), and **`Reveal result`** on a hidden final.

### 7.3 Season ranks (title y 480; on scroll, y 52 with tiles at y 92)

- **9 tiles** `.nb-rk`, 156 x 84, 16 gap: the stat name (14 `text-3`), the ordinal in Barlow italic 32 (`T-2nd`), and
  `52.0 a game` / `38.1%`.
- **Order:** Points, Points allowed, Rebounds, 3-point %, Blocks, Assists, Field goal %, Steals, Turnovers.
- **OK:** the Team stats section with that category selected and the list on this team's row.

### 7.4 News (y 196 when scrolled)

- **Rail of cards** `.nb-nc`, 272 x 153 (16:9): the photo (or the crest fallback), a bottom scrim, the headline (650 15/19,
  2 lines) and `Recap · 19 h ago`.
- This is ESPN's team feed (`news?team=<id>`), with videos and WNBA dropped.
- OK opens the reader.

### 7.5 Roster (`team-roster.png`)

- **Title** `Roster  Season averages · sorted by points`, with a `⇅ Sort Points` pill at its right. The pill opens a
  radio menu: Points, Rebounds, Assists, Minutes, Jersey number, Name.
- **Columns:** `#` (jersey, 36) · `PLAYER` (name 650 16, position `text-3`, an injury note `⊞ Day-to-day` /
  `⊞ Out` in `text-2` with the cross glyph, never red, and `Hasn't played`) · `GP` 44 · `MIN` · `PTS` (bold) · `REB` ·
  `AST` · `FG%` · `3P%` (58 each).
- **Rows** are 32 px with the inset ring.
- **Scrolled layout:** context line `NBA · Grizzlies · Roster · 18 players` at y 27, title at y 52, column names at y 92,
  body from y 120 with **12 rows**. Prosper, 17th of 18, is focused with one row below him.
- **Sorting:** players with games by the chosen stat, then players who haven't played, by name.
- **OK on a row:** the player sheet. **Hold OK:** `Player card`, `In the league leaders` (only if he is top 10 in a
  category).

### 7.6 Player sheet (`team-player.png`)

The right sheet (420, x 492 to 912).
- **Top:** a 112 px band with his team plate, his headshot (154 x 112) and, right of the plate, `#2` in Barlow 56 over
  crest 28 and `Grizzlies`.
- **Then:** the name (title 22), `Guard · 6' 5" · 29 years · 9th season`, `2026-27 · 3 GAMES`, and a 3 x 2 grid of
  averages (Barlow 28 values over 14 caps labels: PTS, REB, AST / MIN, FG%, 3P%).
- **Facts:** College, From.
- **Status:** the injury, if any (`Day-to-day · 26 Oct`).
- **Its one button** (focused) appears when he's in a top 10: `☆ 1st in the NBA in points` opens Leaders on that
  category with his row focused.
- **Without a button**, focus is the sheet body (no ring), as in the Full description sheet.
- Back closes.

### 7.7 Another team's page (`team-other.png`)

The same page, pushed.
- **y 80 to 120** is a tools row: `☆ Make the Jazz my team` (asks to confirm, then becomes Account > NBA > Your team),
  `All teams` (the team picker), and the caption `Opened from Standings · Back returns there`.
- **No `YOUR TEAM` label.** The header in Utah's colours (`#002B5C` navy, `#F9A01B` bar) reads `1-2`,
  `11th in the West`, `L1 · 5th in Northwest`, `NEXT · TONIGHT 01:00 vs Grizzlies`.
- **Entry focus:** the header's primary button. Up goes to the tools row, then to the top bar.

### 7.8 Scrolling the team page

- The header and the schedule are the first screen.
- **Down from the schedule** slides the page so the focused section's title sits at **y 52**, under the context line
  (`team-ranks.png`). The bar and section row step away; the 84 px cover band fades the content under it.
- **Up from the first rail below the header** restores the top. Up from the header buttons goes to the section row.

## 8. The spoiler shield on these pages

The shield exists so that you can watch a game later without knowing the result. On these pages the problem is bigger
than a score: a 3-0 record, a W3 streak, a 34.7 scoring average, a seed, a news headline ("aim for 4th straight win")
all tell you who won. So the rule is about **results you haven't seen**, not just scores.

**Seen, and the one change it needs (owner decision, section 14):**
- Today a reveal lasts the session, and every shielded final is hidden again at the next launch.
- For season pages that would hide everything forever. So **a game you watched or revealed stays seen**: its id is
  stored in settings, capped at 300.
- An **unseen final** is a final (or live game) in the shield's scope that isn't seen.
- Turning the shield on still clears the seen list (the existing `setShield` behaviour).
- `Reveal results` marks every final in scope up to now as seen.

**Per surface, when a team in scope has an unseen final (mode `My team`: your team; mode `All games`: every team):**

| Surface | Under the shield |
|---|---|
| Team header | record counted from **seen** finals only (`2-0`); `1 result hidden` / `Kings game unseen`; no seed, no streak (`team-shield.png`) |
| Schedule tile of an unseen final | `👁̸ Result hidden`; no W/L. OK opens the game page, which shows its existing Reveal card. Hold OK offers `Reveal result` |
| Season ranks | each tile `Hidden` / `Reveal to see` |
| Roster | MIN, REB and AST stay (as in the player's hidden game panel); **PTS, FG% and 3P% show the eye-off glyph**, because they add up to the score |
| Standings | **the copy airglow kept from before the unseen game** (it saves the standings it fetches, keyed by fetch time, and uses the newest copy fetched before the earliest unseen tip-off), labelled `As of before Grizzlies at Kings · 1 result hidden · [Reveal results]` (`standings-shield.png`). With no such copy, or one older than 7 days, the conference is covered by a state card (`Standings include a result you haven't seen`, `Reveal results` focused, `Show the East` second). In `All games` mode both conferences follow this rule |
| Leaders, Team stats | the same rule: the kept copy from before, labelled, or the cover card |
| News | a story is **covered** (eye-off, no photo, headline `A Grizzlies story, hidden by the spoiler shield`, only its age; the preview says `Hidden until you reveal Grizzlies at Kings`) when any of these is true: it is tagged with the unseen game's event id; **or** it is tagged with the team (or with one of its players, by roster athlete id) and was published after the unseen game's tip-off; **or** it is a round-up tagged with 6+ teams whose headline or summary names the team or one of its players (`news-shield.png`, `team-shield-news.png`) |
| Reader, `All games` mode | paragraphs that contain a score (`\b\d{2,3}[-–]\d{2,3}\b`) are replaced by `· a result is hidden here ·` |
| Standings LIVE pills, schedule times, rosters' names, injuries | never hidden: they don't tell a result |

Tested against today's data: the Preview `Grizzlies play the Jazz, aim for 4th straight win` and its summary
`(3-0, fourth in the Western Conference)`, the Kings recap, and the two fantasy stories naming Ty Jerome are all
covered. The OKC injury story and the 30-player round-up stay.

## 9. States (every screen)

| State | What shows | Focus |
|---|---|---|
| Loading, nothing cached (`state-loading.png`) | flat `surface-1`/`surface-2` blocks in the final layout (no shimmer), section row time `Loading…` | stays on the section chip |
| Loading, cached | the copy at once; it refreshes in place (setHtml: no jump, focus kept by key) | unchanged |
| ESPN down, cached (`state-down.png`) | the copy, its time in the section row, the notice and `Try again` pill in the sub-row (Standings) or the title row (others); no LIVE pills | unchanged; `Try again` is reachable, not taken |
| ESPN down, nothing cached | state card `Scores aren't reachable` + ESPN's error + `Try again` | `Try again` |
| A part fails (roster but not schedule) | that section's title says `Couldn't load from ESPN · trying again`; the rest works | – |
| Empty: preseason | records 0-0, leaders `Leaders start after the first games`, ranks hidden, schedule opens on the opener | – |
| Empty: no news | `No ESPN stories in the last week` in the news rail's place | – |
| Long names | ellipsis on block spans; header splits location and nickname; leader card name ellipsis at 280 px; the next-game line ellipsises (`01:00 vs Grizzlies`) | – |
| Off-season | header `Off-season`, standings `2025-26 final standings`, leaders and ranks from last season labelled `2025-26`, schedule rail ends on the last game with `Schedule out in August` as an end tile | – |
| Playoffs | season-type 3 in the schedule: tiles carry `Game 3 · MEM leads 2-1` (shield: `Game 3`), header `Playoffs · First round` | – |
| Team "None" | no hero in Games; last chip `Teams` opens the picker | – |
| Shield | section 8 | – |

## 10. Data (ESPN's public JSON; paths are into the files in the brief)

Most of this is already in `app/nba.js` (commit `568759b`: `standings`, `leaders`, `teamPlayers`, `teamStats`,
`schedule`, `roster`, `news`). Additions are marked **new**.

| Need | Endpoint (`base` = site.api.espn.com/apis/site/v2/sports/basketball/nba, `web` = site.web.api.espn.com/apis) | Fields |
|---|---|---|
| Standings | `web/v2/sports/basketball/nba/standings` (`standings.json`) | `children[].name`; `children[].standings.entries[].team.{abbreviation,displayName,shortDisplayName,location}`; `entries[].stats[]` by `name`: `playoffSeed.value`, `wins.value`, `losses.value`, `winPercent.displayValue`, `gamesBehind.displayValue`, `streak.displayValue`, `"Last Ten Games".displayValue`, `Home`, `Road`; `season.displayName` |
| Team schedule | `base/teams/{id}/schedule` (`schedule29.json`) | `team.recordSummary`, **`team.standingSummary`** ("1st in Southwest Division"), `events[].id/date`, `competitions[0].competitors[].{homeAway,team.abbreviation,score.displayValue,winner}`, `competitions[0].status.type.{state,shortDetail}`, **`competitions[0].broadcasts[].media.shortName`** (each `{type, market, media}`; national first), `seasonType.type` (2 regular, 3 playoffs) |
| Roster | `base/teams/{id}/roster` (`roster29.json`) | `athletes[].{id,jersey,displayName,position.abbreviation,age,displayHeight,experience.years,college.name,birthPlace.{city,state,country},injuries[0].{status,date},headshot.href}` |
| Player averages | `base/teams/{id}/athletes/statistics` (the brief's `byteam.json` is the *league* list, ESPN ignores its team filter; the per-team one used for the mocks is `scratchpad/espn2/mem-athletes.json`) | `results[0].leaders[].athlete.{id,displayName,position.abbreviation}`; `statistics[].stats[]` by `name`: `gamesPlayed`, `avgMinutes`, `avgPoints`, `avgRebounds`, `avgAssists`, `fieldGoalPct`, `threePointFieldGoalPct` |
| League leaders | per category: `web/common/v3/sports/basketball/nba/statistics/byathlete?sort=<cat>.<stat>:desc&limit=10` (`lpts.json`; as `NBA.leaders`, **limit 10**) — `athletes[].athlete.{id,displayName,teamShortName,position,headshot.href}` + `categories[].values` against the top-level `categories[].names`. The mocks used the one-request `leaders2.json` shape: `leaders.categories[name=pointsPerGame\|reboundsPerGame\|assistsPerGame\|stealsPerGame\|blocksPerGame\|3PointsMadePerGame\|fieldGoalPercentage].leaders[].{displayValue, athlete.{id,displayName,position}, team.abbreviation}` (its 3P% category is a fraction, 1.0, unlike the others: don't use it). FG% leaders include low-volume players this early (Kessler 82.1): ESPN's qualification, labelled as such |
| Team stats | `web/common/v3/sports/basketball/nba/statistics/byteam?limit=30` (`byteamlg.json`) | names from top-level `categories[].names`; `teams[].team.abbreviation`; `teams[].categories[]` with `splitId` `"0"` (own) and `"900"` (opponent: points allowed = opponent `avgPoints`); `values[]`. **Rank in the app** (ESPN's `ranks` are mostly "-"): rank = 1 + teams strictly better; equal values share it and show `T-` (`NBA.teamStats` already does this; add opponent `avgPoints` as `opp_avgPoints` and lower-is-better for it) |
| News list | `base/news?limit=25[&team={id}]` (`news.json`, `news29.json`) | `articles[].{id,type,headline,description,published,byline,premium}`, `images[]` (`type` `header` first; skip `stitcher`), `categories[]`: `type` `league` (**`leagueId` 59 = WNBA, drop**), `team` (`teamId`, `team.abbreviation`), **`athlete` (`athlete.id`)**, **`event` (`eventId`)**; drop `type: "Media"`. **New** in `NBA.news()`: return `events`, `athletes`, `leagues` |
| Story text **new** | `content.core.api.espn.com/v1/sports/news/{id}` (`articles[].links.api.self.href`) | `headlines[0].{headline,byline,published,story}` (HTML, stripped as in section 6) |
| Today's games | the existing scoreboard | LIVE pills in Standings, the hub |
| Images | `a.espncdn.com/combiner/i?img=<path>&w=<2x>&h=<2x>` (ESPN's resizer) | logos `/i/teamlogos/nba/500-dark/scoreboard/<abbr>.png` at 48/64/128; headshots `/i/headshots/nba/players/full/<id>.png` at 252 x 184 (card) and 308 x 224 (sheet); news `images[].url` path at 896 x 504 (preview, cards) and 1360 x 352 (reader). Fits the "decoded at display size" rule (UI-SPEC 9) |

## 11. Refresh and cache (IndexedDB, stale-while-revalidate; nothing refreshes under the player)

| Data | Fetch when | Then every | Cache kept | Also |
|---|---|---|---|---|
| Standings | entering Standings or a team page, if older than 10 min | 10 min while shown | 7 days; **plus the shield copies** (one per fetch, newest 10) | 2 min after any game goes final (scoreboard state change) |
| Team schedule | entering the team page, if older than 10 min | 10 min while shown; live tiles take the scoreboard's 15 s | 7 days | – |
| Player averages, team stats, leaders | entering, if older than 1 h | 1 h while shown | 7 days (+ shield copies) | 5 min after your team's final |
| Roster | entering, if older than 12 h | – | 7 days | – |
| News lists | entering, if older than 10 min | 10 min while shown | 1 day | – |
| Story text | opening it | – | 24 h, 30 stories | – |
| Logos, headshots, photos | as shown (Coil/Glide via the image interceptor) | – | disk cache | – |

## 12. Port checklist

1. `pages.css` into `app/tv/app.css`, plus the `:focus` selectors in 2.5.
2. NBA screen:
   - the section row, the sections as sub-screens with their own `_last` focus memory;
   - the day row under the hero;
   - `entry` per section (named above).
3. `team` screen: one renderer for the section and the pushed page; `data-key` everywhere.
4. Hold-OK menus on `.gc` cards and schedule tiles; OK on a game page team tab opens the team.
5. `NBA.news()` additions; the story fetch and HTML stripping.
6. The shield:
   - seen persistence;
   - `covered(story)`;
   - copies of season data;
   - `Reveal results`.
7. `tests/tv/drive.js` scripts for the mocks' paths, and the fake ESPN in `tests/tv` serving these endpoints from `data.json`-shaped fixtures.

## 13. Self-check (`node tools/audit.js`, results in `tools/audit-rings.json`)

The v1.2 audit (`design/ui-v1/tools/audit.js`) was adapted for these pages. It runs these checks on every mock:
- one focus ring per screen;
- text under 14 px;
- overlaps of text with text, and of text with boxes;
- text and rings clipped by any `overflow` ancestor;
- the safe area;
- contrast;
- team colour near LIVE or touching a ring;
- plate text contrast.

The new **RING** check reads the 2x screenshot. It samples pixels all round each focused element: 3.6 px outside it
for an outer ring, 1.5 px inside for an inset one, every 3 px, skipping the corner radii. It fails if under 90% of any
side is white. This catches a ring that geometry says is fine but that a band, a sheet or a sibling paints over.

**Result: 22 pages, 0 findings.** Before the fixes it found 14:
- the ring of the news row left showing under the open reader;
- the leader value touching its label;
- a team plate within 5 px of a category ring;
- crests over a headline in a photo-less card;
- `#2` touching the crest on the player sheet;
- a floating menu's text overlapping (now exempt: the hold-OK menu floats over the page by design, as `contextMenu()` does).

| Mock | Focused | Ring white (t / b / l / r %) | Ring box (x0, y0, x1, y1) | To the safe edge |
|---|---|---|---|---|
| nba-entry | Grizzlies chip | 100 / 100 / 100 / 100 | 562, 77, 691, 123 | 50 px |
| nba-card-menu | menu row | 100 all | 360, 357, 588, 415 | 98 |
| standings-top | West chip | 100 all | 43, 123, 137, 169 | −5 (ring in the 5 px margin; text and box inside) |
| standings-row | Grizzlies row (inset) | 100 all | 48, 290, 900, 322 | 0 |
| standings-scrolled | Kings row (inset) | 100 all | 48, 456, 900, 488 | 0 |
| standings-shield | Reveal results | 100 all | 769, 123, 917, 169 | −5 |
| leaders | Points | 100 all | 43, 123, 253, 167 | −5 |
| leaders-row | Boozer row (inset) | 100 all | 272, 296, 912, 326 | 0 |
| teamstats | Assists | 100 all | 43, 237, 253, 281 | −5 |
| news | first story | 100 all | 43, 123, 445, 193 | −5 |
| news-shield | covered story | 100 all | 43, 187, 445, 257 | −5 |
| news-article | text body (no ring, by design) | – | – | – |
| team-top | Remind me (lifted) | 100 all | 68, 251, 251, 307 | 19.7 |
| team-schedule | at Kings tile (lifted) | 100 all | 482, 352, 700, 472 | 41.1 |
| team-ranks | Rebounds tile | 100 all | 383, 85, 557, 183 | 57.7 |
| team-shield-news | Rebounds tile | 100 all | 383, 85, 557, 183 | 57.7 |
| team-roster | Prosper row (inset) | 100 all | 48, 472, 900, 504 | 0 |
| team-player | sheet button | 100 all | 508, 442, 784, 498 | 14.6 |
| team-shield | hidden Kings tile | 100 all | 482, 352, 700, 472 | 41.1 |
| team-other | All teams | 100 all | 288, 77, 428, 123 | 50 |
| state-down | Try again | 100 all | 777, 123, 917, 169 | −5 |
| state-loading | Grizzlies chip | 100 all | 547, 77, 692, 123 | 50 |

**Notes on the table:**
- **"−5"** is the 5 px outer ring of an item that sits on the x 48 or x 912 safe line. Its text and box are inside. The
  v1.2 audit allows a ring up to 6 px past the line, the convention every existing screen uses (Movies' first column, the guide).
- **Nothing is drawn below y 513.** The lowest ring is at 512 (the hub grid).
- **Node counts are 42 to 227.**

**What I couldn't verify:**
- how the real TV renders: Ambilight, picture modes, the ring on OLED;
- ESPN's story HTML on more than two stories;
- the leaders endpoint behind `leaders2.json` (the brief's files carry only response headers);
- frame times of the table scroll on the TV's chip.

## 14. Decisions for the owner

1. **Seen games stay seen** (section 8). This is needed for the shield to work on season pages; it changes today's
   reveal-per-session. My recommendation is yes.
2. **The hub's day chips move under the hero** (1.1). This is the only visible change to a screen he already uses.
3. **Fantasy and betting stories:** ESPN's NBA feed has several a day (4 of 25 today). They could be dropped like
   videos. I kept them; it's one filter (`categories[].leagueId` 3090 Fantasy, 22000 Betting) if he says so.
