// v5 logo assets for AIRGLOW in two variations: Soft (glow echo) and Sharp (slanted wedge, crisp echoes). Outlined wordmarks, SVG only.
const W = require('./wordmarks.json');
const r = n => +n.toFixed(2);
const P = { ink: '#0C0B12', chalk: '#F3EFE6', orchid: '#E04BFF', pink: '#FF5CB8', violet: '#5B2BD9', lilac: '#B58CFF', s1: '#171420', s2: '#221C30', text2: '#BDB7CB' };
const LIVE = '#FF4B4B';
const SHARP_WORD = process.env.SHARP_WORD || 'sharpL';   // chosen after the wordmark test: see tests/sharp-word.png

const svg = (vb, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${extra}>${body}</svg>`;
const grad = (id, x1, y1, x2, y2, stops) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
const blur = (id, sd, box = 60) => `<filter id="${id}" x="-${box}%" y="-${box}%" width="${100 + 2 * box}%" height="${100 + 2 * box}%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
const glyphs = (key, from, to, fill, tx, ty, sc) => `<g fill="${fill}" transform="translate(${r(tx)} ${r(ty)}) scale(${sc})">${W[key].glyphs.slice(from, to).map(g => `<path d="${g.d}"/>`).join('')}</g>`;
const wb = (key) => { const b = W[key].bbox; return { w: b.x2 - b.x1, x1: b.x1 }; };

// ============================ SOFT: play triangle, halo, three receding blurred echoes ============================
const TRI = 'M40 20L88 50L40 80Z';
const tri = (fill, o = 1, sw = 11) => `<path d="${TRI}" fill="${fill}" stroke="${fill}" stroke-width="${sw}" stroke-linejoin="round" opacity="${o}"/>`;
// o.mode: 'full' (default) | 'small' (halo + one echo, for <= 32 px) | 'flat' (no glow: pure echoes, e.g. Android VectorDrawable)
function softBody(id, o = {}) {
  const front = o.front || `url(#${id}g)`, e1 = o.e1 || P.orchid, e3 = o.e3 || P.violet, halo = o.halo || P.orchid, mode = o.mode || 'full';
  const defs = `<defs>${grad(id + 'g', 26, 16, 90, 84, [[0, P.pink], [1, P.orchid]])}${blur(id + 'b1', 1.4, 50)}${blur(id + 'b5', 6, 80)}</defs>`;
  const haloEl = `<g filter="url(#${id}b5)"><g transform="translate(46 50) scale(1.28) translate(-46 -50)">${tri(halo, o.haloO ?? 0.5)}</g></g>`;
  const ech = mode === 'small' ? `<g transform="translate(-9 0)" filter="url(#${id}b1)">${tri(e3, 0.5)}</g>`
    : [3, 2, 1].map(i => `<g transform="translate(${-9 * i} 0) translate(40 50) scale(${1 - 0.08 * i}) translate(-40 -50)" filter="url(#${id}b1)">${tri(i === 3 ? e3 : e1, [0, 0.16, 0.32, 0.55][4 - i] * (o.eo ?? 1))}</g>`).join('');
  return defs + haloEl + ech + `<path d="${TRI}" fill="${front}" stroke="${front}" stroke-width="11" stroke-linejoin="round"/>`;
}
const SOFT_VB = '-24 -6 134 112';   // mark box including the halo (134 x 112 units)
const soft = {
  mark: (id = 'sm') => svg(SOFT_VB, softBody(id), 'width="134" height="112"'),
  markSmall: (id = 'ss') => svg(SOFT_VB, softBody(id, { mode: 'small' }), 'width="134" height="112"'),
  lockup: (id = 'sl') => { const w = wb('soft'), sc = 0.6, x0 = 108 - w.x1 * sc; return { w: 132 + w.w * sc + 6, h: 112, vbx: -24, vby: -6, body: softBody(id) + glyphs('soft', 0, 7, P.chalk, x0, 71, sc) }; },
  // 1024 tile: gradient with a chalk mark and a white halo; Android adaptive: foreground (chalk mark on transparent) + background (gradient)
  tileBg: (id) => `<defs>${grad(id, 0, 512, 512, 0, [[0, P.violet], [0.5, P.orchid], [1, P.pink]])}</defs><rect width="512" height="512" fill="url(#${id})"/>`,
  iconMark: (id) => softBody(id, { front: P.chalk, e1: P.chalk, e3: P.chalk, halo: P.chalk, haloO: 0.35, eo: 0.8 }),
  icon: () => svg('0 0 512 512', soft.tileBg('sit') + `<g transform="translate(256 256) scale(4.2) translate(-58 -50)">${soft.iconMark('sim')}</g>`, 'width="512" height="512"'),
  iconFg: () => svg('0 0 108 108', `<g transform="translate(54 54) scale(0.5) translate(-58 -50)">${soft.iconMark('sfg')}</g>`, 'width="108" height="108"'),
  iconBg: () => svg('0 0 108 108', `<defs>${grad('sbg', 0, 108, 108, 0, [[0, P.violet], [0.5, P.orchid], [1, P.pink]])}</defs><rect width="108" height="108" fill="url(#sbg)"/>`, 'width="108" height="108"'),
  banner: () => { const l = soft.lockup('sb'), s = 0.58, bw = l.w * s; return svg('0 0 320 180', `<defs>${blur('sbl', 24, 50)}</defs><rect width="320" height="180" fill="${P.ink}"/><ellipse cx="40" cy="160" rx="100" ry="50" fill="${P.pink}" opacity=".55" filter="url(#sbl)"/><ellipse cx="170" cy="14" rx="110" ry="40" fill="${P.orchid}" opacity=".5" filter="url(#sbl)"/><ellipse cx="290" cy="150" rx="100" ry="50" fill="${P.violet}" opacity=".85" filter="url(#sbl)"/><g transform="translate(${r((320 - bw) / 2)} ${r(90 - 56 * s)}) scale(${s})"><svg viewBox="${l.vbx} ${l.vby} ${r(l.w)} ${l.h}" width="${r(l.w)}" height="${l.h}">${l.body}</svg></g>`, 'width="320" height="180"'); },
};

// ============================ SHARP: skewed play wedge, crisp angular echo bars ============================
// Wedge skewed -10 degrees; three hard parallelogram bars trail it, shorter and fainter each step.
function sharpBody(id, o = {}) {
  const wedge = o.wedge || `url(#${id}g)`, bar = o.bar || P.orchid, ink = o.barO ?? 1;
  const bars = [[8, 62, 0.95], [-6, 46, 0.6], [-20, 30, 0.3]].map(([x, h, op]) => `<path d="M${x} ${50 - h / 2}h7v${h}h-7z" fill="${bar}" opacity="${op * ink}"/>`).join('');
  return `<defs>${grad(id + 'g', 30, 16, 92, 84, [[0, P.pink], [0.6, P.orchid], [1, P.violet]])}</defs><g transform="translate(8.8 0) skewX(-10)">${bars}<path d="M26 17L88 50L26 83Z" fill="${wedge}" stroke="${wedge}" stroke-width="4" stroke-linejoin="miter"/></g>`;
}
const SHARP_VB = '-26 6 124 88';
const sharp = {
  mark: (id = 'hm') => svg(SHARP_VB, sharpBody(id), 'width="124" height="88"'),
  lockup: (id = 'hl') => { const w = wb(SHARP_WORD), sc = SHARP_WORD === 'sharpL' ? 0.5 : 0.56, x0 = 106 - w.x1 * sc, base = SHARP_WORD === 'sharpL' ? 68 : 78; return { w: 132 + w.w * sc + 8, h: 88, vbx: -26, vby: 6, body: sharpBody(id) + glyphs(SHARP_WORD, 0, 7, P.chalk, x0, base, sc) }; },
  tileBg: () => `<rect width="512" height="512" fill="${P.violet}"/><path d="M190 0H512V512H92Z" fill="${P.orchid}"/><path d="M340 0H512V512H252Z" fill="${P.pink}"/>`,
  iconMark: (id) => sharpBody(id, { wedge: P.chalk, bar: P.chalk }),
  icon: () => svg('0 0 512 512', sharp.tileBg() + `<g transform="translate(256 262) scale(3.9) translate(-38 -50)">${sharp.iconMark('hit')}</g>`, 'width="512" height="512"'),
  iconFg: () => svg('0 0 108 108', `<g transform="translate(54 54) scale(0.47) translate(-38 -50)">${sharp.iconMark('hfg')}</g>`, 'width="108" height="108"'),
  iconBg: () => svg('0 0 108 108', `<rect width="108" height="108" fill="${P.violet}"/><path d="M40 0H108V108H19Z" fill="${P.orchid}"/><path d="M72 0H108V108H53Z" fill="${P.pink}"/>`, 'width="108" height="108"'),
  banner: () => { const l = sharp.lockup('hb'), s = 0.62, bw = l.w * s; return svg('0 0 320 180', `<defs>${grad('hbw', 0, 0, 320, 0, [[0, P.violet], [0.5, P.orchid], [1, P.pink]])}</defs><rect width="320" height="180" fill="${P.ink}"/><path d="M262 0H320V180H224Z" fill="url(#hbw)"/><path d="M244 0H252L214 180H206Z" fill="${P.orchid}" opacity=".5"/><g transform="translate(${r(18)} ${r(90 - 44 * s)}) scale(${s})"><svg viewBox="${l.vbx} ${l.vby} ${r(l.w)} ${l.h}" width="${r(l.w)}" height="${l.h}">${l.body}</svg></g>`, 'width="320" height="180"'); },
};

const lockupSvg = (d, id) => { const l = d.lockup(id); return svg(`${l.vbx} ${l.vby} ${r(l.w)} ${l.h}`, l.body, `width="${r(l.w)}" height="${l.h}"`); };
module.exports = { P, LIVE, W, soft, sharp, lockupSvg, softBody, sharpBody, glyphs, wb, r, svg, grad, blur, SHARP_WORD };
