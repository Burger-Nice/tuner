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
import { push, go, current } from '../router.js';
import { focus } from '../focus.js';
import { openDetail, playMasked } from '../actions.js';
import { videoMask, programmeView } from '../catchup.js';
import { ringFor, ringName } from './home.js';
import * as AD from '../addons.js';
import { providerByImdb } from '../imdb.js';
import { SPIN } from './addons.js';

const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
let el, q = '', keptAt = 0, res = null;
// scope: 'all' | 'movie' | 'series' | 'live' (the chips over the results; Movies and Series open it scoped); from: the
// tab that opened it scoped (Back from the keyboard returns there)
let scope = 'all', from = null;
const SCOPES = [['all', 'All'], ['movie', 'Movies'], ['series', 'Series'], ['live', 'Channels']];
const PH = { all: 'Search everything', movie: 'Search movies', series: 'Search series', live: 'Search channels' };
// From add-ons (design/ui-v1/addons/SPEC.md 6): every enabled catalog with a search extra, after 3 letters and a 600 ms
// pause, one request each. { q, asks: [{ a, c, state: 'asking' | 'done' | 'failed', metas }], items }
let ads = null, adT = 0;
function askAddons() {
  clearTimeout(adT);
  const qq = q.trim();
  if (qq.length < 3 || !AD.searchCatalogs().length) { ads = null; return; }
  if (ads?.q === qq) return;
  adT = setTimeout(async () => {
    const st = { q: qq, asks: AD.searchCatalogs().map((x) => ({ ...x, state: 'asking', metas: [] })), items: [] };
    ads = st; draw();
    const provM = await providerByImdb('movie'), provS = await providerByImdb('series');
    await Promise.all(st.asks.map(async (x) => {
      try { x.metas = await AD.catalogPage(x.a, x.c, { search: qq }); x.state = 'done'; } catch { x.state = 'failed'; }
      if (ads !== st) return;
      // left out: titles not out yet, titles the provider has (they stay in the provider's block)
      const now = Date.now(), yr = new Date().getFullYear(), seen = new Set(st.items.map((i) => i.id));
      for (const m of x.metas) {
        if (seen.has(m.id) || (m.year && m.year > yr) || (m.released && Date.parse(m.released) > now)) continue;
        if ((m.type === 'series' ? provS : provM).has(m.id)) continue;
        if (videoMask({ kind: 'movie', id: m.id, name: m.name })) continue;   // (the shield: SPEC 10)
        seen.add(m.id); st.items.push({ ...m, from: AD.label(x.a) });
      }
      draw();
    }));
  }, 600);
}
const adTitle = (m) => ({ kind: m.type === 'series' ? 'series' : 'movie', key: m.id, id: m.id, name: m.name, poster: m.poster, year: m.year ? String(m.year) : '', versions: [], _qs: new Set(), _langs: new Set(), _genres: m.genres || [], _ir: parseFloat(m.imdbRating) || 0, addon: { type: m.type } });
function addonBlock() {
  if (!ads) return '';
  const asking = ads.asks.filter((x) => x.state === 'asking'), failed = ads.asks.filter((x) => x.state === 'failed');
  const who = [...new Set(ads.asks.map((x) => AD.label(x.a)))].join(', ');
  if (!asking.length && !ads.items.length && !failed.length) return '';   // no results: no heading
  const mini = (m) => `<div class="mini2" style="height:40px;width:28px"><div class="art">${m.poster ? `<img src="${esc(sized(m.poster, 92))}" alt="">` : ''}</div></div>`;
  const shown = ads.items.filter((m) => scope === 'all' || (scope === 'series') === (m.type === 'series')).slice(0, scope === 'all' ? 12 : 40);
  if (scope !== 'all' && !shown.length && !asking.length) return '';
  const cap = asking.length && !ads.items.length ? `${SPIN}${esc(who)}…` : failed.length && !ads.items.length ? `${esc([...new Set(failed.map((x) => AD.label(x.a)))].join(', '))} didn't answer` : `${esc(who)}${shown.length > 2 ? `${dot}${shown.length - 2} more below` : ''}`;
  return `<div class="ad-rh t-label">From add-ons<small style="display:inline-flex;align-items:center;gap:6px">${cap}</small></div>${shown.map((m) => `<div class="rrow fx" tabindex="-1" data-res="a:${esc(m.type === 'series' ? 'series' : 'movie')}:${esc(m.id)}">${mini(m)}<div class="grow" style="min-width:0"><div class="t-sub ellipsis">${esc(m.name)}</div><div class="t-cap ellipsis">${m.type === 'series' ? 'Series' : 'Movie'}${m.year ? dot + esc(m.releaseInfo && m.type === 'series' ? m.releaseInfo : m.year) : ''}${m.director?.[0] ? dot + esc(m.director[0]) : m.genres?.[0] ? dot + esc(m.genres[0]) : ''}</div></div></div>`).join('')}`;
}
const recentKey = 'searchRecent';

function results() {
  if (!q.trim()) {
    const recent = store.get(recentKey, []);
    const trend = (catalog.movie?._sorted?.popular || (catalog.movie?.titles ? browse('movie', { sort: 'popular', f: {}, langFirst: false }) : [])).slice(0, 4);
    return `${recent.length ? `<div class="t-label" style="margin-bottom:10px">Recent</div><div class="chips" data-row>${recent.map((r) => `<span class="chip lg fx" tabindex="-1" data-recent="${esc(r)}">${ic('clock')}${esc(r)}</span>`).join('')}</div>` : ''}
      ${trend.length ? `<div class="t-label" style="margin:24px 0 10px">Trending</div><div class="rail" style="padding:0;gap:16px;margin:0"><div class="track" data-row style="gap:16px">${trend.map((t, i) => poster(t, 'tr' + i, { sm: true })).join('')}</div></div>` : '<div class="t-body">Type a channel, programme, movie, series or team.</div>'}`;
  }
  res = searchAll(q, 100);
  // under the spoiler shield, a hidden game's videos read airglow's name (catch-up 5.8): no poster, no year or rating
  res.movie = res.movie.map((t) => { const mk = videoMask(t); return mk ? { ...t, name: mk.title, poster: '', year: mk.kind === 'game' ? mk.meta : 'Name hidden', _genres: [], _q: '', versions: [t.versions?.[0] || t] } : t; });
  const onTv = [];
  const words = window.Titles.norm(q).split(' ').filter(Boolean);
  const matches = (s) => { const n = ' ' + window.Titles.norm(s); return words.every((w) => n.includes(' ' + w)); };
  for (const ch of catalog.live?.items || []) {
    if (onTv.length >= (scope === 'live' ? 12 : 3)) break;
    const p = onNow(guideNow(ch));
    if (p && matches(p.title)) onTv.push({ ch, p });
  }
  const adb = addonBlock();
  // (the counts take in the add-ons' titles too: Series 1 when Dune Prophecy comes from Cinemeta)
  const adN = (k) => (ads?.items || []).filter((m) => (k === 'series') === (m.type === 'series')).length;
  const n = { movie: res.movie.length + adN('movie'), series: res.series.length + adN('series'), live: res.live.length + onTv.length };
  const many = (k) => (n[k] >= 100 ? '99+' : String(n[k]));
  // the chips: what the results show (◀ ▶ on them; Down goes into the list)
  const chips = `<div class="chips s-scope" data-row data-exit>${SCOPES.map(([k, l]) => `<span class="chip fx${k === scope ? ' sel' : ''}" tabindex="-1" data-scope="${k}">${l}${k === 'all' ? '' : `<small>${many(k)}</small>`}</span>`).join('')}</div>`;
  const mini = (t) => `<div class="mini2" style="height:40px;width:28px"><div class="art">${t.poster ? `<img src="${esc(sized(t.poster, 92))}" alt="">` : ''}</div></div>`;
  const titleRow = (t) => `<div class="rrow fx" tabindex="-1" data-res="t:${t.kind}:${t.id}">${mini(t)}<div class="grow" style="min-width:0"><div class="t-sub ellipsis">${esc(t.name)}</div><div class="t-cap">${t.kind === 'movie' ? 'Movie' : 'Series'}${t.year ? dot + esc(t.year) : ''}${t._genres?.[0] ? dot + esc(t._genres[0]) : ''}</div></div></div>`;
  const progRow = ({ ch, p }) => `<div class="rrow fx" tabindex="-1" data-res="c:${ch.id}">${logo(ch.logo, ch.name, 'sm')}<div class="grow" style="min-width:0"><div class="t-sub ellipsis">${esc(programmeView(ch, p).title)}</div><div class="t-cap ellipsis">${esc(ch.name)}${dot}${hm(p.start)} to ${hm(p.end)}</div></div></div>`;
  const chRow = (ch) => `<div class="rrow fx" tabindex="-1" data-res="c:${ch.id}">${logo(ch.logo, ch.name, 'sm')}<div class="grow" style="min-width:0"><div class="t-sub ellipsis">${esc(ch.name)}</div><div class="t-cap">Channel ${ch.num}</div></div></div>`;
  const moreRow = (k, label) => `<div class="rrow fx s-more" tabindex="-1" data-scope="${k}"><span class="grow t-sub">${label}</span>${ic('chevR')}</div>`;
  const head = (t, top = 14) => `<div class="t-label" style="margin:${top}px 0 8px">${t}</div>`;
  const none = (what) => `<div class="state" style="margin-top:34px"><div class="ico">${ic('search')}</div><b style="overflow-wrap:anywhere">No ${what} for “${esc(q.length > 24 ? q.slice(0, 23) + '…' : q)}”</b><p>Check the spelling, or try fewer letters.</p><div data-row style="display:flex;justify-content:center;gap:12px">${scope !== 'all' ? '<span class="btn2 sm fx" tabindex="-1" data-scope="all">Search everything</span>' : ''}<span class="btn2 sm fx" tabindex="-1" data-act="clear">Clear</span></div></div>`;
  let html = chips + '<div data-col class="s-list">';
  if (scope === 'movie' || scope === 'series') {
    const list = res[scope];
    if (!list.length && !adb) return `${chips}${none(scope === 'movie' ? 'movies' : 'series')}`;
    if (list.length) html += head(`${scope === 'movie' ? 'Movies' : 'Series'} · ${many(scope)}`, 4) + list.map(titleRow).join('');
    return html + adb + '</div>';
  }
  if (scope === 'live') {
    if (!onTv.length && !res.live.length) return `${chips}${none('channels or programmes')}`;
    if (onTv.length) html += head('On now', 4) + onTv.map(progRow).join('');
    const chans = res.live.filter((c) => !onTv.some((o) => o.ch === c)).slice(0, 60);
    if (chans.length) html += head('Channels', onTv.length ? 14 : 4) + chans.map(chRow).join('');
    return html + '</div>';
  }
  const top = res.movie[0] || res.series[0] || null;
  const chans = res.live.slice(0, 3);
  if (!top && !onTv.length && !chans.length && !adb) return `${chips}${none('results')}`;
  if (top) html += `${head('Top result', 4)}<div class="rrow fx" tabindex="-1" data-res="${top.kind === 'movie' ? 'p' : 't'}:${top.kind}:${top.id}" style="height:84px"><div class="mini2"><div class="art">${top.poster ? `<img src="${esc(sized(top.poster, 154))}" alt="">` : ''}</div></div><div class="grow" style="min-width:0"><div class="t-sub ellipsis" style="font-size:18px;line-height:24px">${esc(top.name)}</div><div class="t-cap">${top.kind === 'movie' ? 'Movie' : 'Series'}${top.year ? dot + esc(top.year) : ''}${top._q === '4K' ? `${dot}4K` : ''}${top.versions.length > 1 ? ` +${top.versions.length - 1} versions` : ''}</div></div><span class="btn sm">${ic('play')}${top.kind === 'movie' ? 'Play' : 'Open'}</span></div>`;
  if (onTv.length || chans.length) {
    html += head('On TV');
    html += onTv.slice(0, 2).map(progRow).join('');
    html += chans.filter((c) => !onTv.some((o) => o.ch === c)).slice(0, 2).map(chRow).join('');
  }
  const mv = res.movie.filter((t) => t !== top), sr = res.series.filter((t) => t !== top);
  if (mv.length) html += head('Movies') + mv.slice(0, 5).map(titleRow).join('') + (res.movie.length > 6 ? moreRow('movie', `All ${many('movie')} movies`) : '');
  if (sr.length) html += head('Series') + sr.slice(0, 3).map(titleRow).join('') + (res.series.length > 4 ? moreRow('series', `All ${many('series')} series`) : '');
  return html + adb + '</div>';
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
    <div class="sfield"><span class="grow" style="white-space:nowrap;overflow:hidden;padding-left:8px">${q ? `<b>${esc((q.length > 22 ? '…' + q.slice(-21) : q).toUpperCase())}</b><i class="caret"></i>` : `<span class="ph">${PH[scope]}</span>`}</span></div>
    ${suggestions()}
    <div class="kb" data-grid data-cols="6" data-exit>${KEYS.map((k) => `<span class="key fx" tabindex="-1" data-key="${k}">${k}</span>`).join('')}</div>
    <div class="kbrow" data-row data-exit><span class="key wide fx" tabindex="-1" data-key=" ">Space</span><span class="key wide fx" tabindex="-1" data-key="del">Delete</span><span class="key wide fx" tabindex="-1" data-key="clr">Clear</span></div>`);
  setHtml(el.querySelector('[data-right] .s-in'), right);
  // ▼ past the last result stays on it (it never jumps back to the keyboard)
  const col = el.querySelector('[data-right] .s-list');
  if (col && !col.navHook) col.navHook = (dir, cur) => (dir === 'down' && cur === [...col.querySelectorAll('.fx')].pop() ? false : undefined);
}
// the list scrolls inside its box (y 90 to 513): the focused row is kept whole inside it
function place(a = document.activeElement) {
  const box = el.querySelector('[data-right]'), inner = box.querySelector('.s-in');
  if (!box.contains(a) || a.closest('.s-scope')) { inner.style.transform = ''; return; }
  const cur = -(parseFloat((inner.style.transform.match(/-?[\d.]+/) || [0])[0]) || 0);
  const top = a.offsetTop, bottom = top + a.offsetHeight, H = box.clientHeight;
  let y = cur;
  if (bottom - y > H - 12) y = bottom - H + 12;
  else if (top - y < 52) y = Math.max(0, top - 52);   // (the chips stay in view above it while it can)
  inner.style.transform = y > 0 ? `translateY(${-y}px)` : '';
}
function type(k) {
  if (k === 'del') q = q.slice(0, -1);
  else if (k === 'clr') q = '';
  else q = (q + k.toLowerCase()).slice(0, 40);
  keptAt = Date.now();
  askAddons();
  draw();
}
function remember() {
  const t = q.trim(); if (t.length < 2) return;
  store.set(recentKey, [t, ...store.get(recentKey, []).filter((x) => x !== t)].slice(0, 6));
}
function openRes(v) {
  remember();
  const [kind, a, ...r] = v.split(':'), b = r.join(':');   // (an add-on's ids can hold a colon: kitsu:…, tmdb:…)
  if (kind === 'c') { const ch = catalog.live?.byId.get(a); if (ch) playLive(ch, ringFor(ch), ringName(ch)); return; }
  if (kind === 'a') { const m = ads?.items.find((x) => x.id === b); if (m) openDetail(adTitle(m)); return; }
  const t = catalog[a]?.titleById?.get(b) || catalog[a]?.titles?.find((x) => x.id === b);
  if (!t) return;
  // the top result's Play plays (your language and best quality, from where you stopped); everything else opens its page
  if (kind === 'p') { if (!playMasked(t)) playVod(defaultVersion(t)); }
  else openDetail(t);
}

// a chip (or "All 64 movies"): the list for it, focus on its chip
function setScope(k) {
  if (!SCOPES.some(([x]) => x === k)) return;
  scope = k;
  draw();
  el.querySelector('[data-right] .s-in').style.transform = '';
  focus(el.querySelector(`[data-right] [data-scope="${k}"].chip`));
}
let bigT = 0;
export default {
  name: 'search',
  mount(root) {
    el = root;
    root.innerHTML = '<div class="abs" data-left style="left:48px;top:90px;width:352px"></div><div class="abs s-box" data-right style="left:424px;top:82px;width:496px;height:431px"><div class="s-in"></div></div>';
    root.addEventListener('tvfocus', (e) => place(e.target));
    root.addEventListener('click', (e) => {
      const k = e.target.closest('[data-key]'); if (k) return type(k.dataset.key);
      const s = e.target.closest('[data-sugg]'); if (s) { q = s.dataset.sugg.toLowerCase(); draw(); focus(el.querySelector('[data-right] .rrow')); return; }
      const r = e.target.closest('[data-recent]'); if (r) { q = r.dataset.recent; draw(); return; }
      const sc = e.target.closest('[data-scope]');
      if (sc) { setScope(sc.dataset.scope); return; }
      const x = e.target.closest('[data-res]'); if (x) return openRes(x.dataset.res);
      const p = e.target.closest('.pc'); if (p) { const t = (catalog.movie?._sorted?.popular || [])[+String(p.dataset.i).replace('tr', '')]; if (t) openDetail(t); return; }
      if (e.target.closest('[data-act="clear"]')) { q = ''; draw(); focus(el.querySelector('[data-key="A"]')); }
    });
    on('catalog', () => { if (current() === 'search') draw(); });
  },
  enter(root, params = {}, { fresh = true } = {}) {
    if (Date.now() - keptAt > 10 * 60e3) q = '';   // the query is kept for 10 minutes
    // opened from Movies or Series: only those (the chips widen it); from anywhere else: everything
    if (params.scope) { scope = params.scope; from = params.from || null; } else if (fresh) { scope = 'all'; from = null; }   // (back from a result: as it was)
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
    if (from) { const f = from; from = null; scope = 'all'; go(f); return true; }   // (back to the tab that opened it)
    return false;
  },
};
document.addEventListener('keydown', (e) => {
  if (current() !== 'search' || e.ctrlKey || e.metaKey) return;
  if (/^\p{L}$/u.test(e.key)) { type(e.key.toUpperCase()); e.preventDefault(); }   // (any letter: Þ, Ó, é too)
  else if (e.key === 'Backspace') { type('del'); e.preventDefault(); }
}, true);
