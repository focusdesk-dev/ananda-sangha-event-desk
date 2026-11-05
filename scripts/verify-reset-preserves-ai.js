'use strict';
const assert=require('node:assert/strict');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);let target;
for(let i=0;i<40;i++){try{const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();target=pages.find(x=>x.type==='page'&&/index.html|Ananda/i.test((x.title||'')+' '+(x.url||'')));if(target?.webSocketDebuggerUrl)break}catch{}await wait(500)}
assert.ok(target?.webSocketDebuggerUrl,'Windows desktop not running');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
let n=0;const callbacks=new Map();ws.addEventListener('message',e=>{const x=JSON.parse(String(e.data)),cb=callbacks.get(x.id);if(cb){callbacks.delete(x.id);cb(x)}});
const send=(method,params={})=>new Promise((ok,bad)=>{const id=++n,t=setTimeout(()=>{callbacks.delete(id);bad(Error('CDP timeout '+method))},35000);callbacks.set(id,x=>{clearTimeout(t);if(x.error||x.result?.exceptionDetails)bad(Error(JSON.stringify(x.error||x.result.exceptionDetails)));else ok(x.result)});ws.send(JSON.stringify({id,method,params}))});
const run=async fn=>{const x=await send('Runtime.evaluate',{expression:'('+fn.toString()+')()',returnByValue:true,awaitPromise:true});return x.result?.value};
try{
await send('Page.enable');
assert.equal(await run(async function(){
 const k='annualEventRegistration.v1';
 const state=JSON.parse(localStorage.getItem(k)||'{}');
 state.events=[{id:'ci-event',name:'Test'}];state.volunteers=[{id:'ci-vol',name:'Test'}];
 state.students=[{id:'ci-student',name:'Test'}];state.classBatches=[{id:'ci-batch',name:'Test'}];
 state.classEnrollments=[{id:'ci-en',studentId:'ci-student',batchId:'ci-batch'}];
 localStorage.setItem(k,JSON.stringify(state));
 const encoder=new TextEncoder(),salt='aabbccdd00112233';
 const key=await crypto.subtle.importKey('raw',encoder.encode('CI-reset-password'),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:150000,hash:'SHA-256'},key,256);
 const hash=[...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,'0')).join('');
 localStorage.setItem('annualEventRegistration.security.v1',JSON.stringify({salt,hash}));
 const result=await window.anandaDesktop.setAiKey('sk-test-ananda-preserved-1234567890123456');
 if(!result?.ok)throw Error('Unable to seed test key');
 return(await window.anandaDesktop.aiStatus()).configured;
}),true,'AI key seed');
assert.equal(await run(function(){
 document.querySelector('[data-page="settings"]').click();
 document.getElementById('v123ResetSettings').click();
 const dlg=document.getElementById('v87MasterResetModal');
 if(!dlg.classList.contains('open'))throw Error('Reset modal did not open');
 document.getElementById('v87MasterResetCancel').click();
 return !dlg.classList.contains('open')&&JSON.parse(localStorage.getItem('annualEventRegistration.v1')).students.length===1;
}),true,'cancel leaves data intact');
assert.equal(await run(async function(){
 document.getElementById('v123ResetSettings').click();
 document.getElementById('v87ResetPassword').value='wrong';
 document.getElementById('v87ResetConfirm').value='DELETE';
 document.getElementById('v87ResetSubmit').click();
 await new Promise(r=>setTimeout(r,550));
 return /incorrect administrator password/i.test(document.getElementById('v87ResetError').textContent)&&
   JSON.parse(localStorage.getItem('annualEventRegistration.v1')).students.length===1;
}),true,'wrong password rejected');
assert.equal(await run(function(){
 document.getElementById('v87ResetPassword').value='CI-reset-password';
 document.getElementById('v87ResetConfirm').value='DELETE';
 window.confirm=()=>true;
 setTimeout(()=>document.getElementById('v87ResetSubmit').click(),50);
 return true;
}),true);
await wait(2600);
const after=await run(async function(){
 const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1')||'{}');
 const ai=await window.anandaDesktop.aiStatus();
 return{students:(s.students||[]).length,batches:(s.classBatches||[]).length,
  enrollments:(s.classEnrollments||[]).length,events:(s.events||[]).length,
  volunteers:(s.volunteers||[]).length,ai:ai.configured,
  security:!!localStorage.getItem('annualEventRegistration.security.v1')};
});
assert.deepEqual([after.students,after.batches,after.enrollments,after.events,after.volunteers],[0,0,0,0,0],'records must be empty');
assert.equal(after.ai,true,'encrypted AI key preserved after reload');
assert.equal(after.security,true,'admin security retained');
console.log('PASS real Windows reset: cancel, wrong password, delete records, AI key retained after reload');
}finally{ws.close()}
}
main().catch(e=>{console.error('FAIL real Windows reset '+e.stack);process.exitCode=1});
