/* Movies / Series library screen (grid), shared by the base, sort and filter mocks. */
(function (g) {
  'use strict';
  const { ic, poster, topbar, dot } = g.Kit, M = g.Mock;
  const byId = (id) => M.MOVIES.find((m) => m.id === id);
  const ORDER = ['m13', 'm4', 'm1', 'm6', 'm18', 'm11', 'm19', 'm8', 'm3', 'm20', 'm9', 'm2'];
  const CATS = ['All', 'New in English', 'Top rated', '4K', 'Action', 'Comedy', 'Drama', 'Thriller', 'Sci-Fi', 'Kids', 'Documentary', 'Foreign'];
  function movies({ focusIdx = 2, headFocus = '', sel = 'All', kind = 'Movies', count = '4,812', sortLabel = 'Recently added', filters = 0, items = ORDER.map(byId) } = {}) {
    const chips = CATS.map((c) => `<span class="chip lg${c === sel ? ' sel' : ''}${headFocus === 'chip:' + c ? ' f-ring' : ''}">${c}</span>`).join('');
    const grid = items.map((m, i) => poster(m, { focus: i === focusIdx })).join('');
    return `${topbar({ sel: kind.toLowerCase() })}
      <div class="lib-head"><span class="t-head">${kind}</span><span class="t-cap" style="margin-top:6px">${count} titles${dot}English first</span><span class="grow"></span>
        <span class="pillbtn${headFocus === 'sort' ? ' f-ring' : ''}">${ic('sort')}Sort<b>${sortLabel}</b></span>
        <span class="pillbtn${headFocus === 'filters' ? ' f-ring' : ''}">${ic('sliders')}Filters${filters ? `<span class="cnt">${filters}</span>` : ''}</span></div>
      <div class="lib-chips">${chips}</div>
      <div class="lib-grid">${grid}</div>`;
  }
  function scrolled({ focusIdx = 9 } = {}) {
    const items = ['m19', 'm8', 'm3', 'm20', 'm9', 'm2', 'm14', 'm12', 'm7', 'm5', 'm17', 'm10'].map(byId);
    return `<div class="lib-grid" style="top:24px">${items.map((m, i) => poster(m, { focus: i === focusIdx })).join('')}</div>`;
  }
  function sortMenu(focusRow = 1) {
    const rows = [['Recently added', 'new first'], ['Rating', 'high to low'], ['Year', 'newest first'], ['Title', 'A to Z']];
    const sel = 0;
    return `<div class="scrim"></div><div class="menu" style="right:48px;top:122px;width:320px"><h3>Sort by</h3>
      ${rows.map(([a, b], i) => `<div class="lr${i === focusRow ? ' f-ring' : ''}"><span class="rd${i === sel ? ' on' : ''}"></span>${a}<small>${b}</small></div>`).join('')}
      <div class="sep"></div>
      <div class="lr"><span class="grow">English first<div class="t-cap" style="margin-top:0">Before other languages</div></span><span class="onoff">On</span><span class="tg on"><i></i></span></div></div>`;
  }
  function filterSheet() {
    const ch = (t, on, f) => `<span class="chip${on ? ' sel' : ''}${f ? ' f-ring' : ''}">${t}</span>`;
    return `<div class="scrim"></div><div class="sheet">
      <div class="row-flex" style="gap:12px"><h3 class="grow">Filters</h3><span class="t-cap" style="font-size:14px">2 active</span></div>
      <div class="sec">Language</div><div class="chips">${ch('English first', 1)}${ch('English only')}${ch('All')}</div>
      <div class="sec">Genre</div><div class="chips">${ch('Action')}${ch('Comedy')}${ch('Drama', 1)}${ch('Thriller', 0, 1)}${ch('Sci-Fi')}${ch('Horror')}${ch('Family')}${ch('Documentary')}${ch('More')}</div>
      <div class="sec">Year</div><div class="chips">${ch('Any')}${ch('2020s', 1)}${ch('2010s')}${ch('Older')}</div>
      <div class="sec">Rating</div><div class="chips">${ch('Any')}${ch('6+')}${ch('7+', 1)}${ch('8+')}</div>
      <div class="sheet-foot"><span class="btn btn-full">Show 214 titles</span></div></div>`;
  }
  g.Movies = { movies, scrolled, sortMenu, filterSheet, ORDER, byId };
})(window);
