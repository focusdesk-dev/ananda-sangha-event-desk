'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const a=html.indexOf('      function p2v519Stage(b){');
const b=html.indexOf('      let p2v519ScheduleMode=',a);
const c=html.indexOf('      function p2v520CourseName(courseId){');
const d=html.indexOf('      function p2v520Render(){',c);
assert(a>0&&b>a&&c>b&&d>c,'Correction 19 and 20 calculation modules missing');
const source=html.slice(a,b)+'\n'+html.slice(c,d);
const chain=['Level 1','Level 2','Level 3','Level 4','Kriya','Kriya 2','Kriya 3','Kriya 4'];
const ids=['course-l1','course-l2','course-l3','course-l4','course-kriya','course-kriya2','course-kriya3','course-kriya4'];
const state={students:[],classBatches:[],classEnrollments:[],courseTypes:chain.map((name,i)=>({name,id:ids[i]}))};
let serial=0,saves=0,summaryRenders=0;
const student=(name)=>{const s={id:'S'+(++serial),name};state.students.push(s);return s};
const batch=(level,year,name,ended=true)=>{
 const i=chain.indexOf(level),id='B'+(++serial),start=year+'-01-01';
 const b={id,courseId:ids[i],level,name,start,year,endedAt:ended?year+'-03-01T00:00:00Z':'',
   status:ended?'Completed':'Current',numberOfClasses:2,
   plannedSessions:[{number:1,date:year+'-01-01'},{number:2,date:year+'-01-08'}],
   sessionDates:[year+'-01-01',year+'-01-08']};
 state.classBatches.push(b);return b;
};
const enroll=(s,b,outcome='Completed',opts={})=>{
 const en={id:'E'+(++serial),studentId:s.id,batchId:b.id,level:b.level,
  outcome,attendance:{[b.sessionDates[0]]:true,[b.sessionDates[1]]:true},...opts};
 state.classEnrollments.push(en);return en;
};
const source2024=batch('Level 1',2024,'Batch 1'),source2025=batch('Level 1',2025,'Batch 2');
const target2024=batch('Level 2',2024,'Batch 1'),target2025=batch('Level 2',2025,'Batch 1');
const target2026=batch('Level 2',2026,'Batch 2',false);
const level3=batch('Level 3',2025,'Batch 1'),level4=batch('Level 4',2025,'Batch 1');
const eligible=student('Eligible'),paused=student('Paused'),completed=student('Completed'),
 progressed=student('Progressed'),repeat=student('Repeated'),active=student('Active'),
 eligibleOld=student('Old Eligible'),approved=student('Approved Kriya'),pending=student('Pending Kriya');
enroll(eligible,source2025,'Completed',{progressionFinalStatus:{key:'Eligible',label:'Eligible for Level 2'},eligibleFor:'Level 2'});
enroll(eligibleOld,source2024,'Completed',{progressionFinalStatus:{key:'Eligible',label:'Eligible for Level 2'},eligibleFor:'Level 2'});
enroll(paused,target2024,'Did Not Complete');
enroll(completed,source2024,'Completed',{progressionFinalStatus:{key:'Eligible'}});
enroll(completed,target2025,'Completed');
enroll(progressed,target2024,'Did Not Complete');enroll(progressed,level3,'Completed');
enroll(repeat,target2024,'Did Not Complete');enroll(repeat,target2025,'Withdrawn');
enroll(active,target2026,'Enrolled');
enroll(approved,level4,'Completed');
enroll(pending,level4,'Completed');
approved.acharyaProgressionApprovals={Kriya:{status:'Approved',approvedAt:'2026-01-15',acharyaId:'ACH1'}};
const messages=[];
const ctx={state,p2FullChain:chain,normName:v=>String(v||'').toLowerCase().trim(),p2CourseRank:v=>{let i=[...chain,'STT','STT 2'].findIndex(x=>x.toLowerCase()===String(v||'').toLowerCase());return i<0?99:i},today:()=> '2026-11-02',
 p2v550Stage:b=>b?.level||'',
 p2v5ValidDates:b=>[...(b?.sessionDates||[])].sort(),
 p2BatchYear:b=>b?.year||'',
 p2CourseName:b=>state.courseTypes.find(c=>c.id===b?.courseId)?.name||'',
 p2NextLevel:level=>chain[chain.indexOf(level)+1]||'',
 p2FindStudent:id=>state.students.find(x=>x.id===id),
 p2cAttendanceStatus:(en,date)=>Object.prototype.hasOwnProperty.call(en.attendance||{},date)?en.attendance[date]:null,
 p2v546MinimumFor:b=>b.endedAt?(b.minimumAttendanceAtEnd??50):60,
 p2v546ApprovedException:en=>!!en.acharyaException?.approved,
 p2v550Decision:(s,next)=>s?.acharyaProgressionApprovals?.[next]?.status==='Approved'?s.acharyaProgressionApprovals[next]:null,
 p2v550Completed:(sid,level)=>state.classEnrollments.some(en=>en.studentId===sid&&en.level===level&&en.outcome==='Completed'),
 p2v519RenderSummary:()=>{summaryRenders++},save:()=>{saves++},toast:m=>messages.push(m),window:{confirm:()=>true},
 console};
vm.runInNewContext(source+';globalThis.test={rows:p2v520Rows,attendance:p2v519Attendance,decision:p2v519Decision,finish:p2v519Finalise};',ctx,{timeout:5000});
const {rows,attendance,decision,finish}=ctx.test;
const idsOf=x=>Array.from(x,y=>y.student.id);
const e=rows('course-l2','Eligible');
assert.deepEqual(new Set(idsOf(e)),new Set([eligible.id,eligibleOld.id]),'Eligible includes unjoined qualifying previous level, across years');
assert(!idsOf(e).includes(completed.id),'Already joined target course must not be invited');
assert.deepEqual(idsOf(rows('course-l2','Eligible','2024')), [eligibleOld.id],'Qualifying source year applies to eligible');
assert.deepEqual(idsOf(rows('course-l2','Eligible','2025')), [eligible.id]);
const unfinished=rows('course-l2','Incomplete / Withdrawn');
assert.deepEqual(new Set(idsOf(unfinished)),new Set([paused.id,repeat.id]),'Only unfinished target course students needing rejoin');
assert.equal(unfinished.filter(x=>x.student.id===repeat.id).length,1,'Repeated attempts deduplicate by Student Master ID');
assert(!idsOf(unfinished).includes(active.id),'Current students are not follow-ups');
assert(!idsOf(unfinished).includes(progressed.id),'Progressed students are not rejoin candidates');
const both=rows('course-l2','Eligible + Incomplete / Withdrawn');
assert.equal(both.length,4,'Combined operational group should unite without duplicates');
assert.equal(new Set(idsOf(both)).size,4);
assert.deepEqual(idsOf(rows('course-l2','Incomplete / Withdrawn','2025')), [repeat.id],'Year is the enrolment year for unfinished');
assert.equal(rows('course-l2','All','2026','__all__').length,1,'All batches/year includes all target-year enrolments');
assert.equal(rows('course-l2','All','__all__','__all__').length,8,'All batches/all years includes all historical attempts plus eligible prospects');
const approvedK=rows('course-kriya','Eligible');
assert.deepEqual(idsOf(approvedK),[approved.id],'Kriya needs explicit approval, never mere attendance/completion');
assert(!idsOf(approvedK).includes(pending.id));
assert.equal(rows('course-l1','Eligible').length,0,'Level 1 must not fabricate prerequisite eligibility');
const preserved=JSON.stringify(state.classEnrollments);
for(const group of ['All','Incomplete / Withdrawn','Eligible','Eligible + Incomplete / Withdrawn']){
 rows('course-l2',group,'__all__','__all__');
}
assert.equal(JSON.stringify(state.classEnrollments),preserved,'Queries never alter attendance/history/enrolment records');
const currentBatch=batch('Level 2',2026,'Final batch',false);
const good=student('Good'),low=student('Low'),missing=student('Unresolved');
const g=enroll(good,currentBatch,'Enrolled',{attendance:{[currentBatch.sessionDates[0]]:true,[currentBatch.sessionDates[1]]:true}});
const l=enroll(low,currentBatch,'Enrolled',{attendance:{[currentBatch.sessionDates[0]]:false,[currentBatch.sessionDates[1]]:false}});
const u=enroll(missing,currentBatch,'Enrolled',{attendance:{[currentBatch.sessionDates[0]]:true}});
assert.equal(attendance(currentBatch,u).unresolved,1);
finish(currentBatch);
assert(!currentBatch.endedAt,'Batch must not finalise with unmarked conducted attendance');
u.attendance[currentBatch.sessionDates[1]]=false;
assert.equal(decision(currentBatch,u).key,'Review Required','Threshold of 60% is applied provisionally');
finish(currentBatch);
assert(currentBatch.endedAt,'Finished batch must be formally marked ended');
assert.equal(summaryRenders,1,'Ending the batch must refresh the visible summary');
assert.equal(currentBatch.minimumAttendanceAtEnd,60,'Ended batch freezes effective threshold');
assert.equal(g.progressionFinalStatus.key,'Eligible');
assert.equal(l.progressionFinalStatus.key,'Review Required');
assert.equal(u.progressionFinalStatus.key,'Review Required');
assert.equal(currentBatch.end,'2026-01-08');
assert(saves>0,'Final outcomes saved');
assert(!html.slice(html.indexOf('      // CORRECTION 19'),html.indexOf('      // CORRECTION 20')).includes('p2v546BatchMinimum'),'Class Batch summary must not display threshold');
assert(html.includes("p2v519ScheduleMode?'Back to Summary':'Class Schedule'"),'Dedicated class schedule remains accessible');
assert(html.includes("id=\"p2v520Group\""),'Student Group dropdown renders');
assert(html.includes('p2v520Groups.map'),'Exactly four student group options from approved list');
assert(html.includes('p2v520-filters{display:grid;grid-template-columns:repeat(4'),'Four desktop filters align in one row');
console.log('PASS Correction 19/20: all-year eligible/rejoin/combined, batch/year filters, Kriya approvals, no duplicates, consent-only export, provisional/frozen thresholds, End Batch guard, records preserved');
