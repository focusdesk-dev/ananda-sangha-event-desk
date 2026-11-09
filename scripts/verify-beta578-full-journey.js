'use strict';
(function verifyV578Journey(){
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);let page;
 for(let i=0;i<50;i++){
   try{
     const rows=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
     page=rows.find(x=>x.type==='page'&&/Ananda|index.html/i.test((x.title||'')+' '+(x.url||'')));
     if(page?.webSocketDebuggerUrl)break;
   }catch{}
   await sleep(350);
 }
 assert.ok(page?.webSocketDebuggerUrl,'Packaged Windows app unavailable');
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
 let seq=0;const calls=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data)),fn=calls.get(m.id);if(fn){calls.delete(m.id);fn(m)}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{
   const id=++seq,t=setTimeout(()=>{calls.delete(id);reject(Error('CDP timeout '+method))},30000);
   calls.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)reject(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else resolve(m.result)});
   ws.send(JSON.stringify({id,method,params}));
 });
 const js=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 const KEY='annualEventRegistration.v1';
 const previous=await js('localStorage.getItem('+JSON.stringify(KEY)+')');
 const snap=await js(`(()=>{
   const nav=document.querySelector('aside');
   return {nav:[...nav.querySelectorAll('nav button')].map(b=>b.textContent.trim()),width:Math.round(nav.getBoundingClientRect().width),
   background:getComputedStyle(nav).backgroundImage,classes:[...document.querySelectorAll('#classes .p2-home-card')].map(b=>({id:b.id,icon:!!b.querySelector('svg')}))};
 })()`);
 try{
   const seeded=await js(`(()=>{
     const key='annualEventRegistration.v1',s=JSON.parse(localStorage.getItem(key)||'{}'),tag='beta578-qa';
     for(const field of ['events','attendeeMaster','volunteers','vips','acharyas','attendees']){
       s[field]=(s[field]||[]).filter(x=>!String(x.id).startsWith(tag));
     }
     s.attendeeMaster.push({
       id:tag+'-existing',name:'Ishana Recovery QA',mobile:'9876543201',category:'outside',needsReview:true,reviewNotes:'Verify contact recovery',
       originalReferenceType:'',originalReferenceId:''
     });
     s.volunteers.push(
       {id:tag+'-vol1',firstName:'Recovery',lastName:'QA Volunteer',mobile:'9876543202',birthday:'1988-01-01'},
       {id:tag+'-vol2',firstName:'Second',lastName:'Recovery QA',mobile:'9876543202',birthday:'1987-02-02'}
     );
     s.vips.push({id:tag+'-vip',name:'Recovery QA Volunteer',photo:'',category:'Guest',mobile:'9876543204'});
     s.acharyas.push({id:tag+'-acharya',name:'Recovery QA Acharya',mobile:'9876543205',active:false,notes:'Review inactive status'});
     localStorage.setItem(key,JSON.stringify(s));return {eventCount:s.events.length};
   })()`);
   assert.ok(seeded,'QA fixture not created');
   await call('Page.reload',{ignoreCache:true});await sleep(1300);
   const create=await js(`(()=>{
     const nav=id=>document.querySelector('aside .nav-btn[data-page="'+id+'"]')?.click();
     nav('events');
     const landing={visible:document.getElementById('p2v510EventLanding')?.style.display,tiles:[...document.querySelectorAll('#p2v510EventLanding .p2-home-card')].map(b=>({id:b.id,icon:!!b.querySelector('.v578-event-icon svg')})),
       lockHidden:getComputedStyle(document.getElementById('v51SecurityButton')).display==='none',
       header:getComputedStyle(document.querySelector('.topbar')).borderBottomColor};
     document.getElementById('p2v510CreateEvent')?.click();
     const formVisible=document.getElementById('eventForm')?.style.display==='block';
     document.getElementById('eventName').value='Recovery QA Annual Event 2026';
     document.querySelector('.event-date-input').value='2026-12-08';
     document.getElementById('eventVenue').value='Recovery Test Centre';
     document.getElementById('eventForm').requestSubmit(document.getElementById('eventSaveButton'));
     const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1')||'{}');
     return {landing,formVisible,created:s.events.filter(e=>e.name==='Recovery QA Annual Event 2026').length,
       active:document.getElementById('eventWorkspace').classList.contains('active'),
       eventId:s.activeEventId};
   })()`);
   assert.equal(create.landing.tiles.length,2);
   assert.ok(create.landing.tiles.every(x=>x.icon));
   assert.equal(create.landing.lockHidden,true);
   assert.equal(create.landing.header,'rgb(255, 195, 41)');
   assert.equal(create.formVisible,true);
   assert.equal(create.created,1,'Create Event did not save');
   assert.equal(create.active,true,'Event workspace did not open');
   const search=await js(`(()=>{
     document.querySelector('aside .nav-btn[data-page="events"]').click();
     document.getElementById('p2v510OpenEvent').click();
     const input=document.getElementById('v578EventSearch');
     if(!input)return {error:'Missing search input'};
     input.value='Recovery QA Annual Event';input.dispatchEvent(new Event('input',{bubbles:true}));
     const rows=[...document.querySelectorAll('#eventList .p2v510-event-row')].map(x=>x.textContent.trim());
     const buttons=document.querySelectorAll('#eventList .v578-open-event');
     buttons[0]?.click();
     return {rows,opened:document.getElementById('eventWorkspace').classList.contains('active'),buttonCount:buttons.length};
   })()`);
   assert.ok(!search.error,JSON.stringify(search));
   assert.ok(search.rows.some(x=>x.includes('Recovery QA Annual Event 2026')),'Search Event by name failed');
   assert.equal(search.opened,true,'Open Event via search result failed');
   const dup=await js(`(()=>{
     document.querySelector('#eventWorkspace .v36-go[data-page="checkin"]').click();
     document.getElementById('v36NewRegistration')?.click();
     const open=document.getElementById('v36RegistrationModal')?.classList.contains('open');
     const name=document.getElementById('v36MainName'),phone=document.getElementById('v36MainMobile');
     name.value='Different Recovery QA';name.dispatchEvent(new Event('input',{bubbles:true}));
     phone.value='9876543201';phone.dispatchEvent(new Event('input',{bubbles:true}));
     const warning=document.getElementById('v80MobileDuplicate')?.textContent||'';
     const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1')||'{}'),before=s.attendees.length;
     const submit=document.querySelector('#v36RegistrationForm button[type="submit"][data-mode="register"]');
     document.getElementById('v36RegistrationForm').requestSubmit(submit);
     const s2=JSON.parse(localStorage.getItem('annualEventRegistration.v1')||'{}');
     return {open,warning,before,after:s2.attendees.length,stillOpen:document.getElementById('v36RegistrationModal')?.classList.contains('open')};
   })()`);
   assert.equal(dup.open,true,'New registration modal did not open');
   assert.ok(/MOBILE NUMBER ALREADY EXISTS/i.test(dup.warning),'Duplicate mobile warning missing');
   assert.equal(dup.after,dup.before,'Duplicate mobile was allowed to register');
   assert.equal(dup.stillOpen,true,'Duplicate registration must not close modal');
   const reuse=await js(`(()=>{
     const name=document.getElementById('v36MainName'),mobile=document.getElementById('v36MainMobile');
     mobile.value='';mobile.dispatchEvent(new Event('input',{bubbles:true}));
     name.value='Ishana Rec';name.dispatchEvent(new Event('input',{bubbles:true}));
     const suggestions=[...document.querySelectorAll('#v86AttendeeSuggestions .v86-master-suggestion')].map(x=>x.textContent.trim());
     document.querySelector('#v86AttendeeSuggestions .v86-master-suggestion')?.click();
     const box=document.getElementById('v80MobileDuplicate');
     const afterSelect={name:name.value,mobile:mobile.value,warning:box?.textContent||'',severity:box?.className};
     const s=JSON.parse(localStorage.getItem('annualEventRegistration.v1')||'{}'),countBefore=s.attendeeMaster.filter(a=>a.mobile==='9876543201').length;
     const submit=document.querySelector('#v36RegistrationForm button[type="submit"][data-mode="register"]');
     document.getElementById('v36RegistrationForm').requestSubmit(submit);
     const data=JSON.parse(localStorage.getItem('annualEventRegistration.v1')||'{}');
     return {suggestions,afterSelect,countBefore,countAfter:data.attendeeMaster.filter(a=>a.mobile==='9876543201').length,
       eventPeople:data.attendees.filter(x=>x.eventId===data.activeEventId&&x.mobile==='9876543201').length,
       modalOpen:document.getElementById('v36RegistrationModal').classList.contains('open')};
   })()`);
   assert.ok(reuse.suggestions.some(x=>/ISHANA RECOVERY QA/i.test(x)),'Name lookup suggestions missing');
   assert.equal(reuse.afterSelect.mobile,'9876543201','Search selection did not fill existing phone');
   assert.equal(reuse.afterSelect.name,'ISHANA RECOVERY QA','Search selection did not reuse existing name');
   assert.equal(reuse.countAfter,reuse.countBefore,'Existing person was duplicated in master');
   assert.equal(reuse.eventPeople,1,'Using existing person did not register them for this event');
   const master=await js(`(()=>{
     document.querySelector('aside .nav-btn[data-page="permanentRecords"]').click();
     const nav=document.querySelector('aside');
     const before={width:Math.round(nav.getBoundingClientRect().width),background:getComputedStyle(nav).backgroundImage,
       labels:[...nav.querySelectorAll('nav button')].map(b=>b.textContent.trim())};
     document.querySelector('#permanentRecords button[data-go="volunteers"]').click();
     const needsPass=document.getElementById('v51SecurityModal')?.classList.contains('open');
     return {needsPass,before};
   })()`);
   if(master.needsPass){
     await js(`(()=>{
       const password=document.getElementById('v51Password'),confirm=document.getElementById('v51PasswordConfirm');
       password.value='CI-ONLY-test-55';
       if(confirm&&!document.getElementById('v51ConfirmField')?.classList.contains('hidden'))confirm.value='CI-ONLY-test-55';
       document.getElementById('v51SecurityForm').requestSubmit();return true;
     })()`);
     await sleep(600);
   }
   const masters=await js(`(()=>{
     const nav=id=>{
       document.querySelector('aside .nav-btn[data-page="permanentRecords"]').click();
       document.querySelector('#permanentRecords button[data-go="'+id+'"]').click();
     };
     nav('volunteers');
     const search=document.getElementById('volunteerSearch');search.value='Recovery QA';search.dispatchEvent(new Event('input',{bubbles:true}));
     const volunteers={text:document.getElementById('volunteerTable').textContent,dup:document.querySelectorAll('#volunteerTable .v92-duplicate-warning').length};
     nav('attendeeMaster');
     const a=document.getElementById('attendeeMasterSearch');a.value='Verify contact recovery';a.dispatchEvent(new Event('input',{bubbles:true}));
     const attendees={text:document.getElementById('attendeeMasterTable').textContent,rows:document.querySelectorAll('#attendeeMasterTable tbody tr').length};
     nav('vips');
     const vip=document.getElementById('vipSearch');vip.value='Recovery QA Volunteer';vip.dispatchEvent(new Event('input',{bubbles:true}));
     const vips={text:document.getElementById('vipTable').textContent,links:document.querySelectorAll('#vipTable .v578-linked').length};
     nav('acharyas');
     const ach=document.getElementById('p2AcharyaMasterSearch');ach.value='Review inactive status';ach.dispatchEvent(new Event('input',{bubbles:true}));
     const acharyas={text:document.getElementById('p2AcharyaTable').textContent};
     const sidebar=document.querySelector('aside');
     return {volunteers,attendees,vips,acharyas,after:{width:Math.round(sidebar.getBoundingClientRect().width),
       background:getComputedStyle(sidebar).backgroundImage,labels:[...sidebar.querySelectorAll('nav button')].map(b=>b.textContent.trim())}};
   })()`);
   assert.ok(masters.volunteers.dup>=2,'Duplicate warning removed from Volunteer Master');
   assert.ok(masters.attendees.text.includes('Ishana Recovery QA'),'Attendee lookup must search review notes');
   assert.ok(masters.attendees.text.includes('Review: Verify contact recovery'),'Review note lost');
   assert.ok(masters.vips.links>=1,'VIP Volunteer/Attendee link info lost');
   assert.ok(masters.acharyas.text.includes('Inactive'),'Acharya inactive status lost');
   assert.deepEqual(masters.after,master.before,'Frozen blue sidebar changed');
   const classes=await js(`(()=>{
     document.querySelector('aside .nav-btn[data-page="classes"]').click();
     const nav=document.querySelector('aside');
     return {classes:[...document.querySelectorAll('#classes .p2-home-card')].map(b=>({id:b.id,icon:!!b.querySelector('svg')})),
       nav:[...nav.querySelectorAll('nav button')].map(b=>b.textContent.trim()),
       width:Math.round(nav.getBoundingClientRect().width),background:getComputedStyle(nav).backgroundImage};
   })()`);
   assert.deepEqual(classes.classes,snap.classes,'Classes cards were changed');
   assert.deepEqual({nav:classes.nav,width:classes.width,background:classes.background},{nav:snap.nav,width:snap.width,background:snap.background},'Sidebar changed');
   fs.mkdirSync('verification',{recursive:true});
   const png=await call('Page.captureScreenshot',{format:'png',fromSurface:true});
   if(png?.data)fs.writeFileSync('verification/beta578-classes-frozen.png',Buffer.from(png.data,'base64'));
   console.log('PASS Beta 5.78 full journey: Create Event, name search, open Event, duplicate phone rejected, name lookup/reuse, restored volunteer warnings, attendee review search, VIP links, Acharya status and byte-frozen Classes/sidebar',JSON.stringify({create,search,dup,reuse,mastersSummary:{warnings:masters.volunteers.dup,attendeeRows:masters.attendees.rows,vipLinks:masters.vips.links},classCount:classes.classes.length}));
 }finally{
   try{await js('(()=>{const prior='+JSON.stringify(previous)+',key='+JSON.stringify(KEY)+';if(prior===null)localStorage.removeItem(key);else localStorage.setItem(key,prior);return true})()')}catch(e){console.error('QA restore error:',e.message)}
   ws.close();
 }
}
main().catch(e=>{console.error('FAIL Beta 5.78 full journey',e.stack||e);process.exitCode=1});
})();
