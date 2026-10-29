// node tools/build.js : writes the mocks (960 x 540) from one scenario. Then node tools/render.js for the PNGs.
const fs = require('fs'); const path = require('path');
const root = path.resolve(__dirname, '..');
const ART = '../home-final/art/';

// ---- glyphs: the Ui.Icon paths (24 grid, 2 dp stroke, round caps); fill ones carry f ----
const I = {
  play: ['M7 4.5v15l13-7.5z', 1], pause: ['M6 4.5h4v15H6zM14 4.5h4v15h-4z', 1], chevR: ['M9 5l7 7-7 7'], chevL: ['M15 5l-7 7 7 7'],
  cc: ['M3 5h18v14H3zM10.5 10.2a2.4 2.4 0 1 0 0 3.6M17.5 10.2a2.4 2.4 0 1 0 0 3.6'], audio: ['M4 9.5v5h4L13 19V5L8 9.5zM16.5 8.5a5 5 0 0 1 0 7'],
  pic: ['M3 5.5h18v13H3zM7 10V8.5h1.5M17 14v1.5h-1.5'], score: ['M3 5.5h18v13H3zM12 5.5v13M6.5 10h2.5M15 10h2.5M6.5 14h2.5M15 14h2.5'],
  skipBack: ['M5 5h2.6v14H5zM19.5 5.2v13.6L9 12z', 1], skipFwd: ['M4.5 5.2v13.6L15 12z M16.4 5h2.6v14h-2.6z', 1], next: ['M5 5l9 7-9 7zM18 5v14'],
  eyeOff: ['M3 3l18 18M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7a13 13 0 0 1-2.4 3.7M6.4 6.6A13 13 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2'],
  hist: ['M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 4.5V9H8M12 7.5V12l3 2'], refresh: ['M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5'], clock: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3.2 2'],
  quality: ['M3 5h18v14H3zM7 9.5v5M7 12h3.2M10.2 9.5v5M13.5 9.5v5h1.3a2.5 2.5 0 0 0 0-5z'], signal: ['M5 19v-3M10 19v-6.5M15 19V9M20 19V5'], speed: ['M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 13l4-4M12 3v2'],
  frames: ['M3 4h18v16H3zM3 9h18M3 15h18'], check: ['M5 12.5l4.5 4.5L19 7.5'], info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5.5M12 7.8v.2'],
};
const ic = (n, cls = '') => `<svg class="ic${I[n][1] ? ' fill' : ''} ${cls}" viewBox="0 0 24 24"><path d="${I[n][0]}"/></svg>`;
const eye = `<svg class="eye" viewBox="0 0 24 24"><path d="${I.eyeOff[0]}"/></svg>`;
const K = (k) => `<span class="k${k === '⏯' ? ' g' : ''}">${k}</span>`;
const dot = ' · ';

const head = (title) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=960,height=540">
<title>${title}</title>
<link rel="stylesheet" href="../../../app/tv/brand/fonts.css"><link rel="stylesheet" href="../../../app/tv/brand/tokens.css"><link rel="stylesheet" href="player-v2.css">
</head><body><div class="screen">\n`;
const foot = `</div></body></html>\n`;

// ---- pieces ----
const pic = (art, pos = '50% 40%') => `<div class="pv-pic"><img src="${ART}${art}" alt="" style="--pos:${pos}"></div>\n`;
const court = () => `<div class="pv-pic court"><img class="a" src="${ART}mem.png" alt=""><img class="h" src="${ART}por.png" alt=""></div>\n`;
const scrims = (top = true, bottom = 'bar') => `${top ? '<div class="pv-st"></div>' : ''}${bottom === 'bar' ? '<div class="pv-sb"></div>' : bottom === 'hint' ? '<div class="pv-sb sm"></div>' : ''}\n`;
const hint = (pairs) => `<div class="pv-hint">${pairs.map(([k, t]) => `<span>${K(k)}${t}</span>`).join('')}</div>\n`;
const topVod = (o) => `<div class="pv-top">${o.logo ? `<img class="logo" src="${ART}${o.logo}" alt="${o.title}">` : `<h1>${o.title}</h1>`}<div class="sub">${o.sub}</div>${o.what ? `<div class="what"><span class="tick">${ic('check')}</span>${o.what}</div>` : ''}${o.line ? `<div class="line">${o.line}</div>` : ''}</div>\n`;
const topRight = (l1, l2, o = {}) => `<div class="pv-tr">${o.paused ? `<div class="paused">${ic('pause')}Paused</div>` : ''}<b>${o.eye ? eye : ''}${l1}</b>${l2 ? `<span>${l2}</span>` : ''}</div>\n`;
const disc = (icon, o = {}) => `<div class="disc${o.f ? ' f' : ''}${o.l ? ' l' : ''}">${o.lbl ? `<span class="lbl">${o.lbl}</span>` : ''}${icon.length <= 4 && !I[icon] ? icon : ic(icon)}</div>`;
const pill = (text, o = {}) => `<div class="pill${o.icon ? ' ico' : ''}${o.chev ? ' chev' : ''}${o.f ? ' f' : ''}">${o.lbl ? `<span class="lbl">${o.lbl}</span>` : ''}${o.icon ? ic(o.icon) : ''}${text}${o.chev ? ic('chevR') : ''}</div>`;
const btns = (left, right, faded = false) => `<div class="pv-btns${faded ? ' faded' : ''}">${left.join('')}<div class="sp"></div>${right.join('')}</div>\n`;
// the track: played %, thumb focused?, live point %, chapter ticks (%), the ends row
const track = (o) => {
  let t = `<div class="pv-track"><div class="t"></div>`;
  if (o.live != null) t += `<div class="ahead" style="left:${o.live}%;right:0"></div>`;
  t += `<div class="p" style="--p:${o.p}%"></div>`;
  for (const x of o.ticks || []) t += `<div class="tick" style="left:${x}%"></div>`;
  if (o.live != null) t += `<div class="ld" style="left:${o.live}%"></div>`;
  t += `<div class="th${o.f === false ? '' : ' f'}" style="--p:${o.p}%"></div></div>\n`;
  let e = `<div class="pv-ends">`;
  if (o.l) e += `<span class="l">${o.l}</span>`;
  if (o.r) e += `<span class="r">${o.r}</span>`;
  for (const [x, label, on] of o.labels || []) e += `<span class="ch${on ? ' on' : ''}" style="left:${x}%${x === 0 ? ';transform:none' : ''}">${label}</span>`;   // (the first label is clamped to the track's start, as the Java does)
  if (o.live != null) e += `<span class="live" style="left:calc(${o.live}% + 12px)">LIVE</span>`;
  e += `</div>\n`;
  return t + e;
};
const bubble = (x, time, speed) => `<div class="pv-bub" style="left:${x}%"><b>${time}</b>${speed ? `<span>${speed}</span>` : ''}</div>\n`;
const vodRight = (f) => [disc('cc', { f: f === 'cc', lbl: f === 'cc' ? 'Subtitles · Icelandic' : '' }), disc('audio', { f: f === 'audio', lbl: f === 'audio' ? 'Audio · English 5.1' : '' }), disc('pic', { f: f === 'pic', lbl: f === 'pic' ? 'Picture · Fit' : '' })];
const chip = (o) => `<div class="pv-chip${o.skip ? ' skip' : ''}">${o.skip ? ic('skipFwd') : `<div class="ring" style="--deg:${o.deg}%">${ic('next')}</div>`}<div class="tx"><b>${o.b}</b>${o.s ? `<span>${o.s}</span>` : ''}</div>${o.keys ? o.keys : ''}${o.skip ? `<div class="drain"><i style="--p:${o.p}%"></i></div>` : ''}</div>\n`;
const note = (t) => `<div class="a-note">${t}</div>\n`;

const SEV = { logo: 'severance-logo.png', title: 'Severance', sub: `S2 · E3${dot}Who Is Alive?${dot}<span class="tag q">4K</span>`, what: `4K HDR, 5.1${dot}best of 3 copies${dot}Icelandic subtitles` };
const VOD_HINT_THUMB = [['OK', 'Pause'], ['◀ ▶', 'Seek 10 s'], ['▲', 'Buttons'], ['▼', 'Options'], ['Back', 'Hide']];

const pages = [];
const page = (file, title, note_, html) => { pages.push({ file, title, note: note_ }); fs.writeFileSync(path.join(root, file), head(title) + html + foot); };

// 1. a film or episode playing, the controls up (the first second after a press: focus on the thumb)
page('01-vod-playing.html', 'VOD: playing, controls up', 'The bar on the picture, no box: the title block top-left (the title treatment Home shows, the episode, what you’re getting), Ends at top-right; discs and pills over a scrim; the thumb has focus; the hint bar on the same scrim.',
  pic('severance-bg.jpg', '72% 30%') + scrims() + topVod(SEV) + topRight('Ends at 21:02', '21 min left') +
  btns([disc('pause'), disc('−10'), disc('+10'), pill('Next episode', { chev: true })], vodRight()) +
  track({ p: 57, l: '34:10', r: '−25:50' }) + hint(VOD_HINT_THUMB));

// 2. paused
page('02-vod-paused.html', 'VOD: paused', 'OK pauses: the picture rests 35 % darker, the Play glyph comes back, Ends at gives way to a Paused tag and the minutes left (a clock that would drift), one line of the story. The controls never hide while paused; after 2 min they fade to 35 % for the OLED.',
  pic('severance-bg.jpg', '72% 30%') + '<div class="pv-dim"></div>' + scrims() + topVod({ ...SEV, line: 'Mark, Helly, Irving and Dylan search for answers.' }) + topRight('21 min left', 'Ends at 21:02 if you play now', { paused: true }) +
  btns([disc('play'), disc('−10'), disc('+10'), pill('Next episode', { chev: true })], vodRight()) +
  track({ p: 57, l: '34:10', r: '−25:50' }) + hint([['OK', 'Play'], ['◀ ▶', 'Seek 10 s'], ['▲', 'Buttons'], ['▼', 'Options'], ['Back', 'Hide']]));

// 3. scrubbing (◀▶ held): the buttons fade, the bubble and the speed chip take their row
page('03-vod-scrubbing.html', 'VOD: scrubbing', '▶ held: the row fades to 22 %, the bubble (chalk, ink) rides the thumb with the speed chip beside it; the played part follows the thumb; release seeks. No frame thumbnails: the provider’s streams carry no trick-play track (Research).',
  pic('severance-bg.jpg', '72% 30%') + scrims() + topVod(SEV) + topRight('Ends at 21:02', '21 min left') +
  btns([disc('pause'), disc('−10'), disc('+10'), pill('Next episode', { chev: true })], vodRight(), true) +
  bubble(71, '42:30', '▶▶ ×8') + track({ p: 71, l: '42:30', r: '−17:30' }) + hint([['◀ ▶', '10 s, hold for faster'], ['OK', 'Pause'], ['Back', 'Hide']]));

// 4. ▲ on the buttons, inside an intro: the Skip intro pill is the last of the left group; the focused button names itself above
page('04-vod-buttons.html', 'VOD: the buttons, Skip intro', '▲ lands on the Skip intro pill while its window is fresh (skip spec 3.3); ◀ ▶ move along the row, the focused button says what it is above itself (tvOS’s labelled transport bar), so the hint bar can stay short. The Slow Horses wordmark is grey on grey brick (under 3:1 against its own backdrop), so the text title stands in (v1.1 rule).',
  pic('slowhorses-bg.jpg', '60% 30%') + scrims() + topVod({ title: 'Slow Horses', sub: `S6 · E4${dot}Hello Goodbye${dot}<span class="tag q">4K</span>`, what: `4K, 5.1${dot}best of 2 copies${dot}Icelandic subtitles` }) + topRight('Ends at 21:58', '47 min left') +
  btns([disc('pause'), disc('−10'), disc('+10'), pill('Next episode', { chev: true }), pill('Skip intro', { icon: 'skipFwd', f: true, lbl: 'Skip intro · 1:12' })], vodRight()) +
  track({ p: 4, f: false, l: '1:52', r: '−46:08' }) + hint([['OK', 'Skip intro'], ['◀ ▶', 'Move'], ['▼', 'Seek bar'], ['Back', 'Hide']]));

// 5. the credits: Up next counts above the bar; with the controls up its key column is not drawn (skip spec 5.1)
page('05-vod-upnext.html', 'VOD: Up next at the credits', 'The credits started: Up next counts 15 s in its ring above the bar (its keys are not drawn while the controls are up). ▲ lands on Next episode while the card counts (v1.1, the fresh-Skip rule), so ▲ OK plays it; Back stays.',
  pic('severance-bg.jpg', '72% 30%') + scrims() + topVod(SEV) + topRight('Ends at 21:02', '2 min left') +
  chip({ deg: 60, b: 'Next episode in 9 s', s: 'S2 · E4 · Woe’s Hollow' }) +
  btns([disc('pause'), disc('−10'), disc('+10'), pill('Next episode', { chev: true, f: true, lbl: 'Next episode · S2 · E4' })], vodRight()) +
  track({ p: 96, f: false, l: '57:48', r: '−2:12' }) + hint([['OK', 'Next episode'], ['◀ ▶', 'Move'], ['▼', 'Seek bar'], ['Back', 'Hide']]));

// 6. a live channel: the banner (4 s after a zap, or on Info)
const HEAT = { num: '112', ini: 'SC', ch: 'Sky Cinema Action HD', ring: 'Favourites · 3 of 10', pg: 'Heat', l3: `21:00 to 23:50`, p: 58, nx: 'Next 23:50 Collateral', feed: 'Subtitles · Replays 3 days' };
const banner = (b, o = {}) => `<div class="pv-bn"><div class="num">${b.num}</div><div class="tile">${b.img ? `<img src="${ART}${b.img}" alt="">` : b.ini}</div><div class="col"><div class="ch">${b.ch}<small>${b.ring}</small></div><div class="pg">${b.pg}</div><div class="l3">${b.l3}${b.p != null ? `<span class="bar" style="--p:${b.p}%"><i></i></span>` : ''}${b.nx ? `<span class="nx">${b.nx}</span>` : ''}${b.feed ? `<span class="nx">${b.feed}</span>` : ''}</div></div><div class="tags">${o.tags || ''}</div></div>\n`;
const TAGS = `<span class="clk">Wed 22:42</span><span class="tag q">4K</span><span class="tag q">HDR</span><span class="live">LIVE</span>`;
const TAGS_BEHIND = `<span class="clk">Wed 22:42</span><span class="tag q">4K</span><span class="tag q">HDR</span>`;
page('06-live-banner.html', 'Live: the channel banner', 'No box: the same top block as a film. Number · logo · channel and the zap ring, the programme in Outfit 24, its times with the 4 dp progress, what’s next, subtitles and the replay days as words; the clock, 4K, HDR and LIVE at the right (v1.1: three facts, not five lozenges). The first 5 views: the hint bar on a 110 dp scrim. Gone after 4 s.',
  pic('heat-bg.jpg', '50% 30%') + scrims(true, 'hint') + banner(HEAT, { tags: TAGS }) +
  hint([['OK', 'Channels'], ['⏯', 'Pause'], ['◀', 'Options'], ['▶', 'Info'], ['▲ ▼', 'Zap'], ['Hold OK', 'Last']]));

// 7. zapping: the next channel's card at once (the old picture goes dark), its banner already filled from the guide
page('07-live-zap.html', 'Live: zapping', '▲ pressed: the old picture dims at once, the zap card names the next channel and what’s on, the banner is already its (number, name, programme). Gone at the first frame, 600 ms at least.',
  pic('heat-bg.jpg', '50% 30%') + '<div class="pv-dim" style="background:rgba(21,19,29,.7)"></div>' + scrims(true, 'hint') +
  banner({ num: '113', ini: 'SP', ch: 'Sky Sports Main Event HD', ring: 'Favourites · 4 of 10', pg: 'Super Sunday: Liverpool v Arsenal', l3: '21:15 to 23:30', p: 22, nx: 'Next 23:30 Match of the Day' }, { tags: `<span class="clk">Wed 22:42</span><span class="tag q">HD</span><span class="live">LIVE</span>` }) +
  `<div class="pv-zap"><div class="tile">SP</div><div><div class="n">Sky Sports Main Event HD</div><div class="w">Super Sunday: Liverpool v Arsenal</div><div class="k">Connecting…</div></div></div>\n` +
  hint([['OK', 'Channels'], ['◀', 'Options'], ['▶', 'Info'], ['▲ ▼', 'Zap'], ['Hold OK', 'Last']]));

// 8. live TV paused on a kept channel: the timeline map; the live point and LIVE in the ends row
page('08-live-paused.html', 'Live: paused, behind live', '⏯ on a kept channel: the bar becomes the programme (21:00 to 23:50), the live point a red dot with LIVE beside it (the compact pill, inside the ends row) and the part not aired yet dashed; the banner drops its own LIVE (v1.1: one LIVE, where it is true); the picture rests 35 % darker as a paused film does; the corner says how far behind and when you paused (the replay days are already on the banner). Back to live leads the right group.',
  pic('heat-bg.jpg', '50% 30%') + '<div class="pv-dim"></div>' + scrims() + banner(HEAT, { tags: TAGS_BEHIND }) +
  `<div class="pv-tr" style="top:84px"><div class="paused">${ic('pause')}Paused</div><b>2:40 behind live</b><span>Paused at 22:39</span></div>\n` +
  btns([disc('play'), disc('skipBack'), disc('−1m'), disc('+1m')], [pill('Back to live'), disc('cc'), disc('audio'), disc('pic')]) +
  track({ p: 56, live: 58, l: '21:00', r: '23:50' }) + hint([['OK', 'Play'], ['◀ ▶', '10 s, hold for faster'], ['▲', 'Buttons'], ['▼', 'Options'], ['Back', 'Hide']]));

// 9. a game replay under the shield: chapters, Skip to Q3, End hidden, the live point ahead
const GAME = { title: 'Grizzlies at Trail Blazers', sub: `NBA League Pass 4${dot}Thu 29 Oct · late${dot}<span class="tag q">4K</span>` };
const gameTop = () => `<div class="pv-top"><h1>${GAME.title}</h1><div class="sub">${GAME.sub}</div></div>\n`;
const TICKS = [0, 23, 45, 55];   // Tip-off, Q2, Half, Q3: live is in Q3, so Q4 has no tick yet (v1.1)
const LABELS = [[0, 'Tip-off'], [23, 'Q2', true], [45, 'Half'], [55, 'Q3']];
page('09-replay-timeline.html', 'Replay: the timeline, shield on', 'Watch from tip-off while the game is still on: Score hidden and your own position top-right, never the live game’s; chapter ticks only up to the live point (Tip-off, Q2, Half, Q3; Q4 appears when it airs, OT only once played), Q2 lit, End hidden at the right, the live point 66 % along with the dashed part not aired yet. Skip to Q3 names where it goes. No score anywhere.',
  court() + scrims() + gameTop() + topRight('Score hidden', 'You’re in Q2', { eye: true }) +
  btns([disc('pause'), disc('skipBack'), disc('−1m'), disc('+1m'), pill('Skip to Q3', { chev: true })], [pill('Back to live'), disc('score'), disc('cc'), disc('audio'), disc('pic')]) +
  track({ p: 31, live: 66, ticks: TICKS, labels: LABELS, r: `${eye}End hidden` }) +
  hint([['OK', 'Pause'], ['◀ ▶', '10 s, hold for faster'], ['▲', 'Buttons'], ['▼', 'Options'], ['Back', 'Hide']]) + note('The picture is a stand-in for the broadcast.'));

// 10. the game panel in a replay: the score as aired (90 s behind your picture), Quarters with their aired times
page('10-replay-panel.html', 'Replay: the game panel', 'The Game disc or Options › Game panel: the bar hides, the panel shows the score as aired at the moment you’re watching (90 s behind the picture, never ahead), Quarters with their aired times, only the ones aired so far (Q4 hasn’t started live: no row, as the bar has no tick; v1.1), OK jumps there, the one you’re in on surface-2; Plays to the moment, Sync. No box score until the buzzer + 2 min has played.',
  court() + scrims(true) + gameTop() +
  `<div class="pv-panel r"><div class="gp-head"><div class="crest" style="--c:#5D76A9"><img src="${ART}mem.png" alt="MEM"></div><div class="plate">31 – 27</div><div class="crest" style="--c:#E03A3E"><img src="${ART}por.png" alt="POR"></div></div>
  <div class="gp-status">Q2 8:14${dot}as aired</div>
  <div class="gp-tabs"><span class="sel f">Quarters</span><span>Plays</span><span class="act">${ic('refresh', 's16')}Sync</span></div>
  <div class="gp-row">Tip-off<span>02:12</span></div><div class="gp-row cur">Q2<span>now</span></div><div class="gp-row">Halftime<span>03:06</span></div><div class="gp-row">Q3<span>03:24</span></div>
  <div class="gp-foot">OK jumps there. The box score comes after the final buzzer.</div></div>\n` +
  hint([['◀ ▶', 'Tabs'], ['▼', 'Quarters'], ['Back', 'Close']]) + note('The picture is a stand-in for the broadcast.'));

// 11. Options (a film): the same panel, polished tokens
const op = (icon, n, s, v, o = {}) => `<div class="op-row${o.f ? ' f' : ''}${o.dis ? ' dis' : ''}">${ic(icon)}<div class="n"><b>${n}</b>${s ? `<span>${s}</span>` : ''}</div><div class="v">${v}${o.chev === false ? '' : ic('chevR', 's16')}</div></div>`;
page('11-options.html', 'Options (a film)', '▼ from the bar: the controls hide, the panel floats at the left, first row focused (inset ring on surface-3, no scale). Rows name the value at the right; a missing track is a disabled row. Unchanged in behaviour; the tokens and spacing are the new bar’s.',
  pic('severance-bg.jpg', '72% 30%') + '<div class="pv-dim" style="background:rgba(21,19,29,.25)"></div>' + scrims(false, 'hint') +
  `<div class="pv-panel lft"><h2>Options</h2>${op('cc', 'Subtitles', '', 'Icelandic', { f: true })}${op('audio', 'Audio', 'English 5.1 · only track', 'Track 1', { dis: true, chev: false })}${op('pic', 'Picture size', 'This title', 'Fit')}${op('quality', 'Quality', '24 fps · HEVC · 4K HDR', 'Best')}${op('signal', 'Connection', 'Steady · about 28 Mbps', 'Good')}${op('speed', 'Speed', '', '1×')}${op('frames', 'Match frame rate', 'Switches the TV to the film’s rate', 'Off', { chev: false })}${op('skipFwd', 'Intros in this show', 'Skip by itself', 'Ask', {})}</div>\n` +
  hint([['OK', 'Open'], ['▲ ▼', 'Move'], ['Back', 'Close']]));


// 12. the steady state: what he sees after the hint bar's 5 views
page('12-vod-steady.html', 'VOD: the steady state (no hint bar)', 'After 5 views the hint bar retires (UI-SPEC 7): this is the screen he lives with. Two rows and the corner; the ends row has the bottom to itself.',
  pic('severance-bg.jpg', '72% 30%') + scrims() + topVod(SEV) + topRight('Ends at 21:02', '21 min left') +
  btns([disc('pause'), disc('−10'), disc('+10'), pill('Next episode', { chev: true })], vodRight()) +
  track({ p: 57, l: '34:10', r: '−25:50' }));

// 13. the live banner once the hint has retired: no bottom scrim at all
page('13-live-steady.html', 'Live: the banner, steady state', 'Once the hint bar has retired a zap draws the top block alone: no bottom scrim, nothing over the lower half of the broadcast (v1.1).',
  pic('heat-bg.jpg', '50% 30%') + scrims(true, 'none') + banner(HEAT, { tags: TAGS }));

// 14. the bar over a real bright frame: a near-white scene
page('14-vod-white.html', 'VOD: a near-white frame', 'The scrim’s test: a CC0 snow field (Wikimedia Commons, the brightest frame a film can throw). The title block on the heavier top scrim with the text shadow; the bar on the bottom scrim; measured in tools/contrast.js, every text passes 4.5:1 (SPEC 3).',
  `<div class="pv-pic"><img src="art/snow-field.jpg" alt="" style="--pos:50% 60%"></div>\n` + scrims() + topVod({ title: 'Fargo', sub: `1996${dot}1 h 38 min${dot}<span class="tag q">4K</span>`, what: `4K, 5.1${dot}best of 2 copies${dot}Icelandic subtitles` }) + topRight('Ends at 22:19', '58 min left') +
  btns([disc('pause'), disc('−10'), disc('+10')], vodRight()) +
  track({ p: 41, l: '40:12', r: '−57:48' }) + hint(VOD_HINT_THUMB) + note('The frame is a stand-in for the film (CC0, Wikimedia Commons).'));

// 15. the replay bar over a bright court
page('15-replay-court.html', 'Replay: over a bright court', 'The same timeline as 09 over a broadcast-like frame: bright hardwood across the bottom, the broadcaster’s own bug at the top. The scrims and the shadow carry the type; the LIVE pill, the lit chapter and the dot stay readable (measured, SPEC 3).',
  `<div class="pv-pic court-bright"><div class="stands"></div><div class="bug"><span class="a">MEM</span><span>2nd · 4:12</span><span class="h">POR</span></div></div>\n` + scrims() + gameTop() + topRight('Score hidden', 'You’re in Q2', { eye: true }) +
  btns([disc('pause'), disc('skipBack'), disc('−1m'), disc('+1m'), pill('Skip to Q3', { chev: true })], [pill('Back to live'), disc('score'), disc('cc'), disc('audio'), disc('pic')]) +
  track({ p: 31, live: 66, ticks: TICKS, labels: LABELS, r: `${eye}End hidden` }) +
  hint([['OK', 'Pause'], ['◀ ▶', '10 s, hold for faster'], ['▲', 'Buttons'], ['▼', 'Options'], ['Back', 'Hide']]) + note('The court is drawn, a stand-in for the broadcast.'));

fs.writeFileSync(path.join(root, 'tools', 'pages.json'), JSON.stringify(pages, null, 1) + '\n');
console.log('wrote', pages.length, 'pages');
