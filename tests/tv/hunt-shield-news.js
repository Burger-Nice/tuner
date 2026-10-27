// News under the shield, My team, the Kings final unseen (SPEC 8.3). Made-up stories, published after that tip-off:
//   r1  a 30-team power-rankings round-up whose headline names the Grizzlies and Kings (rule 3: covered)
//   p1  tagged only with a Kings player (rule 2: covered once the Kings roster is known)
//   b1  a Thunder story (not covered), whose body has paragraphs about the Grizzlies' win that the scan should replace
// Run: node tests/tv/drive.js <out> hunt-shield-news
const H = { 'Access-Control-Allow-Origin': '*' };
module.exports = async (ctx) => {
  const { p, shot, key } = ctx;
  const L = require('./hunt-shield-lib.js')(ctx);
  const all = [...Array(30)].map((_, i) => ({ type: 'team', teamId: i + 1 }));
  const art = (id, headline, description, cats, published = '2026-10-26T20:00:00Z') => ({ id, type: 'Story', headline, description, published, categories: [{ type: 'league', leagueId: 46 }, ...cats], images: [] });
  const news = { articles: [
    art('r1', 'Power rankings: Grizzlies climb to No. 2, Kings slide to 27th', 'Week 1 of the NBA power rankings is here.', all, '2026-10-26T21:00:00Z'),
    art('p1', "Keegan Murray after Sunday: 'We have to be better'", 'The forward spoke to reporters on Monday.', [{ type: 'athlete', athleteId: 7777, description: 'Keegan Murray' }], '2026-10-26T20:30:00Z'),
    art('b1', 'Thunder adjust to life without Jalen Williams', 'How OKC plans to cover two starting guards.', [{ type: 'team', teamId: 25 }], '2026-10-26T20:10:00Z'),
  ] };
  const body = { headlines: [{ headline: 'Thunder adjust to life without Jalen Williams', story: [
    '<p>Around the West on Sunday night, the late game finished 123-112, the biggest margin of the night.</p>',
    '<p>Scotty Pippen Jr. hit the go-ahead three with 20 seconds left to seal the win.</p>',
    '<p>Memphis defeated Sacramento behind a strong second half from its bench unit.</p>',
    '<p>The Grizzlies made it three for three, and the Kings are still searching for an answer.</p>',
    '<p>Oklahoma City now turns to Ajay Mitchell and Isaiah Joe to cover the minutes.</p>',
  ].join('') }] };
  const kings = { athletes: [{ id: '7777', displayName: 'Keegan Murray', jersey: '13', position: { abbreviation: 'F' } }, { id: '7778', displayName: 'Domantas Sabonis', jersey: '10', position: { abbreviation: 'C' } }] };
  await L.start({
    shield: process.env.MODE || 'mine',
    before: async () => {
      await p.route('**/espn/news*', (r) => r.fulfill({ contentType: 'application/json', headers: H, body: JSON.stringify(news) }));
      await p.route('**/espncontent/**', (r) => r.fulfill({ contentType: 'application/json', headers: H, body: JSON.stringify(body) }));
      await p.route('**/espn/teams/23/roster', async (r) => { await new Promise((ok) => setTimeout(ok, process.env.SLOW ? 6000 : 0)); return r.fulfill({ contentType: 'application/json', headers: H, body: JSON.stringify(kings) }); });
    },
  });
  const rows = () => L.ev(() => [...document.querySelectorAll('.nb-s[data-s="news"] .nb-nrow')].map((r) => `${r.classList.contains('cov') ? 'COV ' : '    '}${r.querySelector('b').textContent.slice(0, 80)}`).join('\n'));
  await L.toSection(5); await p.waitForTimeout(300);
  console.log('rows at once:\n' + (await rows()));
  await p.waitForTimeout(3000);
  console.log('rows after 3 s:\n' + (await rows()));
  await key('ArrowDown', 1, 400); await shot('news-list');
  // the Thunder story (third row): the reader's body scan
  await key('ArrowDown', 2, 400); await key('Enter', 1, 1500); await shot('reader');
  console.log('reader paragraphs:\n' + (await L.ev(() => [...document.querySelectorAll('#overlays .nb-read p')].map((x) => (x.classList.contains('hidp') ? '[hidden] ' : '         ') + x.textContent.slice(0, 100)).join('\n'))));
};
