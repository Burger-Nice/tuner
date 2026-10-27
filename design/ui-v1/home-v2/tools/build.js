// node tools/build.js   -> writes the Home v2 mocks (*.html) next to SPEC.md, and tools/pages.json.
// Every mock is the 960 x 540 canvas linking the app's real CSS (tokens, ui.css, app.css, nba.css, catchup.css) plus
// home-v2.css. Focus is marked with the kit classes: .f (ring + lift), .f-ring (ring only).
// The scenario (SPEC 0): the owner's TV, Reykjavik time (UTC all year), shield My team, languages Icelandic then English.
// The ESPN slate is the real 26 Oct 2026 one (nba-pages/data.json); clocks, scores, the provider's channels, guide and
// titles are illustrative stand-ins (the kit's fictional titles and procedural art).
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
  plus: '<path d="M12 5v14M5 12h14"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
const dot = '<span class="dot-sep"></span>';
const liveP = (c) => `<span class="a-live${c ? ' compact' : ''}">Live</span>`;
const IMG = '../nba-pages/img/';
const crest = (a, s = '') => `<span class="team ${s}"><img src="${IMG}logo-${a}.png" alt=""></span>`;
const tag = (t, c = '') => `<span class="tag ${c}">${t}</span>`;

// ---------- team colours: app/tv/js/util.js teamPalette rules (as catch-up/tools/build.js) ----------
const TC = { MEM: ['#5D76A9', '#F5B112'], UTAH: ['#002B5C', '#F9A01B'], LAL: ['#552583', '#FDB927'], PHX: ['#1D1160', '#E56020'], DEN: ['#0E2240', '#FEC524'], OKC: ['#007AC1', '#EF3B24'], WSH: ['#002B5C', '#E31837'], CHA: ['#1D1160', '#00788C'], MIN: ['#0C2340', '#78BE20'], CLE: ['#860038', '#FDBB30'], CHI: ['#CE1141', '#FFFFFF'], BOS: ['#007A33', '#BA9653'], DAL: ['#00538C', '#B8C4CA'], HOU: ['#CE1141', '#C4CED4'], SAC: ['#5A2D81', '#63727A'], GS: ['#1D428A', '#FFC72C'], MIA: ['#98002E', '#F9A01B'], MIL: ['#00471B', '#EEE1C6'], NY: ['#006BB6', '#F58426'], POR: ['#E03A3E', '#000000'], SA: ['#C4CED4', '#000000'], LAC: ['#C8102E', '#1D428A'], NO: ['#0C2340', '#C8102E'], DET: ['#C8102E', '#1D42BA'], ORL: ['#0077C0', '#C4CED4'], ATL: ['#E03A3E', '#C1D32F'] };
const NAME = { MEM: 'Grizzlies', UTAH: 'Jazz', LAL: 'Lakers', PHX: 'Suns', DEN: 'Nuggets', OKC: 'Thunder', WSH: 'Wizards', CHA: 'Hornets', MIN: 'Timberwolves', CLE: 'Cavaliers', CHI: 'Bulls', BOS: 'Celtics', DAL: 'Mavericks', HOU: 'Rockets', SAC: 'Kings', GS: 'Warriors', MIA: 'Heat', MIL: 'Bucks', NY: 'Knicks', POR: 'Trail Blazers', SA: 'Spurs', LAC: 'Clippers', NO: 'Pelicans', DET: 'Pistons', ORL: 'Magic', ATL: 'Hawks' };
const lin = (x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => { const [r, g, b] = rgb(h).map((v) => lin(v / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const CHALK = '#F3EFE6', INK = '#14101F';
const darken = (h, f) => '#' + rgb(h).map((v) => Math.round(v * f).toString(16).padStart(2, '0')).join('');
function pal(a) {
  let [p, s] = TC[a]; let f = 1;
  while (Math.max(ratio(lum(CHALK), lum(p)), ratio(lum(INK), lum(p))) < 4.5 && f > 0.4) { f -= 0.04; p = darken(TC[a][0], f); }
  return { p, a: s, fg: ratio(lum(CHALK), lum(p)) >= ratio(lum(INK), lum(p)) ? CHALK : INK };
}
const tvars = (a) => { const c = pal(a); return `--tp:${c.p};--ta:${c.a};--tc:${c.fg}`; };
const edge = (a) => `<span class="tedge" style="background:${pal(a).a}"></span>`;
const eyeSm = `<svg class="ic xs" viewBox="0 0 24 24" aria-hidden="true" style="flex:none;width:14px;height:14px">${P.eyeOff}</svg>`;
const partial = (r) => `<span class="nb-rp" style="display:inline-flex;align-items:center;gap:4px">${r}${eyeSm}</span>`;

// ---------- page shell ----------
function topbar(sel, { nbaLive = false, away = false, update = false } = {}) {
  const tabs = [['search', 'Search'], ['home', 'Home'], ['live', 'Live'], ['nba', 'NBA'], ['movie', 'Movies'], ['series', 'Series'], ['saved', 'Saved']];
  return `<div class="topbar${away ? ' away' : ''}" data-row="topbar"><img src="../../../app/tv/brand/assets/mark-small.svg" class="mk" alt=""><div class="tabs">${tabs.map(([k, l]) => `<span class="tab${k === 'search' ? ' srch' : ''}${k === sel ? ' sel' : ''}">${k === 'search' ? ic('search') : ''}${l}${k === 'nba' && nbaLive ? liveP(1) : ''}</span>`).join('')}</div><div class="tb-r"><span class="avatar">${ic('user')}${update ? '<i class="udot"></i>' : ''}</span></div></div>`;
}
const pages = [];
function page(file, title, body, note, { group = 'Home', shield = false, et = '2026-10-26' } = {}) {
  fs.writeFileSync(path.join(root, file), `<!doctype html>
<html lang="en" class="tv"><head><meta charset="utf-8"><meta name="viewport" content="width=960,height=540"><meta name="mock-size" content="960x540@2">${shield ? `\n<meta name="shield" content="unseen"><meta name="hidden-et" content="${et}">` : ''}
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
  signalHill: { id: 's2', t: 'Signal Hill', kind: 'series', y: 2023, r: 8.2, g: 'Drama', style: 'peaks', hue: 150 },
  glassOrchard: { id: 'm7', t: 'Glass Orchard', kind: 'movie', y: 2019, r: 8.3, g: 'Drama', style: 'forest', hue: 128, rt: '2h 20m' },
  harbor: { id: 'm1', t: 'Harbor Lights', kind: 'movie', y: 2024, r: 7.8, g: 'Thriller', style: 'lighthouse', hue: 205, q: '4K', rt: '2h 06m', plot: 'A harbour pilot starts getting radio calls from a lighthouse that was decommissioned in 1987. The calls are getting closer.', cast: 'Mara Kovač, Idris Fenn' },
  paperMoons: { id: 'm3', t: 'Paper Moons', kind: 'movie', y: 2022, r: 8.1, g: 'Animation', style: 'waves', hue: 232, q: '4K', rt: '1h 37m', plot: 'Two siblings fold a paper city and find out it folds back.' },
  deadAir: { id: 'm4', t: 'Dead Air', kind: 'movie', y: 2025, r: 6.9, g: 'Horror', style: 'city', hue: 340 },
  midnightRelay: { id: 'm6', t: 'Midnight Relay', kind: 'movie', y: 2024, r: 7.6, g: 'Action', style: 'tower', hue: 205, q: '4K' },
  lowOrbit: { id: 'm8', t: 'Low Orbit', kind: 'movie', y: 2023, r: 7.0, g: 'Sci-Fi', style: 'rings', hue: 258, q: '4K' },
  cartographer: { id: 'm9', t: 'The Cartographer', kind: 'movie', y: 2022, r: 7.7, g: 'Adventure', style: 'peaks', hue: 24 },
  coldHarbour: { id: 'm11', t: 'Cold Harbour', kind: 'movie', y: 2024, r: 7.1, g: 'Crime', style: 'sun', hue: 214 },
  northbound: { id: 'm12', t: 'Northbound', kind: 'movie', y: 2018, r: 7.9, g: 'Drama', style: 'forest', hue: 200 },
  emberRun: { id: 'm13', t: 'Ember Run', kind: 'movie', y: 2025, r: 6.8, g: 'Action', style: 'retro', hue: 8, q: '4K' },
  quietFreq: { id: 'm14', t: 'Quiet Frequencies', kind: 'movie', y: 2021, r: 8.0, g: 'Mystery', style: 'rings', hue: 290 },
  understudy: { id: 'm18', t: 'The Understudy', kind: 'movie', y: 2024, r: 7.6, g: 'Comedy', style: 'figure', hue: 316 },
  copperFalls: { id: 's4', t: 'Copper Falls', kind: 'series', y: 2021, r: 7.6, g: 'Crime', style: 'forest', hue: 24 },
  deepField: { id: 's5', t: 'Deep Field', kind: 'series', y: 2024, r: 8.4, g: 'Sci-Fi', style: 'rings', hue: 232, q: '4K' },
  rookie: { id: 's6', t: 'Rookie Season', kind: 'series', y: 2022, r: 7.3, g: 'Sports', style: 'court', hue: 28 },
  tidewater: { id: 'm17', t: 'Tidewater', kind: 'movie', y: 2020, r: 7.0, g: 'Drama', style: 'waves', hue: 176 },
  velvet: { id: 'm10', t: 'Velvet Static', kind: 'movie', y: 2020, r: 6.5, g: 'Romance', style: 'waves', hue: 330 },
  // Icelandic (fictional titles)
  nordurljos: { id: 'i1', t: 'Norðurljós', kind: 'movie', y: 2023, r: 7.4, g: 'Drama', style: 'peaks', hue: 190, lang: 'IS' },
  brimid: { id: 'i2', t: 'Brimið', kind: 'series', y: 2024, r: 7.9, g: 'Crime', style: 'waves', hue: 200, lang: 'IS' },
  eftirSolarlag: { id: 'i3', t: 'Eftir sólarlag', kind: 'movie', y: 2021, r: 7.1, g: 'Drama', style: 'sun', hue: 20, lang: 'IS' },
  hrafnar: { id: 'i4', t: 'Hrafnar', kind: 'series', y: 2022, r: 8.0, g: 'Thriller', style: 'forest', hue: 150, lang: 'IS' },
  vetrarfri: { id: 'i5', t: 'Vetrarfrí', kind: 'movie', y: 2025, r: 6.9, g: 'Comedy', style: 'city', hue: 210, lang: 'IS' },
  thognin: { id: 'i6', t: 'Þögnin í dalnum', kind: 'movie', y: 2020, r: 7.6, g: 'Mystery', style: 'figure', hue: 250, lang: 'IS' },
  ljosid: { id: 'i7', t: 'Ljósið í glugganum', kind: 'movie', y: 2019, r: 7.2, g: 'Drama', style: 'lighthouse', hue: 40, lang: 'IS', sub: true },
};
const art = (t, o = {}) => Art.art(t.id, { style: t.style, hue: t.hue, ...o });

// ---------- cards ----------
/* wide card 198 x 111: art, bottom scrim, badges top-left, time top-right, title + meta at the bottom (SPEC 5.1) */
function wideCard({ title, meta, art: a, tl = '', tr = '', prog, focus = false, ch = '', crests = '', key = '', noart = '' }) {
  return `<div class="wc${focus ? ' f' : ''}${crests ? ' crest' : ''}"${key ? ` data-key="${esc(key)}"` : ''}><div class="art">${noart || a || ''}</div><div class="hs" style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(21,19,29,.28),rgba(21,19,29,0) 40%)"></div>${ch ? `<div class="ch">${ch}</div>` : ''}${tl ? `<div class="tl">${tl}</div>` : ''}${tr ? `<div class="tr n">${tr}</div>` : ''}${crests ? `<div class="crs">${crests}</div>` : ''}
      <div class="tx"><b>${title}</b><span>${meta}</span></div>${prog != null ? `<div class="prog flush"><i style="width:${prog}%"></i></div>` : ''}</div>`;
}
const contCard = (t, { ep = '', left = '', prog = 0, focus = false } = {}) => wideCard({ title: t.t, meta: ep ? `${ep}${dot}${left}` : `${t.kind === 'movie' ? 'Film' : 'Series'}${dot}${left}`, art: art(t), tl: ep ? `<span class="t-label">${ep.replace(' · ', ' ')}</span>` : '', prog, focus, key: 'p:' + t.id });
const newEpCard = (t, { ep, when, focus = false }) => wideCard({ title: t.t, meta: `${ep}${dot}${when}`, art: art(t, { crop: [40, 120, 320, 180] }), tl: `<span class="t-label">New</span>`, focus, key: 'n:' + t.id });
function replayCard({ away, home, where, prog, focus = false }) {
  return `<div class="wc${focus ? ' f' : ''} crest" data-key="p:rp:${away}${home}"><div class="art" style="background:linear-gradient(120deg,${pal(away).p} 0 48%,${pal(home).p} 52% 100%)"></div><div class="tl"><span class="t-label">NBA · Replay</span></div><div class="crs">${crest(away, 's24')}${crest(home, 's24')}</div>
      <div class="tx"><b>${NAME[away]} at ${NAME[home]}</b><span>${where}</span></div><div class="prog flush"><i style="width:${prog}%"></i></div></div>`;
}
/* channel card: the channel tile, number, LIVE when a game is on, the programme and the channel, progress (SPEC 5.4) */
function chCard({ num, name, ini, now, s, e, nowH, live = false, style, hue, focus = false, hidden = '' }) {
  const prog = Math.max(0, Math.min(100, ((nowH - s) / (e - s)) * 100));
  return wideCard({ title: hidden || now, meta: name, art: Art.art('ch' + num, { style, hue }), ch: `<span class="logo sm">${ini}</span>${live ? liveP() : ''}`, tr: String(num), prog, focus, key: 'ch:' + num });
}
/* 2:3 poster with the caption below (ui.css .pc); mine = the provider has the add-on's title too */
function poster(t, { focus = false, mine = false, prog } = {}) {
  const tl = t.q === '4K' ? tag('4K', 'q') : '';
  const tr = t.lang && t.lang !== 'EN' ? tag(t.lang) : '';
  return `<div class="pc${focus ? ' fc' : ''}" data-key="t:${t.id}"><div class="box${focus ? ' f' : ''}"><div class="art">${Art.poster(t.id, { style: t.style, hue: t.hue, title: t.t })}</div>${tl ? `<div class="tl">${tl}</div>` : ''}${tr ? `<div class="tr">${tr}</div>` : ''}${mine ? `<span class="ad-mine">${ic('tv')}</span>` : ''}${prog ? `<div class="prog flush"><i style="width:${prog}%"></i></div>` : ''}</div>
      <div class="cap">${esc(t.t)}</div><div class="cm">${t.y}${dot}${t.r ? `★ ${t.r.toFixed(1)}` : t.g}</div></div>`;
}
const endCard = (label, { wide = false, focus = false, icon = 'chevR' } = {}) => `<div class="endcard${wide ? ' w' : ''}${focus ? ' f' : ''}">${ic(icon)}<span>${label}</span></div>`;
/* game card (ui.css .gc): the app's cards.js gameCard, with the shield's hidden plate and the replay mark */
function gameCard(g, { focus = false, hidden = false, other = false } = {}) {
  const A = g.away, H = g.home;
  let st = '', plate = '';
  if (g.state === 'in') st = `${liveP()}<span>Q${g.q} ${g.clock}</span>`;
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
  return `<div class="gc${focus ? ' f' : ''}" data-key="g:${A}${H}"${other ? ' data-other="1"' : ''}><div class="st">${st}${tv}</div>
    <div class="tr${lose(awWin)}${long(A)}">${edge(A)}${crest(A)}<span class="nm">${NAME[A]}</span><span class="rc">${rec(g.ar)}</span></div>
    <div class="tr${lose(hwWin)}${long(H)}">${edge(H)}${crest(H)}<span class="nm">${NAME[H]}</span><span class="rc">${rec(g.hr)}</span></div>${plate}</div>`;
}
/* your team's next game: one card at the head of the NBA row (SPEC 4.3) */
function nextGameCard({ opp, home, day, tip, rec = '2-2', focus = false }) {
  return `<div class="gc next${focus ? ' f' : ''}" data-key="g:next"><div class="st"><span class="mine">Your team</span><span class="tvn">${day}</span></div>
    <div class="ng">${crest('MEM')}<span>${home ? 'vs' : 'at'} ${NAME[opp]}</span>${crest(opp)}</div><div class="ng"><small>${NAME[opp]} ${rec}</small></div>
    <span class="plate"><span class="x"><span class="score sm">${tip}</span><span class="t-cap">tip-off</span></span></span></div>`;
}

// ---------- rows ----------
/* A row block: title (28) + 6 + cards. Heights: wide 111, game 124, poster 186 + 52 caption. Pitch = block + 24. */
const H = { wide: 111, game: 124, poster: 238 };
function row({ title, sub = '', cards, kind = 'wide', peek = false, id = '' }, top) {
  return `<div class="hv-row" data-rail="${esc(id)}" style="top:${top}px;height:${34 + H[kind]}px"><div class="hv-rt">${title}${sub ? `<small>${sub}</small>` : ''}</div><div class="rail${peek ? ' peek' : ''}"><div class="track" data-row>${cards.join('')}</div></div></div>`;
}
/* lays rows out from y 306 (under the billboard); `lift` = index of the focused row, which is put at y 84 with the ones before it gone above */
function rows(list, { lift = -1 } = {}) {
  let y = 306; const out = []; const tops = [];
  list.forEach((r, i) => { tops.push(y); y += 34 + H[r.kind || 'wide'] + 24; });
  const dy = lift > 0 ? tops[lift] - 84 : 0;
  list.forEach((r, i) => {
    const top = tops[i] - dy;
    if (top > 540 || top + 34 + H[r.kind || 'wide'] < -10) return;   // not mounted: the app mounts the focused row and its neighbours
    const peek = top + 34 + H[r.kind || 'wide'] > 513 && i !== lift;   // a row whose cards cross the safe line shows art only
    out.push(row({ ...r, peek }, top));
  });
  return out.join('');
}

// ---------- billboards (SPEC 3) ----------
const btn = (label, { focus = false, primary = false, icon = '' } = {}) => `<span class="${primary ? 'btn' : 'btn2'}${focus ? ' f' : ''}">${icon ? ic(icon) : ''}${label}</span>`;
function bbArt(t, { poster: pst = false } = {}) {
  if (pst) return `<div class="hv-art"></div><div class="hv-grain"></div><div class="hv-pst"><div class="art">${Art.poster(t.id, { style: t.style, hue: t.hue, title: t.t })}</div></div><div class="hv-st"></div>`;
  return `<div class="hv-art">${art(t, { crop: [0, 40, 400, 125] })}</div><div class="hv-sx"></div><div class="hv-sy"></div><div class="hv-st"></div>`;
}
/* continue / up next: the title's backdrop, the eyebrow says why it is here, Resume focused */
function bbContinue({ t, ep, left, prog, kind = 'Continue watching', nofocus = false }) {
  return `<div class="hv-bb">${bbArt(t)}
  <div class="hv-col"><div class="hv-eye"><span class="t-label" style="color:var(--a-pink-text)">${kind}</span><span class="t-label t-2">${ep ? `${ep}` : 'Film'}</span></div>
    <div class="hv-title">${esc(t.t)}</div>
    <div class="hv-meta">${t.y}${dot}${t.g}${dot}${ep ? '49 min' : t.rt}${t.q ? `${dot}${tag(t.q, 'q')}` : ''}${dot}<span>${left}</span></div>
    <div class="prog hv-prog"><i style="width:${prog}%"></i></div></div>
  <div class="hv-btns">${btn('Resume', { primary: true, icon: 'play', focus: !nofocus })}${btn('Start over')}${btn('Details')}</div></div>`;
}
/* discover: a title he has not seen, with its line, Play · Details · Save (SPEC 3.4) */
function bbDiscover({ t, why, nofocus = false, pst = false, first = false }) {
  return `<div class="hv-bb">${bbArt(t, { poster: pst })}
  <div class="hv-col"><div class="hv-eye"><span class="t-label" style="color:var(--a-pink-text)">${first ? 'Popular this week' : 'Top pick for you'}</span><span class="t-label t-2">${why}</span></div>
    <div class="hv-title">${esc(t.t)}</div>
    <div class="hv-meta"><span class="star">${ic('star')}${t.r.toFixed(1)}</span>${dot}${t.y}${dot}${t.g}${dot}${t.rt || 'Series'}${t.q ? `${dot}${tag(t.q, 'q')}` : ''}${t.lang === 'IS' ? `${dot}${tag('IS')}` : ''}</div>
    <div class="hv-plot">${esc(t.plot || '')}</div></div>
  <div class="hv-btns">${btn('Play', { primary: true, icon: 'play', focus: !nofocus })}${btn('Details')}${btn('Save')}<span class="t-cap">${first ? 'From your provider' : 'Also from Cinemeta'}</span></div></div>`;
}
/* game: the broadcast lower-third on the canvas, the slab off the right edge (SPEC 3.2) */
function bbGame({ away, home, state, aw, hw, q, clock, ar, hr, shield = false, tipIn, tip, channel, feeds = 0, replay = false, kept = '', synced = '42', nofocus = false, behind = false }) {
  const side = (a, r, rec) => `<div class="side${r ? ' r' : ''}" style="${tvars(a)}">${r ? '' : crest(a, 'xl')}<div${r ? ' style="text-align:right"' : ''}><div class="nm">${NAME[a]}</div><div class="rc">${rec}</div></div>${r ? crest(a, 'xl') : ''}</div>`;
  const mine = '<span class="t-label" style="color:var(--a-pink-text)">Your team</span>';
  let status, score, btns, cap = '', big, small;
  if (state === 'pre') {
    status = `${mine}<span class="t-label t-2">NBA${dot}Tip-off</span>`;
    score = '<span class="score md">VS</span>';
    btns = [btn('Watch pre-game', { primary: true, icon: 'play', focus: !nofocus }), btn('Game page')];
    cap = `${tipIn}<br>${channel}`;
    big = [tipIn.replace('In ', '').replace(' min', ' MIN'), '']; small = `Tip-off ${tip}`;
  } else if (state === 'in') {
    status = `${mine}${liveP()}<span class="t-label t-2">NBA${replay ? `${dot}${esc(channel)}` : ''}</span>${!shield ? `<span class="synced">${ic('clock')}Synced · ${synced} s</span>` : ''}`;
    score = shield ? `<span class="shield">${ic('eyeOff')}<span>Score hidden</span></span>` : `<span class="score">${aw}</span><span class="t-3" style="font:700 24px var(--a-font-display)">–</span><span class="score">${hw}</span>`;
    btns = [btn('Watch live', { primary: true, icon: 'play', focus: !nofocus }), replay ? btn('From tip-off', { icon: 'tipoff' }) : '', btn(shield ? 'Reveal score' : 'Box score')];
    cap = replay ? '' : `On ${channel}${feeds > 1 ? `<br>Hold OK for ${feeds - 1} more channel${feeds > 2 ? 's' : ''}` : ''}`;
    big = shield ? ['ON NOW', ''] : [`Q${q}`, clock]; small = shield ? 'Score hidden' : 'Live · synced';
  } else if (replay) {   // the morning after: final, hidden, a replay exists
    status = `${mine}<span class="t-label t-2">NBA${dot}Mon 26 Oct${dot}late</span>`;
    score = `<span class="shield">${ic('eyeOff')}<span>Score hidden</span></span>`;
    btns = [btn('Watch from tip-off', { primary: true, icon: 'play', focus: !nofocus }), btn('Game page')];
    cap = `${channel}<br>${kept}`;
    big = ['REPLAY', '']; small = 'Score hidden';
  }
  return `<div class="hv-bb"><div class="hv-grain"></div><div class="hv-st"></div>
  <div class="hv-status">${status}</div>
  <div class="hv-mtbox"><div class="hv-mt">${side(away, 0, shield || replay ? partial(ar) : ar)}<div class="sc">${score}</div>${side(home, 1, shield || replay ? partial(hr) : hr)}</div></div>
  <div class="hv-btns">${btns.join('')}${cap ? `<span class="t-cap">${cap}</span>` : ''}</div>
  <div class="hv-slab slabbox"><div class="slabfill"></div><div class="slabcontent ink"><span class="big">${big[0]}</span>${big[1] ? `<span class="big">${big[1]}</span>` : ''}<span class="cap">${small}</span></div></div></div>`;
}

// ---------- the scenario's rows ----------
const NOWH = (h, m) => h + m / 60;
const CH = (nowH) => ({
  lp4: chCard({ num: 4, name: 'NBA League Pass 4', ini: 'NL', now: 'Grizzlies at Jazz', s: 0.75, e: 3.5, nowH, live: true, style: 'arena', hue: 28 }),
  lp4m: chCard({ num: 4, name: 'NBA League Pass 4', ini: 'NL', now: 'NBA Gametime', s: 10, e: 11, nowH, style: 'studio', hue: 268, hidden: `<span class="cu-may">${eyeSm}May show results</span>` }),
  lp4e: chCard({ num: 4, name: 'NBA League Pass 4', ini: 'NL', now: 'Pelicans at Nuggets', s: 20.5, e: 23, nowH, style: 'arena', hue: 28 }),
  espn: chCard({ num: 12, name: 'ESPN', ini: 'ES', now: 'SportsCenter', s: 20, e: 21, nowH, style: 'studio', hue: 212 }),
  nbatv: chCard({ num: 33, name: 'NBA TV', ini: 'NT', now: 'Game Time', s: 20, e: 21, nowH, style: 'studio', hue: 268 }),
  ruv: chCard({ num: 501, name: 'RÚV', ini: 'RÚ', now: 'Kastljós', s: 20, e: 20.75, nowH, style: 'studio', hue: 200 }),
  sky: chCard({ num: 118, name: 'Sky Sports Main Event', ini: 'SS', now: 'Premier League: Live', s: 20, e: 22.25, nowH, live: true, style: 'pitch', hue: 132 }),
  bbc: chCard({ num: 101, name: 'BBC One', ini: 'BO', now: 'Panorama', s: 20.5, e: 21, nowH, style: 'studio', hue: 300 }),
  tnt: chCard({ num: 31, name: 'TNT Sports 1', ini: 'TS', now: 'Lakers at Suns', s: 2, e: 4.5, nowH, live: true, style: 'arena', hue: 18 }),
  stod2: chCard({ num: 502, name: 'Stöð 2', ini: 'S2', now: 'Fréttir', s: 20.5, e: 21, nowH, style: 'studio', hue: 320 }),
});
const CONT = (o = {}) => [
  contCard(T.nightCircuit, { ep: 'S1 · E3', left: '21 min left', prog: 58, focus: o.focus === 0 }),
  contCard(T.longTake, { left: '1h 17m left', prog: 28, focus: o.focus === 1 }),
  replayCard({ away: 'MEM', home: 'SAC', where: 'Stopped in Q3', prog: 61, focus: o.focus === 2 }),
  contCard(T.saltStatic, { left: '18 min left', prog: 82 }),
  contCard(T.signalHill, { ep: 'S3 · E2', left: '44 min left', prog: 12 }),
  contCard(T.glassOrchard, { left: '1h 52m left', prog: 6 }),
];
const CONT_NOHERO = (o = {}) => CONT(o).slice(1);   // the billboard's own title is not repeated in the row
const NEWEPS = (o = {}) => [
  newEpCard(T.signalHill, { ep: 'S3 · E8', when: 'Added today', focus: o.focus === 0 }),
  newEpCard(T.copperFalls, { ep: 'S4 · E3', when: 'Yesterday' }),
  newEpCard(T.deepField, { ep: 'S1 · E6', when: 'Mon' }),
  newEpCard(T.rookie, { ep: 'S2 · E11', when: 'Sun' }),
  newEpCard(T.brimid, { ep: 'S1 · E4', when: 'Sat' }),
];
const BECAUSE = (o = {}) => [poster(T.deepField, { focus: o.focus === 0, mine: true }), poster(T.lowOrbit), poster(T.quietFreq), poster(T.deadAir), poster(T.midnightRelay), poster(T.coldHarbour), poster(T.cartographer), endCard('See all')];
const PICKS = (o = {}) => [poster(T.harbor, { focus: o.focus === 0, mine: true }), poster(T.paperMoons, { mine: true }), poster(T.cartographer), poster(T.northbound, { mine: true }), poster(T.understudy), poster(T.deepField, { mine: true }), poster(T.glassOrchard), endCard('See all')];
const NEWPROV = (o = {}) => [poster(T.emberRun, { focus: o.focus === 0 }), poster(T.deadAir), poster(T.understudy), poster(T.midnightRelay), poster(T.coldHarbour), poster(T.velvet), poster(T.tidewater), endCard('214 more')];
const FOURK = (o = {}) => [poster(T.harbor, { focus: o.focus === 0 }), poster(T.paperMoons), poster(T.midnightRelay), poster(T.lowOrbit), poster(T.emberRun), poster(T.deepField), poster(T.nightCircuit), endCard('See all')];
const ICE = (o = {}) => [poster(T.brimid, { focus: o.focus === 0 }), poster(T.nordurljos), poster(T.hrafnar), poster(T.eftirSolarlag), poster(T.thognin), poster(T.vetrarfri), poster(T.ljosid), endCard('See all')];
const SAVED = (o = {}) => [poster(T.northbound, { focus: o.focus === 0 }), poster(T.rookie), poster(T.quietFreq), poster(T.paperMoons), poster(T.hrafnar), poster(T.tidewater), endCard('Saved')];
const SERIES_START = (o = {}) => [poster(T.nightCircuit, { focus: o.focus === 0 }), poster(T.signalHill), poster(T.deepField), poster(T.copperFalls), poster(T.brimid), poster(T.hrafnar), poster(T.rookie), endCard('See all')];

// the 26 Oct slate (real pairings from nba-pages/data.json; clocks and scores illustrative)
const G = {
  // 01:52 Tue: the Jazz game is live (Q2); the 23:00 / 23:30 games are over, the west-coast games start at 02:00 / 02:30
  night: [
    { away: 'LAL', home: 'PHX', state: 'in', q: 1, clock: '9:41', aw: 12, hw: 15, ar: '2-1', hr: '1-2', tv: 'TNT Sports 1' },
    { away: 'DEN', home: 'OKC', state: 'pre', in: 'In 38 min', tip: '02:30', ar: '3-0', hr: '2-1', tv: 'NBA League Pass' },
    { away: 'WSH', home: 'CHA', state: 'post', aw: 98, hw: 104, ar: '2-2', hr: '3-1', tv: 'NBA League Pass' },
    { away: 'MIN', home: 'CLE', state: 'post', aw: 111, hw: 102, ar: '4-0', hr: '1-2', tv: 'NBA League Pass' },
    { away: 'CHI', home: 'BOS', state: 'post', aw: 101, hw: 109, ar: '1-3', hr: '2-1', tv: 'NBA League Pass' },
  ],
  // 10:40 Tue: last night, all final; the Jazz game hidden
  morning: [
    { away: 'MEM', home: 'UTAH', state: 'post', ar: '3-0', hr: '1-2', tv: 'NBA League Pass 4', replay: true, hidden: true },
    { away: 'LAL', home: 'PHX', state: 'post', aw: 108, hw: 112, ar: '2-2', hr: '2-2', tv: 'TNT Sports 1', replay: true },
    { away: 'DEN', home: 'OKC', state: 'post', aw: 120, hw: 117, ot: true, ar: '4-0', hr: '2-2', tv: 'NBA League Pass', replay: true },
    { away: 'WSH', home: 'CHA', state: 'post', aw: 98, hw: 104, ar: '2-2', hr: '3-1', tv: 'NBA League Pass' },
    { away: 'MIN', home: 'CLE', state: 'post', aw: 111, hw: 102, ar: '4-0', hr: '1-2', tv: 'NBA League Pass' },
  ],
  // 20:41 Wed: tonight's games haven't started; the Grizzlies play Thursday
  evening: [
    { away: 'NO', home: 'DEN', state: 'pre', in: 'In 2h 19m', tip: '23:00', ar: '1-3', hr: '4-0', tv: 'NBA League Pass 4' },
    { away: 'MIA', home: 'NY', state: 'pre', in: 'In 2h 19m', tip: '23:00', ar: '2-2', hr: '3-1', tv: 'ESPN' },
    { away: 'DAL', home: 'HOU', state: 'pre', in: 'In 2h 49m', tip: '23:30', ar: '2-2', hr: '3-1', tv: 'NBA League Pass' },
    { away: 'POR', home: 'SAC', state: 'pre', in: 'In 5h 19m', tip: '02:00', ar: '1-3', hr: '2-2', tv: 'NBA League Pass' },
  ],
};
const gameRow = (list, { focus = -1, hiddenMine = false } = {}) => list.map((g, i) => gameCard(g, { focus: i === focus, hidden: !!g.hidden, other: !g.hidden && hiddenMine }));

// ---------- the pages ----------
const ctxMenu = (items, { left, top }) => `<div class="ctxmenu" style="left:${left}px;top:${top}px"><div data-col>${items.map(([icon, label], i) => `<div class="lr${i === 0 ? ' f-ring' : ''}">${ic(icon, 'sm')}<span class="grow">${label}</span></div>`).join('')}</div></div>`;

// 1. Game night: Tue 27 Oct 01:52, Grizzlies at Jazz live in Q2. He is watching it (the shield's reveal), so the score shows.
{
  const nowH = NOWH(1, 52), C = CH(nowH);
  const body = `${topbar('home', { nbaLive: true })}
${bbGame({ away: 'MEM', home: 'UTAH', state: 'in', aw: 48, hw: 51, q: 2, clock: '4:12', ar: '3-0', hr: '1-2', channel: 'NBA League Pass 4', feeds: 3, replay: true, synced: '38' })}
<div class="hv-page">${rows([
    { id: 'cont', title: 'Continue watching', cards: CONT(), kind: 'wide' },
    { id: 'nba', title: 'Tonight in the NBA', sub: '1 live · 1 later · 3 final', cards: gameRow(G.night), kind: 'game' },
    { id: 'neweps', title: 'New in your shows', cards: NEWEPS(), kind: 'wide' },
  ])}</div><div class="hv-edge"></div>`;
  page('home-live.html', 'Game night: your team is live', body, 'Tue 27 Oct 01:52. Grizzlies at Jazz in Q2 and he is watching it (so the score shows). The billboard is the broadcast lower-third: plates, score, Watch live focused, From tip-off, the clock on the slab. Continue watching first, Tonight in the NBA under it, the rest below.');
}
// 1b. Pre-game: 00:11, tip-off at 01:00
{
  const body = `${topbar('home')}
${bbGame({ away: 'MEM', home: 'UTAH', state: 'pre', ar: '3-0', hr: '1-2', tipIn: 'In 49 min', tip: '01:00', channel: 'NBA League Pass 4' })}
<div class="hv-page">${rows([
    { id: 'cont', title: 'Continue watching', cards: CONT(), kind: 'wide' },
    { id: 'nba', title: 'Tonight in the NBA', sub: '2 later · 3 final', cards: gameRow([{ ...G.night[0], state: 'pre', in: 'In 1h 49m', tip: '02:00' }, G.night[1], ...G.night.slice(2)]), kind: 'game' },
    { id: 'neweps', title: 'New in your shows', cards: NEWEPS(), kind: 'wide' },
  ])}</div><div class="hv-edge"></div>`;
  page('home-pre.html', 'Before tip-off', body, 'Tue 27 Oct 00:11, 49 minutes to tip-off. VS between the plates, the minutes on the slab (the time is shown once), Watch pre-game focused.');
}
// 2. The morning after: Tue 27 Oct 10:40, shield My team, the Jazz game unseen with a replay (catch-up 5.1).
{
  const nowH = NOWH(10, 40), C = CH(nowH);
  const body = `${topbar('home')}
${bbGame({ away: 'MEM', home: 'UTAH', state: 'post', ar: '3-0', hr: '1-2', replay: true, channel: 'NBA League Pass 4', kept: 'Replays for 3 days' })}
<div class="hv-page">${rows([
    { id: 'cont', title: 'Continue watching', cards: CONT(), kind: 'wide' },
    { id: 'nba', title: 'Last night in the NBA', sub: '5 final', cards: gameRow(G.morning, { hiddenMine: true }), kind: 'game' },
    { id: 'neweps', title: 'New in your shows', cards: NEWEPS(), kind: 'wide' },
    { id: 'because', title: 'Because you watched Night Circuit', cards: BECAUSE(), kind: 'poster' },
  ])}</div><div class="hv-edge"></div>`;
  page('home-morning.html', 'The morning after', body, 'Tue 27 Oct 10:40, shield My team. Last night\'s game is unseen and kept: Watch from tip-off is focused, no score, records only up to the seen games. In the NBA row the Grizzlies card is hidden (Ended, no plate); the other finals show (My team rule).', { shield: true });
}
// 3. A normal evening: Wed 28 Oct 20:41, no game; continue an episode, then discover.
const EVENING_ROWS = (o = {}) => [
  { id: 'cont', title: 'Continue watching', cards: CONT_NOHERO(o.cont), kind: 'wide' },
  { id: 'nba', title: 'Tonight in the NBA', sub: '4 later', cards: [nextGameCard({ opp: 'LAL', home: true, day: 'Thu', tip: '23:30', focus: o.nba?.focus === 0 }), ...gameRow(G.evening)], kind: 'game' },
  { id: 'neweps', title: 'New in your shows', cards: NEWEPS(o.neweps), kind: 'wide' },
  { id: 'because', title: 'Because you watched Night Circuit', cards: BECAUSE(o.because), kind: 'poster' },
  { id: 'picks', title: 'Top picks for you', sub: 'Popular this week · English first', cards: PICKS(o.picks), kind: 'poster' },
  { id: 'newprov', title: 'New on your provider', sub: 'Last 14 days', cards: NEWPROV(o.newprov), kind: 'poster' },
  { id: '4k', title: 'In 4K', sub: 'Checked copies', cards: FOURK(o.fourk), kind: 'poster' },
  { id: 'is', title: 'Á íslensku', sub: 'Icelandic, or with Icelandic subtitles', cards: ICE(o.ice), kind: 'poster' },
  { id: 'saved', title: 'Saved for later', cards: SAVED(o.saved), kind: 'poster' },
  { id: 'channels', title: 'Channels', sub: 'Favourites and recent', cards: (() => { const C = CH(NOWH(20, 41)); return [C.lp4e, C.espn, C.nbatv, C.ruv, C.sky, C.bbc, C.stod2]; })(), kind: 'wide' },
];
{
  const body = `${topbar('home')}
${bbContinue({ t: T.nightCircuit, ep: 'S1 · E3 · Night Circuit', left: '21 min left', prog: 58 })}
<div class="hv-page">${rows(EVENING_ROWS())}</div><div class="hv-edge"></div>`;
  page('home-evening.html', 'A normal evening', body, 'Wed 28 Oct 20:41, no Grizzlies game. The billboard is the episode he is in the middle of (its backdrop, Resume focused). Continue watching first (the billboard\'s own title not repeated), then Tonight in the NBA led by the Grizzlies\' next game, then New in your shows.');
}
// 4. Scrolled: Because you watched is focused (row 4), bar away, context line, the rows above gone
{
  const body = `${topbar('home', { away: true })}<div class="hv-cover"></div><div class="ctxline">Home${dot}Because you watched</div>
<div class="hv-page">${rows(EVENING_ROWS({ because: { focus: 0 } }), { lift: 3 })}</div><div class="hv-edge"></div>`;
  page('home-scrolled.html', 'A row in focus mid-page', body, 'Down three times from Continue watching: the page lifts so the focused row\'s title sits at y 84, the bar steps away (Back brings it back), the next rows peek below. Posters carry the [tv] mark when the provider has the add-on\'s title too.');
}
// 4b. Further down: the Channels row at the bottom, the last thing on Home
{
  const body = `${topbar('home', { away: true })}<div class="hv-cover"></div><div class="ctxline">Home${dot}Channels</div>
<div class="hv-page">${rows(EVENING_ROWS({ saved: {}, }).map((r) => r.id === 'channels' ? { ...r, cards: (() => { const C = CH(NOWH(20, 41)); return [chCard({ num: 4, name: 'NBA League Pass 4', ini: 'NL', now: 'Pelicans at Nuggets', s: 20.5, e: 23, nowH: NOWH(20, 41), style: 'arena', hue: 28, focus: true }), C.espn, C.nbatv, C.ruv, C.sky, C.bbc, C.stod2]; })() } : r), { lift: 9 })}</div>`;
  page('home-channels.html', 'The channels, at the bottom', body, 'The last row: favourites first, then the channels he watched lately (the old On now, folded low as he asked). Nothing peeks below it: Down stops here.');
}
// 5. Discover: Sat 31 Oct 21:10, nothing in progress for 7 days: a top pick with its line
{
  const body = `${topbar('home')}
${bbDiscover({ t: T.harbor, why: 'Thriller · from your add-ons' })}
<div class="hv-page">${rows([
    { id: 'nba', title: 'Tonight in the NBA', sub: '4 later', cards: [nextGameCard({ opp: 'DEN', home: false, day: 'Sun', tip: '01:00' }), ...gameRow(G.evening)], kind: 'game' },
    { id: 'picks', title: 'Top picks for you', sub: 'Popular this week · English first', cards: PICKS(), kind: 'poster' },
    { id: 'neweps', title: 'New in your shows', cards: NEWEPS(), kind: 'wide' },
  ])}</div><div class="hv-edge"></div>`;
  page('home-discover.html', 'Nothing to continue: a top pick', body, 'Sat 31 Oct 21:10. Nothing in progress for 7 days, so the billboard is the day\'s top pick (Popular, his languages, unseen, the add-on\'s backdrop and line). Play focused, Details, Save; the pick changes once a day, never under his thumb.');
}
// 6. First start: nothing watched yet
{
  const body = `${topbar('home')}
${bbDiscover({ t: T.paperMoons, why: 'Animation · 4,812 films on your provider', first: true, pst: true })}
<div class="hv-page">${rows([
    { id: 'picks', title: 'Top picks for you', sub: 'Popular this week · English first', cards: PICKS(), kind: 'poster' },
    { id: 'nba', title: 'Tonight in the NBA', sub: '4 later', cards: [nextGameCard({ opp: 'LAL', home: true, day: 'Thu', tip: '23:30' }), ...gameRow(G.evening)], kind: 'game' },
    { id: 'series', title: 'Series to start', cards: SERIES_START(), kind: 'poster' },
  ])}</div><div class="hv-edge"></div>`;
  page('home-first.html', 'First start', body, 'Signed in a minute ago, nothing watched. The billboard is Popular\'s first title in his languages with the provider\'s poster (no backdrop yet: the poster stands upright on the canvas). No Continue watching, no Because you watched; Top picks first, the NBA, Series to start, then New on your provider and Channels below.');
}
// 7. Hold OK on a Continue watching card
{
  const body = `${topbar('home')}
${bbContinue({ t: T.nightCircuit, ep: 'S1 · E3 · Night Circuit', left: '21 min left', prog: 58, nofocus: true })}
<div class="hv-page">${rows(EVENING_ROWS({ cont: { focus: 0 } }))}</div><div class="hv-edge"></div>
${ctxMenu([['play', 'Resume'], ['restart', 'Start over'], ['info', 'Details'], ['check', 'Mark watched'], ['close', 'Remove from Home']], { left: 270, top: 212 })}`;
  page('home-card-menu.html', 'Hold OK on a card', body, 'Hold OK on The Long Take: Resume first and focused, Start over, Details, Mark watched, Remove from Home (it leaves Continue watching; the title stays in History). A poster\'s menu is Save to Saved · Details · Not interested.');
}
// 8. Offline with a cache: Home as airglow last saw it, one slim bar
{
  const body = `${topbar('home')}
${bbContinue({ t: T.nightCircuit, ep: 'S1 · E3 · Night Circuit', left: '21 min left', prog: 58 })}
<div class="hv-page">${rows(EVENING_ROWS().map((r) => r.id === 'nba' ? { ...r, sub: 'As of 20:12', cards: [nextGameCard({ opp: 'LAL', home: true, day: 'Thu', tip: '23:30' }), ...gameRow(G.evening)] } : r).filter((r) => r.id !== 'neweps'))}</div><div class="hv-edge"></div>
<div class="offline-bar">${ic('wifiOff')}<b>Offline</b>${dot}showing what airglow remembers</div>`;
  page('home-offline.html', 'Offline, with a cache', body, 'The provider does not answer: Home is drawn from what airglow kept (the billboard, Continue watching, the last slate marked "As of 20:12", the catalog rows). No LIVE pills, no clocks; New in your shows is left out (it needs the provider). One slim bar, never focusable.');
}
// 9. Account > Home rows
{
  const rowsList = [['Continue watching', true, 'Always first', true], ['Tonight in the NBA', true, 'Your team\'s next game, then tonight\'s games'], ['New in your shows', true, 'New episodes of shows you watch or saved'], ['Because you watched', true, 'Like the last title you finished'], ['Top picks for you', true, 'Popular this week in your languages, unseen'], ['New on your provider', true, 'Added in the last 14 days'], ['In 4K', true, 'Copies airglow has checked'], ['Á íslensku', true, 'Icelandic, or with Icelandic subtitles'], ['Saved for later', false, 'Saved titles you have not started'], ['Channels', true, 'Favourites and recent, at the bottom']];
  const arow = (i, [t, on, sub, pin], f) => `<div class="arow${f ? ' f-ring' : ''}${pin ? ' pin' : ''}${on ? '' : ' off'}"><span class="grip"><i></i><i></i><i></i></span><span class="n">${i + 1}</span><span class="grow" style="min-width:0">${t}<div class="t-cap" style="margin-top:0">${sub}</div></span><span class="av"><span class="onoff">${on ? 'On' : 'Off'}</span><span class="tg${on ? ' on' : ''}"><i></i></span></span></div>`;
  const groups = ['Provider', 'Add-ons', 'Playback', 'Sound', 'NBA', 'Languages', 'Home rows', 'Updates', 'About'];
  const body = `${topbar('account')}
<div class="abs" style="left:48px;top:80px;width:200px;display:flex;flex-direction:column;gap:4px">${groups.map((g) => `<div class="gl${g === 'Home rows' ? ' sel' : ''}">${g}</div>`).join('')}</div>
<div class="abs hv-set" style="left:272px;top:80px;width:640px"><div class="t-title" style="margin-bottom:10px">Home rows</div>
<div class="arow"><span class="grow" style="min-width:0">Your team first<div class="t-cap" style="margin-top:0">On game days your team's game is the big card on Home</div></span><span class="av"><span class="onoff">On</span><span class="tg on"><i></i></span></span></div>
<div style="height:2px"></div>
<div class="t-label" style="margin:6px 0 8px 4px">Rows, in order</div>
${rowsList.slice(0, 4).map((r, i) => arow(i, r, i === 3)).join('')}
<div class="hv-hint">${ic('info', 'sm')}OK turns a row off or on${dot}Hold OK moves it${dot}4 of 10</div></div>`;
  page('home-rows-setting.html', 'Account: Home rows', body, 'Every row with its toggle and its place. OK turns a row off or on; hold OK lifts it and ▲▼ move it (the Saved page\'s reorder). Continue watching is pinned first (no grip). The list scrolls: 10 rows, 4 on screen.');
}

fs.writeFileSync(path.join(root, 'tools', 'pages.json'), JSON.stringify(pages, null, 1) + '\n');
console.log(pages.length + ' pages');
