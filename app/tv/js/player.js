// Playback: every channel, movie and episode plays in the TV's native player (Media3). This module sends it the
// channel ring (the group you tuned from), keeps the game link and the score delay in step while you watch, and records
// where you got to in movies and episodes.
import { S, settings, emit, recordProgress, progressOf, inProgress, addRecent } from './state.js';
import { busy, catalog } from './catalog.js';
import { native } from './native.js';
import { gameOn, gameById, setWatching, show, watch, delayFor, setDelay, recentClocks, summaryOf, clockText, nba, findFeeds } from './games.js';
import { guideFor, guideNow, onNow } from './guide.js';
import { toast } from './ui.js';

export const ctx = { cur: null };   // { kind: 'live' | 'vod', items, index, session, ring }
let sentKey = '';
busy.watching = () => !!ctx.cur;
export const watching = () => !!ctx.cur;

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
  const url = (c) => (c.sources.find((s) => s.engine === 'mpegts') || c.sources[0]).url;
  const key = `${S.epoch}:${list.length}:${list[0].id}:${list[list.length - 1].id}:${ringName}`;
  const opts = { mode: 'live', index, ua: settings().ua, key, ring: ringName, upNext: settings().zapUp !== 'prev' };
  let r = key === sentKey ? await native.player.play(opts).catch(() => null) : null;
  if (!r) r = await native.player.play({ ...opts, entries: list.map((c) => ({ url: url(c), title: c.name, num: c.num, logo: c.logo || '' })) }).catch((e) => ({ ok: false, error: e?.message || 'The player could not start.' }));
  if (!r?.ok) { toast(r?.error || 'The player could not start.', 4000); return; }
  sentKey = key;
  ctx.cur = { kind: 'live', items: list, index, session: r.session, ring: ringName };
  linkChannel(ch);
}

// Which game is on the channel you're watching; while you watch it, every score on screen runs at that channel's delay.
async function linkChannel(ch) {
  let g = gameOn(ch, guideNow(ch));
  if (!g) {
    const list = await guideFor(ch);
    if (ctx.cur && ctx.cur.items[ctx.cur.index]?.id !== ch.id) return;   // zapped on meanwhile
    g = gameOn(ch, list);
  }
  setWatching(g?.id || null, g ? ch.id : null);
  native?.player.command(['linked', !!g]);
  if (g) findFeeds(g);
}

// ---------- movies and episodes ----------
export async function playVod(item, { queue, restart } = {}) {
  const list = queue ? queue.slice(Math.max(0, queue.findIndex((e) => e.id === item.id))) : [item];
  const entries = list.map((it, i) => {
    const p = progressOf(it);
    const resume = i === 0 && restart ? 0 : inProgress(p) ? p.t : 0;
    const title = it.kind === 'episode' ? `${it.seriesName} · S${it.season} E${it.ep} · ${it.name}` : it._title || it.name;
    return { url: it.url, title, startAt: resume };
  });
  if (!native) { toast(`Playing ${entries[0].title} (the TV player is only on the TV)`); return; }
  const r = await native.player.play({ mode: 'vod', entries, index: 0, ua: settings().ua }).catch((e) => ({ ok: false, error: e?.message }));
  if (!r?.ok) { toast(r?.error || 'This video would not play.', 4000); return; }
  ctx.cur = { kind: 'vod', items: list, index: 0, session: r.session };
}

// ---------- the game panel and syncing the score, inside the player ----------
let panelId = null, panelJson = '';
function panelData(g) {
  const v = show(g);
  const dg = v.g, s = v.s;
  const team = (side) => {
    const t = dg[side];
    const b = s?.box.find((x) => x.abbr === t.abbr);
    const cols = (v.hidden ? ['MIN', 'REB', 'AST'] : ['MIN', 'PTS', 'REB', 'AST']).map((l) => (b ? b.labels.indexOf(l) : -1));
    const rows = b ? b.players.filter((p) => !p.dnp).map((p) => [p.short || p.name, ...cols.map((i) => (i >= 0 ? String(p.stats[i] ?? '') : ''))]) : [];
    return { abbr: t.abbr, color: '#888', rows };
  };
  return {
    score: v.hidden ? `${dg.away.abbr} – ${dg.home.abbr}   ${clockText(dg)} · Score hidden` : `${dg.away.abbr} ${dg.away.score ?? ''} – ${dg.home.score ?? ''} ${dg.home.abbr}   ${clockText(dg)}`,
    note: v.synced != null ? `Synced · ${v.synced} s behind live` : '',
    away: team('away'), home: team('home'), first: 0, loading: !s,
  };
}
function pushPanel() {
  const g = panelId && gameById(panelId);
  if (!g || !ctx.cur) return;
  const json = JSON.stringify(panelData(g));
  if (json === panelJson) return;
  panelJson = json;
  native.player.command(['stats', json]);
}
setInterval(() => { if (panelId) pushPanel(); }, 1000);

native?.player.onEvent((e) => {
  const c = ctx.cur;
  if (!c || e.session !== c.session) return;
  if (e.type === 'game' && c.kind === 'live') {
    const g = watch.gameId && gameById(watch.gameId);
    if (!g) { native.player.command(['show-text', 'No NBA game found on this channel', 4000]); return; }
    panelId = g.id; panelJson = '';
    pushPanel();
  } else if (e.type === 'stats-closed') { panelId = null; }
  else if (e.type === 'sync-start') {
    const g = watch.gameId && gameById(watch.gameId);
    if (!g) { native.player.command(['show-text', 'No NBA game found on this channel', 4000]); return; }
    const clocks = recentClocks(g.id, e.seenAt);
    if (!clocks.length) { native.player.command(['show-text', 'No game clocks yet to match', 4000]); return; }
    native.player.command(['sync-plays', JSON.stringify({ seenAt: e.seenAt, plays: clocks.map((x) => ({ at: x.at, label: x.label })) })]);
  } else if (e.type === 'sync') {
    const sec = Math.max(0, Math.min(600, Math.round((e.seenAt - e.at) / 1000) - 1));
    if (watch.chId) setDelay(watch.chId, sec);
    native.player.command(['show-text', `Synced · ${sec} s behind live`, 4000]);
    panelJson = ''; pushPanel();
  } else if (e.type === 'track') {
    c.index = e.index;
    const it = c.items[e.index];
    if (c.kind === 'live' && it) { addRecent(it); emit('tuned', it); linkChannel(it); if (panelId) { panelId = null; native.player.command(['stats', '']); } }
  } else if (e.type === 'progress' && c.kind === 'vod') {
    recordProgress(c.items[e.index], e.t, e.d, !!e.final);
  } else if (e.type === 'exit') {
    ctx.cur = null; panelId = null;
    if (c.kind === 'vod') { recordProgress(c.items[e.index], e.t, e.d, true); if (e.error) toast(`This video would not play. ${e.error}`, 6000); }
    else if (e.error) toast(`That channel would not play. ${e.error}`, 6000);
    // The game you were watching stays at its synced delay on every screen until you tune something else,
    // so leaving the player never shows a score your stream hadn't reached.
    emit('player-closed', c);
  }
});
