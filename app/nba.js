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

  global.NBA = { TEAMS, team, scoreboard, summary, matchGame, logoFor };
})(window);
