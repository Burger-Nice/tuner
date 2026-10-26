# airglow (Soft, with Sharp for live): independent review (UI/TV designer)

Scope: the chosen direction as a concept (no tokens or full system yet): name, Soft mark, wordmark, palette, icon, banner, Home, detail, launch stills, and the Sharp language reserved for NBA/live. Judged against Netflix, Plex, Apple TV, YouTube TV, Disney+, Peacock, ESPN/DAZN, TiviMate (8-10 = their level; hobby brand = 3-5).

What I did: viewed `directions.png`, `soft-tv.png`, `soft-detail.png`, `soft-launch.png`, `sharp-tv.png`, `sharp-detail.png`, `soft/icon-1024.png`, `soft/banner@2x.png`, `tests/echo-tests.png`; read the Soft SVGs; sampled pixels from the PNGs and recomputed WCAG ratios; made my own 48 px and 24 px nearest-neighbour renders of the icon. I did not see it on the Philips; panel-dependent claims say "suspected". The launch is stills only, so I cannot judge the animation.

## Scores

| Area | Score | Verdict |
|---|---|---|
| Mark (Soft) | **5.5** | Reads instantly as "video", which is exactly what v2.x failed at. It is also the most generic symbol in media, and the idea that was supposed to make it yours (echoes) is the part that does not survive small sizes. |
| Lockup and wordmark | **6.0** | Clean, friendly, very legible (chalk on ink 17.1:1). Outfit Bold lowercase is a stock geometric sans; nothing in it is ownable, and lowercase "ai-" now reads as an AI brand. |
| Colour | **6.5** | Ink + chalk + orchid/pink is distinctive in a launcher row and says "entertainment". Execution gaps: violet fails as a UI colour, chalk-on-orchid is weak, surfaces nearly vanish, and orchid is close to the sRGB gamut edge. |
| Icon and TV banner | **6.5** | The best-looking assets here; the tile stands out among IMDb/Plex/Netflix/Prime/Hulu tiles. But the halo lowers the contrast of the one shape that must stay crisp, and the echoes read as bars. |
| Small-size and across-the-room legibility | **6.5** | Wordmark and triangle survive blur. Echoes and halo are gone by 48 px and mush at 24 px (my render). |
| Fit to product | **7.5** | Much closer to "TV, shows and movies" than v2.x. "airglow" is a good name for a dark-room TV app; the tone is premium, night-time, cinematic. Not sports-specific, which Sharp is meant to cover. |
| Soft + Sharp split | **5.0** | Good rule ("slant means live"), not yet proven. As specified it is two marks, two icons, two banners, two type systems and two shape languages; the hybrid screen the owner actually chose was never rendered. |
| **Overall** | **6.5 / 10** | Right mood, right category cues, polished renders. Not yet ownable, and the system needs rules before it can be built. |

## What is genuinely good

- The brand finally says "watching things". Any viewer sees a play button in a glow, in a colour nothing else on the Google TV row uses (`directions.png` launcher row).
- Chalk (#F3EFE6) on ink (#0C0B12) is 17.07:1 and warmer than pure white; kept off the bloom-prone pure-white trap.
- Red reserved for LIVE (#FF4B4B on ink, 5.93:1), separate from the pink brand colour. Good rule.
- The Home and detail mocks are the strongest part: big title, one dominant CTA, clear focus (white ring + dark gap + glow), progress bars on cards, restrained use of colour. Better composition than most hobby apps.
- The echo test sheet is honest work: they found and fixed the skip-button read.
- "Slant = live" is a real brand rule, and ESPN's fixed angle is a precedent.

## Problems, ranked, with fixes

### 1. The mark is a stock play triangle; the owner-chosen idea does not survive
Evidence: `soft/mark.svg` is a rounded triangle plus blurred copies (stdDeviation 1.4 and 6). In `icon-1024.png` the "echoes" show only as three faint vertical strips left of the triangle (each triangle is hidden behind the next), so the eye sees bars, not a trail: closer to a skip-back or equaliser glyph than to glow. At 48 px they are a soft shadow; at 24 px a smear (my render). The thing carrying "glow" is the halo, which is a blur, which Android vectors cannot do.

Fix (test, don't assume):
- Make the glow the shape, not a filter. Try a **glowing 16:9 screen**: a rounded rectangle (radius 12% of width) in the orchid-to-pink gradient with the play triangle knocked out in ink, and the glow as a *hard-edged* second, larger rounded rect at 25% opacity behind it. That says "TV in a dark room" (the name's idea) in one hard-edged vector, survives 24 px, needs no blur, and is not YouTube's rounded rectangle because of the gradient and the offset glow.
- Smaller variant: keep the triangle, but put the echoes **below and to the left as one hard-edged triangle at 30% alpha, offset (-10, +6)**, not three blurs. They tested equal hard echoes side by side as fast-forward; a single offset one is a shadow, not a skip, and survives small sizes. Render at 100/48/24 and blur before choosing.
- Keep `mark-small.svg` (halo plus one echo) only as a fallback; at 24 px it already looks like a blur smudge.

### 2. The icon's halo reduces contrast where it matters; chalk on orchid is weak
Measured on `icon-1024.png`: chalk triangle against the tile is 2.5 to 2.8:1 across most of the tile, and **2.1:1 right at the triangle tip**, where the halo brightens the background. Only the deep violet corner gives 5.5:1. Across the room the shape's edge is weaker than it looks in the 1024 render.

Fix:
- Cut the icon halo opacity from about 0.35 to 0.12 or drop it in the icon (keep it in the banner and splash).
- Darken the tile gradient so chalk is at least 4.5:1 everywhere: for example violet `#7A2FE0` (5.5:1) to orchid `#A22BDB` (4.7:1), with pink only as a small highlight, not the top-right corner (chalk on #F858C7 is 2.5:1).
- Or flip it: ink triangle on the bright gradient (6.2 to 7.0:1 on orchid/pink), which also separates from Twitch. Render both next to Twitch's tile.

### 3. Colour tokens need rules before build
- **Violet `#5B2BD9` is 2.6:1 on ink.** It cannot be a line, bar or text on the dark UI. In `soft-detail.png` the progress bars fade to violet and lose their end against the track. Use violet only as a gradient anchor under large fills; for UI strokes use `#8B5CF6` (4.63:1) or `#7C5CFF` (4.51:1).
- **Orchid `#E04BFF` is at the sRGB gamut edge** (suspected from its saturation, not computed). In a TV's Vivid mode and in local-dimming bloom it will glare. Before shipping, pull chroma down about 8 to 10% (for example `#D048F2`) and check on the Philips in Standard and Vivid.
- **Surfaces are nearly invisible:** rail 1.04:1, "Live now" tiles about 1.2:1, continue-watching cards 1.5:1 against ink. Lift cards to `#241F3A` (1.24:1) plus a 1 px border at 12% chalk.
- **Pink vs LIVE red** (dE 14): fine today; keep LIVE always outlined with the word LIVE, and never use pink for status.
- **Text on gradient buttons:** the "Watch live" ink label is 6.7:1 on pink but drops to 4.1:1 at the violet end and 3.1:1 beyond it. Keep the button gradient to pink to orchid only (no violet) so text stays at least 6:1.

### 4. The Soft + Sharp split is two brands unless you constrain it
As delivered: separate marks (blurred echoes vs three bars), icons, banners, wordmarks (Outfit vs Barlow Condensed ExtraBold Italic) and shape systems (rounded pills vs 14° parallelograms). The hybrid the owner chose (Soft everywhere, Sharp for NBA/live) is not rendered; `sharp-tv.png` is a whole Home in Sharp, which is the thing he did not pick.

Fix:
- **One identity.** Soft mark, lockup, icon, banner everywhere. Sharp's mark/icon/banner are retired.
- **Sharp is a UI dialect, not a second brand.** Allowed only on LIVE moments (LIVE hero, game rows, the NBA section): 14° wipes between states, skewed focus plate and chips, italic condensed for scores and short titles only (at most 3 words, never body or tables), same palette and the same red LIVE pill.
- **Not allowed:** skewing text, tables or box scores (the NBA section is data-dense; skew only the backing plate), or slanting the whole Live TV channel list (it includes news and kids). Define "live" as anything that carries the LIVE pill.
- **Cost control:** Outfit (display) + Inter (text) + Barlow Condensed 800 italic, subset to Latin and numerals, three weights total, under about 150 KB, or the old "slow" complaint returns. Consider dropping Outfit for body text entirely; its single-storey "a" is less legible than Inter at 26 px on dim sub-lines (suspected).
- **Render the hybrid before approving:** Soft Home with one Sharp LIVE hero, and the actual NBA screen in the Sharp dialect.

### 5. The wordmark: generic, and "ai" reads as AI
Outfit Bold lowercase is a common geometric sans. In 2026 a lowercase word starting "ai" also reads as an AI product at a glance. Fix: a two-weight wordmark, "air" at 500 (chalk at 75%) and "glow" at 700, which splits the word, clarifies the pronunciation and expresses glow. Optionally set the dot of the "i" as a small orchid triangle that doubles as the small-size mark; test at 14 px.

### 6. Effects cost and banding on a low-end TV (suspected)
Blurred halos, large soft gradients (soft hero, sharp slab) and glow shadows are the most expensive things in a WebView on a TV and are prone to banding on 8-bit panels. Fix: pre-render halos and the hero glow as small PNG/WebP sprites (not CSS blur or box-shadow spread), keep any gradient to two stops within the same hue family and under about 25% of the screen, and add 1 to 2% noise to large fills. Keep the launch under about 1.2 s (the real wait is cold start; the native splash should be the static mark, not the animation).

### 7. Housekeeping
- Name overlap: LumenRadio AirGlow is in the iOS App Store and there is a DoPchoice AIRGLOW trademark filing in film lighting. Fine for a personal app; use a distinct store title ("airglow TV") if it ever ships.
- Orchid tile next to Twitch's violet: separable by gradient and glyph, but not at a one-second glance. Another reason to try the ink triangle in fix 2.
- The giant translucent triangle backdrop in `soft-detail.png` is a placeholder for artwork; real posters will replace it, so judge the detail page again with real art.

## What would take it to 7.5+

1. A mark whose idea survives 24 px and blur (the glowing-screen test, fix 1).
2. A contrast-safe icon and tokens (fixes 2 and 3).
3. The Sharp dialect defined as a constrained UI language, with the hybrid rendered (fix 4).
4. A two-weight wordmark (fix 5).
Everything else is polish.
