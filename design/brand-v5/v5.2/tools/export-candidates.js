// Renders tests/mark-*.svg at 1024 px on the canvas colour. node tools/export-candidates.js
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
(async()=>{const root=path.join(__dirname,'..','tests');const b=await chromium.launch();const p=await b.newPage({viewport:{width:1024,height:1024}});
for(const f of fs.readdirSync(root).filter(f=>/^mark-[MNP]\d\.svg$/.test(f))){
 const h=path.join(root,'_tmp.html');fs.writeFileSync(h,`<body style="margin:0;background:#15131D"><div style="width:1024px;height:1024px;display:grid;place-items:center"><img src="${f}" style="width:900px;height:900px;object-fit:contain"></div></body>`);
 await p.goto('file://'+h);await p.waitForTimeout(150);await p.screenshot({path:path.join(root,f.replace('.svg','-1024.png'))});fs.unlinkSync(h);}
await b.close();})();
