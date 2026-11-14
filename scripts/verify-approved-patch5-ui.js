'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 let page;
 for(let i=0;i<80;i++){
  try{const pages=await(await fetch('http://127.0.0.1:9223/json/list')).json();
   page=pages.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));
   if(page?.webSocketDebuggerUrl)break}catch{}
  await sleep(400);
 }
 assert.ok(page?.webSocketDebuggerUrl,'Windows Electron devtools page unavailable');
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
 let seq=0;const pending=new Map();
 ws.addEventListener('message',event=>{const m=JSON.parse(String(event.data)),cb=pending.get(m.id);if(cb){pending.delete(m.id);cb(m)}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++seq,t=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method))},30000);
  pending.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)reject(Error(JSON.stringify(m.error||m.result?.exceptionDetails)));else resolve(m.result)});
  ws.send(JSON.stringify({id,method,params}));
 });
 const evaluate=async text=>(await call('Runtime.evaluate',{expression:text,awaitPromise:true,returnByValue:true})).result.value;
 const run=fn=>evaluate('('+fn.toString()+')()');
 await call('Runtime.enable');await call('Page.enable');
 await call('Page.addScriptToEvaluateOnNewDocument',{source:"window.__patch5LoadErrors=[];window.addEventListener('error',e=>window.__patch5LoadErrors.push(e.message+' @ '+e.filename+':'+e.lineno));"});
 const key='annualEventRegistration.v1',oldData=await evaluate('localStorage.getItem('+JSON.stringify(key)+')');
 try{
  await run(function(){
   const key='annualEventRegistration.v1',id='qapatch5',date='2026-12-17',eventId=id+'-event';
   const s=JSON.parse(localStorage.getItem(key)||'{}');
   for(const type of ['events','attendees','volunteers','volunteerRegistrations','familyGroups']){
    s[type]=Array.isArray(s[type])?s[type].filter(x=>!String(x.id).startsWith(id)):[];
   }
   s.allocations=s.allocations||{};s.daily=s.daily||{};s.volunteerRosters=s.volunteerRosters||{};
   const volunteerId=id+'-vol',otherId=id+'-legacy';
   s.events.push({id:eventId,name:'Patch 5 Three Changes QA',dates:[date],start:date,end:date,venue:'QA Centre',rules:{badgeVolunteer:true,scarfVolunteer:true}});
   s.volunteers.push({id:volunteerId,firstName:'QA',lastName:'VOLUNTEER',mobile:'9810001500'},
     {id:otherId,firstName:'QA',lastName:'LEGACY',mobile:'9810001599'});
   s.volunteerRegistrations.push(
     {id:id+'-reg1',eventId,volunteerId,source:'counter',registeredAt:new Date().toISOString(),checkins:[]},
     {id:id+'-reg2',eventId,volunteerId:otherId,source:'counter',registeredAt:new Date().toISOString(),checkins:[date]});
   s.attendees.push(
     {id:id+'-linked',eventId,name:'RAHUL LINKED',mobile:'9810001501',personalMobile:'9810001501',registrationDate:date,checkins:[],referenceVolunteerId:volunteerId,source:'counter'},
     {id:id+'-outside',eventId,name:'RAHUL OUTSIDE',mobile:'9810001502',personalMobile:'9810001502',registrationDate:date,checkins:[],source:'counter'});
   s.daily[eventId+'|'+date]=[otherId];
   s.volunteerRosters[eventId+'|'+date]=[volunteerId,otherId];
   s.activeEventId=eventId;
   localStorage.setItem(key,JSON.stringify(s));
  });
  await call('Emulation.setDeviceMetricsOverride',{width:1536,height:1024,deviceScaleFactor:1,mobile:false});
  await call('Page.reload',{ignoreCache:true});await sleep(1200);
  const open=await run(function(){
   document.querySelector('aside .nav-btn[data-page="events"]')?.click();
   const f=document.getElementById('v6EventSearch');
   if(f){f.value='Patch 5 Three Changes QA';f.dispatchEvent(new Event('input',{bubbles:true}))}
   const event=[...document.querySelectorAll('#eventList .v6-event-table tbody tr')].find(r=>r.textContent.includes('Patch 5 Three Changes QA'));
   event?.querySelector('.v6-open-event')?.click();
   document.querySelector('#eventWorkspace .v36-go[data-page="checkin"]')?.click();
   return {page:document.querySelector('.page.active')?.id,event:!!event,registrationButton:!!document.getElementById('v36NewRegistration')};
  });
  assert.equal(open.page,'checkin','Failed opening event check-in: '+JSON.stringify(open));
  // Case 1: matched volunteer-linked pre-registration; use record, no new registration.
  const linked=await run(function(){
   document.getElementById('v36NewRegistration').click();
   const n=document.getElementById('v36MainName'),m=document.getElementById('v36MainMobile');
   n.value='RAHUL LINKED';n.dispatchEvent(new Event('input',{bubbles:true}));
   m.value='9810001501';m.dispatchEvent(new Event('input',{bubbles:true}));
   const host=document.getElementById('v5817RegistrationStatus');
   return {text:host?.textContent,check:!!host?.querySelector('.v5-existing-checkin'),blocked:[...document.querySelectorAll('#v36RegistrationForm button[type="submit"][data-mode]')].every(x=>x.disabled),patchShell:!!document.getElementById('v5VolunteersUI'),patchStage:window.__patch5Stage||'',startupErrors:window.__patch5LoadErrors||[],scripts:document.scripts.length};
  });
  assert.ok(linked.text.includes('PRE-REGISTERED')&&linked.text.includes('QA VOLUNTEER')&&linked.check&&linked.blocked,
    'Linked pre-registration UI missing: '+JSON.stringify(linked));
  const checkedLinked=await run(function(){
   document.querySelector('#v5817RegistrationStatus .v5-existing-checkin').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {matching:s.attendees.filter(a=>a.name==='RAHUL LINKED').length,
     dates:s.attendees.find(a=>a.id==='qapatch5-linked').checkins,
     modalOpen:document.getElementById('v36RegistrationModal').classList.contains('open')};
  });
  assert.deepEqual(checkedLinked.dates,['2026-12-17']);assert.equal(checkedLinked.matching,1);assert.equal(checkedLinked.modalOpen,false);
  // Case 2: outside attendee, REGISTERED and Check In instead of duplicate Open Registration.
  const outside=await run(function(){
   document.getElementById('v36NewRegistration').click();
   const n=document.getElementById('v36MainName'),m=document.getElementById('v36MainMobile');
   n.value='RAHUL OUTSIDE';n.dispatchEvent(new Event('input',{bubbles:true}));
   m.value='9810001502';m.dispatchEvent(new Event('input',{bubbles:true}));
   const host=document.getElementById('v5817RegistrationStatus');
   return {text:host?.textContent,check:!!host?.querySelector('.v5-existing-checkin')};
  });
  assert.ok(outside.text.includes('REGISTERED')&&!outside.text.includes('PRE-REGISTERED')&&outside.check,
    'Outside registration status wrong: '+JSON.stringify(outside));
  const checkedOutside=await run(function(){
   document.querySelector('#v5817RegistrationStatus .v5-existing-checkin').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {matching:s.attendees.filter(a=>a.name==='RAHUL OUTSIDE').length,dates:s.attendees.find(a=>a.id==='qapatch5-outside').checkins};
  });
  assert.deepEqual(checkedOutside.dates,['2026-12-17']);assert.equal(checkedOutside.matching,1);
  // Case 3: unified selected-day volunteer counter with one dropdown.
  const volunteer=await run(function(){
   document.querySelector('#eventWorkspace .v36-go[data-page="daily"]')?.click();
   const t=document.getElementById('v5VolunteerTable');
   return {page:document.querySelector('.page.active')?.id,title:document.getElementById('pageTitle')?.textContent,
    exists:!!document.getElementById('v5VolunteersUI'),add:!!document.getElementById('v5AddVolunteer'),
    filters:[...document.querySelectorAll('#v5VolunteerFilter option')].map(x=>x.value),
    rows:t?.querySelectorAll('tbody tr').length,
    oldCounterHidden:getComputedStyle(document.getElementById('v36VolunteerUI')).display==='none',
    badgeIssue:!!t?.querySelector('.v5-item[data-id="qapatch5-vol"][data-item="badge"]')};
  });
  assert.equal(volunteer.page,'daily','Volunteer page not opened '+JSON.stringify(volunteer));
  assert.deepEqual(volunteer.filters,['all','pending','checked']);
  assert.equal(volunteer.title,'EVENTS');
  assert.ok(volunteer.add&&volunteer.oldCounterHidden&&volunteer.badgeIssue&&volunteer.rows===2,'Unified volunteer UI failed '+JSON.stringify(volunteer));
  const afterIssue=await run(function(){
   document.querySelector('.v5-item[data-id="qapatch5-vol"][data-item="badge"]').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const a=s.allocations['qapatch5-event|2026-12-17|volunteer|qapatch5-vol'];
   return {issued:a.badgeIssued,auto:a.v5AutoCheckin,
    checked:s.volunteerRegistrations.find(x=>x.volunteerId==='qapatch5-vol').checkins,
    total:s.daily['qapatch5-event|2026-12-17'].length};
  });
  assert.ok(afterIssue.issued&&afterIssue.auto);assert.deepEqual(afterIssue.checked,['2026-12-17']);assert.equal(afterIssue.total,2);
  const afterReverse=await run(function(){
   document.querySelector('.v5-item[data-id="qapatch5-vol"][data-item="badge"]').click();
   document.querySelector('#v5ReversePrompt button:last-child').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const a=s.allocations['qapatch5-event|2026-12-17|volunteer|qapatch5-vol'];
   return {issued:a.badgeIssued,auto:a.v5AutoCheckin,checked:s.volunteerRegistrations.find(x=>x.volunteerId==='qapatch5-vol').checkins,
    total:s.daily['qapatch5-event|2026-12-17'].length};
  });
  assert.equal(afterReverse.issued,false);assert.equal(afterReverse.auto,false);assert.deepEqual(afterReverse.checked,[]);
  assert.equal(afterReverse.total,1,'Accidental issue created duplicate check-in');
  // Manual check-in must survive the last item reversal.
  const preserveManual=await run(function(){
   document.querySelector('.v5-check[data-id="qapatch5-vol"]').click();
   document.querySelector('.v5-item[data-id="qapatch5-vol"][data-item="badge"]').click();
   document.querySelector('.v5-item[data-id="qapatch5-vol"][data-item="badge"]').click();
   document.querySelector('#v5ReversePrompt button:last-child').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {checked:s.volunteerRegistrations.find(x=>x.volunteerId==='qapatch5-vol').checkins,
    flags:s.allocations['qapatch5-event|2026-12-17|volunteer|qapatch5-vol']};
  });
  assert.deepEqual(preserveManual.checked,['2026-12-17']);assert.ok(preserveManual.flags.v5ManualCheckin&&!preserveManual.flags.badgeIssued);
  // A pre-existing/legacy volunteer check-in is not reversed by a newly issued item.
  const preserveLegacy=await run(function(){
   document.querySelector('.v5-item[data-id="qapatch5-legacy"][data-item="scarf"]').click();
   document.querySelector('.v5-item[data-id="qapatch5-legacy"][data-item="scarf"]').click();
   document.querySelector('#v5ReversePrompt button:last-child').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {dates:s.volunteerRegistrations.find(x=>x.volunteerId==='qapatch5-legacy').checkins,
    flag:s.allocations['qapatch5-event|2026-12-17|volunteer|qapatch5-legacy'].v5LegacyCheckin};
  });
  assert.deepEqual(preserveLegacy.dates,['2026-12-17']);assert.equal(preserveLegacy.flag,true);
  // Verify filters and preserved source after rendering/refresh.
  const filtered=await run(function(){
   const f=document.getElementById('v5VolunteerFilter');f.value='checked';f.dispatchEvent(new Event('change',{bubbles:true}));
   return {rows:document.querySelectorAll('#v5VolunteerTable tbody tr').length,
    details:!!document.getElementById('v5VolunteerDetail'),
    issueCounterHidden:getComputedStyle(document.getElementById('v82IssueReturn')).display==='none'};
  });
  assert.equal(filtered.rows,2);assert.ok(filtered.details&&filtered.issueCounterHidden);
  const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync('patch5-volunteers-test.png',Buffer.from(shot.data,'base64'));
  console.log('PASS Patch5 Windows UI: linked and outside duplicates, registered-only check-in, single volunteer screen and filter, reversible issue, manual and legacy attendance preserved');
 }finally{
  await evaluate(oldData===null?'localStorage.removeItem('+JSON.stringify(key)+')':'localStorage.setItem('+JSON.stringify(key)+','+JSON.stringify(oldData)+')');
  await call('Page.reload',{ignoreCache:true});ws.close();
 }
}
main().catch(err=>{console.error(err.stack||String(err));process.exitCode=1});
