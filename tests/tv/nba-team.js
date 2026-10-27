// The team page (design/ui-v1/nba-pages/SPEC.md 7): the NBA tab's team section, the schedule rail's window, scrolling to
// Season ranks / News / Roster, the roster's Sort, the player sheet, a pushed team page from a game card's hold-OK menu
// (Back returns to the card), All teams, the game page's team links, then the shield (My team, the Kings final unseen).
// The clock is set to Mon 26 Oct 2026 23:40 (the mocks' moment) and today's scoreboard has the Grizzlies at the Jazz at
// 01:00, so the page shows what the design shows. Run: node tests/tv/drive.js <out> nba-team
const fs = require('fs'), path = require('path');

module.exports = async ({ p, shot, key, log }) => {
  const ev = (f, a) => p.evaluate(f, a);
  const hold = async () => { await p.keyboard.down('Enter'); await p.waitForTimeout(650); await p.keyboard.up('Enter'); await p.waitForTimeout(400); };
  const F = path.resolve(__dirname, '../fixtures/espn');
  const sched = JSON.parse(fs.readFileSync(`${F}/schedule-29.json`, 'utf8'));
  const sb = JSON.parse(fs.readFileSync(`${F}/scoreboard.json`, 'utf8'));
  const jazz = sched.events.find((e) => e.id === '401909875');
  const board = { ...sb, day: { date: '2026-10-26' }, events: [jazz, ...sb.events.filter((e) => e.id !== '401909850')] };
  await p.route('**/espn/scoreboard*', (r) => r.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(board) }));
  // the Kings final has no box score in the fixtures: the Warriors one stands in (the player sheet counts seen games with it)
  await p.route('**/espn/summary?event=401909867', (r) => r.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(`${F}/summary-401909850.json`, 'utf8') }));
  await p.clock.install({ time: new Date('2026-10-26T23:40:00Z') });
  const start = async (shield) => {
    await ev((s) => {
      const k = 'tuner.settings', v = JSON.parse(localStorage.getItem(k) || '{}');
      v.shield = s ? 'mine' : 'off'; v.nbaTeam = 'MEM';
      localStorage.setItem(k, JSON.stringify(v));
      // the Kings final (Sun 25 Oct, late) is the one you haven't seen; the two before it are
      localStorage.setItem('tuner.nbaSeen', JSON.stringify({ upTo: Date.parse('2026-10-25T12:00:00Z'), ids: [] }));
    }, shield);
    // the copy kept at the Kings game's tip-off (standings and team stats as they were)
    if (shield) await ev(async () => { const t = Date.parse('2026-10-26T01:00:00Z'); await window.Core.cache.set(`nba:pin:${t}`, { at: t, standings: await window.NBA.standings(), teamStats: await window.NBA.teamStats(), leaders: {} }); localStorage.setItem('tuner.nbaPins', JSON.stringify([t])); });
    await p.reload(); await p.waitForTimeout(1500);
    const first = await ev(() => window.__tunerTest?.state().screen);
    if (first === 'first' || !first) { await require('./signin.js')({ p, key }); }
    await p.waitForTimeout(3000);
    await ev(() => window.__tunerTest.go('nba')); await p.waitForTimeout(2500);
  };
  const where = () => ev(() => { const a = document.activeElement; return `${a.className} ${a.dataset.key || a.dataset.act || a.dataset.sec || a.dataset.tabG || ''} "${(a.textContent || '').trim().slice(0, 30)}"`; });
  const ok = async (label, want) => { const w = await where(); console.log((w.includes(want) ? 'OK   ' : 'FAIL ') + label.padEnd(30), w); };

  // ---------- the team section ----------
  await start(false);
  await key('ArrowUp', 1, 300); await key('ArrowLeft', 3, 100);   // (onto the section row: Games)
  await key('ArrowRight', 1, 900); await ok('team chip', 'team');
  await key('ArrowDown', 1, 500); await ok('down from the chip', 'Watch pre-game'); await shot('team-top');
  await key('ArrowDown', 1, 500); await ok('schedule: the next game', 'g:401909875'); await shot('team-schedule-next');
  console.log('slot of the focused tile:', await ev(() => [...document.activeElement.parentElement.children].indexOf(document.activeElement)));
  await key('ArrowLeft', 1, 400); await ok('left: the Kings final', 'g:401909867'); await shot('team-schedule');
  console.log('slot after left:', await ev(() => [...document.activeElement.parentElement.children].indexOf(document.activeElement)));
  await key('ArrowRight', 3, 400); await ok('right x3', 'g:'); await shot('team-schedule-right');
  await key('ArrowLeft', 2, 300);
  await key('ArrowDown', 1, 700); await ok('down: Season ranks', 'rk:'); await key('ArrowRight', 2, 300); await shot('team-ranks');
  await key('ArrowRight', 4, 300); await shot('team-ranks-end');
  await key('ArrowDown', 1, 700); await ok('down: News', 'nb-nc'); await shot('team-news');
  await key('ArrowDown', 1, 700); await ok('down: Roster', 'pl:'); await shot('team-roster-top');
  await key('ArrowDown', 11, 250); await ok('roster row 12', 'pl:'); await shot('team-roster');
  await key('Enter', 1, 900); await shot('team-player'); await ok('player sheet (no top-10: no button)', 'nb-plb');
  await key('Escape', 1, 500); await ok('back: the row', 'pl:');
  await key('ArrowUp', 11, 200); await ok('roster row 1', 'pl:4065733');
  await key('Enter', 1, 900); await shot('team-player-leader'); await ok('Ty Jerome: the leaders button', 'leaders'); await key('Escape', 1, 500);
  await key('ArrowUp', 1, 400); await ok('up: Sort pill', 'sort');
  await key('Enter', 1, 600); await shot('team-sort'); await key('ArrowDown', 6, 200); await key('Enter', 1, 700); await shot('team-sort-jersey');
  await key('ArrowUp', 1, 500); await ok('up: News', 'nb-nc');
  await key('ArrowUp', 1, 500); await ok('up: Season ranks', 'rk:');
  await key('ArrowUp', 1, 500); await ok('up: Schedule', 'g:');
  await key('ArrowUp', 1, 500); await ok('up: header', 'btn'); await shot('team-back-top');
  await key('ArrowDown', 3, 400); await key('Escape', 1, 600); await ok('back: the chip', 'team'); await shot('team-back-chip');

  // ---------- a pushed team page from a game card's hold-OK menu ----------
  await key('ArrowLeft', 1, 900); await key('ArrowDown', 1, 500); await key('ArrowDown', 2, 400);
  const card = await where(); console.log('card:', card);
  await hold(); await shot('card-menu');
  await key('Enter', 1, 1500); await ok('pushed page: header', 'btn'); await shot('team-other');
  await key('ArrowUp', 1, 400); await ok('up: tools row', 'mine'); await key('ArrowRight', 1, 300); await ok('All teams', 'all');
  await key('ArrowLeft', 1, 300); await key('Enter', 1, 700); await shot('team-make-mine'); await ok('confirm: Cancel first', 'no'); await key('Escape', 1, 500);
  await key('ArrowRight', 1, 300);
  await key('Enter', 1, 700); await shot('team-picker'); await ok('picker', 'tm:');
  await key('ArrowDown', 1, 300); await key('Escape', 1, 500); await ok('picker closed', 'all');
  await key('Escape', 1, 1000); await ok('back: the card', card.split(' ')[2] || 'g:'); await shot('back-to-card');

  // ---------- the game page's links (the Warriors final, from its schedule tile) ----------
  await key('Escape', 1, 400); await key('ArrowRight', 1, 900); await key('ArrowDown', 2, 500); await key('ArrowLeft', 2, 400);
  await ok('the Warriors tile', 'g:401909850');
  await key('Enter', 1, 1500); await shot('game');
  await hold(); await shot('game-tab-menu'); await key('Escape', 1, 400);
  await key('ArrowDown', 8, 250); await ok('team page row', 'teampage'); await shot('game-team-row');
  await key('Enter', 1, 1500); await ok('its page', 'btn'); await shot('game-team-page');
  await key('Escape', 1, 1000); await ok('back: the row', 'teampage');

  // ---------- the shield: My team, the Kings final unseen ----------
  await start(true);
  await key('ArrowUp', 1, 300); await key('ArrowLeft', 3, 100); await key('ArrowRight', 1, 900);
  await key('ArrowDown', 1, 500); await ok('shield: entry', 'Watch pre-game');
  await key('ArrowDown', 1, 500); await key('ArrowLeft', 1, 400); await ok('shield: the Kings tile', 'g:401909867'); await shot('team-shield');
  console.log('header:', await ev(() => document.querySelector('[data-s="team"] .nb-rec')?.innerText.replace(/\s+/g, ' ')));
  console.log('tile:', await ev(() => document.activeElement.innerText.replace(/\s+/g, ' ')));
  await hold(); await shot('team-shield-tile-menu');
  console.log('tile menu:', await ev(() => [...document.querySelectorAll('.ctxmenu .lr')].map((r) => `${r.textContent}${r === document.activeElement ? ' (focused)' : ''}`).join(' | ')));
  await key('Escape', 1, 400);
  await key('ArrowDown', 1, 700); await shot('team-shield-news');
  console.log('ranks:', await ev(() => document.querySelectorAll('.nb-title')[1]?.innerText));
  await key('ArrowDown', 2, 700); await shot('team-shield-roster');
  console.log('roster title:', await ev(() => document.querySelector('.tp-pill')?.parentElement.innerText.replace(/\s+/g, ' ')));
  console.log('rows:', await ev(() => [...document.querySelectorAll('.tp-roster .nb-tr')].slice(0, 4).map((r) => r.innerText.replace(/\s+/g, ' ')).join(' | ')));
  await key('ArrowDown', 2, 300); await key('Enter', 1, 1500); await shot('team-shield-player'); await ok('shield: sheet body, no button', 'nb-plb');
  console.log('sheet:', await ev(() => document.querySelector('.nb-pl')?.innerText.replace(/\s+/g, ' ')));
  await key('Escape', 1, 500);
  // the Kings' page, from the tile's menu
  await key('Escape', 1, 600); await key('ArrowDown', 2, 500); await ok('the Kings tile again', 'g:401909867'); await hold(); await key('Enter', 1, 1500);
  await shot('team-opponent-shield');
  console.log('kings header:', await ev(() => document.querySelector('[data-screen="team"] .nb-rec')?.innerText.replace(/\s+/g, ' ')));

  // ---------- team "None": the section is the picker; a team whose schedule ESPN won't send ----------
  await p.route('**/espn/teams/2/schedule', (r) => r.fulfill({ status: 503, body: 'down' }));
  await ev(() => { const k = 'tuner.settings', v = JSON.parse(localStorage.getItem(k) || '{}'); v.nbaTeam = 'none'; v.shield = 'off'; localStorage.setItem(k, JSON.stringify(v)); });
  await p.reload(); await p.waitForTimeout(4500);
  await ev(() => window.__tunerTest.go('nba')); await p.waitForTimeout(2000);
  for (let i = 0; i < 4 && !(await ev(() => !!document.activeElement.dataset.sec)); i++) await key('ArrowUp', 1, 300);
  await key('ArrowLeft', 3, 100); await key('ArrowRight', 1, 900); await ok('Teams chip', 'Teams');
  await key('ArrowDown', 1, 500); await ok('picker: first crest', 'tm:'); await shot('teams-none');
  await key('ArrowDown', 3, 250); await ok('East', 'tm:'); await key('Enter', 1, 2500); await shot('team-down'); await ok('down: Try again', 'retry');
};
