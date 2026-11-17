'use strict';
const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const nativePID=process.env.ANANDA_APP_PID;
 assert(/^\d+$/.test(nativePID||''),'ANANDA_APP_PID not supplied');
 let target;
 for(let i=0;i<70;i++){
  try{const a=await(await fetch('http://127.0.0.1:9223/json/list')).json();target=a.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));if(target?.webSocketDebuggerUrl)break}catch{}
  await pause(180);
 }
 assert(target?.webSocketDebuggerUrl,'Packaged Windows Ananda window missing');
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
 const callbacks=new Map();let serial=0;
 ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data)),fn=callbacks.get(m.id);if(fn){callbacks.delete(m.id);fn(m)}});
 const call=(method,params={})=>new Promise((ok,bad)=>{
  const id=++serial,t=setTimeout(()=>{callbacks.delete(id);bad(Error('DevTools timeout '+method))},32000);
  callbacks.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)bad(Error(JSON.stringify(m.error||m.result?.exceptionDetails)));else ok(m.result)});
  ws.send(JSON.stringify({id,method,params}));
 });
 const js=async e=>(await call('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result.value;
 const fn=async f=>js('('+f.toString()+')()');
 let tested=0;const stages=[];
 const winType=message=>{
  const r=cp.spawnSync('powershell.exe',['-NoProfile','-File','scripts/audit-real-windows-keys-14-8.ps1','-ProcessId',nativePID,'-Text',message],{encoding:'utf8',timeout:22000});
  if(r.status!==0)throw Error('Native focus or key injection unavailable: '+(r.stderr||r.stdout||r.error||'').slice(0,700));
  return r.stdout.trim();
 };
 try{
  for(let i=0;i<12;i++){
   const stage=await fn(function(){
    document.querySelectorAll('.modal-backdrop.open').forEach(m=>m.classList.remove('open'));
    document.querySelector('aside .nav-btn[data-page="classes"]')?.click();
    document.getElementById('p2AddBatch')?.click();
    const input=document.getElementById('p2BatchName');input.value='';input.focus();
    return{open:document.getElementById('p2BatchModal').classList.contains('open'),focus:document.activeElement===input}
   });
   assert(stage.open&&stage.focus,'New Batch focus failed before sending actual OS keys');
   const str='NativeKeyboard'+i;
   const native=winType(str);
   const result=await js('({value:document.getElementById("p2BatchName").value,focused:document.activeElement?.id,hasFocus:document.hasFocus()})');
   stages.push({cycle:i,native,result});
   assert.equal(result.value,str,'Real Windows keyboard input LOST after New Batch at cycle '+i);
   await fn(function(){
    document.querySelector('[data-close="p2BatchModal"]')?.click();
    document.querySelector('aside .nav-btn[data-page="settings"]')?.click();
   });
   tested++;
  }
  // Confirm native keyboard remains functional in the Student Master modal too.
  const student=await fn(function(){
   document.querySelector('aside .nav-btn[data-page="classes"]').click();
   document.getElementById('p2AddStudent')?.click();
   const el=document.getElementById('p2StudentName');el.value='';el.focus();
   return{modal:document.getElementById('p2StudentModal')?.classList.contains('open'),focused:document.activeElement===el}
  });
  assert(student.modal&&student.focused,'Student Master field not focusable');
  const native=winType('AnandaNativeStudent');
  assert.equal(await js('document.getElementById("p2StudentName").value'),'AnandaNativeStudent','Native Windows student form input failed');
  stages.push({stage:'studentMaster',native,success:true});
  console.log('PASS_NATIVE_KEYBOARD: actual Windows foreground and SendKeys survived '+tested+' Batch cycles and Student Master');
 }finally{
  ws.close();
  fs.mkdirSync('keyboard-audit',{recursive:true});
  fs.writeFileSync('keyboard-audit/native-keyboard-details.json',JSON.stringify(stages,null,2));
 }
}
main().catch(e=>{console.error('NATIVE_KEYBOARD_TEST_FAILED '+(e.stack||e));process.exitCode=1});
