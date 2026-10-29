// Screens: the tabs in the top bar, plus pages pushed on top of them (detail, game). Back pops a page and restores the
// card that opened it; in a tab's content it scrolls to the top and focuses the tab; on a tab it goes Home; Home exits.
import { $, ic, brandImg, esc, focusPath, findPath } from './util.js';
import { focus, entryOf, inLayer } from './focus.js';

const screens = new Map();   // name -> { def, el, mounted }
export const TABS = [['search', 'Search'], ['home', 'Home'], ['live', 'Live'], ['nba', 'NBA'], ['movie', 'Movies'], ['series', 'Series'], ['saved', 'Saved']];
export const nav = { tab: null, stack: [] };   // stack: [{ name, params, opener }]

export function register(def) { screens.set(def.name, { def, el: null }); }
const mountOf = (name) => {
  const s = screens.get(name);
  if (!s.el) {
    s.el = document.createElement('section');
    s.el.dataset.screen = name;
    s.el.hidden = true;
    s.el._entry = () => s.def.entry?.(s.el);
    $('#screens').appendChild(s.el);
    s.def.mount?.(s.el);
  }
  return s;
};
export const current = () => (nav.stack.length ? nav.stack[nav.stack.length - 1].name : nav.tab);
export const screenEl = (name = current()) => screens.get(name)?.el || null;
export const screenDef = (name = current()) => screens.get(name)?.def || null;

function show(name, params, { focusIn = true, fresh = true } = {}) {
  for (const [n, s] of screens) if (s.el && n !== name && !s.el.hidden) { s.el.hidden = true; s.def.leave?.(s.el); }
  const s = mountOf(name);
  const was = s.el.hidden;
  s.el.hidden = false;
  if (was) { s.el.classList.remove('screen-in'); void s.el.offsetWidth; s.el.classList.add('screen-in'); }
  topbar.style.display = s.def.bar === false ? 'none' : '';
  s.def.enter?.(s.el, params || {}, { fresh });
  if (focusIn) requestAnimationFrame(() => { if (!inLayer()) focus(s.def.entry?.(s.el) || entryOf(s.el)); });
}

// Switch tab (clears pushed pages).
export function go(name, params, opts = {}) {
  const prevTab = nav.tab;
  nav.stack = [];
  nav.tab = name;
  drawBar();
  show(name, params, { focusIn: opts.focusIn !== false, fresh: prevTab !== name || !!params });
}
// Push a page (detail, game). Back returns to the opener.
export function push(name, params) {
  const a = document.activeElement, from = a?.closest?.('[data-screen]');
  // the opener, and how to find it again if its screen has been redrawn meanwhile (Home updates on game nights)
  nav.stack.push({ name, params, opener: a, openerPath: from ? focusPath(a, from) : null });
  drawBar();
  show(name, params);
}
export function pop() {
  const top = nav.stack.pop();
  if (!top) return false;
  drawBar();
  const name = current();
  show(name, nav.stack.length ? nav.stack[nav.stack.length - 1].params : null, { focusIn: false, fresh: false });
  requestAnimationFrame(() => focus(top.opener?.isConnected ? top.opener : findPath(screenEl(name), top.openerPath) || entryOf(screenEl(name))));
  return true;
}
export function refresh(name = current()) { const s = screens.get(name); if (s?.el && !s.el.hidden) s.def.enter?.(s.el, {}, { fresh: false }); }

// ---------- top bar ----------
const topbar = $('#topbar');
let barState = { live: false, update: false, avatar: '', offline: false };
export function setBar(patch) { barState = { ...barState, ...patch }; drawBar(); }
export function drawBar() {
  const sel = nav.stack.length ? null : nav.tab;
  const t = (k, l) => `<button class="tab fx${k === 'search' ? ' srch' : ''}${k === (sel || nav.tab) ? ' sel' : ''}" tabindex="-1" data-tab="${k}">${k === 'search' ? ic('search') : ''}${l}${k === 'nba' && barState.live ? '<span class="a-live compact">Live</span>' : ''}</button>`;
  const html = `${brandImg('mark-small.svg', 'mk')}<div class="tabs">${TABS.map(([k, l]) => t(k, l)).join('')}</div>
    <div class="tb-r">${barState.offline ? `<span class="offline-bar" id="offline">${ic('wifiOff', 'sm')}<b>Offline</b></span>` : ''}<button class="avatar fx${nav.tab === 'account' ? ' sel' : ''}" tabindex="-1" data-tab="account" style="box-sizing:content-box">${barState.avatar ? esc(barState.avatar) : '<svg class="ic" viewBox="0 0 24 24" style="width:20px;height:20px;margin-top:8px" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/></svg>'}${barState.update ? '<i class="udot"></i>' : ''}</button></div>`;
  if (topbar._html !== html) {
    const had = topbar.contains(document.activeElement) ? document.activeElement.dataset.tab : null;
    topbar.innerHTML = html; topbar._html = html;
    if (had) topbar.querySelector(`[data-tab="${had}"]`)?.focus({ preventScroll: true });
  }
  topbar.hidden = false;
}
export const barHidden = (on) => topbar.classList.toggle('away', on);
// Screens focus their content when they're ready, but never pull focus out of the top bar (a tab switched by dwell
// keeps the remote on the bar) or out of an open sheet.
export const mayFocus = () => !topbar.contains(document.activeElement) && !inLayer();
export const focusTab = () => focus(topbar.querySelector(`[data-tab="${nav.tab}"]`) || topbar.querySelector('.tab.sel'));

// Moving along the bar switches tab after a short dwell; OK switches at once and goes into the content.
let dwellT;
topbar.addEventListener('tvfocus', (e) => {
  const k = e.target.dataset.tab;
  clearTimeout(dwellT);
  if (!k || k === nav.tab) return;
  dwellT = setTimeout(() => { if (document.activeElement === e.target) go(k, null, { focusIn: false }); }, 250);
});
topbar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  clearTimeout(dwellT);
  if (b.dataset.tab !== nav.tab || nav.stack.length) go(b.dataset.tab);
  else focus(entryOf(screenEl(nav.tab)));
});
