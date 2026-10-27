# Independent review: subtitles and real quality, v1.0

Reviewer: independent TV UI/UX review, 27 Oct 2026. I read `SPEC.md`, all 18 mocks (the PNGs at full size plus the
contact sheet) and `subtitles.css`, and ran `tools/audit.js` (18 pages, 0 findings, as claimed). I checked the spec
against `UI-SPEC.md`, brand v5.4, `detail.js`, `catalog.js`, `core.js`, `session.js`, `PlayerActivity.java` and the
Media3 1.6.0 jars in the Gradle cache. I also checked the live APIs with curl and ran the spec's own timing algorithm
on the real Oppenheimer subtitle files.

## Scores

| Dimension | Score |
|---|---|
| Correctness (matching, automatic choices) | 6.0 |
| Remote ergonomics | 8.0 |
| Clarity for a casual owner | 7.0 |
| Visual quality and consistency | 7.0 |
| Feasibility | 6.5 |
| States and edge cases | 7.5 |
| **Overall** | **6.8 / 10** |

This is a serious, well-researched design. The API claims mostly hold up. I reproduced the Icelandic file's speed fix:
19% at (1, 0), and 79% at 25/23.976 with +0.5 s, steady across the film's thirds (81 / 79 / 76%). The fingerprint
behaviour also checks out: on Breakin' with the test hash, 4 of 54 files come back `"m":"h"`. The states table is
thorough, and the key map doesn't change. What holds the score down:

- **Ticks that claim things nobody checked.** The green ticks say "for this copy" about timing that was only compared
  with other subtitles.
- **A matcher that is too loose for subtitles.**
- **A layout change that pushes a focusable row out of the safe area.**
- **A background-check pattern that could get the owner's account flagged.**
- **Several Media3 assumptions that don't hold in 1.6.0.**

---

## Must-fix

**M1. "Timing fits / fixed for this copy" with a green tick is not a checked fact about this copy.**
Where: `detail-subs-sheet` (English "OpenSubtitles · timing fits this copy", Icelandic "timing fixed for this copy"),
`player-subs` and `player-subs-mixed` (ticked "Timing fits this copy" / "Timing fixed…").

- **What's wrong:**
  - Unless a file is fingerprint-matched (`m:"h"`, which IPTV copies will often not be), 3.4 compares one subtitle file
    with other subtitle files. The copy's own timeline is never consulted.
  - This breaks the design's own rule 10 ("ticks mean checked").
  - It can also pick wrong. If the provider's copy is a 25 fps PAL copy (the probe knows its frame rate), then the
    Icelandic PAL-timed file is the one that fits, and the "fix" stretches it onto the BluRay timeline, under a green tick.
  - In `player-subs` the English row is ticked "fits this copy". With a fingerprint reference that row would read "Made
    for this copy". Without one, nothing was checked against the copy.
- **Do instead:**
  - Anchor the check to the copy. Use the fingerprint reference when there is one. Otherwise use the probed frame rate:
    when the copy is about 25 fps and the reference's `fpsMilli` is 23976, scale the reference by 23.976/25 before
    comparing. As a sanity bound, use the probed duration: the last cue must end before the copy's duration.
  - Give a tick and "this copy" only to anchored verdicts. Show unanchored ones without a tick, worded "Lined up with
    other subtitles".
  - Without an anchor, apply speed fixes (they are unambiguous) and offsets of 2 s or more only. The WEB-DL and BluRay
    English files differ by 0.5 s, and a pair reference cannot tell which one this copy matches.

**M2. The verdict thresholds sit on a knife edge, have a gap, and "different releases" is keyed on a junk field.**
I ran the spec's algorithm on the real files:

| Pair | Result |
|---|---|
| Will1869 vs GalaxyRG (both correct English) | best 0.60 at +0.2 s |
| Will1869 vs WEB-DL MA | 0.14 at (1, 0); best 0.60 at −0.5 s |
| Will1869 vs Will1869-HI | 0.93 |
| Wrong speeds, every pair | 0.18 to 0.22 |

- **What's wrong:**
  - Good same-language files agree at only about 0.6, because their cues are split differently (2,885 vs 3,395 cues).
  - The pair rule (60% or more with an offset under 0.5 s) passes one good pair and fails the other by 0.0 s.
  - Matches from 0.35 to 0.5 have no verdict at all in the 3.4 table.
  - "Different releases" can't use `releaseGroup`. The add-on returns `"SDH"`, `"MA"` and `"GalaxyRG.Sdh"` there, so
    the HI and non-HI files of one release count as two releases and "agree" at 0.93.
- **Do instead:**
  - Decide by how clearly the right speed wins, not by an absolute threshold: accept when the best (speed, offset) scores
    at least 2× the best wrong speed and at least 0.4.
  - Make the match symmetric (matched pairs / min(n_ref, n_cand)), and require it in each third of the film (that
    catches files for a different cut).
  - Say what happens between 0.35 and 0.5.
  - Define a release as `movieReleaseName` with the HI/SDH/CC tokens removed.

**M3. The IMDb id from today's `matchImdb()` is not safe enough for subtitles.**
- **What's wrong:**
  - `catalog.js` `matchImdb()` falls back to `byTitle.get(key)` when the provider gives no year, and for **series
    always**, even when the year doesn't match.
  - The ratings rows are sorted by votes, so a film with no year silently becomes the most-voted film with that name.
    "The Lion King" becomes 1994 (even for the 2019 copy), "Dune" becomes 2021, "The Office" becomes whichever has more
    votes. That is harmless for a star rating and wrong for subtitles.
  - It also contradicts 3.2's own "Konungur ljónanna → ask" principle: step 2 answers before step 3 ever runs.
- **Do instead:**
  - Write a strict variant for subtitles: films need a year (± 1), and a key that maps to 2+ rows is "unsure" (count the
    rows per key when indexing).
  - Verify every id, whatever its source, against the probed duration. Cinemeta `/meta/movie/{tt}.json` has `runtime`
    and answered in 0.15 s; accept within ± 8%. This one check also catches wrong cuts and wrong episodes.
  - Xtream panels very often return `info.tmdb_id`, and Cinemeta's meta has `moviedb_id`. Use it to confirm or choose
    among Cinemeta candidates before asking.

**M4. The new source line pushes a focusable row out of the safe area, and the series mock hides the real layout.**
- **What's wrong (films):**
  - 4.0 says More like this "moves down by its height (26 px) through the existing `fitCol()` push". But `fitCol()`
    allows `room = 16` for films. Past that it first clamps the plot and shrinks the title.
  - With 26 px the rail starts at 426, and in `detail-ready` and `detail-checking` the cards run from y 426 to about
    536. A focused More like this card then puts its ring past the 513 safe line, which CLAUDE.md forbids for focused
    items. Today the cards end at about 510. The audit exempts `.rail` as a peek row, but here the row takes focus.
- **What's wrong (series):** `detail-series` leaves out the plot (the real page always shows `d.plot` under the meta
  line). It also moves the season chips to top 226 and the rail to 276; the code has 272 and 318. With the plot and the
  new line, the push goes past 24 px, so `fitCol()` hides the episode synopsis that the mock shows.
- **Do instead:** keep the page's vertical budget. Options:
  - put the source text on the pills' row, to the right of the pills (there is room after "Subtitles: EN · IS" on
    films);
  - or drop the line and put it in the Subtitles sheet's subtitle line;
  - and on series, fold it into the episode synopsis line ("E1 · Good News About Hell · English subtitles from
    OpenSubtitles").

  Re-mock `detail-series` with a real two-line plot.

**M5. Background checks look like scraping to an IPTV panel.**
- **What's wrong:**
  - 400 checks a day means 400 to 1,200 VOD stream opens from a 1 or 2 connection account. To many Xtream panels that
    looks like a bot. "Abnormal activity" bans are real, and losing the account is far worse than a dashed tag on a
    poster.
  - 14.3 asks the owner, but the default is the risky choice.
- **Do instead:**
  - Default to checking only the open title page's copies, plus Continue watching and Saved, at most about 60 a day,
    spread out.
  - Never start a background batch while `active_cons > 0`: the owner's other devices use the same account, and so do
    live previews.
  - Make the poster and filter facets a bonus that fills in slowly. They should not be a goal that drives the queue.

**M6. The probe's Media3 plan doesn't work as written on 1.6.0.**
I checked the 1.6.0 jar with `javap`:

- **No duration.** `MetadataRetriever` has only `retrieveMetadata(Context, MediaItem)` and
  `retrieveMetadata(MediaSource.Factory, MediaItem)`, both returning `ListenableFuture<TrackGroupArray>`. There is no
  Timeline and no duration. 5.1 needs the duration for the bitrate, the "starved" rule, the which-film length and
  (after M1) the timing anchor.
- **The overload named in 5.1 can't use the cached windows.** `retrieveMetadata(context, MediaItem)` uses the default
  data source. Use the `MediaSource.Factory` overload with your cached data source. Better: prepare a
  `ProgressiveMediaSource` / `MediaPeriod` yourself, which also gives you the Timeline's duration. Or bump Media3.
- **No cap on bytes read.** The only cap is the `moov` (8 MB). An MKV with no Cues near the start, or a TS file, can
  make the extractor keep reading. Cap the total per check (for example 1 MB, plus the `moov` exception) and add a
  wall-clock timeout (for example 6 s).
- **A 200 on the tail read must abort the check.** If the server answers the tail request with 200, the first 64 KB of
  the file arrive as if they were the last 64 KB. The fingerprint and the parse are then silently wrong. The spec only
  says "read the asked-for bytes and close, whatever the status". Mark the copy "couldn't check".

**M7. The focus ring covers the section heading** in `detail-subs-sheet`. The English row's ring runs through the
bottom of "YOUR LANGUAGES" (crop at 2x, y about 240 to 255). The audit passed it because its overlap check ignores the
ring's `box-shadow`. Add about 8 px between the head and the first row, as the kit's sheets do, and teach the audit
about ring extents.

---

## Should-fix

### Correctness
1. **Detecting sound-description files.**
   - 3.3 says 2 of Oppenheimer's 6 English files are HI. It is **3**: `(SDH)`, `-HI` and `.Sdh`.
   - The content rule (more than 15% of cues in [brackets]) catches only one of them, at 15.2%. The WEB-DL SDH and
     GalaxyRG.Sdh files use `(clears throat)` and `SENATE AIDE:` with **no** brackets (452 / 3,719 cues in parentheses,
     246 speaker labels).
   - Match name tokens case-insensitively. Count `[…]`, `(…)`, `♪` and `NAME:` lines, with a lower threshold (about 8%).
2. **Untagged Matroska tracks report as English.** Media3's `MatroskaExtractor$Track` defaults `language` to `"eng"`
   (checked in the 1.6.0 bytecode). Sintel's untagged track would read as English, airglow would decide "English in the
   file" and skip the download.
   - Treat an in-file `eng` as "probably English".
   - Still fetch the OpenSubtitles list, and keep the best English download in the panel.
   - Use the track's label as well, to catch "Forced" or another language named there.
3. **HDR, HDR10+ and Atmos claims.**
   - In 1.6.0 the Matroska extractor sets `colorInfo` only from the `Colour` element; the HEVC branch keeps
     `HevcConfig`'s codecs and NAL length but not its `colorTransfer`. Many x265 MKVs have no `Colour` element, so an
     HDR10 copy would rank as SDR. Parse the SPS's VUI from `Format.initializationData`
     (`NalUnitUtil.parseH265SpsNalUnit`).
   - HDR10+ is per-frame SEI and isn't in the headers. Atmos (E-AC3 JOC, TrueHD) isn't visible from MKV headers. Don't
     show either as a ticked fact, and drop them from the 5.4 ranking unless they're actually parsed.
4. **Store the copy's formats, not the verdict.**
   - The cache stores `plays` and `why`, but passthrough depends on the audio route at that moment: soundbar on or off,
     eARC. Store the formats and decide "plays on this TV" when ranking.
   - Use Media3's own `MediaCodecUtil` / renderer `supportsFormat` instead of `MediaCodecList.findDecoderForFormat`,
     so the check and the player agree. The player also runs with `setEnableDecoderFallback(true)`.
5. **The bitrate counts every sound track.** `size × 8 / duration` includes all audio. A MULTI copy with four
   Dolby Digital 5.1 dubs carries about 2.5 Mb/s of sound, and DTS-HD or TrueHD carries 3 to 6 Mb/s. Subtract a nominal
   audio rate per track before the "4K under 8 Mb/s" rule.
6. **Different cuts.** `mergeLib()` groups copies by cleaned name and year, so an extended cut and the theatrical cut
   become "copies" of one film.
   - The check knows their lengths. When they differ by more than 3%, show "Longer cut · 3 h 20 min" in Copies.
   - Don't let "Always the best copy" switch the cut.
   - Match subtitles to the copy's own length (M3).
7. **Dubbed copies.** `detail-which-film` is an Icelandic dub ("Með íslensku tali"). With Subtitles Always and English
   first, it would put English subtitles over Icelandic speech, on a kids' film, after asking "which film is it?".
   - When the copy's sound is one of your languages and isn't the film's original language, default subtitles to off.
   - Don't raise the which-film ask; show the match in the sheet only.
8. **Subtitle formats and tags.** The "utf8" endpoint isn't always SubRip:
   - Oppenheimer's Japanese file is **WebVTT** (`WEBVTT`, `.` milliseconds) served as `application/x-subrip`;
   - one Croatian file is a `.txt`;
   - files carry `<font color=#FF8080><b>…`.

   Sniff the format from the body, not the content type. Parse SRT and VTT, drop MicroDVD/unknown formats, and strip
   `<font>`, `<b>` and `<u>` as well as `{\an8}`.
9. **The which-film menu.**
   - Search results carry no runtime (verified: the Lion King and Dune searches return `runtime` undefined for all but
     one result), so each row needs a `/meta` call (about 0.15 s cached).
   - "animated" / "computer-animated" isn't in Cinemeta (both Lion Kings are "Animation"), so drop that word.
   - The 1994 film is 89 min, so "1 h 29 min".
   - When exactly one candidate is within ± 5% of the copy's checked length and the others are more than 10% away
     (89 vs 118 min here), accept it without asking. Keep "Not this film?" in the sheet.
10. **Connections.**
    - Count live previews and `active_cons` (other devices) as streams in use.
    - M3U accounts have no `max_connections`: treat them as 1.
    - The "retry once after 2 s" after a refused Play is thin. Some panels hold the slot longer. Retry at 2, 5 and 10 s
      behind a visible "Waiting for your provider" state.
11. **Play must never wait on a 1 or 2 connection account.** The check started by "Checking 2 copies…" right before Play
    is the likeliest moment for a connection clash. Play the best known copy at once; the check result applies to the
    next Play anyway.
12. **When the best copy fails.** If the auto-picked copy errors or keeps stalling, the failure card (from the diagnosis
    work) should offer "Try the next copy". Today nothing says what happens.

### Remote ergonomics and clarity
13. **"Subtitles: EN · IS" reads as if both are on** to a casual viewer. Show the one that will show ("Subtitles:
    English"), and say "Icelandic ready too" on the source line or in the sheet.
14. **"Sound descriptions"** sounds like Audio Description (narration for blind viewers) and sits next to sound-language
    settings. Call them "Subtitles with sounds", described as "[door slams] and who is speaking". Update
    `account-languages`, `player-subs` and 3.3.
15. **Plain words.**
    - `detail-checking` "Reading each copy's first and last 64 KB, one at a time" → "Checking what each copy really is ·
      2 of 4".
    - `player-subs` "Timing fixed: it was made for a faster copy" → "Timing fixed to fit this film".
    - `detail-which-film` "No year from your provider" in the meta line → drop it. The line under the pill already
      explains.
16. **Picking a row in the Subtitles panel keeps it open** (7.2). Today's panel, and Audio, pick and close (`after()`).
    For the common case (pick a language and watch) that adds a Back press.
    - Close on pick, with `showText` "Icelandic subtitles on · ▼ to adjust timing".
    - Put "Early or late" right under the subtitle that's on, so it is 1 press from it.
17. **Series: which episode the pill describes.** On series the pill and source line "follow the focused episode". On
    Play, Save or the pill itself, describe the episode **Play** will play (`seriesResume()`); switch to an episode only
    while its tile has focus.

### Visual
18. **The tick badge sits low and touches the text** on two-line rows: `detail-subs-sheet` line 2, `player-subs`,
    `player-subs-mixed`. Centre it on line 2's x-height and leave a 6 px gap.
19. **The `player-quality` foot is crushed against the panel's bottom border** (about 2 px), because the panel is at the
    453 cap. Drop "Checked today 21:02." or the Now row's second line.
20. **Posters:** a 12 px green tick on every poster in `movies-tags` is a lot of green noise. Filled vs dashed already
    says checked vs name. Keep the ticks on the title page, the Copies menu and Quality.

### Feasibility
21. **The Options gate.** `openOptions()` disables Subtitles ("No subtitles in this file") when `textTracks == 0`, and
    `openSubtitles()` returns early with "This video has no subtitles". Both must change for downloaded files. Also, the
    native `sub` preference is one string; the per-title list needs its own store. 9.2 only mentions `openSubtitles()`.
22. **Drawing the cues.**
    - Use your **own** `SubtitleView` over the video. `PlayerView`'s internal listener pushes `onCues` (empty groups on
      stop or item change) into its own view and will fight `setCues()`.
    - Update on cue boundaries: post at the next start or end and on seek, not `setCues()` every 50 ms, which re-lays out
      the view 20 times a second during 4K playback.
23. **Where the timing check runs.** The title-page sheet shows verdicts before the player exists, so the check can't
    live only in native `SrtTrack` (3.4 says native). Run it in `subs.js`: about 50 ms in JS, with the files already
    downloaded and CORS open. Send `{url, speed, autoOffset}` to native so nothing is downloaded twice.
24. **Settings migration.** `subLang: 'auto'` (today's default, likely the owner's value) isn't mapped in 6.2. Say what
    it becomes, given that 14.2 is still open.

---

## Nits
- Vocabulary: "HD" on posters and tags vs "1080p" in Copies and Quality, and `detail-which-film`'s dashed tag says
  "1080P" in capitals. Pick one word.
- The stand-in art: the "Killers of the Flower…" card (`detail-*`) has a yellow-olive sun (hue about 60) on amber (hue
  about 32), against 2.4's "the stand-in art avoids yellow too". It isn't UI, but the claim is wrong.
- The audit's RING note for the HUD mocks says "a text body … as the Full description sheet": the wrong reason.
- 2.1 gives the strip as y 27 to about 182; the mock is 27 to about 155.
- `detail-which-film` says "Two films have this name", and the menu lists three.
- Options is 320 wide, Subtitles 384 and Quality 400, so the panel width jumps at each level. Consider 384 for all three
  while a film plays.
- 7.3: ▲ resets all your steps in one press. That's fine, since the automatic fix stays, but say so in the strip ("▲ Undo
  my changes").
- 2.1 moves "film chips" top right. Scope that to the new subtitle chip; Up next is an approved component.
- Labels are sometimes wrong: Severance's "fre" file is English. A stopword sniff on the first 50 cues would catch an
  "Icelandic" file that isn't Icelandic.
- 10.4: only the first `m:"h"` file comes first (h, i, i, i…). The ranking handles it, but the wording "come back
  marked and first" overstates it.
- 10.3: the 239,363 B "English (Will1869 BluRay)" file is the **-HI** one.

## What I verified and what I couldn't
- **Verified with curl today:**
  - Oppenheimer: 96 files, 6 English and 1 Icelandic (`ice`, no `fpsMilli`, 2,912 U+FEFF).
  - Severance S1 E1: 65 files, 2 English, and the `01x08` file labelled French.
  - The fingerprint query: 4 of 54 files come back `h`.
  - Cinemeta search has no runtime; meta has it, and has `moviedb_id`.
  - File formats and encodings: 13 non-UTF-8 sources, all converted. One VTT, one TXT.
- **Ran the 3.4 algorithm on the real files** (numbers in M2).
- **Media3 1.6.0 bytecode:** the MetadataRetriever API, the Matroska `eng` default, and the HEVC colour info not being
  used. No FFmpeg extension is bundled, so DTS without passthrough really has no sound.
- **Not verified:**
  - the owner's provider: its Range support, how fast a connection slot frees up, `tmdb_id` / `info.video`;
  - Philips 55OLED810 decoding: DTS, Dolby Vision profiles;
  - how often IPTV copies' fingerprints are known to OpenSubtitles.
