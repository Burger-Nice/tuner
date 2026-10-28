# Home: the final three, reviewed

An independent review of `a-marquee/`, `d-reels/` and `f-echo/`. I looked at every PNG at full size, cropped and
zoomed the spots that matter, and read the HTML and CSS where a picture left a question (positions, sizes, what
animates). Each designer's CASE.md was checked against the renders, not taken on trust. The rules from
`home-v2/SPEC.md` and `catchup/SPEC.md` (the shield, only data the app really has, speed) still apply.

A few words used below:
- **Safe area**: the part of the screen every TV is guaranteed to show (x 48–912, y 27–513 on the 960 × 540 canvas).
  Anything outside it can be cut off at the edges, and the project's rule is that text and the focused thing stay
  inside it.
- **Focus / ring**: the one thing the remote is "holding", shown by the white outline.
- **Scrim**: a dark fade laid over a picture so text on top stays readable.
- **Hierarchy**: what the eye goes to first, second and third.
- **Spine**: in D and F, a narrow strip that stands for something that isn't open.
- Pixel positions are on the 960 × 540 canvas unless I say "on the PNG" (the PNGs are twice that size).

---

## The scores

| | A Marquee | D Reels | F Echo |
|---|---|---|---|
| Ease of use with the remote | **8.5** | 7 | 7 |
| Clarity from the sofa | **8.5** | 7.5 | 6.5 |
| Beauty and craft | **8.5** | 7.5 | 8 |
| Originality (and whether it pays off) | 6 | 7.5 | **9** |
| Game night and the spoiler shield | **7** | 6.5 | **7** |
| Scale (thousands of titles, missing art, long names) | **7** | 6 | 5.5 |
| Brand fit | 8 | **8.5** | 8 |
| Buildability and speed in the TV WebView | **9** | 6 | 6.5 |
| **Overall** | **8** | **6.5** | **7** |

The overall scores are my judgement, not an average. **I would build A**, with five fixes that are the same kind of
fix for all three, and three things taken from F and D (end of this review).

---

## One leak and one rule break all three share

These are not reasons to choose one over another, because all three have them. But they have to be fixed whichever
one is built.

**1. The game clock is showing on a hidden game.** All three game-night mocks show the chip `2ND 4:12 · SYNCED`
while the score is hidden and *From tip-off* is offered. A and F also write `2nd quarter` in the line under the game's
name. The catch-up spec (S4) and Home v2's state table ("Live, hidden") already settled this: while the game is hidden
and a replay exists, the chip says `ON NOW` / `Score hidden`, **with no quarter and no clock**. The reason is simple:
he might start from tip-off in ten minutes, and the clock says how far the game has gone and how it's going. `OT`
tells him it was tied after four quarters. A chip stuck on `4TH 0:38` for five minutes tells him it's a close game.
The earlier reviewers caught this, and these three directions brought it back. (Direction E got it right: "no score,
record or clock".) The fix is the same text in all three. The bold chip can stay as a shape, but it says `ON NOW`.

**2. The scenario contradicts itself.** In every evening mock the next game is *Grizzlies at Trail Blazers, Thu
02:00*. Every game-night mock, also on Thursday and with a 2nd quarter at 03:12 that fits a 02:00 tip-off, is
*Grizzlies at Lakers*. That's a slip in the mocks, not in the designs, but Home v2 was specifically marked down for
this, so the build's fixtures should be one timeline.

Smaller shared points: the bar's NBA tab keeps its own LIVE pill while the game is the big thing on Home (Home v2 says
the tab drops it then; two pills at most is still kept). In all three, OK means *play* on the first screen and
*Details* one level down in the library. That split is fine, but the hint line has to say so every time, and it does.

---

## A: Marquee

**What it is.** A list of tonight down the left (the show you're in, a new episode, the next episode, a film that
ends before bed, the game, what's on RÚV), and one full-screen picture behind it that always matches the line you're
on. Up / Down moves along the list, OK plays, Right opens "more of this", Down past the end goes into the library.

### Scores, with the reason

- **Ease of use 8.5.** On the first screen only one direction does anything (Up / Down), and the thing it moves is
  a list of names. That is the easiest thing a remote can drive. The press counts in the CASE are right (I traced
  them): resume 1, the game 1, From tip-off 2 (Right, OK), the app's film 4, the channel 6. The channel at 6 is the
  worst of the three, but the Live tab is 4 presses away anyway. In the library, Left / Right moves along a shelf and
  Up / Down moves between shelves, the normal TV pattern that he already knows from every other app.
- **Clarity 8.5.** From the sofa this is the most readable screen of the three. Six horizontal names in 26 px Outfit
  Bold (`Slow Horses`, `Breaking Bad`, `Heat`…), each with its reason after it in plain words (`New this week`,
  `Up next`, `A film for tonight · ends 23:33`). The eye lands on the ringed block, then the picture. Two weak spots:
  the focused title is a logo in a 46 px box that renders even smaller (`evening.png`: the Severance logo is about
  117 × 23 px), so it has *less* weight than the bold unfocused `Breaking Bad` under it, and the marquee "lighting up" moment is undersold. And the grey meta text
  on the unfocused lines (15 px at 66 % opacity) is the faintest readable text on screen.
- **Beauty 8.5.** `evening.png` is calm and cinematic: the Severance office fills the right half uncropped, the
  scrim is clean, nothing fights. `gamenight.png` is the single best image in the whole set: Memphis navy and Lakers
  purple cut by the 12° line, two huge crests, the gradient clock chip on the cut. It looks like a broadcast graphic,
  not an app. `browse.png` (Sinners) looks like the Apple TV app at its best. One craft flaw, clearly visible: the
  `Ends 23:25` label on each poster is printed on the bottom of the poster, exactly where most posters put their own
  title. Crop the bottom of `browse.png` and you see `Ends 23:25` laid over `ONE BATTLE AFTER ANOTHER` (both
  unreadable), `Ends 22:52` sitting on `WEAPONS`, and `Ends 23:02` on Anora's neon title. (The `.end` label is also
  13 px, under the 14 px floor.)
- **Originality 6.** A vertical menu with a backdrop that changes with it is a known pattern (Kodi skins, the old
  PlayStation menu). The CASE says so honestly. What's new is the discipline: six lines, the end time on every line,
  the logo turning on, and game night as a mode. The novelty is small, but none of it costs anything.
- **Game night 7.** Best in presence: the screen *becomes* the game, `Watch live` is one press, From tip-off is
  Right + OK, and Reveal is Hold OK, then a confirm. Under the crests: `3-0 · as of tip-off`. Lost points: the clock
  leak (above), and in the lit block the fan line `3rd in the West · 3 in a row · Morant 27.8 ppg` has **no "as of
  tip-off" label** (Home v2 requires it on the fan line, and F has it). `Lakers 2-2` is not stamped either. That's
  harmless tonight, but it's the habit that leaks the morning after.
- **Scale 7.** The library part is the strongest of the three: named shelves (`A film for tonight · 212`, `Popular on
  Cinemeta`, `Á íslensku`, `In 4K`, `Saved`, `Everything · 4,812`), Up / Down between them, and *Everything* drops
  into the existing Movies grid. Logo fallbacks are designed (the game's name in Outfit 38). Two holes. First, **the
  channel line has no picture.** The IDEA says "the channel entry is text only", but when Kastljós is focused, the
  whole screen behind it has nothing to show, and no mock shows it. The same happens with any provider film that
  doesn't match an IMDb id (many Icelandic titles): no backdrop, no logo. A whole-screen-picture design must define
  its no-picture screen, and A hasn't. Second, long names in a 440 px column: `Grizzlies at Trail Blazers  Thu 02:00`
  already fills it. A title like *Everything Everywhere All at Once* plus its reason will not fit, so it needs a
  shortening rule.
- **Brand 8.** It uses the kit as written. The Sharp 12° dialect appears only on game night, so the slant means "live".
  The gradient is used only on the progress bar, the clock chip and the avatar.
- **Build 9.** A list of text and one image that crossfades: the cheapest and safest of the three on the Philips. It
  fits the existing focus engine (`[data-col]` for the lineup, `[data-row]` shelves). Nothing blurs, nothing changes
  width. The only per-press layout is the focused block growing.

### Genuinely great
- One press for the two things he does most, and the screen tells him *when it ends* on every line. On a weeknight
  that's the deciding fact, and no streaming home prints it.
- The game-night screen (`gamenight.png`). It's the one image in this round that a visitor would remember.
- The whole first screen reads in one look. Nothing to decode.

### Weak
- The focused logo is too small to be the hero (it reads lighter than the 26 px bold names), see Clarity.
- The `Ends` labels collide with poster titles on the browse shelf.
- No designed screen for an entry without art (the channel, unmatched provider titles).

### What would annoy him after a month
- **The whole screen changes brightness on every press.** Going from Severance (bright green office) to Slow Horses to
  Breaking Bad to Heat (dark) to the navy game is five full-screen picture swaps for one walk down the list. In a dark
  room at 02:00 on an OLED, that flicker is tiring. The fix: wait until focus rests for about 250 ms before swapping
  the picture, and limit how bright a backdrop can get behind the lineup.
- **The list jumps.** The focused block is about five lines tall, so each Down collapses one block and opens the
  next, and every line below shifts. The order is fixed (good for muscle memory), but the *positions* move every
  press.
- The Right-key hint is drawn as **▶ in a key cap** (`evening.png`: `▶ Episodes`; `gamenight.png`: `▶ From
  tip-off`). On a remote that has a Play button, that reads as "press Play". D and F draw Down as ▼ and avoid this. Use
  a right arrow.

### Leaks, safe area, focus, data
- **Safe area, broken twice.** The lineup sits at `left: 32px`, so the focused block's ring and tinted background
  start at about x 25 (the white ring is at x 55 on `evening.png`). On game night the `Score hidden` plate runs off
  the right edge: its text ends at about x 931 and the plate itself at about x 955 (`gamenight.png`, bottom right).
  The CASE's "the lineup sits at x 48" is true of the text, not the ring. Fix: lineup at 56, and pull the score group
  left by about 50.
- **Shield:** the clock (shared), the unlabelled fan line, `Lakers 2-2` unstamped.
- **Focus:** clear. One ring on the first screen. In the library there's a ring on the poster and a pink dot on the
  shelf list, which can't be confused.
- **Data:** `A film for tonight · 212` and `Ends` on every poster need a runtime for every film. Home v2 (9.3) planned
  to add IMDb's `runtimeMinutes` to the ratings file, but `scripts/build-ratings.js` doesn't have it yet. Fine as a
  plan, not yet true. Everything else is data the app has or already planned.

---

## D: Reels

**What it is.** Four tall plates: *Pick up*, *New*, *A film*, *Live*. One is open wide; the others are narrow
strips of their art. Left / Right chooses the kind of evening, Up / Down "spins" the open plate to its next item.

### Scores, with the reason

- **Ease of use 7.** The idea "kind of evening, then which one" is smart, and the thin `Next · Breaking Bad` card
  under the plate shows what Down will bring. But it's two directions to learn on the first screen, and there's a
  real trap: **Up means "previous item" inside a spun reel, but on the first item it leaves to the top bar.** If he
  spins down three and back up three, one press too many throws him into the tabs. The channel is hidden (Kastljós is
  item 2 of *Live*, under a game five hours away). The library isn't on Home at all. One mixed signal: on the film
  reel the hint says `OK Details` (`browse.png`), while the IDEA says OK is "the item's one action (Play)". The CASE
  table counts "see the film" (3), not "play it" (4, or Hold).
- **Clarity 7.5.** The open plate is very well laid out: logo, `S2 · E3 · Who Is Alive?`, `21 min left · Ends 21:03`,
  a clear hint row. The spines are the best-read spines of the two spine designs, because their facts are
  *horizontal* (`S6 · E6 / New this week`, `Ends 23:33 / 4K · 2h 50m`). Their sideways labels (`NEW`, `A FILM`,
  `LIVE`) are small caps, which is fine because you recognise them by their art. But the picture is the smallest of the
  three (about 440 × 360, a third of the screen), so it reads as "a nice app", not "a cinema".
- **Beauty 7.5.** Clean and consistent: round plates, a soft coloured glow, real art in every strip. Game night
  (`gamenight.png`) is nicely composed inside its plate (crests, the cut, faint giant crests behind), but it's a card,
  not an event. `browse.png`: Dune's busy cast collage sits right behind the text, so the thin Dune logo and `IMDb
  8.4 · From Northlight` compete with faces. Small slip: `3  / 212` has a stray gap.
- **Originality 7.5.** "Spin a reel" is a new move on a TV home, and browsing without leaving the page is a real idea.
  The novelty helps (you browse in place) and it costs (two directions, and only one item per kind is visible).
- **Game night 6.5.** It has the best-stamped records of the three (`3-0 · as of tip-off` *and* `2-2 · as of
  tip-off`), and nothing in the spines leaks. But From tip-off is buried in Hold OK, next to `Reveal`
  (`Hold From tip-off, Reveal`), and D never mentions the one-step confirm Home v2 requires on Reveal. That puts the
  spoiler button one wrong press from the button he uses most on a late night. Plus the shared clock leak. And the
  game is a plate among plates, the least "game night" of the three.
- **Scale 6.** A reel holds the top dozen (the CASE admits spinning 212 is a mistake). After that it's `See all` into
  the Movies tab. Four reels is a hard limit, and *Saved*, a show from last month, or a second channel get no place.
  The spines (124 px) shrink wide logos, so there's a fallback-to-text rule. The kind of evening is visible, but
  "what else is in New" takes a Right and spins.
- **Brand 8.5.** The best literal use of the name: the plate glows in its picture's colour, which also echoes the
  Ambilight on his Philips.
- **Build 6.** The mocks use `filter: blur(34px)` over the whole screen and a 64 px coloured `box-shadow` halo on the
  open plate. The first is too heavy for this TV (the CASE says so and plans a stretched 32 × 18 image instead). The
  second gets repainted every time focus moves, which the CASE doesn't mention. Opening a plate animates `flex`
  width, so four boxes re-lay out every frame. Up to seven images are live at once. It's all doable, but it's the
  most new code of the three.

### Genuinely great
- The open plate's information design is the tidiest in the round.
- Horizontal facts on the strips: the one spine design you can read without tilting your head.
- The glow idea, which is the brand's name made visible.

### Weak
- The smallest picture of the three, so the least "Netflix quality".
- Two directions, and the Up-to-top-bar trap.
- The *Live* reel leads with something that isn't live (`Thu 02:00`), while something actually on now sits behind it.

### What would annoy him after a month
- "Spin" is a word he has to learn, and Up overshooting into the tabs will happen weekly.
- The film reel always opens on its best pick, so if the ranking is stable it's *Heat* night after night.
- The kind of evening never changes, and the content behind four fixed doors is mostly hidden.

### Leaks, safe area, focus, data
- **Safe area:** clean. The plates sit at x 56–904 and y 88–498.
- **Focus:** the ring goes round the open plate *including* the `Next` card (and in `browse.png`, the `Before` card
  too). Is OK about Dune or Anora? Clear enough once learnt, but the ring should be on the plate alone.
- **Shield:** the clock (shared); no Reveal confirm. Records: good.
- **Data:** same runtime point as A (212). `Short · 9` needs a rule for what counts as a short.

---

## F: Echo

**What it is.** Six tall leaves across the whole screen. One is open (540 × 540, a square cut of the show's
picture, a big logo, one pink button); the other five are 84 px spines with their names running up the edge. Right
opens the next leaf where it stands and folds this one. Down walks into a leaf's shelf.

### Scores, with the reason

- **Ease of use 7.** The first screen is one direction (Right), and all six things are always visible. That's a real
  strength over A, where only one picture is ever visible. The counts in the CASE are right: resume 1, Slow Horses 2,
  the film 3 (the film leaf's button is `▶ Play`, `sideways.png`), the channel 5. **The library is where it breaks.**
  Inside a shelf, Left / Right walks the posters, and the IDEA says "the next shelf opens when you run off the end or
  press Right from the last poster". With `A film for tonight · 212`, getting to *Popular on Cinemeta* means walking
  off the end of a 212-film row. Down is not defined there. Up / Down between shelves would fix it, but as designed it's
  a trap.
- **Clarity 6.5.** The open leaf is superb from the sofa: the Severance logo is huge (`evening.png`), and the pink
  `Resume` button is unmistakable. The spines are the problem, and the zoomed crops show it.
  - On `gamenight.png`, chalk `It's Always Sunny` and `SHORT · S18 · E10 · 25 MIN` sit on Danny DeVito's bright
    yellow shirt and glasses. The small line is close to unreadable.
  - On `sideways.png`, `CONTINUE · 21 MIN LEFT` on the Severance spine is lost on Mark's white shirt.
  - On `browse.png`, the `Á íslensku` spine prints `FILMS · 6 SERIES`. The `38` is clipped off (the HTML says `38
    films · 6 series`), and the spine's name overlaps the *Godland* poster's own lettering. `Saved` is white on pale
    sky blue.
  - The small spine line is 13 px, under the brand's 14 px floor (the IDEA admits it), and it's sideways.
  - Because the leaves are full-bleed, the top bar is drawn over pictures: in `sideways.png`, `Series` and `Saved`
    sit on Harrison Ford's head and the mark sits on a spine.

  The veil and the step-back darkening help, but they don't fix a bright spine.
- **Beauty 8.** At first sight F is the most striking of the three. It looks like a magazine spread or a bookshelf,
  with the open picture life-size and the evening as a row of book spines. `evening.png` is beautiful. It loses
  points for the rough edges listed above, for the busy top, and for the `Ric…` cut-off plot lines on both film
  screens.
- **Originality 9.** The fold is a genuinely new motion for a TV home, and "the brand's mark is the layout" (the open
  wedge with its echo bands) is a clever, true idea. The novelty helps (everything visible, one thing big) and costs
  (sideways reading, crops, a fragile library).
- **Game night 7.** The fields take the open leaf, `Watch live` is one press, From tip-off is Down + OK, Reveal needs
  a confirm, and the fan line carries `· as of tip-off`, the only one of the three that labels it. It loses points
  for the shared clock leak, for `Lakers 2-2` unstamped, and for the screen being only half an event: the other half
  is five strips, one of them bright yellow. A small worry: the Severance spine on game night uses an episode still
  from the episode he's partway through, which could show a later scene. The show's backdrop is safer.
- **Scale 5.5.** Six leaves is a hard limit (fewer leaves make the open one wider, but more can't fit). Long names
  are cut to 20 characters by rule. Every backdrop is cropped to a square, and every spine to an 84 px strip, so
  group shots and landscapes need a focal-point scan per title, and titles with no art fall back to flat colour. The
  library shows five posters per shelf, the fewest of the three, plus the shelf-to-shelf trap above.
- **Brand 8.** The mark-as-layout is the deepest brand idea in the round. It's held back by the sideways text (a
  departure the IDEA argues for), the top bar sitting on art, and pink used for both "this is where you came from"
  (the outlined chip in `browse.png`) and the focus.
- **Build 6.5.** Animating `left` and `width` on six boxes re-lays out every frame for 320 ms. There's a fallback cut
  if it stutters, and it has to be measured on the Philips. Six pictures are decoded at open size per visit. There's no
  blur, which is good. The focus is custom: the button moves across the screen as leaves open.

### Genuinely great
- "Everything tonight is on screen, as pictures, and the one you're on is huge": the best answer to "what's on
  tonight" at a glance.
- The open leaf's type: the biggest, boldest logo and the clearest single button in the round.
- It has the one fan line that's correctly labelled for the shield.

### Weak
- Reading the spines: they're sideways, partly 13 px, and fail on bright art.
- The library's shelf-to-shelf navigation.
- Edge text outside the safe area (below).

### What would annoy him after a month
- Tilting his head to read `Kastljós · ON NOW · UNTIL 20:55` every night.
- The fold, if it's even slightly slow on this TV: he'll see it 4–5 times every evening.
- Bright posters turning spines into noise on some nights and not others, so the screen looks different in quality
  from one evening to the next.

### Leaks, safe area, focus, data
- **Safe area, broken by design.** The leaves run from x 0 to 960, and each spine's label is centred in its 84 px
  strip. So the **last spine's text always sits at about x 898–940** (`evening.png`: `Library · 4,812 FILMS · 1,210
  SERIES` and the poster stack reach x 946; `browse.png`: `Saved · 12 TITLES`). And whenever the open leaf isn't
  first, **the first spine's text sits at about x 22–62** (`sideways.png`: `Severance`). The CASE says "the text keeps
  to the safe area", and the pictures say it doesn't. Fix: push the end spines' labels inward, or start the leaves at
  48 and let only the art bleed. Smaller: the `Resume` / `Watch live` ring and the game chip start around x 41–44.
- **Focus:** clear on the first screen (one pink button with the ring). In the library there's a pink-outlined chip
  at the top *and* the white ring on a poster. That's distinct, but it's two highlights.
- **Shield:** the clock (shared), `Lakers 2-2`, the episode still.
- **Data:** runtime as A. The channel spine is a text tile `RÚV`, which is honest (the provider gives channel logos).

---

## Head to head

**For the two things he does most (resume his show, watch the game)**, all three are one press. The difference is
what the screen feels like when he gets there and how it holds up on every other night.

**Reading from the sofa:** A, then D, then F. A is horizontal names. D is horizontal facts on narrow strips. F is
sideways names on pictures that sometimes fight them.

**"Netflix quality" at a glance:** A and F, in different ways. A gives one uncropped, full-screen picture (the frame
the cinematographer chose) and a game night that looks like a broadcast. F gives the most designed-looking screen,
but every picture is a crop. D looks like a very good app rather than a cinema.

**Unique:** F, clearly, then D, then A. The owner asked for unique. My honest view is that F's uniqueness is the part
that costs the most to use (sideways text, crops, the fold's speed), and A's plainness is the part that costs
nothing.

**Game night:** A's is the event. F's is half an event with the evening beside it. D's is a card. On the shield, D
stamps best, F labels the fan line, A misses both labels, and all three leak the clock.

**Thousands of titles:** A's library is a normal, well-made shelf system with the picture answering the poster. D
stops at a dozen and sends him to the Movies tab. F's is pretty but has the navigation trap and five posters a
shelf.

**On the Philips:** A is nearly free. F needs measuring. D needs its glow and blur rebuilt.

**Why not F, since it's the most original?** Because its problems are structural. Sideways spines, a square crop of
every picture, full-bleed edges outside the safe area and a width animation are the idea itself, not details. A's
problems are details: a ring 23 px too far left, a label in the wrong place, a missing fallback screen, a glyph.
Fixing A's makes it better. Fixing F's makes it less F.

**Why not D?** It's the most sensible app, but it gives up the big picture, which is the thing he asked for, and adds
a second direction to learn.

## What I'd build: A, with these changes

**Fix (needed whatever is built):**
1. Hidden game shows `ON NOW` / `Score hidden`, with no quarter and no clock, while a replay is possible (catch-up
   S4). Label the fan line `as of tip-off`, and stamp both teams' records.
2. Safe area: the lineup's ring inside x 48 (lineup at 56); the game's score group fully inside x 912.
3. Draw Right as an arrow, not ▶.
4. Move `Ends` off the poster art: under the poster, or only on the focused one, which is already in the column above.
5. Design the no-picture screen: the channel's logo large on a flat field in the logo's colour, with the programme
   title and time. Use the same layout for any title without a backdrop.
6. Wait about 250 ms of rest before swapping the full-screen picture, and limit how bright the picture can get
   behind the lineup, so walking the list doesn't flash the room.

**Borrow from F:**
- **The logo size.** Make the focused logo the hero, about 60–70 px tall (F's Severance logo renders at about 317 × 50 px, roughly twice A's), so the
  marquee really lights up as he moves.
- **The "tonight" strip in the library.** F's six small chips at the top of `browse.png` (with the one he came
  through marked) tell him where he is and how to get back, better than A's `↑ TONIGHT` eyebrow. Keep it to one thin
  row.
- **One clear primary button** on the focused line, a small pink pill with the verb, instead of `OK Resume` as text.
  That way the most important action looks pressable. (Optional: A's text hint works, but F's button is easier to
  read from 3 m.)

**Borrow from D:**
- **The count.** `Slow Horses · New this week · S6 · E6 · 3 new` tells him Right has more without a press. D's number
  chips do this well.
- **A touch of the glow**, carefully: a soft edge of the picture's colour behind the focused block, drawn from the
  same small 32 px copy, no blur. It's the brand's name and it costs almost nothing.

Built like this, A is the easiest Home to use, the clearest from the sofa, the cheapest to make fast on his TV, and
has the most memorable game night. With F's big logo and D's glow it keeps most of what made the other two exciting.
