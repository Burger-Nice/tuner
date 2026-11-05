// The Worker on a local port, over node:sqlite (tests/mock-accounts.js starts it for the TV, phone and desktop tests;
// `npm run dev` here). Serves pages/ as the assets. Never used in production.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/router.js';
import { makeD1, makeLimiter } from './d1.js';

const PAGES = join(dirname(fileURLToPath(import.meta.url)), '..', 'pages');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
export function localEnv(over = {}) {
  return {
    DB: makeD1(over.file || ':memory:'), PEPPER: 'test-pepper-not-secret', TOKEN_SECRET: 'test-token-secret-not-secret', OWNER_CODE: 'copper kettle quiet harbour',
    OPEN_SIGNUP: 'false', INVITES_PER_MONTH: '10', TEST_MODE: 'true',
    RL_LOGIN: makeLimiter(10), RL_SYNC: makeLimiter(600), RL_POLL: makeLimiter(20),
    ASSETS: { async fetch(req) {
      const p = new URL(req.url).pathname, f = normalize(join(PAGES, p === '/' ? 'index.html' : p.endsWith('/') ? p + 'index.html' : extname(p) ? p : p + '.html'));
      if (!f.startsWith(PAGES)) return new Response('no', { status: 404 });
      try { return new Response(await readFile(f), { headers: { 'content-type': TYPES[extname(f)] || 'application/octet-stream' } }); } catch { return new Response('Not found', { status: 404 }); }
    } },
    ...over,
  };
}
export function serve(port, env = localEnv()) {
  const srv = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : null;
    const r = await handle(new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: req.headers, body: req.method === 'GET' || req.method === 'HEAD' ? null : body }), env);
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok(srv)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = +process.env.PORT || 8790;
  serve(port, localEnv({ file: process.env.ACCT_DB || ':memory:' })).then(() => console.log(`airglow accounts (local) on http://127.0.0.1:${port}`));
}
