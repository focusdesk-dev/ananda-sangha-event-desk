from pathlib import Path
p=Path('src/index.html')
html=p.read_text(encoding='utf-8')
if 'PHASE2 BETA5 FIX5' not in html:
    raise SystemExit('beta.5.5 marker not found')
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('fix6 insertion marker not found')

fix=r'''  // PHASE2 BETA5 FIX6 — post-5.5 corrections: approval flow, clean enrol search, report-all filters, schedule layout.
  let p2v56EnrollSuggestionIndex=-1;

  function p2v56OpenAdminApproval(reason,action){
    if(typeof p2v54EnsureOverrideModal==='function')p2v54EnsureOverrideModal();
    const modal=$('p2v54OverrideModal');
    if(!modal){toast('Administrator password approval is required.');return false}
    p2v54OverridePending={reason,action};
    $('p2v54OverrideText').textContent=reason;
    $('p2v54OverrideError').textContent='';
    $('p2v54OverridePassword').value='';
    modal.classList.add('open');
    setTimeout(()=>$('p2v54OverridePassword')?.focus(),30);
    return true
  }
  function p2v56FinishEnrollment(en){
    if(!en)return null;
    en.enrolledAt=$('p2EnrollDate')?.value||today();
    $('p2EnrollModal')?.classList.remove('open');
    if(typeof p2cSelectedEnrollmentId!=='undefined')p2cSelectedEnrollmentId=en.id;
    save();toast('Enrolled in class');return en
  }

  // Central progression guard must open the password flow, not flash a warning and stop.
  const p2v56CreateEnrollmentBase=p2CreateEnrollment;
  p2CreateEnrollment=function(studentId,batchId){
    const check=p2v55ProgressionRequirement(studentId,batchId),override=typeof p2v54AdminOverrideReason!=='undefined'&&!!p2v54AdminOverrideReason;
    if(!check.ok&&!override){
      p2v56OpenAdminApproval(check.reason,()=>{const en=p2v56CreateEnrollmentBase(studentId,batchId);if(en)p2v56FinishEnrollment(en)});
      return null
    }
    return p2v56CreateEnrollmentBase(studentId,batchId)
  };

  // Enrollment search stays empty until typing; then it becomes a small searchable suggestion list.
  p2cShowEnrollSuggestions=function(){
    p2cEnsureEnrollUi();const input=$('p2EnrollStudentSearch'),box=$('p2EnrollSuggestions'),q=(input?.value||'').trim().toLowerCase();
    p2v56EnrollSuggestionIndex=-1;
    if(!q){p2cEnrollCandidates=[];box.innerHTML='';box.classList.add('hidden');return}
    const all=p2cCandidateList(),rows=all.filter(c=>[c.name,c.mobile,...p2cCandidateTags(c)].join(' ').toLowerCase().includes(q)).slice(0,10);
    p2cEnrollCandidates=rows;
    box.innerHTML=rows.map((c,i)=>`<div class="p2-suggestion p2c-enrol-pick" data-index="${i}"><strong>${esc(c.name||'Unnamed')}</strong><br><small>${esc(c.mobile||'No mobile')} · ${esc(p2cCandidateTags(c).join(' · '))}</small></div>`).join('')||'<div class="p2-suggestion">No matching record.</div>';
    box.classList.remove('hidden');
    const choose=x=>{const c=p2cEnrollCandidates[Number(x.dataset.index)];if(!c)return;p2cEnrollSelection=c;$('p2EnrollStudentId').value=c.studentId||c.key;$('p2EnrollStudentSearch').value=[c.name,c.mobile].filter(Boolean).join(' · ');$('p2cEnrollName').value=c.name||'';$('p2cEnrollMobile').value=c.mobile||'';const tags=p2cCandidateTags(c);$('p2EnrollSelected').innerHTML=`<strong>Selected:</strong> ${esc(c.name)}${c.mobile?' · '+esc(c.mobile):''}<br><small>${esc(tags.join(' · '))}</small>`;$('p2cAddStudentMaster').checked=true;$('p2cAddStudentMaster').disabled=true;box.classList.add('hidden')};
    box.querySelectorAll('.p2c-enrol-pick').forEach(x=>x.onclick=()=>choose(x));
    const digits=normMobile(q);if(digits.length===10){const exact=[...box.querySelectorAll('.p2c-enrol-pick')].filter(x=>normMobile(p2cEnrollCandidates[Number(x.dataset.index)]?.mobile||'')===digits);if(exact.length===1)choose(exact[0])}
  };
  if($('p2EnrollStudentSearch')){
    $('p2EnrollStudentSearch').onfocus=()=>{if($('p2EnrollStudentSearch').value.trim())p2cShowEnrollSuggestions();else $('p2EnrollSuggestions').classList.add('hidden')};
    $('p2EnrollStudentSearch').addEventListener('keydown',ev=>{
      const box=$('p2EnrollSuggestions'),items=[...box.querySelectorAll('.p2c-enrol-pick')];if(!items.length)return;
      if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){
        ev.preventDefault();p2v56EnrollSuggestionIndex=ev.key==='ArrowDown'?Math.min(items.length-1,p2v56EnrollSuggestionIndex+1):Math.max(0,p2v56EnrollSuggestionIndex<=0?0:p2v56EnrollSuggestionIndex-1);items.forEach((x,i)=>x.classList.toggle('p2v56-enrol-active',i===p2v56EnrollSuggestionIndex));items[p2v56EnrollSuggestionIndex]?.scrollIntoView({block:'nearest'})
      }else if(ev.key==='Enter'&&p2v56EnrollSuggestionIndex>=0){ev.preventDefault();items[p2v56EnrollSuggestionIndex]?.click();p2v56EnrollSuggestionIndex=-1}
    })
  }

  // Clean Option-1 schedule: month cards always visible, three per row, one month expands below.
  function p2v56RenderHeader(b){
    const status=p2v55AutoStatus(b),fee=String(b.courseFee??'').trim(),ended=p2v5IsEnded(b);b.status=status;
    $('p2ClassHeader').innerHTML=`<div><h3>${esc(p2CourseName(b))} — ${esc(b.name)}</h3><p>${b.start?fmt(b.start):'Start date not set'}${b.end?' to '+fmt(b.end):' · End date not set'} · ${esc(status)}</p><p style="margin-top:7px;font-size:12px">Acharya: ${esc(p2AcharyaNames(b).join(', ')||'Not assigned')}${fee?` &nbsp;|&nbsp; Fee: ₹ ${esc(fee)}`:''}</p></div><div class="actions"><button class="btn" id="p2v56HeaderNewClass" type="button" ${ended?'disabled':''}>＋ New Class</button><button class="btn secondary" id="p2EditActiveBatch">✎ Edit Batch</button><button class="btn secondary" id="p2BackClasses">← Back to Classes</button></div>`;
    if($('p2v56HeaderNewClass'))$('p2v56HeaderNewClass').onclick=()=>p2v5Fix2OpenDateDialog(b,'');
    $('p2EditActiveBatch').onclick=()=>p2OpenBatch(b.id);$('p2BackClasses').onclick=()=>switchPage('classes')
  }
  p2v5RenderHeader=p2v56RenderHeader;

  p2v5RenderSchedule=function(b){
    let card=$('p2v5ScheduleCard');if(!card){card=document.createElement('div');card.id='p2v5ScheduleCard';card.className='card';$('p2ClassHeader').insertAdjacentElement('afterend',card)}
    const dates=p2v5ValidDates(b),ended=p2v5IsEnded(b),grouped={};dates.forEach(d=>(grouped[p2v55MonthKey(d)]||(grouped[p2v55MonthKey(d)]=[])).push(d));const months=Object.keys(grouped).sort();
    let open=p2v55MonthOpen.get(b.id);if(open===undefined){open=months.at(-1)||'';p2v55MonthOpen.set(b.id,open)}
    card.innerHTML=`<div class="p2v56-schedule-title"><strong>Class Dates &amp; Schedule</strong></div><div class="p2v56-months">${months.length?months.map(m=>`<button type="button" class="p2v56-month ${open===m?'open':''}" data-month="${m}"><span>${esc(p2v55MonthLabel(m))}</span><small>${grouped[m].length} Class${grouped[m].length===1?'':'es'}</small><b>${open===m?'⌃':'⌄'}</b></button>`).join(''):'<div class="p2-empty">No class dates added yet.</div>'}</div>${open&&grouped[open]?`<div class="p2v56-date-panel">${grouped[open].map(d=>`<div class="p2v56-date-card"><div><strong>${fmt(d)}</strong><small>${p2v5Weekday(d)}</small></div><span class="p2v56-date-actions">${ended?'':`<button class="p2v5-date-edit" data-date="${d}" type="button" title="Edit class date">✎</button><button class="p2v5-date-remove" data-date="${d}" type="button" title="Remove class date">×</button>`}</span></div>`).join('')}</div>`:''}`;
    card.querySelectorAll('.p2v56-month').forEach(x=>x.onclick=()=>{const m=x.dataset.month;p2v55MonthOpen.set(b.id,p2v55MonthOpen.get(b.id)===m?'':m);p2v5RenderSchedule(b)});
    if(!ended){card.querySelectorAll('.p2v5-date-edit').forEach(x=>x.onclick=()=>p2v5Fix2OpenDateDialog(b,x.dataset.date));card.querySelectorAll('.p2v5-date-remove').forEach(x=>x.onclick=()=>{const d=x.dataset.date;if(!confirm(`Remove class ${fmt(d)}? Attendance for this date will also be removed.`))return;b.sessionDates=p2v5ValidDates(b).filter(v=>v!==d);state.classEnrollments.filter(e=>e.batchId===b.id).forEach(e=>{if(e.attendance)delete e.attendance[d]});save();toast('Class date removed')})}
  };

  // Batch Report: real All Courses / All Batches / All Years combinations, with export matching the screen.
  function p2v56ReportBatches(){
    let list=state.classBatches.slice().sort((a,z)=>String(z.start||'').localeCompare(String(a.start||'')));
    if(p2v54BatchFilter.course&&p2v54BatchFilter.course!=='__all__')list=list.filter(b=>String(b.courseId||p2CourseName(b))===p2v54BatchFilter.course);
    if(p2v54BatchFilter.year&&p2v54BatchFilter.year!=='__all__')list=list.filter(b=>String(p2BatchYear(b))===p2v54BatchFilter.year);
    if(p2v54BatchFilter.batch&&p2v54BatchFilter.batch!=='__all__')list=list.filter(b=>b.id===p2v54BatchFilter.batch);
    return list
  }
  function p2v56BatchReportRows(){
    const out=[];p2v56ReportBatches().forEach(b=>p2v54BatchRows(b).forEach(r=>out.push({...r,b})));
    let rows=out;if(p2v54BatchFilter.status&&p2v54BatchFilter.status!=='All')rows=rows.filter(r=>r.st.key===p2v54BatchFilter.status);const q=(p2v54BatchFilter.search||'').trim().toLowerCase();if(q)rows=rows.filter(r=>`${r.p.name} ${r.p.mobile} ${p2CourseName(r.b)} ${r.b.name}`.toLowerCase().includes(q));return rows
  }
  p2v54OpenBatchReport=function(panel){
    p2v54ClassReportView='batch';if(!state.classBatches.length){panel.innerHTML=`<button id="p2v54BackHome" class="btn secondary">← Back to Class Reports</button><div class="p2-empty" style="margin-top:14px">No class batches yet.</div>`;$('p2v54BackHome').onclick=()=>p2v54ClassReportHome(panel);return}
    if(!p2v54BatchFilter.course)p2v54BatchFilter.course='__all__';if(!p2v54BatchFilter.batch)p2v54BatchFilter.batch='__all__';if(!p2v54BatchFilter.year)p2v54BatchFilter.year='__all__';p2v56RenderBatchReport(panel)
  };
  function p2v56RenderBatchReport(panel){
    const selectedBatches=p2v56ReportBatches(),rows=p2v56BatchReportRows(),allRows=[];selectedBatches.forEach(b=>p2v54BatchRows(b).forEach(r=>allRows.push({...r,b})));
    const courses=[...new Map(state.courseTypes.map(c=>[String(c.id||c.name),c])).values()],years=[...new Set(state.classBatches.map(x=>String(p2BatchYear(x))).filter(Boolean))].sort().reverse();
    let batchChoices=state.classBatches.slice().sort((a,z)=>String(z.start||'').localeCompare(String(a.start||'')));if(p2v54BatchFilter.course&&p2v54BatchFilter.course!=='__all__')batchChoices=batchChoices.filter(b=>String(b.courseId||p2CourseName(b))===p2v54BatchFilter.course);if(p2v54BatchFilter.year&&p2v54BatchFilter.year!=='__all__')batchChoices=batchChoices.filter(b=>String(p2BatchYear(b))===p2v54BatchFilter.year);
    const completed=allRows.filter(r=>r.en.outcome==='Completed').length,withdraw=allRows.filter(r=>/withdraw/i.test(r.en.outcome||'')).length,incomplete=allRows.filter(r=>r.en.outcome&&r.en.outcome!=='Completed'&&!/withdraw/i.test(r.en.outcome)).length,paid=allRows.filter(r=>r.en.paymentStatus==='Paid').length,totalSessions=selectedBatches.reduce((n,b)=>n+p2v5ValidDates(b).length,0);
    panel.innerHTML=`<div class="p2v54-banner"><div><h2>Batch Report</h2><p>View roster, attendance, outcomes, payment and progression.</p></div><div class="p2v54-banner-actions"><button id="p2v54BackHome" class="btn secondary">← Back to Reports</button><button id="p2v54ExportBatch" class="btn">Export Excel</button></div></div><div class="p2v54-filterbar"><div><label>Course</label><select id="p2v54Course"><option value="__all__" ${p2v54BatchFilter.course==='__all__'?'selected':''}>All Courses</option>${courses.map(c=>`<option value="${esc(String(c.id||c.name))}" ${String(c.id||c.name)===p2v54BatchFilter.course?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div><label>Batch</label><select id="p2v54Batch"><option value="__all__" ${p2v54BatchFilter.batch==='__all__'?'selected':''}>All Batches</option>${batchChoices.map(x=>`<option value="${x.id}" ${x.id===p2v54BatchFilter.batch?'selected':''}>${esc(x.name)} · ${esc(p2CourseName(x))}</option>`).join('')}</select></div><div><label>Year</label><select id="p2v54Year"><option value="__all__" ${p2v54BatchFilter.year==='__all__'?'selected':''}>All Years</option>${years.map(y=>`<option value="${esc(y)}" ${y===p2v54BatchFilter.year?'selected':''}>${esc(y)}</option>`).join('')}</select></div><div><label>Status</label><select id="p2v54Status">${['All','Joined','Eligible','Not Eligible'].map(s=>`<option ${s===p2v54BatchFilter.status?'selected':''}>${s}</option>`).join('')}</select></div><div><label>Search name or mobile</label><input id="p2v54Search" value="${esc(p2v54BatchFilter.search||'')}" placeholder="Search by name or mobile..."></div></div><div class="p2v54-kpis"><div class="p2v54-kpi blue"><span>Total Students</span><b>${allRows.length}</b></div><div class="p2v54-kpi green"><span>Completed</span><b>${completed}</b></div><div class="p2v54-kpi amber"><span>Incomplete</span><b>${incomplete}</b></div><div class="p2v54-kpi red"><span>Withdrawn</span><b>${withdraw}</b></div><div class="p2v54-kpi blue"><span>Sessions</span><b>${totalSessions}</b></div><div class="p2v54-kpi green"><span>Paid / Unpaid</span><b>${paid} / ${allRows.length-paid}</b></div></div><div class="p2v54-table-card"><div class="p2v54-table-head"><h3>Student List (${rows.length})</h3></div><div class="p2v54-table-wrap"><table class="p2v54-table"><thead><tr><th>#</th><th>Name</th><th>Mobile</th><th>Course</th><th>Batch</th><th>Attendance</th><th>Outcome</th><th>Payment</th><th>Next Level Status</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${esc(r.p.name)}</strong>${r.en.adminOverride?'<div class="p2v54-override-note">Admin Override</div>':''}</td><td>${esc(r.p.mobile||'—')}</td><td>${esc(p2CourseName(r.b))}</td><td>${esc(r.b.name)}</td><td>${r.a.present} / ${r.a.total}</td><td><span class="p2v54-pill ${r.en.outcome==='Completed'?'green':/withdraw/i.test(r.en.outcome||'')?'red':'amber'}">${esc(r.en.outcome||'Enrolled')}</span></td><td><span class="p2v54-pill ${r.en.paymentStatus==='Paid'?'green':'red'}">${r.en.paymentStatus==='Paid'?'Paid':'Unpaid'}</span></td><td><span class="p2v54-pill ${r.st.cls}">${esc(r.st.label)}</span></td></tr>`).join('')||'<tr><td colspan="9">No students match this filter.</td></tr>'}</tbody></table></div></div>`;
    $('p2v54BackHome').onclick=()=>p2v54ClassReportHome(panel);
    $('p2v54Course').onchange=()=>{p2v54BatchFilter.course=$('p2v54Course').value;p2v54BatchFilter.batch='__all__';p2v56RenderBatchReport(panel)};
    $('p2v54Year').onchange=()=>{p2v54BatchFilter.year=$('p2v54Year').value;p2v54BatchFilter.batch='__all__';p2v56RenderBatchReport(panel)};
    $('p2v54Batch').onchange=()=>{p2v54BatchFilter.batch=$('p2v54Batch').value;p2v56RenderBatchReport(panel)};
    $('p2v54Status').onchange=()=>{p2v54BatchFilter.status=$('p2v54Status').value;p2v56RenderBatchReport(panel)};
    $('p2v54Search').oninput=()=>{p2v54BatchFilter.search=$('p2v54Search').value;const pos=$('p2v54Search').selectionStart;p2v56RenderBatchReport(panel);setTimeout(()=>{const s=$('p2v54Search');if(s){s.focus();s.setSelectionRange(pos,pos)}},0)};
    $('p2v54ExportBatch').onclick=()=>v51RequireAdmin(()=>{const filtered=p2v56BatchReportRows().map(r=>({Name:r.p.name,Mobile:r.p.mobile||'',Course:p2CourseName(r.b),Batch:r.b.name,Year:p2BatchYear(r.b),Sessions_Attended:r.a.present,Total_Sessions:r.a.total,Attendance_Percent:r.a.pct,Outcome:r.en.outcome||'Enrolled',Payment:r.en.paymentStatus==='Paid'?'Paid':'Unpaid',Next_Level_Status:r.st.key,Progression:r.st.label,Admin_Override:r.en.adminOverride?'Yes':'No'}));p2Csv(filtered,'Ananda_Filtered_Batch_Report.csv')},'export the filtered Batch Report')
  }

  function p2v56EnsureStyle(){if($('p2v56Style'))return;const st=document.createElement('style');st.id='p2v56Style';st.textContent=`
    .p2v56-enrol-active{background:#e8f2ff!important;outline:2px solid #7ba9dc;outline-offset:-2px}.p2v53-editing-note{display:none!important}
    .p2v56-schedule-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px;color:#123f7d;font-size:18px}.p2v56-months{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.p2v56-month{border:1px solid #d3e0ed;background:#fff;border-radius:12px;padding:16px 20px;display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto;text-align:left;cursor:pointer;color:#133f7c}.p2v56-month span{font-size:17px;font-weight:900}.p2v56-month small{font-size:13px;color:#5f7690;margin-top:4px}.p2v56-month b{grid-column:2;grid-row:1/3;align-self:center;font-size:18px}.p2v56-month.open{background:#edf6ff;border-color:#2878d8;box-shadow:0 0 0 1px #2878d8 inset}.p2v56-date-panel{margin-top:10px;padding:16px;background:#edf6ff;border-radius:12px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.p2v56-date-card{background:#fff;border:1px solid #dce7f2;border-radius:10px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;min-height:68px}.p2v56-date-card strong{display:block;color:#123f7d}.p2v56-date-card small{display:block;margin-top:5px;color:#607895;text-transform:uppercase}.p2v56-date-actions{display:flex;gap:7px;opacity:.35}.p2v56-date-card:hover .p2v56-date-actions{opacity:1}.p2v56-date-actions button{border:0;background:transparent;cursor:pointer;font-size:16px;color:#174d8d}.p2v56-date-actions .p2v5-date-remove{color:#c93636}
    @media(max-width:900px){.p2v56-months,.p2v56-date-panel{grid-template-columns:1fr}}
  `;document.head.appendChild(st)}
  p2v56EnsureStyle();
'''

html=html.replace(marker,fix+marker)
required=['PHASE2 BETA5 FIX6','p2v56OpenAdminApproval','p2v56EnrollSuggestionIndex','All Batches','All Years','p2v56HeaderNewClass','p2v56-months','p2v53-editing-note{display:none']
missing=[x for x in required if x not in html]
if missing: raise SystemExit('Missing beta.5.6 markers: '+repr(missing))
p.write_text(html,encoding='utf-8')
print('BETA5 FIX6 APPLIED',len(html))
