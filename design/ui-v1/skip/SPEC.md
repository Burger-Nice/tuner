# airglow TV: Skip intro, Skip recap, and Up next at the credits, v1.0

This is the design spec for the engineer. It extends `design/ui-v1/UI-SPEC.md` v1.2 section 7 (the native player: the
action chip, Up next, the hint bar, the VOD controls) and uses the subtitles design (`design/ui-v1/subtitles/SPEC.md`:
the downloaded subtitle file, the IMDb match levels of `../copies/RANKING.md` 4). Everything not said here follows
those.

**The owner, in his words:** "is it possible to have a skip intro thing?" ... "yeah the skip intro too lets get that
done", and earlier the same day "also like a play next one when the show is finishing" (It's Always Sunny in
Philadelphia showed no next-episode prompt).

**The answer, in three parts:**
1. **Skip intro and Skip recap.** When an episode reaches its intro or its "previously on", a small chip in the bottom
   right says `Skip intro`. One press of OK jumps past it. The times come from TheIntroDB, a free list made by viewers.
2. **A setting:** Show a button (the default), Skip automatically, or Off. Automatic skips show a way back for 5 s.
3. **Up next comes when the credits start,** using the list's credits time, so a 22 min sitcom with 30 s of credits
   and a drama with 4 min of credits both get the prompt at the right moment.

| File | What it is |
|---|---|
| `SPEC.md` | this |
| `*.html` (6) | the mocks; `png/*.png` are their 2x renders, `png/contact-sheet.png` shows all six |
| `skip.css` | the new CSS, prefixed `sk-`: measurements for native views (dp = CSS px) |
| `tools/build.js`, `tools/render.js` | build the mocks; render the PNGs and the contact sheet (`NODE_PATH=$(npm root -g)`) |

## 0. Scenario and data

- **When:** the owner's TV, Tue 27 Oct 2026, 21:30 Reykjavik time. Setting: Show a button (mocks 1, 2, 4, 5, 6),
  Skip automatically (mock 3). Subtitles on (OpenSubtitles), as his settings are.
- **Real answers from TheIntroDB,** fetched with curl on 27 Oct 2026 (section 9.6). The mocks use these times; the
  picture is stand-in art and the subtitle lines are invented.

| Episode (IMDb id) | TheIntroDB says | What it shows us |
|---|---|---|
| It's Always Sunny S1 E1 (`tt0472954`) | intro 1:44.0 to 2:11.6, credits from 21:28 | the normal case: a cold open, then a 28 s intro |
| It's Always Sunny S1 E2 | intro 1:18.9 to 1:45.9, credits from 20:50 | the intro moves from episode to episode (no "same time as last time") |
| It's Always Sunny S1 E3 | credits from 21:39, **no intro** | a known episode with a gap: no chip, Up next still works |
| Lost S2 E1 (`tt0411008`) | recap 0:02 to 0:28, intro 3:59.0 to 4:10.5, credits from 42:48 | a recap at the very start; an 11 s intro |
| Severance S1 E2 (`tt11280740`) | **two** intros, 5:20.6 to 6:40.0 and 6:41.6 to 8:01.0 | two versions of the truth (section 9.4) |
| Severance S2 E1 | credits only | |
| Stranger Things S2 E2 (`tt4574334`) | recap 0/0 (confirmed none), intro 5:50.7 to 6:38.8, **credits 5:51.2 to 6:39.7** | a wrong label: "credits" sitting on the intro (section 9.3 drops it) |
| Game of Thrones S8 E3 | intro 0:06.0 to 1:52.8 | a 107 s intro |
| Oppenheimer, Dune (films) | 404 `no_submissions` | films are mostly not in the list |

## 1. Decisions in one list

1. **One chip, the Up next chip's place and size family** (bottom right, right 48, bottom 64). Intro and recap chips
   and Up next can never be up together (section 3.8).
2. **OK skips only while the chip floats with the controls hidden**, exactly as Up next binds OK today, and the hint
   bar says so (`OK Skip intro`). With the controls up, OK still pauses and `Skip intro` is a button in the row, where ▲
   lands.
3. **The chip stays 10 s, not the whole intro.** After that OK is Pause again; ▲ still offers `Skip intro` until the
   intro ends.
4. **Default: Show a button.** The list is made by viewers and copies are cut differently; a wrong automatic jump
   throws away story without him noticing. A wrong button costs nothing unless pressed (section 4.1).
5. **Skip automatically shows `Intro skipped` for 5 s, OK goes back.** It only runs on clean data (section 4.3).
6. **Recaps follow the same setting, with one extra rule in automatic:** a recap is skipped on its own only when he
   watched the episode before in the last 3 days. Coming back after weeks, the recap is a button.
7. **Up next starts at the list's credits time,** unless someone still speaks after it (the subtitles say so); then 3 s
   after the last spoken line, as today. No credits time: today's rule (section 5).
8. **No guessing when the list has nothing.** No "same as the last episode", no learning from his ▶ presses (section 7).
9. **Seek bar: small gaps at the edges of a known intro, recap and credits; no labels on the bar.** The scrub bubble
   names the part (`2:01 · Intro`).
10. **An episode counts as finished when its credits start** (Continue watching stops offering the last 30 s).
11. **The list is only asked when the IMDb match is Sure or Likely.** Likely gets buttons only, never automatic.

## 2. Rules every surface follows

### 2.1 Geometry (all inside x 48 to 912, y 27 to 513)
- **Skip chip:** right 48 (x 912), bottom 64 (y 476), height 48, radius 16, `bg-1` 94% with the 1 px border, padding
  14 / 12, width = content (`Skip recap and intro` is the widest, 234). Contents: glyph 20 · label Outfit 700 16 ·
  key cap `OK`. A 3 dp drain line inside the bottom edge (inset 14 / 12, 5 dp up): pink on `surface-3`.
- **Skipped chip:** the same, 60 high, two lines (`Intro skipped` / `1:19 to 1:46` 14 `text-2`), then `OK watch it`.
- **Row pill:** `VodControls.pill` (40 high, Outfit 700 16, `surface-2`), the skipFwd glyph 18 instead of the
  chevron, placed after +10 and before `Next episode`.
- **Subtitles rise while a bottom-right chip is up** (Skip, Skipped, and Up next too): the subtitle view's bottom edge
  moves from 70 to 120 from the bottom (y 470 to 420), 8 above the chip's top (y 428). Moved by translation, 150 ms;
  with reduced motion, at once. Back down when the chip goes. Without this a two-line subtitle runs under the chip.
- **Options > Skip intros:** the subtitles' 384-wide left panel, rows 50.

### 2.2 Focus and keys
- The chips are HUDs: no ring (UI-SPEC 3.2 exceptions). The row pill takes the ring like the other pills.
- **"OK means one thing":** the floating chip binds OK only while the VOD controls are hidden, and the hint bar's OK
  label is rewritten while it floats (`Skip intro`, `Skip recap`, `Skip recap and intro`, `Watch it`). Back hides
  the chip and never leaves the player while a chip is up.
- Full key map: section 3.5 and 4.2.

### 2.3 New glyph (`Ui.Icon` and `util.js`, 24 grid)
- **skipFwd:** the mirror of catch-up's `skipBack`: a filled triangle `M4.5 5.2v13.6L15 12z` and a 2.6 wide bar at x
  16.4 (radius 1). Used on the chips and the row pill only.

### 2.4 Colour and motion
- Pink only for the drain line and the radio dots. No new colours. The chip fades in 150 ms (opacity) and out 120 ms.
- No sound. (The sounds' design is final; the player has none except Your team is live.)

### 2.5 Copy rules
- Plain words, no idioms; times as `m:ss` (`1:19 to 1:46`), under an hour; `h:mm:ss` past it.
- "Intro" and "recap" are the words, never "opening", "title sequence" or "previously on" (the last is a TV phrase that
  doesn't translate).

## 3. Skip intro and Skip recap (Show a button)

### 3.1 What can get a chip
Only **windows** that passed the data checks (section 9.3 and 9.4): at most one recap and one intro per episode. Each
window has a start and an end on this copy. A window shorter than **8 s** gets nothing (Lost's 11 s intro gets a chip;
a 6 s card doesn't).

**Recap then intro:** when a recap ends 3 s or less before the intro starts, the two become one window, `Skip recap and
intro`, which jumps to the intro's end. Otherwise they are two windows (Lost: recap at 0:02, intro at 3:59).

### 3.2 The chip (`player-skip`, `player-recap`)
- **Appears** when play reaches the window's start, with the controls hidden, and when nothing else floats there.
- **Says** `Skip intro`, `Skip recap` or `Skip recap and intro`, with the OK key cap. The drain line empties over its
  life.
- **Life:** 10 s of playing time, or until 1 s before the window ends, whichever comes first. Paused time doesn't count.
- **The hint bar** shows with it the first 5 times (its own count, like every hint): `OK Skip intro · ◀ ▶ Seek 10 s
  · ▲ Buttons · Back Hide`. After that the chip's key cap carries the meaning on its own (mock 4).

### 3.3 Why 10 s and not the whole intro
An 80 s Severance intro or a 107 s Game of Thrones one would keep a box on the picture and keep OK away from Pause for
that long. Netflix keeps its button for the whole intro, but there OK is not also Pause. Ten seconds is enough to
react; after that the skip is still one ▲ away.

### 3.4 With the controls up (`player-skip-bar`)
- While play is inside a window, the button row shows the `Skip intro` pill (or `Skip recap`, `Skip recap and intro`)
  after +10, for the whole window, not only the chip's 10 s.
- **▲ lands on that pill** instead of Play while it is there. So the skip is ▲ OK at any moment in the intro.
- OK on the seek thumb still pauses. The floating chip hides while the controls are up and comes back when they hide,
  if it has life left.
- After the skip, the pill leaves the row and focus goes to the seek thumb; the controls keep their 4 s timer.

### 3.5 Keys while the chip floats (controls hidden)

| Key | Does |
|---|---|
| OK | **skips:** seeks to the window's end. The chip goes. Nothing else shows (the picture jumping is the answer) |
| Back | hides the chip. The window gets no chip again in this play, except after a seek back into it (3.6). Doesn't leave the player |
| ◀ ▶ | seek 10 s as always; hold scrubs. The chip stays if play is still in the window |
| ▲ | the controls, focus on the row's Skip pill |
| ▼ / Menu | Options (the chip hides) |
| Play/Pause | pause (the chip moves into the row with the controls) |
| CH+ | next episode, as always |
| CC | Subtitles |

### 3.6 Seek back, pause, resume, a second watch
- **Seek back into a window** (◀, scrub, −10): the chip shows again with a fresh 10 s, if 5 s or more of the window
  are left. Even after Back hid it: going back is a new choice.
- **Seek forward into a window:** the same.
- **Pause:** the chip's life stops; the controls show with the pill in the row.
- **Resumed inside a window** (Continue watching, or the player reopened): the chip shows at the first frame if 5 s or
  more of the window are left. Resumed in the last 5 s: nothing.
- **First seconds of an episode:** a recap that starts at 0:02 gets its chip as soon as the first frame is up. If the
  start shows the controls (the title block), the pill is in the row and the chip floats when they hide.
- **The list answers late** (after the window started): the chip shows when the answer comes, if 5 s or more are left.
- **A second watch of an episode:** the same as the first. Nothing is remembered between plays.

### 3.7 A long recap, a short intro
- A 3 min recap gets the same chip and the same 10 s; then ▲ OK skips it any time.
- An 8 to 12 s intro gets a chip whose life ends 1 s before the intro does (Lost: shown 3:59 to 4:09).

### 3.8 Living with the other things on screen
- **Up next** always wins: if the data ever put a window inside the credits it was dropped already (9.3).
- **Other chips** (the stutter and offline chips): one chip at a time. If one is up, the skip is only in the row.
- **A panel open** (Options, Subtitles…): no chip; when it closes, the chip comes back if it has life left.
- **Scrubbing:** the chip hides; the bubble names the part (section 6).
- **Subtitles:** they rise above the chip (2.1). Intros rarely have lines; recaps do (mock 4).
- **Live TV and catch-up programmes:** nothing (no IMDb id for a programme).

## 4. Skip automatically, and the setting

### 4.1 The setting
**Account > Playback > Skip intros and recaps**, the same setting as **Options (▼) > Skip intros** in the player
(`player-options-skip`). One value for every series.

| Choice | Line under it | What happens |
|---|---|---|
| **Show a button** (default) | One press skips it | section 3 |
| Skip automatically | You can go back for 5 s | section 4.2 |
| Off | No buttons | no chips and no row pill. Up next at the credits and the seek bar gaps stay (they are not skips) |

**Why the button is the default.** The times are typed in by viewers and copies are cut differently (a provider copy
with a channel card at the start, a debrid release with a longer cold open). The list doesn't know which copy he has:
asking with the copy's length gave the same answer for every length tried (section 9.6). A wrong button costs nothing
unless he presses it, and if he does he sees the jump and presses ◀. A wrong automatic jump loses 30 s of the story
without him knowing it was there. If after a week the button has been right every time, Skip automatically is one
setting away (open question 1).

### 4.2 What he sees in automatic (`player-skipped`)
- At the window's start (exactly: a Media3 `PlayerMessage` at that position, not the 1 s tick) the player seeks to its
  end. The `Intro skipped` chip shows for **5 s**: `Intro skipped` / `1:19 to 1:46` · `OK watch it`. Also `Recap
  skipped`, `Recap and intro skipped`.
- Hint bar (first 5 times): `OK Watch it · ◀ ▶ Seek 10 s · ▲ Buttons · Back Hide`.
- **OK:** seeks back to the window's start; the chip goes. That window is then left alone for the rest of this play: no
  automatic skip and no Skip chip (he chose to watch it). The row pill is still there for ▲.
- **Back:** hides the chip. Other keys: as in 3.5; the chip stays its 5 s unless a panel opens or the controls show.
- **Resumed inside a window:** the player starts at the window's end instead, and shows the chip (OK goes back to the
  window's start).
- **Seeking back into a window** he skipped or watched: no new automatic skip in this play, the Skip chip instead (3.6).
  An automatic skip never fights the remote.

### 4.3 When automatic drops to a button
For that window, in automatic, the Skip chip shows instead of a jump when:
- the IMDb match is **Likely** (not Sure);
- the window failed the subtitle check softly (9.4: one or two spoken lines inside it);
- **a recap,** and he did not watch the episode before in the last 3 days (or ever, in airglow).
The Options foot says nothing extra about this; the chip is the explanation.

## 5. Credits and Up next

### 5.1 Episodes (`player-upnext-credits`)
Up next keeps its look, its words and its keys (`Next episode in 13 s` · episode · `OK play now`; Back = Stay on this
one, no autoplay). Only **when it comes** changes:

1. **The list has a credits start** (passed 9.3): Up next comes at that time and counts 15 s, then the next episode
   plays. Always Sunny S1 E1: at 21:28.
2. **But someone still speaks after it** (two or more spoken lines in the downloaded subtitles start after the credits
   start: a scene during or after the credits): Up next waits until 3 s after the last spoken line, as today, if that
   leaves 15 s or more; otherwise it comes for the last 40 s and counts to the end.
3. **No credits start:** today's rule (3 s after the last spoken line when that leaves 20 s to 5 min, else the last
   40 s).
4. **A preview** (a "next time" teaser): its start counts as the credits start when it is earlier. A teaser is the
   next episode's story, so Up next comes before it. There is no `Skip preview` chip; letting Up next play skips it.

**Prefetch:** when Up next shows, airglow asks the list about the next episode, so a recap at its 0:02 gets a chip.

### 5.2 Films
- **No chip at the credits.** A film ends; it doesn't need a prompt. (A film with a queue after it keeps today's Up
  next rule, with 5.1 1 to 3.)
- The credits get a gap on the seek bar (section 6) and the scrub bubble says `Credits`.
- A film whose credits have started **counts as finished** (5.3).
- An intro on a film (rare in the list) gets the same chip as an episode.

### 5.3 Finished
Today a title is "in progress" until 94% (`state.js` `inProgress`). A film with 9 min of credits stopped at the
credits stays in Continue watching; a sitcom stopped at its credits doesn't. New rule: **with a known credits start,
reaching it counts as finished**; without one, 94% as today.

## 6. The seek bar (`player-skip-bar`)

- **Gaps:** 2 dp cuts in the 6 dp bar (drawn in the bar panel's colour) at a recap's start and end, an intro's start
  and end, and the credits start. Only windows that passed the checks. Shown whatever the setting is.
- **No labels on the bar,** no colour bands: a gap says "something starts here" and nothing about the story.
- **The scrub bubble** adds the part's name while the thumb is inside a window: `2:01 · Intro`, `0:15 · Recap`,
  `21:40 · Credits`.
- **Spoiler-free:** the gaps only mark the parts that are not the story. Where the credits start is close to the length
  already shown; a scene after the credits is never marked (the list doesn't have it, and the subtitles rule in 5.1 is
  not drawn).

## 7. When the list has nothing

**Nothing is guessed.** No chip, no row pill, no gaps; Up next uses the subtitles rule; the Options foot says `Not
known for this episode`.

What was considered and left out:
- **The same time as the episode before.** Cold opens differ: Always Sunny's intro starts at 1:44 in E1 and 1:19 in
  E2. A guessed button would sit on the story.
- **The same length as the episode before, found by sound.** It would need the sound of the theme song (audio
  matching): heavy, battery and network, and wrong on a different cut.
- **Learning from his ▶ presses in the first minutes.** He also presses ▶ to skip a boring scene or to catch up after
  a pause. Too noisy to trust with his story.
- **Sending his skips to TheIntroDB.** It needs an account and puts the app's use on someone else's list: outward,
  not asked for.

▶ (10 s a press) and holding ▶ still get past any intro, as they do today.

## 8. All states

| State | The chip and the row | Up next | Options foot |
|---|---|---|---|
| Match Sure, the list has intro and credits | chips as set | at the credits start (5.1) | `This episode: intro and credits known.` |
| Only credits known (Always Sunny S1 E3) | none | at the credits start | `This episode: credits known, no intro.` |
| Only an intro known | chips as set | subtitles rule | `This episode: intro known.` |
| The list says 404 / `episode_not_found` | none | subtitles rule | `Not known for this episode.` |
| Match Likely | buttons only (even in automatic) | at the credits start | as above |
| Match Unsure, or no IMDb id | none, the list isn't asked | subtitles rule | `Not known: which show is this?` (the title page's match, subtitles SPEC 4.5) |
| The list doesn't answer (6 s), 429, 5xx, offline | what was kept, else none; asked again next play | subtitles rule | `Not known for this episode.` (nothing else: there's nothing he can do) |
| Two intros that disagree, subtitles settle it (9.4) | the chosen one | | as known |
| Two intros that disagree, no subtitles or a tie | none | | `Not sure about this episode's intro.` |
| A window with 3+ spoken lines inside (another cut) | dropped | | `Not known for this episode.` if nothing is left |
| An add-on copy | the same rules (its IMDb id comes with it: Sure) | | |
| From Continue watching, resumed in a window | 3.6 / 4.2 | | |
| The next episode from Up next | prefetched; recap chip at 0:02 | | |
| A 10 s intro (8 to 12 s) | chip until 1 s before its end | | |
| A 6 s intro (under 8 s) | none | | as known (the gap is still drawn) |
| A 3 min recap | 10 s chip, then ▲ OK any time | | |
| Off | none | at the credits start | `Skip intros is off.` |

## 9. Data rules

### 9.1 When to ask (built: `app/tv/js/intros.js` `segmentsFor`, called from `player.js` `sendSegments`)
- **When:** an episode or film starts, and when the queue moves to the next item (the `track` event). **To add:** ask
  for the next item when Up next shows, so its recap at 0:02 is known before its first frame.
- **Gate (built):** an add-on item's own `tt` id, or the title's match unless it is Unsure (`RANKING.md` 4). Never for
  live TV or catch-up programmes. With the setting Off nothing is asked; **to change:** Off should still ask, because
  Up next at the credits and the seek bar gaps don't depend on it (4.1). **To add:** send the match level, so Likely
  gets buttons only.

### 9.2 The request (built)
- `GET https://api.theintrodb.org/v4/media?imdb_id=tt…&season=S&episode=E` (films: `imdb_id` only), with
  `duration_ms` when known; it made no difference in the tests (9.6), so it isn't worth waiting for. Anonymous: no key,
  no account, nothing about him in the request.
- **Timeout 6 s.** Busy or down (429, 5xx, offline): what was kept, else nothing; asked again next time it plays.
- **Limits:** the headers on 27 Oct said 30 per 10 s and 5000 a day per address (`x-ratelimit-*`, `x-usagelimit-*`);
  airglow needs about two per episode.
- **Kept** (`Core.cache`, per `imdb:S:E`): an answer 30 days, a 404 one day, errors not at all.
- **Cleaned (built, `parseSegments`):** `0/0` = confirmed none, dropped; `end_ms: null` on credits or a preview = to
  the end; an intro or recap needs an end.

### 9.3 The checks on the answer (native, which knows the copy's real length D)
- **Recap:** starts in the first 8 min; 5 s to 5 min long.
- **Intro:** starts in the first 40% of D and ends at least 60 s before the credits start (or the end); 8 s to 3 min.
  Under 8 s: kept for the seek bar gap only.
- **Credits:** start in the last 25% of D, at least 10 s and at most 12 min before the end, and after the intro's end.
  Stranger Things S2 E2's "credits" at 5:51 fail this and are dropped.
- **Preview:** the same as credits.
- **Anything past D** (a longer cut in the list): dropped.
- **Two or more of one kind** that are not the same window: section 9.4 decides.

### 9.4 The subtitle check (native, when airglow has a downloaded subtitle file for this copy)
The native player already holds the downloaded file's lines (`Subs`; the file's own subtitles can't be read ahead, so
they don't count). A **spoken line** is a line whose text is not only music (`♪`, `♫`), sounds in brackets or empty.
- **Inside an intro window:** 0 spoken lines: clean. 1 or 2: kept, but buttons only (4.3). **3 or more: dropped** (the
  copy is offset or another cut; a skip would cut speech).
- **Two intros that disagree** (Severance S1 E2): the one with fewer spoken lines inside wins; a tie, or no downloaded
  file: none is used.
- **Recaps** are not checked (they are speech).
- **After the credits start:** section 5.1 rule 2.
- Without a downloaded file the windows are used unchecked (the default, a button, is safe; automatic gets its undo).

### 9.5 What the native player is sent
Built: `command('segments', { id, intro, recap, credits, preview })`, each a list of `{ start, end }` in ms (end 0 =
to the end), once per item. **To add:** `level` (`sure` | `likely`), `recapAuto` (the episode before was watched in
the last 3 days, from `S.progress`) and `mode` (`button` | `auto` | `off`, the setting `skipIntro`). The player
answers with `setting` `skipIntro` when he changes it in Options.

### 9.6 Checked with curl on 27 Oct 2026
The table in section 0. Also: `duration_ms` of 2,000,000 and of 3,200,000 to 3,450,000 returned the same answers for
Breaking Bad S1 E1 and Severance S1 E2 (so the list's version choice can't be relied on to fit the copy); season 99
returns 404 `episode_not_found`; a film not in the list returns 404 `no_submissions`.

## 10. Who does what

**Web (`app/tv/js/`):** `intros.js` (built: ask, keep, clean); `player.js` `sendSegments` (built; to add: the
prefetch, `level`, `recapAuto`, `mode`, and asking when Off, 9.1 and 9.5); `screens/account.js` Playback gets the row
`Skip intros and recaps` (radioMenu, 4.1); `state.js` `inProgress` takes the credits start (5.3); settings key
`skipIntro`: `button` (default), `auto`, `off`.

**Native (`android/.../player/`):** `PlayerActivity`: chip kinds `CHIP_SKIP` and `CHIP_SKIPPED` (the chip view, 48 /
60 high, with the drain line instead of the ring), `PlayerMessage`s at the window starts, the 10 s and 5 s lives on
playing time, the checks (9.3) and the subtitle check (9.4) with `Subs`, Up next's start (5.1), the hint labels, the subtitle lift (2.1),
the Options row `Skip intros` (episodes only) and its radio panel. `VodControls`: the row pill and ▲ landing on it,
the seek bar gaps and the bubble's part name. `Ui`: the skipFwd glyph.

## 11. Every string

| Where | String |
|---|---|
| Chip | `Skip intro` · `Skip recap` · `Skip recap and intro` (with the `OK` key cap) |
| Skipped chip | `Intro skipped` · `Recap skipped` · `Recap and intro skipped` / `1:19 to 1:46` / `OK` `watch it` |
| Row pill | `Skip intro` · `Skip recap` · `Skip recap and intro` |
| Hint bar | `OK Skip intro` (· `Skip recap` · `Skip recap and intro`) · `OK Watch it`, with `◀ ▶ Seek 10 s · ▲ Buttons · Back Hide` |
| Scrub bubble | `2:01 · Intro` · `0:15 · Recap` · `21:40 · Credits` |
| Up next | unchanged: `Next episode in 13 s` · `S1 · E2 · Charlie Wants an Abortion` · `OK play now` · hint `OK Play now · Back Stay on this one` |
| Options row | `Skip intros` with the value `Show a button` · `Skip automatically` · `Off` |
| Options panel | head `Skip intros and recaps`; rows `Show a button` / `One press skips it`, `Skip automatically` / `You can go back for 5 s`, `Off` / `No buttons` |
| Options foot, line 1 | `This episode: intro and credits known.` · `This episode: intro known.` · `This episode: credits known, no intro.` · `Not known for this episode.` · `Not known: which show is this?` · `Not sure about this episode's intro.` · `Skip intros is off.` |
| Options foot, line 2 | `Times come from TheIntroDB, made by viewers. Some episodes are missing.` |
| Account > Playback | row `Skip intros and recaps`, value as above, line `Times come from TheIntroDB, made by viewers` |

## 12. Open questions for the owner

1. **Should skipping be automatic from the start?** Recommended: no, start with the button for a week of real
   episodes; if it was right every time, switch to Skip automatically (Account > Playback).
2. **Recaps in automatic: skip them only when you watched the episode before in the last 3 days?** Recommended: yes.
   Bingeing, the recap is noise; coming back after weeks, it's the reason it exists.
3. **Should the Skip chip stay for the whole intro instead of 10 s?** Recommended: 10 s, then ▲ OK still skips. A box
   that stays 80 s, and OK not pausing for that long, is worse than one extra press.

## 13. What only the TV can tell
- Whether 10 s is long enough to notice the chip from the sofa.
- How often the owner's provider and add-on copies are offset from the list (the subtitle check's drop count, logged in
  the player's diagnosis log, will show it).
- How many of the shows he watches are in the list at all.
