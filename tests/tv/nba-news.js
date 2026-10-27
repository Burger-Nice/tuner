// The NBA tab's News section (design/ui-v1/nba-pages/SPEC.md 6, 8.3): Down from the chip lands on the first story, Back
// goes to the chip, the preview follows focus, the list scrolls in whole rows, the reader opens, scrolls and closes (focus
// back on the row); under the shield (My team, the Grizzlies' recent finals unseen) Grizzlies and Kings stories are
// covered, the card keeps it hidden or reveals it, and in All games mode the reader's body is scanned.
// ESPN's photos and logos are served from the design folder (the test machine may not reach ESPN).
const path = require('path'), fs = require('fs');
const IMG = path.resolve(__dirname, '../../design/ui-v1/nba-pages/img');
module.exports = async ({ p, shot, key, log }) => {
  const ev = (f, a) => p.evaluate(f, a);
  await p.route(/a\.espncdn\.com\//, (r) => {
    const u = decodeURIComponent(r.request().url());
    const logo = u.match(/teamlogos\/nba\/[^?]*?\/(\w+)\.png/);
    let f = logo && path.join(IMG, `logo-${logo[1].toUpperCase()}.png`);
    if (!f || !fs.existsSync(f)) f = path.join(IMG, /r1736470/.test(u) ? 'news-50290179.jpg' : 'news-50287191.jpg');
    return fs.existsSync(f) ? r.fulfill({ path: f }) : r.abort();
  });
  const rows = () => ev(() => [...document.querySelectorAll('.nb-s[data-s="news"] .nb-nrow')].map((r) => `${r.classList.contains('off') ? ' ' : '+'}${r.classList.contains('cov') ? 'COV ' : ''}${r.textContent.slice(0, 70)}`));
  const prev = () => ev(() => document.querySelector('.nb-s[data-s="news"] .nb-prev h2')?.textContent || '');
  const reader = () => ev(() => { const r = document.querySelector('#overlays .nb-read'); return r ? `${r.querySelectorAll('p.hidp').length} hidden · foot "${r.querySelector('.foot').textContent}" · y ${(r.querySelector('.in').style.transform || 'none')}` : 'no reader'; });
  const noSpoiler = async (label) => {
    const bad = await ev(() => [...document.querySelectorAll('.nb-s[data-s="news"] .nb-nrow, .nb-s[data-s="news"] .nb-prev, #overlays .nb-read')]
      .map((e) => e.textContent).filter((t) => /123-112|Grizzlies play the Jazz|Sacramento faces San Antonio|Ty Jerome scores/.test(t)));
    console.log(label.padEnd(22), bad.length ? `SPOILER: ${bad.join(' | ').slice(0, 200)}` : 'no Grizzlies result shows');
  };

  // the mocks' moment, Mon 26 Oct 23:40 (the fixtures' time): the Kings final of Sun is the Grizzlies' latest
  await p.clock.install({ time: new Date('2026-10-26T23:40:00Z') });
  // seen before Sun noon: Grizzlies at Kings (Sun night) is unseen once the shield is on (games.js reads seen once, at start)
  await ev(() => localStorage.setItem('tuner.nbaSeen', JSON.stringify({ upTo: Date.parse('2026-10-25T12:00:00Z'), ids: [] })));
  await p.reload(); await p.waitForTimeout(1200);
  await require('./signin.js')({ p, key });
  await p.waitForTimeout(3000);
  await ev(() => window.__tunerTest.go('nba')); await p.waitForTimeout(2000);
  await key('Escape', 1, 400); await log('back (Games chip)');
  await key('ArrowRight', 5, 450); await p.waitForTimeout(1500); await log('News chip'); await shot('news-chip');
  await key('ArrowDown', 1, 400); await log('down: first story');
  await key('ArrowDown', 1, 600); await log('down: second'); console.log('preview'.padEnd(22), await prev()); await shot('news');
  await key('ArrowDown', 5, 350); await log('down x5'); console.log((await rows()).slice(0, 10).join('\n')); await shot('news-scrolled');
  await key('Escape', 1, 400); await log('back: the chip'); await shot('news-back');
  await key('ArrowDown', 1, 400); await log('down again: first');
  await key('ArrowDown', 1, 400); await key('Enter', 1, 1500); await log('OK: reader'); console.log('reader'.padEnd(22), await reader()); await shot('news-article');
  await key('ArrowDown', 2, 400); console.log('down x2'.padEnd(22), await reader()); await shot('news-article-scrolled');
  await key('ArrowDown', 40, 200); await p.waitForTimeout(400); await log('down to the end'); console.log('reader'.padEnd(22), await reader()); await shot('news-article-end');
  await key('ArrowUp', 1, 300); await log('up: the body');
  await key('Escape', 1, 500); await log('back: closes'); console.log('reader'.padEnd(22), await reader());

  // The shield, My team: Grizzlies at Kings (Sun) unseen
  // (through saveSettings, as the app does; then 'nba' so every surface redraws)
  const shield = (mode) => ev(async (m) => { const st = await import('/tv/js/state.js'); st.saveSettings({ nbaTeam: 'MEM', shield: m }); st.emit('nba'); }, mode);
  await shield('mine');
  await key('Escape', 1, 400); await key('ArrowLeft', 1, 700); await key('ArrowRight', 1, 2500); await log('shield: News again');
  console.log((await rows()).join('\n'));
  await noSpoiler('shield list');
  const ci = await ev(() => [...document.querySelectorAll('.nb-s[data-s="news"] .nb-nrow')].findIndex((r) => r.classList.contains('cov')));
  console.log('first covered row'.padEnd(22), ci);
  if (ci >= 0) {
    await key('ArrowDown', ci + 1, 350); await p.waitForTimeout(400); await log('on the covered row'); console.log('preview'.padEnd(22), await prev()); await noSpoiler('covered preview'); await shot('news-shield');
    await key('Enter', 1, 700); await log('OK: the card'); await shot('news-covered');
    await key('ArrowRight', 1, 400); await log('right: Reveal'); await shot('news-covered-reveal');
    await key('ArrowLeft', 1, 300); await key('Enter', 1, 600); await log('Keep it hidden'); await noSpoiler('kept');
    // All games, before the reveal (Grizzlies at Kings still unseen): the reader's body is scanned (the fake story text has "108-101 win")
    await shield('all');
    await key('Escape', 1, 400); await key('ArrowLeft', 1, 700); await key('ArrowRight', 1, 2500);
    const ui = await ev(() => [...document.querySelectorAll('.nb-s[data-s="news"] .nb-nrow')].findIndex((r) => !r.classList.contains('cov') && !/fantasy/i.test(r.textContent)));
    await key('ArrowDown', ui + 1, 350); await key('Enter', 1, 1500); await log('all games: reader'); console.log('reader'.padEnd(22), await reader()); await shot('news-article-shield');
    await key('Escape', 1, 500);
    console.log((await rows()).slice(0, 8).join('\n'));
    // back to My team: Reveal marks Grizzlies at Kings seen and opens the story
    await shield('mine');
    await key('Escape', 1, 400); await key('ArrowLeft', 1, 700); await key('ArrowRight', 1, 2500);
    await key('ArrowDown', ci + 1, 350); await p.waitForTimeout(400); await log('the covered row again');
    await key('Enter', 1, 600); await key('ArrowRight', 1, 300); await key('Enter', 1, 1500); await log('Reveal');
    console.log('after reveal'.padEnd(22), await reader(), '|', await ev(() => document.querySelector('#overlays .menu h3')?.textContent || ''));
    await shot('news-revealed');
    await key('Escape', 1, 500); await log('back');
  }
  console.log((await rows()).slice(0, 8).join('\n'));
};
