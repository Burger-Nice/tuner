// Runs on the CI machine next to the Android TV emulator: presses remote buttons through adb and
// takes screenshots whenever the test build (tests/android-test-boot.js) asks.
const { execFileSync } = require('child_process');
const fs = require('fs');
fs.mkdirSync('android-shots', { recursive: true });
const adb = (...a) => execFileSync('adb', a, { maxBuffer: 64 * 1024 * 1024 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const shot = (name) => fs.writeFileSync(`android-shots/${String(++n).padStart(2, '0')}-${name}.png`, adb('exec-out', 'screencap', '-p'));
(async () => {
  const seen = new Set();
  const start = Date.now();
  while (Date.now() - start < 480000) {
    let reports = [];
    try { reports = await (await fetch('http://127.0.0.1:8899/_reports')).json(); } catch {}
    for (const [i, r] of reports.entries()) {
      if (seen.has(i)) continue;
      seen.add(i);
      console.log(JSON.stringify(r).slice(0, 600));
      if (r.step === 'shot') shot(r.data.name);
      if (r.step === 'keys') {
        for (const k of r.data.keys) { adb('shell', 'input', 'keyevent', `KEYCODE_${k}`); await sleep(1200); }
        await sleep(r.data.name.startsWith('player') || r.data.name.startsWith('vod') ? 3500 : 800);
        shot(r.data.name);
      }
    }
    fs.writeFileSync('android-shots/reports.json', JSON.stringify(reports, null, 1));
    if (reports.some((r) => r.step === 'done')) return;
    await sleep(500);
  }
  console.log('Timed out waiting for the test to finish');
})();
