// Movies and Series: one grid (6 posters a row), Popular first, view chips over the same Sort/Filter state, one Filters
// sheet with live counts, and Jump. Only the rows around the focus are mounted, so 50,000 titles scroll like 50.
import { $, esc, ic, dot, setHtml, compact } from '../util.js';
import { S, on, store, scoped, toggleFav, isFav, markWatched } from '../state.js';
import { catalog, ensure, takeFresh, browse, SORTS, DECADES, IMDB_MIN, optionCounts, filterCount, jumpTargets, prefLangs } from '../catalog.js';
import { poster } from '../cards.js';
import { push, barHidden, current, mayFocus } from '../router.js';
import { focus } from '../focus.js';
import { openOverlay, contextMenu, toast, scrollList } from '../ui.js';

const COLS = 6, PITCH = 252, COLW = 148, MOUNT_BEFORE = 2, MOUNT_AFTER = 3;
const CHIP_GENRES = 4;

export default function lib(kind) {
  const label = kind === 'movie' ? 'Movies' : 'Series';
  let el, list = [], view = null, row = 0, bubbleT = 0, repeatSince = 0;
  const vkey = () => scoped(kind + 'View');
  function loadView() {
    const v = store.get(vkey(), {});
    const ok = SORTS.some(([k]) => k === v.sort);
    // Every language is shown, yours first (the order is the "English first" toggle); "Your languages" is a filter.
    const f = v.f && typeof v.f === 'object' && !['first', 'any'].includes(v.f.lang) ? v.f : {};
    view = { sort: ok ? v.sort : 'popular', f, chip: v.chip || 'All', langFirst: v.langFirst !== false };
  }
  const saveView = () => store.set(vkey(), view);

  // View chips write into the same Sort / Filter state, so nothing is filtered in two places.
  function chipDefs() {
    const g = catalog[kind]?.facets?.genres?.slice(0, CHIP_GENRES) || [];
    const keep = view.f.lang ? { lang: view.f.lang } : {};
    return [['All', { sort: 'popular', f: { ...keep } }], [kind === 'movie' ? `New in ${prefLangs()[0]}` : 'New episodes', { sort: kind === 'movie' ? 'year' : 'added', f: { lang: 'mine' } }],
      ['Top rated', { sort: 'rating', f: { ...keep } }], ['4K', { sort: view.sort, f: { ...keep, q: '4K' } }],
      ...g.map((x) => [x, { sort: view.sort, f: { ...keep, genre: x } }])];
  }
  function header() {
    const n = catalog[kind]?.titles?.length || 0;
    const sortL = SORTS.find(([k]) => k === view.sort)?.[1] || 'Popular';
    const fc = filterCount(view.f);
    const langNote = view.langFirst && view.sort !== 'az' ? `${dot}${prefLangs()[0]} first` : '';
    return `<div class="lib-head" data-row><span class="t-head">${label}</span><span class="t-cap" style="margin-top:6px">${list.length === n ? `${n.toLocaleString()} titles` : `${list.length.toLocaleString()} of ${n.toLocaleString()}`}${langNote}</span><span class="grow"></span>
      <span class="pillbtn fx" tabindex="-1" data-act="sort">${ic('sort')}Sort<b>${esc(sortL)}</b></span>
      <span class="pillbtn fx" tabindex="-1" data-act="filters">${ic('sliders')}Filters${fc > 0 ? `<span class="cnt">${fc}</span>` : ''}</span>
      <span class="pillbtn fx" tabindex="-1" data-act="jump">${ic('chevD')}Jump</span></div>
      <div class="lib-chips" data-row>${chipDefs().map(([c]) => `<span class="chip lg fx${c === view.chip ? ' sel' : ''}" tabindex="-1" data-chip="${esc(c)}">${esc(c)}</span>`).join('')}</div>`;
  }
  function refreshList(keepFocus) {
    list = browse(kind, view);
    setHtml(el.querySelector('[data-head]'), header());
    if (!keepFocus) row = 0;
    drawGrid();
  }
  // Mount the rows around `row` (the focused one), positioned absolutely; the grid slides by whole rows.
  function drawGrid(focusIdx) {
    const grid = el.querySelector('.lib-grid');
    if (!list.length) {
      const n = catalog[kind]?.titles?.length || 0;
      grid.innerHTML = n ? `<div class="state big" style="margin:24px auto 0;position:relative;left:0"><div class="ico">${ic('sliders')}</div><b>Nothing matches these filters</b><p>Remove the last one, or clear them all to see every title again.</p><span class="row-flex" data-row style="gap:12px;justify-content:center"><span class="btn fx" tabindex="-1" data-act="clear">Clear all</span></span></div>` : '';
      return;
    }
    const scrolled = row >= 1;
    const topRow = scrolled ? row - 1 : 0;
    const a = Math.max(0, row - MOUNT_BEFORE), b = Math.min(Math.ceil(list.length / COLS), row + MOUNT_AFTER + 1);
    const want = new Set();
    for (let r = a; r < b; r++) for (let c = 0; c < COLS; c++) { const i = r * COLS + c; if (i < list.length) want.add(i); }
    const have = new Map([...grid.children].filter((x) => x.dataset.i).map((x) => [+x.dataset.i, x]));
    for (const [i, node] of have) if (!want.has(i) || node._t !== list[i]) { if (node === document.activeElement) continue; node.remove(); have.delete(i); }
    let html = '';
    for (const i of want) if (!have.has(i)) html += poster(list[i], i).replace('class="pc fx', `data-c="${i % COLS}" style="position:absolute;left:${(i % COLS) * COLW}px;top:${Math.floor(i / COLS) * PITCH}px" class="pc fx`);
    if (html) grid.insertAdjacentHTML('beforeend', html);
    for (const node of grid.children) if (node.dataset.i) node._t = list[+node.dataset.i];
    grid.style.transform = `translateY(${(scrolled ? 84 : 176) - topRow * PITCH}px)`;
    el.querySelector('[data-head]').style.opacity = scrolled ? 0 : 1;
    el.querySelector('[data-head]').style.visibility = scrolled ? 'hidden' : '';
    barHidden(scrolled && current() === kind);
    const ctx = el.querySelector('.ctxline');
    ctx.hidden = !scrolled;
    el.querySelector('.lib-cover').hidden = !scrolled;
    const fc = filterCount(view.f);
    ctx.innerHTML = `${label}${dot}${esc(SORTS.find(([k]) => k === view.sort)?.[1])}${fc > 0 ? `${dot}${fc} filter${fc > 1 ? 's' : ''}` : ''}`;
    if (focusIdx != null) focus(grid.querySelector(`[data-i="${focusIdx}"]`));
  }
  function gridHook(dir, cur, repeat) {
    const i = +cur.dataset.i, n = list.length;
    let t = null;
    if (dir === 'left') { if (i % COLS === 0) return false; t = i - 1; }
    else if (dir === 'right') { if (i % COLS === COLS - 1 || i + 1 >= n) return false; t = i + 1; }
    else if (dir === 'up') { if (i < COLS) { row = 0; drawGrid(); return undefined; } t = i - COLS; }
    else { if (i + COLS < n) t = i + COLS; else if (Math.floor(i / COLS) < Math.floor((n - 1) / COLS)) t = n - 1; else return false; }
    row = Math.floor(t / COLS);
    drawGrid(t);
    bubble(repeat && (dir === 'up' || dir === 'down'), t);
    return true;
  }
  // While Down is held for more than 1.5 s: where you are in the sort ("#720 of 4,812 · Popular").
  function bubble(rep, i) {
    const b = el.querySelector('.bubble');
    if (!rep) { repeatSince = 0; return; }
    if (!repeatSince) repeatSince = Date.now();
    if (Date.now() - repeatSince < 1500) return;
    const t = list[i];
    const key = view.sort === 'rating' ? (t._ir ? t._ir.toFixed(1) : '–') : view.sort === 'year' ? t.year || '–' : view.sort === 'az' ? (t.name[0] || '#').toUpperCase() : `#${(i + 1).toLocaleString()}`;
    const sortL = SORTS.find(([k]) => k === view.sort)?.[1];
    b.innerHTML = `<b>${esc(key)}</b><span>${view.sort === 'popular' || view.sort === 'added' ? `of ${list.length.toLocaleString()}` : `#${(i + 1).toLocaleString()} of ${list.length.toLocaleString()}`}${dot}${esc(sortL)}</span>`;
    b.hidden = false;
    clearTimeout(bubbleT);
    bubbleT = setTimeout(() => (b.hidden = true), 600);
  }

  function setView(patch, chip) {
    view = { ...view, ...patch, f: { ...(patch.f || view.f) } };
    if (chip) view.chip = chip;
    else if (patch.f || patch.sort) view.chip = matchingChip();
    saveView();
    refreshList();
  }
  const matchingChip = () => { const same = (a, b) => JSON.stringify(a) === JSON.stringify(b); return chipDefs().find(([, v]) => v.sort === view.sort && same(v.f, view.f))?.[0] || ''; };

  function sortMenu(opener) {
    const rows = SORTS.map(([v, l, sub]) => `<div class="lr fx" tabindex="-1" data-act="s:${v}"><span class="rd${v === view.sort ? ' on' : ''}"></span>${esc(l)}<small>${esc(sub)}</small></div>`).join('');
    const first = view.langFirst;
    const ov = openOverlay(`<div class="menu" style="right:48px;top:120px;width:352px"><h3>Sort by</h3><div data-col>${rows}<div class="sep"></div>
      <div class="lr fx" tabindex="-1" data-act="lf" style="height:60px"><span class="grow">${esc(prefLangs()[0])} first<div class="t-cap" style="margin-top:0">Before other languages</div></span><span class="onoff">${first ? 'On' : 'Off'}</span><span class="tg${first ? ' on' : ''}"><i></i></span></div></div></div>`, {
      focusSel: `[data-act="s:${view.sort}"]`,
      onClick: (act) => {
        if (act === 'lf') { ov.close(); setView({ langFirst: !first }); return; }
        ov.close(); setView({ sort: act.slice(2) });
      },
    });
  }
  // Filters: every chip shows its live count, zero-count chips are disabled (never hidden); Back keeps the changes.
  function filterSheet() {
    let draft = { ...view.f };
    const langs = [...new Set(catalog[kind].titles.flatMap((t) => [...t._langs]))];
    const otherLangs = langs.filter((l) => !prefLangs().includes(l)).slice(0, 6);
    const genres = catalog[kind].facets.genres.slice(0, 14);
    const secs = () => [
      ['Language', 'lang', [['mine', 'Your languages'], ['all', 'All languages'], ...otherLangs.map((l) => [l, l])]],
      ['Genre', 'genre', [['', 'Any'], ...genres.map((g) => [g, g])]],
      ['Quality', 'q', [['', 'Any'], ['hd', 'HD and up'], ['4K', '4K']]],
      ['Subtitles', 'sub', [['', 'Any'], [true, 'With subtitles']]],
      ['IMDb', 'imdb', [['', 'Any'], ...IMDB_MIN.map(([l, v]) => [v, l])]],
      ['Decade', 'decade', [['', 'Any'], ...DECADES.map(([l]) => [l, l])]],
    ];
    const total = () => browse(kind, { ...view, f: draft }).length;
    const body = () => secs().map(([title, key, opts]) => {
      const vals = opts.map(([v]) => v);
      const counts = optionCounts(kind, { f: draft }, key, vals.map((v) => (v === '' ? undefined : v)));
      return `<div class="sec">${title}</div><div class="chips" data-row>${opts.map(([v, l], j) => {
        const sel = (draft[key] ?? '') === v || (v === '' && !draft[key]) || (key === 'lang' && v === 'all' && !draft.lang);
        const n = v === '' || v === 'all' ? null : counts[j];
        return `<span class="chip fx${sel ? ' sel' : ''}${n === 0 && !sel ? ' dis' : ''}" tabindex="-1" data-act="f" data-k="${key}" data-v="${esc(String(v))}">${esc(l)}${n != null ? `<span class="n">${compact(n)}</span>` : ''}</span>`;
      }).join('')}</div>`;
    }).join('');
    const active = () => filterCount(draft);
    const draw = () => {
      const keep = document.activeElement?.dataset;
      const k = keep?.k, v = keep?.v, a = keep?.act;
      ov.el.querySelector('.inner').innerHTML = body();
      ov.el.querySelector('[data-n]').textContent = `${active()} active`;
      ov.el.querySelector('[data-act="show"]').textContent = `Show ${total().toLocaleString()} titles`;
      const back = a === 'f' ? ov.el.querySelector(`[data-k="${k}"][data-v="${CSS.escape(v)}"]`) : null;
      if (back) focus(back);
    };
    const ov = openOverlay(`<div class="sheet" style="gap:8px"><div class="row-flex" data-row style="gap:12px"><h3 class="grow">Filters</h3><span class="t-cap" data-n>${active()} active</span><span class="pillbtn fx" tabindex="-1" data-act="clear" style="height:32px;padding:0 14px;font-size:14px">Clear all</span></div>
      <div class="sheet-body"><div class="inner">${body()}</div></div>
      <div class="sheet-foot" data-row><span class="btn btn-full fx" tabindex="-1" data-act="show">Show ${total().toLocaleString()} titles</span></div></div>`, {
      focusSel: '.chip.sel',
      onClick: (act, t) => {
        if (act === 'f') {
          const key = t.dataset.k; let v = t.dataset.v;
          if (key === 'imdb') v = v ? +v : '';
          if (key === 'sub') v = v === 'true';
          draft = { ...draft, [key]: v };
          if (!v || (key === 'lang' && v === 'all')) delete draft[key];
          draw();
        } else if (act === 'clear') { draft = {}; draw(); }
        else if (act === 'show') ov.close();
      },
      onClose: () => { if (JSON.stringify(draft) !== JSON.stringify(view.f)) setView({ f: draft }); },
    });
    scrollList(ov.el);
  }
  function jumpMenu() {
    const targets = jumpTargets(view, list);
    const sortL = SORTS.find(([k]) => k === view.sort)?.[1];
    const ov = openOverlay(`<div class="menu" style="right:48px;top:120px;width:352px"><h3>Jump to</h3><div data-col><div class="lr fx" tabindex="-1" data-act="0"><span class="grow">Top of the list</span>${ic('chevU', 'sm')}</div></div>
      <div class="sep"></div><div class="t-label" style="padding:2px 8px 6px">By ${view.sort === 'year' ? 'decade' : view.sort === 'az' ? 'letter' : view.sort === 'added' ? 'month' : 'rank'} (${esc(sortL)})</div>
      <div class="chips" data-row style="padding:0 6px 4px">${targets.map(([l, at]) => `<span class="chip lg fx" tabindex="-1" data-act="${at}">${esc(l)}</span>`).join('')}</div></div>`, {
      onClick: (act) => { ov.close(false); const i = +act; row = Math.floor(i / COLS); drawGrid(i); },
    });
  }

  return {
    name: kind,
    mount(root) {
      el = root;
      root.innerHTML = `<div data-head></div><div class="lib-cover" hidden></div><div class="ctxline" hidden></div><div class="bubble" hidden></div><div class="lib-grid" data-grid data-cols="6" style="display:block;top:0;height:${PITCH}px;transition:transform 320ms var(--a-ease)"></div>`;
      root.querySelector('.lib-grid').navHook = gridHook;
      root.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-chip]');
        if (chip) { const d = chipDefs().find(([c]) => c === chip.dataset.chip); if (d) setView({ ...d[1] }, d[0]); focus(el.querySelector(`[data-chip="${CSS.escape(chip.dataset.chip)}"]`)); return; }
        const b = e.target.closest('[data-act]');
        if (b?.dataset.act === 'sort') return sortMenu(b);
        if (b?.dataset.act === 'filters') return filterSheet();
        if (b?.dataset.act === 'jump') return jumpMenu();
        if (b?.dataset.act === 'clear') { setView({ f: {} }, 'All'); return; }
        const card = e.target.closest('.pc');
        if (card) push('detail', { title: list[+card.dataset.i] });
      });
      root.addEventListener('tvhold', (e) => {
        const card = e.target.closest('.pc'); if (!card) return;
        const t = list[+card.dataset.i];
        contextMenu(card, [
          { icon: 'saved', label: isFav(t) ? 'Remove from Saved' : 'Save to Saved', run: () => toast(toggleFav(t) ? `Saved ${t.name}` : `Removed ${t.name}`) },
          { icon: 'check', label: 'Mark watched', run: () => { markWatched(t.versions[0]); drawGrid(); } },
          { icon: 'info', label: 'Details', run: () => push('detail', { title: t }) },
        ]);
      });
      root.addEventListener('tvfocus', (e) => { if (!e.target.closest('.lib-grid') && row !== 0) { row = 0; drawGrid(); } });
      on('session', () => { view = null; list = []; });
      on('catalog', (k) => {
        if (k !== kind) return;
        if (current() !== kind && current() !== 'detail') { list = []; return; }   // rebuilt on the next open; don't hold the old titles
        if (current() === kind && row === 0 && !el.querySelector('.lib-grid').contains(document.activeElement)) refreshList();
      });
    },
    enter(root, params, { fresh }) {
      if (!view) loadView();
      if (!catalog[kind]) {
        root.querySelector('[data-head]').innerHTML = `<div class="lib-head"><span class="t-head">${label}</span><span class="t-cap" style="margin-top:6px">Loading…</span></div>`;
        root.querySelector('.lib-grid').innerHTML = Array.from({ length: 12 }, (_, i) => `<span class="skb" style="position:absolute;left:${(i % 6) * COLW}px;top:${Math.floor(i / 6) * PITCH}px;width:124px;height:186px;border-radius:12px"></span>`).join('');
        root.querySelector('.lib-grid').style.transform = 'translateY(176px)';
        ensure(kind).then(() => { if (current() === kind) { refreshList(); if (!root.contains(document.activeElement) && mayFocus()) focus(root.querySelector('.pc')); } })
          .catch((e) => { if (e.message !== 'stale') root.querySelector('.lib-grid').innerHTML = `<div class="state big" style="position:relative;margin:24px auto 0"><div class="ico">${ic('wifiOff')}</div><b>Could not load ${label.toLowerCase()}</b><p>${esc(e.message)}</p></div>`; });
        return;
      }
      if (takeFresh(kind) || fresh || !list.length) refreshList(!fresh);
      else drawGrid();
    },
    leave() { barHidden(false); },
    entry: (root) => root.querySelector(`.pc[data-i="${row * COLS}"]`) || root.querySelector('.pc') || root.querySelector('.chip.sel'),
    toTop(root) { row = 0; drawGrid(); },
  };
}
