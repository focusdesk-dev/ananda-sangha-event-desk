'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 let target;
 for(let i=0;i<100;i++){
  try{const pages=await(await fetch('http://127.0.0.1:9223/json/list')).json();
   target=pages.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));
   if(target?.webSocketDebuggerUrl)break;
  }catch{}await sleep(250);
 }
 assert(target?.webSocketDebuggerUrl,'Packaged Windows Ananda app unavailable');
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
 let id=0;const queue=new Map();
 ws.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(queue.has(m.id)){const fn=queue.get(m.id);queue.delete(m.id);fn(m)}});
 const c=(method,params={})=>new Promise((resolve,reject)=>{
  const n=++id,t=setTimeout(()=>{queue.delete(n);reject(Error('Timeout '+method))},40000);
  queue.set(n,msg=>{clearTimeout(t);if(msg.error||msg.result?.exceptionDetails)reject(Error(JSON.stringify(msg.error||msg.result?.exceptionDetails)));else resolve(msg.result)});
  ws.send(JSON.stringify({id:n,method,params}));
 });
 const js=async expression=>(await c('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 const fn=async f=>js('('+f.toString()+')()');
 const key='annualEventRegistration.v1',prior=await js('localStorage.getItem('+JSON.stringify(key)+')');
 try{
  await fn(function(){
   const key='annualEventRegistration.v1',s=JSON.parse(localStorage.getItem(key)||'{}');
   s.events=(s.events||[]).filter(e=>e.id!=='qa-patch144-JND');
   s.events.push({id:'qa-patch144-JND',name:'JND',dates:['2026-11-09'],start:'2026-11-09',
    end:'2026-11-09',venue:'Ananda Centre, Gurgaon',rules:{badgeVolunteer:true,scarfVolunteer:true,badgeAttendee:true,scarfAttendee:true}});
   s.activeEventId='qa-patch144-JND';localStorage.setItem(key,JSON.stringify(s));
  });
  await c('Page.reload',{ignoreCache:true});await sleep(1200);
  const report=await fn(function(){
   document.querySelector('aside .nav-btn[data-page="events"]')?.click();
   const input=document.getElementById('v6EventSearch');
   if(input){input.value='JND';input.dispatchEvent(new Event('input',{bubbles:true}))}
   const view=document.querySelector('#eventList .v6-open-event[data-id="qa-patch144-JND"]');
   if(!view)return {error:'Event VIEW button missing'};
   const aside=(document.querySelector('aside')?.outerHTML||'').replace(/nav-btn active/g,'nav-btn');
   view.click(); // FIRST click — do not press EVENT RECORD tab
   const active=document.querySelector('.page.active')?.id;
   const summary=document.getElementById('v36RecordUI');
   const tab=document.querySelector('#v6EventTabs [data-v6-tab="record"]');
   const nav=document.getElementById('v6EventTabs');
   const before={active,oldLanding:!!document.querySelector('#eventWorkspace.page.active'),
    pageTitle:document.getElementById('pageTitle')?.textContent,
    summaryVisible:!!summary&&getComputedStyle(summary).display!=='none',
    recordPanels:summary?.querySelectorAll('.card').length||0,
    selectedId:JSON.parse(localStorage.getItem('annualEventRegistration.v1')).activeEventId,
    currentTab:document.querySelector('#v6EventTabs .v6-event-tab.active')?.dataset.v6Tab};
   tab?.click(); // The existing approved button, no change to its logic.
   before.samePageAsTab=active===document.querySelector('.page.active')?.id;
   before.sameSummaryAsTab=summary===document.getElementById('v36RecordUI');
   const results=[];
   const cases=[['record','eventRecord'],['volunteers','daily'],['attendees',null],['items','items']];
   for(const [tabName,expectPage] of cases){
    document.querySelector('#v6EventTabs [data-v6-tab="'+tabName+'"]')?.click();
    // Badge print mode intentionally hides the tabs. Return to its normal
    // Badge & Scarf issue screen before checking the approved nav divider.
    if(tabName==='items'&&getComputedStyle(document.getElementById('v6EventTabs')).display==='none'){
      document.getElementById('v6BadgeBack')?.click();
    }
    const page=document.querySelector('.page.active')?.id;
    const top=document.querySelector('.topbar');
    const n=document.getElementById('v6EventTabs');
    const t=getComputedStyle(top),v=getComputedStyle(n);
    results.push({tab:tabName,page,correctPage:expectPage?expectPage===page:['checkin','register'].includes(page),
     topYellow:parseFloat(t.borderBottomWidth)>0&&/rgb\(255, 186, 18\)/.test(t.borderBottomColor),
     topBorderWidth:t.borderBottomWidth,
     navBorderWidth:v.borderBottomWidth,navBorderColor:v.borderBottomColor,
     navVisible:v.display!=='none'});
   }
   return {marker:window.anandaDirectEventSingleDividerVersion,before,results,
    tabs:[...nav.querySelectorAll('button')].map(b=>b.textContent.trim()),
    sidebarSame:aside===(document.querySelector('aside')?.outerHTML||'').replace(/nav-btn active/g,'nav-btn'),
    noNewHeader:!document.getElementById('v143EventContext')&&!document.getElementById('v143EventSection'),
    existingDataPreserved:JSON.parse(localStorage.getItem('annualEventRegistration.v1')).events.some(e=>e.id==='qa-patch144-JND')};
  });
  console.log(JSON.stringify(report,null,2));
  assert(!report.error,report.error);
  assert.equal(report.marker,'14.4');
  assert.equal(report.before.active,'eventRecord','VIEW must directly open the already-correct Event Record page');
  assert.equal(report.before.oldLanding,false,'Old EVENT TASKS landing page must never open');
  assert.equal(report.before.summaryVisible,true,'Approved Event Record summary not present');
  assert.equal(report.before.selectedId,'qa-patch144-JND');
  assert.equal(report.before.currentTab,'record');
  assert.equal(report.before.samePageAsTab,true,'VIEW and Event Record tab must open same page');
  assert.equal(report.before.sameSummaryAsTab,true,'Record UI content must not be replaced');
  assert.equal(report.noNewHeader,true,'The rejected extra event header must not be added');
  assert.deepEqual(report.tabs,['EVENT RECORD','VOLUNTEERS','ATTENDEES','BADGE & SCARF']);
  assert.equal(report.sidebarSame,true);
  assert.equal(report.existingDataPreserved,true);
  assert.equal(report.results.length,4);
  for(const row of report.results){
   assert.equal(row.correctPage,true,'Tab destination changed: '+row.tab);
   assert.equal(row.topBorderWidth,'0px','Extra yellow topbar line still present: '+row.tab);
   assert.equal(row.navBorderWidth,'4px','Only the single yellow line BELOW tabs must remain: '+row.tab);
   assert.match(row.navBorderColor,/rgb\(255, 186, 18\)/,'Navigation divider yellow changed: '+row.tab);
   assert.equal(row.navVisible,true,'Four tab navigation disappeared: '+row.tab);
  }
  await fn(function(){document.querySelector('#v6EventTabs [data-v6-tab="record"]')?.click()});
  const shot=await c('Page.captureScreenshot',{format:'png'});
  fs.mkdirSync('patch14-4-screenshots',{recursive:true});
  fs.writeFileSync('patch14-4-screenshots/JND-direct-Event-Record-single-yellow-line.png',Buffer.from(shot.data,'base64'));
  console.log('PASS actual Windows app: VIEW matches approved tab, one yellow line on all four, sidebar and records untouched');
 }finally{
  const restore=prior===null?'localStorage.removeItem('+JSON.stringify(key)+')':
   'localStorage.setItem('+JSON.stringify(key)+','+JSON.stringify(prior)+')';
  await js(restore).catch(()=>{});
  await c('Page.reload',{ignoreCache:true}).catch(()=>{});
  ws.close();
 }
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
