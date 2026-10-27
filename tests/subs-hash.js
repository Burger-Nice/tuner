// node tests/subs-hash.js -> the file fingerprint (OpenSubtitles' moviehash) and the range-read rules
// (design/ui-v1/subtitles/SPEC.md 5.1, 5.2). The real test vector is OpenSubtitles' own breakdance.avi: its two 64 KiB
// blocks are in tests/fixtures/subs, read with these same range reads on 27 Oct 2026 (12,909,756 bytes ->
// 8e245d9679d31e12, as OpenSubtitles publishes). The rules run against a local server with and without partial reads.
const http = require('http');
const { app, raw, runner } = require('./fixtures/subs/lib.js');
const { t, done } = runner('subs-hash');

(async () => {
  const H = await app('subs/hash.js');
  const blocks = raw('breakdance-blocks.bin.gz');
  const head = new Uint8Array(blocks.subarray(0, 65536)), tail = new Uint8Array(blocks.subarray(65536));
  t('breakdance.avi: 8e245d9679d31e12 (OpenSubtitles\' published value)', H.moviehash(12909756, head, tail) === '8e245d9679d31e12');
  // an independent sum with 32-bit halves and carries, on made-up blocks
  const sum32 = (size, a, b) => {
    let lo = size % 2 ** 32, hi = Math.floor(size / 2 ** 32);
    for (const x of [a, b]) { const dv = new DataView(x.buffer, x.byteOffset, 65536); for (let i = 0; i < 65536; i += 8) { lo += dv.getUint32(i, true); hi += dv.getUint32(i + 4, true) + Math.floor(lo / 2 ** 32); lo %= 2 ** 32; hi %= 2 ** 32; } }
    return hi.toString(16).padStart(8, '0') + lo.toString(16).padStart(8, '0');
  };
  const rnd = (seed) => { const b = new Uint8Array(65536); let x = seed; for (let i = 0; i < b.length; i++) { x = (x * 1103515245 + 12345) >>> 0; b[i] = x >>> 24; } return b; };
  const a = rnd(1), b = rnd(2), ff = new Uint8Array(65536).fill(255);
  t('matches an independent 32-bit sum (random blocks)', H.moviehash(1180090590, a, b) === sum32(1180090590, a, b));
  t('wraps at 2^64 (all-0xff blocks)', H.moviehash(5e9, ff, ff) === sum32(5e9, ff, ff), H.moviehash(5e9, ff, ff));
  t('16 hex digits, zero-padded', H.moviehash(65536, new Uint8Array(65536), new Uint8Array(65536)) === '0000000000010000');
  t('a file under 64 KiB has none', H.moviehash(1000, new Uint8Array(1000), new Uint8Array(1000)) === '');
  t('Content-Range', JSON.stringify(H.contentRange('bytes 0-65535/1180090590')) === '{"from":0,"to":65535,"total":1180090590}' && H.contentRange('bytes */100') === null && H.contentRange('') === null);

  // ---- a server: 'ok' (honours Range), 'none' (200 to everything), 'liar' (206 for the head, 200 for the tail),
  // 'wrongtail' (206 but another range), 'slow', 'refuse' ----
  const SIZE = 3 * 65536 + 1234;
  const file = new Uint8Array(SIZE); file.set(head, 0); file.set(tail, SIZE - 65536);
  let reads = [];
  const srv = http.createServer((req, res) => {
    const mode = req.url.slice(1), m = /bytes=(\d+)-(\d+)/.exec(req.headers.range || '');
    reads.push({ mode, range: req.headers.range || '', ua: req.headers['user-agent'] || '' });
    if (mode === 'slow') return setTimeout(() => res.end(), 2000);
    if (mode === 'refuse') { res.writeHead(403); return res.end(); }
    const whole = () => { res.writeHead(200, { 'Content-Length': SIZE, ETag: '"e1"' }); res.end(Buffer.from(file)); };
    if (!m || mode === 'none' || (mode === 'liar' && +m[1] > 0)) return whole();
    let [x, y] = [+m[1], +m[2]];
    if (mode === 'wrongtail' && x > 0) { x -= 10; y -= 10; }
    res.writeHead(206, { 'Content-Range': `bytes ${x}-${y}/${SIZE}`, 'Content-Length': y - x + 1, ETag: '"e1"' });
    res.end(Buffer.from(file.subarray(x, y + 1)));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  let r = await H.readFingerprint(base + 'ok', { headers: { 'User-Agent': 'TiviMate/4.7.0' } });
  t('a server with partial reads: two 64 KiB reads, the size from Content-Range, the fingerprint', r.status === 'ok' && r.size === SIZE && r.hash === H.moviehash(SIZE, head, tail) && r.etag === '"e1"' && reads.length === 2 && reads[0].range === 'bytes=0-65535' && reads[1].range === `bytes=${SIZE - 65536}-${SIZE - 1}`, `${r.status} ${r.why}`);
  t('his user agent goes with the reads', reads.every((x) => x.ua === 'TiviMate/4.7.0'));
  reads = [];
  r = await H.readFingerprint(base + 'none');
  t('no partial reads (200): head only, the size from Content-Length, no fingerprint, no tail read', r.status === 'head-only' && r.size === SIZE && !r.hash && r.head.length === 65536 && reads.length === 1);
  reads = [];
  r = await H.readFingerprint(base + 'liar');
  t('a tail read answered 200: stops, "couldnt" (it would hand over the first 64 KiB as the last)', r.status === 'couldnt' && !r.hash && reads.length === 2, r.why);
  r = await H.readFingerprint(base + 'wrongtail');
  t('a tail read with another Content-Range: "couldnt"', r.status === 'couldnt' && !r.hash, r.why);
  r = await H.readFingerprint(base + 'refuse');
  t('a refused head: "couldnt"', r.status === 'couldnt' && /403/.test(r.why));
  const t0 = Date.now();
  r = await H.readFingerprint(base + 'slow', { timeout: 300 });
  t('the wall-clock timeout', r.status === 'couldnt' && r.why === 'timeout' && Date.now() - t0 < 1500, `${Date.now() - t0} ms`);
  const ctl = new AbortController();
  setTimeout(() => ctl.abort(), 100);
  r = await H.readFingerprint(base + 'slow', { signal: ctl.signal });
  t('Play cancels it', r.status === 'couldnt' && r.why === 'cancelled');
  srv.close();
  done();
})();
