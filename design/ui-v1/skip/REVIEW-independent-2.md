# Independent review 2: Skip intro / recap, and Up next at the credits (design/ui-v1/skip/SPEC.md v1.1)

**What I read:**
- SPEC.md v1.1 and the eight mocks (`png/*.png`, each one opened, plus the contact sheet).
- CLAUDE.md, and UI-SPEC.md's player parts: the action chip, Up next, the hint bar and its 5 views, "OK means one thing", AC-O1, the VOD key map.
- The subtitles SPEC's timing check (3.4, 7.5).
- To check the "built" claims: `app/tv/js/intros.js`, and `player.js` (`sendSegments`, `watchedBefore`).
- In `PlayerActivity.java`: Up next's credits card, `back()`, `shortOk()` and the hint counter.

I judged v1.1 on its own merits and took the owner's decisions in section 12 as fixed.

## Score: 7.3 / 10

| Area | Score |
|---|---|
| Remote / D-pad usability and the OK rule | 7.5 |
| Clarity of the words | 7.5 |
| Edge cases and data safety (wrong or offset timestamps) | 6.8 |
| Consistency with the existing player design | 8.0 |
| Buildability | 7.8 |

**Verdict.** This is a big step up from v1.0. Every point from that review has a concrete answer:
- the way-back chip after every skip;
- a real OK guard;
- an exact seek that lands 0.5 s before the end;
- the pill placed last in the row;
- subtitles move only when they would overlap;
- Off asks nothing;
- an acceptance table.

The owner's five decisions are all there and easy to find. The chip family stays on-system: the same corner, the radius 16, and a HUD with no ring. The drain line versus the ring is argued well. The mocks match the spec closely.

What holds the score down is a small set of rules. Each looks fine alone but goes wrong where it meets the owner's real use:
- **Back on Up next.** The owner asked to "cancel with Back". The spec keeps today's Back, which also throws away the rest of the binge.
- **Skipping intros per show.** This is safe only through the subtitle check. That check ignores the subtitle system's own timing verdict. It is also so strict that a show he said yes to will often still show the button, which will look broken.
- **Back on the offer.** It is the key that hides everything else, yet here it records a permanent per-show No.

None of these needs a redesign. They need a one-round fix.

---

## Problems, most serious first

### 1. The subtitle check trusts a subtitle file whose timing was never checked (9.4, 4.3, 1.5)
- 9.4 counts any downloaded file as proof. But `design/ui-v1/subtitles/SPEC.md` 3.4 gives each file a timing verdict:
  - "Lined up with this copy": anchored by its fingerprint;
  - "Lined up with other subtitles": not anchored;
  - "Timing not checked": as downloaded, and possibly tens of seconds off this copy.
- With an unchecked file, "0 spoken lines inside the window" compares TheIntroDB with a file that may be just as far off. Two sources can agree with each other and both be wrong for this copy. This is the exact case (an offset copy) that the check exists to catch.
- 9.4 also doesn't say which times it uses. The player draws cues at `start × speed + auto offset + your offset` (subtitles 7.5). The check must use those same times. It must also run again after an Early or late step, or a correction he makes himself can still leave an old "checked" result in place.
- The timing is not stated either. The file has to be downloaded and lined up **before the window starts**. Game of Thrones' intro starts at 0:06, and Lost's recap at 0:02 (that one isn't speech-checked, but it is the same race). If the file arrives late, what happens? Nothing says so.
- **Change (9.4):**
  - "Checked" needs the verdict "Lined up with this copy" or "Made for this copy", and it uses the cue times as drawn.
  - The check runs again on every timing step.
  - A file that is not ready by the window's start leaves the window unchecked for this play.
  - Add an AC: a "Timing not checked" file gives no skip by itself.

### 2. A show he said yes to will often still show the button, and nothing says why (4.3, 4.4, SK-14, 12.5)
- The owner's decision 5 is "intro could be a skip by its self if you got that setting on for that show". In v1.1, after he says yes, the intro skips by itself only on a checked window. That means a Sure match, a downloaded file (and after point 1, an anchored one), no speech inside, and speech nearby.
- So the skip by itself stops, without a word, when:
  - subtitles are off;
  - the file is "Timing not checked";
  - the file is late;
  - the copy is an add-on copy with no file.
- SK-14 even tests this: a yes-show, then a button. From the sofa this reads as "I said yes and it didn't work". 4.4 says "no toast: the next intro skips ... which shows it worked", so the very next episode may show him the failure.
- The design has already built the safety net for a wrong jump: the 5 s way-back chip. Requiring a check on top of an explicit per-show yes is the extra caution v1.0 was criticised for, aimed the other way.
- **Change (4.3):** pick one of these two and write it down.
  - (a) In a yes-show, a Sure window skips by itself unless the check finds speech inside (1 line or more, from an anchored file). Without a usable file it skips anyway, and the way-back chip covers it.
  - (b) Keep the strict gate. Then the chip in a yes-show must say why it didn't skip, for example line 2 `Times not checked`. The Options panel's `Skip by itself` line must say `When the subtitles confirm the times`.

  (a) carries out the owner's decision better. Whichever you pick, add it to section 15 and log it.

### 3. Back on Up next throws away the binge, not only the timer (5.1; `PlayerActivity.back()`)
- The spec keeps today's Back: "Stay on this one (no autoplay, the rest of the queue is dropped, as today)". The code does that: `removeMediaItems(index + 1, …)`.
- Today the card comes in the last 40 s, so Back there meant "I'm done". In v1.1 the card comes at the **credits start**, and the main reason to press Back now is to watch a tag scene or the credits, then go on.
- After Back he reaches the end of E1 with no queue. CH+ and the row's Next episode go nowhere, and he has to go back to the series page for E2.
- The owner said "a timer he can cancel with Back": cancel the timer, not the binge.
- **Change (5.1, 10):**
  - Back stops the count and hides the card, and keeps the queue. CH+ and the row's `Next episode` still work.
  - At the real end, show the card with no count (`Next episode` · `OK play now` · Back leaves), or the end card UI-SPEC already uses.
  - Rename the hint to `Back Stop the timer` (or `Back Not yet`).
  - Add an AC: Back on Up next at 21:28, then at 22:01 the next episode is still one press away.

### 4. The offer's Back is a permanent "No" on the key that hides everything else (4.4, 9.5)
- On every other chip in this design Back means "hide" (the skip chip, the way-back chip). Back is also the leave key ("Back, Back to leave").
- On the offer, Back writes `Show a button` for this show and "never asked again". A Back pressed to clear the screen, or the first of two Backs to leave, becomes a permanent per-show choice.
- It also creates a show choice, which per 4.1 "wins over Account". If he later sets Account to Skip automatically, the shows where he pressed Back on an offer silently stay on buttons.
- After the hint bar's 5 views, the offer chip shows only `OK yes`. That Back means "No, forever" is then off screen.
- **Change (4.4, 9.5):**
  - Back = "not now", counted as ignored (two ignored: never asked again).
  - The show's choice stays `null`, so Account still governs.
  - Put the second key on the chip itself: `OK yes · Back no`.
  - Keep the explicit No in ▼ Options.
  - Update SK-15.

### 5. The way-back chip's 5 s is not really 5 s, and pausing kills it (2.2, 3.5, 4.2, 4.1 strings)
- The chip ignores OK for its first 1.5 s while it shows `OK go back`, and the hint bar shows `OK Go back`. That leaves 3.5 s of real use. Yet Account and Options both say `You can go back for 5 s`.
- 3.5 says it is also "what he sees while the picture rebuffers" after an EXACT seek on a provider stream. If the 5 s is wall time, a 2 to 3 s rebuffer leaves him about 1 s of picture to judge whether the jump was right. 4.2 doesn't say whether the 5 s is playing time. The skip chip's 10 s is playing time.
- 4.2: the chip "stays its 5 s unless a panel opens or the controls show". Pausing right after a skip shows the controls, which kill it. There is no row pill after the skip, because play is past the window. The only way back is then several ◀ presses, which v1.0 was faulted for.
- **Change (4.2, 2.2):**
  - The 5 s counts playing time from the **first frame after the seek**.
  - Shorten the OK guard to about 0.5 s, enough for a double press. Draw the key cap at about 40% until it binds, so the label never claims an OK that does nothing.
  - While the controls are up during its life, show a row pill `Back to intro` in the skip pill's slot (same rules). Or pause the chip's life and bring it back when the controls hide, as 3.3 does for the skip chip.

### 6. ▲ lands on the Skip pill even after he chose to watch the intro (3.3, 4.2; UI-SPEC section 1 rule 4)
- "▲ lands on that pill instead of Play while it is there", for the whole window. After `OK go back` ("he chose to watch it"), or after Back hid the chip, the pill stays and ▲ still lands on it.
- So the habit "▲ then OK" (Play/Pause on the first button) skips the intro he just chose to watch. Where ▲ lands now depends on hidden state: whether play is inside a window. The ring shows it, so this is not silent, but it is the kind of meaning change UI-SPEC rule 4 avoids.
- Without a Play/Pause key, pausing during an intro is already Back then OK (15).
- **Change (3.3):** ▲ lands on the Skip pill only while the floating chip would still be live, or the window has not been hidden or gone back from. Otherwise ▲ lands on Play as everywhere else, and the pill stays in the row one ▶ away.

### 7. Up next now binds OK earlier but without the guard (5.1, 2.2)
- The card moves from the last 40 s to the credits start, often a second after the final line. An OK pressed then to pause starts the next episode.
- 5.1 applies only the guard's "0.7 s after it times out" part. That part barely applies, because Up next doesn't time out: it acts. The skip chip's 1.5 s quiet wait and its 0.7 s "OK still pauses" rule are left out, though they guard against exactly this.
- The code already has a 700 ms guard for the card (`cardAt`).
- **Change (5.1):** the credits card follows the same OK guard as the skip chip: 1.5 s of quiet before it shows, and OK pauses for its first 0.7 s. Add an AC like SK-3 for Up next.

### 8. "Watched the episode before" means "started, any time in 3 days", and across seasons "any episode" (4.3, 9.5; `player.js` `watchedBefore`)
- The spec calls `recapAuto` built. The code counts **any progress record**:
  - 5 seconds of E1 count;
  - `at` is the last progress update;
  - for E1 of a season, **any episode** of the season before counts (`season - 1 && ep === 1`), not its last one.
- So watching S1 E3 yesterday skips S2 E1's recap. That recap covers S1 E4 to E24, which he hasn't seen. The way-back chip covers it, but only if he notices.
- **Change (4.3, 10, "to change"):**
  - "Watched" = past the intro or 50% (or `p.done` / `inProgress` false at ≥ 94%).
  - "The episode before" = E−1, or the highest episode of the season before.
  - Add a `tests/intros-test.js` case for both.

### 9. Autoplay leaves the episode it left "in progress" (5.1, 13)
- Dropping "finished at the credits" was right. But the advance itself (OK, or the count running out) is a strong "done" signal that the spec doesn't use.
- Credits at 80% of D (a long credits roll or preview) means autoplay at about 81%. `inProgress` stays true below 94%, so E1 keeps a resume bar and no watched check in the episode row. Opening it resumes at the credits.
- **Change (5.1):** when Up next advances, `markWatched` the episode it left. Reaching the credits alone still marks nothing.

### 10. One setting, two names for the same choice (4.1, 11)
- v1.1 says "one name per setting", but the choice has two names: Account says `Skip automatically` and the show panel says `Skip by itself`.
- The lines also differ: `One press skips the intro` (Account) and `One press skips it` (Options).
- The Options row's value is "this show's choice or, with none, what Account gives it". He can't tell an inherited `Show a button` from one he chose. Choosing the same value again silently creates a show choice, which then overrides Account (4.1).
- The Account `t-cap` line "Only times airglow could check with the subtitles skip by themselves" is hard to read for a non-native reader. "times … skip" parses as the times skipping.
- **Change:**
  - Use `Skip by itself` everywhere, the plainer of the two, and make the lines identical.
  - Give the show panel a third radio, `Same as Account (Show a button)`, as the default, or put `(Account)` after an inherited value.
  - Rewrite the `t-cap`: `Intros skip by themselves only when the subtitles confirm the times.` (or drop it if point 2(a) is taken).

### 11. The keys that matter most go off screen after 5 views (2.2, 5.1, 4.4; UI-SPEC 6)
- 2.2 says the chip's key cap carries OK after the hint bar's 5 views. Back carries real meaning here:
  - on Up next it is the timer cancel the owner asked for;
  - on the offer it is No (point 4).
- Mock 5's card shows only `OK play now`.
- The skip chip's Back (`Hide`) is harmless to hide, but these two are not.
- It is also unspecified whether "5 times" is counted per chip kind. `hintFirst(where)` keys by place; name the keys (`hint:skip`, `hint:skipback`, `hint:offer`).
- **Change:** put a second key on the Up next card and the offer (`Back stop` / `Back no`, the same key-cap style), or keep their hint bar beyond 5 views. Name the hint keys in 10.

### 12. The subtitle check is loose at the edges and blunt inside (9.4)
- "A spoken line within 2 min before its start **or** after its end". One side within 2 min proves little about alignment. Section 1 and point 4 of the change table say "speech close on either side", which reads as both.
- "1 or 2 spoken lines inside: kept, unchecked" offers a button that skips those lines. Usually they are the cold open's last line or the first line after, a few seconds over the edge.
- "2 or more spoken lines after the credits" (5.1) lets a one-line tag ("Hello?") through, so the card comes at the credits start and the count can cut it.
- **Change:**
  - Speech on **both** sides within 60 s (say 2 min if the data shows it is needed, and say which).
  - When the only lines inside lie within 5 s of an edge, trim the window to clear them, rather than keeping it as is.
  - Push Up next on **one** spoken line after the credits start, unless it is within 5 s of the start (a stray subtitle end).

### 13. Smaller things
- **Glyph (2.3, mock 3):** the way-back chip carries skipFwd, but its OK goes **back**. Use catch-up's `skipBack` (the glyph already exists) so the glyph matches the action.
- **Mock 3's number:** S1 E2's intro is 1:18.9 to 1:45.9 = 27.0 s. The chip says `28 s` (that is E1's 27.6 s). Round from the real window and fix the mock or its caption.
- **Wide Options (2.1):** the panel widens to 420 only in episodes, so its width changes by content, and UI-SPEC fixes 320 / 360. A shorter value (`Button` / `By itself`) would fit 360 and keep one width.
- **"First frame" (3.6):** a resume inside a window shows the chip "at the first frame" with OK bound at once ("the guard doesn't apply"). An impatient second OK while Resume loads then skips. Apply the 0.7 s rule from the first frame.
- **EXACT (3.5):** EXACT is already Media3's default. If scrubbing sets `CLOSEST_SYNC`, the jump must set EXACT for its seek and put it back. Say so, or the line does nothing.
- **Acceptance gaps (14):** no AC for:
  - Up next pushed by speech after the credits;
  - the joined `Skip recap and intro`;
  - Severance's two intros;
  - the subtitle step (2.1);
  - the 0.7 s after a time-out;
  - the offer being ignored twice;
  - the way-back chip during a rebuffer.

  Add at least the first, the offer one and the rebuffer one. They cover the owner's decisions.

---

## What is good (keep)
- The way-back chip after **every** skip, pressed or by itself, is the right answer and one code path.
- The OK guard is concrete and testable (SK-3, SK-4, SK-8). The 1.5 s of quiet before a chip is a good TV rule.
- The pill is last in the left group (nothing slides), with focus going to the seek thumb when it goes and a late answer never stealing focus.
- The seek-back rule (no chip unless the seek lands 15 s or more before the end) solves the loop cleanly.
- "Off asks nothing", stated and built (`sendSegments` returns before any request).
- The checks in 9.3 (Stranger Things' mislabelled credits dropped), "nothing is guessed" (7), and real curl data in section 0.
- Subtitles step only on a measured overlap, with no animation.
- Up next keeps its look, place and ring; the skip chip's drain line versus the ring is argued, not decorative.
- The acceptance table against a fake TheIntroDB, with `tuner.introBase` already in place.

## What I could not verify
- Nothing was run on the TV or the emulator. I judged the mocks by eye at 2x and didn't re-run `tools/audit.js`.
- How often the owner's provider copies get an anchored subtitle file. That decides how much point 2 matters.
- Whether his remote has Play/Pause, and how long an EXACT seek rebuffers on his provider (it matters for point 5).
- TheIntroDB's current answers and limits (I didn't call it).
