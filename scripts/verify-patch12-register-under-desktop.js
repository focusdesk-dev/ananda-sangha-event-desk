'use strict';
const fs=require('fs'),assert=require('node:assert/strict');
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
async function main(){
  let page;
  for(let i=0;i<90;i++){try{
    const pages=await(await fetch('http://127.0.0.1:9223/json/list')).json();
    page=pages.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));
    if(page?.webSocketDebuggerUrl)break;
  }catch{}await sleep(250)}
  assert.ok(page?.webSocketDebuggerUrl,'Ananda Windows app is not available for real UI testing');
  const ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
  let serial=0;const tasks=new Map();
  ws.addEventListener('message',ev=>{const m=JSON.parse(String(ev.data)),cb=tasks.get(m.id);if(cb){tasks.delete(m.id);cb(m)}});
  const cmd=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++serial,t=setTimeout(()=>{tasks.delete(id);reject(Error('Timeout '+method))},45000);
    tasks.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)reject(Error(JSON.stringify(m.error||m.result?.exceptionDetails)));else resolve(m.result)});
    ws.send(JSON.stringify({id,method,params}));
  });
  const js=async expression=>(await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
  const run=fn=>js('('+fn.toString()+')()');
  const key='annualEventRegistration.v1',prior=await js('localStorage.getItem('+JSON.stringify(key)+')');
  let count=0;const pass=x=>console.log('PATCH12 PASS '+(++count)+' '+x);
  try{
    await run(function(){
      const key='annualEventRegistration.v1',s=JSON.parse(localStorage.getItem(key)||'{}');
      const id='qaP12-',date='2026-11-09',eventId=id+'event';
      for(const k of ['events','attendees','familyGroups','volunteers','students','kriyabans',
        'attendeeMaster','volunteerRegistrations','classEnrollments'])
        s[k]=(s[k]||[]).filter(x=>!String(x.id).startsWith(id));
      s.volunteerRosters=s.volunteerRosters||{};s.daily=s.daily||{};
      s.events.push({id:eventId,name:'PATCH12 FAMILY QA',dates:[date],start:date,end:date,venue:'QA',rules:{}});
      s.volunteers.push({id:id+'volunteer',firstName:'Nikhil',lastName:'Register',mobile:'9876234000'});
      s.students.push({id:id+'student',name:'Reena Student',mobile:'9876234001'});
      s.students.push({id:id+'missing',name:'Vivek StudentNoPhone',mobile:''});
      s.kriyabans.push({id:id+'kriyaban',name:'Sonal Kriya',mobile:'9876234002'});
      s.activeEventId=eventId;localStorage.setItem(key,JSON.stringify(s));
    });
    await cmd('Page.reload',{ignoreCache:true});await sleep(1150);
    const open=await run(function(){
      document.querySelector('aside .nav-btn[data-page="events"]')?.click();
      const search=document.getElementById('v6EventSearch');
      search.value='PATCH12 FAMILY QA';search.dispatchEvent(new Event('input',{bubbles:true}));
      document.querySelector('#eventList .v6-open-event[data-id="qaP12-event"]')?.click();
      document.querySelector('#v6EventTabs [data-v6-tab="attendees"]')?.click();
      document.getElementById('v36NewRegistration')?.click();
      const form=document.getElementById('v36RegistrationForm');
      const before=!!document.getElementById('v12FamilyPanel')?.hidden;
      document.querySelector('#v10RegistrationMode [data-v10-mode="family"]')?.click();
      return {patch:window.anandaRegisterUnderPatchVersion,before,
        title:document.getElementById('v36RegistrationTitle')?.textContent,
        tabs:[...document.querySelectorAll('#v6EventTabs .v6-event-tab')].map(x=>x.textContent.trim()),
        sidebar:document.querySelector('aside')?.outerHTML};
    });
    await sleep(130);
    assert.equal(open.patch,'12');assert.equal(open.before,true);
    assert.equal(open.title,'NEW REGISTRATION');
    assert.deepEqual(open.tabs,['EVENT RECORD','VOLUNTEERS','ATTENDEES','BADGE & SCARF']);
    const layout=await run(function(){
      const form=document.getElementById('v36RegistrationForm'),panel=document.getElementById('v12FamilyPanel');
      const visible=n=>!!n&&!n.hidden&&getComputedStyle(n).display!=='none'&&n.getClientRects().length>0;
      const originalDrop=document.getElementById('v48GroupMode')?.closest('.field');
      return {family:form.classList.contains('v12-family-active'),
        registerUnder:panel?.textContent.includes('REGISTER UNDER'),
        oldRegistered:visible(document.getElementById('v11FamilyList')),
        oldDrop:visible(originalDrop),
        oldHead:visible(document.getElementById('v10FamilyHeadRow')),
        oldMembers:visible(document.getElementById('v36FamilyMemberSection')),
        oldNotes:visible(document.getElementById('v36RegistrationNotes')?.closest('.field')),
        rowCount:document.querySelectorAll('#v12MemberRows .v12-member').length,
        buttons:[...panel.querySelectorAll('.v12-footer button')].map(x=>x.textContent.trim()),
        screenshotBase:panel.getBoundingClientRect().width};
    });
    assert.equal(layout.family,true);assert.ok(layout.registerUnder);
    for(const k of ['oldRegistered','oldDrop','oldHead','oldMembers','oldNotes'])assert.equal(layout[k],false,k);
    assert.deepEqual(layout.buttons,['REGISTER ONLY','REGISTER & CHECK IN SELECTED','CANCEL']);
    assert.equal(layout.rowCount,1);
    pass('Minimal New Registration Family tab; no old family search, second dropdown, head or warning text');
    const sidebar=open.sidebar;

    const selectExisting=await run(function(){
      const input=document.getElementById('v12ContactName');
      input.value='Reena';input.dispatchEvent(new Event('input',{bubbles:true}));
      const match=[...document.querySelectorAll('#v12Matches .v12-match')]
        .find(x=>x.textContent.includes('Reena Student'));
      match?.click();
      return {found:!!match,name:document.getElementById('v12ContactName').value,
        phone:document.getElementById('v12ContactPhone').value};
    });
    assert.deepEqual(selectExisting,{found:true,name:'Reena Student',phone:'9876234001'});
    pass('REGISTER UNDER reuses existing student record and automatically fills mobile');

    const registerSelected=await run(function(){
      const first=document.querySelector('#v12MemberRows .v12-member');
      first.querySelector('.v12-rel').value='Mom';
      first.querySelector('.v12-rel').dispatchEvent(new Event('input',{bubbles:true}));
      first.querySelector('.v12-check').checked=true;first.querySelector('.v12-check').dispatchEvent(new Event('change',{bubbles:true}));
      document.getElementById('v12AddMember').click();
      const second=document.querySelectorAll('#v12MemberRows .v12-member')[1];
      second.querySelector('.v12-name').value='Aarav Group';
      second.querySelector('.v12-rel').value='Son';
      second.querySelector('.v12-mobile').value='9876234010';
      second.querySelector('.v12-check').checked=false;
      document.getElementById('v12RegisterSelected').click();
      const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
      const g=s.familyGroups.find(x=>x.eventId==='qaP12-event'&&x.contactName==='Reena Student');
      const rows=s.attendees.filter(x=>x.eventId==='qaP12-event');
      return {groupCount:s.familyGroups.filter(x=>x.eventId==='qaP12-event').length,
        contact:g?.contactName,contactRef:g?.registrationContactRef,people:g?.members?.map(x=>({
          name:x.name,rel:x.relationship,mobile:x.mobile,checkins:x.checkins
        })),standalone:rows.length,masterReena:s.attendeeMaster.filter(x=>x.name==='Reena Student').length,
        masterMom:s.attendeeMaster.filter(x=>/^(mom|mother)$/i.test(x.name)).length,
        masterAarav:s.attendeeMaster.filter(x=>x.name==='Aarav Group').length,
        modalOpen:document.getElementById('v36RegistrationModal').classList.contains('open')};
    });
    assert.equal(registerSelected.groupCount,1);assert.equal(registerSelected.contact,'Reena Student');
    assert.equal(registerSelected.contactRef.kind,'student');assert.equal(registerSelected.contactRef.id,'qaP12-student');
    assert.equal(registerSelected.people.length,2,'Register Under must not count as third attendee');
    assert.deepEqual(registerSelected.people[0].checkins,['2026-11-09']);
    assert.deepEqual(registerSelected.people[1].checkins,[]);
    assert.equal(registerSelected.people[0].name,'');assert.equal(registerSelected.people[0].rel,'Mom');
    assert.equal(registerSelected.standalone,0);
    assert.equal(registerSelected.masterReena,0);assert.equal(registerSelected.masterMom,0);
    assert.equal(registerSelected.masterAarav,1);
    assert.equal(registerSelected.modalOpen,false);
    pass('REGISTER UNDER is contact only; Mom + Aarav count as two, only selected Mom checks in');

    const counts=await run(function(){
      document.querySelector('#v6EventTabs [data-v6-tab="attendees"]')?.click();
      return {registered:Number(document.getElementById('v36AttRegistered')?.textContent),
        checked:Number(document.getElementById('v36AttChecked')?.textContent)};
    });
    assert.equal(counts.registered,2);assert.equal(counts.checked,1);
    pass('Live Attendees counters reflect only two actual members and one check-in');

    const registerOnly=await run(function(){
      document.getElementById('v36NewRegistration').click();
      document.querySelector('#v10RegistrationMode [data-v10-mode="family"]').click();
      const input=document.getElementById('v12ContactName');
      input.value='Nikhil';input.dispatchEvent(new Event('input',{bubbles:true}));
      const match=[...document.querySelectorAll('#v12Matches .v12-match')]
        .find(x=>x.textContent.includes('Nikhil Register'));
      match?.click();
      const member=document.querySelector('#v12MemberRows .v12-member');
      member.querySelector('.v12-name').value='Megha Family';member.querySelector('.v12-rel').value='Daughter';
      member.querySelector('.v12-mobile').value='9876234011';
      member.querySelector('.v12-check').checked=true;
      document.getElementById('v12RegisterOnly').click();
      const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
      const g=s.familyGroups.find(x=>x.eventId==='qaP12-event'&&x.contactName==='Nikhil Register');
      return {found:!!match,g:!!g,people:g?.members?.length,checked:g?.members?.[0]?.checkins||[],
        contactMember:g?.members?.some(x=>x.name==='Nikhil Register'),masterNikhil:s.attendeeMaster.filter(x=>x.name==='Nikhil Register').length};
    });
    assert.ok(registerOnly.found&&registerOnly.g);
    assert.equal(registerOnly.people,1);assert.equal(registerOnly.contactMember,false);
    assert.deepEqual(registerOnly.checked,[]);assert.equal(registerOnly.masterNikhil,0);
    pass('REGISTER ONLY saves a separate family without auto check-in even if checkbox was selected');

    const nameOnly=await run(function(){
      document.getElementById('v36NewRegistration').click();
      document.querySelector('#v10RegistrationMode [data-v10-mode="family"]').click();
      const input=document.getElementById('v12ContactName');
      input.value='Vivek StudentNoPhone';input.dispatchEvent(new Event('input',{bubbles:true}));
      const found=[...document.querySelectorAll('#v12Matches .v12-match')]
        .find(x=>x.textContent.includes('Vivek StudentNoPhone'));
      found?.click();
      document.getElementById('v12ContactPhone').value='9876234012';
      document.getElementById('v12ContactPhone').dispatchEvent(new Event('input',{bubbles:true}));
      const member=document.querySelector('#v12MemberRows .v12-member');
      member.querySelector('.v12-rel').value='Dad';
      document.getElementById('v12RegisterOnly').click();
      const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
      const g=s.familyGroups.find(x=>x.eventId==='qaP12-event'&&x.contactName==='Vivek StudentNoPhone');
      return {found:!!found,contactRef:g?.registrationContactRef,
        memberCount:g?.members?.length,master:s.attendeeMaster.filter(x=>x.name==='Vivek StudentNoPhone').length};
    });
    assert.ok(nameOnly.found);assert.equal(nameOnly.contactRef?.kind,'student');
    assert.equal(nameOnly.contactRef?.id,'qaP12-missing');assert.equal(nameOnly.master,0);
    assert.equal(nameOnly.memberCount,1);
    pass('Contact without saved mobile can be searched, verified and reused without duplicate Master');

    const newContact=await run(function(){
      document.getElementById('v36NewRegistration').click();
      document.querySelector('#v10RegistrationMode [data-v10-mode="family"]').click();
      document.getElementById('v12ContactName').value='Deepak NewContact';
      document.getElementById('v12ContactPhone').value='9876234013';
      const member=document.querySelector('#v12MemberRows .v12-member');
      member.querySelector('.v12-rel').value='Daughter';
      document.getElementById('v12RegisterOnly').click();
      const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
      const g=s.familyGroups.find(x=>x.eventId==='qaP12-event'&&x.contactName==='Deepak NewContact');
      return {g:!!g,masterContact:s.attendeeMaster.filter(x=>x.name==='Deepak NewContact').length,
        people:g?.members?.length,contactAttendee:g?.members?.some(x=>x.name==='Deepak NewContact')};
    });
    assert.ok(newContact.g);assert.equal(newContact.masterContact,1);
    assert.equal(newContact.people,1);assert.equal(newContact.contactAttendee,false);
    pass('New Register Under creates one Permanent Master person without an automatic attendee');

    const duplicate=await run(function(){
      document.getElementById('v36NewRegistration').click();
      document.querySelector('#v10RegistrationMode [data-v10-mode="family"]').click();
      document.getElementById('v12ContactName').value='Deepak NewContact';
      document.getElementById('v12ContactPhone').value='9876234013';
      document.querySelector('#v12MemberRows .v12-rel').value='Son';
      document.getElementById('v12RegisterOnly').click();
      const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
      return {duplicates:s.familyGroups.filter(x=>x.eventId==='qaP12-event'&&x.contactName==='Deepak NewContact').length,
        open:document.getElementById('v36RegistrationModal').classList.contains('open')};
    });
    assert.equal(duplicate.duplicates,1);assert.equal(duplicate.open,true);
    pass('Duplicate registration under same contact/event blocked without altering earlier records');

    const untouched=await run(function(){
      document.getElementById('v36CloseRegistration').click();
      document.querySelector('#v6EventTabs [data-v6-tab="record"]').click();
      document.getElementById('v10SummaryToggle')?.click();
      return {selected:document.querySelectorAll('#v36RecordUI .v68-metric').length,
        sidebar:document.querySelector('aside')?.outerHTML,
        familyOutside:!!document.getElementById('v10FamilyCheckinButton')};
    });
    assert.equal(untouched.selected,12);assert.equal(untouched.familyOutside,false);
    assert.equal(untouched.sidebar.replace(/nav-btn active/g,'nav-btn'),
      sidebar.replace(/nav-btn active/g,'nav-btn'));
    pass('Frozen sidebar and six Expected/Actual Event Record rows remain intact');
    const screenshot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync('patch12-verified-event-record.png',Buffer.from(screenshot.data,'base64'));
    console.log('PATCH12 '+count+' END-TO-END WINDOWS TESTS PASSED');
  }finally{
    await js(prior===null?'localStorage.removeItem('+JSON.stringify(key)+')':
      'localStorage.setItem('+JSON.stringify(key)+','+JSON.stringify(prior)+')');
    await cmd('Page.reload',{ignoreCache:true}).catch(()=>{});ws.close();
  }
}
main().catch(e=>{console.error('PATCH12 FAILED',e.stack||String(e));process.exitCode=1});
