// The real Windows app on a real Windows desktop (CI's windows-test job, after the spike in windows.js): the packaged
// shape unpackaged (main.js, app/desktop.html), mpv embedded per the plan the spike picked, against the fake provider.
// Sign in, Home, a live channel playing in mpv under the v2 bar (screen pixels), a real click on the picture, the game
// panel docked, the mini player's hand-off, multiview with two mpv, the palette and the sheet over a picture.
const { _electron } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ROOT = path.resolve(__dirname, '../..');
const H = 'http://127.0.0.1:8899';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function appFlows(OUT, report, check, plan, { grab, screenRect }) {
  console.log(`\n== the app, plan ${plan === 'C' ? 'C' : 'A'} ==`);
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'airglow-test-'));
  const env = { ...process.env, AIRGLOW_TEST: '1', AIRGLOW_PLAN: plan === 'C' ? 'C' : 'A', AIRGLOW_USERDATA: ud };
  const app = await _electron.launch({ executablePath: require('electron'), args: [ROOT], cwd: ROOT, env, timeout: 60000 });
  const errs = [];
  try {
    const page = await app.firstWindow();
    page.on('pageerror', (e) => errs.push(e.message));
    const ev = (f, a) => page.evaluate(f, a);
    const wait = async (f, ms = 15000, a) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(f, a).catch(() => false)) return true; await sleep(250); } return false; };
    const key = async (k) => { await page.keyboard.press(k); await sleep(450); };
    const shot = async (name) => { await sleep(700); const g = await grab(app, `app-${name}`, {}); report('grab', { name: `app-${name}`, how: g.how }); };
    const scr = await app.evaluate(({ screen }) => screen.getPrimaryDisplay().workAreaSize);
    await app.evaluate((_, b) => { const w = global.__airglow.wins.main; w.setBounds(b); w.show(); w.focus(); }, { x: 0, y: 0, width: Math.min(1280, scr.width), height: Math.min(760, scr.height) });
    check('app: the desktop shell loads in Electron', await wait(() => window.__desktopReady && document.querySelector('[data-act="noacct"]'), 30000));
    check('app: the safeStorage secret store keeps a value', await page.evaluate(async () => { await window.tuner.secret.set('ci-test', 'kept'); const v = await window.tuner.secret.get('ci-test'); await window.tuner.secret.clear('ci-test'); return v === 'kept' && (await window.tuner.secret.get('ci-test')) == null; }));
    await ev((H) => { for (const [k, v] of Object.entries({ nbaBase: `${H}/espn`, nbaWebBase: `${H}/espnweb`, nbaContentBase: `${H}/espncontent`, cinemetaBase: `${H}/addon/cinemeta`, stremioApi: `${H}/stremio-api`, ratingsUrl: `${H}/ratings.json`, tmdbBase: `${H}/tmdb/3`, tmdbImg: `${H}/tmdb-img` })) localStorage.setItem(`tuner.${k}`, JSON.stringify(v)); }, H);
    await page.reload();
    await wait(() => document.querySelector('[data-act="noacct"]'));
    await page.click('[data-act="noacct"]');   // (Use airglow without an account: the provider card)
    await wait(() => document.querySelector('#siServer'));
    await page.fill('#siServer', H); await page.fill('#siUser', 'demo'); await page.fill('#siPass', 'demo');
    await page.click('#siGo');
    check('app: signed in to the fake provider', await wait(() => !!document.querySelector('[data-act="done"]'), 20000));
    await ev(async (H) => {
      const acc = JSON.parse(localStorage.getItem('tuner.accounts') || '[]')[0];
      const pre = `tuner.a:${acc.id}:`;
      const r = await fetch(`${H}/stremio-api/api/addonCollectionGet`, { method: 'POST', body: JSON.stringify({ authKey: 'AK-test-1' }) }).then((x) => x.json());
      const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
      const ok = r.result.addons.filter((x) => /\/addon\/(cinemeta|northlight)/.test(x.transportUrl));
      localStorage.setItem(pre + 'addons', JSON.stringify(ok.map((x) => ({ key: 'ad' + hash(x.transportUrl), url: x.transportUrl, manifest: x.manifest, at: Date.now(), on: true, catalogs: Object.fromEntries((x.manifest.catalogs || []).filter((c) => !(c.extra || []).some((e) => e.isRequired && e.name !== 'genre')).map((c) => [`${c.type}:${c.id}`, true])), from: 'stremio', kind: {}, health: {} }))));
      localStorage.setItem('tuner.tmdbKey', JSON.stringify('test-tmdb-token'));
    }, H);
    await page.click('[data-act="done"]');
    await page.reload();
    check('app: Home', await wait(() => window.__desktopReady && document.querySelector('.hm-card'), 20000));
    await sleep(2500);
    await shot('01-home');

    // a live channel in mpv under the v2 bar
    await ev(() => window.__tunerTest.go('live'));
    await wait(() => document.querySelectorAll('.gd-ch').length > 3, 15000);
    await shot('02-guide');
    await ev(() => document.querySelectorAll('.gd-ch')[1].click());   // US: ESPN HD (the .ts clip)
    const played = await wait(() => { const s = window.__tunerTest.state().player; return s && s.playing; }, 20000);
    let st = null;
    for (let i = 0; i < 40; i++) { st = await app.evaluate(() => { const h = [...global.__airglow.hosts.values()][0]; return h ? { id: h.id, ...h.mpv.snapshot(), rect: h.rect } : null; }); if (st?.t > 1.5) break; await sleep(500); }
    check('app: a channel plays in mpv inside the window (time-pos over IPC)', played && st?.t > 1.5, JSON.stringify({ t: st?.t, w: st?.w, h: st?.h, hwdec: st?.hwdec, err: st?.error }));
    await page.mouse.move(400, 300); await page.mouse.move(420, 320);
    const r = st?.rect || { x: 0, y: 40, w: 1000, h: 560 };
    const pic = await screenRect(app, { x: r.x + r.w * 0.25, y: r.y + r.h * 0.3, w: r.w * 0.5, h: r.h * 0.3 });
    await app.evaluate((_, c) => global.__airglow.W32.test.move(c.x, c.y), { x: pic.x + 10, y: pic.y + 10 });
    await sleep(600);
    const g = await grab(app, 'app-03-player', { pic });
    report('grab', { name: 'app-03-player', stats: g.stats });
    check('app: the picture is on screen under the controls', g.stats.pic?.colours >= 10, JSON.stringify(g.stats.pic));
    // a real click on the picture pauses (the overlay keeps the pointer, the page decides, mpv pauses)
    const c = await screenRect(app, { x: r.x + r.w / 2, y: r.y + r.h / 2, w: 1, h: 1 });
    await app.evaluate((_, c) => global.__airglow.W32.test.click(c.x, c.y), c);
    await sleep(1000);
    const paused = await app.evaluate(() => [...global.__airglow.hosts.values()][0]?.mpv.state.pause);
    check('app: a real click on the picture pauses', paused === true, `pause=${paused}`);
    await key('Space');
    // Options over the picture (drawn by the overlay)
    await key('o'); await shot('04-player-options'); await key('Escape');
    // the game's channel: the game panel docked beside the picture
    await key('PageUp');
    await sleep(2500);
    const game = await ev(() => window.__tunerTest.state().player?.game);
    if (game) { await key('g'); await sleep(1200); await shot('05-game-panel'); check('app: G docks the game panel', await ev(() => window.__tunerTest.state().player?.layout?.docked)); await key('g'); }
    // the mini player: the same mpv moves into its own window
    const pid0 = (await app.evaluate(() => [...global.__airglow.hosts.values()][0]?.mpv.snapshot().pid));
    await key('p');
    await sleep(2000);
    const mini = await app.evaluate(() => { const h = [...global.__airglow.hosts.values()][0]; const m = global.__airglow.wins.mini; return h && m ? { win: h.win, pid: h.mpv.snapshot().pid, t: h.mpv.state.t, b: m.getBounds() } : null; });
    check('app: P moves the picture to the mini player (the same mpv)', mini?.win === 'mini' && mini.pid === pid0, JSON.stringify(mini));
    if (mini) {
      const mr = await screenRect(app, { x: 20, y: 50, w: mini.b.width - 40, h: mini.b.height - 100 }, 'mini');
      const gm = await grab(app, 'app-06-mini', { mr });
      check('app: the mini player shows the picture over the app', gm.stats.mr?.colours >= 10, JSON.stringify(gm.stats.mr));
    }
    await key('Control+p');
    await sleep(1500);
    check('app: Ctrl P brings it back', await app.evaluate(() => [...global.__airglow.hosts.values()][0]?.win === 'main'));
    await key('Control+w');
    await sleep(800);

    // multiview: two mpv, the audio follows the click
    await key('Control+Shift+M');
    await wait(() => document.querySelector('#mv-q'), 5000);
    await page.fill('#mv-q', 'channel'); await sleep(500);
    for (let k = 0; k < 2; k++) { await ev(() => document.querySelector('.mv-pr:not(.placed) [data-mv="addc"]')?.click()); await sleep(1200); }
    await sleep(3000);
    const mv = await app.evaluate(() => [...global.__airglow.hosts.values()].map((h) => ({ id: h.id, t: h.mpv.state.t, mute: h.mpv.state.mute, rect: h.rect })));
    check('app: multiview plays two mpv at once, one with the sound', mv.length >= 2 && mv.filter((x) => x.t > 0.5).length >= 2 && mv.filter((x) => !x.mute).length === 1, JSON.stringify(mv));
    await shot('07-multiview');
    await key('Control+k'); await page.keyboard.type('espn'); await sleep(800);
    await shot('08-palette-over-multiview');
    await key('Escape');
    await key('Escape'); await key('Escape');
    await sleep(1000);
    await key('Shift+?'); await shot('09-shortcuts'); await key('Escape');
    await key('Control+w');
    check('app: no page errors', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) {
    check('app: the flows ran to the end', false, e.stack || e.message);
  } finally {
    await app.close().catch(() => {});
  }
};
