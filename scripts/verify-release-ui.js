'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);
const out='verification';fs.mkdirSync(out,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function find(){
 for(let i=0;i<35;i++){
  try{const p=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    const x=p.find(z=>z.type==='page'&&/index\.html|ananda/i.test((z.title||'')+' '+(z.url||'')));
    if(x?.webSocketDebuggerUrl)return x;}
  catch{}
  await wait(900);
 }
 throw Error('Windows application not available on CDP port '+port);
}
async function batchCheck(){
 const yes=(v,m)=>{if(!v)throw Error(m)};
 const el=id=>{const x=document.getElementById(id);yes(x,'Missing '+id);return x};
 const set=(id,value,event='input')=>{const x=el(id);x.value=value;x.dispatchEvent(new Event(event,{bubbles:true}))};
 const nav=document.querySelector('.nav-btn[data-page="classes"]');yes(nav,'Classes navigation missing');nav.click();
 el('p2AddBatch').click();yes(el('p2BatchModal').classList.contains('open'),'Batch dialog not opened');
 const form=el('p2BatchForm'),grid=form.querySelector('.form-grid');
 yes(grid,'Batch form grid absent');
 yes(getComputedStyle(grid).gridTemplateColumns.split(' ').length>=2,'Desktop form not two columns');
 yes(!form.querySelector('#p2v549ManualDatesField'),'Old individual date inputs remain in Edit Batch');
 const options=[...el('p2BatchCourse').options];
 const canonical=['Level 1','Level 2','Level 3','Level 4','Kriya','Kriya 2','Kriya 3','Kriya 4','STT','STT 2'];
 const normal=x=>String(x).trim().toLowerCase();
 const positions=canonical.map(name=>options.findIndex(o=>normal(o.textContent)===normal(name)));
 yes(positions.every((p,i)=>p>=0),'Canonical course missing: '+canonical.filter((_,i)=>positions[i]<0).join(', '));
 yes(positions.every((p,i)=>i===0||p>positions[i-1]),'Course options have wrong progression order: '+options.map(o=>o.textContent.trim()).join(' / '));
 const setStage=name=>{
   const option=options.find(o=>normal(o.textContent)===normal(name));
   yes(option,'Missing course '+name);
   set('p2BatchCourse',option.value,'change');
 };
 for(const name of ['Kriya','Kriya 2','Kriya 3','Kriya 4','STT','STT 2']){
   setStage(name);
   yes(el('p2BatchScheduleType').value==='weekly',name+' must open with weekly auto calculation');
   set('p2BatchStart','2026-11-08','change');
   set('p2v537ClassCount','2');
   yes(el('p2BatchEnd').value==='2026-11-15',name+' Start + Count did not calculate End: '+el('p2BatchEnd').value);
   set('p2BatchEnd','2026-11-29','change');
   yes(el('p2v537ClassCount').value==='4',name+' Start + End did not calculate Count: '+el('p2v537ClassCount').value);
 }
 setStage('Kriya');
 set('p2BatchName','Beta 5.57 UI Verification');
 set('p2BatchScheduleType','custom','change');
 set('p2BatchStart','2026-11-08','change');
 set('p2BatchEnd','');
 set('p2v537ClassCount','2');
 yes(!el('p2BatchEnd').value,'Custom dates must not fabricate End Date');
 yes(!document.getElementById('p2v553DateHint'),'Unnecessary date guidance remains visible');
 yes(el('p2BatchDay').disabled,'Irrelevant weekday should be disabled under Custom Dates');
 set('p2BatchScheduleType','weekly','change');
 set('p2v537ClassCount','2');
 yes(el('p2BatchEnd').value==='2026-11-15','Two Sunday classes should end 15 Nov, got '+el('p2BatchEnd').value);
 set('p2BatchEnd','2026-11-29','change');
 yes(el('p2v537ClassCount').value==='4','End Date must recalculate 4 classes');
 set('p2v537ClassCount','2');
 yes(el('p2BatchEnd').value==='2026-11-15','Count must recalculate End Date again');
 const state=()=>JSON.parse(localStorage.getItem('annualEventRegistration.v1')||'{}');
 const before=state().classBatches?.length||0;
 form.requestSubmit();
 const batches=state().classBatches||[];
 yes(batches.length===before+1,'Batch was not saved');
 const batch=batches.find(b=>b.name==='Beta 5.57 UI Verification');
 yes(batch?.end==='2026-11-15','Saved batch End Date wrong');
 yes(el('p2v519Summary'),'Whole-batch summary missing');
 yes(document.querySelector('.p2v553-roster-layout'),'Rostering layout missing');
 const header=el('p2ClassHeader');
 yes(getComputedStyle(header).backgroundImage==='none','Old large gradient banner still active');
 yes(!el('pageSubtitle').textContent.trim(),'Redundant Class Batch subtitle still visible');
 yes(!el('p2v519Summary').textContent.includes('Mark remaining absent'),'Attendance marking duplicated in Class Batch');
 const endHeaderButton=document.querySelector('#p2ClassHeader #p2v519End');
 yes(endHeaderButton,'End Batch button missing beside Edit Batch and Class Schedule at top');
 yes(!document.querySelector('#p2v519Summary #p2v519End'),'End Batch is duplicated in lower Student Progress table');
 el('p2v519Schedule').click();
 yes(!!document.querySelector('#p2ClassHeader #p2v519End'),'End Batch disappears in Class Schedule view');
 el('p2v519Schedule').click();
 el('p2v519Edit').click();
 yes(!el('p2DeleteBatch').classList.contains('hidden'),'Delete Batch absent while editing saved batch');
 yes(!!el('p2DeleteBatch').closest('.actions'),'Delete Batch must be in the form footer');
 el('p2BatchModal').classList.remove('open');
 // Live year list: both operations must appear directly on each class card.
 nav.click();
 el('p2ClassBatches').click();
 yes(el('activeClasses').classList.contains('active'),'Active Classes screen did not open');
 const yearCard=document.querySelector('#p2ClassList .p2v510-class-year[data-year="2026"]');
 if(yearCard)yearCard.click();
 const row=[...document.querySelectorAll('#p2ClassList .p2v56-chat-class')]
    .find(x=>x.dataset.id===batch.id);
 yes(row,'New class missing from 2026 Active Classes listing');
 const editButton=row.querySelector('.p2v56-chat-edit');
 const deleteButton=row.querySelector('.p2v56-chat-delete');
 yes(editButton&&deleteButton,'Both Edit and Delete must appear on class card');
 yes(getComputedStyle(deleteButton).display!=='none','Delete button is hidden on class card');
 editButton.click();
 yes(el('p2BatchId').value===batch.id,'Edit did not load the chosen batch');
 el('p2BatchModal').classList.remove('open');
 deleteButton.click();
 yes(el('v51SecurityModal').classList.contains('open'),'Delete did not request administrator authorisation');
 yes(state().classBatches.some(x=>x.id===batch.id),'Batch deleted before administrator authorised');
 const password='CI-ONLY-test-55';
 set('v51Password',password);
 if(!el('v51ConfirmField').classList.contains('hidden'))set('v51PasswordConfirm',password);
 const confirmBase=window.confirm;window.confirm=()=>true;
 try{
   el('v51SecurityForm').requestSubmit();
   await new Promise(resolve=>setTimeout(resolve,1300));
 }finally{window.confirm=confirmBase;}
 yes(!state().classBatches.some(x=>x.id===batch.id),'Admin-authorised Delete did not remove empty batch: '+el('v51SecurityError').textContent);
 yes(el('activeClasses').classList.contains('active'),'Deletion did not return to Active Classes');
 return {pass:true,batchId:batch.id,end:batch.end,version:document.title,cardEditDelete:true,authorisedDelete:true};
}
async function typingCheck(cmd){
  // Real packaged Windows input: mouse focus + Chromium keyboard events.
  const ev=async expression=>{
    const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.result?.exceptionDetails)throw Error(JSON.stringify(r.result.exceptionDetails));
    return r.result?.value;
  };
  const setup=await ev("(()=>{const nav=document.querySelector('.nav-btn[data-page=\\\"classes\\\"]');nav.click();document.getElementById('p2AddBatch').click();return {open:document.getElementById('p2BatchModal').classList.contains('open'),backdrops:document.querySelectorAll('.modal-backdrop.open').length};})()");
  assert.equal(setup?.open,true,'New Class Batch failed to open');
  assert.equal(setup?.backdrops,1,'Another modal backdrop intercepts Class Batch input');
  const tested=[];
  for(const id of ['p2BatchName','p2BatchAcharyaSearch','p2BatchVolunteerSearch','p2BatchNotes','p2BatchFee']){
    const point=await ev("(()=>{const x=document.getElementById("+JSON.stringify(id)+");const r=x.getBoundingClientRect(),px=r.left+r.width/2,py=r.top+r.height/2,top=document.elementFromPoint(px,py);return {x:px,y:py,disabled:x.disabled,readOnly:x.readOnly,visible:r.width>0&&r.height>0,clickable:top===x||x.contains(top),hit:top?.id||top?.tagName};})()");
    assert.ok(point?.visible&&point?.clickable&&!point.disabled&&!point.readOnly,
      'Batch field blocked before typing: '+id+' '+JSON.stringify(point));
    await cmd('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
    await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
    const focused=await ev('document.activeElement?.id');
    assert.equal(focused,id,'Click did not focus field '+id+'; focus='+focused);
    await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'A',code:'KeyA',text:'A',unmodifiedText:'A',windowsVirtualKeyCode:65,nativeVirtualKeyCode:65});
    await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'A',code:'KeyA',windowsVirtualKeyCode:65,nativeVirtualKeyCode:65});
    const typed=await ev("document.getElementById("+JSON.stringify(id)+").value");
    assert.ok(typed.includes('A'),'Physical keyboard typing failed in '+id+': '+JSON.stringify(typed));
    // Shift+= must insert '+' inside an editor, not fire New/Add shortcut.
    await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'+',code:'Equal',text:'+',unmodifiedText:'=',modifiers:8,windowsVirtualKeyCode:187,nativeVirtualKeyCode:187});
    await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'+',code:'Equal',modifiers:8,windowsVirtualKeyCode:187,nativeVirtualKeyCode:187});
    const plus=await ev("document.getElementById("+JSON.stringify(id)+").value");
    assert.ok(plus.includes('+'),'Plus character was intercepted in '+id+': '+JSON.stringify(plus));
    tested.push(id);
  }
  await ev("document.querySelector('#p2BatchModal [data-close]').click(); true");
  return {pass:true,typedFields:tested,physicalKeyboard:true};
}

function approvalSeed(){
 const key='annualEventRegistration.v1',data=JSON.parse(localStorage.getItem(key)||'{}');
 const add=(field,entry)=>{data[field]=Array.isArray(data[field])?data[field]:[];data[field].push(entry)};
 const year=2026;
 add('courseTypes',{id:'ci-kriya-legacy',name:'KRIYA',category:'Advanced',active:true,defaultSchedule:'weekly'});
 add('acharyas',{id:'ci-acharya',name:'CI Sample Acharya',active:true});
 add('students',{id:'ci-review-student',name:'CI Review Student',mobile:'9888811111',acharyaProgressionApprovals:{}});
 add('students',{id:'ci-kriya-student',name:'CI Kriya Student',mobile:'9888822222',acharyaProgressionApprovals:{}});
 const makeBatch=(id,courseId,level,ended)=>({
   id,courseId,level,name:'CI '+id,start:'2026-10-04',end:'2026-10-11',
   year,status:ended?'Completed':'Current',scheduleType:'weekly',usualDay:0,numberOfClasses:2,
   plannedSessions:[{id:id+'-1',number:1,date:'2026-10-04'},{id:id+'-2',number:2,date:'2026-10-11'}],
   sessionDates:['2026-10-04','2026-10-11'],acharyaIds:[],volunteerIds:[],
   ...(ended?{endedAt:'2026-10-12T00:00:00Z'}:{})
 });
 add('classBatches',makeBatch('ci-review-source','course-l1','Level 1',true));
 add('classBatches',makeBatch('ci-review-target','course-l2','Level 2',false));
 add('classBatches',makeBatch('ci-kriya-source','course-l4','Level 4',true));
 add('classBatches',makeBatch('ci-kriya-target','ci-kriya-legacy','KRIYA',false));
 add('classEnrollments',{id:'ci-review-history',studentId:'ci-review-student',batchId:'ci-review-source',
   level:'Level 1',courseId:'course-l1',outcome:'Did Not Complete',attendance:{'2026-10-04':false,'2026-10-11':false},
   progressionFinalStatus:{key:'Review Required',label:'Review Required'},eligibleFor:'',enrolledAt:'2026-10-04'});
 add('classEnrollments',{id:'ci-kriya-history',studentId:'ci-kriya-student',batchId:'ci-kriya-source',
   level:'Level 4',courseId:'course-l4',outcome:'Completed',attendance:{'2026-10-04':true,'2026-10-11':true},
   enrolledAt:'2026-10-04'});
 localStorage.setItem(key,JSON.stringify(data));
 return {students:data.students.length,batches:data.classBatches.length};
}
async function approvalCheck(){
 window.__anandaCiDebug=true;
 const yes=(x,m)=>{if(!x)throw Error(m)};
 const el=id=>{const x=document.getElementById(id);yes(x,'Missing '+id);return x};
 const get=()=>JSON.parse(localStorage.getItem('annualEventRegistration.v1')||'{}');
 const nav=document.querySelector('.nav-btn[data-page="classes"]');yes(nav,'Cannot navigate classes');
 const check=(batchId,name,mobile,modalId)=>{
   document.querySelectorAll('.modal-backdrop.open').forEach(x=>x.classList.remove('open'));
   nav.click();el('p2ClassBatches').click();
   const yearCard=document.querySelector('#p2ClassList .p2v510-class-year[data-year="2026"]');
   if(yearCard)yearCard.click();
   const row=[...document.querySelectorAll('#p2ClassList .p2v56-chat-class')].find(x=>x.dataset.id===batchId);
   yes(row,'Cannot find batch '+batchId);
   row.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}));
   yes(el('classWorkspace').classList.contains('active'),'Failed to open Class Batch '+batchId);
   const enroll=el('p2v519Enroll');enroll.click();
   yes(el('p2EnrollModal').classList.contains('open'),'Enroll modal not open');
   const form=el('p2EnrollForm');
   el('p2cEnrollName').value=name;el('p2cEnrollMobile').value=mobile;
   const count=get().classEnrollments.length;
   form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
   yes(get().classEnrollments.length===count,'Unauthorised enrollment bypassed approval for '+batchId);
   const approvalModal=document.getElementById(modalId);
   if(!approvalModal?.classList.contains('open')){
     const state=get(),relevant=state.classEnrollments.filter(e=>String(e.id).startsWith('ci-'));
     throw Error('Required Acharya approval prompt missing for '+batchId+' '+JSON.stringify({
       requested:modalId,existing:!!approvalModal,debug:window.__anandaCiState,
       open:[...document.querySelectorAll('.modal-backdrop.open')].map(x=>x.id),
       handler:String(form.onsubmit).slice(0,550),
       toast:document.querySelector('.toast')?.textContent,
       toastById:document.getElementById('toast')?.textContent,
       heading:document.getElementById('p2ClassHeader')?.textContent?.slice(0,180),
       nameInput:document.getElementById('p2cEnrollName')?.value,
       mobileInput:document.getElementById('p2cEnrollMobile')?.value,
       hiddenStudentId:document.getElementById('p2EnrollStudentId')?.value,
       relevant,student:state.students.find(s=>s.name===name),
       acharyas:state.acharyas?.map(x=>({name:x.name,active:x.active})),
       target:state.classBatches.find(b=>b.id===batchId),
       prev:state.classBatches.find(b=>b.id==='ci-kriya-source'),
       legacyCourse:state.courseTypes.find(c=>c.id==='ci-kriya-legacy')
     }));
   }
   return {batchId,blocked:true,modal:modalId};
 };
 const review=check('ci-review-target','CI Review Student','9888811111','p2v557ReviewModal');
 const kriya=check('ci-kriya-target','CI Kriya Student','9888822222','p2v550ApprovalModal');
 yes(el('p2v550ApprovalInfo').textContent.includes('Level 4'),'Kriya approval should reference Level 4');
 return {pass:true,review,kriya};
}
async function progressCheck(){
 const yes=(v,m)=>{if(!v)throw Error(m)};
 const route=document.querySelector('.go[data-go="studentProgress"]');
 yes(route,'Student Progress navigation missing');route.click();
 await new Promise(resolve=>setTimeout(resolve,450));
 const page=document.getElementById('studentProgress');
 yes(page?.classList.contains('active'),'Student Progress did not open');
 yes(!document.getElementById('pageSubtitle')?.textContent.trim(),'Duplicate Student Progress subtitle');
 yes(!page.querySelector('.p2v520-main h3'),'Repeated Student Progress title inside panel');
 const select=document.getElementById('p2v520Course');yes(select,'Student Progress course selector missing');
 const selectedCourses=[...select.options].map(x=>x.textContent.trim().toLowerCase());
 const ordered=['level 1','level 2','level 3','level 4','kriya','kriya 2','kriya 3','kriya 4','stt','stt 2'];
 const indices=ordered.map(name=>selectedCourses.indexOf(name));
 yes(indices.every(x=>x>=0),'Student Progress missing canonical course: '+ordered.filter((_,i)=>indices[i]<0).join(', '));
 yes(indices.every((x,i)=>i===0||x>indices[i-1]),'Student Progress Kriya/STT course order incorrect: '+selectedCourses.join(' / '));
 const tab=document.getElementById('p2v520Followups');
 yes(tab&&tab.textContent.trim()==='Student Wise','Second tab not Student Wise. Found '+(tab?.outerHTML||'missing')+'; panel '+page.innerHTML.slice(0,350));
 tab.click();
 const search=document.getElementById('p2v526Search');
 yes(search,'Student Wise search not rendered');
 search.value='Kriya';search.dispatchEvent(new Event('input',{bubbles:true}));
 yes(document.getElementById('p2v526Search')?.value==='Kriya','Student Wise search input lost query');
 return {pass:true,tab:tab.textContent.trim(),search:document.getElementById('p2v526Search').value,version:document.title};
}
async function run(){
 const target=await find(),ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
 let counter=0;const callbacks=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data));const done=callbacks.get(m.id);if(done){callbacks.delete(m.id);done(m)}});
 const cmd=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++counter,timeout=setTimeout(()=>{callbacks.delete(id);reject(Error('CDP timeout '+method))},40000);
  callbacks.set(id,m=>{clearTimeout(timeout);if(m.error||m.result?.exceptionDetails)reject(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else resolve(m.result)});
  ws.send(JSON.stringify({id,method,params}));
 });
 const runCode=async fn=>{
  const r=await cmd('Runtime.evaluate',{expression:'('+fn.toString()+')()',returnByValue:true,awaitPromise:true});
  return r.result?.value;
 };
 const screenshot=async name=>{
  const result=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(out+'/'+name,Buffer.from(result.data,'base64'));
 };
 try{
  await cmd('Page.enable');
  // The preceding desktop journey intentionally renames Kriya 2 in the same
  // ephemeral CI profile. Restore a clean synthetic fixture before checking
  // canonical ordering and new-batch defaults. Never reset a user's profile.
  if(process.env.GITHUB_ACTIONS==='true'){
    await cmd('Runtime.evaluate',{expression:"localStorage.removeItem('annualEventRegistration.v1'); true",returnByValue:true});
    await cmd('Page.reload',{ignoreCache:true});
    await wait(1800);
  }
  const typing=await typingCheck(cmd);assert.ok(typing?.pass,'Real keyboard typing failed');
  const batch=await runCode(batchCheck);assert.ok(batch?.pass,'Batch UI checks failed');
  await screenshot('class-batch-beta-5.57.png');
  const progress=await runCode(progressCheck);assert.ok(progress?.pass,'Student UI checks failed');
  await screenshot('student-wise-beta-5.57.png');
  // CI-only synthetic students: exercise the *real* enrolment submit handler,
  // including legacy uppercase KRIYA and Review Required. No NGO data is used.
  const seed=await runCode(approvalSeed);assert.ok(seed?.batches>=4,'Approval fixture failed');
  await cmd('Page.reload',{ignoreCache:true});await wait(1600);
  const approval=await runCode(approvalCheck);assert.ok(approval?.pass,'Approval forms failed');
  await cmd('Runtime.evaluate',{expression:"(()=>{document.getElementById('p2v550ApprovalModal').classList.remove('open');document.getElementById('p2cEnrollName').focus();return true})()",returnByValue:true});
  await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'A',code:'KeyA',text:'A',unmodifiedText:'A',windowsVirtualKeyCode:65,nativeVirtualKeyCode:65});
  await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'A',code:'KeyA',windowsVirtualKeyCode:65,nativeVirtualKeyCode:65});
  const entered=await cmd('Runtime.evaluate',{expression:"document.getElementById('p2cEnrollName').value",returnByValue:true});
  assert.ok(String(entered.result?.value||'').includes('A'),'Physical keyboard input stopped in Enrol Student form');
  console.log('PASS packaged Windows UI, Acharya gates and keyboard '+JSON.stringify({batch,progress,approval,enrollTyping:true}));
 }finally{ws.close()}
}
run().catch(e=>{console.error('FAIL packaged Windows release UI: '+e.message);process.exitCode=1});
