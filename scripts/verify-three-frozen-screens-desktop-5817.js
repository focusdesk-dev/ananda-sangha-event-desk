'use strict';
const assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 let page;const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);
 for(let i=0;i<55;i++){try{const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();page=pages.find(p=>p.type==='page'&&/Ananda|index.html/i.test((p.title||'')+' '+(p.url||'')));if(page?.webSocketDebuggerUrl)break}catch{}await sleep(350)}
 assert.ok(page?.webSocketDebuggerUrl,'Packaged Windows app unavailable');
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true})});
 let id=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data)),fn=pending.get(m.id);if(fn){pending.delete(m.id);fn(m)}});
 const call=(method,params={})=>new Promise((res,rej)=>{const n=++id,t=setTimeout(()=>{pending.delete(n);rej(Error('CDP timeout '+method))},30000);pending.set(n,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)rej(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else res(m.result)});ws.send(JSON.stringify({id:n,method,params}))});
 const js=async exp=>(await call('Runtime.evaluate',{expression:exp,returnByValue:true,awaitPromise:true})).result.value;
 const run=fn=>js('('+fn.toString()+')()');await call('Runtime.enable');
 const KEY='annualEventRegistration.v1',prior=await js('localStorage.getItem('+JSON.stringify(KEY)+')');
 try{
  await run(function(){
   const id='qa5817',date='2026-12-17',eventId=id+'-event',k='annualEventRegistration.v1';
   const s=JSON.parse(localStorage.getItem(k)||'{}');
   s.events=(s.events||[]).filter(x=>!String(x.id).startsWith(id));
   s.attendees=(s.attendees||[]).filter(x=>!String(x.id).startsWith(id));
   s.kriyabans=(s.kriyabans||[]).filter(x=>!String(x.id).startsWith(id));
   s.events.push({id:eventId,name:'5.81.7 Attendee Table QA',dates:[date],start:date,end:date,venue:'Test Centre',rules:{badgeAttendee:true,scarfAttendee:true}});
   s.attendees.push({id:id+'-a',eventId,name:'KRIYA ATTENDEE QA',mobile:'9810001666',registrationDate:date,checkins:[],source:'counter'},
     {id:id+'-b',eventId,name:'OUTSIDE ATTENDEE QA',mobile:'9810001777',registrationDate:date,checkins:[],source:'counter'});
   s.kriyabans.push({id:id+'-k',name:'KRIYA ATTENDEE QA',mobile:'9810001666'},{id:id+'-z',name:'Z',mobile:'7777777777'});
   s.activeEventId=eventId;localStorage.setItem(k,JSON.stringify(s));
  });
  await call('Page.reload',{ignoreCache:true});await sleep(1100);
  const initial=await run(function(){
   document.querySelector('aside .nav-btn[data-page="events"]')?.click();
   document.getElementById('p2v510OpenEvent')?.click();
   const f=document.getElementById('v578EventSearch');
   if(f){f.value='5.81.7 Attendee Table QA';f.dispatchEvent(new Event('input',{bubbles:true}))}
   const row=[...document.querySelectorAll('#eventList .p2v510-event-row')].find(r=>r.textContent.includes('5.81.7 Attendee Table QA'));
   row?.querySelector('.v578-open-event')?.click();
   document.querySelector('#eventWorkspace .v36-go[data-page="checkin"]')?.click();
   const t=document.querySelector('#v36AttendeeTable table');
   if(!t)return {error:'No attendee table',active:document.querySelector('.page.active')?.id};
   const a=[...t.querySelectorAll('tbody tr')].find(r=>r.textContent.includes('KRIYA ATTENDEE QA'));
   return {active:document.querySelector('.page.active')?.id,headers:[...t.querySelectorAll('thead th')].map(x=>x.textContent.trim()),cols:[...t.querySelectorAll('tbody tr')].map(r=>r.cells.length),kriyaban:a?.querySelector('.v5817-type')?.textContent==='KRIYABAN',menu:!!a?.querySelector('.v5816-att-menu'),primary:!!a?.querySelector('.v36-att-check'),status:a?.querySelector('.v5817-arrived')?.textContent||'',accessories:a?.querySelectorAll('.v5816-menu-field select').length,edit:!!a?.querySelector('.v36-att-edit'),delete:!!a?.querySelector('.v36-att-delete'),visibleCategory:!!t.querySelector('tbody tr>td:nth-child(3) .pill.green')};
  });
  assert.equal(initial.active,'checkin','Check-in screen not opened: '+JSON.stringify(initial));
  assert.deepEqual(initial.headers,['ATTENDEE','TYPE','MOBILE','ACTION'],'Repeated category column still visible');
  assert.ok(initial.cols.every(x=>x===4),'Unexpected columns: '+JSON.stringify(initial));
  assert.ok(initial.kriyaban&&initial.menu&&initial.primary&&initial.edit&&initial.delete,'Approved controls absent: '+JSON.stringify(initial));
  assert.equal(initial.accessories,2,'Badge/scarf controls lost');
  assert.equal(initial.status,'');assert.equal(initial.visibleCategory,false);
  const arrived=await run(function(){
   const row=[...document.querySelectorAll('#v36AttendeeTable tbody tr')].find(r=>r.textContent.includes('KRIYA ATTENDEE QA'));
   row.querySelector('.v36-att-check').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const r=[...document.querySelectorAll('#v36AttendeeTable tbody tr')].find(x=>x.textContent.includes('KRIYA ATTENDEE QA'));
   return {dates:s.attendees.find(x=>x.id==='qa5817-a').checkins,undo:!!r?.querySelector('.v36-att-undo'),status:r?.querySelector('.v5817-arrived')?.textContent,kriya:r?.querySelector('.v5817-type')?.textContent==='KRIYABAN',toast:document.getElementById('toast')?.textContent};
  });
  assert.ok(arrived.dates.includes('2026-12-17')&&arrived.undo&&arrived.status.includes('CHECKED IN'),'Check-in failed: '+JSON.stringify(arrived));
  assert.ok(arrived.kriya&&arrived.toast.includes('Kriyaban'),'Greeting failed');
  const undone=await run(function(){
   [...document.querySelectorAll('#v36AttendeeTable tbody tr')].find(r=>r.textContent.includes('KRIYA ATTENDEE QA')).querySelector('.v36-att-undo').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {dates:s.attendees.find(x=>x.id==='qa5817-a').checkins,restored:!![...document.querySelectorAll('#v36AttendeeTable tbody tr')].find(r=>r.textContent.includes('KRIYA ATTENDEE QA'))?.querySelector('.v36-att-check')};
  });
  assert.deepEqual(undone.dates,[]);assert.ok(undone.restored);
  const green=await run(function(){
   document.getElementById('v36NewRegistration').click();
   const a=document.getElementById('v36MainName'),b=document.getElementById('v36MainMobile');
   a.value='Z';a.dispatchEvent(new Event('input',{bubbles:true}));
   b.value='7777777777';b.dispatchEvent(new Event('input',{bubbles:true}));
   return {text:document.getElementById('v5817RegistrationStatus')?.textContent.trim(),
    cls:document.getElementById('v5817RegistrationStatus')?.className,
    notesHidden:getComputedStyle(document.getElementById('v36RegistrationNotes').parentElement).display,
    volunteerHidden:getComputedStyle(document.getElementById('v36VolunteerLinkField')).display,
    allowed:[...document.querySelectorAll('#v36RegistrationForm button[type="submit"][data-mode]')].every(x=>!x.disabled)};
  });
  assert.equal(green.text,'Z — KRIYABAN RECOGNISED','Green Kriyaban banner must display name only');
  assert.ok(green.cls.includes('green')&&green.allowed);
  assert.equal(green.notesHidden,'none');assert.equal(green.volunteerHidden,'none');
  const red=await run(function(){
   const a=document.getElementById('v36MainName'),b=document.getElementById('v36MainMobile');
   a.value='KRIYA ATTENDEE QA';a.dispatchEvent(new Event('input',{bubbles:true}));
   b.value='9810001666';b.dispatchEvent(new Event('input',{bubbles:true}));
   const host=document.getElementById('v5817RegistrationStatus');
   return {text:host?.textContent.trim(),cls:host?.className,open:!!host?.querySelector('button'),
    blocked:[...document.querySelectorAll('#v36RegistrationForm button[type="submit"][data-mode]')].every(x=>x.disabled)};
  });
  assert.ok(red.text.includes('ALREADY REGISTERED')&&red.cls.includes('red')&&red.blocked&&red.open,
    'Red registered warning must outrank green recognition: '+JSON.stringify(red));
  const items=await run(function(){
   document.getElementById('v36CloseRegistration').click();
   document.querySelector('#eventWorkspace .v36-go[data-page="items"]')?.click();
   document.getElementById('v82IssueReturn')?.click();
   document.querySelector('#items .item-filter[data-filter="all"]')?.click();
   const search=document.getElementById('itemSearch');search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));
   const filter=document.getElementById('personTypeFilter');filter.value='all';filter.dispatchEvent(new Event('change',{bubbles:true}));
   const row=[...document.querySelectorAll('#itemTable tbody tr')].find(x=>x.textContent.includes('KRIYA ATTENDEE QA'));
   return {active:document.querySelector('.page.active')?.id,row:!!row,
    badge:!!row?.querySelector('.item-action[data-item="badge"][data-action="issue"]'),
    scarf:!!row?.querySelector('.item-action[data-item="scarf"][data-action="issue"]'),
    lockHidden:!document.getElementById('v51SecurityButton')||getComputedStyle(document.getElementById('v51SecurityButton')).display==='none',
    tableText:document.getElementById('itemTable')?.innerText.slice(0,700),
    eventId:JSON.parse(localStorage.getItem('annualEventRegistration.v1'))?.activeEventId,
    date:document.getElementById('workingDate')?.value,
    badgeDebug:document.getElementById('itemTable')?.dataset.v5817BadgeDebug,
    registered:JSON.parse(localStorage.getItem('annualEventRegistration.v1'))?.attendees?.filter(a=>a.id.startsWith('qa5817')).map(a=>({id:a.id,registrationDate:a.registrationDate,eventId:a.eventId}))};
  });
  assert.equal(items.active,'items');assert.ok(items.row&&items.badge&&items.scarf&&items.lockHidden,
    'Badge counter must show unarrived attendee without Master Lock: '+JSON.stringify(items));
  const issue=await run(function(){
   const locate=()=>[...document.querySelectorAll('#itemTable tbody tr')].find(x=>x.textContent.includes('KRIYA ATTENDEE QA'));
   locate().querySelector('.item-action[data-item="badge"][data-action="issue"]').click();
   const first=JSON.parse(localStorage.getItem('annualEventRegistration.v1')).attendees.find(a=>a.id==='qa5817-a').checkins;
   locate().querySelector('.item-action[data-item="scarf"][data-action="issue"]').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const both=s.attendees.find(a=>a.id==='qa5817-a').checkins;
   const status=locate().querySelector('.item-action[data-item="badge"][data-action="issue"]');
   status.click();
   const back=locate().querySelector('.item-action[data-item="badge"][data-action="return"]');
   const opened=!back.hidden;
   if(opened)back.click();
   const final=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const key='qa5817-event|2026-12-17|attendee|qa5817-a';
   return {first,both,opened,returned:final.allocations[key]?.badgeReturned,
    stillCheckedIn:final.attendees.find(a=>a.id==='qa5817-a').checkins};
  });
  assert.deepEqual(issue.first,['2026-12-17'],'First badge must check attendee in');
  assert.deepEqual(issue.both,['2026-12-17'],'Both items must not duplicate arrival');
  assert.ok(issue.opened&&issue.returned,'Receive back must be accessible without clutter');
  assert.deepEqual(issue.stillCheckedIn,['2026-12-17'],'Returning items must not undo check-in');
  console.log('PASS 5.81.7 packaged Windows attendee table: 4 columns, Kriyaban, menu, badge/scarf, check-in and Undo');
 }finally{
  await js(prior===null?'localStorage.removeItem('+JSON.stringify(KEY)+')':'localStorage.setItem('+JSON.stringify(KEY)+','+JSON.stringify(prior)+')');
  await call('Page.reload',{ignoreCache:true});await sleep(400);ws.close();
 }
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
