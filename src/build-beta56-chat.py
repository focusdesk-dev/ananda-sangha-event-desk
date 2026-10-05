from pathlib import Path

p=Path('src/index.html')
html=p.read_text(encoding='utf-8')
if 'PHASE2 BETA5 FIX6' not in html:
    raise SystemExit('Beta 5.6 base marker not found')
if 'PHASE2 BETA56 CHAT FINAL' in html:
    print('Beta 5.6 chat patch already applied')
    raise SystemExit(0)
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Insertion marker not found')

patch=r'''  // PHASE2 BETA56 CHAT FINAL — Classes cleanup + batch-wise/student-wise progress.
  let p2v56ChatSelectedClass='';
  let p2v56ChatProgressMode='batch';
  let p2v56ChatProgressCourse='';
  let p2v56ChatProgressBatch='';
  let p2v56ChatProgressStudent='';
  let p2v56ChatSuggestIndex=-1;

  function p2v56ChatStatus(b){return typeof p2v55AutoStatus==='function'?p2v55AutoStatus(b):String(b?.status||'Upcoming')}
  function p2v56ChatActive(b){return ['current','upcoming','active','ongoing','planned'].includes(p2v56ChatStatus(b).toLowerCase())}
  function p2v56ChatOpenBatch(id){if(!id)return;state.activeClassBatchId=id;save();switchPage('classWorkspace')}
  function p2v56ChatClassCard(b){
    const s=p2v56ChatStatus(b),fee=String(b.courseFee??'').trim(),ach=p2AcharyaNames(b).join(', ')||'No Acharya assigned';
    return `<div class="p2v56-chat-class ${p2v56ChatSelectedClass===b.id?'selected':''}" data-id="${b.id}" tabindex="0"><div><span class="p2v56-chat-chip">${esc(s)}</span><h4>${esc(p2CourseName(b))} — ${esc(b.name)}</h4><p>${b.start?fmt(b.start):'Start date not set'}${b.end?' to '+fmt(b.end):''} · ${esc(ach)}</p><p>${esc((b.scheduleType||'custom').toUpperCase())} · ${(b.sessionDates||[]).length} session${(b.sessionDates||[]).length===1?'':'s'}${fee?' · ₹ '+esc(fee):''}</p></div><button class="btn ghost small p2v56-chat-edit" data-id="${b.id}" type="button">Edit</button><span class="p2v56-chat-hint">Double-click to open</span></div>`
  }

  p2RenderClasses=function(){
    if(!$('p2ClassList'))return;
    if(typeof p2v55SyncBatchStatuses==='function')p2v55SyncBatchStatuses();
    const cf=$('p2CourseFilter'),keep=cf?.value||'all';
    if(cf){cf.innerHTML='<option value="all">All Courses</option>'+state.courseTypes.filter(c=>c.active!==false).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');cf.value=[...cf.options].some(o=>o.value===keep)?keep:'all'}
    const course=cf?.value||'all',records=state.classBatches.filter(b=>course==='all'||String(b.courseId)===course);
    const grouped={};records.forEach(b=>{const y=String(p2BatchYear(b)||'Unknown');(grouped[y]||(grouped[y]=[])).push(b)});
    const years=Object.keys(grouped).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
    $('p2ClassList').innerHTML=years.length?`<div class="p2v56-chat-years">${years.map(y=>{const a=grouped[y].filter(p2v56ChatActive).sort((x,z)=>String(x.start||'').localeCompare(String(z.start||''))),i=grouped[y].filter(x=>!p2v56ChatActive(x)).sort((x,z)=>String(z.start||'').localeCompare(String(x.start||'')));return `<section class="p2v56-chat-year"><div class="p2v56-chat-year-head"><div><span>YEAR · ${esc(y)}</span><h3>${esc(y)} Classes</h3><p>${a.length} Active / Upcoming · ${i.length} Inactive / Completed</p></div></div><div class="p2v56-chat-section-title">Active &amp; Upcoming</div>${a.length?`<div class="p2v56-chat-class-list">${a.map(p2v56ChatClassCard).join('')}</div>`:'<div class="p2-empty">No active or upcoming classes.</div>'}<div class="p2v56-chat-section-title muted">Inactive &amp; Completed</div>${i.length?`<div class="p2v56-chat-class-list">${i.map(p2v56ChatClassCard).join('')}</div>`:'<div class="p2-empty">No inactive or completed classes.</div>'}</section>`}).join('')}</div>`:'<div class="p2-empty">No classes available.</div>';
    const past=$('p2PastClassList');if(past)past.innerHTML='';
    document.querySelectorAll('#p2ClassList .p2v56-chat-class').forEach(card=>{
      card.onclick=e=>{if(e.target.closest('button'))return;p2v56ChatSelectedClass=card.dataset.id;document.querySelectorAll('#p2ClassList .p2v56-chat-class').forEach(x=>x.classList.toggle('selected',x===card))};
      card.ondblclick=e=>{if(e.target.closest('button'))return;p2v56ChatOpenBatch(card.dataset.id)};
      card.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();p2v56ChatOpenBatch(card.dataset.id)}};
    });
    document.querySelectorAll('#p2ClassList .p2v56-chat-edit').forEach(x=>x.onclick=e=>{e.stopPropagation();p2OpenBatch(x.dataset.id)});
  };
  if($('p2CourseFilter'))$('p2CourseFilter').onchange=()=>p2RenderClasses();

  function p2v56ChatPerson(en){return typeof p2v5Person==='function'?p2v5Person(en):(state.students.find(s=>s.id===en.studentId)||{name:en.personName||'Unnamed',mobile:en.personMobile||''})}
  function p2v56ChatAttendance(b,en){return typeof p2v53AttendanceSummary==='function'?p2v53AttendanceSummary(b,en):{present:0,total:(b.sessionDates||[]).length,pct:0}}
  function p2v56ChatNext(en,b){if(typeof p2v54NextStatus==='function')return p2v54NextStatus(en,b);return {label:en.outcome==='Completed'?'Completed':'Not Eligible',key:'Not Eligible'}}
  function p2v56ChatBatchOptions(course=''){
    return state.classBatches.filter(b=>!course||course==='__all__'||String(b.courseId||p2CourseName(b))===course).sort((a,z)=>String(z.start||'').localeCompare(String(a.start||'')))
  }
  function p2v56ChatStudentEnrollments(id){return state.classEnrollments.filter(e=>e.studentId===id).map(en=>({en,b:state.classBatches.find(b=>b.id===en.batchId)})).filter(x=>x.b).sort((a,z)=>String(a.b.start||'').localeCompare(String(z.b.start||'')))}

  function p2v56ChatPrepareProgress(){
    const page=$('studentProgress');if(!page)return;
    page.innerHTML=`<div class="p2v56-chat-progress"><div class="p2v56-chat-progress-head"><div><h3>Student Progress</h3><p>Review progress either by an entire class batch or by one student's complete journey.</p></div><div class="p2v56-chat-tabs"><button id="p2v56ChatBatchTab" type="button">Batch Wise</button><button id="p2v56ChatStudentTab" type="button">Student Wise</button></div></div><div id="p2v56ChatProgressBody" class="p2v56-chat-progress-body"></div></div>`;
    $('p2v56ChatBatchTab').onclick=()=>{p2v56ChatProgressMode='batch';p2v56ChatRenderProgress()};
    $('p2v56ChatStudentTab').onclick=()=>{p2v56ChatProgressMode='student';p2v56ChatRenderProgress()};
    p2v56ChatRenderProgress()
  }

  function p2v56ChatRenderProgress(){
    const body=$('p2v56ChatProgressBody');if(!body)return;
    $('p2v56ChatBatchTab')?.classList.toggle('active',p2v56ChatProgressMode==='batch');
    $('p2v56ChatStudentTab')?.classList.toggle('active',p2v56ChatProgressMode==='student');
    if(p2v56ChatProgressMode==='batch')p2v56ChatRenderBatchProgress(body);else p2v56ChatRenderStudentProgress(body)
  }

  function p2v56ChatRenderBatchProgress(body){
    const courses=[...new Map(state.classBatches.map(b=>[String(b.courseId||p2CourseName(b)),{id:String(b.courseId||p2CourseName(b)),name:p2CourseName(b)}])).values()].sort((a,b)=>a.name.localeCompare(b.name));
    if(!p2v56ChatProgressCourse)p2v56ChatProgressCourse='__all__';
    let batches=p2v56ChatBatchOptions(p2v56ChatProgressCourse);if(!batches.some(b=>b.id===p2v56ChatProgressBatch))p2v56ChatProgressBatch=batches[0]?.id||'';
    const b=state.classBatches.find(x=>x.id===p2v56ChatProgressBatch),rows=b?state.classEnrollments.filter(e=>e.batchId===b.id).map(en=>{const p=p2v56ChatPerson(en),a=p2v56ChatAttendance(b,en),n=p2v56ChatNext(en,b);return{en,p,a,n}}).sort((x,z)=>x.p.name.localeCompare(z.p.name,undefined,{sensitivity:'base'})):[];
    const completed=rows.filter(r=>r.en.outcome==='Completed').length,incomplete=rows.filter(r=>r.en.outcome&&r.en.outcome!=='Completed').length,eligible=rows.filter(r=>r.n.key==='Eligible').length;
    body.innerHTML=`<div class="p2v56-chat-progress-filters"><div><label>Course</label><select id="p2v56ChatProgressCourse"><option value="__all__">All Courses</option>${courses.map(c=>`<option value="${esc(c.id)}" ${c.id===p2v56ChatProgressCourse?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div><label>Batch</label><select id="p2v56ChatProgressBatch">${batches.map(x=>`<option value="${x.id}" ${x.id===p2v56ChatProgressBatch?'selected':''}>${esc(p2CourseName(x))} — ${esc(x.name)} · ${esc(String(p2BatchYear(x)||''))}</option>`).join('')}</select></div></div>${b?`<div class="p2v56-chat-progress-title"><div><h3>${esc(p2CourseName(b))} — ${esc(b.name)}</h3><p>${b.start?fmt(b.start):'—'}${b.end?' to '+fmt(b.end):''} · ${esc(p2v56ChatStatus(b))}</p></div></div><div class="p2v56-chat-kpis"><div><span>Enrolled</span><b>${rows.length}</b></div><div><span>Completed</span><b>${completed}</b></div><div><span>Incomplete</span><b>${incomplete}</b></div><div><span>Eligible / Next</span><b>${eligible}</b></div></div><div class="p2v56-chat-table-wrap"><table class="p2v56-chat-table"><thead><tr><th>Student</th><th>Mobile</th><th>Attendance</th><th>Outcome</th><th>Next Step</th></tr></thead><tbody>${rows.map(r=>`<tr class="p2v56-chat-student-row" data-student="${esc(r.en.studentId||'')}"><td><strong>${esc(r.p.name||'Unnamed')}</strong></td><td>${esc(r.p.mobile||'—')}</td><td>${r.a.present}/${r.a.total} · ${r.a.pct}%</td><td>${esc(r.en.outcome||'Enrolled')}</td><td>${esc(r.n.label||'—')}</td></tr>`).join('')||'<tr><td colspan="5">No students enrolled in this batch.</td></tr>'}</tbody></table></div><div class="p2v56-chat-footnote">Double-click a student to open Student Wise progress.</div>`:'<div class="p2-empty">No batch available for this course.</div>'}`;
    $('p2v56ChatProgressCourse').onchange=e=>{p2v56ChatProgressCourse=e.target.value;p2v56ChatProgressBatch='';p2v56ChatRenderProgress()};
    if($('p2v56ChatProgressBatch'))$('p2v56ChatProgressBatch').onchange=e=>{p2v56ChatProgressBatch=e.target.value;p2v56ChatRenderProgress()};
    body.querySelectorAll('.p2v56-chat-student-row[data-student]').forEach(r=>r.ondblclick=()=>{if(!r.dataset.student)return;p2v56ChatProgressStudent=r.dataset.student;p2v56ChatProgressMode='student';p2v56ChatRenderProgress()})
  }

  function p2v56ChatRenderStudentProgress(body){
    const s=state.students.find(x=>x.id===p2v56ChatProgressStudent)||null;
    body.innerHTML=`<div class="p2v56-chat-student-search"><label>Search Student by Name or Mobile</label><input id="p2v56ChatStudentSearch" autocomplete="off" placeholder="Start typing a student name or 10-digit mobile"><div id="p2v56ChatStudentSuggestions" class="p2v56-chat-suggestions hidden"></div></div><div id="p2v56ChatStudentJourney"></div>`;
    const input=$('p2v56ChatStudentSearch'),box=$('p2v56ChatStudentSuggestions');
    const renderJourney=student=>{const host=$('p2v56ChatStudentJourney');if(!student){host.innerHTML='<div class="p2-empty" style="margin-top:18px">Search and select a student to view the complete class journey.</div>';return}input.value=[student.name,student.mobile].filter(Boolean).join(' · ');const hist=p2v56ChatStudentEnrollments(student.id),kriya=!!(student.kriyabanId||student.kriyaDate||student.kriyaYear),last=hist.at(-1);host.innerHTML=`<div class="p2v56-chat-student-head"><div><h3>${esc(student.name||'Unnamed')}</h3><p>${esc(student.mobile||'No mobile')}</p></div>${kriya?'<span class="p2v56-chat-kriya">KRIYABAN</span>':''}</div><div class="p2v56-chat-journey-title">Course Journey</div>${hist.length?`<div class="p2v56-chat-table-wrap"><table class="p2v56-chat-table journey"><thead><tr><th>Course / Level</th><th>Batch</th><th>Dates</th><th>Attendance</th><th>Outcome</th><th>Next Step</th></tr></thead><tbody>${hist.map(({en,b})=>{const a=p2v56ChatAttendance(b,en),n=p2v56ChatNext(en,b);return `<tr><td><strong>${esc(en.level||p2CourseName(b))}</strong></td><td>${esc(b.name)}</td><td>${b.start?fmt(b.start):'—'}${b.end?' → '+fmt(b.end):''}</td><td>${a.present}/${a.total} · ${a.pct}%</td><td>${esc(en.outcome||'Enrolled')}</td><td>${esc(n.label||'—')}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="p2-empty">No class history found for this student.</div>'}${last?`<div class="p2v56-chat-current"><span>Latest Record</span><strong>${esc(last.en.level||p2CourseName(last.b))} · ${esc(last.en.outcome||'Enrolled')}</strong></div>`:''}`};
    const showSuggestions=()=>{const q=input.value.trim().toLowerCase();p2v56ChatSuggestIndex=-1;if(!q){box.innerHTML='';box.classList.add('hidden');return}const rows=state.students.filter(x=>`${x.name||''} ${x.mobile||''}`.toLowerCase().includes(q)).sort((a,b)=>(a.name||'').localeCompare(b.name||'',undefined,{sensitivity:'base'})).slice(0,10);box.innerHTML=rows.map((x,i)=>`<button type="button" class="p2v56-chat-suggest" data-id="${x.id}" data-i="${i}"><strong>${esc(x.name||'Unnamed')}</strong><small>${esc(x.mobile||'No mobile')}</small></button>`).join('')||'<div class="p2v56-chat-no-suggest">No matching student.</div>';box.classList.remove('hidden');box.querySelectorAll('.p2v56-chat-suggest').forEach(x=>x.onclick=()=>{p2v56ChatProgressStudent=x.dataset.id;box.classList.add('hidden');renderJourney(state.students.find(s=>s.id===x.dataset.id))})};
    input.oninput=showSuggestions;input.onfocus=()=>{if(input.value&&!s)showSuggestions()};input.onkeydown=e=>{const items=[...box.querySelectorAll('.p2v56-chat-suggest')];if(!items.length)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();p2v56ChatSuggestIndex=e.key==='ArrowDown'?Math.min(items.length-1,p2v56ChatSuggestIndex+1):Math.max(0,p2v56ChatSuggestIndex<=0?0:p2v56ChatSuggestIndex-1);items.forEach((x,i)=>x.classList.toggle('active',i===p2v56ChatSuggestIndex))}else if(e.key==='Enter'&&p2v56ChatSuggestIndex>=0){e.preventDefault();items[p2v56ChatSuggestIndex].click()}};
    renderJourney(s)
  }

  function p2v56ChatEnsureStyle(){if($('p2v56ChatStyle'))return;const st=document.createElement('style');st.id='p2v56ChatStyle';st.textContent=`
    #p2ClassSearch{display:none!important}#p2PastClassCard{display:none!important}#p2BatchListCard{border:0!important;box-shadow:none!important;background:transparent!important;padding:0!important}.p2v56-chat-years{display:grid;gap:18px}.p2v56-chat-year{background:#f8fafc;border-radius:17px;padding:20px}.p2v56-chat-year-head span{display:inline-block;background:#e5f5ee;color:#14765a;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:900}.p2v56-chat-year-head h3{margin:9px 0 4px;color:#102d5e;font-size:18px}.p2v56-chat-year-head p{margin:0;color:#61778d;font-size:12px}.p2v56-chat-section-title{margin:18px 0 10px;color:#173f7d;font-size:13px;font-weight:900;text-transform:uppercase}.p2v56-chat-section-title.muted{color:#6f7e8d;margin-top:22px}.p2v56-chat-class-list{display:grid;gap:11px}.p2v56-chat-class{position:relative;background:#fff;border:1px solid #edf1f5;border-radius:15px;padding:15px 110px 15px 16px;min-height:82px;outline:none;box-shadow:0 1px 4px rgba(16,45,94,.025);transition:.15s}.p2v56-chat-class:hover{box-shadow:0 5px 16px rgba(16,45,94,.07);transform:translateY(-1px)}.p2v56-chat-class.selected{background:#fbfdff;box-shadow:0 0 0 2px rgba(23,63,125,.09)}.p2v56-chat-class h4{margin:5px 0 5px;color:#102d5e;font-size:15px}.p2v56-chat-class p{margin:3px 0;color:#63788c;font-size:12px}.p2v56-chat-chip{display:inline-block;background:#e8f6f1;color:#0b7a66;border-radius:999px;padding:3px 8px;font-size:10px;font-weight:900}.p2v56-chat-edit{position:absolute;right:15px;top:15px}.p2v56-chat-hint{position:absolute;right:15px;bottom:13px;color:#9aa8b5;font-size:10px}
    .p2v56-chat-progress{background:#fff;border:1px solid #e1e9f0;border-radius:17px;overflow:hidden}.p2v56-chat-progress-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid #edf1f5}.p2v56-chat-progress-head h3{margin:0;color:#102d5e;font-size:21px}.p2v56-chat-progress-head p{margin:5px 0 0;color:#65798e;font-size:12px}.p2v56-chat-tabs{display:flex;gap:5px;background:#f1f5f9;border-radius:10px;padding:4px}.p2v56-chat-tabs button{border:0;background:transparent;border-radius:8px;padding:9px 15px;color:#173f7d;font-weight:900;cursor:pointer}.p2v56-chat-tabs button.active{background:#173f7d;color:#fff}.p2v56-chat-progress-body{padding:20px 22px}.p2v56-chat-progress-filters{display:grid;grid-template-columns:minmax(220px,1fr) minmax(260px,1.4fr);gap:14px;margin-bottom:16px}.p2v56-chat-progress-filters label,.p2v56-chat-student-search label{display:block;font-size:11px;font-weight:900;color:#294b6c;margin-bottom:6px;text-transform:uppercase}.p2v56-chat-progress-filters select,.p2v56-chat-student-search input{width:100%;height:42px;border:1px solid #ccd9e6;border-radius:9px;background:#fff;padding:0 11px;color:#17385f}.p2v56-chat-progress-title h3{margin:0;color:#102d5e}.p2v56-chat-progress-title p{margin:5px 0 0;color:#6a7d90;font-size:12px}.p2v56-chat-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.p2v56-chat-kpis>div{background:#f7fbff;border-radius:13px;padding:13px}.p2v56-chat-kpis span{display:block;color:#60748a;font-size:10px;text-transform:uppercase;font-weight:900}.p2v56-chat-kpis b{display:block;color:#102d5e;font-size:23px;margin-top:3px}.p2v56-chat-table-wrap{overflow:auto;border:1px solid #e2eaf1;border-radius:11px}.p2v56-chat-table{width:100%;border-collapse:collapse;min-width:760px}.p2v56-chat-table th{background:#f3f7fa;color:#294b6c;text-align:left;font-size:11px;padding:10px}.p2v56-chat-table td{padding:10px;border-top:1px solid #edf1f5;color:#31506e;font-size:12px}.p2v56-chat-student-row{cursor:pointer}.p2v56-chat-student-row:hover{background:#fafcff}.p2v56-chat-footnote{margin-top:8px;color:#8a99a8;font-size:10px}.p2v56-chat-student-search{position:relative;max-width:680px}.p2v56-chat-suggestions{position:absolute;z-index:40;left:0;right:0;top:68px;background:#fff;border:1px solid #d8e3ed;border-radius:10px;box-shadow:0 10px 26px rgba(16,45,94,.12);overflow:hidden}.p2v56-chat-suggestions.hidden{display:none}.p2v56-chat-suggest{width:100%;border:0;border-bottom:1px solid #edf1f5;background:#fff;padding:10px 12px;text-align:left;cursor:pointer;display:flex;justify-content:space-between;gap:12px}.p2v56-chat-suggest:hover,.p2v56-chat-suggest.active{background:#eef5ff}.p2v56-chat-suggest small{color:#6f8193}.p2v56-chat-no-suggest{padding:11px;color:#77899a;font-size:12px}.p2v56-chat-student-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:22px 0 13px}.p2v56-chat-student-head h3{margin:0;color:#102d5e}.p2v56-chat-student-head p{margin:4px 0 0;color:#6c8093}.p2v56-chat-kriya{background:#fff2bd;color:#795c00;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:900}.p2v56-chat-journey-title{font-weight:900;color:#173f7d;text-transform:uppercase;font-size:12px;margin:10px 0}.p2v56-chat-current{margin-top:12px;background:#f7fbff;border-radius:12px;padding:12px 14px}.p2v56-chat-current span{display:block;color:#6c8093;font-size:10px;text-transform:uppercase;font-weight:900}.p2v56-chat-current strong{display:block;color:#102d5e;margin-top:4px}@media(max-width:800px){.p2v56-chat-progress-head{align-items:flex-start;flex-direction:column}.p2v56-chat-progress-filters,.p2v56-chat-kpis{grid-template-columns:1fr 1fr}.p2v56-chat-class{padding-right:90px}}`;
    document.head.appendChild(st)
  }
  p2v56ChatEnsureStyle();
  p2v56ChatPrepareProgress();
  const p2v56ChatSwitchBase=switchPage;
  switchPage=function(id){const r=p2v56ChatSwitchBase(id);if(id==='activeClasses')setTimeout(()=>p2RenderClasses(),0);if(id==='studentProgress')setTimeout(()=>{p2v56ChatPrepareProgress();p2v56ChatRenderProgress()},0);return r};
  if(page==='activeClasses')p2RenderClasses();
'''
html=html.replace(marker,patch+marker,1)
required=['PHASE2 BETA56 CHAT FINAL','Double-click to open','Batch Wise','Student Wise','p2v56ChatRenderBatchProgress','p2v56ChatRenderStudentProgress','#p2ClassSearch{display:none!important}']
missing=[x for x in required if x not in html]
if missing: raise SystemExit('Missing chat patch markers: '+repr(missing))
p.write_text(html,encoding='utf-8')
print('BETA 5.6 CURRENT-CHAT PATCH APPLIED',len(html))
