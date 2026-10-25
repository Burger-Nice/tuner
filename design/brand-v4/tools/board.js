// Builds ../directions.html (1800 px wide). node tools/board.js
const fs = require('fs'), path = require('path'); const A = require('./assets.js'); const c = require('./color.js');
const { P } = A; const root = path.join(__dirname, '..');
const REF = { 'IMDb': '#F5C518', 'Plex': '#E5A00D', 'Netflix': '#E50914', 'YouTube': '#FF0000', 'Prime Video': '#00A8E1', 'Hulu': '#1CE783', 'Paramount+': '#0064FF', 'Disney+': '#113CCF', 'Twitch': '#9146FF', 'Letterboxd blue': '#40BCF4', 'LIVE red': '#FF4B4B' };
const near = (hex) => Object.entries(REF).map(([k, v]) => [k, c.dE(hex, v)]).sort((a, b) => a[1] - b[1]).slice(0, 2);
const adj = (hexes) => hexes.map(([n, h]) => { const [a, b] = near(h); return `<div class="adj ${a[1] < 8 ? 'close' : ''}"><i style="background:${h}"></i>${n} ${h} · nearest ${a[0]} ${a[1].toFixed(1)}, ${b[0]} ${b[1].toFixed(1)}</div>`; }).join('');

const V = [
  { slug: 'airglow', n: 'A', title: 'Echo', sub: 'gradient and light, closest to airtime', name: 'airglow', alts: [['airtime', 'airtime', 'Outfit', 'the name he liked; collides with the Airtime group-watch app']],
    idea: 'The play button leaves colour echoes behind it, like light still glowing on the sky after the picture moves.',
    mark: 'Soft rounded play triangle in a pink to orchid gradient with two colour echoes trailing left (orchid, deep violet).',
    anim: 'Dark, then the front triangle slides in from the right and leaves its two echoes behind (0.5 s). The echoes stretch into a gradient streak across the screen, the wordmark rises through it and the streak floods the screen and dissolves into home (the slanted hero edge is the wipe). 2.0 s, shimmer plus a warm chord.',
    core: [['ink', P.ink], ['chalk', P.chalk], ['orchid', P.orchid]], ext: [['pink', P.pink], ['deep violet', P.violet]],
    accents: [['orchid', P.orchid], ['pink', P.pink], ['deep violet', P.violet]], slant: 'light: 8° edge on the hero, wipes',
    verdict: ['The gradient and glow he asked for, in his SLATE colours; friendliest; the name is the closest to the airtime he liked; works as a splash animation.', 'The mark can read as a skip / fast-forward button; the pink to violet gradient sits near Instagram-style gradients and Twitch purple (deep violet is 12.5 from Twitch); slant is the weakest of the three.', 'Icon: gradient tile reads at 48 px; at 24 px the echoes fuse into a pink triangle (still fine). Across the room: soft, glowing, readable; the least edgy.'] },
  { slug: 'flare', n: 'B', title: 'Streak', sub: 'slant and energy, closest to tipoff', name: 'FLARE', alts: [['tipoff', 'TIPOFF', 'Barlow', 'the name he loved; sports-only']],
    idea: 'An anamorphic lens streak slices a slanted play wedge: the flash of a camera, the glare of a screen, a flare shot at a game.',
    mark: 'Chalk play wedge skewed 10° with an orchid motion bar and a horizontal light streak (orchid to chalk to pink) through it.',
    anim: 'Black. A thin streak ignites across the screen (0.2 s) with a camera-flash pop, a slanted orchid wedge wipes in behind it, and FLARE slams in italic from the left, the play wedge landing first. The streak sweeps right and off, taking the wedge with it to reveal home. 1.5 s, flash pop plus a rising whoosh.',
    core: [['ink', P.ink], ['chalk', P.chalk], ['orchid', P.orchid]], ext: [['pink', P.pink]],
    accents: [['orchid', P.orchid], ['pink', P.pink]], slant: 'strong: 10° mark, 12° buttons and tiles, 14° wedge',
    verdict: ['The most ownable: slant plus streak is one gesture you can describe; it carries TIPOFF\'s energy without lime or sports-only; the streak is cinematic (anamorphic) and the wedge is broadcast; the orchid tile is unmistakable in a launcher row.', 'Italic caps lean sporty for a quiet movie night; the streak crossing the lockup is busy at small sizes; an orchid solid tile is loud in a dark room; FLARE has a low-to-moderate name clash (Cox\'s old Flare MeTV, FlareFlow).', 'Icon: the strongest tile at every size (the streak survives 24 px). Across the room: the slanted wedge and italic caps read from far away.'] },
  { slug: 'skylit', n: 'C', title: 'Premiere', sub: 'cinema first, closest to SLATE', name: 'SKYLIT', alts: [['primetime', 'PRIMETIME', 'Playfair', 'broadcast term; generic, ten letters']],
    idea: 'A premiere night: a projector beam, a title card, a play button that is also the lens.',
    mark: 'Big chalk play triangle with a projector cone of light (violet to orchid to pink, chalk core) rising to the right.',
    anim: 'Dark. A single slanted beam sweeps up from the lower left like a premiere searchlight and finds the play triangle (0.6 s, soft hum). SKYLIT letters appear one by one in the beam, then the beam widens and fills the hero, which becomes the home screen. 2.2 s, low swell plus a bright chime.',
    core: [['ink', P.ink], ['chalk', P.chalk], ['orchid', P.orchid]], ext: [['pink', P.pink], ['deep violet', P.violet]],
    accents: [['orchid', P.orchid], ['pink', P.pink], ['deep violet', P.violet]], slant: 'medium: 24° beam as the hero device; static mark',
    verdict: ['Most cinematic and closest to SLATE\'s feel (chalk, orchid, serif title card); the chalk tile is the only light tile in the row; the projector idea says movies, premiere and screens at once.', 'Reads movies more than live sports; serif hairlines blur at distance; the play-plus-cone mark can read as a skip button; "Skylit" is an unfamiliar spelling with no hits in search but is unverified.', 'Icon: the chalk tile pops from dark tiles; the cone thins out at 24 px and becomes a small purple tick. Across the room: the beam in the hero is clear; the serif wordmark is the least sturdy.'] },
];

const refTile = (k, bg, fg) => `<div class="rt" style="background:${bg};color:${fg}"><span>${k}</span></div>`;
const row = (v) => `<div class="tiles">${refTile('IMDb', '#F5C518', '#111')}${refTile('Plex', '#1F2326', '#E5A00D')}${refTile('Netflix', '#141414', '#E50914')}${refTile('Prime', '#0F171E', '#00A8E1')}${refTile('Hulu', '#0B0C0F', '#1CE783')}${refTile('Twitch', '#9146FF', '#fff')}${refTile('Paramount+', '#0064FF', '#fff')}<img src="${v.slug}/icon.svg" alt=""></div>`;
const sizeCheck = (v) => `<div class="sizes"><img src="${v.slug}/icon.svg" width="96" style="border-radius:22%"><img src="${v.slug}/icon.svg" width="48" style="border-radius:22%"><img src="${v.slug}/icon.svg" width="24" style="border-radius:22%"><span class="sep"></span><img class="dk" src="${v.slug}/mark.svg" height="48"><img class="dk" src="${v.slug}/mark.svg" height="24"><span class="sep"></span><img class="dk" src="${v.slug}/lockup.svg" height="40"><img class="dk" src="${v.slug}/lockup.svg" height="22"><span class="sep"></span><span style="filter:blur(2px);display:flex;gap:10px;align-items:center"><img class="dk" src="${v.slug}/lockup.svg" height="40"><img src="${v.slug}/icon.svg" width="56" style="border-radius:22%"></span></div><div class="cap">icon 96 / 48 / 24 px · mark 48 / 24 px · lockup 40 / 22 px tall · blurred = across the room</div>`;
const sw = (arr) => arr.map(([n, h]) => `<span class="sw"><i style="background:${h}"></i><b>${n}</b>${h}</span>`).join('');
const card = (v) => `<section class="card">
  <div class="head"><span class="num">${v.n}</span><div><h2>${v.title} <small>· ${v.name}</small></h2><div class="lbl">${v.sub}</div></div><div class="nm">Name: <b>${v.name}</b><br><span>also tried here: ${v.alts.map(a => `${a[1]} (${a[3]})`).join('; ')}</span></div></div>
  <p class="idea">${v.idea}</p>
  <div class="cols">
    <div class="l">
      <div class="assets">
        <figure><img class="mk dk" src="${v.slug}/mark.svg" alt=""><figcaption>mark</figcaption></figure>
        <figure><img class="lk dk" src="${v.slug}/lockup.svg" alt=""><figcaption>lockup</figcaption></figure>
        <figure><img class="ic" src="${v.slug}/icon.svg" alt=""><figcaption>app icon</figcaption></figure>
      </div>
      <div class="alts">${v.alts.map(a => `<span><span class="dk altw">${A.altWord(a[0])}</span><i>${a[1]} as an alternative</i></span>`).join('')}</div>
      <p class="small">${v.mark}</p>
      <figure style="margin-top:14px"><img class="bn" src="${v.slug}/banner.svg" alt=""><figcaption>Google TV banner 320×180 (shown 1.4×)</figcaption></figure>
      <div class="h" style="margin-top:14px">Palette: 3-colour core plus gradient extension</div><div class="sws">${sw(v.core)}${sw(v.ext)}</div>
      <div class="h" style="margin-top:14px">Accent distance from known brand colours (reported values, ΔE×100; under 8 is close)</div>${adj(v.accents)}
      <div class="h" style="margin-top:14px">Slant: ${v.slant}</div>
    </div>
    <div class="r">
      <img class="tv" src="${v.slug}-tv.png" alt=""><div class="cap">Rail + home at 1080p: the rail carries the mark only; the lockup never shares this screen.</div>
      <div class="h" style="margin-top:14px">Launcher-row check (icon among IMDb / Plex / Netflix / Prime / Hulu / Twitch / Paramount+ colours)</div>${row(v)}
      <div class="h" style="margin-top:14px">Icon-size check</div>${sizeCheck(v)}
      <div class="anim"><b>Launch:</b> ${v.anim}</div>
      <ul class="vd"><li><b>+</b> ${v.verdict[0]}</li><li><b>−</b> ${v.verdict[1]}</li><li><b>↔</b> ${v.verdict[2]}</li></ul>
    </div>
  </div>
</section>`;

const names = [['AIRGLOW', 'ok', 'air + glow: on air, and the light left in the sky; no app found in search'], ['airtime', 'maybe', 'the name he liked; the Airtime group-watch app is the confusion'], ['FLARE', 'ok', 'lens flare, flash, signal flare; Flare MeTV (Cox, 2015) and FlareFlow are minor echoes'], ['TIPOFF', 'ok', 'carried from v3; sports-only; no streaming app found'], ['SKYLIT', 'ok', 'searchlights and projector beams; no app found; unfamiliar spelling'], ['PRIMETIME', 'ok', 'show time; generic, ten letters; no consumer app found'], ['ONAIR', 'maybe', 'says live, but a generic phrase nobody can own'], ['LUMEN', 'avoid', 'an independent-cinema streaming app and an IPTV player case study share it'], ['BEAM', 'avoid', 'Beam TV+, BeamStream TV and others'], ['AFTERGLOW', 'avoid', 'Afterglow TV, a Plex-powered live-channel app on Android TV']];
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Tuner v4: three hybrids</title><style>
@font-face{font-family:"Inter V";src:url(fonts/inter-latin-wght-normal.woff2) format("woff2-variations");font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{width:1800px;background:#0b0a10;color:#eceef4;font:14px/1.45 "Inter V",sans-serif;padding:56px 64px 72px}
h1{font-size:44px;font-weight:800;letter-spacing:-.02em}.sub{color:#a29fb4;font-size:18px;margin:8px 0 22px;max-width:1550px}
.mix{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:30px}.mix div{background:#14121c;border:1px solid #272332;border-radius:14px;padding:16px 18px;font-size:13px;color:#b9b5cc}.mix b{display:block;color:#fff;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px}
.card{background:#12101a;border:1px solid #272332;border-radius:22px;padding:26px 28px;margin-bottom:28px}
.head{display:flex;gap:16px;align-items:center}.num{width:44px;height:44px;border-radius:50%;background:#fff;color:#000;display:grid;place-items:center;font-weight:800;font-size:20px}
h2{font-size:32px;font-weight:800}h2 small{font-size:22px;color:#a29fb4;font-weight:600}.lbl{color:#a29fb4;font-size:13px}
.nm{margin-left:auto;text-align:right;font-size:12px;color:#a29fb4;max-width:520px}.nm b{color:#fff;font-size:15px}
.idea{font-size:19px;margin:12px 0 16px;color:#fff;font-weight:600}
.cols{display:grid;grid-template-columns:660px minmax(0,1fr);gap:28px}.cols>*{min-width:0}
.assets{display:flex;gap:22px;align-items:flex-end;background:#08070c;border-radius:14px;padding:16px 20px}
figure{display:flex;flex-direction:column;gap:8px;align-items:flex-start}figcaption,.cap{font-size:11px;color:#8b88a0;letter-spacing:.06em;text-transform:uppercase}.cap{margin:6px 0}
.mk{height:120px}.lk{height:84px;max-width:330px}.ic{height:120px;border-radius:22%}.dk{background:#0C0B12}
.alts{margin-top:10px;display:flex;gap:18px}.alts>span{display:flex;gap:14px;align-items:center;background:#08070c;border-radius:12px;padding:10px 16px}.altw svg{height:34px;width:auto;display:block}.alts i{font-style:normal;font-size:11px;color:#8b88a0}
.small{font-size:12px;color:#b9b5cc;margin-top:10px}
.bn{width:440px;height:248px;border-radius:8px;outline:1px solid #2c2838;display:block}
.h{font-size:11px;color:#8b88a0;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}
.sws{display:flex;gap:8px;flex-wrap:wrap}.sw{display:flex;flex-direction:column;font-size:11px;color:#a29fb4;width:96px}.sw i{height:36px;border-radius:8px;margin-bottom:5px;border:1px solid #ffffff22}.sw b{color:#fff;font-size:12px}
.adj{display:flex;gap:10px;align-items:center;font-size:12px;color:#b9b5cc;margin-bottom:4px}.adj i{width:16px;height:16px;border-radius:4px;display:inline-block}.adj.close{color:#ffb4b4}
.tv{width:100%;border-radius:10px;display:block;outline:1px solid #2c2838}
.tiles{display:flex;gap:10px;background:#050408;padding:12px;border-radius:16px}.tiles>*{width:78px;height:78px;border-radius:19px;display:block;flex:none}.rt{display:grid;place-items:center;font-weight:800;font-size:11px;letter-spacing:.03em;text-transform:uppercase}
.sizes{display:flex;flex-wrap:wrap;gap:14px;align-items:center;background:#3a3846;padding:14px 18px;border-radius:14px}.sizes .sep{width:1px;height:50px;background:#ffffff33}
.anim{font-size:13px;color:#cdcade;margin:14px 0 10px}.anim b{color:#fff}
.vd{list-style:none;padding:0;display:flex;flex-direction:column;gap:6px;font-size:13px;color:#cdcade}.vd b{display:inline-block;width:20px;color:#fff}
h3.sec{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#a29fb4;margin:36px 0 12px}
.nt{width:100%;border-collapse:collapse;font-size:13px}.nt td{padding:8px 12px;border-bottom:1px solid #272332;color:#cdcade}.nt td:first-child{color:#fff;font-weight:700;width:140px}.nt td:nth-child(2){width:90px;font-weight:700}
.ok{color:#d9f08a}.maybe{color:#ffd28a}.avoid{color:#ff9a9a}
</style></head><body>
<h1>Tuner v4: three hybrids</h1>
<p class="sub">His taste signals, absorbed rather than checklisted: airtime's gradient, glow and play button; SLATE's ink, chalk and orchid (the name is retired: it is his other project); TIPOFF's slant as a wipe and layout device, without the lime or the sports-only feel. Red is for LIVE only; there is no amber or yellow; the mark and the lockup never share a screen. All three sit in the same palette so the choice is the idea and the name, not the colour.</p>
<div class="mix"><div><b>Gradient with a purpose</b>pink, orchid and deep violet: the gradient is the glow, not a decoration. Nearest brand colours: Twitch (deep violet, 12.5), YouTube (pink, 18.9), see each card.</div><div><b>Slant as motion</b>the wedge and the wipe are the transition language, not just the look: every launch animation ends in a slanted reveal.</div><div><b>TV, shows, movies, live</b>the home screen leads with a live game and then your shows; the same chrome serves a film night without changing.</div></div>
${V.map(card).join('')}
<h3 class="sec">Name shortlist this round (full checks in NAMES.md)</h3>
<table class="nt">${names.map(n => `<tr><td>${n[0]}</td><td class="${n[1]}">${n[1]}</td><td>${n[2]}</td></tr>`).join('')}</table>
</body></html>`;
fs.writeFileSync(path.join(root, 'directions.html'), html); console.log('directions.html written');
