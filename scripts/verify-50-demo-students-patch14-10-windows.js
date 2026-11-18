'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const out='demo50-qa';fs.mkdirSync(out,{recursive:true});
async function main(){
 let page;
 for(let i=0;i<100;i++){try{const p=await(await fetch('http://127.0.0.1:9223/json/list')).json();page=p.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));if(page?.webSocketDebuggerUrl)break}catch{}await pause(180)}
 assert(page?.webSocketDebuggerUrl,'Actual packaged Windows app is not available');
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((ok,err)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',err,{once:true})});
 let seq=0;const cb=new Map(),exceptions=[],results=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.id&&cb.has(m.id)){const f=cb.get(m.id);cb.delete(m.id);f(m)}
   if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text||'Uncaught exception')});
 const send=(method,params={})=>new Promise((resolve,reject)=>{
   const id=++seq,t=setTimeout(()=>{cb.delete(id);reject(Error('DevTools timeout '+method))},28000);
   cb.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)reject(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else resolve(m.result)});
   ws.send(JSON.stringify({id,method,params}));
 });
 const js=async e=>(await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result.value;
 const run=async f=>js('('+f.toString()+')()');
 await send('Runtime.enable');
 const storageKey='annualEventRegistration.v1';
 const old=await js('localStorage.getItem("annualEventRegistration.v1")');
 const verify=(name,ob,pass)=>{
   const ok=pass(ob);results.push({name,status:ok?'PASS':'FAIL',result:ob});
   console.log((ok?'PASS ':'FAIL ')+name+' '+JSON.stringify(ob).slice(0,1300));
   if(!ok)throw Error('FAILED '+name+': '+JSON.stringify(ob).slice(0,1200));
 };
 try{
  const snapshot=await run(function(){
    const raw=localStorage.getItem('annualEventRegistration.v1');
    const s=JSON.parse(raw||'{}');
    const course=s.courseTypes.find(c=>c.name==='Level 1');
    if(!course)throw Error('Level 1 course not present');
    const existing={id:'qa-genuine-student',name:'Real Student Not For Test',mobile:'9123409807',notes:'Original record untouched',createdAt:'2026-01-01T00:00:00Z'};
    const oldBatch={id:'qa-genuine-level1',name:'EXISTING LEVEL 1 — QA',courseId:course.id,level:'Level 1',
      start:'2026-11-15',end:'2026-12-15',year:2026,status:'In Progress',courseFee:1500,
      scheduleType:'weekly',usualDay:0,sessionDates:['2026-11-15','2026-11-22']};
    const other={...oldBatch,id:'qa-other-level2',level:'Level 2',name:'OTHER LEVEL 2',courseId:(s.courseTypes.find(c=>c.name==='Level 2')||course).id};
    const noFee={...oldBatch,id:'qa-nofee-level1',name:'NO FEE',courseFee:''};
    s.students=[existing];s.classEnrollments=[{id:'qa-genuine-enrol',studentId:existing.id,batchId:oldBatch.id,
      courseId:course.id,level:'Level 1',outcome:'Enrolled',enrolledAt:'2026-11-15',paymentStatus:'Paid',paymentDate:'2026-11-15',paymentMode:'Cash',feeAmount:'1500',attendance:{}}];
    s.classBatches=[oldBatch,other,noFee];s.activeClassBatchId=oldBatch.id;
    localStorage.setItem('annualEventRegistration.v1',JSON.stringify(s));
    return{course:course.id,originalMaster:existing,originalEnrolment:s.classEnrollments[0],
       otherBatchCount:s.classBatches.length};
  });
  await send('Page.reload',{ignoreCache:true});await pause(600);
  const before=await run(function(){
    document.querySelector('aside .nav-btn[data-page="classes"]')?.click();
    document.getElementById('p2ClassBatches')?.click();
    const year=[...document.querySelectorAll('#p2ClassList .p2v510-class-year')].find(x=>x.dataset.year==='2026');
    if(!year)throw Error('Class batch 2026 selector missing');
    year.click();
    const b=document.querySelector('#p2ClassList .p2v56-chat-class[data-id="qa-genuine-level1"]');
    if(!b)throw Error('Existing test fixture Level1 batch not visible');
    b.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
    const btn=document.getElementById('v150DemoButton');
    return{version:window.anandaLevel1DemoStudentsVersion,page:document.querySelector('.page.active')?.id,
      button:btn?.textContent.trim(),students:JSON.parse(localStorage.getItem('annualEventRegistration.v1')).students.length,
      batchVisible:document.getElementById('p2ClassHeader')?.textContent.includes('EXISTING LEVEL 1')};
  });
  verify('Test feature appears ONLY in opened existing Level1 batch',before,
   r=>r.version==='14.10'&&r.page==='classWorkspace'&&r.button==='ADD 50 TEST STUDENTS'&&r.batchVisible&&r.students===1);
  const seeded=await run(function(){
    const add=document.getElementById('v150DemoButton'),fn=add.onclick;
    add.click();
    const before=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    fn(); // Second call must be idempotent: no duplicate students.
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    const marker='ANANDA_DEMO_50_STUDENTS_V1';
    const tests=s.students.filter(x=>x.__anandaDemoSet===marker);
    const enrolled=s.classEnrollments.filter(x=>x.__anandaDemoSet===marker);
    const names=tests.map(x=>x.name),phones=tests.map(x=>x.mobile);
    const payments=enrolled.reduce((a,x)=>(a[x.paymentStatus]=(a[x.paymentStatus]||0)+1,a),{});
    const real=s.students.find(x=>x.id==='qa-genuine-student');
    const realEn=s.classEnrollments.find(x=>x.id==='qa-genuine-enrol');
    return{students:tests.length,enrolments:enrolled.length,batchId:enrolled[0]?.batchId,
      paid:payments.Paid||0,unpaid:payments.Unpaid||0,
      allLinked:enrolled.every(e=>tests.some(t=>t.id===e.studentId)),
      uniqueMobiles:new Set(phones).size,identicalNamePairs:50-new Set(names).size,
      allLabelled:tests.every(t=>t.name.startsWith('TEST ')&&t.notes.includes('TEST DATA')),
      paidHaveMode:enrolled.filter(e=>e.paymentStatus==='Paid').every(e=>!!e.paymentMode&&!!e.paymentDate),
      allFeesValid:enrolled.every(e=>e.feeAmount==='1500'),
      realUnchanged:real?.name==='Real Student Not For Test'&&real?.mobile==='9123409807'&&realEn?.paymentMode==='Cash',
      otherBatches:s.classEnrollments.filter(e=>e.batchId==='qa-other-level2'||e.batchId==='qa-nofee-level1').length,
      button:document.getElementById('v150DemoButton')?.textContent.trim()};
  });
  verify('50 synthetic students, 20 Paid + 30 Unpaid, 16 duplicate name pairs, no genuine records touched',seeded,
   x=>x.students===50&&x.enrolments===50&&x.batchId==='qa-genuine-level1'&&x.paid===20&&x.unpaid===30&&
      x.uniqueMobiles===50&&x.identicalNamePairs===16&&x.allLinked&&x.allLabelled&&x.paidHaveMode&&
      x.allFeesValid&&x.realUnchanged&&x.otherBatches===0&&x.button==='REMOVE TEST STUDENTS');
  await send('Page.reload',{ignoreCache:true});await pause(500);
  const persisted=await run(function(){
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    return{version:window.anandaLevel1DemoStudentsVersion,testMasters:s.students.filter(x=>x.__anandaDemoSet).length,
      testEnrolments:s.classEnrollments.filter(x=>x.__anandaDemoSet).length,realEnrolmentExists:s.classEnrollments.some(x=>x.id==='qa-genuine-enrol')};
  });
  verify('50 test enrolments survive app restart and original enrolment stays',persisted,
   x=>x.version==='14.10'&&x.testMasters===50&&x.testEnrolments===50&&x.realEnrolmentExists);
  const removed=await run(function(){
    document.querySelector('aside .nav-btn[data-page="classes"]')?.click();
    document.getElementById('p2ClassBatches')?.click();
    const year=[...document.querySelectorAll('#p2ClassList .p2v510-class-year')].find(x=>x.dataset.year==='2026');
    if(!year)throw Error('Expected class year 2026 selector missing');
    year.click();
    const activeId=JSON.parse(localStorage.getItem('annualEventRegistration.v1')).activeClassBatchId;
    const card=document.querySelector('#p2ClassList .p2v56-chat-class[data-id="'+activeId+'"]');
    if(!card)throw Error('Selected batch '+activeId+' missing');
    card.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
    const prior=window.confirm;window.confirm=()=>true;
    try{document.getElementById('v150DemoButton').click()}finally{window.confirm=prior}
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    return{students:s.students.length,enrolments:s.classEnrollments.length,
      testPeople:s.students.filter(x=>x.__anandaDemoSet).length,
      testEnrolments:s.classEnrollments.filter(x=>x.__anandaDemoSet).length,
      originalMobile:s.students.find(x=>x.id==='qa-genuine-student')?.mobile,
      originalPaid:s.classEnrollments.find(x=>x.id==='qa-genuine-enrol')?.paymentStatus,
      button:document.getElementById('v150DemoButton')?.textContent.trim()};
  });
  verify('REMOVE deletes only 50 test linked records, retains genuine student & payment',removed,
   x=>x.students===1&&x.enrolments===1&&x.testPeople===0&&x.testEnrolments===0&&
      x.originalMobile==='9123409807'&&x.originalPaid==='Paid'&&x.button==='ADD 50 TEST STUDENTS');
  const control=await run(function(){
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    s.activeClassBatchId='qa-other-level2';localStorage.setItem('annualEventRegistration.v1',JSON.stringify(s));
    return{notChanged:s.students.length};
  });
  await send('Page.reload',{ignoreCache:true});await pause(440);
  const wrongBatch=await run(function(){
    document.querySelector('aside .nav-btn[data-page="classes"]')?.click();
    document.getElementById('p2ClassBatches')?.click();
    const year=[...document.querySelectorAll('#p2ClassList .p2v510-class-year')].find(x=>x.dataset.year==='2026');
    if(!year)throw Error('Expected class year 2026 selector missing');
    year.click();
    const activeId=JSON.parse(localStorage.getItem('annualEventRegistration.v1')).activeClassBatchId;
    const card=document.querySelector('#p2ClassList .p2v56-chat-class[data-id="'+activeId+'"]');
    if(!card)throw Error('Selected batch '+activeId+' missing');
    card.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
    return{batchIsLevel2:document.getElementById('p2ClassHeader')?.textContent.includes('Level 2'),
      testButton:!!document.getElementById('v150DemoButton'),
      demoEnrolments:JSON.parse(localStorage.getItem('annualEventRegistration.v1')).classEnrollments.filter(x=>x.__anandaDemoSet).length};
  });
  verify('Level2 batch cannot receive the Level1 test cohort',wrongBatch,
   x=>x.batchIsLevel2&&!x.testButton&&x.demoEnrolments===0);
  await run(function(){
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    s.activeClassBatchId='qa-nofee-level1';localStorage.setItem('annualEventRegistration.v1',JSON.stringify(s));
  });
  await send('Page.reload',{ignoreCache:true});await pause(440);
  const noFee=await run(function(){
    document.querySelector('aside .nav-btn[data-page="classes"]')?.click();
    document.getElementById('p2ClassBatches')?.click();
    const year=[...document.querySelectorAll('#p2ClassList .p2v510-class-year')].find(x=>x.dataset.year==='2026');
    if(!year)throw Error('Expected class year 2026 selector missing');
    year.click();
    const activeId=JSON.parse(localStorage.getItem('annualEventRegistration.v1')).activeClassBatchId;
    const card=document.querySelector('#p2ClassList .p2v56-chat-class[data-id="'+activeId+'"]');
    if(!card)throw Error('Selected batch '+activeId+' missing');
    card.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
    const btn=document.getElementById('v150DemoButton');
    btn?.click();
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    return{button:btn?.textContent.trim(),testMasters:s.students.filter(x=>x.__anandaDemoSet).length,
      testEnrolments:s.classEnrollments.filter(x=>x.__anandaDemoSet).length,
      message:document.getElementById('toast')?.textContent};
  });
  verify('Unset fee blocks misleading paid samples without partial writes',noFee,
   x=>x.button==='ADD 50 TEST STUDENTS'&&x.testMasters===0&&x.testEnrolments===0&&/positive course fee/i.test(x.message));
  verify('No runtime JavaScript exceptions', {count:exceptions.length,exceptions:exceptions.slice(0,3)},x=>x.count===0);
 }finally{
  try{
    await js(old===null?'localStorage.removeItem("annualEventRegistration.v1")':
      'localStorage.setItem("annualEventRegistration.v1",'+JSON.stringify(old)+')');
    await send('Page.reload',{ignoreCache:true});
  }catch(e){results.push({name:'Restore prior data',status:'FAIL',error:String(e)})}
  ws.close();
 }
 fs.writeFileSync(out+'/results.json',JSON.stringify({checks:results,exceptions},null,2));
 fs.writeFileSync(out+'/summary.md','# Ananda 50 Students Demo Test — Windows\n\n'+results.map(c=>'- **'+c.status+'** '+c.name).join('\n')+'\n');
 console.log('DEMO_50_TESTS_PASSED '+results.length);
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
