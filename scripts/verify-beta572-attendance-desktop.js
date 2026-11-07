'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);let target;
 for(let i=0;i<45;i++){try{
  const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  target=pages.find(x=>x.type==='page'&&/index.html|ananda/i.test((x.title||'')+' '+(x.url||'')));
  if(target?.webSocketDebuggerUrl)break;
 }catch{}await delay(300)}
 assert.ok(target?.webSocketDebuggerUrl,'Packaged Ananda app unavailable');
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
 let seq=0;const pending=new Map();
 ws.addEventListener('message',ev=>{const m=JSON.parse(String(ev.data)),cb=pending.get(m.id);if(cb){pending.delete(m.id);cb(m)}});
 const send=(method,params={})=>new Promise((ok,bad)=>{
  const id=++seq,t=setTimeout(()=>{pending.delete(id);bad(Error('CDP timeout '+method))},28000);
  pending.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)bad(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else ok(m.result)});
  ws.send(JSON.stringify({id,method,params}));
 });
 const run=async js=>(await send('Runtime.evaluate',{expression:js,returnByValue:true,awaitPromise:true})).result.value;
 const KEY='annualEventRegistration.v1',batch='beta572-attendance-ci';
 let saved;
 try{
  saved=await run('localStorage.getItem('+JSON.stringify(KEY)+')');
  const seed=await run("(()=>{const key="+JSON.stringify(KEY)+",o=JSON.parse(localStorage.getItem(key)||'{}');"+
   "const c=(o.courseTypes||[]).find(x=>/level\\s*1/i.test(x.name||''));if(!c)return {error:'No Level 1 course'};"+
   "o.classBatches=(o.classBatches||[]).filter(x=>x.id!=="+JSON.stringify(batch)+");"+
   "o.classEnrollments=(o.classEnrollments||[]).filter(x=>x.batchId!=="+JSON.stringify(batch)+");"+
   "o.students=(o.students||[]).filter(x=>!String(x.id).startsWith('beta572-'));"+
   "const date='2027-02-01';o.classBatches.push({id:"+JSON.stringify(batch)+",courseId:c.id,level:'Level 1',name:'CI Attendance',start:date,end:date,scheduleType:'custom',sessionDates:[date],status:'Current'});"+
   "for(let i=0;i<9;i++){const id='beta572-'+i;o.students.push({id,name:String.fromCharCode(65+i),mobile:'9'+String(100000000+i)});o.classEnrollments.push({id:'en-'+id,studentId:id,batchId:"+JSON.stringify(batch)+",level:'Level 1',attendance:{[date]:![2,5,7,8].includes(i)},enrolledAt:'2027-01-20'})}"+
   "o.activeClassBatchId="+JSON.stringify(batch)+";localStorage.setItem(key,JSON.stringify(o));return {course:c.id,batches:o.classBatches.length}})()");
  assert.ok(seed?.course,JSON.stringify(seed));
  await send('Page.reload',{ignoreCache:true});await delay(1600);
  const info=await run("(()=>{document.querySelector('.nav-btn[data-page=\"classes\"]')?.click();document.getElementById('p2ClassesAttendance')?.click();"+
    "const course=document.getElementById('p2v58Course'),batch=document.getElementById('p2v58Batch');"+
    "return {page:document.getElementById('classAttendanceHub')?.classList.contains('active'),course:course?.value,batch:batch?.value,courseCount:course?.options.length}})()");
  assert.equal(info.page,true,'Attendance page did not open');
  assert.equal(info.batch,batch,'Fixture batch not selected');
  const ui=await run("(()=>{const hub=document.getElementById('classAttendanceHub');const rows=[...hub.querySelectorAll('.p2v58-row')],absent=rows.filter(x=>x.classList.contains('absent')),present=rows.filter(x=>x.classList.contains('present'));"+
   "const notice=document.getElementById('p2v510AttendanceNotice');const header=hub.querySelector('.p2v58-namebar');"+
   "const style=x=>getComputedStyle(x);const status=document.getElementById('p2v530Status');"+
   "return {title:document.getElementById('pageTitle')?.textContent,titleTransform:style(document.getElementById('pageTitle')).textTransform,"+
   "topGold:style(document.querySelector('.topbar')).borderBottomColor,innerTitleHidden:style(hub.querySelector('.p2v58-title-row')).display,"+
   "masterHidden:style(document.getElementById('v51SecurityButton')).display,backVisible:style(document.getElementById('backButton')).display,"+
   "headerText:header?.textContent,headerColor:header?style(header).backgroundColor:'',"+
   "total:rows.length,present:present.length,absent:absent.length,absentColor:absent[0]?style(absent[0]).backgroundColor:'',"+
   "rowBorder:rows[0]?style(rows[0]).borderBottomStyle:'',notice:notice?.textContent,noticeHidden:notice?.classList.contains('hidden'),"+
   "statusHidden:status?style(status).display:'',listSearch:!!document.getElementById('p2v58Search'),"+
   "actions:['p2v58Clear','p2v58All','p2v58Confirm','p2v531Print'].every(x=>!!document.getElementById(x))};})()");
  assert.equal(ui.titleTransform,'uppercase','Heading must display uppercase');
  assert.equal(ui.innerTitleHidden,'none','Redundant class title visible');
  assert.equal(ui.masterHidden,'none','Master Lists must be hidden');
  assert.notEqual(ui.backVisible,'none','Back must remain visible');
  assert.equal(ui.headerColor,'rgb(23, 78, 148)','Frozen dark-blue header changed');
  assert.equal(ui.total,9);assert.equal(ui.present,5);assert.equal(ui.absent,4);
  assert.equal(ui.absentColor,'rgb(255, 240, 241)','Absent rows must be pale red');
  assert.equal(ui.rowBorder,'solid','Student boundaries missing');
  assert.ok(ui.notice?.includes('5 present')&&ui.notice.includes('4 absent'),"Saved status not shown");
  assert.equal(ui.noticeHidden,false);
  assert.equal(ui.statusHidden,'none','Repeated status panel should be hidden for saved attendance');
  assert.equal(ui.actions,true);assert.equal(ui.listSearch,true);
  fs.mkdirSync('verification',{recursive:true});
  const jpg=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  if(jpg?.data)fs.writeFileSync('verification/class-attendance-beta-5.72.png',Buffer.from(jpg.data,'base64'));
  console.log('PASS packaged Attendance design, blue list, 9 rows, 4 subtle-red absences, saved notice, navigation',JSON.stringify(ui));
 }finally{
   if(saved!==undefined)try{await run('(()=>{const key='+JSON.stringify(KEY)+',previous='+JSON.stringify(saved)+';if(previous===null)localStorage.removeItem(key);else localStorage.setItem(key,previous);return true})()')}catch(e){console.error('Fixture restore failed',e.message)}
   ws.close();
 }
}
main().catch(e=>{console.error('FAIL packaged Attendance UI: '+e.stack);process.exitCode=1});