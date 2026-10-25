const fs=require('fs'),path=require('path');const S=require('./study22.js');const {mark,lock,svg,INK}=S;
const T=(d,w,h,edge)=>({d,w,h,edge});const base={W:84,H:23,nW:23,P:0,tip:23,g:0};const tk=[19.5,29.5].map(d=>T(d,3.9,11.5,'bot'));
const mid=[T(19.5,2.6,12,'mid'),T(26.5,2.6,7,'mid'),T(33.5,2.6,12,'mid')];
const V={
 'c proud 14 (cross test)':{...base,P:14,tip:14,ticks:tk},
 'j flush+gaps, edge ticks':{...base,g:3.5,ticks:tk},
 'm flush+gaps, slit scale':{...base,g:3.5,ticks:mid.slice(0,2).concat([])},
 'n flush+gaps, no ticks':{...base,g:3.5,ticks:[]},
 'o no gaps, slit scale':{...base,g:0,ticks:mid.slice(0,2)},
 'p wider bar 92, gaps, slit scale':{...base,W:92,g:3.5,ticks:[T(20,2.6,12,'mid'),T(27,2.6,7,'mid'),T(34,2.6,12,'mid')]},
};
let h=`<body style="margin:0;background:${INK};color:#8a909a;font:12px sans-serif;padding:20px;display:flex;flex-wrap:wrap;gap:30px;width:1900px">`;
for(const [n,s] of Object.entries(V)){const w=s.W,top=-s.P-4,H=108+s.P;const vb=`-4 ${top} ${w+8} ${H}`;
 h+=`<div style="width:290px"><div style="margin-bottom:6px">${n}</div><svg viewBox="${vb}" width="280">${mark(s,'two')}</svg><div style="display:flex;gap:16px;align-items:flex-end;margin-top:10px"><svg viewBox="${vb}" width="90">${mark(s,'amber')}</svg><svg viewBox="${vb}" width="60">${mark(s,'two')}</svg><svg viewBox="${vb}" width="36">${mark(s,'two')}</svg><svg viewBox="${vb}" width="24">${mark(s,'two')}</svg></div></div>`;}
fs.writeFileSync(path.join(__dirname,'study22','big.html'),h);
