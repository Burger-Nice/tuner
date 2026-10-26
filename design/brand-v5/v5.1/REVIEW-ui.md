# airglow v5.1 (Soft + Sharp dialect): independent review #2 (UI/TV designer)

Scope: branding and component language only (identity, tokens, buttons and components). Full-screen layouts are out of scope and not marked down. Judged against Netflix, Plex, Apple TV, YouTube TV, Disney+, Peacock, ESPN/DAZN, TiviMate (8-10 = their level; hobby brand = 3-5).

What I did: viewed `board.png`, `components.png`, `context.png`, `launch.png`, `assets/icon-1024.png`, `assets/banner@2x.png`, `tests/mark-tests2.png`; read `mark.svg`, `mark-small.svg` and `tokens.css`; recomputed every contrast ratio the doc claims; made my own 48 px, 24 px and blurred renders of the icon and the mark, and a contrast-boosted banding check of the banner. Not seen on the Philips; panel-dependent points say "suspected". The launch is stills, so the animation itself is unjudged.

## Scores

| Area | v5 | **v5.1** | Verdict |
|---|---|---|---|
| Mark | 5.5 | **5.5** | Honest and clean now (no blur filters). Still a pink-orchid play triangle; the echo reads as a drop shadow and vanishes below 48 px. |
| Lockup and wordmark | 6.0 | **6.5** | The two-weight "air / glow" is a real improvement and gives the name a shape. The 12-unit gap now reads as two words at a glance. |
| Colour | 6.5 | **7.5** | Every ratio I recomputed matches the doc. Roles are strict, violet is quarantined, ink-on-gradient labels pass. Remaining nits are small. |
| Icon and TV banner | 6.5 | **7.0** | Icon is now bold and legible (ink on pink-orchid, 5.2-6.3:1). Banner is violet-led, the weakest asset and the one the Google TV home screen actually shows. |
| Small-size / across-the-room legibility | 6.5 | **7.0** | Ink icon survives 24 px and blur (my render). Small mark is a plain triangle; below 48 px the identity is colour only. |
| Fit to product | 7.5 | **7.5** | Says "watching things" without being a sports or IPTV cliche. Unchanged, and still the strongest part. |
| Soft + Sharp split | 5.0 | **7.0** | Now a real system: one identity, a written may/never-slant list, a visible "don't" row. The three different angles and the unproven NBA data screens hold it back. |
| **Overall** | 6.5 | **7.0 / 10** | A coherent, buildable brand with the right mood and strong rules. It lacks one thing: an ownable gesture in the mark. |

## Their pushbacks, judged on the evidence

- **"Screen with a play" rejected as the YouTube silhouette: agree.** `tests/mark-tests2.png` shows M2 next to a YouTube tile and the shapes collide. My suggestion was a gradient screen with a cut-out, but a rounded 16:9 plus a play is that silhouette whatever the colour. They were right to reject it.
- **Triangle as the i-dot dropped: agree.** I proposed it as an option; the render shows it fights the mark.
- **Ink triangle on the gradient tile (my option B): evidence supports it.** Icon is 5.2-6.3:1 against the tile and survives 24 px in my render; it also removes the Twitch-violet neighbour from the icon.
- **Violet quarantined, `violet-ui` #9D7DFF for strokes:** verified, 5.9:1 on bg-0, 3.9:1 on surface-2.
- **"Sharp is a dialect, not a brand":** adopted fully, and the written rules are good. See problem 4 for the part that still leaks.
- **"ai" risk recorded as unresolved:** honest and correct; the weight split mitigates it, it does not remove it.

Claims I verified by calculation: text-1 on bg-0 15.86:1, text-3 on surface-3 5.08:1, pink on bg-0 6.17:1, orchid on surface-2 3.39:1, ink on pink 6.34:1, ink on orchid 5.23:1, live-text on surface-3 4.53:1, no failures. All hold.

## What is good

- Ink labels on the pink-orchid gradient (5.2-6.3:1) fix the weakest part of v5.
- Colour roles are specific: gradient = primary actions only; red = LIVE with dot, word and 2 px outline; nothing amber; brand colour as text uses separate `pink-text` / `orchid-text` tokens.
- One focus language everywhere: 3 px white ring, 2 px canvas gap, 1.05 lift. 18:1 does the work; the glow sprite is decoration.
- Performance rules are specific and sensible for a WebView on a TV: glow sprites at about 10 KB, grain for banding, transform/opacity only, 99 KB of fonts, no blur filters.
- The launch is a short 1100 ms and starts from a static native splash.
- The "don't" row in `components.png` (skewed text, skewed tables, skewed channel list) is exactly the discipline the brand needs.

## Remaining problems, ranked, with fixes

### 1. The mark has no ownable gesture; the echo is a drop shadow
Evidence: `mark.svg` is a rounded triangle with a radial glow disc and one 28% echo offset (-9, +6). At 48 px in my render the echo is a purple sliver beside the triangle (reads as shadow); at 24 px it is gone; the glow disc is invisible on any bright background (it only shows on the canvas). So below roughly 48 px the identity is a pink-orchid gradient play triangle, which is the most common symbol in video. It is clean and instantly "video", but anyone could have drawn it.

Fix (pick one, then render at 96/48/24 and blurred):
- (a) **Make the echo carry:** offset (-15, +10), opacity 40%, same rounded stroke. It then reads as a deliberate second layer at 48 px. If it still reads as shadow, drop it.
- (b) **Drop echo and glow from the mark and own a proportion instead:** stretch the triangle 8% longer (apex to base), round the apex at radius 14 and the base corners at 6, so it is not the stock equilateral play. Cheap and testable.
- (c) **Accept it:** the brand rests on colour and the two-weight wordmark (as Netflix's red does). Then say so in BRAND.md and delete the echo language so the document does not promise an idea the mark cannot show.

### 2. The TV banner is the weakest asset and the Twitch-adjacent one
Google TV shows the banner, not the icon. `banner@2x.png` is a full-bleed violet-to-orchid field with a chalk lockup; the violet end is the same neighbourhood as Twitch and Disney+ in a launcher row, which is exactly what the warm ink tile fixed for the icon. The banner is also the only place the "air" at 78% chalk sits on a bright violet, which is lower contrast than on the canvas.

Fix: make the banner the icon's sibling. Pink-to-orchid gradient field (`linear-gradient(100deg, #F95BAC, #D540F5)`), ink lockup (`#14101F`, 5.2-6.3:1), with "air" at full ink and "glow" at weight 700, no violet at all. Put it in `board.png`'s launcher row next to Twitch #9146FF, Disney+ navy and IMDb yellow and check it by eye. Keep the current violet banner as the quiet alternative.

### 3. The Sharp dialect uses three angles
`tokens.css`: `--a-skew: -12deg` (plates), `--a-wipe: 14deg` (slab and wipes), `--a-edge: 8deg` (Soft hero edge); the launch also uses 8°. In `context.png` the score plate (12°) and the slab beside it (14°) are visibly not parallel. ESPN's value as a precedent is one fixed angle.

Fix: one live angle, 12° for plates, slab and wipes (`--a-wipe: 12deg`), and one soft angle, 8° (hero edge, launch wipe). Two tokens, documented as "live" and "soft".

### 4. Doc and asset inconsistencies (cheap)
- `launch.png` says the native splash sits on `#0F0C18 (bg-0)`; `tokens.css` and BRAND.md have bg-0 `#171323`. The static splash and the first WebView frame will not match, so there will be a visible flash. Pick one (use #171323).
- `border-strong` #7C7691 is 3.3:1 on surface-1 but 2.8:1 on surface-2 (selected rows), below the stated 3:1. Use #8A84A0 on selected states, or specify "unselected on surface-1 only".
- `--a-text-4` disabled at 3.7:1 is fine as disabled-only, but nothing prevents it being used for information; add a lint rule.
- Surface steps against the canvas are 1.27, 1.50 and 1.83:1. That is far better than v5 (1.04-1.5) but still low for a Philips with weak black levels. Keep the 1 px border on every card and validate on the panel. Suspected.

### 5. Component language is a good start but incomplete
Shown: primary, secondary, disabled, chips, LIVE pill, poster card, progress, channel row, Sharp plates. Missing, and needed before any UI pass:
- **selected vs focused for chips and tabs.** In `components.png` the pink-outlined "Live now" chip and the white-ringed "Series" chip are different states, but the selected state is not named in the doc. Define: selected = surface-3 fill + `pink-text`; focused = ring.
- **text input, toggle, tab/rail item, dialog/sheet, toast, empty and error state, skeleton/loading.** Errors are "neutral icon + text", which is a sound rule, but no render proves it.
- **The native player.** The OSD, the options dialogs and the Media3 controller are Android code and are not branded at all. This is where the owner watches. Add a native theme spec to the tokens: dialog background #201D2A (bg-1), radius 24 dp, focused row = surface-3 with a 3 dp white ring, radio/seek tint = `pink` #F95BAC, title and body in Inter, 22 sp minimum.

### 6. Wordmark gap reads as two words
`lockup.svg` has a 12-unit gap between "air" and "glow", plus a weight and tone change. In `launch.png` frame 3 and in the banner it reads as "air glow". The brand name is one word. Fix: reduce the gap to 8 units; keep the weight and 78% tone split, which already break the "ai" cluster. Render at 14 px and across-the-room blur before committing.

### 7. The canvas is strongly purple-tinted (suspected risk)
bg-0 is `#171323` (OKLCH C .032, h295), about double the chroma of a typical dark-UI neutral. That is what makes the brand feel owned, but it is also close to Twitch's neighbourhood, and real posters and flesh tones over a violet canvas can look off. Test with three real posters and a TV in Standard mode; if it fights the art, halve the chroma (C .016) on bg-0 to surface-3 and keep the violet in sprites only.

### 8. Housekeeping
- Focus lift scale 1.05 on text-heavy cards can soften text mid-animation in a WebView (suspected); prefer ring-only on cards with small text.
- The name overlaps LumenRadio AirGlow and a DoPchoice filing; unchanged and fine for personal use.

## What would take it to 8+

1. A mark with one ownable proportion or an echo that survives 48 px (problem 1).
2. A banner that is the icon's sibling (problem 2).
3. One live angle and the token and doc inconsistencies cleaned (problems 3 and 4).
4. The component set extended to selected state, inputs, dialogs and the native player (problem 5).
Everything else is polish.
