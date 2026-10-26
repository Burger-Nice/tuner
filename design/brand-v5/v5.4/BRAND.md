# airglow · Soft — brand v5.4

One identity: a gradient play wedge with stepped echo bands, pink to orchid on a violet-ink canvas. **Soft** is the whole app. **Sharp** is a UI dialect for live and NBA content only.

Scope: branding and component language. Screen layout is not designed here (UI pass later). `context.png` is the only screen-like frame.

Everything is generated from `tools/palette.js` and checked by `tools/contrast.js` (**0 failures**). `tokens.css` is the source of truth for code. Nothing is trademark-cleared (personal app); known overlaps are in section 13.

## v5.4 UI-phase additions (approved after the UI milestone checks)

1. **Team identity (NBA and live screens only). Owner decision: teams use their real colours** ("team colours should stay, it's the teams' colours"). Real logos sit in the neutral disc (`surface-3`), never recoloured; placeholders are neutral. Team plates and accent bars use the team's real primary colour, plus the secondary colour where needed (plate field, 4 px accent bar, game-card row edge); the plate is a flat Sharp 12° shape with upright text. Limits: a team colour never touches a LIVE pill or a focus ring (keep an 8 px gap; a card's own ring may surround a card that has an edge); text on a plate meets contrast (4.5:1, chalk or ink chosen per plate); and **LIVE is always the dot plus the word** in its outlined pill, so a red, orange or gold team colour can never stand in for it. Team colour is data, not UI colour: never on buttons, rings, tabs, selected states, progress or other chrome, and never as a gradient or glow. Nothing amber or yellow elsewhere still holds.
2. **The live slab carries content.** The 12° pink to orchid slab on a live hero is never empty: a muted live preview, or (shield on, no channel, preview off) the game clock in Barlow Condensed 800 italic, ink on the gradient, with "Score hidden"; before tip-off the tip time and minutes to go. Slab width is at most **26%** of the hero when it carries content (25% when empty). The preview is a **rectangle** with the slanted edge drawn on top (the 8 px slab edge plus a `surface-1` wedge): no mask or clip-path on video. It is capped at 75% luminance, starts on its still frame for 1.5 s, dims after 30 s without a key, stops after 3 min. If the device cannot hold the frame rate the clock plate is the default and the preview is a setting.
3. **Italic condensed** may also be used for a game clock and a tip time (siblings of the score), in the Sharp dialect only.
4. **The one allowed loop** besides the spinner: the loading hold in the launch, where the three bands breathe (opacity 1 to .55, 1.6 s ease-in-out, 0 / .18 / .36 s delays).
5. **Native panels** (docked side panels, banner and centred cards) use radius **16** (banner 14); app dialogs in the WebView stay 24.
6. **Poster caption** 16/20 Inter 650 for 124 px posters (14 for the small 104 px size), with the caption offset 14 px below the card so the focus ring clears it.
7. **Scroll bubble** (jump position while a key repeats): `bg-1`, 1 px border, radius 16, Outfit 700 28 number, 14 px caption; appears only during key repeat and 600 ms after, opacity only, never covers the focused card. **Action chip with countdown ring** (player): `bg-1` 92%, radius 16, pink arc on a `surface-3` track on the `bg-1` panel (never draw the arc directly on surface-3), the text "OK to switch" is the meaning, seconds in the last 3 s, 8 s total, neutral (no red).

## v5.4 sign-offs (UI phase)

1. **Informational text floor: 14 px (yes).** At 960 × 540 CSS px, 14 px is 28 px on the panel, which reads from 3 m on a weak panel and matches the platform guidance (tvOS default 29 pt). The `--a-size-caption` token is now 14/18. The only exception is a **badge** (LIVE, 4K, HD, TV-MA, a language tag: caps, 650/700, five characters or fewer), which is 12 px (`--a-size-badge`). Native text follows: hint bar 14, stats panel 14/18 at 260 dp.
2. **Portrait 2:3 poster card (yes, with a modification).** 132 × 198 CSS px (six across with 18 px gutters at 864 wide is 129 × 194; both are fine), radius **12** (`--a-radius-poster`; 16 is for 16:9 cards, a 16 px corner on a 129 px card eats too much of the art), 1 px border, the provider's art fills it, a badge chip top-left on a 78% scrim, resume bar flush at the bottom, title Inter 650 15 and meta 14 **below** the art (never over a poster, since portrait art carries its own title). Focus is the ring + scale 1.05, the same as the 16:9 card. Specimen in `components.png`.
3. **Inset focus ring in dense grids (yes, as an allowed variant).** `--a-focus-ring-inset`: a 3 px white line drawn inside the cell over `surface-3`, no scale. Only where neighbours are 8 px apart or less (guide cells). It is still one white solid line, 8.4:1 against surface-3, and an outer ring would sit on the neighbours. Everywhere else the outer ring applies.
4. **Compact LIVE pill (yes, restricted).** 19 px high, 12 px text, 1.5 px outline (`--a-live-compact-h`), only inside guide cells and the top-bar NBA tab. Everywhere else the pill is 22 px / 2 px.
5. **Poster radius 12 (yes)** is `--a-radius-poster`, used for 2:3 cards. 16:9 and game cards stay 16.
6. **Team colours (modified).** Real team logos are third-party marks (like channel logos): allowed in colour, on a neutral `surface-2` tile or disc. **Placeholder discs are neutral** (`surface-3` + chalk abbreviation), never a team colour: red and orange team colours collide with LIVE (PHX orange is dE 7 from the LIVE red, HOU/MIA/CLE are crimson) and white text on several of them is under 4.5:1 (PHX 3.5, MEM 4.5).

## v5.4 final fixes (reviewer-approved 7.5/10; UI phase starts)

- **i-dot:** the wedge i-dot is used only at 40 px high and up (`lockup.svg`, `lockup-chalk.svg`). Below 40 px, and on the banner, use the round-dot files (`lockup-compact.svg`, `lockup-chalk-compact.svg`).
- **Gradient wordmark rule:** the gradient "glow" appears **only on bg-0** (the canvas). On bg-1, surfaces, artwork, gradients or anything else, use the all-chalk lockup (`lockup-chalk*.svg`; the wedge is chalk and the bands are chalk at 30 / 50 / 70% opacity).
- **Banner:** the primary banner ramp is deepened at the right end (`#4F24C4` / `#A030CC` / `#C03C8C`) so chalk is at least 4.5:1 behind the lockup (measured 4.54:1 over the lockup area). The icon tile keeps the owner's brighter ramp.
- **"ai" name risk: accepted.** The "ai" reading of airglow is a known and accepted risk (owner decision); it is mitigated by the chalk "air" / gradient "glow" split and tracking, and is not to be revisited in the UI phase.

## v5.4 changes (answering review #4, 7.0/10)

**Story, one line:** *airglow: a signal travels through the air (the wedge) and leaves a lit afterimage behind it (the stepped bands); the play wedge even dots the "i".*

1. **Icon tile: kept, by owner decision.** The review measured the tile's violet corners at ΔE 7 to 9 from Twitch purple `#9146FF` and suggested a warm magenta ramp. A plum-to-magenta alternative was drawn and cleared Twitch (ΔE 16.8), but the owner overrode it: "its fine to have the corners close to it since it still looks nothing like it, just similar colors in the corners". The Twitch proximity is therefore a deliberate decision: the overall tile, the mark and the shape do not resemble Twitch's glyph, and only the corner hue is near. The tile ramp stays `#4F24C4` / `#B83BEA` / `#E2449E` (chalk wedge at least 3.66:1 around it). The tile-options exercise was dropped.
2. **One family.** The primary banner is now the icon's sibling: the same violet-orchid-pink ramp as the tile, chalk wedge, solid chalk-tint bands and a chalk wordmark (chalk is at least 3.5:1 against the field behind the lockup). The dark canvas banner with the full-colour lockup is the alternative (`banner-dark.svg`). Test both on the TV (the gradient is the loud one).
3. **Wordmark** (`tests/word-refine.png`, large / 32 / 19 px / blur): W0 stock all chalk; W1 "glow" in the pink to orchid gradient; W2 W1 with tracking −2% (the i stands apart); **W3 = W2 + the i-dot is the mark's wedge, chosen**. "air" stays chalk, so "ai" no longer reads as one gradient unit; the wedge dot is the one custom touch and ties the name to the mark. On the gradient banner the wordmark is all chalk (a gradient cannot sit on a gradient).
4. **Glow removed everywhere.** `sprites/glow-*.png` deleted, `--a-sprite-*` glow tokens removed, focus glow removed from components (the 3 px ring does the work, 18:1), the violet atmosphere blob in `context.png` replaced by a flat 2-stop `bg-1` to `bg-0` vertical gradient. Only `grain.png` remains. The story line above is the name-to-mark link the review asked for.
5. **`mark-micro.svg`:** plain gradient wedge for under 24 px. Tiers: 3 bands at 48 px and up, 2 bands (`mark-small`, `icon-small`) at 24 to 48 px, plain wedge under 24 px.
6. **Adaptive foreground inside the safe circle:** scale reduced from .66 to .625 so the whole mark stays within radius 32 dp (safe radius 33); checked by `fgRadius()` in `tools/assets3.js` (build fails the scale search until it passes).

## v5.3 logo (owner decision)

The owner chose the **original v5 Soft echo mark** over the v5.2 lit-core mark: "the glow from the airglow v5.2 just was not it, it looks cheaply made". v5.3 therefore **starts from the v5 echo mark and refines it**. No lit core, no bloom, no glow sprite, no blur filter, no filter of any kind remains in the logo, the icon, the banner or the launch.

**What stayed from v5:** a gradient play wedge with three stepped echo bands behind it; the pink to orchid wedge; the lowercase one-weight "airglow" in Outfit 700; the chalk wedge on a pink-to-violet icon tile.

**What was refined** (ten renders at 1024 / 96 / 48 / 24 / blurred in `tests/mark-refine.png`, 1024 px files `tests/mark-R#-1024.png`):

| | Change | Why |
|---|---|---|
| Echo build | blurred translucent copies became **solid bands** (hard-edged, OKLCH colour steps `#6A33E6` to `#C23DF2`) tucked behind each other | crisp at every size; the stair is the whole idea, and nothing smears |
| Bands | 3 bands, step 10 units, heights ×.905 / .81 / .715; band tops run parallel to the wedge's slope | reads as the wedge's trail, not as equaliser bars |
| Gaps between bands (R2, R3, R4, R7) | **rejected**: with even a 1-unit cut the bands become pills and read as audio bars | tucked layers keep the stair |
| Equal-height bars (R8) | control: reads exactly as the skip-back / fast-forward button the reviewer feared | confirms why the heights must step |
| Wedge | 62 long × 70 high, base radius 6, apex radius 7.5 (v5: a 11 px stroked triangle, ~4.5 radius) | softer, premium corner; one radius family across wedge and bands |
| Gradient | diagonal pink to orchid kept (R6 horizontal: muddier, no gain) | |
| No violet (R9) | rejected: loses the sweep that makes the stair read as motion | violet is only the back band |
| Count | 3 bands at 48 px and up; **2 bands at 40 px and below** (R10, `mark-small.svg`) | the third band is under 2 px at 24 px; two wider bands still show the step |
| Optical centring | in the icon the mark is placed by the average of its bbox centre and mass centre (a wedge's mass sits at its base) | the glyph no longer looks left- or right-heavy |

**Lockup A** (`tests/lockup-refine.png`): mark height = ascender height, standing on the baseline, gap 26 units from apex to the "a"; single-weight Outfit 700 (the v5.2 two-weight "air glow" split is gone, which also removes the "air glow" reading). B (mark 1.2 × x-height) reads as a bullet; C (cap-height, gap 34) floats.

**Icon (v5.3 I2, unchanged in v5.4).** Reviewer concern: chalk on the tile was 2.1 to 2.8:1. Fix inside the owner's concept: keep the chalk wedge and the pink-to-violet tile, but deepen the pink end to `#E2449E` and the violet to `#4F24C4` with an orchid middle (`#B83BEA`). The wedge is now at least 3.66:1 against the tile in a 14 px ring around it (computed in `tests/icon-refine.js`). The echo bands are **solid** chalk tints (30 / 50 / 70% mixed into the tile colour under each band), computed per band, not alpha strips: they stay legible at 1024 and in the adaptive foreground layer. The ink-on-warm-tile versions (I3, I4) stay as tested alternatives and as the gradient banner. `icon-small.svg` is a two-band version for 48 px and below.

**Banner (v5.4: swapped).** Primary `assets/banner.svg` is the gradient banner on the icon's ramp; `assets/banner-dark.svg` is the quiet alternative. The v5.2 bloom banners are gone.

**Fast-forward / skip read.** Heights step down to the left, the bands are layered behind the wedge instead of beside it, and the wedge is the only gradient shape. R8 is the control that does read as skip; R1 does not.

**Sprites.** None for glow (removed in v5.4); `grain.png` only.

**Not changed:** colours, tokens, type, components, Sharp rules, native player spec (only the v5.2 quick fixes below).

**v5.2 quick fixes carried in v5.3:** canvas `#15131D` (no channel under 18/255), surface steps 1.32 / 1.67 / 2.20:1; error field = dashed text-2 outline + surface-2 fill + icon disc + sentence in chalk; native text floor 13 px (stats panel 13/18 at 250 dp, key caps 13/16).

## 1. Files

| File | What |
|---|---|
| `board.png` | one-page summary |
| `assets/mark.svg` `mark-small.svg` `lockup.svg` `lockup-compact.svg` `lockup-chalk.svg` `lockup-chalk-compact.svg` | mark (3 bands), small mark (2 bands, 40 px and below), lockup A. Vector only: no `<text>`, no filters, no raster |
| `assets/icon-1024.svg/.png`, `icon-small.svg` + `icon-small-256.png`, `icon-foreground`, `icon-background` (+432 px PNGs) | app icon (1024 tile), two-band small icon, Android adaptive layers |
| `assets/banner.svg/.png/@2x.png`, `banner-dark.svg/.png`, `mark-micro.svg` | Google TV banner 320×180 (gradient primary, dark alternative); plain wedge under 24 px |
| `tokens.css`, `fonts.css`, `fonts/`, `sprites/` | tokens, 99 KB of woff2, grain sprite only |
| `components.png/.html` | all components, Sharp dialect, native player sheet |
| `launch.png/.html` | 4-frame launch, 1100 ms |
| `context.png/.html` | Soft surface beside a Sharp NBA plate |
| `tests/` | `mark-refine.png` (R1 to R10), `lockup-refine.png`, `icon-refine.png`, earlier mark rounds, canvas test |
| `tools/` | generators (`mark3.js`, `lockup3.js`, `icon3.js`, `assets3.js`, `palette.js`, `contrast.js`, `build-tokens.js`, ...) |
| `owner-pick.png` | the owner's screenshot of the original v5 mark, lockup and icon |

## 2. Mark

Final **R1 (tuned)**, `tools/mark3.js`: wedge 62 long × 70 high (base radius 6, apex radius 7.5), diagonal gradient `#F95BAC` to `#D540F5`; three solid bands behind it at step 10 units, heights ×.905 / .81 / .715, tucked behind each other, colours `#6A33E6`, `#9638F0`, `#C23DF2` (OKLCH steps back to front), left corners radius 5.5. No glow, no echo transparency.

- 40 px and below: `mark-small.svg` (R10): two bands, step 13.
- Clear space: half the wedge height. Minimum 24 px.
- The lockup contains the mark; mark and lockup never share a screen.
- On a gradient tile or field the wedge is chalk or ink and the bands are solid tints of it mixed into the field (see icon and gradient banner), never the violet colours.

## 3. Wordmark and lockup

`airglow`, Outfit 700, lowercase, outlined to paths. v5.4 (W3): "air" chalk, "glow" in the pink to orchid gradient, tracking −2%, the i-dot is the mark wedge in pink. Lockup A: the mark is as tall as the ascender and stands on the baseline; the gap from the wedge apex to the "a" is 26 units (cap height = 100). On the gradient banner the whole wordmark and the i-dot are chalk.

## 4. Colour

Canvas and surfaces share one hue (295) at low chroma (.02; v5.1 .032). Canvas `#15131D` (R21 G19 B29: no channel near video black). Steps vs canvas 1.32 / 1.67 / 2.20:1. Splash = bg-0.

| Token | Hex | Role | Ratio |
|---|---|---|---|
| bg-0 | `#15131D` | canvas, rail, splash, window background | - |
| bg-1 | `#1E1B28` | raised regions, dialogs, OSD | 1.1 vs canvas |
| surface-1 | `#2D2B35` | cards, rows, fields | 1.32 vs canvas |
| surface-2 | `#3D3B45` | selected, progress track, toggle track | 1.67 vs canvas |
| surface-3 | `#4F4C5A` | pressed, chips (no status text on it) | 2.20 vs canvas |
| text-1 | `#F3EFE6` | primary text (warm chalk) | 16.0 on bg-0, 7.3 on surface-3 |
| text-2 | `#D2CEE2` | secondary | 12.0 / 5.4 |
| text-3 | `#C8C4D8` | meta | 10.8 / 4.9 |
| text-4 | `#726E81` | disabled only (never for information) | 3.7 |
| pink | `#F95BAC` | fills, strokes, progress | 6.2 on bg-0, 3.7 on surface-2 (non-text) |
| orchid | `#D540F5` | fills, strokes, progress | 5.1 / 3.1 (non-text) |
| pink-text | `#FFB4D4` | brand colour as text | 11.1 / 5.1 |
| orchid-text | `#E9AFF2` | brand colour as text | 10.4 / 4.7 |
| violet-ui | `#9D7DFF` | the violet allowed as a UI stroke | 6.0 / 3.6 |
| violet | `#5B2BD9` | mark band anchor only (#5B2BD9; the bands start at #6A33E6) | 2.4 (never a UI line, bar, text) |
| ink-on-brand | `#14101F` | label and glyph on pink to orchid | 6.3 on pink, 5.7 mid, 5.2 on orchid |
| live | `#FF4B4B` | LIVE pill outline and dot | 5.6 / 3.3 |
| live-text | `#FF8F8F` | the word LIVE | 8.4 / 5.0 |
| ok | `#47D394` | healthy, always with an icon | 9.6 |
| focus | `#FFFFFF` | focus ring | 18.4 |
| border | `#3C3452` | decorative 1 px outline | 1.6 (never the only cue) |
| border-strong | `#918BA7` | fields, unselected chips, toggle track | 4.3 on surface-1, 3.4 on surface-2 |

Roles:
- **Gradient** `linear-gradient(100deg, #F95BAC, #D540F5)`: two stops, pink to orchid, nothing else. Used for primary buttons, progress, the wedge, the Sharp slab and the gradient banner. Labels on it are ink, never chalk (chalk is 2.6 to 3.1:1 there).
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
| Caption — the floor for informational text on TV (v5.4: 14, was 13) | Inter 500 | 14 / 18 |
| Badge (LIVE, 4K, HD, language tag: caps, five characters or fewer) | Inter 700, +0.12em | 12 / 12 |
| Score (Sharp only) | Barlow Condensed 800 italic | 56 / 52 |

Numerals in guides and rows are tabular. Fonts are Latin-subset woff2, 99 KB in total, bundled locally (OFL licences in `fonts/`). Desktop override: `:root.desktop` in `tokens.css`.

## 6. Surfaces, borders, focus, selection

- Cards: surface-1, radius 16, 1 px `border`. Rows radius 8 to 12, height 48 to 56. Pills 999. Dialog radius 24.
- Safe margin 48 × 27 CSS px. Spacing steps 4/8/12/16/24/32.
- **Focus (d-pad):** 3 px white ring, 2 px canvas gap (`--a-focus-ring`), plus scale 1.05 on cards and primary buttons (ring only on text-heavy rows and fields, to keep text sharp). One focused element per screen.
- **Selected is not focused.** Selected is a persistent fill plus a shape: chip = surface-3 with a pink dot, `pink-text`, bold; tab = chalk text with a 3 px gradient underline; radio = pink dot; toggle = gradient track, ink knob and the word On. Focused is the white ring only.
- **Fields:** 48 px, radius 12, 2 px `border-strong`, placeholder text-3, value text-1; focused = ring; error = **dashed** 2 px text-2 outline + surface-2 fill + outline-icon disc at the right + one sentence in chalk below (the focus ring stays the only white solid line). No red, no amber, no exclamation mark.
- **Error and empty states:** neutral surface-1 card, 48 px icon disc (outline icon), title Outfit 18, one sentence, one button (secondary for retry, primary for the empty-state action).
- **Dialog / sheet:** bg-1, radius 24, scrim `rgba(21,19,29,.72)`; title Outfit 700 22/28; list rows 48 px; focused row = surface-3 + ring; buttons right-aligned, primary last.

## 7. Motion

| Token | ms | Use |
|---|---|---|
| fast | 120 | focus ring, press |
| default | 200 | focus lift, chip |
| slow | 320 | sheets, lockup crossfade |
| wipe | 280 | live wipe only |
| launch | 1100 | total launch |

Easing `cubic-bezier(.2,.7,.2,1)`; wipe `cubic-bezier(.7,0,.2,1)`. Transform and opacity only. Reduced motion: static mark, then a 120 ms fade.

Launch (`launch.png`): 0 ms native splash = static wedge on bg-0 `#15131D` (same as the canvas) → 300 ms the three bands slide out from behind the wedge (transform only, 40 ms stagger) → 700 ms the lockup resolves → 1100 ms an 8° soft slab wipes to Home. Under 1.2 s. No glow.

## 8. Sharp, the NBA / live dialect: one live angle

**12° for everything live** (plates, slab, wipes, parallel to each other), **8° for everything soft** (hero edge, launch wipe). Nothing else slants. "Live" = anything carrying the LIVE pill, plus the NBA section.

May slant: score plates (surface-1 backing at −12°, text upright inside); one pink to orchid slab per live hero at 12° (under 25% of it, with a thin orchid line parallel to it); wipes between live states (280 ms); scores and titles of three words or fewer in Barlow Condensed 800 italic.

Never: body text, labels, captions, anything over three words; box scores, standings, tables, schedules; channel rows and the guide, even when LIVE; buttons, chips, fields, dialogs, focus rings; the mark and lockup.

## 9. Performance (Chrome 113 TV WebView, 960 × 540 CSS px at 2×)

- **No `filter: blur`, no `backdrop-filter`, no big `box-shadow` spreads.** There are no glows (v5.4): no sprites, no blur, no radial glow in any asset.
- Gradients: two stops, small elements. The Home backdrop is a flat 2-stop gradient (bg-1 to bg-0). Over large flat fills (hero, banner) add `sprites/grain.png` at its own 7/255 alpha to break banding on 8-bit panels.
- Mark, lockup, icon and banner use only solid fills and linear gradients (no radial gradients, no `feGaussianBlur`, no filters), so the same SVGs are legal Android VectorDrawable sources.
- Fonts: 99 KB, `font-display: swap`; the launch frame uses only outlined SVG, so it does not wait for fonts.
- Native splash is the static mark: no WebView work before first paint.

## 10. Native player theme (short spec; sheet in `components.png`)

The owner watches in the native Android/Media3 player, which was unbranded. Values are dp = CSS px at 2× on a 960 × 540 dp screen.

| Part | Spec |
|---|---|
| Window / background | bg-0 `#15131D`, same as splash |
| OSD banner | top, 24 dp from the safe edge, 64 dp high, bg-1 at 92%, radius 14; channel tile 44; title Inter 650 16/20; meta 14/18 text-2; LIVE pill right; gradient progress 4 dp; auto-hide 4 s |
| Hint bar | bottom, 34 dp, scrim 72%; key caps surface-2 + chalk 14/16; labels 14/18 text-2 |
| Options dialog and lists | bg-1, radius 24 dp, title Outfit 700 22/28, rows 48 dp Inter 16/24, secondary 14 text-3; focused row = surface-3 + 3 dp white ring (2 dp canvas gap); radio, check and seek tint = pink `#F95BAC`. (22 is the title size, not the row size.) |
| Subtitles | chalk `#F3EFE6`, Inter 600 at 5.3% of screen height (about 28 dp), black 1.5 dp edge, no box, bottom inset 10% |
| Stats side panel | right, 260 dp, bg-1 at 94%, 14/18 tabular; labels text-2, values chalk; opened from Options, not over the OSD |
| Seek bar / spinner | pink (gradient where the view allows), thumb chalk; spinner is a pink arc |

## 11. Rules at a glance

1. One primary button per screen; ink label on the gradient.
2. Red only for LIVE, with the word. Nothing amber or yellow. Errors and warnings are neutral, icon + text.
3. Violet appears only as the back band of the mark; never a UI line, text, banner field or tile.
4. Mark and lockup never on one screen.
5. Plates slant 12° (live) and edges 8° (soft); never words, except scores and short live titles.
6. Selected is not focused. Exactly one ring per screen.
7. Nothing under 14 px on TV (only badges may be 12); no blur in CSS; text-4 is for disabled only.

## 12. v5.1 history (kept for reference)

v5.1 answered review #1 (6.5/10): stock play with blurred echoes replaced by a hard echo + vector glow (N4); ink on the pink to orchid tile (icon 5.2 to 6.3:1); violet quarantined to glows with `violet-ui` for strokes; surfaces re-derived; two-stop gradient with ink labels; Sharp demoted to a dialect; two-weight wordmark; no blur filters, sprites and grain. The screen-with-play idea was rejected as the YouTube silhouette (`tests/mark-tests2.png`) and so was the triangle i-dot. v5.2 supersedes the echo (N4) and the 12-unit gap.

## 13. Housekeeping and open items

- Name overlaps: LumenRadio "AirGlow" and a DoPchoice filing. Confusion risk only; nothing is trademark-cleared. The banner is no longer violet-led. The "ai" reading is an accepted risk (owner decision).
- Not tested: real posters (only synthetic art), surface steps on the Philips panel, the launch animation itself (stills only).
- Final name decision and a real clearance search if the app leaves personal use.

## 14. v5.2 history (superseded where noted)

Superseded in v5.3: the lit-core mark P8 and its glow disc, the echo-free wedge, the bloom on icon and banner, the gradient banner as primary, and the two-weight wordmark. Still current: points 3 to 7 below (angles, inconsistencies, components, canvas chroma, native player).

### v5.2 changes (review #2, 7.0/10; reviewed 7.5/10)

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

