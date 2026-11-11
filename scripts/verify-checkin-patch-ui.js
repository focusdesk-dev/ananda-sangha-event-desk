'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);
 let page;
 for(let i=0;i<70;i++){
   try{const a=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();page=a.find(p=>p.type==='page'&&/Ananda|index\.html/i.test((p.title||'')+' '+(p.url||'')));if(page?.webSocketDebuggerUrl)break}catch{}
   await sleep(350);
 }
 assert.ok(page?.webSocketDebuggerUrl,'Patched desktop app not available');
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true})});
 let id=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data)),fn=pending.get(m.id);if(fn){pending.delete(m.id);fn(m)}});
 const call=(method,params={})=>new Promise((res,rej)=>{
   const n=++id,t=setTimeout(()=>{pending.delete(n);rej(Error('Timeout '+method))},30000);
   pending.set(n,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)rej(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else res(m.result)});
   ws.send(JSON.stringify({id:n,method,params}));
 });
 const js=async exp=>(await call('Runtime.evaluate',{expression:exp,returnByValue:true,awaitPromise:true})).result.value;
 const run=fn=>js('('+fn.toString()+')()');
 await call('Runtime.enable');await call('Page.enable');
 const key='annualEventRegistration.v1',prior=await js('localStorage.getItem('+JSON.stringify(key)+')');
 try{
  await run(function(){
   const k='annualEventRegistration.v1',id='qapatch5818',date='2026-12-17',eventId=id+'-event';
   const s=JSON.parse(localStorage.getItem(k)||'{}');
   for(const type of ['events','attendees','kriyabans'])s[type]=(s[type]||[]).filter(a=>!String(a.id).startsWith(id));
   s.events.push({id:eventId,name:'Patch No-Accessories QA',dates:[date],start:date,end:date,venue:'Testing',rules:{badgeAttendee:false,scarfAttendee:false}});
   s.attendees.push(
    {id:id+'-a',eventId,name:'PATCH ALPHA',mobile:'9810001666',registrationDate:date,checkins:[date],source:'counter'},
    {id:id+'-b',eventId,name:'PATCH BETA',mobile:'9810001777',registrationDate:date,checkins:[],source:'counter'});
   s.kriyabans.push({id:id+'-k',name:'PATCH ALPHA',mobile:'9810001666'});
   s.activeEventId=eventId;localStorage.setItem(k,JSON.stringify(s));
  });
  await call('Page.reload',{ignoreCache:true});await sleep(1200);
  // Verify the same 1536px desktop canvas as the approved frozen screenshot.
  await call('Emulation.setDeviceMetricsOverride',{width:1536,height:1024,deviceScaleFactor:1,mobile:false});
  await sleep(200);
  const initial=await run(function(){
   document.querySelector('aside .nav-btn[data-page="events"]')?.click();
   document.getElementById('p2v510OpenEvent')?.click();
   const f=document.getElementById('v578EventSearch');
   if(f){f.value='Patch No-Accessories QA';f.dispatchEvent(new Event('input',{bubbles:true}))}
   const event=[...document.querySelectorAll('#eventList .p2v510-event-row')].find(r=>r.textContent.includes('Patch No-Accessories QA'));
   event?.querySelector('.v578-open-event')?.click();
   document.querySelector('#eventWorkspace .v36-go[data-page="checkin"]')?.click();
   const table=document.querySelector('#v36AttendeeTable table');
   if(!table)return {error:'Missing attendee table',page:document.querySelector('.page.active')?.id};
   const tr=[...table.tBodies[0].rows],a=tr.find(r=>r.cells[0].querySelector('.name')?.textContent==='PATCH ALPHA'),b=tr.find(r=>r.cells[0].querySelector('.name')?.textContent==='PATCH BETA');
   // The test event has no family group. Create a temporary heading solely
   // to inspect its actual CSS, without modifying saved family records.
   const familyHost=document.getElementById('v56GroupPlanning');
   const existingFamilyLabel=familyHost?.querySelector(':scope > .card-sub');
   const familyTestLabel=existingFamilyLabel||document.createElement('div');
   if(!existingFamilyLabel){familyTestLabel.className='card-sub';familyHost?.append(familyTestLabel);}
   const familyHeadingFont=getComputedStyle(familyTestLabel,'::after').fontSize;
   if(!existingFamilyLabel)familyTestLabel.remove();
   return {page:document.querySelector('.page.active')?.id,headers:[...table.tHead.rows[0].cells].map(c=>c.textContent.trim()),
    lengths:tr.map(x=>x.cells.length),alphaType:a?.cells[1]?.textContent.trim(),alphaMobile:a?.cells[2]?.textContent.trim(),
    betaMobile:b?.cells[2]?.textContent.trim(),checked:!!a?.querySelector('.v5818-checked'),
    undo:!!a?.querySelector('.v5818-undo'),dotsHidden:!a?.querySelector('.v5816-att-menu')||getComputedStyle(a.querySelector('.v5816-att-menu')).display==='none',
    betaCheck:!!b?.querySelector('.v36-att-check'),counts:[document.getElementById('v36AttRegistered')?.textContent,document.getElementById('v36AttChecked')?.textContent],
    documentOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    tableOverflow:table.scrollWidth-table.clientWidth,
    typography:{
      titleTransform:getComputedStyle(document.getElementById('pageTitle')).textTransform,
      subtitleDisplay:getComputedStyle(document.getElementById('pageSubtitle')).display,
      pageTitle:getComputedStyle(document.getElementById('pageTitle')).fontSize,
      subtitle:getComputedStyle(document.getElementById('pageSubtitle')).fontSize,
      cardLabel:getComputedStyle(document.querySelector('#v36AttendeeUI>.stats.three .stat:nth-child(2) .label')).fontSize,
      cardValue:getComputedStyle(document.getElementById('v36AttChecked')).fontSize,
      search:getComputedStyle(document.getElementById('v36AttendeeSearch')).fontSize,
      familyTitle:familyHeadingFont,
      attendeeName:getComputedStyle(a.querySelector('.name')).fontSize,
      checkedLabel:getComputedStyle(a.querySelector('.v5818-checked')).fontSize,
      tableHeader:getComputedStyle(table.tHead.rows[0].cells[0],'::after').fontSize,
      importTitle:getComputedStyle(document.querySelector('#v36AttendeeUI>.card:nth-child(3) h3')).fontSize
    },
    overhangs:[...document.querySelectorAll('body *')].map(x=>({el:x,rect:x.getBoundingClientRect()}))
      .filter(x=>x.rect.width>0&&x.rect.right>document.documentElement.clientWidth+8)
      .sort((x,y)=>y.rect.right-x.rect.right).slice(0,12)
      .map(x=>({tag:x.el.tagName,id:x.el.id,cls:String(x.el.className||'').slice(0,75),right:Math.round(x.rect.right),width:Math.round(x.rect.width)}))};
  });
  const firstScreenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync('checkin-patch-test.png',Buffer.from(firstScreenshot.data,'base64'));
  assert.equal(initial.page,'checkin','Wrong page '+JSON.stringify(initial));
  assert.deepEqual(initial.headers,['ATTENDEE','TYPE','MOBILE','ACTION']);
  assert.ok(initial.lengths.every(n=>n===4),'Column mismatch: '+JSON.stringify(initial));
  assert.equal(initial.alphaType,'KRIYABAN');
  assert.equal(initial.alphaMobile,'9810001666');assert.equal(initial.betaMobile,'9810001777');
  assert.ok(initial.checked&&initial.undo&&initial.dotsHidden&&initial.betaCheck,'Checked/Undo design failed: '+JSON.stringify(initial));
  assert.ok(initial.documentOverflow<=8&&initial.tableOverflow<=8,'Horizontal overflow: '+JSON.stringify(initial));
  assert.equal(initial.typography.titleTransform,'uppercase','Header is not visually uppercase');
  assert.equal(initial.typography.subtitleDisplay,'none','Unwanted Check-In subtitle is still visible');
  assert.deepEqual(initial.typography,{
    titleTransform:'uppercase',subtitleDisplay:'none',
    pageTitle:'30px',subtitle:'13px',cardLabel:'13px',cardValue:'30px',
    search:'13px',familyTitle:'16px',attendeeName:'14px',checkedLabel:'11px',
    tableHeader:'13px',importTitle:'16px'
  },'Check-In typography must match compact Classes scale');
  const undo=await run(function(){
   const row=[...document.querySelectorAll('#v36AttendeeTable tbody tr')].find(r=>r.cells[0].querySelector('.name')?.textContent==='PATCH ALPHA');
   row.querySelector('.v5818-undo').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const r=[...document.querySelectorAll('#v36AttendeeTable tbody tr')].find(x=>x.cells[0].querySelector('.name')?.textContent==='PATCH ALPHA');
   return {dates:s.attendees.find(a=>a.id==='qapatch5818-a').checkins,check:!!r.querySelector('.v36-att-check'),arrived:document.getElementById('v36AttChecked')?.textContent};
  });
  assert.deepEqual(undo.dates,[],'Undo did not persist');assert.ok(undo.check&&undo.arrived==='0','Counts or action did not reset');
  const check=await run(function(){
   const row=[...document.querySelectorAll('#v36AttendeeTable tbody tr')].find(r=>r.cells[0].querySelector('.name')?.textContent==='PATCH ALPHA');
   row.querySelector('.v36-att-check').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const r=[...document.querySelectorAll('#v36AttendeeTable tbody tr')].find(x=>x.cells[0].querySelector('.name')?.textContent==='PATCH ALPHA');
   return {dates:s.attendees.find(a=>a.id==='qapatch5818-a').checkins,checked:!!r.querySelector('.v5818-checked'),undo:!!r.querySelector('.v5818-undo'),arrived:document.getElementById('v36AttChecked')?.textContent};
  });
  assert.deepEqual(check.dates,['2026-12-17']);assert.ok(check.checked&&check.undo&&check.arrived==='1','Check-in action did not restore');
  const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync('checkin-patch-test.png',Buffer.from(screenshot.data,'base64'));
  console.log('PASS patched 5.81.8 Windows: 4 aligned columns, no badges, green check-in, visible Undo, correct count, no overflow');
 }finally{
  await js(prior===null?'localStorage.removeItem('+JSON.stringify(key)+')':'localStorage.setItem('+JSON.stringify(key)+','+JSON.stringify(prior)+')');
  await call('Page.reload',{ignoreCache:true});ws.close();
 }
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});