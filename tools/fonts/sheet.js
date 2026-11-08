const {chromium}=require('playwright');const fs=require('fs');
global.window={}; eval(fs.readFileSync('fonts.js','utf8')); const F=window.FONTS;
const H=(n,k)=>n[k]||n;
const d=subs=>subs.map(s=>{let d=`M${s[0].x} ${s[0].y}`;for(let j=1;j<=s.length;j++){const a=s[j-1],b=s[j%s.length];if(!a.o&&!b.i)d+=`L${b.x} ${b.y}`;else{const p=H(a,'o'),q=H(b,'i');d+=`C${p.x} ${p.y} ${q.x} ${q.y} ${b.x} ${b.y}`}}return d+'Z'}).join('');
const cells=F.map(f=>{let x0=1e9,x1=-1e9;f.letters.forEach(l=>l.subs.forEach(s=>s.forEach(n=>{x0=Math.min(x0,n.x);x1=Math.max(x1,n.x)})));
 return `<div style="display:inline-block;width:380px;margin:4px;font:11px sans-serif">${f.name}<br><svg viewBox="${x0-10} 30 ${x1-x0+20} 190" style="width:370px;height:70px;background:#F6F2EA">${f.letters.map(l=>`<path d="${d(l.subs)}" fill="#13213C"/>`).join('')}</svg></div>`}).join('');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:1500}});await p.setContent('<body style="margin:0">'+cells+'</body>');await p.screenshot({path:'sheet.png',fullPage:true});await b.close()})();
