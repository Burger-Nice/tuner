/* Home (TV). Hero priority: your team (3 h before tip-off to 30 min after the final) > resume > last channel.
   variants: live (score at the synced delay) | shield (My team) | choose (no channel known) | pre (before tip-off) | resume (no game today)
   Game day: Continue watching sits ABOVE On now (resume is 2 presses: Down, OK). No game: On now first. */
(function (g) {
  'use strict';
  const { ic, liveP, dot, topbar, liveCard, contCard, team, tag } = g.Kit, M = g.Mock, Kit = g.Kit;
  const T = M.TEAMS;
  const cont = () => [
    { seed: 'm2', style: 'theatre', hue: 14, title: 'The Long Take', kind: 'Film', left: '1h 17m left', prog: 28 },
    { seed: 's1', style: 'tower', hue: 262, title: 'Night Circuit', kind: 'S1 · E3', left: '21 min left', prog: 58 },
    { seed: 'm5', style: 'retro', hue: 276, title: 'Salt & Static', kind: 'Film', left: '18 min left', prog: 82 },
    { seed: 's2', style: 'peaks', hue: 150, title: 'Signal Hill', kind: 'S3 · E2', left: '44 min left', prog: 12 },
    { seed: 'm7', style: 'forest', hue: 128, title: 'Glass Orchard', kind: 'Film', left: '1h 52m left', prog: 6 },
  ];
  const nowRow = (off) => [2, 1, 3, 9, 5].map((i) => liveCard(off ? Object.assign({}, M.CHANNELS[i], { now: Object.assign({}, M.CHANNELS[i].now, { live: false }) }) : M.CHANNELS[i])).join('');
  const side = (abbr, right) => { const t = T[abbr]; return `<div class="side${right ? ' r' : ''}" style="--tp:${t.p};--ta:${t.a};--tc:${Kit.textOn(t.p)}">${right ? '' : team(abbr, 'lg')}<div${right ? ' style="text-align:right"' : ''}><div class="nm">${t.n}</div><div class="rc">${right ? '0-1' : '1-0'}</div></div>${right ? team(abbr, 'lg') : ''}</div>`; };

  /* Slab (UI-SPEC 3.5). Default = the CLOCK PLATE (static gradient shape, ink text). v='preview' = the opt-in muted live preview: a plain rectangle of video,
     capped at 75% luminance, with the slant drawn on top by two static shapes; never a masked or clipped video. The time is shown once: if the slab carries it, the status row does not. */
  function gameHero(v, nofocus, o = {}) {
    const shield = v === 'shield', pre = v === 'pre', choose = v === 'choose', preview = v === 'preview';
    const slabClock = !preview && !pre;   // clock plate carries Q3 7:29 (live, shield, choose)
    const status = pre
      ? `<span class="t-label" style="color:var(--a-pink-text)">Your team</span><span class="t-label t-2">NBA${dot}Tip-off</span>`
      : `${liveP()}<span class="t-label t-2">NBA${slabClock ? '' : dot + 'Q3' + dot + '7:29'}</span>${shield || choose ? '' : `<span class="synced">${ic('clock')}Synced · 42 s behind live</span>`}`;
    const score = pre ? `<span class="score md">VS</span>`
      : shield ? `<span class="shield" style="height:44px;padding:0 12px;font-size:16px;gap:8px">${ic('eyeOff')}<span>Score hidden</span></span>`
      : `<span class="score">77</span><span class="t-3" style="font:700 22px var(--a-font-display)">–</span><span class="score">70</span>`;
    const primary = choose ? `${ic('search')}Choose channel` : pre ? `${ic('play', 'fill')}Watch pre-game` : `${ic('play', 'fill')}Watch live`;
    const secondary = shield ? 'Reveal score' : pre ? 'Preview' : choose ? 'Open guide' : 'Box score';
    const cap = choose ? 'No channel found yet<br>Your pick is remembered'
      : o.hub ? (shield ? 'On NBA League Pass 4<br>Hold OK for 2 more channels' : '<b style="color:var(--a-text-1);font-weight:650">G. Marshall</b> 24 pts<br><b style="color:var(--a-text-1);font-weight:650">T. Whitlock</b> 22 pts')
      : 'On NBA League Pass 4<br>Hold OK for 2 more channels';
    let slab;
    if (pre) slab = `<div class="slabfill"></div><div class="slabcontent ink"><span class="big">49 MIN</span><span class="cap">Tip-off 21:30</span></div>`;
    else if (preview) slab = `<div class="slabvid"><div class="art">${Art.art('arena-hero', { style: 'arena', hue: 28 })}</div><div class="scrimb"></div></div><div class="slabwedge"></div><div class="slabedge"></div><span class="pvlabel">Preview · muted</span>`;
    else slab = `<div class="slabfill"></div><div class="slabcontent ink"><span class="big">Q3</span><span class="big">7:29</span><span class="cap">${shield ? 'Score hidden' : choose ? 'Game clock' : 'Live · synced'}</span></div>`;
    return `<div class="hero-plate"${o.top ? ` style="top:${o.top}px"` : ''}>
  <div class="abs row-flex" style="left:24px;top:12px;gap:12px;height:24px">${o.hub ? `<span class="t-label" style="color:var(--a-pink-text)">Your team</span>` : ''}${status}</div>
  <div class="mt">${side('MEM')}<div class="sc">${score}</div>${side('GS', 1)}</div>
  <div class="abs row-flex" style="left:24px;top:132px;gap:16px"><span class="btn${nofocus ? '' : ' f'}">${primary}</span><span class="btn2">${secondary}</span>${o.hub && !shield ? '<span class="btn2">Plays</span>' : ''}<span class="t-cap" style="margin-left:4px;line-height:18px">${cap}</span></div>
  <div class="slabbox" style="left:619px;width:243px">${slab}</div>
</div>`;
  }
  function resumeHero(offline) {
    return `<div class="hero-plate"><div class="hero-art"><div class="art">${Art.art('s1', { style: 'tower', hue: 262, crop: [0, 52, 400, 150] })}</div><div class="abs" style="inset:0;background:linear-gradient(90deg,var(--a-surface-1),rgba(45,43,53,.15) 70%)"></div></div>
  <div class="abs t-label" style="left:24px;top:18px">Continue watching</div>
  <div class="abs" style="left:24px;top:40px;width:460px"><div class="t-head" style="font-size:30px;line-height:34px">Night Circuit</div>
   <div class="metaline" style="margin-top:4px;font-size:16px">S1 · E3${dot}21 min left${dot}${tag('4K', 'q')}</div>
   <div class="prog" style="width:300px;margin-top:10px"><i style="width:58%"></i></div></div>
  <div class="abs row-flex" style="left:24px;top:132px;gap:12px"><span class="btn${offline ? '' : ' f'}">${ic('play', 'fill')}Resume</span><span class="btn2">Start over</span><span class="btn2">Details</span></div>
</div>`;
  }
  const rowAt = (title, top, html, peek) => `<div class="abs rowtitle" style="left:48px;top:${top}px">${title}</div><div class="rail abs${peek ? ' peek' : ''}" style="top:${top + 36}px;left:0">${html}</div>`;
  function home({ v = 'live', shield = false, nofocus = false, notice = '', offline = false } = {}) {
    if (shield) v = 'shield';
    const game = v !== 'resume';
    const hero = game ? gameHero(v, nofocus) : resumeHero(offline);
    const C = cont(); const cc = (game ? C : C.filter((x) => x.title !== 'Night Circuit')).map((c) => contCard(c)).join('');
    const rows = game ? [['Continue watching', cc], ['On now', nowRow()]] : offline ? [['Continue watching', cc], ['Recent channels', nowRow(true)]] : [['On now', nowRow()], ['Continue watching', cc]];
    return `${topbar({ sel: 'home', live: game })}${hero}${offline ? rowAt(rows[0][0], 348, rows[0][1]) : rowAt(rows[0][0], 278, rows[0][1]) + rowAt(rows[1][0], 422, rows[1][1], true) + '<div class="edgefade"></div>'}${notice}`;
  }
  g.Home = { home, cont, gameHero };
})(window);
