# Tuner — brand v2.1 ("Needle", revised)

Independent brand review and identity system (v2.1 revision: colour re-evaluated, the mark is now the T of the wordmark; see section 0) for Tuner, a personal, ad-free IPTV player used mostly on a Philips Google TV for live NBA (Memphis Grizzlies), plus movies, series and live TV; also Windows and iPhone. Everything in this folder is self-contained: hand-drawn SVG, OFL fonts, CSS tokens, a presentation board and the render checks used to judge it.

---

## 0. Revision v2.1 — colour re-evaluated, the mark is the T

Owner feedback (verbatim): *"lets just ask it to maybe think more about the colors, I do like them don't get me wrong but just do some color theory research and stuff and re evaluate that, otherwise I fw it heavy and I am thinking when the logo is next to tuner, shouldnt the T in tuner be the logo itself?"*

Reviewed by a second designer with no stake in v1. Verdict: **the owner is right about the T, and right to like the colours: the core colour call survives the research. The supporting cast does not**, and several of v1's colour claims were wrong or self-contradictory. They are listed first because they drove the changes.

### 0.1 What v1 got wrong (bluntly)

1. **The canvas broke the rule v1 wrote for it.** v1 said "nothing used as a surface is darker than `#13`, so no step disappears on a panel that crushes below video black (16/255)". The canvas `#0D0E12` is R 13, G 14, B 18: two of three channels are *below* 16. Any TV or HDMI path that treats the signal as limited range (16–235) clips R and G to zero and leaves a blue-only canvas, with `bg-1` (19,21,27) only a few codes above it.
2. **The neutral ramp was uneven and its tint drifted.** ΔL per step .032 / .034 / .038 / .044 (growing, when dark panels with raised blacks need the *low* steps to be the biggest), and chroma climbed from .009 (canvas) to .021 (surface-3), so the canvas read as neutral black while the chips read blue.
3. **`text-3` failed body contrast on `surface-3`** (3.9:1) and v1 papered over it with a size exception.
4. **Red meant two things.** `danger` was the same hex as `live` (`#FF5A4F`), contradicting v1's own rule "red means live and only live".
5. **The accent sat on the sRGB gamut edge** (C .165 at h75; the maximum possible there is .165). "Vivid" picture modes and wide-gamut expansion push exactly that colour to neon orange, and it was only 24° (hue) from the warning orange.
6. **The focus ring failed on the one thing most often focused.** White on amber is 1.7:1; v1's ring touched the amber primary button directly.
7. **The chroma-subsampling argument was oversold.** 4:2:0 hurts *video* and *HDMI sources* (a Windows PC on a TV at 4K60 outside PC mode) most; RTINGS shows it as worst for small text on flat colour. A native Google TV UI is rendered by the app/compositor, not subsampled. It is still a cheap reason to keep luminance doing the work (and it stays in the rationale), but it is not why amber won.
8. **Asset bugs:** `wordmark.svg` / `lockup.svg` were 2 units too narrow, so the R's leg was clipped; `accent-text` and `accent-hover` were the same hex.

### 0.2 Colour: research → decision

Colour spaces and harmony are guides, not law (harmony is a "widely accepted rule of thumb", per [Wikipedia: Harmony (color)](https://en.wikipedia.org/wiki/Harmony_(color)) and [the fuzzy-harmony paper, arXiv 2310.00791](https://arxiv.org/pdf/2310.00791)); every decision below is also checked numerically (`checks/palette-report.js`, `checks/contrast.js`).

| # | Finding (source) | Decision |
|---|---|---|
| 1 | **Work in OKLCH.** Oklab/OKLCH ([Ottosson 2020](https://bottosson.github.io/posts/oklab/), [overview](https://uploadcare.com/blog/oklch-in-css/)) holds hue and chroma while lightness steps evenly; Material's HCT does the same job ([material-color-utilities](https://github.com/material-foundation/material-color-utilities)). "Uniform" is an approximation, esp. at high chroma. | `checks/palette.js` defines every colour as L/C/h and fits it to sRGB. Neutrals: one hue, constant low chroma, **ΔL .040–.044 per step**. Tokens stay hex (no `oklch()`) for old WebViews. |
| 2 | **Complementary tension, but with the right neutral.** Opposite hues give the strongest contrast ([Itten schemes via Wikipedia](https://en.wikipedia.org/wiki/Harmony_(color))). Amber vs a blue-grey field is the cinema "orange vs blue" pair, and the Grizzlies are exactly that pair: gold (~h80) and Midnight/Beale Street blue (h264–273) ([unofficial hex list; the club publishes no brand book](https://www.brandcolorcode.com/memphis-grizzlies)). | **Keep** amber on a blue-tinted dark. Move the accent from h75 to **h82** (gold) and the neutrals to **h262**: now a 180° complement, not 'roughly opposite'. |
| 3 | **Amber/blue is also the most colour-blind-safe pairing.** Red-green deficiency (~8% of men, [Wikipedia](https://en.wikipedia.org/wiki/Color_blindness)) leaves the yellow-blue axis intact; amber is 11:1 vs the canvas even through deuteranopia/protanopia simulation. | Another reason to keep it. |
| 4 | **Saturated colours look brighter than their luminance (Helmholtz–Kohlrausch)**, strongest for red/blue, weak for yellow/green ([Wikipedia](https://en.wikipedia.org/wiki/Helmholtz%E2%80%93Kohlrausch_effect), [Pridmore, *The Brightness of Colour*](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2659800/)). | Amber is a safe 'big' colour: its apparent brightness tracks its luminance, so the contrast numbers are honest. Red is the colour that out-shouts its number, hence small areas only. |
| 5 | **Dark UIs: desaturate, don't max out the accent** ([Material dark theme codelab](https://codelabs.developers.google.com/codelabs/design-material-darktheme/): saturated colours "vibrate" on dark; base surface #121212, not black). TV UIs are best tested in *Standard* picture mode and sRGB; "Vivid" modes raise saturation ([Android TV: colour on TV](https://developer.android.com/design/ui/tv/guides/foundations/color-on-tv)); Amazon advises less-saturated colours ([Fire TV guidelines](https://developer.amazon.com/docs/fire-tv/design-and-user-experience-guidelines.html)). | Accent C .165 → **.162** (off the gamut edge); status colours matched at C ≈ .15; live (the one allowed 'loud' colour) .198 and small. |
| 6 | **Black crush and raised blacks.** Near-black detail is lost when a display mis-tracks gamma or black level ([How-To Geek](https://www.howtogeek.com/728797/what-is-black-crush-on-a-display/), [TFT Central](https://tftcentral.co.uk/articles/does-oled-have-a-black-crush-problem-understanding-and-testing-oled-shadow-detail), which also notes VA/IPS differ); IPS TVs have low native contrast ([RTINGS](https://www.rtings.com/tv/learn/what-is-ips)), so low steps need to be *bigger*. Video black is code 16. | Canvas lifted `#0D0E12` → **`#13161B`** (L .165 → .199): lowest channel 19, no channel can clip. Equal steps ≥ .040. Still darker than Netflix's reported `#141414` neighbourhood. |
| 7 | **Bloom / halo.** Bright objects on dark spill light on local-dimming LCDs; white subtitles, scoreboards and credits are the classic triggers ([Trusted Reviews](https://www.trustedreviews.com/explainer/what-is-blooming-on-a-tv-4415791), [Display Ninja](https://www.displayninja.com/what-is-fald-blooming-halo-effect/)). | Keep text off-white (`#F2F3F6`, not `#FFF`), no glows, all bright shapes small and flat. Focus ring stays white but is a 3 px line (see 10). |
| 8 | **TV white points drift cool** (factory modes often not D65; [What Hi-Fi](https://www.whathifi.com/features/what-is-colour-temperature-on-tvs)). | Neutral tint kept subtle (C ≤ .020) so a cool preset reads 'navy', never 'blue'. Text is near-neutral (C .004–.014). |
| 9 | **Chroma subsampling** hits small text on flat colour hardest, e.g. a PC at 4K60 outside PC mode ([RTINGS](https://www.rtings.com/tv/learn/chroma-subsampling)). | Windows build: keep the 13 px floor and 500+ weights; the luminance-led accent already helps. Honest scope: not a native Google TV issue. |
| 10 | **Don't rely on colour alone; high contrast; sRGB for UI** ([Android TV](https://developer.android.com/design/ui/tv/guides/foundations/color-on-tv)). WCAG 2.2: text 4.5:1 / large 3:1 ([1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)), UI and focus 3:1 ([1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)). WCAG 2 ratios are known to be a weak predictor on dark backgrounds (an APCA advocate's case: [W3C list](https://lists.w3.org/Archives/Public/public-silver/2023Aug/0015.html); a position, not a standard), so ratios are the gate and the rendered screens are the judge. | Every text token ≥ 4.5:1 on **all five** surfaces (v1 had an exception); focus ring gets a 2 px canvas gap so it is 18:1 against its neighbour even on amber; `outline` token for input borders (≥ 3:1). |
| 11 | **How streaming/sports brands build palettes:** one ownable colour on a near-black field and content art supplies the rest: Netflix red reserved for logo and primary action on a `#141414`-ish canvas, Hulu green on near-black (both from [unofficial token write-ups](https://kombai.com/examples/design-systems/netflix-kombai), [Hulu](https://www.webdesignhot.com/design.md/hulu/)); Max went monochrome; Disney+ moved one colour; Plex defines accents as swappable tokens ([Plex](https://plex.tv/blog/finding-your-true-colors-with-plex)). Posters are the loud colour; chrome stays quiet (the 60-30-10 idea: ~90% neutral, ≤ 10% accent). | **One accent**, kept to ≤ 10% of any screen. Rule added: amber is never a status colour (amber is also the universal 'caution' colour, so the brand must not wear it for state). |
| 12 | **Semantic colours follow convention, not harmony.** Red/amber/green are fixed by user expectation; what the designer controls is lightness, chroma and spacing. | Laddered lightness (live .66 · danger .70 · warning .76 · success .78 · accent .83) so they differ even in greyscale; hues spread (3 / 25 / 56 / 82 / 160). |

**What changed, and why (v1 → v2.1)**

| Token | v1 | v2.1 | Reason |
|---|---|---|---|
| bg-0 / bg-1 / surface-1 / 2 / 3 | `#0D0E12` `#13151B` `#1A1D24` `#22262F` `#2C313C` | `#13161B` `#1C1F26` `#262A30` `#30343C` `#3A3F47` | 0.1 #1–2, research 6/8: lifted, even ΔL, constant chroma, one hue (262) |
| text-1 / 2 / 3 / 4 | `#F2F3F5` `#B9BFCB` `#868D9B` `#5C6372` | `#F2F3F6` `#CACED5` `#ABB0B9` `#696F79` | text-3 now ≥ 4.5 on every surface; text-2 lighter to keep its separation from text-1 on the lifted canvas |
| accent | `#FFB020` (L.813 C.165 h75) | `#FABA25` (L.826 C.162 h82) | gold hue, off the gamut edge |
| accent-text / hover / press | `#FFC14D` / `#FFC14D` / `#E89C10` | `#FABA25` / `#FECA54` / `#E09F19` | accent is already 10.5:1; hover/press are ±.04/−.08 L in OKLCH |
| on-accent | `#16110A` | `#1D1409` | 10.5:1 on the new amber |
| live / live-text | `#FF5A4F` / `#FF7A70` | `#F35250` / `#FF9890` | deeper, less orange; 14 ΔE from warning (v1 10) |
| danger | `#FF5A4F` (= live) | `#F16A94` / text `#FC93AF` | red no longer means two things |
| warning | `#FF8A3D` | `#F89547` | h51→56, L .75→.76 so it passes 4.5 on surface-3 |
| success | `#3DD68C` | `#48D394` | h157→160 |
| focus | `#FFFFFF` ring | `#FFFFFF` ring **+ 2 px canvas gap** | 1.7:1 → 18:1 against its neighbour |
| *new* outline | — | `#7B828E` | input borders need 3:1; `line-strong` was 2.2 |

**Kept, because it holds up:** amber as the single brand colour; a cool, dark, near-black UI (not pure black); off-white text; red reserved for on-air; flat colour, no gradients; the white focus ring; the surface-step elevation model; the overscan margins; the type system (Archivo + Inter; the heavy wide wordmark and Archivo wdth 112 rhyme).

**Not resolved by colour alone:** accent, warning and live are all warm. ΔE: accent–warning 9.8 (v1 9.5), warning–live 14.4 (v1 10.3), and under deuteranopia accent–warning is still only 7.2. There is no hue room to fix that on a dark TV UI without abandoning amber or red/orange conventions, so the rule is structural: warning always has a ⚠ icon and words and is never primary or selected; amber never carries a ⚠; live always has the word LIVE or a clock.

### 0.3 Lockup: should the T be the logo?

Yes. v1's lockup read "T TUNER" (two T's), and the mark was also lighter than the wordmark (needle 18 wide at the top vs 23-unit letter stems). Four options were rendered (`checks/lockup-options.html/.png`, files in `checks/options/`) and judged at 104 / 34 / 22 / 14 px, blurred (squint / TV distance) and one-colour on light:

| Option | Verdict |
|---|---|
| 0 v1: mark beside TUNER | Two T's. The problem. |
| 1 v1 mark dropped in as the T | Reads as TUNER, but the T is 16% wider than any other letter and its thin needle is the lightest thing in the word: a logo stuck into a word. |
| **2 T redrawn as the mark (chosen)** | One drawing, used 1:1 as the T and as the standalone mark. Reads "TUNER" at 14 px and under blur; two-tone at every size; one-colour version works on light. |
| 3 all-amber T | Loudest at 14 px and the most colour, but the white needle (the idea) is gone and it no longer matches the standalone mark. Documented as the fallback if the amber bar proves too quiet on the real TV. |
| 4 scale spans the word | The most ownable idea, but UNER shrinks to 74%, amber becomes ~40% of the lockup (it stops being an accent) and it turns to mush below 22 px. Rejected. |

**Decision: option 2.** The mark was redrawn on the letter grid (this changes the standalone mark too; they are one drawing now): bar 97×23 (thickness = the wordmark stem, 23), needle 22 wide at the top and 28 at the baseline (average 25 against 23 stems), six ticks instead of nine, aspect 1.16 → 0.97. Gap bar-to-U = 10 (the bar is 23 tall, so the open space under its arm adds optical gap; 3 collides, 16 breaks the word). The needle is white and sits among white letters, so the amber bar reads as the T's crossbar and the white notch where the needle crosses it is the signature.

Cost, stated plainly: the amber area in the lockup is smaller than in v1 (a 97×23 bar vs v1's 116×24), and the standalone icon T is a little smaller in the Android circle (T is taller than it is wide). The heavier needle and bar compensate; the icon for iOS/Windows is scaled up to 53% of the tile.

`wordmark.svg` is now **UNER** only (outlined, `currentColor`) and is never used without the mark.

### 0.4 Files touched in this revision

`mark.svg`, `mark-small.svg`, `mark-mono.svg`, `wordmark.svg`, `lockup.svg`, `lockup-mono.svg`, `icon-1024.svg/.png`, `icon-foreground-108.svg`, `tv-banner.svg/.png/@2x.png`, `tokens.css`, `board.html/.png`, `checks/` (see 7). All SVGs are generated from `checks/geometry.js` + `checks/palette.js` by `node checks/build-logo.js` and contain plain hand-readable paths: no raster, no live text.

### 0.5 Not verified

Everything here is judged on rendered PNGs and computed ratios, not on the owner's Philips panel. Before shipping, look at the lifted canvas, the amber/warning pair and the focus ring on the real TV in *Standard* and *Vivid* modes. If the amber bar looks too quiet there, fall back to option 3. Some research pages (Ottosson's post, RTINGS, Wikipedia) could not be fetched in this environment; those citations rest on search summaries of the same pages.

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
Tuner = the moment static snaps into picture. The mark is a **dial scale with the needle locked through it**: an amber scale bar (the back-lit frequency scale of a radio tuner, six ticks knocked out of its lower edge) and a white needle that passes through it. The silhouette is a T; the story is a tuner; **and since v2.1 it is the T of the word**. One gesture, two shapes, two colours, no effects.

Why amber: it is the colour of a tuner's dial lamp and of Grizzlies gold (h80), it is a straight complement of the navy-tinted neutrals (h262), it is luminous (L .83) so it carries on luma alone, its apparent brightness tracks its luminance (weak Helmholtz–Kohlrausch for yellow), and amber/blue is the pairing that survives red-green colour blindness. See section 0.2 for the sources and for what was re-checked.

### Do
- Put the mark only on `bg-0`/`bg-1`; bar in `accent`, needle and letters in `text-1`. Light backgrounds (docs, store pages) use the one-colour versions in `#13161B`.
- Use amber for: the mark, **one** primary action per screen, the selected tab/nav item, progress, "your team".
- Red (`live`) only for on-air: the live dot always paired with the word LIVE or a clock. Errors use `danger` (rose) with an icon and text. Warnings use `warning` with a ⚠ icon and words.
- Focus on TV = white 3 px ring with a 2 px canvas-coloured gap, plus a lift/scale; never colour alone.
- Archivo (wide, 700–800) for page titles, section headers, scores; Inter 500+ for everything you read. Nothing under 13 px on the 960×540 canvas.
- Flat colour; elevation by surface step; lines ≥ 2 px on TV; overscan safe margins 48×27 px on the 960×540 canvas.
- Keep clear space of half the cap height on every side of mark and lockup.

### Don't
- No gradients, glows, radial halos, drop shadows, scanlines, arcs, ribbons or any third colour on the mark or in UI chrome.
- No red buttons, red headings, red brand use, red nav. No amber warnings.
- Don't place a second T next to the mark, and don't set the word without its mark-T. `wordmark.svg` is "UNER" and is not a standalone wordmark.
- Don't rotate, outline, stroke, recolour, pattern or animate the needle (a 1.4 s opacity pulse on boot is the only motion allowed, on the whole mark).
- Don't set the wordmark in a font; it is outlined paths. Don't letterspace it or add "TV", "+" or "Player".
- Don't use Bricolage Grotesque, Figtree, JetBrains Mono or system fonts in product UI.
- Don't put the mark below 24 px (use `mark-small.svg` between 16 and 32 px, nothing under 16).

---

## 3. Logo files

| File | Use |
|---|---|
| `mark.svg` | the symbol = the T, two-colour (amber bar, white needle), viewBox 97×100 |
| `mark-mono.svg` | one-colour symbol, `currentColor` |
| `mark-small.svg` | ≤32 px: same geometry, ticks removed |
| `wordmark.svg` | **UNER** only (custom wide grotesque, outlined, `currentColor`, cap height 100, 392 wide). Never used alone |
| `lockup.svg` | the lockup: mark (T) + UNER, cap height 100, 499×100 |
| `lockup-mono.svg` | one-colour lockup, `currentColor` |

Geometry (cap height 100): bar 97×23 (= wordmark stem); six ticks 3.9×11.5, centres 20 / 30.5 / 41 from the needle axis (pitch 10.5); needle 22 wide at the top, 28 at the baseline; gap bar → U = 10. The needle average (25) matches the stems (23), so the T reads as one weight with U-N-E-R.

Minimum sizes: mark 24 px tall (16 px with `mark-small.svg`); lockup 90 px wide desktop, 140 px TV canvas. Clear space: half the cap height all round (50 units).

Where the mark goes in the app:
- **Rail brand** (`.rail-brand`): `mark.svg` at 44 px tall CSS on TV (88 device px, checked in `checks/tv-1080.png`), 36–40 px desktop. The tally dot sits *outside* the clear space, bottom-right, and uses `live`.
- **Boot splash / sign-in**: `lockup.svg` at 200 px wide on the TV canvas (cap height 40 CSS px, 80 device px), 160 px desktop.
- **Player overlays**: no mark. The channel name is the brand there.
- **Windows**: `icon-1024.png` for the installer/taskbar, `mark-small.svg` for the 16/24/32 px tray and title-bar icons.

---

## 4. App icons

- `icon-1024.svg` / `icon-1024.png` — flat square, `#13161B`, T 540 px tall (scale 5.4), visual centre at grid (48.5,46). For iOS, Windows and store listings, which apply their own corner masks (do not pre-round). **Not for Android adaptive masks.**
- `icon-foreground-108.svg` — the T at scale 4.5 (450 px of 1024) on the 108 dp adaptive grid, transparent, for `res/drawable/ic_launcher_foreground.xml` (convert with Android Studio's Vector Asset tool or `svg2vector`). The bar's top corners sit 301 px from the centre, inside the 313 px safe circle (66/108 dp). Background layer: solid `#13161B` (`ic_launcher_background`). Android TV does not use monochrome/themed icons ([TV app icon guidelines](https://developer.android.com/design/ui/tv/guides/system/tv-app-icon-guidelines)).
- `tv-banner.svg` / `tv-banner.png` (320×180, xhdpi) / `tv-banner@2x.png` (640×360, xxxhdpi) — the lockup at cap height 46 (v1: 35; the compact T-in-word lockup grows 30% in the same safe area), centred inside the central 80×60 % safe area, no border, text baked in as Google requires ([Android TV getting started](https://developer.android.com/training/tv/start/start)). Export 480×270 for xxhdpi from the SVG.

---

## 5. Colour — `tokens.css`

TV-first, cool near-black. The source of truth is `checks/palette.js` (OKLCH); `tokens.css` carries the fitted hex values and their L/C/h. Ground rules: no channel of any surface below 19/255; neutrals one hue (262) at constant low chroma, lightness in even steps of ~.042; off-white text; status colours never used as a fill behind text.

| Token | Hex | OKLCH (L C h) | Role |
|---|---|---|---|
| bg-0 | #13161B | .199 .011 261 | canvas, rails, letterbox |
| bg-1 | #1C1F26 | .239 .014 267 | raised regions, sheets |
| surface-1 | #262A30 | .284 .012 258 | cards, rows, inputs |
| surface-2 | #30343C | .324 .015 264 | hover / selected |
| surface-3 | #3A3F47 | .366 .015 260 | pressed, chips |
| line / line-strong | #333840 / #4A505B | .339 / .430 | decorative hairlines / dividers |
| outline | #7B828E | .605 .020 261 | control borders (≥ 3:1) |
| text-1 / 2 / 3 / 4 | #F2F3F6 / #CACED5 / #ABB0B9 / #696F79 | .964 / .850 / .756 / .540 | primary / secondary / tertiary / disabled-only |
| accent | #FABA25 | .826 .162 82 | brand: mark bar, primary action, selection |
| accent-hover / press | #FECA54 / #E09F19 | .864 / .746 | states |
| on-accent | #1D1409 | .199 .025 71 | text on amber |
| focus | #FFFFFF | — | 3 px ring + 2 px canvas gap |
| live / live-text | #F35250 / #FF9890 | .659 .198 25 / .785 .125 25 | on-air only |
| danger / danger-text | #F16A94 / #FC93AF | .700 .170 3 / .781 .130 3 | errors, icon + text |
| success | #48D394 | .776 .151 160 | connected, healthy stream |
| warning | #F89547 | .760 .150 56 | buffering, weak signal, expiring; ⚠ + words |

### Contrast, every text/background pair (`node checks/contrast.js`; body ≥ 4.5:1, large ≥ 3:1, non-text ≥ 3:1)

Text tokens on every surface (**all pass 4.5:1 body; no exceptions**):

| Text token (hex) | bg-0 | bg-1 | surface-1 | surface-2 | surface-3 |
|---|---|---|---|---|---|
| text-1 #F2F3F6 | 16.3 | 14.9 | 13.0 | 11.3 | 9.5 |
| text-2 #CACED5 | 11.5 | 10.4 | 9.1 | 7.9 | 6.7 |
| text-3 #ABB0B9 | 8.3 | 7.6 | 6.6 | 5.7 | 4.9 |
| accent #FABA25 | 10.5 | 9.5 | 8.3 | 7.2 | 6.1 |
| accent-hover #FECA54 | 11.9 | 10.8 | 9.5 | 8.2 | 7.0 |
| live-text #FF9890 | 8.8 | 8.0 | 7.0 | 6.0 | 5.1 |
| danger-text #FC93AF | 8.6 | 7.8 | 6.8 | 5.9 | 5.0 |
| success #48D394 | 9.5 | 8.7 | 7.6 | 6.6 | 5.6 |
| warning #F89547 | 8.1 | 7.4 | 6.4 | 5.6 | 4.7 |

Non-text (icons, dots, borders, focus; >= 3:1):

| Token (hex) | bg-0 | bg-1 | surface-1 | surface-2 | surface-3 |
|---|---|---|---|---|---|
| accent #FABA25 | 10.5 | 9.5 | 8.3 | 7.2 | 6.1 |
| live #F35250 | 5.3 | 4.8 | 4.2 | 3.6 | 3.1 |
| danger #F16A94 | 6.2 | 5.7 | 5.0 | 4.3 | 3.6 |
| focus #FFFFFF | 18.1 | 16.5 | 14.4 | 12.5 | 10.6 |
| outline #7B828E | 4.7 | 4.3 | 3.7 | 3.2 | n/a (not used there) |


Other pairs:

| Pair | Ratio | Verdict |
|---|---|---|
| on-accent on accent / hover / press | 10.5 / 11.9 / 7.9 | body ✓ (buttons) |
| bg-0 (one-colour mark on amber) on accent | 10.5 | ✓ |
| live-text on live-soft over surface-1 / surface-2 (LIVE pill) | 5.8 / 5.1 | body ✓ |
| accent on accent-soft over surface-1 / surface-2 (chip) | 6.1 / 5.3 | body ✓ |
| text-1 on a solid `live` fill | 3.1 | large/bold only: so no white text on red fills; the LIVE pill is outlined |
| focus ring against the 2 px canvas gap | 18.1 | non-text ✓ |
| focus ring touching an amber button (no gap) | 1.7 | ✗, why the gap exists |
| text-4 on bg-0 / bg-1 | 3.6 / 3.3 | disabled only, never information |
| line on bg-0 | 1.5 | decorative, not required |

Colour-vision check (simulated, ΔE_OK ×100; `node checks/palette-report.js`):

| Pair | normal | deuteranopia | protanopia |
|---|---|---|---|
| accent / warning | 9.8 | 7.2 | 9.7 |
| accent / live | 24.2 | 17.6 | 25.2 |
| warning / live | 14.4 | 10.4 | 15.5 |
| live / danger | 8.5 | 8.3 | 10.1 |
| danger / success | 32.3 | 6.9 | 21.5 |
| accent / bg-0 (luma ratio) | — | 11.1:1 | 9.4:1 |

Bloom notes: amber and green are luminance-heavy, so they survive panel sharpening and chroma blur; live red is a small, flat area only (dot, pill border, short text), never a fill behind text.

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

- `board.html` / `board.png` — the one-page presentation (generated by `checks/build-board.js` from the palette, so it cannot drift): lockups on dark and light, the lockup study, mark anatomy, minimum sizes, icons and banner, colour revision with hue map and colour-vision check, v1 → v2.1 decisions, type, rules, sample TV home screen.
- `checks/lockup-options.html` / `.png` and `checks/options/*.svg` — the five lockup options and the gap study.
- `checks/tv-1080.html` → `checks/tv-1080.png` — the sample screen rendered at a real 1920×1080 (960×540 canvas × 2).
- `checks/sizes.html` → `checks/sizes.png` — 64/48/32/24/16 px marks, icon tiles, banner at 320/160, lockup at 320/200/120, mono on light and dark.
- `checks/palette.js` (OKLCH source of truth), `color.js` (OKLab/OKLCH, WCAG, colour-vision simulation, ΔE), `geometry.js` (logo geometry), `build-logo.js` (writes every SVG), `build-board.js`, `options.js`.
- `checks/contrast.js` — the full contrast table; `checks/palette-report.js` — OKLCH table and colour-vision separation.
- `checks/render.js` — Playwright renderer (`NODE_PATH=$(npm root -g) node checks/render.js in.html out.png w h scale`); `checks/shot.js` — full-page screenshot.
- `checks/process-exploration.*` — v1's tick/needle study, kept as history (superseded by the T redraw).
- `fonts/` — the two woff2 files used by the board plus their OFL licences.

Rebuild everything: `node checks/build-logo.js && node checks/options.js && node checks/build-board.js`, then render PNGs.

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
- **v2.1 colour research:** Oklab/OKLCH: https://bottosson.github.io/posts/oklab/ , https://uploadcare.com/blog/oklch-in-css/ ; Material HCT: https://github.com/material-foundation/material-color-utilities ; colour harmony: https://en.wikipedia.org/wiki/Harmony_(color) , https://arxiv.org/pdf/2310.00791 ; Helmholtz–Kohlrausch: https://en.wikipedia.org/wiki/Helmholtz%E2%80%93Kohlrausch_effect , https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2659800/ ; colour blindness prevalence: https://en.wikipedia.org/wiki/Color_blindness
- **TV panels:** black crush https://www.howtogeek.com/728797/what-is-black-crush-on-a-display/ , https://tftcentral.co.uk/articles/does-oled-have-a-black-crush-problem-understanding-and-testing-oled-shadow-detail ; IPS low native contrast https://www.rtings.com/tv/learn/what-is-ips ; blooming https://www.trustedreviews.com/explainer/what-is-blooming-on-a-tv-4415791 , https://www.displayninja.com/what-is-fald-blooming-halo-effect/ ; chroma subsampling https://www.rtings.com/tv/learn/chroma-subsampling ; TV colour temperature https://www.whathifi.com/features/what-is-colour-temperature-on-tvs
- **Platform guidance:** Android TV colour https://developer.android.com/design/ui/tv/guides/foundations/color-on-tv ; Fire TV https://developer.amazon.com/docs/fire-tv/design-and-user-experience-guidelines.html ; Material dark theme https://codelabs.developers.google.com/codelabs/design-material-darktheme/ ; WCAG 2.2 https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html , https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html ; APCA argument (position, not standard) https://lists.w3.org/Archives/Public/public-silver/2023Aug/0015.html
- **Brands:** Plex tokens https://plex.tv/blog/finding-your-true-colors-with-plex ; Netflix / Hulu palettes (unofficial token write-ups, treat hex as approximate) https://kombai.com/examples/design-systems/netflix-kombai , https://www.webdesignhot.com/design.md/hulu/ ; Grizzlies colours (unofficial; no public brand book) https://www.brandcolorcode.com/memphis-grizzlies
