# airglow TV: UX brief (foundation for the UI pass)

Author: independent UX review (10-foot UI, streaming, live sports). Date: 26 Oct 2026.
Reads with: `design/brand-v5/v5.4/BRAND.md`, `tokens.css`, `BRIEF-for-UI.md`. Brand wins on look, this document wins on structure, behaviour, key maps and acceptance criteria. Where this brief needs something the brand forbids, it says so.

Canvas: 960 × 540 CSS px at 2× (1080p), Chrome 113 WebView on a Philips Google TV, D-pad remote, viewed from about 3 m. Playback in the native Media3 player (`android/.../PlayerActivity.java`).

---

## 0. The short version

**IA pick: a persistent top bar** (Search · Home · Live · NBA · Movies · Series, Account at the right), entered only with **Up from the first row** or **Back**. Left and Right never leave the content. Home is time-aware: on game days it opens on a Grizzlies spotlight with **Watch live** already focused. The native player becomes a real overlay system (channel list, game panel, options), not system dialogs.

Top 10 recommendations:

1. **Top bar, not a side rail**, because Left/Right is the main browsing axis in rows, the guide grid and the player, and the owner's top complaint is focus falling into the side menu (section 4.1). Back from any section's content goes to its tab in one press.
2. **One press to the game.** Home's default focus on game days is *Watch live* on the right channel, with the score already synced. Remember which channel showed the Grizzlies and reuse it (4.11, flow 5.2).
3. **Spoiler shield** (Off / My team / All games), applied *everywhere* at once: Home cards, spotlight, toasts, NBA hub, finals, records and leaders. Scores in the player always follow the stream delay, which is remembered per channel (4.11).
4. **Player key map without modes**: Up/Down zap, OK = channel list (always), hold OK = last channel, Right = game or info panel, Left/Menu = options, CC key = subtitles. Today OK means different things depending on whether a game is linked (4.6).
5. **Replace the player's AlertDialogs** with a branded mini-guide (logos, now/next, groups, your team pinned) and side panels. Today the channel list is a plain text list of every channel with no guide data, and the banner doesn't say what's on (audit P5, P6).
6. **One title, many versions**: clean the provider names ("EN | The Dark Knight 4K" becomes *The Dark Knight* with badges), merge duplicates into one card and pick the version (language or quality) on the detail page (4.9).
7. **Browse 50k titles through shelves first and a grid second**: default to curated rows (Popular in your languages, Top rated, New, genres), and put "All" behind one filter sheet. The provider category column goes, so there is one filter system, not three (4.9).
8. **Global search** across channels, programmes, movies, series and teams, with normalised matching (accents, punctuation, prefixes, "spiderman" = "Spider-Man"), an in-app keyboard with results beside it, and voice (4.10).
9. **Performance as a feature**: virtualise every grid (today the movie grid grows without limit), no smooth scrolling during key repeat, cache-first everything, and measured budgets: ring moves in ≤ 1 frame (p95 ≤ 100 ms), zap to picture ≤ 1.5 s p50, launch to interactive ≤ 2 s (section 8).
10. **Prompts never steal focus.** The update prompt currently grabs the first arrow or OK press on any screen. Updates download in the background and are offered at launch or from Account, never during playback or a live game (4.13, flow 5.8).

---

## 1. Context and hard constraints

| Constraint | Consequence for the design |
|---|---|
| D-pad, OK, Back, Home, CH+/−, number keys, Captions, Menu; Philips layouts vary by model ([S50](#sources)) | Everything must work with **D-pad + OK + Back only**. CH±, numbers, CC, Menu and colour keys are accelerators, never the only route ([S7](#sources): don't depend on the Menu button). |
| 960 × 540 CSS px, 2× | 1 CSS px = 2 device px. Safe area **48 px left/right, 27 px top/bottom** ([S1](#sources)); backgrounds may bleed past it. |
| Chrome 113 WebView, weak GPU | Transform and opacity only ([S46](#sources)); no filter, blur or backdrop; virtualise lists; no smooth scrolling under key repeat. `:has()`, container queries and `content-visibility` are available (Chrome ≥ 105/85). |
| Native player is a separate Activity | Overlays in the player are native views; the WebView is paused underneath. Anything the owner needs **while watching** must exist natively (channel list, score, options). |
| IPTV accounts limit connections (Account shows "n of m connections in use") | **No autoplaying previews, no multi-stream tiles, no video behind the UI.** Focusing a channel must never open a second stream. |
| Provider data is messy | Names carry language prefixes, quality tags and years. Categories double as genre and language. EPG is fetched per channel. Design for missing art, missing EPG and 4-line titles. |
| One owner, several provider accounts | **No profile gate** (it costs a press every launch). Accounts are switched in Account. |

---

## 2. Research: what the evidence says

Each finding ends with what it means for airglow. Source IDs refer to the list at the end. "(summary)" marks a source I could only read through search snippets because the page would not load here; treat those numbers as reported, not verified.

### 2.1 Platform guidance (10-foot UI)

- **Android TV / Google TV** ([S1–S7](#sources)): design at 960 × 540 dp with 5% margins (48/27), and let decorative backgrounds bleed. Exactly one focused element; focus shown by scale (1.025 / 1.05 / 1.1), outline, colour or glow. Categories run vertically and items horizontally. "Avoid complex and nested layout hierarchies"; "organise your information in a way that requires the fewest screens". Back goes to the previous destination and ends on the launcher with **no exit confirmation**, and no splash in the back stack. With **top navigation, Back scrolls to the top and focuses the menu**; with left navigation, Back focuses the active menu item. Press-and-hold OK "can be used to show more options". Navigation drawers: 5–6 primary destinations, icons required; a *standard* drawer switches content on focus, a *modal* one on select. Quality checklist: Back must end on Home and the app must not depend on the Menu button.
  → *Back rules, hold-OK context menus and the destination count in section 4 follow these.*
- **Apple tvOS** ([S10, S11](#sources)): focus and select are separate acts; rely on the system's focus effects. The tvOS tab bar sits **at the top**; Down or Select moves into content; there is no "More" tab, so only what fits is shown. Apple's own TV app nonetheless **moved its top tabs into a left sidebar** opened with Left in tvOS 17.2 ([S12](#sources)).
  → *Even Apple uses both; the choice depends on what Left/Right must do in the content (4.1).*
- **Fire TV** ([S13](#sources), summary): 10-foot UI, overscan varies by maker, body text **≥ 14 sp ≈ 28 px at 1080p**, treated as a floor rather than a target ([S17](#sources)).
  → *At 2× that is 14 CSS px. The brand floor of 13 px is below Amazon's body minimum; restrict 13 px to non-essential captions (section 8.3).*
- **Samsung Tizen** ([S14](#sources)): average viewing distance 3 m; the required controls are four-way navigation, focus selection, return and exit.
- **Roku** ([S15](#sources), dated): title-safe at 10% per side in 720p. Modern guidance treats overscan as mostly obsolete ([S1](#sources), [S16](#sources)).
  → *Keep text and focus inside 48/27, verify on the Philips with its overscan setting off, and let art bleed.*

### 2.2 How best-in-class apps structure TV navigation

| App (year) | Top-level navigation | Note |
|---|---|---|
| Netflix (2025) | **Left menu replaced by an always-visible top bar**: Search, Shows, Movies, Games, My Netflix ([S20](#sources)) | "My List" became the My Netflix hub (continue, list, reminders). |
| Prime Video (2024) | **Top bar** with Home, Movies, TV Shows, Sports, **Live TV**; the 2022 version used a side menu ([S21](#sources)) | Live TV is a guide hub. |
| Disney+ (2025) | **Top bar** (For You, brand tabs) plus a kept left vertical menu for search, settings and watchlist; a **Live** tab added ([S22](#sources)) | A hybrid. |
| Apple TV app (tvOS 17.2, 2023) | **Left sidebar**, opened with Left; profile at the top ([S12](#sources)) | Moved *away* from top tabs. |
| Plex (2025 → 2026) | Moved to a top menu; users reported actions going from "two clicks to around six" and having to "scroll all the way to the top". **Plex restored the left panel in Aug 2026** ([S23](#sources)) | The failure was added presses to frequent destinations plus slowness, not top placement alone. |
| YouTube TV | Top tabs (Home, Live, Library); live guide; **mini guide while watching**; **hold OK = last channel** ([S26, S27](#sources)) | |
| TiviMate (community accounts) | Guide-first; OK while watching opens a channel list or recent channels; Right = previous channel ([S34](#sources)) | IPTV power-user conventions. |
| Channels DVR | Users explicitly asked for a guide overlay without leaving the stream ([S35](#sources)) | Confirms the need for a mini guide. |
| Kodi skins (Arctic Zephyr/Horizon) | Vertical menu of hubs plus horizontal widget rows, all user-configurable ([S37](#sources)) | Power users want to choose their rows. |
| ESPN (2025) | Stats, fantasy and bet **panels beside the live video**; phone sync (StreamCenter); multiview; "Catch Up to Live" ([S32](#sources)) | |
| Prime Video NBA (2025) | Key Moments, **Rapid Recap** (≤ 2 min catch-up), stats "without leaving the live game" ([S31](#sources)) | |

**Contested:** top bar vs side rail. Since 2024 the big three (Netflix, Prime, Disney+) went top. Apple went the other way in 2023 and Plex was forced back to the left in 2026. No public study settles it. The deciding factors are product-specific: what Left/Right must do in content, and how many presses the frequent destinations cost. See 4.1.

### 2.3 Focus models, rows and grids

- One focus; scale plus a ring; the focus position is remembered per row (Android focus restorer, tvOS focus memory) ([S4, S10](#sources)).
- Rows: categories vertical, items horizontal ([S2](#sources)). Netflix-style **fixed focus position** (the focused card stays at the same x and the row scrolls under it) cuts eye travel. The current Home already does this (`app.js` focusin handler, about line 2577).
- Lists: Up/Down scrolls the whole list and every item can be selected ([S2](#sources)).
- **Netflix's own research**: members lose interest after about **60–90 s** of choosing, having looked at **10–20 titles, about 3 in detail**, on one or two screens ([S38](#sources)). → *Home and the Movies/Series front pages must put good candidates in the first two rows; the 50k grid is a fallback, not the front door.*

### 2.4 Live guide (EPG), zapping, mini guide

- **Grid vs list:** in a small usability study (18 users, 3 EPGs) users oriented fastest in the **grid**, found list views involved "interminable scrolling", and were confused by switching between views ([S41](#sources)). The grid's weaknesses are tiny cells for short shows and truncated titles. → *A time grid with "now" anchored at the left edge, plus a now/next fallback for channels without EPG.*
- **Zap time:** Kooij et al. found zapping must be **< 0.43 s to be rated "good"** sitting forward, **relaxed to 0.67 s** on a sofa, and that **variable** delays lower ratings further ([S42](#sources)). IPTV over HTTP cannot reach that, so perceived speed has to come from the banner changing instantly (already done in `zap()`), a held last frame or channel card instead of black, and consistent timing.
- **Last channel:** YouTube TV shipped **long-press OK = last channel** in 2024 ([S26](#sources)), which validates the current hold-OK.
- **Mini guide while watching:** YouTube TV and TiviMate have it; Channels users ask for it ([S27, S34, S35](#sources)).
- **Up = next or previous channel** is genuinely split: Kodi users ask to swap it ([S36](#sources)). airglow is inconsistent *today* (audit P4). → *One default everywhere, plus a setting.*

### 2.5 Search with a remote

- Netflix's TV keyboard is an **alphabetical grid** (7 × 6 in 2018) with **results updating after every letter**, so you rarely need the full title ([S39](#sources)).
- **Alphabetical vs QWERTY is contested.** A 2006 study on a rotary controller found alphabetical layouts faster, especially for older users ([S40](#sources)); hobbyist testing calls alphabetical grids "unacceptably slow" ([S39](#sources)). No head-to-head remote study was found. → *Alphabetical 6 × 6 with live results and voice, because results after 3–4 letters dominate the cost.*
- Text entry on TV is costly enough that platforms prefer **second-screen sign-in** (a code or QR on the TV, typing on the phone) ([S49](#sources)).

### 2.6 Live sports overlays and spoilers

- **YouTube TV** stats and key plays are **synced to the time you are watching**, so you can check stats behind live "without getting spoilers"; **Hide scores** works per team or league, across devices, and hides final scores and live previews ([S24, S25](#sources), summary).
- **NBA app**: a Hide Scores toggle (on TV: Games → next to the calendar), with a documented gap: home-page headlines and images can still reveal results ([S28](#sources)).
- **Apple TV**: "Show Sport Scores" off; MLS fans complained that scores still showed in replays, slideshows, icons and thumbnails ([S29](#sources)). Apple added **Catch Up** (key plays in order) ([S30](#sources)).
- **ESPN / Prime**: stats panels **beside** the video, never over the action; Rapid Recap ([S31, S32](#sources)). DAZN: a live-scores on/off toggle ([S33](#sources)).
- **Contested:** "spoilers don't spoil" (Leavitt & Christenfeld) found spoilers *increase* enjoyment of short stories ([S47](#sources)); there is no comparable evidence for live sport, where uncertainty is the product. The owner asked for it, and it is cheap, so offer it.
  → *Lessons: a spoiler mode must cover every surface (thumbnails, hero, toasts, records, "OT" labels), not just the score text; and in-player stats must follow the stream's delay.*

### 2.7 Accessibility at 10 ft

- **Text:** Amazon gives 28 px at 1080p as the body minimum ([S13, S17](#sources)); legibility standards ask for **16–20 arcminutes** of capital-letter height, and DIN 66234 chose **18′** "even for people with slightly impaired vision" ([S19](#sources)). Worked out for this TV in 8.3.
- **Focus:** WCAG 2.4.13 asks for an indicator with ≥ 3:1 contrast that is ≥ 2 CSS px thick or encloses the component ([S18](#sources)). The brand's 3 px white ring with a 2 px gap passes easily.
- **Safe areas:** 48/27 ([S1](#sources)).
- **Colour:** never colour alone (the brand already requires shape plus text).

### 2.8 Perceived performance

- **Response limits**: 0.1 s feels instant, 1 s keeps flow, 10 s loses attention ([S44](#sources)).
- **Video start**: viewers start abandoning after **2 s**, with about **+5.8% abandonment per extra second** ([S43](#sources)).
- **Skeletons**: NN/g recommends them for full-page loads only ([S45](#sources)); the evidence on perceived speed is mixed (one study found skeletons felt slowest; another found them slightly faster). → *Use static skeletons only where a full section loads cold; cache-first rendering makes them rare. No shimmer (brand rule and repaint cost).*
- **Animation**: only transform and opacity stay on the compositor ([S46](#sources)).

---

## 3. Audit of the current app (code + README)

### 3.1 The real navigation today

- **Shell** (`app/index.html`): a left rail (Home, Live, Movies, Series, NBA, Saved, Account), collapsed to 80 px icons on TV and expanding to 248 px with labels while it has focus. Rail entry is gated: `data-nav-in="left"` means only Left enters (`app/nav.js:38–62`).
- **Home** (`app.js:2447–2610`): a 280 px focus-driven hero (`styles.css:791`, 17.5 rem of 540) plus rows: NBA tonight, Continue watching, Your channels, Recently watched, My list, New movies, New series. OK on a game tunes the first channel whose *name* matches the game, otherwise it opens the NBA tab.
- **Live**: groups column | virtualised channel list | a "now card" with the guide for the focused channel. No video preview on TV (`styles.css:726`). OK opens the native player with the **current group as the zap ring** (`liveMpv`, `app.js:1082`).
- **Movies/Series**: provider category column + header chips (Sort, Language, Genre, Quality, Subtitles, Clear) + poster grid appended 90 at a time.
- **Detail**: a full-screen sheet with Play/Resume focused.
- **NBA**: day switcher, game list, detail with linescore, leaders, box score, plays, and "Find on TV".
- **Native player** (`PlayerActivity.java`): live: Up/CH+ = next, Down/CH− = previous, Left/Right = Options dialog, OK = channel list *or* the stats panel when a game is linked, hold OK = last channel, digits jump. VOD: Left/Right seek 10 s, Down = Options, OK/Up = controls.
- **Back**: content → rail → minimise the app. **Update**: a bar 8 s after launch.

### 3.2 Problems found (severity: H = hurts daily use, M = friction, L = polish)

| # | Sev | Problem | Evidence |
|---|---|---|---|
| P1 | H | **The update prompt hijacks the remote.** While the bar is visible, the *first arrow or OK press on any screen* is swallowed and moves focus to Update; the bar also takes focus when it appears, 8 s after launch, often mid-navigation. A second OK starts a download the owner didn't choose. | `app.js:2624`, `app.js:2698–2704` |
| P2 | H | **Focus overshoots into the side menu.** The gate is correct, but key auto-repeat on Left while scrolling a row runs past the first card into the rail. `Nav.move` ignores `e.repeat`. Every move also calls `scrollIntoView` and Home uses `behavior:'smooth'`, so a held key queues animations and the UI lags behind the remote. | `nav.js:73`, `app.js:2582–2584` |
| P3 | H | **OK in the live player is mode-dependent**: the channel list normally, the stats panel when a game is linked. Left and Right both open the same Options dialog, wasting a key. | `PlayerActivity.java:769`, `:380` |
| P4 | H | **Zap direction differs by platform**: TV Up = next (`index + 1`), PC Up = previous (`zap(-1)`). | `PlayerActivity.java:382`, `app.js:1214` |
| P5 | H | **The in-player channel list is an unbranded system AlertDialog**: number plus name only, every channel in the group (can be thousands), no logos, no now/next, no groups, no search. Options, subtitles, audio and picture are also system dialogs. | `PlayerActivity.java:420–446`, `:777–785` |
| P6 | M | **The player banner doesn't say what's on**: channel title, quality and CC, but no programme, progress or next. | `PlayerActivity.java:316–331` |
| P7 | H | **The zap ring is hidden context**: up/down cycles whatever group was last selected in Live, even when you tuned from Home's "Your channels". | `app.js:1082–1086` |
| P8 | H | **Scores spoil.** The Home NBA row and hero show *real-time* scores even when the stream is 30–90 s behind; the tip-off toast includes the live score; finals of your team stay on Home; the NBA tab is "always real time" (README). There is no hide-scores mode. | `app.js:2449`, `:2477–2481`, `:2544–2552`, `:2001–2006` |
| P9 | M | **"Find on TV" from Home matches channel names only**, not the guide, so games on ESPN or regional channels fall through to the NBA tab, then *Find on TV*, then a list: 4–6 extra presses at the worst moment. Nothing remembers which channel worked last time. | `app.js:2595–2600`, `drawWatchList` |
| P10 | H | **The movie/series grid is not virtualised**: `moreLib` appends 90 posters per page forever, so a long scroll leaves thousands of nodes and decoded images in the DOM. A likely cause of the "slowness and freezes". | `app.js:1285–1293` |
| P11 | H | **Three overlapping filter systems**: the provider category column (often hundreds of "EN \| ACTION" style groups), header chips (genre and language are *derived from those same categories*), and Favorites/Continue as pseudo-categories. This is the "cluttered sorts" complaint at the structural level. | `app.js:426–441`, `:645–675` |
| P12 | H | **Raw provider names are displayed and searched.** Posters show "EN \| The Dark Knight 4K"; search is a substring match on the lowercased raw name (`_s`), so "spiderman" misses "Spider-Man" and accents must match. A good normaliser (`titles.js` `norm`/`clean`) exists but is only used for IMDb matching. Duplicate versions of one film appear as separate cards. | `app.js:339`, `:455`, `titles.js` |
| P13 | M | **Search is per section**, inside a column, and needs the system keyboard; there is no global search and no voice. | `index.html` (`#liveQ`, `#movieQ`, `#seriesQ`) |
| P14 | M | **The Home hero takes 280 of 540 px** and re-renders on every focus change (a poster backdrop plus two large radial gradients), so only about 1.5 rows are visible, at a repaint cost on each move. | `styles.css:791–795`, `drawHero` `app.js:2538` |
| P15 | M | **The rail animates `width`** (layout on every frame) and dims the screen with a full-screen layer; this breaks the brand's transform/opacity rule. | `styles.css:676–683` |
| P16 | M | **Favourites live in three places** (the Saved page, the "Favorites" category in each section, the Home rows) with different layouts. | `renderFavs`, `renderCats` |
| P17 | M | **TV sign-in requires typing** a server URL, username and password with the remote; the "paste the get.php link" shortcut needs a keyboard. | `index.html` login |
| P18 | L | Text below the 13 px floor: category language tag 11 px, account pills 12 px, the player stats footer 12 sp; the stats panel is 400 dp against a brand spec of 250. | `styles.css:175`, `:847`; `PlayerActivity.java:546`, `:611` |
| P19 | M | **"Black bars"**: picture size is one global setting (Fit/Zoom/Stretch), so a letterboxed 4:3 channel and a scope film need opposite choices. | `PlayerActivity.java:464–480` |
| P20 | M | **Cards collide with panels**: cards scale 1.06–1.08 plus a ring and a 40 px shadow (`styles.css:541`, `:761`), but scroll containers and neighbouring fixed panels have no reserved gutter for the grown card. | `styles.css:761` |
| P21 | L | The tip-off alert is a plain toast with no action, so it can't take you to the game. | `app.js:2001–2006` |
| P22 | L | After 6 failed reconnects the player says "Press OK on it in the guide to try again", which forces you to leave the player. | `PlayerActivity.java:262–270` |

What works and should be kept: a cache-first catalogue with background refresh; the virtualised channel list; focus kept on refresh (`setHtml`); OK-to-edit text fields (fixes "keyboard opens without OK"); hold OK = last channel; instant banner on zap with a delayed tune while the key is held; per-language subtitle memory; score sync by picking the basket you just saw; IMDb-based Popular and Top rated; Match frame rate off by default.

---

## 4. Information architecture and navigation model

### 4.1 Navigation model: options, trade-offs, pick

| | A. Left rail (current; Apple TV app; Google's drawer) | **B. Top bar (Netflix, Prime, Disney+, tvOS default)** | C. Hub-only (Home tiles to sections, Kodi-like) |
|---|---|---|---|
| Space at 540 tall | Costs width (72–80 px, 8%) | Costs 56 px height (10%), **reclaimed by hiding the bar** once focus is below the first row | Nothing |
| Labels visible | Only while open (icons when collapsed) | **Always** (recognition, not recall) | Only on Home |
| Reach from deep content | Left × column count, or Back | Up × row count, or **Back (1 press)** | Back to Home, then pick |
| Conflict with content keys | **High**: Left is the browsing axis in rows, the guide's time axis and the library grid; repeated Left overshoots into the menu (P2, the owner's complaint) | **Low**: Left/Right never leave content; only Up at the first row enters the bar | None, but every switch costs presses |
| Evidence | Apple 2023; Plex users fought for it (2026) | Netflix 2025, Prime 2024, Disney+ 2025 | Kodi, older Android TV launchers |
| Risk | Overshoot; icons-only ambiguity | Plex-style "too many presses" if frequent things are buried | Slow switching |

**Pick: B, a top bar with strict rules.** The reason is not fashion. airglow's three core surfaces (Home rows, the guide grid, the player's channel list) all use Left/Right for content, and the owner has repeatedly hit accidental menu entry. A top bar removes that class of bug structurally. Plex's failure is avoided with three rules:

1. **Every frequent destination is one press from the bar**, with no nested menus in the bar (Plex buried libraries).
2. **Back from any content goes to the bar in one press** (Android top-nav behaviour, [S2](#sources)).
3. **The bar hides when focus goes below the first row** and returns on Back or when focus is back in the first row, so it costs no height while browsing.

*Tab activation:* content switches **on focus after a 300 ms dwell**, rendered from cache, so sliding past tabs doesn't load catalogues; OK or Down enters the content. If a section can't render from cache in 300 ms, switch on OK only. This is contested: Android's standard drawer switches on focus, the modal one on select ([S3](#sources)).

The in-progress mocks (`design/ui-v1/png/tv-home.png`, `tv-live.png`) already use a top bar; the rules above make it safe.

### 4.2 Top-level destinations

`[mark] Search · Home · Live · NBA · Movies · Series ............ [Account]`

- **Six destinations plus Account** (Android: 5–6 primary, [S3](#sources)). Search sits first, as at Netflix and Apple, one Left from Home.
- **Saved is folded in, not top-level**: "My list" and "Your channels" are Home rows, "Saved" is a filter in Movies/Series and a group in Live. This removes P16. *Trade-off:* if the owner uses Saved as a destination daily, restore it as a seventh tab; the bar has room.
- **NBA carries a LIVE pill** in the bar only while your team is live (one LIVE per bar, brand rule).
- Account (avatar at the right): provider status and expiry, playback, NBA, languages, updates, about.

### 4.3 Home structure (TV)

Home is **time-aware**. Order (rows hide when empty; at most 7 rows; at most 20 items per row plus a "See all" end card):

| # | Row | Card | Rules |
|---|---|---|---|
| 0 | **Spotlight** (conditional) | Sharp game hero, 176 px tall | Shown from 3 h before your team's tip-off until 30 min after the final. Primary: **Watch live on ‹channel›** (or "Choose channel" if none is known); secondary: Box score. Obeys the spoiler shield. **Default focus on Home while shown.** |
| 1 | **On now** | 16:9 channel cards: logo, now title, progress; live NBA games first, then your channels | Replaces "NBA tonight" + "Your channels" + "Recently watched". Order: your team's game, other live NBA, favourite channels (your order), recent channels. |
| 2 | **Continue watching** | 16:9 with progress (backdrop if cached, else the poster centred on a surface-2 tile with the title) | 30 s < t < 94%; a finished episode becomes the next episode; hold OK: remove, mark watched. **Default focus when there is no spotlight.** OK resumes straight away, with no detail page. |
| 3 | **My list** | 2:3 posters | Movies and series you saved. |
| 4 | **Popular in ‹your languages›** | 2:3 | IMDb popularity, this week's additions boosted. |
| 5 | **New on ‹provider›** | 2:3 | Recently added, de-duplicated. |
| 6 | **Top rated** or one genre row the owner pins | 2:3 | Optional; Kodi-style "pin a row" in Account. |

- **Kill the focus-driven 280 px hero** (P14). The focused card's details go in a **one-line info strip** under the row title (title · year · IMDb · runtime, or channel · now · ends 21:30): a cheap text swap instead of a full repaint.
- **Posters:** provider art for movies and series is portrait 2:3, so title rows use 2:3. The brand's 16:9 poster card suits Continue (backdrop) and channels. Cropping a 2:3 poster to 16:9 loses titles and faces. *Brand check needed: request a 2:3 card variant.*
- Launch focus: the Spotlight's *Watch live* if shown, else the first Continue card, else the first On now card.

### 4.4 How Live, NBA, Movies and Series relate

```
Channel ──has──> Programme (EPG, now/next/day) ──may be──> Game (ESPN)
   ▲                                                        │
   └──────────── learned link: "this team's games are on ──┘
                 FanDuel SE / NBA 07" (remembered per team)
Title (movie | series) ──has versions──> Stream (lang, quality, subs)
Series ──> Season ──> Episode ──progress──> Continue entry
```

- **Live** is the guide over channels. **NBA** is a live *layer* over channels: a game card is a shortcut to a channel plus a synced score. In the guide, a programme that is an NBA game shows team marks and (spoiler-aware) the score; in NBA, a game shows where to watch.
- **Movies** and **Series** share one browse system (same shelves, filter sheet, grid and detail template) and differ only in content, so the owner learns one thing.
- **Continue watching** spans movies and episodes; **last channel** and recent channels live in On now, not in Continue.

### 4.5 Remote key map in the app (outside the player)

| Key | Action |
|---|---|
| D-pad | Move focus (rules in 4.7). |
| OK | Activate. On a channel: tune (open the player). On a title: detail page. On Continue: resume immediately. |
| **Hold OK (≥ 500 ms)** | Context menu (sheet): Add to / remove from My list · Favourite channel · Mark watched · Remove from Continue · Reveal score (spoiler shield) · Info. The pressed state appears at 150 ms so the hold is discoverable. ([S2](#sources): press and hold for more options.) |
| Back | Back stack (4.8). |
| CH+ / CH− | Page up/down one screen in lists, grids and the guide; on the guide's time axis, ±2 h. |
| 0–9 | Anywhere outside a text field: type a channel number and tune after 1.3 s (or press OK at once). In the guide: jump to that channel instead (focus, don't tune). |
| Play/Pause (if present) | On a focused title or channel: play without the detail page. |
| Captions / Menu / colour keys | Not used outside the player (never required). |
| Mic / Assistant | System (Google). In-app voice search is the mic key on the search keyboard (4.10). |

### 4.6 Remote key map in the player

**Live TV, no overlay open**

| Key | Action | Change vs today |
|---|---|---|
| Up / CH+ | Next channel in the zap ring | same on TV; **PC changes to match** (P4) |
| Down / CH− | Previous channel | same |
| Hold Up/Down | Banner scrolls through channels; tunes 450 ms after release | same (keep) |
| **OK** | **Channel list (mini guide)** opens on the current channel, **always** | was "stats" when a game was linked (P3) |
| Hold OK | Last channel | same (validated by YouTube TV, [S26](#sources)) |
| **Right** | **Game panel** if this channel shows a linked game; else, if any NBA game is live, the **Live games panel** (your team first, OK switches); else the **programme info panel** (now/next, description) | was Options |
| **Left** / Menu | **Options sheet** | Left was Options too |
| Captions | Subtitles list directly | same |
| Info / Guide | Banner (4 s) + score peek (if a game is linked) | similar |
| 0–9 | Channel number, tunes after 1.3 s or on OK | same |
| Back | Exit the player to where you came from, with focus on the channel you were watching. **No confirmation** ([S2](#sources)). | same |
| Play/Pause | Pause (live pauses only if the provider allows; otherwise it toasts "Live can't pause on this channel") | same |

**Inside overlays**

| Overlay | Up/Down | Left | Right | OK | Back |
|---|---|---|---|---|---|
| Channel list (left panel) | move; CH± pages 7 rows | opens the **groups column** (Favourites · Recent · Live games · Sports · provider groups) | closes | tune (the panel closes, banner shows) | closes |
| Groups column | move | – | back to channels | choose group | closes the panel |
| Game panel (right) | scroll the box score | previous tab | next tab (Score · Your team · Opponent · Plays) | closes | closes |
| Options sheet (left) | move | – | opens a sub-list | choose | up one level, then close |

**Spatial rule:** what opens with Left appears at the left and what opens with Right appears at the right, and only one overlay is open at a time. The channel list opens from OK and also lives at the left, which matches the owner's TiviMate-style habit ([S34](#sources)).

**Time-boxed actions** (a precedent is Netflix's Skip Intro button): an action chip may bind **OK for 8 s** when no overlay is open, with a visible countdown ring, for example "Grizzlies are live on NBA 07 · OK to switch". After 8 s, OK goes back to the channel list. At most one chip at a time; never during the first 10 s after a tune.

**Movies and episodes**

| Key | Action |
|---|---|
| OK / Play/Pause | Play/pause + controls |
| Left / Right | Seek −10/+10 s; hold = scrub with acceleration (×2 per second held, capped at ×32), with a time bubble; release to seek |
| Down / Menu | Options (Subtitles · Audio · Picture size · Match frame rate · Speed) |
| Up | Controls + info (title, episode, ends at 22:14) |
| Captions | Subtitles directly |
| CH+ | Next episode (keep) |
| Back | Controls visible: hide them. Else exit, saving progress. |
| End of an episode | "Next episode in 10 s · OK", Back cancels (Netflix pattern) |

### 4.7 Focus rules (the UI must meet all of them)

- **F1 One focus, always.** A visible element always has focus while UI is on screen; `document.activeElement === body` for more than one frame is a bug. Every screen defines its **entry focus** (table in 8.6).
- **F2 Focus memory.** Returning to a row, tab, grid or page restores the last focused item (and scroll). Leaving the detail page returns to the card that opened it.
- **F3 Edges stop.** Rows and grids do not wrap. An **auto-repeated** key (`e.repeat`) never crosses a container boundary (row to row, content to bar, list to panel); it stops at the edge. A fresh press crosses. This is the fix for P2.
- **F4 Entering the bar** only with Up from the first row of content (a fresh press) or with Back. Left/Right never enter the bar.
- **F5 Vertical moves between rows** land on the target row's remembered item, or its first visible item, aligned to the fixed focus position. Never land on a card that is off-screen.
- **F6 Sheets, dialogs and the keyboard trap focus**; Back closes them and restores the opener's focus.
- **F7 Data never moves focus.** Score refreshes, EPG loads and catalogue updates keep the focused item and its screen position (insert after, never above). The existing `setHtml` key restore is the model.
- **F8 Nothing steals focus**: not updates, alerts or toasts. The only exception is a time-boxed chip in the player (4.6), which binds OK without moving focus.
- **F9 Focus ≠ edit.** Text fields open the keyboard only on OK (keep the current behaviour). In search the in-app keyboard has focus by default; Down or Right goes to results.
- **F10 Key repeat:** held directions move at least 8 items/s, accelerate after 1.5 s, and **disable smooth scrolling and focus animations while repeating** (instant positioning).
- **F11 The focused item is fully visible**, inside the safe area, never under a fixed panel or the bar, with room for its scale (gutter rule in 8.6).

### 4.8 Back-stack behaviour

| Where you are | Back does |
|---|---|
| Overlay, sheet, keyboard, context menu | Close it, restore focus |
| Detail page / game page / episode list | Return to the origin, focus on the opener |
| Section content (any depth in rows or grid) | Scroll to the top, show the bar, **focus the current tab** |
| A tab other than Home | Go to Home **with Home's entry focus** (the Spotlight's *Watch live* during a game window) |
| Home tab | Exit to the Google TV launcher (no confirmation) |
| Player | Close the overlay; else exit to the origin with the playing item focused |
| Search with text | First Back clears focus to the keyboard, second goes to the bar (keeps the query for 10 min) |

Exit from Home content = 2 presses. From any section to the game = 3 (flow 5.2). No splash in the stack ([S2](#sources)).

### 4.9 Browsing and filtering 50k titles with a remote

Principle: **the front door is shelves; the grid is a tool.** Netflix's 60–90 s and 10–20 titles ([S38](#sources)) means the first two rows decide most sessions.

**Clean the data before designing the screen** (fixes P11, P12):
- **Display names** use `Titles.clean()`: strip language prefixes, years in brackets and quality or sub tags. Show them as badges (`4K`, `HDR`, `Subs`, `EN`) and the year as meta.
- **One title, many versions**: group items by normalised title + year (or IMDb match) into one card. The detail page shows a **Version** picker (English 4K · English HD · Multi-sub), defaulting to your language and the best quality the TV can decode. Counts drop sharply and duplicates disappear from shelves.
- **Your languages** (set once, default English): a global filter for shelves and search ranking. Other languages appear under "All languages" in the filter sheet.

**Movies / Series front page (shelves):** Continue (that kind only) · My list · Popular in your languages · Top rated · New releases (by year) · Recently added · 4K · genre rows (top 6 genres by count) · "Browse all ‹48,210›" as the end card of every row and as a button in the page header.

**Browse all (grid):**
- 6 columns of 2:3 posters at 124 × 186 CSS px (8.6); about 2.5 rows visible; **virtualised** (≤ 6 rows rendered: the 2–3 visible plus 2 above and below; P10).
- Header (one row): `Sort: Popular ▾` · `Filters (2) ▾` · `Jump ▾` · count. That is three controls, not six chips.
- **Sort sheet**: Popular · Top rated · Newest · Recently added · A–Z (5, one list).
- **Filter sheet** (right, 320 px): Language · Genre · Quality · Subtitles · Decade · IMDb ≥ 6/7/8 · Saved only · Provider category (last, collapsed). Each option shows its **live count**; results update behind the sheet; "Clear all" at the top. Back closes and focuses the first result.
- **Jump**: with A–Z sort, a letter grid (2 presses); otherwise jump to the top. CH± pages by a screen.
- Empty result: "Nothing matches these filters" with one button, "Remove last filter".
- **No category column.** Provider categories survive only as a filter facet and inside search.

### 4.10 Search

- **Global**: one Search destination searches channels (name, number), programmes (now and the next 24 h from cached EPG), movies, series (de-duplicated) and NBA teams or games. Results are grouped in rows: Top result · Channels · On TV now/later · Movies · Series.
- **Matching**: `Titles.norm` on both query and index (accents, punctuation, "&" = "and", leading articles), word-prefix matching ("dar kni" finds *The Dark Knight*), joined forms ("spiderman" = "spider man"), initialisms for channels ("bbc1" = "BBC One"). Ranking: exact title > word-prefix > substring, then popularity, then your languages. Index built once per catalogue load, off the main thread in chunks; results in ≤ 150 ms per keystroke (8.2).
- **Keyboard**: in-app 6 × 6 alphabetical grid (A–Z, 0–9) with space, delete and clear on a side column, and a **mic key first**. Results sit to the right of the keyboard and update after every letter. Focus starts on **A**, with the mic key one Up away. *Contested* (alphabetical vs QWERTY, [S39, S40](#sources)); alphabetical is chosen because results after 3–4 letters dominate.
- **Voice**: the mic key calls Android's `SpeechRecognizer` / `RecognizerIntent` through the Capacitor plugin ([S51](#sources)); if unavailable, the key is hidden.
- **Empty state**: recent searches (max 6) and "Trending in your languages".
- Phone/PC: a physical keyboard; `/` or Ctrl+K focuses search (4.14).

### 4.11 The NBA experience

**NBA hub layout:** day strip (Yesterday · **Today** · Tomorrow · ‹date›; Left/Right on the strip changes day) → your team's game as a Sharp hero if they play that day → Live → Upcoming (times in local 21:30) → Final. Each game card: teams, records, state, where to watch.

**Game page** (OK on a game): primary **Watch on ‹channel›** (or Choose channel) · tabs Summary (linescore, leaders) · Your team · Opponent · Plays · Team stats. Box scores never slant (brand rule); 14 px minimum in tables.

**Finding the channel automatically** (fixes P9):
1. **Learned link**: the channel you last used for this team's games, then for this broadcaster (for example "ESPN"), is tried first.
2. **EPG match**: today's programmes on Sports and NBA groups whose titles match the teams (the matcher already exists; run it on EPG titles, not only channel names).
3. **Channel name match** (current behaviour).
4. If several match, the button reads **Watch on NBA 07** and hold OK lists the alternatives. If none match: *Choose channel* opens a sheet of candidates (EPG hits, "NBA" or "League Pass" channels, your Sports group). Whatever you pick is remembered.

**Spoiler shield** (Account → NBA → Spoilers: **Off · My team · All games**; default *My team*):

| Surface | Shield on |
|---|---|
| Home spotlight, On now, NBA hub, game page | Score hidden: "Live · Q3 7:29" with no numbers; leaders, play-by-play and team stats hidden; records frozen at pre-game; finals show "Ended" (no "OT", no winner emphasis, no dimmed loser) |
| Toasts and chips | No score: "Grizzlies are live" |
| Reveal | Hold OK on a card → *Reveal score* (for this game, this session) |
| Player | The score shows **only when you open the game panel**, and always at the **synced stream delay** |

**Score delay** (fixes the real-time leak in P8):
- The delay is **remembered per channel**; the first time, it is 60 s or the last value you synced. The risk is asymmetric: a late score is a mild annoyance, an early score is a spoiler.
- While a game is being watched, **every surface** (Home, NBA hub, toasts) shows that game at the synced delay, not only the player (precedent: YouTube TV syncs stats to playback position, [S24](#sources)).
- Sync is kept: Options → Sync score → pick the basket you just saw (3 presses); the result is stored for that channel.
- A delay badge on the panel reads "Synced · 42 s behind live".

**Second screen:** the phone app's NBA tab can show the same synced score (same account settings), like ESPN's StreamCenter ([S32](#sources)). Low priority.

**Later (not v1):** catch-up for a game joined late, as key plays from ESPN play-by-play shown as a text recap ("Rapid recap: 12–4 Memphis run, Morant 14 pts"), like Prime's Rapid Recap and Apple's Catch Up ([S30, S31](#sources)). It is spoiler-aware and offered only when you join after tip-off.

### 4.12 Player overlays (layout spec, dp = CSS px on 960 × 540)

| Overlay | Position and size | Content | Timing |
|---|---|---|---|
| **Banner** | top, 24 from the safe edge, 64 high, bg-1 92% (brand) | number · logo tile · channel name · **now title + progress · "Next 22:00 ‹title›"** · quality · CC · LIVE · ring name ("Favourites 3/24") | 4 s; instantly on zap |
| **Hint bar** | bottom, 34 high | `OK Channels · ◀ Options · ▶ Game · ▲▼ Channels · Hold OK Last` (live) | with the banner, the first 5 times only, then on Info |
| **Channel list (mini guide)** | left, 352 wide, full safe height, bg-1 94% | group header ("‹ Favourites"), 56 px rows: number · logo · name · now title · progress; current = selected fill; focused = ring; your team's game pinned on top when live | opens ≤ 150 ms; closes after a tune or Back |
| **Game panel** | right, 264 wide (brand says 250; 264 fits Player + MIN PTS REB AST at 14 px) | Sharp score plate · clock · linescore · box (your team first) · tab hint; "Synced · 42 s" | stays until closed; updates without moving scroll |
| **Live games panel** | right, 264 | live games, your team first, LIVE pills, OK switches | same |
| **Options sheet** | left, 320 | Subtitles · Audio · Picture size (this channel) · Sync score · Favourite · Score on picture · Report "won't play" | – |
| **Score bug** (optional, Options or Info peek) | top-right, inside the safe area, 140 × 32 | synced score plate | peek 5 s, or persistent if turned on |
| **Action chip** | bottom-right, above the hint bar | one sentence + "OK" + countdown | 8 s |
| **Reconnect / error** | centre-bottom card | "Reconnecting…" → after the last retry: "This channel stopped" with **Try again** (OK) and **Next channel** (Down), both inside the player (P22) | – |

Picture size (P19): **remember Fit/Zoom/Stretch per channel for live and per title for VOD**, defaulting to Fit. The option row shows a live preview as you move.

Rules: never cover the centre 50% of the picture with anything but subtitles; no two overlays at once; no overlay over the banner (brand: the stats panel is never over the OSD).

### 4.13 Account and update

Account page (one vertical list in groups, rows 56 px, values at the right): **Provider** (status, expiry and days left, connections in use, switch account, add account) · **Playback** (stream format, user agent, default picture size, subtitle language, audio language, frame-rate matching) · **NBA** (your team, spoilers, score on picture, score delay) · **Languages** · **Home rows** (pin/unpin) · **Updates** (version, check, auto-download) · **About**.

Update model (fixes P1):
- Check at launch, every 4 h and on resume (keep). **Download in the background as soon as found.**
- Show availability as a **dot on the Account avatar** and a row in Account. Never a focus-grabbing bar.
- **Offer it at a natural break**: on the next cold launch, before Home, as a full-screen card ("airglow 1.6 is ready. One line of what's new. **Update now** / Later"). Never while the player is open, never during your team's game window, never mid-navigation.
- Try **silent self-update** (Android 12+ lets an app update itself without a prompt via `UPDATE_PACKAGES_WITHOUT_USER_ACTION` when the conditions are met, [S48](#sources)); otherwise hand over to the system installer. *Verify on the Philips.*
- After the update, reopen to the same section; if the player was the last thing used, offer "Continue watching ‹channel›".

### 4.14 Phone and PC: how the IA adapts

| | TV | Phone (iPhone, touch) | PC (Electron, mouse + keyboard) |
|---|---|---|---|
| Nav | top bar | **bottom tab bar**: Home · Live · NBA · Library (Movies/Series segmented) · Search; Account from the avatar on Home | **left sidebar with labels** (≥ 1280 px wide; collapses to icons below), because there's no D-pad overshoot with a mouse and wide screens have width to spare |
| Home | spotlight + rows | same order; spotlight as a card; rows swipe | same rows; hover shows the info strip |
| Live | grid guide | channel list with now/next; the guide grid in landscape only | 3-pane: groups · channels · preview + game card (keep the current layout) |
| Player | native, overlays as above | Apple's player; below the video in portrait: tabs Channels · Game · Info | mpv; **same zap direction as the TV** (Up = next); the README shortcuts stay |
| Filters | sheet | bottom sheet | popover; all facets visible as checkboxes |
| Search | in-app keyboard + voice | system keyboard; results as you type | `/` or Ctrl+K from anywhere |
| Score | game panel on request | **score bug on by default**, spoiler shield applies | bug on by default (G toggles) |
| Context menu | hold OK | long-press | right-click |

---

## 5. Key flows, step by step

Press counts start from the state named; navigating to the app tile on the Google TV home is not counted. The targets are acceptance criteria (section 8).

### 5.1 First launch and sign-in

1. Native splash (static wedge) → 1.1 s launch over real loading.
2. **Welcome**: "Add your TV provider". Focus: **Use your phone** (primary); secondary: *Type it here* · *Load an M3U link*.
3. *Use your phone*: the TV shows a **QR code + short URL** (`http://192.168.1.23:8765`, with a 4-digit code). The TV app serves a one-page form on the LAN; the phone opens it, the owner pastes the `get.php?...` link or types server, username and password with a phone keyboard, and taps Send. The PC app gets a **Send to TV** button using the same endpoint. (Pattern: second-screen sign-in, [S49](#sources).) TV presses: **1**.
4. *Type it here* (fallback): a single **"Provider link or server"** field first (the paste link fills everything), then username and password; OK opens the keyboard on each.
5. **Verifying**: a progress card with steps (Connecting ✓ → Channels 4,812 ✓ → Movies… → Series…). Home opens as soon as channels are in; movies and series continue in the background (the current behaviour is correct).
6. **Two quick choices** (skippable, Back = skip): *Your team* (Memphis preselected; OK confirms) and *Spoilers* (Off / **My team** / All games); then *Your languages* (English preselected).
7. Home. **Target: ≤ 4 TV presses with the phone path**, ≤ 90 s to Home.

### 5.2 "It's game time, watch the Grizzlies"

| Start | Steps | Presses |
|---|---|---|
| App closed (cold launch) | launch → Home opens on the Spotlight with **Watch live on NBA 07** focused → **OK** → player starts on NBA 07, score synced from the remembered channel delay | **1** |
| Same, no channel known | Spotlight button reads *Choose channel* → OK → sheet with candidates, best match focused → OK (remembered for next time) | **2** |
| In another section of the app | Back (to the tab) → Back (Home, focus on Watch live) → OK | **3** |
| Watching another channel | Action chip "Grizzlies tip off · OK to switch" (8 s) → OK | **1** |
| Watching another channel, chip gone | **Right** (Live games panel, Grizzlies first) → OK | **2** |
| App open on Home | OK (focus is already on Watch live) | **1** |

Time budget: OK to first frame **≤ 3 s p90** (Krishnan & Sitaraman: abandonment starts at 2 s, [S43](#sources)); the banner and game plate show at once.

### 5.3 Resume a show

1. Launch → Home. No game window: focus is already on the first **Continue watching** card (the last thing watched). **OK** → plays from the saved position ("Resuming from 23:10", 2 s toast; Left within 5 s = from the start). **1 press.**
2. Game window active: Down (to Continue) → OK. **2 presses.**
3. Finished an episode last time: the card is already the **next episode** (S2 E4). OK plays it.
4. In the player at the end: "Next episode in 10 s · OK"; Back cancels.

### 5.4 Find a movie

*Known title, voice (from Home content):* Back (Home tab) → Left (Search) → OK → Up (mic) → OK → say "dune part two" → results → Right (Top result) → OK (detail, **Play** focused) → OK. **≈ 8 presses**, ≤ 20 s.

*Known title, typing:* Search → keyboard: D (3 moves + OK), U, N, E ≈ 15 presses → by "dun" the top result is *Dune: Part Two* → Right × 2 → OK → OK. **≈ 20 presses** (target ≤ 25).

*"Something good tonight":* Movies tab (from the Home tab: Right × 3, or Back then Right × 3) → Down into shelves (*Popular in English*, then *Top rated*) → browse Right; the info strip shows year · IMDb · runtime → OK (detail: version picker defaults to English 4K) → OK Play. **≈ 8 presses plus browsing.** The grid ("Browse all", filters Genre: Thriller, IMDb ≥ 7) is 4–6 extra presses: Filters ▾ → Genre → Thriller → IMDb ≥ 7 → Back.

### 5.5 Flip channels

1. In the player: **Up/Down** = ±1 (banner instant, tune 450 ms after the last press when held). **1 press per channel.**
2. **Number**: digits, tunes after 1.3 s, or OK at once. 2–4 presses.
3. **Last channel**: hold OK. 1 press.
4. **Browse**: OK (channel list on the current channel, now titles visible) → Up/Down → OK. 3+ presses.
5. **Another group**: OK → Left (groups) → Down to *Sports* → OK → Down to a channel → OK. ≈ 6 presses.
6. The zap ring is **the list you tuned from** (Favourites if from Home's On now favourites, the group if from the guide) and the banner names it (P7).
7. Zap to picture: **p50 ≤ 1.5 s, p90 ≤ 2.5 s**; never a black screen: the channel card (logo + name + now title) shows until the first frame.

### 5.6 Check the score without leaving the stream

1. Watching the game: **Right** → game panel slides in from the right (264 dp): score plate, clock, linescore and your team's box, all at the synced delay. **1 press.**
2. Right/Left switch tabs (Your team · Opponent · Plays). Up/Down scroll.
3. **Back** (or OK) closes. **1 press.**
4. Glance only: **Info** → 5 s score peek (if the remote has Info), or turn on *Score on picture* in Options for a persistent bug.
5. If the score looks ahead of the picture: Left → *Sync score* → OK on the basket you just saw → stored for this channel. **3 presses.**

### 5.7 Change subtitles

- **Movie or episode**: **Down** (Options; *Subtitles* is the first row when tracks exist and shows the current value, "English") → OK → pick "Off" or a language → OK. **3 presses.** With a Captions key: CC → pick → OK = 2.
- **Live**: **Left** (Options) → Subtitles → pick → OK. **3 presses.**
- The choice is remembered by language (keep). If the file has no subtitles, the row reads "No subtitles in this file" and is disabled, not hidden, so the owner knows it isn't a bug.

### 5.8 Update the app

1. A new version is found and **downloaded silently** in the background. A dot appears on the Account avatar.
2. Next cold launch (or Account → Updates): a card before Home: "airglow 1.6 is ready. New: the channel list shows what's on." **Update now** (focused) · Later.
3. OK → silent install if permitted, else the system installer → Install (OK) → the app reopens on the same section. **1–2 presses** (3 if Android asks for "Open").
4. *Later* snoozes for 24 h. **Never shown during the player, never during your team's game window, never by moving focus.**

---

## 6. Design principles (for reviewing any screen)

1. **Live first, one press to the game.** On game days the default focus is the stream.
2. **The picture is sacred.** Overlays live at the edges, appear on request, and leave the centre half free. The score is synced or hidden, never ahead.
3. **Spatial honesty.** Left opens left things, Right opens right things, OK acts on what is focused; a key never changes meaning because of hidden state.
4. **Never lose focus, never steal it.** One ring, always visible, restored on return, untouched by data refreshes and prompts.
5. **Fewer, bigger, cleaner.** Six destinations; at most 7 Home rows; three header controls in a grid; one primary per screen; titles, not provider strings.
6. **Cache first, network never blocks a press.** Render what we have now; refresh behind.
7. **Spoilers are a mode, not a feature.** One switch covers every surface.
8. **Same model on every device.** Same IA, same zap direction, same names; only input and density change.

---

## 7. Alignment notes for the in-progress mocks

`tv-home.png` and `tv-live.png` are consistent with this brief (top bar, a game spotlight with *Watch live* focused, a time grid with now anchored, LIVE anatomy). To match it:
- **Spotlight**: with the shield on, the score, leaders and records must have a hidden state; design both states. The "Also on ESPN" line is good: make it the alternatives list behind hold OK.
- **Bar**: Saved → fold (4.2) or justify it as a seventh item; Search should come first (one Left from Home); the bar hides below row 1.
- **Continue row**: 16:9 needs backdrops; specify a fallback for portrait-only art (the poster centred on a surface-2 tile with the title).
- **Guide grid**: specify Left at the "now" column (it goes to the channel column, never to a bar), Right (forward in time), CH± (±2 h); virtualise both axes; a now/next fallback row when EPG is missing; your team's game row pinned at the top when live.
- **Live hero in the guide**: good for the focused programme. Don't put video in it (connection limits).

---

## 8. Acceptance criteria (measurable)

### 8.1 Press counts (D-pad only, from the stated start)

| ID | Task | Max presses |
|---|---|---|
| AC-P1 | Cold launch on a game day → your team's stream | **1** (2 if the channel is unknown) |
| AC-P2 | Any section root → your team's stream | 3 |
| AC-P3 | Watching another channel → your team's stream | 2 |
| AC-P4 | Launch → resume the last show (no game window) | **1** |
| AC-P5 | Zap ±1 / last channel | 1 / 1 (hold) |
| AC-P6 | Open and close the score panel in the player | 1 + 1 |
| AC-P7 | Change subtitles in the player | 3 |
| AC-P8 | Find a known movie by voice / by typing | 10 / 25 |
| AC-P9 | Any screen → its top bar | 1 (Back) |
| AC-P10 | Home content → exit the app | 2 |
| AC-P11 | Install an available update | 2 (+1 if Android asks) |
| AC-P12 | TV-side sign-in via phone | 4 |

### 8.2 Latency budgets (on the Philips, measured from key-down; release build)

| ID | Event | Budget | How to measure |
|---|---|---|---|
| AC-L1 | Focus ring moves after a D-pad press | **≤ 1 frame target; p95 ≤ 100 ms**, including during key repeat at 10/s | `performance.now()` in keydown vs `requestAnimationFrame` after `focus`; a 240 fps phone video for the native player |
| AC-L2 | Tab switch → content painted (from cache) | ≤ 300 ms | performance marks |
| AC-L3 | Cold launch → interactive Home (cached catalogue) | ≤ 2.0 s (launch animation included, runs over loading) | logcat `Displayed` + first input accepted |
| AC-L4 | Live zap → first frame | p50 ≤ 1.5 s, p90 ≤ 2.5 s; banner ≤ 100 ms | ExoPlayer `onRenderedFirstFrame` − key time |
| AC-L5 | VOD start / resume → first frame | p90 ≤ 3 s ([S43](#sources)) | same |
| AC-L6 | Channel list / panels open | ≤ 150 ms | native trace |
| AC-L7 | Search results update per keystroke (50k titles + 5k channels) | ≤ 150 ms | performance marks |
| AC-L8 | Filter change → grid updated | ≤ 300 ms | performance marks |
| AC-L9 | Detail page shown (with cached fields) | ≤ 200 ms; full info ≤ 1.5 s | performance marks |
| AC-L10 | No main-thread task longer than | 100 ms while UI is visible (except during the first 3 s after launch) | Long Tasks / DevTools |
| AC-L11 | Score freshness | Poll 10 s in game; displayed at the synced delay ± 2 s | log |

Structural budgets: ≤ 1,500 DOM nodes per screen; grids and the guide virtualised (≤ 6 poster rows and ≤ 12 guide rows in the DOM); ≤ 6 concurrent image decodes; images ≤ 2× their CSS size; skeletons static, only on cold section loads; **no `behavior:'smooth'` while a key is repeating**; animations only on transform and opacity (the bar hides by `translateY`, sheets slide by `translateX`).

### 8.3 Text minimums (CSS px at 960 × 540)

Legibility check for this setup (formula: cap height ≈ 0.73 × font size for Inter; arcmin = 3438 × cap height in mm / distance in mm):

| TV (16:9) | mm per CSS px | 13 px caps at 2.7 m / 3.0 m | 14 px | 16 px |
|---|---|---|---|---|
| 55" | 1.27 | 15.3′ / 13.8′ | 16.5′ / 14.8′ | 18.8′ / 16.9′ |
| 65" | 1.50 | 18.1′ / 16.3′ | 19.5′ / 17.6′ | 22.3′ / 20.1′ |

Against 16–20′ ([S19](#sources)), 13 px is marginal on a 55" at 3 m. Therefore:

| ID | Use | Minimum |
|---|---|---|
| AC-T1 | Body, descriptions, button labels, card titles | **16** |
| AC-T2 | Anything informational: meta, now title, times, channel names in the guide, box-score cells, settings values | **14** (Fire TV's 28 px at 1080p, [S13](#sources)) |
| AC-T3 | Non-essential captions only (counts, "Favourites first", key-cap hints), never the only place a fact appears | 13 (brand floor) |
| AC-T4 | Scores in plates | ≥ 22 (brand Sharp 56 in heroes) |
| AC-T5 | Native player: banner title 16, meta 14, panel cells 14, footers ≥ 13; subtitles 5.3% of screen height (brand) | as stated |
| AC-T6 | Line length of body text | ≤ 60 characters; descriptions clamp at 3 lines |

*Brand check needed:* AC-T2 raises meta from 13 to 14 px. Measure the owner's screen size and seat distance once; if it's a 65" at ≤ 3 m, 13 px meta is acceptable.

### 8.4 Focus and visibility

| ID | Criterion |
|---|---|
| AC-F1 | Exactly one focus ring on screen; never none while UI is visible (automated check on every key event in CI). |
| AC-F2 | Ring = 3 px white + 2 px canvas gap (brand); ≥ 3:1 against both the element and its surroundings ([S18](#sources)); visible on bright artwork (ring outside the art, not inside). |
| AC-F3 | A focused card at scale 1.05 plus its ring fits inside its scroll container and never overlaps a fixed panel, the bar or the safe area. **Gutter ≥ (scale − 1)/2 × card size + 5 px** on every side (120 px card → ≥ 8 px; 192 px → ≥ 10 px). Scroll containers carry that padding (fixes P20). |
| AC-F4 | Focus restored on return for every row, grid, tab and page (F2); a screenshot test per screen. |
| AC-F5 | Auto-repeat never crosses into the bar, a panel or another row (F3); a scripted repeat test. |
| AC-F6 | No prompt, toast or refresh changes `activeElement` (F7, F8). |
| AC-F7 | Contrast: text ≥ 4.5:1 on its surface (brand tokens pass); body ≥ 7:1 recommended for Vivid picture modes; text on artwork always over a scrim that guarantees 4.5:1 on a white poster. |
| AC-F8 | All interactive elements inside 48/27; art may bleed. |

### 8.5 Behaviour

| ID | Criterion |
|---|---|
| AC-B1 | Spoiler shield on: zero numeric scores, leaders, post-game records or "OT/Final" labels for the shielded team on any non-player surface (automated text scan of the DOM). |
| AC-B2 | While a game is watched, every surface shows it at the synced delay. |
| AC-B3 | The zap ring is named in the banner and equals the list the channel was tuned from. |
| AC-B4 | Up = next channel on TV, PC and phone by default, with one setting to invert it. |
| AC-B5 | No second stream is ever opened by focus (connection limits). |
| AC-B6 | Back never shows a confirmation; Back from Home exits. |
| AC-B7 | Displayed titles never contain provider prefixes or quality tags; duplicates are merged. |
| AC-B8 | Every list and grid with more than 200 items is virtualised. |

### 8.6 Layout reference (960 × 540)

| Element | Value |
|---|---|
| Safe area | x 48–912, y 27–513 |
| Top bar | y 27–83 (56 high); tabs as pill-indicator tabs ([S5](#sources)); hides by `translateY(-100%)` when focus leaves row 1 |
| Content width | 864 (48 to 912) |
| 2:3 poster | 6 per row: 124 × 186, gap 24 (6 × 124 + 5 × 24 = 864) |
| 16:9 card | 4 per row: 198 × 111, gap 24 (4 × 198 + 3 × 24 = 864); the 5th peeks if the row starts at the gutter |
| Spotlight | 864 × 176 |
| Row header + info strip | 28 + 20 |
| Guide | channel column 208; time axis 656 = 2.5 h (≈ 4.4 px/min); rows 56; with the bar hidden: 96 px focused-programme header + 28 px time ruler + **6 rows** (5 while the bar shows) |
| Player panels | left 352 (channel list) or 320 (options); right 264 (game); banner 64 |

Entry focus per screen: Home = Spotlight *Watch live* / first Continue / first On now · Live = the current or last channel's *now* cell · NBA = your team's game, else the first live game, else the first upcoming · Movies/Series = the first card of the first shelf · Search = **A** on the keyboard · Detail = Play/Resume · Account = the first row · Player channel list = the current channel.

---

## 9. To verify on the real TV (open items)

1. The Philips remote model: which keys exist (CH±, numbers, Info, Captions, colour keys, Play/Pause). All accelerators above are optional; the D-pad paths stand alone ([S50](#sources)).
2. The screen size and seat distance (8.3), to settle 13 vs 14 px meta.
3. Overscan setting off; check the 48/27 margins at the panel edges.
4. Silent self-update on this Android TV version ([S48](#sources)).
5. `SpeechRecognizer` availability inside the app on Google TV ([S51](#sources)).
6. Provider EPG cost: per-channel `get_short_epg` vs `xmltv.php` size, to decide how far the guide grid can look ahead.
7. Typical stream delay of the provider's NBA channels (to tune the 60 s default).

---

## Sources

"Read" = the page or its official text was opened. "Summary" = only search-result text was available (the page failed to load here); treat the figures as reported.

| ID | Source | What it says (and how it was read) |
|---|---|---|
| S1 | Android TV layouts: https://developer.android.com/design/ui/tv/guides/styles/layouts | 960 × 540 dp canvas; 5% margins = 48/27 dp; let backgrounds bleed; most modern TVs no longer overscan. (summary) |
| S2 | Android TV navigation: https://developer.android.com/design/ui/tv/guides/foundations/navigation-on-tv | Back to previous, end at the launcher, no exit gating, no splash in the stack; top nav: Back scrolls up and focuses the menu; left nav: Back focuses the active item; hold OK for more options; fewest screens. (read) |
| S3 | Android TV navigation drawer: https://developer.android.com/design/ui/tv/guides/components/navigation-drawer | 5–6 primary destinations; collapsed rail with icons; standard updates on focus, modal on select. (read) |
| S4 | Android TV focus system: https://developer.android.com/design/ui/tv/guides/styles/focus-system | One focus; scale 1.025/1.05/1.1; outline, glow, colour, pressed state. (read) |
| S5 | Android TV tabs: https://developer.android.com/design/ui/tv/guides/components/tabs | Pill tabs for page-level destinations, bar tabs inside content. (read) |
| S6 | Android TV typography: https://developer.android.com/design/ui/tv/guides/styles/typography | Larger type; no decorative body fonts; no numeric minimum. (read) |
| S7 | TV app quality: https://developer.android.com/docs/quality-guidelines/tv-app-quality | Back ends at Home; don't depend on the Menu button. (summary) |
| S8 | Match content frame rate: https://developer.android.com/training/tv/playback/framerate | Judder from rate mismatch; `Surface.setFrameRate`; seamless vs non-seamless switching. (summary) |
| S9 | Watch Next: https://developer.android.com/training/tv/discovery/watch-next-add-programs | Google TV "Continue watching" needs Google certification, so it isn't available to this sideloaded app. (summary) |
| S10 | Apple HIG, focus and selection: https://developer.apple.com/design/human-interface-guidelines/focus-and-selection | Focus and select are separate; use system focus effects. (summary) |
| S11 | Apple UIKit tab bar on tvOS: https://developer.apple.com/documentation/uikit/uitabbarcontroller | Tab bar at the top on tvOS; Down/Select into content; no More tab. (summary) |
| S12 | Apple TV app sidebar, tvOS 17.2: https://appleinsider.com/articles/23/11/01/hands-on-with-the-apple-tv-app-redesign-in-tvos-172 and https://www.idropnews.com/news/the-tv-app-gets-a-new-sidebar-design-in-tvos-172/201718 | Top tabs moved to a left sidebar opened with Left. (summary) |
| S13 | Fire TV design guidelines: https://developer.amazon.com/docs/fire-tv/design-and-user-experience-guidelines.html | 10-ft UI; overscan varies; body ≥ 14 sp (≈ 28 px at 1080p). (summary; page unreachable) |
| S14 | Samsung TV design principles: https://developer.samsung.com/tv/design/design-principles | 3 m distance; four-way nav, focus, return, exit as required controls. (summary) |
| S15 | Roku safe zones (forum quoting DesignGuidelines.pdf): https://community.roku.com/t5/Roku-Developer-Program/How-important-is-the-HD-quot-Safe-Zone-quot/td-p/365470 | Title-safe 1022 × 578 at 128,70 (720p). Dated. (summary) |
| S16 | Smashing Magazine, Designing for TV pt 2 (2025): https://smashingmagazine.com/2025/09/designing-tv-principles-patterns-practical-guidance/ | Overscan as an outdated idea; building blocks of the 10-ft experience. (summary, intro only) |
| S17 | Access Rewind, large-screen text: https://accessrewind.substack.com/p/solving-small-text-and-contrast-issues | 28 px at 1080p is a minimum, not a target; body 28–36 px. (summary) |
| S18 | WCAG 2.4.13 Focus Appearance: https://kb.daisy.org/publishing/docs/wcag/focus-appearance.html | ≥ 3:1, ≥ 2 CSS px thick or enclosing. AAA. (summary) |
| S19 | DIN 66234 paper: https://people.freebsd.org/~debdrup/German%20Workplace%20Standards.pdf ; TU Delft legibility tool: https://pietvanderzanden.weblog.tudelft.nl/?p=156 | 18′ minimum character height; 17′ readability angle (14′ for LED). (summary) |
| S20 | Netflix TV redesign: https://www.mindtheproduct.com/netflix-introduces-major-tv-product-redesign/ ; https://www.tomsguide.com/entertainment/netflix/netflix-is-making-a-massive-change-to-its-homepage-for-the-first-time-in-years | Left menu replaced by an always-visible top bar (2025); My Netflix hub. (summary) |
| S21 | Prime Video 2024: https://www.tomsguide.com/entertainment/streaming/prime-video-is-getting-a-massive-redesign-heres-whats-new ; 2022 side menu: https://androidcentral.com/streaming-tv/amazon-prime-video-2022-redesign | Top bar with Live TV in 2024; side menu in 2022. (summary) |
| S22 | Disney+ 2025: https://9to5google.com/2025/10/02/disney-shows-off-app-redesign-coming-to-google-tv-with-global-hulu-integration-gallery/ | Top bar plus a retained left menu; Live tab. (summary) |
| S23 | Plex reversal: https://www.neowin.net/news/plex-reverts-tv-app-layout-after-intense-user-backlash/ ; https://androidauthority.com/plex-brings-back-left-side-menu-3700033 ; https://forums.plex.tv/t/tv-app-ux-issues-for-main-navigation/920359 | Top menu added clicks ("two to six") and needed scrolling to the top; left panel restored Aug 2026. (summary) |
| S24 | YouTube TV stats and key plays: https://support.google.com/youtubetv/answer/9119412 | Stats synced to the time you are watching; no spoilers behind live. (summary) |
| S25 | YouTube TV hide scores: https://support.google.com/youtubetv/answer/7641863 | Per team or league, all devices; hides final scores and live previews. (summary) |
| S26 | YouTube TV last channel: https://9to5google.com/2024/02/15/youtube-tv-last-channel-shortcut/ | Long-press OK = last channel (2024). (summary) |
| S27 | YouTube TV live guide: https://blog.youtube/news-and-events/youtube-tv-live-guide-and-library/ ; mini guide: https://michaelsaves.com/streaming/youtube-tv-live-guide-tutorial/ | Compact guide; mini guide while watching, last channel first. (summary; the mini guide from a third party) |
| S28 | NBA app Hide Scores: https://support.watch.nba.com/hc/en-us/articles/115000587174 | Toggle; on TV next to the calendar; headlines can still spoil. (summary) |
| S29 | Apple TV app settings: https://support.apple.com/guide/tv/adjust-tv-app-settings-atvbae11a68b/tvos ; complaints: https://piunikaweb.com/2023/02/27/mls-fans-fume-at-apple-tv-for-displaying-scores-during-replay/ | "Show Sport Scores"; scores leaked in replays and thumbnails. (summary) |
| S30 | Apple MLS Catch Up / Key Plays: https://9to5mac.com/2024/06/20/apple-tv-app-adds-new-catch-up-feature-for-live-streaming-sports-in-mls-season-pass/ | Key plays in order to catch up. (summary) |
| S31 | Prime Video NBA (2025): https://www.aboutamazon.com/news/entertainment/how-to-watch-nba-prime | Key Moments; Rapid Recap ≤ 2 min; stats without leaving the game. (summary) |
| S32 | ESPN app (2025): https://espnpressroom.com/us/press-releases/2025/08/espn-launches-new-direct-to-consumer-service-enhanced-espn-app/ ; https://www.espnfrontrow.com/2025/08/dtc-launch-week-a-sports-fans-guide-to-the-enhanced-espn-app/ | Panels beside the live view; StreamCenter phone sync; multiview; Catch Up to Live. (summary) |
| S33 | DAZN Stats and Scores: https://www.dazn.com/en-IT/help/articles/16294028304669 | Live scores on/off in Settings. (summary) |
| S34 | TiviMate behaviour (community post): https://community.getchannels.com/t/quick-guide-recent-previous-channels/34389 | OK while watching → recent channels; Right → previous channel. Third-party account. (summary) |
| S35 | Channels DVR request: https://community.getchannels.com/t/feature-request-guide-over-lay/20504 | Users want a guide overlay without leaving the stream. (summary) |
| S36 | Kodi up/down swap: https://forum.kodi.tv/showthread.php?tid=336256 | Users remap Up/Down for channel changes; the direction is contested. (summary) |
| S37 | Kodi Arctic Zephyr 2 / Horizon: https://www.videoconverterfactory.com/kodi/arctic-zephyr-2.html | Vertical menu of hubs + horizontal widgets, user-configurable. (summary) |
| S38 | Gomez-Uribe & Hunt (2015), The Netflix Recommender System: https://gwern.net/doc/reinforcement-learning/exploration/2015-gomezuribe.pdf | 60–90 s, 10–20 titles, about 3 in detail, one or two screens. (summary) |
| S39 | SAS blog on TV keyboards (Netflix): https://blogs.sas.com/content/iml/2018/09/12/interfaces-remote-control-text.html | Alphabetical 7 × 6 grid; results after each letter. (summary) |
| S40 | O'Brien (2006), virtual keyboard layouts: https://repository.gatech.edu/entities/publication/4e02ab55-18a4-4c5c-8e72-72946c61ea71 | Alphabetical layouts faster on a rotary controller, especially for older users. (summary) |
| S41 | EPG usability thesis (LMU, 2010): https://www.mmi.ifi.lmu.de/lehre/ss10/os/material/DA_Abschlussvortrag_Sabine_Strubel.pdf | Grid fastest for orientation; lists need endless scrolling; switching views confuses. (summary) |
| S42 | Kooij et al., channel zapping quality: https://research.tudelft.nl/en/publications/model-validation-of-channel-zapping-quality | < 0.43 s "good" leaning forward; 0.67 s on a sofa; variable delay lowers MOS. (summary) |
| S43 | Krishnan & Sitaraman (2012): https://www.sciencedaily.com/releases/2012/11/121113134805.htm | Abandonment starts after 2 s; about +5.8% per extra second. (summary) |
| S44 | NN/g response-time limits: https://www.nngroup.com/videos/3-response-time-limits-interaction-design/ | 0.1 / 1 / 10 s. (summary) |
| S45 | NN/g Skeleton Screens 101: https://www.nngroup.com/articles/skeleton-screens/ ; evidence review: https://uxdesign.cc/what-you-should-know-about-skeleton-screens-a820c45a571a | For full-page loads; perceived-speed evidence mixed. (summary) |
| S46 | web.dev animations: https://web.dev/articles/animations-guide ; https://web.dev/articles/animations-and-performance | Transform and opacity run on the compositor. (summary) |
| S47 | Leavitt & Christenfeld (2011): https://www.sciencedaily.com/releases/2011/08/110810093735.htm | Spoilers increased enjoyment of short stories; nothing on sport. (summary) |
| S48 | AOSP, updates without user action: https://android.googlesource.com/platform/frameworks/base/+/c17bbf82ce4b%5E%21/ | `UPDATE_PACKAGES_WITHOUT_USER_ACTION`; `STATUS_PENDING_USER_ACTION` when confirmation is needed. (summary) |
| S49 | Google limited-input sign-in: https://developers.google.com/identity/gsi/web/guides/devices ; Comcast: https://docs.developer.comcast.com/docs/sign-in-and-sign-up | Code or QR on the TV, entry on another device; "2nd screen sign-in (preferred)". (summary) |
| S50 | Philips remote guide: https://www.philips.com/c-dam/b2c/support-home-generic/remote-control-instructions-2019.pdf | +/− channel keys, number keys, long-press TV Guide; layouts vary by model. (summary) |
| S51 | Android voice search permissions: https://android-developers.googleblog.com/2015/09/new-permissions-requirements-for.html | `SpeechRecognizer` needs `RECORD_AUDIO`; Leanback's callback avoids the prompt. (summary) |

Code read for the audit: `app/app.js`, `app/nav.js`, `app/index.html`, `app/styles.css` (TV rules), `app/titles.js`, `app/nba.js` (matcher), `android/app/src/main/java/app/tuner/player/PlayerActivity.java`, `README.md`.
