// Overlays shared by every screen: toasts, sheets and menus. A sheet takes the focus while it is open and gives it back
// to whatever opened it when it closes (Back closes it).
import { $, esc, ic, focusPath, findPath } from './util.js';
import { pushLayer, popLayer, focus, entryOf } from './focus.js';
import { sfx } from './sfx.js';

let toastT;
// Toasts never take focus and never bind a key.
export function toast(msg, ms = 2800) {
  const t = $('#toast');
  if (!t) return;
  t.innerHTML = `<span class="toast">${esc(msg)}</span>`;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.hidden = true), ms);
}

const stack = [];   // open overlays: { el, opener, onClose }
export const overlayOpen = () => stack.length > 0;
// html: the overlay markup (a .sheet, .menu or .ctxmenu); actions: { 'data-act value': fn }.
export function openOverlay(html, { onClick, onClose, focusSel, scrim = true, onKey } = {}) {
  const host = $('#overlays');
  const el = document.createElement('div');
  el.className = 'ov';
  el.innerHTML = (scrim ? '<div class="scrim"></div>' : '') + html;
  host.appendChild(el);
  // the control that opened it, and how to find it again if the screen redraws while the sheet is up
  const opener = document.activeElement, scr = opener?.closest?.('[data-screen]');
  const entry = { el, opener, scr, key: scr ? focusPath(opener, scr) : null, onClose, onKey };
  stack.push(entry);
  sfx.request('open');   // only when a key opened it
  el.addEventListener('click', (e) => { const t = e.target.closest('[data-act]'); if (t && onClick) onClick(t.dataset.act, t, e); });
  requestAnimationFrame(() => el.classList.add('in'));
  pushLayer(el, (focusSel && el.querySelector(focusSel)) || null);
  return {
    el,
    close: (restore = true) => closeOverlay(entry, restore),
  };
}
function closeOverlay(entry, restore = true) {
  const i = stack.indexOf(entry);
  if (i < 0) return;
  stack.splice(i, 1);
  entry.el.remove();
  const back = !restore ? null : entry.opener?.isConnected ? entry.opener : entry.scr ? findPath(entry.scr, entry.key) || entryOf(entry.scr) : null;
  popLayer(entry.el, back);
  entry.onClose?.();
}
// Back closes the topmost overlay. Returns true if one was closed.
// Back closing a sheet (a pick that closes a menu is an OK, and sounds like one).
export function closeTop() { const e = stack[stack.length - 1]; if (!e) return false; sfx.request('close'); closeOverlay(e); return true; }
export function overlayKey(k, e) { const top = stack[stack.length - 1]; return !!top?.onKey?.(k, e); }

// A menu of radio rows (Sort, version, groups...): rows = [{ v, l, sub, on, dis }]
// (more rows than fit above the screen's safe edge scroll inside the menu)
export function radioMenu({ title, rows, value, onPick, extra = '', style = 'right:48px;top:120px;width:352px', cls = 'menu' }) {
  const list = rows.map((r) => `<div class="lr fx${r.dis ? ' dis' : ''}" tabindex="-1" data-act="pick" data-v="${esc(r.v)}"><span class="rd${r.v === value ? ' on' : ''}"></span><span class="grow ellipsis">${esc(r.l)}</span>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div>`).join('');
  const long = rows.length > 6;
  const html = `<div class="${cls}" style="${style}"><h3>${esc(title)}</h3>${long ? `<div class="sheet-body" style="max-height:300px"><div class="inner" data-col>${list}</div></div>` : `<div data-col>${list}</div>`}${extra}</div>`;
  const ov = openOverlay(html, {
    focusSel: `[data-v="${CSS.escape(String(value ?? ''))}"]`,
    onClick: (act, t) => { if (act === 'pick') { ov.close(); onPick(t.dataset.v); } },
  });
  if (long) scrollList(ov.el);
  return ov;
}

// Context menu for hold OK on a card: Save to Saved first and focused, so hold then OK saves.
export function contextMenu(anchor, rows) {
  const r = anchor.getBoundingClientRect();
  const x = Math.min(Math.max(48, r.left + 12), 912 - 236);
  const ov = openOverlay(`<div class="ctxmenu" style="left:${x}px;top:${Math.max(27, r.top + 24)}px" data-col>${rows.map((row, i) => `<div class="lr fx${row.dis ? ' dis' : ''}" tabindex="-1" data-act="${i}">${ic(row.icon || 'chevR', 'sm')}${esc(row.label)}</div>`).join('')}</div>`, {
    scrim: false,
    focusSel: rows.focus != null ? `[data-act="${rows.focus}"]` : null,
    onClick: (act) => { ov.close(); rows[+act]?.run(); },
  });
  // clamped by its measured height to the safe line (y 513); when that pushes it up over the card, it opens above it
  const m = ov.el.querySelector('.ctxmenu'), h = m.offsetHeight;
  let y = Math.min(Math.max(27, r.top + 24), 513 - h);
  if (y < r.top + 24 && r.top - 8 - h >= 27) y = r.top - 8 - h;
  m.style.top = `${y}px`;
  return ov;
}

export function confirmMenu({ title, text, yes, no = 'Cancel', onYes }) {
  const ov = openOverlay(`<div class="menu" style="left:50%;top:50%;transform:translate(-50%,-50%);width:420px"><h3>${esc(title)}</h3>${text ? `<p class="t-body" style="padding:0 8px 12px">${esc(text)}</p>` : ''}<div data-row class="row-flex" style="gap:12px;padding:4px 8px"><span class="btn2 fx" tabindex="-1" data-act="no">${esc(no)}</span><span class="btn fx" tabindex="-1" data-act="yes">${esc(yes)}</span></div></div>`, {
    focusSel: '[data-act="no"]',
    onClick: (act) => { ov.close(); if (act === 'yes') onYes(); },
  });
  return ov;
}
// Sheets with more rows than fit: the list slides so the focused row stays inside (with room for its ring).
// It's placed at once for the row the sheet opens on (focus() from opening a sheet fires no tvfocus), and the
// focused row keeps 14 px from either edge: its ring is 4-5 px outside it.
export function scrollList(root) {
  // (measured on screen: a row's offsetTop is relative to whatever positioned box holds it, not to the list)
  const place = (row) => {
    const body = row?.closest?.('.sheet-body'); if (!body) return;
    const inner = body.querySelector('.inner');
    const cur = -(parseFloat((inner.style.transform.match(/-?[\d.]+/) || [0])[0]) || 0);
    const b = body.getBoundingClientRect(), r = row.getBoundingClientRect(), pad = 8;   // (the body's padding)
    let t = cur;
    if (r.bottom > b.bottom - pad - 14) t = cur + r.bottom - (b.bottom - pad - 14);
    else if (r.top < b.top + pad + 14) t = Math.max(0, cur - (b.top + pad + 14 - r.top));
    inner.style.transform = `translateY(${-t}px)`;
    // more below (or above) than shows: the edge fades, so you know to keep going
    const ih = inner.scrollHeight, vh = body.clientHeight - 2 * pad;
    body.classList.toggle('more', ih - t > vh + 2);
    body.classList.toggle('less', t > 2);
  };
  root.addEventListener('tvfocus', (e) => place(e.target));
  if (root.contains(document.activeElement)) {
    const inner = document.activeElement.closest('.sheet-body')?.querySelector('.inner');
    if (inner) { inner.style.transition = 'none'; place(document.activeElement); inner.offsetHeight; inner.style.transition = ''; }
  }
}
export { focus };
