// Copies the app into www/ for the iPhone build, with the libraries it uses from node_modules.
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
]) copy(path.join('node_modules', dep), path.join('node_modules', dep));
const index = path.join(out, 'index.html');
fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replaceAll('../node_modules/', 'node_modules/'));
if (process.env.TUNER_TEST) {
  fs.copyFileSync(path.resolve(root, process.env.TUNER_TEST), path.join(out, 'test-boot.js'));
  fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace('<script src="core.js"></script>', '<script src="test-boot.js"></script>\n<script src="core.js"></script>'));
}
console.log('www/ ready');
