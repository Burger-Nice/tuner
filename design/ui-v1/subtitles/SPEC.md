# airglow TV: subtitles that are always there, and real quality for every copy, v1.1

This is the design spec for the engineer. It extends `design/ui-v1/UI-SPEC.md` v1.2 (layout, type, focus, the native
player's panels) and reuses the diagnosis rules (`design/ui-v1/diagnosis/SPEC.md`: a green tick only on something that
was checked). Everything not said here follows those two.

**The owner's problem, in his words:** movies and shows from the provider are "ehh: sometimes no subtitles, bad
quality, shit like that".

**The answer, in two parts:**
1. **Subtitles that are always there.** When the provider's file has none in your languages, airglow gets them from
   OpenSubtitles (through Stremio's public add-on), picks the right file, lines its timing up and fixes its speed when
   it can. You can still nudge it 0.5 s at a time.
2. **Real quality for every copy.** airglow reads the first and last 64 KB of a copy (about 130 KB, one copy at a time)
   and learns what it really is: resolution, HDR, sound, the picture's bitrate, its subtitles, and whether this TV can
   play it. The provider's names lie; this doesn't. Play picks the best real copy.

| File | What it is |
|---|---|
| `SPEC.md` | this |
| `*.html` (18) | the mocks; `png/*.png` are their 2x renders, and `png/contact-sheet.png` shows all of them |
| `subtitles.css` | the new CSS, all prefixed `st-` (the TV parts go into `app/tv/app.css`; the player parts are measurements for native views) |
| `tools/build.js` | builds the mocks |
| `tools/render.js` | the PNGs and the contact sheet |
| `tools/audit.js` | the self-check (section 12): the diagnosis audit plus 11 new checks |
| `REVIEW-independent.md` | the review of v1.0 (6.8 / 10) that v1.1 answers |

## v1.1 changes: an answer to every review point

**The shared pieces.** The add-ons design (`design/ui-v1/addons/`) reuses this design's Copies menu, "Which film is
this?" picker, tick and pill row. They stay compatible; what changed in them is in **section 15**. The copy ranking and
the one wait before Play are now written once, here in **section 5.4**, and are the same rules the add-ons spec must
carry (add-ons review M2).

### Must fix

**M1. A green tick on timing that was only compared with other subtitles. Accepted.**
- **Ticks now go only on anchored verdicts:**
  - "Made for this copy" (a fingerprint match, or a track in the file);
  - "Lined up with this copy" (checked against a fingerprint-matched file in any language).
- **Unanchored verdicts have no tick**, with their own words:
  - "Lined up with other subtitles";
  - "Timing fixed to fit this film";
  - "Timing not checked".
- **The check is anchored to the copy wherever it can be:**
  - **Speed follows the copy's frame rate** from the check. On a 25 fps copy, a PAL-timed file is the one that fits:
    the reference is scaled by 23.976/25 before comparing, never the other way round.
  - **The copy's duration bounds the result:** the last cue, after the fix, must start before the copy ends.
  - **Without an anchor, only speed fixes and offsets of 2 s or more are applied.** Real releases differ by up to
    0.7 s: Oppenheimer's WEB-DL and GalaxyRG files have identical cues 0.7 s apart. A pair of other files can't tell
    which one the copy matches.
- **Mocks:** `detail-subs-sheet`, `player-subs` and `player-subs-mixed` have no timing ticks now. The in-file tracks
  keep "Made for this copy" with a tick. See section 3.4.

**M2. Thresholds on a knife edge, a gap in the verdicts, and a junk "release" field. Accepted.**
- **The match is symmetric:** one-to-one pairs within 0.3 s, divided by min(n_ref, n_cand).
- **The winner is relative:** the best (speed, offset) must score at least 0.4 **and** at least 2× the best wrong speed.
- **It must hold in each third of the film** (0.3 or more), which catches a different cut.
- **Every result has a verdict.** There is no gap: under the rule it's "not checked" (the file still shows), and below
  0.25 against an anchor the file is skipped.
- **A release** is `movieReleaseName`, lowercased, with HI / SDH / CC tokens and the extension removed.
- **Re-run on the real files with this rule** (my run, section 10.3):

| Pair | Result |
|---|---|
| Will1869 vs WEB-DL MA and vs GalaxyRG | 0.70 at −0.5 s and +0.2 s, 2.7× the wrong speeds, thirds 0.58 to 0.62 |
| The Icelandic file | 0.81 at 25/23.976 +0.4 s, 3.6×, thirds 0.77 to 0.81 |
| The Dark Knight's English file against Oppenheimer (a wrong film) | 0.22 with no speed ahead (1.0×): rejected |
| Will1869 vs its own HI version | 1.00 at (1, 0): the same release, so not a valid pair |

**M3. Today's `matchImdb()` is too loose for subtitles. Accepted.**
- **A strict matcher for subtitles and copies:**
  - films need a year (± 1);
  - a key that maps to 2 or more rows is "unsure" (counted while indexing).
  - Verified: "lion king" has 1994 and 2019, "dune" 2021, 1984 and 2000, "office" 8 rows.
- **Every id, whatever its source, is checked against the copy's checked length:** Cinemeta `/meta` `runtime` within
  ± 8% (The Lion King 89 min, the 2019 film 118, Mufasa 118).
- **`info.tmdb_id`, when the provider sends it,** is matched against Cinemeta's `moviedb_id` (8587 / 420818 / 762509)
  to confirm or to choose.
- The star rating keeps today's loose match. See section 3.2.

**M4. The source line pushed More like this past the safe line; the series mock wasn't the real layout. Accepted.**
- **The source text is on the pill row, after the pills** (`.st-side`: "From OpenSubtitles · Icelandic ready too"). The
  page keeps the app's height: More like this is at 366 / 400 again, and the cards end at 511.
- **`detail-series` is re-mocked on the real layout:** a two-line plot, chips at 272, rail at 318, synopsis at 486.
  The focused episode's subtitles ride on its synopsis line.
- **The new RAILFOCUS check fails any focusable rail card that would sit past 513 when focused.** It catches all five
  v1.0 film pages when the old offset is put back.

**M5. Background checks could look like scraping. Accepted.**
- **The default checks:** the open title page's copies, Continue watching, Saved. At most **60 a day**, at least 60 s
  apart.
- **A batch never starts while `active_cons > 0`** (re-read at login before each batch; other devices use the same
  account), or while a live preview plays.
- **Posters and the 4K filter fill in slowly**, as a bonus; they never drive the queue. See section 5.3.

**M6. Media3 1.6.0 can't do what 5.1 said. Accepted, checked in the 1.6.0 jars.**
- **Duration:** `MetadataRetriever` has only `retrieveMetadata(Context | MediaSource.Factory, MediaItem)` →
  `TrackGroupArray`. So the probe prepares its own `ProgressiveMediaSource` with a capped data source, the way
  `MetadataRetriever` does internally. That gives the Timeline's duration as well as the track groups.
- **A cap:** 1 MB per check, plus one `moov` read of up to 8 MB when the box walk shows it at the end, and a 6 s
  wall-clock timeout.
- **A tail read that isn't a 206 with a matching `Content-Range` aborts the check:** "Couldn't check". A head read
  answered 200 still gives the tracks (an MKV's are in the first 5 KB) but no fingerprint. See section 5.1.

**M7. The focus ring crossed the sheet's section heading. Accepted.**
- The heading now has 8 px before the first row.
- **The new RINGTEXT check** fails any text crossed by a ring's full extent (6 px outside the box) that isn't part of
  the focused element. It finds the v1.0 overlap (5 px) when the old spacing is put back.
- It also found a crossing in today's player, now in the port list: at 0:00 the seek thumb's ring touches the elapsed
  time under it. The fix is labels 14 px under the bar instead of 10.

### Should fix

**1. Sound-description files: 3 of 6, not 2. Accepted.**
- Name tokens are matched case-insensitively: `(SDH)`, `-HI` and `.Sdh` are all caught.
- The content test counts cues with `[…]`, `(…)`, `♪` or a `NAME:` line, at an 8% threshold. On the real files: the 3
  with sounds are 15.2%, 18.9% and 18.9%; the other 4 are 0.0%.

**2. Untagged Matroska tracks report as English. Accepted.**
- airglow's own header read sees whether a TrackEntry has a Language element. An untagged track is "probably English":
  it is listed as "Untagged track · probably English".
- OpenSubtitles is still asked, and its best English stays in the panel (`player-subs-mixed` keeps a downloaded
  English row).

**3. HDR, HDR10+ and Atmos claims. Accepted.**
- **HDR10 / HLG** come from the HEVC SPS via `NalUnitUtil.parseH265SpsNalUnit(...).colorTransfer`. It's in 1.6.0
  (`H265SpsData` has `colorTransfer`), read from `Format.initializationData` when `colorInfo` is empty.
- **HDR10+ and Atmos** are never shown as ticked facts, and are out of the ranking.

**4. Store formats, not the verdict. Accepted.**
- The cache keeps the formats. "Plays on this TV" is decided when ranking, through Media3's own renderer
  `supportsFormat` / `MediaCodecUtil` and the audio route at that moment, so the check and the player agree.

**5. The bitrate counted every sound track. Accepted.**
- The picture's share = size × 8 / duration, less a nominal rate per sound track:

| Sound | Nominal rate |
|---|---|
| AAC | 0.2 Mb/s |
| AC3 | 0.64 Mb/s |
| E-AC3 | 0.77 Mb/s |
| DTS | 1.5 Mb/s |
| DTS-HD, TrueHD | 4 Mb/s |

- The mocks show 15 / 6.7 / 2.8 / 22 Mb/s, and the Copies foot says "Mb/s is the picture's share".

**6. Different cuts. Accepted.**
- Copies whose lengths differ by more than 3% are different cuts: "Longer cut · 3 h 20 min" on line 2 of their row.
- "Always the best copy" never changes the cut. Its default is the cut that matches IMDb's runtime (± 8%).
- Subtitles are matched to the copy's own length (M3).

**7. Dubbed copies. Accepted.**
- When the copy's sound is in one of your languages, subtitles in another language are off by default: a dub isn't the
  translation the subtitles were made from.
- A dub never raises the which-film ask: the match is in the sheet only.
- `detail-which-film` is now an English copy (below), not the Icelandic dub.

**8. Formats and tags. Accepted.**
- The format is sniffed from the body: `WEBVTT` or SRT timestamps. Anything else (MicroDVD, `.txt`) is dropped.
- `<font>`, `<b>` and `<u>` are stripped, as are `{\…}`. `<i>` is kept.

**9. The which-film menu. Accepted.**
- One `/meta` call per row (0.15 s) gives the length and director: rows are "title / year · length · director".
- "animated" is gone.
- The 1994 film is 1 h 29 min.
- **When the copy's length is known** and exactly one candidate is within ± 5% (the others more than 10% away), it is
  accepted without asking.
- **When the length doesn't decide,** the mock case asks. "EN| The Lion King" has no year, two IMDb films have the name,
  and the copy couldn't be checked, so no length. The first result is focused, and the header says the length is
  unknown.

**10. Connections. Accepted.**
- `active_cons` and live previews count as streams in use.
- M3U accounts count as 1 connection.
- A refused Play retries at 2, 5 and 10 s behind the diagnosis design's "Waiting for your provider" card.

**11. Play never waits on a check. Accepted, and wider: on any account.**
- "Checking 2 copies…" is gone. Play plays the best copy known now; a check that finishes later is for the next Play.
- The only wait before Play is the add-ons' one (5.4).

**12. When the best copy fails. Accepted.**
- The diagnosis design's failure card gets a "Try the next copy" row, naming it ("1080p · 6.7 Mb/s · Dolby Digital
  5.1"). OK plays rank 2 from where you were.
- After two copies fail, it's the card's normal end.

**13. "Subtitles: EN · IS" read as both on. Accepted.**
- The pill names the one that will show ("Subtitles: English"). "Icelandic ready too" is on the pill row.

**14. "Sound descriptions" read like narration for blind viewers. Accepted.**
- It is now "Subtitles with sounds" / "Lines like [door slams] and who is speaking" (Account, the panel, 3.3).

**15. Plain words. Accepted, all three.**
- "Checking what each copy really is".
- "Timing fixed to fit this film".
- The which-film meta line is gone (the line on the pill row explains).

**16. Picking in the Subtitles panel should close it. Accepted.**
- OK picks and closes, with `showText`: "Icelandic subtitles on · ▼, then Subtitles for timing".
- "Early or late" is an indented row right under the downloaded subtitle that's on, 1 press from it (`player-subs`).

**17. Series: which episode the pill describes. Accepted.**
- The pill by Play always describes the episode Play plays (`seriesResume()`).
- The focused tile's subtitles go on its synopsis line ("E2 · Half Loop · English subtitles, from OpenSubtitles · …").

**18. The tick sat low and tight. Accepted.**
- On second lines: 14 px, centred on the line, 6 px from the text. On first lines: middle-aligned.
- The new TICKGAP check fails a tick under 3.5 px from its text or more than 3 px off its line. It catches the v1.0
  style.

**19. The Quality foot was crushed. Accepted.**
- "Checked today 21:02" is dropped from the foot, the Now row is one line, and the panel is 384 wide. It ends at y 471.

**20. Ticks on every poster. Accepted.**
- Posters show filled vs dashed only. The TICK check exempts `.pc`.

**21. The Options gate and the stored preference. Accepted (9.2).**
- `openOptions()` lists Subtitles when there are file tracks **or** downloads, or a list is coming.
- `openSubtitles()` no longer returns early on `textTracks == 0`.
- The per-title choice gets its own store: `subpick:<title key>` → `{ source, id, lang }`, beside the global `sub`.

**22. Drawing the cues. Accepted (7.5).**
- airglow uses its **own** `SubtitleView`, laid over `PlayerView`, so `PlayerView`'s `onCues` can't fight it.
- `setCues()` runs only at cue boundaries (a post at the next start or end), and at once on seek, pause and resume.

**23. Where the timing check runs. Accepted (9.1).**
- In `subs.js`, about 50 ms, with the files the title page already downloaded (CORS is open), so the sheet can show the
  verdicts.
- Native gets `{ text, speed, autoOffset }` through the plugin (about 240 KB once), so nothing is downloaded twice.

**24. `subLang: 'auto'` wasn't mapped. Accepted (6.2).**
- It becomes "Only when the sound isn't in your language", the nearest to today's "the file decides", until the owner
  answers 14.2.

### Nits

All are fixed:
- one word, **1080p**, everywhere (posters, tags, Copies, Quality), and tags keep their case ("1080p", not "1080P");
- the stand-in art has no yellow (More like this cards have explicit violet, green, blue and pink hues);
- the audit's note for HUD mocks is corrected;
- the strip is y 27 to 155;
- "Two films are called The Lion King" with three rows (Mufasa is named differently);
- Subtitles and Quality are both 384 wide, and Options becomes 384 while a film plays;
- ▲ in the strip reads "Undo my changes";
- the top-right position is for this chip only (Up next keeps the kit's);
- a stopword sniff on the first 50 cues re-labels or drops a file whose language label is wrong (Severance's "French"
  file is English);
- 10.4: only the fingerprint-matched files are marked, and the first of them is first;
- 10.3: the 239,363 B file is Will1869's **-HI** one.

---

## 0. Scenario and data

- **When:** the owner's TV, Tue 27 Oct 2026 at 21:30 Reykjavik time (UTC).
- **Settings > Languages:** English, Icelandic; Subtitles Always; Subtitles with sounds Leave out.
- **Real data,** fetched with curl on 27 Oct 2026 (section 10):
  - Oppenheimer (`tt15398776`): 96 files in 33 languages, 6 English (3 with sounds) and 1 Icelandic, which is timed for
    a copy that runs 4.27% faster.
  - Severance S1 E1: 2 English, no Icelandic.
  - The Lion King: 1994 (89 min, Roger Allers and Rob Minkoff), 2019 (118 min, Jon Favreau), Mufasa: The Lion King 2024
    (118 min, Barry Jenkins).
- **Illustrative:** the provider's four copies of Oppenheimer. None of their fingerprints is known to OpenSubtitles,
  which is likely for IPTV copies.

| Copy (provider's name) | What the check finds | Rank |
|---|---|---|
| `EN\| Oppenheimer 4K` | 3840 × 1600, HDR10, picture 15 Mb/s, Dolby Digital Plus 5.1, 21.6 GB, no subtitles in the file | 1, Best |
| `EN\| Oppenheimer FHD` | 1920 × 800, picture 6.7 Mb/s, Dolby Digital 5.1, 9.8 GB, English and Spanish in the file | 2 |
| `EN\| Oppenheimer (2023) 4K UHD` | 1920 × 800, picture 2.8 Mb/s, stereo, 4.1 GB: **named 4K, really 1080p** | 3 |
| `MULTI\| Oppenheimer 2160p DV` | 3840 × 2160, Dolby Vision, picture 22 Mb/s, DTS-HD 5.1 as its only sound | 4 (no sound on this TV) |

## 1. Decisions in one list

1. **Sources, in order:** the file's own subtitles, then OpenSubtitles via `opensubtitles-v3.strem.io`. Other
   subtitle add-ons plug in through the add-ons design (its section 7).
2. **The IMDb id comes from the ratings file the app already downloads**, through a **strict** matcher, and is
   **checked against the copy's length**. The fallbacks, in order: the provider's TMDB id, Cinemeta search with strict
   rules, and asking (3.2).
3. **The file fingerprint (OpenSubtitles' moviehash) is a by-product of the quality check:** both need the first and
   last 64 KB.
4. **Timing is lined up before a downloaded file shows, anchored to the copy wherever possible.** The anchors are the
   fingerprint, the copy's frame rate and its length. Only anchored verdicts get a tick (3.4).
5. **airglow draws downloaded subtitles in its own `SubtitleView`**, so a timing step or a file change shows at once,
   with no re-buffer.
6. **Early or late moves in 0.5 s steps,** remembered for title + copy + subtitle file.
7. **Subtitles in the file can't be shifted** (ExoPlayer draws them, and they were made for the file).
8. **One check at a time, a small daily budget (60), never while anything else uses the account.** Results are cached
   per copy for 60 days.
9. **One ranking and one wait for the whole app** (5.4, shared with add-ons). Play never waits on a check.
10. **Ticks mean checked.** Filled tag with a tick = airglow found it (posters: filled, no tick). Dashed = only the
    provider's name says so.

## 2. Rules every surface follows

### 2.1 Geometry
- Canvas 960 × 540; safe area x 48 to 912, y 27 to 513. Every floating box (menu, sheet, panel, strip, chip) is
  inside it, every focusable rail card is inside it when focused (RAILFOCUS), and no ring crosses text it doesn't own
  (RINGTEXT).
- **The title page keeps the app's vertical budget:** the pill row is 36 high, and its text rides on the same row.
- **Native panels:**
  - left 48, top 27, height = content (cap 453), radius 16;
  - rows 50 (two lines) or 44 (one line); section heads 30;
  - **384 wide** for Options, Subtitles and Quality while a film plays (today 320 / 320 / 352).
- **The timing strip:** 520 wide, top centre, x 220 to 740, y 27 to 155.
- **The "timing not checked" chip:** top right (right 48, top 27), because the bottom belongs to the subtitles. Every
  other chip keeps the kit's place.

### 2.2 Focus and keys
- One ring per screen. The timing strip and the chip are HUDs with none.
- **Title page:** the pills are a `data-row` under Play and Save. The text after them takes no focus. Pills get the ring
  without the lift, as `app.css` does for `.pillbtn`.
- **Player:** the key map is unchanged. CC opens Subtitles; ▼ Options. OK stays Pause on films.

### 2.3 New glyphs (`Ui.Icon` and `util.js`, 24 grid, 2 dp stroke, round caps)
- **timing:** a clock with a tick either side.
- **globe:** from the internet.
- **The checked tick:** the diagnosis badge, a green `--a-ok` disc with an ink check, 13 to 16 px, centred on its line,
  6 px from its text.

### 2.4 Colour
- **Green tick:** only on an anchored, checked fact.
- **Dashed tag in `text-2`:** the provider's name says so.
- **Pink:** radio dots, the timing dot and progress.
- No amber, no yellow (UI and stand-in art); red only for LIVE.

### 2.5 Copy rules
- **Plain words.** No codec, container or hash words on screen (audited). "15 Mb/s" stays, with the Copies foot "Mb/s is
  the picture's share".
- **One quality vocabulary:** 4K, 1080p, 720p, SD; HDR10, Dolby Vision, HDR (HLG and unknown kinds); 5.1, 7.1, stereo.
- **Name the source** wherever downloaded subtitles are offered (audited).
- **24 h times.**
- **Timing values in 0.5 s steps** ("1.5 s later", "As downloaded"). "Later" means the subtitles appear later.

## 3. Subtitles: where they come from and how one is picked

### 3.1 The order of sources, per language
For each of your subtitle languages, in your order, the first of these that exists:
1. **In the file:** a full (not forced-only) text track in that language, known from the check and confirmed at
   prepare. An untagged Matroska track counts as "probably English" (Media3 reports it as `eng`), and downloads are
   still fetched.
2. **From OpenSubtitles, made for this copy:** `"m":"h"` (the fingerprint matched).
3. **From OpenSubtitles, the best of the rest** (3.3), shown with its timing verdict (3.4).

**What shows:**

| Setting | What shows |
|---|---|
| Always | the first of your languages that has any |
| Only when the sound isn't in your language | the same, when the copy's sound isn't one of "Shown first" |
| Off | nothing (the panel still lists them) |

**The dub rule (should-fix 7):** when the copy's sound is one of your languages, only subtitles **in that same
language** show by default.

The other languages are fetched in the background and wait in the panel; "Icelandic ready too" says so.

### 3.2 The IMDb id (strict: for subtitles and copies)
1. **The provider's own ids:** a `tt\d{7,8}` in `get_vod_info` / `get_series_info`, if any. And `info.tmdb_id`, kept
   for step 5.
2. **The ratings file, v2.**
   - `build-ratings.js` adds the tconst as the row's 7th field; this costs about 0.6 MB on today's 3.0 MB.
   - **A strict index:** key + year ± 1, and the original-title key as well.
   - A key with 2 or more rows is "unsure" without a year.
   - Today's loose `matchImdb()` stays for the star rating only.
3. **Cinemeta search** (`/catalog/{movie|series}/top/search=<cleaned name>.json`), top 5, for anything step 2 didn't
   settle.
   - **with a year:** within ± 1, and names sharing ≥ 60% of words (or the top result sharing ≥ 1 word);
   - **with no year:** a single exact name.
   - Verified: "Philosopher's Stone" (2001) → Sorcerer's Stone; "Leitin að Nemo" (2003) → Finding Nemo.
4. **Length check, for every candidate from any step:** Cinemeta `/meta/movie/{tt}.json` `runtime` within ± 8% of the
   copy's checked length. When several candidates remain, exactly one within ± 5% (others more than 10% away) is
   accepted.
5. **TMDB check:** `info.tmdb_id` equal to the meta's `moviedb_id` confirms a candidate or picks among them.
6. **Ask** (`detail-which-film`, `detail-match`) only when steps 1 to 5 leave it open, and never for a dub (the sheet's
   "Not this film?" still works). The answer is remembered per title and serves add-on copies too.

**Series:**
- The episode id is `tt…:season:episode`.
- The series is matched as above, with the year when the provider gives one.
- Cinemeta `/meta/series/{tt}.json` (25 KB, every episode) checks that the episode exists. If it doesn't, the episode
  uses the file's own subtitles only.

**One matcher for the app:** this section is the add-ons design's 4.4 as well.

### 3.3 Ranking OpenSubtitles files within a language
Each file's fields: `{ id, url, lang, m, g, SubEncoding, subtitleFileName, movieReleaseName, releaseGroup, fpsMilli,
season, episode }`.

**Ranked:**
1. `m == "h"`.
2. **Not a file with sounds,** unless you prefer them:
   - a file name token `hi`, `sdh` or `cc`, any case;
   - or 8% or more of its cues have `[…]`, `(…)`, `♪` or a `NAME:` line.
   - Real: 3 of Oppenheimer's 6 English files, at 15–19%; the others are at 0%.
3. `fpsMilli` within 0.1% of the copy's frame rate.
4. The add-on's order.

**Dropped:**
- a file naming another episode (verified: Severance S1 E1's "01x08");
- a file that isn't SRT or WebVTT after sniffing;
- one empty after parsing, or over 2 MB;
- one whose text fails a stopword sniff for its labelled language (first 50 cues). It is re-labelled when another of
  your languages matches.

**Language codes** (as the add-on returns them): English `eng`; Icelandic `ice`; Spanish `spa`/`spl`/`spn`;
Portuguese `por`/`pob`; Dutch `nld`/`dut`; German `ger`; French `fre`; Italian `ita`; Swedish `swe`; Norwegian `nor`;
Danish `dan`; Finnish `fin`; Polish `pol`; Turkish `tur`; Arabic `ara`; Hindi `hin`; Chinese `zho`/`zhe`/`zht`/`chi`.

### 3.4 The timing check (in `subs.js`, before the file shows)

**1. Anchor and reference, the best available:**

| Anchor | Reference | Speed | Offset applied | Verdict words | Tick |
|---|---|---|---|---|---|
| Fingerprint file (`m:"h"`, any language) | that file | any of the 7 speeds | any | "Lined up with this copy" (or "Made for this copy" for the file itself) | yes |
| Copy's frame rate + length, plus two other files that agree (different releases, ≥ 0.4 and 2× rule between them) | the pair, scaled to the copy's frame rate | the one that fits the copy's rate | only if ≥ 2 s | "Lined up with other subtitles"; when a speed fix was needed, "Timing fixed to fit this film" | no |
| None | – | none | none | "Timing not checked" (and the chip, 7.6) | no |

**2. Search:**
- **Speeds:** {1, 25/23.976, 23.976/25, 24/23.976, 23.976/24, 25/24, 24/25}.
- **Offset per speed:** a histogram of (reference start − candidate start × speed) over ± 30 s in 0.1 s bins. Its top 3
  bins are scored with the symmetric match: one-to-one pairs within 0.3 s / min(n_ref, n_cand).

**3. Accept** when all of these hold:
- the best ≥ 0.4;
- the best ≥ 2 × the best wrong speed;
- each third ≥ 0.3;
- the last cue, after the fix, starts before the copy's end.

**4. Otherwise:**
- with an anchor, below 0.25 → the file is skipped and the next one is tried (up to 3);
- otherwise → "Timing not checked", and the file shows as downloaded.

**5. Measured on the real files** (`tools` in the scratchpad, numbers in v1.1 M2). Correct pairs score 0.70 at
2.6–2.7×. The Icelandic file scores 0.81 at 25/23.976 (3.6×). A wrong film scores 0.22 at 1.0×.

The fix is stored with the file, and your steps are added on top. "Undo my changes" returns to the fix.

### 3.5 Files and caching
- **Download:** the add-on's URL. It is served as `application/x-subrip` and converted to UTF-8, but sniff the body:
  Oppenheimer's Japanese file is WebVTT.
- **Parse:**
  - strip `U+FEFF` everywhere (the Icelandic file has 2,912);
  - CRLF and LF both work;
  - strip `{\…}`, `<font>`, `<b>` and `<u>`, and keep `<i>`;
  - drop empty cues.
- **On the title page:** up to 4 files (your first two languages, plus the reference pair or the fingerprint file),
  about 1 MB. They're kept 30 days, 80 files, least recently used out first.
- **Lists:** one request per title or episode. Kept 2 days; retried after 60 s, then every 5 min.

## 4. The title page (`detail-ready`, `detail-checking`, `detail-copies`, `detail-subs-sheet`, `detail-which-film`, `detail-match`, `detail-subs-down`, `detail-series`)

- **Layout:** as today (`detail.js`): the column at x 48, y 44, 500 wide; Play and Save; the pill row (y 306 to 342).
- **The pill row's text** (`.st-side`, 14/18 `text-2`) sits after the pills on the same row, in the space the row
  already has (x about 511 to 805 in `detail-ready`).
- **More like this** stays at 366 / 400.

### 4.1 The meta line's tags
- They describe the default copy: 4K / 1080p / 720p / SD; HDR10 / Dolby Vision / HDR; 5.1 / 7.1.
- **Checked:** `.tag.st-ok` (filled, tick). **Not yet:** `.tag.st-name` (dashed), from the name.
- The language tag stays as today.

### 4.2 Elements and keys

| Element | Shows | OK | Keys |
|---|---|---|---|
| **Version pill** (2+ copies, or 1 while a stream add-on is still asking: add-ons 5.1) | tick + real quality + "best of N" ("4K HDR10 · best of 4"), or "your pick" · checking: dashed "Checking copies · 2 of 4" · checks paused: "4K · not checked" | the Copies menu | row: Subtitles pill; ▲ Play; ▼ More like this |
| **Subtitles pill** | "Subtitles: English" (the one that will show) · "Subtitles: Off" · "Subtitles: looking…" (dashed) · "Subtitles: none found" · "Subtitles: none yet" (dashed, add-on down) · "Subtitles: which film is it?" | the Subtitles sheet, or the match menu for "which film" | as today |
| **Pill-row text** (no focus) | "From OpenSubtitles · Icelandic ready too" · "In the file · Icelandic from OpenSubtitles" · "No Icelandic for this film" · "OpenSubtitles isn't answering · trying again at 21:31" · "Two films are called The Lion King" · while checking: a 56 px progress line + "Checking what each copy really is" | – | – |
| **Play** | as today, and never waits for a check (5.4) | plays rank 1 | as today |

### 4.3 The Copies menu (`detail-copies`, `.menu.st-copies`, left 48, top 40, 600 wide; shared with add-ons)
- **Title:** "Copies of Oppenheimer", with "Checked today 21:02" on the right.
- **Row 1, radio:** "Always the best copy" / "Now: 4K · HDR10 · 15 Mb/s. Changes if a better copy shows up". It is the
  default and focused.
- **Then one 60 px radio row per copy, in rank order (5.4):**
  - **line 1:** tick + checked quality;
  - **line 2:** the problem first, in chalk 650 ("No sound on this TV", "Named 4K", "Longer cut · 3 h 20 min"), then
    sound, size, and the name in quotes, ellipsised last;
  - **right:** `Best` on rank 1.
- **Not checked:** no tick, the name's claim, "Not checked yet". **Couldn't check:** "Couldn't check: your provider
  was busy" / "…doesn't allow partial reads".
- **Foot:** "Mb/s is the picture's share. Picking a copy keeps it for this film."
- **Keys:**
  - ▲▼ move; OK picks and closes (focus back on the pill); Back closes.
  - A copy pins it (`pickVersion`); "Always the best copy" clears the pin.
  - More than 6 rows scroll (`scrollList`).

### 4.4 The Subtitles sheet (`detail-subs-sheet`, right sheet 420)
- **Header:** "Subtitles" / "Oppenheimer (2023), matched on IMDb".
- **YOUR LANGUAGES**, with **8 px before the first row:** a radio row per language (source · timing verdict, a tick
  only when anchored), then Off.
- **MORE:** "Other languages · 31"; "Not this film? · Match it again".
- **Note:** "None in this copy's file."
- Focus opens on the language that will show.

### 4.5 Which film is this? (`detail-match`, `.menu.st-match`, left 48, top 44, 520; shared with add-ons)
- **Under the title:** "From the Cinemeta search for “<name>” · this copy runs 1 h 58 min", or "· this copy's length is
  unknown".
- **Rows:** title / year · length · director, from one `/meta` per row.
- **Then:** "Search by another name / On the keyboard" and "None of these / Use only the subtitles in the file".
- **Focus:** the row closest in length; with no length, the first result.
- **Foot:** "Your pick is remembered for this title, for subtitles and copies alike."

### 4.6 Series (`detail-series`)
- **The real layout:** the column at top 32 with plot, the button row with "Subtitles: English", chips at 272, rail at
  318, synopsis at 486.
- **The pill** describes the episode Play plays.
- **The focused tile's subtitles** go on its synopsis line, after its title.
- An episode's list is fetched after its tile has had focus for 1 s, or on Play.

## 5. Real quality: the check

### 5.1 What is read (native `Probe.java`)
**1. Head:** `Range: bytes=0-65535`. Read at most 64 KB, then close.
- **206:** the size comes from `Content-Range`.
- **200 (no partial reads):** keep the 64 KB, take the size from `Content-Length`, and skip the tail. The tracks still
  parse (an MKV's are in the first 5 KB); there is no fingerprint, and the copy is marked "doesn't allow partial
  reads".

**2. Tail:** `Range: bytes=<size−65536>-<size−1>`.
- It must be a **206 whose `Content-Range` names that range**. Anything else aborts the check, "Couldn't check": a 200
  would hand over the file's first 64 KB as its last.

**3. Parse:** prepare a `ProgressiveMediaSource` over `ProbeDataSource`, a data source that serves the head and tail
from memory and HTTP for the rest.
- `prepareSource()` gives the Timeline and its duration; `createPeriod()` + `MediaPeriod.prepare()` give the track
  groups. That is what `MetadataRetriever` does internally; its 1.6.0 API returns only the track groups.
- Release everything after.
- **Caps:** 1 MB of HTTP reads per check, plus one `moov` read of up to 8 MB when the top-level box walk shows the
  `moov` after `mdat`. A 6 s wall-clock timeout. Over either: "Couldn't check".

**4. From the formats:**
- width, height, frame rate;
- **HDR:**
  - `colorInfo.colorTransfer`, or, when it's empty on HEVC, `NalUnitUtil.parseH265SpsNalUnit` on
    `initializationData` (`H265SpsData.colorTransfer`, present in 1.6.0): ST2084 = HDR10, HLG = HDR;
  - Dolby Vision from its MIME type;
- **sound tracks:** MIME, channels, language;
- **text tracks:** language, forced flag, and whether the Matroska TrackEntry had a Language element (from the head
  bytes).

**5. Duration and picture bitrate:**
- **Duration:** the Timeline's. Failing that, the provider's `duration`.
- **The picture's share** = size × 8 / duration − Σ nominal sound rates (AAC 0.2, AC3 0.64, E-AC3 0.77, DTS 1.5,
  DTS-HD / TrueHD 4 Mb/s).

**6. Verified earlier on real files:**
- Sintel's 1.18 GB MKV: everything in the first 64 KB. The tracks end at byte 4,900: AVC 1920 × 818, AC3 5.1, 10
  subtitle tracks (one untagged), 888 s.
- A faststart MP4: the `moov` at byte 28.
- The 64 KB reads took 0.3 to 0.5 s.

### 5.2 What is stored, and decided later
- **Stored per copy:** the formats, the length, the size and ETag, the picture's bitrate, the fingerprint, and the
  status (`ok`, `head-only`, `couldnt`).
- **Plays on this TV is decided when ranking,** with the renderers' own `supportsFormat` (`MediaCodecUtil`, with
  decoder fallback on, as the player runs) and the audio route at that moment.
  - **Video:** a decoder for it. Dolby Vision profile 5 needs Dolby Vision support; profile 8 plays as HDR10.
  - **Sound:** a decoder, or passthrough to the current route. The app has no FFmpeg extension, so DTS without
    passthrough has no sound.
  - **The reasons, in plain words:** "No sound on this TV: DTS-HD is its only sound" / "This TV can't play its picture".
- **The fingerprint** = (size + the sum of the little-endian 64-bit words of the first and last 64 KiB) mod 2⁶⁴. There
  is none on head-only checks.

### 5.3 Connections, order and budget
- **Streams in use** = the player, live previews, and `active_cons` (re-read with a login call before each batch).
  M3U accounts count as `max_connections` 1.
- **A check starts only when streams in use is 0.** One at a time, with one request open at a time.
- **Play cancels a check in flight** (the socket is closed first). If Play is refused (401, 403, 429, 458, 509, 5xx or
  "max connections") within 10 s of a check, it retries at 2, 5 and 10 s behind the diagnosis design's "Waiting for
  your provider" card.
- **Refusals:** a refused check backs off 30 min. Two in a day stop checks for the day.
- **Which copies:**
  1. the open title page's copies, name-best first, at once;
  2. Continue watching;
  3. Saved.
- **Budget:** 60 a day (about 8 MB), at least 60 s apart in the background.
- **Posters and filters** use whatever is cached and never ask for checks.
- **Cache:** `Core.cache`, key `<account>:<kind>:<stream id>`, about 300 B each. Kept 60 days; checked again when the
  size or ETag seen at play start changes. 20,000 entries, least recently used out first.

### 5.4 Shared with add-ons: the copy ranking and the one wait before Play
**This is one rule for the whole app:** `defaultVersion()`, the Copies menu, the player's Quality panel and Play. The
add-ons spec carries the same text in its "Shared with subtitles" section; if the two ever differ, this list wins.

**The ranking:**
1. **Your pinned copy** for this title (`pickVersion`), if any.
2. **Plays on this TV** (5.2).
3. **The cut:** the copies of the main cut (IMDb's runtime ± 8%, else the most common length). Other cuts only by hand.
4. **Sound language,** in your "Shown first" order (from the check; before it, the name's or the add-on's language).
5. **Picture class:**

| Class | Rule |
|---|---|
| 4K | width ≥ 3200 or height ≥ 1600 |
| 1080p | width ≥ 1800 or height ≥ 1000 |
| 720p | width ≥ 1200 |
| SD | the rest |
| unknown | unchecked, with no claim |

   A copy drops a class when its picture's share is under 8 Mb/s (4K) or 2.5 Mb/s (1080p).
6. **Kind** (add-on copies say it; provider copies count as unknown): Blu-ray > web > unknown > TV. **A cinema
   recording ranks below every copy that plays.**
7. **HDR:** Dolby Vision (when the TV plays it) > HDR10 > HDR (HLG) > none.
8. The picture's bitrate.
9. **Sound:** 7.1 > 5.1 > stereo.
10. Subtitles in the file in your languages.
11. **Ties:** the provider first, then add-ons in their Account order.

**Unchecked copies** rank by their name's or add-on's claim, below checked copies of the same class.

**The one wait:**
- **Play never waits for a copy check** on any account. A check that finishes later is for the next Play.
- **The only wait** is the add-ons' (their 5.5). When the best copy in hand isn't 4K and a stream add-on hasn't
  answered, Play waits up to **4 s from the press**, with one caption on the button ("Playing in 3 s"); OK plays now;
  Back stops.
- Nothing else adds to it.

## 6. Around the app

### 6.1 Posters and filters (`movies-tags`)
- **Top-left tag:** the best copy's class. **Filled = checked** (no tick at poster size), **dashed = name only**. One
  tag.
- **The 4K chip and the Quality filter:** checked results win. A title is 4K if a check found a 4K copy, or if nothing
  is checked and a name says 4K.
- Facets are rebuilt from the cache once per prepare (a new `PREP` for movies). They fill in slowly by design (5.3).

### 6.2 Account > Settings > Languages (`account-languages`)

| Row | Value | Choices |
|---|---|---|
| Shown first | English, Icelandic | as today |
| Subtitles | Always | Always · Only when the sound isn't in your language · Off |
| Subtitle languages | English, Icelandic | the same tick sheet; defaults to Shown first |
| Subtitles with sounds | Leave out | Leave out · Prefer them ("Lines like [door slams] and who is speaking") |
| Subtitles from OpenSubtitles | On | On · Off (the file's own only) |

**Migration:**

| Today's `subLang` | Becomes |
|---|---|
| `auto` (the default) | Only when the sound isn't in your language (until 14.2 is answered) |
| `off` | Off |
| a language | Always, with that language first in Subtitle languages |

## 7. The player (native; `PlayerActivity`, `ListPanel`, `VodControls`, `Ui`)

### 7.1 The start (`player-start`)
- The VOD title block gets a line:
  - tick + the copy's checked quality and sound;
  - "best of 4 copies" (or "your pick");
  - the subtitles that are on.
- It shows with the controls.

### 7.2 Options > Subtitles (`player-subs`, `player-subs-mixed`; 384 wide)

| Row | Shows | OK |
|---|---|---|
| Off (44) | radio | off for this title; closes |
| IN THE FILE (head 30) | only if the file has any | – |
| a file track (50) | language / tick "Made for this copy" (or "Untagged track · probably English") | picks it (`pickText`) and closes |
| FROM OPENSUBTITLES (head) | only if any were found | – |
| a downloaded file (50) | language (+ ", with sounds") / its verdict (3.4), a tick only when anchored | picks it and closes with `showText` "Icelandic subtitles on · ▼, then Subtitles for timing" |
| ↳ Early or late (44, indented 40) | only under the downloaded subtitle that's on; value "As downloaded" / "1.5 s later" | the strip (7.3) |
| Other languages (44) | globe, count | a list by English name |
| Foot | "None in this copy's file. Remembered for this film." | – |

- Focus opens on the row that's on.
- The choice is stored per title (`subpick:<title key>`); the language also becomes the app's choice, as `subChanged`.

### 7.3 Early or late (`player-timing`, the strip, y 27 to 155)

| Key | Does |
|---|---|
| ◀ / ▶ | 0.5 s earlier / later, shown at once (hold: 4 steps a second, up to 60 s) |
| OK or Back | done (every step is saved as you make it) |
| ▲ | Undo my changes (the automatic fix stays) |
| ▼ | Match a line (7.4) |

- **Saved** under `subtime:<title key>:<copy id>:<subtitle id>`.
- **A series:** the next episode starts from the last value when its file is from the same release (3.4's definition).
- **You change it by more than 3 s, twice:** a fourth line, "Still off? ▼ Another file".

### 7.4 Match a line (`player-timing-match`)
- **What shows:** the next cue's text: "Press OK when you hear it. As timed now, it comes in about 4 s".
- **OK:** offset += press − 0.3 s − the cue's start as timed now, rounded to 0.5 s. Then back to the strip.
- **▶** waits for the following line. **Back** cancels.
- **No line within 20 s:** "No line for a while. ▶ to wait for the next one".

### 7.5 How downloaded subtitles are drawn
- **A separate `SubtitleView`,** added over `PlayerView` with the same style (`styleSubtitles()`, the TV's caption
  style first). `PlayerView`'s own view is left to ExoPlayer, and `TRACK_TYPE_TEXT` is disabled while a download is on.
- **`setCues()` runs only at boundaries:** a handler post at the next cue start or end (as timed: start × speed + auto
  offset + your offset), and at once on seek, pause, resume and a timing step.

### 7.6 States in the player

| State | What shows |
|---|---|
| Timing not checked (`player-subs-chip`) | the chip, top right, once per film, 6 s at the first downloaded line. No action |
| Still downloading at Play | the row reads "Icelandic · getting it…"; when ready, `showText` "Icelandic subtitles are ready · CC" |
| Add-on down (`player-subs-down`) | "OpenSubtitles isn't answering / Tried at 21:31. Trying again at 21:32", Try now (focused), "Other copies of this film · 1 has English in its file" (opens Quality) |
| None anywhere | disabled "None in this copy's file", "Nothing on OpenSubtitles for this film"; CC shows today's "This video has no subtitles" |
| A file fails to parse, or is off against an anchor | skipped; the next is tried, up to 3 |
| The copy fails or keeps stalling | the diagnosis failure card adds "Try the next copy · 1080p · 6.7 Mb/s · Dolby Digital 5.1"; OK plays rank 2 from where you were |

### 7.7 Options > Quality (`player-quality`, 384 wide)
- **Rows:**
  - "Now: 3840 × 1600 · HDR10";
  - COPIES OF THIS FILM;
  - "Always the best copy" (radio, default);
  - one row per copy from the cache: tick + checked quality, then "Best · playing · …" / "Named 4K · stereo" / "No
    sound on this TV · DTS-HD only".
- **Foot:** "Switching starts the other copy where you are."
- Opening it never opens a stream. The panel ends at y 471.

## 8. All states

| State | Title page | Player |
|---|---|---|
| Checks running | dashed tags, "Checking copies · n of N", progress + "Checking what each copy really is" | – |
| Checks waiting (streams in use, refusals, budget) | "4K · not checked"; Copies "Not checked yet" | Quality rows "not checked" |
| Head-only (no partial reads) | tags checked; no fingerprint; Copies "…doesn't allow partial reads" | same |
| Couldn't check | Copies "Couldn't check: your provider was busy" | same |
| A copy can't play here | ranked below every copy that plays, with the reason | same |
| Named 4K, really 1080p | tag "1080p" filled; Copies "Named 4K" | same |
| A different cut | Copies "Longer cut · 3 h 20 min"; never chosen by "Always the best" | same |
| Only one copy | no Version pill (unless an add-on is still asking) | Quality as today |
| IMDb match unsure | "Subtitles: which film is it?" → the match menu | the file's own only |
| A dub in your language | subtitles default off; no ask | – |
| "None of these" | "Subtitles: none" or the file's own | the file's own only |
| Add-on down or slow (8 s) | "Subtitles: none yet", "OpenSubtitles isn't answering · trying again at hh:mm" | 7.6 |
| Cinemeta down | the ratings path works; unsure matches wait, retried in 10 min | – |
| Nothing found | "Subtitles: none found", "Not in the file, none on OpenSubtitles" | 7.6 |
| Only some languages | "Subtitles: English", "No Icelandic for this film" | – |
| Timing verdicts | sheet line 2 (tick only when anchored) | panel line 2; the chip for "not checked" |
| Subtitles Off | "Subtitles: Off"; the sheet still lists them | Off selected |

## 9. Who does what

### 9.1 Web side (`app/tv/js/`)
- **New `subs.js`:**
  - the strict matcher (3.2), the list and the ranking (3.3);
  - downloads and parsing, the sniff, the timing check (3.4);
  - the per-title choices;
  - sends `{ list, pick, files: [{ id, text, speed, autoOffset, verdict }] }` to the player.
- **New `copies.js`:**
  - the check queue (5.3) via the plugin, and the cache;
  - the ranking (5.4) for `defaultVersion()`;
  - poster facets.
- **Changed:**
  - `detail.js`: the pill row and its text, the Copies menu, the sheet, the match menu;
  - `cards.js`: poster tags;
  - `catalog.js`: `versionLabel`, `defaultVersion`, facets, `PREP`, the strict index;
  - `account.js`: rows and migration;
  - `player.js`: commands;
  - `scripts/build-ratings.js`: v2 rows.

### 9.2 Native (`android/app/src/main/java/app/tuner/player/`)
- **New `Probe.java`** (5.1):
  - command `probe { id, url, headers }`;
  - event `probed { id, status, size, etag, formats, dur, mbps, hash }`;
  - one at a time, cancelled by any `play`.
- **New `SrtTrack.java`:** cues from the text it is given (no download), its own `SubtitleView`, boundary posts (7.5).
- **New command `subs`;** events `setting` (`sub`, `subtime`), `need` (`subs`).
- **`PlayerActivity`:**
  - `openOptions()` shows Subtitles when there are file tracks, downloads, or a list coming;
  - `openSubtitles()` is rebuilt (7.2), without the early return;
  - the strip and Match a line;
  - `openQuality()`'s copies section, at 384;
  - the `st-what` line in `VodControls`, and its time labels 14 px under the bar (RINGTEXT);
  - the chip at the top;
  - "Try the next copy" on the failure card.
- **`Ui`:** the timing and globe icons; the tick badge.

## 10. Data and APIs, verified on 27 Oct 2026

### 10.1 Cinemeta (`v3-cinemeta.strem.io`, 3.0.14, CORS open)
- **Search** returns `{ metas: [{ id, imdb_id, type, name, releaseInfo, … }] }`.
  - There is no runtime or year field: use `releaseInfo`.
  - It took 0.9 to 5.4 s uncached.
  - It is fuzzy: "sintel" → Interstellar.
  - It finds other-language names: Konungur ljónanna, Leitin að Nemo, Snerting, Fluch der Karibik.
- **`/meta/movie/{tt}.json`:** `runtime`, `year`, `director`, `moviedb_id`.
  - tt0110357 The Lion King, 1994, 89 min, Roger Allers and Rob Minkoff, 8587;
  - tt6105098, 2019, 118 min, Jon Favreau, 420818;
  - tt13186482 Mufasa: The Lion King, 2024, 118 min, Barry Jenkins, 762509.
- **`/meta/series/{tt}.json`:** `videos[]` with `{ id: "tt:S:E", season, episode }`.

### 10.2 The OpenSubtitles add-on (`opensubtitles-v3.strem.io`, `org.stremio.opensubtitlesv3` 1.0.0)
- **Oppenheimer:** 96 files, 0.2 s, `max-age=172800`. Fields as in 3.3, plus `releaseFormat` and `releaseOther`.
- **`releaseGroup` is unreliable:** "SDH", "MA", "GalaxyRG.Sdh".
- **Severance S1 E1:** 65 files, all with `season: 1, episode: 1`, one of them named "01x08".
- **An unknown id** → `{"subtitles":[], "cacheMaxAge":600}`.
- **The fingerprint path:** `/subtitles/movie/<id>/videoHash=<hex>&videoSize=<bytes>.json`.
- **Icelandic is rare:** Oppenheimer 1; none for The Lion King 1994 or 2019, Lamb, Touch, or Severance S1 E1.

### 10.3 Subtitle files, and the timing check run on them
- **The download URL:** `subs5.strem.io/en/download/subencoding-stremio-utf8/src-api/file/<n>`, `max-age=31536000`,
  CORS open.
- **The seven Oppenheimer files:**

| File | Size | Cues |
|---|---|---|
| Will1869 | 223,901 B | – |
| Will1869-HI | 239,363 B | 3,087 |
| WEB-DL MA | 246,822 B | 3,395 |
| WEB-DL SDH | 271,222 B | 3,719 |
| GalaxyRG | 246,771 B | 3,395 |
| GalaxyRG.Sdh | 271,117 B | 3,719 |
| Icelandic (BluRay-isl) | 240,437 B | 2,947 |

- **The v1.1 algorithm against Will1869** (symmetric match, best speed vs best wrong speed, thirds):

| File | Speed, offset | Match | vs wrong speed | Thirds |
|---|---|---|---|---|
| Will1869-HI | 1, 0 | 1.00 | 4.7× | 0.92–0.94 |
| WEB-DL MA | 1, −0.5 s | 0.70 | 2.7× | 0.58–0.62 |
| WEB-DL SDH | 1, −0.5 s | 0.70 | 2.6× | 0.53–0.57 |
| GalaxyRG | 1, +0.2 s | 0.70 | 2.7× | 0.58–0.62 |
| GalaxyRG.Sdh | 1, +0.2 s | 0.70 | 2.6× | 0.53–0.57 |
| Icelandic | 25/23.976, +0.4 s | 0.81 | 3.6× | 0.77–0.81 |

  - GalaxyRG vs WEB-DL MA: 1.00 at −0.7 s. The same cues, a different offset.
  - The Dark Knight's English vs Oppenheimer: 0.22, 1.0×. Rejected.
- **Share of cues with sounds:** 0.152, 0.189 and 0.189 for the three files with sounds; 0.0 for the other four.

### 10.4 The fingerprint and range reads
- **Range reads on a 1.18 GB MKV:** 206 with 65,536 B in 0.3 to 0.5 s; one first try streamed the whole file instead.
- **OpenSubtitles' test hash on Breakin':** 4 of 54 files come back `"m":"h"`, and the first of them is listed first.
- **An unknown hash** just returns the IMDb list.

### 10.5 The ratings file
- 3,006,826 B, v1, 52,688 films and 12,965 series.
- **Holds:** lamb 2021 (alt "dyri"), touch 2024 (alt "snerting").
- **Keys with several rows:** "lion king" (1994, 2019), "dune" (2021, 1984, 2000), "office" (8).

### 10.6 Media3 1.6.0 (from the Gradle cache, `javap`)
- `MetadataRetriever`: two `retrieveMetadata` overloads returning `ListenableFuture<TrackGroupArray>`, and
  `setMaximumParallelRetrievals`.
- `NalUnitUtil.parseH265SpsNalUnit(byte[], int, int, H265VpsData)` returns `H265SpsData` with `colorSpace`,
  `colorRange` and `colorTransfer`.

### 10.7 Xtream fields
- **Read already:** `max_connections`, `active_cons`.
- **Used if present, all unverified on the owner's provider:**
  - `info.duration` / `duration_secs`;
  - `info.tmdb_id`;
  - a `tt` id;
  - `info.video` / `audio` / `bitrate`: shown dashed, never ticked.

## 11. Port checklist

1. **CSS:** the TV parts of `subtitles.css` into `app/tv/app.css`, including two fixes to today's app found by the
   audit:
   - **the title clamp:** `.d-col .t-display.clamp2{padding-bottom:4px;margin-bottom:-4px}`. A one-line title's
     descenders are cut (47 px of content in a 44 px box). A suggested task is queued for it.
   - **the VodControls time labels:** 14 px under the seek bar, so the thumb's ring at 0:00 clears the elapsed time.
2. **Ratings v2** and the strict index (3.2).
3. **`copies.js` + `Probe.java`:**
   - the queue and the connection rules;
   - the cache of formats;
   - the shared ranking (5.4), poster facets and `PREP`.
4. **`subs.js`:** the matcher, the list, the sniff and parse, the timing check, the choices, the match menu.
5. **`detail.js`:** the pill row and its text, the Copies menu, the sheet, the match menu.
6. **`account.js`:** the rows and the migration.
7. **Native:**
   - `SrtTrack.java` and its own `SubtitleView`;
   - the `subs` command;
   - the Options gate, `openSubtitles()`, the strip, Match a line, `openQuality()`, `st-what`;
   - the chip, and "Try the next copy".
   - **Build on the playback-diagnosis work in `PlayerActivity.java` once it lands.**
8. **Tests:**
   - **`tests/mock-provider.js`:** Range (206, `Content-Range`, and a no-range mode); a small MKV with a known
     fingerprint; a fake Cinemeta (search + meta with runtime and `moviedb_id`) and a fake add-on, including a
     PAL-timed SRT, a WebVTT body, a wrong-episode file, a mislabelled language, and an `active_cons` counter.
   - **`tests/tv/drive.js` scripts:**
     - checking → checked;
     - the Copies order and Best;
     - Play takes rank 1 at once;
     - the which-film ask and its auto-accept by length;
     - the add-on down;
     - that no check starts while `active_cons > 0`.
   - **The emulator test:**
     - a downloaded cue shows at its time;
     - ▶ in the strip moves the next cue by 0.5 s;
     - Quality opens no connection (counted at the mock).

## 12. Self-check (`node tools/audit.js`; ring data in `tools/audit-rings.json`)

**Inherited checks.** The diagnosis audit:
- one ring; text under 14 px; overlaps; clipping and line clamps; the safe area for text, rings and floating boxes;
  contrast;
- CONTAIN; chip ≤ 420; panel ≤ 453; ellipsised panel text; one-line chip lines;
- the RING pixel check.

**This design's checks** (8 in v1.0, 3 more in v1.1):

| Check | Fails when |
|---|---|
| ONE | more than one ring |
| TICK | a named claim with a tick or no dashed outline; a checked claim without a tick (posters exempt, S20) |
| BEST | copies out of rank order, or not exactly one Best on rank 1 |
| STEP | a timing value that isn't a 0.5 s step |
| SOURCE | downloaded subtitles offered without naming OpenSubtitles |
| JARGON | codec, hash, SRT, fps, remux, bitrate or a `tt` id on screen |
| CLOCK | a 12 h time |
| HUE | amber or yellow anywhere in the UI, or red outside LIVE |
| **RINGTEXT** (v1.1, M7) | a ring's full extent (6 px out) crosses text that isn't part of the focused element |
| **RAILFOCUS** (v1.1, M4) | a focusable rail card would sit past y 513 (ring past 519) when focused |
| **TICKGAP** (v1.1, S18) | a tick under 3.5 px from its text, or more than 3 px off its line |

**Proved by injection:**
- **`--inject-st`** (one fault of each kind in every mock): ONE 7, TICK 4, BEST 2, STEP 15, SOURCE 5, JARGON 15,
  CLOCK 15, HUE 18, TICKGAP 4. The injected text sits under a scrim on the modal mocks, where the audit rightly skips
  it.
- **`--inject-v10`** (the v1.0 faults put back):
  - RAILFOCUS fires on all 5 film pages ("would sit at y 539, ring 544");
  - RINGTEXT on the sheet ("crosses Your languages, 5 px");
  - TICKGAP on the panel ("0.0 px from its text, 7.0 px off its line").

**Result: 18 pages, 0 findings.**

**Found and fixed in v1.1:**
- the sheet's note running past y 513;
- the series plot cut by its clamp;
- the Quality panel's ticks 4 px low;
- the seek thumb's ring on the elapsed time (a fix to today's player, 11.1).

| Mock | Focused | Ring white | Ring box | To the safe edge |
|---|---|---|---|---|
| detail-ready, detail-checking, detail-subs-down | Play | 100% | 45, 244, 173, 300 | −3.3 (lift from the left edge, as the app's `.d-col .btn`) |
| detail-copies | Always the best copy | 100% | 56, 88, 640, 158 | 8 |
| detail-subs-sheet | English | 100% | 508, 133, 896, 203 | 16 |
| detail-which-film | Subtitles pill | 100% | 43, 275, 301, 321 | −5 (ring on the x 48 line; allowed to 6) |
| detail-match | The Lion King (1994) | 100% | 56, 138, 560, 208 | 8 |
| detail-series | E2 tile | 100% | 267, 310, 487, 438 | 75 |
| movies-tags | Dune: Part Two | 100% | 188, 166, 328, 372 | 139 |
| account-languages | Subtitles | 100% | 267, 187, 905, 253 | 7 |
| player-start | the seek thumb | 100% | 54, 411, 86, 443 | 5.6 |
| player-subs | Icelandic (inset) | 100% | 59, 266, 421, 316 | 11 |
| player-subs-mixed | Icelandic (inset) | 100% | 59, 308, 421, 358 | 11 |
| player-subs-down | Try now (inset) | 100% | 59, 302, 421, 346 | 11 |
| player-quality | Always the best copy (inset) | 100% | 59, 164, 421, 214 | 11 |
| player-timing, player-timing-match, player-subs-chip | none: HUDs | – | – | – |

## 13. What only the TV can tell
1. **Whether his provider honours Range requests,** frees a slot the moment a check closes, and reports `active_cons`
   promptly. Check the Copies menu's statuses and Account > Provider > Connections.
2. **What his copies really are,** on titles he knows are "ehh".
3. **What this TV decodes,** and through what route: DTS and DTS-HD (I couldn't confirm this model), TrueHD, Dolby
   Vision profiles 5 and 8. And whether the soundbar or eARC changes it.
4. Whether `get_vod_info` carries `tmdb_id`, a `tt` id or media fields.
5. How often IPTV copies' fingerprints are known to OpenSubtitles. That decides how often a tick can appear at all.
6. Whether 0.5 s steps are fine enough from the sofa, and airglow's own `SubtitleView` vs ExoPlayer's (style, no
   flicker, the TV's caption style).
7. How long a check takes on his line.

## 14. Open questions (for the owner)
1. **Outward-facing:** OK to send each title's IMDb id and the copy's fingerprint to Stremio's servers
   (`opensubtitles-v3.strem.io`, `v3-cinemeta.strem.io`)? It tells Stremio what he watches, not who he is. It is free,
   with no account; if it goes away, the file's own subtitles still work.
2. **Subtitle languages:** English first, or Icelandic first when there is one? And "Always", or "Only when the sound
   isn't in your language"? Today's "Auto" maps to the second until he says.
3. **Checks:** is the cautious default right (title pages, Continue watching, Saved; 60 a day; never while the account
   is in use)?
4. **A copy with better picture but no sound on this TV:** offer it (ranked last, with the reason, as designed) or hide
   it?
5. **Subtitles with sounds:** "Leave out" by default?

## 15. What changed in the pieces the add-ons design shares

| Piece | v1.1 change | What `design/ui-v1/addons/` should mirror |
|---|---|---|
| Copy ranking and the Play wait | written once in 5.4: plays → cut → language → class → kind (cinema recording last) → HDR → picture bitrate → sound → subtitles in the file → ties (provider, then add-on order). Play never waits for a check; the add-ons' 4 s "Playing in N s" is the only wait | its "Shared with subtitles" section carries this text |
| Copies menu (`.st-copies` / `.ad-copies`) | Mb/s is the picture's share (foot "Mb/s is the picture's share"); line 2 can start "Longer cut · 3 h 20 min"; "1080p" not "Full HD" or "HD"; "Couldn't check: your provider was busy / doesn't allow partial reads" | the same words and the foot. Its add-on rows already lead line 2 with the source; keep the problem-first rule after it |
| Which film is this? (`.st-match` / `.ad-match`) | rows "title / year · length · director" (no "animated"); the header says "this copy runs …" or "…length is unknown"; auto-accept when one candidate is within ± 5% of the copy's length and the others more than 10% away; never asked for a dub; foot "…for subtitles and copies alike" | its `detail-match` already has the director and the length header: no change but the auto-accept rule |
| The matcher | strict index (2+ rows = unsure), length check ± 8%, `tmdb_id` ↔ `moviedb_id` | its 4.4 points here |
| The tick and tags (`.st-tk` / `.ad-tk`) | centred on its line, 6 px gap; tags keep their case ("1080p"); no tick on posters | the same CSS |
| The text under the pills | moved onto the pill row (`.st-side`); the page gains no height | its 5.1 caption "the subtitles line under the pills" becomes the pill row's text |
| The Subtitles pill | names the one that will show ("Subtitles: English"), as its mocks already do | – |
| Panel widths | Options, Subtitles and Quality are 384 while a film plays | `player-sources` at 384 |
