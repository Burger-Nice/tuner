/* NBA hub (TV). shield:true = spoiler shield "My team": your game's score, leaders and linescore are hidden everywhere. */
(function (g) {
  'use strict';
  const { ic, liveP, dot, topbar, team, gameCard } = g.Kit, G = g.Mock.GAMES;
  function nba({ shield = false } = {}) {
    const order = [G[1], G[5], G[6], G[2], G[3], G[4]];
    const mid = shield
      ? `<span class="shield" style="margin-left:6px">${ic('eyeOff')}<span>Score hidden<small>Spoiler shield · My team</small></span></span>`
      : `<span class="score" style="margin-left:6px">77</span><span class="t-3" style="font:700 22px var(--a-font-display)">–</span><span class="score">70</span>`;
    const side = shield ? '' : `<table class="ls abs" style="left:530px;top:36px"><tr><th></th><th>1</th><th>2</th><th>3</th><th>4</th><th>T</th></tr>
    <tr><td>MEM</td><td>24</td><td>21</td><td>32</td><td class="dim">–</td><td class="t">77</td></tr><tr><td>GS</td><td>19</td><td>25</td><td>26</td><td class="dim">–</td><td class="t">70</td></tr></table>
  <div class="abs lead" style="left:530px;top:108px;width:190px"><b>G. Marshall</b> 24 pts, 7 reb</div>`;
    return `${topbar({ sel: 'nba', live: true })}
<div class="dayrow"><span class="t-head">NBA</span>
  <span class="row-flex" style="gap:8px;margin-left:12px"><span class="chip lg">${ic('chevL')}Sun 25</span><span class="chip lg sel">Today · Mon 26 Oct</span><span class="chip lg">Tue 27${ic('chevR')}</span></span>
  <span class="grow"></span>${shield ? `<span class="t-cap row-flex" style="gap:6px;margin-right:14px;color:var(--a-text-2)">${ic('eyeOff', 'sm')}Shield: My team</span>` : ''}<span class="t-cap">2 live${dot}2 upcoming${dot}3 final</span></div>
<div class="nba-hero">
  <div class="slab" style="left:742px;width:260px"></div><div class="slabline" style="left:722px"></div>
  <div class="abs row-flex" style="left:24px;top:14px;gap:12px"><span class="t-label" style="color:var(--a-pink-text)">Your team</span>${liveP()}<span class="t-label t-2">Q3${dot}7:29</span></div>
  <div class="matchup abs" style="left:24px;top:44px">
    <div class="mteam">${team('MEM', 'lg')}<div><div class="nm">Grizzlies</div><div class="rc">1-0</div></div></div>${mid}
    <div class="mteam"><div style="text-align:right"><div class="nm">Warriors</div><div class="rc">0-1</div></div>${team('GS', 'lg')}</div></div>${side}
  <div class="abs row-flex" style="left:24px;top:108px;gap:12px"><span class="btn">${ic('play', 'fill')}Watch live</span><span class="btn2">${shield ? 'Reveal score' : 'Box score'}</span>${shield ? '' : '<span class="btn2">Plays</span>'}</div>
</div>
<div class="abs rowtitle" style="left:48px;top:306px;font-size:20px">Tonight<small>7 games${dot}live first</small></div>
<div class="nba-grid">${order.map((gm, i) => gameCard(gm, { focus: i === 0 })).join('')}</div>`;
  }
  g.NBAHub = { nba };
})(window);
