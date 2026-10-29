// The phone's own frame (SPEC 2): the tab bar, the screens and the pushed pages with Back, bottom sheets, the long-press
// menu, the confirm, the shared icons. The TV's ui.js / router.js / focus.js are D-pad code and aren't used here.
import { esc, ic as tvIc } from '../tv/js/util.js';

const IC = {
  home: '<path d="M3.5 11 12 4l8.5 7v8.5a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" fill="currentColor" stroke="none"/>',
  liveTab: '<rect x="2.5" y="5" width="19" height="13" rx="2.5" fill="currentColor" stroke="none"/><path d="M8 21h8" /><path d="M10.2 9v5l4.2-2.5z" fill="var(--a-bg-1)" stroke="none"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.6 5.6c3 2.6 3 10.2 0 12.8M18.4 5.6c-3 2.6-3 10.2 0 12.8"/>',
  lib: '<path d="M4 4.5h3v15H4zM9 4.5h3v15H9z" fill="currentColor" stroke="none"/><path d="m14.2 5.4 2.9-.8 3.9 14.5-2.9.8z" fill="currentColor" stroke="none"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.6-4.6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>', chevD: '<path d="M6 9l6 6 6-6"/>', chevL: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  more: '<circle cx="5" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="2" fill="currentColor" stroke="none"/>',
  play: '<path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/>',
  rew: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>', fwd: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4h-4"/>',
  airplay: '<path d="M6 17H4.5a1.5 1.5 0 0 1-1.5-1.5v-10A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v10a1.5 1.5 0 0 1-1.5 1.5H18"/><path d="m12 15 5 6H7z" fill="currentColor" stroke="none"/>',
  pip: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><rect x="11.5" y="11" width="7.5" height="6" rx="1" fill="currentColor" stroke="none"/>',
  cc: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M10 10.2a2.4 2.4 0 1 0 0 3.6M17 10.2a2.4 2.4 0 1 0 0 3.6"/>',
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
  data: '<path d="M5 20V14M10 20V10M15 20V6M20 20V3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.4L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.4L20 16M20 20v-4h-4"/>',
  out: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M19 12H9"/>',
  tv: '<rect x="2.5" y="4.5" width="19" height="13" rx="2"/><path d="M8 21h8"/>',
};
export const ic = (n, cls = '') => (IC[n] ? `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>` : tvIc(n, cls));
export { esc };

// ---------- screens and pages ----------
// def: { name, tab (a tab root), mount(el), enter(el, params, { fresh }), leave(el), title }
const defs = new Map();
const els = new Map();
export const nav = { tab: null, stack: [] };   // stack: [{ name, params }]
const listeners = new Set();
export const onNav = (f) => listeners.add(f);
export function register(def) { defs.set(def.name, def); }
function elOf(name) {
  if (!els.has(name)) {
    const el = document.createElement('section');
    el.dataset.screen = name;
    el.hidden = true;
    document.getElementById('ph-screens').appendChild(el);
    els.set(name, el);
    defs.get(name).mount?.(el);
  }
  return els.get(name);
}
export const current = () => (nav.stack.length ? nav.stack[nav.stack.length - 1].name : nav.tab);
export const screenEl = (n = current()) => els.get(n) || null;
export const isShown = (n) => { const e = els.get(n); return !!e && !e.hidden; };
function show(name, params, fresh) {
  for (const [n, e] of els) if (n !== name && !e.hidden) { e.hidden = true; defs.get(n).leave?.(e); }
  const def = defs.get(name), el = elOf(name);
  el.hidden = false;
  el.classList.toggle('pushed', !def.tab);
  el.classList.toggle('notabs', def.tabs === false);
  def.enter?.(el, params || {}, { fresh });
  for (const f of listeners) f(name);
}
export function go(name, params) {
  const same = nav.tab === name && !nav.stack.length;
  nav.stack = [];
  nav.tab = name;
  if (same && !params && els.get(name) && !els.get(name).hidden) { const el = els.get(name); el?.scrollTo({ top: 0, behavior: 'smooth' }); defs.get(name).toTop?.(el); return; }   // tapping the selected tab: back to its root's top
  show(name, params, true);
}
export function push(name, params) {
  const top = nav.stack[nav.stack.length - 1];
  if (top && top.name === name && JSON.stringify(top.params) === JSON.stringify(params)) return;
  if (top?.name === name) { const el = els.get(name); top.scroll = el?.scrollTop; }
  nav.stack.push({ name, params });
  const el = elOf(name);
  el.scrollTop = 0;
  show(name, params, true);
}
export function back() {
  if (closeTopSheet()) return true;
  if (!nav.stack.length) return false;
  nav.stack.pop();
  const top = nav.stack[nav.stack.length - 1];
  show(current(), top?.params || null, false);
  return true;
}
export const refresh = (name = current()) => { if (isShown(name)) defs.get(name).enter?.(els.get(name), nav.stack.find((x) => x.name === name)?.params || {}, { fresh: false }); };
// a left-edge swipe goes back on a pushed page (iOS's habit; not in the player)
let edge = null;
document.addEventListener('touchstart', (e) => { const t = e.touches[0]; edge = nav.stack.length && t.clientX < 22 && document.getElementById('ph-player').hidden && !sheets.length ?{ x: t.clientX, y: t.clientY } : null; }, { passive: true });
document.addEventListener('touchend', (e) => { if (!edge) return; const t = e.changedTouches[0]; if (t.clientX - edge.x > 70 && Math.abs(t.clientY - edge.y) < 60) back(); edge = null; }, { passive: true });

// ---------- sheets (ui.js openOverlay, drawn as bottom sheets: medium and full) ----------
const sheets = [];
export function sheet(html, { full = false, onClick, onClose, cls = '' } = {}) {
  const ov = document.createElement('div');
  ov.className = 'sh-ov';
  ov.innerHTML = `<div class="scrim"></div><div class="sheet${full ? ' full' : ''} ${cls}"><div class="grab"></div>${html}</div>`;
  document.getElementById('ph-sheets').appendChild(ov);
  const entry = { ov, onClose };
  sheets.push(entry);
  requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('in')));
  const close = () => closeSheet(entry);
  ov.querySelector('.scrim').addEventListener('click', close);
  ov.addEventListener('click', (e) => { const t = e.target.closest('[data-act]'); if (t && onClick) onClick(t.dataset.act, t, close, e); });
  // a drag down on the grab or the title closes it
  const sh = ov.querySelector('.sheet');
  let y0 = null;
  sh.addEventListener('touchstart', (e) => { const body = sh.querySelector('.body'); y0 = !body || body.scrollTop <= 0 || !body.contains(e.target) ? e.touches[0].clientY : null; }, { passive: true });
  sh.addEventListener('touchmove', (e) => { if (y0 == null) return; const d = e.touches[0].clientY - y0; if (d > 0) sh.style.transform = `translateY(${d}px)`; }, { passive: true });
  sh.addEventListener('touchend', (e) => { if (y0 == null) return; const d = e.changedTouches[0].clientY - y0; sh.style.transform = ''; if (d > 90) close(); y0 = null; });
  return { el: ov, close };
}
function closeSheet(entry) {
  const i = sheets.indexOf(entry);
  if (i < 0) return;
  sheets.splice(i, 1);
  entry.ov.classList.remove('in');
  setTimeout(() => entry.ov.remove(), 260);
  entry.onClose?.();
}
export function closeTopSheet() { const e = sheets[sheets.length - 1]; if (!e) return false; closeSheet(e); return true; }
export const sheetOpen = () => sheets.length > 0;
// rows: [{ label, sub, icon, lead (markup), run, dis }]
export function menu(title, rows, { sub = '' } = {}) {
  const list = rows.filter(Boolean);
  return sheet(`${title ? `<h3>${esc(title)}</h3>` : ''}${sub ? `<div class="sub">${esc(sub)}</div>` : ''}<div class="body">${list.map((r, i) => `<button class="lr${r.dis ? ' dis' : ''}" data-act="${i}">${r.lead || (r.icon ? ic(r.icon) : '')}<span class="col">${esc(r.label)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span></button>`).join('')}</div>`, {
    onClick: (act, t, close) => { const r = list[+act]; if (!r || r.dis) return; close(); r.run?.(); },
  });
}
// a radio list: rows [{ v, l, sub }]
export function radio(title, rows, value, onPick, { full = rows.length > 8, sub = '' } = {}) {
  return sheet(`<h3>${esc(title)}</h3>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}<div class="body">${rows.map((r) => `<button class="lr" data-act="pick" data-v="${esc(r.v)}"><span class="rd${String(r.v) === String(value) ? ' on' : ''}"></span><span class="col">${esc(r.l)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span></button>`).join('')}</div>`, {
    full, onClick: (act, t, close) => { if (act === 'pick') { close(); onPick(t.dataset.v); } },
  });
}
export function confirm({ title, text, yes, no = 'Cancel', onYes }) {
  return sheet(`<h3>${esc(title)}</h3>${text ? `<p class="tx">${esc(text)}</p>` : ''}<div class="act2"><button class="ghost" data-act="no">${esc(no)}</button><button class="pill noicon" data-act="yes">${esc(yes)}</button></div>`, {
    onClick: (act, t, close) => { close(); if (act === 'yes') onYes(); },
  });
}
// long-press (500 ms with a light haptic) on anything matching sel inside root: fn(el); a tap still clicks
export function longPress(root, sel, fn) {
  let t = 0, start = null, fired = false;
  root.addEventListener('touchstart', (e) => {
    const el = e.target.closest(sel);
    if (!el) return;
    fired = false; start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    t = setTimeout(() => { fired = true; haptic(); fn(el); }, 500);
  }, { passive: true });
  root.addEventListener('touchmove', (e) => { if (start && (Math.abs(e.touches[0].clientX - start.x) > 8 || Math.abs(e.touches[0].clientY - start.y) > 8)) clearTimeout(t); }, { passive: true });
  root.addEventListener('touchend', () => clearTimeout(t), { passive: true });
  root.addEventListener('click', (e) => { if (fired && e.target.closest(sel)) { e.stopPropagation(); e.preventDefault(); fired = false; } }, true);
  root.addEventListener('contextmenu', (e) => { const el = e.target.closest(sel); if (el) { e.preventDefault(); fn(el); } });
}
export function haptic() { try { window.Capacitor?.Plugins?.Haptics?.impact?.({ style: 'LIGHT' }); } catch { /* none */ } }
// facts as spans: the separator belongs to the next one, so a wrapped line never ends on "·"
export const facts = (list) => list.filter(Boolean).map((x) => (typeof x === 'string' ? `<span>${esc(x)}</span>` : `<span class="${x.cls || ''}">${x.html}</span>`)).join('');
export const crestImg = (t, size = 26) => `<span class="crest" style="width:${size}px;height:${size}px"><img src="${esc(t?.logo || window.NBA?.logoFor?.(t?.abbr) || '')}" alt="" onerror="this.style.opacity=0"></span>`;
export const tileOf = (ch) => `<span class="tile">${ch?.logo ? `<img src="${esc(ch.logo)}" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode('${esc(initialsOf(ch.name)).replace(/'/g, '')}'))">` : esc(initialsOf(ch?.name))}</span>`;
export const initialsOf = (n) => String(n || '').replace(/^[A-Z]{2,4}\s*[:|]\s*/, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase().slice(0, 3);
// the avatar (34 pt gradient disc, 44 pt target): the account's first letter, else the person icon
export const avatar = () => { const n = (window.__phAcc?.() || '').match(/\p{L}/u)?.[0]?.toUpperCase(); return `<button class="avatar" data-act="account" aria-label="Account"><i>${n ? esc(n) : ic('user')}</i></button>`; };
