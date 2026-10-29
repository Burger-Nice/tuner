# airglow TV: the player's controls, v2

The look and layout of everything the player draws while you watch: the bar for films and episodes, the catch-up
timeline, the live banner and zap card, the chips, the hint bar, and the panels' tokens. Behaviour stays as the
specs that own it: `design/ui-v1/UI-SPEC.md` 7 (the native player), `catchup/SPEC.md` 6 to 7 (the timeline, the
replay state, the shield), `skip/SPEC.md` (chips, pills, Up next), `subtitles/SPEC.md` 7 (the st-what line),
`diagnosis/SPEC.md` (stalls, Connection). Where this spec says a size, a colour or a place, it wins over those; where
it says nothing, they stand.

The owner's brief: "let's modernize and improve the bar for when watching something; I think it can look cleaner
and nicer."

| File | What it is |
|---|---|
| `SPEC.md` | this |
| `01` to `15` `.html` | the mocks at 960 x 540 (dp = CSS px); `png/*.png` their 2x renders, `png/contact-sheet.png` all fifteen |
| `art/snow-field.jpg` | the near-white frame for `14` (CC0, Wikimedia Commons, "20220221 Snow field") |
| `tools/contrast.js` | measures every text's contrast against what is really behind it (picture, scrims, the text's shadow), per mock |
| `REVIEW-independent-1.md` | the review of v1.0 (7.4 / 10) that v1.1 answers |
| `player-v2.css` | the new look as CSS, class per native view (`pv-*`), written as the port's checklist |
| `tools/build.js` | builds every mock from one scenario; `tools/pages.json` the list; `tools/render.js` the PNGs |

The scenario: the owner's TV, Reykjavik time, shield `My team`. Wed 28 Oct 2026 evening he watches Severance S2 E3
and Slow Horses S6 E4 from his add-ons (the art is Cinemeta / metahub's, the same files Home uses); his provider's
Sky Cinema Action HD shows Heat; the Grizzlies play at Portland Thu 29 Oct 02:00 and he starts from tip-off at 03:12
while the game is still on (Home's game-night scenario). The game picture is a stand-in for the broadcast.

## v1.1 changes (an answer to the independent review)

Must fix, all six:
1. **Contrast on bright frames.** The top scrim's middle stop goes from 42 % to 68 % (84 % at the edge, over 220 dp),
   every top-block, corner and banner text gets a soft shadow (`setShadowLayer(10, 0, 1, black 70 %)`, free on a
   `TextView`), and the st-what line is chalk, not `text-2`, because it sits where the scrim is thinnest. Measured with
   the new `tools/contrast.js` (the text made transparent so its shadow still draws, the backdrop read back through a
   canvas): the worst text in the set is now **5.29 : 1** at the median backdrop (`01`, the episode line on the
   Severance ceiling; the st-what line was 3.70 : 1 before, 1.5 : 1 by the reviewer's point sample). Every text in every
   mock passes 4.5 : 1 at its median backdrop; the 90th-percentile column (the brightest gaps between strokes) is above
   4.5 everywhere but `05`'s floating label and `02`'s story line on the ceiling.
2. **Bright frames in the set.** `14` is the bar over a near-white frame (a CC0 snow field, the whitest thing a film
   can throw); `15` is the replay timeline over a bright court (hardwood across the lower two thirds, a broadcaster's
   bug top-left). Both pass. The court is drawn: Commons rate-limited the image search in this session and the one
   arena photo it returned was an exterior, so a real broadcast frame is still owed as an open item (10).
3. **One LIVE, where it is true.** Behind live the banner drops its LIVE pill; the track's pill beside the live dot is
   the only one (`08`).
4. **The LIVE pill fits its row.** In the ends row it is the compact pill (20 high, 1.5 dp outline, 12 px), inside the
   20 dp row, 7 dp clear of the hint bar's caps (`08`, `09`, `15`).
5. **Chapters only up to the live point.** The track draws a tick when that chapter has aired; `09` and `15` show
   Tip-off, Q2, Half, Q3 with live in Q3, and `10`'s Quarters list the same four. Q4 appears when it airs, OT once played.
6. **A resting focus you can see.** The thumb is 14 idle and 22 focused with the house ring (3 dp white outside a
   2.5 dp bg-0 gap), in the mocks and the port.

Should fix:
- `03`: the row is gone while scrubbing (0 %), not ghosted at 22 %.
- `12`: the steady state after the hint bar's 5 views. `13`: the banner alone once the hint has retired, **no bottom
  scrim at all**; while the hint still shows on a live zap it sits on a 110 dp scrim, not the bar's 250 (`06`, `07`).
- `05`: while Up next counts, ▲ lands on `Next episode` (the fresh-Skip rule), so ▲ OK plays it.
- Live pause dims the picture 35 % as a paused film does (one rule, `08`); the corner says `2:40 behind live` and
  `Paused at 22:39`; the replay days moved onto the banner's third line (`Subtitles · Replays 3 days`), where they are
  a fact of the channel, not a reminder on every pause.
- Three languages, three looks: **keys** are filled caps (bg-0 62 %, no outline, `text-2`), **buttons** are the
  outlined pills and the edged discs, **facts** are filled `surface-3` lozenges with no outline; LIVE is the only
  outlined red thing. The banner's five lozenges become three (clock, 4K, HDR, then LIVE); CC and the kept glyph are
  words on line 3.
- Port notes in 8: the scrims are `ShapeDrawable` + `LinearGradient` only (`setColors(int[], float[])` is API 29,
  `minSdk` is 24); the logo comes with its ink box from `art.js` (or an alpha crop in `Images.java`); the label is
  placed in the row's `onLayout`, not in `draw()`.
- A low-contrast logo falls back to the text title: `04` shows it (the Slow Horses wordmark is grey on grey brick).
- Nits: the `⏯` cap is drawn at 17 px; the `Paused` glyph is 14; the banner shows the wall clock (`Wed 22:42`).

## 0. The idea in one paragraph

Today the bar is a 132 dp grey box over the picture, with a second text block at the top and a third row of keys
under it: three zones, four if a chip is up, and the box's empty middle is the biggest thing on screen. v2 takes the
box away. The controls sit **on the picture, over one scrim from the bottom**, in two rows: the buttons, then a
full-width track with its ends under it; the title block stays top-left on its own light scrim, now with the title
treatment Home uses, and the right-hand corner says one useful thing (Ends at, how far behind live, Score hidden).
The live banner becomes the same top block (number, logo, channel, programme, times, next), not a 64 dp box. Buttons
are translucent discs and outlined pills, chalk on the picture; the gradient is kept for the one thing that moves,
the played part of the track. The hint bar keeps its job and loses its filled caps. Nothing animates but opacity and
one 8 dp slide, nothing blurs, and every size is a number a `LinearLayout` can hold.

## 1. Decisions, with reasons

1. **No box.** The bar is drawn on a bottom scrim (`Ui.SCRIM_BOTTOM`, bg-0 at 0 to 92 % over 250 dp) instead of a
   `BANNER`-filled panel. Netflix, Apple TV, YouTube on TV, Disney+ and Infuse all draw their controls this way (2);
   the box was the one thing in the player that didn't look like the rest of the app, whose Home puts text on scrims
   over art (home-final SPEC 3). A scrim costs one `GradientDrawable`, the same as the box did.
2. **Two rows, one geometry for every kind of playback.** Buttons at y 382 to 426, the track centred at y 448 across
   the full safe width (x 48 to 912, 864 dp), the ends row at y 460 to 480. Films, episodes, kept programmes, live
   paused and game replays all use it; the only difference is what the ends row holds (times, or chapters and LIVE).
   Today VOD and the timeline had different bars (`VodControls` 3 rows, `Timeline` its own track); one `Track` view
   now serves both (8).
3. **The title block stays top-left; the corner says one thing.** Netflix, Apple TV, Disney+ and Prime put the title
   top-left and the transport at the bottom (2); YouTube's bottom title is the exception, and it buries the bar.
   The block carries the title treatment Home shows (the Cinemeta / metahub logo, 40 dp high, else the text title), the
   episode line, and the subtitles spec's st-what line. The right corner: `Ends at 21:02` over `21 min left` while
   playing; `Score hidden` / `You're in Q2` in a hidden replay; `2:40 behind live` / `Replays for 3 days on this
   channel` behind live. Nothing else goes up there.
4. **Paused says so, and the clock stops lying.** `Ends at` is computed from the remaining time, so while paused it
   drifts a minute a minute. On pause the corner shows a `Paused` tag, `21 min left` first, and `Ends at 21:02 if you
   play now` under it; the picture rests 35 % darker (`Ui.DIM`) so the frozen frame reads as paused from across the
   room, and one line of the story appears under the st-what line (Netflix shows the synopsis on pause; `meta.line`
   from the app, the same one Home's card shows). The controls never hide while paused (as today); **after 2 min
   paused they fade to 35 %** and any key brings them back, because the owner's set is an OLED and Apple's own
   guidance warns about retention from bright overlays (2). The picture is untouched: the TV's pixel shift handles it.
5. **The focused button names itself, above itself.** `Subtitles · Icelandic`, `Audio · English 5.1`, `Picture ·
   Fit`, `Skip intro · 1:12`, in Inter 650 14 chalk, 8 dp above the disc, no backing. tvOS's transport bar labels the
   focused control; it lets the icon discs stay small and the hint bar stay short (`OK Skip intro · ◀ ▶ Move · ▼ Seek
   bar · Back Hide`). One extra `TextView` per bar.
6. **Scrubbing clears the row.** While ◀ or ▶ is held the buttons fade to 22 % and the bubble (chalk, ink 700 15,
   with a 5 dp point down to the thumb) and the speed chip (`▶▶ ×8`) take their line, above the thumb. The bubble no
   longer fights the buttons for the same 28 dp. **No frame thumbnails:** Netflix and YouTube draw them, but they need a
   trick-play track (an I-frame playlist or a thumbnail sprite) and the owner's provider's streams and add-on links
   carry none; decoding frames from the network while seeking would stall the picture on this TV. The bubble shows the
   time, and in a game the chapter (`Q2 · 34:10`, never past Q4), which is the question a scrub asks.
7. **Translucent discs, outlined pills, one gradient.** Discs are 44 dp, bg-0 at 55 % (`Ui.GLASS`) with a 1 dp chalk
   edge at 14 % (`Ui.GLASS_EDGE`); pills are 40 dp, bg-0 at 45 % with the 2 dp `BORDER_STRONG` outline. Focused: the
   `surface-3` fill and the 3 dp white ring, as everywhere. No gradient disc: the picture is sacred (UI-SPEC 1.3) and a
   pink disc would be the brightest thing on it; the gradient stays on the played part of the track, so it is the one
   coloured line and it means progress, as on Home's cards.
8. **The live banner is the top block, not a box.** Number (Inter 700 24 `text-2`) · logo tile 44 · line 1 channel
   name and the zap ring (`Favourites · 3 of 10`) · line 2 the programme in Outfit 700 24 · line 3 `21:00 to 23:50`, a
   120 x 4 progress, `Next 23:50 Collateral`, `Feed 1 of 3` when it is a matched game; tags and LIVE at the right. The
   programme is now the big line (it was 14 dp `text-2`): that is what you zapped to see. Same 4 s, same instant fill
   on a zap. The banner and the VOD title block are one class of thing (`pv-top` / `pv-bn`), on the same top scrim.
9. **The zap card stays, lighter.** It still shows the next channel at once on key down (the first frame may be a
   second away and the old picture is still under it, so it keeps a backing: bg-0 at 82 %, radius 20, 1 dp edge). It
   adds the `Connecting…` key cap line so the wait reads as a wait, and the old picture goes to 30 % at once
   (`Ui.DIM` at 70 %), which is what the eye expects from a channel change.
10. **The hint bar keeps its place and loses its weight.** Text y 489 to 507 as the UI spec fixes it, on the same
    bottom scrim (no separate 56 dp scrim view). Key caps become outlined (1.5 dp `BORDER_STRONG`, bg-0 at 50 %, Inter
    700 13 chalk, 22 high), the style Home's cards use for `Hold` and `P−`, so the keys read as keys and not as more
    buttons. The 5-views rule and every label stay.
11. **The timeline's extras move into the ends row.** The live point is a 14 dp red dot with a 2 dp bg-0 edge on the
    track; its LIVE pill sits in the ends row 12 dp to its right (to its left within 90 dp of the end); chapter ticks
    are 2 x 14 `text-2` on the track and their labels in the ends row, the one you're in chalk 650; the ends are the
    programme's times, elapsed and remaining, or `[eye-off] End hidden`. Labels that would overlap a pill or an end
    are dropped, the current one first in line (as the Java already does). Nothing new to learn; it is the catch-up
    spec's row on the new scrim.
12. **Panels keep their shape; their rows take the bar's spacing.** The game panel (right 280), Options (left 384),
    Subtitles, Audio, Picture, Sync, Connection keep `Ui.PANEL` at 94 %, radius 16, the 1 dp border, the inset ring on
    `surface-3`, the 453 cap. Options rows go to 46 dp so eight rows and the header fit the cap without scrolling, and
    the crests in the game panel's plate take the team's secondary as a 2 dp edge (nba-pages's team edge), nothing else.
13. **Small words.** `Seek 10 s` becomes the hint on the thumb; `−10` / `+10` discs keep their numerals (Inter 700 15,
    tabular); `Back to live` keeps its pill; `Skip to Q3` and `Next episode` keep their chevron. The corner's second
    line is always the thing you can act on or wait for (`21 min left`, `You're in Q2`, `Replays for 3 days on this
    channel`), never a status word.

## 2. Research

What could be read from this session is marked **read**; the rest is from search summaries (the hosts could not be
fetched here) and is used only for layout facts several sources agree on.

| Source | What it backs |
|---|---|
| Apple, Human Interface Guidelines, [Playing video](https://developer.apple.com/design/human-interface-guidelines/playing-video) (**read**) | the transport bar carries playback tasks and a few actions below it in tabs; "provide only the most useful actions"; "some devices are prone to image retention, so it's generally better to keep overlays short and to prefer translucent graphics" (decisions 4, 7); thumbnails for scrubbing need a thumbnail track (6) |
| Android, [Playback controls on TV](https://developer.android.com/training/tv/playback/controls) (**read**) | centre = play/pause and shows the controls; left/right single press = ±N s, held = scrubbing; up/down "peeks" the controls without pausing. The key map stays as it is (5) |
| Netflix TV player test, July 2026 ([What's on Netflix](https://www.whats-on-netflix.com/news/first-look-netflix-new-tv-video-player-redesign/), summary only) | "Next Episode and additional settings now sit just above the main scrubber, which is notably a bit larger": buttons over a full-width track, no box (1, 2) |
| Netflix TV player (in use since 2022, from memory and the same report) | title top-left, synopsis on pause, 10 s skips, the remaining time at the track's end, thumbnails only where the stream has them (3, 4, 6) |
| YouTube on TV ([9to5Google, 2019](https://9to5google.com/2019/07/01/youtube-tv-progressive-fast-forward); [Neowin, 2024](https://www.neowin.net/news/youtube-starts-rolling-out-a-new-design-for-its-tv-app/), summaries) | progressive fast-forward, the longer you hold the faster (the ×2 to ×32 scrub stays); chapters as ticks on the bar; the title at the bottom (not followed, 3) |
| Infuse 8 ([Firecore's announcement](https://firecore.com/blog/infuse-8-now-available), summary) | "a contemporary design … easy access to commonly used options such as audio/subtitle track selection, volume boost, and playback speed", a translucent overlay without a panel (1, 7) |
| HBO Max help, [Playback options and controls](https://help.hbomax.com/Answer/Detail/000002510) (summary) | `Go Live` "in the lower right" during a live event, offered only when you are behind: `Back to live` leads the right group (11) |
| Disney+ redesign, Oct 2025 ([9to5Mac](https://9to5mac.com/2025/10/02/disney-reveals-app-redesign-coming-soon-to-ios-and-tvos/), summary) | the redesign was navigation and hero art; the player kept title top-left and a bottom transport (3) |
| Prime Video 2022 redesign ([TechCrunch](https://techcrunch.com/2022/07/18/amazon-refreshes-prime-video-design-with-icon-based-navigation-and-a-dedicated-sports-tab), summary) | end-of-episode options on screen; the player itself unchanged: nothing to copy, a caution against moving the bar for its own sake |
| Plex 2025–26 player changes ([Plex forums](https://forums.plex.tv/t/what-happened-to-the-player-bar-ui-missing-skip-etc/937849); [PiunikaWeb, May 2026](https://piunikaweb.com/2026/05/04/plex-fire-tv-redesign-unusable-users-slam-navigation/), summaries) | the cautionary case: floating play and skip buttons that replaced the bar, inconsistent scrub speeds, "no way to hide the controls": keep the track, keep Back = hide, keep one seek rule (2, 5) |
| `design/brand-v5/v5.4/tokens.css`, `design/ui-v1/UI-SPEC.md` 3 to 4 and 7, `home-final/SPEC.md` 3 | the tokens, the ring, the safe area, the scrims-over-art rule, Home's key cap style (7, 10) |

**Where this departs from them.** No thumbnails (6). The bar never hides while paused (Apple's player does), because
the owner's remote has no touch surface to wake it with and the pause state must stay readable; the 2 min fade is the
compromise. Live TV keeps the banner-only map with OK = channels (UI-SPEC 7), not Android's centre = pause, because
zapping is the owner's main use and the catch-up spec already gives ⏯ and Options › Rewind and pause.

## 3. Geometry, tokens, type

dp = CSS px on the 960 x 540 canvas. Safe area x 48 to 912, y 27 to 513. Text and focused things never leave it.

| Part | Position and size |
|---|---|
| Top scrim | `Ui.SCRIM_TOP`: y 0 to 220, bg-0 at 84 % → 68 % at 55 % → 0 (a `ShapeDrawable` with a three-stop `LinearGradient`) |
| Bottom scrim | `Ui.SCRIM_BOTTOM`: y 290 to 540, bg-0 at 0 → 62 % at 46 % → 92 %, drawn only with the bar; the hint bar alone (live, Options) takes `Ui.SCRIM_HINT`, y 430 to 540, 0 → 80 %; once the hint has retired a zap draws no bottom scrim |
| Title block | x 48, y 30, max width 600: logo 40 high (max 260 wide) or title Outfit 700 28/32; sub Inter 500 16/22 `text-2` (`S2 · E3 · Who Is Alive? · 4K` tag); st-what line Inter 500 15/20 **chalk** with the 16 dp tick; paused: the story line 15/20 `text-2`, 6 dp under. Every text here, in the corner and in the banner carries `setShadowLayer(10, 0, 1, 0xB3000000)`; the logo `ImageView` the same shadow drawn once into its bitmap. **A logo is used only when its ink passes 3 : 1 against the frame's top-left mean** (the 32 px probe `art.js` already runs), else the text title |
| Corner | right 48, y 32: line 1 Inter 650 18/22 chalk (with the eye-off glyph 16 before `Score hidden`); line 2 Inter 500 15/20 `text-2`; paused: a `Paused` tag (24 high, bg-0 55 %, 1 dp `GLASS_EDGE`, the pause glyph 14, Inter 650 14) above them |
| Live banner | x 48, y 30, right 48: number Inter 700 24 (44 line) `text-2`, min 30 wide · tile 44 (radius 8, `surface-2`, logo or initials) · column: line 1 Inter 650 16/20 chalk + ring Inter 500 14 `text-3` 10 dp after; line 2 Outfit 700 24/28, max 600, ellipsis; line 3 Inter 500 14/18 `text-2`: times · a 120 x 4 bar (`surface-2`, gradient fill) · `Next …` `text-3` · `Feed 1 of 3` · `Subtitles` · `Replays 3 days` (words, `text-3`) · the right cluster, 44 high, 8 gaps: the wall clock `Wed 22:42` (14 `text-3`), quality tags (filled `surface-3`, no outline), the LIVE pill (24 high, 2 dp) **only at the live point** |
| Zap card | centred; padding 18 / 28 / 18 / 20, radius 20, bg-0 at 82 %, 1 dp edge at 10 %; tile 64 (radius 12) · name Outfit 700 22/28 · now Inter 500 16/22 `text-2` (max 420) · `Connecting…` as a key cap 14 |
| Buttons row | x 48 to 912, y 382 to 426, gaps 10; the right group pinned right with a 0-weight spacer |
| Disc | 44 circle, `Ui.GLASS` (bg-0 55 %) with a 1 dp `Ui.GLASS_EDGE` stroke (chalk 14 %); glyph 22 chalk, or `−10` / `+10` / `−1m` / `+1m` Inter 700 15 tabular; focused: `surface-3`, no edge, 3 dp `FOCUS` ring |
| Pill | 40 high, padding 18 (14 beside a glyph or chevron), bg-0 45 %, 2 dp `BORDER_STRONG`, Outfit 700 16 chalk, glyph 20; focused: `surface-3`, 3 dp ring, no outline |
| Label | Inter 650 14/18 chalk, centred over the focused button, its bottom 8 dp above the row (y 356 to 374); the first button's label is left-aligned to it so it never crosses x 48 |
| Track | x 48 to 912, row y 438 to 458; the line 6 dp (radius 3) `surface-3` at 90 %; the played part the gradient (pink → orchid across the full width, as today's `Seek`); not yet aired: `bg-1` with a 1 dp dashed `BORDER_STRONG` edge (dash 4, gap 3); chapter ticks 2 x 14 `text-2`, **drawn only for chapters that have aired** (the live point is the limit); live point 14 red with a 2 dp bg-0 edge; thumb 14 chalk, focused 22 with the house ring (a 2.5 dp bg-0 gap, then 3 dp white) |
| Ends row | x 48 to 912, y 460 to 480, Inter 500 14/20 `text-2`: left end, right end (with the eye-off 16 for `End hidden`), chapter labels centred on their ticks (`text-3`, the current chalk 650; the first clamped to x 48, the last to x 912), the compact LIVE pill (20 high, 1.5 dp outline, 12 px) 12 dp right of the live dot, inside the row |
| Bubble | 28 high, radius 8, chalk fill, ink Inter 700 15, padding 10, a 5 dp point under it; the speed chip 28 high, `bg-1` with a 1 dp `BORDER_STRONG` edge, chalk 700 15; both at y 400 to 428, centred on the thumb and kept inside x 48 to 912 |
| Hint bar | x 48, text y 489 to 507; caps 22 high, min 24 wide, padding 7, radius 6, **filled bg-0 62 %, no outline**, Inter 700 13 `text-2` (the `⏯` glyph at 17); labels Inter 500 14 `text-2`, 7 dp after the cap, 22 dp between pairs; a dimmed cap (the OK guard) at 40 % |
| Chips | as the skip spec: right 48, bottom 64 … **with the bar up, above the row:** Up next's bottom at y 378 (the 60 chip at y 318), the 48 skip chip at y 330; the key column is not drawn with the controls up |
| Panels | unchanged: right 280 at x 632, left 384 at x 48, top 27, cap 453; Options rows 46 |
| Subtitles on the picture | unchanged (bottom 10 %); with the bar up the subtitle view's bottom is 8 dp above y 382 |

**New `Ui.java` tokens**

```java
static final int GLASS = 0x8C15131D;        // discs and the Paused tag: bg-0 at 55 %
static final int GLASS_PILL = 0x7315131D;   // pills: bg-0 at 45 %
static final int GLASS_EDGE = 0x24F3EFE6;   // the 1 dp edge on discs: chalk at 14 %
static final int DIM = 0x5915131D;          // paused: the picture 35 % darker; a zap uses it at 70 % (0xB315131D)
static final int[] SCRIM_TOP = { 0xD615131D, 0xAD15131D, 0x0015131D };      // 84 %, 68 %, 0 (positions 0, .55, 1), 220 dp
static final int[] SCRIM_BOTTOM = { 0x0015131D, 0x9E15131D, 0xEB15131D };   // 0, 62 %, 92 % (positions 0, .46, 1), 250 dp
static final int[] SCRIM_HINT = { 0x0015131D, 0xCC15131D };                 // 0, 80 %: the hint bar alone, 110 dp
static final int SHADOW = 0xB3000000;      // setShadowLayer(dp(10), 0, dp(1), SHADOW) on the top block, the corner, the banner
static final int KEYCAP = 0x9E15131D;      // the hint bar's caps: bg-0 at 62 %, no stroke
```

`PANEL`, `BANNER`, `SCRIM` stay for the panels, the cards and the chips. Nothing else is new: every text size and
colour above is a brand token already in `Ui`.

## 4. Every state

### 4.1 A film or episode, playing, controls up (`01`)

Any key but Back shows the controls (opacity 0 → 1 in 150 ms with an 8 dp rise of the bar, the scrims with it). Focus
rests on the thumb (the 22 dp ring). Row: `⏸` · `−10` · `+10` · `Next episode ›` (when there is one) · `Skip intro`
(while inside a window) | `CC` · `Audio` · `Picture`. Ends: elapsed and `−remaining`. Corner: `Ends at 21:02` /
`21 min left`. Hint (first 5 times): `OK Pause · ◀ ▶ Seek 10 s · ▲ Buttons · ▼ Options · Back Hide`. Hides after
4 s (200 ms fade), the scrims with it.

### 4.2 Paused (`02`)

OK on the thumb, ⏯, or ⏸: the Play glyph; `Ui.DIM` over the picture (under the scrims, 150 ms); the corner's `Paused`
tag, `21 min left`, `Ends at 21:02 if you play now`; the story line under the st-what line (when `meta.line` came with
the title). Never hides; after 120 s without a key the top block, the bar and the hint fade to 35 % (320 ms), the dim
stays; any key restores them and restarts the 4 s rule once play resumes. Hint: `OK Play · …`.

### 4.3 Scrubbing (`03`)

◀ or ▶ held: `scrubbing` as today (×2 a second to ×32). The buttons row goes (opacity 0, 120 ms); the bubble and the
speed chip appear over the thumb; the thumb and the played part follow `scrubPos`; the ends follow too. Release:
`seekTo`, the row comes back, the bubble goes. Hint while held: `◀ ▶ 10 s, hold for faster · OK Pause · Back Hide`.
In a replay the bubble reads `Q2 · 34:10`, never a chapter past Q4 (catch-up 6.2).

### 4.4 The buttons, Skip intro (`04`)

▲: focus to the row, on the Skip pill while its window is fresh (skip 3.3), else on Play; the label above the focused
button; ◀ ▶ move; OK does it; ▼ back to the thumb. The Skip pill is the last of the left group, 16 dp either side,
`skipFwd` 20, and after a skip `Back to intro` with `skipBack`. Hint: `OK Skip intro · ◀ ▶ Move · ▼ Seek bar · Back
Hide` (the OK label is the focused button's name).

### 4.5 Up next at the credits (`05`)

The counting card (skip 5.1) sits above the row, right 48, bottom at y 378; its ring counts, its key column is not
drawn while the controls are up. **▲ lands on `Next episode`** while the card counts (the same rule as the fresh Skip
pill), so ▲ OK plays it now; Back hides the bar (the card stays and counts). With the controls hidden the card is where the skip spec puts it (bottom 64) with its keys, and OK plays now.

### 4.6 A live channel: the banner (`06`)

On a zap, on Info, or 4 s after tuning: the top block as 3 (banner). At the right: the clock, `4K` `HDR`, LIVE;
subtitles and the replay days are words on line 3. No bar, no track: live at the live point has nothing to seek. The
first 5 views draw the hint on `SCRIM_HINT`; after that the banner is drawn alone, nothing over the lower half (`13`). Hint: `OK Channels · ⏯ Pause (kept, with
the key) · ◀ Options · ▶ Game / Live games / Info · ▲ ▼ Zap · Hold OK Last`. The score bug (top right) hides while the
banner shows, as today.

### 4.7 Zapping (`07`)

▲ ▼ pressed: the old picture under `DIM` at 70 % at once; the banner already the next channel's (from the guide
cache, `Connecting…` only when it has no guide); the zap card centred with the tile, name, what's on and the
`Connecting…` cap. Gone at the first frame (600 ms at least), the dim with it; the banner stays its 4 s.

### 4.8 Live paused, behind live (`08`)

⏯ (or Options › Rewind and pause) on a kept channel: the timeline map (catch-up 6.1). The picture rests under `DIM`
as a paused film does. The banner stays as the top block **without its LIVE pill** (the only LIVE is the track's,
beside the live dot); the corner under its tags: `Paused` tag, `2:40 behind live`, `Paused at 22:39`. Row: `▶` ·
`⏮` (programme start) · `−1m` · `+1m` | `Back to live` · `CC` · `Audio` · `Picture`. Track: the programme (21:00 to
23:50) with the live dot and LIVE, the part not aired yet dashed. Not kept, HLS: the bar is the live window (`45 s ago`
to LIVE); not kept `.ts`: `▶` only. Reaching the live point restores the live map and the banner (800 ms guard, M8).

### 4.9 A game replay: the timeline (`09`)

`Watch from tip-off` or `From tip-off` in the panel. Top block: `Grizzlies at Trail Blazers` / `NBA League Pass 4 ·
Thu 29 Oct · late · 4K`. Corner, hidden game: `[eye-off] Score hidden` / `You're in Q2` (never the live game's
state); seen game: `40 min behind live` / `You're in Q2`; a finished game: `Ends at …` only once seen. Row: `⏸` · `⏮`
(tip-off) · `−1m` · `+1m` · `Skip to Q3 ›` (named from the played position; none from Q4 on) | `Back to live` · `Game`
(the scoreboard glyph) · `CC` · `Audio` · `Picture`. Track: ticks only for chapters that have aired (Tip-off, Q2, Half, Q3 with live in Q3; Q4 when it airs, OT once
played), the live dot at 66 % with the compact LIVE, the dashed part not aired yet; ends: nothing at the left for a hidden game (`34:10` for a
seen one), `[eye-off] End hidden` at the right (`−25:50` for a seen one). The bar's length is the fixed window.
`Back to live` under the shield opens the neutral card (catch-up 6.7). Hint as 4.1 with `10 s, hold for faster`.

### 4.10 The game panel in a replay (`10`)

The `Game` disc or Options › Game panel: the bar hides (one panel at a time), the panel floats right 280. The plate:
crests 40 in the neutral disc with the team's secondary as a 2 dp edge, the score **as aired** at the moment you're
watching (`asAired(airedAt(position) − 90 s)`, Barlow italic 30), `Q2 8:14 · as aired`; tabs `Quarters · Plays · Sync`
(Quarters focused, Sync outlined as an action); Quarters rows 42 with their aired times, **only the chapters aired so
far** (the same set as the track's ticks), the one you're in on `surface-2` with `now`; OK jumps there; foot `OK jumps there. The box score comes after the final buzzer.` No box score,
no final, no OT row until played. A video replay: the plate `Replay`, no score, the sources list. Hint: `◀ ▶ Tabs ·
▼ Quarters · Back Close`.

### 4.11 Options (`11`)

▼ or Menu from the bar: the controls hide, the picture under `DIM` at 25 %, the panel at left 48, 384 wide, header
Outfit 700 22, rows 46: glyph 22 `text-2` · name Inter 650 16 over a 14 `text-3` sub · value Inter 500 16 `text-2` ·
chevron 16. First row focused (inset 3 dp ring on `surface-3`, no scale). A film: Subtitles · Audio (disabled when
one track: `text-4`, no chevron) · Picture size · Quality · Connection · Speed · Match frame rate · Intros in this
show. Live, replay and programme rows as catch-up 6.6. Hint: `OK Open · ▲ ▼ Move · Back Close`.

### 4.12 Bright frames (`14`, `15`) and the steady state (`12`, `13`)

`14`: the VOD bar over a near-white frame; `15`: the replay bar over a bright court with a broadcaster's bug. Both
measured in `tools/contrast.js` (every text ≥ 4.5 : 1 at its median backdrop; `14`'s lowest 7.60, `15`'s 6.03). `12`:
the film after the hint bar's 5 views: two rows and the corner, nothing else. `13`: a zap after the hint has retired:
the banner alone, no bottom scrim.

### 4.13 The rest (unchanged in look beyond the tokens)

Subtitles / Audio / Picture / Sync / Connection panels, the stall and failure cards, the reconnect spinner, the
action chip, the way-back chip and the offer, the score bug (its plate stays `BANNER` at the 12° skew), the Live
games panel, the channel panel and Groups. They take the new key-cap style in their hint lines and nothing else.

## 5. Focus and keys

The maps do not change (UI-SPEC 7, catch-up 6.1, skip 3.4 / 5.1). What the redesign adds or moves:

| Key | Where | Does |
|---|---|---|
| ▲ | thumb | the row: the Skip pill if its window is fresh, `Next episode` while Up next counts, else Play; the label appears over the focused button |
| ▼ | row | the thumb; from the thumb, Options |
| ◀ ▶ | row | move; at either end they stop (no wrap, as today) |
| ◀ ▶ held | thumb | scrub; the row fades, the bubble leads |
| OK | thumb | pause / play, always (the Up next OK guard with the controls hidden only) |
| Back | bar up | hides the bar (a chip stays); bar hidden: leaves |
| any key | paused 2 min | restores the faded controls, nothing else happens on that press |

Exactly one ring per screen: the thumb's, a button's, or a panel row's. The chips, the banner, the zap card, the
bubble and the corner never take focus.

## 6. Motion (transform and opacity only)

| Moment | Property | ms | Easing |
|---|---|---|---|
| Controls show | opacity 0 → 1; the bar's `translationY` 8 → 0; scrims opacity | 150 | `--a-ease` |
| Controls hide | opacity 1 → 0 | 200 | same |
| Scrub start / end | the row's alpha 1 → 0 → 1; the bubble opacity | 120 | same |
| Label on a button | opacity | 120 | same |
| Pause dim | `DIM` alpha 0 → 1 | 150 | same |
| Paused 2 min | the overlay's alpha → .35 | 320 | same |
| Zap | `DIM` at 70 % at once (0 ms); the card opacity 1 at once; both out 120 ms at the first frame | 0 / 120 | |
| Ring | instant | 0 | |

While a key repeats the ring moves instantly and nothing animates (UI-SPEC F10). Reduced motion: 120 ms fades only.

## 7. The spoiler shield in the player

Nothing here loosens catch-up 7.1. In the mocks and in the build: a hidden game's corner says `Score hidden` and your
chapter; the ends row has no elapsed time and `End hidden`; the track is the fixed window with no end mark; the
scrub bubble never names a chapter past Q4; the Skip pill stops at Q4; the game panel shows the as-aired score only
(90 s behind the picture), no box score, no final; `Back to live` asks first; the Up next and action chips never
mention another game's score; the banner for a channel carrying a hidden game shows the game's own title, never the
post-game show. The zap card and the live banner never show a score at all (the score bug is the only place, at the
synced delay, and it hides under every overlay).

## 8. What changes in which Java file (the port)

| File | Change |
|---|---|
| `Ui.java` | the tokens in 3; `disc(c, glyph/text)` and `discState(t, focused)` (replaces the per-file circle code); `pillState` takes `GLASS_PILL` for the idle fill; `kbd()` filled with `KEYCAP`, no stroke; `scrim(c, int[] colors, float[] stops, heightDp)` as a `ShapeDrawable` whose `ShaderFactory` builds a `LinearGradient` (**the only path**: `GradientDrawable.setColors(int[], float[])` is API 29 and `minSdk` is 24); `shadow(TextView)` = `setShadowLayer(dp(10), 0, dp(1), SHADOW)`; `label(c)` for the button name; `cornerBlock(c)` (two lines + the Paused tag) used by `VodControls` and `Timeline` |
| `Track.java` (new, from `Timeline.Track` + `VodControls.Seek`) | one view: the line, played part, not-aired part, ticks, live dot, thumb; the ends row drawn in the same view (so labels sit on their ticks); `pos`, `focused`, a `Model`-less setter set for VOD (`set(progress, elapsed, remaining)`) and the catch-up `Model` for the timeline. Height 42 (20 + 2 + 20), `PAD` 0: the line runs the full width (the thumb's ring may pass x 48 by 11 dp at 0 %: `clipChildren(false)` on the parent, and the ring is the exception the UI spec allows at an edge) |
| `VodControls.java` | drop the `bar` background and the `times` row; the row at y 382 (bottom margin 540 − 426 = 114), the `Track` under it (bottom margin 60); the label `TextView` placed over the focused button **in the row's `onLayout`** (a `TextView` moved in `draw()` lags a frame; `draw()` only sets its text and visibility); the bubble moves to y 400 with its point; `update()` feeds `ends`; the corner block: `Ends at` / `n min left`, and on pause the tag, `n min left`, `Ends at … if you play now`; `meta.line` into the story line on pause; the 2 min fade (`handler.postDelayed`, 120 s, reset on any key); the row hidden (`alpha 0`) while `scrubbing`; the scrims instead of `top`'s gradient and the bar's fill; the logo: the plugin sends `logo` with its ink box (`{ url, l, t, r, b }` from `art.js`'s crop) and the `ImageView` draws that sub-rectangle, or, with no box, `Images.java` scans the alpha for the bounding box once (cheap, the PNG is small); the text title when `logoOk` is false (the 32 px probe's 3 : 1 check in `art.js`, sent with the meta) |
| `Timeline.java` | the same geometry and `Track`; `pos1` / `pos2` into the corner block; the bubble at y 400; the row alpha while scrubbing; the chip offset while visible (Up next bottom 378) |
| `PlayerActivity.java` | `buildOverlays()`: the banner as the block in 3 (number, tile, the three-line column, the clock and tags), no background, with the top scrim view; `fillBanner()` skips the LIVE pill while `tl` is active (behind live) and puts `Subtitles` / `Replays n days` on line 3; the hint bar's own scrim is `SCRIM_HINT` and is added only while `hint` is visible and no bar is up; the zap card's new backing, `Connecting…` cap and `DIM` at 70 % on key down (`showZapCard`), cleared on the first frame; the hint bar on the bottom scrim (remove the 56 dp scrim view), outlined caps; `hintsChanged()` labels: `Seek 10 s` on the thumb, the focused button's name on the row; `updateBug()` unchanged |
| `GamePanel.java` | the crest's 2 dp team-secondary edge (`d.optString("edgeAway/Home")`, sent with the game meta); nothing else |
| `ListPanel.java` | Options rows 46 (the `int height = 48` default in the constructor); nothing else |
| `TunerPlayerPlugin.java` / `app/tv/js/player.js` | `meta` gains `logo` (the title's logo URL Home already has) and `line` (one sentence) for VOD; the game meta gains the two secondary colours |
| `tests/android-test-boot.js` | the three VOD checks read `vod.focusName()` as before; add one check that the controls fade after a 2 min pause (fake clock) and that the label text equals the focused button's name |

Order: `Ui` tokens and helpers → `Track` → `VodControls` → `Timeline` → `PlayerActivity` banner and hints → the zap
card → `GamePanel` edge → plugin meta. Each step builds and passes the emulator test on its own.

## 9. Where this departs from the specs it sits on, and why

- **UI-SPEC 7's bar** ("bottom bar 64 dp from the bottom, radius 16") and **catch-up 6.2's bar** ("y 344 to 476,
  radius 16, `Ui.BANNER`"): replaced by the two rows on the scrim (1, 2). The 64 dp bottom margin stays as the row's
  clearance from the hint bar.
- **UI-SPEC 7's banner** ("64 high, radius 16"): replaced by the block (8). Its contents are all still there, in a
  different order: the programme is now the big line.
- **UI-SPEC 7's hint bar scrim** ("56 dp scrim that fades up from the bottom edge"): the bottom scrim covers it.
- **UI-SPEC 7's zap card** ("logo tile 56, name 22, now 16"): tile 64, plus the `Connecting…` line and the dim (9).
- **Skip 2.1's chip geometry with the controls up** (the card "sits above the bar"): the bar's top is now y 382, so
  the chip's bottom is y 378 (it was above y 344).
- **Catch-up 6.2's thumb** ("18 dp chalk; focused 22"): 16 idle, 22 focused, because the line is thinner against the
  picture than against the box and the idle thumb was crowding the live dot.
- The paused dim and the 2 min fade are new (4). The button label is new (5).

## 10. Open items (need the real TV)

- The bottom scrim's weight over a bright scene: 92 % at the edge is chosen for the OLED's black; if the top of the
  row reads dim on a white frame, raise the 46 % stop to 70 %.
- `GLASS` discs over a near-white frame: `14` shows them holding at 14 %; on the TV, if the edge vanishes, 22 %.
- A real broadcast frame for `15`: the court is drawn (Commons rate-limited the search here). Drop a captured frame from
  the owner's provider into `art/` and re-render `15` with `tools/render.js 15-replay-court.html`, then `tools/contrast.js`.
- `05`'s floating label and `02`'s story line pass at their median backdrop but not in their brightest gaps (2.7 and
  3.8 : 1 at the 90th percentile on the Severance ceiling); if they read weak on the TV, the label gets a `KEYCAP`
  backing and the story line moves under the st-what line's shadow.
- The 2 min fade: confirm the Philips's own screensaver does not fire first (it should not while the player holds
  the wake lock), and that 35 % still reads as "paused" from the sofa.
- Logos in the title block: Cinemeta's `logo` is often a wide PNG with a transparent bleed; `art.js`'s crop-to-ink
  runs on the TV side, so the native view gets a tight image; a logo over 260 wide at 40 high falls back to text.
