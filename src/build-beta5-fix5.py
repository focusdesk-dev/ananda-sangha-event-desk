from pathlib import Path
p=Path('src/index.html')
html=p.read_text(encoding='utf-8')
if 'PHASE2 BETA5 FIX4' not in html:
    raise SystemExit('beta.5.4 marker not found')
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('fix5 insertion marker not found')

fix=r'''  // PHASE2 BETA5 FIX5 — post-5.4 class-entry, schedule, attendance and progression corrections.
  const p2v55MonthOpen=new Map();
  const p2v55DatesVisible=new Set();
  let p2v55SuggestionIndex={acharya:-1,volunteer:-1};

  function p2v55LocalToday(){const d=new Date(),pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
  function p2v55AutoStatus(b){
    if(b?.endedAt)return'Completed';
    const now=p2v55LocalToday(),start=String(b?.start||''),end=String(b?.end||'');
    if(start&&now<start)return'Upcoming';
    if(start&&now>=start&&(!end||now<=end))return'Current';
    if(end&&now>end)return'Completed';
    return start?'Current':'Upcoming'
  }
  function p2v55SyncBatchStatuses(){let changed=false;state.classBatches.forEach(b=>{const s=p2v55AutoStatus(b);if(b.status!==s){b.status=s;changed=true}});if(changed)localStorage.setItem(KEY,JSON.stringify(state))}

  // Automatic status is display/state information; only End Batch (endedAt) is a final locked batch.
  if(typeof p2v53ActuallyEnded==='function')p2v53ActuallyEnded=function(b){return !!b?.endedAt};
  p2v5IsEnded=function(b){return (typeof p2v53EditingEnded!=='undefined'&&p2v53EditingEnded.has(b?.id))?false:!!b?.endedAt};

  function p2v55PrepareBatchModal(){
    const status=$('p2BatchStatus');if(status?.closest('.field'))status.closest('.field').style.display='none';
    const sessions=$('p2BatchSessions');if(sessions?.closest('.field'))sessions.closest('.field').style.display='none';
    const generate=$('p2GenerateSchedule');if(generate?.closest('.field'))generate.closest('.field').style.display='none';
    const course=$('p2BatchCourse');if(!course)return;
    if(!$('p2v55CustomCourseField'))course.closest('.field').insertAdjacentHTML('afterend','<div class="field full" id="p2v55CustomCourseField" style="display:none"><label>CUSTOM CLASS NAME *</label><input id="p2v55CustomCourseName" placeholder="e.g. Healing Workshop"></div>');
    if(!$('p2BatchFee')){
      const day=$('p2BatchDay')?.closest('.field');
      const html='<div class="field" id="p2v55FeeField"><label>COURSE FEE (₹)</label><input id="p2BatchFee" inputmode="decimal" placeholder="0 for free class"></div>';
      if(day)day.insertAdjacentHTML('afterend',html);else course.closest('.field').insertAdjacentHTML('afterend',html)
    }
  }
  p2v55PrepareBatchModal();

  const p2v55PopulateCourseBase=p2PopulateCourseSelect;
  p2PopulateCourseSelect=function(selected=''){
    p2v55PopulateCourseBase(selected);const sel=$('p2BatchCourse');if(!sel)return;
    [...sel.options].forEach(o=>{const c=p2Course(o.value);if(c)o.textContent=c.name});
    if(![...sel.options].some(o=>o.value==='__custom__')){const o=document.createElement('option');o.value='__custom__';o.textContent='+ Custom Class';sel.appendChild(o)}
  };
  function p2v55BatchCourseChanged(){
    const sel=$('p2BatchCourse'),custom=sel?.value==='__custom__',field=$('p2v55CustomCourseField');if(field)field.style.display=custom?'block':'none';
    if(custom){$('p2BatchScheduleType').value='custom';return}
    const c=p2Course(sel?.value);if(!c)return;$('p2BatchScheduleType').value=c.defaultSchedule||'custom';$('p2BatchDay').value=String(c.defaultDay??0)
  }
  $('p2BatchCourse').onchange=p2v55BatchCourseChanged;

  const p2v55OpenBatchBase=p2OpenBatch;
  p2OpenBatch=function(id=''){
    p2v55PrepareBatchModal();p2v55OpenBatchBase(id);p2v55PrepareBatchModal();
    const b=state.classBatches.find(x=>x.id===id);if($('p2BatchFee'))$('p2BatchFee').value=b?.courseFee??'';
    if($('p2BatchStatus'))$('p2BatchStatus').value=p2v55AutoStatus(b||{start:$('p2BatchStart').value,end:$('p2BatchEnd').value});
    if($('p2v55CustomCourseField'))$('p2v55CustomCourseField').style.display='none';
  };

  // Replace the batch save so Session Dates are managed only inside the batch page and status is automatic.
  $('p2BatchForm').onsubmit=e=>{
    e.preventDefault();const id=$('p2BatchId').value,start=$('p2BatchStart').value,end=$('p2BatchEnd').value,selected=$('p2BatchCourse').value;
    if(!start){toast('Start date is required');return}
    let course=selected==='__custom__'?null:p2Course(selected);
    if(selected==='__custom__'){
      const name=$('p2v55CustomCourseName')?.value.trim()||'';if(!name){toast('Enter the custom class name');$('p2v55CustomCourseName')?.focus();return}
      course=state.courseTypes.find(c=>normName(c.name)===normName(name));
      if(!course){course={id:uid('course'),name,category:'Other',progressionOrder:null,defaultSchedule:$('p2BatchScheduleType').value||'custom',defaultDay:Number($('p2BatchDay').value||0),notes:'Created from Custom Class',active:true,locked:false};state.courseTypes.push(course)}
    }
    if(!course){toast('Choose a course');return}
    let b=id?state.classBatches.find(x=>x.id===id):{id:uid('batch'),createdAt:new Date().toISOString(),sessionDates:[]};
    const oldDates=Array.isArray(b.sessionDates)?[...b.sessionDates]:[];
    Object.assign(b,{courseId:course.id,level:course.name,name:$('p2BatchName').value.trim(),start,end,year:Number(start.slice(0,4)),scheduleType:$('p2BatchScheduleType').value,usualDay:Number($('p2BatchDay').value),defaultClassDay:Number($('p2BatchDay').value),courseFee:String($('p2BatchFee')?.value||'').trim(),sessionDates:oldDates,acharyaIds:[...p2EditingAcharyaIds],acharyas:p2EditingAcharyaIds.map(aid=>state.acharyas.find(a=>a.id===aid)?.name).filter(Boolean),volunteerIds:[...p2EditingVolunteerIds],notes:$('p2BatchNotes').value.trim()});
    b.status=p2v55AutoStatus(b);if(!id)state.classBatches.push(b);state.activeClassBatchId=b.id;$('p2BatchModal').classList.remove('open');save();toast(id?'Class batch updated':'Class batch created');switchPage('classWorkspace')
  };

  function p2v55InstallSuggestionKeys(inputId,boxId,itemSelector,kind){
    const input=$(inputId),box=$(boxId);if(!input||!box)return;
    input.addEventListener('input',()=>{p2v55SuggestionIndex[kind]=-1});
    input.addEventListener('keydown',ev=>{
      const items=[...box.querySelectorAll(itemSelector)];if(!items.length)return;
      if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){
        ev.preventDefault();let i=p2v55SuggestionIndex[kind];i=ev.key==='ArrowDown'?Math.min(items.length-1,i+1):Math.max(0,i<=0?0:i-1);p2v55SuggestionIndex[kind]=i;items.forEach((x,n)=>x.classList.toggle('p2v55-key-active',n===i));items[i]?.scrollIntoView({block:'nearest'})
      }else if(ev.key==='Enter'&&p2v55SuggestionIndex[kind]>=0){ev.preventDefault();items[p2v55SuggestionIndex[kind]]?.click();p2v55SuggestionIndex[kind]=-1}
    })
  }
  p2v55InstallSuggestionKeys('p2BatchAcharyaSearch','p2BatchAcharyaSuggestions','.p2-ach-pick','acharya');
  p2v55InstallSuggestionKeys('p2BatchVolunteerSearch','p2BatchVolunteerSuggestions','.p2-vol-pick','volunteer');

  // Fail-closed progression helper used by the actual enrollment engine.
  function p2v55EligibilityFromHistory(level,history){const idx=p2Levels.indexOf(level);if(idx<=0)return true;const prev=p2Levels[idx-1];return history.some(e=>e.level===prev&&e.outcome==='Completed')}
  function p2v55ProgressionRequirement(studentId,batchId){
    const b=state.classBatches.find(x=>x.id===batchId);if(!b)return{ok:false,reason:'Class batch not found.'};
    const c=p2CourseForBatch(b),level=(c?.category==='Progression'||p2Levels.includes(c?.name)||p2Levels.includes(b.level))?(c?.name||b.level):'';
    const idx=p2Levels.indexOf(level);if(idx<=0)return{ok:true,reason:''};
    const s=p2FindStudent(studentId);const prev=p2Levels[idx-1];if(!s)return{ok:false,reason:`Previous level not completed. ${prev} completion is required for ${level}. Admin approval required.`};
    const history=p2StudentEnrollments(studentId);return p2v55EligibilityFromHistory(level,history)?{ok:true,reason:''}:{ok:false,reason:`Previous level not completed. ${s.name} must complete ${prev} before joining ${level}. Admin approval required.`}
  }
  if(typeof p2v54ProgressionCheck==='function')p2v54ProgressionCheck=function(student,b){return p2v55ProgressionRequirement(student?.id||'',b?.id||'')};
  const p2v55CreateEnrollmentBase=p2CreateEnrollment;
  p2CreateEnrollment=function(studentId,batchId){
    const check=p2v55ProgressionRequirement(studentId,batchId),override=(typeof p2v54AdminOverrideReason!=='undefined'&&!!p2v54AdminOverrideReason);
    if(!check.ok&&!override){toast(check.reason);return null}
    const en=p2v55CreateEnrollmentBase(studentId,batchId);if(!en)return null;const b=state.classBatches.find(x=>x.id===batchId);if(b?.courseFee!==undefined&&b.courseFee!==''&&!en.feeAmount)en.feeAmount=String(b.courseFee);if(override){en.adminOverride=true;en.adminOverrideReason=check.reason||p2v54AdminOverrideReason;en.adminOverrideAt=en.adminOverrideAt||new Date().toISOString()}return en
  };

  // Direct class-only enrollments must never bypass progression. Student Master is already mandatory from beta.5.3.
  const p2v55DirectEnrollmentBase=p2cDirectEnrollment;
  p2cDirectEnrollment=function(c,name,mobile,b){
    const student=(c?.studentId&&p2FindStudent(c.studentId))||state.students.find(s=>normMobile(s.mobile)===normMobile(mobile||''));
    const check=p2v55ProgressionRequirement(student?.id||'',b?.id||'');if(!check.ok){toast(check.reason);return null}const en=p2v55DirectEnrollmentBase(c,name,mobile,b);if(en&&b?.courseFee!==undefined&&b.courseFee!==''&&!en.feeAmount)en.feeAmount=String(b.courseFee);return en
  };

  function p2v55MonthKey(iso){return String(iso||'').slice(0,7)}
  function p2v55MonthLabel(key){if(!/^\d{4}-\d{2}$/.test(key))return key;return new Date(key+'-01T12:00:00').toLocaleString('en-IN',{month:'long',year:'numeric'}).toUpperCase()}
  function p2v55RenderHeader(b){
    const status=p2v55AutoStatus(b),fee=String(b.courseFee??'').trim();b.status=status;
    $('p2ClassHeader').innerHTML=`<div><h3>${esc(p2CourseName(b))} — ${esc(b.name)}</h3><p>${b.start?fmt(b.start):'Start date not set'}${b.end?' to '+fmt(b.end):' · End date not set'} · ${esc(status)}</p><p style="margin-top:7px;font-size:12px">Acharya: ${esc(p2AcharyaNames(b).join(', ')||'Not assigned')}${fee?` &nbsp;|&nbsp; Fee: ₹ ${esc(fee)}`:''}</p></div><div class="actions"><button class="btn secondary" id="p2EditActiveBatch">✎ Edit Batch</button><button class="btn secondary" id="p2BackClasses">← Back to Classes</button></div>`;
    $('p2EditActiveBatch').onclick=()=>p2OpenBatch(b.id);$('p2BackClasses').onclick=()=>switchPage('classes')
  }
  p2v5RenderHeader=p2v55RenderHeader;

  p2v5RenderSchedule=function(b){
    let card=$('p2v5ScheduleCard');if(!card){card=document.createElement('div');card.id='p2v5ScheduleCard';card.className='card';$('p2ClassHeader').insertAdjacentElement('afterend',card)}
    const dates=p2v5ValidDates(b),ended=p2v5IsEnded(b),day=Number(b.defaultClassDay??b.usualDay??p2CourseForBatch(b)?.defaultDay??0),days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const grouped={};dates.forEach(d=>(grouped[p2v55MonthKey(d)]||(grouped[p2v55MonthKey(d)]=[])).push(d));const months=Object.keys(grouped).sort(),visible=p2v55DatesVisible.has(b.id),open=p2v55MonthOpen.get(b.id)||'';
    card.innerHTML=`<div class="p2v55-schedule-head"><div><div class="p2v5-schedule-title">Class Dates &amp; Schedule</div></div><div class="p2v55-summary"><div><small>DATE RANGE</small><strong>${b.start?fmt(b.start):'—'} → ${b.end?fmt(b.end):'Open'}</strong></div><div><small>TOTAL CLASSES</small><strong>${dates.length}</strong></div><div><small>CLASS DAY</small><strong>${esc(days[day]||'—')}</strong></div></div><div class="p2v55-actions"><button class="btn" id="p2v5NewClass" type="button" ${ended?'disabled':''}>＋ NEW CLASS</button><button class="btn secondary" id="p2v55ViewDates" type="button">${visible?'HIDE DATES ⌃':'VIEW DATES ⌄'}</button></div></div>${visible?`<div class="p2v55-months">${months.length?months.map(m=>`<button type="button" class="p2v55-month ${open===m?'open':''}" data-month="${m}"><span>${esc(p2v55MonthLabel(m))}</span><small>${grouped[m].length} class${grouped[m].length===1?'':'es'}</small><b>${open===m?'⌃':'⌄'}</b></button>`).join(''):'<div class="p2-empty">No class dates added yet.</div>'}</div>${open&&grouped[open]?`<div class="p2v55-month-dates"><div class="p2v55-month-title">${esc(p2v55MonthLabel(open))} <small>(${grouped[open].length} classes)</small></div>${grouped[open].map(d=>`<div class="p2v55-date-row"><span>${fmt(d)} · ${p2v5Weekday(d)}</span><span class="p2v55-date-actions">${ended?'':`<button class="p2v5-date-edit" data-date="${d}" type="button" title="Edit class date">✎</button><button class="p2v5-date-remove" data-date="${d}" type="button" title="Remove class date">×</button>`}</span></div>`).join('')}</div>`:''}`:''}<input class="p2v5-hidden-date" id="p2v5NewClassDate" type="date">`;
    $('p2v55ViewDates').onclick=()=>{visible?p2v55DatesVisible.delete(b.id):p2v55DatesVisible.add(b.id);p2v5RenderSchedule(b)};
    card.querySelectorAll('.p2v55-month').forEach(x=>x.onclick=()=>{const m=x.dataset.month;p2v55MonthOpen.set(b.id,p2v55MonthOpen.get(b.id)===m?'':m);p2v5RenderSchedule(b)});
    if(!ended){
      $('p2v5NewClass').onclick=()=>p2v5Fix2OpenDateDialog(b,'');
      card.querySelectorAll('.p2v5-date-edit').forEach(x=>x.onclick=()=>p2v5Fix2OpenDateDialog(b,x.dataset.date));
      card.querySelectorAll('.p2v5-date-remove').forEach(x=>x.onclick=()=>{const d=x.dataset.date;if(!confirm(`Remove class ${fmt(d)}? Attendance for this date will also be removed.`))return;b.sessionDates=p2v5ValidDates(b).filter(v=>v!==d);state.classEnrollments.filter(e=>e.batchId===b.id).forEach(e=>{if(e.attendance)delete e.attendance[d]});save();toast('Class date removed')})
    }
  };

  p2v5RenderStudentDetails=function(b,en){
    const host=$('p2v5StudentDetails');if(!host)return;if(!en){host.innerHTML='<div class="p2-empty">Select a student to see details.</div>';return}
    const p=p2v5Person(en),c=p2v5AttendanceCounts(b,en),paid=en.paymentStatus==='Paid',fee=String(en.feeAmount||b.courseFee||'—');
    host.innerHTML=`<div class="p2v5-student-head"><div><h3>Student Details</h3><strong style="color:#102d5e;font-size:16px">${esc(p.name)}</strong><div class="p2v5-student-mobile">${esc(p.mobile||'No mobile')}</div></div><button id="p2v5EditStudent" class="btn secondary small" type="button">✎ Edit</button></div><div class="p2v5-student-kpis"><span><b>${c.dates.length}</b>Classes</span><span class="present"><b>${c.present}</b>Present</span><span class="absent"><b>${c.absent}</b>Absent</span><span><b>${c.blank}</b>Not Marked</span><span><b>${c.pct}%</b>Attendance</span></div><div class="p2v5-detail-section"><div class="p2v5-payment ${paid?'':'pending'}"><div class="p2v5-payment-head"><span>Payment / Fee Status</span><span class="p2v5-status-pill ${paid?'paid':''}">${paid?'PAID':'UNPAID'}</span></div><div class="p2v5-payment-grid"><div>Course Fee<b>₹ ${esc(fee)}</b></div><div>Status<b>${paid?'Paid':'Unpaid'}</b></div>${paid?`<div>Mode<b>${esc(en.paymentMode||'—')}</b></div>`:''}</div></div></div><div class="p2v5-detail-section"><div class="p2v5-detail-title">Outcome for This Batch</div><div class="p2v5-outcome">${esc(p2v5OutcomeLabel(b,en))}</div></div>`;
    $('p2v5EditStudent').onclick=()=>p2v5OpenStudentEdit(en)
  };

  const p2v55RenderAttendanceBase=p2v5RenderAttendance;
  p2v5RenderAttendance=function(b){
    p2v55RenderAttendanceBase(b);const legend=$('p2ClassRoster')?.querySelector('.p2v5-legend');if(legend){const spans=[...legend.querySelectorAll('span')];spans.forEach(s=>{if(/not marked/i.test(s.textContent||''))s.remove()})}
  };
  function p2v55AttendanceViewport(){const w=$('p2ClassRoster')?.querySelector('.p2v5-grid-wrap');return{left:w?.scrollLeft||0,top:w?.scrollTop||0}}
  function p2v55RestoreAttendanceViewport(pos){requestAnimationFrame(()=>{const w=$('p2ClassRoster')?.querySelector('.p2v5-grid-wrap');if(w){w.scrollLeft=pos.left;w.scrollTop=pos.top}})}
  const p2v55MarkPresentBase=p2v5MarkPresent;
  p2v5MarkPresent=function(en,date){const pos=p2v55AttendanceViewport();p2v55MarkPresentBase(en,date);p2v55RestoreAttendanceViewport(pos)};
  const p2v55MarkAbsentBase=p2v5MarkRemainingAbsent;
  p2v5MarkRemainingAbsent=function(b,date){const pos=p2v55AttendanceViewport();p2v55MarkAbsentBase(b,date);p2v55RestoreAttendanceViewport(pos)};

  const p2v55RenderClassesBase=p2RenderClasses;
  p2RenderClasses=function(){p2v55SyncBatchStatuses();return p2v55RenderClassesBase()};
  const p2v55RenderWorkspaceBase=p2RenderClassWorkspace;
  p2RenderClassWorkspace=function(){p2v55SyncBatchStatuses();const r=p2v55RenderWorkspaceBase();const b=p2ActiveBatch();if(b)p2v5RenderHeader(b);return r};

  function p2v55EnsureStyle(){if($('p2v55Style'))return;const st=document.createElement('style');st.id='p2v55Style';st.textContent=`
    .p2v55-key-active{background:#e8f2ff!important;outline:2px solid #7ba9dc;outline-offset:-2px}
    .p2v55-schedule-head{display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center}.p2v55-summary{display:grid;grid-template-columns:1.3fr .8fr .8fr;border-left:1px solid #d8e4ef}.p2v55-summary>div{padding:5px 22px;border-right:1px solid #d8e4ef}.p2v55-summary small{display:block;font-size:10px;font-weight:900;color:#49637d;margin-bottom:4px}.p2v55-summary strong{display:block;color:#123f7d;font-size:16px}.p2v55-actions{display:flex;gap:10px;align-items:center}.p2v55-months{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid #d6e3ef;border-radius:12px;overflow:hidden;margin-top:18px}.p2v55-month{border:0;border-right:1px solid #d6e3ef;background:#fff;padding:17px 20px;color:#123f7d;display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;text-align:left;cursor:pointer}.p2v55-month:nth-child(3n){border-right:0}.p2v55-month.open{background:#edf6ff;box-shadow:inset 0 0 0 1px #6aa6e8}.p2v55-month span{font-weight:900}.p2v55-month small{font-size:12px;font-weight:600}.p2v55-month-dates{margin-top:12px;border:1px solid #d6e3ef;border-radius:12px;overflow:hidden}.p2v55-month-title{padding:14px 18px;background:#edf6ff;color:#123f7d;font-weight:900}.p2v55-date-row{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;border-top:1px solid #e3ebf3;color:#24486d}.p2v55-date-actions{opacity:0;display:flex;gap:8px}.p2v55-date-row:hover .p2v55-date-actions{opacity:1}.p2v55-date-actions button{border:0;background:transparent;color:#174d8d;cursor:pointer;font-size:16px}.p2v55-date-actions .p2v5-date-remove{color:#c93636}.p2v5-hidden-date{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;opacity:0!important}
    @media(max-width:1000px){.p2v55-schedule-head{grid-template-columns:1fr}.p2v55-summary{border-left:0}.p2v55-actions{justify-content:flex-start}}@media(max-width:760px){.p2v55-months{grid-template-columns:1fr}.p2v55-month{border-right:0;border-bottom:1px solid #d6e3ef}.p2v55-summary{grid-template-columns:1fr}}
  `;document.head.appendChild(st)}
  p2v55EnsureStyle();p2v55SyncBatchStatuses();
'''

html=html.replace(marker,fix+marker)
required=['PHASE2 BETA5 FIX5','+ Custom Class','COURSE FEE (₹)','p2v55EligibilityFromHistory','Previous level not completed','p2v55MonthOpen','p2v55AttendanceViewport']
missing=[x for x in required if x not in html]
if missing: raise SystemExit('Missing beta.5.5 markers: '+repr(missing))
start=html.find('// PHASE2 BETA5 FIX5')
block=html[start:html.find(marker,start)]
if 'Attendance by Date' in block: raise SystemExit('Attendance by Date leaked into beta.5.5 student details override')
p.write_text(html,encoding='utf-8')
print('BETA5 FIX5 APPLIED',len(html))
