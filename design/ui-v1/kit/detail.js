/* Detail pages (TV): movie (play / resume, version pill, subtitles pill) and series (episodes). */
(function (g) {
  'use strict';
  const { ic, tag, dot, star, wcard } = g.Kit, M = g.Mock, by = g.Movies.byId;
  function movie({ resume = false, versions = true, focus = 'play' } = {}) {
    const m = M.MOVIES[0];
    const more = ['m6', 'm11', 'm14', 'm12', 'm8'].map(by).map((x) => wcard({ seed: x.id, style: x.style, hue: x.hue, title: x.t, meta: x.y + ' · ' + x.g[0], w: 198, h: 111 })).join('');
    const f = (k) => (focus === k ? ' f-ring' : '');
    const play = resume
      ? `<span class="btn${focus === 'play' ? ' f' : ''}">${ic('play', 'fill')}Resume 1:12:40</span><span class="btn2${f('restart')}">${ic('restart')}Start over</span>`
      : `<span class="btn${focus === 'play' ? ' f' : ''}">${ic('play', 'fill')}Play</span>`;
    /* full-bleed backdrop (the provider's TMDB art; here a stand-in), flat scrims, and a column that FLOWS: nothing is positioned by hand below the title */
    return `<div class="d-back"><div class="art">${Art.art(m.id, { style: m.style, hue: m.hue, crop: [0, 96, 400, 225] })}</div><div class="d-scrim"></div></div>
<div class="d-scrim2"></div>
<div class="d-col">
  <div class="t-label t-2">Movie${dot}${m.g.join(' · ')}</div>
  <div class="t-display" style="margin-top:6px">${m.t}</div>
  <div class="metaline" style="margin-top:10px">${star(m.r)}${dot}<span>${m.y}</span>${dot}<span>${m.rt}</span>${dot}${tag('4K', 'q')}${tag('HDR', 'q')}${tag('EN')}</div>
  <div class="t-body clamp2" style="margin-top:12px;width:460px">${m.plot}</div>
  <div class="t-cap ellipsis" style="margin-top:8px;width:500px">Directed by <span class="t-2">${m.dir}</span>${dot}<span class="t-2">${m.cast}</span></div>
  <div class="row-flex" style="gap:12px;margin-top:20px;height:44px;padding-left:2px">${play}<span class="btn2${f('save')}">${ic('saved')}Save</span></div>
  <div class="row-flex" style="gap:10px;margin-top:12px;height:36px">${versions ? `<span class="pillbtn${f('version')}">${ic('film')}English · 4K HDR ${ic('chevD')}</span>` : ''}<span class="pillbtn${f('subs')}">${ic('cc')}Subtitles: English</span>${resume ? '<span class="t-cap">54 min left</span>' : ''}</div>
</div>
<div class="abs rowtitle" style="left:48px;top:392px;font-size:20px">More like this</div>
<div class="rail abs" style="top:428px;left:0">${more}</div>`;
  }
  function versionSheet() {
    const rows = [['English', '4K HDR', 'EN, FR, ES subs', '18.4 GB', 1], ['English', '4K', 'EN subs', '14.1 GB'], ['English', 'Full HD', 'Multi-sub', '6.2 GB'], ['French', 'Full HD', 'FR audio, EN subs', '5.8 GB']];
    return `<div class="scrim"></div><div class="menu" style="left:48px;top:150px;width:520px"><h3>Version</h3>
      ${rows.map(([l, q, s, z, on], i) => `<div class="lr${i === 1 ? ' f-ring' : ''}" style="height:56px"><span class="rd${on ? ' on' : ''}"></span><span class="grow">${l}${dot}${q}<div class="t-cap" style="margin-top:0">${s}</div></span><small>${z}</small></div>`).join('')}
      <div class="t-cap" style="padding:8px 8px 2px">Default: your language at the best quality this TV decodes. Remembered per title.</div></div>`;
  }
  function series({ focusEp = 2, season = 1 } = {}) {
    const s = M.SERIES[0], E = M.EPISODES;
    const styles = ['rings', 'city', 'sun', 'waves', 'peaks', 'retro', 'forest', 'figure'];
    const eps = E.map((e, i) => `<div class="ep${e.done ? ' done' : ''}"><div class="th${i === focusEp ? ' f' : ''}"><div class="art">${Art.art('nc-ep' + e.n, { style: styles[i % 8], hue: 262 + i * 9 })}</div><span class="num">${e.n}</span>${e.done ? '<span class="chk">' + ic('check') + '</span>' : ''}${e.prog ? '<div class="prog flush"><i style="width:' + e.prog + '%"></i></div>' : ''}</div><div class="eb"><b>${e.t}</b><span>${e.prog ? '21 min left' : e.rt}</span></div></div>`).join('');
    const fe = E[focusEp];
    return `<div class="d-back"><div class="art">${Art.art(s.id, { style: s.style, hue: s.hue, crop: [0, 40, 400, 225] })}</div><div class="d-scrim"></div></div>
<div class="d-scrim2" style="height:300px"></div>
<div class="d-col" style="top:32px">
  <div class="t-label t-2">Series${dot}${s.g.join(' · ')}</div>
  <div class="t-display" style="margin-top:6px">${s.t}</div>
  <div class="metaline" style="margin-top:8px">${star(s.r)}${dot}<span>${s.y}</span>${dot}<span>${s.seasons} seasons</span>${dot}${tag(s.rating)}${tag('4K', 'q')}${tag('EN')}</div>
  <div class="t-body clamp2" style="margin-top:10px;width:470px">${s.plot}</div>
  <div class="row-flex" style="gap:12px;margin-top:16px;height:44px"><span class="btn">${ic('play', 'fill')}Resume S1 · E3</span><span class="btn2">${ic('saved')}Save</span><span class="pillbtn">${ic('cc')}Subtitles: English</span></div>
</div>
<div class="abs seas" style="left:48px;top:272px"><span class="chip lg sel">Season 1</span><span class="chip lg">Season 2</span><span class="t-cap" style="align-self:center;margin-left:8px">8 episodes</span></div>
<div class="rail abs" style="top:318px;left:0">${eps}</div>
<div class="abs epsyn" style="left:48px;top:486px;width:864px"><b>E${fe.n} · ${fe.t}</b>${dot}${fe.plot}</div>`;
  }
  g.Detail = { movie, versionSheet, series };
})(window);
