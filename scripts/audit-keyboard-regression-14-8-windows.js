'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 let page;
 for(let i=0;i<60;i++){try{const p=await(await fetch('http://127.0.0.1:9223/json/list')).json();page=p.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));if(page?.webSocketDebuggerUrl)break}catch{} await sleep(300)}
 assert(page?.webSocketDebuggerUrl,'Actual Windows application not running');
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
 let id=0;const callbacks=new Map(),issues=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.method==='Runtime.exceptionThrown')issues.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text||'Uncaught exception');if(callbacks.has(m.id)){const cb=callbacks.get(m.id);callbacks.delete(m.id);cb(m)}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,t=setTimeout(()=>{callbacks.delete(n);reject(Error('CDP timeout '+method))},20000);callbacks.set(n,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)reject(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else resolve(m.result)});ws.send(JSON.stringify({id:n,method,params}))});
 const js=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 const fn=async f=>js('('+f.toString()+')()');
 const results=[];
 async function audit(name,cb){
  try{const r=await cb();results.push({name,status:'PASS',details:r});console.log('PASS_KEYBOARD '+name+' '+JSON.stringify(r).slice(0,450))}
  catch(e){const details=String(e.stack||e);results.push({name,status:'FAIL',details});console.log('FAIL_KEYBOARD '+name+' '+details.slice(0,800))}
 }
 await call('Runtime.enable');
 try{
  await audit('Current Windows app and native focus condition',async()=>{
    const info=await fn(function(){return{
      patch:window.anandaEnrolSaveAndConfirmVersion,
      keyboardFocusId:document.activeElement?.id||document.activeElement?.tagName,
      viewportHasFocus:document.hasFocus(),
      activeModals:[...document.querySelectorAll('.modal-backdrop.open')].map(x=>x.id)}});
    assert.equal(info.patch,'14.8');return info;
  });
  await audit('New Batch typing after cancel, 45 navigation cycles',async()=>{
    let completed=0;
    for(let i=0;i<45;i++){
      const opened=await fn(function(){
        document.querySelectorAll('.modal-backdrop.open').forEach(m=>m.classList.remove('open'));
        document.querySelector('aside .nav-btn[data-page="classes"]')?.click();
        document.getElementById('p2AddBatch')?.click();
        const modal=document.getElementById('p2BatchModal');
        const input=document.getElementById('p2BatchName');
        input.value='';input.focus();
        return{open:modal.classList.contains('open'),focused:document.activeElement===input}});
      assert(opened.open&&opened.focused,'New Batch did not open or focus on cycle '+i);
      await call('Input.insertText',{text:'Keyboard-'+i});
      const actual=await js('document.getElementById("p2BatchName").value');
      assert.equal(actual,'Keyboard-'+i,'Typed name lost on cycle '+i);
      await fn(function(){document.querySelector('[data-close="p2BatchModal"]')?.click();document.querySelector('aside .nav-btn[data-page="events"]')?.click();});
      completed++;
    }
    return{completed};
  });
  await audit('Settings, Classes, Event and volunteer input focus after navigation',async()=>{
    const routes=[['settings','v52NewPassword'],['classes','p2ClassSearch'],['events','eventSearch'],['permanentRecords',null]];
    const info=[];
    for(const [pageId,inputId] of routes){
      const result=await fn(function(){
        document.querySelectorAll('.modal-backdrop.open').forEach(m=>m.classList.remove('open'));
        return document.hasFocus()});
      await js('document.querySelector('+JSON.stringify('aside .nav-btn[data-page="'+pageId+'"]')+')?.click()');
      const value=await fn(function(){return{page:document.querySelector('.page.active')?.id,
        hasFocus:document.hasFocus(),modals:[...document.querySelectorAll('.modal-backdrop.open')].map(x=>x.id)}});
      info.push({pageId,inputId,value});
      if(value.page!==pageId&&!(pageId==='classes'&&value.page==='classes'))throw Error('Navigation failed for '+pageId);
    }
    return info;
  });
  await audit('Enrol form search/name/mobile input: 40 open-close cycles',async()=>{
    let n=0;
    for(let i=0;i<40;i++){
      const active=await fn(function(){
        document.querySelectorAll('.modal-backdrop.open').forEach(m=>m.classList.remove('open'));
        document.querySelector('aside .nav-btn[data-page="classes"]')?.click();
        return{page:document.querySelector('.page.active')?.id,nav:!!document.getElementById('p2ClassBatches')}});
      const student=await fn(function(){
        document.getElementById('p2AddStudent')?.click();
        const name=document.getElementById('p2StudentName');
        if(!name)throw Error('Student form not mounted');
        name.value='';name.focus();return{nameFocused:document.activeElement===name,modal:document.getElementById('p2StudentModal')?.classList.contains('open')}});
      if(!student.nameFocused||!student.modal)throw Error('Cannot open or focus student form, cycle '+i);
      await call('Input.insertText',{text:'Student Keyboard '+i});
      assert.equal(await js('document.getElementById("p2StudentName").value'),'Student Keyboard '+i);
      await fn(function(){document.querySelector('[data-close="p2StudentModal"]')?.click();});
      n++;
    }
    return{completed:n};
  });
  await audit('Shortcut + remains available and does not hijack ordinary text',async()=>{
    const result=await fn(function(){
      const input=document.getElementById('p2StudentName');input.value='';input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'+',code:'Equal',shiftKey:true}));
      return{insideTextValue:input.value,activeModal:document.querySelector('.modal-backdrop.open')?.id||'',focused:document.activeElement===input}
    });
    return result;
  });
  await audit('All live exceptions since audit',async()=>{
    assert.equal(issues.length,0,'Uncaught exceptions: '+issues.join(' ; ').slice(0,700));
    return{exceptions:issues.length};
  });
 }finally{ws.close()}
 const report={timestamp:new Date().toISOString(),checks:results,exceptions:issues,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length};
 fs.mkdirSync('keyboard-audit',{recursive:true});
 fs.writeFileSync('keyboard-audit/report.json',JSON.stringify(report,null,2));
 fs.writeFileSync('keyboard-audit/summary.md','# Keyboard Freeze Regression Audit — Patch14.8\n\n'+results.map(r=>'- **'+r.status+'** '+r.name+'\n'+(r.status==='FAIL'?'  '+r.details.slice(0,700).replace(/\n/g,'\n  '):'')).join('\n')+'\n');
 console.log('KEYBOARD_AUDIT_SUMMARY '+JSON.stringify({passed:report.passed,failed:report.failed,failures:results.filter(x=>x.status==='FAIL').map(x=>x.name)}));
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
