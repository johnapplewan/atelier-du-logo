const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\./, r=>r.abort());
await p.addInitScript(()=>{
  const store={}, subs={}; window.__sent=[]; window.__store=store;
  const doc=path=>({get:async()=>({exists:!!store[path],data:()=>store[path],metadata:{}}),
    set:async d=>{store[path]=d;}, onSnapshot:(fn)=>{subs[path]=fn; return ()=>{};}});
  window.__remote=(path,d)=>{store[path]=d; subs[path]&&subs[path]({exists:true,data:()=>d,metadata:{hasPendingWrites:false,fromCache:false}});};
  window.claude={use:async n=>n==='db'?{doc}:n==='comments'?{canSendToClaude:async()=>'available',anchorFor:async()=>({path:'x',x:0,y:0}),sendToClaude:async t=>{window.__sent.push(t);return {threadId:'t',commentId:'c'}}}:null};
});
await p.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await p.waitForTimeout(600);
const ws=async(x,y)=>p.evaluate(([x,y])=>{const r=document.querySelector('#cv').getBoundingClientRect(),v=__atelier.view;return {x:r.left+v.tx+x*v.k,y:r.top+v.ty+y*v.k}},[x,y]);
await p.keyboard.press('b'); let q=await ws(165,165); await p.mouse.click(q.x,q.y);
await p.fill('#noteText','Coin supérieur plus rond'); await p.locator('#noteText').blur();
await p.click('#sendAll'); await p.waitForTimeout(300);
console.log('sent:',JSON.stringify(await p.evaluate(()=>__sent)));
console.log('msg:',await p.textContent('#sendMsg'));
console.log('db notes saved:',await p.evaluate(()=>!!__store['atelier/notes']));
// remote update from Claude
await p.evaluate(()=>{const L=JSON.parse(__store['atelier/shape']?__store['atelier/shape'].data:JSON.stringify(__atelier.layers)); L[4].fill='#000000'; __remote('atelier/shape',{data:JSON.stringify(L),at:Date.now()+5000});
 const N=JSON.parse(__store['atelier/notes'].data); N[0].reply='Fait : rayon porté à 26.'; N[0].done=true; __remote('atelier/notes',{data:JSON.stringify(N),at:Date.now()+5000});});
await p.waitForTimeout(2500);
console.log('fill after remote',await p.evaluate(()=>__atelier.layers[4].fill),'note done',await p.evaluate(()=>__atelier.notes[0].done));
await p.click('#notes .note'); await p.waitForTimeout(100);
await p.screenshot({path:__dirname+'/s5.png'});
await p.click('#undo'); console.log('fill after undo',await p.evaluate(()=>__atelier.layers[4].fill));
await p.click('#exportBtn');
for(const m of ['full','mark','word']){ await p.check('input[value='+m+']'); const v=await p.inputValue('#svgcode'); console.log(m, v.match(/viewBox="[^"]+"/)[0], (v.match(/<path/g)||[]).length); }
await p.selectOption('#exLayer','lettre-3'); let v=await p.inputValue('#svgcode'); console.log('layer m', v.match(/viewBox="[^"]+"/)[0]);
await p.check('#exCrop'); v=await p.inputValue('#svgcode'); console.log('layer m crop', v.match(/viewBox="[^"]+"/)[0]);
await p.screenshot({path:__dirname+'/s6.png'});
const n=await p.evaluate(async()=>{const b=await __buildZip(false); const z=await JSZip.loadAsync(b); return Object.keys(z.files).length+' '+b.size;}); console.log('zip files/size',n);
console.log('errors',errs); await b.close();})();
