// node tools/build.js   -> writes the diagnosis mocks (*.html) next to SPEC.md, and tools/pages.json.
// Every mock is the 960 x 540 canvas linking the app's real CSS (tokens, ui.css, app.css) plus diagnosis.css
// (as design/ui-v1/catchup/tools/build.js). Focus is marked with the kit classes: .f (ring + lift), .f-ring, .f-in, and
// .nv-row.f (the native panels' inset ring). The stall cards and the stutter chip take no focus (the action chip's model).
// Scenario (SPEC 0): the owner's TV, Tue 27 Oct 2026, 01:52 Reykjavik time (UTC). Grizzlies at Jazz is live on NBA
// League Pass 4 (also on ESPN and NBA TV); shield: My team. Channels, bitrates, speeds and timings are illustrative.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
global.window = global; require('../../kit/art.js');
const Art = global.Art;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- icons (app/tv/js/util.js names where they exist; the path's five are new: SPEC 2.3) ----------
const P = {
  chevR: '<path d="M9 5l7 7-7 7"/>', search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5"/>', pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17.5 10.2a2.4 2.4 0 1 0 0 3.6"/>',
  audio: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  pic: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 9.5V8h2M17 14.5V16h-2"/>',
  quality: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 15V9M7 12h3.5M10.5 9v6M14 9v6h1.5a3 3 0 0 0 0-6z"/>',
  starO: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  // the path (SPEC 2.3)
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  wifi: '<path d="M2.6 9.2a14 14 0 0 1 18.8 0M5.6 12.5a9.6 9.6 0 0 1 12.8 0M8.7 15.8a5 5 0 0 1 6.6 0"/><circle cx="12" cy="19.2" r="1.4" fill="currentColor" stroke="none"/>',
  wifiWeak: '<path d="M2.6 9.2a14 14 0 0 1 18.8 0M5.6 12.5a9.6 9.6 0 0 1 12.8 0" opacity=".3"/><path d="M8.7 15.8a5 5 0 0 1 6.6 0"/><circle cx="12" cy="19.2" r="1.4" fill="currentColor" stroke="none"/>',
  wifiOff: '<path d="M2.6 9.2a14 14 0 0 1 18.8 0M5.6 12.5a9.6 9.6 0 0 1 12.8 0M8.7 15.8a5 5 0 0 1 6.6 0" opacity=".3"/><path d="M4 4l16 16"/>',
  cable: '<path d="M9 3v4.5M15 3v4.5M6.5 7.5h11v3.5a5.5 5.5 0 0 1-11 0zM12 16.5V21"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z"/>',
  server: '<rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/><path d="M8 7.5h.01M8 16.5h.01" stroke-width="3"/>',
  stream: '<circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.4 5.4a9.3 9.3 0 0 0 0 13.2M18.6 5.4a9.3 9.3 0 0 1 0 13.2"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M3 15h18"/>',
  // Options > Connection, and the actions
  signal: '<path d="M5 19v-3M10 19v-6.5M15 19V9M20 19V5" stroke-width="2.6"/>',
  spin: '<path d="M12 3a9 9 0 1 0 9 9"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5"/>',
  lower: '<path d="M12 4v11M6.5 9.5L12 15l5.5-5.5M5 20h14"/>', swap: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
const TICK = `<i><svg viewBox="0 0 24 24">${P.check}</svg></i>`;
const tick = `<span class="dg-tick"><svg viewBox="0 0 24 24">${P.check}</svg></span>`;
const liveP = (c) => `<span class="a-live${c ? ' compact' : ''}">Live</span>`;
const kbd = (k) => `<span class="kbd">${k}</span>`;

// ---------- the path (SPEC 2.3): nodes [icon, label, state, reading], links between them ----------
// state: ok (tick), bad (chalk disc), off (not reached / waiting), run (being checked). link: ok, slow, cut, off, run
const disc = (icon, st) => `<span class="dg-c">${ic(icon)}${st === 'ok' ? TICK : ''}</span>`;
function hpath(nodes, links) {
  return `<div class="dg-path">${nodes.map(([icon, label, st, r], i) => `${i ? `<span class="dg-l ${links[i - 1]}"></span>` : ''}<div class="dg-n ${st}">${disc(icon, st)}<b>${label}</b>${r ? `<small>${r}</small>` : ''}</div>`).join('')}</div>`;
}
// vertical: [icon, label, state, reading, value]; the link INTO each node is links[i - 1]
function vpath(nodes, links, { fx = false } = {}) {
  return `<div class="dg-vpath${fx ? ' fx' : ''}">${nodes.map(([icon, label, st, r, v], i) => `<div class="dg-vn ${st}${i && links[i - 1] !== 'ok' ? ' in-' + links[i - 1] : ''}">${disc(icon, st)}<div class="tx"><b>${label}</b>${r ? `<small>${r}</small>` : ''}</div>${v ? `<span class="v">${v}</span>` : ''}</div>`).join('')}</div>`;
}
const N = {
  tv: (st = 'ok', r = '') => ['tv', 'TV', st, r], wifi: (st = 'ok', r = '', icon = 'wifi') => [icon, 'Wi-Fi', st, r], cable: (st = 'ok', r = '') => ['cable', 'Cable', st, r],
  net: (st = 'ok', r = '') => ['globe', 'Internet', st, r], prov: (st = 'ok', r = '') => ['server', 'Provider', st, r], ch: (st = 'ok', r = '', l = 'Channel') => ['stream', l, st, r],
};
// the stall card: no focus; its keys line says what OK, hold OK and Back do (SPEC 3)
function card({ spin = true, title, sub, path, keys = [], right = 'Back hides', foot = '' }) {
  return `<div class="nv-card dg-card"><div class="dg-head">${spin ? ic('spin', 'sp') : ''}<div class="tx"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div></div>
  ${path}${foot}
  <div class="dg-keys">${keys.map(([k, t, main]) => `<span>${kbd(k)}${main ? `<b>${t}</b>` : t}</span>`).join('')}${right ? `<span class="r">${right}</span>` : ''}</div></div>`;
}
// the failure card: a focused list (today's FailedCard, SPEC 5)
const frow = (icon, a, b, { f = false, live = false, logo = '' } = {}) => `<div class="nv-row${f ? ' f' : ''}" style="height:52px">${logo ? `<span class="logo sm" style="width:40px;height:30px;flex:none">${logo}</span>` : `<span class="ico">${ic(icon, 'sm')}</span>`}<div class="grow"><div class="a">${a}</div>${b ? `<div class="b">${b}</div>` : ''}</div>${live ? liveP(1) : ''}</div>`;
function fcard({ title, sub, path, rows, foot = 'Back closes' }) {
  return `<div class="nv-card dg-card" style="gap:10px;padding:16px 16px 12px"><div class="dg-head" style="padding:0 4px"><div class="tx"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div></div>
  <div style="padding:0 4px">${path}</div><div>${rows}</div><div class="t-cap" style="padding:0 6px">${foot}</div></div>`;
}

// ---------- the player shell (as catch-up) ----------
const video = (seed, style) => `<div class="vid"><div class="art">${Art.art(seed, style ? { style, hue: 28 } : {})}</div></div>`;
const hint = (items) => `<div class="nv-hint">${items.map(([k, t]) => `<span><span class="kbd">${k}</span>${t}</span>`).join('')}</div>`;
const orow = (i0, t, s, v, { f = false, cls = '' } = {}) => `<div class="nv-row g${f ? ' f' : ''}"><span class="ico">${ic(i0, 'sm')}</span><div class="grow"><div class="a">${t}</div>${s ? `<div class="b">${s}</div>` : ''}</div>${v ? `<span class="v${cls ? ' ' + cls : ''}">${v}${ic('chevR', 'sm')}</span>` : ''}</div>`;
const prow = (i0, t, s, { f = false } = {}) => `<div class="nv-row${f ? ' f' : ''}" style="height:50px"><span class="ico">${ic(i0, 'sm')}</span><div class="grow"><div class="a">${t}</div>${s ? `<div class="b">${s}</div>` : ''}</div></div>`;

const pages = [];
function page(file, title, body, note, { group = '', shield = false } = {}) {
  fs.writeFileSync(path.join(root, file), `<!doctype html>
<html lang="en" class="tv"><head><meta charset="utf-8"><meta name="viewport" content="width=960,height=540"><meta name="mock-size" content="960x540@2">${shield ? '\n<meta name="shield" content="unseen"><meta name="hidden-et" content="2026-10-26">' : ''}
<title>${esc(title)}</title>
<link rel="stylesheet" href="../../../app/tv/brand/fonts.css"><link rel="stylesheet" href="../../../app/tv/brand/tokens.css">
<link rel="stylesheet" href="../../../app/tv/ui.css"><link rel="stylesheet" href="../../../app/tv/app.css"><link rel="stylesheet" href="diagnosis.css">
</head><body><div class="screen">
${body}
</div></body></html>
`);
  pages.push({ file, title, note, group });
}

// =====================================================================================================================
// 1. WHILE IT LOADS (SPEC 3): the puck, the check, the causes. No focus; OK does the one best action.
// =====================================================================================================================
const KEYS = (main) => [['OK', main, 1], ['Hold OK', 'Details']];

page('stall-puck.html', 'Stalled 1 to 3 s: the puck', `${video('arena', 'arena')}<div class="dg-puck">${ic('spin')}</div>`,
  'A blip. From 1 s of a stall a 56 dp spinner puck at the card\'s anchor (bottom centre), instead of PlayerView\'s spinner in the middle of the picture. Gone the moment it plays.', { group: 'While it loads' });

page('stall-checking.html', 'Stalled 3 s: checking', `${video('pitch', 'pitch')}${card({
  title: 'Still loading', sub: 'Checking your Wi-Fi, internet and provider…',
  path: hpath([N.tv(), N.wifi(), N.net('run'), N.prov('off'), N.ch('off')], ['ok', 'run', 'off', 'off']),
  keys: [], right: 'Back hides',
})}`, 'At 3 s the puck opens into the card and the checks run (about 2 s). Each link fills with the pink progress as its answer comes back, left to right.', { group: 'While it loads' });

page('stall-provider-slow.html', 'Cause: the provider is slow', `${video('arena', 'arena')}${card({
  title: 'Your provider is slow with this channel', sub: 'Your internet is fine. This channel is arriving too slowly.',
  path: hpath([N.tv(), N.wifi(), N.net('ok', '48 Mbps'), N.prov(), N.ch('bad', '3 of 9 Mbps')], ['ok', 'ok', 'ok', 'slow']),
  keys: KEYS('Same game on ESPN'),
})}`, 'The owner\'s question answered: not you, them. The two numbers side by side are the evidence. OK switches to the game\'s other feed (its own score delay; never automatic). No score anywhere.', { group: 'While it loads', shield: true });

page('stall-wifi-weak.html', 'Cause: weak Wi-Fi', `${video('pitch', 'pitch')}${card({
  title: 'Your Wi-Fi is weak', sub: 'This channel needs 12 Mbps. Over this Wi-Fi it\'s getting 4.',
  path: hpath([N.tv(), N.wifi('bad', '1 of 4 bars', 'wifiWeak'), N.net(), N.prov(), N.ch()], ['slow', 'ok', 'ok', 'ok']),
  keys: KEYS('Switch to 720p'),
})}`, 'Wi-Fi 1 of 4 bars and the stream starving: the link from the TV to the router is the problem. OK steps down to the stream\'s 720p level (needs 5 Mbps).', { group: 'While it loads' });

page('stall-internet-slow.html', 'Cause: slow internet', `${video('studio', 'studio')}${card({
  title: 'Your internet is too slow for 4K', sub: 'This 4K channel needs 25 Mbps. Your internet gives 11 right now.',
  path: hpath([N.tv(), N.cable(), N.net('bad', '11 Mbps'), N.prov(), N.ch()], ['ok', 'slow', 'ok', 'ok']),
  keys: KEYS('Watch the HD copy'),
})}`, 'On a network cable, so it isn\'t Wi-Fi; a 3 s speed sample says the line itself is short. OK plays the provider\'s HD copy of the channel (needs 9 Mbps).', { group: 'While it loads' });

page('stall-offline.html', 'Cause: the TV is offline', `${video('pitch', 'pitch')}${card({
  spin: false, title: 'Your TV is offline', sub: 'The Wi-Fi dropped. airglow carries on by itself when it\'s back.',
  path: hpath([N.tv(), N.wifi('bad', 'Not connected', 'wifiOff'), N.net('off'), N.prov('off'), N.ch('off')], ['cut', 'off', 'off', 'off']),
  keys: KEYS('Network settings'),
})}`, 'Android says there is no network: shown at once (no 3 s wait, no checks). It tunes again the moment the network is back. OK opens the TV\'s network settings.', { group: 'While it loads' });

page('stall-provider-down.html', 'Cause: the provider isn\'t answering', `${video('arena', 'arena')}${card({
  title: 'Your provider isn\'t answering', sub: 'Your internet works. Their server hasn\'t answered for 20 s.',
  path: hpath([N.tv(), N.wifi(), N.net(), N.prov('bad', 'No answer'), N.ch('off')], ['ok', 'ok', 'cut', 'off']),
  keys: [['OK', 'Try again now', 1], ['Hold OK', 'Details']], right: 'Next try in 8 s',
})}`, 'Google answers, the provider doesn\'t: it\'s them, and nothing on this TV can fix it. airglow keeps reconnecting by itself (1, 2, 4… s); the countdown says when.', { group: 'While it loads', shield: true });

page('stall-limit.html', 'Cause: every stream is in use', `${video('arena2', 'arena')}${card({
  title: 'Your provider allows 2 streams', sub: 'Both are in use, by other devices. Stop one, or wait a moment.',
  path: hpath([N.tv(), N.wifi(), N.net(), N.prov('bad', '2 of 2 in use'), N.ch('off')], ['ok', 'ok', 'ok', 'off']),
  keys: [['OK', 'Try again now', 1], ['Hold OK', 'Details']], right: 'Next try in 5 s',
})}`, 'A 403 or 401 with the provider\'s own count full (active_cons = max_connections). The same card as catch-up\'s player-connlimit, with the path added.', { group: 'While it loads', shield: true });

// the stutter chip: playing again, but the third pause in 5 min (SPEC 3.4)
const ring = (sec, total = 10) => { const r = 15, cc = 2 * Math.PI * r, off = cc * (1 - sec / total); return `<svg width="40" height="40" viewBox="0 0 40 40" style="flex:none"><circle cx="20" cy="20" r="${r}" fill="none" stroke="#3D3B45" stroke-width="4"/><circle cx="20" cy="20" r="${r}" fill="none" stroke="#F95BAC" stroke-width="4" stroke-dasharray="${cc.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 20 20)"/></svg>`; };
page('stall-stutter.html', 'Keeps pausing: the chip', `${video('pitch', 'pitch')}<div class="nv-chip dg-chip">${ring(7)}<div class="grow"><b>This keeps pausing</b><span>Your Wi-Fi is weak for this channel</span></div>${kbd('OK')}<span class="t-cap" style="color:var(--a-text-1);white-space:nowrap">Switch to 720p</span></div>${hint([['OK', 'Switch to 720p'], ['Hold OK', 'Details'], ['Back', 'Dismiss'], ['▲ ▼', 'Zap']])}`,
  'Short pauses that each got under 3 s, but the third in 5 minutes: the action chip\'s slot and timing (10 s, any key dismisses), the cause in one line, the action on OK.', { group: 'While it loads' });

page('stall-vod.html', 'A movie: slow internet', `${video('coast')}${card({
  title: 'Your internet is slow for this movie', sub: 'It needs 16 Mbps and gets 7. Pausing lets it load ahead.',
  path: hpath([N.tv(), N.wifi(), N.net('bad', '7 Mbps'), N.prov(), N.ch('ok', '', 'Movie')], ['ok', 'slow', 'ok', 'ok']),
  keys: KEYS('Pause and load ahead'),
})}`, 'Movies and episodes get the same card; the last node reads Movie. A film can wait, so the best action is to pause and fill the buffer (the card then counts what\'s loaded); the 1080p copy is in Details.', { group: 'While it loads' });

// =====================================================================================================================
// 2. WHEN IT STOPS (SPEC 5): the failure cards, now with the cause. Focused lists, as today's FailedCard.
// =====================================================================================================================
page('fail-channel-off.html', 'Stopped: the channel is off', `${video('studio', 'studio')}${fcard({
  title: 'This channel is off at your provider', sub: 'Your provider answered, but isn\'t sending anything on CNN International.',
  path: hpath([N.tv(), N.wifi(), N.net(), N.prov(), N.ch('bad', 'Nothing sent')], ['ok', 'ok', 'ok', 'cut']),
  rows: frow('chevR', 'Next channel', '116 · BBC News', { f: 1 }) + frow('refresh', 'Try again', ''),
})}${hint([['OK', 'Choose'], ['▲ ▼', 'Move'], ['Back', 'Close']])}`,
  'A 404 twice in a row while the provider\'s own server answers: the channel is down at their end. Replaces "This channel stopped · The provider may be down".', { group: 'When it stops' });

page('fail-game-feed.html', 'Stopped: a game feed is off', `${video('arena2', 'arena')}${fcard({
  title: 'This feed is off at your provider', sub: 'Grizzlies at Jazz is also on these channels.',
  path: hpath([N.tv(), N.wifi(), N.net(), N.prov(), N.ch('bad', 'Nothing sent')], ['ok', 'ok', 'ok', 'cut']),
  rows: frow('', 'US: ESPN HD', 'Feed 2 of 3 · HD · Best match', { f: 1, live: 1, logo: 'ES' }) + frow('', 'NBA TV', 'Feed 3 of 3 · HD', { live: 1, logo: 'NBA' }) + frow('refresh', 'Try this feed again', ''),
})}${hint([['OK', 'Choose'], ['▲ ▼', 'Move'], ['Back', 'Close']])}`,
  'A game channel: the other feeds first, as today, one OK away; each keeps its own score delay. No score or clock on the card.', { group: 'When it stops', shield: true });

page('fail-decoder.html', 'Stopped: the TV can\'t decode it', `${video('studio', 'studio')}${fcard({
  title: 'This TV can\'t play this channel\'s picture', sub: 'It\'s sent as 4K HEVC at 100 fps, more than this TV can decode. Not your internet or provider.',
  path: hpath([N.tv('bad', 'Can\'t decode'), N.wifi(), N.net(), N.prov(), N.ch()], ['ok', 'ok', 'ok', 'ok']),
  rows: frow('lower', 'Watch the HD copy', 'Sky Sports Main Event HD · 1080p', { f: 1 }) + frow('chevR', 'Next channel', '403 · Sky Sports Football'),
})}${hint([['OK', 'Choose'], ['▲ ▼', 'Move'], ['Back', 'Close']])}`,
  'A decoder error: the only cause on the TV itself, said plainly so nobody restarts the router. The provider\'s other copy first.', { group: 'When it stops' });

// =====================================================================================================================
// 3. WHEN YOU'RE CURIOUS (SPEC 6, 7): Options > Connection, the Connection panel, Account > Check the connection
// =====================================================================================================================
page('opt-connection.html', 'Options: the Connection row', `${video('pitch', 'pitch')}<div class="nv-panel left" style="width:340px"><div class="nv-h">Options</div>
  ${orow('cc', 'Subtitles', '', 'Off')}${orow('audio', 'Audio', '', 'English')}${orow('pic', 'Picture size', 'This channel', 'Zoom')}${orow('quality', 'Quality', '1920 × 1080 · 50 fps', '1080p')}${orow('signal', 'Connection', 'Steady · needs 12 Mbps', 'Good', { f: 1 })}${orow('starO', 'Favourite this channel', '', '')}</div>${hint([['OK', 'Open'], ['▲ ▼', 'Move'], ['Back', 'Close']])}`,
  '◀ in the player. Connection sits under Quality; its value is the live verdict (Good, Slow, Weak Wi-Fi, Offline, Checking…) and its line the one number that matters.', { group: 'When you\'re curious' });

page('opt-panel-good.html', 'The Connection panel: all good', `${video('pitch', 'pitch')}<div class="nv-panel left dg-panel"><div class="nv-h">Connection<span class="dg-at">Checked 01:52</span></div>
  <div class="dg-ver"><b>All good</b><span>This channel needs 12 Mbps and your internet does 48, so there's room.</span></div>
  ${vpath([[...N.tv('ok', 'Plays up to 4K HDR'), '14 s ahead'], [...N.wifi('ok', 'Strong signal'), '3 of 4 bars'], [...N.net('ok', 'Answers in 38 ms'), '48 Mbps'], [...N.prov('ok', 'Answers in 240 ms · 1 of 2 streams in use'), ''], [...N.ch('ok', 'Arriving steadily'), '12 Mbps']], ['ok', 'ok', 'ok', 'ok'])}
  <div class="dg-acts">${prow('refresh', 'Check again', 'Includes a 3 s speed test', { f: 1 })}</div></div>${hint([['OK', 'Check again'], ['Back', 'Options']])}`,
  'Options > Connection: the same five links, upright, each with its reading. Opening it runs the quick checks (under 2 s); the speed test only on Check again.', { group: 'When you\'re curious' });

page('opt-panel-slow.html', 'The Connection panel: during the stall', `${video('arena', 'arena')}<div class="nv-panel left dg-panel"><div class="nv-h">Connection<span class="dg-at">Checked 01:52</span></div>
  <div class="dg-ver"><b>Your provider is slow with this channel</b><span>Your internet has room. 3 pauses in the last 5 min.</span></div>
  ${vpath([[...N.tv('ok', 'Only 1 s loaded ahead'), '1 s ahead'], [...N.wifi('ok', 'Strong signal'), '3 of 4 bars'], [...N.net('ok', 'Answers in 38 ms'), '48 Mbps'], [...N.prov('ok', 'Answers in 310 ms · 1 of 2 streams in use'), ''], [...N.ch('bad', 'Arriving at 3 of the 9 Mbps it needs'), '3 Mbps']], ['ok', 'ok', 'ok', 'slow'])}
  <div class="dg-acts">${prow('tv', 'Same game on ESPN', 'Feed 2 of 3 · HD', { f: 1 })}${prow('swap', 'Try the other stream type', 'Transport stream instead of HLS')}</div></div>${hint([['OK', 'Same game on ESPN'], ['▲ ▼', 'Move'], ['Back', 'Close']])}`,
  'Hold OK on the card (or Options > Connection) during the stall: every reading, then every action in order, the best one focused. No score; the game is named only by its feed.', { group: 'When you\'re curious', shield: true });

// ---- Account (web): Provider, the new row, the check sheet ----
function topbar(sel) {
  const tabs = [['search', 'Search'], ['home', 'Home'], ['live', 'Live'], ['nba', 'NBA'], ['movie', 'Movies'], ['series', 'Series'], ['saved', 'Saved']];
  return `<div class="topbar" data-row="topbar"><img src="../../../app/tv/brand/assets/mark-small.svg" class="mk" alt=""><div class="tabs">${tabs.map(([k, l]) => `<span class="tab${k === 'search' ? ' srch' : ''}${k === sel ? ' sel' : ''}">${k === 'search' ? ic('search') : ''}${l}</span>`).join('')}</div><div class="tb-r"><span class="avatar">${ic('user')}</span></div></div>`;
}
const more = (v) => `${esc(v)} ${ic('chevR', 'sm')}`;
const arow = (t, v, sub = '', f = false) => `<div class="arow${f ? ' f-ring' : ''}"><span class="grow" style="min-width:0">${t}${sub ? `<div class="t-cap" style="margin-top:0">${sub}</div>` : ''}</span><span class="av">${v}</span></div>`;
const GROUPS = ['Provider', 'Playback', 'Sound', 'NBA', 'Languages', 'Home rows', 'Updates', 'About'];
function account(focusCheck) {
  const side = GROUPS.map((l, i) => `<div class="gl${i === 0 ? ' sel' : ''}">${l}</div>`).join('');
  return `${topbar('')}<div class="abs" style="left:48px;top:90px;width:200px">${side}</div><div class="abs" style="left:260px;top:84px;width:664px;height:435px;padding:6px 12px;box-sizing:border-box"><div class="inner">
  <div class="t-title" style="margin-bottom:10px">Provider</div>
  ${arow('line.provider.tv', `<span class="pill-ok">${ic('check', 'sm')}Active</span>`, 'Expires 19 Nov 2026 · 23 days left')}
  ${arow('Connections', '1 of 2 in use')}
  ${arow('Switch account', more('Holiday'))}
  ${arow('Check the guide', more('NBA League Pass 4'), 'What your provider sends for the last channel you watched')}
  ${arow('Check the connection', more('Run'), 'Tests your Wi-Fi, internet and provider, and how fast a channel arrives', focusCheck)}
  ${arow('Refresh channels and guide', 'Updated 20:12')}
  </div></div>`;
}
page('acct-provider.html', 'Account: Check the connection', account(true),
  'Account > Provider gets one row under Check the guide. The same test as the player\'s panel, from the sofa, without a channel stalling.', { group: 'When you\'re curious' });

function sheet(inner) { return `${account(false)}<div class="scrim"></div><div class="sheet dg-sheet"><h3>Connection check</h3><div class="dg-sub">This TV, your internet and your provider · about 10 s</div>${inner}</div>`; }
const okIc = `<span class="dg-tick" style="width:22px;height:22px"><svg viewBox="0 0 24 24" style="width:13px;height:13px">${P.check}</svg></span>`;
page('acct-check-running.html', 'The check, running', sheet(`${vpath([
  [...N.tv('ok', 'Plays up to 4K HDR, HEVC and AV1'), ''],
  [...N.wifi('ok', 'Strong signal · 3 of 4 bars'), ''],
  [...N.net('run', 'Testing the speed…'), ''],
  [...N.prov('off', 'Waiting'), ''],
  [...N.ch('off', 'NBA League Pass 4 · waiting', 'Last channel'), ''],
], ['ok', 'run', 'off', 'off'], { fx: 1 })}<div class="sheet-foot"><span class="dg-wait">Checking…</span><span class="t-cap">Back stops</span></div>`),
  'OK on the row: the five links checked in order, about 10 s in all. Nothing to press while it runs; Back stops it.', { group: 'When you\'re curious' });

page('acct-check-done.html', 'The check: all good', sheet(`${vpath([
  [...N.tv('ok', 'Plays up to 4K HDR, HEVC and AV1'), ''],
  [...N.wifi('ok', 'Strong signal · 3 of 4 bars'), ''],
  [...N.net('ok', 'Answers in 38 ms'), '52 Mbps'],
  [...N.prov('ok', 'Answers in 240 ms · active until 19 Nov'), '240 ms'],
  [...N.ch('ok', 'NBA League Pass 4 · needs 9 Mbps', 'Last channel'), '9.4 Mbps'],
], ['ok', 'ok', 'ok', 'ok'])}<div class="dg-verdict"><b>Fast enough for 4K channels</b><span>Everything answered quickly. If one channel still stutters, it's that channel at your provider.</span></div><div class="sheet-foot"><span class="btn sm f">${ic('refresh', 'sm')}Run again</span><span class="t-cap">Back closes</span></div>`),
  'The result in one line, in what it means for him (4K, HD), over the readings. The last channel is sampled for 5 s only if a stream is free.', { group: 'When you\'re curious' });

page('acct-check-wifi.html', 'The check: Wi-Fi is the weak link', sheet(`${vpath([
  [...N.tv('ok', 'Plays up to 4K HDR, HEVC and AV1'), ''],
  [...N.wifi('bad', 'Weak signal · 1 of 4 bars', 'wifiWeak'), ''],
  [...N.net('ok', 'Answers in 41 ms'), '14 Mbps'],
  [...N.prov('ok', 'Answers in 250 ms · active until 19 Nov'), '250 ms'],
  [...N.ch('ok', 'NBA League Pass 4 · needs 9 Mbps', 'Last channel'), '9.1 Mbps'],
], ['slow', 'ok', 'ok', 'ok'])}<div class="dg-verdict"><b>Enough for HD, not for 4K</b><span>The Wi-Fi is the weak link. A network cable, or the router closer, gives the TV its full speed.</span></div><div class="sheet-foot"><span class="btn sm f">${ic('refresh', 'sm')}Run again</span><span class="t-cap">Back closes</span></div>`),
  'A finding: the speed is only as good as the Wi-Fi gives it. The advice is the one thing that fixes it for good, in plain words.', { group: 'When you\'re curious' });

fs.writeFileSync(path.join(root, 'tools', 'pages.json'), JSON.stringify(pages, null, 1));
console.log(`wrote ${pages.length} mocks`);
