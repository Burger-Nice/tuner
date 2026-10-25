// Logo assets for the four v3 directions. Pure functions returning SVG strings (wordmarks are outlined paths from wordmarks.json; no fonts in any SVG).
const W = require('./wordmarks.json');
const r = n => +n.toFixed(2);

// ---- palettes (3-colour core + neutrals) ----
const PAL = {
  slate:   { name: 'SLATE',   ink: '#0C0B12', chalk: '#F3EFE6', orchid: '#E04BFF', s1: '#181620', s2: '#231F2E', text2: '#BDB7CB' },
  tipoff:  { name: 'TIPOFF',  ink: '#070B1B', volt: '#C6FF3D', white: '#F4F7FF', s1: '#10162E', s2: '#1A2243', text2: '#AEB8D8' },
  airtime: { name: 'AIRTIME', ink: '#090A1F', c1: '#1FE0C8', c2: '#5B7CFA', c3: '#FF3FA4', white: '#F5F6FF', s1: '#14173D', s2: '#1D2152', text2: '#B3B8E2' },
  tuner:   { name: 'TUNER',   ink: '#0E1014', paper: '#F3F0E8', aqua: '#00D8F0', green: '#A6F23A', magenta: '#FF2D9B', blue: '#5B7CFA', s1: '#181B21', s2: '#22262E', text2: '#B9BDC4' },
};
const LIVE = '#FF4B4B';   // on-air red, the same in every direction; used for LIVE only

const glyphPaths = (key, from, to, fill, tx, ty, sc, stroke = 0) => {
  const w = W[key]; const gs = w.glyphs.slice(from, to);
  return `<g fill="${fill}"${stroke ? ` stroke="${fill}" stroke-width="${stroke}" stroke-linejoin="miter"` : ''} transform="translate(${r(tx)} ${r(ty)}) scale(${sc})">${gs.map(g => `<path d="${g.d}"/>`).join('')}</g>`;
};
const svg = (vb, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${extra}>${body}</svg>`;

// ======================= A. SLATE: clapper-board / screen, neon orchid =======================
function slateMark(c = PAL.slate, o = {}) {
  const stripes = [0, 1, 2, 3].map(i => { const x0 = 20 + i * 17; return `<path d="M${x0} 22H${x0 + 8}L${x0} 38H${x0 - 8}Z" fill="${c.ink}"/>`; }).join('');
  return `<rect x="12" y="42" width="76" height="46" rx="4" fill="${o.board || c.chalk}"/><path d="M43 53V77L64 65Z" fill="${o.play || c.orchid}" stroke="${o.play || c.orchid}" stroke-width="2" stroke-linejoin="round"/>
  <g transform="rotate(-9 12 40)"><rect x="12" y="22" width="76" height="16" rx="3" fill="${o.board || c.chalk}"/>${stripes}</g>`;
}
const slate = {
  mark: () => svg('0 0 100 100', slateMark(), 'width="100" height="100"'),
  lockupBody: (c = PAL.slate) => { const w = W.slate, s = 0.64, x0 = 112 - w.bbox.x1 * s; return { w: 112 + (w.bbox.x2 - w.bbox.x1) * s + 4, h: 100, body: `<g transform="translate(0 0)">${slateMark(c)}</g>` + glyphPaths('slate', 0, 5, c.chalk, x0, 55 + 32, s) }; },
  icon: () => { const c = PAL.slate; return svg('0 0 512 512', `<rect width="512" height="512" fill="${c.ink}"/><circle cx="256" cy="262" r="210" fill="${c.orchid}" opacity=".16"/><g transform="translate(256 262) scale(4.3) translate(-50 -55)">${slateMark()}</g>`, 'width="512" height="512"'); },
  banner: () => { const c = PAL.slate, l = slate.lockupBody(), s = 0.56, bw = l.w * s;
    return svg('0 0 320 180', `<defs><linearGradient id="bs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.orchid}" stop-opacity=".42"/><stop offset="1" stop-color="${c.orchid}" stop-opacity="0"/></linearGradient></defs><rect width="320" height="180" fill="${c.ink}"/><path d="M130 0H190L292 180H28Z" fill="url(#bs)"/><g transform="translate(${r((320 - bw) / 2)} ${r(90 - 50 * s - 2)}) scale(${s})">${l.body}</g>`, 'width="320" height="180"'); },
};

// ======================= B. TIPOFF: italic volt T with wipe streaks =======================
function tipoffMark(c = PAL.tipoff, o = {}) {
  const t = o.t || c.volt, st = o.streak || c.white;
  return `<g transform="translate(11 0) skewX(-12)"><path d="M8 14H96V38H64V88H38V38H8Z" fill="${t}"/><path d="M2 52H32V58H2ZM10 63H32V69H10ZM18 74H32V80H18Z" fill="${st}" opacity="${o.so ?? 1}"/></g>`;
}
const tipoff = {
  mark: () => svg('0 0 100 100', tipoffMark(), 'width="100" height="100"'),
  lockupBody: (c = PAL.tipoff) => { const w = W.tipoff, x0 = -w.bbox.x1; return { w: w.bbox.x2 - w.bbox.x1 + 6, h: 100,
    body: glyphPaths('tipoff', 0, 1, c.volt, x0, 100, 1) + glyphPaths('tipoff', 1, 6, c.white, x0, 100, 1) + `<path d="M${r(-2)} 114H${r(w.bbox.x2 - w.bbox.x1 - 18)}L${r(w.bbox.x2 - w.bbox.x1 - 22)} 121H${r(-6)}Z" fill="${c.volt}"/>` }; },
  icon: () => { const c = PAL.tipoff; return svg('0 0 512 512', `<rect width="512" height="512" fill="${c.volt}"/><g transform="translate(256 262) scale(4.6) translate(-50 -52)">${tipoffMark(c, { t: c.ink, streak: c.ink })}</g>`, 'width="512" height="512"'); },
  banner: () => { const c = PAL.tipoff, l = tipoff.lockupBody(), s = 0.5, bw = l.w * s;
    return svg('0 0 320 180', `<rect width="320" height="180" fill="${c.ink}"/><path d="M250 0H320V180H210Z" fill="${c.volt}"/><path d="M230 0H238L198 180H190Z" fill="${c.volt}" opacity=".55"/><g transform="translate(${r(24)} ${r(90 - 56 * s)}) scale(${s})">${l.body}</g>`, 'width="320" height="180"'); },
};

// ======================= C. AIRTIME: gradient "A" triangle with a play cut-out =======================
function airtimeMark(id, c = PAL.airtime, o = {}) {
  const fill = o.fill || `url(#${id}g)`;
  return `<defs><linearGradient id="${id}g" x1="12" y1="88" x2="88" y2="14" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c.c1}"/><stop offset=".5" stop-color="${c.c2}"/><stop offset="1" stop-color="${c.c3}"/></linearGradient>
  <mask id="${id}m" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="#fff"/><path d="M42 55V77L63 66Z" fill="#000" stroke="#000" stroke-width="5" stroke-linejoin="round"/></mask></defs>
  <path d="M50 16L86 82H14Z" fill="${fill}" stroke="${fill}" stroke-width="12" stroke-linejoin="round" mask="url(#${id}m)"/>`;
}
const airtime = {
  mark: (id = 'am') => svg('0 0 100 100', airtimeMark(id), 'width="100" height="100"'),
  lockupBody: (c = PAL.airtime, id = 'al') => { const w = W.airtime, s = 0.7, x0 = 108 - w.bbox.x1 * s; return { w: 108 + (w.bbox.x2 - w.bbox.x1) * s + 4, h: 100, body: airtimeMark(id, c) + glyphPaths('airtime', 0, 7, c.white, x0, 54 + 30, s) }; },
  icon: () => { const c = PAL.airtime; return svg('0 0 512 512', `<defs><linearGradient id="ai" x1="0" y1="512" x2="512" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c.c1}"/><stop offset=".5" stop-color="${c.c2}"/><stop offset="1" stop-color="${c.c3}"/></linearGradient></defs><rect width="512" height="512" fill="url(#ai)"/><g transform="translate(256 262) scale(4.1) translate(-50 -50)">${airtimeMark('aiw', c, { fill: '#fff' })}</g>`, 'width="512" height="512"'); },
  banner: () => { const c = PAL.airtime, l = airtime.lockupBody(c, 'ab'), s = 0.52, bw = l.w * s;
    return svg('0 0 320 180', `<defs><filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26"/></filter></defs><rect width="320" height="180" fill="${c.ink}"/><ellipse cx="60" cy="150" rx="90" ry="50" fill="${c.c1}" opacity=".5" filter="url(#bl)"/><ellipse cx="170" cy="20" rx="90" ry="40" fill="${c.c2}" opacity=".55" filter="url(#bl)"/><ellipse cx="270" cy="150" rx="90" ry="50" fill="${c.c3}" opacity=".5" filter="url(#bl)"/><g transform="translate(${r((320 - bw) / 2)} ${r(90 - 50 * s)}) scale(${s})">${l.body}</g>`, 'width="320" height="180"'); },
};

// ======================= D. TUNER: test-card colour bars as the crossbar of the T =======================
const BARS = c => [c.paper, c.aqua, c.green, c.magenta, c.blue];
function tunerMark(c = PAL.tuner, o = {}) {
  const bars = BARS(c).map((f, i) => `<rect x="${r(i * 16.8)}" y="0" width="16.8" height="24" fill="${o.mono || f}"/>`).join('');
  return `${bars}<rect x="32" y="24" width="20" height="76" fill="${o.stem || c.paper}"/>`;
}
const tuner = {
  mark: () => svg('0 0 84 100', tunerMark(), 'width="84" height="100"'),
  lockupBody: (c = PAL.tuner) => { const w = W.tuner, u = w.glyphs[1], s = 1, x0 = 84 + 9 - u.x1; return { w: 84 + 9 + (w.bbox.x2 - u.x1) + 2, h: 100, body: tunerMark(c) + glyphPaths('tuner', 1, 5, c.paper, x0, 100, s, 2.6) }; },
  icon: () => { const c = PAL.tuner; const bars = BARS(c).map((f, i) => `<rect x="${i * 102.4}" y="0" width="102.4" height="176" fill="${f}"/>`).join('');
    return svg('0 0 512 512', `<rect width="512" height="512" fill="${c.ink}"/>${bars}<rect x="196" y="176" width="120" height="270" fill="${c.paper}"/>`, 'width="512" height="512"'); },
  banner: () => { const c = PAL.tuner, l = tuner.lockupBody(), s = 0.5, bw = l.w * s;
    const strip = (y) => BARS(c).map((f, i) => `<rect x="${i * 64}" y="${y}" width="64" height="14" fill="${f}"/>`).join('');
    return svg('0 0 320 180', `<rect width="320" height="180" fill="${c.ink}"/>${strip(0)}${strip(166)}<g transform="translate(${r((320 - bw) / 2)} ${r(90 - 50 * s)}) scale(${s})">${l.body}</g>`, 'width="320" height="180"'); },
};

const lockupSvg = (d, name) => { const l = d.lockupBody(); return svg(`0 0 ${r(l.w)} ${name === 'tipoff' ? 124 : 100}`, l.body, `width="${r(l.w)}" height="${name === 'tipoff' ? 124 : 100}"`); };
module.exports = { PAL, LIVE, W, slate, tipoff, airtime, tuner, lockupSvg, slateMark, tipoffMark, airtimeMark, tunerMark, r };
