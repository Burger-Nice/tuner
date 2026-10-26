#!/bin/sh
# PNG exports (needed wherever a consumer cannot render the SVG: launcher, Android adaptive layers). sh tools/export-png.sh
cd "$(dirname "$0")/.." || exit 1
node tools/render.js assets/icon-1024.svg assets/icon-1024.png 1024 1024 1
node tools/render.js assets/icon-foreground.svg assets/icon-foreground-432.png 108 108 4
node tools/render.js assets/icon-background.svg assets/icon-background-432.png 108 108 4
node tools/render.js assets/banner.svg assets/banner.png 320 180 1
node tools/render.js assets/banner.svg assets/banner@2x.png 320 180 2
node tools/render.js assets/mark.svg assets/mark-512.png 124 116 4
