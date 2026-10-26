// Saved: your channels (in the order that drives On now, the Favourites guide group and the zap ring), movies, series,
// and history. On Channels, hold OK lifts a row; ▲▼ move it, OK drops it, Back puts it back.
import { esc, ic, dot, logo, setHtml, leftText } from '../util.js';
import { S, on, favList, setFavOrder, toggleFav, continueRows } from '../state.js';
import { catalog, ensure } from '../catalog.js';
import { guideNow, onNow, warm } from '../guide.js';
import { gameOn } from '../games.js';
import { poster } from '../cards.js';
import { playLive, watching } from '../player.js';
import { push, current } from '../router.js';
import { focus } from '../focus.js';
import { contextMenu, toast } from '../ui.js';
import { resumeItem, openTitle } from '../actions.js';

let el, tab = 'channels', lift = null, liftFrom = 0, order = [], gridTop = 0;
const keyOf = (f) => `${f.kind}:${f.id}`;

function chans() { const c = catalog.live; return favList('live').map((f) => c?.byId.get(f.id) || f); }
function titles(kind) {
  const c = catalog[kind];
  return favList(kind).map((f) => c?.titleById?.get(f.id) || c?.titles?.find((x) => x.id === f.id) || { ...f, name: f._title || f.name, versions: [f], _langs: new Set(), _qs: new Set() });
}
function history() { return Object.values(S.progress).sort((a, b) => b.at - a.at).slice(0, 30); }

let behind = false;
on('player-closed', () => { if (behind) { behind = false; draw(); } });
function draw() {
  if (watching()) { behind = true; return; }   // nothing to see under the TV player; drawn once it closes
  if (!el || el.hidden) return;
  const counts = { channels: favList('live').length, movie: favList('movie').length, series: favList('series').length };
  const chip = (k, l, n) => `<span class="chip lg fx${tab === k ? ' sel' : ''}" tabindex="-1" data-tab-s="${k}">${l}${n != null ? `<span class="n">${n}</span>` : ''}</span>`;
  let body = '';
  if (tab === 'channels') {
    order = chans();
    const rows = order.map((c, i) => {
      const p = onNow(guideNow(c)), g = p && gameOn(c, [p]);
      const lifted = lift === i;
      return `<div class="srow fx${lifted ? ' lift' : ''}" tabindex="-1" data-hold data-ci="${i}"><span class="grip">${lifted ? ic('chevU', 'sm') + ic('chevD', 'sm') : '<i></i><i></i><i></i>'}</span><span class="num">${i + 1}</span>${logo(c.logo, c.name)}<div class="grow" style="min-width:0"><div class="t-sub ellipsis">${esc(c.name)}</div><div class="t-cap ellipsis">${esc(p?.title || 'No guide information')}</div></div>${g?.state === 'in' ? '<span class="a-live">Live</span>' : ''}</div>`;
    }).join('');
    body = order.length
      ? `<div class="abs" style="left:48px;top:134px;width:560px;height:379px;overflow:hidden"><div class="t-cap" style="margin-bottom:10px">${lift != null ? '<b style="color:var(--a-text-1)">Move with Up and Down. OK drops it.</b> Back puts it back.' : 'OK plays. Hold OK to reorder.'}</div><div class="inner" data-col style="transform:translateY(${-gridTop}px);transition:transform 200ms var(--a-ease)">${rows}</div></div>
         <div class="abs card" style="left:640px;top:134px;width:272px;padding:16px"><b style="font:700 18px/24px var(--a-font-display)">This order is used by</b><ul class="ul"><li>On now on Home</li><li>The Favourites guide group</li><li>Up and Down in the player when you tune from Favourites</li></ul></div>`
      : `<div class="center-col" style="top:180px"><div class="state big"><div class="ico">${ic('star')}</div><b>No saved channels yet</b><p>In the guide, hold OK on a channel to save it. Saved channels lead On now and the Favourites group.</p></div></div>`;
  } else if (tab === 'movie' || tab === 'series') {
    const list = titles(tab);
    el._list = list;
    body = list.length
      ? `<div class="lib-grid" data-grid data-cols="6" style="top:134px;transform:translateY(${-gridTop}px);transition:transform 320ms var(--a-ease)">${list.map((t, i) => poster(t, i)).join('')}</div>`
      : `<div class="center-col" style="top:180px"><div class="state big"><div class="ico">${ic('saved')}</div><b>Nothing saved yet</b><p>Open a ${tab === 'movie' ? 'movie' : 'series'} and choose Save, or hold OK on its poster.</p></div></div>`;
  } else {
    const h = history();
    el._hist = h;
    body = h.length ? `<div class="abs" style="left:48px;top:134px;width:864px;height:379px;overflow:hidden"><div class="inner" data-col style="transform:translateY(${-gridTop}px);transition:transform 200ms var(--a-ease)">${h.map((p, i) => {
      const it = p.item, title = it.kind === 'episode' ? `${it.seriesName} · S${it.season} E${it.ep}` : it._title || it.name;
      const done = p.done || p.t >= p.d * 0.94;
      return `<div class="rrow fx" tabindex="-1" data-hi="${i}" style="margin-bottom:8px"><div class="mini2" style="height:40px;width:28px"><div class="art">${it.poster ? `<img src="${esc(it.poster)}" alt="">` : ''}</div></div><div class="grow" style="min-width:0"><div class="t-sub ellipsis">${esc(title)}</div><div class="t-cap">${done ? 'Watched' : leftText(p.d - p.t)}${dot}${new Date(p.at).toLocaleDateString([], { day: 'numeric', month: 'short' })}</div></div></div>`;
    }).join('')}</div></div>` : `<div class="center-col" style="top:180px"><div class="state big"><div class="ico">${ic('clock')}</div><b>Nothing watched yet</b><p>Films and episodes you start show up here.</p></div></div>`;
  }
  setHtml(el, `<div class="lib-head" data-row><span class="t-head">Saved</span><span class="grow"></span>${chip('channels', 'Channels', counts.channels)}${chip('movie', 'Movies', counts.movie)}${chip('series', 'Series', counts.series)}${chip('history', 'History')}</div>${body}`);
}
// Keep the focused row inside the visible list.
function place() {
  const a = document.activeElement, inner = el.querySelector('.inner, .lib-grid');
  if (!inner || !inner.contains(a)) { if (gridTop) { gridTop = 0; if (inner) inner.style.transform = ''; } return; }
  const y = a.offsetTop, h = tab === 'movie' || tab === 'series' ? 252 : 64, view = 379 - 28;
  if (y - gridTop > view - h) gridTop = y - view + h; else if (y < gridTop) gridTop = y;
  inner.style.transform = `translateY(${-gridTop}px)`;
}

export default {
  name: 'saved',
  mount(root) {
    el = root;
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab-s]');
      if (t) { tab = t.dataset.tabS; lift = null; gridTop = 0; draw(); focus(el.querySelector(`[data-tab-s="${tab}"]`)); return; }
      const r = e.target.closest('[data-ci]');
      if (r) {
        const i = +r.dataset.ci;
        if (lift != null) { setFavOrder(order.map((c) => `live:${c.id}`).concat(Object.keys(S.favs).filter((k) => !k.startsWith('live:')))); lift = null; draw(); focus(el.querySelector(`[data-ci="${i}"]`)); return; }
        const ch = order[i]; if (ch) playLive(ch, order, 'Favourites');
        return;
      }
      const p = e.target.closest('.pc'); if (p) { const x = el._list?.[+p.dataset.i]; if (x) push('detail', { title: x }); return; }
      const h = e.target.closest('[data-hi]'); if (h) { const x = el._hist?.[+h.dataset.hi]; if (x) resumeItem(x.item); }
    });
    root.addEventListener('tvhold', (e) => {
      const r = e.target.closest('[data-ci]');
      if (r) { lift = +r.dataset.ci; liftFrom = lift; draw(); focus(el.querySelector(`[data-ci="${lift}"]`)); return; }
      const p = e.target.closest('.pc');
      if (p) { const x = el._list?.[+p.dataset.i]; if (x) contextMenu(p, [{ icon: 'saved', label: 'Remove from Saved', run: () => { toggleFav(x); draw(); } }, { icon: 'info', label: 'Details', run: () => push('detail', { title: x }) }]); }
    });
    root.addEventListener('tvfocus', (e) => { place(); const t = e.target.dataset.tabS; if (t && t !== tab) { tab = t; lift = null; gridTop = 0; draw(); } });
    on('favs', () => { if (current() === 'saved' && lift == null) draw(); });
    on('progress', () => { if (current() === 'saved') draw(); });
  },
  enter(root) {
    lift = null; gridTop = 0;
    ensure('live').then(() => { if (current() === 'saved') { draw(); warm(chans(), { still: () => current() === 'saved' }).then((n) => { if (n) draw(); }); } }).catch(() => {});
    draw();
  },
  entry: (root) => root.querySelector('[data-ci], .pc, [data-hi]') || root.querySelector('.chip.sel'),
  key(k) {
    if (lift == null) return false;
    if (k === 'up' || k === 'down') {
      const to = lift + (k === 'down' ? 1 : -1);
      if (to < 0 || to >= order.length) return true;
      const [x] = order.splice(lift, 1); order.splice(to, 0, x);
      // Draw from the moved order (the saved order changes only when the row is dropped).
      const keys = order.map((c) => `live:${c.id}`);
      const rest = Object.keys(S.favs).filter((kk) => !kk.startsWith('live:'));
      setFavOrder(keys.concat(rest));
      lift = to; draw(); focus(el.querySelector(`[data-ci="${lift}"]`)); place();
      return true;
    }
    return k === 'left' || k === 'right';
  },
  back() {
    if (lift == null) return false;
    // Back puts it back where it was.
    const [x] = order.splice(lift, 1); order.splice(liftFrom, 0, x);
    setFavOrder(order.map((c) => `live:${c.id}`).concat(Object.keys(S.favs).filter((kk) => !kk.startsWith('live:'))));
    lift = null; draw(); focus(el.querySelector(`[data-ci="${liftFrom}"]`));
    return true;
  },
};
