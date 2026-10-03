from pathlib import Path

path = Path('src/index.html')
text = path.read_text(encoding='utf-8')

# ---- Classes opening page -------------------------------------------------
start = text.find('<section id="classes" class="page">')
end = text.find('<section id="courseMaster" class="page">', start)
if start < 0 or end < 0:
    raise SystemExit('Could not locate Classes section')

classes_html = r'''<section id="classes" class="page">
      <!-- PHASE2 CLASSES NAV BETA3 -->
      <div class="event-banner"><div><h3>Classes</h3><p>Meditation classes, attendance, student progress and outreach.</p></div></div>

      <!-- Kept only for compatibility with existing Phase 2 handlers. These are intentionally not shown on the Classes opening page. -->
      <div style="display:none" aria-hidden="true">
        <button id="p2OpenCourseMaster" type="button"></button>
        <button id="p2ClassCourseMaster" type="button"></button>
        <button id="p2ClassesOutreach" type="button"></button>
        <select id="p2YearFilter"><option value="all">All years</option></select>
        <select id="p2StatusFilter"><option value="all">All statuses</option><option>Upcoming</option><option>Current</option><option>Completed</option></select>
      </div>

      <div class="p2-home-grid" style="margin-bottom:18px">
        <button class="p2-home-card" id="p2AddBatch"><span class="no">01</span><div><strong>+ New Class Batch</strong><br><small>Create a new class batch. Saved batches appear under Active Classes.</small></div></button>
        <button class="p2-home-card" id="p2ClassBatches"><span class="no">02</span><div><strong>Active Classes</strong><br><small>Current and upcoming class batches only.</small></div></button>
        <button class="p2-home-card go" data-go="studentProgress"><span class="no">03</span><div><strong>Student Progress &amp; Outreach</strong><br><small>Search a student and view class history, progress and next-stage follow-up.</small></div></button>
        <button class="p2-home-card" id="p2ClassesAttendance"><span class="no">04</span><div><strong>Attendance</strong><br><small>Open an active class and mark attendance session by session.</small></div></button>
        <button class="p2-home-card" id="p2ClassesReports"><span class="no">05</span><div><strong>Class Reports</strong><br><small>Roster, attendance, completion, progression and annual summary.</small></div></button>
      </div>

      <div class="card" id="p2BatchListCard">
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
      </div>
    </section>

    '''

text = text[:start] + classes_html + text[end:]

# ---- Student Progress + Outreach naming ----------------------------------
old_progress = '''<section id="studentProgress" class="page">
      <div class="event-banner"><div><h3>Student Progress</h3><p>Inside Classes: complete course, batch, attendance, completion and Kriya history for one person.</p></div></div>'''
new_progress = '''<section id="studentProgress" class="page">
      <div class="event-banner"><div><h3>Student Progress &amp; Outreach</h3><p>Search one student to see course history, attendance, progression and next-stage follow-up.</p></div></div>'''
if old_progress not in text:
    raise SystemExit('Could not locate Student Progress header')
text = text.replace(old_progress, new_progress, 1)

# ---- Active classes + year-folded past classes ---------------------------
fn_start = text.find('  function p2RenderClasses(){')
fn_end = text.find('  function p2RenderCourses(){', fn_start)
if fn_start < 0 or fn_end < 0:
    raise SystemExit('Could not locate p2RenderClasses')

new_render = r'''  function p2ClassRecordHtml(b){return `<div class="p2-record"><div><span class="p2-chip good">CLASS · ${esc(p2BatchYear(b)||'—')}</span><h4>${esc(p2CourseName(b))} — ${esc(b.name)}</h4><p>${fmt(b.start)}${b.end?' to '+fmt(b.end):''} · ${esc(b.status||'Upcoming')} · ${esc(p2AcharyaNames(b).join(', ')||'No Acharya assigned')}</p><p style="margin-top:5px">${esc((b.scheduleType||'custom').toUpperCase())} · ${(b.sessionDates||[]).length} session(s)</p></div><div class="actions"><button class="btn secondary small p2-open-class" data-id="${b.id}">Open Batch</button><button class="btn ghost small p2-edit-class" data-id="${b.id}">Edit</button></div></div>`}
  function p2BindClassListButtons(){document.querySelectorAll('#classes .p2-open-class').forEach(x=>x.onclick=()=>{state.activeClassBatchId=x.dataset.id;save();switchPage('classWorkspace')});document.querySelectorAll('#classes .p2-edit-class').forEach(x=>x.onclick=()=>p2OpenBatch(x.dataset.id))}
  function p2RenderClasses(){
    if(!$('p2ClassList'))return;
    const years=[...new Set(state.classBatches.map(b=>String(p2BatchYear(b))).filter(Boolean))].sort().reverse(),yf=$('p2YearFilter'),keepYear=yf?.value||'all';
    if(yf){yf.innerHTML='<option value="all">All years</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join('');if([...yf.options].some(o=>o.value===keepYear))yf.value=keepYear}
    const cf=$('p2CourseFilter'),keepCourse=cf?.value||'all';
    if(cf){cf.innerHTML='<option value="all">All courses</option>'+state.courseTypes.filter(c=>c.active!==false).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');if([...cf.options].some(o=>o.value===keepCourse))cf.value=keepCourse}
    const q=($('p2ClassSearch')?.value||'').trim().toLowerCase(),course=cf?.value||'all';
    const matches=b=>(course==='all'||b.courseId===course)&&(!q||[p2CourseName(b),b.name,b.status,p2AcharyaNames(b).join(' '),p2BatchYear(b)].join(' ').toLowerCase().includes(q));
    const active=state.classBatches.filter(b=>(b.status||'Upcoming')!=='Completed'&&matches(b)).sort((a,b)=>String(a.start||'').localeCompare(String(b.start||'')));
    $('p2ClassList').innerHTML=active.length?`<div class="p2-card-list">${active.map(p2ClassRecordHtml).join('')}</div>`:'<div class="p2-empty">No active classes. Use + New Class Batch to create one.</div>';

    const past=state.classBatches.filter(b=>(b.status||'')==='Completed'&&matches(b)).sort((a,b)=>String(b.start||'').localeCompare(String(a.start||'')));
    const pastBox=$('p2PastClassList');
    if(pastBox){
      const grouped={};past.forEach(b=>{const y=String(p2BatchYear(b)||'Unknown');(grouped[y]||(grouped[y]=[])).push(b)});
      const pastYears=Object.keys(grouped).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
      pastBox.innerHTML=pastYears.length?pastYears.map(y=>`<details class="p2-year-folder"><summary><strong>${esc(y)}</strong><span>${grouped[y].length} completed class${grouped[y].length===1?'':'es'}</span></summary><div class="p2-card-list">${grouped[y].map(p2ClassRecordHtml).join('')}</div></details>`).join(''):'<div class="p2-empty">No completed classes yet.</div>';
    }
    p2BindClassListButtons();
  }
'''
text = text[:fn_start] + new_render + text[fn_end:]

# ---- Small styling for year folders --------------------------------------
css_marker = '</style>'
css = r'''
  .p2-year-folder{border:1px solid #d8e3eb;border-radius:12px;margin:10px 0;background:#fff;overflow:hidden}
  .p2-year-folder>summary{list-style:none;cursor:pointer;padding:15px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-weight:800;color:#173f7d;background:#f7fafc}
  .p2-year-folder>summary::-webkit-details-marker{display:none}
  .p2-year-folder>summary:after{content:'+';font-size:20px;line-height:1;color:#173f7d}
  .p2-year-folder[open]>summary:after{content:'−'}
  .p2-year-folder>summary span{font-size:12px;font-weight:600;color:#6c7f90;margin-left:auto;margin-right:10px}
  .p2-year-folder>.p2-card-list{padding:12px}
'''
# Put it into the last style block nearest the Phase 2 markup if possible.
pos = text.rfind(css_marker)
if pos < 0:
    raise SystemExit('Could not locate style block')
text = text[:pos] + css + text[pos:]

# Validation markers for this specific beta.3 change.
required = [
    'PHASE2 CLASSES NAV BETA3',
    '<strong>+ New Class Batch</strong>',
    '<strong>Active Classes</strong>',
    'Student Progress &amp; Outreach',
    'id="p2PastClassList"',
    'class="p2-year-folder"',
    'No active classes. Use + New Class Batch to create one.'
]
for marker in required:
    if marker not in text:
        raise SystemExit(f'Missing beta.3 marker: {marker}')

path.write_text(text, encoding='utf-8', newline='\n')
print('APPLIED PHASE 2 BETA.3 CLASSES REDESIGN:', len(text.encode('utf-8')), 'bytes')
