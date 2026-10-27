// Fake Stremio add-ons and a fake Stremio API for the tests (design/ui-v1/addons/SPEC.md 12.11), served by
// tests/mock-provider.js on the same port. Everything here is made up, shaped like the real answers in
// design/ui-v1/addons/data.json. The app points at them with localStorage keys (tests/tv/addons-common.js):
//   tuner.cinemetaBase -> <host>/addon/cinemeta, tuner.stremioApi -> <host>/stremio-api, tuner.stremioLink ->
//   <host>/stremio-link, tuner.ratingsUrl -> <host>/ratings.json.
// Add-ons: Cinemeta (catalogs, metas, search, Stremio's add-on list), Northlight (a stream add-on set up with a debrid
// account: direct links, a 30 s placeholder, a torrent copy that must not show, proxy headers), Kestrel (slow: 6 s, and
// never for Northern Lights), Public Domain Movies (torrents only), WatchHub (other apps), AfterCredits (info only),
// OpenSubtitles v3 (subtitles), Archivio (its manifest is a web page now).
// Test helpers: POST /_stremio/approve (the phone signed in), GET /_stremio/state, POST /_stremio/reset,
// /_addons/fail?what=catalog|page2 (Cinemeta's catalogs stop answering) and /_addons/ok.
const fs = require('fs');
const path = require('path');

const MEDIA = process.env.MEDIA_DIR || path.join(__dirname, 'media');
const J = (res, obj, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }); res.end(JSON.stringify(obj)); };
const P = (id, c) => `/img/p${c % 8}.jpg`;
const st = { approved: false, reads: 0, logouts: 0, created: 0, fail: '', streamAsks: [], code: 'R2T3' };

// ---------- the titles (IMDb ids are made up, tt9 + 6 digits) ----------
// The provider (tests/mock-provider.js) has "The Long Night (2000)" (TMDB 4401 agrees: Sure), "Northern Lights (2001)"
// (ratings file only: Likely), "Glacier (2003)" (two films of that name and year: Unsure), and the series The Bear.
const MOVIES = [
  { id: 'tt9000001', name: 'The Long Night', year: 2000, runtime: '2 min', moviedb_id: 4401, genre: ['Thriller', 'Drama'], country: 'United States, Iceland', director: ['Baltasar Kormákur'], cast: ['Ólafur Darri Ólafsson', 'Hera Hilmar'] },
  { id: 'tt9000002', name: 'Northern Lights', year: 2001, runtime: '2 min', moviedb_id: 4402, genre: ['Drama'], country: 'United States', director: ['Ava Lind'] },
  { id: 'tt9000003', name: 'Glacier', year: 2003, runtime: '95 min', genre: ['Documentary'], country: 'Norway', director: ['Kari Vik'] },
  { id: 'tt9000004', name: 'Glacier', year: 2003, runtime: '118 min', genre: ['Thriller'], country: 'United States', director: ['Sam Okafor'] },
  { id: 'tt9000010', name: 'Tenzing', year: 2026, runtime: '2 min', genre: ['Adventure', 'Biography', 'Drama'], country: 'United Kingdom', director: ['Jennifer Peedom'], cast: ['Tenzin Norgay', 'Kate Winslet'] },
  { id: 'tt0063350', name: 'Night of the Living Dead', year: 1968, runtime: '96 min', genre: ['Horror', 'Thriller'], country: 'United States', director: ['George A. Romero'], cast: ['Duane Jones', 'Judith O&apos;Dea'] },
  { id: 'tt9000012', name: 'Dune', year: 1984, runtime: '137 min', genre: ['Sci-Fi', 'Adventure'], country: 'United States', director: ['David Lynch'] },
  { id: 'tt9000013', name: 'Dune Prophecy', year: 2024, runtime: '60 min', genre: ['Sci-Fi'], country: 'United States', type: 'series' },
  { id: 'tt9000014', name: 'Dune: Part Three', year: 2027, runtime: '150 min', genre: ['Sci-Fi'], country: 'United States', releaseInfo: '2027' },
];
// filler for paging: Cinemeta sends 49 or 50 a page
for (let i = 0; i < 72; i++) MOVIES.push({ id: `tt91${String(i).padStart(5, '0')}`, name: ['Backrooms', 'Hope', 'Verity', 'Obsession', 'Love of Your Life', 'The Cycle', 'Buddy', 'Spider Moon'][i % 8] + (i >= 8 ? ` ${Math.floor(i / 8) + 1}` : ''), year: 2026 - (i % 4), runtime: '100 min', genre: [['Horror', 'Drama', 'Thriller', 'Comedy'][i % 4]], country: 'United States' });
const SERIES = [{ id: 'tt9000020', name: 'The Bear', year: 2022, releaseInfo: '2022–', runtime: '35 min', moviedb_id: 136315, tvdb_id: 403294, genre: ['Comedy', 'Drama'], country: 'United States', type: 'series' }];
const metaOf = (m, type, host) => ({
  id: m.id, imdb_id: m.id, type: m.type || type, name: m.name, releaseInfo: m.releaseInfo || String(m.year), year: String(m.year), runtime: m.runtime,
  description: `${m.name}: a made-up film for the tests.`, genres: m.genre, genre: m.genre, director: m.director, cast: m.cast, country: m.country,
  imdbRating: '7.1', moviedb_id: m.moviedb_id, tvdb_id: m.tvdb_id, poster: `${host}${P(m.id, m.id.charCodeAt(m.id.length - 1))}`, background: `${host}/img/bd.jpg`,
  trailerStreams: m.id === 'tt9000001' ? [{ title: 'Trailer', ytId: 'abc123' }] : [],
  ...(m.type === 'series' || type === 'series' ? { videos: bearVideos() } : {}),
});
function bearVideos() {
  const out = [];
  const add = (s, e, name, released = '2022-06-23T00:00:00.000Z') => out.push({ id: `tt9000020:${s}:${e}`, season: s, episode: e, name, title: name, released, thumbnail: '' });
  const names = ['Arrival', 'The Storm', 'Whiteout', 'Thaw', 'Aftershock', 'Home', 'Ice', 'Melt'];
  [[1, 6], [2, 8], [3, 4]].forEach(([s, n]) => { for (let e = 1; e <= n; e++) add(s, e, names[(e - 1) % 8]); });
  add(4, 1, 'Doors', '2026-06-25T00:00:00.000Z'); add(4, 2, 'Violet', '2026-06-25T00:00:00.000Z');
  add(5, 1, 'Next Year', '2027-06-01T00:00:00.000Z');   // not out yet
  add(0, 1, 'Behind the Kitchen', '2023-01-01T00:00:00.000Z');
  return out;
}

const cinemeta = (host) => ({
  id: 'com.linvo.cinemeta', version: '3.0.14', name: 'Cinemeta', description: 'The official add-on for movie and series catalogs',
  resources: ['catalog', 'meta', 'addon_catalog'], types: ['movie', 'series'], idPrefixes: ['tt'],
  catalogs: [
    { type: 'movie', id: 'top', name: 'Popular', extra: [{ name: 'genre', options: ['Action', 'Drama', 'Horror', 'Thriller', 'Comedy'] }, { name: 'search' }, { name: 'skip' }], extraSupported: ['search', 'genre', 'skip'] },
    { type: 'movie', id: 'year', name: 'New', extra: [{ name: 'genre', options: ['2026', '2025', '2024'], isRequired: true }, { name: 'skip' }], extraRequired: ['genre'], extraSupported: ['genre', 'skip'] },
    { type: 'movie', id: 'imdbRating', name: 'Featured', extra: [{ name: 'genre', options: ['Drama'] }, { name: 'skip' }] },
    { type: 'series', id: 'top', name: 'Popular', extra: [{ name: 'genre', options: ['Comedy', 'Drama'] }, { name: 'search' }, { name: 'skip' }] },
    { type: 'movie', id: 'last-videos', name: 'Last videos', extra: [{ name: 'lastVideosIds', isRequired: true }], extraRequired: ['lastVideosIds'] },
  ],
  behaviorHints: { newEpisodeNotifications: true },
  logo: `${host}/img/l0.png`,
});
const ADDONS = {
  northlight: { id: 'org.northlight.debrid', version: '2.4.1', name: 'Northlight', description: 'Your debrid service\'s copies of films and series', resources: ['stream'], types: ['movie', 'series'], idPrefixes: ['tt'], catalogs: [], behaviorHints: { configurable: true } },
  kestrel: { id: 'org.kestrel', version: '1.0.0', name: 'Kestrel', description: 'Copies of films', resources: [{ name: 'stream', types: ['movie'], idPrefixes: ['tt'] }], types: ['movie'], catalogs: [] },
  pdm: { id: 'org.publicdomainmovies', version: '1.2.0', name: 'Public Domain Movies', description: 'Films in the public domain', resources: ['catalog', 'stream'], types: ['movie'], idPrefixes: ['tt'], catalogs: [{ type: 'movie', id: 'pdm' }], behaviorHints: { p2p: true } },
  watchhub: { id: 'org.stremio.watchhub', version: '1.3.0', name: 'WatchHub', description: 'Where else to watch it', resources: ['stream'], types: ['movie', 'series'], idPrefixes: ['tt'], catalogs: [] },
  aftercredits: { id: 'org.aftercredits', version: '0.3.0', name: 'AfterCredits', description: 'Is there a scene after the credits?', resources: ['stream'], types: ['movie'], idPrefixes: ['tt'], catalogs: [] },
  opensubtitles: { id: 'org.stremio.opensubtitlesv3', version: '1.0.0', name: 'OpenSubtitles v3', description: 'Subtitles from OpenSubtitles in your language', resources: ['subtitles'], types: ['movie', 'series'], idPrefixes: ['tt'], catalogs: [] },
  setmeup: { id: 'org.setmeup', version: '1.0.0', name: 'Torrentio', description: 'Needs your debrid key', resources: ['stream'], types: ['movie', 'series'], idPrefixes: ['tt'], catalogs: [], behaviorHints: { configurable: true, configurationRequired: true } },
  jump: { id: 'org.wheresthejump', version: '1.1.0', name: 'Where\'s The Jump', description: 'Subtitles that warn you before a jump scare, in English', resources: ['subtitles'], types: ['movie'], idPrefixes: ['tt'], catalogs: [] },
  legendas: { id: 'org.legendas', version: '1.0.0', name: 'Legendas Brasil', description: 'Legendas em Português do Brasil (Portuguese)', resources: ['subtitles'], types: ['movie'], catalogs: [] },
};
const KEY = 'eyJkZWJyaWQiOiJTRUNSRVQta2V5LTEyMzQ1Njc4OTAifQ';   // Northlight's configured link holds a (fake) debrid key
const url = (host, p) => `${host}${p}`;
const transport = (host, k) => (k === 'northlight' ? url(host, `/addon/northlight/${KEY}/manifest.json`) : k === 'cinemeta' ? url(host, '/addon/cinemeta/manifest.json') : url(host, `/addon/${k}/manifest.json`));

// ---------- streams ----------
const media = (host, name) => url(host, `/addon-media/${KEY}/${name}`);
function streams(k, type, id, host) {
  const runtimeless = [];
  if (k === 'northlight') {
    if (id === 'tt9000001') return [
      { name: 'Northlight\n4K', title: 'The.Long.Night.2000.2160p.BluRay.REMUX.DV.HDR.TrueHD.Atmos\n💾 51.6 GB', url: media(host, 'remux.mkv'), behaviorHints: { filename: 'The.Long.Night.2000.2160p.BluRay.REMUX.DV.HDR.TrueHD.Atmos.mkv', videoSize: 51.6e9, bingeGroup: 'northlight|4k|remux', proxyHeaders: { request: { 'User-Agent': 'Northlight/1.0' }, response: { 'Content-Type': 'video/mp4' } } } },
      { name: 'Northlight\n4K', title: 'The.Long.Night.2000.2160p.WEB-DL.DV.HDR\n💾 2.1 GB', url: media(host, 'short.mp4'), behaviorHints: { filename: 'The.Long.Night.2000.2160p.WEB-DL.DV.HDR.mkv', videoSize: 2.1e9, bingeGroup: 'northlight|4k|web' } },
      { name: 'Northlight\n1080p', title: 'The.Long.Night.2000.1080p.BluRay\n💾 14.2 GB', url: media(host, 'bluray.mp4'), behaviorHints: { filename: 'The.Long.Night.2000.1080p.BluRay.mkv', videoSize: 14.2e9, bingeGroup: 'northlight|1080p' } },
      { name: 'Northlight [P2P]', title: 'The.Long.Night.2000.1080p.WEBRip (torrent)', infoHash: 'aabbccddeeff00112233445566778899aabbccdd', fileIdx: 0 },
      { name: 'Northlight local', url: 'http://127.0.0.1:11470/aabb/0' },
      { name: 'Northlight magnet', url: 'magnet:?xt=urn:btih:aabb' },
      { name: 'Northlight FR', title: 'The.Long.Night.2000.1080p.FRENCH.WEB-DL\n💾 3.3 GB', url: media(host, 'fr.mp4'), behaviorHints: { filename: 'The.Long.Night.2000.1080p.FRENCH.WEB-DL.mkv', videoSize: 3.3e9, countryWhitelist: ['fra'] } },
    ];
    if (id === 'tt9000002') return [{ name: 'Northlight\n4K', title: 'Northern.Lights.2001.2160p.WEB-DL.HDR\n💾 9.8 GB', url: media(host, 'nl.mp4'), behaviorHints: { filename: 'Northern.Lights.2001.2160p.WEB-DL.HDR.mkv', videoSize: 9.8e9 } }];
    if (id === 'tt9000010') return [
      { name: 'Northlight\n4K', title: 'Tenzing.2026.2160p.WEB-DL.HDR\n💾 11.2 GB', url: media(host, 'tenzing.mp4'), behaviorHints: { filename: 'Tenzing.2026.2160p.WEB-DL.HDR.mkv', videoSize: 11.2e9 } },
      { name: 'Northlight\n1080p', title: 'Tenzing.2026.1080p.WEB-DL\n💾 4.0 GB', url: media(host, 'tenzing2.mp4'), behaviorHints: { filename: 'Tenzing.2026.1080p.WEB-DL.mkv', videoSize: 4e9 } },
    ];
    if (id.startsWith('tt9000020:')) { const [, s, e] = id.split(':'); return [{ name: 'Northlight\n1080p', title: `The.Bear.S0${s}E0${e}.1080p.WEB-DL\n💾 1.6 GB`, url: media(host, `bear-${s}-${e}.mp4`), behaviorHints: { filename: `The.Bear.S0${s}E0${e}.1080p.WEB-DL.mkv`, videoSize: 1.6e9, bingeGroup: 'northlight|1080p|web' } }]; }
    return runtimeless;
  }
  if (k === 'kestrel') {
    if (id === 'tt9000001') return [{ name: 'Kestrel 720p', title: 'The Long Night 2000 720p WEB', url: media(host, 'k720.mp4'), behaviorHints: { filename: 'The.Long.Night.2000.720p.WEB.mp4' } }];
    if (id === 'tt9000010') return [{ name: 'Kestrel 4K', title: 'Tenzing 2026 2160p HDR WEB', url: media(host, 'k4k.mp4'), behaviorHints: { filename: 'Tenzing.2026.2160p.HDR.WEB.mp4', videoSize: 12e9 } }];
    return [];
  }
  if (k === 'pdm') return id === 'tt0063350' ? [{ name: 'Public Domain Movies', title: 'Night of the Living Dead (1968)', infoHash: '0011223344556677889900112233445566778899', fileIdx: 0 }] : [];
  if (k === 'watchhub') return [
    { name: 'Prime Video', title: 'Rent, Buy', externalUrl: 'https://www.primevideo.com/detail/x', androidTvUrl: 'intent://www.primevideo.com/detail/x#Intent;scheme=https;package=com.amazon.amazonvideo.livingroom;end' },
    { name: 'HBO Max', title: 'Subscription', externalUrl: 'https://play.max.com/x', androidTvUrl: 'intent://play.max.com/x#Intent;scheme=https;package=com.wbd.stream;end' },
  ];
  if (k === 'aftercredits') return [{ name: 'AfterCredits', title: 'No Stingers Found', externalUrl: 'https://aftercredits.example/x' }, { name: 'Watch Next', externalUrl: 'stremio:///detail/movie/tt9000010' }];
  return [];
}
function catalogPage(type, id, extra, host) {
  if (id === 'pdm') return MOVIES.filter((m) => m.id === 'tt0063350').map((m) => metaOf(m, 'movie', host));
  let list = type === 'series' ? [...SERIES, ...MOVIES.filter((m) => m.type === 'series')] : MOVIES.filter((m) => !m.type && m.year <= 2026);
  if (extra.search) { const q = extra.search.toLowerCase(); return [...MOVIES, ...SERIES].filter((m) => (m.type || 'movie') === type && m.name.toLowerCase().includes(q)).map((m) => metaOf(m, type, host)); }
  if (id === 'year') list = list.filter((m) => String(m.year) === String(extra.genre || '2026'));
  else if (extra.genre) list = list.filter((m) => m.genre.includes(extra.genre));
  // Tenzing first (the mocks' focused poster), then the provider's titles, then the rest
  list.sort((a, b) => (b.id === 'tt9000010') - (a.id === 'tt9000010'));
  const skip = +extra.skip || 0, size = skip ? 49 : 50;
  return list.slice(skip, skip + size).map((m) => metaOf(m, type, host));
}

const officialList = (host) => [
  { transportUrl: transport(host, 'cinemeta'), manifest: cinemeta(host) },
  { transportUrl: transport(host, 'watchhub'), manifest: ADDONS.watchhub },
  { transportUrl: transport(host, 'opensubtitles'), manifest: ADDONS.opensubtitles },
];
const communityList = (host) => [
  { transportUrl: transport(host, 'aftercredits'), manifest: ADDONS.aftercredits },
  { transportUrl: transport(host, 'pdm'), manifest: ADDONS.pdm },
  { transportUrl: transport(host, 'setmeup'), manifest: ADDONS.setmeup },
  { transportUrl: transport(host, 'jump'), manifest: ADDONS.jump },
  { transportUrl: transport(host, 'legendas'), manifest: ADDONS.legendas },
];
const collection = (host) => [
  { transportUrl: transport(host, 'cinemeta'), manifest: cinemeta(host), flags: { official: true, protected: true } },
  { transportUrl: transport(host, 'northlight'), manifest: ADDONS.northlight, flags: {} },
  { transportUrl: transport(host, 'kestrel'), manifest: ADDONS.kestrel, flags: {} },
  { transportUrl: transport(host, 'opensubtitles'), manifest: ADDONS.opensubtitles, flags: { official: true } },
  { transportUrl: transport(host, 'watchhub'), manifest: ADDONS.watchhub, flags: { official: true } },
  { transportUrl: transport(host, 'pdm'), manifest: ADDONS.pdm, flags: {} },
  { transportUrl: url(host, '/addon/opensubtitles/stremio/v1'), manifest: { ...ADDONS.opensubtitles, id: 'org.stremio.opensubtitles', name: 'OpenSubtitles' }, flags: {} },
  { transportUrl: 'http://127.0.0.1:11470/local-addon/manifest.json', manifest: { id: 'org.stremio.local', name: 'Local Files', version: '1.10.0', resources: ['catalog', 'meta', 'stream'], types: ['movie', 'series', 'other'], catalogs: [] }, flags: { official: true, protected: true } },
  { transportUrl: url(host, '/addon/youtube/manifest.json'), manifest: { id: 'org.stremio.youtube', name: 'YouTube', version: '1.0.0', resources: ['catalog', 'meta', 'stream'], types: ['channel'], catalogs: [] }, flags: {} },
];
// The ratings file v2 (scripts/build-ratings.js): [key, year, rating x10, votes, genres, alt key, tconst number]
const ratings = () => ({
  v: 2, at: Date.now(), minVotes: 1000, genres: ['Drama', 'Thriller', 'Documentary', 'Comedy'],
  movies: [['long night', 2000, 74, 52000, [0, 1], '', 9000001], ['northern lights', 2001, 66, 8100, [0], '', 9000002], ['glacier', 2003, 61, 3200, [2], '', 9000003], ['glacier', 2003, 58, 2100, [1], '', 9000004]],
  series: [['bear', 2022, 86, 210000, [3, 0], '', 9000020]],
});

const readBody = (req) => new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { r(JSON.parse(b || '{}')); } catch { r({}); } }); });
const sendMedia = (req, res, file) => {
  // a debrid link redirects to the file, as real ones do (cross-protocol redirects are on in the player)
  const f = fs.existsSync(path.join(MEDIA, file)) ? path.join(MEDIA, file) : path.join(MEDIA, 'movie.mp4');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  const size = fs.statSync(f).size, m = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
  if (m) { const a = +m[1], b = m[2] ? +m[2] : size - 1; res.writeHead(206, { 'Content-Type': 'video/mp4', 'Content-Range': `bytes ${a}-${b}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1 }); return fs.createReadStream(f, { start: a, end: b }).pipe(res); }
  res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': size, 'Accept-Ranges': 'bytes' });
  fs.createReadStream(f).pipe(res);
};

// Returns true when it answered the request.
module.exports = function addons(req, res, u) {
  const host = `http://${req.headers.host || '127.0.0.1:8899'}`;
  const p = u.pathname;
  if (req.method === 'OPTIONS' && (p.startsWith('/addon') || p.startsWith('/stremio'))) { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST' }); res.end(); return true; }
  if (p === '/ratings.json') { J(res, ratings()); return true; }
  // test helpers
  if (p === '/_stremio/approve') { st.approved = true; J(res, { ok: true }); return true; }
  if (p === '/_stremio/state') { J(res, st); return true; }
  if (p === '/_stremio/reset') { Object.assign(st, { approved: false, reads: 0, logouts: 0, created: 0, fail: '', streamAsks: [] }); J(res, { ok: true }); return true; }
  if (p === '/_addons/fail') { st.fail = u.searchParams.get('what') || 'catalog'; J(res, { ok: true }); return true; }
  if (p === '/_addons/ok') { st.fail = ''; J(res, { ok: true }); return true; }
  // ---------- Stremio's link codes and API ----------
  if (p === '/stremio-link/api/v2/create') { st.created++; st.approved = false; st.code = st.created > 1 ? 'K7QX' : 'R2T3'; J(res, { result: { success: true, code: st.code, link: `https://link.stremio.com/${st.code}`, qrcode: '' } }); return true; }
  if (p === '/stremio-link/api/v2/read') { st.reads++; J(res, st.approved && u.searchParams.get('code') === st.code ? { result: { success: true, authKey: 'AK-test-1' } } : { error: { code: 101, message: 'Invalid or expired token' } }); return true; }
  if (p.startsWith('/stremio-api/api/')) {
    readBody(req).then((b) => {
      const what = p.slice('/stremio-api/api/'.length);
      if (what === 'login') {
        if (b.email !== 'demo@example.com') return J(res, { error: { code: 2, message: 'User not found', wrongEmail: true } });
        if (b.password !== 'demo') return J(res, { error: { code: 3, message: 'Wrong password' } });
        return J(res, { result: { authKey: 'AK-test-2', user: { email: b.email } } });
      }
      if (what === 'logout') { st.logouts++; return J(res, { result: { success: true } }); }
      if (what === 'addonCollectionGet') {
        if (!/^AK-test-/.test(b.authKey || '')) return J(res, { error: { code: 1, message: 'Session does not exist' } });
        return J(res, { result: { addons: collection(host), lastModified: '2026-10-27T21:02:00Z' } });
      }
      J(res, { error: { code: 0, message: 'Unknown method' } });
    });
    return true;
  }
  // ---------- the add-ons ----------
  let m;
  if ((m = /^\/addon-media\/[^/]+\/([\w.-]+)$/.exec(p))) { sendMedia(req, res, m[1] === 'short.mp4' ? 'short.mp4' : 'movie.mp4'); return true; }
  if (p === '/addon/archivio/manifest.json') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>Archivio docs</title><p>This add-on moved.</p>'); return true; }
  if ((m = /^\/addon\/(cinemeta|northlight|kestrel|pdm|watchhub|aftercredits|opensubtitles|setmeup|legendas|jump)(?:\/(eyJ[\w-]+))?\/(.*)$/.exec(p))) {
    const [, k, , rest] = m;
    if (k === 'northlight' && !p.startsWith(`/addon/northlight/${KEY}/`)) { J(res, { err: 'not configured' }, 404); return true; }
    if (rest === 'manifest.json') { J(res, k === 'cinemeta' ? cinemeta(host) : ADDONS[k]); return true; }
    const r = /^(catalog|meta|stream|subtitles|addon_catalog)\/(\w+)\/([^/]+?)(?:\/([^/]+))?\.json$/.exec(rest);
    if (!r) { J(res, { err: 'not found' }, 404); return true; }
    const [, resource, type, idRaw, extraRaw] = r;
    const id = decodeURIComponent(idRaw);
    const extra = Object.fromEntries(String(extraRaw || '').split('&').filter(Boolean).map((kv) => kv.split('=').map(decodeURIComponent)));
    if (resource === 'addon_catalog') { J(res, { addons: id === 'official' ? officialList(host) : communityList(host) }); return true; }
    if (resource === 'catalog') {
      if (st.fail === 'catalog' && k === 'cinemeta' && !extra.search) { req.socket.destroy(); return true; }
      if (st.fail === 'page2' && k === 'cinemeta' && +extra.skip > 0) { J(res, { err: 'down' }, 503); return true; }
      J(res, { metas: catalogPage(type, id, extra, host) }); return true;
    }
    if (resource === 'meta') {
      const mm = [...MOVIES, ...SERIES].find((x) => x.id === id);
      J(res, { meta: mm ? metaOf(mm, type, host) : { id } }); return true;
    }
    if (resource === 'stream') {
      st.streamAsks.push(`${k}:${id}`);
      const out = { streams: streams(k, type, id, host), cacheMaxAge: 3600 };
      if (k === 'kestrel') { if (id === 'tt9000002') return true; setTimeout(() => J(res, out), 6000); return true; }   // never answers Northern Lights (a timeout)
      J(res, out); return true;
    }
    if (resource === 'subtitles') { J(res, { subtitles: id.startsWith('tt9000001') ? [{ id: 'os1', url: `${host}/addon-subs/1.srt`, lang: 'eng' }, { id: 'os2', url: `${host}/addon-subs/2.srt`, lang: 'ice' }] : [] }); return true; }
  }
  if (p.startsWith('/addon-subs/')) { const f = path.join(MEDIA, 'subs.srt'); res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' }); res.end(fs.existsSync(f) ? fs.readFileSync(f) : ''); return true; }
  return false;
};
module.exports.transport = transport;
module.exports.KEY = KEY;
