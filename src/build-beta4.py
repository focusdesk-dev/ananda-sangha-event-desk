from pathlib import Path
import re

path = Path('src/index.html')
text = path.read_text(encoding='utf-8')


def must_replace(old, new, label, count=1):
    global text
    n = text.count(old)
    if n < count:
        raise SystemExit(f'{label}: expected at least {count} occurrence(s), found {n}')
    text = text.replace(old, new, count)


def replace_between(start_marker, end_marker, new_text, label):
    global text
    s = text.find(start_marker)
    if s < 0:
        raise SystemExit(f'{label}: start marker not found')
    e = text.find(end_marker, s)
    if e < 0:
        raise SystemExit(f'{label}: end marker not found')
    text = text[:s] + new_text + text[e:]

# Version marker in the generated HTML.
text = text.replace('2.0.0-beta.3', '2.0.0-beta.4')
text = text.replace('PHASE2 CLASSES NAV BETA3', 'PHASE2 CLASSES NAV BETA4')

old_active_card = '''      <div class="card" id="p2BatchListCard">
        <div class="card-head"><div><h3>Active Classes</h3><div class="card-sub">Only current and upcoming batches created from + New Class Batch are shown here.</div></div></div>
        <div class="p2-toolbar">
          <select id="p2CourseFilter"><option value="all">All courses</option></select>
          <input id="p2ClassSearch" class="search" placeholder="Search active or past class, Acharya or year">
        </div>
        <div id="p2ClassList" style="margin-top:16px"></div>
      </div>

      <div class="card" id="p2PastClassCard" style="margin-top:18px">
        <div class="card-head"><div><h3>Past Classes</h3><div class="card-sub">Completed classes are filed under the year they started. Click a year to open or fold it.</div></div></div>
        <div id="p2PastClassList" style="margin-top:8px"></div>
      </div>'''
new_active_card = '''      <div class="card" id="p2BatchListCard">
        <div class="card-head"><div><h3>Classes by Year</h3><div class="card-sub">One box per year. Double-click a year to see all its classes. Active classes stay above completed/inactive classes.</div></div></div>
        <div class="p2-toolbar">
          <select id="p2CourseFilter"><option value="all">All courses</option></select>
          <input id="p2ClassSearch" class="search" placeholder="Search class, Acharya or year">
        </div>
        <div id="p2ClassList" style="margin-top:16px"></div>
      </div>

      <div class="card" id="p2PastClassCard" style="display:none" aria-hidden="true">
        <div id="p2PastClassList"></div>
      </div>'''
must_replace(old_active_card, new_active_card, 'classes year card')

old_workspace = '''    <section id="classWorkspace" class="page">
      <div id="p2ClassHeader" class="event-banner"></div>
      <div id="p2ClassStats" class="p2-kpis"></div>
      <div class="grid two"><div class="card"><div class="card-head"><div><h3>Batch roster & attendance</h3><div class="card-sub">Each student keeps a separate attempt and per-session attendance.</div></div><button id="p2EnrollStudent" class="btn small">+ Enrol student</button></div><div id="p2ClassRoster"></div></div><div class="card"><div class="card-head"><div><h3>Sessions</h3><div class="card-sub">Attendance dates for this batch.</div></div></div><div id="p2SessionList"></div><div class="p2-note" style="margin-top:14px">Batch year is based on the start date, even when classes continue into the next calendar year.</div></div></div>
      <div class="card" style="margin-top:18px"><div class="card-head"><div><h3>Next-stage outreach</h3><div class="card-sub">Students disappear automatically once they enrol in the next level.</div></div></div><div id="p2BatchOutreach"></div></div>
    </section>'''
new_workspace = '''    <section id="classWorkspace" class="page">
      <div id="p2ClassHeader" class="event-banner"></div>
      <div id="p2ClassStats" class="p2-kpis"></div>
      <div class="card">
        <div class="card-head"><div><h3>Batch roster &amp; attendance</h3><div class="card-sub">Students are rows and actual class dates are columns. Click a cell to cycle Not marked → Present → Absent → Not marked.</div></div><button id="p2EnrollStudent" class="btn small">+ Enrol student</button></div>
        <div class="p2-toolbar"><input id="p2AttendanceGridSearch" class="search" placeholder="Search enrolled person by name or mobile"></div>
        <div class="p2-attendance-layout"><div id="p2ClassRoster"></div><aside id="p2AttendanceSummary" class="p2-attendance-summary"></aside></div>
      </div>
      <div class="card" style="margin-top:18px">
        <div class="card-head"><div><h3>Class dates</h3><div class="card-sub">Dates may be generated, added one-by-one, or extended with Next Class.</div></div><div class="actions"><button id="p2AddClassDate" class="btn secondary small">+ Add Class Date</button><button id="p2NextClass" class="btn small">+ Next Class</button><button id="p2MarkBatchComplete" class="btn ghost small">Mark Class Complete</button></div></div>
        <div id="p2SessionList"></div><div class="p2-note" style="margin-top:14px">If the end date is unknown, leave it blank. The batch stays ongoing until you mark it complete.</div>
      </div>
      <div class="card" style="margin-top:18px"><div class="card-head"><div><h3>Next-stage outreach</h3><div class="card-sub">Students in Student Master disappear automatically once they enrol in the next level.</div></div></div><div id="p2BatchOutreach"></div></div>
    </section>'''
must_replace(old_workspace, new_workspace, 'class workspace')

old_batch = '''<div id="p2BatchModal" class="modal-backdrop"><form id="p2BatchForm" class="modal"><div class="modal-head"><h3 id="p2BatchModalTitle">New class batch</h3><button type="button" class="x" data-close="p2BatchModal">×</button></div><input id="p2BatchId" type="hidden"><div class="form-grid"><div class="field"><label>COURSE *</label><select id="p2BatchCourse" required></select></div><div class="field"><label>BATCH NAME / NUMBER *</label><input id="p2BatchName" required placeholder="e.g. Batch 2"></div><div class="field"><label>START DATE *</label><input id="p2BatchStart" type="date" required></div><div class="field"><label>END DATE</label><input id="p2BatchEnd" type="date"></div><div class="field"><label>STATUS</label><select id="p2BatchStatus"><option>Upcoming</option><option>Current</option><option>Completed</option></select></div><div class="field"><label>SCHEDULE TYPE</label><select id="p2BatchScheduleType"><option value="weekly">Weekly recurring</option><option value="monthly">Monthly recurring</option><option value="custom">Custom dates</option><option value="single">Single date</option></select></div><div class="field"><label>USUAL CLASS DAY</label><select id="p2BatchDay"><option value="0">Sunday</option><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option></select></div><div class="field"><label>&nbsp;</label><button id="p2GenerateSchedule" class="btn secondary" type="button">Generate schedule</button></div><div class="field full"><label>SESSION DATES</label><textarea id="p2BatchSessions" placeholder="One date per line. You can change any generated Sunday to Saturday or another date."></textarea><div class="p2-schedule-help">Level 1–4 default to weekly Sunday. STT, Kriya 2 and other courses can use monthly, custom or single-date schedules.</div></div><div class="field full"><label>ACHARYA(S)</label><input id="p2BatchAcharyaSearch" placeholder="Type Acharya name or mobile"><div id="p2BatchAcharyaSuggestions" class="p2-suggestions hidden"></div><div id="p2BatchAcharyaSelected" class="p2-selected-list"></div></div><div class="field full"><label>ASSISTING VOLUNTEERS</label><input id="p2BatchVolunteerSearch" placeholder="Type volunteer name or mobile"><div id="p2BatchVolunteerSuggestions" class="p2-suggestions hidden"></div><div id="p2BatchVolunteerSelected" class="p2-selected-list"></div></div><div class="field full"><label>NOTES</label><textarea id="p2BatchNotes"></textarea></div></div><div class="actions" style="margin-top:18px"><button class="btn" type="submit">Save batch</button><button id="p2DeleteBatch" class="btn ghost hidden" type="button">Delete</button></div></form></div>'''
new_batch = '''<div id="p2BatchModal" class="modal-backdrop"><form id="p2BatchForm" class="modal"><div class="modal-head"><h3 id="p2BatchModalTitle">New class batch</h3><button type="button" class="x" data-close="p2BatchModal">×</button></div><input id="p2BatchId" type="hidden"><div class="form-grid"><div class="field"><label>COURSE *</label><select id="p2BatchCourse" required></select></div><div class="field"><label>BATCH NAME / NUMBER *</label><input id="p2BatchName" required placeholder="e.g. Batch 2"></div><div class="field"><label>START DATE (OPTIONAL / TBD)</label><input id="p2BatchStart" type="date"></div><div class="field"><label>END DATE (OPTIONAL)</label><input id="p2BatchEnd" type="date"></div><div class="field"><label>STATUS</label><select id="p2BatchStatus"><option>Planned</option><option>Upcoming</option><option>Current</option><option>Ongoing</option><option>Completed</option></select></div><div class="field"><label>SCHEDULE TYPE</label><select id="p2BatchScheduleType"><option value="weekly">Weekly recurring</option><option value="monthly">Monthly recurring</option><option value="custom">Custom / manual dates</option><option value="single">Single date</option><option value="open">Open-ended / dates announced later</option></select></div><div class="field"><label>USUAL CLASS DAY</label><select id="p2BatchDay"><option value="0">Sunday</option><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option></select></div><div class="field"><label>&nbsp;</label><button id="p2GenerateSchedule" class="btn secondary" type="button">Generate known dates</button></div><div class="field full"><label>SESSION DATES (OPTIONAL)</label><textarea id="p2BatchSessions" placeholder="One date per line, or leave blank and add dates later inside the class."></textarea><div class="p2-schedule-help">Level 1–4 may stay ongoing with no end date. Use + Add Class Date or + Next Class inside the batch whenever a new date is known.</div></div><div class="field full"><label>ACHARYA(S)</label><input id="p2BatchAcharyaSearch" placeholder="Type Acharya name or mobile"><div id="p2BatchAcharyaSuggestions" class="p2-suggestions hidden"></div><div id="p2BatchAcharyaSelected" class="p2-selected-list"></div></div><div class="field full"><label>ASSISTING VOLUNTEERS</label><input id="p2BatchVolunteerSearch" placeholder="Type volunteer name or mobile"><div id="p2BatchVolunteerSuggestions" class="p2-suggestions hidden"></div><div id="p2BatchVolunteerSelected" class="p2-selected-list"></div></div><div class="field full"><label>NOTES</label><textarea id="p2BatchNotes"></textarea></div></div><div class="actions" style="margin-top:18px"><button class="btn" type="submit">Save batch</button><button id="p2DeleteBatch" class="btn ghost hidden" type="button">Delete</button></div></form></div>'''
must_replace(old_batch, new_batch, 'batch modal')

old_enroll = '''<div id="p2EnrollModal" class="modal-backdrop"><form id="p2EnrollForm" class="modal"><div class="modal-head"><h3>Enrol student</h3><button type="button" class="x" data-close="p2EnrollModal">×</button></div><input id="p2EnrollStudentId" type="hidden"><div class="field full"><label>STUDENT *</label><input id="p2EnrollStudentSearch" autocomplete="off" placeholder="Type student name or mobile"><div id="p2EnrollSuggestions" class="p2-suggestions hidden"></div><div id="p2EnrollSelected" class="p2-note" style="margin-top:8px">No student selected.</div></div><div class="field full" style="margin-top:14px"><label>ENROLMENT DATE</label><input id="p2EnrollDate" type="date"></div><div class="actions" style="margin-top:18px"><button class="btn" type="submit">Enrol</button></div></form></div>'''
new_enroll = '''<div id="p2EnrollModal" class="modal-backdrop"><form id="p2EnrollForm" class="modal"><div class="modal-head"><h3>Enrol in this class</h3><button type="button" class="x" data-close="p2EnrollModal">×</button></div><input id="p2EnrollStudentId" type="hidden"><input id="p2EnrollSourceType" type="hidden"><input id="p2EnrollSourceId" type="hidden"><div class="field full"><label>SEARCH EXISTING PERSON</label><input id="p2EnrollStudentSearch" autocomplete="off" placeholder="Search Student, Volunteer, Attendee or Kriyaban by name/mobile"><div id="p2EnrollSuggestions" class="p2-suggestions hidden"></div><div id="p2EnrollSelected" class="p2-note" style="margin-top:8px">Search an existing record, or type a new person below.</div></div><div class="form-grid" style="margin-top:14px"><div class="field"><label>NAME *</label><input id="p2EnrollName" required placeholder="Person taking this class"></div><div class="field"><label>MOBILE</label><input id="p2EnrollMobile" inputmode="numeric" maxlength="10" placeholder="10 digits if available"></div><div class="field"><label>ENROLMENT DATE</label><input id="p2EnrollDate" type="date"></div><div class="field"><label>&nbsp;</label><label class="p2-checkline"><input id="p2EnrollAddToStudent" type="checkbox"> Also add/link to Student Master</label></div></div><div class="p2-note" style="margin-top:12px">A Volunteer, Attendee or Kriyaban can take a class without being added to Student Master. Student Master is only required for formal L1→L4 progression/outreach tracking.</div><div class="actions" style="margin-top:18px"><button class="btn" type="submit">Enrol in class</button></div></form></div>'''
must_replace(old_enroll, new_enroll, 'enrol modal')

course_marker = '<div id="p2CourseModal" class="modal-backdrop">'
if course_marker not in text:
    raise SystemExit('course modal marker missing')
session_modal = '''<div id="p2SessionModal" class="modal-backdrop"><form id="p2SessionForm" class="modal" style="max-width:520px"><div class="modal-head"><h3 id="p2SessionModalTitle">Add Class Date</h3><button type="button" class="x" data-close="p2SessionModal">×</button></div><input id="p2SessionOldDate" type="hidden"><div class="field full"><label>CLASS DATE *</label><input id="p2SessionDate" type="date" required></div><div class="actions" style="margin-top:18px"><button class="btn" type="submit">Save Class Date</button></div></form></div>\n\n'''
text = text.replace(course_marker, session_modal + course_marker, 1)

must_replace("  let p2EditingAcharyaIds=[],p2EditingVolunteerIds=[],p2ReportMode='class';",
             "  let p2EditingAcharyaIds=[],p2EditingVolunteerIds=[],p2ReportMode='class',p2SelectedAttendanceEnrollmentId='',p2EnrollCandidates=[],p2SelectedEnrollPerson=null;",
             'phase2 locals')

must_replace("  function p2BatchYear(batch){return Number(String(batch.start||'').slice(0,4))||batch.year||''}",
'''  function p2BatchYear(batch){const first=(batch?.sessionDates||[]).slice().sort()[0]||'';return Number(String(batch?.start||first||'').slice(0,4))||batch?.year||''}''',
             'batch year')

must_replace("  function p2AttendanceCounts(enrollment){const batch=state.classBatches.find(b=>b.id===enrollment.batchId),sessions=batch?.sessionDates||[],attendance=enrollment.attendance||{};const attended=sessions.filter(d=>attendance[d]===true).length;return{total:sessions.length,attended,missed:Math.max(0,sessions.length-attended)}}",
'''  function p2AttendanceCounts(enrollment){const batch=state.classBatches.find(b=>b.id===enrollment.batchId),sessions=batch?.sessionDates||[],attendance=enrollment.attendance||{};const attended=sessions.filter(d=>attendance[d]===true).length,missed=sessions.filter(d=>attendance[d]===false).length;return{total:sessions.length,attended,missed,unmarked:Math.max(0,sessions.length-attended-missed)}}''',
             'attendance counts')

must_replace("  function p2GenerateDates(start,end,type,day){if(!start)return[];if(type==='single')return[start];if(type==='custom')return p2ParseDates($('p2BatchSessions')?.value||'');const a=new Date(start+'T12:00:00'),z=new Date((end||start)+'T12:00:00'),want=Number(day);if(z<a)return[start];const out=[];if(type==='weekly'){for(let d=new Date(a);d<=z;d.setDate(d.getDate()+1))if(d.getDay()===want)out.push(d.toISOString().slice(0,10))}else if(type==='monthly'){let y=a.getFullYear(),m=a.getMonth();while(new Date(y,m,1)<=z){let d=new Date(y,m,1,12);while(d.getDay()!==want)d.setDate(d.getDate()+1);if(d>=a&&d<=z)out.push(d.toISOString().slice(0,10));m++;if(m>11){m=0;y++}}}return out.length?out:[start]}",
'''  function p2GenerateDates(start,end,type,day){if(type==='open'||type==='custom')return p2ParseDates($('p2BatchSessions')?.value||'');if(!start)return[];if(type==='single')return[start];const a=new Date(start+'T12:00:00'),z=new Date((end||start)+'T12:00:00'),want=Number(day);if(z<a)return[start];const out=[];if(type==='weekly'){for(let d=new Date(a);d<=z;d.setDate(d.getDate()+1))if(d.getDay()===want)out.push(d.toISOString().slice(0,10))}else if(type==='monthly'){let y=a.getFullYear(),m=a.getMonth();while(new Date(y,m,1)<=z){let d=new Date(y,m,1,12);while(d.getDay()!==want)d.setDate(d.getDate()+1);if(d>=a&&d<=z)out.push(d.toISOString().slice(0,10));m++;if(m>11){m=0;y++}}}return out.length?out:[start]}''',
             'generate dates')

new_classes = r'''  function p2RenderClasses(){
    if(!$('p2ClassList'))return;
    const cf=$('p2CourseFilter'),keepCourse=cf?.value||'all';
    if(cf){cf.innerHTML='<option value="all">All courses</option>'+state.courseTypes.filter(c=>c.active!==false).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');if([...cf.options].some(o=>o.value===keepCourse))cf.value=keepCourse}
    const q=($('p2ClassSearch')?.value||'').trim().toLowerCase(),course=cf?.value||'all';
    const matches=b=>(course==='all'||b.courseId===course)&&(!q||[p2CourseName(b),b.name,b.status,p2AcharyaNames(b).join(' '),p2BatchYear(b)||'Unscheduled'].join(' ').toLowerCase().includes(q));
    const rows=state.classBatches.filter(matches);
    const grouped={};rows.forEach(b=>{const y=String(p2BatchYear(b)||'Unscheduled / TBD');(grouped[y]||(grouped[y]=[])).push(b)});
    const years=Object.keys(grouped).sort((a,b)=>{if(a.startsWith('Unscheduled'))return 1;if(b.startsWith('Unscheduled'))return-1;return b.localeCompare(a,undefined,{numeric:true})});
    $('p2ClassList').innerHTML=years.length?years.map(y=>{const list=grouped[y],active=list.filter(b=>!['Completed','Inactive'].includes(b.status||'')).sort((a,b)=>String(a.start||'9999').localeCompare(String(b.start||'9999'))),inactive=list.filter(b=>['Completed','Inactive'].includes(b.status||'')).sort((a,b)=>String(b.end||b.start||'').localeCompare(String(a.end||a.start||'')));return `<details class="p2-year-club" data-year="${esc(y)}"><summary><div><strong>${esc(y==='Unscheduled / TBD'?y:y+' Classes')}</strong><small>${active.length} active/upcoming · ${inactive.length} completed/inactive</small></div><span>Double-click to open</span></summary><div class="p2-year-club-body">${active.length?`<div class="p2-year-subtitle">ACTIVE / CURRENT / UPCOMING</div><div class="p2-card-list">${active.map(p2ClassRecordHtml).join('')}</div>`:'<div class="p2-empty">No active classes in this year.</div>'}${inactive.length?`<div class="p2-year-subtitle inactive">COMPLETED / INACTIVE</div><div class="p2-card-list">${inactive.map(p2ClassRecordHtml).join('')}</div>`:''}</div></details>`}).join(''):'<div class="p2-empty">No classes found. Use + New Class Batch to create one.</div>';
    if($('p2PastClassList'))$('p2PastClassList').innerHTML='';
    document.querySelectorAll('#classes .p2-year-club>summary').forEach(summary=>{summary.onclick=e=>e.preventDefault();summary.ondblclick=e=>{e.preventDefault();e.stopPropagation();const details=summary.closest('details');details.open=!details.open}});
    p2BindClassListButtons();
  }
'''
replace_between('  function p2RenderClasses(){', '  function p2RenderCourses(){', new_classes, 'render classes')

new_create = r'''  function p2EnrollmentPerson(enrollment){
    const student=enrollment?.studentId?p2FindStudent(enrollment.studentId):null;if(student)return{name:student.name||enrollment.personName||'',mobile:student.mobile||enrollment.personMobile||'',studentId:student.id,sourceType:'Student',sourceId:student.id};
    let record=null,name=enrollment?.personName||'',mobile=enrollment?.personMobile||'';
    if(enrollment?.sourceType==='Volunteer'){record=state.volunteers.find(v=>v.id===enrollment.sourceId);if(record){name=volName(record);mobile=record.mobile||mobile}}
    if(enrollment?.sourceType==='Attendee'){record=state.attendeeMaster.find(a=>a.id===enrollment.sourceId);if(record){name=record.name||name;mobile=record.personalMobile||record.mobile||mobile}}
    if(enrollment?.sourceType==='Kriyaban'){record=state.kriyabans.find(k=>k.id===enrollment.sourceId);if(record){name=record.name||name;mobile=record.mobile||mobile}}
    return{name:name||'Unnamed person',mobile:mobile||'',studentId:'',sourceType:enrollment?.sourceType||'Class only',sourceId:enrollment?.sourceId||''};
  }
  function p2EnrollmentPeople(){
    const rows=[],byKey=new Map();
    const add=(sourceType,sourceId,name,mobile,studentId='')=>{name=String(name||'').trim();mobile=normMobile(mobile);if(!name&&!mobile)return;const key=mobile&&mobile.length===10?'m:'+mobile:(studentId?'s:'+studentId:sourceType+':'+sourceId);let row=byKey.get(key);if(!row){row={key,sourceType,sourceId,name:name||mobile,mobile,studentId,labels:[sourceType]};byKey.set(key,row);rows.push(row)}else{if(!row.studentId&&studentId)row.studentId=studentId;if(!row.name&&name)row.name=name;if(!row.mobile&&mobile)row.mobile=mobile;if(!row.labels.includes(sourceType))row.labels.push(sourceType)}};
    state.students.forEach(s=>add('Student',s.id,s.name,s.mobile,s.id));
    state.volunteers.forEach(v=>{const m=normMobile(v.mobile),s=state.students.find(x=>m&&normMobile(x.mobile)===m);add('Volunteer',v.id,volName(v),v.mobile,s?.id||'')});
    state.attendeeMaster.forEach(a=>{const mobile=a.personalMobile||a.mobile||'',m=normMobile(mobile),s=state.students.find(x=>m&&normMobile(x.mobile)===m);add('Attendee',a.id,a.name,mobile,s?.id||'')});
    state.kriyabans.forEach(k=>{const m=normMobile(k.mobile),s=p2FindStudent(k.studentId)||state.students.find(x=>m&&normMobile(x.mobile)===m);add('Kriyaban',k.id,k.name,k.mobile,s?.id||'')});
    return rows.sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'}));
  }
  function p2CreateEnrollment(studentId,batchId,person={}){const b=state.classBatches.find(x=>x.id===batchId);if(!b)return null;const incomingMobile=normMobile(person.mobile||(studentId?p2FindStudent(studentId)?.mobile:'')),incomingName=normName(person.name||(studentId?p2FindStudent(studentId)?.name:''));const duplicate=state.classEnrollments.find(e=>{if(e.batchId!==batchId)return false;if(studentId&&e.studentId===studentId)return true;const existing=p2EnrollmentPerson(e),m=normMobile(existing.mobile),n=normName(existing.name);return(incomingMobile&&m===incomingMobile)||(!incomingMobile&&incomingName&&n===incomingName)});if(duplicate){toast('This person is already enrolled in this batch');return null}const course=p2CourseForBatch(b),level=course?.category==='Progression'?course.name:(b.level||course?.name||'');const e={id:uid('enr'),studentId:studentId||'',batchId,courseId:b.courseId,courseName:course?.name||b.level||'',level,enrolledAt:today(),attendance:{},outcome:'Enrolled',completionDate:'',progressedDate:'',sourceType:person.sourceType||'',sourceId:person.sourceId||'',personName:person.name||p2FindStudent(studentId)?.name||'',personMobile:person.mobile||p2FindStudent(studentId)?.mobile||'',personKey:person.key||''};state.classEnrollments.push(e);if(studentId){const idx=p2Levels.indexOf(level);if(idx>0){const previous=p2StudentEnrollments(studentId).filter(x=>x.level===p2Levels[idx-1]&&x.outcome==='Completed').at(-1);if(previous&&!previous.progressedDate)previous.progressedDate=today()}}return e}
'''
replace_between('  function p2CreateEnrollment(', '  function p2OpenAttendance(', new_create, 'create enrollment')

old_open_att_start = text.find('  function p2OpenAttendance(')
old_open_att_end = text.find('  function p2RenderClassWorkspace()', old_open_att_start)
if old_open_att_start < 0 or old_open_att_end < 0:
    raise SystemExit('open attendance block missing')
new_open_att = r'''  function p2OpenAttendance(enrollmentId){const en=state.classEnrollments.find(e=>e.id===enrollmentId),b=en&&state.classBatches.find(x=>x.id===en.batchId),person=en&&p2EnrollmentPerson(en);if(!en||!b)return;$('p2AttendanceEnrollmentId').value=en.id;$('p2AttendanceTitle').textContent=`Attendance — ${person.name}`;$('p2AttendanceChecks').innerHTML=(b.sessionDates||[]).length?(b.sessionDates||[]).map(d=>`<label class="p2-record"><span><strong>${fmt(d)}</strong><br><small>${esc(p2CourseName(b))} — ${esc(b.name)}</small></span><input type="checkbox" class="p2-att-check" data-date="${d}" ${en.attendance?.[d]===true?'checked':''}></label>`).join(''):'<div class="p2-empty">No class dates in this batch.</div>';$('p2AttendanceModal').classList.add('open')}
'''
text = text[:old_open_att_start] + new_open_att + text[old_open_att_end:]

new_workspace_fn = r'''  function p2AttendanceSummaryHtml(en,b){if(!en)return'<div class="p2-empty">Click a student name or an attendance cell to see the summary.</div>';const p=p2EnrollmentPerson(en),c=p2AttendanceCounts(en),sessions=b.sessionDates||[];return `<h4>${esc(p.name)}</h4><div class="sub">${esc(p.mobile||'No mobile')} · ${esc(p.sourceType||'Class')}</div><div class="p2-summary-kpis"><span><b>${c.attended}</b> Present</span><span><b>${c.missed}</b> Absent</span><span><b>${c.unmarked}</b> Unmarked</span></div><div class="p2-summary-dates">${sessions.length?sessions.map(d=>`<div><span>${fmt(d)}</span><strong class="${en.attendance?.[d]===true?'present':en.attendance?.[d]===false?'absent':''}">${en.attendance?.[d]===true?'Present':en.attendance?.[d]===false?'Absent':'Not marked'}</strong></div>`).join(''):'<div class="p2-empty">No class dates yet.</div>'}</div><div class="actions" style="margin-top:12px"><button class="btn ghost small p2-complete" data-id="${en.id}">Complete</button><button class="btn ghost small p2-incomplete" data-id="${en.id}">Incomplete</button></div>`}
  function p2OpenSessionDate(oldDate='',suggested=''){$('p2SessionOldDate').value=oldDate||'';$('p2SessionDate').value=suggested||oldDate||'';$('p2SessionModalTitle').textContent=oldDate?'Edit Class Date':'Add Class Date';$('p2SessionModal').classList.add('open');setTimeout(()=>$('p2SessionDate').focus(),40)}
  function p2NextSuggestedDate(b){const dates=(b.sessionDates||[]).slice().sort(),want=Number(b.usualDay??0);let anchor=dates.at(-1)||b.start||today(),d=new Date(anchor+'T12:00:00');if(dates.length)d.setDate(d.getDate()+1);let guard=0;while(d.getDay()!==want&&guard++<8)d.setDate(d.getDate()+1);return d.toISOString().slice(0,10)}
  function p2RenderClassWorkspace(){
    if(!$('p2ClassHeader'))return;const b=p2ActiveBatch();
    if(!b){$('p2ClassHeader').innerHTML='<div><h3>No class batch selected</h3><p>Open a batch from Classes.</p></div>';$('p2ClassStats').innerHTML='';$('p2ClassRoster').innerHTML='';$('p2SessionList').innerHTML='';if($('p2AttendanceSummary'))$('p2AttendanceSummary').innerHTML='';$('p2BatchOutreach').innerHTML='';return}
    const enrol=state.classEnrollments.filter(e=>e.batchId===b.id),completed=enrol.filter(e=>e.outcome==='Completed').length,incomplete=enrol.filter(e=>e.outcome&&e.outcome!=='Completed'&&e.outcome!=='Enrolled').length,course=p2CourseForBatch(b),next=course?.category==='Progression'?p2NextLevel(course.name):'',eligible=next?p2EligibleFromLevel(course.name):[],year=p2BatchYear(b)||'TBD';
    $('p2ClassHeader').innerHTML=`<div><h3>${esc(p2CourseName(b))} — ${esc(b.name)}</h3><p>${b.start?fmt(b.start):'Start date TBD'}${b.end?' to '+fmt(b.end):' · End date open'} · Grouped under ${esc(year)} · ${esc(b.status||'Ongoing')}</p><p style="margin-top:7px;font-size:12px">Acharya: ${esc(p2AcharyaNames(b).join(', ')||'Not assigned')} · Assisting volunteers: ${p2VolunteerNames(b).length} · ${esc((b.scheduleType||'open').toUpperCase())}</p></div><div class="actions"><button class="btn secondary" id="p2EditActiveBatch">Edit batch</button><button class="btn secondary" id="p2BackClasses">Back to Classes</button></div>`;
    $('p2EditActiveBatch').onclick=()=>p2OpenBatch(b.id);$('p2BackClasses').onclick=()=>switchPage('classes');
    $('p2ClassStats').innerHTML=`<div class="p2-kpi"><span>Enrolled</span><b>${enrol.length}</b></div><div class="p2-kpi"><span>Completed</span><b>${completed}</b></div><div class="p2-kpi"><span>Incomplete / withdrew</span><b>${incomplete}</b></div><div class="p2-kpi"><span>Class dates</span><b>${(b.sessionDates||[]).length}</b></div><div class="p2-kpi"><span>${next?'Waiting for '+esc(next):'Course type'}</span><b>${next?eligible.length:esc(course?.category||'Other')}</b></div>`;
    const q=($('p2AttendanceGridSearch')?.value||'').trim().toLowerCase(),sessions=(b.sessionDates||[]).slice().sort(),shown=enrol.filter(e=>{const p=p2EnrollmentPerson(e);return!q||[p.name,p.mobile].join(' ').toLowerCase().includes(q)});
    if(p2SelectedAttendanceEnrollmentId&&!enrol.some(e=>e.id===p2SelectedAttendanceEnrollmentId))p2SelectedAttendanceEnrollmentId='';if(!p2SelectedAttendanceEnrollmentId&&shown.length)p2SelectedAttendanceEnrollmentId=shown[0].id;
    $('p2ClassRoster').innerHTML=shown.length?`<div class="p2-attendance-scroll"><table class="p2-attendance-grid"><thead><tr><th class="p2-sticky-name">Student</th>${sessions.map(d=>`<th><span>${fmt(d)}</span></th>`).join('')}<th>Outcome</th></tr></thead><tbody>${shown.map(e=>{const p=p2EnrollmentPerson(e);return`<tr><td class="p2-sticky-name"><button class="p2-person-link" data-id="${e.id}"><strong>${esc(p.name)}</strong><span>${esc(p.mobile||p.sourceType||'')}</span></button></td>${sessions.map(d=>{const val=e.attendance?.[d];return`<td><button class="p2-att-cell ${val===true?'present':val===false?'absent':'unmarked'}" data-id="${e.id}" data-date="${d}" title="Click to change">${val===true?'P':val===false?'A':'—'}</button></td>`}).join('')}<td><span class="p2-chip ${e.outcome==='Completed'?'good':e.outcome==='Did Not Complete'?'bad':''}">${esc(e.outcome||'Enrolled')}</span></td></tr>`}).join('')}</tbody></table></div>`:'<div class="p2-empty">No enrolled people match this search.</div>';
    document.querySelectorAll('.p2-person-link').forEach(x=>x.onclick=()=>{p2SelectedAttendanceEnrollmentId=x.dataset.id;p2RenderClassWorkspace()});
    document.querySelectorAll('.p2-att-cell').forEach(x=>x.onclick=()=>{const e=state.classEnrollments.find(y=>y.id===x.dataset.id);if(!e)return;e.attendance=e.attendance||{};const cur=e.attendance[x.dataset.date];if(cur===undefined)e.attendance[x.dataset.date]=true;else if(cur===true)e.attendance[x.dataset.date]=false;else delete e.attendance[x.dataset.date];p2SelectedAttendanceEnrollmentId=e.id;save()});
    const selected=enrol.find(e=>e.id===p2SelectedAttendanceEnrollmentId)||null;$('p2AttendanceSummary').innerHTML=p2AttendanceSummaryHtml(selected,b);
    document.querySelectorAll('#p2AttendanceSummary .p2-complete').forEach(x=>x.onclick=()=>{const e=state.classEnrollments.find(y=>y.id===x.dataset.id);if(!e)return;e.outcome='Completed';e.completionDate=e.completionDate||today();save();toast('Marked completed')});document.querySelectorAll('#p2AttendanceSummary .p2-incomplete').forEach(x=>x.onclick=()=>{const e=state.classEnrollments.find(y=>y.id===x.dataset.id);if(!e)return;e.outcome='Did Not Complete';e.completionDate='';save();toast('Marked incomplete')});
    $('p2SessionList').innerHTML=sessions.length?`<div class="p2-session-list">${sessions.map((d,i)=>`<span class="p2-session"><b>Class ${i+1}</b> · ${fmt(d)} <button type="button" class="p2-edit-session" data-date="${d}">Edit</button><button type="button" class="p2-delete-session" data-date="${d}">×</button></span>`).join('')}</div>`:'<div class="p2-empty">No class dates yet. Use + Add Class Date or + Next Class.</div>';
    document.querySelectorAll('.p2-edit-session').forEach(x=>x.onclick=()=>p2OpenSessionDate(x.dataset.date));document.querySelectorAll('.p2-delete-session').forEach(x=>x.onclick=()=>{if(!confirm(`Delete class date ${fmt(x.dataset.date)}?`))return;b.sessionDates=(b.sessionDates||[]).filter(d=>d!==x.dataset.date);state.classEnrollments.filter(e=>e.batchId===b.id).forEach(e=>{if(e.attendance)delete e.attendance[x.dataset.date]});save();toast('Class date deleted')});
    p2RenderOutreach(course?.category==='Progression'?course.name:'');
  }
'''
replace_between('  function p2RenderClassWorkspace()', '  function p2RenderReports(', new_workspace_fn, 'workspace renderer')

old_open_batch = re.search(r"  function p2OpenBatch\(id=''\)\{.*?\n", text)
if not old_open_batch:
    raise SystemExit('open batch function not found')
line = old_open_batch.group(0)
new_line = "  function p2OpenBatch(id=''){const b=state.classBatches.find(x=>x.id===id),course=b?p2CourseForBatch(b):state.courseTypes.find(c=>c.name==='Level 1');$('p2BatchId').value=b?.id||'';p2PopulateCourseSelect(course?.id||'');$('p2BatchName').value=b?.name||'';$('p2BatchStart').value=b?.start||'';$('p2BatchEnd').value=b?.end||'';$('p2BatchStatus').value=b?.status||(b?.start?'Upcoming':'Planned');$('p2BatchScheduleType').value=b?.scheduleType||course?.defaultSchedule||'weekly';$('p2BatchDay').value=String(b?.usualDay??course?.defaultDay??0);$('p2BatchSessions').value=(b?.sessionDates||[]).join('\\n');$('p2BatchNotes').value=b?.notes||'';p2EditingAcharyaIds=[...(b?.acharyaIds||[])];p2EditingVolunteerIds=[...(b?.volunteerIds||[])];$('p2BatchAcharyaSearch').value='';$('p2BatchVolunteerSearch').value='';$('p2BatchAcharyaSuggestions').classList.add('hidden');$('p2BatchVolunteerSuggestions').classList.add('hidden');p2RenderSelectedPeople();$('p2BatchModalTitle').textContent=b?'Edit class batch':'New class batch';$('p2DeleteBatch').classList.toggle('hidden',!b);$('p2BatchModal').classList.add('open');setTimeout(()=>$('p2BatchName').focus(),40)}\n"
text = text.replace(line, new_line, 1)

old_submit_match = re.search(r"  \$\('p2BatchForm'\)\.onsubmit=e=>\{.*?\n", text)
if not old_submit_match:
    raise SystemExit('batch submit not found')
old_submit = old_submit_match.group(0)
new_submit = "  $('p2BatchForm').onsubmit=e=>{e.preventDefault();const id=$('p2BatchId').value,start=$('p2BatchStart').value,course=p2Course($('p2BatchCourse').value),name=$('p2BatchName').value.trim();if(!course||!name){toast('Course and batch name are required');return}const dates=p2ParseDates($('p2BatchSessions').value),derivedStart=start||dates[0]||'',derivedYear=Number(String(derivedStart||'').slice(0,4))||0;let b=id?state.classBatches.find(x=>x.id===id):{id:uid('batch'),createdAt:new Date().toISOString()};Object.assign(b,{courseId:course.id,level:course.category==='Progression'?course.name:course.name,name,start,end:$('p2BatchEnd').value,status:$('p2BatchStatus').value,year:derivedYear||b.year||0,scheduleType:$('p2BatchScheduleType').value,usualDay:Number($('p2BatchDay').value),sessionDates:dates,acharyaIds:[...p2EditingAcharyaIds],acharyas:p2EditingAcharyaIds.map(id=>state.acharyas.find(a=>a.id===id)?.name).filter(Boolean),volunteerIds:[...p2EditingVolunteerIds],notes:$('p2BatchNotes').value.trim()});if(!id)state.classBatches.push(b);state.activeClassBatchId=b.id;$('p2BatchModal').classList.remove('open');save();toast(id?'Class batch updated':'Class batch created');switchPage('classWorkspace')}\n"
text = text.replace(old_submit, new_submit, 1)

old_gen_match = re.search(r"  \$\('p2GenerateSchedule'\)\.onclick=.*?\n", text)
if not old_gen_match:
    raise SystemExit('generate handler not found')
old_gen = old_gen_match.group(0)
new_gen = "  $('p2GenerateSchedule').onclick=()=>{const type=$('p2BatchScheduleType').value;if((type==='weekly'||type==='monthly')&&!$('p2BatchStart').value){toast('Enter a start date to generate recurring dates, or add dates later inside the class');return}const dates=p2GenerateDates($('p2BatchStart').value,$('p2BatchEnd').value,type,$('p2BatchDay').value);$('p2BatchSessions').value=dates.join('\\n');toast(dates.length?`${dates.length} known class date${dates.length===1?'':'s'} ready`:'No dates generated — add them later inside the class')}\n"
text = text.replace(old_gen, new_gen, 1)

new_enroll_logic = r'''  function p2ShowEnrollSuggestions(){const q=$('p2EnrollStudentSearch').value.toLowerCase().trim(),box=$('p2EnrollSuggestions');p2EnrollCandidates=p2EnrollmentPeople().filter(p=>!q||[p.name,p.mobile,p.labels.join(' ')].join(' ').toLowerCase().includes(q)).slice(0,12);box.innerHTML=p2EnrollCandidates.map((p,i)=>`<div class="p2-suggestion p2-enrol-pick" data-index="${i}"><strong>${esc(p.name)}</strong><br><small>${esc(p.mobile||'No mobile')} · ${esc(p.labels.join(' / '))}</small></div>`).join('')||'<div class="p2-suggestion">No match. Enter a new person below.</div>';box.classList.remove('hidden');document.querySelectorAll('.p2-enrol-pick').forEach(x=>x.onclick=()=>{const p=p2EnrollCandidates[Number(x.dataset.index)];if(!p)return;p2SelectedEnrollPerson=p;$('p2EnrollStudentId').value=p.studentId||'';$('p2EnrollSourceType').value=p.sourceType||'';$('p2EnrollSourceId').value=p.sourceId||'';$('p2EnrollStudentSearch').value=`${p.name}${p.mobile?' · '+p.mobile:''}`;$('p2EnrollName').value=p.name||'';$('p2EnrollMobile').value=p.mobile||'';$('p2EnrollSelected').innerHTML=`<strong>Selected:</strong> ${esc(p.name)} · ${esc(p.labels.join(' / '))}${p.studentId?' · Already in Student Master':''}`;$('p2EnrollAddToStudent').checked=!!p.studentId;$('p2EnrollAddToStudent').disabled=!!p.studentId;box.classList.add('hidden')})}
  $('p2EnrollStudent').onclick=()=>{const b=p2ActiveBatch();if(!b)return;p2SelectedEnrollPerson=null;$('p2EnrollStudentId').value='';$('p2EnrollSourceType').value='';$('p2EnrollSourceId').value='';$('p2EnrollStudentSearch').value='';$('p2EnrollName').value='';$('p2EnrollMobile').value='';$('p2EnrollSelected').textContent='Search an existing record, or type a new person below.';$('p2EnrollAddToStudent').checked=false;$('p2EnrollAddToStudent').disabled=false;$('p2EnrollDate').value=today();$('p2EnrollSuggestions').classList.add('hidden');$('p2EnrollModal').classList.add('open');setTimeout(()=>$('p2EnrollStudentSearch').focus(),40)};
  $('p2EnrollStudentSearch').oninput=()=>{p2SelectedEnrollPerson=null;$('p2EnrollStudentId').value='';$('p2EnrollSourceType').value='';$('p2EnrollSourceId').value='';$('p2EnrollAddToStudent').checked=false;$('p2EnrollAddToStudent').disabled=false;$('p2EnrollSelected').textContent='No existing record selected. You may choose a suggestion or enter a new person below.';p2ShowEnrollSuggestions()};$('p2EnrollStudentSearch').onfocus=p2ShowEnrollSuggestions;
  $('p2EnrollForm').onsubmit=e=>{e.preventDefault();const b=p2ActiveBatch();if(!b){toast('No class batch selected');return}let name=$('p2EnrollName').value.trim(),mobile=normMobile($('p2EnrollMobile').value),studentId=$('p2EnrollStudentId').value;if(!name){toast('Enter the person name');return}if(mobile&&mobile.length!==10){toast('Mobile must be 10 digits or left blank');return}const selected=p2SelectedEnrollPerson||null,addToStudent=$('p2EnrollAddToStudent').checked;if(!studentId){const existing=state.students.find(s=>(mobile&&normMobile(s.mobile)===mobile)||(!mobile&&normName(s.name)===normName(name)));if(existing)studentId=existing.id;else if(addToStudent){if(mobile.length!==10){toast('A 10-digit mobile is required to add this person to Student Master');return}const s={id:uid('stu'),cloudId:uid('sync'),createdAt:new Date().toISOString(),name,mobile,kriyaDate:'',kriyaYear:'',notes:'Added from class enrolment'};state.students.push(s);p2LinkStudent(s);studentId=s.id}}const person={name,mobile,sourceType:selected?.sourceType||$('p2EnrollSourceType').value||'Class only',sourceId:selected?.sourceId||$('p2EnrollSourceId').value||'',key:selected?.key||(mobile?'m:'+mobile:'direct:'+normName(name))};const en=p2CreateEnrollment(studentId,b.id,person);if(!en)return;en.enrolledAt=$('p2EnrollDate').value||today();$('p2EnrollModal').classList.remove('open');p2SelectedAttendanceEnrollmentId=en.id;save();toast(studentId?'Enrolled and linked to Student Master':'Enrolled in this class only')};
'''
replace_between('  function p2ShowEnrollSuggestions()', "  $('p2AttendanceForm').onsubmit", new_enroll_logic, 'enrollment logic')

needle = "  $('p2AttendanceForm').onsubmit"
idx = text.find(needle)
if idx < 0:
    raise SystemExit('attendance form handler marker missing')
session_logic = r'''  if($('p2AttendanceGridSearch'))$('p2AttendanceGridSearch').oninput=p2RenderClassWorkspace;
  $('p2AddClassDate').onclick=()=>{if(!p2ActiveBatch())return;p2OpenSessionDate('', '')};
  $('p2NextClass').onclick=()=>{const b=p2ActiveBatch();if(!b)return;p2OpenSessionDate('',p2NextSuggestedDate(b))};
  $('p2MarkBatchComplete').onclick=()=>{const b=p2ActiveBatch();if(!b)return;if(!confirm('Mark this class batch complete?'))return;b.status='Completed';const dates=(b.sessionDates||[]).slice().sort();if(!b.end&&dates.length)b.end=dates.at(-1);save();toast('Class batch marked complete')};
  $('p2SessionForm').onsubmit=e=>{e.preventDefault();const b=p2ActiveBatch(),oldDate=$('p2SessionOldDate').value,newDate=$('p2SessionDate').value;if(!b||!newDate)return;b.sessionDates=b.sessionDates||[];if(oldDate&&oldDate!==newDate){b.sessionDates=b.sessionDates.filter(d=>d!==oldDate);state.classEnrollments.filter(x=>x.batchId===b.id).forEach(en=>{if(en.attendance&&Object.prototype.hasOwnProperty.call(en.attendance,oldDate)){if(!Object.prototype.hasOwnProperty.call(en.attendance,newDate))en.attendance[newDate]=en.attendance[oldDate];delete en.attendance[oldDate]}})}if(!b.sessionDates.includes(newDate))b.sessionDates.push(newDate);b.sessionDates=[...new Set(b.sessionDates)].sort();if(!b.start){b.start=b.sessionDates[0];b.year=Number(String(b.start).slice(0,4))||b.year||0}if(b.status==='Planned'&&newDate<=today())b.status='Current';$('p2SessionModal').classList.remove('open');save();toast(oldDate?'Class date updated':'Class date added')};
'''
text = text[:idx] + session_logic + text[idx:]

for old,new in [
("const s=p2FindStudent(e.studentId),b=state.classBatches.find(x=>x.id===e.batchId);return{Course:b?p2CourseName(b):(e.courseName||e.level||''),Batch:b?.name||'',Year:b?p2BatchYear(b):'',Student:s?.name||'',Mobile:s?.mobile||'',Enrolled:e.enrolledAt||'',Outcome:e.outcome||''}","const s=p2EnrollmentPerson(e),b=state.classBatches.find(x=>x.id===e.batchId);return{Course:b?p2CourseName(b):(e.courseName||e.level||''),Batch:b?.name||'',Year:b?p2BatchYear(b):'',Student:s?.name||'',Mobile:s?.mobile||'',Enrolled:e.enrolledAt||'',Outcome:e.outcome||''}"),
("const s=p2FindStudent(e.studentId),b=state.classBatches.find(x=>x.id===e.batchId),c=p2AttendanceCounts(e);return{Student:s?.name||'',Mobile:s?.mobile||''", "const s=p2EnrollmentPerson(e),b=state.classBatches.find(x=>x.id===e.batchId),c=p2AttendanceCounts(e);return{Student:s?.name||'',Mobile:s?.mobile||''"),
("const s=p2FindStudent(e.studentId),b=state.classBatches.find(x=>x.id===e.batchId);(b?.sessionDates||[]).forEach(d=>rows.push({Student:s?.name||'',Mobile:s?.mobile||''", "const s=p2EnrollmentPerson(e),b=state.classBatches.find(x=>x.id===e.batchId);(b?.sessionDates||[]).forEach(d=>rows.push({Student:s?.name||'',Mobile:s?.mobile||''"),
("const s=p2FindStudent(e.studentId),b=state.classBatches.find(x=>x.id===e.batchId);return{Student:s?.name||'',Mobile:s?.mobile||''", "const s=p2EnrollmentPerson(e),b=state.classBatches.find(x=>x.id===e.batchId);return{Student:s?.name||'',Mobile:s?.mobile||''"),
]:
    if old in text:text=text.replace(old,new,1)
text=text.replace("Present:e.attendance?.[d]?'Yes':'No'", "Status:e.attendance?.[d]===true?'Present':e.attendance?.[d]===false?'Absent':'Not marked'", 1)

new_v125_add = r'''      function v125AddShortcut(){
        const activePage=document.querySelector('.page.active')?.id||page;
        if(activePage==='permanentRecords'){
          v125EnsurePermanentChooser().classList.add('open');
          return true;
        }
        if(activePage==='events'){
          resetEventForm();
          $('eventForm')?.scrollIntoView({behavior:'smooth',block:'start'});
          setTimeout(()=>$('eventName')?.focus(),80);
          toast('New event form ready');
          return true;
        }
        const map={volunteers:'addVolunteer',attendeeMaster:'addAttendeeMaster',kriyabans:'addKriyaban',vips:'addVip',students:'p2AddStudent',acharyas:'p2AddAcharya',courseMaster:'p2AddCourse',classes:'p2AddBatch',daily:'v48AddVolunteer',checkin:'v36NewRegistration',register:'v36NewRegistration'};
        const id=map[activePage],button=id?$(id):null;
        if(button){button.click();return true}
        return false;
      }

'''
replace_between('      function v125AddShortcut(){', '      function v125SaveShortcut(){', new_v125_add, 'v125 add shortcut')
new_v125_save = r'''      function v125SaveShortcut(){
        const direct=['p2AcharyaModal','p2StudentModal','p2BatchModal','p2EnrollModal','p2SessionModal','p2CourseModal'].map(id=>$(id)).filter(m=>m?.classList.contains('open')).at(-1);
        let form=direct?.querySelector('form')||[...document.querySelectorAll('.modal-backdrop.open form')].at(-1)||null;
        const activePage=document.querySelector('.page.active')?.id||page;
        if(!form&&activePage==='events'&&$('eventForm'))form=$('eventForm');
        if(!form)return false;
        if(form.id==='v36RegistrationForm'){
          const saveOnly=form.querySelector('button[type="submit"][data-mode="register"]');
          if(saveOnly){form.requestSubmit(saveOnly);return true}
        }
        form.requestSubmit();return true;
      }

'''
replace_between('      function v125SaveShortcut(){', "      document.addEventListener('keydown',event=>{", new_v125_save, 'v125 save shortcut')
new_prod_add = r'''      function prodAdd(){
        if(document.querySelector('.modal-backdrop.open'))return false;
        const activePage=document.querySelector('.page.active')?.id||page;
        if(activePage==='permanentRecords'){
          prodPermanentChooser().classList.add('open');
          return true;
        }
        if(activePage==='events'){
          if(typeof resetEventForm==='function')resetEventForm();
          $('eventForm')?.scrollIntoView({behavior:'smooth',block:'start'});
          setTimeout(()=>$('eventName')?.focus(),60);
          toast('New event ready');
          return true;
        }
        const map={volunteers:'addVolunteer',attendeeMaster:'addAttendeeMaster',kriyabans:'addKriyaban',vips:'addVip',daily:'v48AddVolunteer',checkin:'v36NewRegistration',register:'v36NewRegistration',students:'p2AddStudent',acharyas:'p2AddAcharya',courseMaster:'p2AddCourse',classes:'p2AddBatch'};
        const focusMap={volunteers:'volunteerFirstName',attendeeMaster:'attendeeMasterName',kriyabans:'kriyabanName',vips:'vipName',daily:'volunteerFirstName',checkin:'v36MainName',register:'v36MainName',students:'p2StudentName',acharyas:'p2AcharyaName',courseMaster:'p2CourseName',classes:'p2BatchName'};
        const button=$(map[activePage]);
        if(button){const currentPage=activePage;button.click();setTimeout(()=>$(focusMap[currentPage])?.focus(),90);return true}
        return false;
      }

'''
replace_between('      function prodAdd(){', '      function prodSave(){', new_prod_add, 'prod add shortcut')
new_prod_save = r'''      function prodSave(){
        const direct=['p2AcharyaModal','p2StudentModal','p2BatchModal','p2EnrollModal','p2SessionModal','p2CourseModal'].map(id=>$(id)).filter(m=>m?.classList.contains('open')).at(-1);
        const openModals=[...document.querySelectorAll('.modal-backdrop.open')];
        let form=direct?.querySelector('form')||(openModals.length?openModals[openModals.length-1].querySelector('form'):null);
        const activePage=document.querySelector('.page.active')?.id||page;
        if(!form&&activePage==='events')form=$('eventForm');
        if(!form&&activePage==='settings')form=$('v52PasswordSettingsForm');
        if(!form)return false;
        if(form.id==='v36RegistrationForm'){
          const saveOnly=form.querySelector('button[type="submit"][data-mode="register"]');
          if(saveOnly){form.requestSubmit(saveOnly);return true}
        }
        form.requestSubmit();return true;
      }

'''
replace_between('      function prodSave(){', '      function runShortcut(action){', new_prod_save, 'prod save shortcut')

text = re.sub(r"document\.head\.insertAdjacentHTML\('beforeend','(<style>\.v125-keyhint\{.*?</style>)'\);", lambda m: "document.head.insertAdjacentHTML('beforeend',`"+m.group(1)+"`);", text, count=1, flags=re.S)

css = r'''
<style id="p2Beta4Styles">
  .p2-year-club{border:1px solid #cfdde8;border-radius:14px;background:#fff;margin:12px 0;overflow:hidden}
  .p2-year-club>summary{list-style:none;cursor:default;padding:18px;display:flex;justify-content:space-between;align-items:center;gap:14px;background:#f8fbfd;color:#173f7d;user-select:none}
  .p2-year-club>summary::-webkit-details-marker{display:none}.p2-year-club>summary div{display:flex;flex-direction:column;gap:4px}.p2-year-club>summary strong{font-size:17px}.p2-year-club>summary small,.p2-year-club>summary span{font-size:12px;color:#6b7d8d}.p2-year-club[open]>summary{border-bottom:1px solid #d8e3eb}.p2-year-club-body{padding:14px}.p2-year-subtitle{font-size:11px;font-weight:800;letter-spacing:.08em;color:#246b54;margin:4px 0 8px}.p2-year-subtitle.inactive{color:#7c6b58;margin-top:18px}
  .p2-attendance-layout{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:16px;align-items:start;margin-top:14px}.p2-attendance-scroll{overflow:auto;max-width:100%;border:1px solid #dbe5ec;border-radius:12px}.p2-attendance-grid{border-collapse:separate;border-spacing:0;min-width:max-content;width:100%;background:#fff}.p2-attendance-grid th,.p2-attendance-grid td{border-right:1px solid #dbe5ec;border-bottom:1px solid #dbe5ec;padding:8px;text-align:center;white-space:nowrap}.p2-attendance-grid th{background:#f5f9fc;font-size:11px}.p2-attendance-grid tr:last-child td{border-bottom:0}.p2-attendance-grid th:last-child,.p2-attendance-grid td:last-child{border-right:0}.p2-sticky-name{position:sticky;left:0;z-index:2;background:#fff!important;text-align:left!important;min-width:210px;max-width:250px}.p2-attendance-grid thead .p2-sticky-name{z-index:3;background:#f5f9fc!important}.p2-person-link{display:flex;flex-direction:column;align-items:flex-start;gap:3px;border:0;background:transparent;cursor:pointer;text-align:left;padding:0;color:#0e2d56}.p2-person-link span{font-size:11px;color:#6b7d8d}.p2-att-cell{width:34px;height:32px;border:1px solid #c9d7e2;border-radius:7px;background:#fff;font-weight:900;cursor:pointer}.p2-att-cell.present{background:#e7f5ee;border-color:#9bcdb7;color:#176746}.p2-att-cell.absent{background:#fff0ef;border-color:#e6b1ac;color:#a33b32}.p2-att-cell.unmarked{color:#8b99a6}.p2-attendance-summary{border:1px solid #dbe5ec;border-radius:12px;padding:14px;background:#fbfdfe;position:sticky;top:12px}.p2-attendance-summary h4{margin:0 0 4px;color:#123b72}.p2-summary-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:12px 0}.p2-summary-kpis span{border:1px solid #dce6ed;border-radius:8px;padding:8px 5px;text-align:center;font-size:10px}.p2-summary-kpis b{display:block;font-size:16px}.p2-summary-dates{max-height:300px;overflow:auto;border-top:1px solid #e0e8ee}.p2-summary-dates>div{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid #edf2f5;font-size:11px}.p2-summary-dates strong.present{color:#176746}.p2-summary-dates strong.absent{color:#a33b32}.p2-session{display:inline-flex!important;align-items:center;gap:6px}.p2-session button{border:0;background:transparent;color:#255e9f;font-size:11px;cursor:pointer;padding:2px}.p2-session .p2-delete-session{color:#9b3c35;font-size:15px}.p2-checkline{display:flex;align-items:center;gap:7px;min-height:38px;font-size:12px}
  @media(max-width:1050px){.p2-attendance-layout{grid-template-columns:1fr}.p2-attendance-summary{position:static}}
</style>
'''
if '</head>' not in text: raise SystemExit('head close missing')
text = text.replace('</head>', css + '</head>', 1)

required = [
  'PHASE2 CLASSES NAV BETA4','Classes by Year','Double-click a year','Open-ended / dates announced later','+ Add Class Date','+ Next Class','p2-attendance-grid','p2AttendanceSummary','Also add/link to Student Master','Search Student, Volunteer, Attendee or Kriyaban','function p2EnrollmentPeople','function p2NextSuggestedDate','2.0.0-beta.4'
]
for marker in required:
    if marker not in text: raise SystemExit(f'Missing beta4 marker: {marker}')

path.write_text(text, encoding='utf-8', newline='\n')
print('APPLIED PHASE 2 BETA.4:', len(text.encode('utf-8')), 'bytes')
