/* NBA hub (TV). Same broadcast graphic as the Home hero (team plates, slab = live preview / game clock), then tonight's games.
   shield:true = spoiler shield "My team": your game's score and leaders are hidden everywhere. */
(function (g) {
  'use strict';
  const { ic, dot, topbar, gameCard } = g.Kit, G = g.Mock.GAMES;
  function nba({ shield = false } = {}) {
    const order = [G[1], G[5], G[6], G[2], G[3], G[4]];
    return `${topbar({ sel: 'nba', live: true })}
<div class="dayrow"><span class="t-head">NBA</span>
  <span class="row-flex" style="gap:8px;margin-left:12px"><span class="chip lg">${ic('chevL')}Sun 25</span><span class="chip lg sel">Today · Mon 26 Oct</span><span class="chip lg">Tue 27${ic('chevR')}</span></span>
  <span class="grow"></span>${shield ? `<span class="t-cap row-flex" style="gap:6px;margin-right:14px;color:var(--a-text-2)">${ic('eyeOff', 'sm')}Shield: My team</span>` : ''}<span class="t-cap">2 live${dot}2 later${dot}3 final</span></div>
${g.Home.gameHero(shield ? 'shield' : 'live', true, { top: 128, hub: true })}
<div class="abs rowtitle" style="left:48px;top:332px;font-size:20px">Tonight<small>7 games${dot}live first</small></div>
<div class="nba-grid bleed" style="top:368px">${order.map((gm, i) => gameCard(gm, { focus: i === 0 })).join('')}</div>`;
  }
  g.NBAHub = { nba };
})(window);
