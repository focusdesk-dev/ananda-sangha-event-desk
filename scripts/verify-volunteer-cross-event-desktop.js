'use strict';
const assert=require('node:assert/strict'),delay=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 let page;for(let i=0;i<60;i++){try{const a=await(await fetch('http://127.0.0.1:9223/json/list')).json();page=a.find(x=>x.type==='page'&&/index.html|Ananda/i.test((x.title||'')+' '+(x.url||'')));if(page?.webSocketDebuggerUrl)break}catch{}await delay(250)}
 assert.ok(page?.webSocketDebuggerUrl,'Packaged Windows Electron app unavailable');
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
 const callbacks=new Map();let serial=0;
 ws.addEventListener('message',event=>{const m=JSON.parse(String(event.data)),cb=callbacks.get(m.id);if(cb){callbacks.delete(m.id);cb(m)}});
 const send=(method,params={})=>new Promise((ok,bad)=>{
  const id=++serial,t=setTimeout(()=>{callbacks.delete(id);bad(Error('CDP timeout '+method))},30000);
  callbacks.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)bad(Error(JSON.stringify(m.error||m.result?.exceptionDetails)));else ok(m.result)});
  ws.send(JSON.stringify({id,method,params}));
 });
 const run=async js=>(await send('Runtime.evaluate',{expression:js,returnByValue:true,awaitPromise:true})).result.value;
 const evalFn=async fn=>run('('+fn.toString()+')()');
 const key='annualEventRegistration.v1',original=await run('localStorage.getItem('+JSON.stringify(key)+')');
 try{
 const patchMarker=await evalFn(function(){return {version:window.anandaVolunteerPatchVersion,title:document.title}});
 assert.equal(patchMarker.version,'5.4','Previous volunteer correction missing');
 assert.equal(await evalFn(function(){return window.anandaFrozenPatchVersion}),'9','Cumulative Patch 9 missing');
 console.log('PASS packaged app confirms Volunteer Patch 5.4 internal marker');
  await evalFn(function(){
   const key='annualEventRegistration.v1',s=JSON.parse(localStorage.getItem(key)||'{}'),id='qaCrossEvent';
   for(const name of ['events','volunteers','volunteerRegistrations','attendees','familyGroups'])
    s[name]=(s[name]||[]).filter(x=>!String(x.id).startsWith(id));
   s.volunteerRosters=s.volunteerRosters||{};s.daily=s.daily||{};
   const volunteerId=id+'-vol';
   s.volunteers.push({id:volunteerId,firstName:'NIKHIL',lastName:'ANANDA',mobile:'5917534600',birthday:'1980-01-01'});
   for(const [eventId,date] of [[id+'-2026','2026-11-11'],[id+'-2027','2027-11-11'],[id+'-2028','2028-11-11']]){
    s.events.push({id:eventId,name:'QA Volunteer Cross Event '+date,dates:[date],start:date,end:date,venue:'Test Venue',rules:{badgeVolunteer:true,scarfVolunteer:true}});
   }
   s.activeEventId=id+'-2026';localStorage.setItem(key,JSON.stringify(s));
  });
  await send('Page.reload',{ignoreCache:true});await delay(1000);
  const open=async (year)=>{
   const ok=await evalFn(function(){
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));const year=localStorage.getItem('qaCrossEventYear');
    const e=s.events.find(e=>e.id==='qaCrossEvent-'+year);
    s.activeEventId=e.id;
    const day=e.dates[0];
    localStorage.setItem('annualEventRegistration.v1',JSON.stringify(s));
    document.getElementById('workingDate').value=day;
    return !!e;
   });
   assert.ok(ok);
   await send('Page.reload',{ignoreCache:true});await delay(500);
   return evalFn(function(){
    document.querySelector('#eventWorkspace .v36-go[data-page="daily"]')?.click();
    document.getElementById('v48AddVolunteer')?.click();
    const id=document.getElementById('volunteerId'),modal=document.getElementById('volunteerModal');
    const first=document.getElementById('volunteerFirstName'),last=document.getElementById('volunteerLastName'),mobile=document.getElementById('volunteerMobile');
    first.value='NIKHIL';last.value='ANANDA';mobile.value='5917534600';
    return {id:id?.value,modal:modal?.classList.contains('open'),page:document.querySelector('.page.active')?.id,haveSave:!!document.getElementById('v87SaveVolunteerCheckin')};
   });
  };
  for(const year of ['2026','2027']){
   await run('localStorage.setItem("qaCrossEventYear",'+JSON.stringify(year)+')');
   const ui=await open(year);
   assert.ok(ui.modal&&ui.haveSave,'Volunteer form missing: '+JSON.stringify(ui));
   // Save and check in today must not be blocked by permanent-master identity rules.
   const result=await evalFn(function(){
     document.getElementById('v87SaveVolunteerCheckin').click();
     const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1')),id='qaCrossEvent-'+localStorage.getItem('qaCrossEventYear');
     return {modalOpen:document.getElementById('volunteerModal').classList.contains('open'),
       masterCount:s.volunteers.filter(v=>v.mobile==='5917534600').length,
       eventCount:s.volunteerRegistrations.filter(r=>r.eventId===id&&r.volunteerId==='qaCrossEvent-vol').length,
       checkins:s.volunteerRegistrations.find(r=>r.eventId===id&&r.volunteerId==='qaCrossEvent-vol')?.checkins||[]};
   });
   assert.equal(result.masterCount,1,'Must never duplicate Volunteer Master');
   assert.equal(result.eventCount,1,'Must register existing volunteer in event '+year);
   assert.equal(result.modalOpen,false,'Modal must close after successful reuse');
   assert.ok(result.checkins.includes(year+'-11-11'),'Checkin must apply to chosen event date');
   // Reapply through a different year while retaining previous year history.
   console.log('PASS '+year+' reuse existing Volunteer Master, one per-event registration, checked in');
  }
  // Ordinary Save Volunteer in a later year: assign to roster, NOT check in.
  await run('localStorage.setItem("qaCrossEventYear","2028")');
  const ordinaryUi=await open('2028');
  assert.ok(ordinaryUi.modal,'Volunteer form missing for ordinary Save');
  const ordinary=await evalFn(function(){
    const form=document.getElementById('volunteerForm');
    const submit=[...form.querySelectorAll('button[type="submit"]')][0];
    if(!submit)throw Error('Ordinary Save Volunteer submit button absent');
    submit.click();
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    const id='qaCrossEvent-2028',date='2028-11-11',vol='qaCrossEvent-vol';
    return {
      modalOpen:document.getElementById('volunteerModal').classList.contains('open'),
      masterCount:s.volunteers.filter(v=>v.mobile==='5917534600').length,
      eventCount:s.volunteerRegistrations.filter(r=>r.eventId===id&&r.volunteerId===vol).length,
      roster:(s.volunteerRosters[id+'|'+date]||[]).includes(vol),
      checkins:s.volunteerRegistrations.find(r=>r.eventId===id&&r.volunteerId===vol)?.checkins||[]
    };
  });
  assert.equal(ordinary.masterCount,1,'Ordinary save must not duplicate Volunteer Master');
  assert.equal(ordinary.modalOpen,false,'Ordinary save modal must close');
  assert.equal(ordinary.eventCount,1,'Ordinary save must register existing volunteer');
  assert.equal(ordinary.roster,true,'Ordinary save must assign to selected date roster');
  assert.deepEqual(ordinary.checkins,[],'Ordinary save must NOT check in');
  console.log('PASS 2028 ordinary Save Volunteer: roster only, not checked in, no master duplicate');
  const final=await evalFn(function(){
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {master:s.volunteers.filter(v=>v.mobile==='5917534600').length,
     events:s.volunteerRegistrations.filter(r=>r.volunteerId==='qaCrossEvent-vol').map(r=>r.eventId).sort()};
  });
  assert.equal(final.master,1);
  assert.deepEqual(final.events,['qaCrossEvent-2026','qaCrossEvent-2027','qaCrossEvent-2028']);
  console.log('PASS cross-event, cross-year, no master duplicate, existing records preserved');
 }finally{
  if(original===null)await run('localStorage.removeItem('+JSON.stringify(key)+')');
  else await run('localStorage.setItem('+JSON.stringify(key)+','+JSON.stringify(original)+')');
  await run('localStorage.removeItem("qaCrossEventYear")');
  ws.close();
 }
}
main().catch(e=>{console.error('FAIL cross-event volunteer regression: '+e.stack);process.exitCode=1});
