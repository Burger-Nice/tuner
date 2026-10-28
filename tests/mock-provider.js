// Fake Xtream Codes provider for tests (credentials demo / demo), with recorded ESPN NBA data.
// Test video and artwork come from tests/make-media.sh.
const http = require('http');
const fs = require('fs');
const path = require('path');
const D = __dirname;
const MEDIA = process.env.MEDIA_DIR || path.join(D, 'media');
const ESPN = path.join(D, 'fixtures/espn');
const PORT = 8899;
const B = `http://127.0.0.1:${PORT}`;
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const addons = require('./mock-addons.js');   // the fake add-ons, the fake Stremio API and the ratings file (add-ons tests)

const liveCats = ['News', 'Sports', 'Movies', 'Kids', 'Music', 'Documentary', 'Iceland | ÍS', 'UK | Entertainment'].map((n, i) => ({ category_id: String(i + 1), category_name: n }));
const names = ['NBA 01: Memphis Grizzlies @ Golden State Warriors', 'US: ESPN HD', 'NBA League Pass 3', 'BBC One', 'CNN International', 'Sky Sports Main Event 4K UHD', 'RÚV', 'Stöð 2', 'Eurosport 1', 'Discovery', 'Nat Geo', 'MTV', 'Cartoon Network', 'Al Jazeera', 'France 24', 'DAZN 1', 'HBO', 'Comedy Central'];
const live = Array.from({ length: 320 }, (_, i) => ({
  num: i + 1, name: i < names.length ? names[i] + (i % 3 === 0 ? ' HD' : '') : `Channel ${i + 1}`, stream_type: 'live', stream_id: 1000 + i,
  stream_icon: i % 4 === 3 ? '' : `${B}/img/l${i % 8}.png`, epg_channel_id: 'x', category_id: String((i % 8) + 1),
  tv_archive: i % 8 === 1 || i === 6 ? 1 : 0, tv_archive_duration: i % 8 === 1 || i === 6 ? 3 : 0,   // the Sports group and RÚV keep 3 days
}));
// Named the way real providers do, with the language and quality in the category name.
const vodCats = ['FR | DRAMA', 'EN | NEW RELEASES', 'EN | ACTION', '4K | UHD MOVIES', 'KIDS | MULTI-SUB', 'DE - KOMÖDIE'].map((n, i) => ({ category_id: String(10 + i), category_name: n }));
const titles = ['The Long Night', 'Northern Lights', 'Fast Lane', 'Glacier', 'Midnight Ferry', 'The Last Signal', 'Reykjavík Blues', 'Paper Moon', 'Static', 'Harbour'];
const vod = Array.from({ length: 640 }, (_, i) => ({
  num: i + 1, name: `${titles[i % 10]}${i >= 10 ? ' ' + (Math.floor(i / 10) + 1) : ''} (${2000 + (i % 25)})`, stream_type: 'movie', stream_id: 5000 + i,
  stream_icon: i % 5 === 4 ? '' : `${B}/img/p${i % 8}.jpg`, rating: String(((i * 7) % 50) / 10 + 5), added: String(1700000000 + i * 3600),
  category_id: String(10 + (i % 6)), container_extension: 'mp4',
}));
// NBA replays the way real providers name them (catch-up: design/ui-v1/catchup/SPEC.md 3.3, 5.7): the Grizzlies at the
// Jazz (tip-off Tue 27 Oct 01:00 UTC, Mon 26 Oct in the US) and at the Kings (Mon 26 Oct 01:00 UTC), and other videos.
vodCats.push({ category_id: '16', category_name: 'EN | NBA REPLAYS' });
const at = (iso) => String(Math.floor(Date.parse(iso) / 1000));
[['NBA 2026-10-26 Memphis Grizzlies @ Utah Jazz (Memphis Feed) 1080p', '2026-10-27T08:14:00Z'],
  ['NBA 26.10.2026 Grizzlies vs Jazz Utah Feed 720p', '2026-10-27T08:40:00Z'],
  ['NBA Condensed 2026-10-26 Grizzlies @ Jazz', '2026-10-27T07:30:00Z'],
  ['Grizzlies 118-112 Jazz highlights', '2026-10-27T09:02:00Z'],
  ['NBA 2026-10-25 Grizzlies vs Kings full game 1080p', '2026-10-26T09:00:00Z'],
  ['Memphis Grizzlies Season Preview 720p', '2026-10-19T12:00:00Z'],
  ['Utah Jazz Media Day 1080p', '2026-09-30T12:00:00Z'],
].forEach(([name, added], k) => vod.push({ num: 641 + k, name, stream_type: 'movie', stream_id: 5900 + k, stream_icon: `${B}/img/p${k % 8}.jpg`, rating: '', added: at(added), category_id: '16', container_extension: 'mp4' }));
// The full table (get_simple_data_table) of a kept channel: 3 days back and a day ahead, with has_archive and the
// panel's own time strings (the panel's zone is Atlantic/Reykjavik, UTC). US: ESPN HD carried the Grizzlies' games.
const GAMES_ON = { 1001: [['2026-10-24T02:00:00Z', 'NBA: Memphis Grizzlies @ Golden State Warriors'], ['2026-10-26T01:00:00Z', 'NBA: Memphis Grizzlies @ Sacramento Kings'], ['2026-10-27T01:00:00Z', 'NBA: Memphis Grizzlies @ Utah Jazz']] };
const panelStr = (t) => new Date(t).toISOString().slice(0, 19).replace('T', ' ');
function table(id, nowMs) {
  const ch = live.find((x) => x.stream_id === id);
  if (!ch?.tv_archive) return { epg_listings: [] };
  const H = 3600e3, from = Math.floor(nowMs / H) * H - 3 * 24 * H - 6 * H, to = from + 4 * 24 * H + 6 * H, out = [];
  const games = (GAMES_ON[id] || []).map(([iso, title]) => [Date.parse(iso), title]);
  const sports = ['SportsCenter', 'NBA Today', 'First Take', 'Around the Horn', 'NBA Gametime', 'College Football Live'];
  const ruv = ['Kastljós', 'Weather for the Week', 'Morning Coffee', 'Landinn', 'Bargain Street', 'The One Show'];
  const desc = { Coastline: 'The cliffs of the far north-west, filmed over a year of storms.', 'Night Circuit': 'A late drive through the city, with music.', Kvöldfréttir: 'The evening news from Iceland and abroad.' };
  for (let t = from; t < to;) {
    const g = games.find(([s]) => s >= t && s < t + H);
    let s = t, e = Math.floor(t / H) * H + H, title = id === 1006 ? ruv[new Date(t).getUTCHours() % ruv.length] : sports[new Date(t).getUTCHours() % sports.length];
    if (id === 1006) title = { 19: 'Kvöldfréttir', 20: 'Coastline', 21: 'Night Circuit' }[new Date(t).getUTCHours()] || title;
    if (g && g[0] > t) { e = g[0]; title = 'NBA Gametime'; }
    else if (g) { e = g[0] + 2.5 * H; title = g[1]; }
    out.push({ title: Buffer.from(title).toString('base64'), description: Buffer.from(g && s === g[0] ? 'Live coverage of the game.' : desc[title] || 'Description').toString('base64'),
      start: panelStr(s), end: panelStr(e), start_timestamp: String(s / 1000), stop_timestamp: String(e / 1000), now_playing: s <= nowMs && e > nowMs ? 1 : 0, has_archive: s >= nowMs - 3 * 24 * H && s <= nowMs ? 1 : 0 });
    t = e;
  }
  return { epg_listings: out };
}
const serCats = ['Drama', 'Crime', 'Comedy', 'Reality'].map((n, i) => ({ category_id: String(30 + i), category_name: n }));
const series = Array.from({ length: 60 }, (_, i) => ({
  num: i + 1, name: ['Trapped', 'The Office', 'Katla', 'Succession', 'The Bear', 'Severance'][i % 6] + (i >= 6 ? ` ${Math.floor(i / 6) + 1}` : ''), series_id: 9000 + i,
  cover: i % 7 === 6 ? '' : `${B}/img/p${(i + 3) % 8}.jpg`, plot: 'A plot.', rating: '8.1', releaseDate: i === 4 ? '2022-06-23' : `${2010 + (i % 14)}-01-01`, last_modified: String(1700000000 + i), category_id: String(30 + (i % 4)),
}));

// (nowMs: a test's own clock, from the x-mock-now header, so the guide matches the page's fake time)
function api(q, nowMs = Date.now()) {
  if (q.get('username') !== 'demo' || q.get('password') !== 'demo') return { user_info: { auth: 0 } };
  const now = Math.floor(nowMs / 1000);
  switch (q.get('action')) {
    case null: return { user_info: { username: 'demo', password: 'demo', auth: 1, status: 'Active', exp_date: String(now + 86400 * 143), is_trial: '0', active_cons: '0', max_connections: '2', created_at: '1690000000' }, server_info: { url: '127.0.0.1', port: String(PORT), timezone: 'Atlantic/Reykjavik' } };
    case 'get_live_categories': return liveCats;
    case 'get_live_streams': return live;
    case 'get_vod_categories': return vodCats;
    case 'get_vod_streams': return vod;
    case 'get_series_categories': return serCats;
    case 'get_series': return series;
    case 'get_vod_info': return { info: { ...(q.get('vod_id') === '5000' ? { tmdb_id: '4401' } : {}), plot: 'A lighthouse keeper on a remote fjord picks up a radio signal that should not exist, and spends one long winter night trying to trace it.', genre: 'Thriller, Drama', cast: 'Ólafur Darri Ólafsson, Hera Hilmar', director: 'Baltasar Kormákur', releasedate: '2021-10-01', duration: '1h 38m', rating: '7.4', backdrop_path: [`${B}/img/bd.jpg`] }, movie_data: {} };
    case 'get_series_info': {
      const mk = (s, n) => Array.from({ length: n }, (_, e) => ({ id: String(70000 + s * 100 + e), episode_num: e + 1, title: `Episode ${e + 1}: ${['Arrival', 'The Storm', 'Whiteout', 'Thaw', 'Aftershock', 'Home'][e % 6]}`, container_extension: 'mp4', season: s, info: { plot: 'Snow closes the only road out of town just as a body turns up in the harbour.', duration: '00:52:10', movie_image: e % 3 ? `${B}/img/bd.jpg` : '' } }));
      return { info: { ...(q.get('series_id') === '9004' ? { tmdb: '136315' } : {}), name: 'x', plot: 'A small Icelandic town is cut off by a blizzard while the police chief investigates a murder.', genre: 'Crime, Drama', cast: 'Ólafur Darri Ólafsson', director: 'Baltasar Kormákur', releaseDate: '2015-12-27', rating: '8.1', backdrop_path: [`${B}/img/bd.jpg`] }, episodes: { 1: mk(1, 6), 2: mk(2, 8), 3: mk(3, 4) } };
    }
    case 'get_simple_data_table': return table(+q.get('stream_id'), nowMs);
    case 'get_short_epg': {
      const start = now - 1800 - (now % 1800);
      const t = q.get('stream_id') === '1001' ? ['NBA Basketball: LA Clippers at Los Angeles Lakers', 'NBA Basketball: LA Clippers at Los Angeles Lakers', 'NBA Basketball: LA Clippers at Los Angeles Lakers', 'SportsCenter'] : ['Evening News', 'Weather', 'Match of the Day', 'Late Show', 'Documentary: Volcanoes', 'Night Music'];
      return { epg_listings: t.map((title, k) => ({ title: b64(title), description: b64(k === 0 ? 'Top stories from Iceland and around the world, with sport and weather.' : 'Description'), start_timestamp: String(start + k * 1800), stop_timestamp: String(start + (k + 1) * 1800) })) };
    }
  }
  return [];
}

function sendFile(req, res, file, type) {
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  const size = fs.statSync(file).size;
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
  if (m) {
    const a = +m[1], b = m[2] ? +m[2] : size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1 });
    return fs.createReadStream(file, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
  fs.createReadStream(file).pipe(res);
}

// a stream sent at a set rate (bytes a second), or one that stops sending after a while (the connection stays open)
function throttled(req, res, file, rate) {
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': 'video/mp2t' });
  const data = fs.readFileSync(file);
  let at = 0;
  const t = setInterval(() => { if (at >= data.length) at = 0; res.write(data.subarray(at, at + rate / 4)); at += rate / 4; }, 250);
  req.on('close', () => clearInterval(t));
}
function stalls(req, res, file) {
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': 'video/mp2t' });
  res.write(fs.readFileSync(file).subarray(0, 100 * 1024));
  const t = setTimeout(() => res.destroy(), 120000);
  req.on('close', () => clearTimeout(t));
}

// TheIntroDB's answers (section 0, curl on 27 Oct 2026): It's Always Sunny S1 E1 to E3 as they are; Lost's recap and
// intro as they are, its credits moved into the 22:01 test clip (the real 42:48 is past its end). Named cases change one.
const SUNNY = 'tt0472954', LOST = 'tt0411008';
const seg = (s, e) => ({ start_ms: s, end_ms: e });
function introAnswer(kase, imdb, season, episode) {
  const k = `${imdb}:${season}:${episode}`;
  const base = { tvdb_id: imdb === SUNNY ? 75805 : 73739, type: 'tv', season: +season, episode: +episode, intro: [], recap: [], credits: [], preview: [] };
  const A = {
    [`${SUNNY}:1:1`]: { intro: [seg(104000, 131646)], credits: [seg(1288000, null)] },
    [`${SUNNY}:1:2`]: { intro: [seg(78900, 105900)], credits: [seg(1250000, null)] },
    [`${SUNNY}:1:3`]: { recap: [seg(0, 0)], credits: [seg(1299000, null)] },
    [`${LOST}:1:6`]: { credits: [seg(1290000, null)] },
    [`${LOST}:2:1`]: { recap: [seg(2000, 28000)], intro: [seg(239000, 250500)], credits: [seg(1288000, null)] },
  };
  let a = A[k];
  if (kase === 'SK-18' && k === `${SUNNY}:1:1`) a = { intro: [seg(350700, 398800)], credits: [seg(351200, 399700)] };   // Stranger Things' wrong label
  if ((kase === 'SK-26' || kase === 'SK-28') && k === `${SUNNY}:1:2`) a = { recap: [seg(20000, 76900)], intro: [seg(78900, 105900)], credits: [seg(1250000, null)] };   // a recap 2 s before the intro
  if (kase === 'SK-32' && k === `${SUNNY}:1:3`) a = { intro: [seg(90000, 118000)], credits: [seg(1299000, null)] };
  return a ? { ...base, ...a } : null;
}

const log = [];
const reports = [];
let m0;
http.createServer((req, res) => {
  const u = new URL(req.url, B);
  log.push(`${req.method} ${u.pathname} ua=${req.headers['user-agent']} origin=${req.headers.origin || '-'}`);
  if (u.pathname === '/_log') { res.end(log.slice(-60).join('\n')); return; }
  if (u.pathname === '/_report' && req.method === 'POST') { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { reports.push(JSON.parse(b)); } catch {} res.writeHead(200, { 'Access-Control-Allow-Origin': '*' }); res.end('ok'); }); return; }
  if (u.pathname === '/_reports') { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(reports)); return; }
  // a speed test target (android.json's speedUrl can point here in tests): zeros, as fast as they go
  if (u.pathname === '/_speed') {
    const total = Math.min(+u.searchParams.get('bytes') || 25e6, 50e6), chunk = Buffer.alloc(64 * 1024);
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': total });
    let sent = 0;
    const more = () => { while (sent < total) { const n = Math.min(chunk.length, total - sent); sent += n; if (!res.write(n === chunk.length ? chunk : chunk.subarray(0, n))) return res.once('drain', more); } res.end(); };
    req.on('close', () => { sent = total; });
    return more();
  }
  // The subtitles design (design/ui-v1/subtitles/PORT-NATIVE.md 4), for the emulator test: a fake OpenSubtitles add-on
  // (the app points tuner.subsBase here) with an Icelandic and an English file for tt9000101, timed for the fake film's
  // 60 s; the film with no partial reads (200 to everything) and refused (458); and how often a path was asked for
  // (/_hits?prefix=/movie/: Options > Quality must open no connection).
  if (u.pathname === '/_hits') { const pre = u.searchParams.get('prefix') || '/'; res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); return res.end(JSON.stringify({ n: log.filter((l) => l.split(' ')[1]?.startsWith(pre)).length - (pre === '/' ? 1 : 0) })); }
  // The add-ons' emulator steps (design/ui-v1/addons/PORT-NATIVE.md 7): the requests for a path, with their User-Agent
  // (an add-on copy's proxy headers must reach the add-on's server)
  if (u.pathname === '/_seen') { const pre = u.searchParams.get('prefix') || '/'; res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); return res.end(JSON.stringify(log.filter((l) => l.split(' ')[1]?.startsWith(pre)).slice(-40))); }
  if ((m0 = /^\/subs-addon\/subtitles\/(movie|series)\/(tt\d+)(?:[:\d]*)(?:\/[^/]*)?\.json$/.exec(u.pathname))) {
    const host = `http://${req.headers.host || `127.0.0.1:${PORT}`}`;   // (the emulator reaches this machine as 10.0.2.2)
    const rows = m0[2] === 'tt9000101' ? [
      { id: '9000101-is', url: `${host}/subs-addon/file/is.srt`, lang: 'ice', subtitleFileName: 'The.Long.Night.2000.isl.srt', movieReleaseName: 'The.Long.Night.2000.1080p.WEB', fpsMilli: 25000 },
      { id: '9000101-en', url: `${host}/subs-addon/file/en.srt`, lang: 'eng', subtitleFileName: 'The.Long.Night.2000.eng.srt', movieReleaseName: 'The.Long.Night.2000.720p.HDTV', fpsMilli: 25000 },
    ] : [];
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=60' });
    return res.end(JSON.stringify({ subtitles: rows, cacheMaxAge: 60 }));
  }
  if ((m0 = /^\/subs-addon\/file\/(is|en)\.srt$/.exec(u.pathname))) {
    const IS = ['Ég veit það ekki.', 'Hvað er að þér?', 'Það er ekki hægt núna.', 'Við erum hér, og hann er að koma.', 'Ég held við höfum gert það.', 'Hvað með það?', 'Nei, ekki núna.', 'Þú veist hvað ég meina.'];
    const EN = ['I don\'t know.', 'What is wrong with you?', 'It can\'t be done now.', 'We are here, and he is on his way.', 'I think we did it.', 'What about it?', 'No, not now.', 'You know what I mean.'];
    const w = m0[1] === 'is' ? IS : EN, two = (n) => String(n).padStart(2, '0');
    const t = (ms) => `00:${two(Math.floor(ms / 60000))}:${two(Math.floor(ms / 1000) % 60)},${String(ms % 1000).padStart(3, '0')}`;
    let body = '';
    for (let k = 0; k < 19; k++) { const a0 = 1000 + k * 3000; body += `${k + 1}\r\n${t(a0)} --> ${t(a0 + 2400)}\r\n${k % 4 === 3 ? '<i>' + w[k % w.length] + '</i>' : w[k % w.length]}\r\n\r\n`; }
    res.writeHead(200, { 'Content-Type': 'application/x-subrip; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    return res.end(body);
  }
  // the film's size and OpenSubtitles fingerprint, worked out here (CI's ffmpeg makes its own bytes), for the emulator test
  if (u.pathname === '/_film') {
    const f = path.join(MEDIA, 'movie.mp4');
    const out = { size: 0, hash: '' };
    if (fs.existsSync(f)) {
      const b = fs.readFileSync(f);
      let h = BigInt(b.length);
      if (b.length >= 65536) for (const at of [0, b.length - 65536]) for (let i = 0; i < 65536; i += 8) h = (h + b.readBigUInt64LE(at + i)) & 0xffffffffffffffffn;
      Object.assign(out, { size: b.length, hash: b.length >= 65536 ? h.toString(16).padStart(16, '0') : '' });
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify(out));
  }
  if (/^\/movie-norange\/demo\/demo\/\d+\.mp4$/.test(u.pathname)) { const f = path.join(MEDIA, 'movie.mp4'); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': fs.statSync(f).size }); return fs.createReadStream(f).pipe(res); }
  if (/^\/movie-refuse\/demo\/demo\/\d+\.mp4$/.test(u.pathname)) { res.writeHead(458, { 'Content-Type': 'text/plain' }); return res.end('Too many connections'); }
  if (addons(req, res, u)) return;
  // A fake TheIntroDB (design/ui-v1/skip/SPEC.md 14): the app's tuner.introBase points at /introdb/v4, or at
  // /introdb/case/<SK-n>/v4 for a check's own answers. How often it was asked: /_hits?prefix=/introdb/
  if ((m0 = /^\/introdb\/(?:case\/([\w-]+)\/)?v4\/media$/.exec(u.pathname))) {
    const a = introAnswer(m0[1] || '', u.searchParams.get('imdb_id'), u.searchParams.get('season'), u.searchParams.get('episode'));
    res.writeHead(a ? 200 : 404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify(a || { error: 'no_submissions' }));
  }
  if (u.pathname === '/player_api.php') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(api(u.searchParams, +req.headers['x-mock-now'] || Date.now()))); }
  if (u.pathname === '/espn/scoreboard') return sendFile(req, res, path.join(ESPN, `scoreboard${u.searchParams.get('dates') ? '-' + u.searchParams.get('dates') : ''}.json`), 'application/json');
  if (u.pathname === '/espn/summary') {
    // the plays as if happening now (the newest 75 s ago), so Sync score has clocks to match
    const f = path.join(ESPN, `summary-${u.searchParams.get('event')}.json`);
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    const last = Math.max(...(d.plays || []).map((p) => Date.parse(p.wallclock) || 0));
    if (last > 0) { const shift = Date.now() - 75000 - last; for (const p of d.plays) if (p.wallclock) p.wallclock = new Date(Date.parse(p.wallclock) + shift).toISOString(); }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify(d));
  }
  // The team and league pages (real ESPN answers from Oct 2026, trimmed; one team's set, served for any team)
  const tm = u.pathname.match(/^\/espn\/teams\/\d+\/(schedule|roster|athletes\/statistics)$/);
  if (tm) return sendFile(req, res, path.join(ESPN, `${{ schedule: 'schedule', roster: 'roster', 'athletes/statistics': 'athletes' }[tm[1]]}-29.json`), 'application/json');
  if (u.pathname.startsWith('/espncontent/')) return sendFile(req, res, path.join(ESPN, 'story.json'), 'application/json');
  if (u.pathname === '/espn/news') return sendFile(req, res, path.join(ESPN, u.searchParams.get('team') ? 'news-29.json' : 'news.json'), 'application/json');
  if (u.pathname === '/espnweb/v2/sports/basketball/nba/standings') return sendFile(req, res, path.join(ESPN, 'standings.json'), 'application/json');
  if (u.pathname === '/espnweb/common/v3/sports/basketball/nba/statistics/byathlete') return sendFile(req, res, path.join(ESPN, 'byathlete.json'), 'application/json');
  if (u.pathname === '/espnweb/common/v3/sports/basketball/nba/statistics/byteam') return sendFile(req, res, path.join(ESPN, 'byteam.json'), 'application/json');
  if (u.pathname.startsWith('/img/')) return sendFile(req, res, path.join(MEDIA, 'img', path.basename(u.pathname)), u.pathname.endsWith('png') ? 'image/png' : 'image/jpeg');
  let m;
  if ((m = /^\/live\/demo\/demo\/(\d+)\.m3u8$/.exec(u.pathname))) {
    const id = +m[1];
    if (id % 5 === 2) { res.writeHead(404); return res.end(); } // HLS missing -> falls back to TS
    if (id === 1003) { res.writeHead(404); return res.end(); } // fully dead channel (both formats)
    if (id === 1005 || id === 1013) { res.writeHead(404); return res.end(); } // HEVC channels only offer TS
    return sendFile(req, res, path.join(MEDIA, 'hls/index.m3u8'), 'application/vnd.apple.mpegurl');
  }
  if ((m = /^\/live\/demo\/demo\/(seg\d+\.ts)$/.exec(u.pathname))) return sendFile(req, res, path.join(MEDIA, 'hls', m[1]), 'video/mp2t');
  if ((m = /^\/live\/demo\/demo\/(\d+)\.ts$/.exec(u.pathname))) {
    if (+m[1] === 1003) { res.writeHead(404); return res.end(); }
    // the playback diagnosis' test channels (the last four, Channel 317 to 320; nothing else uses them)
    if (+m[1] === 1316) return throttled(req, res, path.join(MEDIA, 'live.ts'), 8 * 1024);   // 0.4 of real time (the clip is 20 KB a second): stalls
    if (+m[1] === 1317) return stalls(req, res, path.join(MEDIA, 'live.ts'));                 // 5 s of picture, then nothing at all
    if (+m[1] === 1318) { res.writeHead(403, { 'Content-Type': 'text/plain' }); return res.end('Maximum connections reached for this account'); }
    if (+m[1] === 1319) { res.writeHead(503); return res.end(); }
    if (+m[1] === 1005 || +m[1] === 1013) return sendFile(req, res, path.join(MEDIA, 'uhd.ts'), 'video/mp2t'); // 4K HEVC
    return sendFile(req, res, path.join(MEDIA, 'live.ts'), 'video/mp2t');
  }
  // catch-up: /timeshift/demo/demo/<minutes>/<YYYY-MM-DD:HH-MM>/<id>.ts (the archive plays the test clip)
  if (/^\/timeshift\/demo\/demo\/\d+\/\d{4}-\d\d-\d\d:\d\d-\d\d\/\d+\.ts$/.test(u.pathname)) return sendFile(req, res, path.join(MEDIA, 'live.ts'), 'video/mp2t');
  // (the .m3u8 timeshift link replays come first with: the test clip's playlist)
  if (/^\/timeshift\/demo\/demo\/\d+\/\d{4}-\d\d-\d\d:\d\d-\d\d\/\d+\.m3u8$/.test(u.pathname)) return sendFile(req, res, path.join(MEDIA, 'hls/index.m3u8'), 'application/vnd.apple.mpegurl');
  if ((m = /^\/timeshift\/demo\/demo\/\d+\/\d{4}-\d\d-\d\d:\d\d-\d\d\/(seg\d+\.ts)$/.exec(u.pathname))) return sendFile(req, res, path.join(MEDIA, 'hls', m[1]), 'video/mp2t');
  // episodes play the 22:01 clip (Skip intro's real times fit it); films the 60 s one
  if (/^\/series\/demo\/demo\/\d+\.mp4$/.test(u.pathname) && fs.existsSync(path.join(MEDIA, 'episode.mp4'))) return sendFile(req, res, path.join(MEDIA, 'episode.mp4'), 'video/mp4');
  if (/^\/(movie|series)\/demo\/demo\/\d+\.mp4$/.test(u.pathname)) return sendFile(req, res, path.join(MEDIA, 'movie.mp4'), 'video/mp4');
  res.writeHead(404); res.end();
}).listen(PORT, () => console.log('mock xtream on ' + B));
