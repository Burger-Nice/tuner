# Brand check: Home v2, v1.1

Checked against `design/brand-v5/v5.4/BRAND.md` (rules at a glance, the UI-phase additions and sign-offs), `tokens.css`,
`design/ui-v1/UI-SPEC.md` v1.2 (3 to 4, 5.2) and the earlier checks (`BRAND-CHECK-final.md`, `UX-CHECK-final.md`). A
self-check by this round's designer; the independent reviewer scores it. v1.0's check is superseded; its four departures
are re-argued below where v1.1 changed them.

How I checked: the 20 mocks at full size; `node tools/audit.js` on all of them (0 findings: one ring, no overlap, no
clipping, safe area, contrast on every flat ground including the new team fields and ambient ground, the ring read back
from the pixels, no amber or yellow, red only on LIVE, 24 h clocks, SPOILER and RECORD on every shield mock, LIVEBG on
every LIVE pill, DATA on every channel card, LINES on every card, and the Home checks); `--inject` makes 61 planted
faults fire. `home-v2.css` was read against the token list: every colour is a token, a flat scrim already in `ui.css`,
or a team or artwork colour used as data (the two new kinds, argued below); the only `box-shadow` is the focus ring; no
`filter`, `backdrop-filter`, `mask` or `text-shadow`; radii 8, 10, 12, 16, 24 and pill (10 on the channel logo tile:
a nit, documented); fonts Outfit, Inter and Barlow Condensed in the brand's sizes (14 is the floor; 12 only on the LIVE,
4K and IS badges; the chip's caption went from 12 to 14 in v1.1).

## Verdict

**On brand, with three deliberate departures argued below (D1 revised, D2 withdrawn, D3 kept, D5 and D6 new) and two
items for the real TV.** v1.1 keeps the system and fixes what v1.0 got wrong: the slab is back under the brand's size,
the wide card is a picture again, the status row's LIVE pill sits on the canvas. What it adds is colour as data: the
teams' colours as the game billboard's fields, the artwork's colour as the title billboard's ground. Both are flat,
measured, and never on chrome.

## Mock by mock

| Mock | What the brand sees | Notes |
|---|---|---|
| `home-live-hidden`, `home-live`, `home-behind`, `home-pre`, `home-pre-choose` | Game night: two flat team fields split at 12° (the live angle), crests in the neutral disc (never recoloured), the score plate in bg-1 at 92 % with the 12° skew, the clock chip as the one gradient slab (ink text, Barlow for the clock and `VS`, 14 px caps caption), LIVE as dot + word + outline on the canvas band, `GAME NIGHT` in pink-text, the fan line in chalk | The fields are the real primaries at 55 % over bg-1, darkened until chalk passes 4.5:1 (audit CONTRAST on `.hv-side` and `.hv-ctx`); the LIVE pill's surroundings are dark (audit LIVEBG). `2ND 4:12` in Barlow caps, not `Q2` |
| `home-morning` | `THE MORNING AFTER` eyebrow, `REPLAY · NO SPOILERS` on the chip, the neutral `Score hidden` tile, partial records, the fan line marked `as of tip-off`; no result word (audit SPOILER + RECORD) | |
| `home-final-seen` | the score in Barlow 64 on the plate, `FINAL` on the chip, `YOUR TEAM` (no `GAME NIGHT` once it is over) | |
| `home-evening`, `home-upnext`, `home-offline`, `home-card-menu` | A Soft billboard: the backdrop under the three flat scrims, the ambient ground in the art's own colour (deep, flat), the greeting in pink-text, the title in Outfit 700 34, meta 15 with the `4K` badge and `Ends 21:03` in text-3, the gradient progress bar, one gradient button | The scrims are the detail page's shape (UI-SPEC 5.6) with the ambient colour as the left stop |
| `home-new-season` | the show's name in caps as a stand-in for the Cinemeta logo (Outfit 700 40, tracking .08em); meta with the chalk star | The logo file replaces the text in the app; a third-party mark on the canvas, like a channel logo (BRAND 6) |
| `home-discover`, `home-first` | as evening, with a 2-line synopsis in body text-2 and `Details` as the primary (owner). The poster upright when there is no backdrop (never stretched, blurred or mirrored) | |
| `home-scrolled`, `home-channels` | Posters radius 12 with captions below (sign-off 2), the dashed named-4K tag (Movies' rule), the [tv] mark, the ring + 1.05 lift; channel cards as the provider's logo tile on surface-2 or the two teams' colours with crests; the context line in caption size | |
| `home-m3u` | the next game in the game-night layout before its day: fields, `VS`, the tip time on the chip, the greeting | |
| `home-welcome` | the ramp (bg-1 to bg-0, grain), flat skeleton blocks, no ring (a progress screen) | |
| `home-live-entry` | three stills at 0.29 scale of the entry: transform and opacity only, the live wipe's easing | |
| `home-rows-setting` | Account's two panes, 56 px rows, toggles with the word On, the grip from Saved's reorder | |

## The departures, argued

**D1 (revised). The hero is full-bleed, not a 864 × 192 card.** As in v1.0: BRAND.md 9's "flat 2-stop gradient (bg-1
to bg-0)" is the welcome billboard; UI-SPEC 3.3 lets art bleed; the detail page already puts art edge to edge. The
difference in v1.1 is that the game billboard's field is no longer the brand ramp but the two teams' colours (D5).

**D2 (withdrawn). The slab no longer runs off the edge.** The review was right: a 330 × 208 gradient block out-shouted
the primary and strained the brand's "slab at most 26 %" rule. v1.1's slab is the **clock chip**, 112 × 72, attached to
the score plate: pink to orchid at 12°, ink text, under 4 % of the billboard. It keeps the signature (one gradient slab
per live hero, parallel to the plates) at the size the brand's components sheet draws it.

**D3 (kept). Wide cards carry their text at the bottom over a scrim; a peeking row shows its top line.** The card is the
picture (Android's compact card, Netflix); the peek keeps the card's status, label, tile and tags and hides only the body
text, so the row reads as "more below" and nothing is sliced. v1.0's version hid everything and left empty boxes; the
review caught it.

**D4 (done). The card label is 14 px**, the brand's label size; only `4K` and `IS` stay 12 px badges.

**D5 (new). Team colour as the game billboard's field.** BRAND v5.4 UI-phase rule 1 allows the real primary on "the
plate field, 4 px accent bar, game-card row edge" and says team colour is "data, not UI colour: never on buttons, rings,
tabs, selected states, progress or other chrome, and never as a gradient or glow". A billboard field is not chrome, it
is the same plate grown to the billboard, flat, at 55 % strength over bg-1 and darkened until chalk reads at 4.5:1.
The safeguards hold and are enforced: the LIVE pill sits on the canvas band above the fields (LIVEBG), no ring touches a
field (the buttons sit on the bottom scrim, which is bg-0 by y 276), text on the fields passes 4.5:1 (CONTRAST). The
reviewer asked for exactly this ("a team-coloured field behind the away and home sides, split at 12° like the replay
card"); the open question for the panel is the strength (SPEC 14.5).

**D6 (new). The artwork's colour as the title billboard's ground.** The brand says "the Home backdrop is a flat 2-stop
gradient (bg-1 to bg-0)". v1.1 keeps it a flat 2-stop gradient but lets its first stop be the artwork's dominant colour,
darkened to L 24 % (`--amb2` deeper at the far left), computed once per image and cached. It is the same move as a
channel logo or a poster on the canvas: a third party's colour used as data, never on chrome, never a glow (no blur, no
radial). Netflix's 2025 TV app does it; it is the one thing in this round that makes two evenings look different from
each other. If the panel shows banding, `grain.png` goes over it as on the game fields.

**Kept from the brand without change:** the mark alone in the bar, tabs with the gradient underline, the avatar on the
gradient, `.btn` ink on gradient and `.btn2` outlined, the compact LIVE pill on the NBA tab only, the focus ring token,
selected ≠ focused, red only for LIVE, nothing amber or yellow (the Lakers' and Jazz's secondary colours appear only in
crests and the 4 px edges, as nba-pages allows), errors neutral, no loop but the launch hold, Barlow only for scores,
clocks and three-word live titles (`VS`, `ON NOW`, `REPLAY`, `FINAL`, `49 MIN`, `END`).

## Nits
- The channel logo tile is radius 10 (between the 8 px small tile and the 12 px large one). Snap to 12 if the kit
  prefers.
- The storyboard page uses 0.29-scale copies of the billboard, so its text is under 14 px by design; the audit skips
  `.sb-shot`.

## Open for the real TV
- **The team fields and the ambient ground on the OLED in Standard and Vivid.** Both are flat tints; check banding (add
  grain if needed) and whether 55 % is too much next to the pink primary. Real crests (ESPN 500 px) on the fields.
- **Real backdrops under the scrims** (UI-SPEC open items 1 and 10 still stand): send 12 Cinemeta / TMDB backdrops
  through `tools/build.js` and re-run CONTRAST on the column.
