# Brand check: UI final milestone

Checked against `design/brand-v5/v5.4/` (BRAND.md, tokens.css, BRIEF-for-UI.md, the sign-offs and BRAND-CHECK-m1.md).

How I checked: I viewed `overview-final.png` and 24 PNGs at full size (first-run welcome and phone, search, Saved, Account, offline state, update card, NBA hub and game page, Home, Movies grid, scrolled, jump, series detail, six player overlays, scrub, up-next, launch frames 450, 960 and 1100). I also ran a script over all 42 `tv/*.html` and 21 `player/*.html` pages in Chromium (960 x 540) and checked every text node's size, every colour against the token palette, every box-shadow, filter and text-shadow, every skew, and the count of focus rings. I read `ui.css`, `launch/launch.css` and `launch.js`, and played the launch in Chromium (all 12 animations listed, frame pacing sampled, loading hold and reduced motion run). Not checked: real hardware, and the animation by eye (I judged it from the stills and the animation list).

## Verdict

**On brand, with 2 must-fixes, 5 should-fixes and 7 nits.** The system held across 63 screens: no filter, backdrop-filter, blur or soft shadow anywhere; every colour used is a token (no off-palette value in any page); the only box-shadows are the focus ring and the approved inset ring; text is 14 px or larger except badges (all 12 px items are LIVE, quality and language tags, episode numbers and team abbreviations); the only skew is the 12° slab and slab line (plates are drawn by `::before`, text and tables upright); exactly one focus ring on every interactive page. Both must-fixes are mechanical.

## Milestone 1 items: confirmed applied

| Item | Result |
|---|---|
| M1 neutral team discs | Applied (`.team` is surface-3 + chalk + border-strong; no team colour in the UI) |
| M2 `mark-small.svg` in the bar | Applied |
| S1 13 px to 14 px | Applied (no 13 px left; caption uses the token) |
| S2 caption clears the focus ring | Applied (caption offset 14 px) |
| S3 no titles over bright art | Applied (title only in the flat fallback tile; real art carries its own) |
| S4 compact LIVE pill class | Applied (`.a-live.compact`, `--a-live-compact-h`) |
| S5 real-poster test | **Still open** (all art is procedural) |
| N1 literal hex, N2 weight 800, N3 scrim tokens | Applied |
| N6 off-token radii | Partly: 10, 14, 15, 20, 7, 3 still present (see nits) |

## Must-fix

**M1. The launch CSS collides with the app CSS, so the first Home you see after launch is broken.** `launch/launch.css`, seen in `png/launch-1100.png` against `png/tv-home.png`.
- What: `launch.css` defines `.mk{position:absolute;width:102.5px...}` and `.slab{...opacity:0}` plus `.done .slab{display:none}`. Home is rendered inside the launch page, so these hit the app's own `.topbar .mk` and the hero's `.slab`. Result at 1100 ms: the top-bar mark is stretched and overlaps the Search icon (tabs sit about 108 px left of their real position), and the live hero's 12° slab is gone.
- Why: the cold launch is the first thing the owner sees every day, and the slab is the Sharp signature of the Home hero.
- Fix: namespace everything in `launch.css` and `launch.js`/`build.py` under the launch layer: rename `.mk .lt .slab .slabline .stage` to `.l-mk .l-lt .l-slab .l-slabline .l-stage` and scope the `.done` and `.wiping` rules to those names. Re-render `launch-960.png`, `launch-1100.png`, `launch-hold.png`, and verify that the 1100 ms frame is pixel-identical to `tv-home.png`.

**M2. The update card shows the gradient lockup on a surface.** `tv/update.html` (`png/tv-update.png`, `kit/screens.js` line 112).
- What: `lockup(48)` (gradient "glow" word, wedge i-dot) sits on a `surface-1` card.
- Why: the gradient word is allowed only on bg-0; on any other surface it is `lockup-chalk.svg`. Section 12 of UI-SPEC.md says no other surface carries a lockup; this one does.
- Fix: in `screens.js` give `lockup()` a `chalk` option and use `assets/lockup-chalk.svg` (48 px high, still 40 or more, so the wedge dot is right) inside the card. Correct the row in UI-SPEC section 12.

## Should-fix

**S1. Launch z-order: the wedge ghosts over the letters.** `png/launch-450.png`: while the wedge settles left, its apex passes over the "a" and "i" at 30 to 50% opacity, so the "a" looks cut and the i-dot floats.
- Fix: draw the wedge group above the letters (`z-index`), or start letters at 460 + 40 per letter and shorten each to 200 ms (letters end at 460 + 240 + 200 = 900; the hold ends at 820, so also move the hold to 900 and keep the wipe at 280, total 1180, still under 1.2 s). The first option costs nothing and is enough.

**S2. During the wipe the lockup and the top-bar mark share the screen over Home.** `png/launch-960.png`: the gradient lockup is at about 40% over the Home content (rule: gradient wordmark on bg-0 only) and Home's mark is already visible (rule: mark and lockup never on one screen).
- Fix: `launch layer out` becomes 100 ms linear from the start of the wipe (delay 0); `Home in` starts at 100 ms; hold `.topbar .mk` at opacity 0 until Home's fade begins (or let it fade with the rest of Home from 100 ms). The slab still carries the transition.

**S3. The Home hero's text runs into the slab.** `png/tv-home.png`: "Synced · 42 s behind live" ends at x = 1573 device px, past the slab line that starts at about x = 1510. The slab must never sit under text (brand dialect rule: it is a shape behind, not over, content).
- Fix: cap the leaders block at `max-width: 300px` (ends before x = 1500 device), or move the "Synced" line under "On NBA League Pass 4". Check the NBA hub hero for the same (it fits there).

**S4. Real posters are still untested.** Open since milestone 1 (risk 1 in the brief). Procedural art is saturated in the brand's own hues and flatters the palette. Send 12 real or photographic posters (skin tones, bright sports, black and white) through the grid, a detail page and the continue-watching cards, then re-check the 1 px border, the caption legibility and the card-title scrim (86 to 94%).

**S5. Native panel radius.** The spec uses 16 for the docked side panels (banner 14). The brand dialog radius is 24 for centred dialogs. Approved for docked side panels (see adopt list); the reconnect and failed cards, which are centred, should use 24 or 16 consistently (they use 16). Keep 16 for all native panels and say so in the player table.

## Nits

- **N1.** Radii still off-token: 10, 14 (bubble, plates), 15, 20, 7, 3. Snap to 8, 12 (poster), 16, or keep 14 for the banner only (documented).
- **N2.** The welcome screen's primary button, "Use your phone", carries a microphone glyph; it reads as voice input. Use a phone glyph.
- **N3.** `player/game.html`: the "Plays" tab chip ends 14 px from the panel edge (the panel padding is 16 dp on the left and about 8 on the right). Wrap the tab row or shorten the labels so the right padding is also 16.
- **N4.** Poster captions are 16/20 Inter 650 (brand poster title: 15/20). Fine on 124 px posters; adopt 16 (see adopt list) or revert to 15.
- **N5.** UI-SPEC section 7 says the scrub bubble is "chalk on ink"; the render is ink on chalk (15:1, correct). Fix the words.
- **N6.** The LIVE pill appears twice on the Live tab (NBA tab, now panel) and again in cells; legal, but if the guide gets denser, drop the tab pill to a dot.
- **N7.** Welcome and update screens use the only 64 px and 48 px lockups; all other uses are 40. Fine, but keep to the files table in the brief.

## The two new components

**Scroll bubble (`tv/movies-scrolled.html`): approved with modifications.**
- Use `--a-radius` (16) instead of 14; border 1 px `--a-border`; background `--a-bg-1`; number Outfit 700 28 (head size, in the scale); caption 14.
- Behaviour: only while a key is auto-repeating and for 600 ms after; fade with opacity only (120 ms); never takes focus and never covers the focused card (it currently overlaps the right-hand poster of the row in view; keep it in the right gutter or vertically centred on the viewport, where focus is not).
- Text stays chalk and `text-2`; the sort value shown is the one the list is sorted by.

**Action chip with countdown ring (`player/chip.html`): approved with modifications.**
- Surface `bg-1` at 92%, radius 16, 1 px `--a-border`, inside the safe area (right edge at 912 dp). Correct.
- Ring: a pink arc on a `surface-3` track on a `bg-1` panel. The arc is 5.6:1 against bg-1, so it passes; the arc alone against surface-3 is 2.8:1, so never draw it on a `surface-3` backdrop. Keep the track as decoration only; the chip text carries the meaning.
- The countdown must not be the only signal: keep "OK to switch", and in the last 3 seconds replace the ring's centre with the seconds digit (14 px). Dismissal: the chip ends at 8 s, on any other key, or when a panel opens; it never appears in the first 10 s after a tune.
- Do not use red or LIVE styling on it (it is neutral; keep that).
- Apply the same style to Up next (it already does).

## Native player overlays (UI-SPEC section 7): approved for the Java rebuild

On brand: surfaces `bg-1` at 92 to 94%, 1 px border, radius 16 (banner 14), rows 48 to 56 dp, hint bar 34 dp at 14 px, subtitle Inter 600 28 dp with a 1.5 dp black edge and no box, game panel table 14 sp tabular with the only skewed view being the score plate, LIVE pill in 22 dp with the 2 px outline, focus 3 dp white ring. Two precise requests for the build: the focused row's ring must be drawn over the row's 2 dp canvas gap (`bg-0` colour, not the panel colour), and the radio/check/seek tint is `#F95BAC`, not the gradient, in every Android widget.

## Launch animation (`launch/index.html`): approved after M1, S1 and S2

Measured in Chromium: 12 animations, all on `transform` and `opacity` only; no filters, no sprites; bands start 0 / 40 / 80 ms for 300 ms each (matches BRAND); wedge settle 300 to 700 ms; letters 380 to 620 ms; slab 8° (the soft angle, as the brand says for the launch wipe) for 280 ms; layer removed at about 1.1 s when Home is ready; worst frame 16.8 ms on this machine (not the target hardware); reduced motion runs only the 120 ms fade; the loading hold runs three breathing animations. All consistent with BRAND.md. Record the breathing bands in BRAND.md as the one allowed loop besides the spinner.

## Answers to the UI-SPEC section 11 brand notes

Neutral team discs, `mark-small.svg`, the 14 px token, the badge exception, compact pill, inset ring and 2:3 posters are all correct as built. The scroll bubble and action chip are approved above.

## Adopt into BRAND.md (better than the rules)

1. **Breathing bands in the loading hold** as the single permitted loop besides the spinner (opacity 1 to .55, 1.6 s, 0 / .18 / .36 s delays), plus "no data = hold, never a progress bar" at launch.
2. **Native side panels at radius 16** (banner 14); centred dialogs stay 24.
3. **Poster caption 16/20** for 124 px posters (small 14), and the 14 px caption offset below the card so the focus ring clears it.
4. **Saved reorder pattern:** drag handle and Up/Down chevrons on the focused row, "OK drops it, Back puts it back", and a side panel naming where the order is used.
5. **Spoiler shield** (cover scores, with a Reveal action) as a first-class state of any score surface.
6. **Account as two panes** (groups left, list right), a green `Active` label with a check (allowed: `--a-ok` with an icon), and the chalk notification dot (never red).
7. **Jump sheet** (year chips for a sort that groups by year) and the scroll bubble.
8. **Search keyboard** (6 columns, 52 px keys, surface-2, ring on focus) as the standard on-screen keyboard.
9. **Game page table at 14 px** with sticky tabs and an upright totals row: closes the brief's open risk 3 for a box score (a standings table and a 7-game schedule are still untested; keep the rule "only the header plate slants").

## Before sign-off

Fix M1 and M2, apply S1 to S3, re-render the launch stills and `tv-update.png`, and send me the real-poster pass (S4). I will re-check only those.
