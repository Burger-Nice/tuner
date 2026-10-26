# UX check: final TV milestone

Reviewer: UX (author of `UX-BRIEF.md` and `UX-CHECK-m1.md`). Date: 26 Oct 2026.
Checked: `UI-SPEC.md` (final), `png/overview-final.png`, `png/ia.png`, the per-screen `png/tv-*.png`, `png/player-*.png` and `png/launch-*.png`, and `tv/*.html` / `kit/*.js` where a mock left a behaviour unclear. These are static mocks, so latency (AC-L) can't be judged.

**Verdict:** this is ready to build once two spoiler leaks are fixed. 17 of the 19 M1 items are fixed, 2 are partly fixed, and none are left open. The new screens follow the brief closely, and several are better than it. What remains:
- **2 must-fix**: both are spoiler leaks inside the player.
- **14 should-fix**: mostly collisions, OK-key conflicts and three press counts over target.
- **13 nits**.

---

## 1. The M1 items, re-verified

| M1 item | Status | Evidence / what's left |
|---|---|---|
| M1 Spoiler shield and score delay | **Partial** | Shielded states exist for the Home hero (`tv-home-shield`), NBA hub (`tv-nba-shield`), game page (`tv-nba-game-shield`), guide description (`tv-live-shield`) and Live games panel, and the "Synced · 42 s" line is everywhere. Two leaks remain in the player: MF1 and MF2. |
| M2 Player OK has no modes | **Fixed** | `player-banner` hint bar and `ia.png`: OK = Channels always, ◀ Options, ▶ Game, hold OK = Last. |
| M3 Route to your team's game from another channel | **Fixed** | `player-chip` (8 s, OK to switch), `player-livegames` on ▶ with your team first, pinned team row in `player-channels`. |
| M4 Popular sort | **Fixed** | `tv-movies` "Sort Popular"; spec 5.5 lists Popular as the default. |
| M5 One card per title, versions | **Fixed** | "+3" badges; the version pill and sheet in `tv-detail-movie-versions`. |
| M6 Back to the bar in 1 | **Fixed** | `ia.png` Focus and Back; spec section 6. |
| M7 Choose channel | **Fixed** | `tv-home-choose` + `tv-home-choose-sheet` (EPG first, remembered per team). |
| M8 Group chip without the Menu key | **Fixed** | Spec 5.3: Up from the first row; `tv-live-groups`. |
| S1 Search left of Home | **Fixed** | Top bar on every screen. |
| S2 Hold-OK menu | **Fixed** | Menu with Save first (spec 3.2); the guide keeps a toggle (departure 5, judged in section 4; see SF12). |
| S3 Chips are views over Sort/Filter | **Fixed** | Spec 5.5; 8 chips. |
| S4 Filter facets, counts, Back | **Fixed** | `tv-movies-filters`: Quality, Subtitles, live counts, Horror 0 disabled, "3 active", Clear all. |
| S5 Hero priority, pre-game | **Fixed** | `tv-home-pre` (Watch pre-game), `tv-home-resume`. |
| S6 Home entry focus | **Fixed** | Spec 5.2 and `ia.png`. |
| S7 Position cue and jump in a 50k grid | **Partial** | The bubble, Jump and context line exist, but the bubble covers a poster and the Popular jump is wrong (SF4, SF5). |
| S8 Zap ring named | **Fixed** | "This is also the zap ring in the player"; the banner shows "Favourites · 3 of 10". The direction setting (AC-B4) isn't mocked (SF14). |
| S9 14 px for information | **Fixed** | Caption token is 14; `tools/audit.js` finds nothing below 14 except badges. |
| S10 Saved jobs | **Fixed** | `tv-saved`: reorder with a grip, "This order is used by…", History. |
| S11 Detail resume and subtitles | **Fixed** | `tv-detail-movie-resume`: Resume 1:12:40 + Start over, "Subtitles: English" pill. New collision: SF2. |

---

## 2. Press counts, recounted (D-pad only)

| Flow (from) | Brief target | Final design | Status |
|---|---|---|---|
| Cold launch on a game day → Grizzlies | 1 | **1** (Watch live focused); 2 via Choose channel | pass |
| Cold launch before tip-off → pre-game | 1 | 1 (Watch pre-game) | pass |
| Any tab's content (incl. deep in a grid) → Grizzlies | 3 | **3** (Back, Back, OK) | pass |
| Detail page → Grizzlies | 4 | 4 (Back to card, Back, Back, OK) | pass |
| **Watching another channel → Grizzlies** | 1–2 | **1** with the action chip; **2** with ▶ then OK; 3 via OK, Up to the pinned row, OK | pass |
| Launch → resume (no game) | 1 | 1 (hero Resume) | pass |
| **Launch on a game day → resume** | 2 | **3** (Down to On now, Down to Continue, OK) | **fail** (SF11; my brief's 2 contradicted its own row order) |
| Zap ±1 / last channel | 1 / hold | 1 / hold | pass |
| Switch the zap group in the player | – | 4 (OK, ◀ Groups, move, OK) | fine |
| Score in the player, open + close | 1 + 1 | 1 + 1 (▶, Back) | pass, but leaks under the shield (MF1) |
| **Sync score** | 3 | **6** (◀, ▼ ▼ ▼ to Sync, OK, OK) | **fail** (SF13) |
| Subtitles, live | 3 | 3 (◀ Options with Subtitles first, OK, OK); +1 for each row moved | pass |
| Subtitles, VOD | 3 | 3 (▼, OK, OK); detail pill before playing; CC key 2 | pass |
| Find a known movie by voice (from Home content) | ≤ 10 | **7** (Back, ◀ Search, OK, ▲ mic, OK, speak, ▶ to Play on the top result, OK) | pass |
| Find a known movie by typing "har" | ≤ 25 | about 19 (3 to the keyboard + H 3 + A 3 + R 8 + ▶ to the top result's Play 1 + OK) | pass |
| Browse Movies → play | ~8 | about 8 (Back, ▶ × 3, ▼ chips, ▼ grid, OK detail, OK) | pass |
| Save a title / favourite a channel | 2 / 1 | 2 (hold OK, OK) / 1 (hold OK in the guide) | pass |
| Reveal a shielded score on Home | 2 | 2 (▶ Reveal score, OK) | pass |
| Install an update at launch | 2 | 1 (Update now) + 1 if Android asks | pass |
| **Phone sign-in, TV presses** | 4 | **5** (Use your phone 1, then on Three quick choices ▼ ▼ ▼ to Done + OK) | **fail** (SF10) |
| Any screen → bar | 1 | 1 | pass |
| Home content → exit | 2 | 2 | pass |

---

## 3. Issues, ranked

### Must-fix

**MF1. The shielded game panel in the player shows the box score.**
*Screen:* `player-game-shield.png`. The plate says "Score hidden", but the table directly below lists every player's points (14, 24, 12, 10, 8, 9, 0), so the team total, and with it the score, can be added up. The hint bar says "OK Reveal" while the panel footer says "OK or Back closes": two meanings for OK on one screen.
*Why:* AC-B1. It's the one place the owner looks during his team's game.
*Fix:* follow the brief (4.11): **for the game on the channel being watched, opening the game panel is the reveal**. The panel always shows score, box and plays at the synced delay, with no hidden state, and the footer and hint bar both say "Back closes". The hidden state stays only for shielded games **not** on this channel (Live games panel, already correct). If the owner wants a stricter mode later, the hidden state must hide PTS, the whole table and Plays, not just the plate.

**MF2. "Sync score" lists baskets the viewer hasn't seen yet, with their scores.**
*Screen:* `player-sync.png`. The newest row is "MEM 77–70 · Marshall 3-pt jump shot · Q3 7:29". If the stream is 42 s behind, the rows newer than the basket just seen are by definition still in the viewer's future. The list spoils exactly when the owner is trying to fix spoilers. (The current app builds the list the same way: plays before the key press in real time.)
*Why:* AC-B1/B2. It is used every game.
*Fix:*
- Order the list **oldest at the bottom, newest at the top**, but **open with focus on the play that matches the stored delay** for this channel (the most likely "just seen" basket).
- Collapse the rows newer than that into one row: **"Newer baskets hidden · ▲ to show"**.
- Show **no score column** on any row; the description and game clock are enough to recognise a basket, and the broadcast shows its own score.
- After OK, show only "Synced · 38 s behind live".

### Should-fix

**SF1. The game page with the shield on has two primaries and a collision.**
*Screen:* `tv-nba-game-shield.png`. The header shows "Watch live" and the card below shows "Reveal score", both pink-gradient primaries; the header's second "Reveal score" pill runs into the 12° slab and its orchid line ("score" sits on the stripe).
*Fix:* one primary (Watch live). Drop the header's Reveal pill (the card already has it) or make it secondary and end it at least 16 px left of the slab line. The card's Reveal becomes secondary with focus (one-primary rule).

**SF2. The pill row collides with the section title on the movie detail page.**
*Screen:* `tv-detail-movie-resume.png`. The "English · 4K HDR" / "Subtitles: English" pills overlap the "More like this" heading (the heading's cap height sits inside the pills). This is the owner's "cards colliding with panels" complaint.
*Fix:* reserve the second action row in the layout: actions block = 44 + 12 + 40, then 24 px, then the row title. If height runs out, clamp the plot to 2 lines on detail pages that have the second row.

**SF3. The hero's sync line runs under the slab.**
*Screen:* `tv-home.png`. "Synced · 42 s behind live" runs into the slab's orchid line ("live" crosses it).
*Fix:* cap the leaders column at the slab line minus 16 px, and wrap or shorten to "Synced · 42 s" (the game page already uses the short form).

**SF4. The scroll bubble covers a poster and reports the wrong key and count.**
*Screen:* `tv-movies-scrolled.png`. The bubble sits on top of the sixth column's art and caption. For Popular it shows "7.4", which is a rating, not the sort key. "Row 120 of 8,300" doesn't match 4,812 titles (802 rows of 6).
*Fix:*
- Put the bubble in the context-line band at the top right (y 27–47, right-aligned to 912), where no card lives, as "Popular · #720 of 4,812".
- Its key per sort: rank for Popular, rating for Top rated, year for Newest, date for Recently added, letter for Title.
- Count in titles, not rows.

**SF5. Popular's Jump goes by year, but Popular isn't sorted by year.**
*Screen:* `tv-movies-jump.png`, "Popular is grouped by year".
*Why:* jumping to "2023" in a popularity list either lands nowhere meaningful or silently re-sorts. (My m1 example listed years "for Popular and Newest"; that was wrong.)
*Fix:* Popular = **Top of list · Top 100 · 101–500 · 501–1,000 · The rest**. Years only for Newest; letters for Title; rating bands for Top rated; months for Recently added.

**SF6. The action chip and the hint bar give OK two meanings.**
*Screen:* `player-chip.png`. The chip says "OK to switch" while the hint bar below still says "OK Channels".
*Fix:* while the chip is visible, the hint bar's OK label reads **"Switch"** (or the hint bar hides). It reverts when the chip times out. The same rule applies to Up next in VOD.

**SF7. VOD controls: Left/Right and OK are ambiguous while the bar is up.**
*Screens:* `player-vod.png`, `player-vod-upnext.png`. Focus rests on the Play button inside a row with −10, +10, CC, audio and picture, but the hint says "◀ ▶ Seek 10 s". With Media3's default controller, Left/Right would move between buttons. In Up next, the chip says "OK play now" while Play has focus.
*Fix:*
- While the controls are up, focus rests **on the seek bar's thumb**: ◀ ▶ seek (hold scrubs), OK = play/pause, ▲ = the button row (−10, +10, CC, audio, picture), ▼ = Options.
- Up next becomes a **focused button** in the bar when the controls are visible; it binds OK only when they are hidden.

**SF8. The offline state throws away the cached Home.**
*Screen:* `tv-state-offline.png`. The full card replaces Home while saying "Your saved items and last guide are still here".
*Why:* cache-first is a core principle (brief 6.6). A blank error page during a provider blip is the "slowness and freezes" feeling.
*Fix:* when a cache exists, show cached Home and a slim notice under the bar: "Offline · showing what airglow remembers · Try again" (focusable only via Up from row 1, never taking focus). The full card is only for the no-cache case.

**SF9. The verifying screen focuses Cancel.**
*Screen:* `tv-first-verifying.png`. One habitual OK press (the owner just pressed OK to sign in) cancels the whole sign-in.
*Fix:* no focused destructive control on a progress screen. Show "Back cancels" as text; the one-ring rule gets an explicit exception for progress screens (like the HUD overlays in spec 3.2).

**SF10. First-run choices: Done is three presses away.**
*Screen:* `tv-first-choices.png`. Entry focus is Memphis; Done is ▼ ▼ ▼ OK away, and "Back skips" is ambiguous (does it keep the shown defaults?).
*Fix:* entry focus on **Done** (the defaults are preselected and visible), with Up to change a choice. Copy: "Back keeps these". The phone path becomes 2 TV presses.

**SF11. On a game day, resume costs 3 presses.**
*Screen:* `tv-home.png` (hero, On now, Continue watching).
*Fix:* when the hero is the game, put **Continue watching above On now**. The game is already the hero and On now repeats live content. Resume becomes Down, OK = 2. Keep On now first when the hero is Resume or a channel.

**SF12. The guide's undo toast binds OK for 4 s, where OK means "tune".**
*Spec:* 3.2, "Added to Favourites · OK to undo, 4 s, never takes focus". The next OK in the guide would undo instead of tuning, or the opposite: a hidden mode.
*Fix:* the toast reads **"Added to Favourites · Hold OK again to undo"**; the toast never binds OK.

**SF13. Sync score is 6 presses.**
*Screen:* `player-options.png` (Sync is the 4th row).
*Fix:* when the channel has a linked game, put **Sync score first** in Options (Subtitles second), and add a "Sync" chip at the end of the game panel's tabs (▶ ▶ ▶ ▶ OK from the panel). Target 3: ◀, OK, OK.

**SF14. The zap direction setting isn't designed.**
*Spec:* Up = next is defined, but the Playback group isn't mocked, so AC-B4 "one setting inverts it" can't be checked. The direction is contested (brief 2.4).
*Fix:* mock Account → Playback with "Up arrow in the player: Next channel / Previous channel", next to stream format, user agent, default picture size, subtitle and audio language, and frame-rate matching.

### Nits

- **N1.** `tv-first-welcome`: "Use your phone" carries a **microphone** icon, which reads as voice. Use a phone or QR glyph.
- **N2.** `tv-search-empty`: the placeholder wraps to two lines with label tracking. Use "Search everything", 16 px, no tracking.
- **N3.** `tv-live`: the time ruler stops at 22:00 while cells run to 23:xx. Label 22:30 and 23:00 too.
- **N4.** `tv-live`: the 6th row runs past y 513. Fine as a peek; make sure a focused row always scrolls fully inside the safe area.
- **N5.** Inconsistent counters across player mocks ("3 of 10" in the panel, "4 of 10" in the zap banner while the same channel is current).
- **N6.** `player-livegames`: "NBA Leag" is cut without an ellipsis, and "Nuggets at Thunder · In 49 min" sits under "Live games". Use an ellipsis and the heading "Live and next".
- **N7.** `player-options`: "Score on picture" uses the eye-off glyph that means *spoiler shield* everywhere else. Use a scoreboard glyph.
- **N8.** `tv-first-type`: the on-screen "Back" button is redundant on Android TV (brief S2). Drop it or keep it secondary.
- **N9.** Account (two panes): Back isn't stated. Back from either pane → scroll to the top and focus the avatar in the bar (the tab rule).
- **N10.** `tv-account-updates`: the row has a ring *and* an inner gradient button. Make the row itself the button (one target, one primary).
- **N11.** The 352 px channel panel covers part of the centre half. That's fine for an overlay the user opened; amend spec 7's rule to "nothing *passive* covers the centre half". (My brief had the same contradiction.)
- **N12.** `player-sync`: scores wrap ("MEM 77– / 70"). Moot once MF2 removes the score column.
- **N13.** `tv-search`: the top result repeats in the Movies row, and "Tidewater" matches "harb". Exclude the top result from the row and require word-prefix matches.

---

## 4. The departures (spec section 12)

| # | Departure | Verdict |
|---|---|---|
| 1 | Home = hero + On now + Continue; Movies = one grid with chips, no shelves page | **Agree.** I adopted both in m1. Add the game-day row order from SF11. |
| 2 | Saved stays a tab and owns channel reordering | **Agree.** `tv-saved` gives it a job nothing else has, and the side card explains what the order drives. |
| 3 | Account in two panes | **Agree, better than my brief.** It avoids a 25-row scroll, and Left/Right is free on that page. Add N9's Back rule. |
| 4 | Tab dwell 250 ms, from cache only, else OK | **Agree.** |
| 5 | Guide keeps a one-gesture favourite toggle with an undo toast | **Agree with the gesture, not the undo.** It's the frequent action in its one home, but the undo must not bind OK (SF12). |
| 6 | Caption 14 px instead of 13 | **Agree.** It closes my AC-T2. |
| 7 | Lockup on bg-0 for first run and update | **No UX impact.** A brand matter, and consistent with the brand brief. |

---

## 5. The new screens against the brief

- **First run and sign-in:** **good.**
  - The phone path is right: QR code, LAN address and a 4-digit code; "Nothing leaves your home network" is reassuring; the type path is one link field that fills the rest; there's a phone QR on the type screen too.
  - Fix the Cancel focus (SF9) and the Done placement (SF10). Icon: N1.
- **Search:** **meets the brief.** 6 × 6 alphabetical keyboard with the mic first, results beside it after each letter, Top result with a direct Play (better than my brief: it skips the detail page), On TV and Recent. Typing "har" takes about 19 presses; voice takes 7. N2, N13.
- **Saved and reordering:** **good.**
  - The lift / move / drop / Back-restores model is clear and the side card explains the effect.
  - The focused row in reorder mode should show ▲▼ only while lifted (it already does) and a "Moving" label for 3 m legibility (optional).
- **Account:** **good.**
  - NBA has the team, the shield with its scope sentence, Score on picture, and the delay per channel; Provider shows expiry, days left and connections.
  - Updates is calm, with a dot and no takeover. Playback isn't mocked (SF14).
- **Update prompt:** **never steals focus**, by spec and by mock. It appears only as a launch card before Home, Later asks again in 24 h, and it never shows in the player or a game window. The current app's P1 is solved.
- **States:** loading is flat skeletons with focus kept on the tab (correct); expired, empty filters and no-art are all fine. Offline: SF8.
- **NBA game page:** **good.**
  - Upright 8-row box score at 14 px, plays with chalk scoring rows, team-stat bars, tabs on ◀▶, and a compact Sharp header with Watch live. It answers the brand's "Sharp on dense tables" risk.
  - Shield state: SF1.
- **Native player:**
  - Key map without modes (fixed).
  - Banner with now/next and the ring name (fixes audit P6).
  - Channel panel with the pinned team row, logos, now titles and progress; groups that "set the zap ring". This fixes P5 and P7.
  - Game panel at 264 dp with tabs; Live games panel; Options with values; subtitles and audio "remembered by language"; picture size per channel.
  - Reconnect and failed handled inside the player (fixes P22).
  - Zap card instead of black.
  - Remaining issues: MF1, MF2, SF6, SF7, SF13.
- **Launch:** **good.**
  - 1100 ms, transform and opacity only; the native splash matches frame 0 (no jump); warm resume skips it entirely; reduced motion is a static wedge then a fade.
  - The loading hold is bounded (caption at 4 s, offline card at 12 s), and the wipe never extends past 280 ms once Home is ready.
  - My only note: make sure a cold start with cached data reaches an interactive Home within 2 s (AC-L3). Data that's ready at 820 ms should not wait for the full 1100 ms before input is accepted, so accept key presses as soon as the wipe starts.
