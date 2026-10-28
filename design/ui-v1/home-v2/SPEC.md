# airglow TV: Home v2, v1.1

The design spec for the new Home tab: a billboard that is the thing you came for, then rows in the order they matter,
with the channels at the bottom. It replaces `design/ui-v1/UI-SPEC.md` 5.2 (Home) and keeps everything else of that
spec, of `nba-pages/SPEC.md` (the shield's seen model, team identity) and of `catchup/SPEC.md` 5.1 (the hero's catch-up
rows). Where this spec and those disagree about Home, this spec wins.

- **The mocks** are real HTML at the 960 × 540 canvas. They link the app's own `app/tv/brand/tokens.css`, `ui.css`,
  `app.css`, `nba.css` and `design/ui-v1/catchup/catchup.css`, plus `home-v2.css` (the new classes, all `hv-`, written to
  be appended to `app/tv/app.css`).
- **The scenario.** The owner's TV, Reykjavik time (UTC all year), shield `My team`, languages Icelandic then English,
  Stremio signed in (Cinemeta plus a debrid add-on, "Northlight"). The 26 Oct 2026 slate is the real one
  (`nba-pages/data.json`); Grizzlies at Jazz tips off at 01:00 on the 27th (the "Mon 26 Oct · late" game of the night
  rule). The 28 and 31 Oct slates, the provider's channels, guide, titles, clocks and scores are stand-ins (the kit's
  fictional titles and procedural art). **Only data the app has is drawn** (section 9): backdrops are Cinemeta / TMDB,
  channel cards carry the provider's logo tile, the records are partial while a Grizzlies final is unseen (the Kings
  replay in Continue watching is stopped in Q3 on every mock before `home-final-seen`).
  - **Game night:** Tue 27 Oct 01:52, Q2: `home-live-hidden` (the lead mock: he opens the app during the game),
    `home-live` (shield Off, or after Reveal), `home-behind` (02:35, his replay stopped in Q1); 00:11: `home-pre`,
    `home-pre-choose`; 03:40: `home-final-seen`. `home-live-entry` is the entry motion as three stills.
  - **The morning after:** Tue 27 Oct 10:40, `home-morning`.
  - **A normal evening:** Wed 28 Oct 20:41: `home-evening`, `home-upnext`, `home-new-season`, `home-scrolled`,
    `home-channels`, `home-card-menu`, `home-offline`, `home-m3u` (a playlist account).
  - **Nothing to continue:** Sat 31 Oct 21:10, `home-discover`; **first start**, `home-first`, `home-welcome`.

| File | What it is |
|---|---|
| `RESEARCH.md` | what Netflix, Apple TV, Google TV, Disney+, Max, Plex, Infuse and Stremio do, what makes them beautiful, and what carries over |
| `SPEC.md` | this |
| `BRAND-CHECK.md` | every mock against the brand rules, the departures argued |
| `REVIEW-independent.md` | the review of v1.0 (6.4 / 10) that v1.1 answers |
| `*.html` (20) | the mocks; `png/*.png` are their 2× renders, `png/contact-sheet.png` shows them all |
| `home-v2.css` | the new CSS |
| `tools/build.js` | builds every mock from one scenario, and `tools/pages.json` |
| `tools/render.js` | the PNGs and the contact sheet |
| `tools/audit.js` | the self-check (section 11) |

## v1.1 changes: an answer to every review point, plus the owner's "be creative"

| Review | Answer |
|---|---|
| **1. The wide card's meta wrapped to three lines** (ui.css blocks every `span` in `.tx`; the mock's dot separator became a block). The audit passed it. | Fixed in `home-v2.css` (`.wc .tx span.dot-sep{display:inline-block}`), every wide card re-rendered and re-judged. The duplicate `S1 E3` label is gone: the label slot is for `NEW` and `NBA · REPLAY` only; the meta carries `S1 · E3 · "Signal" · 21 min left`. The audit gained **LINES**: a card's title and meta, the billboard's meta and fan line, a row title, a game card's status line are one line each. |
| **2. The main game-night state was not mocked; the mocked one was contrived.** | `home-live-hidden` is now the lead mock (shield on, he has not started watching); `home-behind` and `home-pre-choose` are drawn in the v2 layout; `home-live` stays as the revealed state (shield Off, or after Reveal score) and says so; `home-final-seen` added. |
| **3. The pre-game records spoiled; SPOILER ran on one mock.** | Every mock in the scenario carries the shield meta except the three where the game is seen or the shield is off (`home-live`, `home-final-seen`, `home-m3u`) and the settings page; SPOILER runs on all of them. The audit gained **RECORD**: a shield mock with a game billboard never shows a full W-L on a plate. `home-pre` shows `3-0 ⊘` / `1-2 ⊘`. The fan line is written from seen finals only (`3 in a row`, never "wins"). |
| **4. Data the app does not have.** | **Channel cards** are the provider's logo tile (44 px) on surface-2 with the programme title, the number and the bar; a channel carrying a game gets the two teams' colours and crests, which the app has (`home-channels`); the audit's **DATA** check fails a channel card with art. **16:9 film art:** section 9 specifies the backdrop job for every Continue watching item (Cinemeta `background` by IMDb id, else `get_vod_info` `backdrop_path`, up to 16, cached 30 days, after `launchDone` in the request queue) and the fallback is designed and mocked: the poster upright at the left with the title beside it (`Salt & Static`). **New in your shows** has its job in 9.3 (the series list's `last_modified` moves → one `get_series_info` for that series; Cinemeta `videos[].released` for add-on shows; capped, cached, in the queue). **In 4K** uses the named 4K with the dashed tag, as Movies does, subtitle `Named 4K · checked when you open`. **Á íslensku** is the provider's language tag and category plus an Icelandic audio track; subtitles are out of the rule; the owner chose a row of its own (14.3). **`Also from Cinemeta`** is gone; the caption names the playable fact: `4K HDR from Northlight` / `Also on your provider`. **The scenario** has one slate per night (26, 28, 31 Oct) and the clocks agree with each mock's time; the night rule names dates everywhere (`Sat · late`). |
| **5. The empty boxes at the bottom of the first screen.** | A peeking row keeps its **top line**: a game card's status (LIVE, clock, channel) and its crests and edges, a wide card's label, tile and number, a poster's tags; only body text is hidden, and nothing is sliced (the audit's PEEK now checks whole-on-screen rather than banning text). A row with fewer than 26 px on screen shows its edge alone (`.peek.deep`). |
| **6. The game billboard was a stretched card with a shouting slab.** | **Game-night mode** (3.2): the billboard is the two teams' colours, the away field left and the home field right, split at 12° through the middle (flat tints, 4.5:1 for chalk); crests 80 px in the neutral disc; the score plate in the middle (bg-1 at 92 %, 12°) with the **clock chip**, which is the one gradient slab, now 112 × 72 instead of 330 × 208, attached to the plate; one fan line under the plates (`3rd in the West · 3 in a row · Morant 27.8 ppg`, copied at tip-off under the shield and marked `as of tip-off`). The primary button is again the brightest small thing on screen. |
| **7. `Q2` read as `02`.** | The period is written `2ND 4:12` in Barlow caps on the chip; the quarter in game cards too (`1ST 9:41`). |
| **8. Live NBA cards lost one-press tuning.** | On Home, **OK on a live, unshielded game card = Watch live** on `bestChannel`; hold OK = the game menu with `Game page` first. The hub keeps its rule (OK = game page): Home is for watching, the hub for reading. "Watch another live game from Home" = ▼ ▼ (to the row) + OK = 3, or ▼ ▼ ▶ OK = 4; from the player the action chip stays 1. |
| **9. Billboard and row 1 cramped; dead space above the buttons.** | The column flows (eyebrow 84, title, meta, line or bar) and the buttons sit at y 232 to 276; the ring ends at 282 and the row-1 title starts at 298. |
| **10. The scrolled Channels row left the screen empty.** | The lift is clamped at the end: the last row sits above the safe line with the row before it above it (`home-channels`). |
| **11. The hold menu over the page with no dim.** | A bg-0 dim at 60 % under every hold menu on Home; the menu sits beside its card and never over the billboard's primary (`home-card-menu`). |
| **12. Performance claims not true of the code.** | Section 9 rewritten: no native image sizing exists, so the billboard and the cards ask for metahub's `/medium/` and `/small/` paths and TMDB `w780` / `w342` through `sized()`; the native interceptor is scoped as later work with its own note (13.4). Every row stays mounted; off-screen rows are `visibility:hidden` (no churn on ▼); the billboard is hidden when scrolled, never unmounted (the audit's BAR check now fails an unmounted one). |
| **13. The language order contradicted the scenario.** | Top picks reads `Popular this week · Icelandic and English`: the rule lists the `Shown first` languages (up to two), and Top picks takes titles in any of them. |
| **14. Offline.** | The pill sits at the top right under the bar (y 84); the billboard says `Needs a connection to play`; Resume stays focused because it leads to the diagnosis card (section 7 says so). |
| **15. Copy.** | The episode's own name is in the meta (`S1 · E3 · "Signal"`); the series name once. Eyebrows: `Pick up where you left off` / `Up next` instead of repeating the row title; `Popular on your provider` instead of a count; the night rule everywhere, the day once on the next-game card; `LIVE · Grizzlies at Jazz · NBA League Pass 4` in the status row. Back from a row → the top with the billboard's primary focused; a second Back → the tab. Mocked now: Welcome, Up next, Final seen, M3U live-only, New season, Pre with no channel, Behind, Live hidden. `Tell me when my team is live` is in the settings mock. |

**The owner's three answers** (recorded in section 14): the discovery pick's OK opens **Details**; Channels **last**;
Icelandic as its **own row `Á íslensku`**.

**"Be a little creative" (the owner):** what v1.1 adds that only airglow has, shown in the mocks:
- **Game-night mode** (`home-live-hidden`, `home-pre`, `home-behind`, `home-morning`): Home changes shape when the
  Grizzlies play. The team colours take the billboard, the crests go big, the status row says `GAME NIGHT`, the fan line
  tells him where his team stands without telling him the score, and the entry slides the two fields in from their sides
  (`home-live-entry`). The morning after says `THE MORNING AFTER` and the chip reads `REPLAY · NO SPOILERS`.
- **The greeting** (3.7): the first word of a title billboard's eyebrow is the time of day in Icelandic: `GÓÐAN DAGINN`,
  `GÓÐAN DAG`, `GOTT KVÖLD`. A small thing he will see every day and no other app says.
- **Ambient colour** (3.8): the billboard's left ground takes the artwork's own colour, deep and flat, so a cold blue
  film and a warm comedy give Home a different mood (Netflix's 2025 "background echoes the billboard"). Computed once
  per image, native, cached.
- **`Ends 21:03`** on the billboard: the one thing a sofa wants to know and nobody prints.
- **New season** (`home-new-season`): a show he finished gets a new season on the provider or an add-on and the
  billboard carries it with the show's own logo, the season line and `Play S4 · E1`.
- **A film for tonight** (row 5): films under two hours that end before midnight at tonight's clock, unseen, rated.
- **The next game as the billboard** when there is nothing else (`home-m3u`): `VS`, the tip time, `Remind me`.

## 0. The idea in one paragraph

Home opens on one big thing: your team's game when there is one (live, about to start, or last night's replay under the
shield), else the episode or film you are in the middle of, else a new season of a show you finished, else a title you
have not seen, chosen for you and said plainly why. Under it, rows in the order they matter to one person: what you were
watching, the NBA tonight, new episodes of your shows, titles like the last one you finished, a film for tonight, top
picks, what is new, 4K, Icelandic, what you saved, and last of all the channels. Every row says why it exists, hides when
it is empty, and can be switched off or moved in Account > Home rows. Nothing plays by itself, nothing rotates under your
thumb, and the spoiler shield covers every card the same way it covers the rest of the app. On game nights Home changes
shape; on other nights it greets you in Icelandic and tells you when the film ends.

## 1. Decisions (each answers to UI-SPEC 1's principles; the research is in RESEARCH.md)

1. **One billboard, no carousel, no timer.** The focused button is the thing you came for and never changes its meaning
   on its own (UI-SPEC principle 4, review S3-4). A discovery pick changes once a day, between visits, never while Home
   is on screen.
2. **Continue watching is row 1 whenever it has items** (Plex's rule, Apple's Up Next). On a game day the game is the
   billboard, so resume is Down, OK: the two presses UX-CHECK SF11 asked for. When nothing is in progress the row is
   simply absent; nothing says "empty".
3. **The channels go last** (owner: "it can be there but not at top", confirmed in 14.2). Favourites first, then the
   channels watched lately. The last-channel hero is gone; the guide is one tab away and digits tune from anywhere.
4. **Every row names its reason** in its title or subtitle. No "Recommended for you" without saying from what.
5. **No trailers, no previews, no motion on the billboard** beyond the entry, the focus lift and the 12° wipe when a game
   changes state. Every app that autoplayed a hero added an off switch later (RESEARCH 2.6); an IPTV provider has no
   trailers; the brand bans masked video. The opt-in muted slab preview of UI-SPEC 3.5 stays as it is, on the game
   billboard's plate.
6. **Art first, and only real art.** The billboard shows the title's backdrop (Cinemeta `background`, else the provider's
   TMDB `backdrop_path`), wide cards show stills or backdrops under a bottom scrim, title rows show posters with captions
   below, channel cards show the provider's logo. Where only a poster exists it stands upright; a poster is never
   stretched, blurred or mirrored, and a channel never gets invented art.
7. **Two card sizes and one game card.** Wide 198 × 111 (16:9) for things in progress, new episodes and channels; 2:3
   posters 124 × 186 for titles; the NBA hub's 272 × 124 game card unchanged. Four wide cards, three game cards or six
   posters across, plus a peek.
8. **The shield covers Home exactly as it covers the hub** (nba-pages 8, catch-up 7): hidden plates, `Ended`, partial
   records, `May show results` on studio shows, no result words, matched videos masked. Under `My team` the other games
   show their scores (the My team rule).
9. **Rows are a setting.** Account > Home rows lists every row with a toggle and its place; hold OK moves it. Continue
   watching is pinned first and can only be switched off. Thin rows (fewer than 3 items) hide themselves until they fill.
10. **Cheap to draw.** Every row mounted once, off-screen rows hidden, 8 cards each at first, images at slot size from
    the CDN paths the app already rewrites, one redraw per data event, nothing re-laid out on a focus move (section 9).
11. **Two moods, one app.** Game night is a mode (the team colours, the chip, the fan line); every other night is the
    pictures: a title's backdrop, its own colour on the canvas, the greeting, the ending time. Neither is the theme of the
    whole Home.

## 2. Layout (960 × 540, safe x 48 to 912, y 27 to 513)

| Element | Geometry |
|---|---|
| Top bar | as UI-SPEC 3 (y 32 to 72), over the billboard under a top scrim (`.hv-st`, 0 to 96, bg-0 86 % to 0; on the game billboard 0 to 124 so the status row and its LIVE pill sit on the canvas, never on a team colour) |
| Billboard `.hv-bb` | x 0 to 960, y 0 to 292, full-bleed. Title states: the backdrop under `.hv-sx` (left-to-right, the detail page's stops, starting in the ambient colour) and `.hv-sy` (bottom 150 px to bg-0), the ground behind the column the ambient colour fading to bg-0 by x 672. Game states: the two team fields (3.2) with `grain.png` |
| Column `.hv-col` | x 48, y 84, width 540: eyebrow (22 high) · title Outfit 700 34/40, 2 lines at most, or the show's logo (72 high at most) · meta 15/20 · synopsis 16/20, 2 lines (discovery) or the progress bar 320 wide (continue) |
| Buttons `.hv-btns` | x 48, y 232 to 276, gap 20; primary `.btn` first and focused; a 14 px caption of one or two lines after the last button when there is one |
| Game billboard | status row y 84 (`GAME NIGHT` · LIVE · the matchup · the channel · synced); matchup row y 116 to 196: crest 80 in the neutral disc at x 48, name Outfit 700 28 and record; the score plate in the middle (72 high, bg-1 92 %, 12°, 236 wide at least) with the clock chip (112 × 72, the gradient, 12°, Barlow 30 and a 14 px caps caption) attached at its right; the home side mirrored, ending at x 912; the fan line y 202 to 222 (15 px chalk) |
| Row block | title Outfit 700 22/28 at x 48 (+ a 14 px subtitle), then the cards 10 px below (12 for posters), then 24 px to the next block. Pitch: wide 173, game 186, poster 302 |
| Row 1 | title y 298, cards y 336 |
| Rails | `.track` flex, gap 24, first card at x 48; cards past x 912 bleed (the peek); a card that slid out on the left is clipped at x 36 |
| Cards | wide `.wc` 198 × 111 radius 16; game `.gc` 272 × 124; poster `.pc` 124 × 186 radius 12 + caption 14 px below; end card same box, dashed |
| Scrolled | the page `translateY` so the focused row's title sits at y 84, clamped so the last row's cards end 6 px above the safe line; the bar is away; the billboard hidden in place; `.hv-cover` (0 to 84) fades the row above; `.ctxline` "Home · <row>" at y 27; `.hv-edge` fades the last 34 px |
| Offline pill | `.offline-bar` top right under the bar (y 84 to 116, right edge 912) |
| Hold menu | `.hv-dim` bg-0 at 60 % over the page, the kit's `.ctxmenu` beside its card, inside the safe area, never over the billboard's primary |

**Lift rule.** A row's cards must end at y ≤ 513 with their ring when the row is focused. Rows 1 of the wide and game
kinds do (bottom 447 / 460); a poster row directly under the billboard does not (336 + 186 = 522), so focusing it lifts
the page by the overshoot (19 px) and hides the bar like any lift; Up from it puts the page back and the billboard's
primary takes focus. A peeking row (its cards cross the safe line) shows its art and its top line (a game card's status,
crests and edges; a wide card's label, tile and number; a poster's tags), never body text, and nothing sliced by the
edge; under 26 px of card on screen it shows the card's edge alone; its title shows only when the title ends by y 513.

## 3. The billboard

### 3.1 Priority (what shows when)

Decided from cached data before first paint and locked for 3 s after the launch (UI-SPEC 5.2); its *content* (a score,
a clock) updates inside the lock, its *kind* does not.

| # | When | Kind |
|---|---|---|
| 1 | `Your team first` is on and your team's game is within its window: 3 h before tip-off to 30 min after the final, the behind-in-a-replay row until tip-off + 3 h 30 | **Game** (3.2) |
| 2 | Your team's last game is hidden (shield) with a replay, from 30 min after the final until the buzzer plays in a replay, you reveal it, the replay expires, 48 h pass or the next game's window opens (catch-up 5.1) | **Game, the morning after** (3.2) |
| 3 | Something is in progress (a film, an episode, a replay) and was touched in the last 7 days, or the next episode of a show you finished an episode of in the last 7 days | **Continue / Up next** (3.3) |
| 4 | A show you finished (every episode of its last season seen) or saved got a new season in the last 48 h and you have not started it | **New season** (3.5) |
| 5 | None of the above and the catalog has loaded | **Discover** (3.4): the day's pick |
| 6 | No films or series on the account (a live-only playlist), nothing to continue, your team has a next game | **Your team's next game** (3.5) |
| 7 | The channel list has not loaded yet (first start, or a cold cache) | **Welcome** (3.6) |

Row 1 of a kind-1 or kind-2 Home is Continue watching when it has items, so resume stays two presses away.

### 3.2 Game: game-night mode (`home-live-hidden`, `home-live`, `home-behind`, `home-pre`, `home-pre-choose`, `home-morning`, `home-final-seen`)

The billboard is the matchup: the **away team's field** on the left and the **home team's field** on the right, split
at 12° through the middle (x 449 at the bottom, 511 at the top), each the team's real primary at 55 % over bg-1 and
darkened until chalk reads at 4.5:1 or better (`field()` in `tools/build.js`; the app's `util.js` gets the same rule);
`grain.png` over both. The crests sit in the neutral disc (80 px, never recoloured). The **score plate** in the middle is
bg-1 at 92 % with the 12° skew, holding the score (Barlow 800 italic 64) or `VS` or the `Score hidden` tile; the **clock
chip** attached to its right is the one pink-to-orchid slab on the screen, 112 × 72, ink text: a Barlow line and a
14 px caps caption. The status row above sits on the canvas (the top scrim), so the LIVE pill never touches a team
colour (audit LIVEBG). Under the plates one **fan line** in chalk: the team's place in its conference, its streak from
seen finals, its scoring leader's season average (`league.js` standings and leaders; under the shield the copies taken at
tip-off, marked `⊘ as of tip-off`). The state table (UI-SPEC 5.2 and catch-up 5.1, unchanged in meaning):

| State | Status row | Plate | Chip | Buttons (primary first, focused) | Caption |
|---|---|---|---|---|---|
| Pre, channel known | `GAME NIGHT` · `GRIZZLIES AT JAZZ · TIP-OFF 01:00` | `VS` | `49 MIN` / `to tip-off` (minutes under 10 h, else the time) | `Watch pre-game` · `Game page` | `NBA League Pass 4` |
| Pre, no channel | same | `VS` | same | `Choose channel` · `Open guide` | `No channel found yet` / `Your pick is remembered` |
| Live, hidden | `GAME NIGHT` · LIVE · `GRIZZLIES AT JAZZ · NBA LEAGUE PASS 4` | `Score hidden` | `ON NOW` / `until you watch` (no period, no clock: catch-up S4) | `Watch live` · `From tip-off` (when a replay source exists) · `Reveal score` | none |
| Live, revealed (shield Off, or after Reveal) | same + ◷ `Synced · 38 s` | `48 – 51` | `2ND 4:12` / `live · synced` (`live`; `HALF`; `scores unavailable` when ESPN is stale) | `Watch live` · `From tip-off` · `Box score` | `Hold OK for 2 more channels` when there is no `From tip-off` |
| Live, you are behind in a replay | `GAME NIGHT` · LIVE (on the clock) · the matchup · the channel | `Score hidden` | `1ST 8:20` / `you stopped here` | `Resume` · `Back to live` · `Game page` | none |
| Final, hidden, a replay exists (the morning after) | `THE MORNING AFTER` · `GRIZZLIES AT JAZZ · MON 26 OCT · LATE` | `Score hidden` | `REPLAY` / `no spoilers` | `Watch from tip-off` · `Game page` | `NBA League Pass 4` / `Replays for 3 days` |
| Final, hidden, you stopped partway | same | `Score hidden` | `3RD 6:41` / `you stopped here` | `Resume` · `From tip-off` · `Game page` | none |
| Final, hidden, no replay yet | same | `Score hidden` | `END` / `no spoilers` | `Game page` · `Pick the channel` | `No replay yet` / `airglow keeps looking` |
| Final, seen (or shield off), within 30 min | `YOUR TEAM` · `GRIZZLIES AT JAZZ · FINAL` | `112 – 104` | `FINAL` / `full time` (`after overtime`) | `Box score` · `Watch again` (when a replay exists) | `W 112–104` / `NBA League Pass 4` |

Rules: the time is shown once; records are `recordFor` (partial with the eye-off under the shield; audit RECORD); the
fan line never contains a result word (`3 in a row`, from seen finals); hold OK on any watch button opens the sources
sheet (catch-up 5.1); LIVE is the dot plus the word, on the canvas. The muted preview of UI-SPEC 3.5 (opt-in) replaces
the plate's content as a rectangle under the plate's drawn edges; the chip stays.

### 3.3 Continue and Up next (`home-evening`, `home-upnext`)

| Element | String / rule |
|---|---|
| Eyebrow | the greeting (3.7) · `PICK UP WHERE YOU LEFT OFF` (continue) / `UP NEXT` (the next episode) |
| Title | the series name for an episode, the film's clean title, the matchup for a replay; 2 lines at most, then an ellipsis. When Cinemeta has a `logo` for the title, the logo (72 px high at most, 360 wide) replaces the text |
| Meta | `S1 · E3 · "Signal" · 49 min · [4K] · 21 min left · Ends 21:03` (the episode's own name in quotes; a film: `2023 · Drama · 1h 48m · [4K] · 1h 17m left · Ends 22:01`; a replay: `NBA · Replay · Stopped in Q3`, never minutes left, no ending time) |
| Progress | the gradient bar, 320 wide (continue); Up next shows the episode's line instead |
| Buttons | `Resume` (focused) · `Start over` · `Details`; Up next: `Play` (focused) · `Details`; a replay: `Resume` · `From tip-off` · `Game page` |
| Art | the title's backdrop; for an episode the episode still when the add-on has one, else the series backdrop |

The billboard's own title is not repeated in Continue watching. `Ends` is the clock at which the item ends if played
now (time left for a continue, the episode's length for Up next), rounded to the minute, hidden when the length is
unknown.

### 3.4 Discover (`home-discover`, `home-first`)

When nothing is in progress and no new season waits: the day's pick, computed once a day (at the first draw after 04:00,
or when the catalog changes), from the titles that are **unseen** (not in History, not in Continue watching, not marked
watched, not `Not interested`), in his languages (`Shown first`), rated 7.0 or better where a rating exists, from the
provider's Popular sort (catalog.js `popular`) merged with the add-ons' Popular catalogs; ties broken by a fixed daily
seed so the pick holds for the day. A title with a backdrop wins over one without when the scores are within 10 %.

| Element | String / rule |
|---|---|
| Eyebrow | the greeting · `TOP PICK FOR YOU · THRILLER` (the genre); on a first start `POPULAR ON YOUR PROVIDER · ANIMATION` |
| Title | as 3.3 |
| Meta | `★ 7.8 · 2024 · Thriller · 2h 06m · [4K] · Ends 23:16` (`Series · 2 seasons` for a series; `[IS]` when the title is Icelandic) |
| Synopsis | 2 lines of the add-on's or provider's description; 1 line when the title wraps to two |
| Buttons | **`Details` (focused, owner decision 14.1)** · `Play` · `Save` (`Saved ✓`, not focusable once saved) |
| Caption | the playable fact: `4K HDR from Northlight` / `Also on your provider` (the best copy's quality and source from copies RANKING.md; `From your provider` when only the provider has it) |
| Art | the backdrop; with only a poster, `.hv-pst` upright at the right (128 × 192, y 84) on the ambient ground |

`Play` plays the best copy as the title page's Play would; a series plays S1 · E1. Hold OK on `Play` opens the copies
sheet. `Not interested` (hold OK on the pick's poster in a row, or on the billboard's `Details`) removes the title from
the pick and the discovery rows for 30 days.

### 3.5 New season, and your team's next game (`home-new-season`, `home-m3u`)

**New season:** a series he finished (every episode of its last season seen) or saved gets a new season: the provider's
series `last_modified` moved and its season count grew (one `get_series_info`), or Cinemeta's meta lists a new season's
`videos` with `released` in the last 48 h. The billboard holds 48 h or until he starts it. Eyebrow the greeting ·
`NEW SEASON · ADDED TODAY`; the show's logo (Cinemeta) or its name in caps; meta `Season 4 · 10 episodes · ★ 8.2 · Drama ·
You watched up to S3`; buttons `Play S4 · E1` (focused) · `Series page`; caption the source (`Also from Cinemeta` /
`Icelandic subtitles` when checked). New in your shows carries the other new episodes.

**Your team's next game** (no VOD, nothing to continue, no game today): the game-night layout before its day: the two
fields, `VS` on the plate, the tip time on the chip, the fan line, `Game page` (focused) · `Remind me` (greyed with
`Reminders come with the next update` until NEXT.md 1 ships), caption the channel. Eyebrow the greeting · `YOUR TEAM ·
THU 23:30`.

### 3.6 Welcome (`home-welcome`)

Before the channel list is in: the ambient ground (bg-1 to bg-0), eyebrow `WELCOME TO AIRGLOW`, title `Your channels,
films and series are loading`, meta `A minute or two the first time · Home fills in as they land`, the caption `Back
cancels`, skeleton rows (flat surface-1 blocks, no shimmer) where the NBA row and Top picks will be. Nothing is focused
(a progress screen, UX-CHECK SF9); the first row to arrive takes focus only if nothing is focused yet, never away from a
button the owner reached.

### 3.7 The greeting

The first word of a title billboard's eyebrow is the time of day in Icelandic (pink-text): `GÓÐAN DAGINN` from 05:00,
`GÓÐAN DAG` from 12:00, `GOTT KVÖLD` from 18:00 to 05:00. Account > Languages > `Greeting`: Icelandic (default when
Icelandic is among `Shown first`) / English (`Good morning`, `Good afternoon`, `Good evening`) / Off. The game
billboard has no greeting: `GAME NIGHT` is its word.

### 3.8 Ambient colour

A title billboard's ground, behind the column and under the left scrim, is the artwork's own colour: the image's dominant
colour (Android `Palette`, computed natively from the already-downloaded medium image, one `command('palette', url)`
→ `{hex}`; cached 30 days with the backdrop), darkened to L 24 % at 40 % chroma and used flat (`--amb`) with a deeper
step (`--amb2`) at the far left. No colour is known → bg-1. The rows below stay on bg-0, so the canvas never changes.
The mocks derive the tint from the stand-in art's hue.

### 3.9 Motion

The billboard never animates on its own. **Entry:** on a title billboard the art settles (scale 1.04 → 1, opacity 0 →
1, 400 ms) once per visit; on game night the two fields slide in from their sides (translateX 240 → 0 px, opacity .3 →
1, 280 ms, the live wipe's easing) while the plate and crests settle (scale .96 → 1), then the ring lands
(`home-live-entry`). A kind change cross-fades 200 ms. A game state change inside the game kind plays the 280 ms 12°
live wipe once; a basket bumps the digits (scale 1.1 → 1, 200 ms, revealed state only). Focus moves: the ring swaps
instantly, the lift is 200 ms. Reduced motion: 120 ms fades. Transform and opacity only.

## 4. The rows

### 4.1 Order and hiding

Default order (Account > Home rows can switch any off and move 2 to 11):

| # | Row title | Subtitle | Card | Items | When it shows |
|---|---|---|---|---|---|
| 1 | `Continue watching` | – | wide | up to 16 | pinned first; hidden when empty |
| 2 | `Tonight in the NBA` / `Last night in the NBA` / `Today in the NBA` | `1 live · 1 later · 3 final` (counts never spoil; `5 final · yours hidden` the morning after) / `As of 20:12` offline | game, next-game | your team's next game first (when it is not the billboard), then the slate ordered live, upcoming, final | a slate exists today or yesterday; else the next-game card alone with the title `Your team` |
| 3 | `New in your shows` | `Signal Hill S4 and 4 more` when a season landed | wide | up to 12 | episodes added in the last 14 days to series he watched any episode of or saved (9.3) |
| 4 | `Because you watched Night Circuit` | – | poster | 7 + `See all` | the last title he finished (or passed 80 % of) in the last 30 days; `moreLikeThis` scoring; unseen only; a new seed each time a title is finished |
| 5 | `A film for tonight` | `Under 2 hours · ends before midnight` | poster | 7 + `See all` | from 18:00: unseen films, rated 6.5 or better, in his languages, whose runtime ends before 00:00 at the current clock; by rating; before 18:00 the row hides |
| 6 | `Top picks for you` | `Popular this week · Icelandic and English` (the `Shown first` languages, up to two) | poster | 7 + `See all` | Popular, in any of his languages, unseen, provider and add-ons merged with the [tv] mark; the day's pick leads it when it is not the billboard |
| 7 | `New on your provider` | `Last 14 days` | poster | 7 + `214 more` | movies and series by `added`, his languages first |
| 8 | `In 4K` | `Named 4K · checked when you open` | poster | 7 + `See all` | titles whose name or a copy says 4K (the dashed tag, Movies' rule); a checked copy gets the filled tag |
| 9 | `Á íslensku` | `Icelandic titles and sound` | poster | 7 + `See all` | the provider's language tag or category says Icelandic, or a copy has an Icelandic audio track; the row is named in the language's own name, the first non-English `Shown first` language (owner decision 14.3) |
| 10 | `Saved for later` | – | poster | 7 + `Saved` | saved movies and series not started yet, newest save first |
| 11 | `Channels` | `Favourites and recent` | wide (channel) | up to 16 | favourites in Saved's order, then `recents`; the billboard's own channel not repeated |

A row with fewer than 3 items hides (Continue watching and the NBA row show from 1). A title appears in at most one of
rows 4 to 10 (the earlier row keeps it) and never in a row while it is the billboard or in Continue watching. First
start only: `Series to start` (Popular series, unseen) in place of Because you watched.

### 4.2 Naming the NBA row

`Tonight in the NBA` from 12:00 until the last game of the day has ended; `Last night in the NBA` from 04:00 until 12:00
when yesterday's slate exists; `Today in the NBA` for a day slate with a game before 18:00. The night rule of nba-pages
(a game after midnight belongs to the evening before, written `Sat · late`) names dates on Home too.

### 4.3 The next-game card (`home-evening`, `home-discover`)

A game card with one matchup line: status `YOUR TEAM` (pink-text) · the day by the night rule (`Thu`, `Sat · late`,
`Tomorrow`, `Today`), the opponent's crest and `vs Lakers` / `at Nuggets`, a second line `Lakers 2-2 · Game page` (the
opponent's record as the shield lets it be seen, then what OK does), and the tip-off plate `23:30` / `tip-off`. It leads
the row only while the game is outside the billboard's window.

## 5. Cards

| Card | Size | Contents |
|---|---|---|
| **Wide, continue** `.wc` | 198 × 111, radius 16, 1 px border | the backdrop or still (9.2) · title Inter 650 16 + one meta line 14 at the bottom over the scrim (`S1 · E3 · "Signal" · 21 min left`, `Film · 1h 17m left`) · the gradient progress bar flush. **No backdrop:** `.wc.pst`: the poster upright at the left (74 × 111), the title and meta beside it on surface-1 |
| **Wide, replay** | same | the two teams' colours split at 120°, label `NBA · REPLAY`, the crests top-right, `Grizzlies at Kings` · `Stopped in Q3` (catch-up 5.2) |
| **Wide, new episode** | same | the episode still, label `NEW` · `Signal Hill` · `S3 · E8 · Added today` (`Yesterday`, `Mon`, `3 Oct`) |
| **Wide, channel** `.wc.chc` | same | **no art** (live TV has none): surface-2 with the provider's logo tile (44 px, the two-letter rule when there is no logo) and LIVE when a game is on it, top-left; the number top-right · programme title + channel name at the bottom · progress of the programme. A channel carrying a game: the two teams' colours split at 120° with the crests top-right. No guide: the channel name as the title and nothing else; `May show results` with the eye-off under the shield (catch-up 4.3) |
| **Game** `.gc` | 272 × 124 | nba-pages 5.3 / catch-up 5.3, with the period written `1ST 9:41` |
| **Next game** `.gc.next` | 272 × 124 | 4.3 |
| **Poster** `.pc` | 124 × 186 + caption | the provider's or add-on's poster · `4K` top-left (filled when checked, dashed when only named) · a language badge top-right when not in his languages · the [tv] mark bottom-right when an add-on's title is on the provider too · a resume bar when started · caption: the clean title, then `2024 · ★ 8.4` (or the genre without a rating) |
| **End card** `.endcard` | the row's card box, dashed | `See all` (opens Movies or Series with the row's sort and filters set), `214 more`, `Saved` |
| **Masked** | wide or poster | a hidden game's video or a title that could tell: catch-up 5.8 |

Focus on every card: the ring + 1.05 lift; the first card grows to the right; captions sit 14 px under a poster.

## 6. Focus, scroll and keys

- **Entry focus:** the billboard's primary button, from launch, from the tab and from Back (UI-SPEC 6). Returning from
  the player or a title page: the card that was opened, by `data-key`, at its row's remembered position.
- **▲ ▼** move between the billboard's button row and the rows; each row remembers its focused card. From the billboard
  ▲ is the top bar. From row 1 ▲ is the billboard's primary. From the last row ▼ stops.
- **◀ ▶** move along a row; both edges stop. ▶ past the last item reaches the end card when the row has one. The track
  slides so the focused card keeps the first slot (x 48).
- **Lift:** focusing row k ≥ 2 translates the page so row k's title is at y 84, clamped at the end (section 2); the bar
  steps away and the context line shows `Home · <row title>`. Auto-repeat: no smooth scroll, the ring moves instantly.
- **OK** on a card: continue → resume; new episode → play it; poster → the title page (never play: he has not seen it);
  channel → tune (the zap ring is the group it came from); **a live, unshielded game → Watch live on `bestChannel`**
  (review 8); any other game → the game page; next game → the game page; end card → the list. OK on a billboard button
  does what it says. **OK means one thing per element; hold OK is always the menu.**
- **Hold OK menus** (first row focused, the page dimmed):
  - continue card: `Resume` · `Start over` · `Details` · `Mark watched` · `Remove from Home` (the item leaves Continue
    watching and the billboard; History keeps it); a replay: catch-up 5.2's menu plus `Remove from Home`
  - new episode: `Play` · `Series page` · `Mark watched`
  - poster: `Save to Saved` (`Remove from Saved`) · `Details` · `Not interested` (30 days out of the discovery rows)
  - channel: `Save to Saved` (`Remove from Saved`) · `Open in the guide`
  - live game: `Game page` · `Watch live` · the hub's `gameMenu` rows; other games: the hub's menu; next game: `Game
    page` · `Remind me` (greyed until NEXT.md 1)
  - billboard buttons: the watch buttons open the sources sheet (catch-up); `Play` the copies sheet; `Details` offers
    `Not interested` on a discovery pick
- **Back:** in the rows, scroll to the top and focus the billboard's primary (review 15); on the billboard, the Home tab
  (the tab rule); a third Back exits. A menu closes to its card.
- **Digits** on Home tune a channel number as in Live (unchanged).

## 7. States

| State | What Home shows |
|---|---|
| Loading (cold start, nothing cached) | 3.6 Welcome |
| Loading (cache) | Home as last drawn, redrawn once per data event (section 9) |
| A row's data not in yet | the row is absent, not a skeleton; rows appear in order as their data lands, below the focused row only (a row never inserts above the focus) |
| Nothing in progress | no Continue watching row; the billboard is a new season or the day's pick |
| No NBA data (ESPN down) | the NBA row shows the cached slate with `As of 20:12`; a game billboard's chip reads `scores unavailable`; no LIVE pills |
| No add-ons | Top picks and Because you watched from the provider alone (no [tv] marks); captions say `From your provider` |
| No backdrop for a title | the poster upright (3.4 on the billboard, 5 on a wide card) |
| Offline with a cache (`home-offline`) | the billboard with `Needs a connection to play` (Resume stays focused: it leads to the diagnosis card, diagnosis SPEC), Continue watching, the slate marked `As of …`, the catalog rows; `New in your shows` left out (it needs the provider); no LIVE pills, no clocks; the pill `Offline · showing what airglow remembers` top right, never focusable. Pages open from the cache; video needs the connection |
| Offline, no cache | the launch's offline card (UI-SPEC 5.11), not Home |
| Shield `My team` | the game billboard per 3.2; the Grizzlies card hidden in the NBA row (`5 final · yours hidden`), others with scores; studio shows `May show results`; matched videos masked in every row; no result word, no OT, no end time anywhere (audit SPOILER on every shield mock) |
| Shield `All games` | every game card hidden; the counts still show |
| Live-only playlist (M3U) (`home-m3u`) | rows 3 to 10 absent; the billboard is the game, a replay in progress, or the next game; then the NBA row and Channels |
| Row switched off | gone; the setting's row says `Off` |

## 8. Settings: Account > Home rows (`home-rows-setting`)

Two panes as today. Rows:
- `Your team first` · toggle · `On game days your team's game is the big card on Home` (exists)
- `Tell me when my team is live` · toggle · `A quiet chip while you watch something else` (exists)
- the label `ROWS, IN ORDER`, then one 56 px row per Home row: the grip (none on the pinned row), its number, its title,
  one line on what it is (`Always first`, `Your team's next game, then tonight's games`, `New episodes of shows you watch
  or saved`, `Like the last title you finished`, `Under 2 hours, ends before midnight`, `Popular this week in your
  languages, unseen`, `Added in the last 14 days`, `Named 4K, checked when you open`, `Icelandic titles and sound`, `Saved
  titles you have not started`, `Favourites and recent, at the bottom`) and the toggle with the word `On` / `Off`.
- The hint under the list: ⓘ `OK turns a row off or on · Hold OK moves it · 3 of 11, then Reset order`.
- **OK** toggles. **Hold OK** lifts the row (Saved's reorder: ring + 1.02, `▲▼` move it, OK drops it, Back puts it
  back). Continue watching has no grip and does not move. `Reset order` is the last row of the list.
- Account > Languages gains `Greeting` (3.7). Home redraws on the next entry, not while Account is open.

## 9. Data and performance (true of the code as it is)

### 9.1 Drawing
- **Every row is mounted once** and stays mounted (11 rows × 8 cards is under 1,000 nodes, the busiest mock is 262 UI
  nodes); rows off screen are `visibility:hidden` (`.hv-row.off`) so nothing mounts or unmounts on ▼ (home.js's own note:
  a Home redraw costs 100 to 200 ms on this TV). Each row mounts 8 cards and appends the rest when ▶ reaches the sixth.
  Row heights are fixed per kind (section 2), so a row's position is arithmetic, never a layout read.
- **The billboard is hidden, never unmounted**, when the page scrolls (`.hv-bb.hv-hidden`), so its image is decoded once
  per visit.
- **Redraws:** one `setHtml` per data event (`nba`, `progress`, `catalog`, `feeds`, `replays`, `favs`, `addons`,
  `league`), diffed by `data-key`; a score or clock change re-texts the billboard's nodes only. Nothing redraws under the
  launch except a hero change. The rows below the first two are computed after `launchDone` and the first paint, in an
  idle callback, in order.
- **No new CSS cost:** three flat scrims, two flat team fields, no filter, no mask on moving pixels, no shadow but the
  ring; transforms and opacity only; `will-change` on the focused card only.

### 9.2 Images (no native sizing exists today: `util.js` `sized()` rewrites TMDB URLs only)
- The app asks the CDNs for the size it draws: TMDB `w780` for the billboard and `w342` for cards and posters (the
  existing `sized()`); **metahub** `/background/medium/` for the billboard and `/poster/small/` for cards (new rules in
  `sized()` for `images.metahub.space`); ESPN logos at `500` as today. A provider's own JPEG arrives as it is; a
  `loading="lazy"` card draws its scrim and text first so nothing jumps.
- **Backdrops for Continue watching** (review 4): for each of the up-to-16 items, Cinemeta `background` by IMDb id
  (`imdb.js`), else Xtream `get_vod_info` / `get_series_info` `backdrop_path[0]` (core.js already reads it), one request
  per title in the guide's request queue after `launchDone`, cached 30 days in IndexedDB with the title's key. Until it
  lands the card is the poster-left variant. Episode stills: the add-on's `thumbnail`, else the series backdrop.
- **The billboard's image** is part of "Home ready" (decoded before the launch wipe) when it is cached; a first-time
  backdrop shows the poster-upright billboard and swaps to the backdrop with a 200 ms fade when it lands.
- **Native image sizing** (`shouldInterceptRequest` → a downsampling decoder with a disk cache) is later work, scoped in
  13.4; nothing in this spec depends on it.

### 9.3 Rows' data jobs (all after `launchDone`, in the request queue, capped, cached)
- **New in your shows:** the followed set = series with any watched episode or a save. On each catalog refresh, a
  followed series whose `last_modified` moved gets one `get_series_info`; new episodes = those with `added` (the
  episode's own) in the last 14 days, else the series' `last_modified` date for every episode of the newest season when
  episodes carry no date. Add-on shows: Cinemeta meta `videos[].released` in the last 14 days. Cap 20 series a day; the
  result is cached per series with its `last_modified`. The row hides until the first result.
- **New season** (3.5): the same job notices a grown season count.
- **The day's pick** and **Because you watched** are computed at most once a day and when their seed changes, cached in
  IndexedDB with the catalog's `PREP` version; **Top picks** reuse the Movies tab's Popular order.
- **A film for tonight** is a filter over the prepared movie list (runtime, rating, language, unseen) at draw time.
- **In 4K** and **Á íslensku** are filters over prepared lists (names, tags, categories, known audio tracks).
- **Shield checks** run on card data before markup (`videoMask`, `show`, `recordFor`), never on the DOM.
- **The fan line**: `league.js` standings and leaders (10 and 60 min ages), copied at tip-off for the shield as the hub does.
- **The ambient colour** (3.8): one native call per new billboard image, cached with it.

## 10. Strings (every string on Home v2, in one place)

Eyebrows: `GAME NIGHT`, `THE MORNING AFTER`, `YOUR TEAM`, `GÓÐAN DAGINN`, `GÓÐAN DAG`, `GOTT KVÖLD`, `PICK UP WHERE YOU
LEFT OFF`, `UP NEXT`, `NEW SEASON · ADDED TODAY`, `TOP PICK FOR YOU · THRILLER`, `POPULAR ON YOUR PROVIDER`, `WELCOME TO
AIRGLOW`, `GRIZZLIES AT JAZZ · TIP-OFF 01:00`, `GRIZZLIES AT JAZZ · NBA LEAGUE PASS 4`, `GRIZZLIES AT JAZZ · MON 26 OCT ·
LATE`, `GRIZZLIES AT JAZZ · FINAL`, `YOUR TEAM · THU 23:30`.
Chip: `2ND 4:12` / `live · synced`, `live`, `HALF`, `ON NOW` / `until you watch`, `49 MIN` / `to tip-off`, `23:30` /
`tip-off`, `REPLAY` / `no spoilers`, `END` / `no spoilers`, `1ST 8:20` / `you stopped here`, `FINAL` / `full time` /
`after overtime`, `scores unavailable`.
Plate: `VS`, `Score hidden`, the score.
Fan line: `3rd in the West · 3 in a row · Morant 27.8 ppg`, `⊘ as of tip-off`.
Buttons: `Watch live`, `Watch pre-game`, `From tip-off`, `Watch from tip-off`, `Box score`, `Reveal score`, `Game page`,
`Choose channel`, `Open guide`, `Pick the channel`, `Resume`, `Back to live`, `Start over`, `Details`, `Play`, `Play S4 ·
E1`, `Series page`, `Save`, `Saved ✓`, `Watch again`, `Remind me`.
Captions: `NBA League Pass 4`, `Hold OK for 2 more channels`, `No channel found yet` / `Your pick is remembered`,
`Replays for 3 days`, `No replay yet` / `airglow keeps looking`, `W 112–104`, `4K HDR from Northlight`, `Also on your
provider`, `From your provider`, `Also from Cinemeta`, `Icelandic subtitles`, `Needs a connection to play`, `Back
cancels`, `Reminders come with the next update`.
Meta: `S1 · E3 · "Signal" · 49 min · 4K · 21 min left · Ends 21:03`, `★ 7.8 · 2024 · Thriller · 2h 06m · 4K · Ends
23:16`, `Season 4 · 10 episodes · ★ 8.2 · Drama · You watched up to S3`, `A minute or two the first time · Home fills in
as they land`, `Stopped in Q3`.
Rows: section 4.1's titles and subtitles; `Series to start`; `Your team`; `1 live · 1 later · 3 final`, `5 final · yours
hidden`, `4 later`, `As of 20:12`.
Cards: `NEW`, `NBA · REPLAY`, `Added today`, `Yesterday`, `Film`, `May show results`, `Ended`, `Final`, `hidden`,
`tip-off`, `1ST 9:41`, `See all`, `214 more`, `Saved`, `Name hidden`, `Lakers 2-2 · Game page`.
Menus: section 6. Settings: section 8. Offline: `Offline · showing what airglow remembers`. Context line: `Home · <row>`.

## 11. Self-check (`node tools/audit.js`; ring data in `tools/audit-rings.json`)

On all 20 mocks, 0 findings: one focus ring per screen (none on the progress screen and the storyboard, which say so);
no two texts overlap; no text touches a box it is not in; nothing clipped; nothing but art and rails outside the safe
area; contrast 4.5:1 on every flat ground (the team fields and the ambient ground included); the ring read back from the
pixels on all four sides; no amber, yellow or non-LIVE red; 24 h clocks; SPOILER on every shield mock (no score, result
word, OT or end time outside `data-other`); CONTAIN; TRUNC; RAILFOCUS; RINGTEXT; team colour never under a ring; and the
Home checks: **PRIMARY**, **ORDER**, **PEEK** (a peeking row's body text hidden, nothing sliced by the edge), **BAR**
(the bar away and the context line on only when scrolled; the billboard hidden, not unmounted), **HERO** (the column
ends before x 600, the buttons at y 232 to 276), **SLABTXT**, and the v1.1 ones: **LINES** (one line each: card title
and meta, billboard meta and fan line, row title, game status; review 1), **RECORD** (partial records under the shield;
review 3), **LIVEBG** (the pixels around every LIVE pill are dark canvas; review 6), **DATA** (no art on a channel card;
review 4). `--inject` plants a second primary, a swapped row order, a visible caption in a peek row and a score on each
shield mock: 61 findings, every check fires.

## 12. Acceptance

| ID | Task | Result |
|---|---|---|
| H-P1 | Cold launch on a game day to your team's stream | 1 (OK on Watch live); 2 with Choose channel |
| H-P2 | Launch on a game day to resume | 2 (▼, OK) |
| H-P3 | Launch with no game to resume | 1 (Resume focused) |
| H-P4 | Launch with nothing in progress to something to watch | 2 (Details on the pick, then Play); 1 with ▶ Play |
| H-P5 | Watch another live game from Home | ▼ ▼ (the NBA row), OK = 3 on its first live card; +1 per card to the right |
| H-P6 | Home to a favourite channel | Channels is the last row (owner decision 14.2): ▼ × (rows on) then OK; Live is one tab away, digits tune directly |
| H-P7 | Remove a title from Continue watching | hold OK, ▼ × 4, OK = 6; `Mark watched` is 5 |
| H-P8 | Switch a row off | Account, Home rows, the row, OK |
| H-P9 | Back to the thing you came for from deep in the rows | 1 (Back → the billboard's primary) |
| H-F1 | One ring; nothing steals focus; the billboard's kind never changes under the thumb | 3.1's lock, the audit's PRIMARY |
| H-F2 | A row never inserts above the focused row | section 7 |
| H-B1 | No spoiler on any Home surface under the shield | section 7, audit SPOILER + RECORD on every shield mock |
| H-Q1 | No collisions, clipping or safe-area misses | 20 pages, 0 findings |
| H-D1 | Nothing drawn that the app cannot fill | section 9; audit DATA; the poster-left and poster-upright fallbacks mocked |
| H-L1 | Home interactive within 2 s of a warm start | the billboard and row 1 are the first paint; rows 3+ after `launchDone` (9.1); to measure on the TV |

## 13. Port notes (for the engineer; no app code was written in this round)

1. `screens/home.js`: `draw()` becomes billboard + rows from one row plan (`rowPlan()` returns `[{id, title, sub, kind,
   items}]` honouring Account > Home rows); `ROW_TOP` goes, row tops are computed from the kinds' pitches; `placeRails`
   gains the lift rule and the end clamp; every row mounted once, hidden off screen; the idle-time fill of rows below.
2. `cards.js`: `wideCard` (continue, poster-left, new episode, channel, replay) replaces `liveCard` / `contCard`'s `.hc`
   markup; `poster` gets `named`; `nextGameCard`; the billboard builders (`bbGame` with the fields, plate and chip,
   `bbContinue`, `bbDiscover`, `bbNewSeason`, `bbNext`, `bbWelcome`); `field()` next to `teamPalette` in `util.js`.
3. `app.css`: append `home-v2.css`; drop `.hc` and the `.rail.peek .hc` rules once nothing uses them; the grain url
   becomes `brand/sprites/grain.png`.
4. **Native (scoped, later):** image sizing for provider JPEGs (`shouldInterceptRequest` on image requests → decode with
   `inSampleSize` to the slot, disk cache; a test with a 2000 px poster showing the decoded size); `command('palette',
   url)` → `{hex}` with AndroidX Palette on the cached image for 3.8 (fallback bg-1). Each gets a PORT-NATIVE note and an
   emulator check.
5. `catalog.js`: `recentlyAdded(days)`, `newEpisodesFor(seriesIds)` (9.3), `filmsForTonight(now)`, `inLanguage(lang)`,
   `named4K()`; `addons.js` exposes `popularCatalog()`, `background` / `logo` by IMDb id and `videos[].released`.
6. `state.js`: `hiddenFromHome`, `notInterested` (30 days), `homeRows` (order and toggles), `dailyPick` (date, id),
   `backdrops` (title key → url, date), `ambient` (url → hex), `greeting`.
7. `tests/tv/`: a Home walkthrough script (billboard kinds, row order, Remove from Home, the rows setting, the clamp).

## 14. Decisions for the owner

**Answered (28 Oct):**
1. **The discovery pick's OK opens `Details`**, not Play. `Details` is the primary and focused; `Play` second.
2. **The Channels row is last.**
3. **Icelandic is a row of its own, `Á íslensku`**, named in Icelandic, from the provider's language tag, category and
   Icelandic audio tracks.

**Open (the design's choice stands unless he says otherwise):**
4. The greeting in Icelandic by default (3.7); English or Off in Account > Languages.
5. Game night's team fields at 55 % strength (3.2); the reviewer may ask for less on the OLED.
