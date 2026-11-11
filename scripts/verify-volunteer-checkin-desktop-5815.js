'use strict';
const assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);let page;
 for(let i=0;i<55;i++){
  try{const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
   page=pages.find(p=>p.type==='page'&&/Ananda|index.html/i.test((p.title||'')+' '+(p.url||'')));
   if(page?.webSocketDebuggerUrl)break;
  }catch{}
  await sleep(350);
 }
 assert.ok(page?.webSocketDebuggerUrl,'Packaged Ananda desktop app unavailable for volunteer check-in test');
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
 const pending=new Map();let serial=0;
 ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data)),fn=pending.get(m.id);if(fn){pending.delete(m.id);fn(m)}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++serial,t=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method))},30000);
  pending.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)reject(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else resolve(m.result)});
  ws.send(JSON.stringify({id,method,params}));
 });
 const js=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 const run=fn=>js('('+fn.toString()+')()');
 await call('Runtime.enable');
 const storageKey='annualEventRegistration.v1',prior=await js('localStorage.getItem('+JSON.stringify(storageKey)+')');
 try{
  await run(function(){
   const id='qa5815',date='2026-12-15',ev=id+'-event',day=ev+'|'+date,key='annualEventRegistration.v1';
   const state=JSON.parse(localStorage.getItem(key)||'{}');
   state.events=(state.events||[]).filter(x=>!String(x.id).startsWith(id));
   state.volunteers=(state.volunteers||[]).filter(x=>!String(x.id).startsWith(id));
   state.kriyabans=(state.kriyabans||[]).filter(x=>!String(x.id).startsWith(id));
   state.volunteerRegistrations=(state.volunteerRegistrations||[]).filter(x=>!String(x.id).startsWith(id));
   state.events.push({id:ev,name:'5.81.5 Volunteer Arrival QA',dates:[date],start:date,end:date,venue:'Test Centre'});
   state.volunteers.push({id:id+'-v1',firstName:'KRIYA',lastName:'VOLUNTEER QA',mobile:'9810001111'},
                         {id:id+'-v2',firstName:'REGULAR',lastName:'VOLUNTEER QA',mobile:'9810002222'});
   state.kriyabans.push({id:id+'-kriya',name:'KRIYA VOLUNTEER QA',mobile:'9810001111',kriyaDate:'2025-06-01'});
   state.volunteerRosters={...(state.volunteerRosters||{}),[day]:[id+'-v1',id+'-v2']};
   state.daily={...(state.daily||{}),[day]:[]};
   state.volunteerRegistrations.push({id:id+'-r1',eventId:ev,volunteerId:id+'-v1',checkins:[],source:'counter'},
    {id:id+'-r2',eventId:ev,volunteerId:id+'-v2',checkins:[],source:'counter'});
   state.activeEventId=ev;
   localStorage.setItem(key,JSON.stringify(state));
  });
  await call('Page.reload',{ignoreCache:true});await sleep(1200);
  const opened=await run(function(){
   document.querySelector('aside .nav-btn[data-page="events"]')?.click();
   document.getElementById('p2v510OpenEvent')?.click();
   const f=document.getElementById('v578EventSearch');
   if(f){f.value='5.81.5 Volunteer Arrival QA';f.dispatchEvent(new Event('input',{bubbles:true}))}
   const row=[...document.querySelectorAll('#eventList .p2v510-event-row')].find(x=>x.textContent.includes('5.81.5 Volunteer Arrival QA'));
   row?.querySelector('.v578-open-event')?.click();
   document.querySelector('#eventWorkspace .v36-go[data-page="daily"]')?.click();
   return {page:document.querySelector('.page.active')?.id,buttons:[...document.querySelectorAll('#v36VolunteerTable .v36-check-vol')].map(b=>b.dataset.id),
    assigned:document.getElementById('v36VolAssigned')?.textContent,
    arrived:document.getElementById('v36VolChecked')?.textContent};
  });
  assert.equal(opened.page,'daily','Volunteer page not opened: '+JSON.stringify(opened));
  assert.deepEqual(opened.buttons.slice().sort(),['qa5815-v1','qa5815-v2'],'Both seeded roster buttons missing');
  assert.equal(opened.arrived,'0');
  const cancelled=await run(function(){
   document.getElementById('v48AddVolunteer').click();
   const wasOpen=document.getElementById('volunteerModal').classList.contains('open');
   document.querySelector('#volunteerModal [data-close="volunteerModal"]').click();
   return {wasOpen,isClosed:!document.getElementById('volunteerModal').classList.contains('open')};
  });
  assert.ok(cancelled.wasOpen&&cancelled.isClosed,'Cannot reproduce Add Volunteer -> Cancel flow');
  const kriyaArrival=await run(function(){
   document.querySelector('#v36VolunteerTable .v36-check-vol[data-id="qa5815-v1"]').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1')),day='qa5815-event|2026-12-15';
   const r=s.volunteerRegistrations.find(x=>x.id==='qa5815-r1');
   return {daily:s.daily[day],registration:r.checkins,arrived:document.getElementById('v36VolChecked').textContent,
    waiting:document.getElementById('v36VolWaiting').textContent,
    undo:!!document.querySelector('#v36VolunteerTable .v36-undo-vol[data-id="qa5815-v1"]'),
    toast:document.getElementById('toast').textContent,roster:s.volunteerRosters[day]};
  });
  assert.ok(kriyaArrival.daily.includes('qa5815-v1'),'CHECK IN failed to save actual arrival after cancelled Add Volunteer: '+JSON.stringify(kriyaArrival));
  assert.ok(kriyaArrival.registration.includes('2026-12-15'),'Volunteer registration check-in history missing');
  assert.equal(kriyaArrival.arrived,'1');
  assert.equal(kriyaArrival.waiting,'1');
  assert.equal(kriyaArrival.undo,true);
  assert.ok(kriyaArrival.toast.includes('Kriyaban'),'Verified Kriyaban greeting not shown');
  assert.deepEqual(kriyaArrival.roster,['qa5815-v1','qa5815-v2'],'Roster assignment unexpectedly changed');
  const undone=await run(function(){
   document.querySelector('#v36VolunteerTable .v36-undo-vol[data-id="qa5815-v1"]').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {arrived:s.daily['qa5815-event|2026-12-15'],registration:s.volunteerRegistrations.find(x=>x.id==='qa5815-r1').checkins,
    displayed:document.getElementById('v36VolChecked').textContent,
    canCheckAgain:!!document.querySelector('#v36VolunteerTable .v36-check-vol[data-id="qa5815-v1"]')};
  });
  assert.deepEqual(undone.arrived,[],'Undo failed daily arrival state');
  assert.deepEqual(undone.registration,[],'Undo failed volunteer check-in history');
  assert.equal(undone.displayed,'0');assert.ok(undone.canCheckAgain);
  const normal=await run(function(){
   document.querySelector('#v36VolunteerTable .v36-check-vol[data-id="qa5815-v2"]').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {arrived:s.daily['qa5815-event|2026-12-15'],registration:s.volunteerRegistrations.find(x=>x.id==='qa5815-r2').checkins,
    displayed:document.getElementById('v36VolChecked').textContent,toast:document.getElementById('toast').textContent};
  });
  assert.deepEqual(normal.arrived,['qa5815-v2'],'Ordinary volunteer check-in failed');
  assert.ok(normal.registration.includes('2026-12-15'));assert.equal(normal.displayed,'1');
  assert.ok(!normal.toast.includes('Kriyaban'),'Non-Kriyaban falsely identified');
  await call('Page.reload',{ignoreCache:true});await sleep(900);
  const persisted=await run(function(){
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {arrived:s.daily['qa5815-event|2026-12-15'],registration:s.volunteerRegistrations.find(x=>x.id==='qa5815-r2').checkins};
  });
  assert.deepEqual(persisted.arrived,['qa5815-v2'],'Check-in not retained after reopening application');
  assert.deepEqual(persisted.registration,['2026-12-15']);
  console.log('PASS real packaged Windows volunteer Check In: modal cancel recovery, Kriyaban greeting, counters, Undo and persisted arrival');
 }finally{
  await js(prior===null?'localStorage.removeItem('+JSON.stringify(storageKey)+')':'localStorage.setItem('+JSON.stringify(storageKey)+','+JSON.stringify(prior)+')');
  await call('Page.reload',{ignoreCache:true});await sleep(500);ws.close();
 }
}
main().catch(error=>{console.error(error.stack||String(error));process.exitCode=1});
