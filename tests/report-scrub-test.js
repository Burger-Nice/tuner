// The error-report scrub (app/tv/js/report-scrub.js, design/ui-v1/error-reports/SPEC.md §3): events shaped like the ones
// Sentry's browser SDK makes, with real-shaped secrets planted in every field; none may survive, and frames, types,
// line numbers and our own codes must. Run: node tests/report-scrub-test.js (exit 1 on a failure). No dependencies.
const S = require('../app/tv/js/report-scrub.js');
const { AppError, prepare } = S;

const PASS = 'p@ss+Zq7#r9', USER = 'u-Hk29x', HOST = 'tv.examplepanel.net', M3UTOK = 'm3utok-Pq83Lz', RD = 'rdkey-Mx41Tq9';
const EMAIL = 'birgir.test@example.com';
const SECRETS = [PASS, encodeURIComponent(PASS), USER, HOST, M3UTOK, RD, EMAIL, 'examplepanel', '/live/', 'Zq7#r9', 'Mx41Tq9', 'Hk29x'];
const LINK = `http://${HOST}:8080/live/${USER}/${encodeURIComponent(PASS)}/1234.ts`;

let fails = 0, n = 0;
const ok = (cond, what) => { n++; if (!cond) { fails++; console.log('FAIL', what); } };
const leaks = (out, what) => {
  const s = JSON.stringify(out);
  const hit = SECRETS.filter((x) => s.includes(x) || s.includes(JSON.stringify(x).slice(1, -1)));
  ok(!hit.length, `${what}: leaked ${hit.join(', ')}`);
  return s;
};
const frame = (file, fn, line) => ({ filename: file, abs_path: file, function: fn, lineno: line, colno: 5, in_app: true });
const ev = (type, value, orig, extra = {}) => ({
  event_id: 'abc123', timestamp: 1, level: 'error', platform: 'javascript', release: 'airglow@0.4.130', dist: 'abc1234', environment: 'production',
  exception: { values: [{ type, value, mechanism: { type: 'onerror', handled: false }, stacktrace: { frames: [frame('https://localhost/tv/js/player.js?v=1', 'play', 41), frame(`${LINK}?x=1`, 'evil', 2)] } }] },
  request: { url: LINK, headers: { 'User-Agent': 'x' } }, user: { id: USER, ip_address: '1.2.3.4' }, server_name: 'BIRGIR-PC',
  contexts: { culture: { locale: 'is' }, trace: { trace_id: 'deadbeefdeadbeefdeadbeefdeadbeef' } },
  extra: { __serialized__: { url: LINK, password: PASS } },
  breadcrumbs: [{ category: 'fetch', data: { url: LINK } }, { category: 'console', message: `GET ${LINK}` },
    { category: 'note', message: 'play-failed', data: { http: 403, engine: 'exo', url: LINK, what: 'live' } }],
  tags: { screen: 'live' },
  ...extra,
});
const ctx = { app: 'tv', side: 'js', screen: () => 'live', ua: 'Mozilla/5.0 (Linux; Android 14; 55OLED810/12 Build/UTT3.240625.001; wv) AppleWebKit/537.36 Chrome/141 Mobile Safari/537.36' };

// 1. a foreign Error whose message is the full stream link: type only
{
  const e = new Error(`Could not open ${LINK}`);
  const out = prepare(ev('Error', e.message, e), { originalException: e }, ctx);
  leaks(out, 'foreign Error with a link');
  ok(out.exception.values[0].value === 'Error', 'foreign Error keeps its type only');
  ok(out.exception.values[0].stacktrace.frames[0].filename === 'app:///tv/js/player.js', 'own frame path normalised, query dropped');
  ok(out.exception.values[0].stacktrace.frames[0].lineno === 41 && out.exception.values[0].stacktrace.frames[0].in_app, 'line number and in_app kept');
  ok(out.exception.values[0].stacktrace.frames[1].filename === '<link>', 'foreign frame path blanked');
  ok(!out.request && !out.user && !out.server_name && !out.extra, 'request, user, server_name and extra dropped');
  ok(out.breadcrumbs.length === 1 && out.breadcrumbs[0].data.http === 403 && !('url' in out.breadcrumbs[0].data), 'only our note, with schema facts');
  ok(out.contexts.os.name === 'Android' && out.contexts.os.version === '14' && out.contexts.device.model === '55OLED810/12', 'device from the user agent');
  ok(out.fingerprint[1] === 'app:///tv/js/player.js:play', 'fingerprint is type + top in-app frame');
  ok(out.tags.app === 'tv' && out.tags.screen === 'live', 'tags');
}
// 2. our own errors send their code only, never their message
{
  const e = new AppError('wrong-login', `Wrong username or password for ${USER} at ${HOST}`);
  const out = prepare(ev('AppError', e.message, e), { originalException: e }, ctx);
  leaks(out, 'AppError');
  ok(out.exception.values[0].value === 'wrong-login' && out.exception.values[0].type === 'AppError', 'AppError sends its code');
  class AcctError extends AppError { constructor(code, status) { super(code, `Server says ${EMAIL} is wrong`, status); this.name = 'AcctError'; } }
  const a = new AcctError('slow_down', 429);
  const o2 = prepare(ev('AcctError', a.message, a), { originalException: a }, ctx);
  leaks(o2, 'AcctError');
  ok(o2.exception.values[0].value === 'slow_down', 'AcctError sends its code, not its message');
  const bad = new AppError(`${USER}@${HOST}/x`, 'x');
  ok(prepare(ev('AppError', 'x', bad), { originalException: bad }, ctx).exception.values[0].value === 'other', 'a code that is not code-shaped becomes other');
}
// 2b. Stremio's own words stay on screen; the report says stremio-<code>
{
  const e = Object.assign(new AppError('stremio-2', `No account for ${EMAIL}`), { code: 2, report: 'stremio-2' });
  const out = prepare(ev('AppError', e.message, e), { originalException: e }, ctx);
  leaks(out, 'Stremio error');
  ok(out.exception.values[0].value === 'stremio-2', 'Stremio error reports stremio-<code>');
}
// 3. a Capacitor plugin rejection with a code and a link in its message: type only
{
  class CapacitorException extends Error { constructor(m, code) { super(m); this.code = code; this.name = 'CapacitorException'; } }
  const e = new CapacitorException(`Bad playlist: Value <html> at ${LINK} of type java.lang.String cannot be converted`, 'ERR');
  const out = prepare(ev('CapacitorException', e.message, e), { originalException: e }, ctx);
  leaks(out, 'CapacitorException');
  ok(out.exception.values[0].value === 'CapacitorException', 'plugin rejection keeps its type only');
}
// 4. parser and network errors quoting fragments of secrets
{
  const j = new SyntaxError(`Unexpected token 'p', "...rd":"${PASS.slice(2, 9)}..." is not valid JSON`);
  const o = prepare(ev('SyntaxError', j.message, j), { originalException: j }, ctx);
  leaks(o, 'JSON.parse fragment');
  ok(o.exception.values[0].value === 'json', 'JSON SyntaxError becomes json');
  const u = new TypeError(`"${LINK}" is not a valid URL.`);
  const o2 = prepare(ev('TypeError', u.message, u), { originalException: u }, ctx);
  leaks(o2, 'Safari URL error');
  ok(o2.exception.values[0].value === 'uri', 'URL TypeError becomes uri');
  const f = new TypeError(`Failed to fetch (${HOST})`);
  const o3 = prepare(ev('TypeError', f.message, f), { originalException: f }, ctx);
  leaks(o3, 'fetch failure with host');
  ok(o3.exception.values[0].value === 'network', 'fetch TypeError becomes network');
  const cut = new Error(`sync: ${RD.slice(0, 9)}`.slice(0, 60));
  leaks(prepare(ev('Error', cut.message, cut), { originalException: cut }, ctx), 'a 60-character cut mid-key');
}
// 5. a foreign cause inside our own error is decided on its own
{
  const inner = new SyntaxError(`Unexpected token '<', "<html>${USER}:${PASS}" is not valid JSON`);
  const outer = new AppError('sync-read', 'Sync could not read a record', undefined);
  outer.cause = inner;
  const e = ev('AppError', outer.message, outer);
  e.exception.values.unshift({ type: 'SyntaxError', value: inner.message, mechanism: { type: 'chained', handled: true } });
  const out = prepare(e, { originalException: outer }, ctx);
  leaks(out, 'linked cause');
  ok(out.exception.values[0].value === 'json' && out.exception.values[1].value === 'sync-read', 'each value decided against its own object');
}
// 6. thrown strings, rejected objects and stack-less DOMExceptions leave no message
{
  const s = `boom ${LINK}`;
  const e = { event_id: 'x', message: s, exception: { values: [{ type: 'Error', value: s }] } };
  const out = prepare(e, { originalException: s }, ctx);
  leaks(out, 'thrown string');
  ok(!out.message && out.exception.values[0].value === 'Error', 'thrown string: no message, type only');
  const obj = { addon: `https://torrentio.strem.fun/providers=yts|realdebrid=${RD}/manifest.json` };
  const e2 = { event_id: 'y', exception: { values: [{ type: 'UnhandledRejection', value: `Object captured as promise rejection with keys: addon` }] }, extra: { __serialized__: obj } };
  leaks(prepare(e2, { originalException: obj }, ctx), 'rejected object');
  const m = { event_id: 'z', message: `SyntaxError: '[data-x="${USER}"]' is not a valid selector` };
  ok(prepare(m, {}, ctx) === null, 'a bare message that is not a problem kind is dropped');
}
// 7. engine messages that only name code are kept; the same shape with a long identifier is not
{
  const e = new TypeError("Cannot read properties of undefined (reading 'title')");
  ok(prepare(ev('TypeError', e.message, e), { originalException: e }, ctx).exception.values[0].value === e.message, 'engine template kept');
  const long = new TypeError(`Cannot read properties of undefined (reading '${'a'.repeat(60)}')`);
  ok(prepare(ev('TypeError', long.message, long), { originalException: long }, ctx).exception.values[0].value === 'TypeError', 'long identifier not kept');
  for (const k of [HOST, '12345']) { const h = new TypeError(`Cannot read properties of undefined (reading '${k}')`); ok(prepare(ev('TypeError', h.message, h), { originalException: h }, ctx).exception.values[0].value === 'TypeError', `a run-time key that is a host or a number is not kept (${k})`); }
  ok(S.net(`no answer from ${HOST} or torrentio.strem.fun`) === 'no answer from <host> or <host>', 'net blanks bare hosts');
  ok(S.net('ch.logo and manifest.json') === 'ch.logo and manifest.json', 'net leaves code names');
  const jsc = new TypeError("undefined is not an object (evaluating 'ch.logo')");
  ok(prepare(ev('TypeError', jsc.message, jsc), { originalException: jsc }, ctx).exception.values[0].value === jsc.message, 'JSC template kept');
}
// 8. problems: known kinds only, facts by schema
{
  const p = { event_id: 'p', message: 'play-failed', fingerprint: ['problem', 'play-failed', 'provider-down'], tags: { kind: 'play-failed' },
    extra: { facts: { what: 'live', source: 'm3u', http: 403, cause: 'provider-down', channel: 'Sky Sports', id: LINK, url: LINK, mime: 'video/avc', codecs: 'avc1.640028', height: 1080, customUa: true, stalls: 2, engines: ['exo', `x ${HOST}`] } } };
  const out = prepare(p, {}, ctx);
  leaks(out, 'play-failed facts');
  ok(out.message === 'play-failed' && out.extra.facts.http === 403 && out.extra.facts.cause === 'provider-down', 'problem kept with its facts');
  ok(!('channel' in out.extra.facts) && !('id' in out.extra.facts) && !('url' in out.extra.facts), 'off-schema facts dropped');
  ok(out.extra.facts.mime === 'video/avc' && out.extra.facts.codecs === 'avc1.640028' && out.extra.facts.height === 1080, 'format facts kept');
  ok(prepare({ event_id: 'q', message: 'not-a-kind' }, {}, ctx) === null, 'unknown message dropped');
  const sync = new AppError('server', 'x'); const se = ev('AppError', 'x', sync, { tags: { kind: 'sync-stopped' }, extra: { facts: { code: 'server', status: 503, phase: 'push', detail: `${EMAIL} at x` } } });
  const so = prepare(se, { originalException: sync }, ctx);
  leaks(so, 'sync-stopped');
  ok(so.extra.facts.status === 503 && so.extra.facts.phase === 'push' && !('detail' in so.extra.facts), 'sync facts by schema on an exception');
}
// 9. the last net on its own
{
  const t = S.net(`at C:\\Users\\Birgir\\AppData and C:/Users/Birgir/x, ${EMAIL}, token=${RD}, ${'aB3'.repeat(9)}, 10.0.0.2:8080/x, ${HOST}:8080`);
  ok(!/Birgir|example\.com|Mx41|aB3aB3|10\.0\.0\.2|examplepanel/.test(t), `net: ${t}`);
  ok(S.net('manifest.json') === 'manifest.json' && S.net('play-failed') === 'play-failed', 'net leaves plain words');
  ok(S.framePath('file:///C:/Program Files/airglow/resources/app.asar/app/desktop/home.js') === 'app:///desktop/home.js', 'Electron frame path');
  ok(S.framePath('capacitor://localhost/phone/main.js') === 'app:///phone/main.js', 'iPhone frame path');
  ok(S.framePath('http://127.0.0.1:8777/tv/js/main.js') === 'app:///tv/js/main.js', 'local test frame path');
}
// 10. caps: once in 10 minutes per fingerprint, 30 a day
{
  const mem = {}; const store = { getItem: (k) => mem[k] || null, setItem: (k, v) => { mem[k] = v; } };
  let t = Date.parse('2026-11-08T12:00:00Z'); const cap = S.makeCaps(store, () => t);
  ok(cap('a') && !cap('a'), 'same fingerprint twice in 10 minutes: second dropped');
  t += 11 * 60e3; ok(cap('a'), 'again after 10 minutes');
  let sent = 0; for (let i = 0; i < 40; i++) if (cap(`k${i}`)) sent++;
  ok(sent === 28, `30 a day (got ${sent + 2})`);
}

console.log(`${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
