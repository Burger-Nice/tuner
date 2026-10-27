# airglow TV: the NBA Team and League pages, v1.1

This is the design spec for the engineer. It extends `design/ui-v1/UI-SPEC.md` v1.2: the layout system, type, focus,
the Sharp/Soft split, the team-colour safeguards and the spoiler shield. Everything not said here follows that spec.

- **The mocks** are real HTML at the 960 x 540 canvas. They link the app's own `app/tv/brand/tokens.css`, `ui.css` and
  `app.css`, plus `pages.css`. `pages.css` holds the new classes, all prefixed `nb-`, written to be appended to
  `app/tv/app.css`.
- **The data** is real ESPN data fetched on Mon 26 Oct 2026 at 23:37. It is shown as the owner's TV would show it at
  23:40, Reykjavik time (UTC all year).

| File | What it is |
|---|---|
| `SPEC.md` | this |
| `*.html` (30) | the mocks; `png/*.png` are their 2x renders, and `png/contact-sheet.png` shows all of them |
| `pages.css` | the new CSS |
| `data.json`, `img/` | the ESPN fields the pages use; logos, headshots and news photos at 2x display size |
| `tools/extract.js` | turns the raw ESPN JSON into `data.json` and `img/` |
| `tools/build.js` | builds the mocks from `data.json`, including the shield model of section 8 |
| `tools/render.js` | the PNGs and the contact sheet |
| `tools/audit.js` | the self-check (section 13) |
| `REVIEW-independent.md` | the review of v1.0 (6.8 / 10) that v1.1 answers |

## v1.1 changes: an answer to every review point

The coordinator passed on four owner decisions:
- Revealed or watched games stay revealed across launches.
- Fantasy and betting stories are filtered out.
- The day chips moving under the hero is fine.
- The slight darkening of the Memphis and Thunder plates for text contrast is the owner-approved rule in UI v1.2.

### Must fix

**1. Records on pre-game surfaces leaked the unseen result. Accepted.**
- There is now one rule for the whole app, `recordFor(team)` in `games.js`. When the team has an unseen final in
  scope, it returns the record counted from seen finals only, marked partial: `2-0` followed by an eye-off glyph.
- Every surface that shows a record uses it: the Home and hub heroes, game cards, the game page header, the team header
  and the leader card subtitle.
- Seed, streak, L10 and home/road are dropped wherever the record is partial.
- New mock: `nba-entry-shield.png`. The hub hero reads `Grizzlies 2-0 [eye-off]`, and the Jazz `1-2`: the Jazz aren't
  in the unseen game.
- See section 8.2.

**2. In My team mode, the opponent's surfaces showed who won. Accepted.**
- **The scope of an unseen final is both of its teams.** The Kings get the same treatment as the Grizzlies: header,
  record, schedule tile, roster, player sheet and game cards on other days.
- **Any table that contains either team** uses the copy pinned at tip-off, in both shield modes. Here that is the West
  standings, the leaders and team stats. If the opponent were in the East, the East table would be pinned too.
- **News rule 2** now covers stories tagged with *either* team, or with one of either roster's players, published after
  tip-off and within 72 h.
- New mock: `team-opponent-shield.png` (the Kings page: `0-2 [eye-off]`, `1 result hidden`, `Sun, vs Grizzlies`, the
  tile hidden).
- `news-shield.png` now shows a Kings-only preview ("Sacramento faces San Antonio on 3-game slide") covered by the
  opponent rule.

**3. "Reveal results" was focused by default. Accepted.**
- No Reveal is ever the default focus. The audit now fails a mock if the focused element is a Reveal, and it does
  catch one when injected (section 13).
- Reveal buttons **name their game**: `Reveal Grizzlies at Kings`.
- When more than one game is unseen, the button reads `Reveal 6 results` and opens the existing `confirmMenu`, with
  Cancel focused.
- In `standings-shield.png` focus is on West, and the Reveal pill is a button you move to.
- New mock `standings-cover.png`, for when no copy exists: `Show the East` is focused, Reveal comes second.
- `news-covered.png`: `Keep it hidden` is focused, `Reveal Grizzlies at Kings` comes second.

**4. The player sheet, roster sort, leaders hook and ranks weren't shielded. Accepted, all four.**
- **Player sheet.** For a player whose team is in scope, the sheet shows MIN, REB and AST only, counted over
  `2 seen games`. It adds `Points and shooting are hidden: they include Grizzlies at Kings.` and has no leaders button
  (`team-shield-player.png`).
- **Roster sort.** The roster sorts by jersey number, and the pill reads `Sort Jersey`. Points, FG% and 3P% are disabled
  rows in the Sort menu.
- **Leaders menu item.** `In the league leaders` is dropped from the hold-OK menu.
- **Season ranks** use the team-stats copy pinned at tip-off, labelled `as of tip-off, Grizzlies at Kings (Sun)`
  (`team-shield-news.png`). This is the same behaviour as Standings, Leaders (`leaders-shield.png`) and Team stats.

**5. Seen storage and kept copies failed in normal use. Accepted.**
- **Seen storage is a watermark plus a short list:** `seen = { upTo: <time>, ids: [...] }`.
  - Every game that tipped off before `upTo` is seen, and `ids` holds seen games after it.
  - The watermark moves forward to the earliest unseen tip-off whenever it can.
  - So there is no cap and nothing is ever evicted.
  - "Reveal 6 results" sets `upTo` to now.
- **One pinned snapshot per in-scope game.**
  - When the scoreboard poll sees an in-scope game go from `pre` to `in`, airglow fetches standings, leaders and team
    stats once. It stores that copy keyed by event id until the game is seen; there is no "newest 10".
  - Because the owner's games tip at 01:00 to 03:00 Reykjavik time, often while airglow is closed, the same fetch is
    also scheduled 10 minutes before each in-scope tip-off. It uses the exact-alarm mechanism the Reminders feature
    (NEXT.md item 2) already needs, and runs without the app open.
  - The cover card is the fallback for when both fail.
- **Records never need a copy**: `recordFor` counts the schedule's seen finals.
- See section 8.1.

### Should fix

**6. The covered-story reader and story bodies. Accepted.**
- **OK on a covered story** opens a small card: `This story is about a game you haven't seen · Grizzlies at Kings, Sun
  25 Oct`. It has `Keep it hidden` (focused) and `Reveal Grizzlies at Kings` (`news-covered.png`).
- **The round-up exception is now written down** (rule 3): a story tagged with 6 or more teams is covered only if its
  headline or summary names either team or one of their players.
- **Every story body is scanned in both shield modes, before it shows.** A paragraph is replaced by `A result is hidden
  here` if it:
  - contains a score or record pattern, `\b\d{1,3}[-–]\d{1,3}\b`;
  - contains a result word (`win|won|loss|lost|beat|fell|straight|streak|swept`) within 8 words of either team's names,
    or of their players;
  - or, in All games mode, contains any score.
- `news-article-shield.png` shows All games mode: the first paragraph, with "108-101 win", is replaced, and the footer
  says `Shield: 1 paragraph hidden`.

**7. Down from the section row didn't land where the spec said. Accepted.**
- The review is right about `neighbour()` scoring. The section row gets this exact hook (section 2.2):

  ```js
  secRow.navHook = (dir, cur, repeat) => {
    if (dir !== 'down' || repeat) return undefined;          // everything else: the engine's default
    const to = SECTIONS[currentSection].entry(screenEl);      // the selected category, conference chip, first story…
    return to ? focus(to) : undefined;
  };
  ```

- The Up wording is fixed. From the Standings body it takes 3 presses to reach the top bar: body, then conference chips,
  then section row, then the top bar.
- A `drive.js` check per section goes in the port checklist (section 12).

**8. Presses on the owner's main destination. Accepted, all six.**
- **Order:** the row is now `Games · [crest] Grizzlies · Standings · Leaders · Team stats · News`, so your team is 1
  press from Games.
- **OK on a leader** opens his player sheet over Leaders, with a `Grizzlies page` button (`leaders-player.png`). Back
  returns to his row.
- **OK on a game-page team tab** no longer navigates. The team page is in that tab's hold-OK menu, and on a
  `Memphis Grizzlies page ›` row under the box score's Team totals.
- **One Back rule:** Back from any section content focuses that section's chip. A second Back focuses the NBA tab.
- **The hero** is your team's current or next game, whatever day is selected. The day chips drive only the grid under
  them. On a past day with your team's final, that final is a card in the grid.
- **One switching rule:** section chips and category rows both switch **on focus after 250 ms**. When the data isn't
  cached they show the skeleton. They never switch on OK.

**9. Brand and spec mismatches. Accepted, except team colours, which are kept by owner decision.**
- **LIVE pill.** Standings rows and the legend use the standard 22 px pill, which BRAND v5.4 decision 4 requires
  outside guide cells and the top-bar tab.
- **Team colours (pushed back):**
  - The darkened plates (Memphis `#4E6799`, Thunder `#006FB0`) are the owner-approved rule in UI-SPEC v1.2 item 1 and
    3.4, also recorded in UI-SPEC section 12: real colours, with a primary darkened just enough for 4.5:1 text only
    where neither chalk nor ink passes.
  - `#5D76A9` with ink text is 3.9:1 and fails.
  - The Grizzlies' navy `#12173F` is a real colour, but it isn't the team's primary. Using it would change which colour
    reads as "Memphis" everywhere in the app.
  - Unchanged, with this pointer added to section 2.4.
- **One hero state table** now covers the Home hero, the hub hero and the team header (section 7.1). At 23:40 all three
  say `Watch pre-game` + `Remind me`. The team header adds `Game page`.
  - Before tip-off the destination is labelled `Game page`. From tip-off it is `Box score`.
- **`state-down.png`** now has no LIVE pills, and focus stays on West: `Try again` is reachable, not taken.
- **Dwell** is 250 ms everywhere, captions included. The CSS comment now points to section 2.5.

**10. Long names and craft details. Accepted.**
- **Leader names.** The name box is 252 px, measured as the review says. A name over 18 characters steps down to Outfit
  700 20 px, which fits `Shai Gilgeous-Alexander` and `Giannis Antetokounmpo`, then ellipsizes.
- **Next-game line.** The time moves to the label line (`NEXT · TONIGHT 01:00`, `NEXT · TUE NIGHT 00:00`), and the
  opponent gets the full line: `vs Grizzlies` and `at Trail Blazers` both fit (`team-other.png`). The block is 252 px
  wide now, at x 640.
- **Divider lines.**
  - Rows are now siblings placed by their own `top` (no wrapper), so `.mine + .nb-tr::before` and
    `:focus + .nb-tr::before` work.
  - The audit's new pixel check fails a mock if a `#3C3452` line touches a highlighted or focused row.
  - It finds the review's line at y 322 when the old CSS is injected (section 13).
- **The hold-OK menu** now ends at y 513: it is clamped by its measured height and opens upward when it must. The audit
  now checks every floating box against y 27 to 513 and x 48 to 912.
- **The lone "Season ranks" heading** is replaced by a cue, `⌄ Season ranks · News · Roster` (`team-top.png`).
- **Peeking tiles.** A tile or card past x 912 shows only its surface (`.pk`, contents hidden). The audit fails any text
  in an `nb-rail` past x 912.
- **Standings hierarchy:**
  - W, L and PCT are 16 px 650.
  - STRK and L10 are 15 px.
  - GB, HOME and ROAD are 14 px `text-3`, so they recede by size, not only by a colour that barely differs.
- **News order:** newest first.
- **Row-9 conflict: the margin rule wins.** In the top layout, the lowest row focus can sit on is row 8. Moving to row 9
  switches to the scrolled layout.
- **Night rule:** tiles read `THU 29 OCT · LATE` over `02:00`. The header reads `NEXT · TUE NIGHT 00:00`.
- **State-down:** the section row says only `ESPN`, and the time shows once (`showing 22:51`).

**11. Playoffs and "seen" semantics. Accepted.**
- **Playoff series under the shield.** While any game of a series is unseen, the series shows games 1 to 7, with each
  unplayed or unseen one as `Game 5 · if needed`, until the series is seen. The header and the hero keep the last game
  until then, and never show "Next: none".
- **Watched = seen** becomes permanent only when playback reaches the final buzzer (the final period's clock reaches
  0:00 in the feed), or when you reveal explicitly. A tune-in, or a catch-up replay stopped early, stays seen for the
  session only, as today.

### Nits
All are fixed as listed under 10. The `Sat 31 Oct / Sun 00:00` night-rule suggestion is adopted as `· LATE`.

---

## 1. Where the pages live (the IA decision)

**The NBA tab gets a section row:**

`Games · [crest] Grizzlies · Standings · Leaders · Team stats · News`

- The row sits at **y 80 to 120**, where the hub's "NBA" title and day chips are now. The title goes because the top
  bar says NBA.
- The League page is four sections (Standings, Leaders, Team stats, News), each a single screen one press from the row.
- The second chip is **your team** (its crest and nickname), and its section *is* your team page.
- **Games** is the hub. It is the default on a cold start, and the last section is remembered while the app runs.

**Any other team's page is a pushed screen** (`push('team', { abbr })`) with the same layout. Back returns to whatever
opened it.

| From | How |
|---|---|
| Standings row | OK |
| Team stats row | OK |
| Leaders row or leader card | OK opens the player sheet over Leaders; its button is `<Team> page` |
| Game card (hub grid, Home's Tonight row) | **hold OK** opens a menu: `<Away> page` (focused), `<Home> page`, `Remind me` (before tip-off only), `Open the game` (`nba-card-menu.png`) |
| Game page | the hold-OK menu on a team's box-score tab, or the `<Team> page ›` row under the box score's Team totals (OK on a tab never navigates) |
| Team page schedule tile | hold OK opens a menu: `<Opponent> page`, `Open the game`, `Remind me`, and on a hidden final `Reveal <game>` (never first) |
| News story | the reader's buttons at the end of the story: one `<Team> page` per tagged team, up to 2 |
| Pushed team page | `All teams` opens the team picker: 30 crests, a 6-column `[data-grid]`, by conference, your team first |

**Why sections and not one long League page:** standings alone are 30 rows. **Why not a new top-bar tab:** the bar
already has 7 destinations. **With team "None"**, the second chip reads `Teams` and opens the picker.

### 1.1 The Games section

- **The hero keeps its 192 px at y 128.** It shows your team's current or next game whatever day is selected, using the
  hero state table in 7.1.
- **The day chips sit under it**, at y 332 to 368, and drive only the grid, which starts at **y 380**. The first row's
  ring reaches 512.
- The "Tonight" title is gone. The selected chip says `Today · Mon 26 Oct`, and the counts sit at the right of the day row.
- **With team "None"** there's no hero, and the day row sits at y 128.
- **Up** from the grid goes to the day row, then the hero, then the section row, then the top bar.
- **Entry** focus is the hero's primary button.

**A note for the engineer:** the hero's buttons use a **20 px gap**. A lifted first button grows to the right, and at
the app's current 16 px its ring touches the second button by 1.6 px. The audit found this in these mocks. The same
16 px plus left-origin rule is in `app.css` (`.hero-btns>.fx:first-child:focus`) for Home and the hub today, so change
the gap there too.

---

## 2. Rules every new screen follows

### 2.1 Geometry

| What | Value |
|---|---|
| Section row | `.nb-sec` at x 48, y 80, h 40; chips `.chip.lg` (36 high, 8 gap). At the right: `ESPN · 23:37` (when fetched), or `Shield: My team` / `Shield: All games` with the eye-off glyph |
| Content top | **y 128** on every section and on the pushed team page (which has a tools row at y 80 to 120) |
| Standings sub-row (conference chips) | y 128 to 164 |
| Table header | `.nb-th`, 24 high, Inter 650 14 caps +0.06em `text-3`, opaque `bg-0` |
| Table rows | `.nb-tr`, **32 high** (Leaders and Team stats rows: 30). Key figures 16 px 650 (`.c.k`); normal 15 px; secondary 14 px `text-3` (`.c.s`). A 1 px `--a-border` line between rows (inset 12); none next to a highlighted or focused row |
| Table width | x 48 to 900; the **scroll bar** at x 906 to 910, inside the safe line |
| Category column | `.nb-cats` at x 48, w 200, rows 34 high with a 4 gap (10 rows fit y 128 to 504); right panel x 272 to 912 |
| Bottom edge | **Nothing is drawn below y 513**: tables draw whole rows only, and floating menus clamp to 513 |
| Rails | tiles that peek past x 912 show their surface only (`.pk`) |

### 2.2 Focus and keys (on `focus.js` as it is, plus one hook)

- **Containers:**
  - `[data-row]`: the section row, chip rows and the rails;
  - `[data-col]`: category columns, table bodies and the news list;
  - `[data-grid][data-cols="6"]`: the team picker.
- **The one hook:** Down from the section row goes to the section's entry. `neighbour()` would otherwise pick the
  leader card or the ranked list, because they overlap the chip and the column doesn't. The code is in the v1.1 list,
  item 7. Each section's `entry()` is named below; for a pushed team page it's the header's primary button.
- **Up:**
  - From any section's first container, the nearest container above is taken. Standings: body, conference chips,
    section row, top bar (3 Ups from the body). Other sections: content, section row, top bar.
  - Up into the top bar never happens on a repeating key (as now).
- **Rings:**
  - Table rows use the **inset ring** (`.f-in`): 3 px white inside the row, `surface-3`, no scale. It can't be clipped
    and can't overlap the next row.
  - Chips, category rows, news rows and pills use the outer ring only.
  - Buttons, schedule and rank tiles, and news cards use the ring plus the 1.05 lift. The first item of a row or rail
    lifts from its left edge.
  - Button rows have 20 px gaps.
- **Scrolling a table:**
  - It moves in whole rows (320 ms; 0 while a key repeats).
  - **The margin rule wins:** the focused row keeps one whole row of margin to the viewport edge whenever there is
    more. In the top layout that makes row 8 the lowest a focused row sits.
  - Moving past it switches to the **scrolled layout**: the bar and section row slide away; the context line sits at
    y 27 over the 84 px cover band; the column names move to y 52; the body runs y 80 to 513.
  - Up past the first body row restores the top layout.
- **Back:**
  - Anywhere in a section's content, Back scrolls to the top and focuses **that section's chip**. A second Back focuses
    the NBA tab.
  - A pushed page returns to its opener (focus restored by `data-key`).
  - A sheet or card closes.
- **Switching:** section chips and category rows switch **on focus after 250 ms**, with the skeleton if the data isn't
  cached. Conference chips switch the same way.
- **Identity keys:** `tm:<ABBR>`, `pl:<id>`, `g:<id>`, `n:<id>`. Live data never moves focus.

### 2.3 Text, numbers and time

- **Sizes:** nothing is below 14 px except badges.
- **Barlow italic 800** is only for a record, a leader's value, a rank ordinal or a jersey number.
- **Team names:**
  - tables: `displayName`;
  - tiles and the header: `shortDisplayName`;
  - the header splits location (14 px caps) and nickname (30 px);
  - leader names over 18 characters step down to 20 px;
  - ellipsis always goes on a block span.
- **Numbers:**
  - win % as ESPN gives it;
  - GB `–` for the leader;
  - one decimal place for averages;
  - ties `T-2nd`;
  - players who haven't played show `–` and `Hasn't played`, sorted to the bottom.
- **Night rule:**
  - A tip-off between 00:00 and 06:00 local belongs to the evening before: date = local date of (tip-off − 6 h).
  - Tiles: `THU 29 OCT · LATE` over `02:00`.
  - Header: `NEXT · TUE NIGHT 00:00`, or `NEXT · TONIGHT 01:00`.
  - Times are 24-hour local.

### 2.4 Team colour (UI-SPEC 3.4; owner decision in UI-SPEC v1.2 item 1)

- **Plates:**
  - Plates are the team's real primary, with a 4 px bar in its secondary.
  - Text on a plate is chalk or ink, whichever passes 4.5:1.
  - Where neither passes, the primary is darkened just enough. That gives Memphis `#4E6799` and Thunder `#006FB0`,
    from `teamPalette()`. This is approved by the owner and recorded in UI-SPEC v1.2.
- **Your team's rows** carry the team bar (`.tedge`), `surface-1` and a bold name.
- **Safeguards:**
  - No team colour within 8 px of a LIVE pill.
  - No team colour touching a ring, except a row's own bar inside its own inset ring.
  - LIVE is always the dot plus the word, in the **22 px pill** (compact only in guide cells and the top-bar tab).
- **Crests:** the ESPN logo in the neutral disc, at 24, 28, 32 or 64 (`.team.s24/.s28/.s32`, new).

### 2.5 Port notes

- **Focus selectors.** The mocks use `.f` / `.f-ring` / `.f-in`; the app uses `:focus` on `.fx`. Add:
  - ring only: `.nb-cat.fx:focus, .nb-nrow.fx:focus`;
  - ring plus lift: `.nb-gt.fx:focus, .nb-rk.fx:focus, .nb-nc.fx:focus`;
  - inset: `.nb-tr.fx:focus` (with `surface-3`);
  - no divider next to focus: `.nb-tr.fx:focus + .nb-tr::before { display: none }`;
  - first-in-rail lift: `.nb-rail .fx:first-child:focus { transform-origin: 0 50% }`.
- **`.nb-lead`** gets the ring only.
- **Hold OK** uses `data-hold` and `contextMenu()`. Clamp the menu by its measured height:
  `y = min(max(27, r.top + 24), 513 - menu.offsetHeight)`. When that would cover the anchor, open it above.

---

## 3. Standings (`standings-top`, `standings-row`, `standings-scrolled`, `standings-shield`, `standings-cover`, `state-down`)

**Layout:**
- **y 128:** the `West` / `East` chips. Your team's conference is first and selected. At the right, the legend
  `1 to 6 make the playoffs · 7 to 10 play in · [LIVE] playing now`.
- **y 168:** the column names.
- **y 194 to 513:** the body.
- **Columns:** seed 24 · crest 24 · name (about 290) · **W 44 · L 44 · PCT 64** (16 px 650) · GB 52 (14 `text-3`) ·
  STRK 60 · L10 60 · HOME 68 · ROAD 68 (14 `text-3`).
- **Bands:** a 28 px band after seed 6, `PLAY-IN TOURNAMENT · 7 TO 10`, and another after 10, `OUTSIDE THE PLAY-IN`.
  Neither is focusable.
- **First screen:** rows 1 to 9 and the play-in band. Focus can sit on rows 1 to 8.
- **Scrolled:** 13 rows and the bands, from y 80.
- **Playing now:** a 22 px LIVE pill after the name. It is never shown when the data is a copy.
- **Order:** ESPN's `playoffSeed`, then PCT. ESPN can tie seeds; those are shown as given.

| Element | Entry | ◀▶ | OK | Hold OK | Back |
|---|---|---|---|---|---|
| Conference chips | Down from the section row (navHook): the selected chip | move; switches on focus (250 ms) | – | – | section chip |
| Row | Down from the chips: your team's row if it shows, else row 1 | row edge stops | that team's page | `<Team> page`, `Make the <team> my team` | section chip |

**States:**
- **Loading:** flat row blocks; focus stays on the chip.
- **ESPN down with a copy** (`state-down.png`):
  - the copy stays, with no LIVE pills;
  - the legend becomes `ESPN isn't answering · showing 22:51` plus a `Try again` pill you can reach;
  - focus stays where it was;
  - the section row reads `ESPN`;
  - it retries every 60 s.
- **ESPN down with nothing cached:** the state card with `Try again` focused (nothing else to focus).
- **Preseason:** 0-0 alphabetical, no seeds, `Season starts Tue 20 Oct`.
- **Off-season:** `2025-26 final standings`.
- **Shield:** section 8.

## 4. Leaders (`leaders`, `leaders-row`, `leaders-player`, `leaders-shield`)

**Layout:**
- **Category column** at x 48, y 128: Points, Rebounds, Assists, Steals, Blocks, 3-pointers, Field goal %. Each row
  shows its abbreviation at the right.
- **Leader card** at x 272, y 128, 640 x 96:
  - a 210 px team plate with the headshot standing on the bottom edge, and the crest;
  - `1ST IN THE NBA`;
  - the name (24 px, or 20 px past 18 characters; the box is 252 px);
  - team · position;
  - the value in Barlow 56.
- **Rows 2 to 10** at y 236, 30 px each: rank (ties repeat), crest, name, team, value. Your team's players get the bar.

**Keys:**
- Entry: the selected category.
- ▶ goes to the card. ▲▼ walk the card and the rows. ◀ goes back to the column.
- **OK on a player** opens the player sheet (7.6) over Leaders, with a `<Team> page` button (`leaders-player.png`).
- Hold OK: `<Team> page`.

**Shield** (`leaders-shield.png`):
- If any player in the list is on a team in scope, the whole list is the **copy pinned at the unseen game's tip-off**.
- Under the column: `As of tip-off, Grizzlies at Kings (Sun)`, plus a `Reveal it` pill, never focused by default.
- In the mock: Jerome is `36.5` over two games (ESPN's own recap gives 36.5) and LaVine is `25.0`. The other rows are
  today's, for illustration.

## 5. Team stats (`teamstats`)

**Layout:**
- **Category column:** Points, Points allowed, Rebounds, Assists, Field goal %, 3-point %, 3-pointers made, Steals,
  Blocks, Turnovers. Each row shows **your team's rank** at the right. Lower is better for Points allowed and Turnovers.
- **Right side:**
  - 30 rows of 30 px, 11 visible;
  - each row: rank · crest · name · a 200 px bar · value;
  - bar fill: `border-strong`, or the gradient for your team, scaled from 18 to 100%;
  - the list opens centred on your team.

**Keys:**
- Entry: the selected category. ▶ goes to the list, on your team's row.
- OK on a row opens that team's page. Back goes to the section chip.

**Shield:** the pinned copy, labelled, the same as Leaders.

## 6. News (`news`, `news-shield`, `news-covered`, `news-article`, `news-article-shield`)

**Layout: a list on the left and a preview on the right.**
- **List** at x 48, y 128, w 392:
  - 6 rows of 60, newest first;
  - each row: the headline (15/18, 2 lines) and the meta at y +41 (`Thunder · 1 h ago`; `NBA` when 4 or more teams are
    tagged);
  - it scrolls in whole rows, with a scroll bar at x 444 (25 stories).
- **Preview** at x 464, w 448: a 224 px photo, a label row, the headline (22/26, 2 lines) and the summary (3 lines).
  It updates 150 ms after focus settles and is display only.
- **No photo:** both teams' crests, away first with `at` between them. Never ESPN's stitcher graphic, which prints the
  score.
- **Filtered out:**
  - videos (`type: "Media"`);
  - WNBA (league 59);
  - **fantasy (league 3090) and betting (league 22000)**, by owner decision.
- **Premium stories** say `ESPN+`, and their reader shows the summary only.

**The reader:**
- **Size:** x 140 to 820, y 27 to 513, radius 24, over the scrim. The list row loses its ring while it is open.
- **Content:**
  - a 176 px photo;
  - the label;
  - the headline (28/34);
  - the byline;
  - paragraphs at 17/27 chalk, in a 600 px column.
- **Footer:** a 44 px opaque footer, `Back closes` / `▼ More`. The viewport ends above it, with a 40 px fade.
- **Focus** is the text body (no ring, as the Full description sheet). ▼▲ scroll 240 px. At the end, ▼ moves to the
  `<Team> page` buttons.
- **Text:** ESPN's content API, stripped to paragraphs (section 10).
- **Shield:** in a shield mode the body is **scanned before it shows** (section 8.3). The footer then says
  `Shield: n paragraphs hidden`.

**A covered story** (`news-shield.png`):
- The row reads `A Kings story · hidden by the shield`, with its age only.
- The preview shows no photo and says `Hidden until you reveal Grizzlies at Kings`.
- **OK opens a card**, `This story is about a game you haven't seen`, naming the game and day, with `Keep it hidden`
  (focused) and `Reveal Grizzlies at Kings` (`news-covered.png`).
- Reveal marks the game seen and opens the story. Back closes the card.

## 7. Your team page, and any team's

From the top: **header**, **Schedule** rail, then the cue `⌄ Season ranks · News · Roster`. Below the first screen come
**Season ranks**, **News** and the **Roster** table.

### 7.1 Header (x 48 to 912, y 128 to 312) and the one hero state table

| Part | Position (in the card) | Content |
|---|---|---|
| Status row | x 24, y 12 | `YOUR TEAM` (your team only) · `2026-27 · REGULAR SEASON`. When live: `[LIVE] Q2 4:12 at Jazz`, ending ≥ 8 px above the plate |
| Plate | x 0 to 372, y 44 to 116 | crest 64, `MEMPHIS` over `Grizzlies` (30), chalk or ink |
| Record | x 392 | `3-0` in Barlow 56, then `4th in the West` over `W3 · 1st Southwest`. **Partial** (section 8.2): `2-0`, `1 result hidden` over `[eye-off] Sun, at Kings` |
| Next game | x 640 to 892, 1 px border on its left | `NEXT · TONIGHT 01:00`, crest 28 + `at Jazz` (the full line), the best TV name |
| Buttons | x 24, y 128, gap 20 | from the table below; caption at the right |

**The hero state table.** One table drives the Home hero, the hub hero and this header. The primary button is the
entry focus.

| When | Primary | Secondary | Team header adds | Caption |
|---|---|---|---|---|
| Up to 3 h before tip-off, channel known | `▶ Watch pre-game` | `🔔 Remind me` / `✓ Reminder set` | `Game page` | `Tips off in 1 h 20 min` / the channel |
| More than 3 h before tip-off, or no channel | `🔔 Remind me` | `Game page` (Home: `Choose channel` if none) | – | `Tips off in …` / the best TV name |
| Live | `▶ Watch live` | `Box score` (shield: `Reveal score`, moved to) | – | `Q2 4:12 · 48–51` (shield: `Score hidden`) |
| Final, within 12 h | `Box score` | – | – | `Final · W 123–112` (shield: `Ended · result hidden`) |
| Off-season | none | – | – | `Season starts Tue 20 Oct` / `Off-season · schedule out in August` |

Until the Reminders feature exists, Remind me isn't drawn, and the next button moves up. Before tip-off the
destination is always called `Game page`. From tip-off it is `Box score` (the same page, opened on the box score).

### 7.2 Schedule (title y 324, rail y 360 to 464)

- **One rail, oldest on the left.** It opens with the next game in the third slot, and the last two results to its
  left. The focused tile stays in the third slot while the rail can scroll.
- **The rail needs a `navHook('left'/'right')`.** The engine's row would otherwise move focus inside a fixed list; the
  hook moves the window instead. 8 tiles are mounted, and CH± jumps a month.
- **Tile** (198 x 104):
  - the date (`FRI 23 OCT · LATE`; the next game reads `TONIGHT NEXT`);
  - crest + `at Warriors`;
  - `W 111–108`, `L 123–132` (`text-2`), `01:00 · League Pass` or `[LIVE] Q3 7:29`.
  - A hidden final shows `[eye-off] Result hidden`.
  - The tile past x 912 shows its surface only.
- **OK** opens the game page. **Hold OK** opens `<Opponent> page`, `Open the game`, `Remind me`, and
  `Reveal <game>` (listed last, never focused first).

### 7.3 Season ranks · 7.4 News · 7.5 Roster

- **Season ranks:** 9 tiles of 156 x 84: the stat, the ordinal in Barlow 32, the value. OK opens Team stats on that
  category.
  - Shield: the pinned team-stats copy, labelled `as of tip-off, Grizzlies at Kings (Sun)`.
- **News:** a rail of 272 x 153 cards from the team's feed, newest first, with the same filters and shield as section 6.
- **Roster:**
  - **Columns:** `#` · player (name, position, injury `⊞ Day-to-day` in `text-2`, `Hasn't played`) · GP · MIN ·
    **PTS** · REB · AST · FG% · 3P%.
  - **Sort pill:** Points, Rebounds, Assists, Minutes, Jersey number, Name.
  - **Scrolled:** the context line at y 27, the title at y 52, the column names at y 92, 12 rows from y 120.
  - **Shield** (either team of an unseen game): sorted by jersey, the pill reads `Sort Jersey`, the Points, FG% and
    3P% sorts are disabled, and those columns show the eye-off glyph.
- **Keys:** OK on a row opens the player sheet. Hold OK opens `Player card`.

### 7.6 Player sheet (right sheet, 420)

- **Top:** a 112 px band with the team plate, headshot, `#2`, crest and team.
- **Then:**
  - the name and `Guard · 6' 5" · 29 years · 9th season`;
  - `2026-27 · 3 GAMES`;
  - a 3 x 2 grid of averages;
  - College, From;
  - the injury, if any.
- **Button:**
  - from the roster: `☆ 1st in the NBA in points`, only when he's in a top 10;
  - from Leaders: `<Team> page`.
- **Shield** (his team is in scope):
  - MIN, REB and AST only, over `2 seen games`;
  - the line `Points and shooting are hidden: they include Grizzlies at Kings.`;
  - **no leaders button**.
  - Focus is then the sheet body, with no ring (`team-shield-player.png`).

### 7.7 Another team's page (`team-other`, `team-opponent-shield`)

- **Tools row** at y 80 to 120: `☆ Make the <team> my team` (confirms), `All teams` and `Opened from … · Back returns
  there`.
- **No `YOUR TEAM` label.**
- **Entry:** the header's primary button. Up goes to the tools row, then the top bar.
- **The shield applies when the team played an unseen game against yours:** the Kings show `0-2 [eye-off]`, `1 result
  hidden`, `Sun, vs Grizzlies`, and the Grizzlies tile is hidden.

### 7.8 Scrolling the team page

- Down from the schedule slides the page so the focused section's title sits at y 52. The bar and section row step away.
- Up from the first rail below the header restores the top.

## 8. The spoiler shield on these pages

### 8.1 Seen, unseen, and the pinned copies

- **Seen** is stored as `{ upTo, ids }`, with no cap:
  - every game that tipped off before `upTo` is seen;
  - `ids` holds seen games after it;
  - `upTo` advances to the earliest unseen tip-off whenever possible.
- **A game becomes seen** when:
  - you reveal it (a button you move to, naming the game);
  - `Reveal n results` is confirmed, which sets `upTo` to now;
  - or playback reaches its final buzzer.
- **Tuning in briefly**, or stopping a catch-up replay early, only reveals it for the session, as today.
- **Turning the shield on** clears `ids`, the way `setShield` clears session reveals today. The first time it is
  switched on, `upTo` is set to 12 h before that moment: last night's games start unseen, older ones count as seen.
- **An unseen final** is a final, or live game, in scope that isn't seen:
  - in mode `My team`, games with your team;
  - in `All games`, every game.
- **Its scope is both of its teams.**
- **Pinned copies:**
  - For each in-scope game, airglow keeps one copy of standings, leaders and team stats, fetched at tip-off and keyed
    by event id.
  - The fetch is triggered by the scoreboard poll's `pre` to `in` change, and also by an exact alarm 10 minutes before
    tip-off (the Reminders mechanism), so it works with airglow closed.
  - The copy is deleted once the game is seen.
- **Records** come from the schedule's seen finals, so they never need a copy.

### 8.2 Per surface (when a team in scope has an unseen final)

| Surface | Under the shield |
|---|---|
| Any record (Home and hub hero, game cards, game page header, team header, leader card) | `recordFor`: counted from seen finals, followed by an eye-off (`2-0 [eye-off]`). No seed, streak, L10, home or road next to it |
| Team header | the partial record, `1 result hidden`, `[eye-off] Sun, at Kings` (`team-shield.png`) |
| Opponent's page | the same, from its side (`team-opponent-shield.png`) |
| Schedule tile of an unseen final | `[eye-off] Result hidden`; OK opens the game page and its Reveal card; hold OK lists `Reveal <game>` last |
| Standings, Leaders, Team stats, Season ranks | **any table containing either team**: the copy pinned at that game's tip-off, labelled `As of tip-off, Grizzlies at Kings`, with `Reveal Grizzlies at Kings` as a button you move to (`standings-shield.png`, `leaders-shield.png`). No copy: a cover card, with `Show the East` (or Back) focused and Reveal second (`standings-cover.png`) |
| Roster | sorted by jersey; PTS, FG% and 3P% show the eye-off; MIN, REB and AST stay |
| Player sheet | MIN, REB and AST only, over seen games; no leaders button |
| Hold-OK `In the league leaders` | not offered |
| News | section 8.3 |
| Reveal buttons | never the default focus; they name their game; with more than one unseen, `Reveal 6 results` opens `confirmMenu` with Cancel focused |
| Never hidden | LIVE pills, schedule times, names, injuries, rosters: they don't tell a result |

### 8.3 News and story text

**A story is covered** (`news-shield.png`) when any of these is true:
1. It is tagged with an unseen game's event id.
2. It is tagged with either team of that game, or with a player on either roster, and was published between its
   tip-off and 72 h after.
3. It is a round-up (6 or more teams tagged) whose headline or summary names either team or a player on either
   roster. Otherwise a round-up stays, as the 30-player breakout story does.

OK on a covered story opens the card in section 6.

**Story bodies** are scanned in both modes, before they show. A paragraph is replaced by `A result is hidden here` if:
- it contains `\b\d{1,3}[-–]\d{1,3}\b` (scores and records);
- it contains a result word (`win|won|loss|lost|beat|fell|straight|streak|swept|clinch`) within 8 words of either
  team's name, nickname, city or players;
- or, in All games mode, it contains any score (`news-article-shield.png`).

Today's data, tested in the mocks:
- covered: the Grizzlies preview ("aim for 4th straight win"), the Kings preview ("on 3-game slide"), and the Kings
  recap;
- kept: the OKC injury stories and the breakout round-up;
- dropped: the fantasy stories naming Jerome (now filtered).

### 8.4 Playoffs

While any game of a series is unseen:
- the series shows games 1 to 7, each unplayed or unseen one as `Game 5 · if needed`;
- series scores are hidden;
- the header and the hero keep the last game.

## 9. States

| State | What shows | Focus |
|---|---|---|
| Loading, nothing cached (`state-loading.png`) | flat blocks in the final layout, section row `Loading…` | stays on the chip |
| Loading, cached | the copy at once, refreshed in place | unchanged |
| ESPN down, cached (`state-down.png`) | the copy, no LIVE pills, the time once, a `Try again` pill you can reach | unchanged |
| ESPN down, nothing | `Scores aren't reachable` card | `Try again` |
| One part fails | that section's title says `Couldn't load from ESPN · trying again` | – |
| Preseason | 0-0, `Leaders start after the first games`, ranks hidden | – |
| No news | `No ESPN stories in the last week` | – |
| Long names | 2.3 rules; `vs Grizzlies` and `at Trail Blazers` have full lines | – |
| Off-season | `Off-season`, last season's tables labelled `2025-26`, schedule end tile `Schedule out in August` | – |
| Playoffs | `Game 3 · MEM leads 2-1` (shield: section 8.4), header `Playoffs · First round` | – |
| Team "None" | no hero; second chip `Teams` | – |

## 10. Data (ESPN's public JSON; most of it is already in `app/nba.js`, commit 568759b)

| Need | Endpoint | Fields |
|---|---|---|
| Standings | `site.web.api.espn.com/apis/v2/sports/basketball/nba/standings` | `children[].name`; `entries[].team.{abbreviation,displayName,shortDisplayName,location}`; `entries[].stats[]` by `name`: `playoffSeed`, `wins`, `losses`, `winPercent`, `gamesBehind`, `streak`, `"Last Ten Games"`, `Home`, `Road` |
| Schedule | `site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{id}/schedule` | `team.{recordSummary,standingSummary}`; `events[].id/date`; `competitions[0].competitors[].{homeAway,team.abbreviation,score.displayValue,winner}`; `status.type.{state,shortDetail}`; `broadcasts[].media.shortName`; `seasonType.type` |
| Roster | `…/teams/{id}/roster` | `athletes[].{id,jersey,displayName,position.abbreviation,age,displayHeight,experience.years,college.name,birthPlace,injuries[0].status,headshot.href}` |
| Player averages | `…/teams/{id}/athletes/statistics` (the brief's `byteam.json` is the league list; ESPN ignores its team filter) | `results[0].leaders[].athlete`; `statistics[].stats[]`: `gamesPlayed`, `avgMinutes`, `avgPoints`, `avgRebounds`, `avgAssists`, `fieldGoalPct`, `threePointFieldGoalPct` |
| Leaders | `site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete?sort=<cat>.<stat>:desc&limit=10` (as `NBA.leaders`, with limit 10) | the mocks used the `leaders2.json` shape, `leaders.categories[].leaders[].{displayValue,athlete,team.abbreviation}`. Its 3P% is a fraction: don't use it |
| Team stats | `…/statistics/byteam?limit=30` | top-level `categories[].names`; `teams[].categories[]` with `splitId` 0 (own) and 900 (opponent); ranks computed in the app, with ties as `T-` |
| News | `…/news?limit=25[&team={id}]` | `articles[].{id,type,headline,description,published,byline,premium,images[]}`; `categories[]`: `league.leagueId` (drop 59, 3090, 22000), `team.teamId`, `athlete.athlete.id`, `event.eventId`. **New in `NBA.news()`**: return events, athletes, leagues, and sort newest first |
| Story text (new) | `content.core.api.espn.com/v1/sports/news/{id}` | `headlines[0].story` (HTML): keep the `<p>` text; drop script, iframe, figure, aside and paragraphs under 30 characters; then scan it (section 8.3) |
| Images | `a.espncdn.com/combiner/i?img=<path>&w=&h=` | logos, headshots and photos at 2x display size |

## 11. Refresh and cache (stale-while-revalidate; nothing refreshes under the player)

| Data | Fetch when | Then every | Kept |
|---|---|---|---|
| Standings | entering, if older than 10 min; 2 min after any final | 10 min while shown | 7 days |
| **Pinned copies** (standings, leaders, team stats) | at each in-scope tip-off (scoreboard poll, and an exact alarm 10 min before) | – | until that game is seen |
| Schedule | entering, if older than 10 min | 10 min (live tiles: the scoreboard's 15 s) | 7 days |
| Player averages, team stats, leaders | entering, if older than 1 h; 5 min after your team's final | 1 h | 7 days |
| Roster | entering, if older than 12 h | – | 7 days |
| News | entering, if older than 10 min | 10 min | 1 day |
| Story text | on open | – | 24 h, 30 stories |
| Seen | on every reveal or finished watch | – | settings (`upTo` + ids) |

## 12. Port checklist

1. **CSS:** `pages.css` into `app.css`, plus the selectors in 2.5. Change the 16 px hero button gap to 20.
2. **The NBA screen:**
   - the section row and its Down `navHook`;
   - the sections as sub-screens with their own focus memory;
   - the day row under the hero;
   - one Back rule.
3. **The `team` screen:** one renderer for the section and the pushed page; the schedule rail's left/right `navHook`.
4. **Menus:** hold-OK menus on `.gc` cards, schedule tiles and game-page tabs, plus the `<Team> page ›` row under the
   box score. Clamp `contextMenu()` to y 513.
5. **`games.js`:**
   - `recordFor`;
   - the `{ upTo, ids }` seen store;
   - the finished-watch rule;
   - pinned copies, with their alarm;
   - `covered(story)`;
   - the body scan;
   - Reveal buttons that name their game.
6. **`NBA.news()`:** the additions and the filters; the story fetch.
7. **`tests/tv/drive.js`:** one script per section checking where Down from the chip lands and where Back goes, plus a
   shield script that walks every surface in section 8.2 and fails on any visible record or score of the unseen game.

## 13. Self-check (`node tools/audit.js`; ring data in `tools/audit-rings.json`)

**The checks.** The v1.2 audit is adapted for these pages:
- one ring;
- text under 14 px;
- text overlaps;
- clipping of text and rings;
- the safe area;
- contrast;
- team colour near LIVE or touching a ring;
- plate contrast.

It also does the **RING** pixel check: the focus ring is read back from the 2x screenshot all round the element, and a
mock fails if any side is under 90% white.

**v1.1 adds four checks:**
- **SAFE box:** every floating menu, sheet or reader must sit inside y 27 to 513 and x 48 to 912.
- **SHIELD:** a mock fails if the focused element is a Reveal.
- **DIVIDER:** a mock fails if a `#3C3452` line touches a highlighted or focused row. This is read from pixels.
- **Peek:** a mock fails if a rail has text past x 912.

**Tested by injecting the v1.0 faults.** Each check fires:
- the v1.0 divider CSS gives `DIVIDER at y 290, 322`;
- the v1.0 menu position gives `ctxmenu box … 515.0 crosses the safe area`;
- a focused Reveal gives `SHIELD: the focused element is a Reveal`.

**Result: 30 pages, 0 findings.**

**Fixed during v1.1, from the audit's findings:**
- a hero ring touching its neighbour at a 16 px gap (now 20);
- the Kings' next-game label overflowing its block;
- a record caption touching the next block.

| Mock | Focused | Ring white, all sides | Ring box | To the safe edge |
|---|---|---|---|---|
| nba-entry | Grizzlies chip | 100% | 148, 77, 278, 123 | 50 px |
| nba-entry-shield | Watch pre-game | 100% | 68, 255, 300, 311 | 19.7 |
| nba-card-menu | menu row | 100% | 360, 355, 588, 413 | 100 |
| standings-top | West | 100% | 43, 123, 137, 169 | −5 (ring in the margin) |
| standings-row | Grizzlies row (inset) | 100% | 48, 290, 900, 322 | 0 |
| standings-scrolled | Kings row (inset) | 100% | 48, 456, 900, 488 | 0 |
| standings-shield | West | 100% | 43, 123, 137, 169 | −5 |
| standings-cover | Show the East | 100% | 269, 387, 445, 443 | 69.7 |
| leaders, leaders-shield | Points | 100% | 43, 123, 253, 167 | −5 |
| leaders-row | Boozer row (inset) | 100% | 272, 296, 912, 326 | 0 |
| leaders-player | Grizzlies page | 100% | 508, 442, 718, 498 | 14.6 |
| teamstats | Assists | 100% | 43, 237, 253, 281 | −5 |
| news, news-shield | second story | 100% | 43, 187, 445, 257 | −5 |
| news-covered | Keep it hidden | 100% | 246, 293, 423, 349 | 163.6 |
| news-article, news-article-shield | text body (no ring, by design) | – | – | – |
| team-top | Watch pre-game | 100% | 68, 251, 300, 307 | 19.7 |
| team-schedule, team-shield, team-opponent-shield | at/vs Kings tile | 100% | 482, 352, 700, 472 | 41.1 |
| team-ranks, team-shield-news | Rebounds tile | 100% | 383, 85, 557, 183 | 57.7 |
| team-roster | Prosper row (inset) | 100% | 48, 472, 900, 504 | 0 |
| team-player | leaders button | 100% | 508, 442, 784, 498 | 14.6 |
| team-shield-player | sheet body (no ring: no button under the shield) | – | – | – |
| team-other | All teams | 100% | 288, 77, 428, 123 | 50 |
| state-down | West | 100% | 43, 123, 137, 169 | −5 |
| state-loading | Grizzlies chip | 100% | 134, 77, 279, 123 | 50 |

**Notes:**
- **"−5"** is the 5 px ring of an item on the x 48 safe line. Its box and text are inside, and the v1.2 rule allows a
  ring up to 6 px past the line.
- **The lowest ring** is at 512.
- **Illustrative data:** the pinned-copy values are illustrative where noted (the West copy differs only in the
  Grizzlies' and Kings' rows; in the leaders copy, only Jerome and LaVine).

**Couldn't verify:**
- the real TV (ring on OLED, plate colours, 15 to 16 px table text from the sofa);
- scroll frame rates;
- ESPN's story HTML beyond two stories;
- the URL behind `leaders2.json`;
- whether an exact alarm fires and gets network while the Philips is in standby (the same open question as Reminders
  in NEXT.md).

## 14. Decisions

**Settled by the owner:**
- seen games stay seen (storage as in 8.1);
- fantasy and betting stories are filtered;
- the day chips go under the hero;
- the plate darkening is kept (2.4).

**Open, for the owner:** whether the finished-watch rule (seen at the final buzzer) is right, or whether watching from
the start of Q4 should already count.
