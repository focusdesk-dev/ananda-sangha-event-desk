'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),wait=ms=>new Promise(ok=>setTimeout(ok,ms));
async function main(){
 let target;
 for(let i=0;i<90;i++){try{
  const pages=await(await fetch('http://127.0.0.1:9223/json/list')).json();
  target=pages.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));
  if(target?.webSocketDebuggerUrl)break;
 }catch{}await wait(250)}
 assert.ok(target?.webSocketDebuggerUrl,'Packaged Windows Ananda app unavailable');
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
 let seq=0;const pending=new Map();
 ws.addEventListener('message',ev=>{const m=JSON.parse(String(ev.data)),r=pending.get(m.id);if(r){pending.delete(m.id);r(m)}});
 const cmd=(method,params={})=>new Promise((ok,bad)=>{
  const id=++seq,t=setTimeout(()=>{pending.delete(id);bad(Error('Timed out: '+method))},40000);
  pending.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)bad(Error(JSON.stringify(m.error||m.result?.exceptionDetails)));else ok(m.result)});
  ws.send(JSON.stringify({id,method,params}));
 });
 const evaljs=async expression=>(await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 const run=fn=>evaljs('('+fn.toString()+')()');
 const key='annualEventRegistration.v1',prior=await evaljs('localStorage.getItem('+JSON.stringify(key)+')');
 let count=0;const pass=text=>console.log('PATCH14 PASS '+(++count)+' '+text);
 try{
  await run(function(){
   const key='annualEventRegistration.v1',s=JSON.parse(localStorage.getItem(key)||'{}');
   const p='qaP14-',eventId=p+'event',date='2026-11-09';
   for(const k of ['events','attendees','attendeeMaster','familyGroups','volunteers','students',
    'kriyabans','volunteerRegistrations','classEnrollments']){
    s[k]=(s[k]||[]).filter(x=>!String(x.id).startsWith(p));
   }
   s.events.push({id:eventId,name:'PATCH14 EXISTING FAMILY QA',dates:[date],start:date,end:date,venue:'QA',rules:{}});
   s.attendeeMaster.push(
    {id:p+'hridayMaster',name:'HRIDAY',mobile:'9876555500',personalMobile:'9876555500',category:'outside'},
    {id:p+'divyaMaster',name:'DIVYA',mobile:'9876555500',personalMobile:'3333333333',category:'outside'},
    {id:p+'sahilMaster',name:'SAHIL',mobile:'9876555500',personalMobile:'4444444444',category:'outside'},
    {id:p+'indivMaster',name:'DIVYA',mobile:'9999995555',personalMobile:'9999995555',category:'outside'},
    {id:p+'otherMaster',name:'ANOTHER PERSON',mobile:'7777777777',personalMobile:'7777777777',category:'outside'});
   s.attendees.push({id:p+'individualDivya',name:'DIVYA',mobile:'9999995555',
    personalMobile:'9999995555',eventId,masterId:p+'indivMaster',source:'counter',
    registrationDate:date,checkins:[]});
   s.familyGroups.push({
    id:p+'hriday',eventId,type:'outside-family',contactName:'HRIDAY',mobile:'9876555500',
    registrationDate:date,expectedGuests:3,source:'counter',members:[
     {id:p+'head',name:'HRIDAY',mobile:'9876555500',relationship:'Main contact',checkins:[],masterId:p+'hridayMaster'},
     {id:p+'divya',name:'DIVYA',mobile:'3333333333',relationship:'',checkins:[],masterId:p+'divyaMaster'},
     {id:p+'sahil',name:'SAHIL',mobile:'4444444444',relationship:'',checkins:[],masterId:p+'sahilMaster'}]
   });
   s.familyGroups.push({
    id:p+'contactOnly',eventId,type:'outside-family',contactName:'ANKIT CONTACT',
    mobile:'9876555511',registrationLayout:'v12-contact-only',
    registrationDate:date,expectedGuests:2,members:[
     {id:p+'newKiran',name:'KIRAN',relationship:'Wife',mobile:'5555555555',checkins:[]},
     {id:p+'newArjun',name:'ARJUN',relationship:'Son',mobile:'6666666666',checkins:[]}]
   });
   s.activeEventId=eventId;
   localStorage.setItem(key,JSON.stringify(s));
  });
  await cmd('Page.reload',{ignoreCache:true});await wait(1000);
  const start=await run(function(){
   document.querySelector('aside .nav-btn[data-page="events"]')?.click();
   const search=document.getElementById('v6EventSearch');
   search.value='PATCH14 EXISTING FAMILY QA';search.dispatchEvent(new Event('input',{bubbles:true}));
   document.querySelector('#eventList .v6-open-event[data-id="qaP14-event"]')?.click();
   document.querySelector('#v6EventTabs [data-v6-tab="attendees"]')?.click();
   const row=document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"]');
   row?.click();
   const wrap=document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"]')?.closest('.v88-card-wrap');
   const data=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {version:window.anandaExistingFamilyPatchVersion,found:!!wrap,
    name:wrap?.querySelector('.v56-group-name')?.textContent,details:!!wrap?.querySelector('.v88-group-details'),
    rows:[...wrap?.querySelectorAll('.v14-member-line')||[]].map(x=>({id:x.dataset.member,text:x.textContent})),
    action:wrap?.querySelector('.v88-edit-group')?.textContent,
    groups:data.familyGroups.filter(g=>g.eventId==='qaP14-event').length,
    sidebar:document.querySelector('aside')?.outerHTML,
    tabs:[...document.querySelectorAll('#v6EventTabs .v6-event-tab')].map(x=>x.textContent.trim())};
  });
  assert.equal(start.version,'14');assert.equal(start.found,true);
  assert.equal(start.name,'HRIDAY +2');
  assert.equal(start.details,true);
  assert.equal(start.rows.length,2,'Only actual guest rows, not old registration contact');
  assert.deepEqual(start.rows.map(x=>x.id),['qaP14-divya','qaP14-sahil']);
  assert.equal(start.action,'+ ADD MEMBER');
  assert.equal(start.groups,2);
  assert.deepEqual(start.tabs,['EVENT RECORD','VOLUNTEERS','ATTENDEES','BADGE & SCARF']);
  pass('HRIDAY +2 opens exactly Divya/Sahil, with + ADD MEMBER and no failed Save & Register');

  const modern=await run(function(){
   const row=document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-contactOnly"]');
   row?.click();
   const wrap=document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-contactOnly"]')?.closest('.v88-card-wrap');
   return {found:!!wrap,name:wrap?.querySelector('.v56-group-name')?.textContent,
    members:[...wrap?.querySelectorAll('.v14-member-line')||[]].map(x=>x.dataset.member),
    expected:wrap?.querySelector('.v56-count strong')?.textContent};
  });
  assert.ok(modern.found);assert.equal(modern.name,'ANKIT CONTACT +2');
  assert.deepEqual(modern.members,['qaP14-newKiran','qaP14-newArjun']);
  assert.equal(modern.expected,'2');
  pass('Patch12 REGISTER UNDER contact-only families show ALL members, no skipped first attendee');

  const sidebar=start.sidebar;
  const edited=await run(function(){
   const row=document.querySelector('#v56GroupPlanning .v14-member-line[data-member="qaP14-sahil"]');
   const found=!!row;row?.querySelector('button')?.click();
   const editor=document.querySelector('#v56GroupPlanning .v14-editing[data-member="qaP14-sahil"]');
   if(editor){
    editor.querySelector('.v14-name').value='SAHIL CORRECTED';
    editor.querySelector('.v14-relationship').value='Son';
    editor.querySelector('.v14-mobile').value='4444444444';
    editor.querySelector('.v14-member-buttons button')?.click();
   }
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const g=s.familyGroups.find(x=>x.id==='qaP14-hriday');
   const m=g?.members.find(x=>x.id==='qaP14-sahil'),master=s.attendeeMaster.find(x=>x.id==='qaP14-sahilMaster');
   return {found,editor:!!editor,name:m?.name,relationship:m?.relationship,mobile:m?.mobile,
    unchangedId:m?.id,checkins:m?.checkins,
    master:master?.name,groupCount:s.familyGroups.filter(x=>x.eventId==='qaP14-event').length,
    individual:s.attendees.find(x=>x.id==='qaP14-individualDivya')?.mobile};
  });
  assert.ok(edited.found&&edited.editor);
  assert.equal(edited.name,'SAHIL CORRECTED');assert.equal(edited.relationship,'Son');
  assert.equal(edited.mobile,'4444444444');assert.equal(edited.unchangedId,'qaP14-sahil');
  assert.deepEqual(edited.checkins,[]);
  assert.equal(edited.master,'SAHIL CORRECTED');
  assert.equal(edited.individual,'9999995555');assert.equal(edited.groupCount,2);
  pass('EDIT and SAVE correct an existing family member in-place, preserve ID/history and linked Master');

  const add=await run(function(){
   const group=document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"]');
   group?.querySelector('.v88-edit-group')?.click();
   const editor=document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"]')
     ?.closest('.v88-card-wrap')?.querySelector('.v14-add-new');
   if(editor){
    editor.querySelector('.v14-name').value='TARA NEW MEMBER';
    editor.querySelector('.v14-relationship').value='Daughter';
    editor.querySelector('.v14-mobile').value='8888888888';
    editor.querySelector('.v14-member-buttons button')?.click();
   }
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const g=s.familyGroups.find(x=>x.id==='qaP14-hriday');
   const m=g.members.find(x=>x.name==='TARA NEW MEMBER');
   const row=document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"]');
   return {editor:!!editor,count:g.members.length,expected:g.expectedGuests,
    newId:m?.id,checkins:m?.checkins,phone:m?.mobile,relationship:m?.relationship,
    heading:row?.querySelector('.v56-group-name')?.textContent,
    groups:s.familyGroups.filter(g=>g.eventId==='qaP14-event').length,
    masterCount:s.attendeeMaster.filter(p=>p.name==='TARA NEW MEMBER').length,
    unchangedOther:s.familyGroups.find(g=>g.id==='qaP14-contactOnly')?.members.length};
  });
  assert.equal(add.editor,true);assert.equal(add.count,4);assert.equal(add.expected,4);
  assert.ok(add.newId);assert.equal(add.phone,'8888888888');
  assert.equal(add.heading,'HRIDAY +3');
  assert.deepEqual(add.checkins,[]);assert.equal(add.groups,2);
  assert.equal(add.masterCount,1);assert.equal(add.unchangedOther,2);
  pass('Add member attaches ONLY to HRIDAY; one master, no automatic check-in, headcount +3');

  const withoutMobile=await run(function(){
   document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"] .v88-edit-group')?.click();
   const editor=document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"]')
    ?.closest('.v88-card-wrap')?.querySelector('.v14-add-new');
   if(editor){
    editor.querySelector('.v14-name').value='';
    editor.querySelector('.v14-relationship').value='Grandmother';
    editor.querySelector('.v14-mobile').value='';
    editor.querySelector('.v14-member-buttons button')?.click();
   }
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const g=s.familyGroups.find(x=>x.id==='qaP14-hriday');
   return {added:g.members.some(m=>m.relationship==='Grandmother'&&!m.mobile),
    count:g.members.length,masterCreated:s.attendeeMaster.some(p=>p.name==='Grandmother')};
  });
  assert.equal(withoutMobile.added,true);assert.equal(withoutMobile.count,5);
  assert.equal(withoutMobile.masterCreated,false);
  pass('Relationship-only new guest saves safely without personal mobile or duplicate Master person');

  const duplicatePhone=await run(function(){
   document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"] .v88-edit-group')?.click();
   const editor=document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"]')
     ?.closest('.v88-card-wrap')?.querySelector('.v14-add-new');
   editor.querySelector('.v14-name').value='WRONG PERSON';
   editor.querySelector('.v14-relationship').value='Friend';
   editor.querySelector('.v14-mobile').value='3333333333';
   editor.querySelector('.v14-member-buttons button').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {count:s.familyGroups.find(g=>g.id==='qaP14-hriday').members.length,
    alert:editor.querySelector('.v14-error')?.textContent||'',
    editorStillOpen:!!document.querySelector('.v14-add-new')};
  });
  assert.equal(duplicatePhone.count,5);assert.ok(duplicatePhone.alert.includes('mobile'));
  assert.equal(duplicatePhone.editorStillOpen,true);
  pass('Duplicate PERSONAL mobile is blocked within a family, no second member created');

  const cancelled=await run(function(){
   const editor=document.querySelector('.v14-add-new');
   editor?.querySelectorAll('.v14-member-buttons button')[1]?.click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {count:s.familyGroups.find(g=>g.id==='qaP14-hriday').members.length,
    stillOpen:!!document.querySelector('.v14-add-new')};
  });
  assert.equal(cancelled.count,5);assert.equal(cancelled.stillOpen,false);
  pass('CANCEL new member creates no hidden placeholder and discards invalid draft');

  const independentDivyas=await run(function(){
   const divya=document.querySelector('#v56GroupPlanning .v14-member-line[data-member="qaP14-divya"]');
   divya?.querySelector('button')?.click();
   const editor=document.querySelector('.v14-editing[data-member="qaP14-divya"]');
   editor.querySelector('.v14-mobile').value='9999995555';
   editor.querySelector('.v14-member-buttons button').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {family:s.familyGroups.find(g=>g.id==='qaP14-hriday').members.find(m=>m.id==='qaP14-divya').mobile,
    individual:s.attendees.find(a=>a.id==='qaP14-individualDivya').mobile,
    alert:editor.querySelector('.v14-error')?.textContent||'',editorOpen:!!document.querySelector('.v14-editing[data-member="qaP14-divya"]')};
  });
  assert.equal(independentDivyas.family,'3333333333');
  assert.equal(independentDivyas.individual,'9999995555');
  assert.ok(independentDivyas.alert.includes('ALREADY')||independentDivyas.alert.toLowerCase().includes('mobile'));
  assert.equal(independentDivyas.editorOpen,true);
  pass('Divya with different personal numbers stays a distinct individual; conflicting re-assignment blocked');

  const corrected=await run(function(){
   const editor=document.querySelector('.v14-editing[data-member="qaP14-divya"]');
   editor.querySelector('.v14-mobile').value='3333333333';
   editor.querySelector('.v14-relationship').value='Daughter';
   editor.querySelector('.v14-member-buttons button').click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const member=s.familyGroups.find(g=>g.id==='qaP14-hriday').members.find(m=>m.id==='qaP14-divya');
   return {relation:member.relationship,mobile:member.mobile,checkins:member.checkins};
  });
  assert.equal(corrected.relation,'Daughter');assert.equal(corrected.mobile,'3333333333');
  assert.deepEqual(corrected.checkins,[]);
  pass('Saving an existing member’s relationship succeeds without losing their identity');

  const check=await run(function(){
   const row=document.querySelector('.v14-member-line[data-member="qaP14-sahil"]');
   row?.querySelectorAll('.v14-member-buttons button')[2]?.click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const g=s.familyGroups.find(x=>x.id==='qaP14-hriday');
   return {present:g.members.find(x=>x.id==='qaP14-sahil')?.checkins||[],
    other:g.members.find(x=>x.id==='qaP14-divya')?.checkins||[],
    newMember:g.members.find(x=>x.name==='TARA NEW MEMBER')?.checkins||[]};
  });
  assert.deepEqual(check.present,['2026-11-09']);
  assert.deepEqual(check.other,[]);assert.deepEqual(check.newMember,[]);
  pass('Check-in selected SAHIL only, preserving all other family members’ attendance');

  const unsafeDelete=await run(function(){
   const row=document.querySelector('.v14-member-line[data-member="qaP14-sahil"]');
   row?.querySelectorAll('.v14-member-buttons button')[1]?.click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return {kept:s.familyGroups.find(x=>x.id==='qaP14-hriday').members.some(x=>x.id==='qaP14-sahil'),
    checked:s.familyGroups.find(x=>x.id==='qaP14-hriday').members.find(x=>x.id==='qaP14-sahil')?.checkins};
  });
  assert.equal(unsafeDelete.kept,true);assert.deepEqual(unsafeDelete.checked,['2026-11-09']);
  pass('DELETE cannot silently erase a checked-in family member or historical check-in');

  const undo=await run(function(){
   const row=document.querySelector('.v14-member-line[data-member="qaP14-sahil"]');
   row?.querySelectorAll('.v14-member-buttons button')[2]?.click();
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   return s.familyGroups.find(x=>x.id==='qaP14-hriday').members.find(x=>x.id==='qaP14-sahil')?.checkins;
  });
  assert.deepEqual(undo,[]);
  pass('UNDO restores un-checked-in status for selected member only');

  await cmd('Page.reload',{ignoreCache:true});await wait(1000);
  const persisted=await run(function(){
   const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const hr=s.familyGroups.find(x=>x.id==='qaP14-hriday');
   const modern=s.familyGroups.find(x=>x.id==='qaP14-contactOnly');
   return {count:hr.members.length,member:hr.members.find(x=>x.id==='qaP14-sahil')?.name,
    extra:hr.members.some(m=>m.name==='TARA NEW MEMBER'&&m.mobile==='8888888888'),
    hrId:hr.id,modernCount:modern.members.length,
    individual:s.attendees.find(x=>x.id==='qaP14-individualDivya')?.mobile,
    familyDivya:hr.members.find(x=>x.id==='qaP14-divya')?.mobile,
    sidebar:document.querySelector('aside')?.outerHTML};
  });
  assert.equal(persisted.count,5);
  assert.equal(persisted.member,'SAHIL CORRECTED');assert.equal(persisted.extra,true);
  assert.equal(persisted.modernCount,2);assert.equal(persisted.hrId,'qaP14-hriday');
  assert.equal(persisted.individual,'9999995555');assert.equal(persisted.familyDivya,'3333333333');
  assert.equal(persisted.sidebar.replace(/nav-btn active/g,'nav-btn'),
    sidebar.replace(/nav-btn active/g,'nav-btn'));
  pass('All edits survive app reload, family ID stable and frozen blue sidebar unchanged');

  await run(function(){
   document.querySelector('aside .nav-btn[data-page="events"]')?.click();
   document.querySelector('#eventList .v6-open-event[data-id="qaP14-event"]')?.click();
   document.querySelector('#v6EventTabs [data-v6-tab="attendees"]')?.click();
   document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"]')?.click();
  });

  // PATCH14.1 regression: saved family reopened with a working top action.
  const savedFamilyAdd=await run(function(){
   const header=document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"]');
   const wrapper=header?.closest('.v88-card-wrap');
   const add=header?.querySelector('.v14-add-member');
   const saveRegister=[...(header?.querySelectorAll('button')||[])].find(b=>
     /SAVE\s*&\s*REGISTER/i.test(b.textContent||''));
   const beforeCounts=[...(header?.querySelectorAll('.v56-count strong')||[])].map(el=>Number(el.textContent));
   const before=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const group=before.familyGroups.find(g=>g.id==='qaP14-hriday');
   const oldLength=group?.members.length,oldCount=before.familyGroups.filter(g=>g.eventId==='qaP14-event').length;
   if(!add)return {hasAdd:false,headerText:header?.textContent};
   const addBeforeSave=saveRegister?add.nextElementSibling===saveRegister:true;
   add.click();
   // The family list rebuilds its DOM on Add, so inspect the fresh wrapper.
   const fresh=document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"]')?.closest('.v88-card-wrap');
   const editor=fresh?.querySelector('.v14-add-new');
   const first=fresh?.querySelector('.v88-group-details .v14-member-line')===editor;
   const draftCounts=[...(document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"]')?.querySelectorAll('.v56-count strong')||[])].map(el=>Number(el.textContent));
   if(editor){
     editor.querySelector('.v14-name').value='ANOTHER SAVED FAMILY GUEST';
     editor.querySelector('.v14-relationship').value='Aunt';
     editor.querySelector('.v14-mobile').value='6666611111';
     editor.querySelector('.v14-member-buttons button').click();
   }
   const saved=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
   const updated=saved.familyGroups.find(g=>g.id==='qaP14-hriday');
   const latest=document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"]');
   return {hasAdd:true,addBeforeSave,first,draftVisible:!!editor,
     beforeCounts,draftCounts,beforeLength:oldLength,afterLength:updated?.members.length,
     newMember:updated?.members.find(m=>m.name==='ANOTHER SAVED FAMILY GUEST'),
     groupCountBefore:oldCount,groupCountAfter:saved.familyGroups.filter(g=>g.eventId==='qaP14-event').length,
     addStillThere:!!latest?.querySelector('.v14-add-member')};
  });
  assert.equal(savedFamilyAdd.hasAdd,true);
  assert.equal(savedFamilyAdd.addBeforeSave,true,'ADD MEMBER must sit beside SAVE & REGISTER');
  assert.equal(savedFamilyAdd.first,true,'New member row must be first');
  assert.equal(savedFamilyAdd.draftVisible,true);
  assert.deepEqual(savedFamilyAdd.draftCounts,savedFamilyAdd.beforeCounts,'Counts must not change on draft');
  assert.equal(savedFamilyAdd.afterLength,savedFamilyAdd.beforeLength+1);
  assert.equal(savedFamilyAdd.newMember?.relationship,'Aunt');
  assert.equal(savedFamilyAdd.newMember?.mobile,'6666611111');
  assert.deepEqual(savedFamilyAdd.newMember?.checkins,[]);
  assert.equal(savedFamilyAdd.groupCountAfter,savedFamilyAdd.groupCountBefore);
  assert.equal(savedFamilyAdd.addStillThere,true);
  pass('Existing saved family: top ADD MEMBER visible; editor first; same group; draft does not alter counters');

  await cmd('Page.reload',{ignoreCache:true});await wait(1000);
  const reopenedAdd=await run(function(){
    document.querySelector('aside .nav-btn[data-page="events"]')?.click();
    document.querySelector('#eventList .v6-open-event[data-id="qaP14-event"]')?.click();
    document.querySelector('#v6EventTabs [data-v6-tab="attendees"]')?.click();
    const header=document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"]');
    header?.click();
    const group=JSON.parse(localStorage.getItem('annualEventRegistration.v1')).familyGroups.find(g=>g.id==='qaP14-hriday');
    const add=document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"] .v14-add-member');
    add?.click();
    return {count:group.members.length,guest:group.members.some(m=>m.name==='ANOTHER SAVED FAMILY GUEST'),
      addVisible:!!add,
      editor:!!document.querySelector('#v56GroupPlanning .v88-group-row[data-id="qaP14-hriday"]')?.closest('.v88-card-wrap')?.querySelector('.v14-add-new')};
  });
  assert.equal(reopenedAdd.count,6);
  assert.equal(reopenedAdd.guest,true);
  assert.equal(reopenedAdd.addVisible,true);
  assert.equal(reopenedAdd.editor,true);
  pass('After second reload ADD MEMBER remains available and saved family member remains in same registration');

  const img=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync('patch14-existing-family-verified.png',Buffer.from(img.data,'base64'));
  console.log('PATCH14 '+count+' REAL WINDOWS FAMILY TESTS PASSED');
 }finally{
  await evaljs(prior===null?'localStorage.removeItem('+JSON.stringify(key)+')':
   'localStorage.setItem('+JSON.stringify(key)+','+JSON.stringify(prior)+')');
  await cmd('Page.reload',{ignoreCache:true}).catch(()=>{});ws.close();
 }
}
main().catch(e=>{console.error('PATCH14 FAILED',e.stack||String(e));process.exitCode=1});
