# airglow TV: Skip intro, Skip recap, and Up next at the credits, v1.1

This is the design spec for the engineer. It extends `design/ui-v1/UI-SPEC.md` v1.2 section 7 (the native player: the
action chip, Up next, the hint bar, the VOD controls) and uses the subtitles design (`design/ui-v1/subtitles/SPEC.md`:
the downloaded subtitle file, the IMDb match levels of `../copies/RANKING.md` 4). Everything not said here follows
those.

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
4. **Up next comes when the credits start,** counts 15 s and plays the next episode unless he presses Back.

| File | What it is |
|---|---|
| `SPEC.md` | this |
| `*.html` (8) | the mocks; `png/*.png` are their 2x renders, `png/contact-sheet.png` shows all eight |
| `skip.css` | the new CSS, prefixed `sk-`: measurements for native views (dp = CSS px) |
| `tools/build.js`, `tools/render.js`, `tools/audit.js` | build the mocks; render them; the self-check (the subtitles audit, unchanged: 8 pages, 0 findings) |
| `REVIEW-independent.md` | the review of v1.0 (6.8 / 10) |

## v1.1 changes: every review point, with the owner's and the lead's decisions

The owner's answers are listed in section 12. The lead: Off asks TheIntroDB nothing; a way-back chip after a manual
skip too; an OK guard; drop or tighten "finished at the credits"; the seek bar gaps, the bubble's part names and the
film rule are "later"; an acceptance table.

| # | Review point | What changed |
|---|---|---|
| 1 | Up next autoplays on data that may be wrong | **The owner chose the autoplay** ("a timer if you don't press back within 15 secs"): the card at the credits start, 15 s, then the next episode; Back stays. The safety kept and stated (5.1): the credits time must pass 9.3 (the last 25%, 10 s to 12 min from the end, after the intro, inside the copy), and spoken lines after it in a downloaded subtitle file push the card to 3 s after the last one. With no credits time, today's rule. The risk that is left (a wrong time on a copy with no downloaded file) is in section 15 for the TV to show |
| 2 | No way back after a manual skip | **The way-back chip follows every skip,** pressed or by itself (4.2, mock 3): `Intro skipped` / `28 s` · `OK go back`, 5 s. v1.0's "he presses ◀" is gone |
| 3 | The chip takes OK at a moment he doesn't choose | **The OK guard (2.2):** the chip waits for 1.5 s without a key press; for its first 0.7 s OK still pauses; for 0.7 s after it times out OK does nothing; the way-back chip ignores OK for its first 1.5 s, so a double press doesn't undo the skip. Pausing while the chip floats: Back, then OK, or Play/Pause if the remote has it (section 15) |
| 4 | Offset copies make the chip misbehave | **Anything that skips by itself needs a checked window (4.3):** a Sure match, and for intros a downloaded subtitle file with no speech inside the window and speech close on either side. Unchecked windows get the button; the way-back chip covers a wrong jump; the row pill stays for the whole window, so a late intro is still ▲ OK away. The jump lands 0.5 s before the end, seeked exactly (3.5). Checked, unchecked and dropped windows are counted in the diagnosis log. The chip's 10 s stays (the owner) |
| 5 | "Finished at the credits" can hide story | **Dropped from v1** (13). `inProgress` stays at 94% |
| 6 | Off still calls the network | **Off asks nothing** (the lead; the code does this). 4.1 says what a request sends |
| 7 | Words | `OK go back` (not "watch it"); `28 s` (not `1:19 to 1:46`). **One name per setting:** `Skip intros and recaps` (Account, for every show) and `Intros in this show` (▼ Options, this show). Options' foot is short and doesn't name TheIntroDB; Account does. `Not known: which show is this?` is gone |
| 8 | Hidden rules in automatic | **The rules are written where he chooses** (Account's line under the rows, the Options foot), and there are three, each with a visible result: recaps skip when he watched the one before in the last 3 days; a show he said yes to skips its intro; only checked times skip by themselves. Every skip by itself shows the way-back chip, so nothing happens unseen |
| 9 | Seeking under-specified | 3.5: `SeekParameters.EXACT`, land at the end − 0.5 s, the way-back chip at once (it is the "skipping" state too), a failed seek goes the normal error path; skips by themselves use one `PlayerMessage` per window on the main looper with a "done" flag, never while paused |
| 10 | The row pill moves the row; focus when it goes | The pill is the **last** of the left group, after Next episode, so nothing slides (mock 2), 16 dp either side (audit RING passes). Focus goes to the seek thumb when it disappears under the ring |
| 11 | Seek-back loop | After a skip or a Back, the chip returns only when a seek lands **15 s or more before the window's end** (one ◀ after a skip lands 10.5 s before: no chip) (3.6) |
| 12 | Subtitles move for no overlap | **They move only when their laid-out box would touch the chip's box,** to 8 above it, with no animation (2.1). Mock 4's short line stays; mock 3's two lines move |
| 13 | Scope creep | Seek bar gaps, the bubble's part names, the film credits rule and "finished" are **later** (13) |
| 14 | Builder gaps | **Acceptance table (14).** Mocks added: the Options root row (8), the offer (7). "To add" items brought up to what is built (commit 066d6fa, 9 and 10), with what the code must change listed in 10. Said outright: the key cap carries OK after the hint bar's 5 views (2.2); ◀ ▶ don't dismiss the chip (2.2); why a drain line, not a ring (2.1); Back twice to leave during a chip (15) |

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
2. **OK skips only while the chip floats with the controls hidden**, as Up next binds OK today, behind the OK guard
   (2.2). With the controls up, OK pauses and `Skip intro` is a pill in the row, where ▲ lands.
3. **The chip stays 10 s** (the owner). The row pill stays for the whole window.
4. **Every skip is followed by the way-back chip for 5 s** (`OK go back`), pressed or by itself.
5. **Intros: the button by default.** They skip by themselves only in a show he said yes to (the offer or ▼ Options),
   or with Account's Skip automatically, and only on a checked window.
6. **Recaps skip by themselves when he watched the episode before in the last 3 days** (in the default too), on a
   Sure match; otherwise the button.
7. **Up next at the credits start, 15 s, then the next episode**; Back stays. Speech after the credits pushes it.
8. **No guessing when the list has nothing** (7). **Off asks nothing** and Up next works as today.
9. **The list is asked only for a Sure or Likely match;** Likely is never checked, so it never skips by itself.

## 2. Rules every surface follows

### 2.1 Geometry and look (all inside x 48 to 912, y 27 to 513)
- **Skip chip:** right 48 (x 912), bottom 64 (y 476), height 48, radius 16, `bg-1` 94% with the 1 px border, padding
  14 / 12, width = content (`Skip recap and intro` is the widest, about 234). Contents: the skipFwd glyph 20 · the
  label Outfit 700 16 · the `OK` key cap. A 3 dp drain line inside the bottom edge (inset 14 / 12, 5 dp up), pink on
  `surface-3`, over the chip's own dark fill, so it doesn't depend on the picture.
- **Why a drain line, not the ring:** the ring belongs to Up next, which acts when it runs out (the next episode
  plays). The skip chip never acts when it runs out; a ring would say it does. Pink is already the progress colour
  (UI-SPEC 7's seek tint, the subtitles' timing dot); no new colour.
- **Two-line chips** (the way-back chip, the offer): the same chip, 60 high, max 420; line 1 Outfit 700 16, line 2 14
  `text-2` (ellipsis), then the key cap and its word.
- **Row pill:** `VodControls.pill` (40 high, Outfit 700 16, `surface-2`) with the skipFwd glyph 18 in place of the
  chevron. **The last pill of the left group** (after Next episode; after +10 when there is none), 16 dp either side.
  Nothing to its left moves when it comes or goes; the right group is pinned right.
- **Subtitles and the chips:** when a chip (skip, way back, offer, Up next) is up and the subtitle view's laid-out
  text box would touch the chip's box, the text moves up until its bottom is 8 above the chip's top (y 420 for a 48
  chip, 408 for a 60 one). No animation: a line that steps once is easier to read than one that glides. It steps back
  when the chip goes. No touch, no move.
- **Options:** the VOD Options panel is **420** wide while an episode plays (mock 8); the radio panel `Intros in this
  show` is the subtitles' 384-wide panel, rows 50 (mock 6).

### 2.2 Focus, keys and the OK guard
- The chips are HUDs: no ring (UI-SPEC 3.2 exceptions). The row pill takes the ring like the other pills.
- **OK means one thing:** a floating chip binds OK only while the VOD controls are hidden, and while it does the hint
  bar's OK label says what OK does (`Skip intro`, `Skip recap`, `Skip recap and intro`, `Go back`, `Yes`). After the
  hint bar's 5 views the chip's own `OK` key cap and word carry it, as the action chip's do; the meaning is never off
  screen (UI-SPEC 6).
- **The OK guard:**
  - a skip chip or the offer appears only after 1.5 s without a key press (it waits, if 5 s or more of the window are
    left then);
  - for its first 0.7 s, OK does what it did before the chip (Pause);
  - for 0.7 s after it times out, OK does nothing (the press was meant for the chip);
  - the way-back chip ignores OK for its first 1.5 s (a double press doesn't undo the skip just made).
- **◀ ▶ don't dismiss the skip chip,** unlike the action chip's "any other key": seeking inside the intro is not a
  "no". Up next works the same way today.
- **Back hides a chip and never leaves the player while one is up.** To leave during an intro: Back, Back.

### 2.3 New glyph (`Ui.Icon` and `util.js`, 24 grid)
- **skipFwd:** the mirror of catch-up's `skipBack`: a filled triangle `M4.5 5.2v13.6L15 12z` and a 2.6 wide bar at x
  16.4 (radius 1). On the chips, the row pill and the Options row.

### 2.4 Motion and sound
- The chips fade in 150 ms and out 120 ms (opacity). Nothing else moves. No sound.

### 2.5 Copy rules
- Plain words, no idioms. Lengths as seconds (`28 s`) up to 99 s, then minutes (`3 min`).
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

### 3.3 With the controls up (`player-skip-bar`)
- While play is inside a window the row has the `Skip intro` pill, for the **whole** window.
- **▲ lands on that pill** instead of Play while it is there. So the skip is ▲ OK any time in the intro.
- OK on the seek thumb still pauses. The floating chip hides while the controls are up and comes back when they hide,
  if it has life left.
- **When the pill goes** (after a skip, or the window ends, with focus on it): focus moves to the seek thumb; the
  controls keep their 4 s timer. A late answer adds the pill without moving focus.

### 3.4 Keys while the chip floats (controls hidden)

| Key | Does |
|---|---|
| OK | **skips** (3.5), after the guard's first 0.7 s. The way-back chip follows |
| Back | hides the chip (3.6). Doesn't leave the player |
| ◀ ▶ | seek 10 s as always; hold scrubs. The chip stays while play is in the window |
| ▲ | the controls, focus on the row's Skip pill |
| ▼ / Menu | Options (the chip hides) |
| Play/Pause | pause (the chip moves into the row with the controls) |
| CH+ | next episode, as always |
| CC | Subtitles |

### 3.5 The jump
- **Target:** the window's end − 0.5 s (lists often mark the end at the fade, and a late end cuts the scene's first
  word). Seeked with `SeekParameters.EXACT`: landing seconds into the story is worse than a slower seek.
- **At once** the skip chip goes and the way-back chip shows (it is also what he sees while the picture rebuffers).
- **A failed seek** (a player error after it) goes the player's normal reconnect and failure path; the way-back chip
  goes with the error.
- **By itself** (4.3): one Media3 `PlayerMessage` per window at its start, delivered on the main looper, with a "done"
  flag per window per play, so it can't fire twice. It is not delivered while paused; seeking over the start doesn't
  fire it (3.6 covers landing inside).

### 3.6 Seek back, pause, resume, a second watch
- **After a skip or a Back,** that window's chip comes back only when a seek lands **15 s or more before its end**
  (and 5 s or more of it are left). One ◀ after a skip lands 10.5 s before the end: no chip, just the scene again. The
  row pill is there either way.
- **A seek into a window he hasn't skipped or hidden:** the chip, as at its start.
- **Pause:** the chip's life stops; the controls show with the pill in the row.
- **Resumed inside a window** (Continue watching, the player reopened): the chip at the first frame if 5 s or more of
  the window are left (the guard doesn't apply to the first frame). A window that skips by itself: the player starts
  at its end instead, with the way-back chip.
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
  nothing skips by itself (the row pill is there).
- **A panel open:** no chip; when it closes the chip comes back if it has life left.
- **Scrubbing:** the chip hides.
- **Live TV and catch-up programmes:** nothing (no IMDb id for a programme).

## 4. The way back, the settings, and skips by themselves

### 4.1 The settings
**For every show: Account > Playback > Skip intros and recaps** (built; settings key `skipIntro`).

| Choice | Line under it | Intros | Recaps |
|---|---|---|---|
| **Show a button** (`button`, default) | `One press skips the intro` (built: `One press skips it`, change) | the button, unless the show says otherwise (4.4) | by themselves after the episode before in the last 3 days, else the button |
| Skip automatically (`auto`) | `You can go back for 5 s` (built) | by themselves, unless the show says `Show a button` | the same rule |
| Off (`off`) | `No buttons` (built) | nothing | nothing; nothing is asked from TheIntroDB, Up next as today |

- The Account row's line (built): `In series, from TheIntroDB`.
- **Under the Playback rows** (a `t-cap`, to add): `Recaps skip by themselves when you watched the episode before in
  the last 3 days. A show can have its own choice for intros: press ▼ in an episode. Only times airglow could check
  with the subtitles skip by themselves.`
- **What a request sends:** the series' IMDb id, the season and the episode, and with it the TV's internet address.
  No account, no key, nothing else. Off sends nothing.

**For one show: ▼ Options > Intros in this show** (episodes only, the last row, value = this show's choice or, with
none, what Account gives it; mock 8). OK opens the radio panel (mock 6):

| Row | Line |
|---|---|
| `Skip by itself` | `You can go back for 5 s` |
| `Show a button` | `One press skips it` |

Foot: this episode's line (8), then `Recaps skip by themselves when you watched the episode before in the last 3 days.`
With Account set to Off, the row is disabled with the line `Off in Account`.

**How they combine:** Off in Account wins over everything. Otherwise **the show's choice, once made, wins** over
Account's Show a button and Skip automatically. No choice made: Account decides. The recap rule is the same in Show a
button and Skip automatically.

### 4.2 The way-back chip (after every skip; `player-skipped`)
- Shows the moment a skip starts, pressed or by itself, for **5 s**: `Intro skipped` / `28 s` · `OK go back`. Also
  `Recap skipped`, `Recap and intro skipped`.
- Hint bar (first 5 times): `OK Go back · ◀ ▶ Seek 10 s · ▲ Buttons · Back Hide`.
- **OK** (after its first 1.5 s): seeks back to the window's start; the chip goes. That window is then left alone for
  the rest of this play: no skip by itself, no Skip chip (he chose to watch it). The row pill is still there.
- **Back:** hides it. Other keys as 3.4; it stays its 5 s unless a panel opens or the controls show.

### 4.3 What may skip by itself
A window skips by itself only when **all** of these hold; otherwise it gets the Skip chip.
- **Intro:** the show says `Skip by itself` (or Account says Skip automatically and the show has no choice), and the
  window is **checked**: a Sure match, a downloaded subtitle file, no spoken line inside the window, and a spoken line
  within 2 min before its start or after its end (so the file covers that stretch; 9.4).
- **Recap:** the episode before was watched in the last 3 days (built: `recapAuto`), and the match is Sure. Recaps
  aren't checked against speech (they are speech).
- **Both:** not resumed past the window's start by a late answer (3.6), no other chip up, not already skipped or gone
  back to in this play.

At the window's start: the jump (3.5) and the way-back chip.

### 4.4 The offer: "Always skip this show's intro?" (`player-offer`)
- **When:** the second time he presses Skip intro (the chip or the row pill) in **a different episode** of the same
  show, with no show choice yet and the offer not answered before. A skip he went back from doesn't count.
- **Where and when on screen:** 10 s after the way-back chip goes, well past the intro, never inside a window, never
  with the controls, a panel or another chip up, and not in the last 2 min before the credits (then it waits for the
  next episode's start + 10 s). The OK guard applies.
- **Says:** `Always skip this show's intro?` / `It's Always Sunny in Philadelphia` · `OK yes`, the drain line over
  **8 s**. Hint bar: `OK Yes · Back No · ◀ ▶ Seek 10 s · ▲ Buttons`.
- **OK:** this show is `Skip by itself` from now on (no toast: the next intro skips with the way-back chip, which
  shows it worked). **Back:** `Show a button` for this show, never asked again. **Ignored** (the 8 s run
  out): asked once more after the next press in another episode; ignored twice, never asked again.
- Playback never stops for it; it is a chip like the action chip.
- Either answer can be changed in ▼ Options > Intros in this show.

## 5. Credits and Up next

### 5.1 Episodes (`player-upnext-credits`)
Up next keeps its look, words and keys: `Next episode in 13 s` · the episode · `OK play now`, the countdown ring;
**Back = Stay on this one** (no autoplay, the rest of the queue is dropped, as today); **if he does nothing for 15 s,
the next episode plays** (the owner). What changes is when it comes:

| The credits time | Up next |
|---|---|
| **Known** and passed 9.3, no spoken line after it in a downloaded subtitle file (or no downloaded file) | at the credits start, counting 15 s (mock 5) |
| **Known, but 2 or more spoken lines start after it** (a scene in or after the credits; also sung credits the file doesn't mark as music, which only delays the card) | 3 s after the last spoken line if that leaves 15 s or more, else the last 40 s, counting to the end |
| **Not known,** the list didn't answer, a Likely or Unsure match without an answer, or Off | today's rule (3 s after the last spoken line when that leaves 20 s to 5 min, else the last 40 s) |

- **A preview** (a "next time" teaser): its start counts as the credits start when it is earlier and passes the same
  checks; the teaser is the next episode's story. No `Skip preview` chip.
- **Prefetch** (built): the next episode's times are asked when an episode starts, so its 0:02 recap is known.
- The card binds OK as today; the OK guard's "0.7 s after it times out" applies to it too.

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
| Sure, intro and credits known, subtitles downloaded | chip; by itself if the show says so | by itself after the episode before in 3 days, else chip | at the credits, 15 s | `This episode: intro and credits known.` |
| Sure, the file's own subtitles only (intro unchecked) | chip, never by itself | as above | at the credits, 15 s | the same |
| Only credits known (Always Sunny S1 E3) | none | none | at the credits | `This episode: credits known, no intro.` |
| Only an intro known | as above | | today's rule | `This episode: intro known.` |
| 404 (`no_submissions`, `episode_not_found`) | none | none | today's rule | `Not known for this episode.` |
| Match Likely | chip, never by itself | chip, never by itself | at the credits | as known |
| Match Unsure, or no IMDb id | not asked | | today's rule | `Not known for this episode.` |
| No answer in 6 s, 429, 5xx, offline | what was kept, else none; asked again next play | | today's rule | `Not known for this episode.` |
| Two intros, settled by the subtitles (9.4) | the chosen one | | | as known |
| Two intros, no downloaded file or a tie | none | | | `Intro times unsure for this episode.` |
| An intro window with 3 or more spoken lines (another cut) | dropped | | | `Not known for this episode.` if nothing is left |
| An add-on copy | the same rules (its own `tt` id: Sure) | | | |
| Resumed in a window | 3.6 | | | |
| A 6 s intro | none | | | as known |
| A 3 min recap | | 10 s chip, then ▲ OK; way back reads `3 min` | | |
| Account Off | nothing; nothing asked | | today's rule | (the row is disabled: `Off in Account`) |

## 9. Data rules

### 9.1 When to ask (built: `app/tv/js/intros.js` `segmentsFor`, `player.js` `sendSegments`, commit 066d6fa)
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

### 9.4 The subtitle check (native; only a downloaded subtitle file, which `Subs` holds whole)
The file's own subtitles can't be read ahead, so they don't count. A **spoken line** is one whose text is not only
music (`♪`, `♫`), sounds in brackets, or empty.
- **An intro window is checked** when the match is Sure, it has 0 spoken lines inside, and there is a spoken line
  within 2 min before its start or after its end. **1 or 2 inside:** kept, unchecked. **3 or more:** dropped (the copy
  is offset or another cut).
- **Two intros that disagree** (Severance S1 E2): the one with fewer spoken lines inside wins; a tie, or no file: none
  is used.
- **Credits:** spoken lines after the start push Up next (5.1).

### 9.5 What the native player is sent
Built: `command('segments', { id, intro, recap, credits, preview, level, recapAuto, mode })`: each list `{ start, end }`
in ms (end 0 = to the end); `level` `sure` | `likely`; `recapAuto` = the episode before watched in the last 3 days;
`mode` `button` | `auto` | `off`.

**To change for the show's choice and the offer (4.1, 4.4):**
- `mode` becomes the intro mode **for this show** (the show's choice if made, else Account's), and `show` adds
  `{ key, name, choice: 'auto' | 'button' | null, offer: bool }`. `offer` is true when this show has one counted press
  in another episode, no choice, and fewer than 2 ignored offers.
- New native events: `skip` `{ show, episode, how: 'press' | 'self', back: bool }` (the web side counts presses per
  show in distinct episodes, skips a press he went back from); `setting` `skipShow` `{ show, value: 'auto' | 'button' }`
  (the offer's OK or Back, and the Options panel); `offer` `{ show, ignored: true }`.
- The web side keeps per show (`store`, per account): `choice`, the episodes pressed in, `ignored`.

### 9.6 Checked with curl on 27 Oct 2026
The table in section 0. `duration_ms` (2,000,000; 3,200,000 to 3,450,000) changed no answer for Breaking Bad S1 E1 and
Severance S1 E2, so the list's choice of version can't be relied on; it isn't sent. Season 99: 404
`episode_not_found`; a film not in the list: 404 `no_submissions`.

## 10. Who does what

**Web (`app/tv/js/`):**
- Built: `intros.js` (ask, keep, clean); `player.js` (`segments` with `level`, `recapAuto`, `mode`; the prefetch;
  nothing when Off; saves `skipIntro` from the player); `screens/account.js` (the row and its radio menu).
- **To change:** the Show a button line to `One press skips the intro`; the `t-cap` under the Playback rows (4.1);
  the show's choice, the press count and the offer (9.5).

**Native (`android/.../player/`), to build:** `PlayerActivity`: chip kinds `CHIP_SKIP`, `CHIP_SKIPBACK` and
`CHIP_OFFER` (48 / 60 high, the drain line), the OK guard, the 10 s / 5 s / 8 s lives on playing time, the checks
(9.3) and the subtitle check (9.4) with `Subs`, the jump and the `PlayerMessage`s (3.5), what may skip by itself
(4.3), Up next's start (5.1), the hint labels, the subtitle step (2.1), the Options row `Intros in this show` (the
panel 420 wide in an episode) and its radio panel, the `skip` / `skipShow` / `offer` events, the diagnosis log
counts (15). `VodControls`: the row pill, ▲ landing on it, focus to the thumb when it goes. `Ui`: skipFwd.

## 11. Every string

| Where | String |
|---|---|
| Skip chip | `Skip intro` · `Skip recap` · `Skip recap and intro` (with the `OK` key cap) |
| Way-back chip | `Intro skipped` · `Recap skipped` · `Recap and intro skipped` / `28 s` (`3 min`) / `OK` `go back` |
| Offer | `Always skip this show's intro?` / the show's name / `OK` `yes` |
| Row pill | `Skip intro` · `Skip recap` · `Skip recap and intro` |
| Hint bar | `OK Skip intro` (`Skip recap`, `Skip recap and intro`), `OK Go back`, with `◀ ▶ Seek 10 s · ▲ Buttons · Back Hide`; the offer: `OK Yes · Back No · ◀ ▶ Seek 10 s · ▲ Buttons` |
| Up next | unchanged: `Next episode in 13 s` · `S1 · E2 · Charlie Wants an Abortion` · `OK play now`; hint `OK Play now · Back Stay on this one` |
| Options row | `Intros in this show`, value `Skip by itself` · `Show a button`; disabled: `Off in Account` |
| Its panel | head `Intros in this show`; `Skip by itself` / `You can go back for 5 s`, `Show a button` / `One press skips it` |
| Its foot | line 1: `This episode: intro and credits known.` · `This episode: intro known.` · `This episode: credits known, no intro.` · `Not known for this episode.` · `Intro times unsure for this episode.`; line 2: `Recaps skip by themselves when you watched the episode before in the last 3 days.` |
| Account > Playback | row `Skip intros and recaps`, line `In series, from TheIntroDB`; choices `Show a button` / `One press skips the intro`, `Skip automatically` / `You can go back for 5 s`, `Off` / `No buttons`; under the rows: `Recaps skip by themselves when you watched the episode before in the last 3 days. A show can have its own choice for intros: press ▼ in an episode. Only times airglow could check with the subtitles skip by themselves.` |

## 12. The owner's answers (27 Oct)

1. **Intros never skip by themselves by default:** Show a button is the default; Skip automatically stays a choice
   in Account.
2. **Recaps skip by themselves** (with the 5 s way back) when the episode before was watched in the last 3 days, **in
   the default too**; otherwise the recap gets the button.
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
  and a floor, such as 90%).

## 14. Acceptance

Run on the emulator (`tests/android-test-boot.js`) with `tuner.introBase` pointing at a fake TheIntroDB in
`tests/mock-provider.js` that answers It's Always Sunny S1 E1, E2 and E3 (the real times, section 0) and Lost S2 E1,
with a downloaded subtitle file for S1 E1 only. The pure parts (9.3, 9.4, the combine rule in 4.1, the press count in
9.5) also as `tests/intros-test.js` cases.

| AC | Check | Pass |
|---|---|---|
| SK-1 | Play S1 E1 from 1:40, no key pressed | the `Skip intro` chip at 1:44 (± 1 s), gone by 1:54 |
| SK-2 | OK on the chip after 1 s | position 2:11.1 (± 0.3 s); the way-back chip `Intro skipped / 28 s` |
| SK-3 | OK within 0.7 s of the chip appearing | the player pauses; no skip |
| SK-4 | OK twice, 0.3 s apart | one skip; the second OK does nothing |
| SK-5 | OK on the way-back chip after 2 s | position 1:44 (± 0.3 s); no chip again in this play |
| SK-6 | Back on the chip | the chip goes; the player stays; ◀ once: no chip |
| SK-7 | ▲ during the intro | the controls, focus on `Skip intro` (last of the left group); OK skips; focus on the seek thumb |
| SK-8 | A key pressed at 1:43.5 | the chip appears at 1:45 (1.5 s of quiet) |
| SK-9 | Account Off | no request to the fake list (its log); no chip; Up next by today's rule |
| SK-10 | Lost S2 E1 with S1 E24 watched yesterday | the recap skips by itself at 0:02 to 0:27.5, the way-back chip `Recap skipped` |
| SK-11 | Lost S2 E1 with nothing watched in 3 days | the `Skip recap` chip |
| SK-12 | Skip intro pressed in S1 E1, then in S1 E2 | 10 s after E2's way-back chip: the offer; OK: the show is `Skip by itself` (Options shows it) |
| SK-13 | That show set, S1 E1 (checked) | the intro skips by itself, the way-back chip |
| SK-14 | That show set, S1 E2 (no downloaded file: unchecked) | no skip by itself; the chip |
| SK-15 | Back on the offer | the show is `Show a button`; no offer again |
| SK-16 | S1 E1 at 21:28 | `Next episode in 15 s`; no key for 15 s: S1 E2 plays |
| SK-17 | S1 E1 at 21:28, Back on Up next | stays; no autoplay at the end |
| SK-18 | A fake answer with credits at 5:51 of 22:00 (Stranger Things shape) | dropped: no Up next before today's rule |
| SK-19 | A fake intro with 3 spoken lines inside | no chip; Options foot `Not known for this episode.` |
| SK-20 | Audit (`node tools/audit.js --quiet`) | 8 pages, 0 findings |

## 15. What only the TV can tell
- **Whether the owner's remote has a Play/Pause key** (`hasPlayPause()` answers on the TV). Without one, pausing while
  a skip chip floats is Back, OK (2 presses); with the controls up, OK as always.
- Whether 10 s is long enough to notice the chip from the sofa.
- **How often a credits time is wrong on a copy with no downloaded subtitle file** (Up next then counts on the list
  alone; Back is the way out). The diagnosis log counts, per play: windows checked, unchecked (no file) and dropped
  (speech inside), and Up next starts from the list versus the subtitles.
- How many of his shows are in the list.
- Whether "recap" reads well to him; "Skip intro" alone is the fallback.
- Back, Back to leave during a chip (as with the action chip).
