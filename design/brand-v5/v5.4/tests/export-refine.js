const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
(async()=>{const root=__dirname;const b=await chromium.launch();const p=await b.newPage({viewport:{width:1024,height:1024}});
for(const f of fs.readdirSync(root).filter(f=>/^mark-R\d+\.svg$/.test(f))){const h=path.join(root,'_t.html');fs.writeFileSync(h,`<body style="margin:0;background:#15131D"><div style="width:1024px;height:1024px;display:grid;place-items:center"><img src="${f}" style="width:880px"></div></body>`);await p.goto('file://'+h);await p.waitForTimeout(100);await p.screenshot({path:path.join(root,f.replace('.svg','-1024.png'))});fs.unlinkSync(h);}
await b.close();})();
