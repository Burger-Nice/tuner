# Tuner brand v2.1: independent review (UI/TV designer)

Scope: logo, lockup, colour system as shipped in `design/brand-v2/` (commit ba52c43). Judged against Netflix, Plex, Apple TV, YouTube TV, Disney+, Peacock, ESPN/DAZN, TiviMate (8-10 = their level; a typical hobby brand = 3-5).

What I actually did: read every SVG path and `checks/geometry.js`; viewed `board.png`, `checks/tv-1080.png`, `checks/sizes.png`, `checks/lockup-options.png`, `icon-1024.png`, `tv-banner@2x.png`; recomputed contrast; ran a greyscale pass, a blur/squint pass and a 48 px / 24 px nearest-neighbour pass of the icon and banner myself (ImageMagick). I did not see it on a real Philips panel, and nothing below pretends otherwise. Items I could not verify are marked "suspected".

Reading of the owner's line: "I fw it heavy" = "I like it heavy". The weight is a keeper, not a complaint. The "T should be the logo" point is correct and v2.1 does it.

## Scores

| Area | Score | One-line verdict |
|---|---|---|
| Mark | 5.0 | A clean, legible two-tone T. It reads as a ruler/T-square, not a tuner, and the "needle" concept is invisible. |
| Lockup and wordmark | 5.5 | T-as-logo solves the double-T. The wordmark is heavy and clear, but generic, with a wedge-shaped T foot and loose T-to-U spacing. |
| Colour system | 7.0 | Technically the strongest part (even ramp, all text >= 4.5:1, honest checks). Weak on distinctiveness, status separation and the brand colour's actual share of the logo. |
| Icon and TV banner | 5.0 | Safe and legible. It is a white word with a small yellow hat, and a plain initial in a square. It will not stand out in a launcher row. |
| Small-size / across-the-room legibility | 7.0 | Heavy weight and 16:1 white text carry it. The ticks (3.9 of 100) die below roughly 48 px and the two-tone idea vanishes at distance. |
| Fit to the product | 5.5 | Amber on blue-black suits a premium sports/media player and nods to the Grizzlies. The ruler read, a Plex-adjacent palette, and a generic wordmark don't say "live broadcast". |
| **Overall** | **6.0 / 10** | Competent, well-engineered, honest about its checks. Not yet ownable. Best-in-class marks win with one gesture you can describe in a sentence. |

## What is genuinely good

- T = logo is right. At 14 px the word reads "TUNER" in one pass (`lockup-options.png`, row 2). No second T.
- Stem weight: needle top 22 vs letter stems 23, so mark and word match in weight.
- Text contrast is real: recomputed amber on canvas 10.46:1, white on canvas 16.34:1, matching `contrast.js`. Canvas #13161B has no channel below 16, which fixes v1's black-crush bug.
- The single-accent discipline and "red = on-air" rule are right for a sports app.
- The self-critique in section 0 is candid, and the contrast tables are reproducible.

## Biggest problems, ranked, with fixes

### 1. The mark reads as a ruler / T-square, and the concept is not on screen
Evidence: yellow bar with downward notches = a yellow school ruler or tape measure (`icon-1024.png`). The notches sit on the bar's lower edge, so they read as teeth or battlements, not a dial scale. The "needle passing through the scale" never passes through anything: the white needle starts flush at y=0 with the bar top and sits in the middle of it (`mark.svg`: bar `M0 0H97V23...`, needle `M37.5 0H59.5L62.5 100H34.5Z`). The BRAND.md story (needle locked on a station) is not recoverable from the drawing.

Fix, concrete (cheapest first):
- (a) Make the needle break the scale. Let it stand proud: needle top at y = -14 (path `M41.5 -14H55.5L59.5 23...` tip 14 wide, then straight 23-wide stem below the bar). The T gets a pointer above the cap line. That is the one gesture people can describe ("a T with a needle sticking out"). Keep cap height 100 for UNER; the mark is 114 tall. Check at 24 px that the tip does not clip the icon safe zone (icon scale 5.4 gives about 77 px of extra height, which fits).
- (b) Make the scale read as a scale: drop the six equal notches for a major/minor pattern, ticks at +/-20 and +/-41 at height 11.5, minor ticks at +/-30.5 at height 6, all on the TOP edge of the bar (a dial scale is read from the needle side, rulers have lower-edge ticks). Do not do (a) and (b) at once without re-checking at 48 px.
- (c) If you won't change it: delete the ticks entirely at every size. A plain amber-barred T is more honest than a ruler.

### 2. The T foot is a wedge and the T sits loose from the U
Evidence: needle widens from 22 at the top to 28 at the baseline, 1.22x the 23-unit stems of U-N-E-R. In `tv-1080.png` the T has a visible foot flare that no other letter has. T stem to U is 44.5 units against 14 between U-N-E-R (stem right edge at x=62.5, U starts at x=107), so the word reads "T UNER" at the top-right of `tv-1080.png`.

Fix:
- Straighten the stem: 23 wide (x 37 to 60), no taper below the bar. Taper only if you adopt the 1(a) pointer above it.
- Tighten T to U: narrow the arms from 34.5 to 28 per side (bar 79 wide, ticks re-pitched to +/-16 / +/-24 / +/-32) and gap bar-to-U 8. Target stem-to-U about 36 to 38. Check by eye at 14 px; your own gap study says 3 collides, so test 6 to 8 rather than trusting the arithmetic. Suspected, not measured on a panel.
- Keep E counters honest: stem 23 leaves 16-unit counters in E; at 14 px cap height that is 2.2 px and closes under blur. Optional: E arms 21 / 19 / 21 (counters 19).

### 3. The brand colour is almost absent from the logo, and the two-tone idea is invisible at distance
Evidence: amber bar is 1,962 of about 17,000 filled units in the lockup, well under 15%. Amber vs white luminance contrast is only 1.56:1, so in greyscale (my test) the bar is a grey cap and in the squint test it is a thin yellow smear. Two tones are carried by hue only; the TV banner is effectively a white word.

Fix:
- Banner: use your own "option 3" (all-amber T, #FABA25) in the TV banner and rail. It is the only version that keeps the brand colour visible in a 14 px or across-the-room read.
- Icon: put the T on an amber tile instead: background #FABA25, T in #13161B (10.46:1, ticks knocked out to amber). Amber tile on a launcher full of dark tiles is the single biggest standout lever you have. Keep the dark-tile version for iOS/Windows if you prefer. Verify on the panel first; a bright tile in a dark room can look loud (suspected).

### 4. Palette sits next to Plex, and amber is overloaded in the UI
Evidence: Plex uses #E5A00D-family gold on near-black charcoal; amber #FABA25 is 1.29:1 from it in luminance and visually adjacent. The accent is also the mark, the primary action, selection, progress and "your team", while the doc forbids red from doing several jobs.

Fix: if Plex shares the launcher row, move the accent slightly yellow of Plex (hue about 92 to 96, keep L .83 so the contrast table still holds) and re-run `checks/contrast.js`. Cap amber to four roles: mark, primary action, current selection, progress. Give "your team" the Grizzlies blue or a tile accent instead.

### 5. Status colours are too close for the doc's own standard
Evidence: live vs danger dE 8.5 (below the doc's own 10 floor); accent vs warning 9.8, 7.2 under deuteranopia; danger vs success 6.9 under deuteranopia. Pink-rose for errors (#F16A94) is atypical and costs recognition.

Fix: drop the pink. Use a conventional red for danger (about #E5484D, check it is >= 4.5:1 text-safe on all five surfaces), and make live distinct by form, not hue: filled dot + the word LIVE, never a bare red element. The two reds never share a component, so the dE problem goes away. Add a rule that any status needs an icon or word (already written for warning).

### 6. Doc claims that the data does not support (minor, cheap to fix)
- "Neutrals: one hue 262, constant chroma": the ramp is h 261 / 267 / 258 / 264 / 260 and C .011 to .015. Either regenerate all five at h262 C .013 or stop claiming constancy.
- The banner at 320x180 is about 72% wide, inside the stated 80% safe zone. That is fine, but the doc should say the white word, not the logo colour, is what the user sees.
- The board and doc are long for a one-person app (38 KB). Trim before you maintain it.

## Per-area notes

**Mark (5.0):** Pros: simple, flat, one silhouette, works at 24 px via `mark-small.svg`. Cons: the ticks are decoration with no job (1(b) fixes this); at 24 px the mark is just a T with a yellow top; initial-in-a-box is the least ownable class of logo (compare Netflix ribbon, Plex chevron, Disney arc).

**Lockup and wordmark (5.5):** The word is a custom wide grotesque at stem 23 per 100 cap, ultra-bold. Heavy is liked and correct for TV. It is also close to a generic heavy geometric sans: nothing but the T is ownable. If you want one more signature, cut one detail into the R leg or U (for instance a notch matching the 6-unit tick) rather than adding colour. The bar-over-U overhang is clean; the 10-unit gap is acceptable once the T is narrowed.

**Colour system (7.0):** Lifted canvas, even ramp (.040 to .044 per step), every text token >= 4.5:1 on five surfaces, off-white text, one hue-complement accent. This is better than most hobby palettes and matches Material/Android TV guidance. Lost points: Plex proximity, overloaded amber, status cramp (above), and warm-only accent/warning/live triad.

**Icon and TV banner (5.0):** Technically correct (adaptive foreground, 1x/2x banner, no border, text baked in). Plain: the banner is a white word on #13161B. See fix 3.

**Legibility (7.0):** White on #13161B at 16:1, 23-unit stems, minimum sizes sensible (24 px mark, 140 px lockup on TV). Ticks below about 48 px are noise (3.9/100 x 48 px = 1.9 px); use `mark-small.svg` below 48, not 32 as documented. Suspected: on a panel with raised blacks the 1.12-1.22:1 steps between surfaces will still be faint; the doc's lifted ramp helps but I did not see it on the Philips.

**Fit (5.5):** Right mood (premium, dark, warm gold). Wrong vocabulary (measuring tool, not broadcast). The Grizzlies gold tie is a nice private touch but the brand should survive a team change; it does, since amber is team-neutral.

## What would move it to 7.5+

1. A mark with one describable gesture (needle breaking the scale, fix 1a).
2. Amber visibly in the TV banner and icon (fix 3).
3. A cleaned T foot and T-U spacing (fix 2).
4. A status palette that passes your own dE rule (fix 5).
Everything else is polish.
