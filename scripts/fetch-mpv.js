// Downloads a Windows build of mpv into vendor/mpv so Tuner can play every format.
// Runs automatically after `npm install` on Windows. `npm run get-mpv` downloads it again.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEST = path.join(__dirname, '..', 'vendor', 'mpv');
const again = process.argv.includes('--again');

function findExe(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) { const f = findExe(p); if (f) return f; }
    else if (name.toLowerCase() === 'mpv.exe') return p;
  }
  return null;
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('[mpv] Not on Windows, skipping the download. Install mpv with your package manager to get the full player.');
    return;
  }
  if (!again && fs.existsSync(path.join(DEST, 'mpv.exe'))) { console.log('[mpv] Already downloaded.'); return; }

  const headers = { 'User-Agent': 'tuner-setup' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`; // avoids rate limits on CI
  const res = await fetch('https://api.github.com/repos/shinchiro/mpv-winbuild-cmake/releases/latest', { headers });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const rel = await res.json();
  const asset = (rel.assets || []).find((a) => /^mpv-x86_64-\d{8}-git-[0-9a-f]+\.7z$/.test(a.name));
  if (!asset) throw new Error('No Windows build was found in the latest mpv release.');

  console.log(`[mpv] Downloading ${asset.name} (${Math.round(asset.size / 1048576)} MB)…`);
  const file = await fetch(asset.browser_download_url);
  if (!file.ok) throw new Error(`Download failed with ${file.status}`);
  fs.rmSync(DEST, { recursive: true, force: true });
  fs.mkdirSync(DEST, { recursive: true });
  const archive = path.join(DEST, asset.name);
  fs.writeFileSync(archive, Buffer.from(await file.arrayBuffer()));

  const { path7za } = require('7zip-bin');
  execFileSync(path7za, ['x', archive, `-o${DEST}`, '-y'], { stdio: 'ignore' });
  fs.unlinkSync(archive);

  // Flatten if the archive kept its files in a subfolder.
  const exe = findExe(DEST);
  if (!exe) throw new Error('mpv.exe was not in the download.');
  const from = path.dirname(exe);
  if (from !== DEST) for (const name of fs.readdirSync(from)) fs.renameSync(path.join(from, name), path.join(DEST, name));
  console.log('[mpv] Ready.');
}

main().catch((e) => {
  console.warn(`[mpv] Could not download mpv: ${e.message}`);
  console.warn('[mpv] Tuner still works with its built-in player. Run "npm run get-mpv" to try again.');
});
