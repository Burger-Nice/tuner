# airglow · Soft — brand v5.2

One identity: a soft-nosed play shape that is lit from inside. Pink to orchid on a violet-ink canvas. **Soft** is the whole app. **Sharp** is a UI dialect for live and NBA content only.

Scope: branding and component language. Screen layout is not designed here (UI pass later). `context.png` is the only screen-like frame.

Everything is generated from `tools/palette.js` and checked by `tools/contrast.js` (**0 failures**). `tokens.css` is the source of truth for code. Nothing is trademark-cleared (personal app); known overlaps are in section 13.

## 0. v5.2 changes (answering review #2, 7.0/10)

**1. The mark was a stock play triangle; the echo read as a shadow.** Rendered 9 candidates at 1024, 96, 48, 24 and blurred, plus ink-on-tile (`tests/mark-tests3.png`; 1024 px files `tests/mark-P#-1024.png`):

| | Idea | Result |
|---|---|---|
| P1 | v5.1 stock triangle + echo | echo is a drop shadow, gone at 24 |
| P2 | echo offset (−15,+10) at 40% (reviewer option a) | bigger, still a shadow, smudges at 48 |
| P3 | own proportion, no echo (option b: 8% longer, apex r14, base r6) | clean and different from stock, but blunt; no "glow" cue |
| P5 | outlined ghost echo | line art, mush at 24 |
| P6 | plain stock (option c) | nothing ownable |
| P4 / P8 / P9 | own proportion + **lit core** (hot pink-white at the base, pink, then orchid at the apex), no echo | the core is the one cue that survives 24 px and blur |

**Decision: P8.** Shape 69 long, 66 high, apex radius 11 (14 felt like a guitar pick), base radius 6, plus a radial hot core at the base. The gesture is what the name promises: light coming out of a play shape and travelling to the apex. It is a long soft-nosed wedge rather than an equilateral triangle, and the lit core is what a 24 px render still shows (the small mark keeps the shape and gradient). The echo is gone and this document no longer promises it. Honest limit: it is ownable by proportion and light, not by a new symbol; it is still a right-pointing triangle.

**2. Banner.** Now the icon's sibling: a pink to orchid field (`#F95BAC` to `#D540F5`) with an ink lockup (`#14101F`, 5.2 to 6.3:1) and no violet. `board.png` shows it beside Twitch-like violet and Disney-like navy blocks. The dark version stays as `assets/banner-dark.svg` (orchid and pink glows on the canvas, no violet) as the quiet alternative.

**3. Angles.** Two tokens: `--a-angle-live: 12deg` (plates, slab, wipes: all parallel) and `--a-angle-soft: 8deg` (hero edge, launch wipe). 14° is gone. `--a-skew`, `--a-wipe` and `--a-edge` remain as aliases.

**4. Inconsistencies.**
- Splash: native splash and window background are bg-0 `#121019`, the same value as the canvas (v5.1's launch.png said `#0F0C18`, which would have flashed).
- `border-strong` is `#918BA7`: 4.3:1 on surface-1 and 3.4:1 on surface-2 (v5.1: 2.8:1 on surface-2). Not used on surface-3.
- Surface steps vs canvas: 1.35 / 1.71 / 2.26:1 for surface-1/2/3 (v5.1: 1.27 / 1.50 / 1.83). The canvas stays at 18/255 so weak-black panels do not crush; the surfaces were lifted instead, and text and brand tokens re-checked. Cards keep the 1 px border. Status text (LIVE, ok) never sits on surface-3 (pressed/chip fill); the contrast script enforces it.
- `text-4` (3.8:1) is for disabled controls only, never information.

**5. Components.** `components.png` now has selected vs focused (chips, tabs), input field (default, focused, error), toggle, dialog/sheet with list rows, error and empty states, and the native player sheet (section 10).

**6. Wordmark gap** 12 to 8 units. Weight split and 78% tone stay. It reads as one word at 14 px and blurred.

**7. Canvas chroma.** Compared C .032, C .019 and a neutral reference against six synthetic poster-like artworks (skin, foliage, sunset, sea, noir, desert; `tests/canvas-test.png`). At .032 the tint cools neutral and noir art; at .019 posters read true and the canvas is still violet-ink. Chosen: **C .019 on the canvas, about .02 on surfaces**; the violet character now lives in the sprites and brand colours. Limit: synthetic art, not real posters; re-check on the panel in Standard mode.

## 1. Files

| File | What |
|---|---|
| `board.png` | one-page summary |
| `assets/mark.svg` `mark-small.svg` `lockup.svg` | mark, 24 px small mark, lockup. Vector only, no `<text>`, no blur filters |
| `assets/icon-1024.svg/.png`, `icon-foreground`, `icon-background` (+432 px PNGs) | app icon and Android adaptive layers |
| `assets/banner.svg/.png/@2x.png`, `banner-dark.svg/.png` | Google TV banner 320×180 (gradient primary, dark alternative) |
| `tokens.css`, `fonts.css`, `fonts/`, `sprites/` | tokens, 99 KB of woff2, glow and grain sprites |
| `components.png/.html` | all components, Sharp dialect, native player sheet |
| `launch.png/.html` | 4-frame launch, 1100 ms |
| `context.png/.html` | Soft surface beside a Sharp NBA plate |
| `tests/` | mark candidates (M, N, P series with 1024 px PNGs), wordmark tests, canvas test |
| `tools/` | generators (`palette.js`, `contrast.js`, `mark2.js`, `assets.js`, `build-tokens.js`, ...) |

## 2. Mark

Final **P8**: one rounded wedge (base x 33, 66 high, 69 long, apex radius 11, base corners 6), filled with a radial gradient (`#FFD3EA` core at the base, pink at 45%, orchid at the apex), with a radial glow disc behind it (vector gradient, orchid 55% to 0). No echo.

- Under 40 px use `mark-small.svg`: same shape, plain pink to orchid linear gradient, no core, no disc.
- Clear space: half the shape's height. Minimum 24 px.
- The lockup contains the mark; mark and lockup never share a screen.
- On the pink to orchid tile or banner the shape is flat ink (`#14101F`), no core.

## 3. Wordmark and lockup

`air` Outfit 500 (78% chalk on dark, full ink on the gradient) + `glow` Outfit 700, outlined to paths, **8-unit gap** (v5.1: 12). Tried and rejected: triangle i-dot, single weight.

## 4. Colour

Canvas and surfaces share one hue (295) at low chroma (.019 to .02; v5.1 .032). Steps vs canvas 1.35 / 1.71 / 2.26:1; no channel under 18/255. Splash = bg-0.

| Token | Hex | Role | Ratio |
|---|---|---|---|
| bg-0 | `#121019` | canvas, rail, splash, window background | - |
| bg-1 | `#1E1B28` | raised regions, dialogs, OSD | 1.1 vs canvas |
| surface-1 | `#2D2B35` | cards, rows, fields | 1.35 vs canvas |
| surface-2 | `#3D3B45` | selected, progress track, toggle track | 1.71 vs canvas |
| surface-3 | `#4F4C5A` | pressed, chips (no status text on it) | 2.26 vs canvas |
| text-1 | `#F3EFE6` | primary text (warm chalk) | 16.4 on bg-0, 7.3 on surface-3 |
| text-2 | `#D2CEE2` | secondary | 12.3 / 5.4 |
| text-3 | `#C8C4D8` | meta | 11.1 / 4.9 |
| text-4 | `#726E81` | disabled only | 3.8 (informational; never for information) |
| pink | `#F95BAC` | fills, strokes, progress | 6.4 on bg-0, 3.7 on surface-2 (non-text) |
| orchid | `#D540F5` | fills, strokes, progress | 5.3 / 3.1 (non-text) |
| pink-text | `#FFB4D4` | brand colour as text | 11.4 / 5.1 |
| orchid-text | `#E9AFF2` | brand colour as text | 10.7 / 4.7 |
| violet-ui | `#9D7DFF` | the only violet allowed as a stroke | 6.1 / 3.6 |
| violet | `#5B2BD9` | glow anchor and old icon end only | 2.5 (never a line, bar, text or banner field) |
| ink-on-brand | `#14101F` | label and glyph on pink to orchid | 6.3 on pink, 5.7 mid, 5.2 on orchid |
| live | `#FF4B4B` | LIVE pill outline and dot | 5.7 / 3.3 |
| live-text | `#FF8F8F` | the word LIVE | 8.6 / 5.0 |
| ok | `#47D394` | healthy, always with an icon | 9.9 |
| focus | `#FFFFFF` | focus ring | 18.9 |
| border | `#3C3452` | decorative 1 px outline | 1.6 (never the only cue) |
| border-strong | `#918BA7` | fields, unselected chips, toggle track | 4.3 on surface-1, 3.4 on surface-2 |

Roles:
- **Gradient** `linear-gradient(100deg, #F95BAC, #D540F5)`: two stops, pink to orchid, nothing else. Used for primary buttons, progress, the mark, the Sharp slab, the icon tile and the banner. Labels on it are ink, never chalk (chalk is 2.6 to 3.1:1 there).
- **Red is LIVE and nothing else.** Always dot + word + 2 px outline, never a fill, never alone.
- **Nothing amber or yellow**, anywhere (rating stars are chalk). **Errors and warnings are neutral**: icon + text in text-1/text-2 on surface-1.
- **Brand colour as text** uses pink-text or orchid-text, never pink or orchid.
- Orchid chroma is 90% of the sRGB gamut edge at its hue and pink 93%, so Vivid TV picture modes do not clip them into a different colour.

Full pair-by-pair table: `node tools/contrast.js` (text on all five surfaces, non-text on bg-0 to surface-2, ink on the gradient at three points, chip, focus ring). Fails the build on any miss.

## 5. Type

| Use | Face | Size / line |
|---|---|---|
| Display (page titles) | Outfit 700 | 40 / 44 |
| Head | Outfit 700 | 28 / 32 |
| Title | Outfit 700 or Inter 650 | 22 / 28 |
| Body | Inter Variable 500 | 16 / 24 |
| Label (caps, +0.08em) | Inter 650 | 14 / 18 |
| Caption — the floor on TV | Inter 500 | 13 / 16 |
| Score (Sharp only) | Barlow Condensed 800 italic | 56 / 52 |

Numerals in guides and rows are tabular. Fonts are Latin-subset woff2, 99 KB in total, bundled locally (OFL licences in `fonts/`). Desktop override: `:root.desktop` in `tokens.css`.

## 6. Surfaces, borders, focus, selection

- Cards: surface-1, radius 16, 1 px `border`. Rows radius 8 to 12, height 48 to 56. Pills 999. Dialog radius 24.
- Safe margin 48 × 27 CSS px. Spacing steps 4/8/12/16/24/32.
- **Focus (d-pad):** 3 px white ring, 2 px canvas gap (`--a-focus-ring`), plus scale 1.05 on cards and primary buttons (ring only on text-heavy rows and fields, to keep text sharp) and the glow sprite behind primary buttons. One focused element per screen.
- **Selected is not focused.** Selected is a persistent fill plus a shape: chip = surface-3 with a pink dot, `pink-text`, bold; tab = chalk text with a 3 px gradient underline; radio = pink dot; toggle = gradient track, ink knob and the word On. Focused is the white ring only.
- **Fields:** 48 px, radius 12, 2 px `border-strong`, placeholder text-3, value text-1; focused = ring; error = chalk outline + outline icon + one sentence in text-2. No red, no amber, no exclamation mark.
- **Error and empty states:** neutral surface-1 card, 48 px icon disc (outline icon), title Outfit 18, one sentence, one button (secondary for retry, primary for the empty-state action).
- **Dialog / sheet:** bg-1, radius 24, scrim `rgba(18,16,25,.72)`; title Outfit 700 22/28; list rows 48 px; focused row = surface-3 + ring; buttons right-aligned, primary last.

## 7. Motion

| Token | ms | Use |
|---|---|---|
| fast | 120 | focus ring, press |
| default | 200 | focus lift, chip |
| slow | 320 | sheets, lockup crossfade |
| wipe | 280 | live wipe only |
| launch | 1100 | total launch |

Easing `cubic-bezier(.2,.7,.2,1)`; wipe `cubic-bezier(.7,0,.2,1)`. Transform and opacity only. Reduced motion: static mark, then a 120 ms fade.

Launch (`launch.png`): 0 ms native splash = static small mark on bg-0 `#121019` (same as the canvas) → 300 ms glow sprite fades in and the core lights (opacity cross-fade from small mark to full mark) → 700 ms lockup resolves → 1100 ms an 8° soft slab wipes to Home. Under 1.2 s.

## 8. Sharp, the NBA / live dialect: one live angle

**12° for everything live** (plates, slab, wipes, parallel to each other), **8° for everything soft** (hero edge, launch wipe). Nothing else slants. "Live" = anything carrying the LIVE pill, plus the NBA section.

May slant: score plates (surface-1 backing at −12°, text upright inside); one pink to orchid slab per live hero at 12° (under 25% of it, with a thin orchid line parallel to it); wipes between live states (280 ms); scores and titles of three words or fewer in Barlow Condensed 800 italic.

Never: body text, labels, captions, anything over three words; box scores, standings, tables, schedules; channel rows and the guide, even when LIVE; buttons, chips, fields, dialogs, focus rings; the mark and lockup.

## 9. Performance (Chrome 113 TV WebView, 960 × 540 CSS px at 2×)

- **No `filter: blur`, no `backdrop-filter`, no big `box-shadow` spreads.** Glows are the 256 × 256 alpha PNG sprites in `sprites/` (about 10 KB each), scaled with `background-size`. Compose with `opacity` and `transform` only.
- Gradients: two stops, small elements. The large atmosphere on Home is a sprite, not a CSS gradient. Over large flat fills (hero, banner) add `sprites/grain.png` at its own 7/255 alpha to break banding on 8-bit panels.
- Mark, lockup, icon and banner use vector radial gradients (no `feGaussianBlur`), so the same SVG is a legal Android VectorDrawable source.
- One glow sprite visible at a time on a screen apart from the Home atmosphere. Promote only the focused element (`will-change: transform` set on focus, removed on blur).
- Fonts: 99 KB, `font-display: swap`; the launch frame uses only outlined SVG, so it does not wait for fonts.
- Native splash is the static mark: no WebView work before first paint.

## 10. Native player theme (short spec; sheet in `components.png`)

The owner watches in the native Android/Media3 player, which was unbranded. Values are dp = CSS px at 2× on a 960 × 540 dp screen.

| Part | Spec |
|---|---|
| Window / background | bg-0 `#121019`, same as splash |
| OSD banner | top, 24 dp from the safe edge, 64 dp high, bg-1 at 92%, radius 14; channel tile 44; title Inter 650 16/20; meta 13/16 text-2; LIVE pill right; gradient progress 4 dp; auto-hide 4 s |
| Hint bar | bottom, 34 dp, scrim 72%; key caps surface-2 + chalk 12/16; labels 13/16 text-2 |
| Options dialog and lists | bg-1, radius 24 dp, title Outfit 700 22/28, rows 48 dp Inter 16/24, secondary 13 text-3; focused row = surface-3 + 3 dp white ring (2 dp canvas gap); radio, check and seek tint = pink `#F95BAC`. (22 is the title size, not the row size.) |
| Subtitles | chalk `#F3EFE6`, Inter 600 at 5.3% of screen height (about 28 dp), black 1.5 dp edge, no box, bottom inset 10% |
| Stats side panel | right, 230 dp, bg-1 at 94%, 12/18 tabular; labels text-2, values chalk; opened from Options, not over the OSD |
| Seek bar / spinner | pink (gradient where the view allows), thumb chalk; spinner is a pink arc |

## 11. Rules at a glance

1. One primary button per screen; ink label on the gradient.
2. Red only for LIVE, with the word. Nothing amber or yellow. Errors and warnings are neutral, icon + text.
3. Violet is a glow colour, not a line, text, banner or tile.
4. Mark and lockup never on one screen.
5. Plates slant 12° (live) and edges 8° (soft); never words, except scores and short live titles.
6. Selected is not focused. Exactly one ring per screen.
7. Nothing under 13 px on TV; no blur in CSS; text-4 is for disabled only.

## 12. v5.1 history (kept for reference)

v5.1 answered review #1 (6.5/10): stock play with blurred echoes replaced by a hard echo + vector glow (N4); ink on the pink to orchid tile (icon 5.2 to 6.3:1); violet quarantined to glows with `violet-ui` for strokes; surfaces re-derived; two-stop gradient with ink labels; Sharp demoted to a dialect; two-weight wordmark; no blur filters, sprites and grain. The screen-with-play idea was rejected as the YouTube silhouette (`tests/mark-tests2.png`) and so was the triangle i-dot. v5.2 supersedes the echo (N4) and the 12-unit gap.

## 13. Housekeeping and open items

- Name overlaps: LumenRadio "AirGlow" and a DoPchoice filing. Confusion risk only; nothing is trademark-cleared. The Twitch-adjacent violet banner is fixed. Lowercase "ai" remains an unresolved name risk, mitigated by the weight split and gap.
- Not tested: real posters (only synthetic art), glow-sprite frame rate on the weakest TV, surface steps on the Philips panel, the launch animation itself (stills only).
- Final name decision and a real clearance search if the app leaves personal use.
