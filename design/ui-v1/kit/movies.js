/* Movies / Series (TV): shelves front page, "Browse all" grid, sort menu, filter sheet. Same system for Series. */
(function (g) {
  'use strict';
  const { ic, poster, topbar, dot, wcard, star, tag } = g.Kit, M = g.Mock;
  const byId = (id) => M.MOVIES.find((m) => m.id === id);
  const GRID = ['m13', 'm4', 'm1', 'm6', 'm18', 'm11', 'm19', 'm8', 'm3', 'm20', 'm9', 'm2'];

  /* Front page: Continue (this kind only) first, then curated shelves. Focus = first card of the first shelf. */
  function shelves({ kind = 'Movies' } = {}) {
    const cont = [
      wcard({ seed: 'm2', style: 'figure', hue: 14, title: 'The Long Take', meta: '1h 17m left', prog: 28, focus: true }),
      wcard({ seed: 'm5', style: 'retro', hue: 276, title: 'Salt & Static', meta: '18 min left', prog: 82 }),
      wcard({ seed: 'm7', style: 'forest', hue: 128, title: 'Glass Orchard', meta: '1h 52m left', prog: 6 }),
      wcard({ seed: 'm9', style: 'peaks', hue: 24, title: 'The Cartographer', meta: '1h 40m left', prog: 18 }),
      wcard({ seed: 'm14', style: 'rings', hue: 290, title: 'Quiet Frequencies', meta: '1h 05m left', prog: 40 }),
    ].join('');
    const pop = ['m1', 'm6', 'm3', 'm13', 'm18', 'm11', 'm8'].map(byId).map((m) => poster(m)).join('');
    return `${topbar({ sel: kind.toLowerCase() })}
      <div class="lib-head"><span class="t-head">${kind}</span><span class="t-cap" style="margin-top:6px">4,812 titles${dot}English and your languages</span><span class="grow"></span>
        <span class="pillbtn">${ic('grid')}Browse all<b>4,812</b></span></div>
      <div class="shelf-title rowtitle abs" style="top:128px;left:0">Continue watching</div>
      <div class="strip abs" style="top:158px;left:0"><b>The Long Take</b>${dot}2023${dot}${'★ 7.4'}${dot}1h 17m left${dot}HD</div>
      <div class="rail abs" style="top:188px;left:0">${cont}</div>
      <div class="shelf-title rowtitle abs" style="top:320px;left:0">Popular in English</div>
      <div class="rail abs" style="top:356px;left:0">${pop}</div>`;
  }

  /* Browse all: three header controls (Sort, Filters, Jump) and a virtualised 6-column grid. */
  function grid({ focusIdx = 2, filters = 2, sortLabel = 'Popular', items = GRID.map(byId) } = {}) {
    return `${topbar({ sel: 'movies' })}
      <div class="lib-head"><span class="t-head">All movies</span><span class="t-cap" style="margin-top:6px">214 of 4,812${dot}English first</span><span class="grow"></span>
        <span class="pillbtn">${ic('sort')}Sort<b>${sortLabel}</b></span>
        <span class="pillbtn">${ic('sliders')}Filters${filters ? `<span class="cnt">${filters}</span>` : ''}</span>
        <span class="pillbtn">${ic('chevD')}Jump</span></div>
      <div class="lib-grid" style="top:132px">${items.map((m, i) => poster(m, { focus: i === focusIdx })).join('')}</div>`;
  }
  function scrolled({ focusIdx = 9 } = {}) {
    const items = ['m19', 'm8', 'm3', 'm20', 'm9', 'm2', 'm14', 'm12', 'm7', 'm5', 'm17', 'm10'].map(byId);
    return `<div class="lib-grid" style="top:24px">${items.map((m, i) => poster(m, { focus: i === focusIdx })).join('')}</div>`;
  }
  function sortMenu(focusRow = 1) {
    const rows = [['Popular', 'IMDb and recent views'], ['Top rated', 'IMDb, high to low'], ['Newest', 'release year'], ['Recently added', 'to your provider'], ['A to Z', 'by title']];
    return `<div class="scrim"></div><div class="menu" style="right:48px;top:122px;width:340px"><h3>Sort by</h3>
      ${rows.map(([a, b], i) => `<div class="lr${i === focusRow ? ' f-ring' : ''}"><span class="rd${i === 0 ? ' on' : ''}"></span>${a}<small>${b}</small></div>`).join('')}</div>`;
  }
  function filterSheet() {
    const ch = (t, on, f, n) => `<span class="chip${on ? ' sel' : ''}${f ? ' f-ring' : ''}">${t}${n ? `<span class="t-3" style="font-weight:500">${n}</span>` : ''}</span>`;
    return `<div class="scrim"></div><div class="sheet" style="width:392px">
      <div class="row-flex" style="gap:12px"><h3 class="grow">Filters</h3><span class="pillbtn" style="height:32px;padding:0 14px;font-size:14px">Clear all</span></div>
      <div class="sec">Language</div><div class="chips">${ch('Your languages', 1, 0, '3.9k')}${ch('All languages', 0, 0, '4.8k')}</div>
      <div class="sec">Genre</div><div class="chips">${ch('Action', 0, 0, '412')}${ch('Comedy', 0, 0, '986')}${ch('Drama', 1, 0, '1.2k')}${ch('Thriller', 0, 1, '508')}${ch('Sci-Fi', 0, 0, '240')}${ch('More', 0)}</div>
      <div class="sec">Quality</div><div class="chips">${ch('Any', 1)}${ch('HD and up', 0, 0, '3.1k')}${ch('4K', 0, 0, '612')}</div>
      <div class="sec">Decade</div><div class="chips">${ch('Any')}${ch('2020s', 1, 0, '880')}${ch('2010s', 0, 0, '1.4k')}${ch('Older')}</div>
      <div class="sec">IMDb</div><div class="chips">${ch('Any')}${ch('6+', 0, 0, '2.9k')}${ch('7+', 1, 0, '1.2k')}${ch('8+', 0, 0, '210')}</div>
      <div class="lr" style="margin-top:2px;background:var(--a-surface-1)">More filters<small>Subtitles · Saved only · Provider category</small>${ic('chevR', 'sm')}</div>
      <div class="sheet-foot"><span class="btn btn-full">Show 214 titles</span></div></div>`;
  }
  g.Movies = { shelves, grid, scrolled, sortMenu, filterSheet, GRID, byId };
})(window);
