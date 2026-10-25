// Writes android.json, which the Android/Google TV app checks to find new versions.
// Usage: node scripts/android-manifest.js <version> <build number> <out file>
const fs = require('fs');
const [, , version, code, out] = process.argv;
fs.writeFileSync(out, JSON.stringify({ version, code: +code, url: `https://github.com/Burger-Nice/tuner/releases/download/v${version}/Tuner.apk` }, null, 2));
console.log(`android.json for ${version} (${code}) written to ${out}`);
