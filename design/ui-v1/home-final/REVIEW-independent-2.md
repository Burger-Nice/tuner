# Home final v1.1: independent review 2

What I reviewed: the committed v1.1 (`4c4fa8b`): SPEC.md, the ten mocks' HTML, `home-final.css`, every PNG at full
size, and the contact sheet. I cropped and zoomed the spots that matter, measured the focus rings by pixel and
sampled contrast. I read it against `REVIEW-independent-1.md`, the outside UX opinion, the catalog research,
`home-directions/REVIEW-final.md` and `home-v2/SPEC.md`. I checked the data claims I could against the live Cinemeta
API today (the manifest, and the metas of Slow Horses, Severance, Breaking Bad, Heat, The Nice Guys, Project Hail
Mary, Heartstone and Spy x Family).

Positions are on the 960 × 540 canvas unless I say "on the PNG" (the PNGs are twice that size).

Two things I could not do. I have no TMDB key, so I could not re-run the TMDB numbers (the research says they were
run with the owner's key, and I took them as reported). And while I was reviewing, someone was changing `01`, `04`,
`06`, the CSS and the build script in the working tree without committing: the lit line now opens into its card in
place again, instead of sitting in fixed slots with a separate plate. I scored the committed version only. My view
of that change is under "The Marquee" below.

---

## Scores

| | Score |
|---|---|
| Ease of use with the remote | **8** |
| Clarity from the sofa | **7.5** |
| Beauty and craft | **7** |
| Delivers what he asked (finding something, the personal rows, blends) | **8.5** |
| The personalisation engine | **7.5** |
| The add-on library | **6** |
| Game night and the shield | **8.5** |
| Research quality | **7.5** |
| Buildability and speed in the TV WebView | **7** |
| Brand fit | **8** |
| **Overall** | **7.5** |

The overall is my judgement, not an average, and it puts the design first. Four screens are premium: the evening
Marquee (`01`), game night (`04`), the comedy row (`02`) and `Your shows` (`09`). Next to Netflix's 2025 TV app or
the Apple TV app, they hold up. The other six still have visible slips that a top product designer would send back,
and two of them are new in this round: on `06` the lit line's text runs through its own ring, and on `05` the focused
caption runs into the poster below it. The data side has moved from "built on things that aren't true" to sound. But
the SPEC now contradicts itself in about a dozen places, because v1.1's changes were added at the top without the
older sections being updated, and a builder will read those older sections.

---

## 1. The design, screen by screen

### What works across the set

- **The art direction is right.** The canvas is dark (#15131D), the backdrops are full-bleed under a left scrim, the
  title treatments (logos) are the heroes, and pink appears only on the pill, the bar, the chip and the avatar. That
  is how Netflix, Apple TV and Disney+ look today, and the brand's restraint keeps it calmer than any of them.
- **The brightness is now normalised to each picture** (`--capa` .53 on Severance, .10 on Hail Mary, .60 on The Nice
  Guys). Walking from screen to screen in the set, no picture is much brighter than another. That was the "light
  show" complaint, and it is fixed.
- **The poster rows are well proportioned**: 124 × 186 posters, 24 px gutters, six across and a seventh peeking at the
  edge, on a near-canvas bottom scrim. `02` and `03` look like the Apple TV app's immersive rows, which is the right
  reference.
- **The row index now reads.** On its right-hand backing it holds up on the brightest backdrops in the set (Gosling's
  shirt in `02`, Walt's yellow suit in `09`). Last round it was the least readable thing on screen. Now it's quiet and
  useful.

### What is off across the set

- **Developer words in the owner's interface.** `Popular on Cinemeta` (the subtitles in `02`, `06`, the eyebrow and
  the line in `06`), `2026 on Cinemeta` (`09`), `Same kind of thing · TMDB` (`03`), `1,451 films · 107 series · TMDB`
  (`08`), `Movies · Comedy · Popular · Cinemeta` (`05`). He doesn't know or care what Cinemeta and TMDB are. Netflix
  says "Popular now", Apple says "Top Chart". The sources belong in Account > About, where the TMDB attribution
  already goes. Last round only the meta line was cleaned. The names have since spread into the subtitles.
- **Two different gaps around the dots, still.** Inside a field the dot is tight (`Action·Comedy·Crime`, `RÚV·1`,
  `S2·E3`). Between fields it's wide (`2016  ·  Action`, `21 min left  ·  Ends 21:02`). You can see both on one line
  in `02`, `03`, `07` and `08`. The v1.1 table says "one 2 px margin on every dot", and the pictures say there are two.
  Two levels can be a deliberate choice, but then the SPEC should say so. As it stands, the screens read as fields,
  not a sentence, which is what the outside opinion said.
- **One typeface weight for everything.** Outfit 700 is the lineup names, the plate titles, the row titles, the
  peek titles and the game names. The only size steps are 23, 26, 20 and 18, so the hierarchy comes from opacity
  alone. The outside opinion raised this, and v1.1 doesn't answer it. A lighter weight (Outfit 500/600) for the
  unfocused lineup names and the peek titles would make the lit item pop without making anything bigger.
- **Plot lines are cut mid-word**: `investigate…` (`02`), `adopts a child as …` with a space before the dots (`03`),
  `As his …` (`06`), `best fri…` (`08`), `demands answ…` (`09`). One clipped sentence per screen looks like a CMS, not
  a cinema. Either allow two lines in the column (there's room above the row title in `02`, `03` and `08`), or cut at
  a word and drop the space before the dots.
- **Empty bands under wide-card rows.** The row pitch is built for 186 px posters, so a 111 px wide-card row leaves
  about 75–95 px of nothing before the next row's title (`09`: y 402–495; `10`: y 415–490; `07`: from y 400 to the
  bottom). It reads as a gap in the layout, not as breathing room. Make the pitch follow the card height, so the
  next row sits closer and shows more.

### `01` Evening (the Marquee)

The best first screen in the project, and close to finished. The Severance logo now renders at about 330 × 56 (it
was 152 × 26 last round). It is the loudest thing on screen, as the hero should be. The office backdrop sits clean in
the right half, and the peek row at the bottom finally shows there's something to browse, like the Apple TV app's
first screen.

What's off:
- **The ring and the action are 130 px apart.** The ring is on a slim 32 px line at the top (y 88–128). The thing OK
  actually does, the pink `Resume` pill, sits in an unringed plate at y 260–452, below four other lines. From the
  sofa, the eye goes logo, pill, picture, and only then finds the ring. It works once you've learnt it, but the focus
  and its action aren't one object. When the lit line is Heat (slot 4) they're close. When it's Severance (slot 1),
  three other titles sit between the ring and its plate.
- **The name is printed twice**: `Severance` on the lit line, and `Severance` as the logo 150 px below. The same
  goes for `Project Hail Mary` (`06`) and `Grizzlies at Trail Blazers` (`04`).
- **The lineup is cramped.** With 32 px slots, the ring's bottom edge comes within about 2 px of `Slow Horses`' cap
  height (zoom the PNG at y 250–265). Five stacked bold names at 62 % make a heavy grey block.
- On a game day the five lines end at y 252, and the plate starts at y 260, which is tight. On a four-line night
  (`06`) there's a 40 px hole between them. The plate's place is fixed, but the rhythm above it isn't.

About the uncommitted change in the working tree (the lit line opens into its 192 px card in place): it fixes the
two problems above (one object, no repeated name), but it brings back the moving list that both earlier reviews and
the outside opinion flagged. Every press moves the lines below by 168 px. If that change goes ahead, the SPEC's "the
lines never move" has to change too. My preference is to keep the fixed slots and connect the two halves: drop the
facts from the lit line (the plate has them), give the lit line the plate's tint so they read as one system, and
put more space between the slots. Either way it's a choice the owner should see side by side on the TV.

### `02` Comedy for you (rows)

The strongest rows screen. The logo, one line of facts, one line of plot, a hint, then a clean poster row on dark.
What's off:
- **The backdrop is the poster.** The Nice Guys backdrop is the same key art as the focused poster (Crowe and
  Gosling in the orange frame), so the top half and the focused card are the same image twice. The outside opinion
  pointed this out on The Naked Gun last round, and the new example repeats it. Apple and Netflix use a scene still or
  a textless key art for the backdrop. The rule should be: never use a backdrop whose art matches the poster (or
  prefer TMDB backdrops with `include_image_language=null`).
- The lifted ring clears the row title by about 6.5 px, not the 12 px the v1.1 nits claim (zoom y 262–275).
- The meta line has seven fields (`2016 · Action · Comedy · Crime · 1h 56m · Ends 22:38 · IMDb 7.4`). Three genres
  is one more than the sofa needs.

### `03` Anime comedy (blend)

The blend reads exactly as he asked: `Anime comedy · NEW ROW · Two things you watch, together`, and seven real anime
comedies. What's off: the Spy x Family backdrop is a murky, half-cropped green face behind the column and the index.
At a cap of .45 the top half turns to mud. This is the one backdrop in the set where the "subject in the right half"
rule visibly fails. The 11 px uppercase `NEW ROW` tag is fine as a badge.

### `04` Game night

Still the screen a visitor would remember: navy and Portland red cut at 12°, big crests, the `ON NOW` chip in
Barlow italic. Nothing crosses the split now, and the plate clears the crest (it ends at x 565, the crest disc starts
at x 586). What's off:
- **It says "live" six times**: the lit line's LIVE pill, the eyebrow's LIVE pill, `On now` in the meta, the `ON
  NOW` chip, and `YOUR TEAM · LIVE` and `LIVE` on the cards. It also says `Score hidden` twice and the matchup twice.
  Pick one place per fact. The chip and the plate own "on now" and "hidden", so the meta line can be `ESPN · 4K` and
  the eyebrow can lose its pill.
- **The peeking game cards are cut through their text.** The 78 px peek slices the 124 px hub cards through the team
  names and the plates (zoom y 490–540): you see the tops of letters and half a score plate. Poster art can bleed
  off the edge. Half-letters look broken. Show the cards' status line only (crop above the names), or show the cards
  whole.
- The text in the skewed plate steps left with the skew (x 110, 102, 94, 89), but the pill breaks the staircase (91).
  Align the text to one slanted edge, or set it upright on a skewed background.
- The clock `Thu 03:12` sits on the red field at about 3.5 : 1.

### `05` Movies, Comedy, deep (the library)

The weakest screen, and the one most changed for the worse.
- **The focused caption still cuts the title, and now it collides with the next row.** The plate wraps to two lines,
  but it still ends `Budapest Hote…`, and its meta line (`2014 · 1h 39m`) is hidden behind the Shaun of the Dead
  poster below. Zoom x 48–175, y 315–365: you can see the tops of the meta's digits above Shaun's poster. The caption
  needs room in the grid (a taller row pitch for the focused row, or the caption in the band at the top, as Apple TV
  does), not a plate laid over the next poster.
- **The focus ring is at x 40**, 8 px outside the safe area. I measured the first white pixel at x 80 on the PNG. The
  grid starts at x 48, and the 1.05 scale plus the ring push it out. This is the same break that must-fix 1 fixed
  for the Home rows last round, now in the grid.
- **The "solid band" isn't solid.** `.ctx` fades from 64 % of its 78 px height, and the context line at y 53 sits on
  the cut tops of the row above (zoom x 48–400, y 40–90).

### `06` First evening

This is the first screen a new user sees, and last round's complaint was that its text overran. It still does,
just one level up: **`Popular on Cinemeta · a pick for tonight` runs out of the lit line, and the ring cuts through
`tonight`** (zoom x 500–560, y 100–125). The eyebrow repeats the same words in caps, so the screen says "Popular on
Cinemeta" three times, counting the row subtitle. The Hail Mary logo is about 40 % ink and 60 % lens-flare smear:
"56 px of ink" counts the flare, so the actual letters are about 20 px tall, and the hero is weaker than the
unfocused `Grizzlies at Trail Blazers` under it. The fix is an ink rule that ignores low-alpha glow pixels when
cropping, or the name in Outfit when a logo's ink is mostly effect. Gosling's face sits behind the lineup, at the
centre left, not in the right half.

### `07` Channels

The flat RÚV field is still a dignified answer to "no picture". But the row itself looks like a wireframe: four big
grey boxes with a name top left, a number top right, an empty middle, and the programme at the bottom. There's no
logo, no progress bar and no colour. The SPEC says the channel card has "the logo tile" (and the column a progress
bar). The mock shows neither, and the big `RÚV` is set in type, not the channel's logo. Next to `09`'s wide cards it
looks unfinished. Google TV's live row shows the channel's logo and a progress line on every card, and that's the
bar here. The bottom 45 % of the screen is empty: as the last row, it could say `End of Home · Back to the top`.

### `08` Missing art

The idea is right, but the drawing is awkward. The upright Heartstone poster (x 600–731, y 92–288) is squeezed
between the column and the index, a few pixels above the row's cards. It reads as a stray thumbnail, not a designed
state. The same poster also sits focused in the row 300 px away, so the screen shows two identical posters. The
designed "no poster" tile is only visible as the clipped peek card at the right edge, where `N…` and `C…` are cut
by the screen edge (text past x 944). The two "loading" tiles look the same as the "no poster" design (a flat block
with a name). Fixes: centre the upright poster in the right half on its own colour field (the way `07` does with the
logo), put the no-poster tile among the visible six, and make "loading" visibly different (no name, a soft pulse,
or the row's surface colour).

### `09` Your shows

The most Netflix-like row in the set, and good: stills, the shows' logos, `S4 · E3 · 18 min left` and pink progress
bars. What's off: `S6 · E4 · new · 3` on Slow Horses, where everywhere else says `3 new`. The Slow Horses logo is
faint on its pale still. The peeking fifth card shows a cut `T` at the edge. Breaking Bad is `S3 · E6 · 12 min left`
here, but one minute earlier in `01` it's `Up next · S3 · E7`. And Severance, the show he's in the middle of, isn't
in `Your shows` at all.

### `10` Tonight in the NBA

The hub's game cards are big, clear and the right size for a TV. What's off: the eyebrow `TONIGHT IN THE NBA · YOUR
TEAM` is back (v1.1 says the rows have no eyebrow), and the peek below is `Comedy for you`, which is row 1, above
this row (see the next section).

---

## 2. The remote and the flow

**Presses to browsing: fixed.** On a game day: 4 Downs past the lines and 1 into the rows, so 5 presses (4 on other
nights), or 1 with P−. Resume and the game stay at 1, and From tip-off at 2. The `P− Browse · 15 rows` hint on the
peek tells him the shortcut exists. Back from deep in the rows goes to row 1, then to the Marquee's first line.
That's the Netflix and Apple model, and it means the next browse is one press, not a walk. This answers the owner's
"a couple clicks before you can get to the browsing section".

What's not settled:
- **What Up does from row 1 is defined twice, differently.** Section 3: "Top bar: the app's own: Up from row 1
  reaches it" (and the v1.1 table: "Search and Movies are one Up from row 1"). Section 4: "Up from row 1: the
  Marquee, with the line he left lit". On the rows screen the top bar is drawn right above the column, so he'll
  expect Up to light a tab. The builder has to pick one. I'd send Up to the Marquee (it's what the peek promised) and
  reach the bar with a second Up from the Marquee's first line, which is already the rule.
- **P− on his remote is untested.** The app maps `ChannelDown` and keycode 167, but nobody has checked that the
  Philips 55OLED810's P+/P− reaches the WebView rather than the TV's own input handling. The design leans on it, so
  check it on the TV before building around it.
- **The index can't be used.** It's a map, but there's no way to jump with it: `Channels` is P− and then 14 Downs.
  The library has CH± to page, and the rows have nothing like it. A second P− (or CH− in the rows) could jump three
  rows, or Left from a row's first card could open the index as a list.
- **`Why this row?` has no way in.** The SPEC puts it on "Hold OK … on any row title (the index)", but row titles
  and the index never take focus. Put it in every poster's Hold OK menu.
- **The page order the index shows isn't the page.** In `02` the index says row 2 is `Tonight in the NBA`, but the
  peek shows `Popular films`. In `03` the index says the next row is `Popular series`, but the peek shows `Because you
  watched Always Sunny`. In `10` the index says the next row is `Popular films`, but the peek shows `Comedy for you`.
  `08` and `09` agree. The acceptance list says "the row index names the rows on the page in order", and three of
  five rows mocks fail it. That's the one promise the index makes.

---

## 3. The data and the engine (shorter, as asked)

The engine is now sound and buildable. TMDB discover with a vote-count floor for Top rated, genre rows with a stated
exclusion heuristic, anime by keyword 210024 plus Japanese, weights split per genre with anime as its own genre,
`Because you watched` as a counting rule (which keeps it outside TMDB's ML clause), the play log with its migration,
honest no-key fallbacks, a 6-month cache ceiling and the attribution in About. Cold start, calibration and the
"Something different" row are well reasoned. Against the live Cinemeta API today, the mocks' facts hold: Severance
S2 E3 `Who Is Alive?`, Breaking Bad S3 E6 `Sunset`, Heat 170 min (ends 23:31), The Nice Guys 7.4 and 116 min,
Project Hail Mary 2026, 157 min and 8.2 (ends 23:18), Heartstone `Drama, Romance`, Spy x Family 8.2, and the
manifest's catalogs (`imdbRating` is still named `Featured`).

Problems:
- **The SPEC contradicts itself.** v1.1 was added at the top, and the body wasn't updated:
  - Decision 7 still says "Anime is Animation from Japan … country includes Japan", which is the rule must-fix 5
    replaced. Decision 6 says "Cinemeta can serve it (a genre catalog filtered by the second genre and the country)".
  - Selection step 1 puts Continue watching at row 1, New in your shows at row 2 and Tonight in the NBA at row 3.
    Step 7 and the v1.1 table say row 1 is a browsing row and NBA is row 2. The research section says "Continue
    watching is pinned (the first Marquee line and row 1)".
  - The picture's rest is 600 ms in decisions 2 and 12, section 4 and section 9, but 250 ms in section 5 (Motion),
    in section 9's prefetch line and in the acceptance list.
  - The research section still says `original_language=is` gives "1,401 films (89 with 10+ votes) and 9 series".
    The v1.1 table says 1,451 and 107.
  - The library's Top rated is "TMDB discover" in section 7's shelves, then "the ratings file over `top` pages …
    never the `imdbRating` catalog" two bullets later. Decision 9 says every shelf is "a Cinemeta catalog paged 50 at
    a time".
  - Section 3's game-night row still has the split at 79 %, the crests at x 540 / 744 and the score at x 524. The
    mock uses 83 %, 586 / 762 and 582.
  - Strings say `NEW TONIGHT` and `Á íslensku · Icelandic films and series`. The mocks say `NEW THIS WEEK` and `1,451
    films · 107 series · TMDB`.
- **`Á íslensku`'s subtitle advertises what the row doesn't hold.** 1,451 is every film TMDB has with original
  language Icelandic, mostly shorts and one-vote entries. The row itself is floored at 10 votes, which the research
  measured at about 89 films. A count in a subtitle should be what OK on `See all` will show, or not be there.
- **`Kastljós · On now` on the cold start (`06`) is data the app can't have.** The SPEC calls it a habit line ("a
  channel he tunes at the same hour on 3 of the last 7 days"), and a new user has no habits.
- **The game-night numbers don't fit the one timeline.** `04`'s row says `1 live`, but its cards show two live games
  (Grizzlies, and Nuggets at Thunder, which the lineup also calls `Also live`). It says `3 later` at 03:12, but `10`
  gives the night's last tip-off as 02:00. Nuggets at Thunder tipped at 23:30 and is still in the `3RD` at 03:12,
  3 h 42 min later. `10` says `2 at 23:00`, but its cards show 23:00 and 23:30. Last round's verdict was "one
  timeline", and the build's fixtures will copy these.
- **Slow Horses `New this week`.** Cinemeta dates S6 E4, E5 and E6 to 7, 14 and 21 October. On Wed 28 October
  nothing is new this week, and the season has finished. `3 new` is right, and the reason should be `3 new episodes`.
- **Heartstone `Ends 22:53` at 20:42** (`08`): 129 min gives 22:51. The "one function" fix missed this one.
- **Episode stills on unseen episodes.** `Your shows` uses "the still" on every wide card, including Slow Horses'
  new E4. An unseen episode's still can show a later scene (REVIEW-final made the same point about F). Use the show's
  backdrop for any episode he hasn't started.
- **TMDB rows have no IMDb id until a title is focused or opened**, so `Hold OK · Play now` from a TMDB row costs an
  `external_ids` call plus the stream add-ons' lookup before it can play. Say what he sees during that second (the
  existing "checking copies" state, presumably).

The research is current and real (Netflix's 2025 TV layout, tvOS 18.1 and 26, Google TV 2025, Disney+ October 2025,
the Android TV immersive list, Steck's calibration and the 2025 survey, TMDB's own docs and terms). It now actually
backs the engine's data decisions with API runs, including negatives. It loses points for the stale numbers left in
the body. It also loses points because the competitor comparisons are from summaries (S), not from his TV. Counting
presses to Continue watching and to a comedy row in the Netflix app on the Philips would take five minutes and would
settle the "how far is browsing" question with his own remote.

---

## Must fix (blocks building)

1. **The safe area, again.** The wide-card and game-card rings are at x 45.5–46 (`07`, `09`, `10`: first white pixel
   at x 91–92 on the PNG; the 198 / 272 px cards grow more at 1.05 than a poster does). The library grid's ring is at
   x 40 (`05`). The poster rows' ring is at exactly x 48.0, not the 49 the SPEC claims. Fix: scale wide and game cards
   less (1.03) or start those rows at x 60, start the library grid at x 56, and add the ring to the acceptance audit
   for every card kind.
2. **`06`: the lit line's facts run through the ring.** Apply the §12 shortening rule to the lineup lines too (cut
   the reason to `Popular · tonight`, or drop it, since the plate's eyebrow says it).
3. **`05`: the focused caption.** The title is still cut, and the caption covers the next row's poster. Give the
   focused title room that doesn't overlap a poster, and fix the ring (must fix 1) and the band (make it solid, or
   start the grid below it).
4. **Up from row 1.** Pick one target (the Marquee or the top bar) and write it once. Sections 3 and 4 and the v1.1
   table disagree.
5. **The index and the page must agree.** In `02`, `03` and `10` the row that peeks isn't the row the index says is
   next. Fix the mocks, and state the rule (the peek is always the index's next name).
6. **One SPEC.** Rewrite the body so it matches v1.1: decisions 6 and 7 (anime and blends), selection step 1 and the
   research line on Continue watching, 250 vs 600 ms (Motion, §9's prefetch, acceptance), the Icelandic numbers in
   Research, the library's Top rated source and paging, §3's game-night geometry, and the strings. A builder reads
   sections 3–12, not the change table.

## Should fix

- Take `Cinemeta` and `TMDB` out of the owner's interface: subtitles, eyebrows, the library's context line, the
  `Á íslensku` subtitle. Use plain reasons (`Popular now`, `New this year`, `Icelandic films and series`) and credit
  the sources in About.
- `Á íslensku`: no total in the subtitle, or the total the row can really show.
- `06`: no habit line on a cold start. Hail Mary's logo: crop to the letters, not the flare, or use the name.
- The backdrop must not repeat the focused poster's art (`02`).
- `04`: one "live" and one "Score hidden" per screen; don't slice the peeking game cards through their text; one
  text edge in the skewed plate; check the clock's contrast on a red field.
- `07`: real channel cards (logo tile, programme, progress), as the SPEC says. Use the channel's logo on the flat
  field, not typeset letters.
- `08`: place the upright poster as a designed composition in the right half. Show the no-poster tile among the
  visible six, and make loading look different from it.
- Peeking cards at the right edge show no text (`08` `N… C…`, `09` `T`, `10` `T`, `N`).
- Row pitch follows the card height, so no empty band under wide-card rows (`07`, `09`, `10`).
- Make the index usable (a row jump), and put `Why this row?` in the poster's Hold OK menu.
- Fix the timeline's facts: the live count and `3 later` in `04`; `2 at 23:00` in `10`; Nuggets at Thunder's
  times; Breaking Bad `Up next S3 E7` (`01`) vs `S3 E6 · 12 min left` (`09`); Severance missing from `Your shows`;
  Slow Horses `New this week`; Heartstone 22:51.
- Show the backdrop, not the episode still, on unseen episodes in `Your shows`.
- The Marquee: connect the ring and its plate (same tint, no repeated facts, more air between slots), or, if the
  working-tree "open in place" version is chosen, change the SPEC's "lines never move" and show the owner both on the
  TV.
- Typography: a lighter weight for the unfocused lineup names and the peek titles, so Outfit 700 means "this one".
- Still unmocked from last round: the Hold OK menus, `Why this row?`, the `Pick what you like` picker, `See all` at a
  row's end, offline, no add-ons, and the no-TMDB-key one-time line.
- Test P− / P+ on the Philips remote before the design depends on it.

## Nits

- The lifted poster ring clears the row title by about 6.5 px, not 12 (`02`, `03`, `08`).
- `S6 · E4 · new · 3` (`09`): use `3 new` as everywhere else.
- Plot lines: no space before the ellipsis (`03` `as …`, `06` `his …`); cut at a word.
- The game card's status line (`YOUR TEAM · LIVE`, `TONIGHT`) is 12 px, under the 14 px floor the SPEC claims
  (only badges and the count chip are excused).
- `10` brings back the rows' eyebrow, which v1.1 removed elsewhere.
- Decision 15 calls `Browse your library` row 13. By the index it's row 14.
- `Hold Play S1 · E1, Save, Not interested` (`03`) mixes dots and commas in one hint.

---

## Earlier points, checked

**REVIEW-independent-1.md**

| Point | Status |
|---|---|
| M1 rows' ring at x 40 | **Partly.** Posters now at x 48.0. Wide, game and channel cards at x 45.5–46. The library grid at x 40 (new) |
| M2 index unreadable | **Done.** Readable on the brightest art in the set |
| M3 Top rated from `imdbRating` | **Done** in §6a (TMDB, vote floor). §7 still has two versions |
| M4 genre rows off-genre | **Done** (TMDB exclusions, stated as a heuristic; the fallback re-filters) |
| M5 anime rule tags Pixar | **Done** in §6 / §6a. Decision 7 still states the old rule |
| M6 shares double-count, alphabetical seed | **Done** |
| M7 `Á íslensku` source, names, duplicate | **Done** for the source and the duplicate. The subtitle's count is misleading. Research still has the old numbers |
| M8 the play log | **Done** |
| Hero logo size | **Done** for Severance (330 × 56). Hail Mary's ink is mostly flare |
| `06` meta overflow, ▶ on Details | **Moved, not fixed.** The plate fits and Details has no ▶, but the lit line now overflows its ring |
| Brightness cap | **Done** (normalised, measured values in the mocks) |
| Rows' backdrop not 44 % | **Done** (`.hf-sb`) |
| Slow Horses E4 | **Done** (`New this week` is now wrong by Cinemeta's dates) |
| Rows contradict §6 / index totals | **Partly.** Totals agree (15). Peeks contradict the index in `02`, `03`, `10`. Selection step 1 contradicts step 7 |
| Naked Gun 6.3 under a ≥ 6.5 rule | **Done** (The Nice Guys 7.4) |
| Unmocked surfaces | **Partly.** Wide cards, game cards, channels and no-backdrop are mocked. Menus, Why this row, the picker, See all, offline and no add-ons are not |
| Series page weight, fetch budget | **Done** |
| Over-full page drop order | **Done** |
| Text under 14 px | **Mostly.** Game-card status at 12 px |
| Library caption cut | **Not done.** Still cut, and now overlapping the next poster |
| `New` with a genre | **Done** |
| Research wording, API checks | **Done**, with stale numbers left in the body |
| Nits: Cinemeta in meta / end times / #313 / TNT / split / `07` repeat / Helga / Heartstone genres / `Popular on Cinemeta` / ring clearance | Done / mostly (Heartstone 22:53) / done / done / done / mostly / done / done / done (but see "developer words") / not done (6.5 px) |

**REVIEW-final.md (home-directions)**

| Point | Status |
|---|---|
| Hidden game: `ON NOW`, no quarter, no clock | **Done.** No leak found anywhere in the ten mocks |
| Fan line and both records `as of tip-off` | **Done** |
| One timeline | **Mostly.** Same game in every mock, but the counts and times in `04` / `10` and Breaking Bad's episode disagree |
| NBA tab drops its pill | **Done** |
| Ring inside x 48 (lineup) / score group inside x 912 | **Done** (lineup ring at x 51; score plate ends at x 880) |
| Right as an arrow | **Done** |
| Nothing on poster art | **Done** |
| No-picture screen | **Done** for channels (`07`). The title variant (`08`) needs drawing work |
| Rest + cap | **Done** (600 ms in most of the SPEC, 250 in three places) |
| F's hero logo / one pill | **Done** |
| F's Tonight strip | **Dropped on purpose** (the outside opinion), replaced by the top bar. Reasonable |
| D's count chip / glow | **Done** |
| The list jumps | **Done** in the committed version (fixed slots). The uncommitted working tree reverts it |
| Long names rule | **Written**. Broken by `06`'s lit line |

**The outside UX opinion**: the shorter lineup, the peek, row 1 as a browsing row, P− / P+, Back to row 1, the
dropped strip, the index's backing, no eyebrow, the backdrop stopping above the posters, fading hints, the 600 ms
rest, the quiet game night and the launch intro once a day are all answered in the SPEC, and most can be seen in the
mocks. Not answered: Outfit 700 for everything, the backdrop that repeats the poster (now The Nice Guys), the uneven
dot gaps, and `05`'s cut captions.

---

## Verdict

The Marquee, game night and the poster rows are now a genuinely good TV home: one press to his show or the game,
one press (P−) to browsing, readable from the sofa, and good-looking enough to stand next to Netflix and Apple TV.
The engine behind the rows finally rests on data that's true. What's left is a craft and consistency pass, not a
redesign. Rings 2–8 px outside the safe area on three card kinds, text through the ring on the cold start, a broken
library caption, peeks that contradict the index, and a SPEC whose body still describes v1.0 all need fixing before
anyone builds from it.
