# Direction A: Marquee

**The idea.** Home is a cinema marquee for one person. Down the left, in big letters, is tonight's lineup: the thing
you are in the middle of, what is new in your shows, the game, a film that fits before bed, what is on now. There are
no rows and no cards on the first screen. Whatever you point at owns the whole picture: the title's real backdrop fills
the screen, its real logo lights up in place of its name, and one line under it says where you are and when it ends.
OK plays. Right opens that entry's shelf. Down past the last entry walks into the library, one shelf at a time, where
the picture keeps answering the poster you are on. On game night the picture is the two teams: the away field and the
home field cut by the one 12° split, the crests big, the clock on the gradient, the score hidden where the score would
be.

**What makes it unique.** Every other TV home is a billboard over rows of thumbnails. The Marquee has a *list and a
picture*: the list is the whole plan for tonight in six lines you can read from the sofa, and the picture is one
full-screen piece of art at a time, never a grid. The focused name turns into the show's own logo (Cinemeta's), so the
marquee "lights up" as you move. Every entry says why it is there in the same breath as its name (`Slow Horses · New
this week · S6 · E6`, `Heat · A film for tonight · ends 23:33 · 4K`), so there is no "Recommended for you" row to
decode. Game night is a mode: the whole screen takes the two teams' colours, the lineup entry wears the Sharp 12°
plate, and the rest of tonight waits underneath in the same list.

**How the remote moves.**
- Up / Down: through the lineup, one entry per press; the picture, logo and line change with the focus (a 200 ms
  crossfade on opacity; no layout change, the entries are the same height until focused, and only the focused one
  grows).
- OK: the entry's one action (Resume, Play, Watch live, Tune). Right: the entry's shelf (Episodes, From tip-off and
  the other replay actions, the film shelf, the channel's guide). Hold OK: the card menu (Start over, Details, Save,
  Reveal score).
- Down past the last entry: the library. The lineup leaves upward and the picture stays. Left / Right along the shelf;
  Up / Down between shelves (the right-hand list names them: `A film for tonight`, `Popular on Cinemeta`, `New this
  month`, `Á íslensku`, `In 4K`, `Saved`, `Everything`); Back or Up from the first shelf returns to the lineup.
- Up from the first entry: the top bar, as everywhere in the app.

**The three screens.**
1. `evening.html`: Wed 20:41. Lineup: **Severance** (Continue · S2 E3 "Who Is Alive?" · 21 min left · Ends 21:03 ·
   4K · the episode's line), Slow Horses (New this week · S6 E6), Breaking Bad (Up next · S3 E7), Heat (A film for
   tonight · ends 23:33 · 4K), Grizzlies at Trail Blazers (Thu 02:00), Kastljós (On now · RÚV · until 20:55). The
   picture: Severance's backdrop. Bottom right: `↓ Library · 4,812 films · 1,210 series`.
2. `gamenight.html`: Thu 03:12, Grizzlies at Lakers live, 2nd quarter, shield on. The picture is the Memphis field
   (navy, Beale Street blue edge) and the Lakers field (purple, gold edge) cut at 12°, the crests in the neutral disc
   with `Grizzlies · 3-0 · as of tip-off` and `Lakers · 2-2`, the clock chip `2ND 4:12 · synced` on the gradient and
   the `Score hidden` plate at the split. The focused entry is the Sharp plate: `GAME NIGHT · LIVE`, `2nd quarter ·
   ESPN · 4K · Score hidden`, the fan line as of tip-off, `OK Watch live · ▸ From tip-off · Hold Reveal, more`. The
   LIVE pills sit on the canvas and the dark plate, never on a team colour. The rest of the lineup waits below
   (Severance, Slow Horses, a short episode of Always Sunny, the other live game).
3. `browse.html`: Wed 20:43, Down past the lineup. The shelf `A film for tonight · 212` (fits before midnight, best
   copy first): Sinners focused and lifted, its backdrop and logo on the picture, `2025 · 2h 18m · Ends 23:01 · 4K ·
   HDR · IMDb 7.5 · From Northlight`, two lines of plot, `OK Details · Hold Play now, Save`. Each poster carries its
   copy's quality and the time it would end. The other shelves are listed at the right; a seventh poster peeks.

**Only data the app has.** Continue watching with progress, episode names and lines (Cinemeta `videos`), the next
episode of followed shows, runtimes (Cinemeta `runtime`) for `Ends`, quality per copy (4K / HDR when checked), the
add-on's name, the guide's programme titles and times, the NBA slate, records as of tip-off under the shield, Cinemeta
backgrounds and logos by IMDb id, ESPN crests. No programme art for channels (the channel entry is text only).

**Brand.** airglow throughout: the Soft identity (round plates, the pink-to-orchid gradient only on the progress bar,
the clock chip and the avatar), the tabs and mark unchanged, chalk on the canvas, Outfit 700 for the lineup, Inter for
the lines, Barlow Condensed 800 italic only for the clock. The Sharp dialect (the 12° plate, the split fields) appears
on game night only, which gives the slant its meaning: live. One departure argued: the focused lineup entry is a text
block with the focus ring around it, not a button; it is the one focused thing and its ring is the same 5 px white
ring with the 2 px canvas gap.

**Risks.**
- The logo swap depends on Cinemeta having a logo; without one the entry's name stays in Outfit 700 at 38 px (shown
  for the game, which has no logo). Logos vary in shape: capped at 46 px high and 320 wide, left-aligned.
- Six lines at 26 px is the most the lineup can hold above the safe area; a seventh entry means a smaller focused
  block. The lineup therefore has a fixed order and cap (continue, new, up next, a film, the game, on now) and hides
  what is empty.
- Backdrops with the subject on the left fight the lineup's scrim; the app should prefer `object-position` from the
  art's focal side, or fall back to the poster's colour as a flat ground.
- The whole-screen team colours on game night are loud by design; the lineup side is darkened to the canvas so the
  text keeps 4.5:1. A red opponent gets the clash rule from Home v2 (the opponent's field goes neutral).
- Performance: one `<img>` for the picture (swapped on focus, the next entry's art preloaded), one container for the
  lineup, text only; nothing re-lays out on a focus move except the focused entry's height.

**Files.** `evening.html`, `gamenight.html`, `browse.html` (960 × 540, link the app's `fonts.css` and `tokens.css`
plus `marquee.css`); `png/*.png` at 1920 × 1080; `art/` the Cinemeta backgrounds, logos and posters and the ESPN
crests used; `tools/render.js` (Playwright).
