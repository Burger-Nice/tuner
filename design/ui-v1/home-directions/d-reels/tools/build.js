// node tools/build.js  -> writes evening.html, gamenight.html, browse.html (960 x 540 mocks). Then: node tools/render.js
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const EYE = '<svg class="eyeoff" viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7a13 13 0 0 1-2.4 3.7M6.4 6.6A13 13 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
const DOWN = '<svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
const UP = '<svg class="chev" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>';
const dot = '<span class="dot">·</span>';
const hint = (a) => '<div class="hint">' + a.map(([k, t, strong]) => `<span><span class="k">${k}</span>${strong ? '<b>' + t + '</b>' : t}</span>`).join('') + '</div>';

const spine = (o) => `<div class="pl"><div class="art"><img src="art/${o.art}" style="--pos:${o.pos}" alt=""></div>
  <div class="sp-lab">${o.label}</div><div class="sp-cnt">${o.cnt}</div>
  <div class="sp-foot"><img src="art/${o.logo}" alt="${o.name}"><b>${o.a}</b><span>${o.b}</span></div></div>`;

const gameSpine = (cnt) => `<div class="pl"><div class="gsp"><div class="t"></div><div class="b"></div><div class="edge"></div>
  <div class="cr" style="top:50px"><img src="art/mem.png" alt=""></div><div class="cn" style="top:124px">Grizzlies</div>
  <div class="cr" style="top:224px"><img src="art/por.png" alt=""></div><div class="cn" style="top:298px">Blazers</div></div>
  <div class="sp-lab">Live</div><div class="sp-cnt">${cnt}</div>
  <div class="sp-foot" style="bottom:14px"><b>Thu 02:00</b><span>ESPN · 4K</span></div></div>`;

const bar = (n) => '<div class="top-r"></div>';
const pips = (n, i) => `<div class="pips">${Array.from({ length: n }, (_, k) => `<i${k === i ? ' class="on"' : ''}></i>`).join('')}</div>`;

const focus = (o) => `<div class="pl on" style="--glow:${o.glow}">
  ${o.prev ? `<div class="pv"><div class="art"><img src="art/${o.prev.art}" style="--pos:${o.prev.pos}" alt=""></div><div class="tx"><em>Before</em>${o.prev.t}<small>${o.prev.s}</small></div>${UP}</div>` : ''}
  <div class="cur" style="top:${o.prev ? 43 : 0}px;bottom:49px">
    <div class="art"><img src="art/${o.art}" style="--pos:${o.pos}" alt=""></div><div class="sh"></div><div class="sl"></div>
    <div class="top"><span class="ey">${o.eyebrow}</span>${o.count}</div>
    <div class="body"><img class="logo" src="art/${o.logo}" style="${o.logoH ? `height:${o.logoH}px;max-width:300px` : ''}" alt="">
      <div class="m1">${o.m1}</div><div class="m2">${o.m2}</div>${o.line ? `<div class="line">${o.line}</div>` : ''}
      ${o.p ? `<div class="bar" style="--p:${o.p}%"><i></i></div>` : ''}${hint(o.hint)}</div>
  </div>
  <div class="nx"><div class="art"><img src="art/${o.next.art}" style="--pos:${o.next.pos}" alt=""></div><div class="tx"><em>Next</em>${o.next.t}<small>${o.next.s}</small></div>${DOWN}</div>
</div>`;

const gameFocus = () => `<div class="pl on" style="--glow:rgba(176,120,255,.34)">
  <div class="cur" style="top:0;bottom:49px">
    <div class="g-field"><div class="hm"></div><div class="eg"></div></div><img class="wm" src="art/mem.png" style="right:-40px;top:-30px" alt=""><img class="wm" src="art/lal.png" style="left:-60px;bottom:-40px" alt=""><div class="g-shade"></div>
    <div class="top"><span class="gtag"><span class="ey" style="color:var(--a-pink-text)">Game night</span><span class="live">Live</span></span>${pips(2, 0).replace('</div>', '<span class="of">1 / 2</span></div>').replace(/<i[^>]*><\/i>/g, '')}</div>
    <div class="gteam" style="left:20px;top:58px"><div class="cr"><img src="art/mem.png" alt=""></div><div><b>Grizzlies</b><span>3-0 · as of tip-off</span></div></div>
    <div style="position:absolute;left:0;right:0;top:158px;display:flex;justify-content:center;gap:12px;"><div class="clock"><span class="q">2ND&nbsp;4:12</span><span class="c">synced</span></div><div class="hid"><span class="s">${EYE}Score hidden</span></div></div>
    <div class="gteam" style="right:20px;top:230px"><div class="cr"><img src="art/lal.png" alt=""></div><div><b>Lakers</b><span>2-2 · as of tip-off</span></div></div>
    <div class="body">${hint([['OK', 'Watch live', 1], ['Hold', 'From tip-off, Reveal']])}</div>
  </div>
  <div class="nx"><div class="art" style="background:#1E1B28"></div><div class="tx"><em>Next</em>Nuggets at Thunder<small>Also live · TNT</small></div>${DOWN}</div>
</div>`;

const page = (o) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=960,height=540">
<title>Reels: ${o.title}</title>
<link rel="stylesheet" href="../../../../app/tv/brand/fonts.css"><link rel="stylesheet" href="../../../../app/tv/brand/tokens.css"><link rel="stylesheet" href="reels.css">
</head><body><div class="screen">
${o.amb}
<div class="amv"></div><div class="st"></div><div class="grain"></div>
<div class="topbar"><img class="mk" src="../../../../app/tv/brand/assets/mark-small.svg" alt="">
  <div class="tabs"><span class="tab"><svg class="ic" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.9-4.9"/></svg>Search</span><span class="tab sel">Home</span><span class="tab">Live</span><span class="tab">NBA${o.nbaLive ? ' <span class="live" style="height:18px;padding:0 7px;font-size:10px;vertical-align:2px;margin-left:4px">Live</span>' : ''}</span><span class="tab">Movies</span><span class="tab">Series</span><span class="tab">Saved</span></div>
  <div class="tb-r"><span>${o.clock}</span><span class="avatar"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4.4 4.4-6.5 8-6.5s6.6 2.1 8 6.5"/></svg></span></div>
</div>
<div class="reels">
${o.reels.join('\n')}
</div>
</div></body></html>`;

const amb = (img, pos) => `<div class="amb"><img src="art/${img}" style="object-position:${pos}" alt=""></div>`;

// ---- art positions (tuned by eye) ----
const SEV = { art: 'severance-bg.jpg', logo: 'severance-logo.png', name: 'Severance' };
const SLOW = { art: 'slowhorses-bg.jpg', logo: 'slowhorses-logo.png', name: 'Slow Horses' };
const HEAT = { art: 'heat-bg.jpg', logo: 'heat-logo.png', name: 'Heat' };
const SUNNY = { art: 'sunny-bg.jpg', logo: 'sunny-logo.png', name: 'It’s Always Sunny' };

const sevSpine = spine({ ...SEV, pos: '56% 30%', label: 'Pick up', cnt: 2, a: '21 min left', b: 'S2 · E3' });
const slowSpine = spine({ ...SLOW, pos: '30% 30%', label: 'New', cnt: 3, a: 'S6 · E6', b: 'New this week' });
const heatSpine = spine({ ...HEAT, pos: '30% 30%', label: 'A film', cnt: 212, a: 'Ends 23:33', b: '4K · 2h 50m' });
const sunnySpine = spine({ ...SUNNY, pos: '72% 30%', label: 'Short', cnt: 9, a: '25 min', b: 'S18 · E10' });

const sevFocus = focus({
  ...SEV, pos: '68% 30%', glow: 'rgba(130,178,146,.34)', eyebrow: 'Pick up', count: pips(2, 0), p: 57,
  m1: 'S2 · E3 · Who Is Alive?', m2: `<span>21 min left</span>${dot}<span>Ends 21:03</span><span class="badge">4K</span>`,
  line: 'Mark, Helly, Irving, and Dylan search for answers.',
  hint: [['OK', 'Resume', 1], ['▼', 'Spin'], ['Hold', 'Start over, more']],
  next: { art: 'bb-bg.jpg', pos: '60% 40%', t: 'Breaking Bad', s: 'S3 · E7 · up next' },
});

const dunFocus = focus({
  art: 'dune2-bg.jpg', logo: 'dune2-logo.png', logoH: 66,  pos: '48% 30%', glow: 'rgba(255,150,60,.4)', eyebrow: 'A film · fits before 00:00',
  count: '<div class="pips">3<span class="of">/ 212</span></div>',
  m1: '2024 · 2h 47m · Ends 23:30', m2: `<span class="badge">4K</span><span class="badge">HDR</span>${dot}<span>IMDb 8.4</span>${dot}<span>From Northlight</span>`,
  line: 'Paul Atreides unites with the Fremen while on a warpath of revenge against the conspirators who destroyed his family.',
  hint: [['OK', 'Details', 1], ['▲▼', 'Spin'], ['Hold', 'Play now, Save']],
  prev: { art: 'sinners-bg.jpg', pos: '70% 30%', t: 'Sinners', s: 'Ends 23:01 · 4K' },
  next: { art: 'anora-bg.jpg', pos: '40% 40%', t: 'Anora', s: 'Ends 23:02 · HD' },
});

const out = {
  evening: page({ title: 'a normal evening', clock: 'Wed 20:41', amb: amb('severance-bg.jpg', '60% 30%'),
    reels: [sevFocus, slowSpine, heatSpine, gameSpine(2)] }),
  gamenight: page({ title: 'game night', clock: 'Thu 03:12', nbaLive: true,
    amb: '<div class="amb"><div class="fld" style="background:linear-gradient(100deg,#1d2a78 0,#1d2a78 38%,#7a35b8 62%,#7a35b8 100%);filter:blur(30px)"></div></div>',
    reels: [gameFocus(), sevSpine, slowSpine, sunnySpine] }),
  browse: page({ title: 'browsing a reel', clock: 'Wed 20:43', amb: amb('dune2-bg.jpg', '50% 30%'),
    reels: [sevSpine, slowSpine, dunFocus, gameSpine(2)] }),
};
for (const k in out) fs.writeFileSync(path.join(root, k + '.html'), out[k]);
console.log('wrote', Object.keys(out).join(', '));
