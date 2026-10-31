// The iPhone app's main flows in Chromium at 393 x 852 (touch, 3x) against the fake provider and fake ESPN
// (design/ui-v1/phone-v1/SPEC.md): sign in, Home, Live and a channel (the player opens and plays HLS), the NBA hub,
// a game page and From tip-off (the replay plays its .m3u8), Library and a title page, Search, Account and Check
// streams on this iPhone, the player in landscape, then the NBA tab in depth (every section, team pages, the player
// sheet, the game page's tabs, the shield; every screen inside the phone's width). Screenshots go to <outdir>.
// Run: tests/tv/serve.sh (the fake servers), node scripts/build-web.js phone, then serve www/ on 8779
// (python3 -m http.server 8779 --directory www), then: node tests/phone/flows.js <outdir>
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2] || '.tmp/phone-shots';
const APP = process.env.PHONE_URL || 'http://127.0.0.1:8779/index.html';
const H = 'http://127.0.0.1:8899';
fs.mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(44)} ${detail}`); return ok; };

// Every element of the screen (or the sheets) inside the phone's width: it may only reach past it inside a box that
// scrolls or clips sideways and is itself inside the screen (WebKit sized the Library grid by its titles once).
const OVERFLOW = (sel) => {
  const root = document.querySelector(sel), W = innerWidth, bad = [];
  if (!root) return { n: -1, bad: ['no ' + sel] };
  const inside = (r) => r.right <= W + 0.5 && r.left >= -0.5;
  // clipped by a box (scrolling or overflow hidden) that is inside the screen
  const clipped = (e) => { for (let a = e.parentElement; a && a !== root; a = a.parentElement) { if (getComputedStyle(a).overflowX !== 'visible' && inside(a.getBoundingClientRect())) return true; } return false; };
  for (const e of root.querySelectorAll('*')) {
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height || inside(r) || clipped(e)) continue;
    bad.push(`${e.tagName.toLowerCase()}.${String(e.className?.baseVal ?? e.className).split(' ')[0]} ${Math.round(r.left)}..${Math.round(r.right)}`);
  }
  return { n: bad.length, bad: bad.slice(0, 4), sw: root.scrollWidth, cw: root.clientWidth };
};
(async () => {
  const b = await chromium.launch({ args: ['--disable-web-security', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|404|favicon/.test(m.text())) errs.push(`CONSOLE ${m.text()}`); });
  await fetch(`${H}/_stremio/reset`).catch(() => {});
  await p.addInitScript((H) => {
    window.TUNER_TEST = 1;
    for (const [k, v] of Object.entries({ nbaBase: `${H}/espn`, nbaWebBase: `${H}/espnweb`, nbaContentBase: `${H}/espncontent`, cinemetaBase: `${H}/addon/cinemeta`, stremioApi: `${H}/stremio-api`, stremioLink: `${H}/stremio-link`, ratingsUrl: `${H}/ratings.json`, tmdbBase: `${H}/tmdb/3`, tmdbImg: `${H}/tmdb-img` })) if (!localStorage.getItem(`tuner.${k}`)) localStorage.setItem(`tuner.${k}`, JSON.stringify(v));
  }, H);
  let n = 0;
  const shot = async (name) => { await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); };
  const ev = (f, a) => p.evaluate(f, a);
  const state = () => ev(() => window.__tunerTest?.state());
  const tap = async (sel) => { if (/data-tab/.test(sel)) await ev(() => document.querySelector('#ph-tabs').classList.remove('mini')); for (let i = 0; ; i++) { try { const el = await p.waitForSelector(sel, { timeout: 8000 }); await el.tap(); break; } catch (e) { if (i >= 2 || !/not attached/.test(e.message)) throw e; } } await p.waitForTimeout(400); };
  const wait = async (f, ms = 10000, a) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(f, a).catch(() => false)) return true; await p.waitForTimeout(250); } return false; };
  const text = (sel) => ev((s) => document.querySelector(s)?.innerText || '', sel);

  async function nbaDeep() {
    const F = require('path').resolve(__dirname, '../fixtures/espn');
    const sched = JSON.parse(fs.readFileSync(`${F}/schedule-29.json`, 'utf8')), sb = JSON.parse(fs.readFileSync(`${F}/scoreboard.json`, 'utf8'));
    const jazz = sched.events.find((e) => e.id === '401909875');
    const board = { ...sb, day: { date: '2026-10-26' }, events: [jazz, ...sb.events.filter((e) => e.id !== '401909850')] };
    await p.close();   // (its own seen store and clock would prune the copy kept for the shield below)
    const q = await ctx.newPage();
    q.on('pageerror', (e) => errs.push(`PAGEERROR(nba) ${e.message}`));
    q.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|404|favicon/.test(m.text())) errs.push(`CONSOLE(nba) ${m.text()}`); });
    await q.addInitScript(() => { window.TUNER_TEST = 1; });
    const hdr = { 'Access-Control-Allow-Origin': '*' };
    await q.route('**/espn/scoreboard*', (r) => r.fulfill({ contentType: 'application/json', headers: hdr, body: JSON.stringify(board) }));
    // the Kings final has no box score in the fixtures: the Warriors one stands in
    await q.route('**/espn/summary?event=401909867', (r) => r.fulfill({ contentType: 'application/json', headers: hdr, body: fs.readFileSync(`${F}/summary-401909850.json`, 'utf8') }));
    await q.clock.install({ time: new Date('2026-10-26T23:40:00Z') });
    const qe = (f, a) => q.evaluate(f, a);
    const qwait = async (f, ms = 10000, a) => { const t = Date.now(); while (Date.now() - t < ms) { if (await qe(f, a).catch(() => false)) return true; await q.waitForTimeout(250); } return false; };
    const qshot = async (name) => { await q.waitForTimeout(500); await q.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); };
    const qtap = async (sel) => { const e = await q.waitForSelector(sel, { timeout: 8000 }); await e.scrollIntoViewIfNeeded(); await e.tap(); await q.waitForTimeout(450); };
    const sec = async (k) => { await qe((k) => document.querySelector(`[data-screen="nba"] [data-sec="${k}"]`).click(), k); await q.waitForTimeout(600); };
    const fits = async (name, sel = '#ph-screens > section:not([hidden])') => { const o = await qe(OVERFLOW, sel); check(`${name}: inside the screen's width`, o.n === 0, o.n ? o.bad.join(' | ') : `${o.cw} wide`); };
    const scr = () => qe(() => window.__tunerTest.state().screen);
    const closeSheets = async () => { for (let i = 0; i < 3 && await qe(() => document.querySelectorAll('#ph-sheets .sh-ov').length); i++) { await qe(() => document.querySelector('#ph-sheets .sh-ov:last-child .scrim').click()); await q.waitForTimeout(400); } };
    const setShield = (on) => qe((on) => {
      const k = 'tuner.settings', v = JSON.parse(localStorage.getItem(k) || '{}');
      v.shield = on ? 'mine' : 'off'; v.nbaTeam = 'MEM';
      localStorage.setItem(k, JSON.stringify(v));
      // the Kings final (Sun 25 Oct, late) is the one he hasn't seen; the two before it he has
      localStorage.setItem('tuner.nbaSeen', JSON.stringify({ upTo: Date.parse('2026-10-25T12:00:00Z'), ids: [] }));
    }, on);
    const start = async (on) => {
      await setShield(on);
      if (on) await qe(async () => { const t = Date.parse('2026-10-26T01:00:00Z'); await window.Core.cache.set(`nba:pin:${t}`, { at: t, standings: await window.NBA.standings(), teamStats: await window.NBA.teamStats(), leaders: {} }); localStorage.setItem('tuner.nbaPins', JSON.stringify([t])); });
      await q.reload(); await q.waitForTimeout(2500);
      await qe(() => window.__tunerTest.go('nba')); await q.waitForTimeout(1500);
    };
    await q.goto(APP); await q.waitForTimeout(2000);
    await start(false);

    // the section row
    const secs = await qe(() => [...document.querySelectorAll('[data-screen="nba"] [data-sec]')].map((c) => c.textContent.trim()));
    check('NBA: the TV\'s sections', secs.join(',') === 'Games,Grizzlies,Standings,Leaders,Team stats,News', secs.join(' · '));
    await fits('NBA Games');

    // your team's page
    await sec('team');
    check('Team: header, schedule, ranks, roster', await qwait(() => /Grizzlies/.test(document.querySelector('.tp-head')?.innerText || '') && document.querySelectorAll('.tp-sched .tp-gt[data-g]').length > 10 && document.querySelectorAll('.tp-ranks .tp-rk').length >= 4 && document.querySelectorAll('.tp-ro tr[data-pl]').length >= 10, 12000),
      await qe(() => `${document.querySelectorAll('.tp-sched .tp-gt[data-g]').length} tiles · ${document.querySelectorAll('.tp-rk[data-cat]').length} ranks · ${document.querySelectorAll('.tp-ro tr[data-pl]').length} players`));
    const head = await qe(() => document.querySelector('.tp-head').innerText.replace(/\s+/g, ' '));
    check('Team: record, place and the next game', /\d+-\d+/.test(head) && /in the West/.test(head) && /next/i.test(head) && /Jazz/.test(head), head.slice(0, 120));
    check('Team: the schedule opens on the game that matters (in view)', await qe(() => { const r = document.querySelector('.tp-sched'), t = r.querySelector('.tp-gt.next') || r.querySelector('[data-g="401909875"]'); const a = t.getBoundingClientRect(); return a.left >= 0 && a.right <= innerWidth; }));
    check('Team: injuries listed', await qe(() => document.querySelectorAll('.tp-inj .tp-ij').length >= 1));
    check('Team: news cards', await qwait(() => document.querySelectorAll('.tp-news .tp-nc[data-story]').length >= 1, 8000));
    await qshot('nba-team');
    await fits('Team page (your team)');
    await qe(() => document.querySelector('[data-screen="nba"]').scrollTo({ top: 1100 })); await q.waitForTimeout(400);
    await qshot('nba-team-roster');
    // the roster's sort, then a player
    await qtap('[data-tact="sort"]');
    check('Roster: the sort sheet', await qwait(() => /Sort the roster/.test(document.querySelector('#ph-sheets')?.innerText || '')));
    await qe(() => [...document.querySelectorAll('#ph-sheets .lr')].find((b) => /Jersey/.test(b.innerText)).click()); await q.waitForTimeout(600);
    check('Roster: sorted by jersey', await qe(() => { const n = [...document.querySelectorAll('.tp-ro tr[data-pl] .no')].map((x) => (x.textContent === '' ? 999 : +x.textContent)); return n.length > 3 && n.every((x, i) => !i || x >= n[i - 1]); }));
    await qtap('.tp-ro tr[data-pl]');
    check('Player sheet: averages, last games', await qwait(() => { const t = document.querySelector('.pl-b')?.innerText || ''; return /PTS/.test(t) && /Last games/i.test(t) && /REB/.test(t); }, 8000), await qe(() => document.querySelector('.pl-b')?.innerText.replace(/\s+/g, ' ').slice(0, 140)));
    await q.waitForTimeout(1500);
    check('Player sheet: his line in a seen game', await qwait(() => document.querySelectorAll('.pl-g').length > 0, 6000), await qe(() => document.querySelector('.pl-last')?.innerText.replace(/\s+/g, ' ').slice(0, 100) || document.querySelector('.pl-b')?.innerText.slice(-80)));
    await qshot('nba-player');
    await fits('Player sheet', '#ph-sheets');
    await closeSheets();
    // Season ranks -> Team stats on that category
    await qe(() => document.querySelector('.tp-rk[data-cat]').click()); await q.waitForTimeout(800);
    check('Season ranks open Team stats on the category', await qe(() => document.querySelector('[data-screen="nba"] [data-sec="teamstats"]').classList.contains('sel') && document.querySelectorAll('.ts-row[data-team]').length === 30));

    // Team stats
    await sec('teamstats');
    check('Team stats: 30 teams, yours marked', await qwait(() => document.querySelectorAll('.ts-row[data-team]').length === 30 && !!document.querySelector('.ts-row.mine[data-team="MEM"]')));
    check('Team stats: your rank on the chips', await qe(() => /\d/.test(document.querySelector('[data-tcat] small')?.textContent || '')), await qe(() => document.querySelector('[data-tcat]')?.textContent));
    await qe(() => document.querySelectorAll('[data-tcat]')[2].click()); await q.waitForTimeout(500);
    check('Team stats: another category', await qe(() => document.querySelectorAll('[data-tcat]')[2].classList.contains('sel') && document.querySelectorAll('.ts-row').length === 30));
    await qshot('nba-teamstats');
    await fits('Team stats');

    // Leaders
    await sec('leaders');
    check('Leaders: the categories, the leader\'s card, rows 2 to 10', await qwait(() => document.querySelectorAll('[data-lcat]').length === 7 && !!document.querySelector('.ld-card') && document.querySelectorAll('.ld-row').length >= 3, 8000), await qe(() => `${document.querySelectorAll('.ld-row').length} rows`));
    await qshot('nba-leaders');
    await fits('Leaders');
    await qe(() => document.querySelectorAll('[data-lcat]')[1].click()); await q.waitForTimeout(600);
    check('Leaders: another category', await qe(() => document.querySelectorAll('[data-lcat]')[1].classList.contains('sel') && !!document.querySelector('.ld-card')));
    await qtap('.ld-card');
    check('Leaders: the player sheet with his team\'s page', await qwait(() => !!document.querySelector('.pl-b [data-act="team"]')));
    const lteam = await qe(() => document.querySelector('.pl-b [data-act="team"]').innerText.trim());
    await qtap('.pl-b [data-act="team"]');
    check('a team page from Leaders (pushed)', await qwait(() => window.__tunerTest.state().screen === 'team' && !!document.querySelector('[data-screen="team"] .tp-head')), lteam);
    await qe(() => window.__tunerTest.back()); await q.waitForTimeout(500);

    // Standings -> another team's page, All teams, Back
    await sec('standings');
    check('Standings: 15 teams with their pages', await qwait(() => document.querySelectorAll('.box-t.st tr[data-team]').length === 15));
    await qshot('nba-standings');
    await fits('Standings');
    await qtap('.box-t.st tr[data-team="SAC"]');
    check('Standings: a team\'s page pushed', await qwait(() => window.__tunerTest.state().screen === 'team' && /Kings/.test(document.querySelector('[data-screen="team"] .ph-top')?.innerText || '')));
    check('Team page: Make the Kings my team', await qe(() => /Make the Kings my team/.test(document.querySelector('[data-screen="team"] .nb-tools')?.innerText || '')));
    await qshot('team-kings');
    await fits('Team page (pushed)');
    await qtap('[data-screen="team"] [data-tact="all"]');
    check('All teams: 30 crests', await qwait(() => document.querySelectorAll('#ph-sheets .tp-pk[data-pick]').length === 30));
    await fits('All teams', '#ph-sheets');
    await qe(() => document.querySelector('#ph-sheets .tp-pk[data-pick="BOS"]').click()); await q.waitForTimeout(800);
    check('All teams: a tap opens that team', /Celtics/.test(await qe(() => document.querySelector('[data-screen="team"] .ph-top')?.innerText || '')));
    await qe(() => window.__tunerTest.back()); await q.waitForTimeout(500);
    check('Back: the Kings page again', /Kings/.test(await qe(() => document.querySelector('[data-screen="team"] .ph-top')?.innerText || '')));
    await qe(() => window.__tunerTest.back()); await q.waitForTimeout(500);
    check('Back: the NBA tab', (await scr()) === 'nba');

    // News and the reader
    await sec('news');
    check('News: the lead story and the list', await qwait(() => !!document.querySelector('.nw-lead') && document.querySelectorAll('.nw-row').length >= 3, 8000));
    await qshot('nba-news');
    await fits('News');
    await qtap('.nw-lead');
    check('News: the reader', await qwait(() => document.querySelectorAll('.rd-in p').length >= 2, 8000), await qe(() => document.querySelector('.rd-in h2')?.textContent || ''));
    await qshot('nba-story');
    await fits('Story reader', '#ph-sheets');
    await closeSheets();

    // the game page's tabs (Lakers at Clippers, live)
    await qe(() => window.__tunerTest.push('game', { id: '401909851' }));
    check('Game page: tabs Summary, Box score, Plays, Replays', await qwait(() => [...document.querySelectorAll('[data-screen="game"] [data-gtab]')].map((t) => t.textContent).join() === 'Summary,Box score,Plays,Replays'));
    check('Game: summary (top performers, team stats)', await qwait(() => document.querySelectorAll('.gm-ts .r').length >= 4 && document.querySelectorAll('.gm-tp').length >= 3, 8000));
    await qshot('game-summary');
    await fits('Game summary');
    await qtap('[data-gtab="box"]');
    check('Game: box score', await qwait(() => document.querySelectorAll('.gm-box tbody tr').length >= 5));
    await qtap('[data-gside="home"]');
    check('Game: the other team\'s box', await qwait(() => document.querySelector('[data-gside="home"]').classList.contains('sel') && document.querySelectorAll('.gm-box tbody tr').length >= 5));
    await qshot('game-box');
    await fits('Game box score');
    await qtap('[data-gtab="plays"]');
    check('Game: plays', await qwait(() => document.querySelectorAll('.gm-plays > div').length >= 5));
    await qtap('[data-gtab="replays"]');
    check('Game: replays (sources, pick the channel, choose a video, look again)', await qwait(() => !!document.querySelector('[data-gact="pickch"]') && !!document.querySelector('[data-gact="choose"]') && !!document.querySelector('[data-gact="look"]')));
    await qshot('game-replays');
    await fits('Game replays');
    await qe(() => window.__tunerTest.back()); await q.waitForTimeout(500);

    // ---------- the shield: My team, the Kings final unseen ----------
    await start(true);
    await sec('team');
    await qwait(() => !!document.querySelector('.tp-gt[data-g="401909867"]'), 10000);
    const kt = await qe(() => document.querySelector('.tp-gt[data-g="401909867"]')?.innerText.replace(/\s+/g, ' ') || '');
    check('Shield: the Kings tile says Result hidden, no score', /Result hidden/.test(kt) && !/\d{2,3}\s*[-–]\s*\d{2,3}/.test(kt), kt);
    const sh = await qe(() => document.querySelector('.tp-rec')?.innerText.replace(/\s+/g, ' ') || '');
    check('Shield: the record counts seen finals, 1 result hidden', /1 result hidden/.test(sh) && /Kings/.test(sh), sh);
    check('Shield: the roster hides points and shooting', await qe(() => document.querySelectorAll('.tp-ro .hidc').length >= 10 && /Points and shooting hidden/.test(document.querySelector('.tp-sm')?.innerText || '')));
    check('Shield: Season ranks are the copy from before tip-off', /as of tip-off/i.test(await qe(() => [...document.querySelectorAll('.tp-h')].find((h) => /Season ranks/.test(h.innerText))?.innerText || '')));
    await qshot('team-shield');
    await fits('Team page under the shield');
    await qtap('.tp-ro tr[data-pl]');
    await qwait(() => /seen game|Season averages/.test(document.querySelector('.pl-b')?.innerText || ''), 8000);
    const pls = await qe(() => document.querySelector('.pl-b')?.innerText.replace(/\s+/g, ' ') || '');
    check('Shield: the player sheet shows MIN, REB, AST only', /MIN/.test(pls) && !/\bPTS\b/.test(pls.split(/Last games/i)[0]) && /Points and shooting are hidden/.test(pls) && !/in the NBA in/.test(pls), pls.slice(0, 160));
    check('Shield: his last games are seen ones (not the Kings)', !/Kings/.test(pls.split(/Last games/i)[1] || ''), (pls.split(/Last games/i)[1] || '').slice(0, 100));
    await qshot('player-shield');
    await closeSheets();
    await sec('leaders');
    check('Shield: Leaders covered (no copy kept)', await qwait(() => /Leaders are hidden/.test(document.querySelector('.nb-cov')?.innerText || '')));
    await sec('standings');
    check('Shield: Standings are the copy as of tip-off', await qwait(() => /As of tip-off, Grizzlies at Kings/.test(document.querySelector('.nb-pin')?.innerText || '') && document.querySelectorAll('.box-t.st tr[data-team]').length === 15));
    await qshot('standings-shield');
    await sec('teamstats');
    check('Shield: Team stats are the copy as of tip-off', await qwait(() => /As of tip-off/.test(document.querySelector('.nb-pin')?.innerText || '')));
    // the game page: the shield card, no Plays tab, Reveal behind a confirm
    await qe(() => window.__tunerTest.push('game', { id: '401909867' }));
    await qwait(() => !!document.querySelector('.gm-cov'), 8000);
    const gp = await qe(() => document.querySelector('[data-screen="game"]').innerText.replace(/\s+/g, ' '));
    check('Shield: the game page hides the score, no Plays tab', /Score hidden/.test(gp) && !(await qe(() => !!document.querySelector('[data-gtab="plays"]'))) && !/\b1\d\d\s*–\s*1\d\d\b/.test(gp), gp.slice(0, 140));
    await qshot('game-shield');
    await qtap('.gm-cov [data-gact="reveal"]');
    check('Shield: Reveal asks first', await qwait(() => /Reveal Grizzlies at Kings\?|Reveal Kings|Reveal .*Kings.*\?/.test(document.querySelector('#ph-sheets')?.innerText || '')), await qe(() => document.querySelector('#ph-sheets h3')?.textContent || ''));
    await qshot('reveal-confirm');
    await qe(() => document.querySelector('#ph-sheets [data-act="no"]').click()); await q.waitForTimeout(600);
    check('Shield: Keep it hidden keeps it hidden', await qe(() => !!document.querySelector('.gm-cov') && /Score hidden/.test(document.querySelector('[data-screen="game"]').innerText)));
    await qtap('.gm-cov [data-gact="reveal"]');
    await qe(() => document.querySelector('#ph-sheets [data-act="yes"]').click()); await q.waitForTimeout(1200);
    check('Shield: Reveal shows the score and the box score', await qwait(() => !document.querySelector('.gm-cov') && !!document.querySelector('.gm-sc') && !!document.querySelector('[data-gtab="plays"]'), 8000), await qe(() => document.querySelector('.gm-head')?.innerText.replace(/\s+/g, ' ') || ''));
    await qshot('game-revealed');
    await qe(() => window.__tunerTest.back()); await q.waitForTimeout(600);
    await sec('team');
    check('Shield: after Reveal the Kings tile shows its result', await qwait(() => /[WL]\s*\d{2,3}/.test(document.querySelector('.tp-gt[data-g="401909867"]')?.innerText || ''), 6000), await qe(() => document.querySelector('.tp-gt[data-g="401909867"]')?.innerText.replace(/\s+/g, ' ')));
    await setShield(false);
    await q.close();
  }

  await p.goto(APP);
  await p.waitForTimeout(1500);
  check('starts on sign in', (await state())?.screen === 'signin');
  // the fields as an iPhone types them (review 2, S4)
  const attrs = await ev(() => { const s = document.querySelector('#siServer'), u = document.querySelector('#siUser'), pw = document.querySelector('#siPass'); return { s: [s.getAttribute('autocapitalize'), s.getAttribute('autocorrect'), s.getAttribute('inputmode')], u: [u.getAttribute('autocapitalize'), u.getAttribute('autocomplete')], pw: pw.getAttribute('autocomplete'), labels: [...document.querySelectorAll('.si-card label')].map((l) => l.textContent) }; });
  check('sign-in fields: labels and iPhone attributes', attrs.s.join() === 'off,off,url' && attrs.u.join() === 'off,username' && attrs.pw === 'current-password' && attrs.labels.join() === 'Server,Username,Password', JSON.stringify(attrs));
  await shot('signin');
  await p.fill('#siServer', '127.0.0.1:8899');
  await p.fill('#siUser', 'demo');
  await p.fill('#siPass', 'demo');
  await tap('#siGo');
  check('sign in reaches the team step', await wait(() => !!document.querySelector('[data-act="done"]'), 15000));
  await shot('signin-team');
  // the fake Stremio account's add-ons, as Account > Add-ons > Sign in would bring them (the fake API answers any login)
  await ev(async (H) => {
    const acc = JSON.parse(localStorage.getItem('tuner.accounts') || '[]')[0];
    const pre = `tuner.a:${acc.id}:`;
    localStorage.setItem(pre + 'stremio', JSON.stringify({ authKey: 'AK-test-1', at: Date.now(), keep: true }));
    const r = await fetch(`${H}/stremio-api/api/addonCollectionGet`, { method: 'POST', body: JSON.stringify({ authKey: 'AK-test-1' }) }).then((x) => x.json());
    const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
    const ok = r.result.addons.filter((x) => /\/addon\/(cinemeta|northlight|kestrel)/.test(x.transportUrl));
    localStorage.setItem(pre + 'addons', JSON.stringify(ok.map((x) => ({ key: 'ad' + hash(x.transportUrl), url: x.transportUrl, manifest: x.manifest, at: Date.now(), on: true, catalogs: Object.fromEntries((x.manifest.catalogs || []).filter((c) => !(c.extra || []).some((e) => e.isRequired && e.name !== 'genre')).map((c) => [`${c.type}:${c.id}`, true])), from: 'stremio', kind: {}, health: {} }))));
    localStorage.setItem('tuner.tmdbKey', JSON.stringify('test-tmdb-token'));
  }, H);
  await tap('[data-act="done"]');
  await p.waitForTimeout(1500);
  check('Home after sign in', (await state())?.screen === 'home');
  await p.reload();
  await p.waitForTimeout(5000);
  const home = await ev(() => ({ card: document.querySelector('.hm-card')?.innerText || '', lines: document.querySelectorAll('.hm-lines .e').length, rows: document.querySelectorAll('.row').length, tabs: !document.querySelector('#ph-tabs').hidden }));
  check('Home: the Marquee card and its lines', home.card.length > 5, `${home.lines} lines · ${home.card.replace(/\s+/g, ' ').slice(0, 80)}`);
  check('Home: rows under it', home.rows >= 1, `${home.rows} rows`);
  check('the tab bar shows', home.tabs);
  await shot('home');
  await ev(() => document.querySelector('#ph-screens > section:not([hidden])').scrollTo({ top: 700 }));
  await p.waitForTimeout(400);
  await shot('home-rows');
  await ev(() => document.querySelector('#ph-screens > section:not([hidden])').scrollTo({ top: 0 }));
  await p.waitForTimeout(300);
  await ev(() => document.querySelector('#ph-tabs').classList.remove('mini'));
  // the facts line never ends on a separator (review 2, S9): the separators are CSS on the next fact
  check('facts: no text separators to strand', await ev(() => ![...document.querySelectorAll('.facts > span')].some((s) => /·\s*$/.test(s.textContent))));

  // ---------- Live ----------
  await tap('[data-tab="live"]');
  check('Live: channel rows', await wait(() => document.querySelectorAll('.lv-ch[data-i]').length > 3, 10000));
  await wait(() => [...document.querySelectorAll('.lv-ch .nx')].length > 0, 8000);
  const nx = await ev(() => [...document.querySelectorAll('.lv-ch .nx .tx')].map((x) => ({ t: x.textContent, cut: x.scrollWidth > x.clientWidth + 1 })).slice(0, 6));
  check('Live: until · Next on the rows, one time only', nx.length > 0 && nx.every((x) => /^until \d\d:\d\d( · Next .+)?$/.test(x.t)), JSON.stringify(nx.slice(0, 2)));
  await shot('live');
  // swipe a row left: favourite
  const box = await (await p.$('.lv-ch[data-i="1"]')).boundingBox();
  await ev(() => document.querySelector('.lv-ch[data-i="1"]').dataset.name = '1');
  const cdp = await ctx.newCDPSession(p);
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', box.x + 300, box.y + 40);
  for (let i = 1; i <= 8; i++) { await touch('touchMove', box.x + 300 - i * 18, box.y + 40); await p.waitForTimeout(16); }
  await touch('touchEnd');
  await p.waitForTimeout(600);
  check('Live: swipe left favourites', await ev(() => Object.keys(localStorage).some((k) => /:favs$/.test(k) && /"kind":"live"/.test(localStorage.getItem(k)))), await text('#toast'));
  // the channel's day
  await tap('.lv-ch[data-i="0"] .chev');
  check('the channel\'s day opens', await wait(() => window.__tunerTest.state().screen === 'day' && document.querySelectorAll('.lv-day .p').length > 0, 8000));
  await shot('day');
  await ev(() => window.__tunerTest.back());
  await p.waitForTimeout(500);
  // tune: the player opens with the channel's .m3u8
  await tap('.lv-ch[data-i="0"]');
  check('the player opens on a channel', await wait(() => !!window.__phonePlayer?.state(), 8000));
  const ps = await ev(() => window.__phonePlayer.state());
  check('live plays its HLS link (.m3u8)', /\/live\/demo\/demo\/\d+\.m3u8$/.test(ps.url), ps.url);
  const played = await wait(() => window.__phonePlayer.state()?.playing, 15000);
  check('the live stream plays (picture)', played, JSON.stringify(await ev(() => window.__phonePlayer.state())));
  await shot('player-live');
  const ring = await ev(() => document.querySelectorAll('.pv-zap .lv-ch').length);
  check('the zap ring is listed under the video', ring > 2, `${ring} rows`);
  await ev(() => window.__phonePlayer.close());
  await p.waitForTimeout(600);
  check('closing the player returns to Live', (await state())?.screen === 'live' && !(await ev(() => window.__phonePlayer.state())));

  // ---------- NBA ----------
  await tap('[data-tab="nba"]');
  check('NBA: the hero or the day\'s cards', await wait(() => document.querySelectorAll('.nb-hero, .gcard').length > 0, 12000));
  const nb = await ev(() => ({ hero: document.querySelector('.nb-hero')?.innerText.replace(/\s+/g, ' ') || '', cards: document.querySelectorAll('.nb-grid .gcard').length, heroId: document.querySelector('.nb-hero')?.dataset.g || '', listIds: [...document.querySelectorAll('.nb-grid .gcard')].map((c) => c.dataset.g) }));
  check('NBA: the hero\'s game isn\'t repeated in the list', !nb.heroId || !nb.listIds.includes(nb.heroId), `${nb.cards} cards · ${nb.hero.slice(0, 90)}`);
  await shot('nba');
  // the shield: no score digits on a hidden card
  const leak = await ev(() => [...document.querySelectorAll('.gcard')].filter((c) => /Score hidden/.test(c.innerText) && /\b\d{2,3}\s*\n?\s*\d{2,3}\b/.test(c.querySelector('.plate')?.innerText || '')).length);
  check('NBA: a hidden card shows no score', leak === 0);
  await ev(() => [...document.querySelectorAll('[data-sec]')].find((x) => x.dataset.sec === 'standings').click());
  await wait(() => !!document.querySelector('.box-t, .cover'), 8000);
  await shot('nba-standings');
  await ev(() => [...document.querySelectorAll('[data-sec]')].find((x) => x.dataset.sec === 'games').click());
  await p.waitForTimeout(500);
  // a game page, and From tip-off where the game has started
  const gid = await ev(() => { const h = document.querySelector('.nb-hero')?.dataset.g; if (h) return h; const all = [...document.querySelectorAll('.gcard[data-g]')]; const live = all.find((c) => /Live|Ended|Final|hidden/i.test(c.innerText)); return (live || all[0])?.dataset.g || ''; });
  if (gid) {
    await ev((id) => window.__tunerTest.push('game', { id }), gid);
    check('a game page opens', await wait(() => window.__tunerTest.state().screen === 'game' && document.querySelector('[data-screen="game"]').innerText.length > 20, 8000));
    await p.waitForTimeout(1500);
    await shot('game');
    // From tip-off on the game page (the fake provider's game channel keeps no archive: then airglow says it's looking)
    const tip = await p.$('[data-screen="game"] [data-gact="tipoff"]');
    if (tip) {
      await tip.tap();
      const rp = await wait(() => window.__phonePlayer?.state()?.replay, 8000);
      check('From tip-off: the replay, or "airglow keeps looking"', rp || /keeps looking/.test(await text('#toast')), rp ? 'replay' : await text('#toast'));
      if (rp) { await ev(() => window.__phonePlayer.close()); await p.waitForTimeout(600); }
    }
  } else check('a game to open', false);
  // a replay from a kept channel's day (catch-up): the player's replay mode and its .m3u8 link
  await ev(() => window.__tunerTest.push('day', { id: '1001' }));
  await wait(() => document.querySelectorAll('.lv-day .p').length > 0, 8000);
  const past = await ev(() => { const b = [...document.querySelectorAll('.lv-day .p')].find((x) => !x.classList.contains('gone') && !x.classList.contains('now') && /Replay/.test(x.innerText)); if (b) { b.click(); return b.innerText.replace(/\s+/g, ' '); } return ''; });
  check('the channel\'s day lists kept programmes', !!past, past);
  if (past) {
    const rp = await wait(() => window.__phonePlayer?.state()?.replay, 12000);
    const st = await ev(() => window.__phonePlayer?.state());
    check('a kept programme opens as a replay', rp, JSON.stringify(st));
    check('the replay plays its catch-up .m3u8', /\/timeshift\/demo\/demo\/\d+\/[\d-]+:[\d-]+\/\d+\.m3u8$/.test(st?.url || ''), st?.url || '');
    check('the replay plays (picture)', await wait(() => window.__phonePlayer.state()?.playing, 12000));
    await shot('player-replay');
    const corner = await text('.pv-corner');
    check('the replay\'s corner: Ends and time left', /Ends \d\d:\d\d/.test(corner), corner.replace(/\s+/g, ' '));
    await p.setViewportSize({ width: 852, height: 393 });
    await p.waitForTimeout(800);
    check('landscape: the full-screen layout', await ev(() => document.querySelector('.pv')?.classList.contains('land')));
    await shot('player-landscape');
    await p.setViewportSize({ width: 393, height: 852 });
    await p.waitForTimeout(400);
    await ev(() => window.__phonePlayer.close());
    await p.waitForTimeout(800);
  }


  // ---------- Library and a title ----------
  await tap('[data-tab="lib"]');
  check('Library: posters 3 across', await wait(() => document.querySelectorAll('.lb-grid .poster[data-i]').length >= 3, 15000));
  await shot('library');
  await tap('.lb-grid .poster[data-i="0"]');
  check('a title page opens', await wait(() => window.__tunerTest.state().screen === 'detail' && !!document.querySelector('.dt-head [data-act="play"], .dt-head [data-act="infuse"]'), 12000));
  await wait(() => !!document.querySelector('.dt-head .what'), 8000);
  await p.waitForTimeout(1500);
  await shot('title');
  const what = await text('.dt-head .what');
  check('the copy line', what.length > 3, what.replace(/\s+/g, ' '));
  const playBtn = await p.$('.dt-head [data-act="play"]');
  if (playBtn) {
    await playBtn.tap();
    const opened = await wait(() => !!window.__phonePlayer?.state(), 12000);
    const st = await ev(() => window.__phonePlayer?.state());
    check('Play opens the player on a copy', opened, JSON.stringify(st));
    await wait(() => window.__phonePlayer?.state()?.playing || window.__phonePlayer?.state()?.err, 12000);
    await shot('player-vod');
    await ev(() => window.__phonePlayer?.close());
    await p.waitForTimeout(500);
  }
  await ev(() => window.__tunerTest.back());

  // ---------- the player: subtitles inside the picture, and switching copies while watching ----------
  // (the owner's iPhone drew the subtitles off the picture, bottom right; and he couldn't pick another copy mid-film)
  await ev(async () => { const C = await import('./tv/js/catalog.js'); await C.ensure('movie'); window.__tunerTest.push('detail', { title: C.catalog.movie.titles.find((x) => x.name === 'The Long Night') }); });
  await wait(() => !!document.querySelector('.dt-head [data-act="play"]') && /Kestrel|plays here/.test(document.querySelector('.dt-head')?.innerText || ''), 15000);
  await p.waitForTimeout(2500);
  await tap('.dt-head [data-act="play"]');
  check('The Long Night plays', await wait(() => window.__phonePlayer?.state()?.playing, 15000), JSON.stringify(await ev(() => window.__phonePlayer?.state())));
  // a subtitle track the way WebKit turns one on (showing): the app takes it over and draws the cue itself
  await ev(() => { const v = document.querySelector('#ph-player video'); v.currentTime = 20; const tr = v.addTextTrack('subtitles', 'English', 'en'); tr.mode = 'showing'; tr.addCue(new VTTCue(0, 600, 'A subtitle line for the test\nand its second line')); });
  // the cue's box against the picture's own rect (object-fit contain: the bars left out), the window and the controls
  const SUBGEO = () => {
    const v = document.querySelector('#ph-player video'), vr = v.getBoundingClientRect(), s = Math.min(vr.width / v.videoWidth, vr.height / v.videoHeight);
    const pic = { l: vr.left + (vr.width - v.videoWidth * s) / 2, t: vr.top + (vr.height - v.videoHeight * s) / 2 };
    pic.r = pic.l + v.videoWidth * s; pic.b = pic.t + v.videoHeight * s;
    const sp = document.querySelector('.pv-subs:not([hidden]) span')?.getBoundingClientRect();
    const ctl = [...document.querySelectorAll('.ov:not(.away) .lbar, .ov:not(.away) .pv-corner')].filter((e) => e.textContent.trim()).map((e) => e.getBoundingClientRect().top);
    if (!sp) return { ok: false, why: 'no cue on screen', modes: [...v.textTracks].map((t) => t.mode) };
    const inPic = sp.left >= pic.l - 0.5 && sp.right <= pic.r + 0.5 && sp.top >= pic.t - 0.5 && sp.bottom <= pic.b + 0.5;
    const inWin = sp.left >= 0 && sp.right <= innerWidth && sp.top >= 0 && sp.bottom <= innerHeight;
    const centred = Math.abs((sp.left + sp.right) / 2 - (pic.l + pic.r) / 2) < 2;
    const above = ctl.every((t) => sp.bottom <= t + 0.5);
    const native = [...v.textTracks].some((t) => t.mode === 'showing');   // (WebKit's own drawing is off inline)
    return { ok: inPic && inWin && centred && above && !native, inPic, inWin, centred, above, native, sp: [sp.left, sp.top, sp.right, sp.bottom].map(Math.round), pic: [pic.l, pic.t, pic.r, pic.b].map(Math.round), fs: getComputedStyle(document.querySelector('.pv-subs')).fontSize };
  };
  await wait(() => !!document.querySelector('.pv-subs:not([hidden]) span'), 5000);
  await p.waitForTimeout(600);   // (the lift above the controls glides in 0.25 s)
  let g = await ev(SUBGEO);
  check('subtitles: portrait, inside the picture, centred, above the controls', g.ok, JSON.stringify(g));
  await shot('player-subs-portrait');
  await p.setViewportSize({ width: 852, height: 393 });
  await p.waitForTimeout(900);
  g = await ev(SUBGEO);
  check('subtitles: landscape, inside the picture and the window', g.ok, JSON.stringify(g));
  await shot('player-subs-landscape');
  await p.setViewportSize({ width: 393, height: 852 });
  await p.waitForTimeout(700);
  // Options > Copies: the title's copies, ranked, with which play here
  await tap('#ph-player [data-act="options"]');
  await ev(() => [...document.querySelectorAll('#ph-sheets .sh-ov:last-child .lr')].find((x) => /^Copies/.test(x.innerText))?.click());
  await p.waitForTimeout(700);
  const rows = await ev(() => [...document.querySelectorAll('#ph-sheets .sh-ov:last-child .lr')].map((x) => x.innerText.replace(/\s+/g, ' ')));
  check('Copies opens from the player: provider and add-on copies', rows.length >= 3 && rows.some((r) => /Your provider/.test(r)) && rows.some((r) => /Kestrel|Northlight/.test(r)) && rows.some((r) => /playing/.test(r)), rows.join(' | '));
  check('Copies: MKV ones say Infuse or VLC', rows.some((r) => /MKV · Infuse or VLC/.test(r)), rows.filter((r) => /MKV/.test(r))[0] || '');
  await shot('player-copies');
  const before = await ev(() => window.__phonePlayer.state());
  await ev(() => [...document.querySelectorAll('#ph-sheets .sh-ov:last-child .lr')].find((x) => /plays here/.test(x.innerText))?.click());
  await p.waitForTimeout(300);
  const note = await text('.pv-tag');
  await wait((k) => { const s = window.__phonePlayer.state(); return s && s.copy !== k && s.playing && s.t > 1; }, 15000, before.copy);
  const after = await ev(() => window.__phonePlayer.state());
  check('switching copies: "Switching to …"', /^Switching to /.test(note), note);
  check('switching copies plays the other one from the same place', after.copy !== before.copy && after.playing && after.t > before.t - 9 && after.t < before.t + 3, `${before.copy} ${before.t.toFixed(1)} s -> ${after.copy} ${after.t.toFixed(1)} s · ${after.url}`);
  // a copy that fails: the next one is offered, as on the TV
  await ev(() => { document.querySelector('#ph-player video').src = 'http://127.0.0.1:8899/no-such-copy.mp4'; });
  check('a failed copy offers the next one', await wait(() => !!document.querySelector('.pv-msg [data-act="nextcopy"]'), 10000), await text('.pv-msg'));
  await shot('player-copy-failed');
  await tap('.pv-msg [data-act="nextcopy"]');
  check('Try the next copy plays', await wait(() => window.__phonePlayer.state()?.playing && !window.__phonePlayer.state()?.err, 15000), JSON.stringify(await ev(() => window.__phonePlayer.state())));
  await ev(() => window.__phonePlayer?.close());
  await p.waitForTimeout(500);
  await ev(() => window.__tunerTest.back());

  // ---------- Search ----------
  await tap('[data-tab="search"]');
  await p.fill('#sr-q', 'nba');
  check('Search finds channels', await wait(() => document.querySelectorAll('.sr-row[data-ch]').length > 0, 6000));
  await shot('search');

  // ---------- Account ----------
  await ev(() => window.__tunerTest.push('account'));
  await p.waitForTimeout(600);
  const acc = await text('[data-screen="account"]');
  check('Account: provider, connections, NBA, add-ons', /Active/.test(acc) && /Connections/.test(acc) && /Spoiler shield/.test(acc) && /Add-ons/.test(acc), acc.replace(/\s+/g, ' ').slice(0, 120));
  await tap('[data-act="check"]');
  const done = await wait(() => document.querySelectorAll('.chk .dotk').length >= 2 && !document.querySelector('.chk .spin') && /Checked/.test(document.querySelector('.chk')?.innerText || ''), 60000);
  const chk = await text('.chk');
  check('Check streams on this iPhone: live and replay answered', done, chk.replace(/\s+/g, ' '));
  check('Check streams: both play here (fake provider)', /Live · Live channels play here/.test(chk) && /Replays play here/.test(chk));
  await shot('account-check');

  // ---------- the NBA tab in depth (the TV's sections, the team page, Leaders, Team stats, News, the player sheet, the
  // game page's tabs, the shield), at the TV test's moment: Mon 26 Oct 2026 23:40, the Grizzlies at the Jazz at 01:00 ----------
  await nbaDeep();

  check('no page errors', !errs.length, errs.slice(0, 5).join(' | '));
  fs.writeFileSync(`${out}/results.json`, JSON.stringify({ results, errs }, null, 1));
  const bad = results.filter((r) => !r.ok);
  console.log(`${results.length} checks, ${bad.length} failed`);
  await b.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
