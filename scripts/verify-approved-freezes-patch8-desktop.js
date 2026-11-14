'use strict';
const assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 let page;for(let i=0;i<80;i++){try{const p=await(await fetch('http://127.0.0.1:9223/json/list')).json();page=p.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));if(page?.webSocketDebuggerUrl)break}catch{}await sleep(300)}
 assert.ok(page?.webSocketDebuggerUrl,'Packaged Ananda Windows desktop is unavailable');
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
 let id=0;const requests=new Map();
 ws.addEventListener('message',ev=>{const m=JSON.parse(String(ev.data)),f=requests.get(m.id);if(f){requests.delete(m.id);f(m)}});
 const c=(method,params={})=>new Promise((ok,bad)=>{
  const n=++id,t=setTimeout(()=>{requests.delete(n);bad(Error('CDP timeout '+method))},35000);
  requests.set(n,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)bad(Error(JSON.stringify(m.error||m.result?.exceptionDetails)));else ok(m.result)});
  ws.send(JSON.stringify({id:n,method,params}));
 });
 const js=async exp=>(await c('Runtime.evaluate',{expression:exp,returnByValue:true,awaitPromise:true})).result.value;
 const fn=async f=>js('('+f.toString()+')()');
 const key='annualEventRegistration.v1',prior=await js('localStorage.getItem('+JSON.stringify(key)+')');
 let checks=0;
 function pass(text){checks++;console.log('PASS PATCH6 CHECK '+checks+'/10 '+text)}
 try{
  // The three QA events must be distinct records. Never modify real user data;
  // restore the original localStorage value after every test, including failures.
  await fn(function(){
   const key='annualEventRegistration.v1',s=JSON.parse(localStorage.getItem(key)||'{}');
   const prefix='qaFreeze6-',names=['events','volunteers','volunteerRegistrations','attendees','familyGroups'];
   for(const name of names)s[name]=(s[name]||[]).filter(x=>!String(x.id).startsWith(prefix));
   s.volunteerRosters=s.volunteerRosters||{};s.daily=s.daily||{};s.badgePrint=s.badgePrint||{};
   for(const part of Object.keys(s.volunteerRosters))if(part.startsWith(prefix))delete s.volunteerRosters[part];
   for(const part of Object.keys(s.daily))if(part.startsWith(prefix))delete s.daily[part];
   for(const part of Object.keys(s.badgePrint))if(part.startsWith(prefix))delete s.badgePrint[part];
   const people=[['nikhil','Nikhil','Ananda','5917534600',true],['sonal','Sonal','Kaur','9811122233',true],
     ['rahul','Rahul','Mehta','9811122244',false],['meera','Meera','Singh','9811122255',false],
     ['amit','Amit','Kumar','9811122266',false]];
   for(const [id,firstName,lastName,mobile,badgeAvailable] of people)s.volunteers.push({
    id:prefix+id,firstName,lastName,mobile,birthday:'1980-01-01',badgeAvailable});
   for(const year of ['2026','2027','2028']){
    const date=year+'-11-09',eventId=prefix+year;
    s.events.push({id:eventId,name:'QA Badge Retreat '+year,dates:[date],start:date,end:date,
      venue:'Ananda Centre, Gurgaon',rules:{badgeVolunteer:true,scarfVolunteer:true,badgeAttendee:true,scarfAttendee:true}});
   }
   const roster=['nikhil','rahul','meera','amit'].map(id=>prefix+id);
   s.volunteerRosters[prefix+'2027|2027-11-09']=roster;
   for(const vol of roster)s.volunteerRegistrations.push({id:prefix+'reg-'+vol,
    eventId:prefix+'2027',volunteerId:vol,source:'counter',checkins:[]});
   s.volunteerRegistrations.push({id:prefix+'reg-2028-nikhil',eventId:prefix+'2028',
    volunteerId:prefix+'nikhil',source:'counter',checkins:[]});
   s.volunteerRosters[prefix+'2028|2028-11-09']=[prefix+'nikhil'];
   // A stale day print checklist must not erase the cross-year master availability.
   s.badgePrint[prefix+'2027|2027-11-09']={printedIds:[],complete:false,masterSeeded:true};
   s.activeEventId=prefix+'2027';
   localStorage.setItem(key,JSON.stringify(s));
  });
  await c('Page.reload',{ignoreCache:true});await sleep(1100);
  const marker=await fn(function(){
    return {version:window.anandaFrozenPatchVersion,previous:window.anandaVolunteerPatchVersion,
      aside:document.querySelector('aside')?.outerHTML||''};
  });
  assert.equal(marker.version,'6');
  assert.equal(marker.previous,'5.4');
  assert.ok(marker.aside.length>200);
  const aside=marker.aside;
  pass('Patch 6 and prior fixes are present in the packaged Windows application');

  const events=await fn(function(){
    document.querySelector('aside .nav-btn[data-page="events"]')?.click();
    const tabs=[...document.querySelectorAll('#v6EventTabs button')];
    const css=getComputedStyle(document.getElementById('v6EventTabs'));
    return {page:document.querySelector('.page.active')?.id,
      tabs:tabs.map(x=>x.textContent.trim()),
      lines:css.borderBottomWidth,display:css.display,
      newEvent:!!document.getElementById('v6NewEvent'),
      table:!!document.querySelector('#eventList .v6-event-table'),
      aside:document.querySelector('aside')?.outerHTML||''};
  });
  assert.equal(events.page,'events');
  assert.deepEqual(events.tabs,['EVENT RECORD','VOLUNTEERS','ATTENDEES','BADGE & SCARF','CHECK-IN']);
  assert.equal(events.lines,'4px');
  assert.equal(events.display,'none');
  assert.equal(events.newEvent,true);
  assert.equal(events.table,true);
  assert.equal(events.aside.replace(/nav-btn active/g,'nav-btn'),aside.replace(/nav-btn active/g,'nav-btn'));
  pass('Approved Freeze 1: five event tabs hidden on event list; original sidebar preserved');

  const search=await fn(function(){
    const input=document.getElementById('v6EventSearch');
    input.value='QA Badge Retreat';input.dispatchEvent(new Event('input',{bubbles:true}));
    const before=document.querySelectorAll('#eventList .v6-open-event').length;
    const filter=document.getElementById('v6EventFilter');
    filter.value='upcoming';filter.dispatchEvent(new Event('change',{bubbles:true}));
    const after=document.querySelectorAll('#eventList .v6-open-event').length;
    return {before,after,buttons:[...document.querySelectorAll('#eventList .v6-open-event')].map(b=>b.dataset.id)};
  });
  assert.equal(search.before,3);
  assert.ok(search.after>=1&&search.after<=3);
  assert.ok(search.buttons.every(id=>id.startsWith('qaFreeze6-')));
  pass('Event Record search and filter work without losing event records');

  const goBadge=await fn(function(){
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    s.activeEventId='qaFreeze6-2027';localStorage.setItem('annualEventRegistration.v1',JSON.stringify(s));
    return true;
  });
  assert.ok(goBadge);
  await c('Page.reload',{ignoreCache:true});await sleep(700);
  const badgePage=await fn(function(){
    document.querySelector('#eventWorkspace .v36-go[data-page="items"]')?.click();
    document.getElementById('v82PrepareBadges')?.click();
    const root=document.getElementById('v6BadgeRoot');
    const counts=[document.getElementById('v6Required')?.textContent,
      document.getElementById('v6Available')?.textContent,
      document.getElementById('v6ToPrint')?.textContent].map(Number);
    const names=[...root.querySelectorAll('tbody tr')].map(r=>r.textContent.trim());
    const out={page:document.querySelector('.page.active')?.id,
      title:document.getElementById('pageTitle')?.textContent,
      badgeVisible:!!root&&getComputedStyle(root).display!=='none',
      counts,names,import:!!root.querySelector('button[id*="Import"],input[type="file"]'),
      print:!!document.getElementById('v6PrintBadges'),export:!!document.getElementById('v6ExportBadges')};
    return out;
  });
  assert.equal(badgePage.page,'items');
  assert.equal(badgePage.title,'BADGE PREPARATION');
  assert.equal(badgePage.badgeVisible,true);
  assert.deepEqual(badgePage.counts,[4,1,3]);
  assert.equal(badgePage.names.length,4);
  assert.ok(badgePage.names.some(n=>n.includes('Nikhil')));
  assert.ok(!badgePage.names.some(n=>n.includes('Sonal')));
  assert.equal(badgePage.import,false);
  assert.equal(badgePage.print&&badgePage.export,true);
  pass('Approved Badge Preparation screenshot structure, correct 4/1/3 counts, PRINT/EXPORT only');

  const filter=await fn(function(){
    document.querySelector('#v6BadgeFilters [data-filter="available"]').click();
    const available=[...document.querySelectorAll('#v6BadgeRoot tbody tr')].map(x=>x.textContent);
    document.querySelector('#v6BadgeFilters [data-filter="print"]').click();
    const pending=[...document.querySelectorAll('#v6BadgeRoot tbody tr')].map(x=>x.textContent);
    document.querySelector('#v6BadgeFilters [data-filter="all"]').click();
    const search=document.getElementById('v6BadgeSearch');
    search.value='rahul';search.dispatchEvent(new Event('input',{bubbles:true}));
    const matched=[...document.querySelectorAll('#v6BadgeRoot tbody tr')].map(x=>x.textContent);
    const q=document.getElementById('v6BadgeSearch');q.value='';q.dispatchEvent(new Event('input',{bubbles:true}));
    return {available,pending,matched};
  });
  assert.equal(filter.available.length,1);
  assert.equal(filter.pending.length,3);
  assert.equal(filter.matched.length,1);
  assert.ok(filter.matched[0].includes('Rahul'));
  pass('ALL/AVAILABLE/TO PRINT and search filters match the approved design');

  const checked=await fn(function(){
    const input=document.querySelector('.v6-badge-check[data-id="qaFreeze6-rahul"]');
    input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    return {master:s.volunteers.find(v=>v.id==='qaFreeze6-rahul')?.badgeAvailable,
      available:Number(document.getElementById('v6Available')?.textContent),
      pending:Number(document.getElementById('v6ToPrint')?.textContent)};
  });
  assert.deepEqual(checked,{master:true,available:2,pending:2});
  pass('Checking a badge updates the permanent Volunteer Master and event totals');

  const reversed=await fn(function(){
    const input=document.querySelector('.v6-badge-check[data-id="qaFreeze6-rahul"]');
    input.checked=false;input.dispatchEvent(new Event('change',{bubbles:true}));
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    return {master:s.volunteers.find(v=>v.id==='qaFreeze6-rahul')?.badgeAvailable,
      available:Number(document.getElementById('v6Available')?.textContent),
      pending:Number(document.getElementById('v6ToPrint')?.textContent)};
  });
  assert.deepEqual(reversed,{master:false,available:1,pending:3});
  pass('Unticking reverses the badge status without deleting registrations');

  const print=await fn(function(){
    document.getElementById('v6PrintBadges').click();
    const modal=document.getElementById('v6PrintConfirm');
    const controls=!!modal&&modal.classList.contains('open')&&!!document.getElementById('v6PrintOpenDialog')&&!!document.getElementById('v6PrintMarkAvailable');
    const originalConfirm=window.confirm;
    try{
      window.confirm=()=>false;
      document.getElementById('v6PrintMarkAvailable').click();
      const first=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
      const unchanged=first.volunteers.filter(v=>['qaFreeze6-rahul','qaFreeze6-meera','qaFreeze6-amit'].includes(v.id)&&!v.badgeAvailable).length;
      window.confirm=()=>true;
      document.getElementById('v6PrintMarkAvailable').click();
      const after=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
      return {controls,unchanged,closed:!modal.classList.contains('open'),
        ready:after.volunteers.filter(v=>['qaFreeze6-nikhil','qaFreeze6-rahul','qaFreeze6-meera','qaFreeze6-amit'].includes(v.id)&&v.badgeAvailable).length,
        counts:[Number(document.getElementById('v6Required').textContent),Number(document.getElementById('v6Available').textContent),Number(document.getElementById('v6ToPrint').textContent)]};
    }finally{window.confirm=originalConfirm}
  });
  assert.equal(print.controls,true);
  assert.equal(print.unchanged,3);
  assert.equal(print.closed,true);
  assert.equal(print.ready,4);
  assert.deepEqual(print.counts,[4,4,0]);
  pass('Printed batch confirmation and cancellation update master only on explicit operator confirmation');

  // Save another event first, then reload; printed badges cannot be lost as
  // the old day's checklist was empty.
  const next=await fn(function(){
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    s.activeEventId='qaFreeze6-2028';localStorage.setItem('annualEventRegistration.v1',JSON.stringify(s));
    return true;
  });
  assert.ok(next);
  await c('Page.reload',{ignoreCache:true});await sleep(700);
  const year=await fn(function(){
    document.querySelector('#eventWorkspace .v36-go[data-page="items"]')?.click();
    document.getElementById('v82PrepareBadges')?.click();
    const names=[...document.querySelectorAll('#v6BadgeRoot tbody tr')].map(r=>r.textContent);
    return {names,required:Number(document.getElementById('v6Required').textContent),
      available:Number(document.getElementById('v6Available').textContent)};
  });
  assert.equal(year.required,1);
  assert.equal(year.available,1);
  assert.equal(year.names.length,1);
  assert.ok(year.names[0].includes('Nikhil'));
  assert.ok(!year.names.join(' ').includes('Sonal'));
  pass('Next-year list shows only registered Nikhil as AVAILABLE and excludes unregistered Sonal');

  const assign=await fn(function(){
    document.querySelector('#v6EventTabs [data-v6-tab="volunteers"]')?.click();
    document.getElementById('v5AddVolunteer')?.click();
    const q=document.getElementById('v6MasterSearch');
    q.value='Meera Singh';q.dispatchEvent(new Event('input',{bubbles:true}));
    const button=document.querySelector('.v6-assign-only[data-id="qaFreeze6-meera"]');
    if(!button)return {found:false,modal:document.getElementById('v6VolunteerPicker')?.classList.contains('open')};
    button.click();
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    return {found:true,master:s.volunteers.filter(v=>v.id==='qaFreeze6-meera').length,
      reg:s.volunteerRegistrations.filter(r=>r.eventId==='qaFreeze6-2028'&&r.volunteerId==='qaFreeze6-meera').length,
      checked:s.volunteerRegistrations.find(r=>r.eventId==='qaFreeze6-2028'&&r.volunteerId==='qaFreeze6-meera')?.checkins||[],
      row:(s.volunteerRosters['qaFreeze6-2028|2028-11-09']||[]).includes('qaFreeze6-meera')};
  });
  assert.deepEqual(assign,{found:true,master:1,reg:1,checked:[],row:true});
  pass('Real Add Volunteer picker saves an existing person in later event without check-in or duplication');

  const checkin=await fn(function(){
    // Use a different year and a person already in the master.
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    s.activeEventId='qaFreeze6-2026';localStorage.setItem('annualEventRegistration.v1',JSON.stringify(s));
    return true;
  });
  assert.ok(checkin);
  await c('Page.reload',{ignoreCache:true});await sleep(700);
  const checkinResult=await fn(function(){
    document.querySelector('#eventWorkspace .v36-go[data-page="daily"]')?.click();
    document.getElementById('v5AddVolunteer')?.click();
    const q=document.getElementById('v6MasterSearch');
    q.value='Nikhil Ananda';q.dispatchEvent(new Event('input',{bubbles:true}));
    const button=document.querySelector('.v6-assign-checkin[data-id="qaFreeze6-nikhil"]');
    if(!button)return {found:false};
    button.click();
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    const registrations=s.volunteerRegistrations.filter(r=>r.volunteerId==='qaFreeze6-nikhil');
    return {found:true,masters:s.volunteers.filter(v=>v.id==='qaFreeze6-nikhil').length,
      count:registrations.length,year2026:registrations.find(r=>r.eventId==='qaFreeze6-2026')?.checkins||[],
      year2027:registrations.find(r=>r.eventId==='qaFreeze6-2027')?.checkins||[],
      badge:s.volunteers.find(v=>v.id==='qaFreeze6-nikhil')?.badgeAvailable};
  });
  assert.equal(checkinResult.found,true);
  assert.equal(checkinResult.masters,1);
  assert.equal(checkinResult.count,3);
  assert.deepEqual(checkinResult.year2026,['2026-11-09']);
  assert.deepEqual(checkinResult.year2027,[]);
  assert.equal(checkinResult.badge,true);
  pass('Save & Check In Today is event-specific and preserves permanent master and prior-year history');

  const approvedLayout=await fn(function(){
    const nav=document.getElementById('v6EventTabs');
    const detail=document.getElementById('v5VolunteerDetail');
    const table=document.getElementById('v5VolunteerTable');
    const extra=table?.querySelector('thead tr > :nth-child(6)');
    const back=document.getElementById('v7BackToEvents');
    return {
      page:document.querySelector('.page.active')?.id,
      tabsVisible:nav&&getComputedStyle(nav).display==='grid',
      detailHidden:!detail||getComputedStyle(detail).display==='none',
      detailsColumnHidden:!extra||getComputedStyle(extra).display==='none',
      backVisible:back&&getComputedStyle(back).display!=='none',
      eventHeader:document.getElementById('pageTitle')?.textContent
    };
  });
  assert.equal(approvedLayout.page,'daily');
  assert.equal(approvedLayout.tabsVisible,true,'Selected event should have five tabs');
  assert.equal(approvedLayout.detailHidden,true,'Details side panel must be removed');
  assert.equal(approvedLayout.detailsColumnHidden,true,'Details column must be removed');
  assert.equal(approvedLayout.backVisible,true,'Back to Events must be shown');
  assert.ok(/QA Badge Retreat|QA/i.test(approvedLayout.eventHeader||''),'Selected event name must be visible');
  pass('Approved Freeze 1 and 2: tabs inside event, no details panel or column, event title and Back to Events');
  
  const reversal=await fn(function(){
    const button=document.querySelector('#v5VolunteerTable .v5-check.checked[data-id="qaFreeze6-nikhil"]');
    if(!button)return {found:false};
    button.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true,detail:2}));
    const data=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    const r=data.volunteerRegistrations.find(r=>r.eventId==='qaFreeze6-2026'&&r.volunteerId==='qaFreeze6-nikhil');
    const fresh=document.querySelector('#v5VolunteerTable .v5-check[data-id="qaFreeze6-nikhil"]');
    return {found:true,checkins:r?.checkins,button:fresh?.textContent?.trim(),
      master:data.volunteers.filter(v=>v.id==='qaFreeze6-nikhil').length,
      badge:data.volunteers.find(v=>v.id==='qaFreeze6-nikhil')?.badgeAvailable};
  });
  assert.equal(reversal.found,true,'Checked-in volunteer must have a reversible status button');
  assert.deepEqual(reversal.checkins,[],'Double-click must remove selected event/day check-in');
  assert.equal(reversal.button,'CHECK IN','Status must change back to CHECK IN');
  assert.equal(reversal.master,1,'Volunteer Master record must not change');
  assert.equal(reversal.badge,true,'Permanent badge availability must not change');
  pass('Double-click checked in reverses accidental attendance and updates button without changing volunteer or badge records');

  const safety=await fn(function(){
    const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
    const before={studentCount:(s.students||[]).length,classCount:(s.classBatches||[]).length,
      oneMaster:s.volunteers.filter(v=>v.id==='qaFreeze6-nikhil').length,
      event2026:s.volunteerRegistrations.filter(r=>r.eventId==='qaFreeze6-2026'&&r.volunteerId==='qaFreeze6-nikhil').length};
    document.querySelector('aside .nav-btn[data-page="classes"]')?.click();
    return {...before,page:document.querySelector('.page.active')?.id,aside:document.querySelector('aside')?.outerHTML};
  });
  assert.equal(safety.oneMaster,1);
  assert.equal(safety.event2026,1);
  assert.equal(safety.page,'classes');
  assert.equal(safety.aside.replace(/nav-btn active/g,'nav-btn'),aside.replace(/nav-btn active/g,'nav-btn'));
  pass('Classes navigation and unchanged blue sidebar; no duplicate permanent volunteers');
  assert.ok(checks>=10,'Fewer than ten independent patch checks passed');
  console.log('PASS PATCH 8 VERIFIED WITH '+checks+' INDEPENDENT UI/DATA CHECKS ON PACKAGED WINDOWS APP');
 }finally{
  if(prior===null)await js('localStorage.removeItem('+JSON.stringify(key)+')');
  else await js('localStorage.setItem('+JSON.stringify(key)+','+JSON.stringify(prior)+')');
  await c('Page.reload',{ignoreCache:true}).catch(()=>{});
  ws.close();
 }
}
main().catch(error=>{console.error('FAIL PATCH6 VERIFIED TESTS: '+(error.stack||error));process.exitCode=1});
