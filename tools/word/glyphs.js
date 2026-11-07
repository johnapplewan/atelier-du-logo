const ot=require('opentype.js');const f=ot.loadSync(process.argv[2]);
const size=219, gap=73, x0=228+gap; // mark spans 0..256 (frame 28..228); text starts after visual frame + gap
const scale=size/f.unitsPerEm; const asc=f.tables.hhea.ascender, desc=f.tables.hhea.descender;
const baseline=128 - (asc-desc)*scale/2 + asc*scale;
const r=n=>Math.round(n*100)/100;
let x=x0; const out=[]; const word='Simulimmo';
const glyphs=f.stringToGlyphs(word);
glyphs.forEach((g,i)=>{
  const p=g.getPath(x,baseline,size); const subs=[]; let cur=null;
  for(const c of p.commands){
    if(c.type==='M'){cur=[{x:r(c.x),y:r(c.y),i:null,o:null}];subs.push(cur);}
    else if(c.type==='L'){cur.push({x:r(c.x),y:r(c.y),i:null,o:null});}
    else if(c.type==='Q'){const p0=cur[cur.length-1];cur[cur.length-1].o={x:r(p0.x+2/3*(c.x1-p0.x)),y:r(p0.y+2/3*(c.y1-p0.y))};cur.push({x:r(c.x),y:r(c.y),i:{x:r(c.x+2/3*(c.x1-c.x)),y:r(c.y+2/3*(c.y1-c.y))},o:null});}
    else if(c.type==='C'){cur[cur.length-1].o={x:r(c.x1),y:r(c.y1)};cur.push({x:r(c.x),y:r(c.y),i:{x:r(c.x2),y:r(c.y2)},o:null});}
    else if(c.type==='Z'){const a=cur[0],b=cur[cur.length-1];if(cur.length>1&&Math.abs(a.x-b.x)<.01&&Math.abs(a.y-b.y)<.01){a.i=b.i;cur.pop();}}
  }
  out.push({ch:word[i],subs});
  x+=g.advanceWidth*scale; if(i<glyphs.length-1) x+=f.getKerningValue(g,glyphs[i+1])*scale;
});
console.log(JSON.stringify({baseline:r(baseline),end:r(x),letters:out}));
