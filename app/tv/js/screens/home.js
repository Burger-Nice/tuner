// Home: one hero for the thing you came for (your team's game, else resume, else the last channel), then two rails.
// On a game day Continue watching sits above On now (resume = Down, OK); Tonight's games fills a free second row. The hero is chosen before first paint and
// kept for 3 s so the focused button never changes under your thumb.
import { $, esc, setHtml, ic } from '../util.js';
import { S, on, store, scoped, favList, continueRows, toggleFav, isFav, markWatched, settings } from '../state.js';
import { catalog, ensure } from '../catalog.js';
import { guideFor, guideNow, onNow, warm } from '../guide.js';
import { gameById, nba, bestChannel, myGame, isMine, mySide, findFeeds, feedsNow, feedsKnown, teamChannel, setTeamChannel, channelCandidates, reveal, gameOn, liveGames, show } from '../games.js';
import { gameHero, resumeHero, channelHero, liveCard, contCard, gameCard } from '../cards.js';
import { playLive, playVod, watching } from '../player.js';
import { push, go, current, barHidden } from '../router.js';
import { focus } from '../focus.js';
import { openOverlay, contextMenu, toast, scrollList } from '../ui.js';
import { resumeItem, openTitle } from '../actions.js';
import { launchOpen, launchDone } from '../launch.js';
import { gameMenu } from '../nba/hub.js';
import { heldLive } from '../games.js';
import { morningGame, WINDOW } from '../catchup.js';
import { heroAct, heroHold, resumeGame, watchFromTipoff, playProgramme } from '../replay.js';

let el, page, heroKind = null, heroLockUntil = 0, rows = [], railItems = {};
const ROW_TOP = [278, 422];

// Your team's game counts from 3 h before tip-off to 30 min after the final.
// Then (catch-up 5.1): your team's last game, hidden, with a replay (the morning after). Behind in a replay of it, the
// game counts as live until its tip-off + 3 h 30, on the clock.
function heroGame() {
  if (settings().heroGame === false) return null;   // Account > Home rows > Your team first
  const g = myGame();
  if (g) {
    if (g.state === 'in' || heldLive(g)) return g;
    if (g.state === 'pre' && g.date - Date.now() < 3 * 3600e3) return g;
    // (a final first seen long after its tip-off isn't "just ended": the morning-after row takes it, below)
    if (g.state === 'post' && Date.now() - g.date < WINDOW + 3600e3 && (!g._finalAt || Date.now() - g._finalAt < 30 * 60e3)) { g._finalAt = g._finalAt || Date.now(); return g; }
  }
  return morningGame();
}
function channelFor(g) {
  return bestChannel(g);
}
const lastChannel = () => catalog.live?.byId.get(store.get(scoped('lastLive'), '')) || null;

function onNowList(skip) {
  const live = catalog.live;
  if (!live) return [];
  const out = [], seen = new Set(skip ? [skip.id] : []);   // the hero's own channel isn't repeated under it
  const add = (ch) => { if (ch && !seen.has(ch.id)) { seen.add(ch.id); out.push(ch); } };
  // Other live games lead the row, then your favourites, then what you watched lately.
  for (const g of liveGames()) if (!isMine(g)) add(feedsNow(g)[0]?.ch);
  favList('live').forEach((f) => add(live.byId.get(f.id)));
  S.recents.forEach((id) => add(live.byId.get(id)));
  if (out.length < 6) live.items.slice(0, 12).forEach(add);
  return out.slice(0, 16);
}

let behind = false;
on('player-closed', () => { if (behind) { behind = false; draw(); } });
const kindNow = (g = heroGame(), cont = continueRows()) => (g ? 'game' : cont.length ? 'resume' : lastChannel() ? 'channel' : 'none');
function draw() {
  if (watching()) { behind = true; return; }   // nothing to see under the TV player; drawn once it closes
  if (!el || el.hidden) return;
  const g = heroGame();
  const cont = continueRows().slice(0, 16);
  // The kind of hero is decided once and locked for 3 s; its content (the score) still updates. Under the launch nobody
  // can see it yet, so it stays free until the launch has gone, and the 3 s count from there.
  let kind = kindNow(g, cont);
  // ('none' is never locked: it only means the channel list hasn't loaded yet)
  if (heroKind && heroKind !== 'none' && launchOpen() && Date.now() < heroLockUntil) kind = heroKind;
  if (!heroKind || heroKind === 'none' || !launchOpen()) heroLockUntil = Date.now() + 3000;
  heroKind = kind;
  let hero = '';
  if (kind === 'game' && g) {
    // Ask which channels carry it as soon as there's a game and a channel list (the 'feeds' event redraws).
    const searching = !feedsKnown(g) && !teamChannel(mySide(g).abbr);
    if (!feedsKnown(g) && catalog.live) findFeeds(g);
    const ch = channelFor(g);
    hero = gameHero(g, { channel: ch, feeds: feedsNow(g).length, searching });
  }
  else if (kind === 'resume' && cont[0]) hero = resumeHero(cont[0]);
  else if (kind === 'channel' && lastChannel()) { const ch = lastChannel(); hero = channelHero(ch, onNow(guideNow(ch))); }
  else hero = `<div class="hero-plate"><div class="abs" style="left:24px;top:24px"><div class="t-head">Welcome to airglow</div><div class="t-body" style="margin-top:8px;width:560px">${catalog.live ? 'Pick a channel in the guide to start. What you watch shows up here.' : 'Your channels, films and series are loading. Pick a channel from Live to start.'}</div></div><div class="abs row-flex hero-btns" data-row style="left:24px;top:132px"><span class="btn fx" tabindex="-1" data-act="guide">${ic('live')}Open the guide</span></div></div>`;
  const heroCh = kind === 'game' && g ? channelFor(g) : kind === 'channel' ? lastChannel() : null;
  const nowList = onNowList(heroCh);
  const tonight = nba.today.filter((x) => x !== g).slice(0, 15);
  railItems = { cont: kind === 'resume' ? cont.slice(1) : cont, now: nowList, games: tonight };
  const nowCards = nowList.map((ch, i) => { const p = onNow(guideNow(ch)); return liveCard(ch, p, { i, live: !!(p && gameOn(ch, [p])?.state === 'in'), pending: !guideNow(ch) }); }).join('');
  const contCards = railItems.cont.map((p, i) => contCard(p, i)).join('');
  const gameCards = tonight.map((x, i) => gameCard(x, i)).join('');
  const gamesTitle = tonight.some((x) => x.state !== 'post') ? "Tonight's games" : "Today's results";
  const order = kind === 'game' ? [['cont', 'Continue watching', contCards], ['now', 'On now', nowCards]] : [['now', 'On now', nowCards], ['cont', 'Continue watching', contCards]];
  order.push(['games', gamesTitle, gameCards]);
  rows = order.filter(([, , h]) => h).slice(0, 2);
  const rail = ([id, title, html], k) => `<div class="abs rowtitle" style="left:48px;top:${ROW_TOP[k]}px">${title}</div><div class="rail abs${k ? ' peek' : ''}" data-rail="${id}" style="top:${ROW_TOP[k] + 36}px;left:0;right:0"><div class="track" data-row data-mem>${html}</div></div>`;
  setHtml(page, `<div data-hero>${hero}</div>${rows.map(rail).join('')}`);
  el.querySelector('.edgefade').hidden = rows.length < 2;
  placeRails();
}
// Rails slide so the focused card keeps its place; the page lifts when the second row is focused.
function placeRails() {
  const a = document.activeElement;
  page.querySelectorAll('.track').forEach((tr) => {
    const f = tr.contains(a) ? a : tr._mem?.isConnected ? tr._mem : null;
    const step = (tr.firstElementChild?.classList.contains('gc') ? 272 : 198) + 24;   // card widths are fixed: no layout read
    // ...but never past the last card: at the end of the row the last cards fill the width instead of one and a gap
    const i = Math.min(f ? [...tr.children].indexOf(f) : 0, Math.max(0, tr.children.length - Math.floor((864 + 24) / step)));
    tr.style.transform = i > 0 ? `translateX(${-i * step}px)` : '';
  });
  const second = page.querySelectorAll('.rail')[1];
  const lift = second && second.contains(a);
  page.style.transform = lift ? 'translateY(-144px)' : '';
  el.querySelector('.topfade').hidden = !lift;
  if (current() === 'home') barHidden(lift);   // the lifted hero would slide under the top bar: it steps away, as in Movies
  el.querySelectorAll('.rail').forEach((r, k) => r.classList.toggle('peek', k === 1 && !lift));
}

function heroAction(act, btn) {
  const g = heroGame();
  if (heroKind === 'game' && g) {
    if (heroAct(g, btn?.closest('[data-row-kind]')?.dataset.rowKind, act)) return;
    const ch = channelFor(g);
    if (act === 'primary') {
      if (g.state === 'post') return push('game', { id: g.id });
      if (!ch) return chooseChannel(g);
      return playLive(ch, ringFor(ch), ringName(ch));
    }
    if (act === 'reveal') { reveal(g.id); return; }
    if (act === 'box' || act === 'plays') return push('game', { id: g.id, tab: act === 'plays' ? 'plays' : null });
    if (act === 'guide') return go('live');
  }
  if (heroKind === 'resume') {
    const p = continueRows()[0];
    if (!p) return;
    if (act === 'resume') return resumeItem(p.item);
    if (act === 'restart') return resumeItem(p.item, { restart: true });
    if (act === 'details') return openTitle(p.item);
  }
  if (act === 'tune') { const ch = lastChannel(); if (ch) playLive(ch, ringFor(ch), ringName(ch)); return; }
  if (act === 'guide') go('live');
}
// The zap ring is the group you tuned from: favourites when it's a favourite, else every channel.
export const ringFor = (ch) => (isFav(ch) ? favList('live').map((f) => catalog.live?.byId.get(f.id) || f) : catalog.live?.items || [ch]);
export const ringName = (ch) => (isFav(ch) ? 'Favourites' : 'All channels');

// Choose channel: the guide's match first, then NBA / League Pass channels, then the Sports group. Remembered per team.
async function chooseChannel(g) {
  const feeds = await findFeeds(g);
  const cands = await channelCandidates();
  const list = [...feeds.map((f) => ({ ch: f.ch, why: f.why })), ...cands.filter((c) => !feeds.some((f) => f.ch.id === c.id)).map((ch) => ({ ch, why: /\bnba\b|league pass/i.test(ch.name) ? 'League' : 'Sports group' }))].slice(0, 24);
  const name = `${g.away.name} at ${g.home.name}`;
  if (!list.length) { toast('No sports channels found. Pick the channel in Live and it will be remembered.', 5000); return go('live'); }
  const ov = openOverlay(`<div class="menu" style="left:48px;top:60px;width:560px;max-height:440px;overflow:hidden"><h3>Where is ${esc(name)}?</h3><div class="sheet-body" style="max-height:360px"><div data-col class="inner">${list.map((x, i) => {
    const p = onNow(guideNow(x.ch));
    return `<div class="lr fx" tabindex="-1" data-act="${i}" style="height:60px"><span class="logo sm">${x.ch.logo ? `<img src="${esc(x.ch.logo)}" alt="">` : esc(x.ch.name.slice(0, 2).toUpperCase())}</span><span class="grow ellipsis">${esc(x.ch.name)}<div class="t-cap ellipsis" style="margin-top:0">${esc(p?.title || '')}</div></span><small>${esc(x.why)}</small></div>`;
  }).join('')}</div></div><div class="t-cap" style="padding:8px 8px 2px">Your pick is remembered for this team.</div></div>`, {
    onClick: (act) => { const x = list[+act]; if (!x) return; ov.close(false); setTeamChannel(mySide(g).abbr, x.ch.id); playLive(x.ch, ringFor(x.ch), ringName(x.ch)); },
  });
  scrollList(ov.el);
}
// Hold OK on Watch live: the game's other channels.
async function otherFeeds(g) {
  const feeds = await findFeeds(g);
  if (feeds.length < 2) return chooseChannel(g);
  const ov = openOverlay(`<div class="menu" style="left:48px;top:150px;width:480px"><h3>Other channels for this game</h3><div data-col>${feeds.map((f, i) => `<div class="lr fx" tabindex="-1" data-act="${i}"><span class="grow ellipsis">${esc(f.ch.name)}</span><small>Feed ${i + 1} of ${feeds.length}</small></div>`).join('')}<div class="lr fx" tabindex="-1" data-act="choose"><span class="grow">Choose another channel</span></div></div></div>`, {
    onClick: (act) => { ov.close(false); if (act === 'choose') return chooseChannel(g); const f = feeds[+act]; setTeamChannel(mySide(g).abbr, f.ch.id); playLive(f.ch, ringFor(f.ch), ringName(f.ch)); },
  });
}

function railClick(id, i, card) {
  if (id === 'now') { const ch = railItems.now[i]; if (ch) playLive(ch, ringFor(ch), ringName(ch)); }
  if (id === 'cont') { const p = railItems.cont[i]; if (p) resumeItem(p.item); }
  if (id === 'games') { const x = railItems.games[i]; if (x) push('game', { id: x.id }); }
}
function railHold(id, i, card) {
  if (id === 'now') {
    const ch = railItems.now[i]; if (!ch) return;
    contextMenu(card, [
      { icon: 'saved', label: isFav(ch) ? 'Remove from Saved' : 'Save to Saved', run: () => { toast(toggleFav(ch) ? `Saved ${ch.name}` : `Removed ${ch.name}`); draw(); } },
      { icon: 'live', label: 'Open in the guide', run: () => go('live', { ch: ch.id }) },
    ]);
  } else {
    const p = railItems.cont[i]; if (!p) return;
    if (p.item.kind === 'rp') return replayMenu(card, p);
    contextMenu(card, [
      { icon: 'play', label: 'Resume', run: () => resumeItem(p.item) },
      { icon: 'check', label: 'Mark watched', run: () => { markWatched(p.item); draw(); } },
      { icon: 'info', label: 'Details', run: () => openTitle(p.item) },
    ]);
  }
}

// Hold OK on a replay in Continue watching (catch-up 5.2): From tip-off, Game page, Remove.
function replayMenu(card, p) {
  const it = p.item, remove = () => { delete S.progress[`rp:${it.id}`]; store.set(scoped('progress'), S.progress); draw(); };
  if (it.game) {
    const g = () => gameById(it.game.id) || it.game;
    return contextMenu(card, [
      { icon: 'play', label: 'Resume', run: () => resumeGame(g()) },
      { icon: 'tipoff', label: 'From tip-off', run: () => watchFromTipoff(g()) },
      { icon: 'score', label: 'Game page', run: () => push('game', { id: it.game.id }) },
      { icon: 'close', label: 'Remove', run: remove },
    ]);
  }
  const ch = catalog.live?.byId.get(it.ch);
  contextMenu(card, [
    { icon: 'play', label: 'Resume', run: () => ch && playProgramme(ch, { title: it.title, start: it.start, end: it.end }) },
    { icon: 'tipoff', label: 'Start over', run: () => ch && playProgramme(ch, { title: it.title, start: it.start, end: it.end }, { restart: true }) },
    { icon: 'close', label: 'Remove', run: remove },
  ]);
}

export default {
  name: 'home',
  mount(root) {
    el = root;
    root.innerHTML = '<div class="page"></div><div class="edgefade"></div><div class="topfade" hidden></div>';
    page = root.querySelector('.page');
    root.dataset.entry = '.hero-btns .btn';
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b && b.closest('[data-hero]')) return heroAction(b.dataset.act, b);
      const card = e.target.closest('.hc, .gc');
      if (card) railClick(card.closest('[data-rail]').dataset.rail, +card.dataset.i, card);
    });
    root.addEventListener('tvhold', (e) => {
      const gc = e.target.closest('.gc');
      if (gc) return gameMenu(gc, railItems.games[+gc.dataset.i]);
      const card = e.target.closest('.hc');
      if (card) return railHold(card.closest('[data-rail]').dataset.rail, +card.dataset.i, card);
      const hk = e.target.closest('[data-row-kind]')?.dataset.rowKind, hg = heroGame();
      if (hg && e.target.dataset.act && heroHold(hg, hk, e.target.dataset.act)) return;
      if (e.target.dataset.act === 'primary') { const g = heroGame(); if (g) otherFeeds(g); }
    });
    root.addEventListener('tvfocus', placeRails);
    // Under the launch each redraw of Home is a full style, layout and paint (100-200 ms on a TV) competing with the intro
    // for the TV's graphics: only a change of hero is drawn then (your game's score arriving); the rest waits for the
    // launch to finish and is drawn once.
    let later = false;
    launchDone.then(() => { if (later) { later = false; redraw(); } });
    const redraw = () => {
      if (current() !== 'home') return;
      if (!launchOpen() && kindNow() === heroKind) { later = true; return; }   // same hero: wait for the launch to go
      draw();
    };
    on('nba', redraw); on('summary', redraw); on('feeds', redraw); on('progress', redraw); on('favs', redraw); on('replays', redraw);
    on('catalog', (k) => { if (k === 'live') { redraw(); warmRails(); } });
    on('league', (k) => { if (k.startsWith('schedule:') || k === 'standings') redraw(); });   // (records under the shield)
    setInterval(redraw, 30000);
  },
  enter(root, params, { fresh }) {
    if (fresh) { heroKind = null; page.style.transform = ''; }
    draw();
    ensure('live').then(() => { draw(); warmRails(); }).catch(() => {});
    const g = myGame(); if (g) findFeeds(g);
  },
  entry: (root) => root.querySelector('.hero-btns .btn'),
  leave() { barHidden(false); },
  toTop() { page.style.transform = ''; el.querySelector('.topfade').hidden = true; },
};
// What's on now on the rail's channels: a couple at a time.
// The cards in view first, then the rest of the rail.
async function warmRails() {
  await launchDone;   // what's on now on the rail: its answers redraw Home, which waits for the launch to go
  const list = onNowList(), still = () => current() === 'home';
  warm(list.slice(0, 6), { still, urgent: true }).then((n) => { if (n) draw(); });
  warm(list.slice(6), { still }).then((n) => { if (n) draw(); });
}
