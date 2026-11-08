'use strict';
const assert=require('node:assert/strict');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);
 let target;
 for(let i=0;i<40;i++){try{
  const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  target=pages.find(x=>x.type==='page'&&/index.html|Ananda/i.test((x.title||'')+' '+(x.url||'')));
  if(target?.webSocketDebuggerUrl)break;
 }catch{} await delay(350);}
 assert.ok(target?.webSocketDebuggerUrl,'Windows packaged app unavailable');
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
 const pending=new Map();let serial=0;
 ws.addEventListener('message',e=>{const msg=JSON.parse(String(e.data));const cb=pending.get(msg.id);if(cb){pending.delete(msg.id);cb(msg)}});
 const send=(method,params={})=>new Promise((ok,bad)=>{
  const id=++serial,t=setTimeout(()=>{pending.delete(id);bad(Error('Timeout: '+method))},30000);
  pending.set(id,msg=>{clearTimeout(t);if(msg.error||msg.result?.exceptionDetails)bad(Error(JSON.stringify(msg.error||msg.result.exceptionDetails)));else ok(msg.result)});
  ws.send(JSON.stringify({id,method,params}));
 });
 const run=async js=>(await send('Runtime.evaluate',{expression:js,returnByValue:true,awaitPromise:true})).result.value;
 try{
  const home=await run("(()=>{document.querySelector('.nav-btn[data-page=\"classes\"]').click();const cards=[...document.querySelectorAll('#classes .p2-home-grid>.p2-home-card')];return {page:document.getElementById('classes').classList.contains('active'),title:document.getElementById('pageTitle').textContent,titleCase:getComputedStyle(document.getElementById('pageTitle')).textTransform,buttons:cards.length,icons:cards.filter(x=>x.querySelector('.p2v570-tile-icon svg')).length,masterHidden:getComputedStyle(document.getElementById('v51SecurityButton')).display==='none',bannerHidden:getComputedStyle(document.querySelector('#classes>.event-banner')).display==='none'};})()");
  assert.equal(home.page,true);assert.equal(home.title,'Classes');assert.equal(home.titleCase,'uppercase','CLASSES must display uppercase');assert.equal(home.buttons,6);assert.equal(home.icons,6);assert.equal(home.masterHidden,true);assert.equal(home.bannerHidden,true);
  const overview=await run("(()=>{document.getElementById('p2ClassBatches').click();const years=[...document.querySelectorAll('#p2ClassList .p2v570-year-card')];return {active:document.getElementById('activeClasses').classList.contains('active'),title:document.getElementById('pageTitle').textContent,titleCase:getComputedStyle(document.getElementById('pageTitle')).textTransform,yearBackground:getComputedStyle(years[0]).backgroundColor,yearCount:years.length,masterHidden:getComputedStyle(document.getElementById('v51SecurityButton')).display==='none',bannerHidden:getComputedStyle(document.querySelector('#activeClasses>.event-banner')).display==='none',year:years[0]?.dataset.year};})()");
  assert.equal(overview.active,true);assert.equal(overview.title,'Active Classes');assert.equal(overview.titleCase,'uppercase','ACTIVE CLASSES must display uppercase');assert.equal(overview.masterHidden,true);assert.equal(overview.bannerHidden,true);assert.ok(overview.yearCount>0,'Year from seeded batch should exist');
  const detail=await run("(()=>{document.querySelector('#p2ClassList .p2v570-year-card').click();const cards=[...document.querySelectorAll('#p2ClassList .p2v56-chat-class')];return {summary:!!document.querySelector('#p2ClassList .p2v570-detail'),count:cards.length,edits:cards.filter(x=>x.querySelector('.p2v56-chat-edit')).length,deletes:cards.filter(x=>x.querySelector('.p2v56-chat-delete')).length,back:!!document.getElementById('p2v510BackClassYears'),extraBackHidden:getComputedStyle(document.getElementById('backButton')).display==='none'};})()");
  assert.equal(detail.summary,true);assert.ok(detail.count>0);assert.equal(detail.edits,detail.count);assert.equal(detail.deletes,detail.count);assert.equal(detail.back,true);assert.equal(detail.extraBackHidden,false,'Page Back must be visible on year details');
  const returned=await run("(()=>{document.getElementById('p2v510BackClassYears').click();return !!document.querySelector('#p2ClassList .p2v570-year-card')})()");
  assert.equal(returned,true);
  console.log('PASS packaged Windows frozen Classes home, year overview and year details:',JSON.stringify({home,overview,detail}));
 }finally{ws.close()}
}
main().catch(e=>{console.error('FAIL frozen Classes UI: '+e.stack);process.exitCode=1});