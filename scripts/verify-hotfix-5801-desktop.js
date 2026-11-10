'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);let page;
 for(let i=0;i<50;i++){
  try{const list=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
   page=list.find(x=>x.type==='page'&&/Ananda|index.html/i.test((x.title||'')+' '+(x.url||'')));
   if(page?.webSocketDebuggerUrl)break;
  }catch{}
  await sleep(350);
 }
 assert.ok(page?.webSocketDebuggerUrl,'Packaged app unavailable for hotfix test');
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
 let seq=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data)),cb=pending.get(m.id);if(m.method==='Runtime.exceptionThrown')console.log('HOTFIX RUNTIME ERROR',JSON.stringify(m.params?.exceptionDetails||{}).slice(0,2800));if(cb){pending.delete(m.id);cb(m)}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++seq,t=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method))},30000);
  pending.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)reject(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else resolve(m.result)});
  ws.send(JSON.stringify({id,method,params}));
 });
 const js=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 const run=fn=>js('('+fn.toString()+')()');
 await call('Runtime.enable');
 const key='annualEventRegistration.v1',prior=await js('localStorage.getItem('+JSON.stringify(key)+')');
 try{
  const seed=await run(function(){
   const key='annualEventRegistration.v1',s=JSON.parse(localStorage.getItem(key)||'{}'),id='qa5801';
   for(const section of ['events','volunteers','familyGroups','attendeeMaster','attendees','students','kriyabans','classBatches','classEnrollments'])
    s[section]=(s[section]||[]).filter(x=>!String(x.id).startsWith(id));
   // Isolate this registration test from older class fixtures (restored in finally).
   s.classBatches=[];s.classEnrollments=[];s.courseTypes=[];s.students=[];
   s.events.push({id:id+'-event',name:'Hotfix 5801 Test Event',dates:['2026-12-08'],start:'2026-12-08',end:'2026-12-08',venue:'Test Centre'});
   s.volunteers.push({id:id+'-vol',firstName:'Ankit',lastName:'Kohli',mobile:'9876543210',birthday:'1986-08-25'});
   s.familyGroups.push({id:id+'-family',eventId:id+'-event',type:'volunteer-family',volunteerId:id+'-vol',mobile:'9876543210',registrationDate:'2026-12-08',members:[
    {id:id+'-sahil',name:'Sahil Malhotra',relationship:'Brother',mobile:'9812345678',checkins:[]},
    {id:id+'-rahul',name:'Rahul Malhotra',relationship:'Brother',mobile:'',checkins:[]},
    {id:id+'-divya',name:'Divya Malhotra',relationship:'Sister',mobile:'',checkins:[]}
   ]});
   s.attendeeMaster.push(
    {id:id+'-sahil-master',name:'Sahil Malhotra',category:'family',linkedVolunteerId:id+'-vol',mobile:'9876543210',personalMobile:'9812345678'},
    {id:id+'-rahul-master',name:'Rahul Malhotra',category:'family',linkedVolunteerId:id+'-vol',mobile:'9876543210',personalMobile:''}
   );
   s.kriyabans.push({id:id+'-kriyaban',name:'Kriya Search QA',mobile:'9822222202',kriyaDate:'2025-04-01'});
   s.students.push({id:id+'-student',name:'Bina Student Search QA',mobile:'9822222233',createdAt:'2026-01-01'});
   s.students.push({id:id+'-sahil-student',name:'Sahil Malhotra',mobile:'9812345678',createdAt:'2026-01-01'});
   // All master types, including a single-letter Student name, must be discoverable.
   s.students.push({id:id+'-one-letter',name:'A',mobile:'9800000001',createdAt:'2026-01-01'});
   s.attendeeMaster.push({id:id+'-master-lookup',name:'Attendee Master Lookup QA',mobile:'9800000002',category:'outside'});
   s.vips=s.vips||[];s.vips.push({id:id+'-vip-lookup',name:'VIP Lookup QA',mobile:'9800000003'});
   s.acharyas=s.acharyas||[];s.acharyas.push({id:id+'-acharya-lookup',name:'Acharya Lookup QA',mobile:'9800000004'});
   s.activeEventId=id+'-event';localStorage.setItem(key,JSON.stringify(s));
   return {family:s.familyGroups.at(-1).members.map(x=>({name:x.name,personal:x.mobile}))};
  });
  assert.equal(seed.family.filter(p=>p.personal).length,1,'Fixture family personal numbers are wrong');
  await call('Page.reload',{ignoreCache:true});await sleep(1300);
  const opened=await run(function(){
   document.querySelector('aside .nav-btn[data-page="events"]')?.click();
   document.getElementById('p2v510OpenEvent')?.click();
   const filter=document.getElementById('v578EventSearch');
   if(filter){filter.value='Hotfix 5801 Test Event';filter.dispatchEvent(new Event('input',{bubbles:true}))}
   const row=[...document.querySelectorAll('#eventList .p2v510-event-row')].find(x=>x.textContent.includes('Hotfix 5801 Test Event'));
   row?.querySelector('.v578-open-event')?.click();
   document.querySelector('#eventWorkspace .v36-go[data-page="checkin"]')?.click();
   const side=document.querySelector('aside');
   return {checkin:document.getElementById('checkin')?.classList.contains('active'),
    activePage:document.querySelector('.page.active')?.id,
    search:!!document.getElementById('v36AttendeeSearch'),
    nav:{width:Math.round(side.getBoundingClientRect().width),labels:[...side.querySelectorAll('nav button')].map(b=>b.textContent.trim())}};
  });
  console.log('HOTFIX DIAGNOSTIC after reload',JSON.stringify(await run(function(){return {version:document.title,hasHotfix:typeof window.ananda580ShowDuplicate==='function',style:!!document.getElementById('v580NarrowSearchStyle'),recovery:!!document.getElementById('v578RecoveryOnlyStyle'),scriptCount:document.scripts.length,mainSource:document.scripts[document.scripts.length-1]?.textContent?.length,active:document.querySelector('.page.active')?.id,hasEvent:!!document.getElementById('v578EventSearch'),hasBox:!!document.getElementById('v80MobileDuplicate'),localEvent:JSON.parse(localStorage.getItem('annualEventRegistration.v1')||'{}').activeEventId}}))); 
  assert.ok(opened.checkin&&opened.search,'Original 5.80 check-in page failed to open: '+JSON.stringify(opened));
  const family=await run(function(){
   const input=document.getElementById('v36AttendeeSearch');input.value='Sahil Malhotra';
   input.dispatchEvent(new Event('input',{bubbles:true}));
   const table=document.getElementById('v36AttendeeTable'),rows=[...table.querySelectorAll('tr')].map(r=>r.textContent);
   return {found:table.textContent.includes('Sahil Malhotra'),
    sharedShownAsPersonal:rows.some(r=>r.includes('Sahil Malhotra')&&r.includes('9876543210'))};
  });
  assert.ok(family.found,'Family member missing from check-in search');
  assert.equal(family.sharedShownAsPersonal,false,'Family contact incorrectly printed as member own phone');
  // The Event search must show a student who is not registered for this event.
  const studentSearch=await run(function(){
   const input=document.getElementById('v36AttendeeSearch');
   const checks=[];
   for(const query of ['Bina Student Search QA','9822222233']){
    input.value=query;input.dispatchEvent(new Event('input',{bubbles:true}));
    const host=document.getElementById('v580OtherRecords'),table=document.getElementById('v36AttendeeTable');
    checks.push({query,found:host?.textContent.includes('Bina Student Search QA'),
      view:!!host?.querySelector('button.v580-view'),
      above:!!(host&&table&&(host.compareDocumentPosition(table)&Node.DOCUMENT_POSITION_FOLLOWING))});
   }
   input.value='Sahil Malhotra';input.dispatchEvent(new Event('input',{bubbles:true}));
   const eventTable=document.getElementById('v36AttendeeTable');
   const eventRows=[...eventTable.querySelectorAll('tbody tr')].filter(tr=>tr.style.display!=='none'&&tr.textContent.includes('Sahil Malhotra'));
   const other=[...document.querySelectorAll('#v580OtherRecords .v580-search-row')].filter(row=>row.textContent.includes('Sahil Malhotra'));
   return{checks,eventCount:eventRows.length,otherCount:other.length,hasStudentLink:!!eventRows[0]?.querySelector('.v5811-student-history')};
  });
  assert.ok(studentSearch.checks.every(c=>c.found&&c.view&&c.above),
    'Student name/mobile missing from visible Event search: '+JSON.stringify(studentSearch));
  assert.equal(studentSearch.eventCount+studentSearch.otherCount,1,
    'Sahil appears more than once in Event search: '+JSON.stringify(studentSearch));
  assert.ok(studentSearch.hasStudentLink,
    'Sahil existing student history is not linked to event registration');

  const masterSearch=await run(function(){
   const input=document.getElementById('v36AttendeeSearch');
   const button=document.getElementById('v36FindAttendee');
   const queries=[
     ['student','A','9800000001','A'],
     ['attendee','Attendee Master Lookup QA','9800000002','Attendee Master Lookup QA'],
     ['kriyaban','Kriya Search QA','9822222202','Kriya Search QA'],
     ['volunteer','Ankit Kohli','9876543210','Ankit Kohli'],
     ['vip','VIP Lookup QA','9800000003','VIP Lookup QA'],
     ['acharya','Acharya Lookup QA','9800000004','Acharya Lookup QA']
   ],results=[];
   for(const [kind,name,mobile,expected] of queries){
     for(const [mode,query] of [['name',name],['mobile',mobile]]){
       input.value=query;input.dispatchEvent(new Event('input',{bubbles:true}));
       if(mode==='mobile')button.click();
       const host=document.getElementById('v580OtherRecords');
       const match=[...(host?.querySelectorAll('.v580-search-row')||[])].some(row=>{
         const title=row.querySelector('strong')?.textContent?.trim();
         return title===expected;
       });
       results.push({kind,mode,query,match});
     }
   }
   return results;
  });
  assert.ok(masterSearch.every(row=>row.match),
    'One or more permanent masters not found by name/mobile: '+JSON.stringify(masterSearch));

  const duplicate=await run(function(){
   document.getElementById('v36NewRegistration').click();
   const name=document.getElementById('v36MainName'),mobile=document.getElementById('v36MainMobile');
   name.value='Sahil Malhotra';name.dispatchEvent(new Event('input',{bubbles:true}));
   mobile.value='9812345678';mobile.dispatchEvent(new Event('input',{bubbles:true}));
   const warning=document.getElementById('v80MobileDuplicate')?.textContent||'';
   const before=JSON.parse(localStorage.getItem('annualEventRegistration.v1')).attendees.length;
   document.getElementById('v36RegistrationForm').requestSubmit(document.querySelector('#v36RegistrationForm button[type="submit"][data-mode="register"]'));
   const after=JSON.parse(localStorage.getItem('annualEventRegistration.v1')).attendees.length;
   const link=document.querySelector('#v80MobileDuplicate button');link?.click();
   return {warning,before,after,link:!!link,editType:document.getElementById('v36RegistrationType').value,diagnostic:{name:name.value,phone:mobile.value,hasHotfix:typeof window.ananda580ShowDuplicate==='function',hasScopedStyle:!!document.getElementById('v580NarrowSearchStyle'),warningClass:document.getElementById('v80MobileDuplicate')?.className,formOpen:document.getElementById('v36RegistrationModal')?.classList.contains('open'),activePage:document.querySelector('.page.active')?.id}};
  });
  assert.ok(duplicate.warning.includes('Already Registered')&&duplicate.warning.includes('Ankit Kohli family'),JSON.stringify(duplicate));
  assert.ok(!duplicate.warning.includes('Rahul Malhotra')&&!duplicate.warning.includes('Divya Malhotra'),'Red warning includes unrelated family members');
  assert.equal(duplicate.after,duplicate.before,'Existing Sahil was registered twice');
  assert.ok(duplicate.link&&duplicate.editType==='volunteer-family','Cannot open Sahil original family registration');
  const second=await run(function(){
   document.getElementById('v36CancelRegistration').click();
   document.getElementById('v36NewRegistration').click();
   const n=document.getElementById('v36MainName'),p=document.getElementById('v36MainMobile');
   n.value='Sahil Malhotra';n.dispatchEvent(new Event('input',{bubbles:true}));
   p.value='9822222299';p.dispatchEvent(new Event('input',{bubbles:true}));
   const before=JSON.parse(localStorage.getItem('annualEventRegistration.v1')).attendees.length;
   document.getElementById('v36RegistrationForm').requestSubmit(document.querySelector('#v36RegistrationForm button[type="submit"][data-mode="register"]'));
   const data=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {before,after:data.attendees.length,matching:data.attendees.filter(a=>a.eventId===data.activeEventId&&a.name==='Sahil Malhotra'&&a.mobile==='9822222299').length};
  });
  assert.equal(second.after,second.before+1,'Same name and different personal mobile was wrongly blocked');
  assert.equal(second.matching,1,'New person was not saved as an independent registration');
  const conflict=await run(function(){
   document.getElementById('v36NewRegistration').click();
   const n=document.getElementById('v36MainName'),p=document.getElementById('v36MainMobile');
   n.value='Rahul Malhotra';n.dispatchEvent(new Event('input',{bubbles:true}));
   p.value='9812345678';p.dispatchEvent(new Event('input',{bubbles:true}));
   const warning=document.getElementById('v80MobileDuplicate')?.textContent||'';
   const before=JSON.parse(localStorage.getItem('annualEventRegistration.v1')).attendees.length;
   document.getElementById('v36RegistrationForm').requestSubmit(document.querySelector('#v36RegistrationForm button[type="submit"][data-mode="register"]'));
   return {warning,before,after:JSON.parse(localStorage.getItem('annualEventRegistration.v1')).attendees.length};
  });
  assert.ok(conflict.warning.includes('MOBILE NUMBER ALREADY EXISTS'),'Two different people allowed same personal mobile');
  assert.equal(conflict.after,conflict.before,'Mobile conflict failed to stop registration');
  const lookup=await run(function(){
   document.getElementById('v36CancelRegistration').click();
   const input=document.getElementById('v36AttendeeSearch'),rows=[];
   for(const q of ['Kriya Search QA','9822222202']){
    input.value=q;input.dispatchEvent(new Event('input',{bubbles:true}));
    rows.push({query:q,results:document.getElementById('v580OtherRecords')?.textContent||'',
     view:!!document.querySelector('#v580OtherRecords .v580-view')});
   }
   const sidebar=document.querySelector('aside');
   return {rows,nav:{width:Math.round(sidebar.getBoundingClientRect().width),labels:[...sidebar.querySelectorAll('nav button')].map(b=>b.textContent.trim())}};
  });
  assert.ok(lookup.rows[0].results.includes('Kriya Search QA'),'Kriyaban missing from cross-module name search');
  assert.ok(lookup.rows[1].results.includes('Kriya Search QA'),'Kriyaban missing from cross-module mobile search');
  
  assert.ok(lookup.rows.every(r=>r.view),'Existing-record opening buttons missing');
  assert.deepEqual(lookup.nav,opened.nav,'Frozen sidebar changed');
  fs.mkdirSync('verification',{recursive:true});
  const shot=await call('Page.captureScreenshot',{format:'png',fromSurface:true});
  if(shot?.data)fs.writeFileSync('verification/hotfix-5801-search.png',Buffer.from(shot.data,'base64'));
  console.log('PASS 5.80.1 desktop: household contact, verified event duplicate, same-name second person, phone conflict, unified student/Kriya search and frozen sidebar');
 }finally{
  try{await js('(function(){const value='+JSON.stringify(prior)+',key='+JSON.stringify(key)+';if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);return true})()')}catch(e){console.error('Fixture restore failed',e.message)}
  ws.close();
 }
}
main().catch(err=>{console.error('FAIL 5.80.1 focused Windows QA',err.stack||err);process.exitCode=1});
