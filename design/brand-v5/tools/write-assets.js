// writes soft/ and sharp/ asset sets (SVG), then the PNG exports. node tools/write-assets.js
const fs = require('fs'), path = require('path'); const A = require('./assets.js');
const sets = { soft: A.soft, sharp: A.sharp };
for (const [slug, d] of Object.entries(sets)) {
  const dir = path.join(__dirname, '..', slug); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'mark.svg'), d.mark());
  if (d.markSmall) fs.writeFileSync(path.join(dir, 'mark-small.svg'), d.markSmall());
  fs.writeFileSync(path.join(dir, 'lockup.svg'), A.lockupSvg(d, slug[0] + 'k'));
  fs.writeFileSync(path.join(dir, 'icon-1024.svg'), d.icon().replace('width="512" height="512"', 'width="1024" height="1024"'));
  fs.writeFileSync(path.join(dir, 'icon-foreground.svg'), d.iconFg());
  fs.writeFileSync(path.join(dir, 'icon-background.svg'), d.iconBg());
  fs.writeFileSync(path.join(dir, 'banner.svg'), d.banner());
}
console.log('assets written');
