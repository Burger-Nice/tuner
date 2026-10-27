# airglow TV: Skip intro, Skip recap, and Up next at the credits, v1.2

This is the design spec for the engineer. It extends `design/ui-v1/UI-SPEC.md` v1.2 section 7 (the native player: the
action chip, Up next, the hint bar, the VOD controls) and uses the subtitles design (`design/ui-v1/subtitles/SPEC.md`:
the downloaded subtitle file and its timing verdict, 3.4; the IMDb match levels of `../copies/RANKING.md` 4).
Everything not said here follows those.

**The owner, in his words:** "is it possible to have a skip intro thing?" ... "yeah the skip intro too lets get that
done", earlier "also like a play next one when the show is finishing", and on v1.0: "maybe a timer if you don't press
back within 15 secs", "intro could be a skip by its self if you got that setting on for that show".

**The answer, in four parts:**
1. **Skip intro.** When an episode reaches its intro, a small chip in the bottom right says `Skip intro`. One press of
   OK jumps past it, and for 5 s a second chip offers the way back. The times come from TheIntroDB, a free list made
   by viewers.
2. **Recaps skip by themselves** when he watched the episode before in the last 3 days (bingeing), with the same 5 s
   way back. Otherwise the recap gets the button.
3. **Intros skip by themselves per show,** once he has said so for that show: after he pressed Skip intro in 2 of its
   episodes airglow asks once, `Always skip this show's intro?`, and ▼ Options has the choice too.
4. **Up next comes when the credits start,** counts 15 s and plays the next episode. Back stops the count; the next
   episode stays one press away.

| File | What it is |
|---|---|
| `SPEC.md` | this |
| `*.html` (9) | the mocks; `png/*.png` are their 2x renders, `png/contact-sheet.png` shows all nine |
| `skip.css` | the new CSS, prefixed `sk-`: measurements for native views (dp = CSS px) |
| `tools/build.js`, `tools/render.js`, `tools/audit.js` | build the mocks; render them; the self-check (the subtitles audit, unchanged: 9 pages, 0 findings) |
| `REVIEW-independent.md`, `-2.md` | the reviews of v1.0 (6.8 / 10) and v1.1 (7.3) |

## v1.2 changes: every point of review 2

The lead's calls on this round: 2 takes the reviewer's option (a); Back on Up next stops the count and keeps the
queue, the card comes back at the real end; Back on the offer = not now; the way-back chip's 5 s is playing time from
the first frame after the jump, a 0.5 s guard with a dimmed key cap, and a `Back to intro` pill with the controls up;
Up next gets the OK guard; an episode is marked watched when Up next moves on from it; 8 is fixed in the web code and
stated here.

| # | Review point | What changed |
|---|---|---|
| 1 | The check trusts a file whose timing was never checked | **Only an anchored file counts as evidence** (9.4): the verdict "Lined up with this copy" or "Made for this copy". The check uses the cue times as drawn (the file's fix, the speed and his Early or late steps), runs again after every step, and a file not ready by the window's start gives no evidence for this play. AC SK-21 |
| 2 | A show he said yes to will often still show the button | **Option (a)** (4.3): in a yes-show, or with Account's Skip by itself, a window from a Sure match skips by itself **unless an anchored file finds speech inside it**. No file, a late file or an unanchored one: it skips anyway, and the way-back chip covers a wrong jump. The speech veto is logged (15). SK-14 now expects a skip |
| 3 | Back on Up next throws away the binge | **Back stops the count, hides the card, keeps the queue** (5.1). CH+ and the row's `Next episode` still work. The player pauses at the end of this episode (`setPauseAtEndOfMediaItems`) and the card comes back without a count: `Next episode` · `OK play now` · `Back leave`. The hint is `Back Stop the timer`. AC SK-17 |
| 4 | The offer's Back is a permanent No | **Back = not now** (4.4), counted like letting it run out (two of those: never asked again). The show's choice stays unset, so Account still decides. The chip shows both keys (`OK yes · Back not now`, mock 8). The explicit No is in ▼ Options. SK-15 updated |
| 5 | The way-back chip's 5 s isn't 5 s; pausing kills it | **5 s of playing time from the first frame after the jump** (4.2); during the rebuffer it shows with its key cap dimmed. **OK guard 0.5 s** from that first frame, key cap at 40% until it binds. **With the controls up** its life stops and the row has `Back to intro` in the Skip pill's slot (mock 4); when they hide, the chip comes back with what it had left. AC SK-22 |
| 6 | ▲ lands on the Skip pill after he chose to watch | ▲ lands on the Skip pill only while the window is **fresh**: not hidden with Back, not gone back from. Otherwise ▲ lands on Play, and the pill is one ▶ along (3.3). The owner's "10 s, then ▲ OK" still holds for a fresh window |
| 7 | Up next binds OK earlier, unguarded | **Up next gets the same guard** (2.2, 5.1): it waits for 1.5 s without a key press, OK pauses for its first 0.7 s, and OK does nothing for 0.7 s after it goes. AC SK-23 |
| 8 | "Watched the episode before" was too loose | **Fixed in the web code by the lead; the rule** (4.3, 9.5): watched = finished, or played past 80%, in the last 3 days. The episode before = the same season's previous number; a season's E1 never skips its recap by itself (the season before's finale can't be told apart from any episode of it), it gets the chip. Test cases in `tests/intros-test.js` (10) |
| 9 | Autoplay leaves the episode "in progress" | **When Up next moves on** (OK, the count, or OK on the end card) the episode it leaves is marked watched (`markWatched`). Reaching the credits alone still marks nothing (5.1) |
| 10 | Two names for one choice; inherited values | **`Skip by itself` everywhere** (Account's `Skip automatically` is renamed; code change in 10), with the same lines everywhere (`One press skips it`, `You can go back for 5 s`). The show panel has a third choice, **`Same as Account`** (the default, line `Now: Show a button`), so an inherited value is never mistaken for a choice he made (mocks 7 and 9). The Account line is rewritten in plain words (4.1) |
| 11 | Keys that matter go off screen after 5 views | **Back is on the Up next card** (`Back stop`, stacked under `OK play now`, mock 6) **and on the offer** (`Back not now`). The 5-view counts are named per chip: `hint:skip`, `hint:skipback`, `hint:offer`, `hint:upnext` (2.2) |
| 12 | The check is loose at the edges and blunt inside | With option (a) the check can only stop a skip, so v1.1's "speech near both sides" proof is no longer needed and is gone. **Lines within 5 s of an edge trim the window** to clear them (9.4). **Up next is pushed by one spoken line** after the credits start, unless it is within 5 s of the start (5.1). AC SK-24 |
| 13 | Smaller things | The way-back chip and `Back to intro` use catch-up's **skipBack** glyph. Mock 3 says **`27 s`** (S1 E2: 1:18.9 to 1:45.9). **The Options panel stays 384** (the subtitles design's width while a film plays) with `Same as Account` as the value (mock 9). **A resume inside a window:** the 0.7 s OK rule runs from the first frame (3.6). **EXACT:** the jump sets `SeekParameters.EXACT` for its seek and puts back what was set (3.5). **New ACs:** Up next pushed by speech (SK-24), the offer let run out twice (SK-25), the way-back chip over a rebuffer (SK-22), the joined recap and intro (SK-26), the subtitle step (SK-27) |

## v1.1 changes (review 1, 6.8 / 10), in short

The way-back chip after every skip; the OK guard; skips by themselves need a Sure match (made option (a) in v1.2); an
exact jump 0.5 s before the window's end; the row pill last in the left group; the chip returns after a seek only 15 s
or more before the window's end; subtitles step only on overlap; Off asks nothing; "finished at the credits", the seek
bar gaps, the bubble's part names and the film rule moved to Later (13); the acceptance table (14); the offer and the
per-show choice (the owner, 12).

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

## 1. Decisions in one list

1. **One chip in the Up next chip's place** (bottom right, right 48, bottom 64). A skip chip and Up next are never up
   together (3.8).
2. **OK skips only while the chip floats with the controls hidden**, as Up next binds OK, behind the OK guard (2.2),
   which Up next now has too. With the controls up, OK pauses and `Skip intro` is a pill in the row.
3. **The chip stays 10 s** (the owner). The row pill stays for the whole window.
4. **Every skip is followed by the way-back chip for 5 s of playing time** (`OK go back`), pressed or by itself.
5. **Intros: the button by default.** They skip by themselves in a show he said yes to (the offer or ▼ Options), or
   with Account's Skip by itself: on a Sure match, unless an anchored subtitle file finds speech inside the window.
6. **Recaps skip by themselves when he watched the episode before in the last 3 days** (in the default too), on a
   Sure match; otherwise the button.
7. **Up next at the credits start, 15 s, then the next episode.** Back stops the count and keeps the queue; the card
   comes back without a count at the real end. Speech after the credits start pushes the card.
8. **No guessing when the list has nothing** (7). **Off asks nothing** and Up next works as today.
9. **The list is asked only for a Sure or Likely match;** a Likely match never skips by itself.

## 2. Rules every surface follows

### 2.1 Geometry and look (all inside x 48 to 912, y 27 to 513)
- **Skip chip:** right 48 (x 912), bottom 64 (y 476), height 48, radius 16, `bg-1` 94% with the 1 px border, padding
  14 / 12, width = content (`Skip recap and intro` is the widest, about 234). Contents: the skipFwd glyph 20 · the
  label Outfit 700 16 · the `OK` key cap. A 3 dp drain line inside the bottom edge (inset 14 / 12, 5 dp up), pink on
  `surface-3`, over the chip's own dark fill, so it doesn't depend on the picture.
- **Why a drain line, not the ring:** the ring belongs to Up next, which acts when it runs out (the next episode
  plays). The skip chip never acts when it runs out; a ring would say it does. Pink is already the progress colour
  (UI-SPEC 7's seek tint, the subtitles' timing dot); no new colour.
- **Two-line chips**, 60 high, max 420:
  - the way-back chip: the **skipBack** glyph, `Intro skipped` (Outfit 700 16) over `27 s` (14 `text-2`), then
    `OK go back`;
  - the offer: skipFwd, `Always skip this show's intro?` over its two keys, `OK yes · Back not now`.
- **The Up next card** keeps its ring and text; its keys are stacked at the right, `OK play now` over `Back stop`
  (20 high key caps, 4 apart), so it stays within 420 (mock 6).
- **Row pills** (`VodControls.pill`, 40 high, Outfit 700 16, `surface-2`): `Skip intro` with skipFwd 18, or after a
  skip `Back to intro` with skipBack 18. **The last pill of the left group** (after Next episode; after +10 when there
  is none), 16 dp either side. Nothing to its left moves when it comes or goes; the right group is pinned right.
- **Subtitles and the chips:** when a chip (skip, way back, offer, Up next) is up and the subtitle view's laid-out
  text box would touch the chip's box, the text steps up until its bottom is 8 above the chip's top (y 420 for a 48
  chip, 408 for a 60 one). No animation: a line that steps once is easier to read than one that glides. It steps back
  when the chip goes. No touch, no move.
- **Options:** the VOD Options panel keeps the subtitles design's 384 while a film or episode plays (mock 9); the
  `Intros in this show` panel is the same width, rows 50 (mock 7).

### 2.2 Focus, keys and the OK guard
- The chips are HUDs: no ring (UI-SPEC 3.2 exceptions). The row pills take the ring like the other pills.
- **OK means one thing:** a floating chip binds OK only while the VOD controls are hidden, and while it does the hint
  bar's OK label says what OK does (`Skip intro`, `Skip recap`, `Skip recap and intro`, `Go back`, `Yes`, `Play now`).
  After the hint bar's 5 views the chip's own key caps carry it, as the action chip's do; the meaning is never off
  screen (UI-SPEC 6). **Where Back means more than "hide", it is on the chip too:** `Back stop` (Up next), `Back not
  now` (the offer).
- **The 5 views are counted per chip:** `hint:skip`, `hint:skipback`, `hint:offer`, `hint:upnext`.
- **The OK guard** (the skip chip, the offer and Up next):
  - it appears only after 1.5 s without a key press (it waits, if there is still time for it: 5 s of the window, or
    for Up next, before the end);
  - for its first 0.7 s, OK does what it did before (Pause);
  - for 0.7 s after it goes without a press, OK does nothing (the press was meant for it).
- **The way-back chip's guard:** OK binds 0.5 s after the first frame after the jump (a double press can't undo the
  skip); until then its `OK` key cap is drawn at 40%.
- **◀ ▶ don't dismiss the skip chip,** unlike the action chip's "any other key": seeking inside the intro is not a
  "no". Up next works the same way today.
- **Back hides a chip and never leaves the player while one is up.** To leave during an intro: Back, Back.

### 2.3 New glyph (`Ui.Icon` and `util.js`, 24 grid)
- **skipFwd:** the mirror of catch-up's `skipBack`: a filled triangle `M4.5 5.2v13.6L15 12z` and a 2.6 wide bar at x
  16.4 (radius 1). On the skip chip, the offer, the `Skip intro` pill and the Options row.
- **skipBack** (catch-up's, as it is): on the way-back chip and the `Back to intro` pill.

### 2.4 Motion and sound
- The chips fade in 150 ms and out 120 ms (opacity). Nothing else moves. No sound.

### 2.5 Copy rules
- Plain words, no idioms. Lengths as whole seconds of the window (`27 s`) up to 99 s, then minutes (`3 min`).
- "Intro" and "recap" are the words; never "opening", "title sequence" or "previously on".

## 3. The Skip chip

### 3.1 What can get a chip
Only **windows** that passed the checks (9.3, 9.4): at most one recap and one intro per episode, each with a start and
an end on this copy. A window shorter than **8 s** gets nothing (Lost's 11 s intro gets a chip; a 6 s card doesn't).

**Recap then intro:** a recap that ends 3 s or less before the intro starts joins it: one window, `Skip recap and
intro`, to the intro's end. It skips by itself only if both parts would (4.3).

### 3.2 The chip (`player-skip`, `player-recap`)
- **Appears** when play reaches the window's start, the controls are hidden, nothing else floats there, the guard
  allows (2.2), and the window doesn't skip by itself (4.3).
- **Says** `Skip intro`, `Skip recap` or `Skip recap and intro`, with the `OK` key cap. The drain line empties over its
  life.
- **Life:** 10 s of playing time, or until 1 s before the window ends, whichever is first. Paused time doesn't count.
- **Hint bar** with it, the first 5 times: `OK Skip intro · ◀ ▶ Seek 10 s · ▲ Buttons · Back Hide`.

### 3.3 With the controls up (`player-skip-bar`, `player-back-pill`)
- While play is inside a window the row has the `Skip intro` pill, for the **whole** window.
- **▲ lands on that pill while the window is fresh** (not hidden with Back, not gone back from); then the skip is ▲ OK
  any time in the intro. Otherwise ▲ lands on Play, as everywhere else, and the pill is one ▶ along.
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
  word).
- **Exact:** the jump sets `SeekParameters.EXACT` for its own seek and puts back whatever was set before (scrubbing
  may use `CLOSEST_SYNC`). Landing seconds into the story is worse than a slower seek.
- **At once** the skip chip goes and the way-back chip shows with its key cap dimmed; its 5 s start at the first frame
  after the seek (4.2), so a rebuffer doesn't use them up.
- **A failed seek** (a player error after it) goes the player's normal reconnect and failure path; the way-back chip
  goes with the error.
- **By itself** (4.3): one Media3 `PlayerMessage` per window at its start, delivered on the main looper, with a "done"
  flag per window per play, so it can't fire twice. It is not delivered while paused; seeking over the start doesn't
  fire it (3.6 covers landing inside).

### 3.6 Seek back, pause, resume, a second watch
- **After a skip or a Back,** that window's chip comes back only when a seek lands **15 s or more before its end**
  (and 5 s or more of it are left). One ◀ after a skip lands 10.5 s before the end: no chip, just the scene again. The
  row pill is there either way (▲ lands on Play: the window isn't fresh).
- **A seek into a fresh window:** the chip, as at its start.
- **Pause:** the chip's life stops; the controls show with the pill in the row.
- **Resumed inside a window** (Continue watching, the player reopened): the chip at the first frame if 5 s or more of
  the window are left, with the 0.7 s OK rule counted from that first frame. A window that skips by itself: the player
  starts at its end instead, with the way-back chip.
- **First seconds:** a recap at 0:02 gets its chip, or skips, once the first frame is up.
- **A late answer** (the window already started): the chip when it comes, if 5 s or more are left; never a jump by
  itself after the window started.
- **A second watch:** the same as the first. Nothing is kept between plays except the show's choice (4.4).

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

| Choice | Line under it | Intros | Recaps |
|---|---|---|---|
| **Show a button** (`button`, default) | `One press skips it` (built) | the button, unless the show says otherwise | by themselves after the episode before in the last 3 days, else the button |
| **Skip by itself** (`auto`; built as `Skip automatically`: rename) | `You can go back for 5 s` (built) | by themselves, unless the show says `Show a button` | the same rule |
| Off (`off`) | `No buttons` (built) | nothing | nothing; nothing is asked from TheIntroDB, Up next as today |

- The Account row's line (built): `In series, from TheIntroDB`.
- **Under the Playback rows** (a `t-cap`, to add): `Recaps skip by themselves when you watched the episode before in
  the last 3 days. A show can have its own choice for intros: press ▼ in an episode.`
- **What a request sends:** the series' IMDb id, the season and the episode, and with it the TV's internet address.
  No account, no key, nothing else. Off sends nothing.

**For one show: ▼ Options > Intros in this show** (episodes only, the last row; mock 9). Its value is the choice:
`Same as Account`, `Skip by itself` or `Show a button`. OK opens the radio panel (mock 7):

| Row | Line |
|---|---|
| `Same as Account` (default) | `Now: Show a button` (or `Now: Skip by itself`) |
| `Skip by itself` | `You can go back for 5 s` |
| `Show a button` | `One press skips it` |

Foot: this episode's line (8), then `Recaps skip by themselves when you watched the episode before in the last 3 days.`
With Account set to Off, the row is disabled with the value `Off in Account`.

**How they combine:** Account's Off wins over everything. Otherwise a show set to `Skip by itself` or `Show a button`
wins over Account; `Same as Account` (no choice) follows Account. Picking `Same as Account` clears the show's choice.
The recap rule is the same whatever the intro choice.

### 4.2 The way-back chip (after every skip; `player-skipped`)
- Shows the moment a skip starts, pressed or by itself: `Intro skipped` / `27 s` · `OK go back` (also `Recap
  skipped`, `Recap and intro skipped`). The length is the window's, in whole seconds.
- **Life: 5 s of playing time, counted from the first frame after the jump.** While the picture rebuffers it shows,
  key cap dimmed, and its time doesn't run.
- **OK** binds 0.5 s after that first frame (2.2). It seeks back to the window's start; the chip goes. That window is
  then left alone for the rest of this play: no skip by itself, no Skip chip (he chose to watch it). The `Skip intro`
  pill is still in the row, not fresh (3.3).
- **The controls up during its life:** `Back to intro` in the row, the life stopped (3.3, mock 4).
- **Back:** hides it. Other keys as 3.4; a panel opening ends it.
- Hint bar (first 5 times): `OK Go back · ◀ ▶ Seek 10 s · ▲ Buttons · Back Hide`.

### 4.3 What may skip by itself
- **An intro** skips by itself when the show is set to `Skip by itself` (or it is `Same as Account` and Account says
  Skip by itself), the match is **Sure**, and an anchored subtitle file (9.4) does **not** find speech inside the
  window. With no file, a file that isn't ready by the window's start, or a file that isn't anchored, it skips: the
  way-back chip covers a wrong jump. A Likely match never skips by itself: the chip.
- **A recap** skips by itself when the episode before was **watched** in the last 3 days and the match is Sure.
  Watched = finished, or played past 80%. The episode before = the same season's previous episode; a season's E1
  never skips its recap by itself, it gets the chip (built: `recapAuto`, the lead's fix). Recaps
  aren't checked against speech (they are speech).
- **Never** after a late answer once the window started (3.6), with another chip up, or on a window skipped or gone
  back to in this play.

At the window's start: the jump (3.5) and the way-back chip.

### 4.4 The offer: "Always skip this show's intro?" (`player-offer`)
- **When:** the second time he presses Skip intro (the chip or the row pill) in **a different episode** of the same
  show, with the show's choice unset and fewer than 2 offers let go. A skip he went back from doesn't count.
- **Where and when on screen:** 10 s after the way-back chip goes, well past the intro, never inside a window, never
  with the controls, a panel or another chip up, and not in the last 2 min before the credits (then it waits for the
  next episode's start + 10 s). The OK guard applies.
- **Says:** `Always skip this show's intro?` / `OK yes · Back not now`, the drain line over **8 s of playing time**.
  Hint bar (first 5 times): `OK Yes · Back Not now · ◀ ▶ Seek 10 s · ▲ Buttons`.
- **OK:** this show is set to `Skip by itself`. No toast: the next intro skips with the way-back chip, which shows it
  worked.
- **Back, or the 8 s run out:** "not now". The show's choice stays unset (Account still decides). It is asked once
  more after his next press in another episode; let go twice, never asked again.
- The No he means for good is ▼ Options > Intros in this show > `Show a button`.
- Playback never stops for it; it is a chip like the action chip.

## 5. Credits and Up next

### 5.1 Episodes (`player-upnext-credits`)
Up next keeps its look and its ring: `Next episode in 13 s` · the episode, with `OK play now` over `Back stop`. **If
he does nothing for 15 s, the next episode plays** (the owner).

**When it comes:**

| The credits time | Up next |
|---|---|
| **Known** and passed 9.3, no spoken line after it in a downloaded subtitle file (or no downloaded file) | at the credits start, counting 15 s (mock 6) |
| **Known, but a spoken line starts after it** (not within 5 s of the credits start: that is a line running over the cut; any downloaded file counts here, since pushing the card later is the safe way) | 3 s after the last spoken line if that leaves 15 s or more, else the last 40 s, counting to the end. Sung credits the file doesn't mark as music only delay the card |
| **Not known,** the list didn't answer, a Likely or Unsure match without an answer, or Off | today's rule (3 s after the last spoken line when that leaves 20 s to 5 min, else the last 40 s) |

**The guard** (2.2): the card waits for 1.5 s without a key press; for its first 0.7 s OK pauses; for 0.7 s after it
goes, OK does nothing. Hint bar (first 5 times): `OK Play now · Back Stop the timer`.

**Keys on the counting card:**
- **OK:** the next episode now.
- **Back:** stops the count and hides the card. **The queue stays:** CH+ and the row's `Next episode` still work. The
  player is set to pause at the end of this episode (`setPauseAtEndOfMediaItems(true)` for this item).
- **At the real end** after a Back: the picture holds its last frame and the card comes back **without a count**:
  `Next episode` · the episode · `OK play now` · `Back leave`, the next glyph in a 40 disc in place of the ring. OK
  plays it; Back leaves the player, as Back at the end does today.
- **Marked watched:** when Up next moves on (OK, the count, or OK on the end card), the episode it leaves is marked
  watched (`markWatched`). Reaching the credits alone marks nothing.

**Also:**
- **A preview** (a "next time" teaser): its start counts as the credits start when it is earlier and passes the same
  checks; the teaser is the next episode's story. No `Skip preview` chip.
- **Prefetch** (built): the next episode's times are asked when an episode starts, so its 0:02 recap is known.

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
  his Skip intro presses for the offer, 4.4, is different: it counts a choice, not a time.)
- **Sending his skips to TheIntroDB.** It needs an account and is outward-facing; not asked for.

▶ (10 s a press) and holding ▶ still get past any intro, as today.

## 8. All states

| State | Intro | Recap | Up next | Options foot (line 1) |
|---|---|---|---|---|
| Sure, intro and credits known, an anchored downloaded file | chip; by itself in a yes-show unless the file finds speech inside | by itself after the episode before in 3 days, else chip | at the credits, 15 s | `This episode: intro and credits known.` |
| Sure, no anchored file (none, late, unanchored, or the file's own) | chip; by itself in a yes-show | as above | at the credits, 15 s | the same |
| Only credits known (Always Sunny S1 E3) | none | none | at the credits | `This episode: credits known, no intro.` |
| Only an intro known | as above | | today's rule | `This episode: intro known.` |
| 404 (`no_submissions`, `episode_not_found`) | none | none | today's rule | `Not known for this episode.` |
| Match Likely | chip, never by itself | chip, never by itself | at the credits | as known |
| Match Unsure, or no IMDb id | not asked | | today's rule | `Not known for this episode.` |
| No answer in 6 s, 429, 5xx, offline | what was kept, else none; asked again next play | | today's rule | `Not known for this episode.` |
| Two intros, settled by an anchored file (9.4) | the chosen one | | | as known |
| Two intros, no anchored file or a tie | none | | | `Intro times unsure for this episode.` |
| An intro window with 3 or more spoken lines inside, from an anchored file (another cut) | dropped | | | `Not known for this episode.` if nothing is left |
| An add-on copy | the same rules (its own `tt` id: Sure) | | | |
| Resumed in a window | 3.6 | | | |
| A 6 s intro | none | | | as known |
| A 3 min recap | | 10 s chip, then ▲ OK; way back reads `3 min` | | |
| Account Off | nothing; nothing asked | | today's rule | (the row is disabled: `Off in Account`) |

## 9. Data rules

### 9.1 When to ask (built: `app/tv/js/intros.js` `segmentsFor`, `player.js` `sendSegments`)
- When an episode or film starts and when the queue moves on (`track`), plus the next episode ahead of time.
- **Gate:** an add-on item's own `tt` id (Sure), or the title's match unless it is Unsure. With Account Off,
  nothing. Never for live TV or catch-up programmes.

### 9.2 The request (built)
- `GET https://api.theintrodb.org/v4/media?imdb_id=tt…&season=S&episode=E` (films: `imdb_id` only), anonymous.
- **Timeout 6 s.** Busy or down: what was kept, else nothing; asked again next time it plays.
- **Limits** (the headers on 27 Oct): 30 per 10 s and 5000 a day per address; airglow needs about two per episode.
- **Kept** (`Core.cache`, per `imdb:S:E`): an answer 30 days, a 404 one day, errors not at all.
- **Cleaned** (`parseSegments`): `0/0` = confirmed none, dropped; `end_ms: null` on credits or a preview = to the
  end; an intro or recap needs an end.

### 9.3 The checks on the answer (native, which knows the copy's real length D)
- **Recap:** starts in the first 8 min; 5 s to 5 min long.
- **Intro:** starts in the first 40% of D and ends at least 60 s before the credits start (or the end); 8 s to 3 min.
- **Credits:** start in the last 25% of D, at least 10 s and at most 12 min before the end, and after the intro's
  end. Stranger Things S2 E2's "credits" at 5:51 fail and are dropped.
- **Preview:** the same as credits.
- **Anything past D:** dropped.

### 9.4 The subtitle check (native, `Subs`)
**Which file counts:** a downloaded file whose timing verdict (subtitles SPEC 3.4) is **"Lined up with this copy"** or
**"Made for this copy"** (an anchored file), and only once it is ready. "Lined up with other subtitles" and "Timing
not checked" don't count for intros; nor do the file's own subtitles (they can't be read ahead).

**Which times:** the cue times as drawn: the file's stored fix, its speed and his Early or late steps (subtitles 7.5).
The check runs again after every step; a skip already made is not undone.

**Too late:** a file that is not ready by the window's start gives no evidence for that window in this play (Game of
Thrones' intro at 0:06 often comes before the file does).

A **spoken line** is one whose text is not only music (`♪`, `♫`), sounds in brackets, or empty.
- **Lines within 5 s of a window's edge** trim the window to clear them (a cold open's last word, the scene's first).
  A window trimmed under 8 s gets nothing.
- **1 or 2 spoken lines inside** (after trimming): the window gets the chip, never a skip by itself.
- **3 or more:** dropped (the copy is offset or another cut).
- **Two intros that disagree** (Severance S1 E2): with an anchored file, the one with fewer spoken lines inside wins;
  a tie, or no anchored file: none is used.
- **Credits:** any downloaded file can push Up next (5.1), since that only moves the card later.

### 9.5 What the native player is sent
Built: `command('segments', { id, intro, recap, credits, preview, level, recapAuto, mode })`: each list `{ start, end }`
in ms (end 0 = to the end); `level` `sure` | `likely`; `recapAuto` (4.3's rule: the episode before watched, finished
or past 80%, in the last 3 days); `mode` `button` | `auto` | `off`.

**To add for the show's choice and the offer (4.1, 4.4):**
- `mode` becomes the intro mode **for this show** (the show's choice if set, else Account's), and `show` adds
  `{ key, name, choice: 'auto' | 'button' | null, offer: bool }`. `offer` is true when this show has one counted press
  in another episode, no choice, and fewer than 2 offers let go.
- New native events: `skip` `{ show, episode, how: 'press' | 'self', back: bool }` (the web side counts presses per
  show in distinct episodes and drops a press he went back from); `setting` `skipShow` `{ show, value: 'auto' |
  'button' | null }` (the offer's OK, and the Options panel; `null` = Same as Account); `offer` `{ show, letGo: true }`
  (Back, or the 8 s ran out); `watched` `{ index }` when Up next moves on (the web side calls `markWatched`).
- The web side keeps per show (`store`, per account): `choice`, the episodes pressed in, `letGo`.

### 9.6 Checked with curl on 27 Oct 2026
The table in section 0. `duration_ms` (2,000,000; 3,200,000 to 3,450,000) changed no answer for Breaking Bad S1 E1 and
Severance S1 E2, so the list's choice of version can't be relied on; it isn't sent. Season 99: 404
`episode_not_found`; a film not in the list: 404 `no_submissions`.

## 10. Who does what

**Web (`app/tv/js/`):**
- Built: `intros.js` (ask, keep, clean); `player.js` (`segments` with `level`, `recapAuto` by 4.3's rule, `mode`; the
  prefetch; nothing when Off; saves `skipIntro` from the player); `screens/account.js` (the row and its radio menu).
- **To change:** rename `Skip automatically` to `Skip by itself` (the row's value and the radio); the `t-cap` under the
  Playback rows (4.1); the show's choice, the press count, the offer and `watched` (9.5); `tests/intros-test.js` cases
  for 4.3's "episode before" (E−1 at 80%, an E1 gets the chip, 5 s of the episode before doesn't count).

**Native (`android/.../player/`), to build:** `PlayerActivity`: chip kinds `CHIP_SKIP`, `CHIP_SKIPBACK` and
`CHIP_OFFER` (48 / 60 high, the drain line), the OK guard for them and for Up next, the 10 s / 5 s / 8 s lives on
playing time (the way-back chip's from the first frame after the jump), the checks (9.3) and the subtitle check (9.4)
with `Subs`, the jump and the `PlayerMessage`s (3.5), what may skip by itself (4.3), Up next's start, its Back (the
queue kept, pause at the end, the end card) and `watched` (5.1), the hint labels and their per-chip counts, the
subtitle step (2.1), the Options row `Intros in this show` and its radio panel, the `skip` / `skipShow` / `offer` /
`watched` events, the diagnosis log counts (15). `VodControls`: the `Skip intro` and `Back to intro` pills, ▲ landing
on a fresh window's pill, focus to the thumb when a pill goes, Up next's card keys. `Ui`: skipFwd.

## 11. Every string

| Where | String |
|---|---|
| Skip chip | `Skip intro` · `Skip recap` · `Skip recap and intro` (with the `OK` key cap) |
| Way-back chip | `Intro skipped` · `Recap skipped` · `Recap and intro skipped` / `27 s` (`3 min`) / `OK` `go back` |
| Offer | `Always skip this show's intro?` / `OK` `yes` · `Back` `not now` |
| Row pills | `Skip intro` · `Skip recap` · `Skip recap and intro`; after a skip `Back to intro` · `Back to recap` · `Back to recap and intro` |
| Hint bar | `OK Skip intro` (`Skip recap`, `Skip recap and intro`), `OK Go back`, with `◀ ▶ Seek 10 s · ▲ Buttons · Back Hide`; the offer: `OK Yes · Back Not now · ◀ ▶ Seek 10 s · ▲ Buttons`; Up next: `OK Play now · Back Stop the timer` |
| Up next, counting | `Next episode in 13 s` · `S1 · E2 · Charlie Wants an Abortion` · `OK` `play now` · `Back` `stop` |
| Up next, at the end after Back | `Next episode` · the episode · `OK` `play now` · `Back` `leave` |
| Options row | `Intros in this show`, value `Same as Account` · `Skip by itself` · `Show a button`; disabled: `Off in Account` |
| Its panel | head `Intros in this show`; `Same as Account` / `Now: Show a button` (`Now: Skip by itself`), `Skip by itself` / `You can go back for 5 s`, `Show a button` / `One press skips it` |
| Its foot | line 1: `This episode: intro and credits known.` · `This episode: intro known.` · `This episode: credits known, no intro.` · `Not known for this episode.` · `Intro times unsure for this episode.`; line 2: `Recaps skip by themselves when you watched the episode before in the last 3 days.` |
| Account > Playback | row `Skip intros and recaps`, line `In series, from TheIntroDB`; choices `Show a button` / `One press skips it`, `Skip by itself` / `You can go back for 5 s`, `Off` / `No buttons`; under the rows: `Recaps skip by themselves when you watched the episode before in the last 3 days. A show can have its own choice for intros: press ▼ in an episode.` |

## 12. The owner's answers (27 Oct)

1. **Intros never skip by themselves by default:** Show a button is the default; skipping by itself stays a choice in
   Account.
2. **Recaps skip by themselves** (with the 5 s way back) when the episode before was watched in the last 3 days, **in
   the default too**; otherwise the recap gets the button.
3. **The chip stays 10 s,** then ▲ OK.
4. **Up next:** the card at the credits start with a 15 s count, OK plays now, Back stops it, and if he does nothing
   the next episode plays ("maybe a timer if you don't press back within 15 secs").
5. **Intros skip by themselves per show,** when he has turned that on for that show (4.4: the offer after 2 presses,
   and ▼ Options).

## 13. Later (not in v1)
- **Seek bar gaps** at the edges of a known recap, intro and credits, and the scrub bubble's part name (`2:01 ·
  Intro`). Small on a 22 min bar from the sofa; try with the owner once the chips are in.
- **Films:** a credits mark, and anything at a film's credits.
- **"Finished" at the credits** for Continue watching (it would need the credits start stored in the progress record
  and a floor, such as 90%). Moving on with Up next does mark the episode watched (5.1).

## 14. Acceptance

Run on the emulator (`tests/android-test-boot.js`) with `tuner.introBase` pointing at a fake TheIntroDB in
`tests/mock-provider.js` that answers It's Always Sunny S1 E1, E2 and E3 (the real times, section 0) and Lost S2 E1,
with an anchored downloaded subtitle file for S1 E1 only. The pure parts (9.3, 9.4, the combine rule in 4.1, the
"episode before" in 4.3, the press count in 9.5) also as `tests/intros-test.js` cases.

| AC | Check | Pass |
|---|---|---|
| SK-1 | Play S1 E1 from 1:40, no key pressed | the `Skip intro` chip at 1:44 (± 1 s), gone by 1:54 |
| SK-2 | OK on the chip after 1 s | position 2:11.1 (± 0.3 s); the way-back chip `Intro skipped / 28 s` |
| SK-3 | OK within 0.7 s of the chip appearing | the player pauses; no skip |
| SK-4 | OK twice, 0.3 s apart | one skip; the second OK does nothing |
| SK-5 | OK on the way-back chip after 1 s | position 1:44 (± 0.3 s); no chip again in this play; ▲ lands on Play |
| SK-6 | Back on the chip | the chip goes; the player stays; ◀ once: no chip |
| SK-7 | ▲ during a fresh intro | the controls, focus on `Skip intro` (last of the left group); OK skips; focus on the seek thumb |
| SK-8 | A key pressed at 1:43.5 | the chip appears at 1:45 (1.5 s of quiet) |
| SK-9 | Account Off | no request to the fake list (its log); no chip; Up next by today's rule |
| SK-10 | Lost S2 E1 with S1 E24 finished yesterday | the recap skips by itself, the way-back chip `Recap skipped` |
| SK-11 | Lost S2 E1 with S1 E24 played 5 s yesterday | the `Skip recap` chip |
| SK-12 | Skip intro pressed in S1 E1, then in S1 E2 | 10 s after E2's way-back chip: the offer; OK: the show is `Skip by itself` (Options shows it) |
| SK-13 | That show set, S1 E1 (anchored file, no speech inside) | the intro skips by itself, the way-back chip |
| SK-14 | That show set, S1 E2 (no downloaded file) | the intro skips by itself (option (a)), the way-back chip |
| SK-15 | Back on the offer | the show's choice stays unset; asked once more after the next press in another episode |
| SK-16 | S1 E1 at 21:28, no key | `Next episode in 15 s`; after 15 s S1 E2 plays; S1 E1 is marked watched |
| SK-17 | S1 E1 at 21:28, Back on Up next | the count stops; CH+ would still play S1 E2; at 22:01 the picture holds and `Next episode · OK play now · Back leave` shows |
| SK-18 | A fake answer with credits at 5:51 of 22:00 (Stranger Things shape) | dropped: no Up next before today's rule |
| SK-19 | A fake intro with 3 spoken lines inside (anchored file) | no chip; Options foot `Not known for this episode.` |
| SK-20 | Audit (`node tools/audit.js --quiet`) | 9 pages, 0 findings |
| SK-21 | That show set, S1 E1 with its file's verdict faked to "Timing not checked" and 2 lines inside | the intro skips by itself (the file doesn't count); with "Lined up with this copy" it gets the chip |
| SK-22 | The jump with a 2 s rebuffer | the way-back chip shows dimmed through the rebuffer; then 5 s of play; OK binds 0.5 s after the first frame |
| SK-23 | OK within 0.7 s of Up next appearing | the player pauses; no next episode |
| SK-24 | A spoken line 30 s after the credits start | Up next 3 s after that line, not at the credits start; a line 3 s after the start doesn't move it |
| SK-25 | The offer let run out twice (in two episodes) | never asked again; the show's choice unset |
| SK-26 | A fake recap ending 2 s before the intro | one chip `Skip recap and intro`, to the intro's end − 0.5 s |
| SK-27 | A two-line subtitle up when the way-back chip shows | the lines step up to end at y 408; a short centred line doesn't move |

## 15. What only the TV can tell
- **Whether the owner's remote has a Play/Pause key** (`hasPlayPause()` answers on the TV). Without one, pausing while
  a skip chip floats is Back, OK (2 presses); with the controls up, OK as always.
- Whether 10 s is long enough to notice the chip from the sofa.
- **How often a list time is wrong for his copies.** The diagnosis log counts, per play: windows with an anchored file
  (and how many that file stopped: speech inside), windows skipped by themselves with no evidence, way-back presses
  after a skip by itself (the best sign of a wrong jump), and Up next starts from the list versus the subtitles.
- How many of his shows are in the list, and how often his copies get an anchored subtitle file.
- How long an exact seek rebuffers on his provider.
- Whether "recap" reads well to him; "Skip intro" alone is the fallback.
- Back, Back to leave during a chip (as with the action chip).
