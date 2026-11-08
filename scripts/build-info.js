// Writes app/build-info.json for the Windows app's error reports (design/ui-v1/error-reports/SPEC.md D9): which commit
// it was built from, and whether it's a release (main) or a test build. CI runs it before electron-builder.
const fs = require('fs');
const path = require('path');
const info = {
  dist: (process.env.GITHUB_SHA || '').slice(0, 7) || undefined,
  env: process.env.GITHUB_REF_NAME === 'main' ? 'production' : 'dev',
};
fs.writeFileSync(path.join(__dirname, '..', 'app', 'build-info.json'), JSON.stringify(info));
console.log('app/build-info.json', JSON.stringify(info));
