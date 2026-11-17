'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),wait=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync('enrol-batch-audit',{recursive:true});
async function main(){
 let p;for(let i=0;i<100;i++){try{const list=await(await fetch('http://127.0.0.1:9223/json/list')).json();p=list.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));if(p?.webSocketDebuggerUrl)break}catch{}await wait(180)}
 assert(p?.webSocketDebuggerUrl,'Windows packaged Ananda not available');
 const ws=new WebSocket(p.webSocketDebuggerUrl);
 await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
 let n=0;const waiting=new Map(),exceptions=[],out=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.id&&waiting.has(m.id)){const f=waiting.get(m.id);waiting.delete(m.id);f(m)}if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text||'Uncaught')});
 const call=(method,params={})=>new Promise((ok,bad)=>{const id=++n,t=setTimeout(()=>{waiting.delete(id);bad(Error('DevTools timeout '+method))},26000);waiting.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)bad(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else ok(m.result)});ws.send(JSON.stringify({id,method,params}))});
 const js=async s=>(await call('Runtime.evaluate',{expression:s,returnByValue:true,awaitPromise:true})).result.value;
 const fn=async f=>js('('+f.toString()+')()');
 await call('Runtime.enable');
 const key='annualEventRegistration.v1',original=await js('localStorage.getItem("annualEventRegistration.v1")');
 async function record(name,run){try{const result=await run();out.push({name,status:'PASS',result});console.log('PASS '+name+' '+JSON.stringify(result).slice(0,900));return result}catch(e){out.push({name,status:'FAIL',error:String(e.stack||e)});console.log('FAIL '+name+' '+String(e.stack||e).slice(0,900));return null}}
 const reset=async seed=>{await js('localStorage.setItem("annualEventRegistration.v1",'+JSON.stringify(JSON.stringify(seed))+')');await call('Page.reload',{ignoreCache:true});await wait(450)};
 const mobile=i=>String(7100000000+i);
 try{
  const base=await fn(function(){
    const state=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    const c=state.courseTypes.find(x=>x.name==='Level 1');
    if(!c)throw Error('Level 1 missing');
    return{state,courseId:c.id,patch:window.anandaEnrolSaveAndConfirmVersion};
  });
  assert.equal(base.patch,'14.8');
  for(const mode of ['existingMaster','freshMaster']){
    const state=structuredClone(base.state);
    state.students=[];state.classEnrollments=[];
    const b={id:'qa-20-'+mode,courseId:base.courseId,name:'QA 20 STUDENTS',level:'Level 1',start:'2026-11-18',end:'2026-12-18',year:2026,
      sessionDates:['2026-11-18','2026-11-25'],plannedSessions:[],courseFee:1500,scheduleType:'weekly',usualDay:3,status:'In Progress'};
    state.classBatches=[b];state.activeClassBatchId=b.id;
    // Intentional same-name/different-phone identities, as in supplied screenshot.
    if(mode==='existingMaster')for(let i=0;i<24;i++)state.students.push({id:'qa-stu-'+i,name:String.fromCharCode(65+Math.floor(i/2)),mobile:mobile(i),notes:'QA ONLY'});
    await reset(state);
    let failures=0;
    for(let i=0;i<24;i++){
      await js('window.__qaTestIndex='+i+';window.__qaTestMode='+JSON.stringify(mode));
      const result=await fn(function(){
        const i=Number(window.__qaTestIndex),mode=window.__qaTestMode,mobile=String(7100000000+i),name=String.fromCharCode(65+Math.floor(i/2));
        const read=()=>JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
        const batchId='qa-20-'+mode;
        document.querySelectorAll('.modal-backdrop.open').forEach(e=>e.classList.remove('open'));
        document.querySelector('aside .nav-btn[data-page="classes"]')?.click();
        document.getElementById('p2ClassBatches')?.click();
        document.querySelector('#p2ClassList .p2v510-class-year')?.click();
        const card=document.querySelector('#p2ClassList .p2v56-chat-class[data-id="'+batchId+'"]');
        if(!card)throw Error('Test class batch missing');
        card.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
        const btn=document.getElementById('p2EnrollStudent');btn.click();
        const fill=(id,v,evt='input')=>{const el=document.getElementById(id);if(!el)throw Error('Missing '+id);el.value=v;el.dispatchEvent(new Event(evt,{bubbles:true}))};
        fill('p2EnrollStudentSearch',mobile);
        const picked=document.querySelector('#p2EnrollSuggestions .p2c-enrol-pick')?.textContent||'';
        fill('p2cEnrollName',name);fill('p2cEnrollMobile',mobile);
        fill('p2EnrollDate','2026-11-18','change');
        const pay=document.getElementById('p2v514PaymentStatus');if(pay){pay.value='Unpaid';pay.dispatchEvent(new Event('change',{bubbles:true}))}
        const before=read();
        document.getElementById('p2EnrollForm').requestSubmit();
        const saved=read();
        const afterCount=saved.classEnrollments.filter(x=>x.batchId===batchId).length;
        const master=saved.students.filter(x=>x.mobile===mobile);
        const enrollment=saved.classEnrollments.find(e=>e.batchId===batchId&&master.some(s=>s.id===e.studentId));
        const message=document.getElementById('toast')?.textContent||'';
        const confirmation=!!document.getElementById('v148EnrolSuccessModal');
        document.getElementById('v148EnrolSuccessOk')?.click();
        return{index:i,mode,name,mobile,picked:picked.slice(0,80),enrolBefore:before.classEnrollments.filter(x=>x.batchId===batchId).length,
           enrolAfter:afterCount,masterCount:master.length,linked:!!enrollment,confirmation,message,
           studentId:enrollment?.studentId,masterIds:master.map(m=>m.id)};
      });
      if(!result)throw Error('Null submission result');
      const pass=result.enrolAfter===result.enrolBefore+1&&result.masterCount===1&&result.linked&&result.confirmation;
      if(!pass)failures++;
      out.push({name:mode+' '+(i+1)+'/24',status:pass?'PASS':'FAIL',result});
      console.log((pass?'PASS':'FAIL')+'_ENROL_SEQUENCE '+JSON.stringify(result));
    }
    const summary=await fn(function(){
      const mode=window.__qaTestMode;
      const state=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
      const b='qa-20-'+mode;
      return{students:state.students.length,enrolments:state.classEnrollments.filter(x=>x.batchId===b).length,
       orphanIds:state.students.filter(s=>!state.classEnrollments.some(e=>e.studentId===s.id&&e.batchId===b)).map(s=>s.id)};
    });
    out.push({name:'SUMMARY '+mode,status:failures?'FAIL':'PASS',result:{...summary,failures}});
    console.log('SUMMARY_MODE '+mode+' '+JSON.stringify({...summary,failures}));
  }

  // Reproduce screenshot: two same-name Master persons; one already enrolled.
  // UI chooses first record, operator edits mobile to the second person.
  const stale=structuredClone(base.state);
  const b={id:'qa-stale-batch',courseId:base.courseId,name:'QA SAME NAME',level:'Level 1',
     start:'2026-11-18',end:'2026-12-18',year:2026,courseFee:1500,
     scheduleType:'weekly',usualDay:3,status:'In Progress',sessionDates:['2026-11-18']};
  stale.classBatches=[b];stale.activeClassBatchId=b.id;
  stale.students=[
    {id:'qa-m-1',name:'M',mobile:'7100000101'},
    {id:'qa-m-2',name:'M',mobile:'7100000102'}];
  stale.classEnrollments=[{id:'qa-m-1-en',studentId:'qa-m-1',batchId:b.id,courseId:b.courseId,
    level:'Level 1',enrolledAt:'2026-11-18',outcome:'Enrolled',attendance:{}}];
  await reset(stale);
  const result=await fn(function(){
    const read=()=>JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    document.querySelector('aside .nav-btn[data-page="classes"]')?.click();
    document.getElementById('p2ClassBatches')?.click();
    document.querySelector('#p2ClassList .p2v510-class-year')?.click();
    document.querySelector('#p2ClassList .p2v56-chat-class[data-id="qa-stale-batch"]')?.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
    document.getElementById('p2EnrollStudent').click();
    const search=document.getElementById('p2EnrollStudentSearch');
    search.value='M';search.dispatchEvent(new Event('input',{bubbles:true}));
    const first=[...document.querySelectorAll('#p2EnrollSuggestions .p2c-enrol-pick')].find(x=>x.textContent.includes('7100000101'));
    if(!first)throw Error('Existing M suggestion 1 is missing');
    first.click();
    const name=document.getElementById('p2cEnrollName'),mobile=document.getElementById('p2cEnrollMobile');
    name.value='M';mobile.value='7100000102';mobile.dispatchEvent(new Event('input',{bubbles:true}));
    const selected=document.getElementById('p2EnrollStudentId').value;
    document.getElementById('p2EnrollForm').requestSubmit();
    const state=read();
    return{selected,typedMobile:mobile.value,initialEnrolments:1,
      finalEnrolments:state.classEnrollments.filter(x=>x.batchId==='qa-stale-batch').length,
      secondPersonEnrolled:state.classEnrollments.some(x=>x.batchId==='qa-stale-batch'&&x.studentId==='qa-m-2'),
      firstPersonUnchanged:state.students.find(x=>x.id==='qa-m-1')?.mobile==='7100000101',
      secondPersonUnchanged:state.students.find(x=>x.id==='qa-m-2')?.mobile==='7100000102',
      message:document.getElementById('toast')?.textContent||'',
      success:!!document.getElementById('v148EnrolSuccessModal')};
  });
  const doesWrongThing=!result.secondPersonEnrolled&&result.finalEnrolments===1&&result.message.includes('already enrolled');
  out.push({name:'Stale same-name selected identity causes FALSE ALREADY ENROLLED',status:doesWrongThing?'FAIL':'PASS',result});
  console.log('STALE_SELECTION_REPRO '+JSON.stringify({doesWrongThing,...result}));
 }finally{
  try{await js(original===null?'localStorage.removeItem("annualEventRegistration.v1")':'localStorage.setItem("annualEventRegistration.v1",'+JSON.stringify(original)+')');await call('Page.reload',{ignoreCache:true})}catch(e){out.push({name:'restore original',status:'FAIL',error:String(e)})}
  ws.close()
 }
 const result={status:'completed',checks:out,exceptions,failures:out.filter(x=>x.status==='FAIL')};
 fs.writeFileSync('enrol-batch-audit/report.json',JSON.stringify(result,null,2));
 fs.writeFileSync('enrol-batch-audit/summary.md','# 24 Existing + 24 New Student Class Enrolments\n\n'+out.map(x=>'- '+x.status+' '+x.name+(x.status==='FAIL'?' '+JSON.stringify(x.result||x.error).slice(0,300):'')).join('\n'));
 console.log('FINAL_AUDIT '+JSON.stringify({tests:out.length,failed:result.failures.length,exceptions:exceptions.length,failures:result.failures.slice(0,8)}));
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
