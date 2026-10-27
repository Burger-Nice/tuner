# Independent review: Skip intro / recap, and Up next at the credits (design/ui-v1/skip/SPEC.md v1.0)

Reviewed: SPEC.md, the six mocks (png/*.png and the contact sheet), CLAUDE.md, UI-SPEC.md section 6 and 7 (action chip, Up next, hint bar, "OK means one thing", VOD controls), and, to check the "built" claims, `app/tv/js/intros.js`, `player.js` `sendSegments`, and the Up next / chip code in `PlayerActivity.java`.

## Score: 6.8 / 10

| Area | Score |
|---|---|
| Remote / D-pad usability and the OK rule | 6.5 |
| Clarity of the words | 6.5 |
| Edge cases and data safety (wrong or offset timestamps) | 6.0 |
| Consistency with the existing player design | 7.5 |
| Buildability (specified enough to build) | 7.5 |

**Verdict.** This is a careful, honest spec. The visuals are on-system and the chip sits in the same place as the Up next chip. It checked the real API with curl. It also rejects guessing, which is right. Its central safety idea is "a wrong button costs nothing, a wrong automatic jump loses story", and that is good. But it applies that idea only to the intro chip and drops it in four places:

- the credits auto-advance,
- the manual skip (no undo),
- "finished" in Continue watching,
- "Off" still making network calls.

The OK handling during the chip is also riskier than the spec admits. It also adds a lot the owner did not ask for (seek-bar gaps, scrub names, three modes plus a hidden 3-day recap rule, a film credits rule, a Continue-watching rule change, a subtitle lift). The owner asked for two things: a skip button, and a play-next prompt. It needs a fix round before building, but nothing needs a redesign.

---

## Problems, most serious first

### 1. Up next at the credits start autoplays on data that may be wrong (sections 1.7, 5.1, 9.3, 9.4 last bullet)
- At the credits start the card counts 15 s and then plays the next episode. That is a destructive action on community data. The spec calls a wrong automatic skip dangerous in section 4.1, but here it autoplays on the same kind of data.
- The only checks are "last 25% of D" and "at least 10 s before the end". A wrong time at 17:00 of a 22 min sitcom passes, and 15 s later the last 5 minutes are gone. Back is the only escape.
- The check that makes it safer (subtitle lines after the credits start) needs a downloaded file. Section 9.4's last bullet says that without one "the windows are used unchecked ... automatic gets its undo", but the credits auto-advance has no undo.
- Sitcom tags and stingers are common (Scrubs, Parks, Community, The Office). Without a downloaded subtitle file they are cut off. Even with one, sung credits lyrics that the file doesn't mark with ♪ count as "spoken" and delay the card. That is harmless but untested.
- The old rule (3 s after the last line, else the last 40 s) was safer when there was no file. The new rule is more aggressive exactly when the spec knows least.
- **Change:** when the credits time is unchecked (no downloaded subtitle file, or Likely match), show the Up next card at the credits start but don't autoplay until the last 40 s (or until the file's end), and keep OK = play now. Or give the card an "autoplay in 15 s" only when the check passed. Say which in the spec.

### 2. A manual skip has no way back, and the spec's reason is wrong (sections 3.5 OK row, 4.1 "Why the button is the default")
- Section 4.1 says "he sees the jump and presses ◀". But ◀ seeks 10 s. After a wrong 107 s (Game of Thrones) or 3 min (recap) jump that is many presses.
- Only automatic mode gets "OK watch it". The mode where the owner is more likely to press blind gets no undo, and 3.5 even says "Nothing else shows".
- **Change:** show the same 5 s `Skipped` chip after a manual skip, at least when the window was unchecked or Likely. It is the same view and the same code path as automatic mode, so it costs almost nothing.

### 3. The chip takes OK at a moment the owner doesn't choose (sections 1.2, 3.2, 3.5; UI-SPEC AC-O1)
- UI-SPEC says "VOD OK pauses, always", and Up next is allowed to bind OK because it comes at the very end of an episode. The skip chip appears at a random moment mid-episode, with no guard like the action chip's "never in the first 10 s after a tune".
- Risks:
  1. He presses OK to pause just as the chip appears and skips 30 s to 3 min instead.
  2. The chip vanishes at 10 s while he is pressing, so OK changes meaning under his thumb.
  3. A slow seek (see point 9) leads to a second OK, which now pauses.
- Pausing while the chip is up needs ▲, ◀ to Play, OK, because ▲ lands on the Skip pill, not on Play (section 3.4). Playing Play/Pause directly only works if the remote has the key. The code even asks `deviceHasKey(KEYCODE_MEDIA_PLAY_PAUSE)` (PlayerActivity.java line 2453), so it can be absent on the owner's remote.
- **Change:**
  - Don't show the chip within about 1.5 s of any key press, or hold the chip's OK binding for about 400 ms after it appears.
  - After a skip, either keep the chip a moment ("Skipping...") or ignore OK for 1.5 s.
  - Confirm on the TV whether the remote has a pause key. If not, say that pausing in an intro costs three presses and accept it knowingly (section 13 should list it).

### 4. Offset or differently cut copies: the chip itself misbehaves, not only the jump (sections 3.2, 3.7, 4.1, 9.4)
- The chip is anchored to the window start with a fixed 10 s life.
- If the copy has a channel card or longer cold open (the spec's own examples), the intro starts N s after the chip appears. The chip can expire before the intro starts, so the owner sees "Skip intro" over the cold open, then nothing when the intro really starts.
- If the copy is shorter, the chip appears mid-intro and the jump lands N s into the story.
- Section 4.1 says the list "doesn't know which copy he has", and section 13 says the provider offset is unknown. The spec's only mitigation is the subtitle check, which needs a downloaded file. Embedded subtitles "can't be read ahead", so for many provider copies there is no check at all.
- **Change:**
  - Start the chip's life at the window start but make it last until at least 10 s after the start or 1 s before the end, whichever is longer, up to the window end. Or define a tolerance.
  - Say what happens on a window the subtitle check can't run on (log it, and treat it as "unchecked, button only, no Up next autoplay").
  - Land the jump on the window end, not a keyframe before it (see point 9).

### 5. "Finished at the credits" can hide unwatched story (section 5.3)
- Changing `inProgress` so that reaching the credits start counts as finished makes a wrong credits time (point 1) remove an episode from Continue watching. That is silent and hard to notice.
- It was also not asked for.
- `inProgress` in `state.js` is a pure function of `{t, d}` in `S.progress`. The spec never says where the credits start is stored. The intro cache expires after 30 days and is not part of the progress record.
- **Change:** either drop 5.3 for v1, or require "credits start passed AND at least ~90% (or the last 90 s)" and store the credits start in the progress record when it is first reached.

### 6. "Off" still calls the network, and the owner's data leaves the TV (sections 4.1, 9.1, 9.2)
- 9.1 says "With the setting Off nothing is asked; to change: Off should still ask". So choosing Off ("No buttons") still sends the IMDb id, season and episode (and the TV's IP) to a third party for every episode he watches, just to drive Up next and gaps.
- In an app sold as ad-free and owner-first, that is a surprise, and CLAUDE.md says to ask before anything outward-facing.
- **Change:** say it in the spec and ask the owner (open question 4), or make Up next independent of the setting by naming it separately. If Off is meant to mean "no skip buttons", the foot text `Skip intros is off.` should say Up next still uses the list.

### 7. Words: an idiom the spec bans, and a range that means nothing (sections 2.5, 4.2, 11)
- **`OK watch it`.** In English "Watch it!" is a warning ("be careful"). Section 2.5 bans idioms, and the owner is a non-native reader. Use "OK Go back" or "OK Undo". The hint bar has the same string (`OK Watch it`).
- **`1:19 to 1:46`** under "Intro skipped" is a timecode, not meaning. "Skipped 27 s" says what happened. The range is only useful for a bug report.
- **Setting names** are inconsistent: the Options row is `Skip intros`, the panel and Account row are `Skip intros and recaps`, and the first choice is `Show a button`. "Show a button" describes the UI, not what the owner gets. Suggest "Ask" / "Skip automatically" / "Off", or "Show Skip button". Use one name for the setting everywhere.
- **Foot lines:** `Not known: which show is this?` reads like a question to the owner and has no action. `Not known for this episode.` and `Not sure about this episode's intro.` are fine but long on a small panel. `Times come from TheIntroDB, made by viewers` is a jargon name the owner doesn't know. Keep it once (Account), not on every Options open.
- The spec's own rule (2.5) says "recap" over "previously on". "Recap" is fine, but test it with the owner; an Icelandic reader may prefer "Skip intro" only.

### 8. Hidden rules in automatic mode make it unpredictable (sections 1.6, 4.3)
- Automatic skips an intro but skips a recap only if he watched "the episode before in the last 3 days (or ever, in airglow)". It also drops to a button for Likely matches and for windows with 1 or 2 spoken lines.
- The owner cannot know which will happen on a given night. Watching on another device, or after a 4-day gap, changes the outcome. The chip is the explanation, but it appears only after the fact.
- For one owner who "doesn't want to think about it", three modes plus conditions is a lot, and the default ("Show a button") already covers his request.
- **Change:** ship Show a button + the Skipped/undo chip first. Add Skip automatically after a week on the TV, as the spec itself recommends (open question 1). Cut the 3-day rule, or make recaps always buttons in v1.

### 9. Seeking is under-specified (sections 3.5, 4.2)
- The jump seeks to the window end exactly, but nothing says:
  - exact or nearest keyframe (HLS/TS from an Xtream provider can land seconds off);
  - what the owner sees during buffering (the chip is gone, the picture freezes);
  - what happens if the seek fails;
  - whether to land a little before the end, because community ends are often at the fade-out and a late end cuts the first line of the scene.
- Automatic mode's `PlayerMessage` at the exact start fires a seek on the playback thread. Say what happens when the seek lands before the message is handled twice (a double jump), and what happens when the user is paused at that position.
- **Change:** specify the seek parameters, a short "Skipping..." state, a failure toast, and a landing offset (about 0.5 s before the end).

### 10. The row pill moves the row, and its expiry while focused is unspecified (sections 2.1, 3.4; mock 2)
- The `Skip intro` pill is inserted between +10 and Next episode while play is inside the window, so Next episode and the pills after it slide right at the window start and left at its end. UI-SPEC says rows never change size when focus moves.
- Unspecified:
  - the window ends (or the list answers late) while the controls are up and the focus is on the pill: where does focus go?
  - does the row shift under the ring?
- Mock 2: the focus ring on the pill is about 1.5 dp from +10 and Next episode (at 2x, a 6 px gap against a 5 px ring). UI-SPEC's ring audit wants 5 px + 2 px air. Run `tools/audit.js` on this mock.
- **Change:** reserve the slot (or put the pill last in the left group), and say where focus goes when it disappears (the seek thumb, as after a skip).

### 11. Seek-back re-trigger loop (section 3.6)
- After a skip the owner is at the window's end. A normal "repeat the last line" press of ◀ lands inside the intro's last 10 s, so the Skip chip comes back (5 s or more left), and the Back-hidden rule says "even after Back hid it: going back is a new choice". This will fire on a habit, not a choice.
- **Change:** after a skip, suppress the same window for the rest of this play unless he seeks back by more than the window or 10 s into its first half. Or say that a chip returns only when the seek lands in the first 80% of the window.

### 12. Subtitle lift moves subtitles for no overlap (section 2.1; mocks 3 and 4)
- Every chip (also Up next, an existing component) now moves the subtitle view up 50 dp for 150 ms animation, even in mock 4 where a short centred line doesn't touch the chip. A moving line is distracting while reading.
- Mock 3: the lifted subtitle ends about 3 px (at 2x) above the chip, not 8 dp.
- **Change:** lift only when the measured subtitle text bounds intersect the chip's box (the same view already lays them out), or accept the overlap on the right 260 dp and keep subtitles still.

### 13. Scope creep: seek-bar gaps, scrub bubble names, film credits (sections 5.2, 6)
- Gaps of 2 dp in a 6 dp bar: on a 22 min episode the bar is about 800 dp wide, so an intro is about 17 dp long and the gap is a 2 dp mark at each end. That is hard to see from a sofa, and the owner didn't ask for it.
- Each extra (gaps, bubble names, film rule, finished rule, subtitle lift, "Off still asks") adds a bug surface that the TV has to prove. Mark them "later" and cut them from v1, or test them with the owner first.

### 14. Specification gaps for the builder (sections 8, 9, 10; mocks)
- **No acceptance table.** UI-SPEC has AC-xx rows; this spec has a state table but no checks a test can run. Add them: chip appears at window start, OK skips, Back hides, with a fake TheIntroDB base (`tuner.introBase` already exists) in `tests/`.
- **Missing mocks:**
  - the Options root row (`Skip intros` with its value);
  - the Account > Playback row;
  - the scrub bubble with a part name;
  - `Skip recap and intro` (the widest chip, 234 wide);
  - Up next with the controls up;
  - the 5 s Skipped chip with a two-line subtitle.
- **Stale "to add" items:** section 9.1, 9.5 and 10 say the prefetch, `level`, `recapAuto` and `mode` are "to add", but the working tree's `player.js` (uncommitted) already sends them. Update the spec so the engineer doesn't redo them.
- **Hint bar versus the 5-view limit:** section 2.2 says the hint bar's OK label is rewritten while the chip floats, but 3.2 says the hint bar shows only the first 5 times. After that the OK label is not rewritten, which UI-SPEC section 6 forbids ("never changes silently"). The existing action chip has the same shape, so this is a UI-SPEC question, but say it.
- **Chip dismissal rule:** the action chip is dismissed by "any other key" (`PlayerActivity.java` line 1977). The skip chip survives ◀ ▶. That is reasonable (and matches Up next), but state it as a deliberate exception.
- **Timer metaphor:** the action chip and Up next use a countdown ring; the skip chip uses a 3 dp pink line at the bottom edge. The line is 6 px at 1080p and low-contrast on a bright picture. Either use the same ring or say why not. Pink is also said to be "only for the drain line and radio dots", which changes the colour rule.
- **Two `Back` meanings:** Back hides the chip and does not leave the player, so someone who wants to leave during an intro presses Back twice. Same as the action chip, so acceptable, but list it in section 13.

---

## Things that are good (keep)
- Chip place, size family and radius match the action chip; HUD with no ring; the OK label is written into the key cap, so the meaning travels with the chip.
- The spec uses real API answers and shows the odd cases (two intros that disagree, a wrong "credits" label, a 404).
- No guessing, and no sending his skips anywhere.
- The "Up next wins" rule, the prefetch of the next episode's recap, and keeping the existing Up next keys and look.
- ▲ OK as the always-available skip, and the focus returning to the seek thumb after it.
- A 6 s timeout, 30 day cache, and "never for live or catch-up".

## What I could not verify
- Whether the owner's remote has a Play/Pause key, whether 10 s is long enough from the sofa, and how often his copies are offset from the list. The spec says the last two itself (section 13); the first it doesn't.
- Whether TheIntroDB's v4 API keeps its answers and limits (I did not call it).
- Nothing was run on the TV.
