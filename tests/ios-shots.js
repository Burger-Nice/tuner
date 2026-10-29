// Runs on the macOS CI machine: takes simulator screenshots whenever the test build asks for one.
const { execFileSync } = require('child_process');
const fs = require('fs');
fs.mkdirSync('ios-shots', { recursive: true });
const seen = new Set();
const start = Date.now();
(async () => {
  while (Date.now() - start < 480000) {
    let reports = [];
    try { reports = await (await fetch('http://127.0.0.1:8899/_reports')).json(); } catch {}
    for (const [i, r] of reports.entries()) {
      if (seen.has(i)) continue;
      seen.add(i);
      console.log(JSON.stringify(r));
      if (r.step === 'shot') {
        try { execFileSync('xcrun', ['simctl', 'io', 'booted', 'screenshot', `ios-shots/${r.data.name}.png`], { timeout: 20000 }); } catch (e) { console.log(`screenshot ${r.data.name} failed: ${e.message}`); }
        await fetch('http://127.0.0.1:8899/_report', { method: 'POST', body: JSON.stringify({ step: 'shot-done', data: { name: r.data.name } }) }).catch(() => {});
      }
    }
    fs.writeFileSync('ios-shots/reports.json', JSON.stringify(reports, null, 1));
    if (reports.some((r) => r.step === 'done')) return;
    await new Promise((r) => setTimeout(r, 700));
  }
  console.log('Timed out waiting for the test to finish');
})();
