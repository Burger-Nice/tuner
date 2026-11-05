// A stand-in for preload.js's window.tuner in a plain browser (tests/desktop/views.js): mpv is a fake that "plays" (its
// time runs, pause and seek work, events come as mpv's would), hosts and the mini window are recorded, prefs and
// reminders live in memory. No overlay: the floating layer draws in the page, as it does whenever no picture is up.
// Injected with page.addInitScript(); window.__stub holds what the test reads.
(() => {
  const subs = { tick: new Set(), ev: new Set(), win: new Set(), mini: new Set(), action: new Set(), rem: new Set(), media: new Set() };
  const inst = new Map();
  const log = [];
  let prefs = { closeToTray: true, notifications: true, miniOnLeave: true, miniOnTop: true, hwdec: 'auto-safe', hdr: true, spdif: false, audioDevice: '', plan: 'A' };
  let reminders = [];
  const emit = (set, x) => set.forEach((f) => { try { f(x); } catch (e) { console.error(e); } });
  setInterval(() => {
    if (!inst.size) return;
    const out = {};
    for (const [id, s] of inst) { if (s.loaded && !s.pause) s.t = Math.min(s.d, s.t + 0.25 * (s.speed || 1)); out[id] = { t: s.t, d: s.d, cache: 8, buffering: false, pause: s.pause }; }
    emit(subs.tick, out);
  }, 250);
  const ev = (id, e) => emit(subs.ev, { id, ...e });
  const tracks = [{ id: 1, type: 'video', lang: '', codec: 'h264', selected: true }, { id: 1, type: 'audio', lang: 'eng', codec: 'aac', selected: true, 'demux-channel-count': 2 }, { id: 2, type: 'audio', lang: 'isl', codec: 'ac3', selected: false, 'demux-channel-count': 6 }, { id: 1, type: 'sub', lang: 'eng', codec: 'subrip', selected: false }];
  window.tuner = {
    platform: 'win32', desktop: true,
    setUserAgent: () => {}, version: async () => '0.4.999', quit: () => log.push('quit'),
    updates: { status: async () => ({ state: 'current' }), check: async () => {}, install: async () => {}, onStatus: () => () => {} },
    secret: { get: async (k) => sessionStorage.getItem(`stub-secret-${k}`), set: async (k, v) => sessionStorage.setItem(`stub-secret-${k}`, v), clear: async (k) => sessionStorage.removeItem(`stub-secret-${k}`) },   // (safeStorage)
    mpv: {
      available: async () => true,
      create: async (id, o) => { inst.set(id, { t: 0, d: 0, pause: false, mute: !!o?.mute, volume: o?.volume ?? 100, loaded: false, url: '' }); log.push(['create', id]); return { ok: true, plan: 'A', hwnd: 1 }; },
      load: async (id, o) => {
        const s = inst.get(id); if (!s) return { ok: false };
        Object.assign(s, { url: o.url, loaded: false, t: o.start || 0, d: /\/live\//.test(o.url) ? 0 : 1321, pause: false });
        log.push(['load', id, o.url]);
        setTimeout(() => { s.loaded = true; if (!s.d) s.d = 0; ev(id, { type: 'file-loaded' }); ev(id, { type: 'prop', name: 'track-list', value: tracks }); ev(id, { type: 'prop', name: 'height', value: 1080 }); ev(id, { type: 'prop', name: 'hwdec-current', value: 'd3d11va' }); }, 150);
        return { ok: true };
      },
      command: async (id, args) => { const s = inst.get(id); log.push(['cmd', id, ...args]); if (s && args[0] === 'seek') s.t = +args[1]; if (s && args[0] === 'stop') s.loaded = false; return { error: 'success' }; },
      set: async (id, k, v) => { const s = inst.get(id); log.push(['set', id, k, v]); if (s) { s[k] = v; ev(id, { type: 'prop', name: k, value: v }); } return { error: 'success' }; },
      get: async (id, k) => inst.get(id)?.[k] ?? null,
      state: async (id) => inst.get(id) || null,
      quit: async (id) => { inst.delete(id); log.push(['quit', id]); },
      probe: async () => ({ ok: true, line: 'h264 1920x1080 aac 2' }),
      onEvent: (f) => { subs.ev.add(f); return () => subs.ev.delete(f); },
      onTick: (f) => { subs.tick.add(f); return () => subs.tick.delete(f); },
    },
    host: { rect: (id, r) => { const s = inst.get(id); if (s) s.rect = r; }, moveTo: async (id, win) => { const s = inst.get(id); if (s) s.win = win; log.push(['move', id, win]); return true; } },
    win: { state: async () => ({ maximized: false, fullscreen: false, focused: true, plan: 'A', scale: 1 }), fullscreen: (on) => { log.push(['fullscreen', on]); emit(subs.win, { fullscreen: on == null ? true : !!on }); }, minimize: () => {}, tray: () => log.push('tray'), focus: () => {}, titlebar: () => {}, onState: (f) => { subs.win.add(f); return () => {}; } },
    mini: { open: async () => { log.push('mini-open'); return { x: 1400, y: 760, width: 480, height: 270 }; }, close: () => log.push('mini-close'), top: () => {}, snap: (d) => log.push(['snap', d]), drag: () => {}, onState: (f) => { subs.mini.add(f); return () => {}; } },
    notify: async (o) => { log.push(['notify', o]); return true; },
    reminders: { list: async () => reminders, set: async (r) => { reminders = [...reminders.filter((x) => x.id !== r.id), r]; return reminders; }, clear: async (id) => { reminders = reminders.filter((x) => x.id !== id); return reminders; }, onChange: () => () => {} },
    tray: { update: (o) => log.push(['tray', o?.label || null]) },
    media: { keys: (on) => log.push(['media', on]), onKey: (f) => { subs.media.add(f); return () => {}; } },
    prefs: { get: async () => prefs, set: async (p) => { prefs = { ...prefs, ...p }; return prefs; } },
    files: { mpvConf: async () => '' },
    audioDevices: async () => [{ id: 'auto', name: 'Autoselect' }, { id: 'wasapi/{1}', name: 'Speakers (Realtek)' }],
    displays: async () => [],
    openExternal: async () => true,
    openExternalPlayer: async (u) => { log.push(['external', u]); return true; },
    onAction: (f) => { subs.action.add(f); return () => {}; },
    onResume: () => () => {},
  };
  window.__stub = { log, inst, prefs: () => prefs, reminders: () => reminders, action: (a) => emit(subs.action, a), media: (k) => emit(subs.media, k) };
})();
