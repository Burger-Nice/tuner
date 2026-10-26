# airglow v5.3: independent review #4 (UI/TV designer)

Scope: branding and component language (identity, tokens, components, native player theme). Screen layouts are a later pass. Judged against Netflix, Plex, Apple TV, YouTube TV, Disney+, Peacock, ESPN/DAZN, TiviMate (8-10 = their level; hobby brand = 3-5). The owner's pick of the echo mark is a legitimate input; I am judging the craft and the risks of that choice, not overruling it.

What I did: viewed `board.png`, `tests/mark-refine.png`, `tests/icon-refine.png`, `owner-pick.png`, `assets/icon-1024.png`, `assets/banner@2x.png`, `assets/banner-gradient.png`, `launch.png`, `context.png`; read `mark.svg` and `mark-small.svg`; rendered the mark, small mark, icon and lockup myself at 96/48/32/24 px, blurred and greyscale-blurred, beside real skip, fast-forward and signal-bar glyphs; measured chalk contrast and the tile's colour distance to Twitch from `icon-1024.png`; measured the adaptive foreground's radius; recomputed the canvas and surface ratios. Not seen on the Philips; panel-dependent points say "suspected". The launch is stills only.

## Scores

| Area | v5.1 | v5.2 | **v5.3** | Verdict |
|---|---|---|---|---|
| Mark | 5.5 | 6.0 | **6.5** | Crisp, solid, no filters, and a silhouette you can describe ("a play wedge that leaves a stepped trail"). Reads at 24 px. The three weak points I raised (skip read, strips, 24 px) are mostly fixed. |
| Lockup and wordmark | 6.5 | 7.0 | **6.0** | Back to single-weight Outfit 700 "airglow". Clean and legible, but stock, and the "ai" reading is back. The lockup proportions (mark = ascender height) are good. |
| Colour | 7.5 | 8.0 | **8.0** | Unchanged and still the strongest area; canvas now `#15131D` (no channel under 19) and surfaces 1.32 / 1.67 / 2.20:1, which I verified. Dropping the glow removes the cheap look. |
| Icon and TV banner | 7.0 | 7.0 | **6.5** | Icon chalk contrast fixed (3.3 to 4.6:1 by my measure, was 2.1 to 2.8). But the tile is Twitch-adjacent, and the primary banner is a quiet dark lockup that is not the icon's sibling. |
| Small-size / across-the-room legibility | 6.5 | 7.0 | **7.0** | Two-band small mark and the chalk wedge hold at 24 px and blurred in my renders. |
| Fit to product | 7.5 | 7.5 | **7.0** | "Stepped trail" says motion and signal; the name says "glow", and there is now no glow anywhere. The brand needs one sentence that ties name and mark. |
| Soft + Sharp split | 7.0 | 7.5 | **7.5** | Unchanged: one live angle (12°), one soft angle (8°), clear never-slant list, native sheet in the same language. |
| **Overall** | 7.0 | 7.5 | **7.0 / 10** | A cleaner, more honest mark than v5.2 and a strong system around it. The overall dips only because the wordmark lost its shape, the icon tile drifted back toward Twitch, and the launcher assets are not a family. |

## The issues I raised before about this mark family

- **Fast-forward / skip read: mostly resolved.** I rendered the mark next to ⏭, ⏩ and a four-bar signal glyph (`/tmp` scratch, not in the repo). The bands sit on the left, step down away from the wedge, and are tucked behind it, so the mark does not read as ⏭ (bar on the right) or ⏩ (two equal triangles). R8 (equal bars) is a good control: that one does read as skip. Residual reading: **signal-strength bars plus play**, which is harmless and even apt for a TV tuner. It is not a defect, but expect people to say "bars".
- **The strips in the 1024 icon: fixed by design.** They are now three solid chalk tints (30 / 50 / 70% into the tile colour), rounded and stepped, so they read as a deliberate stair, not leftover smears. Outer band against the tile is only 1.66:1 (middle 2.35, inner 3.25), which is fine for decoration; at 48 px the outer band is faint and at 24 px only the inner two matter.
- **24 px: works.** `mark-small.svg` (two bands) shows wedge plus a stepped left edge; blurred and greyscale it still reads as a wedge with a trail. At 16 px the bands are sub-2 px: use the plain wedge there.
- **Chalk on the tile: fixed.** Measured from `icon-1024.png`: tile behind the wedge is 3.6 to 4.6:1 against chalk (3.3:1 in the pink top-right corner, 7.5:1 in the violet corner), versus 2.1 to 2.8:1 in v5. The doc's "at least 3.66 in a 14 px ring" matches what I see near the wedge.

## What is good

- No filter, glow, blur or raster anywhere in the logo; the same SVGs are legal Android vector sources and the owner's "cheap" complaint is addressed at the root.
- One radius family across wedge (apex 7.5, base 6) and bands (5.5). The tucked, stepped bands with top edges parallel to the wedge slope are well drawn.
- Optical centring in the icon is done by the average of bbox and mass centre; the foreground layer reaches 134 px from centre against a 132 px safe radius (the visible mask is 144), so it is at the edge, not clipped.
- The v5.2 quick fixes are in and verified: canvas `#15131D`, steps 1.32 / 1.67 / 2.20, error field dashed with an icon disc, native text at 13 px.
- Honest test sheets: `mark-refine.png` shows rejected variants (gaps, equal bars, no violet) with the reason.

## Problems, ranked, with fixes

### 1. The icon tile is back in Twitch territory
Measured: the tile's mean colour is dE 9.2 from Twitch purple #9146FF in OKLab (x100), and 7.0 at the two violet-orchid corners; the middle stop `#B83BEA` alone is 8.2. A purple tile with a white play shape, in a launcher row that contains Twitch, is a one-second confusion risk. v5.1 solved this with the warm pink-orchid tile; v5.3 brought violet back.

Fix: drop violet from the tile. Use a warm magenta ramp, for example `#D03BC0` (top-left, dE 15.7 from Twitch, chalk 3.61:1) to `#C0399A` (bottom-right, 18.2, 4.26:1), with the pink `#E2449E` only as a small highlight corner. Keep chalk wedge and chalk-tint bands, re-run the 14 px ring check (`tests/icon-refine.js`), and keep violet for the back band of the mark only.

### 2. Launcher assets are not a family
`icon-1024.png` is a violet-orchid-pink tile with a chalk wedge. `banner.png` (primary) is a dark canvas with a full-colour lockup. `banner-gradient.png` is a pink-orchid field with an ink lockup. The home screen shows the banner, not the icon, and the primary banner is the quietest thing in the package: a small mark on near-black, which will not "scream TV".

Fix: pick the gradient banner as primary, built from the same ramp as the fixed icon tile (problem 1), with the chalk wedge and chalk-tint bands (not ink) so the icon and banner read as one object. Keep the dark banner as the alternative. Test both on the TV in Standard and Vivid (suspected loudness risk).

### 3. Wordmark: single weight, stock face, "ai" read
Outfit 700 lowercase is a common geometric sans; with the two-weight split gone, "airglow" reads "ai-rglow" again and nothing in the type is ownable. The owner liked it as seen, so keep the face and add one ownable decision in colour, not effects:
- Set "glow" in the pink-to-orchid gradient (`#F95BAC` to `#D540F5`, 6.4 to 5.3:1 on the canvas) and "air" in chalk. That ties the name to the colour, breaks the "ai" cluster, and needs no blur or weight change.
- Or tighten tracking to -2% and nudge the a-i-r letter spacing so the i stands apart.
Render both at 14 px and across-the-room blur before choosing.

### 4. The brand's story and the leftover glow
The name is "airglow"; the mark is now a stepped trail with no glow. That is fine, but it needs one sentence ("air carries the signal; the stair is the afterimage") or the mismatch will be visible. Also, the system still carries the aesthetic the owner called cheap:
- `context.png` has a large soft violet atmosphere blob behind the Sharp card.
- BRAND.md keeps `sprites/glow-*.png` as an "optional" focus glow behind primary buttons.
Fix: delete the focus glow from `tokens.css` and the component sheet (the 3 px ring does the focus work at 18:1); replace the atmosphere blob with a flat `bg-1` panel or a very low-contrast 2-stop linear gradient. Then the "no glow anywhere" claim in `launch.png` is true across the system.

### 5. Small-mark rules need one more tier
`mark-small.svg` is for 40 px and below, with two bands. At 16 px (favicon, tray, notification) the bands are under 2 px and alias. Fix: add `mark-micro.svg` (plain gradient wedge, no bands) for under 24 px, and state it in the rules. The two-band icon (`icon-small.svg`) is fine at 24 to 48 px.

### 6. Housekeeping
- Banner/launch: the stepped bands "slide out" at 300 ms in the launch; fine, but prefer reduced-motion = static final mark.
- The adaptive foreground sits 2 px outside the 66 dp safe radius; shrink the foreground by 3% to be clean.
- "ai" name risk and the LumenRadio / DoPchoice overlaps are unchanged and acceptable for personal use.
- Real posters over the canvas and a panel check of the surface steps remain open (listed in the doc).

## What would take it to 8+

1. A Twitch-safe tile and a banner that is the icon's sibling (problems 1 and 2).
2. One ownable decision in the wordmark (problem 3).
3. Remove the leftover glow and add the micro mark (problems 4 and 5).
4. A real-poster canvas test and the Sharp dialect on a dense NBA screen, in the UI pass.
