// node tools/build.js   -> writes the catch-up mocks (*.html) next to SPEC.md, and tools/pages.json.
// Every mock is the 960 x 540 canvas linking the app's real CSS (tokens, ui.css, app.css, nba.css) plus catchup.css.
// Focus is marked with the kit classes: .f (ring + lift), .f-ring (ring only), .f-in (inset ring, dense rows).
// The scenario (SPEC 0): the owner's TV, Reykjavik time (UTC all year). Real ESPN schedule from design/ui-v1/nba-pages/data.json;
// the Jazz game's clock times, the provider's channels, guide and videos are illustrative.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
global.window = global; require('../../kit/art.js');   // procedural stand-in art (design/ui-v1/kit), drawn at build time
const Art = global.Art;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- icons (app/tv/js/util.js, plus the ones catch-up adds) ----------
const P = {
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>', pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>', chevL: '<path d="M15 5l-7 7 7 7"/>', chevD: '<path d="M5 9l7 7 7-7"/>', chevU: '<path d="M5 15l7-7 7 7"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7a13 13 0 0 1-2.4 3.7M6.4 6.6A13 13 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5"/>', score: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M12 5.5v13M6.5 10h2.5M15 10h2.5M6.5 14h2.5M15 14h2.5"/>',
  star: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9z" fill="currentColor" stroke="none"/>',
  pin: '<path d="M9 3h6l-1 6 3.5 3.5h-11L10 9zM12 16v5"/>', tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M3 15h18"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17.5 10.2a2.4 2.4 0 1 0 0 3.6"/>',
  audio: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  pic: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 9.5V8h2M17 14.5V16h-2"/>',
  // catch-up: "history" (a clock turning back) marks anything you can watch again; "restart" (bar to the start) jumps to tip-off / the start
  hist: '<path d="M4.2 12a7.8 7.8 0 1 0 2.3-5.5"/><path d="M4 4.5V8h3.5"/><path d="M12 8v4.2l2.8 1.7"/>',
  restart: '<path d="M6 5v14"/><path d="M18 5.5v13L9 12z" fill="currentColor"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
const dot = '<span class="dot-sep"></span>';
const liveP = (c) => `<span class="a-live${c ? ' compact' : ''}">Live</span>`;
const IMG = '../nba-pages/img/';
const crest = (a, s = '') => `<span class="team ${s}"><img src="${IMG}logo-${a}.png" alt=""></span>`;

// ---------- team colours: app/tv/js/util.js teamPalette rules (as nba-pages/tools/build.js) ----------
const TC = { CHA: ['#1D1160', '#00788C'], CLE: ['#860038', '#FDBB30'], GS: ['#1D428A', '#FFC72C'], MEM: ['#5D76A9', '#F5B112'], MIN: ['#0C2340', '#78BE20'], SAC: ['#5A2D81', '#63727A'], UTAH: ['#002B5C', '#F9A01B'], WSH: ['#002B5C', '#E31837'], POR: ['#E03A3E', '#FFFFFF'], BOS: ['#007A33', '#BA9653'], CHI: ['#CE1141', '#FFFFFF'], DAL: ['#00538C', '#B8C4CA'], MIA: ['#98002E', '#F9A01B'] };
const NAME = { CHA: 'Hornets', CLE: 'Cavaliers', GS: 'Warriors', MEM: 'Grizzlies', MIN: 'Timberwolves', SAC: 'Kings', UTAH: 'Jazz', WSH: 'Wizards', POR: 'Trail Blazers', BOS: 'Celtics', CHI: 'Bulls', DAL: 'Mavericks', MIA: 'Heat' };
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

// ---------- time: Reykjavik = UTC ----------
const T = (s) => Date.parse(s);
const hm = (t) => { const d = new Date(t); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
// One formatter for "kept until" (review S2): the archive keeps a replay while its window start (tip-off − 15 min) is
// inside the channel's days; the end reads with the night rule, as game dates do.
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const keptUntil = (tip, days) => { const u = tip - 15 * 60e3 + days * 864e5, n = new Date(u - 6 * 3600e3), late = new Date(u).getUTCHours() < 6; return `${DAYS[n.getUTCDay()]} ${n.getUTCDate()} ${MON[n.getUTCMonth()]}${late ? ' · late' : ''}`; };
const JAZZ_KEPT = keptUntil(Date.parse('2026-10-27T01:00:00Z'), 3), KINGS_KEPT = keptUntil(Date.parse('2026-10-26T01:00:00Z'), 3);
const eyeSm = `<svg class="ic xs" viewBox="0 0 24 24" aria-hidden="true" style="flex:none">${P.eyeOff}</svg>`;
const partial = (r) => `<span class="nb-rp" style="display:inline-flex;align-items:center;gap:4px">${r}${eyeSm}</span>`;

// ---------- page shell ----------
function topbar(sel, { nbaLive = false } = {}) {
  const tabs = [['search', 'Search'], ['home', 'Home'], ['live', 'Live'], ['nba', 'NBA'], ['movie', 'Movies'], ['series', 'Series'], ['saved', 'Saved']];
  return `<div class="topbar" data-row="topbar"><img src="../../../app/tv/brand/assets/mark-small.svg" class="mk" alt=""><div class="tabs">${tabs.map(([k, l]) => `<span class="tab${k === 'search' ? ' srch' : ''}${k === sel ? ' sel' : ''}">${k === 'search' ? ic('search') : ''}${l}${k === 'nba' && nbaLive ? liveP(1) : ''}</span>`).join('')}</div><div class="tb-r"><span class="avatar">${ic('user')}</span></div></div>`;
}
const pages = [];
function page(file, title, body, note, { group = '', shield = false, other = false } = {}) {
  fs.writeFileSync(path.join(root, file), `<!doctype html>
<html lang="en" class="tv"><head><meta charset="utf-8"><meta name="viewport" content="width=960,height=540"><meta name="mock-size" content="960x540@2">${shield ? '\n<meta name="shield" content="unseen">' : ''}
<title>${esc(title)}</title>
<link rel="stylesheet" href="../../../app/tv/brand/fonts.css"><link rel="stylesheet" href="../../../app/tv/brand/tokens.css">
<link rel="stylesheet" href="../../../app/tv/ui.css"><link rel="stylesheet" href="../../../app/tv/app.css"><link rel="stylesheet" href="../../../app/tv/nba.css"><link rel="stylesheet" href="catchup.css">
</head><body><div class="screen">
${other ? body.replace(/class="(gd-head|gd-body|cu-tbar|nv-vtop|gd-tabs)"/g, 'class="$1" data-other="1"') : body}
</div></body></html>
`);
  pages.push({ file, title, note, group });
}

// =====================================================================================================================
// THE GUIDE (SPEC 4)
// =====================================================================================================================
const AXIS = 656, SPAN = 150 * 60e3, PX = AXIS / SPAN;
const NOW = T('2026-10-27T10:40:00Z');
const CH = {
  lp4: { num: 41, name: 'NBA League Pass 4', ini: 'NBA', arc: 3 },
  sky: { num: 402, name: 'Sky Sports Main Event', ini: 'SS', arc: 7 },
  espn: { num: 210, name: 'US: ESPN HD', ini: 'ES', arc: 0 },
  bbc: { num: 101, name: 'BBC One HD', ini: 'BBC', arc: 7 },
  cnn: { num: 115, name: 'CNN International', ini: 'CNN', arc: 0 },
  via: { num: 431, name: 'Viaplay Sport 1', ini: 'VS', arc: 2 },
};
const ROWS = ['lp4', 'sky', 'espn', 'bbc', 'cnn', 'via'];
// One row's cells in the window [W, W + 2.5 h). progs: [start, end, title, extra]; extra.wp = watched %, extra.game = matched game
function cells(W, ch, progs, focus) {
  const E = W + SPAN, x = (t) => Math.round((t - W) * PX);
  if (progs === 'load') return `<div class="g-cell cu-load${focus === 0 ? ' f-in' : ''}" style="left:0;width:${AXIS - 4}px"><b>Loading earlier programmes…</b></div>`;
  return progs.map(([s0, e0, title, ex = {}], i) => {
    const s = Math.max(T(s0), W), e = Math.min(T(e0), E), left = x(s), w = x(e) - left - 4;
    const past = T(e0) <= NOW, isNow = T(s0) <= NOW && T(e0) > NOW;
    const kept = past && ch.arc && !ex.gone;
    const cls = ['g-cell', isNow ? 'now' : '', past ? (kept ? 'cu-rp' : 'cu-gone') : '', focus === i ? 'f-in' : ''].filter(Boolean).join(' ');
    const sub = ex.sub != null ? ex.sub : `${T(s0) < W ? '◂ ' : ''}${kept ? ic('hist') : ''}${hm(T(s0))}${T(e0) - T(s0) >= 36 * 60e3 && w > 140 ? dot + hm(T(e0)) : ''}`;
    const pg = isNow ? `<div class="prog"><i style="width:${Math.min(100, ((NOW - T(s0)) / (T(e0) - T(s0))) * 100)}%"></i></div>` : ex.wp ? `<div class="cu-wp"><i style="width:${ex.wp}%"></i></div>` : '';
    if (w < 52) return `<div class="${cls} sliver" style="left:${left}px;width:${Math.max(4, w)}px"></div>`;
    return `<div class="${cls}" style="left:${left}px;width:${w}px"><b>${esc(title)}</b><div class="sb">${sub}</div>${pg}</div>`;
  }).join('');
}
function guide({ W, data, fr, fc, onCh = false, now }) {
  const E = W + SPAN, x = (t) => Math.round((t - W) * PX);
  const ticks = [];
  const nowIn = NOW >= W && NOW < E, nx = nowIn ? x(NOW) : -999;
  const dayPill = W < T('2026-10-27T06:00:00Z') ? `<span class="cu-day">${W < T('2026-10-27T00:00:00Z') ? 'Mon 26 Oct' : 'Tue 27 Oct'}</span>` : '';
  for (let t = Math.ceil((W + 1) / 1800e3) * 1800e3; t < E; t += 1800e3) {
    const lx = x(t), midnight = new Date(t).getUTCHours() === 0 && new Date(t).getUTCMinutes() === 0;
    if (lx > (dayPill ? 112 : 40) && lx < AXIS - (nowIn ? 40 : 150) && Math.abs(lx - nx) > 64) ticks.push(`<span style="left:${lx}px">${midnight ? 'Tue 00:00' : hm(t)}</span>`);
  }
  const flag = nowIn ? `<span class="g-nowflag" style="left:${nx}px">Now</span>` : `<span class="cu-nowr">Now ${hm(NOW)}${ic('chevR')}</span>`;
  const ruler = `<div class="g-ruler"><div class="g-corner" data-row><span class="chip lg">${ic('star')}<span class="ellipsis" style="max-width:104px">Favourites, then all</span><span class="t-3" style="font-weight:500">24</span></span></div><div class="g-time">${dayPill}${flag}${ticks.join('')}</div></div>`;
  const rows = ROWS.map((k, ri) => {
    const ch = CH[k];
    const mark = ri < 2 ? `<span class="fv">${ic('star')}</span>` : '';
    const arc = ch.arc ? `<span class="cu-arc">${ic('hist')}</span>` : '';
    const chc = `g-ch${ri === fr ? ' sel' : ''}${ri === fr && onCh ? ' f-in' : ''}`;
    return `<div class="g-row" data-row><div class="${chc}"><span class="num${ch.arc ? ' cu-n' : ''}">${ch.num}${arc}</span><span class="logo sm">${ch.ini}</span><div class="nm">${esc(ch.name)}</div>${mark}</div><div class="g-cells">${cells(W, ch, data[k], ri === fr && !onCh ? fc : -1)}</div></div>`;
  }).join('');
  return `<div class="g-now">${now}</div><div class="g-grid">${ruler}${rows}</div>`;
}
// The Now panel (display only): tile, title row, channel and times, description; the key hints at the right
function nowPanel({ tile, title, badge = '', live = false, line2, line3, hint }) {
  return `${tile}<div class="grow">
    <div class="row-flex" style="gap:12px"><span class="t-title ellipsis" style="min-width:0">${esc(title)}</span>${badge}${live ? liveP() : ''}</div>
    <div class="row-flex" style="color:var(--a-text-2);font:500 15px/22px var(--a-font-text);white-space:nowrap">${line2}</div>
    <div class="row-flex" style="gap:6px;font:500 15px/22px var(--a-font-text);color:var(--a-text-2);min-width:0">${line3}</div>
  </div><div class="t-cap cu-hint">${hint}</div>`;
}
const tile = (ini, replay) => `<div class="pvtile" style="display:grid;place-items:center"><span class="logo lg">${ini}</span>${replay ? `<span class="cu-cor">${ic('hist')}</span>` : ''}</div>`;
const replayBadge = `<span class="cu-badge">${ic('hist')}Replay</span>`;

// ---- G1: today, now. The kept channels carry the history mark; the Now panel says how far back ◀ goes ----
{
  const W = T('2026-10-27T10:30:00Z');
  const data = {
    lp4: [['2026-10-27T10:00:00Z', '2026-10-27T11:00:00Z', 'NBA Gametime'], ['2026-10-27T11:00:00Z', '2026-10-27T13:30:00Z', 'NBA: Grizzlies at Jazz (replay)', { sub: '11:00' }]],
    sky: [['2026-10-27T10:00:00Z', '2026-10-27T11:30:00Z', 'Sky Sports News'], ['2026-10-27T11:30:00Z', '2026-10-27T12:30:00Z', 'Monday Night Football: Review'], ['2026-10-27T12:30:00Z', '2026-10-27T13:30:00Z', 'Golf Breakfast']],
    espn: [['2026-10-27T10:00:00Z', '2026-10-27T11:00:00Z', 'SportsCenter'], ['2026-10-27T11:00:00Z', '2026-10-27T12:00:00Z', 'First Take'], ['2026-10-27T12:00:00Z', '2026-10-27T13:00:00Z', 'NBA Today']],
    bbc: [['2026-10-27T10:15:00Z', '2026-10-27T11:00:00Z', 'Bargain Street'], ['2026-10-27T11:00:00Z', '2026-10-27T12:00:00Z', 'Coastline'], ['2026-10-27T12:00:00Z', '2026-10-27T12:30:00Z', 'BBC News at One'], ['2026-10-27T12:30:00Z', '2026-10-27T13:30:00Z', 'Doctors']],
    cnn: [['2026-10-27T10:00:00Z', '2026-10-27T11:00:00Z', 'CNN Newsroom'], ['2026-10-27T11:00:00Z', '2026-10-27T12:00:00Z', 'World Sport'], ['2026-10-27T12:00:00Z', '2026-10-27T13:00:00Z', 'Connect the World']],
    via: [['2026-10-27T09:30:00Z', '2026-10-27T11:30:00Z', 'Ligue 1: Lens v Lille'], ['2026-10-27T11:30:00Z', '2026-10-27T13:30:00Z', 'NHL: Rangers at Devils']],
  };
  const now = nowPanel({ tile: tile('NBA', false), title: 'NBA Gametime', line2: `<span class="ellipsis" style="min-width:0">NBA League Pass 4</span><span data-other="1" style="flex:none;display:flex;align-items:center">${dot}10:00 to 11:00${dot}20 min left<span class="prog" style="width:90px;margin-left:14px"><i style="width:67%"></i></span></span>`, line3: `${eyeSm}<span class="ellipsis" style="min-width:0">May show last night's results (spoiler shield)</span>`, hint: 'OK tune<span class="dot-sep"></span>Hold OK favourite<br>◀ earlier<span class="dot-sep"></span>kept 3 days' });
  page('live-archive.html', 'Guide: today, kept channels', `${topbar('live')}${guide({ W, data, fr: 0, fc: 0, now })}`,
    'v1.1: the morning after, an NBA studio show gets a quiet warning instead of its description, and the re-air of the hidden game shows no end time.', { group: 'Guide', shield: true });
}

// ---- G2: Mon evening, an archived programme you half watched. Kept vs not kept; one row still loading ----
{
  const W = T('2026-10-26T19:30:00Z');
  const data = {
    lp4: [['2026-10-26T19:00:00Z', '2026-10-26T21:00:00Z', 'NBA TV Classics'], ['2026-10-26T21:00:00Z', '2026-10-26T23:30:00Z', 'NBA Gametime']],
    sky: [['2026-10-26T19:00:00Z', '2026-10-26T22:00:00Z', 'Monday Night Football'], ['2026-10-26T22:00:00Z', '2026-10-26T23:00:00Z', 'MNF: The Debate']],
    espn: [['2026-10-26T19:30:00Z', '2026-10-26T22:00:00Z', 'Not kept by your provider', { sub: 'OK watches ESPN live' }]],
    bbc: [['2026-10-26T19:00:00Z', '2026-10-26T20:00:00Z', 'The One Show'], ['2026-10-26T20:00:00Z', '2026-10-26T21:00:00Z', 'Coastline', { wp: 57 }], ['2026-10-26T21:00:00Z', '2026-10-26T22:00:00Z', 'Night Circuit'], ['2026-10-26T22:00:00Z', '2026-10-26T22:45:00Z', 'BBC News at Ten']],
    cnn: [['2026-10-26T19:30:00Z', '2026-10-26T22:00:00Z', 'Not kept by your provider', { sub: 'OK watches CNN live' }]],
    via: 'load',
  };
  const now = nowPanel({ tile: tile('BBC', true), title: 'Coastline', badge: replayBadge, line2: `<span class="ellipsis" style="min-width:0">BBC One HD</span><span style="flex:none;display:flex;align-items:center">${dot}Mon 26 Oct${dot}20:00 to 21:00${dot}watched 34 min<span class="prog" style="width:70px;margin-left:12px"><i style="width:57%"></i></span></span>`, line3: '<span class="ellipsis" style="min-width:0">The cliffs of the far north-west, filmed over a year of storms.</span>', hint: 'OK resume at 20:34<br>Back returns to now' });
  page('live-past.html', 'Guide: back in time', `${topbar('live')}${guide({ W, data, fr: 3, fc: 1, now })}`,
    'Hold ◀ to go back. Kept programmes look normal with the history mark; ESPN and CNN aren\'t kept (outlined). OK resumes Coastline.', { group: 'Guide', shield: true });
}

// ---- G3: last night, the Grizzlies game, shield on. Crosses midnight ----
{
  const W = T('2026-10-26T23:30:00Z');
  const data = {
    lp4: [['2026-10-26T23:30:00Z', '2026-10-27T01:00:00Z', 'NBA Gametime'], ['2026-10-27T01:00:00Z', '2026-10-27T03:30:00Z', 'NBA: Memphis Grizzlies @ Utah Jazz']],
    sky: [['2026-10-26T23:00:00Z', '2026-10-27T00:00:00Z', 'MNF: The Debate'], ['2026-10-27T00:00:00Z', '2026-10-27T01:00:00Z', 'Sky Sports News'], ['2026-10-27T01:00:00Z', '2026-10-27T02:00:00Z', 'Sky Sports News'], ['2026-10-27T02:00:00Z', '2026-10-27T03:00:00Z', 'Golf: Highlights']],
    espn: [['2026-10-26T23:30:00Z', '2026-10-27T02:00:00Z', 'Not kept by your provider', { sub: 'OK watches ESPN live' }]],
    bbc: [['2026-10-26T23:20:00Z', '2026-10-27T00:20:00Z', 'Night Circuit'], ['2026-10-27T00:20:00Z', '2026-10-27T01:00:00Z', 'Weather for the Week'], ['2026-10-27T01:00:00Z', '2026-10-27T05:00:00Z', 'BBC News']],
    cnn: [['2026-10-26T23:30:00Z', '2026-10-27T02:00:00Z', 'Not kept by your provider', { sub: 'OK watches CNN live' }]],
    via: [['2026-10-26T23:00:00Z', '2026-10-27T01:30:00Z', 'NHL: Rangers at Devils'], ['2026-10-27T01:30:00Z', '2026-10-27T03:00:00Z', 'Golf: Highlights']],
  };
  const now = nowPanel({ tile: tile('NBA', true), title: 'NBA: Memphis Grizzlies @ Utah Jazz', badge: replayBadge, line2: `<span class="ellipsis" style="min-width:0">NBA League Pass 4</span><span style="flex:none;display:flex;align-items:center">${dot}Tue 01:00 to 03:30${dot}the Mon 26 Oct · late game</span>`, line3: `${eyeSm}<span class="ellipsis" style="min-width:0">Description hidden (spoiler shield)</span>`, hint: 'OK watch from tip-off<br>Back returns to now' });
  page('live-past-game.html', 'Guide: last night\'s game', `${topbar('live')}${guide({ W, data, fr: 0, fc: 1, now })}`,
    'Shield on. Last night\'s game: description hidden, OK plays it from tip-off (not the pre-game). v1.1: line 2 names it the way the NBA pages do (Mon 26 Oct · late).', { group: 'Guide', shield: true });
}

// ---- G4: focus on a channel the provider doesn't keep ----
{
  const W = T('2026-10-26T19:30:00Z');
  const data = {
    lp4: [['2026-10-26T19:00:00Z', '2026-10-26T21:00:00Z', 'NBA TV Classics'], ['2026-10-26T21:00:00Z', '2026-10-26T23:30:00Z', 'NBA Gametime']],
    sky: [['2026-10-26T19:00:00Z', '2026-10-26T22:00:00Z', 'Monday Night Football'], ['2026-10-26T22:00:00Z', '2026-10-26T23:00:00Z', 'MNF: The Debate']],
    espn: [['2026-10-26T19:30:00Z', '2026-10-26T22:00:00Z', 'Not kept by your provider', { sub: 'OK watches ESPN live' }]],
    bbc: [['2026-10-26T19:00:00Z', '2026-10-26T20:00:00Z', 'The One Show'], ['2026-10-26T20:00:00Z', '2026-10-26T21:00:00Z', 'Coastline', { wp: 57 }], ['2026-10-26T21:00:00Z', '2026-10-26T22:00:00Z', 'Night Circuit'], ['2026-10-26T22:00:00Z', '2026-10-26T22:45:00Z', 'BBC News at Ten']],
    cnn: [['2026-10-26T19:30:00Z', '2026-10-26T22:00:00Z', 'Not kept by your provider', { sub: 'OK watches CNN live' }]],
    via: [['2026-10-26T19:30:00Z', '2026-10-26T22:00:00Z', 'Ligue 1: Lens v Lille'], ['2026-10-26T22:00:00Z', '2026-10-27T00:00:00Z', 'Ligue 1: Studio']],
  };
  const now = nowPanel({ tile: tile('ES', false), title: 'Earlier on ESPN', line2: '<span class="ellipsis" style="min-width:0">US: ESPN HD</span><span style="flex:none;display:flex;align-items:center">' + dot + 'not kept by your provider</span>', line3: '<span class="ellipsis" style="min-width:0">Kept channels show the history mark under their number.</span>', hint: 'OK watch ESPN live<br>Back returns to now' });
  page('live-past-gone.html', 'Guide: a channel that isn\'t kept', `${topbar('live')}${guide({ W, data, fr: 2, fc: 0, now })}`,
    'Back in time on a channel the provider doesn\'t keep: one outlined cell, still focusable so ▲▼ keep the time. OK tunes it live.', { group: 'Guide', shield: true });
}

// =====================================================================================================================
// NBA SURFACES (SPEC 5)
// =====================================================================================================================
// The hero: app/tv/js/cards.js gameHero markup, with the catch-up states of SPEC 5.1
function hero({ top = 80, label = '', status, away = 'MEM', home = 'UTAH', ar, hr, score, btns, cap = '', slab, hub = false }) {
  const side = (t, rec, right) => `<div class="side${right ? ' r' : ''}" style="${tvars(t)}">${right ? '' : crest(t, 'lg')}<div${right ? ' style="text-align:right"' : ''}><div class="nm">${NAME[t]}</div><div class="rc">${rec}</div></div>${right ? crest(t, 'lg') : ''}</div>`;
  const b = btns.map((x, i) => `<span class="${x.k || (i ? 'btn2' : 'btn')}${x.f ? ' f' : ''}"${i === 0 ? ' style="transform-origin:0 50%"' : ''}>${x.i ? ic(x.i) : ''}${esc(x.t)}</span>`).join('');
  return `<div class="hero-plate"${top !== 80 ? ` style="top:${top}px"` : ''}>
  <div class="abs row-flex" style="left:24px;top:12px;gap:12px;height:24px">${hub || label ? '<span class="t-label" style="color:var(--a-pink-text)">Your team</span>' : ''}${status}</div>
  <div class="mt">${side(away, ar)}<div class="sc">${score}</div>${side(home, hr, 1)}</div>
  <div class="abs row-flex hero-btns" data-row style="left:24px;top:132px;gap:20px;width:572px">${b}${cap ? `<span class="t-cap clamp2" style="margin-left:4px;line-height:18px;flex:1;min-width:0">${cap}</span>` : ''}</div>
  <div class="slabbox" style="left:619px;width:243px"><div class="slabfill"></div><div class="slabcontent ink">${slab}</div></div>
</div>`;
}
const hidTile = `<span class="shield" style="height:44px;padding:0 12px;font-size:16px;gap:8px">${ic('eyeOff')}<span>Score hidden</span></span>`;
const recM = partial('3-0'), recU = partial('1-2');
// Home rails: row titles at y 278 / 422, cards at 314 / 458 (home.js ROW_TOP)
const progArt = (seed) => `<div class="art">${Art.art(seed)}</div>`;
function onNowCard(c, i, { f = false } = {}) {
  return `<div class="hc${f ? ' f' : ''}">${progArt(c[3] || c[0])}<div class="hs"></div><div class="tp"><span class="logo sm">${c[2]}</span>${c[4] ? liveP() : ''}<span class="n">${c[1]}</span></div><div class="bt"><b>${esc(c[5])}</b><span>${esc(c[0])}</span></div><div class="prog flush"><i style="width:${c[6]}%"></i></div></div>`;
}
const ONNOW = [['US: ESPN HD', 210, 'ES', 'espn', 0, 'SportsCenter', 66], ['Sky Sports Main Event', 402, 'SS', 'sky', 0, 'Sky Sports News', 44], ['BBC One HD', 101, 'BBC', 'bbc', 0, 'Bargain Street', 55], ['CNN International', 115, 'CNN', 'cnn', 0, 'CNN Newsroom', 66], ['Viaplay Sport 1', 431, 'VS', 'via', 0, 'Ligue 1: Lens v Lille', 60]];
const rail = (title, cards, top, peek) => `<div class="abs rowtitle" style="left:48px;top:${top}px">${title}</div><div class="rail abs${peek ? ' peek' : ''}" style="top:${top + 36}px;left:0;right:0"><div class="track" data-row>${cards}</div></div>`;
// a replay card for Continue watching: the two crests as its art, "Stopped in Q3" instead of minutes left (SPEC 7)
const replayCard = (f) => `<div class="hc${f ? ' f' : ''}"><div class="art" style="background:linear-gradient(100deg,${pal('MEM').p} 50%,${pal('UTAH').p} 50%)"></div><div class="hs"></div><div class="tp"><span class="t-label" style="line-height:22px">NBA · Replay</span><span class="n" style="display:flex;gap:4px">${crest('MEM', 's24')}${crest('UTAH', 's24')}</span></div><div class="bt"><b>Grizzlies at Jazz</b><span>Stopped in Q3</span></div><div class="prog flush"><i style="width:44%"></i></div></div>`;
const contCard = (kind, title, left, pct, seed) => `<div class="hc" data-other="1">${progArt(seed)}<div class="hs"></div><div class="tp"><span class="t-label" style="line-height:22px">${kind}</span><span class="n">${left}</span></div><div class="bt"><b>${esc(title)}</b></div><div class="prog flush"><i style="width:${pct}%"></i></div></div>`;
const tonightPeek = () => ['WSH', 'MIN', 'BOS', 'DAL'].map((a, i) => `<div class="gc"><div class="st"><span>${['23:00', '23:00', '23:30', '00:00'][i]}</span><span class="tvn">NBA League Pass</span></div><div class="pk ellipsis">${NAME[a]} at ${NAME[['CHA', 'CLE', 'CHI', 'MIA'][i]]}</div></div>`).join('');

// ---- N1: the morning after, shield on. Home opens on the replay ----
page('home-replay.html', 'Home: the morning after', `${topbar('home')}${hero({
  label: 1, status: `<span class="t-label t-2">NBA${dot}Mon 26 Oct${dot}late</span>`, ar: recM, hr: recU, score: hidTile,
  btns: [{ t: 'Watch from tip-off', i: 'play', f: 1 }, { t: 'Game page' }], cap: `NBA League Pass 4<br>Kept until ${JAZZ_KEPT}`,
  slab: '<span class="big">REPLAY</span><span class="cap">Score hidden</span>',
})}${rail('On now', ONNOW.map((c, i) => onNowCard(c, i)).join(''), 278)}${rail('Tonight\'s games', tonightPeek(), 422, 1)}<div class="edgefade"></div>`,
'10:40, shield My team. Last night\'s game is unseen and kept, so Home opens on it: Watch from tip-off is focused. No score, no record past the seen games.', { group: 'NBA', shield: true });

// ---- N2: stopped in Q3 last time ----
page('home-replay-resume.html', 'Home: resume the replay', `${topbar('home')}${hero({
  label: 1, status: `<span class="t-label t-2">NBA${dot}Mon 26 Oct${dot}late</span>`, ar: recM, hr: recU, score: hidTile,
  btns: [{ t: 'Resume', i: 'play', f: 1 }, { t: 'From tip-off', i: 'restart' }, { t: 'Game page' }], cap: '',
  slab: '<span class="big">Q3</span><span class="big">6:41</span><span class="cap">You stopped here</span>',
})}${rail('Continue watching', replayCard(false) + [['S1 · E3', 'Night Circuit', '32 min left', 40, 'nc'], ['Film', 'Harbor Lights', '1h 04m left', 30, 'hl'], ['S2 · E1', 'The Relay', '41 min left', 12, 'tr'], ['Film', 'Cold Harbour', '18 min left', 82, 'ch']].map((c) => contCard(...c)).join(''), 278)}${rail('On now', ONNOW.map((c, i) => onNowCard(c, i)).join(''), 422, 1)}<div class="edgefade"></div>`,
'You stopped in Q3 last time. Resume (focused), From tip-off, Game page. The slab shows where you stopped; the card says "Stopped in Q3", never minutes left.', { group: 'NBA', shield: true });

// ---- N3: the game is live, the channel is kept: From tip-off is one move ----
page('home-live-tipoff.html', 'Home: live, from tip-off', `${topbar('home', { nbaLive: 1 })}${hero({
  status: `${liveP()}<span class="t-label t-2">NBA${dot}NBA League Pass 4</span>`, ar: recM, hr: recU, score: hidTile,
  btns: [{ t: 'Watch live', i: 'play', f: 1 }, { t: 'From tip-off', i: 'restart' }, { t: 'Reveal score' }],
  slab: '<span class="big">Q2</span><span class="big">5:18</span><span class="cap">Score hidden</span>',
})}${rail('On now', ONNOW.map((c, i) => onNowCard([c[0], c[1], c[2], c[3], 0, ['NBA Today', 'Sky Sports News', 'BBC News', 'CNN Newsroom', 'NHL: Rangers at Devils'][i], [40, 20, 75, 10, 50][i]], i)).join(''), 278)}${rail('Tonight\'s games', tonightPeek(), 422, 1)}<div class="edgefade"></div>`,
'01:52, live. Watch live stays first; From tip-off sits next to it (one ▶). With three buttons the channel name moves to the status row.', { group: 'NBA', shield: true });

// ---- the hub, game cards ----
function gc(a, h, { st, plate, tvn = '', f = false, other = false, rec = ['', ''] }) {
  return `<div class="gc${f ? ' f' : ''}"${other ? ' data-other="1"' : ''}><div class="st">${st}${tvn}</div>
    <div class="tr">${edge(a)}${crest(a)}<span class="nm">${NAME[a]}</span><span class="rc">${rec[0]}</span></div>
    <div class="tr">${edge(h)}${crest(h)}<span class="nm">${NAME[h]}</span><span class="rc">${rec[1]}</span></div>${plate}</div>`;
}
const rpl = `<span class="cu-rpl">${ic('hist')}Replay</span>`;
const hidPlate = `<span class="plate"><span class="x">${ic('eyeOff')}<span class="t-cap">hidden</span></span></span>`;
const fin = (x, y) => `<span class="plate"><span class="x"><span class="score md"${+x < +y ? ' style="opacity:.7"' : ''}>${x}</span><span class="score md"${+y < +x ? ' style="opacity:.7"' : ''}>${y}</span></span></span>`;
const secRow = (sel) => `<div class="nb-sec" data-row>${[['games', 'Games'], ['team', `${crest('MEM', 's24')}Grizzlies`], ['standings', 'Standings'], ['leaders', 'Leaders'], ['teamstats', 'Team stats'], ['news', 'News']].map(([k, l]) => `<span class="chip lg${k === sel ? ' sel' : ''}">${l}</span>`).join('')}<span class="meta"><span>ESPN${dot}10:38</span></span></div>`;
const hubGrid = (focus) => `<div class="nba-grid" data-grid data-cols="3" style="top:380px">${[
  gc('MEM', 'UTAH', { st: '<span>Ended</span>', tvn: rpl, plate: hidPlate, f: focus }),
  gc('WSH', 'CHA', { st: '<span>Final</span>', tvn: rpl, plate: fin('108', '112'), other: 1, rec: ['2-2', '3-1'] }),
  gc('MIN', 'CLE', { st: '<span>Final</span>', tvn: '<span class="tvn">NBA League Pass</span>', plate: fin('121', '110'), other: 1, rec: ['4-0', '1-2'] }),
].join('')}</div>`;
const hubDays = `<div class="nb-days" data-row style="top:332px"><span class="chip lg">${ic('chevL')}Sun</span><span class="chip lg sel">Yesterday${dot}Mon 26 Oct</span><span class="chip lg">Today${ic('chevR')}</span><span class="t-cap">11 games${dot}your team first${dot}${ic('hist', 'xs')}&nbsp;= replay</span></div>`;

// ---- N4: the hub on a provider with no archive: the replay is a video in Movies ----
page('nba-hub-replay.html', 'NBA: yesterday, replays', `${topbar('nba')}${secRow('games')}${hero({
  top: 128, hub: 1, status: `<span class="t-label t-2">NBA${dot}Mon 26 Oct${dot}late</span>`, ar: recM, hr: recU, score: hidTile,
  btns: [{ t: 'Watch from tip-off', i: 'play' }, { t: 'Game page' }], cap: 'Full game in Movies<br>Memphis feed',
  slab: '<span class="big">REPLAY</span><span class="cap">Score hidden</span>',
})}${hubDays}${hubGrid(true)}`,
'A provider with no archive: the replay is a video in its Movies (matched by teams and date). Cards with a replay say so; the Grizzlies card stays hidden.', { group: 'NBA', shield: true });

// ---- N5: hold OK on the card ----
page('nba-card-menu-replay.html', 'NBA: hold OK on a final', `${topbar('nba')}${secRow('games')}${hero({
  top: 128, hub: 1, status: `<span class="t-label t-2">NBA${dot}Mon 26 Oct${dot}late</span>`, ar: recM, hr: recU, score: hidTile,
  btns: [{ t: 'Watch from tip-off', i: 'play' }, { t: 'Game page' }], cap: 'Full game in Movies<br>Memphis feed',
  slab: '<span class="big">REPLAY</span><span class="cap">Score hidden</span>',
})}${hubDays}${hubGrid(false)}<div class="ctxmenu cu-w" data-col style="left:336px;top:255px"><div class="lr f-ring">${ic('play', 'sm')}Watch from tip-off</div><div class="lr">${crest('MEM', 's24')}Grizzlies page</div><div class="lr">${crest('UTAH', 's24')}Jazz page</div><div class="lr">${ic('score', 'sm')}Open the game</div><div class="lr">${eyeSm}Reveal Grizzlies at Jazz</div></div>`,
'Hold OK on a final with a replay: Watch from tip-off first and focused. Reveal names its game and comes last. The menu opens beside the card: below it is off-screen, above it would touch the team plates.', { group: 'NBA', shield: true });

// ---- the game page (app/tv/js/screens/game.js) ----
function gameHead({ status, away = 'MEM', home = 'UTAH', mid }) {
  const side = (t, right) => `<div class="side${right ? ' r' : ''}" style="${tvars(t)}">${right ? '' : crest(t, 'md')}<div class="nm">${NAME[t]}</div>${right ? crest(t, 'md') : ''}</div>`;
  return `<div class="gd-head"><div class="abs row-flex" style="left:20px;top:8px;gap:10px;height:24px">${status}</div><div class="mt">${side(away)}<div class="sc">${mid}</div>${side(home, 1)}</div></div>`;
}
const gdHid = `<span class="shield">${ic('eyeOff')}<span>Score hidden</span></span>`;
const tabsRow = (tabs, right = '') => `<div class="gd-tabs" data-row>${tabs.map(([l, s]) => `<span class="chip lg${s ? ' sel' : ''}">${l}</span>`).join('')}${right}</div>`;

// ---- N6: game page, shield on, a replay exists: the card offers it first ----
page('game-replay-shield.html', 'Game page: hidden, replay', `${topbar('nba')}${gameHead({ status: `<span class="t-label t-2">Ended${dot}Mon 26 Oct${dot}late</span>`, mid: gdHid })}
${tabsRow([['Grizzlies'], ['Jazz'], ['Team stats']])}
<div class="gd-body" style="bottom:27px"><div class="state big cu-state" style="margin:10px auto 0;padding:20px 28px 13px" data-row><div class="ico">${ic('eyeOff')}</div><b>Grizzlies at Jazz is hidden</b><p>Watch it from tip-off: it counts as seen at the replay's final buzzer.</p><div class="row-flex"><span class="btn f">${ic('play')}Watch from tip-off</span><span class="btn2">Reveal Grizzlies at Jazz</span></div><div class="t-cap">NBA League Pass 4${dot}kept until ${JAZZ_KEPT}${dot}hold OK: other sources</div></div></div>`,
'Shield on: the card in the body offers the replay first (focused). Reveal names the game and is a move away. Plays is dropped while hidden.', { group: 'NBA', shield: true });

// ---- N7: a seen final, watch it again ----
const BOX = [['C. Boozer', 'F', '34', '24', '9', '3', '9-15', '2-4', '+12'], ['J. Grant', 'F', '31', '18', '5', '2', '7-13', '3-6', '+8'], ['Z. Edey', 'C', '28', '16', '13', '1', '7-9', '0-0', '+10'], ['C. Coward', 'F', '30', '14', '4', '4', '5-11', '2-5', '+6'], ['T. Hendricks', 'F', '26', '11', '6', '2', '4-8', '1-3', '+4'], ['G. Jackson', 'F', '22', '15', '3', '1', '6-12', '2-5', '+7']];
page('game-replay-seen.html', 'Game page: seen, watch again', `${topbar('nba')}${gameHead({ status: `<span class="t-label t-2">Final${dot}Sun 25 Oct${dot}late</span>`, away: 'MEM', home: 'SAC', mid: '<span class="score md">123</span><span class="t-3" style="font:700 20px var(--a-font-display)">–</span><span class="score md">112</span>' })}
${tabsRow([['Grizzlies', 1], ['Kings'], ['Plays'], ['Team stats']], `<span class="t-cap" style="margin-left:auto;margin-right:16px">Kept until ${KINGS_KEPT}</span><span class="btn sm f" style="transform-origin:100% 50%">${ic('play')}Watch again</span>`)}
<div class="gd-body" style="bottom:27px;overflow:hidden"><div class="inner"><table class="box"><thead><tr><th>Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>FG</th><th>3P</th><th>+/-</th></tr></thead><tbody>${BOX.map((r) => `<tr class="st"><td>${r[0]}<span class="pos">${r[1]}</span></td>${r.slice(2).map((v, k) => `<td${k === 1 ? ' class="b"' : ''}>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`,
'Sun\'s game, seen: the box score as today, and Watch again at the right of the tab row. (Box score figures are illustrative.)', { group: 'NBA', shield: true, other: true });

// ---- N8: hidden, and no replay anywhere ----
page('game-noreplay.html', 'Game page: no replay', `${topbar('nba')}${gameHead({ status: `<span class="t-label t-2">Ended${dot}Mon 26 Oct${dot}late</span>`, mid: gdHid })}
${tabsRow([['Grizzlies'], ['Jazz'], ['Team stats']])}
<div class="gd-body" style="bottom:27px"><div class="state big cu-state" style="margin:10px auto 0;padding:20px 28px 13px" data-row><div class="ico">${ic('eyeOff')}</div><b>No replay of this game yet</b><p>Full games often reach Movies a few hours after the final. airglow looks every hour until Thu.</p><div class="row-flex"><span class="btn f">${ic('refresh')}Look again</span><span class="btn2">${ic('search')}Choose a video</span><span class="btn2">Reveal Grizzlies at Jazz</span></div><div class="t-cap">Looked at 10:32 in 4 channel archives and 312 NBA videos</div></div></div>`,
'Neither an archive nor a video: say so plainly, keep looking every hour, and let you pick a video yourself. Look again is focused, never Reveal.', { group: 'NBA', shield: true });

// ---- N9: Choose a video (names masked) ----
// v1.1 (review M4): the real case. The matcher found nothing, so these are videos it couldn't place. Any title naming a
// hidden game's team, undated or dated from its tip-off on, runs through the news rule; if it could tell, it is hidden.
const vids = [['Video naming the Grizzlies and the Jazz', 'added Tue 27 Oct 08:14 · 1080p', 'Name hidden'], ['Video naming the Grizzlies', 'added Tue 27 Oct 09:02 · 720p', 'Name hidden'], ['Grizzlies vs Kings · full game', 'Sun 25 Oct · a game you\'ve seen · 1080p', ''], ['Memphis Grizzlies Season Preview', 'added Mon 19 Oct · 720p', ''], ['Utah Jazz Media Day', 'added Wed 30 Sep · 1080p', '']];
page('choose-video.html', 'Choose a video', `${topbar('nba')}${gameHead({ status: `<span class="t-label t-2">Ended${dot}Mon 26 Oct${dot}late</span>`, mid: gdHid })}${tabsRow([['Grizzlies'], ['Jazz'], ['Team stats']])}
<div class="scrim"></div><div class="menu cu-srcs" style="left:180px;top:40px;width:600px"><h3>Choose a video</h3><div class="t-cap" style="padding:0 8px 10px">Videos naming the Grizzlies or the Jazz, newest first</div><div data-col>${vids.map(([a, b, h], i) => `<div class="lr${i === 0 ? ' f-ring' : ''}"><span class="ico">${ic(h ? 'eyeOff' : 'film')}</span><span class="grow"><span class="a">${esc(a)}</span><span class="b">${esc(b)}</span></span>${h ? `<small style="color:var(--a-text-2);font-weight:500">${h}</small>` : ''}</div>`).join('')}</div><div class="t-cap" style="padding:10px 8px 0">Names that could tell the result stay hidden until you've seen the game. Your pick is remembered.</div></div>`,
'v1.1: the case you reach it in (nothing matched). Names that could tell the result are hidden whatever the shield mode; older and seen ones show.', { group: 'NBA', shield: true });

// ---- N10: the replay sources (hold OK on Watch from tip-off) ----
const srcs = [['hist', 'NBA League Pass 4', 'Channel replay · quarter skips', 'Best'], ['film', 'Full game · Memphis feed', 'Movies · NBA Replays · 1080p'], ['film', 'Full game · Utah feed', 'Movies · NBA Replays · 720p'], ['film', 'Condensed game', 'Movies · NBA Replays'], ['search', 'Choose a video…', 'Every video naming either team']];
page('sources-sheet.html', 'Where to watch it from', `${topbar('home')}${hero({
  label: 1, status: `<span class="t-label t-2">NBA${dot}Mon 26 Oct${dot}late</span>`, ar: recM, hr: recU, score: hidTile,
  btns: [{ t: 'Watch from tip-off', i: 'play' }, { t: 'Game page' }], cap: `NBA League Pass 4<br>Kept until ${JAZZ_KEPT}`,
  slab: '<span class="big">REPLAY</span><span class="cap">Score hidden</span>',
})}${rail('On now', ONNOW.map((c, i) => onNowCard(c, i)).join(''), 278)}<div class="scrim"></div><div class="sheet cu-srcs"><h3>Watch Grizzlies at Jazz</h3><div class="t-cap" style="margin-top:-6px">From tip-off${dot}Mon 26 Oct · late</div><div data-col style="display:flex;flex-direction:column;gap:2px">${srcs.map(([i0, a, b, s], i) => `<div class="lr${i === 0 ? ' f-ring' : ''}"><span class="ico">${ic(i0)}</span><span class="grow"><span class="a">${esc(a)}</span><span class="b">${esc(b)}</span></span>${s ? `<small>${s}</small>` : ''}</div>`).join('')}</div><div class="t-cap" style="margin-top:auto">Your pick is remembered for this game. The channel replay comes first: it has the quarter skips and the synced score.</div></div>`,
'Hold OK on Watch from tip-off: every source airglow found, best first and focused. OK plays it from tip-off.', { group: 'NBA', shield: true });

// ---- N11 / N12: the team page schedule rail (nba-pages SPEC 7.2) ----
function teamHead() {
  return `<div class="nb-head">
  <div class="st"><span class="t-label" style="color:var(--a-pink-text)">Your team</span><span class="t-label t-2">2026-27${dot}Regular season</span></div>
  <div class="nb-plate" style="${tvars('MEM')}">${crest('MEM', 'xl')}<div><div class="loc">Memphis</div><div class="nk">Grizzlies</div></div></div>
  <div class="nb-rec"><div class="big">3-0</div><div><div class="l1">1 result hidden</div><div class="l2 row-flex" style="gap:6px">${eyeSm}Mon, at Jazz</div></div></div>
  <div class="nb-next"><span class="t-label">Next${dot}Thu night 02:00</span><div class="mu">${crest('POR', 's28')}<span>at Trail Blazers</span></div><div class="tv">NBA League Pass</div></div>
  <div class="nb-btns" data-row><span class="btn" style="transform-origin:0 50%">${ic('play')}Watch from tip-off</span><span class="btn2">Game page</span><span class="t-cap clamp2">NBA League Pass 4<br>Kept until ${JAZZ_KEPT}</span></div>
</div>`;
}
const tileG = (d, op, r, { f = false, g = false, next = false, pk = false, other = false } = {}) => `<div class="nb-gt${f ? ' f' : ''}${next ? ' next' : ''}${pk ? ' pk' : ''}"${other ? ' data-other="1"' : ''}><div class="d">${next ? '<span class="n">Next</span><span>Thu 29 · late</span>' : `<span>${d}</span>`}</div><div class="o">${crest(op[0], 's32')}<span>${op[1]}</span></div><div class="r">${r}${g ? `<span class="cu-g">${ic('hist')}</span>` : ''}</div></div>`;
const schedRail = (focus) => `<div class="nb-title" style="top:324px">Schedule<small>3 seen${dot}1 hidden${dot}${ic('hist', 'xs')}&nbsp;replay${dot}◀ results${dot}▶ coming up</small></div>
  <div class="nb-rail rail" data-row style="top:350px;margin-top:0">${[
    tileG('Fri 23 Oct · late', ['GS', 'at Warriors'], '<b>W</b><b style="font-weight:650">111–108</b>', { other: 1 }),
    tileG('Sun 25 Oct · late', ['SAC', 'at Kings'], '<b>W</b><b style="font-weight:650">123–112</b>', { g: 1, other: 1 }),
    tileG('Mon 26 Oct · late', ['UTAH', 'at Jazz'], `<span class="nb-hid">${ic('eyeOff')}Result hidden</span>`, { g: 1, f: focus }),
    tileG('', ['POR', 'at Trail Blazers'], '<span>02:00<span class="dot-sep"></span>League Pass</span>', { next: 1 }),
    tileG('Sat 31 Oct', ['SAC', 'vs Kings'], '<span>00:00<span class="dot-sep"></span>League Pass</span>', { pk: 1 }),
  ].join('')}</div>
  <div class="nb-cue" style="top:484px">${ic('chevD')}Season ranks${dot}News${dot}Roster</div>`;
page('team-schedule-replay.html', 'Team page: schedule, replays', `${topbar('nba')}${secRow('team')}${teamHead()}${schedRail(true)}`,
'The schedule rail: finals you can still watch carry the history mark at the end of the result line. The Warriors game has dropped out of the 3-day archive.', { group: 'NBA', shield: true });
page('team-tile-menu.html', 'Team page: hold OK on a tile', `${topbar('nba')}${secRow('team')}${teamHead()}${schedRail(false)}<div class="ctxmenu cu-w" data-col style="left:492px;top:144px"><div class="lr f-ring">${ic('play', 'sm')}Watch from tip-off</div><div class="lr">${crest('UTAH', 's24')}Jazz page</div><div class="lr">${ic('score', 'sm')}Open the game</div><div class="lr">${eyeSm}Reveal Grizzlies at Jazz</div></div>`,
'Hold OK on a tile with a replay: Watch from tip-off is first and focused; Reveal comes last. OK on the tile still opens the game page.', { group: 'NBA', shield: true });

// =====================================================================================================================
// THE PLAYER (SPEC 6): native overlays, drawn here in dp
// =====================================================================================================================
const video = (seed, style) => `<div class="vid"><div class="art">${Art.art(seed, style ? { style, hue: 28 } : {})}</div></div>`;
const hint = (items) => `<div class="nv-hint">${items.map(([k, t]) => `<span><span class="kbd">${k}</span>${t}</span>`).join('')}</div>`;
const HINT_T = hint([['OK', 'Pause'], ['◀ ▶', '10 s, hold for faster'], ['▲', 'Buttons'], ['▼', 'Options'], ['Back', 'Hide']]);
const vb = (inner, { f = false, t = false } = {}) => `<span class="vb${t ? ' t' : ''}${f ? ' f' : ''}">${inner}</span>`;
const pill = (inner, f) => `<span class="btn2 sm${f ? ' f-ring' : ''}">${inner}</span>`;
// The timeline bar. scale [a, b] (ms) maps to the 824 dp track; marks: { pos, live, ticks: [[t, label]], left, right, chapOn }
const TRACK = 824;
function tbar({ a, b, pos, live, ticks = [], left = '', right = '', onTick = -1, btnL, btnR, thumbF = true, bubble = '', speed = '' }) {
  const X = (t) => Math.max(0, Math.min(TRACK, ((t - a) / (b - a)) * TRACK));
  const px = X(pos), lx = live != null ? X(live) : null;
  const pct = (v) => ((v / TRACK) * 100).toFixed(2) + '%';
  const tk = ticks.map(([t]) => `<span class="cu-tk" style="left:${pct(X(t))}"></span>`).join('');
  const ahead = lx != null ? `<span class="cu-ahead" style="left:${pct(lx)}"></span>` : '';
  const edgeDot = lx != null ? `<span class="cu-edge" style="left:${pct(lx)}"></span>` : '';
  const labels = ticks.map(([t, l], i) => `<span class="${i === onTick ? 'on' : ''}" style="left:${pct(X(t))}">${l}</span>`).join('');
  const liveLbl = lx != null ? `<span class="a-live" style="${lx > TRACK - 90 ? `right:${(TRACK - lx + 12).toFixed(0)}px` : `left:${(lx + 12).toFixed(0)}px`}">Live</span>` : '';
  return `<div class="cu-tbar"><div class="cu-btns">${btnL}<span class="grow"></span>${btnR}</div>
    <div class="cu-trk"><div class="seek">${ahead}<i style="width:${pct(px)}"></i>${tk}${edgeDot}<b class="${thumbF ? 'thumbf' : ''}" style="left:${pct(px)}"></b>${bubble ? `<div class="bub cu-up" style="left:${pct(px)}">${bubble}</div>` : ''}${speed ? `<span class="cu-speed cu-up" style="left:${(px + 76).toFixed(0)}px">${speed}</span>` : ''}</div></div>
    <div class="cu-chap">${left ? `<span class="l">${left}</span>` : ''}${labels}${liveLbl}${right ? `<span class="r">${right}</span>` : ''}</div></div>`;
}
const vtop = (title, sub, pos) => `<div class="nv-vtop"><div style="min-width:0"><b>${esc(title)}</b><span>${sub}</span></div><div class="cu-pos">${pos}</div></div>`;
const RIGHT3 = `${vb(ic('cc'))}${vb(ic('audio'))}${vb(ic('pic'))}`;
const GAMEB = (f) => vb(ic('score'), { f });   // v1.1 (review M8): the game panel's key in a replay
const RIGHTG = `${pill('Back to live')}${GAMEB()}${RIGHT3}`;
// the Jazz game: scheduled tip 01:00, real tip 01:12; the replay window is tip-off − 15 min to + 3 h 15 min (SPEC 6.4)
const GA = T('2026-10-27T00:45:00Z'), GB = T('2026-10-27T04:15:00Z');
const Q = { tip: T('2026-10-27T01:12:00Z'), q2: T('2026-10-27T01:38:00Z'), half: T('2026-10-27T02:06:00Z'), q3: T('2026-10-27T02:22:00Z'), q4: T('2026-10-27T02:52:00Z') };

// ---- P1: from tip-off while the game is live ----
page('player-tipoff.html', 'Player: from tip-off, game live', `${video('arena', 'arena')}${vtop('Grizzlies at Jazz', 'From tip-off · NBA League Pass 4', '<b>40 min behind live</b><span>You\'re in Q1</span>')}${tbar({
  a: GA, b: GB, pos: Q.tip, live: T('2026-10-27T01:52:00Z'), ticks: [[Q.tip, 'Tip-off'], [Q.q2, 'Q2']], onTick: 0,
  btnL: `${vb(ic('pause'))}${vb(ic('restart'))}${vb('−1m', { t: 1 })}${vb('+1m', { t: 1 })}${pill(`Skip to Q2${ic('chevR', 'sm')}`)}`,
  btnR: RIGHTG,
})}${HINT_T}`,
'From tip-off on a live game: a fixed 3½ h window, the live point the red dot. v1.1: line 2 says where you are, never where live is; the Game button opens the panel.', { group: 'Player', shield: true });

// ---- P2: halftime: the skip button names where it goes ----
page('player-halftime.html', 'Player: skip halftime', `${video('arena', 'arena')}${vtop('Grizzlies at Jazz', 'From tip-off · NBA League Pass 4', '<b>23 min behind live</b><span>Halftime</span>')}${tbar({
  a: GA, b: GB, pos: T('2026-10-27T02:08:00Z'), live: T('2026-10-27T02:31:00Z'), ticks: [[Q.tip, 'Tip-off'], [Q.q2, 'Q2'], [Q.half, 'Half'], [Q.q3, 'Q3']], onTick: 2, thumbF: false,
  btnL: `${vb(ic('pause'))}${vb(ic('restart'))}${vb('−1m', { t: 1 })}${vb('+1m', { t: 1 })}${pill(`Skip halftime${ic('chevR', 'sm')}`, 1)}`,
  btnR: RIGHTG,
})}${hint([['OK', 'Skip to Q3'], ['◀ ▶', 'Buttons'], ['▼', 'Seek bar'], ['Back', 'Hide']])}`,
'▲ to the buttons at halftime: the skip reads "Skip halftime" and OK lands on the Q3 tip. The hint bar says what OK does.', { group: 'Player', shield: true });

// ---- P3: a finished game, shield on: no end, no remaining time ----
page('player-replay.html', 'Player: replay, shield on', `${video('arena2', 'arena')}${vtop('Grizzlies at Jazz', 'Replay · Mon 26 Oct · NBA League Pass 4', `<div class="row-flex">${eyeSm}<b>Score hidden</b></div><span>Seen at the final buzzer</span>`)}${tbar({
  a: GA, b: GB, pos: T('2026-10-27T01:52:00Z'), ticks: [[Q.tip, 'Tip-off'], [Q.q2, 'Q2'], [Q.half, 'Half'], [Q.q3, 'Q3'], [Q.q4, 'Q4']], onTick: 1,
  btnL: `${vb(ic('pause'))}${vb(ic('restart'))}${vb('−1m', { t: 1 })}${vb('+1m', { t: 1 })}${pill(`Skip to Q3${ic('chevR', 'sm')}`)}`,
  btnR: RIGHTG, right: `${eyeSm}End hidden`,
})}${HINT_T}`,
'A finished game under the shield: the bar never shows where it ends. v1.1: Back to live stays for the whole replay (under the shield it always asks first); a Game button.', { group: 'Player', shield: true });

// ---- P4: scrubbing: the bubble says the quarter ----
page('player-scrub.html', 'Player: scrubbing a replay', `${video('arena2', 'arena')}${vtop('Grizzlies at Jazz', 'Replay · Mon 26 Oct · NBA League Pass 4', `<div class="row-flex">${eyeSm}<b>Score hidden</b></div><span>Seen at the final buzzer</span>`)}${tbar({
  a: GA, b: GB, pos: T('2026-10-27T02:24:00Z'), ticks: [[Q.tip, 'Tip-off'], [Q.q2, 'Q2'], [Q.half, 'Half'], [Q.q3, 'Q3'], [Q.q4, 'Q4']], onTick: 3,
  btnL: `${vb(ic('pause'))}${vb(ic('restart'))}${vb('−1m', { t: 1 })}${vb('+1m', { t: 1 })}${pill(`Skip to Q4${ic('chevR', 'sm')}`)}`,
  btnR: RIGHTG, right: `${eyeSm}End hidden`, bubble: 'Q3 · 1:12:00', speed: '▶▶ ×8',
})}${HINT_T}`,
'Hold ▶: faster every second (×2 to ×32). The bubble names the quarter of the thumb, never past Q4; nothing on the bar changes until the picture plays there.', { group: 'Player', shield: true });

// ---- P5: the game panel in a replay: quarters to jump to ----
const qrow = (l, t, { cur = false, f = false } = {}) => `<div class="nv-row g cu-qrow${cur ? ' cur' : ''}${f ? ' f' : ''}"><div class="grow"><div class="a">${l}</div></div><span class="t-cap">${t}</span></div>`;
page('player-replay-panel.html', 'Player: quarters panel', `${video('arena2', 'arena')}<div class="nv-panel right" style="width:280px"><div class="nv-sc"><div class="tm">${crest('MEM', 'md')}<span class="plate" data-moment="1"><span class="x"><span class="score sm" style="display:flex;gap:10px"><span>41</span><span style="opacity:.55">–</span><span>38</span></span></span></span>${crest('UTAH', 'md')}</div>
  <div class="t-cap" style="display:flex;justify-content:center;align-items:center;gap:8px">Q2 6:41${dot}as aired</div></div>
  <div class="nv-tabs cu-t"><span class="on">Quarters</span><span>Plays</span><span class="act">${ic('refresh', 'sm')}Sync</span></div>
  ${qrow('Tip-off', '01:12')}${qrow('Q2', 'now', { cur: 1 })}${qrow('Halftime', '02:06')}${qrow('Q3', '02:22', { f: 1 })}${qrow('Q4', '02:52')}
  <div class="t-cap nv-foot">OK jumps there. The box score comes after the final buzzer.</div></div>`,
'The Game button in a replay: the game as aired, 90 s behind the picture, and the quarters to jump to. No box score, no OT row ahead.', { group: 'Player', shield: true });

// ---- P6: Options on a live game: Watch from tip-off and Rewind ----
const orow = (i0, t, s, v, { f = false } = {}) => `<div class="nv-row g${f ? ' f' : ''}"><span class="ico">${ic(i0, 'sm')}</span><div class="grow"><div class="a">${t}</div>${s ? `<div class="b">${s}</div>` : ''}</div>${v ? `<span class="v">${v}${ic('chevR', 'sm')}</span>` : ''}</div>`;
page('player-options-live.html', 'Player: Options, live game', `${video('arena', 'arena')}<div class="nv-panel left" style="width:340px"><div class="nv-h">Options</div>
  ${orow('refresh', 'Sync score', 'Match the game clock', '42 s')}${orow('restart', 'Watch from tip-off', 'Tipped off at 01:12', '', { f: 1 })}${orow('pause', 'Rewind and pause', 'Kept 3 days on this channel', '')}${orow('tv', 'Other feeds for this game', 'ESPN, NBA TV', '2')}${orow('cc', 'Subtitles', '', 'Off')}${orow('audio', 'Audio', '', 'English')}${orow('pic', 'Picture size', 'This channel', 'Zoom')}</div>${hint([['OK', 'Watch from tip-off'], ['▲ ▼', 'Move · 2 more below'], ['Back', 'Close']])}`,
'◀ on a live game on a kept channel: Watch from tip-off is the second row (Sync score stays first), Rewind and pause the third. Two more rows below.', { group: 'Player', shield: true });

// ---- P7: going live would show the result ----
page('player-golive.html', 'Player: Back to live, shield on', `${video('arena2', 'arena')}<div class="nv-card cu-wide"><div class="t"><b>Going live may show the score</b><span>NBA League Pass 4 is live now. Your replay stays where you left it.</span></div><div class="cu-cbtns"><span class="btn sm f">Stay in the replay</span><span class="btn2 sm">Go live</span></div></div>${hint([['OK', 'Stay'], ['◀ ▶', 'Move'], ['Back', 'Stay']])}`,
'v1.1: under the shield, Back to live in a hidden game\'s replay always asks, with the same words, so the card never tells whether the game has ended.', { group: 'Player', shield: true });

// ---- P8: an archived programme ----
const PA = T('2026-10-26T20:00:00Z'), PB = T('2026-10-26T21:00:00Z');
page('player-programme.html', 'Player: an archived programme', `${video('coast')}${vtop('Coastline', 'Replay · BBC One HD · Mon 26 Oct · 20:00 to 21:00', '<b>Ends at 11:06</b><span>Next: Night Circuit</span>')}${tbar({
  a: PA, b: PB, pos: T('2026-10-26T20:34:10Z'), left: '34:10', right: '−25:50',
  btnL: `${vb(ic('pause'))}${vb(ic('restart'))}${vb('−1m', { t: 1 })}${vb('+1m', { t: 1 })}${pill(`Next programme${ic('chevR', 'sm')}`)}`, btnR: RIGHT3,
})}${HINT_T}`,
'OK on a kept programme in the guide: the movie bar, with the programme\'s own times. At the end, Up next offers the next programme on the channel.', { group: 'Player', shield: true, other: true });

// ---- P9: paused live TV on a kept channel ----
const LA = T('2026-10-27T10:15:00Z'), LB = T('2026-10-27T11:00:00Z');
page('player-paused.html', 'Player: live TV paused', `${video('bargain')}${vtop('Bargain Street', 'BBC One HD · 10:15 to 11:00 · paused', '<b>2:14 behind live</b><span>Kept 7 days on this channel</span>')}${tbar({
  a: LA, b: LB, pos: T('2026-10-27T10:37:46Z'), live: NOW, left: '10:15', right: '11:00',
  btnL: `${vb(ic('play'))}${vb(ic('restart'))}${vb('−1m', { t: 1 })}${vb('+1m', { t: 1 })}`, btnR: `${pill('Back to live')}${RIGHT3}`,
})}${hint([['OK', 'Play'], ['◀ ▶', '10 s, hold for faster'], ['▲', 'Buttons'], ['▼', 'Options'], ['Back', 'Hide']])}`,
'Pause on a kept channel: the bar shows the programme, the live edge and how far behind you are. ⏮ starts the programme over; Back to live returns.', { group: 'Player', shield: true, other: true });

// ---- P10: paused live TV on a channel that isn't kept: what the TV holds ----
const BA = T('2026-10-27T10:38:00Z');
page('player-paused-local.html', 'Player: paused, not kept', `${video('espn')}${vtop('SportsCenter', 'US: ESPN HD · paused', '<b>0:20 behind live</b><span>This channel rewinds 45 s</span>')}${tbar({
  a: NOW - 45000, b: NOW + 1500, pos: NOW - 20000, live: NOW, left: '45 s ago',
  btnL: `${vb(ic('play'))}${vb('−10', { t: 1 })}${vb('+10', { t: 1 })}`, btnR: `${pill('Back to live')}${RIGHT3}`,
})}${hint([['OK', 'Play'], ['◀ ▶', '10 s'], ['▲', 'Buttons'], ['▼', 'Options'], ['Back', 'Hide']])}`,
'v1.1 (review M9): a channel the provider doesn\'t keep rewinds only inside the stream\'s own window (HLS, 45 s here); a .ts channel pauses only. The bar shows the real span.', { group: 'Player', shield: true, other: true });

// ---- P11: a full-game video from Movies ----
const VA = 0, VB = 3.5 * 3600e3;
page('player-video-replay.html', 'Player: a full-game video', `${video('arena3', 'arena')}${vtop('Grizzlies at Jazz', 'Full game · Memphis feed · from Movies', `<div class="row-flex">${eyeSm}<b>Score hidden</b></div><span>Seen at the end of the video</span>`)}${tbar({
  a: VA, b: VB, pos: 38.2 * 60e3, left: '38:12', right: `${eyeSm}End hidden`,
  btnL: `${vb(ic('pause'))}${vb(ic('restart'))}${vb('−1m', { t: 1 })}${vb('+1m', { t: 1 })}`, btnR: `${GAMEB()}${RIGHT3}`,
})}${HINT_T}`,
'A video from Movies plays in the same hidden-end timeline (also when started from Movies). No quarter marks: its timing is unknown.', { group: 'Player', shield: true });

// ---- P12: the archive didn't answer ----
page('player-replay-failed.html', 'Player: the replay didn\'t start', `${video('arena2', 'arena')}<div class="nv-card cu-wide" style="align-items:stretch;gap:10px;padding:18px 18px 14px"><div class="t" style="text-align:left"><b>This replay didn't start</b><span>NBA League Pass 4's replay didn't start.</span></div>
  <div class="nv-row f" style="height:56px"><span class="ico">${ic('film', 'sm')}</span><div class="grow"><div class="a">Full game · Memphis feed</div><div class="b">Movies · NBA Replays · 1080p</div></div></div>
  <div class="row-flex" style="gap:10px;justify-content:space-between"><span class="btn2 sm">Try again</span><span class="t-cap">Back closes</span></div></div>`,
'If the archive fails, the other source is one OK away (here the video in Movies), focused. No score anywhere on the card.', { group: 'Player', shield: true });

// ---- P13: watching live: the game panel's new button ----
const full = [['Boozer', '18', '11', '4', '1'], ['Grant', '17', '8', '2', '1'], ['Edey', '15', '6', '7', '0'], ['Coward', '16', '5', '2', '3'], ['Hendricks', '12', '4', '3', '1'], ['Jackson', '10', '7', '1', '0']];
page('player-panel-live.html', 'Player: game panel, from tip-off', `${video('arena', 'arena')}<div class="nv-panel right" style="width:280px"><div class="nv-sc"><div class="tm">${crest('MEM', 'md')}<span class="plate" data-moment="1"><span class="x"><span class="score sm" style="display:flex;gap:10px"><span>41</span><span style="opacity:.55">–</span><span>38</span></span></span></span>${crest('UTAH', 'md')}</div>
  <div class="t-cap" style="display:flex;justify-content:center;align-items:center;gap:8px">Q2 5:18${dot}<span style="display:inline-flex;gap:4px;align-items:center">${ic('clock', 'sm')}Synced · 42 s</span></div></div>
  <div class="nv-tabs cu-t"><span class="on">MEM</span><span>UTA</span><span>Plays</span><span class="act">${ic('refresh', 'sm')}Sync</span></div>
  <table class="nv-box"><tr><th></th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th></tr>${full.map((r) => `<tr><td>${r[0]}</td>${r.slice(1).map((v, k) => `<td${k === 1 ? ' class="b"' : ''}>${v}</td>`).join('')}</tr>`).join('')}</table>
  <div class="nv-foot"><span class="btn2 sm f-ring">${ic('restart', 'sm')}From tip-off</span><div class="t-cap" style="margin-top:10px">Back closes</div></div></div>`,
'▶ while watching a live game on a kept channel: the panel (the reveal you asked for, as today) gets a From tip-off button at its foot. v1.1: the tabs fit the panel (the Sync chip was cut). (Figures illustrative.)', { group: 'Player', shield: true });

// =====================================================================================================================
// v1.1 additions (review M3, M6, M8, S3)
// =====================================================================================================================
// ---- N13: Home while you're behind in a replay of a live game (M3): your position, never the live clock ----
{
  const lp = `<div class="hc"><div class="art"><div class="cu-match" style="background:linear-gradient(100deg,${pal('MEM').p} 50%,${pal('UTAH').p} 50%)"></div></div><div class="hs"></div><div class="tp"><span class="logo sm">NBA</span>${liveP()}<span class="n">41</span></div><div class="bt"><b>NBA: Grizzlies at Jazz</b><span>NBA League Pass 4</span></div></div>`;
  const others = [['US: ESPN HD', 210, 'ES', 'espn', 0, 'SportsCenter', 40], ['Sky Sports Main Event', 402, 'SS', 'sky', 0, 'Sky Sports News', 30], ['BBC One HD', 101, 'BBC', 'bbc', 0, 'BBC News', 60], ['CNN International', 115, 'CNN', 'cnn', 0, 'CNN Newsroom', 20]].map((c, i) => onNowCard(c, i)).join('');
  const peek = `<div class="gc"><div class="st">${liveP()}<span>You're in Q1</span></div><div class="pk ellipsis">Grizzlies at Jazz</div></div>` + ['WSH', 'MIN', 'BOS'].map((a, i) => `<div class="gc" data-other="1"><div class="st">${liveP()}<span>${['Q4 2:10', 'Q4 5:41', 'Q3 1:02'][i]}</span><span class="tvn">NBA League Pass</span></div><div class="pk ellipsis">${NAME[a]} at ${NAME[['CHA', 'CLE', 'CHI'][i]]}</div></div>`).join('');
  page('home-behind.html', 'Home: behind in a replay', `${topbar('home', { nbaLive: 1 })}${hero({
    label: 1, status: `${liveP()}<span class="t-label t-2">NBA${dot}NBA League Pass 4</span>`, ar: recM, hr: recU, score: hidTile,
    btns: [{ t: 'Resume', i: 'play', f: 1 }, { t: 'Back to live' }, { t: 'Game page' }],
    slab: '<span class="big">Q1</span><span class="big">8:20</span><span class="cap">You stopped here</span>',
  })}${rail('On now', lp + others, 278)}${rail('Tonight\'s games', peek, 422, 1)}<div class="edgefade"></div>`,
  'v1.1 (review M3): 02:35, you left your replay in Q1. The game shows your position, never the live clock; LIVE stays until tip-off + 3 h 30; the channel keeps the game\'s title.', { group: 'NBA', shield: true });
}
// ---- P14: Options in a replay: the Game panel, other sources, "Not the game?" (M6, M8) ----
page('player-replay-options.html', 'Player: Options in a replay', `${video('arena2', 'arena')}<div class="nv-panel left" style="width:340px"><div class="nv-h">Options</div>
  ${orow('score', 'Game panel', 'Quarters and plays, as aired', '')}${orow('film', 'Other sources', 'Full game in Movies, 2 more', '3')}${orow('clock', 'Not the game?', 'It starts on the wrong show', '', { f: 1 })}${orow('refresh', 'Sync score', 'Match the game clock', '22 s')}${orow('cc', 'Subtitles', '', 'Off')}${orow('audio', 'Audio', '', 'English')}${orow('pic', 'Picture size', 'This channel', 'Zoom')}</div>${hint([['OK', 'Open'], ['▲ ▼', 'Move'], ['Back', 'Close']])}`,
'v1.1: ▼ in a game replay. Game panel (the panel\'s second way in, M8), Other sources, and Not the game? for a replay that lands on the wrong show (M6).', { group: 'Player', shield: true });
page('player-notgame.html', 'Player: Not the game?', `${video('studio', 'arena')}<div class="nv-panel left" style="width:360px"><div class="nv-h">Not the game?</div>
  <div class="t-cap" style="padding:2px 10px 6px">If the replay starts on the wrong show, move it. airglow remembers this for your provider.</div>
  ${orow('chevR', 'Go 1 hour later', 'It shows what was on before the game', '', { f: 1 })}${orow('chevL', 'Go 1 hour earlier', 'It starts mid-game, or after the game', '')}${orow('film', 'Other sources', 'Full game in Movies, 2 more', '3')}</div>${hint([['OK', 'Move the replay'], ['▲ ▼', 'Move'], ['Back', 'Close']])}`,
'v1.1 (review M6): a panel whose clock is an hour off. One OK moves the replay and stores the correction per account (archiveShift), so the next one starts right.', { group: 'Player', shield: true });
// ---- P15: the connection limit (S3) ----
page('player-connlimit.html', 'Player: one stream at a time', `${video('arena2', 'arena')}<div class="nv-card cu-wide" style="align-items:stretch;gap:12px;padding:18px 18px 14px"><div class="t" style="text-align:left"><b>Your provider allows 1 stream</b><span>Close it on your other devices, or wait a few seconds. Trying again in 5 s.</span></div>
  <div class="row-flex" style="gap:10px;justify-content:space-between"><span class="btn sm f">${ic('refresh', 'sm')}Try again now</span><span class="t-cap">Back closes</span></div></div>`,
'v1.1 (review S3): one of the split failure cards. Seeking asks once per pause in key presses (M10); if the provider still says the slot is taken, it waits and retries on its own.', { group: 'Player', shield: true });

fs.writeFileSync(path.join(root, 'tools', 'pages.json'), JSON.stringify(pages, null, 1));
console.log(`wrote ${pages.length} mocks`);
