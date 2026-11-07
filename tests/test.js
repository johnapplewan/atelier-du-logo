const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1440,height:900}}); const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.route(/fonts\.(googleapis|gstatic)/, r=>r.abort());
await p.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await p.waitForTimeout(500);
const dir=__dirname;
const n=await p.locator('#art path').count(); console.log('paths rendered',n);
await p.screenshot({path:dir+'/s1.png'});
// helper world->screen
const ws=async(x,y)=>p.evaluate(([x,y])=>{const r=document.querySelector('#cv').getBoundingClientRect(),v=__atelier.view;return {x:r.left+v.tx+x*v.k,y:r.top+v.ty+y*v.k}},[x,y]);
// select brass tile with points tool
await p.keyboard.press('p');
let pt=await ws(165,165); await p.mouse.click(pt.x,pt.y);
console.log('sel',JSON.stringify(__=await p.evaluate(()=>__atelier.sel)));
// drag node 0 of brass tile (154,134) to (154,120)
pt=await ws(154,134); await p.mouse.move(pt.x,pt.y); await p.mouse.down(); const t2=await ws(150,118); await p.mouse.move(t2.x,t2.y,{steps:5}); await p.mouse.up();
let L=await p.evaluate(()=>__atelier.layers.find(l=>l.id==='carreau-bd').subs[0]);
console.log('moved node0',L[0].x,L[0].y,'count',L.length);
// add point: click on right edge segment between node2 (196,154) and node3 (196,176): x=196,y=165
pt=await ws(196,165); await p.mouse.click(pt.x,pt.y);
L=await p.evaluate(()=>__atelier.layers.find(l=>l.id==='carreau-bd').subs[0]);
console.log('after add count',L.length, JSON.stringify(await p.evaluate(()=>__atelier.sel.node)));
// delete with Delete key
await p.keyboard.press('Delete');
L=await p.evaluate(()=>__atelier.layers.find(l=>l.id==='carreau-bd').subs[0]);
console.log('after delete count',L.length);
// undo / redo
await p.keyboard.press('Control+z'); console.log('undo count',(await p.evaluate(()=>__atelier.layers.find(l=>l.id==='carreau-bd').subs[0].length)));
await p.keyboard.press('Control+Shift+z'); console.log('redo count',(await p.evaluate(()=>__atelier.layers.find(l=>l.id==='carreau-bd').subs[0].length)));
await p.screenshot({path:dir+'/s2.png'});
// bubble
await p.keyboard.press('b'); pt=await ws(90,90); await p.mouse.click(pt.x,pt.y);
await p.fill('#noteText','Arrondir le carreau laiton'); await p.locator('#noteText').blur(); await p.waitForTimeout(800);
console.log('notes',JSON.stringify(await p.evaluate(()=>__atelier.notes.map(n=>[n.n,n.text]))), 'list items',await p.locator('#notes .note').count());
// layer visibility toggle on letter 1
await p.locator('.layer[data-id="lettre-1"] [data-act=vis]').click(); console.log('visible letter1', await p.evaluate(()=>__atelier.layers.find(l=>l.id==='lettre-1').visible));
await p.locator('.layer[data-id="lettre-1"] [data-act=vis]').click();
// export
await p.click('#exportBtn'); await p.check('input[value=full]'); const svg=await p.inputValue('#svgcode');
console.log('svg head',svg.slice(0,140).replace(/\n/g,' '),'paths',(svg.match(/<path/g)||[]).length);
await p.screenshot({path:dir+'/s3.png'});
await p.click('#exClose');
// persistence: reload
await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(500);
console.log('after reload notes',await p.evaluate(()=>__atelier.notes.length),'node0',JSON.stringify(await p.evaluate(()=>__atelier.layers.find(l=>l.id==='carreau-bd').subs[0][0])));
// reset
await p.click('#reset'); await p.click('#cfYes'); console.log('reset node0',JSON.stringify(await p.evaluate(()=>__atelier.layers.find(l=>l.id==='carreau-bd').subs[0][0])));
// tablet touch
const tctx=await b.newContext({viewport:{width:1024,height:1366},hasTouch:true,isMobile:true}); const tp=await tctx.newPage(); tp.on('pageerror',e=>errs.push('tab:'+e.message));
await tp.goto('file://'+require('path').resolve(__dirname,'../app/index.html')); await tp.waitForTimeout(500);
await tp.locator('[data-tool=points]').tap();
const tws=async(x,y)=>tp.evaluate(([x,y])=>{const r=document.querySelector('#cv').getBoundingClientRect(),v=__atelier.view;return {x:r.left+v.tx+x*v.k,y:r.top+v.ty+y*v.k}},[x,y]);
let q=await tws(90,90); await tp.touchscreen.tap(q.x,q.y);
q=await tws(80,60);
// touch drag via CDP
const cdp=await tctx.newCDPSession(tp);
const tdisp=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
await tdisp('touchStart',q.x,q.y); for(let i=1;i<=5;i++) await tdisp('touchMove',q.x,q.y-i*4); await tdisp('touchEnd');
console.log('tablet sel',JSON.stringify(await tp.evaluate(()=>__atelier.sel)),'node0',JSON.stringify(await tp.evaluate(()=>__atelier.layers.find(l=>l.id==='carreau-hg').subs[0][0])));
await tp.screenshot({path:dir+'/s4.png'});
console.log('errors',errs);
await b.close();})();
