// TV home mock (1920x1080) for each direction: rail with the standalone mark (no lockup on this screen), live game hero, continue watching, live channels.
// node tools/mock.js  ->  writes <slug>-tv.html next to the folders (render with tools/render.js)
const fs = require('fs'), path = require('path'); const { P, LIVE } = require('./assets.js');
const root = path.join(__dirname, '..');

const FONTS = `
@font-face{font-family:"Inter V";src:url(fonts/inter-latin-wght-normal.woff2) format("woff2-variations");font-weight:100 900}
@font-face{font-family:"Playfair";src:url(fonts/playfair-display-latin-900-normal.woff2) format("woff2");font-weight:900}
@font-face{font-family:"BarlowC";src:url(fonts/barlow-condensed-latin-800-italic.woff2) format("woff2");font-weight:800;font-style:italic}
@font-face{font-family:"BarlowCN";src:url(fonts/barlow-condensed-latin-700-normal.woff2) format("woff2");font-weight:700}
@font-face{font-family:"OutfitB";src:url(fonts/outfit-latin-700-normal.woff2) format("woff2");font-weight:700}
@font-face{font-family:"OutfitM";src:url(fonts/outfit-latin-500-normal.woff2) format("woff2");font-weight:500}
@font-face{font-family:"Grotesk";src:url(fonts/space-grotesk-latin-700-normal.woff2) format("woff2");font-weight:700}`;

const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="44" height="44">${d}</svg>`;
const ICONS = [
  icon('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),                                // home
  icon('<circle cx="12" cy="12" r="3"/><path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>'),          // live
  icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'), // movies
  icon('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M8 3l4 3 4-3"/>'),                          // shows
  icon('<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>'),                                             // search
];

const POSTERS = [
  ['Harbor Lights', 'S2 · E4', 'linear-gradient(160deg,#1c4a5a,#0b1a24 70%)', 62],
  ['The Long Take', 'Film · 1h 48m', 'linear-gradient(160deg,#6a3a2a,#1a0e10 70%)', 28],
  ['Night Circuit', 'S1 · E9', 'linear-gradient(160deg,#3b2f6a,#0d0a1f 70%)', 85],
  ['Paper Moons', 'S3 · E1', 'linear-gradient(160deg,#2c5a3a,#0a1710 70%)', 12],
];
const CHANNELS = [['01', 'NBA Pass', 'Grizzlies @ GSW'], ['02', 'ESPN HD', 'SportsCenter'], ['03', 'NBA TV', 'Game Time'], ['04', 'Movies 24/7', 'Heat (1995)'], ['05', 'Doc Channel', 'Planet Earth']];

const GR = 'linear-gradient(100deg,#FF5CB8,#E04BFF 55%,#5B2BD9)';
const DIR = {
  airglow: {
    title: 'Tonight', body: 'd-airglow',
    vars: `--ink:#0C0B12;--s1:#171420;--s2:#221C30;--text:#F3EFE6;--text2:#BDB7CB;--acc:#E04BFF;--disp:"OutfitB",sans-serif;--text-f:"OutfitM",sans-serif;--r:34px;--grad:${GR};`,
    css: `
.hero{clip-path:polygon(0 0,100% 0,calc(100% - 56px) 100%,0 100%)}
.hero-art{background:radial-gradient(640px 400px at 8% 115%,rgba(255,92,184,.55),transparent 70%),radial-gradient(760px 420px at 60% -25%,rgba(224,75,255,.5),transparent 70%),radial-gradient(700px 440px at 100% 100%,rgba(91,43,217,.95),transparent 70%),#120f1d}
.hero-art:after{content:"";position:absolute;right:120px;top:40px;width:430px;height:310px;background:var(--grad);clip-path:polygon(18% 0,100% 50%,18% 100%);opacity:.2;border-radius:40px}
h1,h2,h3{font-family:var(--disp);font-weight:700;letter-spacing:-.01em}
h2{font-size:68px;line-height:1.02}h2 em{font-style:normal;background:var(--grad);-webkit-background-clip:text;color:transparent}
.score b{font-family:var(--disp);font-size:92px}
.primary{background:var(--grad);color:var(--ink);border-radius:999px;font-family:var(--disp)}
.primary.f{box-shadow:0 0 0 5px #0C0B12,0 0 0 9px #fff,0 0 64px 16px rgba(224,75,255,.55)}
.ghost{border:3px solid rgba(243,239,230,.55);border-radius:999px}
.prog i{background:var(--grad)}
.poster{border-radius:30px}.tile{border-radius:26px}
.rail .on{color:#fff;filter:drop-shadow(0 0 12px #E04BFF)}`,
  },
  flare: {
    title: 'Tonight', body: 'd-flare',
    vars: `--ink:#0C0B12;--s1:#171420;--s2:#221C30;--text:#F3EFE6;--text2:#BDB7CB;--acc:#E04BFF;--disp:"BarlowC",sans-serif;--text-f:"Inter V",sans-serif;--r:0px;--grad:linear-gradient(100deg,#E04BFF,#FF5CB8);`,
    css: `
.hero-art{background:#120f1d}
.hero-art:before{content:"";position:absolute;right:-70px;top:0;bottom:0;width:560px;background:var(--grad);transform:skewX(-14deg)}
.hero-art:after{content:"";position:absolute;left:0;right:0;top:46%;height:4px;margin-top:-2px;background:linear-gradient(90deg,transparent,#E04BFF 20%,#F3EFE6 52%,#FF5CB8 82%,transparent);box-shadow:0 0 36px 6px rgba(224,75,255,.55)}
.hero-body{z-index:2}
h1,h2,h3{font-family:var(--disp);font-weight:800;font-style:italic;text-transform:uppercase;letter-spacing:.01em}
h1{font-size:88px}h2{font-size:100px;line-height:.95;text-shadow:0 4px 0 rgba(12,11,18,.5)}h2 em{color:var(--acc);font-style:italic}
.eyebrow{font-family:"BarlowCN";font-weight:700;font-size:30px;letter-spacing:.14em;text-transform:uppercase}
.score .team{font-family:"BarlowCN";font-weight:700;font-size:32px;letter-spacing:.08em;color:var(--text)}.score i{background:#c9bfe8}.score .w i{background:#F3EFE6}
.score b{font-family:var(--disp);font-style:italic;font-weight:800;font-size:112px;line-height:.9;text-shadow:0 4px 0 rgba(12,11,18,.5)}
.primary,.ghost,.live{transform:skewX(-12deg);border-radius:0}.primary span,.ghost span,.live span{display:inline-block;transform:skewX(12deg)}
.primary{background:var(--text);color:var(--ink);font-family:var(--disp);font-style:italic;font-size:40px;text-transform:uppercase}
.primary.f{box-shadow:0 0 0 4px #0C0B12,0 0 0 8px #E04BFF,0 0 40px 8px rgba(224,75,255,.5)}
.ghost{border:3px solid var(--text);font-family:var(--disp);font-style:italic;text-transform:uppercase;font-size:34px;background:rgba(12,11,18,.6)}
.prog i{background:var(--grad)}
.poster,.tile{border-radius:0;transform:skewX(-8deg);overflow:hidden}.poster>*,.tile>*{transform:skewX(8deg)}
.rail .on{color:var(--acc)}
h3{font-size:44px}`,
  },
  skylit: {
    title: 'Tonight', body: 'd-skylit',
    vars: `--ink:#0C0B12;--s1:#171420;--s2:#221C30;--text:#F3EFE6;--text2:#BDB7CB;--acc:#E04BFF;--disp:"Playfair",serif;--text-f:"Inter V",sans-serif;--r:10px;--grad:linear-gradient(100deg,#E04BFF,#FF5CB8);`,
    css: `
.hero-art{background:#100e18}
.hero-art:before{content:"";position:absolute;left:820px;right:-200px;top:-120px;height:700px;transform-origin:0 100%;filter:blur(16px);transform:translateY(0) skewY(-24deg);background:linear-gradient(90deg,rgba(243,239,230,.0),rgba(224,75,255,.45) 40%,rgba(255,92,184,.0) 100%);}
.hero-art:after{content:"";position:absolute;left:820px;right:-100px;top:60px;height:70px;transform-origin:0 100%;filter:blur(10px);transform:skewY(-24deg);background:linear-gradient(90deg,rgba(243,239,230,.35),transparent 70%)}
.hero-body{z-index:2}
h1,h2,h3{font-family:var(--disp);font-weight:900;letter-spacing:.01em}
h2{font-size:68px;line-height:1.05}h2 em{font-style:italic;color:var(--acc)}
.score b{font-family:var(--disp);font-size:84px}
.primary{background:var(--text);color:var(--ink);border-radius:8px}
.primary.f{box-shadow:0 0 0 4px #0C0B12,0 0 0 8px #fff,0 0 52px 12px rgba(224,75,255,.55)}
.ghost{border:3px solid var(--text2);border-radius:8px}
.prog i{background:var(--grad)}
.poster{border-radius:8px}.tile{border-radius:8px}
.rail .on{color:var(--acc)}`,
  },
};

const page = (slug) => {
  const d = DIR[slug];
  const rail = ICONS.map((s, i) => `<div class="ri${i === 0 ? ' on' : ''}">${s}</div>`).join('');
  const posters = POSTERS.map(p => `<div class="poster" style="background:${p[2]}"><div class="pt"><b>${p[0]}</b><span>${p[1]}</span></div><div class="prog"><i style="width:${p[3]}%"></i></div></div>`).join('');
  const tiles = CHANNELS.map(c => `<div class="tile"><span class="n">${c[0]}</span><div><b>${c[1]}</b><span>${c[2]}</span></div></div>`).join('');
  const bulbs = '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
:root{${d.vars}}
*{box-sizing:border-box;margin:0}
html,body{width:1920px;height:1080px;overflow:hidden;background:var(--ink);color:var(--text);font-family:var(--text-f);font-size:30px}
.rail{position:absolute;left:0;top:0;bottom:0;width:150px;background:rgba(255,255,255,.025);display:flex;flex-direction:column;align-items:center;padding-top:64px;gap:44px}
.rail img{height:76px;margin-bottom:26px}
.rail .ri{color:var(--text2);width:60px;height:60px;display:grid;place-items:center}
main{position:absolute;left:150px;right:0;top:0;bottom:0;padding:54px 96px 0 64px}
header{display:flex;align-items:baseline;gap:28px;margin-bottom:22px}
h1{font-size:68px;line-height:1}
.meta{font-size:30px;color:var(--text2)}
.hero{position:relative;height:392px;border-radius:var(--r);overflow:hidden;background:var(--s1)}
.hero-art{position:absolute;inset:0}
.hero-body{position:relative;padding:34px 48px;height:100%;display:flex;flex-direction:column;justify-content:space-between}
.eyebrow{display:flex;align-items:center;gap:18px;font-size:27px;color:var(--text2);font-weight:600;letter-spacing:.04em}
.live{display:inline-flex;align-items:center;gap:10px;border:3px solid ${LIVE};color:#FF8A8A;padding:2px 18px;border-radius:999px;font-weight:700;font-size:25px;letter-spacing:.14em;font-family:"Inter V",sans-serif;text-transform:uppercase;font-style:normal}
.live:before{content:"";width:14px;height:14px;border-radius:50%;background:${LIVE}}
h2{max-width:1100px;font-size:64px}
.score{display:flex;gap:56px;font-size:28px;color:var(--text2);align-items:flex-end;margin-top:-6px}
.score .team{display:flex;align-items:center;gap:16px}
.score i{width:8px;height:44px;background:#5D76A9}.score .w i{background:#F5C84C}
.score b{color:var(--text);font-weight:700;line-height:1}
.actions{display:flex;gap:28px}
.primary,.ghost{display:inline-flex;align-items:center;gap:14px;height:84px;padding:0 44px;font-weight:700;font-size:32px}
h3{font-size:36px;margin:22px 0 14px}
.row{display:flex;gap:28px;padding-right:12px}
.poster{position:relative;flex:1;height:150px;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end}
.poster .pt{padding:0 22px 14px;display:flex;flex-direction:column}.poster b{font-size:30px;font-weight:700}.poster span{font-size:23px;color:rgba(255,255,255,.72)}
.prog{height:8px;background:rgba(255,255,255,.2)}.prog i{display:block;height:100%}
.tile{flex:1;height:100px;white-space:nowrap;background:var(--s2);display:flex;align-items:center;gap:20px;padding:0 24px}
.tile .n{font-size:34px;font-weight:700;color:var(--text2);min-width:48px}
.tile b{display:block;font-size:27px}.tile div span{font-size:22px;color:var(--text2)}
${d.css}
</style></head><body class="${d.body}">
<nav class="rail"><img src="${slug}/mark.svg" alt="">${rail}</nav>
<main>
  <header><h1>${d.title}</h1><span class="meta">Fri 25 Oct · 19:30</span></header>
  <section class="hero"><div class="hero-art"></div>
    <div class="hero-body">
      <div class="eyebrow">${bulbs}<span class="live"><span>Live</span></span><span>NBA · 3rd quarter · 7:29</span></div>
      <h2>Grizzlies <em>at</em> Warriors</h2>
      <div class="score"><div class="team"><i></i>GRIZZLIES <b>77</b></div><div class="team w"><i></i>WARRIORS <b>70</b></div></div>
      <div class="actions"><div class="primary f"><span>▶ Watch live</span></div><div class="ghost"><span>From the start</span></div></div>
    </div>
  </section>
  <h3>Continue watching</h3><div class="row">${posters}</div>
  <h3>Live now</h3><div class="row">${tiles}</div>
</main></body></html>`;
};
for (const slug of Object.keys(DIR)) fs.writeFileSync(path.join(root, `${slug}-tv.html`), page(slug));
console.log('mock html written');
