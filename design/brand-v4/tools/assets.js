// v4 logo assets: three variants of the hybrid (airtime gradient/light/play x SLATE ink-chalk-orchid x TIPOFF slant). Outlined wordmarks only.
const W = require('./wordmarks.json');
const r = n => +n.toFixed(2);

// shared palette: SLATE's ink / chalk / orchid, extended into a gradient with pink and deep violet (no yellow, no amber, no red)
const P = { ink: '#0C0B12', chalk: '#F3EFE6', orchid: '#E04BFF', pink: '#FF5CB8', violet: '#5B2BD9', lilac: '#B58CFF', s1: '#181620', s2: '#231F2E', text2: '#BDB7CB' };
const LIVE = '#FF4B4B';  // LIVE only

const glyphs = (key, from, to, fill, tx, ty, sc) => `<g fill="${fill}" transform="translate(${r(tx)} ${r(ty)}) scale(${sc})">${W[key].glyphs.slice(from, to).map(g => `<path d="${g.d}"/>`).join('')}</g>`;
const svg = (vb, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${extra}>${body}</svg>`;
const grad = (id, x1, y1, x2, y2, stops, units = 'userSpaceOnUse') => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="${units}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
const wordBox = (key) => { const b = W[key].bbox; return { w: b.x2 - b.x1, x1: b.x1 }; };

// ===================== V1 AIRGLOW: soft gradient play triangle with glow rings =====================
const TRI = 'M40 20L88 50L40 80Z';
function glowMark(id, o = {}) {
  // three stacked play triangles: violet and orchid echoes trail to the left on the slant, the front one carries the gradient
  const front = o.fill || `url(#${id}g)`;
  const echo = o.small ? '' : `<g transform="translate(-26 0) skewX(0)"><path d="${TRI}" fill="${o.e2 || P.violet}" stroke="${o.e2 || P.violet}" stroke-width="11" stroke-linejoin="round" opacity="${o.eo ? o.eo[1] : 0.85}"/></g><g transform="translate(-13 0)"><path d="${TRI}" fill="${o.e1 || P.orchid}" stroke="${o.e1 || P.orchid}" stroke-width="11" stroke-linejoin="round" opacity="${o.eo ? o.eo[0] : 0.9}"/></g>`;
  return `<defs>${grad(id + 'g', 26, 16, 90, 84, [[0, P.pink], [1, P.orchid]])}</defs>${echo}<path d="${TRI}" fill="${front}" stroke="${front}" stroke-width="11" stroke-linejoin="round"/>`;
}
const airglow = {
  key: 'airglow', word: 'airglow',
  mark: (id = 'ag') => svg('0 0 100 100', glowMark(id), 'width="100" height="100"'),
  lockup: (id = 'agl') => { const wb = wordBox('airglow'), s = 0.62, x0 = 106 - wb.x1 * s; return { w: 106 + wb.w * s + 4, h: 100, body: glowMark(id) + glyphs('airglow', 0, 7, P.chalk, x0, 68, s) }; },
  icon: () => svg('0 0 512 512', `<defs>${grad('agi', 0, 512, 512, 0, [[0, P.violet], [0.5, P.orchid], [1, P.pink]])}</defs><rect width="512" height="512" fill="url(#agi)"/><g transform="translate(256 256) scale(4.3) translate(-50 -50)">${glowMark('agw', { fill: P.chalk, e1: P.chalk, e2: P.chalk, eo: [0.55, 0.28] })}</g>`, 'width="512" height="512"'),
  banner: () => { const l = airglow.lockup('agb'), s = 0.5, bw = l.w * s;
    return svg('0 0 320 180', `<defs><filter id="agbl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="24"/></filter></defs><rect width="320" height="180" fill="${P.ink}"/><ellipse cx="40" cy="160" rx="100" ry="50" fill="${P.pink}" opacity=".55" filter="url(#agbl)"/><ellipse cx="170" cy="14" rx="110" ry="40" fill="${P.orchid}" opacity=".5" filter="url(#agbl)"/><ellipse cx="290" cy="150" rx="100" ry="50" fill="${P.violet}" opacity=".85" filter="url(#agbl)"/><g transform="translate(${r((320 - bw) / 2)} ${r(90 - 50 * s)}) scale(${s})">${l.body}</g>`, 'width="320" height="180"'); },
};

// ===================== V2 FLARE: slanted play wedge + anamorphic streak =====================
function flareMark(id, o = {}) {
  const wedge = o.wedge || P.chalk, bar = o.bar || P.orchid;
  return `<defs>${grad(id + 's', 0, 0, 100, 0, [[0, P.orchid, 0], [0.25, P.orchid, 0.9], [0.5, P.chalk, 1], [0.75, P.pink, 0.9], [1, P.pink, 0]])}</defs>
  <g transform="translate(8.8 0) skewX(-10)"><path d="M12 16H21V84H12Z" fill="${bar}"/><path d="M30 17L88 50L30 83Z" fill="${wedge}" stroke="${wedge}" stroke-width="5" stroke-linejoin="round"/></g>
  <rect x="0" y="47.2" width="100" height="5.6" rx="2.8" fill="${o.streak || `url(#${id}s)`}"/>`;
}
const flare = {
  key: 'flare', word: 'FLARE',
  mark: (id = 'fl') => svg('0 0 100 100', flareMark(id), 'width="100" height="100"'),
  lockup: (id = 'fll') => { const wb = wordBox('flare'), s = 0.7, x0 = 106 - wb.x1 * s;
    return { w: 106 + wb.w * s + 10, h: 100, body: flareMark(id) + glyphs('flare', 0, 5, P.chalk, x0, 85, s) + `<defs>${grad(id + 'w', 100, 0, 106 + wb.w * s + 10, 0, [[0, P.chalk, 0.9], [1, P.pink, 0]])}</defs><rect x="96" y="${r(47.2)}" width="${r(wb.w * s + 20)}" height="4" rx="2" fill="url(#${id}w)"/>` }; },
  icon: () => svg('0 0 512 512', `<rect width="512" height="512" fill="${P.orchid}"/><g transform="translate(256 256) scale(4.5) translate(-50 -50)">${flareMark('fli', { wedge: P.ink, bar: P.ink, streak: P.chalk })}</g>`, 'width="512" height="512"'),
  banner: () => { const l = flare.lockup('flb'), s = 0.6, bw = l.w * s;
    return svg('0 0 320 180', `<defs>${grad('flbw', 0, 0, 320, 0, [[0, P.orchid], [1, P.pink]])}</defs><rect width="320" height="180" fill="${P.ink}"/><path d="M276 0H320V180H238Z" fill="url(#flbw)"/><path d="M262 0H268L226 180H220Z" fill="${P.orchid}" opacity=".5"/><g transform="translate(${r(16)} ${r(90 - 50 * s)}) scale(${s})">${l.body}</g>`, 'width="320" height="180"'); },
};

// ===================== V3 SKYLIT: projector / premiere searchlight beam from a play triangle =====================
function skyMark(id, o = {}) {
  const tri = o.tri || P.chalk;
  return `<defs>${grad(id + 'b', 50, 72, 100, 40, [[0, o.b0 || P.chalk, 0.95], [0.4, o.b1 || P.orchid, 0.75], [1, o.b2 || P.pink, 0]])}${grad(id + 'c', 50, 72, 100, 44, [[0, o.core || P.chalk, 0.95], [1, o.core || P.chalk, 0]])}</defs>
  <path d="M48 62L48 82L100 66V14Z" fill="url(#${id}b)"/>
  <path d="M48 69L48 75L100 52V36Z" fill="url(#${id}c)"/>
  <path d="M10 40V94L52 67Z" fill="${tri}" stroke="${tri}" stroke-width="6" stroke-linejoin="round"/>`;
}
const skylit = {
  key: 'skylit', word: 'SKYLIT',
  mark: (id = 'sk') => svg('0 0 100 100', skyMark(id), 'width="100" height="100"'),
  lockup: (id = 'skl') => { const wb = wordBox('skylit'), s = 0.6, x0 = 112 - wb.x1 * s; return { w: 112 + wb.w * s + 6, h: 100, body: skyMark(id) + glyphs('skylit', 0, 6, P.chalk, x0, 82, s) }; },
  icon: () => svg('0 0 512 512', `<rect width="512" height="512" fill="${P.chalk}"/><g transform="translate(256 262) scale(4.4) translate(-50 -50)">${skyMark('ski', { tri: P.ink, b0: P.violet, b1: P.orchid, b2: P.pink, core: P.violet })}</g>`, 'width="512" height="512"'),
  banner: () => { const l = skylit.lockup('skb'), s = 0.5, bw = l.w * s;
    return svg('0 0 320 180', `<defs>${grad('skbb', 20, 180, 300, 0, [[0, P.orchid, 0.55], [1, P.orchid, 0]])}</defs><rect width="320" height="180" fill="${P.ink}"/><path d="M-10 180L40 180L330 20L330 -20Z" fill="url(#skbb)"/><g transform="translate(${r((320 - bw) / 2)} ${r(90 - 50 * s - 2)}) scale(${s})">${l.body}</g>`, 'width="320" height="180"'); },
};

const lockupSvg = (d) => { const l = d.lockup(); return svg(`0 0 ${r(l.w)} ${l.h}`, l.body, `width="${r(l.w)}" height="${l.h}"`); };
// text-only alternates (same face as the variant) for the board
const altWord = (key, fill = P.chalk, h = 64) => { const w = W[key], b = w.bbox, s = h / 100; const vb = `${r(b.x1 - 2)} ${r(b.y1 - 2)} ${r(b.x2 - b.x1 + 4)} ${r(b.y2 - b.y1 + 4)}`;
  return svg(vb, `<g fill="${fill}">${w.glyphs.map(g => `<path d="${g.d}"/>`).join('')}</g>`, `height="${h}"`); };
module.exports = { P, LIVE, W, airglow, flare, skylit, lockupSvg, altWord, r };
