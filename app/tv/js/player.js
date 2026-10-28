// Playback: every channel, movie and episode plays in the TV's native player (Media3, android/.../PlayerActivity.java).
// This module sends it the channel ring (the group you tuned from), tells it what the player can't know (what's on,
// the game on this channel at the synced delay, live games, groups, favourites) and acts on what you pick in its panels.
// It also records where you got to in movies and episodes.
import { S, settings, emit, on, store, scoped, recordProgress, progressOf, inProgress, addRecent, isFav, toggleFav, favList, saveSettings, markWatched } from './state.js';
import { busy, catalog, versionLabel, pickVersion, forget, ensure, prefLangs } from './catalog.js';
import { subSettings, subState, forPlayer, prepare, retryNow, subMemory, cancelChecks, checkFor, checkedFor, playable, noteStart } from './subs.js';
import { NAME_ISO1 } from './subs/lang.js';
import { providerCopy, rank, copyLine, cutLabel } from './copies.js';
import { matchTitle } from './imdb.js';
import { segmentsFor } from './intros.js';
import { showStore, introMode, offerDue, doubtful, episodeKey, afterSkip, afterChoice, afterLetGo, watchedBefore } from './skipshow.js';
import { keyOf } from './util.js';
import { native } from './native.js';
import { programmeView } from './catchup.js';
import { nba, fetchSummary, gameOn, gameById, setWatching, setLag, show, watch, delayFor, setDelay, recentClocks, clockText, findFeeds, feedsNow, liveGames, myGame, isMine, mySide, hidden, reveal, shieldMode, ordinal, shielded, behindReplay, replayProgress, chaptersOf } from './games.js';
import { guideFor, guideNow, onNow, nextUp, resetGuides } from './guide.js';
import { go } from './router.js';
import { teamPalette, hm } from './util.js';
import { toast } from './ui.js';
import { sfx } from './sfx.js';

export const ctx = { cur: null };   // { kind: 'live' | 'vod', items, index, session, ring }
let sentKey = '';
busy.watching = () => !!ctx.cur;
export const watching = () => !!ctx.cur;
const cmd = (what, arg) => native?.player.command([what, typeof arg === 'string' ? arg : JSON.stringify(arg)]);
export const urlOf = (c) => (c.sources.find((s) => s.engine === 'mpegts') || c.sources[0]).url;
// The provider's account check (status, expiry, streams in use and allowed), for the playback diagnosis; M3U has none.
export const apiUrl = () => (S.acc?.type === 'xtream' && S.acc.server ? `${S.acc.server}/player_api.php?username=${encodeURIComponent(S.acc.username)}&password=${encodeURIComponent(S.acc.password)}` : '');
// A channel list for the player, kept small: one URL pattern ("…/live/user/pass/{id}.ts") and a row per channel
// [id, name, number, logo, url (only when it doesn't follow the pattern)]. 30,000 channels were 5.7 MB as objects.
const packed = new WeakMap();
function pack(list) {
  const hit = packed.get(list);
  if (hit && hit.n === list.length) return hit.v;
  let tpl = '';
  const u0 = list[0] && urlOf(list[0]), id0 = list[0] && String(list[0].id), at = u0 ? u0.lastIndexOf(id0) : -1;
  if (at > 0) tpl = u0.slice(0, at) + '{id}' + u0.slice(at + id0.length);
  const [pre, post] = tpl ? tpl.split('{id}') : ['', ''];
  const rows = list.map((c) => {
    const id = String(c.id), u = urlOf(c);
    const row = [id, c.name, c.num || 0, c.logo || ''];
    if (!tpl || u.length !== pre.length + id.length + post.length || !u.startsWith(pre) || !u.endsWith(post) || u.slice(pre.length, u.length - post.length) !== id) row.push(u);
    return row;
  });
  const v = { tpl, entries: rows };
  packed.set(list, { n: list.length, v });
  return v;
}
const chOf = (id) => catalog.live?.byId.get(id) || catalog.live?.byId.get(+id) || ctx.cur?.items.find((c) => String(c.id) === String(id)) || null;

// ---------- live ----------
// ring: the channels Up/Down zap through (the group you tuned from), name: shown in the banner ("Favourites · 3 of 10").
export async function playLive(ch, ring, ringName = 'All channels') {
  if (!ch) return;
  // separator entries ("##### SPORTS #####") are headings, not channels: never in the zap order
  const list = (ring?.length ? ring : catalog.live?.items || [ch]).filter((c) => !c._sep || c.id === ch.id);
  let index = list.findIndex((c) => c.id === ch.id);
  if (index < 0) { list.unshift(ch); index = 0; }
  addRecent(ch);
  emit('tuned', ch);
  if (!native) { toast(`Playing ${ch.name} (the TV player is only on the TV)`); linkChannel(ch); return; }
  cancelChecks();   // (a quality check in flight closes its socket first: SPEC 5.3)
  const key = `${S.epoch}:${list.length}:${list[0].id}:${list[list.length - 1].id}:${ringName}`;
  const opts = { mode: 'live', index, ua: settings().ua, key, ring: ringName, upNext: settings().zapUp !== 'prev', ...playerSettings() };
  let r = key === sentKey ? await native.player.play(opts).catch(() => null) : null;
  if (!r) r = await native.player.play({ ...opts, ...pack(list) }).catch((e) => ({ ok: false, error: e?.message || 'The player could not start.' }));
  if (!r?.ok) { toast(r?.error || 'The player could not start.', 4000); return; }
  sentKey = key;
  sfx.zone('player');
  ctx.cur = { kind: 'live', items: list, index, session: r.session, ring: ringName };
  sent.game = sent.games = sent.pinned = '';
  linkChannel(ch);
  sendMeta([ch.id]);
}

// Which game is on the channel you're watching; while you watch it, every score on screen runs at that channel's delay.
async function linkChannel(ch) {
  let g = gameOn(ch, guideNow(ch));
  if (!g) {
    const list = await guideFor(ch);
    if (ctx.cur && String(ctx.cur.items[ctx.cur.index]?.id) !== String(ch.id)) return;   // zapped on meanwhile
    g = gameOn(ch, list);
  }
  setWatching(g?.id || null, g ? ch.id : null);
  cmd('linked', g ? 'true' : 'false');
  if (g) findFeeds(g).then(() => { sent.game = ''; push(); });
  push();
}

// ---------- what's on, for the banner and the channel list ----------
async function sendMeta(ids) {
  const out = {}, later = [];
  for (const id of ids) {
    const ch = chOf(id);
    if (!ch) continue;
    const list = guideNow(ch);
    if (list) out[id] = metaFor(ch, list); else later.push(ch);
  }
  if (Object.keys(out).length) cmd('meta', out);
  // the rest from the provider, a few at a time
  for (let i = 0; i < later.length && ctx.cur; i += 4) {
    const part = {};
    await Promise.all(later.slice(i, i + 4).map(async (ch) => { part[String(ch.id)] = metaFor(ch, await guideFor(ch)); }));
    if (ctx.cur) cmd('meta', part);
  }
}
function metaFor(ch, list) {
  const now = onNow(list), next = nextUp(list);
  const g = gameOn(ch, list);
  const m = { fav: isFav(ch) };
  if (ch.archive > 0) m.kept = ch.archive;   // (the player's Rewind and pause, Start over, Watch from tip-off: catch-up 6.6)
  // (the shield's view of them: a telling title becomes the studio show's name, a game's description goes, 7.2's held title)
  if (now) { const v = programmeView(ch, now); Object.assign(m, { now: v.title, start: now.start, end: now.end, desc: v.desc || '' }); }
  if (next) Object.assign(m, { next: programmeView(ch, next).title, nextStart: next.start });
  if (g?.state === 'in') m.live = true;
  const feeds = g ? feedsNow(g) : [];
  const k = feeds.findIndex((f) => f.ch.id === ch.id);
  if (k >= 0 && feeds.length > 1) m.feed = `Feed ${k + 1} of ${feeds.length}`;
  return m;
}

// ---------- the rings the player can switch to (its Groups panel) ----------
const gameRing = () => { const out = []; for (const g of liveGames()) for (const f of feedsNow(g)) if (!out.includes(f.ch)) out.push(f.ch); return out; };
function ringGroups() {
  const c = catalog.live;
  if (!c) return [];
  const counts = new Map();
  for (const it of c.items) counts.set(it.cat, (counts.get(it.cat) || 0) + 1);
  const out = [];
  const fav = favList('live').length;
  if (fav) out.push({ key: 'fav', name: 'Favourites', count: fav });
  const lg = gameRing().length;
  if (lg) out.push({ key: 'games', name: 'Live games', count: lg });
  out.push({ key: 'all', name: 'All channels', count: c.items.length });
  for (const k of c.cats) if (counts.get(k.id)) out.push({ key: String(k.id), name: k.name, count: counts.get(k.id) });
  return out.map((g) => ({ ...g, count: g.count.toLocaleString('en') }));
}
function ringOf(key) {
  const c = catalog.live;
  if (!c) return [];
  if (key === 'fav') return favList('live').map((f) => c.byId.get(f.id)).filter(Boolean);
  if (key === 'games') return gameRing();
  if (key === 'all') return c.items;
  return c.items.filter((x) => String(x.cat) === key);
}
function sendRing(list, name, tune) {
  list = list.filter((c) => !c._sep || String(c.id) === String(tune));
  if (!list.length || !ctx.cur) return;
  ctx.cur.items = list;
  ctx.cur.ring = name;
  cmd('ring', { name, ...pack(list), tune: tune ? String(tune) : '' });
}
// A channel picked in the player that isn't in its ring: the Live games ring when it carries a game, else every channel.
function tuneAnywhere(ch) {
  const games = gameRing();
  if (games.includes(ch)) sendRing(games, 'Live games', ch.id);
  else sendRing(catalog.live?.items || [ch], 'All channels', ch.id);
}

// ---------- the game panel, score on picture, live games, the pinned row and the action chip ----------
const sent = { game: '', games: '', pinned: '' };
const chipped = new Set();
const teamOf = (t) => { const c = teamPalette(t); return { abbr: t.abbr, name: t.name, p: c.p, a: c.a, fg: c.fg }; };

function gameData(g) {
  const v = show(g);
  const dg = v.g, s = v.s, hid = v.hidden;
  // Under the shield no points and no shooting (FG gives the scoring away), as on the NBA hub.
  const cols = hid ? ['MIN', 'REB', 'AST'] : ['MIN', 'PTS', 'REB', 'AST', 'FG'];
  const team = (side) => {
    const b = s?.box.find((x) => x.abbr === dg[side].abbr);
    if (!b) return { cols, rows: [] };
    const at = cols.map((l) => b.labels.indexOf(l));
    return { cols, rows: b.players.filter((p) => !p.dnp).map((p) => [p.short || p.name, ...at.map((i) => (i >= 0 ? String(p.stats[i] ?? '') : ''))]) };
  };
  const feeds = feedsNow(g);
  return {
    id: g.id, title: `${g.away.name} at ${g.home.name}`,
    away: teamOf(dg.away), home: teamOf(dg.home),
    score: hid || dg.state === 'pre' ? null : [String(dg.away.score ?? 0), String(dg.home.score ?? 0)],
    clock: dg.state === 'pre' ? `Tip-off ${hm(dg.date)}` : clockText(dg), hidden: hid,
    synced: v.synced, delayed: v.delayed, delay: watch.chId ? delayFor(watch.chId) : 60,
    box: { away: team('away'), home: team('home') },
    plays: hid ? [] : (s?.plays || []).slice(0, 40).map((p) => ({ clock: `${ordinal(p.period)} ${p.clock}`, team: p.team || '', text: p.text || '', scoring: !!p.scoring, score: p.scoring ? `${p.away}–${p.home}` : '' })),
    feeds: feeds.map((f, i) => ({ id: String(f.ch.id), name: f.ch.name, num: f.ch.num || 0, logo: f.ch.logo || '', label: `Feed ${i + 1} of ${feeds.length}${f.why === 'Your pick' ? ' · Your pick' : ''}` })),
    shieldLabel: shieldMode() === 'all' ? 'All games' : 'My team', loading: !s,
    // catch-up 6.6 / 6.9: From tip-off on a kept channel (no game state: only whether it has started, and when)
    kept: (chOf(watch.chId)?.archive || 0) > 0, started: dg.state !== 'pre', tipAt: chaptersOf(g.id).list.find((x) => x.key === 'tip')?.at || g.date || 0,
  };
}
function liveGamesData() {
  const list = liveGames().slice().sort((a, b) => isMine(b) - isMine(a));
  for (const g of list) if (!feedsNow(g).length) findFeeds(g);
  return list.map((g, i) => {
    const f = feedsNow(g)[0];
    const score = hidden(g) ? '' : ` · ${g.away.score ?? 0}–${g.home.score ?? 0}`;
    const pos = shielded(g) && behindReplay(g) ? `You're in ${replayProgress(g.id)?.item?.pos?.chapter || 'the replay'}` : '';   // (catch-up 7.2: never the live clock)
    return {
      id: g.id, title: `${g.away.name} at ${g.home.name}`, live: true, chId: f ? String(f.ch.id) : '',
      sub: `${pos || clockText(g)}${score}${f ? ` · ${f.ch.name}` : ' · No channel found'}`,
      note: i === 0 && hidden(g) ? 'Your team is first and its score is hidden by the spoiler shield. Other games show scores, as on the NBA hub.' : '',
    };
  });
}
function push() {
  const c = ctx.cur;
  if (!c || c.kind !== 'live' || !native) return;
  const g = watch.gameId && gameById(watch.gameId);
  const gj = g ? JSON.stringify(gameData(g)) : '';
  if (gj !== sent.game) { sent.game = gj; cmd('game', gj); }
  const lj = JSON.stringify(liveGamesData());
  if (lj !== sent.games) { sent.games = lj; cmd('games', lj); }
  const mine = myGame();
  const feed = mine?.state === 'in' ? feedsNow(mine)[0]?.ch : null;
  const playing = c.items[c.index];
  const pin = feed && String(feed.id) !== String(playing?.id) ? JSON.stringify({ id: String(feed.id), title: `${mine.away.name} at ${mine.home.name}`, sub: `${feed.name} · Your team`, name: feed.name, logo: feed.logo || '' }) : '';
  if (pin !== sent.pinned) { sent.pinned = pin; cmd('pinned', pin); }
  // Your team just went live on another channel: offer it once.
  if (feed && pin && watch.gameId !== mine.id && !chipped.has(mine.id) && settings().liveAlert !== false) {
    chipped.add(mine.id);
    cmd('chip', { title: `${mySide(mine).name} are live`, sub: feed.name, id: String(feed.id) });
  }
}
setInterval(push, 1000);

// What the player needs from Account: the sound level (for its one sound, Your team is live) and Score on picture.
// Subtitles: Account / the title page keep a language name; the player works in ISO codes.
const SUB_CODE = { English: 'en', Spanish: 'es', French: 'fr', German: 'de', Italian: 'it', Portuguese: 'pt', Dutch: 'nl', Swedish: 'sv', Norwegian: 'no', Danish: 'da', Icelandic: 'is', Polish: 'pl', Turkish: 'tr', Arabic: 'ar', Hindi: 'hi' };
const subCode = (v) => (!v || v === 'auto' ? 'auto' : v === 'off' ? 'off' : SUB_CODE[v] || v);
// The player reports a track's language as the stream has it: 2 letters, 3 letters ("eng", "ger"), or "und".
const ISO3 = { eng: 'en', spa: 'es', fra: 'fr', fre: 'fr', deu: 'de', ger: 'de', ita: 'it', por: 'pt', nld: 'nl', dut: 'nl', swe: 'sv', nor: 'no', nob: 'no', dan: 'da', isl: 'is', ice: 'is', pol: 'pl', tur: 'tr', ara: 'ar', hin: 'hi' };
const subName = (c) => { if (c === 'off') return 'off'; const two = ISO3[String(c).toLowerCase()] || String(c).toLowerCase().slice(0, 2); return Object.keys(SUB_CODE).find((k) => SUB_CODE[k] === two) || null; };
// The subtitle settings for the file's own tracks (design/ui-v1/subtitles/PORT-NATIVE.md 2.1): his languages in order as
// ISO 639-1 codes, Shown first, sounds; a dub's subtitles start off.
const iso1 = (names) => names.map((n) => NAME_ISO1[n] || '').filter(Boolean);
function subsSettings(dub = false) {
  const p = subSettings();
  return { mode: p.mode, langs: iso1(p.langs), shown: iso1(p.shown), sounds: !!p.sounds, dub: !!dub };
}
const playerSettings = (dub) => ({ sounds: sfx.level(), scoreBug: !!settings().scoreBug, sub: subCode(settings().subLang), api: apiUrl(), subs: subsSettings(dub) });

// ---------- movies and episodes ----------
function vodEntry(it, restart, extra) {
  const p = progressOf(it);
  const ep = it.kind === 'episode';
  // (_entry: an add-on copy's or a ranked copy's extra fields for the player: headers, mime, source, the next copies
  // as identities, binge, key, runtime; design/ui-v1/addons/PORT-NATIVE.md. Non-enumerable, so never saved.)
  return { id: `${it.kind}:${it.id}`, url: it.url, title: ep ? it.seriesName : it._title || it.name, sub: ep ? `S${it.season} · E${it.ep} · ${it.name}` : '', startAt: restart ? 0 : inProgress(p) ? p.t : 0, ...(extra || it._entry || {}) };
}
// More episodes after the one playing (Up next), when the series' list arrives after playback started.
export function queueAfter(item, more) {
  const c = ctx.cur;
  if (!c || c.kind !== 'vod' || !more.length || c.items[c.items.length - 1]?.id !== item.id) return;
  c.items.push(...more);
  cmd('queue', { entries: more.map((it) => ({ ...vodEntry(it, false), startAt: 0 })) });
}
// entry: the first item's extra fields for this play only (a ranked provider copy's identity and next copies), so the
// catalog's own version object never carries them into a later play
// One press plays once: a second start of the same video while the first is starting (or within 3 s of it) is dropped,
// so repeated keys or a double answer can't queue plays that Back would then have to close one by one.
let starting = null;
export async function playVod(item, opts = {}) {
  const id = `${item?.kind}:${item?.id}`;
  if (starting && ((starting.busy && Date.now() - starting.at < 15000) || (starting.id === id && Date.now() - starting.at < 3000))) return;   // (a start that never answered stops blocking after 15 s)
  const me = { id, at: Date.now(), busy: true };
  starting = me;
  try { await playVod0(item, opts); } finally { me.busy = false; me.at = Date.now(); }
}
async function playVod0(item, { queue, restart, entry } = {}) {
  const list = queue ? queue.slice(Math.max(0, queue.findIndex((e) => e.id === item.id))) : [item];
  const entries = list.map((it, i) => vodEntry(it, i === 0 && restart, i === 0 ? entry : undefined));
  setWatching(null, null);   // a film or an episode: no game on screen (its final buzzer isn't yours to see)
  if (!native) { if (window.TUNER_TEST) { window.__lastVod = entries; window.__vodCount = (window.__vodCount || 0) + 1; } toast(`Playing ${entries[0].title} (the TV player is only on the TV)`); return; }
  cancelChecks();
  const r = await native.player.play({ mode: 'vod', entries, index: 0, ua: settings().ua, ...playerSettings(subState(subsKey(item))?.copy?.dub) }).catch((e) => ({ ok: false, error: e?.message }));
  if (!r?.ok) { toast(r?.error || 'This video would not play.', 4000); return; }
  sfx.zone('player');
  ctx.cur = { kind: 'vod', items: list, index: 0, session: r.session };
  sentSubs = '';
  sendSubs();
  sendSegments(item);
  versionsNow().then((v) => { if (v && ctx.cur?.session === r.session) cmd('versions', v); });
  // an episode played on its own (Search, a poster, Saved…): the ones after it join for Up next once the series' list is in
  if (item.kind === 'episode' && list.length === 1) import('./actions.js').then((A) => A.episodesOf(item)).then((eps) => { const i = eps.findIndex((e) => String(e.id) === String(item.id)); if (i >= 0 && ctx.cur?.session === r.session) queueAfter(item, eps.slice(i + 1)); }).catch(() => {});
}

// ---------- subtitles in the player (design/ui-v1/subtitles/PORT-NATIVE.md 2) ----------
// The title key the subtitles are kept under: a film's title (all its copies), an episode itself.
const titleOf = (it) => (it?.kind === 'movie' ? catalog.movie?.titleById?.get(it.id) || null : null);
function subsKey(it) { const t = titleOf(it); return t ? keyOf(t) : it ? keyOf(it) : ''; }
const seriesOf = (it) => (it?.kind === 'episode' ? catalog.series?.titleById?.get(it.seriesId) || catalog.series?.items?.find((x) => String(x.id) === String(it.seriesId)) || null : null);
let sentSubs = '';
const playingVod = () => { const c = ctx.cur; return c && c.kind === 'vod' ? c.items[c.index] : null; };
// what the player gets: forPlayer(), or an empty list with why (nothing asked for this title yet, no IMDb id)
function subsPayload(it) {
  const key = subsKey(it);
  const series = seriesOf(it);
  const pl = forPlayer(key, { copyId: keyOf(it), series: series ? keyOf(series) : undefined });
  return pl || { title: key, copy: keyOf(it), list: [], pick: null, files: [], others: [], status: subSettings().online ? 'looking' : 'file-only' };
}
// sent once per change (about 240 KB): the state's shape, not its text, decides
const subsSig = (p) => JSON.stringify([p.status, p.pick, p.list, p.files.map((f) => [f.id, f.mine]), p.others.length, p.retryAt]);
function sendSubs(force) {
  const it = playingVod();
  if (!it || !native?.info?.()?.subs) return;
  const p = subsPayload(it);
  const sig = subsSig(p);
  if (!force && sig === sentSubs) return;
  sentSubs = sig;
  cmd('subs', p);
  if (!subState(subsKey(it))) prepareFor(it);
}
// The player asked and nothing has prepared this title yet (the title page normally has): match it and fetch.
const preparing = new Set();
async function prepareFor(it, extra = {}) {
  const key = subsKey(it);
  if (!key || (preparing.has(key) && !extra.alsoLang)) return;
  preparing.add(key);
  try {
    const ep = it.kind === 'episode';
    const t = ep ? seriesOf(it) : titleOf(it);
    if (!t) { cmd('subs', { ...subsPayload(it), status: 'unsure' }); return; }
    const m = await matchTitle(t).catch(() => null);
    await prepare({
      key, name: t.name, imdb: m?.id || '', level: m?.level || 'unsure', runtime: m?.meta?.runtime,
      version: ep ? null : it, ...(ep ? { season: +it.season, episode: +it.ep, series: keyOf(t) } : {}), ...extra,
    });
  } catch (e) { console.error(e); }
  finally { preparing.delete(key); }
}
on('subs', (key) => { const it = playingVod(); if (it && subsKey(it) === key) sendSubs(); });

// ---------- Skip intro / recap, the credits (design/ui-v1/skip/SPEC.md 9) ----------
// The item's IMDb id (an add-on item has it; a provider film or episode: its title's match, Sure or Likely), then its
// segments, sent once per item with the match level, Account's setting, this show's intro mode and record, and whether a
// recap may be skipped by itself (the episode before was watched). With Account Off nothing is asked (no network: Up
// next keeps the subtitle rule); an episode still gets { mode: 'off' } so the player's Options row can say so. The next
// episode's are asked for at once, so its recap is known before its first frame.
async function imdbOf(it) {
  const ep = it.kind === 'episode';
  const own = ep ? it.imdbSeries : /^tt\d+$/.test(String(it.id)) ? String(it.id) : '';
  if (own) return { imdb: own, level: 'sure' };
  const t = ep ? seriesOf(it) : titleOf(it);
  const m = t ? await matchTitle(t).catch(() => null) : null;
  return m?.id && m.level !== 'unsure' ? { imdb: m.id, level: m.level === 'sure' ? 'sure' : 'likely' } : null;
}
const segQuery = (it, imdb) => ({ imdb, ...(it.kind === 'episode' ? { season: +it.season, episode: +it.ep } : {}) });
// per show (skipshow.js): the choice, the presses counted for the offer, the offers let go, the doubtful mark
const shows = () => showStore(store, scoped('skipShows'));
const showKeyOf = (it, imdb) => (it.kind !== 'episode' ? '' : imdb || `sid:${it.seriesId}`);
const progressList = { of: progressOf, all: () => Object.values(S.progress || {}) };
// what an item's times look like to the player (9.5): its id, the times (empty when the list has nothing: known false),
// the match level, Account's setting, the intro mode for this show, the show, and the recap rule
async function segmentsMsg(it, prev) {
  const account = settings().skipIntro || 'button';
  const base = { id: `${it.kind}:${it.id}`, account, intro: [], recap: [], credits: [], preview: [], known: false, level: '' };
  if (account === 'off') return it.kind === 'episode' ? { ...base, mode: 'off', show: null, recapAuto: false } : null;
  const id = await imdbOf(it).catch(() => null);
  const key = showKeyOf(it, id?.imdb), sh = shows().get(key), ek = episodeKey(it);
  const show = key ? { key, name: seriesOf(it)?.name || it.seriesName || '', episode: ek, choice: sh?.choice || null, offer: offerDue(account, sh, ek), doubtful: doubtful(sh) } : null;
  const seg = id ? await segmentsFor(segQuery(it, id.imdb)) : null;
  if (!seg && !show) return null;
  return { ...base, ...(seg || {}), known: !!seg, level: id?.level || '', mode: introMode(account, sh), show, recapAuto: !show?.doubtful && watchedBefore(it, prev, progressList) };
}
async function sendSegments(it) {
  if (!it || !native?.info?.()?.segments) return;
  const c = ctx.cur, i = c?.items?.indexOf(it) ?? -1;
  const m = await segmentsMsg(it, i > 0 ? c.items[i - 1] : null).catch(() => null);
  if (m && ctx.cur === c && playingVod() === it) cmd('segments', m);
  // the next one, ahead: sent now under its own id, so a recap at 0:00 is known before its first frame (the player
  // keeps it for that item; its recap rule, recapAuto 'prev', is decided when it starts: the item before it ended or
  // played past 80%)
  const next = c?.items?.[i + 1];
  if (next?.kind === 'episode') segmentsMsg(next, it).then((n) => { if (n && ctx.cur === c) cmd('segments', { ...n, ahead: true, recapAuto: n.show?.doubtful || n.mode === 'off' ? false : 'prev' }); }).catch(() => {});
}
// the player's skip events (9.5): a press or a go-back once the way-back chip is over, yes or not now on the offer, a
// pick in Options > Intros in this show (then the times go again, with the show's new mode)
function skipEvent(e, c) {
  const S2 = shows(), name = (it) => seriesOf(it)?.name || it?.seriesName || '';
  if (e.type === 'skip' && e.show) S2.put(e.show, { ...afterSkip(S2.get(e.show), e), name: name(c.items[e.index]) || S2.get(e.show)?.name || '' });
  else if (e.type === 'offer' && e.show && e.letGo) S2.put(e.show, afterLetGo(S2.get(e.show)));
  else if (e.type === 'setting' && e.key === 'skipShow' && e.show) {
    S2.put(e.show, { ...afterChoice(S2.get(e.show), e.value), name: name(c.items[e.index]) || S2.get(e.show)?.name || '' });
    sendSegments(playingVod());
  }
}

// ---------- Options > Quality: the copies of the film with what their checks found (SPEC 7.7, RANKING.md) ----------
const SOUND = (a) => {
  if (!a) return '';
  const m = String(a.mime || '').toLowerCase();
  const name = /eac3|e-ac3|ec-3/.test(m) ? 'Dolby Digital Plus' : /ac3|ac-3/.test(m) ? 'Dolby Digital' : /dts\.hd|dts-hd|dts\.uhd/.test(m) ? 'DTS-HD' : /dts/.test(m) ? 'DTS' : /true-?hd/.test(m) ? 'Dolby TrueHD' : '';
  const ch = a.ch >= 8 ? '7.1' : a.ch >= 6 ? '5.1' : a.ch === 2 ? 'stereo' : a.ch === 1 ? 'mono' : '';
  return [name, ch].filter(Boolean).join(' ');
};
const failedCopies = new Set();   // copies that failed this session ("Try the next copy" passes over them)
async function filmCopies(it) {
  const t = titleOf(it);
  if (!t || !t.versions?.length) return null;
  const pin = store.get(scoped('ver'), {})[t.key];
  const pm = await playable(t.versions).catch(() => new Map());
  const cs = t.versions.map((v) => providerCopy(v, { pinned: pin === v.id, checked: checkedFor(v) }));
  cs.forEach((c) => { c.failed = failedCopies.has(c.id); });
  const ranked = rank(cs, { langs: prefLangs(), playsNow: (c) => { const x = pm.get(c.id); return x ? x.video && x.audio : undefined; } });
  return { t, pin, pm, ranked };
}
// ---------- other copies of what's playing (the player's Quality panel) ----------
// A film: its versions (language, quality). A channel: the provider's channels with the same name once quality tags
// are set aside ("ESPN HD", "ESPN FHD", "ESPN 4K"). Episodes have one copy.
const QTAG = [[/\b(4k|uhd|2160p?)\b/i, '4K'], [/\b(fhd|1080p?)\b/i, 'Full HD'], [/\b(hd|720p?)\b/i, 'HD'], [/\bsd\b/i, 'SD']];
const qTag = (name) => (QTAG.find(([re]) => re.test(name)) || [, ''])[1];
let twinsOf = null;   // channel list -> Map(cleaned name -> channels), built once per list
function channelTwins(ch) {
  const live = catalog.live;
  if (!live || !ch) return [];
  if (twinsOf?.list !== live) {
    const m = new Map();
    for (const x of live.items) { if (x._sep) continue; const k = window.Titles.clean(x.name).key; if (!k) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
    twinsOf = { list: live, m };
  }
  return twinsOf.m.get(window.Titles.clean(ch.name).key) || [ch];
}
async function versionsNow() {
  const c = ctx.cur;
  if (!c) return null;
  const it = c.items[c.index];
  if (!it) return null;
  if (c.kind === 'live') {
    const list = channelTwins(it).slice(0, 8).map((x) => ({ id: String(x.id), name: x.name, label: [qTag(x.name), `Channel ${x.num}`].filter(Boolean).join(' · ') }));
    return { id: String(it.id), list };
  }
  const fc = it.kind === 'movie' ? await filmCopies(it).catch(() => null) : null;
  if (!fc) {
    const vs = titleOf(it)?.versions || [it];
    return { id: `${it.kind}:${it.id}`, list: vs.slice(0, 8).map((v) => ({ id: `${v.kind}:${v.id}`, name: versionLabel(v), label: v.year ? String(v.year) : '' })) };
  }
  // (rows: line 1 the checked quality or the name's claims, line 2 Best · playing · the problem · the sound)
  const { pin, pm, ranked } = fc;
  const best = ranked[0];
  const rows = ranked.slice(0, 8).map((cp, i) => {
    const v = cp.v, k = cp.checked, e = checkFor(v), au = e?.formats?.audio || [];
    const playing = String(v.id) === String(it.id);
    const x = pm.get(cp.id);
    const bits = [];
    if (i === 0) bits.push('Best');
    if (playing) bits.push('playing');
    if (x && !x.audio) bits.push('No sound on this TV');
    else if (x && !x.video) bits.push('This TV can\'t play its picture');
    if (k && cp.claim.res && k.res && cp.claim.res !== k.res) bits.push(`Named ${cp.claim.res}`);
    const cut = k ? cutLabel(k.len, best.checked?.len || 0, k.fps) : '';
    if (cut) bits.push(cut);
    const snd = SOUND(au[0]);
    if (snd) bits.push(x && !x.audio ? `${snd.split(' ').slice(0, -1).join(' ') || snd} only` : snd);   // ('Dolby TrueHD only': the channels left out)
    if (!k) bits.push(e?.status === 'couldnt' ? 'Couldn\'t check' : 'not checked');
    return {
      id: `${v.kind}:${v.id}`, name: versionLabel(v), label: v.year ? String(v.year) : '',
      line1: copyLine(cp) || versionLabel(v), line2: bits.join(' · '), checked: !!k, pinned: pin === v.id, best: i === 0,
      inFile: k ? k.subsInFile : [],
    };
  });
  const me = ranked.find((cp) => String(cp.v.id) === String(it.id));
  const mk = me?.checked;
  const meSound = SOUND(me ? checkFor(me.v)?.formats?.audio?.[0] : null);
  const range = (k) => (k ? (k.dv ? 'Dolby Vision' : k.hdr || '') : '');
  const next = ranked.find((cp) => String(cp.v.id) !== String(it.id) && !failedCopies.has(cp.id) && pm.get(cp.id)?.audio !== false);
  return {
    id: `${it.kind}:${it.id}`, film: true, list: rows, always: !pin, bestId: `${best.v.kind}:${best.v.id}`,
    bestLine: [best.checked?.res || best.claim.res, range(best.checked)].filter(Boolean).join(' '),
    what: { checked: !!mk, line: mk ? [mk.res, range(mk), meSound].filter(Boolean).join(' · ') : '', of: ranked.length > 1 ? (pin && me && pin === me.v.id ? 'your pick' : me === best ? `best of ${ranked.length} copies` : '') : '' },
    next: next && failedCopies.size < 2 ? { id: `${next.v.kind}:${next.v.id}`, line: [copyLine(next), SOUND(checkFor(next.v)?.formats?.audio?.[0])].filter(Boolean).join(' · ') } : null,
  };
}

// ---------- what the player asks for and what you pick in it ----------
native?.player.onEvent((e) => {
  const c = ctx.cur;
  if (!c || e.session !== c.session) return;
  // a replay's own events (position, need, sync, golive…) are replay.js's: only the session's end and settings are here
  if (c.kind === 'replay' && !['exit', 'diag', 'setting', 'goto-account', 'reveal'].includes(e.type)) return;
  if (e.type === 'track') {
    if (c.kind === 'vod') { const moved = c.index !== e.index; c.index = e.index; if (moved) { sentSubs = ''; sendSubs(); sendSegments(c.items[e.index]); } return; }   // (an episode: its own subtitles and intro)
    const i = c.items.findIndex((x) => String(x.id) === String(e.id));
    const it = i >= 0 ? c.items[i] : chOf(e.id);
    if (i >= 0) c.index = i;
    if (it) { addRecent(it); emit('tuned', it); linkChannel(it); sendMeta([it.id]); }
  } else if (e.type === 'need-meta') {
    sendMeta(e.ids || []);
  } else if (e.type === 'need') {
    if (e.what === 'groups') cmd('groups', ringGroups());
    else if (e.what === 'versions') versionsNow().then((v) => { if (v && ctx.cur === c) cmd('versions', v); });
    else if (e.what === 'subs') {   // the Subtitles panel opened with nothing yet, Try now, or a language from Other languages
      const it = playingVod();
      if (!it) return;
      const key = subsKey(it);
      if (e.lang) { subMemory()?.setPick(key, { source: 'opensubtitles', id: '', lang: e.lang }); prepareFor(it, { alsoLang: e.lang }); }
      else if (e.again) { if (!retryNow(key)) prepareFor(it); }
      sendSubs(true);
    }
    else if (e.what === 'games') { sent.games = ''; push(); }
    else if (e.what === 'rewind') emit('rewind-request', { chId: e.chId || e.id, at: +e.at || 0 });   // Start over / rewinding a kept channel past the live link (catch-up 6.8)
    else if (e.what === 'clocks') {
      const g = watch.gameId && gameById(watch.gameId);
      if (!g) { cmd('show-text', 'No NBA game found on this channel'); return; }
      // the plays fresh from ESPN: the ones kept may be minutes old (the app's own polling slows down behind the player)
      fetchSummary(g.id).then(() => {
      const clocks = recentClocks(g.id, e.seenAt);
      window.__lastClocks = clocks.length;   // (the emulator test reads it)
      if (!clocks.length) { cmd('show-text', nba.sums.has(g.id) ? 'ESPN has no plays from the last few minutes to match yet' : 'Couldn’t get the game clocks from ESPN. Try again in a moment'); return; }
      // the list opens on the clock the stored delay points at
      const target = e.seenAt - delayFor(watch.chId) * 1000;
      let current = 0;
      clocks.forEach((x, k) => { if (Math.abs(x.at - target) < Math.abs(clocks[current].at - target)) current = k; });
      const ch = chOf(watch.chId);
      cmd('clocks', { seenAt: e.seenAt, list: clocks, current, note: `Stored for ${ch?.name || 'this channel'}. Scores everywhere follow it.` });
      });
    }
  } else if (e.type === 'group') {
    const name = ringGroups().find((g) => g.key === e.key)?.name || 'All channels';
    sendRing(ringOf(e.key), name);
  } else if (e.type === 'pick') {
    const ch = chOf(e.id);
    if (!ch) { cmd('show-text', 'That channel is not in your list'); return; }
    const i = c.items.findIndex((x) => String(x.id) === String(ch.id));
    if (i >= 0) cmd('tune', String(ch.id)); else tuneAnywhere(ch);
  } else if (e.type === 'number') {
    const ch = catalog.live?.items.find((x) => +x.num === +e.num);
    if (ch) tuneAnywhere(ch); else cmd('show-text', `There is no channel ${e.num}`);
  } else if (e.type === 'fav') {
    const ch = chOf(e.id);
    if (!ch) return;
    const on = !isFav(ch);
    toggleFav(ch, on);
    cmd('meta', { [String(ch.id)]: metaFor(ch, guideNow(ch) || []) });
    cmd('show-text', on ? `${ch.name} added to favourites` : `${ch.name} removed from favourites`);
  } else if (e.type === 'reveal') {
    reveal(e.gameId);
    sent.game = '';
    push();
  } else if (e.type === 'subs-state') {
    window.__subs = { state: e.state, strip: e.strip, text: e.text, shown: e.shown, last: e.last, mine: e.mine, at: Date.now() };   // (the emulator test reads it)
  } else if (e.type === 'failed' && c.kind === 'vod') {
    // a copy that fails: "Try the next copy" passes over it (SPEC 7.6); the player asks for the copies again
    const it = c.items[c.index];
    if (it) failedCopies.add(it.id);
    versionsNow().then((x) => { if (x && ctx.cur === c) cmd('versions', x); });
  } else if (e.type === 'diag') {
    // the player's diagnosis (a card, chip, failure card or the Connection panel): no score or clock is in it
    window.__diag = { cause: e.cause, surface: e.surface, at: Date.now() };   // (the emulator test reads it)
  } else if (e.type === 'refresh') {   // Refresh channels, from a channel that's off at the provider
    forget().then(() => { resetGuides(); return ensure('live'); }).then(() => cmd('show-text', 'Channels are up to date')).catch((er) => cmd('show-text', er?.message || 'Couldn’t refresh the channels'));
  } else if (e.type === 'goto-account') {   // the account has ended: Account, once the player has closed
    c.gotoAfter = 'account';
  } else if (e.type === 'lag') {
    setLag(+e.sec || 0);
    sent.game = '';
    push();
  } else if (e.type === 'sync') {
    // what you matched is kept whole, and the stall lag counted so far starts again from 0 (a stall can drop picture,
    // so "measured minus lag" could come out short and let scores run ahead after the next reconnect)
    const sec = Math.max(0, Math.min(600, Math.round((e.seenAt - e.at) / 1000) - 1));
    if (watch.chId) setDelay(watch.chId, sec);
    setLag(0); cmd('lag-reset', '');
    cmd('show-text', `Synced · ${sec} s behind live`);
    sent.game = '';
    push();
  } else if (e.type === 'version' && c.kind === 'vod') {
    // another copy of the film, from where you are (the choice is remembered for the title, as on its page); Always the
    // best copy takes the pin away (RANKING.md 2.1)
    const [, id] = String(e.id).split(':');
    const was = c.items[e.index];
    const t = catalog.movie?.titleById?.get(id) || (was && catalog.movie?.titleById?.get(was.id));
    const v = t?.versions.find((x) => String(x.id) === id);
    if (!v) { cmd('show-text', 'That copy is no longer in your list'); return; }
    if (e.always) { const m = store.get(scoped('ver'), {}); delete m[t.key]; store.set(scoped('ver'), m); } else if (!e.next) pickVersion(t, v);   // ("Try the next copy" isn't a pick)
    if (e.stay) { versionsNow().then((x) => { if (x && ctx.cur === c) cmd('versions', x); }); return; }
    if (was && e.d) recordProgress(was, e.t, e.d, true);
    if (e.d) recordProgress(v, e.t, e.d, true);
    playVod(v);
  } else if (e.type === 'file' && c.kind === 'vod') {   // the file's size and ETag at play start: a changed file is checked again
    const v = c.items[e.index];
    if (v && e.id === `${v.kind}:${v.id}`) noteStart(v, { size: +e.size || 0, etag: e.etag || '' });   // (not a copy handed over to)
  } else if ((e.type === 'skip' || e.type === 'offer') && c.kind === 'vod') {
    skipEvent(e, c);
  } else if (e.type === 'watched' && c.kind === 'vod') {   // Up next moved on (OK, its count, the end card): the episode it leaves (5.1)
    const it = c.items[e.index];
    if (it) markWatched(it);
  } else if (e.type === 'skip-state') {
    window.__skip = { state: e.state, at: Date.now() };   // (the emulator test reads it)
  } else if (e.type === 'progress' && c.kind === 'vod') {
    recordProgress(c.items[e.index], e.t, e.d, !!e.final);
  } else if (e.type === 'setting') {
    if (e.key === 'scoreBug') saveSettings({ scoreBug: !!e.value });
    if (e.key === 'skipIntro' && ['button', 'auto', 'off'].includes(e.value)) saveSettings({ skipIntro: e.value });   // (the player's Options > Skip intros)
    if (e.key === 'skipShow' && c.kind === 'vod') skipEvent(e, c);   // (Options > Intros in this show, the offer's yes)
    if (e.key === 'sub') { const n = subName(String(e.value)); if (n) saveSettings({ subLang: n }); }   // picked in the player: the same choice everywhere (a language the app doesn't list stays the player's own)
    // subtitles: his Early or late steps (each saved as he makes it) and his pick, per title (PORT-NATIVE.md 2.4)
    if (e.key === 'subtime' && e.title) { const it = playingVod(); const sr = it && seriesOf(it); subMemory()?.setOffset(e.title, e.copy || '', e.sub, +e.value || 0, { series: sr ? keyOf(sr) : undefined, release: e.release }); }
    if (e.key === 'subpick' && e.title && e.value) subMemory()?.setPick(e.title, e.value);
  } else if (e.type === 'tipoff' && watch.gameId) {
    // From tip-off in the live player (Options, the game panel's foot button): replay.js starts the game's replay
    emit('tipoff-request', watch.gameId);
  } else if (e.type === 'exit') {
    if (e.then === 'tipoff' && watch.gameId) setTimeout(() => emit('tipoff-request', watch.gameId), 0);
    ctx.cur = null;
    sfx.zone('ui');
    if (c.kind === 'vod') { recordProgress(c.items[e.index], e.t, e.d, true); if (e.error) toast(`This video would not play. ${e.error}`, 6000); }
    else if (e.error && c.kind === 'live') toast(`That channel would not play. ${e.error}`, 6000);   // (a replay's own failure: replay.js)
    // The game you were watching stays at its synced delay on every screen until you tune something else,
    // so leaving the player never shows a score your stream hadn't reached.
    if (starting && !starting.busy && Date.now() - starting.at > 1500) starting = null;   // (a play he chose again after watching)
    emit('player-closed', c);
    if (c.gotoAfter) setTimeout(() => go(c.gotoAfter), 300);
  }
});

// ---------- catch-up: the replay session (app/tv/js/replay.js drives it; design/ui-v1/catchup/PORT-NATIVE.md) ----------
// A replay is a session of its own kind ('replay'): replay.js listens to its events. replayNative(): the native player
// speaks the replay protocol (it says so in info()); until it does, replay.js plays the first link as a stand-in VOD.
export const replayNative = () => !!native?.info?.()?.replay;
export const playerCommand = (what, arg) => cmd(what, arg);
export async function startReplaySession(opts, cur) {
  if (!native) return null;
  setWatching(null, null);   // one stream: the replay replaces whatever was playing live
  const r = await native.player.play({ ...opts, ua: settings().ua, ...playerSettings() }).catch((e) => ({ ok: false, error: e?.message }));
  if (!r?.ok) { toast(r?.error || 'This replay would not start.', 4000); return null; }
  sfx.zone('player');
  ctx.cur = { ...cur, session: r.session };
  return r.session;
}
