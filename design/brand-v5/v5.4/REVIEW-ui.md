# airglow v5.4: independent review #5 (UI/TV designer)

Scope: branding and component language. Screen layouts are a later pass. Judged against Netflix, Plex, Apple TV, YouTube TV, Disney+, Peacock, ESPN/DAZN, TiviMate (8-10 = their level; hobby brand = 3-5). Taken as given: the owner kept the pink-to-violet icon tile. I do not score the corner-hue distance to Twitch; I only checked whether the tile as a whole is recognisable as Twitch (it is not: a chalk wedge with stepped bands on a diagonal gradient, no speech-bubble glyph).

What I did: viewed `board.png`, `tests/word-refine.png`, `assets/banner@2x.png`, `assets/icon-1024.png`, `context.png`, `launch.png`; rendered the lockup at 80 / 40 / 28 / 20 px and blurred, the micro mark at 24 / 20 / 16 px, both banners at 320 and 160 px and in blurred greyscale, the adaptive foreground in a circle mask, and the small icon at 48 / 32 px; sampled the banner's background under the lockup against chalk; checked `tokens.css` and the HTML for leftover glow. Not seen on the Philips; panel-dependent points say "suspected". The launch is stills only.

## Scores

| Area | v5.2 | v5.3 | **v5.4** | Verdict |
|---|---|---|---|---|
| Mark | 6.0 | 6.5 | **6.5** | Unchanged: a clean stepped-trail wedge that survives 24 px. Still a right-pointing play shape, ownable by its stair. Now has a micro tier. |
| Lockup and wordmark | 7.0 | 6.0 | **6.5** | Chalk "air" + gradient "glow" fixes the "ai" cluster and ties the name to the colour. The wedge-as-i-dot is a nice idea at 80 px and clutter at 28 px, and it puts two play wedges in one lockup. |
| Colour | 8.0 | 8.0 | **8.0** | Unchanged and still the strongest area. Glow removal is complete in tokens and sprites (only `grain.png` remains). |
| Icon and TV banner | 7.0 | 6.5 | **7.5** | The icon and banner are now one family: same ramp, chalk wedge, chalk-tint bands, chalk wordmark. Chalk on the banner field measures 3.65 to 6.45:1 along the lockup. Both banners and the adaptive foreground read cleanly in my renders. |
| Small-size / across-the-room legibility | 7.0 | 7.0 | **7.0** | Three tiers (3 bands / 2 bands / plain wedge) is the right ladder. The lockup holds at 40 px; the i-dot wedge and gradient "glow" get fussy at 28 px and below. |
| Fit to product | 7.5 | 7.0 | **7.5** | The story line ("a signal travels through the air and leaves a lit afterimage") makes the name and mark agree, and the glow is genuinely gone. |
| Soft + Sharp split | 7.5 | 7.5 | **7.5** | Unchanged: one live angle, one soft angle, explicit never-slant list. Still unproven on dense NBA data screens. |
| **Overall** | 7.5 | 7.0 | **7.5 / 10** | A coherent, buildable, rule-bound brand with no remaining "cheap" tells. The next step up needs a decision about the i-dot and a real-TV check, not more rounds on the mark. |

## Their changes, judged on the evidence

- **Icon and banner as one family: good, verified.** `banner@2x.png` is the tile's ramp with the same chalk wedge and bands. Background behind the lockup against chalk: 6.45:1 at the left end falling to 3.65:1 at the right end. That passes the 3:1 large-text bar everywhere and the doc's "at least 3.5:1" claim, but the right half of "glow" is the weak part, and under a Vivid picture mode I would expect it to drop. Suspected.
- **Dark banner as the alternative: fine.** `banner-dark.png` keeps the full-colour lockup on the canvas. On a launcher row of dark tiles this is the one that disappears; the gradient is the correct primary.
- **W3 (i-dot is the mark's wedge): half right.** At 80 px (`word-refine.png`, my render) it is charming and unmistakably ties the name to the mark. At 40 px it still reads. At 28 and 20 px it is a 2 to 4 px pink tick above the "i", which looks like an accent mark or a stray pixel, and on the banner it is chalk, so it loses the colour link. A single lockup now has two wedges: the mark and the dot. That is repetition rather than one idea, and the doc's own rule says mark and lockup never share a screen, because the lockup contains the mark, so the dot's job is to echo something that is already beside it.
- **Wordmark W2 tracking -2%: agree.** The "i" stands apart and "air" and "glow" are two units.
- **Glow removed everywhere: verified.** `sprites/` holds only `grain.png`; `tokens.css` has no glow tokens; the focus state in `components.html` is the 3 px ring plus scale. `context.png` background is flat (no violet blob). The launch text says "no glow", and the stills agree.
- **`mark-micro.svg`: works.** Plain wedge at 24, 20 and 16 px is clean. At 24 px I would still choose the two-band `mark-small`, as the doc already states.
- **Adaptive foreground shrunk to .625: correct.** In the circle mask the full mark sits inside the visible disc with margin. The back band is faint on the violet, which is acceptable because it is decoration.

## What is good

- No filter, blur, glow or raster in the logo set; one radius family; solid tucked bands; story line that actually describes the drawing.
- The icon works: chalk wedge at 3.3 to 4.6:1 on the tile near the wedge, bands as deliberate chalk tints, readable at 48 and 32 px (my render of `icon-small.svg`).
- Component set is complete and disciplined (selected vs focused, fields, toggles, dialogs, error and empty states, native player sheet), and the focus ring is the only focus cue.
- Honest doc: tests, rejected variants and untested items (real posters, panel behaviour, launch animation) are listed.

## Remaining problems, ranked, with fixes

### 1. The i-dot wedge: great at poster size, clutter at lockup sizes
Fix (pick one):
- (a) Keep W3 for large uses only (splash, About, store art; 40 px lockup height and up), and make a **plain-dot lockup (W2)** the rule below 40 px and for the banner. Add it as `lockup-compact.svg`.
- (b) Or keep one i-dot everywhere but enlarge it: height 1.35 x the stem width, rounded to the wedge radius, and keep it chalk on the banner. Re-render at 28 and 20 px.
- Either way, delete the claim that the lockup is "the mark plus a custom i" unless (b) is chosen; the dot should repeat the mark only where it can be seen.

### 2. Gradient "glow" text on the canvas is only large-text safe at the orchid end
`#F95BAC` to `#D540F5` on the canvas is 6.2 to 5.3:1 (verified, fine), but on `bg-1` and surface cards it drops to 4.7 to 3.9:1, and the blurred render at 28 px loses the "g". Rule needed: the gradient wordmark appears only on bg-0 (canvas, splash, About). On cards, dialogs and any surface, use the all-chalk lockup. Add that to the "rules at a glance".

### 3. Gradient banner loudness and right-edge chalk contrast (suspected)
The banner is the right primary, but it is the loudest asset and its right half has the lowest chalk contrast (3.65:1). Fix: deepen the right end of the banner's field by about 6% lightness (`#C23DF2` instead of the current orchid-pink end at x about 540) so the lockup stays at 4.5:1 or better, and test both banners on the TV in Standard and Vivid. If Vivid pushes the field to neon, drop to `banner-dark`.

### 4. Name risk and story are still two separate things
The story line is good. The name "airglow" still starts with "ai" and the gradient word helps, but not completely. This is a name decision, not a design fix, and I would stop spending design effort on it. Record it in the doc as accepted.

### 5. Housekeeping
- The "i-dot is the mark's wedge" uses the micro wedge at about 2 px in the 20 px lockup: below your own 24 px tier. Another reason for problem 1(a).
- Real posters over the canvas, the panel's surface steps, the Sharp dialect on dense NBA tables: unchanged open items. These need the real TV and the UI pass, not more brand rounds.

## What would take it to 8+

1. Settle the i-dot with one of the rules in problem 1, and add the on-canvas-only rule for the gradient wordmark (problem 2).
2. Raise the banner's right-edge contrast and check both banners on the Philips (problem 3).
3. Put the brand into one real screen (the UI pass) and judge it with real posters.

The mark and the tokens are done. Further rounds on the logo will mostly relocate taste, not improve craft.
