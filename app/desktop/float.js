// Everything that floats (SPEC 9, the airspace rule): the player's controls, sheets, menus, the palette, toasts,
// multiview's chrome, the mini player's chrome. They are built here in the main page, in a layer root per window
// (#floats for the main window, #floats-mini for the mini window). While no picture is on screen the root is simply
// the page's top layer. While a picture is (mpv's host window covers part of the page and nothing in the page can draw
// over it), the root turns invisible in place (same layout, still focusable, so a palette's field keeps the caret) and
// is mirrored to that window's overlay, which draws it over the picture and sends the pointer back: a click on a
// mirrored button is replayed on the same button here, so every handler works the same in both modes.
const T = window.tuner;
const ELECTRON = !!T?.overlay;
const roots = {};
const picHandlers = {};
const moveHandlers = new Set();

function rootOf(win) {
  if (roots[win]) return roots[win];
  const el = document.getElementById(win === 'main' ? 'floats' : `floats-${win}`) || (() => {
    const d = document.createElement('div');
    d.id = win === 'main' ? 'floats' : `floats-${win}`;
    d.className = 'floats';
    document.body.appendChild(d);
    return d;
  })();
  roots[win] = { win, el, mirrored: false, pictures: [], cursor: '', raf: 0, sent: '' };
  return roots[win];
}
export const floatRoot = (win = 'main') => rootOf(win).el;
export const mirrored = (win = 'main') => !!roots[win]?.mirrored;
// the mini window's root mirrors always (its page is the picture); its size is the mini window's
export function sizeRoot(win, w, h) { const r = rootOf(win); Object.assign(r.el.style, { width: `${w}px`, height: `${h}px` }); }

// mirror on while a picture is on screen in that window (Electron only; a browser draws in the page)
export function setMirror(win, on) {
  const r = rootOf(win);
  on = !!on && ELECTRON;
  if (r.mirrored === on) return;
  r.mirrored = on;
  r.el.classList.toggle('mirrored', on);
  if (on) {
    r.obs = new MutationObserver(() => schedule(r));
    r.obs.observe(r.el, { subtree: true, childList: true, attributes: true, characterData: true });
    r.el.addEventListener('scroll', r.onScroll = () => schedule(r), true);
    r.el.addEventListener('input', r.onScroll, true);
    document.addEventListener('focusin', r.onScroll);
    r.sent = '';
    schedule(r);
  } else {
    r.obs?.disconnect(); r.obs = null;
    r.el.removeEventListener('scroll', r.onScroll, true); r.el.removeEventListener('input', r.onScroll, true);
    document.removeEventListener('focusin', r.onScroll);
    T.overlay.layers(win, { html: '', pictures: [], cursor: '' });
  }
}
// the pictures' rects in that window (the overlay keeps the pointer over them: click, double-click, wheel, right-click)
export function setPictures(win, rects, onPointer) {
  const r = rootOf(win);
  r.pictures = (rects || []).map((x) => ({ id: x.id, x: Math.round(x.x), y: Math.round(x.y), w: Math.round(x.w), h: Math.round(x.h) }));
  if (onPointer) picHandlers[win] = onPointer;
  schedule(r);
}
export function setCursor(win, c) { const r = rootOf(win); if (r.cursor !== c) { r.cursor = c; schedule(r); } }
export const onPointerMove = (f) => { moveHandlers.add(f); return () => moveHandlers.delete(f); };

function schedule(r) {
  if (!r.mirrored || r.raf) return;
  r.raf = requestAnimationFrame(() => { r.raf = 0; push(r); });
}
// the root as markup, with what markup alone loses: field values, scroll positions, the keyboard's focus
function serialize(el) {
  const clone = el.cloneNode(true);
  const a = el.querySelectorAll('*'), b = clone.querySelectorAll('*');
  for (let i = 0; i < a.length; i++) {
    const o = a[i], c = b[i];
    if (o.scrollTop || o.scrollLeft) { c.setAttribute('data-st', `${o.scrollTop},${o.scrollLeft}`); }
    if (o.tagName === 'INPUT' || o.tagName === 'TEXTAREA') { c.setAttribute('value', o.value); if (o === document.activeElement) c.classList.add('is-caret'); }
    if (o === document.activeElement) c.classList.add('is-focus');
  }
  return clone.innerHTML;
}
// a page's own float styles (<style data-float-css>) go along, so a test page's layers look the same in the overlay
let cssCache = null;
const extraCss = () => (cssCache ??= [...document.querySelectorAll('style[data-float-css]')].map((x) => x.textContent).join('\n'));
function push(r) {
  const html = serialize(r.el);
  const payload = { html, pictures: r.pictures, cursor: r.cursor, cls: document.documentElement.className, style: r.win === 'main' ? '' : r.el.getAttribute('style') || '', css: extraCss() };
  const sig = JSON.stringify(payload);
  if (sig === r.sent) return;
  r.sent = sig;
  T.overlay.layers(r.win, payload);
}
// a resize changes the layout under the mirror
window.addEventListener('resize', () => { for (const r of Object.values(roots)) schedule(r); });
export const refreshMirror = (win = 'main') => { const r = roots[win]; if (r) { r.sent = ''; schedule(r); } };

// ---------- the pointer, back from an overlay ----------
const resolve = (root, path) => { let el = root; for (const i of path || []) { el = el?.children?.[i]; if (!el) return null; } return el; };
const scrollable = (el, root) => { for (let e = el; e && e !== root; e = e.parentElement) { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight) return e; } return null; };
let dragTarget = null;
if (ELECTRON) T.overlay.onInput((ev) => {
  const r = roots[ev.win];
  if (!r) return;
  const box = r.win === 'main' ? { left: 0, top: 0 } : r.el.getBoundingClientRect();
  const x = (ev.x || 0) + box.left, y = (ev.y || 0) + box.top;
  const init = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, screenX: x, screenY: y, button: ev.button || 0, buttons: ev.buttons || 0, shiftKey: !!ev.shift, ctrlKey: !!ev.ctrl, altKey: !!ev.alt, detail: ev.detail || 1 };
  if (ev.kind === 'move') { for (const f of moveHandlers) f(ev); return; }
  if (ev.kind === 'pic') { picHandlers[ev.win]?.({ ...ev, x, y }); return; }
  if (ev.kind === 'win') { window.dispatchEvent(new MouseEvent(ev.type, init)); if (ev.type === 'mouseup') dragTarget = null; return; }
  if (ev.kind !== 'el') return;
  const el = resolve(r.el, ev.path);
  if (!el) return;
  if (ev.type === 'wheel') {
    const s = scrollable(el, r.el);
    const we = new WheelEvent('wheel', { ...init, deltaY: ev.dy || 0, deltaX: ev.dx || 0 });
    if (el.dispatchEvent(we) && s) s.scrollBy({ top: ev.dy || 0, left: ev.dx || 0 });
    return;
  }
  if (ev.type === 'mousedown') { dragTarget = el; if (/^(INPUT|TEXTAREA)$/.test(el.tagName)) el.focus(); }
  if (ev.type === 'mouseover' || ev.type === 'mouseout') { el.dispatchEvent(new MouseEvent(ev.type, init)); return; }
  el.dispatchEvent(ev.type === 'click' || ev.type === 'dblclick' || ev.type === 'contextmenu' || ev.type === 'mousedown' || ev.type === 'mouseup' ? new MouseEvent(ev.type, init) : new Event(ev.type, { bubbles: true }));
  if (ev.type === 'click' && /^(INPUT|TEXTAREA)$/.test(el.tagName)) el.focus();
});
export const dragging = () => !!dragTarget;
