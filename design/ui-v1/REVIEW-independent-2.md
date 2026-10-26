# airglow TV UI v1.1: independent re-review

Reviewer: the same outside reviewer as `REVIEW-independent.md`, applying the same rubric (R1 to R16), the same twelve areas, the same weights and the same bluntness.
Scope: v1.1 in place in `design/ui-v1/`: 45 TV mocks, 25 player mocks, the launch, and `UI-SPEC.md` (the "v1.1 changes" list and section 12).

**Method.** I ran the designer's new `tools/audit.js` (70 pages, 0 findings) and then my own independent script again (`review-ui/measure.js`; output in `measure-v11.txt` beside `measure-v1.txt`). I also wrote two new checks:
- `gap.js`: the focus ring against its neighbour;
- `rows.js`: focused-row geometry.

I replayed the launch at real speed and held it at 5 s and 13 s, with and without a cache (`launch2.js`). I re-read every render at 1920 × 1080.

**Stand-in art.** The mocks still use procedural art. As instructed, I judged whether the layouts carry real ESPN logos and provider posters, not the stand-ins themselves. Anything that depends on the Philips panel, the SoC or the provider is marked **(suspected)**.

---

## Overall score: **7.5 / 10** (v1.0: 6.5)

This is a real revision, not a cosmetic one. Every S1 and S2 problem I raised is fixed or substantially fixed, the fixes are verified in the renders, and the audit can now catch the class of defect that slipped through v1.0.

The NBA experience is now the best thinking I've seen in an IPTV player. Spoiler-safe sync, a backup feed one press from failure, a delay-synced score bug and team identity are all in, and Home finally looks like a TV app.

It is not yet top notch, for three reasons:
1. **Nothing is proven on the hardware.** It is still a set of static mocks, and v1.1 adds two native video surfaces behind holes in the WebView.
2. **The new live previews bring an IPTV-specific risk** that the spec doesn't handle: provider connection churn.
3. **A handful of craft details are still below a top-studio bar.** The focus ring overlaps the neighbouring button on five screens, a row of text is sliced by the screen edge, and the hero repeats the same time up to three times.

| Area | v1.0 | **v1.1** | Why it moved |
|---|---|---|---|
| Visual craft | 5.5 | **7.0** | Collisions and clipping are gone, the slab carries content, and there are team plates and backdrops. Remaining: ring overlaps, sliced bottom row, repeated times in the hero |
| Typography and legibility at 10 ft | 7.5 | **8.0** | Hint bar inside the safe area, LIVE on focus passes, single-line placeholder. Row-2 text still sits in the overscan band |
| Focus and navigation model | 7.0 | **7.5** | OK conflicts resolved, inset rings, stable row geometry (measured). Still no interactive prototype; ring overlaps |
| Live TV and guide | 6.5 | **7.5** | Live preview, 6 real rows, feeds in the banner, ruler to 23:00. The preview's connection economics are unaddressed, and the preview is thumbnail-sized |
| NBA and live sports | 7.0 | **8.5** | Shield leak closed, clocks-only sync, failover card, score bug, crests and team accents |
| Library browsing and search | 6.5 | **7.5** | Suggestions, de-duplicated results, prefix-only ranking, voice and KEYCODE_SEARCH specified. The press-count claim is overstated |
| Detail pages | 6.0 | **7.0** | The column flows, full-bleed backdrop, episode synopsis. Plot now clamps to 2 lines with no way to read on; ring overlaps |
| Player overlays | 6.5 | **8.0** | Content-height panels, inset rings, one meaning per key, VOD focus on the thumb, Next episode, feed count |
| Onboarding, settings, states | 7.5 | **8.0** | Phone glyph, poster wall, nothing focused on the progress screen, cached offline Home, Playback settings (zap direction, HLS, user agent) |
| Launch and motion | 7.0 | **7.5** | 4 s caption and 12 s cached and uncached paths built and working; CSS namespaced; wedge above the letters |
| Performance and buildability | 7.5 | **7.0** | Image pipeline, skew Drawable, caption styles and latin-ext now specified. But two native video surfaces behind WebView holes, still no prototype, and latin-ext is not in the font assets |
| Fit to owner's goals | 6.0 | **7.5** | It now looks like game night. Browse rows are still static and fairly quiet |

The weighted result (same weights as v1.0) is 7.7, reported as 7.5 because the core interaction is still unproven on the TV.

---

## Verification of every v1.0 problem

| v1.0 # | Problem | Status | Evidence |
|---|---|---|---|
| S1-1 | Shield leak in the player; sync shows unseen plays | **Fixed** | `player-game-shield.png`: plate "Hidden", MIN/REB/AST only, no Plays tab, OK closes, ▼ then OK reveals; the hint bar updates when Reveal is focused (`player-game-reveal.png`: "OK Reveal score · ▲ Back to tabs"). `player-sync.png`: clocks only, opens on the stored delay, "Newer clocks hidden · 3" collapsed. Their section-12 rejection of my 90 s cut-off is **correct**: clocks-only removes the spoiler, and anchoring on the stored delay is the better design |
| S1-2 | No feed failover | **Fixed** | `player-failed.png`: "This feed stopped · Grizzlies at Warriors is also on", ESPN "Feed 2 of 3 · Best match" focused, 1 press, no score on the card. Options has "Other feeds for this game · 2", and the banner says "Feed 1 of 3". The rejection of silent auto-switching (each feed's delay differs) is **reasonable**. I accept it |
| S2-1 | Collisions and clipping | **Fixed** | My script finds no ring clipping and no slab collisions. The remaining "overlaps" are hidden line-clamped text (false positives) and sheet-over-content. Visually confirmed on detail, Home, the hub, the game page, Filters, the panels and no-art. "NBA Leag" now ends in an ellipsis |
| S2-2 | No excitement, no team identity | **Mostly fixed** | Broadcast-style hero with team plates, 4 px accents and crest discs; the slab is a live preview or a clock plate; backdrops on detail and the resume hero; programme art on rail cards; a poster wall on Welcome. Remaining: browse rows are still quiet static cards, and the MEM and GS plates are both navy and blue, so identity mostly rides on the 4 px edges (S3-4 below) |
| S2-3 | OK means two things | **Fixed** | `player-chip.png`: the hint bar reads "OK Switch · Back Dismiss". The shield panel: OK closes, Reveal is a separate stop |
| S2-4 | Overscan band | **Mostly fixed** | Hint bar text now at y 489–507. Rings stay inside x 43–917 (inward scale at the edges). **New:** row-2 titles on Home sit at y 513–533 and their meta lines are cut by the screen edge (S3-2) |
| S2-5 | Guide thin, no preview | **Partial (accepted)** | 6 rows ending at y 500 (measured), a 128 × 72 preview, silhouette cells. The rejection of 40 px rows is **fair** (a two-line cell plus ring needs 48). The preview is small at 3 m (about 16 cm wide on a 55" panel), and its connection cost is new risk S2-2 |
| S2-6 | Spec claims not borne out | **Fixed**, with one new overstatement | 6 + peek, 6 rows, "#720 of 4,812", loading paths built, one tile rule (NL / ES / TS / BO used consistently). The new claim "harb in about 8 presses" is about 13 (S3-3) |
| S2-7 | No score bug | **Fixed** | `player-scorebug.png` and `player-scorebug-shield.png`: right edge 912, y 27, team ticks, digits dropped under the shield, hidden while a banner or panel shows |
| S3-1 | Focused rows change size | **Fixed** | `rows.js`: focused rows have the same left and width as the others in sync (59/338), channels (59/330) and options (59/298) |
| S3-2 | LIVE contrast on focus | **Fixed** | No contrast failures in my pass apart from disabled chips |
| S3-3 | Search press-heavy | **Mostly fixed** | Suggestions row, prefix ranking, no duplicate, RecognizerIntent and KEYCODE_SEARCH specified. Voice is still not verified on the Philips (spec §13.5) |
| S3-4 | Hero swaps under focus | **Fixed (spec)** | §5.2: decided from the cached schedule before first paint, locked for 3 s |
| S3-5 | Oversized panels | **Fixed** | All panels are now content-height (channels, live games, options, sync) |
| S3-6 | Buildability gaps | **Partial** | Specified: Coil/Glide via `shouldInterceptRequest`, a Path-skewed Drawable, latin-ext. **Not done:** a clickable prototype (deferred, §13.9), and the latin-ext files (`brand-v5/v5.4/fonts.css` still loads only `latin` subsets) |
| S3-7 | Detail flat | **Fixed**, with a small regression | Backdrop and the focused-episode synopsis line are added. The plot is now clamped to 2 lines ("Every call comes a few…") with no affordance to read the rest |
| S4 | Polish items | **Fixed** | Phone glyph, caption styles via `CaptioningManager`, Next episode in VOD, slab dims after 30 s and stops after 3 min (OLED). The 600 ms wipe rejection is accepted: the lockup must finish |

---

## Top strengths (v1.1)

1. **Spoiler integrity is now airtight in the places I tested.** Hidden panel, clocks-only sync, a score bug that drops digits under the shield, no score on the failover card, preview off on a shielded game (the broadcast carries the score), and Home's slab switches to the clock under the shield.
2. **The failure path is IPTV-native.** One press to the next-best feed, delay-aware, with "Feed n of 3" everywhere. No mainstream app needs this, and no IPTV app I know does it this well.
3. **Home on game night now carries real energy.** Team plates and a live window in the slab, Continue watching above On now on game day (resume is ▼ OK), and the hero locked before first paint.
4. **The audit is now a real quality gate.** It checks overlap, text against boxes and the slab polygon, clipping, ring clipping, the safe area and contrast on all 70 pages. My own independent pass agrees with it, except for the ring-against-neighbour case below.
5. **The launch and loading states behave as specified.** Measured: wipe at about 800 ms, done about 1.06 s, max frame delta 16.8 ms in desktop Chromium, no console errors. At 5 s the "Connecting…" caption; at 12 s the cached Home with a slim offline bar; with no cache, the offline card with Try again focused.

---

## Remaining and new problems, ranked

### S2-1. The core interaction is still unproven, and v1.1 made it heavier (carried over, now more important)

- **Evidence:** every mock is still a static string. There is no focus engine, no virtualised grid and no key-repeat behaviour to try (§12 and §13.9 defer the prototype). v1.1 adds **two native video surfaces behind holes in the WebView** (the hero slab preview and the guide preview, §3.5 and §5.3) on top of the player's own surface. Hole-punching a `SurfaceView` under a transparent WebView region while the WebView animates is exactly where Android TV builds stutter or show black flashes **(suspected)**. So are a second decoder on a MediaTek TV SoC and focus scale animations on 2× rasterised layers.
- **Why it matters:** every press-count win in this spec assumes a focus move costs one 16 ms frame on the Philips. That assumption hasn't been tested once.
- **Fix:** before porting anything, build the 3-screen prototype (Home with the hero preview → Movies grid → Detail) with the real focus engine. On the TV, measure:
  - p95 frame time for focus moves;
  - repeat-scroll behaviour;
  - time from preview start to first frame;
  - whether the preview hole flashes during the 200 ms tab cross-fade.

  Gate the preview features on the result. The clock-plate fallback is already designed.

### S2-2. The live previews will churn provider connections (new)

- **Evidence:** the guide preview starts a stream "600 ms after focus settles" on every channel row (§5.3). The hero preview starts when Home opens (§3.5). Both share "one provider connection". Account shows "Connections 1 of 2" (`tv-account.png`). Xtream panels count connections per stream request and often free a slot tens of seconds after the client disconnects **(suspected; behaviour varies by panel)**. Scrolling the guide with a 600 ms dwell can open a new stream every second.
- **Why it matters:** the likely failure is "max connections reached" on the moment that matters. The owner presses OK to tune the game, and the provider refuses because the preview slots haven't been released yet. Or the preview knocks the owner's phone or another TV off the line. That turns a premium feature into the most common cause of "won't play".
- **Fix:**
  - Raise the preview dwell to 1.5–2 s.
  - Keep one preview connection and reuse it: switch the stream URL, never open in parallel.
  - Never start a preview while the player or another airglow client holds a slot.
  - Default Guide preview to off when `max_connections` = 1, and show programme art instead.
  - On a "max connections" error, stop previews for the session.
  - Log the connection count in About for diagnosis.

### S3-1. The focus ring overlaps the next button on five screens (missed by the audit)

- **Evidence (`gap.js`, CSS px, ring right edge versus the left edge of the next secondary button):**

  | Screen | Overlap |
  |---|---|
  | `home.html` | −1.0 |
  | `home-pre.html` | **−3.6** |
  | `home-choose.html` | −3.0 |
  | `detail-movie-resume.html` | −2.8 |
  | `home-resume.html` | 0.0 |

  Only `detail-movie.html` clears it, by 1.4 px. Visible in `tv-home-pre.png`: the white ring of "Watch pre-game" runs into the outline of "Preview".
- **Why it matters:** this is the focus state of the most-pressed button in the app, and it is the "gutter rule" the spec itself states (AC-F3). At 3 m, a ring fused to a neighbour's outline reads as one blob.
- **Fix:** the button gap must be at least the scale growth plus 5 px of ring plus 4 px of air, so about 16 px for a 220 px button at 1.05 (currently about 8–12). Add a ring-to-neighbour check to `tools/audit.js`.

### S3-2. Home's second row is sliced by the screen edge (new, caused by the "text at the top" change)

- **Evidence:** `tv-home.png`, `tv-home-shield.png`, `tv-home-pre.png`, `tv-home-choose.png`. On-now titles sit at y 513–533 (inside the overscan band), and their meta lines ("TNT Sports 1", "ESPN", "NBA TV") are cut through the middle of the glyphs at y 540. The same happens on Continue watching in `tv-home-resume.png`.
- **Why it matters:** half-glyphs at the bottom edge read as a rendering bug, not a peek. The peek should be art, not text.
- **Fix:** in the peeking row, render only the tile, LIVE and number line, and hide the meta, or fade the row out from y 500. Show the full card text only when the row is focused, which scrolls it up.

### S3-3. The search press-count claim is overstated

- **Evidence:** §5.7 and AC-P13 say "harb" takes "about 8 presses: H, A, then Right to the suggestions and OK". From entry focus on A (column 0):
  - H is ▼ ▶ OK, 3 presses;
  - A is ▲ ◀ OK, 3 presses;
  - the suggestions row sits right of column F, so it takes **6 Rights**;
  - then OK.

  That is **13 presses**, not 8. It is still much better than v1.0's 24–28.
- **Fix:** put the suggestions row **between the field and the keyboard** (▲ from the top row of keys), which makes it genuinely 8. Or let Right from any key jump to the results column (but that costs Right on the keyboard). Correct the AC table either way.

### S3-4. The hero repeats itself, and team identity relies on a 4 px edge

- **Evidence:**
  - `tv-home-pre.png` shows the tip-off time three times: "TIP-OFF 21:30 · IN 49 MIN" in the status row, "21:30" between the plates, and "21:30 / TIP-OFF · 49 MIN" in the slab.
  - `tv-home-choose.png` and `tv-home-shield.png` show "Q3 7:29" twice (status row and slab).
  - The Memphis and Golden State plates are both dark blue, so with stand-in crests the teams read apart mainly by the 4 px accent (light blue versus gold).
- **Why it matters:** repetition spends the most valuable pixels on the screen and dilutes hierarchy. Same-hue plates waste the identity work.
- **Fix:**
  - Pre-game: put a countdown in the slab ("49 MIN" large, "21:30 tip-off" small) and remove the time from between the plates.
  - Choose and shield: drop the clock from the status row when the slab shows it.
  - Plates: when both teams' primaries fall within about 15° hue and ΔL < 10, use the away team's secondary colour for its plate (Warriors gold at reduced lightness, or keep navy with a gold plate edge). Verify with the real ESPN crests **(suspected)**.

### S3-5. The "Live games" panel's shield scope still disagrees with the hub

- **Evidence:** in `player-livegames.png`, Lakers at Suns shows no score under "Shield: My team", with the note "Scores are hidden here by the spoiler shield". The NBA hub shows Lakers 48–51 under the same setting (`tv-nba-shield.png`).
- **Fix:** under My team, show non-team scores in Live games (at their own channel delay if known) and hide only your team's. One rule everywhere.

### S3-6. Preview size and placement in the guide

- **Evidence:** the 128 × 72 CSS preview (256 × 144 device) is about 16 cm wide on a 55" set at 3 m, and the "PREVIEW" label covers its lower third (`tv-live.png`). TiviMate and Channels use previews 2–3× that size.
- **Fix:** grow it to about 224 × 126 by letting the Now panel's description wrap beside it, or drop the label (the muted state is self-evident).

### S4 (polish)

- **Plot clamp:** the detail plot is now 2 lines ("Every call comes a few…") with no way to read more. Offer 3 lines, or ▼ on the title area to expand.
- **latin-ext:** the spec says to ship it, but `brand-v5/v5.4/fonts.css` still lists only `latin` files. Add the files or the subset will silently fall back.
- **Sync hint:** in the watched-game panel, OK on a tab closes the panel but OK on "Sync" opens sync. The outline helps; keep Sync visually distinct from the tabs (it is) and say "OK Sync" in the hint when it is focused.
- **Reveal when watching (§12 row MF1):** ▶ on the game you are watching shows the score at the synced delay. If the stored delay is a few seconds short, the panel can show a basket before the picture does. Add a 5 s safety margin to the watched-game panel only.
- **Offline Home:** cards are shown and focusable. Pressing Resume offline must fail gracefully ("Needs a connection · Try again"), not open a black player.

---

## Key flows: press counts in v1.1 (verified)

| Flow | v1.0 | **v1.1** |
|---|---|---|
| Cold launch → Grizzlies game | 1 | **1** |
| Another channel → the game | 1–2 | **1–2** (chip rebinds visibly) |
| Game feed dies → backup feed | 4+ via the Home hero | **1** (OK on the focused best feed) |
| Resume my show on game day | 3 | **2** (▼ OK; Continue watching is now first) |
| Check score without leaving the stream | 2 | **0** with Score on picture, or 2 |
| Sync the delay | 3+ (and spoiled) | **3**, spoiler-free |
| Find "Harbor Lights" by name | 24–28 | **about 13** (8 if suggestions move above the keys); voice 1 if RecognizerIntent works on the Philips **(suspected)** |
| Subtitles, live | 4 | **6** (◀, ▼ ▼ past Sync and Other feeds, OK, ▼, OK). Acceptable: the CC key goes direct if the remote has one |

---

## Rubric and sources

Unchanged from `REVIEW-independent.md` (R1 to R16): Android TV layouts (960 × 540 dp, 5% margins of 48 / 27 dp, focus growth in gutters), the Apple HIG (typography tvOS body 29 pt / minimum 23 pt; live-viewing apps; playing video), WCAG 2.2 (1.4.3, 1.4.11, 2.4.7, 2.4.11), Android *Design for TV* (3 m viewing distance, instant distinct feedback), Compose for TV focus indications, and the streaming benchmarks named in the brief. I applied the same weights.

**New measurement files** (scratchpad `review-ui/`):
- `measure-v11.txt`: the independent pass;
- `gap.js`: ring against neighbour;
- `rows.js`: row geometry;
- `launch2.js`, `l2-5s.png`, `l2-13s.png`, `l2-13s-nocache.png`: launch and hold states;
- `home-bottom.png`, `pre-hero.png`: crops for S3-2 and S3-4.
