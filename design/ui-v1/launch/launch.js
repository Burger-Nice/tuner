/* airglow launch controller. The animation itself is CSS (launch.css). This file only decides what to show:
   cold start  -> 820 ms lockup phase, then the wipe if Home is ready, otherwise hold ("loading", bands breathe) until it is
   warm resume -> nothing (Home straight away)
   reduced motion -> the static wedge, then a 120 ms fade when Home is ready. */
(function () {
  'use strict';
  const q = new URLSearchParams(location.search), app = document.getElementById('app'), body = document.body;
  const T_HOLD = 820, T_WIPE = 280;
  document.getElementById('home').innerHTML = Home.home({ v: 'live' });
  if (q.get('hud')) body.classList.add('hud-on');
  const hud = document.getElementById('hud');
  const readyMs = q.get('ready') === 'never' ? Infinity : +(q.get('ready') || 400);
  const t0 = performance.now();
  const homeReady = new Promise((res) => { if (readyMs !== Infinity) setTimeout(res, readyMs); });
  const reduce = q.get('rm') === '1' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const freeze = q.get('t');

  if (q.get('warm') === '1') { app.classList.add('warm'); return; }
  if (freeze != null) {                       // still frame at t ms, no timers
    const t = +freeze; app.style.setProperty('--t', t + 'ms');
    const css = document.createElement('style'); css.textContent = '.run *,.wiping *{animation-play-state:paused!important}'; document.head.appendChild(css);
    if (reduce) { app.classList.remove('run'); app.classList.add('rm'); return; }
    if (t >= T_HOLD) { app.classList.add('wiping'); app.style.setProperty('--w', (t - T_HOLD) + 'ms'); }
    if (q.get('loading') === '1') app.classList.add('loading');
    return;
  }
  if (reduce) {
    app.classList.remove('run'); app.classList.add('rm');
    homeReady.then(() => { app.classList.add('fading'); setTimeout(() => app.classList.add('done'), 120); });
    return;
  }
  function wipe() { app.classList.remove('loading'); app.classList.add('wiping'); setTimeout(() => { app.classList.add('done'); app.classList.remove('wiping'); }, T_WIPE); }
  setTimeout(() => {
    // the lockup phase is over; hold on a calm state until Home is ready
    let ready = false; homeReady.then(() => { ready = true; });
    Promise.race([homeReady, Promise.resolve('tick')]).then((v) => {
      if (v === 'tick' && !ready) { app.classList.add('loading'); homeReady.then(wipe); } else wipe();
    });
  }, T_HOLD);
  if (hud) setInterval(() => { hud.textContent = Math.round(performance.now() - t0) + ' ms'; }, 50);
  addEventListener('keydown', (e) => { if (e.key === 'r' || e.key === 'R') location.reload(); });
})();
