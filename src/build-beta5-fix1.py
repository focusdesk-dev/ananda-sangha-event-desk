from pathlib import Path

p=Path('src/index.html')
html=p.read_text(encoding='utf-8')

# 1) Align the schedule row and NEW CLASS control on one clean baseline.
html=html.replace(
    '.p2v5-schedule-row{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:14px;align-items:end}',
    '.p2v5-schedule-row{display:grid;grid-template-columns:1fr 1fr 1fr minmax(170px,auto);gap:14px;align-items:start}'
)
html=html.replace(
    '#p2v5NewClass{height:43px;min-width:170px;font-weight:900}',
    '#p2v5NewClass{height:43px;min-width:170px;font-weight:900;width:100%}.p2v5-new-class-field label{visibility:hidden}.p2v5-new-class-field{min-width:170px}'
)

# 2/3/4/5/6) Targeted runtime fixes inside the existing beta.5 scope.
marker='  p2v5PrepareWorkspace();\n\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Beta.5 insertion marker not found')

fix=r'''  // PHASE2 BETA5 FIX1 — issues 1-6 only: alignment, dates, per-date absent buttons, smooth search, simple payment.
  function p2v5FixIso(value,fallbackYear){
    const v=String(value||'').trim();if(!v)return'';
    let m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m){let y=Number(m[1]),fy=Number(fallbackYear);if((y<1900||y>2200)&&fy>=1900&&fy<=2200)y=fy;return `${String(y).padStart(4,'0')}-${m[2]}-${m[3]}`}
    m=v.match(/^(\d{2})-(\d{2})-(\d{4})$/);if(m){let y=Number(m[3]),fy=Number(fallbackYear);if((y<1900||y>2200)&&fy>=1900&&fy<=2200)y=fy;return `${String(y).padStart(4,'0')}-${m[2]}-${m[1]}`}
    return''
  }
  function p2v5FixEnsureDates(b){
    if(!b)return false;let changed=false;const currentYear=Number(today().slice(0,4));
    const start=p2v5FixIso(b.start,currentYear),year=Number((start||today()).slice(0,4)),end=p2v5FixIso(b.end,year);
    if(start&&b.start!==start){b.start=start;changed=true}if(end&&b.end!==end){b.end=end;changed=true}
    const raw=Array.isArray(b.sessionDates)?b.sessionDates:[],normal=[...new Set(raw.map(d=>p2v5FixIso(d,year)).filter(Boolean))].sort();
    if(JSON.stringify(raw)!==JSON.stringify(normal)){b.sessionDates=normal;changed=true}
    if(!normal.length&&start&&end&&end>=start){
      const day=Number(b.defaultClassDay??b.usualDay??p2CourseForBatch(b)?.defaultDay??0),built=[start];let d=p2cNextWeekday(start,day),guard=0;
      while(d&&d<=end&&guard++<370){if(!built.includes(d))built.push(d);d=p2cNextWeekday(d,day)}
      b.sessionDates=[...new Set(built)].sort();changed=true
    }
    if(changed)localStorage.setItem(KEY,JSON.stringify(state));return changed
  }

  const p2v5FixRenderScheduleBase=p2v5RenderSchedule;
  p2v5RenderSchedule=function(b){
    p2v5FixEnsureDates(b);p2v5FixRenderScheduleBase(b);
    const button=$('p2v5NewClass');if(button){const wrap=button.parentElement;if(wrap){wrap.classList.add('p2v5-field','p2v5-new-class-field');if(!wrap.querySelector('label'))wrap.insertAdjacentHTML('afterbegin','<label>New Class</label>')}}
  };

  const p2v5FixRenderAttendanceBase=p2v5RenderAttendance;
  p2v5RenderAttendance=function(b){
    p2v5FixEnsureDates(b);const wanted=p2cAttendanceQuery;p2cAttendanceQuery='';p2v5FixRenderAttendanceBase(b);p2cAttendanceQuery=wanted;
    const host=$('p2ClassRoster'),search=$('p2v5AttendanceSearch');if(!host||!search)return;search.value=wanted;
    const applySearch=()=>{
      p2cAttendanceQuery=search.value;const q=p2cAttendanceQuery.trim().toLowerCase(),all=state.classEnrollments.filter(e=>e.batchId===b.id);
      host.querySelectorAll('.p2v5-att-table tbody tr').forEach(row=>{const btn=row.querySelector('.p2v5-name-button'),en=btn?all.find(e=>e.id===btn.dataset.enrol):null,p=en?p2v5Person(en):null;row.style.display=(!q||(p&&[p.name,p.mobile].join(' ').toLowerCase().includes(q)))?'':'none'});
    };
    search.oninput=applySearch;applySearch();
  };

  p2v5RefreshPaymentEditFields=function(){
    const paid=$('p2v5PaymentStatus')?.value==='Paid';if($('p2v5PaymentDate'))$('p2v5PaymentDate').disabled=!paid;if($('p2v5PaymentMode'))$('p2v5PaymentMode').disabled=!paid
  };
  p2v5OpenStudentEdit=function(en){
    const p=p2v5Person(en);$('p2v5EditEnrollmentId').value=en.id;$('p2v5EditStudentName').textContent=[p.name,p.mobile].filter(Boolean).join(' · ');$('p2v5PaymentStatus').value=en.paymentStatus==='Paid'?'Paid':'Unpaid';$('p2v5PaymentDate').value=en.paymentDate||'';$('p2v5PaymentMode').value=['Cash','Card','UPI'].includes(en.paymentMode)?en.paymentMode:'';p2v5RefreshPaymentEditFields();$('p2v5StudentEditModal').classList.add('open')
  };
  p2v5SaveStudentDetails=function(ev){
    ev.preventDefault();const en=state.classEnrollments.find(e=>e.id===$('p2v5EditEnrollmentId').value);if(!en)return;const paid=$('p2v5PaymentStatus').value==='Paid';en.paymentStatus=paid?'Paid':'Unpaid';en.paymentDate=paid?($('p2v5PaymentDate').value||today()):'';en.paymentMode=paid?$('p2v5PaymentMode').value:'';if(paid&&!en.paymentMode){toast('Choose payment mode');return}$('p2v5StudentEditModal').classList.remove('open');save();toast('Student payment status saved')
  };

  const p2v5FixRenderStudentBase=p2v5RenderStudentDetails;
  p2v5RenderStudentDetails=function(b,en){
    p2v5FixRenderStudentBase(b,en);if(!en)return;const box=$('p2v5StudentDetails')?.querySelector('.p2v5-payment');if(!box)return;const paid=en.paymentStatus==='Paid';
    box.classList.toggle('pending',!paid);box.innerHTML=`<div class="p2v5-payment-head"><span>Payment / Fee Status</span><span class="p2v5-status-pill ${paid?'paid':''}">${paid?'PAID':'UNPAID'}</span></div>${paid?`<div class="p2v5-payment-grid" style="grid-template-columns:1fr 1fr"><div>Payment Date<b>${en.paymentDate?fmt(en.paymentDate):'—'}</b></div><div>Mode<b>${esc(en.paymentMode||'—')}</b></div></div>`:'<div class="p2v5-payment-grid" style="grid-template-columns:1fr"><div>Status<b>UNPAID</b></div></div>'}`
  };

  const p2v5FixPrepareBase=p2v5PrepareWorkspace;
  p2v5PrepareWorkspace=function(){
    p2v5FixPrepareBase();const form=$('p2v5StudentEditForm');if(!form)return;const grid=form.querySelector('.form-grid');if(grid&&!grid.dataset.fix1){grid.dataset.fix1='1';grid.innerHTML=`<div class="field"><label>PAYMENT STATUS</label><select id="p2v5PaymentStatus"><option>Unpaid</option><option>Paid</option></select></div><div class="field"><label>PAYMENT DATE</label><input id="p2v5PaymentDate" type="date"></div><div class="field"><label>MODE</label><select id="p2v5PaymentMode"><option value="">Select mode</option><option>Cash</option><option>Card</option><option>UPI</option></select></div>`}if($('p2v5PaymentStatus'))$('p2v5PaymentStatus').onchange=p2v5RefreshPaymentEditFields;form.onsubmit=p2v5SaveStudentDetails
  };

  const p2v5FixWorkspaceBase=p2RenderClassWorkspace;
  p2RenderClassWorkspace=function(){const b=p2ActiveBatch();if(b)p2v5FixEnsureDates(b);p2v5FixWorkspaceBase()};

  p2v5PrepareWorkspace();
'''
html=html.replace(marker,fix+'\n\n    updateBackButton();')

# Validation markers for this exact correction set.
required=['PHASE2 BETA5 FIX1','UNPAID','p2v5FixEnsureDates','search.oninput','MARK REMAINING ABSENT']
missing=[x for x in required if x not in html]
if missing: raise SystemExit('Missing fix markers: '+repr(missing))

p.write_text(html,encoding='utf-8')
print('BETA5 FIX1 APPLIED',len(html))
