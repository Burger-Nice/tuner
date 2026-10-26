# airglow · Soft — brand v5.1

One identity: a play triangle that gives off light. Pink to orchid on a violet-ink canvas. **Soft** is the whole app. **Sharp** is no longer a second brand; it is a small UI dialect for live and NBA content only.

Scope of this package is branding and component language. Screen layout is deliberately not designed here (a UI pass comes later). `context.png` is the only screen-like frame and exists to show Soft and Sharp side by side.

Everything below is generated from `tools/palette.js` and checked by `tools/contrast.js` (**0 failures**). `tokens.css` is the source of truth for code.

Name: airglow is a personal-app name. Nothing here is trademark-cleared. Known overlaps (LumenRadio "AirGlow" lighting product, a DoPchoice filing, a Twitch-ish purple neighbourhood) are listed under housekeeping.

## 1. Files

| File | What |
|---|---|
| `board.png` | one-page summary of the system |
| `assets/mark.svg` `mark-small.svg` `lockup.svg` | mark (with glow + echo), 24 px small mark, lockup. Vector only, no `<text>`, no blur filters |
| `assets/icon-1024.svg/.png`, `icon-foreground(.svg/-432.png)`, `icon-background(.svg/-432.png)` | app icon and Android adaptive layers with PNG fallbacks |
| `assets/banner.svg/.png/@2x.png` | Google TV banner 320×180 |
| `tokens.css`, `fonts.css`, `fonts/`, `sprites/` | tokens, 99 KB of woff2, glow and grain sprites |
| `components.png/.html` | buttons, chips, LIVE, poster card, channel row, progress, Sharp plates and wipe |
| `launch.png/.html` | 4-frame launch, 1100 ms |
| `context.png/.html` | one 1080p frame: Soft surface beside a Sharp NBA plate |
| `tests/` | mark candidates (sheets + 1024 px PNGs), wordmark tests |
| `tools/` | generators (`palette.js`, `contrast.js`, `assets.js`, `build-tokens.js`, ...) |

## 2. Mark

Final: **N4** — triangle with a rounded 10 px stroke join, in a pink to orchid gradient, one hard orchid echo at 28% (offset −9, +6), and a radial glow disc (vector `radialGradient`, orchid, 50% at the centre to 0). Not a stock play button, not a screen.

- Under 40 px use `mark-small.svg`: the plain triangle, no glow, no echo.
- Clear space: half the triangle height on all sides. Minimum 24 px (small mark).
- Mark and lockup never share a screen (the lockup contains the mark). Rail shows the mark; splash and About show the lockup.
- The mark is not recoloured: gradient version on canvas, or ink on the pink to orchid tile.

Rendered checks (`tests/mark-tests.png`, `tests/mark-tests2.png`, 1024 px exports in `tests/mark-*-1024.png`): 150, 96, 48, 24 px and a 64 px blurred row for every candidate.

## 3. Wordmark and lockup

`air` in Outfit 500 at 78% chalk + `glow` in Outfit 700 at full chalk, outlined to paths, 12-unit gap. The two weights give the name a shape ("glow" lands) so it stops being a generic lowercase word. Rejected: a triangle as the dot of the i (misplaced specks at small size, and it fights the mark); single-weight baseline (flat, reads as a SaaS name).

## 4. Colour

Canvas and surfaces share one hue (295). Lightness steps are about 0.045, so cards separate from the canvas without borders doing all the work. No channel falls under 18/255 (no black crush on cheap panels).

| Token | Hex | Role | Key ratio |
|---|---|---|---|
| bg-0 | `#171323` | canvas, rail | — |
| bg-1 | `#201D2A` | raised regions | — |
| surface-1 | `#2C2839` | cards, rows | — |
| surface-2 | `#373442` | selected, progress track | — |
| surface-3 | `#44414F` | pressed, chips | — |
| text-1 | `#F3EFE6` | primary text (warm chalk) | 15.9 on bg-0, 8.7 on surface-3 |
| text-2 | `#D2CEE2` | secondary | 11.8 / 6.5 |
| text-3 | `#BBB7CB` | meta | 9.3 / 5.1 |
| text-4 | `#726E81` | disabled only | 3.7 (informational) |
| pink | `#F95BAC` | fills, strokes, progress | 6.2 non-text on bg-0, 4.1 on surface-2 |
| orchid | `#D540F5` | fills, strokes, progress | 5.1 / 3.4 |
| pink-text | `#FDA0C9` | brand colour used as text | 9.6 / 5.2 |
| orchid-text | `#E29EEC` | brand colour used as text | 9.0 / 4.9 |
| violet-ui | `#9D7DFF` | the only violet allowed as a stroke | 5.9 / 3.9 |
| violet | `#5B2BD9` | glow anchor and icon tile end only | 2.4 — never a line, bar or text |
| ink | `#14101F` | label on pink to orchid fills | 6.3 on pink, 5.7 mid, 5.2 on orchid |
| live | `#FF4B4B` | LIVE pill outline and dot | 5.5 |
| live-text | `#FF8F8F` | the word LIVE | 8.3 / 4.5 on surface-3 |
| ok | `#47D394` | healthy / connected, always with an icon | 9.5 |
| focus | `#FFFFFF` | focus ring | 18.2 |
| border | `#3C3452` | decorative 1 px outline | 1.2 (never the only cue) |
| border-strong | `#7C7691` | inputs, unselected chips | 3.3 on surface-1 |

Roles:
- **Gradient** `linear-gradient(100deg, #F95BAC, #D540F5)`: two stops, pink to orchid, nothing else. Used for primary buttons, progress, the mark, the Sharp slab, the icon. Labels on it are ink, never chalk (chalk is 2.6 to 3.1:1 there).
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

## 6. Surfaces, borders, focus

- Cards: surface-1, radius 16, 1 px `border`. Rows radius 8, height 56. Pills 999.
- Selected row: surface-2, no border.
- Spacing steps 4/8/12/16/24/32. TV safe margin 48 × 27 CSS px.
- **Focus (d-pad)**: 3 px white ring with a 2 px canvas gap (`--a-focus-ring`), scale 1.05, plus the orchid glow sprite behind primary buttons and cards. The ring alone meets 18:1, so focus never depends on colour or glow. Exactly one focused element per screen.
- Scrim over artwork: `rgba(23,19,35,.72)`.

## 7. Motion

| Token | ms | Use |
|---|---|---|
| fast | 120 | focus ring, press |
| default | 200 | focus lift, chip |
| slow | 320 | sheets, lockup crossfade |
| wipe | 280 | Sharp wipe only |
| launch | 1100 | total launch |

Easing `cubic-bezier(.2,.7,.2,1)`; wipe `cubic-bezier(.7,0,.2,1)`. Transform and opacity only. Nothing loops except a spinner. Honour reduced-motion by cutting launch to the static mark then a 120 ms fade.

Launch (`launch.png`): 0 ms native splash = static mark on bg-0 → 300 ms glow sprite fades in, echo slides out → 700 ms lockup resolves → 1100 ms an 8° soft slab wipes to Home. Under 1.2 s total.

## 8. Sharp, the NBA / live dialect

Rule of thumb: **plates and slabs may slant, text never does, except scores and short live titles in italic condensed.** "Live" means anything carrying the LIVE pill, plus the NBA section.

May slant:
- score plates: surface-1 backing skewed −12° (`--a-skew`), text inside counter-skewed back to upright
- the live hero slab: one pink to orchid slab at 14° (`--a-wipe`), under 25% of the hero, with a thin orchid line beside it
- wipes between live states (280 ms), never for ordinary navigation
- scores and a title of three words or fewer, in Barlow Condensed 800 italic

Never slants:
- body text, labels, captions, anything over three words
- box scores, standings, tables, schedules
- channel rows, the guide, even a LIVE row (the guide is mixed content, Soft only)
- buttons, chips, focus rings, the mark and lockup
- the Soft surfaces: hero edge there is 8° at most (`--a-edge`)

`components.png` shows the three Sharp parts and three struck-through "don't" examples.

## 9. Performance (Chrome 113 TV WebView, 960 × 540 CSS px at 2×)

- **No `filter: blur`, no `backdrop-filter`, no big `box-shadow` spreads.** Glows are the 256 × 256 alpha PNG sprites in `sprites/` (about 10 KB each), scaled with `background-size`. Compose with `opacity` and `transform` only.
- Gradients: two stops, small elements. The large atmosphere on Home is a sprite, not a CSS gradient. Over large flat fills (hero, banner) add `sprites/grain.png` at its own 7/255 alpha to break banding on 8-bit panels.
- Mark, lockup, icon and banner use vector radial gradients (no `feGaussianBlur`), so the same SVG is a legal Android VectorDrawable source.
- One glow sprite visible at a time on a screen apart from the Home atmosphere. Promote only the focused element (`will-change: transform` set on focus, removed on blur).
- Fonts: 99 KB, `font-display: swap`; the launch frame uses only outlined SVG, so it does not wait for fonts.
- Native splash is the static mark: no WebView work before first paint.

## 10. Rules at a glance

1. One primary button per screen; ink label on the gradient.
2. Red only for LIVE, with the word.
3. No amber, no yellow. Errors and warnings are neutral with icon and text.
4. Violet is a glow and icon colour, not a line or text.
5. Mark and lockup never on the same screen.
6. Slant plates, not words (Section 8).
7. Nothing under 13 px on TV; nothing blurred in CSS.

## 11. v5.1 changes (answering the UI review, 6.5/10)

**1. Play triangle and echoes read as bars, mush at 24 px.** Ran 13 candidates (M1–M8, N1–N5) at 150/96/48/24 and blurred, each also at 1024. Stock play with 3 blurred echoes (M1) and glow triangles (M4, N1, N2, N5) read as bars once an edge is straight and parallel at 24 px. Kept one **hard** echo plus a **vector** radial glow (N4): the single cue survives 24 px and blur, and the glow is not a filter. Under 40 px the small mark drops glow and echo. *Pushback:* the reviewer's "screen with a play" idea (M2/M5/M7) was rendered next to a YouTube-style tile (`tests/mark-tests2.png`): it is the YouTube silhouette in our colours, so it was rejected. The triangle-as-i-dot was tried and dropped.

**2. Icon halo weakens contrast; chalk on tile 2.1–2.8:1.** The icon is now an **ink** triangle on a pink to orchid tile: 5.2 to 6.3:1 (checked at three points of the gradient). Chalk on violet was also the Twitch neighbourhood in the launcher row, so the warm tile separates it. Halo reduced to a faint white glow. Adaptive foreground/background layers are separate with PNG fallbacks; circle mask shown on the board.

**3. Colour rules.**
- Violet 2.6:1 on ink: it is now glow and icon-end only. UI strokes use `violet-ui` (5.9:1).
- Surfaces barely separate: re-derived at one hue with ~0.045 L steps (bg-0 `#171323` to surface-3 `#44414F`); cards read without relying on borders.
- Orchid near gamut edge: chroma pulled to 90% of max (pink 93%).
- Watch live 3.1:1 at the violet end: the gradient is now two stops, pink to orchid only, with an **ink** label (5.2 to 6.3:1). Chalk would be 2.6 to 3.1:1 and is banned on the gradient.
- Every token has a role and ratio in Section 4; `tools/contrast.js` fails the build on a miss (0 failures). Separate text tokens for brand colour as text (pink-text, orchid-text).

**4. Soft + Sharp is two brands.** Sharp is no longer a brand. One mark, palette, type system and focus language; Sharp remains a UI dialect for live and NBA (Section 8), with explicit may-slant / never-slant lists and a visible "don't" row. `context.png` shows the two on one canvas.

**5. Wordmark generic; "ai" reads as AI.** The wordmark is two weights (air 500 at 78%, glow 700): the name gets a shape and a hierarchy, and the break between "air" and "glow" removes the "ai" cluster as a unit. The lockup is never shown without the mark. Recorded as an unresolved risk: lowercase "ai" is still the first two letters, so the name leans on the break.

**6. Blur, glow and gradient cost, banding.** No `filter: blur` anywhere. Glow = three small alpha PNG sprites; mark and banner glow = vector radial gradients; gradients are two stops; grain sprite for banding on large fills; focus glow is a sprite with transform/opacity only. Budget in Section 9.

**Housekeeping.**
- Name overlap: LumenRadio's AirGlow product and a DoPchoice trademark filing were noted. For a personal app this is confusion risk, not clearance; revisit before any public release. Nothing here is trademark-cleared.
- Twitch similarity: addressed by the warm pink tile and ink glyph.
- Placeholder backdrop: the blue-grey placeholder from v5 is replaced by the violet-ink canvas and sprites; artwork in the component sheet is flat gradient placeholders only.

## 12. Open items for the UI pass

- Real artwork and how the scrim sits on it (needs actual posters to check 4.5:1 for text over images).
- Focus glow sprite on actual 960 × 540 hardware: check it does not drop frames on the weakest target device.
- Final name decision and a real clearance search if the app leaves personal use.
