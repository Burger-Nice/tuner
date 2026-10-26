// Small shared helpers for the TV app: DOM, escaping, icons, time and the team palette.
import { focus, entryOf } from './focus.js';
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Lets the remote's key presses through between chunks of heavy work.
export const breathe = () => new Promise((r) => setTimeout(r, 0));
export const host = (u) => { try { return new URL(u).host; } catch { return u; } };
export const keyOf = (it) => `${it.kind}:${it.id}`;
// Provider art is often a TMDB link to the full-size original: ask TMDB for the size the slot needs instead
// (w342 for 296 px posters, w1280 for backdrops), so the TV downloads and decodes a fraction of it.
export const sized = (url, w) => (url ? String(url).replace(/(image\.tmdb\.org\/t\/p\/)(original|w\d+(?:_and_h\d+_\w+)?)\//, `$1w${w}/`) : url);

// Icons from the design kit (24 x 24, stroked).
const P = {
  home: '<path d="M3.5 11 12 3.5l8.5 7.5v8.5a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>',
  live: '<circle cx="12" cy="12" r="1.7"/><path d="M8 8a5.7 5.7 0 0 0 0 8M16 8a5.7 5.7 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>', chevL: '<path d="M15 5l-7 7 7 7"/>', chevD: '<path d="M5 9l7 7 7-7"/>', chevU: '<path d="M5 15l7-7 7 7"/>',
  sliders: '<path d="M4 7h8M18 7h2M4 17h2M12 17h8"/><circle cx="15" cy="7" r="2.5"/><circle cx="9" cy="17" r="2.5"/>',
  sort: '<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17.5 10.2a2.4 2.4 0 1 0 0 3.6"/>',
  saved: '<path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4-6.5 4V4.5a1 1 0 0 1 1-1z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  star: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9z" fill="currentColor" stroke="none"/>',
  starO: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9z"/>',
  restart: '<path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5"/>',
  wifiOff: '<path d="M2.5 9a15 15 0 0 1 19 0M5.5 12.8a10.5 10.5 0 0 1 13 0M8.8 16.4a5.5 5.5 0 0 1 6.4 0M12 20h.01M3 3l18 18"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M3 15h18"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7a13 13 0 0 1-2.4 3.7M6.4 6.6A13 13 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  pin: '<path d="M9 3h6l-1 6 3.5 3.5h-11L10 9zM12 16v5"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5"/>',
  score: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M12 5.5v13M6.5 10h2.5M15 10h2.5M6.5 14h2.5M15 14h2.5"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  del: '<path d="M9 6h11v12H9l-6-6z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.6M12 18.4V21M3 12h2.6M18.4 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
};
export const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
export const BRAND = 'tv/brand/assets/';
export const brandImg = (f, cls = '', h) => `<img src="${BRAND}${f}" class="${cls}"${h ? ` height="${h}"` : ''} alt="">`;
export const dot = '<span class="dot-sep"></span>';
export const liveP = (compact) => `<span class="a-live${compact ? ' compact' : ''}">Live</span>`;
export const tag = (t, c = '') => `<span class="tag ${c}">${esc(t)}</span>`;

// Times are 24 h (brand rule).
export const hm = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
export const fmtTime = (s) => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
export const leftText = (sec) => { const m = Math.max(1, Math.round(sec / 60)); return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m left` : `${m} min left`; };
export const runtime = (sec) => { const m = Math.round(sec / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`; };
export const compact = (n) => (n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));

// Channel tile stand-in: the provider logo when it loads, else initials. "US: ESPN HD" -> ESPN, "Sky Sports Main Event" -> SS.
export function initials(n) {
  const words = String(n).replace(/^[A-Z]{2,3}\s*[|:\-]\s*/, '').replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/)
    .filter((w) => w && !/^\d+$/.test(w) && !/^(hd|fhd|uhd|sd|4k|hevc|the)$/i.test(w));
  if (!words.length) return 'TV';
  if (/^[\p{Lu}\p{N}]{2,4}$/u.test(words[0])) return words[0];
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
}
export function logo(url, name, cls = '') {
  const ini = esc(initials(name));
  return `<span class="logo ${cls}">${url ? `<img src="${esc(url)}" alt="" decoding="async" loading="lazy" data-ini="${ini}">` : ini}</span>`;
}
// Broken artwork falls back to the initials it carries.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName !== 'IMG') return;
  const ini = img.dataset.ini;
  // a poster that won't load becomes the same initials tile as a title without one (never a blank grey card)
  const tile = img.closest('[data-nt]');
  if (tile) { tile.className = 'noart'; tile.innerHTML = `<span class="ini">${esc(tile.dataset.ini || '')}</span><span class="nt clamp3">${esc(tile.dataset.nt)}</span>`; return; }
  if (ini != null) img.replaceWith(document.createTextNode(ini));
  else img.remove();
}, true);

// Redraw a block only when its content changed, and keep focus on the same control. The control is found again by its
// path (its data-* attributes and its containers', e.g. the Continue watching rail's card 2, not On now's card 2);
// if it's gone, focus goes to the screen's entry, never to whatever happens to be first.
const part = (n) => n.getAttributeNames().filter((k) => k.startsWith('data-')).map((k) => `[${k}="${CSS.escape(n.getAttribute(k))}"]`).join('') || (n.id ? `#${CSS.escape(n.id)}` : '');
export function focusPath(a, root) {
  const parts = [];
  for (let n = a; n && n !== root; n = n.parentElement) { const p = part(n); if (p) parts.unshift(p); }
  return { path: parts.join(' '), leaf: part(a) };
}
// The control a path describes, inside root (or null).
export function findPath(root, key) {
  const q = (s) => { try { return s ? root.querySelector(s) : null; } catch { return null; } };
  return key ? q(key.path) || q(key.leaf) : null;
}
export function setHtml(el, html, restore = true) {
  if (!el || (el._html === html && el.childNodes.length)) return false;
  const a = document.activeElement;
  const key = restore && a && a !== el && el.contains(a) ? focusPath(a, el) : null;
  el.innerHTML = html;
  el._html = html;
  if (key) {
    const q = (s) => { try { return s ? el.querySelector(s) : null; } catch { return null; } };
    const to = q(key.path) || q(key.leaf);
    if (to) focus(to);
    else { const scr = el.closest('[data-screen]'); focus(entryOf(scr || el)); }
  }
  return true;
}

// ---------- teams: their real colours (owner decision), with the legibility safeguards ----------
// p = plate (the primary), a = the 4 px bar (the secondary). Text on a plate is chalk or ink, whichever passes 4.5:1;
// where neither does, the plate is darkened just enough (Memphis' Beale Street blue, Thunder blue).
const TEAM_COLORS = {
  ATL: ['#E03A3E', '#C1D32F'], BOS: ['#007A33', '#BA9653'], BKN: ['#000000', '#FFFFFF'], CHA: ['#1D1160', '#00788C'],
  CHI: ['#CE1141', '#FFFFFF'], CLE: ['#860038', '#FDBB30'], DAL: ['#00538C', '#B8C4CA'], DEN: ['#0E2240', '#FEC524'],
  DET: ['#C8102E', '#1D42BA'], GS: ['#1D428A', '#FFC72C'], HOU: ['#CE1141', '#C4CED4'], IND: ['#002D62', '#FDBB30'],
  LAC: ['#C8102E', '#1D428A'], LAL: ['#552583', '#FDB927'], MEM: ['#5D76A9', '#F5B112'], MIA: ['#98002E', '#F9A01B'],
  MIL: ['#00471B', '#EEE1C6'], MIN: ['#0C2340', '#78BE20'], NO: ['#0C2340', '#C8102E'], NY: ['#006BB6', '#F58426'],
  OKC: ['#007AC1', '#EF3B24'], ORL: ['#0077C0', '#C4CED4'], PHI: ['#006BB6', '#ED174C'], PHX: ['#1D1160', '#E56020'],
  POR: ['#E03A3E', '#FFFFFF'], SAC: ['#5A2D81', '#63727A'], SA: ['#000000', '#C4CED4'], TOR: ['#CE1141', '#A1A1A4'],
  UTAH: ['#002B5C', '#F9A01B'], WSH: ['#002B5C', '#E31837'],
};
const lin = (x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = (hex) => { const [r, g, b] = rgb(hex).map((v) => lin(v / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const CHALK = '#F3EFE6', INK = '#14101F', L_CHALK = lum(CHALK), L_INK = lum(INK);
export const textOn = (hex) => (ratio(L_CHALK, lum(hex)) >= ratio(L_INK, lum(hex)) ? CHALK : INK);
const darken = (hex, f) => '#' + rgb(hex).map((v) => Math.round(v * f).toString(16).padStart(2, '0')).join('');
const plates = new Map();
export function teamPalette(t) {
  const abbr = t?.abbr || t;
  if (plates.has(abbr)) return plates.get(abbr);
  let [p, a] = TEAM_COLORS[abbr] || [t?.color || '#3D3B45', t?.alt || '#918BA7'];
  if (!/^#[0-9a-f]{6}$/i.test(p)) p = '#3D3B45';
  if (!/^#[0-9a-f]{6}$/i.test(a)) a = '#918BA7';
  let f = 1;
  while (Math.max(ratio(L_CHALK, lum(p)), ratio(L_INK, lum(p))) < 4.5 && f > 0.4) { f -= 0.04; p = darken(TEAM_COLORS[abbr]?.[0] || p, f); }
  const out = { p, a, fg: textOn(p) };
  plates.set(abbr, out);
  return out;
}
export const teamVars = (t) => { const c = teamPalette(t); return `--tp:${c.p};--ta:${c.a};--tc:${c.fg}`; };
// The ESPN logo inside the brand's neutral disc. Logos are never recoloured.
export const crest = (t, size = '') => `<span class="team ${size}"><img src="${esc(t?.logo || '')}" alt="" decoding="async" data-ini="${esc(t?.abbr || '')}"></span>`;
