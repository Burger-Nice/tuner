// Writes the AltStore source that tells the iPhone where new versions of Tuner are.
// Usage: node scripts/altstore-source.js <version> <build number> <path to Tuner.ipa> <out file>
const fs = require('fs');
const [, , version, build, ipa, out] = process.argv;
const repo = 'https://github.com/Burger-Nice/tuner';
const icon = 'https://raw.githubusercontent.com/Burger-Nice/tuner/main/design/tuner-icon-512.png';
const date = new Date().toISOString();
const downloadURL = `${repo}/releases/download/v${version}/Tuner.ipa`;
const size = fs.statSync(ipa).size;
const about = 'Fast, ad-free IPTV for Xtream Codes and M3U: live TV with a guide, movies, series, and live NBA scores and box scores.';
const source = {
  name: 'Tuner',
  identifier: 'app.tuner.source',
  subtitle: 'Fast, ad-free IPTV with live NBA',
  description: about,
  sourceURL: `${repo}/releases/latest/download/altstore-source.json`,
  iconURL: icon,
  tintColor: '#FF3B30',
  apps: [{
    name: 'Tuner',
    bundleIdentifier: 'app.tuner.player',
    developerName: 'Burger-Nice',
    subtitle: 'Fast, ad-free IPTV with live NBA',
    localizedDescription: about,
    iconURL: icon,
    tintColor: '#FF3B30',
    screenshots: [],
    versions: [{ version, buildVersion: build, date, localizedDescription: `Tuner ${version}`, downloadURL, size, minOSVersion: '15.0' }],
    appPermissions: { entitlements: [], privacy: { NSLocalNetworkUsageDescription: 'Tuner connects to IPTV servers that may be on your local network.' } },
    // Older AltStore versions read these instead of `versions`.
    version, versionDate: date, versionDescription: `Tuner ${version}`, downloadURL, size,
  }],
  news: [],
};
fs.writeFileSync(out, JSON.stringify(source, null, 2));
console.log(`AltStore source for ${version} written to ${out}`);
