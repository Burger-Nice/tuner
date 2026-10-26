/* Native player overlays (Android, Media3). Drawn here as HTML so they can be measured, but every size is in dp
   (= CSS px on this 960 x 540 canvas, 2x on the panel) and every colour is a brand token, so each one maps to a plain
   Java view (FrameLayout, LinearLayout, TextView, ProgressBar, GradientDrawable). No blur, no gradients except the 4 dp progress.
   Panels use bg-1 at 92 to 94% over the video. Only one panel at a time; nothing covers the centre half except subtitles. */
(function (g) {
  'use strict';
  const { ic, liveP, dot, team } = g.Kit, M = g.Mock;
  const video = (seed = 'arena', style = 'arena', hue = 28) => `<div class="vid"><div class="art">${Art.art(seed, { style, hue })}</div></div>`;
  const hint = (items) => `<div class="nv-hint">${items.map(([k, t]) => `<span><span class="kbd">${k}</span>${t}</span>`).join('')}</div>`;
  const live = (items) => hint(items || [['OK', 'Channels'], ['◀', 'Options'], ['▶', 'Game'], ['▲ ▼', 'Zap'], ['Hold OK', 'Last']]);
  const hintChip = () => hint([['OK', 'Switch'], ['Back', 'Dismiss'], ['◀', 'Options'], ['▶', 'Game'], ['▲ ▼', 'Zap']]);

  /* banner: number, logo, name + now, progress, next, tags, LIVE. Feed count when the programme is a matched game. */
  function banner({ ring = 'Favourites · 3 of 10', game = true } = {}) {
    return `<div class="nv-banner"><span class="num">4</span><span class="logo" style="width:44px;height:44px">NL</span>
      <div class="grow"><div class="l1 ellipsis">NBA League Pass 4<span class="rg">${ring}</span></div><div class="l2 ellipsis">Grizzlies at Warriors${dot}19:30 to 22:00${game ? dot + 'Feed 1 of 3' : ''}</div></div>
      <div class="nx"><span class="prog" style="width:120px"><i style="width:63%"></i></span><span class="t-cap">Next 22:00 NBA Postgame</span></div>
      <span class="tag q">HD</span><span class="tag">CC</span>${liveP()}</div>`;
  }
  /* left channel panel (mini guide): group header, pinned team row, 5 rows of 52 so the panel clears the hint text */
  function channels({ focus = 2, pinned = true } = {}) {
    const C = M.CHANNELS, rows = [C[1], C[3], C[2], C[4], C[5]];
    const pg = (n) => Math.max(0, Math.min(100, ((M.NOW.mins / 60 - n.s) / (n.e - n.s)) * 100));
    const pin = pinned ? `<div class="nv-row pin"><span class="ico">${ic('pin', 'sm')}</span><span class="logo sm">${C[0].ini}</span><div class="grow"><div class="a">Grizzlies at Warriors</div><div class="b">NBA League Pass 4${dot}Your team</div></div>${liveP()}</div>` : '';
    return `<div class="nv-panel left" style="width:352px"><div class="nv-h"><span class="back">${ic('chevL', 'sm')}</span>Favourites<span class="n">3 of 10</span></div>${pin}
      ${rows.map((c, i) => `<div class="nv-row${i === focus ? ' f' : ''}${i === 0 ? ' cur' : ''}" style="height:52px"><span class="num">${c.n}</span><span class="logo sm">${c.ini}</span><div class="grow"><div class="a">${c.name}</div><div class="b">${c.now.t}</div></div>${c.now.live ? '<span class="a-live compact">Live</span>' : ''}<span class="prog" style="position:absolute;left:12px;right:12px;bottom:4px;height:3px"><i style="width:${pg(c.now)}%"></i></span></div>`).join('')}</div>`;
  }
  function groups() {
    const rows = [['Favourites', '10', 1], ['Live games', '3'], ['Sports', '86'], ['News', '41'], ['Movies', '120'], ['UK', '212'], ['All channels', '4,812']];
    return `<div class="nv-panel left" style="width:352px"><div class="nv-h">Groups<span class="n">sets the zap ring</span></div>${rows.map(([t, n, on], i) => `<div class="nv-row g${i === 1 ? ' f' : ''}"><span class="rd${on ? ' on' : ''}"></span><div class="grow"><div class="a">${t}</div></div><span class="t-cap">${n}</span></div>`).join('')}</div>`;
  }
  /* right game panel. state:
       watching  = you are on this game's channel: opening the panel IS the reveal, at the synced delay (no hidden state, nothing to un-hide)
       hidden    = shield on and you are NOT on this game's channel: no score, no points column, no Plays tab. OK closes. Reveal is a button you must move to.
       revealed  = the same panel after Reveal was pressed (this game, this session) */
  function gamePanel({ tab = 'MEM', state = 'watching', focus = 'tab' } = {}) {
    const full = [['Whitfield', '28', '14', '3', '6'], ['Marshall', '31', '24', '4', '7'], ['Okoye', '29', '12', '8', '2'], ['Ellison', '27', '10', '9', '1'], ['Vance', '24', '8', '11', '2'], ['Castillo', '18', '9', '2', '3'], ['Bright', '15', '0', '3', '1']];
    const hidden = state === 'hidden';
    const tabs = (hidden ? ['MEM', 'GS'] : ['MEM', 'GS', 'Plays']).map((t) => `<span class="${t === tab && focus === 'tab' ? 'on f-ring' : t === tab ? 'on' : ''}">${t}</span>`).join('') + (hidden ? '' : `<span class="act${focus === 'sync' ? ' f-ring' : ''}">${ic('refresh', 'sm')}Sync</span>`);
    const plate = hidden ? `<span class="plate"><span class="x"><span class="t-cap" style="color:var(--a-text-1)">Hidden</span></span></span>` : `<span class="plate"><span class="x"><span class="score sm" style="display:flex;gap:10px"><span>77</span><span style="opacity:.55">–</span><span>70</span></span></span></span>`;
    const head = hidden ? '<tr><th></th><th>MIN</th><th>REB</th><th>AST</th></tr>' : '<tr><th></th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th></tr>';
    const body = full.map((r) => `<tr><td>${r[0]}</td>${(hidden ? [r[1], r[3], r[4]] : r.slice(1)).map((v, k) => `<td${!hidden && k === 1 ? ' class="b"' : ''}>${v}</td>`).join('')}</tr>`).join('');
    const sub = hidden ? `<span style="display:inline-flex;gap:4px;align-items:center">${ic('eyeOff', 'sm')}Q3 7:29</span>` : `Q3 7:29${dot}<span style="display:inline-flex;gap:4px;align-items:center">${ic('clock', 'sm')}Synced · 42 s</span>`;
    return `<div class="nv-panel right" style="width:280px"><div class="nv-sc"><div class="tm">${team('MEM', 'md')}${plate}${team('GS', 'md')}</div>
      <div class="t-cap" style="display:flex;justify-content:center;align-items:center;gap:8px">${sub}</div></div>
      <div class="nv-tabs">${tabs}</div>
      <table class="nv-box">${head}${body}</table>
      ${hidden ? `<div class="nv-foot"><div class="t-cap" style="margin-bottom:8px">Spoiler shield: My team. Points, plays and the score stay hidden.</div><span class="btn2 sm${focus === 'reveal' ? ' f-ring' : ''}">Reveal score</span></div>` : `<div class="t-cap nv-foot">Back closes</div>`}</div>`;
  }
  function liveGames() {
    const G = M.GAMES.filter((x) => x.state === 'in');
    const rows = [G[0], G[1], M.GAMES[5]].map((gm, i) => {
      const A = M.TEAMS[gm.away], H = M.TEAMS[gm.home];
      return `<div class="nv-row${i === 0 ? ' f' : ''}" style="height:64px"><div class="grow"><div class="a">${A.n} at ${H.n}</div><div class="b">${gm.state === 'in' ? `Q${gm.q} ${gm.clock}` : 'In 49 min'}${gm.mine || gm.state !== 'in' ? '' : dot + gm.aw + '–' + gm.hw}${dot}${gm.tv[0]}</div></div>${gm.state === 'in' ? '<span class="a-live compact">Live</span>' : ''}</div>`;
    }).join('');
    return `<div class="nv-panel right" style="width:264px"><div class="nv-h">Live games<span class="n">OK switches</span></div>${rows}<div class="t-cap" style="padding:8px 10px">Your team is first and its score is hidden by the spoiler shield (My team). Other games show scores, as on the NBA hub.</div></div>`;
  }
  /* left sheets: options, radio lists, picture size, sync */
  function sheet(title, rows, { width = 320, focus = 0, foot = '' } = {}) {
    return `<div class="nv-panel left" style="width:${width}px"><div class="nv-h">${title}</div>${rows.map((r, i) => `<div class="nv-row g${i === focus ? ' f' : ''}${r.dis ? ' dis' : ''}">${r.radio !== undefined ? `<span class="rd${r.radio ? ' on' : ''}"></span>` : r.ic ? `<span class="ico">${ic(r.ic, 'sm')}</span>` : ''}<div class="grow"><div class="a">${r.t}</div>${r.s ? `<div class="b">${r.s}</div>` : ''}</div>${r.v ? `<span class="v">${r.v}${r.go ? ic('chevR', 'sm') : ''}</span>` : ''}</div>`).join('')}${foot ? `<div class="t-cap" style="padding:8px 10px">${foot}</div>` : ''}</div>`;
  }
  const options = (focus = 0, vod = false) => sheet('Options', vod
    ? [{ ic: 'cc', t: 'Subtitles', v: 'English', go: 1 }, { ic: 'audio', t: 'Audio', v: 'English 5.1', go: 1 }, { ic: 'pic', t: 'Picture size', v: 'Fit', go: 1 }, { ic: 'clock', t: 'Speed', v: '1×', go: 1 }, { ic: 'refresh', t: 'Match frame rate', v: 'Off' }]
    : [{ ic: 'refresh', t: 'Sync score', s: 'Match the game clock', v: '42 s', go: 1 }, { ic: 'tv', t: 'Other feeds for this game', s: 'ESPN, NBA TV', v: '2', go: 1 }, { ic: 'cc', t: 'Subtitles', v: 'Off', go: 1 }, { ic: 'audio', t: 'Audio', v: 'English', go: 1 }, { ic: 'pic', t: 'Picture size', s: 'This channel', v: 'Zoom', go: 1 }, { ic: 'star', t: 'Favourite this channel', v: 'Off' }, { ic: 'score', t: 'Score on picture', v: 'Off' }], { focus });
  const subs = () => sheet('Subtitles', [{ t: 'Off', radio: 0 }, { t: 'English', radio: 1 }, { t: 'English (SDH)', radio: 0 }, { t: 'Español', radio: 0 }, { t: 'Français', radio: 0 }, { t: 'Svenska', radio: 0 }], { focus: 2, foot: 'Remembered by language.' });
  const audio = () => sheet('Audio', [{ t: 'English', s: '5.1 · Dolby Digital', radio: 1 }, { t: 'Español', s: 'Stereo', radio: 0 }, { t: 'Commentary', s: 'English · Stereo', radio: 0 }], { focus: 1 });
  const nosubs = () => sheet('Options', [{ ic: 'cc', t: 'Subtitles', s: 'No subtitles in this file', dis: 1 }, { ic: 'audio', t: 'Audio', v: 'English', go: 1 }, { ic: 'pic', t: 'Picture size', v: 'Fit', go: 1 }], { focus: 1 });
  function picture() {
    const rows = [{ t: 'Fit', s: 'Whole picture, bars if needed', radio: 1 }, { t: 'Zoom', s: 'Fill the screen, crop the edges', radio: 0 }, { t: 'Stretch', s: 'Fill the screen, distort', radio: 0 }];
    return sheet('Picture size', rows, { focus: 1, foot: 'Saved for this channel. The picture changes as you move.' });
  }
  /* Sync: game-clock values only. No score, no team, no play text. The list starts at the clock for the stored delay (42 s); anything newer
     is collapsed behind one row, so nothing the delayed stream has not reached is on screen. After OK: "Synced · 38 s behind live". */
  function sync({ done = false } = {}) {
    const rows = [['Q3 8:31', 1], ['Q3 8:44'], ['Q3 9:05'], ['Q3 9:22']];
    return `<div class="nv-panel left" style="width:360px"><div class="nv-h">Match the clock</div>
      <div class="t-cap" style="padding:2px 10px 6px">Pick the game clock on the picture now. Only clocks are listed.</div>
      <div class="nv-row g dis" style="height:40px;color:var(--a-text-3)"><span class="ico">${ic('chevU', 'sm')}</span><div class="grow"><div class="a" style="font-weight:500;font-size:14px">Newer clocks hidden</div></div><span class="t-cap">3</span></div>
      ${rows.map(([c, cur], i) => `<div class="nv-row${i === 0 ? ' f' : ''}" style="height:52px"><div class="grow"><div class="a" style="font:700 20px/24px var(--a-font-text)">${c}</div></div>${cur ? '<span class="t-cap">Current setting</span>' : ''}</div>`).join('')}
      <div class="t-cap" style="padding:8px 10px">${done ? '' : 'Stored for NBA League Pass 4. Scores everywhere follow it.'}</div></div>`;
  }
  /* action chip: bg-1, never in the first 10 s after a tune, dismissed at 8 s / any other key / a panel. While it shows, the hint bar's OK reads "Switch". */
  function chip(sec = 6) {
    const r = 15, cc = 2 * Math.PI * r, off = cc * (1 - sec / 8);
    return `<div class="nv-chip"><svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="${r}" fill="none" stroke="#3D3B45" stroke-width="4"/><circle cx="20" cy="20" r="${r}" fill="none" stroke="#F95BAC" stroke-width="4" stroke-dasharray="${cc.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 20 20)"/>${sec <= 3 ? `<text x="20" y="25" text-anchor="middle" font-family="Inter Variable, Inter, sans-serif" font-weight="700" font-size="14" fill="#F3EFE6">${sec}</text>` : ''}</svg><div class="grow"><b>Grizzlies are live</b><span>NBA League Pass 4</span></div><span class="kbd" style="margin:0">OK</span><span class="t-cap" style="color:var(--a-text-1)">to switch</span></div>`;
  }
  const reconnect = () => `<div class="nv-card"><div class="row-flex" style="gap:12px"><svg class="ic" viewBox="0 0 24 24" style="width:26px;height:26px;color:var(--a-pink)"><path d="M12 3a9 9 0 1 0 9 9"/></svg><div class="t"><b>Reconnecting</b><span>Attempt 2 of 6</span></div></div></div>`;
  /* The feed died. A game channel offers the game's OTHER channels right here (no trip through Home, no scores anywhere on the card). */
  const failed = () => `<div class="nv-card" style="width:470px;align-items:stretch;gap:10px;padding:18px 18px 14px"><div class="t" style="text-align:left"><b>This feed stopped</b><span>Grizzlies at Warriors is also on</span></div>
      <div class="nv-row f" style="height:56px"><span class="logo sm">ES</span><div class="grow"><div class="a">ESPN</div><div class="b">Feed 2 of 3${dot}HD${dot}Best match</div></div><span class="a-live compact">Live</span></div>
      <div class="nv-row" style="height:56px"><span class="logo sm">NT</span><div class="grow"><div class="a">NBA TV</div><div class="b">Feed 3 of 3${dot}HD</div></div><span class="a-live compact">Live</span></div>
      <div class="row-flex" style="gap:10px;justify-content:space-between"><span class="btn2 sm">Try this feed again</span><span class="t-cap">Back closes</span></div></div>`;
  const failedPlain = () => `<div class="nv-card"><div class="t"><b>This channel stopped</b><span>Reconnected 6 times. The provider may be down.</span></div><div class="row-flex" style="gap:10px"><span class="btn sm f">Try again</span><span class="btn2 sm">Next channel</span></div></div>`;
  const zapcard = () => `<div class="nv-zap"><span class="logo lg">NBA</span><div><b>NBA League Pass 4</b><span>Grizzlies at Warriors</span></div></div>`;

  /* movies and episodes */
  /* movies and episodes. Focus rests on the seek thumb: left/right seek, OK pauses, Up reaches the button row, Down opens Options. */
  function vod({ scrub = false, upnext = false, controls = true, buttons = false } = {}) {
    const pct = scrub ? 62 : 52;
    const bar = controls ? `<div class="nv-vbar"><div class="row-flex" style="gap:10px;margin-bottom:12px"><span class="vb${buttons ? ' f' : ''}">${ic('play', 'fill')}</span><span class="vb t">−10</span><span class="vb t">+10</span><span class="btn2 sm" style="height:40px;padding:0 16px;gap:6px">${ic('chevR', 'sm')}Next episode</span><span class="grow"></span><span class="vb sm">${ic('cc')}</span><span class="vb sm">${ic('audio')}</span><span class="vb sm">${ic('pic')}</span></div>
        <div class="seek"><i style="width:${pct}%"></i><b class="${buttons ? '' : 'thumbf'}" style="left:${pct}%"></b>${scrub ? `<div class="bub" style="left:${pct}%">1:12:40</div>` : ''}</div><div class="row-flex t-cap" style="justify-content:space-between;margin-top:10px"><span>${scrub ? '1:12:40' : '28:44'}</span><span>-21:03</span></div></div>` : '';
    return `<div class="nv-vtop"><div><b>Night Circuit</b><span>S1 · E3 · Night Circuit</span></div><span class="t-cap" style="margin-left:auto">Ends at 22:14</span></div>${bar}
      ${upnext ? `<div class="nv-chip" style="bottom:${controls ? 176 : 64}px"><svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke="#3D3B45" stroke-width="4"/><circle cx="20" cy="20" r="15" fill="none" stroke="#F95BAC" stroke-width="4" stroke-dasharray="94.2" stroke-dashoffset="30" transform="rotate(-90 20 20)"/></svg><div class="grow"><b>Next episode in 7 s</b><span>S1 · E4 · The Relay</span></div><span class="kbd" style="margin:0">OK</span><span class="t-cap" style="color:var(--a-text-1)">play now</span></div>` : ''}`;
  }
  /* Score on picture: a 232 x 36 dp bug at top right inside the safe area. Sharp plate, team edges, Barlow digits. Hides while the banner shows.
     Under the shield it keeps the clock and drops the digits. Follows the synced delay. */
  function scorebug({ shield = false } = {}) {
    const T = M.TEAMS;
    return `<div class="nv-bug"><span class="bp"></span>
      <span class="bt" style="--c:${T.MEM.a}"><b>MEM</b>${shield ? '' : '<i>77</i>'}</span><span class="bt" style="--c:${T.GS.a}"><b>GS</b>${shield ? '' : '<i>70</i>'}</span><span class="bc">${shield ? ic('eyeOff', 'sm') : ''}Q3 7:29</span></div>`;
  }
  const subtitle = () => `<div class="nv-sub">I told you, the signal only shows up<br>when somebody is watching the game.</div>`;

  function scene(inner, { bg = ['arena', 'arena', 28], hintbar } = {}) {
    return `${video(...bg)}${inner}${hintbar || ''}`;
  }
  g.Player = { scene, banner, channels, groups, gamePanel, liveGames, options, subs, audio, nosubs, picture, sync, chip, reconnect, failed, failedPlain, zapcard, vod, scorebug, subtitle, hint, live, hintChip };
})(window);
