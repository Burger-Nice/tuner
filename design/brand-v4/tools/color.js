// colour toolkit (copied from brand-v2/checks/color.js): sRGB <-> OKLab/OKLCH, dE_OK
const toLin = v => v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
const toGam = v => v <= 0.0031308 ? 12.92*v : 1.055*Math.pow(v,1/2.4)-0.055;
const hex2rgb = h => h.replace('#','').match(/../g).map(x=>parseInt(x,16)/255);
const rgb2hex = c => '#'+c.map(v=>Math.round(Math.min(1,Math.max(0,v))*255).toString(16).padStart(2,'0')).join('').toUpperCase();
function lin2oklab([r,g,b]){
  const l=Math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b);
  const m=Math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b);
  const s=Math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b);
  return [0.2104542553*l+0.7936177850*m-0.0040720468*s,1.9779984951*l-2.4285922050*m+0.4505937099*s,0.0259040371*l+0.7827717662*m-0.8086757660*s];
}
function oklab2lin([L,a,b]){
  const l=(L+0.3963377774*a+0.2158037573*b)**3, m=(L-0.1055613458*a-0.0638541728*b)**3, s=(L-0.0894841775*a-1.2914855480*b)**3;
  return [4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.7076147010*s];
}
const hex2oklch = h => { const [L,a,b]=lin2oklab(hex2rgb(h).map(toLin)); return [L, Math.hypot(a,b), (Math.atan2(b,a)*180/Math.PI+360)%360]; };
const inGamut = lin => lin.every(v=>v>=-0.0005&&v<=1.0005);
function oklch2hex(L,C,h){ const a=C*Math.cos(h*Math.PI/180), b=C*Math.sin(h*Math.PI/180); const lin=oklab2lin([L,a,b]); return rgb2hex(lin.map(toGam)); }
function oklch2lin(L,C,h){ const a=C*Math.cos(h*Math.PI/180), b=C*Math.sin(h*Math.PI/180); return oklab2lin([L,a,b]); }
// clip chroma to gamut keeping L,h
function fit(L,C,h){ let c=C; while(c>0 && !inGamut(oklch2lin(L,c,h))) c-=0.001; return oklch2hex(L,Math.max(c,0),h); }
const lum = h => { const c=hex2rgb(h).map(toLin); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
const M = { // Machado et al. 2009, severity 1.0, linear RGB
 deut:[[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]],
 prot:[[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],
 trit:[[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]]};
function cvd(h,t){ const c=hex2rgb(h).map(toLin); const m=M[t]; return rgb2hex(m.map(r=>toGam(r[0]*c[0]+r[1]*c[1]+r[2]*c[2]))); }
const dE = (a,b)=>{ const x=lin2oklab(hex2rgb(a).map(toLin)), y=lin2oklab(hex2rgb(b).map(toLin)); return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2])*100; };
module.exports={hex2oklch,oklch2hex,fit,lum,ratio,cvd,dE,inGamut,oklch2lin,hex2rgb};
// Dark neutrals: 8-bit rounding of a C .013 colour drifts +-5 degrees of hue, so search +-5 codes for the colour whose lightness is within
// tolL of the target and whose hue is closest to h (chroma kept within [Cmin,Cmax]). Keeps the ramp on ONE hue with even lightness steps.
module.exports.neutral = function (L, h, C = 0.013, tolL = 0.0035, Cmin = 0.010, Cmax = 0.017) {
  const base = module.exports.hex2rgb(module.exports.fit(L, C, h)).map(v => Math.round(v * 255));
  let best = null;
  for (let dr = -5; dr <= 5; dr++) for (let dg = -5; dg <= 5; dg++) for (let db = -5; db <= 5; db++) {
    const rgb = [base[0] + dr, base[1] + dg, base[2] + db]; if (rgb.some(v => v < 0 || v > 255)) continue;
    const hex = rgb2hex(rgb.map(v => v / 255)); const [l, cc, hh] = module.exports.hex2oklch(hex);
    if (Math.abs(l - L) > tolL || cc < Cmin || cc > Cmax) continue;
    const dh = Math.abs(((hh - h + 540) % 360) - 180), score = dh + Math.abs(l - L) * 300 + Math.abs(cc - C) * 100;
    if (!best || score < best.score) best = { score, hex };
  }
  return best ? best.hex : module.exports.fit(L, C, h);
};
