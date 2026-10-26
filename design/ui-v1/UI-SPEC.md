# airglow TV UI v1.2: design spec

## v1.2 changes (polish after the second review and the brand check of v1.1)

1. **OWNER DECISION, team colours: the teams' real colours.** Owner: "team colours should stay imo its the teams colors like". This overrides the brand consultant's v1.1 modifications (NY, MIA and PHX moved to silver or gold; gold only as a 4 px bar; a non-red accent for red-family teams). A team plate is the team's **primary**, its 4 px bar the **secondary**, and the crest keeps both (Rockets red, Heat crimson, Suns orange, Thunder blue with a red-orange bar are all real now). Only the legibility safeguards stay: **(a)** a team colour is never within 8 px of a LIVE pill and never touches a focus ring (audit-enforced); **(b)** text on a plate is chalk or ink, whichever passes 4.5:1 (audit-enforced; Memphis' Beale Street blue `#5D76A9` fails both at 4.1 and 3.9, so the plate is that blue darkened to `#4E6799`, 4.9:1, and Thunder `#007AC1` (4.0) is `#006FB0`, 4.7:1); **(c)** LIVE is identified by its dot and the word, never by colour alone, so a red or orange plate cannot be mistaken for it. BRAND.md "UI-phase additions" item 1 should be updated to this.
2. **Slab (brand modifications kept).** The default slab is the **clock plate** (static gradient shape, ink text); the preview is opt-in. The preview is a plain **rectangle** of video capped at 75% luminance (a 25% bg-0 overlay), with the slant drawn on top by two static shapes (the 8 px gradient edge and a surface-1 wedge): no mask, no clip-path on moving pixels (`tv/home-preview.html`). The time is shown once: the clock plate carries "Q3 7:29" so the status row drops it; the pre-game hero shows the tip time once (slab "49 MIN / Tip-off 21:30", "VS" between the plates, "Tip-off" in the status row). Crest text has at least 3 px of clearance in its disc (discs 36 / 44 / 56, letter-spacing -0.05em).
3. **Focus ring against its neighbour.** Hero buttons now scale from their centre with a 16 px gap (detail rows 20 px). `tools/audit.js` checks every focus ring (5 px + 2 px air) against neighbouring buttons, chips, cards and rows; it catches the reviewer's collisions (re-tested by shrinking the gap) and reports 0 now.
4. **Home's peeking row.** The second row shows art, tile, LIVE, number and the title only (no meta), sits 12 px higher, and fades to the canvas over the last 34 px; the audit now flags any rail text sliced by an edge or ending below y 521. The detail pages' "More like this" row moved up so its text clears the overscan band.
5. **Live previews and provider connections** are specified in 3.5 and 5.3 (1.5 s dwell, one reused connection, off on a 1-connection account, off by default, a setting).
6. **Smaller:** search press count corrected (suggestions row sits between the field and the keyboard: H, A, ▲, OK = 8 presses, now true); the Grizzlies plate is Beale Street blue and the Warriors' royal blue, so the sides no longer read as one block; the player's Live games panel uses the hub's rule (only your team's score is hidden, other games show scores); the "latin-ext" claim is removed (the subset files are not in the brand assets; listed as an open item for the brand).
7. `PORT-NOTES.md` is the porting guide for `app/` and `android/`.

## v1.1 changes (revision after the three reviews of the final TV milestone)

1. **Spoilers in the player.** Opening the game panel on the game you are watching is the reveal, at the synced delay (no hidden state to un-hide). A shielded game you are *not* watching shows no score, **no points column, no Plays tab**; OK closes, Reveal is a button you move to. Sync score now lists **game clocks only** (no team, score or play), starts at the stored delay and collapses newer clocks behind one row.
2. **Backup feed.** When a game channel dies the card lists the game's other channels (ESPN, NBA TV) right there, best first and focused, no scores on it; Options gets "Other feeds for this game" and the banner "Feed 1 of 3".
3. **Collisions and clipping, and a check that finds them.** Fixed: detail pills over "More like this" (the column now flows), text into the slab (Home, hub, game page, hero sync line), Reveal on the slab (the game page has no slab), focus rings clipped in all 9 player panels and Filters (inset rings, 8 px clip room), "NBA Leag" (ellipsis on a block, not a flex row), the scroll bubble over a poster, 4K over the initials, digits touching in game cards. `tools/audit.js` now runs overlap, text-vs-box, slab-polygon, clipping, ring-clipping, safe-area and contrast checks (v1.2 adds ring-vs-neighbour, edge and team-colour checks) on **all 71 pages**: 189 findings on the v1.0 files (32 of them collisions, clipped text or rings, or contrast; the rest safe-area), **0** now.
4. **OK means one thing.** The action chip rewrites the hint bar's OK to "Switch" (and Back to "Dismiss"); the hidden game panel's OK closes, Reveal needs a move; VOD focus rests on the seek thumb (OK always pauses), Up next only binds OK when the controls are hidden; the guide's undo toast never binds a key ("Hold OK to undo").
5. **Brand must-fix.** Launch CSS is namespaced `.l-*` / `#l-*` (the v1.0 file collided with the app's top-bar mark and hero slab); the update card uses `lockup-chalk.svg`.
6. **Excitement** (reviewers: fit to goals 6.0, visual craft 5.5): real team identity (crest in the neutral disc, flat team plate and a 4 px team edge, rule in 3.4), a **broadcast-graphic hero** whose slab now carries content (a muted live preview, or the game clock when the preview is off), key-art stand-ins with printed-poster titles, full-bleed backdrops on both detail pages and the Home resume hero, programme art and channel tiles on the On now cards, a live preview in the guide, a score bug for "Score on picture".
7. **Should-fix, all done:** game-day Continue watching above On now (resume = Down, OK), Sync score in 3, hint bar inside the 5% safe area (text y 489 to 507), LIVE text on focused surfaces 5.2:1 (was 3.43), guide shows 6 real rows (was 5.5), offline = cached Home + slim notice, launch 4 s caption and 12 s offline card built, wedge above letters, no lockup + top-bar mark overlap, Cancel not focused, zap-direction setting (Account > Playback), Popular's Jump by rank bands, one deterministic channel-tile rule, radii all on tokens (8 / 12 / 16 / 24 / pill; the 2 px Sharp plate corner stays), phone glyph, search placeholder, 22:30 and 23:00 on the ruler, clock chip no longer looks like a button.
8. **Corrected claims:** Movies shows 6 captioned posters and the top of the next 6 (not 12); the guide shows 6 rows; the bubble reads "#720 of 4,812" (6 per row, so row 120 = title 720); channel tiles use one initials rule; the spec's "scrub bubble" wording, the native panel radius (16, banner included) and section 12's lockup row are fixed below.
9. Where I disagree with a review, it is listed in section 12 with the evidence.

Scope: **TV only**, unchanged (owner decision: phone and PC adaptations are on hold).


Every TV screen, the native player overlays, and the launch animation.
Inputs: brand v5.4 (`design/brand-v5/v5.4/`, `BRAND.md`, `tokens.css`, `BRIEF-for-UI.md`), `UX-BRIEF.md`, and the two milestone-1 checks (`UX-CHECK-m1.md`, `BRAND-CHECK-m1.md`). Where this spec departs from a brief, section 12 says why.

How to read it: every mock is real HTML/CSS at the TV's true CSS viewport (960 x 540, 2x), built on `tokens.css`. `ui.css` is the part meant to be ported. Renders are `png/*.png` at 1920 x 1080. `png/overview-final.png` is the contact sheet, `png/ia.png` the IA board, `launch/index.html` the working launch animation.

| Path | What |
|---|---|
| `ui.css` | components and layout on the brand tokens; only transform and opacity are ever animated |
| `kit/*.js` | markup builders for the mocks: `kit` (top bar, cards, game card, guide cell), `home`, `live`, `movies`, `detail`, `nba`, `game`, `screens` (first run, search, saved, account, update, states), `player` (native overlays), `art`/`data` (procedural key art and printed-poster stand-ins, team palettes, messy content) |
| `tv/*.html` | 46 TV screens and states; `player/*.html` 25 native overlay mocks; `launch/` the working launch |
| `tools/render.js` | `node tools/render.js tv/home.html` writes `png/tv-home.png` (needs Playwright). `tools/audit.js` checks every mock: one focus ring, node count, banned CSS, text below 14 px, **text overlap, text against boxes and the slab, clipping (text and focus rings), safe area, contrast** |

---

## 1. Principles (every decision answers to these)

1. **Open on the thing you came for.** Home's hero is one contextual item with its primary button focused at launch: your team's game, else resume, else the last channel. Cold launch to the game is one press.
2. **Live looks live, everything else is calm.** Red appears only as the LIVE pill. The Sharp dialect (12° plates, italic condensed scores) appears only in live and NBA places. (Apple HIG, Live-viewing apps.)
3. **The picture is sacred and spoilers are a mode.** In the player nothing passive covers the centre half (the muted score bug and subtitles sit at the edges); one panel at a time. One switch (the spoiler shield) covers every surface, and every score shows at the stream's synced delay.
4. **One job per axis.** Left and Right move along a row, Up and Down between rows, the top bar is one step above everything. The same key never changes meaning with hidden state: player OK is always the channel panel, and wherever a temporary chip or toast appears, the hint bar says what OK does while it is up (it never changes silently).
5. **Shelves are optional, one grid is enough.** At 960 x 540 one grid with Popular first and view chips shows 6 captioned posters and the top of the next 6 on the first screen (12 in two presses), with about a tenth of the nodes of six shelves. (The UX brief adopted this over its own shelves page.)
6. **Cheap to draw.** 9 to 250 UI nodes per screen (audit), no filters or blur, no soft shadows, animation on transform and opacity only.

## 2. Research behind the structure

(P) = the primary page was read; (S) = a secondary summary, treated as a hint.

| Source | Fact | Used for |
|---|---|---|
| [Apple HIG, Layout](https://developer.apple.com/design/human-interface-guidelines/layout) (P) | tvOS safe area 60 pt top/bottom, 80 pt sides; grids use 40 pt gutters and at least 100 pt between rows; make partially hidden content symmetrical | 48 x 27 safe area (brand), 24 px gutters, row pitch 252, rows bleed off the right edge |
| [Apple HIG, Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) (P) | tab bar at the top; live apps order tabs Live first; do not hide or disable tabs; Menu returns focus to the bar | Top bar, Back model |
| [Apple HIG, Live-viewing apps](https://developer.apple.com/design/human-interface-guidelines/live-viewing-apps) (P) | live first and one step from playback; mark live; progress for in-progress live; EPG opens on the current programme; favourites group; content footer for browsing while playing; instant feedback on channel change | Hero, LIVE pill, progress bars, now line, Favourites, mini guide, zap card |
| [Apple HIG, Remotes](https://developer.apple.com/design/human-interface-guidelines/remotes) (P) | Back opens the parent screen; page up/down browses the EPG and changes channel in playback; ignore inadvertent taps in live video | Key map |
| [Apple HIG, Playing video](https://developer.apple.com/design/human-interface-guidelines/playing-video) (P) | no loading screens if avoidable (black + spinner after 2 s); resume without asking; exiting lands on a detail view; translucent overlays, short (image retention) | Launch hold, resume rule, VOD overlays |
| [Apple HIG, Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields) (P) | tvOS: keyboard on top, results beneath; give suggestions, nobody wants to type | Search |
| [Apple HIG, Focus and selection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection) (P) | focus is not selection; five states; ring for fields, highlight for lists; padding for the scale | Selected vs focused, row focus |
| [Android TV: Layouts, Cards, Tabs, Navigation drawer, Navigation on TV, Focus system, Color on TV](https://developer.android.com/design/ui/tv) (P) | 960 x 540 dp, 5% margins, 16:9 and 2:3 cards, peek, 20 dp gaps; pill tabs for pages; rail 3 to 7 destinations; Back goes to the previous destination with no confirmation and no on-screen back button; one focus, scale 1.025 to 1.1; test in Standard picture mode, avoid banding | Whole system |
| [WCAG 2.2, 1.4.3 and 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) (S) | 4.5:1 text, 3:1 non-text | Brand tokens (checked by the brand script) |
| UX brief sources S1 to S51 (UX-BRIEF.md) | zap time below 0.43 s is "good", 2 s video start abandonment, EPG grids orient fastest, YouTube TV hold-OK last channel, spoilers leak through thumbnails and records | Press counts, AC tables, shield scope |
| Netflix device UI notes 2011 to 2013 (S) | design for the weakest device; transforms paint into GPU layers so layer size matters | Performance rules |

## 3. Layout system

Canvas 960 x 540 CSS px (1920 x 1080 device). 1 rem = 16 px. Safe area x 48 to 912, y 27 to 513. Interactive content never leaves it; art and rows may bleed.

| Element | Value |
|---|---|
| Top bar | y 32 to 72 (40 high pills so a 5 px ring stays inside y 27). Mark `mark-small.svg` 28 px, then Search, Home, Live, NBA, Movies, Series, Saved; Account avatar 36 px at the right. Tabs Outfit 500 18, selected 700 with a 3 px gradient underline inset 16. NBA carries the compact LIVE pill only while your team is live |
| Page header | y 80 to 120: head title (Outfit 700 28), count and "English first" in caption, then Sort, Filters, Jump pills (36 high) |
| Chip row | y 128 to 164, 8 chips (36 high, 8 gap), inside 48 to 912 |
| 2:3 poster | 124 x 186, radius 12, 6 per row, 24 gap (6 x 124 + 5 x 24 = 864). Caption 14 px below the art (title Inter 650 16, meta 14); row pitch 252 |
| 16:9 card | 198 x 111 (detail, More like this) |
| Home rail card | 198 x 100, radius 16, 24 gap, four across plus a peek at x 928. **Text at the top** (tile, LIVE, number, title) so the second row still reads when only its top half shows; art under a top-heavy scrim; progress flush at the bottom |
| Game card | 272 x 124, three across, 24 gap; crest 32 in the neutral disc, 4 px team edge on the card's left, score plate 88 x 80 with 32 / 34 digits |
| Episode card | 200 x 112 |
| Hero plate | 864 x 192 at y 80 (radius 16, surface-1): status row y 12, team plates y 44 to 116, buttons y 132; the slab is the right 224 to 260 px (section 3.5) |
| Guide | Now panel y 80 to 152 with a 128 x 72 preview tile; ruler y 158; channel column 208, time axis 656 px = 2.5 h (4.37 px/min) with "now" at the left edge; **rows 48 + 4 gap, 6 rows, the last ends at y 500** (v1.0 claimed 6 and showed 5.5) |
| Sheets | float inside the safe area: right sheet 420 wide at x 492 to 912, left sheet 340 at 48, top 27 bottom 27, radius 16, bg-1; menus 300 to 560 (radius 24). A scrolling sheet body keeps 8 px of clip room so a 5 px ring is never cut |
| Native panels | left 352 (channels) or 320 / 360 (options, sync), right 280 (game) or 264; **height = content, capped at 453** (y 27 to 480); banner 64 high; hint bar text y 489 to 507 (inside the 513 safe line) on a 56 dp scrim that fades up from the bottom edge |

**Gutter rule (AC-F3):** a focused 124 px poster scaled 1.05 plus its 5 px ring needs about 8.2 px on each side; gutters are 24 (12 each side to the neighbour). **At the left and right edge the scale grows inward** (`transform-origin` left for the first column and rail card, right for the last), so a ring never passes x 43 / 917. Chips, rows and every list row use ring only (or the inset ring), no scale, so rows never change size when focus moves.

### 3.1 Type (brand tokens, nothing new)

| Where | Token | Size / line |
|---|---|---|
| Detail title | display | 40 / 44 Outfit 700 |
| Page title | head | 28 / 32 Outfit 700 |
| Row title, dialogs | title | 22 / 28 Outfit 700 |
| Buttons | Outfit 700 | 17 |
| Card and cell titles, poster title | Inter 650 | 16 / 20 |
| Meta, times, channel names in the guide, box-score cells, setting values | caption | **14 / 18** (brand floor since v5.4) |
| Body (plot) | body | 16 / 24, text-2, 2 lines on detail pages (3 elsewhere) |
| Eyebrows | label | 14 / 18 caps +0.08em |
| Badges only (LIVE, 4K, HD, CC, TV-MA, +3, crest abbreviations, episode numbers) | badge | 12, caps, 650/700, 5 characters or fewer (the audit enforces the length) |
| Scores (Sharp only) | score | 56 / 52 in heroes, 32 / 34 in game cards, 30 in the player plate, 24 in the score bug |

`tools/audit.js` flags any text below 14 px that is not one of those badges: none found. LIVE text on a focused surface (surface-3) is `#FFBABA`, 5.2:1 (v1.0 used `--a-live-text` there, 3.43:1); everywhere else the brand token stands.

### 3.2 Focus, selection, states

- **Focus** = `--a-focus-ring` (3 px white, 2 px canvas gap) plus scale 1.05 on posters, 16:9 cards, game cards, episode cards, primary buttons (`.f`). **Ring only** on chips, tabs, pills, list rows, fields (`.f-ring`). **Inset ring** on guide cells and keyboard-style dense rows (`.f-in`, approved variant: only where gaps are 8 px or less; no scale; fill moves to surface-3).
- **Selected is not focused.** Persists after focus leaves: chip = surface-3 + pink dot + pink-text; tab = gradient underline; radio = pink dot; toggle = gradient track + ink knob + the word On; guide channel = surface-2. Selected and focused show both.
- **Exactly one ring per screen** (audit: every mock passes; the only exceptions are the HUD-style player overlays that take no focus: banner, zap card, action chip, reconnect, subtitles). When a sheet opens, the opener loses its ring and the sheet's first row takes it (F6).
- **Hold OK** (500 ms) shows the pressed state at 150 ms, then a context menu with **Save to Saved first and focused**, so hold then OK saves (2 presses). The guide's hold OK toggles a favourite and shows an undo toast in the Now panel ("Added to Favourites · Hold OK to undo", 4 s, never takes focus and **never binds OK**: undoing is another hold, so a plain OK still tunes).

### 3.3 Imagery (new in v1.1)

The owner asked for TV that screams TV, shows and movies. v1.0 was text on grey. The rule now: **every surface that shows a programme, a game or a title shows a picture of it, and every picture sits under a flat scrim that makes the text pass 4.5:1.**
- Posters are printed-poster stand-ins (`Art.poster`: scene, flat dark gradient over the lower third, a stand-in title treatment); the caption under it stays the real title. The app uses the provider's poster.
- Detail pages and the Home resume hero use a full-bleed backdrop (the provider's TMDB art, here a stand-in scene) with a flat left-to-right scrim (bg-0 to 12%) and a bottom scrim; the column on top flows, nothing is positioned by hand below the title.
- On now cards carry programme art (the provider's frame or a category scene), the channel tile, LIVE, the title; the guide's Now panel carries a muted live preview.
- No blur, no filter, no animation on any of it: art is decoded once at display size, scrims are static two-stop gradients.

### 3.4 Team identity (v1.1, **revised by owner decision in v1.2: the teams' real colours**)

| Where | What |
|---|---|
| Mark | The app shows the ESPN logo (500-dark, from `app/nba.js`) inside the brand's **neutral disc** (surface-3). The mocks draw a stand-in crest in the team's two colours inside the same disc (56 in heroes, 44 in the game header and the player plate, 36 in cards). Logos are never recoloured |
| Plate | A flat **team plate** (the Sharp 12° parallelogram, text upright) behind each side of the hero and the game header: field = the team's **real primary**, 4 px underline = its secondary. Text on it is chalk or ink, whichever passes 4.5:1 (`Kit.textOn`); where neither passes the primary is darkened just enough (Memphis `#4E6799`, Thunder `#006FB0`) |
| Edge | A 4 px bar in the team's secondary on the left of each team row in a game card |
| Safeguards (the only rules left) | A team colour is **at least 8 px from any LIVE pill** and **never touches a focus ring** (a card's own ring may surround its own edge). Text on a plate passes 4.5:1. **LIVE is never identified by colour alone**: it is always the dot, the word and the 2 px outline, so a red or orange plate (Rockets, Heat, Suns) cannot be mistaken for it. Flat colour only: no gradient, glow or team colour on a button, ring or selected state |

Data: `kit/data.js` `TEAMS` (`c1`, `c2` crest; `p` plate; `a` bar). **Owner decision**: "team colours should stay imo its the teams colors like". This supersedes the brand consultant's v1.1 modifications (silver for NY and PHX, gold for MIA, gold only as a 4 px bar, non-red accents for red-family teams). Grizzlies vs Warriors: Beale Street blue against royal blue, with a yellow and a gold bar, so the two sides read apart.

### 3.5 The slab earns its place (v1.1; preview rules revised in v1.2)

The pink 12° slab used to be an empty block, the brightest object on Home. It now always carries content. **Default = the clock plate**: a static gradient shape with the game clock (Barlow italic, ink on the gradient; "Q3 7:29", "Live · synced", or "Score hidden" under the shield) or, before the game, the minutes to tip-off ("49 MIN / Tip-off 21:30"). The clock is shown **once**: when the slab carries it the status row does not. The slab appears on **Home and the NBA hub heroes only** (the game page has plates and no slab). Its width is at most 26% of the hero (243 px at the bottom, 201 px at the top).
**Live preview (opt-in: Account > Playback > Live previews, off by default until the TV test passes)**: a muted video **rectangle** (the player's own surface, one provider connection) capped at 75% luminance by a static bg-0 overlay at 25%, with the slant drawn on top by two static shapes (the 8 px gradient edge and a surface-1 wedge over the video's corner). **Never a masked, clipped or skewed video** (`mask`, `clip-path` or `transform` on moving pixels are banned; the weak compositor cannot afford them). The first 1.5 s show the still frame so the eye settles on the focus ring first. Previews dim after 30 s without a key and stop after 3 min.
**Preview and the provider's connection limit** (hero and guide preview alike):
- **Dwell 1.5 s or more** before any preview starts (v1.1's guide used 600 ms, which could open a stream a second while scrolling). Moving to another row cancels the pending start.
- **One preview connection, reused**: changing channel swaps the stream URL on the same surface, never a second stream; the same surface is handed to the player when OK is pressed, so the player never needs a second connection either.
- **Off when the account allows one connection** (`max_connections` = 1 from the Xtream login, or while another airglow client holds a slot): the slab shows the clock plate and the guide tile shows programme art; the setting row says why. Account > Provider already shows "Connections 1 of 2".
- **Off as a setting** (Account > Playback > Live previews, default off), off for the session after any "max connections" or 4xx from the provider, and never while the player is open. About shows the live connection count for diagnosis.
- Never for a channel that carries your shielded game (the broadcast shows the score).

## 4. Motion (transform and opacity only; reduced motion = 120 ms opacity fade)

| Moment | Property | ms | Easing |
|---|---|---|---|
| Ring on/off | instant swap of box-shadow class, no transition | 0 | n/a |
| Card lift | transform scale 1 to 1.05 | 200 | `cubic-bezier(.2,.7,.2,1)` |
| Chip, pill, press | background swap | 120 | same |
| Top bar hide/show | translateY(-100%), opacity | 200 | same |
| Row scroll vertical | translateY of the page, target row aligned to y 176 | 320, **0 while a key repeats** | same |
| Rail scroll horizontal | translateX, fixed focus position | 200, 0 on repeat | same |
| Tab switch | page cross-fade, after a 250 ms dwell and only if rendered from cache | 200 | same |
| Sheets and menus | translateX(24 px) to 0 plus opacity | 320 | same |
| Native panels | same, 24 dp | 200 | same |
| Live wipe | 12° slab translateX | 280 | `cubic-bezier(.7,0,.2,1)` |
| Launch | see section 8 | 1100 | |

Never animate width, height, top, left, box-shadow or filter. `will-change: transform` is set on the focused element and removed on blur. While a direction key repeats (F10): no smooth scroll, no lift animation, ring moves instantly.

## 5. Screens

Each screen: purpose, layout, states, keys. Keys: ▲▼◀▶ move, OK activate, hold OK = menu, Back, Menu = Sort/Filters/Options alias, CH± = page. Entry focus is named per screen.

### 5.1 First launch and sign-in (`tv/first-*.html`, `tv/update.html`)
Welcome (gradient lockup on bg-0 at 64 px, "Add your TV provider", primary **Use your phone**, secondary Type it here, Load an M3U link) → phone path (QR + `192.168.1.23:8765` + code 4821, three numbered steps, a "Waiting for your phone" bar; the TV app serves a one-page form on the LAN) → fallback type path (one "Provider link or server" field that fills the rest from a pasted `get.php` link) → verifying (steps with ticks; Home opens as soon as channels are in; **nothing is focused**, it is a progress screen: "Back cancels" is printed, a stray OK cannot cancel the sign-in) → **Three quick choices** (your team, spoilers Off / My team / All games, languages shown first; entry focus is **Done**, "Back keeps these and skips ahead"; choices are selected, not focused). Entry focus on Welcome: Use your phone. **Phone path: 4 steps, 2 on the TV** (OK on Use your phone, scan and Send on the phone, OK on Done), under 90 s. The type path has no on-screen Back button (Back is the remote key). Welcome shows a faded row of posters so the first screen already looks like a TV app. The lockup uses the gradient file on bg-0 only; the mark is not shown separately.

### 5.2 Home (`tv/home*.html`)
Hero priority (owner's game first): **your team from 3 h before tip-off to 30 min after the final** > resume > last channel. Other live games lead the On now row, not the hero. **The hero is decided from the cached schedule before first paint and locked for the first 3 s**: live scores may update inside it, but the focused button's action never changes under the user's thumb (review S3-4).
- *live*: a broadcast graphic. Status row (LIVE, "NBA · Q3 · 7:29", "Synced · 42 s behind live"), two **team plates** (crest, name, record) with the Barlow italic score between them, primary **Watch live**, secondary Box score, caption "On NBA League Pass 4 / Hold OK for 2 more channels". The right 243 px is the **slab: the clock plate by default**, a muted preview only when Live previews is on and the account allows it (3.5).
- *shield*: the score becomes a "Score hidden" tile, the sync line disappears, the slab shows the game clock ("Q3 7:29", ink on the gradient) and "Score hidden" (the status row drops the clock: shown once), the preview is off (the broadcast has the score on it), the secondary becomes **Reveal score**.
- *pre*: status "Your team · NBA · Tip-off", "VS" between the plates, the slab shows **"49 MIN" and "Tip-off 21:30"** (the time appears once), **Watch pre-game**.
- *choose*: no channel known: primary **Choose channel** opens the sheet (EPG match first, then NBA / League Pass channels, then your Sports group); secondary **Open guide**; the pick is remembered per team.
- *resume*: no game: full-bleed key art in the plate, **Resume** (focused), Start over, Details, progress and minutes left.
Below, two rails of 198 x 100 cards: on a **game day Continue watching is first** (resume = Down, OK: 2 presses), then **On now** (favourites first). The second row is a **peek**: art, tile, LIVE, number and the title only, 12 px higher than in v1.1 and faded to the canvas over the last 34 px, so no half glyph meets the edge; the full card text shows when the row is focused and scrolls up. With no game On now is first. A finished episode becomes the next one; the hero's own title is not repeated in the rail. Entry focus: the hero's primary button, from launch, from Back and from the tab. Keys: OK on a card plays; hold OK menu; Up from the hero = bar.

### 5.3 Live guide (`tv/live*.html`)
Now panel (display only, so no extra stops): a **128 x 72 tile**: programme art by default, a muted preview of the focused channel only when Live previews is on (3.5: 1.5 s dwell, one reused connection, off on a 1-connection account; **off for a channel that carries your shielded game**: "Preview off for your game"); the "Preview" label is dropped (a muted picture needs none), programme, LIVE, channel, times, time left, progress, one-line description (hidden under the shield). Ruler row: group chip at the left (reachable with **Up from the first row**, no Menu key needed), "Now" flag and a 2 px pink line behind the cells, times every 30 min. Rows: channel number, 32 px logo tile, name (two lines), star or pin; your team's game is **pinned first**. Programme cells are positioned by time, inset focus ring; cells under 36 min show the start time only, cells under 56 px show no text (a silhouette; the full title is in the Now panel); missing guide = one dashed "No guide information" cell, still tunable.
Keys: ◀▶ along time (◀ at the now column goes to the channel column, never the bar), ▲▼ channels, OK tunes the current programme or opens info for a future one, hold OK toggles favourite (toast "Added to Favourites · Hold OK to undo", never binds OK), CH± pages six rows (±2 h along the axis), 0 to 9 jump to a channel number, OK on the group chip opens the group list (left sheet, Live games, Sports, News, UK…). **The selected group is the zap ring** and the banner names it ("Favourites · 3 of 10"). Entry focus: the current programme cell of the last channel.

### 5.4 NBA hub and game page (`tv/nba*.html`, `tv/nba-game*.html`)
Hub: day strip (chips; ◀▶ change day), then **the same broadcast-graphic hero as Home** (plates, score, slab preview; here with Box score, Plays and the two leaders), then "Tonight" as a 3-up grid ordered live, upcoming (relative time "In 49 min"), final. A game card is an upright Soft card with a crest, a 4 px team edge, and a skewed (-12°) score plate holding upright numbers; **under the shield** the plate shows an eye-off glyph and "hidden", finals read "Ended" with no "OT" and no winner emphasis, records are frozen. Counts ("2 live · 2 later · 3 final") never spoil.
Game page: compact header (status, team plates, score, one primary **Watch live**; shielded: "Score hidden", **no Reveal in the header**, the focused **Reveal score** is in the body card; no slab on this page), tabs **Grizzlies · Warriors · Plays · Team stats** (◀▶ switch), body upright: 8-row box score at 14 px, plays (scoring plays in chalk with a pink dot, the clock as plain text, not a pill), team-stat bars (gradient for your team, border-strong for the other). Tables are never skewed (brand rule): **only the plates slant and the dialect holds**. Entry focus: your team's game card (hub), the first tab (game).

### 5.5 Movies and Series (`tv/movies*.html`, series uses the same builders)
One screen: header (title, count, **Sort Popular**, **Filters (n)**, **Jump**), 8 view chips (All, New in English, Top rated, 4K, four genres) that write into the same Sort/Filter state (selecting a chip clears conflicting choices, the Filters count reflects it, so nothing is filtered in two places), and the 6-column grid. One card per title: tag 4K top-left, **+N versions** top-right (otherwise a language tag), resume bar flush, a printed-poster stand-in (the app shows the provider's poster; the caption below is the real title; the initials tile, with the quality tag above it and the title below, is the fallback). **First screen: 6 captioned posters and the top of the next 6; two presses reach 12.**
- **Sort** (menu): Popular (default, "IMDb, this week"), Top rated, Newest, Recently added, Title; below it the persistent **English first** toggle.
- **Filters** (right sheet 420, scrolls): Language, Genre, Quality, Subtitles, IMDb, Decade; **every chip shows its live count and zero-count chips are disabled** (surface-2, text-4, never hidden); "N active" and Clear all at the top; pinned **Show 214 titles**. Back keeps the changes and closes.
- **Jump** follows the sort: top of list, then **rank bands for Popular (Top 100 · 101–500 · 501–1,000 · The rest)**, years for Newest, letters for Title, rating bands for Top rated, months for Recently added (v1.0 said "Popular is grouped by year", which it is not).
- **Scrolled**: bar and header slide away; a 14 px context line stays ("Movies · Popular · 3 filters"); while Down is held more than 1.5 s a **scroll bubble** shows in the context-line band, top right (y 27 to 71, right edge 912), never over a poster: the sort key and position ("#720 of 4,812 · Popular"; "7.4" for Top rated, "2019" for Newest, "M" for Title; 6 titles a row, so row 120 is title 720). It appears only while a key repeats and 600 ms after (120 ms fade). The grid starts at y 84 so the bubble and the first row never meet.
- **Hold OK on a card**: menu with **Save to Saved** (focused), Mark watched, Details.
Entry focus: first card. States: no results ("Nothing matches these filters" with Remove last filter / Clear all), no art (initials tile), unavailable version hidden.

### 5.6 Detail (`tv/detail-*.html`)
**Full-bleed backdrop** (the provider's TMDB art; a stand-in scene here) under a flat left-to-right scrim. The column **flows** (no hand-set tops below the title): eyebrow (type and genres), title, meta (rating, year, runtime, tags), plot (2 lines), one credits line (ellipsis), actions, pills, then 24 px of air before "More like this" (the v1.0 pills sat on its heading). **Play** or **Resume 1:12:40 + Start over** (focused), **Save**; second row: **version pill** ("English · 4K HDR") that opens the version sheet (language, quality, subtitles, size; default = your language at the best quality this TV decodes; remembered per title; shown only when more than one version exists), and the **Subtitles: English** pill; the resume state's "54 min left" lives in the same reserved row, so nothing moves. Series: the same column, Resume S1 · E3, season chips, the episode row (number, watched check and dimmed art, resume bar on the current one; next-up focused when entering from Continue) and **a one-line synopsis of the focused episode** under it. Back returns to the card that opened it.

### 5.7 Search (`tv/search*.html`)
Left: field with a mic key first, 6 x 6 keyboard (A to Z, 0 to 9, 52 x 40 keys) and Space / Delete / Clear. Right: after two letters a **suggestions row of completed titles sits between the field and the keyboard** (▲ from the top key row reaches it), so "harb" is **H (▼ ▶ OK), A (▲ ◀ OK), ▲, OK = 8 presses** instead of 24 to 28. v1.1 put the row beside the keyboard and its claim of 8 was really 13 (6 Rights), then Top result (poster, meta, Play), On TV (guide titles, next 24 h), Movies and series (rows; **the top result is not repeated, and only word-prefix matches rank**: "harb" finds Harbor Lights, Harbour Rescue and Cold Harbour, never Tidewater). Results update after every letter (target 150 ms). Empty: Recent chips and Trending posters; none: "No results for …" with Clear. Entry focus: **A** (the mic is one Up away). The mic key launches `RecognizerIntent.ACTION_RECOGNIZE_SPEECH`; KEYCODE_SEARCH on the remote opens Search with the mic listening. The placeholder is "Search everything" (16 px, no tracking, one line). Right goes to results, Back clears focus to the keyboard then leaves (query kept 10 min). Matching normalises accents, punctuation and prefixes ("spiderman" = "Spider-Man").

### 5.8 Saved (`tv/saved.html`)
Chips Channels · Movies · Series · History. The Channels page is where the favourite order is set: rows with a grip, the focused row **lifts** (ring, 1.02) and ▲▼ move it, OK drops, Back restores. The side card says what the order drives: On now, the Favourites guide group, the zap ring when tuned from Favourites.

### 5.9 Account (`tv/account*.html`)
Two panes: groups (Provider, Playback, NBA, Languages, Home rows, Updates, About) and a list of 56 px rows. **Playback** (`tv/account-playback.html`): **Up arrow in the player (Next channel / Previous channel)**, stream format, **Live previews** (off by default), match frame rate, user agent. Back from Account scrolls to the top and focuses the avatar, then leaves. The Updates row is itself the button ("Update now ›"), not a button inside a row. Provider: status pill, expiry and days left, connections "1 of 2", switch/add account, refresh, sign out. **NBA**: your team, **Spoiler shield (Off / My team / All games)**, Score on picture, **Score delay per channel** ("NBA League Pass 4: 42 s behind live"). Updates: version, "airglow 1.6 is ready", automatic download. A white dot on the avatar and the Updates group shows an update is waiting. Entry focus: first row.

### 5.10 Update prompt (`tv/update.html`)
Downloaded in the background; offered **only at a natural break**: the next cold launch before Home, as a card with the **chalk lockup (`lockup-chalk.svg`, 48 px; the gradient wordmark is for bg-0 only and this card is surface-1)**, one line of news, **Update now** / Later (asks again after 24 h). Never over the player, never in your team's game window, never by taking focus on another screen (F8).

### 5.11 States (`tv/state-*.html`)
Loading = flat surface-2 blocks, no shimmer, only on cold section loads (cache-first makes them rare); focus stays on the current tab. **Offline with a cache = Home as airglow last saw it** (no LIVE pills, no scores) with one slim bar "Offline · showing what airglow remembers · Try again" (Try again focused); the full "Can't reach the server" card appears only on a first start with nothing cached (`png/launch-off.png`). Subscription ended (Switch account, Refresh). Empty filters. No-art fallback. Native: "Reconnecting, attempt 2 of 6", then on a game channel "This feed stopped" with **the game's other channels** (section 7), on any other channel "This channel stopped" with Try again and Next channel inside the player.

## 6. Cross-cutting rules

- **Zap direction:** Up = next channel by default; Account > Playback swaps it (the banner, mini guide and zap ring follow).
- **Back:** overlay/sheet closes and restores the opener; detail returns to its card; **anywhere in a tab's content: scroll to the top, show the bar, focus the tab**; another tab goes to Home with the hero focused; Home exits. Game time from deep in a grid is Back, Back, OK = 3 presses.
- **Focus (F1 to F11):** one ring; memory per row, tab and page; edges stop and an auto-repeated key never crosses a container boundary; data never moves focus; nothing steals focus (updates, toasts, score refreshes).
- **Spoiler shield (AC-B1):** hero, game cards, game page, NBA hub counts, guide descriptions, **guide and hero previews of the game's own channel**, toasts, records, "OT", leaders, plays, and anything that adds up to the score (a points column) are covered. Reveal with hold OK > Reveal, or a Reveal button you have to move to; **never a plain OK**.
- **In the player (v1.1):** ▶ on the game you are watching *is* the reveal (you chose to look): the panel shows the score, points and plays at the synced delay and nothing is hidden or hideable inside it. ▶ on a shielded game you are not watching shows the hidden panel: no score, no PTS, no Plays tab, MIN / REB / AST only; OK or Back closes, ▼ then OK reveals (this game, this session). Live games lists shielded games without scores. The Sync list shows clocks only.
- **Single-meaning OK:** a temporary element (action chip, Up next, the guide toast) never takes OK away from the screen silently. The chip and Up next are the only ones that bind OK, and while they are up **the hint bar's OK label is rewritten** ("OK Switch · Back Dismiss", "OK Play now"). Up next binds OK only when the VOD controls are hidden; with the controls up, "Next episode" is a button in the bar.
- **Score delay (AC-B2):** remembered per channel (first value 60 s); while a game is watched every surface shows it at that delay; Options > Sync score stores a new one. **Switching to another feed of the same game uses that channel's own stored delay** (or the 60 s default), which is why a failed feed is never switched automatically: the score would silently jump.
- **Titles and names (UX 4.9):** strip `EN|`, `US:`, `|EN|`, `┃NL┃`, `FHD/UHD/4K` (becomes a tag), `ᴴᴰ`, years in brackets (become meta), MULTI-SUB; sentence-case ALL CAPS; merge versions into one card.

## 7. Native player (Android, Media3), `player/*.html`

dp = CSS px on the 960 x 540 canvas. Colours are brand tokens. Each element below maps to a plain Java view; there are no blur, no gradients except the 4 dp progress, the seek bar fill and the hint-bar scrim, and no images except channel logos and team logos. Panels are `bg-1` at 92 to 94% over the video, border 1 px `--a-border`, **radius 16 for every native panel, the banner and the chip included** (the brand consultant's S5; the Home plates' 4 px and 8 px corners stay on the TV screens). Only one panel at a time; nothing passive covers the centre 50% of the picture; the hint bar and panels are removed after 5 views of each. **Panel height = content, capped at 453 dp (y 27 to 480)**, so a 3-row Audio panel is not a 471 dp slab. **Focus inside a panel is an inset 3 dp ring over a `surface-3` fill with no scale**, so rows never change size and the ring cannot be clipped (draw it as a 3 dp stroke inside the row's `GradientDrawable`; v1.0 scaled the row and the panel's `clipChildren` cut the ring in 9 panels). Radio, check and seek tint = `#F95BAC` (solid, not the gradient). The hint bar's text sits at y 489 to 507, inside the safe line (513); its scrim is 56 dp tall and fades up from the bottom edge.

| Overlay | Position / size | Content and views | Timing |
|---|---|---|---|
| **Zap card** | centre, wraps content | logo tile 56, channel name Outfit 700 22, now title 16 `text-2` (a `LinearLayout` horizontal; shown instantly on key down, never black) | until first frame, min 600 ms |
| **Banner** | left 48, top 27, right 48, 64 high, radius 16 | number (Inter 700 24) · logo tile 44 · name 16/20 650 + ring name "Favourites · 3 of 10" 14 + now title, times and **"Feed 1 of 3"** when the programme is a matched game · 4 dp gradient progress 120 wide + "Next 22:00 NBA Postgame" 14 · tags HD, CC · LIVE pill | 4 s, instantly on zap |
| **Hint bar** | bottom, text y 489 to 507 | key caps (surface-2, chalk 14, radius 8) + labels 14 `text-2`: `OK Channels · ◀ Options · ▶ Game · ▲▼ Zap · Hold OK Last` | with the banner, first 5 times, then on Info |
| **Channel panel (mini guide)** | left 352 | header "‹ Favourites · 3 of 10"; pinned team row ("Grizzlies at Warriors · NBA League Pass 4 · Your team", LIVE) when it is on another channel; 52 dp rows: number 14 · logo 32 · name 16/20 650 (ellipsis on a block span, not on the flex row) · now title 14 `text-3` · LIVE · 3 dp progress; current = surface-2, focused = surface-3 + inset ring | opens in 150 ms on the current channel; closes after a tune or Back |
| **Groups** | same panel, ◀ from the list | radio rows (Favourites, Live games, Sports, News, Movies, UK, All), count at the right | sets the zap ring |
| **Game panel, watching** | right 280, height = content | crests 40 on a -12° surface-2 plate with the upright score (Barlow italic 30; draw the plate as a custom `Drawable` with a `Path` skewed 12°, **not a rotated `GradientDrawable`**: rotation is not skew); "Q3 7:29 · Synced · 42 s"; tabs **MEM · GS · Plays · Sync** (Sync is an action chip with an outline, so it reads as a button; OK on a tab closes); 14 sp tabular table MIN PTS REB AST, rows 25 dp; footer "Back closes" | until closed; updates without moving the scroll |
| **Game panel, hidden** | same | the same panel for a shielded game that is **not on this channel**: plate "Hidden", clock only, tabs MEM · GS, **MIN REB AST only (no points, no +/-, no FG, no Plays)**, footer "Spoiler shield: My team" and a **Reveal score** button. Focus starts on the tab; OK closes; ▼ moves to Reveal, OK there reveals | – |
| **Live games** | right 264 | live games, your team first, LIVE pills, OK switches channel; **same shield rule as the NBA hub: only your team's score is hidden, other games show theirs** ("Lakers at Suns · Q2 4:12 · 48–51") | same |
| **Options** | left 320 | rows 48: **Sync score first when a game is linked** (value "42 s") · **Other feeds for this game (2)** · Subtitles · Audio · Picture size "This channel" · Favourite · **Score on picture** (scoreboard glyph). Report "won't play" moved to the failure card | – |
| **Subtitles / Audio** | left 320 | radio rows (pink dot), "Remembered by language"; a missing track is a disabled row "No subtitles in this file" | – |
| **Picture size** | left 320 | Fit / Zoom / Stretch with a one-line description; the picture changes as the focus moves; saved per channel (live) and per title (VOD) | – |
| **Sync score ("Match the clock")** | left 360 | "Pick the game clock on the picture now. Only clocks are listed." **Clock values only: no score, no team, no play text.** The list opens on the clock for the stored delay (focus + "Current setting"), older clocks below, and every newer clock collapsed behind one row ("Newer clocks hidden · 3", ▲ opens it). OK stores the delay and the panel closes with "Synced · 38 s behind live". **3 presses: ◀, OK (Sync score is first), OK** | – |
| **Action chip** | bottom-right at y 64 dp from the bottom (above the hint bar), max 420 | countdown ring 40 (pink arc on a surface-2 track; the last 3 s show the second as a digit in the ring), "Grizzlies are live / NBA League Pass 4", `OK to switch`; **while it shows, the hint bar's OK reads "Switch" and Back "Dismiss"**; dismissed at 8 s, by any other key, or by opening a panel; never in the first 10 s after a tune; neutral, never red | 8 s |
| **Reconnect** | bottom centre | spinner arc + "Reconnecting, attempt 2 of 6" | – |
| **Failed, game channel** | bottom centre, 470 wide | **"This feed stopped · Grizzlies at Warriors is also on"**: the other channels carrying the game as rows (ESPN "Feed 2 of 3 · HD · Best match", NBA TV "Feed 3 of 3"), first focused, OK tunes it; **no score or clock anywhere on the card**; then "Try this feed again" and "Back closes". 1 press from the failure. Not switched automatically (section 6, score delay) | after 6 failed reconnects |
| **Failed, other channel** | bottom centre | "This channel stopped", Try again (focused), Next channel; Report lives here | – |
| **Score bug** | top right, right edge 912, y 27, 36 high | `MEM 77 · GS 70 · Q3 7:29`: a -12° plate (bg-1 92%), 4 px team-accent ticks, Inter 700 14 abbreviations, Barlow italic 24 digits, Inter 650 14 clock; at the synced delay; **under the shield the digits are dropped and the clock stays**; hidden while the banner or any panel shows. Settings: Score on picture, off by default | while on |
| **VOD controls** | bottom bar 64 dp from the bottom, radius 16; top title block | **focus rests on the seek thumb** (ring around the 22 dp thumb): ◀▶ seek 10 s (hold scrubs), **OK pauses and resumes, always**, ▲ moves to the button row (play, −10, +10, Next episode, CC, audio, picture), ▼ opens Options; 6 dp seek bar (surface-3, gradient fill, chalk thumb); elapsed and remaining 14; "Ends at 22:14" top right | hide after 4 s |
| **Scrub** | bubble above the thumb | time chip chalk on ink (chalk fill, ink text); hold ◀▶ accelerates ×2 per second up to ×32 | on key |
| **Up next** | bottom-right, above the hint bar (above the bar when it is up) | countdown ring, "Next episode in 7 s · S1 · E4"; **OK plays now only when the controls are hidden**, hint "OK Play now · Back Stay on this one" | last 10 s |
| **Subtitles on picture** | bottom inset 10% | Inter 600, 28 dp (5.3% of height), chalk, 1.5 dp black edge, no box; the app honours `CaptioningManager` / `CaptionStyleCompat` when the user has set a system style | – |

Key map in the live player (no modes): ▲ next, ▼ previous (or swapped in Account > Playback; hold scrolls the banner and tunes 450 ms after release), **OK = channel panel, always** (the one exception is a chip or Up next while it is up, and then the hint bar says so), hold OK = last channel, **▶ = game panel** (or Live games, or programme info), **◀ / Menu = Options**, CC = Subtitles, 0 to 9 = channel number, Back = close panel then leave (focus returns to the channel you watched). Movies: ◀▶ seek 10 s (hold scrubs), OK pause and controls, ▲ buttons, ▼/Menu options, CH+ next episode.

## 8. Launch animation (`launch/index.html`, `launch.css`, `launch.js`)

Working HTML/CSS, 1100 ms, transform and opacity only, no filter, blur or sprite. `python3 launch/build.py` regenerates `index.html` from the brand SVG paths; open `launch/index.html` in a browser (Chrome 113 equivalent) to play it. **Every launch selector is namespaced `.l-*` / `#l-*`** (v1.0 used `.mk .lt .stage .slab .slabline`, which collided with the app's top-bar mark and hero slab when both stylesheets were loaded: the mark landed on Search and the slab vanished). Query options: `?t=450` freezes at 450 ms (stills), `?ready=1500` makes Home ready after 1500 ms, `?ready=never` holds on the loading state, `?cache=0` no cached Home at 12 s, `?state=slow` / `?state=off` the 4 s and 12 s frames, `?warm=1` warm resume, `?rm=1` reduced motion, `?hud=1` shows the clock; R replays.

| Window (ms) | Motion | Duration / easing |
|---|---|---|
| 0 | **Frame 0 = the native splash**: bg-0 `#15131D`, the gradient wedge alone, centred at (480, 270), **96 dp tall**. The three bands start hidden behind it (translateX 24 px, opacity 0) | static |
| 0 to 300 | the three bands step out from behind the wedge: translateX 24 px to 0, opacity 0 to 1 by 25% | 300 each, starts 0 / 40 / 80, `cubic-bezier(.2,.7,.2,1)` |
| 300 to 700 | the wedge-and-bands group moves left into its lockup slot: translate(148.5 px, 9.2 px) scale 1.595 to identity. **The wedge is above the letters** (z-index), so the letters resolve from behind it and never show through it (v1.0 ghosting at 450 ms) | 400, same easing |
| 380 to 860 | the seven letters resolve left to right: opacity 0 to 1, translateX −10 px to 0 | 240 each, starts 380 + 40 per letter |
| 820 | hold ends. If Home is ready: wipe now. If not: the **loading hold**. **Keys are accepted from 820** (never earlier, never lost after) | |
| 820 to 1100 | the 8° soft slab (pink to orchid, one orchid line parallel, 34 ms behind) sweeps left to right. **The launch layer fades out over 100 ms from the wipe start; Home fades in from 100 ms (180 ms, 24 px translateX); the top-bar mark stays at opacity 0 until 160 ms** (fade 120 ms), so the lockup and the mark are never on screen together | 280, `cubic-bezier(.7,0,.2,1)` |
| 1100 | Home complete. **The 1100 ms still is pixel-identical to `png/tv-home.png`** (checked) | |

**Loading hold** (also the loading screen): if data is not ready at 820 ms the lockup stays and the three bands breathe: opacity 1 to .55, 1.6 s ease-in-out alternate, delays 0 / .18 / .36 s. This is the only loop in the app besides a spinner. **At 4 s** a caption "Connecting to your provider…" (16 px `text-2`) fades in under the lockup (`png/launch-slow.png`). **At 12 s**: with a cache, Home is shown from it with the slim offline bar (the normal wipe, `png/tv-state-offline.png`); with nothing cached (first start), the lockup is replaced by the offline card with **Try again** focused (`png/launch-off.png`). When Home becomes ready at any point the wipe plays (280 ms), never longer. All four paths are built and exercised in `launch.js` (cold ready, held, 4 s, 12 s cached, 12 s uncached, warm, reduced motion).
**Warm resume**: the launch layer is skipped entirely. **Reduced motion**: the wedge alone (no bands, no letters, no slab), then a 120 ms opacity fade into Home when ready.
**Native splash (Android)**: `windowSplashScreenBackground` = `#15131D` (API 31+: `windowSplashScreenAnimatedIcon` = the 96 dp wedge, `windowSplashScreenIconBackgroundColor` unset); API 26 to 30 and TV launchers: `windowBackground` layer-list with bg-0 and the wedge bitmap centred 96 dp tall (`drawable-nodpi` PNG 192 px). Keep the splash up until the WebView reports the first paint of `#l-launch` (`setKeepOnScreenCondition`); `#l-launch` has the same background and the wedge at the same position and size, so there is no visible jump. The splash is never in the back stack.
Stills of the timeline: `png/launch-0.png` to `launch-1100.png`, `launch-hold.png`, `launch-slow.png`, `launch-off.png`, `launch-rm.png`.

## 9. Performance (measured on the mocks, `tools/audit.js`)

UI nodes per screen (the art SVG excluded; real posters are one `<img>` each): 4 to 245 (the busiest are the two sign-in screens with a QR drawn as 200 rects, then the NBA hub 199 and Filters 197; a real QR is one image), against a target of about 250 and a hard limit of 1,500. The v1.1 imagery adds at most 15 UI nodes per screen (a scrim and a tile per card). No `filter`, `backdrop-filter`, `mask`, text-shadow (except the subtitle edge, native), animated gradient, or soft shadow; the only `box-shadow` is the focus ring. Gradients are 2-stop on small elements, plus two flat scrims. Images decoded at display size (poster 124 x 186 CSS = 248 x 372 device). **This needs a native layer**: Xtream poster URLs are often 500 to 1000 px originals or odd hosts, so `shouldInterceptRequest` hands image requests to Coil or Glide, which downsizes to the slot size (248 x 372 posters, 396 x 222 cards, 1920 x 1080 backdrops at most) and caches on disk; without it a 6-row grid can decode 36 full-size JPEGs per scroll on the SoC. Fonts: the brand ships only `latin` subsets; provider titles in Polish, Turkish, Czech or Hungarian (ł, ş, ğ, ő) would fall back to the system face mid-word. The `latin-ext` files are not in the brand assets, so this is an open item for the brand (section 13), not a claim. The hero preview and the guide preview are one native video surface behind a hole, not a `<video>`. Grids and the guide are virtualised (at most 6 poster rows, 12 guide rows mounted); no smooth scrolling under key repeat; skeletons are static.

## 10. Press counts against the UX acceptance criteria

| ID | Task | Result in this design |
|---|---|---|
| AC-P1 | Cold launch on a game day to your team's stream | 1 (OK on Watch live); 2 with Choose channel |
| AC-P2 | Any section root to the game | 3 (Back to the tab, Back to Home, OK); from a grid also 3 |
| AC-P3 | Watching another channel to the game | 1 with the action chip (hint bar reads "OK Switch"); 2 with ▶ then OK |
| AC-P4 | Launch to resume | 1 outside a game day (hero Resume); **2 on a game day** (Down to Continue watching, OK) |
| AC-P5 | Zap ±1, last channel | 1, hold OK |
| AC-P6 | Open and close score | ▶ then OK or Back (2); on a shielded game you are not watching, ▶ then ▼, OK to reveal (3) |
| AC-P7 | Subtitles in the player | ▼, OK, then the language, OK: **4** to change the track (3 when the target is already focused), or the pill on the detail page before playing. v1.0 said 3 |
| AC-P8 | **Game stream dies, to another feed** | **1** (OK on the focused other channel in the failure card; v1.0: 4+ through Home) |
| AC-P8b | **Sync score** | **3** (◀, OK, OK; Sync score is first in Options) |
| AC-P9 | Any screen to the top bar | 1 (Back) |
| AC-P10 | Home to exit | 2 |
| AC-P11 | Install an update | Update now (1) |
| AC-P12 | Phone sign-in | **4 steps, 2 on the TV**: OK on Use your phone, scan and Send, OK on Done |
| AC-P13 | Find a title by name | 8 presses for "harb" (H, A, ▲ to the suggestions, OK); voice 1 |
| AC-F1 | One ring | audit passes (HUD overlays with no focus are listed, not failed) |
| AC-T2 | Informational text 14 px | audit passes |
| AC-O1 | **OK has one meaning per screen** | chip and Up next rewrite the hint bar; hidden panel OK closes; VOD OK pauses; toasts bind nothing |
| AC-L3 | Keys accepted | from the start of the wipe (820 ms) |
| AC-B1 | No spoiler when shielded | designed on every surface (section 6), including the panel's points column and the sync list |
| AC-Q1 | **No collisions, clipped text or rings, or safe-area violations** | `node tools/audit.js` on all 71 pages: 0 findings |

## 11. Brand notes (for the consultant)

Used from the brand: `mark-small.svg` in the bar, `lockup.svg` on bg-0 and **`lockup-chalk.svg` on the update card (BRAND-CHECK M2)**, 14 px caption token, badge 12 px exception, compact LIVE pill, inset focus ring, 2:3 poster card, radii 8 / 12 / 16 / 24 / pill only (the 2 px corner of a Sharp plate is the one exception), the launch CSS namespaced (M1), the wedge above the letters and the faster layer fade (S1, S2), radius 16 on every native panel (S5), the scroll bubble and action chip with the consultant's changes.
Two things to approve in v1.1: **(1) team identity (3.4)**, which goes one step past BRAND.md rule 6 (which allows logos on a neutral disc): flat plates in the team's real primary with its secondary as a 4 px bar. **The owner's v1.2 decision overrides the consultant's modifications** (no silver or gold swaps, no non-red accents); the safeguards are an 8 px gap to LIVE, no contact with a ring, 4.5:1 text, and LIVE never identified by colour alone; **(2) the slab as a clock plate by default with an opt-in rectangular preview (3.5)**, which keeps the shape, the gradient and the 12° angle but fills it (the consultant's rules adopted: no masked video, 75% luminance cap). Both are flat and use no new colour, only team data.
Reviewer finding passed on: `text-2` (#D2CEE2) and `text-3` (#C8C4D8) are almost the same colour, so meta hierarchy is carried by size and weight; that is a brand token decision, not a UI one.

## 12. Where this departs from the briefs, and why

| Brief | Departure | Evidence |
|---|---|---|
| UX 4.3 Home rows and UX 4.9 shelves page | Hero + On now + Continue; Movies is one grid with chips, not a shelves page | UX-CHECK-m1 section 4 adopted both; fewer nodes, one mental model |
| UX 4.2 fold Saved | Saved stays a tab and owns channel reordering | six destinations plus Search is inside Android's 5 to 6 guidance; UX check adopted it |
| UX 4.13 Account as one list | Two panes (groups left, list right) | seven groups of 3 to 6 rows would be a 25-row scroll; Left/Right is free on that page so it does not collide with the bar rule |
| UX 4.7 tab dwell 300 ms | 250 ms, only when rendered from cache; else OK | UX check accepted |
| UX MF1: strict hidden state for a game you are watching | Opening the panel on the game you watch is the reveal; the hidden state only exists for shielded games on *another* channel | a hidden panel on the game you are watching would need a second gesture to see the score you opened it for; the coordinator's brief for v1.1 chose the same |
| UX S2 hold-OK context menu everywhere | Guide keeps a one-gesture favourite toggle with an undo toast | the guide is the only place a channel is favourited, and a menu would add a press to a frequent action |
| Brand: 13 px caption | 14 px | brand approved the floor (UX AC-T2) |
| Brand BRIEF: gradient only on bg-0 for the wordmark | First-run screens use `lockup.svg` on bg-0; **the update card (surface-1) uses `lockup-chalk.svg`** | v1.0 put the gradient lockup on a card (BRAND-CHECK M2) |
| Independent review S1-1: "list only events at least 90 s old by the feed clock" | Not adopted. The sync list is clocks only, opens at the stored delay, and collapses everything newer | a 90 s cut-off would hide the right answer for a channel running 40 s behind; the stored delay is the better anchor and a first-time default (60 s) still lands in the list |
| Independent review S1-2: "after attempt 3 the app switches feed automatically" | Not adopted: the failure card offers the other feeds and one OK tunes the best | each channel has its own delay; a silent switch would make every score on screen wrong by 10 to 40 s without telling the viewer |
| Brand check v1.1 M1/M2: swap NY, MIA, PHX accents; gold only as a 4 px bar; non-red accents for red-family teams | **Overridden by the owner (v1.2)**: real team colours, safeguards only (8 px from LIVE, no ring contact, 4.5:1 text, LIVE never by colour alone) | owner: "team colours should stay imo its the teams colors like" |
| Independent review S2-2: "team colour as a two-stop field behind each side" | Adopted flat, as a plate and a 4 px accent | brand bans glows and soft gradients; a flat plate carries the identity with no new rendering cost |
| Independent review S4: "start the wipe at 600 ms when data is ready" | Not adopted: lockup hold stays 820 ms | the brand moment is the lockup resolving (letters finish at 860 ms, wedge at 700); cutting it at 600 shows a half-drawn wordmark. Warm starts already skip the whole thing |
| Independent review S3-6.1: "build a clickable 3-screen prototype" | Agreed, not in this revision | the mocks are static by design; the prototype (focus engine, virtualised grid, frame times on the TV) is the next step before the port, see section 13 |
| Independent review S2-5: "7 to 8 rows at 40 px (compact density)" | Not adopted: 6 rows of 48 | 40 px rows cannot hold a two-line cell (title 16 + times 14 + padding) and a 5 px ring; rows of 48 are the smallest that keep both |
| v1.0 spec: "one grid shows 12 strong candidates" | 6 captioned posters + a peek | measured; section 5.5 |

## 13. Open items (need the real TV)

1. Real posters: scrim legibility and the 1 px border on warm photographic art (brand brief risk 1). The mocks use procedural art.
2. Surface steps and the focus ring on the Philips in Standard and Vivid modes; the gradient banner loudness.
3. Frame rate of focus moves and the launch on the weakest target; measure AC-L1 to L10.
4. Provider EPG cost for a 2.5 h grid; typical stream delay of the NBA channels (to tune the 60 s default).
5. Silent self-update on this Android TV version; `SpeechRecognizer` availability for the mic key.
6. Phone and PC adaptations: on hold by owner decision.
6b. `latin-ext` subsets of Outfit, Inter and Barlow are missing from `brand-v5/v5.4/fonts` (brand to add, or accept the fallback).
7. Hero and guide previews: whether the Philips decodes a second surface at 128 x 72 and 224 x 192 while the WebView animates; provider connection limits (the preview and the player must share one connection). If either fails the slab falls back to the game-clock plate, which is already designed.
8. Clock list for Sync score needs the NBA feed's per-event clock values; verify the feed provides them at 10 s granularity or better.
9. A clickable prototype of Home, Movies grid and Detail (a hand-built focus engine, since Chrome 113 has no spatial navigation) with frame times on the TV.
10. Real team logos and posters on the plates and scrims (contrast of text over real art; the audit measures only flat grounds).
