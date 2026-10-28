# airglow TV: Home v2, v1.2

The design spec for the new Home tab: a billboard that is the thing you came for, then rows in the order they matter,
with the channels at the bottom. It replaces `design/ui-v1/UI-SPEC.md` 5.2 (Home) and keeps everything else of that
spec, of `nba-pages/SPEC.md` (the shield's seen model, team identity) and of `catchup/SPEC.md` 5.1 (the hero's catch-up
rows). Where this spec and those disagree about Home, this spec wins.

- **The mocks** are real HTML at the 960 × 540 canvas. They link the app's own `app/tv/brand/tokens.css`, `ui.css`,
  `app.css`, `nba.css` and `design/ui-v1/catchup/catchup.css`, plus `home-v2.css` (the new classes, all `hv-`, written to
  be appended to `app/tv/app.css`).
- **The scenario is one timeline** (`tools/build.js` `TL`, `SLATE`), and every mock is derived from it: the owner's TV,
  Reykjavik time (UTC all year), shield `My team`, languages Icelandic then English, Stremio signed in (Cinemeta plus a
  debrid add-on, "Northlight"). The Grizzlies: W at Kings Sat 24 Oct · late (seen only in `home-morning` and later; the
  Kings replay is unfinished in the `home-backlog` what-if), W at Jazz Mon 26 Oct · late (tip-off 01:00 on the 27th), next
  at Trail Blazers Thu · late, then Kings at home Sat · late. The 26 Oct slate is the real one (`nba-pages/data.json`,
  six games from 23:00 to 02:00); its states at each mock's clock are computed from the tip-off times. The 27, 28 and
  30 Oct slates, the provider's channels, guide, titles and scores are stand-ins (the kit's fictional titles and
  procedural art). Each page carries its facts in `<meta name="tl">` and the audit reads them back (section 11).
  **Only data the app has is drawn** (section 9).
  - **Game night**, Tue 27 Oct: 01:52 Q2 `home-live-hidden` (the lead mock), `home-live` (shield Off, or after Reveal);
    02:35 `home-behind`; 00:11 `home-pre`, `home-pre-choose`; 03:40 `home-final-seen`. Two what-if home games at 00:52:
    `home-home-rockets` (a red opponent), `home-home-nuggets` (a navy one). `home-live-entry` is the entry motion.
  - **The morning after**, Tue 10:40: `home-morning`; the backlog what-if `home-backlog` (two unseen games).
  - **The same evening**, Tue 20:41 (the game billboard expired at 18:00): `home-evening`, `home-late` (23:42).
  - **A normal evening**, Wed 28 Oct 20:41: `home-new-episode`, `home-new-season`, `home-upnext`, `home-browse`,
    `home-scrolled`, `home-channels`, `home-card-menu`, `home-offline`, `home-m3u` (a playlist account).
  - **Nothing to continue**, Fri 30 Oct 21:10: `home-discover`; **first start**: `home-first`, `home-welcome`.

| File | What it is |
|---|---|
| `RESEARCH.md` | what Netflix, Apple TV, Google TV, Disney+, Max, Plex, Infuse and Stremio do, what makes them beautiful, and what carries over |
| `SPEC.md` | this |
| `BRAND-CHECK.md` | every mock against the brand rules, the departures argued |
| `REVIEW-independent.md`, `REVIEW-independent-2.md` | the reviews of v1.0 (6.4) and v1.1 (6.8) that v1.1 and v1.2 answer |
| `*.html` (26) | the mocks; `png/*.png` are their 2× renders, `png/contact-sheet.png` shows them all |
| `home-v2.css` | the new CSS |
| `tools/build.js` | builds every mock from the one timeline, and `tools/pages.json` |
| `tools/render.js` | the PNGs and the contact sheet |
| `tools/audit.js` | the self-check (section 11); `--inject` plants a fault for every check |

## v1.2 changes: an answer to every point of review 2

| Review 2 | Answer (where to see it) |
|---|---|
| **1. The fan line leaked results through the shield** (seed, streak and average copied at the wrong tip-off while an earlier game was unseen). | The rule is now `recordFor`'s (3.2): **while any team game is unseen** the record is partial, the fan line drops the seed and the streak, keeps the leader's average, adds the next game, and the copy is the **earliest unseen game's** tip-off copy, named: `Morant 27.8 ppg · Next: Thu · late at Trail Blazers ⊘ as of tip-off, Grizzlies at Jazz` (`home-morning`); in the backlog it names the Kings game (`home-backlog`). When every earlier game is seen, the line is full (`3rd in the West · 3 in a row · Morant 27.8 ppg ⊘ as of tip-off`, `home-live-hidden`: the record is last night's and before). A losing run reads `2 lost in a row`; a run of 1 prints nothing. The audit's **FANLINE** fails a seed or streak while `tl.unseen` is not empty and a copy not named by its game; **RECORD** and **CONSIST** check the record is partial exactly when a game is unseen and equals the timeline's. The lead mock was wrong because its scenario was: the Kings replay was unfinished while the Jazz game was live. In the one timeline the Kings game is seen on Sunday; the unfinished-replay case is its own mock (`home-backlog`). |
| **2. Game-night mode was blue on blue, the LIVE pill and the rings sat on team colour, and the fields were gradients.** | The billboard is rebuilt as a **band** (3.2): the status row sits on solid bg-0 (y 84 to 108; the top 116 px are canvas), the two fields are a hard-edged band from y 116 to 222 with the 12° split through it, and the buttons sit on bg-0 below (y 236 to 280). No scrim touches the fields: they are flat tints (the primary at 55 % over bg-1, darkened to 4.5:1 for chalk), grain over them. The **clash rule** (`fieldPair()` in `tools/build.js`, the same rule for `util.js`): when the two fields are within ΔE 24 or 28° of hue, the **opponent's** field goes neutral surface-1 and the split's two 4 px secondary edges tell the teams apart; your team always keeps its colour (`home-home-nuggets`: Memphis blue, Denver neutral, gold and yellow edges). A Grizzlies **home** game against a red team is mocked (`home-home-rockets`): the Rockets' crimson on the left, the pill above and the rings below on the canvas. The audit's **LIVEBG** now samples the rendered pixels 8 px around every LIVE pill (the ground must be within 28/255 of bg-0), and a planted pill on a field fails it. |
| **3. A backlog of unseen games was not handled.** | 3.1 gains the rule: when more than one team game is unseen, the billboard is the **oldest** (`Resume` on the Kings replay), the status row says `1 more after this`, the newer game is card 1 of Continue watching (`Score hidden`), and the record counts the seen finals only (`2-0 ⊘`); `home-backlog`. `home-final-seen` no longer has an unfinished older replay: in the timeline the Kings game is seen. |
| **4. The game billboard could own Home most of the week.** | 3.1 caps the morning-after billboard at **12 h after the final or 18:00 the same day**, whichever is first; after that the hidden game is card 1 of Continue watching and the title billboard returns (`home-evening`, Tue 20:41). Hold OK on the game billboard's primary offers **`Not now`** (the title billboard for this visit). The NBA row is row 2 only while a game is live or your team plays today; on other days it sits **below New in your shows** (4.1; `home-evening`, the rows setting says so). The owner's "not only sports": the mocks are now 9 game nights and 17 other screens. |
| **5. The audit passed visible defects** (truncated metas, the next-game card under its plate, a sliced row title, a hard seam, the peek's text outside the safe area, the chip's tight caption, `2nd` in lower case). | Card metas are `S1 · E3 · 21 min left` and `1h 17m left` (the episode's name lives on the billboard and the title page) and **NOTRUNC** fails any cut meta or next-game line; the next-game card's second line is `Lakers 2-2` alone (OK's meaning is in section 6); a row title under the cover is hidden, not sliced; `.hv-sy` is kept in the poster-upright billboard; a peeking row shows **art only** (crests, edges, tiles; every text hidden, so nothing sits outside the safe area; `home-scrolled`); the chip's captions are short (`not started`, `paused`, `no spoilers`) and measured, and the chip is **64 high, 112 wide at least, ~145 wide with `2ND 4:12 / live · synced`** (restated in BRAND-CHECK D2); the period is `2ND` in caps. New checks on every page: **LINES**, **NOTRUNC**, **COVERED** (any text under a button, card or plate), **SEAM** (no band text crosses the split), **PEEK** (no text in a peeking row). `--inject` plants a fault for every check and every one fires (528 findings on 26 pages; 0 clean). |
| **6. The scenario contradicted itself and the slate was not real.** | One timeline (`TL`) and the real 26 Oct slate (`SLATE`, six games with their tip-off times); every record, streak, seed, clock and game state is derived from it at the mock's time (`slateAt(now)`), so `3-0` with `3 in a row` on game night, `4-0` with `4 in a row` and `2nd in the West` after the win, `5-0` on Fri. The Kings replay is gone after Sunday; the channel on air agrees with the NBA row; `Because you watched Quiet Frequencies` (a film he finished). Every page carries `<meta name="tl">` and **CONSIST** reads it back: the record text equals `tl.mem`, partial iff `tl.unseen`, the streak ≤ the wins, the seed is the timeline's, the NBA row ordered live → upcoming → final, `In Xh Ym` agrees with the tip time and the mock's clock. |
| **7. Data the app does not have.** | **Runtime:** 9.3 adds `runtimeMinutes` from IMDb's `title.basics` to the weekly ratings file (`scripts/build-ratings.js` already reads the datasets); `A film for tonight` and `Ends` use it, else the `get_vod_info` / Cinemeta duration already cached, else the title is left out of the row and `Ends` is omitted. **`Also from Cinemeta`** is gone everywhere: captions are `From Northlight` / `On your provider` / `From your provider`. **New season** outranks Continue for the first visit after it lands (then holds 48 h behind Continue), and its mock has nothing of the show in Continue watching. **Ambient colour** (3.8) is computed in JS from a 32 px draw of the small copy (`w92` / `/small/`) with a CORS check and bg-1 as the fallback; no native call, no second download of the big image; marked optional. **Channel cards** carry a realistic logo in a 64 px tile (full-colour and white-on-dark wordmarks in the mocks), the number on every card, the two-letter tile only without a logo (`home-channels`). |
| **8. Performance claims not true of the code.** | 9.1 is rewritten against `util.js` `setHtml` (it compares the whole string and replaces `innerHTML`): Home is **one container per row plus one for the billboard's frame**, each with its own `setHtml`, so a data event redraws only the rows whose markup changed; the billboard's live values (score, chip, `Ends`, the NBA row's clocks) are **named nodes updated with `textContent`** and the 30 s tick touches only those, never a `setHtml`. Images beyond the next row keep `data-src` and get `src` when their row comes within one row of the focus (`loading="lazy"` is not relied on). The entry animation is optional with a measured fallback (H-L1). |
| **9. Focus and remote details.** | The primary stays `Watch live` (the owner's catch-up decision 7) but **remembers his last choice** for his team's games: after he picks `From tip-off` once, it is the primary on the next game night while a replay source exists. `Reveal score` opens a one-step confirm `Reveal Grizzlies at Jazz?` (`Reveal` · `Keep hidden`), as the hub's Reveal names its game. The hold menu's card stays **lit above the dim** with the menu titled by the card (`home-card-menu`). A live, unshielded game card on Home shows **▶ beside LIVE** (OK = Watch live; `home-live`). On an **M3U** account Channels is row 1 (`home-m3u`), and the dead `Remind me` is left out until NEXT.md 1 ships. |
| **10. Copy and brand.** | `FINAL` / `W 112–104` on the chip (no caption repeating it; `after overtime` when so); the greeting is a separate word with a dot (`GOOD EVENING · PICK UP WHERE YOU LEFT OFF`), **English by default** (the owner, 14.4); `LAST NIGHT` on the morning-after eyebrow (the night rule stays in lists); the hidden game is left out of the NBA row while it is the billboard; the bar's NBA pill is dropped while Home's billboard is live (two pills at most); RESEARCH and this spec no longer say "nobody prints" the end time (Plex, Infuse, Kodi and Jellyfin do, on the player) or "no other app says" a greeting; BRAND-CHECK D2 restates the chip. |

**The owner's answers** (section 14): the discovery pick's OK opens **Details**; Channels **last** (first on a
playlist account); Icelandic as its own row **`Á íslensku`**; the greeting is **English** (`Good evening · Pick up
where you left off`), with Icelandic and Off as choices in Account > Languages.

## The ideas (the owner: "be creative", "not only sports", "unique, innovative, beautiful, easy")

Each is its own mock, buildable in the WebView, fillable from data the app has, and marked **core** (in the build) or
**optional** (after the core, if the owner wants it).

| | Idea | Mock | What it is | Core / optional |
|---|---|---|---|---|
| A | **Game night as a mode** | `home-live-hidden` and the game mocks | On the nights the Grizzlies play, Home changes shape: the two teams' colours as a band, the crests big, `GAME NIGHT`, the chip, the fan line that knows where his team stands without telling the score; `THE MORNING AFTER` with `no spoilers` the next day; capped so it never owns the week | core |
| B | **The doors** (`Browse your library`) | `home-browse` | A row of doors into a 4,812-film library: each a 2 × 2 mosaic of its first four posters with a label and a live count (`90s thrillers · 212 films`, `Under 90 minutes`, `Top rated, 2020s`, `Á íslensku`, `In 4K`, `Series with 3+ seasons`, `New this month`, `Surprise me · One unseen film, rated 7+`). OK opens the Movies or Series shelf with those filters set. No other TV home lets you walk into a library by its shape; it answers "I have 5,000 films and nothing to watch" (4.4) | core |
| C | **`Where you were`** | `home-evening`, `home-late` | A continue billboard carries the episode's own one-line description from Cinemeta under the meta (`WHERE YOU WERE · Mei traces the burst to a demolished stadium.`), so a show picked up after a week makes sense before you press Resume | core |
| D | **The shield as a visible mode** | `home-morning`, `home-evening` | When a result is being kept from him, the NBA tab wears the eye-off, the chip says `no spoilers`, plates say `Score hidden`, cards say `Score hidden`: the whole screen tells him the shield is doing its work, and nothing on it can slip (7, 11) | core |
| E | **`New tonight`** | `home-new-episode` | A show he is current on gets an episode today: the billboard is that episode for the first visit after it lands, with the show's logo, the episode's line and `Ends 21:31`, Play focused | core |
| F | **Late mode: `Something short before bed`** | `home-late` | After 23:00 `A film for tonight` hides (nothing ends before midnight) and a row of episodes under 45 minutes from his shows moves up under Continue watching; `Ends` reads past midnight. The same data, a different evening | optional |
| G | **Ambient colour** | `home-evening`, `home-new-episode` | The title billboard's ground takes the artwork's own colour, flat and deep, so a cold series and a warm film give Home a different mood; computed in JS from a 32 px copy, cached (3.8) | optional |
| H | **The game-night entry** | `home-live-entry` | Once per visit the two fields slide in from their sides (280 ms, transform and opacity only); measured on the panel, with a fade as the fallback (3.9) | optional |

## 0. The idea in one paragraph

Home opens on one big thing: your team's game when there is one (live, about to start, or last night's replay under the
shield, for the morning only), else the episode or film you are in the middle of with a line about where you were, else
tonight's new episode or season of a show you follow, else a title you have not seen, chosen for you and said plainly
why. Under it, rows in the order they matter to one person: what you were watching, new episodes of your shows, the NBA
(second on game days), titles like the last one you finished, a film for tonight, top picks, the doors into the whole
library, what is new, 4K, Icelandic, what you saved, and last of all the channels. Every row says why it exists, hides
when it is empty, and can be switched off or moved in Account > Home rows. Nothing plays by itself, nothing rotates
under your thumb, and the spoiler shield covers every card the same way it covers the rest of the app, and shows that it
does. On game nights Home changes shape; on other nights it is the pictures, the greeting and the time the film ends.

## 1. Decisions (each answers to UI-SPEC 1's principles; the research is in RESEARCH.md)

1. **One billboard, no carousel, no timer.** The focused button is the thing you came for and never changes its meaning
   on its own (UI-SPEC principle 4). A discovery pick changes once a day, between visits, never while Home is on screen.
2. **Continue watching is row 1 whenever it has items** (Plex's rule, Apple's Up Next). On a game day the game is the
   billboard, so resume is Down, OK. When nothing is in progress the row is simply absent; nothing says "empty".
3. **The channels go last** (owner, 14.2), first on a live-only account (there they are the content).
4. **Every row names its reason** in its title or subtitle. No "Recommended for you" without saying from what.
5. **No trailers, no previews, no motion on the billboard** beyond the entry, the focus lift and the 12° wipe when a game
   changes state. The opt-in muted slab preview of UI-SPEC 3.5 stays as it is, on the game billboard's plate.
6. **Art first, and only real art.** Backdrops from Cinemeta / TMDB, stills from the add-on, posters from the provider,
   logos from the provider; a poster is never stretched, blurred or mirrored; a channel never gets invented art.
7. **Two card sizes and one game card.** Wide 198 × 111 for things in progress, new episodes, doors and channels; 2:3
   posters 124 × 186 for titles; the NBA hub's 272 × 124 game card unchanged.
8. **The shield covers Home exactly as it covers the hub** (nba-pages 8, catch-up 7), and Home shows that it does (D).
9. **Rows are a setting.** Account > Home rows lists every row with a toggle and its place; hold OK moves it. Continue
   watching is pinned first. Thin rows (fewer than 3 items) hide themselves until they fill.
10. **Cheap to draw** (section 9): one container per row, live values re-texted, images at slot size, nothing re-laid out
    on a focus move, nothing rebuilt on a tick.
11. **Two moods, one app, and the sports mood is capped.** Game night is a mode for the hours around a game and the
    morning after; by 18:00 Home is the pictures again. The NBA row is second only on game days.
12. **A library you can walk into.** The doors row turns the catalog's own counts into places to go (B).

## 2. Layout (960 × 540, safe x 48 to 912, y 27 to 513)

| Element | Geometry |
|---|---|
| Top bar | as UI-SPEC 3 (y 32 to 72), over the billboard under the top scrim (`.hv-st`, 0 to 96, bg-0 86 % to 0) on a title billboard; on the game billboard the top 116 px are **solid bg-0** |
| Billboard `.hv-bb` | x 0 to 960, y 0 to 292, full-bleed. Title states: the backdrop under `.hv-sx` (left to right, the detail page's stops, starting in the ambient colour) and `.hv-sy` (bottom 150 px to bg-0), the ground behind the column the ambient colour fading to bg-0 by x 672. Game states: the band (below) |
| Column `.hv-col` | x 48, y 84, width 540: eyebrow (22 high) · title Outfit 700 34/40, 2 lines at most, or the show's logo (56 high at most, 360 wide) · meta 15/20 · the plot or `Where you were` 16/20, 2 lines (1 with a logo) · the progress bar 320 wide (continue) |
| Buttons `.hv-btns` | x 48, y 232 to 276 (game: 236 to 280), gap 20; primary `.btn` first and focused; a 14 px caption of one or two lines after the last button when there is one |
| Game band | **status row** y 84 to 108 on the canvas (`GAME NIGHT` · LIVE · the matchup · the channel or the tip time · `1 more after this`); **the band** y 116 to 222: the away field x 0 to the split, the home field from the split to 960, the split at 12° (x 457 to 503 across the band's height) drawn as the two teams' 4 px secondary edges; hard edges top and bottom, no scrim; `grain.png` over both; crests 72 in the neutral disc at x 48 and ending at x 912, names Outfit 700 28 with the record under (the eye-off when partial); the **score plate** 236 × 64 in the middle (bg-1 at 92 %, 12°) with the **clock chip** 64 high (112 wide at least, ~145 with `2ND 4:12 / live · synced`: the gradient, 12°, Barlow 28 and a 14 px caps caption) attached at its right; the **fan line** y 198 to 216 (15 px chalk) on the away field, ending before the split; the copy's label (`⊘ as of tip-off, Grizzlies at Jazz`, 14 px text-2) right-aligned on the home field |
| Row block | title Outfit 700 22/28 at x 48 (+ a 14 px subtitle), the cards 10 px below (12 for posters), then 24 px to the next block. Pitch: wide 173, game 186, poster 302 |
| Row 1 | title y 298, cards y 336 |
| Rails | `.track` flex, gap 24, first card at x 48; cards past x 912 bleed (the peek); a card that slid out on the left is clipped at x 36 |
| Cards | wide `.wc` 198 × 111 radius 16; game `.gc` 272 × 124; poster `.pc` 124 × 186 radius 12 + caption 14 px below; door `.wc.dr` 198 × 111; end card same box, dashed |
| Scrolled | the page `translateY` so the focused row's title sits at y 84, clamped so the last row's cards end 6 px above the safe line; the bar is away; the billboard hidden in place; `.hv-cover` (0 to 84) hides the row above (its title set hidden, never sliced); `.ctxline` "Home · <row>" at y 27; `.hv-edge` fades the last 34 px |
| Offline pill | `.offline-bar` top right under the bar (y 84 to 116, right edge 912) |
| Hold menu | `.hv-dim` bg-0 at 60 % over the page, the card lit and lifted above it (`.wc.lit`, no ring), the kit's `.ctxmenu` titled with the card beside it, inside the safe area, never over the billboard's primary |

**Lift rule.** A row's cards must end at y ≤ 513 with their ring when the row is focused. Rows 1 of the wide and game
kinds do; a poster row directly under the billboard does not (336 + 186 = 522), so focusing it lifts the page by the
overshoot and hides the bar like any lift; Up from it puts the page back and the billboard's primary takes focus. A
**peeking row** (its cards cross the safe line) shows **art only**: crests, edges, tiles and badges that are whole on
screen; every text is hidden (so nothing sits outside the safe area); under 26 px of card on screen it shows the card's
edge alone; its title shows only when the title ends by y 513.

## 3. The billboard

### 3.1 Priority (what shows when)

Decided from cached data before first paint and locked for 3 s after the launch (UI-SPEC 5.2); its *content* (a score,
a clock) updates inside the lock, its *kind* does not.

| # | When | Kind |
|---|---|---|
| 1 | `Your team first` is on and your team's game is within its window: 3 h before tip-off to 30 min after the final; the behind-in-a-replay row until tip-off + 3 h 30 | **Game** (3.2) |
| 2 | Your team's last game is hidden (shield) with a replay, from 30 min after the final until the buzzer plays in a replay, you reveal it, the replay expires, **12 h pass or it is 18:00 the same day** (whichever is first), or the next game's window opens. After that the hidden game is card 1 of Continue watching | **Game, the morning after** (3.2) |
| 2b | More than one team game is unseen | the **oldest** one as kind 1 or 2, `1 more after this` in the status row; the newer one is card 1 of Continue watching |
| 3 | A show you are current on (every earlier episode seen) got a new episode today, or a show you finished or saved got a new season in the last 48 h, and you have not opened Home since it landed | **New tonight / New season** (3.5), the first visit only; after that New season holds 48 h behind kind 4 and the episode is card 1 of New in your shows |
| 4 | Something is in progress (a film, an episode, a replay) and was touched in the last 7 days, or the next episode of a show you finished an episode of in the last 7 days | **Continue / Up next** (3.3) |
| 5 | A new season (as 3) within its 48 h, nothing in progress | **New season** |
| 6 | None of the above and the catalog has loaded | **Discover** (3.4): the day's pick |
| 7 | No films or series on the account (a live-only playlist), nothing to continue, your team has a next game | **Your team's next game** (3.5) |
| 8 | The channel list has not loaded yet (first start, or a cold cache) | **Welcome** (3.6) |

**`Not now`:** hold OK on a game billboard's primary offers `Not now` (first in the menu, after the sources): the title
billboard (kinds 3 to 6) takes its place for this visit; the game stays card 1 of Continue watching. Row 1 of a kind-1
or kind-2 Home is Continue watching when it has items, so resume stays two presses away.

### 3.2 Game: game-night mode (`home-live-hidden`, `home-live`, `home-behind`, `home-pre`, `home-pre-choose`, `home-home-rockets`, `home-home-nuggets`, `home-morning`, `home-backlog`, `home-final-seen`)

The billboard is the matchup as a **band**: the **away team's field** on the left and the **home team's field** on the
right, split at 12° through the middle by the two teams' 4 px secondary edges; each field the team's real primary at
55 % over bg-1, darkened until chalk reads at 4.5:1 or better (`field()` in `tools/build.js`; `util.js` gets the same
rule), `grain.png` over both, hard edges, no scrim. The status row above and the buttons below sit on solid bg-0, so
no LIVE pill and no focus ring ever touches a team colour (audit LIVEBG, from the pixels). The crests sit in the
neutral disc (72 px, never recoloured). The **score plate** in the middle is bg-1 at 92 % with the 12° skew, holding
the score (Barlow 800 italic 56) or `VS` or the `Score hidden` tile; the **clock chip** attached to its right is the one
pink-to-orchid slab on the screen (64 high, 112 wide at least), ink text: a Barlow line and a 14 px caps caption.

**The clash rule.** When the two fields are within ΔE 24 (CIE Lab) or 28° of hue, the **opponent's** field is drawn as
neutral surface-1 and the split's secondary edges carry the difference; your team keeps its colour whether it is home or
away (`fieldPair(away, home, mine)`; `home-home-nuggets`). Against a red or orange opponent nothing changes: the pill and
the rings are on the canvas by construction (`home-home-rockets`).

**The fan line** (chalk, on the away field, ending before the split) and the copy's label (on the home field):
- Every earlier team game seen: `3rd in the West · 3 in a row · Morant 27.8 ppg`, from `league.js` standings and leaders
  and the seen finals; under the shield the copies taken at this game's tip-off, labelled `⊘ as of tip-off`. A losing
  run reads `2 lost in a row`; a run of 1 prints nothing.
- **A team game unseen** (`recordFor` partial): no seed, no streak; `Morant 27.8 ppg · Next: Thu · late at Trail
  Blazers` from the copy of the **earliest unseen game** (`pinView(['MEM'])`), labelled by its game: `⊘ as of tip-off,
  Grizzlies at Jazz` (`home-morning`), `⊘ as of tip-off, Grizzlies at Kings` (`home-backlog`). The records are partial
  with the eye-off. Audit FANLINE, RECORD, CONSIST.

The state table (UI-SPEC 5.2 and catch-up 5.1, unchanged in meaning):

| State | Status row | Plate | Chip | Buttons (primary first, focused) | Caption |
|---|---|---|---|---|---|
| Pre, channel known | `GAME NIGHT` · `GRIZZLIES AT JAZZ · TIP-OFF 01:00` | `VS` | `49 MIN` / `to tip-off` (minutes under 10 h, else the time) | `Watch pre-game` · `Game page` | `NBA League Pass 4` |
| Pre, no channel | same | `VS` | same | `Choose channel` · `Open guide` | `No channel found yet` / `Your pick is remembered` |
| Live, hidden | `GAME NIGHT` · LIVE · `GRIZZLIES AT JAZZ · NBA LEAGUE PASS 4` | `Score hidden` | `ON NOW` / `not started` (no period, no clock: catch-up S4) | `Watch live` · `From tip-off` (when a replay source exists) · `Reveal score`; the first two swap when his last choice was `From tip-off` | none |
| Live, revealed (shield Off, or after Reveal) | same + ◷ `Synced · 38 s` | `48 – 51` | `2ND 4:12` / `live · synced` (`live`; `HALF`; `scores unavailable` when ESPN is stale) | `Watch live` · `From tip-off` · `Box score` | `Hold OK for 2 more channels` when there is no `From tip-off` |
| Live, you are behind in a replay | `GAME NIGHT` · LIVE (on the clock) · the matchup · the channel | `Score hidden` | `1ST 8:20` / `paused` (his position, never the live clock: catch-up 7.2) | `Resume` · `Back to live` · `Game page` | none |
| Final, hidden, a replay exists (the morning after) | `THE MORNING AFTER` · `GRIZZLIES AT JAZZ · LAST NIGHT` (`SAT · LATE` when older) · `1 MORE AFTER THIS` in a backlog | `Score hidden` | `REPLAY` / `no spoilers` | `Watch from tip-off` · `Game page` | `NBA League Pass 4` / `Replays for 3 days` (`Replays until Tue`) |
| Final, hidden, you stopped partway | same | `Score hidden` | `3RD 6:41` / `paused` | `Resume` · `From tip-off` · `Game page` | as above |
| Final, hidden, no replay yet | same | `Score hidden` | `END` / `no spoilers` | `Game page` · `Pick the channel` | `No replay yet` / `airglow keeps looking` |
| Final, seen (or shield off), within 30 min | `YOUR TEAM` · `GRIZZLIES AT JAZZ · FINAL` | `112 – 104` | `FINAL` / `W 112–104` (`after overtime` when so) | `Box score` · `Watch again` (when a replay exists) | `NBA League Pass 4` |

Rules: the time is shown once; LIVE is the dot plus the word, on the canvas; while the billboard is live the bar's NBA
tab drops its own pill (two pills on screen at most: the status row and a peeking card); hold OK on any watch button
opens the sources sheet (catch-up 5.1) with `Not now` after it; **`Reveal score` opens a one-step confirm** sheet
`Reveal Grizzlies at Jazz?` · `Reveal` (focused) · `Keep hidden` (the hub's Reveal names its game the same way), and a
reveal marks the game seen for good. The muted preview of UI-SPEC 3.5 (opt-in) replaces the plate's content as a
rectangle under the plate's drawn edges; the chip stays. The hidden game is left out of the NBA row while it is the
billboard (Continue watching's rule).

### 3.3 Continue and Up next (`home-evening`, `home-late`, `home-upnext`, `home-offline`, `home-card-menu`)

| Element | String / rule |
|---|---|
| Eyebrow | the greeting (3.7) · `PICK UP WHERE YOU LEFT OFF` (continue) / `UP NEXT` (the next episode) |
| Title | the series name for an episode, the film's clean title, the matchup for a replay; 2 lines at most, then an ellipsis. When Cinemeta has a `logo` for the title, the logo (56 px high at most, 360 wide) replaces the text |
| Meta | `S1 · E3 · "Signal" · 49 min · [4K] · 21 min left · Ends 21:03` (the episode's own name in quotes; a film: `2023 · Drama · 1h 48m · [4K] · 1h 17m left · Ends 22:01`; a replay: `NBA · Replay · Stopped in Q3`, never minutes left, no ending time) |
| `Where you were` (C) | the label `WHERE YOU WERE` (14 px caps, text-2) and the episode's one-line description from the add-on's `videos[].overview` (Cinemeta), else the series' own line, one line, ellipsis; Up next shows the next episode's line under the label `NEXT UP`; a film shows its synopsis's first line; nothing when no line is known |
| Progress | the gradient bar, 320 wide (continue); none for Up next |
| Buttons | `Resume` (focused) · `Start over` · `Details`; Up next: `Play` (focused) · `Details`; a replay: `Resume` · `From tip-off` · `Game page` |
| Art | the title's backdrop; for an episode the episode still when the add-on has one, else the series backdrop |

The billboard's own title is not repeated in Continue watching. `Ends` is the clock at which the item ends if played
now (time left for a continue, the episode's length for Up next), rounded to the minute, hidden when the length is
unknown (9.3).

### 3.4 Discover (`home-discover`, `home-first`)

When nothing is in progress and no new season or episode waits: the day's pick, computed once a day (at the first draw
after 04:00, or when the catalog changes), from the titles that are **unseen** (not in History, not in Continue
watching, not marked watched, not `Not interested`), in his languages (`Shown first`), rated 7.0 or better where a
rating exists, from the provider's Popular sort (catalog.js `popular`) merged with the add-ons' Popular catalogs; ties
broken by a fixed daily seed so the pick holds for the day. A title with a backdrop wins over one without when the
scores are within 10 %.

| Element | String / rule |
|---|---|
| Eyebrow | the greeting · `TOP PICK FOR YOU · THRILLER` (the genre); on a first start `POPULAR ON YOUR PROVIDER · ANIMATION` |
| Title | as 3.3 |
| Meta | `★ 7.8 · 2024 · Thriller · 2h 06m · [4K] · Ends 23:16` (`Series · 2 seasons` for a series; `[IS]` when the title is Icelandic); `Ends` only with a known runtime |
| Synopsis | 2 lines of the add-on's or provider's description; 1 line when the title wraps to two |
| Buttons | **`Details` (focused, owner decision 14.1)** · `Play` · `Save` (`Saved ✓`, not focusable once saved) |
| Caption | the playable fact: `4K HDR from Northlight` / `Also on your provider` (the best copy's quality and source from copies RANKING.md; `From your provider` when only the provider has it) |
| Art | the backdrop; with only a poster, `.hv-pst` upright at the right (128 × 192, y 84) on the ambient ground, with `.hv-sy` kept so the ground fades into the rows |

`Play` plays the best copy as the title page's Play would; a series plays S1 · E1. Hold OK on `Play` opens the copies
sheet. `Not interested` (hold OK on the pick's poster in a row, or on the billboard's `Details`) removes the title from
the pick and the discovery rows for 30 days.

### 3.5 New tonight, New season, and your team's next game (`home-new-episode`, `home-new-season`, `home-m3u`)

**New tonight (E):** a series he is **current on** (every earlier episode seen, the last one within 60 days) gets an
episode today (9.3: the provider's episode `added`, or Cinemeta `videos[].released`). For the first visit after it
lands the billboard is that episode: eyebrow the greeting · `NEW TONIGHT · A SHOW YOU FOLLOW`; the show's logo
(Cinemeta) or its name in caps; meta `S3 · E8 · "Low Tide" · 49 min · Added today · Ends 21:31`; the episode's one-line
description; buttons `Play` (focused) · `Series page` · `Save`; caption the source (`From Northlight` / `On your
provider`, `Icelandic subtitles` when checked). After that visit it is card 1 of New in your shows.

**New season:** a series he finished (every episode of its last season seen) or saved gets a new season: the provider's
series `last_modified` moved and its season count grew (one `get_series_info`), or Cinemeta's meta lists a new season's
`videos` with `released` in the last 48 h. It outranks Continue for the first visit after it lands, then holds 48 h
behind Continue, or until he starts it. Eyebrow the greeting · `NEW SEASON · ADDED TODAY`; the logo or the name in caps;
meta `Season 4 · 10 episodes · ★ 8.2 · Drama · You watched up to S3`; buttons `Play S4 · E1` (focused) · `Series page`;
caption the source. New in your shows carries the other new episodes and says `Signal Hill S4 and 4 more`.

**Your team's next game** (no VOD, nothing to continue, no game today): the game-night band before its day: the two
fields, `VS` on the plate, the tip time on the chip, the fan line, `Game page` (focused) alone (no dead `Remind me`
until NEXT.md 1 ships; then `Remind me` second), caption the channel. Eyebrow `YOUR TEAM · THU · LATE AT TRAIL BLAZERS`.

### 3.6 Welcome (`home-welcome`)

Before the channel list is in: the ambient ground (bg-1 to bg-0), eyebrow `WELCOME TO AIRGLOW`, title `Your channels,
films and series are loading`, meta `A minute or two the first time · Home fills in as they land`, the caption `Back
cancels`, skeleton rows (flat surface-1 blocks, no shimmer) where the NBA row and Top picks will be. Nothing is focused
(a progress screen, UX-CHECK SF9); the first row to arrive takes focus only if nothing is focused yet, never away from a
button the owner reached.

### 3.7 The greeting (owner decision 14.4)

The first word of a title billboard's eyebrow is the time of day, in pink-text, followed by a dot: `GOOD MORNING` from
05:00, `GOOD AFTERNOON` from 12:00, `GOOD EVENING` from 18:00 to 05:00. Account > Languages > `Greeting`: **English**
(default) / Icelandic (`GÓÐAN DAGINN` from 05:00, `GOTT KVÖLD` from 18:00; the owner can say whether `GÓÐAN DAG` belongs
at noon) / Off. The game billboard has no greeting: `GAME NIGHT` is its word.

### 3.8 Ambient colour (G, optional)

A title billboard's ground, behind the column and under the left scrim, is the artwork's own colour, flat (`--amb`,
darkened to L 24 % at 40 % chroma, with a deeper step `--amb2` at the far left). It is computed **in JS**: the small
copy of the image (TMDB `w92`, metahub `/small/`) is drawn to a 32 × 18 canvas with `crossOrigin="anonymous"` and the
average of the saturated pixels is taken; if `getImageData` throws (no CORS header), the host is marked and bg-1 is used
from then on (the first build checks TMDB and metahub once on the TV). One draw per new billboard image, cached 30 days
with the backdrop. No native call, no second download of the big image. The rows below stay on bg-0, so the canvas
never changes. The mocks derive the tint from the stand-in art's hue.

### 3.9 Motion (H, optional beyond the fades)

The billboard never animates on its own. **Entry:** on a title billboard the art settles (scale 1.04 → 1, opacity 0 →
1, 400 ms) once per visit; on game night the two fields slide in from their sides (translateX 240 → 0 px, opacity .3 →
1, 280 ms, the live wipe's easing) while the plate and crests settle (scale .96 → 1), then the ring lands
(`home-live-entry`). A kind change cross-fades 200 ms. A game state change inside the game kind plays the 280 ms 12°
live wipe once; a basket bumps the digits (scale 1.1 → 1, 200 ms, revealed state only). Focus moves: the ring swaps
instantly, the lift is 200 ms. Reduced motion: 120 ms fades. Transform and opacity only. **The field slide is measured
on the 55OLED810 first** (two full-width layers plus grain under a clip); if a frame is dropped it falls back to the
title billboard's settle (H-L1).

## 4. The rows

### 4.1 Order and hiding

Default order (Account > Home rows can switch any off and move 2 to 12):

| # | Row title | Subtitle | Card | Items | When it shows |
|---|---|---|---|---|---|
| 1 | `Continue watching` | – | wide | up to 16 | pinned first; hidden when empty; a hidden team game past its billboard window is card 1 (`Grizzlies at Jazz · Score hidden`) |
| 2 | `Tonight in the NBA` / `Last night in the NBA` / `Today in the NBA` | `1 live · 1 later · 3 final` (counts never spoil; `8 final · yours hidden` the morning after) / `As of 20:12` offline | game, next-game | your team's next game first (when it is not the billboard), then the slate ordered live, upcoming, final; the hidden team game left out while it is the billboard | **row 2 only while a game is live or your team plays today; otherwise below New in your shows** (`home-evening`); a slate exists today or yesterday, else the next-game card alone under the title `Your team` |
| 3 | `New in your shows` | `Signal Hill S4 and 4 more` when a season landed | wide | up to 12 | episodes added in the last 14 days to series he watched any episode of or saved (9.3) |
| 4 | `Because you watched Quiet Frequencies` | – | poster | 7 + `See all` | the last title he finished (or passed 80 % of) in the last 30 days; `moreLikeThis` scoring; unseen only; a new seed each time a title is finished |
| 5 | `A film for tonight` | `Under 2 hours · ends before midnight` | poster | 7 + `See all` | from 18:00 to 23:00: unseen films with a known runtime (9.3), rated 6.5 or better, in his languages, ending before 00:00 at the current clock; by rating. **After 23:00** the row is replaced by `Something short before bed` · `Under 45 minutes · from your shows` (F, optional): unseen episodes under 45 min of shows he follows and any film under 45 min left in Continue watching, as wide cards, moved up to row 2 (`home-late`) |
| 6 | `Top picks for you` | `Popular this week · Icelandic and English` (the `Shown first` languages, up to two) | poster | 7 + `See all` | Popular, in any of his languages, unseen, provider and add-ons merged with the [tv] mark; the day's pick leads it when it is not the billboard |
| 7 | `Browse your library` (B) | `4,812 films · 1,930 series · OK opens the shelf` | door | 8 | the doors (4.4); hidden on a live-only account and offline |
| 8 | `New on your provider` | `Last 14 days` | poster | 7 + `214 more` | movies and series by `added`, his languages first |
| 9 | `In 4K` | `Named 4K · checked when you open` | poster | 7 + `See all` | titles whose name or a copy says 4K (the dashed tag, Movies' rule); a checked copy gets the filled tag |
| 10 | `Á íslensku` | `Icelandic titles and sound` | poster | 7 + `See all` | the provider's language tag or category says Icelandic, or a copy has an Icelandic audio track; named in the language's own name, the first non-English `Shown first` language (owner decision 14.3) |
| 11 | `Saved for later` | – | poster | 7 + `Saved` | saved movies and series not started yet, newest save first |
| 12 | `Channels` | `Favourites and recent` | wide (channel) | up to 16 | favourites in Saved's order, then `recents`; the billboard's own channel not repeated. **Row 1 on a live-only (M3U) account** |

A row with fewer than 3 items hides (Continue watching and the NBA row show from 1). A title appears in at most one of
rows 4 to 11 (the earlier row keeps it) and never in a row while it is the billboard or in Continue watching. First
start only: `Series to start` (Popular series, unseen) in place of Because you watched, and the NBA row first (it needs
no history).

### 4.2 Naming the NBA row

`Tonight in the NBA` from 12:00 until the last game of the day has ended; `Last night in the NBA` from 04:00 until 12:00
when yesterday's slate exists; `Today in the NBA` for a day slate with a game before 18:00. The night rule of nba-pages
(a game after midnight belongs to the evening before, written `Sat · late`) names dates in lists and cards; the
morning-after eyebrow says `LAST NIGHT`.

### 4.3 The next-game card (`home-evening`, `home-discover`)

A game card with one matchup line: status `YOUR TEAM` (pink-text) · the day by the night rule (`Thu · late`, `Tomorrow`,
`Today`), the opponent's crest and `vs Kings` / `at Trail Blazers`, a second line with the opponent's record as the
shield lets it be seen (`Trail Blazers 1-3`), and the tip-off plate `02:00` / `tip-off`. OK opens the game page (section
6); nothing on the card says so, as nothing on a poster says "Details". It leads the row only while the game is outside
the billboard's window.

### 4.4 The doors (`home-browse`, B)

A door is a saved shelf: a filter set the Movies or Series tab can already apply, drawn as a wide card with a 2 × 2
mosaic of the shelf's first four posters (the tab's sort), a label (Inter 650 16) and a live count (14 px, text-2) over
the bottom scrim. The default eight, built from the catalog's counts at prep time (`catalog.js` `PREP`), each shown only
when its count is 24 or more:

| Door | Filter | Count line |
|---|---|---|
| `90s thrillers` (the genre × decade pair with the most unseen titles among his languages; a new pair each week by the daily seed) | genre, decade | `212 films` |
| `Under 90 minutes` | runtime < 90 (9.3) | `1,120 films` |
| `Top rated, 2020s` | IMDb ≥ 8.0, decade | `306 films` |
| `Á íslensku` | the language rule of row 10 | `38 titles` |
| `In 4K` | the named-4K rule | `640 films` |
| `Series with 3+ seasons` | season count ≥ 3 | `418 series` |
| `New this month` | `added` ≤ 30 days | `214 films` |
| `Surprise me` | one unseen film, IMDb ≥ 7.0, his languages, by the daily seed | `One unseen film, rated 7+` |

**OK** on a door opens the Movies (or Series) tab with the shelf's filters and sort set and the first card focused;
Back returns to the door. **OK on `Surprise me`** opens the pick's **title page** (never Play: he has not seen it, the
owner's rule for the discovery pick), and a second visit the same day gives the same film. Hold OK: `Open the shelf` ·
`Hide this door` (the setting lists the doors under the row). The row hides when fewer than 3 doors have their count.

## 5. Cards

| Card | Size | Contents |
|---|---|---|
| **Wide, continue** `.wc` | 198 × 111, radius 16, 1 px border | the backdrop or still (9.2) · title Inter 650 16 + one meta line 14 at the bottom over the scrim: `S1 · E3 · 21 min left` / `1h 17m left` (never cut: audit NOTRUNC; the episode's name lives on the billboard and the title page) · the gradient progress bar flush. **No backdrop:** `.wc.pst`: the poster upright at the left (74 × 111), the title and meta beside it on surface-1 |
| **Wide, replay** | same | the two teams' colours split at 120°, label `NBA · REPLAY`, the crests top-right, `Grizzlies at Jazz` · `Score hidden` with the eye-off (hidden) / `Stopped in Q3` (seen) (catch-up 5.2) |
| **Wide, new episode** | same | the episode still, label `NEW` · `Signal Hill` · `S3 · E8 · Added today` (`Yesterday`, `Mon`, `3 Oct`) |
| **Wide, channel** `.wc.chc` | same | **no art** (live TV has none; audit DATA): surface-2 with the provider's `stream_icon` in a **64 × 40 tile** top-left (the logo fitted inside at its own colours; the two-letter tile when there is no logo), LIVE beside it when a game is on it; **the number top-right on every card** · programme title + channel name at the bottom · progress of the programme. A channel carrying a game: the two teams' colours split at 120° with the crests top-right. No guide: the channel name as the title and nothing else; `May show results` with the eye-off under the shield (catch-up 4.3) |
| **Door** `.wc.dr` | same | the 2 × 2 mosaic, the label and the count (4.4) |
| **Game** `.gc` | 272 × 124 | nba-pages 5.3 / catch-up 5.3, with the period written `1ST 9:41`; **a live, unshielded game on Home shows ▶ beside LIVE** (OK is Watch live, section 6) |
| **Next game** `.gc.next` | 272 × 124 | 4.3 |
| **Poster** `.pc` | 124 × 186 + caption | the provider's or add-on's poster · `4K` top-left (filled when checked, dashed when only named) · a language badge top-right when not in his languages · the [tv] mark bottom-right when an add-on's title is on the provider too · a resume bar when started · caption: the clean title, then `2024 · ★ 8.4` (or the genre without a rating) |
| **End card** `.endcard` | the row's card box, dashed | `See all` (opens Movies or Series with the row's sort and filters set), `214 more`, `Saved` |
| **Masked** | wide or poster | a hidden game's video or a title that could tell: catch-up 5.8 |

Focus on every card: the ring + 1.05 lift; the first card grows to the right; captions sit 14 px under a poster. Under
a hold menu the source card is lit and lifted without the ring (`.wc.lit`); the menu's first row carries the ring.

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
  channel → tune (the zap ring is the group it came from); **a live, unshielded game → Watch live on `bestChannel`** (the
  ▶ on the card says so); any other game → the game page; next game → the game page; door → the shelf (`Surprise me` →
  the title page); end card → the list. OK on a billboard button does what it says. **OK means one thing per element;
  hold OK is always the menu.**
- **Hold OK menus** (titled with the card, first row focused, the page dimmed, the card lit):
  - continue card: `Resume` · `Start over` · `Details` · `Mark watched` · `Remove from Home` (the item leaves Continue
    watching and the billboard; History keeps it); a replay: catch-up 5.2's menu plus `Remove from Home`
  - new episode: `Play` · `Series page` · `Mark watched`
  - poster: `Save to Saved` (`Remove from Saved`) · `Details` · `Not interested` (30 days out of the discovery rows)
  - channel: `Save to Saved` (`Remove from Saved`) · `Open in the guide`
  - door: `Open the shelf` · `Hide this door`
  - live game: `Game page` · `Watch live` · the hub's `gameMenu` rows; other games: the hub's menu; next game: `Game
    page` (· `Remind me` once reminders ship)
  - billboard buttons: the watch buttons open the sources sheet (catch-up) with `Not now` after it; `Play` the copies
    sheet; `Details` offers `Not interested` on a discovery pick
- **`Reveal score`** on the billboard: the confirm sheet `Reveal Grizzlies at Jazz?` · `Reveal` · `Keep hidden`.
- **Back:** in the rows, scroll to the top and focus the billboard's primary; on the billboard, the Home tab (the tab
  rule); a third Back exits. A menu or the confirm closes to its card or button.
- **Digits** on Home tune a channel number as in Live (unchanged).

## 7. States

| State | What Home shows |
|---|---|
| Loading (cold start, nothing cached) | 3.6 Welcome |
| Loading (cache) | Home as last drawn, each row redrawn when its data event changes it (section 9) |
| A row's data not in yet | the row is absent, not a skeleton; rows appear in order as their data lands, below the focused row only (a row never inserts above the focus) |
| Nothing in progress | no Continue watching row; the billboard is a new episode, a new season or the day's pick |
| No NBA data (ESPN down) | the NBA row shows the cached slate with `As of 20:12`; a game billboard's chip reads `scores unavailable`; no LIVE pills |
| No add-ons | Top picks and Because you watched from the provider alone (no [tv] marks); captions say `From your provider`; no `Where you were` lines unless the provider sends a plot |
| No backdrop for a title | the poster upright (3.4 on the billboard, 5 on a wide card) |
| No runtime for a title | no `Ends`, not in `A film for tonight` or `Under 90 minutes` (9.3) |
| Offline with a cache (`home-offline`) | the billboard with `Needs a connection to play` (Resume stays focused: it leads to the diagnosis card, diagnosis SPEC), Continue watching, the slate marked `As of …`, the catalog rows; `New in your shows` and the doors left out (they need the provider); no LIVE pills, no clocks; the pill `Offline · showing what airglow remembers` top right, never focusable. Pages open from the cache; video needs the connection |
| Offline, no cache | the launch's offline card (UI-SPEC 5.11), not Home |
| Shield `My team` | the game billboard per 3.2; the hidden Grizzlies game left out of the NBA row while it is the billboard, else its card hidden (`8 final · yours hidden`), others with scores; studio shows `May show results`; matched videos masked in every row; no result word, no OT, no end time anywhere (audit SPOILER on every shield mock). **The shield as a mode (D):** while a result is being kept, the NBA tab carries the eye-off (`.hv-quiet`), the chip says `no spoilers`, every plate and card of that game says `Score hidden` |
| Shield `All games` | every game card hidden; the counts still show |
| Late (from 23:00) | `A film for tonight` hides; `Something short before bed` at row 2 (F); `Ends` past midnight reads `Ends 00:03` |
| Live-only playlist (M3U) (`home-m3u`) | rows 3 to 11 absent; the billboard is the game, a replay in progress, or the next game; then **Channels**, then the NBA row |
| Row switched off | gone; the setting's row says `Off` |

## 8. Settings: Account > Home rows (`home-rows-setting`)

Two panes as today. Rows:
- `Your team first` · toggle · `On game days your team's game is the big card on Home` (exists)
- `Tell me when my team is live` · toggle · `A quiet chip while you watch something else` (exists)
- the label `ROWS, IN ORDER`, then one 56 px row per Home row: the grip (none on the pinned row), its number, its title,
  one line on what it is (`Always first`, `Row 2 while a game is live or your team plays today, else here`, `New episodes
  of shows you watch or saved`, `Like the last title you finished`, `Under 2 hours, ends before midnight`, `Popular this
  week in your languages, unseen`, `Doors into the whole catalog`, `Added in the last 14 days`, `Named 4K, checked when
  you open`, `Icelandic titles and sound`, `Saved titles you have not started`, `Favourites and recent, at the bottom`)
  and the toggle with the word `On` / `Off`.
- The hint under the list: ⓘ `OK turns a row off or on · Hold OK moves it · 3 of 12, then Reset order`.
- **OK** toggles. **Hold OK** lifts the row (Saved's reorder: ring + 1.02, `▲▼` move it, OK drops it, Back puts it
  back). Continue watching has no grip and does not move. `Reset order` is the last row of the list; under the doors row
  the hidden doors are listed with `Show` (4.4).
- Account > Languages gains `Greeting`: English (default) / Icelandic / Off (3.7). Home redraws on the next entry, not
  while Account is open.

## 9. Data and performance (true of the code as it is)

### 9.1 Drawing (the new mechanism, for the port)
- **`setHtml` replaces `innerHTML`** when the string changed (`util.js`); it does not diff. So Home is not one string:
  it is **one container per row** (`#hv-row-<id>`, mounted once in the row plan's order) plus **one for the billboard's
  frame**, each with its own `setHtml`. A data event (`nba`, `progress`, `catalog`, `feeds`, `replays`, `favs`,
  `addons`, `league`) rebuilds the strings of the rows it touches and `setHtml` skips the ones that did not change; the
  busiest mock is 336 UI nodes, and a row is 8 cards.
- **Live values are nodes, not markup.** The billboard's score, chip line and caption, `Synced · 38 s`, `Ends`, the
  NBA row's clocks and `In 49 min`, and the progress bar's width carry `data-live="..."` and are updated with
  `textContent` / `style.width` by the 30 s tick and the score poll. **A tick never calls `setHtml`**; the markup of a
  row is only rebuilt when an item enters, leaves or changes state (a game going live), which also plays the wipe.
- **Every row stays mounted**; rows off screen are `visibility:hidden` (`.hv-row.off`) so nothing mounts or unmounts on
  ▼. Each row mounts 8 cards and appends the rest when ▶ reaches the sixth. Row heights are fixed per kind (section 2),
  so a row's position is arithmetic, never a layout read.
- **The billboard is hidden, never unmounted**, when the page scrolls (`.hv-bb.hv-hidden`), so its image is decoded once
  per visit (audit BAR).
- **Focus moves** change classes only (`.f`, the lift, the track's `transform`); no string is built on a key press.
- **No new CSS cost:** flat scrims, flat fields with hard edges, no filter, no mask on moving pixels, no shadow but the
  ring; transforms and opacity only; `will-change` on the focused card only.

### 9.2 Images (no native sizing exists today: `util.js` `sized()` rewrites TMDB URLs only)
- The app asks the CDNs for the size it draws: TMDB `w780` for the billboard and `w342` for cards and posters (the
  existing `sized()`); **metahub** `/background/medium/` for the billboard and `/poster/small/` for cards (new rules in
  `sized()` for `images.metahub.space`); ESPN logos at `500` as today. A provider's own JPEG arrives as it is.
- **Lazy by row, not by `loading="lazy"`** (Chromium's margin would load a 2,900 px page at once): the billboard and
  rows 1 and 2 get `src` at first paint; every other image is `data-src` and gets `src` when its row comes within one
  row of the focus, or in an idle callback after `launchDone` for row 3. A card draws its scrim and text first so
  nothing jumps.
- **Backdrops for Continue watching:** for each of the up-to-16 items, Cinemeta `background` by IMDb id (`imdb.js`),
  else Xtream `get_vod_info` / `get_series_info` `backdrop_path[0]` (core.js already reads it), one request per title in
  the guide's request queue after `launchDone`, cached 30 days in IndexedDB with the title's key. Until it lands the
  card is the poster-left variant. Episode stills: the add-on's `thumbnail`, else the series backdrop.
- **The billboard's image** is part of "Home ready" (decoded before the launch wipe) when it is cached; a first-time
  backdrop shows the poster-upright billboard and swaps to the backdrop with a 200 ms fade when it lands.
- **Native image sizing** (`shouldInterceptRequest` → a downsampling decoder with a disk cache) is later work, scoped in
  13.4; nothing in this spec depends on it.

### 9.3 Rows' data jobs (all after `launchDone`, in the request queue, capped, cached)
- **Runtimes:** `scripts/build-ratings.js` reads IMDb's datasets for the weekly ratings file; it gains one column,
  `runtimeMinutes` from `title.basics`, so every rated title has a runtime for free. `A film for tonight`, `Under 90
  minutes` and `Ends` use it, else a duration already cached from `get_vod_info` / Cinemeta for that title; a title
  without either is left out of those rows and shows no `Ends`.
- **New in your shows / New tonight:** the followed set = series with any watched episode or a save; "current on" =
  every earlier episode seen. On each catalog refresh, a followed series whose `last_modified` moved gets one
  `get_series_info`; new episodes = those with `added` (the episode's own) in the last 14 days, else the series'
  `last_modified` date for every episode of the newest season when episodes carry no date. Add-on shows: Cinemeta meta
  `videos[].released` in the last 14 days. Cap 20 series a day; the result is cached per series with its
  `last_modified`. The row hides until the first result.
- **New season** (3.5): the same job notices a grown season count.
- **`Where you were`:** Cinemeta meta `videos[].overview` for the episode (fetched with the series' meta the add-ons
  already pull), else the provider's episode `plot` from `get_series_info`, cached with the series.
- **The day's pick** and **Because you watched** are computed at most once a day and when their seed changes, cached in
  IndexedDB with the catalog's `PREP` version; **Top picks** reuse the Movies tab's Popular order.
- **The doors:** counts and the first four posters per door from the prepared lists at `PREP` time (the Movies tab's
  filter counts); the genre × decade door and `Surprise me` reseed daily.
- **In 4K** and **Á íslensku** are filters over prepared lists (names, tags, categories, known audio tracks).
- **Shield checks** run on card data before markup (`videoMask`, `show`, `recordFor`), never on the DOM.
- **The fan line**: `league.js` standings and leaders (10 and 60 min ages), copied at tip-off for the shield as the hub
  does (`pinView`), the earliest unseen game's copy while one is unseen.
- **The ambient colour** (3.8): one JS canvas draw per new billboard image, cached with it; bg-1 without CORS.

## 10. Strings (every string on Home v2, in one place)

Eyebrows: `GAME NIGHT`, `THE MORNING AFTER`, `YOUR TEAM`, `GOOD MORNING`, `GOOD AFTERNOON`, `GOOD EVENING` (Icelandic:
`GÓÐAN DAGINN`, `GOTT KVÖLD`), `PICK UP WHERE YOU LEFT OFF`, `UP NEXT`, `NEW TONIGHT · A SHOW YOU FOLLOW`, `NEW SEASON ·
ADDED TODAY`, `TOP PICK FOR YOU · THRILLER`, `POPULAR ON YOUR PROVIDER`, `WELCOME TO AIRGLOW`, `GRIZZLIES AT JAZZ ·
TIP-OFF 01:00`, `GRIZZLIES AT JAZZ · NBA LEAGUE PASS 4`, `GRIZZLIES AT JAZZ · LAST NIGHT`, `GRIZZLIES AT KINGS · SAT ·
LATE · 1 MORE AFTER THIS`, `GRIZZLIES AT JAZZ · FINAL`, `YOUR TEAM · THU · LATE AT TRAIL BLAZERS`.
Labels: `WHERE YOU WERE`, `NEXT UP`.
Chip: `2ND 4:12` / `live · synced`, `live`, `HALF`, `ON NOW` / `not started`, `49 MIN` / `to tip-off`, `02:00` /
`tip-off`, `REPLAY` / `no spoilers`, `END` / `no spoilers`, `1ST 8:20` / `paused`, `FINAL` / `W 112–104` / `after
overtime`, `scores unavailable`.
Plate: `VS`, `Score hidden`, the score.
Fan line: `3rd in the West · 3 in a row · Morant 27.8 ppg`, `2 lost in a row`, `Morant 27.8 ppg · Next: Thu · late at
Trail Blazers`, `⊘ as of tip-off`, `⊘ as of tip-off, Grizzlies at Jazz`.
Buttons: `Watch live`, `Watch pre-game`, `From tip-off`, `Watch from tip-off`, `Box score`, `Reveal score`, `Game page`,
`Choose channel`, `Open guide`, `Pick the channel`, `Resume`, `Back to live`, `Start over`, `Details`, `Play`, `Play S4 ·
E1`, `Series page`, `Save`, `Saved ✓`, `Watch again`, `Not now`, `Reveal`, `Keep hidden`.
Sheets: `Reveal Grizzlies at Jazz?`.
Captions: `NBA League Pass 4`, `Hold OK for 2 more channels`, `No channel found yet` / `Your pick is remembered`,
`Replays for 3 days`, `Replays until Tue`, `No replay yet` / `airglow keeps looking`, `4K HDR from Northlight`, `Also on
your provider`, `From your provider`, `From Northlight`, `On your provider`, `Icelandic subtitles`, `Needs a connection
to play`, `Back cancels`.
Meta: `S1 · E3 · "Signal" · 49 min · 4K · 21 min left · Ends 21:03`, `S3 · E8 · "Low Tide" · 49 min · Added today · Ends
21:31`, `★ 7.8 · 2024 · Thriller · 2h 06m · 4K · Ends 23:16`, `Season 4 · 10 episodes · ★ 8.2 · Drama · You watched up
to S3`, `A minute or two the first time · Home fills in as they land`, `Stopped in Q3`, `Synced · 38 s`.
Rows: section 4.1's titles and subtitles; `Something short before bed` · `Under 45 minutes · from your shows`; `Browse
your library` · `4,812 films · 1,930 series · OK opens the shelf`; `Series to start`; `Your team`; `1 live · 1 later · 3
final`, `8 final · yours hidden`, `4 later`, `As of 20:12`.
Doors: `90s thrillers`, `Under 90 minutes`, `Top rated, 2020s`, `Á íslensku`, `In 4K`, `Series with 3+ seasons`, `New
this month`, `Surprise me` · `One unseen film, rated 7+`; counts `212 films`, `418 series`, `38 titles`.
Cards: `NEW`, `NBA · REPLAY`, `Added today`, `Yesterday`, `May show results`, `Score hidden`, `Ended`, `Final`,
`hidden`, `tip-off`, `1ST 9:41`, `See all`, `214 more`, `Saved`, `Name hidden`, `Trail Blazers 1-3`.
Menus: section 6 (`Open the shelf`, `Hide this door`, `Remove from Home`, `Mark watched`, `Not interested`). Settings:
section 8. Offline: `Offline · showing what airglow remembers`. Context line: `Home · <row>`. The quiet tab's title:
`A result is being kept from you`.

## 11. Self-check (`node tools/audit.js`; ring data in `tools/audit-rings.json`)

On all 26 mocks, 0 findings: one focus ring per screen (none on the progress screen and the storyboard, which say so);
no two texts overlap; no text touches a box it is not in; nothing clipped; nothing but art and rails outside the safe
area; contrast 4.5:1 on every flat ground (the team fields and the ambient ground included); the ring read back from the
pixels on all four sides; no amber, yellow or non-LIVE red; 24 h clocks; SPOILER on every shield mock (no score, result
word, OT or end time outside `data-other`); CONTAIN; TRUNC; RAILFOCUS; RINGTEXT; team colour never under a ring; and the
Home checks:
- **PRIMARY**, **ORDER** (Continue first; Channels last, first on `m3u`), **PEEK** (no text in a peeking row, badges
  whole), **BAR** (the bar away and the context line on only when scrolled; the billboard hidden, not unmounted),
  **HERO** (the column ends before x 600, the buttons at y 232 to 276, 236 to 280 on a game), **SLABTXT**.
- **LINES** (one line each: card title and meta, billboard meta and fan line, row title, game status), **NOTRUNC** (a
  card's meta and a next-game line are never cut), **COVERED** (no text under a button, card or plate), **SEAM** (no
  band text crosses the split), **DATA** (no art on a channel card).
- **LIVEBG** (the rendered pixels 8 px around every LIVE pill are within 28/255 of bg-0), **RECORD** (no full W-L while
  `tl.unseen` is not empty), **FANLINE** (no seed or streak while a team game is unseen; the copy named by its game),
  **CONSIST** (the page's facts against `<meta name="tl">`: the Grizzlies' record, partial iff unseen, the streak ≤ the
  wins, the seed, the NBA row's order, `In Xh Ym` against the tip time and the clock).
`--inject` plants one fault per check on every page (a second primary, a swapped row, a caption in a peek, a score on a
shield mock, a seed while unseen, a full record, a wrong record, a wrapped and a cut meta, a LIVE pill on a field, art on
a channel card, a moved button row, a reordered NBA row, a label across the split, a plot under the buttons): 528
findings, every check fires on at least one page.

## 12. Acceptance

| ID | Task | Result |
|---|---|---|
| H-P1 | Cold launch on a game day to your team's stream | 1 (OK on the primary; Watch live, or From tip-off if that was his last choice); 2 with Choose channel |
| H-P2 | Launch on a game day to resume | 2 (▼, OK) |
| H-P3 | Launch with no game to resume | 1 (Resume focused) |
| H-P4 | Launch with nothing in progress to something to watch | 2 (Details on the pick, then Play); 1 with ▶ Play |
| H-P5 | Watch another live game from Home | ▼ ▼ (the NBA row, row 2 on a game night), OK = 3 on its first live card; +1 per card to the right |
| H-P6 | Home to a favourite channel | Channels is the last row (owner 14.2): ▼ × (rows on) then OK; Live is one tab away, digits tune directly; on a playlist account ▼, OK |
| H-P7 | Remove a title from Continue watching | hold OK, ▼ × 4, OK = 6; `Mark watched` is 5 |
| H-P8 | Switch a row off | Account, Home rows, the row, OK |
| H-P9 | Back to the thing you came for from deep in the rows | 1 (Back → the billboard's primary) |
| H-P10 | Into a shelf of the library | ▼ to the doors, OK = the Movies tab with the filters set |
| H-P11 | Reveal the score | OK on Reveal score, OK on Reveal = 2, never 1 |
| H-F1 | One ring; nothing steals focus; the billboard's kind never changes under the thumb | 3.1's lock, the audit's PRIMARY |
| H-F2 | A row never inserts above the focused row | section 7 |
| H-B1 | No spoiler on any Home surface under the shield, the fan line included | section 7, audit SPOILER + RECORD + FANLINE + CONSIST on every shield mock |
| H-B2 | Game night survives every opponent's colours | the clash rule (3.2), `home-home-rockets`, `home-home-nuggets`, audit LIVEBG from the pixels |
| H-B3 | Home is not only sports | the game billboard's 12 h / 18:00 cap and `Not now`; the NBA row below New in your shows on non-game days (`home-evening`) |
| H-Q1 | No collisions, clipping, truncation, covering or safe-area misses | 26 pages, 0 findings; 528 planted faults caught |
| H-D1 | Nothing drawn that the app cannot fill | section 9; audit DATA; runtimes from the ratings file; the poster-left and poster-upright fallbacks mocked |
| H-L1 | Home interactive within 2 s of a warm start; no tick rebuilds Home | 9.1: per-row containers, live nodes re-texted (to be shown in a frame trace on the TV); the field slide measured, with the fade as the fallback |

## 13. Port notes (for the engineer; no app code was written in this round)

1. `screens/home.js`: `draw()` becomes `rowPlan()` (`[{id, title, sub, kind, items}]` honouring Account > Home rows and
   the NBA row's game-day placement) and **one `setHtml` per row container** plus the billboard's frame; `tick()` updates
   `[data-live]` nodes only; `ROW_TOP` goes, row tops are computed from the kinds' pitches; `placeRails` gains the lift
   rule and the end clamp; every row mounted once, hidden off screen; `data-src` images by row; the idle-time fill.
2. `cards.js`: `wideCard` (continue, poster-left, new episode, channel with the 64 px logo tile, replay, door) replaces
   `liveCard` / `contCard`'s `.hc` markup; `poster` gets `named`; `nextGameCard`; the billboard builders (`bbGame` with
   the band, plate and chip, `bbContinue` with `where`, `bbNewEpisode`, `bbNewSeason`, `bbDiscover`, `bbNext`,
   `bbWelcome`); `field()` and `fieldPair()` next to `teamPalette` in `util.js`.
3. `app.css`: append `home-v2.css`; drop `.hc` and the `.rail.peek .hc` rules once nothing uses them; the grain url
   becomes `brand/sprites/grain.png`.
4. **Native (scoped, later):** image sizing for provider JPEGs (`shouldInterceptRequest` on image requests → decode with
   `inSampleSize` to the slot, disk cache; a test with a 2000 px poster showing the decoded size). The palette needs no
   native code (3.8).
5. `catalog.js`: `recentlyAdded(days)`, `newEpisodesFor(seriesIds)` (9.3), `filmsForTonight(now)`, `shortOnes()`,
   `inLanguage(lang)`, `named4K()`, `doors()` (counts and first four per filter set); `addons.js` exposes
   `popularCatalog()`, `background` / `logo` / `videos[].overview` / `videos[].released` by IMDb id.
6. `scripts/build-ratings.js`: the `runtimeMinutes` column.
7. `state.js`: `hiddenFromHome`, `notInterested` (30 days), `homeRows` (order, toggles, hidden doors), `dailyPick`
   (date, id), `backdrops` (title key → url, date), `ambient` (url → hex), `greeting`, `teamPrimary` (`live` /
   `tip-off`, the last choice), `billboardSeen` (the new-episode / new-season first-visit flags), `notNow` (per visit).
8. `nba.js` / `games.js`: `Reveal` on Home goes through the hub's confirm with the game named.
9. `tests/tv/`: a Home walkthrough script (billboard kinds, row order and the game-day placement, the 12 h cap, the
   backlog, Remove from Home, the rows setting, the clamp, a door).

## 14. Decisions for the owner

**Answered:**
1. **The discovery pick's OK opens `Details`**, not Play. `Details` is the primary and focused; `Play` second.
2. **The Channels row is last** (first on a live-only playlist account).
3. **Icelandic is a row of its own, `Á íslensku`**, named in Icelandic, from the provider's language tag, category and
   Icelandic audio tracks.
4. **The greeting is English** (`Good evening · Pick up where you left off`); Icelandic and Off are choices in Account >
   Languages.

**Open (the design's choice stands unless he says otherwise):**
5. **The doors** (B): the default eight shelves and `Surprise me` opening a title page, not playing. Recommended as is;
   he can hide any door.
6. **Late mode** (F, optional): `Something short before bed` after 23:00 in place of `A film for tonight`. Recommended
   on; it is the same data at a different hour.
7. **The primary on game night remembers his last choice** (`Watch live` until he picks `From tip-off` once; the
   reviewer wanted `From tip-off` by default under the shield). Recommended as is: his catch-up decision was `Watch
   live`, and one press teaches it.
