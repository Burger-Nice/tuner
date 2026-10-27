// Hunt: the team section's states (SPEC 9): schedule down, roster down, no news, team stats down, a season with every
// game played, an empty schedule; and the Games section with the scoreboard down / team None.
//   node tests/tv/drive.js <out> hunt-team-states <sched503|roster503|nonews|stats503|allpost|empty|board503|none|slow>
const fs = require('fs'), path = require('path');
const F = path.resolve(__dirname, '../fixtures/espn');
const CORS = { 'Access-Control-Allow-Origin': '*' };
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const h = require('./hunt-games-lib.js')(ctx);
  const { ev, check, where, start, toChip, offSafe } = h;
  const sc = process.argv[4] || 'sched503';
  const json = (r, body) => r.fulfill({ contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
  const fail = (r) => r.fulfill({ status: 503, headers: CORS, body: 'down' });
  if (sc === 'sched503') await p.route('**/espn/teams/*/schedule', fail);
  if (sc === 'roster503') { await p.route('**/espn/teams/*/roster', fail); await p.route('**/espn/teams/*/athletes/statistics', fail); }
  if (sc === 'nonews') await p.route('**/espn/news*', (r) => json(r, { articles: [] }));
  if (sc === 'stats503') await p.route('**/espnweb/common/v3/sports/basketball/nba/statistics/byteam*', fail);
  if (sc === 'empty') await p.route('**/espn/teams/*/schedule', (r) => { const s = JSON.parse(fs.readFileSync(`${F}/schedule-29.json`, 'utf8')); s.events = []; json(r, s); });
  if (sc === 'offseason') {
    await p.route('**/espn/teams/*/schedule', (r) => { const s = JSON.parse(fs.readFileSync(`${F}/schedule-29.json`, 'utf8')); s.events = []; json(r, s); });
    const b = { ...h.board, events: h.board.events.filter((e) => e.id !== '401909875') };
    await p.route('**/espn/scoreboard*', (r) => json(r, b));
  }
  if (sc === 'allpost') await p.route('**/espn/teams/*/schedule', (r) => {
    const s = JSON.parse(fs.readFileSync(`${F}/schedule-29.json`, 'utf8'));
    s.events = s.events.filter((e) => Date.parse(e.date) < Date.parse('2026-10-26T12:00:00Z'));
    json(r, s);
  });
  if (sc === 'slow') await p.route('**/espn/teams/*/schedule', async (r) => { await new Promise((res) => setTimeout(res, 6000)); r.fulfill({ contentType: 'application/json', headers: CORS, body: fs.readFileSync(`${F}/schedule-29.json`, 'utf8') }); });
  if (sc === 'board503') { await start({ noRoute: true, go: false }); await p.route('**/espn/scoreboard*', fail); await p.reload(); await p.waitForTimeout(4000); await ev(() => window.__tunerTest.go('nba')); await p.waitForTimeout(2500); }
  else await start({ team: sc === 'none' ? 'none' : 'MEM', noRoute: sc === 'offseason' });

  if (sc === 'board503' || sc === 'none') {
    let a = await where('games entry');
    await shot(`${sc}-games`);
    console.log('   page:', await ev(() => document.querySelector('[data-s="games"] .page')?.innerText.replace(/\s+/g, ' ').slice(0, 200)));
    check(!a.none && !a.hid && a.scr === 'nba', 'something visible is focused');
    await key('ArrowDown', 1, 400); a = await where('down');
    await key('ArrowDown', 1, 400); a = await where('down 2');
    await key('ArrowUp', 3, 400); a = await where('up x3');
    await shot(`${sc}-games-up`);
    if (sc === 'none') {
      await toChip('team', 900); a = await where('Teams chip');
      await key('ArrowDown', 1, 400); a = await where('picker entry');
      await shot('none-picker');
      console.log('   offsafe:', JSON.stringify(await offSafe()));
      await key('ArrowDown', 5, 200); a = await where('picker down x5');
      await key('Escape', 1, 400); a = await where('back');
      check(a.sec === 'team', 'Back from the picker: the Teams chip');
    }
    h.done(); return;
  }

  await toChip('team', 1500);
  let a = await where('team chip');
  await shot(`${sc}-top`);
  console.log('   header:', await ev(() => document.querySelector('[data-s="team"] .nb-head')?.innerText.replace(/\s+/g, ' ')));
  console.log('   schedule:', await ev(() => document.querySelector('[data-s="team"] .nb-title')?.innerText.replace(/\s+/g, ' ')));
  await key('ArrowDown', 1, 500); a = await where('down from chip');
  check(!a.none && !a.hid && a.scr === 'nba' && !a.sec, `Down from the chip lands on something in the page (${a.act || a.key || a.text})`);
  check(a.rect[3] <= 513 && a.rect[1] >= 27, `and it's on screen (${a.rect})`);
  await shot(`${sc}-down`);
  const path = [];
  for (let i = 0; i < 6; i++) { await key('ArrowDown', 1, 600); const x = await h.act(); path.push(x.key || x.act || x.text.slice(0, 12)); if (x.none || x.hid) { check(false, `focus lost going down (${i})`); break; } }
  console.log('   down path:', path.join(' > '));
  await shot(`${sc}-deep`);
  console.log('   titles:', await ev(() => [...document.querySelectorAll('[data-s="team"] .nb-title')].map((t) => t.innerText.replace(/\s+/g, ' ')).join(' | ')));
  if (sc === 'sched503' || sc === 'slow') {
    await p.unroute('**/espn/teams/*/schedule');
    await key('Escape', 1, 400); await key('ArrowDown', 1, 400); a = await where('retry?');
    if (a.act === 'retry') { await key('Enter', 1, 2500); a = await where('after Try again'); await shot('after-retry'); check(!a.none && !a.hid && a.scr === 'nba', `focus kept after the data arrives (${a.act || a.key || a.text})`); }
    if (sc === 'slow') { await p.waitForTimeout(6000); a = await where('after the slow answer'); await shot('slow-after'); check(!a.none && !a.hid, 'focus survives the slow answer'); }
  }
  await key('Escape', 1, 500); a = await where('back');
  check(a.sec === 'team', 'Back: the team chip');
  h.done();
};
