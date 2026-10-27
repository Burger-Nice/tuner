// node tests/fixtures/subs/make.js <dir> -> the subtitle fixtures in this folder, made from real downloads in <dir>.
//
// The downloads (27 Oct 2026, curl; the add-on's links convert to UTF-8):
//   https://opensubtitles-v3.strem.io/subtitles/movie/tt15398776.json                        -> opp.json (Oppenheimer, 96 files)
//   https://opensubtitles-v3.strem.io/subtitles/series/tt11280740:1:1.json                    -> sev.json (Severance S1 E1, 65)
//   https://opensubtitles-v3.strem.io/subtitles/movie/tt0086998/videoHash=8e245d9679d31e12&videoSize=12909756.json -> breakin.json
//   https://subs5.strem.io/en/download/subencoding-stremio-utf8/src-api/file/<n>               -> <n>.srt, for n =
//     1958345892 Will1869, 1958345893 Will1869-HI, 1958334424 WEB-DL MA, 1958334425 WEB-DL SDH, 1958345562 GalaxyRG,
//     1958345563 GalaxyRG.Sdh, 1959039384 Icelandic (BluRay-isl), 1958347412 -> jp.vtt (Japanese, WebVTT),
//     1957624647 -> sev-fre.srt (labelled French, really English, named 01x08), and The Dark Knight's
//     1951924886 -> tdk.srt (a wrong film for the timing check)
//   https://www.opensubtitles.org/addons/avi/breakdance.avi, bytes 0-65535 and the last 65536 -> bd-head.bin, bd-tail.bin
//     (OpenSubtitles' published test file: 12,909,756 bytes, fingerprint 8e245d9679d31e12)
//
// What is kept, to stay small (about 150 KB in all):
//   - every file's cue starts (the timing check needs nothing else), as whole milliseconds, delta-coded: timing.json.gz;
//   - the first cues of each file as the real bytes (BOMs, CRLF, tags), and the Icelandic file's last 3 (its
//     translator's credit): *.head.srt.gz / .vtt.gz;
//   - the three add-on lists as they came; the test file's two 64 KiB blocks.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const dir = process.argv[2];
if (!dir) { console.error('usage: node tests/fixtures/subs/make.js <download dir>'); process.exit(1); }
const out = __dirname;
const gz = (name, buf) => { fs.writeFileSync(path.join(out, name), zlib.gzipSync(buf, { level: 9 })); };

(async () => {
  const { parse } = await import(path.join(__dirname, '../../../app/tv/js/subs/parse.js'));
  const { releaseOf } = await import(path.join(__dirname, '../../../app/tv/js/subs/timing.js'));
  const list = JSON.parse(fs.readFileSync(path.join(dir, 'opp.json'), 'utf8'));
  const meta = (n) => list.subtitles.find((s) => s.url.endsWith('/' + n)) || {};
  const FILES = { Will1869: '1958345892', 'Will1869-HI': '1958345893', 'WEB-DL MA': '1958334424', 'WEB-DL SDH': '1958334425', GalaxyRG: '1958345562', 'GalaxyRG.Sdh': '1958345563', Icelandic: '1959039384', TDK: 'tdk' };
  const timing = { made: '27 Oct 2026 from the add-on (see make.js)', files: {} };
  for (const [name, n] of Object.entries(FILES)) {
    const raw = fs.readFileSync(path.join(dir, `${n}.srt`));
    const { cues } = parse(new Uint8Array(raw));
    const m = meta(n);
    let prev = 0;
    const d = cues.map((c) => { const ms = Math.round(c.s * 1000), x = ms - prev; prev = ms; return x; });
    timing.files[name] = { id: m.id || n, lang: m.lang || 'eng', fileName: m.subtitleFileName || `${n}.srt`, movieReleaseName: m.movieReleaseName || 'The.Dark.Knight', fpsMilli: m.fpsMilli || 0, bytes: raw.length, cues: cues.length, d };
  }
  gz('timing.json.gz', Buffer.from(JSON.stringify(timing)));
  // the first cues as the real bytes: cut at the start of block `n` (a cue's index line after a blank line)
  const headOf = (buf, n) => {
    const s = buf.toString('latin1');   // byte offsets
    const re = /(?:\r?\n){2,}(\d+)\r?\n/g; let m, k = 0;
    while ((m = re.exec(s))) { if (++k >= n) return buf.subarray(0, m.index + m[0].length - m[1].length - (m[0].endsWith('\r\n') ? 2 : 1)); }
    return buf;
  };
  const tailOf = (buf, n) => { const s = buf.toString('latin1'); const idx = []; const re = /(?:^|\n)(\d+)\r?\n\d\d:\d\d/g; let m; while ((m = re.exec(s))) idx.push(m.index + (m[0][0] === '\n' ? 1 : 0)); return buf.subarray(idx[idx.length - n]); };
  for (const [name, n, cues] of [['will1869', '1958345892', 200], ['will1869-hi', '1958345893', 200], ['webdl-ma', '1958334424', 200], ['webdl-sdh', '1958334425', 200], ['galaxyrg', '1958345562', 200], ['galaxyrg-sdh', '1958345563', 200], ['icelandic', '1959039384', 120]]) {
    gz(`${name}.head.srt.gz`, headOf(fs.readFileSync(path.join(dir, `${n}.srt`)), cues));
  }
  gz('icelandic.tail.srt.gz', tailOf(fs.readFileSync(path.join(dir, '1959039384.srt')), 3));
  const vtt = fs.readFileSync(path.join(dir, 'jp.vtt'));
  gz('japanese.head.vtt.gz', vtt.subarray(0, vtt.indexOf('\r\n\r\n', 3000) + 4));
  gz('severance-fre.head.srt.gz', headOf(fs.readFileSync(path.join(dir, 'sev-fre.srt')), 120));
  gz('oppenheimer-list.json.gz', fs.readFileSync(path.join(dir, 'opp.json')));
  gz('severance-s1e1-list.json.gz', fs.readFileSync(path.join(dir, 'sev.json')));
  gz('breakin-hash-list.json.gz', fs.readFileSync(path.join(dir, 'breakin.json')));
  gz('breakdance-blocks.bin.gz', Buffer.concat([fs.readFileSync(path.join(dir, 'bd-head.bin')), fs.readFileSync(path.join(dir, 'bd-tail.bin'))]));
  for (const f of fs.readdirSync(out).filter((x) => x.endsWith('.gz'))) console.log(f.padEnd(32), fs.statSync(path.join(out, f)).size);
})();
