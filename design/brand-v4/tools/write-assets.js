// writes <variant>/mark.svg, lockup.svg, icon.svg, banner.svg. node tools/write-assets.js
const fs = require('fs'), path = require('path'); const A = require('./assets.js');
for (const slug of ['airglow', 'flare', 'skylit']) {
  const dir = path.join(__dirname, '..', slug); fs.mkdirSync(dir, { recursive: true }); const d = A[slug];
  fs.writeFileSync(path.join(dir, 'mark.svg'), d.mark()); fs.writeFileSync(path.join(dir, 'lockup.svg'), A.lockupSvg(d));
  fs.writeFileSync(path.join(dir, 'icon.svg'), d.icon()); fs.writeFileSync(path.join(dir, 'banner.svg'), d.banner());
}
console.log('assets written');
