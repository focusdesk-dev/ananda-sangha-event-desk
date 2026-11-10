'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const h=fs.readFileSync('index.html','utf8');
const main=fs.readFileSync('main.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const results=[];
function test(id,requirement,fn,level='source'){
  try{fn();results.push({id,requirement,status:'PASS',level});}
  catch(e){results.push({id,requirement,status:'FAIL',level,error:String(e.message||e)});}
}
const has=x=>assert.ok(h.includes(x),'Missing production code: '+x);
const absent=x=>assert.ok(!h.includes(x),'Obsolete UI code remains: '+x);
const segment=(from,to)=>{
 const a=h.indexOf(from),b=h.indexOf(to,a+from.length);
 assert.ok(a>=0&&b>a,'Cannot locate '+from+' → '+to);return h.slice(a,b);
};
function makeDates(type){
 const fields={p2BatchStart:{value:'2026-11-08'},p2BatchEnd:{value:''},
  p2v537ClassCount:{value:'2'},p2BatchScheduleType:{value:type},p2BatchDay:{value:'0'}};
 const src=segment('  let p2v545Driver=', '  // Keep default batch settings');
 const fn=new Function('$','p2v537IsDate',src+';return {run:p2v545Recalculate,generate:p2v545Sessions};')(
   id=>fields[id],d=>/^\d{4}-\d{2}-\d{2}$/.test(d));
 fn.run('count');return{fields,fn};
}
function deleteFixture(linked,ended=false){
 const src=segment("  $('p2DeleteBatch').onclick=()=>{","  function p2RegisterNext");
 let admin=0,confirmCalls=0;
 const state={classBatches:[{id:'batch',name:'Batch 1',endedAt:ended?'2026-11-01':''}],
  classEnrollments:linked?[{id:'en',batchId:'batch',attendance:{'2026-11-01':true},paymentStatus:'Paid'}]:[],
  activeClassBatchId:'batch',students:[],outreach:[]};
 const nodes={p2DeleteBatch:{},p2BatchId:{value:'batch'},p2BatchModal:{classList:{remove(){}}}};
 const click=new Function('$','state','v51RequireAdmin','confirm','prompt','p2CourseName','save','switchPage','toast',
  src+';return $("p2DeleteBatch").onclick;')(
  id=>nodes[id],state,cb=>{admin++;cb()},()=>{confirmCalls++;return true},()=> 'DELETE',b=>b.name,()=>{},()=>{},()=>{});
 click();
 return {state,admin,confirmCalls};
}
function deletionMutationFixture(linked,ended=false){
 const src=segment("  function p2DeleteBatchRecords(id){","  $('p2DeleteBatch').onclick=");
 const state={classBatches:[{id:'batch',name:'Batch 1',endedAt:ended?'2026-11-01':''}],
   classEnrollments:linked?[{id:'en',studentId:'student',batchId:'batch',attendance:{'2026-11-01':true},paymentStatus:'Paid'}]:[],
   activeClassBatchId:'batch',students:linked?[{id:'student'}]:[],outreach:[]};
 const apply=new Function('state',src+';return p2DeleteBatchRecords;')(state);
 const deleted=apply('batch');return{state,deleted};
}
function classesFixture(){
 const src=segment("  let p2v510ClassYear='';","  if($('p2ClassBatches'))");
 const state={courseTypes:[{id:'k',name:'Kriya'},{id:'k2',name:'Kriya 2'}],
  classBatches:[{id:'2',courseId:'k2',name:'Batch 2',start:'2026-11-01',status:'Current'},
    {id:'1',courseId:'k',name:'Batch 1',start:'2026-11-08',status:'Current'},
    {id:'3',courseId:'k',name:'Archived',start:'2026-11-15',status:'Current',archivedAt:'2026-11-15'}]};
 const fields={p2ClassList:{innerHTML:'',querySelectorAll:()=>[]},
  p2CourseFilter:{innerHTML:'',value:'all',options:[]}};
 const $=id=>fields[id]||(fields[id]={});
 const code="let p2RenderClasses;let p2v56ChatSelectedClass='';"+src+";return {show:p2RenderClasses,year:x=>p2v510ClassYear=x}";
 const app=new Function('$','state','p2v55SyncBatchStatuses','p2FullChain','p2BatchYear',
  'p2v56ChatActive','p2v56ChatClassCard','p2v56ChatOpenBatch','p2OpenBatch','esc','p2v553BatchOrder','p2CourseRank',code)(
  $,state,()=>{},['Level 1','Level 2','Level 3','Level 4','Kriya','Kriya 2','Kriya 3','Kriya 4'],
  ()=>2026,b=>b.status==='Current',b=>'<div class="p2v56-chat-class">'+(b.courseId==='k'?'Kriya':'Kriya 2')+' '+b.name+'</div>',
  ()=>{},()=>{},x=>String(x),(a,b)=>(a.courseId==='k'?0:1)-(b.courseId==='k'?0:1),name=>['Level 1','Level 2','Level 3','Level 4','Kriya','Kriya 2','Kriya 3','Kriya 4','STT','STT 2'].indexOf(name));
 app.year('2026');app.show();return fields.p2ClassList.innerHTML;
}
test(1,'Only one authorised Delete Batch handler; direct card Delete action',()=>{assert.equal(h.split("$('p2DeleteBatch').onclick=").length-1,1);has("p2v56-chat-delete");has("$('p2DeleteBatch').click();")},'functional');
test(2,'Delete Batch requires admin approval',()=>assert.equal(deleteFixture(true).admin,1),'functional');
test(3,'Linked history permanently deleted',()=>{const t=deletionMutationFixture(true);assert.equal(t.state.classEnrollments.length,0);assert.equal(t.state.classBatches.length,0);assert.equal(t.state.students.length,0);},'functional');
test(4,'Empty batch may be deleted after confirmation',()=>{
 const t=deletionMutationFixture(false);assert.equal(t.state.classBatches.length,0);assert.equal(t.deleted.students,0);},'functional');
test(5,'Ended batch is permanently deleted',()=>{const t=deletionMutationFixture(false,true);assert.equal(t.state.classBatches.length,0);},'functional');
test(6,'Archived batches absent from visible Classes listing',()=>assert.ok(!classesFixture().includes('Archived')),'functional');
test(7,'Kriya before Kriya 2 in visible Classes listing',()=>{
 const x=classesFixture();assert.ok(x.indexOf('Kriya Batch 1')<x.indexOf('Kriya 2 Batch 2'));},'functional');
test(8,'All eight canonical course levels retained',()=>{for(const c of ['course-l1','course-l2','course-l3','course-l4','course-kriya','course-kriya2','course-kriya3','course-kriya4'])has(c)});
test(9,'Batch and Student Progress dropdowns use canonical stage order',()=>{has("function p2v553BatchOrder");has("function p2v520AvailableCourses()");has("p2CourseRank(a.name)-p2CourseRank(b.name)")});
test(10,'Balanced two-column New/Edit Batch form',()=>{has('id="p2BatchForm"');has('class="form-grid"');has('id="p2v537ClassCount"')});
test(11,'Individual class dates live only in Class Schedule',()=>absent('id="p2v549ManualDatesField"'));
test(12,'Weekly Start + 2 classes calculates 15 Nov 2026',()=>assert.equal(makeDates('weekly').fields.p2BatchEnd.value,'2026-11-15'),'functional');
test(13,'End Date recalculates class count',()=>{
 const f=makeDates('weekly');f.fields.p2BatchEnd.value='2026-11-29';f.fn.run('end');assert.equal(f.fields.p2v537ClassCount.value,'4');},'functional');
test(14,'Custom dates are not fabricated',()=>assert.equal(makeDates('custom').fields.p2BatchEnd.value,''),'functional');
test(15,'Minimal Batch form has no verbose End Date help',()=>absent('id="p2v553DateHint"'));
test(16,'Kriya 2 session edits preserve existing records',()=>has('p2v547SavePlannedDate'));
test(17,'Saved schedules and attendance dates guarded',()=>has('An existing attendance date would be lost'));
test(18,'Student Progress page has no duplicate inner title',()=>absent("'<h3>Student Progress</h3><div class=\"p2v520-tabs\">'"));
test(19,'Redundant Student Progress and Class Batch subtitles removed',()=>{has("studentProgress:['Student Progress',''],classWorkspace:['Class Batch','']")});
test(20,'Student Progress five exact groups in order',()=>has("const p2v520Groups=['All','In Progress','Incomplete / Withdrawn','Eligible',"));
test(21,'Student Wise is second main tab, not Follow-Ups',()=>has('<button id="p2v520Followups">Student Wise</button>'));
test(22,'Student Wise search accepts student name or mobile',()=>{has("function p2v526StudentWise(body)");has('Search by name or mobile')});
test(23,'Student Wise shows complete historical batches and attendance',()=>{has('p2v56ChatStudentEnrollments(student.id)');has('p2v520ShowHistory()')});
test(24,'Review invokes authorised decision',()=>{has('p2v558-review');has('p2v550OpenApproval(student.id,x.source.b.id)')});
test(25,'Kriya approval is explicit and individually audited',()=>{has('acharyaProgressionApprovals');has('acharyaProgressionHistory');has('v51RequireAdmin(()=>')});
test(26,'Zero-percent earlier enrolment does not automatically qualify',()=>{has("if(decision.key!=='Eligible')continue;");has("a.pct<p2v546MinimumFor(b)")});
test(27,'50 percent default with ended-batch snapshot',()=>{has('minimumAttendanceAtEnd');has('p2v546MinimumFor')});
test(28,'Late joining attendance logic retained',()=>{has('joinedFromClass');has('Not assessed')});
test(29,'Class Batch shows read-only progress and fee',()=>{has('p2v519Summary');has('<th>Payment</th>');has('p2v553-roster-layout')});
test(30,'Dedicated QR/photo Class Attendance remains',()=>{has('classAttendanceHub');has('Mark remaining absent');assert.ok(h.toLowerCase().includes('photos received'))});
test(31,'Contextual enrol shortcut and save shortcut remain',()=>{assert.ok(main.includes('ananda-shortcut'));assert.ok(main.includes("sendShortcut('save')")&&h.includes("runShortcut(save?'save':'add')"));assert.ok(main.includes('renderer owns the context-aware')||main.includes("renderer owns the context-aware"))});
test(32,'Offline backup and installer identity/shortcuts',()=>{
 assert.ok(main.includes('FIVE_DAYS_MS'));assert.ok(main.includes('DATA_ROOT'));
 assert.ok(pkg.build.nsis.createDesktopShortcut&&pkg.build.nsis.createStartMenuShortcut);
 assert.equal(pkg.version,'2.0.0-beta.5.81.2');assert.ok(main.includes('app.getVersion()'));});
const failed=results.filter(x=>x.status==='FAIL');
fs.mkdirSync('verification',{recursive:true});
fs.writeFileSync('verification/acceptance-32.json',JSON.stringify({
 title:'32 acceptance checks derived from documented approvals; not a reconstruction of unknown historical correction numbers',
 version:pkg.version,total:results.length,passed:results.length-failed.length,failed:failed.length,
 type:'source and controlled functional checks; real installation and user-data upgrade tested separately',
 results},null,2));
for(const r of results)console.log(String(r.id).padStart(2,'0')+' '+r.status+' ['+r.level+'] '+r.requirement+(r.error?' — '+r.error:''));
console.log('TOTAL '+results.length+' PASS '+(results.length-failed.length)+' FAIL '+failed.length);
if(failed.length)process.exitCode=1;
