// The Windows app's frame (SPEC 2, 3): the pages with a history (Back / Forward, Alt ← →), sheets at the right, menus
// at the pointer (the TV's hold-OK menu is the right-click), dialogs, the shared icons and small markup helpers. It
// keeps the phone's ui.js API so the views ported from the iPhone (app/phone/*) read the same here. Everything that
// floats is drawn in the floating layer (float.js), so it works over a picture too.
import { esc, ic as tvIc } from '../tv/js/util.js';
import { floatRoot } from './float.js';

const IC = {
  home: '<path d="M3.5 11 12 4l8.5 7v8.5a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>',
  liveTab: '<rect x="2.5" y="5" width="19" height="13" rx="2.5"/><path d="M8 21h8"/><path d="M10.2 9v5l4.2-2.5z" fill="currentColor"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.6 5.6c3 2.6 3 10.2 0 12.8M18.4 5.6c-3 2.6-3 10.2 0 12.8"/>',
  movies: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/>',
  series: '<rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="m8 2.5 4 3.5 4-3.5"/>',
  saved: '<path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1z"/>',
  lib: '<path d="M4 4.5h3v15H4zM9 4.5h3v15H9z"/><path d="m14.2 5.4 2.9-.8 3.9 14.5-2.9.8z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.6-4.6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>', fwdNav: '<path d="M9 5l7 7-7 7"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>', chevD: '<path d="M6 9l6 6 6-6"/>', chevL: '<path d="M15 5l-7 7 7 7"/>', chevU: '<path d="M6 15l6-6 6 6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  more: '<circle cx="5" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.8" fill="currentColor" stroke="none"/>',
  play: '<path d="M6.5 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/>',
  rew: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>', fwd: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4h-4"/>',
  prev: '<path d="M6 5v14M18 5 9 12l9 7z" fill="currentColor"/>', next: '<path d="M18 5v14M6 5l9 7-9 7z" fill="currentColor"/>',
  pip: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><rect x="11.5" y="11" width="7.5" height="6" rx="1" fill="currentColor" stroke="none"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', unfull: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  cc: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M10 10.2a2.4 2.4 0 1 0 0 3.6M17 10.2a2.4 2.4 0 1 0 0 3.6"/>',
  vol: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  grid: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', grip: '<circle cx="9" cy="6" r="1.3" fill="currentColor"/><circle cx="15" cy="6" r="1.3" fill="currentColor"/><circle cx="9" cy="12" r="1.3" fill="currentColor"/><circle cx="15" cy="12" r="1.3" fill="currentColor"/><circle cx="9" cy="18" r="1.3" fill="currentColor"/><circle cx="15" cy="18" r="1.3" fill="currentColor"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  tipoff: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="3"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="currentColor" stroke="none"/>',
  starO: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/>',
  key: '<circle cx="8" cy="14" r="4"/><path d="m11 11 9-9M17 5l2 2M15 7l2 2"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z"/>',
  tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  bang: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.4v.1"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.4L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.4L20 16M20 20v-4h-4"/>',
  out: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M19 12H9"/>',
  tv: '<rect x="2.5" y="4.5" width="19" height="13" rx="2"/><path d="M8 21h8"/>',
  win: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8.5h18"/>',
  kbd: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  pin: '<path d="M9 3.5h6l-1 6 3.5 3.5h-11L10 9.5zM12 13v7.5"/>',
  drag: '<path d="M5 9h14M5 15h14"/>',
  eye: '<path d="M2.5 12C3.5 9.2 7 5 12 5s8.5 4.2 9.5 7c-1 2.8-4.5 7-9.5 7s-8.5-4.2-9.5-7z"/><circle cx="12" cy="12" r="3"/>',
};
export const ic = (n, cls = '') => (IC[n] ? `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>` : tvIc(n, cls));
export { esc };

// ---------- pages, with a history ----------
// def: { name, tab (a sidebar section's root), mount(el), enter(el, params, { fresh }), leave(el), title }
const defs = new Map();
const els = new Map();
export const nav = { tab: null, stack: [], fwd: [] };   // stack: [{ name, params }] on top of the tab's root
const listeners = new Set();
export const onNav = (f) => listeners.add(f);
export function register(def) { defs.set(def.name, def); }
export const defOf = (n) => defs.get(n);
function elOf(name) {
  if (!els.has(name)) {
    const el = document.createElement('section');
    el.dataset.screen = name;
    el.className = `pg pg-${name}`;
    el.hidden = true;
    document.getElementById('dk-pages').appendChild(el);
    els.set(name, el);
    defs.get(name).mount?.(el);
  }
  return els.get(name);
}
export const current = () => (nav.stack.length ? nav.stack[nav.stack.length - 1].name : nav.tab);
export const currentParams = () => (nav.stack.length ? nav.stack[nav.stack.length - 1].params : nav.tabParams) || {};
export const screenEl = (n = current()) => els.get(n) || null;
export const isShown = (n) => { const e = els.get(n); return !!e && !e.hidden; };
function show(name, params, fresh) {
  for (const [n, e] of els) if (n !== name && !e.hidden) { e.hidden = true; defs.get(n).leave?.(e); }
  const def = defs.get(name), el = elOf(name);
  el.hidden = false;
  document.body.dataset.screen = name;
  def.enter?.(el, params || {}, { fresh });
  for (const f of listeners) f(name);
}
const snap = () => ({ tab: nav.tab, tabParams: nav.tabParams, stack: nav.stack.map((x) => ({ ...x })) });
const hist = [];   // back history of whole states (Alt ←), so Back from a section switch returns too
export function go(name, params) {
  closeAllFloats();
  if (!defs.has(name)) return;
  const same = nav.tab === name && !nav.stack.length;
  if (same && !params) { const el = els.get(name); el?.scrollTo({ top: 0, behavior: 'smooth' }); defs.get(name).toTop?.(el); return; }
  if (nav.tab) { hist.push(snap()); nav.fwd = []; }
  nav.stack = []; nav.tab = name; nav.tabParams = params || null;
  show(name, params, true);
}
export function push(name, params) {
  closeAllFloats();
  if (!defs.has(name)) return;
  const top = nav.stack[nav.stack.length - 1];
  if (top && top.name === name && JSON.stringify(top.params) === JSON.stringify(params)) return;
  const cur = els.get(current());
  if (cur) { if (top) top.scroll = cur.scrollTop; else nav.tabScroll = cur.scrollTop; }
  hist.push(snap()); nav.fwd = [];
  nav.stack.push({ name, params });
  const el = elOf(name);
  el.scrollTop = 0;
  show(name, params, true);
}
function restore(s, fresh = false) {
  nav.tab = s.tab; nav.tabParams = s.tabParams; nav.stack = s.stack;
  const top = nav.stack[nav.stack.length - 1];
  show(current(), top?.params || nav.tabParams || null, fresh);
  const el = els.get(current()), y = top ? top.scroll : nav.tabScroll;
  if (el && y != null) el.scrollTop = y;
}
// Back: the top float first (a menu, a sheet, the palette), then the page history
export function back() {
  if (closeTopFloat()) return true;
  const s = hist.pop();
  if (!s) return false;
  nav.fwd.push(snap());
  restore(s);
  return true;
}
export function forward() {
  const s = nav.fwd.pop();
  if (!s) return false;
  hist.push(snap());
  restore(s);
  return true;
}
export const canBack = () => hist.length > 0;
export const canForward = () => nav.fwd.length > 0;
export const refresh = (name = current()) => { if (isShown(name)) defs.get(name).enter?.(els.get(name), currentParams(), { fresh: false }); };

// ---------- floats: sheets, menus, dialogs ----------
const floats = [];   // { ov, onClose, kind }
let lastPointer = { x: 0, y: 0, t: 0 };
document.addEventListener('contextmenu', (e) => { lastPointer = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
document.addEventListener('mousedown', (e) => { lastPointer = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
const fresh = () => Date.now() - lastPointer.t < 1200;
function mountFloat(html, cls, { onClick, onClose, kind = 'sheet', scrim = true, focusSel } = {}) {
  const ov = document.createElement('div');
  ov.className = `fl ${cls}`;
  ov.innerHTML = `${scrim ? '<div class="scrim"></div>' : ''}${html}`;
  floatRoot('main').appendChild(ov);
  const entry = { ov, onClose, kind, opener: document.activeElement };
  floats.push(entry);
  requestAnimationFrame(() => ov.classList.add('in'));
  const close = () => closeFloat(entry);
  ov.querySelector('.scrim')?.addEventListener('mousedown', close);
  ov.addEventListener('click', (e) => { const t = e.target.closest('[data-act]'); if (t && onClick) onClick(t.dataset.act, t, close, e); });
  ov.addEventListener('contextmenu', (e) => e.preventDefault());
  // the keyboard: the first thing in it, unless the pointer opened it
  const first = ov.querySelector(focusSel || '.lr:not(.dis):not(.info), [data-act], input');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 0);
  return { el: ov, close, entry };
}
function closeFloat(entry) {
  const i = floats.indexOf(entry);
  if (i < 0) return;
  floats.splice(i, 1);
  entry.ov.classList.remove('in');
  entry.ov.remove();
  entry.onClose?.();
  try { if (entry.opener?.isConnected) entry.opener.focus({ preventScroll: true }); } catch { /* gone */ }
}
export function closeTopFloat() { const e = floats[floats.length - 1]; if (!e) return false; closeFloat(e); return true; }
export function closeAllFloats() { while (floats.length) closeFloat(floats[floats.length - 1]); }
export const floatOpen = () => floats.length > 0;
export const sheetOpen = floatOpen;
export const closeTopSheet = closeTopFloat;
// a sheet: at the right, 440 px (full: 560), the scrim behind it
export function sheet(html, { full = false, onClick, onClose, cls = '', center = false } = {}) {
  return mountFloat(`<div class="sheet${full ? ' full' : ''}${center ? ' center' : ''} ${cls}">${html}</div>`, center ? 'dlg' : 'rs', { onClick, onClose });
}
// rows: [{ label, sub, icon, lead (markup), run, dis, info, key }]: at the pointer when the pointer opened it (a
// right-click, a ⋯ button), else as a small dialog
export function menu(title, rows, { sub = '', at = null } = {}) {
  const list = rows.filter(Boolean);
  const body = list.map((r, i) => (r.sep ? '<hr>' : `<button class="lr${r.dis ? ' dis' : ''}${r.info ? ' info' : ''}" data-act="${i}">${r.lead || (r.icon ? ic(r.icon) : '<span class="ic-sp"></span>')}<span class="col">${esc(r.label)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span>${r.key ? `<span class="k">${esc(r.key)}</span>` : ''}</button>`)).join('');
  const pt = at || (fresh() ? lastPointer : null);
  const head = title ? `<div class="mh">${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>` : '';
  const m = mountFloat(`<div class="menu">${head}<div class="body">${body}</div></div>`, pt ? 'cm' : 'dlg', {
    scrim: true, kind: 'menu',
    onClick: (act, t, close) => { const r = list[+act]; if (!r || r.dis || r.info) return; close(); r.run?.(); },
  });
  const box = m.el.querySelector('.menu');
  if (pt) {
    // placed at the pointer, kept inside the window
    const w = box.offsetWidth, h = box.offsetHeight;
    box.style.left = `${Math.max(8, Math.min(pt.x, innerWidth - w - 8))}px`;
    box.style.top = `${Math.max(48, Math.min(pt.y, innerHeight - h - 8))}px`;
  }
  return m;
}
// a radio list: rows [{ v, l, sub }]
export function radio(title, rows, value, onPick, { sub = '' } = {}) {
  return menu(title, rows.map((r) => ({ label: r.l, sub: r.sub, icon: String(r.v) === String(value) ? 'tick' : '', run: () => onPick(r.v) })), { sub });
}
export function confirm({ title, text, yes, no = 'Cancel', onYes }) {
  return sheet(`<h3>${esc(title)}</h3>${text ? `<p class="tx">${esc(text)}</p>` : ''}<div class="act2"><button class="ghost" data-act="no">${esc(no)}</button><button class="pill noicon" data-act="yes">${esc(yes)}</button></div>`, {
    center: true, onClick: (act, t, close) => { close(); if (act === 'yes') onYes(); },
  });
}
// the TV's hold-OK menu: right-click (and Shift F10 / the menu key from the keyboard, main.js) on anything matching sel
export function longPress(root, sel, fn) {
  root.addEventListener('contextmenu', (e) => { const el = e.target.closest(sel); if (el && root.contains(el)) { e.preventDefault(); e.stopPropagation(); fn(el); } });
}
export function haptic() { /* (no haptics on a PC) */ }
export const facts = (list) => list.filter(Boolean).map((x) => (typeof x === 'string' ? `<span>${esc(x)}</span>` : `<span class="${x.cls || ''}">${x.html}</span>`)).join('');
export const crestImg = (t, size = 26) => `<span class="crest" style="width:${size}px;height:${size}px"><img src="${esc(t?.logo || window.NBA?.logoFor?.(t?.abbr) || '')}" alt="" onerror="this.style.opacity=0"></span>`;
export const tileOf = (ch) => `<span class="tile">${ch?.logo ? `<img src="${esc(ch.logo)}" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode('${esc(initialsOf(ch.name)).replace(/'/g, '')}'))">` : esc(initialsOf(ch?.name))}</span>`;
export const initialsOf = (n) => String(n || '').replace(/^[A-Z]{2,4}\s*[:|]\s*/, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase().slice(0, 3);
export const avatar = () => { const n = (window.__dkAcc?.() || '').match(/\p{L}/u)?.[0]?.toUpperCase(); return `<button class="avatar" data-act="account" aria-label="Account" data-tip="Account · Ctrl ,">${n ? esc(n) : ic('user')}</button>`; };
export { cleanCh, cleanGroup } from '../tv/js/names.js';
// a key cap
export const kc = (k) => `<span class="k">${esc(k)}</span>`;
