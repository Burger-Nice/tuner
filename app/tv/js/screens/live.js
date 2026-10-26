// Live guide: the Now panel, a ruler with the group chip and "Now", and six channel rows whose programmes sit by time
// (656 px = 2.5 h from now). ◀▶ move along time, ▲▼ between channels, OK tunes the programme on now (or shows a later
// one), hold OK favourites with an undo toast, CH± pages, digits jump. The group you pick is the player's zap ring.
import { $, esc, ic, dot, liveP, logo, hm, setHtml } from '../util.js';
import { S, on, store, scoped, favList, toggleFav, isFav } from '../state.js';
import { catalog, ensure, takeFresh } from '../catalog.js';
import { guideFor, guideNow, guideFailed, onNow, warm, known } from '../guide.js';
import { myGame, gameOn, hidden, feedsNow, findFeeds, liveGames, isMine, show } from '../games.js';
import { playLive, watching } from '../player.js';
import { current, mayFocus } from '../router.js';
import { focus } from '../focus.js';
import { openOverlay, toast, scrollList } from '../ui.js';

const ROWS = 6, PITCH = 52, AXIS = 656, SPAN = 150 * 60e3, PX = AXIS / SPAN;
let el, group = 'fav', chans = [], top = 0, r = 0, at = Date.now(), winStart = 0, nowFloor = 0, toastT = 0, digitBuf = '', digitT = 0;
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
function countGroups(c) {
  const counts = new Map();
  for (const it of c.items) counts.set(it.cat, (counts.get(it.cat) || 0) + 1);
  const fav = favList('live').length;
  const out = [];
  if (fav) out.push(['fav', 'Favourites first', fav, 'star']);
  const lg = liveGames().length;
  if (lg) out.push(['games', 'Live games', lg, 'live']);
  out.push(['all', 'All channels', c.items.length, 'tv']);
  for (const k of c.cats) if (counts.get(k.id)) out.push([k.id, k.name, counts.get(k.id), 'tv']);
  return out;
}
export const groupName = (g = group) => groups().find((x) => x[0] === g)?.[1] || 'All channels';
// The channels of a group. Favourites first = your favourites in your order, then everything else.
function listFor(g) {
  const c = catalog.live;
  if (!c) return [];
  if (g === 'fav') { const f = favList('live').map((x) => c.byId.get(x.id)).filter(Boolean); const set = new Set(f); return [...f, ...c.items.filter((x) => !set.has(x))]; }
  if (g === 'games') { const out = []; for (const gm of liveGames()) for (const f of feedsNow(gm)) if (!out.includes(f.ch)) out.push(f.ch); return out.length ? out : c.items; }
  if (g === 'all') return c.items;
  return c.items.filter((x) => x.cat === g);
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

const x = (t) => Math.round((t - winStart) * PX);
function cells(ch, ri) {
  const list = guideNow(ch);
  const end = winStart + SPAN;
  if (!list) return `<div class="g-cell fx" tabindex="-1" data-r="${ri}" data-s="${winStart}" data-e="${end}" style="left:0;width:${AXIS - 4}px"><b style="color:var(--a-text-3);font-weight:500">Loading guide…</b></div>`;
  const vis = list.filter((p) => p.end > winStart && p.start < end);
  // Say why there's nothing: offline, or the provider didn't answer this time (tried again soon), or it has no guide.
  const why = S.offline ? 'Offline · OK still tunes' : guideFailed(ch) ? "Guide didn't load · OK still tunes" : 'No guide information';
  if (!vis.length) return `<div class="g-cell empty fx" tabindex="-1" data-r="${ri}" data-s="${winStart}" data-e="${end}" style="left:0;width:${AXIS - 4}px"><b>${why}</b></div>`;
  const now = Date.now();
  return vis.map((p) => {
    const s = Math.max(p.start, winStart), e = Math.min(p.end, end);
    const left = x(s), w = x(e) - left - 4;
    const isNow = p.start <= now && p.end > now;
    const g = isNow ? gameOn(ch, [p]) : null;
    const live = !!(g && g.state === 'in');
    const sub = live ? liveP(true) : `${p.start < winStart ? '◂ ' : ''}${hm(p.start)}${e - s >= 36 * 60e3 ? dot + hm(p.end) : ''}`;
    const pg = isNow ? `<div class="prog"><i style="width:${Math.min(100, ((now - p.start) / (p.end - p.start)) * 100)}%"></i></div>` : '';
    if (w < 52) return `<div class="g-cell sliver fx" tabindex="-1" data-r="${ri}" data-s="${p.start}" data-e="${p.end}" style="left:${left}px;width:${Math.max(4, w)}px"></div>`;
    return `<div class="g-cell fx${isNow ? ' now' : ''}" tabindex="-1" data-hold data-r="${ri}" data-s="${p.start}" data-e="${p.end}" style="left:${left}px;width:${w}px"><b>${esc(p.title)}</b><div class="sb">${sub}</div>${pg}</div>`;
  }).join('');
}
function row(ch, ri) {
  const pin = ri === top && chans._pin && ch.id === chans._pin.id;
  const mark = pin ? `<span class="fv">${ic('pin')}</span>` : isFav(ch) ? `<span class="fv">${ic('star')}</span>` : '';
  return `<div class="g-row" data-row data-ri="${ri}"><div class="g-ch fx${ri === r ? ' sel' : ''}" tabindex="-1" data-hold data-ch data-r="${ri}"><span class="num">${ch.num}</span>${logo(ch.logo, ch.name, 'sm')}<div class="nm">${esc(ch.name)}</div>${mark}</div><div class="g-cells">${cells(ch, ri)}</div></div>`;
}
function ruler() {
  const ticks = [];
  for (let t = Math.ceil((winStart + 1) / 1800e3) * 1800e3; t < winStart + SPAN; t += 1800e3) if (x(t) > 40 && x(t) < AXIS - 40) ticks.push(`<span style="left:${x(t)}px">${hm(t)}</span>`);
  const n = Date.now();
  const flag = n >= winStart && n < winStart + SPAN ? `<span class="g-nowflag" style="left:${x(n)}px">Now</span>` : '';
  return `<div class="g-ruler"><div class="g-corner" data-row><span class="chip lg fx" tabindex="-1" data-act="group">${ic(group === 'fav' ? 'star' : 'tv')}<span class="ellipsis" style="max-width:120px">${esc(groupName())}</span><span class="t-3" style="font-weight:500">${chans.length}</span></span></div><div class="g-time">${flag}${ticks.join('')}</div></div>`;
}
function nowPanel() {
  const ch = chans[r];
  if (!ch) return '<div class="grow"><div class="t-title">No channels</div></div>';
  const f = document.activeElement;
  const s = f?.classList?.contains('g-cell') ? +f.dataset.s : Date.now();
  const list = guideNow(ch) || [];
  const p = list.find((q) => q.start <= Math.max(s, winStart) && q.end > Math.max(s, winStart)) || onNow(list);
  const g = p && p.start <= Date.now() && p.end > Date.now() ? gameOn(ch, [p]) : null;
  const hide = g && hidden(g);
  const nowish = p && p.start <= Date.now() && p.end > Date.now();
  const left = p && nowish ? Math.max(1, Math.round((p.end - Date.now()) / 60000)) : 0;
  const pv = hide ? `<div class="pvtile off">${ic('eyeOff', 'sm')}<span>Preview off<br>for your game</span></div>` : `<div class="pvtile" style="display:grid;place-items:center">${logo(ch.logo, ch.name, 'lg')}</div>`;
  const desc = hide ? `${ic('eyeOff', 'sm')}Description hidden (spoiler shield)` : esc(p?.desc || '');
  const right = toastT > Date.now() ? `<span class="toast"><b>${isFav(ch) ? 'Added to Favourites' : 'Removed from Favourites'}</b><span class="t-cap">Hold OK to undo</span></span>` : '<div class="t-cap" style="text-align:right;line-height:20px;white-space:nowrap">OK tune<br>Hold OK favourite</div>';
  return `${pv}<div class="grow">
    <div class="row-flex" style="gap:12px"><span class="t-title ellipsis">${esc(p?.title || ch.name)}</span>${g?.state === 'in' ? liveP() : ''}</div>
    <div class="row-flex" style="color:var(--a-text-2);font:500 15px/22px var(--a-font-text);white-space:nowrap">${esc(ch.name)}${p ? `${dot}${hm(p.start)} to ${hm(p.end)}` : ''}${left ? `${dot}${left >= 60 ? `${Math.floor(left / 60)}h ${left % 60}m` : left + ' min'} left<span class="prog" style="width:90px;margin-left:14px"><i style="width:${Math.min(100, ((Date.now() - p.start) / (p.end - p.start)) * 100)}%"></i></span>` : ''}</div>
    <div class="ellipsis row-flex" style="gap:6px;font:500 15px/22px var(--a-font-text);color:${hide ? 'var(--a-text-3)' : 'var(--a-text-2)'}">${desc}</div>
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
  if (!winStart || winStart < nowFloor) winStart = nowFloor;
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
    focusCell(ri, Math.max(Date.now(), winStart)); at = Math.max(Date.now(), winStart); return true;
  }
  const cs = [...cur.parentElement.querySelectorAll('.g-cell')];
  const i = cs.indexOf(cur);
  if (dir === 'left') {
    if (i > 0) { at = +cs[i - 1].dataset.s; focus(cs[i - 1]); return true; }
    if (winStart > nowFloor) { winStart = Math.max(nowFloor, winStart - 3600e3); at = Math.max(winStart, +cur.dataset.s - 1); draw(() => focusCell(ri, at)); return true; }
    focus(el.querySelector(`.g-ch[data-r="${ri}"]`)); return true;   // ◀ at the now column goes to the channel, never the bar
  }
  if (i < cs.length - 1) { at = Math.max(+cs[i + 1].dataset.s, winStart); focus(cs[i + 1]); return true; }
  if (winStart + SPAN < nowFloor + 22 * 3600e3) { winStart += 3600e3; at = Math.max(+cur.dataset.e, winStart); draw(() => focusCell(ri, at)); return true; }
  return false;
}
function page(d) { r = Math.max(0, Math.min(chans.length - 1, r + d * ROWS)); top = Math.max(0, Math.min(r, top + d * ROWS)); draw(() => focusCell(r, at)); }

function tune(ch) { playLive(ch, chans, groupName()); }
function cellOk(cell) {
  const ch = chans[+cell.dataset.r];
  if (!ch) return;
  const s = +cell.dataset.s, n = Date.now();
  if (cell.hasAttribute('data-ch') || s <= n || cell.classList.contains('empty')) return tune(ch);
  // A later programme: its details, and the channel as it is now.
  const p = (guideNow(ch) || []).find((q) => q.start === s);
  const ov = openOverlay(`<div class="menu" style="left:48px;top:120px;width:520px"><h3>${esc(p?.title || 'Later')}</h3><div class="t-cap" style="padding:0 8px 8px">${esc(ch.name)}${p ? `${dot}${hm(p.start)} to ${hm(p.end)}` : ''}</div>${p?.desc ? `<p class="t-body clamp3" style="padding:0 8px 12px">${esc(p.desc)}</p>` : ''}<div data-row class="row-flex" style="gap:12px;padding:4px 8px"><span class="btn fx" tabindex="-1" data-act="tune">${ic('play')}Watch ${esc(ch.name)} now</span></div></div>`, {
    onClick: (act) => { ov.close(false); if (act === 'tune') tune(ch); },
  });
}
function favHold(cell) {
  const ch = chans[+cell.dataset.r];
  if (!ch) return;
  toggleFav(ch);
  toastT = Date.now() + 4000;
  setHtml(el.querySelector('.g-now'), nowPanel());
  setTimeout(() => { if (current() === 'live') setHtml(el.querySelector('.g-now'), nowPanel()); }, 4100);
}
function groupSheet() {
  const gs = groups();
  const ov = openOverlay(`<div class="sheet left" style="width:340px"><h3>Channel group</h3><div class="t-cap" style="margin-top:-6px">This is also the zap ring in the player</div>
    <div class="sheet-body"><div class="inner" data-col>${gs.map(([id, name, n]) => `<div class="lr fx" tabindex="-1" data-act="${esc(id)}"><span class="rd${id === group ? ' on' : ''}"></span><span class="grow ellipsis">${esc(name)}</span><small>${n.toLocaleString()}</small></div>`).join('')}</div></div></div>`, {
    focusSel: `[data-act="${CSS.escape(group)}"]`,
    onClick: (act) => { ov.close(false); group = act; store.set(scoped('liveCat'), act); r = 0; top = 0; rebuild(); draw(() => focusCell(0, Date.now())); },
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
    if (i < 0 && catalog.live?.items.some((c) => c.num === n)) { group = 'all'; rebuild(); i = chans.findIndex((c) => c.num === n); }
    if (i < 0) return toast(`There is no channel ${n}.`);
    r = i; top = Math.max(0, i - 1); at = Date.now();
    draw(() => focusCell(r, at));
  }, 1200);
}

export default {
  name: 'live',
  mount(root) {
    el = root;
    root.innerHTML = '<div class="g-now"></div><div class="g-grid"></div>';
    const grid = root.querySelector('.g-grid');
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
    on('catalog', (k) => { if (k === 'live' && current() === 'live') { rebuild(); draw(); } });
    on('nba', () => { if (current() === 'live') draw(); });
    on('favs', () => { if (current() === 'live' && group === 'fav') { rebuild(); draw(); } });
    on('session', () => { group = 'fav'; r = 0; top = 0; winStart = 0; });
    setInterval(() => { if (current() === 'live') draw(); }, 30000);
  },
  enter(root, params) {
    if (!catalog.live) {
      setHtml(root.querySelector('.g-grid'), `<div class="t-cap" style="padding:40px 0">Loading channels…</div>`);
      ensure('live').then(() => { if (current() === 'live') this.enter(root, params); }).catch((e) => setHtml(root.querySelector('.g-grid'), `<div class="state big" style="margin-top:40px"><div class="ico">${ic('wifiOff')}</div><b>Could not load channels</b><p>${esc(e.message)}</p></div>`));
      return;
    }
    takeFresh('live');
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
    draw(() => { if (mayFocus()) focusCell(r, at); });
    if (params.digit) digit(params.digit);
  },
  entry: (root) => root.querySelector(`.g-row[data-ri="${r}"] .g-cell.now`) || root.querySelector(`.g-row[data-ri="${r}"] .g-cell`),
  key(k, e) {
    if (k === 'chup' || k === 'chdown') { if (el.contains(document.activeElement)) { page(k === 'chdown' ? 1 : -1); return true; } }
    if (k === 'digit') { digit(e.key); return true; }
    return false;
  },
  toTop() { r = 0; top = 0; winStart = 0; draw(); },
};
