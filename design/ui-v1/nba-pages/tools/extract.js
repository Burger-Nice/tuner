// node tools/extract.js <espn-dir> <espn2-dir>
// Reads the ESPN JSON fetched on 26 Oct 2026 (see SPEC.md section 9 for the endpoints) and writes data.json: only the
// fields the Team and League pages use, in the shape app/nba.js already returns. Also downloads the images the mocks
// show (team logos, a few headshots and news photos) at 2x their display size through ESPN's resizer into img/.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [A, B] = process.argv.slice(2);
const root = path.resolve(__dirname, '..');
const J = (dir, f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const out = { now: '2026-10-26T23:40:00Z', tz: 'Atlantic/Reykjavik', fetched: '2026-10-26T23:37:15Z' };

// ---- teams (teams.json: sports[0].leagues[0].teams[].team)
const teams = {};
for (const { team: t } of J(A, 'teams.json').sports[0].leagues[0].teams) teams[t.abbreviation] = { id: t.id, abbr: t.abbreviation, loc: t.location, name: t.shortDisplayName, full: t.displayName, color: '#' + t.color, alt: '#' + t.alternateColor };
out.teams = teams;
const abbrOfId = (id) => Object.values(teams).find((t) => String(t.id) === String(id))?.abbr || '';

// ---- standings (standings.json: children[].standings.entries[]; stats by name)
const st = J(A, 'standings.json');
out.standings = {
  season: st.season?.displayName,
  confs: st.children.map((c) => ({
    name: c.name, short: /east/i.test(c.name) ? 'East' : 'West',
    teams: c.standings.entries.map((e) => {
      const s = Object.fromEntries(e.stats.map((x) => [x.name || x.type, x]));
      const v = (k) => s[k]?.displayValue ?? s[k]?.summary ?? '';
      return { abbr: e.team.abbreviation, seed: +s.playoffSeed.value, w: +s.wins.value, l: +s.losses.value, pct: v('winPercent'), gb: v('gamesBehind'), streak: v('streak'), l10: v('Last Ten Games'), home: v('Home'), road: v('Road'), ppg: v('avgPointsFor'), opp: v('avgPointsAgainst') };
    }).sort((a, b) => a.seed - b.seed || parseFloat(b.pct) - parseFloat(a.pct)),
  })),
};

// ---- tonight's scoreboard (scoreboard?dates=20261026)
const game = (e) => {
  const c = e.competitions[0], side = (h) => c.competitors.find((x) => x.homeAway === h);
  const t = (x) => ({ abbr: x.team.abbreviation, score: typeof x.score === 'object' ? x.score?.displayValue : x.score, rec: x.records?.[0]?.summary || x.record?.[0]?.displayValue || '', win: !!x.winner });
  return { id: e.id, date: e.date, state: c.status.type.state, detail: c.status.type.shortDetail, clock: c.status.displayClock, period: c.status.period, away: t(side('away')), home: t(side('home')), tv: (c.broadcasts || []).flatMap((b) => b.names || [b.media?.shortName]).filter(Boolean) };
};
out.tonight = J(B, 'sb1026.json').events.map(game);

// ---- schedules
const sched = (f, me) => J(B, f).events.map((e) => {
  const g = game(e), home = g.home.abbr === me;
  return { id: g.id, date: g.date, state: g.state, home, opp: home ? g.away.abbr : g.home.abbr, us: home ? g.home.score : g.away.score, them: home ? g.away.score : g.home.score, win: home ? g.home.win : g.away.win, tv: [...new Set(g.tv)], detail: g.detail };
});
fs.copyFileSync(path.join(A, 'schedule29.json'), path.join(B, 'sched29.json'));
out.sched = { MEM: sched('sched29.json', 'MEM'), UTAH: sched('sched26.json', 'UTAH') };
out.standing = { MEM: J(B, 'sched29.json').team.standingSummary, UTAH: J(B, 'sched26.json').team.standingSummary };   // "1st in Southwest Division"

// ---- rosters and per-player averages (teams/{id}/roster, teams/{id}/athletes/statistics)
const roster = (d) => d.athletes.map((a) => ({ id: a.id, jersey: a.jersey || '', name: a.displayName, short: a.shortName, pos: a.position?.abbreviation || '', posName: a.position?.displayName || '', age: a.age, ht: a.displayHeight, wt: a.displayWeight, exp: a.experience?.years ?? null, college: a.college?.name || '', injury: a.injuries?.[0]?.status || '', born: a.birthPlace ? [a.birthPlace.city, a.birthPlace.state || a.birthPlace.country].filter(Boolean).join(', ') : '' }));
out.roster = { MEM: roster(J(A, 'roster29.json')), UTAH: roster(J(B, 'roster26.json')) };
const players = (d) => (d.results?.[0]?.leaders || []).map((l) => {
  const s = {}; for (const c of l.statistics || []) for (const x of c.stats || []) if (s[x.name] == null) s[x.name] = x.value;
  return { id: l.athlete.id, name: l.athlete.displayName, pos: l.athlete.position?.abbreviation || '', gp: s.gamesPlayed, gs: s.gamesStarted, min: s.avgMinutes, pts: s.avgPoints, reb: s.avgRebounds, ast: s.avgAssists, stl: s.avgSteals, blk: s.avgBlocks, fg: s.fieldGoalPct, tp: s.threePointFieldGoalPct ?? s.threePointPct, ft: s.freeThrowPct };
});
out.players = { MEM: players(J(B, 'mem-athletes.json')), UTAH: players(J(B, 'ath26.json')) };

// ---- league leaders (leaders2.json: leaders.categories[].leaders[] with team)
const L2 = J(A, 'leaders2.json').leaders.categories;
const want = { pts: 'pointsPerGame', reb: 'reboundsPerGame', ast: 'assistsPerGame', stl: 'stealsPerGame', blk: 'blocksPerGame', '3pm': '3PointsMadePerGame', fg: 'fieldGoalPercentage' };
out.leaders = {};
for (const [k, n] of Object.entries(want)) out.leaders[k] = L2.find((c) => c.name === n).leaders.map((l) => ({ id: l.athlete.id, name: l.athlete.displayName, pos: l.athlete.position?.abbreviation || '', abbr: l.team?.abbreviation || '', value: l.displayValue }));

// ---- team stats, every team (byteamlg.json: teams[].categories[]; names from the top-level categories), ranked here
const TS = J(A, 'byteamlg.json');
const names = Object.fromEntries(TS.categories.filter((c) => c.names).map((c) => [c.name, c.names]));
const vals = {};
for (const t of TS.teams) {
  const v = {};
  for (const c of t.categories) { if (c.name === 'differential') continue; const pre = c.splitId === '900' ? 'opp_' : ''; (names[c.name] || []).forEach((n, i) => { if (v[pre + n] == null) v[pre + n] = c.values[i]; }); }
  vals[t.team.abbreviation] = v;
}
const METRICS = [['avgPoints', 'Points', 1, 1], ['opp_avgPoints', 'Points allowed', 0, 1], ['avgRebounds', 'Rebounds', 1, 1], ['avgAssists', 'Assists', 1, 1], ['fieldGoalPct', 'Field goal %', 1, 1], ['threePointFieldGoalPct', '3-point %', 1, 1], ['avgThreePointFieldGoalsMade', '3-pointers made', 1, 1], ['avgSteals', 'Steals', 1, 1], ['avgBlocks', 'Blocks', 1, 1], ['avgTurnovers', 'Turnovers', 0, 1]];
out.teamStats = METRICS.map(([key, label, high, dp]) => {
  const rows = Object.entries(vals).map(([abbr, v]) => ({ abbr, v: +(+v[key]).toFixed(dp) }));
  rows.sort((a, b) => (high ? b.v - a.v : a.v - b.v));
  rows.forEach((r) => { const better = rows.filter((o) => (high ? o.v > r.v : o.v < r.v)).length; r.rank = better + 1; r.tie = rows.filter((o) => o.v === r.v).length > 1; });
  return { key, label, high: !!high, rows };
});

// ---- news (news?limit=25, &team=29, &team=26): videos (type Media) are dropped: the TV can't play them
// (the NBA feed also carries WNBA stories: league category 59; they are dropped too)
const news = (f) => J(B, f).articles.filter((a) => a.type !== 'Media' && !(a.categories || []).some((c) => c.type === 'league' && +c.leagueId === 59)).map((a) => ({
  id: String(a.id), type: a.type, headline: a.headline, description: a.description || '', published: a.published, byline: a.byline || '', premium: !!a.premium,
  image: (a.images || []).find((i) => i.type === 'header')?.url || (a.images || []).find((i) => i.url && !/stitcher/.test(i.url))?.url || '',
  stitch: (a.images || []).find((i) => /16x9/.test(i.name || ''))?.url || '',
  teams: [...new Set((a.categories || []).filter((c) => c.type === 'team').map((c) => c.team?.abbreviation || abbrOfId(c.teamId)).filter(Boolean))],
  events: (a.categories || []).filter((c) => c.type === 'event').map((c) => String(c.eventId)),
  athletes: (a.categories || []).filter((c) => c.type === 'athlete').map((c) => String(c.athlete?.id || c.athleteId || '')).filter(Boolean),
}));
out.news = { league: news('newsL.json'), MEM: news('news29b.json'), UTAH: news('news26.json') };

// ---- two full stories (content.core.api.espn.com/v1/sports/news/{id}: headlines[0].story is HTML)
const paras = (html) => html.replace(/<(script|iframe|figure|aside)[\s\S]*?<\/\1>/gi, '').split(/<\/p>|\n\s*\n/i).map((p) => p.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, '’').replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/\s+/g, ' ').trim()).filter((p) => p.length > 30);
out.stories = {};
for (const id of ['50287191', '50284583']) { const h = J(B, `story${id}.json`).headlines[0]; out.stories[id] = { headline: h.headline, byline: h.byline || '', published: h.published, paras: paras(h.story) }; }

fs.writeFileSync(path.join(root, 'data.json'), JSON.stringify(out, null, 1));
console.log('data.json', fs.statSync(path.join(root, 'data.json')).size, 'bytes');

// ---- images at 2x display size via ESPN's resizer (a.espncdn.com/combiner/i?img=<path>&w=&h=)
const get = (url, file) => { const f = path.join(root, 'img', file); if (fs.existsSync(f) && fs.statSync(f).size > 500) return; execFileSync('curl', ['-sS', '-m', '30', '-o', f, url]); };
const comb = (p, w, h) => `https://a.espncdn.com/combiner/i?img=${encodeURIComponent(p)}&w=${w}&h=${h}`;
for (const a of Object.keys(teams)) get(comb(`/i/teamlogos/nba/500-dark/scoreboard/${a.toLowerCase()}.png`, 128, 128), `logo-${a}.png`);
const heads = new Set([...Object.values(out.leaders).map((l) => l[0].id), '4065733', '5041935', out.players.UTAH[0].id]);
for (const id of heads) get(comb(`/i/headshots/nba/players/full/${id}.png`, 280, 204), `head-${id}.png`);
const pics = [...out.news.league.slice(0, 10), ...out.news.MEM.slice(0, 8), ...out.news.UTAH.slice(0, 4)];
for (const n of pics) {
  if (!n.image) continue;
  const u = new URL(n.image);
  get(u.host === 'a.espncdn.com' ? comb(u.pathname, 896, 504) : n.image, `news-${n.id}.jpg`);
}
console.log('images', fs.readdirSync(path.join(root, 'img')).length);
