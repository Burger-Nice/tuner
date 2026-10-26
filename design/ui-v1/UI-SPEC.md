# airglow TV UI v1: design spec

Status: **milestone 1** (IA and navigation decision, Home, Live guide, Movies grid with sort and filters, detail for movies and series, NBA hub). The final milestone adds the rest of the TV screens, the native player overlays, phone and PC adaptations, the launch animation, and the consultants' feedback. Provisional items are marked **(provisional)**: they wait for the UX brief.

How to read this: every mock is real HTML/CSS in `tv/*.html` at the TV's true CSS viewport (960 x 540, 2x), built on `design/brand-v5/v5.4/tokens.css`. `ui.css` is the part meant to be ported into the app. The renders are `png/*.png` at 1920 x 1080 (`node tools/render.js tv/home.html`). `png/overview-m1.png` is a contact sheet; `png/ia.png` is the IA board.

| File | What |
|---|---|
| `ui.css` | components and layout, all on brand tokens; only transform and opacity are ever animated |
| `kit/kit.js`, `kit/movies.js` | markup builders for the mocks (they emit the class names `ui.css` styles) |
| `kit/art.js`, `kit/data.js` | procedural key art (flat gradients and shapes, no filters) and realistic messy content |
| `tv/home.html` `live.html` `nba.html` `movies*.html` `detail-*.html` | the screens |
| `ia.html` | IA and navigation board |

---

## 1. Design principles (what every decision answers to)

1. **Open on the thing you came for.** Home is a single contextual hero with one primary button focused at launch: live game, else resume, else last channel. From cold start to playing is one press. (Apple HIG, Live-viewing apps: "let people tap once, or not at all, to start playback"; Playing video: avoid asking whether to resume.)
2. **Live looks live; everything else is calm.** Red appears only as the LIVE pill. The Sharp dialect (12° plates, italic condensed scores) appears only where live or NBA content is. Soft is the rest. (Apple HIG: "make sure live content looks live.")
3. **Density where it helps, air where it reads.** Six poster columns, a three-hour guide, a 16:9 row with a peek. One line of meta per card; the focused item and the detail page carry the rest. (NN/g Smart-TV usability: every remote selection is expensive, so cut steps; Android TV: limit text and complexity at 10 ft.)
4. **The d-pad has one job per axis.** Left and right move along a row, up and down move between rows, the top bar is one step above everything. No dead ends, no focus traps, Back always leaves a layer. (Android TV, Navigation on TV.)
5. **Cheap to draw.** Under about 200 UI nodes per screen, no filters, no blur, no soft shadows, animation on transform and opacity only, one focused element promoted at a time. The brand rules and the WebView budget agree here.

## 2. Platform research and how it was used

Numbers marked (P) are from the primary page fetched during this work; (S) are secondary summaries and are treated as hints, not rules.

| Source | Fact | Used for |
|---|---|---|
| [Apple HIG, Layout, tvOS](https://developer.apple.com/design/human-interface-guidelines/layout) (P) | Safe area 60 pt top/bottom, 80 pt sides; grids with 40 pt gutters and at least 100 pt between rows; six columns = 260 pt wide cards; "make partially hidden content look symmetrical"; titled rows need extra vertical space | Safe area 48 x 27 (brand token), 6-column grid with 129 px posters (258 pt) and 18 px gutters, row pitch with 59 px between a poster and the next row, rows bleed off the right edge |
| [Apple HIG, Typography](https://developer.apple.com/design/human-interface-guidelines/typography) (P) | tvOS default 29 pt, minimum 23 pt | Brand floor 13 px = 26 pt on 1080p; body 16 px = 32 pt |
| [Apple HIG, Focus and selection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection) (P) | Focus is not selection; five states (unfocused, focused, highlighted, selected, unavailable); focused item gets larger so leave padding; use a ring for fields and a highlight for lists | Selected vs focused rules; scale-up needs the 18 px gutter; the guide uses an inset highlight, not an outer ring |
| [Apple HIG, Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) (P) | tvOS tab bar at the top, 68 pt high, 46 pt from the top; Menu returns focus to the tab bar; live apps order tabs Live, recorded, other; do not hide or disable tabs | Top bar decision, Back model, tab order, tabs never disabled |
| [Apple HIG, Live-viewing apps](https://developer.apple.com/design/human-interface-guidelines/live-viewing-apps) (P) | Live content first and one step from playback; mark live content; show progress of in-progress live; keep actions in the same order everywhere (Watch, Start over, Record, Favorite); EPG opens on the current programme and returns to playback easily; favourites group; content footer for browsing while playing; instant feedback on channel change | Home hero, LIVE pill, progress bars on live cards, guide now line, Favourites first, mini guide (final milestone), action order Watch then secondary |
| [Apple HIG, Remotes](https://developer.apple.com/design/human-interface-guidelines/remotes) (P) | Back opens the parent screen; press and hold Back goes Home; page up/down browses the EPG, and changes channel during playback; avoid reacting to inadvertent taps during live video | Key map; CH +/- = page in lists and zap in the player |
| [Apple HIG, Playing video](https://developer.apple.com/design/human-interface-guidelines/playing-video) (P) | Avoid loading screens; if more than 2 s use a black screen with a spinner; resume automatically; exiting playback lands on the detail page; keep overlays translucent and short (image retention) | Resume without a prompt, exit lands on the detail page, native overlays in the final milestone |
| [Apple HIG, Search fields, tvOS](https://developer.apple.com/design/human-interface-guidelines/search-fields) (P) | Keyboard on top, results grid beneath; provide suggestions and recent searches because nobody wants to type | Search screen (final milestone) |
| [Android TV, Layouts](https://developer.android.com/design/ui/tv/guides/styles/layouts) (P) | Design at 960 x 540 dp, about 5% margins (58 dp sides are used in the 12-column grid), card widths 844 / 412 / 268 / 196 / 124 dp for 1 to 5 across, 20 dp gaps, peek of the next card, background art edge to edge | 960 x 540 canvas, 16:9 cards at 204 px (4 across plus a peek), backdrops bleed |
| [Android TV, Cards](https://developer.android.com/design/ui/tv/guides/components/cards) (P) | 16:9 most common, 2:3 for emphasis, 1:1 for logos; title, subtitle, description; scrim over art for readable text | Movie posters 2:3, rows 16:9, channel and team logos 1:1, scrim on every card title |
| [Android TV, Navigation drawer](https://developer.android.com/design/ui/tv/guides/components/navigation-drawer) (P) | Rail needs 3 to 7 destinations, 5 or 6 recommended; icons and labels, never mixed | Why top tabs were preferred: 6 destinations plus search and account fit a bar and keep full width for content |
| [Android TV, Tabs](https://developer.android.com/design/ui/tv/guides/components/tabs) (P) | Pill indicator for full-page destinations, bar indicator within a content area; states default, focused, selected | Selected = chalk text + gradient underline; focused = ring; chips for in-page choices |
| [Android TV, Immersive list](https://developer.android.com/design/ui/tv/guides/components/immersive-list) and [Featured carousel](https://developer.android.com/design/ui/tv/guides/components/featured-carousel) (P) | Large preview that updates with focus; subject top right; no text in backgrounds; scrim so title, text and button stay readable | Detail pages: art on the right, scrim on the left; the Home hero is one contextual item, not an auto-advancing carousel |
| [Android TV, Focus system](https://developer.android.com/design/ui/tv/guides/styles/focus-system) (P) | Scale 1.025, 1.05, 1.1; outline outside the element with an inset; one focused element; focus never colour alone | Ring + 1.05 scale on cards and primary buttons |
| [Android TV, Navigation on TV](https://developer.android.com/design/ui/tv/guides/foundations/navigation-on-tv) (P) | D-pad moves to the nearest element; every element reachable; Back returns to the previous destination, no confirmation, no on-screen back button; do not put splash in the back stack; two axes with distinct roles | Key map, no back buttons, Back model |
| [Android TV, Color on TV](https://developer.android.com/design/ui/tv/guides/foundations/color-on-tv) (P) | Test in Standard picture mode; Vivid raises saturation, Sports raises brightness; sRGB for UI; avoid banding with dithering or flat colour; never colour alone | Brand tokens, grain on large fills, status always icon + text |
| [Amazon Fire TV design guidelines](https://developer.amazon.com/docs/fire-tv/design-and-user-experience-guidelines.html) (S, search summary) | Keep UI out of the outer 5%; design at 1080p, 960 x 540 dp; prefer less saturated, cooler colours | Same safe area; confirms the brand palette direction |
| [NN/g, Smart-TV usability](https://www.nngroup.com/articles/smart-tv-usability/) (S, search summary) | Moving a cursor with a remote is a discrete, costly step; reduce the number of selections | One-press launch, chips rather than menus for common filters, favourites first |
| Netflix device UI notes, 2011 to 2013 (S) | Design for the weakest common device; CSS transforms paint into GPU layers, so layer size matters | Per-screen budgets in section 6 |

## 3. Layout system

Canvas 960 x 540 CSS px (1920 x 1080 device). 1 rem = 16 px.

- **Safe area:** 48 px left and right, 27 px top and bottom (brand). Interactive content never leaves it. Rows may bleed off the right edge (peek) and backdrops bleed edge to edge.
- **Vertical rhythm:** top bar 27 to 71. Page header 80 to 120. Chips 128 to 164. Content from 176. Row title 28 px line, 8 px to cards. Sections 16 px apart.
- **Columns:** 864 px content width. Posters: 6 x 129 px (2:3, 194 px tall) with 18 px gutters, caption 9 px below (title 18 + meta 16). 16:9 cards: 204 x 115, 16 px gap, four across plus a peek (the fifth card starts at x = 928). Game cards: 3 x 276 px, 18 px gutters. Episode cards: 200 x 112.
- **Radii:** cards 16, posters 12 (they are small), rows 8 to 12, pills 999, dialogs 24, sheets square on the screen edge.
- **Elevation:** surface steps and 1 px `--a-border`. No shadows. Overlays use `--a-scrim`.
- **Top bar:** mark 28 px tall, tabs Outfit 500 18 px (selected 700 plus 3 px gradient underline, inset 16), search icon button 40 px, avatar 36 px. The NBA tab carries the LIVE pill only while a game is live. The bar slides away (translateY) when focus is more than one row down and comes back on Up or Back; detail pages and the player do not show it.
- **Tab order:** Home, Live, NBA, Movies, Series, Saved (live first, per the HIG), then Search and Account on the right.

### 3.1 Type usage (brand tokens; nothing new)

| Where | Token | Size / line |
|---|---|---|
| Page title ("Movies", "NBA") | head | 28 / 32 Outfit 700 |
| Detail title | display | 40 / 44 Outfit 700 |
| Row title ("Continue watching") | title | 22 / 28 Outfit 700 |
| Buttons | Outfit 700 | 17 |
| Card title | Inter 650 | 15 / 20 |
| Card meta, captions, guide sub-lines | caption | 13 / 16, text-3 or text-2 |
| Body (plot) | body | 16 / 24, text-2 |
| Labels (eyebrows, section names) | label | 14 / 18, caps, +0.08em |
| Scores (Sharp only) | score | 56 / 52 hero, 34 / 36 game plate, Barlow Condensed 800 italic |

Numerals are tabular everywhere (set on `body`).

### 3.2 Focus and selection

- **Focus ring** (`.f`): `--a-focus-ring` (3 px white, 2 px canvas gap) plus `scale(1.05)` on posters, wide cards, game cards, primary buttons.
- **Ring only** (`.f-ring`): chips, tabs, pill buttons, list rows, fields (text stays sharp; a 1.05 scale on a 15 px label is soft on weak panels).
- **Inset ring** (`.f-in`): guide cells only. Cells are 4 to 6 px apart, so an outside ring would sit on the neighbours. The 3 px white line is drawn inside the cell over `surface-3`. This is the one deviation from the brand focus spec; it is listed in section 9 for the brand check.
- **Selected** persists without focus: chip = surface-3 + pink dot + pink-text; tab = gradient underline; radio = pink dot; channel row in the guide = surface-2. Selected and focused show both.
- **Exactly one focused element per screen** (verified on each mock).

## 4. Motion (all transform and opacity)

| Moment | Property | Duration | Easing |
|---|---|---|---|
| Focus ring and lift | box-shadow swap (instant) and transform | 120 ms | `cubic-bezier(.2,.7,.2,1)` |
| Poster / card lift | transform scale 1 to 1.05 | 200 ms | same |
| Top bar hide/show | translateY(-100%) and opacity | 200 ms | same |
| Row scroll (vertical) | translateY of the page; target row sits 176 px from the top with the next row peeking | 320 ms | same |
| Rail scroll (horizontal) | translateX | 200 ms | same |
| Tab change | cross-fade of page content only (no slide, the guide is heavy) | 200 ms, started after a 250 ms dwell | same |
| Sheets and menus | translateX(24 px) to 0 plus opacity | 320 ms | same |
| Live wipe (live states only) | 12° slab translateX | 280 ms | `cubic-bezier(.7,0,.2,1)` |
| Reduced motion | everything above becomes a 120 ms opacity fade | | |

Never animate width, height, top, left, box-shadow or filter. Promote with `will-change: transform` only on the focused element; remove on blur.

## 5. Screens (milestone 1)

Each entry: purpose, layout, content rules, states, keys.

### 5.1 Home (`tv/home.html`)

Purpose: get to something playing in one press; surface what is live and what you were watching.
Layout: hero plate 864 x 182 at y 84 (radius 16, surface-1). For a live game: LIVE pill + quarter and clock; team discs 48 px with names and records; scores in Barlow italic 56 with a dash; leaders; primary Watch live (focused at launch), secondary Box score, a caption with where the game is on. A 12° slab at the right edge occupies about 17% of the hero with a parallel orchid line. Then "Continue watching" (16:9 cards, title and meta inside on a scrim, progress bar flush at the bottom) and "On now" (favourite channels first; logo tile, LIVE pill on live events, channel number, programme title, channel name and quality, progress to the end). Further rows after scrolling: NBA tonight (game cards), New in English (movies), New series, Saved.
Hero priority: your team live > any live game with a matched channel > resume (art backdrop, Resume button, minutes left) > last watched channel > "Pick something" empty state.
States: no game today shows the resume hero; no provider data shows skeleton blocks (flat surface-2, no shimmer); offline shows the offline card from section 8.
Keys: OK on a card plays or opens detail (movies and series open detail; live channels play; continue-watching items resume without a prompt). Hold OK saves. Up from the hero goes to the top bar.
Why not an auto-advancing carousel: Android TV warns against distracting backgrounds and text in hero art, and a rotating hero moves the primary button under the user's thumb.

### 5.2 Live guide (`tv/live.html`)

Purpose: see what is on, jump to it, favourite a channel.
Layout: now panel at y 80 (logo tile 56, programme title Outfit 22, LIVE pill, channel, times, time left and progress, one line of description, Watch primary, star toggle). Under it a ruler row: group chip at the left (All channels, Favourites, Sports, News, UK, Movies...), time labels every 30 min, the **now flag** (gradient pill with ink) and a 2 px pink line that sits behind the cells so it never crosses text. Rows are 48 px with 6 px gaps, six visible; channel cell 200 px (number, 32 px logo tile, name up to two lines, star for favourites), programme cells positioned by time over a 660 px window of three hours (about 3.67 px per minute, 30 min is 110 px). The window starts on the half hour before now; a cell that began before the window shows a left arrow and its start time. Cells under 45 min show the start time only.
Content: names are cleaned (`US| NBA LEAGUE PASS 04 ᴴᴰ` becomes "NBA League Pass 4", tag US, quality HD in the list view and now panel). Favourites first, then English-language groups, then others. The live event on a favourite channel is marked with the LIVE pill inside its cell.
States: no guide data for a channel = one cell spanning the window, "No guide information", still tunable; no guide for the provider = the List view (two-column channel list with now playing from the stream title, if any); loading = grey rows with the channel cells real and programme cells skeleton.
Keys: Left and Right move across programmes; Up and Down move channels; OK on the current programme tunes; OK on a future programme opens its info (no reminders in v1); hold OK toggles favourite; CH +/- page six rows; Menu opens the group list; Back returns to the top bar. The guide virtualises rows and cells (about 6 x 4 mounted plus one page either way).

### 5.3 NBA hub (`tv/nba.html`)

Purpose: where is my team, what is live, what is next; the only screen where Sharp is the main voice.
Layout: day strip (chips; Left/Right change day), your-team hero (slab, linescore table, leaders, Watch live, Box score, Plays), then "Tonight" as a 3-up grid of game cards ordered live, then upcoming by tip, then final. A game card is an upright Soft card; inside it a skewed (-12°) score plate holds upright numbers (live and final: both scores stacked in line with the two team rows; upcoming: the tip time). Status row: LIVE pill + period and clock, or "In 49 min", or "Final / OT"; broadcaster at the right.
Rules: plates skew, text, tables and focus rings never do. Box scores and standings are upright tables (final milestone; open item 3 of the brand brief).
States: no game for your team = the hero shows the next game and days away; no games = empty state with the next game day; scores service down = the offline card with a retry, last known data stays visible.
Keys: OK on a game card opens game detail (final milestone) with Watch in the first position; OK on Watch live tunes the matched channel (the user can change channel in the player).

### 5.4 Movies and Series grid (`tv/movies*.html`)

Purpose: browse a big, messy catalogue quickly, English first.
Layout: page header (title, count and "English first", Sort pill and Filters pill, with an active-filter count badge), category chip row (single select, chips from provider categories after cleaning; "New in English", "Top rated" and "4K" are smart chips), then the 6-column poster grid. Poster: 2:3 art with the title baked in by the provider (fallback: initials tile with the title, 3 lines), 4K tag top-left, language tag top-right when not English, resume bar flush at the bottom, caption below (title one line, then year and first genre).
Scrolled state: header and top bar slide away; two full rows plus captions fit between 24 and 514 px.
Sort menu: Recently added, Rating, Year, Title; "English first" is a persistent toggle inside the menu (on by default). Filters sheet (right, 420 px): Language (English first, English only, All), Genre (multi), Year (decades), Rating (6+, 7+, 8+); primary button "Show 214 titles" updates live. One primary per sheet.
Large catalogues: A to Z jump rail appears at the right when sorted by title (provisional); CH +/- page by a screenful; holding Down accelerates.
States: no results = "Nothing matches these filters" with Reset (secondary); poster without art = initials tile; provider category missing = chip hidden.

### 5.5 Detail: movie (`tv/detail-movie.html`) and series (`tv/detail-series.html`)

Purpose: decide and play.
Layout: art on the right 640 px with a left scrim (flat 2-stop, solid to 36%); text column 500 px: eyebrow (type and genres), title (display), meta line (star and rating in chalk, year, runtime or seasons, rating tag, 4K/HDR tags, language), plot (three lines max), credits, actions. Movies: Play (primary, focused), Save, subtitles shortcut; below, "More like this" (16:9 cards, 176 x 99). If a resume point exists: Resume (primary) with minutes left under it and Start over (secondary). Series: Resume S1 E3 (primary) with time left, Save, season chips, episode row (200 x 112 cards, episode number tag, watched check with dimmed art, progress bar on the current one); the next-up episode is focused when entering from the row.
Keys: Down from the actions to the row; Left and Right in the row; Back to the grid with the same item focused. Season chip OK swaps the row (200 ms).

## 6. Performance budget (measured on the mocks)

UI nodes per screen (excluding the procedural art SVG, which is a single `<img>` for real posters): Home 143, Live 174, NBA 184, Movies 142, Movies scrolled 93, Sort 164, Filters 178, Detail movie 63, Detail series 98. Budget is 1500. Rules: no filter or backdrop-filter, no box-shadow other than the focus ring, 2-stop gradients on small elements only (the two scrims are the exception and are flat vertical or horizontal), images decoded at display size (poster 129 x 194 css = 258 x 388 device px; card 204 x 115 = 408 x 230), rows virtualised to about two screens, guide virtualised both axes, `will-change` only on the focused element.

## 7. Content rules (messy provider data)

- Channel names: strip leading `XX|`, `XX:`, `|XX|`, `┃XX┃`, `USA|`; strip `HD FHD UHD 4K` and the superscript `ᴴᴰ` into a quality tag; sentence-case ALL CAPS only when the whole name is upper case and longer than 4 letters; keep the country as a tag. Numbers are the provider's channel numbers.
- Titles: strip `EN|`, year in parentheses (shown as meta), quality and `MULTI-SUB` noise; ALL CAPS to title case.
- Language: prefix (`EN|`, `FR|`, `SE|`) sets the language tag; English first is a sort policy, not a filter.
- Art: use `<img>` with the provider's poster; fallback is the initials tile; never stretch (cover, centred).

## 8. Components added in v1 (states: default, focused, selected, disabled)

Top bar and tabs, poster card, wide card, live card, episode card, game card with score plate, hero plate with slab, guide row and cell, now flag, chip row, pill button (Sort, Filters with count), sort menu (radio list + toggle), filter sheet, metaline, tags (quality, language), linescore table. Brand components reused unchanged: primary and secondary buttons, chips, LIVE pill, progress bar, toggle, list row, scrim.

## 9. Requests and exceptions for the brand consultant

1. Inset focus ring for guide cells (section 3.2).
2. Poster radius 12 (brand card radius 16 is for 16:9 cards).
3. LIVE pill inside the NBA tab and inside guide cells at 19 px height (brand pill is 22).
4. Team logo placeholders are flat discs in team colours with the abbreviation; real logos arrive from the data feed. Team colours are data, not UI colour; no amber or yellow is used in chrome.
5. Procedural art is a stand-in; the real-poster contrast check (scrim strength) is open item 1 of the brand brief. Card titles sit on an 86 to 94% scrim.

## 10. Open items

- UX brief: IA, flows, key map and acceptance criteria will replace the provisional parts.
- Final milestone: first launch and sign-in, Live list view, in-player mini guide, Series and Movies variants, search, NBA game detail (box score, team stats, plays), Saved, Account, update prompt, empty, error and loading states, native player overlays, phone and PC, launch animation.
