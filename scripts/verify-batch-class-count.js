'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const begin=html.indexOf('  // CORRECTION 1 — Batch class-count planning, separately numbered from dates.');
const end=html.indexOf('  function p2v55InstallSuggestionKeys(',begin);
assert(begin>0&&end>begin,'Batch count/schedule module missing');
const src=html.slice(begin,end);
let sequence=0,saves=0,navigations=[],messages=[];
const el=(value='')=>({value,required:false,style:{},innerHTML:'',textContent:'',
 events:{},addEventListener(name,fn){this.events[name]=fn},
 querySelectorAll:()=>[],classList:{add(){},remove(){},toggle(){}},
 closest:()=>({insertAdjacentHTML(){}}),insertAdjacentHTML(){}});
const names=['p2BatchForm','p2BatchId','p2BatchCourse','p2v55CustomCourseName',
 'p2BatchName','p2BatchStart','p2BatchEnd','p2BatchScheduleType','p2BatchDay',
 'p2BatchFee','p2BatchNotes','p2BatchModal','p2v537ClassCount','p2v55CustomCourseField'];
const fields=Object.fromEntries(names.map(x=>[x,el()]));
fields.p2BatchModal.classList.remove=()=>{};
const state={classBatches:[],classEnrollments:[],courseTypes:[{id:'L1',name:'Level 1'}],
  acharyas:[{id:'AC1',name:'Acharya One'}],activeClassBatchId:''};
const ctx={state,$:name=>fields[name]||null,uid:()=> 'class-'+(++sequence),
 today:()=> '2026-11-01',p2Course:id=>state.courseTypes.find(x=>x.id===id),
 normName:x=>String(x).toLowerCase().trim(),save:()=>{saves++},
 toast:msg=>messages.push(String(msg)),switchPage:x=>navigations.push(x),
 p2EditingAcharyaIds:['AC1'],p2EditingVolunteerIds:['V1'],
 p2v55AutoStatus:b=>!b.start?'Upcoming':'Current',
 window:{confirm:()=>{throw Error('Unexpected confirmation: batch form must not mutate saved sessions')}},
 p2OpenBatch(id=''){
  const batch=state.classBatches.find(x=>x.id===id);
  fields.p2BatchId.value=id;fields.p2BatchCourse.value='L1';
  fields.p2BatchName.value=batch?.name||'Batch';fields.p2BatchStart.value=batch?.start||'';
  fields.p2BatchEnd.value=batch?.end||'';fields.p2BatchDay.value=String(batch?.usualDay??0);
  fields.p2BatchScheduleType.value=batch?.scheduleType||'weekly';
  fields.p2BatchFee.value=String(batch?.courseFee??'1200');
  fields.p2BatchNotes.value=batch?.notes||'';
 },console};
vm.runInNewContext(src+'\n;globalThis.test={dates:p2v545Sessions,count:p2v545Count,recalc:p2v545Recalculate,rows:p2v537Rows};',ctx,{timeout:4000});
const test=ctx.test,open=(id='')=>ctx.p2OpenBatch(id);
const edit=(id,value)=>{fields[id].value=value;
 const event=id==='p2v537ClassCount'?'input':'input';
 if(typeof fields[id].oninput==='function')fields[id].oninput();
 fields[id].events[event]?.();};
const submit=()=>fields.p2BatchForm.onsubmit({preventDefault(){}});
assert.strictEqual(test.dates('2026-11-01',8,'weekly',0).at(-1),'2026-12-20');
assert.strictEqual(test.count('2026-11-01','2026-12-13','weekly',0),7);
assert.strictEqual(test.dates('2026-11-03',2,'weekly',0)[0],'2026-11-08','First Sunday ON OR AFTER start');
assert.strictEqual(test.count('2026-11-03','2026-11-07','weekly',0),0);
assert.deepStrictEqual([...test.dates('2026-11-20',3,'monthly',0)],['2026-12-06','2027-01-03','2027-02-07']);
assert.strictEqual(test.count('2026-11-20','2027-01-03','monthly',0),2);
open();edit('p2v537ClassCount','8');edit('p2BatchStart','2026-11-01');
assert.strictEqual(fields.p2BatchEnd.value,'2026-12-20','Method A must set End Date automatically');
edit('p2BatchEnd','2026-12-13');
assert.strictEqual(fields.p2v537ClassCount.value,'7','Method B must count Sundays inclusively');
edit('p2v537ClassCount','8');
assert.strictEqual(fields.p2BatchEnd.value,'2026-12-20','Last edited count switches direction');
edit('p2BatchDay','1');
assert.strictEqual(fields.p2BatchEnd.value,'2026-12-21','Changing day recalculates using latest driver');
edit('p2BatchDay','0');
fields.p2BatchName.value='Weekly 8';
submit();
assert.strictEqual(state.classBatches.length,1);
const batch=state.classBatches[0],batchId=batch.id;
assert.strictEqual(batch.numberOfClasses,8);
assert.deepStrictEqual([...batch.sessionDates],[
 '2026-11-01','2026-11-08','2026-11-15','2026-11-22',
 '2026-11-29','2026-12-06','2026-12-13','2026-12-20']);
assert.strictEqual(batch.plannedSessions.length,8);
assert(batch.plannedSessions.every((x,i)=>x.date===batch.sessionDates[i]&&x.number===i+1&&x.id));
assert.strictEqual(batch.courseFee,'1200');
assert.deepStrictEqual([...batch.acharyaIds],['AC1']);assert.deepStrictEqual([...batch.volunteerIds],['V1']);
const stable=batch.plannedSessions.map(x=>x.id);
const enrolled={id:'EN1',batchId,attendance:{'2026-11-01':true,'2026-11-08':false}};
state.classEnrollments.push(enrolled);
open(batchId);fields.p2BatchNotes.value='Updated note';submit();
assert.strictEqual(state.classBatches.length,1,'Editing does not duplicate batch');
assert.deepStrictEqual(batch.plannedSessions.map(x=>x.id),stable,'Editing retains stable sessions');
assert.strictEqual(enrolled.attendance['2026-11-01'],true);
assert.strictEqual(enrolled.attendance['2026-11-08'],false);
assert.strictEqual(batch.notes,'Updated note');
const priorSaves=saves;
open(batchId);edit('p2v537ClassCount','7');submit();
assert.strictEqual(saves,priorSaves,'Reducing existing sessions must be rejected in batch form');
assert(messages.at(-1).includes('Adjust sessions individually'),'Instruct Class Schedule edits');
assert.strictEqual(batch.plannedSessions.length,8);
assert.strictEqual(enrolled.attendance['2026-11-08'],false);
// Expanding safely preserves existing numbered sessions and only fills a new slot.
open(batchId);edit('p2v537ClassCount','9');submit();
assert.strictEqual(batch.plannedSessions.length,9);
assert.deepStrictEqual(batch.plannedSessions.slice(0,8).map(x=>x.id),stable);
assert.strictEqual(batch.plannedSessions[8].date,'2026-12-27');
assert.strictEqual(enrolled.attendance['2026-11-01'],true);
// Existing manually customised schedule is retained even when batch metadata changes.
batch.plannedSessions[1].date='2026-11-09';batch.sessionDates[1]='2026-11-09';
enrolled.attendance['2026-11-09']=false;
open(batchId);fields.p2BatchNotes.value='Custom preserved';submit();
assert.strictEqual(batch.plannedSessions[1].date,'2026-11-09');
assert.strictEqual(enrolled.attendance['2026-11-09'],false);
assert.strictEqual(enrolled.attendance['2026-11-01'],true);
// Unscheduled batches have known count but no invented Start/End Date.
open();fields.p2BatchName.value='Undated course';edit('p2v537ClassCount','5');
assert.strictEqual(fields.p2BatchStart.value,'');assert.strictEqual(fields.p2BatchEnd.value,'');
submit();const unscheduled=state.classBatches.at(-1);
assert.strictEqual(unscheduled.numberOfClasses,5);
assert.strictEqual(unscheduled.start,'');assert.strictEqual(unscheduled.end,'');
assert.strictEqual(unscheduled.plannedSessions.length,5);
assert.strictEqual(unscheduled.sessionDates.length,0);
assert(unscheduled.plannedSessions.every(x=>x.date===''));
assert.strictEqual(unscheduled.status,'Upcoming');
// Custom and single schedules do NOT invent regular class dates/end dates.
open();fields.p2BatchName.value='Custom class';edit('p2BatchScheduleType','custom');
edit('p2v537ClassCount','3');edit('p2BatchStart','2026-11-01');
assert.strictEqual(fields.p2BatchEnd.value,'');
submit();assert.strictEqual(state.classBatches.at(-1).sessionDates.length,0);
// No extra scheduling controls, and separate class schedule still exists.
const form=html.slice(html.indexOf('<div id="p2BatchModal"'),html.indexOf('<div id="p2EnrollModal"'));
assert(!form.includes('Planned Class Sessions')&&!form.includes('Suggest Class Dates'));
assert(!form.includes('id="p2v537SessionRows"')&&!form.includes('Class 1'));
for(const id of ['p2BatchCourse','p2BatchName','p2BatchStart','p2BatchEnd',
 'p2BatchScheduleType','p2BatchDay','p2v537ClassCount','p2BatchFee',
 'p2BatchAcharyaSearch','p2BatchVolunteerSearch','p2BatchNotes'])
 assert(form.includes('id="'+id+'"'),'Missing field '+id);
assert(html.includes('width:min(870px,calc(100vw - 32px))'),'Desktop 870px dialog');
assert(html.includes('const p2v537EditDateBase=p2v5Fix2EditClassDate'),'Class Schedule editing preserved');
assert(html.includes('Class date cannot be removed: attendance is saved'),'Attendance protection preserved');
console.log('PASS: two-way weekly (8→Dec20, Dec13→7), monthly, no first-day overshoot, new 8 sessions, unscheduled, custom, existing IDs/attendance, expansion, safe reduction, desktop form and autocomplete preserved');
