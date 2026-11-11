'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 let target;
 for(let i=0;i<70;i++){
   try{const pages=await(await fetch('http://127.0.0.1:9223/json/list')).json();target=pages.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));if(target?.webSocketDebuggerUrl)break}catch{}
   await sleep(500);
 }
 assert.ok(target?.webSocketDebuggerUrl,'Running Electron preview was not found');
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true})});
 let seq=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data)),cb=pending.get(m.id);if(cb){pending.delete(m.id);cb(m)}});
 const call=(method,params={})=>new Promise((r,j)=>{
   const n=++seq,t=setTimeout(()=>{pending.delete(n);j(Error('Timeout '+method))},30000);
   pending.set(n,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)j(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else r(m.result)});
   ws.send(JSON.stringify({id:n,method,params}));
 });
 const js=async exp=>(await call('Runtime.evaluate',{expression:exp,returnByValue:true,awaitPromise:true})).result.value;
 const run=fn=>js('('+fn.toString()+')()');
 await call('Runtime.enable');await call('Page.enable');
 const key='annualEventRegistration.v1',prior=await js('localStorage.getItem('+JSON.stringify(key)+')');
 try{
   await run(function(){
     const key='annualEventRegistration.v1',date='2026-12-17',id='qafrozen',eventId=id+'-event';
     const s=JSON.parse(localStorage.getItem(key)||'{}');
     for(const k of ['events','attendees','familyGroups','kriyabans'])s[k]=Array.isArray(s[k])?s[k].filter(x=>!String(x.id).startsWith(id)):[];
     s.events.push({id:eventId,name:'Frozen layout QA',dates:[date],start:date,end:date,venue:'Test Centre',rules:{badgeAttendee:true,scarfAttendee:true}});
     s.attendees.push(
      {id:id+'-a',eventId,name:'A',mobile:'1234569870',registrationDate:date,checkins:[],source:'counter'},
      {id:id+'-b',eventId,name:'B',mobile:'3215569870',registrationDate:date,checkins:[date],source:'counter'},
      {id:id+'-c',eventId,name:'C',mobile:'3214569705',registrationDate:date,checkins:[],source:'counter'});
     s.kriyabans.push({id:id+'-k1',name:'A',mobile:'1234569870'},{id:id+'-k2',name:'B',mobile:'3215569870'});
     s.familyGroups.push({id:id+'-family',eventId,type:'outside-family',contactName:'Sample Family',mobile:'7412589630',registrationDate:date,expectedGuests:4,members:[{id:id+'-m1',name:'Sample Family',mobile:'7412589630',checkins:[date]},{id:id+'-m2',name:'Family Member A',mobile:'7912589631',checkins:[]},{id:id+'-m3',name:'Family Member B',mobile:'7912589632',checkins:[]},{id:id+'-m4',name:'Family Member C',mobile:'7912589633',checkins:[]}]});
     s.activeEventId=eventId;localStorage.setItem(key,JSON.stringify(s));
   });
   await call('Page.reload',{ignoreCache:true});await sleep(1200);
   const details=await run(function(){
     document.querySelector('aside .nav-btn[data-page="events"]')?.click();
     document.getElementById('p2v510OpenEvent')?.click();
     const search=document.getElementById('v578EventSearch');
     if(search){search.value='Frozen layout QA';search.dispatchEvent(new Event('input',{bubbles:true}))}
     const row=[...document.querySelectorAll('#eventList .p2v510-event-row')].find(r=>r.textContent.includes('Frozen layout QA'));
     row?.querySelector('.v578-open-event')?.click();
     document.querySelector('#eventWorkspace .v36-go[data-page="checkin"]')?.click();
     const panel=document.querySelector('#v36AttendeeUI>.card:nth-child(2)');
     const stat=document.querySelector('#v36AttendeeUI>.stats.three');
     const table=document.querySelector('#v36AttendeeTable table');
     const family=document.querySelector('#v56GroupPlanning .v88-group-row');
     return {page:document.querySelector('.page.active')?.id,title:document.getElementById('pageTitle')?.textContent,
       panelDisplay:panel&&getComputedStyle(panel).display,panelBorder:panel&&getComputedStyle(panel).borderTopWidth,
       statColumns:stat&&getComputedStyle(stat).gridTemplateColumns,tableHeaders:table&&[...table.querySelectorAll('th')].map(th=>th.textContent.trim()),
       family:!!family, familyOpen:!!family&&family.classList.contains('v88-open'),
       search:document.getElementById('v36AttendeeSearch')?.placeholder,
       button:document.getElementById('v36NewRegistration')?.textContent.trim(),
       import:!!document.getElementById('v36ImportGoogle')};
   });
   assert.equal(details.page,'checkin','Event Check-In not opened: '+JSON.stringify(details));
   assert.equal(details.panelDisplay,'grid','Old boxed search layout still displayed');
   assert.equal(details.panelBorder,'0px','Unexpected search card border');
   assert.deepEqual(details.tableHeaders,['ATTENDEE','TYPE','MOBILE','ACTION']);
   assert.ok(details.family&&details.import,'Family or import panel missing');
   assert.equal(details.button,'＋ Add Registration');
   assert.equal(details.search,'Search by name or mobile number');
   await call('Emulation.setDeviceMetricsOverride',{width:1536,height:1024,deviceScaleFactor:1,mobile:false});
   await sleep(450);
   const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   fs.writeFileSync('frozen-checkin-review.png',Buffer.from(shot.data,'base64'));
   console.log('PASS running Electron Check-In layout and screenshot: '+JSON.stringify(details));
 }finally{
   await js(prior===null?'localStorage.removeItem('+JSON.stringify(key)+')':'localStorage.setItem('+JSON.stringify(key)+','+JSON.stringify(prior)+')');
   await call('Page.reload',{ignoreCache:true});ws.close();
 }
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
