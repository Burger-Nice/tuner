#!/bin/sh
# PNG exports: icon 1024, Android adaptive layers at xxxhdpi (432 = 108dp x 4), banner 1x/2x.  sh tools/export-png.sh
cd "$(dirname "$0")/.." || exit 1
for v in soft sharp; do
  node tools/render.js $v/icon-1024.svg $v/icon-1024.png 1024 1024 1
  node tools/render.js $v/icon-foreground.svg $v/icon-foreground-432.png 108 108 4
  node tools/render.js $v/icon-background.svg $v/icon-background-432.png 108 108 4
  node tools/render.js $v/banner.svg $v/banner.png 320 180 1
  node tools/render.js $v/banner.svg $v/banner@2x.png 320 180 2
done
