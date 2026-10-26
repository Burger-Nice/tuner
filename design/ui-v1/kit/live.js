/* Live guide (TV). Now panel is display only (OK tunes the focused programme, hold OK = favourite). Up from the first row
   reaches the group chip, then the bar. variants: shield = your team's description is hidden. */
(function (g) {
  'use strict';
  const { ic, liveP, dot, topbar, cell, hm, WIN, NOWH } = g.Kit, C = g.Mock.CHANNELS;
  const prog = {
    4: [['Grizzlies at Warriors', 19.5, 22, 1], ['NBA Postgame', 22, 22.5], ['Hardwood Classics: Finals G6', 22.5, 24.5]],
    12: [['SportsCenter', 20, 21], ['NFL Live', 21, 22], ['Monday Night Countdown', 22, 23], ['First Take', 23, 24]],
    33: [['Game Time', 20, 21], ['Press Pass', 21, 21.5], ['Hardwood Classics: Finals G6', 21.5, 23.5]],
    31: [['Lakers at Suns', 20.5, 23, 1], ['Inside the NBA', 23, 24]],
    204: null,
    101: [['Panorama', 20.5, 21], ['Silent Witness', 21, 22], ['Newsnight', 22, 23]],
  };
  function row(ch, i, { focusCell = 0, focusRow = 0 } = {}) {
    let cells;
    if (!prog[ch.n]) cells = cell({ t: 'No guide information', s: WIN.start, e: WIN.start + WIN.hours }, { empty: true });
    else cells = prog[ch.n].map(([t, s, e, l], j) => cell({ t, s, e }, { focus: i === focusRow && j === focusCell, now: s <= NOWH && e > NOWH, live: !!l && s <= NOWH && e > NOWH })).join('');
    const mark = i === 0 ? `<span class="fv">${ic('pin')}</span>` : ch.fav ? `<span class="fv">${ic('star')}</span>` : '';
    return `<div class="g-row"><div class="g-ch${i === focusRow ? ' sel' : ''}"><span class="num">${ch.n}</span><span class="logo sm">${ch.ini}</span><div class="nm">${ch.name}</div>${mark}</div><div class="g-cells">${cells}</div></div>`;
  }
  function guide({ shield = false, groupFocus = false, focusRow = 0 } = {}) {
    const rows = [C[0], C[1], C[3], C[2], C[6], C[4]];
    const ticks = [21, 21.5, 22].map((h) => `<span style="left:${(h - WIN.start) / WIN.hours * 100}%">${hm(h)}</span>`).join('');
    const desc = shield ? 'Description hidden (spoiler shield)' : 'Western Conference opener. Memphis lead by seven after two quarters.';
    return `${topbar({ sel: 'live', live: true })}
<div class="g-now">
  <span class="logo lg" style="width:64px;height:64px;font-size:20px">NBA</span>
  <div class="grow">
    <div class="row-flex" style="gap:12px"><span class="t-title">Grizzlies at Warriors</span>${liveP()}</div>
    <div class="row-flex" style="color:var(--a-text-2);font:500 15px/22px var(--a-font-text)">NBA League Pass 4${dot}US${dot}HD${dot}19:30${dot}22:00${dot}1h 19m left<span class="prog" style="width:110px;margin-left:14px"><i style="width:63%"></i></span></div>
    <div class="ellipsis" style="font:500 15px/22px var(--a-font-text);color:${shield ? 'var(--a-text-3)' : 'var(--a-text-2)'}">${shield ? ic('eyeOff', 'sm') : ''}${desc}</div>
  </div>
  <div class="t-cap" style="text-align:right;line-height:20px">OK tune<br>Hold OK favourite</div>
</div>
<div class="g-grid">
  <div class="g-ruler"><div class="g-corner"><span class="chip lg${groupFocus ? ' f-ring' : ''}">${ic('list')}Favourites first<span class="t-3" style="font-weight:500">10</span></span></div><div class="g-time"><span class="g-nowflag" style="left:0;top:2px">Now</span>${ticks}</div></div>
  ${rows.map((c, i) => row(c, i, { focusRow, focusCell: 0 })).join('')}
</div>`;
  }
  function groupSheet() {
    const rows = [['star', 'Favourites first', '10', 1], ['live', 'Live games', '3'], ['tv', 'Sports', '86'], ['tv', 'News', '41'], ['film', 'Movies', '120'], ['tv', 'UK', '212'], ['tv', 'All channels', '4,812']];
    return `<div class="scrim"></div><div class="sheet" style="left:0;right:auto;width:340px;border-left:0;border-right:1px solid var(--a-border)"><h3>Channel group</h3>
      <div class="t-cap" style="margin-top:-6px">This is also the zap ring in the player</div>
      ${rows.map(([i, t, n, on], k) => `<div class="lr${k === 1 ? ' f-ring' : ''}"><span class="rd${on ? ' on' : ''}"></span>${t}<small>${n}</small></div>`).join('')}</div>`;
  }
  function chooseSheet() {
    const rows = [['NBA League Pass 4', 'Grizzlies at Warriors on the guide', 'Best match'], ['ESPN', 'NBA Countdown, then Grizzlies', 'Guide'], ['NBA TV', 'Game Time', 'League'], ['TNT Sports 1', 'Lakers at Suns', 'Sports group']];
    return `<div class="scrim"></div><div class="menu" style="left:48px;top:96px;width:560px"><h3>Where is Grizzlies at Warriors?</h3>
      ${rows.map(([a, b, c], i) => `<div class="lr${i === 0 ? ' f-ring' : ''}" style="height:60px"><span class="logo sm">${a.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span><span class="grow">${a}<div class="t-cap" style="margin-top:0">${b}</div></span><small>${c}</small></div>`).join('')}
      <div class="t-cap" style="padding:8px 8px 2px">Your pick is remembered for this team.</div></div>`;
  }
  g.Live = { guide, groupSheet, chooseSheet };
})(window);
