'use strict';
const assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 let page;const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);
 for(let n=0;n<45;n++){try{const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  page=pages.find(p=>p.type==='page'&&/index.html|Ananda/i.test((p.title||'')+' '+(p.url||'')));
  if(page?.webSocketDebuggerUrl)break;}catch{}await sleep(250)}
 assert.ok(page?.webSocketDebuggerUrl,'Packaged Ananda app unavailable');
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
 let serial=0;const handlers=new Map();
 ws.addEventListener('message',e=>{const msg=JSON.parse(String(e.data)),fn=handlers.get(msg.id);if(fn){handlers.delete(msg.id);fn(msg)}});
 const call=(method,params={})=>new Promise((ok,bad)=>{
  const id=++serial,t=setTimeout(()=>{handlers.delete(id);bad(Error('Timeout '+method))},25000);
  handlers.set(id,msg=>{clearTimeout(t);if(msg.error||msg.result?.exceptionDetails)bad(Error(JSON.stringify(msg.error||msg.result.exceptionDetails)));else ok(msg.result)});
  ws.send(JSON.stringify({id,method,params}));
 });
 const run=async expression=>(await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value;
 const KEY='annualEventRegistration.v1',BATCH='beta573-ci-progress',SEED='beta573-ci';
 let saved;
 try{
  saved=await run('localStorage.getItem('+JSON.stringify(KEY)+')');
  const seed=await run("(()=>{const key="+JSON.stringify(KEY)+",o=JSON.parse(localStorage.getItem(key)||'{}'),course=(o.courseTypes||[]).find(x=>x.id==='course-l1'||/^Level 1$/i.test(x.name||''));if(!course)return {error:'Level 1 course absent'};"+
   "o.classBatches=(o.classBatches||[]).filter(b=>b.id!=="+JSON.stringify(BATCH)+");o.classEnrollments=(o.classEnrollments||[]).filter(e=>e.batchId!=="+JSON.stringify(BATCH)+");o.students=(o.students||[]).filter(s=>!String(s.id).startsWith("+JSON.stringify(SEED)+"));"+
   "o.classBatches.push({id:"+JSON.stringify(BATCH)+",courseId:course.id,name:'Batch 573 Test',level:'Level 1',start:'2026-10-01',end:'2026-10-29',endedAt:'2026-10-29',sessionDates:['2026-10-01'],status:'Completed'});"+
   "for(let i=0;i<2;i++){const sid="+JSON.stringify(SEED)+"+i;o.students.push({id:sid,name:i?'Beta Test Two':'Alpha Test One',mobile:i?'9998887776':'0123456789'});o.classEnrollments.push({id:'en-'+sid,studentId:sid,batchId:"+JSON.stringify(BATCH)+",outcome:'Completed',enrolledAt:'2026-09-10',attendance:{'2026-10-01':true}})}"+
   "localStorage.setItem(key,JSON.stringify(o));return {course:course.id,students:2}})()");
  assert.ok(seed?.course,JSON.stringify(seed));
  await call('Page.reload',{ignoreCache:true});await sleep(1400);
  const overview=await run("(()=>{document.querySelector('.nav-btn[data-page=\"classes\"]')?.click();document.querySelector('#classes .p2-home-card[data-go=\"studentProgress\"]')?.click();"+
    "const course=document.getElementById('p2v520Course');if(course){course.value="+JSON.stringify(seed.course)+";course.dispatchEvent(new Event('change',{bubbles:true}))}"+
    "const batch=document.getElementById('p2v520Batch');if(batch){batch.value="+JSON.stringify(BATCH)+";batch.dispatchEvent(new Event('change',{bubbles:true}))}"+
    "const headers=[...document.querySelectorAll('#studentProgress .p2v520-table thead th')].map(x=>x.textContent.trim());"+
    "const lines=[...document.querySelectorAll('#studentProgress .p2v520-table tbody tr')].map(r=>r.textContent.trim());"+
    "return {page:document.getElementById('studentProgress')?.classList.contains('active'),masterHidden:getComputedStyle(document.getElementById('v51SecurityButton')).display==='none',"+
    "headers,lines,batch:document.getElementById('p2v520Batch')?.value,exportText:document.getElementById('p2v520Export')?.textContent.trim(),"+
    "exportDisabled:document.getElementById('p2v520Export')?.disabled,selection:document.querySelectorAll('#studentProgress .p2v520-pick').length}})()");
  assert.equal(overview.page,true,'Student Progress did not open');
  assert.equal(overview.masterHidden,true,'Master Lists must be hidden');
  assert.deepEqual(overview.headers,['Student','Mobile Number','Course','Batch','Year','Attendance %','Status','History']);
  assert.equal(overview.batch,BATCH);assert.equal(overview.selection,0);
  assert.equal(overview.exportText,'Export List');assert.equal(overview.exportDisabled,false);
  assert.equal(overview.lines.length,2,'Export must follow batch filtering without other students');
  assert.ok(overview.lines.some(t=>t.includes('0123456789')),'Leading-zero phone not displayed');
  const begin=await run("(()=>{const original=URL.createObjectURL;window._p2v573LastExcel=null;URL.createObjectURL=function(blob){if(blob.type.includes('spreadsheetml'))window._p2v573LastExcel=blob;return original.call(URL,blob)};document.getElementById('p2v520Export').click();return {adminOpen:document.getElementById('v51SecurityModal')?.classList.contains('open'),hasFile:!!window._p2v573LastExcel}})()");
  if(begin.adminOpen){
   const unlocked=await run("(()=>{const password='CI-ONLY-test-55';document.getElementById('v51Password').value=password;"+
      "const confirm=document.getElementById('v51PasswordConfirm');if(confirm&&!document.getElementById('v51ConfirmField').classList.contains('hidden'))confirm.value=password;"+
      "document.getElementById('v51SecurityForm').requestSubmit();return true})()");
   assert.equal(unlocked,true);await sleep(1450);
  }
  const file=await run("(async()=>{const blob=window._p2v573LastExcel;if(!blob)return {error:'No Excel blob generated',adminError:document.getElementById('v51SecurityError')?.textContent};"+
   "const bytes=new Uint8Array(await blob.arrayBuffer()),str=new TextDecoder().decode(bytes);const m=str.match(/<row r=\"\\d+\">/g)||[];"+
   "return {size:bytes.length,type:blob.type,zipSignature:String.fromCharCode(...bytes.slice(0,2)),rows:m.length,"+
   "mobileAsText:str.includes('r=\"B2\" t=\"inlineStr\"')&&str.includes('0123456789'),"+
   "headers:['Student','Mobile Number','Course','Batch','Year','Attendance %','Status'].every(x=>str.includes(x)),"+
   "missingSuggested:!str.includes('Suggested Action')&&!str.includes('Suggested action'),"+
   "includesSecond:str.includes('9998887776'),hasWorkbook:str.includes('xl/workbook.xml'),hasSheet:str.includes('xl/worksheets/sheet1.xml')};})()");
  assert.ok(!file.error,JSON.stringify(file));
  assert.equal(file.zipSignature,'PK');assert.ok(file.size>1500);
  assert.equal(file.rows,3,'Excel must export header + 2 matching students');
  assert.equal(file.mobileAsText,true,'Mobile must remain text, including leading zero');
  assert.equal(file.headers,true);assert.equal(file.missingSuggested,true);assert.equal(file.includesSecond,true);
  assert.equal(file.hasWorkbook,true);assert.equal(file.hasSheet,true);
  console.log('PASS Beta 5.73 packaged Windows Student Progress filters, 2-row XLSX workbook, text mobile, no selections or Suggested Action',JSON.stringify(file));
 }finally{
  if(saved!==undefined)try{await run('(()=>{const key='+JSON.stringify(KEY)+',previous='+JSON.stringify(saved)+';if(previous===null)localStorage.removeItem(key);else localStorage.setItem(key,previous);return true})()')}catch(e){console.error('Could not restore fixture',e.message)}
  ws.close();
 }
}
main().catch(error=>{console.error('FAIL Beta 5.73 Student Progress XLSX regression: '+error.stack);process.exitCode=1});