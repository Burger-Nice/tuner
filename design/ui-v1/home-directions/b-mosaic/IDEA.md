# Direction B: Mosaic

**The idea.** No billboard, no row titles, no sentences: Home is a wall of artwork from edge to edge, and the tiles
are sized by how much they matter tonight. What you are in the middle of is the biggest tile, the new episode and the
next game stand beside it, a band of posters says when each film would end, two small tiles say what is on RÚV and
ESPN right now, and under them the doors into the library (Á íslensku, In 4K, New this month, Saved) are two posters
side by side with a count. The one you are on lights up: full colour, a hair larger, its one line of text; everything else
sits a step back under a thin veil, and the whole ground takes the focused tile's colour. Moving down never changes
the kind of page: the wall just keeps going. On game night the wall re-tiles around a team-colour tile and the ground
goes Memphis blue.

**What makes it unique.** It is a home you read as pictures, like a wall of records or a poster shop, not a list of
shelves with captions. The gutters are the grid (12 px, the same everywhere), tiles come in five sizes and every size
means something (big = in progress, tall = a new episode, portrait = a film, small = a channel, pair = a door), and
the wall never reorders under your thumb. The focus is a spotlight rather than a cursor: the lit tile against a
quietly veiled wall is what tells you where you are from across the room, and the ambient ground changes colour as
you move (Severance's green office, Sinners' red, Godland's grey-blue, Memphis blue on game night). Nothing is
hidden behind a "more" button: the counts are on the doors, the end times on the posters.

**How the remote moves.**
- Each band is a row; Left / Right moves along it, Up / Down between bands. The wall scrolls by whole bands so the
  gutters stay aligned (the top bar stays). Band edges stop sideways; a two-tile column (the channels) counts as one
  slot that Up / Down moves within.
- OK: the tile's one action (Resume, Play the episode, Watch live, Tune, Open the shelf). Hold OK: the card menu. On a
  door OK opens the Movies or Series shelf with that filter set.
- Focus is remembered per band by `data-key`, so coming back up lands on the tile you left.
- Up from the first band: the top bar.

**The three screens.**
1. `evening.html`: Wed 20:41. Band 1: **Severance** 426 × 228 (backdrop, chalk logo, `S2 · E3 · Who Is Alive? · 21 min
   left · ends 21:03`, the progress bar, `CONTINUE`, `4K`), Slow Horses 207 × 228 (the episode's still from Cinemeta,
   the logo, `S6 · E6 · Judgement Day`, `NEW THIS WEEK`), the next game 207 × 228 (`NBA · THURSDAY`, the two crests in
   their discs on the Memphis and Portland fields, `02:00 · at Portland · ESPN`). Band 2: five films that fit tonight
   (`FOR TONIGHT`, each with its copy's quality and `Ends 23:33`) and the two channel tiles (`RÚV · Kastljós · until
   20:55 · ON NOW`, `ESPN · SportsCenter · until 21:00`). Band 3 peeks: the doors.
2. `gamenight.html`: Thu 03:12, Grizzlies at Lakers live, 2nd quarter, shield on. The game takes the big tile: a dark
   strip on top with `GAME NIGHT · LIVE · ESPN · 4K · Score hidden` (the LIVE pill never touches team colour), the
   Memphis and Lakers fields under it cut at 12° with their secondary edges, the crests in the neutral disc with
   `Grizzlies · 3-0 · as of tip-off` and `Lakers · 2-2`, the clock chip `2ND 4:12` on the gradient at the split,
   `OK Watch live · ▸ From tip-off`. Severance and Slow Horses move to the 207 tiles. Band 2 swaps the film-for-tonight
   lead for `SHORT · It's Always Sunny S18 E10 · 25 min` and the channel tiles become the two live games (`ESPN ·
   Grizzlies at Lakers`, `TNT · Nuggets at Thunder`, no scores). The ground is Memphis blue.
3. `browse.html`: Wed 20:43, one band down. The posters and channels now sit at the top; the doors band is in focus:
   **Á íslensku · 38 films · 6 series** lit (Godland and Rams), beside `In 4K · 412 films`, `New
   this month · 57`, `Saved · 12`; the Cinemeta Popular band peeks below. The ground is Godland's grey-blue.

**Only data the app has.** Continue watching with progress, episode names and stills (Cinemeta `videos`), the next
episode of followed shows, runtimes for `Ends`, quality per copy, the guide's titles and times for the channel tiles
(wordmarks stand in for the provider's logos, which the app has), the NBA slate and records as of tip-off, Cinemeta
posters, backgrounds and logos by IMDb id, ESPN crests, the catalog's counts for the doors. No invented channel art.

**Brand.** airglow: the canvas and surfaces, chalk and the text tokens, Outfit for titles and wordmarks, Inter for
lines, the gradient only on progress, the clock chip and the avatar, the mark and tabs unchanged, radius 16 for 16:9
and 12 for posters, the 5 px focus ring with its canvas gap. The Sharp dialect (12° fields, Barlow Condensed italic
clock) is confined to the game tile. Argued departures: (1) the veil on unfocused tiles (bg-0 at 30 %) is a new
state, the "spotlight"; it keeps every unfocused tile's text at 4.5:1 and is removed on focus. (2) The ambient ground
is a flat two-stop radial of the focused tile's colour over bg-0 with grain, computed from a 32 px copy as Home v2's
optional idea G; it is an atmosphere, never a UI colour, and off by default on a weak panel.

**Risks.**
- Tile labels at 12 px caps (CONTINUE, NEW THIS WEEK, FOR TONIGHT, ON NOW) are below the 14 px informational floor;
  they are status badges in the brand's sense (caps, 650, in a pill) but longer than five characters. If the review
  calls it, the fix is 14 px pills at 24 high; the layout has room.
- A wall is denser than rows: the first screen holds 10 focusable things. The veil and the single lit tile are what
  keep it calm; without them it is Google TV.
- Mixed tile sizes need the D-pad rule above (bands, the column as one slot); it must be built, not left to geometry.
- The ambient colour from artwork needs the CORS check and the bg-1 fallback (Home v2 3.8); and the whole wall scales
  nothing but the focused tile, so the 12 px gutter around a scaled tile shrinks to about 8 px, which the ring still
  clears.
- Performance: one container per band with `setHtml`, images at slot size (426, 207, 124, 87 wide), the veil a single
  overlay div, no filters, the focus scale on transform only.

**Files.** `evening.html`, `gamenight.html`, `browse.html` (960 × 540, link the app's `fonts.css` and `tokens.css`
plus `mosaic.css`); `png/*.png` at 1920 × 1080; `art/` the Cinemeta backgrounds, stills, logos and posters and the
ESPN crests used; `tools/render.js` (Playwright).
