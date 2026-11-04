// The one key map (desktop SPEC 8, mock 11): every shortcut, its scope and its words. The shortcuts sheet and every
// tooltip read it, so they can't drift; a duplicate inside one scope is refused at load. One meaning per key:
// Ctrl ← → is the NBA sections only; digits tune on Home, Live and in the player and pick a tile's audio only in
// multiview; Esc is one ladder (full screen, the controls, the player, a sheet or the palette, Back).
import { esc } from '../tv/js/util.js';
import { sheet } from './ui.js';

// [id, scope, label, shown keys, combos]
const MAP = [
  ['palette', 'Everywhere', 'Search and commands', 'Ctrl K', ['ctrl+k']],
  ['search', 'Everywhere', 'Search', '/', ['/']],
  ['sheet', 'Everywhere', 'This sheet', '?', ['?']],
  ['section', 'Everywhere', 'Home, Live, NBA, Movies, Series, Saved', 'Ctrl 1–6', ['ctrl+1', 'ctrl+2', 'ctrl+3', 'ctrl+4', 'ctrl+5', 'ctrl+6']],
  ['back', 'Everywhere', 'Back · forward', 'Alt ← →', ['alt+arrowleft', 'alt+arrowright', 'browserback', 'browserforward']],
  ['rail', 'Everywhere', 'Sidebar', 'Ctrl B', ['ctrl+b']],
  ['settings', 'Everywhere', 'Settings', 'Ctrl ,', ['ctrl+,']],
  ['fullwin', 'Everywhere', 'Full-screen window', 'F11', ['f11']],
  ['mini', 'Everywhere', 'Mini player', 'Ctrl P', ['ctrl+p']],
  ['multiview', 'Everywhere', 'Multiview', 'Ctrl Shift M', ['ctrl+shift+m']],
  ['remind', 'Everywhere', 'Remind me (on a game)', 'Ctrl R', ['ctrl+r']],
  ['addmv', 'Everywhere', 'Add the game or channel to multiview', 'Ctrl M', ['ctrl+m']],
  ['print', 'Everywhere', 'Print this sheet', 'Ctrl Shift P', ['ctrl+shift+p']],

  ['move', 'Browsing', 'Move', '↑ ↓ ← →', ['arrowup', 'arrowdown', 'arrowleft', 'arrowright']],
  ['open', 'Browsing', 'Open', 'Enter', ['enter']],
  ['playnow', 'Browsing', 'Play now', 'Shift Enter', ['shift+enter']],
  ['save', 'Browsing', 'Save', 'S', ['s']],
  ['notint', 'Browsing', 'Not interested', 'X', ['x']],
  ['menu', 'Browsing', 'Menu', 'Shift F10', ['shift+f10', 'contextmenu']],
  ['rowpage', 'Browsing', 'Next / previous row', 'PgDn PgUp', ['pagedown', 'pageup']],
  ['top', 'Browsing', 'Top', 'Home', ['home']],
  ['rowwheel', 'Browsing', 'Scroll a row', 'Shift wheel', []],
  ['nbasec', 'Browsing', 'NBA sections', 'Ctrl ← →', ['ctrl+arrowleft', 'ctrl+arrowright']],
  ['digits', 'Browsing', 'Tune a channel (Home and Live)', '0–9', ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']],

  ['g-time', 'The guide', 'Along time', '← → or drag', ['arrowleft', 'arrowright']],
  ['g-ch', 'The guide', 'Channels', '↑ ↓ or wheel', ['arrowup', 'arrowdown']],
  ['g-page', 'The guide', 'A page', 'PgUp PgDn', ['pageup', 'pagedown']],
  ['g-now', 'The guide', 'Back to now', 'N', ['n', 'home']],
  ['g-day', 'The guide', 'Day', 'D', ['d']],
  ['g-zoom', 'The guide', 'Zoom', 'Ctrl wheel', []],
  ['g-tune', 'The guide', 'Tune', 'Enter', ['enter']],
  ['g-start', 'The guide', 'From the start', 'Shift Enter', ['shift+enter']],
  ['g-fav', 'The guide', 'Favourite', 'F', ['f']],
  ['g-remind', 'The guide', 'Remind me', 'R', ['r']],
  ['g-digits', 'The guide', 'Tune a channel number', '0–9', ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']],

  ['p-pause', 'The player', 'Play / pause', 'Space K or click', ['space', 'k', 'mediaplaypause']],
  ['p-seek', 'The player', '10 s', '← → J L', ['arrowleft', 'arrowright', 'j', 'l']],
  ['p-seekbig', 'The player', '1 min', 'Shift ← →', ['shift+arrowleft', 'shift+arrowright']],
  ['p-vol', 'The player', 'Volume', '↑ ↓ or wheel', ['arrowup', 'arrowdown']],
  ['p-mute', 'The player', 'Mute', 'M', ['m']],
  ['p-full', 'The player', 'Full screen', 'F or double-click', ['f']],
  ['p-subs', 'The player', 'Subtitles', 'C', ['c']],
  ['p-audio', 'The player', 'Audio', 'A', ['a']],
  ['p-quality', 'The player', 'Quality', 'Q', ['q']],
  ['p-speed', 'The player', 'Speed', '[ ]', ['[', ']']],
  ['p-options', 'The player', 'Options', 'O', ['o']],
  ['p-panel', 'The player', 'Game panel', 'G', ['g']],
  ['p-mini', 'The player', 'Mini player', 'P', ['p']],
  ['p-next', 'The player', 'Next episode', 'N', ['n']],
  ['p-eps', 'The player', 'Episodes', 'E', ['e']],
  ['p-skip', 'The player', 'Skip intro / recap when offered', 'Enter', ['enter']],
  ['p-esc', 'The player', 'Leave full screen, hide the controls, then leave', 'Esc', ['escape']],
  ['p-close', 'The player', 'Close the player', 'Ctrl W', ['ctrl+w']],

  ['l-zap', 'Live TV', 'Zap', 'PgUp PgDn', ['pageup', 'pagedown']],
  ['l-digits', 'Live TV', 'Channel number', '0–9', ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']],
  ['l-last', 'Live TV', 'Last channel', 'Backspace', ['backspace']],
  ['l-list', 'Live TV', 'Channels', 'L', ['l']],
  ['l-groups', 'Live TV', 'Groups', 'Shift L', ['shift+l']],
  ['l-tolive', 'Live TV', 'Back to live', 'End', ['end']],
  ['l-start', 'Live TV', 'From the start', 'Home', ['home']],
  ['l-reveal', 'Live TV', 'Reveal the score', 'Ctrl Shift R', ['ctrl+shift+r']],

  ['m-add', 'Multiview', 'Add a game or channel', 'Ctrl M or drag', ['ctrl+m']],
  ['m-audio', 'Multiview', 'Audio to a tile', '1–4', ['1', '2', '3', '4']],
  ['m-expand', 'Multiview', 'Expand a tile', 'Shift 1–4 or double-click', ['shift+1', 'shift+2', 'shift+3', 'shift+4']],
  ['m-remove', 'Multiview', 'Remove the audio tile', 'Del', ['delete']],
  ['m-layout', 'Multiview', 'Layout', 'Ctrl L', ['ctrl+l']],
  ['m-leave', 'Multiview', 'Leave', 'Esc', ['escape']],

  ['w-top', 'Windows and screens', 'Always on top (the mini player)', 'Ctrl Shift T', ['ctrl+shift+t']],
  ['w-snap', 'Windows and screens', 'Snap the mini player', 'Ctrl Shift ← →', ['ctrl+shift+arrowleft', 'ctrl+shift+arrowright']],
  ['w-tray', 'Windows and screens', 'Minimise to the tray', 'Ctrl Shift H', ['ctrl+shift+h']],
  ['w-media', 'Windows and screens', 'Play / pause, zap', 'Media keys while airglow plays', []],
];
// the scopes a group's keys live in (the groups that share keys are never active together, except Everywhere)
export const KEYS = MAP.map(([id, group, label, show, combos]) => ({ id, group, label, show, combos }));
const byScope = new Map();
for (const k of KEYS) {
  const m = byScope.get(k.group) || new Map();
  for (const c of k.combos) {
    if (m.has(c)) throw new Error(`keys.js: ${c} twice in ${k.group} (${m.get(c)} and ${k.id})`);
    m.set(c, k.id);
  }
  byScope.set(k.group, m);
}
// Everywhere holds no single letters (only chords and punctuation)
for (const [c] of byScope.get('Everywhere')) if (/^[a-z0-9]$/.test(c)) throw new Error(`keys.js: ${c} in Everywhere`);

// a keydown as a combo string: ctrl+shift+arrowleft, ?, space, f11 (a printed symbol carries no shift)
export function comboOf(e) {
  if (e.shiftKey && !e.ctrlKey && !e.altKey && /^Digit\d$/.test(e.code || '')) return `shift+${e.code.slice(5)}`;   // (Shift 1 types "!")
  const k = e.key === ' ' ? 'space' : String(e.key || '').toLowerCase();
  const sym = k.length === 1 && !/[a-z0-9]/.test(k);
  const mods = [e.ctrlKey || e.metaKey ? 'ctrl' : '', e.altKey ? 'alt' : '', e.shiftKey && (!sym || e.ctrlKey) ? 'shift' : ''].filter(Boolean);
  return [...mods, k].join('+');
}
// the id the key has in these scopes (first scope wins), else ''
export function match(e, scopes) {
  const c = comboOf(e);
  for (const s of scopes) { const id = byScope.get(s)?.get(c); if (id) return id; }
  return '';
}
// a tooltip's key ("Mini player · P")
export const keyOf = (id) => KEYS.find((k) => k.id === id)?.show || '';
export const tip = (label, id) => { const k = keyOf(id); return k ? `${label} · ${k}` : label; };

// ---------- the sheet (?) ----------
const caps = (s) => s.split(' ').map((w) => (/^(or|and|while|airglow|plays|keys|click|double-click|drag|wheel|Media)$/.test(w) ? `<i>${esc(w)}</i>` : `<span class="k">${esc(w)}</span>`)).join(' ');
export function sheetHtml() {
  const groups = [...new Set(KEYS.map((k) => k.group))];
  return `<div class="ks-head"><h3>Keyboard shortcuts</h3><small>Windows · the same words as the TV's remote</small><button class="ghost sm" data-act="print">Print · Ctrl Shift P</button></div><div class="ks-cols">${groups.map((g) => `<div class="ks-g"><h4>${esc(g)}</h4>${KEYS.filter((k) => k.group === g).map((k) => `<div class="ks-r"><span>${esc(k.label)}</span><span class="ks-k">${caps(k.show)}</span></div>`).join('')}</div>`).join('')}</div>`;
}
let open = null;
export function openSheet() {
  if (open?.el?.isConnected) { open.close(); open = null; return; }
  open = sheet(sheetHtml(), { center: true, cls: 'ks', onClick: (a) => { if (a === 'print') window.print(); }, onClose: () => { open = null; } });
}
