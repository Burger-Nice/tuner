# Direction D: Reels

**The idea.** Home is four tall reels side by side, and each reel is one kind of evening: **Pick up** (what you are in
the middle of), **New** (new episodes of your shows), **A film** (films that end before bed, best copy first) and
**Live** (the game, then what is on now). Each reel shows exactly one thing at a time as a tall picture plate. Left /
Right chooses the kind of evening (the chosen reel opens wide with the title's real logo, its facts, one line and the
progress bar; the other three stay as narrow spines of real artwork with the logo and the one fact that matters,
`21 min left`, `Ends 23:33`, `Thu 02:00`). Up / Down *spins* the reel: the next item peeks under the plate and the
previous one above it, like a stack of cards, so browsing is the same gesture as choosing. The reels follow the clock:
after midnight "A film" becomes "Short", and on game night the Live reel takes the first place and turns into the two
teams.

**What makes it unique.**
- **The decision is split in two small ones.** "What kind of night?" is Left / Right across four always-visible
  pictures; "which one?" is Up / Down inside that reel. No row titles to read, no grid to scan, never more than four
  places the focus can go sideways. A first-time viewer understands it from the shape alone: four reels, one is open.
- **You see the whole evening as art at once**, not as a list of names: four real pictures on one screen, one of them
  large. That is the gallery feeling the other homes lack, without covering the screen with one billboard.
- **Browsing never changes the page.** The library is the reel: spin the film reel and you are browsing 212 films that
  fit tonight (`3 / 212`), with the counter on the plate and the neighbours peeking. Nothing scrolls off, nothing
  reflows, the other three reels wait where they were. "Moving down" is the same plate getting a different film.
- **Airglow, literally.** The focused plate glows in its picture's colour (a soft halo outside the white focus ring) and
  the same picture, blurred, lights the room behind the plates: green for Severance, orange for Dune, Memphis blue and
  Lakers purple on game night. It is the brand's name, and it echoes the Philips Ambilight on the wall behind his TV.
- **Game night is a plate, not a takeover.** The Live reel jumps to the front and the plate becomes the two teams cut by
  the one 12° line (Memphis navy over Lakers purple, the clock chip riding the cut, crests, records as of tip-off,
  `Score hidden`). The rest of his evening stays in the three spines beside it, in the same place.

**How the remote moves.**
- Left / Right: between the four reels. The reel you leave closes to a spine, the one you enter opens (a 200 ms slide).
  Edges stop; Right from the last reel does nothing. Up from any reel: the top bar, as everywhere in the app.
- Up / Down: spin the focused reel one item. Down from the last item shows `See all 212` as the final card, which opens
  that shelf in Movies / Series / the guide. Up from the first item goes to the top bar.
- OK: the item's one action (Resume, Play, Watch live). Hold OK: the card menu (Start over, Episodes, Details, Save,
  From tip-off, Reveal score). Back: from a spun reel it returns the reel to its first item, then leaves Home.
- Focus is one white ring (the app's 5 px ring with the 2 px canvas gap) around the open plate. Spines have no ring and
  no text that needs reading from a distance beyond their big logo and one fact.

**The three screens.**
1. `evening.html`, Wed 20:41, a normal evening. Pick up is open on **Severance** S2 · E3 "Who Is Alive?", 21 min left,
   ends 21:03, 4K, 57% bar, `OK Resume`; under it the next card in the reel, **Breaking Bad** S3 · E7 up next. Spines:
   **Slow Horses** S6 · E6 new this week (3 new), **Heat** ends 23:33, 4K, 2h 50m (212 films), **Live** Grizzlies and
   Blazers, Thu 02:00, ESPN, 4K (no score, no record).
2. `gamenight.html`, Thu 03:12, shield on. Live is first and open: `GAME NIGHT`, the LIVE pill (on a dark chip, never on a
   team colour), Grizzlies `3-0 · as of tip-off` over Lakers `2-2 · as of tip-off`, the clock chip `2ND 4:12 synced` and
   `Score hidden` on the 12° cut, `OK Watch live · Hold From tip-off, Reveal`, and the next card `Nuggets at Thunder ·
   also live · TNT`. Spines: Severance (21 min left), Slow Horses, a short **It's Always Sunny** S18 · E10 (25 min, the
   film reel's after-midnight form). The NBA tab carries the LIVE pill.
3. `browse.html`, Wed 20:43, the film reel spun twice: **Dune: Part Two** (3 / 212), `2024 · 2h 47m · Ends 23:30`, 4K HDR,
   IMDb 8.4, from the add-on, two lines of plot, `OK Details · ▲▼ Spin · Hold Play now, Save`; **Sinners** peeks above
   (ends 23:01, 4K), **Anora** below (ends 23:02, HD). The other reels sit as spines: two on the left, one on the right.

**Only data the app has.** Continue-watching progress, Cinemeta episode names / lines / runtimes / ratings / genres,
backdrops and logos by IMDb id, the next episode of followed shows, quality per copy (4K / HDR when checked), the add-on's
name, the guide, the NBA slate, ESPN crests, records as of tip-off under the shield. Counts on the spines come from the
lists the app already builds. No programme art for channels: the Live reel's channel items are text on a dark plate with
the channel logo (the mock shows the game).

**Brand.** airglow throughout: Soft identity (22 px round plates, the pink-to-orchid gradient only on the progress bar,
the clock chip and the avatar), the unchanged top bar, chalk on the canvas, Outfit for names, Inter for facts, Barlow
Condensed italic only for the clock. The Sharp dialect (the 12° cut and the slanted chips) appears on game night only, so
the slant still means live. Departures argued: the artwork is cropped tall (the spines show a slice of a backdrop, not
the whole picture), and the focus halo is tinted by the picture; the ring itself stays white.

**Against A.**
- *Where Reels is better.* You see several pieces of real art at once, so the first screen already shows variety and
  what is new; A shows one picture plus six words. The two-gesture model (kind, then item) means a longer list never makes
  the screen denser: A needs a seventh and eighth line to fit more, Reels just has more cards in a reel. Browsing is the
  same gesture as Home, with a count, where A switches to a poster shelf. Game night keeps the rest of the evening in
  view in the same places instead of replacing the whole screen. The glow-in-the-room is a stronger use of the brand.
- *Where A is still better.* A's single full-screen backdrop is more cinematic and more "Netflix quality" at a glance;
  Reels crops pictures into tall slices, which flatters portrait-shaped art (faces, posters) and hurts wide scenes. A's
  lineup lists six things by name with why each is there; Reels shows one fact per spine and only one open plate, so
  "what exactly is in the New reel" needs a Left / Right and a spin. A's lineup is read-only simple (one list, one
  axis); Reels asks the viewer to learn two axes. A needs less new code.

**Risks.**
- Tall crops of wide backdrops can hit the wrong part of the picture. The app needs a per-title focal point (default
  centre-left for ensemble art) and should fall back to the poster's colour for art with the subject at the edge.
- The reel counts and the "after midnight" rule are real product decisions (what is a "short", how a new episode is
  counted); the mock shows plausible values. Four reels is the cap; an empty reel (no new episodes) is hidden, and a
  fifth, "Saved", only appears when something is saved.
- Animation: the open plate widens by changing flex width, which re-lays out four boxes. On the TV build this should be
  animated with transform on pre-sized layers (clip-path inset on the picture), and the blurred room is a 32 x 18
  thumbnail scaled up, not a CSS blur, since a 34 px blur over the full screen is heavy on a TV WebView.
- Spines are 124 px wide: logos that are wide and thin (Dune) get small, so the spine falls back to the title in Outfit
  17 px when a logo is under 60% of the spine's width.
- A reel's first item is the only thing a viewer sees of a kind of evening until they spin it; the order inside a reel
  (the one thing the app thinks is best) therefore matters more than in A.

**Files.** `evening.html`, `gamenight.html`, `browse.html` (960 x 540; link the app's `fonts.css` and `tokens.css` plus
`reels.css`); `png/*.png` at 1920 x 1080; `art/` the Cinemeta backgrounds and logos and the ESPN crests used;
`tools/build.js` (writes the three pages from the data) and `tools/render.js` (Playwright, writes the PNGs).
