# Independent review, round 2: NBA Team and League pages v1.1

Reviewer: the same independent reviewer as round 1 (`REVIEW-independent.md`). I re-read `SPEC.md` v1.1 (the change
list and sections 2, 7, 8, 9, 11 and 12) and looked at all 30 PNGs at full size, the new and changed ones first. I
re-ran my own checks:
- Playwright on every mock: smallest text, text outside the safe area, the leader name box;
- pixel scans of the 2x PNGs: the divider under the highlighted row, the inset ring, the hold-OK menu's bottom edge;
- a look at `pages.css` and `tools/build.js` where a fix depends on them.

## Overall score: 7.8 / 10 (v1.0: 6.8)

v1.1 is a real answer, not a cosmetic one. Every round-1 must-fix was taken on, and most are fixed properly:
- `recordFor` is one rule for every record;
- an unseen game's scope is both teams;
- Reveal buttons name their game and are never the default focus;
- the player sheet and the roster are shielded;
- seen games are stored as a watermark;
- standings, leaders and team stats are pinned at tip-off.

The navigation fixes (Grizzlies chip second, OK on a leader opens his player card, one Back rule, the Down hook) and the
craft fixes (dividers, menu edge, peeks, standings hierarchy, long names) all check out in the renders.

What's left is narrower but still matters for an owner whose rule is "never leaks":
- "All games" mode's storage grows without limit, and the mode freezes;
- news headlines are never checked, and stories older than 72 h aren't covered at all;
- the player card shows "seen games" averages that ESPN doesn't provide.

## Scores by area

| Area | v1.0 | v1.1 | Why it moved |
|---|---|---|---|
| Information architecture and navigation | 7.5 | 8.5 | Grizzlies chip second (1 press), OK on a leader opens his card, one Back rule, hero fixed to your team's game. Left: a race on Down within the 250 ms switch; OK on a chip does nothing |
| Visual craft and hierarchy | 8.0 | 8.5 | Divider bug gone, peeks show only the tile's surface, a cue line instead of the lone heading, standings sizes by importance. Left: "· LATE" on nearly every tile |
| 10-foot legibility and TV safe area | 7.5 | 8.0 | W, L and PCT at 16 px; menu clamped to y 513 (measured 512 to 513); no rail text past x 912; leader names step down to 20 px |
| Tables and scrolling on a TV | 8.0 | 8.5 | The margin rule wins (row 8 is the lowest focus in the top layout), dividers fixed, sort by jersey under the shield |
| Spoiler-shield correctness | 5.0 | 7.5 | The big five are fixed. Left: All-games mode's storage and its freeze, unchecked headlines and the 72 h cap, the source of the "seen games" averages, turning the shield back on, and the pre-game broadcast |
| States | 7.0 | 8.0 | ESPN-down matches the spec, a standings cover card, playoff "if needed" games, a written round-up rule |
| Consistency with the app and brand | 7.0 | 8.0 | 22 px LIVE pill (measured about 21 to 22 px), one hero state table for Home, the hub and the team header. I accept the team-colour pushback (UI-SPEC v1.2 owner rule). Left: `Reveal it` doesn't name its game |
| Buildability with the focus engine | 7.0 | 7.5 | The Down hook matches `focus.js` (`navHook` returning `true` or `undefined`). Left: no ESPN source for seen-game averages, the exact-alarm fetch with the TV in standby is unverified, the finished-watch rule on catch-up isn't defined |
| Fit to the owner | 7.5 | 8.5 | His team is one press away, his reveal habits persist, playoffs are covered, and records are honest |

## Round-1 fixes I checked myself

| Round-1 item | Status | How I checked |
|---|---|---|
| 1. Records on pre-game surfaces | Fixed | `nba-entry-shield.png`: `Grizzlies 2-0 [eye-off]`, the Jazz still `1-2` (not in the unseen game). The team header shows `2-0`, `1 result hidden`, `Sun, at Kings` |
| 2. Opponent's surfaces | Fixed | `team-opponent-shield.png`: Kings `0-2 [eye-off]`, Sunday's tile hidden; the two tiles still showing are both L, so nothing can be worked out. `news-shield.png` covers a Kings-only preview |
| 3. Reveal focused by default | Fixed | `standings-shield` focus on West; `standings-cover` focus on `Show the East`; `news-covered` focus on `Keep it hidden` |
| 4. Player sheet, sort, leaders item, ranks | Fixed in design (see M3 for the data) | `team-shield-player.png`: MIN, REB and AST only, no leaders button; roster `sorted by jersey`; ranks `as of tip-off` |
| 5. Seen storage and copies | Fixed for My team mode; still open for All games (M1) | SPEC 8.1 and section 11 |
| 6. Covered reader, body scan | Fixed for bodies; headlines open (M2) | `news-covered.png`, `news-article-shield.png` (`1 paragraph hidden`) |
| 7. Down entry | Fixed | the hook in SPEC 2.2 against `focus.js move()`; a race remains (S3) |
| 8. Presses and Back | Fixed | chip order in every mock; `leaders-player.png`; SPEC 2.2 Back |
| 9. Brand and spec | Fixed, colours kept by owner rule | LIVE pill height in `standings-top.png` and the HTML (`a-live`, not `compact`); `state-down.png` |
| 10. Craft | Fixed | divider: below the Grizzlies row the colour goes straight from the surface-1 row fill to `bg-0` at y 322 (no `#3C3452` line). Menu bottom at 512 to 513. No text past x 912 in any rail |
| 11. Playoffs and seen | Fixed in spec | SPEC 8.4 and 8.1 |

## Remaining must-fix

### M1. All-games mode: unlimited copies, and the mode freezes

SPEC 8.1 and 11 pin "one copy per in-scope game, kept until that game is seen". In All-games mode every game is in
scope, so that is 5 to 15 events a night, each a fetch of standings, leaders (7 categories) and team stats. Since the
owner won't watch most of them, they're kept for the whole season: over 1,000 copies in the TV's IndexedDB, and
night-time alarms for every tip-off slot. Also, `upTo` only advances to the earliest unseen tip-off, so in All-games
mode it stays at the first game he didn't watch. Every record is then "partial" and every table is a weeks-old copy
until he presses `Reveal n results`.

**Fix:**
- Fetch once per tip-off *slot*, not per event (games at 00:00 share one fetch).
- Keep only the copies some table can still use: the earliest unseen game for each team.
- Write an All-games rule down. Either unseen finals older than N days (say 3) become seen on their own, with a
  one-line toast, or Standings, Leaders and Team stats show a single `Reveal n results` state instead of a stale copy.
  Say which one, and what records show.

### M2. Headlines aren't checked, and the 72 h cap reopens the leak

The body scan (SPEC 8.3) runs only in the reader. The list, the preview and the team-page news rail show the headline
and summary as they are. Rule 2 also stops 72 h after tip-off. With an unseen game older than 72 h (a long weekend away,
or the All-Star break), "Grizzlies look to extend win streak to 5" shows on the team page. `Grizzlies` is in it, but the
story is outside the window, and it has fewer than 6 teams, so rule 3 doesn't apply.

**Fix:**
- Run the same scan (score or record pattern, a result word within 8 words of either team or their players) on the
  headline and summary of every story while any game in scope is unseen. Cover the story on a hit.
- Drop the 72 h upper limit for stories tagged with *your* team. Keep 72 h for the opponent, if you want to limit
  over-covering.

### M3. The player card's "seen games" numbers have no data source

`team-shield-player.png` shows `2 SEEN GAMES · 31.7 MIN · 4.3 REB · 5.7 AST`. Those are exactly the 3-game season
averages in the unshielded roster (`team-ranks.png`: GP 3, 31.7, 4.3, 5.7). So the label is wrong, and SPEC 10 has no
endpoint for per-game numbers. Also, if the sheet did show seen-game numbers while the roster still shows season MIN,
REB and AST over GP 3, comparing the two gives the hidden game's line. For example, a starter on 18 minutes suggests a
blowout.

**Fix:** compute seen-game averages from each seen event's box score (the ESPN `summary` endpoint the game page already
loads), and add it to SPEC 10. Use the same seen-game numbers, with GP = seen games, in the roster table. Or, simpler:
show nothing but GP and the injury note under the shield, and drop MIN, REB and AST in both places.

## Should fix

1. **Watching tonight's broadcast spoils the unseen game.** `nba-entry-shield.png` and `team-shield.png` put
   `▶ Watch pre-game` as the *default focus* while Sunday's game is unseen. Tonight's pre-game show and score bug will
   say "3-0" and "going for 4 straight". The app can't hide a broadcast, but it can warn. When your team has an unseen
   final:
   - make `Remind me` (or `Watch Sunday's game` once catch-up exists) the primary;
   - or show a one-time card: `Sunday at Kings is still unseen. Tonight's broadcast may show its result.` with
     `Watch anyway` as a button you move to.

   Separately, 80 minutes before tip-off is early for "pre-game". League Pass channels often show a slate, or another
   game, that early. The v1.0 threshold of 30 minutes was safer.
2. **Turning the shield back on.** `upTo = now − 12 h` applies only "the first time it is switched on". After weeks
   with the shield off, turning it on again leaves `upTo` weeks old, or it's undefined whether it advanced while the
   shield was off. Fix: set `upTo = max(upTo, now − 12 h)` every time the shield goes from off to on.
3. **The 250 ms switch races the Down hook.** Move to Leaders and press Down within 250 ms, and
   `SECTIONS[currentSection]` is still the old section, so focus lands in the old content. Fix: in the hook, if the
   focused chip isn't the current section, switch right away and then focus the new entry. Also, "never on OK" leaves
   OK dead on a chip: let OK switch at once and move into the content.
4. **`Reveal it`** in `leaders-shield.png` breaks the new rule that Reveal buttons name their game. Use
   `Reveal Grizzlies at Kings`, or `Reveal` with the game on the line above it, as in Standings.
5. **The finished-watch rule on catch-up.** "The final period's clock reaches 0:00 in the feed" needs a mapping from the
   archive's playback position to ESPN's game clock, which isn't specified. A practical rule: the playback position
   passes the game's ESPN end time on that channel's archive, minus the stored delay. Write it into NEXT.md item 1.
6. **The exact alarm with the TV in standby.** The pinned fetch "runs without the app open" via the Reminders alarm.
   On the Philips, network in standby, and whether an alarm can fire then, are unverified. That is NEXT.md's own open
   question. Say that the cover card is the expected fallback until it's tested on the TV.

## Nits

- **"· LATE"** is on almost every Grizzlies tile, because nearly every game tips 00:00 to 03:00 in Reykjavik
  (`team-top.png`, `team-shield.png`, `team-opponent-shield.png`), so it stops meaning anything. Show it only when the
  tile's evening differs from the true day by more than the usual, or drop it and keep the time.
- **`team-shield-news.png`'s ranks** are labelled "as of tip-off" but show the current values (`119.0 a game` etc.,
  the same as `team-ranks.png`). The mock doesn't actually show a pinned copy, so I couldn't check that tile from the
  render. `leaders-shield.png` does (Jerome 36.5 over 2 games).
- **The hold-OK menu** still covers half of the `Tue` chip. That's fine for a floating menu, but anchoring it under the
  card would read better.
- **The hub card's `NBA League Pass`** text ends at x 913 (1 px past the line). This is in the existing hub card, not
  these pages.

## What is good (new in v1.1)

- **`recordFor` is the right abstraction:** one function, every surface, with an eye-off that says "partial", so a
  `2-0` never pretends to be the real record.
- **"Both teams are in scope"** closes the opponent-side leak cleanly. `team-opponent-shield.png` is convincing: the
  Kings page tells you nothing about Sunday.
- **The reveal moments are well handled:** `Keep it hidden` focused, a Reveal that names the game, and a confirm for
  more than one.
- **The watermark plus ids store** has no cap and evicts nothing. Pinning copies at the `pre` to `in` change is the
  right trigger.
- **The design fixes visibly improved the screens:** Leaders OK opens the player card with a `Grizzlies page` button,
  the Grizzlies chip is second, the cue line on the team page, and the standings size hierarchy.
- **The audit now catches** a focused Reveal, the divider line and floating boxes past the safe lines. It's tested
  against the injected regressions.

## What I couldn't verify

- the real-TV look (OLED ring bloom, plate colours, 16 px numbers from the sofa);
- the exact-alarm fetch in standby;
- ESPN's `byathlete` leaders per category;
- the body scan's false-positive rate on real stories (only two story bodies are available).

I did not run `tools/audit.js` or drive the mocks with the remote.
