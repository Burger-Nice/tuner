const fs=require('fs'),path=require('path');const {tParts,T,UNER,GAP}=require('./geometry.js');const P=require('./palette.js');const t=tParts();
const letters=UNER.map(l=>`<path${l.x?` transform="translate(${l.x} 0)"`:''}${l.e?' fill-rule="evenodd"':''} d="${l.d}"/>`).join('');
const LW=T.W+GAP+392,k=46/100;
const ban=(bg,tc,lc,w=320)=>`<div style="width:${w}px;height:${w*9/16}px;background:${bg};position:relative;border-radius:6px;overflow:hidden"><svg viewBox="0 0 320 180" width="${w}" height="${w*9/16}"><g transform="translate(${(320-LW*k)/2} 67) scale(${k})"><path fill="${tc}" d="${t.full}"/><g fill="${lc}" transform="translate(${T.W+GAP} 0)">${letters}</g></g></svg></div>`;
const ph=(bg,sh,w=320)=>`<div style="width:${w}px;height:${w*9/16}px;background:${bg};border-radius:6px;display:grid;place-items:center">${sh}</div>`;
const nb=[['#0b0b0e','<div style="width:30%;height:34%;background:#e5252d;border-radius:4px"></div>'],['#1b3d8f','<div style="width:46%;height:14%;background:#fff;border-radius:99px"></div>'],['#101a3a','<div style="width:30%;aspect-ratio:1;border:6px solid #9bd;border-radius:50%"></div>'],['#1d2230','<div style="width:30%;aspect-ratio:1;border:6px solid #e5a00d;border-radius:50%"></div>']];
let h=`<body style="margin:0;background:#07080a;padding:24px;color:#8a909a;font:12px sans-serif;width:1600px">`;
for(const [n,b] of [['A dark banner, amber T + white UNER',ban(P['bg-0'],P.accent,P['text-1'])],['B amber banner, ink T + ink UNER',ban(P.accent,P['bg-0'],P['bg-0'])],['C amber banner, ink T + white UNER?',ban(P.accent,P['bg-0'],P['text-1'])]])
 h+=`<div style="margin-bottom:18px"><div style="margin-bottom:6px">${n}</div><div style="display:flex;gap:14px;align-items:center">${ph(nb[0][0],nb[0][1],230)}${ph(nb[1][0],nb[1][1],230)}${b}${ph(nb[2][0],nb[2][1],230)}${ph(nb[3][0],nb[3][1],230)}</div></div>`;
fs.writeFileSync(path.join(__dirname,'study22','banners.html'),h);
