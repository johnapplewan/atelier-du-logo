// One glyph file per editable typeface: outlines (font units, y down, SVG path strings), advances, kerning.
const ot=require('../gen/node_modules/opentype.js'); const fs=require('fs');
const meta=JSON.parse(fs.readFileSync('fonts-meta.json','utf8'));
const LAT=' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸŒÆ’‘“”«»–—…€£°';
const CYR='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const KERN='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,-’';
fs.mkdirSync('../../app/glyphs',{recursive:true});
const done=new Set(); let total=0;
for(const m of meta){ if(!m.gkey||done.has(m.gkey)) continue; done.add(m.gkey);
  const f=ot.loadSync(m.file); const gl={}, adv={}, kern={};
  for(const ch of [...LAT, ...CYR]){ const g=f.charToGlyph(ch); if(!g||g.index===0) continue;
    adv[ch]=Math.round(g.advanceWidth);
    if(ch===' ') continue;
    const d=g.getPath(0,0,f.unitsPerEm).toPathData(0); if(d) gl[ch]=d; }
  for(const a of KERN){ const ga=f.charToGlyph(a); if(!ga||!ga.index) continue; for(const b of KERN){ const gb=f.charToGlyph(b); if(!gb||!gb.index) continue; const v=f.getKerningValue(ga,gb); if(v) kern[a+b]=Math.round(v); } }
  const out='window.__G=window.__G||{};window.__G['+JSON.stringify(m.gkey)+']='+JSON.stringify({upem:f.unitsPerEm,adv,gl,kern})+';\n';
  fs.writeFileSync('../../app/glyphs/'+m.gkey+'.js',out); total+=out.length; console.error(m.gkey, Object.keys(gl).length, Object.keys(kern).length, out.length);
}
console.error('total',total);
