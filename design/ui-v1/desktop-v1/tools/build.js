// node tools/build.js : writes the Windows app mocks (1920 x 1080 at 100 %, one at 1366 x 768) from one timeline.
// Then node tools/render.js for the PNGs and the contact sheet. Art: the TV's Cinemeta / metahub files (../home-final/art)
// and ESPN's crests (../home-final/art, ../nba-pages/img). The timeline is home-final's: Wed 28 Oct 2026 20:41 in
// Reykjavik, shield My team, add-ons Cinemeta + Northlight; the Grizzlies play at Portland Thu 29 Oct 02:00; the
// game-night pages are Thu 03:12 to 03:14.
const fs = require('fs'); const path = require('path');
const root = path.resolve(__dirname, '..');
const ART = '../home-final/art', CR = '../nba-pages/img';

// ---------- icons (one stroke set, 24 px boxes) ----------
const P = {
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M3.5 9.5c4 1 7 4 8.5 8.5M20.5 9.5c-4 1-7 4-8.5 8.5M12 3v18M3 12h18"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  series: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M7 3l5 4 5-4"/>',
  bookmark: '<path d="M6 4h12v17l-6-4-6 4z"/>', search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>', chevR: '<path d="M9 5l7 7-7 7"/>', chevD: '<path d="M5 9l7 7 7-7"/>', chevU: '<path d="M5 15l7-7 7 7"/>',
  arrD: '<path d="M12 5v14M6 13l6 6 6-6"/>', arrR: '<path d="M5 12h14M13 6l6 6-6 6"/>', arrL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>', pause: '<path d="M7 5v14M17 5v14" stroke-width="3"/>',
  vol: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l4 6M21 9l-4 6"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10.5 10.2a2 2 0 1 0 0 3.6M17 10.2a2 2 0 1 0 0 3.6"/>',
  pip: '<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="5" rx="1" fill="currentColor" stroke="none"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  lay2: '<rect x="3" y="6" width="8" height="12" rx="1.5"/><rect x="13" y="6" width="8" height="12" rx="1.5"/>',
  lay13: '<rect x="3" y="4" width="11" height="16" rx="1.5"/><rect x="16" y="4" width="5" height="4.5" rx="1"/><rect x="16" y="9.75" width="5" height="4.5" rx="1"/><rect x="16" y="15.5" width="5" height="4.5" rx="1"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 2.2H4.4z"/><path d="M10 21a2.2 2.2 0 0 0 4 0"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>', min: '<path d="M4 12h16"/>', max: '<rect x="5" y="5" width="14" height="14" rx="1"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7a13 13 0 0 1-2.4 3.7M6.4 6.6A13 13 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', plus: '<path d="M12 5v14M5 12h14"/>', star: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9z"/>',
  pin: '<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3zM12 14v7"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  dots: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  zoom: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9M8 10.5h5M10.5 8v5"/>',
  next: '<path d="M6 5l10 7-10 7z" fill="currentColor" stroke="none"/><path d="M18 5v14" stroke-width="2.5"/>',
  start: '<path d="M18 5L8 12l10 7z" fill="currentColor" stroke="none"/><path d="M6 5v14" stroke-width="2.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', score: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M12 5.5v13M6.5 10h2.5M15 10h2.5M6.5 14h2.5M15 14h2.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/>', top: '<path d="M12 19V7M6 13l6-6 6 6M5 4h14"/>',
  screens: '<rect x="2" y="5" width="12" height="9" rx="1.5"/><rect x="12" y="10" width="10" height="7" rx="1.5"/>', drag: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="3"/>',
  back: '<path d="M11 5l-7 7 7 7M4 12h16"/>', hand: '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v6M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6a1.5 1.5 0 0 1 3 0v7M17 12.5V9a1.5 1.5 0 0 1 3 0v6a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.2-3L4 14a1.6 1.6 0 0 1 2.6-1.8L8 14"/>',
  mono: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', key: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 11h.01M10.5 11h.01M14 11h.01M17 11h.01M8 14h8"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
const EYE = ic('eyeOff', 'eyeoff');
const dot = '<span class="dot">·</span>';
const k = (t, f) => `<span class="k${f ? ' f' : ''}">${t}</span>`;
const live = (c) => `<span class="a-live${c ? ' compact' : ''}">Live</span>`;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

// ---------- team colours (app/tv/js/util.js teamPalette's rule: darken a primary until chalk reads 4.5:1) ----------
const TC = { ATL: ['#E03A3E', '#C1D32F'], BOS: ['#007A33', '#BA9653'], DAL: ['#00538C', '#B8C4CA'], DEN: ['#0E2240', '#FEC524'], HOU: ['#CE1141', '#C4CED4'], LAC: ['#C8102E', '#1D428A'], MEM: ['#5D76A9', '#F5B112'], NY: ['#006BB6', '#F58426'], OKC: ['#007AC1', '#EF3B24'], PHX: ['#1D1160', '#E56020'], POR: ['#E03A3E', '#FFFFFF'], SAC: ['#5A2D81', '#63727A'], UTAH: ['#002B5C', '#F9A01B'], GS: ['#1D428A', '#FFC72C'], LAL: ['#552583', '#FDB927'] };
const lin = (x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => { const [r, g, b] = rgb(h).map((v) => lin(v / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const darken = (h, f) => '#' + rgb(h).map((v) => Math.round(v * f).toString(16).padStart(2, '0')).join('');
function pal(a) { let [p, s] = TC[a]; let f = 1; while (ratio(lum('#F3EFE6'), lum(p)) < 4.5 && f > 0.4) { f -= 0.04; p = darken(TC[a][0], f); } return { p, a: s }; }
const NAMES = { ATL: 'Hawks', BOS: 'Celtics', DAL: 'Mavericks', DEN: 'Nuggets', HOU: 'Rockets', LAC: 'Clippers', MEM: 'Grizzlies', NY: 'Knicks', OKC: 'Thunder', PHX: 'Suns', POR: 'Trail Blazers', SAC: 'Kings', UTAH: 'Jazz', GS: 'Warriors', LAL: 'Lakers' };
const SHORT = { DAL: 'Mavs', POR: 'Blazers' };
const crestSrc = (a) => ({ MEM: `${ART}/mem.png`, POR: `${ART}/por.png`, BOS: `${ART}/bos.png`, NY: `${ART}/ny.png`, DAL: `${ART}/dal.png`, HOU: `${ART}/hou.png`, DEN: `${ART}/den.png`, OKC: `${ART}/okc.png` }[a] || `${CR}/logo-${a}.png`);

// ---------- the frame ----------
const head = (title, cls = '', extra = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1920">
<title>${title}</title>
<link rel="stylesheet" href="../../../app/tv/brand/fonts.css"><link rel="stylesheet" href="../../../app/tv/brand/tokens.css"><link rel="stylesheet" href="desktop.css">
${extra ? `<style>${extra}</style>` : ''}
</head><body><div class="win ${cls}">\n`;
const foot = `</div></body></html>\n`;

// the title bar: mark, back / forward, the one box (search and commands), the avatar, the Windows caption buttons (drawn by Windows)
const tbar = (o = {}) => `<div class="tbar">
  <img class="mk" src="../../../app/tv/brand/assets/mark-small.svg" alt="airglow">
  <div class="nav"><i>${ic('chevL')}</i><i class="dim">${ic('chevR')}</i></div>
  <div class="omni">${ic('search')}<span>${o.q || 'Search or jump to anything'}</span><span class="r">${k('Ctrl')}${k('K')}</span></div>
  <div class="tbr">${o.right || ''}<span class="avatar">B</span></div>
  <div class="wco"><i>${ic('min')}</i><i>${ic('max')}</i><i>${ic('close')}</i></div>
</div>\n`;
const SIDE = [['home', 'Home'], ['tv', 'Live'], ['ball', 'NBA'], ['film', 'Movies'], ['series', 'Series'], ['bookmark', 'Saved']];
const side = (sel, o = {}) => `<div class="side">
${SIDE.map(([i, n]) => `  <div class="si${n === sel ? ' sel' : ''}">${ic(i)}<span>${n}</span>${n === 'NBA' && o.live ? live(true) : ''}</div>`).join('\n')}
  ${o.np ? `<div class="hd">Now playing</div>${o.np}` : ''}
  <div class="gap"></div>
  <div class="acct"><span class="avatar">B</span><div>Birgir<small>Account${o.update ? ' · update ready' : ''}</small></div>${o.update ? '<span class="dotu"></span>' : ''}</div>
</div>\n`;
const picture = (file, pos, capa) => `<div class="bd" style="--pos:${pos}"><img src="${ART}/${file}" alt=""></div><div class="cap" style="--capa:${capa}"></div><div class="sx"></div><div class="sy"></div><div class="st"></div><div class="grain"></div>\n`;
const poster = (f, o = {}) => `<div class="poster${o.hov ? ' hov' : ''}${o.kb ? ' kb' : ''}"><img src="${ART}/${f}-poster.jpg" alt="">${o.q ? `<span class="q">${o.q}</span>` : ''}${o.p ? `<div class="pb" style="--p:${o.p}"><i></i></div>` : ''}${o.hov ? `<div class="hv"><i>${ic('play')}</i><i class="g">${ic('dots')}</i></div>` : ''}</div>`;
const ends = (clock, minutes) => { const [h, m] = clock.split(':').map(Number); const t = (h * 60 + m + minutes) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
const LUM = { severance: 0.641, palmsprings: 0.662, heat: 0.362, slowhorses: 0.152 };
const cap = (art, target) => Math.min(0.6, Math.max(0.1, 1 - target / LUM[art])).toFixed(2);

// ---------- game cards (the hub's shape at desktop size) ----------
// g: { a, h, st, ch, pl: { t: tip time } | { sc: [a, h], q } | { hid } | { fin: [a, h] }, mine, hov }
const gameCard = (g) => { const c = pal(g.a); const n = (x) => SHORT[x] || NAMES[x];
  const plate = g.pl.t ? `<div class="tt">${g.pl.t}</div><div class="sub">${g.pl.sub || 'Tip-off'}</div>`
    : g.pl.hid ? `<div class="hid">${EYE}Score hidden</div><div class="sub">${g.pl.sub || 'On now'}</div>`
    : g.pl.fin ? `<div class="sc">${g.pl.fin[0]}</div><div class="sc">${g.pl.fin[1]}</div>`
    : `<div class="sc">${g.pl.sc[0]}</div><div class="sc">${g.pl.sc[1]}</div>`;
  return `<div class="gc${g.hov ? ' hov' : ''}" style="--ta:${c.a}"><span class="te"></span>
  <div class="stt">${g.live ? live(true) : ''}${g.st ? `<span>${g.st}</span>` : ''}<span class="ch">${g.ch || ''}</span></div>
  <div class="tm"><span class="cr"><img src="${crestSrc(g.a)}" alt=""></span><b>${n(g.a)}</b><small>${g.ra}</small></div>
  <div class="tm"><span class="cr"><img src="${crestSrc(g.h)}" alt=""></span><b>${n(g.h)}</b><small>${g.rh}</small></div>
  <div class="pl">${plate}</div>${g.hov ? `<div class="ht"><i class="p">${ic('play')}</i><i>${ic('grid')}</i><i>${ic('dots')}</i></div>` : ''}
</div>`; };
const tfield = (a, h, s = 96, extra = '') => { const ca = pal(a), ch = pal(h); return `<div class="tfield" style="--away:${ca.p};--home:${ch.p}"><div class="a"></div><div class="h"></div><div class="c l" style="--s:${s}px"><img src="${crestSrc(a)}" alt=""></div><div class="c r" style="--s:${s}px"><img src="${crestSrc(h)}" alt=""></div><div class="cap"></div>${extra}</div>`; };

// the slate, Wed 28 Oct (home-final's timeline)
const SLATE = [
  { a: 'BOS', h: 'NY', ra: '3-1', rh: '2-2', st: 'Tonight', ch: 'NBA League Pass 4 · ESPN', pl: { t: '23:00' } },
  { a: 'DAL', h: 'HOU', ra: '1-3', rh: '2-1', st: 'Tonight', ch: 'NBA League Pass', pl: { t: '23:00' } },
  { a: 'DEN', h: 'OKC', ra: '3-1', rh: '4-0', st: 'Tonight', ch: 'Prime Video', pl: { t: '01:30' } },
  { a: 'MEM', h: 'POR', ra: '3-0', rh: '1-3', st: 'Your team · tonight', ch: 'ESPN · 4K', pl: { t: '02:00' }, mine: true },
  { a: 'LAC', h: 'SAC', ra: '2-2', rh: '1-3', st: 'Late', ch: 'NBA League Pass', pl: { t: '03:30' } },
  { a: 'UTAH', h: 'PHX', ra: '1-2', rh: '2-2', st: 'Late', ch: 'NBA League Pass', pl: { t: '04:00' } },
];

// ================================================================ 1. Home, a normal evening (Wed 20:41)
const lineupLines = (lit, cardHtml, w1366) => [
  ['Severance', `Continue${dot}S2 · E3${dot}21 min left`],
  ['Slow Horses', `New episodes${dot}S6 · E4<span class="count">3 new</span>`],
  ['Heat', `A film for tonight${dot}ends ${ends('20:41', 170)}${dot}4K`],
  ['Grizzlies at Blazers', `Tonight${dot}02:00`],
].map(([n, f], i) => (i === lit ? cardHtml : `  <div class="e"><div class="t">${n}<small>${f}</small></div></div>\n`)).join('');
const card = (o) => `  <div class="e on${o.sharp ? ' sharp' : ''}${o.kb ? ' kb' : ''}" style="--ambt:${o.ambt}">
  <div class="ey">${o.ey}</div>
  ${o.logo ? `<img class="logo" src="${ART}/${o.logo}-logo.png" alt="${o.title}">` : `<div class="big">${o.title}</div>`}
  <div class="meta">${o.meta}</div>
  ${o.line ? `<div class="line">${o.line}</div>` : ''}
  ${o.p ? `<div class="bar" style="--p:${o.p}"><i></i></div>` : ''}
  <div class="acts">${o.acts}</div>
  </div>\n`;
const COMEDY = ['palmsprings', 'niceguys', 'gemstones', 'hotfuzz', 'friendship', 'wwdits', 'gamenight', 'superbad', 'stepbrothers', 'otherguys'];
const peek = (title, sub, cards) => `<div class="peek"><div class="rt">${title}<span>${sub}</span><span class="pk">Browse${dot}15 rows ${k('↓')}</span></div><div class="cards">${cards.join('')}</div></div>\n`;

const homeEvening = (small) => head('Home, a normal evening', small ? 'w1366' : '') + `<div class="amb" style="--amb:#3B5247"></div>` +
picture('severance-bg.jpg', '74% 30%', cap('severance', 0.30)) + tbar() + side('Home') + `<div class="ct">
<div class="lineup">
${lineupLines(0, card({ ambt: 'rgba(59,82,71,.62)', ey: 'Continue watching', logo: 'severance', title: 'Severance',
  meta: `<span>S2 · E3</span>${dot}<span>Who Is Alive?</span>${dot}<span>21 min left</span>${dot}<span>Ends ${ends('20:41', 21)}</span><span class="badge">4K</span>`,
  line: 'Mark, Helly, Irving and Dylan search for answers.', p: '57%',
  acts: `<span class="pill">${ic('play')}Resume</span><span class="ghost">Episodes</span><span class="ghost sq">${ic('dots')}</span><span class="sc">${k('Enter')} plays${dot}right-click for more</span>` }), small)}</div>
${peek('Comedy for you', 'Because you watch Always Sunny, The Office and 12 more', COMEDY.map((f) => poster(f)))}</div>
` + foot;

// ================================================================ 2. Home, game night (Thu 03:12, shield My team)
const gameNight = () => head('Home, game night', '', `
  .field { --away: #12173F; --away-a: #5D76A9; --home: #B9302F; --home-a: #1C1C1C; --split: 80%; }
  .c1 { left: 1170px; top: 150px; --s: 220px; } .c2 { left: 1480px; top: 150px; --s: 220px; } .score { left: 1170px; top: 560px; }`) + `
<div class="field"><div class="away"></div><div class="home"></div><div class="edge"><i></i><i></i></div><div class="shade"></div><div class="shade2"></div></div>
<div class="grain"></div>
` + tbar() + side('Home', { live: false }) + `
<div class="crest c1"><img src="${ART}/mem.png" alt=""><div class="n"><b>Grizzlies</b><span>3-0 · as of tip-off</span></div></div>
<div class="crest c2"><img src="${ART}/por.png" alt=""><div class="n"><b>Trail Blazers</b><span>1-3 · as of tip-off</span></div></div>
<div class="score"><div class="clock"><span class="q">ON NOW</span></div><div class="plate"><span class="s">${EYE}Score hidden</span></div></div>
<div class="ct"><div class="lineup">
` + card({ sharp: true, ambt: 'rgba(18,23,63,.72)', ey: `Game night ${live()}`, title: 'Grizzlies at Trail Blazers',
  meta: `<span>On now</span>${dot}<span>ESPN</span><span class="badge">4K</span>${dot}${EYE}<span>Score hidden</span>`,
  line: '3rd in the West · 3 in a row · as of tip-off',
  acts: `<span class="pill">${ic('play')}Watch live</span><span class="ghost">${ic('start')}From tip-off</span><span class="ghost">${ic('grid')}Multiview</span><span class="ghost sq">${ic('dots')}</span>` }) +
`  <div class="e"><div class="t">Severance<small>Continue${dot}S2 · E3${dot}21 min left</small></div></div>
  <div class="e"><div class="t">Slow Horses<small>New episodes${dot}S6 · E4<span class="count">3 new</span></small></div></div>
  <div class="e"><div class="t">It’s Always Sunny<small>Short${dot}S18 · E10${dot}25 min</small></div></div>
</div>
` + peek('Tonight in the NBA', '6 games · 2 live · 2 final · 2 later', [
  gameCard({ a: 'MEM', h: 'POR', ra: '3-0', rh: '1-3', st: 'Your team', live: true, ch: 'ESPN · 4K', pl: { hid: true }, mine: true }),
  gameCard({ a: 'DEN', h: 'OKC', ra: '3-1', rh: '4-0', live: true, st: 'Q3 4:12', ch: 'Prime Video', pl: { sc: ['88', '84'] } }),
  gameCard({ a: 'BOS', h: 'NY', ra: '4-1', rh: '2-3', st: 'Final', ch: '', pl: { fin: ['112', '104'] } }),
  gameCard({ a: 'DAL', h: 'HOU', ra: '1-4', rh: '3-1', st: 'Final', ch: '', pl: { fin: ['109', '118'] } }),
]) + `</div>\n` + foot;

// ================================================================ 3. Live: the guide (Wed 20:41, window 20:30 to 23:30, 5 px a minute)
const PXM = 5, T0 = 20 * 60 + 30;
const mins = (t) => { const [h, m] = t.split(':').map(Number); let v = h * 60 + m; if (v < T0 - 240) v += 1440; return v; };
const cell = (s, e, title, o = {}) => { const l = Math.max(0, (mins(s) - T0) * PXM), r = Math.min(900, (mins(e) - T0) * PXM); if (r <= 0 || l >= 900) return '';
  const w = r - l; const early = mins(s) < T0; const now = mins(s) <= mins('20:41') && mins(e) > mins('20:41');
  const p = now ? Math.round(((mins('20:41') - mins(s)) / (mins(e) - mins(s))) * 100) : 0;
  const sil = w < 56;
  return `<div class="gcell${o.hov ? ' hov' : ''}${o.none ? ' none' : ''}${sil ? ' sil' : ''}" style="--l:${l}px;--w:${w}px">${sil ? '' : `<div class="tt">${esc(title)}${o.live ? live(true) : ''}</div><div class="tx">${early ? `${ic('chevL')}` : ''}<span>${w < 170 ? s : `${s}${dot}${e}`}</span>${o.kept && w > 200 ? `<span class="badge">kept</span>` : ''}</div>`}${now ? `<div class="pb" style="--p:${p}%"><i></i></div>` : ''}</div>`; };
const CH = [
  { no: 1, nm: 'RÚV', tc: '#0B5C8A', tile: 'RÚV', star: true, cells: [['20:35', '20:55', 'Kastljós'], ['20:55', '21:10', 'Fréttir og veður'], ['21:10', '22:00', 'Taskmaster'], ['22:00', '22:40', 'Kiljan'], ['22:40', '23:00', 'Fréttir'], ['23:00', '23:40', 'Skaupið: upphitun']] },
  { no: 2, nm: 'Stöð 2', tc: '#5A2D81', tile: 'S2', cells: [['20:05', '20:45', 'Ísland í dag'], ['20:45', '22:05', 'The Voice Ísland'], ['22:05', '22:55', 'Ráðherrann'], ['22:55', '23:40', 'Fréttir og Sportpakkinn']] },
  { no: 4, nm: 'NBA League Pass 4', tc: '#1D428A', tile: 'NL', pin: true, cells: [['20:00', '21:00', 'NBA Today', { kept: true }], ['21:00', '22:30', 'NBA GameTime'], ['22:30', '23:00', 'Celtics at Knicks · Pregame'], ['23:00', '01:30', 'Celtics at Knicks', { hov: true }]] },
  { no: 12, nm: 'ESPN', tc: '#B22222', tile: 'ES', star: true, cells: [['20:00', '21:00', 'SportsCenter'], ['21:00', '22:00', 'NFL Live'], ['22:00', '23:00', 'NBA Countdown'], ['23:00', '01:30', 'Celtics at Knicks']] },
  { no: 33, nm: 'NBA TV', tc: '#1D428A', tile: 'NT', star: true, cells: [['20:30', '21:30', 'GameTime'], ['21:30', '23:00', 'Hardwood Classics: 1995 Finals G6'], ['23:00', '01:30', 'Mavs at Rockets']] },
  { no: 31, nm: 'TNT Sports 1', tc: '#2D2B35', tile: 'TS', cells: [['20:00', '22:00', 'Europa League', { live: true }], ['22:00', '23:00', 'Europa League: Goals Show'], ['23:00', '01:00', 'Boxing: Fight Night']] },
  { no: 40, nm: 'Sky Sports Main Event', tc: '#1F3A8A', tile: 'SS', cells: [['19:45', '22:00', 'Europa League', { live: true }], ['22:00', '23:30', 'Sky Sports News']] },
  { no: 52, nm: 'Sýn Sport', tc: '#2D5A27', tile: 'SÝ', cells: [['19:45', '21:45', 'Enski deildabikarinn', { live: true }], ['21:45', '22:30', 'Markaþáttur'], ['22:30', '00:00', 'NBA: Celtics – Knicks']] },
  { no: 60, nm: 'Sky Cinema Action', tc: '#3D2B1F', tile: 'SA', cells: [['19:00', '21:00', 'Collateral', { kept: true }], ['21:00', '23:50', 'Heat', { kept: true }]] },
  { no: 101, nm: 'BBC One', tc: '#8B0A1A', tile: 'BO', cells: [['20:30', '21:00', 'Panorama'], ['21:00', '22:00', 'Silent Witness'], ['22:00', '22:30', 'BBC News at Ten'], ['22:30', '23:10', 'Newsnight'], ['23:10', '00:10', 'Film: Heat']] },
  { no: 204, nm: 'CNN International', tc: '#7A1F1F', tile: 'CI', cells: [['20:30', '23:30', 'No guide information', { none: true }]] },
];
const liveGuide = () => head('Live: the guide') + tbar() + side('Live') + `<div class="ct">
<div class="gh"><span class="chip sel">${ic('list')}Favourites <span class="n">10</span></span><span class="chip">All channels</span><span class="chip">Sports</span><span class="chip">Iceland</span><span class="chip">UK</span><span class="chip">News</span><span class="chip">Movies</span><span class="chip">${ic('chevD')}12 more</span>
  <span class="r"><span class="ctl">${ic('chevL')}</span><span class="ctl now">Now</span><span class="ctl">${ic('chevR')}</span><span class="ctl">${ic('cal')}Wed 28 Oct${ic('chevD')}</span><span class="ctl">${ic('zoom')}3 h${ic('chevD')}</span></span></div>
<div class="guide" style="--gw:1180px">
  <div class="ruler"><span class="nowf" style="--l:55px">Now</span>${['21:00', '21:30', '22:00', '22:30', '23:00'].map((t, i) => `<span style="--l:${(i + 1) * 150 - 18}px">${t}</span>`).join('')}</div>
  <div class="nowline" style="--l:55px"></div>
${CH.map((c, i) => `  <div class="grow" style="--i:${i}"><div class="gch" style="--tc:${c.tc}"><span class="no">${c.no}</span><span class="tile">${c.tile}</span><span class="nm">${c.nm}</span>${c.pin ? ic('pin', 'pin') : c.star ? ic('star') : ''}</div>${c.cells.map((x) => cell(x[0], x[1], x[2], x[3] || {})).join('')}</div>`).join('\n')}
</div>
<div class="gpanel">
  <div class="pv">${tfield('BOS', 'NY', 110)}<span class="tag">${ic('clock')}Tips off in 2 h 19 min</span></div>
  <h3>Celtics at Knicks</h3>
  <div class="f"><span>NBA League Pass 4</span>${dot}<span>23:00 to 01:30</span>${dot}<span>Wed 28 Oct</span><span class="badge">HD</span></div>
  <div class="f"><span>Boston 3-1</span>${dot}<span>New York 2-2</span>${dot}<span>Madison Square Garden</span></div>
  <p>Boston's first visit to the Garden this season. Also on ESPN in 4K: airglow picks the best copy when you tune.</p>
  <div class="acts"><span class="pill">${ic('bell')}Remind me</span><span class="ghost">${ic('play')}Tune now</span><span class="ghost">${ic('grid')}Multiview</span><span class="ghost sq">${ic('dots')}</span></div>
  <div class="also">Also on <b>12 ESPN</b> · 4K${dot}<b>52 Sýn Sport</b> · 22:30</div>
  <div class="also" style="margin-top:22px">Earlier on this channel${dot}replays for 3 days</div>
  <div class="list"><div><span>${ic('chevL')}</span><b>NBA Today</b><span>20:00</span><span class="r">kept · 1 h</span></div><div><span>${ic('chevL')}</span><b>Inside Stuff</b><span>19:30</span><span class="r">kept · 30 min</span></div><div><span>${ic('chevL')}</span><b>Lakers at Warriors</b><span>Tue 03:00</span><span class="r">kept · 2 h 30</span></div></div>
</div>
</div>
` + foot;

// ================================================================ 4. NBA hub (Wed 20:41, pre-game, tip-off 02:00)
const nbaHub = (over = '') => head('NBA: the hub') + tbar() + side('NBA') + `<div class="ct">
<div class="sec"><span class="chip sel">Games</span><span class="chip"><span class="cr"><img src="${ART}/mem.png" alt=""></span>Grizzlies</span><span class="chip">Standings</span><span class="chip">Leaders</span><span class="chip">Team stats</span><span class="chip">News</span><span class="r">ESPN · 20:41</span></div>
<div class="hero">
  <div class="ey"><b>Your team</b><span>NBA</span><span>Tip-off</span></div>
  <div class="tp a" style="--tp:${pal('MEM').p};--ta:${pal('MEM').a};--tc:#F3EFE6"><span class="cr"><img src="${ART}/mem.png" alt=""></span><span class="nm"><b>Grizzlies</b><span>3-0 · 1st in the Southwest</span></span></div>
  <div class="vs">VS</div>
  <div class="tp h" style="--tp:${pal('POR').p};--ta:${pal('POR').a};--tc:#F3EFE6"><span class="cr"><img src="${ART}/por.png" alt=""></span><span class="nm"><b>Trail Blazers</b><span>1-3 · 12th in the West</span></span></div>
  <div class="acts"><span class="pill lg">${ic('bell')}Remind me</span><span class="ghost lg">${ic('grid')}Add to multiview</span><span class="ghost lg">${ic('score')}Last game</span><span class="ghost lg sq">${ic('dots')}</span></div>
  <div class="capt">Tips off in 5 h 19 min · ESPN in 4K, NBA League Pass 4<br>Remind me is a Windows notification 10 min before,<br>even when airglow is closed</div>
  <div class="slab"><span class="big">02:00</span><span class="sm">Tip-off · Thu, late</span></div>
</div>
<div class="days"><span class="chip">${ic('chevL')}Tue</span><span class="chip sel">Today${dot}Wed 28 Oct</span><span class="chip">Thu${ic('chevR')}</span><span class="r">6 games · none started · tip-off order</span></div>
<div class="gcards">${SLATE.map((g, i) => gameCard({ ...g, hov: i === 0 })).join('')}</div>
</div>
${over}` + foot;

// ================================================================ 5. The title page (Severance)
const EPS = [
  [1, 'Hello, Ms. Cobel', '58 min', 'Mark returns to work after a bereavement; a new hire refuses to settle in.', { seen: true }],
  [2, 'Goodbye, Mrs. Selvig', '56 min', 'Helly goes to extremes to resign. Devon and Ricken host a gathering.', { seen: true }],
  [3, 'Who Is Alive?', '21 min left', 'Mark, Helly, Irving and Dylan search for answers.', { cur: true, p: '57%' }],
  [4, 'Woe’s Hollow', '55 min', 'The team takes an outdoor retreat and learns of Kier’s twin.', { hov: true }],
  [5, 'Trojan’s Horse', '49 min', 'Mark looks for help beyond the severed floor.', {}],
];
const MORE = ['lastofus', 'mindhunter', 'andor', 'mrrobot', 'darkmatter', 'silo', 'black', 'devs'].filter((f) => fs.existsSync(path.join(root, '..', 'home-final', 'art', `${f}-poster.jpg`)));
const MLT = ['ozark', 'mindhunter', 'narcos', 'tokyovice', 'justified', 'topboy', 'gomorrah', 'nightof'];
const titlePage = () => head('A title page: Severance') + picture('severance-bg.jpg', '76% 20%', cap('severance', 0.26)) + tbar() + side('Series') + `<div class="ct">
<div class="dcol">
  <div class="ey">Series${dot}Thriller · Sci-fi · Drama${dot}Apple TV+</div>
  <img class="logo" src="${ART}/severance-logo.png" alt="Severance">
  <div class="meta"><span class="star">${ic('star', 'fill')}8.7</span>${dot}<span>2022–</span>${dot}<span>2 seasons · 19 episodes</span>${dot}<span class="badge">TV-MA</span><span class="badge fill">4K HDR</span><span class="badge fill">5.1</span>${dot}<span>Icelandic subtitles</span></div>
  <p>Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives. When a mysterious colleague appears outside of work, it begins a journey to discover the truth about their jobs.</p>
  <div class="cred">Created by Dan Erickson · Adam Scott, Britt Lower, Zach Cherry, John Turturro, Tramell Tillman, Patricia Arquette</div>
  <div class="acts"><span class="pill lg">${ic('play')}Resume S2 · E3</span><span class="ghost lg">${ic('bookmark')}Saved</span><span class="ghost lg">${ic('cc')}Icelandic</span><span class="ghost lg">${ic('copy')}Copies · best of 3</span><span class="ghost lg sq">${ic('dots')}</span></div>
  <div class="cl">${ic('check')}<span>4K HDR, 5.1 · best of 3 copies · from Northlight · Icelandic subtitles found · plays in mpv</span></div>
</div>
<div class="eps">
  <div class="hd"><span class="chip">Season 1</span><span class="chip sel">Season 2</span><span class="n">10 episodes · 7 left</span></div>
${EPS.map(([n, name, dur, line, o]) => `  <div class="ep${o.cur ? ' cur' : ''}${o.hov ? ' hov' : ''}"><div class="st${o.seen ? ' seen' : ''}"><img src="${ART}/severance-bg.jpg" alt=""><span class="no">${n}</span>${o.seen ? `<span class="ok">${ic('check')}</span>` : ''}${o.p ? `<div class="pb" style="--p:${o.p}"><i></i></div>` : ''}</div><div class="tx"><b>${name}<small>${dur}</small></b><span>${line}</span></div><span class="pl${o.cur || o.hov ? '' : ' g'}">${ic('play')}</span></div>`).join('\n')}
</div>
<div class="mlt"><div class="hd">More like this<span>Same kind of thing · Thriller · Drama</span></div><div class="g">${MLT.map((f) => poster(f)).join('')}</div></div>
<div class="note" style="right:48px;bottom:14px">Episode stills: the mock reuses the backdrop (open item)</div>
</div>
` + foot;

// ================================================================ 6. The player: a film / episode, controls up (Wed 20:41, Severance S2 E3)
const hint = (items) => `<div class="pv-hint">${items.map(([kk, t]) => `<span>${kk.map((x) => k(x, true)).join('')}${t}</span>`).join('')}</div>`;
const rowLeft = (o) => `<span class="disc">${ic('pause')}</span><span class="disc">−10</span><span class="disc">+10</span>${o}`;
const rowRight = () => `<span class="disc">${ic('cc')}</span><span class="vol"><span class="disc">${ic('vol')}</span><span class="sl" style="--p:72%"><i></i></span><span>72</span></span><span class="disc">${ic('settings')}</span><span class="disc">${ic('pip')}</span><span class="disc">${ic('expand')}</span>`;
const playerFilm = (over = '') => head('The player: an episode, controls up') + `<div class="frame"><img src="${ART}/severance-bg.jpg" alt=""><div class="cap"></div></div>
<div class="pv-st"></div><div class="pv-sb"></div>
<div class="wco"><i>${ic('min')}</i><i>${ic('max')}</i><i>${ic('close')}</i></div>
<div class="pv-top"><img class="logo" src="${ART}/severance-logo.png" alt="Severance"><div class="sub"><span>S2 · E3</span>${dot}<span>Who Is Alive?</span><span class="badge fill">4K</span><span class="badge fill">HDR</span></div><div class="what">${ic('check')}4K HDR, 5.1 · best of 3 copies · Icelandic subtitles · mpv, hardware decoding</div></div>
<div class="pv-corner"><div class="l1">Ends at ${ends('20:41', 21)}</div><div class="l2">21 min left</div></div>
<div class="pv-row">${rowLeft(`<span class="ppill hov">Next episode ${ic('chevR')}<span class="lab"></span></span>`)}<span class="sp"></span>${rowRight()}</div>
<div class="pv-track" style="--p:57%"><div class="ln"></div><div class="pd"></div><div class="th"></div><div class="bub" style="--l:40%">24:00</div></div>
<div class="pv-ends"><span class="l">34:10</span><span class="r">−25:50</span></div>
${hint([[['Space'], 'Pause'], [['←', '→'], '10 s'], [['↑', '↓'], 'Volume'], [['F'], 'Full screen'], [['P'], 'Mini player'], [['G'], 'Game panel'], [['?'], 'All shortcuts']])}
<div class="note" style="right:48px;bottom:36px">The pointer rests on the track at 24:00 · frame thumbnails come later (thumbfast)</div>
${over}` + foot;

// ================================================================ 7. The player: the game live with the box score docked (Thu 03:12, revealed)
const BOX = [
  ['T. Jerome', 'G', '26', '18', '3', '5', '7-12'], ['J. Wells', 'F', '24', '11', '4', '2', '4-9'], ['C. Boozer', 'F', '25', '12', '9', '3', '5-11'], ['C. Coward', 'F', '21', '8', '6', '1', '3-7'], ['Z. Edey', 'C', '19', '6', '8', '0', '3-4'],
  ['J. Grant', 'F', '14', '3', '2', '1', '1-5'], ['S. Pippen Jr.', 'G', '12', '0', '1', '4', '0-3'], ['G. Jackson', 'F', '9', '0', '2', '0', '0-2'],
];
const playerGame = () => head('The player: the game, the box score beside it', '', `.pa { left: 0; top: 112px; width: 1520px; height: 855px; } .pa > * { position: absolute; }`) + `
<div class="pa">
<div class="frame">${tfield('MEM', 'POR', 300, '<span class="standin">The picture is a stand-in for the broadcast.</span>')}</div>
<div class="pv-st"></div><div class="pv-sb"></div>
<div class="pv-top"><div class="ttl">Grizzlies at Trail Blazers</div><div class="sub"><span>ESPN</span>${dot}<span>Thu 29 Oct · late</span><span class="badge fill">4K</span>${dot}${live()}</div><div class="what">${ic('check')}Best of 3 channels · 4K · 42 s score delay, synced to the picture</div></div>
<div class="pv-corner"><div class="l1">Q3 4:12</div><div class="l2">Synced · the score waits 42 s for the picture</div></div>
<div class="pv-row"><span class="disc">${ic('pause')}</span><span class="disc">${ic('start')}</span><span class="disc">−1m</span><span class="disc">+1m</span><span class="ppill">Skip to Q4 ${ic('chevR')}</span><span class="sp"></span><span class="ppill hov">${ic('score')}Game panel</span><span class="disc">${ic('cc')}</span><span class="disc">${ic('vol')}</span><span class="disc">${ic('settings')}</span><span class="disc">${ic('pip')}</span><span class="disc">${ic('expand')}</span></div>
<div class="pv-track" style="--p:70%"><div class="ln"></div><div class="pd"></div><div class="ahead" style="--w:29%"></div><div class="tk" style="--l:0"></div><div class="tk" style="--l:22%"></div><div class="tk" style="--l:44%"></div><div class="tk" style="--l:56%"></div><div class="live" style="--l:70.6%"></div><div class="th" style="--p:70%"></div></div>
<div class="pv-ends"><span class="ch" style="--l:2%">Tip-off</span><span class="ch" style="--l:22%">Q2</span><span class="ch" style="--l:44%">Half</span><span class="ch cur" style="--l:56%">Q3</span>${live(true).replace('class="', 'style="--l:72.5%" class="')}<span class="r">${EYE}Ends when the game ends</span></div>
${hint([[['Space'], 'Pause'], [['←', '→'], '1 min'], [['End'], 'Back to live'], [['G'], 'Hide the panel'], [['P'], 'Mini player'], [['Ctrl', 'Shift', 'S'], 'Send to the other screen'], [['?'], 'All shortcuts']])}
</div>
<div class="wco"><i>${ic('min')}</i><i>${ic('max')}</i><i>${ic('close')}</i></div>
<div class="dock">
  <div class="hd">Game panel<span class="x">${k('G', true)}${ic('close')}</span></div>
  <div class="scp"><span class="tm" style="--te:${pal('MEM').a}"><span class="cr"><img src="${ART}/mem.png" alt=""></span><b>58</b></span><span class="mid"><b>Q3 4:12</b><span>as aired · 42 s behind</span></span><span class="tm" style="--te:${pal('POR').a}"><b>61</b><span class="cr"><img src="${ART}/por.png" alt=""></span></span></div>
  <div class="tabs"><span class="sel">Box score</span><span>Plays</span><span>Quarters</span><span>Feeds</span></div>
  <div class="tt"><span class="sel">Grizzlies</span><span>Trail Blazers</span></div>
  <table class="box"><tr><th>Player</th><th>Min</th><th>Pts</th><th>Reb</th><th>Ast</th><th>FG</th></tr>
  <tr class="hd"><td colspan="6">Starters</td></tr>
${BOX.slice(0, 5).map((r) => `  <tr><td>${r[0]}<small>${r[1]}</small></td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6]}</td></tr>`).join('\n')}
  <tr class="hd"><td colspan="6">Bench</td></tr>
${BOX.slice(5).map((r) => `  <tr><td>${r[0]}<small>${r[1]}</small></td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6]}</td></tr>`).join('\n')}
  <tr class="tot"><td>Grizzlies</td><td></td><td>58</td><td>35</td><td>16</td><td>23-53</td></tr>
  </table>
  <div class="ft">Updates with the picture, 42 s behind the broadcast. Reveal is one place: Account › NBA. The numbers are stand-ins for a live box score.</div>
</div>
` + foot;

// ================================================================ 8. Multiview (Thu 03:12): four mpv instances, audio follows the click
const tile = (x, y, inner, cls = '') => `<div class="tile ${cls}" style="left:${x}px;top:${y}px">${inner}</div>`;
const lab = (a, h, mid, right, o = {}) => `<div class="lab"><span class="cr"><img src="${crestSrc(a)}" alt=""></span><b>${SHORT[a] || NAMES[a]}</b>${mid}<b>${SHORT[h] || NAMES[h]}</b><span class="cr"><img src="${crestSrc(h)}" alt=""></span><span class="r">${right}</span></div>`;
const multiview = () => head('Multiview: four games, audio follows the click') + tbar() + side('NBA', { live: true }) + `<div class="ct">
<div class="mvbar"><b>Multiview</b><span>4 of 4 slots</span>${dot}<span>Your provider allows 4 streams · 3 in use</span>${dot}<span>Audio: Grizzlies at Trail Blazers</span>
  <span class="r"><span class="lay"><i>${ic('lay2')}</i><i>${ic('lay13')}</i><i class="sel">${ic('grid')}</i></span><span class="ghost">${ic('plus')}Add a game or channel</span><span class="ghost">${ic('expand')}Full screen</span><span class="ghost sq">${ic('close')}</span></span></div>
${tile(48, 68, `${tfield('MEM', 'POR', 160)}<span class="no">1</span><span class="spk">${ic('vol')}Audio</span>${lab('MEM', 'POR', `<span class="sc">·</span>`, `${EYE}Score hidden${dot}ESPN · 4K${dot}${live(true)}`)}`, 'aud')}
${tile(844, 68, `${tfield('DEN', 'OKC', 160)}<span class="no">2</span><span class="hv"><i>${ic('vol')}</i><i>${ic('expand')}</i><i>${ic('close')}</i></span>${lab('DEN', 'OKC', `<span class="sc">88 – 84</span>`, `Q3 4:12${dot}Prime Video${dot}${live(true)}`)}`)}
${tile(48, 519, `${tfield('DAL', 'HOU', 160)}<span class="no">3</span>${lab('DAL', 'HOU', `<span class="sc">109 – 118</span>`, `Final${dot}post-game${dot}NBA League Pass`)}`)}
${tile(844, 519, `<div class="w"><div class="cs"><i><img src="${crestSrc('LAC')}" alt=""></i><i><img src="${crestSrc('SAC')}" alt=""></i></div><b>Clippers at Kings</b><span>Tips off at 03:30 · in 18 min · this slot tunes NBA League Pass by itself</span><div class="acts"><span class="ghost">${ic('play')}Tune now</span><span class="ghost">${ic('close')}Clear slot</span></div></div>`, 'wait')}
<div class="note" style="left:48px;bottom:14px">Drag a game card or a channel row onto a slot; 1–4 picks the audio; double-click a tile to expand it. The pictures are stand-ins for the broadcasts.</div>
</div>
` + foot;

// ================================================================ 9. The mini player over Home's rows (Thu 03:14, the game kept in the corner)
const ROWS = ['Comedy for you', 'Tonight in the NBA', 'Popular films', 'Anime comedy', 'Popular series', 'Crime dramas', 'Because you watched Always Sunny', 'Your shows', 'New this year', 'Something different', 'Top rated', 'In Icelandic', 'Saved', 'Browse your library', 'Channels'];
const index = (cur) => { const i = ROWS.indexOf(cur); const win = ROWS.slice(Math.max(0, i - 2), i + 4); const rest = ROWS.length - (Math.max(0, i - 2) + win.length);
  return `<div class="index">${win.map((n) => `<span class="${n === cur ? 'cur' : ''}">${n}</span>`).join('')}${rest ? `<span class="dim">${rest} more</span>` : ''}</div>\n`; };
const miniOverHome = () => head('The mini player over Home') + picture('palmsprings-bg.jpg', '72% 46%', cap('palmsprings', 0.22)) + `<div class="sr"></div><div class="sb"></div>` + tbar() +
side('Home', { live: true, np: `<div class="np"><div class="pic">${tfield('MEM', 'POR', 56)}</div><div class="t">Grizzlies at Trail Blazers<small>In the corner · ESPN · Score hidden</small></div></div>` }) + `<div class="ct">
<div class="column">
  <img class="logo" src="${ART}/palmsprings-logo.png" alt="Palm Springs">
  <div class="meta"><span>2020</span>${dot}<span>Comedy · Romance</span>${dot}<span>1h 30m</span>${dot}<span>Ends 04:44</span>${dot}<span>IMDb 7.4</span>${dot}<span>Northlight · 4K</span></div>
  <div class="line">Stuck in a time loop, two wedding guests develop a flirtation while loop-dependently living the same day over and over.</div>
  <div class="acts"><span class="pill">${ic('play')}Play now</span><span class="ghost">Details</span><span class="ghost">${ic('bookmark')}Save</span><span class="ghost sq">${ic('dots')}</span><span class="sc">${k('Enter')} opens Details${dot}${k('Shift')}${k('Enter')} plays</span></div>
</div>
${index('Comedy for you')}
<div class="row"><div class="rt">Comedy for you<span>Because you watch Always Sunny, The Office and 12 more</span><span class="sa">See all ${ic('chevR')}</span></div><div class="cards">${COMEDY.slice(0, 8).map((f, i) => poster(f, { hov: i === 0 })).join('')}<div class="arrow" style="right:0">${ic('chevR')}</div></div></div>
<div class="row next"><div class="rt">Tonight in the NBA<span>6 games · 2 live · 2 final · 2 later</span></div><div class="cards">${[
  gameCard({ a: 'MEM', h: 'POR', ra: '3-0', rh: '1-3', st: 'Your team', live: true, ch: 'ESPN · 4K', pl: { hid: true } }),
  gameCard({ a: 'DEN', h: 'OKC', ra: '3-1', rh: '4-0', live: true, st: 'Q3 4:12', ch: 'Prime Video', pl: { sc: ['88', '84'] } }),
  gameCard({ a: 'BOS', h: 'NY', ra: '4-1', rh: '2-3', st: 'Final', ch: '', pl: { fin: ['112', '104'] } }),
  gameCard({ a: 'DAL', h: 'HOU', ra: '1-4', rh: '3-1', st: 'Final', ch: '', pl: { fin: ['109', '118'] } }),
].join('')}</div></div>
</div>
<div class="mini">${tfield('MEM', 'POR', 120, '<span class="standin" style="right:12px;bottom:56px;font-size:11px">Stand-in for the broadcast</span>')}
  <div class="top"><span>${live(true)}</span><span>ESPN · 4K</span><span class="r"><i>${ic('pin')}</i><i>${ic('close')}</i></span></div>
  <div class="bar"><div class="t">Grizzlies at Trail Blazers<small>${'Score hidden · Q3 as aired · 42 s behind'}</small></div><i>${ic('pause')}</i><i>${ic('vol')}</i><i>${ic('expand')}</i></div>
</div>
<div class="note" style="left:1440px;top:300px;width:432px;text-align:right">The mini player (bottom right) is a window of its own, always on top, 480 × 270 here; drag it anywhere, snap it to a corner, resize it from any edge</div>
` + foot;

// ================================================================ 10. The command palette (Ctrl K) over the hub
const pr = (ico, name, sub, right, sel) => `<div class="pr${sel ? ' sel' : ''}">${ico}<span>${name}</span>${sub ? `<span class="sub">${sub}</span>` : ''}<span class="r">${right}</span></div>`;
const palette = () => nbaHub(`<div class="dimall"></div>
<div class="pal">
  <div class="fld">${ic('search')}<span>gri</span><span class="cursor"></span><span class="ph">zzlies</span><span class="r">${k('Esc')}</span></div>
  <div class="grp"><div class="gl">Actions</div>
  ${pr(`<span class="ico">${ic('play')}</span>`, 'Watch Grizzlies at Trail Blazers', 'tonight 02:00 · ESPN 4K · pre-game from 23:00', `<span class="act">Remind me</span>${k('Enter')}`, true)}
  ${pr(`<span class="ico">${ic('grid')}</span>`, 'Add Grizzlies at Trail Blazers to multiview', 'a slot that tunes at tip-off', `${k('Ctrl')}${k('M')}`)}
  ${pr(`<span class="ico">${ic('bell')}</span>`, 'Remind me 10 min before tip-off', 'a Windows notification, even when airglow is closed', `${k('R')}`)}</div>
  <div class="grp"><div class="gl">Teams</div>
  ${pr(`<span class="ico"><img src="${ART}/mem.png" alt=""></span>`, 'Grizzlies', 'team page · 3-0 · 1st in the Southwest', `${k('Ctrl')}${k('3')}`)}</div>
  <div class="grp"><div class="gl">Channels</div>
  ${pr(`<span class="ico ch" style="--tc:#1D428A">NL</span>`, '4 · NBA League Pass 4', 'NBA GameTime · until 22:30', `<span class="act">Tune</span>${k('Enter')}`)}
  ${pr(`<span class="ico ch" style="--tc:#2D5A27">SÝ</span>`, '52 · Sýn Sport', 'NBA: Celtics – Knicks · 22:30', `<span class="act">Tune</span>`)}</div>
  <div class="grp"><div class="gl">Films and series</div>
  ${pr(`<span class="ico ch">GM</span>`, 'Grizzly Man', '2005 · Documentary · 1h 43m · IMDb 7.8', `<span class="act">Details</span>`)}
  ${pr(`<span class="ico ch">TG</span>`, 'The Grizzlies', '2018 · Drama · 1h 44m', `<span class="act">Details</span>`)}</div>
  <div class="grp"><div class="gl">Settings</div>
  ${pr(`<span class="ico">${ic('eyeOff')}</span>`, 'Spoiler shield', 'My team', `${k('Ctrl')}${k(',')}`)}</div>
  <div class="pf"><span>${k('↑')}${k('↓')} Move</span><span>${k('Enter')} Open</span><span>${k('Shift')}${k('Enter')} Play now</span><span>${k('Esc')} Close</span><span style="margin-left:auto">Type a channel number to tune</span></div>
</div>
`);

// ================================================================ 11. The shortcuts sheet (?) over the player
const SG = [
  [['Everywhere', [['Search and commands', ['Ctrl', 'K']], ['Search', ['/']], ['This sheet', ['?']], ['Sections, Home to Saved', ['Ctrl', '1–6']], ['Back · forward', ['Alt', '←', '→']], ['Sidebar', ['Ctrl', 'B']], ['Settings', ['Ctrl', ',']], ['Full-screen window', ['F11']], ['Mini player', ['P']], ['Multiview', ['Ctrl', 'Shift', 'M']], ['Tune a channel', ['0–9']]]],
   ['Browsing', [['Move', ['↑', '↓', '←', '→']], ['Open', ['Enter']], ['Play now', ['Shift', 'Enter']], ['Save', ['S']], ['Not interested', ['X']], ['Menu', ['Shift', 'F10'], 'right-click'], ['Next · previous row', ['PgDn', 'PgUp']], ['Top of Home', ['Home']], ['Scroll a row', ['Shift', 'wheel']]]]],
  [['The player', [['Play · pause', ['Space', 'K'], 'click'], ['10 s back · forward', ['←', '→', 'J', 'L']], ['1 min', ['Shift', '←', '→']], ['Volume', ['↑', '↓'], 'wheel'], ['Mute', ['M']], ['Full screen', ['F'], 'double-click'], ['Subtitles · audio', ['C', 'A']], ['Quality', ['Q']], ['Speed', ['[', ']']], ['Options', ['O']], ['Game panel', ['G']], ['Next episode', ['N']], ['Skip intro · recap', ['Enter'], 'when offered'], ['Hide the controls', ['Esc']], ['Close the player', ['Ctrl', 'W']]]],
   ['Live TV', [['Zap', ['PgUp', 'PgDn']], ['Channel number', ['0–9']], ['Last channel', ['Backspace']], ['Channels · groups', ['L', 'Shift', 'L']], ['Pause live', ['Space']], ['Back to live', ['End']], ['From the start', ['Home']], ['Reveal the score', ['Ctrl', 'Shift', 'R']]]]],
  [['The guide', [['Along time', ['←', '→'], 'drag'], ['Channels', ['↑', '↓'], 'wheel'], ['A page', ['PgUp', 'PgDn']], ['Back to now', ['N']], ['Day', ['D']], ['Zoom the time scale', ['Ctrl', 'wheel']], ['Tune', ['Enter']], ['From the start', ['Shift', 'Enter']], ['Favourite', ['F']], ['Remind me', ['R']]]],
   ['Multiview', [['Add from any card', ['Ctrl', 'M'], 'drag'], ['Audio to a tile', ['1–4']], ['Expand a tile', ['Shift', '1–4'], 'double-click'], ['Remove a tile', ['Del']], ['Layout', ['Ctrl', 'L']], ['Swap tiles', [], 'drag'], ['Leave', ['Esc']]]],
   ['Windows and screens', [['Always on top', ['Ctrl', 'Shift', 'T']], ['Send to the other screen', ['Ctrl', 'Shift', 'S']], ['Snap the mini player', ['Ctrl', '←', '→']], ['Minimise to the tray', ['Ctrl', 'Shift', 'H']], ['Media keys', ['⏯', '⏮', '⏭'], 'from any app']]]],
];
const shortcuts = () => playerFilm(`<div class="dimall"></div>
<div class="sheet">
  <div class="hd">Keyboard shortcuts<small>Windows · the same words as the TV's remote</small><span class="r">Print${k('Ctrl')}${k('P')}${k('Esc')}</span></div>
  <div class="cols">${SG.map((col) => `<div>${col.map(([t, rows]) => `<div class="sg"><h4>${t}</h4>${rows.map(([n, keys, extra]) => `<div>${n}<span class="ks">${keys.map((x) => k(x)).join('')}${extra ? `<small>${keys.length ? 'or' : ''} ${extra}</small>` : ''}</span></div>`).join('')}</div>`).join('')}</div>`).join('')}</div>
</div>
`);

// ---------- write ----------
const pages = {
  '01-home-evening.html': homeEvening(false),
  '02-home-gamenight.html': gameNight(),
  '03-live-guide.html': liveGuide(),
  '04-nba-hub.html': nbaHub(),
  '05-title-series.html': titlePage(),
  '06-player-episode.html': playerFilm(),
  '07-player-game-panel.html': playerGame(),
  '08-multiview.html': multiview(),
  '09-mini-player.html': miniOverHome(),
  '10-palette.html': palette(),
  '11-shortcuts.html': shortcuts(),
  '12-home-1366.html': homeEvening(true),
};
for (const [f, html] of Object.entries(pages)) { fs.writeFileSync(path.join(root, f), html); console.log('wrote', f); }
