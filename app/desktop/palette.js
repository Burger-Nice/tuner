// The one box: search and commands (desktop SPEC 0.3, 5.6, mock 10). Ctrl K anywhere, or a click in the title bar's
// box: a 760 px sheet over a dim. Groups in this order, each at most 3 rows: Actions (verbs on what the query matches),
// Teams, Channels, Films and series, Games, Settings, Pages. Each row has one verb at its right and Enter does it; Shift
// Enter plays now; digits alone tune (the TV's digit rule). Under the shield no row prints a score or a result.
import { hm, esc } from '../tv/js/util.js';
import { S, settings } from '../tv/js/state.js';
import { searchAll, catalog } from '../tv/js/catalog.js';
import { guideNow, onNow } from '../tv/js/guide.js';
import { nba, show, bestChannel, isMine, favTeam } from '../tv/js/games.js';
import { programmeView, videoMask } from '../tv/js/catchup.js';
import { playLive } from '../tv/js/player.js';
import { watchFromTipoff } from '../tv/js/replay.js';
import * as AD from '../tv/js/addons.js';
import { ic, go, push, tileOf, cleanCh, crestImg } from './ui.js';
import { floatRoot } from './float.js';
import { openTitle } from './detail.js';
import * as rem from './reminders.js';

let el = null, q = '', rows = [], sel = 0, adT = 0, ads = null;
const RECENT = 'tuner.dkRecentQ';
const recents = () => { try { return JSON.parse(localStorage.getItem(RECENT) || '[]'); } catch { return []; } };
const remember = (s) => { if (!s.trim()) return; try { localStorage.setItem(RECENT, JSON.stringify([s.trim(), ...recents().filter((x) => x !== s.trim())].slice(0, 5))); } catch { /* none */ } };
export const isOpen = () => !!el;
const gname = (g) => `${g.away.name} at ${g.home.name}`;
const ring = () => (catalog.live?.items || []).filter((c) => !c._sep);
const tune = (ch) => playLive(ch, ring(), 'All channels');

const PAGES = [['Home', 'home', 'Ctrl 1'], ['Live · the guide', 'live', 'Ctrl 2'], ['NBA', 'nba', 'Ctrl 3'], ['Movies', 'movie', 'Ctrl 4'], ['Series', 'series', 'Ctrl 5'], ['Saved', 'saved', 'Ctrl 6'], ['Search', 'search', '/'], ['Account', 'account', 'Ctrl ,'], ['Multiview', 'multiview', 'Ctrl Shift M'], ['Keyboard shortcuts', 'keys', '?']];
const SETTINGS = [['Spoiler shield', 'nba', () => `${{ off: 'Off', mine: 'My team', all: 'All games' }[settings().shield || 'off']}`], ['Your team', 'nba', () => window.NBA.team(favTeam())?.name || 'None'], ['Subtitles', 'languages', () => ''], ['Add-ons', 'films', () => ''], ['TMDB key', 'films', () => ''], ['Start with Windows', 'windows', () => ''], ['Close keeps airglow in the tray', 'windows', () => ''], ['Hardware decoding', 'windows', () => ''], ['Audio device', 'windows', () => ''], ['Open mpv.conf', 'windows', () => ''], ['Updates', 'updates', () => ''], ['Check the connection', 'provider', () => ''], ['Home rows', 'rows', () => '']];
const goPage = (k) => { if (k === 'movie' || k === 'series') return go('lib', { seg: k }); if (k === 'multiview') return import('./multiview.js').then((m) => m.open()); if (k === 'keys') return import('./keys.js').then((m) => m.openSheet()); go(k); };

// ---------- the results ----------
function build() {
  const s = q.trim(), n = s.toLowerCase(), out = [];
  const add = (group, r) => { if (out.filter((x) => x.group === group).length < 3) out.push({ group, ...r }); };
  if (!s) {
    for (const x of recents()) add('Recent', { icon: ic('search'), title: x, sub: '', verb: 'Search', run: () => { q = x; draw(); } });
    const mine = nba.today.find(isMine);
    if (mine) gameRows(mine, add);
    for (const [t, k, key] of PAGES.slice(0, 6)) add('Pages', { icon: ic('chevR'), title: t, sub: '', verb: 'Open', key, run: () => goPage(k) });
    return out;
  }
  // digits alone: the channel with that number (Enter tunes)
  if (/^\d{1,4}$/.test(s)) {
    const ch = ring().find((c) => +c.num === +s);
    if (ch) add('Actions', { icon: tileOf(ch), title: `Tune channel ${s} · ${cleanCh(ch.name)}`, sub: nowLine(ch), verb: 'Tune', run: () => tune(ch), play: () => tune(ch) });
  }
  const games = nba.today.filter((g) => [g.home, g.away].some((t) => `${t.name} ${window.NBA.team(t.abbr)?.city || ''} ${t.abbr}`.toLowerCase().includes(n)));
  for (const g of games.slice(0, 1)) gameRows(g, add);
  for (const t of window.NBA.TEAMS.filter((x) => `${x.abbr} ${x.city} ${x.name}`.toLowerCase().includes(n) || x.nameRe.test(s)).slice(0, 3)) {
    add('Teams', { icon: crestImg({ abbr: t.abbr }, 26), title: `${t.city} ${t.name}`, sub: t.abbr === favTeam() ? 'Your team' : 'Team page', verb: 'Open', run: () => push('team', { abbr: t.abbr }) });
  }
  const r = searchAll(s, 12);
  for (const ch of r.live.slice(0, 3)) add('Channels', { icon: tileOf(ch), title: `${ch.num ? `${ch.num} · ` : ''}${cleanCh(ch.name)}`, sub: nowLine(ch), verb: 'Tune', run: () => tune(ch), play: () => tune(ch), alt: { verb: 'Guide', run: () => go('live', { ch: ch.id }) } });
  for (const m of (ads?.q === s ? ads.items : []).slice(0, 3)) add('Films and series', { icon: m.poster ? `<img class="pp" src="${esc(m.poster)}" alt="">` : ic('film'), title: m.name, sub: [m.type === 'series' ? 'Series' : 'Film', m.releaseInfo || m.year || '', m.genres?.slice?.(0, 2).join(' · ') || '', m.imdbRating ? `IMDb ${m.imdbRating}` : ''].filter(Boolean).join(' · '), verb: 'Details', run: () => openTitle({ kind: m.type === 'series' ? 'series' : 'movie', id: m.id, imdb: /^tt/.test(m.id) ? m.id : '', name: m.name, poster: m.poster, year: +m.year || 0 }) });
  if (ads?.q === s && ads.asking) add('Films and series', { icon: '<span class="spin"></span>', title: 'Asking your add-ons…', sub: '', verb: '', info: true });
  for (const g of games.slice(1, 4)) add('Games', gameRow(g));
  for (const [t, grp, v] of SETTINGS.filter(([t]) => t.toLowerCase().includes(n))) add('Settings', { icon: ic('gear'), title: t, sub: v(), verb: 'Set', run: () => go('account', { open: grp }) });
  for (const [t, k, key] of PAGES.filter(([t]) => t.toLowerCase().includes(n))) add('Pages', { icon: ic('chevR'), title: t, sub: '', verb: 'Open', key, run: () => goPage(k) });
  if (s.length >= 2) add('Pages', { icon: ic('search'), title: `See all results for “${s}”`, sub: '', verb: 'Open', key: '/', run: () => { go('search'); setTimeout(() => { const i = document.getElementById('sr-q'); if (i) { i.value = s; i.dispatchEvent(new Event('input', { bubbles: true })); } }, 60); } });
  return out;
}
const nowLine = (ch) => { const p = onNow(guideNow(ch)); return p ? `${programmeView(ch, p).title} · until ${hm(p.end)}` : 'Channel'; };
// a game's actions: Watch (live) or Remind me (later), Add to multiview, From tip-off; never a score under the shield
function gameRows(g, add) {
  const ch = bestChannel(g), v = show(g);
  if (g.state === 'in' && ch) add('Actions', { icon: ic('play'), title: `Watch ${gname(g)}`, sub: `${cleanCh(ch.name)} · ${v.hidden ? 'Score hidden' : 'Live'}`, verb: 'Watch', key: 'Enter', run: () => tune(ch), play: () => tune(ch) });
  if (g.state === 'pre') add('Actions', { icon: ic('bell'), title: rem.isSet(g) ? `No reminder for ${gname(g)}` : `Remind me 10 min before tip-off`, sub: `${gname(g)} · ${hm(g.date)} · a Windows notification`, verb: 'Set', key: 'Ctrl R', run: () => rem.toggle(g) });
  if (g.state !== 'post') add('Actions', { icon: ic('grid'), title: `Add ${gname(g)} to multiview`, sub: g.state === 'pre' ? `Tunes by itself at ${hm(g.date)}` : 'The next free slot', verb: 'Add', key: 'Ctrl M', run: () => import('./multiview.js').then((m) => m.addGame(g)) });
  if (g.state !== 'pre') add('Actions', { icon: ic('tipoff'), title: `Watch ${gname(g)} from tip-off`, sub: 'The replay, no spoilers', verb: 'Watch', run: () => watchFromTipoff(g) });
  add('Games', gameRow(g));
}
function gameRow(g) {
  const v = show(g);
  const st = g.state === 'pre' ? `Tonight ${hm(g.date)}` : g.state === 'in' ? (v.hidden ? 'Live · Score hidden' : `Live · ${v.g.away.score}–${v.g.home.score}`) : v.hidden ? 'Ended · Score hidden' : `Final · ${v.g.away.score}–${v.g.home.score}`;
  return { icon: `${crestImg(g.away, 22)}`, title: gname(g), sub: st, verb: 'Open', run: () => push('game', { id: g.id }) };
}
function askAddons() {
  clearTimeout(adT);
  const s = q.trim();
  if (s.length < 3 || /^\d+$/.test(s)) { ads = null; return; }
  if (ads?.q === s) return;
  adT = setTimeout(async () => {
    const st = { q: s, asking: true, items: [] };
    ads = st; draw();
    const cats = AD.searchCatalogs();
    const lists = cats.length ? await Promise.all(cats.slice(0, 4).map((x) => AD.catalogPage(x.a, x.c, { search: s }).catch(() => []))) : [await AD.cinemetaSearch('movie', s).catch(() => []), await AD.cinemetaSearch('series', s).catch(() => [])];
    if (ads !== st) return;
    const seen = new Set();
    for (const m of lists.flat()) { if (!m?.id || seen.has(m.id) || videoMask({ kind: 'movie', id: m.id, name: m.name })) continue; seen.add(m.id); st.items.push(m); }
    st.asking = false;
    if (isOpen()) draw();
  }, 150);
}

// ---------- the sheet ----------
export function open(text = '') {
  if (el) { el.querySelector('input')?.focus(); return; }
  if (!S.acc) return;
  q = text; sel = 0;
  el = document.createElement('div');
  el.className = 'fl pal-ov';
  el.innerHTML = `<div class="scrim"></div><div class="pal"><div class="pal-f">${ic('search')}<input id="pal-q" type="text" placeholder="Type a title, a channel number, a team, a game, a setting" spellcheck="false" autocomplete="off" value="${esc(q)}"><span class="k">Esc</span></div><div class="pal-res"></div><div class="pal-foot"><span><span class="k">↑</span><span class="k">↓</span> Move</span><span><span class="k">Enter</span> Open</span><span><span class="k">Shift</span><span class="k">Enter</span> Play now</span><span><span class="k">Esc</span> Close</span><span class="sp"></span><span>Type a channel number to tune</span></div></div>`;
  floatRoot('main').appendChild(el);
  const inp = el.querySelector('input');
  inp.addEventListener('input', () => { q = inp.value; sel = 0; askAddons(); draw(); });
  el.querySelector('.scrim').addEventListener('mousedown', close);
  el.addEventListener('click', (e) => { const r = e.target.closest('[data-row]'); if (r) { sel = +r.dataset.row; go1(e.shiftKey ? 'play' : e.target.closest('[data-alt]') ? 'alt' : 'run'); } });
  el.addEventListener('mousemove', (e) => { const r = e.target.closest('[data-row]'); if (r && +r.dataset.row !== sel) { sel = +r.dataset.row; mark(); } });
  draw();
  setTimeout(() => inp.focus(), 0);
}
export function close() { if (!el) return; el.remove(); el = null; }
function draw() {
  if (!el) return;
  rows = build().filter((r) => !r.info || true);
  if (sel >= rows.length) sel = 0;
  let html = '', last = '';
  rows.forEach((r, i) => {
    if (r.group !== last) { html += `<div class="pal-g">${esc(r.group)}</div>`; last = r.group; }
    html += `<button class="pal-r${i === sel ? ' sel' : ''}${r.info ? ' info' : ''}" data-row="${i}" tabindex="-1"><span class="ico">${r.icon || ''}</span><span class="col"><b>${esc(r.title)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span>${r.alt ? `<span class="alt" data-alt="1">${esc(r.alt.verb)}</span>` : ''}${r.key ? `<span class="k">${esc(r.key)}</span>` : ''}${r.verb ? `<span class="verb">${esc(r.verb)}</span>` : ''}</button>`;
  });
  el.querySelector('.pal-res').innerHTML = html || `<div class="pal-none">${q.trim() ? 'Nothing matches. Try part of a name, or a channel number.' : ''}</div>`;
}
function mark() { el?.querySelectorAll('.pal-r').forEach((b) => b.classList.toggle('sel', +b.dataset.row === sel)); el?.querySelector('.pal-r.sel')?.scrollIntoView({ block: 'nearest' }); }
function go1(how) {
  const r = rows[sel];
  if (!r || r.info) return;
  remember(q);
  close();
  if (how === 'play' && r.play) return r.play();
  if (how === 'alt' && r.alt) return r.alt.run();
  r.run?.();
}
// the palette's keys (main.js asks first while it is open)
export function key(e) {
  if (!el) return false;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = rows.length; if (n) { do { sel = (sel + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; } while (rows[sel]?.info && n > 1); } mark(); return true; }
  if (e.key === 'Enter') { e.preventDefault(); go1(e.shiftKey ? 'play' : 'run'); return true; }
  if (e.key === 'Escape') { e.preventDefault(); close(); return true; }
  if (e.ctrlKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); close(); return true; }
  return false;   // (everything else types)
}
// the number typed on Home / Live / the guide, shown in the one box (the TV's digit rule)
export function showDigits(d) {
  const o = document.querySelector('#dk-tbar .omni span');
  if (!o) return;
  if (d) { const ch = ring().find((c) => +c.num === +d); o.textContent = `Channel ${d}${ch ? ` · ${cleanCh(ch.name)}` : ''}`; o.parentElement.classList.add('digits'); }
  else { o.textContent = 'Search or jump to anything'; o.parentElement.classList.remove('digits'); }
}
