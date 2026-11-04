// Saved (desktop SPEC 5.7): the TV's chips (Channels · Movies · Series · History) as a segmented control; favourite
// channels reorder by dragging the grip (Alt ↑ ↓ from the keyboard); the side card says what the order drives.
import { hm } from '../tv/js/util.js';
import { on, favList, setFavOrder, isFav, toggleFav, continueRows } from '../tv/js/state.js';
import { catalog } from '../tv/js/catalog.js';
import { guideNow, onNow } from '../tv/js/guide.js';
import { programmeView } from '../tv/js/catchup.js';
import { playLive } from '../tv/js/player.js';
import { resumeItem } from '../tv/js/actions.js';
import { keyOf } from '../tv/js/util.js';
import * as SH from '../tv/js/shelves.js';
import { ic, esc, isShown, menu, longPress, tileOf, cleanCh } from './ui.js';
import { posterCard, contCard } from './cards.js';
import { openTitle } from './detail.js';

let el, seg = 'channels';
const chans = () => favList('live').map((f) => catalog.live?.byId.get(f.id) || f).filter(Boolean);
function draw() {
  if (!el) return;
  const segs = [['channels', 'Channels'], ['movie', 'Movies'], ['series', 'Series'], ['history', 'History']].map(([k, l]) => `<button class="${k === seg ? 'sel' : ''}" data-seg="${k}">${l}</button>`).join('');
  let body = '';
  if (seg === 'channels') {
    const list = chans();
    body = list.length ? `<div class="sv-two"><div class="sv-list">${list.map((c, i) => { const p = onNow(guideNow(c)); return `<div class="sv-ch" draggable="true" data-i="${i}"><span class="grip" data-tip="Drag to reorder · Alt ↑ ↓">${ic('grip')}</span><span class="no">${i + 1}</span>${tileOf(c)}<button class="col" data-tune="${i}"><b>${esc(cleanCh(c.name))}</b><small>${esc(p ? `${programmeView(c, p).title} · until ${hm(p.end)}` : c.num ? `Channel ${c.num}` : '')}</small></button><button class="ib" data-unfav="${i}" aria-label="Remove">${ic('star')}</button></div>`; }).join('')}</div><div class="sv-card"><b>What the order drives</b><p>Your favourites are the guide's first group and the ring you zap through in the player (PgUp PgDn), in this order. Home's Channels row starts with them.</p></div></div>`
      : '<div class="state"><b>No favourite channels</b><p>Star a channel in the guide (F, or right-click › Favourite).</p></div>';
  } else if (seg === 'history') {
    const rows = continueRows();
    body = rows.length ? `<div class="sv-grid wide">${rows.map((p, i) => contCard(p, i)).join('')}</div>` : '<div class="state"><b>Nothing yet</b><p>What you start watching shows here.</p></div>';
  } else {
    const items = [...SH.savedItems(seg), ...favList(seg).filter((f) => !String(f.id).startsWith('tt') && !f.addon)];
    body = items.length ? `<div class="lb-grid">${items.map((it, i) => posterCard(it, i)).join('')}</div>` : `<div class="state"><b>Nothing saved</b><p>Save a ${seg === 'movie' ? 'film' : 'series'} from its page or with S on a poster.</p></div>`;
  }
  el.innerHTML = `<div class="ph-top"><h1>Saved</h1></div><div class="lb-seg">${segs}</div>${body}`;
}
const itemsNow = () => (seg === 'movie' || seg === 'series' ? [...SH.savedItems(seg), ...favList(seg).filter((f) => !String(f.id).startsWith('tt') && !f.addon)] : []);
function move(i, d) {
  const list = favList('live'), j = i + d;
  if (j < 0 || j >= list.length) return;
  const keys = list.map((f) => keyOf(f));
  [keys[i], keys[j]] = [keys[j], keys[i]];
  setFavOrder(keys);
  draw();
  el.querySelector(`.sv-ch[data-i="${j}"] .col`)?.focus();
}
export default {
  name: 'saved', tab: true,
  mount(root) {
    el = root;
    root.addEventListener('click', (e) => {
      const s = e.target.closest('[data-seg]'); if (s) { seg = s.dataset.seg; draw(); return; }
      const t = e.target.closest('[data-tune]'); if (t) { const list = chans(), ch = list[+t.dataset.tune]; if (ch) playLive(ch, list, 'Saved'); return; }
      const u = e.target.closest('[data-unfav]'); if (u) { const ch = chans()[+u.dataset.unfav]; if (ch) toggleFav(ch); return; }
      const p = e.target.closest('.poster[data-i]'); if (p) { const it = itemsNow()[+p.dataset.i]; if (it) openTitle(it); return; }
      const w = e.target.closest('.wide[data-i]'); if (w) { const r = continueRows()[+w.dataset.i]; if (r) resumeItem(r.item); }
    });
    longPress(root, '.poster[data-i]', (p) => { const it = itemsNow()[+p.dataset.i]; if (it) menu(it.name, [{ label: 'Details', icon: 'chevR', run: () => openTitle(it) }, { label: isFav(it) ? 'Remove from Saved' : 'Save', icon: 'heart', run: () => toggleFav(SH.asTitle(it, it.imdb || it.id)) }]); });
    // drag the grip to reorder
    let from = -1;
    root.addEventListener('dragstart', (e) => { const r = e.target.closest('.sv-ch'); if (!r) return; from = +r.dataset.i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/x-airglow', `c:${chans()[from]?.id}`); });
    root.addEventListener('dragover', (e) => { if (from >= 0 && e.target.closest('.sv-ch')) e.preventDefault(); });
    root.addEventListener('drop', (e) => { const r = e.target.closest('.sv-ch'); if (!r || from < 0) return; e.preventDefault(); const to = +r.dataset.i; const keys = favList('live').map((f) => keyOf(f)); const [k] = keys.splice(from, 1); keys.splice(to, 0, k); setFavOrder(keys); from = -1; draw(); });
    root.addEventListener('keydown', (e) => { if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return; const r = e.target.closest('.sv-ch'); if (!r) return; e.preventDefault(); e.stopPropagation(); move(+r.dataset.i, e.key === 'ArrowUp' ? -1 : 1); }, true);
    on('favs', () => { if (isShown('saved')) draw(); });
  },
  enter(root, params) { if (params.seg) seg = params.seg; draw(); },
};
