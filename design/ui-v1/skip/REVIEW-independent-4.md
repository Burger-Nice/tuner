# Independent review 4: Skip intro / recap, and Up next at the credits (design/ui-v1/skip/SPEC.md v1.3)

**What I read:**
- SPEC.md v1.3 in full, `skip.css`, and all nine mocks: each `png/*.png` opened at 2x, plus the contact sheet.
  I checked the mocks' strings against section 11 (`grep` over the `.html` and `tools/build.js`).
- CLAUDE.md, and UI-SPEC.md's player parts: principle 4 ("one job per axis", "never changes silently"), 6 ("single-meaning
  OK"), and 7 (the action chip, Up next, the hint bar, the VOD key map, radius 16, the inset panel ring).
- To see what is already built behind 5.1: `PlayerActivity.java` `chipTick`, `tick`, `showUpNext`, `upNextLeft`.

I judged v1.3 on its own merits and took the owner's five decisions in section 12 as fixed.

## Score: 7.6 / 10

| Area | Score |
|---|---|
| Remote / D-pad usability and the OK rule | 7.5 |
| Clarity of the words | 7.6 |
| Edge cases and data safety (wrong or offset timestamps) | 7.4 |
| Consistency with the existing player design and the brand | 7.9 |
| Buildability | 7.6 |

**Verdict.** This is now a careful, mostly closed design. It carries out the owner's five decisions faithfully:
- **Intros are a button by default (1).** Account's `Skip by itself` and the per-show choice are the only ways to make
  them skip by themselves.
- **Recaps skip by themselves after the episode before (2).** In a binge this means the queue's item before, so a
  season premiere now counts. The next item's times reach the player ahead, so a recap at 0:00 can act from the first
  frame.
- **A 10 s chip, then ▲ OK (3).**
- **Up next at the credits with a 15 s count, OK now, Back stays (4).** Back keeps the queue, and the end card no
  longer holds a still frame for ever.
- **Per-show auto skip (5),** through an offer that only appears where yes changes something, and through ▼ Options.

Several things are well done:
- **The OK guard is now honest on screen.** The cap is at 40% and the hint bar reads `OK Pause` until OK binds, and the
  spec explains why these chips pause where the failure card ignores OK.
- **The spoken-line filter** for subtitler credits and adverts, and the italic-lyrics rule.
- **The key column drops with the controls up,** so Up next no longer shows keys that do something else.
- **The look fits the player.** One chip in one corner, radius 16, `bg-1` 94%, pink only as progress, no new colour.
  The row pill comes last in the left group, so nothing jumps.

What still holds it down:
1. **One real habit trap in the binge path,** the one decision 2 exists for. A recap that skips into a joined intro
   puts `OK go back` in the skip chip's corner just as the intro starts.
2. **The doubtful mark reads too much into one go-back.** The spec itself calls the same press "probably a slip" (3.3).
   A go-back from a recap is often just "I want the recap this time". And the owner's own explicit choice can't
   override the mark.
3. **Up next's count is not written as playing time.** With the controls up "the count goes on", and pausing brings the
   controls up. A seek back out of the credits isn't covered either.
4. **The new v1.3 surfaces have no mock,** and one shipped mock string contradicts the string table.

None of this needs a redesign.

---

## Problems, most serious first

### 1. After a recap skips into a joined intro, OK at the intro means "go back to the recap" (3.1, 4.2, 4.3)
This is the "only the recap may" case of 3.1, which the spec calls the usual case in a binge:
- The recap jumps to the intro's start. At once the way-back chip `Recap skipped · OK go back` takes the bottom-right
  corner, and it stays for the first 5 s of the intro.
- After a few episodes the owner knows "intro playing + chip in that corner = OK skips". The hint bar has gone after 5
  views. The chip appeared unannounced, but the 0.7 s guard only covers its first 0.7 s, so a press 1 to 4 s into the
  intro passes it.
- So his OK sends him back to the start of the recap, which he had just been spared. The recap is then "left alone",
  so he has to sit through it or use ▲ OK.
- **The same press also marks the show doubtful for 7 days.** It is a go-back within 5 s after a skip by itself, and
  recaps are never checked against an anchored file. Decision 2 then stops working for that show for a week (problem 2).
- The intro's own `Skip intro` chip can't appear until the way-back chip has gone and 1.5 s of quiet have passed: about
  6.5 s into the intro. On Lost's 11.5 s intro, that leaves a chip of about 4 s.

**Change (3.1):** in this case, don't stack two chips in the same corner with opposite meanings for OK. Two options:
- **(a), my preference:** the way-back chip after a recap that skipped into an intro reads `Recap skipped` /
  `OK skip intro`. OK does the intro's skip (with its own way-back chip after it). The way back to the recap is the
  row's `Back to recap` pill: ▲ lands on it here, the same "fresh" logic as 3.3. The hint bar reads
  `OK Skip intro · ▲ Back to recap`. One chip, and OK means forward, which is what the picture invites.
- **(b):** keep `OK go back`, but treat a go-back pressed after the intro has started (more than 1 s past the jump) as
  a slip. It sets no doubtful mark, and it re-offers `Skip recap and intro` as a fresh chip, so one OK corrects it.

Add an AC next to SK-28: OK 2 s after the `Recap skipped` chip appears.

### 2. One go-back marks a whole show doubtful, and nothing he does can clear it (4.3, 4.1, 9.5)
Three things are wrong with the rule as written:
- **It contradicts 3.3.** 3.3 keeps the window fresh after a go-back from a skip by itself because "the list was
  probably right and the press probably a slip". 4.3 treats exactly that press as evidence that the list was wrong, and
  turns off the show's auto skips for 7 days. Both can't be the working assumption.
- **A go-back from a recap is very often a choice, not a correction.** "I forgot where we were, show me the recap."
  Yet it switches off his yes-show's intros and decision 2's recaps for a week. The "with an anchored file, marks
  nothing" exemption has no meaning for recaps either: 9.4 never checks a recap against the file, so the file vouches
  for nothing there.
- **An explicit choice loses to an inferred one.** 4.1: "the doubtful mark wins over both for 7 days." If he opens ▼
  Options and picks `Skip by itself` again, the radio says Skip by itself and the show still shows buttons. This is the
  "looks broken" case from earlier rounds, now caused by the safety net.

**Change:**
- Count only **intro** go-backs.
- Mark the show doubtful only after go-backs **in two different episodes within 7 days.** An offset copy is a property
  of the provider's release, so it repeats; a slip or a "play the theme this time" doesn't. The cost is one more wrong
  jump, which the way-back chip already covers.
- **Picking an option in `Intros in this show` clears the mark** (it is his decision, made after seeing the foot line).
- In 9.5, the web side's rule becomes "two `skip {how: 'self', back: true}` events on intros, in distinct episodes".
- Rewrite SK-32 to match.

### 3. Up next's count: playing time, pause and seeking back aren't specified (5.1, 2.2)
- The skip chip, the way-back chip and the offer all say **"of playing time"**. Up next says only "its 15 s count from
  when it appears", and with the controls up "the count goes on".
- A pause brings the controls up. Read literally, the next episode then starts on its own while he is paused at the
  credits. That is the worst thing an auto-advance can do.
- The built `chipTick` already waits while paused (`upNextAt += 200` when not playing). So this is a spec gap, not yet a
  bug, but 5.1 is the text the engineer will follow when rewriting this.
- **Seeking back out of the credits isn't covered.** 2.2 says ◀ ▶ don't dismiss Up next. So if he presses ◀ twice to
  rehear the last line before the credits, the card stays and the count runs on over the scene he went back to see.
  (The built subtitle rule happens to hide the card there; the list-time rule in 5.1 says nothing.)
- **Scrubbing** with the card up isn't covered either.

**Change (5.1):**
- "15 s of **playing time**; paused time doesn't count."
- "A seek or scrub that lands **before the credits start** puts the card away, and it comes back, counting 15 s again,
  when play reaches the credits start."
- "Scrubbing hides it, as 3.8."
- Add an AC: pause at `Next episode in 10 s`, wait 20 s: nothing plays.

### 4. The new v1.3 surfaces have no mock, and mock 7 contradicts the string table (5.1, 4.4, 2.2, 11)
- **The string mismatch.** Mock 7's foot (built by `tools/build.js` line 110) says "Recaps skip by themselves when you
  watched the episode before in the last 3 days." Section 11, 4.1 and the Account `t-cap` say "Recaps skip by themselves
  when you just watched the episode before." The engineer gets two strings for one line. The audit's "0 findings" doesn't
  catch copy drift. **Change:** regenerate mock 7 with section 11's string. I prefer "just watched": it is true for both
  the binge rule and the 3-day rule.
- **Surfaces with no picture.** v1.3 adds or changes five things, and none of them is drawn:
  - the end card, a new layout with the next glyph in a 40 disc and no count;
  - Up next with the controls up, the key column gone and the card above the bar;
  - the offer's `Done: …` state;
  - the 40% `OK` cap together with the `OK Pause` hint;
  - the three-line add-on card, 78 high.

  The end card and the controls-up card are the ones the engineer will lay out by guesswork. **Change:** add one mock
  for the end card and one for Up next with the controls up. The cap state can be a crop in the contact sheet.
- **Mock 6's episode name is cut** at "Charlie Wants an Ab…", an ordinary-length title. The name is the one thing on
  that card worth reading. Next to the 420 cap and the 180 minimum, that means many names will lose their ends.
  **Change:** let the Up next card grow to 480 (it is well inside x 48 to 912). Or wrap the name onto a second line and
  move `S1 · E2` into the title (`Next episode in 13 s · S1 E2`).

### 5. "Back never leaves the player while a chip is up" is no longer true (2.2, 5.1)
- 2.2 says it flatly. But the end card's Back closes the player. The hint (`Back Close`) and the chip say so, which is
  the right design. Only the rule's wording is wrong.
- **Change (2.2):** "… never leaves the player while one is up, except the end card, which says `Back close`."

### 6. The way-back chip's "first frame" has no fallback (3.5, 4.2)
- 3.5 starts the way-back chip's 5 s, and its OK guard, at the first `onIsPlayingChanged(true)` after the seek's
  discontinuity. Two cases never produce that event:
  - **A skip made while paused:** the row's `Skip intro` pill pressed with the controls up after a pause, which 3.3
    allows. Play stays paused, so the event doesn't come until he resumes.
  - **A seek that never leaves the playing state.** If `isPlaying` doesn't flip during the seek, the chip waits with its
    cap dimmed until something else ends it.
- **Change:**
  - "If paused when the jump is made, the 5 s start at resume." In practice the controls are up then, so the slot shows
    `Back to intro` and the chip only appears when they hide.
  - "If no `onIsPlayingChanged(true)` arrives within 1 s while `playWhenReady`, start on `STATE_READY`."
  - Add both to SK-22.

### 7. The acceptance fixtures don't cover the checks, and the emulator run will get long (14)
- Section 14's fake TheIntroDB "answers It's Always Sunny S1 E1, E2 and E3 (the real times), Lost S1 E24 and S2 E1,
  with an anchored downloaded subtitle file for S1 E1 only".
- But several checks need answers or files that list doesn't have:
  - SK-18, SK-19, SK-26, SK-28 and SK-32 need fake answers; SK-32 needs an intro on S1 E3, which "really" has none;
  - SK-21 needs a faked verdict;
  - SK-29 and SK-30 need extra subtitle files.
- The checks also wait in real time: 10 s chips, 15 s counts, 8 s offers, 5 min for the end card's close. On top of
  `tests/android-test-boot.js`'s 45 checks, which must finish for CI to pass, that is a lot of wall-clock time.
- **Change:**
  - The fake list takes a per-check override (`tuner.introBase?case=SK-19`) with named fixtures.
  - The time-heavy and pure checks (9.3, 9.4, the doubtful and offer counts, the end card's 5 min) go in
    `tests/intros-test.js`, or into a native unit test with a fake clock.
  - About eight checks stay on the emulator, using seeks: SK-1, 2, 3, 5, 10, 16, 17, 33.

### 8. Words that a non-native reader will stumble on (4.1, 11)
- **`You went back after a skip: buttons for 7 days.`** This is telegraphic. "Buttons for 7 days" doesn't say whose
  buttons, or instead of what. **Change:** `You went back after a skip, so this show uses buttons for 7 days.` With
  problem 2's fix, add: `Pick an option above to change it.`
- **`Done: this show's intros skip by themselves`** is fine. The colon form reads like a log line, though;
  `This show's intros will skip by themselves` says the same thing without it.
- **The Account line `Off` / `No buttons`** undersells Off, which also stops the requests and the credits timing.
  Consider `No buttons, nothing asked`.

### 9. The hint bar's OK label changes 0.7 s after it appears (2.2)
- The bar fades in reading `OK Pause`, then 0.7 s later reads `OK Skip intro`. On a TV across the room the first label
  is barely legible before it changes, and principle 4 asks that the OK label never changes without reason.
- **Change:** draw the hint bar from the moment of binding (fade in at 0.7 s), not at the chip's appearance. Before
  that, nothing on screen claims a meaning for OK. The dimmed cap says "not yet", and OK pausing is what he expects over
  a playing video anyway.

### 10. Smaller things
- **3.1, the joined jump target.** A recap that skips alone jumps to the intro's start, up to 3 s past the recap's end.
  The gap may hold a cold open's first line. Using the recap's end − 0.5 s, as for a lone recap, is one rule fewer.
- **1.8, "Off … Up next works as today".** Today's Back on Up next is what 5.1 replaces. **Change:** "Off: Up next's
  timing as today; its keys, Back and the end card as 5.1."
- **3.8, other chips.** When the stutter or offline chip goes during a window, does the skip chip come back with the
  life it has left, as after a panel? Say yes.
- **3.6, "nothing is kept between plays except the show's choice and its doubtful mark".** The press count and `letGo`
  are kept too (9.5). Reword.
- **4.2, ◀ during the way-back chip.** One ◀ after a skip lands in the window, 10.5 s before its end. Say whether the
  way-back chip stays (I would end it: he has gone back his own way).
- **2.1, subtitles and Up next.** The step heights are given for the 48, 60 and 64 chips, but not for the Up next card
  (about 60) or the 78-high three-line card (line bottom y 390).
- **Optional, compatible with decision 4.** With 15 s auto-advance and nobody watching, the player runs through a
  whole season on an OLED. A common softener: after 3 auto-advances with no key pressed, the end card instead of the
  count. That would be a question for the owner, and fits in 13 (Later).

---

## What I checked and what I couldn't

**Checked:**
- Every mock against 2.1's geometry: the chip at y 428 to 476, the hint text at 489 to 507, everything inside the safe
  area.
- The mocks against the strings in section 11 (one mismatch, problem 4).
- The section 0 times against SK-1, SK-2 and SK-8 (27.6 s rounds to `28 s`; 2:11.6 − 0.5 = 2:11.1).
- That the episode length 22:01 matches mock 2 (1:52 / −20:09) and SK-17.
- How the built Up next code treats a pause.

**Couldn't check:**
- Media3's exact `isPlaying` sequence for an in-buffer seek on this device (problem 6 asks for a fallback either way).
- How common recaps joined to the intro are in the owner's shows (problem 1's weight depends on it).
- Anything on the real TV.
