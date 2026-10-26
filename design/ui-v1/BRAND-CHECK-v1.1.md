# Brand check: UI v1.1

Checked against `design/brand-v5/v5.4/`. Viewed: `tv-home`, `tv-home-shield`, `tv-nba`, `tv-nba-game`, `tv-update`, `launch-1100` (full size); read UI-SPEC "v1.1 changes", 3.4, 3.5; computed every team plate and accent in `kit/data.js` against the brand palette (`tools/color.js`). Not seen: real hardware; the preview video is a still stand-in.

## Verdicts

| Item | Verdict |
|---|---|
| Launch CSS namespaced `.l-*` | **Done.** `launch.css` uses `.l-*`/`#l-*`; `png/launch-1100.png` is byte-identical to `png/tv-home.png` (cmp), so the top-bar mark and the hero slab now render correctly |
| `lockup-chalk.svg` on the update card | **Done** (`tv-update.png`: all-chalk lockup, bands in chalk tints, wedge i-dot at 48 px) |
| Team-colour rule (spec 3.4) | **Approve with modifications** (below) |
| Slab always carries content (spec 3.5) | **Approve with modifications** (below) |

## 1. Team identity (3.4): approve with modifications

What is right: crest inside the neutral disc (logos never recoloured); flat dark plate (all 14 plates pass chalk 10:1 or better and sit 44 to 51 dE from the LIVE red); plate text and tables upright; the accent confined to a 4 px bar; nothing on a button, ring, selected state or LIVE pill; no gradients or glow. It reads as real NBA identity without touching the Soft system.

What must change:

**M1. Three accents break the spec's own "non-red, never near LIVE" rule and one breaks the action-colour rule.** From `kit/data.js` (OKLCH hue, dE from the LIVE red `#FF4B4B`):
- NY `#F58426` orange: h54, dE 12 from LIVE. Not on the spec's red-family list, but it is the closest accent to LIVE of all.
- MIA `#F9A01B` amber-orange: h69, dE 18. The spec lists MIA as red-family and "moves" it to this, but it is still orange.
- PHX `#8E7ED8` lilac: h290, dE 17 from orchid and 19 from pink. Pink and orchid are the only action colours; a lilac bar is a ghost of the brand gradient.
- Fix in `kit/data.js`: NY `a: '#A7A9AC'` (silver), MIA `a: '#FDBB30'` (gold, h81, same as CLE and IND), PHX `a: '#C4CED4'` (silver). Then the rule below holds for all 14 teams.

**M2. Gold and yellow accents need an explicit exception, because BRAND says "nothing amber or yellow".** Nine of 14 accents are gold, yellow or cream (GS, LAL, DEN, CLE, IND, BOS, MIL and the two above). The rule exists so yellow never means rating or warning; team gold in a 4 px bar does not conflict with that, but it must be written down or the brand rule is false. Approved as: yellow and gold are allowed **only as team data**, as a bar of 4 px or less (plate underline, game-card edge) or inside a crest; never as text, a larger fill, a ring, a button, a selected state, a progress bar or an icon.

**S1. Distance to the LIVE pill.** The spec says never within 16 px; `tv-nba.png` has the gold LAL edge 6 CSS px below the LIVE pill (12 device px), and the Home hero plate is 10 CSS px under the pill. The 16 px figure is not met, and cannot be for a card's own edge. Modified rule: **at least 8 CSS px between an accent bar and a LIVE pill, and an accent never forms or touches a focus ring** (a card's own ring may surround a card that has an edge). Fix: add 2 CSS px between the status row and the first team row in game cards that carry a LIVE pill. (Once M1 is fixed no accent is red or orange, so the 8 px is clearance, not colour confusion.)

**N1.** Stand-in crests overflow their discs in places: "MEM" at 40 px in the game header (`tv-nba-game.png`), "LAL", "PHX", "DEN" at 32 px in game cards (`tv-nba.png`) touch the ring. The text is a stand-in for real logos, but 12 px caps for three letters needs a 36 px disc, or two-letter marks.

**N2.** Hero and game-header plates are 1.0 to 1.2:1 against the surface they sit on (a navy plate on surface-1). They read by hue, not luminance. Fine as decoration; do not rely on a plate edge to show focus or selection (they do not).

### Rule to adopt (written into BRAND.md)

> **Team identity (NBA and live screens only).** Real logos sit in the neutral disc (surface-3), never recoloured. A flat dark team plate (OKLCH L at most .30, chalk at least 7:1) with a 4 px accent bar. Accent hue is not red, orange or amber-orange (OKLCH hue 10 to 75 with chroma above .06) and not violet, orchid or pink (hue 285 to 360 with chroma above .06). Gold and yellow are allowed only as that bar or inside a crest. At least 8 CSS px from a LIVE pill; never on, or forming, a focus ring, button, selected state, text or progress.

## 2. The slab carries content (3.5): approve with modifications

What is right: the v1.0 slab was an empty pink block and the brightest object on Home. Giving it a job (preview, clock, tip time) fixes that, keeps the 12° angle and the pink to orchid gradient, and the shield variant (ink on gradient, Barlow italic clock, "Score hidden") is on brand and contrast-safe. The preview dims after 30 s and stops after 3 min, which is right for retention.

Modifications:
- **M3. The preview must not be a clipped or masked video.** The mock draws a slanted left edge on a video; on the real box the brief bans `mask-image` and anything that clips moving content (weak compositor, second decode, "video behind UI" risk). Build it as a **rectangular preview** with the slanted edge drawn on top by two static shapes: the 8 px pink-orchid slab edge and a `surface-1` wedge covering the video's left corner. No mask, no clip-path on the video. If the preview cannot hold frame rate on the target (open item 3 in the spec), the clock plate is the default: ship the clock plate as the default and the preview as a setting that the device test turns on.
- **S2. Size.** The slab is now 25.6% of the hero (443 of 1727 device px) against the rule "under 25%". Either trim 12 device px (6 CSS) or relax the rule to **at most 26% when it carries content** (written into BRAND.md). I chose the second; either is fine.
- **S3. Do not out-shout the primary button.** The moving preview at full brightness is now the second brightest thing after the focused button, and the full-pink shield slab (`tv-home-shield.png`) is the brightest object on the screen. Cap the preview to 75% luminance (a static `bg-0` overlay at 25%) and keep the first 1.5 s of the preview on its still frame so the eye settles on the focus ring first. The shield slab stays full colour (it is static, and it is the state the owner asked to be loud).
- **N3.** In the shield state the clock "03 7:29" duplicates "Q3 7:29" in the status row. Show one (keep the slab, drop it from the status row, or the reverse).
- **N4.** The italic condensed rule says "scores and titles of three words or fewer". The game clock and tip time are neither; approved as scores' siblings (BRAND.md updated to allow clock and tip time).

## Other findings in v1.1

None new that break a rule. The earlier must-fixes (M1 launch collisions, M2 update card) are confirmed; should-fixes S1 to S3 from the final check (wedge above letters, no lockup with the top-bar mark, hero text clear of the slab) are visible as done in `tv-home.png` and the launch frame. I did not re-check every PNG; the script-level checks (colours, shadows, rings) were not re-run on v1.1 and the designer's `tools/audit.js` report (0 findings on 70 pages) is taken as given.

## Open for the owner and the TV

Real posters (still procedural art), the preview's frame rate and decode cost on the box, and the loudness of the gradient banner remain the open risks.
