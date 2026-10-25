const c=require('./color.js');
const H=262; // neutral hue: Grizzlies Midnight/Beale Street blue ~264-273, complement of gold(80)=260
const N=0.017; // constant tint chroma
const spec={
 'bg-0':[.198,.012,H],'bg-1':[.240,.013,H],'surface-1':[.282,.014,H],'surface-2':[.324,.015,H],'surface-3':[.366,.016,H],
 'line':[.340,.016,H],'line-strong':[.430,.020,H],'outline':[.605,.020,H],
 'text-4':[.540,.018,H],'text-3':[.755,.014,H],'text-2':[.850,.011,H],'text-1':[.965,.004,H],
 'accent':[.825,.162,82],'accent-hover':[.865,.145,85],'accent-press':[.745,.150,78],
 'on-accent':[.200,.025,70],
 'live':[.660,.198,25],'live-text':[.785,.150,25],
 'danger':[.700,.170,3],'danger-text':[.780,.130,3],
 'success':[.775,.150,160],'warning':[.760,.150,56],
};
const out={}; for(const [k,[L,C,h]] of Object.entries(spec)) out[k]=c.fit(L,C,h);
out.focus='#FFFFFF';
module.exports=out;
if(require.main===module){ for(const [k,v] of Object.entries(out)){const [L,C,h]=c.hex2oklch(v); console.log(k.padEnd(13),v,L.toFixed(3),C.toFixed(3),h.toFixed(0), c.hex2rgb(v).map(x=>Math.round(x*255)).join(','));}
 const ks=['bg-0','bg-1','surface-1','surface-2','surface-3']; console.log('steps',ks.slice(1).map((k,i)=>(c.hex2oklch(out[k])[0]-c.hex2oklch(out[ks[i]])[0]).toFixed(3)).join(' '));
 const bgs=ks; const fgs=['outline','text-1','text-2','text-3','text-4','accent','accent-hover','live','live-text','danger','danger-text','success','warning','focus','line','line-strong'];
 console.log('\n'+'fg'.padEnd(14)+bgs.map(b=>b.padStart(10)).join(''));
 for(const f of fgs) console.log(f.padEnd(14)+bgs.map(b=>c.ratio(out[f],out[b]).toFixed(2).padStart(10)).join(''));
 console.log('on-accent/accent',c.ratio(out['on-accent'],out.accent).toFixed(2),'on-accent/hover',c.ratio(out['on-accent'],out['accent-hover']).toFixed(2),'press',c.ratio(out['on-accent'],out['accent-press']).toFixed(2));
 console.log('on-accent on live?',c.ratio('#16110A',out.live).toFixed(2));
}
