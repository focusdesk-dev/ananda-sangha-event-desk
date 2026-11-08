'use strict';
(function checkMastersDesktop(){
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);
 let page;
 for(let n=0;n<50;n++){try{
   const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
   page=pages.find(p=>p.type==='page'&&/index.html|Ananda/i.test((p.title||'')+' '+(p.url||'')));
   if(page?.webSocketDebuggerUrl)break;
 }catch{}await sleep(350)}
 assert.ok(page?.webSocketDebuggerUrl,'Packaged Windows app missing');
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
 let serial=0;const listeners=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data)),f=listeners.get(m.id);if(f){listeners.delete(m.id);f(m)}});
 const call=(method,params={})=>new Promise((ok,bad)=>{
    const id=++serial,t=setTimeout(()=>{listeners.delete(id);bad(Error('CDP timeout '+method))},25000);
    listeners.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)bad(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else ok(m.result)});
    ws.send(JSON.stringify({id,method,params}));
 });
 const run=async expression=>(await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value;
 const KEY='annualEventRegistration.v1';
 const previous=await run('localStorage.getItem('+JSON.stringify(KEY)+')');
 try{
   const seed=await run(`(()=>{
     const key='annualEventRegistration.v1',o=JSON.parse(localStorage.getItem(key)||'{}'),tag='beta575-qa';
     o.students=(o.students||[]).filter(x=>!String(x.id).startsWith(tag));
     o.classBatches=(o.classBatches||[]).filter(x=>!String(x.id).startsWith(tag));
     o.classEnrollments=(o.classEnrollments||[]).filter(x=>!String(x.id).startsWith(tag));
     o.vips=(o.vips||[]).filter(x=>!String(x.id).startsWith(tag));
     o.kriyabans=(o.kriyabans||[]).filter(x=>!String(x.id).startsWith(tag));
     const person={id:tag+'-student',name:'Test Kriya Two 575',mobile:'0123456789'};
     o.students.push(person);
     const courses=[['kriya2','Kriya 2'],['kriya3','Kriya 3'],['kriya4','Kriya 4'],['stt','STT']];
     courses.forEach(([code,name],i)=>{
       const batchId=tag+'-'+code;
       o.classBatches.push({id:batchId,name:'QA '+name,courseId:'course-'+code,level:name,start:'2026-01-01',end:'2026-02-01',endedAt:'2026-02-01',status:'Completed',sessionDates:['2026-01-01']});
       o.classEnrollments.push({id:tag+'-en-'+code,studentId:person.id,batchId,outcome:'Completed',level:name,completionDate:'2026-02-01',attendance:{'2026-01-01':true}});
     });
     o.classBatches.push({id:tag+'-active',name:'QA Active',courseId:'course-kriya2',level:'Kriya 2',start:'2026-07-01',sessionDates:['2026-07-01']});
     o.classEnrollments.push({id:tag+'-active-en',studentId:tag+'-unfinished',personName:'Not Final 575',batchId:tag+'-active',outcome:'Completed'});
     o.vips.push({id:tag+'-vip',name:'Photo VIP 575',mobile:'9988776600',category:'Speaker',photo:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/GykAAAAASUVORK5CYII='});
     o.kriyabans.push({id:tag+'-kriya',name:'Kriyaban Test 575',mobile:'9988776611',notes:'Linked from completed Kriya course',kriyaDate:'2026-03-08'});
     localStorage.setItem(key,JSON.stringify(o));return true;
   })()`);
   assert.equal(seed,true);
   await call('Page.reload',{ignoreCache:true});await sleep(1200);
   const start=await run(`(()=>{
     const sidebar=document.querySelector('aside'),nav=sidebar?.querySelectorAll('nav button');
     const identity={width:Math.round(sidebar?.getBoundingClientRect().width||0),labels:[...(nav||[])].map(b=>b.textContent.trim()),background:getComputedStyle(sidebar).backgroundImage};
     document.querySelector('[data-go="permanentRecords"]')?.click();
     const cards=[...document.querySelectorAll('#permanentRecords .p2-master-grid button')].map(x=>x.dataset.go);
     document.querySelector('#permanentRecords [data-go="kriya2Master"]')?.click();
     return {cards,identity,locked:document.getElementById('v51SecurityModal')?.classList.contains('open')};
   })()`);
   for(const id of ['kriya2Master','kriya3Master','kriya4Master','sttMaster'])assert.ok(start.cards.includes(id),'Missing master tile '+id);
   if(start.locked){
     await run(`(()=>{const pass=document.getElementById('v51Password'),confirm=document.getElementById('v51PasswordConfirm');
       pass.value='CI-ONLY-test-55';
       if(confirm&&!document.getElementById('v51ConfirmField').classList.contains('hidden'))confirm.value='CI-ONLY-test-55';
       document.getElementById('v51SecurityForm').requestSubmit();return true})()`);
     await sleep(1500);
   }
   const stages=await run(`(()=>{
     const out=[];
     for(const id of ['kriya2Master','kriya3Master','kriya4Master','sttMaster']){
       document.querySelector('[data-go="permanentRecords"]').click();
       document.querySelector('#permanentRecords [data-go="'+id+'"]').click();
       out.push({id,active:document.getElementById(id)?.classList.contains('active'),
         rows:[...document.querySelectorAll('#'+id+'Table tbody tr')].map(x=>x.textContent.trim()),
         title:document.getElementById('pageTitle')?.textContent,
         export:!!document.getElementById(id+'Export')});
     }
     const aside=document.querySelector('aside');
     return {out,sidebar:{width:Math.round(aside.getBoundingClientRect().width),labels:[...aside.querySelectorAll('nav button')].map(b=>b.textContent.trim()),background:getComputedStyle(aside).backgroundImage}};
   })()`);
   assert.deepEqual(stages.sidebar,start.identity,'Frozen sidebar appearance or navigation changed');
   for(const x of stages.out){
     assert.equal(x.active,true,x.id+' not opening');
     assert.ok(x.rows.some(t=>t.includes('Test Kriya Two 575')),x.id+' completed student not displayed');
     assert.equal(x.export,true);
     assert.ok(!x.rows.some(t=>t.includes('Not Final 575')),'Active batches incorrectly included');
   }
   const kr=await run(`(()=>{
     document.querySelector('[data-go="permanentRecords"]').click();
     document.querySelector('#permanentRecords [data-go="kriyabans"]').click();
     const search=document.getElementById('kriyabanSearch');search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));
     return {active:document.getElementById('kriyabans').classList.contains('active'),filter:search.value,text:document.getElementById('kriyabanTable').innerText,
       headers:[...document.querySelectorAll('#kriyabanTable th')].map(x=>x.textContent.trim())};
   })()`);
   assert.ok(kr.text.toLowerCase().includes('kriyaban test 575'),JSON.stringify(kr));
   assert.ok(!kr.text.includes('Linked from completed Kriya course'),'Kriyaban notes are still visible');
   assert.deepEqual(kr.headers.slice(0,3),['Name','Phone','Kriya Initiation Date']);
   const vip=await run(`(()=>{
     document.querySelector('[data-go="permanentRecords"]').click();
     document.querySelector('#permanentRecords [data-go="vips"]').click();
     const query=document.getElementById('vipSearch');query.value='';query.dispatchEvent(new Event('input',{bubbles:true}));
     const tr=[...document.querySelectorAll('#vipTable tbody tr')].find(x=>x.textContent.includes('Photo VIP 575'));
     tr?.querySelector('.v575-photo-button')?.click();
     const shown=!document.getElementById('v575VipPreview').hidden;
     document.getElementById('v575VipPreview')?.click();
     tr?.querySelector('.v47-edit-vip')?.click();
     const fields={phone:document.getElementById('v575VipMobile')?.value,category:document.getElementById('v575VipCategory')?.value,photo:!!document.getElementById('vipPhotoPreview')?.src};
     document.getElementById('vipModal')?.classList.remove('open');
     return {shown,fields,header:[...document.querySelectorAll('#vipTable th')].map(x=>x.textContent.trim())};
   })()`);
   assert.equal(vip.shown,true,'VIP photo preview failed');
   assert.equal(vip.fields.phone,'9988776600');
   assert.equal(vip.fields.category,'Speaker');
   assert.ok(vip.fields.photo,'VIP photo not preserved in edit');
   const course=await run(`(()=>{
     document.querySelector('[data-go="courseMaster"]')?.click();
     const first=document.querySelector('#p2CourseList .p2-course-row');
     return {hidden:!!first&&!first.querySelector('p'),title:document.getElementById('pageTitle')?.textContent};
   })()`);
   assert.ok(course.hidden,'Course labels still displayed');
   fs.mkdirSync('verification',{recursive:true});
   const shot=await call('Page.captureScreenshot',{format:'png',fromSurface:true});
   if(shot?.data)fs.writeFileSync('verification/beta575-master-screen.png',Buffer.from(shot.data,'base64'));
   console.log('PASS Windows 5.75: 4 separate completed-stage masters, VIP photo preview & fields, hidden Kriyaban notes, preserved left blue sidebar, cleaned course list');
 }finally{
   try{await run('(()=>{const key='+JSON.stringify(KEY)+',prior='+JSON.stringify(previous)+';if(prior===null)localStorage.removeItem(key);else localStorage.setItem(key,prior);return true})()')}catch(e){console.error('Could not restore masters QA data:',e.message)}
   ws.close();
 }
}
main().catch(e=>{console.error('FAIL Beta 5.75 Masters desktop test',e.stack||e);process.exitCode=1});
})();
