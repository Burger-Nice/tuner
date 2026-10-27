# Catch-up v1.1: independent review (second round)

Reviewer: the same independent senior TV UI/UX reviewer as for v1.0 (`REVIEW-independent.md`, 6.3 / 10). Scope:
`SPEC.md` v1.1 (its "v1.1 changes" list), the 33 mocks, `png/` and the contact sheet, `catchup.css` and `tools/`,
checked against the same references and code as before.

How I checked:
- Read the v1.1 spec end to end and compared each answer with what the spec body and the mocks actually say.
- Looked at every new or redrawn render: `home-behind`, `player-notgame`, `player-replay-options`, `player-connlimit`,
  `choose-video`, `player-golive`, `player-paused-local`, `player-tipoff`, `player-replay`, `game-noreplay`,
  `player-panel-live`, `live-archive` and `live-past-game`.
- Re-measured the boxes with Playwright:
  - `game-noreplay`: the card is now x 140 to 820 and its buttons run 161 to 794.
  - `player-panel-live`: the tabs end at 893 in a panel that ends at 912; `Back closes` sits at y 400 to 418, under the
    button.
  - The timeline bar's two button groups don't touch in any of the five bars (the widest left group, with
    `Skip halftime`, ends at 437; the right group starts at 562).
- Ran `node tools/audit.js`: 33 pages, 0 findings. `--inject-v10` reports both v1.0 CONTAIN bugs and `Live is in Q2`
  on 5 mocks, so the new checks work.
- Re-read `games.js` (`setWatching`, `revealed`, `refreshToday`, `sortGames`, `recentClocks`) for how the v1.1 rules
  meet the code.

---

## Scores

| Dimension | v1.0 | **v1.1** | In one line |
|---|---|---|---|
| Remote ergonomics | 7.0 | **8.0** | The `Game` button, `Game panel` first in Options (2 presses), the 800 ms ▶ guard and the coalesced seeks make the timeline safe to use with a thumb |
| Spoiler-shield correctness | 5.0 | **7.0** | Most of the v1.0 leaks are really closed in the spec and the mocks. What's left is narrower but still real: watching live and then going back to tip-off, late-game dates in the video rule, unmatched videos outside Choose a video, chapter state without the margin, and the hero and the ESPN day flipping on the real final |
| Clarity for a casual user | 7.5 | **8.0** | The failure copy is plain now (`Your provider allows 1 stream`, `Going live may show the score`). The `Not the game?` rows describe the result instead of the symptom |
| Visual quality and consistency | 7.5 | **8.5** | Both bugs are fixed and the audit guards them. The four new mocks are consistent with the kit; `home-behind` is clear |
| Feasibility | 5.5 | **7.0** | An honest live-rewind scope, a real seek model, the connection-limit handling. New gaps: the stored `archiveShift` isn't applied in the main case, and Sync can't learn a 10-minute error |
| States and edge cases | 6.5 | **8.0** | Every failure I asked for now has a card. Wrong offsets are handled once seen, but the first wrong replay still spoils |
| **Overall** | 6.3 | **7.4 / 10** | A thorough revision. Six must-fix items remain; each is a short rule in the spec, not a redesign |

---

## v1.0 points: verified

| v1.0 | Status | Where I checked |
|---|---|---|
| M1 session reveal | **Fixed** for a replay started cold. **Not** for a game you watched live first: see N1 | 6.10, 7 |
| M2 live buzzer / feeds | **Fixed** (`buzzer()` only at the live point; `asAired` for every feed, port 10.9) | 6.4, 6.10 |
| M3 live state while behind | **Mostly fixed**: line 2 is `You're in Q1` (`player-tipoff`), `Back to live` always shows, `home-behind` is drawn and the LIVE pills and on-now title are held. Two clocks still run on the real final: see N5 | 5.1, 7.2, `home-behind` |
| M4 Choose a video | **Fixed in Choose a video** (`choose-video` redrawn: two `Name hidden` rows), but the date rule misfires for late games (N2) and the rule stops at that one screen (N3) | 5.7 |
| M5 the Movies path | **Fixed** for matched videos (the game page instead of detail, the `video` timeline, `rp:<gameId>`) | 5.8 |
| M6 clock offset | **Partly fixed**: the raw programme `start` anchor, the margins, `Not the game?` and silent extensions are good. The stored correction is ignored in case 1 (N6), and the first wrong replay still spoils (S1) | 3.5, 6.6, `player-notgame` |
| M7 scrub | **Fixed** for the bubble. But chapter state from *played* position has no margin (N4) | 6.2, 6.4 |
| M8 game panel key | **Fixed**: the `Game` button in every game bar, `Game panel` first in replay Options | `player-replay`, `player-replay-options` |
| M9 live rewind | **Fixed** honestly: the HLS window only, `.ts` pause only, the ring cache costed in 12.7 | 6.8, `player-paused-local` |
| M10 seek model | **Fixed** | 6.5, `player-connlimit` |
| M11 visual bugs | **Fixed**, and the audit now catches both | measured above |
| M12 team channel | **Fixed**; `nbaWatchedOn` persisted | 3.2 |
| S1 to S12, nits | **Fixed or reasonably declined** (S10's chord argument is right). S12 opened a small new leak (S3 below) | – |

---

## Must fix

**N1. Watching live, then going back to tip-off, keeps the session reveal (6.10, 7.2; `games.js` `setWatching`).**
The flow the design itself draws: `home-live-tipoff` → `Watch live` → ▶ panel → `⏮ From tip-off` (`player-panel-live`),
or `Watch live` → ◀ Options → `Watch from tip-off` (`player-options-live`). Watching live called `setWatching`, which
did `revealed.add(gameId)`, so the game is revealed for the session. v1.1 clears `watch` when the replay opens, but
never clears `revealed`. 7.2 applies only "while `behindReplay(g)` and `g` is **hidden**". So when he leaves the
replay in Q1 and goes Home, the hero, the hub card and Live games show the **live** score and clock (Q4, OT, or
`Final`), since to the code the game is revealed.
*Fix:* opening a replay of a game deletes its session reveal (`revealed.delete(gameId)`). 7.2 keys on
`behindReplay(g)` for a game in scope, whatever the session reveal. Say it in 6.10 and port 10.4, and add the flow to
the shield script (10.11).

**N2. "Dated from its tip-off on" uses the wrong date for the owner's games (5.7, M4).**
Every Grizzlies game the owner watches tips off after midnight UTC (here Tue 27 Oct 01:00), while providers date
videos by the US date ("Grizzlies vs Jazz **2026-10-26** 118-112"). By the rule as written, that title is dated
*before* the tip-off, so it "keeps its title", score included. This is the commonest form of the exact leak M4
closed.
*Fix:* compare dates with the game's **US Eastern date**, and treat any date from that ET date − 1 day on as "from
the tip-off on". Only dates two or more days before it keep their title. Use the same rule in 3.3's matcher and the
audit.

**N3. The M4 rule stops at Choose a video (5.7, 5.8).**
5.8 protects only *matched* videos. The unmatched ones (the very titles 5.7 hides) still appear raw in **Movies**
(the category grid, Recently added), **Search** (he types `Grizzlies`), **Saved** and their posters. Any of them can
read "Memphis Grizzlies vs Utah Jazz 118-112 Full Game".
*Fix:* run the M4 title rule (with N2's dates) wherever a movie title or poster is drawn while a game is hidden. A
hidden name gets `Video naming the Grizzlies and the Jazz`, no poster, and no detail page (OK opens Choose a video, or
plays it in the hidden `video` timeline).

**N4. Chapter state has no safety margin (6.2, 6.4).**
`asAired` runs 90 s behind the picture, but everything chapter-based doesn't:
- line 2 (`You're in OT`), the OT tick and label;
- the chapter row's highlight;
- the Quarters panel's OT row;
- the skip button's label;
- Continue watching's `Stopped in …`.

All of these switch when the *played position* passes `wallclock − window start + replayDelay`. If the archive's
picture runs later than that mapping (a low `replayDelay`, an archive that starts a little early), `You're in OT` and
the OT tick appear while Q4 still runs on screen. With a tie and 20 s left, that is the result.
*Fix:* derive every chapter-based display from the same `airedAt(position) − 90 s` as `asAired`. A chapter may show
up to 90 s late, never early.

**N5. Two clocks still run on the real final while you're behind (5.1, 7.2; `games.js` `refreshToday`).**
- **Home's hero priority** (5.1) still says "your team from 3 h before tip-off to **30 min after the final**".
  `home-behind`'s row then hands over to the "Final, hidden, you stopped partway" row (LIVE gone) at the real final
  + 30 min. If he looks at Home now and then, he can time the end and tell regulation from overtime.
- **The ESPN day:** `refreshToday()` switches "today" to the local day "once last night's games are all final".
  `Tonight's games` and the hub's Today then drop the Grizzlies card the moment the last game of the night ends: the
  Grizzlies at Jazz is usually that last game.

*Fix:* for a game with `behindReplay`, both switch on the clock (tip-off + 3 h 30, the same rule as the LIVE pills),
never on the scoreboard. Say what the behind row becomes then: the "stopped partway" row (`Resume` · `From tip-off` ·
`Game page`), without `Back to live`, since nothing of that game is live any more. The 12 h limit in 5.1 then only
ends the row's priority.

**N6. `Not the game?` stores a correction the main case never applies (3.5, 6.6).**
3.5 case 1 (the game matched in the table, the normal case on Xtream) builds the link from the panel's raw `start`
"with no zone conversion and no `epgShift`", and only case 2 adds `archiveShift`. `Not the game?` stores
`archiveShift ± 1 h`. So the correction fixes the current replay, but the next replay of a case-1 game lands on the
same wrong show again.
*Fix:* apply `archiveShift` in case 1 too, by moving the raw panel-time string by whole hours. Or keep the correction
per channel and apply it in both cases. Say it in 3.5 and 9.

---

## Should fix

**S1. The first wrong replay still spoils (6.6, 12.4).** `Not the game?` fixes things only after he has seen the
post-game desk. 12.1's `Try a replay` exists but nothing makes him use it. Before the first game replay on an account
under the shield, offer it once: `Check that replays line up: plays 10 s of BBC One's 20:00 Coastline. Is it
Coastline?` (Yes stores `archiveShift` 0, No offers ±1 h). That's one OK, once, and it removes the worst case.

**S2. Sync can't measure a 10-minute error (3.5 item 2, 6.4).** `recentClocks()` drops clocks more than 8 minutes
before `seenAt`, so "a replay Sync that disagrees with the guess by more than 10 min updates `archiveShift`" can never
fire. Drop the claim, or give the replay Sync a wider list.

**S3. A re-air's next cell tells its length (S12, 4.2).** The matched re-air is drawn to start + 2 h 30, but the next
programme's cell and its start label (`NBA Today 13:15`) still show where the re-air really ends. If the next cell
starts inside the drawn span, clip it to the span's end and show `·` instead of its start time, in the cell and in
its Now panel.

**S4. The score pattern misses common separators (S6).** `118:112` (European providers), `118 — 112` and
`118 to 112` pass. Add `:`, `—` and ` to `. A trailing `(OT)` is already covered by the OT words.

**S5. From a Movies video to the game page, which source plays? (5.8)** He chose the Memphis-feed video in Movies.
OK opens the game page, whose `Watch from tip-off` plays the ranking's best, maybe the channel replay. Opening the
page from a video card should set `replayPick` to that video, and the caption should say so (`Full game · Memphis
feed`).

**S6. "An NBA studio show" isn't defined (4.3).** Say how it is detected, and widen it. The morning after,
SportsCenter, First Take, NBA Today and Sky Sports News carry the same risk as NBA Gametime (`live-archive` has three
of them on screen without the line). For example: any programme on a sports channel within 12 h of a hidden game's
final whose title matches `sportscenter|first take|nba today|gametime|inside the nba|the jump|highlights|sports news`.
Show the line in the On now rail too.

**S7. `Not the game?` copy (`player-notgame`).** The sub-lines read as what the button *does* ("It shows what was on
before the game"). Lead with the symptom, which is what he can see: `Showing what was on before the game?` → `Move 1
hour later`; `Started mid-game or after it?` → `Move 1 hour earlier`.

**S8. Feasibility notes.**
- `player.getSeekableRange()` isn't a Media3 API. Use the live `Timeline.Window` (`getDuration()` and
  `getCurrentLiveOffset()` on the window) in 6.8 and M9.
- ".ts: ask from the minute, then seek the seconds locally" (6.5) can't work on an unseekable progressive stream.
  Start from the minute instead (up to 59 s early, the safe side) and say so.

**S9. `Back to live` on the Home hero (`home-behind`).** 6.7's card is a native player card. Say what the web hero
shows: the same copy in a `confirmMenu`, with `Stay in the replay` focused.

---

## Nits

- `Game` in the bar is an unlabelled glyph, the same one as `Open the game`. When it's focused, the hint bar should
  name it (`OK Game panel`), as the skip button's does.
- `player-connlimit`: "allows 1 stream" should come from `max_connections`. When that's unknown, use `Your provider's
  stream limit is reached`.
- S2's text puts the Jazz expiry at "Fri 00:45" (tip-off − 15), but 3.5 now starts the window at the programme's
  start (01:00). Both read `Thu 29 Oct · late`; just make the two consistent.
- 6.7 `Replay ended` is defined only for "without reaching the buzzer". Say that the same card shows at the window's
  end once the buzzer has played.
- In All games mode, `sortGames()` ranks other teams' games by their real state, so a hidden game you're behind in can
  change place in the hub when it ends live. Rank `behindReplay` games as live.

---

## Must-fix list (short)

1. **N1** Opening a replay clears the game's session reveal; 7.2 keys on `behindReplay` whatever the reveal (the
   live → From tip-off flow).
2. **N2** The video title rule dates against the game's US Eastern date (from ET date − 1 day on); late tip-offs
   otherwise keep scored titles.
3. **N3** Apply the M4 title rule to unmatched videos in Movies, Search, Saved and posters, not only in Choose a video.
4. **N4** Every chapter-based display (line 2, OT tick and row, chapter highlight, skip label, `Stopped in`) uses
   `airedAt(position) − 90 s`.
5. **N5** While behind: the hero's hand-over and the ESPN day flip follow tip-off + 3 h 30, not the real final; say
   what the behind row becomes after that.
6. **N6** Apply the stored `archiveShift` in case 1 (the raw programme start) too.
