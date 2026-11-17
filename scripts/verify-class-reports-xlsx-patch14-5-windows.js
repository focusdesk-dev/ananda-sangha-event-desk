'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
function unzip(bytes){
 let e=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-66000);i--)if(bytes.readUInt32LE(i)===0x06054b50){e=i;break}
 assert(e>=0,'XLSX is not a ZIP');
 const n=bytes.readUInt16LE(e+10);let pos=bytes.readUInt32LE(e+16);const files=new Map();
 for(let i=0;i<n;i++){
  assert.equal(bytes.readUInt32LE(pos),0x02014b50);
  const nameLength=bytes.readUInt16LE(pos+28),extra=bytes.readUInt16LE(pos+30),comment=bytes.readUInt16LE(pos+32);
  const name=bytes.subarray(pos+46,pos+46+nameLength).toString(),local=bytes.readUInt32LE(pos+42);
  const begin=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);
  assert.equal(bytes.readUInt16LE(pos+10),0,'Store compression expected');
  files.set(name,bytes.subarray(begin,begin+bytes.readUInt32LE(pos+20)).toString('utf8'));
  pos+=46+nameLength+extra+comment;
 }
 return files;
}
async function main(){
 let target;
 for(let i=0;i<100;i++){
  try{const pages=await(await fetch('http://127.0.0.1:9223/json/list')).json();
    target=pages.find(p=>p.type==='page'&&/Ananda|index\.html/i.test((p.title||'')+' '+(p.url||'')));
    if(target?.webSocketDebuggerUrl)break;
  }catch{}await sleep(250);
 }
 assert(target?.webSocketDebuggerUrl,'Windows app unavailable');
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
 const pending=new Map();let serial=0;
 ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data)),cb=pending.get(m.id);if(cb){pending.delete(m.id);cb(m)}});
 const call=(method,params={})=>new Promise((ok,bad)=>{
  const id=++serial,t=setTimeout(()=>{pending.delete(id);bad(Error('Timeout '+method))},35000);
  pending.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)bad(Error(JSON.stringify(m.error||m.result?.exceptionDetails)));else ok(m.result)});
  ws.send(JSON.stringify({id,method,params}));
 });
 const run=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 const fn=async f=>run('('+f.toString()+')()');
 const k='annualEventRegistration.v1',sKey='annualEventRegistration.security.v1';
 const old=await run('localStorage.getItem('+JSON.stringify(k)+')');
 const oldSecurity=await run('localStorage.getItem('+JSON.stringify(sKey)+')');
 try{
  await fn(function(){
   const k='annualEventRegistration.v1',s=JSON.parse(localStorage.getItem(k)||'{}'),id='qa145';
   for(const part of ['classBatches','classEnrollments','students'])s[part]=(s[part]||[]).filter(x=>!String(x.id).startsWith(id));
   let course=(s.courseTypes||[]).find(c=>c.name==='Level 1');
   if(!course){course={id:'qa145-course',name:'Level 1',category:'Progression'};(s.courseTypes||(s.courseTypes=[])).push(course)}
   s.classBatches.push({id:'qa145-batch',courseId:course.id,name:'QA 145 Batch',start:'2026-01-12',end:'2026-01-19',courseFee:6000,status:'In Progress',sessionDates:['2026-01-12']});
   s.students.push({id:'qa145-a',name:'Test A Payment Pending',mobile:'0987654321'},{id:'qa145-b',name:'Test B Already Paid',mobile:'9988776655'});
   s.classEnrollments.push(
     {id:'qa145-en-a',studentId:'qa145-a',batchId:'qa145-batch',level:'Level 1',enrolledAt:'2026-01-12',paymentStatus:'Unpaid',feeAmount:'6000',attendance:{}},
     {id:'qa145-en-b',studentId:'qa145-b',batchId:'qa145-batch',level:'Level 1',enrolledAt:'2026-01-12',paymentStatus:'Paid',paymentDate:'2026-01-13',paymentMode:'UPI',receiptNo:'R-145',feeAmount:'6000',attendance:{}});
   localStorage.setItem(k,JSON.stringify(s));
   localStorage.removeItem('annualEventRegistration.security.v1');
  });
  await call('Page.reload',{ignoreCache:true});await sleep(1000);
  async function reports(){
   const d=await fn(function(){
     document.querySelector('aside .nav-btn[data-page="classes"]')?.click();
     document.getElementById('p2ClassesReports')?.click();
     const course=document.getElementById('v574Course');
     const level=[...course.options].find(o=>o.textContent.trim()==='Level 1');
     if(level){course.value=level.value;course.dispatchEvent(new Event('change',{bubbles:true}))}
     const batch=document.getElementById('v574Batch');
     batch.value='qa145-batch';batch.dispatchEvent(new Event('change',{bubbles:true}));
     return {version:window.anandaClassReportsExportVersion,active:!!document.querySelector('#classReportsHub.page.active'),
       count:document.getElementById('v574Count')?.textContent,side:document.querySelector('aside')?.textContent};
   });
   assert.equal(d.version,'14.5');assert.equal(d.active,true);
   assert.equal(await run('window.anandaClassReportsExcelStyleVersion'),'14.6','Corrected dark-border export patch not loaded');
   assert.match(d.count,/2 of 2/,'Only the two seeded enrolments should be visible');
   return d.side;
  }
  const originalSide=await reports();
  const saveFolder=path.join(process.cwd(),'class-report-export-audit');
  fs.mkdirSync(saveFolder,{recursive:true});
  try{
    await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:saveFolder,eventsEnabled:true});
    console.log('Using Chrome Browser download directory',saveFolder);
  }catch(e){
    await call('Page.setDownloadBehavior',{behavior:'allow',downloadPath:saveFolder});
    console.log('Using legacy Chrome Page download directory',saveFolder);
  }
  await run("(()=>{window.__qaXlsx=null;window.__qaErr=[];window.addEventListener('error',e=>window.__qaErr.push(e.message));window.addEventListener('unhandledrejection',e=>window.__qaErr.push(String(e.reason)));const old=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{window.__qaXlsx=blob;return old(blob)};return true})()");
  async function exportMenu(kind){
   const beforeFiles=new Set(fs.readdirSync(saveFolder));
   const menu=await fn(function(){
     document.getElementById('v574Export').click();
     return [...document.querySelectorAll('#v145ClassExportMenu [data-kind]')].map(el=>el.dataset.kind);
   });
   assert.deepEqual(menu,['0','1','2','all','csv']);
   await run('(()=>{const button=[...document.querySelectorAll("#v145ClassExportMenu [data-kind]")].find(x=>x.dataset.kind==="'+kind+'");if(!button)throw Error("Export choice absent");button.click();return true})()');
   const locked=await run("document.getElementById('v51SecurityModal')?.classList.contains('open')");
   if(locked){
    await fn(function(){
      const p='QASecret145',field=document.getElementById('v51Password'),confirm=document.getElementById('v51PasswordConfirm');
      field.value=p;if(confirm)confirm.value=p;
      document.getElementById('v51SecurityForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    });
   }
   let found='';
   for(let i=0;i<100;i++){
     found=fs.readdirSync(saveFolder).find(name=>name.toLowerCase().endsWith('.xlsx')&&!beforeFiles.has(name))||'';
     if(found)break;
     await sleep(140);
   }
   if(!found){
     const dbg=await run("(()=>({err:window.__qaErr,security:document.getElementById('v51SecurityError')?.textContent,modal:document.getElementById('v51SecurityModal')?.className,toast:document.querySelector('#toast')?.textContent,classPage:document.querySelector('.page.active')?.id,table:document.getElementById('v574Count')?.textContent}))()");
     console.log('XLSX DOWNLOAD DEBUG',JSON.stringify(dbg));
     console.log('Download folder files:',fs.readdirSync(saveFolder));
   }
   assert(found,'XLSX was not saved by the actual Windows browser');
   const bytes=fs.readFileSync(path.join(saveFolder,found));
   assert(bytes.length>1000);
   console.log('Actual Excel saved:',found,bytes.length);
   await run('window.__qaXlsx=null');
   return unzip(bytes);
  }
  const initial=await exportMenu('all');
  const reg=initial.get('xl/worksheets/sheet1.xml'),payment=initial.get('xl/worksheets/sheet2.xml'),both=initial.get('xl/worksheets/sheet3.xml');
  const styleXml=initial.get('xl/styles.xml');
  assert.ok(styleXml,'Excel shared style definitions missing');
  assert.doesNotMatch(styleXml,/<\/bottom\s*\/>/,'Broken Office XML style close tag must never return');
  const validation=await run('(()=>{const xml='+JSON.stringify(styleXml)+';const doc=new DOMParser().parseFromString(xml,"application/xml");return {errors:doc.getElementsByTagName("parsererror").length,borders:doc.getElementsByTagName("border").length,fills:doc.getElementsByTagName("fill").length,styleCount:doc.getElementsByTagName("cellXfs")[0]?.getElementsByTagName("xf").length}})()');
  assert.equal(validation.errors,0,'Excel styles.xml must be valid parseable XML');
  assert.ok(validation.borders>=8,'Dark grid and outer boundary styles missing');
  assert.ok(validation.fills>=7,'Navy headers and alternating body fills missing');
  assert.ok(validation.styleCount>=90,'Per-cell dark boundary styles missing');
  assert.match(styleXml,/FF52657A/,'Dark grey cell dividers not defined');
  assert.match(styleXml,/FF12376F/,'Approved navy blue header missing');
  assert.match(styleXml,/style="medium"/,'Dark outer boundary missing');
  console.log('PASS styles.xml valid, navy header, dark cell grid and medium outside boundary',JSON.stringify(validation));

  assert(reg&&payment&&both,'All three approved sheets must exist');
  for(const xml of [reg,payment,both]){
   assert.match(xml,/paperSize="9"/);
   assert.match(xml,/orientation="landscape"/);
   assert.match(xml,/topLeftCell="A4"/);
   assert.match(xml,/START: 12 JAN 2026/);
   assert.match(xml,/0987654321/,'Mobile number must preserve leading zero');
   assert.doesNotMatch(xml,/DESK CHECK|VERIFIED BY|Sample Student/);
  }
  assert.match(reg,/REGISTERED ON/);assert.match(payment,/PAYMENT STATUS/);
  assert.match(payment,/PENDING/);assert.match(payment,/PAID/);
  assert.match(payment,/R-145/);
  assert.match(both,/REGISTRATION/);
  await fn(function(){
   const k='annualEventRegistration.v1',s=JSON.parse(localStorage.getItem(k));
   const en=s.classEnrollments.find(x=>x.id==='qa145-en-a');
   en.paymentStatus='Paid';en.paymentMode='Cash';en.paymentDate='2026-11-10';
   localStorage.setItem(k,JSON.stringify(s));
  });
  await call('Page.reload',{ignoreCache:true});await sleep(850);await reports();
  const updated=await exportMenu('1');
  assert(updated.has('xl/worksheets/sheet1.xml')&&!updated.has('xl/worksheets/sheet2.xml'),'Payment choice must be one worksheet');
  const after=updated.get('xl/worksheets/sheet1.xml');
  assert.match(after,/10 Nov 2026/,'Payment date must update dynamically on new export');
  assert.match(after,/CASH/);assert.doesNotMatch(after,/PENDING/,'Pending must change to Paid');
  assert.match(after,/Test A Payment Pending/);
  const currentSide=await run('document.querySelector("aside")?.textContent');
  assert.equal(currentSide,originalSide,'Approved left sidebar changed');
  console.log('PASS real Windows Excel: 3 compact A4 sheets, live pending-to-paid update, no Desk Check, original sidebar');
 }finally{
  const restore=(name,value)=>value===null?'localStorage.removeItem('+JSON.stringify(name)+')':'localStorage.setItem('+JSON.stringify(name)+','+JSON.stringify(value)+')';
  await run(restore(k,old)).catch(()=>{});
  await run(restore(sKey,oldSecurity)).catch(()=>{});
  await call('Page.reload',{ignoreCache:true}).catch(()=>{});
  ws.close();
 }
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
