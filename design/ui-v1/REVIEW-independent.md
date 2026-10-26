# airglow TV UI v1: independent review

Reviewer: an outside senior TV/streaming product designer. This is not the design team's own check.
Scope: everything in `design/ui-v1/` for TV: 43 TV mocks, 21 native player mocks, the launch animation, and `UI-SPEC.md`. The brand (v5.4) is not under review. Only how the UI applies it is.
Method: I read the spec last and checked it against the renders. I opened every mock in Chromium (Playwright) at 960 × 540 and measured text sizes, WCAG contrast against the real composited background, safe-area violations, text collisions, clipped text and focus-ring clipping. I played the launch at real speed, sampled it with rAF, froze stills, and held the loading state for 13 s. Scripts and output are in the scratchpad (`review-ui/measure.js`, `spot.js`, `launch.js`, `measure.txt`). Anything that depends on the physical Philips panel is marked **(suspected)**.

---

## Overall score: **6.5 / 10**

This is a disciplined, well-reasoned system with some features that are better than best-in-class: score delay sync, a single spoiler mode, LAN phone sign-in, and messy-catalog hygiene. The craft does not hold up at a top-studio bar. It has real layout collisions, clipped focus rings, two cases where OK means different things on the same screen, and spoiler leaks in exactly the place the owner cares most about. It also does not deliver the "scream TV and movies awesomeness" the owner asked for. Most of the time it is a tidy, grey, text-first UI with a decorative pink parallelogram. A studio would call it "solid v1 architecture, not yet a premium product".

| Area | Score | One line |
|---|---|---|
| Visual craft | **5.5** | Consistent tokens and spacing, but there are shipped collisions and clipping, almost no imagery, and the loudest element (the pink slab) carries no content |
| Typography and legibility at 10 ft | **7.5** | Sizes sit at tvOS body level and contrast mostly passes. LIVE on focused surfaces fails, the hint bar sits in the overscan band, and secondary and tertiary text look identical |
| Focus and navigation model | **7.0** | Excellent written rules (one ring, Back model, key repeat). OK changes meaning in two places, focused rows change size, and nothing is prototyped |
| Live TV and guide | **6.5** | Correct basics (pinned game, favourites ring, zap card, now line). No live preview, 5.5 rows, heavy truncation, no way to pick another feed |
| NBA and live sports | **7.0** | The best thinking in the set (sync delay, shield, action chip). The shield leaks in the player, sync shows plays you haven't seen yet, and there is no team identity |
| Library browsing and search | **6.5** | Filters with live counts, Jump and merged versions are strong. The first screen is thinner than claimed, and search is press-heavy |
| Detail pages | **6.0** | The version pill is smart. A layout overlap on both movie states, no backdrop hero, no episode synopsis |
| Player overlays | **6.5** | Well specified for native views and the key map is sound. Rings are clipped, panels are oversized, the shield leaks, OK conflicts, and there is no feed failover |
| Onboarding, settings, states | **7.5** | Phone sign-in is the best I've seen in an IPTV app. Minor icon errors, and the loading states promised for the launch aren't built |
| Launch and motion | **7.0** | Well engineered, transform-only, splash-matched. Tasteful but generic, and the loading-hold escalation is missing |
| Performance and buildability | **7.5** | A real budget and rules. Image decoding, the focus engine, the flex-ellipsis bug and font subsets are unaddressed |
| Fit to owner's goals | **6.0** | It works for the Grizzlies fan. It does not "scream", and the layout is conventional despite the brief asking for creativity |

---

## Top strengths

1. **The game is one press from a cold launch, and the logic around it is right.** The hero priority window (3 h before tip-off to 30 min after the final), entry focus on Watch live (`tv-home.png`), the team row pinned first in the guide and the mini guide, and the "Grizzlies are live / OK to switch" action chip with "never in the first 10 s after a tune". This beats Apple's own guidance ("Let people tap once — or not at all — to start playback").
2. **The score delay sync** ("Synced · 42 s behind live", per channel, applied on every surface) is a genuinely new idea. None of ESPN, Prime, Apple TV or League Pass reconciles a third-party stream's delay with the data feed. For an IPTV sports fan this is the killer feature.
3. **The spoiler shield is one mode, not a scatter of toggles:** Off / My team / All games. It covers the hero, cards, records, "OT", counts and guide descriptions (`tv-home-shield.png`, `tv-nba-shield.png`, `tv-live-shield.png`). This directly addresses the documented failure where Apple's "Show Sport Scores" still leaked through thumbnails and replays.
4. **Phone sign-in over the LAN** (QR, IP address, code, "Nothing leaves your home network") avoids typing an Xtream URL with a remote. It is clearly better than TiviMate's and IPTV Smarters' on-TV forms.
5. **Messy-catalog hygiene:** one card per title with "+N versions", a version sheet with sizes and a "best this TV decodes" default, title-cleaning rules, filter chips with live counts where zero-count chips are disabled but not hidden, English first, and a no-art initials tile. This is the right answer for a library of tens of thousands of provider titles.
6. **System discipline:** one focus ring per screen, no smooth scroll under key repeat, transform and opacity only, no blur or filter, a node budget, and native overlays specified down to plain Android views. Most mock sets I review never get this far.

---

## Problems, ranked by severity

Severity: **S1** blocks the owner's core use or breaks trust · **S2** a top studio would not ship it · **S3** clear quality debt · **S4** polish.

### S1-1. The spoiler shield leaks in the player, and score sync reveals the future

- **Screens:** `player/game-shield.html` / `png/player-game-shield.png`; `player/sync.html` / `png/player-sync.png`.
- **Evidence:**
  - With the shield on, the plate says "Score hidden", but the Grizzlies table still shows the PTS column: 14 + 24 + 12 + 10 + 8 + 9 + 0 = **77**, the exact hidden score. Switching to the Warriors tab gives the other side. The TV game page hides the whole box score under the shield (`tv-nba-game-shield.png`), so the player panel contradicts the app's own rule.
  - The "Which basket did you just see?" picker lists the five newest plays **from the live data feed**, with team, score and play text ("MEM 77–70 Marshall 3-pt jump shot, Q3 7:29"). The stream is by definition 42–60 s behind that feed, so the top rows are baskets the viewer has **not seen yet**. The picker also appears with no shield treatment at all.
- **Why it matters:** the owner is a Grizzlies fan watching on a delayed IPTV feed. One glance at the panel or one sync attempt spoils the game. Trust in the shield is binary: one leak and he turns it off for good.
- **Fix:**
  - Under the shield, the player game panel shows MIN/REB/AST only, or the "Box score is hidden" card used on the TV game page. Never show a column that sums to the score.
  - Rebuild sync so it can't spoil. Offer **game-clock values only** ("Q3 9:05 · 8:44 · 8:31 · 8:14 · 7:52"), oldest first, with no team, score or play text: "Which clock did you just see on the broadcast?" Even simpler: "Press OK when the broadcast clock shows Q3 8:00", with a countdown computed from the feed.
  - Only list events at least 90 s old by the feed clock, so nothing ahead of a plausible delay ever appears.

### S1-2. There is no failover to another feed for the game inside the player

- **Screens:** `png/player-failed.png`, `png/player-reconnect.png`, `png/player-options.png`; Home hero caption "Hold OK for 2 more channels".
- **Evidence:** when the stream dies, the card offers **Try again** and **Next channel**. Next channel means the next channel in the zap ring, not another feed of the same game. The only route to the other two matched channels is a hidden hold-OK gesture on the Home hero. Options has "Report: won't play" but no "Other feeds". The spec never mentions it (`grep` for feed, alternate or backup in the kit and spec finds nothing).
- **Why it matters:** IPTV game streams fail routinely mid-game. Today the recovery is: Back out of the player, land on Home, discover that hold OK exists, pick a feed. That is 4+ presses under stress, and you walk through the Home hero, which may show the score. TiviMate users solve this with favourites of duplicate channels. A premium app should solve it for them.
- **Fix:**
  - When a matched game channel fails, the failed card's primary button becomes **"Watch on NBA TV (feed 2 of 3)"**, and after attempt 3 the app switches automatically, with a zap card saying so.
  - Add "Other feeds for this game (2)" to Options and to the top of the game panel.
  - Show the feed count in the banner ("Feed 1 of 3").

### S2-1. Layout collisions and clipping that a top studio would not ship

These come from measured element boxes, the Playwright text-overlap pass and the renders:

| Screen | Defect | Evidence |
|---|---|---|
| `tv-detail-movie.png`, `tv-detail-movie-resume.png` | The "More like this" heading (CSS y 388–416) sits **under** the version and subtitle pill row | visible at 1920 × 1080, y ≈ 760–825; worse in the resume state |
| `tv-home.png` | "Synced · 42 s behind live" (x 619–787) runs into the skewed slab and its orchid line (slab starts at x 773) | the word "live" is crossed by the line |
| `tv-nba-game-shield.png` | The **Reveal score** button sits under the pink slab, and the orchid line runs through the word "score" | header, x ≈ 717–843 |
| `tv-movies-filters.png` | The focused "Thriller" chip ring is clipped on the left by `.sheet-scroll` (−5 px) | measured; visible |
| All player list panels (channels, groups, options, subs, audio, picture, sync, vod-options, vod-nosubs) | The focus ring is clipped by `.nv-panel{overflow:hidden}` (−1 to −3 px on both sides) | measured in all 9 panels |
| `player-livegames.png`, `player-channels.png` | "NBA Leag" is hard-cut with no ellipsis, and "NBA League Pass 4 •" has a dangling bullet | `.nv-row .b` is `display:flex`, and `text-overflow` does not apply to flex containers |
| `tv-search-empty.png` | The placeholder "Channels, films, series, teams" wraps onto 2 lines and spills out of a single-line field | visible |
| `tv-state-noart.png` | The "4K" badge sits on top of the "SA" initials | measured overlap 18 × 15 |
| `tv-nba.png` | Score digits "48" and "51" overlap vertically | 26 × 3 px |

- **Why it matters:** each defect is small, but together they read as "not reviewed on a TV". The detail overlap is on the second most visited screen in the app.
- **Fix:**
  - Give the slab a fixed exclusion zone: content max-x = slab left − 24 px, applied at the slab's top edge, since it is skewed.
  - Lay out the detail page as a column with gap, not absolute tops.
  - In panels, use `overflow:visible` with 8 px horizontal padding, or the inset ring (`.f-in`) already in the brand.
  - Put ellipsis on an inner block span, not on the flex row.
  - Shorten the placeholder to "Search".
  - Move the 4K badge on initials tiles to the bottom-right.
  - Add the overlap, clipping and ring-clip checks above to `tools/audit.js`. They found all of these in about 40 s.

### S2-2. It doesn't "scream TV, shows and movies". There is almost no imagery and no team identity

- **Screens:** `tv-home.png`, `tv-nba.png`, `tv-live.png`, `player-game.png`, `tv-first-choices.png`.
- **Evidence:**
  - The live hero, the screen the owner sees most, is a grey plate with grey "MEM" and "GS" discs, a number, and a large pink parallelogram that is decoration only. That slab is the most saturated, brightest object on screen, brighter than the focused button, so the eye lands on it before it lands on focus.
  - The On now row is four text cards with two-letter placeholder tiles.
  - Continue watching shows art with no titles above the fold (titles at CSS y 537).
  - There are no Grizzlies colours (navy and beale-street blue) anywhere, even in "YOUR TEAM" contexts.
  - Compare Apple TV app or Max: full-bleed key art, motion, team marks. Compare YouTube TV: live thumbnails in rows. ESPN and League Pass put team colour and logos on every card.
- **Why it matters:** the owner explicitly asked for excitement and a creative layout. This design solves IA and states very well, but emotionally it is a settings app with scores. The neutral discs came from a brand-check decision about trademark caution. For a private, personal app that trade-off is wrong.
- **Fix:**
  - **Team identity:** team primary and secondary colours as a two-stop field behind each side of the hero and on game cards, plus real team logos (ESPN or NBA CDN, cached).
  - **Turn the slab into content:** your team's colour wedge carrying the logo, or the live score itself. Never an empty pink block.
  - **Full-bleed backdrops:** TMDB backdrops for the resume hero and the detail page (the provider usually gives a TMDB id), under a flat scrim.
  - **A live-preview tile** in the hero and the guide (see S2-5).
  - Raise Continue watching so titles are visible on first paint, or put the title on the art scrim.

### S2-3. OK means two different things on the same screen

- **Screens:** `png/player-chip.png`, `png/player-game-shield.png`.
- **Evidence:**
  - The action chip says "OK to switch" while the hint bar under it says "OK Channels" (both visible together). The spec itself says the chip "binds OK for 8 s", which breaks the spec's own Principle 4 ("The same key never changes meaning with hidden state").
  - In the shielded game panel, the panel footer says "OK or Back closes" and the hint bar says "OK Reveal". In the one panel where an accidental OK reveals the score, OK is ambiguous.
- **Why it matters:** muscle memory on a remote is everything. A user who presses OK to close the panel gets the score revealed, which is the worst possible outcome of an ambiguous key.
- **Fix:**
  - While the chip is visible, rewrite the hint bar to "OK Switch to Grizzlies · Back Dismiss", or hide the bar and let the chip carry its own key cap.
  - In shielded panels, OK and Back both close. Reveal is a focusable "Reveal score" button you must move to (▼, then OK), or hold OK. Never plain OK.

### S2-4. Hints and focus sit inside the overscan band

- **Evidence (measured, CSS px, safe area x 48–912, y 27–513):**
  - The player hint bar text sits at y 514–531 on every player screen (banner, chip, game, channels, options, subs, sync, VOD). That is entirely below the bottom safe line.
  - Guide row 6 (BBC One) runs to y 546, past the screen edge.
  - Focus rings at x = 23 (live groups sheet), x = 36 (NBA game card at 1.05 scale), x = 38–40 (detail Play button).
- **Source:** Android TV Layouts: "position the elements with a 5% margin of 48dp on the left and right sides, and 27dp on the top and bottom", while noting "Most modern TVs no longer have overscan issues".
- **Why it matters:** **(suspected)** Philips sets can be put into modes that crop the picture (picture format "Fill" or "Zoom" on HDMI sources, and some Ambilight models). The hint bar is the only place key help appears. Rings in the margin also look off-grid.
- **Fix:**
  - Lift the hint bar so its text baseline sits above 513, or put key hints inside each panel's footer (the panels already partly do this).
  - Inset left-column focusables by 6 px so a scaled ring stays at x ≥ 42.
  - Cap the guide at rows that fit (see S2-5).

### S2-5. The live guide is legible but thin: no preview, 5.5 rows, heavy truncation

- **Screen:** `tv-live.png`.
- **Evidence:**
  - Rows are 50 + 6 px, and the 6th row runs from y 496 to 546, so 5.5 rows are visible against the claimed 6.
  - Cells shorter than about 36 min truncate to "Sport…", "Game…", "Panor…", "F..", "I…".
  - There is no video preview anywhere in the guide. TiviMate, Channels and YouTube TV all keep the current channel playing in a preview window while you browse.
  - Apple's Live-viewing guidance says: "Let people browse the EPG without leaving their current content… picture-in-picture (PiP) mode or in the background".
- **Why it matters:** with 4,812 channels and a UK group of 212, paging 5 rows at a time is slow. Browsing without preview means every check is a tune-in and a Back.
- **Fix:**
  - Add a native preview: a SurfaceView behind a transparent hole in the WebView, about 352 × 198 in the Now panel, muted, starting 600 ms after focus settles on a row.
  - Offer a compact density with 7–8 rows at 40 px.
  - Below about 30 min, show only an icon and the start time, and put the full title in the Now panel (already focused content).
  - Let 0–9 jump to a channel number in the guide, as it does in the player.

### S2-6. Spec claims that the renders don't support

| Claim (UI-SPEC) | What I measured |
|---|---|
| "one grid … shows 12 strong candidates on the first screen" (§1.5) | **6** full posters (CSS y 176–362). Row 2 shows 60% of the art (y 428–614 on a 540 screen) and **no captions** |
| Guide "6 rows visible" (§3) | 5.5; row 6 is cut by the screen edge |
| Loading hold: "After 4 s a caption 'Connecting to your provider…' appears … after 12 s the offline card replaces it" (§8) | Not built. `launch.js`, `launch.css` and `index.html` contain neither string. At `?ready=never` the screen is still a lone lockup after 13 s (`review-ui/l-hold13s.png`) |
| AC-P7 subtitles "▼, OK, OK (3)" | 4 when you change tracks (▼ Options, OK Subtitles, ▼ to the language, OK). 3 only if the target track is already focused |
| Data consistency | "4,812 titles" in the Movies header vs "row 120 of 8,300" in the scroll bubble (4,812 / 6 = 802 rows); "All channels 4,812" equals the movie count; one channel's logo tile reads NBA / NL, ES / E, TN / TS on different screens |

- **Why it matters:** the spec is the build contract. Inflated claims hide real density and loading problems from the engineer.
- **Fix:** correct the numbers, build the 4 s and 12 s escalation into the launch controller, and define one deterministic logo-initials rule (first letters of the first two words, ignoring network suffixes).

### S2-7. No design for "Score on picture", the zero-press way to check the score

- **Evidence:** "Score on picture" is a toggle in Options and in Account > NBA (`kit/player.js:56`, `kit/screens.js:103`), but no mock renders it. The only designed way to check the score is ▶ (the game panel, 264 × 471 CSS, **24% of the picture**) then Back.
- **Why it matters:** the brief's "check the score without leaving the stream" is best served by a small, delay-synced bug while you watch another game or channel. Every premium sports app has one: League Pass, DAZN and ESPN all do.
- **Fix:** design a 150 × 34 dp score bug at top-right inside the safe area: team colour chips, Barlow score and clock, the delay applied, honouring the shield ("MEM ● GS · Q3"). It hides when the banner shows. Include it in the native spec.

### S3-1. Focused rows change size, so text jumps on every press

- **Screens:** `player-channels.png`, `player-sync.png`, `tv-saved.png`, all `nv-row` panels.
- **Evidence:** in sync, the focused row is left 50, width 397, while the others are left 59, width 378 (measured). In channels and Saved, the focused row's content shifts about 8–9 px left of its neighbours, and the number column misaligns ("31" vs "12").
- **Why it matters:** at 3 m, moving content reads as jitter, and it looks like a bug on a 60 Hz panel.
- **Fix:** keep geometry constant and change only the fill (surface-3) and an inset ring. This is the brand's own `.f-in` rule for dense lists.

### S3-2. The LIVE badge fails contrast exactly where it matters

- **Evidence:** `--a-live-text` #FF8F8F on the focused fill surface-3 #4F4C5A gives **3.43:1** at 12 px (WCAG 1.4.3 requires 4.5:1). It shows on the focused guide cell (`tv-live.png`) and the focused panel rows (`player-channels.png`, `player-livegames.png`).
- **Fix:** on focus, render the pill solid `--a-live` with chalk text, or raise the text to about #FFB0B0. Also re-test on the panel in Vivid mode **(suspected)**.

### S3-3. Search is press-heavy and voice is unproven

- **Screen:** `tv-search.png`.
- **Evidence:** the 6 × 6 alphabetical grid with entry focus on A. "harb" then the top result costs about 24–28 presses (H: 2 moves + OK; A: 2 + OK; R: 7 + OK; B: 6 + OK; then about 6 moves to Play). The mic depends on `SpeechRecognizer`, listed as an open item. The Google TV remote's mic button goes to Assistant, not to the app. The results for "HARB" include "Tidewater" (no match), and Harbor Lights appears twice (Top result and the grid).
- **Fix:**
  - Launch `RecognizerIntent.ACTION_RECOGNIZE_SPEECH` from the mic key, and handle KEYCODE_SEARCH.
  - After 2 letters, add a suggestions column of completed titles (tvOS does this), so most searches end after 2–3 letters.
  - Remove the Top result from the grid below it.
  - Rank only prefix and word matches above fuzzy matches.

### S3-4. The hero can change under the focus

- **Evidence:** the Home hero is either the game or resume, and "data never moves focus" (§6). If NBA data arrives after first paint, the focused primary button changes from Resume to Watch live (or back) in place.
- **Why it matters:** a press during that swap does the wrong thing. On a cold launch, that is the first press of the session.
- **Fix:** decide the hero from the cached schedule (tip-off times are known days ahead) before first paint, and lock it for the first 3 s. Live scores may update inside it, but the button's action may not change while it is focused.

### S3-5. Player panels are fixed-height slabs over the picture

- **Evidence:** every panel spans y 27–498. Audio holds 3 rows and Picture size 3 rows in a 471 px panel, so about 60% of each is empty. The channel panel covers 32% of the screen and the game panel 24%.
- **Fix:** size panels to their content (with a cap at full height) and anchor them at the top. Apple: "avoid large, distracting overlays that don't enhance the viewing experience".

### S3-6. Buildability gaps

1. **Nothing is interactive.** Every mock is a static HTML string. There is no focus engine, no virtualised grid and no key-repeat behaviour to try. Chrome 113 has no native spatial navigation, so F1–F11 must be hand-built. Build a 3-screen clickable prototype (Home → Movies grid → Detail) before porting, and measure frame times on the TV **(suspected risk)**.
2. **Image decoding is unspecified.** "Images decoded at display size" needs a native layer, because Xtream poster URLs are often 500–1000 px TMDB originals or random hosts. Intercept image requests in `shouldInterceptRequest`, downscale with Coil or Glide to 248 × 372, and cache on disk. Without this, a 6-row grid can decode 36 full-size JPEGs per scroll on a MediaTek SoC **(suspected)**.
3. **`text-overflow` on flex rows** (S2-1) will repeat everywhere `.sb` and `.b` rows are used.
4. **Fonts are `latin` subsets only.** Polish, Turkish, Czech and Hungarian titles (ł, ş, ğ, ő), common in provider catalogs, will fall back mid-word. Add `latin-ext`. Icelandic (þ, ð, æ) is inside Latin-1 and is fine.
5. **The native skewed plate** is specified as "a rotated GradientDrawable". Rotation is not skew. Use a custom Drawable with a Path, or `Canvas.skew`.

### S3-7. Detail pages are adequate but flat

- The movie detail has no full-bleed backdrop (art only in the right 640 px).
- The series detail has no synopsis for the focused episode, unlike Netflix, Apple and Disney+.
- The Subtitles pill duplicates the version sheet's subtitle data.
- **Fix:** add the backdrop and scrim (S2-2), a 2-line synopsis of the focused episode under the episode row, and fold the subtitle choice into the version sheet.

### S4 (polish)

- `tv-first-welcome.png`: "Use your phone" carries a **microphone** icon. Use a phone icon. "Choose channel" on Home uses a search icon.
- text-2 #D2CEE2 and text-3 #C8C4D8 are almost the same colour, so meta hierarchy is carried by size alone. Separate them by about 1.5 L* steps, or drop text-3.
- The NBA Plays tab draws the clock as an outlined pill that looks like a button.
- **(suspected)** On Philips OLED models, the static, saturated pink slab and the always-on top bar are image-retention candidates during long sessions. Dim the slab after 30 s idle.
- Subtitles on picture: honour the Android caption preferences (`CaptioningManager` and Media3 `CaptionStyleCompat`), not only a fixed 28 dp style.
- VOD: no scrub thumbnails and no "Skip intro". Thumbnails are acceptable to skip for IPTV files, but say so.
- The launch costs a fixed 1.1 s even when Home is ready at 400 ms (measured: wipe starts at 820 ms regardless). Fine for a cold start, but make sure warm starts truly skip it, and consider starting the wipe at 600 ms when data is ready.

---

## Key flows: press counts (verified against the renders and the key map)

| Flow | Presses | Verdict |
|---|---|---|
| Cold launch → Grizzlies game (game window) | **1** (OK on the focused Watch live, `tv-home.png`) | Best in class |
| Watching another channel → the game | 1 with the chip (8 s window), otherwise ▶ then OK = **2** | Excellent |
| Game stream dies → another feed | Back, then the Home hero hold OK, pick, OK = **4+**, past a hero that may show the score | **Poor** (S1-2) |
| Resume my show | **1** outside the game window; **3** inside it (▼ ▼ OK) | Good |
| Flip channels / last channel | 1 / hold OK | Good |
| Check the score without leaving the stream | ▶ + Back = **2**, panel covers 24%; score bug not designed | Fair (S2-7) |
| Change subtitles (VOD) | ▼, OK, ▼…, OK = **4** | Par with Netflix |
| Find a movie by name in a 50k catalog | about **24–28** by grid; voice unproven | Below par (S3-3) |
| Browse to a 2019 drama | Up, → → → Movies, ▼ Filters… or Jump → 2019 = about 8–10 | Good |
| Deep in a grid → Home → exit | Back, Back, Back = 3 | Correct Android behaviour |

---

## Excitement and premium feel (calibrated)

Against Apple TV app, Netflix, Max and Disney+ (about 9 on this axis), YouTube TV and ESPN (about 7.5), and TiviMate and Plex (about 6), airglow v1 sits at about **5.5**. The system is calm and coherent, and the Sharp dialect (italic condensed scores on 12° plates) is the one moment of energy. Everything else is grey surface with text: no backdrops, no team colour, no motion in browse, no live pictures. The launch is polished but is a logo reveal and a wipe. Its loading hold doesn't escalate. The S2-2 fixes (team identity, backdrops, live preview, the slab as content) are what would move this to 7.5–8 without hurting performance. All of them are images or video on native layers, which this architecture already handles.

---

## Rubric (built before reading the spec) and sources

| # | Criterion | Pass bar | Primary source |
|---|---|---|---|
| R1 | Canvas and safe area | 960 × 540 dp design; interactive content and text inside 48 dp sides and 27 dp top/bottom | Android Developers, *TV layouts*: "position the elements with a 5% margin of 48dp on the left and right sides, and 27dp on the top and bottom"; "design your app with a 960px x 540px screen size" — https://developer.android.com/design/ui/tv/guides/styles/layouts |
| R2 | Focus spacing | Gutters absorb the focused scale; no overlap or clipping | same page: "consider the padding between items and the size increase of focused states" |
| R3 | 10-ft legibility | Body ≥ 28 px at 1080p (tvOS body 29 pt, minimum 23 pt at @1x = 1920 × 1080) | Apple HIG, *Typography*, tvOS table (Body 29 / Caption 1 25 / Caption 2 23; tvOS minimum 23 pt) — https://developer.apple.com/design/human-interface-guidelines/typography ; Android, *Design for TV*: "average distance … is 3 meters (10 feet)", "make sure that text and other elements are large enough to be seen from a distance" — https://developer.android.com/design/ui/tv/guides/foundations/design-for-tv |
| R4 | Contrast | Text ≥ 4.5:1 (≥ 3:1 for large), UI and focus indicators ≥ 3:1, measured on the composited background including focus fills | WCAG 2.2 SC 1.4.3, 1.4.11 — https://www.w3.org/TR/WCAG22/ |
| R5 | Focus visibility and stability | One unmistakable focus; never clipped or obscured; geometry stable when moving | WCAG 2.2 SC 2.4.7, 2.4.11 (Focus Not Obscured); Android, *Design for TV*: "TV UI must provide instant and distinct feedback when buttons are pressed"; Compose for TV focus indications (Scale, Border, Glow) — https://android-developers.googleblog.com/2023/05/building-pixel-perfect-living-room-experiences-compose-for-tv.html |
| R6 | Predictable keys | Same key, same meaning; Back goes to the parent; no modes | Apple HIG, *Remotes*; Android TV navigation guidance; the spec's own Principle 4 used as an internal consistency check |
| R7 | Live first and looks live | Live is one press from launch; live is marked; progress shown | Apple HIG, *Live-viewing apps*: "When live content is in the first tab, people don't have to tap more than once"; "Make sure live content looks live"; "Consider indicating the progress of currently playing live content" — https://developer.apple.com/design/human-interface-guidelines/live-viewing-apps |
| R8 | EPG | Opens on now; easy paging and jumping; favourites group; browse without leaving content | same: "When people first open the EPG, the current program, channel, and time needs to be easy to spot"; "help people page, scroll, or jump"; "Let people browse the EPG without leaving their current content… PiP… or in the background" |
| R9 | Channel change | Instant feedback | same: "Provide instant visual feedback when people change channels" |
| R10 | Player overlays | Don't obscure playback; only the most useful actions; automatic resume; no loading screen under 2 s | Apple HIG, *Playing video*: "Defer to content…", "avoid large, distracting overlays", "If playback can be resumed, do so automatically", "if loading takes more than two seconds, consider showing a black loading screen with a centered activity spinner" — https://developer.apple.com/design/human-interface-guidelines/playing-video |
| R11 | Spoiler integrity | No surface, derived number or sync tool reveals a hidden score or unseen play | Apple TV "Show Sport Scores" leak complaints and Catch Up (UX-BRIEF S29, S30, treated as secondary); my criterion: no leaks at all, including sums of table columns |
| R12 | Live sports companions | Stats beside the video without leaving it; catch-up | ESPN 2025 (panels beside live video, Catch Up to Live) and Prime Video NBA (stats without leaving the game, Rapid Recap), via UX-BRIEF S31 and S32 (secondary) |
| R13 | Search | Suggestions; minimal typing; voice | Apple HIG, *Search fields* (tvOS: keyboard and suggestions) — https://developer.apple.com/design/human-interface-guidelines/search-fields |
| R14 | Performance on weak hardware | Design for the weakest device; animate transform and opacity only; images decoded at display size; virtualised lists | Netflix TV UI engineering notes (secondary, as cited in the spec); Chrome rendering guidance (compositor-only properties) |
| R15 | States | Loading, empty, error and offline each have a cause, an action, and keep focus sensible | Android TV and Apple HIG general guidance; standard studio practice |
| R16 | Emotional fit | Content-forward, imagery-led, team identity for sports | Android, *Design for TV*: "Great TV design is all about putting content front and center"; benchmark apps (Apple TV app, Netflix, Max, ESPN, League Pass) |

Weighting for the overall score: NBA and live sports 15%, player overlays 12%, live TV and guide 10%, focus and navigation 10%, visual craft 10%, library and search 10%, fit to goals 10%, typography 6%, detail 5%, onboarding and states 5%, launch 3%, performance and buildability 4%. The weighted result is 6.6, rounded down to 6.5 because S1-1 and S1-2 directly affect the owner's main use.

### What I measured and how
- Contrast: WCAG relative luminance on the text colour against the ancestor background, composited over bg-0. Gradient fills are skipped (the ink-on-gradient buttons were checked by the brand). The only non-disabled failure was LIVE text on surface-3 at 3.43:1.
- Text below 14 px: only the 12 px badges, as the spec says.
- Safe area: bounding boxes of every visible text node and every focus element (ring included) against 48/912/27/513.
- Collisions: intersecting text-node rectangles from non-nested elements. Detail and hero collisions also confirmed by eye on the 1920 × 1080 renders.
- Launch: rAF sampling at real speed (wipe at 802 ms, launch layer at opacity 0.22 at 1002 ms, done at 1101 ms; max frame delta 16.8 ms in desktop Chromium, so the TV frame rate is **suspected**, not proven). Still frames at `?t=0…1000`, hold at `?ready=never` for 5 s and 13 s. No console errors.
