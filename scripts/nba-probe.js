// Fetches the live NBA feeds and prints their shape, so the parser is built against real data.
const out = (title, obj) => console.log(`::notice title=${title}::${JSON.stringify(obj).replace(/%/g, '%25').replace(/\r?\n/g, ' ').slice(0, 3800)}`);
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }); return { status: r.status, json: r.ok ? await r.json() : null }; };
const keys = (o) => (o && typeof o === 'object' ? Object.keys(o) : o);
(async () => {
  const sb = await get('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json');
  const games = sb.json?.scoreboard?.games || [];
  out('nba scoreboard', { status: sb.status, date: sb.json?.scoreboard?.gameDate, n: games.length, games: games.map((g) => [g.gameId, g.gameStatus, g.gameStatusText, g.gameClock, g.period, g.awayTeam?.teamTricode, g.awayTeam?.score, g.homeTeam?.teamTricode, g.homeTeam?.score, g.gameTimeUTC]) });
  if (games[0]) out('nba game keys', { game: keys(games[0]), team: keys(games[0].homeTeam), leaders: games[0].gameLeaders, broadcasters: games[0].broadcasters });
  const pick = games.find((g) => g.gameStatus === 2) || games.find((g) => g.gameStatus === 3) || games[0];
  if (pick) {
    const bx = await get(`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${pick.gameId}.json`);
    const g = bx.json?.game;
    out('nba boxscore', { status: bx.status, game: keys(g), team: keys(g?.homeTeam), player0: g?.homeTeam?.players?.[0], teamStats: g?.homeTeam?.statistics && Object.fromEntries(Object.entries(g.homeTeam.statistics).slice(0, 30)) });
    const pb = await get(`https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${pick.gameId}.json`);
    out('nba playbyplay', { status: pb.status, n: pb.json?.game?.actions?.length, last: pb.json?.game?.actions?.slice(-2) });
  }
  const es = await get('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard');
  const ev = es.json?.events?.[0];
  out('espn scoreboard', { status: es.status, n: es.json?.events?.length, status0: ev?.status, comp0: ev?.competitions?.[0]?.competitors?.map((c) => ({ homeAway: c.homeAway, score: c.score, abbr: c.team?.abbreviation, logo: c.team?.logo, color: c.team?.color, rec: c.records?.[0]?.summary })) });
})().catch((e) => out('probe error', String(e)));
