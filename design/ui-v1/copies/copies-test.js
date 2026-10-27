// node design/ui-v1/copies/copies-test.js   -> proves copies.js against RANKING.md, with every case the subtitles review 2
// (M3, S3, S6) and the add-ons reviews raised. Exit 1 on a failure. Started from design/ui-v1/addons/tools/copies-test.js.
const { readName, rank, pinNote, waitPlan, matchLevel, allows, recheck, isDub, notReadyByLength } = require('./copies.js');
let bad = 0, n = 0;
const eq = (what, got, want) => { n++; const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok ? '' : `: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`); };
const nm = (filename, name = '') => readName({ name, behaviorHints: { filename } });
const ids = (l) => l.map((c) => c.id);

// ---- RANKING.md 6: reading names (whole tokens, extension first) — unchanged from the add-ons tests ----
eq('".ts" file is not a cinema recording', nm('Dune.Part.Two.2024.1080p.WEB-DL.ts').kind, 'web');
eq('"DTS" is not "TS"', nm('Dune.Part.Two.2024.2160p.BluRay.DTS-HD.MA.mkv').kind, 'bluray');
eq('"DVDRip" is not Dolby Vision', nm('Old.Film.1999.DVDRip.x264.avi').dv, false);
eq('"DVDRip" is a DVD copy', nm('Old.Film.1999.DVDRip.x264.avi').kind, 'dvd');
eq('"HDRip" is not HDR', nm('Film.2020.720p.HDRip.mkv').hdr, '');
eq('"webcam" in a title is not a web copy', nm('The.Webcam.Murders.2019.1080p.BluRay.mkv').kind, 'bluray');
eq('"sd" inside a word is not SD', nm('Hudson.Hawk.1991.1080p.BluRay.mkv').res, '1080p');
eq('real release name: 2160p WEB-DL DV HDR', ((c) => [c.res, c.kind, c.dv, c.hdr])(nm('Dune.Part.Two.2024.2160p.WEB-DL.DDP5.1.Atmos.DV.HDR.H.265-FLUX.mkv')), ['4K', 'web', true, 'HDR10']);
eq('HDTS is a cinema recording', nm('New.Film.2026.1080p.HDTS.x264.mkv').kind, 'cinema');
eq('size from the description', readName({ name: '4k', description: '💾 51.6 GB' }).size, 51.6e9);
eq('videoSize wins over the text', readName({ description: '💾 51.6 GB', behaviorHints: { videoSize: 123 } }).size, 123);
eq('"Með íslensku tali" in a name says dub', readName({ name: 'IS| Konungur ljónanna (Með íslensku tali)' }).dub, true);

// ---- RANKING.md 2: the add-ons mocks' Dune: Part Two copies (the order must not change) ----
const B = { id: 'B', source: 'Northlight', order: 1, match: 'sure', lang: 'English', claim: nm('Dune.Part.Two.2024.2160p.BluRay.REMUX.DV.HDR.TrueHD.Atmos.mkv'), size: 51.6e9 };
const A = { id: 'A', source: 'Northlight', order: 1, match: 'sure', lang: 'English', claim: nm('Dune.Part.Two.2024.2160p.WEB-DL.DV.HDR.mkv'), size: 23.4e9 };
const P = { id: 'P', source: 'provider', order: 0, lang: 'English', claim: nm('EN| Dune: Part Two 4K'), checked: { res: '1080p', mbps: 7.1, plays: true }, size: 6.1e9 };
const N = { id: 'N', source: 'Northlight', order: 1, match: 'sure', lang: 'English', claim: nm('Dune.Part.Two.2024.1080p.BluRay.mkv'), size: 14.2e9 };
const F = { id: 'F', source: 'provider', order: 0, lang: 'French', claim: nm('FR| Dune 2 1080p'), checked: { res: '1080p', mbps: 6.9, plays: true } };
eq('add-ons mocks\' order (detail-sources-sheet)', ids(rank([P, N, A, F, B])), ['B', 'A', 'P', 'N', 'F']);
eq('DV on a Blu-ray counts as HDR10 (B beats A on kind, not on range)', ids(rank([A, B])), ['B', 'A']);
eq('a checked profile-7 copy the TV can\'t play drops', ids(rank([{ ...B, checked: { res: '4K', dv: true, dvProfile: 7, mbps: 41, plays: false } }, A])), ['A', 'B']);
eq('band b: faster than 0.7 x the measured speed goes after copies that fit', rank([{ ...B, checked: { res: '4K', hdr: 'HDR10', mbps: 41, plays: true } }, P], { speedMbps: 40 })[0].id, 'P');
eq('checked before unchecked in the same class', ids(rank([N, P])), ['P', 'N']);
eq('band c: a Likely add-on match never outranks the provider', ids(rank([{ ...A, match: 'likely' }, P])), ['P', 'A']);
eq('band e: a not-ready copy is last', ids(rank([{ ...B, notReady: true }, F])), ['F', 'B']);
eq('band d: a cinema recording is below every copy that plays', ids(rank([{ ...A, claim: nm('Film.2026.2160p.HDCAM.mkv') }, F])), ['F', 'A']);
eq('his pin wins', rank([B, { ...F, pinned: true }])[0].id, 'F');
eq('ties: provider first, then add-on order', ids(rank([{ ...N, order: 2, id: 'N2', claim: P.claim, checked: P.checked, size: 6.1e9 }, P])), ['P', 'N2']);

// ---- the subtitles mocks' Oppenheimer copies (SPEC 0) ----
const O = [
  { id: 'a', source: 'provider', lang: 'English', claim: nm('EN| Oppenheimer 4K'), checked: { res: '4K', hdr: 'HDR10', mbps: 15, plays: true, len: 10800, ch: 6, lang: 'English' } },
  { id: 'b', source: 'provider', lang: 'English', claim: nm('EN| Oppenheimer FHD'), checked: { res: '1080p', mbps: 6.6, plays: true, len: 10800, ch: 6, lang: 'English', subsInFile: ['English', 'Spanish'] } },
  { id: 'c', source: 'provider', lang: 'English', claim: nm('EN| Oppenheimer (2023) 4K UHD'), checked: { res: '1080p', mbps: 2.8, plays: true, len: 10800, ch: 2, lang: 'English' } },
  { id: 'd', source: 'provider', lang: 'English', claim: nm('MULTI| Oppenheimer 2160p DV'), checked: { res: '4K', dv: true, dvProfile: 8, mbps: 22, plays: false, len: 10800, ch: 6, lang: 'English' } },
];
eq('subtitles mocks\' order (detail-copies, player-quality)', ids(rank([O[3], O[2], O[1], O[0]], { langs: ['English', 'Icelandic'], runtime: 181 * 60 })), ['a', 'b', 'c', 'd']);

// ---- review 2 M3: no sound vs language ----
const Edts = { id: 'Edts', source: 'provider', lang: 'English', claim: nm('EN| Film 4K'), checked: { res: '4K', mbps: 20, plays: false, lang: 'English' } };
const Iok = { id: 'Iok', source: 'provider', lang: 'Icelandic', claim: nm('IS| Film 1080p'), checked: { res: '1080p', mbps: 6, plays: true, lang: 'Icelandic' } };
eq('M3: an English copy with DTS-only sound never beats a copy that plays', ids(rank([Edts, Iok], { langs: ['English', 'Icelandic'] })), ['Iok', 'Edts']);
eq('M3: "plays" is decided now (soundbar on: DTS passes through)', ids(rank([Edts, Iok], { langs: ['English', 'Icelandic'], playsNow: (c) => true })), ['Edts', 'Iok']);

// ---- review 2 M3: a longer cut in English vs a dub of the main cut ----
const runtime = 167 * 60;
const Elong = { id: 'Elong', source: 'provider', lang: 'English', claim: nm('EN| Film Extended 4K'), checked: { res: '4K', mbps: 18, plays: true, len: 200 * 60, lang: 'English' } };
const Gmain = { id: 'Gmain', source: 'provider', lang: 'German', claim: nm('DE| Film 4K'), checked: { res: '4K', mbps: 18, plays: true, len: 167 * 60, lang: 'German' } };
const Emain = { id: 'Emain', source: 'provider', lang: 'English', claim: nm('EN| Film FHD'), checked: { res: '1080p', mbps: 7, plays: true, len: 166 * 60, lang: 'English' } };
eq('M3: the only English copy (a longer cut) beats a German dub of the main cut', ids(rank([Gmain, Elong], { langs: ['English'], runtime })), ['Elong', 'Gmain']);
eq('M3: in one language, the main cut beats a better longer cut', ids(rank([Elong, Emain], { langs: ['English'], runtime })), ['Emain', 'Elong']);
eq('the main cut with no IMDb runtime: the most common checked length', ids(rank([Elong, Emain, { ...Emain, id: 'Emain2' }], { langs: ['English'] })), ['Emain', 'Emain2', 'Elong']);

// ---- review 2 M3: kind unknown (every provider copy) vs a TV rip ----
const Pu = { id: 'Pu', source: 'provider', lang: 'English', claim: nm('EN| Film FHD'), checked: { res: '1080p', mbps: 6, plays: true } };
const Tv = { id: 'Tv', source: 'Northlight', order: 1, match: 'sure', lang: 'English', claim: nm('Film.2024.1080p.HDTV.x264.mkv'), checked: { res: '1080p', mbps: 8, plays: true } };
eq('M3: an unknown kind (the provider\'s) ranks above a TV rip of the same class', ids(rank([Tv, Pu])), ['Pu', 'Tv']);
eq('a web copy ranks above an unknown kind', ids(rank([Pu, { ...Tv, id: 'Web', claim: nm('Film.2024.1080p.WEB-DL.mkv') }])), ['Web', 'Pu']);

// ---- review 2 M3: "Shown first" order ----
const En = { id: 'En', source: 'provider', lang: 'English', claim: nm('EN| Film 1080p'), checked: { res: '1080p', mbps: 6, plays: true } };
const Is = { id: 'Is', source: 'provider', lang: 'Icelandic', claim: nm('IS| Film 1080p'), checked: { res: '1080p', mbps: 6, plays: true } };
eq('M3: Shown first = Icelandic, English: Icelandic first', ids(rank([En, Is], { langs: ['Icelandic', 'English'] })), ['Is', 'En']);
eq('M3: Shown first = English, Icelandic: English first (no longer a tie)', ids(rank([Is, En], { langs: ['English', 'Icelandic'] })), ['En', 'Is']);
eq('Multi or unknown come after his languages and before others', ids(rank([{ ...En, id: 'Fr', lang: 'French' }, { ...En, id: 'Mu', lang: 'Multi' }, { ...En, id: 'Is2', lang: 'Icelandic' }], { langs: ['English', 'Icelandic'] })), ['Is2', 'Mu', 'Fr']);

// ---- review 2 M3 and S6: a failed pin, and a pin with no sound right now ----
eq('M3: a pin that failed this session is not first', ids(rank([{ ...Is, pinned: true, failed: true }, En], { langs: ['Icelandic', 'English'] })), ['En', 'Is']);
eq('M3: ... and the Copies menu says why', pinNote([{ ...Is, pinned: true, failed: true }, En]), 'Your pick didn\'t play this time');
eq('S6: a pin with no sound right now (soundbar off) is passed over, and kept', ids(rank([{ ...Edts, pinned: true }, Iok], { langs: ['English', 'Icelandic'] })), ['Iok', 'Edts']);
eq('S6: ... and the Copies menu says why', pinNote([{ ...Edts, pinned: true }, Iok]), 'Your pick has no sound on this TV right now');

// ---- range: HDR10+ counts as HDR10 ----
eq('HDR10+ counts as HDR10 (bitrate decides)', ids(rank([{ ...En, id: 'p10', checked: { res: '4K', hdr: 'HDR10+', mbps: 12, plays: true } }, { ...En, id: 'h10', checked: { res: '4K', hdr: 'HDR10', mbps: 16, plays: true } }])), ['h10', 'p10']);
eq('a starved 4K copy (under 8 Mb/s) ranks with the 1080p ones', ids(rank([{ ...En, id: 's4k', checked: { res: '4K', mbps: 5, plays: true } }, { ...En, id: 'fhd', checked: { res: '1080p', mbps: 7, plays: true } }])), ['fhd', 's4k']);

// ---- RANKING.md 3: the one wait ----
eq('the wait: never for a copy check, on a 3+ connection account', waitPlan({ best: P, uncheckedBetter: [{ id: 'x' }], maxCons: 3 }), { wait: false, budgetMs: 0, for: [] });
eq('the wait: never for a copy check, on a 1 connection account', waitPlan({ best: P, uncheckedBetter: [{ id: 'x' }], maxCons: 1 }), { wait: false, budgetMs: 0, for: [] });
eq('the wait: up to 4 s for an add-on still asking, below 4K', waitPlan({ best: P, asking: [{ name: 'Kestrel' }], maxCons: 3 }), { wait: true, budgetMs: 4000, for: ['Kestrel'] });
eq('the wait: none with a 4K copy in hand', waitPlan({ best: O[0], asking: [{ name: 'Kestrel' }] }).wait, false);

// ---- RANKING.md 4: the match levels ----
const dune = [{ year: 2021 }, { year: 1984 }];
eq('no year, two films: Unsure (asks)', matchLevel({ cand: dune }), 'unsure');
eq('a film with no year and one candidate is Unsure, never Sure', matchLevel({ cand: [{ year: 2024 }] }), 'unsure');
eq('year ±1, one row, no length yet: Likely', matchLevel({ cand: [{ year: 2024 }], year: 2024 }), 'likely');
eq('length within 8%: Sure', matchLevel({ cand: [{ year: 2024 }], year: 2024, len: 166, runtime: 167 }), 'sure');
eq('Oppenheimer: 180 min copy, 181 min on Cinemeta: Sure', matchLevel({ cand: [{ year: 2023 }], year: 2023, len: 180, runtime: 181 }), 'sure');
eq('length off by more than 8%: Unsure (another film or cut)', matchLevel({ cand: [{ year: 2024 }], year: 2024, len: 128, runtime: 167 }), 'unsure');
eq('TMDB ids agree: Sure', matchLevel({ cand: dune, tmdb: 693134, moviedb: 693134 }), 'sure');
eq('a series with no year and one candidate: Likely', matchLevel({ cand: [{ year: 2022 }], kind: 'series' }), 'likely');
eq('an episode skips the length check (Cinemeta has no episode runtimes)', matchLevel({ cand: [{ year: 2022 }], year: 2022, len: 57, runtime: 52, kind: 'episode' }), 'likely');
eq('his pick: Sure', matchLevel({ cand: dune, picked: 'tt1160419' }), 'sure');
eq('S3: subtitles download on Likely', allows('likely').subtitles, true);
eq('S3: subtitles don\'t download on Unsure (it asks)', [allows('unsure').subtitles, allows('unsure').ask], [false, true]);
eq('S3: a Likely match is dropped when the length arrives 8% off', recheck(128, 167), 'drop');
eq('S3: ... and becomes Sure when it agrees', recheck(166, 167), 'sure');

// ---- RANKING.md 5: dubs (review 2 M1) ----
eq('M1: an English copy of The Lion King (United States) is not a dub', isDub({ sound: 'English', country: 'United States' }), false);
eq('M1: an Icelandic copy of The Lion King (United States) is a dub', isDub({ sound: 'Icelandic', country: 'United States' }), true);
eq('M1: an English copy of Touch (Iceland, United Kingdom) is not a dub', isDub({ sound: 'English', country: 'Iceland, United Kingdom' }), false);
eq('M1: an Icelandic copy of Lamb (Iceland, Sweden, Poland, United States) is not a dub', isDub({ sound: 'Icelandic', country: 'Iceland, Sweden, Poland, United States' }), false);
eq('M1: an English copy of Amélie (France, Germany) is a dub', isDub({ sound: 'English', country: 'France, Germany' }), true);
eq('M1: unknown country: not a dub', isDub({ sound: 'Icelandic', country: '' }), false);
eq('M1: a country we can\'t map: not a dub', isDub({ sound: 'English', country: 'Iran' }), false);
eq('M1: a name that says "Með íslensku tali" is a dub', isDub({ sound: 'Icelandic', country: 'United States', nameSaysDub: true }), true);

// ---- add-ons 8.2: placeholders ----
eq('a 30 s clip for a 167 min film is not ready', notReadyByLength(30, 167), true);
eq('a 160 min copy is ready', notReadyByLength(160 * 60, 167), false);

console.log(`\n${n} cases, ${bad} failed`); process.exit(bad ? 1 : 0);
