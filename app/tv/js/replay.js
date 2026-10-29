// Playing the past (design/ui-v1/catchup/SPEC.md 3, 5, 6): a game from tip-off (a channel's archive or a full-game video),
// a kept programme from its start, resuming either, and the sheets that pick where it plays from (the sources sheet,
// Choose a video). This is the app's side of the replay protocol; the player's side is written down in
// design/ui-v1/catchup/PORT-NATIVE.md. Until the native player speaks it (player.js replayNative()), a replay plays its
// first link through the native VOD mode as a stand-in, so the flows can be tried end to end.
import { esc, ic, dot, hm, teamPalette } from './util.js';
import { S, on, emit, settings, recordProgress, store, scoped } from './state.js';
import { catalog, ensure, prefLangs } from './catalog.js';
import { native } from './native.js';
import { pastFor, pastNow, guideNow, onNow } from './guide.js';
import {
  nba, gameById, shielded, hidden, isSeen, markSeen, reveal, replay, openReplay, closeReplay, replayProgress, asAired, chaptersOf,
  chapterAt, archiveShift, setArchiveShift, shiftKnown, replayDelay, setReplayDelay, setReplayPick, replayPick, wantSummary,
  fetchSummary, recentClocks, ordinal, isSporty, shieldMode, behindReplay, liveByClock, watchedOn,
} from './games.js';
import { findReplays, replaysOf, bestReplay, nightLabel, keptUntil, videosNaming, videoMask, matchVideo, WINDOW, etDate, datesIn, programmeView, keptFor, keptWords } from './catchup.js';
import { playLive, playVod, ctx, replayNative, playerCommand, startReplaySession } from './player.js';
import { push } from './router.js';
import { openOverlay, toast, confirmMenu, scrollList } from './ui.js';
import { focus } from './focus.js';

const MIN = 60e3, H = 3600e3, MARGIN = 90e3;   // asAired shows nothing later than the aired moment − 90 s (M6)
const gameName = (g) => `${g.away.name} at ${g.home.name}`;
const chOf = (id) => catalog.live?.byId.get(String(id)) || catalog.live?.byId.get(+id) || null;
const ringOf = () => catalog.live?.items || [];
// A message while the player is up goes to the player (the app's toast would sit behind it).
const say = (text, ms = 4000) => (ctx.cur && replayNative() ? playerCommand('show-text', text) : toast(text, ms));

// ---------- the links ----------
// A channel source's links for a window: the table's own start string when the game was matched in it (case 1), else
// the moment in the panel's zone (case 2), moved by the channel's archiveShift either way (3.5).
function linksOf(src, windowMs, shift = archiveShift(src.ch.id)) {
  const o = { shift, raw: src.prog?.raw || '' };
  return S.src?.catchup?.(src.ch, src.windowStart, src.windowStart + windowMs, o) || [];
}
// The positions inside a channel replay's window (ms): what aired at a wallclock moment sits at
// wallclock − the window's true start + replayDelay (the archive runs a little behind ESPN's clock).
const delayMs = (src) => (src.kind === 'channel' ? replayDelay(src.ch.id) * 1000 : 0);
const posOf = (src, wall) => wall - src.windowStart + delayMs(src);
const airedOf = (src, played) => src.windowStart + played - delayMs(src);

// ---------- what the player gets ----------
function chapterMarks(g, src) {
  if (src.kind !== 'channel') return [];
  const ch = chaptersOf(g.id);
  // Tip-off to Q4 are drawn ahead (they aren't secret); OT comes only in the as-aired answers, once played (M7)
  return ch.list.filter((c) => !c.key.startsWith('ot')).map((c) => ({ key: c.key, label: c.label, at: Math.max(0, posOf(src, c.at)) }));
}
function tipoffAt(g, src) {
  if (src.kind !== 'channel') return 0;
  const tip = chaptersOf(g.id).list.find((c) => c.key === 'tip');
  return Math.max(0, posOf(src, tip ? tip.at : g.date) - 10e3);
}
const sourceRow = (g, x, windowMs) => ({
  id: `${x.kind}:${x.id}`, kind: x.kind, name: x.name, detail: x.detail, badge: x.best ? 'Best' : x.badge || '',
  links: x.kind === 'channel' ? linksOf(x, windowMs) : [{ url: x.video.url, engine: 'native' }],
  windowStart: x.kind === 'channel' ? x.windowStart : 0, windowMs: x.kind === 'channel' ? windowMs : 0,
  chId: x.kind === 'channel' ? String(x.ch.id) : '', channel: x.kind === 'channel' ? { name: x.ch.name, num: x.ch.num || 0, logo: x.ch.logo || '' } : null,
  delay: x.kind === 'channel' ? replayDelay(x.ch.id) : 0, days: x.kind === 'channel' ? x.days || x.ch.archive || 0 : 0,
});
// The game as it aired, in the shape of the player's game data (player.js gameData), for the score bug, the game panel
// and the Live games row during a replay: asAired at the aired moment − 90 s, never show() / delayed().
function airedGame(g, src, played) {
  const t = (x) => { const c = teamPalette(x); return { abbr: x.abbr, name: x.name, p: c.p, a: c.a, fg: c.fg }; };
  const base = { id: g.id, title: gameName(g), away: t(g.away), home: t(g.home), replay: true, kind: src.kind, hidden: shielded(g) && !isSeen(g), feeds: [], shieldLabel: shieldMode() === 'all' ? 'All games' : 'My team' };
  if (src.kind !== 'channel') return { ...base, score: null, clock: 'Replay', moment: 'Replay', box: { away: { cols: [], rows: [] }, home: { cols: [], rows: [] } }, plays: [], chapters: [], loading: false };
  const wall = airedOf(src, played), at = wall - MARGIN, v = asAired(g, at);
  const ch = chaptersOf(g.id), boxOk = ch.buzzerAt && wall >= ch.buzzerAt + 2 * MIN;
  const s = nba.sums.get(g.id);
  const cols = ['MIN', 'PTS', 'REB', 'AST', 'FG'];
  const team = (side) => {
    const b = boxOk && s?.box.find((x) => x.abbr === g[side].abbr);
    if (!b) return { cols, rows: [] };
    const ix = cols.map((l) => b.labels.indexOf(l));
    return { cols, rows: b.players.filter((p) => !p.dnp).map((p) => [p.short || p.name, ...ix.map((i) => (i >= 0 ? String(p.stats[i] ?? '') : ''))]) };
  };
  return {
    ...base, loading: !v, score: v?.score || null, clock: v ? v.label : 'Tip-off', moment: v?.state === 'in' ? `${v.label} · as aired` : 'Before tip-off',
    chapters: (v?.chapters || []).map((c) => ({ key: c.key, label: c.label, at: Math.max(0, posOf(src, c.at)) })),
    plays: (v?.plays || []).map((p) => ({ clock: `${ordinal(p.period)} ${p.clock}`, team: p.team || '', text: p.text || '', scoring: !!p.scoring, score: p.scoring ? `${p.away}–${p.home}` : '' })),
    box: { away: team('away'), home: team('home') }, boxReady: !!boxOk,
  };
}

// ---------- the open replay ----------
// cur: { g?, ch?, prog?, item (the progress item), sources (sorted), src (the one playing), windowMs, standIn, session, extended }
let cur = null;
window.__replay = null;   // (the tests read what was sent to the player)
const progKey = (item) => `rp:${item.id}`;
function saveProgress(played, force) {
  if (!cur) return;
  const it = cur.item, src = cur.src;
  it.src = `${src.kind}:${src.id}`; it.windowStart = src.windowStart || 0;
  if (cur.g && src.kind === 'channel') {
    const at = airedOf(src, played) - MARGIN, v = asAired(cur.g, at);
    it.aired = airedOf(src, played);
    it.pos = v?.state === 'in' ? { chapter: chapterAt(cur.g.id, at), clock: v.chapter === 'Halftime' ? '' : v.clock } : null;
  } else if (cur.g) it.pos = { mins: Math.round(played / MIN) };
  // (a game's bar is on the window's scale whatever the source: a video's real length would tell an overtime, 5.2 M5)
  const d = (src.kind === 'channel' || cur.g ? cur.windowMs || cur.duration : cur.duration || cur.windowMs) / 1000;
  if (played > 0) recordProgress(it, played / 1000, d, force);
}
// The replay's buzzer + 2 min has played (or a video's last 2 %): seen for good; nothing changes in the player (M6.2).
function checkSeen(played) {
  if (!cur?.g || cur.seen) return;
  const g = cur.g, src = cur.src;
  let done = false;
  if (src.kind === 'channel') { const b = chaptersOf(g.id).buzzerAt; done = !!b && airedOf(src, played) >= b + 2 * MIN; }
  else if (cur.duration) done = played >= cur.duration * 0.98;
  if (!done) return;
  cur.seen = true;
  cur.item.seen = true;
  const p = S.progress[progKey(cur.item)];
  if (p) { p.done = true; p.item.seen = true; store.set(scoped('progress'), S.progress); }
  markSeen(g.id);
  emit('progress');
}
function onPosition(played, { duration } = {}) {
  if (!cur) return;
  if (duration) cur.duration = duration;
  replay.played = played;
  replay.airedAt = cur.src.kind === 'channel' ? airedOf(cur.src, played) : 0;
  saveProgress(played);
  checkSeen(played);
  if (cur.g && !cur.standIn) playerCommand('game', JSON.stringify(airedGame(cur.g, cur.src, played)));
}
function close(played) {
  if (!cur) return;
  if (played != null) { saveProgress(played, true); checkSeen(played); }
  const was = cur;
  cur = null;
  if (was.g) closeReplay();
  emit('progress');
}

// Start a replay. what: { g, ch, prog, sources, src, startAt (ms into the window), item }.
async function start(what) {
  const { g, src } = what;
  const windowMs = what.windowMs || (g ? WINDOW : (what.prog.end - what.prog.start) + 2 * MIN);
  const item = what.item;
  item.startedAt = item.startedAt || Date.now();
  delete item.live; delete item.seen;
  const sources = what.sources.map((x) => sourceRow(g, x, windowMs));
  const index = Math.max(0, what.sources.indexOf(src));
  const R = {
    id: progKey(item), kind: g ? (src.kind === 'channel' ? 'game' : 'video') : 'programme',
    title: g ? gameName(g) : programmeView(what.ch, what.prog).title, sub: g ? `${src.kind === 'channel' ? src.name : 'Full game in Movies'} · ${nightLabel(g.date)}` : `${what.ch.name} · ${hm(what.prog.start)} to ${hm(what.prog.end)}`,
    hidden: !!g && shielded(g) && !isSeen(g),
    sources, source: index, startAt: Math.max(0, Math.round(what.startAt || 0)), windowMs,
    tipoffAt: g ? tipoffAt(g, src) : 0, chapters: g ? chapterMarks(g, src) : [],
    margin: MARGIN, extensions: g ? 2 : 0,
    live: src.kind === 'channel' ? { id: String(src.ch.id), name: src.ch.name, num: src.ch.num || 0 } : null,
    gameId: g?.id || '', programme: !g ? { title: programmeView(what.ch, what.prog).title, start: what.prog.start, end: what.prog.end, next: nextAfter(what.ch, what.prog) } : null,
    check: null,
  };
  if (g && R.hidden && src.kind === 'channel' && !shiftKnown() && replayNative()) R.check = await firstCheck().catch(() => null);
  pendingGame = g || null;
  cur = { g, ch: what.ch || src.ch, prog: what.prog, item, sources: what.sources, src, windowMs, standIn: !replayNative(), seen: false };
  if (g) openReplay(g, { chId: src.kind === 'channel' ? String(src.ch.id) : null, kind: src.kind, windowStart: src.windowStart || 0 });
  window.__replay = { R, standIn: cur.standIn, at: Date.now() };
  emit('replay-started', R);
  if (!native) {
    toast(`Playing ${R.title} ${R.startAt > 60e3 ? `from ${Math.round(R.startAt / MIN)} min in` : 'from the start'} (the TV player is only on the TV)`, 3500);
    saveProgress(R.startAt || 1000, true);
    return R;
  }
  if (!cur.standIn) {
    const session = await startReplaySession({ mode: 'replay', replay: R }, { kind: 'replay', items: [], index: 0, replayId: R.id });
    if (!session) { close(); return null; }
    cur.session = session;
  } else {
    // the stand-in: the source's first link in the VOD player (no quarter marks, no hidden end: the native timeline
    // isn't built yet), its progress mapped onto the window
    const s0 = sources[index], url = s0.links[0]?.url;
    if (!url) { close(); toast('This replay has no link to play.'); return null; }
    const session = await startReplaySession({ mode: 'vod', entries: [{ id: R.id, url, title: R.title, sub: R.sub, startAt: R.startAt / 1000 }], index: 0 }, { kind: 'replay', items: [], index: 0, replayId: R.id });
    if (!session) { close(); return null; }
    cur.session = session;
  }
  return R;
}
const nextAfter = (ch, p) => { const l = pastNow(ch) || guideNow(ch) || []; const n = l.find((x) => x.start >= p.end - 60e3 && x.start > p.start); return n ? { title: programmeView(ch, n).title, start: n.start } : null; };

// ---------- the first-replay check (6.6) ----------
// Before the first game replay on an account with the shield on: 10 s of a finished programme on a kept non-sports
// channel (with a guide start and a description, so it can never show a score), from its start + 5 min, and the
// question. The answers come back as 'check-answer' events.
async function firstCheck() {
  const chans = (catalog.live?.items || []).filter((ch) => ch.archive > 0 && !ch._sep && !isSporty(ch)).slice(0, 3);
  let best = null;
  for (const ch of chans) {
    const list = pastNow(ch) || await pastFor(ch);
    const p = [...list].reverse().find((x) => x.end < Date.now() - 5 * MIN && x.start > Date.now() - ch.archive * 864e5 + H && x.desc && x.kept !== false && x.end - x.start >= 15 * MIN);
    if (p && (!best || p.end > best.p.end)) best = { ch, p };
  }
  if (!best) return null;   // nothing safe to check with: skipped (8)
  const { ch, p } = best, at = p.start + 5 * MIN;
  const links = (h) => S.src.catchup(ch, at, at + MIN, { shift: h, raw: p.raw, plus: p.raw ? 5 * MIN : 0 });
  return {
    chId: String(ch.id), channel: ch.name, logo: ch.logo || '', title: p.title, desc: p.desc,
    line: `${ch.name} · ${nightLabel(p.start).replace(' · late', '')} · ${hm(p.start)} to ${hm(p.end)}`,
    playMs: 10e3, tries: { 0: links(0), '-1': links(-1), 1: links(1) },
  };
}

// ---------- the player's events (PORT-NATIVE.md) ----------
// (player.js's own listener runs first and has cleared ctx.cur by an exit: the session is what tells it's ours)
native?.player.onEvent((e) => {
  if (!cur || !cur.session || e.session !== cur.session) return;
  if (e.type === 'position') onPosition(+e.played || 0, { duration: +e.duration || 0 });
  else if (e.type === 'progress') onPosition((+e.t || 0) * 1000, { duration: (+e.d || 0) * 1000 });   // (the stand-in VOD's events)
  else if (e.type === 'exit') {
    const was = cur;
    close(e.played != null ? +e.played : e.t != null ? +e.t * 1000 : null);
    if (e.error) toast(`This replay would not play. ${e.error}`, 6000);
    if (e.then === 'choose-video' && pendingGame) chooseVideo(pendingGame);
    if (e.then === 'game-page' && pendingGame) push('game', { id: pendingGame.id });
    if (e.then === 'next-programme' && was?.prog && was.ch) nextProgramme(was.ch, was.prog);   // the bar's Next programme ›
  }
  else handleReplayEvent(e);
});
let pendingGame = null;   // (the game of the replay that just closed: the failure card's Choose a video / Game page)
// The protocol's other events; also called by the tests (window.__replayTest) with the same objects.
function handleReplayEvent(e) {
  if (!cur) return;
  const g = cur.g;
  if (e.type === 'pick-source') {
    const x = cur.sources[+e.source];
    if (!x) return;
    const was = cur.src;
    cur.src = x;
    if (g) setReplayPick(g.id, x);
    // from a video to a channel: the player has no quarter marks or tip-off for the channel yet (it starts at tip-off)
    if (g && x.kind === 'channel' && was?.kind !== 'channel') playerCommand('replay-links', { source: cur.sources.indexOf(x), links: linksOf(x, cur.windowMs), windowStart: x.windowStart, tipoffAt: tipoffAt(g, x), chapters: chapterMarks(g, x) });
    if (g) openReplay(g, { chId: x.kind === 'channel' ? String(x.ch.id) : null, kind: x.kind, windowStart: x.windowStart || 0 });
  } else if (e.type === 'source-failed' || e.type === 'conn-limit') {
    window.__replayFail = { type: e.type, source: e.source, code: e.code, at: Date.now() };
  } else if (e.type === 'not-the-game') {
    // ± 1 h for this channel, remembered; the player restarts at tip-off with the new links (3.5, 6.6)
    const x = cur.sources[+e.source] || cur.src;
    if (x?.kind !== 'channel') return;
    const h = archiveShift(x.ch.id) + (+e.hours > 0 ? 1 : -1);
    setArchiveShift(x.ch.id, h);
    playerCommand('replay-links', { source: cur.sources.indexOf(x), links: linksOf(x, cur.windowMs, h), windowStart: x.windowStart, tipoffAt: g ? tipoffAt(g, x) : 0, chapters: g ? chapterMarks(g, x) : [] });
  } else if (e.type === 'need' && e.what === 'links') {
    // a seek on a .ts link (minute-granular, 6.5): the window's links from that minute; the player plays them from there
    const x = cur.sources[+e.source] || cur.src;
    if (x?.kind !== 'channel') return;
    const from = Math.max(0, +e.at || 0);
    const links = S.src?.catchup?.(x.ch, x.windowStart + from, x.windowStart + cur.windowMs, { shift: archiveShift(x.ch.id), raw: x.prog?.raw || '', plus: from }) || [];
    playerCommand('replay-links', { source: cur.sources.indexOf(x), links, from: +e.at });
  } else if (e.type === 'need' && e.what === 'extend') {
    // the window ended before the buzzer: the next 60 min, without a word, up to twice; then Replay ended (6.7)
    const b = g && chaptersOf(g.id).buzzerAt, played = +e.played || cur.windowMs, src = cur.src;
    const buzzerPlayed = b && airedOf(src, played) >= b + 2 * MIN;
    if (!g || buzzerPlayed || (+e.count || 0) >= 2 || src.kind !== 'channel') { playerCommand('replay-extend', { ended: true, seen: isSeen(g), gameId: g?.id || '' }); return; }
    cur.windowMs += H;
    playerCommand('replay-extend', { source: cur.sources.indexOf(src), windowMs: cur.windowMs, links: linksOf(src, cur.windowMs) });
  } else if (e.type === 'need' && e.what === 'clocks' && g) {
    // Sync in a replay: the clocks around the moment on screen; what you match is stored as the channel's replayDelay (S7)
    const src = cur.src;
    if (src.kind !== 'channel') { playerCommand('show-text', 'A video has no clock to match'); return; }
    fetchSummary(g.id).then(() => {
      const seenAt = airedOf(src, +e.played || replay.played);
      const clocks = recentClocks(g.id, seenAt);
      if (!clocks.length) { playerCommand('show-text', 'ESPN has no plays from around this moment'); return; }
      playerCommand('clocks', { seenAt, played: +e.played || replay.played, list: clocks, current: 0, replay: true, note: `Stored for ${src.ch.name}'s replays.` });
    });
  } else if (e.type === 'sync' && g && cur.src.kind === 'channel') {
    // played: where in the window the picture showed the clock you picked; at: that play's ESPN wallclock. A moment sits
    // at wallclock − window start + replayDelay, so replayDelay = played − (at − window start).
    const src = cur.src, played = e.played != null ? +e.played : replay.played;
    if (!+e.at) return;
    const sec = Math.max(0, Math.min(600, Math.round((played - (+e.at - src.windowStart)) / 1000)));
    setReplayDelay(src.ch.id, sec);
    playerCommand('show-text', `Synced · the replay runs ${sec} s behind ESPN`);
    playerCommand('replay-links', { source: cur.sources.indexOf(src), links: linksOf(src, cur.windowMs), windowStart: src.windowStart, tipoffAt: tipoffAt(g, src), chapters: chapterMarks(g, src), keepPosition: true });
  } else if (e.type === 'check-answer') {
    // Yes 0; the second look's Yes −1 or +1; Not sure / a second No: nothing stored (M1)
    if (e.shift === 0 || e.shift === -1 || e.shift === 1) setArchiveShift(null, +e.shift);
    else setArchiveShift('_asked', Date.now());   // (no shift stored, but "You'll see this once": not asked again)
    if (cur.src.kind === 'channel') playerCommand('replay-links', { source: cur.sources.indexOf(cur.src), links: linksOf(cur.src, cur.windowMs), windowStart: cur.src.windowStart, tipoffAt: g ? tipoffAt(g, cur.src) : 0, chapters: g ? chapterMarks(g, cur.src) : [] });
  } else if (e.type === 'golive') {
    // Back to live (after the player's own "Going live may show the score" card): the channel, live
    const ch = chOf(e.chId || cur.src.ch?.id);
    const played = replay.played;
    close(played);
    if (g) { const p = S.progress[`rp:${g.id}`]; if (p) { p.item.live = true; store.set(scoped('progress'), S.progress); } }
    if (ch) playLive(ch, ringOf(), 'All channels');
  } else if (e.type === 'seen') {
    if (g && !cur.seen) { cur.seen = true; cur.item.seen = true; markSeen(g.id); }
  }
}
if (window.TUNER_TEST) {
  window.__replayTest = {
    event: (e) => (e.type === 'position' ? onPosition(+e.played || 0, e) : e.type === 'exit' ? close(e.played) : handleReplayEvent(e)),
    state: () => (cur ? { id: cur.item.id, src: `${cur.src.kind}:${cur.src.id}`, played: replay.played, aired: replay.airedAt, seen: cur.seen, game: cur.g ? airedGame(cur.g, cur.src, replay.played) : null } : null),
  };
}

// ---------- what the surfaces call ----------
const gameItem = (g, prev) => ({ ...(prev || {}), kind: 'rp', id: g.id, game: { id: g.id, date: g.date, away: { abbr: g.away.abbr, name: g.away.name }, home: { abbr: g.home.abbr, name: g.home.name } }, name: gameName(g) });
// "Watch from tip-off" (heroes, menus, cards, the game page), "From tip-off", "Watch again". opts.source: a source to use
// (the sources sheet); opts.ask: show the sheet whatever the setting. Ask each time (Account > NBA) opens the sheet.
export async function watchFromTipoff(g, { source, ask = false, resume = false } = {}) {
  if (!g) return;
  const list = await findReplays(g);
  if (!list.length && !source) { say(`No replay of ${gameName(g)} found yet. airglow keeps looking.`); return; }
  if (!source && (ask || settings().replaysPlay === 'ask')) return sourcesSheet(g);
  const src = source || list[0];
  const p = replayProgress(g.id);
  let startAt = null;
  if (resume && p && !p.done && p.t > 30) {
    // the same source: the same played position; another channel: the same aired moment
    // (a video's position never lands in a channel's window, nor a channel's in a video: those start at tip-off)
    const was = String(p.item.src || '');
    if (was === `${src.kind}:${src.id}`) startAt = p.t * 1000;
    else if (src.kind === 'channel' && p.item.aired) startAt = Math.max(0, posOf(src, p.item.aired));
    else if (src.kind !== 'channel' && !was.startsWith('channel:')) startAt = p.t * 1000;
  }
  if (startAt == null) {
    wantSummary(g.id);
    if (!nba.sums.get(g.id)?.all) await fetchSummary(g.id);   // the tip-off's place needs the plays
    startAt = tipoffAt(g, src);
  }
  const item = gameItem(g, resume ? p?.item : null);
  if (!resume) { delete item.startedAt; delete item.pos; delete item.aired; }
  return start({ g, src, sources: list.includes(src) ? list : [src, ...list], startAt, item });
}
export const resumeGame = (g) => watchFromTipoff(g, { resume: true });
// A game from the guide's past: from tip-off on that channel (its own programme is the window, case 1 of 3.5).
export async function watchOnChannel(g, ch, p) {
  const list = await findReplays(g);
  const src = list.find((x) => x.kind === 'channel' && x.id === String(ch.id))
    || { kind: 'channel', id: String(ch.id), ch, prog: p, windowStart: p.start, days: ch.archive, name: ch.name, detail: 'Channel replay · quarter skips', confirmed: true };
  return watchFromTipoff(g, { source: src });
}
// Back to live from the Home hero (5.1, S9): under the shield the same copy as the player's card, Stay focused.
export function backToLive(g) {
  const p = replayProgress(g.id), ch = chOf(p?.item?.src?.startsWith('channel:') ? p.item.src.slice(8) : watchedOn(g.id));
  const go = () => { if (p) { p.item.live = true; store.set(scoped('progress'), S.progress); } if (ch) playLive(ch, ringOf(), 'All channels'); else toast('No channel found for this game yet. Pick it in the guide.'); emit('nba'); };
  if (!shielded(g) || isSeen(g)) return go();
  confirmMenu({ title: 'Going live may show the score', text: `${ch?.name || 'The channel'} is live now. Your replay stays where you left it.`, no: 'Stay in the replay', yes: 'Go live', onYes: go });
}
// A kept programme from its start (or where you stopped), from the guide (4.2); at: from that moment (rewinding live TV, 6.8).
export function playProgramme(ch, p, { restart = false, at = 0 } = {}) {
  const src = { kind: 'channel', id: String(ch.id), ch, prog: p, windowStart: p.start, days: ch.archive, name: ch.name, detail: 'Replay' };
  const item = { kind: 'rp', id: `${ch.id}:${p.start}`, ch: String(ch.id), name: p.title, title: p.title, start: p.start, end: p.end, channel: ch.name, logo: ch.logo || '' };
  const was = S.progress[`rp:${item.id}`];
  const startAt = at ? Math.max(0, at - p.start) : !restart && was && !was.done && was.t > 30 ? was.t * 1000 : 0;
  return start({ ch, prog: p, src, sources: [src], startAt, item: { ...(was?.item || {}), ...item } });
}
// The bar's Next programme ›: the one after, from its start (live, when it's on now).
function nextProgramme(ch, p) {
  const l = pastNow(ch) || guideNow(ch) || [];
  const n = l.find((x) => x.start >= p.end - 60e3 && x.start > p.start);
  if (!n) { say('The next programme isn’t in the guide.'); return; }
  if (n.start <= Date.now() && n.end > Date.now()) playLive(ch, ringOf(), 'All channels');
  else playProgramme(ch, n, { restart: true });
}
// Rewinding a kept channel past what the live link holds, or Start over (the live player's need: rewind, 6.8): the
// programme on at that moment, from it.
on('rewind-request', async ({ chId, at }) => {
  const ch = chOf(chId);
  if (!ch || !at) return;
  const has = (l) => (l || []).find((x) => x.start <= at && x.end > at);
  const p = has(pastNow(ch)) || has(await pastFor(ch, { urgent: true })) || has(guideNow(ch));
  if (!p) { say('That part of the programme isn’t in the replay.'); return; }
  playProgramme(ch, p, { at });
});
export const programmeProgress = (ch, p) => S.progress[`rp:${ch.id}:${p.start}`] || null;
// A video from Movies that is a hidden game's full game: the game page with it as the pick (5.8, S5).
export function openVideoGame(g, m) {
  if (m) setReplayPick(g.id, { kind: 'video', id: m.id });
  findReplays(g, { force: true });
  push('game', { id: g.id });
}
// Play a video in the hidden 'video' timeline, its progress under rp:<gameId> (Choose a video's Play this video, Play
// on a masked card).
export function playVideoFor(g, m) {
  const r = matchVideo(m, g) || {};
  const src = { kind: 'video', id: String(m.id), video: m, name: r.condensed ? 'Condensed game' : 'Full game', detail: 'Movies', confirmed: true, best: true };
  const p = replayProgress(g.id);
  const startAt = p && !p.done && p.item?.src === `video:${m.id}` && p.t > 30 ? p.t * 1000 : 0;
  return start({ g, src, sources: [src, ...(replaysOf(g) || []).filter((x) => !(x.kind === 'video' && x.id === String(m.id)))], startAt, item: gameItem(g, p?.item) });
}

// ---------- the sources sheet (5.6) ----------
export async function sourcesSheet(g) {
  const list = await findReplays(g);
  const pick = replayPick(g.id);
  const curI = Math.max(0, pick ? list.findIndex((x) => x.kind === pick.kind && x.id === pick.id) : 0);
  const row = (x, i) => `<div class="lr fx" tabindex="-1" data-act="${i}"><span class="ico">${ic(x.kind === 'channel' ? 'hist' : 'film')}</span><span class="grow"><span class="a">${esc(x.name)}</span><span class="b">${esc(x.detail)}</span></span>${x.best ? '<small>Best</small>' : x.badge ? `<small>${esc(x.badge)}</small>` : ''}</div>`;
  const first = settings().replaysPlay === 'video' ? 'Full-game videos come first (Account › NBA › Replays play).' : 'The channel replay comes first: it has the quarter skips and the synced score.';
  const ov = openOverlay(`<div class="sheet cu-srcs"><h3>Watch ${esc(gameName(g))}</h3><div class="t-cap" style="margin-top:-6px">From tip-off${dot}${esc(nightLabel(g.date))}</div>
    <div class="sheet-body"><div class="inner" data-col style="display:flex;flex-direction:column;gap:2px">${list.map(row).join('')}<div class="lr fx" tabindex="-1" data-act="pickch"><span class="ico">${ic('live')}</span><span class="grow"><span class="a">Pick the channel…</span><span class="b">The channel that showed it, from its replays</span></span></div><div class="lr fx" tabindex="-1" data-act="choose"><span class="ico">${ic('search')}</span><span class="grow"><span class="a">Choose a video…</span><span class="b">Every video naming either team</span></span></div></div></div>
    <div class="t-cap">Your pick is remembered for this game. ${first}</div></div>`, {
    focusSel: `[data-act="${curI}"]`,
    onClick: (act) => {
      ov.close();   // (focus back on what opened it: the player returns there, and so does the next sheet)
      if (act === 'choose') return chooseVideo(g);
      if (act === 'pickch') return pickChannel(g);
      const x = list[+act];
      if (!x) return;
      setReplayPick(g.id, x);
      watchFromTipoff(g, { source: x });
    },
  });
  scrollList(ov.el);
  return ov;
}

// ---------- Pick the channel: when the guide can't tell which kept channel showed the game ----------
// The channels whose replays reach back to its tip-off (NBA and sports first); his pick is remembered for the game and
// plays from tip-off (from 15 min before it: the channel's guide can't place it, so the tip-off point is a guess).
export function pickChannel(g) {
  if (!g) return;
  const { list, kept, days } = keptFor(g);
  if (!kept) { toast('Your provider keeps no channels for replays, so there\'s nothing to rewatch from. Account › Provider › Check the guide shows it.', 7000); return; }
  if (!list.length) { toast(`Your provider keeps replays for ${days} day${days === 1 ? '' : 's'}: this game is older than that.`, 6000); return; }
  const row = (ch, i) => `<div class="lr fx" tabindex="-1" data-act="${i}" style="height:56px"><span class="logo sm">${ch.logo ? `<img src="${esc(ch.logo)}" alt="">` : esc(ch.name.slice(0, 2).toUpperCase())}</span><span class="grow"><span class="a ellipsis">${esc(ch.name)}</span><span class="b">${esc(keptWords(ch.archive))}</span></span></div>`;
  const ov = openOverlay(`<div class="sheet cu-srcs"><h3>Which channel showed ${esc(gameName(g))}?</h3><div class="t-cap" style="margin-top:-6px">${esc(nightLabel(g.date))}${dot}channels with replays</div>
    <div class="sheet-body"><div class="inner" data-col style="display:flex;flex-direction:column;gap:2px">${list.map(row).join('')}</div></div>
    <div class="t-cap">Your pick is remembered for this game. It starts a little before tip-off.</div></div>`, {
    onClick: async (act) => {
      const ch = list[+act];
      if (!ch) return;
      ov.close();
      setReplayPick(g.id, { kind: 'channel', id: String(ch.id) });
      const l = await findReplays(g, { force: true });
      const src = l.find((x) => x.kind === 'channel' && x.id === String(ch.id));
      if (src) watchFromTipoff(g, { source: src });
      else toast(`${ch.name}'s replays don't reach back to this game`, 5000);
    },
  });
  scrollList(ov.el);
}

// ---------- Choose a video (5.7) ----------
// Every video naming either team, newest first; under the shield, a name that could tell reads "Video naming …" with
// Play this video under the focused hidden row (S5). focusId: the row to open on (a masked card from Movies).
export function chooseVideo(g, { focusId } = {}) {
  ensure('movie').then(() => {
    const vids = videosNaming(g);
    const H2 = (m) => videoMask(m);
    const added = (m) => (m.added ? `added ${new Date(m.added * 1000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}${H2(m) ? ` ${hm(m.added * 1000)}` : ''}` : '');
    const qOf = (m) => (/\b(2160p?|4k|uhd)\b/i.test(m.name) ? '4K' : /\b(1080p?|fhd)\b/i.test(m.name) ? '1080p' : /\b(720p?|hd)\b/i.test(m.name) ? '720p' : '');
    // a video of a game you've seen (or that isn't hidden): its night and 'a game you've seen'
    const known = [...new Set([...(nba.today || []), ...[...nba.other.values()].flat()])];
    const seenOf = (m) => { const x = known.find((k) => k.id !== g.id && isSeen(k) && matchVideo(m, k)); return x ? `${nightLabel(x.date).replace(' · late', '')} · a game you've seen` : ''; };
    const row = (m, i) => {
      const mk = H2(m);
      if (mk) return `<div class="lr fx" tabindex="-1" data-act="${i}" data-vid="${esc(m.id)}" data-hidden><span class="ico">${ic('eyeOff')}</span><span class="grow"><span class="a">${esc(mk.kind === 'game' ? mk.title + ' · ' + (mk.full?.condensed ? 'condensed game' : 'full game') : mk.title)}</span><span class="b">${esc([added(m), qOf(m)].filter(Boolean).join(' · '))}</span></span><small style="color:var(--a-text-2);font-weight:500">Name hidden</small></div><div class="lr fx cu-playthis" tabindex="-1" data-act="p${i}" hidden><span class="ico">${ic('play')}</span><span class="grow"><span class="a">Play this video</span><span class="b">As it is, with its end hidden</span></span></div>`;
      const sg = seenOf(m);
      return `<div class="lr fx" tabindex="-1" data-act="${i}" data-vid="${esc(m.id)}"><span class="ico">${ic('film')}</span><span class="grow"><span class="a">${esc(m.name)}</span><span class="b">${esc([sg || added(m), qOf(m)].filter(Boolean).join(' · '))}</span></span></div>`;
    };
    const names = `the ${g.away.name} or the ${g.home.name}`;
    const body = vids.length ? vids.map(row).join('') : `<div class="lr fx" tabindex="-1" data-act="none"><span class="grow"><span class="a">No videos name ${esc(names)}</span><span class="b">Full games often reach Movies a few hours after the final</span></span></div>`;
    const ov = openOverlay(`<div class="menu cu-srcs" style="left:180px;top:40px;width:600px;max-height:460px;display:flex;flex-direction:column"><h3>Choose a video</h3><div class="t-cap" style="padding:0 8px 10px">Videos naming ${esc(names)}, newest first</div>
      <div class="sheet-body" style="max-height:340px"><div class="inner" data-col>${body}</div></div>
      <div class="t-cap" style="padding:10px 8px 0">${shieldMode() !== 'off' ? 'Names that could tell the result stay hidden until you’ve seen the game. ' : ''}Your pick is remembered.</div></div>`, {
      focusSel: focusId != null ? `[data-vid="${CSS.escape(String(focusId))}"]` : '.lr.fx',
      onClick: (act) => {
        if (act === 'none') return ov.close();
        const play = act[0] === 'p', m = vids[+(play ? act.slice(1) : act)];
        if (!m) return;
        ov.close();
        // a matched full game (or a pick for this game): the game's replay with it as the source; Play this video: as it is
        const r = matchVideo(m, g);
        if (play || !r) return playVideoFor(g, m);
        setReplayPick(g.id, { kind: 'video', id: m.id });
        findReplays(g, { force: true }).then((list) => watchFromTipoff(g, { source: list.find((x) => x.kind === 'video' && x.id === String(m.id)) || undefined }));
      },
    });
    // Play this video shows under the focused hidden row only
    const show = () => { const a = document.activeElement; ov.el.querySelectorAll('.cu-playthis').forEach((r) => { r.hidden = !(r.previousElementSibling === a || r === a); }); };
    ov.el.addEventListener('tvfocus', show, true);
    requestAnimationFrame(show);
    scrollList(ov.el);
  }).catch(() => toast('Your provider’s movies didn’t load.'));
}

// ---------- the game page and Look again ----------
export const lookAgain = (g) => findReplays(g, { force: true });
on('session', () => { cur = null; });
// From tip-off asked for in the live player (PORT-NATIVE.md 3: a 'tipoff' event, or an exit with then: 'tipoff')
on('tipoff-request', (id) => { const g = gameById(id); if (g) watchFromTipoff(g); });

// ---------- the heroes' catch-up rows (Home, the hub, the team header): what their buttons do (5.1) ----------
// kind: the hero's data-row-kind. Returns true when the press was a catch-up one (the caller handles the rest:
// Watch live, Box score, Reveal score).
export function heroAct(g, kind, act) {
  if (!g || !kind) return false;
  if (act === 'primary') {
    if (kind === 'morning') { watchFromTipoff(g); return true; }
    if (kind === 'resume' || kind === 'behind') { resumeGame(g); return true; }
    if (kind === 'looking' || kind === 'seen') { push('game', { id: g.id }); return true; }
    return false;   // live-tipoff: Watch live is the caller's
  }
  if (act === 'tipoff' || act === 'again') { watchFromTipoff(g); return true; }
  if (act === 'golive') { backToLive(g); return true; }
  if (act === 'game') { push('game', { id: g.id }); return true; }
  if (act === 'pickch') { pickChannel(g); return true; }
  return false;
}
// Hold OK on a watch button: the sources sheet, whatever the setting (13.1).
export function heroHold(g, kind, act) {
  if (!g || !kind) return false;
  if (act === 'tipoff' || act === 'again' || (act === 'primary' && kind !== 'live-tipoff' && kind !== 'looking')) { sourcesSheet(g); return true; }
  return false;
}
