#!/bin/bash
# The fake provider + fake ESPN (127.0.0.1:8899, user demo / password demo) and the TV app (127.0.0.1:8777/tv.html).
# With --test it also builds the test version that runs the CI walkthrough, served on 127.0.0.1:8778.
# Stop them with Ctrl+C.
cd "$(dirname "$0")/../.."
trap 'kill 0' EXIT
mkdir -p .tmp
# The first Python that really runs (on Windows `python3` can be the Microsoft Store stub; `py -3` is the launcher).
for PY in python3 "py -3" python; do $PY -c "" >/dev/null 2>&1 && break; done
[ -d .tmp/media ] || sh tests/make-media.sh .tmp/media >/dev/null 2>&1 || true   # (needs ffmpeg; without it there is no test video, the rest works)
MEDIA_DIR=.tmp/media node tests/mock-provider.js &
node --no-warnings tests/mock-accounts.js &
node tests/mock-sentry.js &
(cd app && $PY -m http.server 8777 >/dev/null 2>&1) &
if [ "$1" = "--test" ]; then
  TUNER_TEST=tests/android-test-boot.js TUNER_TEST_API=http://127.0.0.1:8899 node scripts/build-web.js tv >/dev/null
  (cd www && $PY -m http.server 8778 >/dev/null 2>&1) &
fi
echo "fake provider :8899 · accounts :8790 · reports :8791 · app :8777/tv.html${1:+ · test build :8778}"
wait
