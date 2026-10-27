# Catch-up v1.0: independent review

Reviewer: independent senior TV UI/UX. Scope: `design/ui-v1/catchup/` (SPEC.md, the 29 mocks, `png/`, the contact
sheet, `catchup.css`, `tools/`), judged against CLAUDE.md, UI-SPEC v1.2, nba-pages SPEC v1.1 (section 8), brand v5.4,
and the code it has to land in (`live.js`, `cards.js`, `game.js`, `games.js`, `core.js` `catchup()`, `nba.js`,
`PlayerActivity.java`, `VodControls.java`).

How I checked: read the spec end to end; looked at every 2x render and the contact sheet; re-measured boxes in the
HTML with Playwright (numbers below); ran `node tools/audit.js` (29 pages, 0 findings); traced the seen / reveal /
delay / feed code in `games.js` and the native player's load control and seek path.

---

## Scores

| Dimension | Score | In one line |
|---|---|---|
| Remote ergonomics (presses, focus, Back) | **7.0** | One OK the morning after, the movie bar you already know, a clean Back rule. But there is no key for the game panel during a replay, and the key map changes under your thumb |
| Spoiler-shield correctness | **5.0** | The bar itself is handled well (fixed window, no end, no OT ahead, no Q4 skip). Around it there are real leaks: the session reveal, the live buzzer, "Live is in Q2", Back to live disappearing, the raw titles in Choose a video, playing from Movies, and a wrong clock offset landing you on the post-game show |
| Clarity for a casual user | **7.5** | The words are good (`Watch from tip-off`, `40 min behind live`, `Not kept by your provider`). A few lines are jargon (`3 links tried`, `Kept`), and the same game gets two different dates |
| Visual quality and consistency | **7.5** | On brand and calm: the neutral badge, red kept for LIVE, the REPLAY slab, the history glyph. But two mocks are visibly broken (the `game-noreplay` buttons sit outside their card; the `Sync` chip is clipped), and the audit passes both |
| Feasibility (code + Media3) | **5.5** | Most of it maps onto the code. Rewinding a channel that isn't kept doesn't work the way 6.8 says, seeking a `.ts` timeshift is unplanned, and the data path for "as aired" isn't in the port list |
| States and edge cases | **6.5** | The no-archive, videos-only, M3U, offline and failure cases are thought through. Missing: wrong clock offset, archive not ready yet, connection limits while seeking, every source failed, and the window ending before the buzzer |
| **Overall** | **6.3 / 10** | A strong idea and IA. The spoiler model leaks at its edges, and two mechanisms the player relies on are not feasible as written |

---

## What is good (keep it)

- **The IA decision** (section 1): no Catch-up tab. "A replay lives where the thing lives", and the morning-after hero
  (`home-replay`) gets the owner to his game with one OK. That is the right call for a one-team viewer.
- **The bar under the shield** (`player-replay`): a fixed 3 h 30 window, `End hidden`, no remaining time, OT only once
  you reach it, and **no skip button from Q4 on, shield or not**, so the button disappearing never tells you anything.
  This is careful work.
- **The entry focus is never a Reveal**, and the spec found and fixes the real bug in `game.js` (`entry()` focuses
  `[data-act="reveal"]` first, line 115). It's verified in the code.
- **Choosing a source is airglow's problem, not yours**: hold OK and the sources sheet are there for power use, and the
  failure card is one press from the next source.
- **Hidden cards drop their records** (5.3). That's a good trade: the plate already says the game is hidden.
- **The neutral `Replay` badge** (red stays LIVE only), the history glyph under the channel number so no width is
  taken from names, and the outlined `Not kept` cell that keeps ▲▼ at the time you were at.

---

## Must fix

### Spoiler shield

**M1. Stopping a replay early reveals the game for the session (SPEC 6.4, nba-pages 8.1, `games.js`).**
SPEC 6.4 says "Stopping before it keeps it hidden (*seen for the session only, as today*)", and nba-pages 8.1 says the
same. In the code, "for the session" means `revealed.add(id)`, and from then on `isSeen()` is true. Today
`setWatching(gameId, chId)` does exactly that ("watching the game is choosing to see it"). So if he stops the replay
at Q3 and presses Back, Home's hero falls through to the seen-final row of 5.1 (`Final · W 123–112`), the hub card
shows the final, and the records update. That contradicts `home-replay-resume`, which shows `Score hidden` and
`Resume`.
*Fix:* say in 6.4 and section 7, overriding nba-pages 8.1 for replays, that **a replay never reveals, not even for the
session**. Only the buzzer (M6 margin) or a Reveal does. In the port list (10.4), add a `replaying` state separate from
`watch`/`setWatching`, and say the replay must not call `setWatching` or `revealed.add`.

**M2. The live final buzzer marks the game seen while you're behind live (`games.js` `tipOffs()` → `buzzer()`), and
the player's feeds show the final.**
`buzzer(g)` runs `markSeen` when the scoreboard flips to `post` and `watch.gameId === g.id`. If he started
`From tip-off` on a live game and that state stays set, the game is marked seen the moment it ends *live*, even though
he is still in Q3. On top of that, `show(g)` → `delayed(g)` returns the scoreboard as it is for any game that isn't
`in`, which for a finished game is the final. That is what feeds the native meta today: the score bug, the game panel
and Live games.
*Fix:* (a) while a replay is behind live, `buzzer()` must not mark the game seen; seen comes only from the replay's
own buzzer. (b) Add an `asAired(g, wallclock)` function that builds the score, clock, plays and quarters from the
summary's plays up to a wallclock time, and route **every** player-side feed (score bug, game panel, Live games,
banner) through it during a replay. Name both in port checklist items 4 and 9. Today the checklist only says "the
chapter list from plays".

**M3. Watching behind live gives the live state away, both inside the player and outside it.**
- `player-tipoff` top right, line 2: **`Live is in Q2`**. The same line will read `Live is in OT`, then whatever comes
  after the game ends. Show the replay position instead (`You're in Q1`), or nothing. `player-halftime` already uses
  the position (`Halftime`), so the two mocks disagree about what this line means.
- SPEC 6.3: `Back to live` appears "**while the game is live**". The button disappearing tells him the game has
  ended, and with `40 min behind live` beside it he can work out whether there was overtime. It also contradicts 6.7,
  where the card is opened *by* `Back to live` after the game has ended. Keep the button for the whole window.
- Leaving the player: the hero in `home-live-tipoff` shows the **live** clock on the slab (`Q2 5:18`), and the top bar
  shows `NBA ● LIVE`. Back from a replay that is 40 min behind, he sees `Q4 0:41`, or `OT 3:12`, or the LIVE pill gone
  (the game has ended). The same goes for the hub card, the player's Live games list, and the channel's on-now title in
  On now and the guide (`NBA Postgame`).
  *Fix:* add a 5.1 row "**Live, you're behind in a replay**": `▶ Resume` (primary) · `Back to live` (confirm card,
  S1) · `Game page`. The slab shows *your* position (`Q1 8:20 / You stopped here`). While that replay is unfinished and
  the game is hidden: no live clock on that game's hero, card or Live-games row; the top-bar LIVE pill stays until
  tip-off + 3 h 30 (so its going away tells nothing); and the channel's on-now cell shows the game's own title, not the
  post-game show's.

**M4. Choose a video shows raw provider titles exactly where they're most dangerous (`choose-video`, SPEC 5.7).**
You reach Choose a video from `game-noreplay`, that is, **when the matcher found nothing**. Yet the mock shows three
matched `Grizzlies at Jazz` rows with `Best match`, which is the case where you'd never need this screen. In the real
case the list holds unmatched videos with their own titles. Those are the ones whose date format or wording beat 3.3
("Memphis Grizzlies vs Utah Jazz | Full Game Replay | Oct 26, 2026 | 118-112", "Grizzlies @ Jazz 2OT thriller"), and
5.7 masks only `\d{2,3}[-–]\d{2,3}`, and only "in All games".
*Fix:* under the shield, any title that names either team of a hidden game, or one of their players, and is undated
or dated on or after its tip-off is passed through the news rule that already exists (`telling()` plus `SCORE` plus
`OT|2OT|overtime|W |L ` in `games.js`), whatever the scope. If it still tells, show `Video naming the Grizzlies ·
added Tue 27 Oct 08:14 · 1080p` with the title hidden. Redraw the mock with the realistic case: unmatched rows, one
masked.

**M5. Playing a matched video from Movies goes around the shield (SPEC 5.8).**
5.8 covers the card (name, art, hidden description). It doesn't cover:
- the **detail page** (`detail.js` lines 86 and 137 print `d.duration` and the rating, line 123 the plot, and the
  backdrop and *More like this* show the provider's posters and titles of other NBA replays, including other copies of
  this game);
- **pressing Play there**: that opens the movie bar (`VodControls`), with `remaining` (`-1:52:00`, line 211) and
  `Ends at`. The total length of a full-game video tells you about overtime;
- **Continue watching** for a video started from Movies, which is keyed by the movie, so the card says `1h 04m left`.
  It isn't keyed by `rp:<gameId>`.
*Fix:* a matched video of a hidden game opens airglow's game card instead of the detail page (or a detail page with
no duration, rating, plot, backdrop or More-like-this rail). Play uses the `video` timeline (fixed 3 h 30 scale,
`End hidden`), and its progress is stored under `rp:<gameId>`. Also, a held ▶ scrub must not stop visibly at the
video's real end, because where it stops gives the length away: let the bubble run to the window end and jump to the
end on release.

**M6. A wrong clock offset lands "Watch from tip-off" on the post-game show (SPEC 3.5, 4.6, 12.4).**
The worst failure here is a whole-hour time-zone error in the panel (`acc.tz`, or `epgShift` applied to a time that
came from ESPN). The timeshift then starts one to three hours late, on the second half or the post-game desk with the
final on screen. 12.4 says "shows at once (the picture isn't the programme)", but showing at once *is* the spoiler.
The reverse error, an archive that starts early, puts the as-aired panel and score bug *ahead* of the picture, and
fires the buzzer, `markSeen` and the box score before the real end. Also, `catchup()` subtracts `epgShift` (the
*guide's* offset) from ESPN's true wallclock. That is only right if the archive shares the guide's wrong clock, which
is unknown.
*Fix:*
1. **Anchor on the panel's own programme.** When the full table has the game's programme, request the timeshift with
   that programme's own `start` string (panel clock, no conversion). Compute the offset from ESPN (first-play wallclock
   − guide start) and use it only inside the window. Keep a separate per-account `archiveShift`, learnt from the
   first replay that lines up (M8's check, or a Sync that agrees), instead of reusing `epgShift`.
2. **Safety margins:** `asAired` shows data up to the position − 90 s (Sync can tighten it). The buzzer, `markSeen`
   and the box-score tab come at buzzer + 2 min. Nothing visible in the player changes at the moment of `markSeen`
   (`Score hidden` stays until the window ends or you leave).
3. **A state for "this isn't the game"**: Options during a replay gets `Not the game?` → `Starts an hour early` / `an
   hour late` / `Other sources`. It's stored per account. Add the row to section 8.
4. **The window ends before the buzzer** (delay, late tip, a shift error): fetch the next 60 min without a word instead
   of showing `Replay ended` in Q4 (6.7).

**M7. Scrubbing can say OT or the end before the picture does (SPEC 6.2, 7).**
The bubble shows "the chapter". Hold ▶ ×32 from Q4 and the thumb passes into OT and then the post-game time *while
the key is held*. A plain implementation prints `OT · 2:31:00`, or switches the chapter row's highlight, before
anything has played. 6.4 also says "Passing it marks the game seen" without saying whether a seek counts.
*Fix:* define "reached" as **played position**, not the thumb. During a scrub the bubble never names a chapter later
than Q4 (`Q4 · 2:31:00` for everything past the Q4 start), no new tick appears, and nothing changes on the bar until
the picture plays there. Only playback across the buzzer (with M6's margin) marks the game seen.

### Ergonomics

**M8. You can't open the game panel during a replay (SPEC 6.1, 6.6, `player-replay-panel`).**
The timeline map gives ◀▶ to ±10 s, ▲ to the buttons and ▼ to Options. Yet 6.6 and the contact-sheet caption of
`player-replay-panel` say "**▶** in a replay: the game as it stood". In the timeline map ▶ seeks.
*Fix:* add a `Game` button (scoreboard glyph) to the right group of the bar, before CC (`Skip`, then `Game`), and a
`Game panel` row in Options. With the bar hidden, the first ▶ only shows the bar, as movies do today. Update the hint
bar and the caption. While you're at it, swallow key repeats and ignore ▶ for about 800 ms after the map switches back
to live (6.1). Otherwise, when a held ▶ or a run of presses reaches the live point, the very next ▶ opens the live
panel.

### Feasibility

**M9. Rewinding a channel that isn't kept doesn't work as written (SPEC 6.8, `player-paused-local`).**
`setBackBuffer(ms, true)` keeps already-played media in memory, but it doesn't make a live stream seekable. A live
progressive `.ts` (Xtream's `mpegts` engine) has an unseekable seek map, and Media3 turns any seek on such a source
into a seek to 0, which means reconnecting at live. HLS live (the app's default, `liveSources()`) can only seek inside
the playlist window, typically 30 to 60 s on Xtream panels, whatever the back buffer holds. So "airglow holds the last
2 min" (and the toast) is not a memory question (12.7). With today's player it can't be done.
*Fix:* either (a) pause-only on channels that aren't kept (`Paused · after about 30 s it resumes live`). For HLS,
allow ◀ inside `getSeekableRange()` and show the real span. Or (b) plan a local ring cache (a `CacheDataSource` over a
bounded disk cache, sized and measured on the TV), say what it costs, and make it a separate milestone. Redraw
`player-paused-local` for whichever you choose.

**M10. Seeking inside a `.ts` timeshift needs a design, not a footnote (SPEC 12.2, 12.10, 6.9).**
The `.ts` link comes first in `catchup()`, and it's often progressive with no length. Each ◀▶ press then means asking
for a new link (minute-granular `panelStamp`, so you also skip inside it). Five taps make five connections. On a
one-connection account the old socket often holds the slot for a few seconds, and the panel answers 403 or "max
connections". The whole timeline (10 s steps, ±1 m, quarter skips, ×32 scrub) depends on this.
*Fix:* say in 6.2: taps coalesce (one request 600 ms after the last press). A scrub moves the thumb and bubble only and
asks once on release. Small back-seeks inside the buffer stay local. Prefer the `.m3u8` link for replays when it
answers (it's usually a VOD playlist, so it seeks). On a connection-limit error, wait and retry with the existing
reconnect UI and its own line (S3).

### Visual

**M11. Two mocks are visibly broken, and the audit passes both.**
- `game-noreplay`: `.cu-state{width:680px}` loses to `.state.big{width:560px}` (`ui.css` 327, a more specific
  selector). The card is **560 wide (x 200 to 760)**, and its three buttons run **161 to 794**: `Look again` sticks out
  39 px on the left and `Reveal Grizzlies at Jazz` 34 px on the right, with the focus ring outside the card. SPEC 2.2
  and section 11 say 680. *Fix:* `.state.big.cu-state{width:680px}`, and add an audit check for a child box poking out
  of its container.
- `player-panel-live`: the `Sync` chip runs **839 to 919** in a panel that ends at **912**, so its right border is cut
  off and it crosses the safe line. The three-letter tabs didn't fix it (SPEC 6.6 says they did). *Fix:* tab padding
  12 → 10 and a gap of 6, or shorten `Plays` to an icon, or put `Sync` in the footer next to `From tip-off`.

### Correctness

**M12. "Your team's remembered channel" plays without checking it carried the game (SPEC 3.2, step 3).**
`teamChannel` is a channel the owner once picked for his team, often a rotating `NBA League Pass N`. Taken "if kept"
without looking at its guide at tip-off, `Watch from tip-off` (one OK, the hero) can open the wrong game, with
Grizzlies quarter marks drawn over it, or a studio show recapping the night. It matters even more on M3U, which has no
guide, so steps 2 and 3 are all there is.
*Fix:* step 3 counts only when the table at tip-off matches the game, or at least doesn't name another game. Without a
table (M3U), it ranks below a matched video, and the sources sheet says `Not confirmed`. Also, `lastSeen` (step 2) is
an in-memory `Map`, gone after the TV restarts overnight. Persist it with the seen ids.

---

## Should fix

**S1. The "game has ended live" card tells by appearing (`player-golive`, 6.7).** When the game is still live (in OT),
`Back to live` goes straight through; when it has ended, a card appears. Either way he learns something. Under the
shield, whenever you're behind live in a hidden game from the Q4 start on, show one neutral card: `Going live may show
the score` / `Stay in the replay` · `Go live`.

**S2. The expiry dates are wrong and disagree.** Tip-off Tue 27 01:00 with 3 days kept gives about **Fri 30 Oct
00:45** by 3.2's own rule (`tip-off − 15 min ≥ now − archive days`), but `home-replay` says `Kept until Thu 29 Oct`
and `game-replay-shield` says `kept until Thu 01:00`. They seem to count from the night-rule date (Mon 26 + 3). The
seen Kings game (`game-replay-seen`) says `Kept until Wed` and should be Thu. Use one formatter. A time like 00:45
reads better with the night rule (`until Thu 29 Oct · late`). The team header's caption (`Mon 26 Oct · late / Replay
on NBA League Pass 4`) also differs from Home's for the same row of the "one hero state table".

**S3. The failure states need splitting (`player-replay-failed`, section 8).** One card covers "the archive didn't
answer" today. Add: **connection limit** (`Your provider allows 1 stream. Close it on other devices, or wait a few
seconds` + `Try again`); **archive not ready yet**, for rewind or `From tip-off` close to now, since panels write their
archive in chunks (`The replay of the last few minutes isn't ready yet`; add it to 12); **every source failed**
(`Choose a video`, `Game page`, `Back`); and **the video failed** too. Drop `(3 links tried)`: it's jargon for this
user (`NBA League Pass 4's replay didn't start`).

**S4. Guide text the morning after.** Only a *matched game's* title is score-masked (section 7). Post-game shows,
highlight shows and re-airs that name one team ("Grizzlies Postgame: Morant's 40 lifts Memphis") aren't matched, so
they show raw in the guide, the Now panel and the Up next card. Run `telling()` over the titles and descriptions of
programmes on sports channels from tip-off to +72 h. In `live-archive` the on-now `NBA Gametime` description ("the
night's top plays") is fine as text, but tuning it will spoil him. Add a quiet eye-off line in the Now panel for NBA
studio shows while an unseen game is in scope (`May show last night's results`). Note also that `live-archive`,
`live-past` and `live-past-gone` are the morning after but aren't marked `shield`, so the SPOILER check never runs on
them (see S9).

**S5. The sources sheet breaks its own rule.** `Condensed game · about 20 min` contradicts "no duration in the sources
sheet's rows" (section 7). `no ads` on the Memphis feed is something airglow can't know; drop both.

**S6. The score mask matches dates.** `\d{2,3}[-–]\d{2,3}` (5.7, section 7) matches `026-10` in `2026-10-25`, so
"NBA 2026-10-25 Grizzlies vs Kings" becomes "NBA 2· ·-25". Use the news `SCORE` with word boundaries, drop
`yyyy-mm-dd` and `dd-mm` first, and limit both sides to 2 or 3 digits between 60 and 199.

**S7. The delay means something different in the archive (3.5, 6.4).** `delayFor(ch)` is measured live, so it
includes the client's live latency (HLS edge plus buffer), and the archive doesn't have that. Reusing it errs on the
safe side for the panel, but quarter skips land 10 to 30 s late and miss the jump ball. Keep a per-channel
`replayDelay` that starts at `delayFor − 20 s`. Make `Sync` in a replay pass the replay's wallclock as `seenAt` to
`recentClocks()` (today it uses now).

**S8. The behind-live hero row needs its owner decision.** When a hidden game is live and he hasn't watched it, the
hero leads with `Watch live`. A fan who arrives in Q2 under the shield usually wants `From tip-off`. Add it to
section 13 as an option ("hidden live game: primary is From tip-off").

**S9. The audit can't see this design's risks.** It passed M11's overflow and clipped chip, and it doesn't check the
three morning-after guide mocks. Add `shield` to every morning-after mock, a "child outside its container" check, and
a SPOILER rule for `Live is in`.

**S10. Hold ◀ through three days of guide.** On a kept row, ◀ walks back one programme at a time and reaches the
channel column only at the archive edge (4.1). So ◀ means different things on neighbouring rows. That's acceptable,
because the column does what the cell does. But say in 4.4 that ▲ from the top row still reaches the group chip at any
time (today's `hook()` does this), and consider CH− / CH+ with ◀ held for "a day back / forward".

**S11. One game, two dates.** The guide's Now panel for the game says `Tue 27 Oct · 01:00 to 03:30`
(`live-past-game`); everything else says `Mon 26 Oct · late`. Calendar dates are right for a time axis, but for a
matched game add the game's own label to line 2 (`… · Mon 26 Oct · late game`) so the owner sees it's the same game.

**S12. A re-air's slot length is a hint.** `NBA: Grizzlies at Jazz (replay) 11:00 to 13:30` is scheduled *after* the
result is known, and providers do size re-air slots to the real length. Under the shield, draw a matched re-air's cell
to its scheduled start plus 2 h 30, or hide its end time.

---

## Nits

- `player-halftime`: the scenario says halftime is at 02:08 live, but the bar has the Q3 tick behind the live point and
  the panel says Q3 aired at 02:22. Pick one set of times.
- `home-replay-resume`: the Continue-watching card cuts the date to `Stopped in Q3 · Mon 26...`; drop the date
  (the hero already says it) or use `Mon 26 Oct · late` on its own line.
- `player-panel-live`: `Back closes` sits tight against the focused `From tip-off` ring; give it 12 px more or move it
  under the button.
- `player-paused-local`: the hint bar has no `▼ Options` (the other timeline mocks have it).
- `nba-card-menu-replay`: the beside-the-card menu covers the whole Wizards card and the hero's `Game page`. It works,
  but say in 5.4 that the covered card isn't focusable while the menu is open (it isn't: a sheet pushes a layer), so
  nobody "fixes" it.
- `Kept 3 days` / `Not kept by your provider`: "kept" reads as storage jargon. `Replays for 3 days` / `No replays on
  this channel` is plainer for a casual user. That's an owner call; the current words are consistent at least.
- `Seen at the final buzzer` (top right in `player-replay`) is fine, but on first use add `(the scores show then)`
  once.
- SPEC 3.3 says `NBA.matchGame` "scores 10 or more", but it returns the game, not a score (`nba.js` 121–143). Add a
  `matchScore()`, or say so in the port list.
- `game-replay-seen`'s `Watch again` lifts from its right edge, which is right for a right-hand button. Mention it in
  2.3's ring list.

---

## Must-fix list (short)

1. A replay never reveals, not even for the session (overrides nba-pages 8.1); no `setWatching` / `revealed.add`.
2. No `markSeen` from the live buzzer while you're behind; a new `asAired()` feeds every player surface during a replay.
3. Nothing gives away the live state while you're behind: drop `Live is in Q2`; keep `Back to live`; add a
   "behind in a replay" hero row; no live clock, LIVE-pill change or post-game title for that game.
4. Choose a video: mask any title naming a hidden game's team (the news `telling()` rule, any scope); redraw the mock
   with unmatched rows.
5. Movies path: no duration, plot or rail on the detail page; play in the hidden `video` timeline; progress under
   `rp:<gameId>`; a scrub doesn't stop at the video's real end.
6. Clock offsets: anchor on the panel's own programme start, a separate `archiveShift`, a 90 s / 2 min safety margin
   on as-aired data and seen, a `Not the game?` option, and auto-extend if the buzzer isn't reached.
7. A scrub never names OT or the end; "reached" means played.
8. A key for the game panel during a replay (a `Game` button and an Options row); swallow ▶ after the map switches.
9. Rewind on a channel that isn't kept: pause-only or a planned ring cache, not `setBackBuffer`.
10. A seek model for `.ts` timeshifts: coalesce taps, ask once after a scrub, prefer `.m3u8`, handle the connection
    limit.
11. Fix the `game-noreplay` card (560 wide, buttons outside) and the clipped `Sync` chip in `player-panel-live`.
12. `teamChannel` counts only when its guide at tip-off matches the game; persist `lastSeen`.
