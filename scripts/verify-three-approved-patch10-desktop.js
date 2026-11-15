'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
  let target;
  for(let i=0;i<80;i++){try{
    const pages=await(await fetch('http://127.0.0.1:9223/json/list')).json();
    target=pages.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));
    if(target?.webSocketDebuggerUrl)break;
  }catch{}await sleep(250)}
  assert.ok(target?.webSocketDebuggerUrl,'Packaged Ananda Windows app not exposed on debug port');
  const ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
  let n=0;const pending=new Map();
  ws.addEventListener('message',event=>{const m=JSON.parse(String(event.data));const f=pending.get(m.id);if(f){pending.delete(m.id);f(m)}});
  const cmd=(method,params={})=>new Promise((ok,bad)=>{
    const id=++n,t=setTimeout(()=>{pending.delete(id);bad(Error('DevTools timeout '+method))},40000);
    pending.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)bad(Error(JSON.stringify(m.error||m.result?.exceptionDetails)));else ok(m.result)});
    ws.send(JSON.stringify({id,method,params}));
  });
  const evalJS=async expression=>(await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
  const run=fn=>evalJS('('+fn.toString()+')()');
  const key='annualEventRegistration.v1',prior=await evalJS('localStorage.getItem('+JSON.stringify(key)+')');
  let count=0;const pass=s=>console.log('PASS PATCH10 '+(++count)+' '+s);
  try{
    await run(function(){
      const key='annualEventRegistration.v1',s=JSON.parse(localStorage.getItem(key)||'{}'),
        id='qaPatch10-',eventId=id+'event',date='2026-11-09';
      for(const k of ['events','attendees','familyGroups','volunteers','volunteerRegistrations','attendeeMaster']){
        s[k]=(s[k]||[]).filter(o=>!String(o.id).startsWith(id));
      }
      s.allocations=s.allocations||{};s.daily=s.daily||{};s.volunteerRosters=s.volunteerRosters||{};
      s.events.push({id:eventId,name:'PATCH10 QA EVENT',dates:[date],start:date,end:date,venue:'QA',
        rules:{badgeVolunteer:true,scarfVolunteer:true,badgeAttendee:true,scarfAttendee:true}});
      s.volunteers.push(
        {id:id+'nikhil',firstName:'Nikhil',lastName:'Qatester',mobile:'9876000011',badgeAvailable:true},
        {id:id+'ankit',firstName:'Ankit',lastName:'Qatester',mobile:'9876000012',badgeAvailable:false});
      s.volunteerRegistrations.push(
        {id:id+'nikhilreg',eventId,volunteerId:id+'nikhil',checkins:[],source:'counter'},
        {id:id+'ankitreg',eventId,volunteerId:id+'ankit',checkins:[],source:'counter'});
      s.volunteerRosters[eventId+'|'+date]=[id+'nikhil',id+'ankit'];
      s.activeEventId=eventId;localStorage.setItem(key,JSON.stringify(s));
    });
    await cmd('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
    await cmd('Page.reload',{ignoreCache:true});await sleep(1200);
    const first=await run(function(){
      document.querySelector('aside .nav-btn[data-page="events"]')?.click();
      const search=document.getElementById('v6EventSearch');
      search.value='PATCH10 QA EVENT';search.dispatchEvent(new Event('input',{bubbles:true}));
      document.querySelector('#eventList .v6-open-event[data-id="qaPatch10-event"]')?.click();
      document.querySelector('#v6EventTabs [data-v6-tab="attendees"]')?.click();
      document.getElementById('v36NewRegistration')?.click();
      const mode=document.getElementById('v10RegistrationMode');
      const individual=mode?.querySelector('.active')?.dataset.v10Mode;
      mode?.querySelector('[data-v10-mode="family"]')?.click();
      return {version:window.anandaThreeScreensPatchVersion,
        page:document.querySelector('.page.active')?.id,
        individual,family:mode?.querySelector('.active')?.dataset.v10Mode,
        addVisible:!!document.getElementById('v39AddFamilyMember')&&getComputedStyle(document.getElementById('v39AddFamilyMember')).display!=='none',
        header:document.getElementById('v36RegistrationTitle')?.textContent,
        familyModal:document.getElementById('v36RegistrationModal')?.classList.contains('open'),
        sidebar:document.querySelector('aside')?.outerHTML};
    });
    assert.equal(first.version,'10');
    assert.equal(first.individual,'individual');
    assert.equal(first.family,'family');
    assert.ok(first.familyModal&&first.addVisible);
    assert.equal(first.header,'NEW REGISTRATION');
    const frozenSidebar=first.sidebar;
    pass('Individual/Family modes, unchanged NEW REGISTRATION title and Add Member on selected event');

    const selected=await run(function(){
      const name=document.getElementById('v36MainName');
      name.value='Nikhil Qatester';name.dispatchEvent(new Event('input',{bubbles:true}));
      const matches=[...document.querySelectorAll('#v10HeadSuggestions .v10-head-match')];
      const m=matches.find(m=>m.textContent.includes('9876000011'));
      if(m)m.click();
      const rows=[...document.querySelectorAll('#v36FamilyMembers .v36-member-row')];
      return {matches:matches.length,selected:!!m,name:name.value,
        mobile:document.getElementById('v36MainMobile').value,
        type:document.getElementById('v36RegistrationType').value,
        volunteerId:document.getElementById('v36RegistrationVolunteer').value,
        rowCount:rows.length};
    });
    assert.equal(selected.selected,true,'Existing Nikhil must be discoverable');
    assert.equal(selected.mobile,'9876000011','Existing mobile must automatically fill');
    assert.equal(selected.type,'volunteer-family','Existing volunteer must be linked, not duplicated');
    assert.equal(selected.volunteerId,'qaPatch10-nikhil');
    assert.ok(selected.rowCount>=2);
    pass('Existing family head selected from master and mobile auto-filled; no duplicate typing');

    const saved=await run(function(){
      const rows=[...document.querySelectorAll('#v36FamilyMembers .v36-member-row')];
      rows[0].querySelector('.v36-rel').value='Son';
      rows[0].querySelector('.v36-member-name').value='Rahul Qatester';
      rows[0].querySelector('.v36-member-mobile').value='9876000021';
      rows[0].querySelector('.v10-member-check').checked=true;
      rows[1].querySelector('.v36-rel').value='Mom';
      rows[1].querySelector('.v36-member-name').value='';
      rows[1].querySelector('.v36-member-mobile').value='';
      rows[1].querySelector('.v10-member-check').checked=false;
      document.getElementById('v10HeadCheck').checked=true;
      const button=document.querySelector('#v36RegistrationForm button[type="submit"][data-mode="checkin"]');
      document.getElementById('v36RegistrationForm').requestSubmit(button);
      const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
      const group=s.familyGroups.filter(g=>g.eventId==='qaPatch10-event'&&g.volunteerId==='qaPatch10-nikhil');
      return {groupCount:group.length,group:group[0],modalOpen:document.getElementById('v36RegistrationModal').classList.contains('open'),
        newHeader:document.getElementById('v36RegistrationTitle').textContent,
        headChecked:s.volunteerRegistrations.find(r=>r.volunteerId==='qaPatch10-nikhil')?.checkins||[],
        masterRahul:s.attendeeMaster.filter(p=>p.name==='Rahul Qatester').length,
        masterMom:s.attendeeMaster.filter(p=>/^mom$/i.test(p.name)).length};
    });
    assert.equal(saved.groupCount,1,'Nikhil family must be registered separately');
    assert.equal(saved.group?.members?.length,2,'No family member may be dropped');
    assert.deepEqual(saved.headChecked,['2026-11-09'],'Head selected and registered must check in');
    assert.deepEqual(saved.group.members[0].checkins,['2026-11-09'],'Selected son checks in');
    assert.deepEqual(saved.group.members[1].checkins,[],'Unselected Mom must remain unarrived');
    assert.equal(saved.masterRahul,1,'Actual name and personal mobile must enter Master');
    assert.equal(saved.masterMom,0,'Relationship label must never enter Master');
    assert.equal(saved.newHeader,'NEW REGISTRATION');
    pass('Family save, individual arrivals, real named member to Master, Mom stays family-only');

    const next=await run(function(){
      const name=document.getElementById('v36MainName');
      if(!document.getElementById('v36RegistrationModal').classList.contains('open'))document.getElementById('v36NewRegistration').click();
      document.getElementById('v10RegistrationMode').querySelector('[data-v10-mode="family"]').click();
      name.value='Ankit Qatester';name.dispatchEvent(new Event('input',{bubbles:true}));
      const match=[...document.querySelectorAll('#v10HeadSuggestions .v10-head-match')]
        .find(x=>x.textContent.includes('9876000012'));
      match?.click();
      const rows=[...document.querySelectorAll('#v36FamilyMembers .v36-member-row')];
      rows[0].querySelector('.v36-rel').value='Wife';
      rows[0].querySelector('.v36-member-name').value='Sunita Qatester';
      rows[0].querySelector('.v36-member-mobile').value='9876000022';
      document.getElementById('v36RegistrationForm').requestSubmit(
        document.querySelector('#v36RegistrationForm button[type="submit"][data-mode="register"]'));
      const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
      return {selected:!!match,families:s.familyGroups.filter(g=>g.eventId==='qaPatch10-event').map(g=>({
        id:g.id,volunteerId:g.volunteerId,count:g.members.length})),
        noNextText:!document.getElementById('v36RegistrationModal').textContent.includes('NEXT FAMILY REGISTRATION'),
        ownerCount:s.volunteers.filter(v=>v.id==='qaPatch10-nikhil').length,
        familyCheckin:!!document.getElementById('v10FamilyCheckinButton')};
    });
    assert.equal(next.selected,true,'Second family master lookup failed');
    assert.equal(next.families.length,2,'Each saved family must have own record');
    assert.notEqual(next.families[0].id,next.families[1].id);
    assert.deepEqual(next.families.map(g=>g.volunteerId).sort(),['qaPatch10-ankit','qaPatch10-nikhil']);
    assert.equal(next.ownerCount,1);
    assert.ok(next.noNextText&&next.familyCheckin);
    pass('Nikhil and Ankit saved as separate family groups, without a Next Family Registration label');

    const later=await run(function(){
      document.getElementById('v36CloseRegistration')?.click();
      document.getElementById('v10FamilyCheckinButton').click();
      const select=document.getElementById('v10FamilySelect');
      const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
      const group=s.familyGroups.find(g=>g.volunteerId==='qaPatch10-nikhil');
      select.value=group.id;select.dispatchEvent(new Event('change',{bubbles:true}));
      const mom=group.members.find(m=>m.relationship==='Mom');
      const checkbox=document.querySelector('#v10FamilyPeople input[data-member="'+mom.id+'"]');
      if(checkbox){checkbox.checked=true;checkbox.dispatchEvent(new Event('change',{bubbles:true}))}
      document.getElementById('v10CheckSelected').click();
      const updated=JSON.parse(localStorage.getItem('annualEventRegistration.v1')).familyGroups.find(g=>g.id===group.id);
      return {visible:!!checkbox,checkins:updated.members.find(m=>m.id===mom.id)?.checkins||[],
        distinct:updated.members.find(m=>m.relationship==='Son')?.id!==mom.id};
    });
    assert.ok(later.visible&&later.distinct);
    assert.deepEqual(later.checkins,['2026-11-09']);
    pass('Existing family can be opened and an unarrived member independently checked in');

    const record=await run(function(){
      document.querySelector('#v6EventTabs [data-v6-tab="record"]').click();
      const root=document.getElementById('v36RecordUI'),summary=document.getElementById('v10SummaryToggle'),
        detail=root?.querySelector('.v68-record-card');
      const initiallyHidden=detail?.hidden;
      summary?.click();const expanded=!detail?.hidden;
      const rowCount=detail?.querySelectorAll('.v68-record-row').length;
      const metricCount=detail?.querySelectorAll('.v68-metric').length;
      summary?.click();
      return {page:document.querySelector('.page.active')?.id,
        summary:!!summary,initiallyHidden,expanded,
        rowCount,metricCount,collapsed:detail?.hidden,
        exportMenu:!!document.getElementById('v10ExportMenu'),
        sidebar:document.querySelector('aside')?.outerHTML};
    });
    assert.equal(record.page,'eventRecord');
    assert.ok(record.summary&&record.initiallyHidden&&record.expanded&&record.collapsed);
    assert.equal(record.metricCount,12,'All six Expected/Actual comparisons must be retained');
    assert.ok(record.exportMenu);
    assert.equal(record.sidebar.replace(/nav-btn active/g,'nav-btn'),frozenSidebar.replace(/nav-btn active/g,'nav-btn'));
    pass('Event Record summary click toggles all six comparison rows without changing sidebar');

    const badge=await run(function(){
      document.querySelector('#v6EventTabs [data-v6-tab="items"]').click();
      document.getElementById('v82PrepareBadges')?.click();
      const root=document.getElementById('v6BadgeRoot'),
        counter=root?.querySelector('.v6-badge-counter'),
        tools=root?.querySelector('.v6-badge-tools');
      return {visible:root&&getComputedStyle(root).display!=='none',
        flow:counter&&getComputedStyle(counter).flexDirection,
        grid:tools&&getComputedStyle(tools).display,
        available:Number(document.getElementById('v6Available')?.textContent),
        required:Number(document.getElementById('v6Required')?.textContent),
        filteredNames:[...root?.querySelectorAll('tbody tr')||[]].map(x=>x.textContent)};
    });
    assert.ok(badge.visible);
    assert.equal(badge.flow,'row','Badge counters must be compact horizontal');
    assert.equal(badge.grid,'grid','Filters, search and actions should share one toolbar');
    assert.equal(badge.required,2);
    assert.equal(badge.available,1);
    pass('Compact Badge & Scarf, correct event roster, previous-year badge availability');
    const snap=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync('patch10-approved-three-screens-test.png',Buffer.from(snap.data,'base64'));
    assert.ok(count>=7,'Not enough independent patch10 tests');
    console.log('PASS PATCH10 ' + count + ' END-TO-END WINDOWS APP TESTS');
  }finally{
    await evalJS(prior===null?'localStorage.removeItem('+JSON.stringify(key)+')':
      'localStorage.setItem('+JSON.stringify(key)+','+JSON.stringify(prior)+')');
    await cmd('Page.reload',{ignoreCache:true}).catch(()=>{});ws.close();
  }
}
main().catch(e=>{console.error('PATCH10 FAIL',e.stack||String(e));process.exitCode=1});