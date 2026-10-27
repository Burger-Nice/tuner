// The NBA tab's Games section (SPEC 1.1): your team's current or next game as the broadcast-graphic hero (whatever day is
// picked), the day chips under it (◀▶ change day), then that day's games as a 3-up grid ordered live, upcoming, final.
// Under the shield nothing here gives a score away (counts included). Hold OK on a card: its teams' pages.
import { esc, ic, dot, setHtml, hm } from '../util.js';
import { on } from '../state.js';
import { ensure } from '../catalog.js';
import { nba, bestChannel, dayGames, dayLabel, isMine, favTeam, show, findFeeds, feedsNow, reveal, startNba, myGame } from '../games.js';
import { peek, want } from '../league.js';
import { gameCard, gameHero } from '../cards.js';
import { playLive, watching } from '../player.js';
import { push } from '../router.js';
import { focus } from '../focus.js';
import { toast, contextMenu } from '../ui.js';
import { ringFor, ringName } from '../screens/home.js';

let el, ctx, offset = 0, games = [], loading = false, err = '';

const counts = (list, hero) => {
  const n = (s) => list.filter((g) => g.state === s).length;
  const all = list.length + (hero ? 1 : 0);
  if (!list.length) return err || !all ? (err ? '' : 'No games') : '';
  return [`${list.length} ${hero ? 'more ' : ''}${list.length === 1 ? 'game' : 'games'}`, n('in') && `${n('in')} live`, n('in') && 'live first'].filter(Boolean).join(dot);
};

// The hero: your team's game today, else a final of the last 12 h, else the next game on its schedule.
export function heroGame() {
  const mine = myGame();
  if (mine) return mine;
  const t = favTeam();
  const d = t && peek(`schedule:${t}`)?.data;
  if (!d) return null;
  const now = Date.now();
  const recent = [...d.games].reverse().find((g) => g.state === 'post' && now - g.date < 15 * 3600e3);
  const g = recent || d.games.find((x) => x.state !== 'post' && x.date > now - 4 * 3600e3);
  return g ? withRecords(g) : null;
}
// A schedule's game carries no records: the standings have them (recordFor still decides what may show).
function withRecords(g) {
  if (g.home.record && g.away.record) return g;
  const st = peek('standings')?.data;
  if (!st) { want('standings'); return g; }
  const rec = (abbr) => { const t = st.confs.flatMap((c) => c.teams).find((x) => x.abbr === abbr); return t ? `${t.w}-${t.l}` : ''; };
  return { ...g, home: { ...g.home, record: g.home.record || rec(g.home.abbr) }, away: { ...g.away, record: g.away.record || rec(g.away.abbr) } };
}

let behind = false;
on('player-closed', () => { if (behind) { behind = false; draw(); } });
function draw() {
  if (!el || !ctx?.visible()) return;
  if (watching()) { behind = true; return; }   // nothing to see under the TV player; drawn once it closes
  const mine = heroGame();
  const rest = games.filter((g) => g.id !== mine?.id);
  const day = (o) => dayLabel(o).split(' · ')[0];
  const dayTop = mine ? 332 : 128, gridTop = dayTop + 48;
  const days = `<div class="nb-days" data-row data-days style="top:${dayTop}px"><span class="chip lg" data-day="-1">${ic('chevL')}${esc(day(offset - 1))}</span><span class="chip lg fx sel" tabindex="-1" data-day="0">${esc(dayLabel(offset))}</span><span class="chip lg" data-day="1">${esc(day(offset + 1))}${ic('chevR')}</span>
    <span class="t-cap">${loading ? 'Loading…' : counts(rest, mine && games.some((g) => g.id === mine.id))}</span></div>`;
  const hero = mine ? gameHero(mine, { channel: bestChannel(mine), feeds: feedsNow(mine).length, top: 128, hub: true }) : '';
  const body = err && !games.length ? `<div class="center-col" style="top:${gridTop + 8}px"><div class="state big"><div class="ico">${ic('wifiOff')}</div><b>Scores aren't reachable</b><p>${esc(err)}</p></div></div>`
    : !games.length && !loading ? `<div class="center-col" style="top:${gridTop + 8}px"><div class="state"><div class="ico">${ic('clock')}</div><b>No games ${offset ? 'that day' : 'today'}</b><p>◀ ▶ on the day picks another day.</p></div></div>`
    : `<div class="nba-grid" data-grid data-cols="3" style="top:${gridTop}px">${rest.map((g, i) => gameCard(g, i)).join('')}</div>`;
  setHtml(el.querySelector('.page'), hero + days + body);
  el._mine = mine;
  place();
}
// Rows past the first slide up into view, but never past the last row: it stops at the bottom of the screen, so there's
// no empty space under it. Scrolled, the top bar and section row step away and the rows above fade under the top edge.
const ROW = 140, CARD = 124, BOTTOM = 508, COVER = 84;   // (a focused card's ring reaches the safe line, 513)
function place() {
  const a = document.activeElement, grid = el.querySelector('.nba-grid');
  let shift = 0;
  if (grid?.contains(a)) {
    const i = [...grid.children].indexOf(a.closest('.gc')), rowI = Math.floor(i / 3);
    const top = parseFloat(grid.style.top), rows = Math.ceil(grid.children.length / 3);
    if (rowI >= 1) shift = top + rowI * ROW - (COVER + ROW);                           // the focused row second from the top
    shift = Math.min(shift, Math.max(0, top + rows * ROW - (ROW - CARD) - BOTTOM));   // the last row's bottom on the edge
    shift = Math.max(shift, top + rowI * ROW + CARD - BOTTOM, 0);                     // the focused row always whole
  }
  el.querySelector('.page').style.transform = shift > 0 ? `translateY(${-shift}px)` : '';
  el.querySelector('.hub-cover').hidden = !(shift > 0);
  ctx.scrolled(shift > 0);
}
async function load(o) {
  offset = o; loading = true; err = ''; draw();
  let got, bad = '';
  try { got = await dayGames(o); } catch (e) { bad = e.message; got = []; }
  if (o !== offset) return;   // you've moved to another day since: this answer is for a day that's no longer shown
  games = got; err = bad;
  loading = false;
  if (!ctx.visible()) return;
  draw();
  if (document.activeElement?.dataset?.day) focus(el.querySelector('[data-day="0"]'));
}

function heroAct(act) {
  const g = el._mine;
  if (!g) return;
  if (act === 'primary') {
    const ch = bestChannel(g);
    if (g.state === 'post' || (g.state === 'pre' && (g.date - Date.now() > 3 * 3600e3 || !ch))) return push('game', { id: g.id });   // (the hero's "Game page")
    if (!ch) { toast('No channel found for this game yet. Pick it from Home or the guide and it will be remembered.', 5000); return; }
    return playLive(ch, ringFor(ch), ringName(ch));
  }
  if (act === 'reveal') return reveal(g.id);
  if (act === 'box') return push('game', { id: g.id });
  if (act === 'plays') return push('game', { id: g.id, tab: 'plays' });
}
// Hold OK on a game card (and Home's Tonight row): its teams' pages, then the game (SPEC 1).
export function gameMenu(card, g) {
  if (!g) return;
  return contextMenu(card, [
    { icon: 'chevR', label: `${g.away.name} page`, run: () => push('team', { abbr: g.away.abbr }) },
    { icon: 'chevR', label: `${g.home.name} page`, run: () => push('team', { abbr: g.home.abbr }) },
    { icon: 'score', label: 'Open the game', run: () => push('game', { id: g.id }) },
  ]);
}

export default {
  id: 'games',
  label: () => 'Games',
  mount(root, c) {
    el = root; ctx = c;
    root.innerHTML = '<div class="nb-clip"><div class="page"></div></div><div class="lib-cover hub-cover" hidden></div>';   // (nothing below y 513)
    root.addEventListener('click', (e) => {
      const d = e.target.closest('[data-day]');
      if (d) { const v = +d.dataset.day; if (v) load(offset + v); return; }
      const b = e.target.closest('[data-act]');
      if (b && b.closest('.hero-plate')) return heroAct(b.dataset.act);
      const card = e.target.closest('.gc');
      if (card) push('game', { id: card.dataset.g });
    });
    root.addEventListener('tvhold', (e) => {
      const card = e.target.closest('.gc');
      if (card) gameMenu(card, games.find((g) => g.id === card.dataset.g));
    });
    root.addEventListener('tvfocus', place);
    const redraw = () => { if (ctx.visible()) { if (!offset) games = nba.today; draw(); } };
    on('nba', redraw); on('summary', redraw); on('feeds', redraw);
    on('league', (k) => { if (k === `schedule:${favTeam()}` || k === 'standings') redraw(); });
  },
  enter() {
    startNba();
    ensure('live').catch(() => {});
    if (favTeam()) want(`schedule:${favTeam()}`);
    if (offset === 0) { games = nba.today; loading = !nba.today.length && !nba.err; err = nba.err; draw(); const m = heroGame(); if (m && (m.state === 'in' || (m.state === 'pre' && m.date - Date.now() < 3 * 3600e3))) findFeeds(m); }
    else load(offset);
  },
  leave() {},
  meta: () => (nba.at ? `ESPN · ${hm(nba.at)}` : nba.err ? 'ESPN' : ''),
  entry: (root) => root.querySelector('.hero-plate .btn') || root.querySelector('.gc') || root.querySelector('[data-day="0"]'),
  key(k) {
    const a = document.activeElement;
    if (a?.dataset?.day === '0' && (k === 'left' || k === 'right')) { load(offset + (k === 'right' ? 1 : -1)); return true; }
    return false;
  },
  toTop(root) { root.querySelector('.page').style.transform = ''; root.querySelector('.hub-cover').hidden = true; },
};
