#!/bin/bash
# The fake provider + fake ESPN (127.0.0.1:8899, user demo / password demo) and the TV app (127.0.0.1:8777/tv.html).
# With --test it also builds the test version that runs the CI walkthrough, served on 127.0.0.1:8778.
# Stop them with Ctrl+C.
cd "$(dirname "$0")/../.."
trap 'kill 0' EXIT
mkdir -p .tmp
[ -d .tmp/media ] || sh tests/make-media.sh .tmp/media >/dev/null 2>&1 || true   # (needs ffmpeg; without it there is no test video, the rest works)
MEDIA_DIR=.tmp/media node tests/mock-provider.js &
(cd app && python3 -m http.server 8777 >/dev/null 2>&1) &
if [ "$1" = "--test" ]; then
  TUNER_TEST=tests/android-test-boot.js TUNER_TEST_API=http://127.0.0.1:8899 node scripts/build-web.js tv >/dev/null
  (cd www && python3 -m http.server 8778 >/dev/null 2>&1) &
fi
echo "fake provider :8899 · app :8777/tv.html${1:+ · test build :8778}"
wait
