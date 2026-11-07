const ot=require('opentype.js');const fs=require('fs');
const r=n=>Math.round(n*100)/100;
const ref=ot.loadSync('/home/user/Simulimmo/public/fonts/instrument-serif-400.ttf');
const refSize=219, baseline=202.46, x0=301;
const capH=f=>{ const c=(f.tables.os2&&f.tables.os2.sCapHeight)||f.charToGlyph('H').getBoundingBox().y2; return c; };
const targetCap=capH(ref)*refSize/ref.unitsPerEm;
const list=[
 ['instrument','Instrument Serif (actuelle)','/home/user/Simulimmo/public/fonts/instrument-serif-400.ttf'],
 ['fraunces','Fraunces','node_modules/@fontsource/fraunces/files/fraunces-latin-400-normal.woff'],
 ['cormorant','Cormorant Garamond','node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff'],
 ['playfair','Playfair Display','node_modules/@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff'],
 ['dmserif','DM Serif Display','node_modules/@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff'],
 ['caslon','Libre Caslon Text','node_modules/@fontsource/libre-caslon-text/files/libre-caslon-text-latin-400-normal.woff'],
 ['ebgaramond','EB Garamond','node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-400-normal.woff'],
 ['newsreader','Newsreader','node_modules/@fontsource/newsreader/files/newsreader-latin-400-normal.woff'],
 ['youngserif','Young Serif','node_modules/@fontsource/young-serif/files/young-serif-latin-400-normal.woff'],
 ['inter','Inter (sans)','node_modules/@fontsource/inter/files/inter-latin-500-normal.woff'],
 ['manrope','Manrope (sans)','node_modules/@fontsource/manrope/files/manrope-latin-600-normal.woff'],
];
const word='Simulimmo', out=[];
for(const [id,name,file] of list){
  const f=ot.loadSync(file); const size=targetCap/capH(f)*f.unitsPerEm;
  let x=x0; const gl=f.stringToGlyphs(word), letters=[];
  gl.forEach((g,i)=>{
    const p=g.getPath(x,baseline,size); const subs=[]; let cur=null;
    for(const c of p.commands){
      if(c.type==='M'){cur=[{x:r(c.x),y:r(c.y),i:null,o:null}];subs.push(cur);}
      else if(c.type==='L'){cur.push({x:r(c.x),y:r(c.y),i:null,o:null});}
      else if(c.type==='Q'){const p0=cur[cur.length-1];p0.o={x:r(p0.x+2/3*(c.x1-p0.x)),y:r(p0.y+2/3*(c.y1-p0.y))};cur.push({x:r(c.x),y:r(c.y),i:{x:r(c.x+2/3*(c.x1-c.x)),y:r(c.y+2/3*(c.y1-c.y))},o:null});}
      else if(c.type==='C'){cur[cur.length-1].o={x:r(c.x1),y:r(c.y1)};cur.push({x:r(c.x),y:r(c.y),i:{x:r(c.x2),y:r(c.y2)},o:null});}
      else if(c.type==='Z'){const a=cur[0],b=cur[cur.length-1];if(cur.length>1&&Math.abs(a.x-b.x)<.01&&Math.abs(a.y-b.y)<.01){a.i=b.i;cur.pop();}}
    }
    letters.push({ch:word[i],subs:subs.filter(s=>s.length>=2)});
    x+=g.advanceWidth*size/f.unitsPerEm; if(i<gl.length-1) x+=f.getKerningValue(g,gl[i+1])*size/f.unitsPerEm;
  });
  out.push({id,name,letters,end:r(x)});
  console.error(id, r(size), r(x), letters.map(l=>l.subs.length).join(''));
}
fs.writeFileSync('fonts.json',JSON.stringify(out));
