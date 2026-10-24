const { app, BrowserWindow, session, shell, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { Mpv } = require('./mpv');

// Drop the app/Electron tokens so servers see an ordinary Chrome user agent.
app.userAgentFallback = app.userAgentFallback.replace(/ (tuner|Tuner)\/\S+| Electron\/\S+/g, '');

let userAgent = '';
let mpv = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: 'Tuner',
    backgroundColor: '#0b0d11',
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      // IPTV servers send no CORS headers and mostly use plain http, so the page needs this to reach them.
      webSecurity: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  mpv = new Mpv(win);
  win.on('closed', () => { mpv.stop(); mpv = null; });
}

ipcMain.handle('mpv-available', () => !!mpv?.available);
ipcMain.handle('mpv-play', (_, opts) => (mpv ? mpv.play(opts) : { ok: false, error: 'The player is not ready.' }));
ipcMain.handle('mpv-stop', () => mpv?.stop());
ipcMain.handle('mpv-command', (_, args) => mpv?.command(args));
app.on('before-quit', () => mpv?.stop());

// Strip browser-only headers some panels reject, and apply the custom user agent.
function installHeaderRewrite() {
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ['http://*/*', 'https://*/*'] }, (d, cb) => {
    const h = d.requestHeaders;
    delete h.Origin;
    delete h.Referer;
    if (userAgent) h['User-Agent'] = userAgent;
    cb({ requestHeaders: h });
  });
}

ipcMain.on('set-ua', (_, ua) => { userAgent = String(ua || '').trim(); });

function playerCandidates() {
  if (process.platform === 'win32') {
    return [
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'VideoLAN', 'VLC', 'vlc.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'VideoLAN', 'VLC', 'vlc.exe'),
      'vlc', 'mpv',
    ];
  }
  if (process.platform === 'darwin') {
    return ['/Applications/VLC.app/Contents/MacOS/VLC', '/opt/homebrew/bin/mpv', '/usr/local/bin/mpv', '/opt/homebrew/bin/vlc', '/usr/local/bin/vlc'];
  }
  return ['vlc', 'mpv', '/snap/bin/vlc', '/usr/bin/flatpak'];
}

function trySpawn(bin, url) {
  if (path.isAbsolute(bin) && !fs.existsSync(bin)) return Promise.resolve(false);
  const args = bin.endsWith('flatpak') ? ['run', 'org.videolan.VLC', url] : [url];
  return new Promise((resolve) => {
    try {
      const p = spawn(bin, args, { detached: true, stdio: 'ignore' });
      p.once('error', () => resolve(false));
      p.once('spawn', () => { p.unref(); resolve(true); });
    } catch {
      resolve(false);
    }
  });
}

ipcMain.handle('open-external-player', async (_, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return false;
  for (const bin of playerCandidates()) if (await trySpawn(bin, url)) return true;
  return false;
});

// `Tuner --smoke-test`: used by the CI build to prove the packaged app loads and its bundled mpv runs.
async function smokeTest() {
  const win = BrowserWindow.getAllWindows()[0];
  const fail = (msg) => { console.error('SMOKE FAIL: ' + msg); app.exit(1); };
  const timer = setTimeout(() => fail('timed out'), 60000);
  const errors = [];
  win.webContents.on('console-message', (e, level, message) => {
    if ((e.level ?? level) === 'error' || level === 3) errors.push(e.message ?? message);
  });
  await new Promise((r) => win.webContents.once('did-finish-load', r));
  const page = await win.webContents.executeJavaScript('({ hls: !!window.Hls, mpegts: !!window.mpegts, core: !!window.Core, login: !document.querySelector("#login").hidden })');
  if (!page.hls || !page.mpegts || !page.core || !page.login) return fail('page did not load: ' + JSON.stringify(page));
  if (!mpv?.available) return fail('mpv not found');
  const v = require('child_process').spawnSync(mpv.bin, ['--no-config', '--version'], { encoding: 'utf8' });
  if (v.status !== 0) return fail('mpv did not run: ' + (v.stderr || v.error));
  clearTimeout(timer);
  console.log('SMOKE OK: ' + v.stdout.split('\n')[0] + (errors.length ? ' | console errors: ' + errors.join('; ') : ''));
  app.exit(0);
}

app.whenReady().then(() => {
  installHeaderRewrite();
  createWindow();
  if (process.argv.includes('--smoke-test')) smokeTest();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
