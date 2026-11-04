// airglow for Windows: start-up, the title bar, the sidebar, the keys, Back, Offline (design/ui-v1/desktop-v1/SPEC.md
// 2, 3, 8). The bridge goes first: the TV modules below read it when they load (bridge.js).
import './bridge.js';
import { S, on, emit, settings, store } from '../tv/js/state.js';
import { resume } from '../tv/js/session.js';
import { startNba, myGame, nba, liveShown, gameById, bestChannel } from '../tv/js/games.js';
import { busy, ensure, catalog } from '../tv/js/catalog.js';
import { staleGuides } from '../tv/js/guide.js';
import { launchReady } from '../tv/js/launch.js';
import { initSubs } from '../tv/js/subs.js';
import { playLive } from '../tv/js/player.js';
import { register as tvRegister } from '../tv/js/router.js';
import { sleep } from '../tv/js/util.js';
import { ic, esc, register, go, push, back, forward, current, onNav, nav, canBack, canForward, floatOpen, closeTopFloat, menu } from './ui.js';
import { match, tip, openSheet } from './keys.js';
import * as player from './player.js';
import * as palette from './palette.js';
import * as mv from './multiview.js';
import * as rem from './reminders.js';
import home from './home.js';
import live, { dayPage } from './live.js';
import nbaTab, { gamePage, teamScreen, sectionStep as nbaSection } from './nba.js';
import lib from './library.js';
import saved from './saved.js';
import detail from './detail.js';
import search from './search.js';
import account from './account.js';
import signin from './signin.js';

const T = window.tuner || null;
window.__dkAcc = () => S.acc?.name || '';
window.__phAcc = window.__dkAcc;
[home, live, dayPage, nbaTab, gamePage, teamScreen, lib, saved, detail, search, account, signin].forEach(register);
// The TV's own code pushes its pages by name (replay.js: the game page; actions.js: a title's page): its router's
// screens are stand-ins that open the desktop's page instead.
const FORWARD = { detail: (p) => push('detail', { title: p.title }), game: (p) => push('game', { id: p.id }), team: (p) => (p.abbr ? push('team', { abbr: p.abbr }) : go('nba')), account: () => go('account'), first: () => go('signin'),
  home: () => go('home'), live: () => go('live'), nba: () => go('nba'), movie: () => go('lib', { seg: 'movie' }), series: () => go('lib', { seg: 'series' }), saved: () => go('saved'), search: () => go('search') };
for (const [name, f] of Object.entries(FORWARD)) tvRegister({ name, enter: (el, params) => f(params || {}) });

// ---------- the title bar ----------
const tbar = document.getElementById('dk-tbar');
function drawBar() {
  if (player.theater()) { tbar.innerHTML = player.stripHtml(); tbar._html = ''; return; }
  const off = S.offline ? `<span class="offl">${ic('globe')}Offline · showing what airglow remembers</span>` : '';
  const n = (S.acc?.name || '').match(/\p{L}/u)?.[0]?.toUpperCase();
  const html = `<img class="mk" src="tv/brand/assets/mark-small.svg" alt="airglow" draggable="false">
    <div class="nav"><button class="nb${canBack() ? '' : ' dim'}" data-act="back" data-tip="${esc(tip('Back', 'back'))}">${ic('back')}</button><button class="nb${canForward() ? '' : ' dim'}" data-act="forward" data-tip="Forward · Alt →">${ic('fwdNav')}</button></div>
    <button class="omni" data-act="palette">${ic('search')}<span>Search or jump to anything</span><span class="r"><span class="k">Ctrl</span><span class="k">K</span></span></button>
    <div class="tbr">${off}${S.acc ? `<button class="avatar" data-act="account" data-tip="Account · Ctrl ,">${n ? esc(n) : ic('user')}</button>` : ''}</div>`;
  if (tbar._html !== html) { tbar.innerHTML = html; tbar._html = html; }
}
tbar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'back') { if (player.theater()) player.leave(); else back(); }
  if (a === 'forward') forward();
  if (a === 'palette') palette.open();
  if (a === 'account') go('account');
  if (a === 'pback') player.leave();
});

// ---------- the sidebar (240 with labels, the 72 px rail under 1500 px or with Ctrl B) ----------
const side = document.getElementById('dk-side');
const SECTIONS = [['home', 'Home', 'home'], ['live', 'Live', 'liveTab'], ['nba', 'NBA', 'ball'], ['movie', 'Movies', 'movies'], ['series', 'Series', 'series'], ['saved', 'Saved', 'saved']];
const secOf = () => { const t = nav.tab; if (t === 'lib') return nav.tabParams?.seg === 'series' ? 'series' : 'movie'; return t; };
let railPref = (() => { try { return localStorage.getItem('tuner.dkRail'); } catch { return null; } })();   // 'on' | 'off' | null (by width)
const isRail = () => (railPref === 'on' ? true : railPref === 'off' ? false : innerWidth < 1500) || mv.isOpen();
function drawSide() {
  document.documentElement.classList.toggle('side-rail', isRail());
  document.documentElement.classList.toggle('narrow', innerWidth < 1100);
  const sel = secOf(), g = myGame();
  const lv = liveShown(g) && !(current() === 'home' && window.__homeGameLit?.());
  const mini = player.miniState();
  const upd = (window.TUNER_NATIVE.updates.status() || {}).state === 'ready';
  const items = SECTIONS.map(([k, l, i], n) => `<button class="sb-i${sel === k ? ' sel' : ''}" data-sec="${k}" data-tip="${esc(`${l} · Ctrl ${n + 1}`)}">${ic(i)}<span>${l}</span>${k === 'nba' && lv ? '<span class="a-live compact">Live</span>' : ''}</button>`).join('');
  const np = mini ? `<button class="np" data-act="np" data-tip="Back to the player · Ctrl P"><div class="pic">${mini.pic || ''}<span class="a-live compact">Live</span></div><div class="t">${esc(mini.title)}<small>${esc(mini.sub || 'In the corner')}</small></div></button>` : '';
  const html = `${items}<div class="gap"></div>${np}${S.acc ? `<button class="acct${current() === 'account' ? ' sel' : ''}" data-act="account" data-tip="Account · Ctrl ,"><span class="avatar">${esc((S.acc.name || '').match(/\p{L}/u)?.[0]?.toUpperCase() || '')}</span><div>${esc(S.acc.name || 'Account')}<small>${upd ? 'update ready' : 'Account'}</small></div>${upd ? '<i class="dotu"></i>' : ''}</button>` : ''}`;
  if (side._html !== html) { side.innerHTML = html; side._html = html; }
}
side.addEventListener('click', (e) => {
  const s = e.target.closest('[data-sec]');
  if (s) return goSection(s.dataset.sec);
  const b = e.target.closest('[data-act]');
  if (b?.dataset.act === 'account') go('account');
  if (b?.dataset.act === 'np') player.fromMini();
});
function goSection(k) {
  if (mv.isOpen()) mv.close();
  if (player.theater()) player.leave();
  if (k === 'movie' || k === 'series') return go('lib', { seg: k });
  go(k);
}
const redraw = () => { drawBar(); drawSide(); };
onNav(redraw);
on('nba', drawSide);
on('player-ui', redraw);
on('offline-state', drawBar);
window.TUNER_NATIVE.updates.onStatus(drawSide);
window.addEventListener('resize', drawSide);

// ---------- the keyboard ----------
// the ring only after a key moved the focus, gone on the next mouse move (SPEC 3)
const root = document.documentElement;
document.addEventListener('mousemove', () => root.classList.remove('kb'), { passive: true });
document.addEventListener('mousedown', () => root.classList.remove('kb'), { passive: true });
const typing = () => { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable) && !a.readOnly; };
const BROWSE = new Set(['home', 'lib', 'saved', 'search', 'detail', 'nba', 'game', 'team', 'account', 'day']);
function scopes() {
  if (mv.isOpen()) return ['Multiview', 'Windows and screens', 'Everywhere'];
  if (player.open()) return [...(player.isLive() ? ['Live TV'] : []), 'The player', 'Windows and screens', 'Everywhere'];
  if (current() === 'live') return ['The guide', 'Browsing', 'Windows and screens', 'Everywhere'];
  return ['Browsing', 'Windows and screens', 'Everywhere'];
}
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented) return;
  // palette and sheets own their keys while open (palette.js, ui.js menus)
  if (palette.isOpen() && palette.key(e)) return;
  const inField = typing();
  if (e.key === 'Escape') {
    e.preventDefault();
    if (palette.isOpen()) return palette.close();
    if (floatOpen()) return closeTopFloat();
    if (mv.isOpen()) return mv.escape();
    if (player.open()) return player.escape();
    if (inField) return document.activeElement.blur();
    back();
    return;
  }
  if (floatOpen() && !inField && menuKeys(e)) return;
  // a text field keeps its keys; only chords reach the app
  const sc = scopes();
  const id = match(e, inField ? ['Everywhere'].filter(() => e.ctrlKey || e.altKey || /^F\d+$/.test(e.key)) : sc);
  if (!id) { if (!inField && !floatOpen() && arrows(e)) return; return; }
  if (floatOpen() && !id.startsWith('p-') && !['palette', 'sheet'].includes(id)) { if (!inField && arrows(e)) return; }
  const done = run(id, e);
  if (done !== false) { e.preventDefault(); e.stopPropagation(); }
}, true);
function run(id, e) {
  if (id.startsWith('p-') || id.startsWith('l-')) return player.key(id, e);
  if (id.startsWith('m-')) return mv.key(id, e);
  if (id === 'g-digits') return digit(e.key);
  if (id.startsWith('g-')) return live.key?.(id, e) ?? false;
  switch (id) {
    case 'palette': return palette.open();
    case 'search': return go('search');
    case 'sheet': return openSheet();
    case 'section': { const n = +e.key - 1; if (SECTIONS[n]) goSection(SECTIONS[n][0]); return; }
    case 'back': return /right|forward/i.test(e.key) ? forward() : back();
    case 'rail': { railPref = isRail() ? 'off' : 'on'; try { localStorage.setItem('tuner.dkRail', railPref); } catch { /* none */ } drawSide(); window.dispatchEvent(new Event('resize')); return; }
    case 'settings': return go('account');
    case 'fullwin': return T?.win?.fullscreen();
    case 'mini': return player.toggleMini();
    case 'multiview': return mv.isOpen() ? mv.close() : mv.open();
    case 'remind': return rem.remindFocused();
    case 'print': return window.print();
    case 'w-top': return player.toggleTop();
    case 'w-snap': return T?.mini?.snap(/left/i.test(e.key) ? 'left' : 'right');
    case 'w-tray': return T?.win?.tray();
    case 'digits': if (current() === 'home' || current() === 'live') return digit(e.key); return false;
    case 'menu': { const a = document.activeElement; if (a && a !== document.body) { const r = a.getBoundingClientRect(); a.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 20, clientY: r.top + r.height / 2 })); } return; }
    case 'playnow': return playNow();
    case 'open': return false;   // (Enter clicks the focused button itself)
    case 'top': { const el = document.querySelector('#dk-pages > section:not([hidden])'); el?.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    case 'rowpage': return rowPage(/down/i.test(e.key) ? 1 : -1);
    case 'save': case 'notint': return cardKey(id);
    case 'nbasec': if (current() === 'nba') return nbaSection(/right/i.test(e.key) ? 1 : -1); return false;
    case 'move': return arrows(e) ? undefined : false;
    default: return false;
  }
}
// menus: ↑ ↓ through the rows
function menuKeys(e) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return false;
  const top = [...document.querySelectorAll('#floats .fl')].pop();
  const rows = [...(top?.querySelectorAll('.lr:not(.dis):not(.info), .menu [data-act], .sheet button, .sheet input') || [])];
  if (!rows.length) return false;
  const i = rows.indexOf(document.activeElement);
  rows[(i + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length]?.focus();
  root.classList.add('kb');
  e.preventDefault();
  return true;
}
// arrows move the focus the way the D-pad does: to the nearest focusable thing in that direction (spatial)
const FOCUSABLE = 'button:not([disabled]):not(.dis), a[href], input, [tabindex]:not([tabindex="-1"])';
function arrows(e) {
  const dir = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r' }[e.key];
  if (!dir || e.altKey || e.ctrlKey || e.metaKey) return false;
  const scope = [...document.querySelectorAll('#floats .fl')].pop() || document.getElementById('dk');
  const cur = document.activeElement && scope.contains(document.activeElement) ? document.activeElement : null;
  const all = [...scope.querySelectorAll(FOCUSABLE)].filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && x.offsetParent !== null && !x.closest('[hidden]'); });
  if (!all.length) return false;
  e.preventDefault();
  root.classList.add('kb');
  if (!cur) { const first = all.find((x) => x.closest('#dk-pages')) || all[0]; first.focus(); first.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return true; }
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bd = Infinity;
  for (const x of all) {
    if (x === cur) continue;
    const b = x.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
    const dx = bx - ax, dy = by - ay;
    const ok = dir === 'r' ? b.left >= a.right - 4 : dir === 'l' ? b.right <= a.left + 4 : dir === 'd' ? b.top >= a.bottom - 4 : b.bottom <= a.top + 4;
    if (!ok) continue;
    const main = dir === 'l' || dir === 'r' ? Math.abs(dx) : Math.abs(dy), cross = dir === 'l' || dir === 'r' ? Math.abs(dy) : Math.abs(dx);
    const d = main + cross * 2.5;
    if (d < bd) { bd = d; best = x; }
  }
  if (best) { best.focus({ preventScroll: true }); best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }
  return true;
}
function rowPage(d) {
  const rows = [...document.querySelectorAll('#dk-pages > section:not([hidden]) .row')];
  if (!rows.length) return;
  const a = document.activeElement?.closest('.row');
  const i = Math.max(0, Math.min(rows.length - 1, (a ? rows.indexOf(a) : -1) + d));
  const b = rows[i].querySelector('button');
  if (b) { b.focus({ preventScroll: true }); rows[i].scrollIntoView({ block: 'center', behavior: 'smooth' }); root.classList.add('kb'); }
}
function playNow() {
  const a = document.activeElement;
  if (!a) return;
  a.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
}
function cardKey(id) { document.activeElement?.dispatchEvent(new CustomEvent('cardkey', { bubbles: true, detail: id })); }
// digits tune (the TV's rule: the number shows in the one box, then tunes after a rest)
let digits = '', digT = 0;
function digit(d) {
  digits = (digits + d).slice(-4);
  palette.showDigits(digits);
  clearTimeout(digT);
  digT = setTimeout(() => { const n = +digits; digits = ''; palette.showDigits(''); tuneNumber(n); }, 1400);
}
export function tuneNumber(n) {
  const list = catalog.live?.items || [];
  const ch = list.find((c) => !c._sep && +c.num === n);
  if (!ch) { import('../tv/js/ui.js').then((u) => u.toast(`No channel ${n}`)); return; }
  playLive(ch, list.filter((c) => !c._sep), 'All channels');
}

// ---------- the mouse's own buttons (back / forward), the wheel on Home ----------
document.addEventListener('mouseup', (e) => { if (e.button === 3) { e.preventDefault(); if (player.open()) player.leave(); else back(); } if (e.button === 4) { e.preventDefault(); forward(); } });
// tooltips: after a 600 ms rest, every button's ends with its key (SPEC 3)
let tipT = 0, tipEl = null;
document.addEventListener('mouseover', (e) => {
  const t = e.target.closest?.('[data-tip]');
  if (t === tipEl) return;
  tipEl = t;
  clearTimeout(tipT);
  document.getElementById('dk-tip')?.remove();
  if (!t) return;
  tipT = setTimeout(() => {
    if (!t.isConnected || tipEl !== t) return;
    const r = t.getBoundingClientRect(), d = document.createElement('div');
    d.id = 'dk-tip'; d.className = 'dk-tip'; d.textContent = t.dataset.tip;
    document.getElementById('floats').appendChild(d);
    const w = d.offsetWidth;
    d.style.left = `${Math.max(6, Math.min(innerWidth - w - 6, r.left + r.width / 2 - w / 2))}px`;
    d.style.top = `${r.bottom + 8 > innerHeight - 30 ? r.top - 32 : r.bottom + 8}px`;
  }, 600);
}, true);
document.addEventListener('mousedown', () => { clearTimeout(tipT); document.getElementById('dk-tip')?.remove(); }, true);

// ---------- the account, offline ----------
busy.showing = (k) => current() === (k === 'live' ? 'live' : 'lib');
busy.gameOn = () => !nba.stale && myGame()?.state === 'in';
on('session', () => { S.offline = false; offline(false); if (S.acc) startNba(); redraw(); rem.trayNext(); });
on('signed-out', (msg) => go('signin', { error: msg }));
on('nba', () => rem.trayNext());
let offT = 0;
function offline(onOff) { document.body.classList.toggle('offline', !!onOff); emit('offline-state'); }
on('offline', () => {
  offline(true);
  clearTimeout(offT);
  const retry = () => {
    if (!S.src || !S.offline) { offline(false); return; }
    S.src.login().then((d) => { S.offline = false; S.info = d; offline(false); staleGuides(); emit('online'); }).catch(() => { offT = setTimeout(retry, 30000); });
  };
  offT = setTimeout(retry, 30000);
});
// a notification's Watch, the tray's menu, a second launch with an action
T?.onAction?.((a) => {
  if (!a) return;
  if (a.kind === 'game') { const g = gameById(a.id); const ch = g && bestChannel(g); if (a.watch && ch) playLive(ch, catalog.live?.items || [ch], 'All channels'); else push('game', { id: a.id }); }
  if (a.kind === 'tune') { const ch = catalog.live?.byId.get(String(a.id)); if (ch) playLive(ch, catalog.live.items, 'All channels'); }
  if (a.kind === 'multiview') mv.open();
});

async function start() {
  initSubs();
  launchReady();   // (its "done" lets the guide scans start)
  drawBar(); drawSide();
  if (resume()) {
    await Promise.race([ensure('live').catch(() => null), sleep(700)]);
    go('home');
  } else go('signin');
  redraw();
  rem.trayNext();
  window.__desktopReady = true;
}
start();

if (window.TUNER_TEST || new URLSearchParams(location.search).has('test')) {
  window.__tunerTest = { go, push, back, emit, state: () => ({ desktop: true, screen: current(), acc: !!S.acc, games: nba.today.length, team: settings().nbaTeam || 'MEM', rail: isRail(), player: player.testState(), mv: mv.testState() }), player, mv, palette };
}
void store; void menu;
