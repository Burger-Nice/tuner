// Performance check of the TV UI at a TV-like speed: Chromium's CPU slowed 6x (CDP Emulation.setCPUThrottlingRate),
// 960 x 540 at 2x, an owner-like history (home-common.js). Per scenario: key press to the next frame (each keydown's
// timestamp to the first task after the frame that follows it), long tasks, held keys (a repeat every 50 ms like the
// remote: how many moves landed, the longest frame gap), style/layout time from CDP's Performance metrics, the node
// count; then images against their slots, background timers/fetches/DOM writes while idle, and heap growth.
// Start the servers first (tests/tv/serve.sh), then: node tests/tv/perf.js [out.json] [--rate 6] [--soak minutes]
const { chromium } = require('playwright');
const HC = require('./home-common.js');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const RATE = +opt('--rate', 6), SOAK = +opt('--soak', 0), ONLY = opt('--only', ''), PROF = opt('--profile', ''), TRACE = opt('--trace', '');
const out = args[0] && !args[0].startsWith('--') ? args[0] : null;

const INIT = () => {
  const P = (window.__perf = { lat: [], lt: [], gaps: [], timers: {}, fetches: [], muts: 0, setHtml: 0 });
  // key press -> the next frame: a task posted from the frame's rAF runs after that frame's style/layout/paint
  addEventListener('keydown', (e) => {
    const t0 = e.timeStamp, k = e.key, rep = e.repeat, q = performance.now() - t0;
    requestAnimationFrame(() => { const raf = performance.now() - t0, n = P.lat.length; performance.mark('raf'); const ch = new MessageChannel(); ch.port1.onmessage = () => { performance.mark('msg'); P.lat.push({ k, rep, q, raf, ms: performance.now() - t0 }); }; ch.port2.postMessage(0); });
  }, true);
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.lt.push({ t: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch {}
  // the browser's own measure (Event Timing, what INP uses): a keydown's start to the paint after it is handled (only those over 16 ms are reported)
  P.et = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'keydown') P.et.push({ t: e.startTime, d: e.duration, proc: e.processingEnd - e.processingStart }); }).observe({ type: 'event', durationThreshold: 16, buffered: false }); } catch {}
  let last = 0;
  // (frames are watched only during a scenario: an endless rAF loop would cost the idle numbers a frame each 16 ms)
  const fr = (t) => { if (!P.track) { last = 0; P.loop = false; return; } if (last) P.gaps.push(t - last); last = t; requestAnimationFrame(fr); };
  P.watch = () => { P.track = true; if (!P.loop) { P.loop = true; requestAnimationFrame(fr); } };
  // who schedules timers (by the caller's file:line), and the fetches
  const where = () => { const s = (new Error().stack || '').split('\n').slice(3).find((l) => /\/tv\/|core\.js|nba\.js/.test(l)) || '?'; return s.replace(/^.*\/(tv\/js\/[^)]*|[a-z]+\.js[^)]*)\)?$/, '$1').replace(/:\d+$/, ''); };
  const st = window.setTimeout, si = window.setInterval;
  window.setTimeout = function (f, ms, ...a) { if (P.count) { const w = where(); P.timers[w] = (P.timers[w] || 0) + 1; } return st.call(this, f, ms, ...a); };
  window.setInterval = function (f, ms, ...a) { const w = 'INTERVAL ' + where() + ' ' + ms; P.timers[w] = (P.timers[w] || 0) + 1; return si.call(this, f, ms, ...a); };
  const ft = window.fetch;
  window.fetch = function (u, ...a) { if (P.count) P.fetches.push(String(u?.url || u).replace(/\?.*$/, '').slice(0, 90)); return ft.call(this, u, ...a); };
  new MutationObserver((m) => { if (P.count) P.muts += m.length; }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
};

(async () => {
  const b = await chromium.launch({ args: ['--disable-web-security', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await p.addInitScript(() => { localStorage.setItem('tuner.nbaBase', JSON.stringify('http://127.0.0.1:8899/espn')); localStorage.setItem('tuner.nbaWebBase', JSON.stringify('http://127.0.0.1:8899/espnweb')); localStorage.setItem('tuner.nbaContentBase', JSON.stringify('http://127.0.0.1:8899/espncontent')); window.TUNER_TEST = 1; });
  await p.addInitScript(INIT);
  await p.goto(opt('--url', 'http://127.0.0.1:8777/tv.html'));
  await p.waitForTimeout(1200);
  const key = async (k, times = 1, wait = 120) => { for (let i = 0; i < times; i++) { await p.keyboard.press(k); await p.waitForTimeout(wait); } };
  // (no fake clock: Playwright's clock replaces rAF and performance.now, which this measures; the real date is close enough)
  p.clock.install = async () => {};
  await HC({ p, key }, { at: new Date().toISOString() });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Performance.enable');
  const ev = (f, a) => p.evaluate(f, a);
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const R = { rate: RATE, scenarios: {} };
  const throttle = (r) => cdp.send('Emulation.setCPUThrottlingRate', { rate: r });
  await throttle(RATE);

  // ---- cold start: reload, to Home drawn (a focusable card) and to the launch gone
  const cold = [];
  for (let i = 0; i < 3; i++) {
    await p.reload();
    const t = await ev(() => new Promise((res) => {
      const t0 = performance.timeOrigin;
      let home = 0;
      const tick = () => {
        const now = performance.now();
        if (!home && document.querySelector('[data-screen="home"]:not([hidden]) .fx')) home = now;
        if (home && !document.getElementById('app').classList.contains('l-on')) return res({ home: Math.round(home), open: Math.round(now), rows: 0 });
        if (now > 30000) return res({ home: Math.round(home), open: -1 });
        setTimeout(tick, 20);
      };
      tick();
    }));
    t.rows = await ev(async () => { for (let i = 0; i < 400; i++) { if (document.querySelectorAll('[data-screen="home"] .hf-row').length >= 8) return Math.round(performance.now()); await new Promise((r) => setTimeout(r, 50)); } return -1; });
    cold.push(t);
    await p.waitForTimeout(3000);
  }
  R.cold = cold;
  await p.waitForTimeout(4000);

  // ---- a scenario: run fn (key presses), collect what it cost
  const scen = async (name, fn) => {
    if (ONLY && !ONLY.split(',').includes(name)) return;
    await p.waitForTimeout(600);
    const m0 = await metrics();
    await ev(() => { __perf.lat = []; __perf.lt = []; __perf.gaps = []; __perf.et = []; __perf.watch(); });
    const t0 = Date.now();
    if (TRACE === name) await b.startTracing(p, { path: `${out || 'perf'}.trace.json`, categories: ['blink.user_timing', 'toplevel', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink', 'cc', 'gpu', 'disabled-by-default-devtools.timeline.frame'] });
    if (PROF === name) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
    const extra = (await fn()) || {};
    await p.waitForTimeout(500);
    if (TRACE === name) await b.stopTracing();
    if (PROF === name) {
      // the CPU profile's top functions by self time (and their total)
      const { profile } = await cdp.send('Profiler.stop');
      const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
      const dt = profile.timeDeltas, cnt = new Map();
      profile.samples.forEach((id, i) => cnt.set(id, (cnt.get(id) || 0) + (dt[i] || 0)));
      for (const [id, us] of cnt) { const n = byId.get(id), cf = n.callFrame; const k = `${cf.functionName || '(anon)'} ${cf.url.replace(/^.*\/(tv\/)?/, '')}:${cf.lineNumber + 1}`; self.set(k, (self.get(k) || 0) + us); }
      console.log([...self].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, us]) => `${(us / 1000).toFixed(0).padStart(6)} ms  ${k}`).join('\n'));
      // inclusive time per function (each sample counted once per function on its stack)
      const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
      const incl = new Map();
      for (const [id, us] of cnt) { const seen = new Set(); for (let x = id; x; x = parent.get(x)) { const cf = byId.get(x).callFrame; if (!cf.url) continue; const k = `${cf.functionName || '(anon)'} ${cf.url.replace(/^.*\/(tv\/)?/, '')}:${cf.lineNumber + 1}`; if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + us); } } }
      console.log('--- inclusive'); console.log([...incl].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, us]) => `${(us / 1000).toFixed(0).padStart(6)} ms  ${k}`).join('\n'));
    }
    const m1 = await metrics();
    const d = await ev(() => { __perf.track = false; return { lat: __perf.lat, lt: __perf.lt, gaps: __perf.gaps, et: __perf.et, nodes: document.querySelectorAll('*').length }; });
    const lat = d.lat.map((x) => x.ms).sort((a, b) => a - b);
    const q = (f) => (lat.length ? Math.round(lat[Math.min(lat.length - 1, Math.floor(f * lat.length))]) : null);
    const qs = d.lat.map((x) => x.q).sort((a, b) => a - b);
    // Event Timing: keys not reported were under 16 ms
    const et = [...d.et.map((x) => x.d), ...Array(Math.max(0, d.lat.length - d.et.length)).fill(16)].sort((a, b) => a - b);
    const eq = (f) => (et.length ? Math.round(et[Math.min(et.length - 1, Math.floor(f * et.length))]) : null);
    const proc = d.et.map((x) => x.proc).sort((a, b) => a - b);
    const r = {
      keys: lat.length, paint50: eq(0.5), paint90: eq(0.9), paintMax: eq(1), handlerMax: proc.length ? Math.round(proc[proc.length - 1]) : 0, queueP90: qs.length ? Math.round(qs[Math.floor(0.9 * qs.length)]) : null, p50: q(0.5), p90: q(0.9), max: q(1), longTasks: d.lt.length, longMs: Math.round(d.lt.reduce((s, x) => s + x.d, 0)),
      maxGap: Math.round(Math.max(0, ...d.gaps)), jank: d.gaps.filter((g) => g > 50).length,
      style: Math.round((m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000), layout: Math.round((m1.LayoutDuration - m0.LayoutDuration) * 1000),
      script: Math.round((m1.ScriptDuration - m0.ScriptDuration) * 1000), task: Math.round((m1.TaskDuration - m0.TaskDuration) * 1000),
      layouts: m1.LayoutCount - m0.LayoutCount, styles: m1.RecalcStyleCount - m0.RecalcStyleCount, nodes: d.nodes, wall: Date.now() - t0, ...extra,
    };
    if (process.env.PERF_KEYS) console.log(d.lat.map((x) => `${Math.round(x.q)}/${Math.round(x.raf)}/${Math.round(x.ms)}`).join(' '));
    R.scenarios[name] = r;
    console.log(name.padEnd(16), JSON.stringify(r));
  };
  // a held key: keydowns every 50 ms whether or not the page kept up (like the remote), then up
  const hold = async (k, n, gap = 50) => {
    const code = { ArrowRight: 39, ArrowLeft: 37, ArrowDown: 40, ArrowUp: 38 }[k];
    const before = await ev(() => document.activeElement?.dataset?.key || document.activeElement?.textContent?.slice(0, 30));
    const ps = [];
    let moves = 0;
    await ev(() => { window.__mv = 0; window.__mvL ||= document.addEventListener('tvfocus', () => window.__mv++, true) || 1; });
    for (let i = 0; i < n; i++) {
      ps.push(cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code: k, windowsVirtualKeyCode: code, autoRepeat: i > 0, isKeypad: false }));
      await new Promise((r) => setTimeout(r, gap));
    }
    ps.push(cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code }));
    await Promise.all(ps);
    await p.waitForTimeout(400);
    moves = await ev(() => window.__mv);
    const after = await ev(() => document.activeElement?.dataset?.key || document.activeElement?.textContent?.slice(0, 30));
    return { sent: n, moved: moves, from: before, to: after };
  };
  const go = async (s, wait = 2500) => { await ev((s) => window.__tunerTest.go(s), s); await p.waitForTimeout(wait); };

  await scen('home-lineup', async () => { await key('ArrowDown', 3, 500); await key('ArrowUp', 3, 500); });
  await scen('home-rows', async () => { await key('PageDown', 1, 1500); await key('ArrowRight', 6, 400); await key('ArrowDown', 6, 500); await key('ArrowUp', 3, 500); });
  await scen('home-holdRight', async () => hold('ArrowRight', 30));
  await scen('home-holdDown', async () => hold('ArrowDown', 24));
  await go('movie', 3500);
  await ev(() => { const c = document.querySelector('[data-screen="movie"] [data-grid] .fx'); c && c.focus(); });
  await scen('lib-grid', async () => { await key('ArrowDown', 4, 400); await key('ArrowRight', 4, 300); });
  await scen('lib-holdDown', async () => hold('ArrowDown', 30));
  await scen('lib-holdRight', async () => hold('ArrowRight', 12));
  await go('live', 3500);
  await scen('guide', async () => { await key('ArrowDown', 6, 300); await key('ArrowRight', 6, 300); });
  await scen('guide-holdDown', async () => hold('ArrowDown', 40));
  await scen('guide-holdRight', async () => hold('ArrowRight', 20));
  await go('nba', 3500);
  await scen('nba-hub', async () => { await key('ArrowDown', 3, 500); await key('ArrowRight', 5, 400); await key('ArrowDown', 3, 500); });
  await go('series', 3500);
  await ev(() => { const c = document.querySelector('[data-screen="series"] [data-grid] .fx'); c && c.focus(); });
  await scen('series-open', async () => { await key('Enter', 1, 3500); });
  await scen('series-page', async () => { await key('ArrowDown', 3, 500); await key('ArrowRight', 5, 300); await key('ArrowDown', 2, 500); await key('ArrowRight', 4, 300); });
  await go('search', 3000);
  await ev(() => document.querySelector('[data-key="A"]')?.focus());
  await scen('search-type', async () => {
    // N I G H T on the on-screen keyboard with the D-pad: OK on a key types it
    for (const c of 'NIGHT') { await ev((c) => document.querySelector(`[data-key="${c}"]`)?.focus(), c); await key('Enter', 1, 450); await key('ArrowRight', 1, 250); }
  });

  // ---- images against their slots (on Home, rows open)
  await go('home', 3000);
  await key('PageDown', 1, 2500);
  R.images = await ev(() => {
    const dpr = devicePixelRatio, list = [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth && i.getClientRects().length);
    const slot = (i) => { const r = i.getBoundingClientRect(); return r.width * r.height * dpr * dpr; };
    const big = list.map((i) => ({ src: i.currentSrc.replace(/^.*\/\/[^/]+/, '').slice(0, 70), nat: `${i.naturalWidth}x${i.naturalHeight}`, slot: `${Math.round(i.getBoundingClientRect().width * dpr)}x${Math.round(i.getBoundingClientRect().height * dpr)}`, x: +(i.naturalWidth * i.naturalHeight / Math.max(1, slot(i))).toFixed(1) })).sort((a, b) => b.x - a.x);
    const bg = [...document.querySelectorAll('[data-screen="home"] *')].map((e) => getComputedStyle(e).backgroundImage).filter((x) => x && x !== 'none' && /url/.test(x)).length;
    return { count: list.length, decodedMP: +(list.reduce((s, i) => s + i.naturalWidth * i.naturalHeight, 0) / 1e6).toFixed(1), slotMP: +(list.reduce((s, i) => s + slot(i), 0) / 1e6).toFixed(1), worst: big.slice(0, 8), cssBg: bg };
  });
  console.log('images', JSON.stringify(R.images));

  // ---- idle on Home for 30 s: timers, fetches, DOM writes, CPU
  await key('PageUp', 1, 1500);
  await ev(() => { __perf.timers = {}; __perf.fetches = []; __perf.muts = 0; __perf.count = true; });
  const i0 = await metrics();
  await p.waitForTimeout(30000);
  const i1 = await metrics();
  R.idle = await ev(() => { __perf.count = false; const t = Object.entries(__perf.timers).sort((a, b) => b[1] - a[1]).slice(0, 12); const f = {}; for (const u of __perf.fetches) f[u] = (f[u] || 0) + 1; return { timers: t, fetches: Object.entries(f).sort((a, b) => b[1] - a[1]).slice(0, 10), nFetch: __perf.fetches.length, muts: __perf.muts }; });
  R.idle.taskMs = Math.round((i1.TaskDuration - i0.TaskDuration) * 1000);
  R.idle.scriptMs = Math.round((i1.ScriptDuration - i0.ScriptDuration) * 1000);
  R.idle.styleMs = Math.round((i1.RecalcStyleDuration - i0.RecalcStyleDuration) * 1000);
  console.log('idle30s', JSON.stringify(R.idle));

  // ---- soak: move around for SOAK minutes (unthrottled), heap and nodes after GC
  if (SOAK) {
    await throttle(1);
    const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); const m = await metrics(); return { heapMB: +(m.JSHeapUsedSize / 1e6).toFixed(1), nodes: m.Nodes, listeners: m.JSEventListeners }; };
    const h0 = await heap();
    const tEnd = Date.now() + SOAK * 60e3;
    const tour = ['home', 'live', 'movie', 'series', 'nba', 'search', 'home'];
    let laps = 0;
    while (Date.now() < tEnd) {
      for (const s of tour) {
        await go(s, 1500);
        if (s === 'home') { await key('PageDown', 1, 800); await key('ArrowRight', 5, 150); await key('ArrowDown', 6, 250); await key('PageUp', 1, 600); await key('ArrowDown', 2, 400); }
        else { await key('ArrowDown', 6, 150); await key('ArrowRight', 6, 150); await key('ArrowUp', 6, 150); }
      }
      laps++;
    }
    await go('home', 3000);
    R.soak = { minutes: SOAK, laps, before: h0, after: await heap() };
    console.log('soak', JSON.stringify(R.soak));
  }
  R.errors = errs;
  if (errs.length) console.log(errs.slice(0, 5).join('\n'));
  if (out) require('fs').writeFileSync(out, JSON.stringify(R, null, 1));
  console.log('cold', JSON.stringify(R.cold));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
