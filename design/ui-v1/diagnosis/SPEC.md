# airglow TV: playback diagnosis, v1.1

The owner: *"when stuff is buffering or loading or something when I am watching live, I want to know if its my internet
or the provider, or just in general what the issue is"*.

This is the design spec for the engineer. It extends `design/ui-v1/UI-SPEC.md` v1.2 section 7 (the native player) and
sits beside `design/ui-v1/catchup/SPEC.md` 6.7 (its split failure cards). Everything not said here follows those.

| File | What it is |
|---|---|
| `SPEC.md` | this |
| `*.html` (25) | the mocks at 960 x 540; `png/*.png` are their 2x renders, `png/contact-sheet.png` shows all of them |
| `diagnosis.css` | the new classes, prefix `dg-`. The player parts are native views measured here in dp (1 dp = 1 CSS px on the canvas); `dg-sheet` is web, for `app/tv/app.css` |
| `tools/build.js` | writes the mocks and `tools/pages.json` |
| `tools/render.js` | the PNGs and the contact sheet |
| `tools/audit.js` | the self-check (section 12); ring data in `tools/audit-rings.json` |
| `REVIEW-independent.md` | the review of v1.0 (6.3 / 10) that v1.1 answers |

**Scenario (section 0).** Tue 27 Oct 2026, 01:52 on the owner's TV (Reykjavik time, UTC). Grizzlies at Jazz is live on
NBA League Pass 4 (41), also on ESPN HD (210) and NBA TV. Shield: My team. Speeds, bitrates, latencies and channels
are illustrative.

**The player this is designed for (engineering, v1.1).** Live channels play the provider's **MPEG-TS** link (no HLS
levels). The live load control starts after **2 s** of picture and, after a stall, **waits for 6 s of picture** before
it plays again. The live read timeout is **12 s**. The player measures the **extra lag** a stall adds (wall-clock time
minus playback progress) and reports it to the app, and every score surface adds it.

## v1.1 changes: an answer to every review point

Engineering's two facts above change three things: the stall timeline (3.1), the actions for live (4.4) and the lag
rule (section 8). The owner left Hold OK to me: it stays **Last channel** (S10).

### Must fix

**M1. The provider check tested the wrong server. Accepted.** "Provider" now means **the server the stream really
comes from**. The `TransferListener` keeps the final host after redirects (`DataSpec.uri` of the open after the
redirect; `HttpDataSource.getUri()`). That host gets a TCP connect plus `HEAD /` (any HTTP answer counts) and is never
asked for the stream itself, so no slot is taken. `player_api.php` on the panel host is now the **account check**
only (status, expiry, streams in use, max), and the panel shows it as a sub-reading: `1 of 2 streams in use`
(10.3, 7).

**M2. A weak-Wi-Fi timeout was blamed on the provider. Accepted.** The table (4.1) is reordered.
- **Only an HTTP status proves the far side answered.** Those rows (401/403/404/5xx…) come first after the TV rows.
- **A timeout or connection error goes through the Wi-Fi rule (C2) before any provider row.**
- `Your provider isn't answering` (C4) needs **the stream host's own check to fail**. A stream error while Google
  answers isn't enough any more. `stall-provider-down`'s note says so.

**M3. One bar of Wi-Fi beat a fast speed test. Accepted.**
- **Wi-Fi is the cause only when three readings agree:**
  - low bars or a low receive link speed;
  - a low speed test;
  - the test reaching most of what the Wi-Fi link can carry (capacity ≥ 0.35 × the RX link speed). With no link
    speed, 1 bar counts as agreeing.
- **A fast test means it isn't the Wi-Fi**, whatever the bars (→ C5).
- **New C3h `Your connection at home is too slow`** (`stall-home-slow`): strong bars and a fast link, but a slow test.
  That's busy airwaves or the line, which the TV can't tell apart. Both links get the "!", and Details says a network
  cable would split them.
- **`acct-check-wifi` now shows all three readings:** `1 of 4 bars · link 26 Mbps`, a 14 Mbps test, and the verdict
  "The Wi-Fi is the limit: the test got most of what it can carry". The internet past it is not judged.

**M4. `DECODING_FAILED` isn't the TV's fault. Accepted.**
- **The TV is blamed (C8) only for** `EXCEEDS_CAPABILITIES` and `FORMAT_UNSUPPORTED`, or for `DECODER_INIT_FAILED`
  **after one retry 1 s later** (a decoder still held after returning to the app).
- **`DECODING_FAILED` twice on a format inside the TV's decoder table** is new C8b, `This channel's picture is broken at
  your provider`, with the Channel marked bad (`fail-broken`).

**M5. "By other devices" was often this TV's own last stream. Accepted.**
- **A limit answer within 60 s of this TV closing a stream** reads `Your provider allows 1 stream` / `It still counts
  this TV's last one. That clears within a minute.` (`stall-limit`). It backs off **10, 20, 30 s**.
- **"By other devices"** appears only if the account check still shows every stream in use after that window.
- **Less self-made churn:**
  - the first reconnect waits 2 s, not 1;
  - a returning network tunes once, after 2 s of working internet (S8).
- The catch-up card's tone ("or wait a moment") is kept.

**M6. The table had no default and holes in its checks. Accepted.**
- **A last row:** C11 `Something between this TV and your provider isn't answering` (Internet cut, every reading in
  Details).
- **Internet check: only 204 passes.** `connectivitycheck.gstatic.com/generate_204` first, then `cp.cloudflare.com`
  (also 204).
- **Captive portal, new C1c `Your Wi-Fi wants you to sign in`:** shown on `NET_CAPABILITY_CAPTIVE_PORTAL`, or when the
  internet check gets any other answer (a 200 page or a redirect).
- **No internet (C1b)** now needs three things:
  - both internet hosts fail on IPv4 and IPv6 (each check tries IPv4 first, with a 300 ms head start, as in "Happy
    Eyeballs");
  - **and** the stream host fails;
  - **and** Android drops `VALIDATED` within 3 s after `reportNetworkConnectivity(network, false)`.
- **Google fails but the stream host answers:** the Google result is ignored and the table carries on.

**M7. Lag measured the wrong way for `.ts`, and the Final arrived early. Accepted; built on engineering's measure.**
- **The lag** is wall-clock time minus playback progress since the last steady READY after a (re)connect. That works on
  any source.
- **When it can't be measured, assume the worst:** lag = all stall time since the last connect. Too late is safe; too
  early is a spoiler.
- **It resets only on a reconnect or a new tune.**
- **The Final:** section 8 now also holds the `in` → `post` change (the Final and the final score) back by delay + lag.
  Today `games.js` `delayed()` hands over the live game as soon as ESPN says `post`. That's a bug to fix in the port
  (11.5).

**M8. The actions didn't exist for `.ts` live. Accepted.**
- **The live order is now:** another feed of the game → another copy of the channel (the Quality sheet's `versions`) →
  `Try again` (plus `Refresh channels` for a 404). `Switch to 720p` stays only for streams that have levels (HLS VOD, an
  `.m3u8` channel).
- **"Try the other stream type" is dropped** from the player. There is no plumbing for it, and a type switch would
  change the stream's latency under a delay stored per channel.
- **Every switch to a copy or feed** uses that channel's own stored delay (or 60 s). Section 8 says so.

**M9. On `.ts` the card would open on routine blips. Accepted, against the new 6 s rebuffer wait.**
- **A real-time `.ts` feed refills at about 1 s per second**, so a normal stall now freezes for about 6 s. The **puck**
  shows that refill as a filling ring (`stall-puck`), with no words.
- **The card opens only when the stall isn't recovering:**
  - from 3 s, as soon as the refill rate over the last 2 s is under **0.8 s per second**, or the refill won't finish
    within 4 more seconds;
  - **at 12 s at the latest**.

  A routine 6 s stall never shows a card. The rule is written against the real load-control values in 3.1.

**M10. "Pause and load ahead" couldn't load enough. Accepted.**
- **More room while paused this way:** a `CacheWriter` keeps writing ahead into a `SimpleCache` on disk (cap 2 GB,
  cleared when the title closes), and the player reads through `CacheDataSource`. That gets past the 50 s / 96 MB
  memory buffer.
- **The line says what's loaded is worth** (`stall-vod-loading`): `3:10 loaded. Enough to watch about 6 minutes
  without a pause.` That's loaded ÷ (1 − arriving ÷ needed).
- **The right side says when the rest of the film is covered:** `Enough for the rest in about 8 min`.
- **When the arrival rate is at or above the need**, it reads `Enough to play through`.

### Should fix

| # | Answer |
|---|---|
| S1 | **Accepted.** Capacity = the test's rate + what the stream itself got in the same 3 s (the picture is frozen; the stream keeps loading). |
| S2 | **Accepted.** The test stops at 25 MB, so it can't read much above about 60 Mbps. A capped reading shows as `60+ Mbps` in the panel and `Fast` on the card (`stall-provider-slow` now reads Internet `Fast`, which also keeps the card to one Mbps pair). |
| S3 | **Accepted in the line, not the title.** The title stays `Your provider is slow with this channel` (the long version didn't fit one line at 20 dp). The line now says it honestly: `Your Wi-Fi and internet are fine. It's their server, or the way to it.` Either way it's not his side. |
| S4 | **Accepted.** During a stall, "starving" = the loaded-ahead time growing under 0.8 s per second; the need is only for the number. An unknown need is taken from the picture: SD 3, 720p 5, 1080p 8 (10 at 50 fps), 4K 20 Mbps, and written `about` (`opt-connection`). |
| S5 | **Accepted.** C6 has `Refresh channels` (`fail-channel-off`); new C6b `Something on the way is blocking this channel` when an HTML page comes from a host other than the provider's after a redirect; C7c's line names the IP / VPN lock. |
| S6 | **Accepted, with one exception.** A tick now means "checked and fine for what this card is about", and every tick carries its proof (4.3; audited). Past the bottleneck nothing is ticked (`stall-wifi-weak`, `stall-internet-slow`, `stall-vod`); "1 s ahead" moved to the problem row (`opt-panel-slow`). **Pushed back:** `fail-decoder` keeps its ticks, because the picture's data did arrive through all four links (proof `stream-bytes`), which is exactly what tells him it's not his internet. |
| S7 | **Accepted.** A cause changes only when two checks in a row agree (15 s apart). Certain causes (C1, C1c, C8, anything from an HTTP status) change at once. |
| S8 | **Accepted.** Re-tune on `onCapabilitiesChanged` with `VALIDATED` held for 2 s, at most once per 10 s, deferred while the activity is stopped (it re-checks in `onStart`). |
| S9 | **Accepted.** RX link speed from `WifiInfo.getRxLinkSpeedMbps()` (API 30+, `getLinkSpeed()` below); RSSI from `getTransportInfo()` on API 31+; `WifiManager.getConnectionInfo()` polled once a second during a stall and while the panel is open. |
| S10 | **Accepted. Hold OK is Last channel, always.** While a card or chip shows, ◀ opens Options with **Connection first and focused** (`opt-during-stall`), so Details is ◀ then OK; the card's keys read `◀ Details`. Audited (KEYS). |
| S11 | **Accepted.** OK is ignored for 700 ms after the card appears and for 1 s after its action changes. |
| S12 | **Accepted.** "Your team is live" wins the chip slot; the stutter chip waits, or is dropped if it's older than 30 s. The kit's values: 8 s, max 420 (audited, CHIP). The line is `Weak Wi-Fi for this channel`, one line. |
| S13 | **Accepted.** With the VOD controls up the card doesn't take OK and shows no keys line (OK pauses, always); it sits above the bar. |
| S14 | **Accepted.** The Account check samples the last channel only when the account allows 2+ streams; on 1 stream, a second button `Test a channel too`. After a sample, "done" waits (polling the account every 5 s, up to 60 s, `Letting the stream go…`) until the provider has freed it. |
| S15 | **Accepted.** While picture remains, a chip: `The Wi-Fi dropped · Playing what's loaded` (`stall-offline-chip`). The card shows only when the picture stops. |
| S16 | **Accepted.** The problem node has its own badge where the ticks sit: an ink disc with a chalk "!". Tick = fine, ! = problem, outline = not judged. Audited (BADGE). |
| S17 | **Accepted.** `a 4K picture at a frame rate this TV can't play`; the stream-type row is gone (M8); one Mbps pair per card. Audited (JARGON, PAIR). |
| S18 | **Accepted.** Section 10.5. |
| S19 | **Accepted.** 3.1 is rewritten against the real paths (the 12 s read timeout → `onPlayerError` → `reconnect()`, and the 12 s `stall` runnable). A stream still refilling at ≥ 0.5 s per second is **not** reconnected at 12 s. The game channel's early failure card at `retries == 2` is replaced by the card's OK (`Same game on ESPN`), shown from the moment the card opens. |
| S20 | **Accepted.** The test URL comes from the release's `android.json` (`speedUrl`), so it can be changed without an update. On 403, 429, 5xx or no route there's no test: Wi-Fi is judged on bars and link alone, and otherwise the title doesn't take a side (C12 `This channel is arriving too slowly`, Internet `not tested`). |

### Nits

| Nit | Answer |
|---|---|
| `US: ESPN HD` | Fixed (`ESPN HD`); audited (TITLE) |
| Report on the failure cards | **Pushed back:** today's `showFailed()` has no Report row (UI-SPEC 7's line about it is stale). Section 5 no longer promises one; if Report is built, it goes last |
| `lower` glyph reads as download | Replaced by the existing `quality` glyph |
| Account ring at x 917 | Fixed in the mock: the rows end at x 906, so the ring sits at 911. Today's Account page needs the same change (11.7) |
| The card over the centre 50 % | Written down as an exception in 2.1, and listed as a UI-SPEC 7 edit (11.8): allowed only while the picture is frozen |
| `stall-checking` keys | `▲▼ Zap` added |
| `Checked 01:52` | The time of the last check, not of opening (7) |
| C4b | Adds `Private DNS in the TV's network settings may get around it` (to verify on the Philips) |
| C1b | A TCP connect to the default gateway (`LinkProperties`) splits the line: `Your router answers, but nothing gets past it` vs `The TV can't reach your router` |
| 10–20 MB vs 25 MB | One figure everywhere: up to 25 MB per test |

## 1. The idea in one picture: the path

Every message names **which side the problem is on**, and shows it on **the path**:

`TV · Wi-Fi (or Cable) · Internet · Provider · Channel` (the last reads `Movie` or `Episode` for VOD)

| Node state | Drawn as | Means |
|---|---|---|
| ok | surface-2 disc, chalk glyph, **green tick badge** (`--a-ok`, always with its icon) | checked, and fine for what this card is about (proofs in 4.3) |
| bad | **chalk disc, ink glyph, ink "!" badge**, reading in chalk 650 | the problem |
| off | outline disc, `text-3` label, no badge | not judged: past the problem, or not checked |
| run | outline with a pink arc | being checked now |

| Link | Drawn as |
|---|---|
| ok | 2 dp `BORDER_STRONG` |
| slow | 3 dp chalk dashes 7 / 5: works, too slowly |
| cut | a 16 dp gap: nothing gets through |
| off | dotted: not reached |
| run | the pink progress filling |

No amber, no yellow, no red (red stays LIVE). The title starts with the side: **"Your …"** is his side (TV, Wi-Fi,
internet, account); **"Your provider …" / "This channel …"** is theirs. One pair of numbers where it settles the
question (`needs 12 Mbps, getting 4`), no jargon.

## 2. Rules every surface follows

### 2.1 Geometry

| What | Value |
|---|---|
| Stall card | bottom centre, **560 wide**, bottom edge **y 444** (the existing status card's anchor, `bottomMargin 96`), height = content: 138 to 208 dp (top y 236 at most). Radius 16, `PANEL`, 1 dp border, padding 16 / 20 / 14, gap 12 |
| Puck | 56 dp circle, same anchor (y 388 to 444): a 32 dp refill ring (pink on surface-2, 3.5 dp, round cap) while bytes arrive, the 28 dp spinner while nothing does |
| Failure card | same anchor and width, focused list rows 52 dp, height = content (y 74 to 444 with three rows) |
| Chips | the kit's action chip: right 48, 64 from the bottom, **max 420**, 8 s |
| Connection panel | left 48, top 27, **400 wide**, height = content, **cap 453** (all-good 415, during a stall 451) |
| Account check sheet | the right sheet, **480 wide**, y 27 to 513 |
| Path, horizontal | 5 nodes of 88 dp; disc 32, glyph 18, badge 16 (offset right -8, bottom -5, 2 dp ring in the card colour); label 650 14/18, reading 14/18; lines run centre to centre under the discs |
| Path, vertical | rows 44 dp (sheet 54), disc 32, gap 16; label 650 15/20, reading 14/18, value right 650 15/20; connector 2 dp at the disc centre |
| Text | 14 dp minimum; titles Outfit 700 20/26 (card), 18/24 (panel verdict), 22/28 (sheet) |

**Out of the picture's way.** The puck is all he sees in a routine stall, and it replaces PlayerView's **centre**
spinner (`setShowBuffering(SHOW_BUFFERING_NEVER)`). The card covers part of the centre 50 % (y 236 to 405 at most),
**only while the picture is frozen and not recovering**: that's the one exception to UI-SPEC 7's "nothing passive
covers the centre" (11.8). When the picture is moving, it's always a chip in the corner.

### 2.2 Keys (the player's key map is unchanged: no modes)

| Surface | Focus | OK | Hold OK | ◀ | Back | Others |
|---|---|---|---|---|---|---|
| Puck | none | channels, as always | Last channel | Options | as always | as always |
| Stall card | **none** (the action chip's model) | **its one best action** (ignored for 700 ms after it appears and 1 s after the action changes) | **Last channel** | **Options, Connection first and focused** (`opt-during-stall`): Details is ◀ OK | **hides it** | ▲▼ zap, ▶ game, digits as always; a tune clears it |
| Chips | none | its action (the offline chip has none) | Last channel | as the card | dismiss | any other key dismisses (as the chip) |
| Failure card | first row (inset ring) | the row | – | – | close | ▲▼ move |
| Connection panel | first action row | the row | – | – | to Options | ▲▼ move |
| VOD card, controls up | none | **play / pause** (as always; no keys line) | – | – | hides it | as the controls |
| Account sheet | Run again when done; the text body while running | Run again | – | – | stop / close | – |

While a card or chip shows, the hint bar (when it shows: first 5 times, then on Info) reads
`OK <action> · ◀ Details · Back Hide · ▲▼ Zap`.

### 2.3 New glyphs (`Ui.Icon`, 24 grid, 2 dp stroke, round caps)

`tv` (exists), `wifi`, `wifiWeak` (outer arcs at 30 %), `wifiOff` (+ slash), `cable`, `globe`, `server`, `stream`,
`signal` (Options), `list` (Refresh channels), `check` and `bang` (badges). Paths in `tools/build.js` `P`. Lower-quality
actions use the existing `quality` glyph.

### 2.4 Colour (native `Ui`)

Add `OK = 0xFF47D394`. Problem disc `T1` with an `INK` glyph; its badge `INK` with a `T1` "!" and a 1.5 dp `T1` inner
ring. Lines `BORDER_STRONG`; dashes via `DashPathEffect(7, 5)`; the progress and the puck ring `PINK`. The VOD loading
bar is the seek bar's gradient fill (already allowed natively).

### 2.5 Copy rules

- The title is the cause, in his words, one line. The line under it: one sentence of evidence, one line on a card.
- One pair of Mbps figures per card or chip (audited). Mbps whole; ms for answers; seconds for waits; bars for Wi-Fi.
  A test that hit its ceiling reads `Fast` (card) or `60+ Mbps` (panel). An estimated need reads `about 12 Mbps`.
- No codec, format or protocol words (HEVC, HLS, fps, MPEG, bitrate, buffer, DNS, timeout, dBm): audited.
- Channel titles without their provider prefixes (`ESPN HD`, not `US: ESPN HD`): audited.
- Actions say what will happen: `Same game on ESPN`, `Watch the HD copy`, `Try again now`, `Network settings`,
  `Refresh channels`, `Pause and load ahead`.

## 3. While it loads (`stall-*`)

### 3.1 Timeline of a live stall (`.ts`, BUFFERING after the first frame)

The real values: the player plays again once **6 s** of picture is loaded (`bufferForPlaybackAfterRebufferMs 6000`);
a live read that gets **no bytes for 12 s** fails (`IO_NETWORK_CONNECTION_TIMEOUT` → `onPlayerError`); the `stall`
runnable fires at 12 s of BUFFERING. "Refill rate" r = growth of `getTotalBufferedDuration()` over the last 2 s, in
seconds of picture per second.

| Time | What shows | What runs |
|---|---|---|
| 0 | nothing | the stall is logged; the lag starts counting (section 8) |
| **1 s** | the **puck**: the refill ring (loaded ÷ 6 s) while r > 0, the spinner while nothing arrives | Wi-Fi readings polled each second |
| 3 s onward | **still the puck while it's recovering**: r ≥ 0.8 and (6 s − loaded) ÷ r ≤ 4 s. A routine `.ts` stall ends here around 6 s | – |
| the first second from 3 s that it **isn't** recovering | the **card**, `Still loading` with the path filling (`stall-checking`) | the quick checks in parallel (internet, stream host, account; 2 s timeout each) |
| ≈ 2 s later | the cause (4.1) | the speed test (3 s) only if C2 / C3 / C3h / C5 need splitting |
| **12 s** at the latest | the card, whatever r is | – |
| 12 s, no bytes at all | the card's right side: `Reconnecting · try 1 of 6` | the read timeout → `onPlayerError` → diagnose (4.1) → `reconnect()`: 2, 4, 8, 16, 16, 16 s (limit answers: 10, 20, 30 s) |
| 12 s, still refilling at r ≥ 0.5 | the card, no reconnect (it would throw the loaded picture away) | the `stall` runnable re-arms for 12 s; a stream still under 0.8 s per second at 45 s gets one reconnect |
| 6 failed tries, or a certain failure | the **failure card** (section 5) | – |
| it plays | the puck goes at once; the card fades out (200 ms) after 1 s of steady play | readings cached 60 s |

- **On a game channel** the card's OK is `Same game on ESPN` from the moment it opens. That replaces today's early
  failure card at `retries == 2`. Never automatic.
- **Certain causes skip the wait** and show as soon as they're known: a stopped picture with no network, a captive
  portal, a decoder error, an HTTP status.
- **A slow start** (no first frame 6 s after a tune): the zap card gives way to the card at `Still loading`.
- **Back** hides the card for that cause on that channel for 10 minutes, unless the stall turns into a failure.
- **The checks** run at most once per 15 s during a stall and once per 60 s otherwise. **The cause changes** only when
  two checks in a row agree (S7).

### 3.2 The card

| Element | Content |
|---|---|
| Spinner | 22 dp `PINK` arc left of the title, while still stalled and still trying (not on `offline`, not when loading ahead) |
| Title | the cause (4.1), Outfit 700 20/26, one line |
| Line | one sentence of evidence, Inter 500 15/20 `T2`, one line |
| Path | section 1; a reading under the problem node, and one more only when the contrast proves it (`Internet Fast` beside `Channel 3 of 9 Mbps`) |
| Keys | `OK <action>` (650 chalk) · `◀ Details` · right: `Back hides` or the next try (`Next try in 8 s`); `▲▼ Zap` while there's no action yet |

### 3.3 Movies and episodes (`stall-vod`, `stall-vod-loading`)

The same card and causes; the last node reads `Movie` / `Episode`. For a slow line the best action is **`Pause and load
ahead`** (M10):
- OK pauses, and a `CacheWriter` writes ahead into the disk cache.
- The card becomes `Loading ahead` / `3:10 loaded. Enough to watch about 6 minutes without a pause.`, with a bar showing
  how far it is to `Enough for the rest in about 8 min` (the right of the keys line).
- OK plays at any moment. The provider's other copy is the second action (in Details).

With the controls up, see 2.2.

### 3.4 Chips

| Chip | When | Content |
|---|---|---|
| **Keeps pausing** (`stall-stutter`) | the third stall ≥ 0.5 s within 5 min while playing; not in the first 10 s after a tune, not with a panel open; once per channel per 15 min (Back: 30) | the 8 s countdown ring · `This keeps pausing` / the cause in one line · `OK <action>` |
| **The Wi-Fi dropped** (`stall-offline-chip`) | `onLost` while picture is still playing | the `wifiOff` glyph · `The Wi-Fi dropped` / `Playing what's loaded`; no action, no countdown. It goes when the network's back, and becomes the card if the picture stops |

"Your team is live" wins the slot; a waiting stutter chip is dropped after 30 s.

## 4. The causes

### 4.1 The decision table (first match wins)

"r" is the refill rate (3.1); "starving" = r < 0.8 during a stall, or arrival < 0.9 × need while playing. "Need" is in
4.2. "Capacity" = the speed test + the stream's own arrival over the same 3 s. "Wi-Fi weak" = on Wi-Fi with
(bars ≤ 2 or RX link < 2 × need). "Wi-Fi-limited" = capacity ≥ 0.35 × RX link (with no link speed known: bars = 1).

| # | Signal (what must be true) | Title / line | Path | Best action (OK) | Then |
|---|---|---|---|---|---|
| C1 | no active network, picture stopped (while picture remains: the chip, 3.4) | **Your TV is offline** / The Wi-Fi dropped (`The network cable is unplugged`). airglow carries on by itself when it's back. | Wi-Fi (or Cable) **cut** `Not connected` | **Network settings** | re-tune after 2 s of `VALIDATED`, at most once per 10 s, never while stopped |
| C1c | `NET_CAPABILITY_CAPTIVE_PORTAL`, or the internet check gets anything but 204 | **Your Wi-Fi wants you to sign in** / Open its sign-in page in the TV's network settings. | Internet **cut** `Sign-in page` | **Network settings** | – |
| C8 | `DECODING_FORMAT_EXCEEDS_CAPABILITIES`, `DECODING_FORMAT_UNSUPPORTED`, or `DECODER_INIT_FAILED` again after one retry 1 s later | **This TV can't play this channel's picture** / It's 4K at a frame rate this TV can't play. Not your internet or provider. (from the `Format` against the decoder table, in words) | **TV** bad `Can't play it`; the other links ticked by `stream-bytes` | another copy (**Watch the HD copy**) | Next channel. `fail-decoder` |
| C8b | `DECODING_FAILED` twice, the format inside the decoder table | **This channel's picture is broken at your provider** / This TV can play this format, but what arrives is damaged. | Channel bad `Damaged` | another copy / feed | Try again. `fail-broken` |
| C7 | HTTP 401 / 403 / 458 / 509 or a "connections" answer, **within 60 s of this TV closing a stream** | **Your provider allows 1 stream** / It still counts this TV's last one. That clears within a minute. | Provider bad `1 of 1 in use` | **Try again now**; right `Next try in 10 s` | back-off 10, 20, 30 s. `stall-limit` |
| C7o | the same, and the account check still shows every stream in use after that | **Your provider allows 2 streams** / Both are in use, by other devices. Stop one, or wait a moment. (unknown max: `Your provider's stream limit is reached`) | Provider bad `2 of 2 in use` | **Try again now** | every 30 s |
| C7b | 401 / 403 and the account is not `Active` or past `exp_date` | **Your provider account has ended** / It expired on 19 Nov. Renew it with your provider. | Provider bad `Ended` | **Account** | failure card at once |
| C7c | 401 / 403, account active, streams free | **Your provider refused this channel** / It may not be in your package, or they may block your connection (a VPN or a new address). | Channel **cut** `Refused` | another copy / feed, else **Next channel** | Try again |
| C6b | an HTML page (not video) from a host other than the provider's, after a redirect | **Something on the way is blocking this channel** / Your internet company may block it. Private DNS in the TV's network settings may get around it. | Internet bad `Blocked` | another copy / feed | – |
| C6 | HTTP 404 / 410, or a malformed answer from the provider's own host, twice, with the stream host answering | **This channel is off at your provider** / Their server answered, but sends nothing on CNN International. | Channel **cut** `Nothing sent` | another feed / copy, else **Next channel** (named) | **Refresh channels**, Try again. `fail-channel-off`, `fail-game-feed` |
| C4x | HTTP 5xx from the stream host | **Your provider's server has a problem** / It answered with an error. airglow keeps trying. | Provider bad `Error` | **Try again now** | auto retry |
| C2 | Wi-Fi weak **and** capacity < 1.3 × need **and** Wi-Fi-limited (any error type, timeouts included, or starving) | **Your Wi-Fi is weak** / This channel needs 12 Mbps. Over this Wi-Fi it's getting 4. | Wi-Fi bad (**slow**) `1 of 4 bars`; the rest off | another copy (**Watch the HD copy**); a lower level only on streams that have them | Details: `A network cable, or the router closer, fixes it for good.` `stall-wifi-weak`, `stall-stutter` |
| C1b | both internet hosts fail (IPv4 then IPv6) **and** the stream host fails **and** `VALIDATED` drops within 3 s of `reportNetworkConnectivity(false)` | **Your Wi-Fi has no internet** / `Your router answers, but nothing gets past it. Restarting it usually fixes this.` or `The TV can't reach your router.` (gateway connect) | Internet **cut** `No answer` | **Try again now** | auto retry |
| C4b | the stream host's name doesn't resolve while the internet check passes | **Your internet can't find your provider** / Their address doesn't work from here. Your internet company may block it. | Provider **cut** `Not found` | **Try again now** | Details names Private DNS |
| C4 | the stream host's own check fails (connect or `HEAD`, 2 s) while the internet check passes and the Wi-Fi isn't weak | **Your provider isn't answering** / Your internet works. Their server hasn't answered for 20 s. | Provider **cut** `No answer` | **Try again now**; right `Next try in 8 s` | another feed / copy only if it's on a different host. `stall-provider-down` |
| C3 | starving, capacity < 1.3 × need, on a cable (or on Wi-Fi that's weak but not Wi-Fi-limited) | **Your internet is too slow for this channel** (`for 4K`) / This 4K channel needs 25 Mbps. Your internet gives 11 right now. | Internet bad (**slow**) `11 Mbps`; the rest off | another copy (**Watch the HD copy**); VOD **Pause and load ahead** | Details: `Something else on your network may be using it.` `stall-internet-slow`, `stall-vod` |
| C3h | starving, capacity < 1.3 × need, on Wi-Fi with strong bars and an RX link ≥ 2 × need | **Your connection at home is too slow** / This channel needs 12 Mbps and gets 5. The Wi-Fi signal is strong. | Wi-Fi and Internet bad (**slow**) | another copy | Details: `A network cable would show whether it's the Wi-Fi or the line.` `stall-home-slow` |
| C5 | starving, capacity ≥ 1.3 × need | **Your provider is slow with this channel** / Your Wi-Fi and internet are fine. It's their server, or the way to it. | Channel bad (**slow**) `3 of 9 Mbps`; Internet `Fast` | another **feed** (`Same game on ESPN`), else another **copy**, else **Try again now** | `stall-provider-slow`, `opt-panel-slow` |
| C12 | starving and no speed test was possible (S20), Wi-Fi not weak | **This channel is arriving too slowly** / airglow couldn't test your internet's speed this time. | Channel bad; Internet off `Not tested` | another feed / copy | Check again |
| C9 | `ERROR_CODE_BEHIND_LIVE_WINDOW` | no card; toast (2 s) `Back to live: the stream skipped ahead` | – | – | today's jump to live; lag resets |
| C10 | stalled, everything checks out, not starving | **This channel stopped for a moment** / Your internet and your provider look fine. Reconnecting. | all ticked; Channel `run` | another feed / copy, else **Try again now** | today's reconnect |
| C11 | anything else, or checks that contradict each other | **Something between this TV and your provider isn't answering** / The readings are in Details. | Internet **cut** | **Try again now** | every reading in the panel |

`Still loading` (`stall-checking`) is the card while the checks haven't answered.

### 4.2 Numbers and thresholds

| What | Rule |
|---|---|
| Need | the playing `Format.bitrate` / `averageBitrate`; for `.ts` without one: bytes ÷ media seconds gained over 10 s of steady play; before that, typical: SD 3, 720p 5, 1080p 8 (50 fps: 10), 4K 20 Mbps, shown as `about` |
| Speed test | `GET {speedUrl}` (default `https://speed.cloudflare.com/__down?bytes=25000000`; `speedUrl` from `android.json`), read for 3 s, rate from the last 2 s (past TCP start-up). Runs only to split C2 / C3 / C3h / C5 during a stall, on Check again, and in the Account check. Up to 25 MB. Cached 10 min. On 403 / 429 / 5xx / no route: no test (C12) |
| Ceiling | a test that read the full 25 MB, or above 50 Mbps: `Fast` / `60+ Mbps` |
| Has room | capacity ≥ 1.3 × need |
| Wi-Fi bars | RSSI ≥ -55: 4 · -56 to -66: 3 · -67 to -75: 2 · below -75: 1 (bars only, never dBm) |
| Which copy / level | the highest provider copy (or HLS level) whose need ≤ 0.8 × what arrives; else the lowest |
| Which feed | `otherFeeds()` order (best match first). Never switched automatically |

### 4.3 What a tick needs (its proof; `data-proof` in the mocks, audited)

| Node | Ticked when | Proof |
|---|---|---|
| TV | frames render (or the format is inside the decoder table) | `frames` / `decoders` |
| Wi-Fi / Cable | connected and not weak (Wi-Fi), or the speed test says it carries enough | `link` |
| Internet | the 204 check passed; on a speed card, also capacity ≥ 1.3 × need | `probe-204` / `sample` |
| Provider | the stream host answered its own check | `stream-host` |
| Channel | arrival ≥ need, measured | `arrival` |
| any | the stream's data came through it (decoder and broken cards) | `stream-bytes` |

Nothing past a cut is ticked; past a slow problem link, Internet and Channel are ticked only if measured directly.

### 4.4 The actions for live `.ts` (the owner's channels)

1. **Another feed of the game** (`Same game on ESPN`): only on game channels; its own score delay (section 8).
2. **Another copy of the channel** (`Watch the HD copy`), from `versions` (requested at the card's first second).
3. **Try again now** (a reconnect), or **Next channel** (named) when the channel is off.
4. **Refresh channels** for a 404 (the provider may have renumbered it).

Levels (`Switch to 720p`) only where the stream has them. No "other stream type".

## 5. When it stops (`fail-*`)

The failure card is today's `FailedCard` (a focused `ListPanel` at the card's anchor) with the cause on top: the title
and line from 4.1, the path, then the action rows (first focused), then `Back closes`. It replaces `This feed stopped`
and `This channel stopped · Reconnected 6 times. The provider may be down.`. It shows after 6 failed reconnects, or at
once for C7b, C8 and C8b.

| Rows, in order | When |
|---|---|
| The game's other feeds (logo, name, `Feed 2 of 3 · HD · Best match`, LIVE) | a game channel (`fail-game-feed`); no score or clock |
| The best action (4.4) | otherwise |
| `Refresh channels` | C6 |
| `Try again` / `Try this feed again` | always, last |

Catch-up's cards keep their copy; when the diagnosis knows more, the path goes under their title.

## 6. Options > Connection (`opt-connection`, `opt-during-stall`)

A row in Options, live and VOD, right under Quality: `signal` glyph, `Connection`, a line with the one number that
matters, and the verdict as its value (`Good` / `Slow` / `Weak Wi-Fi` / `Offline` / `Provider` / `Checking…`). **While a
card or chip shows, it's the first row and focused** (◀ = Details), then Other feeds. OK (or ▶) opens the panel.

## 7. The Connection panel (`opt-panel-good`, `opt-panel-slow`)

Left, 400 dp, height = content (≤ 453).

| Part | Content |
|---|---|
| Header | `Connection` · right: `Checked 01:52`, the time of the **last check** |
| Verdict | Outfit 18/24: `All good` or the cause; line 14/18 |
| The vertical path | **TV** `Plays this channel fine` · `14 s ahead` · **Wi-Fi** `Strong signal` · `3 of 4 bars` · **Internet** `Answers in 38 ms` · `60+ Mbps` (or `Not tested yet`) · **Provider** (the stream host) `Answers in 90 ms · 1 of 2 streams in use` (the account reading) · **Channel** `Arriving steadily` · `12 Mbps` (bad: `Getting 3 of the 9 Mbps it needs` · `1 s ahead`) |
| Actions | the best action focused, then the next, then `Check again` (`Includes a 3 s speed test`); all good: only Check again |

Readings update in place every second while it's open. Opening runs the quick checks if they're over 60 s old; the
speed test only on Check again.

## 8. Live NBA: the score delay and the shield

1. **No score, clock, period, `Final` or result word** on any surface here (card, chips, panel, failure card, Account
   sheet). Games are named by title, feeds by channel and `Feed 2 of 3`. Audited on the 6 shield mocks.
2. **The lag (engineering's measure, M7).** lag = wall-clock time − playback progress since the last steady READY after
   a (re)connect, reported to the app; **every score surface shows the score at delay + lag**. During the stall itself
   lag grows second by second, so the score bug, the game panel, the banner and Live games hold still with the picture.
   - **Unknown** (no steady READY yet, a clock jump): lag = all stall time since the last connect.
   - **Resets** only on a reconnect or a new tune (a `.ts` reconnect starts at the live point again).
   - **The stored delay never changes** because of a stall; `Sync score` stores `measured − lag`.
3. **The Final is held too.** The `in` → `post` change (the Final, the final score, "seen") reaches every surface only
   after delay + lag. Today `games.js` `delayed()` returns the live game once ESPN says `post`, up to the full delay
   before the picture's buzzer: fix it with this (11.5).
4. **Switching** to another feed or copy (from the card, chip, panel or failure card) goes through `pick(id,
   "diagnosis")` and uses **that channel's own stored delay** (or 60 s), with lag 0. Never automatic. No stream-type
   switch exists (M8).
5. The checks never call ESPN.

## 9. States and edge cases

| Case | Behaviour |
|---|---|
| Recovers | puck gone at once; card fades after 1 s of steady play |
| The cause changes | only when two checks agree (certain causes at once); title, line, path and action change in place; OK is locked for 1 s |
| A panel or sheet is open | the card waits; the puck still shows |
| Zap during a stall | the card goes; the new channel starts clean |
| The Wi-Fi flaps | one re-tune per 10 s, only after 2 s of `VALIDATED` |
| In the TV's Network settings | nothing re-tunes until airglow is back in front (`onStart`) |
| M3U provider (no `player_api.php`) | no account reading; the stream host check is the same |
| `max_connections` unknown | `Your provider's stream limit is reached`; no `1 of 2` |
| No speed test possible | C12 for the slow cases (no side claimed), unless the Wi-Fi alone settles it |
| The hint bar's 5-view rule | the card's own keys line counts as a view |

## 10. Data

### 10.1 Permissions

Add `ACCESS_NETWORK_STATE` and `ACCESS_WIFI_STATE` (normal, granted at install; no location: no Wi-Fi name).

### 10.2 Passive, while playing (`Health`, about 1 KB)

| Signal | Source | For |
|---|---|---|
| Arrival (bytes / s, 1 s buckets, 60 s) and the **final host** | a `TransferListener` on the `DefaultHttpDataSource.Factory` (`onTransferStart` gives the `DataSpec` after redirects) | starving, `getting 4`, the stream-host check |
| Refill rate, loaded ahead | `getTotalBufferedDuration()` sampled each second | the timeline, starving |
| Need | 4.2 | the numbers |
| Stalls | `onPlaybackStateChanged` | the timeline, the stutter chip, `3 pauses in 5 min` |
| Errors | `PlaybackException.errorCode`; `InvalidResponseCodeException.responseCode`, headers and the first 2 KB of body (connections? HTML?); `UnknownHostException` | 4.1 |
| Network | `registerDefaultNetworkCallback`: transport, `VALIDATED`, `CAPTIVE_PORTAL`; `LinkProperties` gateway; RSSI and RX link speed (S9) | C1, C1b, C1c, C2, C3h |
| Decoders | `MediaCodecList` once per launch | C8 / C8b, `Plays up to 4K HDR` |
| Alternatives | `otherFeeds()`, `versions`, track levels | 4.4 |
| Lag | engineering's measure | section 8 |

### 10.3 Active checks (only when a stall or a check asks)

| Check | Request | Pass | Time |
|---|---|---|---|
| Internet | `GET https://connectivitycheck.gstatic.com/generate_204`, then `http://cp.cloudflare.com/`; IPv4 first, IPv6 300 ms later | **204 only** (anything else: captive portal) | 2 s each |
| Stream host | TCP connect + `HEAD /` on the final host and port (never the stream path) | any HTTP answer = answering; 5xx = C4x | 2 s |
| Account | Xtream `player_api.php` (status, `exp_date`, `active_cons`, `max_connections`) | for C7 / C7b / C7c and the readings only | 2 s |
| Gateway | TCP connect to the default gateway, port 80 or 53 | splits C1b's line | 1 s |
| Speed test | 4.2 | – | 3 s |
| Last channel (Account check, 2+ stream accounts only) | the last channel's stream, 5 s; then poll the account until the stream's freed (≤ 60 s) | arrival vs need | 5 s + |

The provider's password goes only to the provider, as at login.

### 10.4 Events to the web side

`diag {cause, title, line, readings}` when a card shows or changes; `lag {ms}` (engineering's).

### 10.5 Threading (S18)

- `onBytesTransferred` runs on loader threads: counters are `AtomicLong` buckets, read on the player thread.
- Checks run on one single-thread executor, at most one set in flight; results are posted to the player `Handler`;
  cancelled on zap, `onStop` and a new set.
- The 1 s `Health` sample rides the existing `tick` runnable (no new timer).

## 11. Port checklist

1. **Manifest:** the two permissions.
2. **`Ui`:** `OK`; the glyphs (2.3); a `PathView` (horizontal / vertical, node states with tick and "!" badges, link
   states with `DashPathEffect`), one `invalidate()` per change; the puck's refill ring (the chip's `Ring` view).
3. **`PlayerActivity`:**
   - `SHOW_BUFFERING_NEVER`; the puck;
   - `Health` (10.2) and the checks (10.3, 10.5);
   - the timeline (3.1) on the real load control: the "recovering" test, the 12 s rules, no reconnect while r ≥ 0.5;
   - `diagnose()` = 4.1 as an ordered rule list, with two-check hysteresis;
   - reconnect waits 2, 4, 8, 16, 16, 16 s; limit back-off 10, 20, 30 s; remember when this TV last closed a stream;
   - the card (today's `card` plus line, `PathView`, keys line); the OK lock (S11); Back's 10-minute memory;
   - remove the `retries == 2` early failure card for game channels (the card's OK replaces it);
   - ◀ while a card or chip shows: Options with Connection first and focused; Hold OK untouched (Last channel);
   - the chips (`chipIsDiag`, 8 s; the team chip wins);
   - `showFailed()` takes the diagnosis (section 5);
   - Options' `Connection` row; `openConnection()` (`ListPanel` 400 with the verdict and the vertical `PathView`);
   - network re-tune rules (S8).
4. **VOD:** `SimpleCache` + `CacheDataSource` + `CacheWriter` for Pause and load ahead (M10); with the controls up the
   card takes no keys.
5. **`games.js`:** add lag to every score surface (engineering); hold `in` → `post` by delay + lag in `delayed()`
   (today's bug); `Sync score` stores `measured − lag`; a switch from the diagnosis uses the new channel's delay.
6. **`TunerPlayerPlugin`:** the `diag` event; `connectionCheck()` for Account (progress events per node).
7. **Account (`screens/account.js`):** the row under Check the guide; the sheet (`dg-sheet`). The rows' right edge at
   x 906 (today's page puts the ring at 917).
8. **`UI-SPEC.md` section 7 (for its owner):** add the exception "a card may cover the centre only while the picture is
   frozen and not recovering"; drop the stale "Report lives here" from the failure card rows.
9. **`android.json`:** an optional `speedUrl`.
10. **Tests:** a debug intent (`--es diag <cause>`) that forces each cause so the emulator test screenshots each card;
    a forced 10 s stall that checks every score surface holds still and resumes at delay + lag; a forced `post` that
    checks the Final waits for delay + lag.

## 12. Self-check (`node tools/audit.js`)

The catch-up audit's checks on all 25 mocks: one ring, text under 14 px, overlaps, clipping, the safe area (every card,
panel, chip and sheet inside x 48 to 912, y 27 to 513), CONTAIN, contrast, the RING pixel check, and SPOILER on the 6
shield mocks. **v1.1 adds nine checks**, one per checkable review point:

| Check | Fails when | Review |
|---|---|---|
| BADGE | a problem node has no "!" badge | S16 |
| TICK | a tick has no proof; a node past a cut is ticked; Internet / Channel past a slow problem are ticked without a direct measure | S6 |
| CHIP | a chip is wider than 420 | S12 |
| PANEL | a panel is taller than 453 | UI-SPEC 7 |
| JARGON | HEVC, HLS, fps, MPEG, bitrate, buffer, DNS, timeout, dBm, codec… on a diagnosis surface | S17 |
| PAIR | more than one pair of Mbps figures on a card or chip | 2.5 |
| TITLE | a channel title keeps its `US:` prefix | nit |
| KEYS | a Hold OK key cap bound to anything but Last | S10 |
| ELLIPSIS | a reading on a panel or path row is cut short | v1.1 (it caught three during this round) |

**Result: 25 pages, 0 findings.**

**The checks fire when the v1.0 faults are put back.**
- `--inject-v11` puts back, on 3 mocks: a 440 dp chip with "HEVC at 100 fps", `US: ESPN HD` and `Hold OK Details`; a
  problem node without its badge; and a tick past a cut. It reports BADGE ×3, CHIP ×3, JARGON ×3, KEYS ×3, TITLE ×3 and
  TICK ×1. The tick fault fits only one of the 3 mocks.
- `--inject` (scores, a remaining time, a dated title, a focused Reveal) still fires on the shield mocks.
- PAIR, PANEL and ELLIPSIS weren't injected. ELLIPSIS fired for real during the round.

| Mock | Focused | Ring white, all sides | Ring box | To the safe edge |
|---|---|---|---|---|
| stall-* (13) | none by design (HUD cards and chips, the action chip's model) | – | – | – |
| fail-channel-off, fail-game-feed | first row (inset) | 100% | 217, 239, 743, 291 | 169 |
| fail-decoder, fail-broken | first row (inset) | 100% | 217, 295, 743, 347 | 166 |
| opt-connection | Connection (inset) | 100% | 59, 288, 377, 336 | 11 |
| opt-during-stall | Connection, first (inset) | 100% | 59, 80, 377, 128 | 11 |
| opt-panel-good | Check again (inset) | 100% | 59, 379, 437, 429 | 11 |
| opt-panel-slow | Same game on ESPN (inset) | 100% | 59, 361, 437, 411 | 11 |
| acct-provider | Check the connection | 100% | 267, 379, 911, 445 | 1 (v1.0: −5) |
| acct-check-running | the text body (nothing to press while it runs) | – | – | – |
| acct-check-done, acct-check-wifi | Run again | 100% | 444, 464, 594, 512 | 0.8 |

**Measured boxes:**
- the stall cards: 138 to 208 dp tall (top y 236 at most);
- the failure cards: 314 to 370;
- the panels: 374, 415 and 451 (cap 453);
- the chips: 229 and 390 wide;
- the sheet: 486.

**Couldn't verify:**
- **On the Philips:**
  - how the "!" badge, the green tick and the refill ring read from the sofa;
  - the RSSI and RX link speed this TV reports;
  - whether the hosts can be reached (`gstatic`, Cloudflare);
  - Private DNS in its settings.
- **On the owner's provider:**
  - its real limit answer (401, 403 or 509, with or without a body);
  - how long it keeps counting a closed stream;
  - whether its streams redirect to a separate host;
  - how often its `.ts` feeds stall long enough to pass the "not recovering" test.
- **On the TV's storage:** the disk room for the VOD cache.

The decision table is designed against these facts, not tested on real faults.

## 13. Open questions (for the owner)

1. **The speed test** downloads up to 25 MB from Cloudflare, only when a stall needs it, on Check again and in the
   Account check. OK, or never automatically?
2. **Drop to a lower copy automatically** when your Wi-Fi or internet is the cause? It asks now (OK), because Quality's
   default is "Best available". A setting `Step down when the connection is slow` could do it for you, except on game
   feeds (the score delay).
3. **A small connection log** in Account > Provider (`Last stalls`: time, channel, cause), to see whether it's always the
   same channel or always 21:00? Cheap to add, not designed yet.
4. **"Try the other stream type"** (HLS instead of MPEG-TS) is out of the player for now. Worth building later as a
   per-channel setting, with its own score delay?
