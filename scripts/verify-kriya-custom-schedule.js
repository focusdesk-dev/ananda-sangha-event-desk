'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('      // BETA 5.47 — Make undated Custom Date');
const end=html.indexOf("      document.title='ANANDA SANGHA GURGAON",start);
assert(start>0&&end>start,'Kriya custom date patch must be present');
const src=html.slice(start,end);
let saved=0;const notices=[],styles=[],inputs={},handlers={};
function el(v=''){return{value:v,onclick:null,events:{},classList:{add(){},remove(){}},
 addEventListener(ev,cb,capture){this.events[ev]={cb,capture}},style:{},dataset:{}}}
for(const id of ['p2v5Fix2DateForm','p2v5Fix2DateTitle','p2v5Fix2DateInput','p2v5Fix2DateModal',
 'p2v5Fix2DateCancel','p2v5Fix2DateClose','p2v537ClassCount','p2BatchId','p2BatchEnd'])inputs[id]=el();
const sourceRows=[],buttons=[];
const host={innerHTML:'',querySelectorAll(){return buttons}};
const card={querySelector(selector){return selector==='#p2v537PlanSummary'?host:null}};
const batches=[{id:'k2',name:'Kriya 2 Batch 1',scheduleType:'custom',
 start:'2026-11-01',end:'',numberOfClasses:3,sessionDates:[],
 plannedSessions:[{id:'S1',number:1,date:''},{id:'S2',number:2,date:''},{id:'S3',number:3,date:''}]}];
const enrollment={id:'EN1',batchId:'k2',attendance:{'2026-10-25':true}};
const state={classBatches:batches,classEnrollments:[enrollment]};
const ctx={
 state,$:id=>id==='p2v5ScheduleCard'?card:inputs[id]||null,
 document:{createElement:()=>({id:'',textContent:''}),head:{appendChild:x=>styles.push(x)}},
 p2v537IsDate:d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&!Number.isNaN(new Date(d).getTime()),
 p2v537Rows:b=>b.plannedSessions.map(x=>({...x})),
 p2v5IsEnded:b=>!!b.endedAt,
 p2v5Fix2OpenDateDialog:(b,oldDate)=>{inputs.p2v5Fix2DateInput.value=oldDate||b.start;},
 p2v5RenderSchedule:()=>{},
 p2v5AddNewClass:()=>true,
 p2v5Fix2EditClassDate:()=>true,
 save:()=>{saved++},toast:msg=>notices.push(String(msg)),
 uid:()=> 'NEW',esc:x=>String(x),fmt:x=>x,
 console
};
vm.runInNewContext(src+';globalThis.kriyaTest={open:p2v547OpenPlannedClass,assign:p2v547SavePlannedDate,finish:p2v547RefreshCustomEnd};',ctx,{timeout:3000});
const k=ctx.kriyaTest,b=batches[0],forms=inputs.p2v5Fix2DateForm;
assert.strictEqual(forms.events.submit.capture,true,'Slot save must run before legacy New Class save');
assert(html.includes('data-session-id'),'Class Schedule exposes direct edit buttons for numbered sessions');
k.open(b,'S2');assert.strictEqual(inputs.p2v5Fix2DateTitle.textContent,'Class 2 Date');
assert.strictEqual(inputs.p2v5Fix2DateInput.value,'2026-11-01');
inputs.p2v5Fix2DateInput.value='2026-11-08';
let prevented=false,stopped=false;
forms.events.submit.cb({preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true}});
assert(prevented&&stopped,'Save must suppress legacy Add New Class handler');
assert.strictEqual(b.plannedSessions[1].date,'2026-11-08');
assert.strictEqual(b.plannedSessions[0].date,'');
assert.strictEqual(b.sessionDates.join(','),'2026-11-08');
assert.strictEqual(b.end,'','End cannot be guessed until every custom date is assigned');
assert.strictEqual(b.numberOfClasses,3,'Do not duplicate planned slot');
const ids=b.plannedSessions.map(r=>r.id).join(',');
assert.strictEqual(k.assign({batchId:b.id,sessionId:'S3'},'2026-11-08'),false,'Duplicate date rejected');
assert.strictEqual(k.assign({batchId:b.id,sessionId:'S1'},'2026-10-30'),false,'Dates before start rejected');
assert.strictEqual(k.assign({batchId:b.id,sessionId:'S3'},'2026-11-15'),true);
assert.strictEqual(b.end,'','Still one undated slot');
assert.strictEqual(k.assign({batchId:b.id,sessionId:'S1'},'2026-11-01'),true);
assert.strictEqual(b.end,'2026-11-15','Once all classes dated, End Date derives from saved custom dates');
assert.strictEqual(b.endFromCustomSessions,true);
assert.strictEqual(b.plannedSessions.map(r=>r.id).join(','),ids,'Stable session IDs preserved');
assert.strictEqual(b.numberOfClasses,3);
assert.deepStrictEqual([...b.sessionDates],['2026-11-01','2026-11-08','2026-11-15']);
assert.strictEqual(enrollment.attendance['2026-10-25'],true,'Existing attendance untouched');
assert.strictEqual(state.classEnrollments.length,1,'Student enrolments unchanged');
assert(saved>=3,'Saves occur for each assigned date');
const two={id:'k3',name:'Kriya 2 Batch 2',scheduleType:'custom',start:'2026-11-01',end:'',
 numberOfClasses:2,sessionDates:[],
 plannedSessions:[{id:'T1',number:1,date:''},{id:'T2',number:2,date:''}]};
batches.push(two);
assert.strictEqual(k.assign({batchId:two.id,sessionId:'T1'},'2026-11-03'),true);
assert.strictEqual(two.end,'');
assert.strictEqual(k.assign({batchId:two.id,sessionId:'T2'},'2026-11-20'),true);
assert.strictEqual(two.end,'2026-11-20','Two custom session dates automatically set End Date');
const protectedCopy=JSON.stringify(b.plannedSessions),n=saved;
b.endedAt='2026-11-30';
assert.strictEqual(k.assign({batchId:b.id,sessionId:'S1'},'2026-12-01'),false,'Ended batch cannot be changed');
assert.strictEqual(JSON.stringify(b.plannedSessions),protectedCopy);
assert.strictEqual(saved,n);
assert(html.includes('p2v545Sessions(start,Number(raw),type,day)'),'Weekly and monthly calculations remain');
console.log('PASS: Kriya 2 pending slot edit saves Class 1/2/3, blocks duplicate/old dates, derives custom end only after full schedule, no lost attendance, no duplicates, ended batch protected');
