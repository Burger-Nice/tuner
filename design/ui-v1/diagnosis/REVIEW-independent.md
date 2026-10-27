# Independent review: playback diagnosis v1.0

Reviewer: independent senior TV-app UI/UX reviewer. Read: `SPEC.md`, all 20 mocks and their PNGs, the contact sheet,
`diagnosis.css`, `tools/`; against `CLAUDE.md`, `UI-SPEC.md` (sections 6 and 7), brand v5.4 (`BRAND.md`, `tokens.css`),
`nba-pages/SPEC.md` section 8, `catchup/SPEC.md` (player-connlimit), `PlayerActivity.java`, `Ui.java`, `app/core.js`,
`app/tv/js/player.js` and `app/tv/js/games.js`.

What I verified: I re-ran `tools/audit.js` on a copy of the folder (so nothing here was rewritten): **20 pages, 0
findings**, as the spec says. I checked each table row against what the player does today (load control, timeouts,
the reconnect path, which URL the native player gets, how the score delay is applied). What I couldn't verify: anything
on the real Philips (RSSI, link speed, whether the probe hosts can be reached from the owner's network), or the
provider's real error answers. Those are the same gaps the spec lists in 12.

## Scores

| Dimension | Score |
|---|---|
| Correctness of the diagnosis | **5.5** |
| Remote ergonomics | **7.0** |
| Clarity for a casual owner | **7.5** |
| Visual quality and consistency | **8.0** |
| Feasibility (Android, Media3, this codebase) | **5.5** |
| States and edge cases | **6.0** |
| **Overall** | **6.3** |

What works: the core idea is right. A five-node path, a title that names the side in its first word, one pair of
numbers as evidence ("needs 12, getting 4") and one action under OK all answer exactly what the owner asked. The
first-match decision table is the right structure for an engineer. Contrasting the Google probe with the provider probe
is the right basic signal. The visual work is clean and fits the kit (radius 16, `PANEL`, the pink spinner, `--a-ok`
always with its icon, no amber and no red). The shield rule is written down and audited. Replacing PlayerView's centre
spinner with a puck at the bottom centre is a real improvement on today.

The score is held down by the diagnosis itself. In several common situations the table **blames the wrong side**, and
part of the design is built for HLS while **this TV's player plays MPEG-TS for every Xtream live channel**
(`player.js` `urlOf` picks the `mpegts` source first, whatever `liveFormat` is set to). That changes the actions, the
lag measurement and the stall timing.

---

## Must fix

**M1. The provider probe tests the wrong server.** `player_api.php` runs on the Xtream panel host. Live streams very
often 302 to a separate streaming or edge host (`setAllowCrossProtocolRedirects(true)` follows it), and the panel is
often behind Cloudflare while the stream servers aren't. "Provider answers in 240 ms" therefore says nothing about the
box that is failing. C4's own wording ("or the stream fails with `IO_NETWORK_CONNECTION_FAILED`/`TIMEOUT` while Google
answers") makes `stall-provider-down` possible with the Provider node *ticked* in Details and "No answer" on the card.
Fix: record the final host after redirects (the `DataSpec` / `HttpDataSource.getUri()` in the `TransferListener`). Probe
**that host** with a connect plus a `HEAD /` or a TCP connect. Never request the stream URL itself, which would take a
slot. Keep the panel probe for account facts only (`status`, `exp_date`, `active_cons`, `max_connections`). In the path
and the panel, "Provider" should mean the stream server; the panel's answer is a sub-reading ("Account server answers").

**M2. A weak-Wi-Fi stall gets blamed on the provider.** On raw `.ts` (this TV's live default) the 8 s live read timeout
(`setReadTimeoutMs(live ? 8000 : 20000)`) throws `IO_NETWORK_CONNECTION_TIMEOUT` when a lossy Wi-Fi link stalls TCP. The
tiny Google 204 still gets through, so C4 matches ("Your provider isn't answering") *before* C2 is ever read. Fix:
- C4 must need the **stream-host probe to fail** (M1), not just a stream error while Google answers.
- Any timeout while the Wi-Fi is at 1 or 2 bars, or the RX link speed is under 2 × need, goes to C2.
- Move the Wi-Fi rule above every "provider" row for timeout-type errors. Only HTTP status answers (401/403/404/5xx)
  prove the far side answered.

**M3. 1 bar of Wi-Fi beats a fast speed sample.** C2 fires on "starving, on Wi-Fi, and 1 bar" before C5 is checked.
The sample to Cloudflare crosses the same Wi-Fi, so if it reads ≥ 1.3 × need, the Wi-Fi is demonstrably *not* the
limit, and the right answer is C5 (provider). The same goes for `acct-check-wifi`: "The Wi-Fi is the weak link… a
network cable… gives the TV its full speed" is drawn from bars alone, while the sample shows 14 Mbps. If his plan *is*
15 Mbps, a cable changes nothing. Fix: Wi-Fi is the cause only when the bars or the RX link speed are low **and** the
sample is low **and** the RX link speed is near the sample (Wi-Fi-limited). Otherwise say internet, or the provider.
When strong bars and a low sample can't be split (interference, a busy band), use "Your home network is slow for this
channel" and put the cable test in Details, rather than guess "Your internet".

**M4. `DECODING_FAILED` is not the TV's fault.** C8 puts `DECODING_FAILED` twice with the capability errors and says
"Not your internet or provider" (`fail-decoder`). Repeated `DECODING_FAILED` on a stream the TV *can* decode (check the
`Format` against the `MediaCodecList` table the spec already builds) usually means a corrupt stream from the source.
Fix: TV-side only for `EXCEEDS_CAPABILITIES`, `FORMAT_UNSUPPORTED`, and `DECODER_INIT_FAILED` *after one retry*. Init can
fail for a moment when the hardware decoder is still held after returning to the app. `DECODING_FAILED` on a format
within the TV's capabilities becomes "This channel's picture is broken at your provider" (Channel bad), with the same
actions.

**M5. "Both are in use, by other devices" is often this TV.** On a 1- or 2-stream account the most common limit
answer comes from the TV's *own* last connection, which the provider still counts for 10 to 60 s after a reconnect or
a zap. Today's reconnect timing (1, 2, 4 s) and C1's "on `onAvailable`: tune again at once" both cause this. `stall-limit`
tells him to go and hunt for another device that doesn't exist. Fix:
- If the limit answer comes within about 60 s of this TV closing a stream, say "Your provider still counts this TV's
  last stream. Trying again in 10 s", and back off 10 / 20 / 30 s, not 5 s.
- Only say "by other devices" when `active_cons` stays at the maximum after that window.
- The catch-up card's "or wait a few seconds" was already honest. Keep that tone.

**M6. The table has no default row, and its probe rules have holes.**
- DNS broken while `NET_CAPABILITY_VALIDATED` is still cached as true: the Google probe fails, so C1b can't match
  (it needs not validated) and C4 / C4b can't match (they need Google OK). Nothing matches.
- Google probe fails but the provider answers (broken IPv6 route to Google, a filtering DNS): no row says what then.
- `generate_204` returning **200** is the captive-portal signature, yet 10.3 counts 200 as a pass.

Fix:
- Add a last row, "Something between this TV and your provider isn't answering", with Internet cut and the readings in
  Details.
- When the Google probe fails, call `ConnectivityManager.reportNetworkConnectivity(network, false)` so Android
  re-validates. Use `VALIDATED` together with the probe, never just one of them.
- Pass is **204 only** (`cp.cloudflare.com` also answers 204). Check `NET_CAPABILITY_CAPTIVE_PORTAL` and add a "Your
  Wi-Fi wants you to sign in" cause.
- Give each probe a fast fallback across address families (or try IPv4 first), so a broken IPv6 route doesn't fake
  "no internet".

**M7. The live lag can't be measured the way section 8 says on this TV, and the shield depends on it.**
`getCurrentLiveOffset()` returns `TIME_UNSET` for a progressive `.ts` source (no live window). On HLS it also needs
`EXT-X-PROGRAM-DATE-TIME`, which many IPTV playlists don't have. ".ts streams start at the live point again" is true
only after a reconnect. A `.ts` stall that recovers *without* reconnecting usually resumes from the TCP and server
backlog, behind live, and no speed control closes that gap. Several stutters add up, and the score bug then runs ahead
of the picture.
- Fix: measure `lag` as (wall-clock time since the last steady READY) − (playback position advanced). This works on any
  source.
- On `.ts`, when it's unknown, **assume lag = the total stall time since the last (re)connect**. A score that's too
  late is safe; one that's too early is a spoiler.
- Reset to 0 only on a reconnect or a new tune.
- Related, already in the code: `games.js` `delayed()` returns the **live** game as soon as ESPN reports `post`, because
  `remember()` keeps only `in` snapshots and `delayed()` returns early when `g.state !== 'in'`. The Final and the final
  score therefore reach the bug and the game panel up to the full delay (60 s by default, more with any lag) before the
  picture's buzzer. Section 8.2 says lag applies "for every score surface", which can't hold at the end of a game unless
  the `in` → `post` change is also held for delay + lag. Write that into section 8 and the port checklist.

**M8. The actions in the mocks mostly don't exist for this owner's live channels.** Because the native player gets
the `.ts` URL:
- There are no HLS variants, so "Switch to 720p" (`stall-wifi-weak`, `stall-stutter`) never appears.
- "Try the other stream type" (`opt-panel-slow`, C5, C10) has no plumbing at all. The packed playlist sends one URL
  pattern per channel, and `PlayerActivity` has no HLS fallback.

Fix:
- Either make the native player honour `liveFormat` and receive both sources (and port that first), or drop "other
  stream type" from the in-player actions.
- Make the mocks show the **real** default action order for a `.ts` channel: another feed → another copy (`versions`)
  → Try again. Keep the 720p example for HLS.
- Switching stream type mid-game also changes the stream latency (HLS usually runs 10 to 30 s further behind than TS).
  The score delay is stored per channel, not per type, so a type switch has to reset the channel to "not synced" (60 s
  default) or keep a delay per type. Otherwise it's a spoiler.

**M9. On `.ts` the card would open on almost every rebuffer.** The live `DefaultLoadControl` needs 3 s of media after a
rebuffer (`bufferForPlaybackAfterRebufferMs = 3000`). A real-time `.ts` feed refills at about 1 s per second, so almost
every hiccup freezes the picture for ≥ 3 s, right at the card's 3 s threshold. The 560 × 200 card would pop up and fade
a second later on routine blips, which is the noise the design means to avoid. Fix: open the card only when the stall
**isn't recovering**:
- At 3 s, if the loaded-ahead time is growing at ≥ 0.8 s per second and resume is due within about 1.5 s, keep the puck.
- Otherwise open the card at 5 s.
- Or lower the live rebuffer target to 1.5 to 2 s and measure the result in CI.

Either way, write the rule down against the real `LoadControl` values.

**M10. "Pause and load ahead" (VOD) can't load enough.** Paused, ExoPlayer still stops at the VOD load control's
`maxBufferMs` 50 s / 96 MB target. At 16 Mbps needed and 7 arriving, a 50 s buffer lasts about 90 s of film, and "Loaded
0:42 ahead · OK to play" sets a false expectation. Fix:
- While paused by this action, raise the limits with a custom `LoadControl`: a longer duration, and a byte cap sized for
  the TV's RAM, or a disk `SimpleCache` / `CacheDataSource`.
- Have the line say what's enough: "Loaded 3:10 · enough for 7 min" (buffer ÷ (1 − arrival/need)), or "Enough to play
  through" when arrival ≥ need.

---

## Should fix

**Correctness**
- **S1. The speed sample fights the stream.** It runs during a stall on the same slow line, so it measures what's
  *left*, not the capacity, and it slows the refill. Use capacity = sample + the stream's arrival over the same 3 s,
  or pause loading for 3 s (the picture is frozen anyway).
- **S2. Show the sample's ceiling.** 25 MB over at most 3 s on one TCP connection caps the reading at about 66 Mbps,
  and TCP start-up understates it. "Your internet does 48" on a gigabit line makes him doubt a good line. Say "48+ Mbps",
  or "Fast (well over what this channel needs)".
- **S3. A fast local test isn't the provider's route.** Cloudflare has a Reykjavik point of presence, so "your internet
  is fine" really means "fast to the nearest city". C5's open question 3 is real for an Icelandic home and a European or
  US provider. The honest title is "Your provider, or the way to it, is slow with this channel", with the line "Your
  Wi-Fi and internet are fine." It's still not his side, and it's still true.
- **S4. Starving, when the need is unknown.** In a raw `.ts` stream `Format.bitrate` is unset. In the first 10 s after
  a tune, or on a channel that stalls straight away, C2, C3 and C5 can't be judged and the card falls through to C10
  ("This channel stopped for a moment"). During BUFFERING, starving doesn't need the need value: buffered position
  growing slower than 1 s per second *is* starving. Use that during stalls, and the need only for the number in the
  line. If there's no need yet, take a typical value from the resolution and codec ("about 8 Mbps for 1080p") rather
  than leave it out.
- **S5. C6 and C7c have more causes than the copy admits.**
  - A 404 on Xtream often means the channel list is stale (the provider renumbered `stream_id`s). Add **Refresh channels**
    as an action.
  - `PARSING_*_MALFORMED` (an HTML page instead of video) is also what an ISP's DNS block page looks like, and that's
    not the provider. When the response is HTML from a different host after redirect, say it's blocked on the way.
  - A 401/403 with the account active can be the provider's IP or VPN lock, not just "not in your package".
- **S6. Ticks claim more than was checked.**
  - In `stall-wifi-weak` the Internet, Provider and Channel nodes are ticked, though nothing past a bottleneck can be
    judged (the Channel is plainly not arriving).
  - In `fail-decoder` every link is ticked while the card shows "at once, no checks".
  - In `opt-panel-slow` the TV row is ticked beside "Only 1 s loaded ahead".

  Use the tick only for "checked and fine". Show "not checked" for links past the problem, or for checks that didn't
  run, as the existing dotted outline with no tick. Readings like "Only 1 s ahead" get no tick.
- **S7. Hysteresis.** Checks re-run every 15 s and "the cause may change" in place. C3/C5 near 1.3× and RSSI near −67
  will flip the title every 15 s. Change the cause only when the new one holds for two checks in a row (certain causes
  like C1 and C8 are exempt).
- **S8. Flapping Wi-Fi.** `onAvailable` comes before `VALIDATED`. Tune on `onCapabilitiesChanged` with VALIDATED, held
  for 2 s, and at most once per 10 s. Otherwise a flapping link means churn and limit errors (M5). Defer it while the
  activity is stopped, for example in Network settings.
- **S9. Wi-Fi link speed.** Name `WifiInfo.getRxLinkSpeedMbps()` (API 30+). For streaming the receive side matters, and
  `getLinkSpeed()` is transmit. On API 31+ the `WifiInfo` from `getTransportInfo()` gives RSSI without location, but
  signal updates come at thresholds, so poll `WifiManager.getConnectionInfo()` once per second during a stall.

**Remote ergonomics**
- **S10. Hold OK shouldn't change meaning.** Hold OK = Last channel is the owner's way *out* of a broken channel, and
  during a stall is exactly when he'd reach for it. Turning it into Details only while the card is up is a hidden mode,
  against the "no modes" key map in UI-SPEC 7. Keep Hold OK = Last channel. While the card or chip shows, have ◀
  open Options **with Connection first and focused**, so Details is ◀ OK (2 presses), and the card reads "◀ Details".
  This is open question 1; I'd answer it this way.
- **S11. OK can change under his finger.**
  - The card appears at 3 s while he may be mid-press for the channel list.
  - Its action can change when the cause updates ("Try again now" becomes "Same game on ESPN", which also changes the
    score delay).

  Ignore OK for 700 ms after the card appears and for 1 s after its action changes.
- **S12. Chip priority.** The stutter chip and the "Grizzlies are live" action chip share one slot, and nothing says
  which wins. The team chip wins; the stutter chip waits (or is dropped if older than 30 s). Use the kit's chip values:
  8 s (not 10), max 420 (not 440). `stall-stutter` also wraps its line to two lines ("Your Wi-Fi is weak for this /
  channel"), against 3.4's "the cause in one line". Shorten it to "Weak Wi-Fi for this channel".
- **S13. VOD with the controls up.** UI-SPEC: "OK pauses and resumes, always", and with the controls up focus is on the
  seek thumb or a button. Say that, with the controls up, the card doesn't bind OK and shows no keys line (OK already
  pauses).
- **S14. The Account check's "Last channel" test.** It takes a stream for 5 s on a 1-stream account. `active_cons` lags,
  and the slot can stay counted after the test, so the owner's next tune hits the limit (M5). Skip it by default when
  `max_connections` is 1, offering "Test the channel too" as a second button. After any test, wait for the slot to be
  free before saying "done".
- **S15. Offline while there's still picture.** C1 shows "at 1 s" when the network drops. On HLS (and briefly on TS)
  the picture plays on from the buffer. Say that the card waits for the actual stall. While picture remains, a chip can
  say "Wi-Fi dropped · playing what's loaded".

**Clarity**
- **S16. The problem node reads as "you are here".** A white disc in a five-step line is what a stepper uses for the
  *current* step. In `stall-checking` the running node has a pink ring, so the white disc of the result could be read
  as "done up to here". Give the problem node its own badge where the ticks sit: an ink "!" on a chalk 16 dp badge, or
  a slash glyph (`wifiOff`-style) for cut links. Then "tick = fine, ! = problem" reads without the title. That's still
  no colour, and still within the brand.
- **S17. Jargon left in the copy.**
  - C8: "4K HEVC at 100 fps" becomes "a 4K picture at a frame rate this TV can't play".
  - `opt-panel-slow`: "Transport stream instead of HLS" becomes "Another way your provider sends it".
  - "Mbps" is acceptable as the one unit, but keep it to one pair per surface, as 2.5 says.

**Feasibility**
- **S18. Threading, written down.**
  - `TransferListener.onBytesTransferred` runs on loader threads, so keep the counters in `AtomicLong` buckets.
  - Probes and the sample need an executor (`NetworkOnMainThreadException` otherwise), with results posted to the
    player `Handler`, cancelled on zap and `onStop`, at most one set in flight.
  - The 1 s `Health` tick shares the existing `tick` runnable.
- **S19. Stall timeline vs today's reconnect.** On `.ts`, today's error path (8 s read timeout → `onPlayerError` →
  `reconnect()` straight away) comes before the 12 s `stall` runnable. Also, `reconnect()` shows the failure card at
  `retries == 2` for game channels. Rewrite 3.1 against those two real paths, and say which one this design replaces.
  Reconnecting a stream that is slow but still alive (C2/C3/C5) throws away its buffer. Don't reconnect at 12 s while
  bytes still arrive at ≥ 50 % of the need.
- **S20. The Cloudflare `__down` endpoint is unofficial.** Name a fallback, for example a cached file on the provider's
  own CDN, or measure arrival on the stream itself. Say what happens when it answers 403 or 429. 9 already covers "no
  route".

---

## Nits

- `fail-game-feed`: "US: ESPN HD" should be "ESPN HD" (UI-SPEC 6, titles: strip `US:`). The card's CTA "Same game on
  ESPN" already does this.
- `fail-channel-off`, `fail-decoder`, `fail-game-feed`: section 5 says Report keeps its place, but the mocks leave it
  out. Show it.
- `fail-decoder`: the `lower` glyph (arrow down to a line) reads as **download**. Use a "step down" glyph (a chevron down
  over bars), or the existing `quality` glyph.
- `acct-provider`: the focused row's ring sits at x 917, 5 px past the safe line. It's noted as "as today", but it's
  still outside the line. Fix it here and on today's Account page together.
- The card overlaps the centre 50 % of the picture (box x 240 to 720, y 135 to 405; the card y 236 to 444 covers about
  a third of it). Picture frozen is a fair exception to UI-SPEC 7's "nothing passive covers the centre", but write it
  in UI-SPEC 7 as an exception, so the next overlay doesn't cite this one.
- `stall-checking`: the keys line holds only "Back hides". Add "▲▼ Zap" so the frozen screen tells him he isn't stuck.
- `Checked 01:52` in the panel header: while it's open, readings update every second, so the time should be the last
  probe's, not the open time. Say which.
- C4b: "your internet company may block it" is good. Add the one fix that exists on Android TV: Private DNS, if the
  Philips settings show it (unverified).
- C1b: "Restarting the router usually fixes it". A TCP connect to the default gateway (from `LinkProperties`) could
  split "your router" from "your internet company's line". That's cheap and worth a Details reading.
- Open question 2 says 10 to 20 MB; 10.3 asks for 25 MB. Make them agree.

---

## Must-fix list (short)

1. M1: probe the stream's real (redirected) host, not the panel; the panel probe is account facts only.
2. M2: timeouts on weak Wi-Fi go to C2; C4 needs the stream-host probe to fail.
3. M3: a fast sample overrides low bars; Wi-Fi is blamed only when bars, link speed and sample agree.
4. M4: `DECODING_FAILED` on a decodable format is the source, not the TV; retry `DECODER_INIT_FAILED` once.
5. M5: a limit answer just after this TV's own reconnect is this TV's old stream; back off and say so.
6. M6: add a default row; 204-only pass; captive portal; re-validation; IPv6/DNS fallbacks.
7. M7: measure lag by wall clock vs position (works on `.ts`); assume the worst when unknown; hold the `post`/Final
   change by delay + lag (an existing bug in `games.js` `delayed()`).
8. M8: design the actions for `.ts` live, which is what the native player plays; plumb or drop "other stream type";
   a type switch must not reuse the stored delay.
9. M9: don't open the card on stalls that are already recovering (the 3 s rebuffer target makes most `.ts` blips
   reach 3 s).
10. M10: "Pause and load ahead" needs a bigger paused buffer (or a disk cache) and an honest "enough for" line.
