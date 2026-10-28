# Direction E: Compass

**The idea.** The screen is the remote. The remote has a ring with four arrows and OK in the middle, and so does Home:
in the middle, one big framed picture of the thing to do now (OK plays it); on each side, the next frame, standing at
the edge like the walls of a room you are in the middle of. Up is always **NBA**, Right always **Movies**, Down always
**Live**, Left always **Series**: the app's four big tabs become four directions. One press in any direction lands on
tonight's best pick of that kind (the game, a film that ends before bed, what is on now, the new episode), and each
wall says what it is in a signpost with the arrow key printed on it. Keep pressing the same way and you walk that road:
the films for tonight one by one, and at the end of the road the Movies page itself. Out on a road, Up and Down step to
the neighbouring shelves (Popular on Cinemeta above, Á íslensku below), and Back brings you home to the middle. A small
map in the corner shows where you are on the cross. On game night the room turns to the game: the middle frame is the
two teams at the 12° split, the ceiling is "from tip-off", and the walls and floor carry the rest of the night.

**What makes it unique.**
- **Muscle memory instead of reading.** Every other home asks you to read rows or a list to find the game. Here the
  game is always one Up away, a film always one Right away, from the first night on. After a week he can press
  `▲ OK` in the dark without looking. No other TV home gives each arrow a fixed meaning.
- **Five pictures, one choice, no rows.** The middle frame is a real Cinemeta backdrop with its logo lit up (A's best
  trick), and the four walls are four more real pictures, foreshortened, so the whole of tonight is on the first screen
  as art, not as six lines of text and not as a grid.
- **A room, not a page.** The four neighbours stand in real CSS 3D perspective around the frame you face (ceiling,
  floor, two walls), lit from the middle and falling off into the dark. Moving is the room turning by one frame. The
  Live floor is the guide itself, its programme cells laid out on the floor with the now-line.
- **Home is also the app's map.** The tabs are the four roads, so Home does not compete with Movies or Series; it is
  the junction they all start from. The top bar's tabs leave Home (Back opens the bar: Search, Saved, Account and the
  tabs), which is the one argued change to the app chrome.
- **Browsing is walking.** The same view works everywhere: whatever you are on is the big frame, its four neighbours
  are the walls. A shelf is a road, the next shelf is the next road over, and the signposts count (`2 of 212`,
  `4 of 212`).

**How the remote moves.**
- From the middle: ▲ NBA road, ▶ Movies road, ▼ Live road, ◀ Series road. OK: the middle frame's one action (Resume,
  Watch live). Hold OK: its menu (Start over, Episodes, Details; on the game, Reveal score with the confirm, Game page).
- On a road: the same arrow walks on (one frame per press; held, it runs and the signposts count up), the opposite arrow
  walks back toward the middle, the two side arrows change shelf (lanes run parallel, so ▲ then ▼ comes back to the same
  place). The last frame of every road is its section (Movies, Series, the guide, the NBA tab), opened with OK.
- Back: from a road, home to the middle (in one press, the map remembers where you were on each road); from the middle,
  the top bar slides in. Back again leaves the app as today.
- One focused thing, always the middle frame, with the app's 5 px white ring and 2 px canvas gap. The walls are never
  focused; they are where the arrows go.
- The map moves as one transform (the camera slides one frame, 280 ms on `--a-ease`); the walls are the same five
  elements re-filled, so nothing re-lays out. `data-key` keeps the place on each road.

**The three screens.**
1. `evening.html`, Wed 28 Oct 20:41. Middle: **Severance**, its backdrop and chalk logo, `NOW · Continue watching`,
   `S2 · E3 Who Is Alive?`, `21 min left · Ends 21:03 · 4K · HDR · Northlight`, the progress bar, `OK Resume · Hold Start
   over, Episodes · Back Search, Saved`. Ceiling (▲ NBA): the Memphis and Portland fields with their crests, `Grizzlies at
   Trail Blazers · Thu 02:00 · ESPN`. Right wall (▶ Movies): Heat's backdrop and logo, `Ends 23:31 · 4K`. Left wall
   (◀ Series): Slow Horses, `New · S6 · E6`. Floor (▼ Live): the guide's cells and now-line, `Kastljós · RÚV · on now,
   until 20:55`. The map in the corner: you are in the middle.
2. `gamenight.html`, Thu 29 Oct 02:41, Grizzlies at Trail Blazers live since 02:00, shield on. The whole room takes the
   teams (Memphis navy, Beale Street blue edge; Portland black, red edge). Middle: the two fields at the 12° split, the
   crests big, `GAME NIGHT · LIVE`, `Grizzlies at Trail Blazers`, `ESPN · 4K · tip-off 02:00, 41 min ago`, the `Score
   hidden` plate on the split, `OK Watch live · Hold Reveal, Game page`. Ceiling (▲ NBA): `From tip-off · the same game,
   from 02:00 · no score`. Left (◀ Series): a short one for the breaks, It's Always Sunny `S18 · E10 · 22 min`. Right
   (▶ Movies): The Big Lebowski, `1 h 02 min left`. Floor (▼ Live): the other game on now, Nuggets at Thunder on TNT, in
   their own colours. No score, record, period or game clock anywhere; `41 min ago` is the wall clock.
3. `browse.html`, Wed 20:43, three presses Right: the Movies road `For tonight` (films that end before midnight, best
   copy first), `3 of 212`. Middle: **One Battle After Another**, `2025 · 2 h 42 min · Ends 23:25 · 4K · HDR · IMDb 7.6`,
   its real plot line, `OK Details · Hold Play now, Save · Back Now`. Left: Sinners `2 of 212 · Ends 23:01`. Right:
   Weapons `4 of 212 · Ends 22:52`. Ceiling: the next shelf up, `Popular on Cinemeta · Spider-Man: Brand New Day · IMDb
   8.0`. Floor: the next shelf down, `Á íslensku · Godland · 2 h 23 min · ends 23:06`. The map shows the Movies road
   running right from the middle with its lanes, the pink square three along.

**Only data the app has.** Continue watching with progress, Cinemeta episode names, runtimes (for `Ends`), ratings and
plots, backgrounds and logos by IMDb id, the next and new episodes of followed shows, quality per copy (4K / HDR when
checked), the add-on's name, the provider and Cinemeta catalogs and their counts, the guide's titles and times (the floor
is drawn from the guide's own cells; no programme art is invented), the NBA slate, ESPN crests, team colours. The Live
road's channel frames are the guide's row, never fake art. Scenario facts (not in the repo's data): the 2026-27 games and
times, the channel `ESPN`, the add-on `Northlight`, the counts 212 and the RÚV programme, kept the same as A–D.

**Brand.** airglow throughout: the canvas and surfaces, chalk text, Outfit for names, Inter for facts, the gradient only
on the progress bar, the now-line, the avatar and the "you are here" square; LIVE pills only on dark plates; the 12°
Sharp split only on game frames (so the slant still means live). The room's falloff is a two-stop gradient per wall
(no blur, no glow sprites). Two argued departures: (1) the tabs leave Home's top bar (the mark, clock and account stay;
Back brings the full bar), because on Home the four tabs are the four arrows; (2) the depth: the neighbours are drawn in
3D perspective, the one place the app uses it, so the junction feels like a place.

**Against A.**
- *Where Compass is better.* Every kind of evening is one press and has a fixed direction, so it gets faster with use;
  A asks him to read and scroll a list every time, and the game moves around in it. The first screen shows five real
  pictures, where A shows one picture and five names. Browsing is the same view and the same gesture as Home, with a
  count, where A switches to a poster shelf. The tabs and Home stop being two ways to the same places. Game night keeps
  the rest of the night in the same four places.
- *Where A is still better.* A's backdrop fills the whole screen; Compass's middle frame is two-thirds of it, so A is
  more cinematic at a glance. A lists six things with the reason for each in one read; Compass shows five with less text,
  and the walls' text sits in a narrow column. A has one axis to learn; Compass has the cross plus lanes, and lanes
  (Up on the Movies road is not NBA) must be learnt. A changes nothing in the app's chrome; Compass removes the tabs from
  Home's top bar. A is less new code.

**Risks.**
- **The rule "Up is NBA" vs "Up goes to the top bar".** Compass breaks the app-wide Up-to-the-bar habit on Home only;
  Back opens the bar instead. If that feels wrong, the fallback is a "T" (Up = bar, NBA on the floor) at the cost of the
  cross.
- **Lanes off the middle.** On a road, Up and Down change shelf, not road. The map and the signposts (`Popular on
  Cinemeta ▲`) say so, but it needs a test with him. A simpler variant: roads have no lanes and the road's end is the
  section page.
- **3D on the TV's WebView.** Four `rotateX/Y` frames in one `perspective` container are cheap (no `preserve-3d` chains,
  no filters), but must be checked on the Philips panel for jaggies on the far edges; the 2D fallback is the flat
  version (the frames side by side, only their edges showing), which already reads as a map.
- **Wall text space.** The left and right walls give 80 px of safe area: a logo, the road, one fact on two lines. Long
  logos are capped at 80 px wide; titles without a logo use Outfit 17 px on two lines.
- **Fixed directions with empty roads.** On a night without a game the NBA road still exists (next game, standings as
  of last seen, News); with no new episodes the Series road starts at Up next. A road is never hidden, or muscle memory
  breaks.
- **Black Cinemeta logos** (Severance) are baked to chalk once (`filter: brightness(0) invert(.95)` in the mock).

**Files.** `evening.html`, `gamenight.html`, `browse.html` (960 × 540, linking the app's `fonts.css` and `tokens.css`
plus `compass.css`); `png/evening.png`, `png/gamenight.png`, `png/browse.png` at 1920 × 1080 and
`png/contact-sheet.png`; `art/` the Cinemeta backgrounds and logos and the ESPN crests used; `tools/render.js`
(`NODE_PATH=$(npm root -g) node tools/render.js`) and `tools/contact.js`.
