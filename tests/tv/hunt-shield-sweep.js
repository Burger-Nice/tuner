// Shield sweep: every surface in My team and All games mode, the Kings final (Sun 25 Oct, late) unseen, scanned for
// its score, MEM's 3-0, and the stories that tell it. Run: node tests/tv/drive.js <out> hunt-shield-sweep [mine|all]
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const L = require('./hunt-shield-lib.js')(ctx);
  const mode = process.env.MODE || 'mine';
  await L.start({ shield: mode, pin: !!process.env.PIN });
  console.log('mode', mode, 'pin', !!process.env.PIN, 'seen', await L.seen());
  console.log('unseen:', await L.G((m) => m.unseenFor().map((g) => `${g.away.abbr}@${g.home.abbr} ${new Date(g.date).toISOString()}`)));
  await L.ev(() => window.__tunerTest.go('home')); await p.waitForTimeout(2500);
  await L.scan('home'); await shot('home');
  console.log('home rc:', await L.text('.rc'));
  await L.toSection(0); await L.scan('hub'); await shot('hub');
  console.log('hub rc:', await L.text('.rc'));
  await L.toSection(1); await L.scan('team top'); await shot('team');
  console.log('team rec:', await L.text('.nb-s[data-s="team"] .nb-rec'), '| sched:', await L.text('.nb-s[data-s="team"] .nb-title small'));
  await key('ArrowDown', 1, 500); await key('ArrowDown', 1, 500); await key('ArrowLeft', 1, 400);
  console.log('tile:', await L.where()); await L.scan('team tile'); await shot('team-tile');
  await key('ArrowDown', 1, 800); await L.scan('team ranks'); await shot('team-ranks');
  await key('ArrowDown', 1, 800); await L.scan('team news'); await shot('team-news');
  console.log('news rail:', await L.text('.nb-s[data-s="team"] .tp-news .nb-nc .tx b'));
  await key('ArrowDown', 1, 800); await L.scan('team roster'); await shot('team-roster');
  await key('Enter', 1, 1500); await L.scan('player sheet'); await shot('team-player');
  console.log('sheet:', await L.text('.nb-pl'));
  await key('Escape', 1, 500);
  await L.toSection(2); await key('ArrowDown', 1, 600); await L.scan('standings'); await shot('standings');
  console.log('standings legend:', await L.text('.st-sub .legend'), '| msg', await L.text('.st-msg'));
  await key('Escape', 1, 400); await L.toSection(3); await L.scan('leaders'); await shot('leaders');
  await L.toSection(4); await L.scan('teamstats'); await shot('teamstats');
  await L.toSection(5); await p.waitForTimeout(2500); await key('ArrowDown', 1, 500);
  for (let i = 0; i < 25; i++) { await key('ArrowDown', 1, 260); const h = await L.scan(`news row ${i + 2}`); if (h.length) await shot(`news-leak-${i + 2}`); }
  console.log('rows:\n' + (await L.ev(() => [...document.querySelectorAll('.nb-s[data-s="news"] .nb-nrow')].map((r) => `${r.classList.contains('cov') ? 'COV ' : '    '}${r.querySelector('b').textContent.slice(0, 80)}`).join('\n'))));
  // the opponent's page, from the team's Kings tile
  await L.toSection(1); await key('ArrowDown', 2, 500); await key('ArrowLeft', 1, 400); await L.hold(); await key('Enter', 1, 2500);
  await L.scan('kings page'); await shot('kings');
  console.log('kings rec:', await L.text('[data-screen="team"] .nb-rec'));
  await key('ArrowDown', 2, 800); await L.scan('kings ranks'); await key('ArrowDown', 1, 800); await L.scan('kings news'); await shot('kings-news');
  await key('ArrowDown', 1, 800); await L.scan('kings roster'); await key('Enter', 1, 1500); await L.scan('kings player'); await shot('kings-player');
};
