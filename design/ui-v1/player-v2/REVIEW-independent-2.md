# Player v2: independent review 2 (of v1.1)

Reviewed: `SPEC.md` (with "v1.1 changes"), the fifteen mocks and `png/` at 1920 x 1080, `contact-sheet.png`,
`player-v2.css`, `tools/contrast.js` (run here), against today's player (`player-now/` shots 61, 94, 96, 132),
Home (`home-final/png/01`) and review 1. Coordinates are dp on the 960 x 540 canvas (half the PNG's pixels).

**Overall: 8.1 / 10.** v1.1 is a real step up. The six must-fixes from review 1 are fixed, or mostly fixed, in the
mocks. The bar now looks like it belongs next to Netflix's 2026 test player and tvOS. What's left is smaller but
real: the new floating button label has no protection on a bright picture, which is exactly the NBA hardwood
case. One number in the hero screen contradicts itself. And the spec's own decisions section still describes
v1.0 in four places, so a builder reading top to bottom would build the wrong thing.

## 0. Review 1, point by point

| Review 1 | Status | What I checked |
|---|---|---|
| M1 contrast on bright frames | **Fixed for what is measured** | Ran `tools/contrast.js`: 01 lowest 5.29 : 1, 02 5.36, 05 5.29, 14 7.60. Same as the spec. But the tool **does not see the text shadow**. I ran it on a copy with every shadow removed and got the same numbers to two decimals (Chrome drops the shadow of transparent text). So the numbers come from the scrim alone. That is conservative, which is good news, but the spec's "the text made transparent so its shadow still draws" is wrong. The floating label (`.lbl`) has no shadow and isn't covered by the claim (see 1.4) |
| M2 bright frames in the set | **Partly** | `14` is not near-white. It is an overcast snow field whose top half is dark cloud, so the title block sits on dark, and the bright snow sits under the 92 % bottom scrim. `15`'s court is drawn, with focus on the thumb, so the one text that would fail there (the button label) is never shown. A real broadcast frame is owed, as the spec says |
| M3 one LIVE | Fixed | 08: banner drops LIVE; the track's pill is the only one |
| M4 LIVE pill fits | Fixed | 08 / 09 / 15: pill y 461–481, hint caps from y 487 |
| M5 chapters to the live point | Fixed | 09, 15 and 10 agree: Tip-off, Q2, Half, Q3; live in Q3 |
| M6 visible resting focus | Fixed | 22 dp thumb with the gap and the white ring reads at once in 01, 08, 09, 14, 15 |
| S1 scrub row 0 % | Fixed in mocks and 4.3 | decision 6 still says "fade to 22 %" |
| S2 steady state, no live bottom scrim | Fixed | 12, 13 |
| S3 ▲ on Next episode during Up next | Fixed | 05, 4.5, the keys table |
| S4 live pause dims; replay days off the corner | Fixed | 08; decisions 3 and 13 still put "Replays for 3 days on this channel" in the corner |
| S5 three visual languages | Done, with a cost | keys filled, buttons outlined, facts filled. But Home's caps and its `4K` tag are **outlined** (home-final 01: `→`, `Hold`, `4K`), so the player now departs from Home and doesn't say so. Decision 10 still says "outlined, the style Home's cards use", and the filled 62 % cap disappears on dark pictures (1.4) |
| S6 port notes | Fixed | section 8 |
| S7 low-contrast logo falls back to text | Fixed | 04 |
| Nits | ⏯ 17, Paused glyph 14, wall clock, three tags: fixed | `You're in Q2` next to the lit `Q2` label: still there |

## 1. The design, screen by screen

### 01 VOD playing / 12 steady state
- **Premium now.** There's no box. The logo title and the corner sit on a heavier top fade, the buttons sit over a
  full-width 6 dp track, and the gradient is the one coloured line. This is the same arrangement as Netflix's 2026
  TV test (actions just above a larger scrubber) and Apple's tvOS player (title top-left, times at the track's
  ends). 12 is the screen he will live with, and it is clean: two rows, a corner, and 60 dp of air under the ends row.
- **The corner contradicts the bar** (must fix). `21 min left` (x 840–912, y 56–72) against `−25:50` at the track's
  right end (y 460–480). It's the same in 02, 03 and 12. 05 (`2 min left`, `−2:12`, ends 21:02) implies a 60 min
  episode with the clock at 20:36, so the corner should read `26 min left`. Home's 01 also says 21 min left at 20:41,
  so the scenario was split between the two. The corner exists to tell the truth about time; the hero mock can't
  disagree with itself by five minutes.
- `4K` is shown twice: the tag at the end of the sub line (x 235–265, y 78–98) and `4K HDR` at the start of the
  st-what line right under it. Same in 04, 05 and 14 (`4K, 5.1`). Keep the st-what line (it's the measured truth)
  and drop the tag.
- Bottom tiers in the first 5 views: the ends row (y 460–480) and the hint (y 487–509) are still 7 dp apart and read
  as one band. It's acceptable now that the hint caps are filled and the hint retires.

### 02 Paused
- The `Paused` tag, `21 min left` first, `Ends at 21:02 if you play now`, the story line and the 35 % dim are the
  best pause screen of any player I compare against. Netflix shows the synopsis; nobody else fixes the drifting
  "Ends at".
- The story line (text-2, y ~132–146) sits where the top scrim is thinning, below its 55 % stop. On a white top
  frame that is about 2.9 : 1 from the scrim alone (my calculation: about 58 % bg-0 over white). The shadow will
  carry it, but nothing measures that (see M1). Measure it on a white top frame.

### 03 Scrubbing
- Fixed and clean. The bubble and `▶▶ ×8` own the line above the thumb, and the row is gone. This is the Apple and
  Netflix behaviour.

### 04 Buttons, Skip intro
- Still the best screen. `Skip intro · 1:12` above a focused pill with the house ring is tvOS done well. The text
  title fallback for the grey-on-brick wordmark is right.
- The hint caps vanish here. On the dark coat, `OK` (x 48–80, y 487–509) and `Back` have no visible cap, because
  bg-0 at 62 % over near-black is near-black. The keys read as bold words, which undoes S5 on dark scenes, and most
  films are dark.

### 05 Up next
- ▲ now lands on `Next episode` with its label. That's right.
- The counting card's bottom (y 378) is **4 dp** above the CC / Audio / Picture discs (y 382). It looks stacked onto
  them. Give it 12–16 dp (bottom at y 366), or move it left of the right group.
- Two things say "next episode, S2 · E4" at once: the label over the pill and the card. Acceptable while it counts,
  but the label could read just `Play now` here.

### 06 / 13 Live banner
- A big improvement on today's 64 dp box: the programme in Outfit 24 is the line you zapped for, with the wall clock
  `Wed 22:42` in Home's format and three tags plus LIVE at the right. 13 (no bottom scrim) leaves the broadcast alone.
- Line 3 runs on: `Next 23:50 Collateral   Subtitles · Replays 3 days` (x 332–654, y 93) has only a gap between
  `Collateral` and `Subtitles`, so it reads as one title. Put a `·` there, or put the channel facts after a wider
  14 dp gap in text-3.

### 07 Zapping
- The dim, the card and `Connecting…` are right. But the banner (top) and the card (centre) print the same channel
  name and the same programme at the same moment, so half the screen says the same thing twice. YouTube TV and Sky
  show one. Keep the card for the wait and hold the banner until the first frame, or slim the card to the tile and
  `Connecting…`.
- `Connecting…` is indented 7 dp from the lines above it (x 392 vs 385): it is the cap's padding, and it looks like
  an alignment slip. Align the cap's edge, not its text.

### 08 Live paused
- One LIVE, the dim, `2:40 behind live` / `Paused at 22:39`: correct and clear.
- **The live dot hides under the focused thumb.** The thumb is at x ~532 and the dot at ~550, and the ring's outer
  radius is 16.5 dp, so the ring covers the red dot. Anything under about 4 min behind (the usual case right after
  ⏯) will look like this. Draw the dot above the ring, or nudge the ring's gap colour to the live red when they
  touch.
- Two progress bars of the same programme: the banner's 120 x 4 bar (x 262–382, y 92) and the track. Drop the
  banner's mini bar while the track is up.
- The right column is now four layers (clock + tags, Paused, 2:40 behind live, Paused at 22:39). That's heavy but
  ordered. `Paused at 22:39` is the weakest line; it could go.

### 09 / 15 Game replay
- The spoiler handling is still the strongest thing in the set: `Score hidden`, no elapsed, `End hidden`, chapters
  only to the live point, the compact LIVE in the ends row.
- 15 holds up on the drawn court for everything it shows. But focus is on the thumb, so it never shows the floating
  label. That label is the text most at risk: it sits at y 356–374, where the bottom scrim is at only about 35 %.
  Sampled from 15's PNG in that band, the backdrop gives chalk about **3.2 : 1** (90th percentile 2.9), and about
  4.1 on 14's snow. With no shadow and no backing (`player-v2.css` line 80), `Back to live · …` or
  `Skip to Q3 · …` over hardwood will be weak from the sofa. The spec lists this as an open item for 05 only.
  It is the owner's main use.
- `You're in Q2` in the corner repeats the lit `Q2` under the thumb (nit, kept from review 1).

### 10 Game panel / 11 Options
- Unchanged in shape, consistent with the house panels. The Quarters list now matches the ticks. Fine.

### Against the references
- **Premium:** the logo title, the single gradient line, the label over the focused button, the pause copy, the
  spoiler-aware ends row, the clean steady state (12, 13). In 12 it's a peer of Netflix and Apple TV.
- **Off:** the label on bright frames, the caps disappearing on dark ones, the duplicated zap info, the live dot
  under the ring, the 4 dp Up next card, and the duplicated 4K.

## 2. Remote and flow

Nothing is lost against today: OK pause, ◀ ▶ 10 s and hold-to-scrub, ▲ to the row (Skip, Next episode during Up
next, else Play), ▼ Options, Back hides then leaves, live OK = channels, ▲ ▼ zap, Hold OK last, ⏯ live pause,
`Back to live`, the game panel, Sync, chips, the score bug. The key maps are unchanged, which is right after the Plex
lesson the spec cites.

One flow issue. After 2 min paused the controls fade to 35 %, and "any key restores them, nothing else happens on
that press". But they are still visible at 35 %, so he will press OK to play and nothing will happen: one wasted
press, every long pause. Let OK and ⏯ act at once (and restore), and swallow only the arrows.

## 3. Buildability

- **The spec contradicts itself.** A builder reads section 1 first, and it is still v1.0 there:
  - decision 6 fades the row "to 22 %"
  - decision 10 has "outlined" caps (1.5 dp `BORDER_STRONG`, bg-0 50 %), but table 3 has filled `KEYCAP`
  - decisions 3 and 13 put `Replays for 3 days on this channel` in the corner
  - section 9 has "16 idle" for the thumb, but table 3 has 14
  - decision 8 has no clock, and "tags and LIVE at the right" doesn't mention the behind-live rule

  Fix these in place, not only in the v1.1 list.
- **The shadow.** The mocks draw two shadows (`0 1px 2px` at 70 % plus `0 0 10px` at 55 %), but `setShadowLayer` is
  one layer per `TextView`. The port's look will differ (softer, wider halo). Either mock the single layer the port
  draws (Android radius 10 is about CSS blur 12.6), or have a small `ShadowText` draw the text twice. Contrast isn't
  at stake, because the measurement doesn't include the shadow anyway.
- **The label is placed in `onLayout`.** That's right, but focus changes don't trigger a layout. Place it from the
  focused child's `getLeft()` / `getWidth()` in the focus listener (after the first layout), or call
  `requestLayout()` on focus.
- **The logo 3 : 1 rule is checked against the backdrop art's top-left**, through `art.js`'s probe. The player
  can't read video frames (SurfaceView). Say that it's a proxy for the frame.
- Everything else is plain views and realistic: `ShapeDrawable` + `LinearGradient` scrims, `DashPathEffect` for the
  not-aired part, the ring drawn in `Track.onDraw`, the alpha animations, the `Track` merge. The file order in 8 is
  good.

## 4. Scores

| | Score | Why |
|---|---|---|
| Looks and craft | 8.3 | clean, modern, in the Netflix / tvOS family; still has the label on bright frames, the caps on dark, the dot under the ring, the 4 dp card gap |
| Clarity | 8.0 | the corner and pause copy are excellent; the 21 vs 25:50 contradiction, the duplicated zap info, two progress bars in 08, line 3's run-on |
| Ease with the remote | 8.5 | maps unchanged, ▲ lands on the thing you want; the swallowed OK after the 2 min fade |
| Completeness against today | 8.5 | nothing lost, every state drawn, the steady states added |
| Buildability | 7.5 | realistic views and good port notes, but decisions 3, 6, 8, 10 and section 9 contradict table 3, and the shadow mocked isn't the shadow built |
| Brand fit | 8.0 | the logo title, Home's clock format, the house ring; caps and tags now differ from Home's outlined style without saying so |
| **Overall** | **8.1** | design weighted first |

## 5. Fixes

**Must fix**
1. **01 / 02 / 03 / 12, corner vs ends:** `21 min left` against `−25:50`. Make the scenario agree (`26 min left`,
   or an ends row of `−20:50`), and keep Home's 01 in step.
2. **The focused button's label on bright frames** (05, and any game replay): y 356–374 measures about 3.2 : 1 on
   15's court. Give `.lbl` the shadow, plus a `KEYCAP` backing if it still fails. Add a mock of 15 with a button
   focused (`Back to live`), and extend `contrast.js` to it.
3. **SPEC section 1 and section 9 still describe v1.0** (decision 6's 22 %, decision 10's outlined caps, decisions
   3 / 13's corner replay line, section 9's 16 dp thumb, decision 8 without the clock or the behind-live rule). Make
   them match table 3 and the mocks.

**Should fix**
1. 08: the live dot hides under the focused thumb's ring when just behind live; draw it on top.
2. 07: the banner and the zap card show the same name and programme at once; show one of them.
3. 04 and every dark scene: the filled 62 % caps vanish. Add the 1 dp `GLASS_EDGE` stroke (it stays distinct from
   the buttons' 2 dp outline), and note the departure from Home's outlined caps in section 9.
4. 05: the Up next card is 4 dp above the right group; give it 12–16 dp.
5. 2 min fade: OK and ⏯ should play at once, not just wake the controls.
6. `contrast.js` and v1.1 change 1: the shadow is not measured. Correct the wording, and mock the single-layer
   shadow the port will draw (or plan two layers in a `ShadowText`).
7. 14: it isn't a near-white top. Add a bright-sky or white-room frame under the title block (02's story line is the
   text to watch).
8. 08: drop the banner's mini progress bar while the track is up.
9. Port: place the label on focus change, not only in `onLayout`; say the logo's 3 : 1 check is against the art,
   not the frame.

**Nits**
- 01 / 04 / 05 / 14: `4K` is in both the sub-line tag and the st-what line; drop the tag.
- 06 / 08 / 13: line 3 needs a `·` between `Collateral` and `Subtitles`.
- 07: `Connecting…` is indented 7 dp from the lines above.
- 09 / 15: `You're in Q2` repeats the lit `Q2` label.
- 08: `Paused at 22:39` is the least useful line in a four-layer corner.
