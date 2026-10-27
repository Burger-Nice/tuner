# Independent review 3: subtitles and real quality, v1.2, with `copies/RANKING.md`

Reviewer: the same independent TV UI/UX reviewer as for v1.0 and v1.1, 27 Oct 2026.

**What I read:**
- the v1.2 `SPEC.md`;
- the 20 mocks: the two new ones (`detail-resume`, `detail-addon-asking`) at full size, the rest on the contact sheet
  and at full size where they changed;
- `design/ui-v1/copies/RANKING.md`, `copies.js` and `copies-test.js`;
- the add-ons `SPEC.md` 5.0 and its `tools/copies.js` / `copies-test.js`, as they stand in the tree today.

**What I ran:**
- `tools/audit.js`: 20 pages, 0 findings. `--inject-v11` gives 134 findings, among them the SIDE check firing on all
  8 slot pages.
- `copies-test.js`: 90 cases, 0 failed.
- `isDub()` on extra real Cinemeta country lists, fetched today (see M1).
- Cinemeta's series runtimes for Severance and The Bear.

## Scores

| Dimension | v1.0 | v1.1 | v1.2 |
|---|---|---|---|
| Correctness (matching, automatic choices) | 6.0 | 7.0 | 7.5 |
| Remote ergonomics | 8.0 | 8.5 | 8.5 |
| Clarity for a casual owner | 7.0 | 8.0 | 8.0 |
| Visual quality and consistency | 7.0 | 7.5 | 8.0 |
| Feasibility | 6.5 | 7.5 | 8.0 |
| States and edge cases | 7.5 | 7.5 | 8.0 |
| **Overall** | **6.8** | **7.4** | **7.8 / 10** |

Three things are now closed:
- **The pill-row slot:** one text by priority, a width limit, two new mocks and an audit check that catches the old
  fault.
- **The single ranking:** in one file, with code and 90 tests that cover every case I asked for.
- **All eight should-fixes and the nits**, checked in the text and the mocks. The FHD copy reads 6.6 Mb/s, the
  probe's Matroska flag and the "type 33" SPS note are in the body, and "Probably English" carries no tick.

The new dub rule is the one real problem. Built on "the countries' languages", it labels some English-language
originals as dubs and switches their subtitles off. One cross-design problem also remains: the add-ons spec in the
tree still carries its own, conflicting copy of the ranking.

## The review 2 points, checked

| Review 2 | Status | Notes |
|---|---|---|
| M1 the dub rule | **Replaced, but the new test misfires** | Now "sound ≠ the film's original language", one sentence in 3.1 and section 8, and the which-film mock is consistent. But guessing the original language from the countries gets English-language European films wrong, and a copy's claimed or untagged language can trip it (M1 below) |
| M2 the pill-row slot | **Fixed** | Priority time left > "Still asking" > subtitles text; ends by x 912 with an ellipsis; `detail-resume` and `detail-addon-asking` mocked; SIDE check, proven by injection |
| M3 two rankings | **Fixed on this side; open in the tree** | `RANKING.md` has my order with the add-ons review's points folded in, and `copies.js` matches it. But `addons/SPEC.md` 5.0 and `addons/tools/copies.js` still hold the old list (M2 below) |
| S1 head-only MKV | Fixed | `FLAG_DISABLE_SEEK_FOR_CUES` always; what head-only can read is stated; `detail-which-film` is now an MP4 with its index at the end |
| S2 the length bound | Fixed | It now ignores a last cue more than 60 s after the previous one, with 2% slack. Checked: the Icelandic file's last dialogue line lands at 10,403 s after the fix |
| S3 before the length is known | Fixed for the ratings path | It uses the Sure / Likely / Unsure levels; Likely downloads; `recheck()` drops a match that's more than 8% off. Titles found only through Cinemeta search have no level (S1 below) |
| S4 shared wording | Fixed | Section 15 settles the Version pill, Copies line 2 (source, problem, … provider's name last) and one "None of these" line |
| S5 migration | Fixed | Plain words in 6.2 and 14.2; the owner's answer is needed before release |
| S6 a pinned copy that stops playing | Fixed | Key 1 needs "plays now"; the Copies notes are written and tested |
| S7 the offset of a speed fix | Fixed | The offset found at the fixed speed comes with it; at the right speed, only offsets of 2 s or more move a file |
| S8 untagged tracks | Fixed | "Probably English" / "Its file doesn't say the language", with no tick |
| Nits | Fixed | All five |

---

## Must-fix

**M1. The dub test switches subtitles off on films that aren't dubs.**
Where: `RANKING.md` 5, `copies.js` `isDub()`, subtitles 3.1 and section 8.

`isDub()` calls a copy a dub when its sound language isn't a language of any country Cinemeta lists. I checked it on
real Cinemeta data today, and it misfires three ways. Each one means subtitles default **off** and the which-film
question is skipped.

- **English-language films made outside English-speaking countries:**
  - *The Fifth Element* (tt0119116): Cinemeta lists "France". `isDub({sound:'English', country:'France'})` is
    `true`.
  - *Melancholia* (tt1527186): "Denmark, Sweden, France, Germany, Italy". `true`.
  - These are English originals. Besson, von Trier and many European co-productions are made in English.
  - (*Taken* and *Léon* list the US or UK as well, so they pass. *Valerian* lists unmapped countries, so it's "not
    sure".)
- **A sound language taken from the name, before a check.** Key 4 and `isDub` use the claim's language before a
  check. On IPTV, "EN|" usually names the provider's *section*, not the sound. "EN| Parasite" is normally the Korean
  original, but it reads as English sound on a South Korean film, so it is a dub, and subtitles are off on a Korean
  film. That is exactly the owner's complaint.
  - It happens whenever the check hasn't run, or can't: MP4 with its index at the end, the provider busy, the daily
    budget used up.
- **Untagged Matroska audio.** Media3 reports an audio track without a Language element as `eng`, the same default as
  the text tracks in S2. An untagged Korean or French track becomes "English", so the copy is a dub. Untagged audio is
  common.
- Smaller: `India: ['Hindi']` makes every Tamil, Telugu or Malayalam original a dub.

**Do instead:** call something a dub only on positive evidence. One of:
- the name or category says so ("Með íslensku tali", "dubbed", "IS|" on a film whose countries don't include
  Iceland);
- the check read an **explicitly tagged** audio language (the probe already sees whether the Language element is
  there) that is not English, and not a language of any listed country.

Never infer an English dub from the country list, and never use the claim's language prefix. Mark multilingual
countries (India, Belgium, Switzerland, Canada, Spain, China) "can't tell". Add tests for The Fifth Element,
Melancholia, "EN| Parasite" unchecked, and an untagged audio track.

**M2. The add-ons spec in the tree still has its own ranking, so there are still two lists.**
`RANKING.md` says both designs point to it and that `copies.js` was moved there. As of this review:

- `design/ui-v1/addons/SPEC.md` 5.0 (dated 04:53) still says:
  - it **amends** subtitles 5.4;
  - language comes before "plays on this TV";
  - different cuts are "more than 3% apart";
  - Play waits for a provider-copy check on 3+ connection accounts;
  - kind: TV/DVD ranks above unknown.
- `design/ui-v1/addons/tools/copies.js` still exists, differs from `copies/copies.js`, and its own 31-case test still
  passes against the old order.

This is the add-ons side, being revised in parallel, and the subtitles side is done. But until it is done, the
engineer has two rule sets again. **What to do:**
- replace add-ons 5.0 with a pointer to `RANKING.md`;
- delete `addons/tools/copies.js` and `copies-test.js`, or make them `require('../../copies/copies.js')`;
- redraw `detail-sources-sheet` in the B, A, N, P, F order `RANKING.md` 8 asks for.

---

## Should-fix

1. **Titles found only through Cinemeta search have no match level.**
   - `RANKING.md` 4.1 step 4 accepts a Cinemeta search result. But 4.2 defines Sure / Likely / Unsure only in terms of
     the ratings rows ("the key has one row within ± 1 year"). `matchLevel()` with no ratings rows returns `unsure`.
   - So every title the ratings file lacks (under 1,000 votes, or known by another-language name, such as "Leitin að
     Nemo" and "Philosopher's Stone", which the spec itself cites) gets no subtitles and asks, even when Cinemeta
     accepted a single year-matched result.
   - Add a row: a Cinemeta-accepted result with a year is **Likely** (Sure once the length agrees). Without a year, a
     single exact name is Likely only with a length that agrees. Test both.
2. **The 5% cut tolerance doesn't allow for PAL plus IMDb's rounding.**
   - A PAL copy is 4.1% short before anything else. IMDb runtimes are often 1 to 3 minutes off a file (credits,
     rounding).
   - A 100 min film on IMDb at 102 min, as a PAL copy (95.9 min), is 6% off. It becomes "Shorter cut" and is never
     auto-picked.
   - The check knows the copy's frame rate. Scale a 25 fps copy's length by 25/23.976 before comparing, and keep 5%
     for the rest. Add the test.
3. **"Never switches the cut on its own" contradicts key 5.**
   - Key 5 and the test "the only English copy, a longer cut, beats a German dub of the main cut" mean Play *does* pick
     another cut automatically, and rightly.
   - `RANKING.md` 2.1 still says other cuts "are picked only by hand". Reword it: "never switches the cut **within a
     language**; when your top language exists only in another cut, that cut plays, and the Copies row says `Longer
     cut`."
4. **The per-episode length note will fire on ordinary episodes.**
   - Cinemeta gives Severance one runtime, "49 min". The mock's S1 E1 is 57 min (16% off), so it would carry "This
     episode's length doesn't match IMDb" on its synopsis line. Most season premieres and finales would too.
   - The note sounds like a fault, and it changes nothing: the timing check already uses the episode's own copy.
   - Drop it, or show it only past 2× or under 0.5× (the not-ready rule), where it means something.
5. **The 4.2 table's "Pill-row slot" row is broken.** The texts spill into the OK column, and there is an extra "–"
   cell. Put the list of texts in the "Shows" cell.

## Nits
- `waitPlan()` ignores "below the best its language could give". `RANKING.md` 3.2 dropped that clause, which is
  fine, but the comment in `copies.js` still promises it.
- `waitPlan()` reads the best copy's class from its name when unchecked. A provider copy named "4K" (really 1080p, as
  in the Oppenheimer data) ends the add-on wait. Acceptable, but say so in 3.2.
- `mainCut()` with no IMDb runtime and two copies of different lengths picks the first by sort order. Name the tie
  rule (the longer? the provider's?).
- When a Resume or "Still asking" takes the slot, the subtitles text appears only in the sheet. That's fine. But
  "OpenSubtitles isn't answering" then shows only as the dashed pill's "none yet". Consider "Subtitles: none yet ·
  trying 21:31" inside the pill, so the retry time isn't lost.

## What I couldn't verify
Unchanged from the earlier reviews, and only the TV can tell:
- the owner's provider: partial reads, how soon a slot frees up, how promptly `active_cons` updates, `tmdb_id`, and
  whether its "EN|" sections hold original-language films;
- the 55OLED810's decoders and audio routes;
- how often IPTV copies' fingerprints are known to OpenSubtitles.
