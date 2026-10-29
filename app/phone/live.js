// Live (SPEC 3.2, 03): the guide as channel rows. The top card is the last channel watched (Tune, Earlier); the chip
// row is the TV's group picker (Favourites, All channels, the provider's groups; Live games first while one is on);
// each row: number, tile, name with the LIVE pill, the programme on now (the shield's view of it), its bar,
// `until 20:55 · Next Fréttir` (review 2, M2: no second time). Tap tunes; the chevron opens the channel's day (the
// archive above now); swipe left favourites with an undo toast; long-press is the TV's hold-OK menu.
import { hm, leftText } from '../tv/js/util.js';
import { S, on, store, scoped, favList, toggleFav, isFav } from '../tv/js/state.js';
import { catalog, ensure } from '../tv/js/catalog.js';
import { guideFor, guideNow, guideFailed, onNow, nextUp, warm, pastFor, pastNow } from '../tv/js/guide.js';
import { myGame, gameOn, feedsNow, findFeeds, liveGames, knownGames } from '../tv/js/games.js';
import { programmeView, keptWords, NOT_KEPT } from '../tv/js/catchup.js';
import { playProgramme, watchOnChannel } from '../tv/js/replay.js';
import { playLive } from '../tv/js/player.js';
import { toast } from '../tv/js/ui.js';
import { avatar, ic, esc, push, isShown, menu, longPress, tileOf, sheet } from './ui.js';

let el, group = null, chans = [], shown = 60, q = '', searching = false;
const realOf = (c) => c.items.filter((x) => !x._sep);
function groups() {
  const c = catalog.live;
  if (!c) return [];
  const counts = new Map(), items = realOf(c);
  for (const it of items) counts.set(it.cat, (counts.get(it.cat) || 0) + 1);
  const out = [];
  const fav = favList('live').length;
  if (fav) out.push(['fav', 'Favourites', fav]);
  if (liveGames().length) out.push(['games', 'Live games', liveGames().length]);
  out.push(['all', 'All channels', items.length]);
  const cats = c.cats.filter((k) => counts.get(k.id));
  // Sports first while a game is on (SPEC 3.2)
  const sport = (k) => /sport|nba/i.test(k.name);
  for (const k of liveGames().length ? [...cats.filter(sport), ...cats.filter((k) => !sport(k))] : cats) out.push([k.id, k.name, counts.get(k.id)]);
  return out;
}
const groupName = () => groups().find((g) => g[0] === group)?.[1] || 'All channels';
function listFor(g) {
  const c = catalog.live;
  if (!c) return [];
  const items = realOf(c);
  if (g === 'fav') return favList('live').map((x) => c.byId.get(x.id)).filter((x) => x && !x._sep);
  if (g === 'games') { const out = []; for (const gm of liveGames()) for (const f of feedsNow(gm)) if (!out.includes(f.ch)) out.push(f.ch); return out.length ? out : items; }
  if (g === 'all') return items;
  return items.filter((x) => x.cat === g);
}
function rebuild() {
  if (!group) group = store.get(scoped('phLiveGroup'), null) || (favList('live').length ? 'fav' : 'all');
  if (!groups().some((g) => g[0] === group)) group = 'all';
  let list = listFor(group);
  if (q) { const n = q.toLowerCase(); list = realOf(catalog.live).filter((c) => String(c.num) === n || c.name.toLowerCase().includes(n)); }
  // your team's game is pinned first while it's on
  const g = myGame(), pin = g?.state === 'in' ? feedsNow(g)[0]?.ch : null;
  chans = pin && !q ? [pin, ...list.filter((x) => x.id !== pin.id)] : list;
}
export const tune = (ch) => playLive(ch, chans.length && chans.includes(ch) ? chans : catalog.live?.items || [ch], q ? 'All channels' : groupName());
const lastCh = () => catalog.live?.byId.get(store.get(scoped('lastLive'), '')) || null;

function rowHtml(ch, i) {
  const list = guideNow(ch), now = onNow(list), next = nextUp(list);
  const v = now ? programmeView(ch, now) : null;
  const g = list ? gameOn(ch, list) : null;
  const live = g?.state === 'in' && !S.offline;
  const p = now ? Math.max(0, Math.min(100, ((Date.now() - now.start) / (now.end - now.start)) * 100)) : 0;
  const fav = isFav(ch) && group !== 'fav';
  const prog = !list ? `<span class="pg dim">${guideFailed(ch) ? 'Guide not answering' : '&nbsp;'}</span>` : now ? `<span class="pg">${esc(v.title)}</span>` : '<span class="pg dim">No guide information</span>';
  const nx = now && !S.offline ? `<span class="nx"><span class="bar4" style="--p:${p}%"><i></i></span><span class="tx">until ${hm(now.end)}${next ? ` · Next ${esc(programmeView(ch, next).title)}` : ''}</span></span>` : '';
  return `<div class="lv-wrap" data-i="${i}"><div class="lv-swipe">${ic(isFav(ch) ? 'starO' : 'star')}${isFav(ch) ? 'Unfavourite' : 'Favourite'}</div><button class="lv-ch" data-i="${i}"><span class="no">${ch.num || ''}</span>${tileOf(ch)}<span class="col"><span class="nm"><span class="n">${esc(ch.name)}</span>${fav ? ic('star') : ''}${live ? '<span class="live sm">Live</span>' : ''}</span>${prog}${nx}</span><span class="chev" data-day="${i}">${ic('chevR')}</span></button></div>`;
}
function nowCard() {
  const ch = lastCh();
  if (!ch) return '';
  const list = guideNow(ch), now = onNow(list);
  if (!list) guideFor(ch).then(() => soon()).catch(() => {});
  const v = now ? programmeView(ch, now) : null;
  const p = now ? ((Date.now() - now.start) / (now.end - now.start)) * 100 : 0;
  return `<div class="lv-now"><div class="th">${ch.logo ? `<img src="${esc(ch.logo)}" alt="">` : esc(ch.name.slice(0, 3))}</div><div class="col"><div class="ey">Last watched</div><div class="t">${esc(v?.title || ch.name)}</div><div class="m">${esc(ch.name)}${now ? ` · ${hm(now.start)}–${hm(now.end)} · ${leftText((now.end - Date.now()) / 1000)}` : ''}</div>${now ? `<div class="bar4" style="--p:${p}%"><i></i></div>` : ''}<div class="act"><button class="pill" data-act="tune-last">${ic('play')}Tune</button>${ch.archive > 0 ? '<button class="ghost" data-act="earlier">Earlier</button>' : ''}</div></div></div>`;
}
const HINTS = 'tuner.phLiveHint';
function hint() { try { const n = +localStorage.getItem(HINTS) || 0; if (n >= 5) return ''; return 'Tap plays · swipe left to favourite'; } catch { return ''; } }
function draw() {
  if (!el) return;
  if (!S.acc) { el.innerHTML = '<div class="ph-top"><h1>Live</h1></div><div class="state"><b>Sign in to watch</b></div>'; return; }
  const c = catalog.live;
  rebuild();
  const gs = groups();
  const chips = gs.map(([k, n, count]) => `<button class="chip${k === group && !q ? ' sel' : ''}${k === 'fav' ? ' ico' : ''}" data-group="${esc(k)}">${k === 'fav' ? ic('star') : ''}${esc(n)}${k === 'fav' ? ` · ${count}` : ''}</button>`).join('');
  const d = new Date();
  const top = `<div class="ph-top"><h1>Live</h1><span class="sp"></span><button class="ib" data-act="find" aria-label="Find a channel">${ic('search')}</button>${avatar()}</div>`;
  const search = searching ? `<div class="sr-field">${ic('search')}<input id="lv-q" value="${esc(q)}" placeholder="Channel number or name" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search"><button class="ib" data-act="clearq" aria-label="Clear">${ic('close')}</button></div>` : '';
  const body = !c ? Array.from({ length: 6 }, () => '<div class="lv-ch sk"><span class="no"></span><span class="tile"></span><span class="col"><span class="pg"></span></span></div>').join('')
    : !chans.length ? `<div class="state"><b>${q ? 'No channel by that name' : group === 'fav' ? 'No favourites yet' : 'No channels'}</b><p>${q ? 'Try a number or part of the name.' : group === 'fav' ? 'Swipe a channel left to add one.' : ''}</p></div>`
    : chans.slice(0, shown).map(rowHtml).join('') + (chans.length > shown ? '<div class="lb-more"><button class="ghost" data-act="more">More channels</button></div>' : '');
  const h = hint();
  const keepFocus = document.activeElement?.id === 'lv-q';
  const y = el.scrollTop;
  el.innerHTML = `${top}${search}${q ? '' : nowCard()}<div class="chips" style="margin-top:14px">${chips}</div><div class="lv-ruler"><span class="now">Now</span><b>${hm(Date.now())}</b><span>· ${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>${h ? `<div class="lv-hint">${h}</div>` : ''}<div class="lv-list">${body}</div>`;
  el.scrollTop = y;
  if (keepFocus) { const i = el.querySelector('#lv-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  warmShown();
}
let soonT = 0;
const soon = () => { clearTimeout(soonT); soonT = setTimeout(() => { if (isShown('live')) draw(); }, 200); };
// the guide for the rows on screen first, 3 at a time (guide.js's queue)
let warmT = 0;
function warmShown() {
  clearTimeout(warmT);
  warmT = setTimeout(() => {
    const vis = chans.slice(0, shown).filter((ch) => !guideNow(ch));
    if (vis.length) warm(vis.slice(0, 30), { still: () => isShown('live') }).then(soon).catch(() => {});
  }, 120);
}
function favSwipe(ch) {
  const on = !isFav(ch);
  toggleFav(ch, on);
  toast(on ? `${ch.name} added to favourites` : `${ch.name} removed from favourites`);
  try { localStorage.setItem(HINTS, String((+localStorage.getItem(HINTS) || 0) + 1)); } catch { /* none */ }
  draw();
}
function chMenu(ch) {
  const g = gameOn(ch, guideNow(ch));
  menu(ch.name, [
    { label: 'Tune', icon: 'play', run: () => tune(ch) },
    { label: isFav(ch) ? 'Remove from favourites' : 'Add to favourites', icon: 'star', run: () => favSwipe(ch) },
    { label: 'The channel\'s day', sub: ch.archive > 0 ? keptWords(ch.archive) : NOT_KEPT, icon: 'chevR', run: () => push('day', { id: ch.id }) },
    g ? { label: `${g.away.name} at ${g.home.name}`, sub: 'The game page', icon: 'ball', run: () => push('game', { id: g.id }) } : null,
  ]);
}
// swipe left on a row reveals Favourite (88 pt); let go past it and it's done
function swipes(root) {
  let s = null;
  root.addEventListener('touchstart', (e) => { const w = e.target.closest('.lv-wrap'); s = w ? { w, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, lock: null } : null; }, { passive: true });
  root.addEventListener('touchmove', (e) => {
    if (!s) return;
    const dx = e.touches[0].clientX - s.x, dy = e.touches[0].clientY - s.y;
    if (s.lock == null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) s.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (s.lock !== 'x') return;
    s.dx = Math.min(0, Math.max(-120, dx));
    s.w.querySelector('.lv-ch').style.transform = `translateX(${s.dx}px)`;
  }, { passive: true });
  root.addEventListener('touchend', () => {
    if (!s) return;
    const b = s.w.querySelector('.lv-ch');
    b.style.transform = '';
    if (s.lock === 'x' && s.dx < -70) { const ch = chans[+s.w.dataset.i]; if (ch) favSwipe(ch); }
    if (s.lock === 'x') { s.w.dataset.swiped = '1'; setTimeout(() => { if (s?.w) delete s.w.dataset.swiped; }, 50); }
    s = null;
  });
}
export default {
  name: 'live', tab: true,
  mount(root) {
    el = root;
    root.addEventListener('click', (e) => {
      const gb = e.target.closest('[data-group]');
      if (gb) { group = gb.dataset.group; q = ''; searching = false; store.set(scoped('phLiveGroup'), group); shown = 60; draw(); el.scrollTo({ top: 0 }); return; }
      const b = e.target.closest('[data-act]');
      if (b) {
        const a = b.dataset.act;
        if (a === 'account') return push('account');
        if (a === 'find') { searching = true; draw(); el.querySelector('#lv-q')?.focus(); return; }
        if (a === 'clearq') { q = ''; searching = false; draw(); return; }
        if (a === 'more') { shown += 100; draw(); return; }
        if (a === 'tune-last') { const ch = lastCh(); if (ch) playLive(ch, catalog.live?.items || [ch], 'All channels'); return; }
        if (a === 'earlier') { const ch = lastCh(); if (ch) push('day', { id: ch.id }); return; }
      }
      const d = e.target.closest('[data-day]');
      if (d) { const ch = chans[+d.dataset.day]; if (ch) push('day', { id: ch.id }); return; }
      const row = e.target.closest('.lv-ch[data-i]');
      if (row && !row.closest('[data-swiped]')) { const ch = chans[+row.dataset.i]; if (ch) tune(ch); }
    });
    root.addEventListener('input', (e) => { if (e.target.id === 'lv-q') { q = e.target.value.trim(); draw(); } });
    swipes(root);
    longPress(root, '.lv-ch[data-i]', (b) => { const ch = chans[+b.dataset.i]; if (ch) chMenu(ch); });
    const redraw = () => { if (isShown('live') && document.activeElement?.id !== 'lv-q') soon(); };
    on('catalog', redraw); on('favs', redraw); on('nba', redraw); on('feeds', redraw); on('guide', redraw);
    on('session', () => { group = null; q = ''; searching = false; });
    setInterval(redraw, 60000);
  },
  enter() {
    draw();
    ensure('live').then(() => { draw(); const g = myGame(); if (g?.state === 'in') findFeeds(g).then(soon); }).catch((e) => { if (el) el.querySelector('.lv-list').innerHTML = `<div class="state"><b>Channels didn't load</b><p>${esc(e.message || '')}</p></div>`; });
  },
};

// ---------- the channel's day (a pushed page): its programmes by time, the archive above now ----------
let dayEl = null, dayCh = null;
function drawDay() {
  const ch = dayCh;
  if (!ch || !dayEl) return;
  const now = Date.now();
  const past = (pastNow(ch) || []).filter((p) => p.end <= now && p.start > now - (ch.archive || 0) * 864e5);
  const fut = (guideNow(ch) || []).filter((p) => p.end > now);
  const list = [...(ch.archive > 0 ? past : []), ...fut.filter((p) => !past.some((x) => x.start === p.start))].sort((a, b) => a.start - b.start);
  const day = (t) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  let last = '';
  const rows = list.map((p, i) => {
    const v = programmeView(ch, p), isNow = p.start <= now && p.end > now, gone = p.end <= now && (p.kept === false || !ch.archive);
    const d = day(p.start), head = d !== last ? `<div class="ac-group"><div class="h" style="padding-top:14px">${esc(d)}</div></div>` : '';
    last = d;
    return `${head}<button class="p${isNow ? ' now' : ''}${gone ? ' gone' : ''}" data-p="${i}"><span class="tm">${hm(p.start)}</span><span class="col"><b>${esc(v.title)}</b><small>${isNow ? 'On now · ' : p.end <= now ? (gone ? 'Not in the replay · ' : 'Replay · ') : ''}until ${hm(p.end)}${v.desc && !isNow ? ` · ${esc(v.desc)}` : ''}</small></span>${isNow ? '<span class="live sm">Live</span>' : p.end <= now && !gone ? ic('play') : ''}</button>`;
  }).join('');
  dayEl.innerHTML = `<div class="ph-top"><button class="ph-back" data-act="back" aria-label="Back">${ic('back')}</button><h1 class="ellipsis" style="font-size:26px">${esc(ch.name)}</h1></div><div class="note" style="margin-top:4px">${ch.archive > 0 ? esc(keptWords(ch.archive)) : esc(NOT_KEPT)} · channel ${ch.num}</div><div class="lv-day" style="margin-top:8px">${rows || '<div class="state"><b>No guide information</b></div>'}</div>`;
  dayEl._list = list;
  const cur = dayEl.querySelector('.p.now');
  if (cur && !dayEl._placed) { dayEl._placed = true; cur.scrollIntoView({ block: 'center' }); }
}
export const dayPage = {
  name: 'day', tabs: true,
  mount(root) {
    dayEl = root;
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="back"]')) return import('./ui.js').then((u) => u.back());
      const b = e.target.closest('[data-p]');
      if (!b) return;
      const p = dayEl._list[+b.dataset.p], ch = dayCh, now = Date.now();
      if (p.start <= now && p.end > now) return playLive(ch, catalog.live?.items || [ch], 'All channels');
      if (p.end > now) return toast(`${programmeView(ch, p).title} starts at ${hm(p.start)}`);
      if (!ch.archive || p.kept === false) return toast('That programme isn\'t in the replay');
      const g = knownGames().find((x) => Math.abs(x.date - p.start) < 3 * 3600e3 && window.NBA.matchScore(p.title, x) >= 10);
      if (g) return watchOnChannel(g, ch, p);
      playProgramme(ch, p);
    });
    on('guide', () => { if (isShown('day')) drawDay(); });
  },
  enter(root, params) {
    const ch = catalog.live?.byId.get(String(params.id)) || catalog.live?.byId.get(+params.id);
    if (ch !== dayCh) root._placed = false;
    dayCh = ch;
    if (!ch) { root.innerHTML = '<div class="state"><b>That channel isn\'t in the list</b></div>'; return; }
    drawDay();
    guideFor(ch, { urgent: true }).then(drawDay).catch(() => {});
    if (ch.archive > 0) pastFor(ch, { urgent: true }).then(drawDay).catch(() => {});
  },
};
void sheet; void findFeeds;
