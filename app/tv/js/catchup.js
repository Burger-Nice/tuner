// Catch-up data (design/ui-v1/catchup/SPEC.md 3, 4.3, 5.1, 5.7, 5.8): which sources replay a game (channel archives and
// full-game videos in the provider's Movies), matching videos to games, the shield's masks for guide text and video
// titles, the hero state rows and the one "replays until" formatter. No DOM in here; replay.js plays what this finds.
import { S, settings, emit, on } from './state.js';
import { catalog, ensure, qualityOf, langOf, prefLangs, prettyCat } from './catalog.js';
import { pastFor, pastNow } from './guide.js';
import { launchDone } from './launch.js';
import {
  nba, gameById, knownGames, unseenFor, hidden, shielded, isMine, mySide, favTeam, teamChannel, watchedOn, replayPick,
  quality, telling, namesOf, behindReplay, liveByClock, replayProgress, isSporty, shieldMode,
} from './games.js';

const { NBA } = window;
const DAY = 864e5, H = 3600e3, MIN = 60e3;
export const WINDOW = 3.5 * H;   // a game's replay window: fixed, so the bar never tells how long the game ran (3.5)

// ---------- time ----------
// A game's US Eastern date ('2026-10-26' for a Tue 01:00 UTC tip-off): providers date their videos by it (N2).
let etFmt = null;
export function etDate(t) {
  try { etFmt ||= new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }); return etFmt.format(t); }
  catch { return new Date(t - 5 * H).toISOString().slice(0, 10); }
}
const late = (t) => new Date(t).getHours() < 6;
const night = (t) => new Date(t - 6 * H);
// A game's night: 'Mon 26 Oct · late' (the night rule: a tip-off before 06:00 belongs to the evening before).
export const nightLabel = (t) => `${night(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}${late(t) ? ' · late' : ''}`;
// The one "until" formatter (S2): the window start + the channel's days, read with the night rule. Long:
// 'Thu 29 Oct · late'; short (heroes, whose caption is two lines): 'Thu 29 · late'.
export function keptUntil(start, days, short = false) {
  const u = start + days * DAY, n = night(u);
  return `${n.toLocaleDateString('en-GB', short ? { weekday: 'short', day: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' })}${late(u) ? ' · late' : ''}`;
}
// Owner decision 13.8: 'Replays for 3 days' / 'No replays on this channel'.
export const keptWords = (days) => `Replays for ${days} day${days === 1 ? '' : 's'}`;
export const NOT_KEPT = 'No replays on this channel';

// ---------- dates in a title (3.3, 5.7) ----------
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const DATE_RES = [
  [/\b(20\d\d)[-./](\d{1,2})[-./](\d{1,2})\b/g, (m) => ({ y: +m[1], m: +m[2], d: +m[3] })],                       // 2026-10-26
  [/\b(\d{1,2})[.-](\d{1,2})[.-](20\d\d|\d\d)\b/g, (m) => ({ y: yy(m[3]), m: +m[2], d: +m[1] })],                 // 26.10.2026, 26-10-2026
  [/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d\d|\d\d))?\b/g, (m) => ({ y: yy(m[3]), m: +m[1], d: +m[2] })],                // 10/26/2026, 10/26
  [/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?(?:,?\s+(20\d\d))?\b/gi, (m) => ({ y: yy(m[3]), m: MON[m[2].toLowerCase()], d: +m[1] })],   // 26 Oct
  [/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d\d))?\b/gi, (m) => ({ y: yy(m[3]), m: MON[m[1].toLowerCase()], d: +m[2] })],   // Oct 26
  [/\b(\d{1,2})[.-](\d{1,2})\b/g, (m) => ({ y: 0, m: +m[2], d: +m[1] })],                                          // 26.10, 26-10
];
function yy(s) { if (!s) return 0; const n = +s; return n < 100 ? 2000 + n : n; }
// The dates a title carries, and the title with them taken out (S2: dates go before telling() and the score pattern).
export function datesIn(text) {
  let rest = String(text || '');
  const out = [];
  for (const [re, f] of DATE_RES) {
    rest = rest.replace(re, (...a) => { const d = f(a); if (d.m >= 1 && d.m <= 12 && d.d >= 1 && d.d <= 31) { out.push(d); return ' '; } return a[0]; });
  }
  return { dates: out, rest };
}
export const stripDates = (t) => datesIn(t).rest;
// Whole days between a title's date and an ET date ('2026-10-26'); a date without a year takes the game's.
function dayDiff(d, et) {
  const [y, m, dd] = et.split('-').map(Number);
  return Math.round((Date.UTC(d.y || y, d.m - 1, d.d) - Date.UTC(y, m - 1, dd)) / DAY);
}

// ---------- matching a video to a game (3.3) ----------
const HIGHLIGHTS = /highlights?|top plays|recap|\bbest of\b/i;
const CONDENSED = /condensed|\bmini\b|in 20 min/i;
const REPLAY_CAT = /\bnba\b|basketball|replays?/i;
// The NBA-ish videos of a movie list, found once per list: anything naming a team (the per-game matching only looks at these).
let vidIx = { c: null, list: [] };
const ANY_TEAM = new RegExp(`(^|[^\\p{L}])(${NBA.TEAMS.flatMap((t) => [t.name, ...(t.cityRe ? [t.city] : [])]).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}])`, 'iu');
export function nbaVideos() {
  const c = catalog.movie;
  if (!c) return [];
  if (vidIx.c !== c) vidIx = { c, list: c.items.filter((x) => ANY_TEAM.test(x.name)) };
  return vidIx.list;
}
const catOf = (m) => catalog.movie?.catName?.get(m.cat) || '';
// The feed a title names: the team whose city or nickname sits next to 'feed', or 'home' / 'away feed'.
function feedOf(name, g) {
  for (const side of [g.home, g.away]) {
    const t = NBA.team(side.abbr);
    if (!t) continue;
    const who = [t.name, ...(t.cityRe ? [t.city] : [])].map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    if (new RegExp(`(${who})\\s*(feed|broadcast|tv)\\b|\\b(feed|broadcast)\\s*[:\\-–]?\\s*(${who})`, 'i').test(name)) return side;
  }
  if (/\bhome\s+(feed|broadcast)\b/i.test(name)) return g.home;
  if (/\baway\s+(feed|broadcast)\b/i.test(name)) return g.away;
  return null;
}
// Is this video (a movie item: name, cat, added) a full-game video of game g? null, or what kind it is.
export function matchVideo(m, g) {
  const name = m?.name || '';
  if (!name || !g || HIGHLIGHTS.test(name)) return null;
  if (NBA.matchScore(name, g) < 10) return null;
  const et = etDate(g.date), { dates } = datesIn(name), relax = REPLAY_CAT.test(catOf(m)) ? 2 : 1;
  if (dates.length) { if (!dates.some((d) => Math.abs(dayDiff(d, et)) <= relax)) return null; }
  else {
    // undated: added within 3 days after the tip-off, and those teams played only once in that window
    const a = (+m.added || 0) * 1000;
    if (!a || a < g.date || a > g.date + 3 * DAY) return null;
    const pair = (x) => [x.home.abbr, x.away.abbr].sort().join();
    if (knownGames().some((x) => x.id !== g.id && pair(x) === pair(g) && Math.abs(x.date - g.date) < 4 * DAY)) return null;
  }
  const feed = feedOf(name, g);
  return { condensed: CONDENSED.test(name), feed, q: qualityOf(name) || qualityOf(catOf(m)), lang: langOf(name) || langOf(catOf(m)) };
}
// Every video naming either team of a game, newest first (Choose a video, 5.7): up to 40.
export function videosNaming(g) {
  const res = [g.home, g.away].map((s) => NBA.team(s.abbr)).filter(Boolean);
  const names = (m) => res.some((t) => t.nameRe.test(m.name) || t.cityRe?.test(m.name));
  return nbaVideos().filter(names).sort((a, b) => (b.added || 0) - (a.added || 0)).slice(0, 40);
}

// ---------- the shield over video titles (M4, N3, S2, S5) ----------
const SCORE2 = /\b(6\d|[7-9]\d|1\d\d)\s?(:|—|–|-|to)\s?(6\d|[7-9]\d|1\d\d)\b/;
const RESULT2 = /\b(OT|2OT|3OT|overtime|win|wins|won|beat|beats|lost|loses)\b|\b[WL] (?=\d)|(^|\s)[WL]\s/i;
const teamsNamed = (text, g) => [g.away, g.home].filter((s) => { const t = NBA.team(s.abbr); return t && (t.nameRe.test(text) || t.cityRe?.test(text)); });
const maskMem = new Map();
let maskKey = '';
// What a movie title may show under the shield: null (its own name), or
//   { kind: 'game', g, title: 'Grizzlies at Jazz', meta: 'Mon 26 Oct · Full game' }   a full-game video of a hidden game
//   { kind: 'named', g, title: 'Video naming the Grizzlies and the Jazz' }               a title that could tell
// A title naming a hidden game's team (or one of its players), undated or dated from the game's ET date − 1 day on, goes
// through telling(), the score pattern and the result words once its dates are taken out; naming both teams of the
// game is enough to hide it (it can't be read with certainty). Dated two or more days before: its own name.
export function videoMask(it) {
  const m = it?.versions?.[0] || it;
  if (!m?.name) return null;
  const un = unseenFor();
  if (!un.length) return null;
  const key = un.map((g) => g.id).join();
  if (key !== maskKey) { maskMem.clear(); maskKey = key; }
  const k = `${m.kind || 'movie'}:${m.id}`;
  if (maskMem.has(k)) return maskMem.get(k);
  let out = null;
  for (const g of un) {   // (newest first: a title naming teams of more than one hidden game goes with the most recent)
    const names = namesOf(g);
    const teams = teamsNamed(m.name, g);
    if (!teams.length && !names.some((re) => re.test(m.name))) continue;
    const { dates, rest } = datesIn(m.name), et = etDate(g.date);
    if (dates.length && dates.every((d) => dayDiff(d, et) <= -2)) continue;   // a preview, an older game: its own name
    const full = matchVideo(m, g);
    if (full) { out = { kind: 'game', g, full, title: `${g.away.name} at ${g.home.name}`, meta: `${nightLabel(g.date).replace(' · late', '')}${full.condensed ? ' · Condensed game' : ' · Full game'}` }; break; }
    const both = teams.length === 2;
    if (both || telling(rest, names) || SCORE2.test(rest) || RESULT2.test(rest)) {
      const who = (teams.length ? teams : [g.away, g.home]).map((s) => `the ${s.name}`).join(' and ');
      out = { kind: 'named', g, title: `Video naming ${who}` };
      break;
    }
  }
  maskMem.set(k, out);
  return out;
}
// For a title that names a hidden game's team but isn't one: which hidden game's Choose a video it opens (S5): the most
// recent hidden game of a team it names.
export function maskGameFor(it) {
  const mk = videoMask(it);
  return mk?.g || null;
}

// ---------- the shield over guide text (4.3: S4, S6, S3, M3) ----------
const STUDIO = /sportscenter|first take|nba today|gametime|inside the nba|the jump|highlights|sports news/i;
// A programme as a surface may show it: { title, desc, mask: '' | 'desc' (Description hidden) | 'results' (May show
// last night's results), studio (an NBA studio show: On now says May show results), game (the hidden game it is) }.
export function programmeView(ch, p) {
  if (!p) return { title: '', desc: '', mask: '' };
  const out = { title: p.title, desc: p.desc || '', mask: '', studio: false, game: null, held: false };
  const un = unseenFor();
  if (!un.length) return out;
  const sporty = isSporty(ch), now = Date.now();
  for (const g of un) {
    if (p.end <= g.date - 30 * MIN) continue;
    // the game's own listing (and its re-airs): its description is hidden
    if (NBA.matchScore(p.title, g) >= 10) { out.game = out.game || g; out.desc = ''; out.mask = out.mask || 'desc'; continue; }
    if (!sporty) continue;
    // behind in its replay: the channel that carried it keeps the game's own title from tip-off to + 3 h 30 (7.2)
    if (behindReplay(g) && watchedOn(g.id) === String(ch.id) && liveByClock(g) && p.start <= now && p.end > now) {
      Object.assign(out, { title: `NBA: ${g.away.name} at ${g.home.name}`, desc: '', mask: 'desc', held: true, game: g });
      continue;
    }
    if (p.end > g.date && p.start < g.date + WINDOW + 12 * H && STUDIO.test(p.title)) { out.studio = true; out.desc = ''; out.mask = 'results'; }
    if (p.end > g.date && p.start < g.date + 72 * H) {
      const names = namesOf(g), t = stripDates(out.title);
      if (telling(t, names) || (SCORE2.test(t) && names.some((re) => re.test(t)))) { out.title = `${ch.name} · studio show`; out.desc = ''; out.mask = 'results'; }
      else if (out.desc && (telling(stripDates(out.desc), names) || SCORE2.test(stripDates(out.desc)))) { out.desc = ''; out.mask = 'results'; }
    }
  }
  return out;
}
// A matched re-air of a hidden game, later on (S12): drawn from its start to start + 2 h 30 with its start time only.
export const reairOf = (ch, p) => { const v = programmeView(ch, p); return v.game && p.start > v.game.date + 2 * H && p.start > Date.now() ? v.game : null; };

// ---------- which sources replay a game (3.2 to 3.4) ----------
// Each source: { kind: 'channel' | 'video', id, name, detail, ch?, prog? (the table's programme: raw start, has_archive),
// windowStart, days?, video?, condensed?, feed?, confirmed, best }. Kept per game for an hour, and looked for again
// hourly (up to 3 days) while a hidden game has none, and when the movie list changes.
const cache = new Map();   // gameId -> { at, list, looked: { at, tables, videos } }
const jobs = new Map();
on('catalog', (k) => { if (k === 'movie' || k === 'live') { for (const [id, c] of cache) if (!c.list.length || k === 'live') cache.delete(id); } });
on('session', () => { cache.clear(); jobs.clear(); });
// (the ranking changed: Account > NBA > Replays play)
export function forgetReplays() { cache.clear(); emit('replays', null); }
export const replaysOf = (g) => (g ? cache.get(g.id)?.list || null : null);
export const replaysLooked = (g) => cache.get(g?.id)?.looked || null;
export const bestReplay = (g) => replaysOf(g)?.[0] || null;
// A channel replay counts while its window start is inside the archive, and it has started.
const inArchive = (ch, ws) => ch?.archive > 0 && ws >= Date.now() - ch.archive * DAY && ws <= Date.now();
export function findReplays(g, { force = false } = {}) {
  if (!g || g.state === 'pre' || !S.acc) return Promise.resolve([]);
  const hit = cache.get(g.id);
  if (!force && hit && Date.now() - hit.at < H) return Promise.resolve(hit.list);
  if (!jobs.has(g.id)) jobs.set(g.id, scan(g).finally(() => jobs.delete(g.id)));
  return jobs.get(g.id);
}
export const replaysBusy = (g) => jobs.has(g?.id);
const NBA_CH = /\bnba\b|league pass/i;
async function scan(g) {
  const my = S.epoch;
  await launchDone;
  const live = await ensure('live').catch(() => null);
  await ensure('movie').catch(() => null);
  if (my !== S.epoch) return [];
  const tip = g.date, at5 = tip + 5 * MIN, chans = [], seen = new Set();
  let tables = 0;
  // a channel's programme at tip-off + 5 min, from its table (null when it has none or names another game)
  const tableOf = async (ch) => { tables++; const l = pastNow(ch) || await pastFor(ch); return l || []; };
  const progAt = (list) => list.find((p) => p.start <= at5 && p.end > at5) || null;
  const addCh = (ch, prog, why, confirmed = true) => {
    if (!ch || seen.has(String(ch.id))) return;
    if (prog && prog.kept === false) return;
    const ws = prog ? prog.start : tip - 15 * MIN;
    if (!inArchive(ch, ws)) return;
    seen.add(String(ch.id));
    chans.push({ kind: 'channel', id: String(ch.id), ch, prog, windowStart: ws, days: ch.archive, name: ch.name, why, confirmed, q: quality(ch.name), detail: confirmed ? 'Channel replay · quarter skips' : 'Your team\'s channel', badge: confirmed ? '' : 'Not confirmed' });
  };
  const kept = (live?.items || []).filter((ch) => ch.archive > 0 && !ch._sep);
  const named = kept.filter((ch) => NBA.matchScore(ch.name, g) >= 10);
  // 2. the channel you watched it on; 3. channels named for the game (event channels)
  const wo = watchedOn(g.id) && live?.byId.get(watchedOn(g.id));
  for (const ch of [wo, ...named].filter(Boolean)) {
    const prog = S.src?.table && tables < 12 ? progAt(await tableOf(ch)) : null;
    if (prog && NBA.matchScore(prog.title, g) < 10 && NBA.matchGame(prog.title, knownGames())) continue;   // its table says another game
    addCh(ch, prog && NBA.matchScore(prog.title, g) >= 10 ? prog : null, ch === wo ? 'You watched it here' : 'Named for this game');
  }
  // 4. kept channels whose table had the game at tip-off: NBA / League Pass first, then sports channels (12 tables at most)
  if (S.src?.table) {
    const probe = [...kept.filter((ch) => NBA_CH.test(ch.name)), ...kept.filter((ch) => !NBA_CH.test(ch.name) && isSporty(ch))].filter((ch) => !seen.has(String(ch.id)));
    for (let i = 0; i < probe.length && tables < 12; i += 3) {
      const part = probe.slice(i, i + Math.min(3, 12 - tables));
      const lists = await Promise.all(part.map(tableOf));
      if (my !== S.epoch) return [];
      part.forEach((ch, k) => { const p = progAt(lists[k]); if (p && NBA.matchScore(p.title, g) >= 10) addCh(ch, p, 'Guide match'); });
    }
  }
  // 5. your team's remembered channel: only when its table at tip-off matches the game or names no other game
  let unconfirmed = null;
  const tc = isMine(g) && teamChannel(mySide(g).abbr), tch = tc && live?.byId.get(tc);
  if (tch && !seen.has(String(tch.id)) && tch.archive > 0) {
    const list = S.src?.table ? await tableOf(tch) : [];
    const p = progAt(list);
    if (p && NBA.matchScore(p.title, g) >= 10) addCh(tch, p, 'Your team\'s channel');
    else if (list.length && p && !NBA.matchGame(p.title, knownGames())) addCh(tch, null, 'Your team\'s channel');
    else if (!list.length && inArchive(tch, tip - 15 * MIN)) unconfirmed = { kind: 'channel', id: String(tch.id), ch: tch, prog: null, windowStart: tip - 15 * MIN, days: tch.archive, name: tch.name, why: 'Your team\'s channel', confirmed: false, q: quality(tch.name), detail: 'Your team\'s channel · no guide to check', badge: 'Not confirmed' };
  }
  // 6. full-game videos in Movies
  const vids = [], pool = nbaVideos();
  for (const m of pool) {
    const r = matchVideo(m, g);
    if (!r) continue;
    const cat = catOf(m);
    vids.push({ kind: 'video', id: String(m.id), video: m, condensed: r.condensed, feed: r.feed, q: r.q, lang: r.lang, confirmed: true,
      name: r.condensed ? 'Condensed game' : `Full game${r.feed ? ` · ${NBA.team(r.feed.abbr)?.city || r.feed.name} feed` : ''}`,
      detail: ['Movies', prettyCat(cat).name, r.q === 'Full HD' ? '1080p' : r.q === 'HD' ? '720p' : r.q === '4K' ? '4K' : ''].filter(Boolean).join(' · ') });
  }
  const mineSide = isMine(g) ? mySide(g).abbr : null, langs = prefLangs();
  const qn = (q) => ({ '4K': 4, 'Full HD': 3, HD: 2, SD: 1 }[q] || 1.5);
  const lr = (l) => { const i = langs.indexOf(l); return i < 0 ? (l ? 20 : 10) : i; };
  vids.sort((a, b) => (mineSide ? (b.feed?.abbr === mineSide) - (a.feed?.abbr === mineSide) : 0) || qn(b.q) - qn(a.q) || lr(a.lang) - lr(b.lang));
  // 3.4: your pick, then channel replays (best picture, then the one you watched on), then full games, the unconfirmed
  // team channel, condensed games. "Full-game video first" (Account > NBA > Replays play) puts the full games first.
  chans.sort((a, b) => b.q - a.q || (b.why === 'You watched it here') - (a.why === 'You watched it here'));
  const full = vids.filter((v) => !v.condensed), cond = vids.filter((v) => v.condensed);
  let list = settings().replaysPlay === 'video' ? [...full, ...chans] : [...chans, ...full];
  list = [...list, ...(unconfirmed ? [unconfirmed] : []), ...cond];
  const pick = replayPick(g.id), pi = pick ? list.findIndex((x) => x.kind === pick.kind && x.id === pick.id) : -1;
  if (pi > 0) list.unshift(...list.splice(pi, 1));
  list.forEach((x, i) => { x.best = i === 0; });
  cache.set(g.id, { at: Date.now(), list, looked: { at: Date.now(), tables: kept.length ? Math.min(tables, 12) : 0, videos: pool.length } });
  emit('replays', g.id);
  // nothing yet for a hidden game: looked for again in an hour, for up to 3 days
  if (!list.length && hidden(g) && Date.now() - g.date < 3 * DAY) setTimeout(() => { if (cache.get(g.id)?.list.length === 0) findReplays(g, { force: true }); }, H);
  return list;
}
// The caption under a source (heroes: two short lines; the game page: one line).
export function sourceCaption(src, { short = true } = {}) {
  if (!src) return '';
  if (src.kind === 'channel') return `${src.name}${short ? '<br>' : ' · '}${short ? 'Until' : 'replays until'} ${keptUntil(src.windowStart, src.days, short)}`;
  return `Full game in Movies${src.feed ? `${short ? '<br>' : ' · '}${NBA.team(src.feed.abbr)?.city || src.feed.name} feed` : ''}`;
}

// ---------- the hero state table's catch-up rows (5.1) ----------
// kind: 'live-tipoff' (live, not started by you, a replay exists), 'behind' (live, you're behind in a replay, until
// tip-off + 3 h 30), 'resume' (stopped partway), 'morning' (final, hidden, a replay exists), 'looking' (final, hidden,
// none found yet), 'seen' (final, seen or shield off, within 12 h, a replay exists); null: no catch-up row.
export function heroRow(g) {
  if (!g || g.state === 'pre') return null;
  const src = bestReplay(g), p = replayProgress(g.id);
  const pos = p?.item?.pos || null;   // { chapter, clock } at the aired moment − 90 s
  if (behindReplay(g)) return { kind: liveByClock(g) ? 'behind' : 'resume', src, pos, p };
  if (g.state === 'in') return src ? { kind: 'live-tipoff', src } : null;
  if (hidden(g)) {
    if (p && !p.done && p.t > 30 && !p.item?.live) return { kind: 'resume', src, pos, p };
    return src ? { kind: 'morning', src } : { kind: 'looking', busy: replaysBusy(g) || !replaysOf(g) };
  }
  return src && Date.now() - g.date < WINDOW + 12 * H ? { kind: 'seen', src } : null;
}
// Home's second priority (5.1): your team's last game, hidden, with a replay, from 30 min after its final until its
// buzzer has played in a replay or you reveal it, its replay expires, 48 h pass, or the next game's 3 h window opens.
export function morningGame() {
  const t = favTeam();
  if (!t || shieldMode() === 'off' || settings().heroGame === false) return null;
  const mine = knownGames().filter((g) => g.home.abbr === t || g.away.abbr === t);
  const now = Date.now();
  const last = mine.filter((g) => g.state === 'post' && g.date < now).sort((a, b) => b.date - a.date)[0];
  if (!last || !hidden(last) || now - last.date > 48 * H) return null;
  if (mine.some((g) => g.state !== 'post' && g.date > last.date && g.date - now < 3 * H)) return null;
  if (!replaysOf(last)) { findReplays(last); return null; }
  return bestReplay(last) || (replayProgress(last.id)?.t > 30 ? last : null) ? gameById(last.id) || last : null;
}
// The day row's caption on the hub (5.3): '⟲ = replay' while the day shown has one.
export const dayHasReplay = (games) => games.some((g) => replaysOf(g)?.length);
