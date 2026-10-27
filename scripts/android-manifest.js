// Writes android.json, which the Google TV app checks to find new versions.
// Usage: node scripts/android-manifest.js <version> <build number> <out file>
const fs = require('fs');
const [, , version, code, out] = process.argv;
// speedUrl (optional): where the playback diagnosis' speed test downloads from; without it the app uses Cloudflare's
const speedUrl = process.env.TUNER_SPEED_URL || '';
fs.writeFileSync(out, JSON.stringify({ version, code: +code, url: `https://github.com/Burger-Nice/tuner/releases/download/v${version}/Tuner-TV.apk`, ...(speedUrl ? { speedUrl } : {}) }, null, 2));
console.log(`android.json for ${version} (${code}) written to ${out}`);
