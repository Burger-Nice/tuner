const fs=require('fs'),path=require('path');const S=require('./study22.js');const {lock,svg,INK,AMBER,WHITE}=S;
const r=n=>+n.toFixed(2);
// segmented T: arms split by full-height gaps (the "ticks" are gaps), needle channel same width
function seg({W=84,H=23,nW=23,g=3,n=2,segGap=null}){const cx=W/2,nl=cx-nW/2-g,nr=cx+nW/2+g;segGap=segGap??g;const arm=nl; const w=(arm-segGap*(n-1))/n;
 let bar='';for(let i=0;i<n;i++){const a=i*(w+segGap);bar+=`M${r(a)} 0H${r(a+w)}V${H}H${r(a)}Z`;const b=W-a-w;bar+=`M${r(b)} 0H${r(b+w)}V${H}H${r(b)}Z`;}
 return {bar,needle:`M${r(cx-nW/2)} 0H${r(cx+nW/2)}V100H${r(cx-nW/2)}Z`,W};}
function lk(m,gap=8){const letters=require('./geometry.js').UNER.map(l=>`<path${l.x?` transform="translate(${l.x} 0)"`:''}${l.e?' fill-rule="evenodd"':''} d="${l.d}"/>`).join('');
 return {w:m.W+gap+392,h:100,top:0,body:`<path fill="${AMBER}" d="${m.bar} ${m.needle}"/><g fill="${WHITE}" transform="translate(${m.W+gap} 0)">${letters}</g>`};}
const V={'S1 n=1 g3 (= L2)':seg({n:1}),'S2 n=2 g3':seg({n:2}),'S3 n=2 g4':seg({n:2,g:4}),'S4 n=3 g2.6 W92':seg({n:3,g:2.6,W:92}),'S5 n=2 g3.5 W88':seg({n:2,g:3.5,W:88})};
let h=`<body style="margin:0;background:${INK};color:#8a909a;font:11px sans-serif;padding:20px;width:1900px">`;
for(const [n,m] of Object.entries(V)){const l=lk(m);const u=`data:image/svg+xml;utf8,${encodeURIComponent(svg(l))}`;
 h+=`<div style="display:flex;gap:24px;align-items:flex-end;border-bottom:1px solid #2a2e36;padding:10px 0"><div style="width:150px">${n}</div><img src="${u}" style="height:100px"><img src="${u}" style="height:46px"><img src="${u}" style="height:30px"><img src="${u}" style="height:20px"><img src="${u}" style="height:14px"><img src="${u}" style="height:50px;filter:grayscale(1)"><img src="${u}" style="height:50px;filter:blur(1.6px)"><svg viewBox="-2 -2 ${m.W+4} 104" width="60"><path fill="${AMBER}" d="${m.bar} ${m.needle}"/></svg><svg viewBox="-2 -2 ${m.W+4} 104" width="30"><path fill="${AMBER}" d="${m.bar} ${m.needle}"/></svg></div>`;}
fs.writeFileSync(path.join(__dirname,'study22','seg.html'),h);
