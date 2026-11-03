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
function batchCheck(){
 const yes=(v,m)=>{if(!v)throw Error(m)};
 const el=id=>{const x=document.getElementById(id);yes(x,'Missing '+id);return x};
 const set=(id,value,event='input')=>{const x=el(id);x.value=value;x.dispatchEvent(new Event(event,{bubbles:true}))};
 const nav=document.querySelector('.nav-btn[data-page="classes"]');yes(nav,'Classes navigation missing');nav.click();
 el('p2AddBatch').click();yes(el('p2BatchModal').classList.contains('open'),'Batch dialog not opened');
 const form=el('p2BatchForm'),grid=form.querySelector('.form-grid');
 yes(grid,'Batch form grid absent');
 yes(getComputedStyle(grid).gridTemplateColumns.split(' ').length>=2,'Desktop form not two columns');
 yes(!form.querySelector('#p2v549ManualDatesField'),'Old individual date inputs remain in Edit Batch');
 const opt=[...el('p2BatchCourse').options].find(o=>o.textContent.trim().startsWith('Kriya '))||
   [...el('p2BatchCourse').options].find(o=>o.textContent.trim()==='Kriya');
 yes(opt,'Kriya course missing');
 set('p2BatchCourse',opt.value,'change');
 set('p2BatchName','Beta 5.53 UI Verification');
 set('p2BatchScheduleType','custom','change');
 set('p2BatchStart','2026-11-08','change');
 set('p2BatchEnd','');
 set('p2v537ClassCount','2');
 yes(!el('p2BatchEnd').value,'Custom dates must not fabricate End Date');
 yes(el('p2v553DateHint').textContent.includes('Weekly recurring'),'Custom schedule guidance missing');
 yes(el('p2BatchDay').disabled,'Irrelevant weekday should be disabled under Custom Dates');
 set('p2BatchScheduleType','weekly','change');
 set('p2v537ClassCount','2');
 yes(el('p2BatchEnd').value==='2026-11-15','Two Sunday classes should end 15 Nov, got '+el('p2BatchEnd').value);
 set('p2BatchEnd','2026-11-29');
 yes(el('p2v537ClassCount').value==='4','End Date must recalculate 4 classes');
 set('p2v537ClassCount','2');
 yes(el('p2BatchEnd').value==='2026-11-15','Count must recalculate End Date again');
 const state=()=>JSON.parse(localStorage.getItem('annualEventRegistration.v1')||'{}');
 const before=state().classBatches?.length||0;
 form.requestSubmit();
 const batches=state().classBatches||[];
 yes(batches.length===before+1,'Batch was not saved');
 const batch=batches.find(b=>b.name==='Beta 5.53 UI Verification');
 yes(batch?.end==='2026-11-15','Saved batch End Date wrong');
 yes(el('p2v519Summary'),'Whole-batch summary missing');
 yes(document.querySelector('.p2v553-roster-layout'),'Rostering layout missing');
 const header=el('p2ClassHeader');
 yes(getComputedStyle(header).backgroundImage==='none','Old large gradient banner still active');
 yes(!el('pageSubtitle').textContent.trim(),'Redundant Class Batch subtitle still visible');
 yes(!el('p2v519Summary').textContent.includes('Mark remaining absent'),'Attendance marking duplicated in Class Batch');
 return {pass:true,batchId:batch.id,end:batch.end,version:document.title};
}
function progressCheck(){
 const yes=(v,m)=>{if(!v)throw Error(m)};
 const route=document.querySelector('.go[data-go="studentProgress"]');
 yes(route,'Student Progress navigation missing');route.click();
 const page=document.getElementById('studentProgress');
 yes(page?.classList.contains('active'),'Student Progress did not open');
 yes(!document.getElementById('pageSubtitle')?.textContent.trim(),'Duplicate Student Progress subtitle');
 yes(!page.querySelector('.p2v520-main h3'),'Repeated Student Progress title inside panel');
 const tab=document.getElementById('p2v520Followups');
 yes(tab&&tab.textContent.trim()==='Student Wise','Second tab not Student Wise');
 tab.click();
 const search=document.getElementById('p2v526Search');
 yes(search,'Student Wise search not rendered');
 search.value='Kriya';search.dispatchEvent(new Event('input',{bubbles:true}));
 yes(document.getElementById('p2v526Search')?.value==='Kriya','Student Wise search input lost query');
 return {pass:true,tab:tab.textContent.trim(),search:document.getElementById('p2v526Search').value};
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
  const batch=await runCode(batchCheck);assert.ok(batch?.pass,'Batch UI checks failed');
  await screenshot('class-batch-beta-5.53.png');
  const progress=await runCode(progressCheck);assert.ok(progress?.pass,'Student UI checks failed');
  await screenshot('student-wise-beta-5.53.png');
  console.log('PASS packaged Windows UI and visible layout '+JSON.stringify({batch,progress}));
 }finally{ws.close()}
}
run().catch(e=>{console.error('FAIL packaged Windows release UI: '+e.message);process.exitCode=1});
