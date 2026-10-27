# Independent review 2: subtitles and real quality, v1.1

Reviewer: the same independent TV UI/UX reviewer as for v1.0, 27 Oct 2026.

**What I read:**
- the v1.1 `SPEC.md` in full;
- all 18 re-rendered mocks, at full size and on the contact sheet;
- `subtitles.css`;
- `design/ui-v1/addons/SPEC.md` 5.0 and its `tools/copies.js`, for the shared parts.

**What I ran and checked:**
- `tools/audit.js`: 18 pages, 0 findings. `--inject-v10` gives 8 findings: RAILFOCUS on all 5 film pages, RINGTEXT on
  the sheet, TICKGAP on the panel. So the new checks work.
- I re-ran the v1.1 timing rule on the real Oppenheimer files. It reproduces the spec's table exactly:
  - Will1869 vs WEB-DL MA: 0.70 at −0.5 s, 2.7×;
  - Will1869 vs GalaxyRG: 0.70 at +0.2 s, 2.7×;
  - Will1869 vs its own HI version: 1.00, 4.7×;
  - the Icelandic file: 0.81 at 25/23.976 +0.4 s, 3.6×, thirds 0.81 / 0.81 / 0.80.
- Cinemeta meta for The Lion King: 89 min, Allers and Minkoff, `moviedb_id` 8587. It has `country` but **no
  language** field.
- In the Media3 1.6.0 jar, `MatroskaExtractor.FLAG_DISABLE_SEEK_FOR_CUES` exists.

## Scores

| Dimension | v1.0 | v1.1 |
|---|---|---|
| Correctness (matching, automatic choices) | 6.0 | 7.0 |
| Remote ergonomics | 8.0 | 8.5 |
| Clarity for a casual owner | 7.0 | 8.0 |
| Visual quality and consistency | 7.0 | 7.5 |
| Feasibility | 6.5 | 7.5 |
| States and edge cases | 7.5 | 7.5 |
| **Overall** | **6.8** | **7.4 / 10** |

This is a real revision, not a cosmetic one. Every v1.0 must-fix is addressed in both the spec and the mocks, and the
audit now guards against them coming back.

What holds v1.1 back is three new or remaining problems:
1. The "dub rule" isn't defined. As written, it treats every English or Icelandic copy as a dub, which contradicts the
   design's own `detail-which-film` mock and the open question about Icelandic subtitles.
2. The pill-row text has no width limit. With the Resume state, and with the add-ons design wanting the same space, it
   runs off the screen.
3. The two specs that "share" the copy ranking and the Play wait don't agree, and each one says it is the one that wins.

## The v1.0 points, checked

| v1.0 | Status in v1.1 | Notes |
|---|---|---|
| M1 ticks on unanchored timing | **Fixed** | No timing ticks in `detail-subs-sheet`, `player-subs` or `player-subs-mixed`. The verdict words are honest. Speed is scaled to the copy's frame rate, and the copy's length bounds the result (but see S2) |
| M2 thresholds, the gap, the release field | **Fixed** | Symmetric match, a 2× relative winner, each third ≥ 0.3, no gap, releases keyed on `movieReleaseName`. Numbers reproduced |
| M3 loose matcher | **Fixed, one gap** | Strict index, the ± 8% length check and the TMDB id are all in. What happens when the copy's length is unknown isn't said (S3) |
| M4 safe line and the series mock | **Fixed, one regression** | More like this is back at 366 / 400, and the series mock now shows the real layout. But the pill-row text has no width limit (M2 below) |
| M5 background checks | **Fixed** | 60 a day, at least 60 s apart, `active_cons` and previews counted, posters never drive the queue |
| M6 Media3 1.6.0 | **Fixed, one gap** | The probe prepares its own `ProgressiveMediaSource`, has caps and a timeout, and aborts a tail read that isn't a 206. But the head-only path won't parse MKVs as claimed (S1) |
| M7 ring over the heading | **Fixed** | 8 px of air, plus the RINGTEXT check |
| S1 to S24 | Fixed, except as noted | Words, the subtitle-panel flow, the gate, own `SubtitleView`, boundary posts, timing in `subs.js`, 384-wide panels, the Quality foot: all fine. Exceptions: S7 dubs (M1 below), S24 migration (S5), and S6 cuts, now in conflict with add-ons (M3) |
| Nits | Fixed | Except the FHD bitrate (N1) |

---

## Must-fix

**M1. The dub rule calls any copy in your languages a dub.**
Where: 3.1 "The dub rule", 3.2 step 6, section 8, the S7 change list, the `account-languages` caption.

- **What's wrong:** the rule says "when the copy's sound is one of your languages, only subtitles in that same language
  show by default", and "a dub never raises the which-film ask". For this owner, whose languages are English and
  Icelandic, that covers every English film. So:
  - **It contradicts the design's own mock.** `detail-which-film` is `EN| The Lion King`: English sound, one of his
    languages, so by the rule it is a "dub" and must not ask. Yet the mock asks.
  - **It quietly answers open question 14.2 the wrong way.** If he says "Icelandic first", the rule still blocks
    Icelandic subtitles on every English film. That is the main reason an Icelander would want subtitles.
  - **It turns off the which-film safeguard** for almost everything he watches, which is the protection M3 just added.
  - **Section 8 and 3.1 disagree:** "subtitles default off" vs "only subtitles in that same language show".
- **Do instead:**
  - Define a dub as **a copy whose sound language differs from the film's original language.**
  - Cinemeta has no language field. Use `country` as a proxy, or the provider category / name tag ("IS|", "Með
    íslensku tali"), or the original-title key in the ratings file being a different language from the copy's sound.
  - When the original language can't be known, it isn't a dub.
  - Keep "subtitles off by default; no which-film ask" for real dubs only.
  - Write one sentence for both 3.1 and section 8.

**M2. The pill-row text has no width limit, and two designs want the same space.**
Where: 4.2's pill-row text, `.st-side` (`white-space:nowrap`, no max-width, no ellipsis), `detail-subs-down`.

- **What's wrong:**
  - In `detail-subs-down`, "OpenSubtitles isn't answering · trying again at 21:31" already ends at x ≈ 877, 35 px from
    the safe line.
  - **The Resume state isn't mocked.** Today's `detail.js` puts `leftText` ("1 h 12 min left") in the same row. Adding
    it (about 105 px with the gap) pushes the row to about x 980, past 912. The same happens with a long pill such as
    "Subtitles: Portuguese (Brazil)", or "Checking copies · 2 of 4" with its progress text.
  - **Add-ons 5.1 puts `[spinner] Still asking Kestrel` "right of the pills"**: the same place. Subtitles section 15
    says the add-ons' subtitle line moves there too, but neither spec says what shows when both have something to say.
- **Do instead:**
  - Give `.st-side` a max width (to x 912) with an ellipsis.
  - Set an order of priority for the one slot:
    1. the time left (Resume);
    2. the add-ons' "Still asking …" while it lasts;
    3. the subtitles text.
  - Show only the highest one, or drop the second clause first.
  - Mock the Resume state, and the add-on-asking + add-on-down state, and add the audit's SAFE check to `.st-side`.

**M3. The "shared" ranking and Play wait differ between the two specs, and each claims to be the source.**
Subtitles 5.4 says "if the two ever differ, this list wins". Add-ons 5.0 says it "amends" subtitles 5.4, 4.2 and 3.2.
They differ on:

| Point | Subtitles 5.4 | Add-ons 5.0.1 / 5.0.2 (and `tools/copies.js`) |
|---|---|---|
| Plays on this TV vs sound language | plays (2) before language (4) | language (2) before plays (3). An English copy with DTS-only sound beats a playable copy, and Play starts a film with no sound |
| The cut | a ranking key (3), **before language** | not a key, only "never switches the cut", and the code doesn't enforce it |
| Language order within your languages | "in your Shown first order" | the code ranks all your languages equal (`i < 0 ? 9 : 0`), so English and Icelandic tie |
| Kind | Blu-ray > web > **unknown > TV** | Blu-ray > web > **TV/DVD > unknown**. Every provider copy is "unknown", so an add-on TV rip outranks the provider's copy of the same class |
| Bands | none | too fast for the line, unsure match, cinema, failed this session |
| Pinned | always first | first "if it hasn't failed this session". `copies.js` still sorts a failed pin first (`c.pinned ? 0 : 1` before the band) |
| The wait | "Play never waits for a copy check, on any account" | waits for a provider-copy check when the account has 3+ connections |
| HDR10+ | out of the ranking | counts as HDR10 |

- **Recommended single order:**
  1. a pin that hasn't failed;
  2. the bands;
  3. plays on this TV;
  4. language, in "Shown first" order;
  5. the cut, among copies in your top language;
  6. class;
  7. checked before unchecked;
  8. kind, with unknown above TV;
  9. range;
  10. bitrate;
  11. sound and subtitles in the file;
  12. ties.

  Putting the cut after language fixes a case where Play would pick a German dub of the main cut over the only English
  copy, which is a longer cut. On the wait, take subtitles' rule: no check-wait at all.
- **What to do:** write the list once, in one file. Make the other file point to it and contain no list of its own.
  Make `tools/copies.js` match it, and add copies-test cases for "no sound vs language", "a longer cut in English vs a
  dub", "kind unknown vs TV" and "a failed pin".

---

## Should-fix

1. **The head-only check (no partial reads) won't parse most MKVs through `prepare()`.**
   - `MatroskaExtractor` seeks to the Cues when the SeekHead places them after the clusters, which is mkvmerge's
     default. With no Range support that seek reopens the file from byte 0, and the 1 MB cap ends the check with
     "Couldn't check".
   - Set `DefaultExtractorsFactory.setMatroskaExtractorFlags(FLAG_DISABLE_SEEK_FOR_CUES)` in the probe, always. A
     probe never needs the Cues: it saves a read, and the duration still comes from the Info element.
   - Then say plainly which formats head-only can check: MKV, faststart MP4, TS (no duration).
   - `detail-which-film`'s caption ("couldn't be checked, its provider refuses partial reads … length unknown")
     contradicts 5.1, which says a head-only check still gets the tracks and an MKV's duration. Pick one: either the
     mock's copy is an MP4 with the `moov` at the end, or it has a checked length and the auto-accept applies.
2. **The length bound can reject the correct Icelandic fix.**
   - The Icelandic file's last cue is the translator's credit, "Þýðandi: Haraldur Jóhannsson", raw at 10,371 s. After
     the 25/23.976 fix it starts at **10,814 s = 3:00:14**. The dialogue ends at 10,402 s.
   - Oppenheimer's copies are "3 h 0 min", so whether the fix passes "the last cue starts before the copy's end" depends
     on 14 seconds of credits.
   - Bound on the last cue that is within 60 s of the one before it (that skips credit lines), or on the 98th
     percentile of cue starts, with 2% slack.
3. **The strict match when the copy's length isn't known yet.**
   - 3.2 says every candidate is checked against the copy's length, but doesn't say what happens before there is one
     (checks waiting, a head-only MP4, budget used up).
   - The add-ons spec defines Sure / Likely / Unsure and says "Subtitles use Sure and Likely as the subtitles design
     decides". This spec never decides.
   - Suggest: subtitles download on **Likely** (a single year-matched row), are re-verified when the length arrives,
     and are dropped with a one-line note if it's more than 8% off. Use the add-ons' level names in 3.2, so there is one
     vocabulary.
4. **The Version pill and the Copies rows read differently in the two specs.**
   - Version pill: subtitles "[tick] 4K HDR10 · best of 4" vs add-ons `1080p · Your provider` / `4K Blu-ray ·
     Northlight best of 9`.
   - Copies line 2: subtitles shows the provider's name in quotes ("“EN| Oppenheimer 4K”") as the last item; add-ons
     says "the file name itself is never shown (it is jargon)" and leads with "Your provider".
   - The None-of-these line: "Use only the subtitles in the file" vs `Keep this copy only: no add-on copies or
     downloaded subtitles`.
   - These are shared components (section 15), so settle each one in one place. My view: keep the provider's name in
     quotes, last. It is how he recognises "the 4K UHD one", and it is the provider's label, not a file name.
5. **The migration, and what he'll see.** `auto` → "Only when the sound isn't in your language" means that after the
   update the owner gets **no** subtitles on English films. The scenario and every mock assume "Always". Say so in
   14.2 in plain words ("until you answer, English films still show no subtitles"), and get the answer before
   release rather than after.
6. **A pinned copy that stops playing.** For example, the soundbar is off and the pinned copy's only sound is DTS.
   With the "plays" verdict now decided at ranking time, say what happens: the pin stays, but Play uses the next copy,
   and Copies shows "Your pick has no sound on this TV right now".
7. **The offset of an unanchored speed fix.**
   - 3.4 applies offsets only at 2 s or more without an anchor, so the Icelandic file gets the speed fix with offset 0
     and is 0.4 s early. 10.3 reads as if +0.4 s is applied.
   - Either say it plainly ("speed fixed; the 0.4 s found isn't applied, because releases differ by up to 0.7 s"), or
     apply the offset found **at the fixed speed** when it is under the 0.7 s release spread, since nothing better is
     known.
8. **"Untagged track · probably English"** as line 2 under a line 1 that says what? Show the row as "Probably English"
   / "Its file doesn't say the language", without the tick. "Made for this copy" is true, but the language isn't
   checked.

## Nits
- **N1:** the FHD copy's "6.7 Mb/s": 9.8 GB × 8 / 10,800 s − 0.64 = **6.6**. The other three are right (15, 2.8,
  22).
- `parseH265SpsNalUnit` wants the SPS NAL without its start code. HEVC `initializationData` in MKV is a single buffer
  of start-coded VPS / SPS / PPS, so find NAL type 33 first. Worth a line in 5.1.4.
- "Couldn't check: … doesn't allow partial reads" is technical. Use "Couldn't check: your provider doesn't allow a
  quick look".
- Series: neither 3.2 nor the add-ons say how the ± 8% length check works for episodes. Cinemeta's `videos[]` has no
  runtimes, so say that episodes skip it.
- Section 15's last row says add-ons' `player-sources` should be 384. Confirm it, or the add-ons audit will still pass
  it at its old width.

## What I couldn't verify
Same as before, and only the TV can tell:
- the owner's provider: Range support, how soon a slot frees up, how promptly `active_cons` updates, `tmdb_id` /
  `info.video`;
- the 55OLED810's decoders and audio routes;
- how often IPTV copies' fingerprints are known to OpenSubtitles, so how often a subtitle tick appears at all.
