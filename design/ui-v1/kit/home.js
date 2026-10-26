/* Home (TV). shield:false = spotlight with the live score at the synced delay; shield:true = the spoiler shield (My team). */
(function (g) {
  'use strict';
  const { ic, tag, liveP, dot, topbar, wcard, liveCard, team } = g.Kit, M = g.Mock;
  function home({ shield = false } = {}) {
    const cont = [
      wcard({ seed: 'm2', style: 'figure', hue: 14, title: 'The Long Take', meta: 'Film · 1h 17m left', prog: 28 }),
      wcard({ seed: 's1', style: 'city', hue: 262, title: 'Night Circuit', meta: 'S1 · E3 · 21 min left', prog: 58 }),
      wcard({ seed: 'm5', style: 'retro', hue: 276, title: 'Salt & Static', meta: 'Film · 18 min left', prog: 82 }),
      wcard({ seed: 's2', style: 'peaks', hue: 150, title: 'Signal Hill', meta: 'S3 · E2 · 44 min left', prog: 12 }),
      wcard({ seed: 'm7', style: 'forest', hue: 128, title: 'Glass Orchard', meta: 'Film · 1h 52m left', prog: 6 }),
    ].join('');
    const C = M.CHANNELS;
    const now = [C[2], C[1], C[3], C[9], C[5]].map((c) => liveCard(c)).join('');
    const mid = shield
      ? `<span class="shield">${ic('eyeOff')}<span>Score hidden<small>Spoiler shield · My team</small></span></span>`
      : `<span class="score" style="margin-left:6px">77</span><span class="t-3" style="font:700 22px var(--a-font-display)">–</span><span class="score">70</span>`;
    const right = shield
      ? ''
      : `<div class="abs lead" style="left:548px;top:44px;width:170px"><div class="t-label" style="margin-bottom:4px">Leaders</div><div><b>G. Marshall</b> 24 pts</div><div><b>T. Whitlock</b> 22 pts</div></div>`;
    const sync = shield ? '' : `<span class="synced abs" style="left:548px;top:104px">${ic('clock')}Synced · 42 s behind live</span>`;
    return `${topbar({ sel: 'home', live: true })}
<div class="hero-plate">
  <div class="slab" style="left:742px;width:260px"></div><div class="slabline" style="left:722px"></div>
  <div class="abs row-flex" style="left:24px;top:14px;gap:12px">${liveP()}<span class="t-label t-2">NBA${dot}Q3${dot}7:29</span></div>${sync}
  <div class="matchup abs" style="left:24px;top:44px">
    <div class="mteam">${team('MEM', 'lg')}<div><div class="nm">Grizzlies</div><div class="rc">1-0</div></div></div>${mid}
    <div class="mteam"><div style="text-align:right"><div class="nm">Warriors</div><div class="rc">0-1</div></div>${team('GS', 'lg')}</div>
  </div>${right}
  <div class="abs row-flex" style="left:24px;top:112px;gap:12px"><span class="btn f">${ic('play', 'fill')}Watch live</span><span class="btn2">${shield ? 'Reveal score' : 'Box score'}</span><span class="t-cap" style="margin-left:8px;line-height:18px">On NBA League Pass 4<br>Hold OK for other channels</span></div>
</div>
<div class="abs rowtitle" style="left:48px;top:272px">On now</div>
<div class="rail abs" style="top:308px;left:0">${now}</div>
<div class="abs rowtitle" style="left:48px;top:439px">Continue watching</div>
<div class="rail abs" style="top:475px;left:0">${cont}</div>`;
  }
  g.Home = { home };
})(window);
