// Live: the guide (desktop SPEC 5.1, mock 03). A big grid you can drag: 3 h across at 1920 (2.5 h at 1366), the
// channel column 220 (the number, the logo tile, the name, the star or your team's pin), the ruler with the Now flag and
// the pink line behind the cells, programmes as cells (an ellipsis on every clipped title, a silhouette under 80 px,
// LIVE, kept, a progress bar on the one on now), the groups as chips, ‹ Now ›, the day, the scale. The hovered
// programme answers in the right panel (Remind me / Tune, Tune now, From the start, Multiview, Also on…, Earlier on this
// channel). Mouse: hover answers, click tunes now (or shows later), double-click tunes, drag pans time, the wheel is
// channels (Shift: time, Ctrl: the scale), right-click is the channel menu. Keyboard: the guide's keys (keys.js).
import { hm, leftText, esc as esc0 } from '../tv/js/util.js';
import { S, on, store, scoped, favList, toggleFav, isFav } from '../tv/js/state.js';
import { catalog, ensure } from '../tv/js/catalog.js';
import { guideFor, guideNow, guideFailed, onNow, pastFor, pastNow } from '../tv/js/guide.js';
import { myGame, gameOn, feedsNow, findFeeds, liveGames, bestChannel, favTeam, show, recordFor } from '../tv/js/games.js';
import { programmeView, keptWords, NOT_KEPT } from '../tv/js/catchup.js';
import { playProgramme } from '../tv/js/replay.js';
import { playLive } from '../tv/js/player.js';
import { toast } from '../tv/js/ui.js';
import { cleanCh, cleanGroup, ic, esc, isShown, menu, longPress, tileOf, crestImg, radio } from './ui.js';
import * as rem from './reminders.js';
import { tipsIn } from '../tv/js/nba/common.js';
void esc0;

const MIN = 60e3, H = 3600e3;
let el, group = null, chans = [], scale = 3, t0 = 0, top = 0, sel = null, hov = null, hovT = 0, dragging = null, panelKey = '';
const SCALES = [2, 3, 4, 6];
const realOf = (c) => c.items.filter((x) => !x._sep);
const ROW = 84, CH = 220;
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
  const sport = (k) => /sport|nba/i.test(k.name);
  for (const k of liveGames().length ? [...cats.filter(sport), ...cats.filter((k) => !sport(k))] : cats) out.push([k.id, cleanGroup(k.name), counts.get(k.id)]);
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
  if (!group) group = store.get(scoped('dkLiveGroup'), null) || (favList('live').length ? 'fav' : 'all');
  if (!groups().some((g) => g[0] === group)) group = 'all';
  const list = listFor(group);
  const g = myGame(), pin = g?.state === 'in' ? feedsNow(g)[0]?.ch : null;
  chans = pin ? [pin, ...list.filter((x) => x.id !== pin.id)] : list;
}
export const tune = (ch) => playLive(ch, chans.length && chans.includes(ch) ? chans : catalog.live?.items || [ch], groupName());

// ---------- geometry ----------
const nowAligned = () => Math.floor((Date.now() - 30 * MIN) / (30 * MIN)) * 30 * MIN;
function dims() {
  const g = el?.querySelector('.gd-grid');
  const w = g ? g.clientWidth - CH : 960;
  return { w, pxMin: w / (scale * 60), rows: Math.max(4, Math.floor(((g?.clientHeight || 900) - 30) / ROW)) };
}
const xOf = (t, d) => ((t - t0) / MIN) * d.pxMin;

// ---------- drawing ----------
function cellHtml(ch, p, i, d) {
  const x0 = Math.max(0, xOf(p.start, d)), x1 = Math.min(d.w, xOf(p.end, d));
  if (x1 <= x0 + 1) return '';
  const w = x1 - x0 - 4;
  const v = programmeView(ch, p);
  const now = p.start <= Date.now() && p.end > Date.now();
  const g = now ? gameOn(ch, [p]) : null;
  const live = g?.state === 'in' && !S.offline;
  const kept = ch.archive > 0 && p.end < Date.now() && p.end > Date.now() - ch.archive * 24 * H;
  const sil = w < 80;
  const pr = now ? Math.max(0, Math.min(100, ((Date.now() - p.start) / (p.end - p.start)) * 100)) : 0;
  const k = `${i}:${p.start}`;
  return `<button class="gd-c${now ? ' now' : ''}${sil ? ' sil' : ''}${sel === k ? ' sel' : ''}${p.end < Date.now() ? ' past' : ''}" data-c="${k}" style="left:${x0 + 2}px;width:${w}px" data-tip="${esc(sil ? `${v.title} · ${hm(p.start)}–${hm(p.end)}` : '')}">${sil ? '' : `<b>${esc(v.title)}</b><span class="tm">${p.start < t0 ? '‹ ' : ''}${hm(p.start)} – ${hm(p.end)}${live && w > 190 ? ' <span class="a-live compact">Live</span>' : ''}${kept && w > 200 ? ' <span class="kept">kept</span>' : ''}</span>${now ? `<i class="pb" style="width:${pr}%"></i>` : ''}`}</button>`;
}
function rowHtml(ch, i, d) {
  const list = guideNow(ch);
  if (!list) guideFor(ch, { urgent: true }).then(soon).catch(() => {});
  const mine = myGame(), pin = mine && feedsNow(mine).some((f) => f.ch === ch) && favTeam();
  const t1 = t0 + scale * H;
  const cells = list ? list.filter((p) => p.end > t0 && p.start < t1) : null;
  const body = !list ? `<div class="gd-skel">${guideFailed(ch) ? 'Guide not answering' : ''}</div>` : cells.length ? cells.map((p) => cellHtml(ch, p, i, d)).join('') : `<button class="gd-c none" data-c="${i}:none" style="left:2px;width:${d.w - 4}px"><b>No guide information</b><span class="tm">Click to tune</span></button>`;
  return `<div class="gd-r" data-r="${i}" style="top:${(i - top) * ROW}px"><button class="gd-ch" data-ch="${i}"><span class="no">${ch.num || ''}</span>${tileOf(ch)}<span class="nm">${esc(cleanCh(ch.name))}${/\b(hd|fhd|4k|uhd)\b/i.test(ch.name) ? ` <span class="badge">${/4k|uhd/i.test(ch.name) ? '4K' : 'HD'}</span>` : ''}</span>${pin ? ic('pin', 'pin') : isFav(ch) ? ic('star', 'fav') : ''}</button><div class="gd-cells">${body}</div></div>`;
}
function draw() {
  if (!el) return;
  if (!S.acc) { el.innerHTML = '<div class="ph-top"><h1>Live</h1></div><div class="state"><b>Sign in to watch</b><p>Live TV comes from your provider.</p></div>'; return; }
  if (!catalog.live) { el.innerHTML = '<div class="ph-top"><h1>Live</h1></div><div class="gd-loading"><span class="spin"></span>Loading channels…</div>'; ensure('live').then(() => { rebuild(); draw(); }).catch(() => {}); return; }
  if (!t0) t0 = nowAligned();
  const gs = groups();
  const chips = gs.slice(0, 7).map(([k, n, c]) => `<button class="chip${k === group ? ' sel' : ''}" data-g="${esc(k)}">${k === 'fav' ? ic('list') : ''}${esc(n)} <span class="n">${c}</span></button>`).join('') + (gs.length > 7 ? `<button class="chip" data-act="more-groups">${ic('chevD')}${gs.length - 7} more</button>` : '');
  const day = new Date(t0 + H).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  el.innerHTML = `<div class="gd-ctl"><div class="chips">${chips}</div><span class="sp"></span><div class="gd-nav"><button class="ib" data-act="earlier" data-tip="Earlier · ←">${ic('chevL')}</button><button class="ghost sm" data-act="now" data-tip="Back to now · N">Now</button><button class="ib" data-act="later" data-tip="Later · →">${ic('chevR')}</button></div><button class="ghost sm" data-act="day" data-tip="Day · D">${esc(day)} ${ic('chevD')}</button><button class="ghost sm" data-act="scale" data-tip="Ctrl wheel zooms">${scale} h ${ic('chevD')}</button></div>
    <div class="gd-main"><div class="gd-grid"><div class="gd-ruler"></div><div class="gd-rows"></div><div class="gd-hint">drag to pan · Ctrl wheel zooms</div></div><aside class="gd-panel"></aside></div>`;
  drawGrid();
}
function drawGrid() {
  const grid = el?.querySelector('.gd-grid');
  if (!grid) return;
  const d = dims();
  top = Math.max(0, Math.min(top, Math.max(0, chans.length - d.rows)));
  const marks = [];
  for (let t = t0; t <= t0 + scale * H; t += 30 * MIN) marks.push(`<span style="left:${CH + xOf(t, d)}px">${hm(t)}</span>`);
  const nx = xOf(Date.now(), d);
  const nowIn = nx >= 0 && nx <= d.w;
  grid.querySelector('.gd-ruler').innerHTML = `${marks.join('')}${nowIn ? `<i class="gd-flag" style="left:${CH + nx}px">Now</i>` : ''}`;
  const rows = chans.slice(top, top + d.rows + 1).map((ch, k) => rowHtml(ch, top + k, d)).join('');
  grid.querySelector('.gd-rows').innerHTML = `${nowIn ? `<i class="gd-now" style="left:${CH + nx}px"></i>` : ''}${rows}`;
  grid.querySelector('.gd-hint').hidden = !hintDue();
  drawPanel();
}
let soonT = 0;
const soon = () => { clearTimeout(soonT); soonT = setTimeout(() => { if (el && isShown('live')) drawGrid(); }, 150); };
const HINT = 'tuner.dkGuideHint';
const hintDue = () => { try { return (+localStorage.getItem(HINT) || 0) < 5; } catch { return false; } };

// ---------- the panel ----------
function cellOf(k) {
  if (!k) return null;
  const [i, s] = k.split(':');
  const ch = chans[+i];
  if (!ch) return null;
  if (s === 'none') return { ch, p: null };
  return { ch, p: (guideNow(ch) || []).find((x) => String(x.start) === s) || null };
}
function drawPanel() {
  const box = el?.querySelector('.gd-panel');
  if (!box) return;
  const c = cellOf(hov || sel) || (chans[top] ? { ch: chans[top], p: onNow(guideNow(chans[top])) } : null);
  if (!c) { box.innerHTML = ''; return; }
  const { ch, p } = c;
  const v = p ? programmeView(ch, p) : null;
  const now = p && p.start <= Date.now() && p.end > Date.now();
  const future = p && p.start > Date.now();
  const g = p ? gameOn(ch, [p]) : null;
  const key = `${ch.id}:${p?.start || 0}:${g?.state || ''}:${rem.isSet(g)}:${(pastNow(ch) || []).length}`;
  if (key === panelKey && box.innerHTML) return;
  panelKey = key;
  const sv = g ? show(g) : null;
  const pic = g ? `<div class="gp-pic" style="--away:${g.away.color ? `#${g.away.color}` : '#333'};--home:${g.home.color ? `#${g.home.color}` : '#555'}">${crestImg(g.away, 72)}${crestImg(g.home, 72)}${g.state === 'pre' ? `<span class="tag">${esc(tipsIn(g.date))}</span>` : ''}</div>` : `<div class="gp-pic plain">${tileOf(ch)}</div>`;
  const facts = [`${ch.num ? `${ch.num} · ` : ''}${cleanCh(ch.name)}`, p ? `${hm(p.start)} to ${hm(p.end)}` : '', p ? new Date(p.start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''].filter(Boolean).join(' · ');
  const f2 = g ? [`${g.away.name} ${recordFor(g.away).text || ''}`, `${g.home.name} ${recordFor(g.home).text || ''}`].join(' · ') : p ? '' : 'No guide information';
  const kept = ch.archive > 0;
  const btns = [];
  if (future && g) btns.push(`<button class="pill" data-act="remind">${ic('bell')}${rem.isSet(g) ? 'Reminder set' : 'Remind me'}</button>`);
  else if (now || !p) btns.push(`<button class="pill" data-act="tunep">${ic('play')}Tune</button>`);
  else if (p && p.end < Date.now() && kept) btns.push(`<button class="pill" data-act="replay">${ic('play')}Watch</button>`);
  if (future) btns.push(`<button class="ghost" data-act="tunep">Tune now</button>`);
  if (now && kept) btns.push(`<button class="ghost" data-act="fromstart">${ic('rew')}From the start</button>`);
  btns.push(`<button class="ghost" data-act="mv">${ic('grid')}Multiview</button>`, `<button class="ghost sq" data-act="chmenu" aria-label="More">${ic('more')}</button>`);
  const also = g ? feedsNow(g).filter((f) => f.ch !== ch).slice(0, 3) : [];
  if (g && !feedsNow(g).length) findFeeds(g).then(soon);
  const earlier = kept ? (pastNow(ch) || []).filter((x) => x.end < Date.now()).slice(-4).reverse() : [];
  if (kept && !pastNow(ch)) pastFor(ch).then(soon).catch(() => {});
  box.innerHTML = `${pic}<h2>${esc(v ? v.title : cleanCh(ch.name))}${now && g?.state === 'in' ? ' <span class="a-live compact">Live</span>' : ''}</h2><div class="f1">${esc(facts)}</div>${f2 ? `<div class="f2">${esc(f2)}${sv?.hidden && g.state !== 'pre' ? ` · ${ic('eyeOff')}Score hidden` : ''}</div>` : ''}${p?.desc ? `<p>${esc(p.desc)}</p>` : ''}
    <div class="acts">${btns.join('')}</div>
    ${also.length ? `<div class="gp-sec">Also on</div>${also.map((f) => `<button class="gp-row" data-also="${esc(f.ch.id)}"><b>${esc(cleanCh(f.ch.name))}</b><span>${/4k|uhd/i.test(f.ch.name) ? '4K' : /fhd|1080/i.test(f.ch.name) ? 'Full HD' : /hd/i.test(f.ch.name) ? 'HD' : ''}</span></button>`).join('')}` : ''}
    <div class="gp-sec">${kept ? `Earlier on this channel · ${esc(keptWords(ch.archive).toLowerCase())}` : esc(NOT_KEPT)}</div>${earlier.map((x) => `<button class="gp-row" data-past="${x.start}"><b>‹ ${esc(programmeView(ch, x).title)}</b><span>${hm(x.start)} · kept · ${Math.round((x.end - x.start) / H * 10) / 10} h</span></button>`).join('')}`;
  box.dataset.ch = ch.id; box.dataset.p = p?.start || '';
}

// ---------- the pointer ----------
function chMenu(ch) {
  menu(cleanCh(ch.name), [
    { label: 'Tune', icon: 'play', key: 'Enter', run: () => tune(ch) },
    ch.archive > 0 ? { label: 'From the start', icon: 'rew', key: 'Shift Enter', run: () => { const p = onNow(guideNow(ch)); if (p) playProgramme(ch, p, { restart: true }); } } : null,
    { label: isFav(ch) ? 'Remove from favourites' : 'Favourite', icon: 'star', key: 'F', run: () => favWithUndo(ch) },
    { label: 'Add to multiview', icon: 'grid', key: 'Ctrl M', run: () => import('./multiview.js').then((m) => m.addChannel(ch)) },
    (() => { const g = gameOn(ch, guideNow(ch) || []); return g && g.state === 'pre' ? { label: rem.isSet(g) ? 'No reminder' : 'Remind me', icon: 'bell', key: 'R', run: () => rem.toggle(g) } : null; })(),
  ]);
}
function favWithUndo(ch) {
  const was = isFav(ch);
  toggleFav(ch);
  toast(was ? `${cleanCh(ch.name)} left your favourites · Ctrl Z to undo` : `${cleanCh(ch.name)} is in your favourites`);
  lastFav = { ch, at: Date.now() };
  rebuild(); drawGrid();
}
let lastFav = null;
document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.key.toLowerCase() === 'z' && lastFav && Date.now() - lastFav.at < 8000 && isShown('live')) { toggleFav(lastFav.ch); lastFav = null; rebuild(); drawGrid(); } });
function click(e) {
  const b = e.target.closest('[data-act]');
  if (b) return act(b.dataset.act, b);
  const gch = e.target.closest('[data-g]');
  if (gch) { group = gch.dataset.g; store.set(scoped('dkLiveGroup'), group); top = 0; rebuild(); draw(); return; }
  const c = e.target.closest('[data-c]');
  if (c) { const x = cellOf(c.dataset.c); if (!x) return; sel = c.dataset.c; if (!x.p || (x.p.start <= Date.now() && x.p.end > Date.now())) return tune(x.ch); if (x.p.end < Date.now() && x.ch.archive > 0) return playProgramme(x.ch, x.p); drawGrid(); return; }
  const chb = e.target.closest('[data-ch]');
  if (chb) return tune(chans[+chb.dataset.ch]);
  const also = e.target.closest('[data-also]');
  if (also) { const ch = catalog.live.byId.get(also.dataset.also); if (ch) tune(ch); return; }
  const past = e.target.closest('[data-past]');
  if (past) { const ch = catalog.live.byId.get(el.querySelector('.gd-panel').dataset.ch); const p = (pastNow(ch) || []).find((x) => String(x.start) === past.dataset.past); if (p) playProgramme(ch, p); }
}
function act(a) {
  const pnl = el.querySelector('.gd-panel'), ch = catalog.live?.byId.get(pnl?.dataset.ch), p = ch && pnl.dataset.p ? (guideNow(ch) || []).find((x) => String(x.start) === pnl.dataset.p) : null;
  if (a === 'now') { t0 = nowAligned(); return drawGrid(); }
  if (a === 'earlier') { t0 -= 30 * MIN; return drawGrid(); }
  if (a === 'later') { t0 += 30 * MIN; return drawGrid(); }
  if (a === 'scale') return radio('Time scale', SCALES.map((s) => ({ v: s, l: `${s} h` })), scale, (s) => { scale = +s; drawGrid(); draw(); });
  if (a === 'day') return radio('Day', [-2, -1, 0, 1].map((k) => ({ v: k, l: k === 0 ? 'Today' : k === -1 ? 'Yesterday' : k === 1 ? 'Tomorrow' : new Date(Date.now() + k * 24 * H).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) })), 0, (k) => { t0 = k === 0 ? nowAligned() : new Date(new Date(Date.now() + +k * 24 * H).setHours(18, 0, 0, 0)).getTime(); draw(); });
  if (a === 'more-groups') return menu('Channel groups', groups().map(([k, n, c]) => ({ label: n, sub: `${c} channels`, icon: k === group ? 'tick' : '', run: () => { group = k; store.set(scoped('dkLiveGroup'), k); top = 0; rebuild(); draw(); } })));
  if (!ch) return;
  if (a === 'tunep') return tune(ch);
  if (a === 'fromstart') { const q = onNow(guideNow(ch)); if (q) playProgramme(ch, q, { restart: true }); return; }
  if (a === 'replay' && p) return playProgramme(ch, p);
  if (a === 'remind') { const g = p && gameOn(ch, [p]); if (g) rem.toggle(g).then(() => { panelKey = ''; drawPanel(); }); else toast('Remind me is for games'); return; }
  if (a === 'mv') return import('./multiview.js').then((m) => m.addChannel(ch));
  if (a === 'chmenu') return chMenu(ch);
}
function wire(root) {
  root.addEventListener('click', click);
  root.addEventListener('dblclick', (e) => { const c = e.target.closest('[data-c]'); if (c) { const x = cellOf(c.dataset.c); if (x) tune(x.ch); } });
  root.addEventListener('mouseover', (e) => {
    const c = e.target.closest('[data-c]');
    const k = c?.dataset.c || null;
    if (k === hov) return;
    clearTimeout(hovT);
    hovT = setTimeout(() => { hov = k; if (k) drawPanel(); }, 150);
  });
  longPress(root, '[data-c], [data-ch]', (x) => { const i = +(x.dataset.ch ?? x.dataset.c.split(':')[0]); if (chans[i]) chMenu(chans[i]); });
  root.addEventListener('wheel', (e) => {
    if (!e.target.closest('.gd-grid')) return;
    e.preventDefault();
    if (e.ctrlKey) { const i = SCALES.indexOf(scale); scale = SCALES[Math.max(0, Math.min(SCALES.length - 1, i + (e.deltaY > 0 ? 1 : -1)))]; drawGrid(); el.querySelector('[data-act="scale"]').innerHTML = `${scale} h ${ic('chevD')}`; return; }
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { t0 += Math.sign(e.deltaY || e.deltaX) * 15 * MIN; drawGrid(); return; }
    top = Math.max(0, top + Math.sign(e.deltaY) * (Math.abs(e.deltaY) > 150 ? 3 : 1)); drawGrid();
  }, { passive: false });
  // drag pans time (a grab cursor), the ruler and the Now flag move
  root.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !e.target.closest('.gd-cells, .gd-ruler')) return;
    dragging = { x: e.clientX, t: t0, moved: false };
    const mv = (ev) => {
      const d = dims(), dx = ev.clientX - dragging.x;
      if (Math.abs(dx) > 4) { dragging.moved = true; document.body.classList.add('grabbing'); }
      if (!dragging.moved) return;
      t0 = dragging.t - Math.round(dx / d.pxMin / 5) * 5 * MIN;
      drawGrid();
    };
    const up = () => {
      window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); document.body.classList.remove('grabbing');
      if (dragging?.moved) { try { localStorage.setItem(HINT, String((+localStorage.getItem(HINT) || 0) + 1)); } catch { /* none */ } const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; root.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => root.removeEventListener('click', stop, { capture: true }), 60); }
      dragging = null;
    };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  });
}
// the guide's keys (keys.js ids, main.js routes them)
function key(id, e) {
  if (!isShown('live') || !chans.length) return false;
  const cur = sel ? cellOf(sel) : null;
  const ci = sel ? +sel.split(':')[0] : top;
  const pick = (i, t) => { i = Math.max(0, Math.min(chans.length - 1, i)); const list = guideNow(chans[i]) || []; const p = list.find((x) => x.start <= t && x.end > t) || null; sel = p ? `${i}:${p.start}` : `${i}:none`; hov = null; const d = dims(); if (i < top) top = i; if (i >= top + d.rows) top = i - d.rows + 1; drawGrid(); };
  const at = cur?.p ? Math.max(cur.p.start, t0) + 1 : Date.now();
  switch (id) {
    case 'g-time': { if (/left/i.test(e.key)) { if (cur?.p && cur.p.start <= Date.now() && cur.p.end > Date.now() && t0 <= Date.now()) { el.querySelector(`[data-ch="${ci}"]`)?.focus(); return; } const t = (cur?.p?.start || Date.now()) - 1; if (t < t0) t0 -= 30 * MIN; pick(ci, t); } else { const t = (cur?.p?.end || Date.now()) + 1; if (t > t0 + scale * H - 30 * MIN) t0 += 30 * MIN; pick(ci, t); } return; }
    case 'g-ch': return pick(ci + (/up/i.test(e.key) ? -1 : 1), at);
    case 'g-page': return pick(ci + (/up/i.test(e.key) ? -1 : 1) * dims().rows, at);
    case 'g-now': t0 = nowAligned(); return pick(ci, Date.now());
    case 'g-day': return act('day');
    case 'g-tune': if (cur) { if (!cur.p || cur.p.start <= Date.now()) { if (cur.p && cur.p.end < Date.now()) return playProgramme(cur.ch, cur.p); return tune(cur.ch); } } return false;
    case 'g-start': if (cur?.ch.archive > 0) { const p = cur.p || onNow(guideNow(cur.ch)); if (p) playProgramme(cur.ch, p, { restart: true }); } return;
    case 'g-fav': if (cur) favWithUndo(cur.ch); return;
    case 'g-remind': { const g = cur?.p && gameOn(cur.ch, [cur.p]); if (g) rem.toggle(g); return; }
    case 'g-digits': return false;   // (main.js tunes the number)
    default: return false;
  }
}
const def = {
  name: 'live', tab: true,
  key,
  mount(root) { el = root; wire(root); on('favs', () => { if (isShown('live')) { rebuild(); drawGrid(); } }); on('nba', soon); on('replays', soon); },
  async enter(root, params) {
    rebuild();
    if (params.ch) { const i = chans.findIndex((c) => String(c.id) === String(params.ch)); if (i < 0) { group = 'all'; rebuild(); } const j = chans.findIndex((c) => String(c.id) === String(params.ch)); if (j >= 0) { top = Math.max(0, j - 2); sel = `${j}:none`; } }
    else { const last = store.get(scoped('lastLive'), ''); const j = chans.findIndex((c) => String(c.id) === String(last)); if (j >= 0 && !sel) { top = Math.max(0, j - 3); const p = onNow(guideNow(chans[j])); sel = p ? `${j}:${p.start}` : null; } }
    t0 = nowAligned();
    draw();
    if (!catalog.live) { await ensure('live').catch(() => {}); rebuild(); draw(); }
  },
  toTop() { top = 0; t0 = nowAligned(); drawGrid(); },
};
setInterval(() => { if (el && isShown('live') && !dragging) drawGrid(); }, 60e3);
window.addEventListener('resize', () => { if (el && isShown('live')) drawGrid(); });
export default def;
// (the iPhone's day page has no place here: the grid is the day; kept as a name the TV's code may push)
export const dayPage = { name: 'day', enter: (root, params) => import('./ui.js').then((u) => u.go('live', { ch: params.id || params.ch })) };
void leftText; void bestChannel;
