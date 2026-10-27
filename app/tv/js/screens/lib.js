// Movies and Series: one grid (6 posters a row), Popular first, view chips over the same Sort/Filter state, one Filters
// sheet with live counts, and Jump. Only the rows around the focus are mounted, so 50,000 titles scroll like 50.
import { posterTag } from '../quality.js';
import { $, esc, ic, dot, setHtml, compact } from '../util.js';
import { S, on, store, scoped, toggleFav, isFav, markWatched } from '../state.js';
import { catalog, ensure, takeFresh, browse, SORTS, DECADES, IMDB_MIN, facetCounts, filterCount, jumpTargets, prefLangs, genresOf } from '../catalog.js';
import { poster } from '../cards.js';
import { push, go, barHidden, current, mayFocus } from '../router.js';
import { focus } from '../focus.js';
import { openDetail } from '../actions.js';
import { videoMask } from '../catchup.js';
import { openOverlay, contextMenu, toast, scrollList, radioMenu } from '../ui.js';
import * as AD from '../addons.js';
import { providerByImdb } from '../imdb.js';
import { openAddonSheet, SPIN } from './addons.js';

const COLS = 6, PITCH = 252, COLW = 148, MOUNT_BEFORE = 2, MOUNT_AFTER = 3;
const CHIP_GENRES = 4;

export default function lib(kind) {
  const label = kind === 'movie' ? 'Movies' : 'Series';
  let el, list = [], view = null, row = 0, bubbleT = 0, repeatSince = 0, loadT = 0, unhook = () => {};
  // An add-on catalog chip in use (design/ui-v1/addons/SPEC.md 4.2): its own order, paged with skip, merged with the
  // provider's titles by IMDb id. { key, a, c, genre, items, ids, mine (provider titles shown), state: 'loading' |
  // 'ok' | 'down' | 'end', more: '' | 'loading' | 'failed', onlyMine }
  let ad = null;
  const adChips = () => AD.chipCatalogs(kind);
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
  // the add-on chips after a divider: the catalog's name, then the add-on in text-3 (SPEC 4.2)
  function addonChips() {
    const cs = adChips();
    if (!cs.length) return '';
    return `<span class="ad-cut"></span>${cs.map((x) => `<span class="chip lg fx${x.key === view.chip ? ' sel' : ''}" tabindex="-1" data-chip="${esc(x.key)}" data-hold>${esc(x.name)}<span class="ad-by">${esc(x.by)}</span></span>`).join('')}`;
  }
  function adHeader() {
    const gOpts = AD.genreOf(ad.c)?.options || [];
    const cap = ad.state === 'loading' ? `${SPIN}Asking ${esc(AD.label(ad.a))}…` : `${esc(AD.catalogName(ad.a, ad.c))} from ${esc(AD.label(ad.a))}${ad.genre ? `${dot}${esc(ad.genre)}` : ''}${ad.onlyMine ? `${dot}only titles your provider has` : ad.mine.size ? `${dot}<span class="ad-legend"><i>${ic('tv')}</i>also on your provider</span>` : ''}`;
    return `<div class="lib-head" data-row><span class="t-head">${label}</span><span class="t-cap" style="margin-top:6px;display:inline-flex;align-items:center;gap:6px">${cap}</span><span class="grow"></span>
      ${gOpts.length ? `<span class="pillbtn fx" tabindex="-1" data-act="genre">${ic('sliders')}Genre${ad.genre ? `<b>${esc(ad.genre)}</b>` : ''}</span>` : ''}</div>
      <div class="lib-chips" data-row>${chipDefs().map(([c]) => `<span class="chip lg fx" tabindex="-1" data-chip="${esc(c)}">${esc(c)}</span>`).join('')}${addonChips()}</div>`;
  }
  function header() {
    if (ad) return adHeader();
    const n = catalog[kind]?.titles?.length || 0;
    const sortL = SORTS.find(([k]) => k === view.sort)?.[1] || 'Popular';
    const fc = filterCount(view.f);
    const langNote = view.langFirst && view.sort !== 'az' ? `${dot}${prefLangs()[0]} first` : '';
    return `<div class="lib-head" data-row><span class="t-head">${label}</span><span class="t-cap" style="margin-top:6px">${list.length === n ? `${n.toLocaleString()} titles` : `${list.length.toLocaleString()} of ${n.toLocaleString()}`}${langNote}</span><span class="grow"></span>
      <span class="pillbtn fx" tabindex="-1" data-act="search">${ic('search')}Search</span>
      <span class="pillbtn fx" tabindex="-1" data-act="sort">${ic('sort')}Sort<b>${esc(sortL)}</b></span>
      <span class="pillbtn fx" tabindex="-1" data-act="filters">${ic('sliders')}Filters${fc > 0 ? `<span class="cnt">${fc}</span>` : ''}</span>
      <span class="pillbtn fx" tabindex="-1" data-act="jump">${ic('chevD')}Jump</span></div>
      <div class="lib-chips" data-row>${chipDefs().map(([c]) => `<span class="chip lg fx${c === view.chip ? ' sel' : ''}" tabindex="-1" data-chip="${esc(c)}">${esc(c)}</span>`).join('')}${addonChips()}</div>`;
  }
  function refreshList(keepFocus) {
    const cs = view.chip?.startsWith('ad') && adChips().find((x) => x.key === view.chip);
    if (view.chip?.startsWith('ad') && !cs) view.chip = 'All';   // (its add-on or catalog went)
    if (cs) { if (ad?.key !== cs.key) openAd(cs); list = ad.items; }
    else { ad = null; list = browse(kind, view); }
    setHtml(el.querySelector('[data-head]'), header());
    if (!keepFocus) row = 0;
    drawGrid();
  }
  // Mount the rows around `row` (the focused one), positioned absolutely; the grid slides by whole rows.
  function drawGrid(focusIdx) {
    const grid = el.querySelector('.lib-grid');
    grid.querySelectorAll('.ad-skel, .ad-more').forEach((x) => x.remove());
    if (ad && !list.length) {
      const who = esc(AD.label(ad.a));
      grid.innerHTML = ad.state === 'loading' ? Array.from({ length: 12 }, (_, i) => `<span class="skb" style="position:absolute;left:${(i % 6) * COLW}px;top:${Math.floor(i / 6) * PITCH}px;width:124px;height:186px;border-radius:12px"></span>`).join('')
        : ad.state === 'down' ? `<div class="state big" style="position:relative;margin:24px auto 0;left:0"><div class="ico">${ic('wifiOff')}</div><b>${who} isn't answering</b><p>Its catalogs come back when it does. Your provider's ${label.toLowerCase()} are all still here, under All.</p><span class="row-flex" data-row style="gap:12px;justify-content:center"><span class="btn fx" tabindex="-1" data-act="adretry">Try again</span><span class="btn2 fx" tabindex="-1" data-act="clear">All ${label.toLowerCase()}</span></span></div>`
        : `<div class="state big" style="position:relative;margin:24px auto 0;left:0"><div class="ico">${ic('tv')}</div><b>${ad.onlyMine ? 'None of these are on your provider' : 'Nothing here yet'}</b><p>${ad.onlyMine ? `No add-on of yours gives copies of ${esc(AD.catalogName(ad.a, ad.c))}'s titles, and your provider has none of them.` : `${who} sent no titles for this.`}</p><span class="row-flex" data-row style="gap:12px;justify-content:center"><span class="btn2 fx" tabindex="-1" data-act="clear">All ${label.toLowerCase()}</span></span></div>`;
      grid.style.transform = 'translateY(176px)';
      return;
    }
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
    // (a card is drawn again when the shield's mask on it changes: catch-up 5.8; or its real quality: subtitles 6.1)
    const mk = (t) => `${videoMask(t)?.kind || ''}|${t.kind === 'movie' ? posterTag(t) : ''}`;
    for (const [i, node] of have) if (!want.has(i) || node._t !== list[i] || (node._m || '') !== mk(list[i])) { if (node === document.activeElement) continue; node.remove(); have.delete(i); }
    let html = '';
    for (const i of want) if (!have.has(i)) html += poster(list[i], i, { mine: !!ad?.mine.has(list[i]) }).replace('class="pc fx', `data-c="${i % COLS}" style="position:absolute;left:${(i % COLS) * COLW}px;top:${Math.floor(i / COLS) * PITCH}px" class="pc fx`);
    if (html) grid.insertAdjacentHTML('beforeend', html);
    // the next page on its way: static blocks on the next row; a page that failed: one inline card (SPEC 4.2, S9)
    const nextTop = Math.ceil(list.length / COLS) * PITCH;
    if (ad?.more === 'loading' && b >= Math.ceil(list.length / COLS)) grid.insertAdjacentHTML('beforeend', Array.from({ length: COLS }, (_, c) => `<span class="ad-skel" style="left:${c * COLW}px;top:${nextTop}px"></span>`).join(''));
    if (ad?.more === 'failed') grid.insertAdjacentHTML('beforeend', `<div class="card ad-more" style="position:absolute;left:0;top:${nextTop}px;width:864px;height:64px;box-sizing:border-box;display:flex;align-items:center;gap:14px;padding:0 20px"><span class="ad-bang">${ic('bang')}</span><span class="grow"><b style="display:block;font:650 16px/20px var(--a-font-text)">${esc(AD.label(ad.a))} didn't send the next page</b><span class="t-cap">The titles above stay. ▼ to try again</span></span><span class="btn2 sm">Try again</span></div>`);
    for (const node of grid.children) if (node.dataset.i) { node._t = list[+node.dataset.i]; node._m = mk(node._t); }
    // Scrolled, the focused row sits low enough to show the row above under the top fade, and high enough that its own
    // titles stay on screen (a card is 238 tall: poster 186 + title and year): its bottom lands inside the safe edge (513).
    grid.style.transform = `translateY(${(scrolled ? 22 : 176) - topRow * PITCH}px)`;
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
    else if (dir === 'up') {
      if (i < COLS) {
        // Up from the first row: the view chips (the one in use), then Sort / Filters / Jump above them.
        row = 0; drawGrid();
        const chip = el.querySelector('.lib-chips .chip.sel') || el.querySelector('.lib-chips .chip');
        return chip ? focus(chip) : undefined;
      }
      t = i - COLS;
    }
    else {
      if (i + COLS < n) t = i + COLS; else if (Math.floor(i / COLS) < Math.floor((n - 1) / COLS)) t = n - 1;
      else if (ad && ad.more === 'failed') { loadMore(); return true; }          // ▼ on the last row tries again
      else if (ad && (ad.more === 'loading' || ad.state !== 'end')) return true;  // on its way: focus stays, even under key repeat
      else return false;
    }
    row = Math.floor(t / COLS);
    if (ad && dir === 'down' && row >= Math.ceil(n / COLS) - 2) loadMore();
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

  function openAd(cs) {
    ad = { key: cs.key, a: cs.a, c: cs.c, genre: '', items: [], ids: new Set(), mine: new Set(), state: 'loading', more: '', onlyMine: !AD.coveredByStreams(cs.a, cs.c), got: 0 };
    const g = AD.genreOf(cs.c);
    if (g?.isRequired && g.options?.length) ad.genre = g.options[0];
    loadPage(ad, true);
  }
  async function loadPage(st, first) {
    let metas;
    try { metas = await AD.catalogPage(st.a, st.c, { genre: st.genre, skip: st.got }); }
    catch { if (ad !== st) return; if (first) st.state = 'down'; else st.more = 'failed'; return redrawAd(); }
    if (ad !== st) return;
    const prov = await providerByImdb(kind);
    if (ad !== st) return;
    st.got += metas.length;
    let fresh = 0;
    for (const m of metas) {
      if (st.ids.has(m.id)) continue;
      st.ids.add(m.id); fresh++;
      const t = prov.get(m.id);
      if (t) { if (!st.items.includes(t)) { st.items.push(t); st.mine.add(t); } continue; }
      if (st.onlyMine) continue;
      if (videoMask({ kind, id: m.id, name: m.name })) continue;   // an add-on video naming a hidden game's teams (SPEC 10): left out, never its name or art
      st.items.push({ kind, key: m.id, id: m.id, name: m.name, poster: m.poster, year: m.year ? String(m.year) : '', versions: [], _qs: new Set(), _langs: new Set(), _genres: m.genres, _ir: parseFloat(m.imdbRating) || 0, _s: window.Titles.norm(m.name), addon: { key: st.a.key, type: m.type || kind }, released: m.released, releaseInfo: m.releaseInfo });
    }
    // it stops when a page is empty or brings only titles already shown (Cinemeta sends 49 or 50: SPEC 4.2)
    st.state = !metas.length || !fresh || !AD.pageable(st.c) ? 'end' : 'ok';
    st.more = '';
    if (st.onlyMine && st.state === 'ok' && st.items.length < 12) return loadPage(st, false);   // (few of them are his: keep reading)
    redrawAd();
  }
  function loadMore() {
    if (!ad || ad.more === 'loading' || ad.state === 'end' || ad.state === 'loading') return;
    ad.more = 'loading'; drawGrid();
    loadPage(ad, false);
  }
  function redrawAd() {
    if (!el || current() !== kind || !ad) return;
    list = ad.items;
    setHtml(el.querySelector('[data-head]'), header());
    const inGrid = el.querySelector('.lib-grid').contains(document.activeElement);
    const onChip = document.activeElement?.dataset?.chip === ad.key;
    drawGrid();
    if (ad.state === 'down' && onChip) focus(el.querySelector('[data-act="adretry"]'));   // (the card's Try again, SPEC 4.2)
    else if (!inGrid && !el.contains(document.activeElement) && mayFocus()) focus(el.querySelector('.lib-chips .chip.sel'));
  }
  function genreMenu() {
    const opts = AD.genreOf(ad.c)?.options || [], req = AD.genreOf(ad.c)?.isRequired;
    radioMenu({ title: 'Genre', value: ad.genre, rows: [...(req ? [] : [{ v: '', l: 'Any' }]), ...opts.map((o) => ({ v: o, l: o }))], onPick: (v) => {
      ad = { ...ad, genre: v, items: [], ids: new Set(), mine: new Set(), got: 0, state: 'loading', more: '' };
      loadPage(ad, true); list = []; row = 0;
      setHtml(el.querySelector('[data-head]'), header()); drawGrid();
      focus(el.querySelector('[data-act="genre"]'));
    } });
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
      ['Genre', 'genre', [['', 'Any'], ...genres.map((g) => [g, g])], 'Pick as many as you like'],
      ['Quality', 'q', [['', 'Any'], ['hd', 'HD and up'], ['4K', '4K']]],
      ['Subtitles', 'sub', [['', 'Any'], [true, 'With subtitles']]],
      ['IMDb', 'imdb', [['', 'Any'], ...IMDB_MIN.map(([l, v]) => [v, l])]],
      ['Decade', 'decade', [['', 'Any'], ...DECADES.map(([l]) => [l, l])]],
    ];
    const total = () => browse(kind, { ...view, f: draft }).length;
    const body = () => {
      const all = facetCounts(kind, draft, secs().map(([, key, opts]) => [key, opts.map(([v]) => (v === '' ? undefined : v))]));
      return secs().map(([title, key, opts, note]) => {
      const counts = all[key];
      const picked = genresOf(draft);
      return `<div class="sec">${title}${note ? `<span class="t-cap" style="margin-left:10px;font-weight:500;text-transform:none;letter-spacing:0">${note}</span>` : ''}</div><div class="chips" data-row>${opts.map(([v, l], j) => {
        const sel = key === 'genre' ? (v === '' ? !picked.length : picked.includes(v))
          : (draft[key] ?? '') === v || (v === '' && !draft[key]) || (key === 'lang' && v === 'all' && !draft.lang);
        const n = v === '' || v === 'all' ? null : counts[j];
        return `<span class="chip fx${sel ? ' sel' : ''}${n === 0 && !sel ? ' dis' : ''}" tabindex="-1" data-act="f" data-k="${key}" data-v="${esc(String(v))}">${esc(l)}${n != null ? `<span class="n">${compact(n)}</span>` : ''}</span>`;
      }).join('')}</div>`;
      }).join('');
    };
    const active = () => filterCount(draft);
    const draw = () => {
      const keep = document.activeElement?.dataset;
      const k = keep?.k, v = keep?.v, a = keep?.act;
      ov.el.querySelector('.inner').innerHTML = body();
      ov.el.querySelector('[data-n]').textContent = `${active()} active`;
      ov.el.querySelector('[data-act="show"]').textContent = `Show ${total().toLocaleString()} ${total() === 1 ? 'title' : 'titles'}`;
      const back = a === 'f' ? ov.el.querySelector(`[data-k="${k}"][data-v="${CSS.escape(v)}"]`) : null;
      if (back) focus(back);
    };
    const ov = openOverlay(`<div class="sheet" style="gap:8px"><div class="row-flex" data-row style="gap:12px"><h3 class="grow">Filters</h3><span class="t-cap" data-n>${active()} active</span><span class="pillbtn fx" tabindex="-1" data-act="clear" style="height:32px;padding:0 14px;font-size:14px">Clear all</span></div>
      <div class="sheet-body"><div class="inner">${body()}</div></div>
      <div class="sheet-foot" data-row><span class="btn btn-full fx" tabindex="-1" data-act="show">Show ${total().toLocaleString()} ${total() === 1 ? 'title' : 'titles'}</span></div></div>`, {
      focusSel: '.chip.sel',
      onClick: (act, t) => {
        if (act === 'f') {
          const key = t.dataset.k; let v = t.dataset.v;
          if (key === 'imdb') v = v ? +v : '';
          if (key === 'sub') v = v === 'true';
          if (key === 'genre' && v) {
            // Genres add up: each OK turns one on or off; "Any" clears them.
            const set = genresOf(draft);
            v = set.includes(v) ? set.filter((g) => g !== v) : [...set, v];
            v = v.length > 1 ? v : v[0] || '';
          }
          draft = { ...draft, [key]: v };
          if (!v || (key === 'lang' && v === 'all')) delete draft[key];
          // the chip you pressed shows its new state at once; the counts follow on the next frame
          if (key === 'genre') { const g = genresOf(draft); ov.el.querySelectorAll('[data-k="genre"]').forEach((c) => c.classList.toggle('sel', c.dataset.v ? g.includes(c.dataset.v) : !g.length)); }
          else { ov.el.querySelectorAll(`[data-k="${key}"]`).forEach((c) => c.classList.toggle('sel', c === t)); }
          requestAnimationFrame(() => setTimeout(draw, 0));
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
        if (chip && chip.dataset.chip.startsWith('ad')) { const cs = adChips().find((x) => x.key === chip.dataset.chip); if (cs) { view.chip = cs.key; saveView(); ad = null; refreshList(); } focus(el.querySelector(`[data-chip="${CSS.escape(chip.dataset.chip)}"]`)); return; }
        if (chip) { ad = null; const d = chipDefs().find(([c]) => c === chip.dataset.chip); if (d) setView({ ...d[1] }, d[0]); focus(el.querySelector(`[data-chip="${CSS.escape(chip.dataset.chip)}"]`)); return; }
        const b = e.target.closest('[data-act]');
        if (b?.dataset.act === 'sort') return sortMenu(b);
        if (b?.dataset.act === 'filters') return filterSheet();
        if (b?.dataset.act === 'jump') return jumpMenu();
        if (b?.dataset.act === 'search') { go('search', { scope: kind, from: kind }); return; }   // (only this tab's titles; Back returns here)
        if (b?.dataset.act === 'clear') { ad = null; setView({ f: {} }, 'All'); focus(el.querySelector('[data-chip="All"]')); return; }
        if (b?.dataset.act === 'genre') return genreMenu();
        if (b?.dataset.act === 'adretry') { const cs = adChips().find((x) => x.key === ad?.key); if (cs) { ad = null; refreshList(); focus(el.querySelector('.lib-chips .chip.sel')); } return; }
        const card = e.target.closest('.pc');
        if (card) openDetail(list[+card.dataset.i]);
      });
      root.addEventListener('tvhold', (e) => {
        // hold OK on an add-on chip: Hide this chip (focused; it comes back from the add-on's sheet), or its catalogs
        const ch = e.target.closest('[data-chip^="ad"]');
        if (ch) {
          const cs = adChips().find((x) => x.key === ch.dataset.chip); if (!cs) return;
          contextMenu(ch, [
            { icon: 'eyeOff', label: 'Hide this chip', run: () => { AD.setCatalog(cs.a, cs.c, false); if (view.chip === cs.key) { ad = null; setView({ f: {} }, 'All'); } else refreshList(true); toast(`${cs.name} is hidden. It comes back from ${cs.by}'s sheet in Account`); focus(el.querySelector('.lib-chips .chip.sel') || el.querySelector('.lib-chips .chip')); } },
            { icon: 'chevR', label: `${cs.by}'s catalogs`, run: () => openAddonSheet(cs.a) },
          ]);
          return;
        }
        const card = e.target.closest('.pc'); if (!card) return;
        const t = list[+card.dataset.i];
        contextMenu(card, [
          { icon: 'saved', label: isFav(t) ? 'Remove from Saved' : 'Save to Saved', run: () => { const nm = videoMask(t)?.title || t.name; toast(toggleFav(t) ? `Saved ${nm}` : `Removed ${nm}`); } },   // (a masked video: airglow's name)
          ...(t.addon ? [] : [{ icon: 'check', label: 'Mark watched', run: () => { markWatched(t.versions[0]); drawGrid(); } }]),
          { icon: 'info', label: 'Details', run: () => openDetail(t) },
        ]);
      });
      root.addEventListener('tvfocus', (e) => {
        if (!e.target.closest('.lib-grid') && row !== 0) { row = 0; drawGrid(); }
        // A long chip row scrolls sideways so the focused chip is always on screen.
        const strip = e.target.closest('.lib-chips');
        if (strip) {
          const c = e.target, l = c.offsetLeft, r = l + c.offsetWidth;
          if (l < strip.scrollLeft + 8) strip.scrollLeft = Math.max(0, l - 8);
          else if (r > strip.scrollLeft + strip.clientWidth - 8) strip.scrollLeft = r - strip.clientWidth + 8;
          strip.classList.toggle('scrolled', strip.scrollLeft > 0);
        }
      });
      on('session', () => { view = null; list = []; ad = null; });
      on('addons', () => { if (current() === kind && el.querySelector('.lib-chips')) setHtml(el.querySelector('[data-head]'), header()); });
      on('nba', () => { if (current() === kind && list.length) drawGrid(); });   // (the shield's masks follow what you've seen)
      on('probed', () => { if (current() === kind && kind === 'movie' && list.length && !ad) drawGrid(); });   // (the posters' tags fill in as checks land)
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
        const load = () => {
          clearTimeout(loadT); loadT = 0;
          document.removeEventListener('keydown', onDown, true);
          ensure(kind).then(() => { if (current() === kind) { refreshList(); if (!root.contains(document.activeElement) && mayFocus()) focus(root.querySelector('.pc')); } })
            .catch((e) => { if (e.message !== 'stale') root.querySelector('.lib-grid').innerHTML = `<div class="state big" style="position:relative;margin:24px auto 0"><div class="ico">${ic('wifiOff')}</div><b>Could not load ${label.toLowerCase()}</b><p>${esc(e.message)}</p></div>`; });
        };
        const onDown = (e) => { if (e.key === 'ArrowDown' || e.key === 'Enter') load(); };
        // Passing over the tab on the top bar doesn't load tens of thousands of titles: resting on it (0.8 s), OK or Down does.
        if (mayFocus()) load();
        else { clearTimeout(loadT); loadT = setTimeout(() => { if (current() === kind) load(); }, 800); document.addEventListener('keydown', onDown, true); unhook = () => document.removeEventListener('keydown', onDown, true); }
        return;
      }
      if (takeFresh(kind) || fresh || !list.length) refreshList(!fresh);
      else drawGrid();
    },
    leave() { barHidden(false); clearTimeout(loadT); loadT = 0; unhook(); },
    entry: (root) => root.querySelector(`.pc[data-i="${row * COLS}"]`) || root.querySelector('.pc') || root.querySelector('.chip.sel'),
    toTop(root) { row = 0; drawGrid(); },
  };
}
