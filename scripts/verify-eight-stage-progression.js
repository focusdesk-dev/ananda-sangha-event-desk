'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('      function p2v550Stage(b){');
const end=html.indexOf('      // Enrollment methods must enforce the real Acharya decision',start);
assert(start>0&&end>start,'Eight-stage Acharya progression engine missing');
const engine=html.slice(start,end);
const chain=['Level 1','Level 2','Level 3','Level 4','Kriya','Kriya 2','Kriya 3','Kriya 4'];
const ids=['course-l1','course-l2','course-l3','course-l4','course-kriya','course-kriya2','course-kriya3','course-kriya4'];
const courses=chain.map((name,i)=>({id:ids[i],name}));
const batches=chain.map((name,i)=>({id:'batch-'+i,courseId:ids[i],level:name}));
const person={id:'S1',name:'Student',acharyaProgressionApprovals:{}};
const state={classBatches:batches,courseTypes:courses,students:[person],classEnrollments:[]};
let baseCalls=0;
const ctx={
 state,p2FullChain:chain,
 p2CourseName:b=>state.courseTypes.find(c=>c.id===b?.courseId)?.name||b?.level||'',
 p2FindStudent:id=>state.students.find(s=>s.id===id),
 p2v55ProgressionRequirement:()=>{baseCalls++;return{ok:true,reason:''}},
};
vm.runInNewContext(engine+';globalThis.verify={stage:p2v550Stage,done:p2v550Completed,approved:p2v550Decision,require:p2v55ProgressionRequirement};',ctx,{timeout:3000});
const f=ctx.verify,check=(ix)=>f.require(person.id,batches[ix].id);
for(let i=0;i<8;i++)assert.equal(f.stage(batches[i]),chain[i]);
for(let i=0;i<4;i++)assert.equal(check(i).ok,true,'Levels 1–4 retain existing eligibility engine');
assert.equal(baseCalls,4);
for(let i=4;i<8;i++)assert.equal(check(i).ok,false,'Kriya progression should block when prerequisites are missing');
function completed(ix){state.classEnrollments.push({studentId:person.id,batchId:batches[ix].id,outcome:'Completed',level:chain[ix]})}
function approve(ix){person.acharyaProgressionApprovals[chain[ix]]={status:'Approved',approvedAt:'2026-11-01T00:00:00Z',acharyaId:'ACH1',acharyaName:'Acharya',sourceLevel:chain[ix-1]}}
completed(3);assert.equal(check(4).ok,false,'Level 4 completion is not itself Acharya approval');
approve(4);assert.equal(check(4).ok,true,'Approved Level 4 student may join Kriya');
assert.equal(check(5).ok,false,'Approval for Kriya must not automatically approve Kriya 2');
completed(4);assert.equal(check(5).ok,false,'Kriya completion needs distinct approval for Kriya 2');
approve(5);assert.equal(check(5).ok,true);
completed(5);assert.equal(check(6).ok,false);
approve(6);assert.equal(check(6).ok,true);
completed(6);assert.equal(check(7).ok,false);
approve(7);assert.equal(check(7).ok,true);
person.acharyaProgressionApprovals['Kriya 4'].status='Not approved';
assert.equal(check(7).ok,false,'Explicitly denied approval must block enrollment');
person.acharyaProgressionApprovals['Kriya 4'].status='Approved';
person.acharyaProgressionApprovals['Kriya 4'].revokedAt='2026-11-01';
assert.equal(check(7).ok,false,'Revoked decision must not be counted as approval');
const legacy={id:'S2',name:'Previous Kriyaban',kriyabanId:'K1',acharyaProgressionApprovals:{}};
state.students.push(legacy);
assert.equal(f.done(legacy.id,'Kriya'),true,'Recognize prior Kriyaban history');
assert.equal(f.require(legacy.id,batches[5].id).ok,false,'A previous Kriyaban still needs Acharya approval for Kriya 2');
legacy.acharyaProgressionApprovals['Kriya 2']={status:'Approved',approvedAt:'2026-11-01',acharyaId:'ACH1'};
assert.equal(f.require(legacy.id,batches[5].id).ok,true);
for(const name of ['Kriya','Kriya 2','Kriya 3','Kriya 4'])
 assert(html.includes("name:'"+name+"'"),name+' course definition must be retained');
assert(html.includes('p2CreateEnrollment=function(studentId,batchId)'),'Enrollment guard must exist');
assert(html.includes("v51RequireAdmin(()=>"),'Recording a decision must require administrator authorization');
assert(html.includes('acharyaProgressionHistory'),'Previous Acharya decisions must remain in history');
console.log('PASS: eight-stage chain, all four independent Acharya approvals, denied/revoked decisions, legacy Kriyaban history, enrollment gate, approval audit.');
