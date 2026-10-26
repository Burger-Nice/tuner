// Copies the app into www/ for the TV or iPhone build, with the libraries it uses from node_modules.
// Usage: node scripts/build-web.js tv|phone. Each build is locked to its device: the TV build always
// uses the TV layout, the phone build the phone one (the PC app loads app/ directly).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
const copy = (from, to) => fs.cpSync(path.join(root, from), path.join(out, to), { recursive: true });

fs.rmSync(out, { recursive: true, force: true });
copy('app', '.');
for (const dep of [
  'hls.js/dist/hls.min.js',
  'mpegts.js/dist/mpegts.js',
  '@fontsource-variable/bricolage-grotesque',
  '@fontsource-variable/figtree',
  '@fontsource-variable/jetbrains-mono',
  '@fontsource-variable/inter',
]) copy(path.join('node_modules', dep), path.join('node_modules', dep));
const target = process.argv[2];
if (!['tv', 'phone'].includes(target)) throw new Error('Say which build: node scripts/build-web.js tv|phone');
const index = path.join(out, 'index.html');
// The TV has its own interface (app/tv.html + app/tv/): it becomes the TV app's start page.
if (target === 'tv') fs.copyFileSync(path.join(out, 'tv.html'), index);
// The TV app talks to its native player and updater through Capacitor's plugin bridge, which needs @capacitor/core.
const head = [`<script>window.TUNER_TARGET = ${JSON.stringify(target)};</script>`];
if (target === 'tv') {
  copy('node_modules/@capacitor/core/dist/capacitor.js', 'node_modules/@capacitor/core/dist/capacitor.js');
  head.push('<script src="node_modules/@capacitor/core/dist/capacitor.js"></script>');
}
// The TV plays everything in its native player, so it skips the web video libraries (about 900 KB to parse).
let html = fs.readFileSync(index, 'utf8').replaceAll('../node_modules/', 'node_modules/');
if (target === 'tv') html = html.replace(/<script src="node_modules\/(hls\.js|mpegts\.js)\/[^"]+"><\/script>\n?/g, '');
fs.writeFileSync(index, html
  .replace('<script src="core.js"></script>', `${head.join('\n')}\n<script src="core.js"></script>`));
if (process.env.TUNER_TEST) {
  fs.copyFileSync(path.resolve(root, process.env.TUNER_TEST), path.join(out, 'test-boot.js'));
  const api = process.env.TUNER_TEST_API || 'http://127.0.0.1:8899';
  fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace('<script src="core.js"></script>', `<script>window.TEST_API = ${JSON.stringify(api)};</script>\n<script src="test-boot.js"></script>\n<script src="core.js"></script>`));
}
console.log(`www/ ready (${target})`);
