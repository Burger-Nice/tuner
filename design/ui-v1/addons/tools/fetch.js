// node tools/fetch.js   -> data.json: the real add-on answers the mocks and SPEC section 11 use (fetched once, kept).
// Cinemeta (catalogs, meta, search), OpenSubtitles v3 (subtitles), Public Domain Movies (catalog, streams), WatchHub
// (externalUrl streams), the Stremio API's default add-on collection, Cinemeta's addon_catalog lists and a link code.
// Every request is timed, so the SPEC can say how fast each add-on answered from here.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const CIN = 'https://v3-cinemeta.strem.io', OS = 'https://opensubtitles-v3.strem.io', PD = 'https://caching.stremio.net/publicdomainmovies.now.sh', WH = 'https://watchhub.strem.io';
const log = [];
async function get(url, opt) {
  const t0 = Date.now();
  const r = await fetch(url, { redirect: 'follow', ...opt });
  const ms = Date.now() - t0, type = r.headers.get('content-type') || '', cors = r.headers.get('access-control-allow-origin') || '';
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  log.push({ url: url.replace(/authKey[^&]*/, 'authKey=…'), status: r.status, ms, redirected: r.redirected ? r.url : '', type: type.split(';')[0], cors, json: !!json, bytes: text.length });
  return json;
}
const pick = (m) => ({ id: m.id, type: m.type, name: m.name, year: m.releaseInfo || m.year, imdbRating: m.imdbRating, genres: m.genres || m.genre, runtime: m.runtime, poster: !!m.poster, background: !!m.background, description: m.description });
(async () => {
  const d = {};
  d.cinemeta = await get(`${CIN}/manifest.json`);
  d.topMovies = (await get(`${CIN}/catalog/movie/top.json`)).metas.slice(0, 14).map(pick);
  d.topSeries = (await get(`${CIN}/catalog/series/top.json`)).metas.slice(0, 14).map(pick);
  d.featured = (await get(`${CIN}/catalog/movie/imdbRating.json`)).metas.slice(0, 14).map(pick);
  d.searchDune = (await get(`${CIN}/catalog/movie/top/search=dune.json`)).metas.slice(0, 10).map(pick);
  d.searchDuneSeries = (await get(`${CIN}/catalog/series/top/search=dune.json`)).metas.slice(0, 6).map(pick);
  const dune2 = (await get(`${CIN}/meta/movie/tt15239678.json`)).meta;
  d.dune2 = { ...pick(dune2), cast: dune2.cast, director: dune2.director, moviedb_id: dune2.moviedb_id, trailerStreams: dune2.trailerStreams, released: dune2.released };
  const bear = (await get(`${CIN}/meta/series/tt14452776.json`)).meta;
  d.bear = { ...pick(bear), status: bear.status, seasons: [...new Set(bear.videos.map((v) => v.season))], s3: bear.videos.filter((v) => v.season === 3).sort((a, b) => a.episode - b.episode).map((v) => ({ id: v.id, ep: v.episode, name: v.name || v.title, overview: v.overview, released: v.released, thumb: !!v.thumbnail })) };
  d.os = await get(`${OS}/manifest.json`);
  const subs = (await get(`${OS}/subtitles/movie/tt15239678.json`)).subtitles;
  d.osDune2 = { count: subs.length, langs: Object.entries(subs.reduce((a, s) => ((a[s.lang] = (a[s.lang] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]), eng: subs.filter((s) => s.lang === 'eng').slice(0, 6).map((s) => ({ id: s.id, file: s.subtitleFileName, release: s.movieReleaseName, fps: s.fpsMilli, url: !!s.url })) };
  d.pd = await get(`${PD}/manifest.json`);
  d.pdCatalog = (await get(`${PD}/catalog/movie/publicdomainmovies.json`)).metas.slice(0, 14).map(pick);
  d.pdStream = await get(`${PD}/stream/movie/tt0063350.json`);
  d.wh = await get(`${WH}/manifest.json`);
  const whs = await get(`${WH}/stream/movie/tt15239678.json`);
  d.whDune2 = (whs?.streams || []).map((s) => ({ name: s.name, title: s.title, externalUrl: !!s.externalUrl, androidTvUrl: s.androidTvUrl ? s.androidTvUrl.slice(0, 60) + '…' : '' }));
  d.collectionDefault = (await get('https://api.strem.io/api/addonCollectionGet', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'AddonCollectionGet', update: true }) })).result.addons.map((a) => ({ id: a.manifest.id, name: a.manifest.name, transportUrl: a.transportUrl, flags: a.flags, resources: a.manifest.resources.map((r) => (typeof r === 'string' ? r : r.name)), behaviorHints: a.manifest.behaviorHints || null, logo: !!a.manifest.logo }));
  d.loginNoUser = await get('https://api.strem.io/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'Login', email: 'nobody-airglow-check@example.com', password: 'x' }) });
  d.collectionBadKey = await get('https://api.strem.io/api/addonCollectionGet', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'AddonCollectionGet', authKey: 'not-a-key', update: true }) });
  const ln = await get('https://link.stremio.com/api/v2/create?type=Create');
  d.linkCreate = { keys: Object.keys(ln.result || {}), codeLength: ln.result?.code?.length, link: ln.result?.link?.replace(/[A-Z0-9]{4}$/, 'XXXX'), qrcode: !!ln.result?.qrcode };
  d.linkReadPending = await get(`https://link.stremio.com/api/v2/read?type=Read&code=${ln.result.code}`);
  const off = await get(`${CIN}/addon_catalog/all/official.json`), com = await get(`${CIN}/addon_catalog/all/community.json`);
  const sum = (a) => ({ id: a.manifest.id, name: a.manifest.name, transportUrl: a.transportUrl, resources: (a.manifest.resources || []).map((r) => (typeof r === 'string' ? r : r.name)), types: a.manifest.types, configurable: !!a.manifest.behaviorHints?.configurable, configurationRequired: !!a.manifest.behaviorHints?.configurationRequired, p2p: !!a.manifest.behaviorHints?.p2p, description: (a.manifest.description || '').slice(0, 140) });
  d.addonCatalogOfficial = off.addons.map(sum);
  d.addonCatalogCommunity = { count: com.addons.length, configurationRequired: com.addons.filter((a) => a.manifest.behaviorHints?.configurationRequired).length, subtitles: com.addons.filter((a) => sum(a).resources.includes('subtitles')).length, stream: com.addons.filter((a) => sum(a).resources.includes('stream')).length, catalog: com.addons.filter((a) => sum(a).resources.includes('catalog')).length, first: com.addons.slice(0, 12).map(sum) };
  d.archivio = await get('https://archivio.elfhosted.com/manifest.json');
  d.fetchedAt = new Date().toISOString();
  d.log = log;
  fs.writeFileSync(path.join(root, 'data.json'), JSON.stringify(d, null, 1));
  for (const l of log) console.log(String(l.status).padEnd(4), String(l.ms).padStart(5) + ' ms', l.json ? 'json' : 'NOT JSON', (l.cors || '-').padEnd(2), l.url.slice(0, 96), l.redirected ? '-> ' + l.redirected.slice(0, 60) : '');
})().catch((e) => { console.error(e); process.exit(1); });
