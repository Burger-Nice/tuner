/* Movies / Series (TV): ONE grid with view chips, Sort (Popular default), one Filters sheet with live counts, Jump.
   Chips are views over the same state (they write Sort/Genre/Quality), so nothing is filtered in two places. */
(function (g) {
  'use strict';
  const { ic, poster, topbar, dot, tag } = g.Kit, M = g.Mock;
  const byId = (id) => M.MOVIES.find((m) => m.id === id);
  const GRID = ['m1', 'm6', 'm3', 'm18', 'm13', 'm11', 'm4', 'm8', 'm9', 'm2', 'm19', 'm20'];
  const CHIPS = ['All', 'New in English', 'Top rated', '4K', 'Action', 'Comedy', 'Drama', 'Thriller'];

  function header({ title = 'Movies', count = '4,812 titles', sort = 'Popular', filters = 0, focus = '', ctx = true } = {}) {
    const f = (k) => (focus === k ? ' f-ring' : '');
    return `<div class="lib-head"><span class="t-head">${title}</span><span class="t-cap" style="margin-top:6px">${count}${dot}English first</span><span class="grow"></span>
        <span class="pillbtn${f('sort')}">${ic('sort')}Sort<b>${sort}</b></span>
        <span class="pillbtn${f('filters')}">${ic('sliders')}Filters${filters ? `<span class="cnt">${filters}</span>` : ''}</span>
        <span class="pillbtn${f('jump')}">${ic('chevD')}Jump</span></div>`;
  }
  function chips(sel = 'All', focus = '') {
    return `<div class="lib-chips">${CHIPS.map((c) => `<span class="chip lg${c === sel ? ' sel' : ''}${focus === c ? ' f-ring' : ''}">${c}</span>`).join('')}</div>`;
  }
  function grid({ focusIdx = 0, filters = 0, sort = 'Popular', sel = 'All', items = GRID.map(byId), title = 'Movies', count = '4,812 titles', headFocus = '' } = {}) {
    return `${topbar({ sel: title.toLowerCase().startsWith('series') ? 'series' : 'movies' })}
      ${header({ title, count, sort, filters, focus: headFocus })}${chips(sel)}
      <div class="lib-grid" style="top:176px">${items.map((m, i) => poster(m, { focus: i === focusIdx })).join('')}</div>`;
  }
  /* Scrolled: bar and header slid away (translateY). A 14 px context line keeps the sort and filters visible; a scroll bubble shows during fast key repeat. */
  function scrolled({ focusIdx = 9, bubble = true } = {}) {
    const items = ['m19', 'm8', 'm3', 'm20', 'm9', 'm2', 'm14', 'm12', 'm7', 'm5', 'm17', 'm10'].map(byId);
    return `<div class="ctxline">Movies${dot}Popular${dot}3 filters</div>
      <div class="lib-grid" style="top:50px">${items.map((m, i) => poster(m, { focus: i === focusIdx })).join('')}</div>
      ${bubble ? `<div class="bubble"><b>7.4</b><span>row 120 of 8,300</span></div>` : ''}`;
  }
  function sortMenu(focusRow = 1) {
    const rows = [['Popular', 'IMDb, this week'], ['Top rated', 'IMDb, high to low'], ['Newest', 'release year'], ['Recently added', 'to your provider'], ['Title', 'A to Z']];
    return `<div class="scrim"></div><div class="menu" style="right:48px;top:120px;width:352px"><h3>Sort by</h3>
      ${rows.map(([a, b], i) => `<div class="lr${i === focusRow ? ' f-ring' : ''}"><span class="rd${i === 0 ? ' on' : ''}"></span>${a}<small>${b}</small></div>`).join('')}
      <div class="sep"></div>
      <div class="lr" style="height:60px"><span class="grow">English first<div class="t-cap" style="margin-top:0">Before other languages</div></span><span class="onoff">On</span><span class="tg on"><i></i></span></div></div>`;
  }
  function filterSheet() {
    const ch = (t, on, f, n, dis) => `<span class="chip${on ? ' sel' : ''}${f ? ' f-ring' : ''}${dis ? ' dis' : ''}">${t}${n ? `<span class="n">${n}</span>` : ''}</span>`;
    return `<div class="scrim"></div><div class="sheet" style="width:420px;gap:8px;padding-bottom:0">
      <div class="row-flex" style="gap:12px"><h3 class="grow">Filters</h3><span class="t-cap">3 active</span><span class="pillbtn" style="height:32px;padding:0 14px;font-size:14px">Clear all</span></div>
      <div class="sheet-scroll">
      <div class="sec">Language</div><div class="chips">${ch('Your languages', 1, 0, '3.9k')}${ch('All languages', 0, 0, '4.8k')}</div>
      <div class="sec">Genre</div><div class="chips">${ch('Action', 0, 0, '412')}${ch('Comedy', 0, 0, '986')}${ch('Drama', 1, 0, '1.2k')}${ch('Thriller', 0, 1, '508')}${ch('Sci-Fi', 0, 0, '240')}${ch('Horror', 0, 0, '0', 1)}${ch('More', 0)}</div>
      <div class="sec">Quality</div><div class="chips">${ch('Any', 1)}${ch('HD and up', 0, 0, '3.1k')}${ch('4K', 0, 0, '612')}</div>
      <div class="sec">Subtitles</div><div class="chips">${ch('Any', 1)}${ch('With subtitles', 0, 0, '2.2k')}</div>
      <div class="sec">IMDb</div><div class="chips">${ch('Any')}${ch('6+', 0, 0, '2.9k')}${ch('7+', 1, 0, '1.2k')}${ch('8+', 0, 0, '210')}</div>
      <div class="sec">Decade</div><div class="chips">${ch('Any', 1)}${ch('2020s', 0, 0, '880')}${ch('2010s', 0, 0, '1.4k')}${ch('Older')}</div>
      </div>
      <div class="sheet-foot" style="padding-bottom:27px"><span class="btn btn-full">Show 214 titles</span></div></div>`;
  }
  function jumpSheet() {
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    return `<div class="scrim"></div><div class="menu" style="right:48px;top:120px;width:352px"><h3>Jump to</h3>
      <div class="lr"><span class="grow">Top of the list</span>${ic('chevU', 'sm')}</div>
      <div class="sep"></div>
      <div class="t-label" style="padding:2px 8px 6px">Popular is grouped by year</div>
      <div class="chips" style="padding:0 6px 4px">${['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', 'Older'].map((y, i) => `<span class="chip lg${i === 2 ? ' f-ring' : ''}">${y}</span>`).join('')}</div></div>`;
  }
  /* hold OK on a card: Save first and focused, so hold then OK saves (2 presses) */
  function context({ x = 372, y = 190 } = {}) {
    const rows = [['saved', 'Save to Saved', 1], ['check', 'Mark watched', 0], ['info', 'Details', 0]];
    return `<div class="ctxmenu" style="left:${x}px;top:${y}px">${rows.map(([i, t, f]) => `<div class="lr${f ? ' f-ring' : ''}">${ic(i, 'sm')}${t}</div>`).join('')}</div>`;
  }
  g.Movies = { grid, scrolled, sortMenu, filterSheet, jumpSheet, context, GRID, byId, header, chips };
})(window);
