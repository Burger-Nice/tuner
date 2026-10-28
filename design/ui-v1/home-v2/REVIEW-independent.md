# Home v2: independent review

Reviewer: independent senior TV product / brand reviewer. Report only, no files changed.
Read: `SPEC.md`, `RESEARCH.md`, `BRAND-CHECK.md`, `home-v2.css`, all 12 PNGs (11 mocks plus the contact sheet) at full
size, parts of the mock HTML; context from `CLAUDE.md`, `CONTEXT.md`, `NEXT.md`, `UI-SPEC.md` (1, 5.2 to 5.6),
`brand-v5/v5.4/BRAND.md`, today's `app/tv/js/screens/home.js`, `cards.js`, `core.js` (Xtream info calls), `util.js`
(`sized`), `ui.css` (`.wc`) and the Android sources (looking for the image pipeline).

## Score

| Area | Score | One line |
|---|---|---|
| Visual quality ("Netflix quality" on a TV) | **6.0** | The title billboards are a real step up. The game billboard, which is this owner's most frequent Home, is a dark field with a huge magenta slab. Every wide card has a layout bug, and the peeking rows are empty boxes |
| Brand fit | **7.5** | Unmistakably airglow (wedge, gradient, 12° plates, Barlow scores, team colours). The 34 % slab and the large gradient field strain the "gradients small, slab ≤ 26 %" rules more than D2 admits |
| UX and remote / focus | **7.0** | The rules are sound: a locked billboard, primary focused, Continue first, per-row memory, OK means one thing. Live NBA cards no longer tune in one press, a menu sits over content with no dim, and rows mount and unmount on every ▼ |
| Fit to this owner | **6.5** | Channels low and the NBA high, as asked. But the most important shield state is not mocked, a pre-game record may spoil, the language order contradicts the scenario, and the game billboard says nothing about the Grizzlies beyond W-L |
| Data realism | **5.0** | The channel art, the 16:9 film art, "New in your shows", "In 4K · Checked" and "Á íslensku" are drawn as full, but the app has no source for them, or only a thin one |
| Performance on a TV WebView | **6.5** | The principles are good: fixed row heights, no layout reads, lazy images. But it leans on a native image-sizing layer that does not exist, and mount/unmount churn plus re-decoding the billboard are designed in |
| Buildability | **6.5** | Clear port notes and ready CSS. But the CSS ships with the wide-card bug, and three unscoped pieces of work hide behind one-liners: native image sizing, polling for new episodes, and the reorder UI |
| **Overall** | **6.4 / 10** | Right structure, right priorities, honest row names. The craft, the data and the main game-night state are not at "next level" yet |

## Verdict

The information architecture is the strongest part. It has one billboard with no timer. Continue watching is locked as
row 1. The NBA row is second. Every row says why it exists, and rows hide themselves when empty, can be switched off and
can be ordered. Channels are last, exactly as the owner asked. The research is honest about what it could and could not
read, and it is applied with judgement (no autoplay, no immersive list, no per-add-on shelves).

Where it falls short of "Netflix quality shit" is in the pixels and in the data. (1) Every wide card in every mock has a
visible text-wrapping bug that the self-audit passed with "0 findings". (2) The state the owner will see most on game
nights, a live game he has not started watching with the shield hiding the score, is not mocked. The mocked live state
has him "watching the game" while on Home. (3) Several rows and most of the card art are drawn from data the app does
not have. Fix the top five items below and this is an 8.

## Problems, most serious first

### 1. Every wide card's meta line breaks into three lines (all 8 mocks with Continue watching or channels). Must fix.
`ui.css` has `.wc .tx span{display:block}`, and the mock nests `<span class="dot-sep">` inside the meta `<span>`. The dot
becomes its own block, so "Film · 1h 17m left" renders as `Film` / `•` / `1h 17m left` (visible in `home-live`,
`home-pre`, `home-morning`, `home-evening`, `home-card-menu`, `home-offline`). The text block grows to about 65 % of the
111 px card, the scrim covers most of the art, and the title rides up to the middle. So the "art first" wide card is
really a text card, and the audit reported 0 findings on it.
**Change:** scope the rule to `.wc .tx>span`, or make the separator inline. Then add an audit check that compares each
text box's line count with its design (a LINES check: meta = 1 line). Re-render and re-judge the wide cards after the fix.
Also drop the duplication the spec itself asks for: the label `S1 E3` top-left *and* the meta `S1 · E3 · 21 min left`.
Keep one, preferably the meta, and use the label for `NEW` / `REPLAY` only.

### 2. The main game-night state is not mocked, and the mocked one is contrived (`home-live`, SPEC 3.2).
`home-live` shows the score because "he is watching the game (the reveal)". But if he is watching, he is in the player,
not on Home. On a game night under `My team`, Home will usually show one of these:
- **Live, hidden:** he opens the app during the game.
- **Behind in a replay:** he paused the replay and came back.
- **Pre, no channel:** the guide match failed. This happens often, given the owner's "No guide information" history.

None of these are drawn in the new billboard layout. The catch-up mocks (`home-live-tipoff`, `home-behind`) are in the
old 864 × 192 hero, so the Score hidden tile with the slab's `ON NOW / SCORE HIDDEN`, the three-button row
`Watch live · From tip-off · Reveal score` and the plate spacing are unverified at the new scale.
**Change:** mock `home-live-hidden`, `home-behind` and `home-pre-choose` in the v2 layout, and make the hidden live state
the lead mock.

### 3. The pre-game records may be a spoiler, and the audit only checks one mock (`home-pre` vs `home-live` / `home-morning`).
In all three mocks Continue watching holds `Grizzlies at Kings · Stopped in Q3`, so that final is unseen. In `home-live`
and `home-morning` the records are partial (`3-0 ⊘`, `1-2 ⊘`), but in `home-pre` (00:11, same seen state) they are plain
`3-0` / `1-2`, which is what `recordFor` returns only when nothing is unseen. Either the mock data is wrong, or the pre
state shows a full record that includes the unseen Kings result (3-0 against 3-0 ⊘ tells him they won in Sacramento).
**Change:** fix the data, and run SPOILER on every mock (the scenario says the shield is `My team` on all of them),
not only on `home-morning`. Add a RECORD check: if any game in the mock is unseen and involves the team, the plate's
record must be partial.

### 4. The data the mocks show is not data the app has (SPEC 5, 9; `home-channels`, every wide row).
- **Channel cards.** In `home-channels` the channel cards show scenic programme art (an arena, studio sets). An Xtream
  short EPG has no images, and today's `liveCard` draws `noimg-bg` plus the logo for exactly that reason. In real use
  this row is four flat surface-2 tiles with a 28 px logo, and Home's last row looks like a placeholder.
  **Change:** design the real card: the provider logo large and centred on a tinted field taken from the logo, or the
  two-letter tile, plus the programme title and the bar. Then mock that, not art.
- **16:9 art for films in Continue watching.** The Xtream VOD list carries only `stream_icon` (a poster). `backdrop_path`
  needs a `get_vod_info` call per title, and SPEC 9 fetches it "for the billboard's title only". Today `contCard` uses
  `it.still || it.poster`, so a film's wide card is a 16:9 crop out of the middle of a poster, usually through its
  printed title. **Change:** fetch the backdrop (Cinemeta `background` by IMDb id first, else `get_vod_info`) for every
  Continue watching item, up to 16, cached 30 days. Specify the fallback (the poster upright on the left of the card,
  with the title beside it), and mock that fallback.
- **`New in your shows`.** It needs each followed series' episode list with its added dates. `seriesInfo()` does not
  keep `added`, and the "prepared lists" of SPEC 13 do not hold episodes. **Change:** specify the job: the series list's
  `last_modified` moves, then one `get_series_info` for that series only; for add-ons, Cinemeta meta `videos[].released`.
  Run it after `launchDone`, in the request queue, with a cap and a cache. Without this the row is fiction.
- **`In 4K · Checked copies` and `Á íslensku` (Icelandic, or with checked Icelandic subtitles).** Copy checks run one
  connection at a time, 60 s apart, on Continue watching and on title pages. Subtitle checks run on demand. So there
  will be very few unseen titles with a checked 2160p copy or checked Icelandic subtitles, and both rows will mostly hide
  (fewer than 3 items) or show titles he has already opened. **Change:** let the 4K row use named-4K with the dashed tag
  (as Movies does) and say "Named 4K · checked when you open". Base Á íslensku on the provider's language tag and
  category, plus the Icelandic audio track, and leave subtitles out of the rule. Or merge it into Top picks with the
  `IS` badge (the spec's own question 14.3, which I would answer the other way).
- **`Also from Cinemeta`** (`home-discover`). Cinemeta serves catalogs and metadata, not streams. The copy comes from
  the debrid add-on. The eyebrow already says `FROM YOUR ADD-ONS`, so the caption is wrong and also repeats the eyebrow.
  **Change:** caption the playable fact, for example `Best copy 4K HDR · Northlight`, or drop it.
- **The mock data contradicts itself.** `home-discover` is Sat 21:10 but the cards read `IN 2H 19M` for a 23:00 tip-off
  (that is the Wed 20:41 clock). The Nuggets play the Pelicans at 23:00 and the Grizzlies at 01:00 on the same night.
  The slate is the same on Wed and Sat. None of this matters to the owner, but it shows the mocks are not built from
  one consistent scenario, which SPEC 0 claims.

### 5. The empty boxes at the bottom of the first screen (`home-live`, `home-pre`, `home-morning`, `home-evening`, `home-card-menu`, `home-offline`).
D3 plus the PEEK rule ("a peeking row shows art only") make the NBA row's peek three blank rounded rectangles: a game
card has no art, so with its text hidden it has nothing. Those boxes are the last thing on six of eleven first screens,
and they read as skeletons, as if Home were still loading. This also undoes UI-SPEC v1.2 item 4 ("the second row shows
art, tile, LIVE, number and the title"), which a previous review asked for.
**Change:** for game cards, let the peek keep the crests and the 4 px team edges (they are art) and hide only the text.
Or move the row up 12 to 16 px so the status line (`IN 2H 19M · ESPN`) shows whole. The same goes for poster peeks:
they are fine, because posters are art.

### 6. The game billboard is not "next level" (`home-live`, `home-pre`, `home-morning`).
This is the screen he will see most (game nights and mornings after, several times a week). Compared with today's hero,
it is the same broadcast graphic stretched to full width, on a flat bg-1→bg-0 ramp with no picture. The largest,
brightest object on screen is the pink→orchid slab (about 330 × 208 px, around 13 % of the panel). Three things follow:
- it out-shouts the focused primary button, which is drawn in the same gradient. RESEARCH 2.7 says "the focused thing
  is the biggest, brightest thing", and Apple's "a static image must not imply it is interactive" applies;
- on the OLED in Vivid it is a large, saturated, static block in the same place every game night;
- the score, the reason for the screen, is smaller than the slab's clock.

The billboard also carries almost no fan content: W-L only, no standing, streak, last-meeting, leaders or injury line.
The data is in `league.js` (standings, leaders, schedule, copied at tip-off for the shield).
**Change:**
- Take D2's own fallback: the slab ≤ 26 % ending at x 912 with the rounded corner, which also brings it back inside
  BRAND.md's rule.
- Give the freed width to the plates and a bigger score, and add one shield-safe context line under the plates, for
  example `4th in the West · W3` before tip-off (copied at tip-off when shielded), or the two teams' leaders' season
  lines.
- Consider a team-coloured field behind the away and home sides, split at 12° like the replay card, so the billboard
  has a "picture" made of the brand's own allowed material.

### 7. "Q2" reads as "02" (`home-live` slab).
In Barlow Condensed 800 italic at 60 px, the Q's tail is a tiny notch, so at 3 m `Q2 / 4:12` reads as `02 / 4:12`, like
a clock. **Change:** use `2ND` (Barlow caps) over `4:12`, or `Q2` set in Outfit, or the period as the caption
(`2ND QUARTER · SYNCED`).

### 8. Live NBA cards on Home lose one-press tuning (SPEC 6, OK on a game card).
Today the other live games lead On now and OK tunes them. In v2 the NBA row follows "the hub's rule": OK opens the game
page, and watching takes Watch live there or a hold menu. On game nights the owner flips between games, and H-P5 only
counts reaching a card, not watching it. **Change:** on a *live* game card on Home (not shielded), make OK =
`Watch live` on `bestChannel` and hold = the game menu (`Game page` first). Or, if consistency with the hub is
preferred, put the change in the hub too and state the press count for "watch another live game" (today 1, v2 3+).

### 9. The billboard and row 1 are cramped together (every unscrolled mock).
The buttons end at y 286 with the ring at about 291, and the row-1 title starts at y 298, so the ring nearly touches
"Continue watching". The billboard has about 40 px of dead space between the progress bar (y ~202) and the buttons
(y 242) instead, so the air is in the wrong place. **Change:** let the column flow (as the detail page does since v1.2),
with buttons 16 px under the last text line and the row-1 title at least 20 px under the ring. Or keep the fixed slot
and move the buttons to y 228.

### 10. The scrolled Channels row leaves 60 % of the screen empty (`home-channels`).
The focused-row-at-y-84 rule puts the last row at the top with nothing under it, and this is the row the owner will
land on whenever he goes looking for a channel. **Change:** clamp the lift at the end so the last row sits at the bottom,
with the previous row above it, or let Channels show two lines of cards (favourites, then recent).

### 11. Hold-OK menu over the page, with no dim (`home-card-menu`).
The menu for The Long Take is drawn over the billboard's `Start over` button and over the replay card next to it. The
billboard's gradient `Resume` stays fully bright, so two "Resume" controls compete, the vivid one being the one without
focus. **Change:** a bg-0 dim at about 60 % under every hold menu on Home, and anchor the menu to its card (below or
above it) without covering the billboard primary.

### 12. Performance assumptions that are not true of the codebase (SPEC 9).
- "The native layer (`shouldInterceptRequest` → Coil) sizes them". There is no interception and no Coil in
  `android/app/src/main/java`. `sized()` only rewrites TMDB URLs. Provider posters (often full-size panel JPGs) and the
  Cinemeta / metahub backgrounds load at full size. That is a new native feature, not "size hints", so it needs a
  scope, a PORT-NATIVE note and a test. In the meantime, use metahub's `/medium/` and `/small/` paths and TMDB `w780` /
  `w342` for the billboard and the cards.
- "At most 3 rows mounted": every ▼ mounts a row (8 cards and images) and unmounts one. home.js already notes a Home
  redraw costs 100 to 200 ms on this TV, so with auto-repeat ▼ this will stutter. **Change:** keep every row mounted
  (10 × 8 cards is well under 1 k nodes), use `content-visibility:auto` or `visibility` off-screen, and lazy-load images
  only.
- "The billboard unmounted when scrolled" (audit BAR): coming back up re-decodes a 1920 × 600 image. Hide it, don't
  unmount it.

### 13. The language order contradicts the scenario (`home-scrolled`, `home-discover`, `home-first`).
SPEC 0 says the languages are Icelandic then English. Row 5's subtitle is defined as "the languages setting's first
name", which would be "Icelandic first", but every mock reads `Popular this week · English first`. Either the scenario
or the rule is wrong. For an Icelandic owner whose provider has few Icelandic titles, "Icelandic first" as the Top
picks rule would empty the row of most of what he watches. **Change:** decide it with the owner, then fix the string
rule and the mocks.

### 14. Offline (`home-offline`).
- The pill sits on the row-title line at the right, over the peeking cards, where it reads as part of the NBA row.
- `Resume` stays focused and primary although a stream cannot play offline, and SPEC 7's "everything still opens what
  is cached" over-promises (only pages are cached, not video).

**Change:** put the pill top-right beside the avatar (the bar is visible when unscrolled), and caption the billboard
`Needs a connection to play`. Keep Resume focused (it leads to the diagnosis card), but say so in the spec.

### 15. Smaller copy and spec issues.
- **The episode name is missing.** The evening billboard shows `S1 · E3 · NIGHT CIRCUIT` over the title `Night Circuit`,
  so the series name appears twice and the episode's own name never appears. SPEC 3.3 says the series goes in the
  eyebrow "when the title line is the episode's name". **Change:** title = series (or logo), meta = `S1 · E3 · "Episode
  name" · 21 min left`.
- **Odd eyebrows.** `ANIMATION · 4,812 FILMS ON YOUR PROVIDER` (`home-first`) is a meaningless statistic. `MON 26 OCT
  · LATE` (`home-morning`) is jargon, and contradicts `home-discover`'s next-game card, which calls a 01:00 game
  `Sun 1 Nov` (the night rule would say Sat 31 Oct · late). Pick one rule.
- **Doubled day.** The next-game card says the day twice (`Sun` top-right and `Sun 1 Nov` below), and `Thu` /
  `Thu 29 Oct` likewise.
- **`NBA · NBA LEAGUE PASS 4`** in the live status row: drop the first `NBA`.
- **The eyebrow and the row title repeat.** The `CONTINUE WATCHING` eyebrow sits right above the `Continue watching`
  row title, while the billboard's item is missing from that row, which looks like the row lost its first item. Use
  `PICK UP WHERE YOU LEFT OFF` or `UP NEXT` for the eyebrow.
- **Back from a row** goes to the Home tab and not to the billboard's primary, so going back to "the thing you came
  for" takes Back then ▼. Consider Back → scroll to top and focus the primary, with a second Back to the tab.
- **Mocks missing:** Welcome / loading (3.5) is not mocked; neither are Up next (next episode), "Final, seen" or the
  M3U live-only Home (billboard + NBA + Channels, which may look very empty).
- **`Tell me when my team is live`** is in SPEC 8 but not in the settings mock.

## What is good, and should stay
- Continue watching is locked as row 1. Resume is two presses on a game day and one otherwise (H-P2 / H-P3 hold).
- One billboard, decided before first paint and locked. No rotation, no autoplay. The kind never changes under the thumb.
- Every row names its reason, there is no fake personalisation, and the day's pick is honest (unseen, his languages,
  rated, with a fixed seed).
- Account > Home rows: toggles, ordering, Continue watching pinned. This answers the owner's "it can be there but not at
  top" for every row, not just Channels.
- The shield is handled at the data layer (`videoMask`, `show`, `recordFor` before markup), and the morning-after
  billboard (`REPLAY / SCORE HIDDEN`, `Replays for 3 days`) is clear and spoiler-free.
- The poster rows (`home-scrolled`) are the best-looking part: captioned 2:3, 4K tag, the [tv] mark, a clean ring and
  lift.

## What I could not verify
- How real Cinemeta / TMDB backdrops look under the scrims, and the slab's brightness on the 55OLED810 in Standard and
  Vivid. The art is procedural; BRAND-CHECK lists the same open item.
- Frame times. Nothing is built; the performance comments come from the code (`home.js`'s own redraw note, `util.js`
  `sized`, the Android sources).
- Whether the owner's provider's Xtream episodes carry an `added` field, and how many Icelandic titles or tags it has.
