'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 let page;
 for(let i=0;i<80;i++){
  try{const all=await(await fetch('http://127.0.0.1:9223/json/list')).json();
   page=all.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));
   if(page?.webSocketDebuggerUrl)break;}catch{}await sleep(300);
 }
 assert(page?.webSocketDebuggerUrl,'Packaged Windows Ananda desktop not detected');
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
 let id=0;const requests=new Map();
 ws.addEventListener('message',event=>{
  const msg=JSON.parse(String(event.data));const handler=requests.get(msg.id);
  if(handler){requests.delete(msg.id);handler(msg)}
 });
 const c=(method,params={})=>new Promise((resolve,reject)=>{
  const n=++id,t=setTimeout(()=>{requests.delete(n);reject(Error('CDP timeout '+method))},35000);
  requests.set(n,msg=>{clearTimeout(t);
   if(msg.error||msg.result?.exceptionDetails)reject(Error(JSON.stringify(msg.error||msg.result?.exceptionDetails)));
   else resolve(msg.result);
  });ws.send(JSON.stringify({id:n,method,params}));
 });
 const js=async expression=>(await c('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 const fn=async f=>js('('+f.toString()+')()');
 const key='annualEventRegistration.v1',prior=await js('localStorage.getItem('+JSON.stringify(key)+')');
 try{
  await fn(function(){
   const k='annualEventRegistration.v1',s=JSON.parse(localStorage.getItem(k)||'{}');
   s.events=(s.events||[]).filter(e=>e.id!=='qa-route-142');
   s.events.push({id:'qa-route-142',name:'QA FROZEN ROUTE 2027',dates:['2027-11-09'],
    start:'2027-11-09',end:'2027-11-09',venue:'Ananda Centre, Gurgaon',
    rules:{badgeVolunteer:true,scarfVolunteer:true,badgeAttendee:true,scarfAttendee:true}});
   s.activeEventId='qa-route-142';localStorage.setItem(k,JSON.stringify(s));
  });
  await c('Page.reload',{ignoreCache:true});await sleep(1300);
  const report=await fn(function(){
   document.querySelector('aside .nav-btn[data-page="events"]')?.click();
   const list=document.querySelector('#eventList .v6-open-event[data-id="qa-route-142"]');
   if(!list)return {error:'Missing event VIEW action'};
   const sidebarBefore=(document.querySelector('aside')?.outerHTML||'').replace(/nav-btn active/g,'nav-btn');
   list.click();
   const active=document.querySelector('.page.active');
   const master=[...document.querySelectorAll('.topbar button')]
     .filter(b=>(b.textContent||'').toUpperCase().includes('MASTER LOCK'));
   const back=document.getElementById('backButton');
   const tabs=[...document.querySelectorAll('#v6EventTabs button')];
   const result={page:active?.id,title:document.getElementById('pageTitle')?.textContent,
    activeRecord:!!document.querySelector('#eventRecord.page.active'),
    oldWorkspaceVisible:!!document.querySelector('#eventWorkspace.page.active'),
    summary:!!document.querySelector('#v36RecordUI'),
    stats:!!document.getElementById('v36WholeEventStats'),
    tabs:tabs.map(b=>b.textContent.trim()),
    backVisible:!!back&&getComputedStyle(back).display!=='none',
    extraBack:!!document.getElementById('v7BackToEvents')&&getComputedStyle(document.getElementById('v7BackToEvents')).display!=='none',
    masterLockVisible:master.some(b=>getComputedStyle(b).display!=='none'),
    sidebarSame:sidebarBefore===(document.querySelector('aside')?.outerHTML||'').replace(/nav-btn active/g,'nav-btn'),
    dataCount:JSON.parse(localStorage.getItem('annualEventRegistration.v1')).events.length};
   document.querySelector('#v6EventTabs [data-v6-tab="volunteers"]')?.click();
   result.volunteerPage=document.querySelector('.page.active')?.id;
   document.querySelector('#v6EventTabs [data-v6-tab="attendees"]')?.click();
   result.attendeePage=document.querySelector('.page.active')?.id;
   document.querySelector('#v6EventTabs [data-v6-tab="items"]')?.click();
   result.badgePage=document.querySelector('.page.active')?.id;
   document.querySelector('#v6EventTabs [data-v6-tab="record"]')?.click();
   result.recordPageAgain=document.querySelector('.page.active')?.id;
   return result;
  });
  console.log(JSON.stringify(report,null,2));
  assert(!report.error,report.error);
  assert.equal(report.page,'eventRecord','VIEW must not open obsolete Event Tasks workspace');
  assert.equal(report.activeRecord,true);
  assert.equal(report.oldWorkspaceVisible,false);
  assert.equal(report.summary&&report.stats,true,'Actual Event Record content must be available');
  assert.equal(report.masterLockVisible,false,'MASTER LOCK must not reappear');
  assert.equal(report.backVisible,true);
  assert.equal(report.extraBack,false,'Do not introduce a second Back control');
  assert.deepEqual(report.tabs,['EVENT RECORD','VOLUNTEERS','ATTENDEES','BADGE & SCARF']);
  assert.equal(report.sidebarSame,true,'Approved left sidebar must not change');
  assert.equal(report.volunteerPage,'daily');
  assert.ok(['checkin','register'].includes(report.attendeePage),'Attendees may use its approved combined registration/check-in screen');
  assert.equal(report.badgePage,'items');
  assert.equal(report.recordPageAgain,'eventRecord');
  await c('Page.captureScreenshot',{format:'png'}).then(result=>{
   fs.mkdirSync('ui-route-artifacts',{recursive:true});
   fs.writeFileSync('ui-route-artifacts/event-record-after-fix.png',Buffer.from(result.data,'base64'));
  });
  console.log('PASS real Windows UI — correct event landing, all four tabs, one back, no old workspace, no master lock, sidebar intact');
 }finally{
  const restore=prior===null?'localStorage.removeItem('+JSON.stringify(key)+')':
   'localStorage.setItem('+JSON.stringify(key)+','+JSON.stringify(prior)+')';
  await js(restore).catch(()=>{});
  await c('Page.reload',{ignoreCache:true}).catch(()=>{});
  ws.close();
 }
}
main().catch(error=>{console.error(error.stack||String(error));process.exitCode=1});
