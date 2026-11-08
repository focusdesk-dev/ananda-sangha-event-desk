'use strict';
(async function verifyV574Desktop(){
  'use strict';
  const assert=require('node:assert/strict');
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);
  let page;
  for(let n=0;n<40;n++){
    try{const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();page=pages.find(p=>p.type==='page'&&/index.html|Ananda/i.test((p.title||'')+' '+(p.url||'')));if(page?.webSocketDebuggerUrl)break}catch{}
    await sleep(350);
  }
  assert.ok(page?.webSocketDebuggerUrl,'Packaged Windows app is not available');
  const ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
  let seq=0;const handlers=new Map();
  ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data));const fn=handlers.get(m.id);if(fn){handlers.delete(m.id);fn(m)}});
  const call=(method,params={})=>new Promise((ok,bad)=>{const id=++seq,t=setTimeout(()=>{handlers.delete(id);bad(Error('CDP timeout '+method))},25000);handlers.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)bad(Error(JSON.stringify(m.error||m.result?.exceptionDetails)));else ok(m.result)});ws.send(JSON.stringify({id,method,params}))});
  const run=async code=>(await call('Runtime.evaluate',{expression:code,awaitPromise:true,returnByValue:true})).result.value;
  const KEY='annualEventRegistration.v1',seedTag='beta574-qa',saved=await run('localStorage.getItem('+JSON.stringify(KEY)+')');
  try{
    const seeded=await run(`(()=>{const key='annualEventRegistration.v1',s=JSON.parse(localStorage.getItem(key)||'{}');
      const c1=(s.courseTypes||[]).find(c=>c.name==='Level 1'),c2=(s.courseTypes||[]).find(c=>c.name==='Level 2');
      if(!c1||!c2)return {error:'Progression course records missing'};
      const prefix='beta574-qa';s.students=(s.students||[]).filter(x=>!String(x.id).startsWith(prefix));
      s.classBatches=(s.classBatches||[]).filter(x=>!String(x.id).startsWith(prefix));
      s.classEnrollments=(s.classEnrollments||[]).filter(x=>!String(x.id).startsWith(prefix));
      const b1={id:prefix+'-b1',courseId:c1.id,name:'QA Batch L1',level:'Level 1',start:'2026-01-01',end:'2026-01-08',status:'Completed',endedAt:'2026-01-08',sessionDates:['2026-01-01','2026-01-08']};
      const b2={id:prefix+'-b2',courseId:c2.id,name:'QA Batch L2',level:'Level 2',start:'2026-02-01',end:'2026-02-08',status:'Completed',endedAt:'2026-02-08',sessionDates:['2026-02-01','2026-02-08'],courseFee:500};
      s.classBatches.push(b1,b2);
      const people=[{id:prefix+'-a',name:'Alpha Eligible 574',mobile:'0123456789'},{id:prefix+'-b',name:'Beta Paused 574',mobile:'9988776655'},{id:prefix+'-c',name:'Charlie Completed 574',mobile:'9988776611'}];
      s.students.push(...people);
      s.classEnrollments.push(
      {id:prefix+'-e1',studentId:people[0].id,level:'Level 1',batchId:b1.id,outcome:'Completed',enrolledAt:'2026-01-01',attendance:{'2026-01-01':true,'2026-01-08':true}},
      {id:prefix+'-e2',studentId:people[1].id,level:'Level 2',batchId:b2.id,outcome:'Withdrawn',enrolledAt:'2026-02-01',attendance:{'2026-02-01':true,'2026-02-08':false}},
      {id:prefix+'-e3',studentId:people[2].id,level:'Level 2',batchId:b2.id,outcome:'Completed',paymentStatus:'Paid',enrolledAt:'2026-02-01',attendance:{'2026-02-01':true,'2026-02-08':true}});
      localStorage.setItem(key,JSON.stringify(s));return {course1:c1.id,course2:c2.id}})()`);
    assert.ok(seeded?.course2,JSON.stringify(seeded));
    await call('Page.reload',{ignoreCache:true});await sleep(1200);
    const opened=await run(`(()=>{const bar=document.querySelector('aside'),link=document.querySelector('.nav-btn[data-page="classes"]');if(!bar||!link)return {error:'Sidebar missing'};const before={background:getComputedStyle(bar).backgroundImage, width:Math.round(bar.getBoundingClientRect().width),labels:[...bar.querySelectorAll('nav button')].map(x=>x.textContent.trim())};link.click();const reports=document.getElementById('p2ClassesReports');if(!reports)return {error:'Reports tile missing',before};reports.click();const after={background:getComputedStyle(bar).backgroundImage,width:Math.round(bar.getBoundingClientRect().width),labels:[...bar.querySelectorAll('nav button')].map(x=>x.textContent.trim())};return {before,after,reportActive:document.getElementById('classReportsHub')?.classList.contains('active'),course:document.getElementById('v574Course')?.value,boxes:document.querySelectorAll('#classReportsHub .v574-panel').length,oldChoices:document.querySelectorAll('#classReportsHub .p2v54-report-choice').length,back:document.querySelectorAll('#classReportsHub .p2v59-class-report-title').length}})()`);
    assert.ok(!opened.error,JSON.stringify(opened));assert.equal(opened.reportActive,true,'Class Reports did not open');
    assert.deepEqual(opened.after,opened.before,'Frozen left navigation changed after opening Class Reports');
    assert.equal(opened.boxes,1);assert.equal(opened.oldChoices,0);assert.equal(opened.course,seeded.course1);
    const result=await run(`(()=>{const set=(id,val)=>{const el=document.getElementById(id);el.value=val;el.dispatchEvent(new Event('change',{bubbles:true}))};const names=()=>[...document.querySelectorAll('#v574Tbody .v574-name')].map(x=>x.textContent.trim());set('v574Course',${JSON.stringify(seeded.course2)});set('v574Group','Eligible');const eligible=names();set('v574Group','Incomplete / Withdrawn');const incomplete=names();set('v574Group','All');set('v574Batch','beta574-qa-b2');const all=names(),session=!!document.getElementById('v574Session');set('v574Year','2026');const annual=document.getElementById('v574Annual')?.textContent||'';return {eligible,incomplete,all,session,annual,heading:document.getElementById('pageTitle').textContent,oldButtons:document.querySelectorAll('#classReportsHub .p2v54-report-choice').length}})()`);
    assert.ok(result.eligible.includes('Alpha Eligible 574'),JSON.stringify(result));
    assert.ok(!result.eligible.includes('Beta Paused 574'));
    assert.deepEqual(result.incomplete,['Beta Paused 574']);
    assert.ok(result.all.includes('Beta Paused 574')&&result.all.includes('Charlie Completed 574'),JSON.stringify(result));
    assert.ok(result.session,'Per-session attendance filter missing');
    assert.ok(result.annual.includes('2026 annual summary'),'Annual summary missing');
    assert.equal(result.heading,'CLASS REPORTS');
    const testDetail=await run(`(()=>{document.querySelector('#v574Tbody .v574-name')?.click();return {name:document.getElementById('v574Detail')?.textContent||'',oneBack:document.getElementById('backButton')?.offsetWidth>0}})()`);
    assert.ok(testDetail.name.includes('Course history')&&testDetail.name.includes('Attendance sessions'),JSON.stringify(testDetail));
    assert.ok(testDetail.oneBack,'Global Back button absent');
    console.log('PASS beta 5.74 Windows unified Class Reports, four filters, Level 2 eligibility, incompletes, annual summary, attendance details, frozen sidebar',JSON.stringify({opened,result}));
  }finally{
    try{await run('(()=>{const key='+JSON.stringify(KEY)+',previous='+JSON.stringify(saved)+';if(previous===null)localStorage.removeItem(key);else localStorage.setItem(key,previous);return true})()')}catch(e){console.error('Restore fixture failed',e.message)}
    ws.close();
  }
})().catch(e=>{console.error('FAIL unified reports',e.stack||e);process.exitCode=1});
