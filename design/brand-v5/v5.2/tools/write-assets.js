// writes the final asset set into assets/ and renders PNGs. node tools/write-assets.js && sh tools/export-png.sh
const fs = require('fs'), path = require('path'); const A = require('./assets.js'); const dir = path.join(__dirname, '..', 'assets');
fs.writeFileSync(path.join(dir, 'mark.svg'), A.mark()); fs.writeFileSync(path.join(dir, 'mark-small.svg'), A.markSmall());
fs.writeFileSync(path.join(dir, 'lockup.svg'), A.lockupSvg('lk')); fs.writeFileSync(path.join(dir, 'icon-1024.svg'), A.icon());
fs.writeFileSync(path.join(dir, 'icon-foreground.svg'), A.iconFg()); fs.writeFileSync(path.join(dir, 'icon-background.svg'), A.iconBg());
fs.writeFileSync(path.join(dir, 'banner.svg'), A.banner()); fs.writeFileSync(path.join(dir, 'banner-dark.svg'), A.bannerDark()); console.log('assets written');
