/* Home (TV). Hero priority: your team (3 h before tip-off to 30 min after the final) > resume > last channel.
   variants: live (score at the synced delay) | shield (My team) | choose (no channel known) | pre (before tip-off) | resume (no game today) */
(function (g) {
  'use strict';
  const { ic, liveP, dot, topbar, wcard, liveCard, team, tag } = g.Kit, M = g.Mock;
  const rows = () => {
    const C = M.CHANNELS;
    const now = [C[2], C[1], C[3], C[9], C[5]].map((c) => liveCard(c)).join('');
    const cont = [
      wcard({ seed: 'm2', style: 'figure', hue: 14, title: 'The Long Take', meta: 'Film · 1h 17m left', prog: 28 }),
      wcard({ seed: 's1', style: 'city', hue: 262, title: 'Night Circuit', meta: 'S1 · E3 · 21 min left', prog: 58 }),
      wcard({ seed: 'm5', style: 'retro', hue: 276, title: 'Salt & Static', meta: 'Film · 18 min left', prog: 82 }),
      wcard({ seed: 's2', style: 'peaks', hue: 150, title: 'Signal Hill', meta: 'S3 · E2 · 44 min left', prog: 12 }),
      wcard({ seed: 'm7', style: 'forest', hue: 128, title: 'Glass Orchard', meta: 'Film · 1h 52m left', prog: 6 }),
    ].join('');
    return { now, cont };
  };
  function gameHero(v, nofocus) {
    const shield = v === 'shield', pre = v === 'pre', choose = v === 'choose';
    let status, mid, side = '';
    if (pre) {
      status = `<span class="t-label" style="color:var(--a-pink-text)">Your team</span><span class="t-label t-2">Tip-off 21:30${dot}in 49 min</span>`;
      mid = `<span class="score md" style="margin:0 8px">21:30</span>`;
    } else {
      status = `${liveP()}<span class="t-label t-2">NBA${dot}Q3${dot}7:29</span>`;
      mid = shield
        ? `<span class="shield">${ic('eyeOff')}<span>Score hidden<small>Spoiler shield · My team</small></span></span>`
        : `<span class="score" style="margin-left:6px">77</span><span class="t-3" style="font:700 22px var(--a-font-display)">–</span><span class="score">70</span>`;
      if (!shield) side = `<div class="abs lead" style="left:548px;top:44px;width:170px"><div class="t-label" style="margin-bottom:4px">Leaders</div><div><b>G. Marshall</b> 24 pts</div><div><b>T. Whitlock</b> 22 pts</div></div>${choose ? '' : `<span class="synced abs" style="left:548px;top:104px">${ic('clock')}Synced · 42 s behind live</span>`}`;
    }
    const rec = shield || pre ? ['1-0', '0-1'] : ['1-0', '0-1'];
    const primary = choose ? `${ic('search')}Choose channel` : pre ? `${ic('play', 'fill')}Watch pre-game` : `${ic('play', 'fill')}Watch live`;
    const secondary = shield ? 'Reveal score' : pre ? 'Preview' : 'Box score';
    const cap = choose ? 'No channel found yet<br>Your pick is remembered'
      : 'On NBA League Pass 4<br>Hold OK for 2 more channels';
    return `<div class="hero-plate">
  <div class="slab" style="left:742px;width:260px"></div><div class="slabline" style="left:722px"></div>
  <div class="abs row-flex" style="left:24px;top:14px;gap:12px">${pre ? '' : ''}${status}</div>
  <div class="matchup abs" style="left:24px;top:44px">
    <div class="mteam">${team('MEM', 'lg')}<div><div class="nm">Grizzlies</div><div class="rc">${rec[0]}</div></div></div>${mid}
    <div class="mteam"><div style="text-align:right"><div class="nm">Warriors</div><div class="rc">${rec[1]}</div></div>${team('GS', 'lg')}</div>
  </div>${side}
  <div class="abs row-flex" style="left:24px;top:112px;gap:12px"><span class="btn${nofocus ? '' : ' f'}">${primary}</span><span class="btn2">${secondary}</span><span class="t-cap" style="margin-left:8px;line-height:18px">${cap}</span></div>
</div>`;
  }
  function resumeHero() {
    return `<div class="hero-plate" style="background:var(--a-surface-1)">
  <div class="abs" style="right:0;top:0;width:420px;height:176px"><div class="art">${Art.art('s1', { style: 'city', hue: 262 })}</div><div class="abs" style="inset:0;background:linear-gradient(90deg,var(--a-surface-1),var(--scrim-0))"></div></div>
  <div class="abs t-label" style="left:24px;top:16px">Continue watching</div>
  <div class="abs" style="left:24px;top:34px;width:460px"><div class="t-head" style="font-size:30px;line-height:34px">Night Circuit</div>
   <div class="metaline" style="margin-top:4px;font-size:16px">S1 · E3${dot}21 min left${dot}${tag('4K', 'q')}</div>
   <div class="prog" style="width:300px;margin-top:10px"><i style="width:58%"></i></div></div>
  <div class="abs row-flex" style="left:24px;top:118px;gap:12px"><span class="btn f">${ic('play', 'fill')}Resume</span><span class="btn2">Start over</span><span class="btn2">Details</span></div>
</div>`;
  }
  function home({ v = 'live', shield = false, nofocus = false } = {}) {
    if (shield) v = 'shield';
    const { now, cont } = rows();
    const hero = v === 'resume' ? resumeHero() : gameHero(v, nofocus);
    const contHtml = v === 'resume' ? cont.replace(/<div class="wc"[^>]*>(?:(?!<div class="wc").)*?Night Circuit.*?<\/div><\/div>(?=<div class="wc")/s, '') : cont;
    return `${topbar({ sel: 'home', live: v !== 'resume' })}${hero}
<div class="abs rowtitle" style="left:48px;top:272px">On now</div>
<div class="rail abs" style="top:308px;left:0">${now}</div>
<div class="abs rowtitle" style="left:48px;top:439px">Continue watching</div>
<div class="rail abs" style="top:475px;left:0">${contHtml}</div>`;
  }
  g.Home = { home };
})(window);
