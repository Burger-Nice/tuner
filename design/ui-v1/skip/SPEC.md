# airglow TV: Skip intro, Skip recap, and Up next at the credits, v1.3

This is the design spec for the engineer. It extends `design/ui-v1/UI-SPEC.md` v1.2 section 7 (the native player: the
action chip, Up next, the hint bar, the VOD controls) and uses the subtitles design (`design/ui-v1/subtitles/SPEC.md`:
the downloaded subtitle file and its timing verdict, 3.4; the IMDb match levels of `../copies/RANKING.md` 4).
Everything not said here follows those. **UI-SPEC 7's Up next row is replaced by section 5.1 here** (its Back and its
timing changed).

**The owner, in his words:** "is it possible to have a skip intro thing?" ... "yeah the skip intro too lets get that
done", earlier "also like a play next one when the show is finishing", and on v1.0: "maybe a timer if you don't press
back within 15 secs", "intro could be a skip by its self if you got that setting on for that show".

**The answer, in four parts:**
1. **Skip intro.** When an episode reaches its intro, a small chip in the bottom right says `Skip intro`. One press of
   OK jumps past it, and for 5 s a second chip offers the way back. The times come from TheIntroDB, a free list made
   by viewers.
2. **Recaps skip by themselves** when he watched the episode before (in a binge, the one just played), with the same
   5 s way back. Otherwise the recap gets the button.
3. **Intros skip by themselves per show,** once he has said so for that show: after he pressed Skip intro in 2 of its
   episodes airglow asks once, `Always skip this show's intro?`, and ▼ Options has the choice too.
4. **Up next comes when the credits start,** counts 15 s and plays the next episode. Back stays on this one; the next
   episode stays one press away.

| File | What it is |
|---|---|
| `SPEC.md` | this |
| `*.html` (9) | the mocks; `png/*.png` are their 2x renders, `png/contact-sheet.png` shows all nine |
| `skip.css` | the new CSS, prefixed `sk-`: measurements for native views (dp = CSS px) |
| `tools/build.js`, `tools/render.js`, `tools/audit.js` | build the mocks; render them; the self-check (the subtitles audit, unchanged: 9 pages, 0 findings) |
| `REVIEW-independent.md`, `-2.md`, `-3.md` | the reviews of v1.0 (6.8 / 10), v1.1 (7.3) and v1.2 (7.4) |

## v1.3 changes: every point of review 3

The lead's calls on this round:
- **Built on the web side (commit 4e01892):** in a binge, the episode before is the queue's item before (so a season's
  E1 after the finale counts). The next queue item's times go to the player ahead (`ahead: true`, `recapAuto: 'prev'`).
- **2b:** the reviewer's fix.
- **The rest:** the reviewer's fixes, unless a better one is given here.

| # | Review point | What changed |
|---|---|---|
| 1 | SK-10 and mock 5 contradict the rule | **The rule (4.3, built):** in a binge, the episode before is the queue's previous item of the same show, finished or played past 80%. Opened on its own, it is the same season's E−1, watched in the last 3 days. A season's E1 opened on its own gets the button. **SK-10:** Lost S2 E1 reached by Up next from S1 E24 skips its recap. **SK-11:** Lost S2 E1 opened from the series page gets the chip. Mock 5's caption says the same |
| 2a | A season's E1 is excluded | Fixed by the queue rule above |
| 2b | A joined recap and intro becomes a button | **When only the recap may skip by itself, it skips alone** to the intro's start (with `Recap skipped`); then the usual `Skip intro` chip (3.1). SK-26 changed, SK-28 added |
| 2c | A recap at 0:00 arrives "late" | **The next item's times reach the player ahead** (built: `ahead: true`). Its recap rule is `recapAuto: 'prev'`: when that item starts, the player decides (true if the item before it in the queue ended or played past 80%). **"Late"** now means the window started more than 3 s before the answer came (3.6) |
| 3 | Up next shows the wrong keys with the controls up | **With the controls up the card drops its key column;** the count goes on. When the controls hide, the keys come back (5.1). The end card does the same |
| 4 | Subtitlers' credits and ads count as speech | **A spoken line excludes** a cue with a web address, a cue with the subtitle-credit or advert words (9.4's list), and a lone cue inside a window more than 10 s from any other cue. **The same filter** is used for the push after the credits and for today's rule (`Subs.lastLineEnd`). AC SK-29 |
| 5 | Sung theme songs lose their chip | **3 or more lines inside drop the window only when they look like an offset** (non-italic speech within 15 s of an edge after the trim). Lyrics (mostly `<i>`) or lines well inside: the window keeps its chip and never skips by itself (9.4). AC SK-30 |
| 6 | The offer can appear where yes changes nothing | **The offer comes only when** this show's intro mode is `button` and both counted presses were on a Sure match. Only presses on Sure windows count (4.4, 9.5) |
| 7 | The end card waits forever on an OLED | **After 5 min with no key the player closes as Back would,** and clears keep-screen-on. The end card has the OK guard, the hint `OK Play now · Back Close`, and ◀ or a seek away from the end puts it away and plays (5.1) |
| 8 | After Back, the last-40 s card; setPauseAtEnd is player-wide | **After Back, no counting card again for this episode,** only the end card. `setPauseAtEndOfMediaItems(true)` is set on Back and cleared on the next item, CH+, `Next episode` and leaving (5.1). AC SK-31 |
| 9 | The guard says one thing and does another for 0.7 s | **Every guarded chip draws its `OK` cap at 40% until OK binds,** and the hint bar shows the new OK label only from that moment (before it, `OK Pause`). Why these chips pause and the failure card ignores OK: the chips appear over a playing video, where OK already means Pause (harmless); the failure card's OK opens the channel list, which a stray press shouldn't do (2.2) |
| 10 | After a skip by itself the way-back chip binds OK unannounced | **After a skip by itself the way-back chip has the full guard:** for 0.7 s OK pauses, cap at 40%. **After going back from a skip by itself** the window stays fresh for ▲, so ▲ OK re-skips (4.2, 3.3) |
| 11 | A wrong copy keeps skipping wrong | **A go-back within the 5 s after a skip by itself, with no anchored file,** makes that show's times doubtful for 7 days: its intros and recaps get the button, and the Options foot says `You went back after a skip: buttons for 7 days.` This counts trust, not times (4.3, 7). AC SK-32 |
| 12 | `Back stop` is ambiguous; three names | **One phrase:** `Back` `stay here` on the card and `Back Stay here` in the hint; the end card says `Back` `close` (`Back Close`). UI-SPEC 7's Up next row is replaced by 5.1 (said at the top; that file is outside this design's folder, so the lead updates it) |
| 13 | The offer gives no sign that yes worked | **On OK, the chip says `Done: this show's intros skip by themselves`** for 2 s, without keys, then fades (4.4) |
| 14 | The drain line's reason contradicts the action chip | **The reason now:** a 48-high chip and a two-line chip with keys have no room for the 40 ring, and a line that empties reads as "goes away" (2.1). The action chip keeps its ring; whether it moves to the line is not in this design |
| 15 | Smaller things | Chip titles are **Inter 650 16**, as `chipTitle` (the row pills stay Outfit). The offer is **64 high**, so its key caps clear the drain line. **Up next's name** has a 180 dp minimum and an ellipsis; an add-on episode's third line (`chipSay`) makes the card 78 high, keys centred. Lengths are **rounded to the nearest second**. The skip chip's 10 s and Up next's 15 s **count from when they appear**. **A seek to before a skipped window** plays into it and gets the chip (3.6). **The first frame after the jump** = the first `onIsPlayingChanged(true)` after the seek's `onPositionDiscontinuity` (3.5). **The Options foot lists every known part** (`recap, intro and credits`). Stale notes fixed (10; `skip.css` header). 9.4 says "a downloaded file with the verdict" |

## Earlier rounds, in short

- **v1.2 (review 2, 7.3):** only an anchored file counts as evidence, and it can only stop a skip (option (a)); Back on
  Up next keeps the queue; Back on the offer = not now; the way-back chip's 5 s in playing time, `Back to intro`; the
  fresh-window rule for ▲; Up next's OK guard; moving on marks the episode watched; `Skip by itself` and `Same as
  Account`; Back on the chips where it matters; per-chip hint counts.
- **v1.1 (review 1, 6.8):** the way-back chip after every skip; the OK guard; an exact jump 0.5 s before the end; the
  row pill last; the 15 s re-trigger rule; subtitles step only on overlap; Off asks nothing; seek bar gaps, the bubble's
  names, the film rule and "finished at the credits" moved to Later (13); the acceptance table (14); the owner's
  answers (12).

## 0. Scenario and data

- **When:** the owner's TV, Tue 27 Oct 2026, 21:30 Reykjavik time. Account: Show a button. Subtitles on
  (OpenSubtitles), as his settings are.
- **Real answers from TheIntroDB,** fetched with curl on 27 Oct 2026 (9.6). The mocks use these times; the picture is
  stand-in art and the subtitle lines are invented.

| Episode (IMDb id) | TheIntroDB says | What it shows us |
|---|---|---|
| It's Always Sunny S1 E1 (`tt0472954`) | intro 1:44.0 to 2:11.6, credits from 21:28 | the normal case: a cold open, then a 28 s intro |
| It's Always Sunny S1 E2 | intro 1:18.9 to 1:45.9, credits from 20:50 | the intro moves from episode to episode (no "same time as last time") |
| It's Always Sunny S1 E3 | credits from 21:39, **no intro** | a known episode with a gap: no chip, Up next still works |
| Lost S2 E1 (`tt0411008`) | recap 0:02 to 0:28, intro 3:59.0 to 4:10.5, credits from 42:48 | a recap at the very start; an 11 s intro |
| Severance S1 E2 (`tt11280740`) | **two** intros, 5:20.6 to 6:40.0 and 6:41.6 to 8:01.0 | two versions of the truth (9.4) |
| Stranger Things S2 E2 (`tt4574334`) | recap 0/0 (confirmed none), intro 5:50.7 to 6:38.8, **credits 5:51.2 to 6:39.7** | a wrong label: "credits" on the intro (9.3 drops it) |
| Game of Thrones S8 E3 | intro 0:06.0 to 1:52.8 | a 107 s intro |
| Oppenheimer, Dune (films) | 404 `no_submissions` | films are mostly not in the list |

The answer carries no reference length (`{tvdb_id, type, season, episode, intro, credits}`), so an offset copy can't be
spotted from the answer alone (4.3's doubtful rule, 9.4).

## 1. Decisions in one list

1. **One chip in the Up next chip's place** (bottom right, right 48, bottom 64). A skip chip and Up next are never up
   together (3.8).
2. **OK skips only while the chip floats with the controls hidden**, as Up next binds OK, behind the OK guard (2.2),
   which Up next and the end card have too. With the controls up, OK pauses and `Skip intro` is a pill in the row.
3. **The chip stays 10 s** from when it appears (the owner). The row pill stays for the whole window.
4. **Every skip is followed by the way-back chip for 5 s of playing time** (`OK go back`), pressed or by itself.
5. **Intros: the button by default.** They skip by themselves in a show he said yes to (the offer or ▼ Options), or
   with Account's Skip by itself: on a Sure match, unless an anchored subtitle file finds speech inside the window,
   and not while the show's times are doubtful.
6. **Recaps skip by themselves when he watched the episode before** (in a binge, the queue's item before; opened on
   its own, the season's E−1 in the last 3 days), on a Sure match, in the default too; otherwise the button.
7. **Up next at the credits start, 15 s, then the next episode.** Back stays on this one and keeps the queue; the card
   comes back without a count at the real end. Real speech after the credits start pushes the card.
8. **No guessing when the list has nothing** (7). **Off asks nothing** and Up next works as today.
9. **The list is asked only for a Sure or Likely match;** a Likely match never skips by itself.

## 2. Rules every surface follows

### 2.1 Geometry and look (all inside x 48 to 912, y 27 to 513)
- **Skip chip:** right 48 (x 912), bottom 64 (y 476), height 48, radius 16, `bg-1` 94% with the 1 px border, padding
  14 / 12, width = content (`Skip recap and intro` is the widest, about 234). Contents: the skipFwd glyph 20 · the
  label **Inter 650 16** (as `chipTitle`, Up next's and the action chip's titles) · the `OK` key cap. A 3 dp drain line
  inside the bottom edge (inset 14 / 12, 5 dp up), pink on `surface-3`, over the chip's own dark fill.
- **Why a drain line, not the ring:** a 48-high chip, and a two-line chip with keys, have no room for the 40 ring, and
  a line that empties reads as "this goes away". Up next keeps its ring. The action chip keeps its ring too; moving it
  to the line is not part of this design. Pink is already the progress colour (UI-SPEC 7's seek tint); no new colour.
- **Two-line chips**, max 420:
  - the way-back chip, 60 high: the **skipBack** glyph, `Intro skipped` (Inter 650 16) over `27 s` (14 `text-2`),
    then `OK go back`;
  - the offer, **64 high**: skipFwd, `Always skip this show's intro?` over its two keys, `OK yes · Back not now`; the
    drain line 4 dp up.
- **The Up next card** keeps its ring and text; its keys are stacked at the right, `OK play now` over `Back stay
  here` (20 high key caps, 4 apart), max 420 (mock 6). The episode's name takes what is left (at least 180 dp), with an
  ellipsis. An add-on episode's source line (`chipSay`, "Same source: Northlight 4K") makes it three lines and 78
  high, the keys centred on it. **With the controls up** the key column is not drawn (5.1).
- **Row pills** (`VodControls.pill`, 40 high, Outfit 700 16, `surface-2`): `Skip intro` with skipFwd 18, or after a
  skip `Back to intro` with skipBack 18. **The last pill of the left group** (after Next episode; after +10 when there
  is none), 16 dp either side. Nothing to its left moves when it comes or goes; the right group is pinned right.
- **Subtitles and the chips:** when a chip (skip, way back, offer, Up next) is up and the subtitle view's laid-out
  text box would touch the chip's box, the text steps up until its bottom is 8 above the chip's top (y 420 for a 48
  chip, 408 for a 60 one, 404 for the offer). No animation. It steps back when the chip goes. No touch, no move.
- **Options:** the VOD Options panel keeps the subtitles design's 384 while a film or episode plays (mock 9); the
  `Intros in this show` panel is the same width, rows 50 (mock 7).

### 2.2 Focus, keys and the OK guard
- The chips are HUDs: no ring (UI-SPEC 3.2 exceptions). The row pills take the ring like the other pills.
- **OK means one thing:** a floating chip binds OK only while the VOD controls are hidden. While it does, the hint
  bar's OK label says what OK does (`Skip intro`, `Skip recap`, `Skip recap and intro`, `Go back`, `Yes`, `Play now`).
  After the hint bar's 5 views the chip's own key caps carry it, as the action chip's do. Where Back means more than
  "hide", it is on the chip too: `Back stay here` (Up next), `Back not now` (the offer), `Back close` (the end card).
- **The 5 views are counted per chip:** `hint:skip`, `hint:skipback`, `hint:offer`, `hint:upnext`, `hint:upnextend`.
- **The OK guard** (the skip chip, the offer, Up next, the end card):
  - it appears only after 1.5 s without a key press (it waits, if there is still time for it: 5 s of the window, or
    for Up next, before the end). Its life (10 s, 8 s, 15 s) counts **from when it appears**;
  - for its first 0.7 s OK does what it did before (Pause). Its `OK` key cap is drawn at 40% and the hint bar still
    reads `OK Pause`; at 0.7 s the cap is full and the hint bar takes the chip's label;
  - for 0.7 s after it goes without a press, OK does nothing (the press was meant for it).
- **Why these chips pause, while the failure card ignores OK for 700 ms:** these chips come over a playing video, where
  OK already means Pause, so a stray press does the harmless thing he expects. The failure card's OK opens the channel
  list, which a stray press shouldn't do.
- **The way-back chip's guard:**
  - after a **pressed** skip: OK binds 0.5 s after the first frame after the jump (only a double press is the risk);
  - after a skip **by itself**: the full guard (0.7 s of Pause, from that first frame), since it appears unannounced;
  - until it binds, its `OK` cap is at 40%.
- **◀ ▶ don't dismiss the skip chip,** unlike the action chip's "any other key": seeking inside the intro is not a
  "no". Up next works the same way.
- **Back hides a chip and never leaves the player while one is up.** To leave during an intro: Back, Back.

### 2.3 New glyph (`Ui.Icon` and `util.js`, 24 grid)
- **skipFwd:** the mirror of catch-up's `skipBack`: a filled triangle `M4.5 5.2v13.6L15 12z` and a 2.6 wide bar at x
  16.4 (radius 1). On the skip chip, the offer, the `Skip intro` pill and the Options row.
- **skipBack** (catch-up's, as it is): on the way-back chip and the `Back to intro` pill.

### 2.4 Motion and sound
- The chips fade in 150 ms and out 120 ms (opacity). Nothing else moves. No sound.

### 2.5 Copy rules
- Plain words, no idioms. Lengths are the window's, **rounded to the nearest second** (`27 s`, `28 s`) up to 99 s,
  then minutes (`3 min`).
- "Intro" and "recap" are the words; never "opening", "title sequence" or "previously on".

## 3. The Skip chip

### 3.1 What can get a chip
Only **windows** that passed the checks (9.3, 9.4): at most one recap and one intro per episode, each with a start and
an end on this copy. A window shorter than **8 s** gets nothing (Lost's 11 s intro gets a chip; a 6 s card doesn't).

**Recap then intro:** a recap that ends 3 s or less before the intro starts joins it:
- **neither may skip by itself:** one window and one chip, `Skip recap and intro`, to the intro's end;
- **both may:** one jump to the intro's end, `Recap and intro skipped`;
- **only the recap may** (the usual case in a binge, since intros are buttons by default): the recap skips by itself
  to the intro's start, with `Recap skipped`; then the usual `Skip intro` chip for the intro (its "5 s or more left"
  and 1.5 s quiet rules hold; the way-back chip's 5 s count as quiet).

### 3.2 The chip (`player-skip`, `player-recap`)
- **Appears** when play reaches the window's start, the controls are hidden, nothing else floats there, the guard
  allows (2.2), and the window doesn't skip by itself (4.3).
- **Says** `Skip intro`, `Skip recap` or `Skip recap and intro`, with the `OK` key cap. The drain line empties over its
  life.
- **Life:** 10 s of playing time from when it appears, or until 1 s before the window ends, whichever is first. Paused
  time doesn't count.
- **Hint bar** with it, the first 5 times: `OK Skip intro · ◀ ▶ Seek 10 s · ▲ Buttons · Back Hide` (from 0.7 s; 2.2).

### 3.3 With the controls up (`player-skip-bar`, `player-back-pill`)
- While play is inside a window the row has the `Skip intro` pill, for the **whole** window.
- **▲ lands on that pill while the window is fresh:** not hidden with Back, and not gone back from after a pressed
  skip. Going back from a skip **by itself** leaves it fresh (the list was probably right and the press probably a
  slip), so ▲ OK re-skips. Otherwise ▲ lands on Play, as everywhere else, and the pill is one ▶ along.
- OK on the seek thumb still pauses. The floating chip hides while the controls are up and comes back when they hide,
  if it has life left.
- **After a skip, while the way-back chip has life** and the controls come up (he paused, or pressed ▲): its life
  stops and the same slot has `Back to intro` (`Back to recap`, `Back to recap and intro`); focus stays where the key
  put it (▲: Play; a pause: the seek thumb). OK on the pill goes back as the chip's OK does. When the controls hide,
  the chip returns with the time it had left; when that runs out, the pill goes.
- **When a pill goes** with focus on it: focus moves to the seek thumb; the controls keep their 4 s timer. A late
  answer adds the pill without moving focus.

### 3.4 Keys while the chip floats (controls hidden)

| Key | Does |
|---|---|
| OK | **skips** (3.5), after the guard's first 0.7 s. The way-back chip follows |
| Back | hides the chip (3.6). Doesn't leave the player |
| ◀ ▶ | seek 10 s as always; hold scrubs. The chip stays while play is in the window |
| ▲ | the controls, focus on the row's Skip pill (fresh window) |
| ▼ / Menu | Options (the chip hides) |
| Play/Pause | pause (the chip moves into the row with the controls) |
| CH+ | next episode, as always |
| CC | Subtitles |

### 3.5 The jump
- **Target:** the window's end − 0.5 s (lists often mark the end at the fade, and a late end cuts the scene's first
  word). For a recap that skips alone before an intro (3.1): the intro's start.
- **Exact:** the jump sets `SeekParameters.EXACT` for its own seek and puts back whatever was set before (scrubbing
  may use `CLOSEST_SYNC`).
- **At once** the skip chip goes and the way-back chip shows with its key cap dimmed. **"The first frame after the
  jump"** = the first `onIsPlayingChanged(true)` after the seek's `onPositionDiscontinuity` (reason SEEK);
  `onRenderedFirstFrame` is not reported again reliably for each seek. Its 5 s start there, so a rebuffer doesn't use
  them up.
- **A failed seek** (a player error after it) goes the player's normal reconnect and failure path; the way-back chip
  goes with the error.
- **By itself** (4.3): one Media3 `PlayerMessage` per window at its start, delivered on the main looper, with a "done"
  flag per window per play, so it can't fire twice. It is not delivered while paused; seeking over the start doesn't
  fire it (3.6 covers landing inside).

### 3.6 Seek back, pause, resume, a late answer, a second watch
- **After a skip or a Back,** that window's chip comes back only when a seek lands **15 s or more before its end**,
  and 5 s or more of it are left. A seek to **before** its start counts: play reaches the start again and the chip
  shows as at first. One ◀ after a skip lands 10.5 s before the end: no chip, just the scene again. The row pill is
  there either way.
- **A seek into a fresh window:** the chip, as at its start.
- **Pause:** the chip's life stops; the controls show with the pill in the row.
- **Resumed inside a window** (Continue watching, the player reopened): the chip at the first frame if 5 s or more of
  the window are left, with the 0.7 s OK rule from that first frame. A window that skips by itself: the player starts
  at its end instead, with the way-back chip.
- **First seconds:** the next queue item's times are already in the player (9.5, `ahead`), so a recap at 0:00 skips,
  or gets its chip, from the first frame.
- **A late answer:** an answer counts as on time if its window started **3 s or less** before it came; then the window
  acts as if just reached (a jump, or the chip). Later than that: the chip if 5 s or more are left; never a jump by
  itself.
- **A second watch:** the same as the first. Nothing is kept between plays except the show's choice and its doubtful
  mark (4.3, 4.4).

### 3.7 A long recap, a short intro
- A 3 min recap: the same chip and 10 s, then ▲ OK any time; the way-back chip reads `3 min`.
- An 8 to 12 s intro: the chip's life ends 1 s before the intro does (Lost: 3:59 to 4:09).

### 3.8 Living with the other things on screen
- **Up next** always wins (a window inside the credits was dropped already, 9.3).
- **Other chips** (the stutter and offline chips): one chip at a time; with one up, the skip is only in the row, and
  nothing skips by itself.
- **A panel open:** no chip; when it closes the chip comes back if it has life left.
- **Scrubbing:** the chip hides.
- **Live TV and catch-up programmes:** nothing (no IMDb id for a programme).

## 4. The way back, the settings, and skips by themselves

### 4.1 The settings
**For every show: Account > Playback > Skip intros and recaps** (built; settings key `skipIntro`).

| Choice | Line under it (built) | Intros | Recaps |
|---|---|---|---|
| **Show a button** (`button`, default) | `One press skips it` | the button, unless the show says otherwise | by themselves after the episode before (4.3), else the button |
| **Skip by itself** (`auto`) | `You can go back for 5 s` | by themselves, unless the show says `Show a button` | the same rule |
| Off (`off`) | `No buttons` | nothing | nothing; nothing is asked from TheIntroDB, Up next as today |

- The Account row's line (built): `In series, from TheIntroDB`.
- **Under the Playback rows** (a `t-cap`, to add): `Recaps skip by themselves when you just watched the episode before.
  A show can have its own choice for intros: press ▼ in an episode.`
- **What a request sends:** the series' IMDb id, the season and the episode, and with it the TV's internet address.
  No account, no key, nothing else. Off sends nothing.

**For one show: ▼ Options > Intros in this show** (episodes only, the last row; mock 9). Its value is the choice:
`Same as Account`, `Skip by itself` or `Show a button`. OK opens the radio panel (mock 7):

| Row | Line |
|---|---|
| `Same as Account` (default) | `Now: Show a button` (or `Now: Skip by itself`) |
| `Skip by itself` | `You can go back for 5 s` |
| `Show a button` | `One press skips it` |

**Foot:** line 1, this episode: `This episode: ` + the known parts in order, joined with commas and `and`, + `
known.` (`This episode: recap, intro and credits known.`, `This episode: credits known.`), or `Not known for this
episode.` or `Intro times unsure for this episode.`; while the show is doubtful (4.3), `You went back after a skip:
buttons for 7 days.` Line 2: `Recaps skip by themselves when you just watched the episode before.` With Account set to
Off, the row is disabled with the value `Off in Account`.

**How they combine:** Account's Off wins over everything. Otherwise a show set to `Skip by itself` or `Show a button`
wins over Account; `Same as Account` (no choice) follows Account. Picking `Same as Account` clears the show's choice.
The doubtful mark (4.3) wins over both for 7 days. The recap rule is the same whatever the intro choice.

### 4.2 The way-back chip (after every skip; `player-skipped`)
- Shows the moment a skip starts, pressed or by itself: `Intro skipped` / `27 s` · `OK go back` (also `Recap
  skipped`, `Recap and intro skipped`).
- **Life: 5 s of playing time, from the first frame after the jump** (3.5). While the picture rebuffers it shows, cap
  dimmed, and its time doesn't run.
- **OK** binds after its guard (2.2: 0.5 s after a pressed skip, 0.7 s with Pause after a skip by itself). It seeks
  back to the window's start; the chip goes. That window is then left alone for the rest of this play: no skip by
  itself, no Skip chip. The `Skip intro` pill stays in the row; ▲ lands on it only after a skip by itself (3.3).
- **The controls up during its life:** `Back to intro` in the row, the life stopped (3.3, mock 4).
- **Back:** hides it. Other keys as 3.4; a panel opening ends it.
- Hint bar (first 5 times, from binding): `OK Go back · ◀ ▶ Seek 10 s · ▲ Buttons · Back Hide`.

### 4.3 What may skip by itself
- **An intro** skips by itself when the show is set to `Skip by itself` (or it is `Same as Account` and Account says
  Skip by itself), the match is **Sure**, an anchored subtitle file (9.4) does **not** find speech inside the window,
  and the show's times are not doubtful. With no file, a file that isn't ready by the window's start, or a file that
  isn't anchored, it skips: the way-back chip covers a wrong jump. A Likely match never skips by itself.
- **A recap** skips by itself when the match is Sure, the show's times are not doubtful, and **the episode before was
  watched** (built, the lead's code):
  - **in a binge:** the queue's item before this one, of the same show, finished or played past 80% (so a season's
    E1 after the finale counts). For the next item sent ahead, the player decides this when the item starts
    (`recapAuto: 'prev'`: the item before it ended or played past 80%);
  - **opened on its own:** the same season's E−1, finished or played past 80% in the last 3 days. A season's E1 opened
    on its own gets the button.
  - Recaps aren't checked against speech (they are speech).
- **Never** after a late answer (3.6), with another chip up, or on a window skipped or gone back to in this play.
- **Doubtful times:** a go-back within the way-back chip's 5 s after a skip **by itself**, when there was no anchored
  file, marks that show's times as doubtful on this provider for 7 days. Its intros and recaps then get the button,
  and the Options foot says so. A go-back after a pressed skip, or with an anchored file, marks nothing. This counts
  trust in the list, not times (7 stays true).

At the window's start: the jump (3.5) and the way-back chip.

### 4.4 The offer: "Always skip this show's intro?" (`player-offer`)
- **When:** the second time he presses Skip intro (the chip or the row pill) in **a different episode** of the same
  show, when:
  - both counted presses were on a **Sure** window (presses on a Likely match don't count),
  - this show's intro mode is `button` (with Account on Skip by itself, or the show already set, there is nothing to
    offer),
  - the show's choice is unset and fewer than 2 offers were let go.
  
  A skip he went back from doesn't count.
- **Where and when on screen:** 10 s after the way-back chip goes, well past the intro, never inside a window, never
  with the controls, a panel or another chip up, and not in the last 2 min before the credits (then it waits for the
  next episode's start + 10 s). The OK guard applies.
- **Says:** `Always skip this show's intro?` / `OK yes · Back not now`, the drain line over **8 s of playing time**.
  Hint bar (first 5 times, from binding): `OK Yes · Back Not now · ◀ ▶ Seek 10 s · ▲ Buttons`.
- **OK:** this show is set to `Skip by itself`. The chip says `Done: this show's intros skip by themselves` for 2 s,
  without keys or drain line, then fades. (The chip's own state, not a toast.)
- **Back, or the 8 s run out:** "not now". The show's choice stays unset (Account still decides). It is asked once
  more after his next counted press in another episode; let go twice, never asked again.
- The No he means for good is ▼ Options > Intros in this show > `Show a button`.
- Playback never stops for it; it is a chip like the action chip.

## 5. Credits and Up next

### 5.1 Episodes (`player-upnext-credits`)
This replaces UI-SPEC 7's Up next row. Up next keeps its look and its ring: `Next episode in 13 s` · the episode, with
`OK play now` over `Back stay here`. **If he does nothing for 15 s, the next episode plays** (the owner).

**When it comes:**

| The credits time | Up next |
|---|---|
| **Known** and passed 9.3, no spoken line after it in a downloaded subtitle file (or no downloaded file) | at the credits start, counting 15 s (mock 6) |
| **Known, but a spoken line starts after it** (9.4's spoken line: not a subtitler's credit or an advert; not within 5 s of the credits start, which is a line running over the cut; any downloaded file counts here, since pushing the card later is the safe way) | 3 s after the last spoken line if that leaves 15 s or more, else the last 40 s, counting to the end. Sung credits the file doesn't mark as music only delay the card |
| **Not known,** the list didn't answer, a Likely or Unsure match without an answer, or Off | today's rule, with the same spoken-line filter (3 s after the last spoken line when that leaves 20 s to 5 min, else the last 40 s) |

**The guard** (2.2): the card waits for 1.5 s without a key press; its 15 s count from when it appears; for its first
0.7 s OK pauses (cap at 40%); for 0.7 s after it goes, OK does nothing. Hint bar (first 5 times, from binding): `OK
Play now · Back Stay here`.

**With the controls up** (UI-SPEC 7: the card sits above the bar): the key column is not drawn, since OK and Back then
work the controls; the count goes on. The row's `Next episode` is the way on. When the controls hide, the keys come
back.

**Keys on the counting card (controls hidden):**
- **OK:** the next episode now.
- **Back:** stops the count and hides the card. **The queue stays:** CH+ and the row's `Next episode` still work. No
  counting card comes back for this episode (not even in the last 40 s); only the end card. The player sets
  `setPauseAtEndOfMediaItems(true)` (a player-wide setting) and clears it on the next media item, on CH+ or `Next
  episode`, and on leaving.

**The end card** (at the real end, after a Back): the picture holds its last frame and the card shows without a
count: `Next episode` · the episode · `OK play now` · `Back close`, the next glyph in a 40 disc in place of the ring.
- The OK guard applies; hint bar (first 5 times): `OK Play now · Back Close`.
- **OK** plays the next episode; **Back** closes the player, as Back at the end does today.
- **◀ or a seek** away from the end: the card goes and play resumes from there (the pause at the end stays set).
- **With the controls up:** no key column, as above.
- **After 5 min with no key:** the player clears keep-screen-on and closes as Back would (an OLED shouldn't hold a
  still frame).

**Marked watched:** when Up next moves on (OK, the count, or OK on the end card), the episode it leaves is marked
watched (`markWatched`). Reaching the credits alone marks nothing.

**Also:**
- **A preview** (a "next time" teaser): its start counts as the credits start when it is earlier and passes the same
  checks; the teaser is the next episode's story. No `Skip preview` chip.
- **The next episode's times** are sent to the player ahead (built), so its recap at 0:00 is known.

### 5.2 Films
Unchanged in v1: Up next for a film with a queue after it follows 5.1 (most films are not in the list). An intro on a
film gets the same chip as an episode, and never skips by itself (no show to say yes for).

## 6. (moved) The seek bar
v1.0's gaps on the seek bar and the bubble's part names are later (13).

## 7. When the list has nothing

**Nothing is guessed.** No chip, no pill, no skip; Up next uses today's rule; the Options foot says `Not known for this
episode.`

Left out, with the reason:
- **The time of the episode before.** Cold opens differ: Always Sunny's intro starts at 1:44 in E1 and 1:19 in E2.
- **Finding the theme song by sound.** Heavy on the TV and the network, and wrong on a different cut.
- **Learning times from his ▶ presses.** He also presses ▶ past a dull scene or to catch up after a pause. (Counting
  his Skip intro presses for the offer, and his go-backs for the doubtful mark, is different: they count choices and
  trust, not times.)
- **Sending his skips to TheIntroDB.** It needs an account and is outward-facing; not asked for.

▶ (10 s a press) and holding ▶ still get past any intro, as today.

## 8. All states

| State | Intro | Recap | Up next | Options foot (line 1) |
|---|---|---|---|---|
| Sure, all known, an anchored downloaded file | chip; by itself in a yes-show unless the file finds speech inside | by itself after the episode before, else chip | at the credits, 15 s | `This episode: recap, intro and credits known.` (the parts it has) |
| Sure, no anchored file (none, late, unanchored, or the file's own) | chip; by itself in a yes-show | as above | at the credits, 15 s | the same |
| Only credits known (Always Sunny S1 E3) | none | none | at the credits | `This episode: credits known.` |
| 404 (`no_submissions`, `episode_not_found`) | none | none | today's rule | `Not known for this episode.` |
| Match Likely | chip, never by itself | chip, never by itself | at the credits | as known |
| Match Unsure, or no IMDb id | not asked | | today's rule | `Not known for this episode.` |
| No answer in 6 s, 429, 5xx, offline | what was kept, else none; asked again next play | | today's rule | `Not known for this episode.` |
| The show's times doubtful (4.3) | chip | chip | at the credits | `You went back after a skip: buttons for 7 days.` |
| Two intros, settled by an anchored file (9.4) | the chosen one | | | as known |
| Two intros, no anchored file or a tie | none | | | `Intro times unsure for this episode.` |
| An intro window with offset-looking speech inside, from an anchored file | dropped | | | `Not known for this episode.` if nothing is left |
| An intro window with lyrics or speech well inside, from an anchored file | chip, never by itself | | | as known |
| An add-on copy | the same rules (its own `tt` id: Sure) | | | |
| Resumed in a window | 3.6 | | | |
| A 6 s intro | none | | | as known |
| A 3 min recap | | 10 s chip, then ▲ OK; way back reads `3 min` | | |
| Account Off | nothing; nothing asked | | today's rule | (the row is disabled: `Off in Account`) |

## 9. Data rules

### 9.1 When to ask (built: `app/tv/js/intros.js` `segmentsFor`, `player.js` `sendSegments`)
- When an episode or film starts and when the queue moves on (`track`); the next queue item's times are asked and
  sent to the player at the same time (`ahead`).
- **Gate:** an add-on item's own `tt` id (Sure), or the title's match unless it is Unsure. With Account Off,
  nothing. Never for live TV or catch-up programmes.

### 9.2 The request (built)
- `GET https://api.theintrodb.org/v4/media?imdb_id=tt…&season=S&episode=E` (films: `imdb_id` only), anonymous.
- **Timeout 6 s.** Busy or down: what was kept, else nothing; asked again next time it plays.
- **Limits** (the headers on 27 Oct): 30 per 10 s and 5000 a day per address; airglow needs about two per episode.
- **Kept** (`Core.cache`, per `imdb:S:E`): an answer 30 days, a 404 one day, errors not at all.
- **Cleaned** (`parseSegments`): `0/0` = confirmed none, dropped; `end_ms: null` on credits or a preview = to the
  end; a missing recap or intro start = the file's start (0:00); an intro or recap needs an end.

### 9.3 The checks on the answer (native, which knows the copy's real length D)
- **Recap:** starts in the first 8 min; 5 s to 5 min long.
- **Intro:** starts in the first 40% of D and ends at least 60 s before the credits start (or the end); 8 s to 3 min.
- **Credits:** start in the last 25% of D, at least 10 s and at most 12 min before the end, and after the intro's
  end. Stranger Things S2 E2's "credits" at 5:51 fail and are dropped.
- **Preview:** the same as credits.
- **Anything past D:** dropped.

### 9.4 The subtitle check (native, `Subs`)
**Which file counts for intros:** a downloaded file with the verdict **"Lined up with this copy"** or **"Made for this
copy"** (subtitles SPEC 3.4; an anchored file), and only once it is ready. "Lined up with other subtitles", "Timing
not checked" and the file's own subtitle tracks don't count (the tracks can't be read ahead).

**Which times:** the cue times as drawn: the file's stored fix, its speed and his Early or late steps (subtitles 7.5).
The check runs again after every step; a skip already made is not undone.

**Too late:** a file that is not ready by the window's start gives no evidence for that window in this play.

**A spoken line** is a cue whose text is not only music (`♪`, `♫`), sounds in brackets, or empty, **and is not:**
- a cue with a web address (`www.`, `http`, `.com`, `.org`, `.net`);
- a cue with a subtitle-credit or advert word, ignoring case: `subtitles by`, `subtitle by`, `sync`, `synced`,
  `corrected`, `ripped`, `translated by`, `translation`, `encoded`, `opensubtitles`, `addic7ed`, `podnapisi`,
  `become vip`, `support us`, `þýðandi`, `þýðing`, `íslenskur texti`, `texti:`;
- a lone cue inside a window more than 10 s from any other cue (a credit placed in a silent intro).

The same filter is used for the credits push (5.1) and for today's rule (`Subs.lastLineEnd` takes the last spoken
line, not the last cue).

**Inside an intro window:**
- **Lines within 5 s of an edge** trim the window to clear them (a cold open's last word, the scene's first). A window
  trimmed under 8 s gets nothing.
- **1 or 2 spoken lines inside** (after trimming): the chip, never a skip by itself.
- **3 or more:** **dropped** only when they look like an offset: non-italic lines within 15 s of either (trimmed) edge,
  i.e. the story's speech running into the window. Otherwise (mostly `<i>` lines, which is how lyrics are set, or lines
  well inside): the chip, never a skip by itself. A sung theme keeps its button.
- **Two intros that disagree** (Severance S1 E2): with an anchored file, the one with fewer spoken lines inside wins;
  a tie, or no anchored file: none is used.

**Credits:** any downloaded file can push Up next (5.1), with the filter above.

### 9.5 What the native player is sent
Built: `command('segments', { id, intro, recap, credits, preview, level, recapAuto, mode, ahead })`: each list `{ start,
end }` in ms (end 0 = to the end); `level` `sure` | `likely`; `recapAuto` `true` | `false` | `'prev'`; `mode` `button`
| `auto` | `off`. With `ahead: true` it is the next queue item's, kept by the player for that item; `recapAuto: 'prev'`
is decided by the player when that item starts: true if the item before it in the queue ended or played past 80%.

**To add (4.1, 4.3, 4.4, 5.1):**
- `mode` becomes the intro mode **for this show** (the show's choice if set, else Account's; `button` while the show
  is doubtful), and `show` adds `{ key, name, choice: 'auto' | 'button' | null, offer: bool, doubtful: bool }`.
  `offer` is true when this show's mode is `button`, it has one counted press (on a Sure window) in another episode, no
  choice, and fewer than 2 offers let go. With `doubtful`, `recapAuto` is false.
- New native events: `skip` `{ show, episode, how: 'press' | 'self', level, anchored: bool, back: bool }` (the web side
  counts Sure presses per show in distinct episodes, drops a press he went back from, and sets the doubtful mark for 7
  days on `how: 'self', anchored: false, back: true`); `setting` `skipShow` `{ show, value: 'auto' | 'button' | null }`
  (the offer's OK, and the Options panel; `null` = Same as Account); `offer` `{ show, letGo: true }` (Back, or the 8 s
  ran out); `watched` `{ index }` when Up next moves on (the web side calls `markWatched`).
- The web side keeps per show (`store`, per account): `choice`, the episodes pressed in, `letGo`, `doubtfulUntil`.

### 9.6 Checked with curl on 27 Oct 2026
The table in section 0. `duration_ms` (2,000,000; 3,200,000 to 3,450,000) changed no answer for Breaking Bad S1 E1 and
Severance S1 E2, so the list's choice of version can't be relied on; it isn't sent. Season 99: 404
`episode_not_found`; a film not in the list: 404 `no_submissions`.

## 10. Who does what

**Web (`app/tv/js/`):**
- Built: `intros.js` (ask, keep, clean); `player.js` (`segments` with `level`, `recapAuto` by 4.3's rule, `mode`; the
  next item's times ahead with `recapAuto: 'prev'`; nothing when Off; saves `skipIntro` from the player);
  `screens/account.js` (the row, `Show a button` / `Skip by itself` / `Off`).
- **To add:** the `t-cap` under the Playback rows (4.1); the show's choice, the press count, the offer, the doubtful
  mark and `watched` (9.5); cases in `tests/intros-test.js` for 4.3's "episode before" (the queue's item before at 80%,
  a season's E1 after the finale in the queue, E−1 opened on its own, 5 s of the episode before doesn't count) and for
  the offer's conditions.

**Native (`android/.../player/`), to build:** `PlayerActivity`: chip kinds `CHIP_SKIP`, `CHIP_SKIPBACK` and
`CHIP_OFFER` (48 / 60 / 64 high, the drain line), the OK guard for them, Up next and the end card (caps at 40% until
binding), the 10 s / 5 s / 8 s lives, the checks (9.3) and the subtitle check with its spoken-line filter (9.4) in
`Subs` (also for `lastLineEnd`), the jump and the `PlayerMessage`s (3.5), the segments kept per item (`ahead`) and
`recapAuto: 'prev'`, what may skip by itself (4.3), Up next's start, its Back (the queue kept, no second count,
pause at the end, the end card and its 5 min close) and `watched` (5.1), the key column hidden with the controls up,
the hint labels and their per-chip counts, the subtitle step (2.1), the Options row `Intros in this show` and its
radio panel, the `skip` / `skipShow` / `offer` / `watched` events, the diagnosis log counts (15). `VodControls`: the
`Skip intro` and `Back to intro` pills, ▲ landing on a fresh window's pill, focus to the thumb when a pill goes. `Ui`:
skipFwd.

**Outside this folder (for the lead):** UI-SPEC 7's Up next row should point to section 5.1 here.

## 11. Every string

| Where | String |
|---|---|
| Skip chip | `Skip intro` · `Skip recap` · `Skip recap and intro` (with the `OK` key cap) |
| Way-back chip | `Intro skipped` · `Recap skipped` · `Recap and intro skipped` / `27 s` (`3 min`) / `OK` `go back` |
| Offer | `Always skip this show's intro?` / `OK` `yes` · `Back` `not now`; after OK, for 2 s: `Done: this show's intros skip by themselves` |
| Row pills | `Skip intro` · `Skip recap` · `Skip recap and intro`; after a skip `Back to intro` · `Back to recap` · `Back to recap and intro` |
| Hint bar | before binding: `OK Pause`; then `OK Skip intro` (`Skip recap`, `Skip recap and intro`), `OK Go back`, with `◀ ▶ Seek 10 s · ▲ Buttons · Back Hide`; the offer: `OK Yes · Back Not now · ◀ ▶ Seek 10 s · ▲ Buttons`; Up next: `OK Play now · Back Stay here`; the end card: `OK Play now · Back Close` |
| Up next, counting | `Next episode in 13 s` · `S1 · E2 · Charlie Wants an Abortion` · `OK` `play now` · `Back` `stay here` |
| Up next, the end card | `Next episode` · the episode · `OK` `play now` · `Back` `close` |
| Options row | `Intros in this show`, value `Same as Account` · `Skip by itself` · `Show a button`; disabled: `Off in Account` |
| Its panel | head `Intros in this show`; `Same as Account` / `Now: Show a button` (`Now: Skip by itself`), `Skip by itself` / `You can go back for 5 s`, `Show a button` / `One press skips it` |
| Its foot | line 1: `This episode: recap, intro and credits known.` (the parts it has) · `Not known for this episode.` · `Intro times unsure for this episode.` · `You went back after a skip: buttons for 7 days.`; line 2: `Recaps skip by themselves when you just watched the episode before.` |
| Account > Playback | row `Skip intros and recaps`, line `In series, from TheIntroDB`; choices `Show a button` / `One press skips it`, `Skip by itself` / `You can go back for 5 s`, `Off` / `No buttons`; under the rows: `Recaps skip by themselves when you just watched the episode before. A show can have its own choice for intros: press ▼ in an episode.` |

## 12. The owner's answers (27 Oct)

1. **Intros never skip by themselves by default:** Show a button is the default; skipping by itself stays a choice in
   Account.
2. **Recaps skip by themselves** (with the 5 s way back) when the episode before was watched in the last 3 days, **in
   the default too**; otherwise the recap gets the button. (In a binge, "the episode before" is the one just played.)
3. **The chip stays 10 s,** then ▲ OK.
4. **Up next:** the card at the credits start with a 15 s count, OK plays now, Back stays, and if he does nothing the
   next episode plays ("maybe a timer if you don't press back within 15 secs").
5. **Intros skip by themselves per show,** when he has turned that on for that show (4.4: the offer after 2 presses,
   and ▼ Options).

## 13. Later (not in v1)
- **Seek bar gaps** at the edges of a known recap, intro and credits, and the scrub bubble's part name (`2:01 ·
  Intro`). Small on a 22 min bar from the sofa; try with the owner once the chips are in.
- **Films:** a credits mark, and anything at a film's credits.
- **"Finished" at the credits** for Continue watching (it would need the credits start stored in the progress record
  and a floor, such as 90%). Moving on with Up next does mark the episode watched (5.1).
- **The action chip on the drain line** (one timer rule for the corner): a UI-SPEC question.

## 14. Acceptance

Run on the emulator (`tests/android-test-boot.js`) with `tuner.introBase` pointing at a fake TheIntroDB in
`tests/mock-provider.js` that answers It's Always Sunny S1 E1, E2 and E3 (the real times, section 0), Lost S1 E24 and
S2 E1, with an anchored downloaded subtitle file for S1 E1 only. The pure parts (9.3, 9.4 and its filter, the
combine rule in 4.1, the "episode before" in 4.3, the offer's conditions) also as `tests/intros-test.js` cases.

| AC | Check | Pass |
|---|---|---|
| SK-1 | Play S1 E1 from 1:40, no key pressed | the `Skip intro` chip at 1:44 (± 1 s), gone by 1:54 |
| SK-2 | OK on the chip after 1 s | position 2:11.1 (± 0.3 s); the way-back chip `Intro skipped / 28 s` |
| SK-3 | OK within 0.7 s of the chip appearing | the player pauses; no skip; the cap was at 40% |
| SK-4 | OK twice, 0.3 s apart | one skip; the second OK does nothing |
| SK-5 | OK on the way-back chip after 1 s (a pressed skip) | position 1:44 (± 0.3 s); no chip again in this play; ▲ lands on Play |
| SK-6 | Back on the chip | the chip goes; the player stays; ◀ once: no chip |
| SK-7 | ▲ during a fresh intro | the controls, focus on `Skip intro` (last of the left group); OK skips; focus on the seek thumb |
| SK-8 | A key pressed at 1:43.5 | the chip appears at 1:45 (1.5 s of quiet) and lasts until 1:55 |
| SK-9 | Account Off | no request to the fake list (its log); no chip; Up next by today's rule |
| SK-10 | Lost S2 E1 reached by Up next from S1 E24 (played to the end) | the recap skips by itself from the first frame, the way-back chip `Recap skipped` |
| SK-11 | Lost S2 E1 opened from the series page | the `Skip recap` chip |
| SK-12 | Skip intro pressed in S1 E1, then in S1 E2 (Sure) | 10 s after E2's way-back chip: the offer; OK: `Done: …` for 2 s; the show is `Skip by itself` |
| SK-13 | That show set, S1 E1 (anchored file, no speech inside) | the intro skips by itself, the way-back chip |
| SK-14 | That show set, S1 E2 (no downloaded file) | the intro skips by itself (option (a)), the way-back chip |
| SK-15 | Back on the offer | the show's choice stays unset; asked once more after the next press in another episode |
| SK-16 | S1 E1 at 21:28, no key | `Next episode in 15 s`; after 15 s S1 E2 plays; S1 E1 is marked watched |
| SK-17 | S1 E1 at 21:28, Back on Up next | the count stops; no count in the last 40 s; CH+ would still play S1 E2; at 22:01 the picture holds and `Next episode · OK play now · Back close` shows |
| SK-18 | A fake answer with credits at 5:51 of 22:00 (Stranger Things shape) | dropped: no Up next before today's rule |
| SK-19 | A fake intro with 3 non-italic spoken lines inside, one 5 to 15 s from its start (anchored file) | dropped; Options foot `Not known for this episode.` |
| SK-20 | Audit (`node tools/audit.js --quiet`) | 9 pages, 0 findings |
| SK-21 | That show set, S1 E1 with its file's verdict faked to "Timing not checked" and 2 lines inside | the intro skips by itself (the file doesn't count); with "Lined up with this copy" it gets the chip |
| SK-22 | The jump with a 2 s rebuffer | the way-back chip shows dimmed through the rebuffer; then 5 s of play; OK binds 0.5 s after the first frame |
| SK-23 | OK within 0.7 s of Up next appearing | the player pauses; no next episode |
| SK-24 | A spoken line 30 s after the credits start | Up next 3 s after that line; a line 3 s after the start doesn't move it |
| SK-25 | The offer let run out twice (in two episodes) | never asked again; the show's choice unset |
| SK-26 | A fake recap ending 2 s before the intro, neither may skip by itself | one chip `Skip recap and intro`, to the intro's end − 0.5 s |
| SK-27 | A two-line subtitle up when the way-back chip shows | the lines step up to end at y 408; a short centred line doesn't move |
| SK-28 | The same joined recap and intro, in a binge (the recap may skip by itself) | the recap skips to the intro's start with `Recap skipped`; then the `Skip intro` chip |
| SK-29 | An advert cue (`www.OpenSubtitles.org`) 20 s after the credits start, and a `Synced by` cue alone in a yes-show's intro | Up next at the credits start; the intro skips by itself |
| SK-30 | An intro with 6 italic lyric lines inside (anchored file) | the chip stays; never a skip by itself |
| SK-31 | Back on Up next in S1 E1, then CH+ to S1 E2 | S1 E2's credits count and move on as normal (the pause at the end was cleared) |
| SK-32 | That show set, S1 E2 (no file): OK on the way-back chip after the skip by itself | the show is doubtful: S1 E3's intro (fake) gets the chip; the foot says `You went back after a skip: buttons for 7 days.` |
| SK-33 | Controls up while Up next counts | no key column; the count goes on; the keys come back when the controls hide |

## 15. What only the TV can tell
- **Whether the owner's remote has a Play/Pause key** (`hasPlayPause()` answers on the TV). Without one, pausing while
  a skip chip floats is Back, OK (2 presses); with the controls up, OK as always.
- Whether 10 s is long enough to notice the chip from the sofa.
- **How often a list time is wrong for his copies.** The diagnosis log counts, per play: windows with an anchored file
  (and how many that file stopped: speech inside), windows skipped by themselves with no evidence, go-backs after a
  skip by itself (the best sign of a wrong jump) and the doubtful marks they set, and Up next starts from the list
  versus the subtitles.
- How many of his shows are in the list, and how often his copies get an anchored subtitle file.
- How long an exact seek rebuffers on his provider.
- Whether "recap" reads well to him; "Skip intro" alone is the fallback.
- Back, Back to leave during a chip (as with the action chip).
