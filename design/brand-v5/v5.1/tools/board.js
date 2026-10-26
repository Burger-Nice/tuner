// board.html (900 css px, render at 2x = 1800). node tools/board.js
const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
const sw=(n,h,t,r,txt)=>`<div class="sw"><i style="background:${h};${txt?`color:${txt}`:''}">${t||''}</i><b>${n}</b><span>${h}${r?` · ${r}`:''}</span></div>`;
const crop=(src,w,h,x,y,sc)=>`<div class="crop" style="width:${w}px;height:${h}px"><img src="${src}" style="width:${sc}px;margin:${-y}px 0 0 ${-x}px"></div>`;
const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="fonts.css"><link rel="stylesheet" href="tokens.css"><style>
*{box-sizing:border-box;margin:0}body{background:var(--a-bg-0);color:var(--a-text-1);font:500 13px/18px var(--a-font-text);width:900px;padding:28px 28px 32px}
h1{font:700 30px/34px var(--a-font-display)}h1 span{font-weight:500;color:var(--a-text-2)}.lead{color:var(--a-text-2);margin:4px 0 18px;max-width:700px}
h2{font:650 11px/16px var(--a-font-text);letter-spacing:.12em;text-transform:uppercase;color:var(--a-text-3);margin:0 0 8px}
.row{display:grid;gap:14px;margin-bottom:18px}.card{background:var(--a-bg-1);border:1px solid var(--a-border);border-radius:14px;padding:14px}
.cap{color:var(--a-text-3);font-size:12px;line-height:16px;margin-top:8px}.fl{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.sw{width:98px}.sw i{display:grid;place-items:center;height:50px;border-radius:10px;border:1px solid rgba(255,255,255,.08);font:700 15px var(--a-font-display);font-style:normal}.sw b{display:block;font:650 12px/16px var(--a-font-text);margin-top:5px}.sw span{display:block;font-size:11px;line-height:14px;color:var(--a-text-3)}
.crop{overflow:hidden;border-radius:10px;border:1px solid var(--a-border)}.crop img{display:block}
.thumb{width:84px;height:84px;border-radius:12px;background:var(--a-bg-0);display:grid;place-items:center;border:1px solid var(--a-border)}.thumb img{width:68px;height:68px;object-fit:contain}
.v{font-size:11px;line-height:14px;color:var(--a-text-3);margin-top:4px;width:84px}.v b{color:var(--a-text-1)}
.tile{width:84px;height:84px;border-radius:19px;display:grid;place-items:center;font:700 13px var(--a-font-display);color:#fff}
.mask{width:84px;height:84px;border-radius:50%;overflow:hidden;position:relative}.mask img{position:absolute;inset:0;width:100%;height:100%}
.rule{display:grid;grid-template-columns:1fr 1fr;gap:14px}.rule li{margin:0 0 4px 16px;color:var(--a-text-2)}.rule b{color:var(--a-text-1)}
</style></head><body>
<h1>airglow <span>· Soft · brand v5.1</span></h1>
<div class="lead">One identity, one dialect. A play triangle that gives off light, in pink to orchid on a violet-ink canvas. Soft is the whole app; Sharp survives only as a dialect for live and NBA (skewed plates, italic condensed scores). Every colour is contrast-checked (0 failures), glows are pre-rendered sprites, no blur filters.</div>

<div class="row" style="grid-template-columns:300px 1fr">
 <div class="card"><h2>Final mark (N4)</h2><div style="display:grid;place-items:center;background:var(--a-bg-0);border-radius:10px;height:230px"><img src="tests/mark-N4-1024.png" style="width:230px;height:230px;border-radius:10px"></div><div class="cap">Triangle + ONE hard echo + radial glow disc (vector gradient). Not a stock play button, not a screen.</div></div>
 <div class="card"><h2>Does it survive size and blur? (rendered, not claimed)</h2>
  <div class="fl" style="gap:22px;align-items:flex-end">
   <div><img src="assets/mark.svg" style="width:96px"><div class="cap">96</div></div>
   <div><img src="assets/mark.svg" style="width:48px"><div class="cap">48</div></div>
   <div><img src="assets/mark-small.svg" style="width:24px;height:24px"><div class="cap">24 (small mark: no glow, echo as one plain triangle)</div></div>
   <div><img src="assets/mark.svg" style="width:64px;filter:blur(6px)"><div class="cap">64 + blur (across the room)</div></div>
   <div><img src="assets/lockup.svg" style="width:210px"><div class="cap">lockup: air 500 at 78% + glow 700</div></div>
  </div>
  <h2 style="margin-top:14px">Candidates tried, 1024 px renders in tests/</h2>
  <div class="fl" style="gap:10px">
   ${[['M1','v5 baseline','blur filters, mush at 24','no'],['M2','screen + play','YouTube silhouette','no'],['M5','screen + echo','same, plus smudge','no'],['M4','glow triangle','edges read as bars','no'],['N2','spill plate','bar again at 48','no'],['N3','radial glow','best glow, no echo','close'],['N4','N3 + 1 echo','clean at 24, one hard cue','yes']].map(([id,t,vv,ok])=>`<div><div class="thumb"><img src="tests/mark-${id}-1024.png"></div><div class="v"><b>${id}${ok=='yes'?' chosen':''}</b> ${t}<br>${vv}</div></div>`).join('')}
  </div></div>
</div>

<div class="row" style="grid-template-columns:330px 1fr">
 <div class="card"><h2>App icon</h2><div class="fl" style="gap:12px"><img src="assets/icon-1024.png" style="width:120px;height:120px;border-radius:27px"><div class="mask" style="background:#171323"><img src="assets/icon-background-432.png"><img src="assets/icon-foreground-432.png"></div></div>
  <div class="cap">Ink triangle on a pink to orchid tile: 5.2 to 6.3:1 (was chalk on violet at 2.1 to 2.8). Android adaptive foreground and background layers, circle mask shown.</div>
  <div class="fl" style="gap:8px;margin-top:10px"><div class="tile" style="background:linear-gradient(135deg,#F95BAC,#D540F5);width:56px;height:56px;border-radius:13px"><svg width="26" height="26" viewBox="30 14 68 72"><path d="M38 22L88 50L38 78Z" fill="#14101F" stroke="#14101F" stroke-width="10" stroke-linejoin="round"/></svg></div><div class="tile" style="background:#9146FF;width:56px;height:56px;border-radius:13px">tw</div><div class="tile" style="background:#E50914;width:56px;height:56px;border-radius:13px">N</div><div class="tile" style="background:#1F80E0;width:56px;height:56px;border-radius:13px">P+</div><div class="tile" style="background:#FFFFFF;color:#111;width:56px;height:56px;border-radius:13px">yt</div></div><div class="cap">Launcher row: warm pink to orchid is the only tile in that range; violet-only tiles (Twitch-like) were rejected.</div></div>
 <div class="card"><h2>Google TV banner 320 × 180</h2><img src="assets/banner.png" style="width:100%;border-radius:10px;display:block"><div class="cap">Lockup on bg-0, three full-bleed radial gradients (violet, orchid, pink). Vector source banner.svg, PNG at 1x and 2x.</div></div>
</div>

<div class="row" style="grid-template-columns:1fr"><div class="card"><h2>Colour roles (ratios on canvas bg-0 unless noted)</h2><div class="fl" style="gap:10px">
 ${sw('bg-0','#171323','', 'canvas')}${sw('bg-1','#201D2A','','raised')}${sw('surface-1','#2C2839','','cards')}${sw('surface-2','#373442','','selected')}${sw('surface-3','#44414F','','pressed')}
 ${sw('text-1','#F3EFE6','Aa','15.9','#171323')}${sw('text-2','#D2CEE2','Aa','11.8','#171323')}${sw('text-3','#BBB7CB','Aa','9.3','#171323')}
 ${sw('pink','#F95BAC','','6.2 non-text','#14101F')}${sw('orchid','#D540F5','','5.1 non-text','#14101F')}${sw('pink-text','#FDA0C9','Aa','9.6','#14101F')}${sw('orchid-text','#E29EEC','Aa','9.0','#14101F')}
 ${sw('violet-ui','#9D7DFF','','5.9 stroke')}${sw('violet','#5B2BD9','','glow anchor only','#fff')}${sw('live','#FF4B4B','','LIVE only 5.5')}${sw('focus','#FFFFFF','','18.2','#000')}
 <div class="sw" style="width:200px"><i style="background:linear-gradient(100deg,#F95BAC,#D540F5);color:#14101F">Watch live</i><b>gradient</b><span>two stops · ink label 5.2 to 6.3:1</span></div>
</div><div class="cap">Surfaces step ~0.045 L at one hue (295) so cards separate from the canvas; the blue-grey of v5 is gone. Nothing amber or yellow. Errors and warnings are neutral (icon + text).</div></div></div>

<div class="row" style="grid-template-columns:1fr 1fr">
 <div class="card"><h2>Type</h2><div style="font:700 36px/40px var(--a-font-display)">Tonight on air</div><div style="font:500 28px/32px var(--a-font-display);color:var(--a-text-2)">Outfit 500 / 700 — titles, wordmark</div><div style="font:500 16px/24px var(--a-font-text);margin-top:6px">Inter Variable — all reading text, guide, tables. 1h 48m · 21:30 · S2 E4</div><div class="a-score" style="margin-top:6px;font-size:44px;line-height:44px">77 – 70 Grizzlies at Warriors</div><div class="cap">Barlow Condensed 800 italic: scores and short live titles only. Floor 13 px on TV. 99 KB of woff2 in total.</div></div>

 <div class="card"><h2>Soft vs Sharp: one identity</h2><div class="rule"><div><b>Soft (everything)</b><ul><li>radius 16, pill buttons</li><li>pink to orchid gradient, ink labels</li><li>8° hero edge at most</li><li>upright Outfit and Inter</li></ul></div><div><b>Sharp (live and NBA only)</b><ul><li>plates skew −12°, wipes 14°</li><li>italic condensed: scores, 3-word titles</li><li>never: text, tables, box scores, channel rows</li><li>one slab per hero, under 25%</li></ul></div></div></div>
</div>

<div class="card" style="margin-bottom:18px"><h2>Components (full sheet: components.png)</h2>${crop('components.png',814,470,0,0,814)}</div>

<div class="row" style="grid-template-columns:1fr 1fr"><div class="card"><h2>In context (context.png)</h2><img src="context.png" style="width:100%;border-radius:10px;display:block"><div class="cap">Soft surface beside a Sharp NBA plate: same mark, palette, type, focus.</div></div>
<div class="card"><h2>Launch, 1100 ms (launch.png)</h2><img src="launch.png" style="width:100%;border-radius:10px;display:block"></div></div>
</body></html>`;
fs.writeFileSync(path.join(root,'board.html'),html);console.log('board.html');
