// Shared by the catch-up scripts (design/ui-v1/catchup/SPEC.md): the morning after, Tue 27 Oct 2026 10:40 (Reykjavik =
// UTC). The Grizzlies played at the Jazz at 01:00 (the "Mon 26 Oct · late" game), final, unseen under the shield (My
// team). ESPN's answers are made here from the fixtures: the Jazz game is final 118-112 with its plays (the Warriors
// game's plays, moved to 01:12 and played on to a final); the fake provider's guide follows the page's clock (the
// x-mock-now header). opts: { at (ISO time), state ('post' | 'in'), shield ('mine' | 'off' | 'all'), seenUpTo, progress }.
const fs = require('fs'), path = require('path');
const F = path.resolve(__dirname, '../fixtures/espn');
const JAZZ = '401909875', TIP = Date.parse('2026-10-27T01:00:00Z');
const H = 3600e3;

function jazzSummary(upTo) {
  const d = JSON.parse(fs.readFileSync(`${F}/summary-401909850.json`, 'utf8')
    .replace(/"Golden State Warriors"/g, '"Utah Jazz"').replace(/"Golden State"/g, '"Utah"').replace(/"Warriors"/g, '"Jazz"').replace(/"GS"/g, '"UTAH"').replace(/"GSW"/g, '"UTA"'));
  // the plays from 01:12, then played on to the final (Q3 to the end, Q4, a final 118-112)
  const first = Date.parse(d.plays[0].wallclock), shift = TIP + 12 * 60e3 - first;
  for (const p of d.plays) p.wallclock = new Date(Date.parse(p.wallclock) + shift).toISOString();
  let last = d.plays[d.plays.length - 1], t = Date.parse(last.wallclock), a = last.awayScore, h = last.homeScore, n = 0;
  const add = (period, clock, text, da = 0, dh = 0, dt = 90e3) => {
    t += dt; a += da; h += dh; n++;
    d.plays.push({ id: `x${n}`, text, awayScore: a, homeScore: h, period: { number: period }, clock: { displayValue: clock }, scoringPlay: !!(da || dh), team: { id: da ? '29' : '9' }, wallclock: new Date(t).toISOString() });
  };
  for (let k = 0; k < 5; k++) add(3, `${6 - k}:00`, k % 2 ? 'Jaren Jackson Jr. makes 2-foot layup' : 'Lauri Markkanen makes 3-pt jump shot', k % 2 ? 2 : 0, k % 2 ? 0 : 3);
  add(3, '0:00', 'End of the 3rd Quarter', 0, 0, 60e3);
  for (let k = 0; k < 10; k++) add(4, `${11 - k}:00`, k % 2 ? 'Ja Morant makes driving layup' : 'Keyonte George makes jump shot', k % 2 ? 2 : 0, k % 2 ? 0 : 2);
  // up to the final score
  const fa = 118 - a, fh = 112 - h;
  add(4, '0:40', 'Desmond Bane makes 3-pt jump shot', Math.max(0, fa), 0);
  add(4, '0:10', 'Walker Kessler makes dunk', 0, Math.max(0, fh));
  add(4, '0:00', 'End of Game', 0, 0, 40e3);
  if (upTo) d.plays = d.plays.filter((p) => Date.parse(p.wallclock) <= upTo);
  const comp = d.header.competitions[0];
  comp.date = new Date(TIP).toISOString();
  const live = !!upTo && Date.parse(d.plays[d.plays.length - 1]?.wallclock || 0) < t;
  comp.status = live ? { displayClock: '6:41', period: 2, type: { state: 'in', completed: false, shortDetail: '6:41 - 2nd' } } : { displayClock: '0:00', period: 4, type: { state: 'post', completed: true, shortDetail: 'Final', detail: 'Final' } };
  const lastP = d.plays[d.plays.length - 1];
  for (const c of comp.competitors) c.score = String(c.homeAway === 'home' ? lastP.homeScore : lastP.awayScore);
  return d;
}
// The schedule's Jazz game, as the scoreboard has it now
function jazzEvent(state, score) {
  const sched = JSON.parse(fs.readFileSync(`${F}/schedule-29.json`, 'utf8'));
  const e = JSON.parse(JSON.stringify(sched.events.find((x) => x.id === JAZZ)));
  const c = e.competitions[0];
  const st = state === 'post' ? { type: { state: 'post', completed: true, shortDetail: 'Final', detail: 'Final' }, period: 4, displayClock: '0:00' } : state === 'in' ? { type: { state: 'in', completed: false, shortDetail: '6:41 - 2nd', detail: '6:41 - 2nd Quarter' }, period: 2, displayClock: '6:41' } : { type: { state: 'pre', completed: false, shortDetail: 'Scheduled' }, period: 0, displayClock: '0:00' };
  e.status = st; c.status = st;
  for (const x of c.competitors) { x.score = state === 'pre' ? '' : { displayValue: String(x.homeAway === 'home' ? score[1] : score[0]) }; x.records = [{ summary: x.homeAway === 'home' ? '1-2' : '3-0' }]; }
  c.broadcasts = [{ names: ['NBA League Pass'] }];
  return { e, sched };
}

module.exports = async ({ p, key }, opts = {}) => {
  const ev = (f, a) => p.evaluate(f, a);
  const at = Date.parse(opts.at || '2026-10-27T10:40:00Z'), state = opts.state || 'post';
  const cors = { 'Access-Control-Allow-Origin': '*' };
  const sb = JSON.parse(fs.readFileSync(`${F}/scoreboard.json`, 'utf8'));
  const { e: jazz, sched } = jazzEvent(state, state === 'post' ? [118, 112] : [55, 51]);
  // last night's other games, finals; tonight's, scheduled
  const others = (dayIso, st) => sb.events.filter((x) => x.id !== '401909850').slice(0, 6).map((x, k) => {
    const y = JSON.parse(JSON.stringify(x)); y.id = `${y.id}${dayIso.slice(8, 10)}`; y.date = `${dayIso}T${String(23 + (k % 2)).padStart(2, '0')}:00Z`.replace('T24', 'T23');
    if (st === 'pre') { y.status = { type: { state: 'pre', completed: false, shortDetail: 'Scheduled' } }; for (const c of y.competitions[0].competitors) c.score = ''; }
    else y.status = { type: { state: 'post', completed: true, shortDetail: 'Final' } };
    y.competitions[0].status = y.status;
    return y;
  });
  const lastNight = { ...sb, day: { date: '2026-10-26' }, events: [jazz, ...others('2026-10-26', 'post')] };
  const tonight = { ...sb, day: { date: '2026-10-27' }, events: others('2026-10-27', 'pre') };
  const liveBoard = { ...sb, day: { date: '2026-10-26' }, events: [jazz, ...others('2026-10-26', 'post')] };
  await p.route('**/espn/scoreboard*', (r) => {
    const u = r.request().url();
    const body = state === 'in' ? liveBoard : /dates=20261027/.test(u) ? tonight : lastNight;
    r.fulfill({ contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
  });
  sched.events = sched.events.map((x) => (x.id === JAZZ ? jazz : x));
  await p.route('**/espn/teams/*/schedule', (r) => r.fulfill({ contentType: 'application/json', headers: cors, body: JSON.stringify(sched) }));
  await p.route(`**/espn/summary?event=${JAZZ}`, (r) => r.fulfill({ contentType: 'application/json', headers: cors, body: JSON.stringify(jazzSummary(state === 'in' ? at - 75e3 : 0)) }));
  await p.route('**/espn/summary?event=401909867', (r) => r.fulfill({ contentType: 'application/json', headers: cors, body: fs.readFileSync(`${F}/summary-401909850.json`, 'utf8') }));
  // the provider's guide on the page's clock
  await p.route('**/player_api.php*', (r) => r.continue({ headers: { ...r.request().headers(), 'x-mock-now': String(at + (Date.now() - started)) } }));
  const started = Date.now();
  await p.clock.install({ time: new Date(at) });
  await ev((o) => {
    const k = 'tuner.settings', v = JSON.parse(localStorage.getItem(k) || '{}');
    v.shield = o.shield || 'mine'; v.nbaTeam = 'MEM'; if (o.replaysPlay) v.replaysPlay = o.replaysPlay; else delete v.replaysPlay;
    localStorage.setItem(k, JSON.stringify(v));
    localStorage.setItem('tuner.nbaSeen', JSON.stringify({ upTo: o.seenUpTo || Date.parse('2026-10-26T12:00:00Z'), ids: [] }));
    localStorage.removeItem('tuner.nba:today');
  }, opts);
  await p.reload(); await p.waitForTimeout(1500);
  const first = await ev(() => window.__tunerTest?.state().screen);
  if (first === 'first' || !first) await require('./signin.js')({ p, key });
  await p.waitForTimeout(2500);
  // per-account bits after sign-in (the account id is known then): progress, picks, the first-replay check's answer
  if (opts.account) { await ev(opts.account, { at, TIP }); await p.reload(); await p.waitForTimeout(4000); }
};
module.exports.JAZZ = JAZZ;
module.exports.TIP = TIP;
// What's on screen as text (for the shield sweep): every visible element's text, the overlays included.
module.exports.screenText = (p) => p.evaluate(() => {
  const vis = (e) => { for (let n = e; n; n = n.parentElement) { if (n.hidden) return false; const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; } return true; };
  return [...document.querySelectorAll('#screens [data-screen]:not([hidden]), #overlays, #topbar')].map((r) => [...r.querySelectorAll('*')].filter((e) => e.children.length === 0 && vis(e)).map((e) => e.textContent.trim()).filter(Boolean).join(' | ')).join(' || ');
});
// The shield's SPOILER rule (SPEC 11), run on the app's text: dates go first, then a score, a result word, OT, a
// remaining time, an end time, the live state.
module.exports.spoilers = (text) => {
  const t = text.replace(/\b20\d\d-\d\d-\d\d\b|\b\d{1,2}\.\d{1,2}\.\d{2,4}\b|\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, ' ');
  const out = [];
  for (const [name, re] of [['score', /\b(6\d|[7-9]\d|1\d\d)\s?(:|—|–|-|to)\s?(6\d|[7-9]\d|1\d\d)\b/], ['Final', /\bFinal\b/], ['won/beat', /\b(won|beat|beats|wins)\b/i], ['OT', /\b(OT|2OT|overtime)\b/], ['remaining', /−\d+:\d\d|\b\d+ min left\b|\bEnds at\b/], ['live state', /Live is in/]]) {
    const m = t.match(re);
    if (m) out.push(`${name}: "${t.slice(Math.max(0, m.index - 40), m.index + 40)}"`);
  }
  return out;
};
