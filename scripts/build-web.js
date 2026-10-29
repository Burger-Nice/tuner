// Copies the app into www/ for the TV or iPhone build, with the libraries it uses from node_modules.
// Usage: node scripts/build-web.js tv|phone. Each build is locked to its device: the TV build always
// uses the TV layout, the phone build the phone one (the PC app loads app/ directly).
// The phone build (design/ui-v1/phone-v1/SPEC.md 5): app/phone.html + app/phone/ (the views) + app/tv/js and its brand
// (the data modules, reused as they are), the shared data code, hls.js (only for a desktop browser in tests: the
// iPhone plays HLS natively) and Capacitor's bridge.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
const copy = (from, to) => fs.cpSync(path.join(root, from), path.join(out, to), { recursive: true });

const target = process.argv[2];
if (!['tv', 'phone'].includes(target)) throw new Error('Say which build: node scripts/build-web.js tv|phone');
fs.rmSync(out, { recursive: true, force: true });
const index = path.join(out, 'index.html');
if (target === 'tv') {
  // The TV has its own interface (app/tv.html + app/tv/) and plays everything in its native player: it ships only
  // that and the shared data code, not the PC/phone interface, the web video libraries or their fonts (about 4 MB).
  fs.mkdirSync(out, { recursive: true });
  copy('app/tv', 'tv');
  for (const f of ['core.js', 'nba.js', 'titles.js']) copy(path.join('app', f), f);
  copy('app/tv.html', 'index.html');
} else {
  fs.mkdirSync(out, { recursive: true });
  copy('app/phone', 'phone');
  for (const d of ['js', 'brand', 'sounds']) copy(path.join('app/tv', d), path.join('tv', d));
  for (const f of ['core.js', 'nba.js', 'titles.js']) copy(path.join('app', f), f);
  copy('node_modules/hls.js/dist/hls.min.js', 'node_modules/hls.js/dist/hls.min.js');
  copy('app/phone.html', 'index.html');
}
// The TV app talks to its native player and updater through Capacitor's plugin bridge, which needs @capacitor/core;
// the phone app its status bar and orientation plugins.
const head = [`<script>window.TUNER_TARGET = ${JSON.stringify(target)};</script>`];
{
  copy('node_modules/@capacitor/core/dist/capacitor.js', 'node_modules/@capacitor/core/dist/capacitor.js');
  head.push('<script src="node_modules/@capacitor/core/dist/capacitor.js"></script>');
}
const html = fs.readFileSync(index, 'utf8').replaceAll('../node_modules/', 'node_modules/');
fs.writeFileSync(index, html
  .replace('<script src="core.js"></script>', `${head.join('\n')}\n<script src="core.js"></script>`));
// The TV's modules: their whole static import graph is named up front (modulepreload), so the WebView asks for all 60
// at once instead of finding them a level at a time (each import waits for the file that names it).
{
  const seen = new Set();
  const walk = (f) => {
    if (seen.has(f)) return;
    seen.add(f);
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/^\s*(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]|^\s*import\s*['"](\.[^'"]+)['"]/gm)) walk(path.resolve(path.dirname(f), m[1] || m[2]));
  };
  const entry = target === 'tv' ? 'tv/js/main.js' : 'phone/main.js';
  const main = path.join(root, 'app', entry);
  walk(main);
  const links = [...seen].filter((f) => f !== main && fs.existsSync(f)).map((f) => `<link rel="modulepreload" href="${path.relative(path.join(root, 'app'), f).split(path.sep).join('/')}">`);
  fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace(`<script type="module" src="${entry}"></script>`, `${links.join('\n')}\n<script type="module" src="${entry}"></script>`));
}
if (process.env.TUNER_TEST) {
  fs.copyFileSync(path.resolve(root, process.env.TUNER_TEST), path.join(out, 'test-boot.js'));
  const api = process.env.TUNER_TEST_API || 'http://127.0.0.1:8899';
  fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace('<script src="core.js"></script>', `<script>window.TEST_API = ${JSON.stringify(api)};</script>\n<script src="test-boot.js"></script>\n<script src="core.js"></script>`));
}
console.log(`www/ ready (${target})`);
