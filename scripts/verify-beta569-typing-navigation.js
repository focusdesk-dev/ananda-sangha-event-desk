'use strict';
// Regression for a reported production failure: after closing New Batch and
// switching screens, the application stops accepting keyboard input until restart.
// Runs against the actual packaged Windows Electron desktop application.
const assert=require('node:assert/strict');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);
 let target;
 for(let i=0;i<50;i++){
   try{
     const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
     target=pages.find(x=>x.type==='page'&&/index.html|Ananda/i.test((x.title||'')+' '+(x.url||'')));
     if(target?.webSocketDebuggerUrl)break;
   }catch{}
   await delay(300);
 }
 assert.ok(target?.webSocketDebuggerUrl,'Packaged Windows app unavailable');
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
 const callbacks=new Map();let serial=0;
 ws.addEventListener('message',event=>{
   const msg=JSON.parse(String(event.data)), cb=callbacks.get(msg.id);
   if(cb){callbacks.delete(msg.id);cb(msg)}
 });
 const send=(method,params={})=>new Promise((ok,bad)=>{
   const id=++serial;
   const timeout=setTimeout(()=>{callbacks.delete(id);bad(Error('CDP timeout '+method))},25000);
   callbacks.set(id,msg=>{
     clearTimeout(timeout);
     if(msg.error||msg.result?.exceptionDetails)bad(Error(JSON.stringify(msg.error||msg.result.exceptionDetails)));
     else ok(msg.result);
   });
   ws.send(JSON.stringify({id,method,params}));
 });
 const run=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 const visit=async page=>{
   const ok=await run("(()=>{const click=sel=>{const el=document.querySelector(sel);if(!el)return false;el.click();return true;};"+
    "if("+JSON.stringify(page)+"==='classes'){if(!click('.nav-btn[data-page=\\\"classes\\\"]'))return false;}"+
    "else if("+JSON.stringify(page)+"==='studentProgress'){if(!click('.nav-btn[data-page=\\\"classes\\\"]'))return false;if(!click('.go[data-go=\\\"studentProgress\\\"]'))return false;}"+
    "else if("+JSON.stringify(page)+"==='students'){if(!click('.nav-btn[data-page=\\\"permanentRecords\\\"]'))return false;if(!click('.go[data-go=\\\"students\\\"]'))return false;}"+
    "else return false;return document.getElementById("+JSON.stringify(page)+")?.classList.contains('active')===true})()");
   assert.equal(ok,true,'navigate to '+page);
 };
 const type=async (field,value)=>{
   const ready=await run("(()=>{const x=document.getElementById("+JSON.stringify(field)+");if(!x)return false;x.value='';x.focus();return document.activeElement===x})()");
   assert.equal(ready,true,'focus '+field);
   await send('Input.insertText',{text:value.slice(0,1)});
   await send('Input.insertText',{text:value.slice(1)});
   const actual=await run("(()=>{const x=document.getElementById("+JSON.stringify(field)+");return {value:x?.value||'',focused:document.activeElement===x}})()");
   assert.equal(actual.value,value,'input text must accumulate in '+field);
   assert.equal(actual.focused,true,'input must retain focus in '+field);
 };
 try{
   await send('Page.enable');
   // Prior regression tests may have left a form open.
   await run("document.querySelectorAll('.modal-backdrop.open').forEach(m=>m.classList.remove('open'))");
   for(let cycle=0;cycle<100;cycle++){
     await visit('classes');
     assert.equal(await run("(()=>{document.getElementById('p2AddBatch')?.click();return document.getElementById('p2BatchModal')?.classList.contains('open')===true})()"),true,'New Batch opened');
     await type('p2BatchName','Trial '+cycle);
     assert.equal(await run("(()=>{document.querySelector('[data-close=\"p2BatchModal\"]')?.click();return !document.getElementById('p2BatchModal')?.classList.contains('open')})()"),true,'New Batch closed');
     await visit('studentProgress');
     assert.equal(await run("(()=>{const tab=document.getElementById('p2v520Followups');if(!tab)return false;tab.click();return !!document.getElementById('p2v526Search')})()"),true,'Student Wise tab opened');
     await type('p2v526Search','Student '+cycle);
     await visit('students');
     assert.equal(await run("(()=>{document.getElementById('p2AddStudent')?.click();return document.getElementById('p2StudentModal')?.classList.contains('open')===true})()"),true,'New Student opened');
     await type('p2StudentName','Volunteer '+cycle);
     await run("document.querySelector('[data-close=\"p2StudentModal\"]')?.click()");
     if(cycle%25===24)console.log('Keyboard regression cycles passed: '+(cycle+1));
   }
   console.log('PASS actual packaged Windows app: 100 New Batch close -> Student Wise type -> Student Master type navigation cycles, without restart');
 }finally{ws.close()}
}
main().catch(error=>{console.error('FAIL application-wide keyboard navigation regression: '+error.stack);process.exitCode=1});
