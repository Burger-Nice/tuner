// The iPhone player (SPEC 3.7, 06 portrait / 07 landscape): an HTML5 <video playsinline> wearing the TV's v2 bar.
// It is "the native player" of the TV's protocol (bridge.js): the TV's player.js / replay.js start it with
// play({ mode: 'live' | 'vod', ... }) and send it commands (meta, game, ring, tune, queue, show-text…); it answers
// with events (track, progress, need, exit…). So tuning, rings, progress, Continue watching, the shield's game data and
// replays from tip-off are the TV's own code.
// Streams (review 2, M1): HLS only. Live is /live/u/p/<id>.m3u8; a replay is core.js catchup()'s .m3u8 link; a film or
// an episode its MP4 / M4V / MOV / HLS link. An MKV (or anything AVFoundation refuses) gets a clear message and the
// hand-off to VLC or Infuse. hls.js is only loaded in a desktop browser (tests): the iPhone plays HLS itself.
import { host, emitEvent } from './bridge.js';
import { S, on, emit } from '../tv/js/state.js';
import { catalog } from '../tv/js/catalog.js';
import { gameById, shielded, isSeen, hidden as gameHidden, chaptersOf } from '../tv/js/games.js';
import { replay as replayState } from '../tv/js/games.js';
import { playLive } from '../tv/js/player.js';
import { hm, leftText, fmtTime, keyOf } from '../tv/js/util.js';
import { ic, esc, sheet, radio, menu, confirm, tileOf, facts, haptic } from './ui.js';
import { hlsOf, tsOf, vlcUrl, infuseUrl, handOff, playsHere, limitReached } from './streams.js';

const $p = () => document.getElementById('ph-player');
const MIN = 60e3;
let P = null;          // the open session: { s, mode, ring, ringName, index, entries, meta, game, R, kind }
let video = null, hls = null, hideT = 0, progT = 0, startT = 0, tapT = 0, lastTap = 0, fill = false, dragging = null, failedOnce = false;
const meta = {};       // channel id -> { now, start, end, next, nextStart, live, fav, kept }
let lastR = null;      // the replay replay.js announced (replay-started), matched to the next vod play by its id
on('replay-started', (R) => { lastR = { R, at: Date.now() }; });
const CAP = window.Capacitor;
const plug = (n) => CAP?.Plugins?.[n] || null;
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const playerOpen = () => !!P;

// ---------- the host (bridge.js) ----------
host.impl = {
  async play(o, s) {
    if (P) end({ quiet: true });   // one stream: the old session ends first (its progress is saved by its exit)
    if (o.mode === 'live') {
      const ring = o.entries ? unpack(o) : P?.ring || lastRing || [];
      if (!ring.length) return { ok: false, error: 'No channels to play.' };
      lastRing = ring;
      P = { s, mode: 'live', ring, ringName: o.ring || 'All channels', index: Math.max(0, Math.min(ring.length - 1, o.index || 0)), game: null };
    } else if (o.mode === 'vod') {
      const R = lastR && Date.now() - lastR.at < 15000 && o.entries?.[0]?.id === lastR.R.id ? lastR.R : null;
      lastR = null;
      P = { s, mode: 'vod', entries: o.entries || [], index: o.index || 0, R, kind: R ? R.kind : 'vod', game: null };
    } else return { ok: false, error: 'The phone player plays live channels, films, episodes and replays.' };
    open();
    load();
    return { ok: true };
  },
  command(what, arg) {
    if (!P) return;
    const j = () => { try { return typeof arg === 'string' ? (arg ? JSON.parse(arg) : null) : arg; } catch { return null; } };
    if (what === 'meta') { Object.assign(meta, j() || {}); draw(); }
    else if (what === 'game') { P.game = j(); draw(); }
    else if (what === 'ring') { const r = j(); if (r?.entries) { P.ring = unpack(r); lastRing = P.ring; P.ringName = r.name; const i = r.tune ? P.ring.findIndex((c) => c.id === String(r.tune)) : -1; if (i >= 0) tune(i); else draw(); } }
    else if (what === 'tune') { const i = P.ring?.findIndex((c) => c.id === String(arg)); if (i >= 0) tune(i); }
    else if (what === 'show-text') say(String(arg || ''));
    else if (what === 'queue') { const q = j(); if (q?.entries && P.mode === 'vod') P.entries.push(...q.entries); draw(); }
    else if (what === 'groups') { const g = j(); if (Array.isArray(g)) groupsSheet(g); }
    else if (what === 'chip') { const c = j(); if (c?.title) say(`${c.title} · ${c.sub || ''}`); }
  },
  stop: () => end({}),
};
let lastRing = null;
// the TV's packed ring: { tpl: '…/live/u/p/{id}.ts', entries: [[id, name, num, logo, url?]] }
function unpack(o) {
  const [pre, post] = (o.tpl || '').split('{id}');
  return (o.entries || []).map((e) => ({ id: String(e[0]), name: e[1], num: e[2], logo: e[3], url: e[4] || (o.tpl ? `${pre}${e[0]}${post}` : '') }));
}

// ---------- the element ----------
function open() {
  const el = $p();
  el.hidden = false;
  document.body.classList.add('playing');
  el.innerHTML = '<div class="pv"><div class="pv-video"><video playsinline webkit-playsinline x-webkit-airplay="allow" preload="auto"></video><div class="pv-paused" hidden></div><div class="pv-subs" hidden></div><div class="ov"></div><div class="pv-msgbox"></div></div><div class="pv-under"></div></div>';
  video = el.querySelector('video');
  video.addEventListener('playing', () => { clearTimeout(startT); P && (P.playing = true, P.err = null, P.waiting = false); failedOnce = false; draw(); });
  video.addEventListener('waiting', () => { if (P) { P.waiting = true; drawMsg(); } });
  video.addEventListener('pause', () => draw());
  video.addEventListener('play', () => draw());
  video.addEventListener('loadedmetadata', () => { if (P?.startAt && isFinite(video.duration) && video.duration > P.startAt) { try { video.currentTime = P.startAt; } catch { /* (seeks after) */ } } P && (P.startAt = 0); draw(); });
  video.addEventListener('error', () => fail(video.error?.code === 4 ? 'This iPhone can\'t play this stream\'s format.' : 'The stream stopped.'));
  video.addEventListener('ended', onEnded);
  video.addEventListener('timeupdate', () => { if (!dragging) drawTrack(); });
  video.addEventListener('webkitpresentationmodechanged', () => draw());
  gestures(el.querySelector('.pv-video'));
  orient(true);
  clearInterval(progT);
  progT = setInterval(tick, 1000);
  window.addEventListener('resize', onResize);
  showOverlay();
}
const onResize = () => { if (P) { orient(); draw(); } };
let wasLand = null;
const isLand = () => window.innerWidth > window.innerHeight;
function orient(first) {
  const land = isLand();
  if (land === wasLand && !first) return;
  wasLand = land;
  // the tabs are portrait; the player follows the phone (open item 1): unlocked while it's up, the status bar hidden in landscape
  try { plug('ScreenOrientation')?.unlock?.(); } catch { /* none */ }
  try { const sb = plug('StatusBar'); if (sb) land ? sb.hide() : sb.show(); } catch { /* none */ }
}
function load() {
  const v = video;
  P.playing = false; P.err = null; P.waiting = true; P.startedAt = Date.now();
  destroyHls();
  const src = sourceNow();
  P.src = src;
  draw();
  if (!src?.url) { fail('There is no link to play.'); return; }
  if (src.mkv) { fail('mkv'); return; }
  P.startAt = src.startAt || 0;
  mediaSession();
  clearTimeout(startT);
  startT = setTimeout(() => { if (P && !P.playing && !P.err) fail('The stream didn\'t start in 20 seconds.'); }, 20000);
  const isHls = /\.m3u8(\?|$)/i.test(src.url) || src.hls;
  if (isHls && !v.canPlayType('application/vnd.apple.mpegurl') && !IOS) {
    loadHlsJs().then((H) => {
      if (!P || P.src !== src) return;
      if (!H?.isSupported()) { fail('This browser can\'t play HLS.'); return; }
      hls = new H({ startPosition: P.startAt || -1, manifestLoadingMaxRetry: 1, levelLoadingMaxRetry: 2 });
      hls.on(H.Events.MANIFEST_PARSED, () => v.play().catch(() => {}));
      hls.on(H.Events.ERROR, (_, d) => { if (d.fatal) fail(d.response?.code ? `The provider answered ${d.response.code}.` : 'The stream stopped.'); });
      hls.loadSource(src.url);
      hls.attachMedia(v);
      P.startAt = 0;
    });
    return;
  }
  v.src = src.url;
  v.play().catch(() => {});
}
function destroyHls() { if (hls) { try { hls.destroy(); } catch { /* gone */ } hls = null; } }
let hlsP = null;
function loadHlsJs() {
  if (window.Hls) return Promise.resolve(window.Hls);
  return hlsP || (hlsP = new Promise((res) => { const s = document.createElement('script'); s.src = 'node_modules/hls.js/dist/hls.min.js'; s.onload = () => res(window.Hls); s.onerror = () => res(null); document.head.appendChild(s); }));
}
// what plays now: { url, hls, mkv, startAt, title, ch?, entry? }
function sourceNow() {
  if (P.mode === 'live') {
    const c = P.ring[P.index];
    const ch = catalog.live?.byId.get(c.id) || catalog.live?.byId.get(+c.id) || null;
    return { url: hlsOf(ch, c.url), hls: true, ch: ch || c, vlc: tsOf(ch, c.url) };
  }
  const e = P.entries[P.index];
  if (!e) return null;
  return { url: e.url, startAt: +e.startAt || 0, mkv: !playsHere({ url: e.url, mime: e.mime, filename: e.filename }), entry: e, vlc: e.url };
}
function fail(why) {
  if (!P) return;
  clearTimeout(startT);
  // a live channel's HLS answer that fails once is asked again before giving up (some panels need a second ask)
  if (why !== 'mkv' && P.mode === 'live' && !failedOnce && !P.playing) { failedOnce = true; setTimeout(() => { if (P && !P.playing) load(); }, 1200); return; }
  P.err = why; P.waiting = false;
  draw();
  if (why !== 'mkv') limitReached().then((lim) => { if (lim && P?.err === why) { P.err = lim; draw(); } });
}
function onEnded() {
  if (!P) return;
  if (P.mode === 'vod' && !P.R) {
    const i = P.index;
    sendProgress(true);
    emitEvent({ type: 'watched', session: P.s, index: i });
    if (P.entries[i + 1]) { P.index = i + 1; emitEvent({ type: 'track', session: P.s, index: P.index }); load(); return; }
  }
  draw();
}
function tick() {
  if (!P) return;
  if (P.mode === 'vod' && video && video.currentTime > 0 && Date.now() - (P.lastProg || 0) > 5000) sendProgress(false);
  if (P.mode === 'live' || P.R) drawTrack();
  if (Math.floor(Date.now() / 1000) % 15 === 0) drawCorner();
}
function sendProgress(final) {
  if (!P || P.mode !== 'vod' || !video) return;
  P.lastProg = Date.now();
  const d = P.R ? P.R.windowMs / 1000 : video.duration;
  if (!isFinite(d) || !d) return;
  emitEvent({ type: 'progress', session: P.s, index: P.index, t: video.currentTime, d, final: !!final });
}
// the player closes (X, swipe down): its exit carries where you got to; quiet: another play replaces it
function end({ quiet = false, then } = {}) {
  if (!P) return;
  const was = P;
  sendProgress(true);
  const t = video?.currentTime || 0, d = was.R ? was.R.windowMs / 1000 : video?.duration || 0;
  P = null;
  clearTimeout(startT); clearInterval(progT); clearTimeout(hideT);
  destroyHls();
  if (video) { try { video.pause(); video.removeAttribute('src'); video.load(); } catch { /* gone */ } }
  emitEvent({ type: 'exit', session: was.s, index: was.index, t, d: isFinite(d) ? d : 0, played: was.R ? t * 1000 : undefined, ...(then ? { then } : {}) });
  if (quiet) return;
  window.removeEventListener('resize', onResize);
  $p().hidden = true; $p().innerHTML = ''; video = null;
  document.body.classList.remove('playing');
  try { plug('StatusBar')?.show?.(); } catch { /* none */ }
  try { plug('ScreenOrientation')?.lock?.({ orientation: 'portrait' }); } catch { /* none */ }
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
  emit('phone-player-closed');
}
export const closePlayer = () => end({});

// ---------- live: tuning inside the ring ----------
function tune(i) {
  if (!P || P.mode !== 'live') return;
  P.index = (i + P.ring.length) % P.ring.length;
  P.game = null;
  failedOnce = false;
  emitEvent({ type: 'track', session: P.s, id: P.ring[P.index].id });
  haptic();
  load();
}
function groupsSheet(list) {
  radio('Channels', list.map((g) => ({ v: g.key, l: g.name, sub: `${g.count} channels` })), list.find((g) => g.name === P?.ringName)?.key, (k) => { if (P) emitEvent({ type: 'group', session: P.s, key: k }); });
}

// ---------- what the screen says ----------
const chNow = () => (P?.mode === 'live' ? P.ring[P.index] : null);
const isGame = () => !!(P?.R?.gameId || P?.game);
const gameOfR = () => (P?.R?.gameId ? gameById(P.R.gameId) : null);
// the replay's window: where the live point is (an archive can't be past now) and the chapters (Tip-off to Q4 as aired)
function replayView() {
  const R = P.R, src = R.sources?.[R.source] || {};
  const ws = src.windowStart || 0, win = R.windowMs || 0;
  const pos = (video?.currentTime || 0) * 1000;
  const livePt = ws ? Math.max(0, Math.min(win, Date.now() - ws - (src.delay || 0) * 1000)) : win;
  const chapters = (R.chapters || []).filter((c) => c.at <= livePt);
  const cur = [...chapters].reverse().find((c) => c.at <= pos + 2000);
  const nextCh = chapters.find((c) => c.at > pos + 5000 && c.key !== 'tip');
  const hiddenNow = R.hidden && !(R.gameId && isSeen(gameById(R.gameId) || { id: R.gameId }));
  return { R, ws, win, pos, livePt, chapters, cur, nextCh, hiddenNow, src, live: livePt < win - 60e3 && Date.now() - ws < win };
}
const chapterWord = (c) => (!c ? '' : c.key === 'tip' ? 'Q1' : c.label);
function titleBlock() {
  if (P.mode === 'live') {
    const c = chNow(), m = meta[c.id] || {};
    const g = P.game;
    const name = g ? g.title : m.now || c.name;
    const sub = [c.num ? String(c.num) : '', c.name, m.end ? `until ${hm(m.end)}` : '', resTag()].filter(Boolean);
    const what = g?.hidden ? `${ic('eyeOff')}Score hidden · the spoiler shield` : m.next ? `Next ${esc(m.next)}` : '';
    return { name, sub, what, live: true };
  }
  const e = P.entries[P.index] || {};
  if (P.R) {
    const R = P.R, ch = R.sources?.[R.source]?.channel;
    return { name: R.title, sub: [ch?.name || '', R.kind === 'game' ? 'From tip-off' : 'Replay', resTag()].filter(Boolean), what: `<span class="tick">${ic('tick')}</span>${R.kind === 'programme' ? 'From the start' : 'From tip-off'} · the archive copy · HLS`, live: false };
  }
  return { name: e.title || '', sub: [e.sub || '', resTag()].filter(Boolean), what: e.label ? `<span class="tick">${ic('tick')}</span>${esc(e.label)}${e.source && e.source !== 'provider' ? ` · ${esc(e.source)}` : ''}` : '' };
}
// the quality the picture really has (review 2, S2: the badge says what plays)
function resTag() {
  const h = video?.videoHeight || 0;
  return h >= 2000 ? '4K' : h >= 1000 ? '1080p' : h >= 700 ? '720p' : h ? `${h}p` : '';
}
function cornerHtml() {
  if (P.R) {
    const v = replayView();
    if (P.R.kind === 'game' || P.R.gameId) {
      const where = v.cur ? `You're in ${chapterWord(v.cur)}` : 'Before tip-off';
      const gap = v.live ? Math.round((v.livePt - v.pos) / MIN) : 0;
      const behind = v.live && gap >= 1 ? ` · ${gap >= 60 ? `${Math.floor(gap / 60)} h ${gap % 60} min` : `${gap} min`} behind live` : '';
      return v.hiddenNow ? `<b>${ic('eyeOff')}Score hidden</b><span>${esc(where + behind)}</span>` : `<b>${esc(where)}</b><span>${esc(behind.replace(/^ · /, '') || 'Replay')}</span>`;
    }
    const left = Math.max(0, v.win - v.pos) / 1000;
    return `<b>Ends ${hm(Date.now() + left * 1000)}</b><span>${leftText(left)}</span>`;
  }
  if (P.mode === 'live') {
    const g = P.game;
    if (g) {
      if (g.hidden) return `<b>${ic('eyeOff')}Score hidden</b><span>${esc(g.started === false ? g.clock : 'Live')}</span>`;
      return `<b>${esc(g.away?.abbr || '')} ${esc(g.score?.[0] ?? '')}–${esc(g.score?.[1] ?? '')} ${esc(g.home?.abbr || '')}</b><span>${esc(g.clock || '')}${g.synced != null ? ` · synced ${g.synced} s` : ''}</span>`;
    }
    const m = meta[chNow().id] || {};
    return m.end ? `<b>Ends ${hm(m.end)}</b><span>${leftText((m.end - Date.now()) / 1000)}</span>` : '';
  }
  const d = video?.duration, t = video?.currentTime || 0;
  return isFinite(d) && d ? `<b>Ends ${hm(Date.now() + (d - t) * 1000)}</b><span>${leftText(d - t)}</span>` : '';
}
function draw() {
  if (!P || !video) return;
  const root = $p().querySelector('.pv');
  const land = isLand();
  root.classList.toggle('land', land);
  root.querySelector('.pv-video').classList.toggle('fill', fill);
  root.querySelector('.pv-paused').hidden = !video.paused || !P.playing;
  const tb = titleBlock();
  const pip = '<button class="pv-ovb" data-act="pip" aria-label="Picture in picture">' + ic('pip') + '</button>';
  const air = '<button class="pv-ovb" data-act="airplay" aria-label="AirPlay">' + ic('airplay') + '</button>';
  const titleHtml = `<div class="pv-title"><h1>${esc(tb.name)}</h1><div class="sub"><span class="tx">${esc(tb.sub.join(' · '))}</span>${tb.live && !P.R ? '<span class="live sm">Live</span>' : ''}</div>${tb.what ? `<div class="what">${tb.what}</div>` : ''}</div>`;
  const ov = root.querySelector('.ov');
  if (land) {
    ov.innerHTML = `<div class="tsc"></div><div class="bsc"></div>
      <div class="ltop"><button class="pv-ovb" data-act="close" aria-label="Close">${ic('close')}</button>${titleHtml}<div class="pv-tr pv-corner2">${cornerHtml()}</div></div>
      <div class="lbar">${btnsHtml(true, pip, air)}${trackHtml()}${endsHtml(true)}</div>`;
    root.querySelector('.pv-under').innerHTML = '';
  } else {
    ov.innerHTML = `<div class="tsc"></div><div class="bsc"></div><button class="pv-ovb" data-act="close" style="left:8px" aria-label="Close">${ic('close')}</button>
      <div style="position:absolute;right:8px;top:6px;display:flex;gap:4px">${air.replace('pv-ovb', 'pv-ovb" style="position:static')}${pip.replace('pv-ovb', 'pv-ovb" style="position:static')}</div>
      <div class="pv-corner">${cornerHtml()}</div>${netChip()}`;
    root.querySelector('.pv-under').innerHTML = `${titleHtml}${trackHtml()}${endsHtml(false)}${btnsHtml(false)}${actsHtml()}${zapHtml()}`;
  }
  root.style.setProperty('--vh', `${root.querySelector('.pv-video').offsetHeight}px`);
  drawMsg();
}
function netChip() {
  const t = navigator.connection?.type;
  return t === 'cellular' ? `<span class="pv-chip">${ic('data')}Mobile data${resTag() ? ` · ${resTag()}` : ''}</span>` : '';
}
function drawCorner() { const c = $p()?.querySelector('.pv-corner, .pv-corner2'); if (c && P) c.innerHTML = cornerHtml(); }
function drawMsg() {
  const box = $p()?.querySelector('.pv-msgbox');
  if (!box || !P) return;
  if (P.err) {
    const src = P.src || {};
    const mkv = P.err === 'mkv';
    const lim = typeof P.err === 'object' && P.err.limit;
    const title = mkv ? 'Only an MKV copy · this iPhone can\'t play MKV' : lim ? P.err.text : 'This stream won\'t play on this iPhone';
    const text = mkv ? 'Infuse or VLC plays it. Subtitles don\'t go with it.' : lim ? 'Stop it on the other device, then try again.' : `${esc(P.err)} ${P.mode === 'live' ? 'The provider may not send this channel as HLS. VLC plays it as it is.' : 'VLC or Infuse may play it.'}`;
    box.innerHTML = `<div class="pv-msg"><b>${esc(title)}</b><p>${text}</p><div class="act">${mkv ? '<button class="pill noicon" data-act="infuse">Open in Infuse</button>' : '<button class="pill noicon" data-act="retry">Try again</button>'}<button class="ghost" data-act="vlc">Open in VLC</button>${mkv ? '' : ''}</div></div>`;
    return;
  }
  const slow = P.waiting && Date.now() - (P.startedAt || 0) > 2000;
  box.innerHTML = P.waiting ? `<div class="pv-msg" style="background:${P.playing ? 'transparent' : '#000'}">${slow || P.playing ? '<div class="spin"></div>' : ''}</div>` : '';
  if (P.waiting && !slow) setTimeout(() => P?.waiting && drawMsg(), 2100);
}

// ---------- the track (the TV's v2 bar) ----------
function trackModel() {
  if (P.R) {
    const v = replayView();
    const ticks = v.chapters.filter((c) => c.key !== 'tip' || true).map((c) => ({ at: c.at / v.win, label: c.label === 'Halftime' ? 'Half' : c.label, on: v.cur === c }));
    return { p: v.pos / v.win, live: v.live ? v.livePt / v.win : null, ahead: v.hiddenNow ? (v.live ? v.livePt / v.win : null) : null, ticks, left: fmtTime(v.pos / 1000), right: v.hiddenNow ? 'End hidden' : `−${fmtTime((v.win - v.pos) / 1000)}`, endHidden: v.hiddenNow, seek: true };
  }
  if (P.mode === 'live') {
    const m = meta[chNow().id] || {};
    const p = m.start && m.end ? (Date.now() - m.start) / (m.end - m.start) : 1;
    return { p: Math.max(0, Math.min(1, p)), live: null, ticks: [], left: m.start ? hm(m.start) : '', right: m.end ? hm(m.end) : '', liveEnd: true, seek: false };
  }
  const d = video?.duration, t = video?.currentTime || 0;
  return { p: isFinite(d) && d ? t / d : 0, ticks: [], left: fmtTime(t), right: isFinite(d) && d ? `−${fmtTime(d - t)}` : '', seek: isFinite(d) && d > 0 };
}
const pct = (x) => `${(Math.max(0, Math.min(1, x)) * 100).toFixed(2)}%`;
function trackHtml() {
  const m = trackModel();
  return `<div class="pv-track" data-seek="${m.seek ? 1 : 0}" style="--p:${pct(m.p)}"><div class="t"></div>${m.ahead != null ? `<div class="ahead" style="left:${pct(m.ahead)}"></div>` : ''}<div class="p"></div>${m.ticks.map((t) => `<div class="tick" style="left:${pct(t.at)}"></div>`).join('')}${m.live != null ? `<div class="ld" style="left:${pct(m.live)}"></div>` : ''}${m.seek ? '<div class="th"></div>' : ''}</div>`;
}
function endsHtml(land) {
  const m = trackModel();
  const marks = m.ticks.filter((t, i, l) => !l.slice(0, i).some((x) => Math.abs(x.at - t.at) < 0.09)).map((t) => `<span class="ch${t.on ? ' on' : ''}" style="left:${pct(t.at)}">${esc(t.label)}</span>`).join('');
  const hint = land && P.mode === 'vod' && hintDue() ? `<span class="hint">double-tap the edges ${isGame() ? '1 min' : '10 s'} · drag the bar</span>` : '';
  return `<div class="pv-ends"><span class="l">${esc(m.left)}</span>${marks}${m.live != null ? `<span class="live sm" style="left:${pct(m.live)}">Live</span>` : ''}${hint}<span class="r">${m.endHidden ? `${ic('eyeOff')}` : m.liveEnd ? '<span class="live sm">Live</span>' : esc(m.right)}</span></div>`;
}
function drawTrack() {
  const root = $p()?.querySelector('.pv');
  if (!root || !P) return;
  const tr = root.querySelector('.pv-track');
  if (!tr) return;
  const m = trackModel();
  tr.style.setProperty('--p', pct(m.p));
  const en = root.querySelector('.pv-ends .l');
  if (en) en.textContent = m.left;
  const r = root.querySelector('.pv-ends .r');
  if (r && !m.endHidden && !m.liveEnd) r.textContent = m.right;
}
const HINT = 'tuner.phHint';
const hintDue = () => { try { return (+localStorage.getItem(HINT) || 0) < 5; } catch { return false; } };
const hintSeen = () => { try { localStorage.setItem(HINT, String((+localStorage.getItem(HINT) || 0) + 1)); } catch { /* none */ } };

// ---------- the buttons ----------
const step = () => (isGame() ? 60 : 10);
function btnsHtml(land, pip = '', air = '') {
  const paused = video?.paused;
  const pp = `<button class="pv-k big" data-act="pause" aria-label="${paused ? 'Play' : 'Pause'}">${ic(paused ? 'play' : 'pause')}</button>`;
  const seekable = P.mode === 'vod';
  const s = step();
  const rew = seekable ? `<button class="pv-k" data-act="rew" aria-label="Back ${s} seconds">${ic('rew')}<small>${s === 60 ? '1m' : '10'}</small></button>` : '';
  const fwd = seekable ? `<button class="pv-k" data-act="fwd" aria-label="Forward ${s} seconds">${ic('fwd')}<small>${s === 60 ? '1m' : '10'}</small></button>` : '';
  const subs = `<button class="pv-k" data-act="subs" aria-label="Subtitles and audio">${ic('cc')}</button>`;
  const opts = `<button class="pv-k" data-act="options" aria-label="Options">${ic('sliders')}</button>`;
  if (!land) return `<div class="pv-btns">${subs}${rew || '<span style="width:48px"></span>'}${pp}${fwd || '<span style="width:48px"></span>'}${opts}</div>`;
  return `<div class="pv-btns">${rew}${pp}${fwd}${actsInline()}<span class="sp"></span>${subs}${air.replace('pv-ovb', 'pv-k sm')}${pip.replace('pv-ovb', 'pv-k sm')}${opts}</div>`;
}
// the game's actions (Skip to Q3, Back to live, Game) and an episode's Next episode
function actList() {
  const out = [];
  if (P.R && (P.R.gameId || P.R.kind === 'game')) {
    const v = replayView();
    if (v.nextCh) out.push(`<button class="pv-act" data-act="skip">${ic('chevR')}Skip to ${esc(v.nextCh.label === 'Halftime' ? 'Half' : v.nextCh.label)}</button>`);
    if (v.live && P.R.live) out.push('<button class="pv-act" data-act="tolive"><span class="live sm">Live</span>Back to live</button>');
    out.push(`<button class="pv-act" data-act="game">${ic('ball')}Game</button>`);
  } else if (P.mode === 'live' && P.game) {
    if (P.game.kept && P.game.started) out.push(`<button class="pv-act" data-act="tipoff">${ic('tipoff')}From tip-off</button>`);
    out.push(`<button class="pv-act" data-act="game">${ic('ball')}Game</button>`);
  } else if (P.mode === 'vod' && P.entries[P.index + 1]) out.push(`<button class="pv-act" data-act="next">Next episode ${ic('chevR')}</button>`);
  return out;
}
const actsHtml = () => { const a = actList(); return a.length ? `<div class="pv-row">${a.join('')}</div>` : ''; };
const actsInline = () => actList().join('');
function zapHtml() {
  if (P.mode !== 'live') return '';
  const n = P.ring.length, i = P.index;
  const around = [];
  for (let k = -1; k <= 6 && around.length < Math.min(n, 8); k++) around.push((i + k + n) % n);
  const ids = [...new Set(around)];
  const want = ids.map((x) => P.ring[x].id).filter((id) => !meta[id]);
  if (want.length) emitEvent({ type: 'need-meta', session: P.s, ids: want });
  const rows = ids.map((x) => {
    const c = P.ring[x], m = meta[c.id] || {};
    return `<button class="lv-ch${x === i ? ' cur' : ''}" data-tune="${x}"><span class="no">${c.num || ''}</span>${tileOf(c)}<span class="col"><span class="nm"><span class="n">${esc(c.name)}</span>${m.live ? '<span class="live sm">Live</span>' : ''}</span><span class="pg${m.now ? '' : ' dim'}">${esc(m.now || (m.start === undefined ? '' : 'No guide information'))}</span></span></button>`;
  }).join('');
  return `<div class="pv-zap"><div class="h">Channels<span>${esc(P.ringName)} · ${i + 1} of ${n}</span><button class="more" data-act="groups">Groups ${ic('chevR')}</button></div>${rows}</div>`;
}

// ---------- taps ----------
document.addEventListener('click', (e) => {
  const root = $p();
  if (!P || root.hidden || !root.contains(e.target)) return;
  const tz = e.target.closest('[data-tune]');
  if (tz) { tune(+tz.dataset.tune); return; }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  showOverlay();
  act(b.dataset.act);
});
function act(a) {
  const v = video;
  if (a === 'close') return end({});
  if (a === 'pause') { if (v.paused) v.play().catch(() => {}); else v.pause(); draw(); return; }
  if (a === 'rew' || a === 'fwd') return seekBy(a === 'rew' ? -step() : step());
  if (a === 'pip') {
    try { if (v.webkitSupportsPresentationMode?.('picture-in-picture')) v.webkitSetPresentationMode(v.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture'); else if (document.pictureInPictureEnabled) (document.pictureInPictureElement ? document.exitPictureInPicture() : v.requestPictureInPicture()).catch(() => say('Picture in picture isn\'t available here')); else say('Picture in picture isn\'t available here'); } catch { say('Picture in picture isn\'t available here'); }
    return;
  }
  if (a === 'airplay') { if (v.webkitShowPlaybackTargetPicker) v.webkitShowPlaybackTargetPicker(); else say('AirPlay isn\'t available here'); return; }
  if (a === 'retry') { failedOnce = false; return load(); }
  if (a === 'vlc') return handOff(vlcUrl(P.src?.vlc || P.src?.url), 'VLC');
  if (a === 'infuse') return handOff(infuseUrl(P.src?.url), 'Infuse');
  if (a === 'options') return options();
  if (a === 'subs') return subsSheet();
  if (a === 'groups') return emitEvent({ type: 'need', session: P.s, what: 'groups' });
  if (a === 'next') { sendProgress(true); emitEvent({ type: 'watched', session: P.s, index: P.index }); P.index++; emitEvent({ type: 'track', session: P.s, index: P.index }); return load(); }
  if (a === 'skip') { const n = replayView().nextCh; if (n) { video.currentTime = Math.max(0, n.at / 1000 - 10); draw(); } return; }
  if (a === 'tolive') return toLive();
  if (a === 'tipoff') return emitEvent({ type: 'tipoff', session: P.s });
  if (a === 'game') return gameSheet();
}
function seekBy(sec) {
  const v = video;
  if (!v || P.mode !== 'vod') return;
  let to = v.currentTime + sec;
  if (P.R) { const rv = replayView(); if (rv.live) to = Math.min(to, rv.livePt / 1000 - 5); }   // never past what has aired
  if (isFinite(v.duration)) to = Math.min(to, v.duration - 1);
  v.currentTime = Math.max(0, to);
  flash(`${sec < 0 ? '−' : '+'}${Math.abs(sec) >= 60 ? `${Math.abs(sec) / 60} min` : `${Math.abs(sec)} s`}`, sec < 0 ? 'l' : 'r');
  drawTrack();
}
function flash(text, side) {
  const box = $p()?.querySelector('.pv-video');
  if (!box) return;
  const f = document.createElement('div');
  f.className = 'pv-seek';
  f.style[side === 'l' ? 'left' : 'right'] = '18%';
  f.textContent = text;
  box.appendChild(f);
  setTimeout(() => f.remove(), 700);
}
function toLive() {
  const R = P.R, ch = R?.live && (catalog.live?.byId.get(String(R.live.id)) || catalog.live?.byId.get(+R.live.id));
  if (!ch) { say('No live channel for this game'); return; }
  const go = () => { const ring = catalog.live?.items || [ch]; end({ quiet: true }); playLive(ch, ring, 'All channels'); };
  const g = gameOfR();
  if (g && shielded(g) && !isSeen(g)) confirm({ title: 'Going live may show the score', text: `${ch.name} is live now. Your replay stays where you left it.`, no: 'Stay in the replay', yes: 'Go live', onYes: go });
  else go();
}
function say(text) {
  const box = $p()?.querySelector('.pv-video');
  if (!box || !text) return;
  box.querySelector('.pv-tag')?.remove();
  const t = document.createElement('div');
  t.className = 'pv-tag'; t.textContent = text;
  box.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
function options() {
  const rows = [
    { label: fill ? 'Picture: fill the screen' : 'Picture: fit', sub: 'Pinch the video to switch', icon: 'tv', run: () => { fill = !fill; draw(); } },
  ];
  if (P.mode === 'vod' && !P.R) rows.push({ label: `Speed: ${video.playbackRate}×`, icon: 'fwd', run: () => radio('Speed', [0.75, 1, 1.25, 1.5, 2].map((x) => ({ v: x, l: `${x}×` })), video.playbackRate, (x) => { video.playbackRate = +x; }) });
  const u = P.src?.url || '';
  rows.push({ label: 'Connection', sub: `${/\.m3u8/i.test(u) ? 'HLS' : u.split('?')[0].split('.').pop().toUpperCase()} · ${resTag() || 'quality not known yet'} · ${(() => { try { return new URL(u).host; } catch { return ''; } })()}`, icon: 'globe', run: () => {} });
  rows.push({ label: 'Open in VLC', sub: 'Plays it in VLC, if this iPhone has it', icon: 'ext', run: () => handOff(vlcUrl(P.src?.vlc || u), 'VLC') });
  if (P.mode === 'vod') rows.push({ label: 'Open in Infuse', icon: 'ext', run: () => handOff(infuseUrl(u), 'Infuse') });
  menu('Options', rows);
}
function subsSheet() {
  const v = video, tt = [...(v.textTracks || [])].filter((t) => t.kind === 'subtitles' || t.kind === 'captions'), at = [...(v.audioTracks || [])];
  const rows = [];
  rows.push({ label: 'Subtitles off', icon: tt.some((t) => t.mode === 'showing') ? '' : 'tick', run: () => tt.forEach((t) => { t.mode = 'disabled'; }) });
  tt.forEach((t) => rows.push({ label: t.label || t.language || 'Subtitles', sub: t.language || '', icon: t.mode === 'showing' ? 'tick' : '', run: () => tt.forEach((x) => { x.mode = x === t ? 'showing' : 'disabled'; }) }));
  at.forEach((t) => rows.push({ label: `Sound: ${t.label || t.language || 'Track'}`, icon: t.enabled ? 'tick' : '', run: () => at.forEach((x) => { x.enabled = x === t; }) }));
  menu('Subs & audio', rows, { sub: tt.length || at.length > 1 ? '' : 'This stream has no other tracks' });
}
// the game panel as a sheet (quarters, plays, the box) from the game data the TV sends (shield applied there)
function gameSheet() {
  const g = P.game || null;
  const R = P.R, gg = R?.gameId ? gameById(R.gameId) : null;
  if (R && gg) {
    const v = replayView();
    const hid = v.hiddenNow;
    const ch = chaptersOf(gg.id).list.filter((c) => c.key !== 'tip');
    return menu(`${gg.away.name} at ${gg.home.name}`, [
      ...((R.chapters || []).filter((c) => c.at <= v.livePt).map((c) => ({ label: c.key === 'tip' ? 'Tip-off' : c.label, sub: v.cur === c ? 'You are here' : '', icon: 'chevR', run: () => { video.currentTime = Math.max(0, c.at / 1000 - (c.key === 'tip' ? 0 : 10)); } }))),
      hid ? { label: 'The score stays hidden', sub: 'It shows once the replay reaches the end, or you reveal it on the game page', icon: 'eyeOff' } : null,
    ], { sub: ch.length ? 'Jump to a chapter' : 'The chapters come as ESPN sends the plays' });
  }
  if (!g) return say('No game data yet');
  const rows = (g.plays || []).slice(0, 25).map((p) => ({ label: `${p.clock} · ${p.text}`, sub: p.score || '' }));
  menu(g.title, rows.length ? rows : [{ label: g.hidden ? 'Plays are hidden by the spoiler shield' : 'No plays yet', icon: 'eyeOff' }], { sub: g.hidden ? 'Score hidden' : `${g.score ? `${g.score[0]}–${g.score[1]} · ` : ''}${g.clock || ''}` });
}

// ---------- gestures (one job each, SPEC 3.7) ----------
function gestures(box) {
  let t0 = null, pinch = null;
  box.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) { pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); t0 = null; return; }
    if (e.target.closest('[data-act], .pv-track')) { t0 = null; return; }
    t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  box.addEventListener('touchmove', (e) => {
    if (pinch && e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (Math.abs(d - pinch) > 40) { fill = d > pinch; pinch = null; draw(); }
    }
  }, { passive: true });
  box.addEventListener('touchend', (e) => {
    pinch = null;
    if (!t0) return;
    const c = e.changedTouches[0], dx = c.clientX - t0.x, dy = c.clientY - t0.y, dt = Date.now() - t0.t;
    const start = t0; t0 = null;
    const w = box.clientWidth, h = box.clientHeight;
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.5 && dt < 700) {
      if (!isLand() && dy > 0) { end({}); return; }   // portrait: swipe down dismisses
      if (isLand() && P?.mode === 'live' && start.x > w / 3 && start.x < (2 * w) / 3) { tune(P.index + (dy < 0 ? 1 : -1)); return; }   // landscape, the middle third: zap
      return;
    }
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) return;
    e.preventDefault();
    const now = Date.now();
    const third = start.x < w / 3 ? 'l' : start.x > (2 * w) / 3 ? 'r' : 'm';
    if (now - lastTap < 300 && third !== 'm' && P?.mode === 'vod') { clearTimeout(tapT); lastTap = 0; seekBy(third === 'l' ? -step() : step()); if (isLand()) hintSeen(); return; }
    lastTap = now;
    clearTimeout(tapT);
    tapT = setTimeout(() => {
      const ov = $p()?.querySelector('.ov');
      if (ov?.classList.contains('away')) showOverlay();
      else if (video) { if (video.paused) video.play().catch(() => {}); else video.pause(); draw(); showOverlay(); }
    }, 260);
    void h;
  });
  // dragging the track scrubs (the bubble shows the time)
  const root = $p();
  root.addEventListener('touchstart', (e) => {
    const tr = e.target.closest('.pv-track[data-seek="1"]');
    if (!tr || !P) return;
    dragging = { tr }; tr.classList.add('drag'); scrub(e.touches[0].clientX); clearTimeout(hideT);
  }, { passive: true });
  root.addEventListener('touchmove', (e) => { if (dragging) { scrub(e.touches[0].clientX); e.preventDefault(); } }, { passive: false });
  root.addEventListener('touchend', () => {
    if (!dragging) return;
    const to = dragging.to; dragging.tr.classList.remove('drag'); dragging.tr.querySelector('.bub')?.remove(); dragging = null;
    if (to != null && video) video.currentTime = to;
    showOverlay();
  });
  // a desktop browser (tests): mouse down on the track
  root.addEventListener('mousedown', (e) => { const tr = e.target.closest('.pv-track[data-seek="1"]'); if (!tr || !P || !video) return; const r = tr.getBoundingClientRect(); const f = (e.clientX - r.left) / r.width; seekFrac(f); });
}
function seekFrac(f) {
  f = Math.max(0, Math.min(1, f));
  if (P.R) { const v = replayView(); let ms = f * v.win; if (v.live) ms = Math.min(ms, v.livePt - 5000); video.currentTime = ms / 1000; }
  else if (isFinite(video.duration)) video.currentTime = f * video.duration;
  drawTrack();
}
function scrub(x) {
  const tr = dragging.tr, r = tr.getBoundingClientRect();
  let f = Math.max(0, Math.min(1, (x - r.left) / r.width));
  let sec;
  if (P.R) { const v = replayView(); let ms = f * v.win; if (v.live) ms = Math.min(ms, v.livePt - 5000); f = ms / v.win; sec = ms / 1000; }
  else sec = isFinite(video.duration) ? f * video.duration : 0;
  dragging.to = sec;
  tr.style.setProperty('--p', pct(f));
  let b = tr.querySelector('.bub');
  if (!b) { b = document.createElement('div'); b.className = 'bub'; tr.appendChild(b); }
  b.style.left = pct(f);
  b.textContent = fmtTime(sec);
}
// only the video's own overlay hides (portrait): after 4 s without a touch, never while paused; landscape: everything
function showOverlay() {
  const ov = $p()?.querySelector('.ov');
  if (!ov) return;
  ov.classList.remove('away');
  clearTimeout(hideT);
  hideT = setTimeout(() => { if (video && !video.paused && !dragging && P && !P.err) ov.classList.add('away'); }, 4000);
}

// ---------- the lock screen (Now Playing): the masked name only (SPEC 0.9) ----------
function mediaSession() {
  if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
  const tb = titleBlock();
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: tb.name || 'airglow', artist: P.mode === 'live' ? chNow().name : 'airglow', artwork: [{ src: 'tv/brand/assets/mark.svg', sizes: '512x512', type: 'image/svg+xml' }] });
    navigator.mediaSession.setActionHandler?.('seekbackward', P.mode === 'vod' ? () => seekBy(-step()) : null);
    navigator.mediaSession.setActionHandler?.('seekforward', P.mode === 'vod' ? () => seekBy(step()) : null);
  } catch { /* older WebKit */ }
}
on('nba', () => { if (P?.R) { drawCorner(); } });
if (window.TUNER_TEST) window.__phonePlayer = { state: () => (P ? { mode: P.mode, replay: !!P.R, url: P.src?.url ? P.src.url.replace(/\/\/[^/]+/, '//host') : '', playing: !!P.playing, err: P.err ? String(P.err.text || P.err) : '', t: video?.currentTime || 0, h: video?.videoHeight || 0 } : null), close: () => end({}), act };
void keyOf; void gameHidden; void replayState; void S;
