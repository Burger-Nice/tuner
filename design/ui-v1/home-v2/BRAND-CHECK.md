# Brand check: Home v2

Checked against `design/brand-v5/v5.4/BRAND.md` (rules at a glance, the UI-phase additions and sign-offs), `tokens.css`,
`design/ui-v1/UI-SPEC.md` v1.2 (sections 3 to 4, 5.2) and the two earlier checks (`BRAND-CHECK-final.md`,
`UX-CHECK-final.md`). Written by the designer of this round, so it is a self-check: the independent reviewer scores it.

How I checked: the 11 mocks at full size, `node tools/audit.js` on all of them (0 findings: one ring, no overlap, no
clipping, safe area, contrast on flat grounds, the ring read back from the pixels, no amber or yellow, red only on LIVE,
24 h clocks, nothing but the slab's content on the slab, the new PRIMARY / ORDER / PEEK / BAR / HERO checks), plus
`--inject`, which plants one fault per new check and makes 16 of them fire. `home-v2.css` was read line by line against
the token list: every colour is a token or one of the three flat scrims already in `ui.css`; the only `box-shadow` is the
focus ring; no `filter`, `backdrop-filter`, `mask` or `text-shadow`; radii 8, 12, 16, 24 and pill only; fonts Outfit,
Inter and Barlow Condensed in the brand's sizes (14 is the floor; 12 only on the LIVE, 4K and IS badges).

## Verdict

**On brand, with four deliberate departures argued below and one open item for the real TV.** Home v2 keeps the
system: the canvas, the top bar, the one ring, the Soft surfaces, the Sharp dialect kept to the game billboard and the
game cards, red for LIVE only, the ink label on the gradient, captions under posters, the 14 px floor. What changes is
scale and air: the hero is no longer a card on the canvas but the canvas itself for its top 292 px, with the slab running
off the right edge the way the brand's launch slab does.

## Mock by mock

| Mock | What the brand sees | Notes |
|---|---|---|
| `home-live` | The lower-third: flat team plates at 12° (real colours, chalk text 4.9:1 on Memphis' darkened blue, chalk on Jazz navy), the score in Barlow 800 italic (Sharp, scores only), the clock plate on the gradient with ink text, LIVE as dot + word + outline, "Your team" in pink-text | The LIVE pill clears the plate by more than 8 px (audit-enforced). The away plate bleeds to x 0: art and rows may bleed (UI-SPEC 3), a flat team field counts as art, not chrome |
| `home-pre` | VS in Barlow (a sibling of the score, allowed by UI-phase rule 3), "49 MIN / Tip-off 01:00" on the slab once, nothing in the status row repeats it | |
| `home-morning` | Shield: the neutral "Score hidden" tile, records partial with the eye-off, REPLAY on the slab; no result word anywhere (audit SPOILER) | The hidden Grizzlies card in the NBA row has no plate, "Ended", no records (nba-pages 5.3) |
| `home-evening` | A Soft billboard: full-bleed art under three flat scrims, eyebrow in label caps (pink-text for the reason, text-3 for the detail), title Outfit 700 34, meta 15, the gradient progress bar, one gradient button | The art's scrims are the detail page's (`d-scrim`, UI-SPEC 5.6): the same shape and stops |
| `home-scrolled` | Posters radius 12 with captions below (sign-off 2), the ring + 1.05 lift, the [tv] mark on a neutral disc, the context line in caption size, the bar away | |
| `home-channels` | Wide cards: tile on surface-2, number in a dark chip, title + channel at the bottom over the scrim, the gradient progress flush | |
| `home-discover` | As evening, plus a 2-line synopsis in body text-2 and a chalk star (ratings are chalk, never yellow) | |
| `home-first` | The provider's poster stands upright on the canvas when no backdrop exists: no stretched, blurred or mirrored poster (no filter) | |
| `home-card-menu` | The kit's context menu (bg-1, radius 16, one ring on the first row) | |
| `home-offline` | The slim offline pill in bg-1 with border-strong, no red, no amber; no LIVE pills on the page | Moved to the bottom right, inside the safe line |
| `home-rows-setting` | Account's two panes and 56 px rows, toggles with the word On, the grip from Saved's reorder pattern | |

## The departures, argued

**D1. The hero is full-bleed, not a 864 × 192 card.** BRAND.md 9 says "the Home backdrop is a flat 2-stop gradient
(bg-1 to bg-0)" and UI-SPEC 3.3 lets art bleed. The billboard is exactly that gradient (game states) or a key frame under
flat scrims (title states) for y 0 to 292, with the top bar over it under a top scrim. The brand's own launch frame and
the detail page already put art edge to edge; Home now does what the owner's "Netflix quality" asks for without a new
colour, shape or effect. The hero plate's card border is gone because a card inside a billboard would be a frame inside
a frame; the plates, the slab and the buttons keep their shapes and sizes' ratios.

**D2. The slab runs off the right edge.** UI-phase rule 2 caps the slab at 26 % of the hero *when it is a card*. On the
billboard it starts at x 632 (the plates end at 625) and leaves the screen at x 960, 34 % of the width; its content
stays inside x 912 (audit SAFE and SLABTXT). It is the launch wipe's gesture made still: pink to orchid at 12°, ink text,
the one allowed gradient. If the reviewer finds it loud on the panel, the fallback is the 26 % slab ending at 912 with a
rounded corner; nothing else moves.

**D3. Wide cards carry their text at the bottom over a scrim, and a peeking row is art only.** UI-SPEC 3 (v1.2) put the
rail card's text at the top "so the second row still reads when only its top half shows". Home v2 follows Android's
compact card and Netflix instead: the picture is the card, the title sits on the bottom scrim where posters put theirs,
and the peeking row shows art under its title, nothing sliced (audit PEEK). The row title says what the row is; the
cards say what they are when they come up. This also removes the top-heavy scrim that darkened half of every picture.

**D4. The card label at 14 px.** `.wc .tl .t-label` ("S1 E3", "NBA · Replay", "New") was 12 px in the first build; the
badge exception is for five characters or fewer, so the label is now 14 px caps, the brand's label size. "4K" and "IS"
stay 12 px badges.

**Kept from the brand without change:** the mark alone in the bar (the lockup never on Home), tabs with the gradient
underline, the avatar on the gradient, `.btn` ink on gradient and `.btn2` outlined, the compact LIVE pill on the NBA
tab only, the focus ring token, selected ≠ focused, team colour never on chrome (only plates, the 4 px edge and the
replay card's two-colour field, which catch-up 5.2 introduced), errors neutral, no loop but the launch hold.

## Open for the real TV

- **The 292 px billboard on the OLED in Standard and Vivid.** Real backdrops (Cinemeta, TMDB) are photographic; the
  scrims were tuned on procedural art (UI-SPEC open item 1 and 10 still stand). Send 12 real backdrops through
  `tools/build.js` (replace `art()`), re-run the audit's CONTRAST on the column and look at the top scrim under the
  tabs.
- **Grain.** The game billboard's bg-1 to bg-0 ramp carries `grain.png` at 50 % of its own alpha to break banding, as
  BRAND.md 9 prescribes for large flat fills; check it does not read as noise at 4 K.
