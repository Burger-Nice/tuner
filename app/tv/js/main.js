// airglow TV: start-up, the remote's keys, and Back.
import { $, sleep } from './util.js';
import { S, on, settings } from './state.js';
import { setBase, move, focus, entryOf, inLayer, topLayer } from './focus.js';
import { closeTop, overlayKey, toast } from './ui.js';
import { register, go, pop, nav, current, screenDef, screenEl, focusTab, setBar, barHidden } from './router.js';
import { native } from './native.js';
import { resume } from './session.js';
import { startNba, myGame, nba } from './games.js';
import { watching } from './player.js';
import home from './screens/home.js';
import live from './screens/live.js';
import lib from './screens/lib.js';
import detail from './screens/detail.js';
import nbaHub from './screens/nba.js';
import game from './screens/game.js';
import search from './screens/search.js';
import saved from './screens/saved.js';
import account from './screens/account.js';
import first from './screens/first.js';
import { launchOpen, launchReady } from './launch.js';

const app = $('#app');
setBase(app);
// The layout is drawn for 960 x 540 CSS px (a 1080p TV at 2x); other screens scale it.
function fit() { const z = window.innerWidth / 960; document.body.style.zoom = Math.abs(z - 1) > 0.01 ? z : ''; }
fit();
window.addEventListener('resize', fit);

[home, live, lib('movie'), lib('series'), detail, nbaHub, game, search, saved, account, first].forEach(register);

// ---------- keys ----------
const KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'ok', NumpadEnter: 'ok',
  Escape: 'back', GoBack: 'back', BrowserBack: 'back', MediaPlayPause: 'playpause', MediaPlay: 'play', MediaPause: 'pause',
  ChannelUp: 'chup', ChannelDown: 'chdown', PageUp: 'chup', PageDown: 'chdown', ContextMenu: 'menu', Info: 'info',
};
const CODES = { 10009: 'back', 461: 'back', 427: 'chup', 428: 'chdown', 82: 'menu', 84: 'search', 166: 'chup', 167: 'chdown', 165: 'info' };
// Remote-only codes (Tizen/webOS/Android) only count for keys with no printable character: in a browser 84 and 82 are T and R.
const keyName = (e) => KEYS[e.key] || (e.key?.length === 1 ? (/^[0-9]$/.test(e.key) ? 'digit' : null) : CODES[e.keyCode] || null);
const DIRS = new Set(['up', 'down', 'left', 'right']);
const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && !a.readOnly; };

let okDown = null;   // { el, t, held, timer }
document.addEventListener('keydown', (e) => {
  const k = keyName(e);
  if (!k) return;
  if (!launchOpen()) { e.preventDefault(); e.stopPropagation(); return; }   // keys count from the wipe on
  if (typing()) {
    // The keyboard owns the field; Back (or ▲▼) leaves it without leaving the page.
    if (!['back', 'up', 'down'].includes(k)) return;
    const f = document.activeElement;
    f.readOnly = true;
    if (k === 'back') { e.preventDefault(); f.blur(); focus(f); return; }
  }
  e.preventDefault();
  e.stopPropagation();   // handled here; a key that opens a field must not also reach it
  if (DIRS.has(k)) document.documentElement.classList.toggle('rep', e.repeat);
  if (overlayKey(k, e)) return;
  const def = screenDef();
  if (!inLayer() && def?.key?.(k, e)) return;
  if (DIRS.has(k)) { move(k, { repeat: e.repeat }); return; }
  if (k === 'ok') { okPress(e); return; }
  if (k === 'back') { if (!e.repeat) back(); return; }
  if (k === 'search') { go('search'); return; }
  if (k === 'digit' && !inLayer()) { go('live', { digit: e.key }); }
}, true);
document.addEventListener('keyup', (e) => {
  const k = keyName(e);
  if (DIRS.has(k)) document.documentElement.classList.remove('rep');
  if (k === 'ok' && okDown) {
    const d = okDown; okDown = null; clearTimeout(d.timer);
    if (!d.held && document.activeElement === d.el) d.el.click();
  }
}, true);
// OK clicks at once, except on things you can hold (cards, guide cells): those click on release, or open their menu at 500 ms.
function okPress(e) {
  const el = document.activeElement;
  if (!el || el === document.body || !topLayer()?.contains(el)) { focus(entryOf(topLayer())); return; }
  if (e.repeat) return;
  if (!el.hasAttribute('data-hold')) { el.click(); return; }
  el.classList.add('pressing');
  okDown = { el, held: false, timer: setTimeout(() => { if (okDown?.el === el) { okDown.held = true; el.classList.remove('pressing'); el.dispatchEvent(new CustomEvent('tvhold', { bubbles: true })); } }, 500) };
  setTimeout(() => el.classList.remove('pressing'), 600);
}

// Back: close the sheet; leave a page; in a tab's content go to the top and the tab; on a tab go Home; Home exits.
export function back() {
  if (closeTop()) return;
  if (screenDef()?.back?.(screenEl())) return;
  if (nav.stack.length) { pop(); return; }
  const inBar = $('#topbar').contains(document.activeElement);
  if (!inBar && current() !== 'first') {
    const scr = screenEl();
    screenDef()?.toTop?.(scr);
    // Back to the top: the next Down lands at the start, not where you were.
    scr._last = null;
    scr.querySelectorAll('[data-row],[data-col],[data-grid]').forEach((b) => (b._mem = null));
    barHidden(false); focusTab(); return;
  }
  if (current() !== 'home' && S.acc) { go('home'); return; }
  native?.exit();
}
native?.onBack(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
window.addEventListener('popstate', () => {});

// ---------- start ----------
on('nba', () => setBar({ live: myGame()?.state === 'in' }));
on('session', () => {
  if (!S.acc) return;
  const n = S.acc.name || '';
  setBar({ avatar: (n.match(/\p{L}/u)?.[0] || '').toUpperCase() });
  startNba();
});
on('signed-out', (msg) => go('first', { error: msg }));
on('offline', () => toast('Offline · showing what airglow remembers', 5000));
if (native) {
  const upd = (st) => setBar({ update: st?.state === 'ready' });
  native.updates.onStatus(upd);
  upd(native.updates.status());
}

async function start() {
  await Promise.race([Promise.resolve(native?.ready), sleep(1500)]);
  if (resume()) go('home');
  else go('first');
  requestAnimationFrame(() => requestAnimationFrame(launchReady));   // drawn: the launch can wipe to it
}
start();

// Lets the CI emulator test drive the app. Only present in test builds.
if (window.TUNER_TEST) {
  window.__tunerTest = {
    go, back, state: () => ({ tv: true, bridge: !!native, screen: current(), focus: document.activeElement?.dataset?.tab || document.activeElement?.className || '', acc: !!S.acc, games: nba.today.length, watching: watching() }),
  };
}
