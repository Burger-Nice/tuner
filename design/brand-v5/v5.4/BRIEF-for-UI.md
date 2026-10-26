# airglow: brief for the UI designer

Version v5.4 (brand approved, reviewer 7.5/10). This is the working reference for designing every screen of the app. It tells you what is fixed, what is free, and why. Where this brief and `BRAND.md` disagree, `BRAND.md` and `tokens.css` win; tell the brand consultant and the brief gets fixed.

**One sentence of brand:** a play wedge that leaves a lit, stepped afterimage ("a signal travels through the air and leaves a glow behind it"), in pink to orchid on a violet-ink canvas, calm by default and sharp only for live sport.

---

## 1. Context you need

- A personal TV app for the owner: live TV channels, a guide, movies and series, NBA and other live sport. It runs as a WebView UI (Chrome 113) on an Android TV / Google TV box on a 1080p TV, driven by a **d-pad remote**. No touch, no hover, no pointer.
- Playback happens in the **native Android player** (Media3), not in the WebView. The player's overlay, dialogs, subtitles and stats are themed natively (section 5).
- The owner wants it **creative, top notch, and not tied to the current app's screens**. Layout, navigation and screen structure are yours (section 9). The brand is the constraint on look and feel, not on structure.
- Name clash: "airglow" is a personal name, not trademark-cleared; the "ai" reading is an accepted risk. Do not design around it.

## 2. What is fixed

### 2.1 Logo: which file where

| Situation | File | Notes |
|---|---|---|
| Wordmark on **bg-0**, 40 px high and up | `assets/lockup.svg` | gradient "glow", wedge i-dot |
| Wordmark on bg-0, **under 40 px**, and the banner | `assets/lockup-compact.svg` | round i-dot |
| Wordmark on **any other surface** (bg-1, cards, artwork, gradient), 40 px and up | `assets/lockup-chalk.svg` | all chalk, bands at 30 / 50 / 70% chalk |
| Same, under 40 px | `assets/lockup-chalk-compact.svg` | |
| Mark alone, 48 px and up | `assets/mark.svg` | wedge + 3 bands |
| Mark alone, 24 to 48 px | `assets/mark-small.svg` | wedge + 2 bands |
| Mark alone, **under 24 px** | `assets/mark-micro.svg` | plain wedge, no bands |
| App icon | `assets/icon-1024.svg/.png`, adaptive `icon-foreground` + `icon-background`, `icon-small` (48 px and below) | |
| Banner | `assets/banner.svg` (gradient, primary), `banner-dark.svg` (alternative) | |

Rules: the lockup contains the mark, so **mark and lockup never share a screen**. The gradient "glow" word exists only on bg-0. Never recolour, outline, skew, animate the shapes apart (except the launch), add glow, shadow or blur. Clear space = half the wedge height. Minimum mark size 16 px (micro). The rail uses the mark; the splash and About use the lockup.

Launch (1100 ms, see `launch.png`): static wedge on bg-0 (native splash, same colour as the canvas so nothing flashes) → bands slide out from behind the wedge (300 ms, 40 ms stagger) → lockup at 700 ms → 8° soft wipe to Home at 1100 ms. Reduced motion: static wedge, then a 120 ms fade.

### 2.2 Colour roles (all values in `tokens.css`; every pair is checked, `node tools/contrast.js` = 0 failures)

| Role | Token | Hex | Use |
|---|---|---|---|
| Canvas | `--a-bg-0` | `#15131D` | the screen background, rail, splash, window |
| Raised | `--a-bg-1` | `#1E1B28` | sheets, dialogs, top bars, OSD |
| Card | `--a-surface-1` | `#2D2B35` | cards, rows, fields (1.32:1 vs canvas) |
| Selected / track | `--a-surface-2` | `#3D3B45` | selected row, progress track, toggle track (1.67:1) |
| Pressed / chip | `--a-surface-3` | `#4F4C5A` | pressed, chips (2.20:1). **No status text on it.** |
| Text 1 / 2 / 3 | `--a-text-1/2/3` | `#F3EFE6` / `#D2CEE2` / `#C8C4D8` | all >= 4.5:1 on all five surfaces |
| Disabled | `--a-text-4` | `#726E81` | disabled controls only, never information |
| Brand fills | `--a-pink` `--a-orchid` | `#F95BAC` `#D540F5` | fills, strokes, progress (>= 3:1 on bg-0 to surface-2) |
| Brand as text | `--a-pink-text` `--a-orchid-text` | `#FFB4D4` `#E9AFF2` | the only way brand colour is used as text |
| The gradient | `--a-grad` | `linear-gradient(100deg,#F95BAC,#D540F5)` | primary buttons, progress, Sharp slab. Two stops, always |
| Ink | `--a-ink` | `#14101F` | labels and glyphs **on** the gradient (5.2 to 6.3:1). Chalk on the gradient is 2.6 to 3.1:1: never |
| Violet stroke | `--a-violet-ui` | `#9D7DFF` | the only violet allowed as a UI line |
| LIVE | `--a-live` / `--a-live-text` | `#FF4B4B` / `#FF8F8F` | LIVE only (below) |
| OK | `--a-ok` | `#47D394` | healthy state, always with an icon |
| Focus | `--a-focus` | `#FFFFFF` | the ring (18.9:1 on canvas) |
| Borders | `--a-border`, `--a-border-strong` | `#3C3452`, `#918BA7` | decorative 1 px; strong = fields, unselected chips, toggle track (3:1+) |

Hard colour rules, with reasons:
1. **Red is LIVE and nothing else.** Always a 2 px red outline pill + dot + the word LIVE; never a fill, never alone. Reason: a colour that means one thing is read in a glance across the room.
2. **Nothing amber or yellow.** Not for ratings, not for warnings. Reason: yellow is IMDb's; stars are chalk.
3. **Errors and warnings are neutral:** outline icon + a plain sentence in chalk on a surface. No red, no amber, no exclamation mark. Reason: red must keep meaning LIVE.
4. **Violet is not UI colour.** It lives only as the back band of the mark. Strokes use `violet-ui`. Reason: violet on the canvas is 2.4:1 and sits next to Twitch.
5. **No glow, no blur, no soft shadow.** The owner called the glow version "cheaply made". Separation comes from surface steps, 1 px borders and the focus ring.
6. Brand colour as text uses `pink-text` / `orchid-text`, never `pink` / `orchid`.
7. Only these gradients exist: pink to orchid (UI), the tile ramp (icon), the banner ramp, and one flat 2-stop `bg-1` to `bg-0` vertical backdrop. No full-screen colourful gradients.

### 2.3 Type (`tokens.css`, 960 × 540 CSS px)

| Role | Face | Size / line |
|---|---|---|
| Display (page title) | Outfit 700, -0.01em | 40 / 44 |
| Head | Outfit 700 | 28 / 32 |
| Title | Outfit 700 or Inter 650 | 22 / 28 |
| Body | Inter Variable 500 | 16 / 24 |
| Label (caps, +0.08em) | Inter 650 | 14 / 18 |
| **Caption: the floor for informational text** (v5.4: 14) | Inter 500, tabular | 14 / 18 |
| Badge (LIVE, 4K, HD, language tag: caps, 4 letters or fewer) | Inter 700, +0.12em | 12 / 12 |
| Score (Sharp only) | Barlow Condensed 800 italic, tabular | 56 / 52 |

Numerals in the guide, clocks, scores and durations are tabular. Fonts are bundled (99 KB, OFL, `fonts.css`). Do not add a font. Reasons: reading distance is ~3 m; 14 px at 960 wide is 28 px on the 1080p panel, which is the practical floor; one text face keeps tables aligned.

### 2.4 Surfaces, shape, spacing, safe area

- Cards: `surface-1`, radius 16, 1 px `--a-border`. Rows radius 8 to 12. Pills 999. Dialogs 24.
- Spacing steps 4 / 8 / 12 / 16 / 24 / 32. **Safe area: 48 px horizontal, 27 px vertical** (5%); nothing interactive outside it.
- Canvas is flat. Large flat fills may carry `sprites/grain.png` (7/255 alpha) to prevent banding on 8-bit panels.
- Weak panels crush blacks, so never place content on a surface darker than the canvas; stay on the five surfaces.

### 2.5 Focus, selection, states

- **Focus** = 3 px white ring with a 2 px canvas gap (`--a-focus-ring`) on the focused element, plus `scale(1.05)` on cards and primary buttons (ring only on text-heavy rows and fields so text stays sharp). **Exactly one focused element per screen.** The ring alone must be enough to find focus from the sofa; do not add glow.
- **Selected is not focused.** Selected persists after focus leaves and uses fill + a shape: chip = surface-3 fill + pink dot + `pink-text` bold; tab = chalk text + 3 px gradient underline; radio = pink dot; toggle = gradient track, ink knob, the word On/Off. A selected and focused element shows both.
- Pressed = surface-3 (120 ms). Disabled = surface-2 fill with `text-4`, no ring ever.
- **Error field:** dashed 2 px `text-2` outline, surface-2 fill, outline-icon disc at the right, one chalk sentence below. The ring remains the only white solid line.

### 2.6 Motion

Transform and opacity only. Durations: fast 120 ms (focus ring, press), 200 ms (focus lift, chips), 320 ms (sheets, crossfades), 280 ms (live wipe), 1100 ms (launch). Easing `cubic-bezier(.2,.7,.2,1)`; wipe `cubic-bezier(.7,0,.2,1)`. Nothing loops except a spinner. Honour reduced motion. Never animate `width`, `height`, `top`, `left`, `box-shadow` or `filter`.

### 2.7 The Sharp dialect (live and NBA only)

One identity, two angles: **12° for everything live, 8° for everything soft.** Nothing else slants. "Live" = anything carrying the LIVE pill, plus the NBA section.

May slant at 12° (the shape behind, never the text):
- score plates: a `surface-1` plate skewed −12° with upright text inside (`transform: skewX(-12deg)`, children `skewX(12deg)`);
- one pink to orchid slab per live hero, under 25% of the hero, with a thin orchid line parallel to it;
- the wipe between live states (280 ms), never for normal navigation.

May use italic condensed (Barlow Condensed 800 italic): scores, and a title of three words or fewer, only inside the Sharp dialect.

**Never slants:** body text, labels, captions, anything over three words; box scores, standings, tables, schedules; channel rows and the guide (even a LIVE row); buttons, chips, fields, dialogs, tabs, focus rings; the mark and lockups. Soft's own 8° edge is for a hero edge and the launch wipe only.

Reason: Sharp gives live its urgency; letting it leak into reading surfaces would make the whole app two brands. See `components.png` for the "don't" row.

## 3. Component rules

All specimens are in `components.png` (source `components.html`, built by `tools/components.js`; copy markup and classes from there).

| Component | Spec |
|---|---|
| **Primary button** | 44 px high, pill, `--a-grad`, ink label Outfit 700 17 px, 24 px side padding, optional leading play glyph. One per screen. Focus: ring + scale 1.05. |
| **Secondary button** | 44 px, pill, transparent, 2 px `border-strong`, chalk label. Focus: ring (inside the strong border). |
| **Disabled button** | surface-2 fill, `text-4`, no ring. |
| **Chip** | 32 px, pill, surface-2 fill, `text-2`, Inter 650 14. Selected: surface-3, pink dot, `pink-text`, bold. |
| **Tab** | 40 px, text-3; selected chalk + 3 px gradient underline inset 16 px. |
| **LIVE badge** | `.a-live`: 22 px, 2 px red outline pill, 7 px red dot, word LIVE in `live-text`, 16% red tint fill. One per row or card. |
| **Poster card, portrait 2:3** | 132 × 198 (or 129 × 194 in a six-column grid), radius 12 (`--a-radius-poster`), 1 px border, badge chip top-left on a 78% scrim, resume bar flush at the bottom, title Inter 650 15 + meta 14 **below** the art. Focus: ring + scale 1.05. |
| **Poster card (16:9)** | radius 16, 1 px border, art fills, title Inter 650 15 over a bottom scrim, meta 14 `text-2`, 4 px progress bar flush to the bottom edge (gradient on surface-2 track). Focus: ring + scale 1.05. |
| **Progress bar** | 4 to 6 px, radius 2, gradient fill, `surface-2` track. Pink to orchid only; violet never. |
| **Channel row** | 56 px, surface-1, 1 px border, radius 8; number (tabular, `text-3`) · logo tile 40 · title Inter 650 15 + sub 13 `text-3` · now-playing bar 90 px. Selected = surface-2, border off. Never skewed, even when LIVE. |
| **Input field** | 48 px, radius 12, surface-1, 2 px `border-strong`, placeholder `text-3`, value `text-1`. Focus = ring. Error as in 2.5. |
| **Toggle** | 52 × 30, track surface-2 + 2 px `border-strong`; on = gradient + ink knob; the label always says On/Off. |
| **Dialog / sheet** | bg-1, radius 24, 1 px border, 20/16 padding, title Outfit 700 22/28, list rows 48 px (focused row = surface-3 + ring), buttons right-aligned with the primary last; scrim `rgba(21,19,29,.72)` behind. |
| **Error / empty state** | neutral surface-1 card, 48 px icon disc (outline icon, `text-1`), Outfit 700 18 title, one sentence in `text-2`, one button (secondary for retry, primary for an action). No red, no amber. |
| **Score plate / live hero / wipe** | Sharp dialect (2.7); specimens in `components.png`. |

Missing components you will need (carousel rows, hero, top bar, guide grid, search keyboard, settings list, toast, skeleton): design them freely from the tokens above, using surfaces + borders for structure and the ring for focus; send them for a brand check. Skeletons are flat surface-2 blocks with no shimmer.

## 4. Brand in practice: tone

Calm, confident, quiet in Soft; fast and punchy in Sharp. Sentence-case copy, no exclamation marks, no emoji. Time as 21:30, duration as 1h 48m, tabular. Copy is short enough to read from the sofa.

## 5. Native player theme (the owner watches here)

Values are dp = CSS px at 2× on a 960 × 540 dp screen. Sheet in `components.png`; keep it as written unless the brand check says otherwise.

| Part | Spec |
|---|---|
| Window / background | bg-0 `#15131D` |
| OSD banner | top, 24 dp from the safe edge, 64 dp high, bg-1 at 92%, radius 14; channel tile 44; title Inter 650 16/20; meta 14/18 `text-2`; LIVE pill at the right; 4 dp gradient progress; auto-hide 4 s |
| Hint bar | bottom, 34 dp, scrim 72%; key caps surface-2 + chalk 14/16; labels 14/18 `text-2` (OK Pause · ◀ ▶ Seek · ▲ ▼ Channels · MENU Options) |
| Options dialog and lists (Android / Media3) | bg-1, radius 24 dp, title Outfit 700 22/28, rows 48 dp Inter 16/24, secondary 14 `text-3`; focused row = surface-3 + 3 dp white ring (2 dp canvas gap); radio, check and seek tint = pink `#F95BAC` |
| Subtitles | chalk `#F3EFE6`, Inter 600, 5.3% of screen height (about 28 dp), black 1.5 dp edge, no box, bottom inset 10% |
| Stats side panel | right, 260 dp, bg-1 at 94%, 14/18 tabular; labels `text-2`, values chalk; opened from Options, never over the OSD |
| Seek bar / spinner | pink (gradient where the view allows), thumb chalk; spinner is a pink arc |

The WebView UI and the native player must feel like one app: same surfaces, same focus ring, same pink selection tint.

## 6. Performance budget (Chrome 113 TV WebView, 960 × 540 CSS px at 2×)

The box is a low-end TV SoC; assume a weak GPU and a software-ish compositor.
- **Forbidden:** `filter` (blur, drop-shadow), `backdrop-filter`, large `box-shadow` spreads (the 3 px ring is fine), `mix-blend-mode`, `mask-image` on moving things, animated gradients, SVG filters, canvas effects, video behind UI.
- **Animate only** `transform` and `opacity`, on elements promoted with `will-change: transform` **only while focused** (remove on blur). One concurrent animation target on screen is the goal; never more than a handful.
- **Gradients:** two stops, small elements. Large areas are flat colour; if a large area needs texture, use `grain.png` (tile 64 px).
- **Images:** decode at display size (poster 16:9 cards ~ 220 × 124 CSS px = 440 × 248 device px); no images wider than 640 device px in rows; lazy-load off-screen rows; keep at most ~2 screens of cards in the DOM (virtualise rails and the guide grid).
- **DOM budget:** under ~1500 nodes per screen; guide grid virtualised in both axes.
- **Fonts:** only the bundled 99 KB; `font-display: swap`; the launch frame is outlined SVG so it never waits on fonts.
- **Focus latency:** a d-pad press must move the ring within one frame (16 ms); do the move in `transform`/class swap, not by re-rendering a list.
- **SVG:** the logo files are solid fills + linear gradients and are fine inline or as `<img>`. Use `<img>` for repeated marks.
- **Start-up:** native splash is the static wedge (no WebView work before first paint); the 1.1 s launch animation runs on top of real loading, never in front of it (if data is ready earlier, still finish the wipe in 280 ms).

## 7. Do and don't (and why)

Do
- Use the five surfaces and 1 px borders to build depth; use whitespace and scale for hierarchy. (Glow and shadows are banned; steps are the system.)
- Put exactly one primary action on a screen. (Focus and decisions stay obvious.)
- Make focus unmistakable at 3 m: ring first, scale second. (The ring is 18.9:1; scale alone gets lost.)
- Show state with shape + text, never colour alone. (Colour-blind safety and weak panels.)
- Keep informational text at 14 px or above and body at 16 (badges 12). (Distance reading.)
- Give LIVE a consistent anatomy everywhere (outline pill, dot, word). (One meaning for red.)
- Use real content in mocks: long titles, missing artwork, 20-channel lists. (The brand holds up on bad data, not just on hero art.)
- Test every screen at 960 × 540 first, then check at 1920 × 1080 for fidelity.

Don't
- Don't use red, amber or yellow for anything but LIVE (red) or not at all (amber, yellow).
- Don't use violet for UI, or chalk on the gradient, or gradient text on anything but bg-0 in the wordmark.
- Don't add glow, bloom, blur, soft shadows, shimmer, particles. (Owner decision; also performance.)
- Don't skew text, tables, rows or buttons; don't use any angle but 12° and 8°.
- Don't show the mark and a lockup on one screen; don't redraw or recolour the logo.
- Don't use a full-bleed colourful gradient as a background. (The canvas is the brand; colour is for actions and the mark.)
- Don't rely on hover or touch; every interaction must work with the d-pad (up / down / left / right / OK / back).
- Don't hide primary navigation from the d-pad or create focus traps; Back must always leave a layer.
- Don't invent new colours or font sizes; request a token (section 10).

## 8. Where everything lives (`design/brand-v5/v5.4/`)

| Path | What |
|---|---|
| `BRAND.md` | the rules (read sections v5.4, 4 to 11) |
| `tokens.css`, `fonts.css`, `fonts/`, `sprites/grain.png` | link these in every mock; `:root.desktop` overrides for non-TV |
| `components.png`, `components.html`, `tools/components.js` | component specimens and markup to copy |
| `context.png`, `context.html` | the one Soft + Sharp screen-like frame (a sample, not a layout to follow) |
| `launch.png`, `launch.html` | launch storyboard |
| `board.png` | one-page summary of the brand |
| `assets/` | all logo files (section 2.1) and PNG exports |
| `tools/palette.js`, `contrast.js` | the colour source and the contrast check (`node tools/contrast.js`) |
| `tests/` | mark, lockup, wordmark and canvas experiments (history; do not reuse) |
| `REVIEW-ui.md` (in each version) | the independent reviewer's findings |

## 9. Where you have full freedom

The owner wants a creative, top-notch result that does not copy the current app. These are open, and the brand does not constrain them:
- **Navigation model:** rail, top tabs, a launcher-style home, a command bar, a radial or channel-first model; anything that works with a d-pad.
- **Screen structure and layout:** home, discovery, guide, detail, search, NBA hub, settings, onboarding, empty and error screens; how many rows, how big the hero is, how information is grouped.
- **Information design:** what is surfaced where, how "continue watching", live now, upcoming and favourites relate.
- **Interaction design:** focus movement, row behaviour, how the guide scrolls, quick-switch of channels, how the player is entered and left, micro-interactions within the motion rules.
- **Iconography:** a consistent outline icon set (24 px grid, 2 px stroke, round caps) is yours to draw; keep it neutral colour (`text-2`/`text-1`).
- **Imagery treatment** of artwork (crop, scrim strength, text placement), within the contrast rules.
- **Copy and empty-state illustration**, within the tone.
- Anything not listed as fixed in section 2.

If the best design needs something the brand forbids, say so and argue it: the consultant can approve a change, update the tokens, and re-run the contrast check.

## 10. Open risks to resolve in the UI pass

1. **Real posters over the canvas.** Only six synthetic gradients were tested (`tests/canvas-test.png`). With real artwork: check the scrim strength so card titles keep 4.5:1 on bright posters, whether the 1 px border still reads, and whether warm artwork and the violet-ink canvas fight. If they do, report it; the canvas chroma (.02) can be lowered.
2. **Banner loudness on the TV.** The gradient banner is the primary and the loud one; the dark banner is the quiet alternative. Check both on the real TV in Standard and Vivid picture modes, in a dark room, next to other launcher tiles, and choose.
3. **Sharp on dense NBA tables.** Sharp is proven on a score plate and a hero, not on box scores, standings or a schedule. The rule is: slant the plate behind, never the table. Test a 12-row box score, a standings table and a 7-game schedule at 960 × 540, and report whether the dialect still works or needs a rule (for example, only the header plate slants).
4. **Surface steps on the Philips.** The steps (1.32 / 1.67 / 2.20) are calculated, not seen on the panel; if cards disappear in a dim room, the borders carry them; report it.
5. **Icon and focus at distance.** Verify the 3 px ring and 1.05 scale at 3 m on every card density you propose (small cards may need ring only).
6. **Native player parity.** The native theme is specified, not built; check it against the WebView UI once a build exists.

## 11. Working with the brand consultant

- **Brand checks:** send work in progress mid-way and before final. A check returns: a verdict (on brand / needs changes), the specific rule each issue breaks (with a token or section), and a fix. It does not judge layout choices or navigation.
- **Deliver for a check:** PNGs at 1920 × 1080 (and the HTML if built from the tokens), the screen list, and any component you invented with its states (default, focused, selected, disabled, error).
- **Requesting a new token or an exception:** state the need, the screen, the alternative you tried inside the rules, and the contrast numbers if it is a colour. Do not ship a one-off hex.
- **Checklist before you send:** one primary per screen · exactly one focus ring · selected differs from focused · red only on LIVE · no amber, yellow or violet UI · no glow, blur or soft shadow · only 12° / 8° angles, never on text · text >= 14 px (badges 12), body 16 · chalk text on surfaces, ink text on the gradient · lockup file matches the surface and size · mark and lockup not on the same screen · every screen works with the d-pad only.
