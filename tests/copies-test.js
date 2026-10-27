// node tests/copies-test.js -> the shared copy ranking's cases (design/ui-v1/copies/copies-test.js, run as it is)
// against the app's own module, app/tv/js/copies.js, instead of the reference code. Exit 1 on a failure, or when the
// app's copy of the reference is out of date (node scripts/port-copies.js refreshes it).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
(async () => {
  try { execFileSync(process.execPath, [path.join(root, 'scripts/port-copies.js'), '--check'], { stdio: 'inherit' }); } catch { process.exit(1); }
  const app = await import(path.join(root, 'app/tv/js/copies.js'));
  const src = fs.readFileSync(path.join(root, 'design/ui-v1/copies/copies-test.js'), 'utf8');
  const req = (m) => { if (m === './copies.js') return app; return require(m); };
  new Function('require', 'console', 'process', src)(req, console, process);
})();
