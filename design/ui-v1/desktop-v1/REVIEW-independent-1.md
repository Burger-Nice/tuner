# desktop-v1: independent review 1

Reviewer: independent senior reviewer of desktop media apps (Windows, mouse and keyboard, streaming and sports, Electron).
I did not make this design. Read: `SPEC.md` (all of it), the twelve renders in `png/` (1920 × 1080, `12` at 1366 × 768),
the TV references (`home-final/png/04-game-night.png`, `player-v2/png/01-vod-playing.png`), and today's `main.js` /
`mpv.js` to judge the build plan. Not done: running the mocks at other widths, opening the HTML, or testing anything on Windows.

**Overall: 7.6 / 10.** A premium-looking, faithful translation of the TV app that already reads like a real Windows
product, with the right PC extras in the right order. Most of what holds it back is in the build plan (where the HTML can
and cannot sit over mpv's window), plus a handful of collisions and gaps that are visible in the mocks.

---

## 1. The design, screen by screen

### 01 Home, evening (1920)
- **Works.** The Marquee carries over intact: the lit Severance card with its real logo, the three dim lines, the picture
  answering behind. Swapping the TV's printed hints for real buttons (`Resume` · `Episodes` · `⋯`) is right for a mouse,
  and the one-time `Enter plays · right-click for more` caption is a good stand-in for the TV's hint bar. Type sizes and
  spacing on the 4 px grid look settled. Against Plex's desktop Home (a hero plus a stack of shelves with no hierarchy),
  this has a clearer "what's next for me" answer. It looks like Apple TV on the Mac, and better than it on the hero.
- **Off.** The sidebar (x 0–240) looks almost solid, which puts a hard vertical edge through the backdrop. The spec says
  84 % over the picture, but in the render the picture barely shows through. Apple TV on the Mac and Netflix's hero run
  the art under a translucent, blurred sidebar, and here the TV's full-bleed feel is lost at the exact spot the brand
  depends on ("scrims over art"). The band between the last line (y ≈ 530) and the row (y 870) is empty picture. That's
  fine as the Marquee, but nothing in it tells a mouse user the page scrolls apart from `Browse · 15 rows ↓` far at the
  right.

### 02 Home, game night
- **Works.** It's very close to the TV (`home-final/04`): the 12° split in the teams' real colours (Grizzlies navy,
  Blazers red), 220 px crests, the sharp card with `Watch live` · `From tip-off` · `Multiview` · `⋯`, and `Score hidden`
  everywhere it should be. "Watch his team's game" takes one click from launch, which is the best possible result.
- **Off.** The `ON NOW` / `Score hidden` plates (y 560) float in the middle of the field and belong to nothing. On the TV
  they sit under the crests and the names. At 1920 with the sidebar they drift away from the crests (x 1170–1540, while
  the crests sit at y 150–370). Move them up under the team names, or put them on the card. The TV's `Morant 27.8` stat
  line is gone from the card's second line, which is fine if it's a choice, but say so.

### 03 Live guide
- **Works.** This is the strongest PC translation in the set. It has a real 3-hour grid with a right-hand detail panel
  (the shape YouTube TV's and Plex's web guides use), with group chips, a date picker and a time-scale control. The panel
  has the right content: the crests on the teams' fields, `Remind me` / `Tune now` / `Multiview`, `Also on`, and
  `Earlier on this channel` with `kept` times.
- **Off (craft).**
  - The pink Now line runs straight through the titles of what's on now (`Kastljós`, `NBA Today`, `GameTime`,
    `Europa League`, `Panorama`, `No guide information`). In every serious guide, titles sit after the Now line or the
    line goes behind the cell text.
  - Titles are hard-clipped with no ellipsis (`Celtics at Knicl`, `Skaupið: upphi`, `Boxing: Fight N`, `BBC News at T`).
    The Stöð 2 cell `Íslan… 20:0!` is clipped mid-glyph, and the spec's under-56 px rule doesn't stop it at about 70 px.
  - The spec puts **channel numbers** (15, `text-3`) in the channel column, and the mock has none. On a PC where `0–9`
    tunes from anywhere, the numbers have to be visible.
  - Monogram tiles (`RÚ`, `S2`, `NL`) stand in for logos. That's fine for a mock, but say whether real provider logos go
    there.
  - The column is 280 px for names that need about 180.
  - `Favourites 10` is shown over 11 rows with only three stars.
  - The `HD` badge wraps onto its own line in the panel.

### 04 NBA hub
- **Works.** The broadcast-graphic hero (the angled team plates, `VS`, the pink tip-off slab) is the most "sports app"
  surface here and matches NBA League Pass's own pre-game cards in confidence. Four 378 × 176 game cards fit cleanly. The
  `Remind me is a Windows notification…` caption explains the PC difference in the TV's voice.
- **Off.** The hover discs (`▶ ⊞ ⋯`) on the Celtics card overlap the bottom of the time plate. The bottom 200 px of the
  page is empty with six games. That's fine, but a `Last night` strip or the standings peek could use it later.

### 05 Title page (series)
- **Works.** It's a good page: logo, facts with badges, a real 4-button row plus `⋯`, the copy line with the tick, a
  vertical episode list with resume bars, and `More like this` as a 4 × 2 grid. That's the Apple TV / Netflix web layout,
  done well.
- **Off.** The backdrop keeps full strength behind the episode list, so rows 1–2 (no surface) sit over Adam Scott's face
  and suit. Apple TV and Netflix fade the backdrop to the canvas by the start of the list. The list is cut at the fifth
  row with no sign that the page scrolls. Episode stills are stand-ins (already an open item).

### 06 Player, episode
- **Works.** It's the v2 bar, scaled correctly, with the PC additions in the right places: a volume slider that unfolds,
  the gear, mini player and full screen. The time bubble is on the track, and the hint line shows the PC's keys.
- **Off.**
  - **There is no visible way out of the player for a mouse.** The sidebar and the title bar's back arrow are gone in
    theater mode, so only `Esc` and `Ctrl W` remain. Netflix on Windows and Plex both put a back arrow at the top-left of
    the player, and this needs one.
  - The top scrim is too light. `S2 · E3 · Who Is Alive?` and the `4K` / `HDR` badges sit on the bright ceiling and the
    badges almost vanish. The TV's equivalent has larger type and is more legible, so strengthen the top-left scrim on
    the PC.
  - The hint line offers `G Game panel` on an episode. The hint line has to be per-context.
  - `21 min left` in the corner disagrees with `−25:50` on the track. This comes from player-v2, but fix it in both.
  - The player has no episode list button (Netflix has one). `⋯`/Options may cover it, but say where it is.

### 07 Player with the game panel docked
- **Works.** Docking the box score is the right PC idea, and the panel itself is clean. The as-aired plate, tabs, team
  toggle and table are well set, and the numbers add up (58 / 35 / 16 / 23-53).
- **Off.**
  - **The panel's header (`G` cap and `×`, top right) sits exactly where Windows' caption buttons (min / max / close,
    138 × 40) are**, and in 07 the caption buttons aren't drawn at all. You'd get two `×` buttons side by side, one
    closing the panel and one closing the app. The panel has to start under the title-bar strip.
  - The 16:9 picture in 1520 px leaves 112 px bands above and below, but the controls are drawn over the picture.
    Docked is a "watch with stats" mode, and the bar would sit better in the free band under the picture (pin the picture
    to the top so one 225 px band holds the bar and the hint line).
  - The bottom 40 % of the panel is empty. Show both teams stacked, or the latest plays under the table.
  - The hint line advertises `Ctrl Shift S Send to the other screen`, which is v1.1.

### 08 Multiview
- **Works.** It follows League Pass's multiview faithfully: a white border plus an `Audio` chip, numbered tiles, the
  shield on the tile strip, a provider stream count in the header, and a lovely waiting slot (`this slot tunes NBA League
  Pass by itself`). It beats anything he can do on a PC today.
- **Off.**
  - **The main flow, adding the second game, isn't designed.** `Add a game or channel` opens nothing that's drawn, and
    the empty-slot state isn't drawn either. "Drag a game card onto a slot" has no screen where cards and slots are
    visible together. League Pass solves this with a strip of tonight's games under the tiles. Add a picker (tonight's
    games plus favourite channels) to the empty slot and the header button, and make drag work from that strip.
  - The sidebar stays open in multiview. Multiview should fold it to the rail, which makes the 2 × 2 tiles noticeably
    bigger.
  - A finished game (`Mavs 109–118 Rockets · Final · post-game`) in a tile is odd. League Pass multiview is live-only.
    Keep it, but don't make it the showcase.

### 09 Mini player (plus Home's rows)
- **Works.** The rows view is the TV's, with real buttons and the row index at the right. The `Now playing` card in the
  sidebar is a nice touch. The mini player's copy (`Score hidden · Q3 as aired · 42 s behind`) respects the shield.
- **Off.**
  - In the mock, the mini player's strip and bar sit **over** the picture. The spec says they sit outside the video rect
    so that no overlay is needed. Both can't be true (see Buildability), so decide which.
  - The spec says a 9th poster peeks, but the row ends at 8 with blank space before the arrow.
  - The `Now playing` caption wraps badly (`ESPN · Score / hidden`).

### 10 Command palette
- **Works.** The grouping (Actions / Teams / Channels / Films and series / Settings) and the inline completion are right,
  and `Add … to multiview` / `Remind me 10 min before tip-off` as verbs is where a palette earns its keep (Raycast, Linear).
- **Off.**
  - The first row says **Watch** but shows `Remind me · Enter` at its right. One row should have one verb, and Enter
    should do what the row's title says.
  - `R` is shown as the shortcut on a row while the caret is in a text field, so pressing R types "r". Palette row
    shortcuts must be chords.
  - `Ctrl 3` is shown for the Grizzlies team page, but §8 makes `Ctrl 3` the NBA section.
  - The completion `gri|  zzlies` has a visible gap between the caret and the ghost text.
  - Films show monograms (`GM`, `TG`) where the spec says poster tiles.

### 11 Shortcut sheet
Clean, scannable and well grouped, and generating it from one key map (`keys.js`) is the right engineering call. The
conflicts are listed under Usability below.

### 12 Home at 1366
- **Off.** **The 320 × 4 progress bar runs across the top of the `Resume` pill and the `Episodes` button** (y ≈ 259).
  At 1366 the card at 206 px is too short for its contents. Otherwise the rail and seven posters scale correctly.

### Scaling 1366 → 4K
The rules are sound: CSS px with Windows' scaling on top, a sidebar fold at 1500, posters by count, and type that never
scales. One gap: art must be chosen by **physical** pixels. At 150 % on a 4K monitor the Marquee is 2560 CSS px at dpr
1.5, so `/background/large/` "at 1920" will look soft. Pick image sizes on `width × devicePixelRatio`. There's no 4K or
2560 render, so nobody has seen the wide layout. Render `01` and `03` at 2560 × 1440.

---

## 2. Usability with mouse and keyboard

| Task | Path | Verdict |
|---|---|---|
| Watch his team's game | Home's lit card `Watch live` (1 click); `Ctrl K` "gri" Enter | excellent; fix the palette's mixed verb |
| Resume a show | Home's lit card `Resume` (1 click), or title page `Resume S2 · E3` | excellent |
| Find a film | `Ctrl K` + type, or Movies (the library grid isn't mocked) | good; mock the library grid, it's a daily page |
| Multiview two games | Home / hub `Multiview` → then? | **not designed past the first tile** (see 08) |
| Leave the player with the mouse | none visible | **gap** (see 06) |
| Shortcuts | `?` sheet, tooltips with keys, hint line 5 times | good; conflicts below |

Key conflicts and surprises to resolve in `keys.js`:
- `Ctrl ← →` means two things: NBA sections (§5.2) and snapping the mini player (§8). Both apply when the mini player is
  up on the NBA page.
- `0–9` tunes a channel "everywhere", but `1–4` gives the audio to a tile in multiview. Scope the digits explicitly.
- `Esc` is "hide the controls, then leave" in the player and "back to theater" in full screen. Every Windows user
  expects the first `Esc` in full screen to leave full screen (Netflix, YouTube, VLC), so make that the rule.
- `P` and `0–9` are single letters in the "Everywhere" group, against the spec's own rule (single letters only inside the
  player, the guide and the rows). Either drop them from Everywhere or state the exception.
- Media keys through `globalShortcut` take Play/Pause away from Spotify and the browser **all the time**, even when
  airglow is idle in the tray. Register them only while something plays and release them at stop. Later, Windows'
  System Media Transport Controls give the media flyout and lock-screen controls too.

PC states that the mocks don't show and that need a frame before the build: the right-click menu, the Windows
notification toast and the tray menu, the multiview picker / empty slot, the Movies grid, and Account › Windows.

---

## 3. The PC extras

The set is right, and the v1 / v1.1 / later / no split is well judged:
- **v1:** multiview, the mini player, the docked panel, the guide, the palette, tray reminders.
- **v1.1:** second screen and thumbfast.
- **Later or no:** downloads, Discord, Cast.

Notifications plus the tray is the highest-value cheap item, and it's correctly v1. Two adjustments:
1. Don't advertise v1.1 in v1. `Ctrl Shift S Send to the other screen` appears in the hint line in 07 and in the sheet.
2. Consider an **"always on top" inside-the-window mini player**. While airglow is in front, dock the corner player
   inside the content (as YouTube does) and only float it as a top-most window when airglow loses focus. That avoids the
   mini player covering the app's own cards (09, the Celtics card) and halves the window juggling.

---

## 4. Faithfulness to the TV and the shield

Very high. The sections, words, art, the Marquee model, the as-aired score and `Score hidden` on every PC-only surface
(tile strip, mini player, notification, tray, palette) all match. §7's rule that every extra respects the shield is the
right wording. Two shield checks to add:
- A palette `Watch …` action row for a game that's on must never show the live score.
- Windows keeps old toasts in the Notification Center. A toast written before a game must not be updated later with a
  result (`Final · 112–104`), because the Action Center is a surface too.

---

## 5. Buildability (this is where the score drops)

The order is right (the `--wid` spike first, then the shell) and plans B / C are real. But plan A as written has three
problems that the spike will hit on day one:

1. **`--wid` on the top-level HWND makes mpv fill the whole client area.** mpv on Windows creates its child window inside
   the given parent and keeps it sized to the parent's client rect. Passing `getNativeWindowHandle()` of the main window
   means the video covers the sidebar and everything else, and multiview "`--wid` on the main window, one rect each"
   can't work. The proven pattern (how mpv is embedded in WinForms/Qt panels) is that **airglow creates one plain child
   HWND per picture** (a `STATIC`-class window through koffi's `CreateWindowExW`, no window procedure needed) at the
   video rect, passes **that** HWND to `--wid`, and moves the host with `SetWindowPos`. mpv then fills the host. Also
   pass the handle as an unsigned 32-bit value, as mpv's manual asks.
2. **Airspace: nothing in the main page can draw over a video HWND.** Today the spec moves only the player's controls
   into the overlay. That leaves out:
   - the **WCO caption buttons** in theater (06 draws them over the picture, but mpv's child will cover them);
   - the shortcut sheet over the player (11);
   - the palette (`Ctrl K` "from anywhere", including over multiview);
   - right-click menus on tiles, toasts, and tooltips;
   - multiview's border, chips and strips (the spec already places these in the overlay);
   - the mini player's strip and bar as drawn in 09.

   The rule to write down: **whenever any video rect is on screen, one overlay window covers the whole content area and
   hosts every floating thing.** In theater, keep a 40 px title strip above the video so Windows' real caption buttons
   (and their Snap Layouts flyout) stay drawable. Use that strip for the back arrow too.
3. **The overlay window will steal activation and lag.**
   - A separate top-level window takes focus on click. The main window's title bar goes inactive, and keystrokes go to
     the other renderer. Create the overlay with `focusable: false` (WS_EX_NOACTIVATE) so the keyboard stays with the
     main window.
   - Owned windows don't move with their owner, so the overlay trails the main window during drags and Snap animations.
     Hide it on `will-move` / `will-resize` and show it again after.
   - Click-through with `setIgnoreMouseEvents(true, { forward: true })` sends clicks to mpv's HWND, which has input
     turned off (`--input-cursor=no`). Pause-on-click, double-click for full screen and the wheel for volume would then
     do nothing. It's simpler to have the overlay keep all pointer input over the picture: paint a near-zero-alpha fill
     if Windows treats fully transparent pixels as click-through. Prove this in the spike.

Smaller risks:
- **Hand-offs open a second stream.** The mini-player and multiview hand-offs start a new mpv instance with 1 s of
  overlap. On a 1-connection account that second connection fails, and on any account it rebuffers. With per-picture
  host HWNDs, **`SetParent` the host into the other window** instead, keeping the same mpv instance, the same stream and
  no gap. This also makes "the audio tile becomes the player" true.
- **The copy checks (`--frames=1` probes) use connections too.** Count them against `max_connections` and pause them
  while multiview is full.
- **HDR.** A child-window d3d11 swapchain under Windows HDR is plausible but unproven. Add a 4K HDR file to the spike (it
  is listed) *and* check that the SDR overlay isn't dimmed over it.
- **Plan B (libmpv + shared texture into Chromium) is the most work and the least proven.** It's early-stage, has no
  performance figures, and needs `sandbox: false`. Keep it as the last resort, and order the fallbacks A → C → B, not
  A → B → C. Plan C is what `mpv.js` does today and is known to work.

The file-by-file table and the build order are clear and buildable once the three points above are folded in.

---

## 6. Scores

| Area | Score | Why |
|---|---|---|
| Looks and craft | 8.0 | premium and coherent; held back by visible collisions (1366 bar over the pill, panel vs caption buttons), the guide's clipping and the Now line through the text, an opaque sidebar cutting the art, and annotations printed in the renders |
| Clarity | 8.0 | the hierarchy is clear on every page; the palette's mixed verbs and the hint line out of context muddy it |
| Ease of use | 7.0 | the main tasks are one click; leaving the player with the mouse and adding a second multiview game aren't designed; key conflicts |
| PC extras | 8.5 | the right ones, sensibly split; media keys too greedy; v1.1 leaking into v1 |
| Faithfulness | 9.0 | words, art, the Marquee and the shield carried over intact |
| Buildability | 6.0 | good order and fallbacks, but plan A's `--wid` target, airspace and overlay focus are wrong as written |
| Brand fit | 8.5 | the tokens, the gradient pill, Outfit/Inter and the team fields are all on brand; the sidebar is the most generic surface |
| **Overall** | **7.6** | design first: a strong, faithful desktop design with fixable gaps; the architecture needs one more pass before the spike |

---

## 7. Fix list

### Must fix
1. **06/07, the player:** add a visible back/close control for the mouse (top-left), and keep a 40 px title strip in
   theater so Windows' caption buttons stay real and drawable over mpv.
2. **07, the docked panel:** start the panel's header under the caption area; never put the panel's `×` next to the
   window's close.
3. **12, 1366 Home:** the 320 × 4 progress bar overlaps the `Resume` / `Episodes` buttons. Re-space the card or move the
   bar above the facts.
4. **08, multiview:** design the add flow (picker in the empty slot and the header, the empty-slot state, a strip of
   tonight's games for drag-and-drop) and fold the sidebar in multiview.
5. **§9, plan A:** pass mpv a per-picture **host child HWND** that airglow creates and moves. Don't pass the main
   window's HWND, because mpv fills its parent.
6. **§9, airspace:** while any video is on screen, one overlay covers the content area and hosts everything that floats
   (palette, sheet, menus, toasts, tooltips, multiview chrome, mini-player chrome). Fix 09's mock or the spec so they
   agree.
7. **§9, the overlay:** `focusable: false` / no-activate, hide it while the window moves, and keep pointer input over
   the picture rather than clicking through to an input-less mpv.

### Should fix
1. **03, guide:** keep titles clear of the Now line (start the text at the line, or draw the line behind the text);
   ellipsis on every clipped title; hide text under about 80 px; show channel numbers; narrow the channel column to
   about 220; fix the `Favourites 10` count and the `HD` wrap.
2. **06, player:** strengthen the top-left scrim; context-aware hint line (no `G` on an episode, no v1.1 keys); make
   `21 min left` agree with the track; say where the episode list lives.
3. **10, palette:** one verb per row with Enter doing it; chord-only shortcuts on rows; `Ctrl 3` mismatch.
4. **Keys:** settle `Ctrl ← →`, scoped digits, `Esc` leaves full screen first, single letters in "Everywhere".
5. **Media keys:** register them only while playing.
6. **Hand-offs (mini / multiview):** `SetParent` the host HWND instead of a second mpv with 1 s of overlap. It saves a
   connection and a rebuffer.
7. **01/05:** a translucent, blurred sidebar over the Marquee and title art; fade the title page's backdrop to the canvas
   before the episode list.
8. **02:** move `ON NOW` / `Score hidden` up under the team names.
9. **Missing frames:** right-click menu, notification toast, tray menu, Movies grid, Account › Windows, a 2560 render.
10. **Art:** pick image sizes by `width × devicePixelRatio`.
11. **Plan order:** fall back A → C → B.
12. **Shield:** a reminder toast in the Notification Center must never be updated with a result.

### Nits
- Remove the designer annotations printed in the renders (05 bottom right, 06 bottom right, 07 panel footer, 08 footer,
  09 right).
- 04: the hover discs overlap the time plate.
- 07: fill the empty lower panel (the other team, or the latest plays).
- 09: the 9th poster should peek; the `Now playing` caption wraps (`Score / hidden`).
- 10: the caret-to-ghost-text gap; poster tiles instead of monograms.
- 02: the TV's stat (`Morant 27.8`) dropped from the card; fine if intended.
- §9: pass `--wid` as unsigned 32-bit (mpv's manual).
- No clock on Home (the TV's top bar has one); fine while the taskbar shows it, missed in full screen.
