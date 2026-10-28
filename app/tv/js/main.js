// airglow TV: start-up, the remote's keys, and Back.
import { $, sleep, ic } from './util.js';
import { S, on, emit, settings, store } from './state.js';
import { setBase, move, focus, entryOf, inLayer, topLayer } from './focus.js';
import { closeTop, overlayKey, toast } from './ui.js';
import { register, go, pop, nav, current, screenDef, screenEl, focusTab, setBar, barHidden, refresh } from './router.js';
import { resetGuides } from './guide.js';
import { native } from './native.js';
import { resume } from './session.js';
import { startNba, myGame, nba, liveShown } from './games.js';
import { watching } from './player.js';
import { busy, ensure } from './catalog.js';
import home, { gameLit } from './screens/home.js';
import live from './screens/live.js';
import lib from './screens/lib.js';
import detail from './screens/detail.js';
import nbaHub from './screens/nba.js';
import game from './screens/game.js';
import team from './screens/team.js';
import search from './screens/search.js';
import saved from './screens/saved.js';
import account from './screens/account.js';
import first from './screens/first.js';
import { launchOpen, launchReady, launchKey } from './launch.js';
import { sfx } from './sfx.js';
import { initSubs } from './subs.js';

const app = $('#app');
setBase(app);
// Sounds: the Account choice, else on (or off when the TV's own system sounds are off; known once the bridge answers).
sfx.init();
// (the TV's system sounds setting as it was last time, so the launch chord doesn't play on a TV that has them off)
// On unless you turned them down in Account. (Android TV's own System sounds switch is off on many TVs out of the box,
// so following it meant no sounds at all.)
sfx.mode(settings().sounds || 'on');
app.addEventListener('tvfocus', (e) => sfx.focused(e.target));
// The layout is drawn for 960 x 540 CSS px (a 1080p TV at 2x); other screens scale it.
function fit() { const z = window.innerWidth / 960; document.body.style.zoom = Math.abs(z - 1) > 0.01 ? z : ''; }
fit();
window.addEventListener('resize', fit);

[home, live, lib('movie'), lib('series'), detail, nbaHub, game, team, search, saved, account, first].forEach(register);

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
// OK held down: the remote sends keydowns every ~50 ms until it is let go, and a TV's WebView doesn't always mark them
// as repeats. Only the first counts; the rest are dropped everywhere (so a hold opens its menu and never also presses
// the menu's first row, and never starts a film several times). A press more than 400 ms after the last keydown is a
// new press even if its keyup went missing (the player took the key).
let okIsDown = false, okLast = 0;
document.addEventListener('keydown', (e) => {
  const k = keyName(e);
  if (!k) return;
  if (k === 'ok') {
    const now = performance.now(), again = e.repeat || (okIsDown && now - okLast < 400);
    okIsDown = true; okLast = now;
    if (again) { e.preventDefault(); e.stopPropagation(); return; }
  }
  // A held key's repeats that waited behind a busy moment are dropped, so focus never runs on by several rows.
  if (e.repeat && DIRS.has(k) && performance.now() - e.timeStamp > 250) { e.preventDefault(); e.stopPropagation(); return; }
  if (!launchOpen()) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) launchKey(); return; }   // keys count from the wipe on; one skips to Home once it's ready
  if (typing()) {
    // The keyboard owns the field; Back (or ▲▼) leaves it without leaving the page.
    if (!['back', 'up', 'down'].includes(k)) return;
    const f = document.activeElement;
    f.readOnly = true;
    if (k === 'back') { e.preventDefault(); f.blur(); focus(f); return; }
  }
  e.preventDefault();
  e.stopPropagation();   // handled here; a key that opens a field must not also reach it
  if (DIRS.has(k)) { document.documentElement.classList.toggle('rep', e.repeat); sfx.dir(k, e.repeat); }
  if (overlayKey(k, e)) return;
  const def = screenDef();
  if (!inLayer() && def?.key?.(k, e)) return;
  if (DIRS.has(k)) { move(k, { repeat: e.repeat }); return; }
  if (k === 'ok') { okPress(e); return; }
  if (k === 'back') { if (!e.repeat) back(); return; }
  if (k === 'search') { go('search'); return; }
  if (k === 'digit' && !inLayer() && S.acc && current() !== 'first') { go('live', { digit: e.key }); }   // (not before you've signed in)
}, true);
document.addEventListener('keyup', (e) => {
  const k = keyName(e);
  if (DIRS.has(k)) document.documentElement.classList.remove('rep');
  if (k === 'ok') okIsDown = false;
  if (k === 'ok' && okDown) {
    const d = okDown; okDown = null; clearTimeout(d.timer);
    // (a redraw while OK was down puts focus on the same item drawn anew: same data-key, still that press)
    const a = document.activeElement, same = a === d.el || (!d.el.isConnected && a?.dataset?.key && a.dataset.key === d.el.dataset.key);
    if (!d.held && same) { okSound(a); a.click(); }
  }
}, true);
// OK clicks at once, except on things you can hold (cards, guide cells): those click on release, or open their menu at 500 ms.
function okPress(e) {
  const el = document.activeElement;
  if (!el || el === document.body || !topLayer()?.contains(el)) { focus(entryOf(topLayer())); return; }
  if (e.repeat) return;
  if (!el.hasAttribute('data-hold')) { okSound(el); el.click(); return; }
  el.classList.add('pressing');
  okDown = { el, held: false, timer: setTimeout(() => {
    if (okDown?.el !== el) return;
    const a = document.activeElement, to = el.isConnected ? el : a?.dataset?.key && a.dataset.key === el.dataset.key ? a : null;
    okDown.held = true; el.classList.remove('pressing');
    to?.dispatchEvent(new CustomEvent('tvhold', { bubbles: true }));
  }, 500) };
  setTimeout(() => el.classList.remove('pressing'), 600);
}

// OK's sound, asked for just before the click (a sheet the click opens asks for its own, which wins). Typing is silent.
const okSound = (el) => { if (!el.closest('.kb, .kbrow')) sfx.request('select'); };

// Back: close the sheet; leave a page; in a tab's content go to the top and the tab; on a tab go Home; Home exits.
export function back() {
  if (closeTop()) return;   // (closing a sheet sounds 'close')
  if (screenDef()?.back?.(screenEl())) { sfx.request('back'); return; }
  if (nav.stack.length) { sfx.request('back'); pop(); return; }
  const inBar = $('#topbar').contains(document.activeElement);
  if (!inBar && current() !== 'first') {
    const scr = screenEl();
    screenDef()?.toTop?.(scr);
    // Back to the top: the next Down lands at the start, not where you were.
    scr._last = null;
    scr.querySelectorAll('[data-row],[data-col],[data-grid]').forEach((b) => (b._mem = null));
    barHidden(false); focusTab(); sfx.request('back'); return;
  }
  if (current() !== 'home' && S.acc) { sfx.request('back'); go('home'); return; }
  native?.exit();
}
native?.onBack(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
window.addEventListener('popstate', () => {});

// ---------- start ----------
// A refreshed catalog is swapped in at once unless its section is on screen.
busy.showing = (k) => { const c = current(); return c === k || (k !== 'live' && c === 'detail'); };
// No big catalog refresh while your team is playing (seconds of work and a lot of memory, mid-game).
busy.gameOn = () => !nba.stale && myGame()?.state === 'in';
on('nba', () => setBar({ live: liveShown(myGame()) && !gameLit() }));   // (not while Home's lit line is the game: home-final SPEC 8)   // (behind in its replay: on the clock, catch-up 7.2)
let offlineT = 0;   // the Offline bar's retry
on('session', () => {
  // a new session starts online: an Offline bar from the last one (or from before signing out) goes
  S.offline = false; clearTimeout(offlineT);
  const bar = $('#offline'); if (bar) bar.hidden = true;
  if (!S.acc) return;
  const n = S.acc.name || '';
  setBar({ avatar: (n.match(/\p{L}/u)?.[0] || '').toUpperCase() });
  startNba();
});
on('signed-out', (msg) => go('first', { error: msg }));
// Offline: a slim bar that stays while the provider can't be reached (a toast went by unseen under the launch),
// and a quiet retry every 30 s; when it answers again the bar goes and the guide is asked again.
on('offline', () => {
  let bar = $('#offline');
  if (!bar) { bar = document.createElement('div'); bar.id = 'offline'; bar.className = 'offline-bar'; app.appendChild(bar); }
  bar.innerHTML = `${ic('wifiOff', 'sm')}<span><b>Offline</b> · showing what airglow remembers · trying again</span>`;
  bar.hidden = false;
  clearTimeout(offlineT);
  const retry = () => {
    if (!S.src || !S.offline) { bar.hidden = true; return; }
    S.src.login().then((d) => {
      S.offline = false; S.info = d; bar.hidden = true;
      resetGuides(); emit('online'); refresh();
    }).catch(() => { offlineT = setTimeout(retry, 30000); });
  };
  offlineT = setTimeout(retry, 30000);
});
if (native) {
  const upd = (st) => setBar({ update: st?.state === 'ready' });
  native.updates.onStatus(upd);
  upd(native.updates.status());
}

async function start() {
  initSubs();   // the subtitle settings' move from subLang (design/ui-v1/subtitles/SPEC.md 6.2), once
  await Promise.race([Promise.resolve(native?.ready), sleep(1500)]);
  if (resume()) {
    // Home's first look needs the channel list (last channel, On now); the saved copy loads inside the launch.
    await Promise.race([ensure('live').catch(() => null), sleep(700)]);
    go('home');
  } else go('first');
  requestAnimationFrame(() => requestAnimationFrame(launchReady));   // drawn: the launch can wipe to it
}
start();

// Lets the CI emulator test drive the app. Only present in test builds.
if (window.TUNER_TEST) {
  window.__tunerTest = {
    go, back, state: () => ({ tv: true, bridge: !!native, screen: current(), focus: document.activeElement?.dataset?.tab || document.activeElement?.className || '', acc: !!S.acc, games: nba.today.length, watching: watching() }),
  };
}
