// Writes every logo SVG in ../ from geometry.js + palette.js. node checks/build-logo.js
const fs = require('fs'), path = require('path');
const { T, tParts, UNER, UNER_W, GAP, r } = require('./geometry.js');
const P = require('./palette.js');
const out = f => path.join(__dirname, '..', f);
const AMBER = P.accent, WHITE = P['text-1'], INK = P['bg-0'];
const t = tParts();
const unerPaths = (indent = '    ') => UNER.map(l => `${indent}<path${l.x ? ` transform="translate(${l.x} 0)"` : ''}${l.e ? ' fill-rule="evenodd"' : ''} d="${l.d}"/>`).join('\n');
const LW = T.W + GAP + UNER_W;           // lockup width, cap height 100
const write = (f, s) => fs.writeFileSync(out(f), s);

write('mark.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T.W} 100" width="${T.W}" height="100" role="img" aria-label="Tuner">
  <!-- Tuner mark v2.2 = the T of TUNER. The stem is the needle (full height, straight, ${T.nW} wide = wordmark stem) and it cuts the scale
       (the crossbar, ${T.W}x${T.H}) in two with a ${T.g}-unit channel either side. One colour, amber, so it carries at distance and in greyscale.
       Grid: height 100 (= wordmark cap height), width ${T.W}. Same drawing is used 1:1 in lockup.svg. Use mark-small.svg below 64 device px. -->
  <path fill="${AMBER}" d="${t.full}"/>
</svg>
`);
write('mark-small.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T.W} 100" width="${T.W}" height="100" role="img" aria-label="Tuner">
  <!-- Small-size mark (below 64 device px: favicon, tray, 16-32 CSS px rail on 1x desktop): same T, channels closed (a ${T.g}-unit gap is under 2 px there). -->
  <path fill="${AMBER}" d="${t.solid}"/>
</svg>
`);
write('mark-mono.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T.W} 100" width="${T.W}" height="100" role="img" aria-label="Tuner">
  <!-- One-colour mark. Inherits currentColor: set \`color\` on the parent (${AMBER} amber or ${WHITE} on dark, ${INK} on light or on amber). Below 64 device px use mark-small.svg. -->
  <path fill="currentColor" d="${t.full}"/>
</svg>
`);
write('wordmark.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${UNER_W} 100" width="${UNER_W}" height="100" role="img" aria-label="UNER">
  <!-- "UNER": the wordmark WITHOUT its T. The T is the mark (mark.svg); the two only ever appear together as lockup.svg.
       Custom wide grotesque, cap height 100, stem 23, outlined paths, no font. Exact bounds ${UNER_W}x100.
       Inherits currentColor: ${WHITE} on dark, ${INK} on light. -->
  <g fill="currentColor">
${unerPaths()}
  </g>
</svg>
`);
const lockup = (mono) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LW} 100" width="${LW}" height="100" role="img" aria-label="Tuner">
  <!-- Horizontal lockup v2.2: the mark is the T. Cap height 100, mark at 1:1 (x 0-${T.W}), gap ${GAP}, UNER from x=${T.W + GAP}. Stem-to-U = ${T.W + GAP - (T.W + T.nW) / 2}. Clear space = 50 (half cap) all round.
       ${mono ? 'One colour, inherits currentColor (ink on amber / on light, white on dark).' : `Amber T, ${WHITE} letters. Use on ${P['bg-0']}/${P['bg-1']} only.`} -->
  ${mono ? `<path fill="currentColor" d="${t.full}"/>\n  <g fill="currentColor" transform="translate(${T.W + GAP} 0)">` : `<path fill="${AMBER}" d="${t.full}"/>\n  <g fill="${WHITE}" transform="translate(${T.W + GAP} 0)">`}
${unerPaths()}
  </g>
</svg>
`;
write('lockup.svg', lockup(false));
write('lockup-mono.svg', lockup(true));

// ---- icons ----
// The icon is an AMBER tile with the T in ink: next to dark launcher tiles an amber-on-dark icon disappears (checks/study22/icons.png).
// iOS / Windows / store: square, no safe circle -> T 540 px tall (S 5.4). Android adaptive: foreground layer in the 66dp safe circle -> T 470 px (S 4.7).
const CX = T.W / 2, CY = 47;                       // visual centre (the bar is the heavy part, so centre a little above mid-height)
const S = 5.4, SA = 4.7;
write('icon-1024.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <!-- Tuner app icon, 1024 square, flat, square-cornered (iOS/Windows/store apply their own masks; do not pre-round).
       Amber tile ${AMBER}, T in ${INK} (10.5:1). Scale ${S}: T = ${r(100 * S)}px tall, ${r(T.W * S)}px wide, visual centre at grid (${CX},${CY}) = icon centre.
       NOT for Android adaptive masks (circle clips the bar's corners): use icon-foreground-108.svg there. -->
  <rect width="1024" height="1024" fill="${AMBER}"/>
  <g transform="translate(512 512) scale(${S}) translate(${-CX} ${-CY})">
    <path fill="${INK}" d="${t.full}"/>
  </g>
</svg>
`);
const S108 = +(SA / (1024 / 108)).toFixed(4);
write('icon-foreground-108.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108">
  <!-- Android adaptive-icon FOREGROUND layer on the 108dp grid (transparent). Pair with a solid ${AMBER} background layer (ic_launcher_background).
       Scale ${SA} px-per-grid-unit on a 1024 icon = ${S108} on the 108 grid: T = ${r(100 * SA)}/1024 of the canvas; the bar's top corners are
       ${r(Math.hypot(CX, CY) * SA)}px from the centre, inside the 66dp safe circle (radius 313 of 1024). -->
  <g transform="translate(54 54) scale(${S108}) translate(${-CX} ${-CY})">
    <path fill="${INK}" d="${t.full}"/>
  </g>
</svg>
`);

// ---- TV banner 320x180: full lockup, cap height 46, centred in the central 80x60% safe area (256x108) ----
const cap = 46, k = cap / 100, bw = LW * k;
const banner = (bg, tc, lc, note) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180">
  <!-- Android TV / Google TV launcher banner, 320x180 (xhdpi). Export 1x (320x180), 1.5x (480x270), 2x (640x360).
       ${note} Full lockup (icon + text, as Google asks), cap height ${cap}, ${r(bw)} wide, centred inside the 80% x 60% safe area. No border, no glow, no gradient. -->
  <rect width="320" height="180" fill="${bg}"/>
  <g transform="translate(${r((320 - bw) / 2)} ${r(90 - cap / 2)}) scale(${k})">
    <path fill="${tc}" d="${t.full}"/>
    <g fill="${lc}" transform="translate(${T.W + GAP} 0)">
${unerPaths('      ')}
    </g>
  </g>
</svg>
`;
write('tv-banner.svg', banner(AMBER, INK, INK, `Amber banner, ink lockup (10.5:1): in a launcher row of dark and blue tiles this is the one that stands out (checks/study22/banners.png).`));
write('tv-banner-dark.svg', banner(INK, AMBER, WHITE, `Alternative: dark banner, amber T, white UNER. Quieter; use if the amber banner is too loud on the real TV.`));
console.log('built; lockup width', LW);
