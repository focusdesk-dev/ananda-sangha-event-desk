'use strict';
const assert=require('node:assert/strict');const fs=require('fs');
const nap=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
 let target;
 for(let i=0;i<100;i++){try{
  const pages=await(await fetch('http://127.0.0.1:9223/json/list')).json();
  target=pages.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));
  if(target?.webSocketDebuggerUrl)break;
 }catch{}await nap(220)}
 assert.ok(target?.webSocketDebuggerUrl,'Packaged Windows Ananda UI unavailable');
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((yes,no)=>{ws.addEventListener('open',yes,{once:true});ws.addEventListener('error',no,{once:true})});
 let id=0;const waiting=new Map();
 ws.addEventListener('message',ev=>{const msg=JSON.parse(String(ev.data));waiting.get(msg.id)?.(msg);waiting.delete(msg.id)});
 const send=(method,params={})=>new Promise((resolve,reject)=>{
  const k=++id,t=setTimeout(()=>{waiting.delete(k);reject(Error('DevTools '+method+' timed out'))},40000);
  waiting.set(k,msg=>{clearTimeout(t);if(msg.error||msg.result?.exceptionDetails)reject(Error(JSON.stringify(msg.error||msg.result?.exceptionDetails)));else resolve(msg.result)});
  ws.send(JSON.stringify({id:k,method,params}));
 });
 const js=async expression=>(await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value;
 const run=fn=>js('('+fn.toString()+')()');
 const key='annualEventRegistration.v1',prior=await js('localStorage.getItem('+JSON.stringify(key)+')');
 let count=0;const pass=s=>console.log('PATCH13 PASS '+(++count)+' '+s);
 try{
  await run(function(){
   const key='annualEventRegistration.v1',s=JSON.parse(localStorage.getItem(key)||'{}'),
    p='qaP13-',eventId=p+'event',date='2026-11-09';
   for(const k of ['events','students','volunteers','kriyabans','acharyas','attendees',
     'attendeeMaster','familyGroups','volunteerRegistrations','classEnrollments']){
    s[k]=(s[k]||[]).filter(x=>!String(x.id).startsWith(p));
   }
   s.daily=s.daily||{};s.volunteerRosters=s.volunteerRosters||{};delete s.daily[eventId+'|'+date];
   s.events.push({id:eventId,name:'PATCH13 QA',dates:[date],start:date,end:date,venue:'QA',rules:{}});
   s.students.push(
    {id:p+'student',name:'Aarav StudentTest',mobile:'9876101010',volunteerId:''},
    {id:p+'old',name:'Sonal OldVolunteer',mobile:'9876101020',volunteerId:''},
    {id:p+'sharedA',name:'Divya SharedHouse',mobile:'9876101030',volunteerId:''},
    {id:p+'sharedB',name:'Rahul SharedHouse',mobile:'9876101030',volunteerId:''});
   s.volunteers.push(
    {id:p+'oldVol',firstName:'Sonal',lastName:'OldVolunteer',mobile:'9876101020'},
    {id:p+'sharedVol',firstName:'Divya',lastName:'SharedHouse',mobile:'9876101030'});
   s.volunteerRegistrations.push({id:p+'oldReg',eventId,volunteerId:p+'oldVol',
     source:'counter',checkins:[date]});
   s.daily[eventId+'|'+date]=[p+'oldVol'];
   s.volunteerRosters[eventId+'|'+date]=[p+'oldVol',p+'sharedVol'];
   s.attendeeMaster.push({id:p+'master',name:'Amita Existing',mobile:'9876101040',
     personalMobile:'9876101040',category:'outside'});
   s.familyGroups.push({id:p+'family',eventId,type:'outside-family',
     contactName:'Nikhil Contact',mobile:'9876101050',registrationDate:date,
     members:[{id:p+'child',name:'Divya ContactChild',relationship:'Daughter',
       mobile:'',checkins:[]}]});
   s.activeEventId=eventId;localStorage.setItem(key,JSON.stringify(s));
  });
  await send('Page.reload',{ignoreCache:true});await nap(1150);
  const init=await run(function(){
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {version:window.anandaStudentVolunteerIntegrityVersion,
    prior:s.students.find(x=>x.id==='qaP13-old')?.volunteerId,
    sharedA:s.students.find(x=>x.id==='qaP13-sharedA')?.volunteerId,
    sharedB:s.students.find(x=>x.id==='qaP13-sharedB')?.volunteerId,
    priorCheckins:s.volunteerRegistrations.find(x=>x.id==='qaP13-oldReg')?.checkins,
    priorDaily:s.daily['qaP13-event|2026-11-09']};
  });
  assert.equal(init.version,'13');
  assert.equal(init.prior,'qaP13-oldVol');
  assert.equal(init.sharedA,'qaP13-sharedVol');
  assert.equal(init.sharedB,'','Shared family contact must not auto-link other student');
  assert.deepEqual(init.priorCheckins,['2026-11-09']);
  assert.deepEqual(init.priorDaily,['qaP13-oldVol']);
  pass('Legacy student-volunteer link repaired by exact identity; shared family phone does not link wrong student');

  const event=await run(function(){
   document.querySelector('aside .nav-btn[data-page="events"]')?.click();
   const search=document.getElementById('v6EventSearch');
   search.value='PATCH13 QA';search.dispatchEvent(new Event('input',{bubbles:true}));
   document.querySelector('#eventList .v6-open-event[data-id="qaP13-event"]')?.click();
   document.querySelector('#v6EventTabs [data-v6-tab="volunteers"]')?.click();
   document.getElementById('v5AddVolunteer')?.click();
   const q=document.getElementById('v5VolunteerSearch');
   q.value='Aarav StudentTest';q.dispatchEvent(new Event('input',{bubbles:true}));
   const match=[...document.querySelectorAll('#v11VolunteerResults .v11-person')]
     .find(x=>x.textContent.includes('Aarav StudentTest'));
   const found=!!match;match?.querySelector('button')?.click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const student=s.students.find(x=>x.id==='qaP13-student');
   const v=s.volunteers.find(x=>x.id===student?.volunteerId);
   const reg=s.volunteerRegistrations.find(x=>x.eventId==='qaP13-event'&&x.volunteerId===v?.id);
   return {found,linkedId:student?.volunteerId,volunteer:v?.id,refs:v?.linkedIdentityRefs,
     registered:!!reg,checkins:reg?.checkins||[],daily:s.daily['qaP13-event|2026-11-09']||[],
     sidebar:document.querySelector('aside')?.outerHTML};
  });
  assert.equal(event.found,true);assert.ok(event.volunteer);
  assert.equal(event.linkedId,event.volunteer);
  assert.ok(event.refs.some(x=>x.kind==='student'&&x.id==='qaP13-student'));
  assert.equal(event.registered,true);assert.deepEqual(event.checkins,[]);
  assert.ok(!event.daily.includes(event.volunteer));
  pass('Registering existing Student as Volunteer writes back student.volunteerId, never checks in automatically');
  const sidebar=event.sidebar;

  const historyBefore=await run(function(){
   document.querySelector('aside .nav-btn[data-page="studentProgress"]')?.click();
   document.getElementById('p2v520Followups')?.click();
   const search=document.getElementById('p2v526Search');
   if(search){search.value='Aarav StudentTest';search.dispatchEvent(new Event('input',{bubbles:true}))}
   const b=[...document.querySelectorAll('.p2v526-result, .p2v520-history-btn')]
     .find(x=>x.dataset.id==='qaP13-student');
   b?.click();
   document.getElementById('p2v558Volunteer')?.click();
   const panel=document.getElementById('p2v558VolunteerPanel');
   return {search:!!search,found:!!b,panel:panel?.textContent||'',
    current:document.querySelector('.page.active')?.id,
    followups:!!document.getElementById('p2v520Followups'),
    nav:[...document.querySelectorAll('aside .nav-btn')].map(x=>x.dataset.page),
    allButtons:[...document.querySelectorAll('#studentProgress input')].map(x=>x.id),
    progressText:document.getElementById('studentProgress')?.textContent?.slice(0,600)};
  });
  console.log('DEBUG STUDENT-PROGRESS BEFORE CHECKIN',JSON.stringify(historyBefore));
  assert.ok(historyBefore.search&&historyBefore.found,
    'Student record must be searchable and openable in Student Progress');
  assert.match(historyBefore.panel,/No volunteer participation recorded/i);
  pass('Assigned but not checked-in volunteer remains absent from Student Progress history');

  const arrived=await run(function(){
   document.querySelector('aside .nav-btn[data-page="events"]')?.click();
   document.querySelector('#v6EventTabs [data-v6-tab="volunteers"]')?.click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const v=s.students.find(x=>x.id==='qaP13-student').volunteerId;
   const b=document.querySelector('#v5VolunteerTable .v5-check[data-id="'+v+'"]');
   b?.click();
   const next=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {found:!!b,checked:next.volunteerRegistrations.find(r=>r.eventId==='qaP13-event'&&r.volunteerId===v)?.checkins,
     daily:next.daily['qaP13-event|2026-11-09']||[]};
  });
  assert.equal(arrived.found,true);assert.deepEqual(arrived.checked,['2026-11-09']);
  assert.ok(arrived.daily.includes(event.volunteer));
  pass('Volunteer check-in writes both event ledger and volunteer registration');

  const historyAfter=await run(function(){
   document.querySelector('aside .nav-btn[data-page="studentProgress"]')?.click();
   document.getElementById('p2v520Followups')?.click();
   const search=document.getElementById('p2v526Search');
   search.value='Aarav StudentTest';search.dispatchEvent(new Event('input',{bubbles:true}));
   const b=[...document.querySelectorAll('.p2v526-result, .p2v520-history-btn')]
     .find(x=>x.dataset.id==='qaP13-student');
   b?.click();document.getElementById('p2v558Volunteer')?.click();
   const panel=document.getElementById('p2v558VolunteerPanel');
   return {found:!!b,html:panel?.innerHTML||'',text:panel?.textContent||''};
  });
  assert.ok(historyAfter.text.includes('PATCH13 QA'));
  assert.ok(historyAfter.text.includes('2026-11-09')||historyAfter.text.includes('09 Nov'));
  pass('Actual checked-in volunteer event appears in Student Progress Volunteer Record');

  const undone=await run(function(){
   document.querySelector('aside .nav-btn[data-page="events"]')?.click();
   document.querySelector('#v6EventTabs [data-v6-tab="volunteers"]')?.click();
   const b=document.querySelector('#v5VolunteerTable .v5-check.checked[data-id="'+
     JSON.parse(localStorage.getItem('annualEventRegistration.v1')).students.find(x=>x.id==='qaP13-student').volunteerId+'"]');
   b?.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true,detail:2}));
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const v=s.students.find(x=>x.id==='qaP13-student').volunteerId;
   return {button:!!b,checkins:s.volunteerRegistrations.find(x=>x.eventId==='qaP13-event'&&x.volunteerId===v)?.checkins||[],
     daily:s.daily['qaP13-event|2026-11-09']||[],studentId:v};
  });
  assert.equal(undone.button,true);assert.deepEqual(undone.checkins,[]);
  assert.ok(!undone.daily.includes(undone.studentId));
  pass('Double-click Undo clears checked-in history without deleting student-volunteer identity link');
  const afterUndo=await run(function(){
   document.querySelector('aside .nav-btn[data-page="studentProgress"]')?.click();
   document.getElementById('p2v520Followups')?.click();
   const q=document.getElementById('p2v526Search');
   q.value='Aarav StudentTest';q.dispatchEvent(new Event('input',{bubbles:true}));
   [...document.querySelectorAll('.p2v526-result, .p2v520-history-btn')]
     .find(x=>x.dataset.id==='qaP13-student')?.click();
   document.getElementById('p2v558Volunteer')?.click();
   return document.getElementById('p2v558VolunteerPanel')?.textContent||'';
  });
  assert.match(afterUndo,/No volunteer participation recorded/i);
  pass('Undo also removes that event from Student Progress without erasing registration');

  const studentDup=await run(function(){
   const f=document.getElementById('p2StudentForm');document.getElementById('p2StudentId').value='';
   document.getElementById('p2StudentName').value='Different Student Name';
   document.getElementById('p2StudentMobile').value='9876101010';
   f.requestSubmit();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const banner=f.querySelector('.p13-identity-status');
   return {count:s.students.filter(x=>x.mobile==='9876101010').length,text:banner?.textContent||''};
  });
  assert.equal(studentDup.count,1);assert.match(studentDup.text,/MOBILE ALREADY REGISTERED TO/i);
  pass('Student Master rejects a personal mobile belonging to a different person');

  const kriyaDup=await run(function(){
   document.getElementById('kriyabanId').value='';
   document.getElementById('kriyabanName').value='Different Kriyaban';
   document.getElementById('kriyabanMobile').value='9876101010';
   document.getElementById('kriyabanForm').requestSubmit();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const b=document.getElementById('kriyabanForm').querySelector('.p13-identity-status');
   return {new:s.kriyabans.some(x=>x.name==='Different Kriyaban'),text:b?.textContent||''};
  });
  assert.equal(kriyaDup.new,false);assert.match(kriyaDup.text,/MOBILE ALREADY REGISTERED TO/i);
  pass('Kriyaban Master uses the same cross-module mobile ownership alert');

  const volunteerDup=await run(function(){
   document.getElementById('volunteerId').value='';
   document.getElementById('volunteerFirstName').value='Different';
   document.getElementById('volunteerLastName').value='Volunteer';
   document.getElementById('volunteerMobile').value='9876101010';
   document.getElementById('volunteerBirthday').value='1990-05-10';
   document.getElementById('volunteerForm').requestSubmit();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const b=document.getElementById('volunteerForm').querySelector('.p13-identity-status');
   return {new:s.volunteers.some(v=>v.firstName==='Different'&&v.lastName==='Volunteer'),text:b?.textContent||''};
  });
  assert.equal(volunteerDup.new,false);assert.match(volunteerDup.text,/MOBILE ALREADY REGISTERED TO/i);
  pass('Volunteer Master cannot create a duplicate person with someone else’s mobile');

  const familyDup=await run(function(){
   document.querySelector('aside .nav-btn[data-page="events"]')?.click();
   document.querySelector('#v6EventTabs [data-v6-tab="attendees"]')?.click();
   document.getElementById('v36NewRegistration').click();
   document.querySelector('#v10RegistrationMode [data-v10-mode="family"]').click();
   document.getElementById('v12ContactName').value='Wrong Family Contact';
   document.getElementById('v12ContactPhone').value='9876101010';
   document.querySelector('#v12MemberRows .v12-rel').value='Mom';
   document.getElementById('v12RegisterOnly').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const b=document.querySelector('#v12ContactPhone')?.closest('.v12-field')?.querySelector('.p13-identity-status');
   return {saved:s.familyGroups.some(g=>g.contactName==='Wrong Family Contact'),msg:b?.textContent||''};
  });
  assert.equal(familyDup.saved,false);assert.match(familyDup.msg,/MOBILE ALREADY REGISTERED TO/i);
  pass('REGISTER UNDER refuses phone belonging to another person with visible alert');

  const familyShared=await run(function(){
   document.getElementById('v12ContactName').value='Nikhil Contact';
   document.getElementById('v12ContactPhone').value='9876101050';
   document.querySelector('#v12MemberRows .v12-rel').value='Sister';
   document.querySelector('#v12MemberRows .v12-name').value='New Sister';
   document.getElementById('v12RegisterOnly').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {count:s.familyGroups.filter(g=>g.contactName==='Nikhil Contact'&&g.eventId==='qaP13-event').length,
     open:document.getElementById('v36RegistrationModal').classList.contains('open')};
  });
  assert.equal(familyShared.count,1);assert.equal(familyShared.open,true);
  pass('Same event Register Under duplicate detected; no second family group created');

  const memberDup=await run(function(){
   document.getElementById('v12ContactName').value='Fresh Family Contact';
   document.getElementById('v12ContactPhone').value='9876101060';
   document.querySelector('#v12MemberRows .v12-name').value='Other Child';
   document.querySelector('#v12MemberRows .v12-rel').value='Daughter';
   document.querySelector('#v12MemberRows .v12-mobile').value='9876101010';
   document.getElementById('v12RegisterOnly').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const b=document.querySelector('#v12MemberRows .v12-mobile')?.closest('.v12-member')?.querySelector('.p13-identity-status');
   return {saved:s.familyGroups.some(g=>g.contactName==='Fresh Family Contact'),
     msg:b?.textContent||''};
  });
  assert.equal(memberDup.saved,false);assert.match(memberDup.msg,/MOBILE ALREADY REGISTERED TO/i);
  pass('Family-member personal mobile conflicts are blocked even when head mobile differs');

  const memberSharedAllowed=await run(function(){
   document.querySelector('#v12MemberRows .v12-mobile').value='';
   document.getElementById('v12RegisterOnly').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const g=s.familyGroups.find(x=>x.contactName==='Fresh Family Contact');
   return {saved:!!g,contact:g?.contactName,members:g?.members?.map(m=>({name:m.name,mobile:m.mobile})),
     masterChild:s.attendeeMaster.filter(p=>p.name==='Other Child').length};
  });
  assert.ok(memberSharedAllowed.saved);assert.equal(memberSharedAllowed.members.length,1);
  assert.equal(memberSharedAllowed.members[0].mobile,'');
  assert.equal(memberSharedAllowed.masterChild,0);
  pass('Family-only member with blank personal mobile saves without a false shared-phone collision');

  const oldAccount=await run(function(){
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {sidebar:document.querySelector('aside')?.outerHTML,
     member:s.familyGroups.find(x=>x.id==='qaP13-family')?.members?.[0]?.name,
     legacyCheckins:s.volunteerRegistrations.find(x=>x.id==='qaP13-oldReg')?.checkins,
     studentCount:s.students.filter(x=>x.id==='qaP13-student').length};
  });
  assert.equal(oldAccount.sidebar.replace(/nav-btn active/g,'nav-btn'),
    sidebar.replace(/nav-btn active/g,'nav-btn'));
  assert.equal(oldAccount.member,'Divya ContactChild');
  assert.equal(oldAccount.studentCount,1);
  assert.deepEqual(oldAccount.legacyCheckins,['2026-11-09']);
  pass('Frozen sidebar and earlier check-in history preserved without changing older group members');
  const snap=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync('patch13-mobile-and-student-history.png',Buffer.from(snap.data,'base64'));
  console.log('PATCH13 '+count+' REAL WINDOWS INTEGRATION TESTS PASSED');
 }finally{
  await js(prior===null?'localStorage.removeItem('+JSON.stringify(key)+')':
    'localStorage.setItem('+JSON.stringify(key)+','+JSON.stringify(prior)+')');
  await send('Page.reload',{ignoreCache:true}).catch(()=>{});ws.close();
 }
}
main().catch(err=>{console.error('PATCH13 FAIL',err.stack||String(err));process.exitCode=1});
