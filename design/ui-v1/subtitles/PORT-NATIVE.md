# Subtitles and real quality: the native player's side

The web side's logic is built: `app/tv/js/subs.js` and `app/tv/js/subs/` (parsing, choosing, the timing check, the
fingerprint, the check queue and its cache, the settings), proved by `tests/subs-*.js`. This file is what
`TunerPlayerPlugin`, a new `Probe.java`, a new `SrtTrack.java` and `PlayerActivity` need to do for `SPEC.md` 5, 7 and
9.2, and the exact messages. The panels' looks are in `SPEC.md` 7 and the mocks; they aren't repeated here.

## 0. Turning it on

`TunerPlayer.info()` adds:

| Field | Meaning | Until it's there |
|---|---|---|
| `probe: true` | `probe()`, `probeCancel()` and `playable()` below exist | the app asks for no checks on the TV (`subs.js nativeProbe()`); copies rank by their names |
| `subs: 1` | the player takes the `subs` command and draws downloaded subtitles (2 below) | downloaded subtitles aren't sent; the file's own still play as today |

**Why the reads are native, not in the WebView:** with `CapacitorHttp` on (`capacitor.config.json`), a `fetch` GET goes
through Capacitor 8.5's `_capacitor_http_interceptor_` proxy (`WebViewLocalServer.handleCapacitorHttpRequest`). It does
copy the `Range` header and hands back the real status and `Content-Range`, streaming the body. But it opens the
connection before the page sees anything, and a cancelled `fetch` doesn't reliably close that `HttpURLConnection`: a
server that ignores `Range` would start sending the whole film. The CapacitorHttp plugin call itself
(`HttpRequestHandler.readStreamAsBase64`) reads the whole body into memory. So the two 64 KiB reads are `Probe.java`'s,
which also needs them for the formats. `app/tv/js/subs/hash.js readFingerprint()` is the same rules over `fetch`, used
only in a desktop browser and as the reference for this port (`tests/subs-hash.js` runs it against a server with and
without partial reads).

## 1. The quality check: `Probe.java`

### 1.1 The calls (plugin methods: the player is usually not open)

**`TunerPlayer.probe({ id, url, headers })` → resolves with the result.**
- `id`: `<account id>:<kind>:<stream id>`, echoed back.
- `headers`: `{ 'User-Agent': … }` when he set one (Account > Playback), else the player's default.
- **One at a time.** A second `probe` while one runs rejects with `busy`.
- **`play()` cancels a probe in flight** before it opens its stream: close the socket first, then resolve the probe with
  `{ status: 'couldnt', why: 'cancelled' }`. (The app also calls `probeCancel()` before Play.)

**`TunerPlayer.probeCancel()`**: the same cancel, from the app.

**The result:**

| Field | Type | What |
|---|---|---|
| `id` | string | as sent |
| `status` | `'ok'` \| `'head-only'` \| `'couldnt'` \| `'refused'` | 1.2 |
| `size` | number | bytes: from the head's `Content-Range` total (206) or `Content-Length` (200) |
| `etag` | string | the head's `ETag`, as sent |
| `hash` | string | 16 lowercase hex digits (1.4); `''` unless both reads were good 206s |
| `dur` | number | seconds: the Timeline's duration; 0 if unknown (TS, an MP4 with its `moov` at the end when head-only) |
| `formats` | object \| null | 1.3; null on `couldnt` |
| `why` | string | for the log and Account > Provider: `tail 200`, `timeout`, `over the read cap`, `458`, … |
| `ms` | number | how long it took (SPEC 13.7: what only the TV can tell) |

The app works out the picture's bitrate itself (`probes.js pictureMbps`: size × 8 / dur − the nominal sound rates), so
`mbps` may be left out.

### 1.2 The reads (SPEC 5.1)

1. **Head:** `GET` with `Range: bytes=0-65535`. Read at most 65,536 bytes, then close the connection.
   - **206:** the size is the total in `Content-Range` (`bytes 0-65535/<total>`).
   - **200** (the server ignores ranges): keep the 64 KiB, size from `Content-Length`, **skip the tail**. No fingerprint.
     `status: 'head-only'` (with formats when the head says enough: MKV, faststart MP4, TS).
   - **401, 403, 429, 458, 509, 5xx, or a body that says "max connections":** `status: 'refused'` (the app backs off 30
     min; two in a day stop checks for the day).
   - Anything else: `couldnt`.
2. **Tail:** `Range: bytes=<size−65536>-<size−1>`. It must be a **206 whose `Content-Range` names exactly that range** (and
   that total). Anything else: stop, `couldnt` (a 200 would hand over the first 64 KiB as the last).
3. **Parse:** a `ProgressiveMediaSource` over a `ProbeDataSource` that serves the head and tail from memory and goes to
   HTTP for anything else, with `DefaultExtractorsFactory().setMatroskaExtractorFlags(MatroskaExtractor.FLAG_DISABLE_SEEK_FOR_CUES)`.
   `prepareSource()` gives the Timeline (duration); `createPeriod()` + `MediaPeriod.prepare()` give the track groups (what
   `MetadataRetriever` does inside; its 1.6.0 API returns only the track groups). Release everything after.
4. **Caps:** 1 MB of HTTP reads per check, plus one `moov` read of up to 8 MB when the top-level box walk shows the
   `moov` after `mdat`. **A 6 s wall-clock timeout** for the whole check. Over either: `couldnt`.
5. One connection at a time, closed before the next opens.

### 1.3 `formats`

```
{
  container: 'mkv' | 'mp4' | 'ts' | 'webm' | '',
  video: { mime, codecs, w, h, fps, transfer: 'pq' | 'hlg' | 'sdr' | '', dv: { profile, level } | null } | null,
  audio: [{ mime, codecs, ch, rate, lang, tagged, atmos, label }],
  text:  [{ mime, lang, tagged, forced, label }]
}
```
- `w`, `h`, `fps`: `Format.width`, `height`, `frameRate` (the timing check scales by the copy's rate; 0 if unknown).
- **`transfer`:** `Format.colorInfo.colorTransfer` (`C.COLOR_TRANSFER_ST2084` → `pq`, `C.COLOR_TRANSFER_HLG` → `hlg`,
  SDR → `sdr`). When `colorInfo` is empty on HEVC: `NalUnitUtil.parseH265SpsNalUnit(...)` on
  `Format.initializationData`. In MKV that is one buffer of start-coded VPS / SPS / PPS: find the NAL of type 33
  (`(b[i] >> 1) & 0x3f == 33` after a `00 00 01` start code) and pass it **without** its start code;
  `H265SpsData.colorTransfer`.
- **`dv`:** from the MIME type `video/dolby-vision` and `Format.codecs` (`dvhe.08.06` → profile 8, level 6). The base
  layer's `transfer` too (profile 8 is also HDR10; profile 5 has none).
- **`audio[]`:** `sampleMimeType`, `channelCount`, `sampleRate`, `language`, `label`. **`atmos: true` only when parsed**:
  `audio/eac3-joc`, or TrueHD with Atmos in its codecs string; never from a name.
- **`text[]`:** `sampleMimeType`, `language`, `(selectionFlags & C.SELECTION_FLAG_FORCED) != 0`, `label`.
- **`tagged`** (sound and text tracks): whether the Matroska TrackEntry had a Language element. Media3 reports an
  untagged track as `eng`, which the app must not take as English for a dub or a tick. Read it from the head bytes with
  a small EBML walk: Segment `18 53 80 67` → Tracks `16 54 AE 6B` → TrackEntry `AE`; in each, TrackNumber `D7`,
  TrackType `83` (1 video, 2 audio, 17 subtitle), Language `22 B5 9C`, LanguageBCP47 `22 B5 9D`, FlagForced `55 AA`.
  Tagged = Language or LanguageBCP47 present. Match the entries to Media3's tracks by order within their type. In MP4
  and TS, `tagged` is true when the language isn't `und`.
  - Verified earlier (SPEC 5.1.6): Sintel's 1.18 GB MKV has all its tracks in the first 4,900 bytes, 10 subtitle tracks,
    one untagged.

### 1.4 The fingerprint (OpenSubtitles' moviehash)

`(size + Σ the little-endian unsigned 64-bit words of the first 65,536 bytes + Σ those of the last 65,536) mod 2^64`,
as `%016x`. Only when both reads were good 206s and `size ≥ 65536`.

```java
static String movieHash(long size, byte[] head, byte[] tail) {   // each exactly 65536 bytes
    long h = size;
    ByteBuffer a = ByteBuffer.wrap(head).order(ByteOrder.LITTLE_ENDIAN), b = ByteBuffer.wrap(tail).order(ByteOrder.LITTLE_ENDIAN);
    for (int i = 0; i < 65536 / 8; i++) h += a.getLong() + b.getLong();   // long overflow is the mod 2^64
    return String.format("%016x", h);
}
```
**Test vector:** OpenSubtitles' `breakdance.avi`, 12,909,756 bytes → `8e245d9679d31e12`. Its two blocks are in
`tests/fixtures/subs/breakdance-blocks.bin.gz` (the first 65,536 bytes, then the last 65,536): a JUnit test or the
emulator test can check the Java against them. Read through the range reads above on 27 Oct 2026; the JS gives the same
value (`tests/subs-hash.js`), and the fake provider's film `movie/demo/demo/1.mp4` gives `c66f32bd101993f2` both ways.

### 1.5 `TunerPlayer.playable({ copies: [{ id, formats }] })` → `{ [id]: { video, audio, reason } }`

"Plays on this TV" is decided **when ranking**, from the stored formats and the audio route **at that moment** (SPEC
5.2; `RANKING.md` key 3), so the check and the player agree:
- **video:** a decoder for the `Format` (`MediaCodecUtil.getDecoderInfos(mime, secure=false, tunneling=false)` with
  decoder fallback on, as the player runs, and `MediaCodecInfo.isFormatSupported`). Dolby Vision profile 5 needs Dolby
  Vision support; profile 8 plays as HDR10 (check the HEVC base).
- **audio:** a decoder for at least one track, or passthrough on the current route (`AudioCapabilities.getCapabilities(context)`
  `.isPassthroughPlaybackSupported(format)`, which changes with the soundbar / eARC). The app has no FFmpeg extension,
  so DTS without passthrough has no sound.
- **reason:** `'no-sound'` ("No sound on this TV: DTS-HD is its only sound") or `'no-picture'` ("This TV can't play its
  picture"), or `''`.
- Opening it never opens a stream. The app calls it when it ranks copies (the title page, Options > Quality) and caches
  the answer until `AudioManager` reports a device change.

## 2. Downloaded subtitles in the player: `SrtTrack.java`

### 2.1 Starting

`play({ mode: 'vod', … })` gets one more field, the subtitle settings (SPEC 6.2) for the file's own tracks:

```
subs: { mode: 'always' | 'foreign' | 'off', langs: ['is', 'en'], shown: ['en', 'is'], sounds: false, dub: false }
```
- **`langs`** (his subtitle languages, in order, ISO 639-1) → `TrackSelectionParameters.Builder.setPreferredTextLanguages(langs)`
  (Media3 takes the list in order). Until this lands, the app keeps today's one `sub` value equal to his first subtitle
  language (`prefs.js legacySubLang`: `is` for him), which is no worse than today's `auto`.
- **`off`**, or **`dub`**: `setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)`; the panel still lists the tracks.
- **`foreign`**: text on only when the selected audio track's language isn't in `shown`.
- **`sounds`**: prefer tracks with `C.ROLE_FLAG_DESCRIBES_MUSIC_AND_SOUND` when true, avoid them when false.
- Forced-only tracks never count as "a track in that language".

### 2.2 `command(['subs', json])` (app → player, about 240 KB once per title)

Sent right after `play()` answers, and again after `need { what: 'subs' }`. It is `subs.js forPlayer(key)`:

```
{ title, copy,                                   // the keys for subtime / subpick
  list:  [{ lang, source: 'file' | 'opensubtitles' | '', fileId, verdict, words, anchored, sounds, ready }],
  pick:  { source: 'file' | 'opensubtitles' | 'off', id, lang } | null,
  files: [{ id, lang, text, speed, autoOffset, mine, verdict, words, anchored, sounds, release }],
  others: ['Arabic', 'Spanish', …] }             // "Other languages · n"
```
- `text` is plain SRT, already cleaned (only `<i>` left, UTF-8, sorted, no empty cues): `SrtTrack` needs only a simple
  reader (`index`, `hh:mm:ss,mmm --> hh:mm:ss,mmm`, lines, blank line).
- **A cue shows at `start × speed + autoOffset + mine`** (and ends at `end × speed + autoOffset + mine`). `speed` and
  `autoOffset` are the automatic fix (SPEC 3.4); `mine` is his "Early or late" (0.5 s steps, ±60 s).
- `pick` says what is on when the film starts: `file` → select that track (`id` is `track:<language>`); `opensubtitles`
  → the downloaded file `id` through `SrtTrack`, with `TRACK_TYPE_TEXT` disabled; `off` → nothing.
- A file `verdict` of `unchecked` shows the "Timing not checked" chip (SPEC 7.6), once per film, 6 s at its first line.

### 2.3 Drawing (SPEC 7.5)

- **Its own `SubtitleView`**, added over `PlayerView` with the same style (`styleSubtitles()`, the TV's caption style
  first). `PlayerView`'s own view stays ExoPlayer's; `TRACK_TYPE_TEXT` is disabled while a download is on.
- **`setCues()` only at boundaries:** a handler post at the next cue start or end (as timed above), and at once on seek,
  pause, resume and a timing step.
- `<i>` → an italic span.

### 2.4 Events (player → app)

| Event | When | Fields |
|---|---|---|
| `setting` `{ key: 'subtime' }` | every Early-or-late step (each step is saved as you make it) | `title`, `copy`, `sub` (file id), `value` (seconds, 0.5 steps), `release` |
| `setting` `{ key: 'subpick' }` | a pick in Options > Subtitles | `title`, `value: { source, id, lang }` |
| `setting` `{ key: 'sub' }` | as today, when the pick is a language | `value` |
| `need` `{ what: 'subs' }` | the Subtitles panel opens and no `subs` came yet (still downloading at Play) | – |

The app saves them with `subMemory().setOffset(title, copy, sub, value, { series, release })` and `.setPick(...)`
(`prefs.js`: one record per account, the series' last value per release).

## 3. The rest of `SPEC.md` 9.2 for `PlayerActivity` (unchanged by this round)

- `openOptions()` lists Subtitles when there are file tracks **or** downloads, or a list is coming; `openSubtitles()`
  without its early return, rebuilt as SPEC 7.2 (384 wide); the strip (7.3) and Match a line (7.4); `openQuality()`'s
  copies section (7.7) from the app's ranking; the `st-what` line in `VodControls` with its time labels 14 px under the
  bar; the chip at the top right; "Try the next copy" on the failure card.
- Build on the playback-diagnosis and catch-up work in `PlayerActivity.java` once they land.

## 4. Tests for the native side

- **The fake provider** (`tests/mock-provider.js`) already answers `Range` with 206 and `Content-Range` on
  `/movie/demo/demo/<id>.mp4`. Still to add for the emulator: a no-range mode (200 to everything), a refusing mode (458),
  and an `active_cons` counter the test can raise.
- **Emulator checks:** `probe()` on the fake film gives `status: 'ok'`, `size 2547988`, `hash c66f32bd101993f2`; a
  downloaded cue shows at its time; ▶ in the strip moves the next cue by 0.5 s; Options > Quality opens no connection
  (counted at the fake provider).
