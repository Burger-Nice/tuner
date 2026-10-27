// Shared bits for the hunt-league-* / hunt-news-* bug-hunt drive scripts (not a test on its own).
// start(): fixtures overridden through page.route, the clock, settings, sign in, the NBA tab.
const fs = require('fs'), path = require('path');
const F = path.resolve(__dirname, '../fixtures/espn');
const IMG = path.resolve(__dirname, '../../design/ui-v1/nba-pages/img');
const CORS = { 'Access-Control-Allow-Origin': '*' };
const fx = (name) => JSON.parse(fs.readFileSync(`${F}/${name}`, 'utf8'));

module.exports = (ctx) => {
  const { p, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  const fails = [];
  const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); return ok; };
  const json = (r, body, status = 200) => r.fulfill({ status, contentType: 'application/json', headers: CORS, body: typeof body === 'string' ? body : JSON.stringify(body) });
  // what has focus, and whether it can be seen
  const act = () => ev(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return { none: true, text: 'NOTHING FOCUSED' };
    const b = a.getBoundingClientRect();
    let hid = !!a.closest('[hidden]') || !a.getClientRects().length;
    for (let e = a; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.opacity === '0' || cs.visibility === 'hidden' || cs.display === 'none') hid = true; }
    return { key: a.dataset.key || '', sec: a.dataset.sec || '', conf: a.dataset.conf || '', cat: a.dataset.cat || '', act: a.dataset.act || '', tab: a.dataset.tab || '',
      text: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50), cls: a.className || '', box: [b.left, b.top, b.right, b.bottom].map(Math.round), hid, off: a.classList.contains('off'), ov: !!a.closest('#overlays') };
  });
  const where = async (label) => { const a = await act(); console.log(`  ${label.padEnd(26)} ${a.none ? a.text : `${a.cls.slice(0, 30)} ${a.key || a.sec || a.conf || a.cat || a.act || a.tab} "${a.text.slice(0, 34)}" [${a.box}]${a.hid ? ' HIDDEN' : ''}`}`); return a; };
  const seen = async (label) => { const a = await act(); const vis = !a.none && !a.hid && a.box[1] >= 0 && a.box[3] <= 540 && a.box[0] >= 0 && a.box[2] <= 960; check(vis, `${label}: focus visible (${a.none ? 'none' : `${a.key || a.sec || a.conf || a.cat || a.act} [${a.box}]${a.hid ? ' hidden' : ''}`})`); return a; };
  const hold = async () => { await p.keyboard.down('Enter'); await p.waitForTimeout(650); await p.keyboard.up('Enter'); await p.waitForTimeout(450); };
  // a held key: auto-repeat presses `n` times, `gap` ms apart
  const flood = async (k, n, gap = 40) => { await p.keyboard.down(k); for (let i = 0; i < n; i++) { await p.waitForTimeout(gap); await p.keyboard.down(k); } await p.keyboard.up(k); };
  const text = (sel) => ev((s) => [...document.querySelectorAll(s)].filter((e) => !e.closest('[hidden]') && e.getClientRects().length).map((e) => e.textContent.trim().replace(/\s+/g, ' ')).join(' | '), sel);
  const ovOpen = () => ev(() => !!document.querySelector('#overlays .ov'));
  const closeAll = async () => { for (let i = 0; i < 4 && await ovOpen(); i++) await key('Escape', 1, 350); };
  // boxes of every visible thing matching sel: [{ t, l, r, top, bot }]
  const boxes = (sel) => ev((s) => [...document.querySelectorAll(s)].filter((e) => !e.closest('[hidden]') && e.getClientRects().length && getComputedStyle(e).opacity !== '0').map((e) => { const b = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 30), l: Math.round(b.left), r: Math.round(b.right), top: Math.round(b.top), bot: Math.round(b.bottom) }; }), sel);
  const go = async (sec) => {
    await ev(() => window.__tunerTest.go('nba')); await p.waitForTimeout(700);
    await ev((s) => document.querySelector(`.nb-sec [data-sec="${s}"]`)?.click(), sec); await p.waitForTimeout(900);
    await ev((s) => { const c = document.querySelector(`.nb-sec [data-sec="${s}"]`); c.focus(); c.dispatchEvent(new CustomEvent('tvfocus', { bubbles: true })); }, sec); await p.waitForTimeout(300);
  };
  // opts: { clock: ISO, settings: {}, seen, pins: fn, routes: [[glob, handler]], images: true }
  const start = async (o = {}) => {
    if (o.images !== false) await p.route(/a\.espncdn\.com\//, (r) => {
      const u = decodeURIComponent(r.request().url());
      const logo = u.match(/teamlogos\/nba\/[^?]*?\/(\w+)\.png/);
      let f = logo && path.join(IMG, `logo-${logo[1].toUpperCase()}.png`);
      if (!f || !fs.existsSync(f)) f = path.join(IMG, 'news-50287191.jpg');
      return fs.existsSync(f) ? r.fulfill({ path: f }) : r.abort();
    });
    for (const [g, h] of o.routes || []) await p.route(g, h);
    if (o.clock) await p.clock.install({ time: new Date(o.clock) });
    await ev(({ settings, seen }) => {
      const k = 'tuner.settings', v = JSON.parse(localStorage.getItem(k) || '{}');
      Object.assign(v, { nbaTeam: 'MEM', shield: 'off' }, settings || {});
      localStorage.setItem(k, JSON.stringify(v));
      if (seen !== undefined) localStorage.setItem('tuner.nbaSeen', JSON.stringify(seen));
    }, { settings: o.settings, seen: o.seen });
    await p.reload(); await p.waitForTimeout(1500);
    const first = await ev(() => window.__tunerTest?.state().screen);
    if (first === 'first' || !first) await require('./signin.js')({ p, key });
    // signing in may have rewritten the settings: put ours back
    await ev(async (settings) => { const st = await import('/tv/js/state.js'); st.saveSettings({ nbaTeam: 'MEM', shield: 'off', ...(settings || {}) }); st.emit('nba'); }, o.settings);
    await p.waitForTimeout(2500);
  };
  const done = () => console.log(fails.length ? `${fails.length} FAILED:\n  ${fails.join('\n  ')}` : 'all checks passed');
  return { ev, check, json, act, where, seen, hold, flood, text, ovOpen, closeAll, boxes, go, start, done, fx, fails, F };
};
