// board.html (900 css px, render at 2x = 1800). node tools/board.js
const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');const P=require('./palette.js'),c=require('./color.js');
const R=(a,b)=>c.ratio(P[a],P[b]).toFixed(1);
const sw=(k,note,txt)=>`<div class="sw"><i style="background:${P[k]};${txt?`color:${txt}`:''}">${txt?'Aa':''}</i><b>${k}</b><span>${P[k]}${note?` · ${note}`:''}</span></div>`;
const crop=(src,w,h,x,y,sc)=>`<div class="crop" style="width:${w}px;height:${h}px"><img src="${src}" style="width:${sc}px;margin:${-y}px 0 0 ${-x}px"></div>`;
const cand=[['P1','v5.1 stock + echo','echo = drop shadow, gone at 24','no'],['P2','echo (-15,+10) 40%','still a shadow, smudge at 48','no'],['P3','own proportion','blunt, no glow cue','close'],['P5','outlined ghost','line art, mush at 24','no'],['P6','plain stock','nothing ownable','no'],['P8','own shape + lit core','core survives 24 and blur','yes']];
const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="fonts.css"><link rel="stylesheet" href="tokens.css"><style>
*{box-sizing:border-box;margin:0}body{background:var(--a-bg-0);color:var(--a-text-1);font:500 13px/18px var(--a-font-text);width:900px;padding:28px 28px 32px}
h1{font:700 30px/34px var(--a-font-display)}h1 span{font-weight:500;color:var(--a-text-2)}.lead{color:var(--a-text-2);margin:4px 0 18px;max-width:720px}
h2{font:650 11px/16px var(--a-font-text);letter-spacing:.12em;text-transform:uppercase;color:var(--a-text-3);margin:0 0 8px}
.row{display:grid;gap:14px;margin-bottom:18px}.card{background:var(--a-bg-1);border:1px solid var(--a-border);border-radius:14px;padding:14px}
.cap{color:var(--a-text-3);font-size:12px;line-height:16px;margin-top:8px}.fl{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.sw{width:98px}.sw i{display:grid;place-items:center;height:50px;border-radius:10px;border:1px solid rgba(255,255,255,.08);font:700 15px var(--a-font-display);font-style:normal}.sw b{display:block;font:650 12px/16px var(--a-font-text);margin-top:5px}.sw span{display:block;font-size:11px;line-height:14px;color:var(--a-text-3)}
.crop{overflow:hidden;border-radius:10px;border:1px solid var(--a-border)}.crop img{display:block}
.thumb{width:84px;height:84px;border-radius:12px;background:var(--a-bg-0);display:grid;place-items:center;border:1px solid var(--a-border)}.thumb img{width:76px;height:76px;object-fit:contain}
.v{font-size:11px;line-height:14px;color:var(--a-text-3);margin-top:4px;width:110px}.v b{color:var(--a-text-1)}
.tile{width:56px;height:56px;border-radius:13px;display:grid;place-items:center;font:700 13px var(--a-font-display);color:#fff}
.bn{width:200px;height:112px;border-radius:8px;display:grid;place-items:center;font:700 22px var(--a-font-display);color:#fff;overflow:hidden}.bn img{width:100%;display:block}
.rule{display:grid;grid-template-columns:1fr 1fr;gap:14px}.rule li{margin:0 0 4px 16px;color:var(--a-text-2)}.rule b{color:var(--a-text-1)}
</style></head><body>
<h1>airglow <span>· Soft · brand v5.3</span></h1>
<div class="lead">The owner's pick, refined: the v5 Soft echo mark. A gradient wedge with three stepped echo bands behind it, now crisp: solid colour steps, tucked layers, matched corner radii, optical centring, no glow, no blur, no filters. One-weight lowercase wordmark as he saw it. The chalk icon is kept and its contrast fixed by deepening the tile.</div>

<div class="row" style="grid-template-columns:300px 1fr">
 <div class="card"><h2>Final mark (R1, tuned)</h2><div style="display:grid;place-items:center;background:var(--a-bg-0);border-radius:10px;height:230px"><img src="tests/mark-R1-1024.png" style="width:230px;height:230px;border-radius:10px"></div><div class="cap">Wedge 62 long × 70 high, base radius 6, apex 7.5. Three bands step 10 units, heights ×.905 / .81 / .715, tucked behind each other. Solid #6A33E6 to #C23DF2 (OKLCH steps). Diagonal pink to orchid on the wedge.</div></div>
 <div class="card"><h2>Does it survive size and blur? (rendered)</h2>
  <div class="fl" style="gap:22px;align-items:flex-end">
   <div><img src="assets/mark.svg" style="width:120px"><div class="cap">120</div></div>
   <div><img src="assets/mark.svg" style="width:60px"><div class="cap">60</div></div>
   <div><img src="assets/mark-small.svg" style="width:40px"><div class="cap">40</div></div>
   <div><img src="assets/mark-small.svg" style="width:24px"><div class="cap">24 (two bands)</div></div>
   <div><img src="assets/mark.svg" style="width:90px;filter:blur(5px)"><div class="cap">blur</div></div>
  </div>
  <div style="margin-top:12px"><img src="assets/lockup.svg" style="width:380px"><div class="cap">lockup A: mark = ascender height, on the baseline, gap 26; Outfit 700, one weight</div></div></div>
</div>

<div class="card" style="margin-bottom:18px"><h2>Ten refinements (sheet with 1024 / 96 / 48 / 24 / blur: tests/mark-refine.png)</h2><div class="fl" style="gap:10px">${[['R1','tucked, crisp','chosen: reads as layered cards','yes'],['R2','gaps 2','pills: reads as equaliser bars','no'],['R3','wide steps','bars again at 48','no'],['R4','2 bands, gaps','pills, no stair','no'],['R5','long wedge','heavier, bands small','no'],['R6','horizontal gradient','muddy front, no gain','no'],['R7','hairline 1','pill smear at 24','no'],['R8','equal bars','skip-back control: confirmed','no'],['R9','no violet','dull, loses the sweep','no'],['R10','2 bands tucked','chosen for 40 px and below','small']].map(([id,t,vv,ok])=>`<div><div class="thumb"><img src="tests/mark-${id}-1024.png"></div><div class="v"><b>${id}${ok=='yes'?' final':ok=='small'?' small':''}</b> ${t}<br>${vv}</div></div>`).join('')}</div></div>

<div class="row" style="grid-template-columns:1fr 1fr">
 <div class="card"><h2>Lockup variants (tests/lockup-refine.png)</h2><div class="fl" style="gap:14px;flex-direction:column;align-items:flex-start"><div><img src="tests/lockup-A.svg" style="height:46px"><div class="cap"><b style="color:var(--a-text-1)">A chosen</b> mark = ascender height on the baseline (the owner's proportion), gap 26</div></div><div><img src="tests/lockup-B.svg" style="height:46px"><div class="cap">B mark 1.2× x-height: reads as a bullet before the word, too small</div></div><div><img src="tests/lockup-C.svg" style="height:46px"><div class="cap">C mark = cap height, gap 34: floats off the word</div></div></div></div>
 <div class="card"><h2>Icon variants (tests/icon-refine.png), wedge vs tile at the worst point</h2><div class="fl" style="gap:10px">${[['I1','owner tile, chalk','2.7:1 fails'],['I2','deepened tile, chalk','3.7:1 final'],['I3','pink-orchid tile, ink','5.5:1'],['I4','ink + violet bands','5.5:1, loud']].map(([k,t,vv])=>`<div><img src="tests/icon-${k}.svg" style="width:96px;border-radius:21px"><div class="v" style="width:100px"><b>${k}</b> ${t}<br>${vv}</div></div>`).join('')}</div><div class="cap">The owner's chalk icon is kept (I2). Its chalk-on-tile contrast was 2.1 to 2.8:1; the pink end of the tile is deepened (#E2449E) so the chalk wedge is at least 3:1 against the tile around it, and the bands are solid tints, not alpha strips.</div></div>
</div>

<div class="row" style="grid-template-columns:260px 1fr">
 <div class="card"><h2>App icon</h2><div class="fl" style="gap:12px"><img src="assets/icon-1024.png" style="width:110px;height:110px;border-radius:25px"><div style="width:84px;height:84px;border-radius:50%;overflow:hidden;position:relative;background:#000"><img src="assets/icon-background-432.png" style="position:absolute;inset:0;width:100%"><img src="assets/icon-foreground-432.png" style="position:absolute;inset:0;width:100%"></div></div>
  <div class="cap">1024 tile and the Android adaptive layers (circle mask shown, all inside the 66 dp safe zone).</div>
  <div class="fl" style="gap:8px;margin-top:10px"><img src="assets/icon-1024.png" style="width:56px;border-radius:13px"><img src="assets/icon-1024.png" style="width:36px;border-radius:9px"><img src="assets/icon-small-256.png" style="width:36px;border-radius:9px"><img src="assets/icon-1024.png" style="width:24px;border-radius:6px"><div class="tile" style="background:#9146FF">tw</div><div class="tile" style="background:#E50914">N</div><div class="tile" style="background:#0B2A6B">D+</div></div><div class="cap">56 / 36 / 36 (two-band icon-small) / 24 px, then neighbours.</div></div>
 <div class="card"><h2>Google TV banner 320 × 180</h2><div class="fl" style="gap:10px;align-items:flex-start">
  <div><div class="bn"><img src="assets/banner@2x.png"></div><div class="cap" style="width:200px"><b style="color:var(--a-text-1)">Primary:</b> the canvas with the lockup. Quiet, not violet-led; the mark carries the colour.</div></div>
  <div><div class="bn"><img src="assets/banner-gradient.png"></div><div class="cap" style="width:200px">Alternative: pink to orchid field, ink lockup (the loud one; pick on the TV)</div></div>
  <div><div class="bn" style="background:#9146FF">twitch-like</div><div class="cap" style="width:200px">neighbour</div></div></div></div>
</div>

<div class="card" style="margin-bottom:18px"><h2>Colour roles (ratios on bg-0, then surface-2)</h2><div class="fl" style="gap:10px">
 ${sw('bg-0','canvas C.019')}${sw('bg-1','raised')}${sw('surface-1','1.35 vs canvas')}${sw('surface-2','1.71 vs canvas')}${sw('surface-3','2.26 vs canvas')}
 ${sw('text-1',R('text-1','bg-0')+' / '+R('text-1','surface-2'),P['bg-0'])}${sw('text-2',R('text-2','bg-0'),P['bg-0'])}${sw('text-3',R('text-3','bg-0'),P['bg-0'])}
 ${sw('pink',R('pink','bg-0')+' / '+R('pink','surface-2'),P['ink-on-brand'])}${sw('orchid',R('orchid','bg-0')+' / '+R('orchid','surface-2'),P['ink-on-brand'])}${sw('pink-text',R('pink-text','bg-0'),P['bg-0'])}${sw('orchid-text',R('orchid-text','bg-0'),P['bg-0'])}
 ${sw('violet-ui',R('violet-ui','bg-0')+' stroke')}${sw('violet','glow anchor only','#fff')}${sw('live','LIVE only '+R('live','bg-0'))}${sw('border-strong',R('border-strong','surface-1')+' / '+R('border-strong','surface-2'))}${sw('focus',R('focus','bg-0'),'#000')}
 <div class="sw" style="width:200px"><i style="background:linear-gradient(100deg,${P.pink},${P.orchid});color:${P['ink-on-brand']}">Watch live</i><b>gradient</b><span>two stops · ink 5.2 to 6.3:1</span></div>
</div><div class="cap">Canvas chroma .032 to .019: tested against six synthetic posters (tests/canvas-test.png); the tint now sits in the sprites, not the posters. Splash = bg-0. Nothing amber or yellow; errors neutral.</div></div>

<div class="row" style="grid-template-columns:1fr 1fr">
 <div class="card"><h2>Type</h2><div style="font:700 36px/40px var(--a-font-display)">Tonight on air</div><div style="font:500 26px/30px var(--a-font-display);color:var(--a-text-2)">Outfit 500 / 700 titles, wordmark</div><div style="font:500 16px/24px var(--a-font-text);margin-top:6px">Inter Variable: all reading text. 1h 48m · 21:30</div><div class="a-score" style="margin-top:6px;font-size:40px;line-height:42px">77 – 70 Grizzlies at Warriors</div><div class="cap">Barlow Condensed 800 italic: scores and short live titles only. 99 KB of woff2.</div></div>
 <div class="card"><h2>One live angle, one soft angle</h2><div class="rule"><div><b>Soft: 8°</b><ul><li>hero edge, launch wipe</li><li>radius 16, pill buttons</li><li>gradient pink to orchid</li></ul></div><div><b>Live / Sharp: 12°</b><ul><li>plate, slab, wipe: parallel</li><li>italic condensed scores</li><li>never: text, tables, rows</li></ul></div></div></div>
</div>

<div class="card" style="margin-bottom:18px"><h2>Components (full sheet: components.png: buttons, chips, selected vs focused, inputs, toggles, dialog, error and empty, Sharp, native player)</h2>${crop('components.png',814,700,0,640,814)}</div>

<div class="row" style="grid-template-columns:1fr 1fr"><div class="card"><h2>In context (context.png)</h2><img src="context.png" style="width:100%;border-radius:10px;display:block"></div>
<div class="card"><h2>Launch, 1100 ms (launch.png)</h2><img src="launch.png" style="width:100%;border-radius:10px;display:block"></div></div>
</body></html>`;
fs.writeFileSync(path.join(root,'board.html'),html);console.log('board.html');
