// Builds ../directions.html (1800 px wide comparison board). node tools/board.js
const fs = require('fs'), path = require('path'); const { PAL } = require('./assets.js'); const c = require('./color.js');
const root = path.join(__dirname, '..');

const REF = { 'IMDb': '#F5C518', 'Plex': '#E5A00D', 'Netflix': '#E50914', 'YouTube': '#FF0000', 'Prime Video': '#00A8E1', 'Hulu': '#1CE783', 'Paramount+': '#0064FF', 'Disney+': '#113CCF', 'Twitch': '#9146FF', 'Letterboxd green': '#00E054', 'Letterboxd orange': '#FF8000', 'Letterboxd blue': '#40BCF4', 'NBA blue': '#1D428A', 'NBA red': '#C8102E' };
const near = (hex) => Object.entries(REF).map(([k, v]) => [k, c.dE(hex, v)]).sort((a, b) => a[1] - b[1])[0];

const D = [
  { slug: 'slate', n: '1', name: 'SLATE', label: 'Cinema · title card', nameNote: 'new name · clash: moderate (Slate AI and SlateCinema are movie-picker apps)',
    idea: 'Every night is take one: the clapper snaps shut and the screen lights up.',
    anim: 'Dark. A spotlight cone fades up. The clapper stick snaps shut with a clack and the orchid play triangle flickers on like neon (3 flickers). SLATE wipes in left to right under the beam, holds, then the beam widens into the home screen. 2.0 s, clack plus a low swell.',
    core: [['ink', PAL.slate.ink], ['chalk', PAL.slate.chalk], ['orchid', PAL.slate.orchid]], accents: [PAL.slate.orchid],
    tags: ['bold cinematic', 'neon + spotlight', 'serif title card'] },
  { slug: 'tipoff', n: '2', name: 'TIPOFF', label: 'Live sports · broadcast energy', nameNote: 'new name · clash: low in search (no streaming app found); sports-boxed',
    idea: 'Game-night energy: a slanted wedge and an italic T that is already moving before you press play.',
    anim: 'Hard cut to navy. A volt wedge wipes in at 12 degrees in three frames with a swish. TIPOFF slams in from the left, the T lands first with a 2-frame camera shake, streaks fly past, and the wedge sweeps off to reveal the home screen. 1.6 s, court squeak plus a hit.',
    core: [['ink', PAL.tipoff.ink], ['volt', PAL.tipoff.volt], ['white', PAL.tipoff.white]], accents: [PAL.tipoff.volt],
    tags: ['live sports', 'motion + angle', 'volt on navy'] },
  { slug: 'airtime', n: '3', name: 'airtime', label: 'Streaming · colour as light', nameNote: 'new name · clash: moderate (Airtime, the group-watch app)',
    idea: 'Time on air: a glowing play button that is also an A, with colour behaving like light.',
    anim: 'A soft bloom opens from the centre. The triangle draws on along its gradient (0.6 s), the play cut-out pops, then colour trails sweep outward like light through a prism. "airtime" rises in with a soft spring. The gradient floods the screen and dissolves into home. 2.2 s, rising shimmer plus a warm chord.',
    core: [['teal', PAL.airtime.c1], ['blue', PAL.airtime.c2], ['magenta', PAL.airtime.c3]], accents: [PAL.airtime.c1, PAL.airtime.c2, PAL.airtime.c3],
    tags: ['play affordance', 'glow + gradient', 'friendly lowercase'] },
  { slug: 'tuner', n: '4', name: 'TUNER', label: 'Test card · broadcast heritage', nameNote: 'keeps TUNER · clash: low for a personal app (tuner hardware apps exist), reads technical; the direction embraces that',
    idea: 'Own the engineering: the colour-bar test card, as party, becomes the T.',
    anim: 'Black. A thin horizontal line opens with a 1 kHz "pip" into a full test card (five bars, 0.4 s). The bars collapse into the T\'s crossbar, the stem drops in, UNER types on, and the card settles into home. 1.8 s, test tone cut to a chord.',
    core: [['ink', PAL.tuner.ink], ['paper', PAL.tuner.paper], ['aqua', PAL.tuner.aqua]], accents: [PAL.tuner.aqua, PAL.tuner.magenta, PAL.tuner.green, PAL.tuner.blue],
    tags: ['broadcast heritage', 'flat colour bars', 'keeps the name'] },
];

const verdict = {
  slate: ['Most "movies" of the four; instantly legible at any size; the white clapper is the strongest icon silhouette.', 'Clapper boards are a cliché (every film app uses one); sports energy is only from the content.', 'Icon: reads. Across the room: the white mark carries; neon glow only helps in the splash.'],
  tipoff: ['Most energy; volt is empty space in the streaming field; the italic T works at 20 px.', 'Name boxes the app as sports; volt tile is loud; italics tire in long text (limited to headings).', 'Icon: the lime tile jumps out. Across the room: the wedge and the italic caps read from far away.'],
  airtime: ['Play affordance is explicit; glow and gradient feel like "screen"; friendliest.', 'Blue/violet/pink gradients are the streaming default, the least ownable palette; the name clashes with the Airtime app.', 'Icon: the gradient tile reads. Across the room: fine, but the cut-out play is small below 48 px.'],
  tuner: ['Keeps the name and turns "engineering" into charm; test card is unmistakably TV; most flexible motif (bars as dividers).', 'Most playful, least "awesome"; five-colour crossbar is busy at 16 px; name still reads technical.', 'Icon: colourful T pops from dark. Across the room: the bars carry; the stem alone is plain.'],
};

const sw = (arr) => arr.map(([n, h]) => `<span class="sw"><i style="background:${h}"></i><b>${n}</b>${h}</span>`).join('');
const adj = (d) => d.accents.map(h => { const [k, v] = near(h); return `<span class="adj ${v < 8 ? 'close' : ''}">${h} nearest ${k} (${v.toFixed(1)})</span>`; }).join('');
const card = (d) => `<section class="card">
  <div class="ch"><span class="num">${d.n}</span><div><h2>${d.name}</h2><div class="lbl">${d.label}</div></div><div class="nm">Name: <b>${d.name}</b><br><span>${d.nameNote}</span></div></div>
  <p class="idea">${d.idea}</p>
  <div class="assets">
    <figure><img class="mk" src="${d.slug}/mark.svg" alt=""><figcaption>mark</figcaption></figure>
    <figure><img class="lk" src="${d.slug}/lockup.svg" alt=""><figcaption>lockup</figcaption></figure>
    <figure><img class="ic" src="${d.slug}/icon.svg" alt=""><figcaption>app icon</figcaption></figure>
    <figure><img class="ic s" src="${d.slug}/icon.svg" alt=""><img class="ic xs" src="${d.slug}/icon.svg" alt=""><figcaption>96 / 48 px</figcaption></figure>
  </div>
  <div class="mid"><figure><img class="bn" src="${d.slug}/banner.svg" alt=""><figcaption>Google TV banner 320×180 (shown 1.3×)</figcaption></figure>
    <div><div class="h">3-colour core</div><div class="sws">${sw(d.core)}</div><div class="h" style="margin-top:12px">Distance from known brand colours (reported values, ΔE×100; under 8 is close)</div><div class="advs">${adj(d)}</div></div></div>
  <img class="tv" src="${d.slug}-tv.png" alt="${d.name} TV home mock">
  <div class="cap">Rail + home at 1080p (rail carries the mark only; the lockup never shares this screen).</div>
  <div class="anim"><b>Launch:</b> ${d.anim}</div>
  <ul class="vd"><li><b>+</b> ${verdict[d.slug][0]}</li><li><b>−</b> ${verdict[d.slug][1]}</li><li><b>↔</b> ${verdict[d.slug][2]}</li></ul>
</section>`;

// launcher adjacency strip: each icon among generic tiles in reference brand colours (colour only, no logos)
const refTile = (k, hex, dark) => `<div class="rt" style="background:${hex};color:${dark ? '#111' : '#fff'}"><span>${k}</span></div>`;
const strip = (d) => `<div class="lrow"><div class="lname">${d.name}</div><div class="tiles">${refTile('IMDb', REF.IMDb, 1)}${refTile('Plex', '#1F2326', 0).replace('<span>', '<span style="color:#E5A00D">')}${refTile('Netflix', '#141414', 0).replace('<span>', '<span style="color:#E50914">')}${refTile('Prime', '#0F171E', 0).replace('<span>', '<span style="color:#00A8E1">')}${refTile('Hulu', '#0B0C0F', 0).replace('<span>', '<span style="color:#1CE783">')}<img src="${d.slug}/icon.svg" alt=""></div></div>`;

const names = [
  ['TUNER', 'keep', 'clean, short, but reads as radio/hardware; real "tuner" apps exist (HDHomeRun, D-Link TV Tuner, TV Mosaic)'],
  ['TIPOFF', 'ok', 'live basketball, two clear syllables; no streaming app found; sports-only'],
  ['SLATE', 'ok', 'film set and broadcast holding card; movie-picker apps share it'],
  ['AIRTIME', 'ok', 'on air + hang time; the Airtime group-watch app'],
  ['SPOOL', 'ok', 'film reel, "spool up"; no hit in search; weak on sport'],
  ['FRONT ROW', 'maybe', 'best seat in the house; Apple once shipped a media app called Front Row; two words'],
  ['COURTSIDE', 'avoid', 'perfect feel; Courtside 1891 (FIBA) is a basketball streaming app'],
  ['CUE', 'avoid', 'CUE Broadcast is a live-TV streaming service'],
  ['BUZZER', 'avoid', 'Buzzer is a sports app that distributed NBA League Pass'],
  ['MARQUEE', 'avoid', 'Marquee Sports Network has its own app on connected TVs'],
];

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Tuner v3: four directions</title><style>
@font-face{font-family:"Inter V";src:url(fonts/inter-latin-wght-normal.woff2) format("woff2-variations");font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{width:1800px;background:#0b0c10;color:#eceef4;font:14px/1.45 "Inter V",sans-serif;padding:56px 64px 72px}
h1{font-size:44px;font-weight:800;letter-spacing:-.02em}.sub{color:#9aa1b4;font-size:18px;margin:8px 0 28px;max-width:1500px}
.research{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:34px}
.research div{background:#14161d;border:1px solid #232634;border-radius:14px;padding:16px 18px;font-size:13px;color:#b7bdce}.research b{display:block;color:#fff;font-size:13px;margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:28px}
.card{background:#12141b;border:1px solid #232634;border-radius:22px;padding:26px 28px}
.ch{display:flex;gap:16px;align-items:center}.num{width:44px;height:44px;border-radius:50%;background:#fff;color:#000;display:grid;place-items:center;font-weight:800;font-size:20px}
.ch h2{font-size:30px;font-weight:800;letter-spacing:-.01em}.lbl{color:#9aa1b4;font-size:13px}
.nm{margin-left:auto;text-align:right;font-size:12px;color:#9aa1b4;max-width:420px}.nm b{color:#fff;font-size:14px}
.idea{font-size:19px;margin:14px 0 16px;color:#fff;font-weight:600;line-height:1.35}
.assets{display:flex;gap:26px;align-items:flex-end;background:#0b0c10;border-radius:14px;padding:18px 22px}
.assets figure{display:flex;flex-direction:column;gap:8px;align-items:center}figcaption{font-size:11px;color:#8087a0;letter-spacing:.06em;text-transform:uppercase;text-align:center}
.mk{height:120px}.lk{height:84px;max-width:420px}.ic{height:120px;border-radius:22%}.ic.s{height:56px;display:inline-block}.ic.xs{height:30px;display:inline-block;margin-left:8px}
.assets figure:last-child{flex-direction:column}
.mid{display:flex;gap:22px;margin:16px 0;align-items:flex-start}.bn{width:416px;height:234px;border-radius:8px;display:block;outline:1px solid #2a2e3d}
.h{font-size:11px;color:#8087a0;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}
.sws{display:flex;gap:10px}.sw{display:flex;flex-direction:column;font-size:11px;color:#9aa1b4;width:104px}.sw i{height:44px;border-radius:8px;margin-bottom:6px;border:1px solid #ffffff22}.sw b{color:#fff;font-size:12px}
.advs{display:flex;flex-direction:column;gap:5px}.adj{font-size:12px;color:#aab0c4}.adj.close{color:#ffb4b4}
.tv{width:100%;border-radius:10px;display:block;outline:1px solid #2a2e3d;margin-top:6px}.cap{font-size:11px;color:#8087a0;margin:6px 0 12px}
.anim{font-size:13px;color:#c3c8d8;margin-bottom:12px}.anim b{color:#fff}
.vd{list-style:none;padding:0;display:flex;flex-direction:column;gap:6px;font-size:13px;color:#c3c8d8}.vd b{display:inline-block;width:20px;color:#fff}
h3.sec{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#9aa1b4;margin:40px 0 14px}
.lrow{display:flex;gap:18px;align-items:center;margin-bottom:10px}.lname{width:100px;font-weight:700}.tiles{display:flex;gap:12px;background:#07080b;padding:14px;border-radius:16px}
.tiles>*{width:120px;height:120px;border-radius:26px;display:block}.rt{display:grid;place-items:center;font-weight:800;font-size:15px;letter-spacing:.04em;text-transform:uppercase}
.nt{width:100%;border-collapse:collapse;font-size:13px}.nt td{padding:8px 12px;border-bottom:1px solid #232634;color:#c3c8d8}.nt td:first-child{color:#fff;font-weight:700;width:140px}.nt td:nth-child(2){width:90px;font-weight:700}
.keep{color:#9bff9b}.ok{color:#d9f08a}.maybe{color:#ffd28a}.avoid{color:#ff9a9a}
</style></head><body>
<h1>Tuner v3 — four directions</h1>
<p class="sub">Concept-level restart. Each direction pairs a name, a mark, a palette and a motion idea. No tokens or full system yet: pick a direction (and a name), then it gets polished. LIVE is the only red in any of them; errors are neutral (✕ + text). No amber or yellow anywhere (IMDb, Plex and DAZN own it).</p>
<div class="research">
  <div><b>One gesture, one motion, one sound</b>Netflix ribbon + "tudum", Disney+'s arc leading to the +, Paramount+'s mountain and stars, Peacock's fluttering feathers: the mark is a moment, not a logo.</div>
  <div><b>Light on dark</b>Marquee bulb grids, spotlight cones, CRT/neon glow, bloom: entertainment brands glow. Flat tiles do not feel like a night in.</div>
  <div><b>Colour energy, but a free hue</b>Blue and violet are the streaming default; red, green, yellow/amber and orange are taken (Netflix, Hulu, IMDb/Plex, Letterboxd). Open: volt lime, orchid, teal/magenta.</div>
  <div><b>Broadcast language</b>Slanted wipes and bugs (ESPN's fixed angle, DAZN's line motif), tally lights, lower thirds, SMPTE bars, film-leader slate: instantly "TV" and "live".</div>
  <div><b>Fits a couch</b>Big, bold, one focus at a time, 5% safe margins, one primary action; a short name that is easy to say; avoid boxing the app into one genre.</div>
</div>
<div class="grid">${D.map(card).join('')}</div>
<h3 class="sec">Launcher adjacency · each icon among generic tiles in IMDb / Plex / Netflix / Prime / Hulu colours (colour only, not their logos)</h3>
${D.map(strip).join('')}
<h3 class="sec">Name shortlist (full checks in NAMES.md)</h3>
<table class="nt">${names.map(n => `<tr><td>${n[0]}</td><td class="${n[1]}">${n[1]}</td><td>${n[2]}</td></tr>`).join('')}</table>
</body></html>`;
fs.writeFileSync(path.join(root, 'directions.html'), html);
console.log('directions.html written');
