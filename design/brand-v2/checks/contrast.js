// WCAG 2.x contrast ratios for the Tuner palette. node contrast.js
const lum = h => { const c = h.replace('#','').match(/../g).map(x => parseInt(x,16)/255).map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4)); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
const ratio = (a,b) => { const [l1,l2] = [lum(a),lum(b)].sort((x,y)=>y-x); return (l1+0.05)/(l2+0.05); };
const bg = { 'bg-0': '#0D0E12', 'bg-1': '#13151B', 'surface-1': '#1A1D24', 'surface-2': '#22262F', 'surface-3': '#2C313C', 'accent': '#FFB020', 'live': '#FF5A4F', 'text-1 (inverted btn)': '#F2F3F5' };
const fg = { 'text-1': '#F2F3F5', 'text-2': '#B9BFCB', 'text-3': '#868D9B', 'text-4': '#5C6372', 'accent': '#FFB020', 'accent-text': '#FFC14D', 'live': '#FF5A4F', 'live-text': '#FF7A70', 'success': '#3DD68C', 'warning': '#FF8A3D', 'on-accent': '#16110A', 'on-light': '#0D0E12', 'focus': '#FFFFFF', 'line': '#2A2F3A', 'line-strong': '#3A4150' };
const rows = [];
for (const [fn, fv] of Object.entries(fg)) for (const [bn, bv] of Object.entries(bg)) rows.push([fn, fv, bn, bv, ratio(fv, bv)]);
const pad = (s,n) => String(s).padEnd(n);
console.log(pad('foreground',24)+pad('background',24)+'ratio   AA body  AA large');
for (const [fn,fv,bn,bv,r] of rows) console.log(pad(fn+' '+fv,24)+pad(bn+' '+bv,24)+pad(r.toFixed(2)+':1',8)+pad(r>=4.5?'pass':'-',9)+(r>=3?'pass':'-'));
