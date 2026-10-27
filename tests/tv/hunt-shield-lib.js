// Shared set-up for the spoiler-shield hunt scripts (tests/tv/hunt-shield-*.js): the mocks' moment (Mon 26 Oct 2026
// 23:40), today's board with the Grizzlies at the Jazz at 01:00, the Grizzlies' win at the Kings (Sun 25 Oct, late:
// 123-112) unseen, ESPN records on the board (MEM 3-0 counts that win), and a scan of the screen for anything that tells it.
const fs = require('fs'), path = require('path');
const F = path.resolve(__dirname, '../fixtures/espn');
const H = { 'Access-Control-Allow-Origin': '*' };
const sched = JSON.parse(fs.readFileSync(`${F}/schedule-29.json`, 'utf8'));
const sb = JSON.parse(fs.readFileSync(`${F}/scoreboard.json`, 'utf8'));
const clone = (x) => JSON.parse(JSON.stringify(x));
const SAC_ID = '401909867', JAZZ_ID = '401909875';

// ESPN's records next to each team: MEM 3-0 includes the unseen Kings win (seen finals alone: 2-0).
function withRecords(e, recs) {
  e = clone(e);
  for (const c of e.competitions[0].competitors) if (recs[c.team.abbreviation]) c.records = [{ summary: recs[c.team.abbreviation] }];
  return e;
}
const jazz = (over = {}) => {
  const e = withRecords(sched.events.find((x) => x.id === JAZZ_ID), { MEM: '3-0', UTAH: '1-2' });
  if (over.state) {
    const st = e.competitions[0].status || (e.competitions[0].status = {});
    st.type = { state: over.state, completed: over.state === 'post', shortDetail: over.detail || '' };
    st.period = over.period || 0; st.displayClock = over.clock || '';
    e.status = st;
    for (const c of e.competitors || e.competitions[0].competitors) c.score = over.state === 'pre' ? undefined : String(c.homeAway === 'home' ? over.home ?? 100 : over.away ?? 101);
  }
  return e;
};
// A made-up game: { id, date, away, home, as, hs (scores), state, ar, hr (records), period, clock, detail }
function mk(o) {
  const st = { type: { state: o.state || 'pre', completed: o.state === 'post', shortDetail: o.detail || (o.state === 'post' ? 'Final' : '') }, period: o.period || 0, displayClock: o.clock || '' };
  const side = (abbr, ha, sc, rec) => ({ homeAway: ha, team: { id: String(require('./hunt-shield-ids.json')[abbr] || 0), abbreviation: abbr, shortDisplayName: o.names?.[abbr] || abbr, displayName: abbr }, score: o.state && o.state !== 'pre' ? String(sc) : undefined, records: rec ? [{ summary: rec }] : undefined });
  return { id: o.id, date: o.date, status: st, competitions: [{ status: st, competitors: [side(o.home, 'home', o.hs, o.hr), side(o.away, 'away', o.as, o.ar)], broadcasts: [] }] };
}
const board = (events) => ({ ...sb, day: { date: '2026-10-26' }, events });

module.exports = function lib({ p, key }) {
  const ev = (f, a) => p.evaluate(f, a);
  const hold = async () => { await p.keyboard.down('Enter'); await p.waitForTimeout(650); await p.keyboard.up('Enter'); await p.waitForTimeout(400); };
  let today = board([jazz()]);
  const days = {}, failDays = new Set();
  let lastJazz = null;
  const setBoard = (b) => { today = b; };
  const routes = async ({ schedule503 = false } = {}) => {
    await p.route('**/espn/scoreboard*', (r) => {
      const u = new URL(r.request().url()), d = u.searchParams.get('dates');
      if (d && failDays.has(d)) return r.fulfill({ status: 503, headers: H, body: 'down' });
      const body = d ? days[d] || { day: { date: d }, events: [] } : today;
      return r.fulfill({ contentType: 'application/json', headers: H, body: JSON.stringify(body) });
    });
    await p.route('**/espn/summary?event=401909867', (r) => r.fulfill({ contentType: 'application/json', headers: H, body: fs.readFileSync(`${F}/summary-401909850.json`, 'utf8') }));
    if (schedule503) await p.route('**/espn/teams/*/schedule', (r) => r.fulfill({ status: 503, headers: H, body: 'down' }));
    // the Grizzlies' schedule follows today's board for the Jazz game (the fixture has it 'pre' for ever)
    else await p.route('**/espn/teams/29/schedule', (r) => {
      const d = clone(sched), j = (today.events || []).find((e) => e.id === JAZZ_ID) || lastJazz;
      if (j) { lastJazz = j; d.events = d.events.map((e) => (e.id === JAZZ_ID ? j : e)); }
      return r.fulfill({ contentType: 'application/json', headers: H, body: JSON.stringify(d) });
    });
    // the summary of the Jazz game: its state and score from the board
    await p.route('**/espn/summary?event=401909875', (r) => {
      const j = (today.events || []).find((e) => e.id === JAZZ_ID) || lastJazz;
      if (!j) return r.fulfill({ status: 404, headers: H, body: '' });
      const c = j.competitions[0];
      return r.fulfill({ contentType: 'application/json', headers: H, body: JSON.stringify({ header: { competitions: [{ date: j.date, status: j.status || c.status, competitors: c.competitors }] }, boxscore: { players: [], teams: [] }, plays: [] }) });
    });
  };
  // shield: 'off' | 'mine' | 'all'; seen: the nbaSeen store (undefined: the Kings final unseen; null: none stored)
  const start = async ({ shield = 'mine', seen, pin = false, clock = '2026-10-26T23:40:00Z', schedule503 = false, before } = {}) => {
    await routes({ schedule503 });
    await p.clock.install({ time: new Date(clock) });
    await p.reload(); await p.waitForTimeout(1500);
    const first = await ev(() => window.__tunerTest?.state().screen);
    if (first === 'first' || !first) { await require('./signin.js')({ p, key }); await p.waitForTimeout(2500); }
    await ev(({ shield, seen }) => {
      const k = 'tuner.settings', v = JSON.parse(localStorage.getItem(k) || '{}');
      v.shield = shield; v.nbaTeam = 'MEM';
      localStorage.setItem(k, JSON.stringify(v));
      if (seen === null) localStorage.removeItem('tuner.nbaSeen');
      else localStorage.setItem('tuner.nbaSeen', JSON.stringify(seen || { upTo: Date.parse('2026-10-25T12:00:00Z'), ids: [] }));
      localStorage.removeItem('tuner.nbaPins'); localStorage.removeItem('tuner.nba:today');
    }, { shield, seen });
    if (pin) await ev(async () => { const t = Date.parse('2026-10-26T01:00:00Z'); await window.Core.cache.set(`nba:pin:${t}`, { at: t, standings: await window.NBA.standings(), teamStats: await window.NBA.teamStats(), leaders: {} }); localStorage.setItem('tuner.nbaPins', JSON.stringify([t])); });
    if (before) await before();
    await p.reload(); await p.waitForTimeout(4500);
  };
  const G = (f, a) => ev(async ({ f, a }) => { const m = await import('/tv/js/games.js'); return new Function('m', 'a', `return (${f})(m, a)`)(m, a); }, { f: f.toString(), a });
  // Anything on screen that tells the Kings result: the score, MEM's ESPN record 3-0 (without the eye-off), the
  // stories that give it away.
  const LEAK = /123\s?[-–]\s?112|112\s?[-–]\s?123|\bW 123|Ty Jerome scores 31|aim for 4th straight|Sacramento faces San Antonio on 3-game slide/;
  const scan = async (label) => {
    const r = await ev((src) => {
      const re = new RegExp(src);
      const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden]'); };
      const hits = [];
      for (const e of document.querySelectorAll('body *')) {
        if (e.children.length || !vis(e)) continue;
        const t = (e.textContent || '').trim();
        if (re.test(t)) hits.push(t.slice(0, 90));
      }
      // MEM's record shown as 3-0 (the count with the unseen win), anywhere a record goes
      for (const e of document.querySelectorAll('.rc, .nb-rec .big, .nb-rp')) if (vis(e) && /\b3-0\b/.test(e.textContent)) hits.push(`record "${e.textContent.trim()}" (${e.className})`);
      return hits;
    }, LEAK.source);
    console.log(`${r.length ? 'LEAK ' : 'ok   '}${label.padEnd(34)}${r.join(' | ')}`);
    return r;
  };
  const where = () => ev(() => { const a = document.activeElement; return a ? `${a.className} ${a.dataset.key || a.dataset.act || a.dataset.sec || a.dataset.tabG || ''} "${(a.textContent || '').trim().slice(0, 40)}"` : 'none'; });
  const text = (sel) => ev((s) => [...document.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().width).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).join(' | '), sel);
  const seen = () => ev(() => localStorage.getItem('tuner.nbaSeen'));
  const toSection = async (n) => {   // the NBA tab's section row: 0 Games, 1 team, 2 Standings, 3 Leaders, 4 Team stats, 5 News
    await ev(() => window.__tunerTest.go('nba')); await p.waitForTimeout(1500);
    for (let i = 0; i < 4 && !(await ev(() => !!document.activeElement.dataset.sec)); i++) await key('ArrowUp', 1, 300);
    await key('ArrowLeft', 6, 80); await key('ArrowRight', n, 120); await p.waitForTimeout(1800);
  };
  return { mk, days, failDays, ev, hold, start, setBoard, board, jazz, withRecords, sched, sb, scan, where, text, seen, G, toSection, SAC_ID, JAZZ_ID, clone };
};
