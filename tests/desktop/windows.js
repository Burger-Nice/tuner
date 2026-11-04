// The Windows app on a real Windows desktop (CI's windows-test job; SPEC 9's spike, then the app itself):
// Electron + mpv embedded per plan A (a child host window, mpv --wid inside it) and, for comparison, plan C (an owned
// popup host). Real OS input (SetCursorPos / mouse_event / keybd_event through Windows' own hit-testing) proves the
// overlay's rules: the pointer over the picture stays with the overlay, the keyboard stays with the main window.
// Screenshots are the composited desktop (desktopCapturer; PowerShell's CopyFromScreen as a fallback), because a page
// capture never shows mpv's picture. Then (with --app) the real app's flows: tests/desktop/app-windows.js.
// Run (Windows): start tests/mock-provider.js (MEDIA_DIR=tests/media), then node tests/desktop/windows.js <outdir>
const { _electron } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const OUT = path.resolve(process.argv[2] || 'windows-shots');
const ROOT = path.resolve(__dirname, '../..');
const H = 'http://127.0.0.1:8899';
const MOVIE = `${H}/movie/demo/demo/5000.mp4`, LIVE = `${H}/live/demo/demo/1001.ts`, HLS = `${H}/live/demo/demo/1002.m3u8`;
fs.mkdirSync(OUT, { recursive: true });
const reports = [];
const report = (step, data) => { reports.push({ step, data, at: Date.now() }); fs.writeFileSync(path.join(OUT, 'reports.json'), JSON.stringify(reports, null, 1)); };
const check = (name, ok, detail = '') => { report('check', { name, ok: !!ok, detail: String(detail).slice(0, 400) }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(52)} ${detail}`); return !!ok; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// one screen grab, then stats and crops in main (BGRA bitmap)
async function grab(app, name, crops = {}) {
  const res = await app.evaluate(async ({ desktopCapturer, screen, nativeImage }, { crops, ps }) => {
    const d = screen.getPrimaryDisplay();
    const size = { width: Math.round(d.size.width * d.scaleFactor), height: Math.round(d.size.height * d.scaleFactor) };
    let img = null, how = 'desktopCapturer';
    try { const s = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: size }); img = s[0]?.thumbnail; } catch (e) { how = 'desktopCapturer failed: ' + e.message; }
    if ((!img || img.isEmpty()) && ps) { img = nativeImage.createFromPath(ps); how = 'CopyFromScreen'; }
    if (!img || img.isEmpty()) return { error: how };
    const stats = {};
    for (const [k, r] of Object.entries(crops)) {
      const c = img.crop({ x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)), width: Math.max(1, Math.round(r.w)), height: Math.max(1, Math.round(r.h)) });
      const b = c.toBitmap(), n = b.length / 4, step = Math.max(1, Math.floor(n / 4000));
      let sr = 0, sg = 0, sb = 0, sq = 0, cnt = 0;
      const buckets = new Set();
      for (let i = 0; i < n; i += step) {
        const B = b[i * 4], G = b[i * 4 + 1], R = b[i * 4 + 2];
        sr += R; sg += G; sb += B; sq += (R + G + B) ** 2; cnt++;
        buckets.add(`${R >> 5}${G >> 5}${B >> 5}`);
      }
      const mean = (sr + sg + sb) / cnt;
      stats[k] = { r: Math.round(sr / cnt), g: Math.round(sg / cnt), b: Math.round(sb / cnt), sd: Math.round(Math.sqrt(Math.max(0, sq / cnt - mean * mean))), colours: buckets.size };
    }
    return { png: img.toPNG().toString('base64'), stats, how, size };
  }, { crops, ps: null });
  if (res.error) {
    // the fallback: PowerShell draws the screen into a PNG and main reads it back
    const f = path.join(OUT, `_screen.png`);
    try {
      execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $i=New-Object System.Drawing.Bitmap $b.Width,$b.Height; $g=[System.Drawing.Graphics]::FromImage($i); $g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size); $i.Save('${f}')`]);
      return grab2(app, name, crops, f);
    } catch (e) { console.log('grab failed', res.error, e.message); return { stats: {} }; }
  }
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(res.png, 'base64'));
  return res;
}
async function grab2(app, name, crops, file) {
  const res = await app.evaluate(async ({ nativeImage }, { crops, file }) => {
    const img = nativeImage.createFromPath(file);
    const stats = {};
    for (const [k, r] of Object.entries(crops)) {
      const b = img.crop({ x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.w), height: Math.round(r.h) }).toBitmap(), n = b.length / 4;
      const buckets = new Set();
      let s = 0;
      for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 4000))) { buckets.add(`${b[i * 4 + 2] >> 5}${b[i * 4 + 1] >> 5}${b[i * 4] >> 5}`); s += b[i * 4 + 2]; }
      stats[k] = { colours: buckets.size, r: Math.round(s / (n / Math.max(1, Math.floor(n / 4000)))) };
    }
    return { stats, how: 'CopyFromScreen' };
  }, { crops, file });
  fs.copyFileSync(file, path.join(OUT, `${name}.png`));
  return res;
}

// where a CSS rect of the main window's page is on the screen (physical pixels)
async function screenRect(app, r, win = 'main') {
  return app.evaluate(({ screen }, { r, win }) => {
    const w = global.__airglow.wins[win];
    const b = w.getContentBounds(), s = screen.getDisplayMatching(b).scaleFactor;
    return { x: (b.x + r.x) * s, y: (b.y + r.y) * s, w: r.w * s, h: r.h * s };
  }, { r, win });
}
async function advancing(page, id, ms = 15000) {
  const t0 = Date.now();
  let first = null;
  while (Date.now() - t0 < ms) {
    const s = await page.evaluate((id) => window.spike.state(id), id).catch(() => null);
    if (s && typeof s.t === 'number') { if (first == null) first = s.t; else if (s.t > first + 0.8) return { ok: true, t: s.t, s }; }
    await sleep(400);
  }
  const s = await page.evaluate((id) => window.spike.state(id), id).catch(() => null);
  return { ok: false, t: s?.t, s };
}

async function spike(plan) {
  console.log(`\n== plan ${plan} ==`);
  report('plan', plan);
  const env = { ...process.env, AIRGLOW_TEST: '1', AIRGLOW_PLAN: plan };
  const app = await _electron.launch({ executablePath: require('electron'), args: [ROOT, '--test-page=tests/desktop/spike.html'], cwd: ROOT, env, timeout: 60000 });
  const res = { plan, video: false, overlay: false, focus: false, multiview: false, handoff: false };
  try {
    const page = await app.firstWindow();
    page.on('console', (m) => { if (m.type() === 'error') console.log('page error:', m.text()); });
    page.on('pageerror', (e) => console.log('page exception:', e.message));
    await page.waitForFunction(() => !!window.spike, null, { timeout: 20000 });
    const scr = await app.evaluate(({ screen }) => ({ ...screen.getPrimaryDisplay().workAreaSize, scale: screen.getPrimaryDisplay().scaleFactor }));
    report('screen', scr);
    const W = Math.min(1000, scr.width), Hh = Math.min(680, scr.height - 20);
    await app.evaluate((_, b) => { const w = global.__airglow.wins.main; w.setBounds(b); w.show(); w.focus(); }, { x: 0, y: 0, width: W, height: Hh });
    await sleep(800);
    const big = { x: 24, y: 40, w: W - 48, h: Math.round((W - 48) * 9 / 16) };
    const r = await page.evaluate(([u, r]) => window.spike.play('p1', u, r), [MOVIE, big]);
    check(`${plan}: mpv starts in a host window`, r.ok, JSON.stringify(r));
    const adv = await advancing(page, 'p1');
    check(`${plan}: mpv reports playback (time-pos advancing over IPC)`, adv.ok, `t=${adv.t} hwdec=${adv.s?.hwdec || 'none'} ${adv.s?.w}x${adv.s?.h} err=${adv.s?.error || ''}`);
    const info = await app.evaluate(() => ({ host: global.__airglow.info('p1'), main: global.__airglow.W32.hwndOf(global.__airglow.wins.main), ov: global.__airglow.overlays.main?.isVisible() }));
    check(`${plan}: mpv attached its own window inside the host`, info.host?.mpvChild > 0, JSON.stringify(info));
    check(`${plan}: the overlay window is up while the picture is`, info.ov);
    await sleep(1500);
    const pic = await screenRect(app, { x: big.x + 40, y: big.y + 30, w: big.w - 80, h: big.h - 120 });
    const pill = await screenRect(app, { x: big.x + 22, y: big.y + big.h - 38, w: 40, h: 16 });
    const side = await screenRect(app, { x: 2, y: 200, w: 14, h: 100 });
    const g1 = await grab(app, `${plan}-01-player`, { pic, pill, side });
    report('grab', { name: `${plan}-01-player`, how: g1.how, stats: g1.stats });
    res.video = check(`${plan}: the picture shows in the window (screen pixels at the video rect)`, g1.stats.pic?.colours >= 12 && g1.stats.pic?.sd > 20, JSON.stringify(g1.stats.pic));
    res.overlay = check(`${plan}: the overlay's controls draw over the picture`, g1.stats.pill?.r > 180 && g1.stats.pill?.g < 150, JSON.stringify(g1.stats.pill));
    check(`${plan}: the page outside the picture is untouched (the side strip)`, g1.stats.side?.colours <= 6, JSON.stringify(g1.stats.side));

    // the pointer over the picture: a real click pauses (overlay -> page -> mpv); the keyboard stays with the main window
    await app.evaluate(() => global.__airglow.wins.main.focus());
    await sleep(300);
    const c = await screenRect(app, { x: big.x + big.w / 2, y: big.y + big.h / 3, w: 1, h: 1 });
    const before = await page.evaluate(() => ({ ...window.spike.S }));
    await app.evaluate((_, c) => global.__airglow.W32.test.click(c.x, c.y), c);
    await sleep(900);
    const after = await page.evaluate(() => ({ ...window.spike.S }));
    const paused = await page.evaluate(() => window.spike.state('p1')).then((s) => s?.pause);
    check(`${plan}: a real click on the picture reaches the overlay and pauses`, after.pics > before.pics && paused === true, `pics ${before.pics}->${after.pics} pause=${paused}`);
    const fg = await app.evaluate(({ BrowserWindow }) => ({ focused: BrowserWindow.getFocusedWindow() === global.__airglow.wins.main, fg: global.__airglow.W32.test.foreground(), main: global.__airglow.W32.hwndOf(global.__airglow.wins.main), ovFocusable: global.__airglow.overlays.main?.isFocusable() }));
    res.focus = check(`${plan}: the main window keeps the focus after the click (the overlay never activates)`, fg.focused && fg.fg === fg.main, JSON.stringify(fg));
    await app.evaluate(() => global.__airglow.W32.test.key(0x20));
    await sleep(900);
    const k = await page.evaluate(() => ({ ...window.spike.S }));
    const paused2 = await page.evaluate(() => window.spike.state('p1')).then((s) => s?.pause);
    check(`${plan}: a real Space key reaches the main page (plays again)`, k.keys > after.keys && paused2 === false, `keys ${after.keys}->${k.keys} pause=${paused2}`);
    const pc = await screenRect(app, { x: big.x + 60, y: big.y + big.h - 26, w: 1, h: 1 });
    await app.evaluate((_, c) => global.__airglow.W32.test.click(c.x, c.y), pc);
    await sleep(900);
    const k2 = await page.evaluate(() => ({ ...window.spike.S }));
    check(`${plan}: a real click on the overlay's button runs the page's handler`, k2.clicks > k.clicks, `clicks ${k.clicks}->${k2.clicks}`);
    await page.evaluate(() => window.spike.set('p1', 'pause', false));
    await app.evaluate((_, c) => global.__airglow.W32.test.wheel(c.x, c.y, 120), c);
    await sleep(500);
    const k3 = await page.evaluate(() => ({ ...window.spike.S }));
    check(`${plan}: the wheel over the picture reaches the page`, k3.wheel > k2.wheel, `wheel ${k2.wheel}->${k3.wheel}`);

    // multiview: two mpv, two hosts
    const half = Math.floor((W - 48 - 16) / 2);
    const left = { x: 24, y: 60, w: half, h: Math.round(half * 9 / 16) }, right = { x: 24 + half + 16, y: 60, w: half, h: Math.round(half * 9 / 16) };
    await page.evaluate((r) => window.spike.rect('p1', r), left);
    const r2 = await page.evaluate(([u, r]) => window.spike.play('p2', u, r, { mute: true }), [LIVE, right]);
    const a2 = await advancing(page, 'p2');
    const a1 = await advancing(page, 'p1', 6000);
    await sleep(1200);
    const L = await screenRect(app, { x: left.x + 20, y: left.y + 20, w: left.w - 40, h: left.h - 40 }), R = await screenRect(app, { x: right.x + 20, y: right.y + 20, w: right.w - 40, h: right.h - 40 });
    const gap = await screenRect(app, { x: left.x + left.w + 4, y: left.y + 20, w: 8, h: left.h - 40 });
    const g2 = await grab(app, `${plan}-02-multiview`, { L, R, gap });
    report('grab', { name: `${plan}-02-multiview`, stats: g2.stats });
    res.multiview = check(`${plan}: multiview: two mpv play side by side, each in its host`, r2.ok && a1.ok && a2.ok && g2.stats.L?.colours >= 12 && g2.stats.R?.colours >= 8, `p1 ${a1.t} p2 ${a2.t} L ${JSON.stringify(g2.stats.L)} R ${JSON.stringify(g2.stats.R)}`);
    check(`${plan}: the gap between the tiles is the page`, g2.stats.gap?.colours <= 4, JSON.stringify(g2.stats.gap));

    // a hand-off: the playing host moves into the mini window (the same mpv, no new stream), and back
    const pid0 = (await page.evaluate(() => window.spike.state('p1')))?.pid;
    const mb = await page.evaluate(() => window.spike.mini());
    await sleep(800);
    const moved = await page.evaluate(() => window.spike.move('p1', 'mini'));
    await page.evaluate((r) => window.tuner.host.rect('p1', r), { x: 0, y: 0, w: mb.width, h: mb.height });
    await sleep(1500);
    const am = await advancing(page, 'p1', 6000);
    const pid1 = am.s?.pid;
    const MR = await screenRect(app, { x: 20, y: 20, w: mb.width - 40, h: mb.height - 40 }, 'mini');
    const g3 = await grab(app, `${plan}-03-mini-handoff`, { MR });
    report('grab', { name: `${plan}-03-mini-handoff`, stats: g3.stats });
    res.handoff = check(`${plan}: SetParent hand-off: the same mpv keeps playing in the mini window`, moved && am.ok && pid0 && pid0 === pid1 && g3.stats.MR?.colours >= 12, `moved=${moved} pid ${pid0}->${pid1} t=${am.t} ${JSON.stringify(g3.stats.MR)}`);
    await page.evaluate(() => window.spike.move('p1', 'main'));
    await page.evaluate((r) => window.spike.rect('p1', r), left);
    await sleep(600);
    const ab = await advancing(page, 'p1', 6000);
    check(`${plan}: and back into the main window`, ab.ok, `t=${ab.t}`);
    // the window resized: the hosts follow the page's new rects
    await app.evaluate((_, b) => global.__airglow.wins.main.setBounds(b), { x: 10, y: 10, width: W - 40, height: Hh - 30 });
    await sleep(1200);
    const hi = await app.evaluate(() => [global.__airglow.info('p1'), global.__airglow.overlays.main?.getBounds(), global.__airglow.wins.main.getContentBounds()]);
    check(`${plan}: after a resize the overlay covers the content area again`, hi[1] && hi[2] && hi[1].x === hi[2].x && hi[1].width === hi[2].width, JSON.stringify(hi.slice(1)));
    await grab(app, `${plan}-04-after-resize`, {});
    await page.evaluate(() => Promise.all([window.spike.quit('p1'), window.spike.quit('p2')]));
    await sleep(800);
    const ovGone = await app.evaluate(() => !global.__airglow.overlays.main?.isVisible());
    check(`${plan}: no picture, no overlay`, ovGone);
  } catch (e) {
    check(`${plan}: the spike ran to the end`, false, e.stack || e.message);
  } finally {
    await app.close().catch(() => {});
  }
  report('result', res);
  return res;
}

(async () => {
  const A = await spike('A');
  const C = await spike('C');
  const pick = A.video && A.overlay && A.focus ? 'A' : C.video && C.overlay && C.focus ? 'C' : 'B';
  report('verdict', { pick, A, C });
  console.log(`\nVERDICT: plan ${pick}`);
  fs.writeFileSync(path.join(OUT, 'verdict.txt'), `plan ${pick}\nA ${JSON.stringify(A)}\nC ${JSON.stringify(C)}\n`);
  if (process.argv.includes('--app')) {
    try { await require('./app-windows.js')(OUT, report, check, pick, { grab, screenRect }); } catch (e) { check('app flows ran', false, e.stack || e.message); }
  }
  report('done', true);
})();
