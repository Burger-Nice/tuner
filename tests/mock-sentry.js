// A fake Sentry ingest for the error-report leak tests (design/ui-v1/error-reports/SPEC.md §3). It keeps every envelope's
// bytes (gunzipped), answers like Sentry (200 + CORS, so the WebView's fetch resolves), and serves what it got:
//   POST /api/<project>/envelope/   an envelope from an app (the DSN http://k@<host>:8791/1)
//   GET  /_got                      every envelope so far, as JSON [{ at, bytes }]
//   GET  /_reset                    forget them
// Run: node tests/mock-sentry.js [port]   (tests/tv/serve.sh starts it on 8791)
const http = require('http');
const zlib = require('zlib');

const port = +(process.argv[2] || process.env.MOCK_SENTRY_PORT || 8791);
let got = [];
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
  if (req.url.startsWith('/_got')) { res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }); res.end(JSON.stringify(got)); return; }
  if (req.url.startsWith('/_reset')) { got = []; res.writeHead(200, cors); res.end('ok'); return; }
  const parts = [];
  req.on('data', (c) => parts.push(c));
  req.on('end', () => {
    let body = Buffer.concat(parts);
    const enc = String(req.headers['content-encoding'] || '');
    try {
      if (/gzip/.test(enc) || (body[0] === 0x1f && body[1] === 0x8b)) body = zlib.gunzipSync(body);
      else if (/deflate/.test(enc)) body = zlib.inflateSync(body);
      else if (/br/.test(enc)) body = zlib.brotliDecompressSync(body);
    } catch { /* keep the raw bytes: the test greps them anyway */ }
    // the URL and the headers count too (a query string or a header could carry something)
    got.push({ at: Date.now(), url: req.url, headers: req.headers, bytes: body.toString('utf8') });
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    res.end('{}');
  });
}).listen(port, '0.0.0.0', () => console.log(`fake Sentry ingest :${port}`));
