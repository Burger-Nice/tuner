// CI's secrets step (scripts/secrets.sh, SPEC 7.2 and review 3 S6): it fails closed and never prints a value.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, chmodSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'secrets.sh');
function fake(listOut, listCode = 0) {
  const d = mkdtempSync(join(tmpdir(), 'wr-')), log = join(d, 'log');
  const f = join(d, 'wrangler');
  writeFileSync(f, `#!/bin/bash\nif [ "$1 $2" = "secret list" ]; then printf '%s' '${listOut}'; exit ${listCode}; fi\nif [ "$1 $2" = "secret put" ]; then v=$(cat); echo "put $3 \${#v}" >> ${log}; exit 0; fi\nexit 9\n`);
  chmodSync(f, 0o755);
  return { cmd: f, log };
}
const health = (ready) => new Promise((ok) => { const s = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify({ ok: true, version: '1', ready })); }); s.listen(0, '127.0.0.1', () => ok(s)); });
// (async: the health server answers from this same process)
const run = (w, host, owner = '') => new Promise((ok) => {
  const p = spawn('bash', [SCRIPT], { env: { ...process.env, WRANGLER: w.cmd, HOST: host, AIRGLOW_OWNER_CODE: owner, NO_PROXY: '127.0.0.1', no_proxy: '127.0.0.1' } });
  let stdout = '', stderr = ''; p.stdout.on('data', (d) => (stdout += d)); p.stderr.on('data', (d) => (stderr += d));
  p.on('close', (status) => ok({ status, stdout, stderr }));
});

test('a failing secret list puts nothing', async () => {
  const s = await health(false), host = `http://127.0.0.1:${s.address().port}`;
  const w = fake('', 1);
  const r = await run(w, host, 'some phrase');
  assert.notEqual(r.status, 0); assert.ok(!existsSync(w.log));
  const w2 = fake('Error: not authenticated');
  assert.notEqual((await run(w2, host)).status, 0); assert.ok(!existsSync(w2.log));
  s.close();
});
test('first run: both secrets made, the owner code put, no value printed', async () => {
  const s = await health(false), host = `http://127.0.0.1:${s.address().port}`;
  const w = fake('[]');
  const r = await run(w, host, 'tidal lantern orchard nine');
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.deepEqual(readFileSync(w.log, 'utf8').trim().split('\n'), ['put PEPPER 44', 'put TOKEN_SECRET 44', 'put OWNER_CODE 26']);
  assert.ok(!/tidal lantern/.test(r.stdout + r.stderr));
  s.close();
});
test('health says ready but a secret is missing: refuses; existing secrets are never re-made; empty owner skipped', async () => {
  const s = await health(true), host = `http://127.0.0.1:${s.address().port}`;
  const w = fake('[{"name":"PEPPER","type":"secret_text"}]');
  assert.notEqual((await run(w, host)).status, 0); assert.ok(!existsSync(w.log));
  const w2 = fake('[{"name":"PEPPER"},{"name":"TOKEN_SECRET"}]');
  const r2 = await run(w2, host, '');
  assert.equal(r2.status, 0); assert.ok(!existsSync(w2.log)); assert.match(r2.stdout, /skipped/);
  s.close();
});
