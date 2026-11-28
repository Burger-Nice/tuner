// Try Rapt (design/brand-v7/rapt/BUILD-PLAN.md section 2): a hidden test page, Account > About > Try Rapt, that proves
// the riskiest parts of the Rapt design on the TV before anything else is built. Nothing else in the app changes.
//   - the menu (drawn, not navigating), the title block, two shelves from his own Films and Series (shelves.js Popular)
//   - the full-screen picture of the focused title: 250 ms rest, 300 ms cross-fade, dimmed by a black layer
//   - Funnel Display (bundled) at the six sizes (Type), the focus pair (fill on text, ring on pictures), focus.js
//   - the new sounds through the same instant path as today's (Sounds: switches between the two sets)
//   - Play into the native player; the Reel launch; a readout (frame times, pictures held, heap, speech recognition)
//   - Send a report: the readout's numbers only (report-scrub.js 'manual')
// Styles: tv/rapt/rapt.css, loaded the first time the page opens, every rule under .rapt.
import { esc, hm, initials, sized, setHtml } from '../util.js';
import { store, settings } from '../state.js';
import { focus, pushLayer, popLayer } from '../focus.js';
import { toast } from '../ui.js';
import { sfx } from '../sfx.js';
import { native } from '../native.js';
import { resumeAddonItem } from '../titlecopies.js';
import { watching } from '../player.js';
import * as SH from '../shelves.js';
import * as AD from '../addons.js';
import { analyse, known, capFor } from '../art.js';
import { reportsAvailable, sendNow } from '../reports.js';
import { raptSound } from './sound.js';
import * as M from './meter.js';
import { reelHtml, markSvg, playReel, reelKey, reelRunning, reelStop } from './reel.js';

const WANT = 48;                 // posters per shelf (the Popular shelf, read page by page until there are this many)
const STEP = 82;                 // a poster (72) and the gap (10)
const SHOWN = 10;                // posters in the safe area
const AHEAD = 2;                 // pictures loaded either side of what's shown
const REST = 250;                // the canvas waits this long after focus stops (SYSTEM-NOTES "Motion")
const FADE = 300;
const MENU = ['Home', 'Series', 'Films', 'NBA', 'Live', 'Search', 'Saved', 'Account'];
const html = document.documentElement;

let root = null, block, readEl, plate, cssReady = null, cssDone = false;
const shelves = [{ kind: 'movie', label: 'Films', items: [], state: 'idle' }, { kind: 'series', label: 'Series', items: [], state: 'idle' }];
let cur = 0;                     // the shelf on screen
const idx = [0, 0];              // the focused poster per shelf
let want = null, lit = '', restT = 0, dropT = 0, tok = 0, readT = 0, clockT = 0;
let shown = null, pending = null;   // the title the block (and its Play) shows; the picture layer a swap is waiting on
let dirAt = -1e9, dirHeld = false, moved = false, plays = 0, opener = null;
let set = store.get('raptSounds', 'v2');   // which UI sounds play on this page: 'v1' today's, 'v2' the new set

const v2 = () => set === 'v2';
const keyOf = (it) => `${it.kind}:${it.id}`;
const bgOf = (it) => (it.background ? sized(String(it.background).replace(/\/background\/large\//, '/background/medium/'), 1280) : '');

function loadCss() {
  if (!cssReady) cssReady = new Promise((res) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = 'tv/rapt/rapt.css';
    l.onload = l.onerror = () => { cssDone = true; res(); };
    document.head.appendChild(l);
  });
  return cssReady;
}

// ---------- markup ----------
const pill = (a, label, cls = '') => `<span class="r-pill fx${cls}" tabindex="-1" data-a="${a}">${label}</span>`;
const soundsLabel = () => `Sounds · <b>${v2() ? 'New' : 'Today\'s'}</b>`;
function frame() {
  return `<div class="r-art"><div class="r-bd"><img alt=""></div><div class="r-bd"><img alt=""></div><div class="r-cap"></div><div class="r-scrim"></div></div>
    <nav class="r-menu" data-row>${markSvg('r-mk')}${MENU.map((m, i) => `<span class="r-mi fx${i ? '' : ' on'}" tabindex="-1" data-a="menu">${m}</span>`).join('')}<span class="r-clock"></span></nav>
    <div class="r-lane" data-row><span class="r-lab">Try Rapt</span>${pill('sounds', soundsLabel())}${pill('launch', 'Launch')}${pill('type', 'Type')}${pill('reset', 'Reset numbers')}${pill('report', 'Send a report')}</div>
    <section class="r-block"></section>
    <div class="r-read"></div>
    ${shelves.map((s, i) => `<section class="r-shelf" data-shelf="${i}"${i ? ' hidden' : ''}><div class="r-name">${s.label}<span></span></div><div class="r-next">${i ? '▲ Films' : '▼ Series'}</div><div class="r-clip"><div class="r-row" data-row></div></div><div class="r-empty">Getting your ${s.label.toLowerCase()}…</div></section>`).join('')}
    <div class="r-dlg" hidden>
      <div class="r-ty"><small>hero 60</small><span class="r-hero">Rapt</span></div>
      <div class="r-ty"><small>page 44</small><span class="r-page">Films and series</span></div>
      <div class="r-ty"><small>head 28</small><span class="r-head">Season 2 · Episode 9</span></div>
      <div class="r-ty"><small>fact 20</small><span class="r-fact"><b>Ends 22:38</b> · 2 h 17 min</span></div>
      <div class="r-ty"><small>menu 18</small><span class="r-menu-s">Home · Series · Films · NBA</span></div>
      <div class="r-ty"><small>read 17</small><span class="r-read-s">Þjóðleikhúsið · Ćevapi · Şişli · Łódź · æ ð þ</span></div>
      <div class="r-act" data-row>${pill('close', 'Close')}</div>
    </div>
    ${reelHtml()}`;
}

// ---------- the shelves ----------
async function load(i) {
  const s = shelves[i];
  // a shelf that failed (or came back empty) tries again each time the page opens
  if (s.state === 'loading' || (s.state === 'done' && s.items.length)) return;
  s.state = 'loading';
  if (root && !s.items.length) drawShelf(i);   // ("Getting your films…" again while it tries)
  let pg = null;
  const take = () => pg.items.filter((it) => it.poster).slice(0, WANT + 12);
  try {
    pg = new SH.Pager(SH.shelves(s.kind)[0]);   // Popular: what Films and Series open on
    for (let n = 0; n < 8 && pg.items.length < WANT && !pg.end; n++) await pg.more();
    s.items = take();
    s.state = 'done';
  } catch {
    if (pg?.items.length) s.items = take();   // (the pages that came before one failed)
    s.state = s.items.length ? 'done' : 'failed';
  }
  if (!root) return;
  drawShelf(i);
  // nothing chosen yet: the first film lights the page and takes focus (unless he has moved somewhere already)
  if (i === 0 && s.items.length && !moved && !reelRunning() && plate.hidden && !root.hidden) {
    const a = document.activeElement;
    if (!a || a === document.body || root.contains(a)) focus(rowOf(0).querySelector('.r-p'));
  }
}
const rowOf = (i) => root.querySelector(`.r-shelf[data-shelf="${i}"] .r-row`);
function drawShelf(i) {
  const s = shelves[i], sec = root.querySelector(`.r-shelf[data-shelf="${i}"]`), row = rowOf(i);
  sec.querySelector('.r-empty').hidden = s.items.length > 0;
  if (!s.items.length) sec.querySelector('.r-empty').textContent = s.state === 'failed' ? `Your ${s.label.toLowerCase()} didn't load` : s.state === 'done' ? `No ${s.label.toLowerCase()} came` : `Getting your ${s.label.toLowerCase()}…`;
  setHtml(row, s.items.map((it, j) => `<div class="r-p fx" tabindex="-1" data-i="${j}" data-key="${esc(keyOf(it))}"><span class="r-ini">${esc(initials(it.name))}</span></div>`).join(''));   // (focus follows the poster by its data-key)
  row.navHook = (dir) => {
    if (dir === 'down' && i === 0 && shelves[1].items.length) { showShelf(1); return true; }
    if (dir === 'down') return false;
    if (dir === 'up' && i === 1) { showShelf(0); return true; }
    return undefined;   // Left / Right along the row, Up from the first shelf to the actions: focus.js as everywhere
  };
  place(i);
}
// The row slides so the focused poster is second from the left; only the posters in view (and two either side) hold
// a picture, so a 48-poster shelf decodes about 14
function place(i) {
  const s = shelves[i], row = rowOf(i), n = s.items.length;
  if (!row || !n) return;
  const at = Math.min(idx[i], n - 1), start = Math.max(0, Math.min(at - 1, n - SHOWN));
  row.style.transform = `translateX(${-start * STEP}px)`;
  const hiddenShelf = i !== cur || root.hidden;
  row.querySelectorAll('.r-p').forEach((p, j) => {
    const keep = !hiddenShelf && j >= start - AHEAD && j < start + SHOWN + AHEAD;
    let img = p.querySelector('img');
    if (keep && !img) {
      img = document.createElement('img');
      img.alt = ''; img.decoding = 'async';
      img.onerror = () => img.remove();
      img.src = SH.posterSmall(s.items[j].poster);
      p.appendChild(img);
    } else if (!keep && img) img.remove();
  });
  root.querySelector(`.r-shelf[data-shelf="${i}"] .r-name span`).textContent = `${at + 1} of ${n}`;
}
function showShelf(i) {
  const was = cur;
  cur = i;
  root.querySelectorAll('.r-shelf').forEach((x) => (x.hidden = +x.dataset.shelf !== i));
  place(was); place(i);   // (the shelf that went drops its pictures)
  const el = rowOf(i).querySelector(`.r-p[data-i="${idx[i]}"]`) || rowOf(i).querySelector('.r-p');
  if (el) focus(el);
}

// ---------- the canvas: the picture and the title block, after a rest ----------
function wantCanvas(it) {
  want = it;
  clearTimeout(restT);
  restT = setTimeout(rest, REST);
}
function rest() {
  if (!want || !root || root.hidden) return;
  if (html.classList.contains('rep')) {
    // never while a key is held (a held key sends a keydown every ~50 ms); with none for a while its keyup went
    // missing, and the picture settles anyway
    if (performance.now() - dirAt < 300) { restT = setTimeout(rest, 80); return; }
    html.classList.remove('rep');
  }
  applyCanvas(want);
}
const shownKey = () => (shown ? keyOf(shown) : '');
// Focus left the posters: the block and the picture stay on the title they show (so Play and Details, which act on
// that title, are never redrawn under focus). A rest still waiting, or a picture still decoding, for another poster
// is dropped; focus coming back to a poster asks for it again.
function holdCanvas() {
  clearTimeout(restT); want = null;
  if (lit === shownKey()) return;   // (nothing else on the way: a picture coming back for the shown title goes on)
  tok++; lit = shownKey();
  if (pending && !pending.classList.contains('vis')) pending.querySelector('img').removeAttribute('src');
  pending = null;
}
function applyCanvas(it) {
  const k = keyOf(it);
  if (k === lit) return;
  lit = k;
  const my = ++tok;
  const layers = [...root.querySelectorAll('.r-bd')];
  const now = layers.find((l) => l.classList.contains('vis')), next = layers.find((l) => l !== now) || layers[0];
  const img = next.querySelector('img');
  const url = bgOf(it) || sized(it.poster || '', 780);
  pending = next;
  const swap = (ok) => {
    if (my !== tok || !root) return;
    pending = null;
    if (k !== shownKey()) drawBlock(it);
    root.dataset.lit = k;   // (what the canvas shows: the tests read it)
    if (ok) next.classList.add('vis');
    now?.classList.remove('vis');
    if (!ok) next.classList.remove('vis');
    M.watch('fade', FADE + 80);
    const a = ok ? known(url) : null;
    root.style.setProperty('--cap', (a ? capFor(a, 0.3) : 0.28).toFixed(2));
    if (ok && !a) analyse(url).then((b) => { if (my === tok && b && root) root.style.setProperty('--cap', capFor(b, 0.3).toFixed(2)); }).catch(() => {});
    // the picture that went is let go once its fade is over: one big picture held, two only during a fade
    clearTimeout(dropT);
    dropT = setTimeout(() => { if (my === tok && now && !now.classList.contains('vis')) now.querySelector('img').removeAttribute('src'); }, FADE + 60);
  };
  if (!url) return swap(false);
  img.onload = img.onerror = null;
  img.src = url;
  // decoded before the fade starts (a big picture decoded in the fade's first frame stalls it)
  if (img.decode) img.decode().then(() => swap(true), () => { if (img.getAttribute('src') === url) swap(img.complete && img.naturalWidth > 0); });
  else { img.onload = () => swap(true); img.onerror = () => swap(false); }
}
function drawBlock(it) {
  const film = it.kind !== 'series';
  const g = (it.genres || []).slice(0, 2).map((x, i) => (i ? String(x).toLowerCase() : x)).join(', ');
  const kLine = [film ? 'Film' : 'Series', it.year || '', g].filter(Boolean).join(' · ');
  const rt = it.runtime ? (it.runtime >= 60 ? `${Math.floor(it.runtime / 60)} h ${it.runtime % 60} min` : `${it.runtime} min`) : '';
  const fact = [it.rating ? `<b>IMDb ${it.rating.toFixed(1)}</b>` : `<b>${film ? 'Popular films' : 'Popular series'}</b>`, rt ? esc(rt) : ''].filter(Boolean).join(' · ');
  shown = it;
  // drawn once; after that only the words change, so Play and Details are never replaced (one may have focus)
  if (!block.querySelector('.r-act')) block.innerHTML = `<div class="r-k"></div><h1></h1><div class="r-m"></div>
    <div class="r-act" data-row><i class="r-key" aria-label="OK button">OK</i>${pill('play', '', ' first')}${pill('details', 'Details')}</div>`;
  setHtml(block.querySelector('.r-k'), esc(kLine));
  setHtml(block.querySelector('h1'), esc(it.name));
  setHtml(block.querySelector('.r-m'), fact);
  const pl = block.querySelector('[data-a="play"]'), label = film ? 'Play' : 'Play episode 1';
  if (pl.textContent !== label) pl.textContent = label;
  if (!block.contains(document.activeElement)) { block.classList.remove('in'); void block.offsetWidth; block.classList.add('in'); }
}
const litItem = () => { const s = shelves[cur]; return s.items[idx[cur]] || null; };
const posterItem = (p) => shelves[+p.closest('.r-shelf').dataset.shelf]?.items[+p.dataset.i] || null;

// ---------- Play: the add-ons' best copy in the native player, as Home's Play now does ----------
async function play(it) {
  if (!it) return;
  plays++;
  const imdb = await SH.imdbOfItem(it).catch(() => '');
  if (!imdb) return toast(`Couldn't find ${it.name}'s details right now`, 3500);
  if (it.kind === 'series') {
    const m = await AD.meta('series', imdb).catch(() => null);
    const v = (m?.videos || []).filter((e) => e.season > 0).sort((a, b) => a.season - b.season || a.episode - b.episode)[0];
    if (!v) return toast('No episodes listed for this series yet', 3500);
    return resumeAddonItem({ kind: 'episode', id: v.id || `${imdb}:${v.season}:${v.episode}`, name: v.name || `Episode ${v.episode}`, season: v.season, ep: v.episode, seriesId: imdb, seriesName: m.name || it.name, imdbSeries: imdb, poster: m?.poster || it.poster || '', year: m?.year || it.year || '',
      copy: { source: '', key: '', binge: '', kind: 'series', tkey: imdb, tid: imdb, title: m.name || it.name, runtime: (m?.runtime || 0) * 60 } });
  }
  return resumeAddonItem({ kind: 'movie', id: imdb, name: it.name, _title: it.name, poster: it.poster, year: it.year || '', copy: { source: '', key: '', binge: '', kind: 'movie', tkey: imdb, tid: imdb, title: it.name, runtime: (it.runtime || 0) * 60 } });
}

// ---------- the readout ----------
function speechLine() {
  if (!native) return 'Speech recognition: no TV here';
  const s = native.info?.().speech;
  return `Speech recognition: <b>${s === true ? 'available' : s === false ? 'not available' : 'not reported'}</b>`;
}
const soundPath = () => (v2() ? raptSound.path() : sfx.status().native ? 'soundpool' : 'webaudio');
function soundLine() { return `Sounds: <b>${v2() ? 'new set' : 'today\'s'}</b> · ${soundPath() === 'soundpool' ? 'SoundPool' : soundPath() === 'webaudio' ? 'Web Audio' : soundPath()}`; }
function drawRead() {
  if (!root || root.hidden || watching()) return;   // (nothing redrawn behind the player)
  const h = M.lines(root, { speech: speechLine(), sound: soundLine() }).map((l) => `<div>${l}</div>`).join('');
  if (readEl._h !== h) { readEl.innerHTML = h; readEl._h = h; }
}
function facts() {
  const s = native?.info?.().speech;
  return M.reportFacts(root, { speech: typeof s === 'boolean' ? s : undefined, sounds: set, soundPath: soundPath(), films: shelves[0].items.length, series: shelves[1].items.length, plays });
}

// ---------- Type: the six sizes on a plate (a layer: focus stays in it, Back closes it) ----------
function openType() {
  opener = document.activeElement;
  plate.hidden = false;
  if (v2()) raptSound.play('open');
  pushLayer(plate, plate.querySelector('[data-a="close"]'));
}
function closeType() {
  if (plate.hidden) return false;
  plate.hidden = true;
  if (v2()) raptSound.play('close');
  popLayer(plate, opener);
  return true;
}

// ---------- keys and sounds ----------
// Before main.js's own handler (window, capture): which direction key caused the focus change that follows
function onKeyDown(e) {
  if (!root || root.hidden) return;
  if (/^Arrow/.test(e.key)) { dirAt = performance.now(); dirHeld = e.repeat; moved = true; }
}
function act(a, el) {
  // the block's buttons act on the title the block shows; OK on a poster on that poster
  if (a === 'play') return play(el?.classList.contains('r-p') ? posterItem(el) : shown);
  if (a === 'details') { if (shown) SH.openItem(shown); return; }
  if (a === 'menu') return toast('The menu is only drawn on this test page. Back leaves it.', 3000);
  if (a === 'launch') return playReel(root);
  if (a === 'type') return openType();
  if (a === 'close') return closeType();
  if (a === 'reset') { M.resetStats(); drawRead(); return toast('The numbers start again', 2000); }
  if (a === 'report') {
    if (!reportsAvailable()) return toast('Reports aren\'t set up in this build', 3500);
    return toast(sendNow(facts()) ? 'Sent: the numbers on this page' : 'Reports are off on this TV', 5000);
  }
  if (a === 'sounds') {
    set = v2() ? 'v1' : 'v2';
    store.set('raptSounds', set);
    sfx.mode(v2() ? 'off' : settings().sounds || 'on');   // (today's set plays through sfx.js as everywhere; the new one here)
    if (v2()) { raptSound.init(); setTimeout(() => raptSound.play('toggle-on'), 30); } else setTimeout(() => sfx.play('toggle-on', { cd: 0 }), 30);
    el.innerHTML = soundsLabel();
    drawRead();
  }
}

// Account's Try Rapt row loads this file when it's chosen (never at start-up) and waits for this before opening the page
export const ready = () => loadCss();

export default {
  name: 'rapt',
  bar: false,
  mount(el) {
    root = el;
    el.classList.add('rapt');
    el.hidden = true;
    el.innerHTML = frame();
    // nothing of the page shows before its stylesheet has loaded (unstyled, the launch's pictures and the mark draw
    // large); the page stays focusable meanwhile. (!important: above the router's screen-in animation)
    if (!cssDone) { el.style.setProperty('opacity', '0', 'important'); loadCss().then(() => el.style.removeProperty('opacity')); }
    block = el.querySelector('.r-block'); readEl = el.querySelector('.r-read'); plate = el.querySelector('.r-dlg');
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) el.classList.add('r-reduce');
    el.addEventListener('tvfocus', (e) => {
      const t = e.target;
      const isP = t.classList.contains('r-p');
      el.classList.toggle('r-item', isP);
      const byKey = performance.now() - dirAt < 120;
      if (byKey && v2()) raptSound.play('focus', { held: dirHeld });
      if (byKey) M.watch('move', 300);
      if (!isP) return holdCanvas();
      const i = +t.closest('.r-shelf').dataset.shelf;
      idx[i] = +t.dataset.i;
      place(i);
      wantCanvas(shelves[i].items[idx[i]]);
    });
    el.addEventListener('click', (e) => {
      const p = e.target.closest('.r-p');
      const a = p ? 'play' : e.target.closest('[data-a]')?.dataset.a;
      if (!a) return;
      if (v2() && a !== 'type' && a !== 'close' && a !== 'sounds') raptSound.play('select');
      act(a, p || e.target.closest('[data-a]'));
    });
    window.addEventListener('keydown', onKeyDown, true);
  },
  async enter(el) {
    loadCss().then(() => { if (!el.hidden) { place(cur); } });
    if (v2()) { sfx.mode('off'); raptSound.init(); }
    raptSound.preloadLaunch();
    load(0).then(() => load(1));
    place(cur);
    const it = shown || litItem();
    if (it && !el.querySelector('.r-bd.vis img[src]')) { lit = ''; applyCanvas(it); }   // (back from a title page: the picture it let go)
    const tick = () => { const c = el.querySelector('.r-clock'); if (c) c.textContent = hm(Date.now()); };
    tick(); clearInterval(clockT); clockT = setInterval(tick, 15000);
    clearInterval(readT); readT = setInterval(drawRead, 700); drawRead();
  },
  leave(el) {
    clearInterval(readT); clearInterval(clockT); clearTimeout(restT); clearTimeout(dropT);
    tok++; want = null; pending = null;
    reelStop(); closeType(); M.stopWatching();
    // everything this page decoded goes: the big pictures and the shelves' posters
    el.querySelectorAll('.r-bd').forEach((l) => { l.classList.remove('vis'); l.querySelector('img').removeAttribute('src'); });
    el.querySelectorAll('.r-p img').forEach((i) => i.remove());
    lit = ''; delete el.dataset.lit;
    setTimeout(() => { if (el.hidden) raptSound.close(); }, 400);   // (after Back's own sound)
    // today's sounds back for the rest of the app, after Back's own (queued) sound has had its turn
    setTimeout(() => sfx.mode(settings().sounds || 'on'), 0);
  },
  entry(el) {
    const r = rowOf(cur);
    return r?.querySelector(`.r-p[data-i="${idx[cur]}"]`) || r?.querySelector('.r-p') || el.querySelector('.r-lane .r-pill');
  },
  key(k) {
    if (reelRunning()) return reelKey();
    return false;
  },
  back() {
    if (reelRunning()) return true;
    if (closeType()) return true;
    if (v2()) raptSound.play('back');
    return false;   // leaves the page (main.js pops it)
  },
};
