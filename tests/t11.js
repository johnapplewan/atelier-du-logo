const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
await p.addInitScript(()=>{ window.__saved=[]; window.claude={use:async n=>n==='downloads'?{save:async({filename,data})=>{ const sz=data.size!==undefined?data.size:data.length; const head=data.arrayBuffer?Array.from(new Uint8Array(await data.slice(0,4).arrayBuffer())).map(x=>x.toString(16)).join(' '):data.slice(0,30); window.__saved.push([filename,sz,head]); return {status:'saved'}; }}:null}; });
await p.goto('file://'+require('path').resolve(__dirname,'../app/index.html'));await p.waitForTimeout(600);
// make a group of the 4 panes
await p.click('.layer[data-id="carreau-hg"] .nm'); await p.click('.layer[data-id="carreau-bd"] .nm',{modifiers:['Shift']}); await p.keyboard.press('Control+g');
await p.click('#exportBtn'); await p.check('input[name=exm][value=group]');
console.log('group svg paths', (await p.inputValue('#svgcode')).match(/<path/g).length, await p.textContent('#exSave'));
await p.check('input[name=exf][value=png]'); await p.selectOption('#exW','2048'); await p.click('#exSave'); await p.waitForTimeout(800);
await p.check('input[name=exf][value=jpg]'); await p.click('#exSave'); await p.waitForTimeout(800);
await p.check('input[name=exm][value=full]'); await p.check('input[name=exf][value=svg]'); await p.click('#exSave'); await p.waitForTimeout(300);
console.log(JSON.stringify(await p.evaluate(()=>__saved)), 'bg jpg', await p.inputValue('#exBg'));
await p.screenshot({path:__dirname+'/s18.png'});
console.log(errs);await b.close();})();
