// Fetches ESPN's live NBA feeds and prints their shape, so the parser is built against real data.
const out = (title, obj) => console.log(`::notice title=${title}::${JSON.stringify(obj).replace(/%/g, '%25').replace(/\r?\n/g, ' ').slice(0, 3900)}`);
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }); return { status: r.status, json: r.ok ? await r.json() : null }; };
const keys = (o) => (o && typeof o === 'object' ? Object.keys(o) : o);
const B = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
(async () => {
  const sb = await get(`${B}/scoreboard`);
  const evs = sb.json?.events || [];
  out('scoreboard', { day: sb.json?.day, events: evs.map((e) => [e.id, e.date, e.shortName, e.status?.type?.state, e.status?.type?.shortDetail, e.competitions?.[0]?.broadcasts?.map((b) => b.names).flat()]) });
  const e = evs.find((x) => x.status?.type?.state === 'in') || evs.find((x) => x.status?.type?.state === 'post') || evs[0];
  out('event keys', { event: keys(e), comp: keys(e?.competitions?.[0]), competitor: keys(e?.competitions?.[0]?.competitors?.[0]), team: e?.competitions?.[0]?.competitors?.[0]?.team, linescores: e?.competitions?.[0]?.competitors?.[0]?.linescores, leaders: e?.competitions?.[0]?.competitors?.[0]?.leaders?.map((l) => [l.name, l.leaders?.[0]?.displayValue, l.leaders?.[0]?.athlete?.shortName]) });
  const s = await get(`${B}/summary?event=${e.id}`);
  const bs = s.json?.boxscore;
  out('summary keys', { status: s.status, top: keys(s.json), boxscore: keys(bs), header: keys(s.json?.header), comp: keys(s.json?.header?.competitions?.[0]) });
  const p0 = bs?.players?.[0];
  out('box players', { team: p0?.team?.abbreviation, statKeys: keys(p0?.statistics?.[0]), names: p0?.statistics?.[0]?.names, labels: p0?.statistics?.[0]?.labels, keysArr: p0?.statistics?.[0]?.keys, totals: p0?.statistics?.[0]?.totals, ath0: p0?.statistics?.[0]?.athletes?.[0] && { ...p0.statistics[0].athletes[0], athlete: { displayName: p0.statistics[0].athletes[0].athlete?.displayName, shortName: p0.statistics[0].athletes[0].athlete?.shortName, jersey: p0.statistics[0].athletes[0].athlete?.jersey, position: p0.statistics[0].athletes[0].athlete?.position?.abbreviation, headshot: p0.statistics[0].athletes[0].athlete?.headshot } } });
  out('box teams', bs?.teams?.[0] && { team: bs.teams[0].team?.abbreviation, stats: bs.teams[0].statistics?.map((x) => [x.name, x.label, x.abbreviation, x.displayValue]) });
  const plays = s.json?.plays || [];
  out('plays', { n: plays.length, last: plays.slice(-2).map((p) => ({ ...p, participants: undefined })) });
  out('header status', s.json?.header?.competitions?.[0]?.status);
})().catch((err) => out('probe error', String(err)));
