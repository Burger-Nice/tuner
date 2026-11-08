// The error-report leak test in a browser (design/ui-v1/error-reports/SPEC.md §3): the TV app with the real Sentry SDK
// pointed at the fake ingest (tests/mock-sentry.js, :8791), planted secrets in its stores, then errors shaped to leak.
// Every byte that reached the fake ingest is searched for the secrets (raw, URI-encoded, \/-escaped, 6-character
// slices); it fails on any hit, or if a forced report never arrived.
// Run: tests/tv/serve.sh (the fake servers + the app on :8777), then node tests/tv/reports-leak.js
const { chromium } = require(process.env.PW || 'playwright');

const PASS = 'p@ss+Zq7#r9', USER = 'u-Hk29x', HOST = 'tv.examplepanel.net', M3UTOK = 'm3utok-Pq83Lz', RD = 'rdkey-Mx41Tq9', EMAIL = 'leak.test@example.com';
const LINK = `http://${HOST}:8080/live/${USER}/${encodeURIComponent(PASS)}/1234.ts`;
const ADDON = `https://torrentio.strem.fun/providers=yts|realdebrid=${RD}/manifest.json`;
const INGEST = 'http://127.0.0.1:8791';
const secrets = [PASS, USER, HOST, M3UTOK, RD, EMAIL];
const forms = (s) => [s, encodeURIComponent(s), JSON.stringify(s).slice(1, -1).replace(/\//g, '\\/'), ...(s.length >= 8 ? [...Array(s.length - 5).keys()].map((i) => s.slice(i, i + 6)).filter((x) => /[A-Za-z]/.test(x) && /\d/.test(x)) : [])];

(async () => {
  await fetch(`${INGEST}/_reset`);
  const b = await chromium.launch();
  const p = await b.newPage();
  const pageErrors = [];
  p.on('pageerror', (e) => pageErrors.push(e.message));
  await p.addInitScript(({ PASS, USER, HOST, M3UTOK, RD, EMAIL, ADDON }) => {
    window.TUNER_REPORTS = { app: 'tv', release: '0.0.0-test', env: 'test', test: true, dsn: 'http://k@127.0.0.1:8791/1' };
    if (!localStorage.getItem('leak-seeded')) {
      localStorage.setItem('leak-seeded', '1');
      localStorage.setItem('tuner.accounts', JSON.stringify([{ id: 'a1', name: 'Leak', type: 'xtream', server: `http://${HOST}:8080`, username: USER, password: PASS },
        { id: 'a2', name: 'M3U', type: 'm3u', url: `http://${HOST}/get.php?username=${USER}&password=${encodeURIComponent(PASS)}&token=${M3UTOK}` }]));
      localStorage.setItem('tuner.x:addons', JSON.stringify([{ transportUrl: ADDON, manifest: { id: 'com.stremio.torrentio', name: 'Torrentio' } }]));
      localStorage.setItem('tuner.x:stremio', JSON.stringify({ authKey: RD + 'xx', email: EMAIL }));
    }
  }, { PASS, USER, HOST, M3UTOK, RD, EMAIL, ADDON });
  await p.goto('http://127.0.0.1:8777/tv.html');
  await p.waitForFunction(() => window.AirglowReports?.state.on(), null, { timeout: 15000 });
  const forced = await p.evaluate(async ({ LINK, ADDON, PASS, USER, HOST, EMAIL }) => {
    const later = (f) => new Promise((r) => setTimeout(() => { try { f(); } catch {} r(); }, 50));
    let n = 0;
    // 1. a thrown Error whose message is a stream link (unhandled)
    await later(() => { n++; setTimeout(() => { throw new Error(`could not open ${LINK}`); }); });
    // 2. an unhandled rejection with a plain object holding the add-on link
    n++; Promise.reject({ addon: ADDON, email: EMAIL });
    // 3. a fetch to a dead host (its TypeError, unhandled)
    n++; fetch(`http://${HOST}.invalid:8080/player_api.php?username=${USER}&password=${encodeURIComponent(PASS)}`).then(() => {});
    // 4. JSON.parse of a body holding the password
    await later(() => { n++; setTimeout(() => JSON.parse(`{"user_info":{"password":"${PASS}"`)); });
    // 5. a thrown string
    await later(() => { n++; setTimeout(() => { throw `string with ${LINK}`; }); });   // eslint-disable-line no-throw-literal
    // 6. a play failure (a problem) and Send a report now, through the app's own module
    const R = await import('/tv/js/reports.js');
    R.note('play-failed', { http: 403, engine: 'exo', url: LINK });
    n++; R.problem('play-failed', { stage: 'start', what: 'live', source: 'm3u', channel: 'Sky Sports', url: LINK, http: 403 }, { key: 'start' });
    n++; R.sendNow({ cause: 'provider-down', liveFormat: 'ts', player: 'exo', extra: LINK });
    // 7. an AcctError-like error of ours whose message holds the email
    n++; window.Sentry.captureException(Object.assign(new window.AppError('slow_down', `too fast for ${EMAIL}`), { name: 'AcctError' }));
    return n;
  }, { LINK, ADDON, PASS, USER, HOST, EMAIL });
  await p.waitForTimeout(4000);
  const got = await (await fetch(`${INGEST}/_got`)).json();
  await b.close();
  const all = JSON.stringify(got);
  const hits = secrets.flatMap((s) => forms(s).filter((f) => all.includes(f)).map((f) => `${s} (as "${f}")`));
  if (/\/live\//.test(all)) hits.push('/live/');
  const events = got.filter((g) => /"type":"event"/.test(g.bytes)).length;
  console.log(`${got.length} envelopes, ${events} events, ${forced} forced`);
  for (const g of got) for (const line of g.bytes.split('\n')) if (/"exception"|"message"/.test(line)) {
    const e = JSON.parse(line); console.log('  ·', e.message || e.exception.values.map((v) => `${v.type}: ${v.value}`).join(' ← '), e.extra?.facts ? JSON.stringify(e.extra.facts) : '');
  }
  if (hits.length) { console.log('LEAK:', [...new Set(hits)].join(', ')); process.exit(1); }
  if (events < forced) { console.log(`MISSING: ${forced - events} forced reports never arrived`); process.exit(1); }
  console.log('no leaks');
})().catch((e) => { console.error(e); process.exit(1); });
