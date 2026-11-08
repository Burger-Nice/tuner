// Error reports: what a report may hold, and the scrub every report goes through before it leaves the device
// (design/ui-v1/error-reports/SPEC.md D3, D4, D6). A classic script (window.AirglowScrub, window.AppError) loaded before
// core.js on all three apps, so errors made anywhere, even while the modules load, meet the same rules; node tests
// require() it. The rule: no link, no provider or add-on address, no channel identity and no secret ever leaves the
// device. An error's message is never sent unless it's one of the browser's own engine messages that only name code;
// our own errors send their code, everything else its type.
(function (root) {
  'use strict';

  // ---------- our own errors ----------
  // An error of ours carries a short code; reports send the code, the screens show the message (it never leaves).
  class AppError extends Error {
    constructor(code, message, status) {
      super(message || String(code));
      this.name = 'AppError';
      this.code = code;
      if (status != null) this.status = status;
    }
  }
  AppError.prototype.ours = true;

  const CODE = /^[A-Za-z0-9_.:+-]{1,48}$/;
  const safeCode = (c) => (c != null && CODE.test(String(c)) && !looksKey(String(c)) ? String(c) : 'other');
  const looksKey = (s) => /[A-Za-z0-9_-]{24,}/.test(s) && /[A-Za-z]/.test(s) && /\d/.test(s);

  // ---------- the last net, on whatever text is left (codes, notes, facts, tags) ----------
  function net(s) {
    if (typeof s !== 'string') return s;
    return s
      .replace(/\b(?!app:\/\/\/[\w./-]+(?::[\w$.<>?-]+)?$)[a-z][a-z0-9+.-]*:(?:\\?\/){2}[^\s"'<>]*/gi, '<link>')
      .replace(/\/(?:live|movie|series|timeshift|streaming)\/[^\s"'<>]*/gi, '<link>')
      .replace(/\b[a-z0-9.-]+\.[a-z]{2,}:\d{2,5}(?:\/[^\s"'<>]*)?/gi, '<link>')
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{2,5})?(?:\/[^\s"'<>]*)?/g, '<link>')
      // a bare host name (no scheme, no port): dotted names ending in a common top-level domain
      .replace(/\b(?:[a-z0-9-]+\.)+(?:com|net|org|info|biz|io|tv|me|co|cc|to|is|uk|de|nl|eu|ru|fr|es|it|se|no|dk|fi|pl|us|ca|xyz|top|pro|live|stream|online|site|club|app|dev|fun|link|cloud|space|store|vip|one|ws|su|ga|tk|ml)\b/gi, '<host>')
      .replace(/\b(password|username|user|pass|token|key|auth|apikey|api_key)=[^&\s"'<>]+/gi, '$1=<key>')
      .replace(/[^\s@"'<>]+@[^\s@"'<>]+\.[a-z]{2,}/gi, '<email>')
      .replace(/[A-Za-z0-9_-]{24,}/g, (m) => (/[A-Za-z]/.test(m) && /\d/.test(m) ? '<key>' : m))
      .replace(/([A-Za-z]:[\\/]+Users[\\/]+)[^\\/\s"'<>]+/gi, '$1~');
  }

  // ---------- frames ----------
  // The app's own files become app:///<path> (the same on all three apps, so a bug in shared code groups as one);
  // a frame from anywhere else becomes <link>. Done first; frame names are then left alone by the other rules.
  function framePath(p) {
    if (typeof p !== 'string' || !p) return p;
    const s = p.split(/[?#]/)[0];
    let m = /^(?:https?|capacitor):\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/(.*)$/i.exec(s);
    if (m) return `app:///${m[1]}`;
    m = /^file:\/\/\/.*?\/app\/(.*)$/i.exec(s.replace(/\\/g, '/'));
    if (m) return `app:///${m[1]}`;
    if (/^app:\/\/\//.test(s)) return s;
    if (/^<anonymous>$|^\[native code\]$|^native$/.test(s)) return s;
    return '<link>';
  }
  const inApp = (path) => typeof path === 'string' && path.startsWith('app:///') && !/\/(vendor|node_modules)\//.test(path);
  const fnName = (f) => (typeof f === 'string' && /^[\w$.<>\[\] /-]{0,80}$/.test(f) ? f : '?');

  // ---------- an error's value ----------
  // The browser's engine messages that only name code (the commonest JS bug's clue), kept as they are.
  const ID = '[A-Za-z_$][\\w$]{0,39}(?:\\.[A-Za-z_$][\\w$]{0,39}){0,3}';   // an expression in the source code (a.b.c)
  const KEY = '[A-Za-z_$][\\w$]{0,39}';   // a property read at run time: no dots, never a number (it could be a host or a stream id)
  const ENGINE = [
    new RegExp(`^Cannot read properties of (undefined|null) \\(reading '${KEY}'\\)$`),
    new RegExp(`^Cannot set properties of (undefined|null) \\(setting '${KEY}'\\)$`),
    new RegExp(`^${ID} is not (a function|defined|iterable|a constructor)$`),
    new RegExp(`^undefined is not an object \\(evaluating '${ID}'\\)$`),
    new RegExp(`^null is not an object \\(evaluating '${ID}'\\)$`),
    new RegExp(`^Can't find variable: ${ID}$`),
    new RegExp(`^Cannot access '${ID}' before initialization$`),
    /^Maximum call stack size exceeded\.?$/,
    /^Assignment to constant variable\.$/,
    /^Out of memory$/,
  ];
  const NETWORK = /Failed to fetch|Load failed|NetworkError|network error|The network connection was lost|The Internet connection appears to be offline/i;
  const URI = /Invalid URL|is not a valid URL|Failed to construct 'URL'|Invalid base URL/i;
  const JSONISH = /JSON|Unexpected token|Unexpected end of|Unexpected character|Unexpected identifier|Unterminated string/i;
  const isDom = (e) => typeof DOMException !== 'undefined' && e instanceof DOMException;

  // What an exception may say, decided against the real object it came from.
  function valueOf(err, type) {
    if (!err || typeof err !== 'object') return safeType(type);
    if (err.ours) return safeCode(err.report ?? err.kind ?? err.code);   // report: a code meant for reports (Stremio's errors)
    const msg = typeof err.message === 'string' ? err.message : '';
    if (isDom(err)) return URI.test(msg) ? 'uri' : NETWORK.test(msg) ? 'network' : safeCode(err.name);
    if (err.name === 'SyntaxError' && JSONISH.test(msg)) return 'json';
    if (err.name === 'TypeError' && NETWORK.test(msg)) return 'network';
    if ((err.name === 'TypeError' || err.name === 'SyntaxError') && URI.test(msg)) return 'uri';
    if (ENGINE.some((r) => r.test(msg))) return msg;
    return safeType(type || err.name);
  }
  const safeType = (t) => (typeof t === 'string' && /^[\w$.]{1,64}$/.test(t) ? t : 'Error');

  // The real objects behind exception.values[], outermost first (an error, its cause, its cause's cause…).
  function chain(orig) {
    const out = [];
    for (let e = orig, i = 0; e && typeof e === 'object' && i < 6; e = e.cause, i++) out.push(e);
    return out;
  }

  // ---------- facts and notes: a fixed schema each ----------
  const ENUMS = {
    what: ['live', 'vod', 'catchup', 'addon', 'replay'], source: ['xtream', 'm3u', 'addon'],
    container: ['ts', 'm3u8', 'mp4', 'mkv', 'other'], stage: ['start', 'playing'], scheme: ['http', 'https', 'other'],
    phase: ['pull', 'push', 'merge', 'other'], player: ['auto', 'exo', 'vlc', 'mpv', 'hls', 'native', 'other'],
    liveFormat: ['hls', 'ts', 'm3u8', 'auto', 'other'], side: ['js', 'native', 'main'], app: ['tv', 'iphone', 'windows'],
  };
  const T = {
    num: (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : undefined),
    bool: (v) => (typeof v === 'boolean' ? v : undefined),
    code: (v) => (v == null ? undefined : safeCode(v)),
    mime: (v) => (typeof v === 'string' && /^[a-z]+\/[a-z0-9.+-]{1,30}$/i.test(v) ? v : undefined),
    codecs: (v) => (typeof v === 'string' && /^[A-Za-z0-9.,+ -]{1,60}$/.test(v) ? v : undefined),
    list: (v) => (Array.isArray(v) ? v.slice(0, 6).map((x) => safeCode(x)).join(',') : undefined),
    // an add-on's public manifest id (com.stremio.torrentio); one with a user id or config hash in it becomes other
    addonId: (v) => (v == null ? undefined : typeof v === 'string' && /^[a-z0-9.-]{1,60}$/.test(v) && !v.split(/[.-]/).some((p) => p.length >= 12 && (p.match(/\d/g) || []).length >= 3) && !/[0-9a-f]{8}-?[0-9a-f]{4}/.test(v) ? v : 'other'),
  };
  const en = (k) => (v) => (ENUMS[k].includes(v) ? v : v == null ? undefined : 'other');
  const FACTS = {
    'play-failed': {
      what: en('what'), source: en('source'), container: en('container'), stage: en('stage'), engines: T.list,
      http: T.num, error: T.code, cause: T.code, mime: T.mime, codecs: T.codecs, height: T.num, fps: T.num, hdr: T.code,
      decoder: T.code, reconnects: T.num, customUa: T.bool, liveFormat: en('liveFormat'), player: en('player'),
      stalls: T.num, redirected: T.bool, scheme: en('scheme'), sameHostAsLogin: T.bool, resumed: T.bool,
      audioMime: T.mime, audioChannels: T.num, audioRate: T.num, audioOut: T.code, audioDecoder: T.code, tunneling: T.bool, offload: T.bool, underruns: T.num,
    },
    'sync-stopped': { code: T.code, status: T.num, phase: en('phase'), waiting: T.num, held: T.num, fails: T.num },
    'guide-empty': { channels: T.num, withEpg: T.num, fallback: T.code, offsetH: T.num },
    'addon-failed': { addon: T.addonId, resource: T.code, http: T.num, error: T.code, ms: T.num },
    manual: { what: en('what'), resumed: T.bool, container: en('container'), mime: T.mime, codecs: T.codecs, height: T.num, fps: T.num,
      audioMime: T.mime, audioChannels: T.num, audioRate: T.num, audioOut: T.code, audioDecoder: T.code, tunneling: T.bool,
      offload: T.bool, underruns: T.num,
      cause: T.code, liveFormat: en('liveFormat'), player: en('player'), net: T.code,
      internet: T.bool, provider: T.bool, stream: T.bool, msInternet: T.num, msProvider: T.num, mbps: T.num },
  };
  const KINDS = Object.keys(FACTS).concat(['webview-gone', 'last-exit']);
  const NOTE_FACTS = { engine: T.code, http: T.num, code: T.code, cause: T.code, what: en('what'), source: en('source'),
    ms: T.num, n: T.num, ok: T.bool, phase: en('phase'), stage: en('stage') };
  const NOTE_WORDS = ['screen', 'play', 'play-ok', 'play-failed', 'stall', 'stop', 'sync', 'sync-failed', 'guide',
    'guide-failed', 'addon-failed', 'update-check', 'rows', 'conncheck', 'resume', 'signin', 'signin-failed'];

  function facts(kind, f, schema = FACTS[kind]) {
    const out = {};
    if (!schema || !f || typeof f !== 'object') return out;
    for (const k of Object.keys(schema)) { const v = schema[k](f[k]); if (v !== undefined) out[k] = v; }
    return out;
  }
  const noteFacts = (f) => facts(null, f, NOTE_FACTS);

  // ---------- device context from the user agent (the SDK's own contexts are dropped) ----------
  function deviceContext(ua) {
    const c = {};
    if (typeof ua !== 'string') return c;
    let m = /Android (\d+(?:\.\d+)*)(?:; ([^;)]+?)(?: Build\/[^;)]*)?)?[;)]/.exec(ua);
    if (m) { c.os = { name: 'Android', version: m[1] }; if (m[2] && /^[\w .\/+-]{1,40}$/.test(m[2]) && m[2] !== 'K') c.device = { model: m[2].trim() }; return c; }
    m = /(iPhone|iPad)[^)]*OS (\d+[_.\d]*)/.exec(ua);
    if (m) { c.os = { name: 'iOS', version: m[2].replace(/_/g, '.') }; c.device = { model: m[1] }; return c; }
    m = /Windows NT (\d+\.\d+)/.exec(ua);
    if (m) { c.os = { name: 'Windows', version: m[1] }; return c; }
    return c;
  }

  // ---------- the report, rebuilt from the allowlist ----------
  // ctx: { app, side, screen(), ua }. Returns the event to send, or null to drop it.
  function prepare(event, hint, ctx = {}) {
    try {
      const out = {};
      for (const k of ['event_id', 'timestamp', 'level', 'platform', 'release', 'dist', 'environment']) if (event[k] != null) out[k] = event[k];
      // the SDK's own name and version, and its word to Sentry's server never to guess the IP (without it, the server
      // falls back to the connection's address and adds a city to the report)
      out.sdk = { settings: { infer_ip: 'never' } };   // (the SDK adds its own name and version when it sends)
      const values = event.exception?.values || [];
      if (values.length) {
        const objs = chain(hint?.originalException).reverse();   // Sentry lists the outermost exception last
        const off = values.length - objs.length;
        out.exception = {
          values: values.map((v, i) => {
            const obj = objs[i - off];
            const matches = obj && typeof obj === 'object' && (obj.name === v.type || obj.constructor?.name === v.type || obj.ours);
            const value = matches ? valueOf(obj, v.type) : safeType(v.type);
            const frames = (v.stacktrace?.frames || []).slice(-50).map((f) => {
              const path = framePath(f.abs_path || f.filename);
              const fr = { filename: path, abs_path: path, function: fnName(f.function), in_app: inApp(path) };
              if (typeof f.lineno === 'number') fr.lineno = f.lineno;
              if (typeof f.colno === 'number') fr.colno = f.colno;
              return fr;
            });
            const ex = { type: matches && obj.ours ? safeType(obj.name) : safeType(v.type), value: net(value) };
            if (v.mechanism) ex.mechanism = { type: safeCode(v.mechanism.type), handled: !!v.mechanism.handled };
            if (frames.length) ex.stacktrace = { frames };
            return ex;
          }),
        };
        const top = out.exception.values[out.exception.values.length - 1];
        const f = (top.stacktrace?.frames || []).filter((x) => x.in_app).pop();
        out.fingerprint = KINDS.includes(event.tags?.kind) && Array.isArray(event.fingerprint)
          ? event.fingerprint.map((x) => safeCode(x))   // a problem sent with its exception keeps the problem's grouping
          : [top.type, f ? `${f.filename}:${String(f.function).replace(/\s+/g, '_')}` : top.value];   // ('new Foo' → 'new_Foo': the net leaves it whole)
      } else if (typeof event.message === 'string' && KINDS.includes(event.message)) {
        out.message = event.message;
        out.fingerprint = Array.isArray(event.fingerprint) ? event.fingerprint.map((x) => safeCode(x)) : ['problem', event.message];
      } else {
        return null;   // a message that isn't one of ours (a thrown string, an SDK message): nothing safe to send
      }
      const tags = {};
      for (const k of ['app', 'side', 'screen', 'kind']) { const v = event.tags?.[k]; if (v != null) tags[k] = safeCode(v); }
      if (ctx.app) tags.app = safeCode(ctx.app);
      if (ctx.side) tags.side = safeCode(ctx.side);
      const scr = typeof ctx.screen === 'function' ? ctx.screen() : null;
      if (scr) tags.screen = safeCode(scr);
      out.tags = tags;
      const dev = deviceContext(ctx.ua);
      if (dev.os || dev.device) out.contexts = dev;
      const crumbs = (event.breadcrumbs || []).filter((b) => b && b.category === 'note' && NOTE_WORDS.includes(b.message)).slice(-20)
        .map((b) => ({ category: 'note', message: b.message, timestamp: b.timestamp, data: noteFacts(b.data) }));
      if (crumbs.length) out.breadcrumbs = crumbs;
      const kind = out.message || (KINDS.includes(event.tags?.kind) ? event.tags.kind : null);
      if (kind && event.extra?.facts) out.extra = { facts: facts(kind, event.extra.facts) };
      // the last net over every string that's left
      return deepNet(out);
    } catch {
      return null;
    }
  }
  const SKIP = new Set(['event_id', 'timestamp', 'level', 'platform', 'release', 'dist', 'environment', 'infer_ip', 'filename', 'abs_path', 'function', 'lineno', 'colno']);
  function deepNet(o, key) {
    if (typeof o === 'string') return SKIP.has(key) ? o : net(o);
    if (Array.isArray(o)) return o.map((x) => deepNet(x, key));
    if (o && typeof o === 'object') { const r = {}; for (const k of Object.keys(o)) r[net(k)] = deepNet(o[k], k); return r; }
    return o;
  }

  // ---------- caps (SPEC D6): the same fingerprint once in 10 minutes, 30 a day per device ----------
  function makeCaps(store, now = () => Date.now()) {
    const read = () => { try { return JSON.parse(store.getItem('tuner.reportCaps') || '{}'); } catch { return {}; } };
    return (fp) => {
      const t = now(), day = new Date(t).toISOString().slice(0, 10), s = read();
      if (s.day !== day) { s.day = day; s.n = 0; s.seen = {}; }
      for (const k of Object.keys(s.seen || {})) if (t - s.seen[k] > 10 * 60e3) delete s.seen[k];
      const key = String(fp).slice(0, 200);
      if (s.n >= 30 || s.seen?.[key]) return false;
      s.n++; (s.seen = s.seen || {})[key] = t;
      try { store.setItem('tuner.reportCaps', JSON.stringify(s)); } catch {}
      return true;
    };
  }

  const api = { AppError, prepare, net, framePath, valueOf, facts, noteFacts, safeCode, deviceContext, makeCaps, KINDS, NOTE_WORDS };
  root.AppError = root.AppError || AppError;
  root.AirglowScrub = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
