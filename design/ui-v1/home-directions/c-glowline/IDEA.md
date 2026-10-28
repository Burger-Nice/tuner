# Direction C: Glowline

**Home is tonight, laid out on one line.**

## The idea

Airglow is the faint band of light that sits along the horizon at night. In this direction it is the whole Home
screen. The top two thirds is one full-bleed picture: the real artwork of whatever is in focus. Across the bottom
runs **the Glowline**, tonight on a time line that starts at *now*. On it sits his evening, already put together
from things he really has: the episode he's halfway through, the next one, a film that ends before he usually goes
to bed (or before tip-off), and a new short episode of a show he follows. Every block shows the time it starts, so
Home answers the question he actually has on the sofa, which is not "what's on this service" but **"what am I
doing tonight, and when does it end?"** On game nights the line is built around the tip-off: it fills the wait
with things that finish in time, then turns into the game itself, with two ways in (from tip-off, or live) and the
score kept off the screen. Press ▼ and the line folds into a thin strip at the top while the shelves open below,
so tonight stays in sight while he browses, and any title can be added to tonight with one long press.

## What makes it unique

- **A plan, not a pile.** Netflix, Apple TV and Google TV all give you rows. None of them tells you that if you
  resume now, finish the next episode and then start the film, you'll be done at 23:52. The Glowline does,
  using data the app already has (runtimes, progress, the clock). For someone who stays up for 01:00 tip-offs from
  Reykjavik, the end time is what decides the evening.
- **Game night is built around the time it starts.** Before the game: *"Game night · something to fill the
  wait"*, with every pick chosen to end at least 15 min before tip-off, the spare time shown as its own dashed
  block (`45 min to spare`), and the game sitting on the line in team colours with a countdown. During the game,
  the game is a block that runs across *now*: the part already played is shaded, a red now-line runs through it,
  and the two ways in sit on the block where they happen in time (`From tip-off` at its left edge, `Watch live`
  at the now-line). Replay and live become two points in time you move between with ◀ ▶.
- **The art is the real art.** The backdrop is the scene itself: the episode's own still from Cinemeta (TMDB's
  w1280), not a series poster. When the focused block is a film, it's the film's backdrop and logo. On game
  night it's the two teams' colours split at the brand's 12° live angle, with their crests.
- **Browsing feeds tonight.** On the shelves, the focused poster opens out into its backdrop with its logo, and
  under it is a tiny piece of Glowline: `Start now, ends 23:21 · HOLD OK Add to tonight`.
- **It's still airglow.** Dark canvas, chalk text, Outfit / Inter / Barlow, the white focus ring, and pink to
  orchid as the line itself. The one new brand move is the haze rising off the line, a single two-stop gradient
  band: the name "airglow" drawn literally. On game nights the line and its haze take his team's colours (Beale
  Street blue to gold), so the whole screen shows it's a Grizzlies night before he reads a word.

## How the remote moves

| Where | Key | What happens |
|---|---|---|
| Home opens | | Focus is on the first block of the line (`NOW`). Nothing else is focusable until he moves. |
| The line | ◀ ▶ | Moves along tonight, one block at a time. The focused block widens (the others stay roughly to scale) and the backdrop and hero text cross-fade to it (200 ms, opacity only). |
| | OK | Plays the focused block. If it's a later block, it plays now and the line re-plans from now. |
| | Hold OK | The block's menu: `Start over · Episodes · Details` (a show), `Something else here · Remove from tonight · Details` (a pick, marked `PICK`). |
| | ▲ | The top bar (it's dimmed on Home until then). |
| | ▼ | The shelves: the line folds into the strip at the top (screen 3). |
| The `+` at the end | OK | Add something after the plan's end: Saved, your shows, "fits before 00:30". |
| Game block, live | ◀ ▶ | Moves between its two stops: `From tip-off` and `Watch live` (the primary, focused first). |
| | Hold OK | `Reveal score` (with the one-step confirm the hub uses) · `Game page`. |
| Game block, before tip-off | OK | Game page. |
| Shelves | ▲ ▼ ◀ ▶ | Normal rows. ▲ on the first row, or Back, goes back to the line. |
| | Hold OK | `Add to tonight` (it goes into the line where it fits) · Details · Save. |

The block itself is the button (OK = the hero's primary action), so there is never a second focus target in the
hero. The hero shows a small key legend instead (`OK Resume · HOLD OK Start over · Episodes · Details`).

## The three screens (plus one)

1. **`1-evening`: a normal evening, Wed 28 Oct, 20:41.** He's in the middle of *Severance* S2 · E4 *Woe's Hollow*
   (31 min left, ends 21:12, 4K HDR from Northlight). The backdrop is that episode's still. The line: `NOW 20:41`
   Woe's Hollow (progress bar) → `21:13` E5 *Trojan's Horse* (`NEXT`) → `22:05` *The Invite* (Cinemeta Popular,
   107 min, `PICK`) → `23:55` *It's Always Sunny* S18 · E10 *The Guys Have a Sleepover* (`NEW`, 22 min) → `00:17`
   `+`. The header says `Wed 28 Oct · 3 h 36 min, until 00:17`.
2. **`2-game-night`: game night, Tue 27 Oct, 01:52. Grizzlies at Jazz, live, shield on, not started.** The stage
   is Memphis navy and Jazz purple split at 12°, with big crests, ghost crests, `GAME NIGHT`, and a skewed
   `SCORE HIDDEN · Shield on · My team` plate. No score, no game clock, no period, no records. The line in team
   colours: earlier tonight (`✓ 2`, dimmed) → the wait folded (`≈`) → the game block from `TIP-OFF 01:00`, the
   played part shaded up to the red now-line (`NOW 01:52`, `52 min since tip-off`, a wall-clock fact), `From
   tip-off` and the focused `Watch live` on it, `ends ~03:20` → `03:30` Suns at Lakers.
3. **`3-browse`: moving down, Wed 20:44.** The line has folded into a strip at the top (four thumbnails on the
   pink line, `20:44 → 00:17 ▲`). The focused row, `Popular this week` (Cinemeta): *Project Hail Mary* opened
   out into its backdrop and logo (`2026 · 2 h 37 min · ★ 8.2 · 4K HDR`), with `Start now, ends 23:21 · HOLD OK
   Add to tonight` under it. Its backdrop is the page's faint ambient light. Below: `Á íslensku` (*Godland,
   Touch, When the Light Breaks, Lamb, Rams, Woman at War, Jar City, Of Horses and Men, The Deep*), and the next
   row peeking as art only (horror, popular the week of Halloween).
4. **`4-game-night-before` (extra, the signature moment): Tue 27 Oct, 21:52, tip-off at 01:00.** `GAME NIGHT ·
   SOMETHING TO FILL THE WAIT`. The focused pick is *Halloween* (1978, 1 h 31 min, ★ 7.7, ends 00:15, `45 min
   before tip-off`). The line: `NOW 21:52` Woe's Hollow (`NEXT`) → `22:44` Halloween → `00:15` `45 min to spare`
   → the game block in team colours, `TIP-OFF 01:00 · in 3 h 08 min`. The bar's NBA tab carries the dot.

The four screens tell one story: on Tuesday he watched *Who Is Alive?*, started *Woe's Hollow* and stopped 18
minutes in (so Wednesday shows 31 min left), and the game was that night.

## How the line is built (all from data the app has)

1. **Slot 1:** Continue watching #1 (progress + runtime give `31 min left` and the end time); else a new episode
   that landed today; else a pick.
2. **Next:** the next episode of that show (Cinemeta `videos`), one block. If he binges a show, two.
3. **A pick to fill the evening:** Saved first, then films from the provider and Cinemeta Popular/Featured that
   have a copy he can play (the ranking in `copies.js`), in his languages, rated 7+, whose runtime ends before his
   usual stop time. That's learned from history (the median time he stops watching, ~00:30); on game nights, it
   has to end 15 min before tip-off. Runtime comes from the ratings file / `get_vod_info` / Cinemeta. A title with
   no known runtime is never a pick.
4. **Short before bed:** an unwatched episode under 30 min of a show he follows, if it fits.
5. **Game night:** the game is pinned at its tip-off. An empty stretch over 60 min folds into `≈` (live) or shows
   as a dashed `N min to spare` (before). Other games tonight (the NBA row's data) can follow it.
6. **Live channels** can be blocks too (the guide has titles and times, but no art, so the block uses the channel
   logo). Not mocked.
7. The plan only changes when he does something (plays, swaps, adds) or a block ends. It never shuffles on its
   own while he's looking at it. End times are named nodes updated each minute with `textContent`.
8. When a block ends in the player, the native end card says what's next on the line (`Next tonight: The Invite
   · ends 23:52`), so the line plays like an evening.

**Shield.** The game block never shows a score, clock, period, record or anything a result changes.
`52 min since tip-off` is the wall clock. **`ends ~03:20` is fixed at tip-off + 2 h 20 and never moves while the
shield is on**, because an estimate that stretched would give away overtime. The shaded part is wall-clock time
too. `Reveal score` is behind Hold OK with a confirm.

## Built how (TV WebView)

- Two stacked `<img>` layers for the backdrop, cross-faded with opacity. The neighbours' `/background/medium/`
  (or the episode's w1280 still) are loaded ahead. Scrims are layered two-stop gradients. No blur, no video.
- The line is one flex row of absolutely sized blocks. Widths are minutes × 2.6 px with a 96 px floor, and the
  focused block opens to about 240 px, so a whole evening (about 4 h) fits in the safe width.
- Dark Cinemeta logos (Severance's is black) get `filter: brightness(0) invert(.95)` once, or are baked to chalk
  on a canvas and cached.
- Game-night fields are flat team colours with grain (no gradients on the fields). LIVE pills sit on bg-0 / bg-1,
  never on a team field.
- Each mock is plain HTML on the app's own `tokens.css` + `ui.css` plus `glowline.css` (all classes new, no
  framework).

## Risks

- **It might feel presumptuous.** A planned evening can feel like the app deciding for him. To keep it light, only
  slot 1 is a sure thing; picks are marked `PICK` and swap with one long press; Account > Home gets
  `Tonight: Planned / Just what I'm watching` (the second keeps the line but drops the picks).
- **Short things get narrow.** A 22-min episode is a 96 px block with only its logo. The time under it carries the
  meaning. More than about six blocks won't fit, so the line stops planning around 4–5 hours ahead.
- **Wrong end times would break trust.** Runtimes have to be right (Cinemeta's are sometimes rounded or missing).
  Unknown runtime means no pick, and `Ends` is only shown when it's known.
- **Fewer things on the first screen** than a row-based Home. Everything else is one ▼ away (screen 3). That's on
  purpose (one big choice, not 40 small ones), but it should be tested against "I just want to see my shows".
- **Learning his stop time** needs a week of history. Until then the default is 00:30.
- **Episode stills are TMDB images found through metahub's redirect.** The w1280 size is a URL change; if it's
  missing, the series backdrop is used.
- The game-night stage with saturated fields could be loud on the OLED at night, so the fields stay flat and get
  darker toward the line.

## Files

- `IDEA.md`: this
- `1-evening.html`, `2-game-night.html`, `3-browse.html`, `4-game-night-before.html`: the mocks (960 × 540).
  Each has its facts in `<meta name="tl">`.
- `png/*.png`: the 1920 × 1080 renders; `png/contact-sheet.png` shows all four.
- `glowline.css`: the direction's CSS. `tools/render.js`: the renderer (`NODE_PATH=$(npm root -g) node tools/render.js`).
- `img/`: the real artwork used. Cinemeta / metahub posters (`poster_tt*`), backdrops (`bg_tt*`), logos
  (`logo_tt*`), episode stills (`ep_*` w780 for blocks, `still_*` w1280 for backdrops), and ESPN crests
  (`team_*.png`, `team_utah_dark.png`).

The titles, episodes, runtimes, ratings and descriptions are real (Cinemeta, fetched 28 Oct 2026). The game data
are stand-ins: the 2026-27 slate isn't in the repo, so the Grizzlies at Jazz at 01:00, the channel `NBA League Pass
4`, the add-on `Northlight` and Suns at Lakers at 03:30 are scenario facts, kept the same as home-v2's timeline.
