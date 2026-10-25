# Tuner brand v2.2: independent review #2 (UI/TV designer)

Scope: commit 4315410, judged fresh against Netflix, Plex, Apple TV, YouTube TV, Disney+, Peacock, ESPN/DAZN, TiviMate (8-10 = their level; hobby brand = 3-5). I am not scoring "did they follow REVIEW-ui.md"; I am scoring what is on the screen, and judging their pushbacks on evidence. I can be wrong too.

What I did myself: read mark/lockup/icon/banner SVG paths; viewed `board.png`, `checks/tv-1080.png`, `checks/sizes.png`, `checks/study22/icons.png` and `banners.png`, `icon-1024.png`, `tv-banner@2x.png`; recomputed contrast; recomputed OKLCH of the neutrals; pixel-counted the amber share in `tv-1080.png`; ran my own greyscale, blur (20% down/500% up) and nearest-neighbour 40 px / 20 px passes on the icon and banner. Not seen on the Philips panel; items depending on that say "suspected".

## Scores

| Area | v2.1 | **v2.2** | Verdict |
|---|---|---|---|
| Mark | 5.0 | **5.0** | The ruler read is gone, which is real progress. But the concept went with it: this is now a heavy amber letter with a hairline seam. Clean, legible, not ownable. |
| Lockup and wordmark | 5.5 | **6.0** | Amber T + white UNER is clear, correctly weighted and reads in greyscale and blur. Wedge foot fixed. Wordmark is still a generic heavy grotesque. |
| Colour system | 7.0 | **7.5** | Verified: neutrals really are h261.6-261.8; every text token passes 4.5:1; status fixes are sensible. Remaining issues are the near-IMDb amber and error-red = live-red. |
| Icon and TV banner | 5.0 | **6.5** | The right move for a launcher: an amber tile or banner is the one thing that will be seen across a dark row. Plain, and the full-seam icon speckles at small sizes. |
| Small-size / across-the-room legibility | 7.0 | **7.5** | Ink on amber 10.46:1, amber T survives greyscale (the old two-tone vanished at 1.57:1). Seam closes gracefully in blur. |
| Fit to the product | 5.5 | **6.0** | Premium dark + gold suits a sports/media player and is Grizzlies-adjacent. It no longer says "broadcast" or "tuner" in any way except through the word. Neutral, not wrong. |
| **Overall** | 6.0 | **6.5 / 10** | A tidy, defensible brand for a one-person app. It now lacks one thing a best-in-class mark has: a gesture. |

## Their pushbacks, judged on the evidence

- **Needle pointer above the bar (rejected): agree.** I put a caveat on it myself; a short protrusion on a T reads as a cross. Fair call, and they tested it rather than guessing.
- **Top-edge major/minor ticks (rejected): agree.** Notches on any edge read as battlements/ruler.
- **Delete ticks (adopted) plus a 3-unit seam: half right.** Deleting was correct. The seam is their own addition and is the weak part (problem 1).
- **Bar 84 instead of my 79: they are right.** 79 minus two 3-unit channels leaves arms of about 24, too short. Stem-to-U 38.5 reads fine in `tv-1080.png`.
- **E counters unchanged, no R/U notch: agree.** Thinning one letter is inconsistent; a detail with no job is the ruler mistake again.
- **Amber hue kept after measuring Plex (dE 7.4) and IMDb (2.9) with my h92 fix landing on IMDb (1.6): agree on the logic**, and I was wrong to suggest h92 without checking IMDb. But it is a real cost, not a non-issue (problem 3).
- **Danger red in the live-red family (my suggestion): I now think I was half wrong.** See problem 4.
- **Amber 5.2% to 13.1% of the lockup:** my pixel count in `tv-1080.png` gives 12.7%. Claim holds.
- **"Neutrals h261.6-261.8, C .011-.015":** verified, except text-1 at h260.7 (negligible).

## Remaining problems, ranked, with fixes

### 1. The mark is a letter with a seam, not a mark
Evidence: `mark.svg` = three rectangles (`M0 0H27.5V23H0Z`, `M56.5 0H84V23H56.5Z`, stem `M30.5 0H53.5V100H30.5Z`). "A T whose stem slices the bar" is not what the eye sees; it sees a stencil T. At the 88 device px rail the seams are 2.6 px (visible, a bit fussy, see `tv-1080.png` top-left). At 40 and 20 px (my nearest-neighbour pass) the seams become dark speckle on the arm tips and the T looks like it has "eyes". At the 1080p banner (cap 92 px) the seam is 2.8 px of thin dark lines on amber. Meanwhile there is no remaining story: "needle locked on a station" is told in prose, not shape.

Fix, in order of cost:
- **Cheapest and most honest:** use one drawing without the seam for everything below 96 device px (see problem 2) and treat the seam as a size-reward only.
- **Test a deliberate seam: 6 units, not 3** (arms 24.5 to 26 each, stem 23). Six units reads as a decision (an I-beam / cut T) at 88 px (5 px) and closes in `mark-small`. If it looks like a stencil font at 100 px, revert to a plain T and say so. Suspected, not verified.
- **If you want one real idea,** the only candidate that survived your tests is carrying it in the wordmark, not the T: for example one amber vertical bar (the needle) replacing the stem of the N or the leg of the R, at 23 x 100. That would make the whole word, not one letter, carry the concept. Untested; render it before believing it.

### 2. The full-seam icon is used where the seam can't survive
`icon-1024` and the 24/48/96 px icon rows in `sizes.png` all use the seamed T, while the rule says the full mark needs 64 device px. At 20 px the seam turns into noise (my render). Fix: ship `icon-small.svg` (plain T, same amber tile, T 54% of tile height as now) for any raster below 64 px: Windows tray/taskbar small sizes, favicon, notification and store thumbnails. Keep the seamed one for Android TV launcher (80 to 320 px) and the App Store 1024.

### 3. Amber tile + dark bold type is IMDb's visual language
Your own measure: amber vs IMDb `#F5C518` dE 2.9; my luminance ratio 1.06:1, effectively the same colour. An amber tile with dark heavy caps is also the pattern of IMDb TV/Freevee and of generic "yellow = taxi/construction". Mitigations are real (the T, the heavy wide wordmark), and for one person's private launcher it probably does not matter unless IMDb TV is installed. The `study22` launcher mock compares against abstract red, blue, green and white shapes, not real brand tiles, so "it stands out" is proven only against strawmen. Fix: if you ever distribute it, move the tile to dark (`tv-banner-dark.svg`), or nudge the accent warmer toward Plex-side gold only after you render both competitors, and re-run `contrast.js`. For now: keep, label it a private-use decision in BRAND.md.

### 4. Error red in the live-red family dilutes the one signal a sports app needs
dE live/danger is 3.0 by design, separated by form. I proposed it to fix pink. On reflection the cost is higher than I said: in a player or channel row, a red buffering/error message and a red LIVE dot are the same hue at the same size, and the owner scans for red to find the game. Fix: make errors neutral. Message in text-1 on surface-3 with a ✕ icon in text-2; reserve red for LIVE and for destructive confirmations. This also drops the fragile "never in one component" rule. Danger tokens stay for form validation only.

### 5. Wordmark has nothing ownable except colour
Heavy wide grotesque, stem 23, counters 16 in the E. It is clear and correct for TV, and your decision not to touch E is sound. But it is the part people will look at most (banner), and it is anonymous next to Netflix's N, Plex's chevron or ESPN's custom face. Fix (optional, only if the owner wants more brand): see problem 1's wordmark idea; otherwise accept "generic but legible" and stop spending effort here.

### 6. The sample screen contradicts the rule it demonstrates
`tv-1080.png` shows the rail T (top-left) and the full lockup (top-right) together, which is the original "T ... TUNER" double-T complaint at distance. Also the Warriors team bar is brand-amber-yellow next to the amber primary button, so "amber = ours" is muddied by data colour. Fix: show rail mark only when no lockup is on screen (lockup is splash/sign-in only), and mute away-team colours that fall within 10 dE of the accent (use text-3 bar).

### 7. Housekeeping
- `on-accent` `#1D1409` (warm) and `ink` `#12161D` (cool) are two near-identical dark colours on amber; pick `#12161D` for both.
- The amber banner's loudness in a dark room is unverified. The dark alternative exists; test both on the Philips in Standard and Vivid before choosing.

## What would take it to 7.5+
1. Settle problem 1 with a render: plain T, 6-unit seam, or a wordmark-level needle; choose by 14 px / blur / 88 px, not by story.
2. Ship `icon-small.svg` (problem 2).
3. Make errors neutral so red means live (problem 4).
4. Verify banner and tile on the real TV.
Everything else is polish.
