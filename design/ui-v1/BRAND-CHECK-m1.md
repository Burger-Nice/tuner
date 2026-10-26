# Brand check: UI milestone 1

Checked against `design/brand-v5/v5.4/` (`BRAND.md`, `tokens.css`, `BRIEF-for-UI.md`, today's sign-offs). Reviewed: `png/overview-m1.png`, `tv-home.png`, `tv-live.png`, `tv-nba.png`, `tv-movies.png`, `tv-detail-series.png` at full size (the other PNGs on the contact sheet), `ui.css` line by line (grep for filter, shadow, blur, angles, hex, fonts, radii, gradients), and `kit/data.js` for team colours. Contrast numbers are computed with `tools/color.js`. Not checked: the animations (the mocks are stills, `ui.css` has no transitions yet), the real panel.

## Verdict

**On brand, with 2 must-fixes, 5 should-fixes and 6 nits.** This is strong work: it reads as the same product as the brand board. The system is held: five surfaces plus 1 px borders (no shadow anywhere), exactly one focus ring per screen, selected differs from focused, one primary button per screen, red only on the LIVE pill, no amber or yellow in chrome, 12° for every live shape, 8° unused (correct, no soft edge needed yet), upright text and tables inside every Sharp plate, and no filters or blur anywhere in `ui.css`. Node counts (63 to 184 against a 1500 budget) are far inside the budget.

## What passes, by area

| Area | Result |
|---|---|
| Colour roles | Pass. Red only as the LIVE pill (tab, hero, guide cells, now panel, game cards). Chrome has no amber, yellow or violet. Text is chalk on surfaces, ink on the gradient (Watch, avatar, count badge, now flag). Brand colour as text uses `pink-text`. Progress bars are pink to orchid. |
| Gradient wordmark and lockup rules | Pass by absence: no lockup appears in milestone 1 (only the mark in the top bar), so nothing breaks the "gradient glow on bg-0 only" rule. Carry it into the first-run, About and launch screens. |
| Sharp dialect | Pass. Slab (12°, `--a-angle-live`, 17% of the hero, parallel orchid line) only on the live hero (Home, NBA). Score plates skew via `::before` with upright text (game cards). Italic condensed only on scores and the tip-off time. Linescore table, leaders, captions, channel rows and the guide are upright Soft. Soft 8° is unused. |
| Focus | Pass with the one approved variant (guide inset ring). Outer ring + scale 1.05 on cards and primary buttons, ring only on chips, tabs, pills, rows; one focused element per screen on all nine mocks. |
| Type | Pass at today's floor except the 13 px items below (the floor became 14 px today). Display / head / title / body / label match the tokens; tabs are Outfit 500 18 and 700 selected (fine, see adopt). |
| Surfaces | Pass. Only the five surfaces, 1 px `--a-border`, scrims as 2-stop gradients (allowed), flat `bg-0`. |
| Performance | Pass. No filter, backdrop-filter, blur, text-shadow, mix-blend or mask; the only `box-shadow` values are the focus rings; gradients are 2-stop scrims and the pink slab; one `<img>` per art; `will-change` not used in CSS (to be set on focus in JS only). |

## Issues

### Must-fix

**M1. Team placeholder discs break the red-means-LIVE rule and fail contrast.** Screens: Home hero (MEM, GS, discs), NBA hero and game cards (`kit/data.js` `team()`, `.team` in `ui.css` line 112).
- Why: PHX `#E56020` is dE 7 from the LIVE red `#FF4B4B` and sits on the same card as a LIVE pill (Lakers at Suns, NBA hub); HOU `#CE1141`, MIA `#98002E`, CLE `#860038` are crimson. Red must mean LIVE only. Also the 12 px abbreviation is white (`#fff`) on a disc: PHX 3.49:1, MEM 4.54:1, OKC 4.61:1, so PHX fails 4.5:1 and the pure white `#fff` is off-token (chalk is `#F3EFE6`).
- Fix: placeholder discs are neutral: `background: var(--a-surface-3); color: var(--a-text-1); border: 1px solid var(--a-border-strong)`, abbreviation in Inter 700 12 px caps. No team colour in the UI. Real logos arrive in their own colours (third-party marks, like channel logos): put each on a `surface-2` disc or tile of the same size so a yellow, red or orange logo is contained. Answer to section 9 item 4 is below.

**M2. Mark sizes: the top bar uses the 3-band mark at 28 px.** Screens: all (`kit.js` line 49 `img('mark.svg','mk')`, `.topbar .mk{height:28px}`).
- Why: brand tiers are `mark.svg` at 48 px and up, `mark-small.svg` (2 bands) at 24 to 48 px, `mark-micro.svg` under 24. At 28 px the three bands are about 1.5 px each and merge into a violet smear (visible in every render, bar top left).
- Fix: `img('mark-small.svg','mk')`. Keep the height at 28.

### Should-fix

**S1. Text at 13 px must move to 14 px (new floor, effective today).** `ui.css` lines 27 `.t-cap`, 78, 85, 94, 100, 103, 131, 143 `.kbd`, 144, 151, 161, 171, 177 `.g-nowflag`, 197, 199 `.ep .num`, 207, 211, 224, 231; the guide cell sub-lines, poster captions, game-card meta and the `.ptitle` meta. The tokens `--a-size-caption`/`--a-lh-caption` are now 14/18: replace the literal `13px/16px` with `var(--a-size-caption)/var(--a-lh-caption)`.
- Why: today's sign-off; also it stops the CSS drifting from the tokens.
- Check after: the 129 px poster captions and the 110 px guide cells (30 min) will truncate sooner; keep one line plus ellipsis, never wrap to a third line; cells under 45 min show the start time only (already your rule).
- Exception kept: badges stay 12 px (`.tag`, `.cnt`, `.team` abbreviations, the LIVE pill) if caps, 650/700 and five characters or fewer (TV-MA qualifies).

**S2. Focused poster collides with its caption.** Screen: `tv-movies.png` (Harbor Lights): the 1.05 scale grows the card by about 5 px and the caption starts 9 px below; the ring (5 px out) ends 2 px above the title.
- Fix: caption offset 14 px (`padding-top` or margin) so the focus ring clears it, or translate the caption down 8 px on focus together with the scale (transform only). The same applies to the 16:9 caption rows on Home and the episode cards.

**S3. Title baked into procedural art is too weak on bright art.** Screen: `tv-movies.png`, "EMBER RUN" over the bright green grid and "DEAD AIR" over lit windows. 
- Fix: in the fallback `.pc .ptl` raise the scrim (`rgba(21,19,29,.9)` from 24 px) or, better, do not overlay a title on posters at all: the title is in the caption below (as the brand card spec says: title below, never over the art). Real posters carry their own title; the fallback tile (initials + title) is fine because it has a flat background.

**S4. Compact LIVE pill is outside the token.** Guide cells (19 px, 1.5 px outline, 12 px) and the top-bar tab. Approved (see section 9), so add the class `.a-live.compact` to `ui.css` and use `var(--a-live-compact-h)` instead of the literal 19px; only these two places may use it.

**S5. Procedural art is saturated violet and pink; it will flatter the UI.** Screens: Home, detail-series, movies (most art tones sit in the brand's own hues). 
- Why: that makes the brand look better than it will with real posters, and hides the open risk (warm, bright, photographic art against the violet-ink canvas).
- Fix: before milestone 2, render the grid and one detail page with at least 12 real or photo-like posters (skin tones, foliage, bright sports, black-and-white) and report the 1 px border, scrim and caption legibility.

### Nit

- **N1.** `.pc .ptl` uses the literal `#F3EFE6` (line 83): use `var(--a-text-1)`. `.team` uses `#fff` (line 112): use `var(--a-text-1)` (moot after M1).
- **N2.** `.pc .ptl` is `font:800 14px` Outfit; only 500 and 700 are bundled. It falls back to 700; write 700 so the CSS says what renders.
- **N3.** Hard-coded `rgba(21,19,29,...)` scrims: define `--a-scrim-0` and `--a-scrim-86` in `ui.css` (the brand `--a-scrim` is .72) so a canvas change does not leave stale literals.
- **N4.** Red appears 4 to 6 times on the guide and NBA screens (tab, now panel, cells). Still correct (one per card or row), but if the guide gets denser, drop the tab pill to a dot + LIVE only on the Live tab, not on NBA as well.
- **N5.** The guide's now flag and now line are gradient and pink: fine. The pink line is 2 px; confirm in motion that it stays behind cells (done in the mock).
- **N6.** Radii present: 2, 5, 6, 7, 8, 10, 12, 14, 15, 16, 24, 999. Tokens are 8, 12 (poster), 16, 24, 999. The 5 to 7 are tag and key radii (fine); 10, 14 and 15 should snap to 8, 12 or 16.

## Answers to UI-SPEC section 9

1. **Inset focus ring in the guide: yes, as an allowed variant.** It is still a single 3 px white solid line (8.4:1 on `surface-3`), and an outer ring would sit on neighbours 4 to 6 px away. Rule: only where gaps are 8 px or less; no scale; the fill moves to `surface-3`. Added to the brand as `--a-focus-ring-inset` (`tokens.css`, `BRAND.md` sign-offs).
2. **Poster radius 12: yes.** Added as `--a-radius-poster`; 16:9 cards, game cards, episode cards stay 16.
3. **19 px LIVE pill in guide cells (and the NBA tab): yes, restricted** to those two places (see S4); 12 px text is within the badge exception. Everywhere else 22 px / 2 px.
4. **Team colours only in logo discs: modify.** Real third-party team logos may be coloured inside a neutral disc or tile. Placeholder discs are neutral (M1), because team red and orange collide with LIVE and some fail text contrast.
5. **Real-poster scrim check: still open** (S5); the 86 to 94% scrim is acceptable for card titles over art but is unproven on bright photography.

## Adopt into the brand (better than the rules)

1. **Inset ring for dense grids** (done).
2. **The now flag and now line** in the guide: gradient pill with an ink time, pink 2 px line behind cells. Good, reusable "now" pattern; add to `components.png` next round.
3. **Count badge** (`.cnt`: gradient, ink, 12 px) on the Filters pill. Reusable for Saved and notifications.
4. **"Sort Recently added" pill** with the value in `pink-text`: a clean way to show a persistent selection without a selected fill.
5. **Game card anatomy:** upright Soft card, skewed plate holding upright numbers, status row with the pill, broadcaster right. This is the model for every Sharp card; add to the dialect section.
6. **Tab typography** (Outfit 500 unselected / 700 selected at 18) and the top bar that slides away when focus is deep: add to the component table.
7. **Tags**: outlined (TV-MA, EN) vs filled (4K) vs `HDR` as one tag family at 12 px caps: fits the badge rule.
8. **Watched check and dimmed art** on episode cards, and the flat-block skeleton: add to the states list.
9. **Home hero priority** (your team live, any live game, resume, last channel) and "no auto-advancing carousel": a product rule worth recording in the brief.

## Before milestone 2

Fix M1 and M2 (small CSS changes), run S1 (a token swap), re-render the nine PNGs, and send the first-run, About and launch screens with the correct lockup files (`lockup.svg` on bg-0 at 40 px and up, `lockup-chalk.svg` elsewhere). I will re-check the changed items only.
