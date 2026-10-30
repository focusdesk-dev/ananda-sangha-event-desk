'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const begin=html.indexOf('  // CORRECTION 1 — Batch class-count planning, separately numbered from dates.');
const end=html.indexOf('  function p2v55InstallSuggestionKeys(',begin);
assert(begin>0&&end>begin,'Batch-count planning module missing');
const moduleCode=html.slice(begin,end);
let uidN=0,saved=0,opened='',confirmations=[],errors=[];
const el=(value='')=>({value,required:false,innerHTML:'',textContent:'',dataset:{},
  addEventListener(name,fn){(this.events||(this.events={}))[name]=fn;},
  querySelectorAll:()=>[],classList:{add(){},remove(){},toggle(){}},
  closest:()=>({insertAdjacentHTML(){}}),insertAdjacentHTML(){}});
const fieldNames=['p2BatchForm','p2BatchId','p2BatchCourse','p2v55CustomCourseName',
'p2BatchName','p2BatchStart','p2BatchEnd','p2BatchScheduleType','p2BatchDay',
'p2BatchFee','p2BatchNotes','p2BatchModal','p2v537ClassCount','p2v537SessionField',
'p2v537SessionRows','p2v537Warning','p2v537Suggest','p2v55FeeField'];
const fields=Object.fromEntries(fieldNames.map(n=>[n,el()]));
const state={classBatches:[],classEnrollments:[],courseTypes:[{id:'L1',name:'Level 1'}],acharyas:[],activeClassBatchId:''};
const ctx={state,$:name=>fields[name]||null,uid:()=> 'stable-'+(++uidN),
  today:()=> '2026-11-01',p2Course:id=>state.courseTypes.find(x=>x.id===id),
  normName:x=>String(x).toLowerCase().trim(),save:()=>{saved++;},toast:msg=>errors.push(String(msg)),
  switchPage:x=>{opened=x;},p2EditingAcharyaIds:[],p2EditingVolunteerIds:[],
  p2v55AutoStatus:b=>b.endedAt?'Completed':(!b.start?'Upcoming':'Current'),
  window:{confirm:msg=>{confirmations.push(String(msg));return true}},
  p2OpenBatch(id=''){
    const b=state.classBatches.find(x=>x.id===id);
    Object.assign(fields.p2BatchId,{value:id});fields.p2BatchCourse.value='L1';
    fields.p2BatchName.value=b?.name||'New';
    fields.p2BatchStart.value=b?.start||'';fields.p2BatchEnd.value=b?.end||'';
    fields.p2BatchDay.value=String(b?.usualDay??0);
    fields.p2BatchScheduleType.value=b?.scheduleType||'weekly';
    fields.p2BatchFee.value=String(b?.courseFee||'');
    fields.p2BatchNotes.value=b?.notes||'';
  },
  console};
vm.runInNewContext(moduleCode+'\n;globalThis.planTest={suggest:p2v537ScheduleChanged,rows:()=>p2v537Plan,render:p2v537RenderPlan,range:p2v537RangeCount,recurrence:p2v537Recurrence};',ctx,{timeout:4000});
const t=ctx.planTest,saveForm=()=>fields.p2BatchForm.onsubmit({preventDefault(){}});
const open=(id='')=>ctx.p2OpenBatch(id),mark=(id,date,value)=>state.classEnrollments.push({id, batchId:id.split('-')[0],attendance:{[date]:value}});
function reset(){errors.length=0;confirmations.length=0;}
open();
fields.p2BatchName.value='Date based';
fields.p2BatchStart.value='2026-11-01';
fields.p2BatchEnd.value='2026-11-22';
t.suggest();
assert.strictEqual(fields.p2v537ClassCount.value,'4','Date recurrence must suggest 4 Sundays');
assert.strictEqual(t.rows().slice(0,4).map(x=>x.date).join(','),'2026-11-01,2026-11-08,2026-11-15,2026-11-22');
assert(fields.p2v537SessionRows.innerHTML.includes('Class 4'),'Each session must be numbered');
saveForm();assert.strictEqual(state.classBatches.length,1);
const dateBatch=state.classBatches[0],id=dateBatch.id;
assert.strictEqual(dateBatch.numberOfClasses,4);
assert.strictEqual(dateBatch.plannedSessions.length,4);
assert.strictEqual(dateBatch.sessionDates.length,4);
const stableId=dateBatch.plannedSessions[0].id;
assert.strictEqual(opened,'classWorkspace');
reset();
// Editing the batch preserves dates and stable IDs and never duplicates sessions.
open(id);assert.strictEqual(t.rows().length,4);
saveForm();
assert.strictEqual(state.classBatches.length,1);
assert.strictEqual(dateBatch.plannedSessions.length,4);
assert.strictEqual(dateBatch.plannedSessions[0].id,stableId);
reset();
// Rescheduling a marked session must move the attendance data, not delete it.
state.classEnrollments.push({id:'en1',batchId:id,attendance:{'2026-11-01':true,'2026-11-22':false}});
open(id);t.rows()[0].date='2026-11-02';saveForm();
assert.strictEqual(state.classEnrollments[0].attendance['2026-11-02'],true);
assert.strictEqual(state.classEnrollments[0].attendance['2026-11-01'],undefined);
assert.strictEqual(state.classEnrollments[0].attendance['2026-11-22'],false);
assert(confirmations.some(x=>x.includes('existing attendance')),'Attendance migration requires confirmation');
reset();
// A reduction that would remove marked attendance must be blocked.
open(id);fields.p2v537ClassCount.value='3';fields.p2v537ClassCount.oninput();saveForm();
assert.strictEqual(dateBatch.numberOfClasses,4);
assert(errors.some(x=>x.includes('saved attendance')),'Protected reduction must explain the blocker');
reset();
// Increase works even after attendance was recorded.
open(id);fields.p2v537ClassCount.value='5';fields.p2v537ClassCount.oninput();saveForm();
assert.strictEqual(dateBatch.numberOfClasses,5);
assert.strictEqual(dateBatch.plannedSessions.length,5);
assert.strictEqual(state.classEnrollments[0].attendance['2026-11-22'],false);
assert.strictEqual(dateBatch.plannedSessions[0].id,stableId);
reset();
// Safe reduction of a genuinely unmarked extra session needs explicit consent.
open(id);fields.p2v537ClassCount.value='4';fields.p2v537ClassCount.oninput();saveForm();
assert.strictEqual(dateBatch.numberOfClasses,4);
assert(confirmations.some(x=>x.includes('planned session(s) without attendance')));
// Count only: no start/end date, retains all numbered but currently undated sessions.
reset();open();fields.p2BatchName.value='Count only';
fields.p2BatchStart.value='';fields.p2BatchEnd.value='';
fields.p2v537ClassCount.value='3';fields.p2v537ClassCount.oninput();saveForm();
assert.strictEqual(state.classBatches.length,2);
const countBatch=state.classBatches[1];assert.strictEqual(countBatch.numberOfClasses,3);
assert.strictEqual(countBatch.start,'');assert.strictEqual(countBatch.end,'');
assert.strictEqual(countBatch.plannedSessions.length,3);
assert.strictEqual(countBatch.sessionDates.length,0);
assert.strictEqual(countBatch.status,'Upcoming');
// Optional start date with count suggests an end, never writes to End Date field.
reset();open();fields.p2BatchStart.value='2026-11-01';
fields.p2v537ClassCount.value='5';fields.p2v537ClassCount.oninput();
assert.strictEqual(fields.p2BatchEnd.value,'');
assert(fields.p2v537Warning.textContent.includes('Suggested End Date: 2026-11-29'));
saveForm();
assert.strictEqual(state.classBatches.at(-1).end,'');
assert.strictEqual(state.classBatches.at(-1).numberOfClasses,5);
// Whole-number input validation.
reset();open();fields.p2v537ClassCount.value='2.5';saveForm();
assert(errors.some(x=>x.includes('positive whole number')));
reset();fields.p2v537ClassCount.value='0';saveForm();
assert(errors.some(x=>x.includes('positive whole number')));
// Duplicate dates must be rejected even if a human enters them manually.
reset();open(id);t.rows()[1].date=t.rows()[0].date;saveForm();
assert(errors.some(x=>x.includes('unique valid date')));
assert.strictEqual(dateBatch.numberOfClasses,4);
// Non-final End Date and existing attendance-preserving wrappers are scoped.
assert(html.includes("if(end&&now>end)return'Current'"),'An elapsed End Date must not complete a batch');
assert(html.includes("if(Array.isArray(b.plannedSessions))return false"),'Legacy scheduler must not regenerate explicitly managed class dates');
assert(html.includes('event.stopImmediatePropagation();'),'Old date removal must be intercepted');
assert(html.includes("Class date cannot be removed: attendance is saved"),'Deletion of marked attendance must be blocked');
assert(html.includes('const p2v537EditDateBase=p2v5Fix2EditClassDate'), 'Existing date edit must synchronize stable sessions');
console.log('PASS: date-based and count-only batches; optional dates; suggested end; numbered stable sessions; no duplicate creation; confirmed reduction; no marked-session loss; safe reschedule; strict count validation; no automatic completion');
