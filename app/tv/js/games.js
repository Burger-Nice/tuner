// NBA: today's games, box scores, the spoiler shield, the per-channel score delay, and which channels carry a game.
// Every surface that shows a score asks `show(g)` for it, so the shield and the synced delay hold everywhere.
import { launchDone } from './launch.js';
import { S, store, settings, saveSettings, scoped, emit, on } from './state.js';
import { catalog, ensure } from './catalog.js';
import { guideFor, onNow, warm } from './guide.js';
import { peek, peekAll, want as wantData } from './league.js';

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
export const gameById = (id) => nba.today.find((g) => g.id === id) || [...nba.other.values()].flat().find((g) => g.id === id)
  || peekAll('schedule:').map(([, d]) => (d.games || []).find((g) => g.id === id)).find(Boolean) || null;   // (a team page's schedule)
export const myGame = () => nba.today.find(isMine) || null;
export const liveGames = () => nba.today.filter((g) => g.state === 'in');
export const ordinal = (n) => (n <= 4 ? `Q${n}` : n === 5 ? 'OT' : `${n - 4}OT`);
// (a hidden game in overtime reads 'Live': "OT" would say it was tied)
export const clockText = (g) => (g.state === 'in' ? (g.period > 4 && hidden(g) ? 'Live' : /half/i.test(g.detail) ? 'Halftime' : /end of/i.test(g.detail) ? `End ${ordinal(g.period)}` : `${ordinal(g.period)} ${g.clock}`) : g.state === 'post' ? 'Final' : '');

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
  for (const g of x.games) if (g.state === 'in' && Date.now() - g.date > 4 * 3600e3) { g.state = 'post'; g.final = true; }
  nba.today = sortGames(x.games);
  nba.todayDay = x.day;
  nba.stale = true;
}
export function startNba() {
  if (nba.started) return;
  nba.started = true;
  fromSaved();
  seenStore();   // the first launch with this store: "seen" starts here, and stays put
  if (nba.today.length) emit('nba');
  prunePins();
  if (favTeam()) wantData(`schedule:${favTeam()}`);
  refreshToday();
  sumTick();
  setTimeout(recentNights, 4000);
}
// In All games mode the last three nights' finals can be unseen too (the auto-seen window): their scoreboards are needed
// to know them. Retried every minute until they come; asked again whenever ESPN's day moves on.
let nightsT = 0, nightsDay = '';
async function recentNights() {
  clearTimeout(nightsT);
  if (shieldMode() !== 'all') return;
  nightsDay = nba.todayDay;
  const r = await Promise.allSettled([-1, -2, -3].map((o) => dayGames(o)));
  if (r.some((x) => x.status === 'rejected')) nightsT = setTimeout(recentNights, 60000);
  else emit('nba');
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
    const before = new Map(nba.today.map((g) => [g.id, g.state]));
    nba.today = sortGames(r.games.map((g) => merge(g)));
    nba.todayDay = r.day;
    tipOffs(before);
    prunePins();
    if (nightsDay && nightsDay !== r.day) setTimeout(recentNights, 0);
    nba.err = ''; nba.stale = false; nba.at = Date.now();
    for (const g of nba.today) remember(g);
    store.set(SAVED, { at: Date.now(), day: r.day, games: r.games });
  } catch (e) { nba.err = e.message; }
  emit('nba');
  timer = setTimeout(refreshToday, nba.stale ? 30000 : nba.today.some((g) => g.state === 'in') ? 15000 : 120000);
}
// A shielded game tipping off: keep the league as it stood before it (SPEC 8.1). A game you're watching whose final buzzer
// just sounded: seen for good.
function tipOffs(before) {
  for (const g of nba.today) {
    const was = before.get(g.id);
    // only a game in progress: one already final may be in the standings by now (the app was closed through it)
    if (shieldMode() !== 'off' && shielded(g) && g.state === 'in' && was !== 'in' && was !== 'post' && !isSeen(g)) pinAt(g);
    if (g.state === 'post' && was && was !== 'post') { if (!finalAt.has(g.id)) finalAt.set(g.id, Date.now()); buzzer(g); }
  }
}
// (only while the player is up on it: a tune-in you left earlier stays revealed for this session only)
function buzzer(g) { if (watch.gameId === g.id && watch.up) markSeen(g.id); }
on('player-closed', () => { watch.up = false; });
// Keep a summary's fresher score on the scoreboard entry.
function merge(g) {
  const s = nba.sums.get(g.id);
  if (s && s.at > (g._at || 0) && s.game.state !== 'pre') {
    Object.assign(g, { state: s.game.state, final: s.game.final ?? g.final, detail: s.game.detail || g.detail, clock: s.game.clock, period: s.game.period });
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
  bump();
  return games;
}
export function dayLabel(offset) {
  const d = nba.todayDay ? new Date(nba.todayDay + 'T12:00:00') : new Date();
  d.setDate(d.getDate() + offset);
  const rel = { '-1': 'Yesterday', 0: 'Today', 1: 'Tomorrow' }[offset];
  const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });   // 'Mon 26 Oct'
  return rel ? `${rel} · ${date}` : date;
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
      const g = gameById(id), was = g?.state;
      if (g) { merge(g); remember(g); if (was && was !== 'post' && g.state === 'post') { if (!finalAt.has(g.id)) finalAt.set(g.id, Date.now()); buzzer(g); } }
      nba.sumFail.delete(id);
      emit('summary', id);
    } catch { if (!nba.sumFail.has(id)) { nba.sumFail.set(id, Date.now()); emit('summary', id); } }
  }
  const live = [...want].some((id) => gameById(id)?.state === 'in');
  sumTimer = setTimeout(sumTick, live ? 10000 : 60000);
}
export const summaryOf = (id) => nba.sums.get(id) || null;
// One game's box score and plays now, whatever the polling is doing (Sync score; 6 s at most). Resolves either way.
export async function fetchSummary(id) {
  try {
    const s = await Promise.race([NBA.summary(id), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 6000))]);
    s.at = Date.now();
    nba.sums.set(id, s);
    const g = gameById(id);
    if (g) { merge(g); remember(g); }
    nba.sumFail.delete(id);
    emit('summary', id);
  } catch {}
}

// ---------- score delay: per channel ----------
// IPTV streams run behind the real game. While you watch a game, every surface shows it as it was `delay` seconds ago.
const DEFAULT_DELAY = 60;
const delays = () => store.get(scoped('delays'), {});
export const delayFor = (chId) => { const d = delays()[chId]; return d == null ? DEFAULT_DELAY : d; };
export const delayKnown = (chId) => delays()[chId] != null;
export function setDelay(chId, sec) { const d = delays(); d[chId] = sec; store.set(scoped('delays'), d); emit('nba'); }
export const watch = { gameId: null, chId: null, lag: 0 };   // set by the player: the game on the channel you're watching
// lag: seconds a stall has put the picture further behind (the player reports it); every score waits for it too
export function setLag(sec) { if (watch.lag !== sec) { watch.lag = sec; emit('nba'); } }
const finalAt = new Map();   // gameId -> when airglow first saw it final: a delayed view holds the last live moment until then + delay
const lastSeen = new Map();   // gameId -> the channel you last watched it on: its scores stay at that delay until it ends
export function setWatching(gameId, chId) {
  if (gameId && chId) lastSeen.set(gameId, chId);
  if (watch.gameId && watch.gameId !== gameId) wantSummary(watch.gameId, false);
  watch.gameId = gameId; watch.chId = chId; watch.up = !!gameId;
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
  const lag = watch.gameId === g.id ? watch.lag || 0 : 0;
  const d = ch ? (delayFor(ch) + lag) * 1000 : 0, h = hist.get(g.id);
  // a game that has just ended is still live on your stream until its delay has passed
  // (a game you tune to that airglow first sees already final: its end is counted from now)
  if (g.state === 'post' && watch.gameId === g.id && !finalAt.has(g.id)) finalAt.set(g.id, Date.now());
  const ending = g.state === 'post' && finalAt.has(g.id) && Date.now() - finalAt.get(g.id) < d;
  if (!ch || (g.state !== 'in' && !ending)) return { g, s };
  if (ending && !h?.length) return { g, s, pending: true };   // no live moment kept to show: nothing until it has passed
  if (!d || !h?.length) return { g, s };
  const target = Date.now() - d;
  let pick = h[0];
  for (const e of h) if (e.t <= target) pick = e;
  return { g: pick.g, s: pick.s || s, delay: d / 1000 };
}

// ---------- the spoiler shield ----------
// Read on every card of every redraw, so kept in memory: refreshed on each 'nba' / 'league' / 'summary' event (games.js
// subscribes first, so it's fresh before any screen redraws) and where it's written.
let modeMem, seenMem = null, unseenMem = null;
let ver = 0;
function bump() { modeMem = undefined; unseenMem = null; ver++; }
on('nba', bump); on('league', bump); on('summary', bump);
export const shieldMode = () => modeMem || (modeMem = settings().shield || 'off');   // off | mine | all
// Played: live, or over. ESPN sends a postponed or cancelled game as 'post' without completed (no score): not a result.
export const played = (g) => g.state === 'in' || (g.state === 'post' && g.final !== false);
// Maybe played: what airglow has on it may be old (a schedule kept from yesterday, ESPN slow): a game whose tip-off is
// over 10 min gone counts, under the shield, as a result you haven't seen until a fresh copy says otherwise.
const maybePlayed = (g) => played(g) || (g.state === 'pre' && Date.now() - g.date > 10 * 60e3);
// ---------- seen games (design/ui-v1/nba-pages/SPEC.md 8.1) ----------
// Seen is kept across launches as { upTo, ids }: every game that tipped off before upTo is seen, and ids ([id, tip-off])
// are the seen games after it. A game becomes seen when you reveal it (a button that names it) or when its final buzzer
// sounds while you watch it; tuning in for a moment only reveals it for this session (`revealed`). A game nobody
// watched counts as seen after a while: 3 days in All games mode (most games are never watched), 7 days for your team.
const SEEN = 'nbaSeen';
// (with none kept, it starts 12 h back, and that's stored at once so it doesn't move on with the clock)
const seenStore = () => seenMem || (seenMem = store.get(SEEN, null)) || saveSeen({ upTo: Date.now() - 12 * 3600e3, ids: [] });
function saveSeen(s) { seenMem = s; store.set(SEEN, s); bump(); return s; }
export function isSeen(g) {
  if (!g) return true;
  const s = seenStore();
  if (g.date < s.upTo || revealed.has(g.id) || s.ids.some(([id]) => id === g.id)) return true;
  return Date.now() - g.date > (shieldMode() === 'all' ? 3 : 7) * 864e5;
}
// Seen for good (Reveal, or the final buzzer while watching).
export function markSeen(id) {
  const s = seenStore(), g = gameById(id) || knownGames().find((x) => x.id === id);
  revealed.add(id);
  if (!s.ids.some(([x]) => x === id)) s.ids.push([id, g?.date || Date.now()]);
  // ids older than the auto-seen window aren't needed any more
  const cut = Date.now() - 8 * 864e5;
  s.ids = s.ids.filter(([, t]) => t > cut && t >= s.upTo);
  saveSeen(s);
  unpin(g);
  emit('nba');
}
// Several games seen for good at once ("Reveal 3 results" on a table).
export function markSeenMany(ids) {
  const s = seenStore();
  for (const id of ids) {
    const g = gameById(id) || knownGames().find((x) => x.id === id);
    revealed.add(id);
    if (!s.ids.some(([x]) => x === id)) s.ids.push([id, g?.date || Date.now()]);
    unpin(g);
  }
  saveSeen(s);
  emit('nba');
}
// "Reveal n results": everything up to now is seen.
export function revealAll() {
  saveSeen({ upTo: Date.now(), ids: [] });
  for (const g of knownGames()) revealed.add(g.id);
  for (const t of store.get(PINS, [])) window.Core.cache.set(pinKey(t), null);   // nothing is unseen: no copy is needed
  store.set(PINS, []);
  emit('nba');
}
// Every game airglow knows of: today's, the other days looked at, and the team schedules on hand.
export function knownGames() {
  const seen = new Set(), out = [];
  const add = (g) => { if (g && !seen.has(g.id)) { seen.add(g.id); out.push(g); } };
  nba.today.forEach(add);
  for (const list of nba.other.values()) list.forEach(add);
  for (const [, d] of peekAll('schedule:')) (d.games || []).forEach(add);
  return out;
}
// The finished (or live) games in the shield's scope you haven't seen, optionally only those with this team, newest first.
// (worked out once per change: see bump())
export function unseenFor(abbr) {
  if (!unseenMem) unseenMem = shieldMode() === 'off' ? [] : knownGames().filter((g) => maybePlayed(g) && shielded(g) && !isSeen(g)).sort((a, b) => b.date - a.date);
  return abbr ? unseenMem.filter((g) => g.home.abbr === abbr || g.away.abbr === abbr) : unseenMem.slice();
}
// A team's record as you may see it: ESPN's, or, when it played a game you haven't seen, counted from the finals you have
// (with partial: true, so the surface adds the eye-off and drops streak, seed and the like). Needs the team's schedule;
// until it's on hand the record is left out ('').
export function recordFor(t) {
  const un = unseenFor(t?.abbr);
  // in the shield's scope, a team whose schedule isn't on hand may have played a game airglow doesn't know about yet
  if (!un.length && t?.abbr && shielded({ home: t, away: t }) && !peek(`schedule:${t.abbr}`)?.data && shieldMode() !== 'off') {
    wantData(`schedule:${t.abbr}`);
    if (!nba.today.some((g) => g.home.abbr === t.abbr || g.away.abbr === t.abbr)) return { text: '', partial: true, hidden: 0 };
  }
  if (!un.length) return { text: t?.record || '', partial: false, hidden: 0 };
  const d = peek(`schedule:${t.abbr}`)?.data;
  wantData(`schedule:${t.abbr}`);   // (fetches only when it's over 10 min old)
  if (!d) return { text: '', partial: true, hidden: un.length };
  let w = 0, l = 0;
  for (const g0 of d.games) {
    const g = nba.today.find((x) => x.id === g0.id) || g0;   // today's scoreboard is fresher than the schedule
    if (g.state !== 'post' || !played(g) || !isSeen(g)) continue;
    const me = g.home.abbr === t.abbr ? g.home : g.away, op = me === g.home ? g.away : g.home;
    if (+me.score > +op.score) w++; else l++;
  }
  return { text: `${w}-${l}`, partial: true, hidden: un.length };
}

// ---------- copies kept at tip-off (SPEC 8.1): standings, leaders and team stats as they were before a game ----------
// One copy per tip-off time (games that tip off together share it), kept while any game at that time is unseen.
const PINS = 'nbaPins';
const pinKey = (t) => `nba:pin:${t}`;
const pinning = new Set();   // tip-off times being fetched: games that tip off together share one copy
export const pinBusy = (g) => !!g && pinning.has(g.date);
async function pinAt(g) {
  if (store.get(PINS, []).includes(g.date) || pinning.has(g.date)) return;
  pinning.add(g.date);
  try {
    const [standings, teamStats, ...ld] = await Promise.all([NBA.standings(), NBA.teamStats(), ...NBA.LEADERS.map((c) => NBA.leaders(c.key, 10))]);
    await window.Core.cache.set(pinKey(g.date), { at: Date.now(), standings, teamStats, leaders: Object.fromEntries(NBA.LEADERS.map((c, i) => [c.key, ld[i]])) });
    store.set(PINS, [...new Set([...store.get(PINS, []), g.date])]);
  } catch {}
  pinning.delete(g.date);
  emit('league', 'pinned');   // tables showing the cover while it was fetched read it again
}
// The copy from before this game, or null.
export const pinFor = (g) => (g && store.get(PINS, []).includes(g.date) ? window.Core.cache.get(pinKey(g.date)) : Promise.resolve(null));
function unpin(g) {
  if (!g) return;
  const left = knownGames().filter((x) => x.date === g.date && x.id !== g.id && shielded(x) && !isSeen(x));
  if (left.length) return;
  store.set(PINS, store.get(PINS, []).filter((t) => t !== g.date));
  window.Core.cache.set(pinKey(g.date), null);
}
// Copies older than the auto-seen window, or whose games are all seen by now, are dropped.
function prunePins() {
  const cut = Date.now() - 8 * 864e5, keep = [], un = unseenFor();
  for (const t of store.get(PINS, [])) {
    if (t > cut && (pinning.has(t) || un.some((g) => g.date === t) || !knownGames().some((g) => g.date === t))) keep.push(t);
    else window.Core.cache.set(pinKey(t), null);
  }
  store.set(PINS, keep);
}

// ---------- news under the shield (SPEC 8.3) ----------
const RESULT = /\b(win|wins|won|winning|loss|losses|lost|beat|beats|beaten|fell|falls|straight|streak|swept|sweep|clinch\w*|rout\w*|upset|defeat\w*|victor\w*|topped|tops|edged|edges|outlast\w*|rall(y|ied|ies)|held off|holds off|blew out|blow out|cruis\w*|dominat\w*|downed|downs)\b/i;
const SCORE = /\b\d{1,3}\s?[-–]\s?\d{1,3}\b/;
const namesMem = new Map(), coverMem = new Map();   // per game / per story, for this version (see bump())
let memVer = -1;
const fresh = () => { if (memVer !== ver) { namesMem.clear(); coverMem.clear(); memVer = ver; } };
function namesOf(g) {
  fresh();
  if (namesMem.has(g.id)) return namesMem.get(g.id);
  const out = [];
  namesMem.set(g.id, out);
  for (const s of [g.home, g.away]) {
    const t = NBA.team(s.abbr);
    if (t) { out.push(t.nameRe); if (t.cityRe) out.push(t.cityRe); }
    const roster = peek(`roster:${s.abbr}`)?.data;
    if (!roster) wantData(`roster:${s.abbr}`);
    // a player by his surname ("Jr." and the like aren't one)
    for (const p of roster || []) {
      const last = p.name?.split(' ').filter((w) => !/^(jr|sr|ii|iii|iv|v)\.?$/i.test(w)).pop();
      if (last && last.length > 2) out.push(new RegExp(`\\b${last.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'));
    }
  }
  return out;
}
// A result word within 8 words of a name, or a score: the text gives a result away.
function telling(text, names) {
  if (!text) return false;
  if (SCORE.test(text) && names.some((re) => re.test(text))) return true;
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    if (!RESULT.test(words[i])) continue;
    const near = words.slice(Math.max(0, i - 8), i + 9).join(' ');
    if (names.some((re) => re.test(near))) return true;
  }
  return false;
}
// The unseen game a story would give away, or null: it's tagged with that game; or tagged with one of its teams or players
// and published after its tip-off; or its headline or summary tells a result about them. (Round-ups of many teams are only
// covered when their headline or summary does.)
export function storyCover(story) {
  fresh();
  const k = story.id || story.headline;
  if (!coverMem.has(k)) coverMem.set(k, coverOf(story));
  return coverMem.get(k);
}
function coverOf(story) {
  for (const g of unseenFor()) {
    if (story.events?.includes(g.id)) return g;
    const teams = [g.home.abbr, g.away.abbr];
    const names = namesOf(g);
    const roster = new Set(teams.flatMap((a) => (peek(`roster:${a}`)?.data || []).map((p) => p.id)));
    const tagged = story.teams?.some((a) => teams.includes(a)) || story.players?.some((p) => roster.has(p.id));
    const roundup = (story.teams?.length || 0) >= 6;
    // tagged with your team: covered however long ago the game was; with only the opponent: for 72 h after its tip-off
    const mine = favTeam() && teams.includes(favTeam()) && (story.teams?.includes(favTeam()) || story.players?.some((p) => (peek(`roster:${favTeam()}`)?.data || []).some((r) => r.id === p.id)));
    if (tagged && !roundup && story.published >= g.date && (mine || story.published <= g.date + 72 * 3600e3)) return g;
    // tagged with a player while a roster isn't on hand yet: he may be on either team
    const rostersIn = teams.every((a) => peek(`roster:${a}`)?.data);
    if (!rostersIn && !roundup && story.players?.length && story.published >= g.date && story.published <= g.date + 72 * 3600e3) return g;
    const text = `${story.headline} ${story.description}`;
    // a round-up is covered when its headline or summary names either team or one of their players (SPEC 8.3 rule 3)
    if (roundup && story.published >= g.date && names.some((re) => re.test(text))) return g;
    if (telling(text, names)) return g;
    if (!roundup && !tagged && SCORE.test(`${story.headline} ${story.description}`) && shieldMode() === 'all') return g;
  }
  return null;
}
// A story's paragraphs with the ones that would tell an unseen result replaced by null (the reader says what's hidden).
export function shieldParagraphs(paras) {
  const un = unseenFor();
  if (!un.length) return paras;
  const names = un.flatMap(namesOf);
  // any score or record in a paragraph hides it (SPEC 8.3), as does a result word near either team or their players
  return paras.map((p) => (telling(p, names) || SCORE.test(p) ? null : p));
}

// Turning the shield on hides games you revealed earlier too (the one on your screen stays: you're watching it), and
// starts "seen" 12 h back: last night's games start unseen, older ones count as seen.
export const setShield = (m) => {
  if (m !== 'off' && m !== shieldMode()) {
    for (const id of [...revealed]) if (id !== watch.gameId) revealed.delete(id);
    // (never later than it was: a stricter mode, or turning it back on, mustn't count anything new as seen)
    saveSeen({ upTo: Math.min(seenStore().upTo, Date.now() - 12 * 3600e3), ids: watch.gameId ? [[watch.gameId, gameById(watch.gameId)?.date || Date.now()]] : [] });
  }
  saveSettings({ shield: m }); emit('nba');
  if (m === 'all' && nba.started) recentNights();
};
export const shielded = (g) => { const m = shieldMode(); return m === 'all' || (m === 'mine' && isMine(g)); };
// Hidden: no score, no leaders, no records changing, no winner, no "OT".
export const hidden = (g) => !!g && g.state !== 'pre' && shielded(g) && !isSeen(g);
// A Reveal button: seen for good.
export function reveal(id) { markSeen(id); }
// What a surface may show for a game: the synced view, or nothing when it is hidden.
export function show(g) {
  if (!g) return null;
  const v = delayed(g);
  // synced: the delay you matched on this channel; delayed: the delay in use (the 60 s default until you sync).
  const on = watch.gameId === g.id && g.state === 'in';
  return { ...v, hidden: hidden(g) || !!v.pending, synced: on && delayKnown(watch.chId) ? delayFor(watch.chId) : null, delayed: on ? delayFor(watch.chId) : null };
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
