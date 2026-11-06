'use strict';
const assert=require('node:assert/strict');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function findTarget(){
 for(let i=0;i<35;i++){
  try{const r=await fetch('http://127.0.0.1:9223/json/list');const pages=await r.json();const p=pages.find(x=>x.type==='page'&&/index\.html|ananda/i.test((x.url||'')+' '+(x.title||'')));if(p&&p.webSocketDebuggerUrl)return p}
  catch{}
  await wait(1000);
 }
 throw Error('Ananda window not exposed by Chrome DevTools');
}
function journey(){
 const yes=(x,msg)=>{if(!x)throw Error(msg)};
 const el=id=>{const x=document.getElementById(id);yes(x,'Missing element '+id);return x};
 const set=(id,v,ev='input')=>{const x=el(id);x.value=v;x.dispatchEvent(new Event(ev,{bubbles:true}));};
 const click=id=>el(id).click();
 const snap=()=>JSON.parse(localStorage.getItem('annualEventRegistration.v1')||'{}');
 const classes=()=>{const b=document.querySelector('.nav-btn[data-page="classes"]');yes(b,'Missing Classes nav');b.click()};
 classes();click('p2v548ManageCourseNames');
 // A fresh installation contains separate course definitions, but not Kriya batches.
 const kriya=snap().courseTypes.find(c=>c.id==='course-kriya');
 yes(kriya&&kriya.name==='Kriya','Separate empty Kriya course definition missing');
 yes(snap().classBatches.every(b=>b.courseId!=='course-kriya'),'Kriya must not acquire an invented batch');
 yes(document.querySelector('#courseMaster.page.active'),'Course Master did not open');
 let course=snap().courseTypes?.find(c=>c.name==='Kriya 2');
 const existing=[...document.querySelectorAll('#p2CourseList .p2-course-row')].find(x=>x.querySelector('h4')?.textContent.trim()==='Kriya 2');
 if(!course&&existing)course={id:existing.querySelector('.p2-edit-course').dataset.id,name:'Kriya 2'};
 if(!course){click('p2AddCourse');set('p2CourseName','Kriya 2');set('p2CourseSchedule','custom','change');el('p2CourseForm').requestSubmit();course=snap().courseTypes?.find(c=>c.name==='Kriya 2')}
 yes(course,'Kriya 2 missing from list and saved state: '+el('toast').textContent);
 classes();click('p2AddBatch');
 set('p2BatchCourse',course.id,'change');set('p2BatchName','Kriya 2 Batch 1');set('p2BatchStart','2026-11-01','change');
 set('p2BatchScheduleType','custom','change');set('p2v537ClassCount','3');set('p2BatchEnd','');
 el('p2BatchForm').requestSubmit();
 let batch=snap().classBatches.find(b=>b.name==='Kriya 2 Batch 1');
 yes(batch&&batch.plannedSessions.length===3,'Three-class batch not created');
 function assign(slot,date){
  const buttons=[...document.querySelectorAll('#p2v5ScheduleCard .p2v547-session-date')];
  yes(buttons.length>=slot,'Numbered class links missing; count='+buttons.length+'; classWorkspace='+document.querySelector('#classWorkspace')?.className+'; summary='+document.querySelector('#p2v537PlanSummary')?.outerHTML?.slice(0,400)+'; card='+el('p2v5ScheduleCard').outerHTML.slice(0,700)+'; end='+JSON.stringify(snap().classBatches.find(x=>x.id===batch.id)));
  buttons[slot-1].click();
  yes(el('p2v5Fix2DateModal').classList.contains('open'),'Date modal did not open');
  yes(el('p2v5Fix2DateTitle').textContent.includes('Class '+slot),'Incorrect date dialog');
  set('p2v5Fix2DateInput',date,'change');el('p2v5Fix2DateForm').requestSubmit();
  const b=snap().classBatches.find(x=>x.id===batch.id);
  yes(b.plannedSessions[slot-1].date===date,'Class '+slot+' date not persisted');
  yes(!el('p2v5Fix2DateModal').classList.contains('open'),'Date modal not closed');
  return b;
 }
 let b=assign(1,'2026-11-04');yes(!b.end,'End should be blank while slots undated');
 b=assign(2,'2026-11-18');yes(!b.end,'End should be blank with third slot pending');
 click('p2v519Edit');yes(el('p2v537ClassCount').value==='3','Wrong count in Edit Batch');
 set('p2v537ClassCount','2');const originalConfirm=window.confirm;window.confirm=()=>true;
 try{el('p2BatchForm').requestSubmit()}finally{window.confirm=originalConfirm}
 b=snap().classBatches.find(x=>x.id===batch.id);
 yes(b.plannedSessions.length===2,'Reduction to two failed');
 yes(b.end==='2026-11-18','End not calculated after reduction; value: '+b.end);
 yes(b.endFromCustomSessions===true,'End not tagged automatic');
 yes(b.sessionDates.join(',')==='2026-11-04,2026-11-18','Saved dates were modified');
 click('p2v519Edit');yes(el('p2BatchEnd').value==='2026-11-18','End missing after reopening');
 set('p2BatchName','Kriya 2 Batch Renamed');el('p2BatchForm').requestSubmit();
 b=snap().classBatches.find(x=>x.id===batch.id);
 yes(b.name==='Kriya 2 Batch Renamed','Batch name did not save');
 classes();click('p2v548ManageCourseNames');
 const edit=[...document.querySelectorAll('.p2-edit-course')].find(x=>x.dataset.id===course.id);
 yes(edit,'Course edit control missing');edit.click();
 set('p2CourseName','Kriya 2 Revised');el('p2CourseForm').requestSubmit();
 const final=snap();
 yes(final.courseTypes.find(x=>x.id===course.id)?.name==='Kriya 2 Revised','Course rename not saved');
 yes(final.classBatches.find(x=>x.id===batch.id)?.courseId===course.id,'Lost course linkage');
 yes(final.classBatches.find(x=>x.id===batch.id)?.end==='2026-11-18','Course rename damaged End Date');
 yes(final.classBatches.find(x=>x.id===batch.id)?.sessionDates.join(',')==='2026-11-04,2026-11-18','Course rename modified original class dates');
 classes();
 // The current Classes UI first displays years. Open the 2026 year before
 // checking the renamed batch, rather than searching a legacy .p2-record.
 const year=[...document.querySelectorAll('#p2ClassList .p2v510-class-year')].find(x=>x.dataset.year==='2026');
 if(year)year.click();
 const record=[...document.querySelectorAll('#p2ClassList .p2v56-chat-class')].find(x=>x.textContent.includes('Kriya 2 Batch Renamed'));
 yes(record&&record.textContent.includes('Kriya 2 Revised'),'Renamed course not displayed in opened Classes year; text='+el('p2ClassList').textContent.slice(0,1000));
 click('p2AddBatch');set('p2BatchCourse',course.id,'change');
 set('p2BatchName','Kriya 2 Direct Two');set('p2BatchStart','2026-11-01','change');
 set('p2BatchScheduleType','custom','change');set('p2v537ClassCount','2');set('p2BatchEnd','');
 el('p2BatchForm').requestSubmit();batch=snap().classBatches.find(x=>x.name==='Kriya 2 Direct Two');
 yes(batch&&batch.plannedSessions.length===2,'Direct two-class batch not saved');
 let direct=assign(1,'2026-11-05');yes(!direct.end,'Direct End set too early');
 direct=assign(2,'2026-11-19');yes(direct.end==='2026-11-19','Direct two-class End not saved');
 click('p2v519Edit');yes(el('p2BatchEnd').value==='2026-11-19','Direct End missing after reopening');

 // Correction 17: date inputs are exclusively under Class Schedule.
 yes(!document.getElementById('p2v549ManualDatesField'),'No individual dates in Edit Batch');
 el('p2BatchModal').classList.remove('open');classes();click('p2AddBatch');
 set('p2BatchCourse','__custom__','change');set('p2v55CustomCourseName','Special Meditation');
 set('p2BatchName','Custom Two Dates');set('p2BatchStart','2026-11-01','change');
 set('p2BatchScheduleType','custom','change');set('p2v537ClassCount','2');
 el('p2BatchForm').requestSubmit();batch=snap().classBatches.find(x=>x.name==='Custom Two Dates');
 yes(batch?.plannedSessions.length===2,'Custom batch not created');
 assign(1,'2026-11-06');assign(2,'2026-11-27');
 // CORRECTION 19: whole-batch summary has no visible monthly navigation,
 // threshold banner or duplicated attendance entry.
 yes(el('p2v519Summary').textContent.includes('Students Enrolled'),'Whole-batch KPIs missing');
 yes(el('p2v519Summary').textContent.includes('Classes Conducted'),'Conducted/total KPI missing');
 yes(!el('p2ClassHeader').textContent.includes('Minimum Attendance'),'Class Batch header displays minimum attendance');
 yes(getComputedStyle(el('p2v5ScheduleCard')).display==='none','Class Dates panel must not appear on the summary');
 click('p2v519Schedule');
 yes(getComputedStyle(el('p2v5ScheduleCard')).display!=='none','Class Schedule must remain accessible');
 click('p2v519Schedule');
 yes(getComputedStyle(el('p2v5ScheduleCard')).display==='none','Returning to summary must hide monthly schedule');
 const summaryState=snap();
 yes(summaryState.classBatches.some(b=>b.name==='Kriya 2 Batch Renamed'),
     'Summary navigation altered unrelated batches');
 const custom=snap().classBatches.find(b=>b.name==='Custom Two Dates');
 yes(custom?.end==='2026-11-27'&&custom.sessionDates.length===2,'New custom course dates not saved');
 classes();click('p2v548ManageCourseNames');
 const customEdit=[...document.querySelectorAll('.p2-edit-course')].find(x=>x.dataset.id===custom.courseId);
 yes(customEdit,'Custom course editor missing');customEdit.click();
 yes(el('p2CourseModal').classList.contains('open'),'Course editor must remain accessible through Classes');
 el('p2CourseModal').classList.remove('open');
 return {pass:true,checks:['create Kriya 2','save class dates','reduce 3 to 2','reopen End Date','rename batch and course','retain saved class dates','direct two-class End Date','Kriya separate course with no batches','direct Kriya 2 class dates','weekly manual dates','custom new course dates','Edit Course Name within batch']};
}
async function run(){
 const target=await findTarget(),ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
 let n=0;const callbacks=new Map();
 ws.addEventListener('message',event=>{const message=JSON.parse(String(event.data));const callback=callbacks.get(message.id);if(callback){callbacks.delete(message.id);callback(message)}});
 const evaluate=expression=>new Promise((resolve,reject)=>{
  const id=++n;const timer=setTimeout(()=>{callbacks.delete(id);reject(Error('CDP timeout'))},25000);
  callbacks.set(id,m=>{clearTimeout(timer);if(m.error||m.result?.exceptionDetails){reject(Error(JSON.stringify(m.error||m.result.exceptionDetails)))}else resolve(m.result?.result?.value)});
  ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));
 });
 try{
  // Chromium exposes a DevTools target before the application's startup
  // script necessarily finishes. Wait for real persisted NGO state.
  let ready=false;
  for(let attempt=0;attempt<45;attempt++){
    try{
      ready=Boolean(await evaluate("(()=>{try{return document.readyState==='complete'&&Array.isArray(JSON.parse(localStorage.getItem('annualEventRegistration.v1')||'{}').courseTypes)}catch{return false}})()"));
      if(ready)break;
    }catch{}
    await wait(350);
  }
  assert.ok(ready,'Application did not finish initialising its persistent course state');
  const result=await evaluate('('+journey.toString()+')()');
  assert.equal(result?.pass,true,'Desktop journey returned unsuccessful result');
  console.log('PASS desktop UI: '+result.checks.join(' | '));
 }finally{ws.close()}
}
run().catch(error=>{console.error('FAIL desktop Kriya journey',error);process.exitCode=1});
