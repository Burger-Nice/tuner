// The Windows player (desktop SPEC 6, mocks 06 / 07 / 09): mpv embedded in the window (a host window per picture,
// main.js), wearing the TV's v2 bar drawn by the app in the floating layer (float.js: over the picture, in the overlay
// window). It is "the native player" of the TV's protocol (bridge.js): the TV's player.js / replay.js start it with
// play({ mode: 'live' | 'vod', ... }) and send it commands (meta, game, ring, tune, queue, versions, subs, segments…);
// it answers with events (track, progress, need, exit, watched, skip…). Tuning, rings, progress, Continue watching,
// the shield's game data and replays from tip-off are the TV's own code; this draws, plays and answers.
// Modes: theater (the content area, a 40 px title strip with the way back and Windows' caption buttons), full screen
// (F), docked (G: the game panel at the right, the bar in the band under the picture), mini (P: the picture's host
// moves into an always-on-top window of its own; the same mpv, no new stream).
import { host, emitEvent } from './bridge.js';
import { S, on, emit, settings } from '../tv/js/state.js';
import { catalog } from '../tv/js/catalog.js';
import { gameById, shielded, isSeen } from '../tv/js/games.js';
import { playLive } from '../tv/js/player.js';
import { hm, leftText, fmtTime, teamPalette } from '../tv/js/util.js';
import { ic, esc, menu, radio, confirm, sheet, tileOf, cleanCh, crestImg } from './ui.js';
import { floatRoot, setMirror, setPictures, setCursor, onPointerMove, sizeRoot } from './float.js';
import { limitReached, handOff } from './streams.js';
import { tip } from './keys.js';
import { langName } from '../tv/js/subs/lang.js';

const T = window.tuner || null;
const MPV = T?.mpv || null;
const MIN = 60e3;
let P = null;            // the session: { s, mode, ring, ringName, index, entries, R, game, versions, subs, seg… }
let M = null;            // mpv's state: { t, d, pause, mute, volume, tracks, w, h, hwdec, buffering, cache, speed }
let mid = '';            // the mpv picture this session plays in
let layout = { mode: 'theater', fs: false, docked: false, mini: false };
let hideT = 0, uiUp = true, lastMove = 0, from = 'Home', fromName = 'home', pausedAt = 0, bannerT = 0, bannerUntil = 0, lastLive = null, failedOnce = false, tabT = 0;
const meta = {};         // channel id -> { now, start, end, next, nextStart, live, fav, kept }
let lastR = null;        // the replay replay.js announced (replay-started), matched to the next vod play by its id
on('replay-started', (R) => { lastR = { R, at: Date.now() }; });
let pending = null;      // a copy picked here that the TV plays as a new play: its time and its note
let lastRing = null;
const pv = () => document.getElementById('dk-player');
export const open = () => !!P && !layout.mini;
export const isLive = () => P?.mode === 'live';
export const theater = () => !!P && !layout.mini;
export const playerOpen = open;

// ---------- the host (bridge.js) ----------
host.impl = {
  async play(o, s) {
    if (P) end({ quiet: true });
    if (o.mode === 'live') {
      const ring = o.entries ? unpack(o) : lastRing || [];
      if (!ring.length) return { ok: false, error: 'No channels to play.' };
      lastRing = ring;
      P = { s, mode: 'live', ring, ringName: o.ring || 'All channels', index: Math.max(0, Math.min(ring.length - 1, o.index || 0)), game: null, hist: [] };
    } else if (o.mode === 'vod') {
      if (pending && Date.now() - pending.at < 15000 && pending.id && o.entries?.[0]?.id === pending.id) o.entries[0].startAt = pending.t;
      const R = lastR && Date.now() - lastR.at < 15000 && o.entries?.[0]?.id === lastR.R.id ? lastR.R : null;
      lastR = null;
      P = { s, mode: 'vod', entries: o.entries || [], index: o.index || 0, R, kind: R ? R.kind : 'vod', game: null, seg: {}, done: {} };
    } else return { ok: false, error: 'The player plays live channels, films, episodes and replays.' };
    P.subPrefs = o.subs || null;
    if (!layout.mini) enterTheater();
    const r = await ensureMpv();
    if (!r.ok) { P.err = r.error === 'missing' ? 'missing' : r.error || 'The player could not start.'; draw(); return { ok: true }; }
    load();
    if (pending && Date.now() - pending.at < 15000) say(pending.say);
    pending = null;
    return { ok: true };
  },
  command(what, arg) {
    if (!P) return;
    const j = () => { try { return typeof arg === 'string' ? (arg ? JSON.parse(arg) : null) : arg; } catch { return null; } };
    if (what === 'meta') { Object.assign(meta, j() || {}); draw(); }
    else if (what === 'game') { P.game = j(); draw(); drawDock(); }
    else if (what === 'ring') { const r = j(); if (r?.entries) { P.ring = unpack(r); lastRing = P.ring; P.ringName = r.name; const i = r.tune ? P.ring.findIndex((c) => c.id === String(r.tune)) : -1; if (i >= 0) tune(i); else draw(); } }
    else if (what === 'tune') { const i = P.ring?.findIndex((c) => c.id === String(arg)); if (i >= 0) tune(i); }
    else if (what === 'show-text') say(String(arg || ''));
    else if (what === 'queue') { const q = j(); if (q?.entries && P.mode === 'vod') P.entries.push(...q.entries); draw(); }
    else if (what === 'groups') { const g = j(); if (Array.isArray(g)) groupsMenu(g); }
    else if (what === 'chip') { const c = j(); if (c?.title) say(`${c.title} · ${c.sub || ''}`); }
    else if (what === 'versions') { P.versions = j(); if (P.openCopies) { P.openCopies = false; copiesMenu(); } if (P.err) draw(); }
    else if (what === 'copy') gotCopy(j());
    else if (what === 'subs') { P.subs = j(); applySubPick(); }
    else if (what === 'segments') { const m = j(); if (m) { if (m.ahead) P.segAhead = m; else P.seg[m.id] = m; } }
    else if (what === 'linked') draw();
    // an add-on episode's next one (titlecopies.js answerNext): what it is, then its best copy
    else if (what === 'next-info') { P.nextInfo = j(); draw(); }
    else if (what === 'queue-next') {
      const q = j() || {};
      if (q.entry && P.mode === 'vod' && !P.entries[P.index + 1]) P.entries.push(q.entry);
      if (q.none) P.nextNone = q;
      if (P.wantNext) { P.wantNext = false; if (q.entry) nextEpisode(); else say(q.say || (q.none === 'last' ? 'This is the last episode' : 'No copy of the next episode yet')); }
      draw();
    }
  },
  stop: () => end({}),
};
function unpack(o) {
  const [pre, post] = (o.tpl || '').split('{id}');
  return (o.entries || []).map((e) => ({ id: String(e[0]), name: e[1], num: e[2], logo: e[3], url: e[4] || (o.tpl ? `${pre}${e[0]}${post}` : '') }));
}

// ---------- mpv ----------
async function ensureMpv() {
  if (!MPV) return { ok: true };   // (a browser: the views' tests; no picture)
  if (mid) return { ok: true };
  const id = `pv${Date.now() % 1e6}`;
  const r = await MPV.create(id, { volume: +localStorage.getItem('tuner.dkVol') || 100, mute: false });
  if (!r?.ok) return r || { ok: false };
  mid = id;
  M = { t: null, d: null, pause: false, mute: false, volume: +localStorage.getItem('tuner.dkVol') || 100, tracks: [], w: 0, h: 0 };
  place();
  return r;
}
// a picture made elsewhere (multiview's audio tile) becomes the player's: the same mpv, no new stream
let adoptedUrl = '';
export function adopt(id, state, url = '') { if (mid && mid !== id) MPV?.quit(mid); mid = id; adoptedUrl = url; M = { t: null, d: null, pause: false, ...(state || {}), tracks: state?.tracks || [] }; }
MPV?.onTick((all) => {
  if (!mid || !all[mid] || !M) return;
  Object.assign(M, all[mid]);
  if (!P) return;
  tick();
});
MPV?.onEvent((e) => {
  if (e.id !== mid || !M) return;
  if (e.type === 'prop') {
    const k = { 'track-list': 'tracks', width: 'w', height: 'h', 'hwdec-current': 'hwdec', 'eof-reached': 'eof', 'paused-for-cache': 'buffering' }[e.name] || e.name;
    if (e.name === 'track-list') M.tracks = (e.value || []).map((t) => ({ id: t.id, type: t.type, lang: t.lang || '', title: t.title || '', codec: t.codec || '', selected: !!t.selected, external: !!t.external, channels: t['demux-channel-count'] || 0 }));
    else M[k] = e.value;
    if (e.name === 'pause') { pausedAt = e.value ? Date.now() : 0; mediaKeys(); }
    if (e.name === 'eof-reached' && e.value) onEnded();
    if (['pause', 'mute', 'volume', 'width', 'hwdec-current', 'track-list', 'paused-for-cache'].includes(e.name)) draw();
    if (e.name === 'track-list' && P) applySubPick();
  } else if (e.type === 'file-loaded') {
    if (P) { P.playing = true; P.err = null; P.waiting = false; failedOnce = false; clearTimeout(P.startT); askNext(); draw(); }
  } else if (e.type === 'end-file') {
    if (!P) return;
    if (e.reason === 'error') fail(e.error || 'The stream stopped.');
    else if (e.reason === 'eof') onEnded();
  } else if (e.type === 'exit') {
    if (mid === e.id) { mid = ''; M = null; if (P) { P.err = e.error || 'The player stopped.'; draw(); } }
  }
});
const mset = (k, v) => (mid && MPV ? MPV.set(mid, k, v) : Promise.resolve());
const mcmd = (args) => (mid && MPV ? MPV.command(mid, args) : Promise.resolve());

function load() {
  P.playing = false; P.err = null; P.waiting = true; P.startedAt = Date.now();
  const src = sourceNow();
  P.src = src;
  P.subFile = null; P.cueFlag = false;
  draw();
  if (!src?.url) { fail('There is no link to play.'); return; }
  clearTimeout(P.startT);
  const me = P;
  P.startT = setTimeout(() => { if (P === me && !P.playing && !P.err) fail('The stream didn\'t start in 20 seconds.'); }, 20000);
  if (MPV && mid && adoptedUrl && adoptedUrl === src.url) { adoptedUrl = ''; P.playing = true; P.waiting = false; clearTimeout(P.startT); requestAnimationFrame(place); draw(); }   // (multiview's audio tile: it plays already)
  else if (MPV && mid) { adoptedUrl = ''; MPV.load(mid, { url: src.url, start: src.startAt || 0, title: titleBlock().name }); }
  else setTimeout(() => { if (P === me) { P.playing = true; P.waiting = false; draw(); } }, 300);   // (a browser: no picture)
  if (P.mode === 'live') showBanner();
  mediaKeys();
}
function sourceNow() {
  if (P.mode === 'live') {
    const c = P.ring[P.index];
    const ch = catalog.live?.byId.get(c.id) || catalog.live?.byId.get(+c.id) || null;
    return { url: c.url || ch?.sources?.[0]?.url || '', ch: ch || c };
  }
  const e = P.entries[P.index];
  if (!e) return null;
  return { url: e.url, startAt: +e.startAt || 0, entry: e };
}
function fail(why) {
  if (!P) return;
  clearTimeout(P.startT);
  if (P.mode === 'live' && !failedOnce && !P.playing) { failedOnce = true; setTimeout(() => { if (P && !P.playing) load(); }, 1200); return; }
  P.err = why; P.waiting = false;
  copyFailed();
  draw();
  limitReached().then((lim) => { if (lim && P?.err === why) { P.err = lim; draw(); } });
}
function onEnded() {
  if (!P || P.ended) return;
  if (P.mode === 'live') { if (P.playing && !P.err) { P.playing = false; setTimeout(() => P && load(), 800); } return; }   // (a live stream that ends: tune it again)
  if (P.mode === 'vod' && !P.R) {
    const i = P.index;
    sendProgress(true);
    if (hasNext()) {
      if (P.upnext?.cancelled && !P.wantNext) { P.ended = true; endCard(); return; }
      goNext();
      return;
    }
  }
  P.ended = true;
  draw();
}
// an episode's next one: lined up by the TV's code (queue), or asked for (an add-on episode: need next)
const isEpisode = () => P?.mode === 'vod' && !P.R && (P.entries[P.index]?.kind === 'episode' || /^episode:/.test(String(P.entries[P.index]?.id || '')) || / E\d+/.test(P.entries[P.index]?.sub || ''));
function askNext(now = false) {
  if (!isEpisode() || P.entries[P.index + 1] || (P.asked === P.index && !now)) return;
  P.asked = P.index;
  emitEvent({ type: 'need', session: P.s, what: 'next', index: P.index, binge: P.entries[P.index]?.binge || '' });
}
const hasNext = () => !!P && (!!P.entries?.[P.index + 1] || (isEpisode() && !P.nextInfo?.last && P.nextNone?.none !== 'last'));
function goNext() {
  if (!P) return;
  emitEvent({ type: 'watched', session: P.s, index: P.index });
  if (P.entries[P.index + 1]) return nextEpisode();
  P.wantNext = true; askNext(true); say('Getting the next episode…');
}
const nextLine = () => { const n = P.entries?.[P.index + 1]; return n ? { title: n.title || '', sub: n.sub || '' } : P.nextInfo && !P.nextInfo.last ? { title: P.nextInfo.title || '', sub: P.nextInfo.sub || '' } : { title: '', sub: '' }; };
function nextEpisode() {
  if (!P || !P.entries[P.index + 1]) return;
  sendProgress(true);
  P.index++; P.upnext = null; P.ended = false; P.done = {}; P.nextInfo = null; P.nextNone = null;
  emitEvent({ type: 'track', session: P.s, index: P.index });
  if (P.segAhead) { P.seg[P.segAhead.id] = P.segAhead; P.segAhead = null; }
  load();
}
let progN = 0;
function tick() {
  if (!P || !M) return;
  if (P.mode === 'vod' && M.t > 0 && Date.now() - (P.lastProg || 0) > 5000) sendProgress(false);
  segments();
  if (++progN % 2 === 0) drawTrack();
  if (P.waiting && P.playing === false && M.t > 0) { P.waiting = false; P.playing = true; draw(); }
  if (pausedAt && Date.now() - pausedAt > 120e3 && !P.dim) { P.dim = true; draw(); mediaKeys(); }   // (the OLED rule: paused 2 min, the controls fade)
}
function sendProgress(final) {
  if (!P || P.mode !== 'vod' || !M) return;
  P.lastProg = Date.now();
  const d = P.R ? P.R.windowMs / 1000 : M.d;
  if (!d || !isFinite(d)) return;
  emitEvent({ type: 'progress', session: P.s, index: P.index, t: M.t || 0, d, final: !!final });
}
// the player closes; quiet: another play replaces it (its exit carries where you got to)
function end({ quiet = false } = {}) {
  if (!P) return;
  const was = P;
  sendProgress(true);
  const t = M?.t || 0, d = was.R ? was.R.windowMs / 1000 : M?.d || 0;
  P = null;
  clearTimeout(was.startT); clearTimeout(hideT); clearTimeout(bannerT);
  emitEvent({ type: 'exit', session: was.s, index: was.index, t, d: isFinite(d) ? d : 0, played: was.R ? t * 1000 : undefined });
  if (quiet) { if (mid) mcmd(['stop']); return; }
  if (mid) { MPV?.quit(mid); mid = ''; M = null; }
  if (layout.mini) { T?.mini?.close(); layout.mini = false; setMirror('mini', false); floatRoot('mini').innerHTML = ''; }
  exitTheater();
  mediaKeys();
  emit('player-ui');
  emit('desktop-player-closed');
}
export const closePlayer = () => end({});

// ---------- the layout: theater, full screen, docked, mini ----------
function enterTheater() {
  const { current } = window.__dkNav || {};
  void current;
  const scr = document.body.dataset.screen || 'home';
  fromName = scr;
  from = { home: 'Home', live: 'Live', nba: 'NBA', game: 'the game', team: 'NBA', lib: 'Library', detail: document.querySelector('.pg-detail h1')?.textContent || document.querySelector('.pg-detail .logo')?.alt || 'Back', search: 'Search', saved: 'Saved', account: 'Account' }[scr] || 'Back';
  layout.mini = false;
  document.body.classList.add('playing');
  pv().hidden = false;
  pv().innerHTML = '<div class="pv-stage"><div class="pv-black"></div></div><div class="pv-band"></div><aside class="pv-dock" hidden></aside>';
  wireStage();
  uiUp = true;
  setMirror('main', false);   // (until mpv's picture is placed: then the overlay draws the controls over it)
  emit('player-ui');
  requestAnimationFrame(place);
  showUi();
}
function exitTheater() {
  document.body.classList.remove('playing', 'docked', 'fs');
  layout.docked = false;
  if (layout.fs) { T?.win?.fullscreen(false); layout.fs = false; }
  pv().hidden = true; pv().innerHTML = '';
  floatRoot('main').querySelector('.pv-layer')?.remove();
  setPictures('main', []);
  setMirror('main', false);
  setCursor('main', '');
  emit('player-ui');
}
// the picture's rect: the stage (theater: under the strip; docked: the top of the area left of the panel at 16:9)
function stageRect() {
  const st = pv()?.querySelector('.pv-stage');
  if (!st) return null;
  const r = st.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}
function place() {
  if (!P || layout.mini) return;
  const r = stageRect();
  if (!r) return;
  if (mid && MPV) T.host.rect(mid, r);
  setPictures('main', [{ id: mid || 'pv', ...r }], onPicture);
  setMirror('main', !!(mid && MPV));
  draw();
}
window.addEventListener('resize', () => { if (P && !layout.mini) requestAnimationFrame(place); });
T?.win?.onState?.((s) => { if ('fullscreen' in s && P) { layout.fs = !!s.fullscreen; document.body.classList.toggle('fs', layout.fs); setTimeout(place, 60); } if (s.hidden && P && !M?.pause) mset('pause', true); });
// the stage itself (a browser has no overlay: the page takes the pointer)
function wireStage() {
  const st = pv().querySelector('.pv-stage');
  st.addEventListener('click', () => onPicture({ type: 'click' }));
  st.addEventListener('dblclick', () => onPicture({ type: 'dblclick' }));
  st.addEventListener('wheel', (e) => { e.preventDefault(); onPicture({ type: 'wheel', dy: e.deltaY }); }, { passive: false });
  st.addEventListener('contextmenu', (e) => { e.preventDefault(); onPicture({ type: 'contextmenu', x: e.clientX, y: e.clientY }); });
  st.addEventListener('mousemove', () => showUi());
  pv().querySelector('.pv-dock').addEventListener('click', dockClick);
}
// the picture's own verbs (SPEC 6.2): click pauses, double-click is full screen, the wheel is volume, right-click Options
function onPicture(ev) {
  if (!P) return;
  if (layout.mini && ev.win === 'mini') return miniPointer(ev);
  showUi();
  if (ev.type === 'click') { if (P.upnext && !P.upnext.cancelled) return; togglePause(); }
  else if (ev.type === 'dblclick') { togglePause(); fullscreen(); }
  else if (ev.type === 'wheel') volume(ev.dy < 0 ? 5 : -5);
  else if (ev.type === 'contextmenu') options({ x: ev.x, y: ev.y });
}
onPointerMove((ev) => { if (!P) return; if (ev.win === 'mini') return miniHover(true); showUi(); });
document.addEventListener('mousemove', () => { if (P && !layout.mini) showUi(); }, { passive: true });
export function fullscreen(on = !layout.fs) { layout.fs = on; T?.win?.fullscreen(on); document.body.classList.toggle('fs', on); setTimeout(place, 80); }
function dock(on = !layout.docked) {
  if (!P) return;
  if (on && !P.game && !P.R?.gameId) { say('No game on this channel'); return; }
  layout.docked = on;
  document.body.classList.toggle('docked', on);
  pv().querySelector('.pv-dock').hidden = !on;
  drawDock();
  requestAnimationFrame(place);
}
// controls up on any move or key, hidden after 3 s of rest (never while paused); the pointer hides with them
function showUi() {
  const now = Date.now();
  if (now - lastMove < 60 && uiUp) return;
  lastMove = now;
  if (P?.dim) { P.dim = false; }
  if (!uiUp) { uiUp = true; draw(); }
  setCursor('main', '');
  clearTimeout(hideT);
  hideT = setTimeout(hideUi, 3000);
}
function hideUi() {
  if (!P || layout.mini) return;
  if (M?.pause || P.err || P.ended || document.querySelector('#floats .fl')) { hideT = setTimeout(hideUi, 3000); return; }
  uiUp = false;
  setCursor('main', 'none');
  draw();
}

// ---------- what the screen says ----------
const chNow = () => (P?.mode === 'live' ? P.ring[P.index] : null);
const isGame = () => !!(P?.R?.gameId || P?.game);
function replayView() {
  const R = P.R, src = R.sources?.[R.source] || {};
  const ws = src.windowStart || 0, win = R.windowMs || 0;
  const pos = (M?.t || 0) * 1000;
  const livePt = ws ? Math.max(0, Math.min(win, Date.now() - ws - (src.delay || 0) * 1000)) : win;
  const chapters = (R.chapters || []).filter((c) => c.at <= livePt);
  const cur = [...chapters].reverse().find((c) => c.at <= pos + 2000);
  const nextCh = chapters.find((c) => c.at > pos + 5000 && c.key !== 'tip');
  const hiddenNow = R.hidden && !(R.gameId && isSeen(gameById(R.gameId) || { id: R.gameId }));
  return { R, ws, win, pos, livePt, chapters, cur, nextCh, hiddenNow, src, live: livePt < win - 60e3 && Date.now() - ws < win };
}
const chapterWord = (c) => (!c ? '' : c.key === 'tip' ? 'Q1' : c.label);
const resTag = () => { const h = M?.h || 0; return h >= 2000 ? '4K' : h >= 1000 ? '1080p' : h >= 700 ? '720p' : h ? `${h}p` : ''; };
const mpvLine = () => (MPV ? (M?.hwdec ? 'mpv, hardware decoding' : M?.h ? 'mpv' : '') : '');
function titleBlock() {
  if (P.mode === 'live') {
    const c = chNow(), m = meta[c.id] || {}, g = P.game;
    return { name: g ? g.title : m.now || cleanCh(c.name), sub: [c.num ? String(c.num) : '', cleanCh(c.name), m.end ? `until ${hm(m.end)}` : '', resTag()].filter(Boolean), what: g?.hidden ? `${ic('eyeOff')}Score hidden · the spoiler shield` : m.next ? `Next · ${esc(m.next)}` : '', live: true };
  }
  const e = P.entries[P.index] || {};
  if (P.R) {
    const R = P.R, ch = R.sources?.[R.source]?.channel;
    return { name: R.title, sub: [cleanCh(ch?.name || ''), R.kind === 'game' ? 'From tip-off' : 'Replay', resTag()].filter(Boolean), what: `<span class="tick">${ic('tick')}</span>${R.kind === 'programme' ? 'From the start' : 'From tip-off'} · the archive copy${mpvLine() ? ` · ${mpvLine()}` : ''}` };
  }
  const label = e.label ? `${esc(e.label)}${e.source && e.source !== 'provider' ? ` · ${esc(e.source)}` : ''}` : '';
  return { name: e.title || '', sub: [e.sub || '', resTag()].filter(Boolean), what: label || mpvLine() ? `<span class="tick">${ic('tick')}</span>${[label, mpvLine()].filter(Boolean).join(' · ')}` : '' };
}
function corner() {
  if (P.R) {
    const v = replayView();
    if (P.R.kind === 'game' || P.R.gameId) {
      const where = v.cur ? `You're in ${chapterWord(v.cur)}` : 'Before tip-off';
      const gap = v.live ? Math.round((v.livePt - v.pos) / MIN) : 0;
      const behind = v.live && gap >= 1 ? `${gap >= 60 ? `${Math.floor(gap / 60)} h ${gap % 60} min` : `${gap} min`} behind live` : '';
      return v.hiddenNow ? [`${ic('eyeOff')}Score hidden`, esc([where, behind].filter(Boolean).join(' · '))] : [esc(where), esc(behind || 'Replay')];
    }
    const left = Math.max(0, v.win - v.pos) / 1000;
    return [`Ends at ${hm(Date.now() + left * 1000)}`, leftText(left)];
  }
  if (P.mode === 'live') {
    const g = P.game;
    if (g) {
      if (g.hidden) return [`${ic('eyeOff')}Score hidden`, esc(g.started === false ? g.clock : 'Live')];
      return [esc(g.clock || ''), g.synced != null || g.delay ? `Synced · the score waits ${g.delay ?? 42} s for the picture` : ''];
    }
    const m = meta[chNow().id] || {};
    return m.end ? [`Ends at ${hm(m.end)}`, leftText((m.end - Date.now()) / 1000)] : ['', ''];
  }
  const d = M?.d, t = M?.t || 0;
  if (M?.pause && d) return ['Paused', `Ends at ${hm(Date.now() + (d - t) * 1000)} if you play now`];
  return d ? [`Ends at ${hm(Date.now() + (d - t) * 1000)}`, leftText(d - t)] : ['', ''];
}
function trackModel() {
  if (P.R) {
    const v = replayView();
    const ticks = v.chapters.map((c) => ({ at: c.at / v.win, label: c.label === 'Halftime' ? 'Half' : c.key === 'tip' ? 'Tip-off' : c.label, on: v.cur === c }));
    return { p: v.pos / v.win, live: v.live ? v.livePt / v.win : null, ahead: v.live ? v.livePt / v.win : null, ticks, left: fmtTime(v.pos / 1000), right: v.hiddenNow ? 'End hidden' : `−${fmtTime((v.win - v.pos) / 1000)}`, endHidden: v.hiddenNow, seek: true, dur: v.win / 1000 };
  }
  if (P.mode === 'live') {
    const m = meta[chNow().id] || {};
    const p = m.start && m.end ? (Date.now() - m.start) / (m.end - m.start) : 1;
    return { p: Math.max(0, Math.min(1, p)), live: null, ticks: [], left: m.start ? hm(m.start) : '', right: m.end ? hm(m.end) : '', liveEnd: true, seek: false };
  }
  const d = M?.d || 0, t = M?.t || 0;
  const seg = segNow();
  const ticks = seg ? [...(seg.intro || []), ...(seg.credits || [])].filter((w) => w.start > 0 && d).map((w) => ({ at: w.start / 1000 / d, label: '' })) : [];
  return { p: d ? t / d : 0, ticks, left: fmtTime(t), right: d ? `−${fmtTime(d - t)}` : '', seek: d > 0, dur: d };
}
const pct = (x) => `${(Math.max(0, Math.min(1, x || 0)) * 100).toFixed(2)}%`;

// ---------- drawing (the float layer) ----------
const HINTS = 'tuner.dkHint';
const hintDue = (k) => { try { return ((JSON.parse(localStorage.getItem(HINTS) || '{}'))[k] || 0) < 5; } catch { return false; } };
const hintSeen = (k) => { try { const m = JSON.parse(localStorage.getItem(HINTS) || '{}'); m[k] = (m[k] || 0) + 1; localStorage.setItem(HINTS, JSON.stringify(m)); } catch { /* none */ } };
function hintLine() {
  const k = P.mode === 'live' ? (P.game ? 'game' : 'live') : P.R ? 'replay' : P.entries[P.index]?.kind === 'episode' || P.entries.length > 1 ? 'episode' : 'film';
  if (!hintDue(k)) return '';
  if (!P.hinted) { P.hinted = true; hintSeen(k); }
  const H = {
    episode: 'Space Pause · ← → 10 s · ↑ ↓ Volume · F Full screen · P Mini player · C Subtitles · ? All shortcuts',
    film: 'Space Pause · ← → 10 s · ↑ ↓ Volume · F Full screen · C Subtitles · ? All shortcuts',
    game: 'Space Pause · End Back to live · G Game panel · P Mini player · PgUp PgDn Feeds · ? All shortcuts',
    live: 'PgUp PgDn Zap · 0–9 Channel · L Channels · F Full screen · P Mini player · ? All shortcuts',
    replay: 'Space Pause · ← → 1 min · End Back to live · G Game panel · ? All shortcuts',
  };
  return `<div class="pv-hint">${esc(H[k])}</div>`;
}
const disc = (act, icon, label, key, cls = '') => `<button class="pv-k ${cls}" data-act="${act}" aria-label="${esc(label)}" data-tip="${esc(tip(label, key))}">${icon}</button>`;
function buttonsHtml() {
  const paused = !!M?.pause, game = isGame(), live = P.mode === 'live' && !P.R;
  const step = game ? 60 : 10;
  const left = [disc('pause', ic(paused ? 'play' : 'pause'), paused ? 'Play' : 'Pause', 'p-pause', 'big')];
  if (!live) {
    if (game) left.push(disc('start', ic('prev'), 'From tip-off', 'l-start'));
    left.push(`<button class="pv-k" data-act="rew" data-tip="${esc(tip(`Back ${step === 60 ? '1 min' : '10 s'}`, 'p-seek'))}">${ic('rew')}<small>${step === 60 ? '1m' : '10'}</small></button>`, `<button class="pv-k" data-act="fwd" data-tip="${esc(tip(`Forward ${step === 60 ? '1 min' : '10 s'}`, 'p-seek'))}">${ic('fwd')}<small>${step === 60 ? '1m' : '10'}</small></button>`);
  } else left.push(disc('zapup', ic('chevU'), 'Channel up', 'l-zap'), disc('zapdown', ic('chevD'), 'Channel down', 'l-zap'));
  const acts = [];
  const sk = skipNow();
  if (sk) acts.push(`<button class="pv-act on" data-act="skip-seg">${ic('fwd')}${esc(sk.label)}<span class="k">Enter</span></button>`);
  if (P.R && (P.R.gameId || P.R.kind === 'game')) {
    const v = replayView();
    if (v.nextCh) acts.push(`<button class="pv-act" data-act="skipch">Skip to ${esc(v.nextCh.label === 'Halftime' ? 'Half' : v.nextCh.label)} ${ic('chevR')}</button>`);
    if (v.live && P.R.live) acts.push(`<button class="pv-act" data-act="tolive"><span class="a-live compact">Live</span>Back to live</button>`);
  } else if (live && P.game?.kept && P.game?.started) acts.push(`<button class="pv-act" data-act="tipoff">${ic('tipoff')}From tip-off</button>`);
  if (hasNext()) acts.push(`<button class="pv-act" data-act="next" data-tip="${esc(tip('Next episode', 'p-next'))}">Next episode ${ic('chevR')}</button>`);
  if (P.mode === 'vod' && !P.R && P.entries.length > 1) acts.push(`<button class="pv-act" data-act="eps" data-tip="${esc(tip('Episodes', 'p-eps'))}">${ic('list')}Episodes</button>`);
  if (game) acts.push(`<button class="pv-act${layout.docked ? ' sel' : ''}" data-act="panel" data-tip="${esc(tip(layout.docked ? 'Hide the panel' : 'Game panel', 'p-panel'))}">${ic('panel')}Game panel</button>`);
  const vol = Math.round(M?.volume ?? 100);
  const right = [
    disc('subs', ic('cc'), 'Subtitles', 'p-subs'),
    `<span class="pv-vol${floatRoot('main').querySelector('.pv-vol.hov') ? ' hov' : ''}" data-hover="1"><button class="pv-k" data-act="mute" data-tip="${esc(tip(M?.mute ? 'Unmute' : 'Mute', 'p-mute'))}">${ic(M?.mute || vol === 0 ? 'mute' : 'vol')}</button><span class="vs"><span class="vt" data-act="volset"><i style="width:${M?.mute ? 0 : Math.min(100, vol)}%"></i></span><b>${M?.mute ? 0 : vol}</b></span></span>`,
    disc('options', ic('gear'), 'Options', 'p-options'),
    disc('mini', ic('pip'), 'Mini player', 'p-mini'),
    disc('full', ic(layout.fs ? 'unfull' : 'full'), layout.fs ? 'Leave full screen' : 'Full screen', 'p-full'),
  ];
  return `<div class="pv-btns">${left.join('')}<span class="pv-acts">${acts.join('')}</span><span class="sp"></span>${right.join('')}</div>`;
}
function trackHtml() {
  const m = trackModel();
  const marks = m.ticks.filter((t, i, l) => t.label && !l.slice(0, i).some((x) => Math.abs(x.at - t.at) < 0.05)).map((t) => `<span class="ch${t.on ? ' on' : ''}" style="left:${pct(t.at)}">${esc(t.label)}</span>`).join('');
  return `<div class="pv-track${m.seek ? ' seek' : ''}" style="--p:${pct(m.p)}" data-act="${m.seek ? 'seekbar' : ''}"><div class="t"></div>${m.ahead != null ? `<div class="ahead" style="left:${pct(m.ahead)}"></div>` : ''}<div class="pp"></div>${m.ticks.map((t) => `<div class="tick" style="left:${pct(t.at)}"></div>`).join('')}${m.live != null ? `<div class="ld" style="left:${pct(m.live)}"></div>` : ''}${m.seek ? '<div class="th"></div>' : ''}<div class="bub" hidden></div></div>
    <div class="pv-ends"><span class="l">${esc(m.left)}</span>${marks}${m.live != null ? `<span class="a-live compact" style="left:${pct(m.live)}">Live</span>` : ''}<span class="r">${m.endHidden ? `${ic('eyeOff')}End hidden` : m.liveEnd ? '<span class="a-live compact">Live</span>' : esc(m.right)}</span></div>`;
}
function msgHtml() {
  if (P.err) {
    if (P.err === 'missing') return '<div class="pv-msg"><b>The player is not installed</b><p>airglow\'s copy of mpv is missing. Reinstall airglow from the GitHub release.</p><div class="act"><button class="pill noicon" data-act="reinstall">Get airglow</button></div></div>';
    const lim = typeof P.err === 'object' && P.err.limit;
    const nx = lim ? null : nextCopy();
    return `<div class="pv-msg"><b>${esc(lim ? P.err.text : 'This stream stopped')}</b><p>${lim ? 'Stop it on the other device, then try again.' : esc(String(P.err))}</p>${nx ? `<p class="nx">Next: ${esc(nx.line)}</p>` : ''}<div class="act">${nx ? '<button class="pill noicon" data-act="nextcopy">Try the next copy</button>' : ''}<button class="${nx ? 'ghost' : 'pill noicon'}" data-act="retry">Try again</button><button class="ghost" data-act="external">Open in mpv's own window</button></div></div>`;
  }
  const slow = (P.waiting && Date.now() - (P.startedAt || 0) > 2000) || M?.buffering;
  return slow ? '<div class="pv-msg spin-only"><span class="spin"></span></div>' : '';
}
function bannerHtml() {
  if (P.mode !== 'live' || Date.now() > bannerUntil) return '';
  const c = chNow(), m = meta[c.id] || {};
  const p = m.start && m.end ? (Date.now() - m.start) / (m.end - m.start) : 0;
  return `<div class="pv-banner">${tileOf(c)}<div class="col"><div class="no">${esc(String(c.num || ''))} · ${esc(cleanCh(c.name))}${P.game ? '' : ' <span class="a-live compact">Live</span>'}</div><b>${esc(P.game ? P.game.title : m.now || 'No guide information')}</b>${m.start ? `<div class="tm">${hm(m.start)} – ${hm(m.end)}<span class="bar4"><i style="width:${pct(p)}"></i></span>${m.next ? `<span>Next · ${esc(m.next)}${m.nextStart ? ` ${hm(m.nextStart)}` : ''}</span>` : ''}</div>` : ''}</div><div class="feeds">${esc(P.ringName)} · ${P.index + 1} of ${P.ring.length}</div></div>`;
}
function upnextHtml() {
  const u = P.upnext;
  const nl = nextLine();
  if (!u || u.cancelled) return u?.endCard ? `<div class="pv-upnext"><span class="disc">${ic('next')}</span><div class="col"><small>Next episode</small><b>${esc(nl.title)}</b><span>${esc(nl.sub)}</span></div><button class="pill noicon" data-act="upnow">Play now · Enter</button><button class="ghost" data-act="close">Close</button></div>` : '';
  const left = Math.max(0, Math.ceil((u.at + 15000 - Date.now()) / 1000));
  return `<div class="pv-upnext"><span class="ring" style="--p:${pct(1 - left / 15)}"><b>${left}</b></span><div class="col"><small>Next episode in ${left} s</small><b>${esc(nl.title)}</b><span>${esc(nl.sub)}</span></div><button class="pill noicon" data-act="upnow">Play now · Enter</button><button class="ghost" data-act="upstay">Stay here</button></div>`;
}
let lastHtml = '';
function draw() {
  if (!P) { floatRoot('main').querySelector('.pv-layer')?.remove(); return; }
  if (layout.mini) { drawMini(); emit('player-ui'); return; }
  const tb = titleBlock();
  const [c1, c2] = corner();
  const chip = skipChipHtml();
  const html = `<div class="pass pv-layer${uiUp || M?.pause || P.err ? ' up' : ''}${P.dim ? ' dim' : ''}${layout.docked ? ' docked' : ''}${layout.fs ? ' fs' : ''}">
    <div class="nohit pv-scrim-t"></div><div class="nohit pv-scrim-b"></div>
    <div class="pv-top"><h1>${esc(tb.name)}</h1><div class="sub"><span>${esc(tb.sub.join(' · '))}</span>${tb.live && !P.R ? '<span class="a-live compact">Live</span>' : ''}</div>${tb.what ? `<div class="what">${tb.what}</div>` : ''}</div>
    <div class="pv-corner"><b>${c1}</b><span>${c2 || ''}</span></div>
    <div class="pv-bottom">${upnextHtml()}${buttonsHtml()}${trackHtml()}${hintLine()}</div>
    ${bannerHtml()}${chip}${msgHtml()}${P.say ? `<div class="pv-say">${esc(P.say)}</div>` : ''}
  </div>`;
  const layer = floatRoot('main').querySelector('.pv-layer');
  if (html === lastHtml && layer) return;
  lastHtml = html;
  const box = layer || floatRoot('main');
  if (layer) layer.outerHTML = html; else box.insertAdjacentHTML('afterbegin', html);
  placeLayer();
  emit('player-ui');
}
// the layer sits over the stage (theater, full screen) or the stage and the band (docked)
function placeLayer() {
  const l = floatRoot('main').querySelector('.pv-layer');
  const st = stageRect();
  if (!l || !st) return;
  const band = pv().querySelector('.pv-band')?.getBoundingClientRect();
  const h = layout.docked && band ? band.bottom - st.y : st.h;
  Object.assign(l.style, { left: `${st.x}px`, top: `${st.y}px`, width: `${st.w}px`, height: `${h}px`, '--ph': `${st.h}px` });
}
function drawTrack() {
  const l = floatRoot('main').querySelector('.pv-layer');
  if (!l || !P || layout.mini) { if (layout.mini) drawMini(); return; }
  if (P.upnext || P.say || P.mode === 'live' || P.R) { draw(); return; }
  const m = trackModel();
  const tr = l.querySelector('.pv-track');
  if (tr && !dragging) tr.style.setProperty('--p', pct(m.p));
  const a = l.querySelector('.pv-ends .l'); if (a && a.textContent !== m.left) a.textContent = m.left;
  const b = l.querySelector('.pv-ends .r'); if (b && !m.endHidden && b.textContent !== m.right) b.textContent = m.right;
  const [c1, c2] = corner();
  const co = l.querySelector('.pv-corner');
  const ch = `<b>${c1}</b><span>${c2 || ''}</span>`;
  if (co && co.innerHTML !== ch) co.innerHTML = ch;
  const sk = !!skipNow(), had = !!l.querySelector('[data-act="skip-seg"]');
  if (sk !== had || !!skipChipHtml() !== !!l.querySelector('.pv-chip')) { lastHtml = ''; draw(); }
}
export function stripHtml() {
  const tb = P ? titleBlock() : { name: '' };
  return `<img class="mk" src="tv/brand/assets/mark-small.svg" alt="airglow" draggable="false"><button class="pv-back" data-act="pback" data-tip="Back · Esc">${ic('back')}<span>${esc(from)}</span></button><div class="pv-strip-t">${esc(tb.name)}${tb.sub?.length ? `<small>${esc(tb.sub.join(' · '))}</small>` : ''}</div>`;
}

// ---------- the pointer on the controls ----------
let dragging = null;
floatRoot('main').addEventListener('click', (e) => {
  if (!P || !e.target.closest('.pv-layer')) return;
  const b = e.target.closest('[data-act]');
  showUi();
  if (b) act(b.dataset.act, e, b);
});
floatRoot('main').addEventListener('mousedown', (e) => {
  const tr = e.target.closest('.pv-track.seek');
  if (!tr || !P) return;
  dragging = { tr };
  scrub(e.clientX);
  const mv = (ev) => scrub(ev.clientX);
  const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); const to = dragging?.to; dragging = null; if (to != null) seekTo(to); };
  window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
});
// (the overlay's hover reaches the page as mouseover / mouseout on [data-hover]: the volume slider unfolds the same in both)
floatRoot('main').addEventListener('mouseover', (e) => { const v = e.target.closest?.('.pv-vol'); if (v) v.classList.add('hov'); });
floatRoot('main').addEventListener('mouseout', (e) => { const v = e.target.closest?.('.pv-vol'); if (v && !v.contains(e.relatedTarget)) v.classList.remove('hov'); });
floatRoot('main').addEventListener('mousedown', (e) => {
  const vt = e.target.closest('.vt');
  if (!vt) return;
  const set = (x) => { const r = vt.getBoundingClientRect(); const v = Math.round(Math.max(0, Math.min(1, (x - r.left) / r.width)) * 100); setVolume(v); };
  set(e.clientX);
  const mv = (ev) => set(ev.clientX);
  const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
  window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
});
function scrub(x) {
  const tr = dragging.tr, r = tr.getBoundingClientRect();
  let f = Math.max(0, Math.min(1, (x - r.left) / r.width));
  let sec;
  if (P.R) { const v = replayView(); let ms = f * v.win; if (v.live) ms = Math.min(ms, v.livePt - 5000); f = ms / v.win; sec = ms / 1000; } else sec = (M?.d || 0) * f;
  dragging.to = sec;
  tr.style.setProperty('--p', pct(f));
  const bub = tr.querySelector('.bub');
  if (bub) { bub.hidden = false; bub.style.left = pct(f); bub.textContent = fmtTime(sec); }
}
function act(a, e, b) {
  if (a === 'pause') return togglePause();
  if (a === 'rew' || a === 'fwd') return seekBy((a === 'rew' ? -1 : 1) * (isGame() ? 60 : 10));
  if (a === 'start') return seekTo(0);
  if (a === 'zapup' || a === 'zapdown') return tune(P.index + (a === 'zapup' ? -1 : 1));
  if (a === 'mute') return mute();
  if (a === 'volset') return;
  if (a === 'subs') return subsMenu();
  if (a === 'options') return options();
  if (a === 'mini') return toMini();
  if (a === 'full') return fullscreen();
  if (a === 'retry') { failedOnce = false; return load(); }
  if (a === 'nextcopy') { const nx = nextCopy(); if (nx) nx.go(); return; }
  if (a === 'external') return handOff(P.src?.url);
  if (a === 'reinstall') return T?.openExternal?.('https://github.com/Burger-Nice/tuner/releases/latest');
  if (a === 'next') return goNext();
  if (a === 'eps') return episodesSheet();
  if (a === 'skipch') { const n = replayView().nextCh; if (n) seekTo(Math.max(0, n.at / 1000 - 10)); return; }
  if (a === 'tolive') return toLive();
  if (a === 'tipoff') return emitEvent({ type: 'tipoff', session: P.s });
  if (a === 'panel') return dock();
  if (a === 'skip-seg') return doSkip('press');
  if (a === 'upnow') return goNext();
  if (a === 'upstay') { P.upnext = { ...P.upnext, cancelled: true }; draw(); return; }
  if (a === 'close') return end({});
  if (a === 'skipback') { const b0 = P.skipped; P.skipped = null; if (b0) seekTo(b0.from); return; }
  if (a === 'seekbar') return;
  void e; void b;
}
function togglePause() { if (!P || P.err) return; const to = !M?.pause; if (M) M.pause = to; mset('pause', to); draw(); }
function seekTo(sec) {
  if (!P || P.mode !== 'vod') return;
  let to = sec;
  if (P.R) { const rv = replayView(); if (rv.live) to = Math.min(to, rv.livePt / 1000 - 5); }
  if (M?.d) to = Math.min(to, M.d - 1);
  to = Math.max(0, to);
  if (M) M.t = to;
  mcmd(['seek', to, 'absolute+exact']);
  if (P.upnext && !P.upnext.cancelled) P.upnext = null;
  drawTrack();
}
function seekBy(sec) { if (!P || P.mode !== 'vod') return; seekTo((M?.t || 0) + sec); say(`${sec < 0 ? '−' : '+'}${Math.abs(sec) >= 60 ? `${Math.abs(sec) / 60} min` : `${Math.abs(sec)} s`}`, 900); }
function setVolume(v) { v = Math.max(0, Math.min(130, Math.round(v))); if (M) { M.volume = v; M.mute = false; } mset('volume', v); mset('mute', false); try { localStorage.setItem('tuner.dkVol', String(v)); } catch { /* none */ } draw(); }
function volume(d) { setVolume((M?.volume ?? 100) + d); say(`Volume ${Math.round(M?.volume ?? 100)}`, 900); }
function mute() { const to = !M?.mute; if (M) M.mute = to; mset('mute', to); draw(); }
function say(text, ms = 2600) { if (!P || !text) return; P.say = text; clearTimeout(P.sayT); P.sayT = setTimeout(() => { if (P) { P.say = ''; draw(); } }, ms); draw(); }
function toLive() {
  const R = P.R, ch = R?.live && (catalog.live?.byId.get(String(R.live.id)) || catalog.live?.byId.get(+R.live.id));
  if (!ch) { say('No live channel for this game'); return; }
  const go = () => { const ring = catalog.live?.items || [ch]; end({ quiet: true }); playLive(ch, ring, 'All channels'); };
  const g = R.gameId ? gameById(R.gameId) : null;
  if (g && shielded(g) && !isSeen(g)) confirm({ title: 'Going live may show the score', text: `${cleanCh(ch.name)} is live now. Your replay stays where you left it.`, no: 'Stay in the replay', yes: 'Go live', onYes: go });
  else go();
}

// ---------- live: tuning inside the ring ----------
function tune(i) {
  if (!P || P.mode !== 'live') return;
  const was = P.ring[P.index];
  P.index = (i + P.ring.length) % P.ring.length;
  if (was && was.id !== P.ring[P.index].id) lastLive = was.id;
  P.game = null; failedOnce = false;
  if (layout.docked) dock(false);
  emitEvent({ type: 'track', session: P.s, id: P.ring[P.index].id });
  load();
}
function showBanner() { bannerUntil = Date.now() + 4000; clearTimeout(bannerT); bannerT = setTimeout(() => draw(), 4100); emitEvent({ type: 'need-meta', session: P.s, ids: [P.ring[P.index].id] }); }
function groupsMenu(list) { radio('Channels', list.map((g) => ({ v: g.key, l: g.name, sub: `${g.count} channel${+g.count === 1 ? '' : 's'}` })), list.find((g) => g.name === P?.ringName)?.key, (k) => { if (P) emitEvent({ type: 'group', session: P.s, key: k }); }); }
function channelList() {
  if (!P || P.mode !== 'live') return;
  const n = P.ring.length, i = P.index;
  const ids = []; for (let k = -3; k <= 12 && ids.length < Math.min(n, 16); k++) ids.push((i + k + n) % n);
  const uniq = [...new Set(ids)];
  const want = uniq.map((x) => P.ring[x].id).filter((id) => !meta[id]);
  if (want.length) emitEvent({ type: 'need-meta', session: P.s, ids: want });
  const rows = uniq.map((x) => { const c = P.ring[x], m = meta[c.id] || {}; return `<button class="lv-ch${x === i ? ' cur' : ''}" data-act="${x}"><span class="no">${c.num || ''}</span>${tileOf(c)}<span class="col"><b>${esc(cleanCh(c.name))}</b><small>${esc(m.now || 'No guide information')}</small></span>${m.live ? '<span class="a-live compact">Live</span>' : ''}</button>`; }).join('');
  sheet(`<h3>Channels</h3><div class="sub">${esc(P.ringName)} · ${i + 1} of ${n} <button class="ghost sm" data-act="groups">Groups · Shift L</button></div><div class="body">${rows}</div>`, { cls: 'left', onClick: (a, t, close) => { if (a === 'groups') { close(); emitEvent({ type: 'need', session: P.s, what: 'groups' }); return; } close(); tune(+a); } });
}

// ---------- the keys (keys.js ids; main.js routes them here) ----------
export function key(id, e) {
  if (!P || layout.mini) { if (id === 'p-mini' && layout.mini) { fromMini(); return; } return false; }
  showUi();
  const live = P.mode === 'live' && !P.R;
  switch (id) {
    case 'p-pause': return togglePause();
    case 'p-seek': if (live) return false; return seekBy((/left|j/i.test(e.key) ? -1 : 1) * (isGame() ? 60 : 10));
    case 'p-seekbig': if (live) return false; return seekBy(/left/i.test(e.key) ? -60 : 60);
    case 'p-vol': return volume(/up/i.test(e.key) ? 5 : -5);
    case 'p-mute': return mute();
    case 'p-full': return fullscreen();
    case 'p-subs': return subsMenu();
    case 'p-audio': return audioMenu();
    case 'p-quality': return copiesMenu();
    case 'p-speed': if (P.mode !== 'vod' || P.R) return; return setSpeed(e.key === ']' ? 1 : -1);
    case 'p-options': return options();
    case 'p-panel': return dock();
    case 'p-mini': return toMini();
    case 'p-next': if (hasNext()) goNext(); return;
    case 'p-eps': return episodesSheet();
    case 'p-skip': if (skipNow()) return doSkip('press'); if (P.upnext) return goNext(); return false;
    case 'p-esc': return escape();
    case 'p-close': return end({});
    case 'l-zap': if (live) return tune(P.index + (/up/i.test(e.key) ? -1 : 1)); return false;
    case 'l-digits': if (live) return digit(e.key); return false;
    case 'l-last': if (live && lastLive) { const i = P.ring.findIndex((c) => c.id === lastLive); if (i >= 0) tune(i); } return;
    case 'l-list': if (live) return channelList(); return false;
    case 'l-groups': if (live) return emitEvent({ type: 'need', session: P.s, what: 'groups' }); return false;
    case 'l-tolive': if (P.R) return toLive(); if (live) { load(); return; } return false;
    case 'l-start': if (P.R || P.mode === 'vod') return seekTo(0); if (P.game?.kept) return emitEvent({ type: 'tipoff', session: P.s }); return false;
    case 'l-reveal': return reveal();
    default: return false;
  }
}
let digs = '', digT = 0;
function digit(d) { digs = (digs + d).slice(-4); say(`Channel ${digs}`, 1500); clearTimeout(digT); digT = setTimeout(() => { const n = +digs; digs = ''; const i = P?.ring.findIndex((c) => +c.num === n); if (i >= 0) tune(i); else say(`No channel ${n} in ${P?.ringName || 'this list'}`); }, 1300); }
// Esc: full screen, then the controls, then the player (SPEC 8's one ladder)
export function escape() {
  if (!P) return;
  if (layout.fs) return fullscreen(false);
  if (uiUp && !M?.pause && !P.err) { uiUp = false; setCursor('main', 'none'); draw(); return; }
  leave();
}
// leaving: a live game or channel goes to the mini player (Account › Playback), a film or an episode stops
export async function leave() {
  if (!P) return;
  const prefs = await T?.prefs?.get().catch(() => null);
  if ((P.mode === 'live' || P.R?.live) && MPV && prefs?.miniOnLeave !== false) return toMini();
  end({});
}
function reveal() {
  const g = P.game?.id ? gameById(P.game.id) : P.R?.gameId ? gameById(P.R.gameId) : null;
  if (!g) return;
  confirm({ title: `Reveal ${g.away.name} at ${g.home.name}?`, text: 'Its score shows everywhere on this PC from now on.', no: 'Keep it hidden', yes: 'Reveal', onYes: () => emitEvent({ type: 'reveal', session: P.s, id: g.id }) });
}
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
function setSpeed(d) { const cur = M?.speed || 1; const i = Math.max(0, Math.min(SPEEDS.length - 1, SPEEDS.indexOf(SPEEDS.reduce((a, b) => (Math.abs(b - cur) < Math.abs(a - cur) ? b : a))) + d)); mset('speed', SPEEDS[i]); if (M) M.speed = SPEEDS[i]; say(`Speed ${SPEEDS[i]}×`, 1200); }

// ---------- Options, subtitles, audio, copies ----------
function options(at) {
  const rows = [
    { label: 'Subtitles', sub: subLabel(), icon: 'cc', key: 'C', run: subsMenu },
    { label: 'Audio', sub: audioLabel(), icon: 'vol', key: 'A', run: audioMenu },
    P.mode === 'live' && !P.R ? { label: 'Feeds', sub: 'This channel at another quality', icon: 'tv', key: 'Q', run: copiesMenu } : !P.R ? { label: 'Quality and copies', sub: copiesSub(), icon: 'film', key: 'Q', run: copiesMenu } : null,
    P.mode === 'vod' && !P.R ? { label: `Speed · ${M?.speed || 1}×`, icon: 'fwd', key: '[ ]', run: () => radio('Speed', SPEEDS.map((x) => ({ v: x, l: `${x}×` })), M?.speed || 1, (x) => { mset('speed', +x); if (M) M.speed = +x; }) } : null,
    { label: `Picture size · ${P.fill ? 'Fill' : 'Fit'}`, icon: 'full', run: () => { P.fill = !P.fill; mset('panscan', P.fill ? 1 : 0); } },
    isGame() ? { label: 'Sync', sub: 'Keep the score behind the picture', icon: 'tipoff', run: syncMenu } : null,
    isGame() ? { label: layout.docked ? 'Hide the game panel' : 'Game panel', icon: 'panel', key: 'G', run: () => dock() } : null,
    seg0()?.show ? { label: 'Intros in this show', sub: { auto: 'Skipped by themselves', button: 'The Skip intro button', off: 'Off' }[seg0().mode] || 'Same as Account', icon: 'tipoff', run: introMenu } : null,
    { label: 'Connection', sub: connLine(), icon: 'globe', info: true },
    { label: 'Open in mpv\'s own window', icon: 'ext', run: () => handOff(P.src?.url) },
  ];
  menu('Options', rows, { at: at && at.x ? at : null });
}
function connLine() {
  const u = P.src?.url || '';
  let h = ''; try { h = new URL(u).host; } catch { /* none */ }
  return [/\.m3u8/i.test(u) ? 'HLS' : (u.split('?')[0].split('.').pop() || '').toUpperCase().slice(0, 4), resTag() || 'quality not known yet', M?.hwdec ? `hardware (${M.hwdec})` : 'software', M?.cache ? `${Math.round(M.cache)} s buffered` : '', h].filter(Boolean).join(' · ');
}
function syncMenu() {
  const g = P.game;
  const cur = g?.delay ?? 42;
  radio('Sync · how far behind live is the picture?', [0, 15, 30, 42, 60, 90, 120, 180].map((s) => ({ v: s, l: s ? `${s} s behind` : 'Live (no delay)', sub: s === cur ? 'now' : '' })), cur, (s) => { const now = Date.now(); emitEvent({ type: 'sync', session: P.s, at: now - (+s + 1) * 1000, seenAt: now, said: false }); });
}
const subTracks = () => (M?.tracks || []).filter((t) => t.type === 'sub');
const audioTracks = () => (M?.tracks || []).filter((t) => t.type === 'audio');
const trackName = (t) => [t.title || langName(t.lang) || t.lang || `Track ${t.id}`, t.title && t.lang ? langName(t.lang) || t.lang : '', t.codec ? t.codec.toUpperCase() : '', t.channels ? `${t.channels >= 6 ? '5.1' : t.channels === 2 ? 'stereo' : `${t.channels} ch`}` : ''].filter(Boolean).join(' · ');
function subLabel() { const s = subTracks().find((t) => t.selected); return s ? trackName(s) : P.subFile ? `${langName(P.subFile.lang) || P.subFile.lang} · found online` : 'Off'; }
function audioLabel() { const a = audioTracks().find((t) => t.selected); return a ? trackName(a) : ''; }
function subsMenu() {
  if (!P) return;
  if (!P.subs && P.mode === 'vod') emitEvent({ type: 'need', session: P.s, what: 'subs' });
  const files = P.subs?.files || [];
  const rows = [{ label: 'Subtitles off', icon: !subTracks().some((t) => t.selected) ? 'tick' : '', run: () => { mset('sid', 'no'); pickSet({ source: 'off' }); } }];
  for (const t of subTracks().filter((x) => !x.external)) rows.push({ label: trackName(t), sub: 'In the copy', icon: t.selected ? 'tick' : '', run: () => { mset('sid', t.id); pickSet({ source: 'file', id: `track:${t.lang}`, lang: t.lang }); } });
  for (const f of files) rows.push({ label: langName(f.lang) || f.lang, sub: ['Found online', f.verdict === 'unchecked' ? 'timing not checked' : '', f.release || ''].filter(Boolean).join(' · '), icon: P.subFile?.id === f.id ? 'tick' : '', run: () => addSubFile(f, true) });
  if (P.subFile || subTracks().some((t) => t.selected)) rows.push({ sep: true }, { label: 'Early', sub: 'Subtitles 0.5 s sooner', icon: 'rew', run: () => nudge(-0.5) }, { label: 'Late', sub: 'Subtitles 0.5 s later', icon: 'fwd', run: () => nudge(0.5) });
  menu('Subtitles', rows, { sub: P.subs?.status === 'looking' ? 'Looking online for your languages…' : (P.subs?.others || []).length ? `Other languages · ${P.subs.others.length}` : '' });
}
function pickSet(v) { if (P.subs?.title) emitEvent({ type: 'setting', session: P.s, key: 'subpick', title: P.subs.title, value: v }); }
async function addSubFile(f, picked) {
  if (!f?.text) return;
  P.subFile = f;
  await mcmd(['sub-add', `memory://${f.text}`, 'select', `airglow ${f.lang}`, f.lang]);
  mset('sub-speed', f.speed || 1);
  mset('sub-delay', (f.autoOffset || 0) + (f.mine || 0));
  if (picked) pickSet({ source: 'opensubtitles', id: f.id, lang: f.lang });
  draw();
}
function nudge(d) {
  const f = P.subFile;
  if (f) { f.mine = Math.max(-60, Math.min(60, (f.mine || 0) + d)); mset('sub-delay', (f.autoOffset || 0) + f.mine); emitEvent({ type: 'setting', session: P.s, key: 'subtime', title: P.subs?.title, copy: P.subs?.copy, sub: f.id, value: f.mine, release: f.release }); say(`Subtitles ${f.mine > 0 ? `${f.mine} s later` : f.mine < 0 ? `${-f.mine} s sooner` : 'on time'}`); }
  else mcmd(['add', 'sub-delay', d]).then(() => say(`Subtitles ${d > 0 ? 'later' : 'sooner'} · 0.5 s`));
}
// what the app picked for this title (subs.js forPlayer): a file's own track, a file found online, or off
function applySubPick() {
  const s = P?.subs;
  if (!s || P.subApplied === s) return;
  const p = s.pick;
  if (!p) return;
  // the copy's own English subtitles before an English file found online (the owner's rule)
  const ownEn = p.source === 'opensubtitles' && langName(p.lang) === 'English' ? subTracks().find((x) => !x.external && !x.forced && langName(x.lang) === 'English') : null;
  if (ownEn) { P.subApplied = s; mset('sid', ownEn.id); }
  else if (p.source === 'opensubtitles') { const f = (s.files || []).find((x) => x.id === p.id); if (f) { P.subApplied = s; addSubFile(f, false); } }
  else if (p.source === 'file') { const lang = String(p.id || '').replace(/^track:/, ''); const t = subTracks().find((x) => x.lang === lang || langName(x.lang) === langName(lang)); if (t) { P.subApplied = s; mset('sid', t.id); } }
  else if (p.source === 'off' && M?.tracks?.length) { P.subApplied = s; mset('sid', 'no'); }
}
function audioMenu() {
  const list = audioTracks();
  menu('Audio', list.length ? list.map((t) => ({ label: trackName(t), icon: t.selected ? 'tick' : '', run: () => mset('aid', t.id) })) : [{ label: 'One sound track', info: true }], { sub: list.length > 1 ? '' : 'This stream has no other tracks' });
}
// other copies while watching (the TV's Copies / Feeds; addons/PORT-NATIVE.md 2 to 4), as the iPhone does
const copyName = (c) => (c.label && c.label !== 'Copy' ? c.label : c.provider || !c.source || c.source === 'provider' ? 'Your provider' : c.source);
const srcName = (c) => (c.provider || !c.source || c.source === 'provider' ? 'Your provider' : c.source);
function chainOf(e) {
  if (!e) return [];
  if (!e._chain) {
    const first = { key: e.copyKey || e.id, source: e.source || 'provider', provider: !e.source || e.source === 'provider', label: e.label || '', url: e.url };
    e._chain = e.copies?.length ? [first, ...e.copies.filter((c) => c.key !== first.key).map((c) => ({ ...c }))] : [];
  }
  return e._chain;
}
const playingKey = (e) => e?._playing || chainOf(e)[0]?.key || '';
function copiesSub() {
  const e = P.entries[P.index], ch = chainOf(e);
  if (ch.length > 1) return `${ch.length} copies · playing ${copyName(ch.find((c) => c.key === playingKey(e)) || ch[0])}`;
  const n = P.versions?.list?.length || 0;
  return n > 1 ? `${n} copies` : 'Another copy of this';
}
const vodTime = () => Math.max(0, (M?.t || 0) - 5);
function copiesMenu() {
  if (!P) return;
  if (P.mode === 'live') return feedsMenu();
  const e = P.entries[P.index], ch = chainOf(e);
  if (ch.length > 1) {
    const now = playingKey(e);
    return menu('Copies', ch.map((c, i) => ({ label: copyName(c), sub: [srcName(c) !== copyName(c) ? srcName(c) : '', i === 0 ? 'Best' : '', c.key === now ? 'playing' : '', c.failed ? 'didn\'t play' : ''].filter(Boolean).join(' · '), icon: c.key === now ? 'tick' : 'film', run: () => switchCopy(c) })), { sub: 'Switching keeps your place' });
  }
  const v = P.versions;
  if (!v) { P.openCopies = true; emitEvent({ type: 'need', session: P.s, what: 'versions' }); const me = P; setTimeout(() => { if (P === me && P.openCopies) { P.openCopies = false; say('No other copies came'); } }, 6000); return; }
  const list = v.list || [];
  if (list.length < 2) return menu('Copies', [{ label: 'This is the only copy', sub: 'Your provider has one copy of this', icon: 'film', info: true }]);
  menu('Copies', list.map((x) => ({ label: x.line1 || x.name, sub: [x.line1 && x.name !== x.line1 ? x.name : x.label, x.line2 || (x.id === v.id ? 'playing' : '')].filter(Boolean).join(' · '), icon: x.id === v.id ? 'tick' : 'film', run: () => { if (x.id !== v.id) pickVersion(x); } })), { sub: 'Switching keeps your place' });
}
function feedsMenu() {
  const v = P.versions, c = chNow();
  if (!v || v.id !== String(c.id)) { P.openCopies = true; emitEvent({ type: 'need', session: P.s, what: 'versions' }); return; }
  const list = v.list || [];
  if (list.length < 2) return menu('Feeds', [{ label: 'This channel has one feed', sub: 'No other channel in your list has its name', icon: 'tv', info: true }]);
  menu('Feeds', list.map((x) => ({ label: x.name, sub: [x.label, x.id === v.id ? 'playing' : ''].filter(Boolean).join(' · '), icon: x.id === v.id ? 'tick' : 'tv', run: () => { if (x.id === v.id) return; const i = P.ring.findIndex((r) => r.id === x.id); if (i >= 0) { tune(i); say(`Switching to ${cleanCh(x.name)}`); return; } pending = { t: 0, say: `Switching to ${cleanCh(x.name)}`, at: Date.now() }; emitEvent({ type: 'pick', session: P.s, id: x.id, from: 'version' }); } })), { sub: 'The same channel at another quality' });
}
function pickVersion(x, next) {
  const t = vodTime();
  pending = { id: x.id, t, say: `Switching to ${x.line1 || x.name}`, at: Date.now() };
  say(`${pending.say}…`);
  emitEvent({ type: 'version', session: P.s, id: x.id, index: P.index, t, d: M?.d || 0, ...(next ? { next: true } : {}) });
}
function switchCopy(c) {
  const e = P.entries[P.index];
  if (c.key === playingKey(e)) { say('This copy is playing'); return; }
  const w = { key: c.key, t: vodTime(), label: copyName(c), index: P.index };
  P.switching = w;
  say(`Switching to ${w.label}…`);
  emitEvent({ type: 'need', session: P.s, what: 'copy', key: c.key, index: P.index });
  const me = P;
  setTimeout(() => { if (P === me && P.switching === w) { P.switching = null; say('That copy didn\'t answer · try another'); } }, 10000);
}
function gotCopy(x) {
  const w = P.switching;
  if (!w || !x || x.key !== w.key) return;
  P.switching = null;
  const e = P.entries[w.index], ch = chainOf(e), c = ch.find((y) => y.key === x.key);
  if (x.error || !x.entry?.url) { if (c) c.failed = true; say('That copy has gone · try another'); return; }
  P.entries[w.index] = { ...x.entry, title: x.entry.title || e.title, sub: x.entry.sub || e.sub, copies: e.copies, startAt: w.t, _chain: ch, _playing: x.key };
  if (w.index !== P.index) return;
  failedOnce = false;
  load();
  say(`Switching to ${w.label}`);
}
function copyFailed() {
  if (P.mode !== 'vod' || P.R) return;
  const e = P.entries[P.index], ch = chainOf(e);
  if (ch.length > 1) { const k = playingKey(e), c = ch.find((y) => y.key === k); if (c && !c.failed) { c.failed = true; emitEvent({ type: 'copy-failed', session: P.s, key: k }); } }
  else emitEvent({ type: 'failed', session: P.s, index: P.index });
}
function nextCopy() {
  if (!P || P.mode !== 'vod' || P.R) return null;
  const e = P.entries[P.index], ch = chainOf(e);
  if (ch.length > 1) { const k = playingKey(e), c = ch.find((y) => y.key !== k && !y.failed); return c ? { line: [copyName(c), srcName(c) !== copyName(c) ? srcName(c) : ''].filter(Boolean).join(' · '), go: () => switchCopy(c) } : null; }
  const nx = P.versions?.next;
  return nx ? { line: nx.line || 'Another copy', go: () => pickVersion({ id: nx.id, name: nx.line }, true) } : null;
}
function episodesSheet() {
  if (!P || P.mode !== 'vod' || P.entries.length < 2) return;
  sheet(`<h3>Episodes</h3><div class="sub">${P.entries.length - P.index - 1} after this one</div><div class="body">${P.entries.map((e, i) => `<button class="lr${i === P.index ? ' cur' : ''}" data-act="${i}">${i === P.index ? ic('play') : '<span class="ic-sp"></span>'}<span class="col">${esc(e.title || '')}<small>${esc(e.sub || '')}</small></span></button>`).join('')}</div>`, {
    onClick: (a, t, close) => { const i = +a; close(); if (i === P.index) return; sendProgress(true); P.index = i; P.upnext = null; emitEvent({ type: 'track', session: P.s, index: i }); load(); },
  });
}

// ---------- Skip intro / recap, Up next (design/ui-v1/skip/SPEC.md 3, 5) ----------
const seg0 = () => (P?.mode === 'vod' && !P.R ? segNow() : null);
function segNow() { const e = P?.entries?.[P.index]; if (!e) return null; return P.seg[`${e.kind || 'episode'}:${e.id}`] || Object.values(P.seg).find((s) => s.id.endsWith(`:${e.id}`)) || null; }
function windowNow() {
  const s = seg0(), t = (M?.t || 0) * 1000, d = (M?.d || 0) * 1000;
  if (!s || s.mode === 'off' || !d) return null;
  const end = (w) => (w.end || d);
  const win = (list, kind) => (list || []).find((w) => end(w) - w.start >= 8000 && t >= w.start && t < end(w) - 1000) && { kind, w: (list || []).find((w) => t >= w.start && t < end(w) - 1000) };
  return win(s.recap, 'recap') || win(s.intro, 'intro') || null;
}
function skipNow() { const w = windowNow(); if (!w) return null; return { ...w, label: w.kind === 'recap' ? 'Skip recap' : 'Skip intro' }; }
function skipChipHtml() {
  const w = skipNow();
  if (!w && P?.skipped && Date.now() < P.skipped.until) return `<div class="pv-chip"><span>${esc(P.skipped.label)}</span><button class="ghost sm" data-act="skipback">Back to ${esc(P.skipped.kind)}</button></div>`;
  if (!w || uiUp) return '';
  return `<button class="pv-chip pv-act on" data-act="skip-seg">${ic('fwd')}${esc(w.label)}<span class="k">Enter</span></button>`;
}
function doSkip(how) {
  const w = windowNow();
  if (!w) return;
  const d = (M?.d || 0) * 1000, to = ((w.w.end || d) - 500) / 1000;
  const s = seg0(), e = P.entries[P.index];
  P.skipped = { kind: w.kind, from: M?.t || 0, label: w.kind === 'recap' ? 'Recap skipped' : 'Intro skipped', until: Date.now() + 5000 };
  seekTo(to);
  if (s?.show) emitEvent({ type: 'skip', session: P.s, index: P.index, show: s.show.key, episode: s.show.episode, how, level: s.level, anchored: true, back: false });
  void e;
  draw();
}
function segments() {
  const s = seg0();
  if (!s || !M) return;
  const t = (M.t || 0) * 1000, d = (M.d || 0) * 1000;
  // skips by itself where the show says so (intro: mode auto; a recap after an episode he watched)
  for (const [kind, list] of [['recap', s.recap], ['intro', s.intro]]) {
    for (const w of list || []) {
      const k = `${kind}:${w.start}`;
      if (P.done[k] || !(t >= w.start && t < w.start + 2500)) continue;
      const auto = kind === 'intro' ? s.mode === 'auto' : s.recapAuto === true;
      if (auto && (w.end || d) - w.start >= 8000) { P.done[k] = true; doSkip('self'); }
    }
  }
  // Up next: at the credits (known), else the last 40 s of an episode with one after it
  if (hasNext() && !P.upnext && d) {
    const cr = (s.credits || [])[0]?.start || (s.preview || [])[0]?.start || 0;
    const at = cr > 0 && cr < d ? cr : d - 40000;
    if (t >= at && t < d - 1000) { P.upnext = { at: Date.now() }; draw(); }
  }
  if (P.upnext && !P.upnext.cancelled && Date.now() - P.upnext.at >= 15000) { P.upnext = { cancelled: true }; goNext(); }
  else if (P.upnext && !P.upnext.cancelled) draw();
}
function endCard() { P.upnext = { cancelled: true, endCard: true }; uiUp = true; draw(); }
function introMenu() {
  const s = seg0();
  radio('Intros in this show', [{ v: 'auto', l: 'Skip by themselves' }, { v: 'button', l: 'Show the Skip intro button' }, { v: '', l: 'Same as Account' }], s.show?.choice || '', (v) => emitEvent({ type: 'setting', session: P.s, key: 'skipShow', show: s.show.key, value: v || null, index: P.index }));
}

// ---------- the docked game panel (SPEC 6.3; the same component serves the game page) ----------
let dockTab = 'box', dockTeam = 'away';
export function panelHtml(g, { tab = dockTab, team = dockTeam, header = true } = {}) {
  if (!g) return '<div class="gp-empty">No game data yet</div>';
  const crest = (t) => `<span class="gp-crest" style="--te:${t.a || 'transparent'}">${crestImg({ abbr: t.abbr, logo: window.NBA?.logoFor?.(t.abbr) }, 44)}</span>`;
  const plate = g.hidden ? `<div class="gp-plate">${crest(g.away)}<div class="mid"><b class="hid">${ic('eyeOff')}Score hidden</b><small>${esc(g.started === false ? g.clock : 'The box score comes after the final buzzer')}</small></div>${crest(g.home)}</div>`
    : `<div class="gp-plate">${crest(g.away)}<b class="sc">${esc(g.score?.[0] ?? '–')}</b><div class="mid"><small>${esc(g.clock || '')}${g.delay ? ` · as aired · ${g.delay} s behind` : ''}</small></div><b class="sc">${esc(g.score?.[1] ?? '–')}</b>${crest(g.home)}</div>`;
  const tabs = [['box', 'Box score'], ['plays', 'Plays'], ['quarters', 'Quarters'], ['feeds', 'Feeds']].map(([k, l]) => `<button class="chip${tab === k ? ' sel' : ''}" data-gtab="${k}">${l}</button>`).join('');
  let body = '';
  if (tab === 'box') {
    if (g.hidden) body = '<div class="gp-note">The box score comes after the final buzzer · Reveal is in ⋯</div>';
    else {
      const b = g.box?.[team];
      body = `<div class="chips gp-team"><button class="chip${team === 'away' ? ' sel' : ''}" data-gteam="away">${esc(g.away.name)}</button><button class="chip${team === 'home' ? ' sel' : ''}" data-gteam="home">${esc(g.home.name)}</button></div>`
        + (b?.rows?.length ? `<table class="gp-box"><thead><tr><th>Player</th>${b.cols.slice(0, 6).map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr><td>${esc(r[0])}</td>${r.slice(1, 7).map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : `<div class="gp-note">${g.loading ? 'Loading the box score…' : 'No box score yet'}</div>`);
    }
    if (!g.hidden && (g.plays || []).length) body += `<div class="gp-h">Latest plays</div>${playsHtml(g.plays.slice(0, 6))}`;
  } else if (tab === 'plays') body = g.hidden ? '<div class="gp-note">Plays are hidden by the spoiler shield</div>' : playsHtml(g.plays || []);
  else if (tab === 'quarters') {
    const R = P?.R, v = R ? replayView() : null;
    body = v ? v.chapters.map((c) => `<button class="gp-row${v.cur === c ? ' on' : ''}" data-chap="${c.at}"><b>${esc(c.key === 'tip' ? 'Tip-off' : c.label)}</b><span>${fmtTime(c.at / 1000)}</span></button>`).join('') || '<div class="gp-note">The chapters come as ESPN sends the plays</div>' : `<div class="gp-note">${g.kept ? 'From tip-off has the chapters: ' : ''}Quarters are a replay's chapters. ${g.kept ? '<button class="ghost sm" data-act="tipoff">Watch from tip-off</button>' : ''}</div>`;
  } else body = (g.feeds || []).length ? g.feeds.map((f, i) => `<button class="gp-row" data-feed="${esc(f.id)}"><b>${esc(cleanCh(f.name))}</b><span>${esc(f.label)}${i === 0 ? ' · best' : ''}</span></button>`).join('') : '<div class="gp-note">No other channel carries this game</div>';
  return `${header ? `<div class="gp-head"><b>Game panel</b><span class="k">G</span><span class="sp"></span><button class="ib" data-act="gmore" aria-label="More">${ic('more')}</button><button class="ib" data-act="gclose" aria-label="Hide the panel" data-tip="Hide the panel · G">${ic('close')}</button></div>` : ''}${plate}<div class="chips gp-tabs">${tabs}</div><div class="gp-body">${body}</div>`;
}
const playsHtml = (list) => list.map((p) => `<div class="gp-play${p.scoring ? ' sc' : ''}"><span class="c">${esc(p.clock)}</span><span class="t">${p.scoring ? '<i></i>' : ''}${esc(p.text)}</span>${p.score ? `<b>${esc(p.score)}</b>` : ''}</div>`).join('') || '<div class="gp-note">No plays yet</div>';
function gameView() {
  if (P?.game) return P.game;
  const g = P?.R?.gameId ? gameById(P.R.gameId) : null;
  if (!g) return null;
  const pal = (t) => ({ ...t, ...teamPalette(t) });
  return { id: g.id, title: `${g.away.name} at ${g.home.name}`, away: pal(g.away), home: pal(g.home), hidden: replayView().hiddenNow, score: replayView().hiddenNow ? null : [String(g.away.score), String(g.home.score)], clock: replayView().cur ? `You're in ${chapterWord(replayView().cur)}` : '', plays: [], feeds: [], box: null, kept: true };
}
function drawDock() {
  const d = pv()?.querySelector('.pv-dock');
  if (!d || d.hidden) return;
  const html = panelHtml(gameView());
  if (d._html !== html) { const y = d.querySelector('.gp-body')?.scrollTop || 0; d.innerHTML = html; d._html = html; const b = d.querySelector('.gp-body'); if (b) b.scrollTop = y; }
}
function dockClick(e) {
  const t = e.target.closest('[data-gtab]'); if (t) { dockTab = t.dataset.gtab; drawDock(); return; }
  const tm = e.target.closest('[data-gteam]'); if (tm) { dockTeam = tm.dataset.gteam; drawDock(); return; }
  const ch = e.target.closest('[data-chap]'); if (ch) { seekTo(Math.max(0, +ch.dataset.chap / 1000 - 10)); return; }
  const f = e.target.closest('[data-feed]'); if (f) { const i = P.ring?.findIndex((c) => c.id === f.dataset.feed); if (i >= 0) tune(i); else emitEvent({ type: 'pick', session: P.s, id: f.dataset.feed, from: 'feed' }); return; }
  const b = e.target.closest('[data-act]');
  if (b?.dataset.act === 'gclose') dock(false);
  if (b?.dataset.act === 'gmore') menu('Game panel', [{ label: 'Reveal the score', sub: 'Ctrl Shift R', icon: 'eye', run: reveal }, { label: 'Sync', icon: 'tipoff', run: syncMenu }]);
  if (b?.dataset.act === 'tipoff') emitEvent({ type: 'tipoff', session: P.s });
}
pv()?.addEventListener('keydown', (e) => { if (e.key === 'Tab' && layout.docked && e.target.closest?.('.pv-dock')) { e.preventDefault(); const k = ['box', 'plays', 'quarters', 'feeds']; dockTab = k[(k.indexOf(dockTab) + 1) % 4]; drawDock(); } });
void tabT;

// ---------- the mini player (SPEC 6.1, 9): the host moves into its own always-on-top window ----------
let miniSize = { width: 480, height: 270 }, miniUp = false, miniT = 0;
export async function toMini() {
  if (!P || !MPV || !mid || layout.mini) return;
  const b = await T.mini.open();
  miniSize = { width: b.width, height: b.height };
  layout.mini = true;
  if (layout.fs) { T.win.fullscreen(false); layout.fs = false; }
  await T.host.moveTo(mid, 'mini');
  T.host.rect(mid, { x: 0, y: 0, w: miniSize.width, h: miniSize.height });
  exitTheater();
  sizeRoot('mini', miniSize.width, miniSize.height);
  setPictures('mini', [{ id: mid, x: 0, y: 0, w: miniSize.width, h: miniSize.height }], (ev) => miniPointer({ ...ev, win: 'mini' }));
  setMirror('mini', true);
  drawMini();
  emit('player-ui');
}
export async function fromMini() {
  if (!P || !layout.mini) return;
  layout.mini = false;
  setMirror('mini', false);
  floatRoot('mini').innerHTML = '';
  await T.host.moveTo(mid, 'main');
  enterTheater();
  T.mini.close();
}
export function toggleMini() { if (layout.mini) fromMini(); else if (P) toMini(); }
export function toggleTop() { if (!layout.mini) return; P.top = P.top === false; T.mini.top(P.top); say(P.top ? 'Always on top' : 'Not on top'); }
T?.mini?.onState?.((s) => {
  if (s.closed && layout.mini) { layout.mini = false; mid = ''; M = null; end({}); }
  if (s.size && layout.mini) { miniSize = { width: s.size.width, height: s.size.height }; T.host.rect(mid, { x: 0, y: 0, w: miniSize.width, h: miniSize.height }); sizeRoot('mini', miniSize.width, miniSize.height); setPictures('mini', [{ id: mid, x: 0, y: 0, w: miniSize.width, h: miniSize.height }]); drawMini(); }
});
function miniPointer(ev) {
  miniHover(true);
  if (ev.type === 'click') togglePause();
  if (ev.type === 'dblclick') fromMini();
  if (ev.type === 'wheel') volume(ev.dy < 0 ? 5 : -5);
}
function miniHover(on) { if (on !== miniUp) { miniUp = on; drawMini(); } clearTimeout(miniT); if (on) miniT = setTimeout(() => miniHover(false), 2500); }
export function miniState() {
  if (!P || !layout.mini) return null;
  const tb = titleBlock();
  const g = P.game;
  return { title: tb.name, sub: `In the corner · ${cleanCh(chNow()?.name || '')}${g?.hidden ? ' · Score hidden' : ''}`, pic: g ? `<span class="np-f" style="--away:${g.away.p};--home:${g.home.p}"></span>` : '' };
}
function drawMini() {
  if (!P || !layout.mini) return;
  const tb = titleBlock(), g = P.game, live = P.mode === 'live';
  const line = g?.hidden ? `${ic('eyeOff')}Score hidden` : live ? esc(corner()[0] || '') : esc(corner()[1] || '');
  const html = `<div class="pass mini-layer${miniUp || M?.pause ? ' up' : ''}"><div class="nohit mini-scrim"></div>
    <div class="mini-top" data-drag="1">${live ? '<span class="a-live compact">Live</span>' : ''}<span class="ch">${esc(cleanCh(chNow()?.name || tb.sub?.[0] || ''))}</span><span class="sp"></span><button class="ib" data-mact="top" aria-label="Pin">${ic('pin')}</button><button class="ib" data-mact="close" aria-label="Close">${ic('close')}</button></div>
    <div class="mini-bot"><div class="col"><b>${esc(tb.name)}</b><small>${line}</small></div><button class="ib" data-mact="pause" aria-label="Pause">${ic(M?.pause ? 'play' : 'pause')}</button><button class="ib" data-mact="mute" aria-label="Mute">${ic(M?.mute ? 'mute' : 'vol')}</button><button class="ib" data-mact="back" aria-label="Back to airglow">${ic('full')}</button></div></div>`;
  const r = floatRoot('mini');
  if (r._html !== html) { r.innerHTML = html; r._html = html; }
}
floatRoot('mini').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mact]');
  if (!b || !P) return;
  const a = b.dataset.mact;
  if (a === 'pause') togglePause();
  if (a === 'mute') mute();
  if (a === 'back') fromMini();
  if (a === 'top') toggleTop();
  if (a === 'close') end({});
  drawMini();
});

// ---------- media keys: registered only while airglow plays ----------
let mediaOn = false;
function mediaKeys() {
  const want = !!P && !!M && !(M.pause && pausedAt && Date.now() - pausedAt > 120e3);
  if (want !== mediaOn) { mediaOn = want; T?.media?.keys(want); }
}
T?.media?.onKey?.((k) => {
  if (!P) return;
  if (k === 'playpause') togglePause();
  if (k === 'next') { if (P.mode === 'live') tune(P.index + 1); else if (P.entries[P.index + 1]) nextEpisode(); }
  if (k === 'prev') { if (P.mode === 'live') tune(P.index - 1); else seekTo(0); }
  if (k === 'stop') end({});
});
on('nba', () => { if (P?.R) draw(); if (layout.docked) drawDock(); });
export function testState() {
  if (!P) return null;
  return { mode: P.mode, layout: { ...layout }, replay: !!P.R, url: P.src?.url ? P.src.url.replace(/\/\/[^/]+/, '//host') : '', playing: !!P.playing, err: P.err ? String(P.err.text || P.err) : '', t: M?.t || 0, mid, title: titleBlock().name, game: !!P.game, upnext: !!P.upnext, skip: !!skipNow(), ui: uiUp };
}
void S; void settings; void teamPalette;
