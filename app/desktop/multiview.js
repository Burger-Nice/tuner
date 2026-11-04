// Multiview (desktop SPEC 0.8, 7, mocks 08 / 13): two to four games or channels, each its own mpv in its own host
// window, all muted but the one with the white border; a click or 1–4 moves the audio; a slot waits for a tip-off and
// tunes itself; the picker at the right (tonight's games, favourite channels, a search) adds to the next free slot with
// + or by dragging a row (or a game card) onto an empty slot. The provider's stream limit caps the slots and the bar
// says so. Leaving keeps the audio tile playing as the player (the same mpv: its host moves, no new stream).
import { hm } from '../tv/js/util.js';
import { on, favList, S } from '../tv/js/state.js';
import { catalog, searchAll } from '../tv/js/catalog.js';
import { guideNow, onNow } from '../tv/js/guide.js';
import { nba, show, bestChannel, findFeeds, isMine, gameById, gameOn } from '../tv/js/games.js';
import { programmeView } from '../tv/js/catchup.js';
import { playLive } from '../tv/js/player.js';
import { toast } from '../tv/js/ui.js';
import { ic, esc, tileOf, cleanCh, crestImg, menu } from './ui.js';
import { floatRoot, setMirror, setPictures } from './float.js';
import { streams } from './streams.js';
import * as player from './player.js';

const T = window.tuner || null;
const MPV = T?.mpv || null;
let openNow = false, slots = [], audio = 0, lay = 'auto', picker = false, pq = '', cap = 4, used = 0, waitT = 0, el = null;
const LAYOUTS = ['2', '1+2', '2x2'];
export const isOpen = () => openNow;
const empty = () => ({ kind: 'empty' });
const gname = (g) => `${g.away.name} at ${g.home.name}`;
const chOf = (id) => catalog.live?.byId.get(String(id)) || catalog.live?.byId.get(+id) || null;

export async function open() {
  if (openNow) { picker = true; draw(); return; }
  if (!S.acc) return;
  if (player.open()) player.closePlayer();
  openNow = true;
  slots = [empty(), empty()];
  audio = 0; lay = 'auto'; picker = true;
  document.body.classList.add('mv');
  el = document.createElement('div');
  el.id = 'dk-mv';
  document.getElementById('dk').appendChild(el);
  el.addEventListener('click', click);
  el.addEventListener('input', (e) => { if (e.target.id === 'mv-q') { pq = e.target.value; drawPicker(); } });
  wireDrop();
  window.dispatchEvent(new Event('resize'));
  const s = await streams().catch(() => null);
  if (s?.max) { cap = Math.max(1, Math.min(4, s.max)); used = s.active || 0; }
  draw();
  setTimeout(() => el?.querySelector('#mv-q')?.focus(), 50);
}
export function close({ keepAudio = true } = {}) {
  if (!openNow) return;
  const keep = keepAudio ? slots[audio] : null;
  for (const s of slots) if (s.mid && s !== keep) MPV?.quit(s.mid);
  clearInterval(waitT);
  openNow = false;
  el?.remove(); el = null;
  floatRoot('main').querySelector('.mv-layer')?.remove();
  setPictures('main', []);
  setMirror('main', false);
  document.body.classList.remove('mv');
  window.dispatchEvent(new Event('resize'));
  const ch = keep?.ch;
  slots = [];
  if (keep?.mid && ch) {
    // the audio tile becomes the player: the same mpv
    player.adopt(keep.mid, { volume: 100, mute: false }, keep.url);
    MPV?.set(keep.mid, 'mute', false);
    playLive(ch, catalog.live?.items?.filter((c) => !c._sep) || [ch], 'All channels');
  }
}
export function escape() { if (picker && slots.some((s) => s.kind !== 'empty')) { picker = false; draw(); return; } close(); }

// ---------- adding ----------
const freeSlot = () => { let i = slots.findIndex((s) => s.kind === 'empty'); if (i < 0 && slots.length < cap) { slots.push(empty()); i = slots.length - 1; } return i; };
export async function addGame(g, at = -1) {
  if (!openNow) await open();
  const on0 = slots.findIndex((s) => s.g?.id === g.id);
  if (on0 >= 0) { setAudio(on0); toast(`${gname(g)} is in slot ${on0 + 1}`); return; }
  const i = at >= 0 ? at : freeSlot();
  if (i < 0) { toast(`${slots.length} of ${slots.length} slots · your provider allows ${cap} stream${cap === 1 ? '' : 's'}`); return; }
  if (g.state === 'pre') { slots[i] = { kind: 'wait', g }; findFeeds(g); armWait(); draw(); return; }
  await findFeeds(g).catch(() => {});
  const ch = bestChannel(g);
  if (!ch) { toast(`No channel found for ${gname(g)} yet`); return; }
  await tuneSlot(i, ch, g);
}
export async function addChannel(ch, at = -1) {
  if (!openNow) await open();
  const i = at >= 0 ? at : freeSlot();
  if (i < 0) { toast(`Every slot is full · your provider allows ${cap} stream${cap === 1 ? '' : 's'}`); return; }
  const g = gameOn(ch, guideNow(ch));
  await tuneSlot(i, ch, g || null);
}
async function tuneSlot(i, ch, g) {
  const s = slots[i] || empty();
  const url = ch.sources?.[0]?.url || '';
  if (!url) { toast('There is no link to play'); return; }
  const first = !slots.some((x) => x.mid);
  if (first) audio = i;
  if (!s.mid && MPV) {
    const id = `mv${i}${Date.now() % 1e5}`;
    const r = await MPV.create(id, { mute: i !== audio, volume: 100 });
    if (!r?.ok) { toast(r?.error === 'missing' ? 'The player is not installed' : 'The tile could not start'); return; }
    s.mid = id;
  }
  Object.assign(s, { kind: 'ch', ch, g, url, at: Date.now() });
  slots[i] = s;
  if (MPV && s.mid) { await MPV.load(s.mid, { url }); MPV.set(s.mid, 'mute', i !== audio); }
  if (slots.filter((x) => x.kind !== 'empty').length >= cap) picker = false;
  draw();
}
function armWait() {
  clearInterval(waitT);
  waitT = setInterval(() => {
    for (const [i, s] of slots.entries()) {
      if (s.kind !== 'wait') continue;
      const g = gameById(s.g.id) || s.g;
      if (g.state !== 'pre' || Date.now() >= g.date) { const ch = bestChannel(g); if (ch) tuneSlot(i, ch, g); }
    }
    if (!slots.some((s) => s.kind === 'wait')) clearInterval(waitT);
    else drawLayer();
  }, 5000);
}
function clearSlot(i) {
  const s = slots[i];
  if (s?.mid) MPV?.quit(s.mid);
  slots[i] = empty();
  if (audio === i) { const j = slots.findIndex((x) => x.kind === 'ch'); if (j >= 0) setAudio(j); }
  draw();
}
function setAudio(i) {
  if (!slots[i] || slots[i].kind !== 'ch') return;
  audio = i;
  slots.forEach((s, k) => { if (s.mid) MPV?.set(s.mid, 'mute', k !== i); });
  drawLayer();
}
// expand a tile: it becomes the player (the same mpv), the others stop
function expand(i) { if (slots[i]?.kind === 'ch') { audio = i; close({ keepAudio: true }); } }

// ---------- the keys (keys.js ids) ----------
export function key(id, e) {
  if (!openNow) return false;
  if (id === 'm-add') { picker = true; draw(); el?.querySelector('#mv-q')?.focus(); return; }
  if (id === 'm-audio') { const i = +e.key - 1; if (slots[i]?.kind === 'ch') setAudio(i); return; }
  if (id === 'm-expand') { expand(+e.code.slice(5) - 1); return; }
  if (id === 'm-remove') { clearSlot(audio); return; }
  if (id === 'm-layout') { lay = LAYOUTS[(LAYOUTS.indexOf(layoutNow()) + 1) % LAYOUTS.length]; draw(); return; }
  if (id === 'm-leave') { escape(); return; }
  return false;
}

// ---------- drawing ----------
function layoutNow() { if (lay !== 'auto') return lay; const n = slots.length; return n <= 2 ? '2' : n === 3 ? '1+2' : '2x2'; }
function draw() {
  if (!el) return;
  while (slots.length < 2) slots.push(empty());
  const n = slots.filter((s) => s.kind !== 'empty').length;
  const L = layoutNow();
  const audioName = slots[audio]?.kind === 'ch' ? (slots[audio].g ? gname(slots[audio].g) : cleanCh(slots[audio].ch.name)) : '';
  el.className = `mv-l${L.replace('+', 'p')}${picker ? ' picking' : ''}`;
  el.innerHTML = `<div class="mv-head"><b>Multiview</b><span>${n} of ${Math.max(slots.length, cap)} slots</span><span>Your provider allows ${cap} stream${cap === 1 ? '' : 's'} · ${Math.min(cap, used + slots.filter((s) => s.mid).length)} in use</span>${audioName ? `<span>Audio: ${esc(audioName)}</span>` : ''}${n > 2 ? '<span>HD in multiview</span>' : ''}<span class="sp"></span>
    <button class="ghost sm" data-act="layout" data-tip="Layout · Ctrl L">${ic('grid')}${esc({ 2: 'Two side by side', '1+2': 'One and two', '2x2': 'Two by two' }[L])}</button><button class="pill sm noicon" data-act="add" data-tip="Add a game or channel · Ctrl M">${ic('plus')}Add a game or channel</button><button class="ghost sm" data-act="full" data-tip="Full screen · F11">${ic('full')}Full screen</button><button class="ib" data-act="leave" data-tip="Leave · Esc">${ic('close')}</button></div>
    <div class="mv-grid">${slots.map((s, i) => `<div class="mv-slot" data-slot="${i}"></div>`).join('')}</div>${picker ? `<aside class="mv-pick"></aside>` : ''}`;
  if (picker) drawPicker();
  requestAnimationFrame(placeTiles);
}
function rects() { return [...(el?.querySelectorAll('.mv-slot') || [])].map((d) => { const r = d.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }); }
function placeTiles() {
  if (!el) return;
  const rs = rects();
  slots.forEach((s, i) => { if (s.mid && rs[i]) T.host.rect(s.mid, rs[i]); });
  setPictures('main', slots.map((s, i) => (s.mid && rs[i] ? { id: String(i), ...rs[i] } : null)).filter(Boolean), (ev) => {
    const i = +ev.id;
    if (ev.type === 'click') setAudio(i);
    if (ev.type === 'dblclick') expand(i);
    if (ev.type === 'contextmenu') tileMenu(i);
    if (ev.type === 'wheel') { const s = slots[i]; if (s?.mid) MPV.command(s.mid, ['add', 'volume', ev.dy < 0 ? 5 : -5]); }
  });
  setMirror('main', slots.some((s) => s.mid) && !!MPV);
  drawLayer();
}
window.addEventListener('resize', () => { if (openNow) requestAnimationFrame(placeTiles); });
// the tiles' chrome (the floating layer: over the pictures): the audio border, the number, the label strip; the empty and
// waiting slots' words
function drawLayer() {
  if (!el) return;
  const rs = rects();
  // empty and waiting slots: in the page itself (no picture covers them, so a drag from the picker drops there)
  slots.forEach((s, i) => {
    const d = el.querySelector(`.mv-slot[data-slot="${i}"]`);
    if (!d) return;
    const html = s.kind === 'empty' || s.kind === 'wait' ? slotHtml(s, i) : '';
    if (d._html !== html) { d.innerHTML = html; d._html = html; }
  });
  const tiles = slots.map((s, i) => {
    const r = rs[i];
    if (!r || s.kind !== 'ch') return '';
    const pos = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`;
    return chHtml(s, i, pos);
  }).join('');
  const html = `<div class="pass mv-layer">${tiles}</div>`;
  const root = floatRoot('main');
  const old = root.querySelector('.mv-layer');
  if (old) { if (old._html !== html) { old.outerHTML = html; root.querySelector('.mv-layer')._html = html; } }
  else { root.insertAdjacentHTML('afterbegin', html); root.querySelector('.mv-layer')._html = html; }
}
function slotHtml(s, i) {
    if (s.kind === 'empty') return `<div class="mv-t empty" data-slot="${i}"><b>Empty slot</b><span>Drop a game or a channel here</span><button class="ghost sm" data-mv="choose" data-i="${i}">Choose…</button></div>`;
    if (s.kind === 'wait') {
      const g = gameById(s.g.id) || s.g, ch = bestChannel(g);
      const mins = Math.max(0, Math.round((g.date - Date.now()) / 60e3));
      return `<div class="mv-t wait"><div class="crests">${crestImg(g.away, 48)}${crestImg(g.home, 48)}</div><b>${esc(gname(g))}</b><span>Tips off at ${hm(g.date)} · in ${mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`} · this slot tunes ${esc(ch ? cleanCh(ch.name) : 'the game')} by itself</span><div class="acts"><button class="ghost sm" data-mv="tunenow" data-i="${i}">Tune now</button><button class="ghost sm" data-mv="clear" data-i="${i}">Clear slot</button></div></div>`;
    }
    return '';
}
function chHtml(s, i, pos) {
    const v = s.g ? show(gameById(s.g.id) || s.g) : null;
    const label = s.g ? `${esc(s.g.away.name)} · ${esc(s.g.home.name)}` : esc(cleanCh(s.ch.name));
    const sc = v ? (v.hidden ? `${ic('eyeOff')}Score hidden` : v.g.state === 'pre' ? hm(v.g.date) : `${esc(v.g.away.score)} – ${esc(v.g.home.score)}`) : esc(nowTitle(s.ch));
    return `<div class="mv-t${i === audio ? ' audio' : ''}" style="${pos}"><span class="no">${i + 1}</span>${i === audio ? `<span class="aud">${ic('vol')}Audio</span>` : ''}<div class="strip">${label}<span class="sc">${sc}</span><span class="chn">${esc(cleanCh(s.ch.name))}</span><button class="ib" data-mv="menu" data-i="${i}" aria-label="More">${ic('more')}</button></div></div>`;
}
const nowTitle = (ch) => { const p = onNow(guideNow(ch)); return p ? programmeView(ch, p).title : ''; };
function drawPicker() {
  const p = el?.querySelector('.mv-pick');
  if (!p) return;
  const games = nba.today.slice().sort((a, b) => isMine(b) - isMine(a) || a.date - b.date);
  const n = pq.trim();
  const chans = n ? searchAll(n, 10).live : favList('live').map((f) => chOf(f.id)).filter(Boolean).slice(0, 12);
  const gs = n ? games.filter((g) => `${g.away.name} ${g.home.name} ${g.away.abbr} ${g.home.abbr}`.toLowerCase().includes(n.toLowerCase())) : games;
  const gRow = (g) => {
    const on0 = slots.findIndex((s) => s.g?.id === g.id), ch = bestChannel(g), v = show(g);
    const st = on0 >= 0 ? `In slot ${on0 + 1} · ${ch ? cleanCh(ch.name) : ''}` : g.state === 'pre' ? `${hm(g.date)} · in ${Math.max(0, Math.round((g.date - Date.now()) / 60e3))} min${ch ? ` · ${cleanCh(ch.name)}` : ''}` : g.state === 'in' ? `Live${v.hidden ? ' · Score hidden' : ''}${ch ? ` · ${cleanCh(ch.name)}` : ''}` : 'Final';
    return `<div class="mv-pr${on0 >= 0 ? ' placed' : ''}" draggable="${g.state !== 'post' && on0 < 0}" data-drag-g="${esc(g.id)}"><span class="grip">${ic('grip')}</span>${crestImg(g.away, 22)}${crestImg(g.home, 22)}<span class="col"><b>${esc(gname(g))}</b><small>${esc(st)}</small></span>${on0 >= 0 ? ic('tick') : g.state === 'post' ? '' : `<button class="ib" data-mv="addg" data-id="${esc(g.id)}" aria-label="Add">${ic('plus')}</button>`}</div>`;
  };
  const cRow = (c) => { const on0 = slots.findIndex((s) => s.ch && String(s.ch.id) === String(c.id)); return `<div class="mv-pr${on0 >= 0 ? ' placed' : ''}" draggable="${on0 < 0}" data-drag-ch="${esc(c.id)}"><span class="grip">${ic('grip')}</span>${tileOf(c)}<span class="col"><b>${c.num ? `${c.num} · ` : ''}${esc(cleanCh(c.name))}</b><small>${esc(on0 >= 0 ? `In slot ${on0 + 1}` : nowTitle(c) || 'Channel')}</small></span>${on0 >= 0 ? ic('tick') : `<button class="ib" data-mv="addc" data-id="${esc(c.id)}" aria-label="Add">${ic('plus')}</button>`}</div>`; };
  const focused = document.activeElement?.id === 'mv-q';
  p.innerHTML = `<div class="mv-ph"><b>Add a game or channel</b><button class="ib" data-mv="closepick" aria-label="Close">${ic('close')}</button></div><label class="mv-q">${ic('search')}<input id="mv-q" type="text" placeholder="Find a game, a channel or a number" value="${esc(pq)}" spellcheck="false" autocomplete="off"></label>
    ${gs.length ? `<div class="mv-sec">Tonight's games</div>${gs.map(gRow).join('')}` : ''}${chans.length ? `<div class="mv-sec">${n ? 'Channels' : 'Favourite channels'}</div>${chans.map(cRow).join('')}` : ''}
    <p class="mv-note">Click + for the next free slot, or drag a row onto a slot. A game before tip-off waits in its slot and tunes itself.</p>`;
  if (focused) { const i = p.querySelector('#mv-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}
function click(e) {
  const b = e.target.closest('[data-act], [data-mv]');
  if (!b) return;
  const a = b.dataset.act || b.dataset.mv, i = +b.dataset.i;
  if (a === 'add' || a === 'choose') { picker = true; draw(); el?.querySelector('#mv-q')?.focus(); return; }
  if (a === 'closepick') { picker = false; draw(); return; }
  if (a === 'layout') { lay = LAYOUTS[(LAYOUTS.indexOf(layoutNow()) + 1) % LAYOUTS.length]; draw(); return; }
  if (a === 'full') return T?.win?.fullscreen();
  if (a === 'leave') return close();
  if (a === 'addg') { const g = gameById(b.dataset.id); if (g) addGame(g); return; }
  if (a === 'addc') { const ch = chOf(b.dataset.id); if (ch) addChannel(ch); return; }
  if (a === 'clear') return clearSlot(i);
  if (a === 'tunenow') { const g = gameById(slots[i]?.g?.id) || slots[i]?.g; const ch = g && bestChannel(g); if (ch) tuneSlot(i, ch, g); else toast('No channel for this game yet'); }
}
// the floating layer's own buttons (Choose…, Tune now, Clear slot, a tile's ⋯)
floatRoot('main').addEventListener('click', (e) => {
  const b = e.target.closest('.mv-layer [data-mv]');
  if (!b) return;
  const a = b.dataset.mv, i = +b.dataset.i;
  if (a === 'choose') { picker = true; draw(); return; }
  if (a === 'clear') return clearSlot(i);
  if (a === 'tunenow') { const g = gameById(slots[i]?.g?.id) || slots[i]?.g; const ch = g && bestChannel(g); if (ch) tuneSlot(i, ch, g); else toast('No channel for this game yet'); return; }
  if (a === 'menu') return tileMenu(i);
});
function tileMenu(i) {
  const s = slots[i];
  if (!s || s.kind !== 'ch') return;
  menu(s.g ? gname(s.g) : cleanCh(s.ch.name), [
    { label: 'Audio', icon: 'vol', key: String(i + 1), run: () => setAudio(i) },
    { label: 'Full screen', sub: 'This tile becomes the player', icon: 'full', key: `Shift ${i + 1}`, run: () => expand(i) },
    { label: 'Clear slot', icon: 'close', key: i === audio ? 'Del' : '', run: () => clearSlot(i) },
  ]);
}
// drag a row (or a game card or a channel row from anywhere) onto an empty slot: it lights pink and says what happens
function wireDrop() {
  el.addEventListener('dragstart', (e) => {
    const g = e.target.closest?.('[data-drag-g]'), c = e.target.closest?.('[data-drag-ch]');
    if (g) e.dataTransfer.setData('text/x-airglow', `g:${g.dataset.dragG}`);
    else if (c) e.dataTransfer.setData('text/x-airglow', `c:${c.dataset.dragCh}`);
  });
}
document.addEventListener('dragstart', (e) => {
  const g = e.target.closest?.('.gcard[data-g]');
  if (g && !e.dataTransfer.getData('text/x-airglow')) e.dataTransfer.setData('text/x-airglow', `g:${g.dataset.g}`);
});
const slotAt = (x, y) => rects().findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
document.addEventListener('dragover', (e) => {
  if (!openNow) return;
  const i = slotAt(e.clientX, e.clientY);
  el?.querySelectorAll('.mv-t.drop').forEach((x) => x.classList.remove('drop'));
  if (i >= 0 && slots[i]?.kind === 'empty') {
    e.preventDefault();
    const t = el?.querySelector(`.mv-t.empty[data-slot="${i}"]`);
    if (t) { t.classList.add('drop'); t.querySelector('b').textContent = 'Drop to add'; }
  }
});
document.addEventListener('drop', (e) => {
  if (!openNow) return;
  const v = e.dataTransfer.getData('text/x-airglow'), i = slotAt(e.clientX, e.clientY);
  if (!v || i < 0 || slots[i]?.kind !== 'empty') return;
  e.preventDefault();
  if (v.startsWith('g:')) { const g = gameById(v.slice(2)); if (g) addGame(g, i); }
  else { const ch = chOf(v.slice(2)); if (ch) addChannel(ch, i); }
  drawLayer();
});
on('nba', () => { if (openNow) { drawLayer(); if (picker) drawPicker(); } });
export const testState = () => (openNow ? { slots: slots.map((s) => ({ kind: s.kind, mid: s.mid || '', ch: s.ch?.name || '', g: s.g?.id || '' })), audio, layout: layoutNow(), picker, cap } : null);
