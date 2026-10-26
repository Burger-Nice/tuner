// Search: a 6 x 6 keyboard on the left, results on the right, updated after every letter (▶ from the keyboard's right
// edge goes into them, ◀ from them comes back). After two letters a row of
// completed titles sits between the field and the keyboard (▲ from the top key row), so most searches end there.
// Matching is word-prefix only and ignores accents and punctuation ("spiderman" finds Spider-Man).
import { esc, ic, dot, logo, setHtml, hm, sized } from '../util.js';
import { S, on, store } from '../state.js';
import { catalog, ensure, searchAll, defaultVersion, browse } from '../catalog.js';
import { guideNow, onNow } from '../guide.js';
import { poster } from '../cards.js';
import { playLive, playVod, watching } from '../player.js';
import { push, current } from '../router.js';
import { focus } from '../focus.js';
import { ringFor, ringName } from './home.js';

const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
let el, q = '', keptAt = 0, res = null;
const recentKey = 'searchRecent';

function results() {
  if (!q.trim()) {
    const recent = store.get(recentKey, []);
    const trend = (catalog.movie?._sorted?.popular || (catalog.movie?.titles ? browse('movie', { sort: 'popular', f: {}, langFirst: false }) : [])).slice(0, 4);
    return `${recent.length ? `<div class="t-label" style="margin-bottom:10px">Recent</div><div class="chips" data-row>${recent.map((r) => `<span class="chip lg fx" tabindex="-1" data-recent="${esc(r)}">${ic('clock')}${esc(r)}</span>`).join('')}</div>` : ''}
      ${trend.length ? `<div class="t-label" style="margin:24px 0 10px">Trending</div><div class="rail" style="padding:0;gap:16px;margin:0"><div class="track" data-row style="gap:16px">${trend.map((t, i) => poster(t, 'tr' + i, { sm: true })).join('')}</div></div>` : '<div class="t-body">Type a channel, programme, movie, series or team.</div>'}`;
  }
  res = searchAll(q, 12);
  const top = res.movie[0] || res.series[0] || null;
  const onTv = [];
  const words = window.Titles.norm(q).split(' ').filter(Boolean);
  const matches = (s) => { const n = ' ' + window.Titles.norm(s); return words.every((w) => n.includes(' ' + w)); };
  for (const ch of catalog.live?.items || []) {
    if (onTv.length >= 3) break;
    const p = onNow(guideNow(ch));
    if (p && matches(p.title)) onTv.push({ ch, p });
  }
  const chans = res.live.slice(0, 3);
  const rest = [...res.movie, ...res.series].filter((t) => t !== top).slice(0, 4);
  if (!top && !onTv.length && !chans.length && !rest.length) return `<div class="state" style="margin-top:34px"><div class="ico">${ic('search')}</div><b style="overflow-wrap:anywhere">No results for “${esc(q.length > 24 ? q.slice(0, 23) + '…' : q)}”</b><p>Check the spelling, or try fewer letters. Search covers channels, programmes, movies and series.</p><div data-row style="display:flex;justify-content:center"><span class="btn2 sm fx" tabindex="-1" data-act="clear">Clear</span></div></div>`;
  const mini = (t) => `<div class="mini2" style="height:40px;width:28px"><div class="art">${t.poster ? `<img src="${esc(sized(t.poster, 92))}" alt="">` : ''}</div></div>`;
  let html = '<div data-col>';
  if (top) html += `<div class="t-label" style="margin-bottom:8px">Top result</div><div class="rrow fx" tabindex="-1" data-res="${top.kind === 'movie' ? 'p' : 't'}:${top.kind}:${top.id}" style="height:84px"><div class="mini2"><div class="art">${top.poster ? `<img src="${esc(sized(top.poster, 154))}" alt="">` : ''}</div></div><div class="grow" style="min-width:0"><div class="t-sub ellipsis" style="font-size:18px;line-height:24px">${esc(top.name)}</div><div class="t-cap">${top.kind === 'movie' ? 'Movie' : 'Series'}${top.year ? dot + esc(top.year) : ''}${top._q === '4K' ? `${dot}4K` : ''}${top.versions.length > 1 ? ` +${top.versions.length - 1} versions` : ''}</div></div><span class="btn sm">${ic('play')}${top.kind === 'movie' ? 'Play' : 'Open'}</span></div>`;
  if (onTv.length || chans.length) {
    html += '<div class="t-label" style="margin:14px 0 8px">On TV</div>';
    html += onTv.slice(0, 2).map(({ ch, p }) => `<div class="rrow fx" tabindex="-1" data-res="c:${ch.id}">${logo(ch.logo, ch.name, 'sm')}<div class="grow" style="min-width:0"><div class="t-sub ellipsis">${esc(p.title)}</div><div class="t-cap ellipsis">${esc(ch.name)}${dot}${hm(p.start)} to ${hm(p.end)}</div></div></div>`).join('');
    html += chans.filter((c) => !onTv.some((o) => o.ch === c)).slice(0, 2).map((ch) => `<div class="rrow fx" tabindex="-1" data-res="c:${ch.id}">${logo(ch.logo, ch.name, 'sm')}<div class="grow" style="min-width:0"><div class="t-sub ellipsis">${esc(ch.name)}</div><div class="t-cap">Channel ${ch.num}</div></div></div>`).join('');
  }
  if (rest.length) html += `<div class="t-label" style="margin:14px 0 8px">Movies and series</div>${rest.map((t) => `<div class="rrow fx" tabindex="-1" data-res="t:${t.kind}:${t.id}">${mini(t)}<div class="grow" style="min-width:0"><div class="t-sub ellipsis">${esc(t.name)}</div><div class="t-cap">${t.kind === 'movie' ? 'Movie' : 'Series'}${t.year ? dot + esc(t.year) : ''}${t._genres?.[0] ? dot + esc(t._genres[0]) : ''}</div></div></div>`).join('')}`;
  return html + '</div>';
}
function suggestions() {
  if (q.length < 2 || !res) return '<div style="height:44px"></div>';
  const names = [...new Set([...res.movie, ...res.series].slice(0, 6).map((t) => t.name))].slice(0, 2);   // (two fit the row whole)
  if (!names.length) return '<div style="height:44px"></div>';
  return `<div class="sugg" data-row data-exit>${names.map((n) => `<span class="chip fx" tabindex="-1" data-sugg="${esc(n)}">${ic('search')}<span class="ellipsis" style="max-width:116px">${esc(n)}</span></span>`).join('')}</div>`;
}
let behind = false;
on('player-closed', () => { if (behind) { behind = false; draw(); } });
function draw() {
  if (watching()) { behind = true; return; }   // nothing to see under the TV player; drawn once it closes
  if (!el || el.hidden) return;
  const right = results();
  setHtml(el.querySelector('[data-left]'), `
    <div class="sfield"><span class="grow" style="white-space:nowrap;overflow:hidden;padding-left:8px">${q ? `<b>${esc((q.length > 22 ? '…' + q.slice(-21) : q).toUpperCase())}</b><i class="caret"></i>` : '<span class="ph">Search everything</span>'}</span></div>
    ${suggestions()}
    <div class="kb" data-grid data-cols="6" data-exit>${KEYS.map((k) => `<span class="key fx" tabindex="-1" data-key="${k}">${k}</span>`).join('')}</div>
    <div class="kbrow" data-row data-exit><span class="key wide fx" tabindex="-1" data-key=" ">Space</span><span class="key wide fx" tabindex="-1" data-key="del">Delete</span><span class="key wide fx" tabindex="-1" data-key="clr">Clear</span></div>`);
  setHtml(el.querySelector('[data-right]'), right);
}
function type(k) {
  if (k === 'del') q = q.slice(0, -1);
  else if (k === 'clr') q = '';
  else q = (q + k.toLowerCase()).slice(0, 40);
  keptAt = Date.now();
  draw();
}
function remember() {
  const t = q.trim(); if (t.length < 2) return;
  store.set(recentKey, [t, ...store.get(recentKey, []).filter((x) => x !== t)].slice(0, 6));
}
function openRes(v) {
  remember();
  const [kind, a, b] = v.split(':');
  if (kind === 'c') { const ch = catalog.live?.byId.get(a); if (ch) playLive(ch, ringFor(ch), ringName(ch)); return; }
  const t = catalog[a]?.titleById?.get(b) || catalog[a]?.titles?.find((x) => x.id === b);
  if (!t) return;
  // the top result's Play plays (your language and best quality, from where you stopped); everything else opens its page
  if (kind === 'p') playVod(defaultVersion(t));
  else push('detail', { title: t });
}

let bigT = 0;
export default {
  name: 'search',
  mount(root) {
    el = root;
    root.innerHTML = '<div class="abs" data-left style="left:48px;top:90px;width:352px"></div><div class="abs" data-right style="left:432px;top:90px;width:480px"></div>';
    root.addEventListener('click', (e) => {
      const k = e.target.closest('[data-key]'); if (k) return type(k.dataset.key);
      const s = e.target.closest('[data-sugg]'); if (s) { q = s.dataset.sugg.toLowerCase(); draw(); focus(el.querySelector('[data-right] .rrow')); return; }
      const r = e.target.closest('[data-recent]'); if (r) { q = r.dataset.recent; draw(); return; }
      const x = e.target.closest('[data-res]'); if (x) return openRes(x.dataset.res);
      const p = e.target.closest('.pc'); if (p) { const t = (catalog.movie?._sorted?.popular || [])[+String(p.dataset.i).replace('tr', '')]; if (t) push('detail', { title: t }); return; }
      if (e.target.closest('[data-act="clear"]')) { q = ''; draw(); focus(el.querySelector('[data-key="A"]')); }
    });
    on('catalog', () => { if (current() === 'search') draw(); });
  },
  enter(root) {
    if (Date.now() - keptAt > 10 * 60e3) q = '';   // the query is kept for 10 minutes
    // Channels at once; films and series (the big lists) once you stay (0.8 s) or press a key here, not when the
    // top bar passes over Search on its way to Home.
    ensure('live').catch(() => {});
    clearTimeout(bigT);
    const big = () => { clearTimeout(bigT); document.removeEventListener('keydown', inside, true); if (current() === 'search') ['movie', 'series'].forEach((k) => ensure(k).catch(() => {})); };
    const inside = () => { if (!document.getElementById('topbar').contains(document.activeElement)) big(); };
    bigT = setTimeout(big, 800);
    document.addEventListener('keydown', inside, true);
    draw();
  },
  entry: (root) => root.querySelector('[data-key="A"]'),
  key(k, e) {
    // A real keyboard (or the remote's number keys) types straight in.
    if (k === 'digit') { type(e.key); return true; }
    return false;
  },
  back(root) {
    // Back from the results goes to the keyboard first, then leaves.
    if (root.querySelector('[data-right]').contains(document.activeElement)) { focus(root.querySelector('[data-key="A"]')); return true; }
    return false;
  },
};
document.addEventListener('keydown', (e) => {
  if (current() !== 'search' || e.ctrlKey || e.metaKey) return;
  if (/^\p{L}$/u.test(e.key)) { type(e.key.toUpperCase()); e.preventDefault(); }   // (any letter: Þ, Ó, é too)
  else if (e.key === 'Backspace') { type('del'); e.preventDefault(); }
}, true);
