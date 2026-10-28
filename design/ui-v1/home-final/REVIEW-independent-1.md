# Home final: independent review 1

I reviewed `design/ui-v1/home-final/`: SPEC.md, the eight mocks' HTML, `home-final.css`, every PNG at full size
(cropped and zoomed where it mattered, with pixel sampling for the ring positions and text contrast) and the
contact sheet. I read it against `home-directions/REVIEW-final.md` (the fixes it was meant to make), the A Marquee
direction it grew from and `home-v2/SPEC.md`. I checked the data claims against the live Cinemeta API today
(manifest, `top`, `year` and `imdbRating` catalogs with `genre` and `skip`, and about 30 title metas) and the
app's own code (`app/tv/js/addons.js`, `state.js`, `scripts/build-ratings.js`). I also opened four of the cited
sources (Android TV layouts and immersive list, arXiv 2507.02643, arXiv 2505.03376).

Positions are on the 960 × 540 canvas unless I say "on the PNG" (the PNGs are twice that size).

---

## Scores

| | Score |
|---|---|
| Ease of use with the remote | **8** |
| Clarity from the sofa | **7** (Marquee 8.5, rows 6) |
| Beauty and craft | **7.5** |
| Delivers what he asked (finding something, personal rows, blends) | **8** |
| The personalisation engine | **5.5** |
| The add-on library | **7** |
| Game night and the shield | **8.5** |
| Research quality | **6.5** |
| Buildability and speed in the TV WebView | **7.5** |
| Brand fit | **8** |
| **Overall** | **7** |

The overall score is my judgement, not an average. The Marquee half is close to finished and very good. The rows
half, where he actually finds something new to watch, has a readability problem and a safe-area break. The engine
that fills those rows is the right shape, but it rests on four things about Cinemeta that aren't true. All of it
can be fixed in the spec without changing the design's idea.

### Why each score

**Ease of use 8.** The Marquee is still the easiest first screen of any direction: one axis, six names, OK does
the one thing the pink pill says. I traced the press counts: resume 1, the game 1, from tip-off 2, Heat 4, the
channel 6. They're right. The rows use the normal TV pattern (Left / Right along a row, Up / Down between rows),
and each row remembers its card. Back from anywhere in the rows goes to the Marquee in one press, which keeps deep
browsing safe. What costs points:
- The review's "the list jumps" point is still open. The lit block is about 100 px taller than a plain line, so
  every Up / Down moves every line under it. Compare `01` (Slow Horses at y 330) with `07` (Slow Horses at y 150).
  The order never changes, but the positions do on every press.
- Where Down from the last line lands isn't settled. Section 4 says "row 1 at its remembered card". Section 6 makes
  row 1 Continue watching. The press-count line says "the first personal row is lit". Mock `02` shows Comedy for
  you lit with Continue watching above it.
- Up from row 1 goes to the `Tonight` strip, but the spec doesn't say which chip gets focus. Up from the strip
  lights the Marquee's *last* line, while Back lights its *first*. Both are defensible, but they should be the same.

**Clarity 7.** From the sofa, `01`, `04` and `07` read in one look. The rows screens don't:
- The row index at the top right is printed straight onto the backdrop. On `02` it sits on Pamela Anderson's hair
  and face. I sampled the background behind `Anime comedy`, `Crime dramas` and `Because you watched The Bear`, and
  text-3 there comes out at about 1.8 to 3.2 : 1. `7 more` is set in text-4, which the brand tokens reserve for
  "disabled only", and it measures about 1.1 to 1.9 : 1, which is effectively invisible (zoom `02` and `03` at
  x 1730–1825, y 455–485 on the PNG). The index is the design's one new idea, and in two of three row mocks it is
  the least readable text on screen.
- The rows' "picture area" isn't the top 44 % that the spec says. The backdrop is full screen, and the posters sit
  on the art: on `02`, Game Night and Palm Springs sit on the red dress. The spec's 300 px bottom scrim isn't in
  the HTML (only the 220 px `.hf-sy` at 0.8 is).
- The rows screen carries a lot of text at once: the strip, the eyebrow, the logo, meta, plot, hint, six index
  names, the row title and its subtitle, then the next row's title and subtitle. It works, but it's at the limit.

**Beauty 7.5.** `01-evening` and `04-game-night` are the two best screens in the whole Home project: calm and
cinematic, and a game night that looks like a broadcast graphic. `07` (RÚV on a flat field) is a dignified answer
to "no picture". The rows screens look like a good Apple TV app. Craft slips are listed below: the rows' ring is
outside the safe area; `06`'s meta line runs out of its own box; the focused logos are still small; text crosses
the 12° split on `04`; the meta-line dots vanish on art (`02`: the `·` before `Cinemeta` is there in the HTML but
can't be seen in the PNG).

**Delivers what he asked 8.** Everything he named is there and named plainly: Continue watching first, the game,
`Popular films`, genres, `Comedy for you`, an `Anime comedy` blend marked `New row`, `Because you watched The Bear`,
and `Á íslensku`. Every row says why it exists. That is exactly "if I watch a lot of comedy… anime… maybe anime and
comedy". It loses points because none of the wide-card rows (Continue watching, New in your shows, Channels,
Tonight in the NBA) is mocked, and those are the rows he'll use every night.

**The engine 5.5.** The structure is sound and current: candidate rows, then a greedy page with an overlap cap, one
title in one row only, calibration with one deliberate "something different" row, "because" reasons, mute
controls, a daily seed so nothing moves while he looks, and a sensible cold start. But the data underneath doesn't
hold. The `imdbRating` catalog isn't "top rated". Genre catalogs contain titles that aren't in that genre. The anime
rule tags Pixar films as anime. Genre shares are double-counted, which isn't what calibration means. The play
history the engine reads doesn't exist yet. Details are under Must fix 3 to 8. None of it is hard to fix, but as
written the engine would produce rows that contradict their own reasons, which is the one thing the explanation
research warns destroys trust.

**The add-on library 7.** It is the right shape for Cinemeta, and the claims I could test hold: `top/genre=Comedy`
answers at skip 3,000, and Popular films answer at skip 10,000, so "3,000+" and "browse everything" are true. It
reuses the existing grid and `addons.js`. Against it: the `Top rated` shelf reads the wrong catalog (Must fix 3).
`New` can't be combined with a genre, because Cinemeta's `year` catalog *requires* `genre` = a year, so
"Movies · Comedy · New" needs a filtering rule the spec doesn't give. The focused poster's own caption is cut off
(`The Grand Bud…`).

**Game night and the shield 8.5.** Every shield point from the last review is fixed and I could find no leak.
`ON NOW` with no quarter and no clock. `Score hidden` on the line and on the plate. Both records and the fan line
say `as of tip-off`. Reveal takes Hold, then a confirm. The NBA tab drops its pill. The other live game shows no
score. The game-night screen is one timeline with the evening mocks. The score group ends at x 837 and the lit
plate's ring starts at x 52 (measured), so both are inside the safe area. Small craft points only (nits).

**Research 6.5.** The sources are real and recent. I opened the Android TV layouts page (48 / 27 dp margins, 196
and 124 dp cards: correct), the immersive list (focus scale 1.1, "subject top right": correct), the calibration
survey (Corrêa da Silva and Jannach, July 2025: correct) and the explanation study (129 participants: correct).
Where a source was only read through summaries, it says so (S). Two problems. First, the explanation study tested
*feature-based* explanations of popular films, not history-based "because you watched" reasons. It supports short
positive reasons, but not exactly the claim it's cited for. Second, and more important, the research that would
have backed the engine wasn't done: the anime rule was "checked" on seven true positives and no negatives, and
nobody opened the `imdbRating` catalog to see what it contains. In this round, the API was the research that
mattered most.

**Buildability 7.5.** It fits what exists: `addons.js` already talks to Cinemeta (catalogs, metas, search, six
requests in flight, caches). The lineup is a `[data-col]`, the rows are `[data-row]` with `data-key`, `setHtml` is
per row, nothing uses filters or blur, and only opacity and transforms animate. Two costs the spec doesn't count.
First, Cinemeta's *series* catalog pages are 620 to 700 KB each because each item embeds all its episodes, so the
6-page anime blend is about 4 MB of JSON to parse and cache. Second, the play log the engine needs is new storage
(Must fix 8).

**Brand 8.** It uses the kit's tokens, the gradient only on the pill, chip, bar and avatar, the Sharp 12° only on
game night, pink-text for eyebrows, and team colours only on the fields. The deductions are small: text-4 used for
live text (`7 more`, the dots), a ▶ play glyph on a `Details` pill (`06`), and text under the 14 px floor in
places the spec doesn't excuse.

---

## Must fix (blocks building)

1. **The rows' focus ring is outside the safe area: `02`, `03`, `08`, first poster.** I measured the white ring at
   x 40 in all three. `.row { left: 48px }` puts the poster at 48, then `scale(1.05)` and the 7 px ring push it to
   40. This is the same break the last review fixed for the lineup (now at x 51), and it's back on every row. Fix:
   start rows at x 56, like the lineup and the column, and check the seventh card's peek still reads.

2. **The row index can't be read on bright art: `02`, `03`, `08`, top right.** Contrast is about 2–3 : 1 for
   text-3 and about 1–2 : 1 for `7 more` in text-4, a token the brand reserves for disabled things. It also sits
   exactly where Google's immersive-list guidance (cited in the spec) puts the subject: the top right of the
   backdrop. Fix: give the index its own dark backing (a right-hand scrim to about x 640, or a bg-1 plate at
   86 %), never text-4, and check it on the brightest backdrop in the set.

3. **"Top rated" reads a catalog that isn't top rated.** Cinemeta's `imdbRating` catalog is named `Featured` in the
   manifest, and its first page today holds 49 mostly 2026 titles. Many are unrated, the rated ones range from
   5.4 to 8.4, and only 2 are 8.0 or higher. `imdbRating/genre=Comedy` is the same (The Love Hypothesis, unrated, is
   first). So `Top rated · IMDb 8.0 and up`, `Top rated comedies · IMDb 7.5 and up`, `Something different… rated
   7.5 and up` and the library's `Top rated` shelf would be empty (hidden under 6) or would contradict their own
   reason. Fix: build these from `top` pages filtered by rating, or better, from the app's own IMDb ratings file
   (`scripts/build-ratings.js` already has rating, votes and genres per title), so `Top rated` also means "enough
   votes".

4. **Genre catalogs contain titles outside the genre.** Page 1 of `movie/top/genre=Comedy` includes Pulp Fiction,
   Parasite, One Battle After Another, Buddy (Horror), Forgotten Island and Send Help. That's 6 of 50 whose own
   `genres` don't include Comedy. As specified, `Comedy for you · Because you watch Always Sunny…` would show Pulp
   Fiction. Fix: one rule in section 6 saying every genre row, blend and library genre shelf re-filters by the
   item's own `genres`, and the "Too few" rule then applies.

5. **"Anime = Animation + country includes Japan" tags Western films as anime.** In the first 150 of
   `movie/top/genre=Animation`, 67 titles pass the rule, and about 40 of them are Western: Moana, Up, Finding Nemo,
   Frozen, Inside Out, Toy Story 2 and 3, Soul, Tangled, Minions, Zootopia, Big Hero 6 and others (Japan is listed
   as a co-producer or distributor). Series do better, but still let through Korra, Miraculous, Gargoyles, TMNT and
   Superman: TAS. If he watches Pixar with family, "anime" goes up in his profile and his `Anime comedy` row fills
   with Disney. Fix: require Japan as the *first* country (this fixes nearly all series and most films; Sing,
   Super Mario and The Secret Life of Pets still list Japan first), plus a small exception list or an IMDb-id anime
   list built at build time. Then test it on negatives as well as the seven positives.

6. **Genre shares double-count, and "the seed's first genre" is nearly always Action / Adventure / Animation.**
   `G[g] = Σ w over titles carrying g ÷ Σ w` counts each title in full for each of its (up to 3) genres, so shares
   add up to far more than 100 %. Action rides along with every anime and every action-comedy (Spy x Family, One
   Punch Man, Mob Psycho, Gintama, The Naked Gun, The Nice Guys are all `Action`), so `Action for you` could
   outrank the genres he actually chooses. Steck's calibration divides a title's weight across its genres. Fix:
   use `w / n` per genre, and treat anime as its own genre that absorbs that title's Animation (and probably its
   Action) weight. Separately, Cinemeta lists genres alphabetically (`Action, Comedy, Crime`), so
   `Because you watched X: top/genre= the seed's first genre` will usually query Action, Adventure or Animation.
   Fix: query the seed's genre with the largest share in his profile.

7. **`Á íslensku` has no real source, and the mock shows names and a count the app can't have.** Cinemeta has no
   country filter, and the spec's sources are an add-on whose name says Icelandic (none is named or known to exist)
   or titles he has happened to meet. A comedy and anime viewer won't meet 44 Icelandic titles, so the row will
   usually be under 6 and hide. Cinemeta also returns English names (`Heartstone`, `Godland`, `Woman at War`,
   `A Letter from Helga`), not the `Hjartasteinn`, `Volaða land`, `Kona fer í stríð` and `Svar við bréfi Helgu` the
   mock prints. And in `08`, Godland and Volaða land are the **same film shown twice** in one row. Fix: a
   build-time list of Icelandic IMDb ids (crawl Cinemeta's genre catalogs once and keep `country` containing
   Iceland, shipped like the ratings file), Icelandic names from IMDb's `title.akas` for region IS if wanted, and
   a rule that a row de-duplicates by IMDb id across sources.

8. **The engine's main signal doesn't exist yet.** Section 6 reads "every play with its IMDb id, type, how far,
   when". Today `state.js` keeps one `progress` entry per item (overwritten on each play, capped at 400 and
   evicted), and the history from the provider era isn't keyed by IMDb id. Fix: say it's a new play log in
   IndexedDB (append-only, one record per session over N minutes), how old progress migrates (through `imdb.js`
   matching), and that the owner's first weeks are effectively a cold start.

## Should fix

- **The focused logo still isn't the hero (`01`, `02`, `03`, `06`).** This was a "borrow from F" fix, and the spec
  says it's done ("the hero logo at 60 px"). But metahub logos are 800 × 310 with transparent padding: Severance's
  ink fills only rows 89–222. In `01` it renders about 152 × 26, barely bigger than the unfocused 26 px `Slow
  Horses` under it, and nowhere near F's size. Fix: crop each logo to its alpha bounding box once, when it's
  fetched and cached, and set the *ink* to about 56–64 px tall, at most 340 wide.
- **`06` cold start: the meta line overflows its block.** `2026 · Adventure · Comedy · Sci-Fi · 2h 37m · Ends
  23:19 · IMDb 8.2` runs to about x 648, while the lit block ends at x 530. That's the spec's own §12 shortening
  rule, broken on the first screen a new user sees. Also, the `Details` pill carries the ▶ play glyph, but the spec
  reserves ▶ for play verbs, and this is the one pill that doesn't play.
- **The brightness cap doesn't cap.** The Marquee's `.hf-cap` is 14 %, so art can reach 86 % of its brightness.
  Going from Severance's bright green office to the navy game is still a full-room swing once the 250 ms rest
  ends. Fix: normalise by the art's mean luminance (from the 32 px copy the glow already uses), for example a
  darkening layer that brings every backdrop's right half to the same target brightness.
- **The rows' backdrop isn't the top 44 % the spec describes (`02`, `03`, `08`).** Either add the 300 px scrim and
  stop the picture behind the poster row, as written, or change the text.
- **Slow Horses `New this week · S6 · E6 · 3 new` (`01`, `04`, `07`).** If three episodes are new (E4, E5, E6 per
  Cinemeta's dates), OK must play E4, so the line should name E4. As drawn, it reads as if OK plays E6 and skips
  two.
- **The page's rows contradict section 6's own rules.** The `01` footer says 3 rows + 11 more (15 with Continue
  watching), while the index in `02` / `03` / `08` adds up to 13. The `04` footer names two rows, not three. The
  index has no `New in your shows` at row 2 (though Slow Horses has 3 new), no `Saved`, and no `Tonight in the
  NBA` on the evening of a game day, although `04`'s footer puts it first. `08`'s index shows five rows above the
  current one and none below, breaking the "two above, three below" window. It also has `Comedy series for you`,
  a kind of row the engine table doesn't define, while `02`'s `Comedy for you` is all films although the table
  says films and series are interleaved.
- **The lit example breaks its own row's rule.** The Naked Gun is IMDb 6.3 (Cinemeta), but `Genre for you`
  requires ≥ 6.5.
- **Unmocked surfaces a builder will have to invent:** the wide-card rows (Continue watching, New in your shows,
  Channels), the `Tonight in the NBA` game cards with `Score hidden` (a shield surface), the Hold OK menus,
  `Why this row?`, the `Pick what you like` picker, `See all` at a row's end, the offline and no-add-ons states,
  and the title-without-backdrop poster variant of fix 5.
- **Series catalog weight.** Pages are 620–700 KB because they embed every episode. Say that the worker keeps only
  the fields the engine uses (`id, name, type, genres, country, year, runtime, imdbRating, poster, logo,
  background, cast, director`) before writing to IndexedDB, and set a daily fetch budget.
- **Over-full page.** With 55 / 25 / 20 % shares, the slot rules give about 7 personal rows + Because +
  Something different + 4–5 discovery + 5–6 anchors, roughly 19 rows, against a cap of 16. Say which rows are
  dropped first.
- **Text under 14 px that the spec doesn't excuse:** the wide card's second line (13 px, and the spec itself says
  13 while its floor says 14), `NO POSTER` (12 px), the strip's `RÚV` mark (12 px).
- **The library's focused caption is cut off** (`05`: `The Grand Bud…`). Let the focused cell's title wrap to two
  lines.
- **The `New` shelf with a genre:** Cinemeta's `year` catalog requires `genre` = a year, so `Movies · Comedy · New`
  must be `top/genre=Comedy` filtered and sorted by year, or `year/genre=2026` filtered by Comedy. Say which.
- **The research section:** add the API checks (with negatives) as research, and reword the explanation-study line
  to what it tested (short, positive, feature-based reasons).

## Nits

- `02` / `03`: the source shows `Cinemeta` in the meta line, but the spec says the add-on's name appears "when a copy
  is known", and Cinemeta has no copies. The `·` dots (text-4) disappear on art.
- End times aren't computed by one rule. Heat is 170 min at 20:41, which ends 23:31, but it's shown as 23:33.
  Heartstone (129 min) → 22:50, shown 22:53. Naked Gun → 22:06, shown 22:08. Hail Mary → 23:18, shown 23:19.
  Severance → 21:02, shown 21:03.
- `05`: `#313` would be in the first column of a 6-wide grid counted from #1 (313 = 52 × 6 + 1), not the third.
- `04`: `Also live · TNT`. TNT has no NBA rights from 2025–26 (the national deal is ESPN/ABC, NBC/Peacock and Prime
  Video).
- `04`: `3-0 · as of tip-off` and the footer's `Tonight in the NBA` cross the 12° split line.
- `07`: the right panel repeats the lit block (`Kastljós · 20:35 – 20:55 · 14 min left`). Its `Next` line is
  right-aligned while the lines above it are left-aligned. `Next: Fréttir [HD]` reads as if Fréttir is the HD one.
- `08`: `A Letter from Helga` does have a poster on Cinemeta (pick a truly posterless title for the demo).
  Heartstone's Cinemeta genres are `Drama · Romance`, not `Drama`.
- `This week on Cinemeta`: Cinemeta's `top` is a popularity mix (moviedb, trakt, stremio). Nothing shows it's
  weekly, so `Popular on Cinemeta` is safer.
- The focused poster's lifted ring comes within about 7 px of the row title's descenders (`02`).

---

## REVIEW-final.md, point by point

| Point | Status |
|---|---|
| Hidden game: `ON NOW` / `Score hidden`, no quarter, no clock | **Done** (`04`) |
| Fan line `as of tip-off`, both records stamped | **Done** |
| One timeline (Trail Blazers in evening and game night) | **Done** |
| NBA tab drops its pill while the game is the big thing | **Done** |
| OK split stated every time | **Done** (pill on the Marquee, `OK Details` in the rows), but `06`'s `Details` pill has the ▶ play glyph |
| Fix 2: lineup ring inside x 48; score group inside x 912 | **Done** on the Marquee (ring at x 51–52; plate ends at x 837). **New break** in the rows (ring at x 40) |
| Fix 3: Right drawn as an arrow | **Done** |
| Fix 4: nothing on poster art | **Done** |
| Fix 5: no-picture screen | **Done** for the channel (`07`); the title-without-backdrop variant is a rule, not mocked |
| Fix 6: 250 ms rest + brightness cap | **Rest done**; the cap is nominal (14 %) |
| Borrow F: hero logo 60–70 px | **Not really done**: the box is 60 px, the ink is about 26 px |
| Borrow F: Tonight strip | **Done** |
| Borrow F: one primary pill | **Done** |
| Borrow D: count chip | **Done**, but `3 new` points at E6 instead of the first unseen |
| Borrow D: the glow | **Done** (flat radial, no blur) |
| Weak: unfocused meta faint | **Barely changed** (opacity 0.66 → 0.72) |
| Month-annoyance: the list jumps | **Not addressed** |
| Long names need a shortening rule | **Rule written** (§12); `06` breaks it |
| Runtime data for `Ends` | **Resolved** by moving films to Cinemeta (every catalog item carries `runtime`) |

---

## Verdict

The Marquee and game night are ready to build: they read from the sofa, they're one press to what he does most,
and the shield now leaks nothing I could find. The browsing rows look right, but they need their ring brought
inside the safe area and the row index made readable before anyone codes them. The personal-row engine needs a
data pass against the real Cinemeta API (the "top rated" catalog, genre filtering, the anime rule, the share
maths, the play log and a real Icelandic source). Otherwise the rows he asked for will show the wrong films under
reasons that say otherwise.
