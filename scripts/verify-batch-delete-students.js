'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('  function p2DeleteBatchRecords(id){');
const end=html.indexOf("  $('p2DeleteBatch').onclick=",start);
assert(start>0&&end>start,'Missing batch deletion implementation');
const source=html.slice(start,end);
assert(html.includes("manualBackupState(JSON.stringify(state))"),'Deletion must back up state first');
assert(html.includes("if(!backup?.ok)throw Error("),'Deletion must stop on failed backup');
function run(){
 const state={
 classBatches:[{id:'B1'},{id:'B2'}],activeClassBatchId:'B1',
 classEnrollments:[{id:'E1',batchId:'B1',studentId:'S1',attendance:{a:true}},{id:'E2',batchId:'B1',studentId:'S2'},{id:'E3',batchId:'B2',studentId:'S2',attendance:{b:true}}],
 students:[{id:'S1',acharyaProgressionApprovals:{Kriya:{sourceBatchId:'B1'}}},{id:'S2',acharyaProgressionHistory:[{sourceBatchId:'B1'},{sourceBatchId:'B2'}]},{id:'S3'}],
 outreach:[{studentId:'S1'},{studentId:'S2',batchId:'B2'},{studentId:'S2',sourceBatchId:'B1'}]};
 const context={state};vm.createContext(context);vm.runInContext(source+';globalThis.remove=p2DeleteBatchRecords;',context);
 const result=context.remove('B1');
 assert.equal(result.enrolments,2);assert.equal(result.students,1);
 assert.deepEqual(state.classBatches.map(b=>b.id),['B2']);
 assert.deepEqual(state.classEnrollments.map(e=>e.id),['E3']);
 assert.deepEqual(state.students.map(s=>s.id),['S2','S3']);
 assert.deepEqual(state.students[0].acharyaProgressionHistory.map(x=>x.sourceBatchId),['B2']);
 assert.equal(state.classEnrollments[0].attendance.b,true);
 assert.deepEqual(state.outreach.map(o=>o.batchId),['B2']);
 assert.equal(state.activeClassBatchId,'');
 assert.equal(context.remove('B1').students,0,'Repeated removal must be harmless');
}
run();
console.log('PASS batch deletion removes single-batch student, retains multi-batch student, preserves other attendance, prunes related outreach and approvals');
