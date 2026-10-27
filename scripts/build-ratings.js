// Builds ratings.json from IMDb's free datasets (https://developer.imdb.com/non-commercial-datasets/,
// for personal and non-commercial use): rating, vote count, year and genres for every movie and series with
// enough votes, keyed the same way the app keys provider titles (app/titles.js).
// Usage: node scripts/build-ratings.js <out file> [min votes]
const https = require('https');
const http = require('http');
const zlib = require('zlib');
const readline = require('readline');
const fs = require('fs');
const { norm } = require('../app/titles.js');

const [, , out = 'ratings.json', minArg] = process.argv;
const MIN_VOTES = +minArg || 1000;
const BASE = process.env.IMDB_BASE || 'https://datasets.imdbws.com/';
const KINDS = { movie: 'm', tvMovie: 'm', tvSeries: 's', tvMiniSeries: 's' };

function lines(file, onLine) {
  return new Promise((resolve, reject) => {
    (BASE.startsWith('http:') ? http : https).get(BASE + file, (res) => {
      if (res.statusCode !== 200) { reject(new Error(`${file}: HTTP ${res.statusCode}`)); res.resume(); return; }
      const rl = readline.createInterface({ input: res.pipe(zlib.createGunzip()), crlfDelay: Infinity });
      let first = true;
      rl.on('line', (l) => { if (first) { first = false; return; } onLine(l.split('\t')); });
      rl.on('close', resolve);
      rl.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  const t0 = Date.now();
  const ratings = new Map();
  await lines('title.ratings.tsv.gz', ([id, avg, votes]) => { if (+votes >= MIN_VOTES) ratings.set(id, [Math.round(+avg * 10), +votes]); });
  console.log(`${ratings.size.toLocaleString()} titles with ${MIN_VOTES}+ votes (${((Date.now() - t0) / 1000).toFixed(0)}s)`);

  const genres = [];
  const genreIx = (g) => { let i = genres.indexOf(g); if (i < 0) { genres.push(g); i = genres.length - 1; } return i; };
  const rows = { m: [], s: [] };
  await lines('title.basics.tsv.gz', ([id, type, primary, original, , start, , , gs]) => {
    const kind = KINDS[type];
    const r = kind && ratings.get(id);
    if (!r) return;
    const key = norm(primary);
    if (!key) return;
    const alt = original && original !== primary ? norm(original) : '';
    const g = gs && gs !== '\\N' ? gs.split(',').map(genreIx) : [];
    // [key, year, rating x10, votes, genre indexes, original-title key ('' when the same), IMDb id as a number]
    // (tt0110357 -> 110357; the app writes it back as tt + at least 7 digits)
    rows[kind].push([key, +start || 0, r[0], r[1], g, alt && alt !== key ? alt : '', +id.slice(2)]);
  });
  for (const k of ['m', 's']) rows[k].sort((a, b) => b[3] - a[3]);
  const data = { v: 2, at: Date.now(), minVotes: MIN_VOTES, genres, movies: rows.m, series: rows.s };
  const json = JSON.stringify(data);
  // Plain JSON unless asked for .gz: the TV app's native HTTP hands responses over as text.
  fs.writeFileSync(out, out.endsWith('.gz') ? zlib.gzipSync(json, { level: 9 }) : json);
  console.log(`${rows.m.length.toLocaleString()} movies, ${rows.s.length.toLocaleString()} series, ${genres.length} genres; ` +
    `${(json.length / 1e6).toFixed(1)} MB, written ${(fs.statSync(out).size / 1e6).toFixed(1)} MB (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
})().catch((e) => { console.error(e); process.exit(1); });
