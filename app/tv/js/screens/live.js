// Live guide: the Now panel, a ruler with the group chip and "Now", and six channel rows whose programmes sit by time
// (656 px = 2.5 h from now). ◀▶ move along time, ▲▼ between channels, OK tunes the programme on now (or shows a later
// one), hold OK favourites with an undo toast, CH± pages, digits jump. The group you pick is the player's zap ring.
import { $, esc, ic, dot, liveP, logo, hm, setHtml } from '../util.js';
import { S, on, store, scoped, favList, toggleFav, isFav } from '../state.js';
import { catalog, ensure, takeFresh } from '../catalog.js';
import { guideFor, guideNow, guideFailed, onNow, warm, known, pastFor, pastNow, pastFailed, pastKnown } from '../guide.js';
import { myGame, gameOn, hidden, feedsNow, findFeeds, liveGames, isMine, show, knownGames } from '../games.js';
import { programmeView, reairOf, keptWords, NOT_KEPT, nightLabel } from '../catchup.js';
import { playProgramme, programmeProgress, watchOnChannel } from '../replay.js';
const knownGamesNear = (p) => knownGames().filter((g) => Math.abs(g.date - p.start) < 3 * 3600e3);
import { playLive, watching } from '../player.js';
import { current, mayFocus } from '../router.js';
import { focus } from '../focus.js';
import { openOverlay, toast, scrollList } from '../ui.js';

const ROWS = 6, PITCH = 52, AXIS = 656, SPAN = 150 * 60e3, PX = AXIS / SPAN;
let el, group = 'fav', chans = [], top = 0, r = 0, at = Date.now(), winStart = 0, nowFloor = 0, toastT = 0, toastCh = '', digitBuf = '', digitT = 0;
let inPast = false;   // the window was moved back before now (catch-up 4.1): it stays there until Back, or ▶ brings it back
// The window starts at the half hour that holds now, so the programme on now shows whole (not cut to its last minutes).
const floor30 = (t) => { const d = new Date(t); d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0); return d.getTime(); };

// Counted once per channel list, favourites and live games (it's read on every draw).
let groupsMemo = { key: '', list: [] };
function groups() {
  const c = catalog.live;
  if (!c) return [];
  const memoKey = `${c._at}:${c.items.length}:${favList('live').length}:${liveGames().length}`;
  if (groupsMemo.c === c && groupsMemo.key === memoKey) return groupsMemo.list;
  groupsMemo = { c, key: memoKey, list: countGroups(c) };
  return groupsMemo.list;
}
// (separator entries, "##### SPORTS #####", are no channel: never a row, never counted)
const realOf = (c) => { if (c._real?.src !== c.items) c._real = { src: c.items, list: c.items.filter((x) => !x._sep) }; return c._real.list; };
function countGroups(c) {
  const counts = new Map(), items = realOf(c);
  for (const it of items) counts.set(it.cat, (counts.get(it.cat) || 0) + 1);
  const fav = favList('live').length;
  const out = [];
  if (fav) out.push(['fav', 'Favourites, then all', `${fav} saved`, 'star']);
  const lg = liveGames().length;
  if (lg) out.push(['games', 'Live games', lg, 'live']);
  out.push(['all', 'All channels', items.length, 'tv']);
  for (const k of c.cats) if (counts.get(k.id)) out.push([k.id, k.name, counts.get(k.id), 'tv']);
  return out;
}
export const groupName = (g = group) => groups().find((x) => x[0] === g)?.[1] || 'All channels';
// The channels of a group. Favourites first = your favourites in your order, then everything else.
function listFor(g) {
  const c = catalog.live;
  if (!c) return [];
  const items = realOf(c);
  if (g === 'fav') { const f = favList('live').map((x) => c.byId.get(x.id)).filter((x) => x && !x._sep); const set = new Set(f); return [...f, ...items.filter((x) => !set.has(x))]; }
  if (g === 'games') { const out = []; for (const gm of liveGames()) for (const f of feedsNow(gm)) if (!out.includes(f.ch)) out.push(f.ch); return out.length ? out : items; }
  if (g === 'all') return items;
  return items.filter((x) => x.cat === g);
}
// Your team's game is pinned first while it's on.
function pinned() {
  const g = myGame();
  if (!g || g.state !== 'in') return null;
  return feedsNow(g)[0]?.ch || null;
}
function rebuild() {
  const base = listFor(group);
  const pin = pinned();
  chans = pin ? [pin, ...base.filter((x) => x.id !== pin.id)] : base;
  chans._pin = pin;
  r = Math.min(r, Math.max(0, chans.length - 1));
}
// A new list (the catalog, the pinned game coming or going): focus stays on the same channel, not the same row number.
function rebuildKeep() {
  const keep = chans[r]?.id;
  rebuild();
  const i = keep ? chans.findIndex((c) => c.id === keep) : -1;
  if (i >= 0) r = i;
}

const x = (t) => Math.round((t - winStart) * PX);
const DAY = 864e5;
const shortName = (ch) => ch.name.replace(/^[A-Z]{2,4}\s*[:|]\s*/, '').replace(/\s+(HD|FHD|UHD|4K|SD)\b.*$/i, '').trim() || ch.name;
const keptFrom = (ch) => Date.now() - ch.archive * DAY;
// The programmes of a row: the full table before the short guide's first one (kept channels, catch-up 4.6), then the
// short guide. past: 'loading' | 'failed' | null.
function rowList(ch) {
  const list = guideNow(ch);
  if (!ch.archive || !inPast || winStart >= Date.now()) return { list };
  const t = pastNow(ch);
  if (!t) return { list, past: pastFailed(ch) ? 'failed' : 'loading' };
  const cut = list?.[0]?.start ?? Date.now();
  return { list: [...t.filter((p) => p.end <= cut), ...(list || []).filter((p) => p.end > cut)].sort((a, b) => a.start - b.start), table: t };
}
// The past part of a row that isn't kept, or that's loading: one cell from the window's start to now (so ▲▼ keep the time).
function pastCell(ch, ri, kind, until) {
  const w = x(Math.min(until, winStart + SPAN)) - 4;
  if (w < 52) return '';
  const t = { gone: [NOT_KEPT, `OK watches ${esc(shortName(ch))} live`], none: ['No guide this far back', 'OK watches it live'], loading: ['Loading earlier programmes…', ''], failed: ['Earlier programmes didn’t load · OK still tunes', ''] }[kind];
  return `<div class="g-cell fx ${kind === 'gone' || kind === 'none' ? 'cu-gone' : 'cu-load'}" tabindex="-1" data-hold data-r="${ri}" data-s="${winStart}" data-e="${until}" data-gone="${kind}" style="left:0;width:${w}px"><b>${t[0]}</b>${t[1] ? `<div class="sb">${t[1]}</div>` : ''}</div>`;
}
function cells(ch, ri) {
  const rl = rowList(ch), list = rl.list;
  const end = winStart + SPAN;
  if (!list) return `<div class="g-cell fx" tabindex="-1" data-hold data-r="${ri}" data-s="${winStart}" data-e="${end}" style="left:0;width:${AXIS - 4}px"><b style="color:var(--a-text-3);font-weight:500">Loading guide…</b></div>`;
  const now0 = Date.now();
  // a window that starts before now: the row's past (not kept: one outlined cell; kept: the table's programmes)
  let lead = '', from = winStart;
  if (inPast && winStart < now0) {
    const first = list.find((p) => p.end > winStart);
    const nowStart = Math.min(now0, list.find((p) => p.start <= now0 && p.end > now0)?.start ?? now0);
    if (!ch.archive) { if (nowStart > winStart) { lead = pastCell(ch, ri, 'gone', nowStart); from = nowStart; } }
    else if (rl.past) { if (nowStart > winStart) { lead = pastCell(ch, ri, rl.past, nowStart); from = nowStart; } }
    else if (!first || first.start > winStart + 60e3) { const until = Math.min(first ? first.start : nowStart, nowStart); if (until > winStart) { lead = pastCell(ch, ri, 'none', until); from = until; } }
  }
  const vis = list.filter((p) => p.end > from && p.start < end);
  if (lead && !vis.length) return lead;
  // Say why there's nothing: offline, or the provider didn't answer this time (tried again soon), or it has no guide.
  const why = S.offline ? 'Offline · OK still tunes' : guideFailed(ch) ? "Guide didn't load · OK still tunes" : 'No guide information';
  if (!vis.length) return `<div class="g-cell empty fx" tabindex="-1" data-hold data-r="${ri}" data-s="${winStart}" data-e="${end}" style="left:0;width:${AXIS - 4}px"><b>${why}</b></div>`;
  const now = Date.now();
  let clipTo = 0;   // a matched re-air of a hidden game is drawn 2 h 30 long; the programme starting inside that is clipped (S12, S3)
  return lead + vis.map((p) => {
    const v = programmeView(ch, p);
    const reair = v.game && p.start > now && p.start > v.game.date + 2 * 3600e3;
    let ps = p.start, pe = reair ? p.start + 2.5 * 3600e3 : p.end, dotStart = false;
    if (clipTo && ps < clipTo) { ps = clipTo; dotStart = true; if (pe <= ps) return ''; }
    if (reair) clipTo = pe;
    const s = Math.max(ps, from), e = Math.min(pe, end);
    if (e <= s) return '';
    const left = x(s), w = x(e) - left - 4;
    const isNow = p.start <= now && p.end > now;
    const past = !isNow && p.end <= now && !!ch.archive;
    const keptP = past && p.start >= keptFrom(ch) && p.kept !== false;   // in the archive: plays from its start
    const g = isNow ? gameOn(ch, [p]) : null;
    const live = !!(g && g.state === 'in');
    const glyph = keptP ? ic('hist') : '';
    const sub = live ? liveP(true) : dotStart ? '·' : reair ? hm(p.start) : `${p.start < winStart ? '◂ ' : ''}${glyph}${hm(p.start)}${e - s >= 36 * 60e3 ? dot + hm(p.end) : ''}`;
    const pg = isNow ? `<div class="prog"><i style="width:${Math.min(100, ((now - p.start) / (p.end - p.start)) * 100)}%"></i></div>` : '';
    const wp = keptP && programmeProgress(ch, p);
    const bar = wp && !wp.done ? `<div class="cu-wp"><i style="width:${Math.min(100, (wp.t / wp.d) * 100)}%"></i></div>` : '';
    const cls = `${isNow ? ' now' : ''}${keptP ? ' cu-rp' : past ? ' cu-gone' : ''}`;
    const data = `data-r="${ri}" data-s="${p.start}" data-e="${p.end}"${keptP ? ' data-past="1"' : past ? ' data-gone="old"' : ''}`;
    if (w < 52) return `<div class="g-cell sliver fx${cls}" tabindex="-1" data-hold ${data} style="left:${left}px;width:${Math.max(4, w)}px"></div>`;
    return `<div class="g-cell fx${cls}" tabindex="-1" data-hold ${data} style="left:${left}px;width:${w}px"><b>${esc(v.title)}</b><div class="sb">${sub}</div>${pg}${bar}</div>`;
  }).join('');
}
function row(ch, ri) {
  const pin = ri === top && chans._pin && ch.id === chans._pin.id;
  const mark = pin ? `<span class="fv">${ic('pin')}</span>` : isFav(ch) ? `<span class="fv">${ic('star')}</span>` : '';
  return `<div class="g-row" data-row data-ri="${ri}"><div class="g-ch fx${ri === r ? ' sel' : ''}" tabindex="-1" data-hold data-ch data-r="${ri}">${ch.archive ? `<span class="num cu-n">${ch.num}<span class="cu-arc">${ic('hist')}</span></span>` : `<span class="num">${ch.num}</span>`}${logo(ch.logo, ch.name, 'sm')}<div class="nm">${esc(ch.name)}</div>${mark}</div><div class="g-cells">${cells(ch, ri)}</div></div>`;
}
function ruler() {
  const ticks = [];
  const n = Date.now(), nx = n >= winStart && n < winStart + SPAN ? x(n) : -999;
  // in the past: the day pill names the day at the left edge (ticks under it dropped), and when now is off to the right
  // the Now pill sits at the right end (ticks within 150 px of it dropped); a tick on another day than the pill names it
  const pastDay = winStart < floor30(n), nowRight = n >= winStart + SPAN;
  const dayOf = (t) => new Date(t).toDateString();
  const day = pastDay ? `<span class="cu-day">${esc(new Date(winStart).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }))}</span>` : '';
  let named = false;
  for (let t = Math.ceil((winStart + 1) / 1800e3) * 1800e3; t < winStart + SPAN; t += 1800e3) {
    if (x(t) <= (pastDay ? 112 : 40) || x(t) >= AXIS - (nowRight ? 150 : 40) || Math.abs(x(t) - nx) <= 64) continue;
    const other = !named && dayOf(t) !== dayOf(pastDay ? winStart : n);   // (ahead: the first tick on tomorrow says so)
    if (other) named = true;
    ticks.push(`<span style="left:${x(t)}px">${other ? `${new Date(t).toLocaleDateString('en-GB', { weekday: 'short' })} ` : ''}${hm(t)}</span>`);
  }
  const flag = n >= winStart && n < winStart + SPAN ? `<span class="g-nowflag" style="left:${x(n)}px">Now</span>` : nowRight ? `<span class="cu-nowr">Now ${hm(n)}${ic('chevR')}</span>` : '';
  return `<div class="g-ruler"><div class="g-corner" data-row><span class="chip lg fx" tabindex="-1" data-act="group">${ic(group === 'fav' ? 'star' : 'tv')}<span class="ellipsis" style="max-width:104px">${esc(groupName())}</span><span class="t-3" style="font-weight:500">${chans.length}</span></span></div><div class="g-time">${day}${flag}${ticks.join('')}</div></div>`;
}
function pastPanel(ch, f) {
  const tile = (glyph) => `<div class="pvtile" style="display:grid;place-items:center">${logo(ch.logo, ch.name, 'lg')}${glyph ? `<span class="cu-cor">${ic('hist')}</span>` : ''}</div>`;
  const hint = (a) => `<div class="t-cap cu-hint">${a}<br>Back returns to now</div>`;
  const line = (a, b) => `<div class="row-flex" style="color:var(--a-text-2);font:500 15px/22px var(--a-font-text);white-space:nowrap"><span class="ellipsis" style="min-width:0">${esc(ch.name)}</span><span style="flex:none;display:flex;align-items:center">${a}</span></div>${b}`;
  const third = (t, dim) => `<div class="row-flex" style="gap:6px;font:500 15px/22px var(--a-font-text);color:${dim ? 'var(--a-text-3)' : 'var(--a-text-2)'}"><span class="ellipsis" style="min-width:0">${t}</span></div>`;
  const kind = f.dataset.gone;
  if (kind === 'gone' || (!f.dataset.past && kind)) {
    const what = kind === 'gone' ? 'no replays on this channel' : kind === 'none' ? 'no guide this far back' : kind === 'old' ? 'not in the replays any more' : kind === 'failed' ? 'earlier programmes didn’t load' : 'loading earlier programmes';
    return `${tile(false)}<div class="grow"><div class="row-flex" style="gap:12px"><span class="t-title ellipsis">Earlier on ${esc(shortName(ch))}</span></div>${line(`${dot}${what}`, third(kind === 'gone' ? 'Channels with replays show the history mark under their number.' : ''))}</div>${hint(`OK watch ${esc(shortName(ch))} live`)}`;
  }
  const p = (rowList(ch).list || []).find((q) => q.start === +f.dataset.s);
  if (!p) return `${tile(true)}<div class="grow"></div>`;
  const v = programmeView(ch, p);
  const g = v.game && window.NBA.matchScore(p.title, v.game) >= 10 && Math.abs(v.game.date - p.start) < 3 * 3600e3 ? v.game : null;
  const day = new Date(p.start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const wp = programmeProgress(ch, p), mins = wp && !wp.done ? Math.round(wp.t / 60) : 0;
  const badge = `<span class="cu-badge">${ic('hist')}Replay</span>`;
  if (g) {
    return `${tile(true)}<div class="grow"><div class="row-flex" style="gap:12px"><span class="t-title ellipsis">${esc(v.title)}</span>${badge}</div>${line(`${dot}${new Date(p.start).toLocaleDateString('en-GB', { weekday: 'short' })} ${hm(p.start)} to ${hm(p.end)}${dot}the ${esc(nightLabel(g.date))} game`, third(hidden(g) ? `${ic('eyeOff', 'sm')}Description hidden (spoiler shield)` : esc(p.desc || ''), hidden(g)))}</div>${hint('OK watch from tip-off')}`;
  }
  const desc = v.mask === 'results' ? `${ic('eyeOff', 'sm')}May show last night's results (spoiler shield)` : v.mask === 'desc' ? `${ic('eyeOff', 'sm')}Description hidden (spoiler shield)` : esc(v.desc || '');
  const watched = mins ? `${dot}watched ${mins} min<span class="prog" style="width:70px;margin-left:14px"><i style="width:${Math.min(100, (wp.t / wp.d) * 100)}%"></i></span>` : '';
  return `${tile(true)}<div class="grow"><div class="row-flex" style="gap:12px"><span class="t-title ellipsis">${esc(v.title)}</span>${badge}</div>${line(`${dot}${day}${dot}${hm(p.start)} to ${hm(p.end)}${watched}`, third(desc, !!v.mask))}</div>${hint(mins ? `OK resume at ${hm(p.start + wp.t * 1000)}` : `OK play from ${hm(p.start)}`)}`;
}
function nowPanel() {
  const ch = chans[r];
  if (!ch) return '<div class="grow"><div class="t-title">No channels</div></div>';
  const f = document.activeElement;
  if (f?.classList?.contains('g-cell') && (f.dataset.past || f.dataset.gone) && +f.dataset.e <= Date.now() + 60e3 && !(toastT > Date.now() && toastCh === ch.id)) return pastPanel(ch, f);
  const onCell = !!f?.classList?.contains('g-cell') && el.contains(f);
  const s = onCell ? +f.dataset.s : Date.now();
  const list = rowList(ch).list || [];
  // the focused cell's own programme (of overlapping ones, the one it draws)
  // (a programme's cell carries its start; an empty or loading cell matches none, so it describes nothing)
  const p = onCell ? list.find((q) => q.start === s) || null : onNow(list);
  const g = p && p.start <= Date.now() && p.end > Date.now() ? gameOn(ch, [p]) : null;
  const hide = g && hidden(g);
  const nowish = p && p.start <= Date.now() && p.end > Date.now();
  const left = p && nowish ? Math.max(1, Math.round((p.end - Date.now()) / 60000)) : 0;
  const pv = hide ? `<div class="pvtile off">${ic('eyeOff', 'sm')}<span>Preview off<br>for your game</span></div>` : `<div class="pvtile" style="display:grid;place-items:center">${logo(ch.logo, ch.name, 'lg')}</div>`;
  const pvw = p ? programmeView(ch, p) : null;
  const desc = hide || pvw?.mask === 'desc' ? `${ic('eyeOff', 'sm')}Description hidden (spoiler shield)` : pvw?.mask === 'results' ? `${ic('eyeOff', 'sm')}May show last night's results (spoiler shield)` : esc(pvw?.desc || '');
  const kept = ch.archive && nowish ? `<br>◀ earlier${dot}${keptWords(ch.archive)}` : '';
  const right = toastT > Date.now() && toastCh === ch.id ? `<span class="toast"><b>${isFav(ch) ? 'Added to Favourites' : 'Removed from Favourites'}</b><span class="t-cap">Hold OK to undo</span></span>` : `<div class="t-cap" style="text-align:right;line-height:20px;white-space:nowrap">OK tune${kept ? dot : '<br>'}Hold OK favourite${kept}</div>`;
  return `${pv}<div class="grow">
    <div class="row-flex" style="gap:12px"><span class="t-title ellipsis">${esc(pvw?.title || p?.title || ch.name)}</span>${g?.state === 'in' ? liveP() : ''}</div>
    <div class="row-flex" style="color:var(--a-text-2);font:500 15px/22px var(--a-font-text);white-space:nowrap"><span class="ellipsis" style="min-width:0">${p ? esc(ch.name) : `Channel ${ch.num}`}</span><span style="flex:none;display:flex;align-items:center">${p ? `${dot}${reairOf(ch, p) ? hm(p.start) : `${hm(p.start)} to ${hm(p.end)}`}` : ''}${left ? `${dot}${left >= 60 ? `${Math.floor(left / 60)}h ${left % 60}m` : left + ' min'} left<span class="prog" style="width:90px;margin-left:14px"><i style="width:${Math.min(100, ((Date.now() - p.start) / (p.end - p.start)) * 100)}%"></i></span>` : ''}</span></div>
    <div class="row-flex" style="gap:6px;font:500 15px/22px var(--a-font-text);color:${hide || pvw?.mask ? 'var(--a-text-3)' : 'var(--a-text-2)'}"><span class="ellipsis" style="min-width:0">${desc}</span></div>
  </div>${right}`;
}
let warmT = 0, frame = 0, pendingFocus = null;
// focusAt: where focus goes after the redraw (a move). Without it (new data, the clock) focus stays on the same row
// and time, never on whatever came first. Guide data is asked for once the remote has settled on a row.
let behind = false;
on('player-closed', () => { if (behind) { behind = false; draw(); } });
function draw(focusAt) {
  if (watching()) { behind = true; return; }   // nothing to see under the TV player; drawn once it closes
  if (!el || el.hidden) return;
  if (!catalog.live) return;
  nowFloor = floor30(Date.now());
  if (!winStart || (!inPast && winStart < nowFloor)) winStart = nowFloor;
  if (inPast && winStart >= nowFloor) inPast = false;
  if (r < top) top = r;
  if (r >= top + ROWS) top = r - ROWS + 1;
  const vis = chans.slice(top, top + ROWS);
  const grid = el.querySelector('.g-grid'), a = document.activeElement, inGrid = grid.contains(a) && a !== grid;
  const was = inGrid ? (a.dataset.act === 'group' ? 'chip' : a.hasAttribute('data-ch') ? 'ch' : 'cell') : null;
  const changed = setHtml(grid, `${ruler()}${vis.map((ch, i) => row(ch, top + i)).join('')}`, false);
  if (focusAt) focusAt();
  else if (changed && was === 'chip') focus(el.querySelector('[data-act="group"]'));
  else if (changed && was === 'ch') focus(el.querySelector(`.g-ch[data-r="${r}"]`));
  else if (changed && was === 'cell') focusCell(r, at);
  else setHtml(el.querySelector('.g-now'), nowPanel());   // (a focus move draws it)
  // Guide data once the remote settles: the rows on screen first, each drawn as it arrives, then the next six.
  clearTimeout(warmT);
  warmT = setTimeout(() => {
    for (const ch of chans.slice(top, top + ROWS)) if (!known(ch)) guideFor(ch, { urgent: true }).then(() => { if (current() === 'live') drawSoon(); });
    // in the past: the kept rows' full tables, on-screen rows first (catch-up 4.6)
    if (inPast) for (const ch of chans.slice(top, top + ROWS)) if (ch.archive && !pastKnown(ch)) pastFor(ch, { urgent: true }).then(() => { if (current() === 'live') drawSoon(); });
    warm(chans.slice(top + ROWS, top + ROWS + 6), { still: () => current() === 'live' });
  }, 120);
}
// While a key is held, one draw per frame however fast the repeats come.
function drawSoon(focusAt) {
  if (focusAt) pendingFocus = focusAt;   // (data arriving doesn't cancel a move waiting to be drawn)
  if (frame) return;
  frame = requestAnimationFrame(() => { frame = 0; const f = pendingFocus; pendingFocus = null; draw(f); });
}
function focusCell(ri, t) {
  const rowEl = el.querySelector(`.g-row[data-ri="${ri}"]`);
  if (!rowEl) return;
  const cs = [...rowEl.querySelectorAll('.g-cell')];
  const hit = cs.find((c) => +c.dataset.s <= t && +c.dataset.e > t) || cs.find((c) => +c.dataset.s >= t) || cs[cs.length - 1];
  if (hit) focus(hit);
}
// All navigation in the grid is the guide's own (rows are virtual, time can move past the window).
function hook(dir, cur, repeat) {
  const ri = +cur.dataset.r;
  const onCh = cur.hasAttribute('data-ch');
  if (dir === 'up' || dir === 'down') {
    const nr = (frame ? r : ri) + (dir === 'down' ? 1 : -1);   // a draw still pending: count from where we're going
    if (nr < 0) return repeat ? false : (focus(el.querySelector('[data-act="group"]')), true);
    if (nr >= chans.length) return false;
    r = nr;
    const to = () => (onCh ? focus(el.querySelector(`.g-ch[data-r="${r}"]`)) : focusCell(r, at));
    if (repeat) drawSoon(to); else draw(to);
    return true;
  }
  if (onCh) {
    if (dir === 'left') return false;
    const t = inPast ? Math.max(at, winStart) : Math.max(Date.now(), winStart);
    focusCell(ri, t); at = t; return true;
  }
  const cs = [...cur.parentElement.querySelectorAll('.g-cell')];
  const i = cs.indexOf(cur);
  if (dir === 'left') {
    if (i > 0) { at = Math.max(+cs[i - 1].dataset.s, winStart); focus(cs[i - 1]); return true; }
    if (winStart > nowFloor) { winStart = Math.max(nowFloor, winStart - 3600e3); at = Math.max(winStart, +cur.dataset.s - 1); draw(() => focusCell(ri, at)); return true; }
    // a kept row goes back in time, an hour of window at a time, to its archive's edge (or its table's first programme);
    // a held ◀ draws once a frame (a day back in about 2 s). A row that isn't kept goes to its channel (catch-up 4.1).
    const ch = chans[ri];
    if (ch?.archive && !cur.dataset.gone?.match(/^(gone|none)$/)) {
      const t = pastNow(ch), edge = Math.max(floor30(keptFrom(ch)), t?.length ? floor30(t[0].start) : 0);
      if (winStart > edge) {
        inPast = true;
        winStart = Math.max(edge, winStart - 3600e3);
        at = Math.max(winStart, Math.min(+cur.dataset.s, winStart + SPAN) - 1);
        const to = () => focusCell(ri, at);
        if (repeat) drawSoon(to); else draw(to);
        return true;
      }
    }
    focus(el.querySelector(`.g-ch[data-r="${ri}"]`)); return true;   // ◀ at the edge goes to the channel, never the bar
  }
  if (i < cs.length - 1) { at = Math.max(+cs[i + 1].dataset.s, winStart); focus(cs[i + 1]); return true; }
  if (winStart + SPAN < nowFloor + 22 * 3600e3) { winStart += 3600e3; at = Math.max(+cur.dataset.e, winStart); const to = () => focusCell(ri, at); if (repeat) drawSoon(to); else draw(to); return true; }
  return false;
}
// (the last page is a full page, not one channel and empty rows)
function page(d) { r = Math.max(0, Math.min(chans.length - 1, r + d * ROWS)); top = Math.max(0, Math.min(r, top + d * ROWS, chans.length - ROWS)); draw(() => focusCell(r, at)); }

function tune(ch) { playLive(ch, chans, groupName()); }
function cellOk(cell) {
  const ch = chans[+cell.dataset.r];
  if (!ch) return;
  const s = +cell.dataset.s, n = Date.now();
  // a kept programme from the past: from its start, or where you stopped; your game: from tip-off (catch-up 4.2)
  if (cell.dataset.past && !cell.hasAttribute('data-ch')) {
    if (S.offline) return toast('Offline · replays need the provider');
    const p = (rowList(ch).list || []).find((q) => q.start === s);
    if (!p) return tune(ch);
    const v = programmeView(ch, p), g = v.game || window.NBA.matchGame(p.title, knownGamesNear(p));
    if (g && window.NBA.matchScore(p.title, g) >= 10 && Math.abs(g.date - p.start) < 3 * 3600e3) return watchOnChannel(g, ch, p);
    return playProgramme(ch, p);
  }
  if (cell.hasAttribute('data-ch') || s <= n || cell.classList.contains('empty')) return tune(ch);
  // A later programme: its details, and the channel as it is now.
  const p = (guideNow(ch) || []).find((q) => q.start === s);
  const pv = p ? programmeView(ch, p) : null, re = p && reairOf(ch, p);   // (the shield: its title, its description; a re-air shows its start only)
  const pdesc = pv?.mask === 'desc' ? `${ic('eyeOff', 'sm')}Description hidden (spoiler shield)` : pv?.mask === 'results' ? `${ic('eyeOff', 'sm')}May show last night's results (spoiler shield)` : esc(pv?.desc || '');
  const ov = openOverlay(`<div class="menu" style="left:48px;top:120px;width:520px"><h3>${esc(pv?.title || 'Later')}</h3><div class="t-cap" style="padding:0 8px 8px">${esc(ch.name)}${p ? `${dot}${re ? hm(p.start) : `${hm(p.start)} to ${hm(p.end)}`}` : ''}</div>${pdesc ? `<p class="t-body clamp3" style="margin:0 8px 12px">${pdesc}</p>` : ''}<div data-row class="row-flex" style="gap:12px;padding:4px 8px"><span class="btn fx" tabindex="-1" data-act="tune" style="max-width:480px;transform-origin:0 50%">${ic('play')}<span class="ellipsis" style="min-width:0">Watch ${esc(ch.name)} now</span></span></div></div>`, {
    onClick: (act) => { ov.close(); if (act === 'tune') tune(ch); },   // (focus back on the cell, for when the player closes)
  });
}
function favHold(cell) {
  const ch = chans[+cell.dataset.r];
  if (!ch) return;
  toggleFav(ch);
  toastT = Date.now() + 4000; toastCh = ch.id;   // (the toast is that channel's: it doesn't follow you to the next row)
  setHtml(el.querySelector('.g-now'), nowPanel());
  setTimeout(() => { if (current() === 'live') setHtml(el.querySelector('.g-now'), nowPanel()); }, 4100);
}
function groupSheet() {
  const gs = groups();
  const ov = openOverlay(`<div class="sheet left" style="width:340px"><h3>Channel group</h3><div class="t-cap" style="margin-top:-6px">Up and Down in the player stay in this group</div>
    <div class="sheet-body"><div class="inner" data-col>${gs.map(([id, name, n]) => `<div class="lr fx" tabindex="-1" data-act="${esc(id)}"><span class="rd${id === group ? ' on' : ''}"></span><span class="grow ellipsis">${esc(name)}</span><small>${n.toLocaleString()}</small></div>`).join('')}</div></div></div>`, {
    focusSel: `[data-act="${CSS.escape(group)}"]`,
    onClick: (act) => { if (act === group) return ov.close(); ov.close(false); group = act; store.set(scoped('liveCat'), act); r = 0; top = 0; rebuild(); draw(() => focusCell(0, Date.now())); },
  });
  scrollList(ov.el);
}
function digit(d) {
  digitBuf = (digitBuf + d).slice(-5);
  toast(`Channel ${digitBuf}`, 1300);
  clearTimeout(digitT);
  digitT = setTimeout(() => {
    const n = parseInt(digitBuf, 10); digitBuf = '';
    let i = chans.findIndex((c) => c.num === n);
    if (i < 0 && catalog.live?.items.some((c) => c.num === n && !c._sep)) { group = 'all'; rebuild(); i = chans.findIndex((c) => c.num === n); }
    if (i < 0) return toast(`There is no channel ${n}.`);
    r = i; top = Math.max(0, i - 1); at = Date.now();
    draw(() => focusCell(r, at));
  }, 1200);
}

const def = {
  name: 'live',
  mount(root) {
    el = root;
    root.innerHTML = '<div class="g-now"></div><div class="g-grid"></div>';
    const grid = root.querySelector('.g-grid');
    root.addEventListener('click', (e) => { if (e.target.closest('[data-act="reload"]')) { e.stopImmediatePropagation(); def.enter(root, {}); } }, true);
    grid.addEventListener('tvfocus', () => setHtml(el.querySelector('.g-now'), nowPanel()));
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="group"]')) return groupSheet();
      const c = e.target.closest('.g-cell,.g-ch');
      if (c) cellOk(c);
    });
    root.addEventListener('tvhold', (e) => { const c = e.target.closest('.g-cell,.g-ch'); if (c) favHold(c); });
    // Every row gets the guide's own navigation.
    const obs = new MutationObserver(() => grid.querySelectorAll('.g-row').forEach((rw) => (rw.navHook = hook)));
    obs.observe(grid, { childList: true });
    on('catalog', (k) => { if (k === 'live' && current() === 'live') { rebuildKeep(); draw(); } });
    on('nba', () => { if (current() === 'live') { rebuildKeep(); draw(); } });   // (your game tipping off pins its channel; ending unpins it)
    // (favouriting re-orders the Favourites group: focus stays on that channel, wherever it moved, so Hold OK undoes it)
    on('favs', () => {
      if (current() !== 'live') return;
      if (group !== 'fav') return draw();   // (the row's star)
      const keep = chans[r];
      rebuild();
      const i = keep ? chans.indexOf(keep) : -1;
      if (i >= 0) { r = i; if (r < top || r >= top + ROWS) top = Math.max(0, Math.min(r, chans.length - ROWS)); }
      const inGuide = el.contains(document.activeElement);
      draw(inGuide ? () => focusCell(r, at) : undefined);
    });
    on('session', () => { group = 'fav'; r = 0; top = 0; winStart = 0; inPast = false; });
    on('progress', () => { if (current() === 'live' && inPast) drawSoon(); });
    setInterval(() => { if (current() === 'live') draw(); }, 30000);
  },
  enter(root, params, { fresh = true } = {}) {
    if (!catalog.live) {
      setHtml(root.querySelector('.g-grid'), `<div class="t-cap" style="padding:40px 0">Loading channels…</div>`);
      ensure('live').then(() => { if (current() === 'live') def.enter(root, params); }).catch((e) => {
        if (current() !== 'live') return;
        setHtml(root.querySelector('.g-grid'), `<div class="state big" style="margin-top:40px"><div class="ico">${ic('wifiOff')}</div><b>Could not load channels</b><p>${esc(e.message)}</p><div data-row><span class="btn fx" tabindex="-1" data-act="reload">Try again</span></div></div>`);
        if (mayFocus()) focus(root.querySelector('[data-act="reload"]'));
      });
      return;
    }
    takeFresh('live');
    // the same screen again (the provider answering after Offline): everything stays where it is, the guides are asked again
    if (!fresh && chans.length && !params.ch && !params.digit) { rebuildKeep(); draw(); return; }
    const saved = store.get(scoped('liveCat'), 'fav');
    const gs = groups();
    group = gs.some((g) => g[0] === saved) ? saved : gs.some((g) => g[0] === 'fav') ? 'fav' : 'all';
    rebuild();
    const g = myGame(); if (g) findFeeds(g);
    if (params.ch) { const i = chans.findIndex((c) => c.id === params.ch); if (i >= 0) r = i; }
    else if (!params.keep) {
      // Entry focus: the programme on now on the channel you watched last.
      const last = store.get(scoped('lastLive'), '');
      const i = chans.findIndex((c) => c.id === last);
      r = i >= 0 ? i : 0;
    }
    top = Math.max(0, Math.min(r, chans.length - ROWS));
    at = Date.now();
    if (!params.keep) { inPast = false; winStart = 0; }
    draw(() => { if (mayFocus()) focusCell(r, at); });
    if (params.digit) digit(params.digit);
  },
  entry: (root) => root.querySelector(`.g-row[data-ri="${r}"] .g-cell.now`) || root.querySelector(`.g-row[data-ri="${r}"] .g-cell`),
  key(k, e) {
    if (k === 'chup' || k === 'chdown') { if (el.contains(document.activeElement)) { page(k === 'chdown' ? 1 : -1); return true; } }
    if (k === 'digit') { digit(e.key); return true; }
    return false;
  },
  leave() { clearTimeout(digitT); digitBuf = ''; },
  toTop() { r = 0; top = 0; winStart = 0; inPast = false; draw(); },
  // Back in the past: the window returns to now, on the same channel's programme on now (catch-up 4.1)
  back() {
    if (digitBuf) { clearTimeout(digitT); digitBuf = ''; }   // (a channel number still being typed: Back drops it)
    if ((!inPast && winStart <= nowFloor) || !el.querySelector('.g-grid').contains(document.activeElement)) return false;
    inPast = false; winStart = 0; at = Date.now();
    draw(() => focusCell(r, Date.now()));
    return true;
  },
};
export default def;
