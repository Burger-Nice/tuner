# Catch-up v1.2: independent review (third round)

Reviewer: the same independent senior TV UI/UX reviewer (v1.0: 6.3, v1.1: 7.4). Scope: `SPEC.md` v1.2 (its "v1.2
changes" list and the body sections it points to), the 33 re-rendered mocks and the contact sheet, and `tools/audit.js`.

How I checked:
- Read the v1.2 change list, then the spec body each answer points to: 3.3, 3.5, 4.2, 5.1, 5.7, 5.8, 6.4, 6.6, 6.10 and
  7.2. I'm checking that the body says it, not only the change list.
- Looked at the renders that carry the visible changes: `home-replay`, with `May show results` on the On now cards and
  the short caption; `player-notgame`, with the new copy at 420 dp; `choose-video`; and `home-behind`.
- Ran `node tools/audit.js`: 33 pages, 0 findings.
  - `--inject`: the injected `Jazz 118:112` is caught on every shield mock.
  - `--inject-v10`: brings back the v1.0 / v1.1 faults and reports CONTAIN ×3 and a new TRUNC.
- The TRUNC finding is worth naming. v1.1's `Kept until Thu 29 Oct · late` caption was cut by the hero's two-line
  clamp, and I missed it in round two. The designer's new check caught it.

---

## Scores

| Dimension | v1.0 | v1.1 | **v1.2** | In one line |
|---|---|---|---|---|
| Remote ergonomics | 7.0 | 8.0 | **8.0** | Unchanged and good. One small side effect of N4: the skip button can jump backwards (S1) |
| Spoiler-shield correctness | 5.0 | 7.0 | **8.0** | All six v1.1 leaks are closed in the spec body. The new first-replay check opens one path of its own (M1) |
| Clarity for a casual user | 7.5 | 8.0 | **8.0** | The `Not the game?` rows now start from what you see. The first-replay check asks a question a casual viewer can't reliably answer |
| Visual quality and consistency | 7.5 | 8.5 | **8.5** | Clean. The short `Until Thu 29 · late` caption fits; TRUNC guards it |
| Feasibility | 5.5 | 7.0 | **7.5** | Per-channel `archiveShift` applied in both cases, the live `Timeline.Window`, start from the minute on `.ts`: all sound |
| States and edge cases | 6.5 | 8.0 | **8.0** | Almost complete. The first-replay check isn't drawn and has no "Not sure" and no fallback |
| **Overall** | 6.3 | 7.4 | **8.0 / 10** | A careful round. One must-fix, which this round's own S1 answer created; the rest are small |

---

## v1.1 points: verified

| v1.1 | Status | Where |
|---|---|---|
| N1 the session reveal after watching live | **Fixed**: `revealed.delete(gameId)` when a replay opens; 7.2 applies "whatever its session reveal"; the flow is in the shield script | 6.10, 7.2, 10.11 |
| N2 ET date | **Fixed** in 3.3 and 5.7, and checked by the audit. One sentence in 5.7 still says the old thing (S2) | 3.3, 5.7 |
| N3 unmatched videos everywhere | **Fixed**: Movies grid and Recently added, Search, Saved, Continue watching; no-art tile, no detail page | 5.8 |
| N4 the chapter margin | **Fixed** as asked, but applying it to the skip button has a side effect (S1) | 6.4 |
| N5 the clocks while behind | **Fixed**: the hero hand-over, `refreshToday`, Tonight's games, the hub's Today and `sortGames` all follow tip-off + 3 h 30; the after-row is defined without `Back to live` | 5.1, 6.10, 7.2 |
| N6 `archiveShift` in case 1 | **Fixed**: kept per channel with an account default, applied to the raw string in whole hours | 3.5, 9 |
| S1 the first wrong replay | **Answered** with the first-replay check, which brings a new risk (M1 below) | 6.6 |
| S2 to S9 | **Fixed**, except a timing detail in S6's warning window (S3) | 3.5, 4.2, 4.3, 6.5, 6.8, 5.1 |
| Nits | **Fixed** | – |

---

## Must fix

**M1. A wrong answer in the first-replay check causes the exact spoiler it is meant to prevent (6.6, "the
first-replay check").**
The card plays 10 s of BBC One's 20:00 `Coastline` and asks `Is it Coastline?` / `Yes` · `It's the show before` ·
`It's the show after`, and every answer stores a value. Three problems, which add up:
- **The question is hard for this user.** He has never seen `Coastline`. The first 10 s of a programme slot are very
  often the previous show's credits, a channel ident or a trailer (the guide's times are rarely exact, as 3.5 itself
  says). "The show before" means knowing what aired before it on BBC One.
- **There is no "Not sure".** Either `It's the show before` or `It's the show after` stores a ± 1 h `archiveShift` as
  the account default. A guess on a channel that was right then moves **every** game replay on the account by an
  hour: `Watch from tip-off` opens mid-game, or on the post-game desk.
- **It isn't drawn**, so neither its layout nor its wording has been checked, even though it's the first thing he sees
  the first morning after.

*Fix:*
1. Play the 10 s from the programme's start **+ 5 min**, so it's clearly inside the show. Show the programme's title,
   its guide description and its art next to the question.
2. Answers: `Yes, that's it` (stores 0) · `No, it's something else` · `Not sure` (stores nothing; the account default
   stays 0). Only `No` opens a second step, `Play 10 s from an hour earlier / later` with `Is it Coastline now?`, so
   that a ± 1 h value is stored only when he has *recognised* the show at the corrected time.
3. If no kept non-sports channel exists, skip the check (say so in 8).
4. Add a mock (`player-firstcheck`) and audit it.

---

## Should fix

**S1. The 90 s margin makes the skip button jump backwards (6.3, 6.4, N4).** The skip label now reads the chapter at
`airedAt(position) − 90 s`. At Q2 + 30 s of play, the chapter still reads Q1, so the bar offers `Skip to Q2`, and
pressing it lands 10 s *before* Q2's first play, 40 s behind where he is. The same happens at each quarter (`Skip to
Q4` flashes at the start of Q4 and jumps back). Q2 to Q4 aren't secret (their ticks are drawn ahead), so apply the
margin only where it protects something:
- **the skip button's label and target** come from the played position;
- **line 2, the chapter highlight, `Stopped in …`, and anything to do with OT or the end** keep the margin.

**S2. One sentence in 5.7 still has the old rule.** 5.7 ends: "Videos dated before the tip-off (a preview, a game
you've seen) keep their title". For a 01:00 UTC tip-off that wording exempts the ET-dated titles N2 was about. Make it
"two or more days before the game's ET date". Also say whether dates are stripped *before* `telling()` runs. If they
aren't, the news `SCORE` pattern matches `10-25` inside `2026-10-25`, and every dated title naming a team is hidden,
including the seen `Grizzlies vs Kings · full game` row that `choose-video` shows with its title.

**S3. The studio-show warning ends on the real final (S6, 4.3).** "From a hidden game's tip-off to **12 h after its
final**": the line disappearing from SportsCenter's card times the end of the game. It's a small leak, but it breaks
the rule this design now keeps everywhere else. Use tip-off + 3 h 30 + 12 h.

**S4. The live clock on a hidden game you may still start from tip-off (5.1 first row, decision 13.7).** `Live, not
started by you` keeps "the live clock, as today" on the slab. That is nba-pages' rule, but in this design the same
hero offers `From tip-off`. A fan arriving at 03:00 who wants to start from tip-off reads `OT 1:12` (or `Q4 0:04`)
first. nba-pages' own `hidden()` comment lists "no OT". At least, while a replay source exists and the game is hidden,
the slab should show `LIVE / Score hidden` without the period and clock. Tie it to decision 13.7.

**S5. An unmatched video opened from Movies (5.8, N3).** "OK opens Choose a video on that row" assumes one hidden game.
Say what happens when the title names teams of two hidden games (All games mode), or is plainly not a game (`Ja Morant:
the documentary`, dated today): open Choose a video for the most recent hidden game named, and give Choose a video a
`Play this video` row for a pick that isn't a game.

---

## Nits

- `May show results` replaces the channel name on the On now card (`home-replay`: SportsCenter loses `US: ESPN HD`).
  The channel number and the initials tile still identify it, so this is fine. But if he picks channels by name, put
  the warning on the title line's right instead.
- "Behind in a replay … until tip-off + 3 h 30": say it's the **scheduled** tip-off (01:00, as the LIVE pills), so
  nothing depends on ESPN's data.
- After tip-off + 3 h 30, 7.2 stops holding the game. In the very rare case the game is still live then, the hub card
  goes back to LIVE. Hold 7.2 until the behind state ends (the buzzer is played, a reveal, or 12 h), not only until
  + 3 h 30.
- `player-notgame`'s first line, `If the replay starts on the wrong show, move it`, now repeats the two row titles.
  It can go, which also shortens the panel.

---

## Must-fix list (short)

1. **M1** The first-replay check: play from the programme's start + 5 min with its title and description shown; add
   `Not sure` (stores nothing); store ± 1 h only after a confirmed second look; skip it when no kept non-sports
   channel exists; draw and audit the card.
