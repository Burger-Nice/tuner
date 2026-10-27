// node tools/build.js   -> writes the add-on mocks (*.html) next to SPEC.md, and tools/pages.json.
// Every mock is the 960 x 540 canvas linking the app's real CSS (tokens, ui.css, app.css) plus addons.css (as
// design/ui-v1/catchup/tools/build.js). Focus is marked with the kit classes: .f (ring + lift), .f-ring, .f-in, and
// .nv-row.f (the native panels' inset ring).
// Scenario (SPEC 0): the owner's TV, Tue 27 Oct 2026, 21:10 Reykjavik time (UTC). Real add-on answers from data.json
// (fetched by tools/fetch.js): Cinemeta, OpenSubtitles v3, WatchHub, Public Domain Movies, the Stremio API and link
// codes, the addon_catalog lists, the retired Archivio. Illustrative: the provider's copies, "Northlight" (a stream
// add-on set up with a debrid account, giving direct links), "Kestrel" (a slow one), "Courtside" (NBA replays) and every
// stream's size and file name. Art is the kit's procedural stand-in (design/ui-v1/kit/art.js), never a real poster.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
global.window = global; require('../../kit/art.js');
const Art = global.Art;
const D = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const unent = (s) => String(s ?? '').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');   // Cinemeta sends HTML entities in names (SPEC 11.3)

// ---------- icons (app/tv/js/util.js names where they exist; puzzle, phone, link, keys, ext and drag are new: SPEC 2.3) ----------
const P = {
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>', chevR: '<path d="M9 5l7 7-7 7"/>', chevD: '<path d="M5 9l7 7 7-7"/>', chevU: '<path d="M5 15l7-7 7 7"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9"/>', plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/>', star: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9z" fill="currentColor" stroke="none"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M3 15h18"/>', cc: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17.5 10.2a2.4 2.4 0 1 0 0 3.6"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>', refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5"/>',
  saved: '<path d="M7 3.5h10v17l-5-3.6-5 3.6z"/>', list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" stroke-width="2.4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01" stroke-width="2.4"/>', mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7a13 13 0 0 1-2.4 3.7M6.4 6.6A13 13 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  hist: '<path d="M4.2 12a7.8 7.8 0 1 0 2.3-5.5"/><path d="M4 4.5V8h3.5"/><path d="M12 8v4.2l2.8 1.7"/>', pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  sort: '<path d="M7 4v16M3.5 7.5L7 4l3.5 3.5M17 20V4M13.5 16.5L17 20l3.5-3.5"/>', sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  bang: '<path d="M12 5v8.5"/><circle cx="12" cy="18.6" r="2" stroke="none" fill="currentColor"/>',
  // new for add-ons: the add-on glyph (a puzzle piece), a phone, a link, the keyboard, "opens another app", the drag grip
  puzzle: '<path d="M9 4.5h3.2a2.2 2.2 0 1 1 4.3 0H19a1 1 0 0 1 1 1v3.3a2.2 2.2 0 1 0 0 4.4V19a1 1 0 0 1-1 1h-3.3a2.2 2.2 0 1 0-4.4 0H5a1 1 0 0 1-1-1v-5.7a2.2 2.2 0 1 0 0-4.3V5.5a1 1 0 0 1 1-1z"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>', link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  keys: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7.5 14h9" stroke-width="2.2"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  spin: '<path d="M12 3a9 9 0 1 0 9 9"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
const dot = '<span class="dot-sep"></span>';
const spin = (lg) => `<svg class="ad-spin${lg ? ' lg' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9"/></svg>`;
const ring = (fr, big) => { const r = 9, c = 2 * Math.PI * r; return `<svg class="ad-ring" viewBox="0 0 24 24" aria-hidden="true"${big ? ' style="width:36px;height:36px"' : ''}><circle cx="12" cy="12" r="${r}" fill="none" stroke="#3D3B45" stroke-width="3"/><circle cx="12" cy="12" r="${r}" fill="none" stroke="#F95BAC" stroke-width="3" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - fr)).toFixed(1)}" transform="rotate(-90 12 12)"/></svg>`; };
const bang = `<span class="ad-bang"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round">${P.bang}</svg></span>`;
const TK = `<span class="ad-tk"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>`;   // checked by airglow (subtitles SPEC: green only on what airglow checked)
const kbd = (k) => `<span class="kbd">${k}</span>`;
const toggle = (on) => `<span class="onoff">${on ? 'On' : 'Off'}</span><span class="tg${on ? ' on' : ''}"><i></i></span>`;
// the QR stand-in (design/ui-v1/kit/screens.js), seeded so each code differs
function qr(size = 176, seed = 7) {
  const n = 25, c = size / n; let s = seed, rects = '';
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const finder = (x, y) => `<rect x="${x * c}" y="${y * c}" width="${7 * c}" height="${7 * c}" fill="#14101F"/><rect x="${(x + 1) * c}" y="${(y + 1) * c}" width="${5 * c}" height="${5 * c}" fill="#F3EFE6"/><rect x="${(x + 2) * c}" y="${(y + 2) * c}" width="${3 * c}" height="${3 * c}" fill="#14101F"/>`;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    if (!inF && rnd() > 0.52) rects += `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}" fill="#14101F"/>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="12" fill="#F3EFE6"/><g transform="translate(${c * 1.5} ${c * 1.5}) scale(.88)">${rects}${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</g></svg>`;
}

// ---------- the add-ons (SPEC 0): initials stand in for manifest.logo ----------
const A = {
  nl: { ini: 'NL', name: 'Northlight', gives: 'Streams for movies and series', ver: '2.4.1' },
  cm: { ini: 'CM', name: 'Cinemeta', gives: 'Catalogs and details · Popular, New, Featured', ver: D.cinemeta.version },
  os: { ini: 'OS', name: 'OpenSubtitles v3', gives: 'Subtitles for movies and series', ver: D.os.version },
  wh: { ini: 'WH', name: 'WatchHub', gives: 'Where else to watch: rent, buy or stream', ver: D.wh.version },
  pd: { ini: 'PD', name: 'Public Domain Movies', gives: 'A catalog only: its films come as torrents', ver: D.pd.version },
  ar: { ini: 'AR', name: 'Archivio | ElfHosted', gives: 'Streams from the Internet Archive', ver: '–' },
  ks: { ini: 'KS', name: 'Kestrel', gives: 'Streams for movies and series', ver: '1.0.3' },
};
const lg = (k, xl, dim) => `<span class="ad-lg${xl ? ' xl' : ''}${dim ? ' dim' : ''}">${A[k] ? A[k].ini : k}</span>`;

// ---------- page shell ----------
function topbar(sel) {
  const tabs = [['search', 'Search'], ['home', 'Home'], ['live', 'Live'], ['nba', 'NBA'], ['movie', 'Movies'], ['series', 'Series'], ['saved', 'Saved']];
  return `<div class="topbar" data-row="topbar"><img src="../../../app/tv/brand/assets/mark-small.svg" class="mk" alt=""><div class="tabs">${tabs.map(([k, l]) => `<span class="tab${k === 'search' ? ' srch' : ''}${k === sel ? ' sel' : ''}">${k === 'search' ? ic('search') : ''}${l}</span>`).join('')}</div><div class="tb-r"><span class="avatar">${ic('user')}</span></div></div>`;
}
const pages = [];
function page(file, title, body, note, { group = '', shield = false, nba = false } = {}) {
  fs.writeFileSync(path.join(root, file), `<!doctype html>
<html lang="en" class="tv"><head><meta charset="utf-8"><meta name="viewport" content="width=960,height=540"><meta name="mock-size" content="960x540@2">${shield ? '\n<meta name="shield" content="unseen"><meta name="hidden-et" content="2026-10-26">' : ''}
<title>${esc(title)}</title>
<link rel="stylesheet" href="../../../app/tv/brand/fonts.css"><link rel="stylesheet" href="../../../app/tv/brand/tokens.css">
<link rel="stylesheet" href="../../../app/tv/ui.css"><link rel="stylesheet" href="../../../app/tv/app.css">${nba ? '<link rel="stylesheet" href="../../../app/tv/nba.css"><link rel="stylesheet" href="../catchup/catchup.css">' : ''}<link rel="stylesheet" href="addons.css">
</head><body><div class="screen">
${body}
</div></body></html>
`);
  pages.push({ file, title, note, group });
}
const G1 = 'Account: Add-ons', G2 = 'Adding one', G3 = 'Catalogs and Search', G4 = 'The title page', G5 = 'Player, states, shield';

// =====================================================================================================================
// 1. ACCOUNT > ADD-ONS (SPEC 3)
// =====================================================================================================================
const GROUPS = ['Provider', 'Add-ons', 'Playback', 'Sound', 'NBA', 'Languages', 'Home rows', 'Updates', 'About'];
const side = (sel = 'Add-ons') => `<div class="abs" style="left:48px;top:90px;width:200px">${GROUPS.map((l) => `<div class="gl${l === sel ? ' sel' : ''}">${l}</div>`).join('')}</div>`;
const more = (v) => `${v} ${ic('chevR', 'sm')}`;
// an add-on row: logo, name, what it gives, its state
const adrow = (k, st, { f = false, sub, off = false, lift = false, warn = false } = {}) => `<div class="ad-row${f ? ' f-ring' : ''}${off ? ' off' : ''}${lift ? ' lift' : ''}">${lift ? `<span class="grip">${ic('chevU', 'sm')}${ic('chevD', 'sm')}</span>` : ''}${lg(k, false, off)}<span class="grow"><span class="a">${esc(A[k].name)}</span><span class="b">${esc(sub || A[k].gives)}</span></span><span class="st${warn ? ' warn' : st === 'On' ? ' on' : ''}">${warn ? bang : ''}${st}${lift ? '' : ic('chevR', 'sm')}</span></div>`;
const SEC = (n, small) => `<div class="ad-sec">Installed · ${n}<small>${small}</small></div>`;
function addons({ focus = 'nl', lift = false, scrolled = false } = {}) {
  const head = scrolled ? '' : `<div class="t-title" style="margin-bottom:10px">Add-ons</div>
    <div class="arow${focus === 'add' ? ' f-ring' : ''}"><span class="grow" style="min-width:0">Add an add-on<div class="t-cap" style="margin-top:0">From your Stremio account, Stremio's list, or your phone</div></span><span class="av">${ic('plus', 'sm')}</span></div>`;
  let rows;
  if (lift) rows = `${SEC(6, '▲▼ move it · OK drops · Back puts it back')}${adrow('cm', 'On')}${adrow('nl', '2 of 6', { lift: true })}${adrow('os', 'On')}${adrow('wh', 'On')}${adrow('pd', 'Catalog only')}`;
  else if (scrolled) rows = `${SEC(6, 'Synced with your Stremio account at 21:02')}${adrow('nl', 'On')}${adrow('cm', 'On')}${adrow('os', 'On')}${adrow('wh', 'On')}${adrow('pd', 'Catalog only', { sub: 'Its films come as torrents, which airglow doesn\'t play' })}${adrow('ar', 'Not answering', { f: true, warn: true, sub: 'Sends a web page, not an add-on · last worked Sat 24 Oct' })}`;
  else rows = `${SEC(6, 'Higher comes first · synced with Stremio 21:02')}${adrow('nl', 'On', { f: focus === 'nl' })}${adrow('cm', 'On', { f: focus === 'cm' })}${adrow('os', 'On')}${adrow('wh', 'On')}${adrow('pd', 'Catalog only')}`;
  return `${topbar('')}${side()}<div class="ad-pane">${head}${rows}</div>`;
}
page('acct-addons.html', 'Account > Add-ons', addons(),
  'A new group under Provider. "Add an add-on" first, then the installed ones in order: what each gives, in plain words, and its state. OK opens an add-on\'s sheet; hold OK: Move, Turn off, Remove.', { group: G1 });

// the add-on's own sheet: Cinemeta, whose catalogs are where Home and Movies rows are switched
const catRow = (t, v, f) => `<div class="ad-lr${f ? ' f-ring' : ''}"><span class="grow"><span class="a">${t}</span></span><span class="v">${v}${ic('chevR', 'sm')}</span></div>`;
function cmSheet(focusRow = 0) {
  return `<div class="scrim"></div><div class="sheet"><div class="ad-head">${lg('cm', true)}<div class="tx"><b>Cinemeta</b><span>Version ${esc(A.cm.ver)} · from your Stremio account</span></div></div>
    <div class="ad-gives"><span>${ic('list')}Catalogs</span><span>${ic('info')}Details for titles</span></div>
    <div class="sheet-scroll">
      <div class="ad-lr${focusRow === 0 ? ' f-ring' : ''}"><span class="grow"><span class="a">Use this add-on</span></span>${toggle(true)}</div>
      <div class="sheet sec" style="all:unset;font:650 14px/18px var(--a-font-text);letter-spacing:.08em;text-transform:uppercase;color:var(--a-text-3);padding:6px 12px 0">Catalogs · where they show</div>
      ${catRow('Popular movies', 'Home, Movies', focusRow === 1)}${catRow('Popular series', 'Home, Series')}${catRow('New movies', 'Movies')}${catRow('New series', 'Series')}
    </div><div class="t-cap" style="text-align:right">▼ 2 more catalogs, Move, Remove</div></div>`;
}
page('acct-addon-sheet.html', 'An add-on\'s sheet: Cinemeta', `${addons({ focus: '' })}${cmSheet(1)}`,
  'OK on Cinemeta. What it gives, an on/off switch, and one row per catalog saying where it shows. This is where a Home row or a Movies chip is switched off for good.', { group: G1 });

page('acct-catalog-menu.html', 'One catalog: where it shows', `${addons({ focus: '' })}${cmSheet(-1)}<div class="menu" style="left:150px;top:150px;width:320px"><h3>Popular movies</h3>
  <div class="ad-lr f-ring"><span class="ck on">${ic('check')}</span><span class="grow"><span class="a">On Home</span><span class="b">A row after Tonight's games</span></span></div>
  <div class="ad-lr"><span class="ck on">${ic('check')}</span><span class="grow"><span class="a">In Movies</span><span class="b">A chip after the provider's</span></span></div>
  <div class="t-cap" style="padding:8px 12px 2px">Both off hides it. Cinemeta stays on for details.</div></div>`,
  'OK on a catalog row: two checks. OK ticks, Back closes and keeps it. The same menu is reached from a Home row (hold OK, "Hide this row") so the owner never has to come here to tidy Home.', { group: G1 });

page('acct-addon-move.html', 'Moving an add-on', addons({ lift: true }),
  'Hold OK on a row, then Move: the row lifts (the Saved reorder model), ▲▼ move it, OK drops. Order decides which rows come first and which add-on wins a tie in Sources.', { group: G1 });

// =====================================================================================================================
// 2. ADDING ONE (SPEC 3.2 to 3.6)
// =====================================================================================================================
const way = (i0, a, b, { f = false, tag = '' } = {}) => `<div class="ad-lr${f ? ' f-ring' : ''}"><span class="ico">${ic(i0)}</span><span class="grow"><span class="a">${a}</span><span class="b">${b}</span></span>${tag ? `<small>${tag}</small>` : ''}</div>`;
page('add-ways.html', 'Add an add-on: four ways', `${addons({ focus: '' })}<div class="scrim"></div><div class="menu ad-ways"><h3>Add an add-on</h3>
  ${way('user', 'Use your Stremio account', 'Sign in once on your phone. Your Stremio add-ons come here and stay in step', { f: 1, tag: 'Easiest' })}
  ${way('list', 'Pick from Stremio\'s list', 'Official and community add-ons, chosen with the remote')}
  ${way('phone', 'Send a link from your phone', 'For one you set up on a web page. Same Wi-Fi as the TV')}
  ${way('keys', 'Type the link', 'On the TV keyboard')}
  <div class="t-cap" style="padding:10px 12px 0">airglow plays direct links. An add-on that only finds torrents shows nothing here.</div></div>`,
  'OK on "Add an add-on". The Stremio account is first and marked Easiest: no typing, and it also carries add-ons that need setting up. Typing is last.', { group: G2 });

const code = 'R2T3';
page('add-stremio-code.html', 'Stremio sign-in: the code', `<div class="abs t-head" style="left:48px;top:64px">Sign in to Stremio on your phone</div>
  <div class="abs" style="left:48px;top:118px;width:470px"><ol class="ad-steps"><li>Scan the code with your phone's camera, or open <b>link.stremio.com</b> and enter the letters below.</li><li>Sign in to Stremio. Any way works: Google, Apple, Facebook or email.</li><li>That's all. This screen moves on by itself.</li></ol>
  <div class="ad-code">${code.split('').map((c) => `<span>${c}</span>`).join('')}</div></div>
  <div class="abs" style="left:616px;top:64px;width:296px;text-align:center"><div class="qrbox">${qr(200, 11)}</div><div class="t-cap" style="margin-top:10px">link.stremio.com/${code}</div></div>
  <div class="card ad-wait">${spin(1)}<div class="grow"><b>Waiting for you to sign in</b><div class="t-cap">airglow reads your add-on list. It never changes your Stremio account.</div></div><span class="btn2 sm f-ring">Use email and password</span></div>`,
  'Stremio\'s own TV sign-in (link.stremio.com, verified: a 4-letter code, a link and a QR). The phone does the typing; the TV asks every 3 s. The fallback is one press away and focused, so a stray OK is harmless.', { group: G2 });

const imp = (k, b, on = true, f = false) => `<div class="ad-lr${f ? ' f-ring' : ''}"><span class="ck${on ? ' on' : ''}">${on ? ic('check') : ''}</span>${lg(k)}<span class="grow"><span class="a">${esc(A[k].name)}</span><span class="b">${esc(b)}</span></span></div>`;
page('add-stremio-found.html', 'Your Stremio add-ons', `<div class="abs t-head" style="left:48px;top:48px">Your Stremio add-ons</div>
  <div class="abs t-body" style="left:48px;top:88px;color:var(--a-text-2)">8 in your account. airglow can use 5 of them.</div>
  <div class="abs ad-imp" style="left:48px;top:128px;width:520px;display:flex;flex-direction:column;gap:4px">
    ${imp('nl', 'Streams for movies and series · already set up')}${imp('cm', 'Catalogs and details')}${imp('os', 'Subtitles')}${imp('wh', 'Where else to watch')}${imp('pd', 'Its catalog only: its films are torrents')}
    <div class="ad-why" style="padding:8px 12px 0;line-height:20px">Left out: <b style="color:var(--a-text-2)">YouTube</b> (channels aren't in airglow yet), <b style="color:var(--a-text-2)">OpenSubtitles</b> (an older kind of add-on; v3 does the same) and <b style="color:var(--a-text-2)">Local Files</b> (needs the Stremio app on this TV).</div></div>
  <div class="abs card" style="left:600px;top:128px;width:312px;padding:18px">
    <div class="ad-lr" style="padding:0"><span class="grow"><span class="a">Keep in step</span><span class="b">with your Stremio account</span></span>${toggle(true)}</div>
    <div class="ad-note" style="margin:8px 0 18px">Add or remove one in Stremio later, on any device, and it changes here too, the next time airglow starts.</div>
    <span class="btn f" style="transform-origin:0 50%">${ic('check')}Add 5 add-ons</span></div>`,
  'The answer to addonCollectionGet, in plain words. What airglow can\'t use is named once, with why, never as a broken row. One OK adds them; the checks can be changed first.', { group: G2 });

page('add-stremio-email.html', 'Stremio sign-in: email fallback', `<div class="abs t-head" style="left:48px;top:64px">Sign in with email</div>
  <div class="abs" style="left:48px;top:118px;width:520px">
    <div class="fld"><div class="fl">Email</div><div class="field ring"><span>birdie.fan@example.com</span></div></div>
    <div class="row-flex" style="gap:8px;margin:-6px 0 14px;font:650 14px/18px var(--a-font-text);color:var(--a-text-1)">${bang}No Stremio account uses this email</div>
    <div class="fld"><div class="fl">Password</div><div class="field"><span>••••••••••</span></div></div>
    <div class="row-flex" style="gap:20px;margin-top:6px"><span class="btn">Sign in</span><span class="t-cap">OK on a field opens the keyboard</span></div></div>
  <div class="abs card" style="left:620px;top:118px;width:292px;padding:16px"><b style="font:650 16px/22px var(--a-font-text)">Signed up with Google, Apple or Facebook?</b><div class="t-cap" style="margin-top:4px;line-height:20px">Those accounts have no password here. Use the code instead: it takes one scan.</div><span class="btn2 sm" style="margin-top:14px">Use the code instead</span></div>`,
  'The fallback, from the code screen. Errors sit under the field that caused them, in chalk with the "!" (never red). Verified: Stremio answers "User not found" with wrongEmail for an unknown address.', { group: G2 });

// the add-on list on the TV (Cinemeta's addon_catalog: Official 7, Community 97)
const subsRow = (name, desc, st, f, k) => `<div class="ad-row${f ? ' f-ring' : ''}"><span class="ad-lg">${k}</span><span class="grow"><span class="a">${esc(name)}</span><span class="b">${esc(desc)}</span></span><span class="st${st === 'Add' ? ' on' : ''}">${st === 'Add' ? ic('plus', 'sm') : st === 'Added' ? ic('check', 'sm') : ic('phone', 'sm')}${st === 'Setup' ? 'Set up on your phone' : st}</span></div>`;
const S0 = D.communitySubs;
const sd = (n) => (S0.find((a) => a.name === n) || {}).description || '';
page('add-list.html', 'Stremio\'s list, on the TV', `${topbar('')}<div class="lib-head"><span class="t-head">Stremio's add-ons</span><span class="t-cap" style="margin-top:6px">Official ${D.addonCatalogOfficial.length}${dot}Community ${D.addonCatalogCommunity.count}</span></div>
  <div class="lib-chips" data-row><span class="chip lg">Official</span><span class="chip lg sel">Community</span><span class="ad-cut"></span><span class="chip lg">Streams</span><span class="chip lg">Catalogs</span><span class="chip lg sel">Subtitles<span class="n">${S0.length}</span></span></div>
  <div class="abs" style="left:48px;top:184px;width:864px">
    ${subsRow('Napisy24 Addon', sd('Napisy24 Addon'), 'Add', true, 'N2')}${subsRow('Ktuvit.me Subtitles', sd('Ktuvit.me Subtitles'), 'Add', false, 'KT')}${subsRow('opensubtitles PRO', sd('opensubtitles PRO'), 'Setup', false, 'OP')}${subsRow('SubDL Subtitles', sd('SubDL Subtitles'), 'Setup', false, 'SD')}${subsRow('Tu Subtitulo', sd('Tu Subtitulo').slice(0, 90), 'Add', false, 'TU')}</div>`,
  'Pick from Stremio\'s list (Cinemeta\'s addon_catalog, real data). Chips filter by what an add-on gives. OK on Add adds it after a confirm; "Set up on your phone" opens the setup card. 23 of the 44 subtitle add-ons need setting up.', { group: G2 });

page('add-phone.html', 'Send a link from your phone', `<div class="abs t-head" style="left:48px;top:64px">Send a link from your phone</div>
  <div class="abs" style="left:48px;top:118px;width:470px"><ol class="ad-steps"><li>Scan the code, or open <b>192.168.1.23:8790</b> on a phone on the same Wi-Fi.</li><li>Paste the add-on's link. It usually ends in <b>manifest.json</b>.</li><li>Tap Send. The TV asks before adding it.</li></ol></div>
  <div class="abs" style="left:616px;top:64px;width:296px;text-align:center"><div class="qrbox">${qr(200, 23)}</div><div class="t-cap" style="margin-top:10px">192.168.1.23:8790 · code <b style="color:var(--a-text-1)">4821</b></div></div>
  <div class="card ad-wait">${spin(1)}<div class="grow"><b>Waiting for your phone</b><div class="t-cap">The TV serves this page itself, only while this screen is open. Nothing leaves your home network.</div></div><span class="btn2 sm f-ring">Type the link instead</span></div>`,
  'For an add-on set up on a web page (most debrid ones), without a Stremio account. The TV app serves one small page on the Wi-Fi (the same page the first-run "Use your phone" sign-in was designed with, UI-SPEC 5.1).', { group: G2 });

page('add-confirm.html', 'Before adding: what it gives', `<div class="abs t-head" style="left:48px;top:64px">Send a link from your phone</div><div class="scrim"></div>
  <div class="menu" style="left:50%;top:50%;width:520px;transform:translate(-50%,-50%);padding:22px 22px 18px"><div class="ad-head">${lg('nl', true)}<div class="tx"><b>Add Northlight?</b><span>Sent from your phone just now</span></div></div>
  <div class="ad-gives" style="margin-top:14px"><span>${ic('film')}Streams: movies, series</span><span>${ic('user')}Set up with your details</span></div>
  <div class="ad-note" style="margin-top:12px">Its link holds your account details, so airglow keeps it private and never shows it in full.</div>
  <div class="row-flex" style="gap:20px;margin-top:18px"><span class="btn f" style="transform-origin:0 50%">${ic('plus')}Add it</span><span class="btn2">Cancel</span></div></div>`,
  'Every way in ends here: airglow reads the manifest first and says what the add-on gives. Nothing is added without this OK. A link that isn\'t an add-on gets a plain "That link isn\'t an add-on" instead.', { group: G2 });

page('add-setup.html', 'An add-on that needs setting up', `${topbar('')}<div class="lib-head"><span class="t-head">Stremio's add-ons</span></div><div class="scrim"></div>
  <div class="menu" style="left:50%;top:50%;width:640px;transform:translate(-50%,-50%);padding:22px 24px 20px"><div class="ad-head">${lg('OP', true)}<div class="tx"><b>opensubtitles PRO needs setting up</b><span>It asks for your choices on its own web page</span></div></div>
  <div class="row-flex" style="gap:22px;margin-top:16px;align-items:flex-start"><div class="qrbox">${qr(148, 41)}</div>
  <ol class="ad-steps" style="flex:1"><li>Scan it. Your phone opens airglow's page, with a button to its setup page.</li><li>Make your choices, then tap <b>Install</b> or <b>Copy link</b>.</li><li>Paste the link on airglow's page and tap Send.</li></ol></div>
  <div class="row-flex" style="gap:12px;margin-top:6px">${spin()}<span class="ad-cap">Waiting for your phone · <b>Back</b> cancels</span></div></div>`,
  'A configurable add-on with configurationRequired. The setup itself happens on the add-on\'s own page (Stremio\'s rule); airglow only carries the result back. Nothing to press on the TV, so nothing is focused.', { group: G2 });

// the phone page itself, at the phone's own size (CSS px of a 300 px wide phone)
const phone = (x, body) => `<div class="ad-phone" style="left:${x}px"><div class="bar"><span>airglow · on your TV</span><span>21:10</span></div>${body}</div>`;
page('phone-page.html', 'The page the TV serves to the phone', `
  ${phone(48, `<h4>Send to your TV</h4><p>Paste an add-on's link. It usually ends in manifest.json.</p><div class="pf" style="color:var(--a-text-1)">https://northlight.example/eyJ…/manifest.json</div><div class="pb">Send to the TV</div><div class="pl">Or set one up</div><div class="pb2">opensubtitles PRO</div><p class="pn">Works only on the same Wi-Fi as the TV. The TV asks before it adds anything.</p>`)}
  ${phone(348, `<h4>Set up opensubtitles PRO</h4><p>1. Open its page and make your choices.</p><div class="pb2">Open its setup page</div><p>2. When it shows Install or a link, copy the link and paste it here.</p><div class="pf">Paste the link</div><div class="pb">Send to the TV</div><p class="pn">Use Stremio on this phone? Install works too: it goes to your Stremio account and on to airglow.</p>`)}
  ${phone(648, `<h4>Sent</h4><p>Look at your TV. It asks before adding Northlight.</p><div class="pb2">Send another</div><p class="pn">This page stops working when you close the screen on the TV. To use it again, open Add an add-on.</p>`)}`,
  'Not a TV screen: the one page the TV serves on the Wi-Fi (http, port 8790, code in the link). Three states: paste and send, set up an add-on, sent. Phone text is 14 px and up; one column; big buttons.', { group: G2 });

// =====================================================================================================================
// 3. CATALOGS AND SEARCH (SPEC 4, 6)
// =====================================================================================================================
const TM = D.topMovies, TS = D.topSeries;
const yr = (m) => String(m.year || '').replace('–', '–');
const genre1 = (m) => (Array.isArray(m.genres) ? m.genres[0] : m.genres) || '';
const STY = ['sun', 'figure', 'waves', 'city', 'retro', 'peaks', 'forest', 'tower', 'rings', 'studio', 'theatre', 'lighthouse'];
// a Home card for a catalog title: art (the add-on's background), the title, year and genre; "Also on your provider"
// when the provider has the same title (IMDb id match, SPEC 4.4)
const hcT = (m, i, { f = false, mine = false } = {}) => `<div class="hc${f ? ' f' : ''}"><div class="art">${Art.art(m.id, { style: STY[i % STY.length] })}</div><div class="hs"></div><div class="tp">${mine ? '<span class="tag q">4K</span>' : ''}<span class="n">${m.imdbRating ? `★ ${m.imdbRating}` : ''}</span></div><div class="bt"><b>${esc(unent(m.name))}</b><span>${mine ? `<span class="ad-src">${ic('tv', 'xs')}Also on your provider</span>` : esc([yr(m), genre1(m)].filter(Boolean).join(' · '))}</span></div></div>`;
const contCard = (kind, title, left, pct, seed) => `<div class="hc"><div class="art">${Art.art(seed)}</div><div class="hs"></div><div class="tp"><span class="t-label" style="line-height:22px">${kind}</span><span class="n">${left}</span></div><div class="bt"><b>${esc(title)}</b></div><div class="prog flush"><i style="width:${pct}%"></i></div></div>`;
const rail = (title, cards, top, small = '') => `<div class="abs rowtitle" style="left:48px;top:${top}px">${title}${small ? `<small>${small}</small>` : ''}</div><div class="rail abs" style="top:${top + 36}px;left:0;right:0"><div class="track" data-row>${cards}</div></div>`;
function homeRows(focusI = 1) {
  return `${rail('Continue watching', `${contCard('S3 · E4', 'The Bear', '22 min left', 35, 'bear4')}${contCard('Film', 'Dune: Part Two', '1 h 35 min left', 43, 'dune2b')}${contCard('Film', 'Harbor Lights', '54 min left', 57, 'm1')}${contCard('S1 · E2', 'Night Circuit', '31 min left', 20, 'nc2')}`, 32)}
  ${rail('Popular movies', TM.slice(0, 5).map((m, i) => hcT(m, i, { f: i === focusI, mine: i === 2 })).join(''), 176, 'Cinemeta')}
  ${rail('Popular series', TS.slice(0, 5).map((m, i) => hcT(m, i + 3, { mine: i === 3 })).join(''), 320, 'Cinemeta')}`;
}
page('home-rows.html', 'Home: add-on rows', homeRows(1),
  'Home scrolled down. Add-on rows come after airglow\'s own (Continue watching, On now, Tonight\'s games); two by default, the first movie and series catalogs. The catalog\'s name is the row, the add-on\'s is the small caption. A title the provider has too says so (here Obsession).', { group: G3 });

page('home-row-menu.html', 'Home: hiding an add-on row', `${homeRows(-1)}<div class="ctxmenu" style="left:268px;top:330px"><div class="lr f-ring">${ic('saved', 'sm')}Save to Saved</div><div class="lr">${ic('info', 'sm')}Details</div><div class="lr">${ic('x', 'sm')}Hide "Popular movies" from Home</div></div>`,
  'Hold OK on any add-on card: Save to Saved first and focused (the app-wide rule), Details, then "Hide … from Home". Hidden rows come back from Account > Add-ons > Cinemeta.', { group: G3 });

const pcT = (m, i, { f = false, mine = false } = {}) => `<div class="pc"><div class="box${f ? ' f' : ''}"><div class="art">${Art.poster(m.id, { title: unent(m.name), style: STY[(i + 4) % STY.length] })}</div>${mine ? `<div class="tl"><span class="tag q">4K</span></div><div class="ad-mine">${ic('tv')}</div>` : ''}</div><div class="cap">${esc(unent(m.name))}</div><div class="cm">${esc([yr(m), m.imdbRating ? `★ ${m.imdbRating}` : genre1(m)].filter(Boolean).join(' · '))}</div></div>`;
function moviesAddon({ down = false } = {}) {
  const chips = `<div class="lib-chips scrolled" data-row style="left:42px"><span class="chip lg">Comedy</span><span class="chip lg">Drama</span><span class="chip lg">Thriller</span><span class="ad-cut"></span><span class="chip lg${down ? '' : ' sel'}">Popular<span class="ad-by">Cinemeta</span></span><span class="chip lg${down ? ' sel' : ''}">New<span class="ad-by">Cinemeta</span></span><span class="chip lg">Public Domain Movies</span></div>`;
  const head = `<div class="lib-head" data-row><span class="t-head">Movies</span><span class="t-cap" style="margin-top:6px">${down ? 'New' : 'Popular'} from Cinemeta${dot}<span class="ad-legend"><i>${ic('tv')}</i>also on your provider</span></span><span class="grow"></span><span class="pillbtn">${ic('sliders')}Genre<b>All</b></span></div>`;
  const grid = down ? `<div class="abs" style="left:48px;right:48px;top:200px"><div class="state big"><div class="ico">${bang}</div><b>Cinemeta isn't answering</b><p>Its catalogs come back when it does. Your provider's movies are all still here, under All.</p><div class="row-flex" style="gap:20px;justify-content:center"><span class="btn f">${ic('refresh')}Try again</span><span class="btn2">All movies</span></div></div></div>`
    : `<div class="lib-grid">${TM.slice(0, 12).map((m, i) => pcT(m, i, { f: i === 1, mine: i === 2 || i === 13 })).join('')}</div>`;
  return `${topbar('movie')}${head}${chips}${grid}`;
}
page('movies-addon.html', 'Movies: an add-on catalog chip', moviesAddon(),
  'Add-on catalogs are chips after the provider\'s, past a thin divider (the row scrolls). On an add-on chip the grid is that catalog, in its own order; Filters becomes the catalog\'s own Genre list; Sort and Jump go (an add-on has no total).', { group: G3 });

page('movies-addon-down.html', 'Movies: the add-on isn\'t answering', moviesAddon({ down: true }),
  'The add-on timed out (8 s) or sent no JSON. The card says whose fault, that the provider\'s movies are fine, and offers Try again (focused) and All movies. Nothing else on the screen changes.', { group: G3 });

// Search: provider results first (local, instant), then "From add-ons" (search catalogs, after 600 ms)
function search() {
  const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
  const kb = keys.map((k) => `<span class="key">${k}</span>`).join('');
  const SD = D.searchDune, SS = D.searchDuneSeries;
  const r = (m, sub, { f = false, st = 'peaks', hue } = {}) => `<div class="rrow${f ? ' f-ring' : ''}" style="margin-bottom:8px"><div class="mini"><div class="art">${Art.poster(m.id, { style: st, hue })}</div></div><div class="ad-mt grow"><b>${esc(unent(m.name))}</b><span>${sub}</span></div></div>`;
  return `${topbar('search')}
    <div class="abs" style="left:48px;top:90px;width:352px">
      <div class="sfield"><span class="micbtn">${ic('mic')}</span><span class="grow" style="white-space:nowrap"><b>DUNE</b><i class="caret"></i></span></div>
      <div class="sugg bleed"><span class="chip">${ic('search')}Dune: Part Two</span><span class="chip">${ic('search')}Dune: Prophecy</span></div>
      <div class="kb">${kb}</div><div class="kbrow"><span class="key wide">Space</span><span class="key wide">Delete</span><span class="key wide">Clear</span></div></div>
    <div class="abs" style="left:432px;top:90px;width:480px">
      <div class="t-label" style="margin-bottom:8px">Top result</div>
      <div class="rrow" style="height:84px"><div class="mini2"><div class="art">${Art.poster('tt15239678', { style: 'peaks', hue: 32 })}</div></div><div class="grow"><div class="t-sub" style="font-size:18px;line-height:24px">Dune: Part Two</div><div class="t-cap">Movie${dot}2024${dot}4K from Northlight</div></div><span class="btn sm">${ic('play')}Play</span></div>
      <div class="t-label" style="margin:14px 0 8px">Movies and series</div>
      ${r(SD[0], `Movie${dot}2021${dot}your provider`, { st: 'sun', hue: 28 })}
      <div class="ad-rh"><span class="t-label">From add-ons</span><small>Cinemeta${dot}${SD.length + SS.length - 3} more below</small></div>
      ${r(SD[1], `Movie${dot}${esc(SD[1].year)}${dot}not out yet`, { f: true, st: 'waves', hue: 250 })}${r(SS[0], `Series${dot}${esc(SS[0].year)}`, { st: 'tower', hue: 300 })}</div>`;
}
page('search-addons.html', 'Search: provider first, then add-ons', search(),
  'Real Cinemeta search for "dune". The provider\'s matches are instant and come first; add-on results arrive under "From add-ons" with the add-on named. A title in both shows once, as the provider\'s (Dune: Part Two is the top result with its 4K from Northlight).', { group: G3 });

// =====================================================================================================================
// 4. THE TITLE PAGE (SPEC 5)
// =====================================================================================================================
const DU = D.dune2;
const wc = (t, y, g, seed, st) => `<div class="wc"><div class="art">${Art.art(seed, { style: st })}</div><div class="tx"><b>${esc(t)}</b><span>${y} · ${g}</span></div></div>`;
const MORE = `<div class="abs rowtitle" style="left:48px;top:366px;font-size:20px">More like this</div><div class="rail abs" style="top:400px;left:0;right:0"><div class="track" data-row>${wc('Dune', '2021', 'Sci-Fi', 'dune1', 'peaks')}${wc('Blade Runner 2049', '2017', 'Sci-Fi', 'br', 'city')}${wc('Arrival', '2016', 'Drama', 'arr', 'waves')}${wc('Prisoners', '2013', 'Thriller', 'pri', 'forest')}${wc('Sicario', '2015', 'Crime', 'sic', 'sun')}</div></div>`;
const tg = (t) => `<span class="tag q">${t}</span>`;
function detail({ title, eyebrow, meta, plot, credits, btns, pills, below = MORE, seed, style, hue }) {
  return `<div class="d-back"><div class="art">${Art.art(seed, { style, hue })}</div><div class="d-scrim"></div></div><div class="d-scrim2"></div>
  <div class="d-col"><div class="t-label t-2">${eyebrow}</div><div class="t-display clamp2" style="margin-top:6px">${esc(title)}</div>
    <div class="metaline" style="margin-top:10px">${meta}</div>
    <div class="t-body clamp2" data-plot style="margin-top:12px;width:460px">${esc(plot)}</div>
    ${credits ? `<div class="t-cap ellipsis" style="margin-top:8px;width:500px">${credits}</div>` : ''}
    <div class="row-flex" data-row style="gap:20px;margin-top:20px;height:44px;padding-left:2px">${btns}</div>
    <div class="ad-pills" data-row style="margin-top:12px">${pills}</div></div>${below}`;
}
const duneMeta = `<span class="star">${ic('star')}${DU.imdbRating}</span>${dot}<span>${DU.year}</span>${dot}<span>2 h 47 min</span>${dot}<span class="tag ad-ok">${TK}4K</span><span class="tag ad-ok">${TK}DV</span><span class="tag ad-ok">${TK}Atmos</span>`;
const duneBase = { title: DU.name, eyebrow: `Movie${dot}${DU.genres.join(' · ')}`, meta: duneMeta, plot: DU.description.replace(/\.\.\.$/, '…'), credits: `Directed by <span class="t-2">${esc(DU.director[0])}</span>${dot}<span class="t-2">${esc(DU.cast.join(', '))}</span>`, seed: 'dune-desert', style: 'peaks', hue: 30 };
const srcPill = (t, f, of = '', tick = true) => `<span class="pillbtn${f ? ' f-ring' : ''}">${ic('film')}${tick ? TK : ''}${t}${of ? ` <span class="ad-of">${of}</span>` : ''} ${ic('chevD')}</span>`;
const subPill = `<span class="pillbtn">${ic('cc')}Subtitles: English</span>`;
page('detail-sources.html', 'Title page: Play takes the best source', detail({ ...duneBase,
  btns: `<span class="btn f">${ic('play')}Play</span><span class="btn2">${ic('saved')}Save</span>`,
  pills: `${srcPill('4K Dolby Vision · Northlight', false, 'best of 9')}${subPill}<span class="ad-look">${spin()}Still asking Kestrel</span>` }),
  'The version pill becomes the source pill: it names what Play will play (the best so far, here Northlight\'s 4K Dolby Vision over the provider\'s Full HD). Add-ons answer while the page is read; the pill updates in place, focus never moves.', { group: G4 });

// the Copies menu (design/ui-v1/subtitles detail-copies, extended): "Always the best copy" first, then every copy,
// provider and add-ons together, best first; a tick only on what airglow checked itself (its 64 KB read, subtitles SPEC 5)
const cp = (a, b, { f = false, on = false, tick = true, best = false, ico = '' } = {}) => `<div class="lr ad-two${f ? ' f-ring' : ''}">${ico || `<span class="rd${on ? ' on' : ''}"></span>`}<span class="grow"><span class="a">${tick && !ico ? TK : ''}${a}</span><span class="b">${b}</span></span>${best ? '<span class="tag q ad-best">Best</span>' : ''}</div>`;
const COPIES = `<div class="menu ad-copies"><h3>Copies of Dune: Part Two<small>9 so far · checked 21:08</small></h3>
  ${cp('Always the best copy', 'Now: 4K · Dolby Vision · Northlight. Changes if a better copy shows up', { f: 1, on: 1, tick: false })}
  <div class="ad-sep"></div>
  ${cp('4K · Dolby Vision · 41 Mb/s', '<em>Northlight</em> · English · Blu-ray · Atmos · 51.6 GB', { best: 1 })}
  ${cp('4K · HDR10 · 19 Mb/s', '<em>Northlight</em> · English · web copy · 23.4 GB')}
  ${cp('1080p · 7.1 Mb/s', '<em>Your provider</em> · English · named 4K · 6.1 GB')}
  ${cp('1080p', '<em>Northlight</em> · English · Blu-ray · 14.2 GB · not checked yet', { tick: false })}
  ${cp('Kestrel is still looking', 'Its copies join this list as they come', { ico: spin(), tick: false })}
  <div class="ad-foot">▼ 4 more, and Watch in another app · picking a copy keeps it for this film</div></div>`;
page('detail-sources-sheet.html', 'The Copies menu, provider and add-ons together', `${detail({ ...duneBase, btns: `<span class="btn">${ic('play')}Play</span><span class="btn2">${ic('saved')}Save</span>`, pills: `${srcPill('4K Dolby Vision · Northlight', false, 'best of 9')}${subPill}` })}<div class="scrim"></div>${COPIES}`,
  'OK on the Version pill: the subtitles design\'s Copies menu, with add-on copies in the same list. "Always the best copy" stays first and focused. Each copy says what airglow checked (the tick), where it comes from, its language, kind and size. A copy not yet checked has no tick.', { group: G4 });

// Play pressed while a better copy may still come
const W = TM.find((m) => m.name === 'Weapons');
page('detail-play-wait.html', 'Play, while an add-on is still looking', detail({ title: W.name, eyebrow: `Movie${dot}${W.genres.join(' · ')}`,
  meta: `<span class="star">${ic('star')}${W.imdbRating}</span>${dot}<span>${W.year}</span>${dot}<span>2 h 9 min</span>${dot}<span class="tag ad-ok">${TK}HD</span><span class="tag">EN</span>`,
  plot: W.description, credits: '', seed: 'weapons', style: 'forest', hue: 270,
  btns: `<span class="btn f ad-wbtn">${ring(0.4)}Playing in 3 s</span><span class="btn2">${ic('saved')}Save</span>`,
  pills: `${srcPill('1080p · Your provider', false, 'best of 1')}<span class="ad-look">${spin()}<span><b style="color:var(--a-text-1)">OK</b> plays Full HD now · <b style="color:var(--a-text-1)">Back</b> stops</span></span>` }),
  'Play when the best so far isn\'t 4K and an add-on hasn\'t answered: up to 4 s for a better copy, counting down on the button. OK again plays the best so far at once; Back stops. With a 4K copy in hand, Play never waits.', { group: G4 });

// a title only add-ons have (Cinemeta's details, Northlight's streams)
const TZ = TM.find((m) => m.name === 'Tenzing');
page('detail-addon-only.html', 'A title only add-ons have', detail({ title: TZ.name, eyebrow: `Movie${dot}${TZ.genres.join(' · ')}`,
  meta: `<span class="star">${ic('star')}${TZ.imdbRating}</span>${dot}<span>${TZ.year}</span>${dot}<span>2 h 6 min</span>${dot}${tg('4K')}${tg('HDR')}`,
  plot: TZ.description, credits: `${ic('puzzle', 'xs')} Not on your provider${dot}details from Cinemeta`, seed: 'tenzing', style: 'peaks', hue: 205,
  btns: `<span class="btn f">${ic('play')}Play</span><span class="btn2">${ic('saved')}Save</span>`,
  pills: `${srcPill('4K HDR10 · Northlight', false, 'best of 4')}${subPill}` }),
  'Opened from a Cinemeta row. The same page: Cinemeta\'s details, Northlight\'s copies, More like this from both. One quiet line says the provider doesn\'t have it and where the details come from.', { group: G4 });

// series: The Bear, season 3; the provider has E1 to E7, add-ons the rest (illustrative split)
const BE = D.bear;
function bear() {
  const eps = BE.s3.slice(0, 8).map((e, i) => {
    const only = e.ep >= 8, f = e.ep === 5, done = e.ep < 4;
    return `<div class="ep${done ? ' done' : ''}"><div class="th${f ? ' f' : ''}"><div class="art">${Art.art('bear' + e.ep, { style: 'studio', hue: 18 + e.ep * 9 })}</div><span class="num">${e.ep}</span>${done ? `<span class="chk">${ic('check')}</span>` : ''}${only ? `<span class="ad-only">${ic('puzzle')}Add-on</span>` : ''}${e.ep === 4 ? '<div class="prog flush"><i style="width:35%"></i></div>' : ''}</div><div class="eb"><b>${esc(e.name)}</b><span>${e.ep === 4 ? '22 min left' : '35 min'}</span></div></div>`;
  }).join('');
  const e5 = BE.s3[4];
  return `<div class="d-back"><div class="art">${Art.art('bear-kitchen', { style: 'studio', hue: 22 })}</div><div class="d-scrim"></div></div><div class="d-scrim2" style="height:300px"></div>
  <div class="d-col" style="top:32px"><div class="t-label t-2">Series${dot}Comedy · Drama</div><div class="t-display clamp2" style="margin-top:6px">${esc(BE.name)}</div>
    <div class="metaline" style="margin-top:10px"><span class="star">${ic('star')}${BE.imdbRating}</span>${dot}<span>${esc(BE.year)}</span>${dot}<span>5 seasons</span></div>
    <div class="t-body clamp1 clamp2" data-plot style="margin-top:12px;width:460px">A young chef from the fine-dining world comes home to Chicago to run his family's sandwich shop.</div>
    <div class="row-flex" data-row style="gap:20px;margin-top:16px;height:44px;padding-left:2px"><span class="btn">${ic('play')}Resume S3 · E4</span><span class="btn2">${ic('saved')}Save</span>${srcPill('4K HDR10 · Northlight', false, 'S3 · E4')}</div></div>
  <div class="abs seas" data-row style="left:48px;right:48px;top:272px"><div style="display:flex;gap:8px"><span class="chip lg">Season 1</span><span class="chip lg">Season 2</span><span class="chip lg sel">Season 3</span><span class="chip lg">Season 4</span><span class="chip lg">Season 5</span><span class="chip lg">Specials</span><span class="t-cap" style="align-self:center;margin-left:8px;white-space:nowrap">10 episodes</span></div></div>
  <div class="rail abs" style="top:318px;left:0;right:0"><div class="track" data-row style="gap:24px;transform:translateX(-448px)">${eps}</div></div>
  <div class="abs epsyn" style="left:48px;top:486px;width:864px"><span class="ad-r">4K HDR10 · Northlight</span><b>E5 · ${esc(e5.name)}</b>${dot}${esc(e5.overview)}</div>`;
}
page('detail-series.html', 'Series: episodes from both', bear(),
  'Episodes are the union of the provider\'s list and Cinemeta\'s (seasons 1 to 5 and Specials, real data). An episode only add-ons have is marked Add-on. The focused episode\'s best source sits at the right of its one-line summary; the pill by Resume is for S3 · E4.', { group: G4 });

// an unsure match: the provider's "Dune" with no year. The picker is the subtitles design's (detail-match): one pick
// serves add-on copies and downloaded subtitles; the closest length to this copy is focused, never the first result
const SDm = D.searchDune;
const which = (a, b, f) => `<div class="lr ad-two${f ? ' f-ring' : ''}"><span class="grow"><span class="a">${a}</span><span class="b">${b}</span></span></div>`;
page('detail-match.html', 'Which film is this? (an unsure match)', `${detail({ title: 'Dune', eyebrow: `Movie${dot}Sci-Fi`, meta: `<span>2 h 35 min</span>${dot}<span class="tag ad-ok">${TK}4K</span><span class="tag">EN</span>`, plot: 'No description from your provider.', credits: '', seed: 'dune-x', style: 'peaks', hue: 40,
  btns: `<span class="btn">${ic('play')}Play</span><span class="btn2">${ic('saved')}Save</span>`, pills: `${srcPill('4K · Your provider', false, 'best of 1')}<span class="ad-look">${ic('puzzle', 'xs')}Add-ons need to know which Dune</span>` })}<div class="scrim"></div>
  <div class="menu ad-match"><h3>Which film is this?</h3><div class="ad-qq">From the Cinemeta search for "Dune" · this copy runs 2 h 35 min</div>
  ${which(esc(SDm[0].name), `${esc(SDm[0].year)} · 2 h 35 min · Denis Villeneuve`, true)}${which(esc(SDm[3].name), `${esc(SDm[3].year)} · 2 h 17 min · David Lynch`)}${which(esc(SDm[2].name), `${esc(SDm[2].year)} · 2 h 47 min · Denis Villeneuve`)}
  ${which('Search by another name', 'On the keyboard')}${which('None of these', 'Keep this copy only: no add-on copies or downloaded subtitles')}
  <div class="ad-foot">Your pick is remembered for this title, for copies and subtitles alike.</div></div>`,
  'Shared with the subtitles design: a provider title that matches more than one IMDb title (no year, two films called Dune) is never guessed. One pick serves add-on copies and downloaded subtitles. The closest length to this copy is focused (2 h 35 min). Real Cinemeta search.', { group: G4 });

const NL = D.notld;
page('detail-nosources.html', 'No copy to play', detail({ title: NL.name, eyebrow: `Movie${dot}${NL.genres.join(' · ')}`,
  meta: `<span class="star">${ic('star')}${NL.imdbRating}</span>${dot}<span>${NL.year}</span>${dot}<span>1 h 36 min</span>`,
  plot: NL.description, credits: `Directed by <span class="t-2">${esc(NL.director[0])}</span>${dot}<span class="t-2">${esc(unent(NL.cast.join(', ')))}</span>`, seed: 'notld', style: 'forest', hue: 120,
  btns: `<span class="btn f">${ic('refresh')}Look again</span><span class="btn2">${ic('saved')}Save</span>`,
  pills: `<span class="ad-look" style="white-space:normal;width:640px">${bang}<span>No copy to play. Public Domain Movies has it only as a torrent, which airglow doesn't play. Northlight found nothing.</span></span>` }),
  'Real: Public Domain Movies answers this film with one infoHash stream and no link. airglow hides torrents, so the page says plainly why there\'s nothing, names each add-on, and offers Look again (focused) instead of a Play that can\'t work.', { group: G4 });

// =====================================================================================================================
// 5. PLAYER, STATES, SHIELD (SPEC 8, 9, 10)
// =====================================================================================================================
const video = (seed, style, hue) => `<div class="vid"><div class="art">${Art.art(seed, { style, hue })}</div></div>`;
const hint = (items) => `<div class="nv-hint">${items.map(([k, t]) => `<span><span class="kbd">${k}</span>${t}</span>`).join('')}</div>`;
page('player-source-failed.html', 'Player: a copy stops, the next one takes over', `${video('dune-desert', 'peaks', 30)}<div class="nv-card ad-fail"><div class="t"><b>This copy stopped at 1:12:40</b><span>Northlight's 4K Dolby Vision copy stopped sending. Your place is kept.</span></div>
  <div class="ad-next">${ring(0.55, 1)}<div class="grow"><div class="a">Next best in 3 s: 4K · HDR · 23.4 GB</div><div class="b">Northlight · English · starts at 1:12:30</div></div></div>
  <div class="cbtns"><span class="btn sm f">${ic('play')}Play it now</span><span class="btn2 sm">Choose another</span></div></div>${hint([['OK', 'Play it now'], ['◀ ▶', 'Move'], ['Back', 'Stop']])}`,
  'After the player\'s own retries fail, a film moves to the next source by itself (3 s, OK sooner), 10 s before where it stopped. Live TV never does this (the score delay rule); films and episodes have no delay to break.', { group: G5 });

const prow2 = (a, b, { cur = false, f = false, on = false, tick = true } = {}) => `<div class="nv-row ad-r${cur ? ' cur' : ''}${f ? ' f' : ''}"><span class="rd${on ? ' on' : ''}"></span><div class="grow" style="min-width:0"><div class="a">${tick ? TK : ''}${a}</div><div class="b">${b}</div></div></div>`;
page('player-sources.html', 'Player: Quality lists every copy', `${video('dune-desert', 'peaks', 30)}<div class="nv-panel left" style="width:400px"><div class="nv-h">Quality</div>
  ${prow2('Always the best copy', 'Now: 4K · Dolby Vision · Northlight', { on: 1, tick: false })}<div class="ad-grp">Copies · best first</div>
  ${prow2('4K · Dolby Vision · 41 Mb/s', 'Northlight · playing', { cur: 1 })}${prow2('4K · HDR10 · 19 Mb/s', 'Northlight · web copy', { f: 1 })}${prow2('1080p · 7.1 Mb/s', 'Your provider · named 4K')}${prow2('1080p', 'Northlight · Blu-ray · not checked yet', { tick: false })}
  <div class="t-cap" style="padding:8px 12px 2px">Switching starts the other copy where you are.</div></div>${hint([['OK', 'Switch'], ['▲ ▼', 'Move'], ['Back', 'Options']])}`,
  'Options > Quality, as the subtitles design draws it (Always the best copy first, the checked copies below), with each copy\'s source on its second line. The same list and order as the title page. Picking one here is for this film.', { group: G5 });

const e5 = BE.s3[4];
page('player-upnext.html', 'Player: Up next keeps the same source', `${video('bear4', 'studio', 30)}<div class="ad-up">${ring(0.3, 1)}<div class="grow"><div class="a">Next episode in 7 s</div><div class="b">S3 · E5 · ${esc(e5.name)}</div><div class="b">Same source: Northlight 4K</div></div></div>${hint([['OK', 'Play now'], ['Back', 'Stay on this one']])}`,
  'bingeGroup: the next episode\'s streams are fetched 2 min before the end, and the one with the same bingeGroup plays (same add-on, same quality). The card says so. With no match it takes the best, and says that instead.', { group: G5 });

page('state-addon-down.html', 'An add-on that stopped answering', addons({ scrolled: true }),
  'Real: Archivio now redirects to a web page. airglow keeps it, marks it "Not answering" with what it got and when it last worked, and stops asking it for 30 min. Public Domain Movies reads "Catalog only": real, its streams are all torrents.', { group: G5 });

// the shield: an NBA replay from an add-on joins the catch-up sources sheet (catchup SPEC 5.6, 5.7)
const IMG = '../nba-pages/img/';
const crest = (a, s = '') => `<span class="team ${s}"><img src="${IMG}logo-${a}.png" alt=""></span>`;
const eyeSm = `<svg class="ic xs" viewBox="0 0 24 24" aria-hidden="true" style="flex:none">${P.eyeOff}</svg>`;
const partial = (r) => `<span class="nb-rp" style="display:inline-flex;align-items:center;gap:4px">${r}${eyeSm}</span>`;
const hero = `<div class="hero-plate"><div class="abs row-flex" style="left:24px;top:12px;gap:12px;height:24px"><span class="t-label" style="color:var(--a-pink-text)">Your team</span><span class="t-label t-2">NBA${dot}Mon 26 Oct${dot}late</span></div>
  <div class="mt"><div class="side" style="--tp:#4E6799;--ta:#F5B112;--tc:#F3EFE6">${crest('MEM', 'lg')}<div><div class="nm">Grizzlies</div><div class="rc">${partial('3-0')}</div></div></div><div class="sc"><span class="shield" style="height:44px;padding:0 12px;font-size:16px;gap:8px">${ic('eyeOff')}<span>Score hidden</span></span></div><div class="side r" style="--tp:#002B5C;--ta:#F9A01B;--tc:#F3EFE6"><div style="text-align:right"><div class="nm">Jazz</div><div class="rc">${partial('1-2')}</div></div>${crest('UTAH', 'lg')}</div></div>
  <div class="abs row-flex hero-btns" data-row style="left:24px;top:132px;gap:20px;width:572px"><span class="btn" style="transform-origin:0 50%">${ic('play')}Watch from tip-off</span><span class="btn2">Game page</span></div>
  <div class="slabbox" style="left:619px;width:243px"><div class="slabfill"></div><div class="slabcontent ink"><span class="big">REPLAY</span><span class="cap">Score hidden</span></div></div></div>`;
const cs = [['hist', 'NBA League Pass 4', 'Channel replay · quarter skips', 'Best'], ['puzzle', 'Full game · Memphis feed', 'Courtside add-on · 1080p'], ['film', 'Full game · Utah feed', 'Your provider\'s Movies · 720p'], ['eyeOff', 'Video naming the Grizzlies and the Jazz', 'Courtside add-on · Name hidden'], ['search', 'Choose a video…', 'Every video naming either team']];
page('sources-shield.html', 'Shield: add-on replays in the sources sheet', `${topbar('home')}${hero}<div class="scrim"></div><div class="sheet cu-srcs"><h3>Watch Grizzlies at Jazz</h3><div class="t-cap" style="margin-top:-6px">From tip-off${dot}Mon 26 Oct · late</div><div data-col style="display:flex;flex-direction:column;gap:2px">${cs.map(([i0, a, b, s], i) => `<div class="lr${i === 0 ? ' f-ring' : ''}"><span class="ico">${ic(i0)}</span><span class="grow"><span class="a">${esc(a)}</span><span class="b">${esc(b)}</span></span>${s ? `<small>${s}</small>` : ''}</div>`).join('')}</div><div class="t-cap" style="margin-top:auto">Add-on videos follow the same rules as your provider's: no sizes, no lengths, and a name that could tell is hidden.</div></div>`,
  'An add-on video matched to a hidden game is a "full-game video" (catch-up 3.1, 3.3): same ranking, same masking (5.7), and no size or length (either could tell overtime). "Courtside" is illustrative.', { group: G5, shield: true, nba: true });

fs.writeFileSync(path.join(root, 'tools', 'pages.json'), JSON.stringify(pages, null, 1));
console.log(`wrote ${pages.length} mocks`);
