/* airglow launch controller. The animation itself is CSS (launch.css). This file only decides what to show:
   cold start      -> 820 ms lockup phase, then the wipe if Home is ready, otherwise hold ("loading", bands breathe) until it is
   hold escalation -> 4 s: caption "Connecting to your provider..."   12 s: cached Home + slim offline notice, or (nothing cached) the offline card
   warm resume     -> nothing (Home straight away)
   reduced motion  -> the static wedge, then a 120 ms fade when Home is ready.
   Input: keys are accepted from the moment the wipe starts (820 ms), never earlier, never after. */
(function () {
  'use strict';
  const q = new URLSearchParams(location.search), app = document.getElementById('l-app'), body = document.body;
  const T_HOLD = 820, T_WIPE = 280, T_SLOW = 4000, T_OFF = 12000;
  const hasCache = q.get('cache') !== '0';
  document.getElementById('l-home').innerHTML = Home.home({ v: 'live' });
  const ic = Kit.ic;
  document.getElementById('l-offcard').innerHTML = `<div class="state big"><div class="ico">${ic('wifiOff')}</div><b>Can’t reach the server</b><p>The first start needs a connection. Check that the TV is online, then try again.</p><span class="btn f">Try again</span><div class="t-cap" style="margin-top:12px">line.provider.tv · no answer for 12 s</div></div>`;
  if (q.get('hud')) body.classList.add('l-hud-on');
  const hud = document.getElementById('l-hud');
  const readyMs = q.get('ready') === 'never' ? Infinity : +(q.get('ready') || 400);
  const t0 = performance.now();
  const homeReady = new Promise((res) => { if (readyMs !== Infinity) setTimeout(res, readyMs); });
  const reduce = q.get('rm') === '1' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const freeze = q.get('t');

  if (q.get('warm') === '1') { app.classList.add('l-warm'); return; }
  if (freeze != null) {                       // still frame at t ms, no timers
    const t = +freeze; app.style.setProperty('--t', t + 'ms');
    const css = document.createElement('style'); css.textContent = '.l-run *,.l-wiping *{animation-play-state:paused!important}.l-cap,.l-offcard,.l-offcard *{animation:none!important}'; document.head.appendChild(css);
    if (reduce) { app.classList.remove('l-run'); app.classList.add('l-rm'); return; }
    if (t >= T_HOLD) { app.classList.add('l-wiping'); app.style.setProperty('--w', (t - T_HOLD) + 'ms'); }
    if (q.get('loading') === '1') app.classList.add('l-loading');
    const st = q.get('state');
    if (st === 'slow') app.classList.add('l-loading', 'l-slow');
    if (st === 'off') app.classList.add('l-loading', 'l-slow', 'l-off');
    return;
  }
  if (reduce) {
    app.classList.remove('l-run'); app.classList.add('l-rm');
    homeReady.then(() => { app.classList.add('l-fading'); setTimeout(() => app.classList.add('l-done'), 120); });
    return;
  }
  function wipe(notice) { app.classList.remove('l-loading', 'l-slow'); app.classList.add('l-wiping'); window.__inputOpen = true; setTimeout(() => { app.classList.add('l-done'); app.classList.remove('l-wiping'); }, T_WIPE); }
  setTimeout(() => {
    let ready = false; homeReady.then(() => { ready = true; });
    Promise.race([homeReady, Promise.resolve('tick')]).then((v) => {
      if (v === 'tick' && !ready) {
        app.classList.add('l-loading');
        homeReady.then(() => { if (!app.classList.contains('l-done')) wipe(); });
        setTimeout(() => { if (!ready) app.classList.add('l-slow'); }, T_SLOW - T_HOLD);
        setTimeout(() => {
          if (ready) return;
          if (hasCache) { document.getElementById('l-home').innerHTML = Screens.offline(); wipe(); }   // cached Home + the slim notice
          else app.classList.add('l-off');
        }, T_OFF - T_HOLD);
      } else wipe();
    });
  }, T_HOLD);
  if (hud) setInterval(() => { hud.textContent = Math.round(performance.now() - t0) + ' ms'; }, 50);
  addEventListener('keydown', (e) => { if (e.key === 'r' || e.key === 'R') location.reload(); });
})();
