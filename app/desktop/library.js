// Library (SPEC 3.4, 10): Movies · Series · Saved as a segmented control, the shelf chips (Popular, New, Top rated, the
// genres, the add-ons' catalogs), the context line and the TV's grid 3 across, read page by page (shelves.js Pager).
// The library is the add-ons', never the provider's VOD (the owner's rule).
import { on, favList } from '../tv/js/state.js';
import { anyStreamAddon } from '../tv/js/imdb.js';
import * as SH from '../tv/js/shelves.js';
import { avatar, ic, esc, push, isShown, menu, longPress } from './ui.js';
import { posterCard } from './cards.js';
import { openTitle } from './detail.js';

let el, seg = 'movie', shelfKey = 'popular', pager = null, busy = false;
const shelfList = (kind) => [...SH.shelves(kind).filter((s) => !['saved', 'history'].includes(s.src)), ...SH.GENRES[kind].map((g) => SH.genreShelf(kind, g))];
function shelfNow() { const l = shelfList(seg); return l.find((s) => s.key === shelfKey) || l[0]; }
function items() {
  if (seg === 'saved') return [...SH.savedItems('movie'), ...SH.savedItems('series'), ...favList('movie').filter((f) => !String(f.id).startsWith('tt')), ...favList('series').filter((f) => !String(f.id).startsWith('tt'))];
  return pager?.items || [];
}
function draw() {
  if (!el) return;
  const segs = [['movie', 'Movies'], ['series', 'Series'], ['saved', 'Saved']].map(([k, l]) => `<button class="${k === seg ? 'sel' : ''}" data-seg="${k}">${l}</button>`).join('');
  const top = `<div class="ph-top"><h1>Library</h1><span class="sp"></span><button class="ib" data-act="search" aria-label="Search">${ic('search')}</button>${avatar()}</div><div class="lb-seg">${segs}</div>`;
  if (seg !== 'saved' && !anyStreamAddon()) { el.innerHTML = `${top}<div class="state"><b>No add-ons</b><p>Films and series come from your Stremio add-ons. Add one from Stremio.</p><button class="ghost" data-act="addons">Account › Add-ons</button></div>`; return; }
  const sh = seg === 'saved' ? null : shelfNow();
  const chips = sh ? `<div class="chips" style="margin-top:14px">${shelfList(seg).map((s) => `<button class="chip${s.key === sh.key ? ' sel' : ''}" data-shelf="${esc(s.key)}">${esc(s.label)}</button>`).join('')}</div>` : '';
  const list = items();
  const ctx = sh ? `<div class="lb-ctx"><b>${esc(sh.label)}</b><span>${esc(pager ? `${pager.totalLabel()} ${seg === 'movie' ? 'films' : 'series'}` : '')}</span></div>` : `<div class="lb-ctx"><b>Saved</b><span>${list.length} title${list.length === 1 ? '' : 's'}</span></div>`;
  const grid = list.length ? `<div class="lb-grid">${list.map((it, i) => posterCard(it, i)).join('')}</div>` : seg === 'saved' ? '<div class="state"><b>Nothing saved</b><p>Save a film or a series from its page.</p></div>' : pager?.failed ? '<div class="state"><b>This shelf didn\'t load</b><button class="ghost" data-act="retry">Try again</button></div>' : `<div class="lb-grid">${Array.from({ length: 9 }, () => '<div class="poster"><div class="box sk"></div></div>').join('')}</div>`;
  const y = el.scrollTop;
  el.innerHTML = `${top}${chips}${ctx}${grid}${pager && !pager.end && list.length ? '<div class="lb-more"><span class="spin"></span></div>' : ''}`;
  el.scrollTop = y;
}
async function more() {
  if (!pager || busy || pager.end || seg === 'saved') return;
  busy = true;
  const p = pager;
  try { await p.more(); } catch { /* shown by failed */ }
  busy = false;
  if (p === pager && isShown('lib')) draw();
}
function setShelf() { if (seg === 'saved') { pager = null; draw(); return; } pager = new SH.Pager(shelfNow()); draw(); more(); }
export default {
  name: 'lib', tab: true,
  mount(root) {
    el = root;
    root.addEventListener('click', (e) => {
      const s = e.target.closest('[data-seg]');
      if (s) { seg = s.dataset.seg; shelfKey = 'popular'; root.scrollTop = 0; setShelf(); return; }
      const c = e.target.closest('[data-shelf]');
      if (c) { shelfKey = c.dataset.shelf; root.scrollTop = 0; setShelf(); return; }
      const b = e.target.closest('[data-act]');
      if (b) {
        if (b.dataset.act === 'account') return push('account');
        if (b.dataset.act === 'addons') return push('account', { open: 'addons' });
        if (b.dataset.act === 'search') return import('./ui.js').then((u) => u.go('search'));
        if (b.dataset.act === 'retry') return setShelf();
      }
      const p = e.target.closest('.poster[data-i]');
      if (p) { const it = items()[+p.dataset.i]; if (it) openTitle(it.versions ? it : { ...it, kind: it.kind || seg }); }
    });
    longPress(root, '.poster[data-i]', (p) => { const it = items()[+p.dataset.i]; if (it) menu(it.name, [{ label: 'Details', icon: 'chevR', run: () => openTitle(it) }]); });
    root.addEventListener('scroll', () => { if (root.scrollTop + root.clientHeight > root.scrollHeight - 900) more(); }, { passive: true });
    on('favs', () => { if (isShown('lib') && seg === 'saved') draw(); });
  },
  enter(root, params) {
    if (params.seg && params.seg !== seg) { seg = params.seg; shelfKey = 'popular'; pager = null; }
    if (!pager && seg !== 'saved') setShelf(); else draw();
  },
};
