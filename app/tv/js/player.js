// Playback: every channel, movie and episode plays in the TV's native player (Media3, android/.../PlayerActivity.java).
// This module sends it the channel ring (the group you tuned from), tells it what the player can't know (what's on,
// the game on this channel at the synced delay, live games, groups, favourites) and acts on what you pick in its panels.
// It also records where you got to in movies and episodes.
import { S, settings, emit, recordProgress, progressOf, inProgress, addRecent, isFav, toggleFav, favList, saveSettings } from './state.js';
import { busy, catalog } from './catalog.js';
import { native } from './native.js';
import { gameOn, gameById, setWatching, show, watch, delayFor, setDelay, recentClocks, clockText, findFeeds, feedsNow, liveGames, myGame, isMine, mySide, hidden, reveal, shieldMode, ordinal } from './games.js';
import { guideFor, guideNow, onNow, nextUp } from './guide.js';
import { teamPalette, hm } from './util.js';
import { toast } from './ui.js';
import { sfx } from './sfx.js';

export const ctx = { cur: null };   // { kind: 'live' | 'vod', items, index, session, ring }
let sentKey = '';
busy.watching = () => !!ctx.cur;
export const watching = () => !!ctx.cur;
const cmd = (what, arg) => native?.player.command([what, typeof arg === 'string' ? arg : JSON.stringify(arg)]);
const urlOf = (c) => (c.sources.find((s) => s.engine === 'mpegts') || c.sources[0]).url;
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
  const list = ring?.length ? ring : catalog.live?.items || [ch];
  let index = list.findIndex((c) => c.id === ch.id);
  if (index < 0) { list.unshift(ch); index = 0; }
  addRecent(ch);
  emit('tuned', ch);
  if (!native) { toast(`Playing ${ch.name} (the TV player is only on the TV)`); linkChannel(ch); return; }
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
  if (now) Object.assign(m, { now: now.title, start: now.start, end: now.end, desc: now.desc || '' });
  if (next) Object.assign(m, { next: next.title, nextStart: next.start });
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
    synced: v.synced, delay: watch.chId ? delayFor(watch.chId) : 60,
    box: { away: team('away'), home: team('home') },
    plays: hid ? [] : (s?.plays || []).slice(0, 40).map((p) => ({ clock: `${ordinal(p.period)} ${p.clock}`, team: p.team || '', text: p.text || '', scoring: !!p.scoring, score: p.scoring ? `${p.away}–${p.home}` : '' })),
    feeds: feeds.map((f, i) => ({ id: String(f.ch.id), name: f.ch.name, num: f.ch.num || 0, logo: f.ch.logo || '', label: `Feed ${i + 1} of ${feeds.length}${f.why === 'Your pick' ? ' · Your pick' : ''}` })),
    shieldLabel: shieldMode() === 'all' ? 'All games' : 'My team', loading: !s,
  };
}
function liveGamesData() {
  const list = liveGames().slice().sort((a, b) => isMine(b) - isMine(a));
  for (const g of list) if (!feedsNow(g).length) findFeeds(g);
  return list.map((g, i) => {
    const f = feedsNow(g)[0];
    const score = hidden(g) ? '' : ` · ${g.away.score ?? 0}–${g.home.score ?? 0}`;
    return {
      id: g.id, title: `${g.away.name} at ${g.home.name}`, live: true, chId: f ? String(f.ch.id) : '',
      sub: `${clockText(g)}${score}${f ? ` · ${f.ch.name}` : ' · No channel found'}`,
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
const playerSettings = () => ({ sounds: sfx.level(), scoreBug: !!settings().scoreBug });

// ---------- movies and episodes ----------
function vodEntry(it, restart) {
  const p = progressOf(it);
  const ep = it.kind === 'episode';
  return { id: `${it.kind}:${it.id}`, url: it.url, title: ep ? it.seriesName : it._title || it.name, sub: ep ? `S${it.season} · E${it.ep} · ${it.name}` : '', startAt: restart ? 0 : inProgress(p) ? p.t : 0 };
}
// More episodes after the one playing (Up next), when the series' list arrives after playback started.
export function queueAfter(item, more) {
  const c = ctx.cur;
  if (!c || c.kind !== 'vod' || !more.length || c.items[c.items.length - 1]?.id !== item.id) return;
  c.items.push(...more);
  cmd('queue', { entries: more.map((it) => ({ ...vodEntry(it, false), startAt: 0 })) });
}
export async function playVod(item, { queue, restart } = {}) {
  const list = queue ? queue.slice(Math.max(0, queue.findIndex((e) => e.id === item.id))) : [item];
  const entries = list.map((it, i) => vodEntry(it, i === 0 && restart));
  if (!native) { toast(`Playing ${entries[0].title} (the TV player is only on the TV)`); return; }
  const r = await native.player.play({ mode: 'vod', entries, index: 0, ua: settings().ua, ...playerSettings() }).catch((e) => ({ ok: false, error: e?.message }));
  if (!r?.ok) { toast(r?.error || 'This video would not play.', 4000); return; }
  sfx.zone('player');
  ctx.cur = { kind: 'vod', items: list, index: 0, session: r.session };
}

// ---------- what the player asks for and what you pick in it ----------
native?.player.onEvent((e) => {
  const c = ctx.cur;
  if (!c || e.session !== c.session) return;
  if (e.type === 'track') {
    if (c.kind === 'vod') { c.index = e.index; return; }
    const i = c.items.findIndex((x) => String(x.id) === String(e.id));
    const it = i >= 0 ? c.items[i] : chOf(e.id);
    if (i >= 0) c.index = i;
    if (it) { addRecent(it); emit('tuned', it); linkChannel(it); sendMeta([it.id]); }
  } else if (e.type === 'need-meta') {
    sendMeta(e.ids || []);
  } else if (e.type === 'need') {
    if (e.what === 'groups') cmd('groups', ringGroups());
    else if (e.what === 'games') { sent.games = ''; push(); }
    else if (e.what === 'clocks') {
      const g = watch.gameId && gameById(watch.gameId);
      if (!g) { cmd('show-text', 'No NBA game found on this channel'); return; }
      const clocks = recentClocks(g.id, e.seenAt);
      if (!clocks.length) { cmd('show-text', 'No game clocks yet to match'); return; }
      // the list opens on the clock the stored delay points at
      const target = e.seenAt - delayFor(watch.chId) * 1000;
      let current = 0;
      clocks.forEach((x, k) => { if (Math.abs(x.at - target) < Math.abs(clocks[current].at - target)) current = k; });
      const ch = chOf(watch.chId);
      cmd('clocks', { seenAt: e.seenAt, list: clocks, current, note: `Stored for ${ch?.name || 'this channel'}. Scores everywhere follow it.` });
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
  } else if (e.type === 'sync') {
    const sec = Math.max(0, Math.min(600, Math.round((e.seenAt - e.at) / 1000) - 1));
    if (watch.chId) setDelay(watch.chId, sec);
    cmd('show-text', `Synced · ${sec} s behind live`);
    sent.game = '';
    push();
  } else if (e.type === 'progress' && c.kind === 'vod') {
    recordProgress(c.items[e.index], e.t, e.d, !!e.final);
  } else if (e.type === 'setting') {
    if (e.key === 'scoreBug') saveSettings({ scoreBug: !!e.value });
  } else if (e.type === 'exit') {
    ctx.cur = null;
    sfx.zone('ui');
    if (c.kind === 'vod') { recordProgress(c.items[e.index], e.t, e.d, true); if (e.error) toast(`This video would not play. ${e.error}`, 6000); }
    else if (e.error) toast(`That channel would not play. ${e.error}`, 6000);
    // The game you were watching stays at its synced delay on every screen until you tune something else,
    // so leaving the player never shows a score your stream hadn't reached.
    emit('player-closed', c);
  }
});
