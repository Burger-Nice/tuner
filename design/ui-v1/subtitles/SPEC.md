# airglow TV: subtitles that are always there, and real quality for every copy, v1.0

This is the design spec for the engineer. It extends `design/ui-v1/UI-SPEC.md` v1.2 (layout, type, focus, the native
player's panels) and reuses the diagnosis rules (`design/ui-v1/diagnosis/SPEC.md`: a green tick only on something that
was checked). Everything not said here follows those two.

**The owner's problem, in his words:** movies and shows from the provider are "ehh: sometimes no subtitles, bad
quality, shit like that".

**The answer, in two parts:**
1. **Subtitles that are always there.** When the provider's file has none in your languages, airglow gets them from
   OpenSubtitles (through Stremio's public add-on), picks the right file, checks its timing against the copy you're
   playing and fixes it when it can. You can still nudge it 0.5 s at a time.
2. **Real quality for every copy.** airglow reads the first and last 64 KB of each copy of a title (about 130 KB, one
   copy at a time). That shows what the copy really is: resolution, HDR, sound, bitrate, its subtitles, and whether this
   TV can play it. The provider's names lie; this doesn't. Play picks the best real copy.

| File | What it is |
|---|---|
| `SPEC.md` | this |
| `*.html` (18) | the mocks; `png/*.png` are their 2x renders, and `png/contact-sheet.png` shows all of them |
| `subtitles.css` | the new CSS, all prefixed `st-` (the TV parts go into `app/tv/app.css`; the player parts are measurements for native views) |
| `tools/build.js` | builds the mocks |
| `tools/render.js` | the PNGs and the contact sheet |
| `tools/audit.js` | the self-check (section 12), the diagnosis audit plus 8 new checks |

## 0. Scenario and data

- **When:** the owner's TV, Tue 27 Oct 2026 at 21:30 Reykjavik time (UTC).
- **Settings > Languages:** English, Icelandic; Subtitles Always; Sound descriptions Leave out.
- **Real data,** fetched with curl on 27 Oct 2026 (section 10):
  - Oppenheimer is `tt15398776`. It has 96 OpenSubtitles files in 33 languages: 6 English (2 of them with sound
    descriptions) and 1 Icelandic. The Icelandic file is timed for a copy that runs 4.27% faster.
  - Severance S1 E1 (`tt11280740:1:1`) has 2 English files and no Icelandic.
  - Cinemeta's search for "Konungur ljónanna" returns The Lion King (1994), The Lion King (2019) and Mufasa (2024).
- **Illustrative:** the provider's four copies of Oppenheimer, their names and sizes, and what the check finds in them:

| Copy (provider's name) | What the check finds | Rank |
|---|---|---|
| `EN\| Oppenheimer 4K` | 3840 × 1600, HDR10, 16 Mb/s, Dolby Digital Plus 5.1, 21.6 GB, no subtitles in the file | 1, Best |
| `EN\| Oppenheimer FHD` | 1920 × 800, 7.3 Mb/s, Dolby Digital 5.1, 9.8 GB, English and Spanish subtitles in the file | 2 |
| `EN\| Oppenheimer (2023) 4K UHD` | 1920 × 800, 3.0 Mb/s, stereo, 4.1 GB: **named 4K, really 1080p** | 3 |
| `MULTI\| Oppenheimer 2160p DV` | 3840 × 2160, Dolby Vision, 25.6 Mb/s, DTS-HD 5.1 as its only sound | 4 (no sound on this TV) |

## 1. Decisions in one list

1. **Sources, in order:** the file's own subtitles, then OpenSubtitles via `opensubtitles-v3.strem.io`. Nothing else for
   now; torrent and stream add-ons are out of scope.
2. **The IMDb id comes from the ratings file the app already downloads.** `scripts/build-ratings.js` reads IMDb's
   `title.basics`, which has the id, and the app already matches every provider title against it by name and year to
   show the rating. Adding the id to each row costs about 0.6 MB on today's 3.0 MB file. Cinemeta's search is only the
   fallback, with strict rules, because it is fuzzy: "Sintel" returns Interstellar. When it can't be sure, airglow asks
   (section 3.2).
3. **The file fingerprint (OpenSubtitles' moviehash) is a by-product of the quality check.** Both need the first and
   last 64 KB of the copy. It is sent to the add-on as `videoHash` and `videoSize`. Files made for that exact copy come
   back marked `"m":"h"` and first (verified, section 10.4).
4. **Timing is checked before a downloaded file shows.** It is compared against a reference: a fingerprint-matched file
   in any language, or two other files that agree with each other. airglow fixes the **speed** as well as the offset.
   The Icelandic Oppenheimer file matches 20% of the English file's cue starts at the best plain offset, and 79% once
   its speed is fixed (+0.4 s × 25/23.976). No early/late step could have fixed that file.
5. **airglow draws downloaded subtitles itself** (parsed cues fed to the player's own `SubtitleView`), not through
   `MediaItem.SubtitleConfiguration`. Changing the timing or the file then shows at once. Side-loading would need a new
   MediaItem and a re-buffer of a 4K stream at every 0.5 s step.
6. **Early or late moves in 0.5 s steps.** It is remembered for the title + copy + subtitle file, because two copies of
   the same film can differ by seconds. A series carries the last offset to the next episode when the next file comes
   from the same uploader's release.
7. **Subtitles in the file can't be shifted** (ExoPlayer draws them, and they were made for the file). Their timing row
   is greyed.
8. **One check per copy, one at a time, never more streams than the provider allows.** With a 1 or 2 connection
   account, nothing is checked while something plays. Results are cached per copy for 60 days, or until the file's
   size changes.
9. **Play picks the best copy that plays on this TV.** The order is: language, then plays on this TV, then real
   resolution (a "4K" under 8 Mb/s counts as 1080p), then HDR, bitrate and sound. "Always the best copy" is the
   default; a copy you pick by hand is kept for that title.
10. **Ticks mean checked.** A filled tag with a green tick is a fact airglow found. A dashed tag is only the provider's
    name. The owner always knows which is which.

## 2. Rules every surface follows

### 2.1 Geometry
- Canvas 960 × 540; safe area x 48 to 912, y 27 to 513. Every floating box (menu, sheet, panel, strip, chip) is inside
  it; the audit checks each box.
- **Native panels** are left 48, top 27, height = content (cap 453), radius 16, rows 50 (two lines) or 44 (one line).
  The Subtitles panel is **384** wide (today 320: the source lines need it). The Quality panel is **400** (today 352).
- **The timing strip** is 520 wide, top centre (x 220 to 740, y 27 to about 182). The bottom of the screen belongs to
  the subtitles while you adjust them.
- **Film chips** are top right (right 48, top 27), not bottom right. The kit's chip sits where a long subtitle line
  goes (UI-SPEC 7 puts subtitles 10% up from the bottom). Live TV keeps the kit position.

### 2.2 Focus and keys
- One focus ring per screen. The timing strip and the chip have none: they're HUDs, like the scrub bubble.
- **Title page:** the pills are a `data-row` under Play and Save, as today. The source line under them takes no focus.
  The pills get the ring without the lift (as `app.css` does for `.pillbtn`).
- **Player:** the key map is unchanged. CC opens Subtitles; ▼ Options, then Subtitles or Quality. OK stays Pause on
  films. Hold OK stays unbound in films.

### 2.3 New glyphs (`Ui.Icon` and `util.js`, 24 grid, 2 dp stroke, round caps)
- **timing:** a clock with a tick either side, for "Early or late".
- **globe:** "from the internet", for OpenSubtitles rows.
- **The checked tick** is the diagnosis badge: a green `--a-ok` disc with an ink check, 13 to 16 px.

### 2.4 Colour
- **Green tick:** only on a checked fact (the audit fails a named claim that has one, and a checked one that doesn't).
- **Dashed outline tag in `text-2`:** the provider's name says so.
- **Pink:** radio dots, the timing dot and the progress line, as today.
- No amber, no yellow; red only for LIVE. The audit reads every computed colour on every mock.
- The stand-in art avoids yellow too.

### 2.5 Copy rules
- Plain words. No codec, container or hash words on screen (HEVC, AVC, fps, SRT, hash, remux, bitrate): the audit
  fails them.
  - "16 Mb/s" stays: it is already in today's Quality panel, and it is what makes "named 4K, really 1080p" believable.
  - HDR10, Dolby Vision, Dolby Digital Plus and 5.1 are words printed on the TV's box.
- **Source, always:** any surface that offers downloaded subtitles names OpenSubtitles (audited).
- **Times are 24 h:** "Checked today 21:02", "trying again at 21:31".
- **Timing values:** "1.5 s later", "1.0 s earlier", "As downloaded". They are always multiples of 0.5 (audited).
  "Later" means the subtitles appear later.

## 3. Subtitles: where they come from and how one is picked

### 3.1 The order of sources, per language
For each of your subtitle languages, in your order, the first of these that exists:
1. **In the file:** a full (not forced-only) text track in that language. airglow knows these before Play, from the
   check (section 5), and ExoPlayer confirms them at prepare.
2. **From OpenSubtitles, made for this copy:** `"m":"h"` in the add-on's answer (the fingerprint matched).
3. **From OpenSubtitles, the best of the rest** (3.3), once its timing is checked or fixed (3.4).

**What shows:**
- **Always:** the first of your languages that has any.
- **Only when the sound isn't in your language:** the same, but only when the copy's audio language isn't one of
  "Shown first".
- **Off:** nothing shows. The panel still lists them.

The other languages are downloaded in the background and wait in the player's panel. That's why the pill says
"EN · IS" when only English shows.

### 3.2 The IMDb id (OpenSubtitles needs `tt…`)
In this order, stopping at the first that answers:
1. **The provider's own id**, if `get_vod_info` / `get_series_info` carries a `tt\d{7,8}` anywhere in `info`. Unverified
   on the owner's provider, so it is a free first try.
2. **The ratings file, v2.**
   - `build-ratings.js` adds the tconst number as the row's 7th field: `[key, year, r10, votes, genres, alt|0, tt]`.
   - The app's existing `matchImdb()` (key + year ± 1, the original-title key as well) then returns it.
   - That covers 52,688 films and 12,965 series with 1,000+ votes (counted in today's file).
   - Verified: "Dýrið" finds Lamb (2021) through the original-title key, and "Snerting" finds Touch (2024).
3. **Cinemeta search** (`/catalog/{movie|series}/top/search=<cleaned name>.json`). Take the top 5 and accept one only
   when:
   - **with a year from the provider:** its year is within ± 1, and either the names share ≥ 60% of their words
     (Jaccard on `Titles.norm` tokens), or it is the top result and shares at least one word. "Harry Potter and the
     Philosopher's Stone" (2001) → Sorcerer's Stone (2001): accepted. "Leitin að Nemo" (2003) → Finding Nemo (2003):
     accepted.
   - **with no year:** exactly one result's name equals the cleaned name. "Konungur ljónanna" → two Lion Kings: not
     accepted. airglow asks.
4. **Ask** (`detail-which-film`, `detail-match`).
   - The pill reads "Subtitles: which film is it?".
   - The menu lists Cinemeta's top 5 with year and length, plus "Search by another name" and "None of these".
   - The row whose length is closest to the copy's checked length is focused.
   - The answer is remembered per title, and also gives the page its IMDb rating.

**One matcher for the app.** A parallel add-ons design (`design/ui-v1/addons/`, which has its own `detail-match`) also
matches provider titles to IMDb. Both should share one matcher (this section) and one "Which film is this?" menu, and
store one answer per title.

**Series:** the episode id is `tt…:season:episode`, from the provider's season and episode numbers. airglow fetches
Cinemeta's `/meta/series/{tt}.json` once per series (25 KB; it lists every episode). If the provider's numbers aren't in
it (absolute numbering, specials), episodes use the file's subtitles only, and the line says "this episode's number
doesn't match IMDb".

### 3.3 Ranking OpenSubtitles files within a language
The add-on returns `{ id, url, lang, m, g, SubEncoding, subtitleFileName, movieReleaseName, releaseGroup, fpsMilli,
season, episode }` per file (all fields seen in today's answers). They are ranked like this:
1. `m == "h"` (made for this copy).
2. **Not a sound-descriptions file**, unless you prefer those. A file counts as one when its file name has an `HI`,
   `SDH` or `CC` token (2 of Oppenheimer's 6 English files), or when more than 15% of its cues are in [brackets].
3. `fpsMilli` within 0.1% of the copy's frame rate, when both are known.
4. The add-on's own order.

**Dropped:**
- a file whose name names another episode (`SxxEyy` / `NxNN` other than the one asked for). Verified: 1 of the 65
  files for Severance S1 E1 is "01x08", and it is labelled French while being English;
- a file that is empty after parsing, or over 2 MB;
- one that fails the timing check twice.

**Language codes** (the add-on uses OpenSubtitles' 3-letter codes, as seen): English `eng`; Icelandic `ice`; Spanish
`spa`/`spl`/`spn`; Portuguese `por`/`pob`; Dutch `nld`/`dut`; German `ger`; French `fre`; Italian `ita`; Swedish `swe`;
Norwegian `nor`; Danish `dan`; Finnish `fin`; Polish `pol`; Turkish `tur`; Arabic `ara`; Hindi `hin`; Chinese
`zho`/`zhe`/`zht`/`chi`. Unknown codes go under "Other languages" with their English name.

### 3.4 The timing check (native, on the cue starts, before the file shows)
1. **Reference:** a fingerprint-matched file in any language. Failing that, the two best other files (any language,
   different releases) if they agree with each other: they match 60% or more at speed 1 with an offset under 0.5 s.
   With neither, there is no check.
2. **The search:** for each speed in {1, 25/23.976, 23.976/25, 24/23.976, 23.976/24, 25/24, 24/25}, build a histogram
   of (reference start − candidate start × speed) over ± 30 s in 0.1 s bins, using the pairs within ± 30 s. The peak is
   the offset. Its **match** is the share of candidate cues whose start lands within 0.3 s of a reference start.
   That's O(n·k), about 50 ms for 3,000 cues.
3. **Verdicts:**

| Verdict | Rule | Row says |
|---|---|---|
| fits | match at (1, 0) ≥ 0.5, and nothing beats it by more than 0.15 | "Timing fits this copy" (a fingerprint reference) or "Timing matches other subtitles" (an agreeing pair) |
| fixed | the best (speed, offset) has match ≥ 0.5 and beats (1, 0) by more than 0.15 | "Timing fixed: it was made for a faster copy" / "…slower copy" / "…shifted 2.5 s" |
| off | best match < 0.35 | the file is skipped and the next one is tried |
| not checked | no reference | "Timing not checked", plus the chip once (section 7.6) |

The fix is stored with the file, and your early/late steps are added on top. "As downloaded" in the strip means "with
the automatic fix, without your steps".

### 3.5 Files and caching
- **Download:** the add-on's URL (`subs5.strem.io/en/download/subencoding-stremio-utf8/…`). It returns UTF-8 SubRip:
  the two files tried were 239 and 240 KB, in 0.26 and 0.84 s, cached by Cloudflare for a year.
- **Parse:**
  - strip `U+FEFF` everywhere: the Icelandic file has 2,912 of them, one per line;
  - CRLF and LF both work;
  - drop `{\an8}`-style tags and keep `<i>` as italics;
  - drop empty cues.
- **On the title page:** airglow downloads your first two languages' picks plus the reference, at most 4 files (about
  1 MB). They're kept 30 days, 80 files at most, least recently used out first.
- **Lists:** one add-on request per title or episode (with the fingerprint once the copy is checked). Kept 2 days (the
  add-on's own `cacheMaxAge` is 172,800 s); a failed request is retried after 60 s, then every 5 min.

## 4. The title page (`detail-ready`, `detail-checking`, `detail-copies`, `detail-subs-sheet`, `detail-which-film`, `detail-match`, `detail-subs-down`, `detail-series`)

Layout as today (`detail.js`): the column at x 48, y 44, 500 wide; Play and Save; then the pill row (y about 306 to
342). **New:** the source line (`st-src`) 8 px under the pills, 14/18 `text-2`. More like this moves down by its height
(26 px, row title at 392), through the existing `fitCol()` push.

### 4.1 The meta line's tags
- They describe the default copy: real resolution (4K / 1080p as "HD" / 720p / SD), HDR (HDR10, HDR10+, DV, HLG as
  "HDR"), and 5.1 / 7.1 / Atmos.
- **Checked:** `.tag.st-ok` (filled surface-3, tick).
- **Not checked yet:** `.tag.st-name` (dashed), from the name, as today's `_q`.
- The language tag stays as today.

### 4.2 Elements and keys

| Element | Shows | OK | ◀ ▶ ▲ ▼ |
|---|---|---|---|
| **Version pill** (only with 2+ copies) | checked: tick + real quality + "best of N" ("4K HDR10 · best of 4"), or "your pick" for a pinned copy · checking: dashed, "Checking copies · 2 of 4" · nothing checked and checks paused: "4K · not checked" | opens the Copies menu | row: Subtitles pill; ▲ Play; ▼ More like this |
| **Subtitles pill** (films; on series it's in the button row as today) | "Subtitles: EN · IS" (the languages ready for this copy, in your order) · "Subtitles: EN" · "Subtitles: Off" · "Subtitles: looking…" (dashed) · "Subtitles: none found" · "Subtitles: none yet" (add-on down, dashed) · "Subtitles: which film is it?" | opens the Subtitles sheet, or the match menu for "which film" | as today |
| **Source line** (no focus) | "**EN** and **IS** from OpenSubtitles · none in this copy's file" · "EN in the file · IS from OpenSubtitles" · "No Icelandic for this episode" · "OpenSubtitles isn't answering · trying again at 21:31" · while checking: a 56 px progress line + "Reading each copy's first and last 64 KB, one at a time" | – | – |
| **Play** | as today. If unchecked copies remain whose names claim better than the best checked one, Play checks them first: the button reads "Checking 2 copies…" for up to 3 s, and OK again plays now | plays the best copy (5.4) | as today |

### 4.3 The Copies menu (`detail-copies`, `.menu.st-copies`, left 48, top 40, 600 wide)
- **Title row:** "Copies of Oppenheimer", with "Checked today 21:02" on the right.
- **Row 1, radio:** "Always the best copy" / "Now: 4K · HDR10 · 16 Mb/s. Changes if a better copy shows up". It is the
  default, and focused when on.
- **Then one 60 px radio row per copy, in rank order:**
  - **line 1:** tick + real quality ("4K · HDR10 · 16 Mb/s");
  - **line 2:** the problem first, in chalk 650 ("No sound on this TV", "Named 4K"), then sound, size, and the provider's
    name in quotes, ellipsised last;
  - **right:** `Best` on rank 1.
- **Not checked yet:** no tick, line 1 is the name's claim and line 2 starts "Not checked yet". **Couldn't check:**
  "Couldn't check: your provider was busy" (it retries).
- **Foot:** "Picking a copy keeps it for this film. A 4K copy under 8 Mb/s is ranked as 1080p."
- **Keys:** ▲▼ move; OK picks and closes (focus back on the pill); Back closes. Picking a copy pins it (the existing
  `pickVersion` store); picking "Always the best copy" clears the pin.
- **Height:** 6 rows max inside the box (about 460 px). With more copies the list scrolls (`scrollList`) and the foot
  stays.

### 4.4 The Subtitles sheet (`detail-subs-sheet`, right sheet 420)
- **Header:** "Subtitles" / "Oppenheimer (2023), matched on IMDb".
- **YOUR LANGUAGES:** a radio row per subtitle language (source and timing verdict on line 2), then Off. Picking one
  sets this title's language: the player opens with it.
- **MORE:**
  - "Other languages · 31" opens a radio list with every language the add-on has, by English name;
  - "Not this film? · Match it again" opens the match menu.
- **Note at the bottom:** "This copy has no subtitles in its file. airglow lines up downloaded ones with the copy
  before they show."
- Focus opens on the language that will show.

### 4.5 Which film is this? (`detail-match`, `.menu.st-match`, left 48, top 44, 520)
- **Under the title:** "From the Cinemeta search for “<cleaned name>”".
- **Rows:** title / year · kind · length.
- **Then:** "Search by another name" (the app's keyboard sheet, then the same list) and "None of these" (turns
  OpenSubtitles off for this title).
- **Focus:** the row whose length is closest to the copy's checked length. With no length, nothing is preselected and
  focus is on the first row.
- **Foot:** "Your pick is remembered for this title. It also gives the page its IMDb rating."

### 4.6 Series (`detail-series`)
- The pill and the source line follow the focused episode. The subtitle list is fetched when an episode has had focus
  for 1 s, or on Play.
- The tags are the episode copy's checked quality, from a check made at the same 1 s mark.

## 5. Real quality: the check

### 5.1 What is read
- **Three or four short HTTP requests, one after another, each closed when it's done:**
  1. `Range: bytes=0-65535`;
  2. `Range: bytes=<size−65536>-<size−1>` (the size comes from the first answer's `Content-Range`);
  3. what Media3's extractor still needs, when the container's header isn't inside the first or last 64 KB (an MP4 with
     its `moov` at the end: one more read of the `moov`, capped at 8 MB).
- **Read at most the asked-for bytes, then close, whatever the status.** A server can ignore the range: the first try
  against Blender's CDN answered by streaming the whole file (794 MB in 30 s); the second answered 206 with 65,536
  bytes.
- **The parser is Media3's own** (1.6.0, already in the app): `MetadataRetriever.retrieveMetadata(context,
  MediaItem)`. It runs through a data source that serves the cached 64 KB windows from memory and asks HTTP only for
  the rest. So what the check sees is what the player will play, for MKV, MP4, TS and AVI alike.
- **From the `TrackGroupArray`:**
  - video: width, height, `sampleMimeType` (Dolby Vision is `video/dolby-vision`), `colorInfo.colorTransfer`
    (ST2084 = HDR10, HLG), frame rate;
  - audio: MIME (AC3, E-AC3 with JOC = Atmos, DTS, TrueHD), channel count, language;
  - text: language and forced flag.
- **Duration:** from the container (the MKV Info element or the MP4 `mvhd`, already in the bytes read). Failing that,
  the provider's `duration` from `get_vod_info`.
- **Bitrate** = size × 8 / duration.
- **Verified on real files:**
  - Sintel 1080p MKV, 1.18 GB: the first 64 KB hold everything. The Tracks element ends at byte 4,900: AVC
    1920 × 818, AC3 5.1, 10 subtitle tracks (ger, spa, fre, ita, dut, pol, por, rus, vie, one untagged), and Duration
    888 s, so 10.6 Mb/s.
  - A faststart HEVC MP4: the `moov` is at byte 28 (7 KB).
  - The two 64 KB reads took 0.47 and 0.32 s.

### 5.2 What it decides
- **Plays on this TV:**
  - **video:** `MediaCodecList.findDecoderForFormat` for the mime, profile, size and frame rate;
  - **sound:** at least one track with a decoder, or with passthrough (`AudioCapabilities` supports its encoding).
  - **Otherwise** the copy is marked with the reason in plain words: "No sound on this TV: DTS-HD is its only sound",
    "This TV can't play its picture".
- **Dolby Vision:**
  - profile 5 on a TV without Dolby Vision: can't play (wrong colours);
  - profile 8: plays as HDR10;
  - the Philips 55OLED810 is sold with Dolby Vision, so it plays as Dolby Vision on the owner's TV (to confirm, 13).
- **Subtitles in the file:** the text languages. These feed 3.1 and the "1 has English in its file" row.
- **The fingerprint:** OpenSubtitles' moviehash = (size + the sum of the little-endian 64-bit words of the first and
  last 64 KiB) mod 2⁶⁴, from the same bytes. For Sintel it is `fb150efab919391d`.

### 5.3 Connections, order and budget
- **Never more streams than the provider allows.** `max_connections` comes from login (`session.js` already keeps it as
  `maxCons`).
  - While the player is open, checks run only if `maxCons ≥ 3`. The owner's 1 or 2 means **none while watching**.
  - One check at a time; one request open at a time.
- **Play cancels a check in flight** (the socket is closed before the stream opens). If the stream then fails with 401,
  403, 429, 458 or 509, or Xtream's "max connections" text, within 10 s of a check, airglow retries once after 2 s,
  silently.
- **Refusals:** a refused check (any of those, or 5xx) backs all checks off for 10 min. Three refusals in a day stop
  them for the day. The Copies menu says "Couldn't check: your provider was busy".
- **Order** (only when idle: no player, no catalog loading):
  1. the open title page's copies, name-best first, at once;
  2. titles focused for 1 s in a grid or row (all their copies);
  3. Continue watching;
  4. Saved;
  5. the first two rows of Movies > Popular.
- **Budget:** 400 checks a day, about 130 KB each (52 MB); one every 4 s in the background.
- **Cache:** `Core.cache`, key `<account>:<kind>:<stream id>`. The value is
  `{ at, size, etag, w, h, res, hdr, video, audio[], text[], dur, mbps, plays, why, hash }`, about 250 bytes. Kept
  60 days; checked again when the size or ETag changes (seen at play start); 20,000 entries, least recently used out
  first.

### 5.4 Ranking (`defaultVersion()` becomes this)
1. **Your pinned copy** for this title, if any (the existing `pickVersion` store).
2. **Language:** audio language in your "Shown first" order (from the check; before it, the name's language, as today).
3. **Plays on this TV** (5.2).
4. **Real class:**
   - **4K:** width ≥ 3200 or height ≥ 1600;
   - **1080p:** width ≥ 1800 or height ≥ 1000;
   - **720p:** width ≥ 1200;
   - **SD:** the rest.
   - A starved copy drops a class: a 4K copy under 8 Mb/s, a 1080p one under 2.5 Mb/s.
5. **HDR:** Dolby Vision (when the TV plays it) > HDR10+ > HDR10 > HLG > none.
6. Bitrate.
7. **Sound:** Atmos / 7.1 > 5.1 > stereo.
8. Subtitles in the file in your languages.

Unchecked copies rank by their name's claim, below checked copies of the same class. A check that finishes later
changes the default for the **next** Play, never the film that's playing.

## 6. Around the app

### 6.1 Posters and filters (`movies-tags`)
- **Top-left tag** (`.pc .tl`): the best copy's real class, filled with a tick when it was checked ("4K", "HD"),
  dashed when only the name says so. **One tag only** at poster size: "4K HDR" is 6 characters at 12 px, which the badge
  rule doesn't allow, and two tags collide with "+N".
- **The 4K chip and the Quality filter:** checked results first. A title is 4K if a check found a 4K copy, or if nothing
  is checked yet and a name says 4K. A check that disproves it takes it out (Dune: Part Two in the mock).
- `catalog.js` facets are rebuilt from the cache once per catalog prepare: a new `PREP` version for movies.

### 6.2 Account > Settings > Languages (`account-languages`)

| Row | Value | Choices |
|---|---|---|
| Shown first | English, Icelandic | as today |
| Subtitles | Always | Always · Only when the sound isn't in your language · Off. **New default: Always**, which the owner's complaint suggests; today it is Auto |
| Subtitle languages | English, Icelandic | the same tick sheet as Shown first; defaults to Shown first until changed |
| Sound descriptions | Leave out | Leave out · Prefer them |
| Subtitles from OpenSubtitles | On | On · Off. Off = the file's own only |

The old `subLang` setting maps to these: `off` → Subtitles Off; a language → that language first in Subtitle languages.

## 7. The player (native; `PlayerActivity`, `ListPanel`, `VodControls`, `Ui`)

### 7.1 The start (`player-start`)
The VOD title block gets a second line (`st-what`, 15/20 `text-2`):
- tick + the copy's real quality and sound;
- "best of 4 copies" (or "your pick");
- the subtitles that are on.

It shows with the controls (4 s at start, then whenever the controls show).

### 7.2 Options > Subtitles (`player-subs`, `player-subs-mixed`; 384 wide)

| Row | Shows | OK |
|---|---|---|
| Off (44) | radio | turns them off for this title |
| IN THE FILE (head, 30) | only if the file has any | – |
| a file track (50) | language / "Made for this copy" | picks it (ExoPlayer override, as today's `pickText`) |
| FROM OPENSUBTITLES (head) | only if any were found | – |
| a downloaded file (50) | language (+ ", with sound descriptions") / the timing verdict with its tick (3.4) | picks it: airglow's own cue renderer starts at once |
| Other languages (44) | globe, count | a list by English name, the best file per language |
| Early or late (50) | timing glyph / "For the subtitles on now" / value "As downloaded", "1.5 s later" | opens the strip (7.3). Greyed "Only for downloaded subtitles" when a file track is on |
| Foot | "None in this copy's file. Remembered for this film." | – |

- **Focus** opens on the row that's on.
- **Picking a row** keeps the panel open, so you can go to Early or late; Back goes up one level as today.
- **Remembered for this title.** The language also becomes the app's choice, as today's `subChanged` does.

### 7.3 Early or late (`player-timing`, the strip)

| Key | Does |
|---|---|
| ◀ / ▶ | 0.5 s earlier / later, shown at once (hold: 4 steps a second, up to 60 s either way) |
| OK or Back | done (every step is saved as you make it) |
| ▲ | back to "As downloaded" (the automatic fix stays) |
| ▼ | Match a line (7.4) |

- **Content:**
  - line 1: glyph + "Icelandic subtitles: early or late", with "Remembered for this film" on the right;
  - line 2: the value in Outfit 700 22, with a 220 px track under it (centre mark = as downloaded, pink dot = now);
  - line 3: the keys.
- The film keeps playing, and the panel is gone while the strip shows.
- **Saved** under `subtime:<title key>:<copy id>:<subtitle id>`. A series' next episode starts from the last value when
  its file has the same `releaseGroup`.

### 7.4 Match a line (`player-timing-match`)
- **What shows:** the next cue's text, "Press OK when you hear it. As timed now, it comes in about 4 s".
- **OK** ("I hear it"): new offset = current offset + (press time − 0.3 s − the cue's start as timed now), rounded to
  0.5 s. Then airglow goes back to the strip with the new value.
- **▶** waits for the following line. **Back** cancels.
- **No line within 20 s:** "No line for a while. ▶ to wait for the next one".

### 7.5 How downloaded subtitles are drawn
- While a downloaded file is on, `TRACK_TYPE_TEXT` is disabled in the player, and `SrtTrack` feeds
  `PlayerView.getSubtitleView().setCues()`.
- **The clock:** a 50 ms handler while playing, plus at once on seek, pause and resume.
- **Each cue is shown** at start × speed + auto offset + your offset.
- The style is today's `styleSubtitles()`; the TV's own caption style still wins.

### 7.6 States in the player

| State | What shows |
|---|---|
| Timing not checked (`player-subs-chip`) | the chip, top right, once per film, for 6 s at the first downloaded line: "Icelandic subtitles, from OpenSubtitles / Timing not checked. Off? ▼, then Subtitles". No action, so OK stays Pause |
| Still downloading at Play | the row reads "Icelandic · getting it…"; when it's ready, the existing one-line text (`showText`): "Icelandic subtitles are ready · CC" |
| Add-on down (`player-subs-down`) | "OpenSubtitles isn't answering / Tried at 21:31. Trying again at 21:32", a Try now row (focused), and "Other copies of this film · 1 has English in its file" (opens Quality) |
| None anywhere | disabled rows "None in this copy's file" and "Nothing on OpenSubtitles for this film"; CC shows today's "This video has no subtitles" |
| File fails to parse or is off | skipped silently; the next file of that language is tried, up to 3 |
| You change the timing by more than 3 s, twice | the strip adds a fourth line: "Still off? ▼ Another file" (▼ Match a line moves to the panel) |

### 7.7 Options > Quality (`player-quality`, 400 wide)
- **Today's panel,** with the copies section rebuilt:
  - "Now: 3840 × 1600" / its real line;
  - COPIES OF THIS FILM;
  - "Always the best copy" (radio, default);
  - one row per copy from the cache: tick + real quality, then "Best · playing · …", "Named 4K · stereo", "No sound on
    this TV · DTS-HD only".
- **Opening it never opens a stream.** A copy not checked yet shows its name's claim with "not checked".
- **Foot:** "Switching starts the other copy where you are. Checked today 21:02."
- The `versions` command now carries the cached check for each copy (section 9.2).

## 8. All states

| State | Title page | Player |
|---|---|---|
| Nothing checked, checks running | dashed tags, "Checking copies · n of N", progress line | – |
| Checks paused (playing on a 1 or 2 connection account; refusals) | "4K · not checked"; Copies rows "Not checked yet · checks wait while you watch" | Quality rows "not checked" |
| A copy can't play here | ranked last, "No sound on this TV…" / "This TV can't play its picture" | same row text |
| Named 4K, really 1080p | tag "HD" with a tick; Copies "Named 4K" | same |
| Only one copy | no Version pill; tags as checked | Quality as today |
| IMDb match found | "Subtitles: EN · IS" | – |
| IMDb match unsure | "Subtitles: which film is it?" → match menu | file's own only |
| "None of these" picked | "Subtitles: EN (in the file)" or "Subtitles: none" | file's own only |
| Add-on down or slow (8 s) | "Subtitles: none yet", "OpenSubtitles isn't answering · trying again at hh:mm" | 7.6 |
| Cinemeta down | the ratings file path still works; else "Subtitles: in the file only", retried in 10 min | – |
| Nothing found | "Subtitles: none found", "Not in the file, none on OpenSubtitles" | 7.6 |
| Only some languages | "Subtitles: EN", "No Icelandic for this episode" | – |
| Timing fixed / fits / not checked | sheet line 2 | panel line 2; the chip for not checked |
| Wrong episode or broken file | skipped | skipped |
| Subtitles Off in Settings | "Subtitles: Off"; the sheet still lists them | Off selected; the list is there |

## 9. Who does what

### 9.1 Web side (`app/tv/js/`)
- **New `subs.js`:**
  - the IMDb id (3.2), the add-on list and the ranking (3.3);
  - the per-title choices (language, "none of these", the match);
  - sends the candidates to the player.
- **New `copies.js`:**
  - the check queue (5.3) through a new plugin command;
  - the cache;
  - the ranking (5.4) for `defaultVersion()`;
  - the facets for posters and filters.
- **Changed:**
  - `detail.js`: the pills, the source line, the menus and the sheet;
  - `cards.js`: `poster()` tags;
  - `catalog.js`: `versionLabel`, `defaultVersion`, facets, `PREP`;
  - `account.js`: rows;
  - `player.js`: commands;
  - `scripts/build-ratings.js` + `catalog.js` `loadRatings()`: v2 rows with the tconst.

### 9.2 Native (`android/app/src/main/java/app/tuner/player/`)
- **New `Probe.java`:** the reads, the fingerprint and MetadataRetriever (5.1 and 5.2).
  - command `probe { id, url, headers }`;
  - event `probed { id, ok, size, etag, w, h, hdr, video, audio, text, dur, mbps, plays, why, hash }` or
    `{ id, ok:false, status }`;
  - one at a time, cancelled by any `play`.
- **New `SrtTrack.java`:** downloads, parses, runs the timing check (3.4) and draws (7.5).
- **New command `subs`:** `{ titleKey, copyId, list: [{ id, url, lang, name, source:'file'|'os', hash, hi,
  releaseGroup }], ref: [...], pick, saved: { [subId]: offset } }`.
- **Changed events:**
  - `setting` (key `sub`) gains `subtime` (the saved offset);
  - `need` gains `subs`, sent when the panel opens before the list arrived.
- **`PlayerActivity`:**
  - `openSubtitles()` rebuilt (7.2);
  - the strip view (7.3, 7.4);
  - `openQuality()`'s copies section (7.7);
  - the `st-what` line in `VodControls`;
  - the film chip moved top right.
- **`Ui`:** the timing and globe icons; the tick badge (from the diagnosis work).

## 10. Data and APIs, verified with curl on 27 Oct 2026

### 10.1 Cinemeta (`v3-cinemeta.strem.io`, manifest version 3.0.14, `Access-Control-Allow-Origin: *`)
- **`/catalog/movie/top/search=<q>.json`** → `{ metas: [{ id, imdb_id, type, name, poster, background, releaseInfo,
  links, behaviorHints }] }`.
  - There is no year field in search results: use `releaseInfo` ("2023", series "2022-").
  - It took 0.9 to 5.4 s uncached.
  - It is fuzzy: "sintel" → Interstellar, Single Street, Santee; "sintel 2010" → four unrelated 2010 films.
  - It finds AKAs: "konungur ljónanna" → The Lion King 1994 and 2019; "leitin að nemo" → Finding Nemo; "snerting" →
    Touch; "fluch der karibik" → Pirates of the Caribbean.
- **`/meta/movie/tt0468569.json`** → `meta.{ name, year, runtime ("152 min"), released, moviedb_id, imdbRating, genres,
  … }`.
- **`/meta/series/tt11280740.json`** → `meta.videos[]`, 40 entries `{ id: "tt11280740:S:E", season, episode, name,
  released }` (season 0 = specials).

### 10.2 OpenSubtitles add-on (`opensubtitles-v3.strem.io`, manifest `org.stremio.opensubtitlesv3` 1.0.0)
- `idPrefixes: ["tt"]`; types movie and series; Cloudflare in front, with `Access-Control-Allow-Origin: *`.
- **`/subtitles/movie/tt15398776.json`:** 96 files, 0.2 s, `Cache-Control: max-age=172800`.
  - **Fields:** `id, url, lang, m, g, SubEncoding, subtitleFileName, movieReleaseName, releaseGroup, releaseFormat,
    releaseOther, fpsMilli, season, episode`.
  - **Answer fields:** `cacheMaxAge, staleRevalidate, staleError`.
  - Not every file has `fpsMilli`: the Icelandic one doesn't.
- **`/subtitles/series/tt11280740:1:1.json`:** 65 files, all with `season: 1, episode: 1` (one of them is named
  01x08).
- **An unknown id** (`tt9999999999`) → `{"subtitles":[], "cacheMaxAge":600}`. A malformed one → the same.
- **The extra path:** `/subtitles/movie/<id>/videoHash=<16 hex>&videoSize=<bytes>[&filename=…].json`.
- **Availability seen:** Icelandic is rare. One file for Oppenheimer; none for The Lion King 1994 or 2019, Lamb,
  Touch, or Severance S1 E1. English is there for all of them (6, 9, 8, 6, 8 and 2 files).

### 10.3 The subtitle files
- `subs5.strem.io/en/download/subencoding-stremio-utf8/src-api/file/<n>` → `application/x-subrip; charset=utf-8`,
  `Cache-Control: public, max-age=31536000`, CORS open.
- **Oppenheimer English (Will1869 BluRay):** 239,363 B, 3,087 cues, ends 02:53:38.
- **Oppenheimer Icelandic (BluRay-isl):** 240,437 B, 2,947 cues, ends 02:52:52, 2,912 stray `U+FEFF`.

### 10.4 The fingerprint
- **Range reads on a public 1.18 GB MKV (Blender's Sintel):** 206, Content-Length 65,536, in 0.47 s and 0.32 s. The
  first try was answered with the whole file instead (5.1).
- **Fingerprint-matched files come first and are marked.** With `videoHash=8e245d9679d31e12&videoSize=12909756`
  (OpenSubtitles' published test file, "breakdance") on Breakin' (`tt0086998`), 4 of the 54 files come back
  `"m":"h"`, the first one first. Without it, all 54 are `"m":"i"`. OpenSubtitles' own REST search confirms that hash
  belongs to Breakin'.
- **Unknown hashes don't hurt.** The Sintel hash `fb150efab919391d` is unknown to OpenSubtitles; the answer is simply
  the IMDb list.

### 10.5 The ratings file
- `github.com/Burger-Nice/tuner/releases/download/ratings/ratings.json`: 3,006,826 B, v1, `minVotes` 1,000, 52,688 films
  and 12,965 series.
- **Holds:** "dark knight" 2008, "oppenheimer" 2023, "severance" 2022, "lamb" 2021 with alt "dyri", "touch" 2024 with
  alt "snerting".
- **Misses:** "Harry Potter and the Philosopher's Stone" (the IMDb title is Sorcerer's Stone, which Cinemeta then
  finds) and Sintel.

### 10.6 The Xtream fields this needs
- **`user_info.max_connections` and `active_cons`:** already read.
- **`get_vod_info` `info.duration` / `duration_secs`:** the community docs show the latter.
- **`info.video`, `info.audio`, `info.bitrate`:** some panels return the panel's own media probe. Not in any doc I could
  reach, and unverified. If the owner's provider sends them, they are a free first guess, shown as **not checked**
  (dashed), never as a tick.

## 11. Port checklist

1. **CSS:** the TV parts of `subtitles.css` into `app/tv/app.css`, including the **clamp fix**.
   - While building these mocks, the audit found that the title page's `.t-display.clamp2` cuts the descenders of a
     one-line title: content 47 px in a 44 px box; the pixels change when the clamp is lifted.
   - The fix is `padding-bottom:4px; margin-bottom:-4px`, so nothing moves.
   - This is in today's app, separate from this feature, and may be what the owner saw as "the g was clipped".
2. **Ratings v2:** `build-ratings.js` writes the tconst; `loadRatings()` and `matchImdb()` return it; bump the file's
   `v`.
3. **`copies.js` + `Probe.java`:**
   - the queue, the connection rules and the cache;
   - `defaultVersion()` and `versionLabel()`;
   - poster tags and facets (new `PREP`).
4. **`subs.js`:** the id, the list, the ranking, the per-title choices, the match menu.
5. **`detail.js`:** the pills and the source line (`fitCol` pushes More like this), the Copies menu, the Subtitles
   sheet, the match menu, Play's "Checking 2 copies…".
6. **`account.js`:** the Languages rows, and the `subLang` migration.
7. **Native:**
   - `SrtTrack.java`, the `subs` command;
   - `openSubtitles()` rebuilt, the strip and Match a line;
   - `openQuality()` rows, the `st-what` line, the film chip at the top.
   - **Wait for the playback-diagnosis work in `PlayerActivity.java` to land, then build on it** (it is being changed
     in the same tree now).
8. **Tests:**
   - **`tests/mock-provider.js`:** Range support (206 and `Content-Range`) on VOD files; a small MKV with a known
     fingerprint in `.tmp/media`; a fake Cinemeta and a fake add-on on the same port (like the fake ESPN), including a
     PAL-timed SRT and a wrong-episode file.
   - **`tests/tv/drive.js` scripts:**
     - the title page goes from checking to checked;
     - the Copies order and Best;
     - Play takes rank 1;
     - the which-film path;
     - the add-on down.
   - **The emulator test:**
     - a downloaded subtitle shows at its time;
     - ▶ in the strip moves the next cue by 0.5 s;
     - Quality lists checked copies without a new connection (count requests at the mock).

## 12. Self-check (`node tools/audit.js`; ring data in `tools/audit-rings.json`)

**The checks.** The diagnosis audit runs on all 18 mocks:
- one ring; text under 14 px; overlaps; clipping and line clamps; the safe area for text, rings and every floating box;
  contrast;
- the CONTAIN check;
- chip width ≤ 420 and panel height ≤ 453;
- ellipsised panel text;
- one-line chip lines;
- RING, the ring read back from the 2x screenshot.

**Eight new checks:**

| Check | Fails when |
|---|---|
| ONE | more than one focus ring |
| TICK | a named-only claim has a tick or no dashed outline, or a checked claim has no tick |
| BEST | copies out of rank order, or not exactly one Best, on rank 1 |
| STEP | a timing value that isn't a multiple of 0.5 s |
| SOURCE | a menu, sheet, panel or chip offers downloaded subtitles without naming OpenSubtitles |
| JARGON | HEVC, AVC, H.264, x265, codec, hash, SRT, fps, remux, bitrate or a `tt` id on screen |
| CLOCK | a 12 h time |
| HUE | an amber or yellow colour (hue 32 to 68), or a red one outside LIVE, on any UI element |

**Proved with `--inject-st`,** which puts one fault of each kind into every mock. Each check fires:
- ONE 7, TICK 4, BEST 1 per copies list, STEP 15, SOURCE 5, JARGON 15, CLOCK 15, HUE 18;
- the injected text sits under a scrim on the 3 modal mocks, where the audit rightly skips it.

**Result: 18 pages, 0 findings.**

**Found and fixed while building:**
- the subtitle panels at 462 px (over the 453 cap): rows 50 and 44, heads 30;
- the timing row ellipsised: "Early or late" now;
- the match menu crossing y 513: top 44;
- two poster tags colliding with "+3": one tag;
- a 12 px "Dolby Vision" badge: HDR;
- a chip line on two lines;
- the pills lifting past x 48: ring without lift, as in the app;
- the clamp bug in 11.1.

| Mock | Focused | Ring white, all sides | Ring box | To the safe edge |
|---|---|---|---|---|
| detail-ready, detail-checking, detail-subs-down | Play | 100% | 45, 244, 173, 300 | −3.3 (lift from the left edge, as the app's `.d-col .btn`) |
| detail-copies | Always the best copy | 100% | 56, 88, 640, 158 | 8 |
| detail-subs-sheet | English | 100% | 508, 125, 896, 195 | 16 |
| detail-which-film | Subtitles pill | 100% | 43, 251, 301, 297 | −5 (the ring on the x 48 line; allowed to 6) |
| detail-match | The Lion King (1994) | 100% | 56, 120, 560, 190 | 8 |
| detail-series | E1 tile | 100% | 43, 268, 263, 396 | −5.3 |
| movies-tags | Dune: Part Two | 100% | 188, 166, 328, 372 | 139 |
| account-languages | Subtitles | 100% | 267, 187, 905, 253 | 7 |
| player-start | the seek thumb | 100% | 54, 415, 86, 447 | 5.6 |
| player-subs | Icelandic (inset) | 100% | 59, 218, 421, 268 | 11 |
| player-subs-mixed | Icelandic (inset) | 100% | 59, 308, 421, 358 | 11 |
| player-subs-down | Try now (inset) | 100% | 59, 308, 421, 352 | 11 |
| player-quality | Always the best copy (inset) | 100% | 59, 170, 437, 220 | 11 |
| player-timing, player-timing-match, player-subs-chip | none: HUDs | – | – | – |

## 13. What only the TV can tell (and how to check it there)

1. **Whether the owner's provider honours Range requests, and frees the connection slot as soon as a check closes.**
   To check: open a title page, wait for "Checked", then press Play at once. Also watch Account > Provider >
   Connections.
2. **What his provider's copies really are.** The Copies menu on a few titles he knows are "ehh".
3. **What this TV decodes:** DTS and DTS-HD (I couldn't confirm whether this model decodes DTS), TrueHD, Dolby Vision
   profiles 5 and 8, HDR10+.
4. **Whether `get_vod_info` carries the media fields** (10.6), and whether it carries an IMDb id.
5. **How the auto-fixed Icelandic file feels over a whole film**, and whether 0.5 s steps are fine enough from the
   sofa.
6. Subtitles drawn by airglow vs by ExoPlayer: identical style, no flicker at the 50 ms clock, and the TV's caption
   style still respected.
7. How long the checks take on his line (they took 0.3 to 0.5 s per 64 KB read here).

## 14. Open questions (for the owner)

1. **Outward-facing:** airglow would send each title's IMDb id and the file fingerprint to Stremio's servers
   (`opensubtitles-v3.strem.io`, `v3-cinemeta.strem.io`), and download from `subs5.strem.io`. That tells Stremio what he
   watches, though not who he is. OK? It is a free public service with no account or key; if it goes away, the file's
   own subtitles still work.
2. **Subtitle languages:** English first, or Icelandic first when there is one? And is "Always" the right default, or
   "Only when the sound isn't in your language"?
3. **Background checks** read about 130 KB per copy from his provider (up to 400 a day, never while he watches on a 1
   or 2 connection account). Fine, or only on the title page?
4. **Dolby Vision vs sound:** should a copy with better picture but no sound on the TV be offered at all, or hidden?
   (Designed: offered, ranked last, with the reason.)
5. **Sound descriptions:** "Leave out" as the default?
