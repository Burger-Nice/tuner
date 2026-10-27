# Independent review 3: playback diagnosis v1.2

Same reviewer and method as reviews 1 and 2. I read the v1.2 spec (its answer list first, then the whole spec again
for anything the changes broke) and all 27 mocks. I also checked the code as it stands after commits `a095102` (Sync
keeps what was measured and resets the lag) and `7685559` (live pauses count as lag): `PlayerActivity.java` (`lagMs`,
`stallAt`, `onPlayWhenReadyChanged`, `lag-reset`, `onStop`/`onStart`), `player.js` (the `sync` and `lag` events) and
`games.js` (`delayed()`, `finalAt`).

What I verified:
- `tools/audit.js` on a copy of the folder: **27 pages, 0 findings**.
- `--inject-v12` fires BADGEPX, LINE, CHIPKEYS and PANELFOCUS. The counts differ from the spec's (see nits).
- A 6x render of the new badge on `stall-limit` and `stall-no-internet`: the "!" now shows its bar and its dot.
- In the code: Sync stores the measured delay and sends `lag-reset`; a live pause counts through
  `onPlayWhenReadyChanged`.

What I couldn't verify: the Philips, the owner's provider, and Android's audio-focus behaviour on this TV (I reason
from Media3's documented behaviour).

## Scores

| Dimension | v1.0 | v1.1 | **v1.2** |
|---|---|---|---|
| Correctness of the diagnosis | 5.5 | 7.0 | **7.5** |
| Remote ergonomics | 7.0 | 8.0 | **8.5** |
| Clarity for a casual owner | 7.5 | 8.0 | **8.5** |
| Visual quality and consistency | 8.0 | 8.0 | **8.5** |
| Feasibility | 5.5 | 6.5 | **7.0** |
| States and edge cases | 6.0 | 6.5 | **7.0** |
| **Overall** | 6.3 | 7.2 | **7.8** |

v1.2 fixes all nine of review 2's must-fixes on paper, and most of them for real.
- The "!" reads as "!".
- The limit card needs evidence.
- A dead line is no longer a sign-in page.
- The outage card can be reached.
- Sync no longer goes the unsafe way.
- The ISP block rule waits for two signals.
- The Sync habit is protected and the panel never opens on a switch.

Three things keep it from clean:
- one more path where the picture stops but the score doesn't (audio focus);
- the new outage-first order misfires on a weak, lossy Wi-Fi and tells him to restart a router that's fine;
- load ahead, now one connection at a time, runs into the provider still counting the stream it just closed, the very
  thing M5 taught us.

---

## Did review 2's must-fixes get fixed?

| Review 2 | Verdict | Note |
|---|---|---|
| N-M1 badge dot | **Fixed** | 20 dp badge, chalk dot painted explicitly; BADGEPX reads the pixels; I checked the render |
| N-M2 limit card after any zap | **Fixed** | C7b first; C7 needs evidence (`active_cons ≥ max`, 458/509, a body); real max in the title. Gap when the account check doesn't answer (S3-1) |
| N-M3 no answer read as a sign-in page | **Fixed** | C1c only on an HTTP non-204 answer or `CAPTIVE_PORTAL`; 4.1 and 10.3 agree |
| N-M4 outage unreachable | **Fixed, with a new side effect** | C1b gated on the probes plus the router check, above C2. On weak Wi-Fi it now misfires (M3-2) |
| N-M5 live pauses not counted | **Partly** | Play/Pause and `onStop` now count (in the code). Transient audio-focus suppression doesn't (M3-1). The spec still says "today's code counts only BUFFERING" (stale) |
| N-M6 Sync measured − lag | **Fixed** | code checked: `setDelay(chId, sec)`, `setLag(0)`, `lag-reset` |
| N-M7 second stream for load ahead | **Fixed as asked, with a new failure** | stop → writer → cache. On 1-stream accounts the reopen hits "still counted" (M3-3) |
| N-M8 404 page blamed on the ISP | **Fixed** | the status rows win; a block needs a 200 HTML page **and** the panel answering HTML. One wording gap (S3-2) |
| N-M9 ◀ OK OK switched feeds | **Fixed** | Connection first only with the card; Sync stays first with a chip; the panel opens on Check again; CHIPKEYS and PANELFOCUS audited |

Should-fixes S-N1 to S-N6 are all answered. S-N1 leaves one undefined case (S3-3). S-N6 is a port item, and on its own
it isn't enough (S3-5). The nits are answered too; the offline chip's glyph is centred now.

---

## Must fix

**M3-1. The picture can stop for audio focus, and the score doesn't wait.** The code counts lag on BUFFERING and on
`onPlayWhenReadyChanged`. Media3 handles a **transient** audio-focus loss as *playback suppression*
(`PLAYBACK_SUPPRESSION_REASON_TRANSIENT_AUDIO_FOCUS_LOSS`), not as a `playWhenReady` change. The player was built with
`setAudioAttributes(…, true)`, so focus is handled. Pressing the remote's Assistant/mic button mid-game ("Hey Google,
volume up") takes focus for a few seconds. The picture stops and then resumes that much behind live, but no lag is
counted. The score bug then runs ahead of the picture by those seconds: a spoiler, against nba-pages section 8.
Fix it in both places:
- **Spec 8.2:** the lag counts every moment the picture isn't advancing after the first frame (buffering, a pause,
  suppression), which is what "wall-clock − position advanced" means. List suppression by name.
- **Code:** drive it from `onIsPlayingChanged` in live (`isPlaying` false for any reason after `played`), or measure
  wall-clock minus position as the spec says.
- **Tests:** add a forced suppression check next to the forced 10 s stall.
- Also update the stale lines. 8.2 and the v1.2 list still say "today's code counts only BUFFERING"; since `7685559`
  it also counts pauses.

**M3-2. On a weak, lossy Wi-Fi, the outage card blames the internet and says to restart the router.** C1b now comes
before C2 and fires when both internet checks and the stream host get **no answer** within 2 s. On a 1–2 bar link with
heavy loss, the HTTPS checks (DNS, TCP and TLS, each with retransmits) easily miss 2 s. The single 1 s TCP connect to the
router can still get through. The result is `Your internet isn't working / Your router answers, but nothing gets past
it. Restart it.` His internet and router are fine, and restarting won't help. If the router connect also fails, it
reads `The TV can't reach your router … Restart it`, which is the same wrong advice. Fix:
- When the Wi-Fi is weak (bars ≤ 2, or the RX link < 2 × need), retry the checks once with a 5 s timeout before C1b.
- If they still fail while the Wi-Fi is weak, show a Wi-Fi card: `Your Wi-Fi is too weak to get through` / `The TV is
  connected, but almost nothing reaches it. Moving the router closer, or a network cable, fixes it.` Draw Wi-Fi cut.
- Keep C1b (and "Restart it") for links with 3–4 bars.

**M3-3. Load ahead reopens the stream straight into the provider's own count.** In v1.2's one-connection sequence,
the player's `stop()` closes the stream and the `CacheWriter` opens it again at once. By the spec's own M5 finding
(spec 12 lists "how long it keeps counting a closed stream" as unverified), a 1-stream account will often refuse that
reopen for up to a minute. So **"Pause and load ahead" can fail at its first step on exactly the accounts it was made
safe for.** The second hand-over (writer → player) is fine, because the player reads minutes of cache before it needs
the network. Fix: give 3.3 the limit rule.
- A limit answer from the writer (C7's evidence, or any 401/403/458/509 within 60 s of the `stop()`) is retried after
  10, 20 and 30 s.
- Meanwhile the card reads `Loading ahead` / `Waiting for your provider to free the stream…` with the same "Next try
  in 10 s" on the right.
- OK still plays from the position. If the writer never got in, that just re-tunes, through the same back-off.

---

## Should fix

- **S3-1. A real limit can be told it's a package problem.** C7 needs the account check's evidence, but that check
  has a 2 s timeout. Panels are often slow, and many providers answer the limit with a bare 403 and no body. Then the
  card becomes C7c: `Your provider refused this channel / It may not be in your package, or they may block your
  connection (a VPN…)`. If the account check gives **no answer**, don't assert the cause:
  - use `Your provider refused this channel` / `It may be your stream limit or your package. Trying again in 10 s.`;
  - retry once, with the account check;
  - then decide C7 or C7c.
- **S3-2. Say which hostname C6b tests.** The rule says `player_api.php` "on the same hostname". If the HTML came from
  the provider's **redirect target** (a load balancer), that host usually has no `player_api.php`, so it answers with
  an HTML 404 and C6b fires on the provider's own placeholder page. Write it as: the HTML must come from the **panel
  hostname itself (no redirect)**, and `player_api.php` there answers HTML. HTML after a provider redirect is the
  provider's own page (C6 / C4x / C11). DNS-based blocks hit the first request anyway, so nothing real is lost.
- **S3-3. One case in the ratio rule is undefined.** With no RX link speed known, only "bars = 1 counts as ratio ≥ 0.35"
  is defined. At 2–4 bars with no link speed, C3 (ratio < 0.15) and C3h (ratio ≥ 0.15) are both undefined. Say C3h:
  it can't tell, so it doesn't pick a side.
- **S3-4. A live stream dropped while paused.** Pausing live now counts as lag, fine. But if he pauses for more than
  the 30 s buffer, the provider often drops the idle stream. `onPlayerError` → `reconnect()` → `retune` calls
  `player.play()`, so the TV un-pauses itself at the live edge and the paused part is lost. Say it in 9 and 3.1:
  - while paused, a dropped stream isn't reconnected;
  - on Play it reconnects at live, with the toast `Back to live: the stream was dropped while paused`;
  - lag resets to 0, which is correct at live.
- **S3-5. "`finalAt` on first sight" needs something to show.** When a watched game is first seen already `post`
  (`hist` has no `in` snapshot), `delayed()` returns the live game whenever `h` is empty, so setting `finalAt` alone
  still shows the Final. During the hold with no history, every score surface should show its no-score state (the
  shield's hidden plate, or the bug's clock-only form) until delay + lag passes. Add it to 11.5 and the forced-`post`
  test.
- **S3-6. Card lines that carry a name or a number can overflow.** LINE checks the mocks, but several lines carry
  variable text: `…sends nothing on CNN International.`, `…hasn't answered for {n} s.`, `It expired on 19 Nov…`. A long
  channel name ("Sky Sports Main Event UHD") wraps or gets cut off mid-evidence. Give each such line a short form
  (`…sends nothing on this channel.`) to use when the full one doesn't fit in 520 dp, and have LINE try a 30-character
  name.
- **S3-7. Make the Sync toast say why the delay is long.** A Sync taken after stalls now stores delay + lag for the
  channel, across sessions. That's safe, but after the next tune the score will be visibly late by the old lag, and he
  won't know why. Say it once at the moment of the Sync: `Synced · 52 s behind live (12 s of it from pauses)`. That
  way, a later "the score's slow" makes sense and he knows to sync again.

## Nits

- `stall-stutter`: the chip says `OK HD copy` while the hint bar says `OK Watch the HD copy`. Use one label; the
  shorter one reads as a noun, not an action.
- The `--inject-v12` counts in 12 (BADGEPX ×3, CHIPKEYS ×1, PANELFOCUS ×1, LINE ×2) don't match a fresh run on a copy
  (BADGEPX ×16, LINE ×16, CHIPKEYS ×1, PANELFOCUS ×1). The checks fire, which is what matters, but update the numbers.
  The audit also prints LINE, CHIPKEYS and PANELFOCUS under the `OVERLAP` label; give them their own.
- C1b's `Restart it.`: keep it, but have Details add `If that doesn't help, your internet company may have a fault.`
- The router check (10.3): count a TCP reset as an answer, as the stream host check already does. Some routers refuse
  port 80 and still answer port 53.
- 2.2 / 6: say the Options order is decided when ◀ is pressed (opening Options dismisses the chip).
- 10.4 says `lag {ms}`; the code sends `lag {sec}`.

---

## Must-fix list (short)

1. M3-1: count lag whenever the picture isn't advancing, including a transient audio-focus suppression (the Assistant
   button), via `onIsPlayingChanged` or wall-clock − position. Fix the stale "only BUFFERING" lines and add a test.
2. M3-2: on weak Wi-Fi, retry the checks with a 5 s timeout before C1b. If they still fail, it's a "Wi-Fi too weak to
   get through" card (Wi-Fi cut, move closer or use a cable), never "restart the router".
3. M3-3: load ahead's writer reopen gets the limit back-off (10 / 20 / 30 s, "Waiting for your provider to free the
   stream…"), because a 1-stream provider still counts the stream the player just closed.
