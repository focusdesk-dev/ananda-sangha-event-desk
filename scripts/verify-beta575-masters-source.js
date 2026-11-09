'use strict';
(function checkMastersSource(){
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'2.0.0-beta.5.77');
const frozen=fs.readFileSync('scripts/frozen-sidebar-beta573.txt','utf8');
const aside=html.slice(html.indexOf('<aside'),html.indexOf('</aside>')+8);
assert.equal(aside,frozen,'Frozen left taskbar markup differs from the approved baseline');
assert(html.includes('function anandaV575('),'Unified master-page implementation missing');
for(const key of ['volunteers','attendeeMaster','vips','kriyabans','students','acharyas','courseMaster','kriya2Master','kriya3Master','kriya4Master','sttMaster']){
  assert(html.includes(key),'Missing master '+key);
}
const base=html.indexOf('function anandaV575('),end=html.indexOf('  resetEventForm();',base);
const source=html.slice(base,end);
assert(source.includes("if(!v51MasterUnlocked)return"),'Original master admin permissions must survive');
assert(source.includes("v51RequireAdmin(()=>openStage(spec)"),'Advanced masters must be password-protected');
assert(source.includes("!batch.endedAt"),'Advanced masters must require formally ended batches');
assert(source.includes("en.outcome!=='Completed'"),'Advanced masters must require completed outcomes');
assert(source.includes("const unique=new Map()"),'Repeated course attempts must not create duplicate master rows');
assert(source.includes("photoViewer.querySelector('img').src=v.photo"),'VIP preview not connected to stored photo');
assert(source.includes("id=\"v575VipMobile\""),'Optional VIP phone input missing');
assert(source.includes("id=\"v575VipCategory\""),'Optional VIP category missing');
assert(source.includes("g('kriyabanTable').innerHTML=table(['Name','Phone','Kriya Initiation Date']"),'Kriyaban notes still shown in final renderer');
assert(source.includes("g('p2StudentTable').innerHTML=table(['Name','Phone','Latest Course','Status']"),'Student list not simplified');
assert(source.includes("g('p2AcharyaTable').innerHTML=table(['Name','Phone','Assigned Classes']"),'Acharya list not simplified');
assert(source.includes("if(g('p2AddCourse'))g('p2AddCourse').textContent='+ ADD COURSE'"),'Course Master action not updated');
const from=source.indexOf('  function stageOf(batch){'),to=source.indexOf('  function stageRender(spec){',from);
assert(from>0&&to>from,'Stage view functions absent');
const state={
  classBatches:[
    {id:'b2a',courseId:'course-kriya2',start:'2026-05-01',end:'2026-05-30',endedAt:'2026-05-30'},
    {id:'b2b',courseId:'course-kriya2',start:'2026-06-01',end:'2026-06-30',endedAt:'2026-06-30'},
    {id:'b2active',courseId:'course-kriya2',start:'2026-07-01',end:'2026-07-30'},
    {id:'b3',courseId:'course-kriya3',endedAt:'2026-03-30'},
    {id:'b4',courseId:'course-kriya4',endedAt:'2026-04-30'},
    {id:'bstt',courseId:'course-stt',endedAt:'2026-02-28'},
    {id:'barchived',courseId:'course-stt',endedAt:'2026-02-28',archivedAt:'2026-10-01'},
    {id:'bl2',courseId:'course-l2',endedAt:'2026-01-15'},
  ],
  classEnrollments:[
    {id:'1',studentId:'a',batchId:'b2a',outcome:'Completed',completionDate:'2026-05-30'},
    {id:'2',studentId:'a',batchId:'b2b',outcome:'Completed',completionDate:'2026-06-30'},
    {id:'3',studentId:'b',batchId:'b2active',outcome:'Completed'},
    {id:'4',studentId:'c',batchId:'b3',outcome:'Completed'},
    {id:'5',studentId:'d',batchId:'b4',outcome:'Completed'},
    {id:'6',studentId:'e',batchId:'bstt',outcome:'Completed'},
    {id:'7',studentId:'f',batchId:'barchived',outcome:'Completed'},
    {id:'8',studentId:'g',batchId:'bl2',outcome:'Completed'},
    {id:'9',studentId:'h',batchId:'b2b',outcome:'Withdrawn'}
  ]
};
const fn=new Function('state','p2CourseForBatch','p2v5Person','normMobile','sortNames',
  source.slice(from,to)+'return stageRows;')(
    state,b=>({name:({ 'course-kriya2':'Kriya 2','course-kriya3':'Kriya 3','course-kriya4':'Kriya 4','course-stt':'STT'}[b.courseId]||'Level 2')}),
    en=>({name:en.studentId,mobile:en.studentId+'1234'}),x=>x,
    (a,b)=>a.name.localeCompare(b.name)
  );
assert.deepEqual(fn('Kriya 2').map(x=>x.name),['a'],'Kriya 2 should deduplicate and exclude active/noncompleted');
assert.equal(fn('Kriya 2')[0].date,'2026-06-30','Latest completed attempt missing');
assert.deepEqual(fn('Kriya 3').map(x=>x.name),['c']);
assert.deepEqual(fn('Kriya 4').map(x=>x.name),['d']);
assert.deepEqual(fn('STT').map(x=>x.name),['e'],'Archived course should not count');
console.log('PASS 5.75 ten separate master screens, auto-course master rules, VIP photo, original permissions, one-row design and byte-identical frozen sidebar');
})();
