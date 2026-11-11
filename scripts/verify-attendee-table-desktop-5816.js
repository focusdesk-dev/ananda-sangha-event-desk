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
   const id='qa5816',date='2026-12-17',eventId=id+'-event',k='annualEventRegistration.v1';
   const s=JSON.parse(localStorage.getItem(k)||'{}');
   s.events=(s.events||[]).filter(x=>!String(x.id).startsWith(id));
   s.attendees=(s.attendees||[]).filter(x=>!String(x.id).startsWith(id));
   s.kriyabans=(s.kriyabans||[]).filter(x=>!String(x.id).startsWith(id));
   s.events.push({id:eventId,name:'5.81.6 Attendee Table QA',dates:[date],start:date,end:date,venue:'Test Centre',rules:{badgeAttendee:true,scarfAttendee:true}});
   s.attendees.push({id:id+'-a',eventId,name:'KRIYA ATTENDEE QA',mobile:'9810001666',registrationDate:date,checkins:[],source:'counter'},
     {id:id+'-b',eventId,name:'OUTSIDE ATTENDEE QA',mobile:'9810001777',registrationDate:date,checkins:[],source:'counter'});
   s.kriyabans.push({id:id+'-k',name:'KRIYA ATTENDEE QA',mobile:'9810001666'});
   s.activeEventId=eventId;localStorage.setItem(k,JSON.stringify(s));
  });
  await call('Page.reload',{ignoreCache:true});await sleep(1100);
  const initial=await run(function(){
   document.querySelector('aside .nav-btn[data-page="events"]')?.click();
   document.getElementById('p2v510OpenEvent')?.click();
   const f=document.getElementById('v578EventSearch');
   if(f){f.value='5.81.6 Attendee Table QA';f.dispatchEvent(new Event('input',{bubbles:true}))}
   const row=[...document.querySelectorAll('#eventList .p2v510-event-row')].find(r=>r.textContent.includes('5.81.6 Attendee Table QA'));
   row?.querySelector('.v578-open-event')?.click();
   document.querySelector('#eventWorkspace .v36-go[data-page="checkin"]')?.click();
   const t=document.querySelector('#v36AttendeeTable table');
   if(!t)return {error:'No attendee table',active:document.querySelector('.page.active')?.id};
   const a=[...t.querySelectorAll('tbody tr')].find(r=>r.textContent.includes('KRIYA ATTENDEE QA'));
   return {active:document.querySelector('.page.active')?.id,headers:[...t.querySelectorAll('thead th')].map(x=>x.textContent.trim()),cols:[...t.querySelectorAll('tbody tr')].map(r=>r.cells.length),kriyaban:!!a?.querySelector('.v5816-kriyaban-label'),menu:!!a?.querySelector('.v5816-att-menu'),primary:!!a?.querySelector('.v36-att-check'),status:a?.querySelector('.v5816-att-status')?.textContent,accessories:a?.querySelectorAll('.v5816-menu-field select').length,edit:!!a?.querySelector('.v36-att-edit'),delete:!!a?.querySelector('.v36-att-delete'),visibleCategory:!!t.querySelector('tbody tr>td:nth-child(3) .pill.green')};
  });
  assert.equal(initial.active,'checkin','Check-in screen not opened: '+JSON.stringify(initial));
  assert.deepEqual(initial.headers,['ATTENDEE','MOBILE','STATUS','ACTION'],'Repeated category column still visible');
  assert.ok(initial.cols.every(x=>x===4),'Unexpected columns: '+JSON.stringify(initial));
  assert.ok(initial.kriyaban&&initial.menu&&initial.primary&&initial.edit&&initial.delete,'Approved controls absent');
  assert.equal(initial.accessories,2,'Badge/scarf controls lost');
  assert.ok(initial.status.includes('NOT ARRIVED'));assert.equal(initial.visibleCategory,false);
  const arrived=await run(function(){
   const row=[...document.querySelectorAll('#v36AttendeeTable tbody tr')].find(r=>r.textContent.includes('KRIYA ATTENDEE QA'));
   row.querySelector('.v36-att-check').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const r=[...document.querySelectorAll('#v36AttendeeTable tbody tr')].find(x=>x.textContent.includes('KRIYA ATTENDEE QA'));
   return {dates:s.attendees.find(x=>x.id==='qa5816-a').checkins,undo:!!r?.querySelector('.v36-att-undo'),status:r?.querySelector('.v5816-att-status')?.textContent,kriya:!!r?.querySelector('.v5816-kriyaban-label'),toast:document.getElementById('toast')?.textContent};
  });
  assert.ok(arrived.dates.includes('2026-12-17')&&arrived.undo&&arrived.status.includes('CHECKED IN'),'Check-in failed: '+JSON.stringify(arrived));
  assert.ok(arrived.kriya&&arrived.toast.includes('Kriyaban'),'Greeting failed');
  const undone=await run(function(){
   [...document.querySelectorAll('#v36AttendeeTable tbody tr')].find(r=>r.textContent.includes('KRIYA ATTENDEE QA')).querySelector('.v36-att-undo').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {dates:s.attendees.find(x=>x.id==='qa5816-a').checkins,restored:!![...document.querySelectorAll('#v36AttendeeTable tbody tr')].find(r=>r.textContent.includes('KRIYA ATTENDEE QA'))?.querySelector('.v36-att-check')};
  });
  assert.deepEqual(undone.dates,[]);assert.ok(undone.restored);
  console.log('PASS 5.81.6 packaged Windows attendee table: 4 columns, Kriyaban, menu, badge/scarf, check-in and Undo');
 }finally{
  await js(prior===null?'localStorage.removeItem('+JSON.stringify(KEY)+')':'localStorage.setItem('+JSON.stringify(KEY)+','+JSON.stringify(prior)+')');
  await call('Page.reload',{ignoreCache:true});await sleep(400);ws.close();
 }
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
