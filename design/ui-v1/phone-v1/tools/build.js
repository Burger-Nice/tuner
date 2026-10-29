// Builds the iPhone mocks from one timeline (the same evening as home-final: Wed 28 Oct 2026, Reykjavik, shield My team).
// node tools/build.js -> ../*.html. Art: ../home-final/art (Cinemeta / metahub), ../nba-pages/img (ESPN crests).
const fs = require('fs'); const path = require('path');
const root = path.resolve(__dirname, '..');
const ART = '../home-final/art/', IMG = '../nba-pages/img/', BRAND = '../../../app/tv/brand/';

// ---- icons (stroke unless .f) ----
const I = {
  search: '<svg class="ic" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9"/></svg>',
  chev: '<svg class="ic" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg>',
  eyeoff: '<svg class="eyeoff" viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7a13 13 0 0 1-2.4 3.7M6.4 6.6A13 13 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  hist: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 8v4l3 2"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 2.2H4.4z"/><path d="M10 21a2.2 2.2 0 0 0 4 0"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.4 6.3 20.5l1.2-6.4L2.8 9.7l6.4-.8z"/></svg>',
  starf: '<svg class="star" viewBox="0 0 24 24"><path d="M12 3l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.4 6.3 20.5l1.2-6.4L2.8 9.7l6.4-.8z"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 17v5M8 7V3h8v4l2 6H6z"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  cc: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 10.5a2 2 0 1 0 0 3M16 10.5a2 2 0 1 0 0 3"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M4 7h3M10 7h10M4 12h3M10 12h10M4 17h3M10 17h10"/></svg>',
  tick: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  pause: '<svg class="f" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
  playf: '<svg class="f" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',
  back10: '<svg viewBox="0 0 24 24"><path d="M4 11a8 8 0 1 0 2.5-5.8M4 3v5h5"/></svg>',
  fwd10: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 1-2.5-5.8M20 3v5h-5"/></svg>',
  next: '<svg class="f" viewBox="0 0 24 24"><path d="M5 5l10 7-10 7zM17 5h2v14h-2z"/></svg>',
  airplay: '<svg viewBox="0 0 24 24"><path d="M6 17H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-1"/><path d="M12 14l5 7H7z"/></svg>',
  pip: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><rect x="11" y="11" width="8" height="6" rx="1" fill="currentColor" stroke="none"/></svg>',
  sliders: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8M4 12h16"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  chup: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  chdown: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  game: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  tv: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  qr: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v2M17 20h4M14 20v1"/></svg>',
  key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/></svg>',
  wifi: '<svg viewBox="0 0 24 24"><path d="M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="19.5" r="1.2" fill="currentColor"/></svg>',
  puzzle: '<svg viewBox="0 0 24 24"><path d="M10 4a2 2 0 1 1 4 0v2h4v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 1-4 0H6v-4a2 2 0 1 0 0-4V6h4z"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  rows: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/></svg>',
  film: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>',
  dl: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/></svg>',
  out: '<svg viewBox="0 0 24 24"><path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.4 7.8-8 9-4.6-1.2-8-4.5-8-9V6z"/></svg>',
  data: '<svg viewBox="0 0 24 24"><path d="M4 18h3v-5H4zM10 18h3V9h-3zM16 18h3V4h-3z"/></svg>',
  speaker: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
};
const tabIcons = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  live: '<svg viewBox="0 0 24 24"><path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v9a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 15.5zM7 21h10v-1.5H7z"/><path d="M10 8l5 3.5-5 3.5z" fill="#15131D"/></svg>',
  nba: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 1.8c1.1 0 2.1.2 3 .6-1.2 1.6-2 3.6-2.2 5.8-2.2-.2-4.2-1-5.8-2.2a8.2 8.2 0 0 1 5-4.2zm-6.2 5.7c1.9 1.4 4.2 2.3 6.9 2.5v.2c0 2.7-.9 5-2.5 6.9A8.2 8.2 0 0 1 3.8 12c0-.9.1-1.7.4-2.5zm10.5-4a8.2 8.2 0 0 1 3.9 6.5c0 .9-.1 1.7-.4 2.5-1.9-1.4-4.2-2.3-6.9-2.5v-.2c0-2.3.6-4.5 1.8-6.3zm-1.1 8.3c2.2.2 4.2 1 5.8 2.2a8.2 8.2 0 0 1-5 4.2c-1.1 0-2.1-.2-3-.6 1.2-1.6 2-3.6 2.2-5.8z"/></svg>',
  lib: '<svg viewBox="0 0 24 24"><path d="M3 5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM10 5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1zM16.3 6.1a1 1 0 0 1 .7-1.2l2.9-.8a1 1 0 0 1 1.2.7l3.6 13.5a1 1 0 0 1-.7 1.2l-2.9.8a1 1 0 0 1-1.2-.7z"/></svg>',
};

// ---- frame ----
const status = (time) => `<div class="ph-status"><span class="tm">${time}</span><span class="rt">
  <svg viewBox="0 0 20 13"><rect x="0" y="9" width="3" height="4" rx=".8"/><rect x="5" y="6.5" width="3" height="6.5" rx=".8"/><rect x="10" y="3.5" width="3" height="9.5" rx=".8"/><rect x="15" y="0" width="3" height="13" rx=".8"/></svg>
  <svg viewBox="0 0 18 13"><path d="M9 11.2a1.7 1.7 0 1 0 0 .1zM5.8 8.1a4.6 4.6 0 0 1 6.4 0l1.2-1.3a6.4 6.4 0 0 0-8.8 0zM2.6 4.9a9.2 9.2 0 0 1 12.8 0L16.6 3.6a11 11 0 0 0-15.2 0z"/></svg>
  <svg viewBox="0 0 28 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2"/><path d="M25.5 4.5v4a2 2 0 0 0 0-4z" opacity=".4"/></svg></span></div>
<div class="ph-island"></div><div class="ph-home"></div>`;
const tabs = (sel, { liveNba = false } = {}) => `<div class="ph-tabfade"></div><div class="ph-tabs"><div class="bar">
  <span class="t ${sel === 'home' ? 'sel' : ''}">${tabIcons.home}<span>Home</span></span>
  <span class="t ${sel === 'live' ? 'sel' : ''}">${tabIcons.live}<span>Live</span></span>
  <span class="t ${sel === 'nba' ? 'sel' : ''}">${tabIcons.nba}<span>${liveNba ? '<span class="live">Live</span>' : 'NBA'}</span></span>
  <span class="t ${sel === 'lib' ? 'sel' : ''}">${tabIcons.lib}<span>Library</span></span>
</div><span class="srch">${I.search}</span></div>`;
const topbar = ({ title, mark = true, right = '', clock = '' } = {}) => `<div class="ph-top">${mark ? `<img class="mk" src="${BRAND}assets/mark-small.svg" alt="">` : ''}${title ? `<h1>${title}</h1>` : ''}<span class="sp"></span>${clock ? `<span class="clk">${clock}</span>` : ''}${right}<span class="avatar">${I.user}</span></div>`;
const page = ({ title, body, land = false, extraCss = '' }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=${land ? 852 : 393},height=${land ? 393 : 852}">
<meta name="mock-size" content="${land ? '852x393' : '393x852'}@3">
<title>${title}</title>
<link rel="stylesheet" href="${BRAND}fonts.css"><link rel="stylesheet" href="${BRAND}tokens.css"><link rel="stylesheet" href="phone.css">
${extraCss ? `<style>${extraCss}</style>` : ''}
</head><body><div class="phone${land ? ' land' : ''}">
${body}
</div></body></html>
`;

const dot = '<span class="dot">·</span>';
const posters = (names) => names.map((n) => `<div class="poster"><img src="${ART}${n}-poster.jpg" alt=""></div>`).join('');

// ---- 01 Home, a normal evening ----
const home01 = page({ title: 'Home, a normal evening', body: `
<div class="hm-pic" style="--pos:74% 28%"><img src="${ART}severance-bg.jpg" alt=""><div class="hm-cap" style="--capa:.42"></div><div class="hm-amb" style="--amb:#3B5247"></div><div class="hm-st"></div><div class="hm-sb"></div></div>
<div class="grain"></div>
${status('20:41')}
${topbar({})}
<div class="hm-card" style="top:238px;--ambt:rgba(59,82,71,.62)">
  <div class="ey">Continue watching</div>
  <img class="logo" src="${ART}severance-logo.png" alt="Severance">
  <div class="meta"><span>S2 · E3</span>${dot}<span>Who Is Alive?</span>${dot}<span>21 min left</span>${dot}<span>Ends 21:02</span><span class="badge">4K</span></div>
  <div class="line">Mark, Helly, Irving and Dylan search for answers.</div>
  <div class="bar4" style="--p:57%"><i></i></div>
  <div class="act"><span class="pill">${I.play}Resume</span><span class="ghost">${I.list}Episodes</span><span class="ghost" style="padding:0 12px">${I.more.replace('<svg', '<svg style="fill:currentColor;stroke:none"')}</span></div>
</div>
<div class="hm-lines" style="top:486px">
  <div class="e"><b>Slow Horses</b><small>S6 · E4<span class="count">3 new</span></small>${I.chev}</div>
  <div class="e"><b>Heat</b><small>A film for tonight${dot}ends 23:31${dot}4K</small>${I.chev}</div>
  <div class="e"><b>Grizzlies at Blazers</b><small>Tonight${dot}02:00</small>${I.chev}</div>
</div>
<div class="row" style="top:634px"><div class="rt">Comedy for you<span>Because you watch Always Sunny, The Office and 12 more</span><span class="more">15 rows${I.chdown.replace('<svg', '<svg class="ic"')}</span></div>
  <div class="cards">${posters(['palmsprings', 'niceguys', 'gemstones', 'hotfuzz'])}</div></div>
${tabs('home')}
` });

// ---- 02 Home, game night ----
const home02 = page({ title: 'Home, game night', extraCss: `.field { --away: #12173F; --away-a: #5D76A9; --home: #B9302F; --home-a: #1C1C1C; --split: 62%; }`, body: `
<div class="field"><div class="away"></div><div class="home"></div><div class="edge"><i></i><i></i></div><div class="shade0"></div><div class="st"></div><div class="shade"></div></div>
<div class="grain"></div>
${status('03:12')}
${topbar({})}
<div class="crest gn-crest" style="left:66px;top:112px"><img src="${ART}mem.png" alt=""><div class="n"><b>Grizzlies</b><span>3-0 · as of tip-off</span></div></div>
<div class="crest gn-crest" style="left:231px;top:112px"><img src="${ART}por.png" alt=""><div class="n"><b>Trail Blazers</b><span>1-3 · as of tip-off</span></div></div>
<div class="gn-score" style="left:84px;top:254px"><div class="clock"><span>ON NOW</span></div><div class="plate"><span>${I.eyeoff}Score hidden</span></div></div>
<div class="hm-card sharp" style="top:308px;--ambt:rgba(18,23,63,.72)">
  <div class="ey">Game night <span class="live">Live</span></div>
  <div class="big">Grizzlies at Trail Blazers</div>
  <div class="meta"><span>On now</span>${dot}<span>ESPN</span><span class="badge">4K</span>${dot}${I.eyeoff}<span>Score hidden</span></div>
  <div class="line">3rd in the West · 3 in a row · as of tip-off</div>
  <div class="act"><span class="pill">${I.play}Watch live</span><span class="ghost">${I.hist}From tip-off</span></div>
</div>
<div class="hm-lines" style="top:522px">
  <div class="e"><b>Severance</b><small>Continue${dot}S2 · E3${dot}21 min left</small>${I.chev}</div>
  <div class="e"><b>Slow Horses</b><small>S6 · E4<span class="count">3 new</span></small>${I.chev}</div>
  <div class="e"><b>It’s Always Sunny</b><small>Short${dot}S18 · E10${dot}25 min</small>${I.chev}</div>
</div>
<div class="row" style="top:670px"><div class="rt">Tonight in the NBA<span>6 games · 2 live · 2 final · 2 later</span><span class="more">15 rows${I.chdown.replace('<svg', '<svg class="ic"')}</span></div>
  <div class="cards"><div class="gc" style="--ta:#5D76A9"><div class="ed"></div><div class="st mine">Your team · live</div>
  <div class="tm"><span class="cr"><img src="${ART}mem.png" alt=""></span><b>Grizzlies</b><span class="vs">at</span><span class="cr"><img src="${ART}por.png" alt=""></span><b>Blazers</b></div>
  <div class="ch">ESPN · 4K</div><div class="pl">${I.eyeoff}<span>Score hidden</span></div></div>
  <div class="gc" style="--ta:#FEC524"><div class="ed"></div><div class="st">Live</div>
  <div class="tm"><span class="cr"><img src="${ART}den.png" alt=""></span><b>Nuggets</b><span class="vs">at</span><span class="cr"><img src="${ART}okc.png" alt=""></span><b>Thunder</b></div>
  <div class="ch">Prime Video</div><div class="pl tip">3RD</div></div></div></div>
${tabs('home', { liveNba: true })}
` });

// ---- 03 Live ----
const ch = ({ no, ab, name, tile, pg, from, until, p, next, live = false, fav = false, nog = false, logo = '', cls = '' }) => `<div class="lv-ch ${cls}">
  <span class="no">${no}</span><span class="tile" style="${tile ? `--tile:${tile}` : ''}">${logo ? `<img src="${logo}" alt="" style="width:100%;height:100%;object-fit:contain">` : ab}</span>
  <div class="col"><div class="nm">${name}${fav ? I.star.replace('<svg', '<svg style="fill:var(--a-text-3);stroke:none"') : ''}</div>
  ${nog ? `<div class="pg dim">No guide information</div>` : `<div class="pg"><span class="tx">${pg}</span>${live ? '<span class="live sm">Live</span>' : ''}</div>
  <div class="nx"><span class="bar4" style="--p:${p}%"><i></i></span><span>${from} to ${until}</span>${next ? `${dot}<span class="tx">Next ${next}</span>` : ''}</div>`}</div>
  <div class="r"><span class="chev">${I.chev.replace('class="ic"', '')}</span></div></div>`;
const live03 = page({ title: 'Live', body: `
${status('20:41')}
${topbar({ title: 'Live', mark: false, right: `<span class="ib">${I.search}</span>` })}
<div class="chips" style="left:16px;right:16px;top:112px"><span class="chip sel">${I.list.replace('<svg', '<svg style="stroke:var(--a-pink-text)"')}Favourites<span style="color:var(--a-text-3);font-weight:500;margin-left:2px">10</span></span><span class="chip">All channels</span><span class="chip">Sports</span><span class="chip">Icelandic</span><span class="chip">Movies</span></div>
<div class="lv-now" style="top:162px"><div class="th"><img src="${ART}heat-bg.jpg" alt="" style="object-position:50% 25%"></div>
  <div class="col"><div class="ey">Last watched</div>
  <div class="t">Heat<span class="badge">4K</span></div>
  <div class="m">112 · Sky Cinema Action HD · 21:00 to 23:50 · in 19 min</div>
  <div class="bar4" style="--p:0%"><i></i></div>
  <div class="act"><span class="pill">${I.play}Tune</span><span class="ghost sm">${I.hist}Earlier</span></div></div></div>
<div class="lv-ruler" style="top:322px"><span><span class="now">Now</span><b style="margin-left:8px">20:41</b> · Wed 28 Oct</span><span>Tap plays · swipe to favourite</span></div>
<div class="lv-list" style="top:350px">
${ch({ no: 1, ab: 'RÚV', name: 'RÚV', tile: '#1C2C60', pg: 'Kastljós', from: '20:35', until: '20:55', p: 30, next: 'Fréttir 20:55', fav: true })}
${ch({ no: 2, ab: 'ST2', name: 'Stöð 2', tile: '#7A1A2A', pg: 'Ísland í dag', from: '20:30', until: '21:00', p: 37, next: 'Grey’s Anatomy 21:00', fav: true })}
${ch({ no: 301, ab: 'ESPN', name: 'ESPN', tile: '#B01E23', pg: 'SportsCenter', from: '20:00', until: '21:00', p: 68, next: 'NBA Countdown 01:00 · Grizzlies at Blazers 02:00', fav: true })}
${ch({ no: 113, ab: 'SS', name: 'Sky Sports Main Event HD', tile: '#2A2A4A', pg: 'Super Sunday: Liverpool v Arsenal', from: '19:15', until: '22:30', p: 45, next: 'Match of the Day 22:30', live: true, fav: true })}
${ch({ no: 12, ab: 'SÝN', name: 'Sýn Sport', tile: '#0F3D5C', pg: 'Sportpakkinn', from: '20:30', until: '21:30', p: 18, next: 'NBA: Celtics at Knicks 23:00', fav: true })}
${ch({ no: 33, ab: 'NBA', name: 'NBA TV', tile: '#1D428A', pg: 'NBA GameTime', from: '20:00', until: '23:00', p: 23, next: 'Celtics at Knicks 23:00', fav: true })}
${ch({ no: 204, ab: 'CNN', name: 'CNN International', tile: '#333', nog: true, fav: true })}
</div>
${tabs('live')}
` });

// ---- 04 NBA hub ----
const gcard = ({ st, mine = false, tvn, a, h, plate, live = false }) => `<div class="gcard"><div class="st ${mine ? 'mine' : ''}">${live ? '<span class="live sm">Live</span>' : ''}<span>${st}</span><span class="tvn">${tvn}</span></div>
  <div class="teams"><div class="tr ${a.mine ? 'mine' : ''}"><span class="tedge" style="--te:${a.c}"></span><span class="cr"><img src="${IMG}logo-${a.ab}.png" alt=""></span><span class="nm">${a.n}</span><span class="rc">${a.r}</span></div>
  <div class="tr ${h.mine ? 'mine' : ''}"><span class="tedge" style="--te:${h.c}"></span><span class="cr"><img src="${IMG}logo-${h.ab}.png" alt=""></span><span class="nm">${h.n}</span><span class="rc">${h.r}</span></div></div>
  <span class="plate">${plate}</span></div>`;
const nba04 = page({ title: 'NBA: the hub', body: `
${status('20:41')}
${topbar({ title: 'NBA', mark: false, clock: 'ESPN · 20:41' })}
<div class="nb-sec" style="top:112px"><span class="chip sel">Games</span><span class="chip"><span class="cr"><img src="${IMG}logo-MEM.png" alt=""></span>Grizzlies</span><span class="chip">Standings</span><span class="chip">Leaders</span><span class="chip">Team stats</span><span class="chip">News</span></div>
<div class="nb-hero" style="top:162px">
  <div class="ey">Your team<span>NBA · Tip-off</span></div>
  <div class="mt"><div class="tr mine"><span class="tedge" style="--te:#5D76A9"></span><span class="crest"><img src="${IMG}logo-MEM.png" alt=""></span><div><div class="nm">Grizzlies</div><div class="rc">3-0 · 3rd in the West</div></div></div>
    <div class="at">AT</div>
    <div class="tr"><span class="tedge" style="--te:#E03A3E"></span><span class="crest"><img src="${IMG}logo-POR.png" alt=""></span><div><div class="nm">Trail Blazers</div><div class="rc">1-3</div></div></div></div>
  <div class="slab"><div><b>02:00</b><span>Tip-off</span></div></div>
  <div class="act"><span class="pill">${I.play}Watch pre-game</span><span class="ghost">${I.bell}Remind me</span></div>
  <div class="cap">Tips off in 5 h 19 min · ESPN · 4K · NBA League Pass 4</div>
</div>
<div class="nb-days" style="top:424px"><span class="chip">${I.back.replace('<svg', '<svg style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2"')}Tue</span><span class="chip sel">Today · 28 Oct</span><span class="chip">Thu${I.chev}</span><span class="cap">6 games</span></div>
<div class="nb-grid" style="top:476px">
${gcard({ st: 'Your team · tonight', mine: true, tvn: 'ESPN · 4K', a: { ab: 'MEM', n: 'Grizzlies', r: '3-0', c: '#5D76A9', mine: true }, h: { ab: 'POR', n: 'Trail Blazers', r: '1-3', c: '#E03A3E' }, plate: '<span class="tip">02:00</span>' })}
${gcard({ st: 'Tonight', tvn: 'NBA League Pass', a: { ab: 'BOS', n: 'Celtics', r: '2-2', c: '#007A33' }, h: { ab: 'NY', n: 'Knicks', r: '3-1', c: '#F58426' }, plate: '<span class="tip">23:00</span>' })}
${gcard({ st: 'Tonight', tvn: 'NBA League Pass', a: { ab: 'DAL', n: 'Mavericks', r: '1-3', c: '#00538C' }, h: { ab: 'HOU', n: 'Rockets', r: '2-1', c: '#CE1141' }, plate: '<span class="tip">23:00</span>' })}
${gcard({ st: 'Late', tvn: 'Prime Video', a: { ab: 'DEN', n: 'Nuggets', r: '2-2', c: '#FEC524' }, h: { ab: 'OKC', n: 'Thunder', r: '4-0', c: '#007AC1' }, plate: '<span class="tip">01:30</span>' })}
${gcard({ st: 'Late', tvn: 'NBA League Pass', a: { ab: 'LAL', n: 'Lakers', r: '3-1', c: '#FDB927' }, h: { ab: 'SAC', n: 'Kings', r: '1-3', c: '#5A2D81' }, plate: '<span class="tip">03:30</span>' })}
</div>
${tabs('nba')}
` });

// ---- 05 the title page ----
const ep = ({ n, t, d, l, p, seen = false, cur = false, pos }) => `<div class="ep ${cur ? 'cur' : ''}"><div class="th"><img src="${ART}severance-bg.jpg" alt="" style="--pos:${pos}"><span class="n">${n}</span>${seen ? `<span class="seen">${I.tick}</span>` : ''}${p ? `<span class="pb"><i style="--p:${p}%"></i></span>` : ''}</div>
  <div class="col"><div class="t">${t}</div><div class="m">${d}</div><div class="l">${l}</div></div></div>`;
const detail05 = page({ title: 'A series: Severance', body: `
<div class="dt-pic" style="--pos:66% 20%"><img src="${ART}severance-bg.jpg" alt=""><div class="cap"></div><div class="st"></div><div class="sb"></div></div>
<div class="grain"></div>
${status('20:42')}
<span class="dt-back">${I.back}</span><span class="dt-more">${I.more}</span>
<div class="dt-head" style="top:232px">
  <div class="ey"><span>Series</span><span style="color:var(--a-text-3)">Drama · Sci-fi · Thriller</span></div>
  <img class="logo" src="${ART}severance-logo.png" alt="Severance">
  <div class="meta">${I.starf}<b style="color:var(--a-text-1)">8.7</b>${dot}<span>2022–</span>${dot}<span>2 seasons</span>${dot}<span class="badge">TV-MA</span><span class="badge">4K</span><span class="badge">EN</span></div>
  <div class="plot">Mark leads a team whose memories have been surgically divided between their work and personal lives. A mysterious colleague appears outside of work.</div>
  <div class="act"><span class="pill">${I.play}Resume S2 · E3</span><span class="ghost">${I.bookmark}Saved</span><span class="ghost" style="padding:0 12px">${I.cc}</span></div>
  <div class="what"><span class="tick">${I.tick}</span><span>4K HDR, 5.1 · best of 3 copies · Icelandic subs · Northlight</span></div>
</div>
<div class="dt-seasons" style="top:488px"><span class="chip">Season 1</span><span class="chip sel">Season 2</span><span class="cap">10 episodes · 3 left</span></div>
<div class="dt-eps" style="top:538px">
${ep({ n: 1, t: 'Hello, Ms. Cobel', d: '58 min · Watched', l: 'Mark returns to Lumon and finds a changed team.', seen: true, pos: '20% 30%' })}
${ep({ n: 2, t: 'Goodbye, Mrs. Selvig', d: '46 min · Watched', l: 'Outside, Mark asks his sister for help.', seen: true, pos: '80% 40%' })}
${ep({ n: 3, t: 'Who Is Alive?', d: '21 min left', l: 'Mark, Helly, Irving and Dylan search for answers.', p: 57, cur: true, pos: '50% 30%' })}
${ep({ n: 4, t: 'Woe’s Hollow', d: '49 min', l: 'The team takes a trip to a strange place.', pos: '35% 60%' })}
</div>
${tabs('lib')}
` });

// ---- 06 the player, portrait: the game from tip-off, shield on ----
const zap = ({ no, ab, name, tile, pg, cur = false, live = false }) => `<div class="lv-ch ${cur ? 'cur' : ''}"><span class="no">${no}</span><span class="tile" style="--tile:${tile}">${ab}</span><div class="col"><div class="nm">${name}</div><div class="pg"><span class="tx">${pg}</span>${live ? '<span class="live sm">Live</span>' : ''}</div></div><div class="r"><span class="chev">${I.chev.replace('class="ic"', '')}</span></div></div>`;
const player06 = page({ title: 'The player, portrait: the game', body: `
${status('03:14')}
<div class="pv-video" style="top:59px;height:221px"><div class="pv-court"><img class="a" src="${ART}mem.png" alt=""><img class="h" src="${ART}por.png" alt=""><div class="floor"></div><span class="bug" style="left:58px">ESPN</span></div><div class="pv-st" style="height:80px"></div>
  <span class="pv-close">${I.chdown}</span>
  <div class="pv-tr abs pv-shadow" style="right:12px;top:10px"><b>${I.eyeoff}Score hidden</b><span>You’re in Q2</span></div>
  <span class="pv-saver abs" style="right:12px;bottom:10px">${I.data}Mobile data · 720p</span></div>
<div class="pv-title" style="top:292px"><h1>Grizzlies at Trail Blazers</h1><div class="sub"><span>NBA League Pass 4 · Thu 29 Oct · late</span><span class="badge">4K</span></div><div class="what"><span class="tick">${I.tick}</span><span>From tip-off · 1:32 behind live · the archive copy</span></div></div>
<div class="pv-track" style="top:362px"><div class="t"></div><div class="ahead" style="left:66%;right:0"></div><div class="p" style="--p:26%"></div><span class="tick" style="left:2%"></span><span class="tick" style="left:22%"></span><span class="tick" style="left:44%"></span><span class="tick" style="left:66%"></span><span class="ld" style="left:66%"></span><span class="th" style="--p:26%"></span></div>
<div class="pv-ends" style="top:388px"><span class="l">Tip-off</span><span class="ch on" style="left:22%">Q2</span><span class="ch" style="left:44%">Half</span><span class="ch" style="left:66%; margin-left:-14px">Q3</span><span class="live sm" style="left:66%;margin-left:16px">Live</span><span class="r" title="End hidden">${I.eyeoff}</span></div>
<div class="pv-btns" style="top:420px"><span class="pv-k sm">${I.back10}<small>1m</small></span><span class="pv-k sm" style="margin-left:-4px">${I.chup}</span><span class="pv-k big">${I.pause}</span><span class="pv-k sm">${I.chdown}</span><span class="pv-k sm">${I.fwd10}<small>1m</small></span></div>
<div class="pv-row" style="top:492px"><span class="pv-act pri">${I.chev.replace('class="ic"', '')}Skip to Q3</span><span class="pv-act tolive"><span class="live sm" style="margin:0 -2px 0 -4px">Live</span>Back to live</span><span class="pv-act">${I.game}Game</span></div>
<div class="pv-row" style="top:546px;justify-content:space-between"><span class="pv-k sm">${I.cc}<span class="lbl">Subtitles</span></span><span class="pv-k sm">${I.speaker}<span class="lbl">Audio</span></span><span class="pv-k sm">${I.airplay}<span class="lbl">AirPlay</span></span><span class="pv-k sm">${I.pip}<span class="lbl">PiP</span></span><span class="pv-k sm">${I.sliders}<span class="lbl">Options</span></span></div>
<div class="pv-zap" style="top:628px"><div class="h">Channels<span>Favourites · 4 of 10</span><span class="more">All channels${I.chev.replace('class="ic"', '')}</span></div>
${zap({ no: 301, ab: 'ESPN', name: 'ESPN', tile: '#B01E23', pg: 'Grizzlies at Trail Blazers' })}
${zap({ no: 4, ab: 'NBA', name: 'NBA League Pass 4', tile: '#1D428A', pg: 'Grizzlies at Trail Blazers · from tip-off', cur: true })}
${zap({ no: 33, ab: 'NBA', name: 'NBA TV', tile: '#1D428A', pg: 'Nuggets at Thunder', live: true })}
${zap({ no: 113, ab: 'SS', name: 'Sky Sports Main Event HD', tile: '#2A2A4A', pg: 'Match of the Day' })}
</div>
<div class="ph-home" style="background:var(--a-text-1)"></div>
` });

// ---- 07 the player, landscape: an episode ----
const player07 = page({ title: 'The player, landscape: an episode', land: true, body: `
<div class="pv-video" style="top:0;bottom:0;height:393px"><img src="${ART}severance-bg.jpg" alt="" style="--pos:50% 30%"><div class="pv-st" style="height:150px"></div><div class="pv-sb" style="height:200px"></div></div>
<div class="grain"></div>
${status('20:49')}
<span class="pv-close" style="left:58px;top:40px">${I.close}</span>
<div class="pv-title pv-shadow" style="left:110px;top:36px;right:360px"><img class="logo" src="${ART}severance-logo.png" alt="Severance"><div class="sub"><span>S2 · E3 · Who Is Alive?</span><span class="badge">4K</span></div><div class="what"><span class="tick">${I.tick}</span><span>4K HDR, 5.1 · best of 3 copies · Icelandic subtitles</span></div></div>
<div class="pv-tr abs pv-shadow" style="right:64px;top:40px"><b>Ends 21:02</b><span>21 min left</span></div>
<div class="pv-btns" style="left:64px;right:64px;top:262px;justify-content:flex-start;gap:14px"><span class="pv-k sm">${I.back10}<small>10</small></span><span class="pv-k big" style="width:52px;height:52px">${I.pause}</span><span class="pv-k sm">${I.fwd10}<small>10</small></span><span class="pv-act" style="margin-left:6px">Next episode${I.chev.replace('class="ic"', '')}</span><span style="flex:1"></span><span class="pv-k sm">${I.cc}</span><span class="pv-k sm">${I.speaker}</span><span class="pv-k sm">${I.airplay}</span><span class="pv-k sm">${I.pip}</span><span class="pv-k sm">${I.sliders}</span></div>
<div class="pv-track" style="left:64px;right:64px;top:326px"><div class="t"></div><div class="p" style="--p:57%"></div><span class="th" style="--p:57%"></span></div>
<div class="pv-ends" style="left:64px;right:64px;top:352px"><span class="l">34:10</span><span class="r"><span class="pv-hint" style="margin-right:10px">${I.chup.replace('<svg', '<svg style="transform:rotate(-90deg)"')}${I.chev.replace('class="ic"', '')} swipe 10 s · double-tap the edges</span>−25:50</span></div>
<div class="ph-home" style="background:var(--a-text-1);opacity:.5"></div>
` });

// ---- 08 Account ----
const acrow = ({ ico, g = false, t, s, v, ok = false, chev = true, tog = null }) => `<div class="ac-row"><span class="ico ${g ? 'g' : ''}">${ico}</span><div class="col"><div class="t">${t}</div>${s ? `<div class="s">${s}</div>` : ''}</div>${v ? `<span class="v ${ok ? 'ok' : ''}">${ok ? I.tick : ''}${v}</span>` : ''}${tog !== null ? `<span class="tog ${tog ? '' : 'off'}"></span>` : chev ? `<span class="chev">${I.chev.replace('class="ic"', '')}</span>` : ''}</div>`;
const account08 = page({ title: 'Account', body: `
${status('20:43')}
${topbar({ title: 'Account', mark: false })}
<div class="ac-list" style="top:114px">
<div class="ac-group"><div class="h">Provider</div><div class="box">
${acrow({ ico: I.tv, g: true, t: 'line.provider.tv', s: 'Expires 19 Nov · 24 days left · 1,214 channels', v: 'Active', ok: true, chev: false })}
${acrow({ ico: I.qr, t: 'Sign in with your TV', s: 'Pull the login from the TV on this Wi-Fi' })}
</div></div>
<div class="ac-group"><div class="h">Playback</div><div class="box">
${acrow({ ico: I.data, t: 'Data saver on mobile data', s: 'Best on Wi-Fi · 720p on mobile data', tog: true })}
${acrow({ ico: I.cc, t: 'Subtitles', v: 'Icelandic, then English' })}
${acrow({ ico: I.pip, t: 'Keep playing when you leave', s: 'Picture in picture', tog: true })}
</div></div>
<div class="ac-group"><div class="h">NBA</div><div class="box">
${acrow({ ico: `<img src="${IMG}logo-MEM.png" alt="" style="width:20px;height:20px;object-fit:contain">`, t: 'Your team', v: 'Grizzlies' })}
${acrow({ ico: I.shield, t: 'Spoiler shield', s: 'Scores hidden until you have seen the game', v: 'My team' })}
</div></div>
<div class="ac-group"><div class="h">Films and series</div><div class="box">
${acrow({ ico: I.puzzle, t: 'Add-ons', s: 'Cinemeta, Northlight · from your Stremio account', v: '2' })}
${acrow({ ico: I.key, t: 'TMDB key', s: '11 of 15 Home rows from TMDB', v: 'Working', ok: true })}
${acrow({ ico: I.rows, t: 'Home rows', v: '15 on' })}
</div></div>
<div class="ac-group"><div class="h">App</div><div class="box">
${acrow({ ico: I.dl, t: 'Updates <span class="ac-dot"></span>', s: '0.4.212 · 0.4.219 is on the TV', v: 'Update' })}
${acrow({ ico: I.info, t: 'About', chev: true })}
${acrow({ ico: I.out, t: 'Sign out', chev: true })}
</div></div>
</div>
${tabs('home')}
` });

// ---- 09 Sign in ----
const signin09 = page({ title: 'Sign in', body: `
${status('20:40')}
<div class="si-lockup" style="top:104px"><img src="${BRAND}assets/lockup.svg" alt="airglow"><p>Your channels, your team, your films.<br>Ad-free, from your own provider.</p></div>
<div class="si-card" style="top:216px"><h2><span class="ico">${I.tv}</span>Sign in with your TV</h2><p>On the TV: Account › Provider › <b style="color:var(--a-text-1)">Send to your phone</b>. It shows a code and a QR. Same Wi-Fi.</p>
  <div class="si-code"><span>A</span><span>7</span><span>K</span><span class="cur empty">·</span><span class="empty">·</span><span class="empty">·</span></div>
  <span class="pill">${I.qr.replace('<svg', '<svg style="fill:none;stroke:currentColor;stroke-width:2.2;width:18px;height:18px"')}Scan the TV’s code</span>
  <p style="margin-top:10px;font:var(--ph-cap);color:var(--a-text-3)">Brings the provider login, your team, the shield, add-ons and the TMDB key. The TV keeps working.</p></div>
<div class="si-or" style="top:492px">or sign in by hand</div>
<div class="si-card" style="top:516px;padding-top:12px"><div class="chips"><span class="chip sel">Xtream Codes</span><span class="chip">M3U link</span></div>
  <div class="si-field" style="margin-top:12px"><b>line.provider.tv</b></div><div class="si-field">Username</div><div class="si-field">Password</div>
  <span class="ghost" style="margin-top:12px">Sign in</span></div>
<div class="si-note" style="left:24px;right:24px;top:810px;font-size:12px;line-height:15px">Nothing leaves your phone but the provider login, sent to your provider.</div>
` });

const out = { '01-home-evening.html': home01, '02-home-gamenight.html': home02, '03-live.html': live03, '04-nba-hub.html': nba04, '05-title-series.html': detail05, '06-player-portrait.html': player06, '07-player-landscape.html': player07, '08-account.html': account08, '09-signin.html': signin09 };
for (const [f, html] of Object.entries(out)) { fs.writeFileSync(path.join(root, f), html); console.log('wrote', f); }
