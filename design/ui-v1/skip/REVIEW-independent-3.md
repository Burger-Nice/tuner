# Independent review 3: Skip intro / recap, and Up next at the credits (design/ui-v1/skip/SPEC.md v1.2)

**What I read:**
- SPEC.md v1.2 and all nine mocks: each `png/*.png` opened, the contact sheet, and close crops of the offer, way-back and Up next chips.
- CLAUDE.md, and the player part of UI-SPEC.md 7: the action chip, Up next, the hint bar, the VOD controls and the key map. I also read UI-SPEC's "OK means one thing" (v1.2 point 4, principle 4, section 6).
- The subtitles SPEC's timing verdicts (3.4 and the table at 576–578) and 7.5.
- To check what the spec says is built:
  - `app/tv/js/intros.js` and `player.js` (`segQuery`, `watchedBefore`, `sendSegments`);
  - `screens/account.js`, `tests/intros-test.js` and `app/tv/js/subs/parse.js` (`lastDialogue`);
  - in `PlayerActivity.java`: `chipTick`, `tick` (today's credits rule), `showUpNext`, `back()`, `shortOk()` and the chip views (`chipSay`), plus `Subs.lastLineEnd()`.
- One live call to TheIntroDB (Always Sunny S1 E1), to see which fields an answer carries.

I judged v1.2 on its own merits and took the owner's five decisions in section 12 as fixed.

## Score: 7.4 / 10

| Area | Score |
|---|---|
| Remote / D-pad usability and the OK rule | 7.5 |
| Clarity of the words | 7.4 |
| Edge cases and data safety (wrong or offset timestamps) | 7.0 |
| Consistency with the existing player design and the brand | 7.5 |
| Buildability | 7.6 |

**Verdict.** This is a careful, mature spec. Most of what it contains is right:
- **The chip family:** one corner, one chip at a time, a HUD with no ring, the way-back chip after every skip, and the exact seek 0.5 s before the end.
- **The OK guard.** The "fresh window" rule for ▲, and the `Same as Account` value.
- **Back on Up next** now keeps the binge.
- **Option (a):** the subtitle check can only stop a skip, never start one.

The owner's decisions 1, 3, 4 and 5 are carried out faithfully.

What holds the score down:
1. **Decision 2 (recaps skip by themselves while bingeing, in the default) is weaker than it looks.** Three separate rules each turn it into a button in common binge cases: a season's first episode, a recap joined to the intro, and a recap at 0:00 whose answer arrives after the first frame.
2. **One acceptance test contradicts the rule it tests,** and the built code. SK-10 cannot pass.
3. **The Up next card shows key caps that are wrong** while the controls are up.
4. **Subtitle files carry text cues that aren't speech,** and the check counts them as speech. This quietly defeats the per-show skip, and Up next's timing too.

None of this needs a redesign. It is another tightening round.

---

## Problems, most serious first

### 1. SK-10 (and mock 5's caption) contradict 4.3 and the built code
- 4.3 and v1.2 point 8 say: "a season's E1 never skips its recap by itself … it gets the chip". `watchedBefore()` in `player.js` returns false for `E0 = 1`.
- SK-10 says: "Lost S2 E1 with S1 E24 finished yesterday → the recap skips by itself". Mock 5's caption says the same ("after S1 E24 last night it would skip by itself").
- Against the built rule, SK-10 fails. As written, the acceptance table tests the opposite of the spec.
- **Change:** fix this together with point 2. If E1 stays excluded, move SK-10 and SK-11 to an episode with E > 1 and a recap, and give the fake list that episode. Then rewrite mock 5's caption.

### 2. Recaps in a binge often won't skip by themselves, against decision 2 (3.1, 3.6, 4.3)
Decision 2 is about bingeing. Three rules each fall back to the button in exactly that case.

- **a. A season's E1 is excluded** because "the season before's finale can't be told apart".
  - In a binge it can: the play queue holds it. When Up next (or CH+) moves from S1's last episode to S2 E1, the item before in `ctx.cur.items` *is* the episode before.
  - Season premieres are where recaps are most common and longest.
  - **Change (4.3, 9.5):** the episode before = the same season's previous number, **or the previous item in this play's queue when it is the same series**. Only an E1 opened cold (from the title page, no queue) gets the chip.
- **b. A joined recap and intro skips by itself "only if both parts would"** (3.1).
  - In the default, intros never skip by themselves. So every show whose recap runs straight into its titles gets `Skip recap and intro` as a button, even in a binge. Game of Thrones from S2 on is the obvious one.
  - **Change (3.1):** when only the recap part may skip by itself, skip the recap by itself to the intro's start, with the way-back chip `Recap skipped`. Then the normal `Skip intro` chip for the rest of the intro (its "5 s or more left" rule already covers a short one). Add an AC next to SK-26.
- **c. The late-answer rule against a recap at 0:00.**
  - `parseSegments` maps a missing recap start to 0 (tested in `intros-test.js`), so recaps at 0:00 are a real data shape.
  - On a queue transition, the next item's first frame comes almost at once. `segments` only arrives after the `track` event, `imdbOf` and an IndexedDB read. So the answer is "late" by 3.6's definition, and it is "never a jump by itself after the window started".
  - The prefetch (5.1) warms only the web cache, not the native player.
  - **Change (9.5, 3.6):** send the next episode's segments to the native player ahead of time, with the `queue`. Give them a `recapAutoIfThisWatched` flag that the player resolves itself when Up next moves on, since it already marks the episode watched.
  - Also say that an answer arriving in the first 3 s of play still counts as on time for a window that starts in the first seconds.

### 3. The Up next card shows the wrong keys while the controls are up (5.1, 2.2)
- UI-SPEC 7 puts Up next "above the bar when it is up", and it binds OK only while the controls are hidden. With the controls up, OK pauses or chooses, and Back hides the controls.
- The v1.2 card still says `OK play now` / `Back stop` (mock 6) and doesn't change when the controls come up. Then it promises two keys that do something else.
- This is the one place in the design where "OK means one thing" is broken *on screen*, not just in theory.
- **Change (5.1):** with the controls up, drop the key column, or replace it with `▲ Next episode` pointing at the row's button. The count goes on. When the controls hide, the keys come back.
- The same question applies to the end card (point 7).

### 4. The subtitle check counts subtitlers' credits and ads as speech (9.4, 5.1)
- 9.4's "spoken line" is anything that isn't music, brackets or empty. OpenSubtitles files very often carry:
  - a credit cue placed in the opening titles, because nobody speaks there ("Synced and corrected by …", "Subtitles by …");
  - an advert cue near the end ("Support us and become VIP member … www.OpenSubtitles.org").
- **The intro credit cue** is one spoken line inside the window. It vetoes the skip by itself in a yes-show (4.3), and the owner sees a button in a show he said yes to, with no reason given.
- **The ad cue** after the credits start pushes Up next to "3 s after the last spoken line" or to the last 40 s (5.1). Today's rule has the same weakness, since `Subs.lastLineEnd()` takes the very last cue.
- The subtitles code already knows this problem in one form: `lastDialogue()` skips a translator's credit after a 60 s gap. But 9.4 doesn't reuse that, and the gap rule doesn't catch a cue inside a silent intro.
- **Change (9.4):** a spoken line also excludes cues with a URL, or that match the subtitler and ad words: subtitles by, synced, corrected, ripped, translated, opensubtitles, Þýðandi, and so on. It also excludes a lone cue inside a window that is more than 10 s from any other cue. Use the same filter for 5.1's credits push and for today's rule. Add an AC: an ad cue 20 s after the credits start doesn't move Up next.

### 5. Sung theme songs lose their chip entirely (9.4)
- Many subtitle files caption theme lyrics without `♪`, for example Friends, Gilmore Girls and The Big Bang Theory.
- Three or more such lines inside an intro window, in an anchored file, means "dropped (the copy is offset or another cut)". The chip disappears even in the default mode, where a wrong chip costs almost nothing (he only presses it when he sees the intro).
- **Change (9.4):** with 3 or more spoken lines inside, drop the window only when those lines run across the window's start or end (a real offset). If they all sit well inside the window, or are mostly italic (`<i>`, how lyrics are usually set), keep the chip and never skip by itself. Add an AC with an italic lyric block.

### 6. The offer can appear where "yes" changes nothing (4.4, 9.5)
`offer` is true on "one counted press in another episode, no choice, fewer than 2 let go". There is no condition on the mode or the match:
- **Account set to Skip by itself:** he presses Skip intro only where the skip by itself was blocked (a Likely match, or a speech veto). Then the offer asks him to turn on what is already on.
- **A Likely match:** after "yes", the next intro still shows the button (4.3: Likely never skips by itself). That is the "looks broken" case review 2 warned about, now caused by the offer itself.
- **Change (9.5):** offer only when this show's effective mode is `button` and both counted presses were on a Sure match. Count presses only on Sure windows.

### 7. The end card after Back waits for ever on an OLED (5.1)
- After Back on Up next, the player pauses at the end on a held frame and shows a card with no timeout. `PlayerActivity` sets `FLAG_KEEP_SCREEN_ON` for the whole activity.
- The owner watches on an OLED. The case this card exists for is "watched the credits, then walked away or fell asleep". That leaves a static frame and card on the panel indefinitely.
- The card's keys and guard aren't specified either: the hint bar, the OK guard, ◀ (a seek back from the paused end), and what happens with the controls up.
- **Change (5.1):**
  - After 5 min with no key, leave the player as Back would. Or at least clear keep-screen-on, so Google TV's screensaver takes over.
  - Give the end card the OK guard and a hint string (`OK Play now · Back Leave`), and add both to section 11.
  - ◀ or a seek away from the end: the card goes and play resumes.

### 8. Back on Up next: the last-40 s card isn't ruled out, and setPauseAtEnd is player-wide (5.1)
- **The last-40 s card.** Today's `tick` shows a counting card in the last 40 s (`left <= UP_NEXT_MS`). 5.1 doesn't say that a Back at the credits start suppresses that second counting card. Without that, in any episode whose credits run longer than 40 s, he presses Back at the credits start and the count starts again in the last 40 s.
  - **Change:** after Back, no counting card again for this episode, only the end card.
- **setPauseAtEnd.** `setPauseAtEndOfMediaItems(true)` is a player setting, not a per-item one ("for this item" in 5.1 is misleading).
  - **Change:** it is set on Back, and cleared on the next media item transition, on CH+ or `Next episode`, and on leaving. Add an AC: after a Back in S1 E1 and CH+ to S1 E2, S1 E2's credits count and move on normally.

### 9. The OK guard says one thing and does another for 0.7 s (2.2)
- For its first 0.7 s, the skip chip, the offer and Up next let OK pause. But the hint bar that appears with them already reads `OK Skip intro` (mock 1), and the chip's `OK` cap is full strength.
- The way-back chip, in the same design, dims its cap to 40% until OK binds. The existing action card ignores OK for 700 ms instead of pausing. That makes three behaviours for one idea.
- **Change (2.2):** every guarded chip draws its `OK` cap at 40% until OK binds, as the way-back chip does. The hint bar shows its new OK label from the moment of binding; before that, it shows the pause label or no OK entry. Say in one line why these chips pause and the action card ignores OK, or align them.

### 10. The way-back chip after a skip by itself binds OK with no warning (2.2, 4.2)
- After a *pressed* skip, the 0.5 s guard is right: the only risk is a double press.
- After a skip *by itself*, the chip appears unannounced. A press meant as Pause in the next 5 s goes back to the intro.
- Going back then costs him the way forward too. The window is "left alone": no chip, and the pill isn't fresh. So the re-skip is ▲, ▶ ×4 and OK.
- **Change (4.2):** after a skip by itself, the way-back chip uses the full guard: the 0.7 s pause rule, cap at 40%. Also make the `Skip intro` pill the ▲ landing target after a go-back from a skip by itself, because the list was probably right and the press was probably a slip.

### 11. A wrong copy keeps skipping wrong in every episode (4.3, 15)
- Option (a) skips on list times alone whenever there's no anchored file. Fingerprint-anchored files will be rare on IPTV re-encodes, so "no evidence" will be the normal case.
- TheIntroDB's answer carries no reference duration (checked: `{tvdb_id, type, season, episode, intro, credits}`), so nothing catches an offset copy.
- If his provider's copies of a show are offset (an ident at the start, a cut "previously on"), every episode of a yes-show jumps wrong, and every recap in the default does too. The only remedy is the way-back press each time. 15 only logs it.
- **Change (4.3):** a go-back within its 5 s after a skip by itself, with no anchored file, marks that show's list times as doubtful on this provider for 7 days. That show's intros and recaps then get the button, and the Options foot says `Skipped wrong last time: showing a button.` This counts trust, not times, so it doesn't break section 7's "no learning times from presses".

### 12. "Back stop" is ambiguous, and Up next's Back has three names (5.1, 11)
- Next to `OK play now`, `Back stop` reads as "stop playing".
- The hint says `Back Stop the timer`. UI-SPEC 7 (not updated) says `Back Stay on this one`. The end card says `Back leave` (leave what?).
- **Change:** one phrase on the card and in the hint, for example `Back` `stay here` on the card and `Back Stay here` in the hint. It says what happens (he stays on this episode) and it can't be read as "stop playing". Use `Back close` on the end card (UI-SPEC uses "Back closes" elsewhere). Update UI-SPEC 7's Up next row to v1.2's behaviour, since it is the source this spec extends.

### 13. The offer gives no sign that "yes" worked (4.4)
- OK on the offer makes the chip vanish. Back and the timeout do exactly the same. He can't tell a recorded yes from a missed press until the next episode's intro.
- **Change:** on OK, the chip's text becomes `Done. Intros in this show skip by themselves` for 2 s, with no keys, then fades out. This is the chip's own state, not a toast, so the "no toast" intent holds.

### 14. The drain line's reason contradicts the action chip (2.1)
- 2.1 says a ring would claim the chip acts when it runs out, because "the ring belongs to Up next". But UI-SPEC's action chip has the same ring and is *dismissed* at 8 s without acting.
- The system already uses the ring for "this offer goes away". The drain line adds a second timer look for the same meaning, in the same corner.
- **Change:** keep the drain line if you like it (it reads well in the mocks), but give it a reason that holds. For example: "two-line chips and 48-high chips have no room for a 40 ring". Or say that the action chip moves to the drain line later, so there is one rule: ring = acts at zero, line = goes away at zero.

### 15. Smaller things
- **Fonts (2.1):** the skip, way-back and offer chips set their labels in Outfit 700 16. The Up next and action chip titles in the same slot are Inter 650 16 (`chipTitle`). Pick one per slot; the pill family (Outfit) argument is for the row, not the HUD.
- **Offer chip crowding (mock 8 crop):** the key caps sit about 1 dp above the drain line. Make the two-key chip 64 high, or set the drain 3 dp lower on two-line chips.
- **Up next width (mock 6):** the stacked key column cuts the episode name to "Charlie Wants an Abo…". `showUpNext` also shows a third line (`chipSay`, "Same source: Northlight 4K") for add-on episodes, which 5.1 doesn't place next to the stacked keys. Specify both: the name's max width, and the three-line card's height.
- **Rounding (2.5):** SK-2 expects `28 s` for a 27.6 s window, so the rule is "rounded", not "whole seconds". Say "rounded to the nearest second".
- **Guard and count (2.2, 5.1):** if the 1.5 s quiet delays Up next, does the 15 s count from the card's appearance or from the credits start? Does the skip chip's 10 s life include the wait (SK-1 vs SK-8)? Say "from appearance" for both.
- **Seeking back to before a window (3.6):** a seek that lands *before* a skipped window's start and plays into it isn't covered. Does the chip come back? Say yes, since "lands 15 s or more before its end" includes it.
- **The first frame after the jump (3.5, 4.2):** don't define it by `onRenderedFirstFrame`, which isn't reliably reported again for each seek. Use the first `onIsPlayingChanged(true)` after the seek's `onPositionDiscontinuity(SEEK)`.
- **Options foot (8, 11):** there is no line for a recap ("This episode: recap, intro and credits known."). Lost S2 E1 has no correct foot today.
- **Stale notes:** section 10 says "rename `Skip automatically`", but `account.js` already says `Skip by itself`. `skip.css`'s header still says v1.0. "Test cases in `tests/intros-test.js` (10)" reads as ten cases; it means section 10, and none of those cases exist yet.
- **9.4 wording:** "Made for this copy" also covers a track in the file (subtitles 3.4), which 9.4 then excludes. Say "a downloaded file with the verdict …".

---

## What's good and should stay
- **Option (a), done properly:** only an anchored file counts, it can only stop a skip, it uses the cue times as drawn, it runs again after each step, and a late file means no evidence.
- **Back on Up next keeps the queue,** and moving on marks the episode watched. Those are two real binge bugs fixed.
- **The fresh-window rule for ▲,** and `Back to intro` taking the Skip pill's slot with the life paused (mock 4). These are well judged.
- **`Same as Account` with `Now: …`** removes the inherited-value confusion.
- **Strings are plain** and consistent across the chip, the pill, Options and Account (apart from point 12).
- **The way-back chip's life counts playing time.** Pausing, the controls and a rebuffer can't eat it.
- **The acceptance table is concrete** and mostly uses real TheIntroDB times.
