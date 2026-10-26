// Overlays shared by every screen: toasts, sheets and menus. A sheet takes the focus while it is open and gives it back
// to whatever opened it when it closes (Back closes it).
import { $, esc, ic } from './util.js';
import { pushLayer, popLayer, focus } from './focus.js';

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
  const entry = { el, opener: document.activeElement, onClose, onKey };
  stack.push(entry);
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
  popLayer(entry.el, restore ? entry.opener : null);
  entry.onClose?.();
}
// Back closes the topmost overlay. Returns true if one was closed.
export function closeTop() { const e = stack[stack.length - 1]; if (!e) return false; closeOverlay(e); return true; }
export function overlayKey(k, e) { const top = stack[stack.length - 1]; return !!top?.onKey?.(k, e); }

// A menu of radio rows (Sort, version, groups...): rows = [{ v, l, sub, on, dis }]
export function radioMenu({ title, rows, value, onPick, extra = '', style = 'right:48px;top:120px;width:352px', cls = 'menu' }) {
  const html = `<div class="${cls}" style="${style}"><h3>${esc(title)}</h3><div data-col>${rows.map((r) => `<div class="lr fx${r.dis ? ' dis' : ''}" tabindex="-1" data-act="pick" data-v="${esc(r.v)}"><span class="rd${r.v === value ? ' on' : ''}"></span><span class="grow ellipsis">${esc(r.l)}</span>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div>`).join('')}</div>${extra}</div>`;
  const ov = openOverlay(html, {
    focusSel: `[data-v="${CSS.escape(String(value ?? ''))}"]`,
    onClick: (act, t) => { if (act === 'pick') { ov.close(); onPick(t.dataset.v); } },
  });
  return ov;
}

// Context menu for hold OK on a card: Save to Saved first and focused, so hold then OK saves.
export function contextMenu(anchor, rows) {
  const r = anchor.getBoundingClientRect();
  const x = Math.min(Math.max(48, r.left + 12), 912 - 236), y = Math.min(Math.max(27, r.top + 24), 513 - (rows.length * 48 + 16));
  const ov = openOverlay(`<div class="ctxmenu" style="left:${x}px;top:${y}px" data-col>${rows.map((row, i) => `<div class="lr fx" tabindex="-1" data-act="${i}">${ic(row.icon, 'sm')}${esc(row.label)}</div>`).join('')}</div>`, {
    scrim: false,
    onClick: (act) => { ov.close(); rows[+act]?.run(); },
  });
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
export function scrollList(root) {
  root.addEventListener('tvfocus', (e) => {
    const body = e.target.closest('.sheet-body'); if (!body) return;
    const inner = body.querySelector('.inner'), y = e.target.offsetTop, h = body.clientHeight;
    const cur = -(parseFloat((inner.style.transform.match(/-?[\d.]+/) || [0])[0]) || 0);
    let t = cur;
    if (y - cur > h - 70) t = y - h + 70; else if (y - cur < 8) t = Math.max(0, y - 8);
    inner.style.transform = `translateY(${-t}px)`;
  });
}
export { focus };
