// window.tuner: the Windows app's whole surface to main (SPEC 9), IPC only (contextIsolation and the sandbox stay on).
// The main page (app/desktop.html), the overlays (app/desktop/overlay.html) and the mini window's page share it.
const { contextBridge, ipcRenderer } = require('electron');

const on = (ch) => (fn) => { const f = (_, d) => fn(d); ipcRenderer.on(ch, f); return () => ipcRenderer.removeListener(ch, f); };
const overlayArg = process.argv.find((a) => a.startsWith('--airglow-overlay='));

contextBridge.exposeInMainWorld('tuner', {
  platform: process.platform,
  desktop: true,
  setUserAgent: (ua) => ipcRenderer.send('set-ua', ua),
  version: () => ipcRenderer.invoke('app-version'),
  quit: () => ipcRenderer.send('app:quit'),
  // airglow accounts (design/ui-v1/accounts-v1/SPEC.md 5.7): the data key and refresh token under Windows' DPAPI
  // (Electron's safeStorage), in userData; the page gets them into memory only
  secret: {
    get: (key) => ipcRenderer.invoke('secret:get', key),
    set: (key, value) => ipcRenderer.invoke('secret:set', key, value),
    clear: (key) => ipcRenderer.invoke('secret:clear', key),
  },
  updates: {
    status: () => ipcRenderer.invoke('update-status'),
    check: () => ipcRenderer.invoke('update-check'),
    install: () => ipcRenderer.invoke('update-install'),
    onStatus: on('update-status'),
  },
  mpv: {
    available: () => ipcRenderer.invoke('mpv:available'),
    create: (id, o) => ipcRenderer.invoke('mpv:create', id, o),
    load: (id, o) => ipcRenderer.invoke('mpv:load', id, o),
    command: (id, args) => ipcRenderer.invoke('mpv:cmd', id, args),
    set: (id, k, v) => ipcRenderer.invoke('mpv:set', id, k, v),
    get: (id, k) => ipcRenderer.invoke('mpv:get', id, k),
    state: (id) => ipcRenderer.invoke('mpv:state', id),
    quit: (id) => ipcRenderer.invoke('mpv:quit', id),
    probe: (url) => ipcRenderer.invoke('mpv:probe', url),
    onEvent: on('mpv-event'),
    onTick: on('mpv-tick'),
  },
  host: {
    rect: (id, r) => ipcRenderer.send('host:rect', id, r),
    moveTo: (id, win) => ipcRenderer.invoke('host:move', id, win),
  },
  overlay: {
    // the main page: what the overlay of a window draws, and the pointer it sends back
    layers: (win, payload) => ipcRenderer.send('overlay:layers', win, payload),
    onInput: on('overlay-input'),
    // the overlay page itself
    name: overlayArg ? overlayArg.split('=')[1] : '',
    onLayers: on('layers'),
    input: (ev) => ipcRenderer.send('overlay:input', ev),
    hits: (rects) => ipcRenderer.send('overlay:hits', rects),
    hold: (on) => ipcRenderer.send('overlay:hold', on),
  },
  win: {
    state: () => ipcRenderer.invoke('win:state'),
    fullscreen: (on) => ipcRenderer.send('win:fullscreen', on),
    minimize: () => ipcRenderer.send('win:minimize'),
    tray: () => ipcRenderer.send('win:tray'),
    focus: () => ipcRenderer.send('win:focus'),
    titlebar: (o) => ipcRenderer.send('win:titlebar', o),
    onState: on('win'),
  },
  mini: {
    open: () => ipcRenderer.invoke('mini:open'),
    close: () => ipcRenderer.send('mini:close'),
    top: (on) => ipcRenderer.send('mini:top', on),
    snap: (dir) => ipcRenderer.send('mini:snap', dir),
    drag: (phase) => ipcRenderer.send('mini:drag', phase),
    onState: on('mini'),
  },
  notify: (o) => ipcRenderer.invoke('notify', o),
  reminders: {
    list: () => ipcRenderer.invoke('reminders:list'),
    set: (r) => ipcRenderer.invoke('reminders:set', r),
    clear: (id) => ipcRenderer.invoke('reminders:clear', id),
    onChange: on('reminders'),
  },
  tray: { update: (o) => ipcRenderer.send('tray:update', o) },
  media: { keys: (on) => ipcRenderer.send('media:keys', on), onKey: on('media-key') },
  prefs: { get: () => ipcRenderer.invoke('prefs:get'), set: (p) => ipcRenderer.invoke('prefs:set', p) },
  files: { mpvConf: () => ipcRenderer.invoke('files:mpvConf') },
  audioDevices: () => ipcRenderer.invoke('audio:devices'),
  displays: () => ipcRenderer.invoke('displays'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openExternalPlayer: (url) => ipcRenderer.invoke('open-external-player', url),
  onAction: on('action'),
  onResume: on('resume'),
});
