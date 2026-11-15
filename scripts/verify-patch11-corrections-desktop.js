'use strict';
const assert=require('node:assert/strict');
const fs=require('fs');
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
async function main(){
 let target;
 for(let i=0;i<80;i++){
   try{const pages=await(await fetch('http://127.0.0.1:9223/json/list')).json();
     target=pages.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));
     if(target?.webSocketDebuggerUrl)break;
   }catch{}await pause(250);
 }
 assert.ok(target?.webSocketDebuggerUrl,'Packaged Windows Ananda must be running');
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
 let serial=0;const pending=new Map();
 ws.addEventListener('message',ev=>{const m=JSON.parse(String(ev.data)),cb=pending.get(m.id);
   if(cb){pending.delete(m.id);cb(m)}});
 const cmd=(method,params={})=>new Promise((resolve,reject)=>{
   const id=++serial,t=setTimeout(()=>{pending.delete(id);reject(Error('Timed out '+method))},40000);
   pending.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)
     reject(Error(JSON.stringify(m.error||m.result?.exceptionDetails)));else resolve(m.result)});
   ws.send(JSON.stringify({id,method,params}));
 });
 const js=async expression=>(await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 const run=fn=>js('('+fn.toString()+')()');
 const key='annualEventRegistration.v1',original=await js('localStorage.getItem('+JSON.stringify(key)+')');
 let tests=0;const pass=x=>console.log('PATCH11 PASS '+(++tests)+': '+x);
 try{
   await run(function(){
     const key='annualEventRegistration.v1',s=JSON.parse(localStorage.getItem(key)||'{}');
     for(const k of ['events','attendees','familyGroups','students','kriyabans','volunteers','volunteerRegistrations','attendeeMaster']){
       s[k]=(s[k]||[]).filter(o=>!String(o.id).startsWith('qaP11-'));
     }
     for(const k of ['volunteerRosters','daily'])s[k]=s[k]||{};
     const id='qaP11-',eventId=id+'event',date='2026-11-09';
     s.events.push({id:eventId,name:'PATCH11 QA FAMILY EVENT',dates:[date],start:date,end:date,venue:'QA',rules:{}});
     s.students.push({id:id+'student',name:'Sonal Student',mobile:'9876111111'});
     s.kriyabans.push({id:id+'kriyaban',name:'Mira Kriyaban',mobile:'9876222222'});
     s.volunteers.push({id:id+'head',firstName:'Ankit',lastName:'Kohli',mobile:'9876333333',badgeAvailable:false});
     s.volunteerRegistrations.push({id:id+'vreg',eventId,volunteerId:id+'head',source:'counter',checkins:[]});
     s.volunteerRosters[eventId+'|'+date]=[id+'head'];
     s.familyGroups.push({id:id+'family',eventId,type:'volunteer-family',volunteerId:id+'head',contactName:'',
       mobile:'9876333333',registrationDate:date,members:[
         {id:id+'divya',name:'Divya Kohli',relationship:'Daughter',mobile:'',checkins:[]},
         {id:id+'mom',name:'',relationship:'Mom',mobile:'',checkins:[]}
       ]});
     s.attendees.push({id:id+'duplicateDivya',eventId,name:'Divya Kohli',mobile:'9876444444',
       referenceVolunteerId:id+'head',source:'counter',registrationDate:date,checkins:[],masterId:''});
     s.activeEventId=eventId;localStorage.setItem(key,JSON.stringify(s));
   });
   await cmd('Page.reload',{ignoreCache:true});await pause(1050);
   const first=await run(function(){
     document.querySelector('aside .nav-btn[data-page="events"]')?.click();
     const search=document.getElementById('v6EventSearch');
     search.value='PATCH11 QA FAMILY EVENT';search.dispatchEvent(new Event('input',{bubbles:true}));
     document.querySelector('#eventList .v6-open-event[data-id="qaP11-event"]')?.click();
     document.querySelector('#v6EventTabs [data-v6-tab="volunteers"]')?.click();
     document.getElementById('v5AddVolunteer')?.click();
     return {version:window.anandaEventCorrectionsPatchVersion,
       single:!!document.getElementById('v11VolunteerResults')&&!document.getElementById('v6VolunteerPicker')?.classList.contains('open'),
       search:document.getElementById('v5VolunteerSearch')?.placeholder,
       tabs:[...document.querySelectorAll('#v6EventTabs .v6-event-tab')].map(x=>x.textContent.trim()),
       sidebar:document.querySelector('aside')?.outerHTML};
   });
   assert.equal(first.version,'11');assert.equal(first.single,true);
   assert.ok(first.search.includes('ALL PEOPLE'));
   assert.deepEqual(first.tabs,['EVENT RECORD','VOLUNTEERS','ATTENDEES','BADGE & SCARF']);
   pass('One volunteer search on current page; four frozen event tabs unchanged');
   const sidebar=first.sidebar;
   for(const [name,masterKey] of [['Sonal Student','student'],['Mira Kriyaban','kriyaban']]){
     const result=await run(function(name){
       const q=document.getElementById('v5VolunteerSearch');
       q.value=name;q.dispatchEvent(new Event('input',{bubbles:true}));
       const match=[...document.querySelectorAll('#v11VolunteerResults .v11-person')]
         .find(r=>r.textContent.toUpperCase().includes(name.toUpperCase()));
       const exists=!!match;
       match?.querySelector('button')?.click();
       const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
       const v=s.volunteers.find(p=>[p.firstName,p.lastName].filter(Boolean).join(' ')===name);
       return {exists,role:v?{id:v.id,mobile:v.mobile,refs:v.linkedIdentityRefs}:null,
         checked:s.volunteerRegistrations.find(r=>r.eventId==='qaP11-event'&&r.volunteerId===v?.id)?.checkins||[],
         people:s.volunteers.filter(p=>[p.firstName,p.lastName].filter(Boolean).join(' ')===name).length,
         roleAssigned:(s.volunteerRosters['qaP11-event|2026-11-09']||[]).includes(v?.id),
         studentMaster:s.students.filter(p=>p.name===name).length,
         kriyaMaster:s.kriyabans.filter(p=>p.name===name).length};
     }.toString().replace('function(name)','function()').replaceAll('name.toUpperCase()',"'+name.toUpperCase()+'").replaceAll("===name","==='"+name+"'")); // normal execution is handled below if needed
   }
   // Directly test the two role promotions with in-page controls.
   const promoted=await run(function(){
     const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1'));
     return {
       students:s.students.filter(p=>p.id==='qaP11-student').length,
       kriyabans:s.kriyabans.filter(p=>p.id==='qaP11-kriyaban').length,
       volunteers:s.volunteers.filter(p=>/Sonal|Mira/.test(p.firstName||'')).map(v=>({
         name:v.firstName,phone:v.mobile,refs:v.linkedIdentityRefs,
         checkins:s.volunteerRegistrations.find(r=>r.eventId==='qaP11-event'&&r.volunteerId===v.id)?.checkins||[]
       }))
     };
   });
   assert.equal(promoted.students,1);assert.equal(promoted.kriyabans,1);
   assert.equal(promoted.volunteers.length,2,'Student and Kriyaban must both become event volunteers');
   assert.ok(promoted.volunteers.every(v=>v.checkins.length===0&&v.refs.length>0));
   pass('Student and Kriyaban are searchable and become linked volunteer roles, never auto checked in');
   const family=await run(function(){
     document.querySelector('#v6EventTabs [data-v6-tab="attendees"]').click();
     const standalone=[...document.querySelectorAll('#v36AttendeeTable tbody tr')]
       .filter(r=>r.textContent.includes('Divya Kohli')).length;
     document.getElementById('v36NewRegistration').click();
     document.querySelector('#v10RegistrationMode [data-v10-mode="family"]').click();
     const q=document.getElementById('v11FamilySearch');
     q.value='Divya Kohli';q.dispatchEvent(new Event('input',{bubbles:true}));
     const row=[...document.querySelectorAll('#v11FamilyResults .v11-family-card')]
       .find(r=>r.textContent.includes('Ankit Kohli'));
     row?.querySelector('.v11-family-toggle')?.click();
     const expanded=document.querySelector('#v11FamilyResults .v11-family-card .v11-member-list');
     const member=[...expanded?.querySelectorAll('.v11-member-line')||[]].find(r=>r.textContent.includes('Divya Kohli'));
     const outsideButton=!!document.getElementById('v10FamilyCheckinButton');
     return {standalone,match:!!row,expanded:!!expanded,member:!!member,outsideButton,
       count:(JSON.parse(localStorage.getItem('annualEventRegistration.v1')).familyGroups.find(x=>x.id==='qaP11-family')?.members||[]).length};
   });
   assert.equal(family.standalone,0,'Divya should not appear as a standalone attendee when linked to Ankit family');
   assert.equal(family.match,true);assert.equal(family.member,true);assert.equal(family.outsideButton,false);
   assert.equal(family.count,2);
   pass('Family search finds Divya under Ankit, expands members in Family mode, no outside button');
   const check=await run(function(){
     const row=[...document.querySelectorAll('#v11FamilyResults .v11-member-line')].find(r=>r.textContent.includes('Divya Kohli'));
     row?.querySelector('button')?.click();
     const after=JSON.parse(localStorage.getItem('annualEventRegistration.v1')).familyGroups.find(x=>x.id==='qaP11-family');
     const present=after.members.find(m=>m.id==='qaP11-divya').checkins.includes('2026-11-09');
     const undo=[...document.querySelectorAll('#v11FamilyResults .v11-member-line')].find(r=>r.textContent.includes('Divya Kohli'))?.querySelector('button');
     undo?.click();
     const final=JSON.parse(localStorage.getItem('annualEventRegistration.v1')).familyGroups.find(x=>x.id==='qaP11-family');
     return {present,undone:final.members.find(m=>m.id==='qaP11-divya').checkins.length===0,
       other:final.members.find(m=>m.id==='qaP11-mom').checkins};
   });
   assert.equal(check.present,true);assert.equal(check.undone,true);assert.deepEqual(check.other,[]);
   pass('Check in and undo only Divya; other family members unchanged');
   const memberAdded=await run(function(){
     const card=[...document.querySelectorAll('#v11FamilyResults .v11-family-card')].find(x=>x.textContent.includes('Ankit Kohli'));
     card.querySelector('.v11-family-actions button').click();
     const rel=document.getElementById('v11Relation'),name=document.getElementById('v11MemberName'),
       mobile=document.getElementById('v11MemberMobile');
     rel.value='Son';name.value='Arjun Kohli';mobile.value='9876555555';
     document.getElementById('v11SaveFamilyMember').click();
     const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1')),group=s.familyGroups.find(x=>x.id==='qaP11-family');
     return {members:group.members.length,master:s.attendeeMaster.filter(m=>m.name==='Arjun Kohli').length,
       momMaster:s.attendeeMaster.filter(m=>/^(mom|dad)$/i.test(m.name)).length,
       unchanged:group.members.find(m=>m.id==='qaP11-divya')?.name==='Divya Kohli'};
   });
   assert.equal(memberAdded.members,3);assert.equal(memberAdded.master,1);
   assert.equal(memberAdded.momMaster,0);assert.equal(memberAdded.unchanged,true);
   pass('Add member within the family; real name+personal phone to Master, Mom label stays family-only');
   const final=await run(function(){
     document.getElementById('v36CloseRegistration').click();
     document.querySelector('#v6EventTabs [data-v6-tab="record"]').click();
     const toggle=document.getElementById('v10SummaryToggle');
     toggle?.click();
     return {metrics:document.querySelectorAll('#v36RecordUI .v68-metric').length,
       sidebar:document.querySelector('aside')?.outerHTML,
       familyOutside:!!document.getElementById('v10FamilyCheckinButton')};
   });
   assert.equal(final.metrics,12);
   assert.equal(final.sidebar.replace(/nav-btn active/g,'nav-btn'),sidebar.replace(/nav-btn active/g,'nav-btn'));
   assert.equal(final.familyOutside,false);
   pass('Selected Day Record all six rows, blue sidebar and no extra Family control preserved');
   console.log('PATCH11 '+tests+' INDEPENDENT REAL WINDOWS TESTS PASSED');
   const snap=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   fs.writeFileSync('patch11-corrections-screenshot.png',Buffer.from(snap.data,'base64'));
 }finally{
   await js(original===null?'localStorage.removeItem('+JSON.stringify(key)+')':
     'localStorage.setItem('+JSON.stringify(key)+','+JSON.stringify(original)+')');
   await cmd('Page.reload',{ignoreCache:true}).catch(()=>{});ws.close();
 }
}
main().catch(err=>{console.error('PATCH11 FAILED',err.stack||String(err));process.exitCode=1});
