#!/bin/sh
# Generates the test video and artwork that tests/mock-provider.js serves.
set -e
M=${1:-tests/media}
mkdir -p "$M/hls" "$M/img"
ffmpeg -loglevel error -y -f lavfi -i testsrc2=size=1280x720:rate=25 -f lavfi -i sine=frequency=440 -t 30 -c:v libx264 -preset ultrafast -pix_fmt yuv420p -g 50 -c:a aac -f hls -hls_time 2 -hls_list_size 0 -hls_segment_filename "$M/hls/seg%d.ts" "$M/hls/index.m3u8"
ffmpeg -loglevel error -y -f lavfi -i smptebars=size=1280x720:rate=25 -f lavfi -i sine=frequency=660 -t 20 -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -f mpegts "$M/live.ts"
# The movie carries an English subtitle track, for testing the subtitle menu.
i=0; : > "$M/subs.srt"
while [ $i -lt 30 ]; do
  printf '%d\n00:00:%02d,000 --> 00:00:%02d,800\nSubtitle line %d\n\n' $((i+1)) $((i*2)) $((i*2+1)) $((i+1)) >> "$M/subs.srt"
  i=$((i+1))
done
ffmpeg -loglevel error -y -f lavfi -i testsrc=size=1280x720:rate=25 -f lavfi -i sine=frequency=330 -i "$M/subs.srt" -t 60 -map 0:v -map 1:a -map 2:s -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -c:s mov_text -metadata:s:s:0 language=eng -movflags +faststart "$M/movie.mp4"
cp "$M/live.ts" "$M/uhd.ts"
i=0
for c in 0x8a2be2 0xe0553a 0x2a9d8f 0xe9c46a 0x264653 0xf4a261 0x6d597a 0x3a86ff; do
  ffmpeg -loglevel error -y -f lavfi -i "color=c=$c:s=300x450" -frames:v 1 "$M/img/p$i.jpg"
  ffmpeg -loglevel error -y -f lavfi -i "color=c=$c:s=120x120" -frames:v 1 "$M/img/l$i.png"
  i=$((i+1))
done
ffmpeg -loglevel error -y -f lavfi -i "color=c=0x1d2a44:s=1280x720" -frames:v 1 "$M/img/bd.jpg"
echo "test media ready in $M"
