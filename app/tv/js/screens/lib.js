// Movies and Series: the add-on library (design/ui-v1/home-final/SPEC.md 7). One long scroll per shelf: Popular and New
// (Cinemeta's catalogs, paged 50 at a time), Top rated, the genres, Anime and In Icelandic (TMDB's lists, paged 20; Cinemeta's
// genre catalogs re-filtered when there is no TMDB key), the other add-ons' catalogs, Saved and History. The grid is
// six posters a row (124 px, 20 px gutters from x 58, so every ring stays inside the safe area); scrolled, a solid band
// at the top holds where you are, the focused title and its facts, and the bubble while a key repeats.
// The provider's own films and series are never listed here (the owner's decision): a title the provider also has
// opens the provider's page, where its copy is ranked with the add-ons' (shelves.js titleOf).
import { esc, ic, dot, setHtml, initials } from '../util.js';
import { on, store, scoped, toggleFav, isFav, markWatched } from '../state.js';
import { barHidden, current, go } from '../router.js';
import { focus } from '../focus.js';
import { openOverlay, contextMenu, toast, scrollList, radioMenu } from '../ui.js';
import { anyStreamAddon } from '../imdb.js';
import * as SH from '../shelves.js';
import * as TM from '../tmdb.js';
import * as R from '../rows.js';
import { videoMask } from '../catchup.js';

const COLS = 6, PITCH = 210, COLW = 144, TOP0 = 184, TOPF = 156, BEFORE = 3, AFTER = 4;
const ORDERS = [['popular', 'Popular'], ['new', 'New'], ['top', 'Top rated'], ['az', 'Title A–Z']];
const DECADES = [['2020s', 2020, 2099], ['2010s', 2010, 2019], ['2000s', 2000, 2009], ['1990s', 1990, 1999], ['Older', 0, 1989]];
const RUNTIMES = { movie: [['short', 'Under 1h 30m', 0, 89], ['mid', '1h 30m to 2h', 90, 120], ['long', 'Over 2 hours', 121, 999]], series: [['short', 'Under 30 min', 0, 29], ['mid', '30 to 50 min', 30, 50], ['long', 'Over 50 min', 51, 999]] };
const LANGS = [['en', 'English', 'United States|United Kingdom|Canada|Australia|Ireland|New Zealand'], ['is', 'Icelandic', 'Iceland'], ['ja', 'Japanese', 'Japan'], ['ko', 'Korean', 'Korea'], ['fr', 'French', 'France'], ['es', 'Spanish', 'Spain|Mexico|Argentina']];
const DEFAULT_G = { movie: ['Comedy', 'Action', 'Drama', 'Sci-Fi'], series: ['Comedy', 'Drama', 'Crime', 'Sci-Fi'] };

export default function lib(kind) {
  const label = kind === 'movie' ? 'Movies' : 'Series';
  let el, grid, view = null, pager = null, list = [], row = 0, inGrid = false, bubbleT = 0, repeatSince = 0, gen = 0, myG = DEFAULT_G[kind], want = 0;
  const vkey = () => scoped(`${kind}Shelf`);
  const loadView = () => { const v = store.get(vkey(), {}); view = { shelf: v.shelf || 'popular', order: v.order || 'popular', f: v.f && typeof v.f === 'object' ? v.f : {} }; };
  const saveView = () => store.set(vkey(), view);
  // ---------- the shelf in use ----------
  const genreOf = (k) => (k.startsWith('g:') ? k.slice(2) : '');
  function shelfDef() {
    const k = view.shelf, g = genreOf(k);
    if (g) return { ...SH.genreShelf(kind, g), order: view.order };
    const s = SH.shelves(kind).find((x) => x.key === k);
    if (s?.src === 'anime') return { ...s, order: view.order };
    return s || SH.shelves(kind)[0];
  }
  const shelfName = () => { const k = view.shelf, g = genreOf(k); return g || SH.shelves(kind).find((x) => x.key === k)?.label || 'Popular'; };
  // (a fixed shelf names its order only when it's A–Z; Saved and History keep their own order)
  const fixedShelf = () => ['popular', 'new', 'top'].includes(view.shelf);
  const sortKey = () => (view.order === 'az' || !fixedShelf() ? view.order : view.shelf);
  const orderName = () => (['saved', 'history'].includes(view.shelf) || (fixedShelf() && view.order !== 'az') ? '' : ORDERS.find(([k]) => k === view.order)?.[1] || '');
  // the pager for this shelf and order (a genre's New is its own list: newest first; Title A–Z sorts what is loaded)
  function openShelf() {
    const d = shelfDef();
    const o = view.order;
    const def = d.src === 'genre' || d.src === 'anime' ? { ...d, ...(o === 'top' ? { tmOrder: 'top' } : o === 'new' ? { tmOrder: 'new' } : {}) } : d;
    pager = new SH.Pager(def);
    list = [];
    row = 0;
    const my = ++gen;
    loadMore(my);
  }
  // Filters over the shelf (SPEC 7): applied to what has loaded, and it keeps loading until 50 match or 10 more pages
  const fCount = () => Object.values(view.f).filter((v) => v != null && v !== '').length;
  function passes(it) {
    const f = view.f;
    if (f.genre && !(it.genres || []).map(SH.canon).includes(f.genre)) return false;
    if (f.decade) { const d = DECADES.find(([l]) => l === f.decade); if (d && !(it.year >= d[1] && it.year <= d[2])) return false; }
    if (f.imdb && !(it.rating >= +f.imdb)) return false;
    if (f.runtime) { const r = RUNTIMES[kind].find(([k]) => k === f.runtime); const m = it.runtime || it._d?.runtime || 0; if (r && !(m >= r[2] && m <= r[3])) return false; }
    if (f.lang) { const l = LANGS.find(([k]) => k === f.lang); if (l && !(it.lang === l[0] || (!it.lang && new RegExp(`^(${l[2]})`).test(SH.firstCountry(it.country))))) return false; }
    if (videoMask({ kind: 'movie', id: it.id, name: it.name })) return false;   // (a hidden game's video: left out, SPEC 10 of the add-ons)
    return true;
  }
  function relist() {
    let l = pager.items.filter(passes);
    if (view.order === 'az') l = [...l].sort((a, b) => a.name.localeCompare(b.name));
    else if (view.order === 'new' && !pager.tm && (genreOf(view.shelf) || view.shelf === 'anime')) l = [...l].sort((a, b) => (b.year || 0) - (a.year || 0));
    list = l;
  }
  async function loadMore(my = gen, rounds = 0) {
    if (!pager || pager.end || pager.busy) return;
    const before = list.length;
    draw();
    try { await pager.more(); } catch { if (my !== gen) return; draw(); return; }
    if (my !== gen) return;
    relist();
    // filtered: keep reading until there are 50 matches (or 10 pages); unfiltered: until the focus has room below
    const need = fCount() ? 50 : (row + AFTER + 2) * COLS;
    if (!pager.end && list.length < need && rounds < (fCount() ? 10 : 3) && list.length - before < need) return loadMore(my, rounds + 1);
    draw();
  }
  // ---------- the header and the chips ----------
  function chipDefs() {
    const key = TM.hasKey();
    const base = [['popular', 'Popular'], ['new', 'New'], ...(key ? [['top', 'Top rated']] : [])];
    const g = myG.slice(0, 4).map((x) => [`g:${x}`, x]);
    const more = SH.shelves(kind).filter((s) => !['popular', 'new', 'top'].includes(s.key)).map((s) => [s.key, s.label, s.by]);
    return [...base, ...g, ['more', 'More genres'], ...more];
  }
  const countLine = () => {
    if (!pager) return '';
    if (fCount()) return `${list.length.toLocaleString()} so far${pager.end ? '' : ' · still looking'}`;
    if (view.order === 'az') return `${list.length.toLocaleString()} loaded, A–Z`;
    return `${pager.totalLabel()} titles`;
  };
  function header() {
    const ctx = [shelfName(), orderName()].filter(Boolean).join(' · ');
    const chips = chipDefs().map(([k, l, by]) => `<span class="chip lg fx${k === view.shelf || (k === 'more' && genreOf(view.shelf) && !myG.includes(genreOf(view.shelf))) ? ' sel' : ''}" tabindex="-1" data-chip="${esc(k)}">${esc(k === 'more' && genreOf(view.shelf) && !myG.includes(genreOf(view.shelf)) ? genreOf(view.shelf) : l)}${by ? `<span class="ad-by">${esc(by)}</span>` : ''}</span>`).join('');
    return `<div class="lib-head" data-row><span class="t-head">${label}</span><span class="t-cap" style="margin-top:6px">${esc(ctx)}${dot}${esc(countLine())}</span><span class="grow"></span>
      <span class="pillbtn fx" tabindex="-1" data-act="search">${ic('search')}Search</span>
      <span class="pillbtn fx" tabindex="-1" data-act="sort">${ic('sort')}Sort<b>${esc(ORDERS.find(([k]) => k === sortKey())?.[1] || 'Popular')}</b></span>
      <span class="pillbtn fx" tabindex="-1" data-act="filters">${ic('sliders')}Filters${fCount() ? `<span class="cnt">${fCount()}</span>` : ''}</span>
      <span class="pillbtn fx" tabindex="-1" data-act="jump">${ic('chevD')}Jump</span></div>
      <div class="lib-chips" data-row>${chips}</div>`;
  }
  // ---------- the grid ----------
  function cell(it, i) {
    const art = it.poster ? `<img src="${esc(SH.posterSmall(it.poster))}" alt="" decoding="async" data-ini="${esc(initials(it.name))}">` : '';
    return `<div class="lb-p fx${it.poster ? '' : ' txt'}" tabindex="-1" data-i="${i}" data-key="t:${esc(it.kind)}:${esc(it.imdb || it.id)}" data-hold style="left:${(i % COLS) * COLW}px;top:${Math.floor(i / COLS) * PITCH}px">${art}${it.poster ? '' : `<small>No poster</small><b>${esc(it.name)}</b>`}</div>`;
  }
  // A state card (no add-on, empty, failed, loading): left alone when it hasn't changed (the 'nba' poll redraws often), and
  // focus stays on its button when it has.
  function setState(html) {
    if (grid._state === html && !grid.querySelector('.lb-p')) return;
    const a = document.activeElement, act = grid.contains(a) ? a.dataset.act : null;
    grid.innerHTML = html; grid._state = html;
    const b = act && grid.querySelector(`[data-act="${act}"]`);
    if (b) focus(b);
  }
  function drawGrid(focusIdx) {
    if (!anyStreamAddon()) {
      setState(`<div class="state big" style="position:relative;margin:24px auto 0;left:0;width:620px"><div class="ico">${ic('film')}</div><b>Films and series come from your add-ons</b><p>Add a Stremio add-on for films and series. Your provider stays your live TV.</p><span class="row-flex" data-row style="gap:12px;justify-content:center"><span class="btn fx" tabindex="-1" data-act="addons">Add an add-on</span></span></div>`);
      grid.style.transform = `translateY(${TOP0}px)`;
      return;
    }
    if (!list.length) {
      const loading = pager && !pager.end && !pager.failed;
      setState(loading ? Array.from({ length: 12 }, (_, i) => `<span class="skb" style="position:absolute;left:${(i % COLS) * COLW}px;top:${Math.floor(i / COLS) * PITCH}px;width:124px;height:186px;border-radius:12px"></span>`).join('')
        : pager?.failed ? `<div class="state big" style="position:relative;margin:24px auto 0;left:0"><div class="ico">${ic('wifiOff')}</div><b>This shelf isn't answering</b><p>Try again in a minute, or pick another shelf.</p><span class="row-flex" data-row style="gap:12px;justify-content:center"><span class="btn fx" tabindex="-1" data-act="retry">Try again</span></span></div>`
        : `<div class="state big" style="position:relative;margin:24px auto 0;left:0"><div class="ico">${ic('sliders')}</div><b>${fCount() ? 'Nothing matches these filters' : 'Nothing here yet'}</b><p>${fCount() ? 'Remove the last one, or clear them all.' : view.shelf === 'saved' ? 'Titles you save show up here.' : view.shelf === 'history' ? 'Titles you watch show up here.' : 'This shelf came back empty. Pick another one, or look again later.'}</p>${fCount() ? '<span class="row-flex" data-row style="gap:12px;justify-content:center"><span class="btn fx" tabindex="-1" data-act="clear">Clear filters</span></span>' : ''}</div>`);
      grid.style.transform = `translateY(${TOP0}px)`;
      return;
    }
    grid._state = null;
    // the list re-sorted under the focus (A–Z merging a new page, the shield's masks): focus follows the title it was on
    const cur = document.activeElement;
    if (focusIdx == null && cur?.parentElement === grid && cur.dataset.i && cur._t && list[+cur.dataset.i] !== cur._t) {
      const j = list.indexOf(cur._t);
      focusIdx = j >= 0 ? j : Math.min(+cur.dataset.i, list.length - 1);
      row = Math.floor(focusIdx / COLS);
    }
    // at most 8 rows (48 titles) mounted around the focus; the rest are drawn again from the list on the way back
    const a = Math.max(0, row - BEFORE), b = Math.min(Math.ceil(list.length / COLS), row + AFTER + 1);
    const want = new Set();
    for (let r = a; r < b; r++) for (let c = 0; c < COLS; c++) { const i = r * COLS + c; if (i < list.length) want.add(i); }
    for (const node of [...grid.children]) { const i = +node.dataset.i; if (!node.dataset.i || !want.has(i) || node._t !== list[i]) { if (node === document.activeElement && focusIdx == null) continue; node.remove(); } }
    const have = new Set([...grid.children].map((n) => +n.dataset.i));
    let html = '';
    for (const i of want) if (!have.has(i)) html += cell(list[i], i);
    if (html) grid.insertAdjacentHTML('beforeend', html);
    for (const node of grid.children) if (node.dataset.i) node._t = list[+node.dataset.i];
    const rows = Math.ceil(list.length / COLS);
    grid.querySelectorAll('.lb-more').forEach((x) => x.remove());
    if (!pager.end && b >= rows) grid.insertAdjacentHTML('beforeend', pager.failed ? `<div class="lb-more card" style="top:${rows * PITCH}px">${ic('bang')}<span class="grow">The next page didn't come · ▼ tries again</span></div>` : Array.from({ length: COLS }, (_, c) => `<span class="lb-more ad-skel" style="left:${c * COLW}px;top:${rows * PITCH}px"></span>`).join(''));
    grid.style.transform = `translateY(${(inGrid ? TOPF : TOP0) - row * PITCH}px)`;
    if (focusIdx != null) focus(grid.querySelector(`[data-i="${focusIdx}"]`));
  }
  function band() {
    const b = el.querySelector('.lb-band');
    b.hidden = !inGrid;
    el.querySelector('[data-head]').style.visibility = inGrid ? 'hidden' : '';
    barHidden(inGrid && current() === kind);
    if (!inGrid) return;
    const a = document.activeElement, it = a?.closest?.('.lb-p') ? list[+a.dataset.i] : null;
    const ctx = [label, shelfName(), orderName() || (fixedShelf() || ['saved', 'history'].includes(view.shelf) ? '' : 'Popular'), fCount() ? `${fCount()} filter${fCount() > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
    const d = it?._d || {};
    const rt = d.runtime || it?.runtime;
    const facts = it ? [it.year ? (kind === 'series' ? `${it.year}–` : String(it.year)) : '', rt ? (kind === 'series' ? `${rt} min` : rt >= 60 ? `${Math.floor(rt / 60)}h ${String(rt % 60).padStart(2, '0')}m` : `${rt} min`) : '', (it.genres || []).slice(0, 2).join(' · '), it.rating && it.src !== 'tmdb' ? `IMDb ${it.rating.toFixed(1)}` : ''].filter(Boolean).join('  ·  ') : '';
    setHtml(b.querySelector('.lb-txt'), `<span class="cx">${esc(ctx)}</span><b class="ft">${esc(it?.name || '')}</b><span class="fm">${esc(facts)}</span>`, false);
  }
  function draw(focusIdx) {
    if (!el || current() !== kind) return;
    setHtml(el.querySelector('[data-head]'), header());
    drawGrid(focusIdx);
    band();
  }
  // ▼ near the end asks for the next page; ◀ ▶ stop at the edges; ▲ from the first row goes to the chips
  function gridHook(dir, cur, repeat) {
    const i = +cur.dataset.i, n = list.length;
    let t = null;
    if (dir === 'left') { if (i % COLS === 0) return false; t = i - 1; }
    else if (dir === 'right') { if (i % COLS === COLS - 1 || i + 1 >= n) return false; t = i + 1; }
    else if (dir === 'up') {
      if (i < COLS) { inGrid = false; row = 0; draw(); const chip = el.querySelector('.lib-chips .chip.sel') || el.querySelector('.lib-chips .chip'); return chip ? focus(chip) : undefined; }
      t = i - COLS;
    } else {
      if (i + COLS < n) t = i + COLS;
      else if (Math.floor(i / COLS) < Math.floor((n - 1) / COLS)) t = n - 1;
      else if (pager.failed) { pager.failed = false; loadMore(); return true; }
      else if (!pager.end) { loadMore(); return true; }   // (on its way: focus stays, even under key repeat)
      else return false;
    }
    move(t, repeat && (dir === 'up' || dir === 'down'));
    return true;
  }
  function move(t, rep) {
    inGrid = true;
    row = Math.floor(t / COLS);
    if (row >= Math.ceil(list.length / COLS) - 2) loadMore();
    drawGrid(t);
    band();
    bubble(rep, t);
  }
  // While ▲▼ repeat: "#313 of 3,000+"
  function bubble(rep, i) {
    const b = el.querySelector('.lb-bubble');
    if (!rep) { repeatSince = 0; b.hidden = true; return; }
    if (!repeatSince) repeatSince = Date.now();
    if (Date.now() - repeatSince < 700) return;
    b.innerHTML = `<b>#${(i + 1).toLocaleString()}</b><span>of ${esc(fCount() ? `${list.length} so far` : pager.totalLabel())}</span>`;
    b.hidden = false;
    clearTimeout(bubbleT);
    bubbleT = setTimeout(() => (b.hidden = true), 700);
  }
  // ---------- sheets ----------
  function setShelf(shelf, order) {
    view = { ...view, shelf, order: order || (['popular', 'new', 'top'].includes(shelf) ? shelf : view.order === 'az' ? 'popular' : view.order) };
    saveView(); openShelf(); draw();
  }
  function genreSheet() {
    const all = SH.GENRES[kind];
    radioMenu({ title: 'Genres', value: genreOf(view.shelf), rows: all.map((g) => ({ v: g, l: g })), onPick: (g) => { setShelf(`g:${g}`); focus(el.querySelector('.lib-chips .chip.sel')); } });
  }
  function sortMenu() {
    const fixed = ['popular', 'new', 'top'].includes(view.shelf);
    const rows = ORDERS.filter(([k]) => k !== 'top' || TM.hasKey()).map(([v, l]) => ({ v, l, sub: v === 'az' ? 'What has loaded so far' : '' }));
    radioMenu({ title: 'Sort by', value: sortKey(), rows, onPick: (v) => {
      if (fixed && v !== 'az') setShelf(v, v);
      else { view = { ...view, order: v }; saveView(); if (v === 'az') { relist(); row = 0; draw(); } else { openShelf(); draw(); } }
      focus(el.querySelector('[data-act="sort"]'));
    } });
  }
  function filterSheet() {
    let draft = { ...view.f };
    const gs = SH.GENRES[kind];
    const secs = [['Genre', 'genre', gs.map((g) => [g, g])], ['Decade', 'decade', DECADES.map(([l]) => [l, l])], ['IMDb', 'imdb', [['6', '6+'], ['7', '7+'], ['8', '8+']]], ['Runtime', 'runtime', RUNTIMES[kind].map(([k, l]) => [k, l])], ['Language', 'lang', LANGS.map(([k, l]) => [k, l])]];
    const n = () => pager.items.filter((it) => { const keep = view.f; view.f = draft; const ok = passes(it); view.f = keep; return ok; }).length;
    const body = () => secs.map(([t, key, opts]) => `<div class="sec">${t}</div><div class="chips" data-row><span class="chip fx${!draft[key] ? ' sel' : ''}" tabindex="-1" data-act="f" data-k="${key}" data-v="">Any</span>${opts.map(([v, l]) => `<span class="chip fx${draft[key] === v ? ' sel' : ''}" tabindex="-1" data-act="f" data-k="${key}" data-v="${esc(v)}">${esc(l)}</span>`).join('')}</div>`).join('');
    const foot = () => `Show ${n().toLocaleString()} so far`;
    const ov = openOverlay(`<div class="sheet" style="gap:8px"><div class="row-flex" data-row style="gap:12px"><h3 class="grow">Filters</h3><span class="t-cap">Over the titles loaded; more load as you scroll</span><span class="pillbtn fx" tabindex="-1" data-act="clear" style="height:32px;padding:0 14px;font-size:14px">Clear all</span></div>
      <div class="sheet-body"><div class="inner">${body()}</div></div><div class="sheet-foot" data-row><span class="btn btn-full fx" tabindex="-1" data-act="show">${foot()}</span></div></div>`, {
      focusSel: '.chip.sel',
      onClick: (act, t) => {
        if (act === 'f') { const k = t.dataset.k, v = t.dataset.v; draft = { ...draft, [k]: v }; if (!v) delete draft[k]; ov.el.querySelectorAll(`[data-k="${k}"]`).forEach((c) => c.classList.toggle('sel', c === t)); ov.el.querySelector('[data-act="show"]').textContent = foot(); }
        else if (act === 'clear') { draft = {}; ov.el.querySelector('.inner').innerHTML = body(); ov.el.querySelector('[data-act="show"]').textContent = foot(); focus(ov.el.querySelector('.chip')); }
        else if (act === 'show') ov.close();
      },
      onClose: () => { if (JSON.stringify(draft) !== JSON.stringify(view.f)) { view = { ...view, f: draft }; saveView(); relist(); row = 0; inGrid = false; loadMore(); draw(); } },
    });
    scrollList(ov.el);
  }
  function jumpMenu() {
    const marks = [0, 100, 250, 500, 1000, 2000].filter((x) => x < list.length);
    radioMenu({ title: 'Jump to', value: null, rows: marks.map((x) => ({ v: String(x), l: x ? `#${x.toLocaleString()}` : 'Top of the list' })), extra: '<div class="t-cap" style="padding:8px 8px 2px">Further down loads as you scroll</div>', onPick: (v) => { const i = +v; move(Math.max(0, i - 1), false); } });   // (#100 is the 100th, as the bubble counts)
  }
  // the genres he watches most come first in the chips (the taste profile, else a sensible default)
  async function learnGenres() {
    try {
      const p = await R.profile();
      const top = Object.entries(p.share).filter(([g]) => SH.GENRES[kind].includes(g)).sort((a, b) => b[1] - a[1]).map(([g]) => g);
      const next = [...new Set([...top, ...DEFAULT_G[kind]])].slice(0, 4);
      if (next.join() !== myG.join()) { myG = next; if (current() === kind) setHtml(el.querySelector('[data-head]'), header()); }
    } catch {}
  }

  return {
    name: kind,
    mount(root) {
      el = root;
      root.innerHTML = `<div data-head></div><div class="lb-band" hidden><div class="lb-txt"></div><div class="lb-bubble" hidden></div></div><div class="lb-grid" data-grid data-cols="6"></div>`;
      grid = root.querySelector('.lb-grid');
      grid.navHook = gridHook;
      root.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-chip]');
        if (chip) { const k = chip.dataset.chip; if (k === 'more') return genreSheet(); setShelf(k); focus(el.querySelector(`[data-chip="${CSS.escape(k)}"]`)); return; }
        const b = e.target.closest('[data-act]');
        const act = b?.dataset.act;
        if (act === 'sort') return sortMenu();
        if (act === 'filters') return filterSheet();
        if (act === 'jump') return jumpMenu();
        if (act === 'search') return go('search', { scope: kind, from: kind });
        if (act === 'addons') return go('account', { group: 'addons' });
        if (act === 'retry') { openShelf(); return; }
        if (act === 'clear') { view = { ...view, f: {} }; saveView(); relist(); draw(); return; }
        const card = e.target.closest('.lb-p');
        if (card) SH.openItem(card._t || list[+card.dataset.i]);   // (the title drawn on it)
      });
      root.addEventListener('tvhold', (e) => {
        const card = e.target.closest('.lb-p'); if (!card) return;
        const it = card._t || list[+card.dataset.i]; if (!it) return;
        const fav = { kind, id: it.imdb || it.id, key: it.imdb || it.id, name: it.name, poster: it.poster, year: it.year ? String(it.year) : '', addon: { type: kind }, _genres: it.genres };
        contextMenu(card, [
          { icon: 'saved', label: isFav(fav) ? 'Remove from Saved' : 'Save to Saved', run: async () => { const id = await SH.imdbOfItem(it); if (!id) return toast('airglow couldn\'t find this title\'s details'); fav.id = fav.key = id; toast(toggleFav(fav) ? `Saved ${it.name}` : `Removed ${it.name}`); } },
          { icon: 'check', label: 'Mark watched', run: async () => { const id = await SH.imdbOfItem(it); if (id) { markWatched({ kind: kind === 'series' ? 'series' : 'movie', id, name: it.name, _title: it.name, year: it.year }); toast(`${it.name} is marked watched`); } } },
          { icon: 'info', label: 'Details', run: () => SH.openItem(it) },
        ]);
      });
      root.addEventListener('tvfocus', (e) => {
        if (!e.target.closest('.lb-grid') && inGrid) { inGrid = false; row = 0; draw(); }
        // into the grid from the chips: the grid moves up under the band (the posters carry no caption: the band is it)
        if (e.target.closest('.lb-p')) { if (!inGrid) { inGrid = true; row = Math.floor(+e.target.dataset.i / COLS); drawGrid(); } band(); }
        // A long chip row scrolls sideways so the focused chip is always on screen.
        const strip = e.target.closest('.lib-chips');
        if (strip) {
          const c = e.target, l = c.offsetLeft, r = l + c.offsetWidth;
          if (l < strip.scrollLeft + 8) strip.scrollLeft = Math.max(0, l - 8);
          else if (r > strip.scrollLeft + strip.clientWidth - 8) strip.scrollLeft = r - strip.clientWidth + 8;
          strip.classList.toggle('scrolled', strip.scrollLeft > 0);
        }
      });
      on('session', () => { view = null; pager = null; list = []; });
      on('addons', () => { if (current() === kind) draw(); });
      on('tmdb', () => { if (view) { pager = null; if (current() === kind) { openShelf(); draw(); } } });
      on('nba', () => { if (current() === kind && pager) { relist(); drawGrid(); } });   // (the shield's masks follow what you've seen)
    },
    enter(root, params, { fresh }) {
      if (!view) loadView();
      if (params?.shelf) { view = { ...view, shelf: params.shelf, order: ['popular', 'new', 'top'].includes(params.shelf) ? params.shelf : 'popular', f: {} }; saveView(); pager = null; inGrid = false; }
      if (genreOf(view.shelf) && !SH.GENRES[kind].includes(genreOf(view.shelf))) view.shelf = 'popular';
      if (!SH.shelves(kind).some((s) => s.key === view.shelf) && !genreOf(view.shelf)) view.shelf = 'popular';
      if (!pager) openShelf();
      if (fresh) { inGrid = false; row = 0; }
      draw();
      learnGenres();
      // the provider's films and series, for its copies of what the add-ons list (once, quietly, after a rest here)
      clearTimeout(want); want = setTimeout(() => { if (current() === kind) SH.warmProvider(kind); }, 800);
    },
    leave() { barHidden(false); clearTimeout(want); },
    key(k) {
      if (!el || current() !== kind || !inGrid) return false;
      if (k === 'chup' || k === 'chdown') { const a = document.activeElement; const i = +a?.dataset?.i || 0; const t = k === 'chdown' ? Math.min(list.length - 1, i + 3 * COLS) : Math.max(0, i - 3 * COLS); move(t, false); return true; }
      return false;
    },
    entry: (root) => root.querySelector(`.lb-p[data-i="${row * COLS}"]`) || root.querySelector('.lb-p') || root.querySelector('.lib-chips .chip.sel'),
    toTop() { if (el.contains(document.activeElement)) document.activeElement.blur(); inGrid = false; row = 0; draw(); },
  };
}
