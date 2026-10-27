// node tools/build.js   -> writes the diagnosis mocks (*.html) next to SPEC.md, and tools/pages.json.
// Every mock is the 960 x 540 canvas linking the app's real CSS (tokens, ui.css, app.css) plus diagnosis.css
// (as design/ui-v1/catchup/tools/build.js). Focus is marked with the kit classes: .f (ring + lift), .f-ring, .f-in, and
// .nv-row.f (the native panels' inset ring). The stall cards and the chips take no focus (the action chip's model).
// Scenario (SPEC 0): the owner's TV, Tue 27 Oct 2026, 01:52 Reykjavik time (UTC). Grizzlies at Jazz is live on NBA
// League Pass 4 (also on ESPN HD and NBA TV); shield: My team. Live channels play the provider's MPEG-TS link (no HLS
// levels). Channels, bitrates, speeds and timings are illustrative.
// v1.1 (REVIEW-independent.md): problem badge "!", ticks only where a check proved it (data-proof), .ts-real actions,
// ◀ Details (Hold OK stays Last channel), the refill puck, the limit back-off, VOD "enough for", new causes.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
global.window = global; require('../../kit/art.js');
const Art = global.Art;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- icons (app/tv/js/util.js names where they exist; the path's are new: SPEC 2.3) ----------
const P = {
  chevR: '<path d="M9 5l7 7-7 7"/>', search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5"/>', pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17.5 10.2a2.4 2.4 0 1 0 0 3.6"/>',
  audio: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  pic: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 9.5V8h2M17 14.5V16h-2"/>',
  quality: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 15V9M7 12h3.5M10.5 9v6M14 9v6h1.5a3 3 0 0 0 0-6z"/>',
  starO: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', bang: '<path d="M12 5v8.5"/><circle cx="12" cy="18.6" r="2" stroke="none"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" stroke-width="2.4"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  wifi: '<path d="M2.6 9.2a14 14 0 0 1 18.8 0M5.6 12.5a9.6 9.6 0 0 1 12.8 0M8.7 15.8a5 5 0 0 1 6.6 0"/><circle cx="12" cy="19.2" r="1.4" fill="currentColor" stroke="none"/>',
  wifiWeak: '<path d="M2.6 9.2a14 14 0 0 1 18.8 0M5.6 12.5a9.6 9.6 0 0 1 12.8 0" opacity=".3"/><path d="M8.7 15.8a5 5 0 0 1 6.6 0"/><circle cx="12" cy="19.2" r="1.4" fill="currentColor" stroke="none"/>',
  wifiOff: '<path d="M2.6 9.2a14 14 0 0 1 18.8 0M5.6 12.5a9.6 9.6 0 0 1 12.8 0M8.7 15.8a5 5 0 0 1 6.6 0" opacity=".3"/><path d="M4 4l16 16"/>',
  cable: '<path d="M9 3v4.5M15 3v4.5M6.5 7.5h11v3.5a5.5 5.5 0 0 1-11 0zM12 16.5V21"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z"/>',
  server: '<rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/><path d="M8 7.5h.01M8 16.5h.01" stroke-width="3"/>',
  stream: '<circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.4 5.4a9.3 9.3 0 0 0 0 13.2M18.6 5.4a9.3 9.3 0 0 1 0 13.2"/>',
  signal: '<path d="M5 19v-3M10 19v-6.5M15 19V9M20 19V5" stroke-width="2.6"/>',
  spin: '<path d="M12 3a9 9 0 1 0 9 9"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
const TICK = `<i><svg viewBox="0 0 24 24">${P.check}</svg></i>`, BANG = `<i class="bang"><svg viewBox="0 0 24 24">${P.bang}</svg></i>`;
const liveP = (c) => `<span class="a-live${c ? ' compact' : ''}">Live</span>`;
const kbd = (k) => `<span class="kbd">${k}</span>`;

// ---------- the path (SPEC 2.3). A node: [icon, label, state, reading, value?, proof?]. state: ok (tick, needs a proof:
// the check that showed it fine, SPEC 4.3), bad ("!"), off (not judged: past the problem, or not checked), run (being checked).
// Links: ok, slow (dashed), cut, off (dotted), run (pink progress). The audit's TICK check reads data-proof (SPEC 12).
const disc = (icon, st) => `<span class="dg-c">${ic(icon)}${st === 'ok' ? TICK : st === 'bad' ? BANG : ''}</span>`;
const attrs = (st, pf) => (st === 'ok' ? ` data-proof="${pf || ''}"` : '');
function hpath(nodes, links) {
  return `<div class="dg-path">${nodes.map(([icon, label, st, r, , pf], i) => `${i ? `<span class="dg-l ${links[i - 1]}"></span>` : ''}<div class="dg-n ${st}"${attrs(st, pf)}>${disc(icon, st)}<b>${label}</b>${r ? `<small>${r}</small>` : ''}</div>`).join('')}</div>`;
}
function vpath(nodes, links, { fx = false } = {}) {
  return `<div class="dg-vpath${fx ? ' fx' : ''}">${nodes.map(([icon, label, st, r, v, pf], i) => `<div class="dg-vn ${st}${i && links[i - 1] !== 'ok' ? ' in-' + links[i - 1] : ''}"${attrs(st, pf)}>${disc(icon, st)}<div class="tx"><b>${label}</b>${r ? `<small>${r}</small>` : ''}</div>${v ? `<span class="v">${v}</span>` : ''}</div>`).join('')}</div>`;
}
// default proofs (SPEC 4.3): what makes each tick true
const PF = { tv: 'frames', wifi: 'link', cable: 'link', net: 'probe-204', prov: 'stream-host', ch: 'arrival', bytes: 'stream-bytes' };
const N = {
  tv: (st = 'ok', r = '', v = '', pf = PF.tv) => ['tv', 'TV', st, r, v, pf],
  wifi: (st = 'ok', r = '', icon = 'wifi', v = '', pf = PF.wifi) => [icon, 'Wi-Fi', st, r, v, pf],
  cable: (st = 'ok', r = '', v = '', pf = PF.cable) => ['cable', 'Cable', st, r, v, pf],
  net: (st = 'ok', r = '', v = '', pf = PF.net) => ['globe', 'Internet', st, r, v, pf],
  prov: (st = 'ok', r = '', v = '', pf = PF.prov) => ['server', 'Provider', st, r, v, pf],
  ch: (st = 'ok', r = '', l = 'Channel', v = '', pf = PF.ch) => ['stream', l, st, r, v, pf],
};
// the stall card: no focus; OK = its one action, ◀ = Details (Options, Connection first), Back hides (SPEC 2.2)
function card({ spin = true, title, sub, path, keys = [], right = 'Back hides', foot = '' }) {
  return `<div class="nv-card dg-card"><div class="dg-head">${spin ? ic('spin', 'sp') : ''}<div class="tx"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div></div>
  ${path}${foot}
  ${keys.length || right ? `<div class="dg-keys">${keys.map(([k, t, main]) => `<span>${kbd(k)}${main ? `<b>${t}</b>` : t}</span>`).join('')}${right ? `<span class="r">${right}</span>` : ''}</div>` : ''}</div>`;
}
const KEYS = (main) => [['OK', main, 1], ['◀', 'Details']];
// the failure card: a focused list (today's FailedCard, SPEC 5)
const frow = (icon, a, b, { f = false, live = false, logo = '' } = {}) => `<div class="nv-row${f ? ' f' : ''}" style="height:52px">${logo ? `<span class="logo sm" style="width:40px;height:30px;flex:none">${logo}</span>` : `<span class="ico">${ic(icon, 'sm')}</span>`}<div class="grow"><div class="a">${a}</div>${b ? `<div class="b">${b}</div>` : ''}</div>${live ? liveP(1) : ''}</div>`;
function fcard({ title, sub, path, rows, foot = 'Back closes' }) {
  return `<div class="nv-card dg-card" style="gap:10px;padding:16px 16px 12px"><div class="dg-head" style="padding:0 4px"><div class="tx"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div></div>
  <div style="padding:0 4px">${path}</div><div>${rows}</div><div class="t-cap" style="padding:0 6px">${foot}</div></div>`;
}

// ---------- the player shell ----------
const video = (seed, style) => `<div class="vid"><div class="art">${Art.art(seed, style ? { style, hue: 28 } : {})}</div></div>`;
const hint = (items) => `<div class="nv-hint">${items.map(([k, t]) => `<span><span class="kbd">${k}</span>${t}</span>`).join('')}</div>`;
const orow = (i0, t, s, v, { f = false } = {}) => `<div class="nv-row g${f ? ' f' : ''}"><span class="ico">${ic(i0, 'sm')}</span><div class="grow"><div class="a">${t}</div>${s ? `<div class="b">${s}</div>` : ''}</div>${v ? `<span class="v">${v}${ic('chevR', 'sm')}</span>` : ''}</div>`;
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
const G1 = 'While it loads', G2 = 'When it stops', G3 = 'When you\'re curious';

// =====================================================================================================================
// 1. WHILE IT LOADS (SPEC 3)
// =====================================================================================================================
// the refill ring: how much of the 6 s of picture the player waits for is loaded (M9 + engineering's 6 s rebuffer)
const fill = (fr) => { const r = 12, cc = 2 * Math.PI * r; return `<svg class="dg-fill" viewBox="0 0 32 32"><circle cx="16" cy="16" r="${r}" fill="none" stroke="#3D3B45" stroke-width="3.5"/><circle cx="16" cy="16" r="${r}" fill="none" stroke="#F95BAC" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${cc.toFixed(1)}" stroke-dashoffset="${(cc * (1 - fr)).toFixed(1)}" transform="rotate(-90 16 16)"/></svg>`; };
page('stall-puck.html', 'A routine stall: the puck refills', `${video('arena', 'arena')}<div class="dg-puck">${fill(0.62)}</div>`,
  'v1.1 (M9): the player waits for 6 s of picture after every stall, so most .ts hiccups freeze for 6 s. While it\'s refilling at full speed the puck fills toward it (here 3.7 of 6 s); no card, no words.', { group: G1 });

page('stall-checking.html', 'Not recovering: checking', `${video('pitch', 'pitch')}${card({
  title: 'Still loading', sub: 'Checking your Wi-Fi, internet and provider…',
  path: hpath([N.tv(), N.wifi(), N.net('run'), N.prov('off'), N.ch('off')], ['ok', 'run', 'off', 'off']),
  keys: [['▲ ▼', 'Zap']],
})}`, 'The card opens only when the refill is too slow to finish in time (SPEC 3.1). Each link fills with the pink progress as its check answers. ▲▼ Zap says he isn\'t stuck.', { group: G1 });

page('stall-provider-slow.html', 'Cause: the provider is slow', `${video('arena', 'arena')}${card({
  title: 'Your provider is slow with this channel', sub: 'Your Wi-Fi and internet are fine. It\'s their server, or the way to it.',
  path: hpath([N.tv(), N.wifi(), N.net('ok', 'Fast', '', 'sample'), N.prov(), N.ch('bad', '3 of 9 Mbps')], ['ok', 'ok', 'ok', 'slow']),
  keys: KEYS('Same game on ESPN'),
})}`, 'Not you, them. v1.2: the "!" badge drawn in chalk (N-M1). One pair of numbers (3 of 9 Mbps); the internet just reads Fast (S2: the test can\'t see past about 60 Mbps). OK switches to the game\'s other feed, which keeps its own score delay. No score anywhere.', { group: G1, shield: true });

page('stall-wifi-weak.html', 'Cause: weak Wi-Fi', `${video('pitch', 'pitch')}${card({
  title: 'Your Wi-Fi is weak', sub: 'This channel needs 12 Mbps. Over this Wi-Fi it\'s getting 4.',
  path: hpath([N.tv(), N.wifi('bad', '1 of 4 bars', 'wifiWeak'), N.net('off'), N.prov('off'), N.ch('off')], ['slow', 'off', 'off', 'off']),
  keys: KEYS('Watch the HD copy'),
})}`, 'v1.1 (M3, S6): blamed on the Wi-Fi only when the bars, the TV\'s link speed and the speed test agree. Nothing past the bottleneck is ticked: it can\'t be judged. OK plays the provider\'s HD copy (live .ts has no 720p level).', { group: G1 });

page('stall-internet-slow.html', 'Cause: slow internet', `${video('studio', 'studio')}${card({
  title: 'Your internet is too slow for 4K', sub: 'This 4K channel needs 25 Mbps. Your internet gives 11 right now.',
  path: hpath([N.tv(), N.cable(), N.net('bad', '11 Mbps'), N.prov('off'), N.ch('off')], ['ok', 'slow', 'off', 'off']),
  keys: KEYS('Watch the HD copy'),
})}`, 'On a network cable, so it isn\'t Wi-Fi; the speed test (plus what the stream got in the same 3 s, S1) says the line is short. OK plays the HD copy (needs 9 Mbps).', { group: G1 });

page('stall-home-slow.html', 'Cause: home network or line, can\'t split', `${video('pitch', 'pitch')}${card({
  title: 'Your connection at home is too slow', sub: 'This channel needs 12 Mbps and gets 5. The Wi-Fi signal is strong.',
  path: hpath([N.tv(), N.wifi('bad', 'Strong, but slow'), N.net('bad', '5 Mbps'), N.prov('off'), N.ch('off')], ['slow', 'slow', 'off', 'off']),
  keys: KEYS('Watch the HD copy'),
})}`, 'v1.1 (M3): strong bars and a fast Wi-Fi link, but a slow test: busy airwaves or the line itself, which a TV can\'t tell apart. Both links get the "!"; Details says how a cable would tell (SPEC 4.1 C3h).', { group: G1 });

page('stall-offline-chip.html', 'Wi-Fi dropped, picture still playing', `${video('pitch', 'pitch')}<div class="nv-chip dg-chip"><div class="dg-gl">${ic('wifiOff')}</div><div class="grow"><b>The Wi-Fi dropped</b><span>Playing what's loaded</span></div></div>`,
  'v1.1 (S15): the network went but there\'s still picture in hand. A chip, no action, no countdown; it goes when the network\'s back, and turns into the card only if the picture actually stops.', { group: G1 });

page('stall-offline.html', 'Cause: the TV is offline', `${video('pitch', 'pitch')}${card({
  spin: false, title: 'Your TV is offline', sub: 'The Wi-Fi dropped. airglow carries on by itself when it\'s back.',
  path: hpath([N.tv(), N.wifi('bad', 'Not connected', 'wifiOff'), N.net('off'), N.prov('off'), N.ch('off')], ['cut', 'off', 'off', 'off']),
  keys: KEYS('Network settings'),
})}`, 'The picture has stopped and Android says there is no network: no checks. It tunes again once the network has been back and working for 2 s (S8).', { group: G1 });

page('stall-provider-down.html', 'Cause: the provider isn\'t answering', `${video('arena', 'arena')}${card({
  title: 'Your provider isn\'t answering', sub: 'Your internet works. Their server hasn\'t answered for 20 s.',
  path: hpath([N.tv(), N.wifi(), N.net(), N.prov('bad', 'No answer'), N.ch('off')], ['ok', 'ok', 'cut', 'off']),
  keys: [['OK', 'Try again now', 1], ['◀', 'Details']], right: 'Next try in 8 s',
})}`, 'v1.1 (M1, M2): "Provider" is the server the stream really comes from (after redirects). Only that server failing its own check, with the Wi-Fi fine, makes this card; a timeout on weak Wi-Fi is the Wi-Fi card.', { group: G1, shield: true });

page('stall-no-internet.html', 'Cause: the internet line is down', `${video('pitch', 'pitch')}${card({
  title: 'Your internet isn\'t working', sub: 'Your router answers, but nothing gets past it. Restart it.',
  path: hpath([N.tv(), N.wifi('ok', '', 'wifi', '', 'gateway'), N.net('bad', 'No answer'), N.prov('off'), N.ch('off')], ['ok', 'cut', 'off', 'off']),
  keys: [['OK', 'Try again now', 1], ['◀', 'Details']], right: 'Next try in 8 s',
})}`, 'v1.2 (N-M3, N-M4, S-N5): both internet checks get no answer at all, the stream server neither, but the router does: it\'s the line. Above the Wi-Fi rows, so an outage never reads as weak Wi-Fi. No router answer: "The TV can\'t reach your router", Wi-Fi cut.', { group: G1 });

page('stall-moment.html', 'Cause: everything looks fine', `${video('studio', 'studio')}${card({
  title: 'This channel stopped for a moment', sub: 'Your internet and your provider look fine. Reconnecting.',
  path: hpath([N.tv(), N.wifi(), N.net(), N.prov(), N.ch('run')], ['ok', 'ok', 'ok', 'run']),
  keys: [['OK', 'Try again now', 1], ['◀', 'Details']], right: 'Try 1 of 6',
})}`, 'v1.2 (nit): every check passed and the stream still stopped. The Channel is being re-checked (no tick: it isn\'t arriving), so the TICK audit covers C10 now.', { group: G1 });

page('stall-limit.html', 'Cause: this TV\'s last stream still counted', `${video('arena2', 'arena')}${card({
  title: 'Your provider allows 2 streams', sub: 'One is this TV\'s last channel, which clears within a minute.',
  path: hpath([N.tv(), N.wifi(), N.net(), N.prov('bad', '2 of 2 in use'), N.ch('off')], ['ok', 'ok', 'ok', 'off']),
  keys: [['OK', 'Try again now', 1], ['◀', 'Details']], right: 'Next try in 10 s',
})}`, 'v1.2 (N-M2): only with evidence of a limit (the account shows 2 of 2 in use, or the provider says so); the title takes the real maximum. Within 60 s of a zap one of them is this TV\'s last channel: it backs off 10, 20, 30 s.', { group: G1, shield: true });

const ring = (sec, total = 8) => { const r = 15, cc = 2 * Math.PI * r, off = cc * (1 - sec / total); return `<svg width="40" height="40" viewBox="0 0 40 40" style="flex:none"><circle cx="20" cy="20" r="${r}" fill="none" stroke="#3D3B45" stroke-width="4"/><circle cx="20" cy="20" r="${r}" fill="none" stroke="#F95BAC" stroke-width="4" stroke-dasharray="${cc.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 20 20)"/></svg>`; };
page('stall-stutter.html', 'Keeps pausing: the chip', `${video('pitch', 'pitch')}<div class="nv-chip dg-chip">${ring(6)}<div class="grow"><b>This keeps pausing</b><span>Weak Wi-Fi for this channel</span></div>${kbd('OK')}<span class="t-cap" style="color:var(--a-text-1);white-space:nowrap">HD copy</span></div>${hint([['OK', 'Watch the HD copy'], ['◀ ▼', 'Details'], ['Back', 'Dismiss'], ['▲ ▼', 'Zap']])}`,
  'The kit\'s chip (8 s, max 420), one line of cause. v1.2 (N-M9): while a chip shows, Options keeps Sync score first, so ◀ OK OK still syncs; Details is ◀ ▼ OK.', { group: G1 });

page('stall-vod.html', 'A movie: slow internet', `${video('coast')}${card({
  title: 'Your internet is slow for this movie', sub: 'It needs 16 Mbps and gets 7. Pausing lets it load ahead.',
  path: hpath([N.tv(), N.wifi(), N.net('bad', '7 Mbps'), N.prov('off'), N.ch('off', '', 'Movie')], ['ok', 'slow', 'off', 'off']),
  keys: KEYS('Pause and load ahead'),
})}`, 'Movies and episodes: the last node reads Movie. A film can wait, so the best action is to pause and load ahead (next mock). With the controls up, OK stays play/pause and the card shows no keys (S13).', { group: G1 });

page('stall-vod-loading.html', 'A movie: loading ahead', `${video('coast')}${card({
  spin: false, title: 'Loading ahead', sub: '3:10 loaded. Enough to watch about 6 minutes without a pause.',
  path: '', foot: '<div class="dg-load"><i style="width:47%"></i></div>',
  keys: [['OK', 'Play', 1]], right: 'Enough for the rest in about 8 min',
})}`, 'v1.1 (M10): paused by this action, the player lets the buffer grow far past its usual 50 s (to disk). The line says what the loaded part is worth, not just its length: loaded ÷ (1 − 7/16).', { group: G1 });

// =====================================================================================================================
// 2. WHEN IT STOPS (SPEC 5)
// =====================================================================================================================
page('fail-channel-off.html', 'Stopped: the channel is off', `${video('studio', 'studio')}${fcard({
  title: 'This channel is off at your provider', sub: 'Their server answered, but sends nothing on CNN International.',
  path: hpath([N.tv(), N.wifi(), N.net(), N.prov(), N.ch('bad', 'Nothing sent')], ['ok', 'ok', 'ok', 'cut']),
  rows: frow('chevR', 'Next channel', '116 · BBC News', { f: 1 }) + frow('list', 'Refresh channels', 'Your provider may have moved it') + frow('refresh', 'Try again', ''),
})}${hint([['OK', 'Choose'], ['▲ ▼', 'Move'], ['Back', 'Close']])}`,
  'v1.1 (S5): a 404 twice while the stream\'s own server answers. A stale channel list is a common reason on Xtream, so Refresh channels is one row down.', { group: G2 });

page('fail-game-feed.html', 'Stopped: a game feed is off', `${video('arena2', 'arena')}${fcard({
  title: 'This feed is off at your provider', sub: 'Grizzlies at Jazz is also on these channels.',
  path: hpath([N.tv(), N.wifi(), N.net(), N.prov(), N.ch('bad', 'Nothing sent')], ['ok', 'ok', 'ok', 'cut']),
  rows: frow('', 'ESPN HD', 'Feed 2 of 3 · HD · Best match', { f: 1, live: 1, logo: 'ES' }) + frow('', 'NBA TV', 'Feed 3 of 3 · HD', { live: 1, logo: 'NBA' }) + frow('refresh', 'Try this feed again', ''),
})}${hint([['OK', 'Choose'], ['▲ ▼', 'Move'], ['Back', 'Close']])}`,
  'A game channel: the other feeds first, one OK away; each keeps its own score delay. No score or clock. v1.1: titles without "US:".', { group: G2, shield: true });

page('fail-decoder.html', 'Stopped: the TV can\'t decode it', `${video('studio', 'studio')}${fcard({
  title: 'This TV can\'t play this channel\'s picture', sub: 'It\'s 4K at a frame rate this TV can\'t play. Not your internet or provider.',
  path: hpath([N.tv('bad', 'Can\'t play it'), N.wifi('ok', '', 'wifi', '', PF.bytes), N.net('ok', '', '', PF.bytes), N.prov('ok', '', '', PF.bytes), N.ch('ok', '', 'Channel', '', PF.bytes)], ['ok', 'ok', 'ok', 'ok']),
  rows: frow('quality', 'Watch the HD copy', 'Sky Sports Main Event HD', { f: 1 }) + frow('chevR', 'Next channel', '403 · Sky Sports Football'),
})}${hint([['OK', 'Choose'], ['▲ ▼', 'Move'], ['Back', 'Close']])}`,
  'v1.1 (M4, S17): only a format beyond the TV (checked against its decoder table), or a decoder that fails twice. The ticks stand: the picture\'s data arrived through every link. No codec names.', { group: G2 });

page('fail-broken.html', 'Stopped: the picture is broken at the source', `${video('studio', 'studio')}${fcard({
  title: 'This channel\'s picture is broken at your provider', sub: 'This TV can play this format, but what arrives is damaged.',
  path: hpath([N.tv('ok', '', '', 'decoders'), N.wifi('ok', '', 'wifi', '', PF.bytes), N.net('ok', '', '', PF.bytes), N.prov('ok', '', '', PF.bytes), N.ch('bad', 'Damaged')], ['ok', 'ok', 'ok', 'ok']),
  rows: frow('quality', 'Watch the HD copy', 'Sky Sports Main Event HD', { f: 1 }) + frow('refresh', 'Try again', ''),
})}${hint([['OK', 'Choose'], ['▲ ▼', 'Move'], ['Back', 'Close']])}`,
  'v1.1 (M4): DECODING_FAILED on a format inside the TV\'s decoder table is the stream, not the TV.', { group: G2 });

// =====================================================================================================================
// 3. WHEN YOU'RE CURIOUS (SPEC 6, 7)
// =====================================================================================================================
page('opt-connection.html', 'Options: the Connection row', `${video('pitch', 'pitch')}<div class="nv-panel left" style="width:340px"><div class="nv-h">Options</div>
  ${orow('cc', 'Subtitles', '', 'Off')}${orow('audio', 'Audio', '', 'English')}${orow('pic', 'Picture size', 'This channel', 'Zoom')}${orow('quality', 'Quality', 'Provider sends one', '1080p')}${orow('signal', 'Connection', 'Steady · about 12 Mbps', 'Good', { f: 1 })}${orow('starO', 'Favourite this channel', '', '')}</div>${hint([['OK', 'Open'], ['▲ ▼', 'Move'], ['Back', 'Close']])}`,
  '◀ in the player, any time. Connection sits under Quality; its value is the live verdict, its line the one number that matters ("about": a .ts stream doesn\'t say its rate, S4).', { group: G3 });

page('opt-during-stall.html', 'Options while the card shows', `${video('arena', 'arena')}<div class="nv-panel left" style="width:340px"><div class="nv-h">Options</div>
  ${orow('signal', 'Connection', 'Your provider is slow', 'Slow', { f: 1 })}${orow('tv', 'Other feeds for this game', 'ESPN HD, NBA TV', '2')}${orow('refresh', 'Sync score', 'Match the game clock', '42 s')}${orow('cc', 'Subtitles', '', 'Off')}${orow('audio', 'Audio', '', 'English')}${orow('pic', 'Picture size', 'This channel', 'Zoom')}</div>${hint([['OK', 'Open'], ['▲ ▼', 'Move'], ['Back', 'Close']])}`,
  'v1.1 (S10): Hold OK stays Last channel. Details is ◀ then OK: while a card or chip shows, Options opens with Connection first and focused, then Other feeds.', { group: G3, shield: true });

page('opt-panel-good.html', 'The Connection panel: all good', `${video('pitch', 'pitch')}<div class="nv-panel left dg-panel"><div class="nv-h">Connection<span class="dg-at">Checked 01:52</span></div>
  <div class="dg-ver"><b>All good</b><span>This channel needs about 12 Mbps. Your internet has plenty of room.</span></div>
  ${vpath([N.tv('ok', 'Plays this channel fine', '14 s ahead'), N.wifi('ok', 'Strong signal', 'wifi', '3 of 4 bars'), N.net('ok', 'Answers in 38 ms', '60+ Mbps', 'sample'), N.prov('ok', 'Answers in 90 ms · 1 of 2 streams in use'), N.ch('ok', 'Arriving steadily', 'Channel', '12 Mbps')], ['ok', 'ok', 'ok', 'ok'])}
  <div class="dg-acts">${prow('refresh', 'Check again', 'Includes a 3 s speed test', { f: 1 })}</div></div>${hint([['OK', 'Check again'], ['Back', 'Options']])}`,
  'Options > Connection. "Checked" is the time of the last check, not of opening. 60+: the test\'s ceiling (S2). Provider is the stream\'s own server (M1).', { group: G3 });

page('opt-panel-slow.html', 'The Connection panel: during the stall', `${video('arena', 'arena')}<div class="nv-panel left dg-panel"><div class="nv-h">Connection<span class="dg-at">Checked 01:52</span></div>
  <div class="dg-ver"><b>Your provider is slow with this channel</b><span>Your Wi-Fi and internet have room. 3 pauses in 5 min.</span></div>
  ${vpath([N.tv('ok', 'Plays this channel fine'), N.wifi('ok', 'Strong signal', 'wifi', '3 of 4 bars'), N.net('ok', 'Answers in 38 ms', '60+ Mbps', 'sample'), N.prov('ok', 'Answers in 310 ms · 1 of 2 streams in use'), N.ch('bad', 'Getting 3 of the 9 Mbps it needs', 'Channel', '1 s ahead')], ['ok', 'ok', 'ok', 'slow'])}
  <div class="dg-acts">${prow('tv', 'Same game on ESPN', 'Feed 2 of 3 · HD')}${prow('refresh', 'Check again', 'Includes a 3 s speed test', { f: 1 })}</div></div>${hint([['OK', 'Check again'], ['▲', 'Same game on ESPN'], ['Back', 'Close']])}`,
  '.ts-real actions only (another feed, another copy, try again). v1.2 (N-M9): the panel always opens on Check again; a feed switch is one ▲ away, never at the end of the ◀ OK OK Sync habit.', { group: G3, shield: true });

// ---- Account (web) ----
function topbar(sel) {
  const tabs = [['search', 'Search'], ['home', 'Home'], ['live', 'Live'], ['nba', 'NBA'], ['movie', 'Movies'], ['series', 'Series'], ['saved', 'Saved']];
  return `<div class="topbar" data-row="topbar"><img src="../../../app/tv/brand/assets/mark-small.svg" class="mk" alt=""><div class="tabs">${tabs.map(([k, l]) => `<span class="tab${k === 'search' ? ' srch' : ''}${k === sel ? ' sel' : ''}">${k === 'search' ? ic('search') : ''}${l}</span>`).join('')}</div><div class="tb-r"><span class="avatar">${ic('user')}</span></div></div>`;
}
const more = (v) => `${esc(v)} ${ic('chevR', 'sm')}`;
const arow = (t, v, sub = '', f = false) => `<div class="arow${f ? ' f-ring' : ''}"><span class="grow" style="min-width:0">${t}${sub ? `<div class="t-cap" style="margin-top:0">${sub}</div>` : ''}</span><span class="av">${v}</span></div>`;
const GROUPS = ['Provider', 'Playback', 'Sound', 'NBA', 'Languages', 'Home rows', 'Updates', 'About'];
// v1.1 (nit): the rows end at x 906, so a focus ring (5 px) stays inside the x 912 safe line. Today's Account page needs the same
function account(focusCheck) {
  const side = GROUPS.map((l, i) => `<div class="gl${i === 0 ? ' sel' : ''}">${l}</div>`).join('');
  return `${topbar('')}<div class="abs" style="left:48px;top:90px;width:200px">${side}</div><div class="abs" style="left:260px;top:84px;width:658px;height:435px;padding:6px 12px;box-sizing:border-box"><div class="inner">
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
  'Account > Provider gets one row under Check the guide. v1.1: the rows end at x 906 so the ring stays inside the safe line.', { group: G3 });

function sheet(inner) { return `${account(false)}<div class="scrim"></div><div class="sheet dg-sheet"><h3>Connection check</h3><div class="dg-sub">This TV, your internet and your provider · about 10 s</div>${inner}</div>`; }
page('acct-check-running.html', 'The check, running', sheet(`${vpath([
  N.tv('ok', 'Plays up to 4K HDR', '', 'decoders'),
  N.wifi('ok', 'Strong signal · 3 of 4 bars'),
  N.net('run', 'Testing the speed…'),
  N.prov('off', 'Waiting'),
  N.ch('off', 'NBA League Pass 4 · waiting', 'Last channel'),
], ['ok', 'run', 'off', 'off'], { fx: 1 })}<div class="sheet-foot"><span class="dg-wait">Checking…</span><span class="t-cap">Back stops</span></div>`),
  'OK on the row: the five links in order, about 10 s. Nothing to press while it runs; Back stops it.', { group: G3 });

page('acct-check-done.html', 'The check: all good', sheet(`${vpath([
  N.tv('ok', 'Plays up to 4K HDR', '', 'decoders'),
  N.wifi('ok', 'Strong signal · 3 of 4 bars'),
  N.net('ok', 'Answers in 38 ms', '60+ Mbps', 'sample'),
  N.prov('ok', 'Account active until 19 Nov', '90 ms'),
  N.ch('ok', 'NBA League Pass 4 · needs about 9', 'Last channel', '9 Mbps'),
], ['ok', 'ok', 'ok', 'ok'])}<div class="dg-verdict"><b>Fast enough for 4K channels</b><span>Everything answered quickly. If one channel still stutters, it's that channel at your provider.</span></div><div class="sheet-foot"><span class="btn sm f">${ic('refresh', 'sm')}Run again</span><span class="t-cap">Back closes</span></div>`),
  'The verdict in what it means for him (4K, HD). The last channel is sampled for 5 s only on a 2+ stream account, and "done" waits until the provider has let the stream go (S14).', { group: G3 });

page('acct-check-wifi.html', 'The check: Wi-Fi is the limit', sheet(`${vpath([
  N.tv('ok', 'Plays up to 4K HDR', '', 'decoders'),
  N.wifi('bad', '1 of 4 bars · link 26 Mbps', 'wifiWeak'),
  N.net('off', 'Gets 14 Mbps through this Wi-Fi'),
  N.prov('ok', 'Account active until 19 Nov', '95 ms'),
  N.ch('ok', 'NBA League Pass 4 · needs about 9', 'Last channel', '9 Mbps', 'arrival'),
], ['slow', 'off', 'ok', 'ok'])}<div class="dg-verdict"><b>Enough for HD, not for 4K</b><span>The Wi-Fi is the limit: the test got most of what it can carry. A cable would show your internet's real speed.</span></div><div class="sheet-foot"><span class="btn sm f">${ic('refresh', 'sm')}Run again</span><span class="t-cap">Back closes</span></div>`),
  'v1.1 (M3): blamed on the Wi-Fi because three readings agree (1 bar, a 26 Mbps link, a 14 Mbps test near it). The internet past it isn\'t judged; the provider and the channel were checked directly.', { group: G3 });

fs.writeFileSync(path.join(root, 'tools', 'pages.json'), JSON.stringify(pages, null, 1));
console.log(`wrote ${pages.length} mocks`);
