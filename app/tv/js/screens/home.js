// Home: one hero for the thing you came for (your team's game, else resume, else the last channel), then two rails.
// On a game day Continue watching sits above On now (resume = Down, OK). The hero is chosen before first paint and
// kept for 3 s so the focused button never changes under your thumb.
import { $, esc, setHtml, ic } from '../util.js';
import { S, on, store, scoped, favList, continueRows, toggleFav, isFav, markWatched } from '../state.js';
import { catalog, ensure } from '../catalog.js';
import { guideFor, guideNow, onNow, warm } from '../guide.js';
import { nba, myGame, isMine, mySide, findFeeds, feedsNow, teamChannel, setTeamChannel, channelCandidates, reveal, gameOn, liveGames, show } from '../games.js';
import { gameHero, resumeHero, channelHero, liveCard, contCard } from '../cards.js';
import { playLive, playVod } from '../player.js';
import { push, go, current } from '../router.js';
import { focus } from '../focus.js';
import { openOverlay, contextMenu, toast, scrollList } from '../ui.js';
import { resumeItem, openTitle } from '../actions.js';

let el, page, heroKind = null, heroLockUntil = 0, rows = [], railItems = {};
const ROW_TOP = [278, 422];

// Your team's game counts from 3 h before tip-off to 30 min after the final.
function heroGame() {
  const g = myGame();
  if (!g) return null;
  if (g.state === 'in') return g;
  if (g.state === 'pre' && g.date - Date.now() < 3 * 3600e3) return g;
  if (g.state === 'post' && (!g._finalAt || Date.now() - g._finalAt < 30 * 60e3)) { g._finalAt = g._finalAt || Date.now(); return g; }
  return null;
}
function channelFor(g) {
  const live = catalog.live;
  const pick = teamChannel(mySide(g).abbr);
  if (pick && live?.byId.get(pick)) return live.byId.get(pick);
  return feedsNow(g)[0]?.ch || null;
}
const lastChannel = () => catalog.live?.byId.get(store.get(scoped('lastLive'), '')) || null;

function onNowList() {
  const live = catalog.live;
  if (!live) return [];
  const out = [], seen = new Set();
  const add = (ch) => { if (ch && !seen.has(ch.id)) { seen.add(ch.id); out.push(ch); } };
  // Other live games lead the row, then your favourites, then what you watched lately.
  for (const g of liveGames()) if (!isMine(g)) add(feedsNow(g)[0]?.ch);
  favList('live').forEach((f) => add(live.byId.get(f.id)));
  S.recents.forEach((id) => add(live.byId.get(id)));
  if (out.length < 6) live.items.slice(0, 12).forEach(add);
  return out.slice(0, 16);
}

function draw() {
  if (!el || el.hidden) return;
  const g = heroGame();
  const cont = continueRows().slice(0, 16);
  // The kind of hero is decided once and locked for 3 s; its content (the score) still updates.
  let kind = g ? 'game' : cont.length ? 'resume' : lastChannel() ? 'channel' : 'none';
  if (heroKind && Date.now() < heroLockUntil) kind = heroKind;
  if (!heroKind) heroLockUntil = Date.now() + 3000;
  heroKind = kind;
  let hero = '';
  if (kind === 'game' && g) { const ch = channelFor(g); hero = gameHero(g, { channel: ch, feeds: feedsNow(g).length }); }
  else if (kind === 'resume' && cont[0]) hero = resumeHero(cont[0]);
  else if (kind === 'channel' && lastChannel()) { const ch = lastChannel(); hero = channelHero(ch, onNow(guideNow(ch))); }
  else hero = `<div class="hero-plate"><div class="abs" style="left:24px;top:24px"><div class="t-head">Welcome to airglow</div><div class="t-body" style="margin-top:8px;width:560px">Your channels, films and series are loading. Pick a channel from Live to start.</div></div><div class="abs row-flex hero-btns" data-row style="left:24px;top:132px"><span class="btn fx" tabindex="-1" data-act="guide">${ic('live')}Open the guide</span></div></div>`;
  const nowList = onNowList();
  railItems = { cont: kind === 'resume' ? cont.slice(1) : cont, now: nowList };
  const nowCards = nowList.map((ch, i) => { const p = onNow(guideNow(ch)); return liveCard(ch, p, { i, live: !!(p && gameOn(ch, [p])?.state === 'in') }); }).join('');
  const contCards = railItems.cont.map((p, i) => contCard(p, i)).join('');
  const order = kind === 'game' ? [['cont', 'Continue watching', contCards], ['now', 'On now', nowCards]] : [['now', 'On now', nowCards], ['cont', 'Continue watching', contCards]];
  rows = order.filter(([, , h]) => h);
  const rail = ([id, title, html], k) => `<div class="abs rowtitle" style="left:48px;top:${ROW_TOP[k]}px">${title}</div><div class="rail abs${k ? ' peek' : ''}" data-rail="${id}" style="top:${ROW_TOP[k] + 36}px;left:0;right:0"><div class="track" data-row data-mem>${html}</div></div>`;
  setHtml(page, `<div data-hero>${hero}</div>${rows.slice(0, 2).map(rail).join('')}`);
  el.querySelector('.edgefade').hidden = rows.length < 2;
  placeRails();
}
// Rails slide so the focused card keeps its place; the page lifts when the second row is focused.
function placeRails() {
  const a = document.activeElement;
  page.querySelectorAll('.track').forEach((tr) => {
    const f = tr.contains(a) ? a : tr._mem?.isConnected ? tr._mem : null;
    const i = f ? [...tr.children].indexOf(f) : 0;
    tr.style.transform = i > 0 ? `translateX(${-i * 222}px)` : '';
  });
  const second = page.querySelectorAll('.rail')[1];
  const lift = second && second.contains(a);
  page.style.transform = lift ? 'translateY(-144px)' : '';
  el.querySelectorAll('.rail').forEach((r, k) => r.classList.toggle('peek', k === 1 && !lift));
}

function heroAction(act, btn) {
  const g = heroGame();
  if (heroKind === 'game' && g) {
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
    contextMenu(card, [
      { icon: 'play', label: 'Resume', run: () => resumeItem(p.item) },
      { icon: 'check', label: 'Mark watched', run: () => { markWatched(p.item); draw(); } },
      { icon: 'info', label: 'Details', run: () => openTitle(p.item) },
    ]);
  }
}

export default {
  name: 'home',
  mount(root) {
    el = root;
    root.innerHTML = '<div class="page"></div><div class="edgefade"></div>';
    page = root.querySelector('.page');
    root.dataset.entry = '.hero-btns .btn';
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b && b.closest('[data-hero]')) return heroAction(b.dataset.act, b);
      const card = e.target.closest('.hc');
      if (card) railClick(card.closest('[data-rail]').dataset.rail, +card.dataset.i, card);
    });
    root.addEventListener('tvhold', (e) => {
      const card = e.target.closest('.hc');
      if (card) return railHold(card.closest('[data-rail]').dataset.rail, +card.dataset.i, card);
      if (e.target.dataset.act === 'primary') { const g = heroGame(); if (g) otherFeeds(g); }
    });
    root.addEventListener('tvfocus', placeRails);
    const redraw = () => { if (current() === 'home') draw(); };
    on('nba', redraw); on('summary', redraw); on('feeds', redraw); on('progress', redraw); on('favs', redraw);
    on('catalog', (k) => { if (k === 'live') { redraw(); warmRails(); } });
    setInterval(redraw, 30000);
  },
  enter(root, params, { fresh }) {
    if (fresh) { heroKind = null; page.style.transform = ''; }
    draw();
    ensure('live').then(() => { draw(); warmRails(); }).catch(() => {});
    const g = myGame(); if (g) findFeeds(g);
  },
  entry: (root) => root.querySelector('.hero-btns .btn'),
  toTop() { page.style.transform = ''; },
};
// What's on now on the rail's channels: a couple at a time.
function warmRails() { const list = onNowList(); warm(list, { still: () => current() === 'home' }).then((n) => { if (n) draw(); }); }
