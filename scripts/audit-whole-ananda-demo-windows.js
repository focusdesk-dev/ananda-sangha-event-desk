'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),wait=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync('ananda-full-audit',{recursive:true});
async function main(){
 let target;
 for(let i=0;i<100;i++){
  try{
   const p=await(await fetch('http://127.0.0.1:9223/json/list')).json();
   target=p.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));
   if(target?.webSocketDebuggerUrl)break;
  }catch{} await wait(200);
 }
 assert(target?.webSocketDebuggerUrl,'Actual packaged Windows application not launched');
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
 const pending=new Map(),exceptions=[];let seq=0;
 ws.addEventListener('message',event=>{
  const m=JSON.parse(String(event.data));
  if(m.id&&pending.has(m.id)){const cb=pending.get(m.id);pending.delete(m.id);cb(m)}
  if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails||{};exceptions.push(JSON.stringify({text:d.text,description:d.exception?.description||d.exception?.value||'',url:d.url,lineNumber:d.lineNumber,columnNumber:d.columnNumber,frames:d.stackTrace?.callFrames?.slice(0,5)}))}
 });
 const call=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++seq,t=setTimeout(()=>{pending.delete(id);reject(Error('Timeout '+method))},30000);
  pending.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)reject(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else resolve(m.result)});
  ws.send(JSON.stringify({id,method,params}));
 });
 const js=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 const run=async f=>js('('+f.toString()+')()');
 await call('Runtime.enable');
 const KEY='annualEventRegistration.v1',previous=await js('localStorage.getItem("annualEventRegistration.v1")'),checks=[];
 async function record(name,fn,pass){
  let result=null,error=null;
  try{result=await fn();if(pass&&!pass(result))throw Error('Expected condition failed: '+JSON.stringify(result))}catch(e){error=String(e.stack||e)}
  checks.push({name,status:error?'FAIL':'PASS',result,error});
  console.log((error?'FAIL ':'PASS ')+name+' '+(error||JSON.stringify(result)).slice(0,1400));
  fs.writeFileSync('ananda-full-audit/journey.json',JSON.stringify({checks,exceptions},null,2));
  return result;
 }
 try{
  await record('Current tested desktop version',()=>run(function(){
    return{settings:window.anandaSettingsRamsVersion,excel:window.anandaClassReportsExcelStyleVersion};
  }),r=>r.settings==='14.7'&&r.excel==='14.6');

  await record('Create entirely synthetic Level 1 batch in isolated test install',()=>run(function(){
    const key='annualEventRegistration.v1',s=JSON.parse(localStorage.getItem(key));
    const c=s.courseTypes.find(x=>x.name==='Level 1');if(!c)throw Error('Level 1 master course missing');
    const tag='qa-whole-app-17';
    for(const p of ['classBatches','classEnrollments','students']){
      s[p]=(s[p]||[]).filter(x=>!String(x.id).startsWith(tag));
    }
    s.classBatches.push({id:tag+'-batch',name:'QA ENROL TEST',level:'Level 1',
      courseId:c.id,start:'2026-11-17',end:'2026-12-08',year:2026,courseFee:1500,
      status:'In Progress',scheduleType:'weekly',usualDay:2,
      sessionDates:['2026-11-17','2026-11-24','2026-12-01','2026-12-08'],
      plannedSessions:[],acharyaIds:[],volunteerIds:[]});
    s.activeClassBatchId=tag+'-batch';
    localStorage.setItem(key,JSON.stringify(s));
    return{batch:tag+'-batch',course:c.name};
  }),r=>r.batch==='qa-whole-app-17-batch');

  await call('Page.reload',{ignoreCache:true});await wait(600);
  await record('Five main navigation routes open correctly',()=>run(function(){
    const names=['classes','events','permanentRecords','phase2Reports','settings'],state={};
    names.forEach(name=>{
      document.querySelector('aside .nav-btn[data-page="'+name+'"]')?.click();
      state[name]=document.getElementById(name)?.classList.contains('active')||false;
    });
    return state;
  }),r=>Object.values(r).every(Boolean));

  await record('Classes year and existing batch open with ENROL STUDENT',()=>run(function(){
    document.querySelector('aside .nav-btn[data-page="classes"]').click();
    document.getElementById('p2ClassBatches').click();
    const year=[...document.querySelectorAll('#p2ClassList .p2v510-class-year')].find(x=>x.dataset.year==='2026');
    if(!year)throw Error('Year 2026 card missing');
    year.click();
    const card=document.querySelector('#p2ClassList .p2v56-chat-class[data-id="qa-whole-app-17-batch"]');
    if(!card)throw Error('Saved class batch absent');
    card.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
    return{page:document.querySelector('.page.active')?.id,enrolButton:document.getElementById('p2EnrollStudent')?.textContent.trim()};
  }),r=>r.page==='classWorkspace'&&r.enrolButton==='ENROL STUDENT');

  await record('First click saves student exactly once and updates roster',()=>run(function(){
    const read=()=>JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    const before=read();document.getElementById('p2EnrollStudent').click();
    const modal=document.getElementById('p2EnrollModal');if(!modal.classList.contains('open'))throw Error('Enrolment modal did not open');
    const fill=(id,value,type='input')=>{
      const e=document.getElementById(id);if(!e)throw Error('Required field missing: '+id);
      e.value=value;e.dispatchEvent(new Event(type,{bubbles:true}));
    };
    fill('p2EnrollStudentSearch','QA Student New');
    fill('p2cEnrollName','QA Student New');fill('p2cEnrollMobile','9876543120');
    const select=document.getElementById('p2cAddStudentMaster');if(select)select.checked=true;
    fill('p2EnrollDate','2026-11-17','change');
    const pay=document.getElementById('p2v514PaymentStatus');
    if(pay){pay.value='Unpaid';pay.dispatchEvent(new Event('change',{bubbles:true}))}
    const valid=document.getElementById('p2EnrollForm').checkValidity();
    document.getElementById('p2EnrollForm').requestSubmit();
    const after=read();
    const enroll=after.classEnrollments.filter(x=>x.batchId==='qa-whole-app-17-batch');
    const student=after.students.filter(x=>x.mobile==='9876543120');
    return{valid,previous:before.classEnrollments.filter(x=>x.batchId==='qa-whole-app-17-batch').length,
      current:enroll.length,students:student.length,modalOpen:modal.classList.contains('open'),
      page:document.querySelector('.page.active')?.id,
      roster:document.getElementById('p2ClassRoster')?.textContent.includes('QA Student New'),
      payment:enroll[0]?.paymentStatus,fee:enroll[0]?.feeAmount,toast:document.getElementById('toast')?.textContent};
  }),r=>r.valid&&r.current===r.previous+1&&r.students===1&&r.roster);

  await record('First-click success requires visible persistent OK acknowledgement',()=>run(function(){
    const visibleOk=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()==='ok');
    return{okCount:visibleOk.length,
      openDialog:[...document.querySelectorAll('.modal-backdrop.open')].map(x=>x.id),
      toast:document.getElementById('toast')?.textContent,
      toastOnly:document.getElementById('toast')?.classList.contains('show')};
  }),r=>r.okCount===1);

  await record('Duplicate enrolment in same batch rejected safely',()=>run(function(){
    const read=()=>JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    const before=read();document.getElementById('p2EnrollStudent').click();
    const input=document.getElementById('p2EnrollStudentSearch');
    input.value='9876543120';input.dispatchEvent(new Event('input',{bubbles:true}));
    const suggestion=[...document.querySelectorAll('#p2EnrollSuggestions .p2c-enrol-pick')].find(e=>e.textContent.includes('9876543120'));
    if(suggestion)suggestion.click();else{
      const name=document.getElementById('p2cEnrollName'),mobile=document.getElementById('p2cEnrollMobile');
      name.value='QA Student New';mobile.value='9876543120';
    }
    document.getElementById('p2EnrollForm').requestSubmit();
    const after=read();
    return{countBefore:before.classEnrollments.filter(e=>e.batchId==='qa-whole-app-17-batch').length,
      countAfter:after.classEnrollments.filter(e=>e.batchId==='qa-whole-app-17-batch').length,
      studentCount:after.students.filter(s=>s.mobile==='9876543120').length,
      message:document.getElementById('toast')?.textContent};
  }),r=>r.countAfter===r.countBefore&&r.studentCount===1);

  await record('Existing Class roster and dates still accessible',()=>run(function(){
    document.getElementById('p2EnrollModal')?.classList.remove('open');
    return{roster:document.getElementById('p2ClassRoster')?.textContent.includes('QA Student New'),
      summary:document.getElementById('p2ClassHeader')?.textContent.slice(0,180),
      session:document.getElementById('p2SessionList')?.textContent.slice(0,150)};
  }),r=>r.roster&&!!r.summary);

  await record('Class Reports Export List includes registration and payment',()=>run(function(){
    document.querySelector('aside .nav-btn[data-page="classes"]').click();
    document.getElementById('p2ClassesReports').click();
    document.getElementById('v574Export')?.click();
    return{page:document.querySelector('.page.active')?.id,
      choices:[...document.querySelectorAll('#v145ClassExportMenu [data-kind]')].map(x=>x.dataset.kind)};
  }),r=>r.choices.includes('0')&&r.choices.includes('1')&&r.choices.includes('all'));

  await record('Event and permanent master navigation available',()=>run(function(){
    document.querySelector('aside .nav-btn[data-page="events"]').click();
    const events=document.querySelector('.page.active')?.id;
    document.querySelector('aside .nav-btn[data-page="permanentRecords"]').click();
    return{eventsPage:events,mastersPage:document.querySelector('.page.active')?.id,
      search:!!document.querySelector('#permanentRecords'),
      eventTabsVersion:window.anandaDirectEventSingleDividerVersion};
  }),r=>r.eventsPage==='events'&&r.mastersPage==='permanentRecords');

  await record('Settings retain four panels and protected Reset',()=>run(function(){
    document.querySelector('aside .nav-btn[data-page="settings"]').click();
    return{sections:[...document.querySelectorAll('#v147SettingsHome>details.v147-setting')].map(x=>x.id),
      resetInDanger:!!document.querySelector('#v147DangerZone #v123ResetSettings'),
      resetForm:!!document.getElementById('v87MasterResetForm')};
  }),r=>r.sections.length===4&&r.resetInDanger&&r.resetForm);

  await record('Record persistence across app page reload',async()=>{
    await call('Page.reload',{ignoreCache:true});await wait(550);
    return run(function(){
      const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
      return{enrolled:s.classEnrollments.filter(x=>x.batchId==='qa-whole-app-17-batch').length,
        student:s.students.filter(x=>x.mobile==='9876543120').length,
        batch:s.classBatches.some(x=>x.id==='qa-whole-app-17-batch')};
    });
  },r=>r.enrolled===1&&r.student===1&&r.batch);

  await record('Unexpected JavaScript exceptions',async()=>({count:exceptions.length,sample:exceptions.slice(0,12)}),r=>r.count===0);
 }finally{
  try{
   await js(previous===null?'localStorage.removeItem("annualEventRegistration.v1")':
       'localStorage.setItem("annualEventRegistration.v1",'+JSON.stringify(previous)+')');
   await call('Page.reload',{ignoreCache:true});
  }catch(e){checks.push({name:'Restore saved data after demo',status:'FAIL',error:String(e)})}
  ws.close();
 }
 const report={checkedAt:new Date().toISOString(),installedVersion:'14.7',checks,exceptions,
   passed:checks.filter(x=>x.status==='PASS').length,failed:checks.filter(x=>x.status==='FAIL').length};
 fs.writeFileSync('ananda-full-audit/journey.json',JSON.stringify(report,null,2));
 fs.writeFileSync('ananda-full-audit/journey.md',
  '# Ananda Windows Desktop Demo Audit\n\nAudited the installed 14.7 app with synthetic records, restoring its original local storage.\n\n'+
  checks.map(cj=>'- **'+cj.status+'** '+cj.name+(cj.error?' — '+cj.error.split('\n')[0]:'')).join('\n')+
  '\n\nTotal '+report.passed+' passed / '+report.failed+' failed.\n');
 console.log('AUDIT_RESULT '+JSON.stringify({passed:report.passed,failed:report.failed,
  failures:checks.filter(x=>x.status==='FAIL').map(x=>({name:x.name,error:x.error?.slice(0,170)})),exceptions}));
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
