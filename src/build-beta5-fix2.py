from pathlib import Path
p=Path('src/index.html')
html=p.read_text(encoding='utf-8')
marker='  p2v5PrepareWorkspace();\n\n\n    updateBackButton();'
if marker not in html:
    marker='  p2v5PrepareWorkspace();\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('fix2 marker not found')
fix=r'''  // PHASE2 BETA5 FIX2 — new class action, alphabetical roster, editable past class dates.
  function p2v5Fix2EnsureDateModal(){
    if($('p2v5Fix2DateModal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div id="p2v5Fix2DateModal" class="modal-backdrop"><form id="p2v5Fix2DateForm" class="modal" style="max-width:430px"><div class="modal-head"><h3 id="p2v5Fix2DateTitle">Class Date</h3><button type="button" class="x" id="p2v5Fix2DateClose">×</button></div><div class="field full"><label>CLASS DATE</label><input id="p2v5Fix2DateInput" type="date" required></div><div class="actions" style="margin-top:18px"><button class="btn" type="submit">Save Date</button><button class="btn ghost" id="p2v5Fix2DateCancel" type="button">Cancel</button></div></form></div>`);
    $('p2v5Fix2DateClose').onclick=$('p2v5Fix2DateCancel').onclick=()=>$('p2v5Fix2DateModal').classList.remove('open');
  }
  let p2v5Fix2DateContext=null;
  function p2v5Fix2OpenDateDialog(b,oldDate=''){
    if(!b||p2v5IsEnded(b))return;p2v5Fix2EnsureDateModal();
    p2v5Fix2DateContext={b,oldDate};$('p2v5Fix2DateTitle').textContent=oldDate?'Edit Class Date':'New Class Date';
    $('p2v5Fix2DateInput').value=oldDate||p2v5SuggestedNewDate(b)||today();$('p2v5Fix2DateModal').classList.add('open');setTimeout(()=>$('p2v5Fix2DateInput').focus(),30);
  }
  function p2v5Fix2EditClassDate(b,oldDate,newDate){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(newDate||'')){toast('Choose a class date');return false}
    if(newDate===oldDate)return true;const dates=p2v5ValidDates(b);if(dates.includes(newDate)){toast('This class date already exists');return false}
    b.sessionDates=dates.map(d=>d===oldDate?newDate:d).sort();
    state.classEnrollments.filter(e=>e.batchId===b.id).forEach(e=>{if(e.attendance&&Object.prototype.hasOwnProperty.call(e.attendance,oldDate)){const v=e.attendance[oldDate];delete e.attendance[oldDate];if(!Object.prototype.hasOwnProperty.call(e.attendance,newDate))e.attendance[newDate]=v}});
    const ds=p2v5ValidDates(b);if(b.start===oldDate)b.start=ds[0]||newDate;else if(!b.start||newDate<b.start)b.start=newDate;
    if(b.end===oldDate)b.end=ds.at(-1)||newDate;else if(b.end&&newDate>b.end)b.end=newDate;
    save();toast('Class date updated');return true
  }
  p2v5Fix2EnsureDateModal();
  $('p2v5Fix2DateForm').onsubmit=ev=>{ev.preventDefault();const c=p2v5Fix2DateContext;if(!c)return;const d=$('p2v5Fix2DateInput').value;if(c.oldDate){if(!p2v5Fix2EditClassDate(c.b,c.oldDate,d))return}else{const before=p2v5ValidDates(c.b).length;p2v5AddNewClass(c.b,d);if(p2v5ValidDates(c.b).length===before)return}$('p2v5Fix2DateModal').classList.remove('open')};

  const p2v5Fix2RenderScheduleBase=p2v5RenderSchedule;
  p2v5RenderSchedule=function(b){
    p2v5Fix2RenderScheduleBase(b);if(!b||p2v5IsEnded(b))return;
    const add=$('p2v5NewClass');if(add)add.onclick=()=>p2v5Fix2OpenDateDialog(b,'');
    $('p2v5ScheduleCard')?.querySelectorAll('.p2v5-date-chip').forEach(chip=>{const remove=chip.querySelector('.p2v5-date-remove'),d=remove?.dataset.date;if(!d||chip.querySelector('.p2v5-date-edit'))return;const edit=document.createElement('button');edit.type='button';edit.className='p2v5-date-edit';edit.dataset.date=d;edit.title='Edit class date';edit.textContent='✎';edit.style.cssText='border:0;background:transparent;color:#24486d;font-size:16px;cursor:pointer;padding:2px 4px';edit.onclick=()=>p2v5Fix2OpenDateDialog(b,d);remove.parentElement.insertBefore(edit,remove)});
  };

  const p2v5Fix2RenderAttendanceBase=p2v5RenderAttendance;
  p2v5RenderAttendance=function(b){
    p2v5Fix2RenderAttendanceBase(b);const body=$('p2ClassRoster')?.querySelector('.p2v5-att-table tbody');if(!body)return;
    [...body.querySelectorAll('tr')].sort((a,z)=>{const an=(a.querySelector('.p2v5-name-button')?.textContent||'').trim(),zn=(z.querySelector('.p2v5-name-button')?.textContent||'').trim();return an.localeCompare(zn,undefined,{sensitivity:'base',numeric:true})}).forEach(r=>body.appendChild(r));
  };

  // Re-render once so the active batch immediately receives the fixed controls/order.
  if(page==='classWorkspace'&&p2ActiveBatch())p2RenderClassWorkspace();
'''
html=html.replace(marker,fix+'\n\n    updateBackButton();')
required=['PHASE2 BETA5 FIX2','p2v5Fix2OpenDateDialog','p2v5-date-edit','localeCompare(zn','Class date updated']
missing=[x for x in required if x not in html]
if missing: raise SystemExit('Missing fix2 markers '+repr(missing))
p.write_text(html,encoding='utf-8')
print('BETA5 FIX2 APPLIED',len(html))
