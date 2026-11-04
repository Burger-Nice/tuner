// airglow for Windows (design/ui-v1/desktop-v1/SPEC.md 9): the windows, the pictures and everything that floats.
//   Electron windows: the main window (app/desktop.html, frameless with Windows' own caption buttons) and the mini
//   player's window. Host windows: one plain Win32 window per picture (app/desktop/win32.js), mpv inside it with --wid
//   (mpv.js MpvInstance). Overlay windows: whenever a picture is on screen in an Electron window, one transparent,
//   never-focused window over its content area draws everything that floats (app/desktop/overlay.html); the main page
//   builds those layers and the overlay mirrors them and sends the pointer back (app/desktop/float.js).
// Plan A puts each host inside its Electron window (WS_CHILD); plan C makes it a popup owned by it (the fallback the
// spike decides on, Account > Windows > Player can switch). Hand-offs move the host, never restart mpv.
const { app, BrowserWindow, session, shell, ipcMain, screen, Tray, Menu, Notification, globalShortcut, nativeImage, powerMonitor, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { MpvInstance, mpvBin, probe } = require('./mpv');
const W32 = require('./app/desktop/win32');

app.userAgentFallback = app.userAgentFallback.replace(/ (tuner|Tuner|airglow)\/\S+| Electron\/\S+/g, '');
app.setAppUserModelId('app.tuner.player');
// (the PC app was "Tuner": its settings, sign-in and caches stay where they were under the new name)
app.setPath('userData', path.join(app.getPath('appData'), 'Tuner'));
const TEST = !!process.env.AIRGLOW_TEST && !app.isPackaged;
const SMOKE = process.argv.includes('--smoke-test');
if (!SMOKE && !TEST && !app.requestSingleInstanceLock()) app.quit();

// ---------- the owner's PC settings (Account > Windows), kept by main because main acts on them ----------
const userFile = (n) => path.join(app.getPath('userData'), n);
const readJson = (n, d) => { try { return { ...d, ...JSON.parse(fs.readFileSync(userFile(n), 'utf8')) }; } catch { return { ...d }; } };
const writeJson = (n, v) => { try { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(userFile(n), JSON.stringify(v, null, 1)); } catch { /* read-only */ } };
const PREF_DEFAULTS = { closeToTray: true, startWithWindows: false, notifications: true, miniOnLeave: true, miniOnTop: true, pauseHidden: false, hwdec: 'auto-safe', hdr: true, spdif: false, audioDevice: '', plan: 'A' };
let prefs = readJson('desktop.json', PREF_DEFAULTS);
const PLAN = () => (process.env.AIRGLOW_PLAN || prefs.plan || 'A').toUpperCase() === 'C' ? 'C' : 'A';

let userAgent = '';
const wins = { main: null, mini: null };
const overlays = {};         // window name -> overlay BrowserWindow
const hosts = new Map();     // picture id -> { id, win, hwnd, rect (CSS px), shown, mpv }
let quitting = false;

// ---------- the main window ----------
const C = { bg0: '#0B0A12', text2: '#B9B4C7' };
function windowState() {
  const s = readJson('window.json', { width: 1440, height: 900, maximized: false });
  // only bounds that are still on a display (a monitor unplugged since)
  if (s.x != null && !screen.getAllDisplays().some((d) => s.x + 100 < d.workArea.x + d.workArea.width && s.x + s.width - 100 > d.workArea.x && s.y >= d.workArea.y - 10 && s.y < d.workArea.y + d.workArea.height - 60)) { delete s.x; delete s.y; }
  return s;
}
function createMain() {
  const st = windowState();
  const win = new BrowserWindow({
    width: st.width, height: st.height, x: st.x, y: st.y,
    minWidth: 1024, minHeight: 640,
    title: 'airglow',
    backgroundColor: C.bg0,
    show: false,
    frame: process.platform === 'darwin',
    titleBarStyle: 'hidden',
    titleBarOverlay: process.platform === 'win32' ? { color: C.bg0, symbolColor: C.text2, height: 40 } : undefined,
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      webSecurity: false,   // (IPTV servers send no CORS headers and mostly use plain http)
      autoplayPolicy: 'no-user-gesture-required',
      backgroundThrottling: false,
    },
  });
  wins.main = win;
  if (st.maximized) win.maximize();
  win.once('ready-to-show', () => { if (!process.argv.includes('--hidden')) win.show(); });
  const page = TEST && arg('--test-page') ? path.resolve(__dirname, arg('--test-page')) : path.join(__dirname, 'app', 'desktop.html');
  win.loadFile(page);
  guard(win);
  // window memory: bounds (normal), maximised; saved after a rest
  let saveT = 0;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { if (win.isDestroyed() || win.isFullScreen() || win.isMinimized()) return; const b = win.getNormalBounds(); writeJson('window.json', { ...b, maximized: win.isMaximized() }); }, 400); };
  win.on('resize', save); win.on('move', save);
  win.on('close', (e) => {
    if (quitting || SMOKE || TEST) return;
    if (prefs.closeToTray) { e.preventDefault(); toTray(); }
  });
  win.on('closed', () => { wins.main = null; for (const h of [...hosts.values()]) dropHost(h.id); app.quit(); });
  win.on('focus', () => send('win', { focused: true }));
  win.on('blur', () => send('win', { focused: false }));
  win.on('enter-full-screen', () => { send('win', { fullscreen: true }); });
  win.on('leave-full-screen', () => { send('win', { fullscreen: false }); });
  win.on('hide', () => { if (prefs.pauseHidden) send('win', { hidden: true }); });
  win.on('show', () => send('win', { hidden: false }));
  followMoves('main', win);
  return win;
}
const arg = (k) => { const a = process.argv.find((x) => x.startsWith(k + '=')); return a ? a.slice(k.length + 1) : ''; };
function guard(win) {
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
}
const iconPath = () => { const p = path.join(__dirname, 'app', 'desktop', 'img', 'mark-256.png'); return fs.existsSync(p) ? p : undefined; };
// to the main page only (the app's brain lives there)
const send = (ch, data) => { const w = wins.main; if (w && !w.isDestroyed()) w.webContents.send(ch, data); };

// ---------- overlays ----------
function overlayFor(name) {
  const parent = wins[name];
  if (!parent || parent.isDestroyed()) return null;
  let ov = overlays[name];
  if (ov && !ov.isDestroyed()) return ov;
  ov = new BrowserWindow({
    parent, show: false, frame: false, transparent: true, hasShadow: false, skipTaskbar: true, resizable: false, movable: false,
    minimizable: false, maximizable: false, fullscreenable: false, focusable: false, backgroundColor: '#00000000', thickFrame: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, backgroundThrottling: false, additionalArguments: [`--airglow-overlay=${name}`] },
  });
  ov.setIgnoreMouseEvents(true, { forward: true });
  ov.loadFile(path.join(__dirname, 'app', 'desktop', 'overlay.html'), { query: { win: name } });
  guard(ov);
  ov.webContents.once('did-finish-load', () => { ov._ready = true; if (ov._pending) { ov.webContents.send('layers', ov._pending); ov._pending = null; } });
  overlays[name] = ov;
  fitOverlay(name);
  return ov;
}
function fitOverlay(name) {
  const ov = overlays[name], w = wins[name];
  if (!ov || ov.isDestroyed() || !w || w.isDestroyed()) return;
  ov.setBounds(w.getContentBounds());
}
// shown while a picture of that window is (and the window isn't moving, minimised or hidden)
function syncOverlay(name) {
  const w = wins[name];
  const any = [...hosts.values()].some((h) => h.win === name && h.shown);
  const ov = any ? overlayFor(name) : overlays[name];
  if (!ov || ov.isDestroyed()) return;
  const show = any && w && !w.isDestroyed() && w.isVisible() && !w.isMinimized() && !w._moving;
  if (show) { fitOverlay(name); if (!ov.isVisible()) { ov._inside = null; ov.showInactive(); } raiseOverlay(name); pointerOn(); } else if (ov.isVisible()) ov.hide();
}
function raiseOverlay(name) {
  // plan C: the popup hosts sit just under the overlay
  if (PLAN() !== 'C') return;
  const ov = overlays[name];
  if (!ov || ov.isDestroyed()) return;
  for (const h of hosts.values()) if (h.win === name && h.shown) placeHost(h);
}
// windows that move: the overlay hides during a drag or a Snap and comes back after (owned windows don't follow)
function followMoves(name, w) {
  const hide = () => { w._moving = true; const ov = overlays[name]; if (ov && !ov.isDestroyed() && ov.isVisible()) ov.hide(); };
  const done = () => { w._moving = false; for (const h of hosts.values()) if (h.win === name) placeHost(h); syncOverlay(name); };
  let t = 0;
  const later = () => { clearTimeout(t); t = setTimeout(done, 120); };
  w.on('will-move', hide); w.on('will-resize', hide);
  w.on('moved', done); w.on('resized', done);
  w.on('move', () => { if (PLAN() === 'C') for (const h of hosts.values()) if (h.win === name) placeHost(h); if (!w._moving) later(); });
  w.on('resize', () => { fitOverlay(name); if (!w._moving) later(); });
  w.on('minimize', () => syncOverlay(name)); w.on('restore', () => later());
  w.on('maximize', later); w.on('unmaximize', later);
  w.on('enter-full-screen', later); w.on('leave-full-screen', later);
  w.on('hide', () => syncOverlay(name)); w.on('show', later);
}

// ---------- hosts and their mpv ----------
const scaleOf = (w) => screen.getDisplayMatching(w.getBounds()).scaleFactor || 1;
function placeHost(h) {
  const w = wins[h.win];
  if (!h.hwnd || !w || w.isDestroyed()) return;
  if (!h.shown || !h.rect || w.isMinimized()) { W32.place(h.hwnd, null, false); return; }
  const s = scaleOf(w) * (w.webContents.getZoomFactor?.() || 1);
  const r = { x: h.rect.x * s, y: h.rect.y * s, w: h.rect.w * s, h: h.rect.h * s };
  const parent = W32.hwndOf(w);
  if (PLAN() === 'C') {
    const p = W32.clientToScreen(parent, r.x, r.y);
    const ov = overlays[h.win];
    // just under the overlay (so the controls stay over the picture), above the window
    W32.place(h.hwnd, { ...r, x: p.x, y: p.y }, true, w.isAlwaysOnTop());
    if (ov && !ov.isDestroyed() && ov.isVisible()) { if (w.isAlwaysOnTop()) ov.setAlwaysOnTop(true, 'floating'); ov.moveTop(); }
  } else W32.place(h.hwnd, r, true);
}
async function createHost(id, o = {}) {
  if (hosts.has(id)) return { ok: true, plan: PLAN() };
  const winName = o.win || 'main';
  const w = wins[winName];
  if (!w) return { ok: false, error: 'no window' };
  const hwnd = W32.IS_WIN ? W32.createHost(W32.hwndOf(w), PLAN()) : 0;
  if (W32.IS_WIN && !hwnd) return { ok: false, error: 'The picture window could not be made.' };
  if (hwnd) W32.place(hwnd, null, false);
  const mpv = new MpvInstance(id, {
    wid: hwnd || 0, volume: o.volume ?? 100, mute: !!o.mute, ua: userAgent || o.ua || '',
    hwdec: prefs.hwdec === 'off' ? 'no' : 'auto-safe', hdr: !!prefs.hdr, spdif: !!prefs.spdif, audioDevice: prefs.audioDevice,
    vo: process.env.AIRGLOW_VO || (W32.IS_WIN ? '' : o.vo || ''), ao: process.env.AIRGLOW_AO || '',
  });
  const h = { id, win: winName, hwnd, rect: null, shown: false, mpv };
  hosts.set(id, h);
  mpv.on('event', (e) => send('mpv-event', { id, ...e }));
  const r = await mpv.start();
  if (!r.ok) { dropHost(id); return { ok: false, error: r.error === 'missing' ? 'missing' : r.error }; }
  tickOn();
  return { ok: true, plan: PLAN(), hwnd };
}
function dropHost(id) {
  const h = hosts.get(id);
  if (!h) return;
  hosts.delete(id);
  try { h.mpv.quit(); } catch { /* gone */ }
  const hw = h.hwnd;
  if (hw) setTimeout(() => W32.destroy(hw), 900);   // (after mpv let go of it)
  syncOverlay(h.win);
}
// the time and the cache of every picture, 4 a second, in one message
let tickT = 0;
function tickOn() {
  if (tickT) return;
  tickT = setInterval(() => {
    if (!hosts.size) { clearInterval(tickT); tickT = 0; return; }
    const out = {};
    for (const h of hosts.values()) { const s = h.mpv.state; out[h.id] = { t: s.t, d: s.d, cache: s.cache, buffering: s.buffering, bufPct: s.bufPct, pause: s.pause }; }
    send('mpv-tick', out);
  }, 250);
}
function moveHost(id, toWin) {
  const h = hosts.get(id), to = wins[toWin];
  if (!h || !to || to.isDestroyed()) return false;
  const from = h.win;
  if (h.hwnd) W32.reparent(h.hwnd, W32.hwndOf(to), PLAN());
  h.win = toWin;
  placeHost(h);
  syncOverlay(from); syncOverlay(toWin);
  return true;
}

ipcMain.handle('mpv:create', (_, id, o) => createHost(String(id), o || {}));
ipcMain.handle('mpv:load', async (_, id, o) => { const h = hosts.get(String(id)); return h ? h.mpv.load({ ...o, ua: o?.ua || userAgent }) : { ok: false, error: 'no picture' }; });
ipcMain.handle('mpv:cmd', (_, id, args) => hosts.get(String(id))?.mpv.command(Array.isArray(args) ? args.map((a) => (typeof a === 'number' ? a : String(a))) : []) || null);
ipcMain.handle('mpv:set', (_, id, k, v) => hosts.get(String(id))?.mpv.set(String(k), v) || null);
ipcMain.handle('mpv:get', (_, id, k) => hosts.get(String(id))?.mpv.get(String(k)) ?? null);
ipcMain.handle('mpv:state', (_, id) => hosts.get(String(id))?.mpv.snapshot() || null);
ipcMain.handle('mpv:quit', (_, id) => dropHost(String(id)));
ipcMain.handle('mpv:available', () => !!mpvBin());
ipcMain.handle('mpv:probe', (_, url) => probe(String(url), { ua: userAgent }));
ipcMain.on('host:rect', (_, id, rect) => {
  const h = hosts.get(String(id));
  if (!h) return;
  h.rect = rect && rect.w > 1 && rect.h > 1 ? rect : h.rect;
  h.shown = !!rect && rect.w > 1 && rect.h > 1;
  placeHost(h);
  syncOverlay(h.win);
});
ipcMain.handle('host:move', (_, id, toWin) => moveHost(String(id), String(toWin)));

// the overlay's layers (from the main page) and its pointer (back to the main page)
ipcMain.on('overlay:layers', (_, name, payload) => {
  const ov = overlayFor(String(name));
  if (!ov) return;
  if (!ov._ready) { ov._pending = payload; return; }
  ov.webContents.send('layers', payload);
});
ipcMain.on('overlay:input', (e, ev) => send('overlay-input', ev));
// The pointer: main hit-tests the cursor against what the overlay drew (its hits) and the pictures, 25 times a second
// while an overlay is up, and lets the pointer through everywhere else (setIgnoreMouseEvents with forward). No move
// is needed before a click, and a drag (the track, the mini window) holds the pointer until the button is let go.
ipcMain.on('overlay:hits', (e, rects) => { const ov = BrowserWindow.fromWebContents(e.sender); if (ov) { ov._hits = Array.isArray(rects) ? rects : []; pointerOn(); } });
ipcMain.on('overlay:hold', (e, on) => { const ov = BrowserWindow.fromWebContents(e.sender); if (ov) ov._hold = !!on; });
let pointerT = 0;
function pointerOn() {
  if (pointerT) return;
  pointerT = setInterval(() => {
    const live = Object.entries(overlays).filter(([, ov]) => ov && !ov.isDestroyed() && ov.isVisible());
    if (!live.length) { clearInterval(pointerT); pointerT = 0; return; }
    const c = screen.getCursorScreenPoint();
    for (const [name, ov] of live) {
      const b = ov.getBounds(), x = c.x - b.x, y = c.y - b.y;
      const within = x >= 0 && y >= 0 && x < b.width && y < b.height;
      const inside = ov._hold || (within && (ov._hits || []).some(([l, t, w, h]) => x >= l && y >= t && x < l + w && y < t + h));
      if (inside !== ov._inside) { ov._inside = inside; ov.setIgnoreMouseEvents(!inside, { forward: true }); }
      // the pointer's moves over this window (the controls show, the cursor hides after 3 s): only when it moved
      const key = `${c.x},${c.y}`;
      if (within && key !== ov._last) { ov._last = key; send('overlay-input', { win: name, kind: 'move', x, y, over: inside }); }
      else if (!within) ov._last = '';
    }
  }, 40);
}

// ---------- the window's own verbs ----------
ipcMain.handle('win:state', () => { const w = wins.main; return w ? { maximized: w.isMaximized(), fullscreen: w.isFullScreen(), focused: w.isFocused(), plan: PLAN(), scale: scaleOf(w), platform: process.platform } : null; });
ipcMain.on('win:fullscreen', (_, on) => { const w = wins.main; if (w) w.setFullScreen(on == null ? !w.isFullScreen() : !!on); });
ipcMain.on('win:minimize', () => wins.main?.minimize());
ipcMain.on('win:tray', () => toTray());
ipcMain.on('win:focus', () => { const w = wins.main; if (w) { if (w.isMinimized()) w.restore(); w.show(); w.focus(); } });
ipcMain.on('win:titlebar', (_, o) => { try { wins.main?.setTitleBarOverlay?.({ color: o?.color || C.bg0, symbolColor: o?.symbol || C.text2, height: o?.height ?? 40 }); } catch { /* not Windows */ } });

// the mini player (SPEC 6.1, 9): a frameless, always-on-top window of its own; its page is black, the picture's host
// is moved into it and its chrome is drawn by its overlay
const MINI = { w: 480, h: 270 };
function miniBounds() {
  const s = readJson('mini.json', {});
  const wa = screen.getDisplayMatching(wins.main?.getBounds() || { x: 0, y: 0, width: 1, height: 1 }).workArea;
  const w = Math.max(320, s.width || MINI.w), h = Math.round(w * 9 / 16);
  let x = s.x ?? wa.x + wa.width - w - 24, y = s.y ?? wa.y + wa.height - h - 24;
  if (!screen.getAllDisplays().some((d) => x >= d.workArea.x - 10 && x < d.workArea.x + d.workArea.width - 40 && y >= d.workArea.y - 10 && y < d.workArea.y + d.workArea.height - 40)) { x = wa.x + wa.width - w - 24; y = wa.y + wa.height - h - 24; }
  return { x, y, width: w, height: h };
}
function openMini() {
  if (wins.mini && !wins.mini.isDestroyed()) return wins.mini;
  const b = miniBounds();
  const m = new BrowserWindow({
    ...b, minWidth: 320, minHeight: 180, frame: false, resizable: true, skipTaskbar: true, show: false, alwaysOnTop: !!prefs.miniOnTop,
    backgroundColor: '#000000', title: 'airglow · mini player', fullscreenable: false, maximizable: false, minimizable: false, thickFrame: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  if (prefs.miniOnTop) m.setAlwaysOnTop(true, 'floating');
  m.setAspectRatio(16 / 9);
  m.loadFile(path.join(__dirname, 'app', 'desktop', 'mini.html'));
  guard(m);
  m.once('ready-to-show', () => m.showInactive());
  wins.mini = m;
  followMoves('mini', m);
  const save = () => { if (!m.isDestroyed()) writeJson('mini.json', m.getBounds()); };
  m.on('moved', save); m.on('resized', () => { save(); send('mini', { size: m.getContentBounds() }); });
  m.on('closed', () => { wins.mini = null; const ov = overlays.mini; if (ov && !ov.isDestroyed()) ov.destroy(); delete overlays.mini; send('mini', { closed: true }); });
  return m;
}
ipcMain.handle('mini:open', async () => {
  const m = openMini();
  if (!m.webContents.isLoading()) return m.getContentBounds();
  await new Promise((r) => m.webContents.once('did-finish-load', r));
  return m.getContentBounds();
});
ipcMain.on('mini:close', () => { const m = wins.mini; if (m && !m.isDestroyed()) m.close(); });
ipcMain.on('mini:top', (_, on) => { const m = wins.mini; if (m) m.setAlwaysOnTop(!!on, 'floating'); });
// the corners (Ctrl Shift ← →, and a drop within 24 px of one)
ipcMain.on('mini:snap', (_, dir) => {
  const m = wins.mini;
  if (!m) return;
  const b = m.getBounds(), wa = screen.getDisplayMatching(b).workArea, g = 24;
  const corners = [[wa.x + g, wa.y + g], [wa.x + wa.width - b.width - g, wa.y + g], [wa.x + wa.width - b.width - g, wa.y + wa.height - b.height - g], [wa.x + g, wa.y + wa.height - b.height - g]];
  let i = corners.reduce((best, c, k) => (Math.hypot(c[0] - b.x, c[1] - b.y) < Math.hypot(corners[best][0] - b.x, corners[best][1] - b.y) ? k : best), 0);
  i = (i + (dir === 'left' ? 3 : 1)) % 4;
  m.setBounds({ ...b, x: corners[i][0], y: corners[i][1] }, true);
  writeJson('mini.json', m.getBounds());
});
// dragging the mini window by its strip: the overlay says down and up, main follows the pointer between them
let drag = null;
ipcMain.on('mini:drag', (_, phase) => {
  const m = wins.mini;
  if (!m) return;
  if (phase === 'start') {
    const c = screen.getCursorScreenPoint(), b = m.getBounds();
    clearInterval(drag?.t);
    drag = { dx: c.x - b.x, dy: c.y - b.y, t: setInterval(() => {
      if (m.isDestroyed()) { clearInterval(drag.t); drag = null; return; }
      const p = screen.getCursorScreenPoint(), bb = m.getBounds();
      m.setBounds({ ...bb, x: p.x - drag.dx, y: p.y - drag.dy });
      fitOverlay('mini');
    }, 16) };
  } else if (drag) {
    clearInterval(drag.t); drag = null;
    const b = m.getBounds(), wa = screen.getDisplayMatching(b).workArea, g = 24;
    // snaps to a corner within 24 px
    const nx = Math.abs(b.x - wa.x) < 48 ? wa.x + g : Math.abs(wa.x + wa.width - b.x - b.width) < 48 ? wa.x + wa.width - b.width - g : b.x;
    const ny = Math.abs(b.y - wa.y) < 48 ? wa.y + g : Math.abs(wa.y + wa.height - b.y - b.height) < 48 ? wa.y + wa.height - b.height - g : b.y;
    m.setBounds({ ...b, x: nx, y: ny });
    fitOverlay('mini');
    writeJson('mini.json', m.getBounds());
  }
});

// ---------- the tray, notifications and reminders, media keys ----------
let tray = null, trayNext = null;
function trayIcon() { const p = path.join(__dirname, 'app', 'desktop', 'img', 'tray-32.png'); return fs.existsSync(p) ? nativeImage.createFromPath(p) : nativeImage.createEmpty(); }
function buildTray() {
  if (!tray) {
    try { tray = new Tray(trayIcon()); } catch { tray = null; return; }
    tray.setToolTip('airglow');
    tray.on('click', () => showMain());
  }
  const items = [];
  if (trayNext?.label) items.push({ label: trayNext.label, enabled: false }, { label: trayNext.verb || 'Watch', click: () => { showMain(); send('action', trayNext.action); } }, { type: 'separator' });
  items.push({ label: 'Open airglow', click: () => showMain() }, { label: 'Multiview', click: () => { showMain(); send('action', { kind: 'multiview' }); } }, { type: 'separator' }, { label: 'Quit', click: () => { quitting = true; app.quit(); } });
  tray.setContextMenu(Menu.buildFromTemplate(items));
}
function toTray() { buildTray(); wins.main?.hide(); }
function showMain() { const w = wins.main; if (!w) { createMain(); return; } if (w.isMinimized()) w.restore(); w.show(); w.focus(); }
ipcMain.on('tray:update', (_, o) => { trayNext = o && o.label ? o : null; if (tray) buildTray(); });

// a Windows notification; its text is what the page wrote (the masked name under the shield), never edited after
function notify({ title, body, action, silent }) {
  if (!prefs.notifications || !Notification.isSupported()) return false;
  const n = new Notification({ title: String(title || 'airglow'), body: String(body || ''), silent: !!silent, icon: iconPath() });
  n.on('click', () => { showMain(); if (action) send('action', action); });
  n.show();
  return true;
}
ipcMain.handle('notify', (_, o) => notify(o || {}));
// reminders: [{ id, at (ms), title, body, action }], kept in userData and re-armed at launch and after sleep
let reminders = readJson('reminders.json', { list: [] }).list || [];
const timers = new Map();
function arm() {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  const now = Date.now();
  reminders = reminders.filter((r) => r.at > now - 30 * 60e3);
  for (const r of reminders) {
    const ms = r.at - now;
    if (ms > 2 ** 31 - 1) continue;
    timers.set(r.id, setTimeout(() => { notify(r); reminders = reminders.filter((x) => x.id !== r.id); writeJson('reminders.json', { list: reminders }); send('reminders', reminders); }, Math.max(0, ms)));
  }
  writeJson('reminders.json', { list: reminders });
}
ipcMain.handle('reminders:list', () => reminders);
ipcMain.handle('reminders:set', (_, r) => { if (!r?.id || !(r.at > 0)) return reminders; reminders = [...reminders.filter((x) => x.id !== r.id), { id: String(r.id), at: +r.at, title: String(r.title || ''), body: String(r.body || ''), action: r.action || null }]; arm(); return reminders; });
ipcMain.handle('reminders:clear', (_, id) => { reminders = reminders.filter((x) => x.id !== id); arm(); return reminders; });
// media keys only while airglow plays (never taken from Spotify or the browser while idle)
const MEDIA = { MediaPlayPause: 'playpause', MediaNextTrack: 'next', MediaPreviousTrack: 'prev', MediaStop: 'stop' };
let mediaOn = false;
ipcMain.on('media:keys', (_, on) => {
  if (!!on === mediaOn) return;
  mediaOn = !!on;
  for (const [k, v] of Object.entries(MEDIA)) {
    try { if (on) globalShortcut.register(k, () => send('media-key', v)); else globalShortcut.unregister(k); } catch { /* taken by another app */ }
  }
});

// ---------- prefs, files, start with Windows ----------
ipcMain.handle('prefs:get', () => prefs);
ipcMain.handle('prefs:set', (_, patch) => {
  prefs = { ...prefs, ...(patch || {}) };
  writeJson('desktop.json', prefs);
  if (patch && 'startWithWindows' in patch && process.platform === 'win32') app.setLoginItemSettings({ openAtLogin: !!prefs.startWithWindows, args: ['--hidden'] });
  if (patch && 'miniOnTop' in patch && wins.mini) wins.mini.setAlwaysOnTop(!!prefs.miniOnTop, 'floating');
  return prefs;
});
ipcMain.handle('files:mpvConf', () => {
  const dir = userFile('mpv'), f = path.join(dir, 'mpv.conf');
  try { fs.mkdirSync(dir, { recursive: true }); if (!fs.existsSync(f)) fs.writeFileSync(f, '# Your own mpv options for airglow (https://mpv.io/manual/stable/). airglow sets the window, the keys and the cache itself.\n'); } catch { /* read-only */ }
  return shell.openPath(f);
});
ipcMain.handle('audio:devices', () => new Promise((resolve) => {
  if (!mpvBin()) return resolve([]);
  const p = spawn(mpvBin(), ['--no-config', '--audio-device=help'], { windowsHide: true });
  let out = '';
  p.stdout.on('data', (d) => { out += d; });
  p.on('exit', () => resolve(out.split('\n').map((l) => /^\s*'([^']+)'\s*\((.*)\)\s*$/.exec(l)).filter(Boolean).map((m) => ({ id: m[1], name: m[2] }))));
  p.on('error', () => resolve([]));
}));
ipcMain.handle('open-external', (_, url) => { if (typeof url === 'string' && /^https:\/\//.test(url)) return shell.openExternal(url); return false; });
ipcMain.handle('displays', () => screen.getAllDisplays().map((d) => ({ id: d.id, bounds: d.bounds, scale: d.scaleFactor, primary: d.id === screen.getPrimaryDisplay().id })));

// mpv's own window, outside the app (the title page's ⋯ > Open in mpv's own window)
ipcMain.handle('open-external-player', (_, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//.test(url) || !mpvBin()) return false;
  const a = ['--force-window=immediate', '--title=${media-title} · airglow'];
  if (userAgent) a.push(`--user-agent=${userAgent}`);
  const p = spawn(mpvBin(), [...a, url], { detached: true, stdio: 'ignore' });
  p.unref();
  return true;
});

// ---------- updates (electron-updater from the GitHub release, as before) ----------
let updateStatus = { state: 'idle' };
function setUpdateStatus(s) { updateStatus = s; send('update-status', s); }
function setupUpdates() {
  if (!app.isPackaged) { updateStatus = { state: 'dev' }; return null; }
  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => setUpdateStatus({ state: 'checking' }));
  autoUpdater.on('update-not-available', () => setUpdateStatus({ state: 'current' }));
  autoUpdater.on('update-available', (i) => setUpdateStatus({ state: 'downloading', version: i.version, percent: 0 }));
  autoUpdater.on('download-progress', (p) => setUpdateStatus({ ...updateStatus, state: 'downloading', percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', (i) => { setUpdateStatus({ state: 'ready', version: i.version }); });
  autoUpdater.on('error', (e) => setUpdateStatus({ state: 'error', message: String(e?.message || e).split('\n')[0] }));
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 5000);
  setInterval(check, 4 * 60 * 60 * 1000);
  return { check, install: () => { quitting = true; for (const h of [...hosts.values()]) dropHost(h.id); autoUpdater.quitAndInstall(true, true); } };
}
let updates = null;
ipcMain.handle('app-version', () => app.getVersion());
ipcMain.handle('update-status', () => updateStatus);
ipcMain.handle('update-check', () => updates?.check());
ipcMain.handle('update-install', () => updates?.install());
ipcMain.on('set-ua', (_, ua) => { userAgent = String(ua || '').trim(); });
ipcMain.on('app:quit', () => { quitting = true; app.quit(); });
app.on('before-quit', () => { quitting = true; for (const h of [...hosts.values()]) dropHost(h.id); });
app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch { /* none */ } });

// Strip browser-only headers some panels reject, and apply the provider's user agent.
function installHeaderRewrite() {
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ['http://*/*', 'https://*/*'] }, (d, cb) => {
    const h = d.requestHeaders;
    delete h.Origin;
    delete h.Referer;
    if (userAgent) h['User-Agent'] = userAgent;
    cb({ requestHeaders: h });
  });
}

// `airglow --smoke-test`: CI proves the packaged app loads its page and its bundled mpv runs.
async function smokeTest() {
  const win = wins.main;
  const fail = (msg) => { console.error('SMOKE FAIL: ' + msg); app.exit(1); };
  const timer = setTimeout(() => fail('timed out'), 60000);
  const errors = [];
  win.webContents.on('console-message', (e, level, message) => { if ((e.level ?? level) === 'error' || level === 3) errors.push(e.message ?? message); });
  await new Promise((r) => win.webContents.once('did-finish-load', r));
  let page = null;
  for (let i = 0; i < 40 && !page?.ready; i++) { await new Promise((r) => setTimeout(r, 250)); page = await win.webContents.executeJavaScript('({ ready: !!window.__desktopReady, core: !!window.Core, screen: document.body.dataset.screen || "" })').catch(() => null); }
  if (!page?.ready || !page.core) return fail('page did not load: ' + JSON.stringify(page) + ' ' + errors.join('; '));
  if (!mpvBin()) return fail('mpv not found');
  const v = require('child_process').spawnSync(mpvBin(), ['--no-config', '--version'], { encoding: 'utf8' });
  if (v.status !== 0) return fail('mpv did not run: ' + (v.stderr || v.error));
  let koffi = 'n/a';
  if (W32.IS_WIN) { try { koffi = W32.available() ? 'ok' : 'missing'; } catch (e) { koffi = 'error ' + e.message; } if (koffi !== 'ok') return fail('koffi: ' + koffi); }
  clearTimeout(timer);
  console.log('SMOKE OK: ' + v.stdout.split('\n')[0] + ' | koffi ' + koffi + ' | screen ' + page.screen + (errors.length ? ' | console errors: ' + errors.join('; ') : ''));
  app.exit(0);
}

app.on('second-instance', (_, argv) => { showMain(); const a = argv.find((x) => x.startsWith('--action=')); if (a) { try { send('action', JSON.parse(decodeURIComponent(a.slice(9)))); } catch { /* not ours */ } } });

app.whenReady().then(() => {
  installHeaderRewrite();
  createMain();
  arm();
  powerMonitor.on('resume', () => { arm(); send('resume', true); });
  if (SMOKE) smokeTest();
  else updates = setupUpdates();
  if (prefs.closeToTray && !SMOKE && !TEST) buildTray();
  app.on('activate', () => { if (!wins.main) createMain(); });
  if (TEST) global.__airglow = { wins, overlays, hosts, W32, plan: PLAN, placeHost, moveHost, openMini, prefs: () => prefs, reminders: () => reminders, state: (id) => hosts.get(id)?.mpv.snapshot() || null, info: (id) => (hosts.get(id) ? W32.info(hosts.get(id).hwnd) : null), dialog };
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
