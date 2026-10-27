// node tests/tv/drive.js <outdir> subs-hub -> the subtitles hub (app/tv/js/subs.js) in the browser, with the
// OpenSubtitles add-on answered from tests/fixtures/subs: Oppenheimer's real list, and its files rebuilt from their real
// cue timings (the words are stand-ins). Also one quality check of the fake provider's film through the browser's
// range reads (the TV uses the native check instead).
const path = require('path');
const zlib = require('zlib');
const fs = require('fs');
const FX = path.join(__dirname, '../fixtures/subs');
const gun = (n) => zlib.gunzipSync(fs.readFileSync(path.join(FX, n)));
const timing = JSON.parse(gun('timing.json.gz')).files;
const WORDS = { eng: ['You know what this is.', 'I don\'t think we have the time.', 'What do you want from me?', 'We can do this here.'], ice: ['Ég veit það ekki.', 'Hvað er að þér?', 'Það er ekki hægt núna.', 'Við erum hér.'] };
const two = (n) => String(n).padStart(2, '0');
const stamp = (ms) => `${two(Math.floor(ms / 3600000))}:${two(Math.floor(ms / 60000) % 60)}:${two(Math.floor(ms / 1000) % 60)},${String(ms % 1000).padStart(3, '0')}`;
function srt(f) {
  let ms = 0;
  const w = WORDS[f.lang] || WORDS.eng, bom = f.lang === 'ice' ? '﻿' : '';
  return f.d.map((x, i) => { ms += x; return `${i + 1}\r\n${stamp(ms)} --> ${stamp(ms + 1800)}\r\n${bom}${w[i % w.length]}\r\n`; }).join('\r\n');
}
const byId = Object.fromEntries(Object.values(timing).map((f) => [f.id, f]));
const list = JSON.parse(gun('oppenheimer-list.json.gz'));

module.exports = async ({ p, log }) => {
  const ev = (f, a) => p.evaluate(f, a);
  let lists = 0, files = 0;
  await p.route('https://opensubtitles-v3.strem.io/**', (r) => { lists++; const u = r.request().url(); if (/tt0000002/.test(u)) return r.fulfill({ status: 503, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' }); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(/tt15398776/.test(u) ? list : { subtitles: [], cacheMaxAge: 600 }) }); });
  await p.route('https://subs5.strem.io/**', (r) => {
    files++;
    const n = r.request().url().split('/').pop();
    const row = list.subtitles.find((s) => s.url.endsWith('/' + n));
    const f = row && byId[row.id];
    if (!f) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ status: 200, contentType: 'application/x-subrip; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: srt(f) });
  });
  await require('./signin.js')({ p, key: global.ctx.key });
  await p.waitForTimeout(2500);
  // his settings (SPEC 14): Always, Icelandic then English, Shown first English, Icelandic
  await ev(() => { const s = JSON.parse(localStorage.getItem('tuner.settings') || '{}'); Object.assign(s, { langs: ['English', 'Icelandic'], subMode: 'always', subLangs: ['Icelandic', 'English'] }); localStorage.setItem('tuner.settings', JSON.stringify(s)); });
  const run = (req) => ev(async (req) => {
    const m = await import('/tv/js/subs.js');
    const t0 = performance.now();
    const st = await m.prepare(req);
    const ms = Math.round(performance.now() - t0);
    const pl = m.forPlayer(req.key);
    return { ms, status: st.status, pill: st.pill, side: st.side, on: st.on && `${st.on.lang} (${st.on.source})`, langs: st.langs.map((l) => `${l.lang}: ${l.source || 'none'} · ${l.words}${l.anchored ? ' ✓' : ''}`), files: st.files.map((f) => `${f.lang} ${f.release} -> ${f.timing.verdict} x${f.timing.speed.toFixed(4)} ${f.timing.offset >= 0 ? '+' : ''}${f.timing.offset}`), others: st.others.length, player: pl && { pick: pl.pick, files: pl.files.length, bytes: pl.files.reduce((s, f) => s + f.text.length, 0) } };
  }, req);
  let r = await run({ key: 'movie:opp', name: 'Oppenheimer', imdb: 'tt15398776', level: 'sure' });
  console.log('Oppenheimer, his settings:', JSON.stringify(r, null, 1));
  console.log(r.pill === 'Subtitles: Icelandic' && /English ready too/.test(r.side) && r.files.some((f) => /^Icelandic .* fixed x1\.0427 /.test(f)) && r.files.filter((f) => / pair x1\.0000 \+0$/.test(f)).length === 3 ? 'HUB OK' : 'HUB WRONG');
  r = await run({ key: 'movie:opp', name: 'Oppenheimer', imdb: 'tt15398776', level: 'sure' });
  console.log('again (cached):', r.ms, 'ms, requests so far', lists, 'lists,', files, 'files');
  r = await run({ key: 'movie:x', name: 'Unknown', imdb: 'tt0000001', level: 'sure' });
  console.log('nothing on the add-on:', r.status, '·', r.pill, '·', r.side);
  r = await run({ key: 'movie:down', name: 'Down', imdb: 'tt0000002', level: 'sure' });
  console.log('the add-on down:', r.status, '·', r.pill, '·', r.side);
  r = await run({ key: 'movie:lk', name: 'The Lion King', imdb: '', level: 'unsure' });
  console.log('unsure:', r.status, '·', r.pill);
  r = await run({ key: 'movie:dub', name: 'Konungur ljónanna', imdb: 'tt15398776', level: 'sure', dub: true, soundLang: 'Icelandic' });
  console.log('a dub:', r.status, '·', r.pill, '· on', r.on);
  // the quality check, in the browser: the fake provider's film by range reads
  const q = await ev(async () => {
    const m = await import('/tv/js/subs.js');
    const v = { kind: 'movie', id: 'probe-test', url: 'http://127.0.0.1:8899/movie/demo/demo/1.mp4' };
    m.checkCopies([v], 'title');
    for (let i = 0; i < 40 && !m.checkFor(v); i++) await new Promise((res) => setTimeout(res, 150));
    const e = m.checkFor(v);
    return { entry: e && { status: e.status, size: e.size, hash: e.hash, etag: e.etag }, budget: m.probeStatus()?.budget };
  });
  console.log('quality check (browser reads):', JSON.stringify(q));
  await log('done');
};
