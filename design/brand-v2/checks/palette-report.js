// Prints the OKLCH table, hue relations and colour-vision separation used in BRAND.md. node checks/palette-report.js
const c = require('./color.js'), P = require('./palette.js');
const keys = ['bg-0','bg-1','surface-1','surface-2','surface-3','line','line-strong','outline','text-4','text-3','text-2','text-1','accent','accent-hover','accent-press','on-accent','live','live-text','danger','danger-text','success','warning'];
console.log('token'.padEnd(14)+'hex      L     C     h   rgb');
for (const k of keys) { const [L,C,h]=c.hex2oklch(P[k]); console.log(k.padEnd(14)+P[k]+' '+L.toFixed(3)+' '+C.toFixed(3)+' '+h.toFixed(0).padStart(3)+'  '+c.hex2rgb(P[k]).map(x=>Math.round(x*255)).join(',')); }
const sf=['bg-0','bg-1','surface-1','surface-2','surface-3'];
console.log('surface dL:', sf.slice(1).map((k,i)=>(c.hex2oklch(P[k])[0]-c.hex2oklch(P[sf[i]])[0]).toFixed(3)).join(' '), ' min channel bg-0:', Math.min(...c.hex2rgb(P['bg-0']).map(x=>Math.round(x*255))));
const sig=['accent','warning','live','danger','success'];
console.log('\nstatus separation  dE_OK x100: normal / deuteranopia / protanopia / tritanopia');
for (let i=0;i<sig.length;i++) for (let j=i+1;j<sig.length;j++){ const a=P[sig[i]], b=P[sig[j]]; console.log((sig[i]+' vs '+sig[j]).padEnd(20), [c.dE(a,b), ...['deut','prot','trit'].map(t=>c.dE(c.cvd(a,t),c.cvd(b,t)))].map(x=>x.toFixed(1).padStart(5)).join(' ')); }
console.log('\naccent vs bg-0/surface-1 under CVD (dE):'); for (const t of ['deut','prot','trit']) console.log(t, c.dE(c.cvd(P.accent,t),c.cvd(P['bg-0'],t)).toFixed(1), 'luma ratio', c.ratio(c.cvd(P.accent,t),c.cvd(P['bg-0'],t)).toFixed(2));
