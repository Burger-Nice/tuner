// node tools/build.js   -> writes the mock pages (*.html) next to SPEC.md from data.json (real ESPN data, 26 Oct 2026).
// Every mock is the 960 x 540 canvas, linking the app's real CSS (tokens, ui.css, app.css) plus pages.css.
// Focus is marked with the kit classes: .f (ring + lift), .f-ring (ring only), .f-in (inset ring, dense rows).
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
const NOW = Date.parse(D.now);
const ME = 'MEM';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const T = (a) => D.teams[a];

// ---------- icons (app/tv/js/util.js, plus bell and injury for these pages) ----------
const P = {
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>', chevR: '<path d="M9 5l7 7-7 7"/>', chevL: '<path d="M15 5l-7 7 7 7"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7a13 13 0 0 1-2.4 3.7M6.4 6.6A13 13 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  wifiOff: '<path d="M2.5 9a15 15 0 0 1 19 0M5.5 12.8a10.5 10.5 0 0 1 13 0M8.8 16.4a5.5 5.5 0 0 1 6.4 0M12 20h.01M3 3l18 18"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5"/>', score: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M12 5.5v13M6.5 10h2.5M15 10h2.5M6.5 14h2.5M15 14h2.5"/>',
  star: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9z"/>', sort: '<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 2.2H4.4z"/><path d="M10 21a2.2 2.2 0 0 0 4 0"/>',
  inj: '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M12 8v8M8 12h8"/>', grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
const dot = '<span class="dot-sep"></span>';
const liveP = (c) => `<span class="a-live${c ? ' compact' : ''}">Live</span>`;
const crest = (a, s = '') => `<span class="team ${s}"><img src="img/logo-${a}.png" alt=""></span>`;

// ---------- team colours: app/tv/js/util.js teamPalette, verbatim rules ----------
const TEAM_COLORS = { ATL: ['#E03A3E', '#C1D32F'], BOS: ['#007A33', '#BA9653'], BKN: ['#000000', '#FFFFFF'], CHA: ['#1D1160', '#00788C'], CHI: ['#CE1141', '#FFFFFF'], CLE: ['#860038', '#FDBB30'], DAL: ['#00538C', '#B8C4CA'], DEN: ['#0E2240', '#FEC524'], DET: ['#C8102E', '#1D42BA'], GS: ['#1D428A', '#FFC72C'], HOU: ['#CE1141', '#C4CED4'], IND: ['#002D62', '#FDBB30'], LAC: ['#C8102E', '#1D428A'], LAL: ['#552583', '#FDB927'], MEM: ['#5D76A9', '#F5B112'], MIA: ['#98002E', '#F9A01B'], MIL: ['#00471B', '#EEE1C6'], MIN: ['#0C2340', '#78BE20'], NO: ['#0C2340', '#C8102E'], NY: ['#006BB6', '#F58426'], OKC: ['#007AC1', '#EF3B24'], ORL: ['#0077C0', '#C4CED4'], PHI: ['#006BB6', '#ED174C'], PHX: ['#1D1160', '#E56020'], POR: ['#E03A3E', '#FFFFFF'], SAC: ['#5A2D81', '#63727A'], SA: ['#000000', '#C4CED4'], TOR: ['#CE1141', '#A1A1A4'], UTAH: ['#002B5C', '#F9A01B'], WSH: ['#002B5C', '#E31837'] };
const lin = (x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => { const [r, g, b] = rgb(h).map((v) => lin(v / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const CHALK = '#F3EFE6', INK = '#14101F';
const darken = (h, f) => '#' + rgb(h).map((v) => Math.round(v * f).toString(16).padStart(2, '0')).join('');
function pal(a) {
  let [p, s] = TEAM_COLORS[a]; let f = 1;
  while (Math.max(ratio(lum(CHALK), lum(p)), ratio(lum(INK), lum(p))) < 4.5 && f > 0.4) { f -= 0.04; p = darken(TEAM_COLORS[a][0], f); }
  return { p, a: s, fg: ratio(lum(CHALK), lum(p)) >= ratio(lum(INK), lum(p)) ? CHALK : INK };
}
const tvars = (a) => { const c = pal(a); return `--tp:${c.p};--ta:${c.a};--tc:${c.fg}`; };
const edge = (a) => `<span class="tedge" style="background:${pal(a).a}"></span>`;

// ---------- time (the owner's TV: Atlantic/Reykjavik = UTC all year) ----------
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const hm = (t) => { const d = new Date(t); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
const night = (t) => new Date(Date.parse(t) - 6 * 3600e3);                       // a 01:00 tip-off belongs to the evening before
const dlabel = (t) => { const d = night(t); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
const isTonight = (t) => night(t).toISOString().slice(0, 10) === night(D.now).toISOString().slice(0, 10);
const tipLine = (t) => { const d = new Date(t), n = night(t); return d.getUTCDate() !== n.getUTCDate() && !isTonight(t) ? `${DAYS[d.getUTCDay()]} ${hm(t)}` : hm(t); };
const inMin = (t) => { const m = Math.round((Date.parse(t) - NOW) / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`; };
const ago = (t) => { const m = Math.round((NOW - Date.parse(t)) / 60000); return m < 60 ? `${Math.max(1, m)} min ago` : m < 24 * 60 ? `${Math.round(m / 60)} h ago` : 'Yesterday'; };
const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

// ---------- page shell ----------
function topbar({ hide = false, focus = '' } = {}) {
  if (hide) return '';
  const tabs = [['search', 'Search'], ['home', 'Home'], ['live', 'Live'], ['nba', 'NBA'], ['movie', 'Movies'], ['series', 'Series'], ['saved', 'Saved']];
  return `<div class="topbar" data-row="topbar"><img src="../../../app/tv/brand/assets/mark-small.svg" class="mk" alt=""><div class="tabs">${tabs.map(([k, l]) => `<span class="tab${k === 'search' ? ' srch' : ''}${k === 'nba' ? ' sel' : ''}${focus === k ? ' f-ring' : ''}">${k === 'search' ? ic('search') : ''}${l}</span>`).join('')}</div><div class="tb-r"><span class="avatar">B</span></div></div>`;
}
const pages = [];
function page(file, title, body, note) {
  const html = `<!doctype html>
<html lang="en" class="tv"><head><meta charset="utf-8"><meta name="viewport" content="width=960,height=540"><meta name="mock-size" content="960x540@2">
<title>${esc(title)}</title>
<link rel="stylesheet" href="../../../app/tv/brand/fonts.css"><link rel="stylesheet" href="../../../app/tv/brand/tokens.css">
<link rel="stylesheet" href="../../../app/tv/ui.css"><link rel="stylesheet" href="../../../app/tv/app.css"><link rel="stylesheet" href="pages.css">
</head><body><div class="screen">
${body}
</div></body></html>
`;
  fs.writeFileSync(path.join(root, file), html);
  pages.push({ file, title, note });
}

// ---------- the NBA tab's section row ----------
const SECS = [['games', 'Games'], ['standings', 'Standings'], ['leaders', 'Leaders'], ['teamstats', 'Team stats'], ['news', 'News'], ['team', 'Grizzlies']];
function secRow(sel, { focus = '', shield = false, meta = 'ESPN · 23:37' } = {}) {
  return `<div class="nb-sec" data-row>${SECS.map(([k, l]) => `<span class="chip lg${k === sel ? ' sel' : ''}${k === focus ? ' f-ring' : ''}" data-sec="${k}">${k === 'team' ? crest(ME, 's24') : ''}${l}</span>`).join('')}<span class="meta">${shield ? `${ic('eyeOff')}<span>Shield: My team</span>` : `<span>${meta}</span>`}</span></div>`;
}

// ---------- Games (the existing hub, moved under the section row) ----------
const sbGame = (id) => D.tonight.find((g) => g.id === id);
const clockText = (g) => { const m = /([\d:.]+) - (\d)/.exec(g.detail); return m ? `Q${m[2]} ${m[1]}` : g.detail; };
function gameCard(g, { f = false, shield = false } = {}) {
  const hidden = shield && (g.away.abbr === ME || g.home.abbr === ME) && g.state !== 'pre';
  const st = g.state === 'in' ? `${liveP()}<span>${clockText(g)}</span>` : g.state === 'post' ? '<span>Final</span>' : `<span>In ${inMin(g.date)}</span>`;
  const plate = g.state === 'pre' ? `<span class="plate"><span class="x"><span class="score sm">${hm(g.date)}</span><span class="t-cap">tip-off</span></span></span>`
    : hidden ? `<span class="plate"><span class="x">${ic('eyeOff')}<span class="t-cap">hidden</span></span></span>`
    : `<span class="plate"><span class="x"><span class="score md">${g.away.score}</span><span class="score md">${g.home.score}</span></span></span>`;
  const tr = (s) => `<div class="tr${T(s.abbr).name.length > 10 ? ' long' : ''}">${edge(s.abbr)}${crest(s.abbr)}<span class="nm">${esc(T(s.abbr).name)}</span><span class="rc">${hidden ? '' : esc(s.rec)}</span></div>`;
  return `<div class="gc${f ? ' f' : ''}" data-key="g:${g.id}"><div class="st">${st}<span class="tvn">${esc(g.tv[0] || '')}</span></div>${tr(g.away)}${tr(g.home)}${plate}</div>`;
}
function hubHero(g) {
  const side = (a, right) => `<div class="side${right ? ' r' : ''}" style="${tvars(a)}">${right ? '' : crest(a, 'lg')}<div${right ? ' style="text-align:right"' : ''}><div class="nm">${esc(T(a).name)}</div><div class="rc">${esc((a === g.away.abbr ? g.away : g.home).rec)}</div></div>${right ? crest(a, 'lg') : ''}</div>`;
  const d = Math.round((Date.parse(g.date) - NOW) / 60000);
  return `<div class="hero-plate" style="top:128px">
  <div class="abs row-flex" style="left:24px;top:12px;gap:12px;height:24px"><span class="t-label" style="color:var(--a-pink-text)">Your team</span><span class="t-label t-2">NBA${dot}Tip-off</span></div>
  <div class="mt">${side(g.away.abbr)}<div class="sc"><span class="score md">VS</span></div>${side(g.home.abbr, 1)}</div>
  <div class="abs row-flex hero-btns" data-row style="left:24px;top:132px;gap:16px;width:572px"><span class="btn">${ic('play')}Watch pre-game</span><span class="btn2">Box score</span><span class="t-cap clamp2" style="margin-left:4px;line-height:18px;flex:1;min-width:0">On NBA League Pass 4<br>Hold OK for 2 more channels</span></div>
  <div class="slabbox" style="left:619px;width:243px"><div class="slabfill"></div><div class="slabcontent ink"><span class="big">${d} MIN</span><span class="cap">Tip-off ${hm(g.date)}</span></div></div>
</div>`;
}
// The hub keeps its v1.2 hero (192 high at y 128); the day chips move from above it to under it (y 332), so the
// section row costs the grid only 12 px (368 -> 380).
function gamesBody({ focusChip = '', menu = false } = {}) {
  const mine = sbGame('401909875');
  const rest = D.tonight.filter((g) => g !== mine).sort((a, b) => (a.state === 'in' ? 0 : 1) - (b.state === 'in' ? 0 : 1) || Date.parse(a.date) - Date.parse(b.date));
  return `${secRow('games', { focus: focusChip })}
  ${hubHero(mine)}
  <div class="nb-days" data-row style="top:332px"><span class="chip lg">${ic('chevL')}Sun</span><span class="chip lg sel">Today${dot}Mon 26 Oct</span><span class="chip lg">Tue${ic('chevR')}</span><span class="t-cap">8 more games${dot}4 live${dot}live first</span></div>
  <div class="nba-grid" data-grid data-cols="3" style="top:380px">${rest.slice(0, 3).map((g, i) => gameCard(g, { f: menu && i === 1 })).join('')}</div>`;
}

// ---------- Standings ----------
const conf = (s) => D.standings.confs.find((c) => c.short === s);
const ROW = 32, BAND = 28;
function standItems(c) {
  const out = [];
  c.teams.forEach((t, i) => { if (i === 6) out.push({ band: 'Play-in tournament · 7 to 10' }); if (i === 10) out.push({ band: 'Outside the play-in' }); out.push({ t }); });
  let y = 0; for (const it of out) { it.y = y; y += it.band ? BAND : ROW; }
  return { items: out, h: y };
}
const liveNow = new Set(D.tonight.filter((g) => g.state === 'in').flatMap((g) => [g.away.abbr, g.home.abbr]));
function standRow(t, { f = false } = {}) {
  const mine = t.abbr === ME, gb = t.gb === '-' ? '–' : t.gb;
  return `<div class="nb-tr${mine ? ' mine' : ''}${f ? ' f-in' : ''}" data-key="tm:${t.abbr}">${mine ? edge(ME) : ''}<span class="c c-seed">${t.seed}</span><span class="c-crest">${crest(t.abbr, 's24')}</span><span class="c-nm"><span class="nm">${esc(T(t.abbr).full)}</span>${liveNow.has(t.abbr) ? liveP(1) : ''}</span><span class="c c-w b">${t.w}</span><span class="c c-w">${t.l}</span><span class="c c-pct">${t.pct}</span><span class="c c-gb dim">${gb}</span><span class="c c-st">${t.streak}</span><span class="c c-l10">${t.l10}</span><span class="c c-ha dim">${t.home}</span><span class="c c-ha dim">${t.road}</span></div>`;
}
const standHead = (top) => `<div class="nb-th" style="top:${top}px"><span class="c c-seed" style="color:inherit;font-weight:inherit">#</span><span class="c-crest"></span><span class="c-nm">TEAM</span><span class="c c-w">W</span><span class="c c-w">L</span><span class="c c-pct">PCT</span><span class="c c-gb">GB</span><span class="c c-st">STRK</span><span class="c c-l10">L10</span><span class="c c-ha">HOME</span><span class="c c-ha">ROAD</span></div>`;
// a table body that only ever shows whole rows: rows that don't fit are not drawn (the scroll bar says there is more)
function tableBody({ items, h }, top, bottom, scroll, render, { left = 48, width = 852 } = {}) {
  const vh = bottom - top;
  const vis = items.filter((it) => it.y >= scroll && it.y + (it.band ? BAND : it.rh || ROW) <= scroll + vh);
  const inner = vis.map((it) => `<div style="position:absolute;left:0;right:0;top:${it.y - scroll}px">${render(it)}</div>`).join('');
  const bar = h > vh ? `<div class="nb-sbar" style="top:${top}px;height:${vh}px"><i style="top:${(scroll / h) * vh}px;height:${(vh / h) * vh}px"></i></div>` : '';
  return `<div class="nb-tb" data-col style="top:${top}px;height:${vh}px;left:${left}px;width:${width}px">${inner}</div>${bar}`;
}
function standingsBody({ c = 'West', focus = '', chipFocus = false, scrolled = false, shield = false, down = false } = {}) {
  const S = standItems(conf(c));
  const render = (it) => (it.band ? `<div class="nb-band">${it.band}<i></i></div>` : standRow(it.t, { f: it.t.abbr === focus }));
  if (scrolled) {
    const fi = S.items.find((it) => it.t?.abbr === focus);
    let sc = Math.max(0, Math.min(S.h - 433, fi.y + ROW + ROW - 433));
    sc = S.items.find((it) => it.y >= sc).y;                                       // snap: the top row is always whole
    return `<div class="nb-cover"></div><div class="nb-ctx">NBA${dot}<b>Standings</b>${dot}${c}ern Conference${dot}2026-27</div>${standHead(52)}${tableBody(S, 80, 513, sc, render)}`;
  }
  const legend = down ? `<span class="legend" style="gap:10px">${ic('wifiOff', 'sm')}<span>ESPN isn't answering${dot}showing 22:51</span><span class="pillbtn f-ring">${ic('refresh')}Try again</span></span>`
    : `<span class="legend">1 to 6 make the playoffs${dot}7 to 10 play in${dot}${liveP(1)} playing now</span>`;
  return `${secRow('standings', { shield, meta: down ? 'ESPN · 22:51' : undefined })}
  <div class="nb-sub" data-row><span class="chip lg${c === 'West' ? ' sel' : ''}${chipFocus ? ' f-ring' : ''}">West</span><span class="chip lg${c === 'East' ? ' sel' : ''}">East</span>${legend}</div>
  ${standHead(168)}${tableBody(S, 194, 513, 0, render)}`;
}
// The shield variant: the West table as it was before the result you haven't seen (a copy airglow kept), labelled.
function standingsShield() {
  const W = JSON.parse(JSON.stringify(conf('West')));
  const mem = W.teams.find((t) => t.abbr === 'MEM'), sac = W.teams.find((t) => t.abbr === 'SAC');
  Object.assign(mem, { w: 2, l: 0, pct: '1.000', gb: '-', streak: 'W2', l10: '2-0', road: '1-0' });
  Object.assign(sac, { w: 0, l: 2, pct: '.000', gb: '2', streak: 'L2', l10: '0-2', home: '0-1' });
  for (const t of W.teams) if (t.abbr !== 'MEM' && t.abbr !== 'SAC') { /* copies kept before Sun's games: only the two rows the hidden game changed differ in this mock */ }
  W.teams.sort((a, b) => parseFloat(b.pct) - parseFloat(a.pct) || b.w - a.w);
  W.teams.forEach((t, i) => (t.seed = i + 1));
  const S = standItems(W);
  const render = (it) => (it.band ? `<div class="nb-band">${it.band}<i></i></div>` : standRow(it.t, { f: false }));
  return `${secRow('standings', { shield: true })}
  <div class="nb-sub" data-row><span class="chip lg sel">West</span><span class="chip lg">East</span>
   <span class="legend" style="gap:10px">${ic('eyeOff', 'sm')}<span><b style="color:var(--a-text-1);font-weight:650">As of before Grizzlies at Kings</b>${dot}1 result hidden</span><span class="pillbtn f-ring">Reveal results</span></span></div>
  ${standHead(168)}${tableBody(S, 194, 513, 0, render)}`;
}

// ---------- Leaders ----------
const LCATS = [['pts', 'Points', 'PTS'], ['reb', 'Rebounds', 'REB'], ['ast', 'Assists', 'AST'], ['stl', 'Steals', 'STL'], ['blk', 'Blocks', 'BLK'], ['3pm', '3-pointers', '3PM'], ['fg', 'Field goal %', 'FG%']];
const POS = { G: 'Guard', F: 'Forward', C: 'Center', PG: 'Point guard', SG: 'Shooting guard', SF: 'Small forward', PF: 'Power forward' };
function leadersBody({ cat = 'pts', focusCat = true, focusRow = -1 } = {}) {
  const L = D.leaders[cat], c = LCATS.find((x) => x[0] === cat);
  const cats = LCATS.map(([k, l, s]) => `<div class="nb-cat${k === cat ? ' sel' : ''}${k === cat && focusCat ? ' f-ring' : ''}">${l}<small>${s}</small></div>`).join('');
  const top = L[0];
  const lead = `<div class="nb-lead${focusRow === 0 ? ' f-ring' : ''}"><div class="pl" style="${tvars(top.abbr)}"></div><img class="hs" src="img/head-${top.id}.png" alt="">${crest(top.abbr, 's32')}
    <div class="tx"><div class="rk">1st in the NBA</div><div class="nm">${esc(top.name)}</div><div class="mt2">${esc(T(top.abbr).full)}${dot}${POS[top.pos] || top.pos}</div></div>
    <div class="v"><b>${top.value}</b><span>${c[2]} PER GAME</span></div></div>`;
  let rk = 1;
  const rows = L.slice(1).map((p, i) => { const prev = L[i]; const r = prev.value === p.value ? rk : (rk = i + 2); const mine = p.abbr === ME;
    return `<div class="nb-tr${mine ? ' mine' : ''}${focusRow === i + 1 ? ' f-in' : ''}">${mine ? edge(ME) : ''}<span class="c c-rk">${r}</span><span class="c-crest" style="margin-left:12px">${crest(p.abbr, 's24')}</span><span class="c-nm"><span class="nm">${esc(p.name)}</span></span><span class="c c-tm">${esc(T(p.abbr).name)}</span><span class="c c-val">${p.value}</span></div>`; }).join('');
  return `${secRow('leaders')}<div class="nb-cats" data-col>${cats}</div><div class="nb-catnote" style="top:428px">Per game, 2026-27.<br>ESPN's qualified players.</div>${lead}<div class="nb-lrows" data-col>${rows}</div>`;
}

// ---------- Team stats ----------
const shortStat = { avgPoints: 'per game', opp_avgPoints: 'per game', avgRebounds: 'per game', avgAssists: 'per game', fieldGoalPct: '%', threePointFieldGoalPct: '%', avgThreePointFieldGoalsMade: 'per game', avgSteals: 'per game', avgBlocks: 'per game', avgTurnovers: 'per game' };
const rankOf = (m, a) => { const r = m.rows.find((x) => x.abbr === a); return (r.tie ? 'T-' : '') + ord(r.rank); };
function teamStatsBody({ key = 'avgAssists' } = {}) {
  const m = D.teamStats.find((x) => x.key === key);
  const cats = D.teamStats.map((x) => `<div class="nb-cat${x.key === key ? ' sel f-ring' : ''}">${x.label}<small>${rankOf(x, ME)}</small></div>`).join('');
  const vals = m.rows.map((r) => r.v), lo = Math.min(...vals), hi = Math.max(...vals);
  const items = m.rows.map((r, i) => ({ r, y: i * 30, rh: 30 }));
  const mi = m.rows.findIndex((r) => r.abbr === ME), first = Math.max(0, Math.min(m.rows.length - 11, mi - 5));
  const render = (it) => { const r = it.r, w = 18 + (82 * (m.high ? r.v - lo : hi - r.v)) / (hi - lo || 1);
    return `<div class="nb-tr${r.abbr === ME ? ' mine' : ''}" style="height:30px">${r.abbr === ME ? edge(ME) : ''}<span class="c c-rk" style="width:36px">${r.tie ? 'T-' : ''}${r.rank}</span><span class="c-crest" style="margin-left:12px">${crest(r.abbr, 's24')}</span><span class="c-nm"><span class="nm">${esc(T(r.abbr).full)}</span></span><span class="c-bar"><i style="width:${w.toFixed(1)}%"></i></span><span class="c c-val">${r.v.toFixed(1)}</span></div>`; };
  const unit = /%/.test(m.label) ? m.label.toUpperCase() : m.label.toUpperCase() + ' A GAME';
  return `${secRow('teamstats')}<div class="nb-cats" data-col>${cats}</div>
  <div class="nb-th" style="top:128px;left:272px;width:628px"><span class="c c-rk" style="width:36px;color:inherit;font-weight:inherit">#</span><span class="c-crest" style="margin-left:12px"></span><span class="c-nm">TEAM</span><span class="c c-val" style="width:auto;font:inherit">${unit}</span></div>
  ${tableBody({ items, h: items.length * 30 }, 156, 156 + 11 * 30, first * 30, render, { left: 272, width: 628 })}`;
}
// ---------- News ----------
const typeLabel = { Story: 'Story', HeadlineNews: 'News', Preview: 'Preview', Recap: 'Recap' };
const who = (n) => (n.teams.length && n.teams.length <= 3 ? T(n.teams[0]).name : 'NBA');
// the shield rule (SPEC 6.3): a story is covered when it is tagged with a hidden game, or with your team (or one of its
// players) and published after the tip-off of your team's earliest unseen final; league round-ups (6+ teams) only when
// the headline or summary names your team or one of its players.
const HIDDEN_FINAL = '401909867', HIDDEN_TIP = Date.parse('2026-10-26T01:00Z');
const myIds = new Set(D.roster.MEM.map((p) => p.id)), myNames = ['Grizzlies', 'Memphis', ...D.roster.MEM.map((p) => p.name)];
function covered(n) {
  if (n.events.includes(HIDDEN_FINAL)) return true;
  if (Date.parse(n.published) < HIDDEN_TIP) return false;
  const named = myNames.some((x) => (n.headline + ' ' + n.description).includes(x));
  if (n.teams.length >= 6) return named;
  return n.teams.includes(ME) || n.athletes.some((a) => myIds.has(a)) || named;
}
function newsBody({ shield = false, focus = 0 } = {}) {
  const L = D.news.league.slice(0, 6);
  const rows = L.map((n, i) => { const cov = shield && covered(n);
    return `<div class="nb-nrow${i === focus ? ' f-ring' : ''}${cov ? ' cov' : ''}">${cov ? `<b>${ic('eyeOff', 'sm').replace('class="ic sm"', 'class="ic sm" style="width:16px;height:16px;vertical-align:-3px;margin-right:6px"')}A Grizzlies story${dot.replace('dot-sep', 'dot-sep" style="margin:0 6px')}hidden by the spoiler shield</b>` : `<b>${esc(n.headline)}</b>`}<div class="m">${cov ? `<span>${ago(n.published)}</span>` : `<span>${esc(who(n))}</span>${dot}<span>${ago(n.published)}</span>`}</div></div>`; }).join('');
  const n = L[Math.max(0, focus)], cov = shield && covered(n);
  const prev = cov ? `<div class="nb-prev"><div class="ph"><div class="nb-cov">${ic('eyeOff')}<span>Hidden until you reveal<br>Grizzlies at Kings</span></div></div><div class="lb">${ago(n.published)}</div><h2>A story about a Grizzlies result you haven't seen</h2><p>OK opens it with the result hidden. Reveal the Kings game first (hold OK) to read it.</p></div>`
    : `<div class="nb-prev"><div class="ph">${n.image ? `<img src="img/news-${n.id}.jpg" alt="">` : ''}</div><div class="lb"><span>${typeLabel[n.type] || 'News'}</span>${dot}<span>${ago(n.published)}</span>${n.byline ? `${dot}<span>${esc(n.byline)}</span>` : ''}</div><h2>${esc(n.headline)}</h2><p>${esc(n.description)}</p></div>`;
  return `${secRow('news', { shield })}<div class="nb-nlist" data-col>${rows}</div>${prev}`;
}
function readerBody() {
  const n = D.news.league[0], s = D.stories[n.id];
  const ps = s.paras.slice(0, 4).map((p, i) => `<p${i === 0 ? ' class="lede"' : ''}>${esc(p)}</p>`).join('');
  return `${newsBody({ focus: -1 })}<div class="scrim"></div><div class="nb-read"><div class="vp nb-scroll"><div class="in fx" tabindex="-1" data-col><div class="ph"><img src="img/news-${n.id}.jpg" alt=""></div><div class="bd"><div class="lb"><span class="tag">${typeLabel[n.type]}</span><span>${ago(n.published)}</span>${dot}<span>6 min read</span></div><h1>${esc(s.headline)}</h1><div class="by">${esc(n.byline)}${dot.replace('dot-sep', 'dot-sep" style="margin:0 8px')}ESPN</div>${ps}</div></div></div><div class="fade"></div><div class="rbar"><i style="top:0;height:44px"></i></div><div class="foot"><span>Back closes</span>▼ More</div></div>`;
}
// ---------- Team page ----------
const sched = (a) => D.sched[a];
const standOf = (a) => { for (const c of D.standings.confs) { const t = c.teams.find((x) => x.abbr === a); if (t) return { ...t, conf: c.short }; } };
const DIV = { MEM: 'Southwest', UTAH: 'Northwest' };
function teamHeader(a, { mine = true, shield = false, focus = 'remind' } = {}) {
  const s = standOf(a), t = T(a), games = sched(a), next = games.find((g) => g.state !== 'post');
  const seen = shield ? games.filter((g) => g.state === 'post' && g.id !== HIDDEN_FINAL) : null;
  const rec = shield ? `${seen.filter((g) => g.win).length}-${seen.filter((g) => !g.win).length}` : `${s.w}-${s.l}`;
  const opp = T(next.opp), vs = next.home ? 'vs' : 'at';
  const recBlock = shield
    ? `<div class="big">${rec}</div><div><div class="l1">1 result hidden</div><div class="l2 row-flex" style="gap:6px">${ic('eyeOff', 'sm').replace('class="ic sm"', 'class="ic sm" style="width:16px;height:16px"')}Kings game unseen</div></div>`
    : `<div class="big">${rec}</div><div><div class="l1">${ord(s.seed)} in the ${s.conf}</div><div class="l2">${s.streak}${dot}${esc(D.standing[a].replace(' Division', ''))}</div></div>`;
  const tip = isTonight(next.date) ? 'Tonight' : dlabel(next.date);
  const tv = next.tv.filter((x) => !/^DAZN|App$|\+|\.com/.test(x))[0] || next.tv[0];
  const more = next.tv.filter((x) => !tv.includes(x)).slice(0, 2);
  return `<div class="nb-head">
  <div class="st">${mine ? '<span class="t-label" style="color:var(--a-pink-text)">Your team</span>' : ''}<span class="t-label t-2">2026-27${dot}Regular season</span></div>
  <div class="nb-plate" style="${tvars(a)}">${crest(a, 'xl')}<div><div class="loc">${esc(t.loc)}</div><div class="nk">${esc(t.name)}</div></div></div>
  <div class="nb-rec">${recBlock}</div>
  <div class="nb-next"><span class="t-label">Next${dot}${tip}</span><div class="mu">${crest(next.opp, 's28')}<span>${hm(next.date)} ${vs} ${esc(opp.name)}</span></div><div class="tv">${esc(tv)}</div></div>
  <div class="nb-btns" data-row><span class="btn${focus === 'remind' ? ' f' : ''}">${ic('bell')}Remind me</span><span class="btn2${focus === 'game' ? ' f' : ''}">Game page</span><span class="t-cap clamp2">Tips off in ${inMin(next.date)}${more.length ? `<br>Also on ${esc(more.join(' and '))}` : ''}</span></div>
</div>`;
}
function tile(a, g, { f = false, shield = false } = {}) {
  const o = T(g.opp), vs = g.home ? 'vs' : 'at', nextG = sched(a).find((x) => x.state !== 'post');
  const isNext = g === nextG;
  let r;
  if (g.state === 'post') r = shield && g.id === HIDDEN_FINAL ? `<span class="nb-hid">${ic('eyeOff')}Result hidden</span>` : `<b class="${g.win ? '' : 'l'}">${g.win ? 'W' : 'L'}</b><b class="${g.win ? '' : 'l'}" style="font-weight:650">${g.us}–${g.them}</b>`;
  else r = `<span>${tipLine(g.date)}${dot}${esc((g.tv.find((x) => /League Pass|ESPN|TNT|ABC|NBA TV|Prime|NBC/.test(x)) || g.tv[0] || '').replace('NBA League Pass', 'League Pass'))}</span>`;
  const d = isNext && isTonight(g.date) ? '<span class="n">Tonight</span><span>Next</span>' : `<span>${dlabel(g.date)}</span>`;
  return `<div class="nb-gt${isNext ? ' next' : ''}${f ? ' f' : ''}" data-key="g:${g.id}"><div class="d">${d}</div><div class="o">${crest(g.opp, 's32')}<span>${vs} ${esc(o.name)}</span></div><div class="r">${r}</div></div>`;
}
// the schedule is one rail, oldest left: it opens on the next game in the third slot, with the last two results to its left
function schedRail(a, top, { focusId = null, shield = false } = {}) {
  const g = sched(a), ni = g.findIndex((x) => x.state !== 'post');
  const fi = focusId ? g.findIndex((x) => x.id === focusId) : ni;
  const start = Math.max(0, Math.min(fi - 2, g.length - 4));
  const vis = g.slice(start, start + 5);
  return `<div class="nb-rail rail" data-row style="top:${top - 10}px;margin-top:0">${vis.map((x) => tile(a, x, { f: focusId != null && x.id === focusId, shield })).join('')}</div>`;
}
const RANKS = ['avgPoints', 'opp_avgPoints', 'avgRebounds', 'threePointFieldGoalPct', 'avgBlocks', 'avgAssists', 'fieldGoalPct', 'avgSteals', 'avgTurnovers'];
function rankRail(a, top, { shield = false } = {}) {
  return `<div class="nb-rail rail" data-row style="top:${top - 10}px;margin-top:0;gap:16px">${RANKS.map((k) => { const m = D.teamStats.find((x) => x.key === k), r = m.rows.find((x) => x.abbr === a);
    return `<div class="nb-rk"><div class="k">${m.label}</div>${shield ? `<div class="o" style="font:500 14px/30px var(--a-font-text)"><span class="nb-hid">${ic('eyeOff')}Hidden</span></div><div class="v">Reveal to see</div>` : `<div class="o">${r.tie ? 'T-' : ''}${ord(r.rank)}</div><div class="v">${r.v.toFixed(1)}${/%/.test(m.label) ? '%' : ' a game'}</div>`}</div>`; }).join('')}</div>`;
}
function teamFirst(a, { mine = true, focus = 'remind', focusTile = null, shield = false, tools = '' } = {}) {
  const g = sched(a), played = g.filter((x) => x.state === 'post').length;
  const s = standOf(a);
  const sum = shield ? `${played - 1} seen${dot}1 hidden${dot}${g.length - played} to go` : `${s.w}-${s.l}${dot}${g.length - played} to go`;
  return `${mine ? secRow('team', { shield, focus: focus === 'chip' ? 'team' : '' }) : tools}
  ${teamHeader(a, { mine, shield, focus })}
  <div class="nb-title" style="top:324px">Schedule<small>${sum}${dot}◀ results${dot}▶ coming up</small></div>
  ${schedRail(a, 360, { focusId: focusTile, shield })}
  <div class="nb-title" style="top:480px">Season ranks<small>${shield ? 'hidden: they include a result you haven\'t seen' : 'out of 30 teams'}</small></div>`;
}
function rosterRows(a, { shield = false } = {}) {
  const ps = D.players[a], R = D.roster[a];
  const played = ps.map((p) => ({ ...p, r: R.find((x) => x.id === p.id) || {} }));
  const dnp = R.filter((x) => !ps.some((p) => p.id === x.id)).map((r) => ({ name: r.name, pos: r.pos, r, gp: 0 }));
  return [...played, ...dnp.sort((x, y) => x.name.localeCompare(y.name))].map((p) => ({ p }));
}
const f1 = (v) => (v == null ? '' : (+v).toFixed(1));
function rosterRow({ p }, { f = false, shield = false } = {}) {
  const n = p.gp ? null : '–';
  const H = (v) => (shield ? `<span class="nb-hid" style="justify-content:flex-end">${ic('eyeOff').replace('class="ic "', 'class="ic" style="width:15px;height:15px"')}</span>` : v);
  const inj = p.r.injury ? `<span class="inj">${ic('inj')}${esc(p.r.injury === 'Day-To-Day' ? 'Day-to-day' : p.r.injury)}</span>` : '';
  return `<div class="nb-tr${f ? ' f-in' : ''}"><span class="c c-no">${esc(p.r.jersey ?? '')}</span><span class="c-nm"><span class="nm" style="font-weight:650">${esc(p.name)}</span><span class="sub">${esc(p.pos)}</span>${inj}${p.gp ? '' : '<span class="sub">Hasn\'t played</span>'}</span><span class="c c-gp">${p.gp || '0'}</span><span class="c c-st5">${n || f1(p.min)}</span><span class="c c-st5 b">${n || H(f1(p.pts))}</span><span class="c c-st5">${n || f1(p.reb)}</span><span class="c c-st5">${n || f1(p.ast)}</span><span class="c c-st5">${n || H(f1(p.fg))}</span><span class="c c-st5">${n || H(f1(p.tp))}</span></div>`;
}
const rosterHead = (top, shield) => `<div class="nb-th" style="top:${top}px"><span class="c c-no" style="color:inherit">#</span><span class="c-nm">PLAYER</span><span class="c c-gp">GP</span><span class="c c-st5">MIN</span><span class="c c-st5">PTS</span><span class="c c-st5">REB</span><span class="c c-st5">AST</span><span class="c c-st5">FG%</span><span class="c c-st5">3P%</span></div>`;
function teamRoster(a, { focusName, shield = false, sheet = '' } = {}) {
  const rows = rosterRows(a, { shield }); const items = rows.map((r, i) => ({ ...r, y: i * 32 }));
  const fi = rows.findIndex((r) => r.p.name === focusName);
  const vh = 513 - 120, n = Math.floor(vh / 32);
  const first = Math.max(0, Math.min(rows.length - n, fi - n + 2));
  return `<div class="nb-cover" style="height:124px;background:linear-gradient(180deg,var(--a-bg-0) 90%,rgba(21,19,29,0))"></div><div class="nb-ctx">NBA${dot}<b>Grizzlies</b>${dot}Roster${dot}18 players</div>
  <div class="nb-title" style="top:52px;width:852px">Roster<small>Season averages${dot}sorted by points</small><span class="pillbtn" style="position:absolute;right:0;top:-4px">${ic('sort')}Sort<b>Points</b></span></div>
  ${rosterHead(92, shield)}${tableBody({ items, h: rows.length * 32 }, 120, 120 + n * 32, first * 32, (it) => rosterRow(it, { f: it.p.name === focusName && !sheet, shield }))}${sheet}`;
}
function playerSheet() {
  const p = D.players.MEM.find((x) => x.name === 'Ty Jerome'), r = D.roster.MEM.find((x) => x.id === p.id);
  return `<div class="scrim"></div><div class="sheet nb-pl" style="gap:0"><div class="top" style="${tvars('MEM')}"><img class="hs" src="img/head-${p.id}.png" alt=""><div class="num">#${r.jersey}</div>${crest('MEM', 's28')}<span style="position:absolute;left:286px;top:81px;font:500 14px/18px var(--a-font-text);color:var(--a-text-2)">Grizzlies</span></div>
  <h3>${esc(p.name)}</h3><div class="t-cap" style="margin-top:2px;color:var(--a-text-2)">Guard${dot}${esc(r.ht)}${dot}${r.age} years${dot}${ord(r.exp + 1)} season</div>
  <div class="sec" style="margin-top:8px">2026-27${dot.replace('dot-sep', 'dot-sep" style="margin:0 6px')}${p.gp} games</div>
  <div class="avg"><div><b>${f1(p.pts)}</b><span>PTS</span></div><div><b>${f1(p.reb)}</b><span>REB</span></div><div><b>${f1(p.ast)}</b><span>AST</span></div><div><b>${f1(p.min)}</b><span>MIN</span></div><div><b>${f1(p.fg)}</b><span>FG%</span></div><div><b>${f1(p.tp)}</b><span>3P%</span></div></div>
  <div class="facts" style="margin-top:8px"><span>College</span>${esc(r.college || '–')}<span>From</span>${esc(r.born || '–')}</div>
  <div class="sheet-foot" data-row style="align-items:flex-start"><span class="btn f" style="transform-origin:0 50%">${ic('star')}1st in the NBA in points</span></div></div>`;
}
function teamOtherTools() {
  return `<div class="nb-tools" data-row><span class="pillbtn">${ic('star')}Make the Jazz my team</span><span class="pillbtn f-ring">${ic('grid')}All teams</span><span class="t-cap">Opened from Standings${dot}Back returns there</span></div>`;
}

function newsCard(n, { shield = false } = {}) {
  const cov = shield && covered(n);
  const ph = cov ? `<div class="nb-cov" style="justify-content:flex-start;padding-top:22px">${ic('eyeOff')}</div>`
    : n.image ? `<img src="img/news-${n.id}.jpg" alt="">` : `<div class="nb-noph">${n.teams.slice(0, 2).map((t) => crest(t)).join('<i>vs</i>')}</div>`;
  return `<div class="nb-nc"${cov ? ' style="background:var(--a-surface-2)"' : ''}>${ph}<div class="tx"${cov ? ' style="background:none"' : ''}><b>${cov ? 'A Grizzlies story, hidden by the spoiler shield' : esc(n.headline)}</b><span>${cov ? ago(n.published) : `${typeLabel[n.type] || 'News'}${' · '}${ago(n.published)}`}</span></div></div>`;
}
function teamScrolled(a, { shield = false, focusRank = 2 } = {}) {
  const ranks = rankRail(a, 92, { shield }).replace(/<div class="nb-rk">/g, (m, i) => m).split('<div class="nb-rk">');
  const rr = ranks[0] + ranks.slice(1).map((x, i) => `<div class="nb-rk${i === focusRank ? ' f' : ''}"${i === focusRank && i === 0 ? ' style="transform-origin:0 50%"' : ''}>` + x).join('');
  const N = D.news[a].slice(0, 4);
  return `<div class="nb-cover"></div><div class="nb-ctx">NBA${dot}<b>${esc(T(a).name)}</b>${dot}Season ranks</div>
  <div class="nb-title" style="top:52px">Season ranks<small>${shield ? 'hidden: they include a result you haven\'t seen' : 'out of 30 teams · OK opens Team stats'}</small></div>
  ${rr}
  <div class="nb-title" style="top:196px">News<small>${shield ? '2 stories hidden by the shield' : 'ESPN · Grizzlies'}</small></div>
  <div class="nb-rail rail" data-row style="top:222px;margin-top:0">${N.map((n) => newsCard(n, { shield })).join('')}</div>
  <div class="nb-title" style="top:405px">Roster<small>18 players${dot}season averages</small></div>
  ${rosterHead(441, shield)}<div class="nb-tb" style="top:469px;height:32px">${rosterRow(rosterRows(a)[0], { shield })}</div>`;
}

// ---------- states ----------
function loadingBody() {
  return `${secRow('team', { focus: 'team', meta: 'Loading…' })}
  <div class="nb-head"><div class="nb-sk b2" style="left:24px;top:14px;width:180px;height:18px;border-radius:8px"></div><div class="nb-sk b2" style="left:24px;top:46px;width:64px;height:64px;border-radius:50%"></div><div class="nb-sk b2" style="left:104px;top:52px;width:220px;height:24px"></div><div class="nb-sk b2" style="left:104px;top:84px;width:140px;height:18px;border-radius:8px"></div><div class="nb-sk b2" style="left:440px;top:52px;width:180px;height:52px"></div><div class="nb-sk b2" style="left:688px;top:52px;width:150px;height:52px"></div><div class="nb-sk b2" style="left:24px;top:128px;width:160px;height:44px;border-radius:999px"></div></div>
  <div class="nb-title" style="top:324px">Schedule<small>Loading from ESPN…</small></div>
  <div class="nb-rail rail" style="top:350px;margin-top:0">${'<div class="nb-gt" style="background:var(--a-surface-1)"></div>'.repeat(5)}</div>`;
}

// ================= the mocks =================
page('nba-entry.html', 'Entry: the NBA tab', topbar() + gamesBody({ focusChip: 'team' }), 'The NBA tab with its new section row; the Grizzlies chip is focused. The hero stays at y 128; the day chips move under it.');
page('nba-card-menu.html', 'Entry: hold OK on a game card', topbar() + gamesBody({ menu: false }) + `<div class="ctxmenu" data-col style="left:356px;top:353px"><div class="lr f-ring">${crest('MIN', 's24')}Timberwolves page</div><div class="lr">${crest('CLE', 's24')}Cavaliers page</div><div class="lr">${ic('score', 'sm').replace('class="ic sm"', 'class="ic sm" style="margin:0 2px"')}Open the game</div></div>`, 'Hold OK on any game card: both team pages are one press away.');
page('standings-top.html', 'Standings: top', topbar() + standingsBody({ chipFocus: true }), 'West first (your conference). Rows 1 to 9 whole, the scroll bar says there is more.');
page('standings-row.html', 'Standings: your row focused', topbar() + standingsBody({ focus: 'MEM' }), 'Inset ring on the Grizzlies row (team bar, surface-1 highlight). OK opens the team page.');
page('standings-scrolled.html', 'Standings: scrolled', standingsBody({ focus: 'SAC', scrolled: true }), 'Past the last visible row the bar and the chips slide away; the column names stay at y 52.');
page('standings-shield.html', 'Standings: shield on', topbar() + standingsShield(), 'Shield on, the Kings game unseen: the West is shown as it was before it, and says so.');
page('leaders.html', 'Leaders: points', topbar() + leadersBody({ cat: 'pts' }), 'Category column (focus switches after 250 ms), the leader on their team plate, 2 to 10 below.');
page('leaders-row.html', 'Leaders: a row focused', topbar() + leadersBody({ cat: 'reb', focusCat: false, focusRow: 3 }), 'Rebounds, Cameron Boozer (your team) focused. OK opens his team page on his roster row.');
page('teamstats.html', 'Team stats: assists', topbar() + teamStatsBody({ key: 'avgAssists' }), 'The column shows your team\'s rank in each; the list scrolls so your team is in view (19th).');
page('news.html', 'News: list and preview', topbar() + newsBody(), 'Headlines on the left, the focused story\'s photo, headline and summary on the right.');
page('news-shield.html', 'News: shield on', topbar() + newsBody({ shield: true, focus: 1 }), 'Stories about a Grizzlies result you haven\'t seen are covered: no photo, no headline.');
page('news-article.html', 'News: the article sheet', topbar() + readerBody(), 'OK on a story: a reading sheet with the full text from ESPN. ▲▼ scroll it, Back closes.');
page('team-top.html', 'Team: top', topbar() + teamFirst('MEM'), 'Your team: plate, record and seed, the next game with Remind me (focused), the schedule rail.');
page('team-schedule.html', 'Team: schedule rail', topbar() + teamFirst('MEM', { focus: '', focusTile: '401909867' }), 'Left from the next game: results. The focused tile stays in the third slot while there is more.');
page('team-ranks.html', 'Team: ranks and news', teamScrolled('MEM'), 'Down from the schedule: the page slides up, the bar steps away. Rank tiles, then the team\'s news, then the roster.');
page('team-shield-news.html', 'Team: shield on, news', teamScrolled('MEM', { shield: true }), 'Shield on: ranks hidden, stories about the unseen game covered (no photo, no headline), PTS and FG% hidden.');
page('team-roster.html', 'Team: roster scrolled', teamRoster('MEM', { focusName: 'Olivier-Maxence Prosper' }), 'Roster with season averages; column names stay at y 92; long names and players who haven\'t played.');
page('team-player.html', 'Team: player sheet', teamRoster('MEM', { focusName: 'Ty Jerome', sheet: playerSheet() }), 'OK on a roster row: the player\'s card. Its one button jumps to the leaders list he is in.');
page('team-shield.html', 'Team: shield on', topbar() + teamFirst('MEM', { shield: true, focus: '', focusTile: '401909867' }), 'Shield on, the Kings game unseen: record as of before it, the tile and the ranks hidden.');
page('team-other.html', 'Team: another team', topbar() + teamFirst('UTAH', { mine: false, focus: '', tools: teamOtherTools() }), 'Any team (from standings, leaders, game cards): the same page in its colours, with Make my team.');
page('state-down.html', 'State: ESPN down', topbar() + standingsBody({ down: true }), 'ESPN not answering: the last copy stays on screen with its time; Try again is the one thing to do.');
page('state-loading.html', 'State: loading', topbar() + loadingBody(), 'First visit, nothing cached: flat blocks in the final layout, focus stays on the chip.');

fs.writeFileSync(path.join(root, 'tools', 'pages.json'), JSON.stringify(pages, null, 1));
console.log(pages.length, 'pages');
