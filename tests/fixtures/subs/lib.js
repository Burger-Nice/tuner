// Shared by tests/subs-*.js: the fixtures (made by make.js from real downloads) and a tiny test runner.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const here = __dirname;
const app = (p) => import(path.join(here, '../../../app/tv/js', p));
const raw = (name) => zlib.gunzipSync(fs.readFileSync(path.join(here, name)));
const json = (name) => JSON.parse(raw(name).toString('utf8'));
// timing.json.gz -> { name: { id, lang, fileName, movieReleaseName, fpsMilli, cues: [{ s, e, text }] } } (starts only;
// each cue lasts 2 s, which no check reads)
function timing() {
  const t = json('timing.json.gz');
  const out = {};
  for (const [name, f] of Object.entries(t.files)) {
    let ms = 0;
    const cues = f.d.map((x) => { ms += x; return { s: ms / 1000, e: ms / 1000 + 2, text: '.' }; });
    out[name] = { ...f, cues, count: f.cues };
  }
  return out;
}
function runner(title) {
  let n = 0, failed = 0;
  const t = (name, ok, extra = '') => { n++; if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ` (${extra})` : ''}`); };
  const done = () => { console.log(`${title}: ${n} cases, ${failed} failed`); if (failed) process.exit(1); };
  return { t, done };
}
module.exports = { app, raw, json, timing, runner };
