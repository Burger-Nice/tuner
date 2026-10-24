const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tuner', {
  platform: process.platform,
  setUserAgent: (ua) => ipcRenderer.send('set-ua', ua),
  openExternalPlayer: (url) => ipcRenderer.invoke('open-external-player', url),
  mpv: {
    available: () => ipcRenderer.invoke('mpv-available'),
    play: (opts) => ipcRenderer.invoke('mpv-play', opts),
    stop: () => ipcRenderer.invoke('mpv-stop'),
    command: (args) => ipcRenderer.invoke('mpv-command', args),
    onEvent: (fn) => ipcRenderer.on('mpv-event', (_, e) => fn(e)),
  },
});
