# Tuner v4: three hybrids (short)

See `directions.png` (all three side by side) and `<variant>-tv.png` (1080p home mock). Names and clash checks: `NAMES.md`.

## What was absorbed

The owner's reactions were treated as taste signals, not a checklist:
- **airtime** → the gradient and glow, the play button in the mark, a friendly lowercase option, and the name's "air" feel.
- **SLATE** → the colours: ink `#0C0B12`, chalk `#F3EFE6`, neon orchid `#E04BFF`. The gradient is built from them, extended with pink `#FF5CB8` and deep violet `#5B2BD9` (the teal and periwinkle of airtime sat near the streaming default and near Paramount+). The name SLATE is retired (his other project).
- **TIPOFF** → the slant, used as motion and layout (wipes, a skewed hero edge, skewed tiles, an italic play wedge), without the lime or the sports-only voice.
- All three keep one live game up front and shows and movies beneath, so the same chrome serves a film night.

Rules held in all three: red only for LIVE (the same `#FF4B4B` pill); no amber or yellow (all accents are 9+ ΔE from IMDb, Plex and the other tiles in the launcher check, except where flagged); the rail carries the mark and the lockup never shares that screen.

## The variants

| | **A · Echo · airglow** | **B · Streak · FLARE** | **C · Premiere · SKYLIT** |
|---|---|---|---|
| Mark | soft play triangle with two colour echoes trailing left | slanted chalk play wedge, orchid motion bar, light streak through it | chalk play triangle with a projector cone of light |
| Gradient | most (tile, mark, buttons, hero) | streak and wedge only | beam only |
| Slant | light (8° hero edge) | strong (10–14° everywhere) | medium (24° beam) |
| Icon | gradient tile, chalk triangle | solid orchid tile, ink wedge, chalk streak | chalk tile, ink triangle, orchid beam |
| Type | Outfit lowercase | Barlow Condensed italic caps | Playfair Black caps |
| Launch | echoes stretch into a gradient flood | camera-flash streak, wedge wipe | searchlight sweeps up, letters lit one by one |

Per-variant strengths, risks, icon-size and across-the-room notes, the launcher-row check against IMDb, Plex, Netflix, Prime, Hulu, Twitch and Paramount+ colours, and the icon-size strip are on the board under each card.

## My honest pick: B · FLARE

- It is the only one with **one gesture you can describe in a sentence** ("a lens streak slicing a slanted play wedge"); A is a play button with a trail, C a play button with a beam, and both can read as a media-player skip glyph.
- It carries the most of what he said he loved: TIPOFF's slant and punch, airtime's play affordance and glow (the streak glows, the pink-to-orchid wedge is the gradient), SLATE's colours, and a short name with the same energy as TIPOFF.
- The streak is both cinema (anamorphic flare) and sport (flash, flare), so it does not read as sports-only.
- Its icon is the strongest of the three in the launcher row and survives 24 px.
- Honest costs: it is the loudest; italic caps lean sporty on a quiet movie night; the orchid tile may be glaring in a dark room (unverified on the real TV); the name needs a Play Store/App Store look-up (FlareFlow, Flare MeTV).

**If airtime's gradient and name matter most, A · airglow** is the safer and friendlier choice, and its colour-echo animation is the nicest launch. **C · SKYLIT** is the right one if the app should feel like a cinema first. A good next step would be FLARE's mark and slant with airglow's gradient glow in the motion and hero, but that is a pick-then-polish step.

## What this is not

Concept renders: no tokens, no system, no final SVG clean-up, launch animations described not built, nothing seen on the real Philips. Brand colour values (IMDb, Plex, Twitch, etc.) are reported, not official.

## Rebuild

`tools/`: `make-wordmarks.js` (one-off, outlines the wordmarks from the @fontsource files into `wordmarks.json`), `assets.js` + `write-assets.js` (mark, lockup, icon, banner), `mock.js` (TV home pages), `board.js` (directions.html), `render.js` (Playwright), `color.js` (ΔE). Fonts (SIL OFL, in `fonts/`): Outfit, Barlow Condensed, Playfair Display, Inter.
`node tools/write-assets.js && node tools/mock.js && node tools/board.js`, then `node tools/render.js <page>.html <png> w h`.
