# The case for Reels

Written for the owner. Plain words; a design term is explained the first time it shows up. The three mocks are in
`png/` (`evening.png`, `gamenight.png`, `browse.png`); everything below points at them.

## 1. In one breath

Home is four tall pictures standing side by side, and each one is a kind of evening: **Pick up** (what you are in the
middle of), **New** (new episodes of your shows), **A film** (films that end before bed) and **Live** (the game, then
what is on now). One of the four is open wide, with the show's own logo and the one button you want; the other three
are narrow strips of their own artwork. Left / Right chooses the kind of evening, Up / Down *spins* the open one to its
next or previous item (a "reel", like a slot machine or a film reel), and OK plays.

## 2. An evening, press by press

A "press" is one button push on the remote. Focus (the thing the white ring is around) starts on the first item of the
first reel when Home opens.

**A. 20:40, mid-Severance** (`evening.png`)
1. He turns the TV on. Home opens on **Pick up**, already showing Severance: the real backdrop, the real logo,
   `S2 · E3 · Who Is Alive?`, `21 min left · Ends 21:03 · 4K`, a pink progress bar, `OK Resume`. Under the plate a
   thin card says `Next · Breaking Bad · S3 · E7 · up next`. Three narrow strips stand to the right: Slow Horses,
   Heat, and the Grizzlies game.
2. **OK.** The episode resumes. **Resume = 1 press.**

If he does not want Severance tonight:
- **Right** opens **New**: Slow Horses S6 · E6, "New this week". (1 press to look, 2 to play.)
- **Right, Right** opens **A film**: Heat, `Ends 23:33`. (2 to look, 3 to play with OK.)
- **Right, Right, Right** opens **Live**. The first item is the Grizzlies at Blazers (Thu 02:00); **Down** moves to
  Kastljós on RÚV, "on now". **A channel from Home = Right ×3, Down ×1, OK = 5 presses.** Any other channel is the Live
  tab (the guide), as today.

**B. Game night, 03:12** (`gamenight.png`)
1. Home opens with **Live** moved to the front and open: the Grizzlies and Lakers, `2nd quarter`, `Score hidden`,
   `OK Watch live`. Nothing needs choosing; the game is simply the thing Home is about.
2. **OK.** He is watching live. **Watch the game live = 1 press.**
3. To start from the beginning instead: **hold OK** (press and keep it down for a second) and pick **From tip-off**.
   (2 presses and a short hold.)
4. The other things stay where they were: Severance, Slow Horses and a short Always Sunny are the three strips beside
   the game; **Right** opens any of them.

**C. He wants a film he hasn't picked** (`browse.png`)
1. **Right, Right** to the **A film** reel. It shows its best pick first (Heat: ends before midnight, best copy first).
2. **Down.** The reel spins: Sinners slides up behind, Heat goes above it as a thin card, the next card (Dune) opens.
   Each Down shows the next film with its logo, `Ends 23:30`, `4K HDR`, IMDb 8.4, two lines of plot. Press **Down**
   again: Dune: Part Two is the open one (the mock), Sinners peeks above, Anora below.
3. **OK** opens that film's page; **hold OK** plays it now or saves it.
   **A film from Home = Right ×2, then Down for each look, then OK.** The third film is 5 presses with the OK.
4. If none of the first dozen fit, the last card is **See all** (it opens the full Movies shelf with the "fits tonight"
   filter on). Anything outside the dozen is a search or the Movies tab, not Home.

| He wants to… | Reels | (for scale) A Marquee | F Echo |
|---|---|---|---|
| Resume his show | 1 | 1 | 1 |
| Watch the game live | 1 on game night | 1 | 1 |
| See tonight's film | 3 | 4 | 3 |
| Open a channel on Home | 5 | 6 | 5 |

## 3. Why it works

**Two small decisions instead of one big one.** Most TV homes make you scan a lot of rows and pick one thing out of
fifty. Reels splits that: first *what kind of night is it?* (Left / Right, four choices, always visible), then *which
one?* (Up / Down, one at a time). Four choices is about what a person can take in at a glance from the sofa without
reading. The names are four short words (`Pick up`, `New`, `A film`, `Live`), so there are no row titles to read.

**Reading distance.** From 3 m on a 55" screen small text is hard. So every piece of text a person must read is 14 px
or bigger on the 960 px design canvas (that is 28 px on a 1080p TV), names are Outfit 700 at 17-26 px, and the one thing
you *recognise* is not text at all: it is the show's face and logo. The narrow strips are for recognising ("that's the
Slow Horses one"), not reading; they carry a logo and one fact in large type.

**One focus at a time.** There is exactly one white ring on screen, around the open plate. The strips never take focus
on their own; they are where the ring will go if you press Left / Right. That keeps the "where am I?" answer instant,
which matters more with a remote than with a mouse because you cannot just point.

**Muscle memory.** The two axes never change meaning. Left / Right is always "another kind of evening", Up / Down is
always "another one of these", on Home and while browsing. After a week his thumb knows it. Nothing reorders under his
thumb while he looks at it: the reels and the first item of each only change between visits.

**What the eye lands on first.** The open plate is the biggest, brightest, most colourful thing, and it carries the
glow (section 4), so the eye goes there; the strips are a step darker. Then the eye moves to the logo, then the one fact
(`21 min left`), then the button hint.

**4,812 films and 1,210 series.** The mock shows six things, but Home is not meant to show the library; it shows
*tonight*. Each reel is a short, ranked list the app builds from what it already knows (progress, new episodes, runtime
before bed, quality of the copy, the guide). Reels shows the top of each and the counts on the strips are real
(`3` new, `212` films that fit). The full library stays where it already is: the Movies and Series tabs, Search, and a
`See all` card at the end of each reel. This is the honest limit: Home answers "what tonight?", not "everything".

**What the others do, and where this differs.**
- *Netflix* is rows of small posters under a big picture: lots to scan, small targets, and the row titles are the
  provider's marketing ("Because you watched…"). Reels has no row titles to decode.
- *Apple TV* leads with one big picture and a shelf of titles below; it is beautiful and calm, and Reels borrows the
  big picture + logo, but shows four pictures at once so you see variety before you move.
- *Google TV* is a big rail of recommendations; it is great at "everything" and weak at "what am I doing tonight".
  Reels is built around tonight and your own shows.
- *Plex / Infuse* are libraries; they are tidy but you must go and look. Reels brings the three or four things
  he would look for up to the front.
Where Reels is deliberately different: it is the only one of the three finalists that is organised by *kind of
evening* (the "four reels"), and it keeps browsing inside the same screen instead of turning Home into a different page.

## 4. Why it is good UI, piece by piece

**The four plates.** Tall rounded shapes, 12 px apart, filling x 56-904 and y 88-498 on the 960 × 540 canvas, which is
inside the TV safe area (the margin TVs can cut off: x 48-912, y 27-513). Tall and narrow because a TV is wide:
standing four of them side by side uses the full width without a thin horizontal strip. Round corners (22 px) are
airglow's "Soft" look.

**The open plate** (440 wide) and **the spines** (about 124 wide). The open plate is wide enough for a face and a
logo; the spines are wide enough for a face crop and a logo. Only one plate is ever open, so the ratio "one big, three
small" never changes and nothing jumps in size except the two plates that swap.

**The picture.** The real Cinemeta backdrop, cropped to the plate. A crop means the plate shows only a slice of the
16:9 picture, so each title needs a "focus point" (where the face is). Faces and posters crop well, wide landscapes do
not (weak spot, section 6).

**The logo.** The show's own logo in place of its name (Severance in its own letters), 54 px tall (66 on Dune, whose
logo is thin). It gives each show a personality, instantly recognisable, and costs no reading. A soft dark shadow
behind the logo keeps a thin or dark logo readable over a busy picture. When Cinemeta has no logo, the name in Outfit
700 stands in.

**The facts under the logo.** Two lines, in this order: `S2 · E3 · Who Is Alive?` then `21 min left · Ends 21:03 · 4K`.
The end time is the one number that decides an evening, so it is there. The plot line (14 px, two lines at most) is the
only sentence. The pink progress bar is the one use of the airglow gradient on a plate, because progress is what the
gradient means everywhere in the app.

**The eyebrow and the dots.** `PICK UP` in pink small capitals says what this reel is. The two dots top right say "this
reel has 2 items, you are on the first"; in the browse mock they become the number `3 / 212`, because with many items
dots stop being useful.

**The "Next" and "Before" cards.** A thin card under the open plate shows what Down will bring (`Next · Breaking Bad`),
and a thin card above shows what Up will bring (`Before · Sinners`). That is what makes it a *reel*: you can see the
next frame before you press. It also answers "is there more?" without a scroll bar.

**The strips (spines).** A backdrop slice, darker than the open plate so the open one wins; a vertical label (`NEW`,
`A FILM`) that names the reel; a round number chip (`3`, `212`) that says how many there are; and at the bottom the
logo and two lines (`S6 · E6`, `New this week`). Names are written the right way up at the bottom because the eye
reads horizontal text faster than sideways text; only the short reel name runs sideways.

**The game strip before tip-off.** The Grizzlies' navy over the Blazers' black, a flat straight line between them, the two
crests, `Thu 02:00 · ESPN · 4K`. Flat means "not live yet"; the slanted line (section 5) means live.

**Colour.** Team colours are the teams' real colours (Memphis navy and Beale Street blue edge; Lakers purple and gold
edge; Blazers red edge). Everything else is airglow's dark canvas with chalk (warm off-white) text and the pink-to-orchid
gradient used only for progress, the clock chip and his avatar.

**The glow ("airglow").** The open plate has a soft halo in its picture's main colour, outside the white focus ring,
and the same picture, blurred, lights the dark room behind the plates (Severance green, Dune orange, Memphis blue and
Lakers purple on game night). It does two jobs: it makes the open plate the obvious thing, and it makes each reel feel
different. It is also the brand's name, and it nods to the Ambilight lights on the back of his Philips.

**The focus ring.** The app's standard ring: 5 px white with a 2 px dark gap, around the open plate only. The same ring
as everywhere in airglow, so it is learnt once. Strips never have a ring.

**Motion** (not visible in a still). The next reel opens and the previous one closes in about 200 ms; a Down spin slides
the cards up one step. Short, because a remote user presses repeatedly. The glow cross-fades.

**The hint row.** `OK Resume · ▼ Spin · Hold Start over, more` is the whole remote on one line, inside the plate. It is
there for the first week and the quiet days; the keys are drawn as small keys so they read as buttons, not words.

**Top bar and the clock.** The app's top bar and tabs are unchanged and stay where they always are; the clock at the
right (`Wed 20:41`) is the same clock the "Ends 21:03" numbers are worked from.

## 5. Game night

**Why a plate, not a takeover.** On game night the game is the thing he came for, so it goes **first** and **open**:
one press and he is watching. But the rest of his evening (Severance, Slow Horses, a short episode) is still on screen,
in the same places, so if the game is boring (or the other game is better) he is one Right away from them. Takeover
screens look louder but they leave the rest of the evening in a hidden place.

**What the plate shows.** The two teams as two coloured fields cut by one 12-degree slanted line (airglow's "Sharp"
look, used only for live so the slant means *live* anywhere you see it). Memphis navy on top with its Beale Street blue
edge, Lakers purple below with its gold edge; the real crests in dark neutral discs so neither team's logo clashes with
the other's colour; a very faint big crest behind each team. The clock chip (`2ND 4:12 · synced`, pink-orchid gradient,
slanted) and the `Score hidden` chip ride on the cut. The `LIVE` pill and the `GAME NIGHT` label sit on a dark chip,
never on a team colour, because red on purple is unreadable. The NBA tab in the top bar gets a small LIVE pill too.

**How the spoiler shield holds.** Nothing on Home can tell him the score or the result:
- No score anywhere. The only number near the game is the clock, which is the clock of *his* stream (the app already
  delays the game clock to match the stream; `synced` means that).
- Records are shown **as of tip-off** (`3-0 · as of tip-off`), the copies the app froze before the game, never the
  current record that a win or loss would change.
- The "Next" card is the other live game with no score, and the Blazers strip before tip-off has no record at all.
- No "Final", no winner highlight, no colour that changes with the result. After the game the reel says
  `Replay · From tip-off`, not what happened.
- `Reveal score` exists only under **hold OK**, so it is a deliberate act, never an accident.
- Because Live goes first only because it is *live*, never because of how the game is going, the order itself leaks
  nothing.

## 6. The weak spots, honestly

1. **It is the smallest picture of the three.** The open plate is 440 × ~360 px: about 31% of the screen; A's picture
   is the whole screen, F's is about 56%. Cinematic wow is lower. *Fix:* the glow and the four-pictures-at-once make up
   for it, but if he wants a billboard, this is not the direction.
2. **The 212 counter in `browse.png` is a mistake to fix, not copy.** Spinning through 212 films one by one is a bad
   idea. *Fix:* each reel holds the best 12 (counter `3 / 12`) plus a final `See all 212` card; holding Down repeats and
   speeds up.
3. **Four reels is a hard cap.** Many things he might want (a series he started last month, Saved, a second channel)
   have no slot on Home. *Fix:* order inside each reel is by relevance, `See all` ends each reel, and an empty reel is
   hidden; I would add a fifth, `Saved`, only when there is something saved.
4. **Learning two axes.** A one-axis list (A) is simpler. After a week it is fine, but the first evening he may press
   Down expecting a list. *Fix:* the thin Next card and the hint row teach it; and on Home the open plate is always the
   first item, so Down never goes anywhere surprising.
5. **Tall crops of wide pictures.** A wide landscape loses its sides, and a face can fall at the edge. *Fix:* a focus
   point per title from a quick scan of a small copy of the picture, otherwise fall back to the poster's colour.
6. **Narrow spines are small.** 124 px wide, so a thin logo (Dune) is tiny. *Fix:* if the logo would be under 60% of the
   strip's width, show the title in Outfit 17 px instead.
7. **A month in.** He could get tired of the same four names. The reels are fixed on purpose (muscle memory), so the
   *contents* must feel fresh: new episodes first, "ends before midnight" refreshed every night. If one reel is empty it
   goes away rather than showing filler.

**Building it on the Philips 55OLED810 (Google TV, WebView).**
- *The widening.* Making one plate wide and three narrow by animating `width` re-lays out four boxes each press. It is
  fine for four boxes, but the safe build animates `transform` on fixed-size layers (the picture is clipped, not
  squeezed). Fallback if it stutters: no animation, a 150 ms cross-fade.
- *The blur.* A 34 px CSS blur over the whole screen is the most expensive thing in the mocks. The build should not
  blur: it draws a 32 × 18 copy of the picture and stretches it (it is a smooth glow anyway), or just uses a flat
  gradient of the picture's main colour.
- *Images.* At most seven pictures are live at once (four plates, two peeks, the glow). Backdrops are 1440 px wide; the
  strips only need about 740 px, so the app should ask for a smaller size (metahub has `small` and `medium`) and keep
  the next card's picture preloaded. They come from Cinemeta over the network, so each is cached on first use and the
  plate shows the poster's colour until the picture arrives, never an empty hole.
- *Fonts and text.* Nothing new: Outfit, Inter and Barlow Condensed are already in the app. The sideways labels use
  `writing-mode: vertical-rl`, which Chrome WebView supports.
- *Focus.* One container, four plates; the focus engine already supports a data-row of items with one ring, and Up / Down
  inside a plate is a second small engine (one index per reel).

## 7. Versus the other two

**A Marquee** (a list of tonight's six things down the left, the title's whole backdrop behind).
- *A wins:* the picture is the full screen, which is the most "Netflix quality" first look of the three; the six lines
  are horizontal text, faster to read than strips; it is the simplest to learn (one list, one axis) and to build. It
  also fits more entries on screen at once (six names at once).
- *Reels wins:* it shows four pictures instead of one picture and six words, so variety is visible; the same gesture
  does Home and browsing; game night keeps the evening in view instead of replacing the screen; and the glow is a
  stronger use of the brand. I would not claim it is simply better: if he mostly resumes and watches the game, A and
  Reels both do that in one press.

**F Echo** (six tall leaves across the whole screen; the open leaf is 540 px wide; the Library is a leaf on Home).
- *F wins:* its picture is bigger (540 × 540, more than Reels' 440 × 360) and it never scrolls: six things are always on
  screen, including the Library door and the channel. Its fold-open motion is more distinctive. The folded names run
  sideways and are large, which gives the screen a book-spine look I think is beautiful. It is stronger as pure
  spectacle.
- *Reels wins:* I think the two-axis model is easier to extend (more items per reel without more leaves), the text under
  the strips is horizontal, so the facts (`21 min left`, `Ends 23:33`) read faster than F's sideways titles and 13 px
  second lines; and the spines are wider (124 vs 84), so a logo is readable. F can hold six things and no more; Reels
  has room for a dozen per reel. F puts the Library on Home, Reels does not.
- *Honest tie:* both crop backdrops tall and both need a focus point per title.

**If I had to choose for him:** if he wants a screen that makes a visitor say "wow" from the doorway, A or F. If he wants
a Home that is a pleasure to use every night with a thumb and shows what tonight offers across shows, films, game and
channels without ever turning into a grid, Reels. It trades a little spectacle for a lot of "where do I press".
