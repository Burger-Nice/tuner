// writes ../tokens.css from palette.js so hex values can never drift from the contrast checks. node tools/build-tokens.js
const fs = require('fs'), path = require('path'); const c = require('./color.js'), P = require('./palette.js');
const o = k => { const [L, C, h] = c.hex2oklch(P[k]); return `L${L.toFixed(2).slice(1)} C${C.toFixed(3).slice(1)} h${Math.round(h)}`; };
const rgba = (k, a) => `rgba(${c.hex2rgb(P[k]).map(x => Math.round(x * 255)).join(', ')}, ${a})`;
const css = `/* airglow tokens v5.2: dark, TV-first, Soft identity with a Sharp dialect for live.
   Source of truth: tools/palette.js (OKLCH). Contrast for every pair: tools/contrast.js, tables in BRAND.md.
   TV canvas: 960x540 CSS px rendered at 2x (Chrome 113 WebView). 1 rem = 16 px. Desktop/phone override at the bottom.
   Performance rules baked into these tokens: no filter:blur, no big box-shadow spreads, gradients are two stops, glows are the small PNG sprites in sprites/. */

:root {
  /* ---- surfaces: one hue (295), chroma .02 (v5.1 .032: tinted artwork); steps vs canvas 1.35 / 1.71 / 2.26:1; no channel below 18/255; native splash and window background = bg-0 ---- */
  --a-bg-0:        ${P['bg-0']};   /* ${o('bg-0')}  canvas, rail, letterbox */
  --a-bg-1:        ${P['bg-1']};   /* ${o('bg-1')}  raised regions, sheets, top bars */
  --a-surface-1:   ${P['surface-1']};   /* ${o('surface-1')}  cards, rows, tiles */
  --a-surface-2:   ${P['surface-2']};   /* ${o('surface-2')}  hover / selected / progress track */
  --a-surface-3:   ${P['surface-3']};   /* ${o('surface-3')}  pressed, chips (no status text on it) */
  --a-border:      ${P.border};   /* 1 px outline on cards and tiles: decorative (never the only cue) */
  --a-border-strong: ${P['border-strong']}; /* input outlines, unselected chips, toggle track: >= 3:1 on surface-1 and surface-2 */
  --a-scrim:       ${rgba('bg-0', 0.72)};

  /* ---- text (every text token >= 4.5:1 on all five surfaces; text-4 is disabled only) ---- */
  --a-text-1:      ${P['text-1']};   /* chalk, warm off-white (pure #FFF blooms on LCD) */
  --a-text-2:      ${P['text-2']};   /* secondary */
  --a-text-3:      ${P['text-3']};   /* tertiary, meta */
  --a-text-4:      ${P['text-4']};   /* disabled only */
  --a-ink:         ${P['ink-on-brand']};   /* text and glyphs on the pink-orchid fills (5.2-6.3:1) */

  /* ---- brand: pink and orchid, chroma pulled ~8-10% off the sRGB edge for Vivid modes ---- */
  --a-pink:        ${P.pink};   /* ${o('pink')}  fills, strokes, progress (>= 3:1 on bg-0..surface-2) */
  --a-orchid:      ${P.orchid};   /* ${o('orchid')}  fills, strokes, progress */
  --a-pink-text:   ${P['pink-text']};   /* brand colour as TEXT: >= 4.5:1 on every surface */
  --a-orchid-text: ${P['orchid-text']};
  --a-violet:      ${P.violet};   /* anchor of large glows and the icon only: 2.4:1 on canvas, NEVER a line, bar or text */
  --a-violet-ui:   ${P['violet-ui']};   /* the violet allowed as a UI stroke (>= 3:1 on bg-0..surface-2) */
  --a-grad:        linear-gradient(100deg, ${P.pink}, ${P.orchid});   /* THE gradient: two stops, pink to orchid, ink labels stay >= 5.2:1 */
  --a-pink-soft:   ${rgba('pink', 0.14)};   /* chip / tint behind pink-text */

  /* ---- status: red means LIVE and only live; errors and warnings are neutral (icon + text) ---- */
  --a-live:        ${P.live};   /* dot + 2 px pill outline, always with the word LIVE */
  --a-live-text:   ${P['live-text']};
  --a-live-soft:   ${rgba('live', 0.16)};
  --a-ok:          ${P.ok};   /* connected / healthy; always with an icon */

  /* ---- focus (d-pad): white ring + 2 px canvas gap, 3 px; plus lift. Never colour alone. ---- */
  --a-focus:       ${P.focus};
  --a-focus-ring:  0 0 0 2px var(--a-bg-0), 0 0 0 5px var(--a-focus);

  /* ---- sprites (pre-rendered, tiny): use as background-image, scaled; never recreate with blur ---- */
  --a-sprite-orchid: url("sprites/glow-orchid.png");
  --a-sprite-pink:   url("sprites/glow-pink.png");
  --a-sprite-violet: url("sprites/glow-violet.png");
  --a-grain:         url("sprites/grain.png");   /* repeat over large fills at its own 7/255 alpha: kills banding */

  /* ---- type: three families, three weights of display + one variable text face, ~100 KB of woff2 (Latin only) ---- */
  --a-font-display: "Outfit", system-ui, sans-serif;            /* 500 (air, sub-heads) / 700 (glow, titles) */
  --a-font-text:    "Inter Variable", "Inter", system-ui, sans-serif;   /* all reading text, tables, numerals (tabular) */
  --a-font-live:    "Barlow Condensed", "Outfit", sans-serif;   /* 800 italic: Sharp dialect only, <= 3 words or a score */
  --a-size-display: 40px; --a-lh-display: 44px;   /* page titles */
  --a-size-head:    28px; --a-lh-head:    32px;
  --a-size-title:   22px; --a-lh-title:   28px;
  --a-size-body:    16px; --a-lh-body:    24px;
  --a-size-label:   14px; --a-lh-label:   18px;   /* caps, +0.08em */
  --a-size-caption: 13px; --a-lh-caption: 16px;   /* floor: nothing smaller on TV */
  --a-size-score:   56px; --a-lh-score:   52px;   /* Sharp: scores only */

  /* ---- shape: Soft is round; Sharp skews the PLATE, never the text ---- */
  --a-radius-sm: 8px; --a-radius: 16px; --a-radius-lg: 24px; --a-radius-pill: 999px;
  --a-angle-live: 12deg;   /* ONE live angle: plates, slab, wipes (Sharp dialect) */
  --a-angle-soft: 8deg;    /* ONE soft angle: hero edge, launch wipe */
  --a-skew: calc(-1 * var(--a-angle-live));   /* alias: skewX() value for plates */
  --a-wipe: var(--a-angle-live);             /* alias */
  --a-edge: var(--a-angle-soft);             /* alias */
  --a-field-h: 48px; --a-toggle-w: 52px; --a-toggle-h: 30px; --a-radius-dialog: 24px;   /* controls (v5.2) */
  --a-space-1: 4px; --a-space-2: 8px; --a-space-3: 12px; --a-space-4: 16px; --a-space-6: 24px; --a-space-8: 32px;
  --a-safe-x: 48px; --a-safe-y: 27px;

  /* ---- motion ---- */
  --a-dur-fast: 120ms; --a-dur: 200ms; --a-dur-slow: 320ms; --a-dur-wipe: 280ms; --a-dur-launch: 1100ms;
  --a-ease: cubic-bezier(0.2, 0.7, 0.2, 1); --a-ease-wipe: cubic-bezier(0.7, 0, 0.2, 1);
  --a-focus-scale: 1.05;

  color-scheme: dark;
}
:root.desktop { --a-size-display: 34px; --a-lh-display: 38px; --a-size-head: 24px; --a-lh-head: 28px; --a-size-title: 18px; --a-lh-title: 24px; --a-size-body: 14px; --a-lh-body: 20px; --a-size-label: 12px; --a-lh-label: 16px; --a-size-caption: 12px; --a-size-score: 44px; --a-lh-score: 42px; --a-focus-ring: 0 0 0 1px var(--a-bg-0), 0 0 0 3px var(--a-focus); }

/* ---- utility classes used by the mocks ---- */
.a-display { font: 700 var(--a-size-display)/var(--a-lh-display) var(--a-font-display); letter-spacing: -0.01em; color: var(--a-text-1); }
.a-head    { font: 700 var(--a-size-head)/var(--a-lh-head) var(--a-font-display); color: var(--a-text-1); }
.a-title   { font: 650 var(--a-size-title)/var(--a-lh-title) var(--a-font-text); color: var(--a-text-1); }
.a-body    { font: 500 var(--a-size-body)/var(--a-lh-body) var(--a-font-text); color: var(--a-text-2); }
.a-label   { font: 650 var(--a-size-label)/var(--a-lh-label) var(--a-font-text); letter-spacing: 0.08em; text-transform: uppercase; color: var(--a-text-3); }
.a-caption { font: 500 var(--a-size-caption)/var(--a-lh-caption) var(--a-font-text); color: var(--a-text-3); font-variant-numeric: tabular-nums; }
.a-score   { font: italic 800 var(--a-size-score)/var(--a-lh-score) var(--a-font-live); font-variant-numeric: tabular-nums; color: var(--a-text-1); }
.a-btn     { display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 24px; border-radius: var(--a-radius-pill); font: 700 17px/1 var(--a-font-display); background: var(--a-grad); color: var(--a-ink); }
.a-btn.is-focused { box-shadow: var(--a-focus-ring); }
.a-live    { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 10px; border: 2px solid var(--a-live); border-radius: var(--a-radius-pill); color: var(--a-live-text); background: var(--a-live-soft); font: 700 12px/1 var(--a-font-text); letter-spacing: 0.12em; text-transform: uppercase; }
.a-live::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--a-live); }
`;
fs.writeFileSync(path.join(__dirname, '..', 'tokens.css'), css); console.log('tokens.css written');
