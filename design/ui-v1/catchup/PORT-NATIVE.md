# Catch-up: the native player's side (the protocol)

The web side of catch-up is built (`app/tv/js/replay.js`, `catchup.js`, the replay state in `games.js`). This file is
what `PlayerActivity` / `VodControls` / `GamePanel` / `TunerPlayerPlugin` need to do for SPEC.md section 6, and the
exact messages between them and the app. Times are **ms since the epoch** for moments, **ms into the window** for
positions, unless a field says otherwise.

## 0. Turning it on

- `TunerPlayer.info()` returns `replay: true` once the native player speaks this protocol. Until then
  (`player.js replayNative()` is false) the app plays the first link of the chosen source through the existing VOD mode
  as a stand-in: no quarter marks, no hidden end, no Back to live, no first-replay check, no failure cards. It maps the
  VOD `progress` / `exit` events onto the window, so resume, Continue watching and seen-at-the-buzzer already work.
- A replay is its own session (`ctx.cur.kind === 'replay'` in `player.js`). Every event below carries `session`, like the
  live and VOD events.

## 1. Starting: `TunerPlayer.play({ mode: 'replay', replay: R, ua, sounds, scoreBug, sub, api })`

Answers `{ ok, session }` as today. `R`:

| Field | Type | What |
|---|---|---|
| `id` | string | the progress key: `rp:<gameId>` or `rp:<chId>:<programme start>` |
| `kind` | `'game'` \| `'video'` \| `'programme'` | a game from a channel's archive, a game's video from Movies, a kept programme |
| `title`, `sub` | string | the top block: `Grizzlies at Jazz`, `US: ESPN HD · Mon 26 Oct · late` |
| `hidden` | bool | the game is hidden by the spoiler shield: **`Score hidden`** in the top block, `[eye-off] End hidden` at the end of the chapter row, **no remaining time, no `Ends at`, no end mark**, and the scrub rules of 6.4. Stays as sent until the player closes, even after `seen` (6.4: nothing changes when it's marked seen) |
| `sources` | array | in order (Best first), see below; `Other sources (n)` lists them; a failure card offers the next |
| `source` | int | the index to play first |
| `startAt` | ms | where to start in the window (tip-off − 10 s, or the resume point) |
| `windowMs` | ms | the window's length (3 h 30 for a game, a programme's length + 2 min). The bar is this long, whatever the game does |
| `tipoffAt` | ms | ⏮ for a game: the tip-off's position − 10 s |
| `chapters` | `[{ key, label, at }]` | Tip-off, Q2, Halftime, Q3, Q4 with their tick positions (keys `tip q2 half q3 q4`). **Never OT**: OT ticks come only in the as-aired answers, once played (M7). A skip lands at `at − 10 s` |
| `margin` | ms | 90000: what the app's as-aired answers lag behind the picture (asAired) |
| `extensions` | int | 2: how many silent 60-min extensions the window may get (6.7) |
| `live` | `{ id, name, num }` \| null | the channel for `Back to live` (null for a video) |
| `gameId` | string | '' for a programme |
| `programme` | `{ title, start, end, next: { title, start } }` \| null | a kept programme's bar (⏮ its start, `Next programme ›`, Up next) |
| `check` | object \| null | the first-replay check (6.6), see 5. When present, run it **before** playing the game |

A source: `{ id: 'channel:1001' | 'video:5900', kind: 'channel' | 'video', name, detail, badge ('Best', 'Not confirmed', ''),
links: [{ url, engine }] (in order: `.m3u8` first, then `.ts`, then `timeshift.php`), windowStart (the true moment the
window starts; 0 for a video), windowMs, chId, channel: { name, num, logo } | null, delay (s, the channel's replayDelay) }`.

The app chooses links, the window and every clock correction (archiveShift, the panel's own start string); the player
only plays positions inside `windowMs`.

## 2. App → player commands (`command([name, json])`)

| Command | When | Payload |
|---|---|---|
| `game` | after each `position` event of a game replay (and when the panel opens) | the game panel's data in `gameData` shape **as aired** (asAired at the aired moment − 90 s): `{ id, title, away, home, replay: true, kind, hidden, score: [away, home] \| null, clock: 'Q2 6:41' \| 'Halftime' \| 'Replay', moment: 'Q2 6:41 · as aired', chapters: [{ key, label, at }] (reached, OT included once played), plays: [...] (up to the moment), box: { away, home } (empty rows until the buzzer + 2 min has played), boxReady }`. For a video: `score: null`, `clock: 'Replay'`, no plays. **During a replay the player shows nothing about that game except this** (score bug, game panel, banner) |
| `replay-links` | after `not-the-game`, `check-answer`, `sync` | `{ source, links, windowStart, tipoffAt, chapters, keepPosition? }`: swap that source's links. Without `keepPosition`, restart at `tipoffAt` |
| `replay-extend` | answer to `need: extend` | `{ source, windowMs, links }` (the same start, a longer window: swap the link and keep the position) or `{ ended: true, seen, gameId }`: show `Replay ended` (6.7) with `Box score` · `Watch again` (or `Reveal <game>` when `seen` is false) |
| `clocks` | answer to `need: clocks` in a replay | as today, plus `replay: true` and `played`; the list is the clocks around the aired moment on screen |
| `show-text` | | as today |

## 3. Player → app events

| `type` | Fields | When / what the app does |
|---|---|---|
| `position` | `played` (ms into the window, the **played** position, never the thumb), `duration` (ms, a video's real length), `source` | every ~2 s while playing and once after each seek lands. The app stores progress (`rp:…`), works out your chapter for Home (`You stopped in Q3`) with the 90 s margin, marks the game **seen** when the played position passes the buzzer + 2 min (or 98 % of a video), and answers with `game` |
| `exit` | `played`, `error?`, `then?` (`'choose-video'` \| `'game-page'`: the button picked on "every source failed") | the player closed. The app saves where you stopped and, with `then`, opens Choose a video or the game page |
| `pick-source` | `source` | `Other sources` or a failure card's next source was picked: remembered for the game (the sources sheet's pick) |
| `source-failed` | `source`, `code` (HTTP status), `reason` (`http-403`, `http-404`, `timeout`, `decoder`) | the player shows the card of 6.7 (`This replay didn't start` with the next source as its row; `The last few minutes aren't in the replay yet` for a 404 within minutes of now; `The video didn't start`; `… didn't start from any source`). The app only logs it |
| `conn-limit` | `source` | a 403 / "max connections": the player shows `player-connlimit` (`Your provider allows N stream(s)` from the account check's `max_connections`, else `Your provider's stream limit is reached`) and retries by itself 3 times |
| `not-the-game` | `source`, `hours` (+1: `Showing what was on before the game?` → later; −1: `Started mid-game, or after it?` → earlier) | the app stores the channel's archiveShift ± 1 h and answers `replay-links` |
| `need` | `what: 'extend'`, `source`, `count` (extensions so far), `played` | the window ended before the buzzer: answered with `replay-extend` |
| `need` | `what: 'clocks'`, `played` | Sync score in a replay: answered with `clocks` |
| `sync` | `played` (where the picture showed the picked clock), `at` (that play's ESPN wallclock) | the app stores the channel's replayDelay (never archiveShift) and answers `replay-links` with `keepPosition` (the chapter positions move) |
| `check-answer` | `shift`: `0` (Yes), `-1` (Yes on the earlier try), `1` (Yes on the later try), `null` (Not sure, Back, a second No) | the app stores the account default and answers `replay-links`; then the player plays the game |
| `golive` | `chId` | `Back to live` (after the player's own `Going live may show the score` card when `hidden`): the app closes the replay and tunes the channel live (a new live session) |
| `seen` | | optional: the player may say the buzzer has played; the app decides on its own from `position` anyway |

## 4. What only the player can do (SPEC 6)

1. **The timeline bar** (6.2, `player-tipoff`, `player-replay`, `player-scrub`, `player-programme`, `player-video-replay`):
   the window as the bar, the chapter ticks from `chapters`, the not-yet-aired part (from the live point to the window's
   end) dashed, the live dot and LIVE pill for a game still live, the chapter row with the current chapter in chalk,
   `cu-pos` top right (`40 min behind live` / `Score hidden` / `Ends at` only for a programme; line 2 **your** position
   from the last `game` answer's `clock`, never live's; first time `Seen at the final buzzer (the scores show then)`).
2. **Buttons per kind** (6.3): game replay `⏯ ⏮ −1m +1m Skip to <next>` · `Back to live` (always) `Game` CC Audio
   Picture; video `⏯ ⏮ −1m +1m` · `Game` CC Audio Picture; programme `⏯ ⏮ −1m +1m Next programme ›`. The skip label and
   target come from the **played** position; none from Q4 on.
3. **Keys** (6.1): the timeline map (◀▶ 10 s with acceleration, OK pause, ▲ buttons, ▼ Options, Back hides then
   leaves); the first ◀/▶ with the bar hidden shows it and seeks; reaching the live point restores the live map and drops
   repeats and ▶ for 800 ms.
4. **Scrubbing** (6.4, M7): the bubble names the chapter and the time since tip-off, **never past Q4** (`Q4 · 2:31:00` for
   anything after the Q4 start); a scrub moves only the thumb; on a video a scrub may run to the bar's end and on release
   past the real end jumps to the last 5 s.
5. **Seeking** (6.5): taps coalesce (one request 600 ms after the last press), local seeks inside the buffer, `.m3u8`
   first, a `.ts` link starts from the minute, the old stream released before the new one.
6. **Options** (6.6): `Game panel` · `Other sources (n)` · `Not the game?` (`player-notgame`) · `Sync score` · Subtitles ·
   Audio · Picture size. Live on a kept channel adds `Watch from tip-off` and `Rewind and pause`: `Watch from tip-off`
   (and the live game panel's `⏮ From tip-off` foot button) sends a live-session event `{ type: 'tipoff' }` (or an `exit`
   with `then: 'tipoff'`); the app starts the replay (a new replay session replaces the live one).
7. **The game panel in a replay** (6.9, `player-replay-panel`): from the `game` answers only: the plate `Q2 6:41 · as aired`,
   tabs `Quarters · Plays · Sync`, Quarters with their aired times (OK jumps there), no box score until `boxReady`.
8. **The cards** (6.7): `Going live may show the score` (Stay focused), `This replay didn't start`, `player-connlimit`,
   not ready yet, the video failed, every source failed, Up next, `Replay ended`.
9. **The first-replay check** (6.6, `player-firstcheck`, `player-firstcheck-2`): `R.check` =
   `{ chId, channel, logo, title, desc, line ('BBC One HD · Mon 26 Oct · 20:00 to 21:00'), playMs: 10000,
   tries: { 0: links, '-1': links, 1: links } }` (each try's links start at the programme's start + 5 min). Play
   `tries[0]` for 10 s and ask `Is this <title>?` (`Yes, that's it` · `No, it's something else` · `Not sure`); `No` plays
   `tries['-1']` and asks `Is it <title> now?` (`Yes, that's it` · `Try an hour later` · `Not sure`); `Try an hour later`
   plays `tries[1]`. Send `check-answer` with the shift recognised, or `null`. Then play the game.
10. **Pause and rewind live TV** (6.8) is live-mode work: a kept live channel's rewind past the buffer can ask the app for
    a programme replay (the app's `playProgramme(ch, programme)`); not wired yet, see 6.

## 5. Already decided on the app side

- Which source is Best (3.4) and the setting `Account > NBA > Replays play` (Channel replay first / Full-game video first
  / Ask each time: the app opens the sources sheet itself before playing).
- The clock: the table's raw `start` string moved by whole hours of archiveShift (case 1), else ESPN's tip-off − 15 min
  in the panel's zone + archiveShift (case 2). Positions: `wallclock − windowStart + replayDelay`.
- Seen: only at the replay's buzzer + 2 min of **played** time (or 98 % of a video), never from a scrub; a replay never
  reveals for the session, and opening one deletes the game's session reveal.
- The buzzer's moment is never sent to the player (it would tell how long the game ran); `replay-extend { ended }` and
  the `game` answers' `boxReady` carry what the player needs.

## 6. Not wired yet (needs both sides)

- Live rewind of a kept channel turning into a programme replay (6.8): the player needs a `need: 'rewind'` event with the
  moment, the app answers with a `programme` replay; the app side is `playProgramme()`.
