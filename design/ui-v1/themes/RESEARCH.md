# Themes: research (8 Nov)

The owner asked for themes: a Grizzlies theme, OLED black, and a couple of mood themes. Two pieces of research fed the
design: how colour is wired in the app today (the code), and current outside sources. Where a claim is the researcher's
own inference rather than a source, it says so.

## A. How colour is wired today (the code)

- **One token file for all three apps:** `app/tv/brand/tokens.css` `:root`, linked by `tv.html`, `phone.html`,
  `desktop.html` and `desktop/overlay.html` before their own CSS. The phone and desktop add only layout tokens, plus
  `--ph-glass:rgba(30,27,40,.78)` and `--ph-glass-line:rgba(243,239,230,.12)`.
  - Surfaces: `--a-bg-0 #15131D`, `--a-bg-1 #1E1B28`, `--a-surface-1 #2D2B35`, `-2 #3D3B45`, `-3 #4F4C5A`,
    `--a-border #3C3452`, `--a-border-strong #918BA7`, `--a-scrim rgba(21,19,29,.72)`.
  - Text: `--a-text-1 #F3EFE6`, `-2 #D2CEE2`, `-3 #C8C4D8`, `-4 #726E81`, `--a-ink #14101F`.
  - Brand: `--a-pink #F95BAC`, `--a-orchid #D540F5`, `--a-pink-text #FFB4D4`, `--a-orchid-text #E9AFF2`,
    `--a-violet #5B2BD9`, `--a-violet-ui #9D7DFF`, `--a-pink-soft`, and `--a-grad` (pink to orchid, 100deg).
  - Live: `--a-live #FF4B4B`, `--a-live-text #FF8F8F`, `--a-live-soft`.
  - Status and focus: `--a-ok #47D394`, `--a-focus #FFFFFF`, `--a-focus-ring`, `--a-focus-ring-inset`.
  - Texture: `--a-grain`.
- **Hard-coded colour outside the tokens:** about 400 literals. Most are bg-0 and bg-1 written out as
  `rgba(21,19,29,a)` or `rgba(30,27,40,a)` for scrims and panels.

  | File | Literals (about) |
  |---|---|
  | `desktop.css` | 150 |
  | `phone.css` | 100 |
  | `home.css` | 40 |
  | `ui.css` | 40 |
  | `app.css` | 16 |

  - `ui.css:267` adds `--scrim-*`, also written from those rgba values.
  - `launch.css` writes the gradient out by hand.
  - `app/styles.css` is legacy and unlinked.
- **Colour set in JS:**
  - `util.js` `TEAM_COLORS`: 30 teams, MEM `#5D76A9` / `#F5B112`.
  - `teamPalette()` and `teamVars()` give `--tp/--ta/--tc`.
  - `art.js` `glowOf()`: the artwork's ambient glow, taken from the picture (theme-independent).
  - `--amb:#3a2a55` in `phone/home.js` and `desktop/home.js`.
  - The QR code stays white.
- **The native TV player:** `android/.../player/Ui.java:39-67` copies the tokens as `static final int` (BG0, BG1,
  S1–S3, T1–T4, PINK, ORCHID, LIVE, FOCUS, OK, plus scrim and glass alphas).
  - About 190 `Ui.X` uses and about 15 raw literals.
  - JS sends `playerSettings()` with every `play()`, so a theme can ride along. The constants would have to be loaded at
    player start.
- **Settings:**
  - `core.js` `DEFAULTS` and `saveSettings()`.
  - Syncing across devices is opt-in per key (`account/sync.js` `SHARED`).
  - Account rows: `screens/account.js` `row()` and `radioMenu()`. The phone and desktop have their own Account screens.
  - There is no theme or appearance setting today.
- **Fixed colours a theme can't change:**
  - The brand marks (`app/tv/brand/assets/*.svg`).
  - The desktop tray and mark PNGs.
  - The Android launcher icon and banner.
  - The splash (`ic_launcher_background` `#15131D`) and the WebView `backgroundColor #15131D`. Electron `main.js` uses
    `#0B0A12`.
  - The launch animation's first frame (`launch.css`), which is timed to the native splash. An OLED black theme would
    flash grey-violet at start unless the splash learns the theme.
- **Screenshot tests that can check each theme:**
  - TV: `tests/tv/drive.js` (with `serve.sh`).
  - iPhone: `tests/phone/flows.js`.
  - Windows: `tests/desktop/views.js`.
  - The native overlays are only covered by the CI emulator's screenshots.
  - The player v2 design has its own `design/ui-v1/player-v2/tools/contrast.js`.

## B. Outside sources

**Memphis Grizzlies colours.** No official hex list is public; the references agree on blue and navy.

| Colour | Hex | Pantone |
|---|---|---|
| Beale Street Blue | `#5D76A9` | PMS 652 C |
| Memphis Midnight (navy) | `#12173F` | PMS 289 C |
| Gold | `#F5B112`, or `#FFBB22` (the RGB teamcolorcodes gives beside it) | PMS 123 C |
| Steel gray | `#707271` | PMS 424 C |
| Smoke Blue | `#BED4E9` | PMS 650 C |

- Smoke Blue is listed as historical on one site and primary on another.
- Gold is the logo's eyes and a jersey trim colour, a small accent. That it's an accent is an inference; there is no
  team statement.
- Sources:
  - https://teamcolorcodes.com/memphis-grizzlies-color-codes/
  - https://usteamcolors.com/memphis-grizzlies-team-colors/
  - https://www.brandcolorcode.com/memphis-grizzlies
  - https://1000logos.net/memphis-grizzlies-logo/amp/
- **The brand conflict:** the brand rule is "no amber or yellow", but the owner's rule is "team colours are the teams'
  real colours". Gold inside the Grizzlies theme is the team-colour exception. Scope it to small accents, keep it
  distinct from LIVE red, and write the exception down.

**OLED true black.**
- **True black is right for the background.**
  - TFTCentral: keep true 0-nit black. Near-black detail loss is a gamma and refresh-rate matter, not a UI-colour
    matter. RGB 1–2 is below visibility in a dim room. WOLED near-black gamma shifts with refresh rate and VRR.
    https://tftcentral.co.uk/articles/does-oled-have-a-black-crush-problem-understanding-and-testing-oled-shadow-detail
  - Material (M2) recommends `#121212`, not black, for a base dark surface. https://m2.material.io/design/color/dark-theme
  - Synthesis: use black for the page, and stepped surfaces visibly above it. Don't put cards at about `#050505`
    (the crush zone).
  - Avoid large smooth gradients in near-black (banding; inference).
- **Burn-in:** static content burns in, it builds up over time, and higher brightness makes it worse. Red subpixels
  wear fastest, which matters for a static LIVE badge or top bar.
  https://www.rtings.com/tv/learn/permanent-image-retention-burn-in-lcd-oled
- **Pure white on pure black:** avoid it because of halation (astigmatism).
  - https://www.levelaccess.com/blog/accessibility-for-people-with-astigmatism/
  - https://modus.trimble.com/foundations/dark-mode
- **Demand:** Jellyfin's community has pure-black "OLED-friendly" themes. https://github.com/CTalvio/Ultrachromic
- **Shadows** don't show on black, so use borders or a lighter surface for raised things.

**How others do themes.**
- Jellyfin web themes are CSS overrides with accent variants; native clients don't follow the web CSS, so they have to
  be kept in step by hand.
  - https://docs.theme-park.dev/themes/jellyfin
  - https://jellywatch.app/blog/best-jellyfin-themes-skin-manager-2026
- Material 3 builds whole schemes from a seed colour as tonal roles. The idea worth copying is a small seed set per
  theme, with surfaces and states derived from it.
  https://github.com/material-foundation/material-color-utilities/blob/main/make_schemes.md
- Sports apps (ESPN, theScore) personalise content by favourite team, but no evidence was found of whole-UI team
  skins, so a team theme is a differentiator, not a proven pattern.
- Proven: swap the accent and the surface tint on a shared structure. Don't redesign per theme; each full palette swap
  multiplies the contrast testing.
- Not verified: the specifics of Plex, Kodi skins, Steam, Xbox, Apple TV and Spotify.

**10-foot accessibility.**
- WCAG 2.2: 4.5:1 for text and 3:1 for large text and UI. Focus Appearance (2.4.13, AAA) asks for a 2 px perimeter and
  3:1 between the focused and unfocused states. https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- For 3 m on a glossy OLED, aim higher: 7:1 for body text and 4.5:1 for focus (recommendation).
- Focus must not depend on hue: keep the scale and the ring.
  https://developer.android.com/develop/adaptive-apps/guides/tv/build-adaptive-apps-for-tv
- APCA is a second opinion only, not a gate.
- **Check every theme by script:**
  - text on every surface
  - muted text
  - the focus ring on every surface it can sit on
  - LIVE on its badge and on the surfaces
  - the accent against its on-accent text
  - Fail on any miss.

**Mechanics.**
- Semantic CSS tokens per `[data-theme]` on `<html>`.
  - https://web.dev/learn/design/theming
  - https://blog.openreplay.com/theme-switcher-css-variables/
- A synchronous inline script in `<head>` sets the theme before first paint, so there is no flash.
  https://dev.to/137foundry/how-to-prevent-the-flash-of-wrong-theme-when-implementing-dark-mode-2pg1
- Set `color-scheme: dark`. https://web.dev/articles/light-dark
- Native: keep the theme natively as well (SharedPreferences), so the splash, the window and the WebView background
  match before the page loads.
- Pitfalls:
  - scrims and gradients that assume the ink background
  - shadows on black
  - art with baked-in backgrounds
  - text made dim with opacity, which changes contrast per theme
  - an accent that works as a fill but fails as text
