# Independent review 2: playback diagnosis v1.1

Same reviewer, same method as `REVIEW-independent.md`. I read the v1.1 spec (its answer list first), all 25 mocks and
PNGs, and `diagnosis.css` / `tools/build.js`. I checked engineering's new facts in the code: `PlayerActivity.java`
(load control, timeouts, reconnect, `lagMs` / `stallAt` / `sendLag`), `games.js` (`delayed()`, `finalAt`, `setLag`)
and `player.js` (the `lag` and `sync` events).

What I verified:
- `tools/audit.js` on a copy of the folder: **25 pages, 0 findings**. `--inject-v11` fires (142 findings).
- The engineering facts in the code: 2 s to start / 6 s after a stall, a 12 s live read timeout, reconnects after
  2/4/8/16 s, the `lag` event, and the Final held by delay + lag.
- A 6x render of the "!" badge (finding N-M1 below).

What I couldn't verify: anything on the Philips or on the owner's provider (as in spec 12), and how fast Android's own
re-validation runs on this TV.

## Scores

| Dimension | v1.0 | **v1.1** |
|---|---|---|
| Correctness of the diagnosis | 5.5 | **7.0** |
| Remote ergonomics | 7.0 | **8.0** |
| Clarity for a casual owner | 7.5 | **8.0** |
| Visual quality and consistency | 8.0 | **8.0** |
| Feasibility | 5.5 | **6.5** |
| States and edge cases | 6.0 | **6.5** |
| **Overall** | 6.3 | **7.2** |

A solid revision. Every v1.0 point has a real answer. The table is now built on the player as it actually is (`.ts`,
6 s refill, 12 s timeout). "Provider" now means the stream's own server. C3h ("Your connection at home is too slow")
says honestly what the TV can't split. Hold OK stays Last channel. The Final is held, in the code too.

What still holds it back: four table rows that now misfire in new and common ways (a 403 after any zap, a failed internet
check read as a sign-in page, a real outage that can't reach its own card, an ordinary 404 page blamed on the ISP).
The lag rule's spec doesn't match the code, which leaves two spoiler paths. The VOD load-ahead design opens a second
stream on the provider. And the "!" badge renders without its dot.

---

## Did v1.0's must-fixes get fixed?

| v1.0 | Verdict | Note |
|---|---|---|
| M1 provider probe on the wrong server | **Fixed** | final host from the `TransferListener`; the panel only for account facts. One contradiction left (S-N3) |
| M2 weak-Wi-Fi timeout blamed on provider | **Fixed** | C4 needs the stream host's own check to fail and the Wi-Fi not weak |
| M3 1 bar beats a fast test | **Fixed** | three readings must agree; a fast test clears the Wi-Fi. A rule inconsistency between C3 and C3h is left (S-N1) |
| M4 `DECODING_FAILED` blamed on the TV | **Fixed** | C8 / C8b split, one retry for init |
| M5 own stale stream | **Fixed as asked, but the new rule is too broad** | see N-M2: every zap closes a stream |
| M6 no default row, probe holes | **Partly** | C11 and 204-only are in; "anything but 204" now catches outages (N-M3); C1b's gate makes it unreachable (N-M4) |
| M7 lag measure, the Final | **Final: fixed** (code checked: `finalAt` hold in `delayed()`). **Lag: not as specified** | the code counts only BUFFERING time, not wall clock − progress; two spoiler paths (N-M5, N-M6) |
| M8 actions for `.ts` | **Fixed** | the live order is feed → copy → try again; the stream-type switch is dropped; the open question is kept |
| M9 card on routine blips | **Fixed** | the "recovering" test against the real 6 s refill; puck refill ring. One noise risk (S-N4) |
| M10 load ahead too small | **Partly** | the copy and maths are right; `CacheWriter` opens a second connection (N-M7) |

Should-fixes S1–S20: all addressed. S16 is fixed in intent but broken in the render (N-M1). S9 is done except the
link-speed timing (S-N2). S6's push-back on `fail-decoder` (bytes arrived through every link) is fair: I accept it.
The Report push-back is fair too: today's `showFailed()` has no Report row.

---

## Must fix

**N-M1. The "!" badge has no dot, so it reads as "|".** In `build.js` the dot is
`<circle … fill="currentColor">`. The badge's `color` comes from `.bad>.dg-c{color:var(--a-ink)}`, so the dot is drawn
ink on the ink badge and disappears. At 6x (`stall-limit`, the Provider node) the badge shows a chalk bar in a ringed
dark disc: a power symbol, a clock hand, or "i". It never reads as "!". That undoes the S16 fix in every problem mock
(`stall-wifi-weak`, `stall-home-slow`, `stall-limit`, `acct-check-wifi`, …). The audit's BADGE check only looks for
presence, so it passes.
- Fix: give the dot `fill: var(--a-text-1)` explicitly.
- Make the mark bigger: a 3 dp bar and a 3 dp dot in the 16 dp badge, or a 20 dp badge.
- On native, draw the dot in `T1` in `PathView`, not with the inherited colour.
- Make BADGE check the pixels (some chalk pixels in the dot's area).

**N-M2. C7 "It still counts this TV's last one" fires on any 401/403 after a zap.** The rule is "within 60 s of this
TV closing a stream". Every zap closes a stream, so a channel outside his package (C7c), or an expired account (C7b,
which sits *below* C7), gets "Your provider allows 1 stream" whenever he has zapped in the last minute, which is nearly
always. Fix:
- Move C7b above C7.
- C7 also needs evidence of a limit: the account check showing `active_cons ≥ max_connections`, or a 458/509, or a body
  naming connections.
- A bare 401/403 with free slots goes to C7c.
- Title the card with the real max ("allows 2 streams" when `max_connections` is 2); "allows 1 stream" is currently
  fixed text.

**N-M3. "The internet check gets anything but 204" turns a dead line into a sign-in page.** 10.3: "204 only (anything
else: captive portal)". C1c is near the top of the table. A timeout or connection failure is "anything but 204", so the
most common real fault (the router's line is down) reads `Your Wi-Fi wants you to sign in`. Fix:
- C1c only on an **HTTP answer** other than 204 (a 200 with a body, or a 3xx), or on `CAPTIVE_PORTAL`.
- No answer at all is a failed check and goes to C1b / C11.
- Say this in both 4.1 and 10.3.

**N-M4. A real outage can't reach C1b, and C2 can catch it first.**
- C1b needs `VALIDATED` to drop **within 3 s** of `reportNetworkConnectivity(false)`. Android's re-check runs its own
  probes, which usually take longer than 3 s, and it is rate-limited for apps (I couldn't verify on the Philips). So the
  answer to "is it my internet?" usually ends up as the vaguer C11.
- C2 sits above C1b. In an outage the speed test has "no route", and S20 says Wi-Fi is then "judged on bars and link
  alone". So with 2 bars, an outage reads `Your Wi-Fi is weak … getting 4`.

Fix:
- Put C1b above C2.
- Its gate is: both internet hosts fail, the stream host fails, and the gateway answers (router OK, so it's the line)
  or doesn't (it's the Wi-Fi). Use `VALIDATED` dropping as a later confirmation, not a gate.
- In S20, "no route to the test host" while the 204 checks also fail is an outage, not "test unavailable".

**N-M5. Pausing live isn't counted as lag: a spoiler.** The spec (8.2) says lag = wall-clock time − playback progress.
The code (`stallAt` / `lagMs`) adds only BUFFERING time. Two live cases put the picture behind without a stall:
- the Play/Pause key, since `togglePlay()` works in live;
- `onStop` → pause, with `onStart` resuming in place when back within 10 s.

The picture then runs behind by the pause, and the score doesn't. Fix: implement the spec's measure (wall-clock time
since the reference READY minus the position advanced), or add paused time explicitly. Either way the code must cover
pause, and the spec must stop calling the current code "engineering's measure" when they differ.

**N-M6. "Sync stores measured − lag" goes the unsafe way when lag is overcounted.** Lag is counted as the whole stall
time (the "assume the worst" rule, and what the code does). That's right for showing scores. But when the restreamer
dropped data during the stall, the real lag is smaller. A Sync taken then stores a delay that is *too short*, and after
the next reconnect (lag 0) the score runs ahead of the picture by the overcount. `player.js` does exactly this
(`setDelay(chId, sec - watch.lag)`). Fix: a Sync stores the **measured** delay and sets lag to 0 at that moment. Later
stalls add from there. A reconnect then over-delays, which is safe, until the next Sync. Change 8.2 and the code
together.

**N-M7. `CacheWriter` opens a second stream on the provider.** Xtream counts VOD streams toward `max_connections`. With
the player paused, its loader still holds its HTTP connection (it keeps loading up to 50 s). A `CacheWriter` on the
same URL is a second connection. On a 1-stream account that's a limit error on either one, right when the line is
already struggling. Fix: one connection at a time.
- On "Pause and load ahead", note the position and `stop()` the player, which closes its connection.
- Run the `CacheWriter` from that position.
- On OK, cancel the writer, then prepare the player at the position through `CacheDataSource`. It reads the cached range
  from disk and goes back to the network only past it.

Also cap the cache at the smaller of 2 GB and about a quarter of the free space (Google TVs often have only a few GB
free). Use `CacheDataSource` only after load-ahead has started, so ordinary films don't write to the TV's flash.

**N-M8. C6b blames the ISP for an ordinary 404 page.** C6b ("an HTML page from a host other than the provider's, after
a redirect") sits **above** C6. Per M1, the provider's own streams redirect to other hosts (load balancers). So a 404
with nginx's HTML body from the provider's edge reads `Something on the way is blocking this channel / Your internet
company may block it`. Real ISP blocks usually keep the hostname: DNS answers with the block server's address, or the
HTTP traffic is intercepted. So the rule also misses most real blocks. Fix:
- Order: the HTTP-status rows (C6 for 404/410) win over the body test.
- Call it a block only when the response is a **200** HTML page, and the **panel itself** (`player_api.php` on the same
  hostname) also returns HTML instead of JSON. Then the provider's hostname is being intercepted.
- Otherwise an HTML body is the provider's error page (C6 / C4x).

**N-M9. ◀ OK OK, the Sync-score habit, now switches feeds.** UI-SPEC 7 teaches "Sync score: ◀, OK (Sync score is
first), OK". v1.1 puts Connection first and focused while a card **or chip** shows. The Connection panel then opens
with `Same game on ESPN` focused, so the third OK switches channel and score delay in the middle of a game. The
stutter chip is up for 8 s while the picture plays, which is exactly when a stall-shifted score bug tempts him to sync.
Fix:
- Connection goes first only while the **card** shows (the picture is frozen, and there's nothing to sync against).
- While a chip shows, keep Sync first and Connection second, and have the chip's keys read `◀ ▼ Details`.
- Also open the panel with focus on `Check again` when it's reached from Options rather than from the card. A feed
  switch should never sit at the end of a three-press habit.

---

## Should fix

- **S-N1. C3 and C3h contradict each other.** Weak Wi-Fi that isn't "Wi-Fi-limited" (test < 0.35 × link) goes to C3
  ("Your internet is too slow"). Strong Wi-Fi with a fast link and the same low test goes to C3h ("home, can't tell").
  By the ratio, the strong-link case is the *more* certain internet case. Use one rule:
  - test ÷ RX link < 0.15: the internet (C3), whatever the bars;
  - 0.15 to 0.35: C3h;
  - ≥ 0.35 with weak Wi-Fi: C2.
- **S-N2. Read the RX link speed during the test.** Rate adaptation drops the PHY rate when there's little traffic,
  which is what a stall looks like, so an idle reading understates the link and makes "Wi-Fi-limited" look true. Use
  the highest RX link speed seen during the 3 s test.
- **S-N3. A `HEAD /` 5xx isn't a server fault.** 10.3 says "any HTTP answer = answering; 5xx = C4x". Many healthy
  stream servers answer their root with 403/404/5xx or close the connection. Only a 5xx on the **stream request**
  means C4x; for the `HEAD /` check, any HTTP answer (and a TCP reset) means "answering".
- **S-N4. One noisy second opens the card.** "The first second from 3 s that it isn't recovering" can trip on a
  single 2 s window, and `.ts` arrival over TCP is bursty. Require two consecutive seconds failing the test, or a 3 s
  window.
- **S-N5. "Your Wi-Fi has no internet" hides the gateway split in the line.** If the gateway doesn't answer, it isn't
  "Wi-Fi has no internet" but "The TV can't reach your router" (Wi-Fi cut, not Internet). Make the title follow the
  gateway result too, and mark the cut on the right link.
- **S-N6. The Final hold depends on seeing the change.** `finalAt` is set only when airglow sees `in` → `post`. If the
  app first sees the game already `post` (opened right after the buzzer on a stream 60 s behind), the Final shows live.
  Treat a `post` game you're watching with no `finalAt` as ending now (set `finalAt` to the first time you see it).

## Nits

- `stall-offline-chip`: the `wifiOff` glyph sits about 5 dp up-left of its 40 dp disc; centre it.
- 4.2 "Ceiling": "above 50 Mbps → `60+`" shows 60+ for a 52 Mbps reading. Write `50+`, or use the actual ceiling only
  when the full 25 MB was read.
- C10 is drawn "all ticked", but 4.3 ticks Channel only for arrival ≥ need, which a stalled channel can't show. Draw
  Channel `run` without a tick (the TICK audit should catch this once C10 has a mock).
- C4's line "hasn't answered for 20 s" is fixed text; take the real seconds.
- The Account check's "Letting the stream go…" can last 60 s; say Back still closes it, and the check finishes on its
  own.
- 11.3 still lists removing the `retries == 2` early failure card; the code still has it. That's a port item, just
  flagging that it's still to do.

---

## Must-fix list (short)

1. N-M1: the "!" badge's dot is ink on ink, so it renders as "|"; fix the fill, enlarge, make the audit check pixels.
2. N-M2: C7's "within 60 s" matches every zap; require limit evidence (`active_cons ≥ max`, 458/509, a body) and put
   C7b first; title with the real max.
3. N-M3: C1c only on an HTTP non-204 answer or `CAPTIVE_PORTAL`, never on no answer.
4. N-M4: put C1b above C2, gate it on probes plus the gateway, not a 3 s `VALIDATED` drop; "no route" plus failed
   204 checks is an outage.
5. N-M5: lag must include live pauses (Play/Pause, `onStop` within 10 s); make the code match 8.2's wall-clock measure.
6. N-M6: Sync stores the measured delay and zeroes lag (not measured − lag), because overcounted lag makes it unsafe.
7. N-M7: Pause and load ahead with one connection at a time (stop the player, then the writer, then play from the
   cache); cap the cache by free space.
8. N-M8: C6b below the status rows; a block only for a 200 HTML page when `player_api.php` on the same name also
   returns HTML.
9. N-M9: Connection goes first in Options only while the card (frozen picture) shows; keep ◀ OK OK = Sync during
   chips; never a feed switch as the panel's default focus from Options.
