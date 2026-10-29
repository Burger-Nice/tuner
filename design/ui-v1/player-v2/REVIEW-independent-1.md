# Player v2: independent review 1

Reviewed: `SPEC.md`, the eleven mocks and `png/` (1920 x 1080), `contact-sheet.png`, `player-v2.css`, against today's
player (emulator shots 61, 94, 96, 112, 132 and others) and Home (`home-final/png/01`). Coordinates below are dp on
the 960 x 540 canvas (half the PNG's pixels).

**Overall: 7.4 / 10.** The direction is right and most of it is well made: taking the box away is the single biggest
improvement available, and it lands. What holds it back is that a scrim-only design lives or dies on bright
pictures, and the mocks never show one (the one bright frame they do have fails), plus a handful of
contradictions in the live and replay states that a month of use would expose.

## 1. The design, screen by screen

### 01 VOD playing
- **What works.** This is now in the family of Netflix 2026 / Apple TV: buttons over a full-width track, title
  top-left, one useful fact top-right. The Cinemeta logo as the title is the strongest single move; it ties the player
  to Home's Marquee (`home-final 01` shows the same Severance logo) and makes the bar feel like part of the product,
  not a utility. The single gradient on the played part is disciplined and correct; the translucent discs keep the
  picture in charge. `Ends at 21:02 / 21 min left` is the right corner content.
- **Contrast over bright frames fails here.** The sub line and the st-what line sit on the Severance ceiling lights.
  Sampled from the PNG: behind `Who Is Alive?` (x 210, y 75) the composite is about rgb 129 (L 0.22), so `text-2`
  (#D2CEE2) is about **2.5 : 1**; behind `Icelandic subtitles` (x 350, y 125) it is about rgb 172 (L 0.41), about
  **1.5 : 1**. You can see it in the PNG: the green tick line reads as grey on grey. The top scrim's 42 % stop at 55 %
  of 200 dp is too light for 15 px text-2 at 3 m. Netflix and Apple both use a heavier top fade plus a soft text shadow.
- **The bottom is four tiers in 125 dp** (buttons 382–426, track 438–458, ends 460–480, hint 489–507). The ends
  row and the hint caps are 9 dp apart and the outlined caps (`OK`, `Back`) look like a third row of buttons, because
  they share the outlined-rounded-rect language of the `Next episode` pill and the `4K` tag. Netflix and Apple have no
  hint row at all. The hint goes after 5 views (UI-SPEC 7), so the screen he lives with is the one without it, and
  **no mock shows that steady state**.
- **The resting focus is nearly invisible.** Focus rests on the thumb (decision 4.1), and in the mocks the focused
  thumb is a chalk disc with a white ring and no gap (`player-v2.css` line 86 notes the 2.5 dp gap is native-only), so
  the ring merges into the thumb and focus reads as "a slightly bigger dot". Today's player at least ringed a disc. This
  is the state he sees every time he presses a key.

### 02 VOD paused
- Good: the `Paused` tag, minutes-left first and `Ends at 21:02 if you play now` is a genuinely thoughtful fix of a
  real lie; the story line under the title is the Netflix pause move and suits him. The 2 min fade to 35 % for the
  OLED is well reasoned.
- The 35 % dim is hard to see in the PNG next to 01; from the sofa "paused" will be carried by the glyph and the tag
  (a 12 px glyph at 14 px type, top-right). Fine, but don't rely on the dim.

### 03 Scrubbing
- The chalk bubble with its point and the `▶▶ ×8` chip are clean and the right size. No-thumbnails is correctly
  argued.
- The button row at 22 % reads as a rendering glitch (ghost discs, a ghost `Next episode` pill). Apple and Netflix
  remove the row entirely while scrubbing. Either 0 % or leave it at 100 %; 22 % is the one value that looks broken.

### 04 Buttons, Skip intro
- The best screen. The label above the focused button (`Skip intro · 1:12`) is the tvOS pattern done well and lets the
  discs stay small; the ring on the pill is the house ring. `Back to intro` after a skip is kept.
- The `SLOW HORSES` logo is a low-contrast grey wordmark on a dark brick wall; logos with no ink contrast need a rule
  (fall back to the text title when the logo's luminance against its backdrop is low, or add the shadow).

### 05 Up next
- The card above the right group is tidy. But see 2: with the card counting and the controls up, ▲ lands on Pause,
  and `Next episode` is three ▶ away.

### 06 Live banner
- A real improvement: the programme in Outfit 24 is the right big line (that is why you zapped), the channel name
  and ring on line 1, times with a 4 dp progress and `Next` on line 3. It reads like Home's typography.
- The tag cluster at top-right (4K, HDR, CC, kept glyph, LIVE) is five outlined/filled lozenges in a row; it is the
  busiest spot on the screen. CC and the kept glyph could merge into the line-3 text.
- There is no wall clock anywhere in the live player. At 02:00 tip-offs, a time of day on the banner earns its place
  (most IPTV live players show it). I couldn't confirm whether today's banner has one; if not, it isn't a loss.
- The `⏯` glyph in its key cap is too small to read (x 180–220, y 488–508).
- A 250 dp bottom scrim drawn for a hint row alone (live, no bar) darkens the lower half of the broadcast for 4 s
  per zap. After the 5 views it must not be drawn.

### 07 Zapping
- The lighter card, `Connecting…` and the instant dim are correct and match what Sky / YouTube TV do. Good.

### 08 Live paused, behind live
- **Two LIVE pills, one of them false.** The banner's red `LIVE` tag (x 845–912, y 38–65) still says LIVE while the
  corner under it says `2:40 behind live`, and a second red LIVE sits under the track. Behind live, the banner's pill
  must go (or become a neutral `2:40 behind`).
- The track's LIVE pill (x 562–628, y 460–486) runs into the hint bar's `Back` cap (y 486): 0–1 dp apart. Same in 09
  (x 630–698). The 22 dp pill does not fit in a 20 dp ends row with the hint 9 dp under it.
- The right-hand column is now four stacked things (tags, Paused, 2:40 behind live, Replays for 3 days...), heavier
  than the left block. `Replays for 3 days on this channel` is a fact for the first time, not every pause.
- VOD pause dims the picture; live pause doesn't (spec 4.8 is silent). Pick one.

### 09 Game replay timeline
- Spoiler discipline is excellent and visible: `Score hidden / You're in Q2`, no elapsed, `End hidden`, chapters as
  the navigation. This is better than anything the big players do for sport.
- **The data contradicts 10.** The track puts the Q4 tick at 79 %, past the live dot at 66 %, i.e. in the part not
  aired yet; mock 10's panel lists Q4 as aired at 03:52. A tick on the not-aired part is a guess, and the spec says
  "OT once played" but draws Q4 before it is played. Chapters should only be drawn up to the live point.
- **The picture is a stand-in, and it is the wrong stand-in.** The owner's main use is NBA, and a real broadcast is
  bright hardwood across the bottom third with the broadcaster's own graphics. Two dark crests on navy and maroon
  prove nothing about the scrim. Today's shot 61 (colour bars under the bar) is the honest test, and v2 never faces it.
- Row of 10 focus stops (Pause … Picture): long, but it matches today's.
- `You're in Q2` repeats the chalk-lit `Q2` label right under the thumb. One of them is enough.

### 10 Game panel
- Unchanged in shape, the team-secondary crest edge is a nice touch and on brand (real team colours). Fine.

### 11 Options
- 46 dp rows fit eight rows under the cap without scrolling: right call. Disabled Audio is legible as disabled.
  Unchanged look, as intended.

### Against the references
Premium: the logo title, the single coloured line, the focused-button label, the pause copy, the spoiler handling.
Off: the bright-frame contrast, the four-tier bottom, the outlined-everything sameness (pills, caps, tags and LIVE are
all outlined rounded rects, so nothing is clearly "a key" vs "a button" vs "a fact"), the ghosted scrub row and the
duplicate LIVE.

## 2. Remote and flow

Presses, from the controls hidden:

| Action | v2 | Today | Note |
|---|---|---|---|
| Pause / play | OK | OK | same |
| Seek 10 s | ◀ / ▶ | same | same |
| Skip intro (fresh) | ▲ OK | ▲ OK | lands on the pill |
| Subtitles | ▼ OK (Options first row) or CC key | same | good |
| Quality | ▼ ▼▼▼ OK | same | fine |
| Next episode while Up next counts, controls up | ▲ ▶▶▶ OK | same | should land on it (see should fix) |
| Back to live (replay) | ▲ ▶×5 OK | similar | acceptable; Back to live leads the right group |
| Game panel (replay) | ▲ ▶×6 OK or ▶ from hidden | same | fine |

Nothing is lost: skip intro and back to intro, Up next, subtitles, audio, picture, quality, connection, speed,
frame-rate match, intros-in-this-show, live banner and ring, zap card, Hold OK last, live pause, catch-up timeline,
game replay panel with Sync, the score bug, the chips. The key maps are explicitly unchanged, which is the right call
after the Plex lesson the spec cites.

After a month: the hint row is gone (good), the 2 min pause fade is invisible until needed (good). What will grate: the
false LIVE pill every time he pauses live TV; the faint thumb focus; the ghost row on every scrub; the bottom scrim on
every zap if it is kept without the hint.

## 3. Buildability (section 8)

Realistic and well ordered; nothing needs blur, Compose or a new library. Notes:
- `GradientDrawable.setColors(int[], float[])` with offsets is API 29; `minSdkVersion` is 24. Use the
  `ShapeDrawable` + `LinearGradient` path the spec already names, and make it the only path.
- The logo: `meta.logo` is a URL, but the crop-to-ink lives in `art.js` in the WebView. The native view would get the
  uncropped PNG with its transparent bleed, so the logo won't sit on x 48. Either send the ink box with the URL or crop
  by alpha in `Images.java` (a cheap bounding-box scan).
- The label over the focused button needs positioning after layout (`OnGlobalLayoutListener` or in the row's
  `onLayout`), not in `draw()` as the spec says; a `TextView` moved in `draw()` lags a frame.
- A text shadow (`setShadowLayer`) is free on these TextViews and is the cheapest fix for the contrast problem.
- One `Track` for VOD and the timeline is a good consolidation; the ends row drawn in the same view is right.

## 4. Scores

| | Score | Why |
|---|---|---|
| Looks and craft | 7.5 | clearly modern and closer to Netflix / Apple; let down by bright-frame contrast, the crowded bottom, the invisible resting focus, the ghost scrub row |
| Clarity | 7 | the corner and the button label are excellent; the false LIVE, the Q4 contradiction and outlined-everything muddy it |
| Ease with the remote | 8 | maps unchanged, Skip intro on ▲; Next episode during Up next should get the same treatment |
| Completeness against today | 8.5 | everything is accounted for, with a section on what's unchanged |
| Buildability | 8 | plain views, a good file order; the API 29 gradient, the logo crop and the label placement need a line each |
| Brand fit | 8 | the logo title and the outlined caps match Home; the type scale is the house scale |
| **Overall** | **7.4** | design weighted first |

## 5. Fixes

**Must fix**
1. 01 / 02 / 04, title block: contrast over bright frames (`text-2` at about 2.5 : 1 and 1.5 : 1 on the ceiling).
   Darken the top scrim's middle stop (78 → 60 % at 55 %, not 42 %), add a soft text shadow, and re-render 01 to show
   it passes 4.5 : 1 on that frame.
2. 09 (and a new mock): show the bar over a real bright NBA frame (hardwood, broadcaster graphics) and a near-white
   frame. The scrim's weight is decision 1's whole bet and is untested in the set.
3. 08: remove the banner's red LIVE tag while behind live (one LIVE on screen, and only where it is true).
4. 08 / 09: the track's LIVE pill touches the hint bar's `Back` cap. Give the ends row room (shrink the pill to the
   20 dp row, or move it onto the track line beside the dot).
5. 09 vs 10: chapter data contradicts itself (Q4 tick in the not-aired part vs Q4 aired at 03:52). Draw ticks only up
   to the live point; fix the scenario so both mocks agree.
6. 01 / 05 / 09, the resting focus: the focused thumb must show its ring with the gap in the mocks and be clearly
   distinct from the idle thumb (that is the state behind every key press).

**Should fix**
1. 03: hide the row while scrubbing (0 %), not 22 %.
2. 01 etc.: add the steady-state mock without the hint bar (what he sees after 5 views), and don't draw the bottom
   scrim for the live banner once the hint has retired.
3. 05: while Up next counts, ▲ lands on `Next episode` (same rule as the fresh Skip pill).
4. 08: decide dim-on-pause for live as for VOD; show `Replays for 3 days...` the first time per channel only.
5. Separate the languages: key caps, outlined pills, quality tags and LIVE all read as the same object. Caps could
   drop the outline for a filled `bg-0 50 %` with no stroke, or pills could take the `GLASS_PILL` fill without the 2 dp
   outline.
6. Port: logo crop (ink box from JS or alpha crop native), the `LinearGradient` path only, label placed on layout.
7. 04: a low-contrast logo rule (fall back to the text title).

**Nits**
- 06: the `⏯` glyph in its key cap is unreadably small.
- 06: five tags at top-right; fold CC and the kept glyph into line 3.
- 09: `You're in Q2` duplicates the lit `Q2` label.
- 06: consider a wall clock on the live banner for late games.
- 02: the `Paused` glyph at 12 dp is small for the sofa.
