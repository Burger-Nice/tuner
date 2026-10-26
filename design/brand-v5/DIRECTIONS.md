# airglow: Soft and Sharp (v5)

Name: **airglow** (see `NAMES.md`). Palette shared by both: ink `#0C0B12`, chalk `#F3EFE6`, neon orchid `#E04BFF`, extended with pink `#FF5CB8` and deep violet `#5B2BD9`. Red only for LIVE (`#FF4B4B`); no amber or yellow; the standalone mark and the lockup never share a screen (the rail carries the mark; the lockup is on the splash, banner and sign-in). See `directions.png` for both side by side.

| | **Soft** | **Sharp** |
|---|---|---|
| Idea | the glow trailing a play button | the same glow cut with a blade |
| Mark | rounded gradient play triangle, a blurred halo and three receding, fading echoes | skewed (−10°) gradient play wedge, three crisp parallelogram echo bars (shorter, fainter) |
| Wordmark | `airglow` Outfit Bold, lowercase | `airglow` Barlow Condensed ExtraBold Italic, lowercase (uppercase tested: it read as FLARE/TIPOFF) |
| Icon | gradient tile (violet → orchid → pink), chalk mark with glow | diagonal three-tone tile (violet / orchid / pink), chalk wedge and bars |
| Slant | light: 8° hero edge, wipes | strong: 14° wipes, skewed buttons, tiles, chips, hero slab |
| Launch | echoes stretch into a gradient streak, 2.0 s | slab wipes in and out at 14°, 1.5 s |

Files per variation (`soft/`, `sharp/`): `mark.svg`, `lockup.svg`, `icon-1024.svg/.png`, `icon-foreground.svg` + `icon-foreground-432.png` and `icon-background.svg` + `icon-background-432.png` (Android adaptive: 108 dp × 4), `banner.svg/.png/@2x.png`; Soft also has `mark-small.svg` (halo plus one echo, for 32 px and under). Mocks: `soft-tv.png`, `sharp-tv.png` (home), `soft-detail.png`, `sharp-detail.png` (series detail), launch stills `soft-launch.png`, `sharp-launch.png` (frames 1, 2, 3). Tests: `tests/echo-tests.png`, `tests/sharp-word.png`.

## The echo fix (the risk I flagged)

Tested 15 echo treatments (`tests/echo-tests.png`). What makes echoes read as ⏩ rather than glow: two or more **equal, hard-edged triangles side by side** (my v4 version, E0). What fixed it, in Soft:
- echoes **recede** (each 8% smaller, tucked behind the front one) instead of sitting beside it;
- they **fade hard** (about .55 → .32 → .16) and **blur** slightly, so they have no edge to count;
- a **halo** (blurred copy, 1.28×) sits behind them: that is what carries "glow";
- spacing is tight (9 units on a 48-unit triangle) so they overlap; outlines (E3), rings (E8) and a single smear (E5) were rejected for reading as stacked layers, ripple, or generic speed.
Below 32 px it drops to halo + one echo (`mark-small.svg`). In Sharp the echoes are **bars, not triangles**, so the skip-button read cannot happen.

## Honest pick: Soft, with Sharp's slant kept for LIVE

- **Soft is the better brand.** The idea ("glow trailing play") is its own and is the one he said he loved; it keeps movies and shows calm and premium while the live game still gets its energy from the content and the red LIVE pill; it has the best launch animation; its icon is a refined gradient tile that reads at 24 px.
- **Sharp is the better sports app.** More energy, crisper on a TV, and the slant he loved; but its mark is "play plus speed bars", the least ownable part of either variation; the lowercase italic is a compromise; the busy diagonal tile is the loudest in a launcher row; and it pulls the whole app toward sport, which is exactly the "too sports" worry he had about TIPOFF.
- **Technical risks of Soft, and the mitigations:** blur filters do not survive Android VectorDrawable, so ship the PNG adaptive layers (`icon-foreground-432.png`, `icon-background-432.png`); soft glows and gradients on a dark LCD can band and bloom, so keep halos subtle in the UI and let the crisp chalk triangle carry the icon (done); glow mushes at 24 px, hence `mark-small.svg`.
- **Suggested system:** Soft everywhere, and use Sharp's 14° slab wipe and skewed treatment **only for live moments** (game start, the LIVE hero, a "live now" row). Slant then means *live*, which also gives the brand a rule. If he prefers one variation outright, pick Soft for a premium streaming feel or Sharp for a sports-night feel.

## What this is not

Concept renders: no tokens or full system; launch animations are stills and descriptions, not built; nothing seen on the real Philips; brand colour values in the launcher row (IMDb, Plex, etc.) are reported, not official. Distance from known brand colours: orchid 14.8 from Twitch, pink 14.1 from the LIVE red, deep violet 9.0 from Disney+ (12.5 from Twitch).

## Rebuild

`tools/` (copied from v4): `make-wordmarks.js` (one-off; needs opentype.js and the @fontsource woff files), `assets.js` + `write-assets.js` (SVGs), `export-png.sh` (PNG layers), `mock.js` (home and detail pages), `storyboard.js` (launch stills), `board.js` (directions.html), `render.js`, `color.js`. `tests/`: `echo-tests.js`, `sharp-word.js`. Fonts (SIL OFL, `fonts/`): Outfit, Barlow Condensed, Inter.
`node tools/write-assets.js && sh tools/export-png.sh && node tools/mock.js && node tools/storyboard.js && node tools/board.js`, then render the pages with `node tools/render.js <page>.html <png> w h`.
