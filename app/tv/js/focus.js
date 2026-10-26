// D-pad focus. Focusable things carry the class `fx`; they live in containers:
//   [data-row]   left/right move along it and stop at its ends; up/down leave it
//   [data-col]   up/down move along it; left/right leave it
//   [data-grid]  (data-cols="6") a grid; edges stop sideways, up/down move by a row, then leave it
// Leaving a container goes to the nearest container in that direction, landing on the item it remembers (rows keep
// their place) or the one nearest in line. The top bar is a row; down from it returns to where you were on the screen.
// Sheets and menus push a layer that keeps focus inside until they close. A held key never crosses into or out of the top bar.

const layers = [];   // modal roots, topmost last
let base = null;     // the app root (top bar + the current screen)
export function setBase(el) { base = el; }
export const topLayer = () => layers[layers.length - 1] || base;
export function pushLayer(el, focusEl) { layers.push(el); (focusEl || entryOf(el))?.focus({ preventScroll: true }); }
export function popLayer(el, restore) {
  const i = layers.lastIndexOf(el);
  if (i >= 0) layers.splice(i, 1);
  if (restore?.isConnected) focus(restore);
}
export const inLayer = () => layers.length > 0;

const visible = (el) => el.getClientRects().length > 0 && !el.closest('[hidden]') && !el.classList.contains('dis');
const CONT = '[data-row],[data-col],[data-grid]';
const boxOf = (el) => el.closest(CONT);
const itemsOf = (box) => [...box.querySelectorAll('.fx')].filter((el) => boxOf(el) === box && visible(el));

export function entryOf(root) {
  if (!root) return null;
  const mem = root._last;
  if (mem?.isConnected && root.contains(mem) && visible(mem)) return mem;
  const own = root._entry?.();
  if (own && visible(own)) return own;
  const e = root.dataset?.entry && root.querySelector(root.dataset.entry);
  if (e && visible(e)) return e;
  return [...root.querySelectorAll('.fx')].find((el) => visible(el) && !el.closest('[data-row="topbar"]')) || [...root.querySelectorAll('.fx')].find(visible) || null;
}

export function focus(el, opts = {}) {
  if (!el) return false;
  el.focus({ preventScroll: true });
  const box = boxOf(el);
  if (box) box._mem = el;
  const scr = el.closest('[data-screen]');
  if (scr) scr._last = el;
  const layer = topLayer();
  if (layer && layer !== base && layer.contains(el)) layer._last = el;
  el.dispatchEvent(new CustomEvent('tvfocus', { bubbles: true, detail: opts }));
  return true;
}

const rectOf = (el) => el.getBoundingClientRect();
const cx = (r) => (r.left + r.right) / 2, cy = (r) => (r.top + r.bottom) / 2;

function pickIn(box, from, dir) {
  if (box.dataset.row === 'topbar') return box.querySelector('.fx.sel') || itemsOf(box)[0];
  const mem = box._mem;
  if (mem?.isConnected && box.contains(mem) && visible(mem) && box.dataset.mem !== 'off') return mem;
  const e = box.dataset.entry && box.querySelector(box.dataset.entry);
  if (e && visible(e)) return e;
  let items = itemsOf(box);
  if (!items.length) return null;
  const a = rectOf(from);
  const vert = dir === 'up' || dir === 'down';
  // Coming into a row that wraps onto more lines: its nearest line first (the first going down, the last going up).
  if (vert && box.hasAttribute('data-row')) {
    const edge = dir === 'down' ? Math.min(...items.map((el) => rectOf(el).top)) : Math.max(...items.map((el) => rectOf(el).bottom));
    // (one line = items within half the smallest item's height of that edge: a pill a few px inside the buttons counts)
    const tol = Math.max(4, Math.min(...items.map((el) => rectOf(el).height)) / 2);
    items = items.filter((el) => Math.abs((dir === 'down' ? rectOf(el).top : rectOf(el).bottom) - edge) < tol);
  }
  let best = null, bd = Infinity;
  for (const el of items) {
    const b = rectOf(el);
    const d = vert ? Math.abs(cx(b) - cx(a)) + (dir === 'down' ? b.top : -b.bottom) * 0.01 : Math.abs(cy(b) - cy(a));
    if (d < bd) { bd = d; best = el; }
  }
  return best;
}

function neighbour(box, from, dir, root) {
  const a = rectOf(box), f = rectOf(from);
  let best = null, bs = Infinity;
  for (const c of root.querySelectorAll(CONT)) {
    if (c === box || c.contains(box) || box.contains(c) || !visible(c) || !itemsOf(c).length) continue;
    const b = rectOf(c);
    let gap, ortho;
    if (dir === 'down') { if (b.top < a.bottom - 2) continue; gap = b.top - a.bottom; ortho = Math.max(0, Math.max(b.left - f.right, f.left - b.right)); }
    else if (dir === 'up') { if (b.bottom > a.top + 2) continue; gap = a.top - b.bottom; ortho = Math.max(0, Math.max(b.left - f.right, f.left - b.right)); }
    else if (dir === 'right') { if (b.left < a.right - 2) continue; gap = b.left - a.right; ortho = Math.max(0, Math.max(b.top - f.bottom, f.top - b.bottom)); }
    else { if (b.right > a.left + 2) continue; gap = a.left - b.right; ortho = Math.max(0, Math.max(b.top - f.bottom, f.top - b.bottom)); }
    const score = gap + ortho * 4;
    if (score < bs) { bs = score; best = c; }
  }
  return best;
}

// A row whose items wrap onto more lines (the Filters sheet's genres): up/down go to the nearest item on the line
// above or below before leaving the row.
function otherLine(items, cur, dir) {
  const a = rectOf(cur);
  let best = null, bl = Infinity, bx = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const b = rectOf(el);
    const line = dir === 'down' ? b.top - a.bottom : a.top - b.bottom;
    if (line < -2) continue;   // same line, or the wrong way
    const dx = Math.abs(cx(b) - cx(a));
    if (line < bl - 4 || (Math.abs(line - bl) <= 4 && dx < bx)) { bl = line; bx = dx; best = el; }
  }
  return best;
}
// Slides still running (a grid or rail moving into place) would be measured halfway: finish them first.
function settle() {
  if (!document.getAnimations || typeof CSSTransition === 'undefined') return;
  for (const an of document.getAnimations()) if (an instanceof CSSTransition && an.playState === 'running') an.finish();
}

// Returns true when focus moved.
export function move(dir, { repeat = false } = {}) {
  const root = topLayer();
  if (!root) return false;
  const cur = document.activeElement;
  if (!cur || !cur.classList?.contains('fx') || !root.contains(cur) || !visible(cur)) return focus(entryOf(root));
  const box = boxOf(cur);
  if (!box) return false;
  if (box.navHook) { const r = box.navHook(dir, cur, repeat); if (r === true || r === false) return r; }
  const items = itemsOf(box), i = items.indexOf(cur);
  let next = null, leave = false;
  if (box.hasAttribute('data-grid')) {
    const cols = +box.dataset.cols || 1, n = items.length;
    if (dir === 'left') next = i % cols > 0 ? items[i - 1] : null;
    else if (dir === 'right') next = i % cols < cols - 1 ? items[i + 1] || null : null;
    else if (dir === 'up') { if (i - cols >= 0) next = items[i - cols]; else leave = true; }
    else { if (i + cols < n) next = items[i + cols]; else if (Math.floor(i / cols) < Math.floor((n - 1) / cols)) next = items[n - 1]; else leave = true; }
    if (!next && !leave) { if (!box.hasAttribute('data-exit')) return false; leave = true; }   // sideways edges stop, unless the grid opts out (data-exit: something sits beside it)
  } else if (box.hasAttribute('data-col')) {
    if (dir === 'up' || dir === 'down') { next = items[i + (dir === 'down' ? 1 : -1)] || null; if (!next) leave = true; }
    else leave = true;
  } else {
    if (dir === 'left' || dir === 'right') { next = items[i + (dir === 'right' ? 1 : -1)] || null; if (!next) { if (!box.hasAttribute('data-exit')) return false; leave = true; } }
    else { next = box.dataset.row === 'topbar' ? null : otherLine(items, cur, dir); if (!next) leave = true; }
  }
  if (next) return focus(next, { repeat });
  // Leaving the container. The top bar is special: down from it returns to the screen, up into it only from the screen's top.
  if (box.dataset.row === 'topbar') {
    if (dir !== 'down' || repeat) return false;
    const scr = root.querySelector('[data-screen]:not([hidden])');
    return focus(entryOf(scr));
  }
  settle();
  // Inside a scrolling list (a sheet's body), the next section of that list wins over what's fixed around it (the
  // footer button): it may be scrolled out of view, and focusing it scrolls it in.
  const list = box.closest('.sheet-body .inner');
  const to = (list && (dir === 'up' || dir === 'down') && neighbour(box, cur, dir, list)) || neighbour(box, cur, dir, root);
  if (!to) return false;
  if (to.dataset.row === 'topbar' && repeat) return false;
  if (to.dataset.row === 'topbar') return focus(pickIn(to, cur, dir));
  return focus(pickIn(to, cur, dir), { repeat });
}
