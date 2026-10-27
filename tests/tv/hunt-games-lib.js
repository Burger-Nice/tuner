// Shared set-up for the hunt-games-* / hunt-team-* drive scripts: the mocks' moment (Mon 26 Oct 2026 23:40, the
// Grizzlies at the Jazz at 01:00 on today's scoreboard), settings, sign-in, helpers to read focus and geometry.
const fs = require('fs'), path = require('path');
const F = path.resolve(__dirname, '../fixtures/espn');
const CORS = { 'Access-Control-Allow-Origin': '*' };

module.exports = (ctx) => {
  const { p, key } = ctx;
  const ev = (f, a) => p.evaluate(f, a);
  const sched = JSON.parse(fs.readFileSync(`${F}/schedule-29.json`, 'utf8'));
  const sb = JSON.parse(fs.readFileSync(`${F}/scoreboard.json`, 'utf8'));
  const jazz = sched.events.find((e) => e.id === '401909875');
  const board = { ...sb, day: { date: '2026-10-26' }, events: [jazz, ...sb.events.filter((e) => e.id !== '401909850')] };
  const fails = [];
  const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); return ok; };
  const hold = async () => { await p.keyboard.down('Enter'); await p.waitForTimeout(650); await p.keyboard.up('Enter'); await p.waitForTimeout(400); };
  const act = () => ev(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return { none: true, key: '', sec: '', act: '', text: '', cls: '', scr: '' };
    const r = a.getBoundingClientRect();
    const hid = !!a.closest('[hidden]') || !a.getClientRects().length;
    return { key: a.dataset.key || '', sec: a.dataset.sec || '', day: a.dataset.day || '', act: a.dataset.act || '', tab: a.dataset.tab || '', text: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50), cls: a.className || '', scr: a.closest('[data-screen]')?.dataset.screen || (a.closest('#overlays') ? 'overlay' : a.closest('#topbar') ? 'topbar' : ''), rect: [r.left, r.top, r.right, r.bottom].map(Math.round), hid, ov: !!a.closest('#overlays') };
  });
  const where = async (label) => { const a = await act(); console.log(String(label).padEnd(34), a.none ? 'NOTHING FOCUSED' : `${a.scr}|${a.cls}|${a.key || a.sec || a.act || a.day || a.tab}|"${a.text}" ${a.rect} ${a.hid ? 'HIDDEN' : ''}`); return a; };
  const shown = () => ev(() => [...document.querySelectorAll('[data-screen="nba"] .nb-s')].filter((s) => !s.hidden).map((s) => s.dataset.s).join(','));
  const selChip = () => ev(() => document.querySelector('.nb-sec .chip.sel')?.dataset.sec);
  const screen = () => ev(() => window.__tunerTest.state().screen);
  const route = async () => {
    await p.route('**/espn/scoreboard*', (r) => r.fulfill({ contentType: 'application/json', headers: CORS, body: JSON.stringify(board) }));
    await p.route('**/espn/summary?event=401909867', (r) => r.fulfill({ contentType: 'application/json', headers: CORS, body: fs.readFileSync(`${F}/summary-401909850.json`, 'utf8') }));
  };
  // start({ team: 'MEM', shield: 'off'|'mine'|'all', seen: {upTo, ids}, clock: iso, noClock, pin: true })
  const start = async (o = {}) => {
    if (!o.noRoute) await route();
    if (!o.noClock && !ctx._clock) { await p.clock.install({ time: new Date(o.clock || '2026-10-26T23:40:00Z') }); ctx._clock = 1; }
    await ev((o) => {
      const k = 'tuner.settings', v = JSON.parse(localStorage.getItem(k) || '{}');
      v.shield = o.shield || 'off'; v.nbaTeam = o.team === undefined ? 'MEM' : o.team;
      localStorage.setItem(k, JSON.stringify(v));
      localStorage.setItem('tuner.nbaSeen', JSON.stringify(o.seen || { upTo: Date.parse('2026-10-25T12:00:00Z'), ids: [] }));
    }, o);
    if (o.pin) await ev(async () => { const t = Date.parse('2026-10-26T01:00:00Z'); await window.Core.cache.set(`nba:pin:${t}`, { at: t, standings: await window.NBA.standings(), teamStats: await window.NBA.teamStats(), leaders: {} }); localStorage.setItem('tuner.nbaPins', JSON.stringify([t])); });
    await p.reload(); await p.waitForTimeout(1500);
    const first = await ev(() => window.__tunerTest?.state().screen);
    if (first === 'first' || !first) await require('./signin.js')({ p, key });
    await p.waitForTimeout(3000);
    if (o.go !== false) { await ev(() => window.__tunerTest.go('nba')); await p.waitForTimeout(2500); }
  };
  // Hold a key down with repeats every `ms` (the remote's auto-repeat): n repeats.
  const flood = async (k, n, ms = 45) => {
    await p.keyboard.down(k);
    for (let i = 0; i < n; i++) { await p.waitForTimeout(ms); await p.keyboard.down(k); }
    await p.keyboard.up(k);
  };
  // Everything on screen past the safe area (text and focus rings): [desc]
  const offSafe = () => ev(() => {
    const out = [];
    const scr = document.querySelector('[data-screen]:not([hidden])');
    const walk = (root) => {
      for (const n of root.querySelectorAll('*')) {
        if (n.closest('[hidden]') || !n.getClientRects().length) continue;
        const cs = getComputedStyle(n);
        if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        const own = [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
        if (!own) continue;
        const r = n.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        // clipped by an ancestor with overflow hidden / clip-path?
        if (r.bottom > 513.5 && r.top < 540 || r.right > 912.5 && r.left < 960 || r.left < 47.5 && r.right > 0) out.push(`${n.tagName}.${n.className} "${n.textContent.trim().slice(0, 30)}" ${[r.left, r.top, r.right, r.bottom].map(Math.round)}`);
      }
    };
    if (scr) walk(scr);
    walk(document.getElementById('overlays'));
    return out;
  });
  // Onto the section row, on chip `sec` (waits out the dwell so it's the section shown)
  const toChip = async (sec, wait = 600) => {
    for (let i = 0; i < 6; i++) { const a = await act(); if (a.sec) break; if (a.tab) { await key('ArrowDown', 1, 300); continue; } await key('Escape', 1, 400); }
    const order = await ev(() => [...document.querySelectorAll('.nb-sec [data-sec]')].map((c) => c.dataset.sec));
    for (let i = 0; i < 8; i++) {
      const a = await act(); if (a.sec === sec) break;
      await key(order.indexOf(a.sec) < order.indexOf(sec) ? 'ArrowRight' : 'ArrowLeft', 1, 300);
    }
    await p.waitForTimeout(wait);
  };
  const done = () => { console.log(fails.length ? `\n${fails.length} FAIL:\n  ${fails.join('\n  ')}` : '\nall checks passed'); };
  return { toChip, ev, check, hold, act, where, shown, selChip, screen, start, flood, offSafe, done, fails, board, sched };
};
