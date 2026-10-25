# Tuner — brand v2.2 ("Needle")

Brand system for Tuner, a personal ad-free IPTV player used mostly on a Philips Google TV for live NBA (Memphis Grizzlies), plus movies, series and live TV; also Windows and iPhone. Self-contained: hand-written SVG, OFL fonts, CSS tokens, a board (`board.png`) and the render checks used to judge every call. The v1 critique, the v2.1 research notes and the source list are in `HISTORY.md`.

## 0. v2.2 changes: answers to `REVIEW-ui.md`

Context: the owner's note ("I do like them … I fw it heavy", and the T of TUNER being the logo) was first treated as a constraint, then released: *keep it only if research and renders show it is best.* So each of the three was re-tested instead of defended.

| Owner's note | Re-tested | Verdict |
|---|---|---|
| The colours | amber vs Plex and IMDb gold (below), alternatives h76 / h88 / h92 / lighter, greyscale, colour-vision sim | **Kept**: amber (#FABA26) on a navy-tinted dark. Nothing beat the complement + Grizzlies-gold + colour-blind-safe + luminance case; the supporting colours changed. |
| "Heavy" | UNER stem 23 at cap 100, 14 px and blur renders | **Kept**: the heavy wide grotesque is what makes 14 px and blurred TV-distance reads work; the review agrees. |
| T = the logo | five lockup/mark options at 100/34/20/14 px, greyscale, blur | **Kept**, and strengthened: the T is now amber, one drawing, and its stem is the needle. |

### Per review point

**1. Ruler / T-square; the needle never passes through the scale.** *Diagnosis accepted, two of three fixes rejected on evidence.*
- (a) Needle standing proud above the bar: **rejected.** Rendered (`checks/lockup-options.png`, "cross test"): a short pointer on a T reads as a **cross or dagger** at icon size before it reads as a needle. Not a mark for a sports app.
- (b) Major/minor ticks on the top edge: **rejected.** Rendered (rows d and h in `checks/study22/study.png`): top-edge notches read as battlements; interior hairline slits (variants m/o/p, `study22/big.png`) read as a label or I-beam and turn to speckle under 34 px.
- (c) Delete the ticks: **adopted.** The six teeth are gone at every size. The tuner idea is now carried by *shape*, not texture: the stem is the needle (full height, straight, 23 wide) and it **cuts the scale in two** with a 3-unit channel either side. One sentence: "a T whose stem slices the bar." It survives greyscale, blur and 14 px (the channel closes gracefully; `mark-small.svg` closes it deliberately).
- Honest cost: the concept is subtler than v2.1's. Below about 40 px it is a very heavy amber T with a faint seam. That is the intended trade: legibility first, idea as a reward at size. A plain amber T (option 3) is the documented fallback.

**2. Tapered stem, loose T-to-U.** *Accepted, with my own numbers.*
- Stem is straight 23 (was 22→28). Crossbar narrowed 97 → **84** (the original wordmark T width). The review's 79 leaves arms of 28 minus the channel: too short to read as a scale; 84 keeps 27.5-unit arms.
- Gap bar-to-U **8** (gap study, `lockup-options.png`: 3 collides, 14 breaks the word). Stem-to-U = **38.5** (v2.1: 44.5; review target 36–38).
- E counters (optional fix): **not changed.** Counters are 16 units = 7.4 px at the banner's cap height, and the blur renders still read "TUNER". Thinning one letter's horizontals makes E lighter than its neighbours; not worth the inconsistency.
- R/U signature notch: **not added.** A detail with no job is the ruler problem again.

**3. Brand colour nearly absent; two-tone vanishes at distance.** *Accepted in full, verified.*
- Amber vs white is 1.57:1 (confirmed). In v2.1 the amber was **5.2%** of the lockup's filled pixels (pixel count); v2.2 is **13.1%** (one amber letter of five: that is the ceiling for an accent letter, and it is what stands out in the greyscale and blur rows).
- The T is all amber in the lockup, the rail and the mark. The icon is an **amber tile with an ink T** (10.5:1), and the TV banner is **ink lockup on amber**. Rendered in a mock launcher row of dark and blue tiles (`checks/study22/icons.png`, `banners.png`): the dark-tile icon and dark banner disappear; the amber ones are the first thing you see. A dark banner is kept as `tv-banner-dark.svg`.
- Not verified: how loud a full amber banner/tile is in a dark room on the real Philips panel (the review flags the same). In-app screens stay dark; only the launcher tiles are amber.

**4. Plex adjacency; amber overloaded.** *Half accepted.*
- Measured (ΔE_OK ×100): accent vs Plex gold `#E5A00D` (reported value, not confirmed) 7.4; vs IMDb `#F5C518` 2.9. The review's fix (h92) gives Plex 8.6 and IMDb **1.6**: it gains 1.2 from one neighbour and lands on the other. The gold family is crowded; ownership comes from the T and the channel, not the hue. **Hue kept.** (L.86 / h84 reaches 10.9 from Plex but is a pastel banana and shrinks contrast against white.)
- Roles capped at **four**: the mark, the one primary action, the current selection, progress. "Your team" no longer uses amber: it uses the team's own colour from data (Grizzlies blue `#5D76A9`, 4.0:1 on the canvas as a bar).

**5. Status separation; pink for errors.** *Accepted, with the cost stated.*
- Pink dropped. `danger` is now a conventional red, `#E94957` (text variant `#FF9A9A`, ≥ 5.2:1 on all five surfaces).
- That puts danger and live in one red family on purpose (ΔE 3). They are told apart by **form**: LIVE = dot + the word in an outlined pill; error = ✕ icon + a sentence. They never share a component. This is the review's proposal; the price is the v1 problem ("red means two things") returns in mild form, handled by the rule rather than by hue.
- The ΔE ≥ 10 floor applies to colours that can share a component. Shortfalls remain at accent/warning (9.8; 7.2 under deuteranopia) and warning/success under deuteranopia (8.9); both are covered by the icon + word rule. Danger vs success under deuteranopia improved from 6.9 to 13.1.

**6. Doc claims the data did not support.**
- Neutral hue/chroma: v2.1 drifted 258–267 after 8-bit rounding. The five surfaces and all neutrals are now hand-picked on-hue grid points (`color.neutral`): **hue 261.6–261.8, chroma .011–.015 (text-1 .007), ΔL .040–.044**. The doc says exactly that. Lowest canvas channel is 18.
- Small-mark switch: the review is right. The full mark needs ≥ 64 **device** px (the channel is 3% of the height: 1.9 px); below that use `mark-small.svg`. (v2.1 said 32 px, ticks included.) On a 2x phone that is 32 CSS px; on the TV rail (88 device px) the full mark is fine.
- Banner: the banner is now the logo colour, so "the white word is what the user sees" no longer applies.
- Length: the v1 critique and the v2.1 record moved to `HISTORY.md`; this file is the live system only.

## 1. The brand

### Positioning
Tuner is one person's private broadcast desk: every channel, game and film they already pay for, in one fast, ad-free place, with nothing standing between them and the Grizzlies tip-off. It behaves like a precision instrument, not a storefront.

### Personality
Locked-on (precise, instant). Quiet confidence (one colour, flat shapes, hard edges). Broadcast-grade (scoreboard numerals, 10-foot legibility, red means on-air). Yours (personal, not a service).

### The idea: "Needle"
Tuner = the moment static snaps into picture. The mark is **a T whose stem is the needle**: it runs the full height, dead straight, and slices the dial scale (the crossbar) in two. It is the T of the word, drawn once and used 1:1 everywhere. One gesture, one colour, no effects.

Why amber: it is the colour of a tuner's dial lamp and Grizzlies gold (h80); a straight complement (180°) of the navy-tinted neutrals (h262); luminous, so it carries on luma in greyscale and under blur; its apparent brightness tracks its luminance (weak Helmholtz–Kohlrausch for yellow); and amber on blue is the pairing that survives red-green colour blindness. Sources in `HISTORY.md` section 0.2.

### Do
- Lockup on `bg-0`/`bg-1`: amber T, `text-1` letters. On amber (icon, banner) or on light: all `#12161D` ink.
- Amber for exactly four things: the mark, one primary action per screen, the current selection, progress.
- Red (`live`) only for on-air: dot + the word LIVE (or a clock). Errors: `danger` + ✕ + a sentence. Warnings: `warning` + ⚠ + words. Every status has an icon or a word.
- Focus on TV = white 3 px ring with a 2 px canvas-coloured gap, plus a lift/scale.
- Archivo (wide, 700–800) for titles, headers, scores; Inter 500+ for everything read. Nothing under 13 px on the 960×540 canvas.
- Flat colour; elevation by surface step; lines ≥ 2 px on TV; overscan margins 48×27 px on the 960×540 canvas.
- Clear space of half the cap height on every side of mark and lockup.

### Don't
- No gradients, glows, halos, shadows, scanlines, arcs, ribbons, ticks, pointers above the bar (they read as a cross) or a second colour on the mark.
- No red buttons or red brand use; no amber warnings.
- No second T next to the mark; never the word without its mark-T (`wordmark.svg` is "UNER" only).
- Don't set the wordmark in a font (outlined paths), letterspace it, or add "TV", "+" or "Player".
- No Bricolage Grotesque, Figtree, JetBrains Mono or system fonts in product UI.
- Don't use the full mark below 64 device px (use `mark-small.svg`); nothing under 16 px.

## 2. Logo files

| File | Use |
|---|---|
| `mark.svg` | the symbol = the T, amber, viewBox 84×100 |
| `mark-small.svg` | below 64 device px: same T, channels closed |
| `mark-mono.svg` | one colour, `currentColor` (ink on amber/light, white or amber on dark) |
| `wordmark.svg` | **UNER** only (custom wide grotesque, outlined, cap height 100, 392×100). Never used alone |
| `lockup.svg` / `lockup-mono.svg` | mark (T) + UNER, cap 100, 484×100 |
| `icon-1024.svg/.png` | amber tile, ink T (iOS, Windows, store) |
| `icon-foreground-108.svg` | ink T on transparent for the Android adaptive foreground; background layer solid `#FABA26` |
| `tv-banner.svg/.png/@2x.png` | 320×180 / 640×360: ink lockup on amber |
| `tv-banner-dark.svg` | quieter alternative: amber T, white UNER on `#12161D` |

Geometry (cap height 100): crossbar 84×23 (= wordmark stem 23); stem 23 wide, straight, full height; 3-unit channel each side of the stem; gap bar-to-U 8, stem-to-U 38.5. Generated by `checks/geometry.js` → `checks/build-logo.js`.

Placement: **rail** = `mark.svg` 44 px tall on TV (88 device px), `mark-small.svg` on 1x desktop; **boot/sign-in** = `lockup.svg` 200 px wide on the TV canvas (cap 41 px), 160 px desktop; **player overlays** = no mark; **Windows** = `icon-1024.png`, `mark-small.svg` for 16/24/32 px tray icons. Minimum lockup 90 px wide desktop, 140 px TV.

### Icons
- `icon-1024`: T 540 px tall (scale 5.4), visual centre (42,47). The adaptive foreground uses scale 4.7 (T 470 px, bar corners 296 px from centre, inside the 313 px safe circle). Do not pre-round.
- Why amber: next to dark and blue launcher tiles a dark icon disappears (`checks/study22/icons.png`). Android TV uses no themed/monochrome layer ([TV app icon guidelines](https://developer.android.com/design/ui/tv/guides/system/tv-app-icon-guidelines)).
- Banner: cap 46, ≈ 70% of the width, inside the 80×60% safe area; text baked in as Google requires, no border ([Android TV getting started](https://developer.android.com/training/tv/start/start)). Export 480×270 for xxhdpi from the SVG.

## 3. Colour: `tokens.css`

Source of truth `checks/palette.js` (OKLCH); `tokens.css` carries the fitted hex values. Rules: no surface channel below 18/255; one neutral hue at constant low chroma, even lightness steps; off-white text; status colours never a fill behind text.

| Token | Hex | OKLCH (L C h) | Role |
|---|---|---|---|
| bg-0 / bg-1 | #12161D / #1C2027 | .199 .015 262 / .243 .015 262 | canvas, rails / raised regions |
| surface-1 / 2 / 3 | #262A31 / #30343B / #3B3F46 | .284 / .324 / .367 (C .013–.014, h262) | cards / hover / pressed |
| line / line-strong | #34383F / #4C5057 | .340 / .430 | decorative hairlines / dividers |
| outline | #7E8289 | .606 .012 262 | control borders (≥ 3:1) |
| text-1 / 2 / 3 / 4 | #F1F4F9 / #CACED5 / #ACB0B7 / #6B6F76 | .966 / .850 / .756 / .541 | primary / secondary / tertiary / disabled-only |
| accent | #FABA26 | .826 .162 82 | the T, primary action, selection, progress |
| accent-hover / press | #FECA54 / #E09F1A | .864 / .746 | states |
| on-accent / ink | #1D1409 / #12161D | | text on amber / the T on amber |
| focus | #FFFFFF | | 3 px ring + 2 px canvas gap |
| live / live-text | #F35250 / #FF9890 | .659 .198 25 / .785 .125 25 | on-air only |
| danger / danger-text | #E94957 / #FF9A9A | .635 .196 20 / .790 .121 20 | errors: ✕ + sentence |
| success | #47D394 | .776 .151 160 | connected, healthy stream |
| warning | #F89547 | .760 .150 56 | ⚠ + words; never primary or selected |

### Contrast, every text/background pair (`node checks/contrast.js`; body ≥ 4.5:1, large ≥ 3:1, non-text ≥ 3:1)

Text tokens on every surface (**all pass 4.5:1; no exceptions**):

| Text token (hex) | bg-0 | bg-1 | surface-1 | surface-2 | surface-3 |
|---|---|---|---|---|---|
| text-1 #F1F4F9 | 16.4 | 14.8 | 13.1 | 11.3 | 9.6 |
| text-2 #CACED5 | 11.5 | 10.3 | 9.1 | 7.9 | 6.7 |
| text-3 #ACB0B7 | 8.3 | 7.5 | 6.6 | 5.7 | 4.9 |
| accent #FABA26 | 10.5 | 9.4 | 8.3 | 7.2 | 6.1 |
| accent-hover #FECA54 | 11.9 | 10.7 | 9.5 | 8.2 | 6.9 |
| live-text #FF9890 | 8.8 | 7.9 | 7.0 | 6.0 | 5.1 |
| danger-text #FF9A9A | 8.9 | 8.0 | 7.1 | 6.2 | 5.2 |
| success #47D394 | 9.5 | 8.6 | 7.6 | 6.6 | 5.5 |
| warning #F89547 | 8.1 | 7.3 | 6.4 | 5.6 | 4.7 |

Non-text (icons, dots, borders, focus; >= 3:1):

| Token (hex) | bg-0 | bg-1 | surface-1 | surface-2 | surface-3 |
|---|---|---|---|---|---|
| accent #FABA26 | 10.5 | 9.4 | 8.3 | 7.2 | 6.1 |
| live #F35250 | 5.3 | 4.8 | 4.2 | 3.7 | 3.1 |
| danger #E94957 | 4.8 | 4.3 | 3.8 | 3.3 | n/a (not used there) |
| focus #FFFFFF | 18.1 | 16.3 | 14.4 | 12.5 | 10.6 |
| outline #7E8289 | 4.7 | 4.2 | 3.7 | 3.2 | n/a (not used there) |


Other pairs:

| Pair | Ratio | Verdict |
|---|---|---|
| ink `#12161D` on accent (icon T, banner) | 10.5 | ✓ |
| on-accent on accent / hover / press | 10.5 / 11.9 / 7.9 | ✓ buttons |
| live-text on live-soft over surface-1 / 2 (LIVE pill) | 5.8 / 5.1 | ✓ |
| accent on accent-soft over surface-1 / 2 (chip) | 6.1 / 5.4 | ✓ |
| text-1 on a solid `live` fill | 3.1 | large/bold only: no white text on red fills; the LIVE pill is outlined |
| focus ring against the 2 px canvas gap | 18.1 | ✓ |
| focus ring touching an amber button (no gap) | 1.7 | ✗, why the gap exists |
| amber vs text-1 (the v2.1 two-tone) | 1.57 | why the T is all amber |
| text-4 on bg-0 / bg-1 | 3.6 / 3.2 | disabled only, never information |
| danger on surface-3 | 2.8 | not used there: use danger-text |

Colour-vision check (simulated, ΔE_OK ×100; `node checks/palette-report.js`): accent/warning 9.8 normal, 7.2 deuteranopia; warning/live 14.4 / 10.4; accent/live 24.2 / 17.6; danger/success 35.5 / 13.1; **live/danger 3.0 (same family by design; separated by form, never in one component)**; accent vs canvas through deuteranopia/protanopia 11.2:1 / 9.4:1.

Panel notes: off-white text and small flat bright shapes (bloom triggers on local-dimming LCDs); canvas lifted off video black; accent kept off the sRGB gamut edge (C .162 of a possible .170) for Vivid modes; test in *Standard* picture mode. Not yet seen on the owner's Philips.

## 4. Type (unchanged)

- **Display: Archivo Variable** — `@fontsource-variable/archivo` (SIL OFL 1.1). Import `@fontsource-variable/archivo/standard.css` to get both axes (wght 100–900, wdth 62–125). Use `font-stretch: 112%` at 700–800 for titles and eyebrows (wide = broadcast), `100%` tabular for scores, `84%` for dense tables and channel numbers.
- **Text: Inter Variable** — `@fontsource-variable/inter` (SIL OFL 1.1), `wght.css`. Weight 500 minimum on TV (400 goes thin on VA panels), 650 for row titles, `font-variant-numeric: tabular-nums` on.
- Drop `@fontsource-variable/bricolage-grotesque`, `figtree`, `jetbrains-mono`.

Type scale, 960×540 TV canvas (1 rem = 16 px; 1 CSS px = 2 device px at 1080p):

| Style | Size / line | Face |
|---|---|---|
| display-xl | 56 / 60 | Archivo 800, wdth 112, −0.02em — game title, hero |
| display | 40 / 44 | Archivo 800, wdth 112 — page title, big scores |
| headline | 28 / 32 | Archivo 700, wdth 112 — section headers, card titles |
| title | 22 / 28 | Inter 650 — rows, channel names |
| body-lg | 18 / 26 | Inter 500 |
| body | 16 / 24 | Inter 500 |
| label | 14 / 18 | Inter 650, caps, +0.08em — eyebrows, pills |
| caption | 13 / 16 | Inter 500 — floor; nothing smaller on TV |

Desktop (`:root.desktop`, 1 rem = 15 px): display-xl 44/48, display 34/38, headline 24/28, title 18/24, body-lg 16/24, body 14/20, label 12/16, caption 12/16; focus ring 2 px. Phone uses the desktop scale.

---

## 5. Files and checks

- `board.html` / `board.png` — the one-page board, generated by `checks/build-board.js` from the palette (cannot drift).
- `checks/lockup-options.html/.png`, `checks/options/*.svg` — the v2.2 mark/lockup study (incl. the cross test and the gap study). `checks/study22/*` — the exploratory sheets behind it (needle variants, lockups, icon tiles in a launcher row, banners).
- `checks/tv-1080.html/.png` — sample screen at 1920×1080. `checks/sizes.html/.png` — marks, icons, banners, lockups at small sizes, mono on light/dark.
- `checks/palette.js`, `color.js` (OKLab/OKLCH, WCAG, colour-vision sim, ΔE, on-hue 8-bit neutrals), `geometry.js`, `build-logo.js`, `build-board.js`, `options.js`, `contrast.js`, `palette-report.js`, `render.js`, `shot.js`.
- `fonts/` — the two woff2 files used by the board plus their OFL licences.
- `HISTORY.md` — v1 critique and the v2.1 record.
- Rebuild: `node checks/build-logo.js && node checks/options.js && node checks/build-board.js`, then render PNGs with `checks/render.js` / `checks/shot.js`.

## 6. Sources

Everything cited for the colour research is in `HISTORY.md` (section 0.2 and section 8). Added in v2.2: Plex gold `#E5A00D` (reported, unverified; Plex publishes no hex) and IMDb `#F5C518` as comparison points; Material dark theme guidance https://codelabs.developers.google.com/codelabs/design-material-darktheme/ ; Android TV colour https://developer.android.com/design/ui/tv/guides/foundations/color-on-tv ; WCAG 2.2 https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html , https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html . The review itself: `REVIEW-ui.md`.
