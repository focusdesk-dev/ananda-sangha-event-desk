'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const begin=html.indexOf('  function p2v621FollowupRows(');
const end=html.indexOf('  function p2v621FollowupRender(',begin);
assert.ok(begin>=0&&end>begin,'Class Reports-only follow-up function missing');
const source=html.slice(begin,end).trim();
const chain=['Level 1','Level 2','Level 3','Level 4','Kriya','Kriya 2','Kriya 3','Kriya 4'];
const rows=new Function('p2v621Chain',source+';return p2v621FollowupRows;')(chain);
const courses=chain.map((name,i)=>({id:'course-'+(i+1),name}));
const batch=(id,level,start,endedAt='2026-09-01',status='Completed')=>({id,name:id,courseId:'course-'+level,start,endedAt,status});
const batches=[
 batch('L1-2025',1,'2025-01-01'),
 batch('L2-2025',2,'2025-02-01'),
 batch('L2-2026',2,'2026-01-01','', 'Current'),
 batch('L3-2025',3,'2025-03-01')
];
const people=[
 {id:'eligible',name:'A Eligible'},
 {id:'rejoin',name:'B Rejoin'},
 {id:'completed',name:'C Completed'},
 {id:'progressed',name:'D Progressed'},
 {id:'enrolled',name:'E Enrolled'},
 {id:'duplicate',name:'F Duplicate'},
 {id:'inprogress',name:'G In Progress'}
];
const en=(id,studentId,batchId,outcome)=>({id,studentId,batchId,outcome});
const enrolments=[
 en('1','eligible','L1-2025','Completed'),
 en('2','rejoin','L2-2025','Withdrawn'),
 en('3','completed','L2-2025','Completed'),
 en('4','progressed','L2-2025','Incomplete'),
 en('5','progressed','L3-2025','Completed'),
 en('6','enrolled','L1-2025','Completed'),
 en('7','enrolled','L2-2026','Enrolled'),
 en('8','duplicate','L1-2025','Completed'),
 en('9','duplicate','L1-2025','Completed'),
 en('10','inprogress','L2-2026','Enrolled')
];
const data={students:people,courseTypes:courses,batches,enrolments};
const get=(group,year='__all__',batchId='__all__')=>rows(data,'course-2',group,year,batchId,(_b,e)=>e.outcome==='Completed');
const eligible=get('Eligible');
assert.deepEqual(eligible.map(x=>x.student.id),['duplicate','eligible'],'Level 1 eligible, not joined Level 2');
assert.ok(!eligible.some(x=>x.student.id==='enrolled'),'Never invite someone already joined Level 2');
const unfinished=get('Incomplete / Withdrawn');
assert.deepEqual(unfinished.map(x=>x.student.id),['rejoin'],'Only non-completers without later completion/progression');
const combined=get('Eligible + Incomplete / Withdrawn');
assert.deepEqual(combined.map(x=>x.student.id),['duplicate','eligible','rejoin']);
assert.equal(new Set(combined.map(x=>x.student.id)).size,combined.length,'Combined rows must be unique');
const selected=new Set(['eligible','rejoin']);
const exported=combined.filter(x=>selected.has(x.student.id));
assert.deepEqual(exported.map(x=>x.student.id),['eligible','rejoin'],'Export Selected includes selected only');
assert.equal(get('Eligible','2026').length,0,'Eligible year refers to prior cohort');
assert.equal(get('Incomplete / Withdrawn','2025').length,1,'Incomplete year refers to target enrolment year');
assert.equal(get('Incomplete / Withdrawn','__all__','L2-2026').length,0,'Batch narrows target rejoin rows');
assert.ok(html.includes("p2Csv(selected.map(r=>("),'Selected export calls existing CSV function');
assert.ok(html.includes("v51RequireAdmin(()=>p2Csv(selected.map(r=>("),'Selected export remains administrator-protected');
assert.ok(html.includes("const p2v621Groups=['All','Incomplete / Withdrawn','Eligible','Eligible + Incomplete / Withdrawn']"));
const a=html.indexOf('  function p2v56RenderBatchReport(panel){');
const z=html.indexOf('  function p2v56EnsureStyle(){',a);
const report=html.slice(a,z);
assert.ok(!report.includes('<th>Outcome</th>'),'Outcome column removed from rendered Class Reports batch table');
assert.ok(report.includes('<th>Payment</th>')&&report.includes('<th>Attendance</th>')&&report.includes('<th>Next Level Status</th>'));
for(const x of ['p2v54ExportBatch','p2v517AttendanceReport','p2v54StudentList','p2v54Annual'])assert.ok(html.includes(x),'Preserved existing report '+x);
console.log('PASS 21A #1 Level 2 Eligible excludes already-enrolled students');
console.log('PASS 21A #2 Incomplete/Withdrawn excludes completed and progressed students');
console.log('PASS 21A #3 Combined unique and selected-only export filtering');
console.log('PASS 21A year/batch semantics, admin export, layout and retained reports');