// Builds the accounts mocks: node tools/build.js -> ../*.html. Then node tools/render.js for the PNGs and the contact sheet.
// Three canvases from one timeline (home-final's: Wed 28 Oct 2026, Reykjavik, the owner "Birgir", his Philips TV in the
// living room, his iPhone, his laptop): the TV (960 x 540 at 2x, on app/tv/ui.css + app.css + ../addons/addons.css), the
// iPhone (393 x 852 at 3x, on ../phone-v1/phone.css) and the Windows app (1920 x 1080 at 1x, on ../desktop-v1/desktop.css).
// The QR is a real one from app/tv/js/qr.js (the TV's own encoder).
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const root = path.resolve(__dirname, '..');
const APP = '../../../app/tv/', BRAND = APP + 'brand/', ART = '../home-final/art/';
const qr = (() => { const src = fs.readFileSync(path.join(root, '../../../app/tv/js/qr.js'), 'utf8').replace(/^export /gm, ''); const ctx = { TextEncoder }; vm.runInNewContext(src + '\nthis.qrSvg = qrSvg;', ctx); return ctx.qrSvg; })();

// ---------- the account's facts in every mock ----------
const HOST = 'acct.airglow.workers.dev';          // the Worker's address (the owner picks the workers.dev subdomain; a custom domain is one route later)
const CODE = 'WDJBMH', CODE_SHOWN = 'WDJ-BMH';     // 6 letters from RFC 8628's base-20 set (no vowels, no 0/O/1/I)
const EMAIL = 'birgir@example.is';
const RECOVERY = ['7G4K', 'Q2MX', 'BZ8R', 'HN3W', '5PKD'];   // 20 Crockford base-32 characters, 100 bits

// ---------- icons (one stroke set, 24 px boxes) ----------
const P = {
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  pc: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
  key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1.2-3.8 3.7-5.6 6.5-5.6s5.3 1.8 6.5 5.6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.6c1.6.6 2.6 2.1 3 4.9"/>',
  tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>', chevL: '<path d="M15 5l-7 7 7 7"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.5-4.5M4 13a8 8 0 0 0 14.5 4.5M20 4v4h-4M4 20v-4h4"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 7.8-8 9-4.6-1.2-8-4.5-8-9V6z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  out: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  puzzle: '<path d="M10 4a2 2 0 1 1 4 0v2h4v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 1-4 0H6v-4a2 2 0 1 0 0-4V6h4z"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  hist: '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 8v4l3 2"/>',
  rows: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8M4 12h16"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  merge: '<path d="M7 4v6a4 4 0 0 0 4 4h2a4 4 0 0 1 4 4v2M7 4L4 7M7 4l3 3M17 20l-3-3M17 20l3-3M17 4v4"/>',
  replace: '<path d="M4 7h11l-3-3M20 17H9l3 3"/><path d="M15 7l-3 3M9 17l3-3" opacity=".5"/>',
  eye: '<path d="M2.5 12c1-2.8 4.5-7 9.5-7s8.5 4.2 9.5 7c-1 2.8-4.5 7-9.5 7S3.5 14.8 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9"/>',
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M3.5 9.5c4 1 7 4 8.5 8.5M20.5 9.5c-4 1-7 4-8.5 8.5M12 3v18M3 12h18"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  series: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M7 3l5 4 5-4"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10.5 10.2a2 2 0 1 0 0 3.6M17 10.2a2 2 0 1 0 0 3.6"/>',
  win: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 12h18M12 4v16"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5M4 13a8 8 0 0 0 14.5 4.5M20 4v4h-4M4 20v-4h4"/>',
  bang: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>', min: '<path d="M4 12h16"/>', max: '<rect x="5" y="5" width="14" height="14" rx="1"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  share: '<path d="M12 3v13M7.5 7.5L12 3l4.5 4.5M5 12v8h14v-8"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v2M17 20h4M14 20v1"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>', book: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
  tabs: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h8"/>', aa: '<path d="M4 18l5-12 5 12M6 14h6M15 18l3-7 3 7"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
const tick = () => `<span class="ag-tick">${ic('tick')}</span>`;
const spin = (lg) => `<svg class="ag-spin${lg ? ' lg' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9"/></svg>`;
const dot = '<span class="dot">·</span>';
const write = (f, html) => { fs.writeFileSync(path.join(root, f), html); console.log('wrote', f); };

// =====================================================================================================================
// TV (960 x 540)
// =====================================================================================================================
const tvHead = (title) => `<!doctype html>
<html lang="en" class="tv"><head><meta charset="utf-8"><meta name="viewport" content="width=960,height=540"><meta name="mock-size" content="960x540@2">
<title>${title}</title>
<link rel="stylesheet" href="${BRAND}fonts.css"><link rel="stylesheet" href="${BRAND}tokens.css">
<link rel="stylesheet" href="${APP}ui.css"><link rel="stylesheet" href="${APP}app.css"><link rel="stylesheet" href="../addons/addons.css"><link rel="stylesheet" href="accounts.css">
</head><body><div class="screen">\n`;
const tvFoot = `</div></body></html>\n`;
const lockup = (h) => `<img src="${BRAND}assets/lockup.svg" height="${h}" alt="airglow">`;
const tvTopbar = () => `<div class="topbar"><img src="${BRAND}assets/mark-small.svg" class="mk" alt=""><div class="tabs"><span class="tab srch">${ic('search')}Search</span><span class="tab">Home</span><span class="tab">Live</span><span class="tab">NBA</span><span class="tab">Movies</span><span class="tab">Series</span><span class="tab">Saved</span></div><div class="tb-r"><span class="avatar">B</span></div></div>`;
const TV_GROUPS = ['airglow account', 'Provider', 'Add-ons', 'Playback', 'Sound', 'NBA', 'Languages', 'Home rows', 'Updates', 'About'];
const tvGroups = (sel) => `<div class="abs" style="left:48px;top:90px;width:200px">${TV_GROUPS.map((g) => `<div class="gl${g === sel ? ' sel' : ''}">${g}</div>`).join('')}</div>`;
const arow = (t, v, sub = '', cls = '') => `<div class="arow${cls ? ' ' + cls : ''}"><span class="grow" style="min-width:0">${t}${sub ? `<div class="t-cap" style="margin-top:0">${sub}</div>` : ''}</span><span class="av">${v}</span></div>`;
const more = (v) => `${v} ${ic('chevR', 'sm')}`;

// ---- 01 TV: sign in with your phone (the code + the QR) ----
const tv01 = tvHead('TV: sign in on your phone') + `
<div class="abs" style="left:48px;top:27px">${lockup(40)}</div>
<div class="abs t-head" style="left:48px;top:96px">Sign in on your phone</div>
<div class="abs" style="left:48px;top:150px;width:500px"><ol class="ad-steps"><li>Scan the code with your phone's camera, or open <b>${HOST}/tv</b> and type the letters below.</li><li>Sign in to your airglow account there. No account yet? Make one at <b>${HOST}/signup</b> with your invite.</li><li>Tap <b>Sign in the TV</b>. This screen moves on by itself.</li></ol>
  <div class="ag-code"><span>W</span><span>D</span><span>J</span><i></i><span>B</span><span>M</span><span>H</span></div></div>
<div class="abs" style="left:640px;top:96px;width:272px;text-align:center"><div class="qrbox">${qr(`https://${HOST}/tv/${CODE}#k=3f9a`, 200)}</div><div class="ag-qrcap"><b>${HOST}/tv/${CODE}</b>The code works for 10 minutes</div></div>
<div class="card ag-wait">${spin(true)}<div class="grow"><b>Waiting for your phone</b><div class="t-cap">Your provider login, Stremio add-ons, TMDB key, Saved and history come to this TV by themselves, locked for it. Nothing else to sign in to.</div></div><span class="btn2 sm f-ring">Type email and password</span></div>
<div class="ag-hint"><span><span class="kbd">Back</span>returns to the choices</span></div>
` + tvFoot;

// ---- 02 TV: this TV already has things (merge or replace), asked once ----
const tv02 = tvHead('TV: this TV already has things') + `
<div class="abs" style="left:48px;top:27px">${lockup(40)}</div>
<div class="abs t-head" style="left:48px;top:96px">Signed in as Birgir</div>
<div class="ag-ghostrows" style="top:150px;width:520px"><div class="card" style="padding:12px 20px"><div class="vrow"><span class="okdot">${ic('tick')}</span><span class="grow">Account</span><span class="t-cap">${EMAIL}</span></div><div class="vrow"><span class="okdot">${ic('tick')}</span><span class="grow">Your account, unlocked on this TV</span><span class="t-cap">2 providers · Stremio · TMDB · 7 add-ons · 31 saved · 1,860 plays</span></div><div class="vrow">${spin(true)}<span class="grow">Putting them together</span><span class="t-cap">waiting for your choice</span></div></div></div>
<div class="ag-blur"></div>
<div class="menu ag-merge"><h3>This TV already has things</h3><div class="t-body">It was used without an account. Keep both, or make this TV match your account.</div>
  <div class="ag-two"><div><div class="h">${ic('tv')}On this TV</div><div class="l"><b>line.provider.tv</b><small>the same provider</small></div><div class="l">23 saved channels <small>· 14 not in your account</small></div><div class="l">412 plays <small>· Continue watching: Severance</small></div><div class="l">5 add-ons <small>· from your Stremio account</small></div></div>
  <div><div class="h">${ic('user')}In your account</div><div class="l"><b>line.provider.tv</b> + <b>backup.m3u</b></div><div class="l">31 saved channels</div><div class="l">1,860 plays <small>· since 24 Oct</small></div><div class="l">7 add-ons <small>· the same 5 and 2 more</small></div></div></div>
  <div class="ad-lr f-ring"><span class="ico">${ic('merge')}</span><span class="grow"><span class="a">Merge them<span class="ag-rec">Recommended</span></span><span class="b">Keeps everything. The same channel or title saved on both becomes one.</span></span>${ic('chevR', 'sm')}</div>
  <div class="ad-lr"><span class="ico">${ic('replace')}</span><span class="grow"><span class="a">Use only what's in my account</span><span class="b">This TV's own 14 saved channels and 412 plays are removed. The provider stays: it's the same one.</span></span>${ic('chevR', 'sm')}</div>
  <div class="foot">Asked once, on this TV only. Neither choice can be undone here, so your account keeps a copy of today's state for 30 days.</div></div>
` + tvFoot;

// ---- 03 TV: Account > airglow account ----
const tv03 = tvHead('TV: Account › airglow account') + tvTopbar() + tvGroups('airglow account') + `
<div class="ag-pane"><div class="t-title" style="margin-bottom:10px">airglow account</div>
  ${arow('Birgir', `<span class="pill-ok">${ic('tick', 'sm')}Signed in</span>`, EMAIL, 'f-ring')}
  ${arow('Synced 2 min ago', more('Sync now'), 'Provider logins, Stremio add-ons, TMDB key, Saved, history, Home rows, your settings')}
  ${arow('Devices', more('3'), '<span class="ag-dev">' + ic('tv') + 'Living room TV <span class="t-3">· this TV</span></span>')}
  ${arow('What syncs', more('See'), 'Not this TV\'s picture, sound or player settings: those stay here')}
  ${arow('Sign out of this TV', ic('chevR', 'sm'), 'Your provider, add-ons and history leave this TV. Your account keeps them')}
  ${arow('Sign out everywhere', ic('chevR', 'sm'), 'Every device asks for your password or your phone again')}
</div>
` + tvFoot;

// =====================================================================================================================
// iPhone (393 x 852)
// =====================================================================================================================
const status = (time) => `<div class="ph-status"><span class="tm">${time}</span><span class="rt">
  <svg viewBox="0 0 20 13"><rect x="0" y="9" width="3" height="4" rx=".8"/><rect x="5" y="6.5" width="3" height="6.5" rx=".8"/><rect x="10" y="3.5" width="3" height="9.5" rx=".8"/><rect x="15" y="0" width="3" height="13" rx=".8"/></svg>
  <svg viewBox="0 0 18 13"><path d="M9 11.2a1.7 1.7 0 1 0 0 .1zM5.8 8.1a4.6 4.6 0 0 1 6.4 0l1.2-1.3a6.4 6.4 0 0 0-8.8 0zM2.6 4.9a9.2 9.2 0 0 1 12.8 0L16.6 3.6a11 11 0 0 0-15.2 0z"/></svg>
  <svg viewBox="0 0 28 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2"/><path d="M25.5 4.5v4a2 2 0 0 0 0-4z" opacity=".4"/></svg></span></div>
<div class="ph-island"></div><div class="ph-home"></div>`;
const tabIcons = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  live: '<svg viewBox="0 0 24 24"><path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v9a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 15.5zM7 21h10v-1.5H7z"/><path d="M10 8l5 3.5-5 3.5z" fill="#15131D"/></svg>',
  nba: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 1.8c1.1 0 2.1.2 3 .6-1.2 1.6-2 3.6-2.2 5.8-2.2-.2-4.2-1-5.8-2.2a8.2 8.2 0 0 1 5-4.2zm-6.2 5.7c1.9 1.4 4.2 2.3 6.9 2.5v.2c0 2.7-.9 5-2.5 6.9A8.2 8.2 0 0 1 3.8 12c0-.9.1-1.7.4-2.5zm10.5-4a8.2 8.2 0 0 1 3.9 6.5c0 .9-.1 1.7-.4 2.5-1.9-1.4-4.2-2.3-6.9-2.5v-.2c0-2.3.6-4.5 1.8-6.3zm-1.1 8.3c2.2.2 4.2 1 5.8 2.2a8.2 8.2 0 0 1-5 4.2c-1.1 0-2.1-.2-3-.6 1.2-1.6 2-3.6 2.2-5.8z"/></svg>',
  lib: '<svg viewBox="0 0 24 24"><path d="M3 5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM10 5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1zM16.3 6.1a1 1 0 0 1 .7-1.2l2.9-.8a1 1 0 0 1 1.2.7l3.6 13.5a1 1 0 0 1-.7 1.2l-2.9.8a1 1 0 0 1-1.2-.7z"/></svg>',
};
const tabs = (sel) => `<div class="ph-tabfade"></div><div class="ph-tabs"><div class="bar">
  <span class="t ${sel === 'home' ? 'sel' : ''}">${tabIcons.home}<span>Home</span></span><span class="t ${sel === 'live' ? 'sel' : ''}">${tabIcons.live}<span>Live</span></span><span class="t ${sel === 'nba' ? 'sel' : ''}">${tabIcons.nba}<span>NBA</span></span><span class="t ${sel === 'lib' ? 'sel' : ''}">${tabIcons.lib}<span>Library</span></span>
</div><span class="srch">${ic('search')}</span></div>`;
const phTop = ({ title = '', back = false, avatar = true } = {}) => `<div class="ph-top">${back ? `<span class="ib" style="color:var(--a-pink-text);margin-left:-10px">${ic('back')}</span>` : `<img class="mk" src="${BRAND}assets/mark-small.svg" alt="">`}${title ? `<h1>${title}</h1>` : ''}<span class="sp"></span>${avatar ? `<span class="avatar">B</span>` : ''}</div>`;
const phPage = ({ title, body, extraCss = '' }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=393,height=852"><meta name="mock-size" content="393x852@3">
<title>${title}</title>
<link rel="stylesheet" href="${BRAND}fonts.css"><link rel="stylesheet" href="${BRAND}tokens.css"><link rel="stylesheet" href="../phone-v1/phone.css"><link rel="stylesheet" href="accounts.css">
${extraCss ? `<style>${extraCss}</style>` : ''}
</head><body><div class="phone">
${body}
</div></body></html>
`;
const posters = (names) => names.map((n) => `<div class="poster"><img src="${ART}${n}-poster.jpg" alt=""></div>`).join('');
// the phone's Home (phone-v1 01), as the page under a sheet
const phHomeUnder = `
<div class="hm-pic" style="--pos:78% 0%"><img src="${ART}severance-bg.jpg" alt=""><div class="hm-cap" style="--capa:.42"></div><div class="hm-amb" style="--amb:#3B5247"></div><div class="hm-st"></div><div class="hm-sb"></div></div>
<div class="grain"></div>
${status('20:44')}
${phTop({})}
<div class="hm-card" style="top:286px;--ambt:rgba(59,82,71,.5)"><div class="ey">Continue watching</div><img class="logo" src="${ART}severance-logo.png" alt="Severance"><div class="meta"><span>S2 · E3</span>${dot}<span>Who Is Alive?</span>${dot}<span>21 min left</span><span class="badge">4K</span></div><div class="bar4" style="--p:57%"><i></i></div></div>
<div class="hm-lines" style="top:430px"><div class="e"><b>Slow Horses</b><small>S6 · E4<span class="count">3 new</span></small>${ic('chevR')}</div><div class="e"><b>Heat</b><small>A film for tonight${dot}ends 23:31</small>${ic('chevR')}</div></div>
<div class="row" style="top:540px"><div class="rt">Comedy for you</div><div class="cards">${posters(['palmsprings', 'niceguys', 'gemstones', 'hotfuzz'])}</div></div>
${tabs('home')}`;

// ---- 04 phone: approving a TV (opened from the QR; the sheet over Home) ----
const ph04 = phPage({ title: 'iPhone: sign in this TV?', body: phHomeUnder + `
<div class="ag-scrim"></div>
<div class="ag-sheet"><div class="hdl"></div>
  <div class="ico">${ic('tv')}</div>
  <h2>Sign in this TV?</h2>
  <div class="sub">Philips TV · <b>${CODE_SHOWN}</b> · asked 20 s ago</div>
  <div class="chk"><span class="ag-q">${ic('info')}</span><span>Is this the code on your TV? Only sign in a TV you're looking at. If someone sent you this link, tap Not now.</span></div>
  <div class="chk" style="margin-top:8px">${tick()}<span>On the same network as this iPhone</span></div>
  <div class="lbl">It gets your</div>
  <div class="ag-gives"><span>${ic('server')}Provider login</span><span>${ic('puzzle')}Stremio add-ons</span><span>${ic('key')}TMDB key</span><span>${ic('bookmark')}Saved</span><span>${ic('hist')}History</span><span>${ic('sliders')}Settings</span></div>
  <div class="ag-cap" style="margin-top:8px">The TV signs in to nothing else: your provider, Stremio and TMDB logins come with it.</div>
  <div class="act"><span class="pill noicon">Sign in the TV</span><span class="ghost">Not now</span></div>
  <div class="note">Locked on this iPhone for that TV only. airglow's server passes it on without being able to read it.</div>
</div>` });

// ---- 04b phone: approving a TV from another network (the three-letter step) ----
const ph04b = phPage({ title: 'iPhone: sign in this TV? (another network)', body: phHomeUnder + `
<div class="ag-scrim"></div>
<div class="ag-sheet"><div class="hdl"></div>
  <div class="ico">${ic('tv')}</div>
  <h2>Sign in this TV?</h2>
  <div class="sub">Philips TV · <b>WDJ-___</b> · asked 20 s ago</div>
  <div class="chk"><span class="ag-q">${ic('info')}</span><span>Is this the code on your TV? Only sign in a TV you're looking at. If someone sent you this link, tap Not now.</span></div>
  <div class="lbl">The last three letters on your TV</div>
  <div class="si-code" style="margin-top:0;width:200px"><span>B</span><span>M</span><span class="cur empty">·</span></div>
  <div class="ag-cap" style="margin-top:8px">This iPhone isn't on the TV's network, so the letters make sure it's your TV.</div>
  <div class="act"><span class="pill noicon dim">Sign in the TV</span><span class="ghost">Not now</span></div>
  <div class="note">Then it gets your provider login, Stremio add-ons, TMDB key, Saved and history. The TV signs in to nothing else.</div>
</div>` });

// ---- 05 phone: sign in (email + password; or without an account) ----
const ph05 = phPage({ title: 'iPhone: sign in', body: `
${status('20:40')}
<div class="si-lockup" style="top:104px"><img src="${BRAND}assets/lockup.svg" alt="airglow"><p>Your channels, your team, your films.<br>On every screen you own.</p></div>
<div class="si-card" style="top:236px"><h2><span class="ico">${ic('user')}</span>Sign in</h2><p>Your provider login, Stremio add-ons, TMDB key, Saved and history come to this iPhone by themselves. No other sign-in.</p>
  <div class="si-field" style="margin-top:14px"><b>${EMAIL}</b></div>
  <div class="si-field"><b>••••••••••••••</b><span class="eye">Show</span></div>
  <span class="pill noicon">Sign in</span>
  <div class="ag-link">Forgot it? Use your recovery key</div></div>
<div class="si-or" style="top:566px">or</div>
<div class="abs" style="left:16px;right:16px;top:592px;display:flex;flex-direction:column;gap:8px"><span class="ghost">${ic('plus')}Create an account with an invite</span><span class="ghost">${ic('server')}Use airglow without an account</span></div>
<div class="si-note" style="left:24px;right:24px;top:722px">Your password never leaves this iPhone: it unlocks everything here. airglow's server keeps only locked copies it can't open. Without an account, airglow works as before: your provider login stays on this phone.</div>
` });

// ---- 06 phone: sign-up, the recovery key (shown once) ----
const ph06 = phPage({ title: 'iPhone: your recovery key', body: `
${status('20:41')}
<div class="ph-top"><span class="ib" style="color:var(--a-pink-text);margin-left:-10px">${ic('back')}</span><h1>Create an account</h1><span class="sp"></span></div>
<div class="si-steps" style="top:114px"><span>1 · Account<small>${EMAIL}</small></span><span class="cur">2 · Recovery<small>shown once</small></span><span>3 · Provider<small>or skip for now</small></span></div>
<div class="si-card" style="top:190px"><h2><span class="ico">${ic('key')}</span>Your recovery key</h2><p>If you forget your password, this key is the only way back in. airglow can't read what it keeps for you, so it can't reset it. Write it down or save it in Passwords.</p>
  <div class="ag-keyrow"><span>${RECOVERY[0]}</span><span>${RECOVERY[1]}</span><span>${RECOVERY[2]}</span></div>
  <div class="ag-keyrow" style="margin-top:8px"><span>${RECOVERY[3]}</span><span>${RECOVERY[4]}</span><span style="opacity:0;box-shadow:none"></span></div>
  <div class="ag-btns"><span class="ghost">${ic('copy')}Copy</span><span class="ghost">${ic('share')}Save to Files</span></div>
  <div class="ag-ck"><span class="bx">${ic('tick')}</span><span>I've put it somewhere safe</span></div>
  <span class="pill noicon">Continue</span></div>
<div class="si-note" style="left:24px;right:24px;top:716px">You can see it again later in Account › airglow account › Recovery key; your password unlocks it. A new key can be made there too, which retires this one.</div>
` });

// ---- 07 phone browser: the page the Worker serves (no airglow app on the phone) ----
const ph07 = phPage({ title: 'A phone browser: the Worker\'s page', body: `
${status('20:43')}
<div class="ag-safari"><div class="url">${ic('lock')}${HOST}<small>/tv</small></div></div>
<div class="ag-web" style="top:134px"><img src="${BRAND}assets/lockup.svg" alt="airglow" style="height:30px;width:auto">
  <h1 style="margin-top:18px">Sign in your TV</h1>
  <div class="lead">Philips TV · <b>${CODE_SHOWN}</b> · asked 20 s ago</div>
  <span class="pill noicon" style="margin-top:14px">Open in airglow</span>
  <div class="ag-cap" style="margin-top:8px">The app signs the TV in with one tap. No app on this phone? Sign in below.</div>
  <div class="si-or" style="position:static;margin-top:16px">or sign in here</div>
  <div class="lbl">TV code</div><div class="si-field"><b style="letter-spacing:.14em;font-weight:700">${CODE_SHOWN}</b></div>
  <div class="lbl">Email</div><div class="si-field"><b>${EMAIL}</b></div>
  <div class="lbl">Password</div><div class="si-field"><b>••••••••••••••</b><span class="eye">Show</span></div>
  <span class="ghost" style="width:100%;box-sizing:border-box;margin-top:14px">Sign in the TV</span>
  <div class="note">Your password stays in this browser: it unlocks the key your TV needs. The TV gets a locked copy only it can open.</div></div>
<div class="ag-sbar">${ic('chevL')}${ic('chevR')}${ic('share')}${ic('book')}${ic('tabs')}</div>
` });

// =====================================================================================================================
// Windows (1920 x 1080)
// =====================================================================================================================
const k = (t) => `<span class="k">${t}</span>`;
const dkHead = (title) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1920"><meta name="mock-size" content="1920x1080@1">
<title>${title}</title>
<link rel="stylesheet" href="${BRAND}fonts.css"><link rel="stylesheet" href="${BRAND}tokens.css"><link rel="stylesheet" href="../desktop-v1/desktop.css"><link rel="stylesheet" href="accounts.css">
</head><body><div class="win">\n`;
const dkFoot = `</div></body></html>\n`;
const tbar = () => `<div class="tbar"><img class="mk" src="${BRAND}assets/mark-small.svg" alt="airglow"><div class="nav"><i>${ic('chevL')}</i><i class="dim">${ic('chevR')}</i></div>
  <div class="omni">${ic('search')}<span>Search or jump to anything</span><span class="r">${k('Ctrl')}${k('K')}</span></div>
  <div class="tbr"><span class="avatar">B</span></div><div class="wco"><i>${ic('min')}</i><i>${ic('max')}</i><i>${ic('close')}</i></div></div>\n`;
const SIDE = [['home', 'Home'], ['tv', 'Live'], ['ball', 'NBA'], ['film', 'Movies'], ['series', 'Series'], ['bookmark', 'Saved']];
const side = () => `<div class="side">${SIDE.map(([i, n]) => `<div class="si">${ic(i)}<span>${n}</span></div>`).join('')}<div class="gap"></div><div class="acct" style="background:var(--a-surface-2)"><span class="avatar">B</span><div>Birgir<small>Account · synced</small></div></div></div>\n`;
const DK_GROUPS = [['user', 'airglow account'], ['server', 'Provider'], ['play', 'Playback'], ['ball', 'NBA'], ['cc', 'Languages'], ['film', 'Films and series'], ['home', 'Home rows'], ['win', 'Windows'], ['refresh', 'Updates'], ['bang', 'About']];
const dkRow = ({ icon, g, t, s, v, vcls = '', right = '', chev = false, hov = false }) => `<div class="dk-row${hov ? ' hov' : ''}"><span class="ico${g ? ' g' : ''}">${ic(icon)}</span><span class="col"><span class="t">${t}</span>${s ? `<span class="s">${s}</span>` : ''}</span>${v ? `<span class="v ${vcls}">${v}</span>` : ''}${right}${chev ? ic('chevR', 'chev') : ''}</div>`;
const dkGroup = (h, rows, foot = '', small = '') => `<div class="dk-group"><div class="h">${h}${small ? `<small>${small}</small>` : ''}</div><div class="box">${rows.join('')}</div>${foot ? `<div class="foot">${foot}</div>` : ''}</div>`;

const dk08 = dkHead('Windows: Account › airglow account, the devices') + `<div class="bd"><img src="${ART}heat-bg.jpg" alt="" style="opacity:.35"></div><div class="cap" style="--capa:.55"></div><div class="sx"></div><div class="grain"></div>\n` + tbar() + side() + `
<div class="dk-acct"><h1>Account</h1><div class="sub">Birgir · ${EMAIL} · synced just now</div>
  <div class="dk-groups">${DK_GROUPS.map(([i, n]) => `<div class="g${n === 'airglow account' ? ' sel' : ''}">${ic(i)}<span>${n}</span></div>`).join('')}</div>
  <div class="dk-pane">
    <div class="pt">airglow account<small>the same things on every screen you sign in</small></div>
    <div class="c1">
    ${dkGroup('Devices', [
      dkRow({ icon: 'tv', t: 'Living room TV', s: 'Philips 55OLED810 · Google TV · signed in Tue 28 Oct with Birgir\'s iPhone', v: 'Active now', vcls: 'ok', right: '<span class="ghost">Sign out</span>' }),
      dkRow({ icon: 'phone', t: 'Birgir\'s iPhone', s: 'iOS 26 · signed in Tue 28 Oct with the password · last seen 2 h ago', v: 'Last seen 18:41', right: '<span class="ghost">Sign out</span>' }),
      dkRow({ icon: 'pc', t: 'Laptop<span class="this">This PC</span>', s: 'Windows 11 · signed in Sat 25 Oct with the password', v: 'Active now', vcls: 'ok', hov: true, right: '<span class="ghost">Rename</span>' }),
    ], 'Signing a device out removes your account\'s things from it the next time it is online; the device keeps working without an account until then. <b style="color:var(--a-text-2)">Sign out everywhere</b> does this to all three and asks for your password or your phone on each.', '3 of 10')}
    ${dkGroup('Friends', [
      dkRow({ icon: 'users', t: 'Invite a friend', s: 'Works once, for 7 days. A friend gets their own account: nothing of yours is shared', right: `<span class="in">${ic('key')}&nbsp; AIRGLOW-KXWR-MZPQ<small>copied</small></span><span class="ghost">New code</span>`, v: '' }),
    ], '3 invites left this month. Open sign-up is off: only invited people can make an account.')}
    ${dkGroup('', [
      dkRow({ icon: 'out', t: 'Sign out of this PC', s: 'Your provider, add-ons and history leave this PC; your account keeps them', chev: true }),
      dkRow({ icon: 'trash', t: 'Delete account', s: 'Asks for your password, then removes everything on the server. Your devices keep what they have, without an account', chev: true }),
    ])}
    </div><div class="c2">
    ${dkGroup('Security', [
      dkRow({ icon: 'lock', t: 'Change password', s: 'Your other devices keep working: everything is locked with a key the password only unwraps. Signing them out as well is a choice on the next screen', chev: true }),
      dkRow({ icon: 'key', t: 'Recovery key', s: 'Shown once when the account was made. Show it again (your password unlocks it), or make a new one, which retires the old', v: 'Set · 28 Oct', chev: true }),
      dkRow({ icon: 'shield', t: 'What the server has', s: 'Your email, a locked copy of your key and locked records. Not your password, your provider passwords, your history or your TMDB key in the clear', chev: true }),
    ])}
    ${dkGroup('Sync', [
      dkRow({ icon: 'sync', t: 'Synced just now', s: '<span class="dk-sync"><span>2 provider logins</span><span>TMDB key</span><span>7 add-ons + your Stremio link</span><span>1,860 plays, Continue watching</span><span>31 saved</span><span>Home rows and your choices</span><span>spoiler shield seen list</span><span>team, shield, languages, replays, skip intro</span><span class="off">not this PC\'s player, window or tray settings</span></span>', right: '<span class="ghost">Sync now</span>' }),
      dkRow({ icon: 'hist', t: 'Undo', s: '30 days of previous versions and the merge snapshots; a bad change rolls back from any device', v: 'Undo changes since…', chev: true }),
    ])}
    </div>
  </div>
</div>
` + dkFoot;

write('01-tv-signin-code.html', tv01);
write('02-tv-merge.html', tv02);
write('03-tv-account.html', tv03);
write('04-phone-approve-tv.html', ph04);
write('04b-phone-approve-other-network.html', ph04b);
write('05-phone-signin.html', ph05);
write('06-phone-recovery-key.html', ph06);
write('07-web-tv-page.html', ph07);
write('08-win-account-devices.html', dk08);
