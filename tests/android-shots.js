// Runs on the CI machine next to the Android TV emulator: presses remote buttons and types through adb,
// takes screenshots whenever the test build (tests/android-test-boot.js) asks, and notes whether the
// on-screen keyboard is up at each step.
const { execFileSync } = require('child_process');
const fs = require('fs');
fs.mkdirSync('android-shots', { recursive: true });
const adb = (...a) => execFileSync('adb', a, { maxBuffer: 64 * 1024 * 1024, timeout: 20000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ack = (name) => fetch('http://127.0.0.1:8899/_report', { method: 'POST', body: JSON.stringify({ step: 'ack', data: { name } }) }).catch(() => {});
let n = 0;
const shot = (name) => {
  try { fs.writeFileSync(`android-shots/${String(++n).padStart(2, '0')}-${name}.png`, adb('exec-out', 'screencap', '-p')); } catch (e) { console.log(`screenshot ${name} failed: ${e.message}`); }
};
const key = (k) => { try { adb('shell', 'input', 'keyevent', `KEYCODE_${k}`); } catch (e) { console.log(`key ${k} failed: ${e.message}`); } };
// The emulator's home screen sometimes comes up over the app; put Tuner back in front before each step.
const front = () => {
  try {
    const out = adb('shell', 'dumpsys', 'activity', 'activities').toString();
    const m = out.match(/(?:topResumedActivity|mResumedActivity|ResumedActivity)[^\n]*?\s([\w.]+)\/([\w.$]+)/);
    if (m && m[1] === 'app.tuner.player') return;
    console.log(`Tuner was not in front (${m ? `${m[1]}/${m[2]}` : 'unknown'}), bringing it back`);
    adb('shell', 'am', 'start', '-n', 'app.tuner.player/.MainActivity');
    execFileSync('sleep', ['3']);
  } catch (e) { console.log(`front check failed: ${e.message}`); }
};
const keyboard = () => {
  try {
    const out = adb('shell', 'dumpsys', 'input_method').toString();
    const m = out.match(/mInputShown=(true|false)|mIsInputViewShown=(true|false)|isInputViewShown=(true|false)/);
    return m ? (m[1] || m[2] || m[3]) : 'unknown';
  } catch (e) { return `unknown (${e.message})`; }
};
process.on('unhandledRejection', (e) => console.log(`error: ${e && e.stack}`));
process.on('uncaughtException', (e) => console.log(`error: ${e && e.stack}`));
(async () => {
  const seen = new Set();
  const start = Date.now();
  while (Date.now() - start < 1020000) {   // (17 min: the emulator step has 22)
    let reports = [];
    try { reports = await (await fetch('http://127.0.0.1:8899/_reports')).json(); } catch {}
    for (const [i, r] of reports.entries()) {
      if (seen.has(i)) continue;
      seen.add(i);
      if (r.step === 'ack') continue;
      const s = r.data?.state;
      if (r.step === 'check') { console.log(`${r.data.ok ? 'PASS' : 'FAIL'} ${r.data.name}  [${r.data.focus}]${r.data.took ? ` ${r.data.took} ms` : ''}`); continue; }
      console.log(`${r.step} ${r.data?.name || ''} ${JSON.stringify(s ? { screen: s.screen || s.view, focus: s.focus, watching: s.watching ?? s.playing } : r.data).slice(0, 400)}`);
      if (r.step === 'shot' || r.step === 'keys') front();
      if (r.step === 'shot') { shot(r.data.name); console.log(`${r.data.name}: keyboard ${keyboard()}`); await ack(r.data.name); }
      if (r.step === 'keys') {
        if (r.data.text) { try { adb('shell', 'input', 'text', r.data.text); } catch (e) { console.log(`typing failed: ${e.message}`); } }
        // a shell command first (the playback diagnosis' debug intent: am broadcast … --es diag <cause>)
        if (r.data.adb) { try { console.log(`adb shell ${r.data.adb.join(' ')}: ${adb('shell', ...r.data.adb).toString().trim().split('\n').pop()}`); } catch (e) { console.log(`adb failed: ${e.message}`); } await sleep(600); }
        for (const k of r.data.keys) { key(k); await sleep(1200); }
        await sleep(r.data.name.startsWith('player') || r.data.name.startsWith('vod') ? 3500 : 900);
        shot(r.data.name);
        console.log(`${r.data.name}: keyboard ${keyboard()}`);
        await ack(r.data.name);
      }
    }
    fs.writeFileSync('android-shots/reports.json', JSON.stringify(reports, null, 1));
    if (reports.some((r) => r.step === 'done')) { shot('final'); return; }
    await sleep(500);
  }
  shot('timeout');
  console.log('Timed out waiting for the test to finish');
})();
