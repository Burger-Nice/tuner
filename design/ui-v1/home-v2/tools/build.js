// node tools/build.js   -> writes the Home v2 mocks (*.html) next to SPEC.md, and tools/pages.json.
// Every mock is the 960 x 540 canvas linking the app's real CSS (tokens, ui.css, app.css, nba.css, catchup.css) plus
// home-v2.css. Focus is marked with the kit classes: .f (ring + lift), .f-ring (ring only).
// The scenario (SPEC 0): the owner's TV, Reykjavik time (UTC all year), shield My team, languages Icelandic then English.
// The 26 Oct 2026 slate is the real one (nba-pages/data.json); the other nights, the clocks, the provider's channels,
// guide and titles are stand-ins (the kit's fictional titles and procedural art). Only data the app has is drawn:
// backdrops come from Cinemeta / TMDB (SPEC 9), channel cards carry the provider's logo tile, never art.
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
const TC = { MEM: ['#5D76A9', '#F5B112'], UTAH: ['#002B5C', '#F9A01B'], LAL: ['#552583', '#FDB927'], PHX: ['#1D1160', '#E56020'], DEN: ['#0E2240', '#FEC524'], OKC: ['#007AC1', '#EF3B24'], WSH: ['#002B5C', '#E31837'], CHA: ['#1D1160', '#00788C'], MIN: ['#0C2340', '#78BE20'], CLE: ['#860038', '#FDBB30'], CHI: ['#CE1141', '#FFFFFF'], BOS: ['#007A33', '#BA9653'], DAL: ['#00538C', '#B8C4CA'], HOU: ['#CE1141', '#C4CED4'], SAC: ['#5A2D81', '#63727A'], GS: ['#1D428A', '#FFC72C'], MIA: ['#98002E', '#F9A01B'], MIL: ['#00471B', '#EEE1C6'], NY: ['#006BB6', '#F58426'], POR: ['#E03A3E', '#000000'], SA: ['#C4CED4', '#000000'], LAC: ['#C8102E', '#1D428A'], NO: ['#0C2340', '#C8102E'], DET: ['#C8102E', '#1D42BA'], ORL: ['#0077C0', '#C4CED4'], ATL: ['#E03A3E', '#C1D32F'], TOR: ['#CE1141', '#000000'], IND: ['#002D62', '#FDBB30'], PHI: ['#006BB6', '#ED174C'], BKN: ['#000000', '#FFFFFF'] };
const NAME = { MEM: 'Grizzlies', UTAH: 'Jazz', LAL: 'Lakers', PHX: 'Suns', DEN: 'Nuggets', OKC: 'Thunder', WSH: 'Wizards', CHA: 'Hornets', MIN: 'Timberwolves', CLE: 'Cavaliers', CHI: 'Bulls', BOS: 'Celtics', DAL: 'Mavericks', HOU: 'Rockets', SAC: 'Kings', GS: 'Warriors', MIA: 'Heat', MIL: 'Bucks', NY: 'Knicks', POR: 'Trail Blazers', SA: 'Spurs', LAC: 'Clippers', NO: 'Pelicans', DET: 'Pistons', ORL: 'Magic', ATL: 'Hawks', TOR: 'Raptors', IND: 'Pacers', PHI: '76ers', BKN: 'Nets' };
const lin = (x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (v) => '#' + v.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
const lum = (h) => { const [r, g, b] = rgb(h).map((v) => lin(v / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const CHALK = '#F3EFE6', INK = '#14101F', BG1 = '#1E1B28';
const darken = (h, f) => hex(rgb(h).map((v) => v * f));
const mix = (a, b, t) => hex(rgb(a).map((v, i) => v * (1 - t) + rgb(b)[i] * t));
function pal(a) {
  let [p, s] = TC[a]; let f = 1;
  while (Math.max(ratio(lum(CHALK), lum(p)), ratio(lum(INK), lum(p))) < 4.5 && f > 0.4) { f -= 0.04; p = darken(TC[a][0], f); }
  return { p, a: s, fg: ratio(lum(CHALK), lum(p)) >= ratio(lum(INK), lum(p)) ? CHALK : INK };
}
/* the billboard's team field (SPEC 3.2): the real primary at 55 % over bg-1, darkened until chalk reads at 4.5:1 or better */
function field(a) { let c = mix(BG1, TC[a][0], 0.55), f = 1; while (ratio(lum(CHALK), lum(c)) < 4.5 && f > 0.3) { f -= 0.04; c = darken(mix(BG1, TC[a][0], 0.55), f); } return c; }
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
function page(file, title, body, note, { group = 'Home', shield = true, et = '2026-10-26', meta = '' } = {}) {
  fs.writeFileSync(path.join(root, file), `<!doctype html>
<html lang="en" class="tv"><head><meta charset="utf-8"><meta name="viewport" content="width=960,height=540"><meta name="mock-size" content="960x540@2">${shield ? `\n<meta name="shield" content="unseen"><meta name="hidden-et" content="${et}">` : ''}${meta}
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
  nordurljos: { id: 'i1', t: 'Norðurljós', kind: 'movie', y: 2023, r: 7.4, g: 'Drama', style: 'peaks', hue: 190, lang: 'IS' },
  brimid: { id: 'i2', t: 'Brimið', kind: 'series', y: 2024, r: 7.9, g: 'Crime', style: 'waves', hue: 200, lang: 'IS' },
  eftirSolarlag: { id: 'i3', t: 'Eftir sólarlag', kind: 'movie', y: 2021, r: 7.1, g: 'Drama', style: 'sun', hue: 20, lang: 'IS' },
  hrafnar: { id: 'i4', t: 'Hrafnar', kind: 'series', y: 2022, r: 8.0, g: 'Thriller', style: 'forest', hue: 150, lang: 'IS' },
  vetrarfri: { id: 'i5', t: 'Vetrarfrí', kind: 'movie', y: 2025, r: 6.9, g: 'Comedy', style: 'city', hue: 210, lang: 'IS' },
  thognin: { id: 'i6', t: 'Þögnin í dalnum', kind: 'movie', y: 2020, r: 7.6, g: 'Mystery', style: 'figure', hue: 250, lang: 'IS' },
  ljosid: { id: 'i7', t: 'Ljósið í glugganum', kind: 'movie', y: 2019, r: 7.2, g: 'Drama', style: 'lighthouse', hue: 40, lang: 'IS' },
};
const art = (t, o = {}) => Art.art(t.id, { style: t.style, hue: t.hue, ...o });
const tint = (t) => `--amb:hsl(${t.hue} 42% 24%);--amb2:hsl(${t.hue} 36% 14%)`;
const still = (t) => art(t, { crop: [40, 120, 320, 180] });   // an episode still (Cinemeta thumbnail) is a different frame than the backdrop

// ---------- cards (SPEC 5) ----------
/* wide card 198 x 111: art, bottom scrim, a label top-left only for NEW / REPLAY, the number top-right on a channel, title + one meta line */
function wideCard({ title, meta, art: a = '', tl = '', tr = '', prog, focus = false, ch = '', crests = '', key = '', cls = '', pst = '' }) {
  return `<div class="wc${focus ? ' f' : ''}${crests ? ' crest' : ''}${cls ? ' ' + cls : ''}"${key ? ` data-key="${esc(key)}"` : ''}>${pst ? `<div class="pl">${pst}</div>` : `<div class="art">${a}</div>`}${ch ? `<div class="ch">${ch}</div>` : ''}${tl ? `<div class="tl">${tl}</div>` : ''}${tr ? `<div class="tr n">${tr}</div>` : ''}${crests ? `<div class="crs">${crests}</div>` : ''}
      <div class="tx"><b>${title}</b><span>${meta}</span></div>${prog != null ? `<div class="prog flush"><i style="width:${prog}%"></i></div>` : ''}</div>`;
}
/* continue: the backdrop (Cinemeta / TMDB); without one, the poster upright at the left and the title beside it (SPEC 5.1) */
const contCard = (t, { ep = '', epName = '', left = '', prog = 0, focus = false, noBackdrop = false } = {}) => wideCard({
  title: t.t, meta: ep ? `${ep}${epName ? `${dot}“${epName}”` : ''}${dot}${left}` : `${t.kind === 'movie' ? 'Film' : 'Series'}${dot}${left}`,
  art: noBackdrop ? '' : art(t), pst: noBackdrop ? `<div class="art">${Art.poster(t.id, { style: t.style, hue: t.hue, title: t.t })}</div>` : '', prog, focus, key: 'p:' + t.id, cls: noBackdrop ? 'pst' : '',
});
const newEpCard = (t, { ep, when, focus = false }) => wideCard({ title: t.t, meta: `${ep}${dot}${when}`, art: still(t), tl: `<span class="t-label">New</span>`, focus, key: 'n:' + t.id });
function replayCard({ away, home, where, prog, focus = false }) {
  return `<div class="wc${focus ? ' f' : ''} crest" data-key="p:rp:${away}${home}"><div class="art" style="background:linear-gradient(120deg,${pal(away).p} 0 48%,${pal(home).p} 52% 100%)"></div><div class="tl"><span class="t-label">NBA · Replay</span></div><div class="crs">${crest(away, 's24')}${crest(home, 's24')}</div>
      <div class="tx"><b>${NAME[away]} at ${NAME[home]}</b><span>${where}</span></div><div class="prog flush"><i style="width:${prog}%"></i></div></div>`;
}
/* channel card: no art exists for a live channel (the Xtream short EPG has none), so the card is the provider's logo tile on surface-2;
   a channel carrying a game gets the two teams' colours and crests (data the app has) */
function chCard({ num, name, ini, now, s, e, nowH, live = false, focus = false, hidden = '', game = null }) {
  const prog = Math.max(0, Math.min(100, ((nowH - s) / (e - s)) * 100));
  const field = game ? `<div class="art" style="background:linear-gradient(120deg,${pal(game[0]).p} 0 48%,${pal(game[1]).p} 52% 100%)"></div>` : `<div class="art chf"></div>`;
  return `<div class="wc chc${focus ? ' f' : ''}${game ? ' crest' : ''}" data-key="ch:${num}">${field}<div class="ch"><span class="logo">${ini}</span>${live ? liveP() : ''}</div><div class="tr n">${num}</div>${game ? `<div class="crs">${crest(game[0], 's24')}${crest(game[1], 's24')}</div>` : ''}
      <div class="tx"><b>${hidden || now}</b><span>${name}</span></div><div class="prog flush"><i style="width:${prog}%"></i></div></div>`;
}
/* 2:3 poster with the caption below (ui.css .pc); mine = the provider has the add-on's title too; named = a 4K that only the name says (dashed) */
function poster(t, { focus = false, mine = false, prog, named = false } = {}) {
  const tl = t.q === '4K' ? tag('4K', named ? 'q named' : 'q') : '';
  const tr = t.lang && t.lang !== 'EN' ? tag(t.lang) : '';
  return `<div class="pc${focus ? ' fc' : ''}" data-key="t:${t.id}"><div class="box${focus ? ' f' : ''}"><div class="art">${Art.poster(t.id, { style: t.style, hue: t.hue, title: t.t })}</div>${tl ? `<div class="tl">${tl}</div>` : ''}${tr ? `<div class="tr">${tr}</div>` : ''}${mine ? `<span class="ad-mine">${ic('tv')}</span>` : ''}${prog ? `<div class="prog flush"><i style="width:${prog}%"></i></div>` : ''}</div>
      <div class="cap">${esc(t.t)}</div><div class="cm">${t.y}${dot}${t.r ? `★ ${t.r.toFixed(1)}` : t.g}</div></div>`;
}
const endCard = (label, { wide = false, focus = false, icon = 'chevR' } = {}) => `<div class="endcard${wide ? ' w' : ''}${focus ? ' f' : ''}">${ic(icon)}<span>${label}</span></div>`;
/* game card (ui.css .gc): the app's cards.js gameCard, with the shield's hidden plate and the replay mark */
function gameCard(g, { focus = false, hidden = false, other = false } = {}) {
  const A = g.away, H = g.home;
  let st = '', plate = '';
  if (g.state === 'in') st = `${liveP()}<span>${g.q}${['st', 'nd', 'rd', 'th'][g.q - 1]} ${g.clock}</span>`;
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
/* your team's next game: one card at the head of the NBA row (SPEC 4.3). The day once, by the night rule. */
function nextGameCard({ opp, home, day, tip, rec = '2-2', focus = false }) {
  return `<div class="gc next${focus ? ' f' : ''}" data-key="g:next"><div class="st"><span class="mine">Your team</span><span class="tvn">${day}</span></div>
    <div class="ng">${crest(opp)}<span>${home ? 'vs' : 'at'} ${NAME[opp]}</span></div><div class="ng"><small>${NAME[opp]} ${rec}${dot}Game page</small></div>
    <span class="plate"><span class="x"><span class="score sm">${tip}</span><span class="t-cap">tip-off</span></span></span></div>`;
}

// ---------- rows ----------
const H = { wide: 111, game: 124, poster: 238 };
const GAP = (kind) => (kind === 'poster' ? 40 : 38);   // title 28 + 10 (12 for posters, whose lift is bigger)
function row({ title, sub = '', cards, kind = 'wide', peek = false, deep = false, id = '', notitle = false }, top) {
  return `<div class="hv-row${kind === 'poster' ? ' poster' : ''}" data-rail="${esc(id)}" style="top:${top}px;height:${GAP(kind) + H[kind]}px">${notitle ? '' : `<div class="hv-rt">${title}${sub ? `<small>${sub}</small>` : ''}</div>`}<div class="rail${peek ? ' peek' : ''}${deep ? ' deep' : ''}"><div class="track" data-row>${cards.join('')}</div></div></div>`;
}
/* rows from y 298. lift = index of the focused row: the page moves so that row's title sits at y 84, clamped at the end so the last
   row sits above the safe line with the row before it above it (SPEC 6). Every row stays mounted; the ones off screen are hidden. */
function rows(list, { lift = -1 } = {}) {
  let y = 298; const out = []; const tops = [];
  list.forEach((r) => { tops.push(y); y += GAP(r.kind || 'wide') + H[r.kind || 'wide'] + 24; });
  const last = list[list.length - 1], lastK = last.kind || 'wide';
  const maxDy = tops[tops.length - 1] + GAP(lastK) + (lastK === 'poster' ? 186 : H[lastK]) + 6 - 513;   // the last row's cards end 6 px above the safe line
  const dy = lift > 0 ? Math.min(tops[lift] - 84, Math.max(0, maxDy)) : 0;
  list.forEach((r, i) => {
    const top = tops[i] - dy, k = r.kind || 'wide';
    const off = top > 540 || top + GAP(k) + H[k] < -10;
    const peek = top + GAP(k) + (k === 'poster' ? 186 : H[k]) > 513 && i !== lift;   // a row whose cards cross the safe line: its art, no text
    const deep = peek && top + GAP(k) > 512;   // less than 26 px of card on screen: nothing but the card's edge
    out.push(off ? `<div class="hv-row off" data-rail="${esc(r.id)}" style="top:${top}px;visibility:hidden"></div>` : row({ ...r, peek, deep, notitle: top + 28 > 513 }, top));
  });
  return out.join('');
}

// ---------- billboards (SPEC 3) ----------
const btn = (label, { focus = false, primary = false, icon = '' } = {}) => `<span class="${primary ? 'btn' : 'btn2'}${focus ? ' f' : ''}">${icon ? ic(icon) : ''}${label}</span>`;
/* the greeting (SPEC 3.7): the time of day in Icelandic, the first word of a title billboard's eyebrow */
const greet = (h) => (h >= 5 && h < 12 ? 'Góðan daginn' : h >= 12 && h < 18 ? 'Góðan dag' : 'Gott kvöld');
function bbArt(t, { poster: pst = false } = {}) {
  if (pst) return `<div class="hv-art"></div><div class="hv-grain"></div><div class="hv-pst"><div class="art">${Art.poster(t.id, { style: t.style, hue: t.hue, title: t.t })}</div></div><div class="hv-st"></div>`;
  return `<div class="hv-art">${art(t, { crop: [0, 40, 400, 125] })}</div><div class="hv-sx"></div><div class="hv-sy"></div><div class="hv-st"></div>`;
}
/* continue / up next: the title's backdrop, the eyebrow says why it is here, Resume focused */
function bbContinue({ t, ep, epName, left, prog, hour = 20, nofocus = false, upnext = false, offline = false, ends = '' }) {
  return `<div class="hv-bb" style="${tint(t)}">${bbArt(t)}
  <div class="hv-col"><div class="hv-eye"><span class="t-label" style="color:var(--a-pink-text)">${greet(hour)}</span><span class="t-label t-2">${upnext ? 'Up next' : 'Pick up where you left off'}</span></div>
    <div class="hv-title">${esc(t.t)}</div>
    <div class="hv-meta">${ep ? `${ep}${dot}<span class="epn">“${esc(epName)}”</span>${dot}${upnext ? '48 min' : '49 min'}` : `${t.y}${dot}${t.g}${dot}${t.rt}`}${t.q ? `${dot}${tag(t.q, 'q')}` : ''}${upnext ? '' : `${dot}<span>${left}</span>`}${ends ? `${dot}<span class="ends">Ends ${ends}</span>` : ''}</div>
    ${upnext ? `<div class="hv-plot">${esc(t.plot || '')}</div>` : `<div class="prog hv-prog"><i style="width:${prog}%"></i></div>`}</div>
  <div class="hv-btns">${upnext ? `${btn('Play', { primary: true, icon: 'play', focus: !nofocus })}${btn('Details')}` : `${btn('Resume', { primary: true, icon: 'play', focus: !nofocus })}${btn('Start over')}${btn('Details')}`}${offline ? '<span class="t-cap">Needs a connection to play</span>' : ''}</div></div>`;
}
/* discover: a title he has not seen, with its line; OK opens Details (owner decision 14.1) */
function bbDiscover({ t, why, hour = 21, nofocus = false, pst = false, first = false, cap = '', ends = '' }) {
  return `<div class="hv-bb" style="${tint(t)}">${bbArt(t, { poster: pst })}
  <div class="hv-col"><div class="hv-eye"><span class="t-label" style="color:var(--a-pink-text)">${greet(hour)}</span><span class="t-label t-2">${first ? 'Popular on your provider' : 'Top pick for you'}${why ? `${dot}${why}` : ''}</span></div>
    <div class="hv-title">${esc(t.t)}</div>
    <div class="hv-meta"><span class="star">${ic('star')}${t.r.toFixed(1)}</span>${dot}${t.y}${dot}${t.g}${dot}${t.rt || 'Series'}${t.q ? `${dot}${tag(t.q, 'q')}` : ''}${t.lang === 'IS' ? `${dot}${tag('IS')}` : ''}${ends ? `${dot}<span class="ends">Ends ${ends}</span>` : ''}</div>
    <div class="hv-plot">${esc(t.plot || '')}</div></div>
  <div class="hv-btns">${btn('Details', { primary: true, icon: 'info', focus: !nofocus })}${btn('Play', { icon: 'play' })}${btn('Save')}${cap ? `<span class="t-cap">${cap}</span>` : ''}</div></div>`;
}
/* new season (SPEC 3.5): a show he follows got a new season on the provider or an add-on; the show's logo (Cinemeta) stands in for the title */
function bbNewSeason({ t, season, eps, hour = 20, nofocus = false }) {
  return `<div class="hv-bb" style="${tint(t)}">${bbArt(t)}
  <div class="hv-col"><div class="hv-eye"><span class="t-label" style="color:var(--a-pink-text)">${greet(hour)}</span><span class="t-label t-2">New season${dot}Added today</span></div>
    <div class="hv-logo"><span class="hv-logotext">${esc(t.t)}</span></div>
    <div class="hv-meta">Season ${season}${dot}${eps} episodes${dot}<span class="star">${ic('star')}${t.r.toFixed(1)}</span>${dot}${t.g}${dot}You watched up to S${season - 1}</div>
    </div>
  <div class="hv-btns">${btn(`Play S${season} · E1`, { primary: true, icon: 'play', focus: !nofocus })}${btn('Series page')}<span class="t-cap">Also from Cinemeta<br>Icelandic subtitles</span></div></div>`;
}
/* welcome (first start before the catalog is in): the ramp, no button until the channel list exists */
function bbWelcome() {
  return `<div class="hv-bb"><div class="hv-grain"></div><div class="hv-st"></div><div class="hv-sy"></div>
  <div class="hv-col"><div class="hv-eye"><span class="t-label" style="color:var(--a-pink-text)">Welcome to airglow</span></div>
    <div class="hv-title">Your channels, films and series are loading</div>
    <div class="hv-meta">A minute or two the first time${dot}Home fills in as they land</div></div>
  <div class="hv-btns"><span class="t-cap" style="margin-left:0">Back cancels</span></div></div>`;
}
/* your team's next game as the billboard (no VOD, nothing to continue, no game today): SPEC 3.5 */
function bbNext({ opp, home, when, tip, channel, hour = 20, nofocus = false }) {
  return `<div class="hv-bb game"><div class="hv-fa" style="background:${field(home ? 'MEM' : opp)}"></div><div class="hv-fh" style="background:${field(home ? opp : 'MEM')}"></div><div class="hv-grain"></div><div class="hv-st"></div><div class="hv-sy"></div>
  <div class="hv-status"><span class="t-label" style="color:var(--a-pink-text)">${greet(hour)}</span><span class="t-label t-2">Your team${dot}${when}</span></div>
  <div class="hv-mu">${side(home ? 'MEM' : opp, 0, home ? '3-0' : '4-0')}<div class="hv-sp"><span class="score md">VS</span></div><div class="hv-clk"><span class="big">${tip}</span><span class="cap">tip-off</span></div>${side(home ? opp : 'MEM', 1, home ? '2-2' : '3-0')}</div>
  <div class="hv-ctx">3rd in the West${dot}3 in a row${dot}Morant 27.8 ppg</div>
  <div class="hv-btns">${btn('Game page', { primary: true, icon: 'score', focus: !nofocus })}${btn('Remind me', { icon: 'bell' })}<span class="t-cap">${channel}</span></div></div>`;
}
const side = (a, right, rec) => `<div class="hv-side${right ? ' r' : ''}">${right ? '' : crest(a, 'xxl')}<div><div class="nm">${NAME[a]}</div><div class="rc">${rec}</div></div>${right ? crest(a, 'xxl') : ''}</div>`;
/* game: the team fields split at 12°, crests in the neutral disc, the score plate in the middle with the clock chip (the one gradient
   slab, small), one fan line copied at tip-off, the buttons (SPEC 3.2) */
function bbGame({ away, home, state, aw, hw, q, clock, ar, hr, shield = true, tipIn, tip, channel, feeds = 0, replay = false, kept = '', synced = '38', nofocus = false, behind = null, choose = false, seen = false, ctx = '3rd in the West · 3 in a row · Morant 27.8 ppg', offline = false }) {
  const mine = '<span class="t-label" style="color:var(--a-pink-text)">Game night</span>';
  const ord = (n) => `${n}${['st', 'nd', 'rd', 'th'][n - 1]}`;
  let status, plate, chip, btns, cap = '';
  const hiddenTile = `<span class="shield">${ic('eyeOff')}<span>Score hidden</span></span>`;
  const scoreEl = `<span class="score">${aw}</span><span class="dash">–</span><span class="score">${hw}</span>`;
  if (state === 'pre') {
    status = `${mine}<span class="t-label t-2">${NAME[away]} at ${NAME[home]}${dot}Tip-off ${tip}</span>`;
    plate = '<span class="score md">VS</span>'; chip = [tipIn.replace('In ', '').replace(' min', ' MIN'), 'to tip-off'];
    btns = choose ? [btn('Choose channel', { primary: true, icon: 'search', focus: !nofocus }), btn('Open guide')] : [btn('Watch pre-game', { primary: true, icon: 'play', focus: !nofocus }), btn('Game page')];
    cap = choose ? 'No channel found yet<br>Your pick is remembered' : channel;
  } else if (state === 'in' && behind) {
    status = `${mine}${liveP()}<span class="t-label t-2">${NAME[away]} at ${NAME[home]}${dot}${esc(channel)}</span>`;
    plate = hiddenTile; chip = [`${ord(behind.q)} ${behind.clock}`, 'you stopped here'];
    btns = [btn('Resume', { primary: true, icon: 'play', focus: !nofocus }), btn('Back to live'), btn('Game page')];
  } else if (state === 'in') {
    status = `${mine}${liveP()}<span class="t-label t-2">${NAME[away]} at ${NAME[home]}${dot}${esc(channel)}</span>${!shield ? `<span class="synced">${ic('clock')}Synced · ${synced} s</span>` : ''}`;
    plate = shield ? hiddenTile : scoreEl;
    chip = shield ? ['ON NOW', 'until you watch'] : [`${ord(q)} ${clock}`, 'live · synced'];
    btns = [btn('Watch live', { primary: true, icon: 'play', focus: !nofocus }), replay ? btn('From tip-off', { icon: 'tipoff' }) : '', btn(shield ? 'Reveal score' : 'Box score')];
    if (!replay) cap = `${feeds > 1 ? `Hold OK for ${feeds - 1} more channel${feeds > 2 ? 's' : ''}` : ''}`;
  } else if (replay && !seen) {   // the morning after
    status = `${mine.replace('Game night', 'The morning after')}<span class="t-label t-2">${NAME[away]} at ${NAME[home]}${dot}Mon 26 Oct · late</span>`;
    plate = hiddenTile; chip = ['REPLAY', 'no spoilers'];
    btns = [btn('Watch from tip-off', { primary: true, icon: 'play', focus: !nofocus }), btn('Game page')];
    cap = `${channel}<br>${kept}`;
  } else {   // final, seen
    status = `${mine.replace('Game night', 'Your team')}<span class="t-label t-2">${NAME[away]} at ${NAME[home]}${dot}Final</span>`;
    plate = scoreEl; chip = ['FINAL', 'full time'];
    btns = [btn('Box score', { primary: true, icon: 'score', focus: !nofocus }), btn('Watch again', { icon: 'play' })];
    cap = `W ${aw}–${hw}<br>${channel}`;
  }
  const rec = (r) => (shield && !seen ? partial(r) : r);
  return `<div class="hv-bb game"><div class="hv-fa" style="background:${field(away)}"></div><div class="hv-fh" style="background:${field(home)}"></div><div class="hv-grain"></div><div class="hv-st"></div><div class="hv-sy"></div>
  <div class="hv-status">${status}</div>
  <div class="hv-mu">${side(away, 0, rec(ar))}<div class="hv-sp">${plate}</div><div class="hv-clk"><span class="big">${chip[0]}</span><span class="cap">${chip[1]}</span></div>${side(home, 1, rec(hr))}</div>
  <div class="hv-ctx">${ctx}${shield && !seen ? `<span class="asof">${eyeSm}as of tip-off</span>` : ''}</div>
  <div class="hv-btns">${btns.join('')}${cap ? `<span class="t-cap">${cap}</span>` : ''}${offline ? '<span class="t-cap">Needs a connection to play</span>' : ''}</div></div>`;
}

// ---------- the scenario's rows ----------
const NOWH = (h, m) => h + m / 60;
const CH = (nowH) => ({
  lp4game: chCard({ num: 4, name: 'NBA League Pass 4', ini: 'NL', now: 'Grizzlies at Jazz', s: 0.75, e: 3.5, nowH, live: true, game: ['MEM', 'UTAH'], hidden: 'Grizzlies at Jazz' }),
  tntgame: chCard({ num: 31, name: 'TNT Sports 1', ini: 'TS', now: 'Lakers at Suns', s: 2, e: 4.5, nowH, live: true, game: ['LAL', 'PHX'] }),
  lp4m: chCard({ num: 4, name: 'NBA League Pass 4', ini: 'NL', now: 'NBA Gametime', s: 10, e: 11, nowH, hidden: `<span class="cu-may">${eyeSm}May show results</span>` }),
  lp4e: chCard({ num: 4, name: 'NBA League Pass 4', ini: 'NL', now: 'Pelicans at Nuggets', s: 23, e: 25.5, nowH, game: ['NO', 'DEN'] }),
  espn: chCard({ num: 12, name: 'ESPN', ini: 'ES', now: 'SportsCenter', s: 20, e: 21, nowH }),
  nbatv: chCard({ num: 33, name: 'NBA TV', ini: 'NT', now: 'Game Time', s: 20, e: 21, nowH }),
  ruv: chCard({ num: 501, name: 'RÚV', ini: 'RÚ', now: 'Kastljós', s: 20, e: 20.75, nowH }),
  sky: chCard({ num: 118, name: 'Sky Sports Main Event', ini: 'SS', now: 'Premier League: Live', s: 20, e: 22.25, nowH, live: true }),
  bbc: chCard({ num: 101, name: 'BBC One', ini: 'BO', now: 'Panorama', s: 20.5, e: 21, nowH }),
  stod2: chCard({ num: 502, name: 'Stöð 2', ini: 'S2', now: 'Fréttir', s: 20.5, e: 21, nowH }),
  noguide: chCard({ num: 640, name: 'Viaplay Sport 1', ini: 'VS', now: 'Viaplay Sport 1', s: 0, e: 1, nowH: 0, hidden: 'Viaplay Sport 1' }),
});
const CONT = (o = {}) => [
  contCard(T.nightCircuit, { ep: 'S1 · E3', epName: 'Signal', left: '21 min left', prog: 58, focus: o.focus === 0 }),
  contCard(T.longTake, { left: '1h 17m left', prog: 28, focus: o.focus === 1 }),
  replayCard({ away: 'MEM', home: 'SAC', where: 'Stopped in Q3', prog: 61, focus: o.focus === 2 }),
  contCard(T.saltStatic, { left: '18 min left', prog: 82, noBackdrop: true }),
  contCard(T.signalHill, { ep: 'S3 · E2', epName: 'Low Tide', left: '44 min left', prog: 12 }),
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
const NEWPROV = (o = {}) => [poster(T.emberRun, { focus: o.focus === 0, named: true }), poster(T.deadAir), poster(T.understudy), poster(T.midnightRelay, { named: true }), poster(T.coldHarbour), poster(T.velvet), poster(T.tidewater), endCard('214 more')];
const FOURK = (o = {}) => [poster(T.harbor, { focus: o.focus === 0 }), poster(T.paperMoons, { named: true }), poster(T.midnightRelay, { named: true }), poster(T.lowOrbit, { named: true }), poster(T.emberRun, { named: true }), poster(T.deepField), poster(T.nightCircuit), endCard('See all')];
const ICE = (o = {}) => [poster(T.brimid, { focus: o.focus === 0 }), poster(T.nordurljos), poster(T.hrafnar), poster(T.eftirSolarlag), poster(T.thognin), poster(T.vetrarfri), poster(T.ljosid), endCard('See all')];
const SAVED = (o = {}) => [poster(T.northbound, { focus: o.focus === 0 }), poster(T.rookie), poster(T.quietFreq), poster(T.paperMoons), poster(T.hrafnar), poster(T.tidewater), endCard('Saved')];
const TONIGHT = (o = {}) => [poster(T.understudy, { focus: o.focus === 0, mine: true }), poster(T.saltStatic), poster(T.paperMoons, { mine: true }), poster(T.deadAir), poster(T.velvet), poster(T.tidewater), poster(T.vetrarfri), endCard('See all')];
const SERIES_START = (o = {}) => [poster(T.nightCircuit, { focus: o.focus === 0 }), poster(T.signalHill), poster(T.deepField), poster(T.copperFalls), poster(T.brimid), poster(T.hrafnar), poster(T.rookie), endCard('See all')];

// the slates. 26 Oct (real pairings from nba-pages/data.json), 28 Oct and 31 Oct (illustrative). Clocks and scores illustrative.
const G = {
  // Tue 27 Oct 01:52: the Jazz game live (Q2); the 23:00 / 23:30 games are over; the west-coast games at 02:00 / 02:30
  night: [
    { away: 'LAL', home: 'PHX', state: 'in', q: 1, clock: '9:41', aw: 12, hw: 15, ar: '2-1', hr: '1-2', tv: 'TNT Sports 1' },
    { away: 'DEN', home: 'OKC', state: 'pre', in: 'In 38 min', tip: '02:30', ar: '3-0', hr: '2-1', tv: 'NBA League Pass' },
    { away: 'WSH', home: 'CHA', state: 'post', aw: 98, hw: 104, ar: '2-2', hr: '3-1', tv: 'NBA League Pass' },
    { away: 'MIN', home: 'CLE', state: 'post', aw: 111, hw: 102, ar: '4-0', hr: '1-2', tv: 'NBA League Pass' },
    { away: 'CHI', home: 'BOS', state: 'post', aw: 101, hw: 109, ar: '1-3', hr: '2-1', tv: 'NBA League Pass' },
  ],
  // Tue 27 Oct 10:40: last night, all final; the Jazz game hidden
  morning: [
    { away: 'MEM', home: 'UTAH', state: 'post', ar: '3-0', hr: '1-2', tv: 'NBA League Pass 4', replay: true, hidden: true },
    { away: 'LAL', home: 'PHX', state: 'post', aw: 108, hw: 112, ar: '2-2', hr: '2-2', tv: 'TNT Sports 1', replay: true },
    { away: 'DEN', home: 'OKC', state: 'post', aw: 120, hw: 117, ot: true, ar: '4-0', hr: '2-2', tv: 'NBA League Pass', replay: true },
    { away: 'WSH', home: 'CHA', state: 'post', aw: 98, hw: 104, ar: '2-2', hr: '3-1', tv: 'NBA League Pass' },
    { away: 'MIN', home: 'CLE', state: 'post', aw: 111, hw: 102, ar: '4-0', hr: '1-2', tv: 'NBA League Pass' },
  ],
  // Wed 28 Oct 20:41: tonight's games have not started; the Grizzlies play Thursday
  wed: [
    { away: 'NO', home: 'DEN', state: 'pre', in: 'In 2h 19m', tip: '23:00', ar: '1-3', hr: '4-0', tv: 'NBA League Pass 4' },
    { away: 'MIA', home: 'NY', state: 'pre', in: 'In 2h 19m', tip: '23:00', ar: '2-2', hr: '3-1', tv: 'ESPN' },
    { away: 'DAL', home: 'HOU', state: 'pre', in: 'In 2h 49m', tip: '23:30', ar: '2-2', hr: '3-1', tv: 'NBA League Pass' },
    { away: 'POR', home: 'SAC', state: 'pre', in: 'In 5h 19m', tip: '02:00', ar: '1-3', hr: '2-2', tv: 'NBA League Pass' },
  ],
  // Sat 31 Oct 21:10: tonight's games; the Grizzlies play at Denver at 01:00 (Sat · late)
  sat: [
    { away: 'BOS', home: 'PHI', state: 'pre', in: 'In 1h 50m', tip: '23:00', ar: '3-2', hr: '2-3', tv: 'ESPN' },
    { away: 'TOR', home: 'IND', state: 'pre', in: 'In 1h 50m', tip: '23:00', ar: '1-4', hr: '3-2', tv: 'NBA League Pass' },
    { away: 'MIL', home: 'CHI', state: 'pre', in: 'In 2h 20m', tip: '23:30', ar: '4-1', hr: '2-3', tv: 'NBA League Pass' },
    { away: 'GS', home: 'LAC', state: 'pre', in: 'In 5h 20m', tip: '02:30', ar: '3-2', hr: '2-3', tv: 'NBA League Pass' },
  ],
};
const gameRow = (list, { focus = -1 } = {}) => list.map((g, i) => gameCard(g, { focus: i === focus, hidden: !!g.hidden, other: !g.hidden && !(g.away === 'MEM' || g.home === 'MEM') }));
const ctxMenu = (items, { left, top }) => `<div class="hv-dim"></div><div class="ctxmenu" style="left:${left}px;top:${top}px"><div data-col>${items.map(([icon, label], i) => `<div class="lr${i === 0 ? ' f-ring' : ''}">${ic(icon, 'sm')}<span class="grow">${label}</span></div>`).join('')}</div></div>`;
const offlinePill = () => `<div class="offline-bar hv">${ic('wifiOff')}<b>Offline</b>${dot}showing what airglow remembers</div>`;

// ---------- the pages ----------
const JAZZ = { away: 'MEM', home: 'UTAH', ar: '3-0', hr: '1-2', channel: 'NBA League Pass 4' };
const NIGHT_ROWS = (nowH, o = {}) => [
  { id: 'cont', title: 'Continue watching', cards: CONT(o.cont), kind: 'wide' },
  { id: 'nba', title: 'Tonight in the NBA', sub: '1 live · 1 later · 3 final', cards: gameRow(G.night), kind: 'game' },
  { id: 'neweps', title: 'New in your shows', cards: NEWEPS(), kind: 'wide' },
];
// 1. Game night, the state he sees most: he opens the app during the game, the shield hides the score (lead mock)
{
  const body = `${topbar('home', { nbaLive: true })}
${bbGame({ ...JAZZ, state: 'in', q: 2, clock: '4:12', feeds: 3, replay: true })}
<div class="hv-page">${rows(NIGHT_ROWS(NOWH(1, 52)))}</div><div class="hv-edge"></div>`;
  page('home-live-hidden.html', 'Game night: live, score hidden', body, 'Tue 27 Oct 01:52, shield My team, the game is on and he has not started watching. Game-night mode: the two teams\' colours split the billboard at 12°, crests in the neutral disc, the score tile says hidden, the chip ON NOW (no period, no clock), Watch live · From tip-off · Reveal score; one fan line copied at tip-off. The NBA tab\'s LIVE pill is the other game-night sign.');
}
// 2. Game night, revealed: shield Off, or he pressed Reveal score
{
  const body = `${topbar('home', { nbaLive: true })}
${bbGame({ ...JAZZ, state: 'in', aw: 48, hw: 51, q: 2, clock: '4:12', shield: false, feeds: 3, replay: true })}
<div class="hv-page">${rows(NIGHT_ROWS(NOWH(1, 52)))}</div><div class="hv-edge"></div>`;
  page('home-live.html', 'Game night: live, revealed', body, 'The same minute with the score shown (shield Off, or after Reveal score): the score in Barlow on the plate, 2ND 4:12 on the chip (never Q2, which reads as 02 at 3 m), Synced · 38 s in the status row.', { shield: false });
}
// 3. Behind in a replay: he paused his from-tip-off replay in Q1 and came back to Home
{
  const body = `${topbar('home', { nbaLive: true })}
${bbGame({ ...JAZZ, state: 'in', behind: { q: 1, clock: '8:20' }, replay: true })}
<div class="hv-page">${rows(NIGHT_ROWS(NOWH(2, 35)))}</div><div class="hv-edge"></div>`;
  page('home-behind.html', 'Game night: behind in a replay', body, '02:35: he started from tip-off and stopped in Q1. LIVE on the clock, the chip shows HIS position (1ST 8:20 · you stopped here), Resume · Back to live · Game page; no live clock anywhere (catch-up 7.2).');
}
// 4. Before tip-off, channel known; 5. before tip-off, no channel found (the guide match failed)
{
  const preRows = (nowH) => [
    { id: 'cont', title: 'Continue watching', cards: CONT(), kind: 'wide' },
    { id: 'nba', title: 'Tonight in the NBA', sub: '2 later · 3 final', cards: gameRow([{ ...G.night[0], state: 'pre', in: 'In 1h 49m', tip: '02:00' }, G.night[1], ...G.night.slice(2)]), kind: 'game' },
    { id: 'neweps', title: 'New in your shows', cards: NEWEPS(), kind: 'wide' },
  ];
  page('home-pre.html', 'Before tip-off', `${topbar('home')}\n${bbGame({ ...JAZZ, state: 'pre', tipIn: 'In 49 min', tip: '01:00' })}\n<div class="hv-page">${rows(preRows(NOWH(0, 11)))}</div><div class="hv-edge"></div>`, '00:11, 49 minutes to tip-off: VS on the plate, 49 MIN on the chip, the tip time once in the status row, Watch pre-game focused. Records partial: the Kings final in Continue watching is still unseen.');
  page('home-pre-choose.html', 'Before tip-off, no channel found', `${topbar('home')}\n${bbGame({ ...JAZZ, state: 'pre', tipIn: 'In 49 min', tip: '01:00', choose: true })}\n<div class="hv-page">${rows(preRows(NOWH(0, 11)))}</div><div class="hv-edge"></div>`, 'The guide match failed (the owner\'s provider often says "No guide information"): Choose channel opens the sheet (EPG match, NBA / League Pass channels, the Sports group), Open guide second; the pick is remembered per team.');
}
// 6. The morning after: Tue 27 Oct 10:40, the Jazz game unseen with a replay (catch-up 5.1)
{
  const body = `${topbar('home')}
${bbGame({ ...JAZZ, state: 'post', replay: true, kept: 'Replays for 3 days' })}
<div class="hv-page">${rows([
    { id: 'cont', title: 'Continue watching', cards: CONT(), kind: 'wide' },
    { id: 'nba', title: 'Last night in the NBA', sub: '5 final · yours hidden', cards: gameRow(G.morning), kind: 'game' },
    { id: 'neweps', title: 'New in your shows', cards: NEWEPS(), kind: 'wide' },
    { id: 'because', title: 'Because you watched Night Circuit', cards: BECAUSE(), kind: 'poster' },
  ])}</div><div class="hv-edge"></div>`;
  page('home-morning.html', 'The morning after', body, 'Tue 27 Oct 10:40. "The morning after" is the eyebrow; the chip reads REPLAY · no spoilers; no score, no result word, records partial, the fan line as of tip-off. In the NBA row the Grizzlies card is hidden (Ended, no plate); the other finals show (My team rule).');
}
// 7. Final, seen (he watched it to the buzzer last night): within 30 min of the final, or shield off
{
  const body = `${topbar('home')}
${bbGame({ ...JAZZ, state: 'post', aw: 112, hw: 104, ar: '4-0', hr: '1-3', seen: true, replay: true, shield: false })}
<div class="hv-page">${rows([
    { id: 'cont', title: 'Continue watching', cards: CONT_NOHERO(), kind: 'wide' },
    { id: 'nba', title: 'Tonight in the NBA', sub: '5 final', cards: gameRow(G.morning.map((g) => g.hidden ? { ...g, hidden: false, aw: 112, hw: 104, ar: '4-0', hr: '1-3' } : g)), kind: 'game' },
    { id: 'neweps', title: 'New in your shows', cards: NEWEPS(), kind: 'wide' },
  ])}</div><div class="hv-edge"></div>`;
  page('home-final-seen.html', 'Final, seen', body, '03:40, he watched it to the buzzer: the final score on the plate, FINAL on the chip, W 112–104, Box score focused, Watch again. The billboard holds 30 minutes, then the next kind takes over.', { shield: false });
}
// 8. A normal evening: Wed 28 Oct 20:41, no game; continue an episode, then discover
const EVENING_ROWS = (o = {}) => [
  { id: 'cont', title: 'Continue watching', cards: CONT_NOHERO(o.cont), kind: 'wide' },
  { id: 'nba', title: 'Tonight in the NBA', sub: '4 later', cards: [nextGameCard({ opp: 'LAL', home: true, day: 'Thu', tip: '23:30', focus: o.nba?.focus === 0 }), ...gameRow(G.wed)], kind: 'game' },
  { id: 'neweps', title: 'New in your shows', cards: NEWEPS(o.neweps), kind: 'wide' },
  { id: 'because', title: 'Because you watched Night Circuit', cards: BECAUSE(o.because), kind: 'poster' },
  { id: 'tonight', title: 'A film for tonight', sub: 'Under 2 hours · ends before midnight', cards: TONIGHT(o.tonight), kind: 'poster' },
  { id: 'picks', title: 'Top picks for you', sub: 'Popular this week · Icelandic and English', cards: PICKS(o.picks), kind: 'poster' },
  { id: 'newprov', title: 'New on your provider', sub: 'Last 14 days', cards: NEWPROV(o.newprov), kind: 'poster' },
  { id: '4k', title: 'In 4K', sub: 'Named 4K · checked when you open', cards: FOURK(o.fourk), kind: 'poster' },
  { id: 'is', title: 'Á íslensku', sub: 'Icelandic titles and sound', cards: ICE(o.ice), kind: 'poster' },
  { id: 'saved', title: 'Saved for later', cards: SAVED(o.saved), kind: 'poster' },
  { id: 'channels', title: 'Channels', sub: 'Favourites and recent', cards: (() => { const C = CH(NOWH(20, 41)); return [o.channels?.focus === 0 ? chCard({ num: 4, name: 'NBA League Pass 4', ini: 'NL', now: 'Pelicans at Nuggets', s: 23, e: 25.5, nowH: NOWH(20, 41), game: ['NO', 'DEN'], focus: true }) : C.lp4e, C.espn, C.nbatv, C.ruv, C.sky, C.bbc, C.stod2, C.noguide]; })(), kind: 'wide' },
];
{
  const bb = () => bbContinue({ t: T.nightCircuit, ep: 'S1 · E3', epName: 'Signal', left: '21 min left', ends: '21:03', prog: 58 });
  page('home-evening.html', 'A normal evening', `${topbar('home')}\n${bb()}\n<div class="hv-page">${rows(EVENING_ROWS())}</div><div class="hv-edge"></div>`, 'Wed 28 Oct 20:41, no Grizzlies game. The greeting in Icelandic opens the eyebrow (Gott kvöld · Pick up where you left off); the episode\'s own name sits in the meta line; Resume focused. Continue watching first (the billboard\'s title not repeated; Salt & Static has no backdrop, so its poster stands at the left), the NBA row led by the next game.');
  page('home-new-season.html', 'New season of a show he follows', `${topbar('home')}\n${bbNewSeason({ t: { ...T.signalHill, plot: 'The valley radio station goes dark for a winter, and the town starts hearing itself on the air.' }, season: 4, eps: 10 })}\n<div class="hv-page">${rows(EVENING_ROWS().map((r) => r.id === 'neweps' ? { ...r, title: 'New in your shows', sub: 'Signal Hill S4 and 4 more' } : r))}</div><div class="hv-edge"></div>`, 'Signal Hill, a show he finished through S3, got a fourth season today: the billboard shows it with the show\'s own logo (Cinemeta), the season line, Play S4 · E1 focused. It holds for 48 h or until he starts it; New in your shows carries the rest.');
  page('home-upnext.html', 'Up next: the next episode', `${topbar('home')}\n${bbContinue({ t: T.nightCircuit, ep: 'S1 · E4', epName: 'The Relay', upnext: true, ends: '21:30' })}\n<div class="hv-page">${rows(EVENING_ROWS())}</div><div class="hv-edge"></div>`, 'He finished S1 · E3 last night: the next episode is the billboard (Up next · S1 · E4 · "The Relay" · 48 min, the episode\'s line), Play focused, Details.');
  page('home-scrolled.html', 'A row in focus mid-page', `${topbar('home', { away: true })}${bb().replace('class="hv-bb"', 'class="hv-bb hv-hidden"').replace('class="btn f"', 'class="btn"')}<div class="hv-cover"></div><div class="ctxline">Home${dot}Because you watched</div>\n<div class="hv-page">${rows(EVENING_ROWS({ because: { focus: 0 } }), { lift: 3 })}</div><div class="hv-edge"></div>`, 'Down three times from Continue watching: the page lifts so the focused row\'s title sits at y 84, the bar steps away (Back brings the billboard\'s primary back), the next rows peek below. Posters carry the [tv] mark when the provider has the add-on\'s title too.');
  page('home-channels.html', 'The channels, at the bottom', `${topbar('home', { away: true })}${bb().replace('class="hv-bb"', 'class="hv-bb hv-hidden"').replace('class="btn f"', 'class="btn"')}<div class="hv-cover"></div><div class="ctxline">Home${dot}Channels</div>\n<div class="hv-page">${rows(EVENING_ROWS({ channels: { focus: 0 } }), { lift: 10 })}</div>`, 'The last row: the lift is clamped so Channels sits at the bottom with Saved for later above it. A channel card is the provider\'s logo tile on surface-2 (no art exists for live TV); a channel carrying a game gets the teams\' colours and crests; no guide = the channel name alone.');
  page('home-card-menu.html', 'Hold OK on a card', `${topbar('home')}\n${bbContinue({ t: T.nightCircuit, ep: 'S1 · E3', epName: 'Signal', left: '21 min left', ends: '21:03', prog: 58, nofocus: true })}\n<div class="hv-page">${rows(EVENING_ROWS({ cont: { focus: 0 } }))}</div><div class="hv-edge"></div>\n${ctxMenu([['play', 'Resume'], ['restart', 'Start over'], ['info', 'Details'], ['check', 'Mark watched'], ['close', 'Remove from Home']], { left: 270, top: 232 })}`, 'Hold OK on The Long Take: the page dims to 60 % under the menu, which sits beside its card and never over the billboard\'s primary. Resume first and focused, Start over, Details, Mark watched, Remove from Home.');
  page('home-offline.html', 'Offline, with a cache', `${topbar('home')}\n${bbContinue({ t: T.nightCircuit, ep: 'S1 · E3', epName: 'Signal', left: '21 min left', ends: '21:03', prog: 58, offline: true })}\n<div class="hv-page">${rows(EVENING_ROWS().map((r) => r.id === 'nba' ? { ...r, sub: 'As of 20:12' } : r).filter((r) => r.id !== 'neweps'))}</div><div class="hv-edge"></div>\n${offlinePill()}`, 'The provider does not answer: Home is drawn from what airglow kept; the pill sits beside the avatar; the billboard says Needs a connection to play (Resume stays focused: it leads to the diagnosis card). No LIVE pills, no clocks; New in your shows is left out.');
}
// 13. Discover: Sat 31 Oct 21:10, nothing in progress for 7 days: a top pick with its line; OK = Details (owner)
{
  const body = `${topbar('home')}
${bbDiscover({ t: T.harbor, why: 'Thriller', cap: '4K HDR from Northlight<br>Also on your provider', ends: '23:16' })}
<div class="hv-page">${rows([
    { id: 'nba', title: 'Tonight in the NBA', sub: '4 later', cards: [nextGameCard({ opp: 'DEN', home: false, day: 'Sat · late', tip: '01:00', rec: '4-1' }), ...gameRow(G.sat)], kind: 'game' },
    { id: 'picks', title: 'Top picks for you', sub: 'Popular this week · Icelandic and English', cards: PICKS(), kind: 'poster' },
    { id: 'neweps', title: 'New in your shows', cards: NEWEPS(), kind: 'wide' },
  ])}</div><div class="hv-edge"></div>`;
  page('home-discover.html', 'Nothing to continue: a top pick', body, 'Sat 31 Oct 21:10. Nothing in progress for 7 days, so the billboard is the day\'s pick (Popular, his languages, unseen, the add-on\'s backdrop and line). Details focused (owner decision), Play, Save; the caption names the playable fact. The pick changes once a day, never under his thumb.');
}
// 14. First start: nothing watched yet; 15. welcome, before the catalog is in
{
  const body = `${topbar('home')}
${bbDiscover({ t: T.paperMoons, why: '', first: true, pst: true, hour: 20 })}
<div class="hv-page">${rows([
    { id: 'nba', title: 'Tonight in the NBA', sub: '4 later', cards: [nextGameCard({ opp: 'LAL', home: true, day: 'Thu', tip: '23:30' }), ...gameRow(G.wed)], kind: 'game' },
    { id: 'picks', title: 'Top picks for you', sub: 'Popular this week · Icelandic and English', cards: PICKS(), kind: 'poster' },
    { id: 'series', title: 'Series to start', cards: SERIES_START(), kind: 'poster' },
  ])}</div><div class="hv-edge"></div>`;
  page('home-first.html', 'First start', body, 'Signed in a minute ago, nothing watched. The billboard is Popular\'s first title in his languages with the provider\'s poster (no backdrop yet: the poster stands upright). The NBA first (it needs no history), Top picks, Series to start, then New on your provider and Channels below.');
  const skel = (n, w, h) => Array.from({ length: n }, () => `<div class="skb" style="width:${w}px;height:${h}px;border-radius:16px;flex:none"></div>`).join('');
  page('home-welcome.html', 'Welcome: the first minute', `${topbar('home')}\n${bbWelcome()}\n<div class="hv-page hv-skel"><div class="hv-row" style="top:298px"><div class="hv-rt"><span class="skb" style="width:220px;height:22px"></span></div><div class="rail"><div class="track">${skel(5, 272, 124)}</div></div></div><div class="hv-row" style="top:484px"><div class="hv-rt"><span class="skb" style="width:160px;height:22px"></span></div></div></div><div class="hv-edge"></div>`, 'A first start before the channel list is in: the ramp, the welcome line, flat skeleton blocks where the NBA row and Top picks will be; nothing is focused (a progress screen, UI-SPEC SF9), Back cancels. The first row takes focus only when nothing is focused yet.', { meta: '\n<meta name="nofocus" content="progress">' });
}
// 16. An M3U account (live only, no VOD): your team's next game as the billboard, the NBA row, the channels
{
  const C = CH(NOWH(20, 41));
  page('home-m3u.html', 'Live only (M3U): no films, no series', `${topbar('home')}\n${bbNext({ opp: 'LAL', home: true, when: 'Thu 23:30', tip: '23:30', channel: 'NBA League Pass 4' })}\n<div class="hv-page">${rows([
    { id: 'nba', title: 'Tonight in the NBA', sub: '4 later', cards: gameRow(G.wed), kind: 'game' },
    { id: 'channels', title: 'Channels', sub: 'Favourites and recent', cards: [C.lp4e, C.espn, C.nbatv, C.ruv, C.sky, C.bbc, C.stod2, C.noguide], kind: 'wide' },
  ])}</div><div class="hv-edge"></div>`, 'A playlist account with no films or series and nothing to continue: the next game is the billboard (the two fields, VS, the tip time, Game page · Remind me), then tonight\'s games and the channels. Two rows, no empty shelves.', { shield: false });
}
// 17. Account > Home rows
{
  const rowsList = [['Continue watching', true, 'Always first', true], ['Tonight in the NBA', true, 'Your team\'s next game, then tonight\'s games'], ['New in your shows', true, 'New episodes of shows you watch or saved'], ['Because you watched', true, 'Like the last title you finished'], ['A film for tonight', true, 'Under 2 hours, ends before midnight'], ['Top picks for you', true, 'Popular this week in your languages, unseen'], ['New on your provider', true, 'Added in the last 14 days'], ['In 4K', true, 'Named 4K, checked when you open'], ['Á íslensku', true, 'Icelandic titles and sound'], ['Saved for later', false, 'Saved titles you have not started'], ['Channels', true, 'Favourites and recent, at the bottom']];
  const arow = (i, [t, on, sub, pin], f) => `<div class="arow${f ? ' f-ring' : ''}${pin ? ' pin' : ''}${on ? '' : ' off'}"><span class="grip"><i></i><i></i><i></i></span><span class="n">${i + 1}</span><span class="grow" style="min-width:0">${t}<div class="t-cap" style="margin-top:0">${sub}</div></span><span class="av"><span class="onoff">${on ? 'On' : 'Off'}</span><span class="tg${on ? ' on' : ''}"><i></i></span></span></div>`;
  const groups = ['Provider', 'Add-ons', 'Playback', 'Sound', 'NBA', 'Languages', 'Home rows', 'Updates', 'About'];
  const tg = (t, sub) => `<div class="arow"><span class="grow" style="min-width:0">${t}<div class="t-cap" style="margin-top:0">${sub}</div></span><span class="av"><span class="onoff">On</span><span class="tg on"><i></i></span></span></div>`;
  const body = `${topbar('account')}
<div class="abs" style="left:48px;top:80px;width:200px;display:flex;flex-direction:column;gap:4px">${groups.map((g) => `<div class="gl${g === 'Home rows' ? ' sel' : ''}">${g}</div>`).join('')}</div>
<div class="abs hv-set" style="left:272px;top:80px;width:640px"><div class="t-title" style="margin-bottom:10px">Home rows</div>
${tg('Your team first', 'On game days your team\'s game is the big card on Home')}${tg('Tell me when my team is live', 'A quiet chip while you watch something else')}
<div class="t-label" style="margin:4px 0 8px 4px">Rows, in order</div>
${rowsList.slice(0, 3).map((r, i) => arow(i, r, i === 2)).join('')}
<div class="hv-hint">${ic('info', 'sm')}OK turns a row off or on${dot}Hold OK moves it${dot}3 of 11, then Reset order</div></div>`;
  page('home-rows-setting.html', 'Account: Home rows', body, 'Every row with its toggle and its place. OK turns a row off or on; hold OK lifts it and ▲▼ move it (the Saved page\'s reorder). Continue watching is pinned first (no grip). The list scrolls: 11 rows then Reset order.', { shield: false });
}
// 18. Game-night entry, a storyboard: the two fields slide in from the sides (280 ms, the live wipe's easing), once per visit
{
  const frame = (k, t) => { const dx = Math.round(240 * (1 - t)); return `<div class="sb-frame"><div class="sb-shot">${bbGame({ ...JAZZ, state: 'in', q: 2, clock: '4:12', feeds: 3, replay: true, nofocus: true }).replace('class="hv-fa"', `class="hv-fa" data-t="${t}"`).replace(/<div class="hv-fa" data-t="[^"]*" style="/, `<div class="hv-fa" style="transform:translateX(${-dx}px);opacity:${(0.3 + 0.7 * t).toFixed(2)};`).replace('<div class="hv-fh" style="', `<div class="hv-fh" style="transform:translateX(${dx}px);opacity:${(0.3 + 0.7 * t).toFixed(2)};`).replace('<div class="hv-mu">', `<div class="hv-mu" style="opacity:${t.toFixed(2)};transform:scale(${(0.96 + 0.04 * t).toFixed(3)})">`).replace('<div class="hv-ctx">', `<div class="hv-ctx" style="opacity:${t.toFixed(2)}">`).replace('<div class="hv-btns">', `<div class="hv-btns" style="opacity:${t.toFixed(2)}">`)}</div><div class="sb-cap"><b>${k}</b></div></div>`; };
  const body = `${topbar('home', { nbaLive: true })}<div class="sb"><div class="sb-h"><div class="t-title">Game night: the entry, 280 ms</div><div class="t-cap">Once per visit, when the billboard is your team's game. Transform and opacity only, the live wipe's easing; reduced motion = a 120 ms fade. Nothing moves again until a basket changes the score (a 200 ms bump on the digits) or the game changes state (the 12° wipe).</div></div>
<div class="sb-row">${frame('0 ms · the fields are off screen, the plate waits', 0)}${frame('140 ms · the fields slide in, the plate settles', 0.5)}${frame('280 ms · home: Watch live takes the ring', 1)}</div></div>`;
  page('home-live-entry.html', 'Game-night entry (storyboard)', body, 'Three stills of the 280 ms entry: the team fields slide in from their sides, the plate and the crests settle, then the ring lands on Watch live. The only motion Home adds; transform and opacity only.', { meta: '\n<meta name="storyboard" content="1">' });
}

fs.writeFileSync(path.join(root, 'tools', 'pages.json'), JSON.stringify(pages, null, 1) + '\n');
console.log(pages.length + ' pages');
