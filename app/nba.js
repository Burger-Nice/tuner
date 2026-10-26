// Live NBA scores, box scores and play-by-play from ESPN's public JSON feed.
// No DOM in here, so it can be reused for a TV version.
(function (global) {
  'use strict';

  const base = () => global.Core?.store.get('nbaBase', null) || 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

  // ESPN abbreviations. `alt` are other names channels and guides use for the team.
  const TEAMS = [
    ['ATL', 'Atlanta', 'Hawks'], ['BOS', 'Boston', 'Celtics'], ['BKN', 'Brooklyn', 'Nets'], ['CHA', 'Charlotte', 'Hornets'],
    ['CHI', 'Chicago', 'Bulls'], ['CLE', 'Cleveland', 'Cavaliers', ['Cavs']], ['DAL', 'Dallas', 'Mavericks', ['Mavs']],
    ['DEN', 'Denver', 'Nuggets'], ['DET', 'Detroit', 'Pistons'], ['GS', 'Golden State', 'Warriors'], ['HOU', 'Houston', 'Rockets'],
    ['IND', 'Indiana', 'Pacers'], ['LAC', 'LA', 'Clippers'], ['LAL', 'Los Angeles', 'Lakers'], ['MEM', 'Memphis', 'Grizzlies', ['Grizz']],
    ['MIA', 'Miami', 'Heat'], ['MIL', 'Milwaukee', 'Bucks'], ['MIN', 'Minnesota', 'Timberwolves', ['Wolves', 'T-Wolves']],
    ['NO', 'New Orleans', 'Pelicans', ['Pels']], ['NY', 'New York', 'Knicks'], ['OKC', 'Oklahoma City', 'Thunder'], ['ORL', 'Orlando', 'Magic'],
    ['PHI', 'Philadelphia', '76ers', ['Sixers']], ['PHX', 'Phoenix', 'Suns'], ['POR', 'Portland', 'Trail Blazers', ['Blazers']],
    ['SAC', 'Sacramento', 'Kings'], ['SA', 'San Antonio', 'Spurs'], ['TOR', 'Toronto', 'Raptors'], ['UTAH', 'Utah', 'Jazz'], ['WSH', 'Washington', 'Wizards'],
  ].map(([abbr, city, name, alt = []]) => {
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Los Angeles and New York are shared or too common to identify a team on their own.
    const cityOk = !['LA', 'Los Angeles'].includes(city);
    return {
      abbr, city, name,
      nameRe: new RegExp(`(^|[^\\p{L}\\d])(${[name, ...alt].map(esc).join('|')})(?![\\p{L}\\d])`, 'iu'),
      cityRe: cityOk ? new RegExp(`(^|[^\\p{L}])(${esc(city)})(?![\\p{L}])`, 'iu') : null,
    };
  });
  const byAbbr = new Map(TEAMS.map((t) => [t.abbr, t]));

  async function getJSON(url, ms = 15000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`The scores service answered ${res.status}.`);
      return await res.json();
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'The scores service took too long to answer.' : e.message.startsWith('The scores') ? e.message : 'Could not reach the scores service.');
    } finally {
      clearTimeout(t);
    }
  }

  const logoFor = (abbr) => (abbr ? `https://a.espncdn.com/i/teamlogos/nba/500-dark/scoreboard/${abbr.toLowerCase()}.png` : '');

  function side(c = {}) {
    const t = c.team || {};
    const abbr = t.abbreviation || '';
    const rec = (c.records || c.record || [])[0];
    return {
      id: String(t.id || ''), abbr,
      name: t.shortDisplayName || t.name || abbr,
      full: t.displayName || abbr,
      color: t.color ? '#' + t.color : '',
      alt: t.alternateColor ? '#' + t.alternateColor : '',
      logo: t.logoDark || logoFor(abbr),
      score: c.score == null ? '' : String(c.score.displayValue ?? c.score),
      record: rec?.summary || rec?.displayValue || '',
      lines: (c.linescores || []).map((l) => String(l.displayValue ?? l.value ?? '')),
      leaders: (c.leaders || []).filter((l) => ['points', 'rebounds', 'assists'].includes(l.name)).map((l) => ({
        stat: { points: 'PTS', rebounds: 'REB', assists: 'AST' }[l.name], value: l.leaders?.[0]?.displayValue || '', who: l.leaders?.[0]?.athlete?.shortName || '',
      })),
    };
  }

  function status(s = {}) {
    const t = s.type || {};
    return { state: t.state || 'pre', detail: t.shortDetail || t.detail || '', clock: s.displayClock || '', period: s.period || 0, final: !!t.completed };
  }

  function game(e) {
    const comp = e.competitions?.[0] || {};
    const cs = comp.competitors || [];
    const home = cs.find((c) => c.homeAway === 'home') || cs[0];
    const away = cs.find((c) => c.homeAway === 'away') || cs[1];
    return {
      id: String(e.id), date: Date.parse(e.date || comp.date) || 0,
      ...status(e.status || comp.status),
      tv: [...new Set((comp.broadcasts || []).flatMap((b) => b.names || (b.media?.shortName ? [b.media.shortName] : [])))],
      home: side(home), away: side(away),
    };
  }

  // ymd: 'YYYYMMDD', or empty for ESPN's "today" (which follows US time, so late games stay listed).
  async function scoreboard(ymd) {
    const d = await getJSON(`${base()}/scoreboard${ymd ? '?dates=' + ymd : ''}`);
    return { day: d.day?.date || '', games: (d.events || []).map(game) };
  }

  async function summary(id) {
    const d = await getJSON(`${base()}/summary?event=${encodeURIComponent(id)}`);
    const comp = d.header?.competitions?.[0] || {};
    const g = game({ id, date: comp.date, status: comp.status, competitions: [comp] });
    const teamAbbr = new Map((comp.competitors || []).map((c) => [String(c.team?.id), c.team?.abbreviation]));
    const box = (d.boxscore?.players || []).map((p) => {
      const s = p.statistics?.[0] || {};
      return {
        abbr: p.team?.abbreviation || '',
        labels: s.labels || s.names || [],
        totals: s.totals || [],
        players: (s.athletes || []).map((a) => ({
          name: a.athlete?.displayName || '', short: a.athlete?.shortName || a.athlete?.displayName || '',
          jersey: a.athlete?.jersey || '', pos: a.athlete?.position?.abbreviation || (typeof a.athlete?.position === 'string' ? a.athlete.position : ''),
          starter: !!a.starter, dnp: !!a.didNotPlay || !(a.stats || []).length, reason: a.reason || '', stats: a.stats || [],
        })),
      };
    });
    const teams = (d.boxscore?.teams || []).map((t) => ({
      abbr: t.team?.abbreviation || '',
      stats: Object.fromEntries((t.statistics || []).map((s) => [s.name, s.displayValue])),
    }));
    const plays = (d.plays || []).slice(-60).reverse().map((p) => ({
      text: p.text || '', clock: p.clock?.displayValue || '', period: p.period?.number || 0,
      away: p.awayScore, home: p.homeScore, scoring: !!p.scoringPlay, team: teamAbbr.get(String(p.team?.id)) || '', at: Date.parse(p.wallclock) || 0,
    }));
    return { game: g, box, teams, plays };
  }

  // Which of `games` does this text (channel name, guide title) refer to? Returns a game or null.
  function matchGame(text, games) {
    if (!text) return null;
    const nbaish = /\bNBA\b|basketball|league pass/i.test(text);
    const hits = (abbr) => {
      const t = byAbbr.get(abbr);
      if (!t) return 0;
      if (t.nameRe.test(text)) return 2;
      if (t.cityRe?.test(text)) return 1;
      return 0;
    };
    let best = null, bestScore = 0;
    for (const g of games) {
      const a = hits(g.away.abbr), h = hits(g.home.abbr);
      // Both teams named, or one nickname plus a basketball hint, or one nickname for a game that is on now.
      let score = 0;
      if (a && h) score = 10 + a + h;
      else if (Math.max(a, h) === 2 && (nbaish || g.state === 'in')) score = 5;
      else if (Math.max(a, h) === 1 && nbaish) score = 3;
      if (score && g.state === 'in') score += 1;
      if (score > bestScore) { bestScore = score; best = g; }
    }
    return best;
  }

  const team = (abbr) => byAbbr.get(abbr) || null;

  // ---------- the league and team pages ----------
  // site.web.api.espn.com carries the standings and the stats tables (tests point both bases at the fake ESPN).
  const web = () => global.Core?.store.get('nbaWebBase', null) || 'https://site.web.api.espn.com/apis';
  const ESPN_ID = { ATL: 1, BOS: 2, NO: 3, CHI: 4, CLE: 5, DAL: 6, DEN: 7, DET: 8, GS: 9, HOU: 10, IND: 11, LAC: 12, LAL: 13, MIA: 14, MIL: 15, MIN: 16, BKN: 17, NY: 18, ORL: 19, PHI: 20, PHX: 21, POR: 22, SAC: 23, SA: 24, OKC: 25, UTAH: 26, WSH: 27, TOR: 28, MEM: 29, CHA: 30 };
  const idOf = (abbr) => ESPN_ID[abbr] || 0;
  const abbrOfId = (id) => Object.keys(ESPN_ID).find((k) => String(ESPN_ID[k]) === String(id)) || '';
  const teamBits = (t = {}) => ({
    id: String(t.id || ''), abbr: t.abbreviation || abbrOfId(t.id), name: t.shortDisplayName || t.name || t.abbreviation || '',
    full: t.displayName || '', color: t.color ? '#' + t.color : '', alt: t.alternateColor ? '#' + t.alternateColor : '',
    logo: logoFor(t.abbreviation || abbrOfId(t.id)),
  });

  // Standings: both conferences, each team's line, in seed order.
  async function standings() {
    const d = await getJSON(`${web()}/v2/sports/basketball/nba/standings`);
    const confs = (d.children || []).map((c) => ({
      name: c.name || '', short: /east/i.test(c.name || '') ? 'East' : /west/i.test(c.name || '') ? 'West' : c.abbreviation || '',
      teams: (c.standings?.entries || []).map((e) => {
        const st = Object.fromEntries((e.stats || []).map((x) => [x.name || x.type, x]));
        const v = (k) => st[k]?.displayValue ?? '';
        return {
          ...teamBits(e.team), seed: +st.playoffSeed?.value || 0,
          w: +st.wins?.value || 0, l: +st.losses?.value || 0, pct: v('winPercent'), gb: v('gamesBehind'), streak: v('streak'),
          l10: v('Last Ten Games'), home: v('Home'), road: v('Road'), conf: v('vs. Conf.'), diff: v('differential'),
          ppg: v('avgPointsFor'), opp: v('avgPointsAgainst'),
        };
      }).sort((a, b) => (a.seed || 99) - (b.seed || 99)),
    }));
    return { season: d.season?.displayName || '', confs };
  }

  // The stats tables: a list of players (or teams) with their numbers by category name, e.g. row.s.avgPoints.
  function statRows(d, list) {
    const names = (d.categories || []).map((c) => c.names || []);
    return (d[list] || []).map((r) => {
      const s = {}, rank = {};
      (r.categories || []).forEach((c, i) => (names[i] || []).forEach((n, j) => {
        if (s[n] == null && c.values?.[j] != null) { s[n] = c.values[j]; if (c.ranks?.[j] != null) rank[n] = c.ranks[j]; }
      }));
      return { r, s, rank };
    });
  }
  // League leaders, one category: sort is ESPN's "<category>.<stat>" ("offensive.avgPoints").
  const LEADERS = [
    { key: 'pts', label: 'Points', short: 'PTS', sort: 'offensive.avgPoints', stat: 'avgPoints' },
    { key: 'reb', label: 'Rebounds', short: 'REB', sort: 'general.avgRebounds', stat: 'avgRebounds' },
    { key: 'ast', label: 'Assists', short: 'AST', sort: 'offensive.avgAssists', stat: 'avgAssists' },
    { key: 'stl', label: 'Steals', short: 'STL', sort: 'defensive.avgSteals', stat: 'avgSteals' },
    { key: 'blk', label: 'Blocks', short: 'BLK', sort: 'defensive.avgBlocks', stat: 'avgBlocks' },
    { key: '3pm', label: '3-pointers made', short: '3PM', sort: 'offensive.avgThreePointFieldGoalsMade', stat: 'avgThreePointFieldGoalsMade' },
    { key: 'fg', label: 'Field goal %', short: 'FG%', sort: 'offensive.fieldGoalPct', stat: 'fieldGoalPct', pct: true },
  ];
  const fmt = (v, pct) => (v == null ? '' : pct ? (+v).toFixed(1) : (+v).toFixed(1));
  const player = ({ r, s }) => {
    const a = r.athlete || {};
    return {
      id: String(a.id || ''), name: a.displayName || '', short: a.shortName || a.displayName || '', abbr: a.teamShortName || abbrOfId(a.teamId),
      pos: a.position?.abbreviation || '', age: a.age || 0, headshot: a.headshot?.href || '',
      gp: s.gamesPlayed || 0, min: s.avgMinutes, pts: s.avgPoints, reb: s.avgRebounds, ast: s.avgAssists, stl: s.avgSteals, blk: s.avgBlocks,
      fg: s.fieldGoalPct, tp: s.threePointFieldGoalPct, ft: s.freeThrowPct, tpm: s.avgThreePointFieldGoalsMade, s,
    };
  };
  async function leaders(key, limit = 5) {
    const c = LEADERS.find((x) => x.key === key) || LEADERS[0];
    const d = await getJSON(`${web()}/common/v3/sports/basketball/nba/statistics/byathlete?limit=${limit}&sort=${c.sort}:desc`);
    return statRows(d, 'athletes').map(player).map((p) => ({ ...p, value: fmt(p.s[c.stat], c.pct) }));
  }
  // A team's players with their averages, best scorer first, and the team's own line ("1st in Southwest Division").
  // (The league stats table above ignores a team filter; this one is per team.)
  async function teamPlayers(abbr) {
    const d = await getJSON(`${base()}/teams/${idOf(abbr)}/athletes/statistics`);
    const named = (cats) => { const o = {}; for (const c of cats || []) for (const x of c.stats || []) if (o[x.name] == null) o[x.name] = x.value; return o; };
    const players = (d.results?.[0]?.leaders || []).map((l) => {
      const a = l.athlete || {}, st = named(l.statistics);
      return {
        id: String(a.id || ''), name: a.displayName || '', short: a.shortName || a.displayName || '', abbr, pos: a.position?.abbreviation || '',
        headshot: a.headshot?.href || '', gp: st.gamesPlayed || 0, gs: st.gamesStarted || 0, min: st.avgMinutes, pts: st.avgPoints,
        reb: st.avgRebounds, ast: st.avgAssists, stl: st.avgSteals, blk: st.avgBlocks, fg: st.fieldGoalPct, tp: st.threePointFieldGoalPct ?? st.threePointPct,
        ft: st.freeThrowPct, tpm: st.avgThreePointFieldGoalsMade, s: st,
      };
    }).sort((x, y) => (y.pts || 0) - (x.pts || 0));
    return { players, record: d.team?.recordSummary || '', standing: d.team?.standingSummary || '', totals: named(d.teamTotals) };
  }
  // Every team's per-game numbers, ranked across the league here (ESPN ranks only some): { MEM: { s, rank } }.
  // Lower is better for points allowed and turnovers.
  const LOWER = new Set(['avgTurnovers', 'avgFouls']);
  async function teamStats() {
    const d = await getJSON(`${web()}/common/v3/sports/basketball/nba/statistics/byteam?limit=30`);
    const out = {};
    for (const x of statRows(d, 'teams')) { const t = teamBits(x.r.team); if (t.abbr) out[t.abbr] = { ...t, s: x.s, rank: {} }; }
    const all = Object.values(out), keys = new Set(all.flatMap((t) => Object.keys(t.s)));
    for (const k of keys) {
      const sorted = all.filter((t) => typeof t.s[k] === 'number').sort((a, b) => (LOWER.has(k) ? a.s[k] - b.s[k] : b.s[k] - a.s[k]));
      sorted.forEach((t, i) => { t.rank[k] = i > 0 && sorted[i - 1].s[k] === t.s[k] ? sorted[i - 1].rank[k] : i + 1; });
    }
    return out;
  }
  // A team's season: every game with its result or tip-off and TV.
  async function schedule(abbr) {
    const d = await getJSON(`${base()}/teams/${idOf(abbr)}/schedule`, 20000);
    return { season: d.season?.displayName || '', games: (d.events || []).map(game).sort((a, b) => a.date - b.date) };
  }
  async function roster(abbr) {
    const d = await getJSON(`${base()}/teams/${idOf(abbr)}/roster`);
    return (d.athletes || []).map((a) => ({
      id: String(a.id || ''), name: a.displayName || '', short: a.shortName || '', jersey: a.jersey || '', pos: a.position?.abbreviation || '',
      age: a.age || 0, height: a.displayHeight || '', exp: a.experience?.years ?? null, college: a.college?.name || '',
      injury: a.injuries?.[0] ? (a.injuries[0].status || a.injuries[0].type?.description || 'Injured') : '', headshot: a.headshot?.href || '',
    }));
  }
  // News: the league's, or one team's (abbr). An article's own text isn't in the feed: the headline and its summary are.
  async function news(abbr) {
    const d = await getJSON(`${base()}/news?limit=25${abbr ? '&team=' + idOf(abbr) : ''}`);
    return (d.articles || []).filter((a) => a.headline).map((a) => ({
      id: String(a.id || a.dataSourceIdentifier || a.headline), headline: a.headline, description: a.description || '', type: a.type || '',
      published: Date.parse(a.published) || 0, byline: a.byline || '', premium: !!a.premium,
      image: (a.images || []).find((i) => i.url && (i.type === 'header' || i.width >= 400))?.url || a.images?.[0]?.url || '',
      teams: (a.categories || []).filter((c) => c.type === 'team').map((c) => abbrOfId(c.teamId || c.team?.id)).filter(Boolean),
    }));
  }

  global.NBA = { TEAMS, team, scoreboard, summary, matchGame, logoFor, ESPN_ID, LEADERS, standings, leaders, teamPlayers, teamStats, schedule, roster, news };
})(window);
