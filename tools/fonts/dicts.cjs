const fs=require('fs');
// ---- Chinese: toneless pinyin key -> simplified words/chars, ranked by frequency (CC-CEDICT CC BY-SA 4.0, SUBTLEX/Jun Da frequencies)
const wf={}; require('./node_modules/hanzi/lib/data/wordfreq.txt.js').split('\n').forEach(l=>{ const [w,f]=l.split('\t'); if(w) wf[w]=+f; });
const cf={}; require('./node_modules/hanzi/lib/data/frequencyjunda.txt.js').split('\n').forEach(l=>{ const p=l.split('\t'); if(p[1]) cf[p[1]]=+p[2]; });
const zh={};
const add=(k,w,score)=>{ (zh[k]=zh[k]||new Map()); const m=zh[k]; m.set(w,Math.max(m.get(w)||0,score)); };
require('./node_modules/hanzi/lib/data/cedict_ts.u8.js').split('\n').forEach(l=>{
  if(l.startsWith('#')) return; const m=/^(\S+) (\S+) \[([^\]]+)\]/.exec(l); if(!m) return;
  const simp=m[2], py=m[3].toLowerCase().replace(/u:/g,'v').replace(/[0-9]/g,'').replace(/\s+/g,'');
  if(!/^[a-z]+$/.test(py) || /[a-zA-Z0-9]/.test(simp) || simp.length>4) return;
  const score = simp.length===1 ? (cf[simp]||0)/40 : (wf[simp]||0);
  if(score<=0 && simp.length>1) return; if(simp.length===1 && !cf[simp]) return;
  add(py, simp, score);
});
const zhOut={}; for(const k in zh){ zhOut[k]=[...zh[k].entries()].sort((a,b)=>b[1]-a[1]).slice(0,24).map(x=>x[0]).join(''+'|'); }
fs.writeFileSync('../../app/dict-zh.js','window.__DICT_ZH='+JSON.stringify(zhOut)+';\n');
console.error('zh keys', Object.keys(zhOut).length, fs.statSync('../../app/dict-zh.js').size);
// ---- Japanese: hiragana reading -> kanji ranked by frequency (KANJIDIC via kanji.js, MIT / CC BY-SA)
const K=require('./node_modules/kanji.js/dist/kanji.js'); const ja={};
const kata2hira=s=>s.replace(/[\u30a1-\u30f6]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
for(let cp=0x4e00; cp<=0x9fff; cp++){ const ch=String.fromCharCode(cp); let d; try{ d=K.getDetails(ch); }catch(_){ continue; } if(!d||(!d.freq&&!d.grade)) continue;
  const score=d.freq?(3000-d.freq):(d.grade?500-d.grade*10:0);
  const rs=new Set([...(d.kunyomi||[]).map(r=>r.split('.')[0].replace(/-/g,'')), ...(d.onyomi||[]).map(kata2hira)]);
  for(const r of rs){ if(!r||!/^[\u3041-\u3096ー]+$/.test(r)) continue; (ja[r]=ja[r]||[]).push([ch,score]); } }
const jaOut={}; for(const k in ja) jaOut[k]=ja[k].sort((a,b)=>b[1]-a[1]).slice(0,20).map(x=>x[0]).join('');
fs.writeFileSync('../../app/dict-ja.js','window.__DICT_JA='+JSON.stringify(jaOut)+';\n');
console.error('ja keys', Object.keys(jaOut).length, fs.statSync('../../app/dict-ja.js').size, 'yume:', jaOut['ゆめ'], 'mu:', jaOut['む']);
console.error('zh ximu:', zhOut['ximu'], 'meng:', (zhOut['meng']||'').slice(0,40));
