# airglow add-ons v1.1: second independent review

Reviewer: the same independent TV UI/UX reviewer, 27 Oct 2026.

**What I read:**
- `SPEC.md` v1.1, all 30 mocks, `png/contact-sheet.png`, `tools/copies.js` and `tools/copies-test.js`;
- the subtitles spec v1.1 (`design/ui-v1/subtitles/SPEC.md`: 3.2, 4.1 to 4.3, 5.3, 5.4 and section 15).

**What I ran:**
- `node tools/copies-test.js`: 31 cases, 0 failed;
- `node tools/audit.js`: 30 pages, 0 findings;
- a text scan of every mock for `stream`, `HD` and `Courtside`.

**What I checked live:**
- Cinemeta's `/meta/series/tt14452776.json` (The Bear): `runtime "35 min"`, `moviedb_id 136315`, `tvdb_id 403294`.
  No episode in `videos[]` carries a runtime.
- Stremio's community list, to see whether the rows in `add-list` are real.

**Overall: a strong revision.** Every v1.0 point was taken seriously, and most are fixed in both the spec and the
mocks:
- Home is untouched.
- Info-only "streams" are handled.
- Add-on links are never opened before Play.
- Placeholder clips are detected.
- The film match gate is in place.
- Diag names the add-on.
- The shield section was honestly cut back.
- The jargon is gone.
- The debrid requirement is said in his words.

**Two problems remain blocking:**
1. **The "one" ranking, wait and match is still written twice, the two versions disagree, and each spec says it wins.**
   That was v1.0's M2, and it has come back in a new form.
2. **The new match gate and the placeholder rule don't work for series**, because Cinemeta gives a series one runtime,
   not one per episode.

## Scores

| Dimension | v1.0 | v1.1 |
|---|---|---|
| Protocol correctness and compatibility with real add-ons | 7.5 | 8.5 |
| Remote ergonomics (adding without typing, Stremio sign-in) | 8.5 | 8.5 |
| Clarity for a casual owner | 7.0 | 8.5 |
| Visual quality and consistency | 8.0 | 8.5 |
| Feasibility | 6.5 | 7.5 |
| Privacy and security | 7.5 | 8.5 |
| States and edge cases | 7.0 | 7.5 |
| **Overall** | **7.2** | **7.8** |

---

## Did each v1.0 point get fixed?

| v1.0 | Status | Notes |
|---|---|---|
| M1 Home | **Fixed** | Home unchanged; the home mocks and `acct-catalog-menu` are gone; chips only; `movies-chip-menu` added. Owner question 3 is the right place for the rest. |
| M2 One ranking and one wait | **Not fixed** | See new M1 below. |
| M3 Info-only streams | **Fixed** | `androidTvUrl` or a known service; `stremio://` handled; info goes to the description; info-only add-ons never make Play wait; the `Streams` chip is gone. One gap: should-fix 7. |
| M4 Debrid side effects and placeholders | **Fixed** | Links are never opened before Play; the not-ready rule; `player-not-ready`; the test fixture. Series gap: new M2. |
| M5 Wrong-film match | **Fixed for films** | The Sure gate, the Likely group (`detail-copies-likely` is clear), the gap for films with no year closed. Series: new M2. |
| M6 Diag blames the provider | **Fixed in the spec** | `source` goes to Diag; which card wins is stated. Should-fix 6 refines it. |
| M7 Shield discovery | **Fixed (deferred)** | One masking rule, open question 7, `sources-shield` removed. |
| S1 to S20 | **Fixed**, except S3 (half fixed), S16 (fixed, with a nit) and S17 (fixed) | S3: should-fix 1. The rest I checked in the spec and the mocks. |
| Nits | Fixed | A few new ones below. |

---

## Must-fix

### M1. The shared ranking, Play wait and IMDb match still exist twice, and the two copies disagree

**Each spec claims precedence:**
- Add-ons 5.0 says it "is written for both designs" and that subtitles "should point here".
- Subtitles 5.4 says the add-ons spec "carries the same text … if the two ever differ, this list wins".
- Subtitles 3.2 calls itself "the add-ons design's 4.4 as well", while add-ons 4.4 points to its own 5.0.3, which
  "amends subtitles 3.2".

**They don't carry the same text:**

| | Subtitles 5.4 / 3.2 (v1.1) | Add-ons 5.0 (v1.1) and `copies.js` |
|---|---|---|
| Order of the first keys | pinned → **plays on this TV → cut → language** → class | pinned → **band → language → plays on this TV** → class |
| Plays on this TV vs language | plays first | language first (the same swap v1.0 had) |
| The cut | a ranking key (main cut = IMDb runtime ±8%) | not a key; another cut is marked at **3%** and never auto-picked |
| Kind | Blu-ray > web > **unknown > TV** | Blu-ray > web > **TV/DVD > unknown** (`KIND`: tv 1, '' 0) |
| Bands (too fast, not Sure, not ready / failed) | absent | key 1 |
| HDR10+ / Atmos | "out of the ranking" | "unless parsed" / "Atmos only when parsed" |
| Ties | provider, then add-on order | provider, then add-on order, then **the bigger file** |
| The wait | "Play **never** waits for a copy check on any account"; waits only for add-ons while the best isn't 4K | may wait for a provider check **when the account allows 3 or more connections**; also "below the best its own language could give" |
| Match: 2+ rows for a key | Unsure **without a year** | Unsure, full stop |
| Match: levels | step-by-step acceptance, plus auto-accept within ±5% | Sure / Likely / Unsure, with Likely used for the catalog merge and the copies group |

**Section 15 is not mirrored either.** Subtitles section 15 lists what add-ons should copy. These are still missing:
- the Copies foot, "Mb/s is the picture's share. Picking a copy keeps it for this film.";
  `detail-sources-sheet` has its own foot;
- "1080p" in tags, not "HD": `detail-play-wait` still shows a ticked `HD` tag, and the v1.1 changes list says "the
  meta-line tag stays HD, the subtitles 4.1 rule", which subtitles v1.1 no longer has;
- the pill-row text (`.st-side`): add-ons 5.1 still says "the subtitles line under the pills" (see should-fix 4);
- the Quality panel at 384 while a film plays: `player-sources` is 400.

**What to do instead:**
- Keep the text in **one** file and make the other a pointer with no list of its own. Add-ons 5.0 is the natural home,
  since it has the bands. Delete subtitles 5.4's list and its "this list wins" line, and subtitles 3.2's levels, or
  the reverse.
- Settle each row above once:
  - plays on this TV before language: a copy that can't play shouldn't win on language;
  - the cut threshold: one number;
  - unknown vs TV kind;
  - the wait: I'd take subtitles' "never waits for a check";
  - the 2+ rows rule.
- Run `copies-test.js` on the subtitles design's Oppenheimer cases too, so both folders are proved by one test.
- Apply the section 15 items to the add-on mocks.

### M2. The match gate and the placeholder rule break on series (5.0.3, 8.2, `copies.js` `matchLevel`, `notReadyByLength`)

**What's wrong:**
- **Cinemeta gives a series one runtime.** For The Bear it is `"35 min"`, and `videos[]` has no per-episode runtime
  (checked live). The Bear's episodes run from about 20 to over 60 minutes.
- **Sure by length.** Sure needs "the provider copy's checked length within ±8% of Cinemeta's runtime", and
  `matchLevel` returns **`unsure`** when the length is off. So the first long or short episode turns the whole series
  Unsure, and add-ons are no longer asked for any of it.
- **Which length.** The spec never says which episode's length the series match uses.
- **The placeholder rule.** "Under 50% of `runtime`" uses that same series runtime (8.1: "Cinemeta's runtime or the
  provider's length"). A genuine 15-minute episode or special of a "35 min" show is called "not ready", skipped, and
  never plays.
- **`detail-series`** shows Northlight as the best copy for S3 · E4. Under the gate that needs Sure, and the spec
  doesn't say what made The Bear Sure.

**What to do instead:**
- **Series Sure:** his pick; or `tmdb` / `tvdb` agreement (Cinemeta has both `moviedb_id` and `tvdb_id` on series;
  Xtream's `get_series_info` often has `tmdb`); or the lengths agreeing within ±8% on most of the first few checked
  episodes.
- **Episode level:** a length mismatch on one episode is that episode's problem ("this episode's length doesn't match
  IMDb"), never the series'.
- **Not ready, for an episode:** use the provider episode's own duration when there is one. Otherwise use an absolute
  floor (under 3 minutes, or the add-on's ⏳ / `download` marker), not a fraction of the series runtime.
- Add cases to `copies-test.js`: a 60-minute episode of a 35-minute show; a 12-minute special; a series with a TMDB id.

---

## Should-fix

1. **The speed cap (S3) never reaches the copy it was written for.**
   - In `copies.js`, `tooFast` needs `k.mbps`, a **checked** bitrate.
   - Add-on copies are unchecked until they have played, so the 51.6 GB remux (about 41 Mb/s) is never capped and still
     plays first on a Wi-Fi link that can't hold it.
   - Estimate a bitrate for unchecked copies from size × 8 / runtime (both are known), and apply the band to that.
   - Also say how old "Diag's last measured speed" may be. Diag measures only when a stall needs it, so the value can be
     weeks old or missing. With none, there is no cap.
2. **"Checked before unchecked" now always penalises add-on copies.**
   - Key 5 sits above kind, range and bitrate, and add-on copies are never checked before Play. So any checked provider
     copy beats any add-on copy of the same class. A provider "4K" at 9 Mb/s beats Northlight's 4K Blu-ray remux every
     time, until the remux has been played once.
   - For add-on copies, use the size-derived bitrate (should-fix 1) as the comparable fact. Or apply key 5 only between
     copies from the same source.
3. **The `add-list` language filter has no data behind it.**
   - Manifests don't declare subtitle languages; Napisy24's Polish is only in its description.
   - The mock's rows are hand-picked in `tools/build.js`. Two descriptions are rewritten: real MSubtitles says
     "MSubtitles is an add-on that allows you to manage your subtitles…", real Subtitle Sync says "Subtitle Sync for
     Stremio finds subtitles…". And OpenSubtitles v3, which is in the **official** list, appears under Community.
   - Either define the filter (for example, a language name or ISO code found in the name or description), or drop
     "filtered to his languages" and open on Official.
   - Show manifest descriptions as they are (one line, ellipsis), as v1.0's 3.4 said.
4. **Two texts want the same spot on the pill row.**
   - Subtitles v1.1 moved its text ("From OpenSubtitles · Icelandic ready too", "OpenSubtitles isn't answering…") onto
     the pill row, right of the pills.
   - `detail-sources` puts `Still asking Kestrel` there, and `detail-play-wait` puts the wait caption there.
   - Say which wins and when: the wait caption, then "Still asking", then the subtitles text. Draw the case where both
     are present.
5. **"Prefer another source" disagrees with `player-not-ready`.**
   - 8.2 / S7 says an automatic hand-over prefers another source. `player-not-ready` hands from Northlight's Blu-ray to
     **Northlight's** web copy, although the provider's 1080p is in the list.
   - That mock is the better behaviour: a placeholder or a decoder failure is about one copy. Write the rule that way:
     prefer another source only for failures that look source-wide (timeouts, 5xx, connection refused); otherwise take
     the next in rank.
6. **A Wi-Fi cause should change which copy comes next.** When Diag's cause is "Your Wi-Fi is too slow for this copy",
   the hand-over should re-rank with the new speed (the S3 band) and pick a copy that fits. The next in rank is probably
   another 4K copy. Say so in 8.2.
7. **Where `stremio:///detail` links go.** Watch Next answers with ten such links for one title. "Opens airglow's own
   title page" doesn't say where they appear. Ten rows in Copies would be noise. Put them in More like this, or drop
   them.
8. **`countryWhitelist`'s country.** "From the provider's country" is the wrong signal: a provider's server country
   says nothing about where he is. Use the TV's region (Settings), and never filter when it's unknown.
9. **Picking a Likely add-on copy** (`detail-copies-likely`) pins it, but the spec doesn't say whether that also makes
   the match Sure for this title. Say it does: he chose it. Otherwise "Always the best copy" drops it back under the
   provider's copies next time.
10. **Default catalog switches.** v1.0 said what showed by default (2 Home rows). v1.1 doesn't say which catalog chips
    start on (`acct-addon-sheet` shows Popular and New on, Featured off). State the default.

## Nits

- **Kestrel's state.** At the same 21:10, `state-addon-down` shows Kestrel "Not answering · tries again 21:40", while
  `detail-sources` and `detail-sources-sheet` show "Still asking Kestrel". 5.0.2 and 9 say a Not answering add-on isn't
  asked. Make the mocks one moment.
- **The contact sheet header** (`tools/render.js`) still lists "Courtside" as illustrative.
- **`add-stremio-found`'s card** says changes arrive "the next time airglow starts". 3.3 also syncs when Account >
  Add-ons opens.
- **`detail-sources-sheet`, provider row:** "Your provider · English · named 4K" puts the problem third. Subtitles 15
  asks for the problem right after the source.
- **The same add-on set up twice** shows the same name ("Torrentio") on two sources in Copies and Continue watching.
  Add a short distinguishing label (the debrid service, or "2").
- **`player-not-ready`:** "4K · Dolby Vision" for an unchecked web copy should carry "the name says", as in Copies.

## What's good and should stay

- `detail-copies-likely`: the group head "might be another film", the film named on every row, and a foot that tells
  him how to settle it. This is the right way to show uncertainty to a casual viewer.
- `player-not-ready`: a plain explanation of a debrid quirk, "nothing is saved from the clip", and an automatic
  hand-over.
- `tools/copies.js` and `tools/copies-test.js`: the reference code made the ranking checkable, and the first run
  already caught a real bug (the speed band). Extend the same test to the subtitles cases (M1) and to series (M2).
- The CUT audit check and `stream` added to JARGON: both found real problems on their first run.
- The `add-ways` and `add-list` lines about Real-Debrid. That one sentence does more for the owner than any other
  change in v1.1.
