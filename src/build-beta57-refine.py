from pathlib import Path

p=Path('src/index.html')
html=p.read_text(encoding='utf-8')
if 'PHASE2 BETA56 CHAT FINAL' not in html:
    raise SystemExit('Beta 5.6 chat patch marker not found')
if 'PHASE2 BETA57 REFINE' in html:
    print('Beta 5.7 refine already applied')
    raise SystemExit(0)
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Insertion marker not found')

patch=r'''  // PHASE2 BETA57 REFINE — decisions from 05 Oct 2026 18:42 onward.
  // Classes: cleaner year cards, no large search, double-click opens batch, EDIT remains separate.
  // Student Progress: mutually exclusive Batch Wise / Student Wise modes only.
  const p2v57ClassCardBase=p2v56ChatClassCard;
  p2v56ChatClassCard=function(b){
    const s=p2v56ChatStatus(b),fee=String(b.courseFee??'').trim(),ach=p2AcharyaNames(b).join(', ')||'No Acharya assigned';
    return `<div class="p2v56-chat-class ${p2v56ChatSelectedClass===b.id?'selected':''}" data-id="${b.id}" tabindex="0"><div><span class="p2v56-chat-chip">${esc(s)}</span><h4>${esc(p2CourseName(b))} — ${esc(b.name)}</h4><p>${b.start?fmt(b.start):'Start date not set'}${b.end?' to '+fmt(b.end):''} · ${esc(ach)}</p><p>${esc((b.scheduleType||'custom').toUpperCase())} · ${(b.sessionDates||[]).length} session${(b.sessionDates||[]).length===1?'':'s'}${fee?' · ₹ '+esc(fee):''}</p></div><button class="btn ghost small p2v56-chat-edit" data-id="${b.id}" type="button">EDIT</button><span class="p2v56-chat-hint">Double-click a class card to open its batch.</span></div>`
  };

  p2v56ChatPrepareProgress=function(){
    const page=$('studentProgress');if(!page)return;
    page.innerHTML=`<div class="p2v56-chat-progress"><div class="p2v56-chat-progress-head"><div><h3>STUDENT PROGRESS</h3><p>Track class completion and progression by batch or by individual student.</p></div><div class="p2v56-chat-tabs"><button id="p2v56ChatBatchTab" type="button">BATCH WISE</button><button id="p2v56ChatStudentTab" type="button">STUDENT WISE</button></div></div><div id="p2v56ChatProgressBody" class="p2v56-chat-progress-body"></div></div>`;
    $('p2v56ChatBatchTab').onclick=()=>{p2v56ChatProgressMode='batch';p2v56ChatRenderProgress()};
    $('p2v56ChatStudentTab').onclick=()=>{p2v56ChatProgressMode='student';p2v56ChatRenderProgress()};
    p2v56ChatRenderProgress()
  };

  function p2v57Progressed(row){return row?.n?.key==='Joined'}
  function p2v57Completed(row){return row?.en?.outcome==='Completed'}

  p2v56ChatRenderBatchProgress=function(body){
    const courses=[...new Map(state.classBatches.map(b=>[String(b.courseId||p2CourseName(b)),{id:String(b.courseId||p2CourseName(b)),name:p2CourseName(b)}])).values()].sort((a,b)=>a.name.localeCompare(b.name));
    if(!p2v56ChatProgressCourse)p2v56ChatProgressCourse='__all__';
    let batches=p2v56ChatBatchOptions(p2v56ChatProgressCourse);
    if(!batches.some(b=>b.id===p2v56ChatProgressBatch))p2v56ChatProgressBatch=batches[0]?.id||'';
    const b=state.classBatches.find(x=>x.id===p2v56ChatProgressBatch);
    const rows=b?state.classEnrollments.filter(e=>e.batchId===b.id).map(en=>{const p=p2v56ChatPerson(en),a=p2v56ChatAttendance(b,en),n=p2v56ChatNext(en,b);return{en,p,a,n}}).sort((x,z)=>x.p.name.localeCompare(z.p.name,undefined,{sensitivity:'base'})):[];
    const completed=rows.filter(p2v57Completed).length;
    const progressed=rows.filter(p2v57Progressed).length;
    const pending=rows.filter(r=>!p2v57Progressed(r)).length;
    body.innerHTML=`<div class="p2v56-chat-progress-filters"><div><label>Course</label><select id="p2v56ChatProgressCourse"><option value="__all__">All Courses</option>${courses.map(c=>`<option value="${esc(c.id)}" ${c.id===p2v56ChatProgressCourse?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div><label>Batch</label><select id="p2v56ChatProgressBatch">${batches.map(x=>`<option value="${x.id}" ${x.id===p2v56ChatProgressBatch?'selected':''}>${esc(p2CourseName(x))} — ${esc(x.name)} · ${esc(String(p2BatchYear(x)||''))}</option>`).join('')}</select></div></div>${b?`<div class="p2v56-chat-progress-title"><div><h3>${esc(p2CourseName(b))} — ${esc(b.name)}</h3><p>${b.start?fmt(b.start):'—'}${b.end?' to '+fmt(b.end):''} · ${esc(p2v56ChatStatus(b))}</p></div></div><div class="p2v56-chat-kpis"><div><span>Enrolled</span><b>${rows.length}</b></div><div><span>Completed</span><b>${completed}</b></div><div><span>Progressed</span><b>${progressed}</b></div><div><span>Pending</span><b>${pending}</b></div></div><div class="p2v56-chat-table-wrap"><table class="p2v56-chat-table p2v57-batch-progress-table"><thead><tr><th>#</th><th>Student</th><th>Mobile</th><th>Attendance</th><th>Completed</th><th>Progressed</th><th>Next Level</th><th>Status</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="p2v56-chat-student-row" data-student="${esc(r.en.studentId||'')}"><td>${i+1}</td><td><strong>${esc(r.p.name||'Unnamed')}</strong></td><td>${esc(r.p.mobile||'—')}</td><td>${r.a.present}/${r.a.total} · ${r.a.pct}%</td><td>${p2v57Completed(r)?'Yes':'No'}</td><td>${p2v57Progressed(r)?'Yes':'No'}</td><td>${esc(r.n.label||'—')}</td><td>${esc(r.en.outcome||'Enrolled')}</td></tr>`).join('')||'<tr><td colspan="8">No students enrolled in this batch.</td></tr>'}</tbody></table></div><div class="p2v56-chat-footnote">Double-click a student to open Student Wise progress.</div>`:'<div class="p2-empty">No batch available for this course.</div>'}`;
    $('p2v56ChatProgressCourse').onchange=e=>{p2v56ChatProgressCourse=e.target.value;p2v56ChatProgressBatch='';p2v56ChatRenderProgress()};
    if($('p2v56ChatProgressBatch'))$('p2v56ChatProgressBatch').onchange=e=>{p2v56ChatProgressBatch=e.target.value;p2v56ChatRenderProgress()};
    body.querySelectorAll('.p2v56-chat-student-row[data-student]').forEach(r=>r.ondblclick=()=>{if(!r.dataset.student)return;p2v56ChatProgressStudent=r.dataset.student;p2v56ChatProgressMode='student';p2v56ChatRenderProgress()})
  };

  function p2v57StudentSummary(student){
    const hist=p2v56ChatStudentEnrollments(student.id),last=hist.at(-1);
    return {hist,last,current:last?(last.en.level||p2CourseName(last.b)):'No class',batch:last?.b?.name||'No batch'}
  }

  p2v56ChatRenderStudentProgress=function(body){
    const selected=state.students.find(x=>x.id===p2v56ChatProgressStudent)||null;
    body.innerHTML=`<div class="p2v56-chat-student-search"><label>Search student by name or mobile</label><input id="p2v56ChatStudentSearch" autocomplete="off" placeholder="Search student by name or mobile"><div id="p2v56ChatStudentSuggestions" class="p2v56-chat-suggestions hidden"></div></div><div id="p2v56ChatStudentJourney"></div>`;
    const input=$('p2v56ChatStudentSearch'),box=$('p2v56ChatStudentSuggestions');
    const renderJourney=student=>{
      const host=$('p2v56ChatStudentJourney');
      if(!student){host.innerHTML='<div class="p2-empty" style="margin-top:18px">Search and select a student to view the complete class journey.</div>';return}
      input.value=[student.name,student.mobile].filter(Boolean).join(' · ');
      const {hist,last}=p2v57StudentSummary(student),kriya=!!(student.kriyabanId||student.kriyaDate||student.kriyaYear),completedLevels=new Set(hist.filter(x=>x.en.outcome==='Completed').map(x=>x.en.level||p2CourseName(x.b)));
      const stages=['Level 1','Level 2','Level 3','Level 4','Kriya / Complete'];
      host.innerHTML=`<div class="p2v56-chat-student-head"><div><h3>${esc(student.name||'Unnamed')}</h3><p>${esc(student.mobile||'No mobile')}</p></div>${kriya?'<span class="p2v56-chat-kriya">KRIYABAN</span>':''}</div><div class="p2v57-stage-strip">${stages.map(stage=>{const done=stage==='Kriya / Complete'?kriya:completedLevels.has(stage),active=!done&&last&&(last.en.level||p2CourseName(last.b))===stage;return `<div class="p2v57-stage ${done?'done':active?'active':''}"><span>${esc(stage)}</span><b>${done?'Complete':active?'Current':'Pending'}</b></div>`}).join('')}</div><div class="p2v56-chat-journey-title">Course Journey</div>${hist.length?`<div class="p2v56-chat-table-wrap"><table class="p2v56-chat-table journey"><thead><tr><th>Course / Level</th><th>Batch</th><th>Dates</th><th>Attendance</th><th>Completed</th><th>Progression / Status</th></tr></thead><tbody>${hist.map(({en,b})=>{const a=p2v56ChatAttendance(b,en),n=p2v56ChatNext(en,b);return `<tr><td><strong>${esc(en.level||p2CourseName(b))}</strong></td><td>${esc(b.name)}</td><td>${b.start?fmt(b.start):'—'}${b.end?' → '+fmt(b.end):''}</td><td>${a.present}/${a.total} · ${a.pct}%</td><td>${en.outcome==='Completed'?'Yes':'No'}</td><td>${esc(n.label||en.outcome||'Enrolled')}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="p2-empty">No class history found for this student.</div>'}${last?`<div class="p2v56-chat-current"><span>Latest Record</span><strong>${esc(last.en.level||p2CourseName(last.b))} · ${esc(last.en.outcome||'Enrolled')}</strong></div>`:''}`
    };
    const showSuggestions=()=>{
      const q=input.value.trim().toLowerCase();p2v56ChatSuggestIndex=-1;
      if(!q){box.innerHTML='';box.classList.add('hidden');return}
      const rows=state.students.filter(x=>`${x.name||''} ${x.mobile||''}`.toLowerCase().includes(q)).sort((a,b)=>(a.name||'').localeCompare(b.name||'',undefined,{sensitivity:'base'})).slice(0,10);
      box.innerHTML=rows.map((x,i)=>{const sum=p2v57StudentSummary(x);return `<button type="button" class="p2v56-chat-suggest" data-id="${x.id}" data-i="${i}"><strong>${esc(x.name||'Unnamed')}</strong><small>${esc(x.mobile||'No mobile')} · ${esc(sum.current)} · ${esc(sum.batch)}</small></button>`}).join('')||'<div class="p2v56-chat-no-suggest">No matching student.</div>';
      box.classList.remove('hidden');
      box.querySelectorAll('.p2v56-chat-suggest').forEach(x=>x.onclick=()=>{p2v56ChatProgressStudent=x.dataset.id;box.classList.add('hidden');renderJourney(state.students.find(s=>s.id===x.dataset.id))})
    };
    input.oninput=showSuggestions;
    input.onfocus=()=>{if(input.value&&!selected)showSuggestions()};
    input.onkeydown=e=>{const items=[...box.querySelectorAll('.p2v56-chat-suggest')];if(!items.length)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();p2v56ChatSuggestIndex=e.key==='ArrowDown'?Math.min(items.length-1,p2v56ChatSuggestIndex+1):Math.max(0,p2v56ChatSuggestIndex<=0?0:p2v56ChatSuggestIndex-1);items.forEach((x,i)=>x.classList.toggle('active',i===p2v56ChatSuggestIndex))}else if(e.key==='Enter'){e.preventDefault();items[Math.max(0,p2v56ChatSuggestIndex)]?.click()}};
    renderJourney(selected)
  };

  (function p2v57Style(){
    if($('p2v57Style'))return;
    const st=document.createElement('style');st.id='p2v57Style';st.textContent=`
      #p2ClassSearch{display:none!important}.p2v56-chat-class{border-color:#f1f4f7!important;box-shadow:0 1px 3px rgba(16,45,94,.018)!important;padding-right:250px}.p2v56-chat-class:hover{box-shadow:0 5px 15px rgba(16,45,94,.055)!important}.p2v56-chat-hint{max-width:205px;text-align:right;line-height:1.25}.p2v57-batch-progress-table{min-width:1060px}.p2v57-stage-strip{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin:10px 0 17px}.p2v57-stage{background:#f7f9fb;border:1px solid #edf1f4;border-radius:12px;padding:11px}.p2v57-stage span{display:block;color:#4c657d;font-size:11px;font-weight:900}.p2v57-stage b{display:block;margin-top:4px;color:#8a98a6;font-size:10px;text-transform:uppercase}.p2v57-stage.done{background:#eef8f3}.p2v57-stage.done b{color:#167353}.p2v57-stage.active{background:#eef5ff}.p2v57-stage.active b{color:#1c5ca7}.p2v56-chat-suggest{align-items:center}.p2v56-chat-suggest small{text-align:right;max-width:70%;line-height:1.3}@media(max-width:900px){.p2v56-chat-class{padding-right:95px}.p2v56-chat-hint{display:none}.p2v57-stage-strip{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(st)
  })();

  // Re-render both redesigned areas after the refinements override the Beta 5.6 functions.
  if($('p2ClassList'))p2RenderClasses();
  p2v56ChatPrepareProgress();
'''

html=html.replace(marker,'\n'+patch+marker,1)
p.write_text(html,encoding='utf-8')
print('BETA 5.7 REFINE APPLIED',len(html))
