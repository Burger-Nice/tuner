// NBA: today's games, box scores, the spoiler shield, the per-channel score delay, and which channels carry a game.
// Every surface that shows a score asks `show(g)` for it, so the shield and the synced delay hold everywhere.
import { launchDone } from './launch.js';
import { S, store, settings, saveSettings, scoped, emit } from './state.js';
import { catalog, ensure } from './catalog.js';
import { guideFor, onNow, warm } from './guide.js';

const { NBA } = window;
export const nba = { today: [], todayDay: '', err: '', stale: false, other: new Map(), sums: new Map(), sumFail: new Map(), started: false };
const hist = new Map();        // gameId -> [{ t, g, s }] snapshots, for showing a game as it looked `delay` seconds ago
export const revealed = new Set();   // this session's revealed games
let timer = 0, sumTimer = 0;
const want = new Set();        // games whose box score is wanted right now (watched, open page, hero)

// 'none' is a real choice (no team: no hero game, no alert); unset still means the Grizzlies.
export const favTeam = () => { const t = settings().nbaTeam || 'MEM'; return t === 'none' ? '' : t; };
export const isMine = (g) => !!g && !!favTeam() && (g.home.abbr === favTeam() || g.away.abbr === favTeam());
export const mySide = (g) => (g.home.abbr === favTeam() ? g.home : g.away);
export const gameById = (id) => nba.today.find((g) => g.id === id) || [...nba.other.values()].flat().find((g) => g.id === id) || null;
export const myGame = () => nba.today.find(isMine) || null;
export const liveGames = () => nba.today.filter((g) => g.state === 'in');
export const ordinal = (n) => (n <= 4 ? `Q${n}` : n === 5 ? 'OT' : `${n - 4}OT`);
export const clockText = (g) => (g.state === 'in' ? (/half/i.test(g.detail) ? 'Halftime' : /end of/i.test(g.detail) ? `End ${ordinal(g.period)}` : `${ordinal(g.period)} ${g.clock}`) : g.state === 'post' ? 'Final' : '');

function sortGames(list) {
  const rank = (g) => (isMine(g) ? 0 : g.state === 'in' ? 1 : g.state === 'pre' ? 2 : 3);
  return [...list].sort((a, b) => rank(a) - rank(b) || a.date - b.date);
}
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Today's scoreboard is kept, so a game night still opens on your game when ESPN is slow or down (scores then read as
// unavailable until it answers). Kept for 18 h: ESPN's day follows US time, so last night's can still be "today".
const SAVED = 'nba:today';
function fromSaved() {
  const x = store.get(SAVED, null);
  if (!x || Date.now() - x.at > 18 * 3600e3 || nba.today.length) return;
  // a game saved mid-game whose tip-off was over 4 h ago is over by now (its score is the last one seen)
  for (const g of x.games) if (g.state === 'in' && Date.now() - g.date > 4 * 3600e3) g.state = 'post';
  nba.today = sortGames(x.games);
  nba.todayDay = x.day;
  nba.stale = true;
}
export function startNba() {
  if (nba.started) return;
  nba.started = true;
  fromSaved();
  if (nba.today.length) emit('nba');
  refreshToday();
  sumTick();
}
async function refreshToday() {
  clearTimeout(timer);
  try {
    // ESPN's "today" follows US time; once last night's games are all final and your own day has moved on, show your today.
    let r = await NBA.scoreboard('');
    const local = isoDay(new Date());
    if (r.day && r.day < local && r.games.every((g) => g.state === 'post')) {
      try { const next = await NBA.scoreboard(local.replace(/-/g, '')); r = { day: next.day || local, games: next.games }; } catch {}
    }
    nba.today = sortGames(r.games.map((g) => merge(g)));
    nba.todayDay = r.day;
    nba.err = ''; nba.stale = false;
    for (const g of nba.today) remember(g);
    store.set(SAVED, { at: Date.now(), day: r.day, games: r.games });
  } catch (e) { nba.err = e.message; }
  emit('nba');
  timer = setTimeout(refreshToday, nba.stale ? 30000 : nba.today.some((g) => g.state === 'in') ? 15000 : 120000);
}
// Keep a summary's fresher score on the scoreboard entry.
function merge(g) {
  const s = nba.sums.get(g.id);
  if (s && s.at > (g._at || 0) && s.game.state !== 'pre') {
    Object.assign(g, { state: s.game.state, detail: s.game.detail || g.detail, clock: s.game.clock, period: s.game.period });
    for (const side of ['home', 'away']) if (s.game[side].score) { g[side].score = s.game[side].score; if (s.game[side].lines.length) g[side].lines = s.game[side].lines; }
  }
  g._at = Date.now();
  return g;
}
export async function dayGames(offset) {
  if (!offset) return nba.today;
  const base = nba.todayDay ? new Date(nba.todayDay + 'T12:00:00') : new Date();
  base.setDate(base.getDate() + offset);
  const ymd = isoDay(base).replace(/-/g, '');
  if (nba.other.has(ymd)) return nba.other.get(ymd);
  const r = await NBA.scoreboard(ymd);
  const games = sortGames(r.games);
  nba.other.set(ymd, games);
  return games;
}
export function dayLabel(offset) {
  const d = nba.todayDay ? new Date(nba.todayDay + 'T12:00:00') : new Date();
  d.setDate(d.getDate() + offset);
  const rel = { '-1': 'Yesterday', 0: 'Today', 1: 'Tomorrow' }[offset];
  const date = d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  return rel ? `${rel} · ${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}` : date;
}

// Box scores: fetched every 10 s for the games someone is looking at.
export function wantSummary(id, on = true) { if (on) want.add(id); else want.delete(id); if (on && !nba.sums.has(id)) sumTick(); }
async function sumTick() {
  clearTimeout(sumTimer);
  for (const id of [...want]) {
    try {
      const s = await NBA.summary(id);
      s.at = Date.now();
      nba.sums.set(id, s);
      const g = gameById(id);
      if (g) { merge(g); remember(g); }
      nba.sumFail.delete(id);
      emit('summary', id);
    } catch { if (!nba.sumFail.has(id)) { nba.sumFail.set(id, Date.now()); emit('summary', id); } }
  }
  const live = [...want].some((id) => gameById(id)?.state === 'in');
  sumTimer = setTimeout(sumTick, live ? 10000 : 60000);
}
export const summaryOf = (id) => nba.sums.get(id) || null;

// ---------- score delay: per channel ----------
// IPTV streams run behind the real game. While you watch a game, every surface shows it as it was `delay` seconds ago.
const DEFAULT_DELAY = 60;
const delays = () => store.get(scoped('delays'), {});
export const delayFor = (chId) => { const d = delays()[chId]; return d == null ? DEFAULT_DELAY : d; };
export const delayKnown = (chId) => delays()[chId] != null;
export function setDelay(chId, sec) { const d = delays(); d[chId] = sec; store.set(scoped('delays'), d); emit('nba'); }
export const watch = { gameId: null, chId: null };   // set by the player: the game on the channel you're watching
const lastSeen = new Map();   // gameId -> the channel you last watched it on: its scores stay at that delay until it ends
export function setWatching(gameId, chId) {
  if (gameId && chId) lastSeen.set(gameId, chId);
  if (watch.gameId && watch.gameId !== gameId) wantSummary(watch.gameId, false);
  watch.gameId = gameId; watch.chId = chId;
  if (gameId) { wantSummary(gameId); revealed.add(gameId); }   // watching the game is choosing to see it
  emit('nba');
}
function remember(g) {
  if (!g || g.state !== 'in') return;
  let h = hist.get(g.id);
  if (!h) hist.set(g.id, (h = []));
  const s = nba.sums.get(g.id) || null;
  const key = JSON.stringify([g.state, g.detail, g.home.score, g.away.score, s?.plays.length]);
  if (h.length && h[h.length - 1].key === key) return;
  h.push({ t: Date.now(), key, g: JSON.parse(JSON.stringify(g)), s });
  const cutoff = Date.now() - 11 * 60000;
  while (h.length > 2 && h[1].t < cutoff) h.shift();
}
// The game as it should look right now: at the synced delay while you watch it, else live.
export function delayed(g) {
  if (!g) return { g, s: null };
  const s = nba.sums.get(g.id) || null;
  const ch = watch.gameId === g.id ? watch.chId : lastSeen.get(g.id);
  if (!ch || g.state !== 'in') return { g, s };
  const d = delayFor(ch) * 1000, h = hist.get(g.id);
  if (!d || !h?.length) return { g, s };
  const target = Date.now() - d;
  let pick = h[0];
  for (const e of h) if (e.t <= target) pick = e;
  return { g: pick.g, s: pick.s || s, delay: d / 1000 };
}

// ---------- the spoiler shield ----------
export const shieldMode = () => settings().shield || 'off';   // off | mine | all
// Turning the shield on hides games you revealed earlier too (the one on your screen stays: you're watching it).
export const setShield = (m) => {
  if (m !== 'off' && m !== shieldMode()) for (const id of [...revealed]) if (id !== watch.gameId) revealed.delete(id);
  saveSettings({ shield: m }); emit('nba');
};
export const shielded = (g) => { const m = shieldMode(); return m === 'all' || (m === 'mine' && isMine(g)); };
// Hidden: no score, no leaders, no records changing, no winner, no "OT".
export const hidden = (g) => !!g && g.state !== 'pre' && shielded(g) && !revealed.has(g.id);
export function reveal(id) { revealed.add(id); emit('nba'); }
// What a surface may show for a game: the synced view, or nothing when it is hidden.
export function show(g) {
  if (!g) return null;
  const v = delayed(g);
  // synced: the delay you matched on this channel; delayed: the delay in use (the 60 s default until you sync).
  const on = watch.gameId === g.id && g.state === 'in';
  return { ...v, hidden: hidden(g), synced: on && delayKnown(watch.chId) ? delayFor(watch.chId) : null, delayed: on ? delayFor(watch.chId) : null };
}

// ---------- which channels carry a game ----------
// Channels named for the game, then channels whose guide says it's on, then NBA / League Pass, then sports channels.
const SPORTY = /\bnba\b|league pass|\bespn|\btnt\b|\btsn\b|sportsnet|sky sports|\bbt sport|tnt sports|\bdazn|\bnbc ?sports|\bbally|\bfanduel sports|\bsport/i;
const teamChKey = () => scoped('teamCh');
export const teamChannel = (abbr) => store.get(teamChKey(), {})[abbr] || null;
export function setTeamChannel(abbr, chId) { const m = store.get(teamChKey(), {}); m[abbr] = chId; store.set(teamChKey(), m); emit('nba'); }
const feedCache = new Map();   // gameId -> { at, list }
export function feedsNow(g) { return feedCache.get(g?.id)?.list || []; }
// How good a channel's picture is, from its name: 4K 4, Full HD 3, HD 2, no tag 1.5, SD 1.
export const quality = (name) => (/\b(4k|uhd|2160p?)\b/i.test(name) ? 4 : /\b(fhd|full ?hd|1080p?)\b/i.test(name) ? 3 : /\b(hd|720p?)\b/i.test(name) ? 2 : /\bsd\b/i.test(name) ? 1 : 1.5);
// The channel to watch a game on: the best-quality channel known to carry it (your pick is one of them, so a 4K twin
// of the channel you picked wins over it), else your pick.
export function bestChannel(g) {
  const live = catalog.live;
  const pick = isMine(g) ? teamChannel(mySide(g).abbr) : null;
  const best = feedsNow(g)[0]?.ch;
  const picked = pick && live?.byId.get(pick);
  return best && (!picked || quality(best.name) > quality(picked.name)) ? best : picked || best || null;
}
export const feedsKnown = (g) => feedCache.has(g?.id);
const feedJobs = new Map();   // gameId -> the scan in progress, so callers that poll don't start another
export function findFeeds(g) {
  if (!g) return Promise.resolve([]);
  const hit = feedCache.get(g.id);
  if (hit && Date.now() - hit.at < 5 * 60000) return Promise.resolve(hit.list);
  if (!feedJobs.has(g.id)) feedJobs.set(g.id, scanFeeds(g).finally(() => feedJobs.delete(g.id)));
  return feedJobs.get(g.id);
}
async function scanFeeds(g) {
  await launchDone;   // dozens of guide requests: not while the app is starting
  const live = await ensure('live').catch(() => null);
  if (!live) return [];
  const named = [], sporty = [];
  for (const ch of live.items) {
    if (NBA.matchGame(ch.name, [g])) named.push(ch);
    else if (SPORTY.test(ch.name) || SPORTY.test(live.catName.get(ch.cat) || '')) sporty.push(ch);
  }
  // Ask the guide about the likeliest sports channels (a few at a time, at most 40).
  const probe = sporty.filter((ch) => /\bnba\b|league pass/i.test(ch.name)).concat(sporty.filter((ch) => !/\bnba\b|league pass/i.test(ch.name))).slice(0, 40);
  await warm(probe, { batch: 4 });
  const guided = [];
  for (const ch of probe) {
    const list = await guideFor(ch);
    const now = onNow(list, Date.now()) || onNow(list, g.date + 60000);
    if (now && NBA.matchGame(now.title, [g])) guided.push(ch);
  }
  const picked = isMine(g) ? teamChannel(mySide(g).abbr) : null;
  const seen = new Set(), list = [];
  const add = (ch, why) => { if (ch && !seen.has(ch.id)) { seen.add(ch.id); list.push({ ch, why }); } };
  if (picked) add(live.byId.get(picked), 'Your pick');
  named.forEach((ch) => add(ch, 'Named for this game'));
  guided.forEach((ch) => add(ch, 'Guide match'));
  // Best picture first: of the channels that carry it, the highest quality the name promises (4K, then Full HD, HD, a
  // channel with no tag, SD), and within the same quality the order above (your pick, named for the game, the guide).
  const ranked = list.map((f, i) => ({ f, i, q: quality(f.ch.name) })).sort((a, b) => b.q - a.q || a.i - b.i).map((x) => x.f);
  list.splice(0, list.length, ...ranked);
  feedCache.set(g.id, { at: Date.now(), list });
  emit('feeds', g.id);
  return list;
}
// Other candidates to choose from when no channel is known: NBA / League Pass channels, then the Sports group.
export async function channelCandidates() {
  const live = await ensure('live').catch(() => null);
  if (!live) return [];
  const nbaCh = live.items.filter((ch) => /\bnba\b|league pass/i.test(ch.name));
  const sports = live.items.filter((ch) => !nbaCh.includes(ch) && (SPORTY.test(ch.name) || /sport/i.test(live.catName.get(ch.cat) || '')));
  return [...nbaCh, ...sports].slice(0, 60);
}
// The game a channel is showing, from its name or what the guide says is on now.
export function gameOn(ch, guideList) {
  if (!ch || !nba.today.length) return null;
  const now = onNow(guideList || []);
  return NBA.matchGame(`${ch.name} ${now?.title || ''}`, nba.today) || null;
}
// Clocks the feed saw recently, newest first, for "Match the clock": [{ label, at }]. Clocks only: no team, score or play.
export function recentClocks(gameId, seenAt = Date.now()) {
  const s = nba.sums.get(gameId);
  const out = [], seen = new Set();
  for (const p of s?.plays || []) {
    if (!p.at || p.at > seenAt || seenAt - p.at > 8 * 60000) continue;
    const label = `${ordinal(p.period)} ${p.clock}`;
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ label, at: p.at });
  }
  return out.slice(0, 24);
}
