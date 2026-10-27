# airglow: which copy Play plays, the one wait, and the IMDb match, v1.0

**One file for the whole app.** This is the single copy ranking, the single wait before Play and the IMDb match levels.
Both designs point here and hold no list of their own:
- `design/ui-v1/subtitles/SPEC.md` 3.2 and 5.4;
- `design/ui-v1/addons/SPEC.md` 5.0.

The subtitles design owns this file (coordinator's decision, 27 Oct 2026), and the add-ons designer reviews changes to
it.

**The reference code:**
- `copies.js` holds the code; `copies-test.js` proves it (`node design/ui-v1/copies/copies-test.js`: 90 cases, 0
  failed).
- If this file and the code ever differ, **this file is the rule and the code is the bug**.

**Where it came from:**
- the order the subtitles review 2 proposed (its M3), with every difference the add-ons review 2 lists (its M1 and M2,
  S1, S2) settled once;
- the add-ons rules, which hold: the bands, Dolby Vision on Blu-ray, the speed band, Likely add-on copies, cinema
  recordings and not-ready copies;
- the add-ons `tools/copies.js` (`readName()` unchanged).

## 1. Words
- **Copy:** one playable stream of a title. A provider item, or one stream from a stream add-on.
- **Checked:** airglow read the copy itself (`design/ui-v1/subtitles/SPEC.md` 5: the 64 KB check, or the player's own
  first reads for an add-on copy).
- **Claim:** what a name says (provider name, add-on name, description or file name). See section 6.
- **Shown first:** his language list in Account > Settings > Languages, **in order**.

## 2. The ranking (`defaultVersion()`, the Copies menu, Options > Quality, Play)

Copies of a title, from every source, sort by these keys in turn. The first key that differs decides.

| # | Key | Rule |
|---|---|---|
| 1 | **His pin** | his pinned copy for this title (`pickVersion`), **only if it hasn't failed this session and plays on this TV now** (key 3). A pin that's passed over stays pinned (2.1) |
| 2 | **Band** | a: fits · b: **too fast:** its bitrate is over 0.7 × Diag's last measured speed. A checked copy uses its measured rate; an unchecked one is estimated from size × 8 / IMDb runtime, so a 51.6 GB remux counts as about 41 Mb/s. The speed counts only if measured in the last 7 days; with none, there is no cap · c: an add-on copy whose match isn't Sure (4) · d: a cinema recording · e: failed or not ready this session (2.2) |
| 3 | **Plays on this TV** | decided **now**, from the stored formats and the audio route at this moment (soundbar on or off, eARC), with the renderers' own `supportsFormat`. An unchecked copy counts as playing |
| 4 | **Sound language** | its index in Shown first (English before Icelandic when he lists them so). `Multi` or unknown come after his languages and before others. Before a check, the claim's language |
| 5 | **The cut** | the main cut first. **One tolerance for "the same cut", everywhere: 5%**, so a PAL copy of the same cut (4% short) isn't another cut. The main cut is within 5% of IMDb's runtime, else the most common checked length. Because language is key 4, this only orders copies **within** a language: the only English copy wins even when it's a longer cut |
| 6 | **Class** | 4K > 1080p > 720p > SD > unknown, checked size first, else the claim. A starved copy drops a class: 4K under 8 Mb/s, 1080p under 2.5 Mb/s, by the picture's share (sound tracks taken out, subtitles SPEC 5.1) |
| 7 | **Checked before unchecked, between provider copies only** | a provider copy the check has read beats one that only has its name. Add-on copies are never checked before Play, so this key doesn't apply to them: they compare on kind, range and their size-based bitrate (keys 8 to 10). Otherwise a provider "4K" at 9 Mb/s would beat a 4K Blu-ray remux every time |
| 8 | **Kind** | Blu-ray > web > **unknown** > TV or DVD. Every provider copy is unknown, so an add-on TV rip never outranks the provider's copy of the same class. (Cinema recordings are band d.) A name-only fact |
| 9 | **Range** | Dolby Vision (when the TV plays its profile) > HDR10 (**HDR10+ counts as HDR10**) > HLG > none. A name claiming Dolby Vision on a Blu-ray or remux counts as HDR10 until the check reads the profile (usually 7) |
| 10 | **Bitrate** | the picture's share: measured, or for an unchecked copy estimated from size × 8 / runtime |
| 11 | **Sound, then subtitles in the file** | Atmos (**only when parsed**, never from a name) > 7.1 > 5.1 > stereo; then a copy with subtitles in one of his subtitle languages in its file |
| 12 | **Ties** | `Your provider` first, then add-ons in his Account order, then **the bigger file** |

### 2.1 What the ranking never does
- **"Always the best copy" plays the top one.** A check that finishes later changes the default for the **next** Play,
  never the one that's playing.
- **It never switches the cut on its own.** Other cuts are marked `Longer cut · 3 h 20 min` / `Shorter cut · …` in the
  Copies menu, and are picked only by hand.
- **A pin that is passed over stays pinned.** The Copies menu says why on its row:
  - `Your pick didn't play this time`, when it failed this session;
  - `Your pick has no sound on this TV right now`, when it doesn't play now (e.g. DTS-only with the soundbar off).

  The next time it plays here, it's first again.
- **Add-on links are never opened before Play.** They can be "resolve" links that add a torrent to his debrid account.

### 2.2 Not ready (band e)
- **A film:** a copy that plays but runs under 50% of IMDb's runtime is a placeholder.
- **An episode:** never measured against the series runtime, since specials and short episodes are real.
  - With the provider episode's own length: under 50% of it.
  - Without one: under an absolute floor of 3 minutes.
- **Either way,** the add-on's own ⏳ / `download` marker counts.

## 3. The one wait before Play

### 3.1 It never waits for a copy check
- **Not on any account**, 1 or 10 connections. The subtitles review's S11, kept for 3+ connection accounts too: a check
  that starts right before Play is the likeliest moment for a connection clash.
- **It never waits for** add-ons known to be info-only or other-app-only, or for add-ons marked Not answering.

### 3.2 It may wait for stream add-ons that haven't answered
- **One 4 s budget, counted from the press of Play,** only while the best copy in hand is below 4K.
- **The button** reads `Playing in 3 s` with a countdown ring.
- **One caption:** `Looking for a better copy · OK plays this one now · Back stops`.
- **It ends early** when nothing left could change the pick, or a 4K copy in his top language arrives.
- **OK** plays the best so far; **Back** stops.
- **The Version pill** shows with 2+ copies, **or with 1 while a stream add-on is still asking**.

## 4. The IMDb match: one match per title, for subtitles, add-on copies and catalogs

### 4.1 Where the id comes from (in order, stopping at the first that answers)
1. A `tt\d{7,8}` in the provider's `info`.
2. The ratings file v2: the tconst as the row's 7th field, a **strict** index (key + year ± 1, the original-title key
   too), and **rows counted per key**.
3. The provider's `tmdb_id` against Cinemeta's `moviedb_id`.
4. Cinemeta search. Accepted only with a year (± 1, ≥ 60% shared words, or the top result sharing ≥ 1 word), or with no
   year on a single exact name.
5. Asking him: "Which film is this?" (subtitles SPEC 4.5).

### 4.2 The levels

| Level | Rule | Subtitles | Add-on copies | Catalog merge |
|---|---|---|---|---|
| **Sure** | he picked it; or the TMDB ids agree; or the key has one row within ± 1 year **and** the copy's checked length is within ± 8% of Cinemeta's `runtime` (Oppenheimer: 180 vs 181 min) | download | ranked on equal terms (band a) | yes |
| **Likely** | the key has one row within ± 1 year and there is **no checked length yet**; a series or an episode with one candidate | **download.** When the length arrives: within 8% it becomes Sure; more than 8% off, the downloads are dropped, with one line: `These subtitles were for another film` | listed after the provider's, under `From add-ons · might be another film` (band c) | yes |
| **Unsure** | a film with no year (even with one candidate); **2+ rows within ± 1 year** of the provider's year (with no year: 2+ rows at all); a film's length more than 8% off | none: the file's own only, and the pill asks `which film is it?` (not for a dub: 5) | not asked until he picks | no |

### 4.3 Series and episodes (the add-ons review 2, M2)
- **Cinemeta gives a series one runtime** (The Bear: "35 min"), and `videos[]` has no episode runtimes. So:
- **A series is Sure** when:
  - he picked it; or
  - the TMDB ids agree (Xtream `get_series_info` often has `tmdb`; Cinemeta has `moviedb_id`, The Bear 136315); or
  - the TVDB ids agree (Cinemeta `tvdb_id`, The Bear 403294); or
  - **2 or more of the first 3 checked episodes** are within 8% of the series runtime.
- **Otherwise one candidate is Likely, never Unsure because of a length.**
- **A length mismatch on one episode is that episode's own note** (`This episode's length doesn't match IMDb`), shown on
  its synopsis line and in its Subtitles sheet. It never changes the series' level. Its subtitles are still offered,
  with timing checked against its own copy.
- **An episode exists** if it is in `videos[]`. When the provider's numbering isn't there (absolute numbers,
  specials), that episode uses the file's own subtitles and no add-on copies.
- **The star rating keeps today's loose `matchImdb()`.**
- **One answer per title, for both designs.**

## 5. A dub (the subtitles review 2, M1)
- **A dub is a copy whose sound language differs from the film's original language.** Cinemeta has no language field.
  So the original language is taken from the languages of the countries Cinemeta lists (`country`): United States →
  English, Iceland → Icelandic, France → French, … (the table in `copies.js`).
- **The tests:**
  - **a dub:** the sound language is none of those countries' languages, or the name says so ("Með íslensku tali",
    "dubbed");
  - **not a dub:** a country we can't map, or no country or sound language known.
- **What a dub changes:** subtitles default **off** (a dub isn't the translation the subtitles were made from), and it
  never raises the which-film ask; the match is in the Subtitles sheet only.
- **Verified with Cinemeta on 27 Oct 2026:**

| Copy | Countries Cinemeta lists | Verdict |
|---|---|---|
| The Lion King, English | United States | not a dub (asks when Unsure) |
| The Lion King, Icelandic | United States | a dub |
| Touch, English | Iceland, United Kingdom | not a dub |
| Lamb, Icelandic | Iceland, Sweden, Poland, United States | not a dub |
| Amélie, English | France, Germany | a dub |

## 6. Reading a name (unchanged from the add-ons design 11.4)
- **Whole tokens only, extension first,** so ".ts" files, "DTS", "DVDRip", "HDRip", "webcam" and "sd" inside words
  aren't misread.
- **Fields:** resolution, Dolby Vision, HDR, kind (cinema, Blu-ray, web, TV, DVD), remux, size, language, dub, not
  ready.
- `copies-test.js` has the cases.

## 7. The test cases (`copies-test.js`, 90)
- **The order of both designs' mocks:**
  - add-ons `detail-sources-sheet`: B, A, N, P, F (changed: 8);
  - subtitles `detail-copies` / `player-quality`: a, b, c, d.
- **The subtitles review 2 cases:**
  - a DTS-only English copy loses to a playable Icelandic one, and wins when the soundbar makes it play;
  - the only English copy, a longer cut, beats a German dub of the main cut;
  - within English, the main cut beats a better longer cut;
  - with no IMDb runtime, the most common length is the main cut;
  - an unknown kind beats a TV rip; a web copy beats an unknown kind;
  - Shown first both ways; Multi between his languages and others;
  - a failed pin, and a pin with no sound right now, are passed over, with the Copies note;
  - HDR10+ = HDR10;
  - a starved 4K copy;
  - no wait for checks on 1 and on 3+ connection accounts; 4 s for an add-on below 4K; none with a 4K copy in hand.
- **The match levels:**
  - no year with one or two candidates;
  - year with no length;
  - length within and outside 8%, and Oppenheimer's 180 / 181;
  - TMDB;
  - series; episodes skipping the length;
  - his pick;
  - what each level allows;
  - the re-check when the length arrives.
- **Dubs:** the five above, plus an unknown country, an unmappable one, and a name that says "Með íslensku tali".
- **The add-ons review 2 cases:**
  - every M1 row settled once: plays before language, the 5% cut, the kind order, Atmos only parsed, the bigger file,
    2+ rows;
  - M2 series: TVDB and TMDB Sure; a 60 min episode of a 35 min show doesn't make the series Unsure; 2 of 3 episodes
    agreeing make it Sure; the episode's own note; a 12 min special is ready; a 30 s clip isn't; the provider episode's
    own length;
  - S1 the speed cap on an unchecked 51.6 GB remux, a 10-day-old speed, no speed;
  - S2 an add-on Blu-ray not buried under a checked provider copy, and the remux vs a provider "4K" at 9 Mb/s.
- **The add-ons' name-reading and placeholder cases,** unchanged.

## 8. Changes to this file
- **v1.0 (27 Oct 2026).** Written from subtitles SPEC v1.1 5.4 and add-ons SPEC 5.0. What changed from each:
  - **subtitles:** language and plays swapped back to plays → language, the cut moved after language, unknown kind
    above TV, the pin only when it plays now, HDR10+ = HDR10, Likely now downloads subtitles;
  - **add-ons:** plays moved before language; the cut became a key; language is ranked in Shown first order, not as a
    tie; a failed pin is no longer sorted first (`c.pinned ? 0 : 1` came before the band); no wait for provider checks
    on 3+ connection accounts.
  - **from the add-ons review 2:**
    - the cut tolerance is one number (5%) where there were 3% and 8%;
    - "checked before unchecked" is between provider copies only;
    - the speed band uses an estimate for unchecked copies and a speed under 7 days old;
    - series Sure by ids or by most episodes; episode-level length notes;
    - "not ready" for episodes uses the provider episode's length or a 3 min floor.
  - **One mock order changes as a result:** the add-ons `detail-sources-sheet` becomes B, A, **N, P**, F. Northlight's
    1080p Blu-ray (14.2 GB, about 11 Mb/s) now ranks above the provider's checked 1080p (7.1 Mb/s). The add-ons
    designer should redraw that list.
