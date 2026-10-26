/* airglow UI mocks: markup builders. Each one emits the same class names ui.css styles, so a screen is a few lines and
   the CSS stays the thing that gets ported into the app. */
(function (g) {
  'use strict';
  const { Mock, Art } = g;
  const BR = g.BRAND_BASE || '../../brand-v5/v5.4/';

  const P = {
    home: '<path d="M3.5 11 12 3.5l8.5 7.5v8.5a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>',
    live: '<circle cx="12" cy="12" r="1.7"/><path d="M8 8a5.7 5.7 0 0 0 0 8M16 8a5.7 5.7 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
    nba: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M6 5.6c3.4 3.6 3.4 9.2 0 12.8M18 5.6c-3.4 3.6-3.4 9.2 0 12.8"/>',
    movies: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/>',
    series: '<rect x="3" y="4.5" width="18" height="12.5" rx="2.5"/><path d="M10 8.5v5l4.2-2.5zM8 21h8"/>',
    saved: '<path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4-6.5 4V4.5a1 1 0 0 1 1-1z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/>',
    play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    chevR: '<path d="M9 5l7 7-7 7"/>', chevL: '<path d="M15 5l-7 7 7 7"/>', chevD: '<path d="M5 9l7 7 7-7"/>', chevU: '<path d="M5 15l7-7 7 7"/>',
    sliders: '<path d="M4 7h8M18 7h2M4 17h2M12 17h8"/><circle cx="15" cy="7" r="2.5"/><circle cx="9" cy="17" r="2.5"/>',
    sort: '<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>',
    cc: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17.5 10.2a2.4 2.4 0 1 0 0 3.6"/>',
    audio: '<path d="M4 9.5v5h4L13 19V5L8 9.5z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>',
    pic: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M7 10V8.5h1.5M17 14v1.5h-1.5"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.6M12 18.4V21M3 12h2.6M18.4 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    star: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9z" fill="currentColor" stroke="none"/>',
    starO: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9z"/>',
    grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    restart: '<path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5"/>',
    wifiOff: '<path d="M2.5 9a15 15 0 0 1 19 0M5.5 12.8a10.5 10.5 0 0 1 13 0M8.8 16.4a5.5 5.5 0 0 1 6.4 0M12 20h.01M3 3l18 18"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M3 15h18"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7a13 13 0 0 1-2.4 3.7M6.4 6.6A13 13 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    pin: '<path d="M9 3h6l-1 6 3.5 3.5h-11L10 9zM12 16v5"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5"/>',
    score: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M12 5.5v13M6.5 10h2.5M15 10h2.5M6.5 14h2.5M15 14h2.5"/>',
  };
  const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
  const img = (f, cls = '', h) => `<img src="${BR}assets/${f}" class="${cls}"${h ? ` height="${h}"` : ''} alt="">`;
  const f = (on, kind = 'f') => (on ? ` ${kind}` : '');

  const TABS = [['home', 'Home'], ['live', 'Live'], ['nba', 'NBA'], ['movies', 'Movies'], ['series', 'Series'], ['saved', 'Saved']];
  function topbar({ sel = 'home', focus = '', live = true, update = false } = {}) {
    const srch = `<span class="tab srch${sel === 'search' ? ' sel' : ''}${focus === 'tab:search' ? ' f-ring' : ''}">${ic('search')}Search</span>`;
    const tabs = TABS.map(([k, l]) => `<span class="tab${k === sel ? ' sel' : ''}${focus === 'tab:' + k ? ' f-ring' : ''}">${l}${k === 'nba' && live ? '<span class="a-live compact">Live</span>' : ''}</span>`).join('');
    return `<div class="topbar">${img('mark-small.svg', 'mk')}<div class="tabs">${srch}${tabs}</div>
      <div class="tb-r"><span class="avatar${f(focus === 'account', 'f-ring')}" style="box-sizing:content-box">B${update ? '<i class="udot"></i>' : ''}</span></div></div>`;
  }

  const tag = (t, c = '') => `<span class="tag ${c}">${t}</span>`;
  const liveP = () => '<span class="a-live">Live</span>';
  const dot = '<span class="dot-sep"></span>';
  const star = (n) => `<span class="star">${ic('star')}${n}</span>`;
  const initials = (t) => t.replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  function posterArt(m) {
    if (m.noart) return `<div class="noart"><span class="ini">${initials(m.t)}</span><span class="nt clamp3">${m.t}</span></div>`;
    return `<div class="art">${Art.poster(m.id, { style: m.style, hue: m.hue, title: m.t })}</div>`;
  }
  function poster(m, { focus = false } = {}) {
    const tl = (m.q || []).includes('4K') ? tag('4K', 'q') : '';
    const tr = m.vers > 1 ? tag('+' + (m.vers - 1)) : (m.lang && m.lang !== 'EN' ? tag(m.lang) : '');
    return `<div class="pc${focus ? ' fc' : ''}"><div class="box${focus ? ' f' : ''}">${posterArt(m)}${tl ? `<div class="tl">${tl}</div>` : ''}${tr ? `<div class="tr">${tr}</div>` : ''}${m.prog ? `<div class="prog flush"><i style="width:${m.prog}%"></i></div>` : ''}</div>
      <div class="cap">${m.t}</div><div class="cm">${m.y}${dot}${(m.g && m.g[0]) || ''}</div></div>`;
  }
  function wcard({ seed, style, hue, title, meta, prog, tl = '', tr = '', focus = false, noart = false, w, h }) {
    const st = w ? ` style="width:${w}px;height:${h}px"` : '';
    return `<div class="wc${focus ? ' f' : ''}"${st}><div class="art">${noart ? '' : Art.art(seed, { style, hue })}</div>${tl ? `<div class="tl">${tl}</div>` : ''}${tr ? `<div class="tr">${tr}</div>` : ''}
      <div class="tx"><b>${title}</b><span>${meta}</span></div>${prog != null ? `<div class="prog flush"><i style="width:${prog}%"></i></div>` : ''}</div>`;
  }
  /* Home rail cards (198 x 100). Text sits at the TOP of the card so the second row still reads when only its top half shows. */
  function liveCard(ch, { focus = false } = {}) {
    const n = ch.now, pg = Math.max(0, Math.min(100, ((Kit_NOW() - n.s) / (n.e - n.s)) * 100));
    return `<div class="hc${focus ? ' f' : ''}"><div class="art">${Art.art('ch' + ch.n, ch.art || {})}</div><div class="hs"></div>
      <div class="tp"><span class="logo sm">${ch.ini}</span>${n.live ? liveP() : ''}<span class="n">${ch.n}</span></div>
      <div class="bt"><b>${n.t}</b><span>${ch.name}</span></div><div class="prog flush"><i style="width:${pg}%"></i></div></div>`;
  }
  function contCard({ seed, style, hue, title, kind, left, prog, focus = false }) {
    return `<div class="hc${focus ? ' f' : ''}"><div class="art">${Art.art(seed, { style, hue })}</div><div class="hs"></div>
      <div class="tp"><span class="t-label" style="line-height:22px">${kind}</span><span class="n">${left}</span></div>
      <div class="bt"><b>${title}</b></div><div class="prog flush"><i style="width:${prog}%"></i></div></div>`;
  }
  const Kit_NOW = () => Mock.NOW.mins / 60;
  /* Team mark: the app puts the ESPN logo (500-dark) in the neutral disc. The stand-in is a crest in the team's own two colours inside the same disc. */
  const lumOf = (hex) => { const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4))); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const team = (abbr, size = '') => { const T = Mock.TEAMS[abbr]; const dark = lumOf(T.c1) < 0.3; return `<span class="team ${size}"><i style="background:${T.c1};box-shadow:inset 0 0 0 2px ${T.c2};color:${dark ? '#F3EFE6' : '#14101F'}">${abbr}</i></span>`; };
  /* Plate colours for a matchup: when both primaries sit in the same hue family (MEM navy and GS blue) the home team falls back to a neutral plate and keeps its accent bar, so the two sides never read as one block. Gold is never a plate (BRAND.md: gold only as a bar of 4 px or inside a crest). */
  const hueOf = (hex) => { const [r, gg, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn; if (!d) return -1; const h = mx === r ? ((gg - b) / d) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; return (h * 60 + 360) % 360; };
  const plates = (away, home) => { const a = Mock.TEAMS[away].p, h = Mock.TEAMS[home].p, dh = Math.abs(hueOf(a) - hueOf(h)); return [a, dh < 15 || dh > 345 ? '#35333F' : h]; };
  const edge = (abbr) => `<span class="tedge" style="background:${Mock.TEAMS[abbr].a}"></span>`;

  /* Game card: upright Soft card, Sharp skewed score plate inside. state: in | post | pre. */
  function gameCard(gm, { focus = false, shield = false } = {}) {
    const A = Mock.TEAMS[gm.away], H = Mock.TEAMS[gm.home];
    let st = '', plate = '';
    if (gm.state === 'in') { st = `${liveP()}<span>Q${gm.q} ${gm.clock}</span>`; }
    else if (gm.state === 'post') { st = `<span>Final${gm.ot ? ' / OT' : ''}</span>`; }
    else { const [hh, mm] = gm.tip.split(':').map(Number); const d = hh * 60 + mm - Mock.NOW.mins; st = `<span>In ${d >= 60 ? Math.floor(d / 60) + 'h ' + String(d % 60).padStart(2, '0') + 'm' : d + ' min'}</span>`; }
    const tv = `<span class="tvn">${gm.tv[0]}</span>`;
    const awWin = !shield && gm.state === 'post' && gm.aw > gm.hw, hwWin = !shield && gm.state === 'post' && gm.hw > gm.aw;
    if (gm.state === 'pre') plate = `<span class="plate"><span class="x"><span class="score sm">${gm.tip}</span><span class="t-cap">tip-off</span></span></span>`;
    else plate = `<span class="plate"><span class="x"><span class="score md">${gm.aw}</span><span class="score md" style="opacity:${gm.state === 'post' && !awWin ? .7 : 1}">${gm.hw}</span></span></span>`;
    if (shield && gm.state !== 'pre') { st = gm.state === 'in' ? `${liveP()}<span>Q${gm.q} ${gm.clock}</span>` : '<span>Ended</span>'; plate = `<span class="plate"><span class="x">${ic('eyeOff')}<span class="t-cap">hidden</span></span></span>`; }
    const lose = (w) => (gm.state === 'post' && !w ? ' lose' : '');
    return `<div class="gc${focus ? ' f' : ''}"><div class="st">${st}${tv}</div>
      <div class="tr${lose(awWin)}">${edge(gm.away)}${team(gm.away)}<span class="nm">${A.n}</span><span class="rc">${gm.ar}</span></div>
      <div class="tr${lose(hwWin)}">${edge(gm.home)}${team(gm.home)}<span class="nm">${H.n}</span><span class="rc">${gm.hr}</span></div>${plate}</div>`;
  }

  /* Guide */
  const WIN = { start: 20 + 40 / 60, hours: 2.5 };   // window starts at "now" (floored to 10 min): the left edge of the axis is now
  const pct = (h) => ((h - WIN.start) / WIN.hours) * 100;
  const hm = (h) => { const m = Math.round(h * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const NOWH = Mock.NOW.mins / 60;
  function cell(c, { focus = false, now = false, live = false, empty = false } = {}) {
    const s = Math.max(c.s, WIN.start), e = Math.min(c.e, WIN.start + WIN.hours);
    const clipL = c.s < WIN.start;
    const wide = (e - s) >= 0.6;
    const sub = empty ? '' : live ? '<span class="a-live compact">Live</span>' : `${clipL ? '◂ ' : ''}${hm(c.s)}${wide ? dot + hm(c.e) : ''}`;
    const pg = now ? `<div class="prog"><i style="width:${Math.min(100, ((NOWH - c.s) / (c.e - c.s)) * 100)}%"></i></div>` : '';
    const px = ((e - s) / WIN.hours) * 656 - 4;
    if (px < 56) return `<div class="g-cell sliver${focus ? ' f-in' : ''}" style="left:${pct(s)}%;width:calc(${pct(e) - pct(s)}% - 4px)"></div>`;   // too narrow for text: a silhouette, the full title is in the Now panel
    return `<div class="g-cell${now ? ' now' : ''}${focus ? ' f-in' : ''}${empty ? ' empty' : ''}" style="left:${pct(s)}%;width:calc(${pct(e) - pct(s)}% - 4px)"><b>${c.t}</b><div class="sb">${sub}</div>${pg}</div>`;
  }
  g.Kit = { plates, hueOf, contCard, edge, lumOf, P, TABS, ic, img, BR, topbar, tag, liveP, dot, star, initials, poster, wcard, liveCard, team, gameCard, cell, hm, pct, WIN, NOWH, f };
})(window);
