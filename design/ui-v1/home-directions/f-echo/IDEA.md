# Direction F: Echo

**The idea.** Home is a row of tall leaves standing across the whole screen, edge to edge, like a folding screen or a
shelf of books seen from the front. One leaf is open: it is 540 px wide and 540 px tall, and it holds the real picture,
the show's own logo, one line that says where you are, and one button. The other five stand folded beside it as
spines 84 px wide, each a strip of its own artwork with its name running up the spine (`Slow Horses · New · S6 · E6`,
`Blade Runner 2049 · Film · ends 23:27 · 4K`, `Grizzlies at Blazers · NBA · Thu 02:00`, `Kastljós · On now`,
`Library · 4,812 films`). Press Right and the next leaf opens where it stands while this one folds; nothing scrolls,
nothing reorders, the six things that matter tonight are always all on screen, and the one you are on is the size of
the screen. The spines step back from the open leaf, each a shade darker than the last: the open leaf is the wedge of
the airglow mark and the spines are its echo bands. On game night the game is the open leaf, the two teams' fields
cut by the 12° split with the crests big and the clock on the gradient, and the rest of the evening waits folded
beside it. Press Down and tonight folds into a strip at the top while the library's shelves stand as leaves below,
the same idea one level down.

**What makes it unique.**
- **Everything is on screen, and still only one thing is big.** Rows hide what is off the edge; a list (A) keeps
  the pictures to one; a wall (B) has nothing big. The leaves give the whole plan for tonight in six pictures you
  can read from the sofa, *and* a full-height picture for the one you are on. Nothing on Home ever scrolls.
- **It opens in place.** The leaf you choose grows where it stands and its neighbours fold, like a folding screen:
  a motion no TV home has, cheap to draw (left and width on six boxes, the art clipped, never scaled), and the kind
  of thing you press Right and Left just to watch. The fold also makes Down obvious: a leaf is a door, and you walk
  through it into its shelf.
- **Spines, not captions.** A folded leaf is named along its edge, in the show's own colours and artwork, like a
  book on a shelf. The name is the only text; the picture is the rest. The game's spine is its team's navy with the
  two crests, the channel's spine is the provider's logo, the Library's is a stack of posters.
- **The brand is the layout.** The open leaf and the stepping spines are the mark's wedge and its echo bands, drawn
  with the evening's own pictures; the name *echo* is the mark's story (a signal and its afterimage).
- **Game night is a leaf, so it is a mode without being a takeover.** The game owns the big leaf and the top bar's
  LIVE pill; the spines take the team's dark; Severance, Slow Horses, a short episode and the other live game are
  one press away, visibly, and when the game is over they are what Home is.

**How the remote moves.**
- Left / Right: the next leaf opens in place and this one folds (320 ms, `--a-ease`; left and width on the six leaves,
  the art stays put and is clipped, the text of the opening leaf fades in). The focus is the open leaf's one button
  (`Resume`, `Play`, `Watch live`, `Tune`, `Open`), which wears the ring.
- OK: that button. Hold OK: the leaf's menu (Start over, Details, Save; Reveal score on the game).
- Down: through the leaf into its shelf. Tonight folds into a strip of six chips at the top (y 84–126, the leaf you
  came through outlined in pink) and the library's shelves stand as leaves below: from the Continue leaf, Your shows;
  from the film, A film for tonight; from the game, Tonight in the NBA; from the channel, the guide; from the
  Library, the doors. In a shelf leaf Left / Right move along its posters (the ring is on the poster, the leaf's
  picture and logo answer it) and the next shelf opens when you run off the end or press Right from the last poster;
  Up from the posters, or Back, unfolds tonight.
- Up from the open leaf's button: the top bar, as everywhere.
- The leaves have a fixed order and cap: continue · new in your shows · a film for tonight · the game · on now ·
  library. Empty ones are left out (five leaves make the open one 624 wide). Game night puts the game first and adds
  a short episode and the other live game. Nothing moves while you are looking at it; the order changes only between
  visits.

**The screens.**
1. `evening.html`: Wed 28 Oct 20:41. Open: **Severance**, the show's backdrop cropped tall (the office on his head),
   `CONTINUE WATCHING`, the logo in chalk, `S2 · E3 · Who Is Alive? · 21 min left · Ends 21:03 · 4K`, the episode's
   line, the progress bar, `▶ Resume` focused, `▼ Episodes`, `Hold Start over, Details`. Spines: Slow Horses (the new
   dot, `New · S6 · E6`), Blade Runner 2049 (`Film · ends 23:27 · 4K`), Grizzlies at Blazers (Memphis navy, both
   crests, `NBA · Thu 02:00`), Kastljós (`RÚV`, `On now · until 20:55`), Library (four posters, `4,812 films ·
   1,210 series`).
2. `gamenight.html`: Thu 03:12, Grizzlies at Lakers live, 2nd quarter, shield on. Open: the Memphis field and the
   Lakers field cut at 12° with their secondary edges, the crests in the neutral discs, `Grizzlies · 3-0 · as of
   tip-off`, `Lakers · 2-2`, the clock chip `2ND 4:12 · synced` and the `Score hidden` plate sitting on the band's
   edge, then on the dark band `GAME NIGHT · LIVE`, `Grizzlies at Lakers`, `2nd quarter · ESPN · 4K · Score hidden`,
   the fan line as of tip-off, `▶ Watch live` focused, `▼ From tip-off`, `Hold Reveal, more`. The bar's NBA tab wears
   the LIVE pill; the LIVE pills and the ring sit on the canvas and the band, never on a field. Spines: Severance
   (the episode's own still, `Continue · 21 min left`), Slow Horses, It's Always Sunny (`Short · S18 · E10 · 25
   min`), Nuggets at Thunder (Denver navy, `Also live · TNT`, no score), Library.
3. `browse.html`: Wed 20:43, Down through the film leaf. The strip of six chips at the top, Blade Runner 2049
   outlined; below, the shelf leaf **A film for tonight · 212 · ends before midnight** open: Blade Runner 2049's
   backdrop and logo, `2017 · 2h 44m · Ends 23:27 · 4K · HDR · IMDb 8.0 · Northlight`, two lines of plot, `OK
   Details · Hold Play now, Save · ▲ Tonight`, and its posters (Blade Runner 2049 ringed and lifted, Sinners, Dune:
   Part Two, Heat, Conclave, each with its copy's quality). Folded shelves: Popular on Cinemeta, New this month,
   Á íslensku (38 films · 6 series), In 4K (412 films), Saved (12), each a strip of one of its posters.
4. `sideways.html` (the extra screen, so the fold is understood): Wed 20:42, Right twice from screen 1. The film leaf
   is open in the middle of the row, Severance and Slow Horses folded on its left, the game, the channel and the
   Library on its right: `A FILM FOR TONIGHT · ENDS BEFORE MIDNIGHT`, the logo, the meta, the plot, `▶ Play`, `▼ More
   for tonight`, `Hold Details, Save`.

**Only data the app has.** Continue watching with progress, episode names, lines and stills (Cinemeta `videos`),
the next episode of followed shows, runtimes for `Ends` (Cinemeta `runtime`, the ratings file), quality per copy
(4K / HDR when checked) and the add-on's name, the guide's programme titles and times (no programme art: the channel's
spine is its logo on a flat field), the NBA slate, records as of tip-off under the shield, the game clock, Cinemeta
backgrounds, logos and posters by IMDb id, ESPN crests, the catalog's counts. The titles, episodes, runtimes and
ratings are real (Cinemeta, 28 Oct 2026); the games, the channel line-up and the add-on `Northlight` are the
home-v2 timeline's stand-ins.

**Brand.** airglow's Soft identity throughout: the canvas and bg-1, chalk and the text tokens, Outfit 700 for the
spines and titles, Inter for the lines, the gradient only on the one button, the progress bar, the clock chip and the
avatar, the 5 px white ring with its canvas gap on the button and the poster, radius 10 posters, the mark and the tabs
unchanged. The Sharp dialect (12° fields, the skewed chip and plate, Barlow Condensed italic for the clock) appears
on the game leaf only. One new thing argued: **the spine**, a folded leaf 84 px wide named along its edge in Outfit 700
22 (sideways, read bottom to top) with a 13 px caps line beside it; it is the one place the brand's text runs
vertically, and it is what makes the row read as leaves and not as a grid of thumbnails. Black logos (Severance) are
drawn in chalk, as the detail page does.

**Against A.**
- Where Echo is better: A shows one picture and five names; Echo shows six pictures and still gives the chosen one
  540 × 540 px of real art, so the plan for tonight is read as artwork, not as a list, and the thing you are not on is
  still a thing you can see. The open-in-place fold is a signature motion A does not have, and it makes Down (into a
  leaf) and the library (leaves again) one idea instead of two layouts. Game night in A is the lineup entry wearing a
  plate against a whole-screen field; in Echo the game is a leaf like any other, so the mode is strong without the
  evening's other things going grey beside it. Echo's spines carry their own colour (team navy, the provider's logo,
  the posters), where A's list is text on a scrim.
- Where A is still better: A's picture is wider (960 × 540 against 540 × 540), so a landscape backdrop is shown as
  the artist framed it, while Echo crops every backdrop to a tall square and depends on a good focal point (`object-
  position` per title; a group shot or a wide landscape loses its sides). A's six lines are faster to read than six
  spines: horizontal text at 26 px beats sideways text at 22 px, and the spines' second line is at 13 px, which is a
  badge size used for a sentence (the fix is 14 px and shorter copy). A's screen is quieter: one picture and type;
  Echo's row of strips can get busy when every spine is a face, which the step-back veil has to hold. And A's lineup
  can hold six entries with room to spare, while Echo is capped at six leaves before the spines get too thin.

**Risks.**
- **The fold has to be smooth.** Six boxes change left and width over 320 ms; the pictures do not scale (they are
  clipped at open size), the text of the opening leaf fades in after the fold. On a weak panel the fallback is a cut
  with a 200 ms opacity crossfade. Measured on the TV before it ships.
- **Tall crops.** Every backdrop is cut to 540 × 540 from 16:9. The app needs a focal point per title: Cinemeta has
  none, so the rule is the poster's colour as a flat ground when the backdrop's subject sits at an edge, and
  `object-position` from a small face/contrast scan of the 32 px copy (the same scan home-v2's ambient colour uses).
- **Sideways text.** Outfit 700 at 22 px sideways reads from the sofa (it is 44 px on the panel), but a long name
  (`Grizzlies at Trail Blazers`) is shortened (`Grizzlies at Blazers`) and the spine's second line at 13 px is under
  the 14 px floor; both are copy rules, not layout changes.
- **Only six on screen.** Everything else is one Down away, and the `Library` leaf is always the last spine so the
  door is never hidden. The leaf order is a setting (Account > Home), as home-v2's rows are.
- **Strips of faces.** Six pictures side by side could be noise; the veil (bg-0 .34 to .95 down the spine), the
  step-back (0 to 32 % darker per leaf away from the open one) and the top scrim for the bar keep the open leaf the
  only bright thing. If a spine's art fights its name, the spine falls back to the poster's colour.
- **Performance:** one container for the row, six `<img>` at open size with `data-src` for the spines beyond the
  next, the fold on `left` and `width` only, no filters, no blur; the game leaf's clock is a named node updated with
  `textContent`.

**Files.** `evening.html`, `gamenight.html`, `browse.html`, `sideways.html` (960 × 540, linking the app's `fonts.css`
and `tokens.css` plus `echo.css`); `png/*.png` at 1920 × 1080; `art/` the Cinemeta backgrounds, logos, posters and
episode stills and the ESPN crests used (`severance-logo-chalk.png` is Cinemeta's black logo filled chalk);
`tools/render.js` (Playwright, `NODE_PATH=$(npm root -g) node tools/render.js`).
