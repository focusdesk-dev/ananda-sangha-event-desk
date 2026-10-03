from pathlib import Path

path = Path('src/index.html')
text = path.read_text(encoding='utf-8')

# Phase 2 beta.4A - Issue #3: group all classes into one box per start year.
# Double-clicking the year opens that year's batches with active/upcoming first
# and completed/inactive records below.
old_head = '<div class="card-head"><div><h3>Active Classes</h3><div class="card-sub">Only current and upcoming batches created from + New Class Batch are shown here.</div></div></div>'
new_head = '<div class="card-head"><div><h3>Classes by Year</h3><div class="card-sub">One box per year. Double-click a year to see all classes; active and upcoming stay above inactive and completed classes.</div></div></div>'
if old_head not in text:
    raise SystemExit('Could not locate beta.3 Active Classes card heading')
text = text.replace(old_head, new_head, 1)

# The old separate Past Classes card is no longer required visually because each
# year folder now contains both active and inactive/completed classes. Keep the
# DOM ids hidden for compatibility with any older handlers.
old_past = '<div class="card" id="p2PastClassCard" style="margin-top:18px">'
if old_past not in text:
    raise SystemExit('Could not locate beta.3 Past Classes card')
text = text.replace(old_past, '<div class="card" id="p2PastClassCard" style="display:none">', 1)

fn_start = text.find('  function p2ClassRecordHtml(b){')
fn_end = text.find('  function p2RenderCourses(){', fn_start)
if fn_start < 0 or fn_end < 0:
    raise SystemExit('Could not locate beta.3 class rendering block')

new_render = r'''  function p2ClassRecordHtml(b){return `<div class="p2-record"><div><span class="p2-chip good">CLASS · ${esc(p2BatchYear(b)||'—')}</span><h4>${esc(p2CourseName(b))} — ${esc(b.name)}</h4><p>${fmt(b.start)}${b.end?' to '+fmt(b.end):''} · ${esc(b.status||'Upcoming')} · ${esc(p2AcharyaNames(b).join(', ')||'No Acharya assigned')}</p><p style="margin-top:5px">${esc((b.scheduleType||'custom').toUpperCase())} · ${(b.sessionDates||[]).length} session(s)</p></div><div class="actions"><button class="btn secondary small p2-open-class" data-id="${b.id}">Open Batch</button><button class="btn ghost small p2-edit-class" data-id="${b.id}">Edit</button></div></div>`}
  function p2BindClassListButtons(){document.querySelectorAll('#classes .p2-open-class').forEach(x=>x.onclick=()=>{state.activeClassBatchId=x.dataset.id;save();switchPage('classWorkspace')});document.querySelectorAll('#classes .p2-edit-class').forEach(x=>x.onclick=()=>p2OpenBatch(x.dataset.id))}
  function p2RenderClasses(){
    if(!$('p2ClassList'))return;
    const allYears=[...new Set(state.classBatches.map(b=>String(p2BatchYear(b))).filter(Boolean))].sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
    const yf=$('p2YearFilter'),keepYear=yf?.value||'all';
    if(yf){yf.innerHTML='<option value="all">All years</option>'+allYears.map(y=>`<option value="${y}">${y}</option>`).join('');if([...yf.options].some(o=>o.value===keepYear))yf.value=keepYear}
    const cf=$('p2CourseFilter'),keepCourse=cf?.value||'all';
    if(cf){cf.innerHTML='<option value="all">All courses</option>'+state.courseTypes.filter(c=>c.active!==false).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');if([...cf.options].some(o=>o.value===keepCourse))cf.value=keepCourse}
    const q=($('p2ClassSearch')?.value||'').trim().toLowerCase(),course=cf?.value||'all',year=yf?.value||'all';
    const matches=b=>(course==='all'||b.courseId===course)&&(year==='all'||String(p2BatchYear(b))===year)&&(!q||[p2CourseName(b),b.name,b.status,p2AcharyaNames(b).join(' '),p2BatchYear(b)].join(' ').toLowerCase().includes(q));
    const records=state.classBatches.filter(matches);
    const grouped={};
    records.forEach(b=>{const y=String(p2BatchYear(b)||'Unknown');(grouped[y]||(grouped[y]=[])).push(b)});
    const years=Object.keys(grouped).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
    const isActive=b=>['current','upcoming','active','ongoing','planned'].includes(String(b.status||'Upcoming').toLowerCase());
    $('p2ClassList').innerHTML=years.length?years.map(y=>{
      const active=grouped[y].filter(isActive).sort((a,b)=>String(a.start||'').localeCompare(String(b.start||'')));
      const inactive=grouped[y].filter(b=>!isActive(b)).sort((a,b)=>String(b.start||'').localeCompare(String(a.start||'')));
      return `<div class="p2-year-class-box" data-year="${esc(y)}" tabindex="0">
        <div class="p2-year-class-head">
          <div><span class="p2-chip good">YEAR · ${esc(y)}</span><h4>${esc(y)} Classes</h4><p>${active.length} active / upcoming · ${inactive.length} inactive / completed</p></div>
          <div class="p2-year-open-hint">Double-click to open</div>
        </div>
        <div class="p2-year-class-body" hidden>
          <div class="p2-year-section"><h4>Active &amp; Upcoming</h4>${active.length?`<div class="p2-card-list">${active.map(p2ClassRecordHtml).join('')}</div>`:'<div class="p2-empty">No active or upcoming classes in this year.</div>'}</div>
          <div class="p2-year-section inactive"><h4>Inactive &amp; Completed</h4>${inactive.length?`<div class="p2-card-list">${inactive.map(p2ClassRecordHtml).join('')}</div>`:'<div class="p2-empty">No inactive or completed classes in this year.</div>'}</div>
        </div>
      </div>`;
    }).join(''):'<div class="p2-empty">No classes match this filter.</div>';
    const pastBox=$('p2PastClassList');if(pastBox)pastBox.innerHTML='';
    document.querySelectorAll('#p2ClassList .p2-year-class-box').forEach(box=>{
      const toggle=()=>{const body=box.querySelector('.p2-year-class-body');if(!body)return;body.hidden=!body.hidden;box.classList.toggle('open',!body.hidden);const hint=box.querySelector('.p2-year-open-hint');if(hint)hint.textContent=body.hidden?'Double-click to open':'Double-click to close'};
      box.ondblclick=e=>{if(e.target.closest('button'))return;toggle()};
      box.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button')){e.preventDefault();toggle()}};
    });
    p2BindClassListButtons();
  }
'''
text = text[:fn_start] + new_render + text[fn_end:]

css_marker = '</style>'
css = r'''
  /* PHASE2 BETA4A YEAR GROUPING */
  .p2-year-class-box{border:1px solid #d6e2eb;border-radius:14px;background:#fff;margin:12px 0;overflow:hidden;outline:none}
  .p2-year-class-box:focus{box-shadow:0 0 0 3px rgba(23,63,125,.10)}
  .p2-year-class-head{padding:18px;display:flex;align-items:center;justify-content:space-between;gap:18px;cursor:default;user-select:none}
  .p2-year-class-head h4{margin:7px 0 4px;font-size:18px;color:#102d5e}
  .p2-year-class-head p{margin:0;color:#687d91;font-size:12px;text-transform:uppercase;letter-spacing:.02em}
  .p2-year-open-hint{font-size:12px;color:#607890;border:1px solid #d6e2eb;border-radius:999px;padding:7px 10px;white-space:nowrap}
  .p2-year-class-box.open .p2-year-class-head{background:#f7fafc;border-bottom:1px solid #dce6ed}
  .p2-year-class-body{padding:14px 16px 18px;background:#fbfdfe}
  .p2-year-section>h4{margin:4px 0 10px;color:#173f7d;font-size:13px;text-transform:uppercase;letter-spacing:.04em}
  .p2-year-section.inactive{margin-top:18px;padding-top:16px;border-top:1px dashed #d4dfe7}
  .p2-year-section.inactive>h4{color:#6d7c88}
'''
pos=text.rfind(css_marker)
if pos<0: raise SystemExit('Could not locate style block for beta.4A')
text=text[:pos]+css+text[pos:]

required=[
    'PHASE2 BETA4A YEAR GROUPING',
    'Classes by Year',
    'Double-click to open',
    'Active &amp; Upcoming',
    'Inactive &amp; Completed',
    'p2-year-class-box'
]
for marker in required:
    if marker not in text:
        raise SystemExit(f'Missing beta.4A marker: {marker}')

path.write_text(text,encoding='utf-8',newline='\n')
print('APPLIED PHASE 2 BETA.4A ISSUES 1-3:',len(text.encode('utf-8')),'bytes')
