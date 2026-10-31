'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const a=html.indexOf('      // CORRECTION 18 — global minimum attendance;');
const b=html.indexOf("      document.title='ANANDA SANGHA GURGAON",a);
assert(a>0&&b>a,'Correction 18 progression module missing');
const source=html.slice(a,b);
const dates=['2026-11-01','2026-11-08','2026-11-15','2026-11-22','2026-11-29'];
const mark=(n)=>Object.fromEntries(dates.map((d,i)=>[d,i<n]));
const batches=[
 {id:'ended',level:'Level 1',name:'Batch 1',status:'Completed',endedAt:'2026-10-01T11:00:00Z',
  minimumAttendanceAtEnd:50,sessionDates:dates},
 {id:'active1',level:'Level 1',name:'Batch 2',status:'Current',sessionDates:dates},
 {id:'active2',level:'Level 2',name:'Batch 1',status:'Current',sessionDates:dates},
 {id:'upcoming3',level:'Level 3',name:'Batch 2',status:'Upcoming',sessionDates:dates},
 {id:'active4',level:'Level 4',name:'Batch 3',status:'Current',sessionDates:dates},
 {id:'statusOnly',level:'Level 1',name:'Not formally ended',status:'Completed',sessionDates:dates}
];
const enrol=[
 {id:'old',batchId:'ended',studentId:'sOld',level:'Level 1',outcome:'Completed',attendance:mark(3),
  progressionFinalStatus:{key:'Eligible',label:'Eligible for Level 2',cls:'green'}},
 {id:'a1',batchId:'active1',studentId:'s1',level:'Level 1',outcome:'Enrolled',attendance:mark(3)},
 {id:'a1b',batchId:'active1',studentId:'s2',level:'Level 1',outcome:'Enrolled',attendance:mark(2),
  adminOverride:true,adminOverrideReason:'Enrollment approved',adminOverrideAt:'2026-08-01'},
 {id:'a2',batchId:'active2',studentId:'s3',level:'Level 2',outcome:'Enrolled',attendance:mark(3)},
 {id:'a3',batchId:'upcoming3',studentId:'s4',level:'Level 3',outcome:'Enrolled',attendance:mark(3)},
 {id:'a4',batchId:'active4',studentId:'s5',level:'Level 4',outcome:'Enrolled',attendance:mark(4)},
 {id:'sOnly',batchId:'statusOnly',studentId:'s6',level:'Level 1',outcome:'Enrolled',attendance:mark(3)}
];
const students=enrol.map(e=>({id:e.studentId,name:e.studentId}));
const state={classBatches:batches,classEnrollments:enrol,students};
let verified=null,saves=0,messages=[],rendered=0,adminRequests=0;
const dom={
 p2v546ProgressionForm:{onsubmit:null},
 p2v546Minimum:{value:'50'},
 p2v546ProgressionStatus:{textContent:''},
 p2ClassHeader:{querySelector(){return null}}
};
const context={
 state,$:id=>dom[id]||null,toast:s=>messages.push(String(s)),save:()=>saves++,today:()=> '2026-10-31',
 page:'settings',p2Levels:['Level 1','Level 2','Level 3','Level 4'],
 p2CourseName:b=>b.level,p2NextLevel:l=>({'Level 1':'Level 2','Level 2':'Level 3','Level 3':'Level 4','Level 4':'Kriya'})[l]||'',
 p2v53AttendanceSummary:(b,en)=>{
  const total=b.sessionDates.length,present=b.sessionDates.filter(d=>en.attendance[d]===true).length;
  return{total,present,absent:total-present,pct:Math.round(present*100/total)};
 },
 p2FindStudent:id=>students.find(s=>s.id===id),
 p2StudentEnrollments:id=>enrol.filter(e=>e.studentId===id),
 p2v55EligibilityFromHistory:()=>false,
 p2v55ProgressionRequirement:(id,batchId)=>({ok:false,reason:'simulated'}),
 p2v54ProgressionCheck:()=>({ok:false}),p2v54NextStatus:()=>({key:'old'}),
 p2EligibleFromLevel:()=>[],p2v53ProposedOutcome:()=> 'old',
 p2v53MissingAttendance:()=>[],p2v53FinalizeEndBatch(b){
   state.classEnrollments.filter(e=>e.batchId===b.id).forEach(e=>{
     e.outcome=context.p2v53ProposedOutcome(b,e);
     e.eligibleFor=e.outcome==='Completed'&&e.level!=='Level 4'?context.p2NextLevel(e.level):'';
   });
   b.endedAt='2026-10-31T14:00:00Z';b.status='Completed';context.save();
 },
 p2v5RenderHeader:()=>{},p2RenderClassWorkspace:()=>{rendered++},
 p2v56ChatRenderProgress:()=>{rendered++},p2ActiveBatch:()=>batches[1],
 v51RequireAdmin:(callback,purpose)=>{adminRequests++;verified={callback,purpose};return false},
 document:{createElement:()=>({style:{},textContent:'',insertAdjacentElement(){},remove(){}})}
};
vm.runInNewContext(source+'\n;globalThis.auditTest={setting:p2v546Setting,min:p2v546MinimumFor,qualify:p2v546Eligibility,exception:p2v546ApprovedException,finalize:p2v53FinalizeEndBatch,proposed:p2v53ProposedOutcome,history:p2v546QualifiesHistory};',context);
const T=context.auditTest,has=(e,b,key)=>assert.strictEqual(T.qualify(e,b).key,key);
assert.strictEqual(T.setting().minimumAttendance,50);
assert.strictEqual(T.min(batches[0]),50);
for(const id of ['a1','a2','a3'])has(enrol.find(e=>e.id===id),batches.find(b=>b.id===enrol.find(e=>e.id===id).batchId),'Eligible');
has(enrol[2],batches[1],'Review Required');
has(enrol[5],batches[4],'Review Required');
assert.match(T.qualify(enrol[5],batches[4]).label,/Acharya/);
const original=JSON.stringify({attendance:enrol.map(e=>e.attendance),students,batches:batches.map(b=>b.id)});
dom.p2v546Minimum.value='60';
dom.p2v546ProgressionForm.onsubmit({preventDefault(){}});
assert.strictEqual(T.setting().minimumAttendance,50,'Unverified admin action cannot mutate settings');
assert.strictEqual(adminRequests,1,'Settings change requires existing administrator login');
assert(verified.purpose.includes('Course Progression'));
verified.callback();
assert.strictEqual(T.setting().minimumAttendance,60);
assert.strictEqual(T.setting().audit.length,1);
assert.strictEqual(T.setting().audit[0].from,50);assert.strictEqual(T.setting().audit[0].to,60);
assert.deepStrictEqual([...T.setting().audit[0].affectedBatchIds].sort(),
 ['active1','active2','active4','statusOnly','upcoming3'].sort());
assert.strictEqual(T.min(batches[0]),50,'Ended batch keeps 50% snapshot');
for(const b of batches.slice(1))assert.strictEqual(T.min(b),60,'Every unended batch uses 60%');
has(enrol[0],batches[0],'Eligible');
for(const id of ['a1','a2','a3','sOnly']){const en=enrol.find(e=>e.id===id);has(en,batches.find(b=>b.id===en.batchId),'Eligible')}
assert.strictEqual(T.qualify(enrol[1],batches[1]).key,'Eligible','3/5 = 60%');
assert.strictEqual(T.qualify(enrol[2],batches[1]).key,'Review Required','2/5 below threshold');
assert.strictEqual(enrol[2].adminOverride,true,'Existing enrollment approval untouched');
assert.strictEqual(enrol[2].adminOverrideAt,'2026-08-01','Approval date preserved');
enrol[2].acharyaException={approved:true,approvedAt:'2026-09-15',approvedBy:'Acharya 1',reason:'Approved attendance exception',batchId:'active1'};
has(enrol[2],batches[1],'Eligible');
enrol[2].acharyaException.revokedAt='2026-10-30';
has(enrol[2],batches[1],'Review Required');
delete enrol[2].acharyaException;
has(enrol[5],batches[4],'Review Required');
assert.match(T.qualify(enrol[5],batches[4]).label,/Acharya/);
assert.strictEqual(batches[0].endedAt,'2026-10-01T11:00:00Z');
assert.strictEqual(enrol[0].outcome,'Completed');
assert.strictEqual(T.history('Level 2',[enrol[1]]),true,'Live threshold used for next-level guard');
assert.strictEqual(T.history('Level 2',[enrol[2]]),false,'Below threshold requires review');
assert.deepStrictEqual([...context.p2EligibleFromLevel('Level 4')],[],'No automatic Kriya eligibility');
assert.strictEqual(enrol[1].outcome,'Enrolled','Live eligibility must not change recorded outcome');
assert.strictEqual(JSON.stringify({attendance:enrol.map(e=>e.attendance),students,batches:batches.map(b=>b.id)}),original,
 'No attendance marks, student identities, or batch IDs changed');
// Snapshot at actual end, even if settings change afterwards.
const future={id:'justEnded',level:'Level 1',status:'Current',sessionDates:dates};
const finalEnrollment={id:'final',studentId:'s7',batchId:'justEnded',level:'Level 1',
 outcome:'Enrolled',attendance:mark(3)};
batches.push(future);enrol.push(finalEnrollment);
T.finalize(future);
assert.strictEqual(future.minimumAttendanceAtEnd,60);
assert.strictEqual(finalEnrollment.outcome,'Completed');
assert.strictEqual(finalEnrollment.progressionFinalStatus.key,'Eligible');
context.page='settings';assert.strictEqual(T.setting().minimumAttendance,60);
context.p2v546Dummy=0;
dom.p2v546Minimum.value='70';dom.p2v546ProgressionForm.onsubmit({preventDefault(){}});
verified.callback();
assert.strictEqual(T.setting().minimumAttendance,70);
assert.strictEqual(T.min(future),60,'New ended batch must retain historical 60%');
assert.strictEqual(T.qualify(finalEnrollment,future).key,'Eligible','Snapshot immutable after future changes');
assert.strictEqual(enrol[1].outcome,'Enrolled');
assert.strictEqual(T.setting().audit.length,2,'Every change logged');
assert(!html.includes('id="p2v546ExtraApproval"'),'No extra unrelated controls');
console.log('PASS: admin gate; 50->60->70 audit; active/upcoming update; formally ended frozen; eligibility exact thresholds; valid/revoked Acharya exceptions; Level 4 approval; attendance/student data unchanged');
