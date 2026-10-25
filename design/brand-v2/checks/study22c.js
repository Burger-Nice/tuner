const fs=require('fs'),path=require('path');const S=require('./study22.js');const {mark,lock,svg,INK}=S;
const T=(d,w,h,edge)=>({d,w,h,edge});const base={W:84,H:23,nW:23,P:0,tip:23,g:0};
const slit=[T(19.5,2.6,12,'mid'),T(27.5,2.6,7,'mid')];
const V={
 'L1 all-amber T, plain':[{...base,ticks:[]},'amber'],
 'L2 all-amber + needle channel':[{...base,g:3,ticks:[]},'amber'],
 'L3 all-amber + slit scale':[{...base,ticks:slit},'amber'],
 'L4 two-tone + channel + slit':[{...base,g:3,ticks:slit},'two'],
 'L5 all-amber + channel + slit':[{...base,g:3,ticks:slit},'amber'],
 'L6 two-tone v2.1-like (straight stem, edge ticks)':[{...base,ticks:[19.5,29.5].map(d=>T(d,3.9,11.5,'bot'))},'two'],
};
let h=`<body style="margin:0;background:${INK};color:#8a909a;font:11px sans-serif;padding:20px;width:1900px">`;
for(const [n,[s,mode]] of Object.entries(V)){const lk=lock(s,mode,8);const u=`data:image/svg+xml;utf8,${encodeURIComponent(svg(lk))}`;
 h+=`<div style="display:flex;gap:24px;align-items:flex-end;border-bottom:1px solid #2a2e36;padding:10px 0"><div style="width:150px">${n}</div><img src="${u}" style="height:100px"><img src="${u}" style="height:34px"><img src="${u}" style="height:20px"><img src="${u}" style="height:14px"><img src="${u}" style="height:50px;filter:grayscale(1)"><img src="${u}" style="height:50px;filter:blur(1.6px)"><img src="${u}" style="height:50px;filter:grayscale(1) blur(1.6px)"></div>`;}
fs.writeFileSync(path.join(__dirname,'study22','lockups.html'),h);
