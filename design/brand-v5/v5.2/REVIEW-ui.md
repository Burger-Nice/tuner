# airglow v5.2: independent review #3 (UI/TV designer)

Scope: branding and component language (identity, tokens, components, native player theme). Screen layouts are a later pass and not marked down. Judged against Netflix, Plex, Apple TV, YouTube TV, Disney+, Peacock, ESPN/DAZN, TiviMate (8-10 = their level; hobby brand = 3-5).

What I did: viewed `board.png`, `components.png`, `context.png`, `launch.png`, `assets/icon-1024.png`, `assets/banner@2x.png`, `tests/mark-tests3.png`, `tests/canvas-test.png`; read `mark.svg`, `mark-small.svg`, `tokens.css`; recomputed every contrast ratio the doc claims; measured the icon's mass centre and the banner's gradient steps from the PNGs. Not seen on the Philips; panel-dependent points say "suspected". The launch is stills only.

## Scores

| Area | v5 | v5.1 | **v5.2** | Verdict |
|---|---|---|---|---|
| Mark | 5.5 | 5.5 | **6.0** | First version with a gesture of its own: a long soft-nosed wedge lit from a hot core to the apex. Ownable by proportion and light. But the light is gone from the small mark and from both launcher assets. |
| Lockup and wordmark | 6.0 | 6.5 | **7.0** | Gap 12 to 8 fixes the "air glow" two-word read; weight and tone split stays. Outfit is still a stock face, but the two-weight setting is now a recognisable shape. |
| Colour | 6.5 | 7.5 | **8.0** | Every ratio I recomputed matches. Surfaces lifted (1.35 / 1.71 / 2.26 vs canvas), `border-strong` fixed, chroma pulled back, strict roles. One real error: the canvas has a 16/255 channel (problem 2). |
| Icon and TV banner | 6.5 | 7.0 | **7.0** | Banner is now the icon's sibling, which fixes the Twitch adjacency. Both are flat ink on gradient: bold and legible, but they carry none of the brand's light idea, and the icon is optically off-centre. |
| Small-size / across-the-room legibility | 6.5 | 7.0 | **7.0** | Ink icon survives 24 px and blur; chalk wordmark 16:1. Below 40 px the mark is just the wedge, and some native text is 12 px against the brand's own 13 px floor. |
| Fit to product | 7.5 | 7.5 | **7.5** | Unchanged and good: "light coming out of a play shape" suits a night-time TV app. |
| Soft + Sharp split | 5.0 | 7.0 | **7.5** | One live angle (12°) and one soft angle (8°), parallel plates, explicit never-slant list, and a native player sheet in the same language. Still unproven on dense NBA data screens, which is a UI-pass question. |
| **Overall** | 6.5 | 7.0 | **7.5 / 10** | A coherent, rule-bound, buildable brand with an actual idea. The remaining work is making the idea show up where people see it first (launcher, small sizes) and fixing the details below. |

## Their pushbacks, judged on the evidence

- **P8 over my options (a) and (b): the evidence supports them.** `tests/mark-tests3.png` shows (a) P2 is still a shadow at 48 px, (b) P3 is clean but blunt, and the lit core (P4/P8/P9) is the only variant that still shows a cue at 24 px and blurred. My suggestions were worth testing and lost.
- **Dropping the echo and its promise from the doc: correct.** The doc no longer claims what the mark cannot show.
- **Apex radius 14 to 11 ("guitar pick"):** agree. At 11 the wedge is still on the edge of a bullet or guitar-pick shape in the icon; I would not go rounder.
- **Canvas C .032 to .019:** a reasonable call, but the evidence is weaker than the doc says. In `canvas-test.png` the .032, .019 and neutral rows are nearly indistinguishable on the six synthetic posters, so the test neither proves the tint hurts art nor that it is harmless. Keep .019 on risk grounds; verify on three real posters.
- **Native player theme, selected vs focused, fields, toggles, dialogs, error/empty states:** all delivered and consistent with the tokens. This closes my biggest system gap from review #2.
- **Surfaces lifted instead of canvas:** correct direction for weak-black panels, with the cost that the canvas itself became too dark (problem 2).

Verified: text-1 on bg-0 16.43:1, text-3 on surface-3 4.91:1, pink-text on surface-3 5.06:1, orchid on surface-2 3.08:1, violet-ui on surface-2 3.57:1, border-strong 5.8 / 4.28 / 3.38:1 on bg-0 / surface-1 / surface-2, ink on pink 6.34:1, ink on orchid 5.23:1, live-text on surface-2 5.01:1.

## What is good

- A real concept now: "light coming out of a play shape, travelling to the apex". The hot core on the launch frame (`launch.png` frame 2) is the best brand moment in the package.
- Component discipline: selected is a persistent fill plus shape, focused is the white ring only, and the doc says "never the same look". Toggle shows the word On/Off. Errors are neutral with icon and sentence.
- The native player sheet specifies dp values, row heights, tints, subtitle size and edge, and a stats panel opened from Options. That is where the owner actually watches, and it was blank before.
- Performance rules are specific (sprites, transform/opacity only, 99 KB fonts) and the contrast script fails the build on a miss.
- Honest limits: real posters, glow frame rate and the launch animation are listed as untested.

## Remaining problems, ranked, with fixes

### 1. The light idea shows up only in-app; the launcher presence and small mark are flat
Evidence: the full mark has a lit core and a glow disc (`mark.svg`). `mark-small.svg` (below 40 px) is a plain wedge with a linear gradient, `icon-1024.png` is a flat ink wedge on the tile, and the banner is a flat ink lockup. The doc and board say the core "survives 24 px and blur", which is true of the P8 test row but not of the small mark that actually ships for 24 px. So the Google TV home screen, the one place the brand is seen first, shows a generic pink play tile. The proportion (8% longer, apex r11) is the only ownable cue left there, and it is subtle.

Fix:
- **Icon and banner: put the light behind the wedge.** A radial bloom centred on the wedge's base, `#FFC2E1` at about 55% opacity fading to 0 at 45% of the tile width, painted under the ink wedge. Ink on a lighter bloom raises contrast (above 6.3:1), so it is safe, and it shows "lit from inside" without any filter. Keep a no-bloom flat version for adaptive foreground layers if the PNG layer cannot hold it.
- **Small mark: ship the core.** Your own 24 px render in `mark-tests3.png` shows it works. Add one radial stop (`#FFD3EA` at the base, 35% radius) to `mark-small.svg` and let "no core" apply only below 20 px.
- Or delete the "survives 24 px" line from the board and say plainly that below 40 px the identity is the proportion and colour.

### 2. The canvas is `#121019`: its green channel is 16/255
BRAND.md says "no channel under 18/255", and "the canvas stays at 18/255 so weak-black panels do not crush". bg-0 is R18, G16, B25: the green channel sits exactly at video black (16), which is the limited-range clipping case the brand's own v2.1 notes warned about. Fix: lift the canvas to `#15131D` (R21, G19, B29, same hue and chroma family) and update the splash, window background, scrim `rgba(21,19,29,.72)` and the contrast tables; re-run `tools/contrast.js`. Steps against the canvas will shrink slightly (about 1.3 / 1.65 / 2.2:1), which is fine; keep the 1 px border on cards.

### 3. An error field looks like a focused field
In `components.png`, the focused field has a 3 px white ring with a gap and the error field has a 2 px chalk outline: two white outlines on a dark field, at TV distance. Your own rule is "exactly one ring per screen", and an error field would read as a second focus. Fix: errors never use a white outline. Use a 2 px dashed outline in `text-2` (#D2CEE2), a filled `surface-2` background, an outline-icon disc inside the field at the right, and the sentence in `text-1` (not `text-2`) below. The focus ring remains the only white solid line in the UI.

### 4. Native text under the brand's own 13 px floor
Section 10 specifies the stats panel at 12/18 and key caps at 12/16, while rule 7 says "nothing under 13 px on TV". On a 960 × 540 dp screen that is 24 px at 1080p, and tvOS-style minimums are about 23 to 24 pt, so it is borderline rather than wrong; the problem is the contradiction. Fix: stats panel 13/18 and key caps 13/16, and widen the panel from 230 to 250 dp to keep the columns; or state the exception explicitly ("stats panel only, tabular, 12/18").

### 5. The icon is optically left-heavy
I measured the ink wedge's mass centre in `icon-1024.png` at x = 457 of 1024 (y = 511). The bounding box is centred, but a triangle's mass sits near its base, so the glyph looks shifted left by about 55 px (5%). Fix: move the wedge right by about 30 px (about 3%, so it does not look right-heavy), e.g. translate(+30, 0) in `icon-1024.svg` and `icon-foreground.svg`. Check on the 24 px render. For the adaptive foreground, keep the bbox inside the 66 dp safe circle after the shift.

### 6. Launcher loudness is unproven (suspected)
A flat 320 × 180 magenta-to-orchid field is the loudest banner in a dark room, and Vivid modes will lift it further. It stands out; it could also feel garish. The gradient is smooth (224 distinct steps across 640 px, no banding in my check). Fix: put the gradient banner and `banner-dark.svg` on the real TV in Standard and Vivid, and pick one. If the gradient is too hot, desaturate pink to `#F26BB4` and orchid to `#C84BE8` at the banner only.

### 7. Housekeeping
- The canvas test (problem above) is too subtle to count as evidence. Test three real posters, including a dark one and a skin-tone one, on the TV.
- "ai" at the start of a lowercase word is still an unresolved name risk; the weight split and gap mitigate it.
- LumenRadio AirGlow and the DoPchoice filing: unchanged, fine for personal use.
- Sharp on dense NBA data (box score, standings) remains for the UI pass; the may/never list is correct but untested on real tables.

## What would take it to 8.5+

1. Light in the launcher assets and the small mark (problem 1).
2. The canvas lift and the error-field fix (problems 2 and 3).
3. Optical centring of the icon (problem 5) and a panel check of banner loudness (problem 6).
4. A real-poster canvas test and a first look at the Sharp dialect on a real NBA screen.
