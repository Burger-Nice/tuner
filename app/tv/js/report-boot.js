// Error reports: start Sentry before any other app code runs (design/ui-v1/error-reports/SPEC.md D2, D8, D9). A classic
// script after vendor/sentry.js and report-scrub.js, before titles.js/core.js. Which address reports go to, first match
// wins: an injected override (CI's test builds: the fake ingest, or '' for off); a test build → off; the installed app
// (a native platform, or the packaged Windows app) → the real project; anything else (a browser, the local test server,
// `npm start`) → off. reports.js (ESM) gives the modules note(), screen() and problem().
(function () {
  'use strict';
  const W = window, S = W.Sentry, X = W.AirglowScrub;
  const cfg = Object.assign({}, W.TUNER_REPORTS || {}, (W.tuner && W.tuner.reports) || {});
  const settings = (() => { try { return JSON.parse(localStorage.getItem('tuner.settings') || '{}'); } catch { return {}; } })();
  const native = !!(W.Capacitor && W.Capacitor.isNativePlatform && W.Capacitor.isNativePlatform());
  const app = cfg.app || (W.TUNER_TARGET === 'phone' ? 'iphone' : W.TUNER_TARGET === 'tv' ? 'tv' : document.documentElement.classList.contains('desktop') ? 'windows' : 'tv');
  const dsn = cfg.dsn != null ? cfg.dsn : cfg.test ? '' : (native || cfg.packaged) ? (cfg.realDsn || '') : '';
  let screen = null, on = false;
  const caps = X && X.makeCaps(localStorage);
  const state = { app, dsn: !!dsn, test: !!cfg.test, on: () => on };
  W.AirglowReports = {
    state,
    setScreen: (s) => { screen = s; },
    // Turning reports on or off at once (Account › App); on only works where an address was chosen at start
    setOn: (v) => { if (!v && on) { on = false; try { S.close(0); } catch {} } else if (v && !on && dsn) start(); },
  };
  if (!S || !X || !dsn || settings.reportsOff) return;
  function start() {
    on = true;
    const ctx = { app, side: 'js', screen: () => screen, ua: navigator.userAgent };
    const nativeFetch = W.CapacitorWebFetch || W.fetch.bind(W);   // CapacitorHttp would otherwise route Sentry through native
    S.init({
      dsn,
      release: cfg.release ? `airglow@${cfg.release}` : undefined,
      dist: cfg.dist || undefined,
      environment: cfg.env || (cfg.test ? 'test' : 'dev'),
      defaultIntegrations: false,
      integrations: [S.globalHandlersIntegration(), S.dedupeIntegration(), S.linkedErrorsIntegration()],
      transport: (o) => S.makeFetchTransport(o, nativeFetch),
      sendClientReports: false,
      attachStacktrace: false,   // (a problem is a message, not an exception with a made-up stack)
      enhanceFetchErrorMessages: false,
      dataCollection: { userInfo: false },
      maxBreadcrumbs: 20,
      beforeBreadcrumb: (b) => (b && b.category === 'note' ? b : null),
      beforeSend: (event, hint) => {
        if (!on || navigator.onLine === false) return null;
        const out = X.prepare(event, hint, ctx);
        if (!out) return null;
        if (!cfg.test && !caps((out.fingerprint || []).join('|'))) return null;
        return out;
      },
    });
  }
  start();
})();
