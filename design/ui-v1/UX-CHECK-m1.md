# UX check: UI milestone 1 (provisional)

Reviewer: UX (author of `UX-BRIEF.md`). Date: 26 Oct 2026.
Checked: `png/overview-m1.png`, `png/ia.png`, every `png/tv-*.png`, `tv/*.html` (structure only), `UI-SPEC.md`. These are static mocks, so I can judge structure, press counts, focus placement, text and safe area, but not latency.

**Verdict:** a strong milestone. The top bar, contextual hero, guide grid, single poster grid and detail pages are the right skeleton, and several choices are better than my brief (section 4). It is not yet safe for game night: the **spoiler shield and score delay are missing everywhere**, the **player still has a mode-dependent OK**, **Popular sort is gone**, and there is **no one-card-per-title merge**. Eight must-fix items, eleven should-fix, eight nits.

---

## 1. Press counts for the key flows

"Mock" means as designed in M1 (UI-SPEC + ia.png); "brief" is the target in UX-BRIEF section 8.1.

| Flow | Brief | Mock | Status |
|---|---|---|---|
| Cold launch on a game day → Grizzlies stream | 1 | 1 (Watch live focused) | pass |
| Cold launch, no game → resume last show | 1 | 1 (resume hero) | pass, better (see 4.1) |
| Game day → resume a show | 2 | 2 (Down, OK) | pass |
| Live tab content → Grizzlies | 3 | 3 if Home's entry focus is the hero button (not stated) | conditional, see S6 |
| Deep in the Movies grid → Grizzlies | 3 | **4** (Back to chips, Back to bar, Back to Home, OK) | fail, see M6 |
| Watching another channel → Grizzlies | 1–2 | undefined: OK opens the channel panel, then search the list | fail, see M3 |
| No channel matched for the game | 2 | undefined | fail, see S5 |
| Any screen → top bar (Back) | 1 | 2 from a grid | fail, see M6 |
| Zap ±1, last channel | 1, hold | 1, hold | pass |
| Score in the player, open + close | 1 + 1 | 1 + 1 (OK when a game is linked) | passes, but by overloading OK (M2) |
| Subtitles in the player | 3 | 3 (▼, Subtitles, pick) | pass; the CC button on the detail page is better (4.6) |
| Home tab → Search | 1 | **6** (Right × 6 to the icon at the far right) | fail, see S1 |
| Exit from Home content | 2 | 2 | pass |

---

## 2. Issues, ranked

### Must-fix

**M1. No spoiler shield or score delay on any screen.**
*Screens:* Home hero (score plate "77 – 70", leaders "G. Marshall 24 pts", records "1-0 / 0-1"); NBA hub hero and linescore; NBA hub game cards (finals "112", "Final / OT"); Live guide now panel (provider description "Memphis lead by seven after two quarters").
*Why:* the owner watches IPTV that runs 30–90 s behind live. Every one of these surfaces shows real-time results, and the guide even spoils through EPG text. A shield that misses thumbnails, records or labels is the documented failure of Apple and the NBA app (brief 2.6, S28, S29). Acceptance criterion AC-B1 fails.
*Fix:* design a **shielded state** for each component, used when Account → NBA → Spoilers is *My team* (default) or *All games* and the game is shielded:
- Score plate: replace the numbers with "Score hidden" (Inter 650 16, text-2) inside the same skewed plate; keep the LIVE pill, quarter and clock.
- Leaders, linescore, Plays: hidden. In the hero the secondary button becomes **Show score** (it reveals this game for the session and turns back into Box score).
- Records: frozen at the pre-game value.
- Finals: "Ended" with no "OT", no winner emphasis and no scores until revealed.
- Guide: programme descriptions for a shielded game are replaced by "Description hidden (spoilers)".
- Toasts and chips never carry a score.

**Score delay:** after the owner has watched a game in the player, Home, NBA and toasts show that game at its **synced delay**, with a 14 px caption under the score: "Synced · 42 s behind live" (brief 4.11). Show both states in M2's mocks.

**M2. Player OK changes meaning when a game is linked.**
*Screen:* `ia.png`, key map, Player column: "OK: channel panel (game: score panel)"; "◀ ▶ options".
*Why:* this is the current app's bug P3: the same key does different things depending on hidden state, and Left and Right both open Options, so one key is wasted.
*Fix:* **OK = channel panel, always. Right = game panel** (or the Live games panel when this channel has no game but games are live, else programme info). **Left / Menu = Options.** Hold OK = last channel. Update the hint bar to `OK Channels · ◀ Options · ▶ Game · ▲▼ Channels`.

**M3. No route from another channel to your team's game inside the player.**
*Screen:* player layer (`ia.png` "Native player layer"); the mini guide is deferred to the final milestone.
*Why:* when the Grizzlies tip off while the owner is watching something else, the only route is OK, then scroll the channel panel, then OK, which is unbounded. The brief's target is 1–2 presses.
*Fix:* add these to the native player spec now:
1. A **time-boxed action chip**, bottom right, 8 s with a countdown ring: "Grizzlies are live on NBA League Pass 4 · OK to switch". It binds OK only while visible and no panel is open.
2. The **Live games panel** on Right (M2), with your team first and focused.
3. Also pin the "Your team · LIVE" row at the top of the channel panel.

**M4. Popular sort is missing; the default is Recently added.**
*Screen:* `tv-movies.png` header "Sort Recently added"; `tv-movies-sort.png` (Recently added, Rating, Year, Title).
*Why:* the IMDb-based Popular sort is a shipped feature the owner relies on. In a 50k provider catalogue, "Recently added" is the provider's dump order (bulk uploads, foreign duplicates), so the first screen is noise. Netflix's data says the first 10–20 titles decide most sessions (brief S38).
*Fix:* sort list **Popular (default) · Top rated · Newest · Recently added · Title**. Keep the English-first toggle (4.2). The radio for Popular shows "IMDb, this week" as its secondary text.

**M5. One card per title, with versions on the detail page.**
*Screens:* `tv-movies.png` (a 4K tag and a language tag per poster imply one card per provider item); `tv-detail-movie.png` (no version control).
*Why:* providers list the same film 2–5 times (EN, 4K, MULTI-SUB, FR). Without a merge, a 50k grid shows duplicates on every screen and search returns stacks of the same poster (brief 4.9, AC-B7).
*Fix:* grid card = one title; the tags on the card show the **best** version available (4K) and "+3" if there are more. On the detail page add a secondary pill button after Play, shown only when there is more than one version: **"English · 4K HDR ▾"**. OK opens a sheet listing the versions (language · quality · subtitles · size or bitrate if known); the default is your language at the best quality the TV decodes. Play uses the chosen version; the choice is remembered per title.

**M6. Back in a grid takes an extra step to the chips.**
*Screen:* `ia.png` "Focus and Back": "first press scrolls to the top and focuses the chips; second: top bar; third: Home".
*Why:* it adds a press to every route out of Movies and Series, including the game-time route (4 instead of 3) and Back-to-bar (2 instead of 1). The chips are already one Up from the first row once you're at the top.
*Fix:* **Back (anywhere in a tab's content) = scroll to the top, show the bar and focus the current tab** (Android top-nav rule). Back on a tab other than Home = Home **with focus on the hero's primary button**. Back on Home = exit. Detail page → grid with the same item focused (keep).

**M7. The game hero has no "no channel found" state.**
*Screens:* Home hero, NBA hub hero ("On NBA League Pass 4 / Also on ESPN").
*Why:* matching channel names fails on regional and ESPN-style channels (current-app audit P9). The mock assumes success, and the spec says "the user can change channel in the player", which costs a zap search at tip-off.
*Fix:* when there's no match, the primary reads **Choose channel** and opens a sheet of candidates (EPG matches first, then "NBA" or "League Pass" channels, then your Sports group), with the best one focused. The pick is **remembered per team** and used next time. When there are several matches, the primary names the best one ("Watch on NBA League Pass 4") and the caption line lists the others, which open with the same sheet.

**M8. The guide's group switcher depends on the Menu key.**
*Screen:* `tv-live.png`, the "All channels 10" chip at the left of the time ruler; UI-SPEC 5.2: "Menu opens the group list".
*Why:* Android's TV quality checklist says the app must not depend on the Menu button (brief S7), and Google TV remotes often lack one.
*Fix:* make the chip reachable with **Up from the first channel row** (from the channel cell or the first programme cell). OK opens the group list as a left sheet. Keep Menu as an alias. State the Up order explicitly: first row → group chip → (now panel, see N6) → top bar.

### Should-fix

**S1. Search is six presses away at the far right of the bar.**
*Screen:* top bar on every tab.
*Why:* Search is the fastest way into 50k titles; at the far right it costs Right × 6 from Home.
*Fix:* move the Search icon **to the left of Home** (one Left from Home; it is the first item after the mark). Account stays at the right. Pressing Left on Home must not enter the mark (it is not focusable).

**S2. Hold OK = save leaves no home for the other card actions.**
*Screens:* `ia.png` key map ("Hold OK: Save or remove from Saved"); guide "hold OK toggles favourite".
*Why:* one-gesture save is fast, but the brief needs *Remove from Continue watching*, *Mark watched* and *Reveal score*, and there's no other route without a Menu key. A silent toggle also has no undo, and the owner can't see what the hold did from 3 m.
*Fix:* hold OK (≥ 500 ms, pressed state at 150 ms) opens a small context sheet anchored to the card, with **Save / Remove from Saved first and focused**, so hold then OK saves (2 presses). Further rows depend on the card: Remove from Continue, Mark watched, Favourite channel, Reveal score. After saving, show a toast: "Saved to Saved". If the owner prefers the single-gesture toggle, keep it only in the guide (favourite channel) with an undo toast.

**S3. Genre and "Top rated" chips duplicate the Filters sheet and the Sort menu.**
*Screen:* `tv-movies.png` chip row (All · New in English · Top rated · 4K · Action · Comedy · Drama …), the Filters sheet (Genre), the Sort menu (Rating).
*Why:* the same facet in three places is the current app's "cluttered sorts" problem (audit P11). For example, "Action" chip plus Genre "Drama" in the sheet: which wins?
*Fix:* make the chip row a set of **views** that write into the same state. "Top rated" = Sort Top rated; a genre chip = Genre filter set to that genre, reflected in the Filters count; selecting a chip clears conflicting choices. Limit the row to 8 chips: All · New in English · Top rated · 4K · the 4 biggest genres. Everything else stays in the sheet.

**S4. The filter sheet is missing facets the app already has, and has no counts.**
*Screen:* `tv-movies-filters.png`.
*Why:* Quality and Subtitles are current filters the owner uses; without per-option counts, combinations hit zero results.
*Fix:* add **Quality** (Any · 4K · Full HD) and **Subtitles** (Any · With subtitles); show a count on each genre, year and rating chip (13 px, text-3) and disable zero-count chips (surface-2, text-4). Define Back: **Back keeps the changes and closes**; "Show 214 titles" closes and focuses the first result. Fix the "2 active" header to count all non-default choices (the mock shows 3).

**S5. The hero always shows the game, even when it isn't your team's.**
*Screen:* UI-SPEC 5.1, hero priority "your team live > any live game with a matched channel > resume".
*Why:* on most nights some NBA game is live; that would push the owner's resume hero down every evening. Other games belong in On now.
*Fix:* hero priority: **your team, from 3 h before tip-off to 30 min after the final** (pre-game state: "Tip-off 21:30 · Watch pre-game" / "Choose channel") > resume > last channel. Other live games lead the On now row.

**S6. Entry focus after Back to Home isn't stated.**
*Screen:* `ia.png` "Focus and Back".
*Why:* the 3-press game route depends on it.
*Fix:* Home's entry focus is always the hero's primary button (Watch live / Resume / Watch channel), whether from launch, from Back or from the tab.

**S7. A 50k grid has no position cue and no jump outside Title sort.**
*Screens:* `tv-movies-scrolled.png`; UI-SPEC 5.4 (A–Z rail only when sorted by title; CH± assumed).
*Why:* the designer correctly assumes a Google TV remote may have no number pad, and many have no CH± either. 50k ÷ 6 ≈ 8,300 rows. When the header slides away the owner also loses the sort and filter context.
*Fix:*
- While Down is held for more than 1.5 s, show a **scroll bubble** at the right edge with the sort key of the focused row ("2019", "M", "IMDb 7.4") and "row 120 of 8,300".
- **Jump** in the header for every sort: year list (Newest), letter grid (Title), rating bands (Top rated); "To the top" always.
- When the header is hidden, keep a 14 px context line at top left: "Movies · Popular · 3 filters".
- The A–Z rail on the right must follow focus rule F3 (an auto-repeated Right never enters it).

**S8. Zapping isn't specified from the guide.**
*Screen:* `tv-live.png`; UI-SPEC 5.2 ("OK on the current programme tunes").
*Why:* in today's app, up/down in the player cycles a hidden group (audit P7).
*Fix:* the **zap ring is the group selected in the guide's chip** ("All channels", "Favourites", "Sports"); the player banner shows it ("Favourites · 1 of 10"). Up = next channel (higher number) on TV, PC and phone; one setting inverts it.

**S9. Meta and guide text at 13 px carry information.**
*Screens:* card meta ("2025 · Action", "Film · 1h 17m left"), guide cell times ("22:00 · 23:00"), episode durations.
*Why:* on a 55" at 3 m, 13 px caps are about 14′, below the 16–20′ legibility range (brief 8.3); Fire TV's body minimum is 28 px at 1080p = 14 CSS px. The brand floor is 13.
*Fix:* 14/18 for meta that's the only place a fact appears (card meta, guide times, durations); 13 stays for counts and secondary captions. *Pending:* measure the owner's screen and distance; on a 65" at ≤ 3 m, 13 px is acceptable.

**S10. "Saved" has no job that isn't elsewhere yet.**
*Screen:* top bar, `ia.png` Saved column (Channels, Movies, Series, Recently watched).
*Why:* Home already has On now (favourites first) and the planned Saved row; a tab that only repeats them is the current app's duplication (audit P16).
*Fix:* keep the tab (see 4.3), but give it the jobs only it does: **reorder favourite channels** (this order drives On now and the Favourites zap ring), remove items, "Recently watched" history. Drop "Favourites" as a chip or category inside Movies and Series.

**S11. The movie detail page has no resume or subtitle state.**
*Screen:* `tv-detail-movie.png`.
*Why:* the CC icon button gives no value at a distance, and the resume variant (in the spec) isn't drawn.
*Fix:* make CC a labelled pill: "Subtitles: English" / "Subtitles: Off" (it's a choice, so it shows its value). Mock the resume state: Resume 1:12:40 (primary) + Start over (secondary), "54 min left" under them.

### Nits

- **N1.** `tv-movies-scrolled.png`: the first poster row starts at y = 24 CSS px, inside the 27 px safe margin. Start at 27 or more.
- **N2.** The chip row bleeds past the right safe edge ("Kids" is cut at 952 px). Fine as a peek; make sure a focused chip scrolls fully inside x ≤ 912.
- **N3.** The filter sheet "More" genre chip: say where it goes (expands in place; don't open a second sheet).
- **N4.** The guide row height is 48 px against the brand channel row's 56, and two-line names ("Sky Sports Main Event") are tight. Use one line plus truncation at 48, or rows of 52.
- **N5.** Poster card title 15 px versus the brief's 16 for card titles: accept 15 (brand component), but don't go lower in the 16:9 rows.
- **N6.** The guide's now panel has its own Watch and star buttons, which duplicate OK and hold OK on the cell and add stops on the way to the bar. Make the now panel display-only.
- **N7.** The NBA hub "2 live · 2 upcoming · 3 final" counter: under the shield, keep the counts (they don't spoil).
- **N8.** The tab-switch dwell is 250 ms in UI-SPEC vs 300 ms in my brief. Accept 250 provided a tab renders from cache within it; otherwise switch on OK.

---

## 3. Acceptance criteria judged from the mocks

| ID | Criterion | Result |
|---|---|---|
| AC-P1 | 1 press to the game on a game day | **Pass** |
| AC-P2 | ≤ 3 from any section | Fail from grids (4), see M6 |
| AC-P3 | ≤ 2 from another channel | Fail, undefined, see M3 |
| AC-P4 | 1 press to resume | **Pass** |
| AC-P6 | Score panel 1 + 1 | Pass, via an overloaded OK (M2) |
| AC-P8 | Search reachable fast | Fail, 6 presses to the icon (S1) |
| AC-P9 | Back to the bar in 1 | Fail from grids (M6) |
| AC-F1 | Exactly one focus per screen | **Pass** on all 9 mocks |
| AC-F3 | Gutter for scale + ring | **Pass** (18 px poster gutters vs 8 px needed; game cards 8 px, tight but OK) |
| AC-F8 | Interactive elements in 48/27 | Pass except N1 and N2 |
| AC-T1/T3 | Body 16; nothing under 13 | **Pass** |
| AC-T2 | Informational text ≥ 14 | Fail, pending measurement (S9) |
| AC-B1 | No spoilers when shielded | **Fail** (M1) |
| AC-B3 | Zap ring named | Not designed (S8) |
| AC-B7 | Clean titles, merged duplicates | Names pass; merge fails (M5) |
| AC-B8 | Virtualised lists | Pass (stated in the spec) |
| Structural | DOM ≤ 1,500 nodes | **Pass, far better**: 63–184 nodes per screen |

---

## 4. Where the designer's choice is better than my brief (adopt these)

1. **Contextual hero that falls back to Resume.** My brief showed a spotlight only for the game and otherwise put focus on the first Continue card. The designer's single hero (game, else resume, else last channel) gives the same 1 press with a large, readable target and the "21 min left" context. Adopt it, with S5's priority.
2. **One grid with view chips instead of a shelves page.** At 960 × 540 the single grid with "Popular" as the default (M4) shows 12 strong candidates on the first screen, uses about a tenth of the nodes of six shelves, and is one mental model. Drop my shelves front page; keep S3's rule that chips are views over the same state.
3. **"English first" as a sort policy toggle** inside the Sort menu. It's simpler and more visible than my global "Your languages" filter. Keep Account → Languages only to define what "first" means.
4. **The Saved tab.** Six destinations is within Android's 5–6 guidance, and a single place to manage favourites (especially the channel order that drives zapping) is clearer than my folding. Adopt it with S10's jobs.
5. **Inset focus ring in guide cells.** It solves ring overlap between 4–6 px cells without breaking the one-ring rule.
6. **Filter sheet with a live-count commit button** ("Show 214 titles"). It's clearer at 3 m than my apply-behind-the-sheet; keep it with S4's Back rule.
7. **CC shortcut on the detail page.** Choosing subtitles before playback saves the in-player round trip for films; it just needs a label (S11).
8. **Exit from playback lands on the detail page** (Apple HIG) and **"no number pad assumed"** in the key map. Both are more conservative and correct than my brief, which leaned on CH± and digits.
9. **Node budget measured per screen (63–184).** That's the right discipline for Chrome 113; my 1,500 ceiling is too loose as a target. Make about 250 the target and 1,500 the hard limit.
10. **Clean channel-name rules** (UI-SPEC section 7) are more precise than my brief's; use them as the shared normaliser for search too.

---

## 5. What M2 should show to close this

1. The shielded and synced states of the hero, game card, NBA hero and guide now panel (M1).
2. The native player: banner with now/next, channel panel with the pinned team row, game panel on Right, Live games panel, Options on Left, the action chip (M2, M3).
3. The detail page with the version pill and sheet, and the resume state (M5, S11).
4. The "Choose channel" hero and sheet (M7).
5. The Back and entry-focus table rewritten per M6 and S6, and Search moved left (S1).
6. The scroll bubble, jump sheet and context line on the scrolled grid (S7).
