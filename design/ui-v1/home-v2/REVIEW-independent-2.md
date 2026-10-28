# Home v2, v1.1: independent review

Reviewer: independent senior TV product / brand reviewer. Report only. No existing file was changed.

**What I read.** `SPEC.md`, `RESEARCH.md`, `BRAND-CHECK.md`, `home-v2.css` and all 20 PNGs at full size (plus the
contact sheet), and parts of the mock HTML and `tools/build.js` / `tools/audit.js`. For context: `CLAUDE.md`,
`brand-v5/v5.4/BRAND.md`, today's `screens/home.js`, `util.js` (`setHtml`, `teamPalette`, `TEAM_COLORS`), `games.js`
(the seen store, `recordFor`, the copies kept at tip-off), `nba/common.js` (`pinView`), `state.js` (progress),
`catalog.js` (tags, popularity, which fields are kept), `core.js` (where the Xtream durations come from), `addons.js`,
`detail.js` (`moreLikeThis`), and `nba-pages/data.json` (the real 26 Oct slate). I judged v1.1 on its own merits and
used the v1.0 review only to check what was claimed as fixed.

## Score

| Area | Score | One line |
|---|---|---|
| Visual quality | **6.5** | The title billboards are calm and well set. The game billboard is better than v1.0's slab, but for this matchup it is two murky navies. Card metas lose their most useful words to ellipses, and new slicing and seam defects got past the audit |
| Brand fit | **7.5** | Unmistakably airglow. But the team fields fade under two scrims (perceptually a team-colour gradient), and half-strength team colour sits behind the LIVE pill and the secondary buttons' rings, which BRAND 1 forbids. With a red or orange opponent this fails outright |
| Creativity and uniqueness | **7.0** | Game-night mode, `THE MORNING AFTER`, the Icelandic greeting and `A film for tonight` are real ideas for this one person. Ambient colour is Netflix's, `Ends at` is in Plex, Infuse and Kodi (the spec says "nobody prints" it), and the signature game look disappears when both teams are blue |
| UX and remote / focus | **7.5** | The rules are solid: a locked billboard, primary focused, Back to the primary, OK means one thing, a dim under menus, the end clamp. Open questions: which primary to use under the shield, `Reveal score` two presses from the focus with no confirm, the source card dimmed under its own menu, and Home OK ≠ hub OK on the same card |
| Fit to this owner | **6.0** | The shield is the owner's most important feature, and the fan line leaks through it (standing, streak and points average copied at the wrong tip-off, against the app's own rule). A backlog of two unseen Grizzlies games is mishandled. With Icelandic tip-off times the game billboard owns Home most of the week. The languages, add-ons and Channels-last parts are right |
| Data realism | **6.5** | Much better: real backdrop jobs, logo-tile channel cards, the named-4K row, Á íslensku from tags. New gaps: `A film for tonight` needs runtimes the prepared list doesn't hold. `Also from Cinemeta` is back. The New season rule contradicts its own mock. The "real" slate isn't the real one, and the mocks contradict each other on records and clocks |
| Performance on a TV WebView | **6.5** | Keeping rows mounted and the billboard hidden rather than unmounted is right. But "diffed by `data-key`" is not what `setHtml` does (it replaces `innerHTML`). Lazy images in `visibility:hidden` rows will all load at launch. The palette "from the already-downloaded image" needs a second download natively. Clock ticks would redraw the whole Home |
| Buildability | **7.0** | Clear port notes, ready CSS, a row plan, named functions. But it is one very large change (11 rows, 5 billboard kinds, 3 data jobs, 2 native features, a reorder setting), with two mechanisms the spec treats as existing (a partial redraw, a native palette with a shared image cache) |
| **Overall** | **6.8 / 10** | A real step up from v1.0 (6.4), and nearly every v1.0 point has a substantive answer. It is held back by a spoiler leak in the lead mock, a game-night look that doesn't survive the owner's real opponents, and an audit that again passes visible defects and contradictory data |

## Verdict

v1.1 does the hard part well. The information architecture is stable and honest, the shield states are drawn in the
new layout, the data jobs are specified, the performance section is mostly rewritten to match the code, and the owner's
three answers are applied. A builder could start from this.

It is not yet "next level", for three reasons. **(1) The fan line breaks the shield in the lead mock.** It shows the
Grizzlies' conference place, streak and scoring average copied at *this* game's tip-off, while an earlier Grizzlies game
(the Kings replay, stopped in Q3) is unseen. The app's own `recordFor` contract says a partial record "drops streak, seed
and the like". The hub's `pinView` uses the copy from the *earliest* unseen game ("As of tip-off, Grizzlies at
Kings"). **(2) Game-night mode, the headline creative idea, only works for some matchups.** For half the league it is
blue on blue. For a red or orange team on the left, the LIVE pill and the buttons would sit on that colour. Every mock is
a Grizzlies road game against a navy or purple team, so neither case is drawn. **(3) The self-audit reports 0
findings on 20 mocks, yet I can see truncated card metas on 9 mocks, sliced text on 3 and a hard seam on 1.** And the
scenario's own numbers disagree from mock to mock (4-0 with "3 in a row", 3-0 the next day). Fix the top six items below
and this is an 8.

## Problems, most serious first

### 1. The fan line leaks results through the shield (`home-live-hidden`, `home-behind`, `home-pre`, `home-pre-choose`, `home-morning`; SPEC 3.2, 9.3)
Every shield mock has `Grizzlies at Kings · Stopped in Q3` in Continue watching, so that Grizzlies final is unseen. The
fan line still reads `3rd in the West · 3 in a row · Morant 27.8 ppg ⊘ as of tip-off`, where "tip-off" means the Jazz
game's tip-off (SPEC 3.2: "the copies taken at tip-off").
- That copy was taken *after* the Kings game, so the conference place and Morant's average already include the Kings
  result. A drop from 2nd to 3rd, or an average moving by 1.5 after a 40-point night, is a spoiler to a fan who checks
  these numbers.
- `3 in a row` is a streak. `games.js` says a partial record means "the surface adds the eye-off and drops streak, seed
  and the like". The spec breaks the rule the app already follows. A winning streak printed beside a partial `3-0 ⊘` is
  also an invitation to do the arithmetic.
- The hub labels this copy by its game (`As of tip-off, Grizzlies at Kings (Sun)`, `nba/common.js` `pinView`). Home says
  only `as of tip-off`, which here points to the wrong game.

**Change:** take the copy from the earliest unseen game of the team (`pinView(['MEM'])`), name it
(`⊘ as of Grizzlies at Kings`), and drop the streak and the seed whenever the record is partial. Under a partial record
the line becomes, for example, `Morant 27.8 ppg · next: Lakers Thu` (from the copy). Also say what the line reads for a
losing run (the spec only covers "3 in a row"). Then add a FANLINE audit check: on a shield mock with any unseen team
game, the line contains no seed or streak and names the copy's game.

### 2. Game-night mode: blue on blue, and untested on the colours that break it (`home-live-hidden`, `home-live`, `home-behind`, `home-pre`; SPEC 3.2, BRAND-CHECK D5)
- **The fields collapse.** MEM's primary is `#5D76A9` and UTAH's is `#002B5C`. Both are mixed 55 % into bg-1, darkened,
  and then faded by a 124 px top scrim and a 120 px bottom scrim, so the billboard reads as one dusky blue wash with a
  faint diagonal. In `TEAM_COLORS`, 14 of the Grizzlies' 29 opponents have a blue, navy or indigo primary (CHA, DAL, DEN,
  GS, IND, MIN, NO, NY, OKC, ORL, PHI, PHX, UTAH, WSH) and 2 are black. Only `home-m3u` (Lakers purple) shows the idea
  working, and that purple sits close to the brand's orchid.
- **The LIVE pill and the rings sit on team colour.** The top scrim is 86 % at y 76 and 0 % at y 124, so at the status
  row (y 84 to 108) the field shows through at about 40 to 55 %. The bottom scrim is about 50 % at the buttons' top edge
  (y 232). LIVEBG passes only because the two mocked fields are desaturated navies (its threshold is saturation 40/255).
  On a Grizzlies home game the *away* team takes the left field behind the pill. Against HOU, CHI, TOR, POR, ATL, MIA or
  PHX, that is a red or orange ground under the red LIVE pill, which BRAND 1 and 6 exist to prevent ("a team colour never
  touches a LIVE pill or a focus ring, keep an 8 px gap"). The split line also runs behind `Reveal score`, `From tip-off`
  and the caption, so those buttons' rings sit on the home field.
- **Faded twice, the field is a gradient.** BRAND 1 says team colour is "never as a gradient or glow". D5 argues the field
  is a plate grown to billboard size, but a plate is flat and hard-edged, and this field is not.

**Change:**
- Make the status band truly canvas: bg-0 at 100 % down to y 116, then a hard 12° plate edge, not a fade.
- End the fields at y 222 with the plate's straight edge. The buttons sit on bg-0 below that edge, so no ring ever
  touches a field.
- Add a clash rule: when the two fields are within ΔE 20, draw the home field from its secondary (darkened to 4.5:1), or
  draw it neutral bg-1, and draw the 12° split as the two 4 px secondary edges (allowed material, BRAND 1). That gives
  Memphis' gold against Utah's gold-orange, or against Denver's yellow, a visible seam.
- Mock a Grizzlies **home** game against a red team (Rockets) and against a navy one (Nuggets), and re-run LIVEBG with a
  hue-aware threshold.

### 3. A backlog of unseen games is not handled (`home-morning`, `home-final-seen`, SPEC 3.1)
In `home-morning` the billboard pushes `Watch from tip-off` for the Jazz game, while an *earlier* Grizzlies game
(Kings, stopped in Q3) is unfinished in row 1. A shielded fan watches in order: the Jazz broadcast will open with "coming
off their win in Sacramento". The priority table has no rule for two unseen team games. `home-final-seen` makes it
worse: the Jazz game is seen and the record is a full `4-0`, but the Kings replay is still `Stopped in Q3`. Under the
`{ upTo, ids }` model that is possible (a seen id doesn't move `upTo`), but it means Home just revealed the Kings result
through the record.

**Change:** add a rule to 3.1: when more than one team game is unseen, the billboard is the **oldest** one (`Resume` on
the Kings replay), with a status-row note `1 more after this` and `Game page` for the newer one. Seeing the newer final
first must not give a full record while an older game is unseen (`recordFor` already counts seen finals only, so the
mock is what's wrong). Mock it.

### 4. The game billboard can own Home most of the week (SPEC 3.1 rows 1 and 2, the owner's "doesn't need to just be sports centered")
In Reykjavik almost every tip-off is between 23:00 and 03:30. The owner will often watch the next day, and the morning
after holds "until the buzzer plays, a reveal, the replay expires, **48 h** or the next game's window". With a game
every ~2.2 days, a fan who watches replays sees the game billboard on most launches between games. On top of that the
NBA row is row 2 every day of the season. On many weeks the "two moods" of decision 11 will be one mood.

**Change:**
- Cap the morning-after billboard at the first 12 h (or until 18:00 the next day). After that, the game becomes the first
  card of Continue watching (`Grizzlies at Jazz · From tip-off · Score hidden`), and the title billboard returns.
- Give the game billboard a hold-OK `Not now` that returns the title billboard for this visit.
- On days with no live game, move the NBA row below `New in your shows`. Keep it at row 2 only while a game is live or
  the team plays today. The rows setting already exists, so the owner can still choose otherwise.

### 5. The audit passes visible defects again (several mocks; SPEC 11, H-Q1)
v1.1's LINES check forces one line, and the result is ellipses where the useful words were:
- **The wide-card metas are truncated** on every mock with Continue watching (`home-live-hidden`, `home-live`,
  `home-behind`, `home-pre`, `home-pre-choose`, `home-morning`, `home-final-seen`, `home-evening`, `home-upnext`, …):
  `S1 · E3 · "Signal" · 21 ...`, `Film · 18 mi...`, `S3 · E2 · "Low Tide"...`. The time left, the reason the card
  exists, is what gets cut, and `Film ·` takes space without telling him anything.
  **Change:** card meta = `S1 · E3 · 21 min left` (the episode name belongs on the billboard and the title page), and a
  film = `1h 17m left`. Add a TRUNC rule: the time-left token must be whole.
- **The next-game card's second line runs under the tip-off plate.** `home-discover` shows `Nuggets 4-1 · Game p` and
  `home-first` shows `Lakers 2-2 · Game pag`, so the text is cut by the slanted plate. **Change:** drop `· Game page` (OK
  says it) or end the text box at the plate's left edge.
- **A half-cut row title** at the top of `home-channels`: `Saved for later` is sliced through its middle by `.hv-cover`.
  **Change:** hide the title of a row above the cover (visibility, as the peek does) instead of letting the fade cut
  through it.
- **A hard seam** in `home-first`: the poster-upright billboard's ambient ground ends in a horizontal line at y 292, with
  no vertical fade. **Change:** keep `.hv-sy` in the poster-upright variant.
- **The peek's top line sits outside the safe area.** The NBA row's status line (`LIVE 1ST 9:41`, `IN 38 MIN`) is at
  y 517 to 535, under the 34 px edge fade and about 4 px from the panel edge, on 11 mocks. CLAUDE.md: "keep text … inside
  the safe area". The fade also makes it read as disabled. **Change:** either lift row 2 by 12 px (row-1 cards end at 447
  and the gaps can give it), or hide the status text and keep only the crests and edges in the peek.
- **The chip's caption is tight against the slanted edge** (`UNTIL YOU WATCH`, `YOU STOPPED HERE`, about 2 px). The chip
  grows to about 167 px, not the 112 px the spec and BRAND-CHECK D2 state. Shorten the captions (`until you watch` →
  `not started`, `you stopped here` → `paused`) or measure the slant into the padding. The chip also reads `2nd 4:12` /
  `1st 8:20` in lower case, where the spec and the game cards use `2ND` / `1ST`.

### 6. The scenario contradicts itself, and the "real slate" isn't real (SPEC intro; `tools/build.js` `G`)
- `home-final-seen`: `4-0` beside `3 in a row`, and `3rd in the West` unchanged after a win.
- `home-m3u` (Wed 28, shield off): the Grizzlies are `3-0` a day after `4-0`, again with `3 in a row`.
- `home-pre` (00:11): `3 final`. On the real Mon 26 Oct slate nothing tips before 23:00, so at 00:11 there are four live
  games and no finals. The 02:30 game reads `IN 38 MIN` at both 00:11 and 01:52. At 00:11 the order is `IN 1H 49M` before
  `IN 38 MIN`, against the spec's own "live, upcoming" order. The TNT game is `IN 1H 49M` at 00:11 and `LIVE 1ST 9:41` at
  01:52, which would put its tip-off at 02:00.
- `build.js` says "real pairings from `nba-pages/data.json`", but LAL at PHX and DEN at OKC are not on that slate (the
  real one has PHX at OKC and GS at DEN).
- The Kings replay is still in Continue watching on Wed 28 although the caption says `Replays for 3 days`.
- `home-channels` (20:41) shows `Pelicans at Nuggets` as the programme on air, while the NBA row in the same scenario says
  that game tips in 2 h 19 min.
- `Because you watched Night Circuit` while Night Circuit is in S1 · E3 (the rule is "the last title he finished or
  passed 80 % of").

**Change:** build one timeline (results, records, seen state, programme times) and derive every mock from it. Add a
CONSIST check (the record equals the seen finals, the streak agrees with the record, clocks agree with the mock's time).
None of this matters to the owner directly, but the audit claims a consistency it doesn't test. That is how the fan-line
leak in item 1 got through.

### 7. Data the app still doesn't have (SPEC 4.1 row 5, 3.5, 9.3, 3.8)
- **`A film for tonight` needs a runtime for every film.** SPEC 9.3 calls it "a filter over the prepared movie list
  (runtime …) at draw time", but the prepared list has no runtime: `catalog.js` keeps no duration, the Xtream VOD list has
  none, and `duration` comes only from `get_vod_info` per title (`core.js` 229) or Cinemeta meta per title. The same goes
  for `Ends 23:16` on any pick whose info wasn't fetched. **Change:** add `runtimeMinutes` from IMDb's `title.basics` to
  the weekly ratings file (`scripts/build-ratings.js` already reads the IMDb datasets). That is one column, and every
  rated film gets a runtime for free. Otherwise the row is fiction.
- **`Also from Cinemeta` is back** in `home-new-season`, SPEC 3.5 and the strings list, although the v1.1 changes table
  says it is gone (Cinemeta has no streams). **Change:** `From Northlight` / `On your provider`.
- **New season contradicts itself.** The rule is "every episode of its last season seen", but the mock has Signal Hill
  `S3 · E2` in progress in row 1, with `You watched up to S3` on the billboard. And priority 3 (Continue, touched in the
  last 7 days) outranks priority 4, so with the same Continue row as `home-evening` this billboard can never show. For an
  owner who always has something in progress, New season will practically never appear. **Change:** let a new season
  of a followed show outrank Continue for the first visit after it lands (it is news, and it is rare), and fix the
  mock's Continue row.
- **Ambient colour:** "computed natively from the already-downloaded medium image". The WebView's image cache isn't
  readable from native code, so `command('palette', url)` downloads the image a second time. **Change:** say so and cap
  it, or compute in JS from a 32 px `w92` / `/small/` copy drawn to a canvas (TMDB and metahub send CORS headers; check
  this). And note that the procedural art is all brand pink and purple, so the "different mood every evening" was shown
  in one mock only (teal, `home-new-season`).
- **The channel card shows only the two-letter fallback.** Most providers send a `stream_icon`. The realistic case is a
  full-colour or white-on-transparent logo in a 44 px tile on a large grey card, and it isn't mocked. The row still
  looks like placeholders. **Change:** mock real-looking logos. Consider a 64 px tile centred higher with the programme
  below, and put the number on every card (the game card drops it for the crests).

### 8. Performance claims that are not true of the code (SPEC 9.1)
- **"One `setHtml` per data event, diffed by `data-key`; a score or clock change re-texts the billboard's nodes only."**
  `util.js` `setHtml` compares the whole string and replaces `innerHTML`. `data-key` is only used to put focus back. So
  with one container, every `49 MIN` → `48 MIN`, every `Ends` minute, every 30 s `setInterval(redraw)` (home.js today)
  rebuilds the billboard and 11 rows of `<img>`, which is exactly the 100 to 200 ms cost home.js warns about.
  **Change:** specify one container per row plus separate text nodes for the billboard's live values (score, chip, `Ends`),
  updated with `textContent`. That is the new mechanism, and it should be in the port notes.
- **Hidden rows still load their images.** `loading="lazy"` uses a distance margin (1,250 to 2,500 px in Chromium), and
  `visibility:hidden` does not stop it. A Home about 2,900 px tall loads nearly all ~88 posters at launch, competing with
  the billboard and the catalog prep, which contradicts "rows 3+ after `launchDone`". **Change:** keep `data-src` on
  rows beyond the next one and set `src` when a row comes within one row of the focus.
- **The entry animates two full-height clip-path layers plus grain.** It is probably fine, but it is a moving clip on a TV
  GPU. Put "measure on the 55OLED810, fall back to the opacity-only fade" in H-L1.

### 9. Focus and remote details (SPEC 3.2, 6)
- **Which primary under the shield.** At 01:52 in Q2, with the shield on and nothing watched, `Watch live` drops him into
  the middle of the second quarter. A shield user often wants `From tip-off`. **Change:** make the primary follow his last
  choice for his team's games (remember `live` / `tip-off`), and default to `From tip-off` when a replay source exists.
- **`Reveal score` is ▶ ▶ OK from the landing focus** and marks the game seen for good. **Change:** a one-step confirm
  sheet (`Reveal Grizzlies at Jazz?`), as the hub's Reveal names its game, or move Reveal into the hold menu.
- **The hold menu dims its own card.** In `home-card-menu` The Long Take is under the same 60 % dim as everything else,
  and the menu has no title, so nothing ties the menu to the card. **Change:** keep the source card above the dim with
  its ring, or give the menu a header (`The Long Take`).
- **Home OK ≠ hub OK on the same game card.** It is defensible (Home is for watching), but nothing on the card shows it.
  **Change:** on Home a live, unshielded game card shows a small ▶ beside LIVE, so the difference can be seen.
- **M3U Home puts Channels last.** On a live-only account the channels are the content. `Channels last` was the
  owner's answer for a full account. **Change:** on an M3U account, Channels is row 1 under the billboard.
  `Remind me` in `home-m3u` is also drawn enabled with no `Reminders come with the next update` caption, against SPEC
  3.5. Better still, leave a dead button out until NEXT.md 1 ships.

### 10. Smaller copy and brand points
- `FINAL / full time` is football English. Use `FINAL` / `after overtime`, or `FINAL` / `W 112–104`, and drop the
  caption that repeats the plate's score.
- `GOTT KVÖLD PICK UP WHERE YOU LEFT OFF` reads as one run-on line at 3 m. Put a `·` or a 16 px gap between the greeting
  and the rest. `Góðan dag` (from 12:00) is stiff in speech, and most Icelanders say `Góðan daginn` all day. Ask the
  owner, he will know at once. `GOTT KVÖLD` at 03:40 is fine.
- `THE MORNING AFTER · GRIZZLIES AT JAZZ · MON 26 OCT · LATE` at 10:40 the next morning: write `LAST NIGHT`. The night
  rule is right for lists, but too much for an eyebrow 9 hours later.
- `home-morning`'s NBA row shows the hidden Grizzlies game as `ENDED` while it is also the billboard. Leave it out of the
  row, as Continue watching does.
- Three LIVE pills on one screen (the top bar, the status row, the peek) in every live mock. Drop the status row's pill
  when the bar's NBA tab already carries one, or drop the bar's while Home's billboard is live.
- RESEARCH and SPEC overclaim: "nobody prints" the end time (Plex, Infuse, Kodi and Jellyfin do), and "no other app
  says" a greeting (the point is that it's Icelandic, so say that).
- BRAND-CHECK D2 says the chip is under 4 % of the billboard at 112 × 72. As drawn it is about 167 × 72. Restate it.

## What is good, and should stay
- The structure: one locked billboard with no timer, Continue watching pinned first, every row naming its reason, thin
  rows hiding themselves, the rows setting with toggles and moves, Back → the billboard's primary.
- The shield states are now drawn in the real layout (hidden live, behind, pre without a channel, morning after, final
  seen), with the eye-off on partial records and `Score hidden` as a neutral tile. `home-behind`'s
  `Resume · Back to live · Game page` with `1ST 8:20 / you stopped here` is exactly right.
- The slab is now a chip, and the primary button is again the brightest small thing on screen.
- The honest data work: logo-tile channel cards, the poster-left wide card (`Salt & Static`) and the poster-upright
  billboard as designed fallbacks, the backdrop job, the New in your shows job with a cap and a cache, the named-4K row
  with the dashed tag, and Á íslensku from tags and audio.
- `Details` as the discovery primary (the owner), the caption naming the playable copy (`4K HDR from Northlight`),
  `Ends 21:03` on the billboard, and `A film for tonight` as an idea.
- The end clamp in `home-channels`, the dim under menus, and the offline pill out of the rows.

## What I could not verify
- The team fields, the ambient ground and the chip on the 55OLED810 in Standard and Vivid. The fields' banding and
  whether two navies separate at all on the panel (my blue-on-blue reading is from the PNGs).
- Real backdrops and real channel logos under the scrims. All art in the mocks is procedural.
- Whether TMDB and metahub images carry CORS headers in the Capacitor WebView (for a JS palette), and Chromium's exact
  lazy-load margin in the TV's WebView version.
- How many Icelandic-tagged titles and categories the owner's provider has, and whether its episodes carry `added`.
- Frame times. Nothing is built. The performance points come from `util.js`, `home.js` and the spec.
