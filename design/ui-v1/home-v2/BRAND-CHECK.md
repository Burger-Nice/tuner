# Brand check: Home v2, v1.2

Checked against `design/brand-v5/v5.4/BRAND.md` (rules at a glance, the UI-phase additions and sign-offs), `tokens.css`,
`design/ui-v1/UI-SPEC.md` v1.2 (3 to 4, 5.2) and the earlier checks (`BRAND-CHECK-final.md`, `UX-CHECK-final.md`). A
self-check by this round's designer; the independent reviewer scores it. v1.1's check is superseded; its departures are
re-argued below where v1.2 changed them (D2 restated, D5 rebuilt, D7 and D8 new).

How I checked: the 26 mocks at full size; `node tools/audit.js` on all of them (0 findings: one ring, no overlap, no
clipping, nothing covered, safe area, contrast on every flat ground including the team fields and the ambient ground,
the ring read back from the pixels, no amber or yellow, red only on LIVE, 24 h clocks, SPOILER + RECORD + FANLINE +
CONSIST on every shield mock, LIVEBG from the rendered pixels around every LIVE pill, SEAM on the band, DATA on every
channel card, LINES and NOTRUNC on every card, and the Home checks); `--inject` plants a fault for every check and 528
fire. `home-v2.css` was read against the token list: every colour is a token, a flat scrim already in `ui.css`, or a
team or artwork colour used as data (argued below); the only `box-shadow` is the focus ring; no `filter`,
`backdrop-filter`, `mask` or `text-shadow`; radii 6 (the logo tile's inner), 8, 12, 16, the kit's small radius and
pill; fonts Outfit, Inter and Barlow Condensed in the brand's sizes (14 is the floor; 12 only on the LIVE, 4K and IS
badges).

## Verdict

**On brand, with the departures argued below, and two items for the real TV.** v1.2 fixes the one thing v1.1 got wrong
against the brand's own rule: team colour under a LIVE pill and under focus rings. The game billboard is now a **band**
with hard edges between two strips of canvas, so the pill and the rings never meet a team colour by construction, not
by a threshold. The rest of what it adds (the doors, `Where you were`, the shield as a visible mode, `New tonight`, the
late row) is made of kit parts: wide cards, labels, the eye-off, the ctxmenu, the ramp.

## Mock by mock

| Mock | What the brand sees | Notes |
|---|---|---|
| `home-live-hidden`, `home-live`, `home-behind`, `home-pre`, `home-pre-choose` | Game night as a band: the status row on solid bg-0 (LIVE as dot + word + outline on the canvas), two flat team fields with hard edges from y 116 to 222, the 12° split as the two teams' 4 px secondary edges (the allowed material), crests in the neutral disc (never recoloured), the score plate in bg-1 at 92 % with the 12° skew, the clock chip as the one gradient slab (ink text, Barlow for the clock and `VS`, 14 px caps caption), `GAME NIGHT` in pink-text, the fan line in chalk on the away field, the copy's label on the home field, the buttons on bg-0 below | The fields are the real primaries at 55 % over bg-1, darkened until chalk passes 4.5:1 (audit CONTRAST); the pixels around the pill are canvas (LIVEBG); nothing crosses the seam (SEAM). `2ND 4:12` in Barlow caps |
| `home-home-rockets`, `home-home-nuggets` | A red field (Houston) left of the split with the pill above it and the rings below it, on the canvas; a clashing navy opponent drawn neutral surface-1 with the gold and yellow edges telling the teams apart | The clash rule is the plate rule grown: the opponent loses its colour, your team never does |
| `home-morning`, `home-backlog` | `THE MORNING AFTER` eyebrow, `REPLAY · NO SPOILERS` / `3RD 6:41 · PAUSED` on the chip, the neutral `Score hidden` tile, partial records with the eye-off, the fan line without seed or streak and named by its game; the NBA tab wears the eye-off; no result word (SPOILER, RECORD, FANLINE, CONSIST) | The eye-off on a tab is the kit's icon at 13 px in a 20 px surface-2 disc, text-2: a status, not a badge, so no colour |
| `home-final-seen` | the score in Barlow 56 on the plate, `FINAL · W 112–104` on the chip, `YOUR TEAM` (no `GAME NIGHT` once it is over) | |
| `home-evening`, `home-late`, `home-upnext`, `home-offline`, `home-card-menu` | A Soft billboard: the backdrop under the three flat scrims, the ambient ground in the art's own colour (deep, flat), `GOOD EVENING ·` in pink-text, the title in Outfit 700 34, meta 15 with the `4K` badge and `Ends 21:03`, the `WHERE YOU WERE` label (14 px caps, text-2) with one line of body text, the gradient progress bar, one gradient button | The scrims are the detail page's shape (UI-SPEC 5.6) with the ambient colour as the left stop |
| `home-new-episode`, `home-new-season` | the show's name in caps as a stand-in for the Cinemeta logo (Outfit 700 36, tracking .08em, 56 px high at most); meta with the chalk star; `From Northlight` as the caption | The logo file replaces the text in the app; a third-party mark on the canvas, like a channel logo (BRAND 6) |
| `home-discover`, `home-first` | as evening, with a 2-line synopsis in body text-2 and `Details` as the primary (owner). The poster upright when there is no backdrop (never stretched, blurred or mirrored), the ground fading into the rows | |
| `home-browse` | the doors: wide cards with a 2 × 2 poster mosaic under the bottom scrim, Inter 650 16 label, 14 px count; the ring + lift on the focused door | Posters as data, the kit's wide card, no new colour |
| `home-scrolled`, `home-channels` | Posters radius 12 with captions below (sign-off 2), the dashed named-4K tag (Movies' rule), the [tv] mark, the ring + 1.05 lift; channel cards as the provider's logo in a 64 × 40 tile on surface-2 (the logo at its own colours, a third-party mark: BRAND 6) with the number on every card, or the two teams' colours with crests; the context line in caption size; a peeking row with art only | The logo tile is 64 × 40, surface-3, radius 8, the logo fitted inside |
| `home-m3u` | the next game in the band before its day: fields, `VS`, the tip time on the chip; no dead button | |
| `home-welcome` | the ramp (bg-1 to bg-0, grain), flat skeleton blocks, no ring (a progress screen) | |
| `home-live-entry` | three stills at 0.29 scale of the entry: transform and opacity only, the live wipe's easing | Optional; measured on the panel first |
| `home-rows-setting` | Account's two panes, 56 px rows, toggles with the word On, the grip from Saved's reorder | |

## The departures, argued

**D1 (kept). The hero is full-bleed, not a 864 × 192 card.** BRAND.md 9's "flat 2-stop gradient (bg-1 to bg-0)" is
the welcome billboard; UI-SPEC 3.3 lets art bleed; the detail page already puts art edge to edge.

**D2 (restated). The slab is the clock chip.** v1.1 said 112 × 72 and under 4 %; as drawn the chip is **64 high and
112 wide at least, growing with its caption to about 145 wide** (`2ND 4:12 / live · synced`), about 3.3 % of the
billboard. It keeps the signature (one gradient slab per live hero, parallel to the plates) at the size the brand's
components sheet draws it, and it stays the one gradient block on the screen beside the primary button.

**D3 (kept). Wide cards carry their text at the bottom over a scrim; a peeking row shows art only.** The review was
right that a peek's status line sat outside the safe area; v1.2 hides every text in a peek and keeps the crests, edges,
tiles and whole badges, so the row still reads as "more below" and nothing is sliced or outside the safe area.

**D4 (done). The card label is 14 px**, the brand's label size; only `4K`, `IS` and LIVE stay 12 px badges.

**D5 (rebuilt). Team colour as the game billboard's band.** BRAND v5.4 UI-phase rule 1 allows the real primary on "the
plate field, 4 px accent bar, game-card row edge" and says team colour is "data, not UI colour: never on buttons, rings,
tabs, selected states, progress or other chrome, and never as a gradient or glow". v1.1's fields faded under two scrims,
which made them gradients, and let the pill and the rings sit on them. v1.2's band is the plate grown to billboard
width: **flat, hard-edged, between two strips of canvas**. The status row (with LIVE) is on bg-0 above it and the
buttons (with their rings) on bg-0 below it, so the rule holds by construction; the audit reads the pixels around every
LIVE pill (LIVEBG) and the ring data from the screenshot. The split is the two teams' 4 px secondary edges, which the
rule names. The clash rule (SPEC 3.2) keeps the band legible against the 14 blue opponents without inventing a colour:
the opponent goes neutral surface-1. The open question for the panel is the strength (SPEC 14, "open for the real TV").

**D6 (kept, optional). The artwork's colour as the title billboard's ground.** A flat 2-stop gradient whose first stop is
the artwork's dominant colour, darkened to L 24 %; a third party's colour used as data, never on chrome, never a glow
(no blur, no radial). Computed in JS from a 32 px copy, bg-1 without CORS. If the panel shows banding, `grain.png` goes
over it as on the band.

**D7 (new). The eye-off on the NBA tab.** The tab row is chrome, and chrome carries no badges but the compact LIVE pill
(UI-SPEC 3). The eye-off is the shield's own icon, already on plates, records and cards, shown as a status at 13 px in a
20 px surface-2 disc, text-2, never pink, never red: it says "a result is being kept from you" in the place he would look for
it. One icon on one tab, only while a result is hidden.

**D8 (new). Third-party logos in the channel tile.** A provider's `stream_icon` at its own colours on a surface-3 tile,
as the channel list in Live already does with the two-letter tile. BRAND 6 allows third-party marks as data; the tile
keeps them off the canvas and inside the card, 12 px from its edge.

**Kept from the brand without change:** the mark alone in the bar, tabs with the gradient underline, the avatar on the
gradient, `.btn` ink on gradient and `.btn2` outlined, the compact LIVE pill on the NBA tab only (and dropped while
Home's billboard is live), the focus ring token, selected ≠ focused, red only for LIVE, nothing amber or yellow (the
Jazz's, Nuggets' and Lakers' secondary colours appear only in crests and the 4 px edges, as nba-pages allows), errors
neutral, no loop but the launch hold, Barlow only for scores, clocks and three-word live titles (`VS`, `ON NOW`,
`REPLAY`, `FINAL`, `49 MIN`, `END`).

## Nits
- The storyboard page uses 0.29-scale copies of the billboard, so its text is under 14 px by design; the audit skips
  `.sb-shot`.
- The door's mosaic shows four posters at 98 × 54 each (a 2 px gap), cropped from 2:3; the brand bans stretching and
  mirroring, not cropping, and a cropped poster is what every wide card already is.

## Open for the real TV
- **The band and the ambient ground on the OLED in Standard and Vivid.** Both are flat tints; check banding (grain is
  already on the band) and whether 55 % is too much next to the pink primary. Real crests (ESPN 500 px) on the fields.
- **Real backdrops and real channel logos** (UI-SPEC open items 1 and 10 still stand): send 12 Cinemeta / TMDB backdrops
  and the provider's `stream_icon` set through `tools/build.js` and re-run CONTRAST and COVERED.
