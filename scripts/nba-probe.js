// Saves tonight's ESPN NBA feeds to fixtures/ so Tuner's NBA screens can be tested against real data.
const fs = require('fs');
const B = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const get = async (u) => (await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } })).json();
(async () => {
  fs.mkdirSync('fixtures', { recursive: true });
  const sb = await get(`${B}/scoreboard`);
  fs.writeFileSync('fixtures/scoreboard.json', JSON.stringify(sb));
  for (const e of sb.events || []) fs.writeFileSync(`fixtures/summary-${e.id}.json`, JSON.stringify(await get(`${B}/summary?event=${e.id}`)));
  console.log(`::notice title=fixtures::${(sb.events || []).map((e) => `${e.id} ${e.shortName} ${e.status?.type?.shortDetail}`).join(' | ')}`);
})();
