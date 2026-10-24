// Runs mpv as Tuner's full player. mpv plays what Chromium can't: HEVC, AC3/DTS audio, MKV, subtitles, extra audio tracks.
// It opens as a borderless window laid exactly over Tuner and is driven over mpv's JSON IPC.
const { app, screen } = require('electron');
const { spawn, spawnSync } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');
const os = require('os');

const IS_WIN = process.platform === 'win32';

function findMpv() {
  const exe = IS_WIN ? 'mpv.exe' : 'mpv';
  const bundled = [app.isPackaged && path.join(process.resourcesPath, 'mpv', exe), path.join(__dirname, 'vendor', 'mpv', exe)];
  for (const p of bundled) if (p && fs.existsSync(p)) return p;
  // Fall back to an mpv the user installed themselves.
  const which = spawnSync(IS_WIN ? 'where' : 'which', ['mpv'], { encoding: 'utf8' });
  const found = which.status === 0 && which.stdout.split(/\r?\n/)[0].trim();
  if (found) return found;
  for (const p of ['/opt/homebrew/bin/mpv', '/usr/local/bin/mpv', '/Applications/mpv.app/Contents/MacOS/mpv']) if (fs.existsSync(p)) return p;
  return null;
}

const scriptPath = () => (app.isPackaged ? path.join(process.resourcesPath, 'player', 'tuner.lua') : path.join(__dirname, 'player', 'tuner.lua'));

class Mpv {
  constructor(win) {
    this.win = win;
    this.bin = findMpv();
    this.proc = null;
    this.sock = null;
    this.session = 0;
  }

  get available() { return !!this.bin; }

  emit(evt) { if (!this.win.isDestroyed()) this.win.webContents.send('mpv-event', evt); }

  command(args, requestId) {
    if (!this.sock || this.sock.destroyed) return;
    const msg = { command: args };
    if (requestId) msg.request_id = requestId;
    this.sock.write(JSON.stringify(msg) + '\n');
  }

  // entries: [{ url, title, startAt }]
  async play({ mode = 'vod', entries, index = 0, ua = '' }) {
    if (!this.bin) return { ok: false, error: 'mpv is not installed.' };
    this.stop();
    const session = ++this.session;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuner-'));
    const list = path.join(dir, 'list.m3u8');
    fs.writeFileSync(list, '#EXTM3U\n' + entries.map((e) => `#EXTINF:-1,${String(e.title).replace(/[\r\n]+/g, ' ')}\n${e.url}`).join('\n') + '\n');
    const ipc = IS_WIN ? `\\\\.\\pipe\\tuner-mpv-${process.pid}-${session}` : path.join(dir, 'ipc.sock');

    // Cover Tuner's content area exactly. mpv wants physical pixels; Electron gives DIPs.
    const dip = this.win.getContentBounds();
    const b = IS_WIN ? screen.dipToScreenRect(this.win, dip) : dip;
    const live = mode === 'live';
    const args = [
      '--no-config',
      `--input-ipc-server=${ipc}`,
      `--script=${scriptPath()}`,
      `--script-opts=tuner-mode=${mode},osc-layout=bottombar,osc-seekbarstyle=bar,osc-hidetimeout=1500,osc-deadzonesize=0.5,osc-boxalpha=60`,
      '--force-window=immediate',
      '--no-border',
      `--geometry=${b.width}x${b.height}+${b.x}+${b.y}`,
      '--keepaspect-window=no',
      '--title=${media-title} · Tuner',
      '--hwdec=auto-safe',
      `--osd-font=${IS_WIN ? 'Segoe UI' : 'sans-serif'}`,
      '--osd-font-size=38',
      '--osd-border-size=2',
      '--cache=yes',
      '--demuxer-max-bytes=200MiB',
      '--network-timeout=20',
      '--msg-level=all=error',
      `--playlist=${list}`,
      `--playlist-start=${index}`,
    ];
    if (this.win.isFullScreen()) args.push('--fullscreen');
    if (ua) args.push(`--user-agent=${ua}`);
    if (live) args.push('--loop-playlist=inf', '--stream-lavf-o=reconnect=1,reconnect_streamed=1,reconnect_delay_max=5');

    const st = (this.state = { session, entries, played: false, index, t: null, d: null, loaded: false, error: '', stderr: '' });
    let proc;
    try {
      proc = this.proc = spawn(this.bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (e) {
      return { ok: false, error: `Could not start mpv: ${e.message}` };
    }
    proc.stderr.on('data', (d) => { st.stderr = (st.stderr + d).slice(-2000); });
    const started = await new Promise((resolve) => {
      proc.once('error', (e) => resolve(e));
      proc.once('spawn', () => resolve(null));
    });
    if (started) { this.proc = null; return { ok: false, error: `Could not start mpv: ${started.message}` }; }

    const tick = setInterval(() => {
      if (st.loaded && st.t != null) this.emit({ type: 'progress', session, index: st.index, t: st.t, d: st.d });
    }, 1000);

    proc.once('exit', (code) => {
      clearInterval(tick);
      if (this.proc === proc) { this.proc = null; this.sock = null; }
      let error = null;
      if (!st.played) error = st.error || st.stderr.trim().split('\n').pop() || (code ? `mpv stopped (code ${code}).` : 'Nothing could be played.');
      this.emit({ type: 'exit', session, index: st.index, t: st.t, d: st.d, played: st.played, error });
      fs.rm(dir, { recursive: true, force: true }, () => {});
      if (!this.win.isDestroyed()) this.win.focus();
    });

    this.connect(ipc, proc, st);
    return { ok: true, session };
  }

  async connect(ipc, proc, st) {
    for (let i = 0; i < 50 && this.proc === proc; i++) {
      const sock = await new Promise((resolve) => {
        const s = net.connect(ipc);
        s.once('connect', () => resolve(s));
        s.once('error', () => resolve(null));
      });
      if (sock) {
        if (this.proc !== proc) { sock.destroy(); return; }
        this.sock = sock;
        this.listen(sock, st);
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  listen(sock, st) {
    let buf = '';
    sock.setEncoding('utf8');
    sock.on('error', () => {});
    sock.on('data', (chunk) => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }
        this.handle(msg, st);
      }
    });
    this.command(['observe_property', 1, 'time-pos']);
    this.command(['observe_property', 2, 'duration']);
  }

  handle(msg, st) {
    if (msg.event === 'property-change') {
      if (msg.id === 1 && typeof msg.data === 'number') st.t = msg.data;
      if (msg.id === 2 && typeof msg.data === 'number') st.d = msg.data;
    } else if (msg.event === 'file-loaded') {
      // Ask which entry this is; the reply (request 7) finishes the setup.
      this.command(['get_property', 'playlist-pos'], 7);
    } else if (msg.event === 'end-file') {
      if (st.loaded && st.t != null) this.emit({ type: 'progress', session: st.session, index: st.index, t: st.t, d: st.d, final: true });
      st.loaded = false;
      st.t = st.d = null;
      if (msg.reason === 'error') {
        st.error = msg.file_error ? `mpv could not open the stream (${msg.file_error}).` : 'mpv could not open the stream.';
        this.emit({ type: 'failed', session: st.session, error: st.error });
      }
    } else if (msg.request_id === 7 && typeof msg.data === 'number') {
      st.index = msg.data;
      st.loaded = true;
      st.played = true;
      const e = st.entries[st.index];
      if (e && e.startAt > 0) this.command(['seek', e.startAt, 'absolute']);
      this.emit({ type: 'track', session: st.session, index: st.index });
    }
  }

  stop() {
    const p = this.proc;
    if (!p) return;
    this.command(['quit']);
    setTimeout(() => { if (p.exitCode === null) p.kill(); }, 800);
    this.proc = null;
    this.sock = null;
  }
}

module.exports = { Mpv };
