# Tuner — brand v2 ("Needle")

Independent brand review and new identity system for Tuner, a personal, ad-free IPTV player used mostly on a Philips Google TV for live NBA (Memphis Grizzlies), plus movies, series and live TV; also Windows and iPhone. Everything in this folder is self-contained: hand-drawn SVG, OFL fonts, CSS tokens, a presentation board and the render checks used to judge it.

---

## 1. Critique of the current identity

**Score: 3.5 / 10** against Netflix, Max, Apple TV, Disney+, YouTube TV, Peacock, ESPN, DAZN, the NBA app, Plex and TiviMate.

What is there today (`design/tuner-mark.svg`, the sprite in `app/index.html`, `android/.../banner.png`, `mipmap-*/ic_launcher.png`):

1. **Four ideas stacked on one letter.** The T is a folded ribbon (Netflix's N fold, slanted stem cut), *and* it is cut into CRT scanlines, *and* it has "wifi" broadcast arcs on both sides, *and* it sits in a radial red glow on a dark-red radial background, with a three-stop amber→red→magenta gradient. Each of the three concepts on `concepts.png` was a legitimate direction; "mix them all" produced a mark with no single reading. Every leading streaming mark is one gesture: Netflix's fold, Disney's arc, YouTube's play, Plex's chevron, Peacock's five feathers. Tuner's has none you could describe in a sentence.
2. **It fails the sizes that matter.** On the TV rail (≈68 device px) the scanlines alias into an orange smear and the grey arcs vanish into the background; at 48 px it is an orange-pink blob; at 24 px it is unreadable. The current `ic_launcher.png` pushes the arms almost to the tile edge, so a circular adaptive mask (phones, Google TV "Your apps") clips both arms — the mark literally loses its crossbar.
3. **The gradient is the most dated part and the worst for TV panels.** Saturated red/magenta over a red radial glow is exactly the content that blooms on a VA/LCD panel and smears under 4:2:0 chroma subsampling; the glow also sinks into the #05–#0c blacks that crushed Philips presets swallow. Netflix survives on red because the N is a flat, luminous red with hard edges and nothing glowing behind it.
4. **Red is doing three jobs.** It is the brand colour, the "live" tally, *and* the selected-nav colour (home icon). On a sports app the one colour that must stay unambiguous is "on air". When everything is red, nothing is live.
5. **The wordmark is the best part — and it is still generic.** The custom ultra-condensed caps are competent and read well in the banner, but they are the default "sports poster" condensed of every esports team and fitness app. The odd R leg and the uneven N counters show at banner size.
6. **The type pairing is wrong for the room.** Bricolage Grotesque is an editorial, quirky display face (newsletter energy); on a 10-foot UI its idiosyncratic shapes read as noise ("Loading your channels…" in the TV screenshot looks like a magazine pull-quote). Inter for text is fine but anonymous, and nothing in the system expresses "sport" or "broadcast".
7. **Banner composition.** The 320×180 banner puts a glowing, cropped mark next to the wordmark with no shared baseline; the glow extends past the mark box, so the launcher's row scaling makes it look soft next to Netflix's hard red tile.
8. **What is right and I kept:** the dark, near-black UI; the rail layout; red reserved as a *tally* (I made that rule absolute); the wish for a loud, confident, Netflix-grade mark; and the instinct that the T should be built out of broadcast hardware rather than a letter with a hat.

Per-brand comparison (how the current identity stacks up against each):

| Brand | What they do | Tuner today |
|---|---|---|
| Netflix | one flat red, one fold, hard edges; N alone for small spaces ([brand red #E50914](https://brandkit.pro/brand/netflix)) | gradient + glow + fold + lines; no small-space version |
| Max / HBO Max | abandoned blue for monochrome black/white to read as prestige ([NewscastStudio](https://www.newscaststudio.com/2025/04/02/max-rebranding-2025/)) | dark base is right, but noise on top |
| Apple TV | flat "tv" lockup, SF-derived custom face, no decoration ([Macworld](https://www.macworld.com/article/2939653/apple-tv-is-getting-a-surprising-rebrand-see-the-new-logo-here.html)) | opposite: decoration first |
| Disney+ | one colour change (blue → "Aurora" teal) carried the whole 2024 story ([NewscastStudio](https://www.newscaststudio.com/2024/03/27/disney-plus-hulu-integration/)) | three colours in one mark |
| Peacock | five flat feather colours on black, geometric sans ([madegooddesigns](https://madegooddesigns.com/peacock-brand-guidelines/)) | flat colour would help Tuner the same way |
| ESPN | a fixed 7° angle and a custom face "Ignite" codified in 2026 guidelines ([Marketing Brew](https://www.marketingbrew.com/stories/2026/03/09/espn-brand-identity)) | no rule or constant to build a system on |
| DAZN | white block caps in a thick-outlined container on black; letters drawn from sport motion ([D&AD](https://www.dandad.org/awards/professional/2020/232837/dazn-creative-branding-scheme)) | wordmark is close in spirit; lacks a container/constant |
| Plex | kept the chevron, dropped gradients for solid colours ([Plex blog](https://plex.tv/blog/new-logo-same-plex)) | still on gradients |
| YouTube TV / NBA app | mark + wordmark lockups, mark alone as icon | banner is a lockup but mark alone fails |
| TiviMate | flat, one-colour tile; functional, forgettable | Tuner should beat it on craft, not noise |

---

## 2. The brand

### Positioning
Tuner is one person's private broadcast desk: every channel, game and film they already pay for, in one fast, ad-free place, with nothing standing between them and the Grizzlies tip-off. It behaves like a precision instrument, not a storefront.

### Personality
- **Locked-on** — precise, instant, no drift. The needle is on the station.
- **Quiet confidence** — one colour, flat shapes, hard edges. Nothing glows, nothing sells.
- **Broadcast-grade** — scoreboard numerals, 10-foot legibility, red means on-air.
- **Yours** — personal, not corporate; the brand never talks like a service.

### The idea: "Needle"
Tuner = the moment static snaps into picture. The mark is a **dial scale with the needle locked through it**: an amber scale bar (the back-lit frequency scale of a radio tuner, ticks knocked out of its lower edge) and a white needle that passes through it, 14 units wide at the scale and 20 at the base. The silhouette is a T; the story is a tuner. It is one gesture, two shapes, two colours, no effects. At 16 px it is still a two-tone T; at 1080p the ticks read as a scale.

Why amber, not red: the owner's app lives on a dark LCD TV where saturated red and blue bloom and smear under 4:2:0 chroma subsampling (colour is stored at quarter resolution; edges live in luminance — see [Transloadit: chroma subsampling](https://transloadit.com/glossary/chroma-subsampling/)). Amber #FFB020 has luminance ≈ 0.53, so it carries on luma alone, reads across the room, and never competes with the one thing that must stay red: LIVE. It is also the colour of a tuner's dial lamp, and a nod (not a copy) of Grizzlies gold.

### Do
- Put the mark only on `bg-0`/`bg-1`; scale in `accent`, needle in `text-1`. Light backgrounds (docs, store pages) use the one-colour versions in `#0D0E12`.
- Use amber for: the mark, **one** primary action per screen, the selected tab/nav item, progress, "your team".
- Red (`live`) only for on-air: the live dot always paired with the word LIVE or a clock. Errors use `danger` with an icon and text.
- Focus on TV = white 3 px ring plus a lift/scale; never colour alone.
- Archivo (wide, 700–800) for page titles, section headers, scores; Inter 500+ for everything you read. Nothing under 13 px on the 960×540 canvas.
- Flat colour; elevation by surface step; lines ≥ 2 px on TV; overscan safe margins 48×27 px on the 960×540 canvas.
- Keep clear space of half the mark's height on every side of mark and lockup.

### Don't
- No gradients, glows, radial halos, drop shadows, scanlines, arcs, ribbons or any third colour on the mark or in UI chrome.
- No red buttons, red headings, red brand use, red nav.
- Don't rotate, outline, stroke, recolour, pattern or animate the needle (a 1.4 s opacity pulse on boot is the only motion allowed, on the whole mark).
- Don't set the wordmark in a font; it is outlined paths. Don't letterspace it or add "TV", "+" or "Player".
- Don't use Bricolage Grotesque, Figtree, JetBrains Mono or system fonts in product UI.
- Don't put the mark below 24 px (use `mark-small.svg` between 16 and 32 px, nothing under 16).

---

## 3. Logo files

| File | Use |
|---|---|
| `mark.svg` | the symbol, two-colour (amber scale, white needle), 100-unit grid |
| `mark-mono.svg` | one-colour symbol, `currentColor` |
| `mark-small.svg` | ≤32 px: same geometry, ticks removed |
| `wordmark.svg` | custom wide grotesque "TUNER", outlined, `currentColor`, cap height 100, 488 wide |
| `lockup.svg` | horizontal lockup, mark height = cap height, 32-unit gap, 636×100 |
| `lockup-mono.svg` | one-colour lockup, `currentColor` |

Geometry (grid 100): scale bar x6–94, y14–32 (88×18); nine ticks 3×9 every 8 units from the bar's lower edge; needle 43–57 at the scale, 40–60 at y90. The needle base (20) scaled into the lockup = 26, the wordmark stroke = 23 — they read as one weight.

Minimum sizes: mark 24 px (16 px with `mark-small.svg`); lockup 90 px wide desktop, 140 px TV canvas. Clear space: half the mark height all round (50 units on the lockup's 100 grid).

Where the mark goes in the app:
- **Rail brand** (`.rail-brand`): `mark.svg` at 44 px CSS on TV (88 device px — checked in `checks/tv-1080.png`), 36–40 px desktop. The tally dot sits *outside* the clear space, bottom-right, and uses `live`.
- **Boot splash / sign-in**: `lockup.svg` at 200 px wide on the TV canvas (400 device px), 160 px desktop.
- **Player overlays**: no mark. The channel name is the brand there.
- **Windows**: `icon-1024.png` for the installer/taskbar (Windows masks nothing; the mark is centred at 50 % width, which is normal for a tile), `mark-small.svg` for the 16/24/32 px tray and title-bar icons.

---

## 4. App icons

- `icon-1024.svg` / `icon-1024.png` — flat square, `#0D0E12`, mark centred with visual centre at grid (50,44), scale ×5.87. The whole mark sits inside the Android adaptive safe circle (66/108 dp = 626 px). iOS and Windows apply their own corner masks; do not pre-round.
- `icon-foreground-108.svg` — the same placement on the 108 dp adaptive grid, transparent, for `res/drawable/ic_launcher_foreground.xml` (convert with Android Studio's Vector Asset tool or `svg2vector`). Background layer: solid `#0D0E12` (`ic_launcher_background`). Android TV does not use monochrome/themed icons, so no monochrome layer is needed ([TV app icon guidelines](https://developer.android.com/design/ui/tv/guides/system/tv-app-icon-guidelines)).
- `tv-banner.svg` / `tv-banner.png` (320×180, xhdpi) / `tv-banner@2x.png` (640×360, xxxhdpi) — full lockup on flat near-black, inside the central 80×60 % safe area, no border (borders get cropped in the launcher), text baked in as Google requires ([Android TV getting started](https://developer.android.com/training/tv/start/start)). Export 480×270 for xxhdpi from the SVG.

---

## 5. Colour — `tokens.css`

TV-first, near-black. Nothing used as a surface is darker than `#13`, so no step disappears on a panel that crushes below video black (16/255), and the canvas `#0D0E12` is still clearly above letterboxed video black. Pure white is avoided for text (glare/flicker at 10 ft); `#F2F3F5` is the top text level.

| Token | Hex | Role |
|---|---|---|
| bg-0 | #0D0E12 | canvas, rails, letterbox |
| bg-1 | #13151B | raised regions, sheets |
| surface-1 | #1A1D24 | cards, rows, inputs |
| surface-2 | #22262F | hover / selected |
| surface-3 | #2C313C | pressed, chips |
| line / line-strong | #2A2F3A / #3A4150 | hairlines |
| text-1 / 2 / 3 / 4 | #F2F3F5 / #B9BFCB / #868D9B / #5C6372 | primary / secondary / tertiary / disabled-only |
| accent | #FFB020 | the brand colour (mark scale, primary action, selection) |
| accent-text | #FFC14D | amber used as small text/icons |
| on-accent | #16110A | text on amber |
| focus | #FFFFFF | 3 px d-pad ring |
| live / live-text | #FF5A4F / #FF7A70 | on-air only |
| success | #3DD68C | connected, healthy stream |
| warning | #FF8A3D | buffering, weak signal, expiring |

WCAG 2.x contrast (full table from `node checks/contrast.js`; body text needs ≥ 4.5:1, large ≥ 3:1):

| Pair | Ratio | Verdict |
|---|---|---|
| text-1 on bg-0 / bg-1 / surface-1 / surface-2 / surface-3 | 17.4 / 16.4 / 15.2 / 13.6 / 11.7 | body ✓ everywhere |
| text-2 on bg-0 / bg-1 / surface-1 / surface-2 / surface-3 | 10.5 / 9.9 / 9.1 / 8.2 / 7.1 | body ✓ everywhere |
| text-3 on bg-0 / bg-1 / surface-1 / surface-2 | 5.8 / 5.5 / 5.1 / 4.5 | body ✓ |
| text-3 on surface-3 | 3.9 | large text only (≥ 18 px / 24 px bold) — rule in tokens.css |
| text-4 on bg-0 / bg-1 | 3.2 / 3.0 | disabled only, never for information |
| accent on bg-0 / surface-1 / surface-3 | 10.6 / 9.2 / 7.1 | ✓ (icons, large labels) |
| accent-text on bg-0 / surface-3 | 11.9 / 8.1 | body ✓ |
| on-accent on accent | 10.3 | body ✓ (buttons) |
| live-text on bg-0 / surface-1 / surface-3 | 7.6 / 6.6 / 5.1 | body ✓ |
| live (dot/border) on bg-0 / surface-1 | 6.3 / 5.5 | non-text ✓ |
| success on bg-0 / surface-3 | 10.3 / 7.0 | body ✓ |
| warning on bg-0 / surface-3 | 8.2 / 5.6 | body ✓ |
| focus ring on bg-0 … surface-3 | 19.3 … 13.0 | non-text ✓ |
| on-light (#0D0E12) on accent | 10.6 | ✓ (mono mark on amber if ever needed) |

Bloom notes: amber and green are luminance-heavy, so they survive panel sharpening and chroma blur; the live red is deliberately desaturated toward coral (`#FF5A4F`) and only ever used in small areas (dot, pill border, short text), never as a fill behind text.

---

## 6. Type

- **Display: Archivo Variable** — `@fontsource-variable/archivo` (SIL OFL 1.1). Import `@fontsource-variable/archivo/standard.css` to get both axes (wght 100–900, wdth 62–125). Use `font-stretch: 112%` at 700–800 for titles and eyebrows (wide = broadcast), `100%` tabular for scores, `84%` for dense tables and channel numbers.
- **Text: Inter Variable** — `@fontsource-variable/inter` (SIL OFL 1.1), `wght.css`. Weight 500 minimum on TV (400 goes thin on VA panels), 650 for row titles, `font-variant-numeric: tabular-nums` on.
- Drop `@fontsource-variable/bricolage-grotesque`, `figtree`, `jetbrains-mono`.

Type scale, 960×540 TV canvas (1 rem = 16 px; 1 CSS px = 2 device px at 1080p):

| Style | Size / line | Face |
|---|---|---|
| display-xl | 56 / 60 | Archivo 800, wdth 112, −0.02em — game title, hero |
| display | 40 / 44 | Archivo 800, wdth 112 — page title, big scores |
| headline | 28 / 32 | Archivo 700, wdth 112 — section headers, card titles |
| title | 22 / 28 | Inter 650 — rows, channel names |
| body-lg | 18 / 26 | Inter 500 |
| body | 16 / 24 | Inter 500 |
| label | 14 / 18 | Inter 650, caps, +0.08em — eyebrows, pills |
| caption | 13 / 16 | Inter 500 — floor; nothing smaller on TV |

Desktop (`:root.desktop`, 1 rem = 15 px): display-xl 44/48, display 34/38, headline 24/28, title 18/24, body-lg 16/24, body 14/20, label 12/16, caption 12/16; focus ring 2 px. Phone uses the desktop scale.

---

## 7. Board and checks

- `board.html` / `board.png` — the one-page presentation: lockups on dark and light, mark anatomy, minimum sizes, icon and banner, palette with ratios, type, a sample TV home screen, do/don't.
- `checks/tv-1080.html` → `checks/tv-1080.png` — the sample screen rendered at a real 1920×1080 (960×540 canvas × 2): rail mark at 88 device px, lockup at 400 px.
- `checks/sizes.html` → `checks/sizes.png` — 64/48/32/24/16 px mark, icon tiles at 96/48/24, banner at 320/160, lockup at 320/200/120, mono on light and dark.
- `checks/process-exploration.html/.png` — the tick/needle study the final mark came from.
- `checks/contrast.js` — the ratio table. `checks/render.js` — Playwright renderer (`NODE_PATH=$(npm root -g) node checks/render.js in.html out.png w h scale`).
- `fonts/` — the two woff2 files used by the board plus their OFL licences.

---

## 8. Sources

- Android TV app icon and banner guidelines (banner densities 160×90 … 640×360, launcher 80 … 320 px, 72×72 safe zone, text must be in the banner, no borders): https://developer.android.com/design/ui/tv/guides/system/tv-app-icon-guidelines
- Android TV getting started (xhdpi 320×180 banner, `android:banner`): https://developer.android.com/training/tv/start/start
- Adaptive icons (108 dp layers, 66 dp safe zone, 18 dp reserved margin, logo 48–66 dp): https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
- Android TV typography foundations (viewing distance, 15-style scale, Roboto default): https://developer.android.com/design/ui/tv/guides/styles/typography
- Apple HIG, app icons (tvOS 800×480 layered, 1024 square for iOS, keep text above layers, safe zone): https://developer.apple.com/design/human-interface-guidelines/app-icons
- Chroma subsampling and why saturated-colour edges blur (4:2:0): https://transloadit.com/glossary/chroma-subsampling/ and https://www.forasoft.com/learn/video-encoding/glossary/terms/420
- Pure black on OLED ("hole in the screen") and near-black recommendations: https://design.verdigris.co/examples/bad/pure-black-dark-mode ; Material dark theme #121212 rationale: https://en.wikipedia.org/wiki/Dark_mode
- Netflix red #E50914 and N-alone secondary mark: https://brandkit.pro/brand/netflix , https://madegooddesigns.com/netflix-brand-guidelines/
- Max 2023 blue → 2025 monochrome, and why: https://www.newscaststudio.com/2025/04/02/max-rebranding-2025/ , https://www.creativebloq.com/news/hbo-max-blue
- Disney+ "Aurora" teal (2024): https://www.newscaststudio.com/2024/03/27/disney-plus-hulu-integration/
- Peacock identity (loyalkaspar, feather palette, geometric sans): https://madegooddesigns.com/peacock-brand-guidelines/ , https://creativepool.com/loyalkaspar/projects/peacock-brand-identity-sizzle
- ESPN identity guidelines (7° angle, "Ignite" typeface): https://www.marketingbrew.com/stories/2026/03/09/espn-brand-identity
- DAZN Creative branding scheme (D&AD 2020): https://www.dandad.org/awards/professional/2020/232837/dazn-creative-branding-scheme
- Plex 2022 logo (chevron kept, gradients dropped): https://plex.tv/blog/new-logo-same-plex
- Apple TV 2025 rebrand (custom "SF TV", flat lockup): https://www.macworld.com/article/2939653/apple-tv-is-getting-a-surprising-rebrand-see-the-new-logo-here.html
- NBA app redesign (full-screen video, bigger type): https://www.pressreader.com/usa/fast-company/20230601/281930252409865
- Fonts: https://www.npmjs.com/package/@fontsource-variable/archivo , https://www.npmjs.com/package/@fontsource-variable/inter (both OFL-1.1)
