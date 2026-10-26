# airglow TV UI v1: design spec (final milestone)

Scope: **TV only** (owner decision: phone and PC adaptations are on hold). Every TV screen, the native player overlays, and the launch animation.
Inputs: brand v5.4 (`design/brand-v5/v5.4/`, `BRAND.md`, `tokens.css`, `BRIEF-for-UI.md`), `UX-BRIEF.md`, and the two milestone-1 checks (`UX-CHECK-m1.md`, `BRAND-CHECK-m1.md`). Where this spec departs from a brief, section 12 says why.

How to read it: every mock is real HTML/CSS at the TV's true CSS viewport (960 x 540, 2x), built on `tokens.css`. `ui.css` is the part meant to be ported. Renders are `png/*.png` at 1920 x 1080. `png/overview-final.png` is the contact sheet, `png/ia.png` the IA board, `launch/index.html` the working launch animation.

| Path | What |
|---|---|
| `ui.css` | components and layout on the brand tokens; only transform and opacity are ever animated |
| `kit/*.js` | markup builders for the mocks: `kit` (top bar, cards, game card, guide cell), `home`, `live`, `movies`, `detail`, `nba`, `game`, `screens` (first run, search, saved, account, update, states), `player` (native overlays), `art`/`data` (procedural art, messy content) |
| `tv/*.html` | 43 TV screens and states; `player/*.html` 21 native overlay mocks; `launch/` the working launch |
| `tools/render.js` | `node tools/render.js tv/home.html` writes `png/tv-home.png` (needs Playwright). `tools/audit.js` checks every mock: one focus ring, node count, banned CSS, text below 14 px |

---

## 1. Principles (every decision answers to these)

1. **Open on the thing you came for.** Home's hero is one contextual item with its primary button focused at launch: your team's game, else resume, else the last channel. Cold launch to the game is one press.
2. **Live looks live, everything else is calm.** Red appears only as the LIVE pill. The Sharp dialect (12° plates, italic condensed scores) appears only in live and NBA places. (Apple HIG, Live-viewing apps.)
3. **The picture is sacred and spoilers are a mode.** In the player nothing covers the centre half except subtitles; one panel at a time. One switch (the spoiler shield) covers every surface, and every score shows at the stream's synced delay.
4. **One job per axis.** Left and Right move along a row, Up and Down between rows, the top bar is one step above everything. The same key never changes meaning with hidden state (player OK is always the channel panel).
5. **Shelves are optional, one grid is enough.** At 960 x 540 one grid with Popular first and view chips shows 12 strong candidates on the first screen, with about a tenth of the nodes of six shelves. (The UX brief adopted this over its own shelves page.)
6. **Cheap to draw.** 9 to 250 UI nodes per screen (audit), no filters or blur, no soft shadows, animation on transform and opacity only.

## 2. Research behind the structure

(P) = the primary page was read; (S) = a secondary summary, treated as a hint.

| Source | Fact | Used for |
|---|---|---|
| [Apple HIG, Layout](https://developer.apple.com/design/human-interface-guidelines/layout) (P) | tvOS safe area 60 pt top/bottom, 80 pt sides; grids use 40 pt gutters and at least 100 pt between rows; make partially hidden content symmetrical | 48 x 27 safe area (brand), 24 px gutters, row pitch 252, rows bleed off the right edge |
| [Apple HIG, Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) (P) | tab bar at the top; live apps order tabs Live first; do not hide or disable tabs; Menu returns focus to the bar | Top bar, Back model |
| [Apple HIG, Live-viewing apps](https://developer.apple.com/design/human-interface-guidelines/live-viewing-apps) (P) | live first and one step from playback; mark live; progress for in-progress live; EPG opens on the current programme; favourites group; content footer for browsing while playing; instant feedback on channel change | Hero, LIVE pill, progress bars, now line, Favourites, mini guide, zap card |
| [Apple HIG, Remotes](https://developer.apple.com/design/human-interface-guidelines/remotes) (P) | Back opens the parent screen; page up/down browses the EPG and changes channel in playback; ignore inadvertent taps in live video | Key map |
| [Apple HIG, Playing video](https://developer.apple.com/design/human-interface-guidelines/playing-video) (P) | no loading screens if avoidable (black + spinner after 2 s); resume without asking; exiting lands on a detail view; translucent overlays, short (image retention) | Launch hold, resume rule, VOD overlays |
| [Apple HIG, Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields) (P) | tvOS: keyboard on top, results beneath; give suggestions, nobody wants to type | Search |
| [Apple HIG, Focus and selection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection) (P) | focus is not selection; five states; ring for fields, highlight for lists; padding for the scale | Selected vs focused, row focus |
| [Android TV: Layouts, Cards, Tabs, Navigation drawer, Navigation on TV, Focus system, Color on TV](https://developer.android.com/design/ui/tv) (P) | 960 x 540 dp, 5% margins, 16:9 and 2:3 cards, peek, 20 dp gaps; pill tabs for pages; rail 3 to 7 destinations; Back goes to the previous destination with no confirmation and no on-screen back button; one focus, scale 1.025 to 1.1; test in Standard picture mode, avoid banding | Whole system |
| [WCAG 2.2, 1.4.3 and 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) (S) | 4.5:1 text, 3:1 non-text | Brand tokens (checked by the brand script) |
| UX brief sources S1 to S51 (UX-BRIEF.md) | zap time below 0.43 s is "good", 2 s video start abandonment, EPG grids orient fastest, YouTube TV hold-OK last channel, spoilers leak through thumbnails and records | Press counts, AC tables, shield scope |
| Netflix device UI notes 2011 to 2013 (S) | design for the weakest device; transforms paint into GPU layers so layer size matters | Performance rules |

## 3. Layout system

Canvas 960 x 540 CSS px (1920 x 1080 device). 1 rem = 16 px. Safe area x 48 to 912, y 27 to 513. Interactive content never leaves it; art and rows may bleed.

| Element | Value |
|---|---|
| Top bar | y 32 to 72 (40 high pills so a 5 px ring stays inside y 27). Mark `mark-small.svg` 28 px, then Search, Home, Live, NBA, Movies, Series, Saved; Account avatar 36 px at the right. Tabs Outfit 500 18, selected 700 with a 3 px gradient underline inset 16. NBA carries the compact LIVE pill only while your team is live |
| Page header | y 80 to 120: head title (Outfit 700 28), count and "English first" in caption, then Sort, Filters, Jump pills (36 high) |
| Chip row | y 128 to 164, 8 chips (36 high, 8 gap), inside 48 to 912 |
| 2:3 poster | 124 x 186, radius 12, 6 per row, 24 gap (6 x 124 + 5 x 24 = 864). Caption 14 px below the art (title Inter 650 16, meta 14); row pitch 252 |
| 16:9 card | 198 x 111, radius 16, 24 gap, four across plus a peek at x 928 |
| Game card | 272 x 124, three across, 24 gap |
| Episode card | 200 x 112 |
| Hero plate | 864 x 176 at y 84 (radius 16, surface-1) |
| Guide | channel column 208, time axis 656 px = 2.5 h (4.37 px/min) with "now" at the left edge; rows 50 + 6 gap; 6 rows visible |
| Sheets | right sheet 392 to 420 wide (full height, bg-1), left sheet 340, menus 320 to 352 (radius 24) |
| Native panels | left 352 (channels) or 320 (options), right 264 (game), banner 64 high, hint bar 34 |

**Gutter rule (AC-F3):** a focused 124 px poster scaled 1.05 plus its 5 px ring needs about 8.2 px on each side; gutters are 24 (12 each side to the neighbour). Chips and rows use ring only, no scale.

### 3.1 Type (brand tokens, nothing new)

| Where | Token | Size / line |
|---|---|---|
| Detail title | display | 40 / 44 Outfit 700 |
| Page title | head | 28 / 32 Outfit 700 |
| Row title, dialogs | title | 22 / 28 Outfit 700 |
| Buttons | Outfit 700 | 17 |
| Card and cell titles, poster title | Inter 650 | 16 / 20 |
| Meta, times, channel names in the guide, box-score cells, setting values | caption | **14 / 18** (brand floor since v5.4) |
| Body (plot) | body | 16 / 24, text-2, 3 lines max |
| Eyebrows | label | 14 / 18 caps +0.08em |
| Badges only (LIVE, 4K, HD, CC, TV-MA, +3, team abbreviations, episode numbers) | badge | 12, caps, 650/700, 5 characters or fewer |
| Scores (Sharp only) | score | 56 / 52 in heroes, 34 / 36 in game cards, 30 in the player plate |

`tools/audit.js` flags any text below 14 px that is not one of those badges: none found.

### 3.2 Focus, selection, states

- **Focus** = `--a-focus-ring` (3 px white, 2 px canvas gap) plus scale 1.05 on posters, 16:9 cards, game cards, episode cards, primary buttons (`.f`). **Ring only** on chips, tabs, pills, list rows, fields (`.f-ring`). **Inset ring** on guide cells and keyboard-style dense rows (`.f-in`, approved variant: only where gaps are 8 px or less; no scale; fill moves to surface-3).
- **Selected is not focused.** Persists after focus leaves: chip = surface-3 + pink dot + pink-text; tab = gradient underline; radio = pink dot; toggle = gradient track + ink knob + the word On; guide channel = surface-2. Selected and focused show both.
- **Exactly one ring per screen** (audit: every mock passes; the only exceptions are the HUD-style player overlays that take no focus: banner, zap card, action chip, reconnect, subtitles). When a sheet opens, the opener loses its ring and the sheet's first row takes it (F6).
- **Hold OK** (500 ms) shows the pressed state at 150 ms, then a context menu with **Save to Saved first and focused**, so hold then OK saves (2 presses). The guide's hold OK toggles a favourite and shows an undo toast ("Added to Favourites · OK to undo", 4 s, never takes focus).

## 4. Motion (transform and opacity only; reduced motion = 120 ms opacity fade)

| Moment | Property | ms | Easing |
|---|---|---|---|
| Ring on/off | instant swap of box-shadow class, no transition | 0 | n/a |
| Card lift | transform scale 1 to 1.05 | 200 | `cubic-bezier(.2,.7,.2,1)` |
| Chip, pill, press | background swap | 120 | same |
| Top bar hide/show | translateY(-100%), opacity | 200 | same |
| Row scroll vertical | translateY of the page, target row aligned to y 176 | 320, **0 while a key repeats** | same |
| Rail scroll horizontal | translateX, fixed focus position | 200, 0 on repeat | same |
| Tab switch | page cross-fade, after a 250 ms dwell and only if rendered from cache | 200 | same |
| Sheets and menus | translateX(24 px) to 0 plus opacity | 320 | same |
| Native panels | same, 24 dp | 200 | same |
| Live wipe | 12° slab translateX | 280 | `cubic-bezier(.7,0,.2,1)` |
| Launch | see section 8 | 1100 | |

Never animate width, height, top, left, box-shadow or filter. `will-change: transform` is set on the focused element and removed on blur. While a direction key repeats (F10): no smooth scroll, no lift animation, ring moves instantly.

## 5. Screens

Each screen: purpose, layout, states, keys. Keys: ▲▼◀▶ move, OK activate, hold OK = menu, Back, Menu = Sort/Filters/Options alias, CH± = page. Entry focus is named per screen.

### 5.1 First launch and sign-in (`tv/first-*.html`, `tv/update.html`)
Welcome (gradient lockup on bg-0 at 64 px, "Add your TV provider", primary **Use your phone**, secondary Type it here, Load an M3U link) → phone path (QR + `192.168.1.23:8765` + code 4821, three numbered steps, a "Waiting for your phone" bar; the TV app serves a one-page form on the LAN) → fallback type path (one "Provider link or server" field that fills the rest from a pasted `get.php` link) → verifying (steps with ticks; Home opens as soon as channels are in; Cancel focused) → **Three quick choices** (your team, spoilers Off / My team / All games, languages shown first; Back skips). Entry focus: Use your phone. Target: 4 TV presses via the phone, under 90 s. The lockup uses the gradient file on bg-0 only; the mark is not shown separately.

### 5.2 Home (`tv/home*.html`)
Hero priority (owner's game first): **your team from 3 h before tip-off to 30 min after the final** > resume > last channel. Other live games lead the On now row, not the hero.
- *live*: LIVE pill, quarter and clock, team discs (neutral placeholders), Barlow italic score in the Sharp slab hero, leaders, "Synced · 42 s behind live", primary **Watch live**, secondary Box score, caption "On NBA League Pass 4 / Hold OK for 2 more channels".
- *shield*: the score becomes a "Score hidden · Spoiler shield · My team" tile, leaders and sync line disappear, the secondary becomes **Reveal score**.
- *pre*: "Tip-off 21:30 · in 49 min", the tip time in the plate, **Watch pre-game**.
- *choose*: no channel known: primary **Choose channel** opens the sheet (EPG match first, then NBA / League Pass channels, then your Sports group); the pick is remembered per team.
- *resume*: no game: art-backed hero, **Resume** (focused), Start over, Details, progress and minutes left.
Below: **On now** (favourites first, 198 x 111 cards with a logo tile, LIVE pill, number, programme, channel and quality, progress) and **Continue watching** (resume immediately, no detail page; a finished episode becomes the next one). Entry focus: the hero's primary button, from launch, from Back and from the tab. Keys: OK on a card plays; hold OK menu; Up from the hero = bar.

### 5.3 Live guide (`tv/live*.html`)
Now panel (display only, so no extra stops): logo tile, programme, LIVE, channel, quality, times, time left, progress, one-line description (hidden under the shield: "Description hidden (spoiler shield)"). Ruler row: group chip at the left (reachable with **Up from the first row**, no Menu key needed), "Now" flag and a 2 px pink line behind the cells, times every 30 min. Rows: channel number, 32 px logo tile, name (two lines), star or pin; your team's game is **pinned first**. Programme cells are positioned by time, inset focus ring; cells under 36 min show the start time only; missing guide = one dashed "No guide information" cell, still tunable.
Keys: ◀▶ along time (◀ at the now column goes to the channel column, never the bar), ▲▼ channels, OK tunes the current programme or opens info for a future one, hold OK toggles favourite with undo, CH± pages six rows (±2 h along the axis), OK on the group chip opens the group list (left sheet, Live games, Sports, News, UK…). **The selected group is the zap ring** and the banner names it ("Favourites · 3 of 10"). Entry focus: the current programme cell of the last channel.

### 5.4 NBA hub and game page (`tv/nba*.html`, `tv/nba-game*.html`)
Hub: day strip (chips; ◀▶ change day), your-team hero with the slab (linescore table, leader, Watch live, Box score, Plays, "Synced · 42 s"), then "Tonight" as a 3-up grid ordered live, upcoming (relative time "In 49 min"), final. A game card is an upright Soft card with a skewed (-12°) score plate holding upright numbers; **under the shield** the plate shows an eye-off glyph and "hidden", finals read "Ended" with no "OT" and no winner emphasis, records are frozen. Counts ("2 live · 2 later · 3 final") never spoil.
Game page: compact Sharp header (status, team discs, score, Watch live; shielded: "Score hidden" + Reveal score), tabs **Grizzlies · Warriors · Plays · Team stats** (◀▶ switch), body upright: 8-row box score (Player, MIN, PTS, REB, AST, FG, 3P, +/-) at 14 px, plays (scoring plays in chalk with a pink dot), team-stat bars (gradient for your team, border-strong for the other). Tables are never skewed (brand rule); this was the open "Sharp on dense tables" risk: **only the header plate slants and the dialect holds**. Entry focus: your team's game card (hub), the first tab (game).

### 5.5 Movies and Series (`tv/movies*.html`, series uses the same builders)
One screen: header (title, count, **Sort Popular**, **Filters (n)**, **Jump**), 8 view chips (All, New in English, Top rated, 4K, four genres) that write into the same Sort/Filter state (selecting a chip clears conflicting choices, the Filters count reflects it, so nothing is filtered in two places), and the 6-column grid. One card per title: tag 4K top-left, **+N versions** top-right (otherwise a language tag), resume bar flush, art without overlaid titles (the title is in the caption; the initials tile with its title is the only fallback).
- **Sort** (menu): Popular (default, "IMDb, this week"), Top rated, Newest, Recently added, Title; below it the persistent **English first** toggle.
- **Filters** (right sheet 420, scrolls): Language, Genre, Quality, Subtitles, IMDb, Decade; **every chip shows its live count and zero-count chips are disabled** (surface-2, text-4, never hidden); "N active" and Clear all at the top; pinned **Show 214 titles**. Back keeps the changes and closes.
- **Jump**: top of list, then the sort's own key (years for Popular and Newest, letters for Title, rating bands for Top rated).
- **Scrolled**: bar and header slide away; a 14 px context line stays ("Movies · Popular · 3 filters"); while Down is held more than 1.5 s a **scroll bubble** shows the sort key and position ("7.4 · row 120 of 8,300"). The focused row sits at y 50 so its caption stays inside the safe area.
- **Hold OK on a card**: menu with **Save to Saved** (focused), Mark watched, Details.
Entry focus: first card. States: no results ("Nothing matches these filters" with Remove last filter / Clear all), no art (initials tile), unavailable version hidden.

### 5.6 Detail (`tv/detail-*.html`)
Art on the right (640 px) with a flat left scrim; column: eyebrow (type and genres), title, meta (rating, year, runtime, tags), 3-line plot, credits, actions. **Play** or **Resume 1:12:40 + Start over** (focused), **Save**; second row: **version pill** ("English · 4K HDR") that opens the version sheet (language, quality, subtitles, size; default = your language at the best quality this TV decodes; remembered per title; shown only when more than one version exists), and the **Subtitles: English** pill (a choice, so it shows its value). "More like this" 16:9 row. Series: Resume S1 · E3, season chips, episode row (number, watched check and dimmed art, resume bar on the current one; next-up focused when entering from Continue). Back returns to the card that opened it.

### 5.7 Search (`tv/search*.html`)
Left: field with a mic key first, 6 x 6 keyboard (A to Z, 0 to 9, 52 x 40 keys) and Space / Delete / Clear. Right: results grouped Top result (poster, meta, Play), On TV (guide titles, next 24 h), Movies and series (small posters, one card per title). Results update after every letter (target 150 ms). Empty: Recent chips and Trending posters; none: "No results for …" with Clear. Entry focus: **A** (the mic is one Up away). Right goes to results, Back clears focus to the keyboard then leaves (query kept 10 min). Matching normalises accents, punctuation and prefixes ("spiderman" = "Spider-Man").

### 5.8 Saved (`tv/saved.html`)
Chips Channels · Movies · Series · History. The Channels page is where the favourite order is set: rows with a grip, the focused row **lifts** (ring, 1.02) and ▲▼ move it, OK drops, Back restores. The side card says what the order drives: On now, the Favourites guide group, the zap ring when tuned from Favourites.

### 5.9 Account (`tv/account*.html`)
Two panes: groups (Provider, Playback, NBA, Languages, Home rows, Updates, About) and a list of 56 px rows. Provider: status pill, expiry and days left, connections "1 of 2", switch/add account, refresh, sign out. **NBA**: your team, **Spoiler shield (Off / My team / All games)**, Score on picture, **Score delay per channel** ("NBA League Pass 4: 42 s behind live"). Updates: version, "airglow 1.6 is ready", automatic download. A white dot on the avatar and the Updates group shows an update is waiting. Entry focus: first row.

### 5.10 Update prompt (`tv/update.html`)
Downloaded in the background; offered **only at a natural break**: the next cold launch before Home, as a card with the lockup, one line of news, **Update now** / Later (asks again after 24 h). Never over the player, never in your team's game window, never by taking focus on another screen (F8).

### 5.11 States (`tv/state-*.html`)
Loading = flat surface-2 blocks, no shimmer, only on cold section loads (cache-first makes them rare); focus stays on the current tab. Offline ("Can't reach the server", Try again, last reached time). Subscription ended (Switch account, Refresh). Empty filters. No-art fallback. Native: "Reconnecting, attempt 2 of 6", then "This channel stopped" with Try again and Next channel inside the player.

## 6. Cross-cutting rules

- **Back:** overlay/sheet closes and restores the opener; detail returns to its card; **anywhere in a tab's content: scroll to the top, show the bar, focus the tab**; another tab goes to Home with the hero focused; Home exits. Game time from deep in a grid is Back, Back, OK = 3 presses.
- **Focus (F1 to F11):** one ring; memory per row, tab and page; edges stop and an auto-repeated key never crosses a container boundary; data never moves focus; nothing steals focus (updates, toasts, score refreshes).
- **Spoiler shield (AC-B1):** hero, game cards, game page, NBA hub counts, guide descriptions, toasts, records, "OT", leaders and plays are covered; reveal with hold OK > Reveal, or the Reveal button. In the player the score appears only when the game panel opens, at the synced delay.
- **Score delay (AC-B2):** remembered per channel (first value 60 s); while a game is watched every surface shows it at that delay; Options > Sync score stores a new one.
- **Titles and names (UX 4.9):** strip `EN|`, `US:`, `|EN|`, `┃NL┃`, `FHD/UHD/4K` (becomes a tag), `ᴴᴰ`, years in brackets (become meta), MULTI-SUB; sentence-case ALL CAPS; merge versions into one card.

## 7. Native player (Android, Media3), `player/*.html`

dp = CSS px on the 960 x 540 canvas. Colours are brand tokens. Each element below maps to a plain Java view; there are no blur, no gradients except the 4 dp progress and the seek bar fill, and no images except channel logos. Panels are `bg-1` at 92 to 94% over the video, border 1 px `--a-border`, radius 16 (banner 14). Only one panel at a time; nothing but subtitles covers the centre 50% of the picture; the hint bar and panels are removed after 5 views of each.

| Overlay | Position / size | Content and views | Timing |
|---|---|---|---|
| **Zap card** | centre, wraps content | logo tile 56, channel name Outfit 700 22, now title 16 `text-2` (a `LinearLayout` horizontal; shown instantly on key down, never black) | until first frame, min 600 ms |
| **Banner** | left 48, top 27, right 48, 64 high, radius 14 | number (Inter 700 24) · logo tile 44 · name 16/20 650 + ring name "Favourites · 3 of 10" 14 + now title and times 14 · 4 dp gradient progress 120 wide + "Next 22:00 NBA Postgame" 14 · tags HD, CC (badge 12) · LIVE pill (22 high, 2 px red outline) | 4 s, instantly on zap |
| **Hint bar** | bottom, 34 high, scrim 72% | key caps (surface-2, chalk 14, radius 5) + labels 14 `text-2`: `OK Channels · ◀ Options · ▶ Game · ▲▼ Zap · Hold OK Last` | with the banner, first 5 times, then on Info |
| **Channel panel (mini guide)** | left 352, top 27, bottom 42 | header "‹ Favourites · 3 of 10" (Outfit 700 22); pinned team row (pin, logo, "Grizzlies at Warriors", channel, LIVE) when it is on another channel; 56 dp rows: number 14 · logo 32 · name 16/20 650 · now title 14 `text-3` · LIVE · 3 dp progress; current = surface-2, focused = surface-3 + 3 dp ring | opens in 150 ms on the current channel; closes after a tune or Back |
| **Groups** | same panel, ◀ from the list | radio rows (Favourites, Recent, Live games, Sports, News, Movies, UK, All), count at the right | sets the zap ring |
| **Game panel** | right 264 | plate: abbreviation discs 36, upright score in Barlow italic 30 on a -12° surface-2 plate (the only skewed view; draw it as a rotated GradientDrawable behind an upright TextView); "Q3 7:29 · Synced · 42 s"; tab chips (Grizzlies, Warriors, Plays); 14 sp tabular table MIN PTS REB AST, rows 29 dp | until closed; updates without moving the scroll |
| **Live games** | right 264 | live games, your team first, LIVE pills, OK switches channel; shielded games show no score | same |
| **Options** | left 320 | rows 48: Subtitles (value) · Audio · Picture size "This channel" · Sync score · Favourite · Score on picture · Report "won't play" | – |
| **Subtitles / Audio** | left 320 | radio rows (pink dot), "Remembered by language"; a missing track is a disabled row "No subtitles in this file" | – |
| **Picture size** | left 320 | Fit / Zoom / Stretch with a one-line description; the picture changes as the focus moves; saved per channel (live) and per title (VOD) | – |
| **Sync score** | left 400 | "Which basket did you just see?" 5 rows (score, play, clock); OK stores the delay for this channel | – |
| **Action chip** | bottom-right above the hint bar, max 420 | countdown ring 40 (pink arc on surface-3), "Grizzlies are live / NBA League Pass 4", `OK to switch`; binds OK for 8 s while no panel is open; never in the first 10 s after a tune | 8 s |
| **Reconnect / failed** | bottom centre | spinner arc + "Reconnecting, attempt 2 of 6"; then "This channel stopped" with Try again (OK) and Next channel (▼) | – |
| **VOD controls** | bottom bar 16 from the safe edge, radius 16; top title block | play (44, focused ring), −10, +10, then CC, audio, picture (40); 6 dp seek bar (surface-3, gradient fill, chalk thumb 18); elapsed and remaining 14; "Ends at 22:14" top right | hide after 4 s |
| **Scrub** | bubble above the thumb | time chip chalk on ink; hold ◀▶ accelerates ×2 per second up to ×32 | on key |
| **Up next** | bottom-right above the bar | countdown ring, "Next episode in 7 s · S1 · E4", OK plays now, Back cancels | last 10 s |
| **Subtitles on picture** | bottom inset 10% | Inter 600, 28 dp (5.3% of height), chalk, 1.5 dp black edge, no box | – |

Key map in the live player (no modes): ▲ next, ▼ previous (hold scrolls the banner and tunes 450 ms after release), **OK = channel panel, always**, hold OK = last channel, **▶ = game panel** (or Live games, or programme info), **◀ / Menu = Options**, CC = Subtitles, 0 to 9 = channel number, Back = close panel then leave (focus returns to the channel you watched). Movies: ◀▶ seek 10 s (hold scrubs), OK pause and controls, ▼/Menu options, CH+ next episode.

## 8. Launch animation (`launch/index.html`, `launch.css`, `launch.js`)

Working HTML/CSS, 1100 ms, transform and opacity only, no filter, blur or sprite. `python3 launch/build.py` regenerates `index.html` from the brand SVG paths; open `launch/index.html` in a browser (Chrome 113 equivalent) to play it. Query options: `?t=450` freezes at 450 ms (used for the stills), `?ready=1500` makes Home ready after 1500 ms, `?ready=never` holds on the loading state, `?warm=1` warm resume, `?rm=1` reduced motion, `?hud=1` shows the clock; R replays.

| Window (ms) | Motion | Duration / easing |
|---|---|---|
| 0 | **Frame 0 = the native splash**: bg-0 `#15131D`, the gradient wedge alone, centred at (480, 270), **96 dp tall**. The three bands start hidden behind it (translateX 24 px, opacity 0) | static |
| 0 to 300 | the three bands step out from behind the wedge: translateX 24 px to 0, opacity 0 to 1 by 25% | 300 each, starts 0 / 40 / 80, `cubic-bezier(.2,.7,.2,1)` |
| 300 to 700 | the wedge-and-bands group moves left into its lockup slot: translate(148.5 px, 9.2 px) scale 1.595 to identity | 400, same easing |
| 380 to 860 | the seven letters resolve left to right: opacity 0 to 1, translateX −10 px to 0 | 240 each, starts 380 + 40 per letter |
| 820 | hold ends. If Home is ready: wipe now. If not: the **loading hold** | |
| 820 to 1100 | the 8° soft slab (pink to orchid, one orchid line parallel, 34 ms behind) sweeps left to right; the launch layer fades out over 200 ms starting at 60 ms; Home fades in with a 24 px translateX over 220 ms starting at 80 ms | 280, `cubic-bezier(.7,0,.2,1)` |

**Loading hold** (also the loading screen): if data is not ready at 820 ms the lockup stays and the three bands breathe: opacity 1 to .55, 1.6 s ease-in-out alternate, delays 0 / .18 / .36 s. This is the only loop in the app besides a spinner. After 4 s a caption "Connecting to your provider…" appears under the lockup; after 12 s the offline card replaces it. When Home is ready the wipe plays (280 ms), never longer.
**Warm resume**: the launch layer is skipped entirely. **Reduced motion**: the wedge alone (no bands, no letters, no slab), then a 120 ms opacity fade into Home when ready.
**Native splash (Android)**: `windowSplashScreenBackground` = `#15131D` (API 31+: `windowSplashScreenAnimatedIcon` = the 96 dp wedge, `windowSplashScreenIconBackgroundColor` unset); API 26 to 30 and TV launchers: `windowBackground` layer-list with bg-0 and the wedge bitmap centred 96 dp tall (`drawable-nodpi` PNG 192 px). Keep the splash up until the WebView reports the first paint of `#launch` (`setKeepOnScreenCondition`); `#launch` has the same background and the wedge at the same position and size, so there is no visible jump. The splash is never in the back stack.
Stills of the timeline: `png/launch-0.png` to `launch-1100.png`, `launch-hold.png`, `launch-rm.png`.

## 9. Performance (measured on the mocks, `tools/audit.js`)

UI nodes per screen (the art SVG excluded; real posters are one `<img>` each): 9 to 245 (the busiest are the two sign-in screens with a QR drawn as 200 rects, 245, then Filters 197 and the NBA hub 188; a real QR is one image), against a target of about 250 and a hard limit of 1,500. No `filter`, `backdrop-filter`, `mask`, text-shadow (except the subtitle edge, native), animated gradient, or soft shadow; the only `box-shadow` is the focus ring. Gradients are 2-stop on small elements, plus two flat scrims. Images decoded at display size (poster 124 x 186 CSS = 248 x 372 device). Grids and the guide are virtualised (at most 6 poster rows, 12 guide rows mounted); no smooth scrolling under key repeat; skeletons are static.

## 10. Press counts against the UX acceptance criteria

| ID | Task | Result in this design |
|---|---|---|
| AC-P1 | Cold launch on a game day to your team's stream | 1 (OK on Watch live); 2 with Choose channel |
| AC-P2 | Any section root to the game | 3 (Back to the tab, Back to Home, OK); from a grid also 3 |
| AC-P3 | Watching another channel to the game | 1 with the action chip; 2 with ▶ then OK |
| AC-P4 | Launch to resume | 1 (hero Resume) |
| AC-P5 | Zap ±1, last channel | 1, hold OK |
| AC-P6 | Open and close score | ▶ then OK or Back |
| AC-P7 | Subtitles in the player | ▼, OK, OK (3), or the pill on the detail page before playing |
| AC-P9 | Any screen to the top bar | 1 (Back) |
| AC-P10 | Home to exit | 2 |
| AC-P11 | Install an update | Update now (1) |
| AC-P12 | Phone sign-in | Use your phone (1) plus the phone |
| AC-F1 | One ring | audit passes |
| AC-T2 | Informational text 14 px | audit passes |
| AC-B1 | No spoiler when shielded | designed on every surface (section 6) |

## 11. Brand notes (for the consultant)

Used from the brand: neutral placeholder team discs (BRAND-CHECK M1), `mark-small.svg` in the bar (M2), 14 px caption token, badge 12 px exception, compact LIVE pill (`--a-live-compact-h`), inset focus ring, 2:3 poster card. Two new things to approve: the **scroll bubble** (bg-1, border, 28 px number) and the **action chip with countdown ring** (pink arc on surface-3). The breathing bands in the launch loading hold are the only looped animation.

## 12. Where this departs from the briefs, and why

| Brief | Departure | Evidence |
|---|---|---|
| UX 4.3 Home rows and UX 4.9 shelves page | Hero + On now + Continue; Movies is one grid with chips, not a shelves page | UX-CHECK-m1 section 4 adopted both; fewer nodes, one mental model |
| UX 4.2 fold Saved | Saved stays a tab and owns channel reordering | six destinations plus Search is inside Android's 5 to 6 guidance; UX check adopted it |
| UX 4.13 Account as one list | Two panes (groups left, list right) | seven groups of 3 to 6 rows would be a 25-row scroll; Left/Right is free on that page so it does not collide with the bar rule |
| UX 4.7 tab dwell 300 ms | 250 ms, only when rendered from cache; else OK | UX check accepted |
| UX S2 hold-OK context menu everywhere | Guide keeps a one-gesture favourite toggle with an undo toast | the guide is the only place a channel is favourited, and a menu would add a press to a frequent action |
| Brand: 13 px caption | 14 px | brand approved the floor (UX AC-T2) |
| Brand BRIEF: gradient only on bg-0 for the wordmark | First-run and update screens use `lockup.svg` on bg-0 | kept; the chalk lockup is not needed because no surface other than bg-0 carries a lockup in this set |

## 13. Open items (need the real TV)

1. Real posters: scrim legibility and the 1 px border on warm photographic art (brand brief risk 1). The mocks use procedural art.
2. Surface steps and the focus ring on the Philips in Standard and Vivid modes; the gradient banner loudness.
3. Frame rate of focus moves and the launch on the weakest target; measure AC-L1 to L10.
4. Provider EPG cost for a 2.5 h grid; typical stream delay of the NBA channels (to tune the 60 s default).
5. Silent self-update on this Android TV version; `SpeechRecognizer` availability for the mic key.
6. Phone and PC adaptations: on hold by owner decision.
