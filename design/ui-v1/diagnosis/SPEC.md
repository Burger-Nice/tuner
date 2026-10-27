# airglow TV: playback diagnosis, v1.0

The owner: *"when stuff is buffering or loading or something when I am watching live, I want to know if its my internet
or the provider, or just in general what the issue is"*.

This is the design spec for the engineer. It extends `design/ui-v1/UI-SPEC.md` v1.2 section 7 (the native player) and
fits beside `design/ui-v1/catchup/SPEC.md` 6.7 (its split failure cards). Everything not said here follows those.

| File | What it is |
|---|---|
| `SPEC.md` | this |
| `*.html` (20) | the mocks at 960 x 540; `png/*.png` are their 2x renders, `png/contact-sheet.png` shows all of them |
| `diagnosis.css` | the new classes, prefix `dg-`. The player parts are native views measured here in dp (1 dp = 1 CSS px on the canvas); `dg-sheet` is web and goes into `app/tv/app.css` |
| `tools/build.js` | writes the mocks and `tools/pages.json` |
| `tools/render.js` | the PNGs and the contact sheet |
| `tools/audit.js` | the self-check (section 12); ring data in `tools/audit-rings.json` |

**Scenario (section 0).** Tue 27 Oct 2026, 01:52 on the owner's TV (Reykjavik time, UTC). Grizzlies at Jazz is live on
NBA League Pass 4 (41), also on US: ESPN HD (210) and NBA TV. Shield: My team. Every speed, bitrate, latency and channel
in the mocks is illustrative.

## 1. The idea in one picture: the path

Every message names **which side the problem is on**, and shows it on one picture, **the path**:

`TV · Wi-Fi (or Cable) · Internet · Provider · Channel` (the last reads `Movie` or `Episode` for VOD)

- The links that answered carry a **green tick** (`--a-ok`, always with its icon).
- The problem link is a **chalk disc with an ink glyph** and its reading under it in chalk (`1 of 4 bars`, `3 of 9 Mbps`,
  `No answer`). Chalk on ink already means "look here" in the kit (the scrub bubble).
- The line into it is **dashed** when it works but too slowly, **cut** when nothing gets through. Links past a cut are
  dotted outlines with no tick (not reached).
- While checks run, each line **fills with the pink progress** as its answer comes back.
- **No amber, no yellow, no red** (red stays LIVE). A warning is a chalk disc plus the words, never a colour alone.

The title always says the side in its first words: **"Your …"** is the owner's side (TV, Wi-Fi, internet, account);
**"Your provider …" / "This channel …"** is theirs. One number pair where it settles the question (`needs 12 Mbps,
getting 4`), no jargon (no dBm, codes, "bitrate", "buffer underrun").

## 2. Rules every surface follows

### 2.1 Geometry

| What | Value |
|---|---|
| Stall card | bottom centre, **560 wide**, bottom edge **y 444** (the existing status card's anchor, `bottomMargin 96`), height = content: **190 to 208 dp** (y 236 to 444). Radius 16, `PANEL` fill, 1 dp border, padding 16 / 20 / 14, gap 12 |
| Spinner puck | 56 dp circle, same anchor (y 388 to 444), spinner 28 dp, `PINK` arc 2.6 dp |
| Failure card | same anchor and width, focused list rows 52 dp, height = content (y 74 to 444 with three rows) |
| Stutter chip | the action chip: right 48, 64 from the bottom, max **440** wide |
| Connection panel | left 48, top 27, **400 wide**, height = content, **cap 453** (all-good 415, during a stall 451) |
| Account check sheet | the right sheet, **480 wide**, y 27 to 513 |
| Path, horizontal | 5 nodes of 88 dp; disc **32 dp**, glyph 18, tick badge 16 dp (offset right -8, bottom -5, 2 dp ring in the card colour); label Inter 650 14/18 (6 dp under the disc); reading 14/18 `text-2` (chalk 650 on the problem link); lines 2 dp (3 dp dashed 7/5) from centre to centre, under the discs |
| Path, vertical | rows **44 dp** (sheet 54), disc 32, gap 16; label 650 15/20, reading 14/18 (ellipsis), value right 650 15/20; connector 2 dp at the disc centre |
| Text | 14 dp minimum everywhere; titles Outfit 700 20/26 (card), 18/24 (panel verdict), 22/28 (sheet) |

**Out of the picture's way.** The puck is the only thing during a blip, and it replaces PlayerView's **centre** spinner
(`setShowBuffering(SHOW_BUFFERING_NEVER)`), so nothing sits in the middle of the picture any more. The card only opens
when the picture has been **frozen for 3 s** (there is nothing to watch underneath), and it goes the moment it moves.
When the picture is moving but keeps pausing, it's the chip in the corner, never the card. The score bug (top right),
the banner (top) and the hint bar (bottom) never collide with the card.

### 2.2 Keys

| Surface | Focus | OK | Hold OK | Back | Other keys |
|---|---|---|---|---|---|
| Puck | none | as always (channels) | as always | as always | as always |
| Stall card | **none** (the action chip's model: the card shows its keys) | **the one best action** (section 4) | **Details**: the Connection panel | **hides it** for this stall | ▲▼ zap, ◀ Options, ▶ game, digits: work as always; the card goes (a new tune starts fresh) |
| Stutter chip | none | its action | Details | dismiss | any other key dismisses (as the chip) |
| Failure card | first row (inset ring) | the row | – | close (the player stays on the dead channel, as today) | ▲▼ move |
| Connection panel | first action row | the row | – | back to Options (or closes, when opened from the card) | ▲▼ move |
| Account sheet | Run again (when done); the text body while running | Run again | – | stop / close | – |

While the card or chip shows, the hint bar (when it shows at all: first 5 times, then on Info) reads
`OK <action> · Hold OK Details · Back Hide · ▲▼ Zap`. Hold OK means **Last channel** again once the card is gone.

### 2.3 New glyphs (`Ui.Icon`, 24 grid, 2 dp stroke, round caps)

`tv` (exists), `wifi` and `wifiWeak` (outer two arcs at 30 %), `wifiOff` (arcs at 30 % + slash), `cable` (plug),
`globe`, `server`, `stream` (broadcast), `signal` (four rising bars, Options), `gear`, `lower` (arrow down to a line:
lower quality), `swap` (the other stream type). Paths are in `tools/build.js` `P`.

### 2.4 Colour (native `Ui`)

Add `OK = 0xFF47D394` (`--a-ok`). The problem disc is `T1` with an `INK` glyph. Lines `BORDER_STRONG`; dashed chalk is a
`DashPathEffect(7, 5)`; the progress fill is `PINK`. Badge ring = `BG1`. Nothing else new.

### 2.5 Copy rules

- The title is the cause, in the owner's words. The line under it is one sentence of evidence (≤ 1 line on the card).
- Numbers: Mbps as whole numbers (`48 Mbps`, `3 of 9 Mbps`; one decimal only under 10 in the panel and sheet), ms for
  answers, seconds for waits, bars for Wi-Fi (`1 of 4 bars`). 24 h times (`Checked 01:52`).
- The action is a verb phrase that says what will happen: `Same game on ESPN`, `Switch to 720p`, `Watch the HD copy`,
  `Try again now`, `Network settings`, `Pause and load ahead`.

## 3. While it loads (`stall-*`)

### 3.1 Timeline of a live stall (BUFFERING after the first frame)

| Time | What shows | What runs |
|---|---|---|
| 0 | nothing | stall clock starts; the score bug freezes (section 8); the rebuffer is logged |
| **1 s** | the **puck** (`stall-puck`) | – |
| **3 s** | the **card**, `Still loading` / `Checking your Wi-Fi, internet and provider…` with the path filling (`stall-checking`) | the quick checks, in parallel, 2 s timeout each (10.3) |
| ≈ 5 s | the **cause** replaces `Still loading` (the spinner stays while it's still stalled) | the 3 s speed sample, only if the slow cases need splitting (4.2) |
| 12 s | same card; the right of the keys line reads `Reconnecting · try 1 of 6` or the next countdown | today's reconnect (1, 2, 4, 8, 16 s); the checks re-run at most every 15 s and the cause may change |
| 6 failed tries | the **failure card** (section 5) | – |
| any time it plays | the puck goes at once; the card fades out (200 ms) after **1 s of steady playing** | the readings stay cached 60 s for the panel |

- **Certain causes skip the wait:** Android says there is no network (`stall-offline`: at 1 s, no checks), a decoder
  error, an HTTP status (section 4). These show their card as soon as they're known.
- **A slow start** (no first frame 6 s after a tune): the zap card gives way to the card at the `Still loading` step.
  Under 6 s the zap card is enough (zapping is not a stall).
- **Not for a blip:** under 3 s there is never a card; the puck alone, and only from 1 s.
- **Back** hides the card for this stall. It won't open again **for the same cause on this channel for 10 minutes**,
  unless the stall becomes a failure (the stream is dead, so the failure card shows regardless).

### 3.2 The card (`stall-provider-slow` and the others)

| Element | Content | Notes |
|---|---|---|
| Spinner | 22 dp `PINK` arc, left of the title | only while still stalled and still trying; gone for `offline` (nothing to try) |
| Title | the cause (4.1) | Outfit 700 20/26, one line |
| Line | one sentence of evidence | Inter 500 15/20 `T2`, one line |
| Path | section 1 | readings only under the problem link and, when it is the contrast that proves it, one more (`Internet 48 Mbps` beside `Channel 3 of 9 Mbps`) |
| Keys | `OK <action>` (650 chalk) · `Hold OK Details` · right: `Back hides`, or the next try (`Next try in 8 s`) | the key caps are `.kbd` (surface-2, 650 14) |

### 3.3 Movies and episodes (`stall-vod`)

The same card and causes; the last node reads `Movie` / `Episode`; the titles say `for this movie`. The best action for
a slow line is **`Pause and load ahead`**: OK pauses, and the card's line becomes `Loaded 0:42 ahead · OK to play`
(counting up from `getTotalBufferedDuration()`); OK plays. The lower-quality copy is the second action (in Details).
If the controls are up, the card sits above the bar (bottom edge y 360) and the controls' 4 s hide timer still runs.

### 3.4 Keeps pausing (`stall-stutter`)

Short stalls that never reach 3 s can still ruin a game. On the **third stall ≥ 0.5 s within 5 minutes** while the
picture is playing again: the chip, `This keeps pausing` / the cause in one line / `OK <action>`, with the chip's
countdown ring (**10 s**, pink). Rules as the action chip: never in the first 10 s after a tune, not while a panel is
open, dismissed by any other key. **Once per channel per 15 minutes** (Back: 30 minutes). If the checks find nothing
wrong, it says `Your internet and provider look fine` and offers `Try the other stream type` (or another feed).

## 4. The causes

### 4.1 The decision table

Read top to bottom; the **first row that matches wins**. "Starving" = the stream arrives slower than it plays (10.2).
"Need" = the channel's bitrate (10.2). "Sample" = the 3 s internet speed sample (10.3).

| # | Signal (what must be true) | Title / line | Path | Best action (OK) | Then (Details, failure card) |
|---|---|---|---|---|---|
| C1 | `ConnectivityManager`: no active network, or `onLost` | **Your TV is offline** / The Wi-Fi dropped (`The network cable is unplugged`). airglow carries on by itself when it's back. | Wi-Fi (or Cable) **cut**, `Not connected` | **Network settings** (`Settings.ACTION_WIFI_SETTINGS`, falls back to `ACTION_SETTINGS`) | on `onAvailable`: tune again at once, card goes |
| C1b | network up but not `NET_CAPABILITY_VALIDATED`, **and** the Google probe fails, **and** the provider probe fails | **Your Wi-Fi has no internet** / The TV is connected, but nothing gets through. Restarting the router usually fixes it. | Internet **cut**, `No answer` | **Try again now** | auto retry |
| C8 | `ERROR_CODE_DECODER_INIT_FAILED`, `DECODING_FORMAT_EXCEEDS_CAPABILITIES`, `DECODING_FORMAT_UNSUPPORTED`, or `DECODING_FAILED` twice | **This TV can't play this channel's picture** / It's sent as 4K HEVC at 100 fps, more than this TV can decode. Not your internet or provider. (from the `Format`: codec, height, frame rate) | **TV** bad, `Can't decode` | a copy of the channel in a lower quality (**Watch the HD copy**) | Next channel. No retries (as today). `fail-decoder` |
| C7 | HTTP 401 / 403 / 458 / 509, or a body or reason naming connections, **and** the provider probe's `active_cons ≥ max_connections` | **Your provider allows 2 streams** / Both are in use, by other devices. Stop one, or wait a moment. (unknown max: `Your provider's stream limit is reached`) | Provider bad, `2 of 2 in use` | **Try again now** | retries by itself every 5 s, 3 times (catch-up 6.5); `stall-limit` |
| C7b | 401 / 403 and the probe says `status` isn't `Active` or `exp_date` has passed | **Your provider account has ended** / It expired on 19 Nov. Renew it with your provider. | Provider bad, `Ended` | **Account** (opens Account > Provider) | failure card at once |
| C7c | 401 / 403, account active, streams free | **Your provider refused this channel** / Your internet and account are fine. It may not be in your package. | Channel **cut**, `Refused` | another copy / feed, else **Next channel** | Try again; the Details line names Account > Playback > User agent |
| C6 | HTTP 404 / 410, or `PARSING_*_MALFORMED` (an error page instead of video), **twice**, with the provider probe answering | **This channel is off at your provider** / Your provider answered, but isn't sending anything on CNN International. | Channel **cut**, `Nothing sent` | another feed of the game, else another copy, else **Next channel** (named: `116 · BBC News`) | Try again. `fail-channel-off`, `fail-game-feed` (`This feed is off at your provider`) |
| C4 | Google probe OK, and the provider probe times out / refuses / 5xx, or the stream fails with `IO_NETWORK_CONNECTION_FAILED`/`TIMEOUT`/HTTP 5xx while Google answers | **Your provider isn't answering** / Your internet works. Their server hasn't answered for 20 s. | Provider **cut**, `No answer` | **Try again now**; right: `Next try in 8 s` | another feed / copy only if it's on a **different** server host; `stall-provider-down` |
| C4b | as C4, but the provider's host doesn't resolve (`UnknownHostException`) | **Your internet can't find your provider** / Your internet works, but their address doesn't. It may have moved, or your internet company may block it. | Provider **cut**, `Not found` | **Try again now** | – |
| C2 | starving, on Wi-Fi, and **1 bar**, or **2 bars with** link speed < 3 × need or sample < 1.3 × need | **Your Wi-Fi is weak** / This channel needs 12 Mbps. Over this Wi-Fi it's getting 4. | Wi-Fi bad (**dashed**), `1 of 4 bars` | a lower level that fits: **Switch to 720p** (needs ≤ 0.8 × what arrives) | a lower copy; Details adds `A network cable, or the router closer, fixes it for good.` `stall-wifi-weak` |
| C3 | starving, and sample < 1.3 × need (or the Google probe > 800 ms with no sample) | **Your internet is too slow for this channel** (`for 4K` when the channel is 4K) / This 4K channel needs 25 Mbps. Your internet gives 11 right now. | Internet bad (**dashed**), `11 Mbps` | lower level, else lower copy (**Watch the HD copy**); VOD: **Pause and load ahead** | Details adds `Something else on your network may be using it.` `stall-internet-slow`, `stall-vod` |
| C5 | starving, and sample ≥ 1.3 × need (the internet has room) | **Your provider is slow with this channel** / Your internet is fine. This channel is arriving too slowly. | Channel bad (**dashed**), `3 of 9 Mbps`; Internet reads `48 Mbps` | another **feed of the game** (`Same game on ESPN`), else another **copy** (`Watch the HD copy`), else **Try the other stream type** | lower quality; wait. `stall-provider-slow` |
| C9 | `ERROR_CODE_BEHIND_LIVE_WINDOW` | no card. Toast (2 s): `Back to live: the stream skipped ahead` | – | – | today's jump to live |
| C10 | stalled, and everything checks out (online, both probes answer, not starving) | **This channel stopped for a moment** / Your internet and your provider look fine. Reconnecting. | all ticked; Channel `run` | **Try the other stream type**, or another feed | today's reconnect |

`Still loading` (`stall-checking`) is the card while the checks of 3.1 haven't answered.

### 4.2 Thresholds and how the slow cases split

| What | Rule |
|---|---|
| Starving | arrival over the last 10 s < **0.9 × need** while less than **5 s** is loaded ahead, or the loaded-ahead time falls by ≥ 0.3 s per second for 10 s |
| Need | the playing `Format.bitrate` (HLS `BANDWIDTH`), else `averageBitrate` / `peakBitrate`, else **estimated** for raw `.ts` (10.2). Shown rounded up |
| The sample (3 s) | runs **only** to split C2 / C3 / C5 during a stall, on Check again, and in the Account check; never while playing normally. Cached 10 minutes |
| Has room | sample ≥ **1.3 ×** need. Between 1.0 and 1.3: C3 with `only just fast enough` in Details |
| Wi-Fi bars | RSSI ≥ -55: 4 · -56 to -66: 3 · -67 to -75: 2 · below -75: 1 (shown as bars, never as dBm) |
| Which lower level | the highest HLS variant (or provider copy) whose bitrate ≤ 0.8 × what arrives now; if none, the lowest; if there's only one quality, the action falls to the next in the row |
| Which feed / copy | the game's other feeds in `otherFeeds()` order (best match first); copies from the Quality sheet's `versions` list. Never switched automatically (UI-SPEC 7: each feed has its own score delay) |
| How often the checks run | at most once per 15 s during a stall, once per 60 s otherwise; the panel's open runs them unless they're under 60 s old |

## 5. When it stops (`fail-*`)

The failure card is today's `FailedCard` (a focused `ListPanel` at the card's anchor) with the cause on top:
title and line from 4.1, the path, then the action rows (first focused), then `Back closes`. It replaces both
`This feed stopped · Grizzlies at Jazz is also on` and `This channel stopped · Reconnected 6 times. The provider may
be down.` (a guess the owner can't act on). It shows after 6 failed reconnects, or at once for C7b and C8.

| Rows, in order | When |
|---|---|
| The game's other feeds (logo, name, `Feed 2 of 3 · HD · Best match`, LIVE) | a game channel (`fail-game-feed`). As today; no score or clock |
| The best action of 4.1 (`Watch the HD copy`, `Next channel` named with its number and name) | otherwise |
| `Try again` / `Try this feed again` | always last but one |
| `Report` | stays where today's card has it (UI-SPEC 7) |

Catch-up's cards (`player-connlimit`, `This replay didn't start`, …) keep their copy; when the diagnosis knows more
(C4 or C3 behind a replay that didn't start), the path is added under their title, nothing else changes.

## 6. Options > Connection (`opt-connection`)

A new row in Options, live and VOD, **right under Quality**: glyph `signal`, `Connection`, a line with the one number
that matters, and the verdict as its value.

| Value | Line | When |
|---|---|---|
| `Good` | `Steady · needs 12 Mbps` | not starving, ≥ 5 s ahead, no stall in 2 min |
| `Slow` | `3 pauses in 5 min` or `Getting 3 of 9 Mbps` | starving or the stutter count is 2+ |
| `Weak Wi-Fi` / `Offline` / `Provider` | the cause's short line | a cause from 4.1 is current |
| `Checking…` | – | the first 3 s after a tune |

OK opens the panel (`chevron`, ▶ opens it too, as other rows).

## 7. The Connection panel (`opt-panel-good`, `opt-panel-slow`)

Opened from Options > Connection, or **hold OK on the card or chip**. Left, 400 dp, height = content (≤ 453).

| Part | Content |
|---|---|
| Header | `Connection` · right: `Checked 01:52` (14 `T3`) |
| Verdict | Outfit 18/24: `All good`, or the cause's title; line 14/18: `This channel needs 12 Mbps and your internet does 48, so there's room.` / `Your internet has room. 3 pauses in the last 5 min.` |
| The vertical path | **TV** `Plays up to 4K HDR` · value `14 s ahead` (loaded ahead) · **Wi-Fi** `Strong signal` · `3 of 4 bars` (Cable: `Network cable` · –) · **Internet** `Answers in 38 ms` · `48 Mbps` (or `Not tested yet`) · **Provider** `Answers in 240 ms · 1 of 2 streams in use` · **Channel** `Arriving steadily` · `12 Mbps` (bad: `Arriving at 3 of the 9 Mbps it needs` · `3 Mbps`) |
| Actions | the best action, focused (`Same game on ESPN` / `Feed 2 of 3 · HD`), then the next (`Try the other stream type`), and `Check again` (`Includes a 3 s speed test`) last; when all is good, only Check again |

The readings update every second while it's open (no re-layout: values change in place). Opening runs the quick checks
(under 2 s); the speed sample only on Check again. Back returns to Options, or closes when opened from the card.

## 8. Live NBA: the score delay and the shield

1. **No score, clock, period, `Final` or result word on any surface here**: card, chip, panel, failure card, Account
   sheet. Games are named only by title (`Grizzlies at Jazz`) and feeds by channel and `Feed 2 of 3`. The shield mocks
   are audited for it (section 12).
2. **A stall must not let the score run ahead of the picture.** While the stream is stalled the picture stops but the
   clock doesn't. So:
   - while BUFFERING after the first frame, the **score bug freezes** (it stops updating; the banner and game panel
     show the last value they had);
   - when playback resumes behind where it was (HLS resumes from its buffer), the player reports the extra lag
     (`lag` = `player.getCurrentLiveOffset()` now − the offset at the last steady READY, ≥ 0) on a new `lag` event;
     `games.js` adds it to the channel's delay for **every** score surface until it decays back to 0 (Media3's live
     speed control closes it slowly) or a reconnect restarts at live (then 0);
   - `.ts` streams that reconnect start at the live point again: `lag` = 0 at the new first frame.
   - **The stored per-channel delay never changes** because of a stall. `Sync score` stores `measured − lag`, so a sync
     taken mid-lag isn't wrong afterwards.
3. **Switching feeds** from the card or panel goes through today's `pick(id, "diagnosis")`, so the new feed uses its own
   stored delay (or 60 s). Never automatic.
4. The checks never call ESPN; no extra score requests.

## 9. States and edge cases

| Case | Behaviour |
|---|---|
| Recovers | puck gone at once; card fades after 1 s of steady play; no "fixed" message (the moving picture says it) |
| Cause changes mid-stall | the card's title, line and path change in place (no re-animation); the action follows |
| A panel or sheet is open | the card waits; the panel's own content shows nothing new. The puck still shows |
| Zap during a stall | the card goes; the new channel starts clean (its own timers) |
| Banner up | the card sits under it as normal (different edges) |
| Two causes | the table's order decides; Details shows every reading |
| The provider has no `player_api.php` (M3U) | the provider probe is a `HEAD` on the stream's host root (any HTTP answer counts as answering); the streams-in-use reading is left out |
| `max_connections` unknown | `Your provider's stream limit is reached`; the provider reading has no `1 of 2` |
| Speed sample blocked (no route to the sample host) | the slow split falls back to: on Wi-Fi with ≤ 2 bars → C2; else C5 with the line `airglow couldn't test your speed` |
| Very first launch, no history | the need comes from the format; the estimate needs 10 s of play |
| The hint bar's 5-view rule | counts the card's own keys line as seen: the hint bar is not shown under it after 5 |

## 10. Data (what the native side measures)

### 10.1 Permissions

Add `ACCESS_NETWORK_STATE` and `ACCESS_WIFI_STATE` to the manifest (both normal, granted at install; no location: the
Wi-Fi name isn't needed).

### 10.2 Passive, always on while playing (a new `Health` class in the player, about 1 KB of state)

| Signal | Source | Used for |
|---|---|---|
| Arrival (bytes per second, 1 s buckets, last 60 s) | a `TransferListener` on the `DefaultHttpDataSource.Factory` (counts every byte, HLS chunks and raw `.ts` alike) | starving, `Getting 3`, the panel |
| Need | the playing `Format.bitrate` / `averageBitrate`; for `.ts` without one: bytes arrived ÷ media seconds gained (`bufferedPosition` advance) over 10 s of healthy play | the comparisons, `needs 12 Mbps` |
| Loaded ahead | `player.getTotalBufferedDuration()` | starving, `14 s ahead` |
| Stalls | `onPlaybackStateChanged`: BUFFERING after the first frame, with start time and length; last 5 min | the timeline, the stutter rule, `3 pauses` |
| Errors | `PlaybackException.errorCode`; the cause chain's `HttpDataSource.InvalidResponseCodeException.responseCode` (and its headers / body for "connections"), `UnknownHostException` | C4 to C8 |
| Network | `ConnectivityManager.registerDefaultNetworkCallback` (`onLost`, `onAvailable`, `onCapabilitiesChanged`): transport (Wi-Fi / Ethernet), `NET_CAPABILITY_VALIDATED`; Wi-Fi RSSI and link speed from `NetworkCapabilities.getTransportInfo()` (API 31+) or `WifiManager.getConnectionInfo()` | C1, C1b, C2, the panel |
| Decoders | `MediaCodecList` once per launch: the best HEVC / AV1 / H.264 sizes and HDR | C8's line, `Plays up to 4K HDR` |
| Alternatives | `otherFeeds()`, `versions` (already requested by `openOptions`; request it at the 3 s mark too), the HLS variants in `getCurrentTracks()`, the stream type (`.m3u8` / `.ts`) | the actions |
| Live lag | `player.getCurrentLiveOffset()` | section 8 |

### 10.3 Active checks (only when a stall or a check asks)

| Check | Request | Pass | Time |
|---|---|---|---|
| Internet | `GET https://connectivitycheck.gstatic.com/generate_204` (fallback `http://cp.cloudflare.com/`) | 204 / 200 | 2 s timeout; latency kept |
| Provider | Xtream: `GET {server}/player_api.php?username=…&password=…` (the login call: `user_info.status`, `exp_date`, `active_cons`, `max_connections`); M3U: `HEAD` on the host | any HTTP answer = answering; 5xx / timeout = not | 2 s timeout |
| Speed sample | `GET https://speed.cloudflare.com/__down?bytes=25000000`, read for **3 s** then cancel | Mbps = bytes × 8 ÷ time | 3 s, only per 4.2 |
| Last channel (Account check only) | the last channel's stream for 5 s, **only if a stream is free** (`active_cons < max_connections`), else the row reads `Skipped: both streams are in use` | arrival vs need | 5 s |

Nothing is sent anywhere but those hosts; the provider's password goes only to the provider, as at login.

### 10.4 Events to the web side

`diag {cause, title, line, readings}` when a card shows or changes (for the Account check's reuse and for logs);
`lag {ms}` (section 8). Native → web only; nothing in the web app needs to change for the player cards.

## 11. Port checklist

1. **Manifest:** the two permissions (10.1).
2. **`Ui`:** `OK` colour; the new glyphs (2.3); a `PathView` (custom `View`, horizontal and vertical modes, five nodes,
   states `ok/bad/off/run`, lines `ok/slow/cut/off/run`) drawn with `Canvas` (discs, badge, `DashPathEffect`), one
   `invalidate()` per change; a `Spinner` already exists.
3. **`PlayerActivity`:**
   - `view.setShowBuffering(SHOW_BUFFERING_NEVER)`; the puck at 1 s;
   - `Health` (10.2): the `TransferListener`, the network callback, the stall log, the need estimate;
   - the stall timeline (3.1) on one `Handler` (1 s, 3 s, the existing 12 s `stall` runnable);
   - `diagnose()` = the table in 4.1 as an ordered list of rules, each returning `{cause, title, line, path, actions}`;
   - the card: today's `card` `LinearLayout` grows a line, the `PathView` and the keys line; width 560;
   - keys while it shows: OK → `actions[0]`, long OK → `openConnection()`, Back → hide + remember (3.1);
   - the stutter chip on the existing chip (`chipUp`, a new `chipIsDiag`), 10 s;
   - `showFailed(why)` takes the diagnosis: title, line, path, then its rows (section 5);
   - Options: the `Connection` row under Quality; `openConnection()` = a `ListPanel` 400 with a header view (verdict +
     vertical `PathView`) and the action rows;
   - `lag` and the bug freeze (section 8); `pick(id, "diagnosis")`.
4. **`TunerPlayerPlugin`:** the `diag` and `lag` events; a `connectionCheck()` call for Account (it runs 10.3 natively,
   so the TV's own network is what's measured, and returns the five readings as they arrive).
5. **`games.js`:** add `lag` to the effective delay of every score surface; `Sync score` stores `measured − lag`.
6. **Account (`screens/account.js`):** the `Check the connection` row under Check the guide; the sheet (`dg-sheet`
   classes, `scrollList` not needed: it fits) filled from `connectionCheck()` progress events.
7. **Tests:** `tests/tv/drive.js`: the Account row and the sheet's focus. The emulator test can't see real network
   faults; add a debug intent (`--es diag <cause>`) that forces each cause so CI screenshots each card, and a check
   that the score surfaces' delay grows by the stall time during a forced 10 s stall.

## 12. Self-check (`node tools/audit.js`)

The catch-up audit, unchanged, on these 20 mocks: one ring, text under 14 px, text overlaps, clipping of text and
rings, the safe area (every card, panel, chip and sheet inside x 48 to 912, y 27 to 513), CONTAIN (no control poking
out of its card or panel), contrast on flat backgrounds, the RING pixel check, and **SPOILER** on the 5 shield mocks
(`stall-provider-slow`, `stall-provider-down`, `stall-limit`, `fail-game-feed`, `opt-panel-slow`).

**Result: 20 pages, 0 findings.** `--inject` adds a score, a remaining time, a dated provider title and a focused Reveal
to the shield mocks: it reports 24 findings over the 3 it was run on (score, colon score, remaining time, result word, dated title and Reveal all fire), so the SPOILER check is live.

| Mock | Focused | Ring white, all sides | Ring box | To the safe edge |
|---|---|---|---|---|
| stall-* (10) | none by design: the card and chip take no focus (the action chip's model; UI-SPEC lists HUD overlays as the exception) | – | – | – |
| fail-channel-off, fail-decoder | first row (inset) | 100% | 217, 295, 743, 347 | 166 |
| fail-game-feed | ESPN row (inset) | 100% | 217, 239, 743, 291 | 169 |
| opt-connection | Connection row (inset) | 100% | 59, 288, 377, 336 | 11 |
| opt-panel-good | Check again (inset) | 100% | 59, 379, 437, 429 | 11 |
| opt-panel-slow | Same game on ESPN (inset) | 100% | 59, 361, 437, 411 | 11 |
| acct-provider | Check the connection row | 100% | 267, 379, 917, 445 | −5 (the account rows' ring on the x 912 line, as today's Account page) |
| acct-check-running | the text body (no ring while it runs; nothing to press) | – | – | – |
| acct-check-done, acct-check-wifi | Run again | 100% | 444, 464, 594, 512 | 0.8 |

Measured boxes: the stall cards 190 to 208 dp tall (top y 236 at most), the failure cards 334 and 370, the panels 374,
415 and 451 (cap 453), the sheet 486.

**Couldn't verify:** the real TV (the chalk disc and the green tick on the OLED from the sofa; the card's height over a
frozen picture); how this Philips reports RSSI and link speed to an app; whether `connectivitycheck.gstatic.com` and
`speed.cloudflare.com` are reachable from the owner's network; what the owner's provider actually answers for a full
account (403 vs 401 vs 509, and whether the body names connections); whether its `.ts` streams carry a bitrate;
Media3 1.6's live speed control on this provider's HLS (how fast `lag` decays). The decision table is designed, not
tested against real faults.

## 13. Open questions (for the owner)

1. **Hold OK = Details while the card shows** (it's Last channel otherwise). Fine, or would you rather it stayed Last
   channel always and Details lived only in Options?
2. **The speed sample** downloads about 10 to 20 MB from Cloudflare, only during a stall that needs it, on Check again
   and in the Account check. OK, or never automatically?
3. **"Your provider is slow" when your internet tests fast** could, rarely, be the route between your internet company
   and the provider rather than the provider itself. The message blames the provider (it's their side either way, and
   nothing on your side fixes it). Good enough?
4. **Switch to a lower quality automatically** when your Wi-Fi or internet is the cause? The design asks (OK), because
   Quality's default is "Best available" and you chose it. A setting `Step down when the connection is slow` could do it
   for you.
5. **A tiny connection log** (Account > Provider > Check the connection > `Last stalls`: time, channel, cause) to see if
   it's always the same channel or always 21:00? Not designed yet; cheap to add.
