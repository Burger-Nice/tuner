// node tools/copies-test.js   -> proves tools/copies.js (SPEC 5.0, 11.4, 8.2) on the cases the review raised. Exit 1 on a failure.
const { readName, rank, matchLevel, notReadyByLength } = require('./copies.js');
let bad = 0, n = 0;
const eq = (what, got, want) => { n++; const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok ? '' : `: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`); };
const nm = (filename, name = '') => readName({ name, behaviorHints: { filename } });

// ---- review S2: whole tokens, extension first ----
eq('".ts" file is not a cinema recording', nm('Dune.Part.Two.2024.1080p.WEB-DL.ts').kind, 'web');
eq('"DTS" is not "TS"', nm('Dune.Part.Two.2024.2160p.BluRay.DTS-HD.MA.mkv').kind, 'bluray');
eq('"DVDRip" is not Dolby Vision', nm('Old.Film.1999.DVDRip.x264.avi').dv, false);
eq('"DVDRip" is a DVD copy', nm('Old.Film.1999.DVDRip.x264.avi').kind, 'dvd');
eq('"HDRip" is not HDR', nm('Film.2020.720p.HDRip.mkv').hdr, '');
eq('"webcam" in a title is not a web copy', nm('The.Webcam.Murders.2019.1080p.BluRay.mkv').kind, 'bluray');
eq('"sd" inside a word is not SD', nm('Hudson.Hawk.1991.1080p.BluRay.mkv').res, '1080p');
eq('real release name (OpenSubtitles, 11.2): 2160p WEB-DL DV HDR', ((c) => [c.res, c.kind, c.dv, c.hdr])(nm('Dune.Part.Two.2024.2160p.WEB-DL.DDP5.1.Atmos.DV.HDR.H.265-FLUX.mkv')), ['4K', 'web', true, 'HDR10']);
eq('HDTS is a cinema recording', nm('New.Film.2026.1080p.HDTS.x264.mkv').kind, 'cinema');
eq('size from the description', readName({ name: '4k', description: '💾 51.6 GB' }).size, 51.6e9);
eq('videoSize wins over the text', readName({ description: '💾 51.6 GB', behaviorHints: { videoSize: 123 } }).size, 123);

// ---- SPEC 5.0.1, the shared ranking, with the Dune: Part Two copies of the mocks ----
const B = { id: 'B', source: 'Northlight', order: 1, match: 'sure', lang: 'English', claim: nm('Dune.Part.Two.2024.2160p.BluRay.REMUX.DV.HDR.TrueHD.Atmos.mkv'), size: 51.6e9 };
const A = { id: 'A', source: 'Northlight', order: 1, match: 'sure', lang: 'English', claim: nm('Dune.Part.Two.2024.2160p.WEB-DL.DV.HDR.mkv'), size: 23.4e9 };
const P = { id: 'P', source: 'provider', order: 0, lang: 'English', claim: nm('EN| Dune: Part Two 4K'), checked: { res: '1080p', mbps: 7.1, plays: true }, size: 6.1e9 };
const N = { id: 'N', source: 'Northlight', order: 1, match: 'sure', lang: 'English', claim: nm('Dune.Part.Two.2024.1080p.BluRay.mkv'), size: 14.2e9 };
const F = { id: 'F', source: 'provider', order: 0, lang: 'French', claim: nm('FR| Dune 2 1080p'), checked: { res: '1080p', mbps: 6.9, plays: true } };
eq('the mocks\' order (detail-sources-sheet)', rank([P, N, A, F, B]).map((c) => c.id), ['B', 'A', 'P', 'N', 'F']);
eq('S3: DV on a Blu-ray counts as HDR10 (B beats A on kind, not on range)', rank([A, B]).map((c) => c.id), ['B', 'A']);
eq('S3: a checked profile-7 copy the TV can\'t play drops', rank([{ ...B, checked: { res: '4K', dv: true, dvProfile: 7, mbps: 41, plays: false } }, A]).map((c) => c.id), ['A', 'B']);
eq('S3: faster than 0.7 x measured speed drops a class', rank([{ ...B, checked: { res: '4K', hdr: 'HDR10', mbps: 41, plays: true } }, P], { speedMbps: 40 })[0].id, 'P');
eq('subtitles 5.4: unchecked below checked of the same class', rank([N, P]).map((c) => c.id), ['P', 'N']);
eq('M5: a Likely match never outranks the provider', rank([{ ...A, match: 'likely' }, P]).map((c) => c.id), ['P', 'A']);
eq('M4: a not-ready copy is last', rank([{ ...B, notReady: true }, F]).map((c) => c.id), ['F', 'B']);
eq('a cinema recording is last of the playable', rank([{ ...A, claim: nm('Film.2026.2160p.HDCAM.mkv') }, F]).map((c) => c.id), ['F', 'A']);
eq('his pick wins', rank([B, { ...F, pinned: true }])[0].id, 'F');
eq('ties: provider first, then add-on order', rank([{ ...N, order: 2, id: 'N2', claim: P.claim, checked: P.checked, size: 6.1e9 }, P]).map((c) => c.id), ['P', 'N2']);

// ---- SPEC 5.0.3, the match levels ----
const dune = [{ year: 2021 }, { year: 1984 }];
eq('no year, two films: unsure (asks)', matchLevel({ cand: dune }), 'unsure');
eq('review M5 gap: a film with no year and one candidate is unsure, never sure', matchLevel({ cand: [{ year: 2024 }] }), 'unsure');
eq('year ±1, one row, no length yet: likely', matchLevel({ cand: [{ year: 2024 }], year: 2024 }), 'likely');
eq('length within 8%: sure', matchLevel({ cand: [{ year: 2024 }], year: 2024, len: 166, runtime: 167 }), 'sure');
eq('length off by more than 8%: unsure (another film or cut)', matchLevel({ cand: [{ year: 2024 }], year: 2024, len: 128, runtime: 167 }), 'unsure');
eq('TMDB ids agree: sure', matchLevel({ cand: dune, tmdb: 693134, moviedb: 693134 }), 'sure');
eq('a series with no year and one candidate: likely', matchLevel({ cand: [{ year: 2022 }], kind: 'series' }), 'likely');
eq('his pick: sure', matchLevel({ cand: dune, picked: 'tt1160419' }), 'sure');

// ---- SPEC 8.2: placeholders ----
eq('a 30 s clip for a 167 min film is not ready', notReadyByLength(30, 167), true);
eq('a 160 min copy is ready', notReadyByLength(160 * 60, 167), false);

console.log(`\n${n} cases, ${bad} failed`); process.exit(bad ? 1 : 0);
