// airglow iPhone: start-up, the tab bar, Back, Offline (design/ui-v1/phone-v1/SPEC.md 2). The bridge goes first: the
// TV modules below read it when they load (bridge.js).
import './bridge.js';
import { S, on, emit, settings } from '../tv/js/state.js';
import { resume } from '../tv/js/session.js';
import { startNba, myGame, nba, liveShown } from '../tv/js/games.js';
import { busy, ensure } from '../tv/js/catalog.js';
import { staleGuides } from '../tv/js/guide.js';
import { launchReady } from '../tv/js/launch.js';
import { initSubs } from '../tv/js/subs.js';
import { register as tvRegister } from '../tv/js/router.js';
import { sleep } from '../tv/js/util.js';
import { ic, esc, register, go, push, back, current, onNav, nav } from './ui.js';
import { playerOpen } from './player.js';
import home from './home.js';
import live, { dayPage } from './live.js';
import nbaTab, { gamePage, teamScreen } from './nba.js';
import lib from './library.js';
import detail from './detail.js';
import search from './search.js';
import account from './account.js';
import signin from './signin.js';

window.__phAcc = () => S.acc?.name || '';
[home, live, dayPage, nbaTab, gamePage, teamScreen, lib, detail, search, account, signin].forEach(register);
// The TV's own code pushes its pages by name (replay.js: the game page; actions.js: a title's page): its router's
// screens are stand-ins that open the phone's page instead.
const FORWARD = { detail: (p) => push('detail', { title: p.title }), game: (p) => push('game', { id: p.id }), team: (p) => (p.abbr ? push('team', { abbr: p.abbr }) : go('nba')), account: () => push('account'), first: () => go('signin'),
  home: () => go('home'), live: () => go('live'), nba: () => go('nba'), movie: () => go('lib', { seg: 'movie' }), series: () => go('lib', { seg: 'series' }), saved: () => go('lib', { seg: 'saved' }), search: () => go('search') };
for (const [name, f] of Object.entries(FORWARD)) tvRegister({ name, enter: (el, params) => f(params || {}) });

// ---------- the tab bar ----------
const TABS = [['home', 'Home', 'home'], ['live', 'Live', 'liveTab'], ['nba', 'NBA', 'ball'], ['lib', 'Library', 'lib']];
const tabsEl = document.getElementById('ph-tabs');
function drawTabs() {
  const cur = nav.tab, scr = current();
  const show = !!S.acc && scr !== 'signin' && !playerOpen();
  tabsEl.hidden = !show;
  document.getElementById('ph-fade').hidden = !show;
  if (!show) return;
  const lv = liveShown(myGame());
  const html = `<div class="bar">${TABS.map(([k, l, i]) => `<button class="t${cur === k ? ' sel' : ''}" data-tab="${k}" aria-label="${l}">${ic(i)}<span>${l}</span>${k === 'nba' && lv ? '<span class="live">Live</span>' : ''}</button>`).join('')}</div><button class="srch${cur === 'search' ? ' sel' : ''}" data-tab="search" aria-label="Search">${ic('search')}</button>`;
  if (tabsEl._html !== html) { tabsEl.innerHTML = html; tabsEl._html = html; }   // (a redraw under a finger would lose its tap)
}
tabsEl.addEventListener('click', (e) => { if (tabsEl.classList.contains('mini') && e.target.closest('.bar')) { tabsEl.classList.remove('mini'); return; } const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });
onNav(drawTabs);
on('nba', drawTabs);
on('phone-player-closed', drawTabs);
// the bar minimises while a list scrolls down and comes back on a scroll up (SPEC 2)
let lastY = 0;
document.getElementById('ph-screens').addEventListener('scroll', (e) => {
  const el = e.target, y = el.scrollTop;
  if (Math.abs(y - lastY) < 12) return;
  tabsEl.classList.toggle('mini', y > lastY && y > 140);
  lastY = y;
}, true);
onNav(() => { tabsEl.classList.remove('mini'); lastY = 0; });

// ---------- the account ----------
busy.showing = (k) => current() === (k === 'live' ? 'live' : 'lib');
busy.gameOn = () => !nba.stale && myGame()?.state === 'in';
on('session', () => { S.offline = false; offline(false); if (S.acc) startNba(); drawTabs(); });
on('signed-out', (msg) => go('signin', { error: msg }));
let offT = 0;
function offline(onOff) {
  const el = document.getElementById('ph-offline');
  el.hidden = !onOff;
  if (onOff) el.innerHTML = `${ic('globe')}Offline · showing what airglow remembers`;
}
on('offline', () => {
  offline(true);
  clearTimeout(offT);
  const retry = () => {
    if (!S.src || !S.offline) { offline(false); return; }
    S.src.login().then((d) => { S.offline = false; S.info = d; offline(false); staleGuides(); emit('online'); }).catch(() => { offT = setTimeout(retry, 30000); });
  };
  offT = setTimeout(retry, 30000);
});
// the system's Back (a swipe from the edge is in ui.js); Escape in a desktop browser
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') back(); });

async function start() {
  const CAP = window.Capacitor?.Plugins || {};
  try { CAP.StatusBar?.setStyle?.({ style: 'DARK' }); } catch { /* none */ }
  try { CAP.ScreenOrientation?.lock?.({ orientation: 'portrait' }); } catch { /* none */ }
  initSubs();
  launchReady();   // (the TV's launch animation isn't drawn here; its "done" lets the guide scans start)
  if (resume()) {
    await Promise.race([ensure('live').catch(() => null), sleep(700)]);
    go('home');
  } else go('signin');
  drawTabs();
}
start();

if (window.TUNER_TEST) {
  window.__tunerTest = { go, push, back, state: () => ({ phone: true, screen: current(), acc: !!S.acc, games: nba.today.length, team: settings().nbaTeam || 'MEM', player: window.__phonePlayer?.state() || null }) };
}
void esc;
