// mpv, the Windows app's player (design/ui-v1/desktop-v1/SPEC.md 9): one MpvInstance per picture (the player, each
// multiview tile, the mini player keeps the player's), each its own mpv process attached to a host window with --wid
// and driven over its JSON IPC (a named pipe on Windows). mpv draws the picture only: the app draws the controls in
// HTML and handles every key and click (--input-default-bindings=no, --input-cursor=no, --osc=no).
const { app } = require('electron');
const { spawn, spawnSync } = require('child_process');
const { EventEmitter } = require('events');
const net = require('net');
const path = require('path');
const fs = require('fs');
const os = require('os');

const IS_WIN = process.platform === 'win32';

function findMpv() {
  const exe = IS_WIN ? 'mpv.exe' : 'mpv';
  const bundled = [app.isPackaged && path.join(process.resourcesPath, 'mpv', exe), path.join(__dirname, 'vendor', 'mpv', exe)];
  for (const p of bundled) if (p && fs.existsSync(p)) return p;
  const which = spawnSync(IS_WIN ? 'where' : 'which', ['mpv'], { encoding: 'utf8' });
  const found = which.status === 0 && which.stdout.split(/\r?\n/)[0].trim();
  if (found) return found;
  for (const p of ['/opt/homebrew/bin/mpv', '/usr/local/bin/mpv', '/usr/bin/mpv']) if (fs.existsSync(p)) return p;
  return null;
}
let BIN;
const mpvBin = () => (BIN === undefined ? (BIN = findMpv()) : BIN);

// what the app watches (property name -> observe id)
const PROPS = ['time-pos', 'duration', 'pause', 'mute', 'volume', 'eof-reached', 'idle-active', 'paused-for-cache', 'cache-buffering-state',
  'demuxer-cache-duration', 'track-list', 'width', 'height', 'hwdec-current', 'speed', 'sid', 'aid', 'seekable', 'video-codec', 'audio-params', 'video-params'];

let serial = 0;
class MpvInstance extends EventEmitter {
  // opts: { wid, ua, volume, mute, hwdec, hdr, spdif, audioDevice, vo, extra: [] }
  constructor(id, opts = {}) {
    super();
    this.id = id;
    this.opts = opts;
    this.proc = null;
    this.sock = null;
    this.state = { t: null, d: null, pause: false, mute: !!opts.mute, volume: opts.volume ?? 100, loaded: false, idle: true, eof: false, buffering: false, cache: 0, w: 0, h: 0, hwdec: '', tracks: [], error: '' };
    this.req = 100;
    this.waiting = new Map();
    this.stderr = '';
    this.ready = null;
  }
  get available() { return !!mpvBin(); }
  args() {
    const o = this.opts, n = ++serial;
    this.ipc = IS_WIN ? `\\\\.\\pipe\\airglow-${process.pid}-${n}` : path.join(os.tmpdir(), `airglow-${process.pid}-${n}.sock`);
    const confDir = path.join(app.getPath('userData'), 'mpv');
    try { fs.mkdirSync(confDir, { recursive: true }); } catch { /* read-only */ }
    const a = [
      `--config-dir=${confDir}`,   // (Account > Windows > Open mpv.conf: the owner's own escape hatch, read by mpv only)
      `--input-ipc-server=${this.ipc}`,
      '--idle=yes', '--keep-open=yes', '--force-window=yes', '--terminal=no',
      '--osc=no', '--osd-level=0', '--input-default-bindings=no', '--input-vo-keyboard=no', '--input-cursor=no', '--window-dragging=no', '--cursor-autohide=no',
      '--ytdl=no', '--audio-display=no', '--msg-level=all=error',
      `--hwdec=${o.hwdec || 'auto-safe'}`,
      '--cache=yes', '--demuxer-max-bytes=200MiB', '--demuxer-max-back-bytes=60MiB', '--network-timeout=20',
      '--stream-lavf-o=reconnect=1,reconnect_streamed=1,reconnect_delay_max=5',
      // the house subtitle style (chalk, a soft edge, 5.3 % of the picture; mpv scales sub-font-size to 720 lines)
      '--sub-font=Segoe UI', '--sub-bold=yes', '--sub-font-size=38', '--sub-color=#F2EFE9', '--sub-border-size=2.2', '--sub-border-color=#C0000000', '--sub-shadow-offset=1', '--sub-margin-y=34',
      `--volume=${Math.round(o.volume ?? 100)}`, `--mute=${o.mute ? 'yes' : 'no'}`,
    ];
    if (o.wid) a.push(`--wid=${o.wid >>> 0}`);
    if (o.vo) a.push(`--vo=${o.vo}`);
    else if (IS_WIN) a.push('--vo=gpu-next,gpu,direct3d');   // (mpv picks d3d11 and d3d11va itself on Windows; the later ones only where gpu-next can't start)
    if (o.hdr) a.push('--target-colorspace-hint=yes');
    if (o.spdif) a.push('--audio-spdif=ac3,dts,eac3');
    if (o.audioDevice) a.push(`--audio-device=${o.audioDevice}`);
    if (o.ua) a.push(`--user-agent=${o.ua}`);
    if (o.ao) a.push(`--ao=${o.ao}`);
    return [...a, ...(o.extra || [])];
  }
  start() {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      if (!mpvBin()) return { ok: false, error: 'missing' };
      let proc;
      try { proc = this.proc = spawn(mpvBin(), this.args(), { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true }); } catch (e) { return { ok: false, error: e.message }; }
      proc.stderr.on('data', (d) => { this.stderr = (this.stderr + d).slice(-2000); });
      const err = await new Promise((res) => { proc.once('error', res); proc.once('spawn', () => res(null)); });
      if (err) { this.proc = null; return { ok: false, error: err.message }; }
      proc.once('exit', (code) => {
        this.proc = null; this.sock = null;
        for (const [, w] of this.waiting) w(null);
        this.waiting.clear();
        this.emit('event', { type: 'exit', code, error: this.state.error || this.stderr.trim().split('\n').pop() || '' });
      });
      const ok = await this.connect(proc);
      return ok ? { ok: true, pid: proc.pid } : { ok: false, error: 'mpv did not answer' };
    })();
    return this.ready;
  }
  async connect(proc) {
    for (let i = 0; i < 80 && this.proc === proc; i++) {
      const sock = await new Promise((res) => { const s = net.connect(this.ipc); s.once('connect', () => res(s)); s.once('error', () => res(null)); });
      if (sock) { this.sock = sock; this.listen(sock); return true; }
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }
  listen(sock) {
    let buf = '';
    sock.setEncoding('utf8');
    sock.on('error', () => {});
    sock.on('data', (chunk) => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        let m;
        try { m = JSON.parse(line); } catch { continue; }
        this.handle(m);
      }
    });
    PROPS.forEach((p, i) => this.send(['observe_property', i + 1, p]));
  }
  send(args) {
    if (!this.sock || this.sock.destroyed) return Promise.resolve(null);
    const request_id = ++this.req;
    return new Promise((res) => {
      this.waiting.set(request_id, res);
      this.sock.write(JSON.stringify({ command: args, request_id }) + '\n');
      setTimeout(() => { if (this.waiting.has(request_id)) { this.waiting.delete(request_id); res(null); } }, 5000);
    });
  }
  command(args) { return this.send(args); }
  set(prop, value) { return this.send(['set_property', prop, value]); }
  get(prop) { return this.send(['get_property', prop]).then((r) => (r && r.error === 'success' ? r.data : null)); }
  handle(m) {
    if (m.request_id && this.waiting.has(m.request_id)) { const w = this.waiting.get(m.request_id); this.waiting.delete(m.request_id); w(m); return; }
    const st = this.state;
    if (m.event === 'property-change') {
      const v = m.data;
      switch (m.name) {
        case 'time-pos': st.t = typeof v === 'number' ? v : null; return;   // (sent per tick: the renderer polls state, no event)
        case 'demuxer-cache-duration': st.cache = typeof v === 'number' ? v : 0; return;
        case 'duration': st.d = typeof v === 'number' ? v : null; break;
        case 'pause': st.pause = !!v; break;
        case 'mute': st.mute = !!v; break;
        case 'volume': st.volume = typeof v === 'number' ? v : st.volume; break;
        case 'eof-reached': st.eof = !!v; break;
        case 'idle-active': st.idle = !!v; break;
        case 'paused-for-cache': st.buffering = !!v; break;
        case 'cache-buffering-state': st.bufPct = typeof v === 'number' ? v : 0; return;
        case 'track-list': st.tracks = Array.isArray(v) ? v.map((t) => ({ id: t.id, type: t.type, lang: t.lang || '', title: t.title || '', codec: t.codec || '', selected: !!t.selected, external: !!t.external, channels: t['demux-channel-count'] || 0, h: t['demux-h'] || 0 })) : []; break;
        case 'width': st.w = v || 0; break;
        case 'height': st.h = v || 0; break;
        case 'hwdec-current': st.hwdec = v && v !== 'no' ? String(v) : ''; break;
        case 'speed': st.speed = v || 1; break;
        case 'sid': st.sid = v; break;
        case 'aid': st.aid = v; break;
        case 'seekable': st.seekable = !!v; break;
        case 'video-codec': st.vcodec = v || ''; break;
        case 'video-params': st.gamma = v?.gamma || ''; st.primaries = v?.primaries || ''; break;
        case 'audio-params': st.ach = v?.['channel-count'] || 0; break;
        default: return;
      }
      this.emit('event', { type: 'prop', name: m.name, value: m.data });
    } else if (m.event === 'file-loaded') {
      st.loaded = true; st.error = ''; st.eof = false;
      if (this.resetStart) { this.resetStart = false; this.set('start', 'none'); }
      this.emit('event', { type: 'file-loaded' });
    } else if (m.event === 'end-file') {
      st.loaded = false;
      if (m.reason === 'error') st.error = m.file_error ? `mpv could not open the stream (${m.file_error}).` : 'mpv could not open the stream.';
      this.emit('event', { type: 'end-file', reason: m.reason, error: m.reason === 'error' ? st.error : '' });
    } else if (m.event === 'playback-restart') this.emit('event', { type: 'restart' });
    else if (m.event === 'seek') this.emit('event', { type: 'seek' });
  }
  // a file or a stream; start in seconds; ua per provider
  async load({ url, start = 0, ua = '', title = '' }) {
    const r = await this.start();
    if (!r.ok) return r;
    if (typeof url !== 'string' || !/^(https?|file|rtmp|rtsp|udp):/i.test(url)) return { ok: false, error: 'Not a stream link.' };
    if (ua) await this.set('user-agent', ua);
    if (title) await this.set('force-media-title', String(title).slice(0, 200));
    if (start > 0) { await this.set('start', `+${Math.floor(start)}`); this.resetStart = true; }
    this.state.t = null; this.state.d = null; this.state.error = '';
    await this.send(['loadfile', url, 'replace']);
    await this.set('pause', false);
    return { ok: true };
  }
  stopFile() { return this.send(['stop']); }
  quit() {
    const p = this.proc;
    if (!p) return;
    this.send(['quit']);
    setTimeout(() => { if (p.exitCode === null) { try { p.kill(); } catch { /* gone */ } } }, 800);
  }
  snapshot() { return { ...this.state, pid: this.proc?.pid || 0 }; }
}

// the copy checks (probes): a short-lived mpv with no window that opens a link and says what it found; counted
// against the provider's streams by the caller
function probe(url, { ua = '', timeout = 15000 } = {}) {
  return new Promise((resolve) => {
    if (!mpvBin()) return resolve({ ok: false, error: 'missing' });
    const args = ['--no-config', '--vo=null', '--ao=null', '--frames=1', '--length=1', '--msg-level=all=error', '--term-playing-msg=PROBE ${video-codec} ${width}x${height} ${audio-codec-name} ${audio-params/channel-count}', '--network-timeout=10'];
    if (ua) args.push(`--user-agent=${ua}`);
    args.push(url);
    let out = '';
    const p = spawn(mpvBin(), args, { windowsHide: true });
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { out += d; });
    const t = setTimeout(() => { try { p.kill(); } catch { /* gone */ } }, timeout);
    p.on('exit', (code) => { clearTimeout(t); const m = /PROBE (.*)/.exec(out); resolve({ ok: !!m, line: m ? m[1].trim() : '', error: m ? '' : out.trim().split('\n').pop() || `code ${code}` }); });
    p.on('error', (e) => { clearTimeout(t); resolve({ ok: false, error: e.message }); });
  });
}

module.exports = { MpvInstance, mpvBin, probe };
