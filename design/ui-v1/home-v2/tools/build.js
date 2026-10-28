// node tools/build.js   -> writes the Home v2 mocks (*.html) next to SPEC.md, and tools/pages.json.
// Every mock is the 960 x 540 canvas linking the app's real CSS (tokens, ui.css, app.css, nba.css, catchup.css) plus
// home-v2.css. Focus is marked with the kit classes: .f (ring + lift), .f-ring (ring only).
// ONE TIMELINE (SPEC 0, review 2 item 6): the Grizzlies' real October schedule (nba-pages/data.json: W vs UTAH, W at GS,
// W at SAC on Sat 25 · late, at UTAH on Mon 26 · late, at POR Thu 29 · late, vs SAC Sat 31), the real 26 Oct slate with
// its tip-off times, and every mock's clock, record, seen state, standings copy and programme time derived from it.
// Scores, clocks, the provider's channels, guide and titles are stand-ins; each page carries its timeline facts in
// <meta name="tl"> so the audit's CONSIST check can read them back.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
global.window = global; require('../../kit/art.js');
const Art = global.Art;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- icons (app/tv/js/util.js) ----------
const P = {
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7a13 13 0 0 1-2.4 3.7M6.4 6.6A13 13 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  score: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M12 5.5v13M6.5 10h2.5M15 10h2.5M6.5 14h2.5M15 14h2.5"/>',
  star: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9z" fill="currentColor" stroke="none"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  hist: '<path d="M4.2 12a7.8 7.8 0 1 0 2.3-5.5"/><path d="M4 4.5V8h3.5"/><path d="M12 8v4.2l2.8 1.7"/>',
  tipoff: '<path d="M6 5v14"/><path d="M18 5.5v13L9 12z" fill="currentColor"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/>',
  saved: '<path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4-6.5 4V4.5a1 1 0 0 1 1-1z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>', chevU: '<path d="M5 15l7-7 7 7"/>', chevD: '<path d="M5 9l7 7 7-7"/>',
  restart: '<path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5"/>', live: '<circle cx="12" cy="12" r="1.7"/><path d="M8 8a5.7 5.7 0 0 0 0 8M16 8a5.7 5.7 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
  wifiOff: '<path d="M2.5 9a15 15 0 0 1 19 0M5.5 12.8a10.5 10.5 0 0 1 13 0M8.8 16.4a5.5 5.5 0 0 1 6.4 0M12 20h.01M3 3l18 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
const dot = '<span class="dot-sep"></span>';
const liveP = (c) => `<span class="a-live${c ? ' compact' : ''}">Live</span>`;
const IMG = '../nba-pages/img/';
const crest = (a, s = '') => `<span class="team ${s}"><img src="${IMG}logo-${a}.png" alt=""></span>`;
const tag = (t, c = '') => `<span class="tag ${c}">${t}</span>`;

// ---------- team colours: app/tv/js/util.js teamPalette rules ----------
const TC = { MEM: ['#5D76A9', '#F5B112'], UTAH: ['#002B5C', '#F9A01B'], LAL: ['#552583', '#FDB927'], PHX: ['#1D1160', '#E56020'], DEN: ['#0E2240', '#FEC524'], OKC: ['#007AC1', '#EF3B24'], WSH: ['#002B5C', '#E31837'], CHA: ['#1D1160', '#00788C'], MIN: ['#0C2340', '#78BE20'], CLE: ['#860038', '#FDBB30'], CHI: ['#CE1141', '#FFFFFF'], BOS: ['#007A33', '#BA9653'], DAL: ['#00538C', '#B8C4CA'], HOU: ['#CE1141', '#C4CED4'], SAC: ['#5A2D81', '#63727A'], GS: ['#1D428A', '#FFC72C'], MIA: ['#98002E', '#F9A01B'], MIL: ['#00471B', '#EEE1C6'], NY: ['#006BB6', '#F58426'], POR: ['#E03A3E', '#000000'], SA: ['#C4CED4', '#000000'], LAC: ['#C8102E', '#1D428A'], NO: ['#0C2340', '#C8102E'], DET: ['#C8102E', '#1D42BA'], ORL: ['#0077C0', '#C4CED4'], ATL: ['#E03A3E', '#C1D32F'], TOR: ['#CE1141', '#000000'], IND: ['#002D62', '#FDBB30'], PHI: ['#006BB6', '#ED174C'], BKN: ['#000000', '#FFFFFF'] };
const NAME = { MEM: 'Grizzlies', UTAH: 'Jazz', LAL: 'Lakers', PHX: 'Suns', DEN: 'Nuggets', OKC: 'Thunder', WSH: 'Wizards', CHA: 'Hornets', MIN: 'Timberwolves', CLE: 'Cavaliers', CHI: 'Bulls', BOS: 'Celtics', DAL: 'Mavericks', HOU: 'Rockets', SAC: 'Kings', GS: 'Warriors', MIA: 'Heat', MIL: 'Bucks', NY: 'Knicks', POR: 'Trail Blazers', SA: 'Spurs', LAC: 'Clippers', NO: 'Pelicans', DET: 'Pistons', ORL: 'Magic', ATL: 'Hawks', TOR: 'Raptors', IND: 'Pacers', PHI: '76ers', BKN: 'Nets' };
const lin = (x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (v) => '#' + v.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
const lum = (h) => { const [r, g, b] = rgb(h).map((v) => lin(v / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const CHALK = '#F3EFE6', INK = '#14101F', BG1 = '#1E1B28', SURF1 = '#2D2B35';
const darken = (h, f) => hex(rgb(h).map((v) => v * f));
const mix = (a, b, t) => hex(rgb(a).map((v, i) => v * (1 - t) + rgb(b)[i] * t));
function pal(a) {
  let [p, s] = TC[a]; let f = 1;
  while (Math.max(ratio(lum(CHALK), lum(p)), ratio(lum(INK), lum(p))) < 4.5 && f > 0.4) { f -= 0.04; p = darken(TC[a][0], f); }
  return { p, a: s, fg: ratio(lum(CHALK), lum(p)) >= ratio(lum(INK), lum(p)) ? CHALK : INK };
}
/* a team field (SPEC 3.2): the real primary at 55 % over bg-1, darkened until chalk reads at 4.5:1 or better */
function field(a) { let c = mix(BG1, TC[a][0], 0.55), f = 1; while (ratio(lum(CHALK), lum(c)) < 4.5 && f > 0.3) { f -= 0.04; c = darken(mix(BG1, TC[a][0], 0.55), f); } return c; }
/* Lab for the clash rule (CIE76 on sRGB -> Lab, D65) */
function lab(h) { let [r, g, b] = rgb(h).map((v) => lin(v / 255) * 100); const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 95.047, y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 100, z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 108.883; const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]; }
const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const hueOf = (h) => { const [r, g, b] = rgb(h).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 0.08) return null; let H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (H * 60 + 360) % 360; };
/* the two fields of a game billboard: when they clash (ΔE under 24, or the same hue family), the OPPONENT's field goes
   neutral (surface-1) and the split's two 4 px secondary edges tell the teams apart (SPEC 3.2, review 2 item 2) */
function fieldPair(away, home, mine = 'MEM') {
  let fa = field(away), fh = field(home);
  const ha = hueOf(TC[away][0]), hh = hueOf(TC[home][0]);
  const hueClose = ha != null && hh != null && Math.min(Math.abs(ha - hh), 360 - Math.abs(ha - hh)) < 28;
  const clash = dE(fa, fh) < 24 || hueClose;
  if (clash) { if (away === mine) fh = SURF1; else fa = SURF1; }
  return { fa, fh, clash };
}
const tvars = (a) => { const c = pal(a); return `--tp:${c.p};--ta:${c.a};--tc:${c.fg}`; };
const edge = (a) => `<span class="tedge" style="background:${pal(a).a}"></span>`;
const eyeSm = `<svg class="ic xs" viewBox="0 0 24 24" aria-hidden="true" style="flex:none;width:14px;height:14px">${P.eyeOff}</svg>`;
const partial = (r) => `<span class="nb-rp" style="display:inline-flex;align-items:center;gap:4px">${r}${eyeSm}</span>`;

// ---------- page shell ----------
function topbar(sel, { nbaLive = false, quiet = false, away = false, update = false } = {}) {
  const tabs = [['search', 'Search'], ['home', 'Home'], ['live', 'Live'], ['nba', 'NBA'], ['movie', 'Movies'], ['series', 'Series'], ['saved', 'Saved']];
  return `<div class="topbar${away ? ' away' : ''}" data-row="topbar"><img src="../../../app/tv/brand/assets/mark-small.svg" class="mk" alt=""><div class="tabs">${tabs.map(([k, l]) => `<span class="tab${k === 'search' ? ' srch' : ''}${k === sel ? ' sel' : ''}">${k === 'search' ? ic('search') : ''}${l}${k === 'nba' && nbaLive ? liveP(1) : ''}${k === 'nba' && quiet ? `<span class="hv-quiet" title="A result is being kept from you">${eyeSm}</span>` : ''}</span>`).join('')}</div><div class="tb-r"><span class="avatar">${ic('user')}${update ? '<i class="udot"></i>' : ''}</span></div></div>`;
}
const pages = [];
function page(file, title, body, note, { group = 'Home', shield = true, et = '2026-10-26', meta = '', tl = null } = {}) {
  fs.writeFileSync(path.join(root, file), `<!doctype html>
<html lang="en" class="tv"><head><meta charset="utf-8"><meta name="viewport" content="width=960,height=540"><meta name="mock-size" content="960x540@2">${shield ? `\n<meta name="shield" content="unseen"><meta name="hidden-et" content="${et}">` : ''}${tl ? `\n<meta name="tl" content="${esc(JSON.stringify(tl))}">` : ''}${meta}
<title>${esc(title)}</title>
<link rel="stylesheet" href="../../../app/tv/brand/fonts.css"><link rel="stylesheet" href="../../../app/tv/brand/tokens.css">
<link rel="stylesheet" href="../../../app/tv/ui.css"><link rel="stylesheet" href="../../../app/tv/app.css"><link rel="stylesheet" href="../../../app/tv/nba.css"><link rel="stylesheet" href="../catchup/catchup.css"><link rel="stylesheet" href="home-v2.css">
</head><body><div class="screen">
${body}
</div></body></html>
`);
  pages.push({ file, title, note, group });
  console.log('wrote', file);
}

// ---------- the content stand-ins (kit/data.js titles, with Icelandic ones for the language row) ----------
const T = {
  nightCircuit: { id: 's1', t: 'Night Circuit', kind: 'series', y: 2024, r: 7.8, g: 'Thriller', style: 'tower', hue: 262, q: '4K', plot: 'A night-shift radio engineer finds a signal that only appears during live broadcasts, and it knows the score before the game does.' },
  longTake: { id: 'm2', t: 'The Long Take', kind: 'movie', y: 2023, r: 7.4, g: 'Drama', style: 'theatre', hue: 14, rt: '1h 48m', plot: 'One unbroken shot follows a stage manager through the last night of a theatre that is about to close.' },
  saltStatic: { id: 'm5', t: 'Salt & Static', kind: 'movie', y: 2021, r: 7.2, g: 'Comedy', style: 'retro', hue: 276, rt: '1h 44m' },
  signalHill: { id: 's2', t: 'Signal Hill', kind: 'series', y: 2023, r: 8.2, g: 'Drama', style: 'peaks', hue: 150, plot: 'The valley radio station goes dark for a winter, and the town starts hearing itself on the air.' },
  glassOrchard: { id: 'm7', t: 'Glass Orchard', kind: 'movie', y: 2019, r: 8.3, g: 'Drama', style: 'forest', hue: 128, rt: '2h 20m' },
  harbor: { id: 'm1', t: 'Harbor Lights', kind: 'movie', y: 2024, r: 7.8, g: 'Thriller', style: 'lighthouse', hue: 205, q: '4K', rt: '2h 06m', plot: 'A harbour pilot starts getting radio calls from a lighthouse that was decommissioned in 1987. The calls are getting closer.' },
  paperMoons: { id: 'm3', t: 'Paper Moons', kind: 'movie', y: 2022, r: 8.1, g: 'Animation', style: 'waves', hue: 232, q: '4K', rt: '1h 37m', plot: 'Two siblings fold a paper city and find out it folds back.' },
  deadAir: { id: 'm4', t: 'Dead Air', kind: 'movie', y: 2025, r: 6.9, g: 'Horror', style: 'city', hue: 340, rt: '1h 31m' },
  midnightRelay: { id: 'm6', t: 'Midnight Relay', kind: 'movie', y: 2024, r: 7.6, g: 'Action', style: 'tower', hue: 205, q: '4K', rt: '2h 12m' },
  lowOrbit: { id: 'm8', t: 'Low Orbit', kind: 'movie', y: 2023, r: 7.0, g: 'Sci-Fi', style: 'rings', hue: 258, q: '4K', rt: '1h 58m' },
  cartographer: { id: 'm9', t: 'The Cartographer', kind: 'movie', y: 2022, r: 7.7, g: 'Adventure', style: 'peaks', hue: 24, rt: '2h 03m' },
  coldHarbour: { id: 'm11', t: 'Cold Harbour', kind: 'movie', y: 2024, r: 7.1, g: 'Crime', style: 'sun', hue: 214, rt: '1h 55m' },
  northbound: { id: 'm12', t: 'Northbound', kind: 'movie', y: 2018, r: 7.9, g: 'Drama', style: 'forest', hue: 200, rt: '2h 01m' },
  emberRun: { id: 'm13', t: 'Ember Run', kind: 'movie', y: 2025, r: 6.8, g: 'Action', style: 'retro', hue: 8, q: '4K', rt: '1h 49m' },
  quietFreq: { id: 'm14', t: 'Quiet Frequencies', kind: 'movie', y: 2021, r: 8.0, g: 'Mystery', style: 'rings', hue: 290, rt: '1h 52m' },
  understudy: { id: 'm18', t: 'The Understudy', kind: 'movie', y: 2024, r: 7.6, g: 'Comedy', style: 'figure', hue: 316, rt: '1h 53m' },
  copperFalls: { id: 's4', t: 'Copper Falls', kind: 'series', y: 2021, r: 7.6, g: 'Crime', style: 'forest', hue: 24 },
  deepField: { id: 's5', t: 'Deep Field', kind: 'series', y: 2024, r: 8.4, g: 'Sci-Fi', style: 'rings', hue: 232, q: '4K' },
  rookie: { id: 's6', t: 'Rookie Season', kind: 'series', y: 2022, r: 7.3, g: 'Sports', style: 'court', hue: 28 },
  tidewater: { id: 'm17', t: 'Tidewater', kind: 'movie', y: 2020, r: 7.0, g: 'Drama', style: 'waves', hue: 176, rt: '1h 42m' },
  velvet: { id: 'm10', t: 'Velvet Static', kind: 'movie', y: 2020, r: 6.5, g: 'Romance', style: 'waves', hue: 330, rt: '1h 39m' },
  nordurljos: { id: 'i1', t: 'Norðurljós', kind: 'movie', y: 2023, r: 7.4, g: 'Drama', style: 'peaks', hue: 190, lang: 'IS' },
  brimid: { id: 'i2', t: 'Brimið', kind: 'series', y: 2024, r: 7.9, g: 'Crime', style: 'waves', hue: 200, lang: 'IS' },
  eftirSolarlag: { id: 'i3', t: 'Eftir sólarlag', kind: 'movie', y: 2021, r: 7.1, g: 'Drama', style: 'sun', hue: 20, lang: 'IS' },
  hrafnar: { id: 'i4', t: 'Hrafnar', kind: 'series', y: 2022, r: 8.0, g: 'Thriller', style: 'forest', hue: 150, lang: 'IS' },
  vetrarfri: { id: 'i5', t: 'Vetrarfrí', kind: 'movie', y: 2025, r: 6.9, g: 'Comedy', style: 'city', hue: 210, lang: 'IS' },
  thognin: { id: 'i6', t: 'Þögnin í dalnum', kind: 'movie', y: 2020, r: 7.6, g: 'Mystery', style: 'figure', hue: 250, lang: 'IS' },
  ljosid: { id: 'i7', t: 'Ljósið í glugganum', kind: 'movie', y: 2019, r: 7.2, g: 'Drama', style: 'lighthouse', hue: 40, lang: 'IS' },
};
const art = (t, o = {}) => Art.art(t.id, { style: t.style, hue: t.hue, ...o });
const still = (t) => art(t, { crop: [40, 120, 320, 180] });
const tint = (t) => `--amb:hsl(${t.hue} 42% 24%);--amb2:hsl(${t.hue} 36% 14%)`;

// ---------- cards (SPEC 5) ----------
function wideCard({ title, meta, art: a = '', tl = '', tr = '', prog, focus = false, ch = '', crests = '', key = '', cls = '', pst = '', play = false }) {
  return `<div class="wc${focus ? ' f' : ''}${crests ? ' crest' : ''}${cls ? ' ' + cls : ''}"${key ? ` data-key="${esc(key)}"` : ''}>${pst ? `<div class="pl">${pst}</div>` : `<div class="art">${a}</div>`}${ch ? `<div class="ch">${ch}</div>` : ''}${tl ? `<div class="tl">${tl}</div>` : ''}${tr ? `<div class="tr n">${tr}</div>` : ''}${crests ? `<div class="crs">${crests}</div>` : ''}
      <div class="tx"><b>${title}</b><span>${meta}</span></div>${prog != null ? `<div class="prog flush"><i style="width:${prog}%"></i></div>` : ''}</div>`;
}
/* continue: the backdrop; the meta is what matters on a card: the episode and the time left (the episode's name is on the billboard) */
const contCard = (t, { ep = '', left = '', prog = 0, focus = false, noBackdrop = false } = {}) => wideCard({
  title: t.t, meta: ep ? `${ep}${dot}${left}` : left,
  art: noBackdrop ? '' : art(t), pst: noBackdrop ? `<div class="art">${Art.poster(t.id, { style: t.style, hue: t.hue, title: t.t })}</div>` : '', prog, focus, key: 'p:' + t.id, cls: noBackdrop ? 'pst' : '',
});
const newEpCard = (t, { ep, when, focus = false }) => wideCard({ title: t.t, meta: `${ep}${dot}${when}`, art: still(t), tl: `<span class="t-label">New</span>`, focus, key: 'n:' + t.id });
function replayCard({ away, home, where, prog, focus = false, hidden = false }) {
  return `<div class="wc${focus ? ' f' : ''} crest" data-key="p:rp:${away}${home}"><div class="art" style="background:linear-gradient(120deg,${pal(away).p} 0 48%,${pal(home).p} 52% 100%)"></div><div class="tl"><span class="t-label">NBA · Replay</span></div><div class="crs">${crest(away, 's24')}${crest(home, 's24')}</div>
      <div class="tx"><b>${NAME[away]} at ${NAME[home]}</b><span>${hidden ? `<span class="cu-may">${eyeSm}Score hidden</span>` : where}</span></div>${prog != null ? `<div class="prog flush"><i style="width:${prog}%"></i></div>` : ''}</div>`;
}
/* channel card: the provider's logo (stream_icon) in a 64 px tile, the number on every card, the programme, the bar; a channel
   carrying a game gets the teams' colours and crests. The stand-in logos below are wordmarks drawn in the channel's own colour,
   as a provider's PNGs would be; the two-letter tile is the fallback when there is no stream_icon */
const LOGOS = {
  lp: '<svg viewBox="0 0 64 40"><rect x="6" y="6" width="52" height="28" rx="5" fill="#C9082A"/><text x="32" y="25" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="15" fill="#fff">NBA</text></svg>',
  espn: '<svg viewBox="0 0 64 40"><text x="32" y="27" text-anchor="middle" font-family="Outfit" font-weight="800" font-size="20" font-style="italic" fill="#D62021">ESPN</text></svg>',
  nbatv: '<svg viewBox="0 0 64 40"><text x="30" y="27" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="14" fill="#1D428A">NBA</text><rect x="44" y="12" width="16" height="16" rx="3" fill="#C9082A"/><text x="52" y="24" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="9" fill="#fff">TV</text></svg>',
  ruv: '<svg viewBox="0 0 64 40"><text x="32" y="28" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="20" fill="#F3EFE6">RÚV</text></svg>',
  sky: '<svg viewBox="0 0 64 40"><text x="32" y="24" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="16" fill="#F3EFE6">sky</text><text x="32" y="35" text-anchor="middle" font-family="Inter" font-weight="700" font-size="8" fill="#0072C9">SPORTS</text></svg>',
  bbc: '<svg viewBox="0 0 64 40"><rect x="10" y="12" width="13" height="13" fill="#F3EFE6"/><rect x="25" y="12" width="13" height="13" fill="#F3EFE6"/><rect x="40" y="12" width="13" height="13" fill="#F3EFE6"/><text x="16" y="22" text-anchor="middle" font-family="Inter" font-weight="800" font-size="10" fill="#15131D">B</text><text x="31" y="22" text-anchor="middle" font-family="Inter" font-weight="800" font-size="10" fill="#15131D">B</text><text x="46" y="22" text-anchor="middle" font-family="Inter" font-weight="800" font-size="10" fill="#15131D">C</text><text x="32" y="36" text-anchor="middle" font-family="Inter" font-weight="600" font-size="8" fill="#F3EFE6">ONE</text></svg>',
  stod2: '<svg viewBox="0 0 64 40"><circle cx="24" cy="20" r="12" fill="#E8A317"/><text x="44" y="28" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="22" fill="#F3EFE6">2</text></svg>',
  tnt: '<svg viewBox="0 0 64 40"><text x="32" y="28" text-anchor="middle" font-family="Outfit" font-weight="800" font-size="20" fill="#F3EFE6">TNT</text></svg>',
  via: '<svg viewBox="0 0 64 40"><text x="32" y="27" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="13" fill="#F3EFE6">viaplay</text></svg>',
};
function chCard({ num, name, logo = '', ini, now, s, e, nowH, live = false, focus = false, hidden = '', game = null }) {
  const prog = Math.max(0, Math.min(100, ((nowH - s) / (e - s)) * 100));
  const fieldEl = game ? `<div class="art" style="background:linear-gradient(120deg,${pal(game[0]).p} 0 48%,${pal(game[1]).p} 52% 100%)"></div>` : `<div class="art chf"></div>`;
  const tile = logo ? `<span class="chlogo" data-logo="1">${LOGOS[logo]}</span>` : `<span class="logo">${ini}</span>`;
  return `<div class="wc chc${focus ? ' f' : ''}${game ? ' crest' : ''}" data-key="ch:${num}">${fieldEl}<div class="ch">${tile}${live ? liveP() : ''}</div><div class="tr n">${num}</div>${game ? `<div class="crs">${crest(game[0], 's24')}${crest(game[1], 's24')}</div>` : ''}
      <div class="tx"><b>${hidden || now}</b><span>${name}</span></div><div class="prog flush"><i style="width:${prog}%"></i></div></div>`;
}
function poster(t, { focus = false, mine = false, prog, named = false } = {}) {
  const tl = t.q === '4K' ? tag('4K', named ? 'q named' : 'q') : '';
  const tr = t.lang && t.lang !== 'EN' ? tag(t.lang) : '';
  return `<div class="pc${focus ? ' fc' : ''}" data-key="t:${t.id}"><div class="box${focus ? ' f' : ''}"><div class="art">${Art.poster(t.id, { style: t.style, hue: t.hue, title: t.t })}</div>${tl ? `<div class="tl">${tl}</div>` : ''}${tr ? `<div class="tr">${tr}</div>` : ''}${mine ? `<span class="ad-mine">${ic('tv')}</span>` : ''}${prog ? `<div class="prog flush"><i style="width:${prog}%"></i></div>` : ''}</div>
      <div class="cap">${esc(t.t)}</div><div class="cm">${t.y}${dot}${t.r ? `★ ${t.r.toFixed(1)}` : t.g}</div></div>`;
}
const endCard = (label, { wide = false, focus = false, icon = 'chevR' } = {}) => `<div class="endcard${wide ? ' w' : ''}${focus ? ' f' : ''}">${ic(icon)}<span>${label}</span></div>`;
/* a door (SPEC 4.4, the Browse row): a 2 x 2 mosaic of the first four posters behind a label and a count; OK opens Movies or
   Series with those filters set. Everything on it comes from the prepared lists the Filters sheet already counts. */
function door({ label, count, titles, focus = false, key }) {
  return `<div class="wc dr${focus ? ' f' : ''}" data-key="d:${esc(key)}"><div class="mos">${titles.slice(0, 4).map((t) => `<div class="art">${Art.poster(t.id, { style: t.style, hue: t.hue })}</div>`).join('')}</div><div class="tx"><b>${esc(label)}</b><span>${count}</span></div></div>`;
}
/* game card (ui.css .gc): the app's cards.js gameCard; play = the ▶ mark beside LIVE on Home (OK = Watch live) */
const ORD = (n) => `${n}${['ST', 'ND', 'RD', 'TH'][n - 1]}`;
function gameCard(g, { focus = false, hidden = false, other = false } = {}) {
  const A = g.away, H = g.home;
  let st = '', plate = '';
  if (g.state === 'in') st = `${liveP()}${!hidden ? `<span class="hv-play">${ic('play')}</span>` : ''}<span>${ORD(g.q)} ${g.clock}</span>`;
  else if (g.state === 'post') st = hidden ? '<span>Ended</span>' : `<span>Final${g.ot ? ' / OT' : ''}</span>`;
  else st = `<span>${g.in}</span>`;
  const tv = g.replay ? `<span class="cu-rpl">${ic('hist')}Replay</span>` : `<span class="tvn">${esc(g.tv)}</span>`;
  const awWin = !hidden && g.state === 'post' && g.aw > g.hw, hwWin = !hidden && g.state === 'post' && g.hw > g.aw;
  if (g.state === 'pre') plate = `<span class="plate"><span class="x"><span class="score sm">${g.tip}</span><span class="t-cap">tip-off</span></span></span>`;
  else if (hidden) plate = `<span class="plate"><span class="x">${ic('eyeOff')}<span class="t-cap">hidden</span></span></span>`;
  else plate = `<span class="plate"><span class="x"><span class="score md"${g.state === 'post' && !awWin ? ' style="opacity:.7"' : ''}>${g.aw}</span><span class="score md"${g.state === 'post' && !hwWin ? ' style="opacity:.7"' : ''}>${g.hw}</span></span></span>`;
  const lose = (w) => (g.state === 'post' && !hidden && !w ? ' lose' : '');
  const rec = (r) => (hidden ? '' : r);
  const long = (a) => (NAME[a].length > 10 ? ' long' : '');
  return `<div class="gc${focus ? ' f' : ''}" data-key="g:${A}${H}" data-state="${g.state}"${other ? ' data-other="1"' : ''}><div class="st">${st}${tv}</div>
    <div class="tr${lose(awWin)}${long(A)}">${edge(A)}${crest(A)}<span class="nm">${NAME[A]}</span><span class="rc">${rec(g.ar)}</span></div>
    <div class="tr${lose(hwWin)}${long(H)}">${edge(H)}${crest(H)}<span class="nm">${NAME[H]}</span><span class="rc">${rec(g.hr)}</span></div>${plate}</div>`;
}
function nextGameCard({ opp, home, day, tip, rec = '2-2', focus = false }) {
  return `<div class="gc next${focus ? ' f' : ''}" data-key="g:next"><div class="st"><span class="mine">Your team</span><span class="tvn">${day}</span></div>
    <div class="ng">${crest(opp)}<span>${home ? 'vs' : 'at'} ${NAME[opp]}</span></div><div class="ng"><small>${NAME[opp]} ${rec}</small></div>
    <span class="plate"><span class="x"><span class="score sm">${tip}</span><span class="t-cap">tip-off</span></span></span></div>`;
}

// ---------- rows ----------
const H = { wide: 111, game: 124, poster: 238 };
const GAP = (kind) => (kind === 'poster' ? 40 : 38);
function row({ title, sub = '', cards, kind = 'wide', peek = false, id = '', notitle = false }, top) {
  return `<div class="hv-row${kind === 'poster' ? ' poster' : ''}" data-rail="${esc(id)}" style="top:${top}px;height:${GAP(kind) + H[kind]}px">${notitle ? '' : `<div class="hv-rt">${title}${sub ? `<small>${sub}</small>` : ''}</div>`}<div class="rail${peek ? ' peek' : ''}"><div class="track" data-row>${cards.join('')}</div></div></div>`;
}
function rows(list, { lift = -1 } = {}) {
  let y = 298; const out = []; const tops = [];
  list.forEach((r) => { tops.push(y); y += GAP(r.kind || 'wide') + H[r.kind || 'wide'] + 24; });
  const last = list[list.length - 1], lastK = last.kind || 'wide';
  const maxDy = tops[tops.length - 1] + GAP(lastK) + H[lastK] + 6 - 513;
  const dy = lift > 0 ? Math.min(tops[lift] - 84, Math.max(0, maxDy)) : 0;
  list.forEach((r, i) => {
    const top = tops[i] - dy, k = r.kind || 'wide';
    const off = top > 540 || top + GAP(k) + H[k] < -10;
    const peek = top + GAP(k) + H[k] > 513 && i !== lift;   // posters: the captions count (a row that cannot show its captions whole peeks)
    out.push(off ? `<div class="hv-row off" data-rail="${esc(r.id)}" style="top:${top}px;visibility:hidden"></div>` : row({ ...r, peek, notitle: top + 28 > 513 || top < 84 }, top));   // a title the cover would cut is hidden, like the peek's text
  });
  return out.join('');
}

// ---------- billboards (SPEC 3) ----------
const btn = (label, { focus = false, primary = false, icon = '' } = {}) => `<span class="${primary ? 'btn' : 'btn2'}${focus ? ' f' : ''}">${icon ? ic(icon) : ''}${label}</span>`;
/* the greeting (SPEC 3.7): English by default (owner, 28 Oct); Icelandic and Off in Account > Languages */
const greet = (h) => (h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 18 ? 'Good afternoon' : 'Good evening');
const eye = (h, rest) => `<div class="hv-eye"><span class="t-label" style="color:var(--a-pink-text)">${greet(h)}</span>${dot}<span class="t-label t-2">${rest}</span></div>`;
function bbArt(t, { poster: pst = false } = {}) {
  if (pst) return `<div class="hv-art"></div><div class="hv-grain"></div><div class="hv-sy"></div><div class="hv-pst"><div class="art">${Art.poster(t.id, { style: t.style, hue: t.hue, title: t.t })}</div></div><div class="hv-st"></div>`;
  return `<div class="hv-art">${art(t, { crop: [0, 40, 400, 125] })}</div><div class="hv-sx"></div><div class="hv-sy"></div><div class="hv-st"></div>`;
}
/* continue / up next, with "Where you were" (SPEC 3.3, core idea C): the episode's own line so a show picked up after days makes sense */
function bbContinue({ t, ep, epName, left, prog, hour = 20, nofocus = false, upnext = false, offline = false, ends = '', where = '' }) {
  return `<div class="hv-bb" style="${tint(t)}">${bbArt(t)}
  <div class="hv-col">${eye(hour, upnext ? 'Up next' : 'Pick up where you left off')}
    <div class="hv-title">${esc(t.t)}</div>
    <div class="hv-meta">${ep ? `${ep}${dot}<span class="epn">“${esc(epName)}”</span>${dot}${upnext ? '48 min' : '49 min'}` : `${t.y}${dot}${t.g}${dot}${t.rt}`}${t.q ? `${dot}${tag(t.q, 'q')}` : ''}${upnext ? '' : `${dot}<span>${left}</span>`}${ends ? `${dot}<span class="ends">Ends ${ends}</span>` : ''}</div>
    ${where ? `<div class="hv-where"><b>Where you were</b>${esc(where)}</div>` : upnext ? `<div class="hv-plot">${esc(t.plot || '')}</div>` : ''}${upnext ? '' : `<div class="prog hv-prog"><i style="width:${prog}%"></i></div>`}</div>
  <div class="hv-btns">${upnext ? `${btn('Play', { primary: true, icon: 'play', focus: !nofocus })}${btn('Details')}` : `${btn('Resume', { primary: true, icon: 'play', focus: !nofocus })}${btn('Start over')}${btn('Details')}`}${offline ? '<span class="t-cap">Needs a connection to play</span>' : ''}</div></div>`;
}
function bbDiscover({ t, why, hour = 21, nofocus = false, pst = false, first = false, cap = '', ends = '' }) {
  return `<div class="hv-bb" style="${tint(t)}">${bbArt(t, { poster: pst })}
  <div class="hv-col">${eye(hour, `${first ? 'Popular on your provider' : 'Top pick for you'}${why ? `${dot}${why}` : ''}`)}
    <div class="hv-title">${esc(t.t)}</div>
    <div class="hv-meta"><span class="star">${ic('star')}${t.r.toFixed(1)}</span>${dot}${t.y}${dot}${t.g}${dot}${t.rt || 'Series'}${t.q ? `${dot}${tag(t.q, 'q')}` : ''}${t.lang === 'IS' ? `${dot}${tag('IS')}` : ''}${ends ? `${dot}<span class="ends">Ends ${ends}</span>` : ''}</div>
    <div class="hv-plot">${esc(t.plot || '')}</div></div>
  <div class="hv-btns">${btn('Details', { primary: true, icon: 'info', focus: !nofocus })}${btn('Play', { icon: 'play' })}${btn('Save')}${cap ? `<span class="t-cap">${cap}</span>` : ''}</div></div>`;
}
/* new in a show he follows (SPEC 3.5): a new season, or tonight's new episode of a show he is current on */
function bbNewSeason({ t, season, eps, hour = 20, nofocus = false }) {
  return `<div class="hv-bb" style="${tint(t)}">${bbArt(t)}
  <div class="hv-col">${eye(hour, `New season${dot}Added today`)}
    <div class="hv-logo"><span class="hv-logotext">${esc(t.t)}</span></div>
    <div class="hv-meta">Season ${season}${dot}${eps} episodes${dot}<span class="star">${ic('star')}${t.r.toFixed(1)}</span>${dot}${t.g}${dot}You finished S${season - 1}</div>
    </div>
  <div class="hv-btns">${btn(`Play S${season} · E1`, { primary: true, icon: 'play', focus: !nofocus })}${btn('Series page')}<span class="t-cap">On your provider<br>Icelandic subtitles</span></div></div>`;
}
function bbNewEpisode({ t, ep, epName, mins, ends, hour = 20, nofocus = false, line = '' }) {
  return `<div class="hv-bb" style="${tint(t)}">${bbArt(t)}
  <div class="hv-col">${eye(hour, `New tonight${dot}A show you follow`)}
    <div class="hv-logo"><span class="hv-logotext">${esc(t.t)}</span></div>
    <div class="hv-meta">${ep}${dot}<span class="epn">“${esc(epName)}”</span>${dot}${mins} min${dot}Added today${dot}<span class="ends">Ends ${ends}</span></div>
    <div class="hv-plot">${esc(line)}</div></div>
  <div class="hv-btns">${btn('Play', { primary: true, icon: 'play', focus: !nofocus })}${btn('Series page')}${btn('Save')}<span class="t-cap">From Northlight<br>Icelandic subtitles</span></div></div>`;
}
function bbWelcome() {
  return `<div class="hv-bb"><div class="hv-grain"></div><div class="hv-st"></div><div class="hv-sy"></div>
  <div class="hv-col"><div class="hv-eye"><span class="t-label" style="color:var(--a-pink-text)">Welcome to airglow</span></div>
    <div class="hv-title">Your channels, films and series are loading</div>
    <div class="hv-meta">A minute or two the first time${dot}Home fills in as they land</div></div>
  <div class="hv-btns"><span class="t-cap" style="margin-left:0">Back cancels</span></div></div>`;
}
const side = (a, right, rec) => `<div class="hv-side${right ? ' r' : ''}">${right ? '' : crest(a, 'xxl')}<div><div class="nm">${NAME[a]}</div><div class="rc">${rec}</div></div>${right ? crest(a, 'xxl') : ''}</div>`;
/* the game-night band: two flat fields split at 12° with the teams' 4 px secondary edges, hard top and bottom edges at y 116 and 222 */
function fields(away, home) {
  const { fa, fh, clash } = fieldPair(away, home);
  return `<div class="hv-band" data-clash="${clash ? 1 : 0}"><div class="hv-fa" style="background:${fa}"></div><div class="hv-fh" style="background:${fh}"></div><div class="hv-split"><i style="background:${TC[away][1]}"></i><i style="background:${TC[home][1]}"></i></div><div class="hv-grain"></div></div>`;
}
/* your team's next game as the billboard (no VOD, nothing to continue, no game today) */
function bbNext({ opp, home, when, tip, channel, hour = 20, nofocus = false, rec, oppRec, ctx }) {
  const away = home ? opp : 'MEM', hm = home ? 'MEM' : opp;
  return `<div class="hv-bb game">${fields(away, hm)}<div class="hv-st"></div>
  <div class="hv-status"><span class="t-label" style="color:var(--a-pink-text)">${greet(hour)}</span>${dot}<span class="t-label t-2">Your team${dot}${when}</span></div>
  <div class="hv-mu">${side(away, 0, away === 'MEM' ? rec : oppRec)}<div class="hv-sp"><span class="score md">VS</span></div><div class="hv-clk"><span class="big">${tip}</span><span class="cap">tip-off</span></div>${side(hm, 1, hm === 'MEM' ? rec : oppRec)}</div>
  <div class="hv-ctx">${ctx}</div>
  <div class="hv-btns">${btn('Game page', { primary: true, icon: 'score', focus: !nofocus })}<span class="t-cap">${channel}</span></div></div>`;
}
/* game: game-night mode (SPEC 3.2). fan = the fan line already shield-safe (3.2: no seed or streak while a team game is unseen,
   the copy named by its game) */
function bbGame({ away, home, state, aw, hw, q, clock, ar, hr, shield = true, tipIn, tip, channel, feeds = 0, replay = false, kept = '', synced = '38', nofocus = false, behind = null, choose = false, seen = false, fan, asOf = '', offline = false, more = '', dayLabel = 'last night', primaryTip = false, unseen = false }) {
  const mine = '<span class="t-label" style="color:var(--a-pink-text)">Game night</span>';
  let status, plate, chip, btns, cap = '';
  const hiddenTile = `<span class="shield">${ic('eyeOff')}<span>Score hidden</span></span>`;
  const scoreEl = `<span class="score">${aw}</span><span class="dash">–</span><span class="score">${hw}</span>`;
  const matchup = `${NAME[away]} at ${NAME[home]}`;
  if (state === 'pre') {
    status = `${mine}${dot}<span class="t-label t-2">${matchup}${dot}Tip-off ${tip}</span>`;
    plate = '<span class="score md">VS</span>'; chip = [tipIn.replace('In ', '').replace(' min', ' MIN'), 'to tip-off'];
    btns = choose ? [btn('Choose channel', { primary: true, icon: 'search', focus: !nofocus }), btn('Open guide')] : [btn('Watch pre-game', { primary: true, icon: 'play', focus: !nofocus }), btn('Game page')];
    cap = choose ? 'No channel found yet<br>Your pick is remembered' : channel;
  } else if (state === 'in' && behind) {
    status = `${mine}${dot}${liveP()}<span class="t-label t-2">${matchup}${dot}${esc(channel)}</span>`;
    plate = hiddenTile; chip = [`${ORD(behind.q)} ${behind.clock}`, 'paused'];
    btns = [btn('Resume', { primary: true, icon: 'play', focus: !nofocus }), btn('Back to live'), btn('Game page')];
  } else if (state === 'in') {
    status = `${mine}${dot}${liveP()}<span class="t-label t-2">${matchup}${dot}${esc(channel)}</span>${!shield ? `<span class="synced">${ic('clock')}Synced · ${synced} s</span>` : ''}`;
    plate = shield ? hiddenTile : scoreEl;
    chip = shield ? ['ON NOW', 'not started'] : [`${ORD(q)} ${clock}`, 'live · synced'];
    const w = btn('Watch live', { primary: !primaryTip, icon: 'play', focus: !nofocus && !primaryTip }), f = replay ? btn('From tip-off', { primary: primaryTip, icon: 'tipoff', focus: !nofocus && primaryTip }) : '';
    btns = [primaryTip ? f : w, primaryTip ? w : f, btn(shield ? 'Reveal score' : 'Box score')];
    if (!replay) cap = `${feeds > 1 ? `Hold OK for ${feeds - 1} more channel${feeds > 2 ? 's' : ''}` : ''}`;
  } else if (replay && !seen) {   // the morning after (or a backlog: `more` names what waits)
    status = `${mine.replace('Game night', 'The morning after')}${dot}<span class="t-label t-2">${matchup}${dot}${dayLabel}${more ? `${dot}${more}` : ''}</span>`;
    plate = hiddenTile; chip = behind ? [`${ORD(behind.q)} ${behind.clock}`, 'paused'] : ['REPLAY', 'no spoilers'];
    btns = behind ? [btn('Resume', { primary: true, icon: 'play', focus: !nofocus }), btn('From tip-off', { icon: 'tipoff' }), btn('Game page')] : [btn('Watch from tip-off', { primary: true, icon: 'play', focus: !nofocus }), btn('Game page')];
    cap = `${channel}<br>${kept}`;
  } else {   // final, seen
    status = `${mine.replace('Game night', 'Your team')}${dot}<span class="t-label t-2">${matchup}${dot}Final</span>`;
    plate = scoreEl; chip = ['FINAL', aw > hw ? `W ${aw}–${hw}` : `L ${aw}–${hw}`];
    btns = [btn('Box score', { primary: true, icon: 'score', focus: !nofocus }), btn('Watch again', { icon: 'play' })];
    cap = channel;
  }
  const rec = (r) => (shield && unseen ? partial(r) : r);   // partial only while a team game is unseen (games.js recordFor)
  return `<div class="hv-bb game">${fields(away, home)}<div class="hv-st"></div>
  <div class="hv-status">${status}</div>
  <div class="hv-mu">${side(away, 0, rec(ar))}<div class="hv-sp">${plate}</div><div class="hv-clk"><span class="big">${chip[0]}</span><span class="cap">${chip[1]}</span></div>${side(home, 1, rec(hr))}</div>
  <div class="hv-ctx">${fan}${asOf ? `<span class="asof">${eyeSm}${asOf}</span>` : ''}</div>
  <div class="hv-btns">${btns.join('')}${cap ? `<span class="t-cap">${cap}</span>` : ''}${offline ? '<span class="t-cap">Needs a connection to play</span>' : ''}</div></div>`;
}

// ---------- THE TIMELINE ----------
// Grizzlies (real schedule): W vs UTAH 22 Oct, W at GS 24 Oct, W at SAC (Sat 25 · late, 01:00 26th), at UTAH (Mon 26 · late,
// 01:00 27th), at POR (Thu 29 · late, 02:00 30th), vs SAC (Sat 31, 00:00 1 Nov). Scores and the standings copy are stand-ins.
const TL = {
  jazz: { away: 'MEM', home: 'UTAH', tipH: 25, aw: 112, hw: 104, channel: 'NBA League Pass 4' },   // 01:00 Tue, written as 25:00 on the Monday clock
  // records entering each game, the standings copy taken at each tip-off (SPEC 9.3)
  atKings: { rec: '2-0', oppRec: '1-1', copy: { seed: '3rd in the West', streak: '2 in a row', lead: 'Morant 27.4 ppg' } },
  atJazz: { rec: '3-0', oppRec: '1-2', copy: { seed: '3rd in the West', streak: '3 in a row', lead: 'Morant 27.8 ppg' } },
  afterJazz: { rec: '4-0', oppRec: '1-3', copy: { seed: '2nd in the West', streak: '4 in a row', lead: 'Morant 28.1 ppg' } },
  afterPor: { rec: '5-0', copy: { seed: '1st in the West', streak: '5 in a row', lead: 'Morant 28.4 ppg' } },
  next: { opp: 'POR', home: false, day: 'Thu · late', tip: '02:00', oppRec: '1-3', when: 'Thu · late at Trail Blazers' },
  nextNext: { opp: 'SAC', home: true, day: 'Sat', tip: '00:00', oppRec: '2-3' },
};
const fanFull = (c) => `${c.seed}${dot}${c.streak}${dot}${c.lead}`;
const fanPartial = (c, next) => `${c.lead}${dot}Next: ${next}`;   // no seed, no streak while a team game is unseen (games.js recordFor)
// the real 26 Oct slate with its UTC tip-offs (hours on the Monday clock); state and clock derived from the mock's time
const SLATE = [
  { away: 'WSH', home: 'CHA', tipH: 23, aw: 98, hw: 104, ar: '2-1', hr: '2-1', tv: 'NBA League Pass' },
  { away: 'MIN', home: 'CLE', tipH: 23, aw: 111, hw: 102, ar: '3-0', hr: '1-1', tv: 'NBA League Pass' },
  { away: 'CHI', home: 'BOS', tipH: 23.5, aw: 101, hw: 109, ar: '1-2', hr: '1-1', tv: 'NBA League Pass' },
  { away: 'DAL', home: 'MIA', tipH: 23.5, aw: 96, hw: 99, ar: '1-2', hr: '0-3', tv: 'NBA TV' },
  { away: 'IND', home: 'MIL', tipH: 24, aw: 104, hw: 118, ar: '2-1', hr: '0-3', tv: 'NBA League Pass' },
  { away: 'PHX', home: 'OKC', tipH: 24, aw: 92, hw: 110, ar: '1-1', hr: '3-0', tv: 'NBA League Pass' },
  { away: 'ATL', home: 'HOU', tipH: 24.5, aw: 117, hw: 121, ar: '2-1', hr: '3-0', tv: 'NBA League Pass' },
  { away: 'MEM', home: 'UTAH', tipH: 25, aw: 112, hw: 104, ar: '3-0', hr: '1-2', tv: 'NBA League Pass 4', mine: true },
  { away: 'GS', home: 'DEN', tipH: 26, aw: 108, hw: 120, ar: '0-3', hr: '1-1', tv: 'NBC' },
];
const hm = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
const inText = (m) => (m <= 0 ? 'Tip-off' : m >= 60 ? `In ${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `In ${m} min`);
/* a game at the mock's clock: pre with "In …", in with a period and an illustrative clock, or post with its final */
function at(g, nowH, { hiddenMine = false, replays = false } = {}) {
  const el = nowH - g.tipH, m = Math.round(-el * 60);
  if (el < 0) return { ...g, state: 'pre', in: inText(m), tip: hm(g.tipH) };
  if (el < 2.45) { const q = el < 0.6 ? 1 : el < 1.25 ? 2 : el < 1.85 ? 3 : 4; const clock = ['9:41', '6:12', '4:12', '2:35'][q - 1]; const f = Math.min(1, (el + 0.2) / 2.45); return { ...g, state: 'in', q, clock, aw: Math.round(g.aw * f), hw: Math.round(g.hw * f) }; }
  return { ...g, state: 'post', replay: replays, hidden: !!g.mine && hiddenMine };
}
const slateAt = (nowH, o = {}) => SLATE.filter((g) => !g.mine || !o.dropMine).map((g) => at(g, nowH, o)).sort((a, b) => ({ in: 0, pre: 1, post: 2 }[a.state] - { in: 0, pre: 1, post: 2 }[b.state]) || a.tipH - b.tipH);
const counts = (list) => { const c = { in: 0, pre: 0, post: 0 }; list.forEach((g) => c[g.state]++); return [c.in ? `${c.in} live` : '', c.pre ? `${c.pre} later` : '', c.post ? `${c.post} final` : ''].filter(Boolean).join(' · '); };
const gameRow = (list, { focus = -1 } = {}) => list.map((g, i) => gameCard(g, { focus: i === focus, hidden: !!g.hidden, other: !g.mine }));
// other nights (stand-ins): the Tuesday, the Wednesday, the Friday
const SL = {
  tue: [{ away: 'NO', home: 'DEN', tipH: 23, ar: '1-3', hr: '2-1', tv: 'NBA League Pass 4' }, { away: 'MIA', home: 'NY', tipH: 23, ar: '0-4', hr: '3-1', tv: 'ESPN' }, { away: 'DAL', home: 'HOU', tipH: 23.5, ar: '1-3', hr: '4-0', tv: 'NBA League Pass' }, { away: 'POR', home: 'SAC', tipH: 26, ar: '1-3', hr: '1-2', tv: 'NBA League Pass' }],
  wed: [{ away: 'BOS', home: 'PHI', tipH: 23, ar: '2-2', hr: '2-2', tv: 'ESPN' }, { away: 'TOR', home: 'IND', tipH: 23, ar: '1-3', hr: '2-2', tv: 'NBA League Pass' }, { away: 'MIL', home: 'CHI', tipH: 23.5, ar: '1-3', hr: '2-2', tv: 'NBA League Pass' }, { away: 'GS', home: 'LAC', tipH: 26.5, ar: '1-3', hr: '1-3', tv: 'NBA League Pass' }],
  fri: [{ away: 'CLE', home: 'ATL', tipH: 23.5, ar: '2-3', hr: '3-2', tv: 'NBA League Pass' }, { away: 'OKC', home: 'MIN', tipH: 24, ar: '5-0', hr: '4-1', tv: 'ESPN' }, { away: 'NY', home: 'CHI', tipH: 24, ar: '4-1', hr: '2-3', tv: 'NBA League Pass' }, { away: 'LAL', home: 'GS', tipH: 26, ar: '3-2', hr: '1-4', tv: 'NBA League Pass' }],
};

// ---------- the content rows ----------
const NOWH = (h, m) => h + m / 60;
const CH = (nowH) => ({
  lp4: chCard({ num: 4, name: 'NBA League Pass 4', logo: 'lp', ini: 'NL', now: 'NBA Gametime', s: 20, e: 23, nowH }),
  espn: chCard({ num: 12, name: 'ESPN', logo: 'espn', ini: 'ES', now: 'SportsCenter', s: 20, e: 21, nowH }),
  nbatv: chCard({ num: 33, name: 'NBA TV', logo: 'nbatv', ini: 'NT', now: 'Game Time', s: 20, e: 21, nowH }),
  ruv: chCard({ num: 501, name: 'RÚV', logo: 'ruv', ini: 'RÚ', now: 'Kastljós', s: 20, e: 20.75, nowH }),
  sky: chCard({ num: 118, name: 'Sky Sports Main Event', logo: 'sky', ini: 'SS', now: 'Premier League: Live', s: 20, e: 22.25, nowH, live: true }),
  bbc: chCard({ num: 101, name: 'BBC One', logo: 'bbc', ini: 'BO', now: 'Panorama', s: 20.5, e: 21, nowH }),
  stod2: chCard({ num: 502, name: 'Stöð 2', logo: 'stod2', ini: 'S2', now: 'Fréttir', s: 20.5, e: 21, nowH }),
  tnt: chCard({ num: 31, name: 'TNT Sports 1', logo: 'tnt', ini: 'TS', now: 'Sports Tonight', s: 20, e: 21, nowH }),
  noguide: chCard({ num: 640, name: 'Viaplay Sport 1', logo: 'via', ini: 'VS', now: 'Viaplay Sport 1', s: 0, e: 1, nowH: 0, hidden: 'Viaplay Sport 1' }),
  nologo: chCard({ num: 733, name: 'Hringbraut', ini: 'HR', now: 'Kvöldfréttir', s: 20.5, e: 21, nowH }),
});
const CONT_BASE = (o = {}) => [
  contCard(T.longTake, { left: '1h 17m left', prog: 28, focus: o.focus === 1 }),
  contCard(T.saltStatic, { left: '18 min left', prog: 82, noBackdrop: true }),
  contCard(T.signalHill, { ep: 'S3 · E2', left: '44 min left', prog: 12 }),
  contCard(T.glassOrchard, { left: '1h 52m left', prog: 6 }),
];
const NC = (o = {}) => contCard(T.nightCircuit, { ep: 'S1 · E3', left: '21 min left', prog: 58, focus: o.focus === 0 });
const CONT_NIGHT = (o = {}) => [NC(o), ...CONT_BASE(o)];                                                       // game night: Kings finished Monday
const CONT_BACKLOG = (o = {}) => [NC(o), replayCard({ away: 'MEM', home: 'SAC', where: 'Stopped in Q3', prog: 61 }), ...CONT_BASE(o)];   // the Kings replay unfinished
const CONT_TUE = (o = {}) => [replayCard({ away: 'MEM', home: 'UTAH', where: '', hidden: true, prog: null, focus: o.focus === 0 }), ...CONT_BASE(o)];   // Tue evening: the Jazz game waits as card 1 (the 18:00 cap)
const CONT_WED = (o = {}) => CONT_BASE(o);                                                                     // Wed: both seen; Night Circuit is the billboard
const NEWEPS = (o = {}) => [newEpCard(T.signalHill, { ep: 'S3 · E8', when: 'Added today', focus: o.focus === 0 }), newEpCard(T.copperFalls, { ep: 'S4 · E3', when: 'Yesterday' }), newEpCard(T.deepField, { ep: 'S1 · E6', when: 'Mon' }), newEpCard(T.rookie, { ep: 'S2 · E11', when: 'Sun' }), newEpCard(T.brimid, { ep: 'S1 · E4', when: 'Sat' })];
const BECAUSE = (o = {}) => [poster(T.deepField, { focus: o.focus === 0, mine: true }), poster(T.lowOrbit), poster(T.deadAir), poster(T.midnightRelay), poster(T.coldHarbour), poster(T.cartographer), poster(T.tidewater), endCard('See all')];
const PICKS = (o = {}) => [poster(T.harbor, { focus: o.focus === 0, mine: true }), poster(T.paperMoons, { mine: true }), poster(T.cartographer), poster(T.northbound, { mine: true }), poster(T.understudy), poster(T.deepField, { mine: true }), poster(T.glassOrchard), endCard('See all')];
const NEWPROV = (o = {}) => [poster(T.emberRun, { focus: o.focus === 0, named: true }), poster(T.deadAir), poster(T.understudy), poster(T.midnightRelay, { named: true }), poster(T.coldHarbour), poster(T.velvet), poster(T.tidewater), endCard('214 more')];
const FOURK = (o = {}) => [poster(T.harbor, { focus: o.focus === 0 }), poster(T.paperMoons, { named: true }), poster(T.midnightRelay, { named: true }), poster(T.lowOrbit, { named: true }), poster(T.emberRun, { named: true }), poster(T.deepField), poster(T.nightCircuit), endCard('See all')];
const ICE = (o = {}) => [poster(T.brimid, { focus: o.focus === 0 }), poster(T.nordurljos), poster(T.hrafnar), poster(T.eftirSolarlag), poster(T.thognin), poster(T.vetrarfri), poster(T.ljosid), endCard('See all')];
const SAVED = (o = {}) => [poster(T.northbound, { focus: o.focus === 0 }), poster(T.rookie), poster(T.quietFreq), poster(T.paperMoons), poster(T.hrafnar), poster(T.tidewater), endCard('Saved')];
const TONIGHT = (o = {}) => [poster(T.understudy, { focus: o.focus === 0, mine: true }), poster(T.saltStatic), poster(T.paperMoons, { mine: true }), poster(T.deadAir), poster(T.velvet), poster(T.tidewater), poster(T.vetrarfri), endCard('See all')];
const SERIES_START = (o = {}) => [poster(T.nightCircuit, { focus: o.focus === 0 }), poster(T.signalHill), poster(T.deepField), poster(T.copperFalls), poster(T.brimid), poster(T.hrafnar), poster(T.rookie), endCard('See all')];
const DOORS = (o = {}) => [
  door({ label: '90s thrillers', count: '212 films', titles: [T.quietFreq, T.coldHarbour, T.deadAir, T.harbor], focus: o.focus === 0, key: 'genre:thriller,decade:1990' }),
  door({ label: 'Under 90 minutes', count: '1,120 films', titles: [T.paperMoons, T.velvet, T.saltStatic, T.understudy], key: 'runtime:90' }),
  door({ label: 'Top rated, 2020s', count: '306 films', titles: [T.glassOrchard, T.northbound, T.harbor, T.lowOrbit], key: 'imdb:8,decade:2020' }),
  door({ label: 'Á íslensku', count: '38 titles', titles: [T.nordurljos, T.brimid, T.hrafnar, T.thognin], key: 'lang:is' }),
  door({ label: 'In 4K', count: '640 films', titles: [T.midnightRelay, T.emberRun, T.lowOrbit, T.deepField], key: 'q:4k' }),
  door({ label: 'Series with 3+ seasons', count: '418 series', titles: [T.signalHill, T.copperFalls, T.rookie, T.nightCircuit], key: 'series:3' }),
  door({ label: 'New this month', count: '214 films', titles: [T.emberRun, T.deadAir, T.understudy, T.coldHarbour], key: 'added:30' }),
  door({ label: 'Surprise me', count: 'One unseen film, rated 7+', titles: [T.cartographer, T.tidewater, T.midnightRelay, T.quietFreq], key: 'random' }),
];
const SHORT = (o = {}) => [newEpCard(T.rookie, { ep: 'S2 · E11 · 24 min', when: 'Sun', focus: o.focus === 0 }), newEpCard(T.brimid, { ep: 'S1 · E4 · 31 min', when: 'Sat' }), contCard(T.saltStatic, { left: '18 min left', prog: 82, noBackdrop: true }), newEpCard(T.copperFalls, { ep: 'S4 · E3 · 42 min', when: 'Yesterday' }), newEpCard(T.deepField, { ep: 'S1 · E6 · 44 min', when: 'Mon' })];

// ---------- the pages ----------
const ctxMenu = (items, { left, top, title }) => `<div class="hv-dim"></div><div class="ctxmenu hv-menu" style="left:${left}px;top:${top}px"><h3>${esc(title)}</h3><div data-col>${items.map(([icon, label], i) => `<div class="lr${i === 0 ? ' f-ring' : ''}">${ic(icon, 'sm')}<span class="grow">${label}</span></div>`).join('')}</div></div>`;
const offlinePill = () => `<div class="offline-bar hv">${ic('wifiOff')}<b>Offline</b>${dot}showing what airglow remembers</div>`;
const JAZZ = { away: 'MEM', home: 'UTAH', channel: 'NBA League Pass 4' };
const NBA_ROW = (nowH, o = {}) => { const l = slateAt(nowH, o); return { id: 'nba', title: o.title || 'Tonight in the NBA', sub: counts(l) + (o.subx || ''), cards: gameRow(l), kind: 'game' }; };
const NIGHT_ROWS = (nowH, cont) => [{ id: 'cont', title: 'Continue watching', cards: cont, kind: 'wide' }, NBA_ROW(nowH, { dropMine: true }), { id: 'neweps', title: 'New in your shows', cards: NEWEPS(), kind: 'wide' }];
const tlNight = (nowH, extra = {}) => ({ now: hm(nowH), mem: TL.atJazz.rec, unseen: [], seed: TL.atJazz.copy.seed, streak: TL.atJazz.copy.streak, ...extra });

// 1. Game night, the state he sees most (lead): 01:52, Q2, shield on, not watching. Kings finished on Monday: full record, full fan line.
page('home-live-hidden.html', 'Game night: live, score hidden', `${topbar('home')}
${bbGame({ ...JAZZ, state: 'in', q: 2, clock: '4:12', ar: TL.atJazz.rec, hr: TL.atJazz.oppRec, replay: true, fan: fanFull(TL.atJazz.copy), asOf: 'as of tip-off' })}
<div class="hv-page">${rows(NIGHT_ROWS(NOWH(25, 52), CONT_NIGHT()))}</div><div class="hv-edge"></div>`,
  'Tue 27 Oct 01:52, shield My team, the game is on and he has not started it. Game-night mode: the team fields as a hard-edged band under the status row (the LIVE pill and the rings stay on the canvas), crests in the neutral disc, Score hidden on the plate, ON NOW · not started on the chip, Watch live (the owner\'s choice) · From tip-off · Reveal score (with a confirm); the fan line is full because every earlier Grizzlies game is seen.', { tl: tlNight(NOWH(25, 52)) });
// 2. The same minute with the score shown (shield Off, or after Reveal)
page('home-live.html', 'Game night: live, revealed', `${topbar('home')}
${bbGame({ ...JAZZ, state: 'in', aw: 48, hw: 51, q: 2, clock: '4:12', ar: TL.atJazz.rec, hr: TL.atJazz.oppRec, shield: false, replay: true, fan: fanFull(TL.atJazz.copy) })}
<div class="hv-page">${rows(NIGHT_ROWS(NOWH(25, 52), CONT_NIGHT()))}</div><div class="hv-edge"></div>`,
  'Shield Off, or after Reveal score: the score in Barlow on the plate, 2ND 4:12 on the chip, Synced · 38 s. Live game cards on Home carry a ▶ beside LIVE: OK there is Watch live.', { shield: false, tl: tlNight(NOWH(25, 52)) });
// 3. Behind in a replay: 02:35, his from-tip-off replay stopped in Q1
page('home-behind.html', 'Game night: behind in a replay', `${topbar('home')}
${bbGame({ ...JAZZ, state: 'in', behind: { q: 1, clock: '8:20' }, ar: TL.atJazz.rec, hr: TL.atJazz.oppRec, replay: true, fan: fanFull(TL.atJazz.copy), asOf: 'as of tip-off' })}
<div class="hv-page">${rows(NIGHT_ROWS(NOWH(26, 35), CONT_NIGHT()))}</div><div class="hv-edge"></div>`,
  '02:35: he started from tip-off and stopped in Q1. LIVE on the clock, the chip shows HIS position (1ST 8:20 · paused), Resume · Back to live · Game page; no live clock anywhere (catch-up 7.2).', { tl: tlNight(NOWH(26, 35)) });
// 4, 5. Before tip-off: 00:11 (the 23:00 and 23:30 games are live, the rest come later)
page('home-pre.html', 'Before tip-off', `${topbar('home')}
${bbGame({ ...JAZZ, state: 'pre', tipIn: 'In 49 min', tip: '01:00', ar: TL.atJazz.rec, hr: TL.atJazz.oppRec, fan: fanFull(TL.atJazz.copy), asOf: 'as of tip-off' })}
<div class="hv-page">${rows(NIGHT_ROWS(NOWH(24, 11), CONT_NIGHT()))}</div><div class="hv-edge"></div>`,
  '00:11, 49 minutes to tip-off: VS on the plate, 49 MIN · to tip-off on the chip, the tip time once in the status row, Watch pre-game focused. The slate at 00:11: the 23:00 and 23:30 games live, the 00:00 games tipping off, the rest later.', { tl: tlNight(NOWH(24, 11)) });
page('home-pre-choose.html', 'Before tip-off, no channel found', `${topbar('home')}
${bbGame({ ...JAZZ, state: 'pre', tipIn: 'In 49 min', tip: '01:00', ar: TL.atJazz.rec, hr: TL.atJazz.oppRec, choose: true, fan: fanFull(TL.atJazz.copy), asOf: 'as of tip-off' })}
<div class="hv-page">${rows(NIGHT_ROWS(NOWH(24, 11), CONT_NIGHT()))}</div><div class="hv-edge"></div>`,
  'The guide match failed: Choose channel opens the sheet (EPG match, NBA / League Pass channels, the Sports group), Open guide second; the pick is remembered per team.', { tl: tlNight(NOWH(24, 11)) });
// 6, 7. Two home games that test the colours (review 2 item 2): a red opponent, and a navy one that clashes with Memphis blue
const HOMEGAME = (opp, note, file, title) => {
  const nowH = NOWH(24, 52);
  page(file, title, `${topbar('home')}
${bbGame({ away: opp, home: 'MEM', channel: 'NBA League Pass 4', state: 'in', q: 2, clock: '4:12', ar: '3-2', hr: '5-0', replay: true, fan: fanFull(TL.afterPor.copy), asOf: 'as of tip-off' })}
<div class="hv-page">${rows([{ id: 'cont', title: 'Continue watching', cards: CONT_WED(), kind: 'wide' }, { id: 'nba', title: 'Tonight in the NBA', sub: '2 live · 2 later', cards: gameRow(SL.wed.map((g) => at(g, nowH))), kind: 'game' }, { id: 'neweps', title: 'New in your shows', cards: NEWEPS(), kind: 'wide' }])}</div><div class="hv-edge"></div>`, note, { tl: { now: hm(nowH), mem: '5-0', unseen: [], seed: '1st in the West', streak: '5 in a row' } });
};
HOMEGAME('HOU', 'A Grizzlies HOME game against a red team (a what-if night, 00:52): the Rockets\' crimson field sits left, the Memphis blue right; the status row with its LIVE pill and the buttons with their rings are on the canvas above and below the band, never on a colour. The split carries both teams\' 4 px secondary edges.', 'home-home-rockets.html', 'Game night at home: a red opponent');
HOMEGAME('DEN', 'A Grizzlies HOME game against a navy team: Memphis blue and Denver navy clash (same hue family), so the opponent\'s field goes neutral surface-1 and the split\'s two secondary edges (gold and yellow) tell the teams apart. Your team always keeps its colour.', 'home-home-nuggets.html', 'Game night at home: a clashing opponent');
// 8. The morning after: 10:40, the Jazz game unseen with a replay; the only unseen game, so the record counts to 3-0 and the fan line drops seed and streak
page('home-morning.html', 'The morning after', `${topbar('home', { quiet: true })}
${bbGame({ ...JAZZ, state: 'post', replay: true, kept: 'Replays for 3 days', ar: TL.atJazz.rec, hr: TL.atJazz.oppRec, fan: fanPartial(TL.atJazz.copy, TL.next.when), asOf: 'as of tip-off, Grizzlies at Jazz', unseen: true })}
<div class="hv-page">${rows([{ id: 'cont', title: 'Continue watching', cards: CONT_NIGHT(), kind: 'wide' }, NBA_ROW(NOWH(34, 40), { title: 'Last night in the NBA', dropMine: true, replays: true, subx: ' · yours hidden' }), { id: 'neweps', title: 'New in your shows', cards: NEWEPS(), kind: 'wide' }, { id: 'because', title: 'Because you watched Quiet Frequencies', cards: BECAUSE(), kind: 'poster' }])}</div><div class="hv-edge"></div>`,
  'Tue 27 Oct 10:40. THE MORNING AFTER · LAST NIGHT; REPLAY · no spoilers on the chip; the record counts the seen finals (3-0 ⊘); the fan line drops the seed and the streak and names its copy (as of tip-off, Grizzlies at Jazz). The NBA tab carries the eye-off: a result is being kept from him (the shield as a visible mode). The hidden game is left out of the NBA row (it is the billboard).', { tl: { now: '10:40', mem: TL.atJazz.rec, unseen: ['MEM@UTAH'], seed: '', streak: '' } });
// 9. A backlog: both the Kings replay (stopped in Q3) and the Jazz game unseen: the OLDEST game is the billboard
page('home-backlog.html', 'Two games to catch up: the oldest first', `${topbar('home', { quiet: true })}
${bbGame({ away: 'MEM', home: 'SAC', channel: 'NBA League Pass 4', state: 'post', replay: true, kept: 'Replays until Tue', ar: TL.atKings.rec, hr: '1-1', behind: { q: 3, clock: '6:41' }, fan: fanPartial(TL.atKings.copy, TL.next.when), asOf: 'as of tip-off, Grizzlies at Kings', dayLabel: 'Sat · late', more: '1 more after this', unseen: true })}
<div class="hv-page">${rows([{ id: 'cont', title: 'Continue watching', cards: [replayCard({ away: 'MEM', home: 'UTAH', where: '', hidden: true, prog: null }), NC(), ...CONT_BASE()], kind: 'wide' }, NBA_ROW(NOWH(34, 40), { title: 'Last night in the NBA', dropMine: true, replays: true, subx: ' · yours hidden' }), { id: 'neweps', title: 'New in your shows', cards: NEWEPS(), kind: 'wide' }])}</div><div class="hv-edge"></div>`,
  'Tue 10:40, a what-if: he never finished the Kings replay, and now the Jazz game waits too. The billboard is the OLDEST unseen game (Resume in Q3 · From tip-off · Game page), the status row says 1 more after this, the newer game is card 1 of Continue watching (Score hidden). The record counts only the seen finals (2-0 ⊘); the copy is the Kings tip-off\'s.', { tl: { now: '10:40', mem: TL.atKings.rec, unseen: ['MEM@SAC', 'MEM@UTAH'], seed: '', streak: '' } });
// 10. Final, seen: 03:40, he watched it to the buzzer
page('home-final-seen.html', 'Final, seen', `${topbar('home')}
${bbGame({ ...JAZZ, state: 'post', aw: 112, hw: 104, ar: TL.afterJazz.rec, hr: TL.afterJazz.oppRec, seen: true, replay: true, shield: false, fan: fanFull(TL.afterJazz.copy) })}
<div class="hv-page">${rows([{ id: 'cont', title: 'Continue watching', cards: CONT_NIGHT(), kind: 'wide' }, NBA_ROW(NOWH(27, 40), { dropMine: true, replays: true }), { id: 'neweps', title: 'New in your shows', cards: NEWEPS(), kind: 'wide' }])}</div><div class="hv-edge"></div>`,
  '03:40, he watched it to the buzzer: the final on the plate, FINAL · W 112–104 on the chip (no repeating caption), 4-0 and 4 in a row, 2nd in the West after the win. Box score focused, Watch again. The billboard holds 30 minutes.', { shield: false, tl: { now: '03:40', mem: TL.afterJazz.rec, unseen: [], seed: TL.afterJazz.copy.seed, streak: TL.afterJazz.copy.streak } });

// 11. Tuesday evening, 20:41: the 18:00 cap has passed, so the hidden Jazz game is card 1 of Continue watching and the title billboard is back
const TUE_ROWS = (o = {}) => [
  { id: 'cont', title: 'Continue watching', cards: CONT_TUE(o.cont), kind: 'wide' },
  { id: 'neweps', title: 'New in your shows', cards: NEWEPS(o.neweps), kind: 'wide' },
  { id: 'nba', title: 'Tonight in the NBA', sub: '4 later', cards: [nextGameCard({ opp: TL.next.opp, home: false, day: TL.next.day, tip: TL.next.tip, rec: TL.next.oppRec }), ...gameRow(SL.tue.map((g) => at(g, NOWH(20, 41))))], kind: 'game' },
  { id: 'because', title: 'Because you watched Quiet Frequencies', cards: BECAUSE(o.because), kind: 'poster' },
  { id: 'tonight', title: 'A film for tonight', sub: 'Under 2 hours · ends before midnight', cards: TONIGHT(o.tonight), kind: 'poster' },
  { id: 'picks', title: 'Top picks for you', sub: 'Popular this week · Icelandic and English', cards: PICKS(o.picks), kind: 'poster' },
  { id: 'browse', title: 'Browse your library', sub: '4,812 films · 1,930 series · OK opens the shelf', cards: DOORS(o.browse), kind: 'wide' },
  { id: 'newprov', title: 'New on your provider', sub: 'Last 14 days', cards: NEWPROV(o.newprov), kind: 'poster' },
  { id: '4k', title: 'In 4K', sub: 'Named 4K · checked when you open', cards: FOURK(o.fourk), kind: 'poster' },
  { id: 'is', title: 'Á íslensku', sub: 'Icelandic titles and sound', cards: ICE(o.ice), kind: 'poster' },
  { id: 'saved', title: 'Saved for later', cards: SAVED(o.saved), kind: 'poster' },
  { id: 'channels', title: 'Channels', sub: 'Favourites and recent', cards: (() => { const C = CH(NOWH(20, 41)); return [o.channels?.focus === 0 ? chCard({ num: 4, name: 'NBA League Pass 4', logo: 'lp', ini: 'NL', now: 'NBA Gametime', s: 20, e: 23, nowH: NOWH(20, 41), focus: true }) : C.lp4, C.espn, C.nbatv, C.ruv, C.sky, C.bbc, C.stod2, C.nologo, C.noguide]; })(), kind: 'wide' },
];
const WED_ROWS = (o = {}) => TUE_ROWS(o).map((r) => (r.id === 'cont' ? { ...r, cards: CONT_WED(o.cont) } : r.id === 'nba' ? { ...r, cards: [nextGameCard({ opp: TL.next.opp, home: false, day: TL.next.day, tip: TL.next.tip, rec: TL.next.oppRec }), ...gameRow(SL.wed.map((g) => at(g, NOWH(20, 41))))] } : r));
const bbNC = (o = {}) => bbContinue({ t: T.nightCircuit, ep: 'S1 · E3', epName: 'Signal', left: '21 min left', prog: 58, ends: '21:03', where: 'Mei traces the burst to a demolished stadium.', ...o });
page('home-evening.html', 'A normal evening', `${topbar('home', { quiet: true })}\n${bbNC()}\n<div class="hv-page">${rows(TUE_ROWS())}</div><div class="hv-edge"></div>`,
  'Tue 27 Oct 20:41. The morning-after billboard expired at 18:00 (the 12 h cap), so Home is the episode he is in the middle of: Good evening · Pick up where you left off, the episode\'s name, Ends 21:03, and WHERE YOU WERE: the episode\'s own line (Cinemeta), so a show picked up after days makes sense. The hidden Jazz game is card 1 of Continue watching; the NBA row sits below New in your shows on a night the Grizzlies do not play; the NBA tab carries the eye-off.', { tl: { now: '20:41', unseen: ['MEM@UTAH'] } });
page('home-new-episode.html', 'New tonight: an episode of a show he follows', `${topbar('home')}\n${bbNewEpisode({ t: T.signalHill, ep: 'S3 · E8', epName: 'Low Tide', mins: 49, ends: '21:31', line: 'The station\'s last broadcast reaches a listener nobody knew was still out there.' })}\n<div class="hv-page">${rows(WED_ROWS().map((r) => (r.id === 'cont' ? { ...r, cards: [NC(), ...CONT_BASE().filter((c) => !c.includes('Signal Hill'))] } : r)))}</div><div class="hv-edge"></div>`,
  'Wed 28 Oct, 20:41. A show he is current on (every earlier episode seen) got a new episode today: the billboard is that episode for the first visit after it lands, with the show\'s logo, the episode\'s line, Ends 21:31, Play focused. The first visit only; after that it is card 1 of New in your shows.', { shield: false });
page('home-new-season.html', 'New season of a show he finished', `${topbar('home')}\n${bbNewSeason({ t: T.signalHill, season: 4, eps: 10 })}\n<div class="hv-page">${rows(WED_ROWS().map((r) => (r.id === 'cont' ? { ...r, cards: [NC(), ...CONT_BASE().filter((c) => !c.includes('Signal Hill'))] } : r.id === 'neweps' ? { ...r, sub: 'Signal Hill S4 and 4 more' } : r)))}</div><div class="hv-edge"></div>`,
  'Signal Hill, which he finished through S3 (nothing of it in Continue watching), got a fourth season today: the billboard shows it with the show\'s logo, the season line, Play S4 · E1 focused. It outranks Continue for the first visit after it lands, then holds 48 h behind Continue.', { shield: false });
page('home-upnext.html', 'Up next: the next episode', `${topbar('home')}\n${bbContinue({ t: T.nightCircuit, ep: 'S1 · E4', epName: 'The Relay', upnext: true, ends: '21:30' })}\n<div class="hv-page">${rows(WED_ROWS())}</div><div class="hv-edge"></div>`,
  'He finished S1 · E3 last night: the next episode is the billboard (Up next · S1 · E4 · "The Relay" · 48 min · Ends 21:30, the episode\'s line), Play focused, Details.', { shield: false });
page('home-browse.html', 'Browse your library: the doors', `${topbar('home', { away: true })}${bbNC({ nofocus: true }).replace('class="hv-bb"', 'class="hv-bb hv-hidden"')}<div class="hv-cover"></div><div class="ctxline">Home${dot}Browse your library</div>\n<div class="hv-page">${rows(WED_ROWS({ browse: { focus: 0 } }), { lift: 6 })}</div><div class="hv-edge"></div>`,
  'The Browse row (core idea B): doors into a 4,812-film library from Home. Each door is a 2 × 2 mosaic of the first four posters behind a label and a live count, built from the filters the Movies tab already counts (genre × decade, runtime, rating, language, quality, seasons, added). OK opens the shelf with those filters set; Surprise me opens one unseen film rated 7+ on its title page.', { shield: false });
page('home-late.html', 'Late: something short before bed', `${topbar('home')}\n${bbContinue({ t: T.nightCircuit, ep: 'S1 · E3', epName: 'Signal', left: '21 min left', prog: 58, ends: '00:03', hour: 23, where: 'Mei traces the burst to a demolished stadium.' })}\n<div class="hv-page">${rows([{ id: 'cont', title: 'Continue watching', cards: CONT_WED(), kind: 'wide' }, { id: 'short', title: 'Something short before bed', sub: 'Under 45 minutes · from your shows', cards: SHORT(), kind: 'wide' }, { id: 'nba', title: 'Tonight in the NBA', sub: '2 live · 2 later', cards: gameRow(SL.wed.map((g) => at(g, NOWH(23, 42)))), kind: 'game' }])}</div><div class="hv-edge"></div>`,
  'Optional idea E: after 23:00 Home shifts: A film for tonight hides (nothing ends before midnight), a Something short before bed row (episodes under 45 min from his shows, the 18-minute film) moves up under Continue watching, Ends reads past midnight, the greeting is still Good evening. The late games take the NBA row.', { shield: false });
page('home-scrolled.html', 'A row in focus mid-page', `${topbar('home', { away: true })}${bbNC({ nofocus: true }).replace('class="hv-bb"', 'class="hv-bb hv-hidden"')}<div class="hv-cover"></div><div class="ctxline">Home${dot}Because you watched</div>\n<div class="hv-page">${rows(WED_ROWS({ because: { focus: 0 } }), { lift: 3 })}</div><div class="hv-edge"></div>`,
  'Down three times from Continue watching: the page lifts so the focused row\'s title sits at y 84, the bar steps away (Back brings the billboard\'s primary back), the next rows peek below (art only). Posters carry the [tv] mark when the provider has the add-on\'s title too.', { shield: false });
page('home-channels.html', 'The channels, at the bottom', `${topbar('home', { away: true })}${bbNC({ nofocus: true }).replace('class="hv-bb"', 'class="hv-bb hv-hidden"')}<div class="hv-cover"></div><div class="ctxline">Home${dot}Channels</div>\n<div class="hv-page">${rows(WED_ROWS({ channels: { focus: 0 } }), { lift: 11 })}</div>`,
  'The last row: the lift is clamped so Channels sits at the bottom with Saved for later above it (its title hidden under the cover, not cut). A channel card is the provider\'s logo (stream_icon) in a 64 px tile with the number on every card; the two-letter tile only when there is no logo (Hringbraut); no guide = the channel name alone.', { shield: false });
page('home-card-menu.html', 'Hold OK on a card', `${topbar('home')}\n${bbNC({ nofocus: true })}\n<div class="hv-page">${rows(WED_ROWS({ cont: { focus: 1 } })).replace('class="wc f"', 'class="wc lit"')}</div><div class="hv-edge"></div>\n${ctxMenu([['play', 'Resume'], ['restart', 'Start over'], ['info', 'Details'], ['check', 'Mark watched'], ['close', 'Remove from Home']], { left: 270, top: 180, title: 'The Long Take' })}`,
  'Hold OK on The Long Take: the page dims to 60 %, the card itself stays lit and lifted above the dim (the menu\'s row carries the one ring), the menu is titled with the card and sits beside it, never over the billboard\'s primary. Resume first and focused, Start over, Details, Mark watched, Remove from Home.', { shield: false });
page('home-offline.html', 'Offline, with a cache', `${topbar('home')}\n${bbNC({ offline: true })}\n<div class="hv-page">${rows(WED_ROWS().map((r) => r.id === 'nba' ? { ...r, sub: 'As of 20:12' } : r).filter((r) => r.id !== 'neweps' && r.id !== 'browse'))}</div><div class="hv-edge"></div>\n${offlinePill()}`,
  'The provider does not answer: Home is drawn from what airglow kept; the pill sits under the bar at the right; the billboard says Needs a connection to play (Resume stays focused: it leads to the diagnosis card). No LIVE pills, no clocks; New in your shows and Browse are left out (they need the provider).', { shield: false });
// 21. Discover: Fri 30 Oct 21:10, nothing in progress for 7 days (he finished everything), next game Sat vs Kings
page('home-discover.html', 'Nothing to continue: a top pick', `${topbar('home')}
${bbDiscover({ t: T.harbor, why: 'Thriller', cap: '4K HDR from Northlight<br>Also on your provider', ends: '23:16' })}
<div class="hv-page">${rows([{ id: 'neweps', title: 'New in your shows', cards: NEWEPS(), kind: 'wide' }, { id: 'nba', title: 'Tonight in the NBA', sub: '4 later', cards: [nextGameCard({ opp: TL.nextNext.opp, home: true, day: 'Tomorrow', tip: TL.nextNext.tip, rec: TL.nextNext.oppRec }), ...gameRow(SL.fri.map((g) => at(g, NOWH(21, 10))))], kind: 'game' }, { id: 'picks', title: 'Top picks for you', sub: 'Popular this week · Icelandic and English', cards: PICKS(), kind: 'poster' }])}</div><div class="hv-edge"></div>`,
  'Fri 30 Oct 21:10. Nothing in progress for 7 days (the Trail Blazers game seen, 5-0), so the billboard is the day\'s pick (Popular, his languages, unseen, the add-on\'s backdrop and line, Ends 23:16). Details focused (owner decision), Play, Save; the caption names the playable copy. Tomorrow\'s Kings game leads the NBA row.', { shield: false });
page('home-first.html', 'First start', `${topbar('home')}
${bbDiscover({ t: T.paperMoons, why: '', first: true, pst: true, hour: 20, ends: '22:18' })}
<div class="hv-page">${rows([{ id: 'nba', title: 'Tonight in the NBA', sub: '4 later', cards: [nextGameCard({ opp: TL.next.opp, home: false, day: TL.next.day, tip: TL.next.tip, rec: TL.next.oppRec }), ...gameRow(SL.wed.map((g) => at(g, NOWH(20, 41))))], kind: 'game' }, { id: 'picks', title: 'Top picks for you', sub: 'Popular this week · Icelandic and English', cards: PICKS(), kind: 'poster' }, { id: 'browse', title: 'Browse your library', sub: '4,812 films · 1,930 series', cards: DOORS(), kind: 'wide' }, { id: 'series', title: 'Series to start', cards: SERIES_START(), kind: 'poster' }])}</div><div class="hv-edge"></div>`,
  'Signed in a minute ago, nothing watched. The billboard is Popular\'s first title in his languages with the provider\'s poster upright (no backdrop yet). The NBA first (it needs no history), Top picks, the Browse doors, Series to start.', { shield: false });
const skel = (n, w, h) => Array.from({ length: n }, () => `<div class="skb" style="width:${w}px;height:${h}px;border-radius:16px;flex:none"></div>`).join('');
page('home-welcome.html', 'Welcome: the first minute', `${topbar('home')}\n${bbWelcome()}\n<div class="hv-page hv-skel"><div class="hv-row" style="top:298px"><div class="hv-rt"><span class="skb" style="width:220px;height:22px"></span></div><div class="rail"><div class="track">${skel(5, 272, 124)}</div></div></div><div class="hv-row" style="top:484px"><div class="hv-rt"><span class="skb" style="width:160px;height:22px"></span></div></div></div><div class="hv-edge"></div>`,
  'A first start before the channel list is in: the ramp, the welcome line, flat skeleton blocks where the NBA row and Top picks will be; nothing is focused (a progress screen), Back cancels.', { shield: false, meta: '\n<meta name="nofocus" content="progress">' });
{
  const C = CH(NOWH(20, 41));
  page('home-m3u.html', 'Live only (M3U): no films, no series', `${topbar('home')}\n${bbNext({ opp: TL.next.opp, home: false, when: TL.next.when, tip: TL.next.tip, channel: 'NBA League Pass 4', rec: TL.afterJazz.rec, oppRec: TL.next.oppRec, ctx: fanFull(TL.afterJazz.copy) })}\n<div class="hv-page">${rows([{ id: 'channels', title: 'Channels', sub: 'Favourites and recent', cards: [C.lp4, C.espn, C.nbatv, C.ruv, C.sky, C.bbc, C.stod2, C.nologo, C.noguide], kind: 'wide' }, { id: 'nba', title: 'Tonight in the NBA', sub: '4 later', cards: gameRow(SL.wed.map((g) => at(g, NOWH(20, 41)))), kind: 'game' }])}</div><div class="hv-edge"></div>`,
    'A playlist account (Wed 28, 20:41) with no films or series and nothing to continue: the next game is the billboard (the fields, VS, the tip time, Game page; no dead Remind me button until reminders ship), then the Channels row FIRST (on a live-only account the channels are the content), then tonight\'s games.', { shield: false, meta: '\n<meta name="m3u" content="1">', tl: { now: '20:41', mem: TL.afterJazz.rec, unseen: [], seed: TL.afterJazz.copy.seed, streak: TL.afterJazz.copy.streak } });
}
{
  const rowsList = [['Continue watching', true, 'Always first', true], ['Tonight in the NBA', true, 'Row 2 while a game is live or your team plays today, else here'], ['New in your shows', true, 'New episodes of shows you watch or saved'], ['Because you watched', true, 'Like the last title you finished'], ['A film for tonight', true, 'Under 2 hours, ends before midnight'], ['Top picks for you', true, 'Popular this week in your languages, unseen'], ['Browse your library', true, 'Doors into the whole catalog'], ['New on your provider', true, 'Added in the last 14 days'], ['In 4K', true, 'Named 4K, checked when you open'], ['Á íslensku', true, 'Icelandic titles and sound'], ['Saved for later', false, 'Saved titles you have not started'], ['Channels', true, 'Favourites and recent, at the bottom']];
  const arow = (i, [t, on, sub, pin], f) => `<div class="arow${f ? ' f-ring' : ''}${pin ? ' pin' : ''}${on ? '' : ' off'}"><span class="grip"><i></i><i></i><i></i></span><span class="n">${i + 1}</span><span class="grow" style="min-width:0">${t}<div class="t-cap" style="margin-top:0">${sub}</div></span><span class="av"><span class="onoff">${on ? 'On' : 'Off'}</span><span class="tg${on ? ' on' : ''}"><i></i></span></span></div>`;
  const groups = ['Provider', 'Add-ons', 'Playback', 'Sound', 'NBA', 'Languages', 'Home rows', 'Updates', 'About'];
  const tg = (t, sub) => `<div class="arow"><span class="grow" style="min-width:0">${t}<div class="t-cap" style="margin-top:0">${sub}</div></span><span class="av"><span class="onoff">On</span><span class="tg on"><i></i></span></span></div>`;
  page('home-rows-setting.html', 'Account: Home rows', `${topbar('account')}
<div class="abs" style="left:48px;top:80px;width:200px;display:flex;flex-direction:column;gap:4px">${groups.map((g) => `<div class="gl${g === 'Home rows' ? ' sel' : ''}">${g}</div>`).join('')}</div>
<div class="abs hv-set" style="left:272px;top:80px;width:640px"><div class="t-title" style="margin-bottom:10px">Home rows</div>
${tg('Your team first', 'On game days your team\'s game is the big card on Home')}${tg('Tell me when my team is live', 'A quiet chip while you watch something else')}
<div class="t-label" style="margin:4px 0 8px 4px">Rows, in order</div>
${rowsList.slice(0, 3).map((r, i) => arow(i, r, i === 2)).join('')}
<div class="hv-hint">${ic('info', 'sm')}OK turns a row off or on${dot}Hold OK moves it${dot}3 of 12, then Reset order</div></div>`,
    'Every row with its toggle and its place. OK turns a row off or on; hold OK lifts it and ▲▼ move it (the Saved page\'s reorder). Continue watching is pinned first (no grip). The NBA row says where it goes on game days. The list scrolls: 12 rows then Reset order.', { shield: false });
}
{
  const frame = (k, t) => { const dx = Math.round(240 * (1 - t)); return `<div class="sb-frame"><div class="sb-shot">${bbGame({ ...JAZZ, state: 'in', q: 2, clock: '4:12', ar: TL.atJazz.rec, hr: TL.atJazz.oppRec, replay: true, nofocus: true, fan: fanFull(TL.atJazz.copy), asOf: 'as of tip-off' }).replace('<div class="hv-fa" style="', `<div class="hv-fa" style="transform:translateX(${-dx}px);opacity:${(0.3 + 0.7 * t).toFixed(2)};`).replace('<div class="hv-fh" style="', `<div class="hv-fh" style="transform:translateX(${dx}px);opacity:${(0.3 + 0.7 * t).toFixed(2)};`).replace('<div class="hv-mu">', `<div class="hv-mu" style="opacity:${t.toFixed(2)};transform:scale(${(0.96 + 0.04 * t).toFixed(3)})">`).replace('<div class="hv-ctx">', `<div class="hv-ctx" style="opacity:${t.toFixed(2)}">`).replace('<div class="hv-btns">', `<div class="hv-btns" style="opacity:${t.toFixed(2)}">`)}</div><div class="sb-cap"><b>${k}</b></div></div>`; };
  page('home-live-entry.html', 'Game-night entry (storyboard)', `${topbar('home')}<div class="sb"><div class="sb-h"><div class="t-title">Game night: the entry, 280 ms</div><div class="t-cap">Once per visit, when the billboard is your team's game: the two fields slide in from their sides (transform and opacity, the live wipe's easing) while the plate and crests settle, then the ring lands. Reduced motion, or a dropped frame measured on the TV: a 120 ms fade instead. Nothing moves again until a basket changes the score (a 200 ms bump on the digits) or the game changes state (the 12° wipe).</div></div>
<div class="sb-row">${frame('0 ms · the fields are off screen, the plate waits', 0)}${frame('140 ms · the fields slide in, the plate settles', 0.5)}${frame('280 ms · home: Watch live takes the ring', 1)}</div></div>`,
    'Three stills of the 280 ms entry. Optional (idea F): transform and opacity only; measure on the 55OLED810, fall back to the fade.', { shield: false, meta: '\n<meta name="storyboard" content="1">' });
}

fs.writeFileSync(path.join(root, 'tools', 'pages.json'), JSON.stringify(pages, null, 1) + '\n');
console.log(pages.length + ' pages');
