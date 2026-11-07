// Converts the word "Simulimmo" (or its transliteration) into outlines for each typeface.
// Shaping with HarfBuzz (handles Arabic joining, Devanagari conjuncts, Thai, CJK); one layer per cluster.
import * as hb from 'harfbuzzjs'; import fs from 'fs';
const E='node_modules/@expo-google-fonts/';
const ttf=(pkg,w)=>{ const d=E+pkg+'/'+w; const f=fs.readdirSync(d).find(x=>x.endsWith('.ttf')); return d+'/'+f; };
const lic=pkg=>{ try{ return /Apache/.test(fs.readFileSync(E+pkg+'/LICENSE_FONT','utf8'))?'Apache 2.0':'SIL OFL 1.1'; }catch(_){ return 'SIL OFL 1.1'; } };
const W='Simulimmo';
// [id, name, category, file, text, options]
const S=[
 ['instrument','Instrument Serif (actuelle)','Classiques','ttf/instrument-serif-400.ttf',W,{license:'SIL OFL 1.1'}],
 ['montserrat','Montserrat','Classiques',['montserrat','500Medium'],W],
 ['roboto','Roboto','Classiques',['roboto','400Regular'],W],
 ['opensans','Open Sans','Classiques',['open-sans','400Regular'],W],
 ['lato','Lato','Classiques',['lato','400Regular'],W],
 ['poppins','Poppins','Classiques',['poppins','500Medium'],W],
 ['raleway','Raleway','Classiques',['raleway','500Medium'],W],
 ['inter','Inter','Classiques',['inter','500Medium'],W],
 ['spacegrotesk','Space Grotesk','Classiques',['space-grotesk','500Medium'],W],
 ['josefin','Josefin Sans','Classiques',['josefin-sans','400Regular'],W],
 ['oswald','Oswald (étroite)','Classiques',['oswald','500Medium'],W],
 ['playfair','Playfair Display','Classiques',['playfair-display','400Regular'],W],
 ['merriweather','Merriweather','Classiques',['merriweather','400Regular'],W],
 ['baskerville','Libre Baskerville','Classiques',['libre-baskerville','400Regular'],W],
 ['ebgaramond','EB Garamond','Classiques',['eb-garamond','400Regular'],W],
 ['dmserif','DM Serif Display','Classiques',['dm-serif-display','400Regular'],W],
 ['fraunces','Fraunces','Classiques',['fraunces','400Regular'],W],
 ['youngserif','Young Serif','Classiques',['young-serif','400Regular'],W],
 ['abril','Abril Fatface (affiche)','Classiques',['abril-fatface','400Regular'],W],
 ['playfair-i','Playfair Display italique','Italiques',['playfair-display','400Regular_Italic'],W],
 ['lora-i','Lora italique','Italiques',['lora','400Regular_Italic'],W],
 ['cormorant-i','Cormorant Garamond italique','Italiques',['cormorant-garamond','500Medium_Italic'],W],
 ['fraunces-i','Fraunces italique','Italiques',['fraunces','400Regular_Italic'],W],
 ['montserrat-i','Montserrat italique','Italiques',['montserrat','500Medium_Italic'],W],
 ['dancing','Dancing Script','Manuscrites',['dancing-script','500Medium'],W],
 ['greatvibes','Great Vibes','Manuscrites',['great-vibes','400Regular'],W],
 ['pacifico','Pacifico','Manuscrites',['pacifico','400Regular'],W],
 ['caveat','Caveat','Manuscrites',['caveat','500Medium'],W],
 ['sacramento','Sacramento','Manuscrites',['sacramento','400Regular'],W],
 ['satisfy','Satisfy','Manuscrites',['satisfy','400Regular'],W],
 ['homemade','Homemade Apple','Manuscrites',['homemade-apple','400Regular'],W],
 ['marker','Permanent Marker','Graffiti',['permanent-marker','400Regular'],W],
 ['rocksalt','Rock Salt','Graffiti',['rock-salt','400Regular'],W],
 ['sedgwick','Sedgwick Ave Display','Graffiti',['sedgwick-ave-display','400Regular'],W],
 ['spraypaint','Rubik Spray Paint','Graffiti',['rubik-spray-paint','400Regular'],W],
 ['fraktur','UnifrakturMaguntia (gothique)','Ornementales et arabesques',['unifrakturmaguntia','400Regular'],W],
 ['monoton','Monoton (filets)','Ornementales et arabesques',['monoton','400Regular'],W],
 ['ruqaa-latin','Aref Ruqaa (arabesque)','Ornementales et arabesques',['aref-ruqaa','400Regular'],W],
 ['montserrat-strike','Montserrat barrée','Barrées et majuscules',['montserrat','500Medium'],W,{strike:true}],
 ['playfair-strike','Playfair barrée','Barrées et majuscules',['playfair-display','400Regular'],W,{strike:true}],
 ['montserrat-caps','Montserrat MAJUSCULES','Barrées et majuscules',['montserrat','600SemiBold'],'SIMULIMMO'],
 ['bebas','Bebas Neue MAJUSCULES','Barrées et majuscules',['bebas-neue','400Regular'],'SIMULIMMO'],
 ['cinzel','Cinzel MAJUSCULES','Barrées et majuscules',['cinzel','500Medium'],'SIMULIMMO'],
 ['hiragana','Hiragana · しみゅりも','Écritures du monde',['noto-sans-jp','500Medium'],'しみゅりも'],
 ['katakana','Katakana · シミュリモ','Écritures du monde',['noto-sans-jp','500Medium'],'シミュリモ'],
 ['kanji','Kanji · 示夢理門','Écritures du monde',['noto-serif-jp','500Medium'],'示夢理門'],
 ['hanzi','Sinogrammes · 西穆利莫','Écritures du monde',['noto-sans-sc','500Medium'],'西穆利莫'],
 ['arabic','Arabe naskh · سيموليمو','Écritures du monde',['noto-naskh-arabic','400Regular'],'سيموليمو'],
 ['arabic-ruqaa','Arabe ruqaa · سيموليمو','Écritures du monde',['aref-ruqaa','400Regular'],'سيموليمو'],
 ['thai','Thaï · ซิมูลิมโม','Écritures du monde',['noto-sans-thai','500Medium'],'ซิมูลิมโม'],
 ['korean','Coréen · 시뮬림모','Écritures du monde',['noto-sans-kr','500Medium'],'시뮬림모'],
 ['russian','Russe · Симулиммо','Écritures du monde',['playfair-display','400Regular'],'Симулиммо'],
 ['russian-sans','Russe · Симулиммо (sans)','Écritures du monde',['montserrat','500Medium'],'Симулиммо'],
 ['hindi','Hindi · सिमुलिम्मो','Écritures du monde',['noto-sans-devanagari','500Medium'],'सिमुलिम्मो'],
 ['hieroglyphs','Hiéroglyphes · 𓋴𓇋𓅓𓅱𓃭𓇋𓅓𓅓𓅱','Pictogrammes et hiéroglyphes',['noto-sans-egyptian-hieroglyphs','400Regular'],'𓋴𓇋𓅓𓅱𓃭𓇋𓅓𓅓𓅱'],
 ['pictos','Pictogrammes · maison, clé, courbe','Pictogrammes et hiéroglyphes',['noto-emoji','500Medium'],'🏠🔑📈'],
];
const r1=n=>Math.round(n*10)/10;
const out=[];
for(const [id,name,cat,src,text,opt={}] of S){
  const file=Array.isArray(src)?ttf(src[0],src[1]):src;
  const face=new hb.Face(new hb.Blob(fs.readFileSync(file)),0), font=new hb.Font(face);
  const buf=new hb.Buffer(); buf.addText(text); buf.guessSegmentProperties(); hb.shape(font,buf);
  const gl=buf.getGlyphInfosAndPositions();
  // group glyphs by cluster, in visual order
  const clusters=[]; let pen=0;
  for(const g of gl){
    const cmds=font.glyphToJson(g.codepoint), ox=pen+(g.xOffset||0), oy=(g.yOffset||0);
    let c=clusters.find(k=>k.cl===g.cluster); if(!c){ c={cl:g.cluster, cmds:[]}; clusters.push(c); }
    c.cmds.push({cmds,ox,oy}); pen+=g.xAdvance;
  }
  // characters of each cluster (cluster = UTF-16 index of its first char)
  const starts=[...new Set(gl.map(g=>g.cluster))].sort((a,b)=>a-b);
  const chOf=cl=>{ const i=starts.indexOf(cl); return text.slice(cl, i+1<starts.length?starts[i+1]:text.length); };
  let letters=clusters.map(c=>{
    const subs=[]; let cur=null;
    for(const {cmds,ox,oy} of c.cmds){
      const P=(x,y)=>({x:ox+x, y:-(oy+y)});
      for(const k of cmds){ const v=k.values;
        if(k.type==='M'){ const p=P(v[0],v[1]); cur=[{x:p.x,y:p.y,i:null,o:null}]; subs.push(cur); }
        else if(k.type==='L'){ const p=P(v[0],v[1]); cur.push({x:p.x,y:p.y,i:null,o:null}); }
        else if(k.type==='Q'){ const p0=cur[cur.length-1], q=P(v[0],v[1]), p=P(v[2],v[3]);
          p0.o={x:p0.x+2/3*(q.x-p0.x), y:p0.y+2/3*(q.y-p0.y)}; cur.push({x:p.x,y:p.y,i:{x:p.x+2/3*(q.x-p.x),y:p.y+2/3*(q.y-p.y)},o:null}); }
        else if(k.type==='C'){ const a=P(v[0],v[1]), b=P(v[2],v[3]), p=P(v[4],v[5]); cur[cur.length-1].o=a; cur.push({x:p.x,y:p.y,i:b,o:null}); }
        else if(k.type==='Z'){ if(cur&&cur.length>1){ const a=cur[0], b=cur[cur.length-1]; if(Math.abs(a.x-b.x)<.01&&Math.abs(a.y-b.y)<.01){ a.i=b.i; cur.pop(); } } }
      }
    }
    return {ch:chOf(c.cl), subs:subs.filter(s=>s.length>=2)};
  }).filter(l=>l.subs.length);
  // normalise: word bounding box 164 high, top at 40.4, left at 309.98 (same frame as the current wordmark)
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const l of letters) for(const s of l.subs) for(const n of s){ x0=Math.min(x0,n.x); x1=Math.max(x1,n.x); y0=Math.min(y0,n.y); y1=Math.max(y1,n.y); }
  const k=164/(y1-y0), tx=309.98-x0*k, ty=40.4-y0*k;
  const T=p=>p&&({x:r1(tx+p.x*k), y:r1(ty+p.y*k)});
  letters=letters.map(l=>({ch:l.ch, subs:l.subs.map(s=>s.map(n=>({x:T(n).x,y:T(n).y,i:T(n.i)||null,o:T(n.o)||null})))}));
  if(opt.strike){ // synthetic strike-through bar at the middle of the x-height
    const wx1=309.98+(x1-x0)*k, y=40.4+164*0.70, h=10;
    letters.push({ch:'—', subs:[[{x:r1(300),y:r1(y-h/2),i:null,o:null},{x:r1(wx1+10),y:r1(y-h/2),i:null,o:null},{x:r1(wx1+10),y:r1(y+h/2),i:null,o:null},{x:r1(300),y:r1(y+h/2),i:null,o:null}]]});
  }
  const perLetter = text===W && !opt.strike && letters.length===9;
  // editable text: Latin / Cyrillic typefaces get a glyph file (key = ttf), with the scale/baseline used here
  const editable = (text===W || text==='SIMULIMMO' || /Симулиммо/.test(text));
  const gkey = editable ? (Array.isArray(src)?src[0]+'_'+src[1]:'instrument') : null;
  out.push({id,name,cat,text,license:opt.license||lic(src[0]),perLetter,letters, k:+k.toFixed(6), ty:+ty.toFixed(2), gkey, upper:text==='SIMULIMMO'||undefined, strike:opt.strike||undefined, file:editable?file:undefined});
  console.error(id.padEnd(16), letters.length, perLetter?'':'(mot entier)');
}
fs.writeFileSync('fonts-meta.json',JSON.stringify(out.map(f=>({gkey:f.gkey,file:f.file,id:f.id}))));
out.forEach(f=>{ delete f.file; });
fs.writeFileSync('fonts.js','window.FONTS='+JSON.stringify(out)+';\n');
console.error('fonts:',out.length,'size',fs.statSync('fonts.js').size);
