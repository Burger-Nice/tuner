// The NBA tab's League sections (design/ui-v1/nba-pages/SPEC.md 3-5, 8.2, 9): Standings, Leaders and Team stats.
// For each: Down from its chip lands on its entry, Back goes to the chip, OK and hold OK work; the scrolled standings
// layout; ESPN down; and the shield (My team, a Grizzlies final unseen: the West is the copy, or the cover card).
//   node tests/tv/drive.js <outdir> nba-league [standings|leaders|teamstats|shield|down]   (all when left out)
const only = process.argv[4] || '';
module.exports = async ({ p, shot, key, log }) => {
  const ev = (f, a) => p.evaluate(f, a);
  const fails = [];
  const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };
  const act = () => ev(() => { const a = document.activeElement; return { key: a?.dataset?.key || '', sec: a?.dataset?.sec || '', conf: a?.dataset?.conf || '', cat: a?.dataset?.cat || '', act: a?.dataset?.act || '', text: (a?.textContent || '').trim().slice(0, 40), cls: a?.className || '' }; });
  const hold = async () => { await p.keyboard.down('Enter'); await p.waitForTimeout(650); await p.keyboard.up('Enter'); await p.waitForTimeout(400); };
  const chip = async (sec) => { await ev((s) => window.__tunerTest.go('nba'), sec); await p.waitForTimeout(800); await ev((s) => document.querySelector(`.nb-sec [data-sec="${s}"]`)?.click(), sec); await p.waitForTimeout(900); await ev((s) => { const c = document.querySelector(`.nb-sec [data-sec="${s}"]`); c.focus(); c.dispatchEvent(new CustomEvent('tvfocus', { bubbles: true })); }, sec); await p.waitForTimeout(300); };
  const vis = (sel) => ev((s) => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0 && !e.closest('[hidden]') && getComputedStyle(e).opacity !== '0'; }, sel);
  const text = (sel) => ev((s) => [...document.querySelectorAll(s)].filter((e) => !e.closest('[hidden]') && e.getClientRects().length).map((e) => e.textContent.trim()).join(' | '), sel);
  const closeAll = async () => { for (let i = 0; i < 3 && await ev(() => !!document.querySelector('#overlays .ov')); i++) { await key('Escape', 1, 300); } };

  if (only.startsWith('shield')) {
    // My team, and the games of the last week unseen (the Grizzlies' Kings and Warriors games are finals)
    await p.addInitScript(() => { const s = JSON.parse(localStorage.getItem('tuner.settings') || '{}'); localStorage.setItem('tuner.settings', JSON.stringify({ ...s, shield: 'mine' })); localStorage.setItem('tuner.nbaSeen', JSON.stringify({ upTo: 0, ids: [] })); });
    await p.reload(); await p.waitForTimeout(1200);
  }
  if (only === 'down') await p.route('**/espnweb/**', (r) => r.abort());
  await require('./signin.js')({ p, key });
  await p.waitForTimeout(3000);

  // ---------- Standings ----------
  if (!only || only === 'standings') {
    await chip('standings'); await p.waitForTimeout(1200);
    await log('standings chip'); await shot('standings-chip');
    await key('ArrowDown', 1, 400); let a = await act();
    check(a.conf === 'West' && a.cls.includes('sel'), `Down from the Standings chip lands on the selected conference chip (${a.conf})`);
    await shot('standings-top');
    await key('ArrowDown', 1, 400); a = await act();
    check(a.key === 'tm:MEM', `Down from the chips lands on your team's row (${a.key})`);
    await shot('standings-row');
    check(await text('.st-sub .legend').then((t) => /make the playoffs/.test(t)), 'legend shows');
    check((await text('.lg-st .nb-tr .a-live')).length > 0, 'a LIVE pill shows for a team playing now');
    await key('ArrowDown', 4, 400); a = await act(); await log('row 8');
    check(!(await ev(() => document.querySelector('.lg-st').classList.contains('sc'))), `row 8 keeps the top layout (${a.key})`);
    await key('ArrowDown', 1, 500); await log('row 9'); await shot('standings-row9');
    check(await ev(() => document.querySelector('.lg-st').classList.contains('sc')), 'row 9 switches to the scrolled layout');
    check(await ev(() => document.querySelector('#topbar, .topbar')?.classList.contains('away')), 'the top bar stepped away');
    await key('ArrowDown', 10, 400); a = await act(); await log('last row'); await shot('standings-scrolled');
    check(a.key === 'tm:SAC', `the last row is the Kings (${a.key})`);
    const rows = await ev(() => [...document.querySelectorAll('.lg-st .nb-in > .nb-tr:not(.off)')].map((r) => { const b = r.getBoundingClientRect(); return [r.dataset.key, Math.round(b.top), Math.round(b.bottom)]; }));
    check(rows.every(([, t, b]) => t >= 80 && b <= 513), `scrolled rows are whole, inside y 80-513 (${rows.length} rows, ${rows[0]?.join(' ')} … ${rows[rows.length - 1]?.join(' ')})`);
    await key('Escape', 1, 500); a = await act(); await log('back');
    check(a.sec === 'standings', `Back goes to the Standings chip (${a.sec})`);
    check(!(await ev(() => document.querySelector('.lg-st').classList.contains('sc'))), 'Back restores the top layout');
    await shot('standings-back');
    // Up from the body: chips, section row, top bar
    await key('ArrowDown', 2, 400); await key('ArrowUp', 4, 300); a = await act();
    check(a.conf === 'West', `Up from row 1 goes to the conference chips (${a.conf})`);
    await key('ArrowDown', 1, 300); a = await act(); check(a.key === 'tm:MEM', `and Down returns to your row (${a.key})`);
    // OK on a row: the team page; Back returns to the row
    await key('Enter', 1, 1200); await log('ok on row'); await shot('standings-ok');
    check(await ev(() => document.querySelector('[data-screen="team"]') && !document.querySelector('[data-screen="team"]').hidden), 'OK on a row opens the team page');
    await key('Escape', 1, 900); a = await act(); await log('back from team');
    check(a.key === 'tm:MEM', `Back from the team page returns to the row (${a.key})`);
    // hold OK: <Team> page, Make the <team> my team (on another team's row)
    await key('ArrowUp', 1, 300); await hold(); await shot('standings-hold');
    const menu = await text('#overlays .ctxmenu .lr');
    check(/page/.test(menu) && /Make the .* my team/.test(menu), `hold OK menu: ${menu}`);
    await key('ArrowDown', 1, 250); await key('Enter', 1, 500); await shot('standings-confirm');
    check(/your team/.test(await text('#overlays .menu h3')), 'Make my team asks first');
    await key('ArrowRight', 1, 250); await key('Enter', 1, 800); await shot('standings-made');
    check(await ev(() => window.Core.settings().nbaTeam === 'LAL' && /Lakers/.test(document.querySelector('.nb-sec [data-sec="team"]').textContent)), 'Make my team: the Lakers are your team (the chip says so)');
    await ev(async () => { const st = await import('/tv/js/state.js'); st.saveSettings({ nbaTeam: 'MEM' }); st.emit('nba'); }); await p.waitForTimeout(400);
    await closeAll();
    // East: ◀▶ on the chips switch after 250 ms
    await key('Escape', 1, 400); await key('ArrowDown', 1, 300); await key('ArrowRight', 1, 700); await log('east chip'); await shot('standings-east');
    check(await ev(() => /Eastern/.test(document.querySelector('.st-ctx').textContent)), 'East shows after the dwell');
    await key('ArrowDown', 1, 300); a = await act(); check(a.key.startsWith('tm:'), `Down from East lands on row 1 (${a.key})`);
    await key('Escape', 1, 300); await key('ArrowDown', 1, 300); await key('ArrowLeft', 1, 600);
  }

  // ---------- Leaders ----------
  if (!only || only === 'leaders') {
    await chip('leaders'); await p.waitForTimeout(1200);
    await key('ArrowDown', 1, 400); let a = await act(); await log('leaders entry');
    check(a.cat === 'pts', `Down from the Leaders chip lands on the selected category (${a.cat})`);
    await shot('leaders');
    await key('ArrowDown', 1, 700); a = await act(); await log('rebounds');
    check(a.cat === 'reb', 'Down walks the categories'); await shot('leaders-reb');
    check(/REB PER GAME/.test(await text('.nb-lead .v span')), 'Rebounds shows after the dwell');
    await key('ArrowRight', 1, 400); a = await act(); check(a.cls.includes('nb-lead'), `Right goes to the leader card (${a.cls})`);
    await key('ArrowDown', 3, 300); a = await act(); await log('leaders row'); await shot('leaders-row');
    check(a.key.startsWith('pl:') && a.cls.includes('nb-tr'), `Down walks the rows (${a.key})`);
    await key('Enter', 1, 900); await log('player sheet'); await shot('leaders-player');
    check(await ev(() => !!document.querySelector('#overlays .ov') || !!document.querySelector('#toast:not([hidden])')), 'OK on a player opens the player sheet (or says it is coming)');
    await closeAll(); a = await act(); check(a.key.startsWith('pl:'), `Back returns to the row (${a.key})`);
    await hold(); const menu = await text('#overlays .ctxmenu .lr'); check(/page$/.test(menu), `hold OK: ${menu}`); await shot('leaders-hold');
    await closeAll();
    await key('ArrowLeft', 1, 300); a = await act(); check(a.cat === 'reb', `Left goes back to the selected category (${a.cat})`);
    await key('ArrowRight', 1, 300); await key('Escape', 1, 400); a = await act(); check(a.sec === 'leaders', `Back goes to the Leaders chip (${a.sec})`);
  }

  // ---------- Team stats ----------
  if (!only || only === 'teamstats') {
    await chip('teamstats'); await p.waitForTimeout(1200);
    await key('ArrowDown', 1, 400); let a = await act(); await log('teamstats entry');
    check(a.cat === 'avgPoints', `Down from the Team stats chip lands on the selected category (${a.cat})`);
    await key('ArrowDown', 2, 400); await p.waitForTimeout(400); await shot('teamstats');
    await key('ArrowRight', 1, 400); a = await act(); await log('your row'); await shot('teamstats-row');
    check(a.key === 'tm:MEM', `Right goes to your team's row (${a.key})`);
    const r = await ev(() => { const b = document.activeElement.getBoundingClientRect(); return [b.top, b.bottom]; });
    check(r[0] >= 156 && r[1] <= 513, `your row is in view (${r.map(Math.round)})`);
    await key('ArrowDown', 8, 350); await shot('teamstats-down');
    const rows = await ev(() => [...document.querySelectorAll('.ts-tb .nb-in > .nb-tr:not(.off)')].map((x) => { const b = x.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; }));
    check(rows.every(([t, b]) => t >= 150 && b <= 513), `team stats rows are whole and above y 513 (${rows.length})`);
    await key('Enter', 1, 1200); check(await ev(() => document.querySelector('[data-screen="team"]') && !document.querySelector('[data-screen="team"]').hidden), 'OK on a row opens the team page');
    await key('Escape', 1, 900); a = await act(); check(a.key.startsWith('tm:'), `Back from the team page returns to the row (${a.key})`);
    await key('Escape', 1, 400); a = await act(); check(a.sec === 'teamstats', `Back goes to the Team stats chip (${a.sec})`);
    // Season ranks' way in: openSection('teamstats', { cat })
    await ev(async () => { const m = await import('/tv/js/screens/nba.js'); m.openSection('teamstats', { cat: 'avgSteals' }); }); await p.waitForTimeout(600);
    check(/Steals/.test(await text('.ts .nb-cat.sel')), 'openSection(teamstats, { cat }) opens on that category');
    await shot('teamstats-steals');
  }

  // ---------- ESPN down (nothing kept) ----------
  if (only === 'down') {
    await chip('standings'); await p.waitForTimeout(2500); await shot('down-standings');
    check(/reachable/.test(await text('.st-msg')), 'standings: the down card');
    await key('ArrowDown', 1, 300); let a = await act(); check(a.act === 'retry', `Down lands on Try again (${a.act})`);
    await chip('leaders'); await p.waitForTimeout(2500); await shot('down-leaders');
    await chip('teamstats'); await p.waitForTimeout(2500); await shot('down-teamstats');
    // ESPN back, then down again with a copy kept
    await p.unroute('**/espnweb/**');
    await chip('standings'); await key('ArrowDown', 1, 300); await key('Enter', 1, 2500); await shot('down-back');
    check(!(await text('.st-msg')), 'Try again brings the table back');
    await p.route('**/espnweb/**', (r) => r.abort());
    await ev(async () => { const m = await import('/tv/js/league.js'); await m.want('standings', { force: true }); }); await p.waitForTimeout(800);
    await shot('state-down');
    check(/isn’t answering/.test(await text('.st-sub .legend')), 'with a copy: ESPN isn’t answering + Try again');
    check(!(await text('.lg-st .nb-tr .a-live')), 'no LIVE pills on an old copy');
    check(/^ESPN$/.test((await text('.nb-sec .meta')).trim()), `the section row says ESPN (${await text('.nb-sec .meta')})`);
  }

  // ---------- the shield ----------
  // shield: no copy kept (the cover cards); shield-copy: a copy kept at the unseen game's tip-off (Grizzlies 2-0 in it)
  if (only === 'shield-copy') {
    const at = await ev(async () => {
      const L = await import('/tv/js/league.js'), G = await import('/tv/js/games.js');
      await L.want('schedule:MEM');
      const [standings, teamStats, ...ld] = await Promise.all([NBA.standings(), NBA.teamStats(), ...NBA.LEADERS.map((c) => NBA.leaders(c.key, 10))]);
      const mem = standings.confs.flatMap((c) => c.teams).find((t) => t.abbr === 'MEM');
      Object.assign(mem, { w: 2, l: 0, streak: 'W2', l10: '2-0' });
      const leaders = Object.fromEntries(NBA.LEADERS.map((c, i) => [c.key, ld[i].map((x) => (x.abbr === 'MEM' ? { ...x, value: '36.5' } : x))]));
      teamStats.MEM.s.avgPoints = 99;
      const g = G.unseenFor().filter((x) => x.home.abbr === 'MEM' || x.away.abbr === 'MEM').sort((a, b) => a.date - b.date)[0];
      await window.Core.cache.set(`nba:pin:${g.date}`, { at: Date.now(), standings, teamStats, leaders });
      window.Core.store.set('nbaPins', [g.date]);
      return `${g.away.abbr} at ${g.home.abbr} ${new Date(g.date).toISOString()}`;
    });
    console.log('pinned a copy for', at);
  }
  if (only.startsWith('shield')) {
    await chip('standings'); await p.waitForTimeout(2500);
    await shot('shield-standings');
    const legend = await text('.st-sub .legend');
    console.log('legend:', legend);
    const cover = await text('.st-msg');
    if (only === 'shield') check(/hidden/.test(cover) && !(await text('.lg-st .nb-in .nb-tr .nm')), `West: the cover card (${cover.slice(0, 60)})`);
    else {
      check(/As of tip-off/.test(legend), 'West: the copy, labelled');
      const mem = await text('.lg-st .nb-in [data-key="tm:MEM"]');
      check(/2\s*0/.test(mem.replace(/[^0-9 ]/g, ' ')) && /W2/.test(mem), `the Grizzlies row is the copy's (${mem})`);
      check(!(await text('.lg-st .nb-tr .a-live')), 'no LIVE pills on the copy');
    }
    await key('ArrowDown', 1, 300); let a = await act(); check(a.act !== 'reveal', `Reveal isn't the default focus (${a.text})`);
    await key('ArrowDown', 1, 300); a = await act(); await log('down from chips'); await shot('shield-standings-down');
    check(a.act !== 'reveal', `Down from the chips isn't Reveal (${a.text})`);
    if (only === 'shield') {
      a = await act(); check(/East/.test(a.text), `the cover card's Show the East is reached first (${a.text})`);
      await key('Enter', 1, 600); a = await act(); check(a.conf === 'East', `Show the East shows the East, focus on its chip (${a.conf})`);
      check((await text('.lg-st .nb-in .nb-tr .nm')).length > 0, 'the East table (no unseen game in it) shows');
      await shot('shield-east');
    }
    await chip('leaders'); await p.waitForTimeout(2500); await shot('shield-leaders');
    const ln = await text('.ld-note'), lp = await text('.lg-lg-ld .lg-panel, .lg-ld .lg-panel');
    console.log('leaders note:', ln, '| panel:', lp);
    check(only === 'shield' ? /hidden/.test(lp) : /As of tip-off/.test(ln) && /36\.5/.test(await text('.nb-lead .v b')), 'Leaders: the copy or the cover');
    await key('ArrowDown', 1, 300); a = await act(); check(a.act !== 'reveal', `Leaders entry isn't Reveal (${a.text})`);
    await chip('teamstats'); await p.waitForTimeout(2500); await shot('shield-teamstats');
    const tn = await text('.ts .nb-notice'), tp = await text('.ts .lg-panel');
    console.log('team stats note:', tn, '| panel:', tp);
    check(only === 'shield' ? /hidden/.test(tp) : /As of tip-off/.test(tn) && /99\.0/.test(await text('.ts-tb [data-key="tm:MEM"]')), 'Team stats: the copy or the cover');
    if (only === 'shield-copy') { await key('ArrowDown', 1, 300); await key('ArrowRight', 1, 400); await shot('shield-teamstats-row'); a = await act(); check(a.key === 'tm:MEM', `Right lands on your row in the copy (${a.key})`); }
  }
  console.log(fails.length ? `${fails.length} FAILED` : 'all checks passed');
};
