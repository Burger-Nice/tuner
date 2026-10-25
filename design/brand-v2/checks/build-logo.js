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
  <!-- Tuner mark "Needle" v2.1 = the T of TUNER. Grid: height 100 (= wordmark cap height), width ${T.W}.
       Scale bar ${T.W}x${T.H} (= wordmark stem ${T.H}), six ${T.tw}x${T.th} ticks knocked out of its lower edge, pitch 10.5.
       Needle ${T.nt} wide at the top, ${T.nb} at the baseline (avg ${(T.nt + T.nb) / 2}), passes through the scale. Same drawing is used 1:1 in lockup.svg. -->
  <path fill="${AMBER}" d="${t.bar}"/>
  <path fill="${WHITE}" d="${t.needle}"/>
</svg>
`);
write('mark-small.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T.W} 100" width="${T.W}" height="100" role="img" aria-label="Tuner">
  <!-- Small-size mark (favicon, tray, 16-32 px): same T, ticks dropped so nothing aliases. -->
  <path fill="${AMBER}" d="${t.barSmall}"/>
  <path fill="${WHITE}" d="${t.needle}"/>
</svg>
`);
write('mark-mono.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T.W} 100" width="${T.W}" height="100" role="img" aria-label="Tuner">
  <!-- One-colour mark. Inherits currentColor: set \`color\` on the parent (${WHITE} on dark, ${INK} on light). Below 32 px use mark-small.svg. -->
  <path fill="currentColor" d="${t.bar} ${t.needle}"/>
</svg>
`);
write('wordmark.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${UNER_W} 100" width="${UNER_W}" height="100" role="img" aria-label="UNER">
  <!-- "UNER": the wordmark WITHOUT its T. The T is the mark (mark.svg); the two only ever appear together as lockup.svg.
       Custom wide grotesque, cap height 100, stem 23, outlined paths, no font. Exact bounds ${UNER_W}x100 (v1 clipped the R leg by 2 units).
       Inherits currentColor: ${WHITE} on dark, ${INK} on light. -->
  <g fill="currentColor">
${unerPaths()}
  </g>
</svg>
`);
const lockup = (mono) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LW} 100" width="${LW}" height="100" role="img" aria-label="Tuner">
  <!-- Horizontal lockup v2.1: the mark is the T. Cap height 100, mark at 1:1 (x 0-${T.W}), gap ${GAP}, UNER from x=${T.W + GAP}. Clear space = 50 (half cap) all round.
       ${mono ? 'One colour, inherits currentColor.' : `Amber scale bar, needle + letters ${WHITE}. Use on ${P['bg-0']}/${P['bg-1']} only.`} -->
  ${mono
    ? `<path fill="currentColor" d="${t.bar} ${t.needle}"/>\n  <g fill="currentColor" transform="translate(${T.W + GAP} 0)">`
    : `<path fill="${AMBER}" d="${t.bar}"/>\n  <path fill="${WHITE}" d="${t.needle}"/>\n  <g fill="${WHITE}" transform="translate(${T.W + GAP} 0)">`}
${unerPaths()}
  </g>
</svg>
`;
write('lockup.svg', lockup(false));
write('lockup-mono.svg', lockup(true));

// ---- icons: the mark, flat, centred on its visual centre (grid 48.5,46) ----
// iOS / Windows / store: square, no safe circle -> T = 540 px tall (53%). Android adaptive: foreground layer inside the 66dp safe circle -> T = 450 px.
const markG = `<path fill="${AMBER}" d="${t.bar}"/>\n    <path fill="${WHITE}" d="${t.needle}"/>`;
const S = 5.4, SA = 4.5;
write('icon-1024.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <!-- Tuner app icon, 1024 square, flat, square-cornered (iOS/Windows/store apply their own masks; do not pre-round).
       Mark scale ${S}: T = ${r(100 * S)}px tall, ${r(T.W * S)}px wide, visual centre at grid (48.5,46) = icon centre.
       NOT for Android adaptive masks (circle clips the bar's corners): use icon-foreground-108.svg there. -->
  <rect width="1024" height="1024" fill="${INK}"/>
  <g transform="translate(512 512) scale(${S}) translate(-48.5 -46)">
    ${markG}
  </g>
</svg>
`);
const S108 = +(SA / (1024 / 108)).toFixed(4);
write('icon-foreground-108.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108">
  <!-- Android adaptive-icon FOREGROUND layer on the 108dp grid (transparent). Pair with a solid ${INK} background layer (ic_launcher_background).
       Scale ${SA} px-per-grid-unit on a 1024 icon = ${S108} on the 108 grid: T = 450/1024 of the canvas, bar corners ${r(Math.hypot(48.5, 46) * SA)}px from the centre,
       inside the 66dp safe circle (radius 313 of 1024). -->
  <g transform="translate(54 54) scale(${S108}) translate(-48.5 -46)">
    ${markG}
  </g>
</svg>
`);

// ---- TV banner 320x180: full lockup, cap height 46, centred in the central 80x60% safe area (256x108) ----
const cap = 46, k = cap / 100, bw = LW * k;
write('tv-banner.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180">
  <!-- Android TV / Google TV launcher banner, 320x180 (xhdpi). Export 1x (320x180), 1.5x (480x270), 2x (640x360).
       Full lockup (icon + text, as Google asks), cap height ${cap}, ${r(bw)} wide, centred inside the 80% x 60% safe area. No border, no glow, no gradient. -->
  <rect width="320" height="180" fill="${INK}"/>
  <g transform="translate(${r((320 - bw) / 2)} ${r(90 - cap / 2)}) scale(${k})">
    <path fill="${AMBER}" d="${t.bar}"/>
    <path fill="${WHITE}" d="${t.needle}"/>
    <g fill="${WHITE}" transform="translate(${T.W + GAP} 0)">
${unerPaths('      ')}
    </g>
  </g>
</svg>
`);
console.log('built; lockup width', LW);
