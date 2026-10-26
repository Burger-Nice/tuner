#!/bin/sh
# PNG exports (launcher, Android adaptive layers). sh tools/export-png.sh
cd "$(dirname "$0")/.." || exit 1
node tools/render.js assets/icon-1024.svg assets/icon-1024.png 1024 1024 1
node tools/render.js assets/icon-small.svg assets/icon-small-256.png 256 256 1
node tools/render.js assets/icon-foreground.svg assets/icon-foreground-432.png 108 108 4
node tools/render.js assets/icon-background.svg assets/icon-background-432.png 108 108 4
node tools/render.js assets/banner.svg assets/banner.png 320 180 1
node tools/render.js assets/banner.svg assets/banner@2x.png 320 180 2
node tools/render.js assets/banner-dark.svg assets/banner-dark.png 320 180 1
