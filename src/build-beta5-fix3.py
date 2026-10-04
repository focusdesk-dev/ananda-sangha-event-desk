from pathlib import Path

p=Path('src/index.html')
html=p.read_text(encoding='utf-8')
if 'PHASE2 BETA5 FIX2' not in html:
    raise SystemExit('beta.5.2 marker not found')
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('fix3 insertion marker not found')

fix=r'''  // PHASE2 BETA5 FIX3 — historical attendance, automatic Student Master, ended-batch summary/editing, cleaner Classes navigation.
  const p2v53EditingEnded=new Set();
  let p2v53EndPreviewBatchId='';
  function p2v53ActuallyEnded(b){return String(b?.status||'').toLowerCase()==='completed'||!!b?.endedAt}

  // Historical attendance: once someone is enrolled in the batch, every saved class date can be corrected/marked.
  p2v5EnrollmentEligibleOn=function(){return true};

  // Ended batches are locked by default, but become editable only after the explicit Edit Ended Batch action.
  p2v5IsEnded=function(b){return p2v53EditingEnded.has(b?.id)?false:p2v53ActuallyEnded(b)};

  function p2v53EnsureStudentMasterUi(){
    p2cEnsureEnrollUi();const cb=$('p2cAddStudentMaster');if(!cb)return;cb.checked=true;cb.disabled=true;const row=cb.closest('.p2c-master-option');if(row)row.style.display='none'
  }
  const p2v53ResetEnrollBase=p2cResetEnroll;
  p2cResetEnroll=function(){p2v53ResetEnrollBase();p2v53EnsureStudentMasterUi()};
  const p2v53ShowEnrollBase=p2cShowEnrollSuggestions;
  p2cShowEnrollSuggestions=function(){p2v53EnsureStudentMasterUi();p2v53ShowEnrollBase();p2v53EnsureStudentMasterUi()};
  p2v53EnsureStudentMasterUi();
  const p2v53EnrollForm=$('p2EnrollForm'),p2v53EnrollSubmitBase=p2v53EnrollForm?.onsubmit;
  if(p2v53EnrollForm&&p2v53EnrollSubmitBase)p2v53EnrollForm.onsubmit=function(ev){p2v53EnsureStudentMasterUi();return p2v53EnrollSubmitBase.call(this,ev)};

  // Migrate older class-only enrolments into Student Master when they have a valid mobile number.
  function p2v53MigrateClassOnlyStudents(){
    let changed=false;
    state.classEnrollments.filter(e=>!e.studentId&&e.personName).forEach(en=>{
      const mobile=normMobile(en.personMobile||'');if(mobile.length!==10)return;
      let s=state.students.find(x=>normMobile(x.mobile)===mobile)||state.students.find(x=>normName(x.name)===normName(en.personName)&&normMobile(x.mobile)===mobile);
      if(!s){s={id:uid('stu'),cloudId:uid('sync'),createdAt:new Date().toISOString(),name:en.personName,mobile,kriyaDate:'',kriyaYear:'',notes:'Created from class enrolment'};state.students.push(s)}
      (en.personSources||[]).forEach(src=>{if(src.type==='volunteer')s.volunteerId=src.id;if(src.type==='attendee')s.attendeeId=src.id;if(src.type==='kriyaban')s.kriyabanId=src.id});
      p2LinkStudent(s);en.studentId=s.id;changed=true
    });
    if(changed)localStorage.setItem(KEY,JSON.stringify(state))
  }
  p2v53MigrateClassOnlyStudents();

  // Classes home stays simple; Active Classes opens as its own page/window.
  function p2v53PrepareClassesNavigation(){
    $('p2ClassesAttendance')?.remove();
    const reports=$('p2ClassesReports');if(reports){const no=reports.querySelector('.no');if(no)no.textContent='04'}
    let active=$('activeClasses');
    if(!active){
      active=document.createElement('section');active.id='activeClasses';active.className='page';
      active.innerHTML=`<div class="event-banner"><div><h3>Active Classes</h3><p>Classes by year. Double-click a year to view active, upcoming, inactive and completed batches.</p></div><button id="p2v53BackClasses" class="btn secondary" type="button">← Back to Classes</button></div>`;
      $('classes').insertAdjacentElement('afterend',active)
    }
    const list=$('p2BatchListCard');if(list&&list.parentElement!==active)active.appendChild(list);
    const past=$('p2PastClassCard');if(past&&past.parentElement!==active)active.appendChild(past);
    $('p2v53BackClasses').onclick=()=>switchPage('classes');
    $('p2ClassBatches').onclick=()=>switchPage('activeClasses')
  }
  p2v53PrepareClassesNavigation();

  p2BindClassListButtons=function(){
    document.querySelectorAll('#p2BatchListCard .p2-open-class').forEach(x=>x.onclick=()=>{state.activeClassBatchId=x.dataset.id;save();switchPage('classWorkspace')});
    document.querySelectorAll('#p2BatchListCard .p2-edit-class').forEach(x=>x.onclick=()=>p2OpenBatch(x.dataset.id))
  };

  const p2v53SwitchPageBase=switchPage;
  switchPage=function(id){
    const leaving=page==='classWorkspace'&&id!=='classWorkspace';if(leaving){p2v53EditingEnded.clear();p2v53EndPreviewBatchId=''}
    p2v53SwitchPageBase(id);
    if(id==='activeClasses'){$('pageTitle').textContent='Active Classes';$('pageSubtitle').textContent='Classes grouped by year';p2RenderClasses()}
  };

  function p2v53EnsureStyle(){
    if($('p2v53Style'))return;const style=document.createElement('style');style.id='p2v53Style';style.textContent=`
      #p2v53EndSummary{display:none;margin-top:14px}.p2v53-summary-card{background:#fff;border:1px solid #d8e2ec;border-radius:16px;padding:18px;margin-bottom:14px}.p2v53-summary-title{font-size:18px;font-weight:900;color:#102d5e;margin-bottom:12px}.p2v53-metrics{display:grid;grid-template-columns:repeat(7,minmax(120px,1fr));gap:10px}.p2v53-metric{border:1px solid #dce6f0;border-radius:12px;padding:13px;background:#f8fbff;min-height:72px}.p2v53-metric.green{background:#eefbf4}.p2v53-metric.red{background:#fff1f1}.p2v53-metric.amber{background:#fff8e8}.p2v53-metric span{display:block;font-size:11px;font-weight:800;color:#24486d;text-transform:uppercase}.p2v53-metric b{display:block;font-size:24px;color:#102d5e;margin-top:5px}.p2v53-summary-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}.p2v53-summary-list{display:grid;gap:9px}.p2v53-summary-line{display:flex;gap:9px;align-items:flex-start;color:#24486d}.p2v53-summary-line i{width:10px;height:10px;border-radius:50%;background:#4bbf7b;display:inline-block;margin-top:5px;flex:0 0 auto}.p2v53-summary-line.red i{background:#ff6969}.p2v53-summary-line.blue i{background:#4d9df5}.p2v53-summary-line.amber i{background:#f0b429}.p2v53-payment-split{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:10px}.p2v53-pay-box{border:1px solid #dce6f0;border-radius:10px;padding:10px;text-align:center}.p2v53-pay-box b{display:block;font-size:20px;color:#102d5e}.p2v53-summary-table{overflow:auto;border:1px solid #dce6f0;border-radius:12px}.p2v53-summary-table table{width:100%;border-collapse:collapse;min-width:850px}.p2v53-summary-table th,.p2v53-summary-table td{padding:9px 11px;border-bottom:1px solid #e5ecf3;text-align:left}.p2v53-pill{display:inline-block;padding:4px 10px;border-radius:999px;background:#e9f8ef;color:#14844a;font-weight:800;font-size:12px}.p2v53-pill.red{background:#ffeaea;color:#c73636}.p2v53-pill.blue{background:#eaf3ff;color:#205fa9}.p2v53-summary-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}.p2v53-summary-note{margin-top:12px;background:#edf6ff;border:1px solid #cfe3f8;border-radius:10px;padding:10px 12px;color:#31597f;font-size:12px}.p2v53-editing-note{margin:10px 0;background:#fff8e8;border:1px solid #f2d899;border-radius:10px;padding:10px 12px;color:#795b10;font-weight:700}
      @media(max-width:1200px){.p2v53-metrics{grid-template-columns:repeat(4,1fr)}}@media(max-width:850px){.p2v53-metrics{grid-template-columns:repeat(2,1fr)}.p2v53-summary-two{grid-template-columns:1fr}}
    `;document.head.appendChild(style)
  }
  p2v53EnsureStyle();

  function p2v53ProposedOutcome(b,en){
    const dates=p2v5ValidDates(b),present=dates.filter(d=>p2cAttendanceStatus(en,d)===true).length,absent=dates.filter(d=>p2cAttendanceStatus(en,d)===false).length;
    if(dates.length&&present===0&&absent===dates.length)return'Withdrawn';
    if(present>0)return'Completed';
    return en.outcome&&en.outcome!=='Enrolled'?en.outcome:'Did Not Complete'
  }
  function p2v53AttendanceSummary(b,en){const dates=p2v5ValidDates(b),present=dates.filter(d=>p2cAttendanceStatus(en,d)===true).length,absent=dates.filter(d=>p2cAttendanceStatus(en,d)===false).length,blank=dates.length-present-absent;return{present,absent,blank,total:dates.length,pct:dates.length?Math.round(present*100/dates.length):0}}
  function p2v53MissingAttendance(b){const dates=p2v5ValidDates(b),enrol=state.classEnrollments.filter(e=>e.batchId===b.id),missing=[];enrol.forEach(en=>dates.forEach(d=>{if(p2cAttendanceStatus(en,d)===null)missing.push([en,d])}));return missing}
  function p2v53ApplyFinalOutcomes(b){
    const enrol=state.classEnrollments.filter(e=>e.batchId===b.id),next=p2v5CourseNext(b),course=p2CourseForBatch(b);
    enrol.forEach(en=>{const out=p2v53ProposedOutcome(b,en);en.outcome=out;if(out==='Completed'){en.completionDate=en.completionDate||today();en.eligibleFor=course?.name==='Level 4'?'':next}else{en.completionDate='';en.eligibleFor=''}})
  }

  function p2v53EnsureSummaryHost(){
    let host=$('p2v53EndSummary');if(host)return host;host=document.createElement('div');host.id='p2v53EndSummary';$('p2ClassHeader').insertAdjacentElement('afterend',host);return host
  }
  function p2v53SetSummaryMode(show){
    const ws=$('classWorkspace'),host=p2v53EnsureSummaryHost();
    [...ws.children].forEach(el=>{if(el===host||el.id==='p2ClassHeader')return;if(show){if(el.dataset.p2v53Display===undefined)el.dataset.p2v53Display=el.style.display||'';el.style.display='none'}else{el.style.display=el.dataset.p2v53Display??''}});host.style.display=show?'block':'none'
  }
  function p2v53EligibilityLabel(courseName,outcome,next){if(outcome!=='Completed')return'No';if(courseName==='Level 4')return'Acharya';return next?'Yes':'—'}
  function p2v53RenderSummary(b,preview=false){
    p2v53SetSummaryMode(true);const host=p2v53EnsureSummaryHost(),enrol=state.classEnrollments.filter(e=>e.batchId===b.id).slice().sort((a,z)=>p2v5Person(a).name.localeCompare(p2v5Person(z).name,undefined,{sensitivity:'base'})),dates=p2v5ValidDates(b),course=p2CourseForBatch(b),next=p2v5CourseNext(b),courseName=course?.name||p2CourseName(b);
    const rows=enrol.map(en=>{const a=p2v53AttendanceSummary(b,en),out=preview?p2v53ProposedOutcome(b,en):(en.outcome||p2v53ProposedOutcome(b,en)),paid=en.paymentStatus==='Paid';return{en,p:p2v5Person(en),a,out,paid,eligible:p2v53EligibilityLabel(courseName,out,next)}});
    const completed=rows.filter(r=>r.out==='Completed').length,incomplete=rows.filter(r=>r.out!=='Completed').length,paid=rows.filter(r=>r.paid).length,unpaid=rows.length-paid,cash=rows.filter(r=>r.paid&&r.en.paymentMode==='Cash').length,upi=rows.filter(r=>r.paid&&r.en.paymentMode==='UPI').length,card=rows.filter(r=>r.paid&&r.en.paymentMode==='Card').length,eligible=(courseName==='Level 4'?0:rows.filter(r=>r.eligible==='Yes').length);
    host.innerHTML=`<div class="p2v53-summary-card"><div class="p2v53-summary-title">End Batch Summary</div><div class="p2v53-metrics"><div class="p2v53-metric"><span>Enrolled</span><b>${rows.length}</b></div><div class="p2v53-metric"><span>Sessions</span><b>${dates.length}</b></div><div class="p2v53-metric green"><span>Completed</span><b>${completed}</b></div><div class="p2v53-metric red"><span>Incomplete / Withdraw</span><b>${incomplete}</b></div><div class="p2v53-metric"><span>Paid</span><b>${paid}</b></div><div class="p2v53-metric red"><span>Unpaid</span><b>${unpaid}</b></div><div class="p2v53-metric amber"><span>${courseName==='Level 4'?'Kriya Decision':next?'Eligible for '+esc(next):'Progression'}</span><b>${courseName==='Level 4'?'Acharya':next?eligible:'—'}</b></div></div></div>
      <div class="p2v53-summary-two"><div class="p2v53-summary-card"><div class="p2v53-summary-title">Batch Outcome Summary</div><div class="p2v53-summary-list"><div class="p2v53-summary-line"><i></i><span>${completed} student${completed===1?'':'s'} completed ${esc(courseName)}${next&&courseName!=='Level 4'?' and are eligible for '+esc(next):''}</span></div><div class="p2v53-summary-line red"><i></i><span>${incomplete} student${incomplete===1?' is':'s are'} Incomplete / Withdrawn</span></div><div class="p2v53-summary-line blue"><i></i><span>${next&&courseName!=='Level 4'?`Level progression: ${esc(courseName)} → ${esc(next)}`:courseName==='Level 4'?'Kriya eligibility is decided by the Acharya':'No automatic next-level progression'}</span></div><div class="p2v53-summary-line amber"><i></i><span>${preview?'Review this summary before confirming End Batch':'This batch is ended but remains editable for corrections'}</span></div></div><div class="p2v53-summary-note">You can edit attendance, class dates, payment status and outcomes after ending the batch.</div></div>
      <div class="p2v53-summary-card"><div class="p2v53-summary-title">Payment Summary</div><div class="p2v53-metrics" style="grid-template-columns:1fr 1fr"><div class="p2v53-metric green"><span>Paid</span><b>${paid}</b></div><div class="p2v53-metric red"><span>Unpaid</span><b>${unpaid}</b></div></div><div style="font-weight:800;color:#102d5e;margin-top:12px">Payment Mode Split</div><div class="p2v53-payment-split"><div class="p2v53-pay-box">Cash<b>${cash}</b></div><div class="p2v53-pay-box">UPI<b>${upi}</b></div><div class="p2v53-pay-box">Card<b>${card}</b></div></div></div></div>
      <div class="p2v53-summary-card"><div class="p2v53-summary-title">Student Summary</div><div class="p2v53-summary-table"><table><thead><tr><th>#</th><th>Name</th><th>Sessions Attended</th><th>Attendance %</th><th>Outcome</th><th>Payment Status</th><th>${courseName==='Level 4'?'Kriya Decision':'Eligible Next Level'}</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.p.name)}</td><td>${r.a.present} / ${r.a.total}</td><td>${r.a.pct}%</td><td><span class="p2v53-pill ${r.out==='Completed'?'':'red'}">${esc(r.out)}</span></td><td><span class="p2v53-pill ${r.paid?'':'red'}">${r.paid?`Paid${r.en.paymentMode?' ('+esc(r.en.paymentMode)+')':''}`:'Unpaid'}</span></td><td><span class="p2v53-pill ${r.eligible==='Yes'?'':r.eligible==='Acharya'?'blue':'red'}">${esc(r.eligible)}</span></td></tr>`).join('')}</tbody></table></div><div class="p2v53-summary-actions"><button id="p2v53EditSummary" class="btn secondary" type="button">✎ ${preview?'EDIT SUMMARY':'EDIT ENDED BATCH'}</button>${preview?'<button id="p2v53ConfirmEnd" class="btn" type="button">✓ CONFIRM END BATCH</button>':'<button class="btn" type="button" disabled>BATCH ENDED ✓</button>'}</div></div>`;
    p2v5RenderHeader(b);const actions=$('p2ClassHeader')?.querySelector('.actions');if(actions&&p2v53ActuallyEnded(b)&&!preview)actions.innerHTML='<button class="btn secondary" id="p2v53EditEndedTop" type="button">✎ Edit Ended Batch</button><button class="btn secondary" id="p2v53BackTop" type="button">← Back to Classes</button>';
    if($('p2v53BackTop'))$('p2v53BackTop').onclick=()=>switchPage('classes');
    const edit=()=>{p2v53EndPreviewBatchId='';if(p2v53ActuallyEnded(b))p2v53EditingEnded.add(b.id);p2v53SetSummaryMode(false);p2RenderClassWorkspace()};
    $('p2v53EditSummary').onclick=edit;if($('p2v53EditEndedTop'))$('p2v53EditEndedTop').onclick=edit;
    if(preview)$('p2v53ConfirmEnd').onclick=()=>p2v53FinalizeEndBatch(b)
  }

  function p2v53RequestEndBatch(b){
    if(!b||p2v53ActuallyEnded(b))return;const dates=p2v5ValidDates(b);if(!dates.length){toast('Add at least one class date before ending the batch');return}const missing=p2v53MissingAttendance(b);if(missing.length){toast(`Attendance is still unmarked in ${missing.length} place${missing.length===1?'':'s'}. Use each class column's Mark Remaining Absent button first.`);return}p2v53EndPreviewBatchId=b.id;p2v53RenderSummary(b,true)
  }
  function p2v53FinalizeEndBatch(b){
    const missing=p2v53MissingAttendance(b);if(missing.length){toast('Complete all attendance before ending the batch');return}p2v53ApplyFinalOutcomes(b);b.status='Completed';b.endedAt=new Date().toISOString();b.end=b.end||p2v5ValidDates(b).at(-1)||today();p2v53EndPreviewBatchId='';p2v53EditingEnded.delete(b.id);save();toast('Batch ended and summary saved');p2v53RenderSummary(b,false)
  }
  function p2v53SaveEndedEdits(b){
    const missing=p2v53MissingAttendance(b);if(missing.length){toast(`Attendance is still unmarked in ${missing.length} place${missing.length===1?'':'s'}`);return}p2v53ApplyFinalOutcomes(b);p2v53EditingEnded.delete(b.id);localStorage.setItem(KEY,JSON.stringify(state));toast('Ended batch corrections saved');p2v53RenderSummary(b,false)
  }

  p2v5EndBatch=p2v53RequestEndBatch;
  const p2v53StatsBase=p2v5RenderStats;
  p2v5RenderStats=function(b){p2v53StatsBase(b);if(p2v53EditingEnded.has(b.id)){const btn=$('p2v5EndBatch');if(btn){btn.disabled=false;btn.textContent='SAVE & RETURN TO SUMMARY';btn.onclick=()=>p2v53SaveEndedEdits(b)}}};

  const p2v53WorkspaceBase=p2RenderClassWorkspace;
  p2RenderClassWorkspace=function(){
    const b=p2ActiveBatch();if(b&&p2v53ActuallyEnded(b)&&!p2v53EditingEnded.has(b.id)){p2v53RenderSummary(b,false);return}
    p2v53SetSummaryMode(false);p2v53WorkspaceBase();
    if(b&&p2v53EditingEnded.has(b.id)){$('p2ClassHeader')?.insertAdjacentHTML('afterend','<div id="p2v53EditingEndedNote" class="p2v53-editing-note">Editing ended batch. Make corrections, then use SAVE &amp; RETURN TO SUMMARY.</div>')}
  };

  // Rebind navigation and rerender the current page after all overrides are installed.
  p2v53PrepareClassesNavigation();
  if(page==='classes'||page==='activeClasses')p2RenderClasses();
  if(page==='classWorkspace'&&p2ActiveBatch())p2RenderClassWorkspace();
'''

left,right=html.rsplit(marker,1)
html=left+'\n\n'+fix+marker+right
required=['PHASE2 BETA5 FIX3','p2v5EnrollmentEligibleOn=function(){return true}','p2v53MigrateClassOnlyStudents','p2v53RenderSummary','EDIT ENDED BATCH','activeClasses','SAVE & RETURN TO SUMMARY']
missing=[x for x in required if x not in html]
if missing: raise SystemExit('Missing beta.5.3 markers: '+repr(missing))
p.write_text(html,encoding='utf-8')
print('BETA5 FIX3 APPLIED',len(html))
