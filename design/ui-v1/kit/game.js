/* NBA game detail (TV). Header plate carries the only Sharp shapes; tables, plays and bars are upright Soft.
   tabs: box (your team) | opp | plays | team */
(function (g) {
  'use strict';
  const { ic, liveP, dot, topbar, team } = g.Kit;
  const MEM = [['Z. Whitfield', 'G', '28', '14', '3', '6', '5-11', '2-5', '+8', 1], ['G. Marshall', 'G', '31', '24', '4', '7', '9-15', '3-6', '+11', 1], ['J. Okoye', 'F', '29', '12', '8', '2', '5-9', '0-1', '+4', 1], ['D. Ellison', 'F', '27', '10', '9', '1', '4-8', '0-0', '+6', 1], ['M. Vance', 'C', '24', '8', '11', '2', '3-5', '0-0', '+3', 1],
    ['R. Castillo', 'G', '18', '9', '2', '3', '3-7', '2-4', '-1'], ['L. Bright', 'F', '15', '0', '3', '1', '0-3', '0-2', '-2'], ['T. Nakamura', 'G', '12', '0', '1', '2', '0-2', '0-1', '0']];
  const cols = ['MIN', 'PTS', 'REB', 'AST', 'FG', '3P', '+/-'];
  function table(rows, shield) {
    return `<table class="box"><thead><tr><th>Player</th>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>
      ${rows.map((r) => `<tr class="${r[9] ? 'st' : ''}"><td>${r[0]}<span class="pos">${r[1]}</span></td><td>${r[2]}</td><td class="b">${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6]}</td><td>${r[7]}</td><td>${r[8]}</td></tr>`).join('')}
      <tr class="tot"><td>Team</td><td>240</td><td class="b">77</td><td>38</td><td>15</td><td>29-61</td><td>7-19</td><td></td></tr></tbody></table>`;
  }
  function header(shield) {
    const mid = shield ? `<span class="shield" style="height:48px;padding:0 14px"><span style="font-size:16px">Score hidden</span></span>` : `<span class="score md">77</span><span class="t-3" style="font:700 20px var(--a-font-display)">–</span><span class="score md">70</span>`;
    return `<div class="gd-head">
      <div class="slab" style="left:760px;width:240px"></div><div class="slabline" style="left:742px"></div>
      <div class="abs row-flex" style="left:20px;top:10px;gap:10px">${liveP()}<span class="t-label t-2">Q3${dot}7:29</span>${shield ? '' : '<span class="synced">' + ic('clock') + 'Synced · 42 s behind live</span>'}</div>
      <div class="matchup abs" style="left:20px;top:34px;gap:10px">
        <div class="mteam">${team('MEM', 'md')}<div class="nm" style="font-size:20px">Grizzlies</div></div>${mid}
        <div class="mteam"><div class="nm" style="font-size:20px">Warriors</div>${team('GS', 'md')}</div></div>
      <div class="abs row-flex" style="left:520px;top:22px;gap:10px"><span class="btn sm">${ic('play', 'fill')}Watch live</span>${shield ? '<span class="btn2 sm">Reveal score</span>' : ''}</div>
    </div>`;
  }
  function tabs(sel) {
    const t = [['box', 'Grizzlies'], ['opp', 'Warriors'], ['plays', 'Plays'], ['team', 'Team stats']];
    return `<div class="gd-tabs">${t.map(([k, l]) => `<span class="chip lg${k === sel ? ' sel f-ring' : ''}">${l}</span>`).join('')}<span class="t-cap" style="margin-left:auto">Right and Left change tab</span></div>`;
  }
  function plays() {
    const P = [['Q3 7:29', 'MEM', 'G. Marshall makes 3-pt jump shot (D. Ellison assists)', '77–70', 1], ['Q3 7:52', 'GS', 'T. Whitlock makes driving layup', '74–70', 1], ['Q3 8:10', 'MEM', 'M. Vance defensive rebound', '', 0], ['Q3 8:14', 'GS', 'T. Whitlock misses 3-pt jump shot', '', 0], ['Q3 8:31', 'MEM', 'Z. Whitfield makes free throw 2 of 2', '74–68', 1], ['Q3 8:31', 'MEM', 'Z. Whitfield makes free throw 1 of 2', '73–68', 1], ['Q3 8:44', 'GS', 'Personal foul on K. Sloan', '', 0]];
    return `<div class="plays">${P.map(([c, t, x, s, sc]) => `<div class="play"><span class="ck">${c}</span><span class="tm">${t}</span><span class="tx${sc ? ' sc' : ''}">${sc ? '<i></i>' : ''}${x}</span><span class="sco">${s}</span></div>`).join('')}</div>`;
  }
  function teamStats() {
    const S = [['Field goal %', 47.5, 43.1, '47.5', '43.1'], ['3-point %', 36.8, 31.6, '36.8', '31.6'], ['Rebounds', 38, 33, '38', '33'], ['Turnovers', 9, 13, '9', '13'], ['Fast-break points', 14, 8, '14', '8']];
    return `<div class="tstats">${S.map(([n, a, b, as, bs]) => { const t = a + b; return `<div class="ts"><span class="v l">${as}</span><div class="bars"><div class="bar l" style="width:${a / t * 100}%"></div><div class="bar r" style="width:${b / t * 100}%"></div></div><span class="v">${bs}</span><span class="n">${n}</span></div>`; }).join('')}</div>`;
  }
  function game({ tab = 'box', shield = false } = {}) {
    let body;
    if (shield) body = `<div class="state" style="margin:36px auto 0;width:520px;text-align:center"><div class="ico">${ic('eyeOff')}</div><b>Box score is hidden</b><p>The spoiler shield covers your team's games. Reveal it for this game, this session.</p><span class="btn f">Reveal score</span></div>`;
    else if (tab === 'plays') body = plays();
    else if (tab === 'team') body = teamStats();
    else body = table(MEM, shield);
    return `${topbar({ sel: 'nba', live: true })}${header(shield)}${shield ? tabs('box').replace('sel f-ring', '') : tabs(tab)}<div class="gd-body">${body}</div>`;
  }
  g.Game = { game };
})(window);
