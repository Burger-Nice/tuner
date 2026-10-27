// Refreshes the reference part of app/tv/js/copies.js from design/ui-v1/copies/copies.js (the one copy ranking,
// RANKING.md), so the app runs exactly the reference code: its module.exports become ES exports, and the app's own
// helpers below the END marker are kept. Usage: node scripts/port-copies.js [--check] (--check: exit 1 if out of date)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const REF = path.join(root, 'design/ui-v1/copies/copies.js');
const APP = path.join(root, 'app/tv/js/copies.js');
const BEGIN = '// ---------- BEGIN reference: design/ui-v1/copies/copies.js (node scripts/port-copies.js) ----------';
const END = '// ---------- END reference ----------';

function ported() {
  let src = fs.readFileSync(REF, 'utf8');
  const m = src.match(/module\.exports\s*=\s*\{([^}]*)\};?\s*$/);
  if (!m) throw new Error('copies.js: no module.exports at the end');
  const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
  src = src.slice(0, m.index).trimEnd() + '\n';
  for (const n of names) {
    const re = new RegExp(`^(function|const|let)\\s+${n}\\b`, 'm');
    if (!re.test(src)) throw new Error(`copies.js: can't find ${n}`);
    src = src.replace(re, (d) => `export ${d}`);
  }
  return src;
}
const app = fs.readFileSync(APP, 'utf8');
const a = app.indexOf(BEGIN), b = app.indexOf(END);
if (a < 0 || b < 0) throw new Error('app/tv/js/copies.js: markers missing');
const next = app.slice(0, a + BEGIN.length) + '\n' + ported() + app.slice(b);
if (process.argv.includes('--check')) { if (next !== app) { console.log('app/tv/js/copies.js is behind design/ui-v1/copies/copies.js: run node scripts/port-copies.js'); process.exit(1); } console.log('copies.js up to date'); }
else { fs.writeFileSync(APP, next); console.log(next === app ? 'copies.js already up to date' : 'app/tv/js/copies.js refreshed'); }
