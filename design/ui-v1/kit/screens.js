/* First run, Search, Saved, Account, Update, and the empty / error / loading states (TV). */
(function (g) {
  'use strict';
  const { ic, img, tag, liveP, dot, topbar, poster, wcard, team, BR } = g.Kit, M = g.Mock, by = g.Movies.byId;

  /* ---------- first launch and sign-in ---------- */
  const lockup = (h = 56) => `<img src="${BR}assets/lockup.svg" height="${h}" alt="airglow">`;   // gradient lockup: bg-0 only, 40 px and up
  function qr(size = 176) {
    const n = 25, c = size / n; let s = 7, rects = '';
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const finder = (x, y) => `<rect x="${x * c}" y="${y * c}" width="${7 * c}" height="${7 * c}" fill="#14101F"/><rect x="${(x + 1) * c}" y="${(y + 1) * c}" width="${5 * c}" height="${5 * c}" fill="#F3EFE6"/><rect x="${(x + 2) * c}" y="${(y + 2) * c}" width="${3 * c}" height="${3 * c}" fill="#14101F"/>`;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (!inF && rnd() > 0.52) rects += `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}" fill="#14101F"/>`;
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="12" fill="#F3EFE6"/><g transform="translate(${c * 1.5} ${c * 1.5}) scale(.88)">${rects}${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</g></svg>`;
  }
  const spinner = '<svg class="ic" viewBox="0 0 24 24" style="width:28px;height:28px;color:var(--a-pink)"><path d="M12 3a9 9 0 1 0 9 9" /></svg>';
  function welcome() {
    return `<div class="center-col" style="top:100px">${lockup(64)}
      <div class="t-head" style="margin-top:34px">Add your TV provider</div>
      <div class="t-body" style="margin-top:8px;width:520px;text-align:center">airglow plays the channels, films and series you already have. Typing on a remote is slow, so use your phone.</div>
      <div class="row-flex" style="gap:14px;margin-top:30px"><span class="btn f">${ic('mic')}Use your phone</span><span class="btn2">Type it here</span><span class="btn2">Load an M3U link</span></div></div>`;
  }
  function phone() {
    return `<div class="abs" style="left:48px;top:27px">${lockup(40)}</div>
      <div class="abs t-head" style="left:48px;top:96px">Send it from your phone</div>
      <div class="abs t-body" style="left:48px;top:140px;width:420px"><ol class="steps"><li>Scan the code, or open <b>192.168.1.23:8765</b> on a phone on the same Wi-Fi.</li><li>Paste your provider link, or type server, username and password.</li><li>Enter the code <b>4821</b> if asked, then tap Send.</li></ol></div>
      <div class="abs" style="left:560px;top:96px;width:352px;text-align:center"><div class="qrbox">${qr(176)}</div><div class="t-cap" style="margin-top:10px">http://192.168.1.23:8765 · code <b style="color:var(--a-text-1)">4821</b></div></div>
      <div class="abs card row-flex" style="left:48px;top:400px;width:864px;height:64px;padding:0 20px;gap:14px">${spinner}<div class="grow"><b style="font:650 16px/20px var(--a-font-text)">Waiting for your phone</b><div class="t-cap">Nothing leaves your home network</div></div><span class="btn2 sm f-ring">Type it here instead</span></div>`;
  }
  function typeIt() {
    const fld = (l, v, st = '') => `<div class="fld"><div class="fl">${l}</div><div class="field${st}">${v}</div></div>`;
    return `<div class="abs" style="left:48px;top:27px">${lockup(40)}</div>
      <div class="abs t-head" style="left:48px;top:96px">Type it here</div>
      <div class="abs" style="left:48px;top:150px;width:520px">
        ${fld('Provider link or server', '<span>http://line.provider.tv:8080/get.php?username=…</span>', ' ring')}
        <div class="t-cap" style="margin:-2px 0 12px">Paste a full get.php link and the rest fills in. OK opens the keyboard.</div>
        ${fld('Username', '<span class="ph">Username</span>')}${fld('Password', '<span class="ph">Password</span>')}</div>
      <div class="abs row-flex" style="left:48px;top:440px;gap:12px"><span class="btn">Sign in</span><span class="btn2">Back</span></div>
      <div class="abs card" style="left:620px;top:150px;width:292px;padding:16px"><b style="font:650 16px/22px var(--a-font-text)">Faster on your phone</b><div class="t-cap" style="margin-top:4px;line-height:20px">Scan a code and type with a real keyboard.</div><div style="margin-top:12px">${qr(104)}</div></div>`;
  }
  function verifying() {
    const row = (done, t, v) => `<div class="vrow">${done ? `<span class="okdot">${ic('check')}</span>` : spinner}<span class="grow">${t}</span><span class="t-cap">${v}</span></div>`;
    return `<div class="center-col" style="top:96px"><div class="t-head">Getting your provider ready</div>
      <div class="card" style="width:520px;margin-top:24px;padding:12px 20px">${row(1, 'Connected', 'line.provider.tv')}${row(1, 'Channels', '4,812')}${row(0, 'Movies', 'loading')}${row(0, 'Series', 'waiting')}</div>
      <div class="t-body" style="margin-top:18px">Home opens as soon as channels are in. The rest loads in the background.</div><span class="btn2 sm f-ring" style="margin-top:18px">Cancel</span></div>`;
  }
  function choices() {
    const t = (a, on) => `<span class="chip lg${on ? ' sel f-ring' : ''}">${a}</span>`;
    return `<div class="abs" style="left:48px;top:27px">${lockup(40)}</div>
      <div class="abs t-head" style="left:48px;top:82px">Three quick choices</div><div class="abs t-body" style="left:48px;top:120px">You can change all three in Account. Back skips.</div>
      <div class="abs" style="left:48px;top:160px;width:864px"><div class="t-label" style="margin-bottom:8px">Your team</div>
        <div class="chips">${t('Memphis Grizzlies', 1)}${t('Boston Celtics')}${t('Golden State Warriors')}${t('Los Angeles Lakers')}${t('New York Knicks')}${t('More teams')}${t('None')}</div>
        <div class="t-label" style="margin:16px 0 8px">Spoilers</div>
        <div class="chips">${t('Off')}${t('My team', 1).replace('f-ring', '')}${t('All games')}</div>
        <div class="t-cap" style="margin-top:8px">My team hides your team's score everywhere until you reveal it. Other games stay visible.</div>
        <div class="t-label" style="margin:16px 0 8px">Languages shown first</div>
        <div class="chips">${t('English', 1).replace('f-ring', '')}${t('Español')}${t('Français')}${t('Svenska')}${t('Nederlands')}</div></div>
      <div class="abs" style="left:48px;top:462px"><span class="btn">Done</span></div>`;
  }

  /* ---------- search ---------- */
  function search({ q = 'harb', focusKey = 'H', empty = false, none = false } = {}) {
    const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
    const kb = keys.map((k) => `<span class="key${k === focusKey ? ' f-ring' : ''}">${k}</span>`).join('');
    let res;
    if (empty) res = `<div class="t-label" style="margin-bottom:10px">Recent</div><div class="chips">${['grizzlies', 'harbor', 'nba tv', 'night circuit'].map((r) => `<span class="chip lg">${ic('clock')}${r}</span>`).join('')}</div>
      <div class="t-label" style="margin:24px 0 10px">Trending in English</div><div class="rail" style="padding:0;gap:16px;margin:0">${['m1', 'm6', 'm3', 'm13'].map((id) => poster(by(id)).replace('class="pc"', 'class="pc sm"')).join('')}</div>`;
    else if (none) res = `<div class="state" style="margin-top:34px"><div class="ico">${ic('search')}</div><b>No results for "xqzv"</b><p>Check the spelling, or try fewer letters. Search covers channels, programmes, movies, series and teams.</p><span class="btn2 sm">Clear</span></div>`;
    else res = `<div class="t-label" style="margin-bottom:8px">Top result</div>
      <div class="rrow" style="height:84px"><div class="mini2"><div class="art">${Art.art('m1', { style: 'sun', hue: 192 })}</div></div><div class="grow"><div class="t-sub" style="font-size:18px;line-height:24px">Harbor Lights</div><div class="t-cap">Movie${dot}2024${dot}2h 06m${dot}4K +3 versions</div></div><span class="btn sm">${ic('play', 'fill')}Play</span></div>
      <div class="t-label" style="margin:14px 0 8px">On TV</div>
      <div class="rrow"><span class="logo sm">B1</span><div class="grow"><div class="t-sub">Harbour Rescue</div><div class="t-cap">BBC One${dot}21:00 to 22:00</div></div></div>
      <div class="t-label" style="margin:14px 0 8px">Movies and series</div>
      <div class="rail" style="padding:0;gap:16px;margin:0">${['m11', 'm17'].map((id) => poster(by(id)).replace('class="pc"', 'class="pc sm"')).join('')}${poster(M.MOVIES[0]).replace('class="pc"', 'class="pc sm"')}</div>`;
    return `${topbar({ sel: 'search' })}
      <div class="abs" style="left:48px;top:90px;width:352px">
        <div class="sfield"><span class="micbtn">${ic('mic')}</span><span class="grow">${q ? `<b>${q.toUpperCase()}</b><i class="caret"></i>` : '<span class="ph">Channels, films, series, teams</span>'}</span></div>
        <div class="kb">${kb}</div>
        <div class="kbrow"><span class="key wide">Space</span><span class="key wide">Delete</span><span class="key wide">Clear</span></div></div>
      <div class="abs" style="left:432px;top:90px;width:480px">${res}</div>`;
  }

  /* ---------- Saved: reorder favourite channels (drives On now and the Favourites zap ring) ---------- */
  function saved({ reorder = true } = {}) {
    const C = M.CHANNELS, fav = [C[0], C[1], C[3], C[2], C[4]];
    const rows = fav.map((c, i) => `<div class="srow${i === 1 ? (reorder ? ' lift' : ' f-ring') : ''}"><span class="grip">${reorder && i === 1 ? ic('chevU', 'sm') + ic('chevD', 'sm') : '<i></i><i></i><i></i>'}</span><span class="num">${i + 1}</span><span class="logo">${c.ini}</span><div class="grow"><div class="t-sub">${c.name}</div><div class="t-cap">${c.tag}${dot}${c.q}${dot}${c.now.t}</div></div>${c.now.live ? '<span class="a-live">Live</span>' : ''}</div>`).join('');
    return `${topbar({ sel: 'saved' })}
      <div class="lib-head"><span class="t-head">Saved</span><span class="grow"></span><span class="chip lg sel">Channels<span class="n">5</span></span><span class="chip lg">Movies<span class="n">12</span></span><span class="chip lg">Series<span class="n">4</span></span><span class="chip lg">History</span></div>
      <div class="abs" style="left:48px;top:134px;width:560px"><div class="t-cap" style="margin-bottom:10px">${reorder ? '<b style="color:var(--a-text-1)">Move with Up and Down. OK drops it.</b> Back puts it back.' : 'OK plays. Hold OK to reorder.'}</div>${rows}</div>
      <div class="abs card" style="left:640px;top:134px;width:272px;padding:16px"><b style="font:700 18px/24px var(--a-font-display)">This order is used by</b><ul class="ul"><li>On now on Home</li><li>The Favourites guide group</li><li>Up and Down in the player when you tune from Favourites</li></ul></div>`;
  }

  /* ---------- Account ---------- */
  function account({ group = 'provider' } = {}) {
    const r = (t, v, st = '', sub = '') => `<div class="arow${st}"><span class="grow">${t}${sub ? `<div class="t-cap" style="margin-top:0">${sub}</div>` : ''}</span><span class="av">${v}</span></div>`;
    const groups = [['provider', 'Provider'], ['playback', 'Playback'], ['nba', 'NBA'], ['languages', 'Languages'], ['home', 'Home rows'], ['updates', 'Updates'], ['about', 'About']];
    const side = groups.map(([k, l]) => `<div class="gl${k === group ? ' sel' : ''}">${l}${k === 'updates' ? '<i class="udot s"></i>' : ''}</div>`).join('');
    let body;
    if (group === 'nba') body = `<div class="t-title" style="margin-bottom:10px">NBA</div>${r('Your team', 'Memphis Grizzlies ' + ic('chevR', 'sm'), ' f-ring')}
      ${r('Spoiler shield', 'My team ' + ic('chevR', 'sm'), '', 'Hides scores, leaders, records and finals everywhere until you reveal')}
      ${r('Score on picture', '<span class="onoff">Off</span><span class="tg"><i></i></span>')}
      ${r('Score delay', 'Per channel ' + ic('chevR', 'sm'), '', 'NBA League Pass 4: 42 s behind live')}`;
    else if (group === 'updates') body = `<div class="t-title" style="margin-bottom:10px">Updates</div>${r('Version', '1.5.2')}${r('airglow 1.6 is ready', '<span class="btn sm">Update now</span>', ' f-ring', 'Downloaded in the background. Installs at a quiet moment.')}${r('Check for updates', 'Last checked 20:12')}${r('Download automatically', '<span class="onoff">On</span><span class="tg on"><i></i></span>')}`;
    else body = `<div class="t-title" style="margin-bottom:10px">Provider</div>${r('line.provider.tv', '<span class="pill-ok">' + ic('check', 'sm') + 'Active</span>', ' f-ring', 'Expires 19 Nov · 24 days left')}${r('Connections', '1 of 2 in use')}${r('Switch account', 'Home · Holiday ' + ic('chevR', 'sm'))}${r('Add account', ic('plus', 'sm'))}${r('Refresh channels and guide', 'Updated 20:12')}${r('Sign out', ic('chevR', 'sm'))}`;
    return `${topbar({ sel: 'account', update: true })}<div class="abs" style="left:48px;top:90px;width:200px">${side}</div><div class="abs" style="left:272px;top:90px;width:640px">${body}</div>`;
  }

  /* ---------- Update prompt: a full-screen card at a natural break (cold launch), never over the player ---------- */
  function update() {
    return `<div class="center-col" style="top:110px"><div class="card" style="width:560px;padding:32px 32px 28px;text-align:center">${lockup(48)}
      <div class="t-head" style="margin-top:22px">airglow 1.6 is ready</div>
      <div class="t-body" style="margin-top:8px">The channel list in the player now shows what is on. Fixes for the guide on slow connections.</div>
      <div class="row-flex" style="gap:14px;margin-top:26px;justify-content:center"><span class="btn f">Update now</span><span class="btn2">Later</span></div>
      <div class="t-cap" style="margin-top:14px">Later asks again tomorrow. It never interrupts a game or the player.</div></div></div>`;
  }

  /* ---------- states ---------- */
  function loading() {
    const sk = (w, h, r = 12) => `<span class="skb" style="width:${w}px;height:${h}px;border-radius:${r}px"></span>`;
    return `${topbar({ sel: 'home', live: false, focus: 'tab:home' })}
      <div class="hero-plate" style="background:var(--a-surface-1)"><div class="abs" style="left:24px;top:24px">${sk(160, 22, 11)}</div><div class="abs" style="left:24px;top:64px">${sk(420, 40, 8)}</div><div class="abs" style="left:24px;top:124px">${sk(180, 44, 22)}</div></div>
      <div class="abs rowtitle" style="left:48px;top:272px">${sk(110, 24, 8)}</div>
      <div class="rail abs" style="top:308px;left:0">${[1, 2, 3, 4, 5].map(() => `<span class="skb" style="width:198px;height:111px;border-radius:16px;flex:none"></span>`).join('')}</div>
      <div class="abs rowtitle" style="left:48px;top:439px">${sk(190, 24, 8)}</div>
      <div class="rail abs" style="top:475px;left:0">${[1, 2, 3, 4, 5].map(() => `<span class="skb" style="width:198px;height:111px;border-radius:16px;flex:none"></span>`).join('')}</div>
      <div class="abs t-cap" style="right:48px;top:32px;display:none">Loading</div>`;
  }
  const stateCard = (icon, title, text, btn, extra = '') => `<div class="state big"><div class="ico">${ic(icon)}</div><b>${title}</b><p>${text}</p>${btn}${extra}</div>`;
  const offline = () => `${topbar({ sel: 'home', live: false })}<div class="center-col" style="top:150px">${stateCard('wifiOff', 'Can’t reach the server', 'Check that the TV is online, then try again. Your saved items and last guide are still here.', '<span class="btn f">Try again</span>', '<div class="t-cap" style="margin-top:12px">line.provider.tv · last reached 20:12</div>')}</div>`;
  const expired = () => `${topbar({ sel: 'home', live: false })}<div class="center-col" style="top:150px">${stateCard('info', 'This subscription has ended', 'The provider says the line expired on 19 Oct. Add another account, or renew with your provider and refresh.', '<span class="row-flex" style="gap:12px;justify-content:center"><span class="btn f">Switch account</span><span class="btn2">Refresh</span></span>')}</div>`;
  const empty = () => `${topbar({ sel: 'movies' })}${g.Movies.header({ title: 'Movies', count: '0 of 4,812', sort: 'Popular', filters: 3 })}${g.Movies.chips('All')}<div class="center-col" style="top:190px">${stateCard('sliders', 'Nothing matches these filters', 'Remove the last one, or clear them all to see every movie again.', '<span class="row-flex" style="gap:12px;justify-content:center"><span class="btn f">Remove “IMDb 7+”</span><span class="btn2">Clear all</span></span>')}</div>`;
  const noart = () => `${topbar({ sel: 'movies' })}${g.Movies.header({ title: 'Movies' })}${g.Movies.chips('All')}<div class="lib-grid" style="top:176px">${[M.MOVIES[18], M.MOVIES[19], Object.assign({}, M.MOVIES[0], { noart: true, t: 'Salt and Static 2021 WEB-DL', id: 'x1', vers: 2 }), Object.assign({}, M.MOVIES[3], { noart: true, id: 'x2' }), M.MOVIES[1], M.MOVIES[4]].map((m, i) => poster(m, { focus: i === 1 })).join('')}</div>`;
  g.Screens = { welcome, phone, typeIt, verifying, choices, search, saved, account, update, loading, offline, expired, empty, noart, qr, lockup };
})(window);
