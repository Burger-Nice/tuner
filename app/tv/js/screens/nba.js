// NBA hub: day chips (◀▶ change day), your team's game as the broadcast-graphic hero, then the night's games as a 3-up
// grid ordered live, upcoming, final. Under the shield nothing on this page gives a score away (counts included).
import { $, esc, ic, dot, setHtml } from '../util.js';
import { on } from '../state.js';
import { catalog, ensure } from '../catalog.js';
import { nba, bestChannel, dayGames, dayLabel, isMine, mySide, show, shieldMode, findFeeds, feedsNow, teamChannel, reveal, startNba } from '../games.js';
import { gameCard, gameHero } from '../cards.js';
import { playLive, watching } from '../player.js';
import { push, current, mayFocus, barHidden } from '../router.js';
import { focus } from '../focus.js';
import { toast } from '../ui.js';
import { ringFor, ringName } from './home.js';

let el, offset = 0, games = [], loading = false, err = '', rowShift = 0;

const counts = (list) => {
  const n = (s) => list.filter((g) => g.state === s).length;
  return [n('in') && `${n('in')} live`, n('pre') && `${n('pre')} later`, n('post') && `${n('post')} final`].filter(Boolean).join(dot) || (err ? '' : 'No games');
};
const channelFor = (g) => bestChannel(g);

let behind = false;
on('player-closed', () => { if (behind) { behind = false; draw(); } });
function draw() {
  if (watching()) { behind = true; return; }   // nothing to see under the TV player; drawn once it closes
  if (!el || el.hidden) return;
  const mine = games.find(isMine);
  const rest = games.filter((g) => g !== mine);
  const day = (o) => dayLabel(o).split(' · ')[0];
  const shieldNote = shieldMode() !== 'off' ? `<span class="t-cap row-flex" style="gap:6px;margin-right:14px;color:var(--a-text-2)">${ic('eyeOff', 'sm')}Shield: ${shieldMode() === 'all' ? 'All games' : 'My team'}</span>` : '';
  const head = `<div class="dayrow"><span class="t-head">NBA</span>
    <span class="row-flex" data-row data-days style="gap:8px;margin-left:12px"><span class="chip lg" data-day="-1">${ic('chevL')}${esc(day(offset - 1))}</span><span class="chip lg fx sel" tabindex="-1" data-day="0">${esc(dayLabel(offset))}</span><span class="chip lg" data-day="1">${esc(day(offset + 1))}${ic('chevR')}</span></span>
    <span class="grow"></span>${shieldNote}<span class="t-cap">${loading ? 'Loading…' : counts(games)}</span></div>`;
  const hero = mine ? gameHero(mine, { channel: channelFor(mine), feeds: feedsNow(mine).length, top: 128, hub: true }) : '';
  const gridTop = mine ? 368 : 180;
  const body = err && !games.length ? `<div class="center-col" style="top:200px"><div class="state big"><div class="ico">${ic('wifiOff')}</div><b>Scores aren't reachable</b><p>${esc(err)}</p></div></div>`
    : !games.length && !loading ? `<div class="center-col" style="top:220px"><div class="state big"><div class="ico">${ic('clock')}</div><b>No games ${offset ? 'that day' : 'today'}</b><p>Use the arrows on the day chips to look at another day.</p></div></div>`
    : `${hero}${rest.length ? `<div class="abs rowtitle" style="left:48px;top:${gridTop - 36}px;font-size:20px">${offset ? 'Games' : 'Tonight'}<small>${rest.length} ${rest.length === 1 ? 'game' : 'games'}${dot}live first</small></div>` : ''}
      <div class="nba-grid" data-grid data-cols="3" style="top:${gridTop}px">${rest.map((g, i) => gameCard(g, i)).join('')}</div>`;
  setHtml(el.querySelector('.page'), head + body);
  el._rest = rest; el._mine = mine;
  place();
}
// Rows past the second slide up into view, but never past the last row: it stops at the bottom of the screen, so there's
// no empty space under it. Scrolled, the top bar steps away (as in Movies) and the rows above fade under the top edge.
const ROW = 140, CARD = 124, BOTTOM = 540 - 24;
function place() {
  const a = document.activeElement, grid = el.querySelector('.nba-grid');
  let shift = 0;
  if (grid?.contains(a)) {
    const i = [...grid.children].indexOf(a.closest('.gc')), rowI = Math.floor(i / 3);
    const top = parseFloat(grid.style.top), rows = Math.ceil(grid.children.length / 3);
    if (rowI >= 1) shift = (rowI - (el._mine ? 0 : 1)) * ROW + (el._mine ? 240 : 0);
    shift = Math.min(shift, Math.max(0, top + rows * ROW - (ROW - CARD) - BOTTOM));   // the last row's bottom on the edge
    shift = Math.max(shift, top + rowI * ROW + CARD - BOTTOM, 0);                     // the focused row always whole
  }
  el.querySelector('.page').style.transform = shift > 0 ? `translateY(${-shift}px)` : '';
  el.querySelector('.hub-cover').hidden = !(shift > 0);
  if (current() === 'nba') barHidden(shift > 0);
}
async function load(o) {
  offset = o; loading = true; err = ''; draw();
  let got, bad = '';
  try { got = await dayGames(o); } catch (e) { bad = e.message; got = []; }
  if (o !== offset) return;   // you've moved to another day since: this answer is for a day that's no longer shown
  games = got; err = bad;
  loading = false;
  if (current() === 'nba') { draw(); if ((!el.contains(document.activeElement) && mayFocus()) || document.activeElement.dataset.day) focus(el.querySelector('[data-day="0"]')); }
}

function heroAct(act) {
  const g = el._mine;
  if (!g) return;
  if (act === 'primary') {
    if (g.state === 'post') return push('game', { id: g.id });
    const ch = channelFor(g);
    if (!ch) { toast('No channel found for this game yet. Pick it from Home or the guide and it will be remembered.', 5000); return; }
    return playLive(ch, ringFor(ch), ringName(ch));
  }
  if (act === 'reveal') return reveal(g.id);
  if (act === 'box') return push('game', { id: g.id });
  if (act === 'plays') return push('game', { id: g.id, tab: 'plays' });
}

export default {
  name: 'nba',
  mount(root) {
    el = root;
    root.innerHTML = '<div class="page"></div><div class="lib-cover hub-cover" hidden></div>';
    root.addEventListener('click', (e) => {
      const d = e.target.closest('[data-day]');
      if (d) { const v = +d.dataset.day; if (v) load(offset + v); return; }
      const b = e.target.closest('[data-act]');
      if (b && b.closest('.hero-plate')) return heroAct(b.dataset.act);
      const c = e.target.closest('.gc');
      if (c) push('game', { id: c.dataset.g });
    });
    // ◀▶ on the day chips change the day (the selected chip stays the centre one).
    root.addEventListener('tvfocus', place);
    const redraw = () => { if (current() === 'nba') { if (!offset) games = nba.today; draw(); } };
    on('nba', redraw); on('summary', redraw); on('feeds', redraw);
  },
  enter(root) {
    startNba();
    ensure('live').catch(() => {});
    if (offset === 0) { games = nba.today; loading = !nba.today.length && !nba.err; err = nba.err; draw(); const m = games.find(isMine); if (m) findFeeds(m); }
    else load(offset);
  },
  entry: (root) => root.querySelector('.hero-plate .btn') || root.querySelector('.gc') || root.querySelector('[data-day="0"]'),
  key(k) {
    const a = document.activeElement;
    if (a?.dataset?.day === '0' && (k === 'left' || k === 'right')) { load(offset + (k === 'right' ? 1 : -1)); return true; }
    return false;
  },
  leave() { barHidden(false); },
  toTop(root) { root.querySelector('.page').style.transform = ''; root.querySelector('.hub-cover').hidden = true; },
};
