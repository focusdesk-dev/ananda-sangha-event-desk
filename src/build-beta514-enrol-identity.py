from pathlib import Path

p=Path('src/index.html')
html=p.read_text(encoding='utf-8')
if 'PHASE2 BETA513 CURRENT FINAL' not in html:
    raise SystemExit('Beta 5.13 final marker not found')
if 'PHASE2 BETA514 ENROL PAYMENT IDENTITY' in html:
    print('Beta 5.14 patch already applied')
    raise SystemExit(0)

marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Insertion marker not found')

patch=r'''
  // PHASE2 BETA514 ENROL PAYMENT IDENTITY
  // Fixes: volunteer/attendee/etc search in Enrol Student, payment at enrolment,
  // immediate roster refresh, and mobile identity conflicts across permanent lists.

  function p2v514RoleLabel(type){
    return ({volunteer:'Volunteer',acharya:'Acharya',student:'Student',kriyaban:'Kriyaban',attendee:'Attendee'})[type]||type
  }
  function p2v514IdentityRows(){
    const rows=[],add=(type,id,name,mobile)=>{
      name=String(name||'').trim();mobile=normMobile(mobile||'');
      if(name&&mobile.length===10)rows.push({type,id,name,mobile})
    };
    state.volunteers.forEach(v=>add('volunteer',v.id,volName(v),v.mobile));
    state.acharyas.forEach(a=>add('acharya',a.id,a.name,a.mobile));
    state.students.forEach(s=>add('student',s.id,s.name,s.mobile));
    state.kriyabans.forEach(k=>add('kriyaban',k.id,k.name,k.mobile));
    state.attendeeMaster.forEach(a=>{
      const personal=normMobile(a.personalMobile||''),main=normMobile(a.mobile||'');
      if(personal.length===10)add('attendee',a.id,a.name,personal);
      // Family members may legitimately share the linked/family main number.
      if(a.category!=='family'&&main.length===10&&main!==personal)add('attendee',a.id,a.name,main);
    });
    return rows
  }
  function p2v514IdentityConflict(type,id,name,mobile){
    const m=normMobile(mobile||''),n=normName(name||'');if(m.length!==10||!n)return null;
    const rows=p2v514IdentityRows().filter(r=>!(r.type===type&&r.id===id)&&r.mobile===m);
    const different=rows.find(r=>normName(r.name)!==n);
    if(different)return{kind:'different-name',record:different};
    const sameList=rows.find(r=>r.type===type&&normName(r.name)===n);
    if(sameList)return{kind:'same-list',record:sameList};
    return null
  }
  function p2v514BlockIdentity(type,id,name,mobile){
    const hit=p2v514IdentityConflict(type,id,name,mobile);if(!hit)return false;
    if(hit.kind==='different-name')toast(`This mobile number already exists for ${hit.record.name} (${p2v514RoleLabel(hit.record.type)}).`);
    else toast(`${hit.record.name} already exists in ${p2v514RoleLabel(type)} Master.`);
    return true
  }

  // Guard every manual permanent-master save before the older handlers run.
  document.addEventListener('submit',ev=>{
    const f=ev.target;if(!(f instanceof HTMLFormElement))return;
    let blocked=false;
    if(f.id==='volunteerForm'){
      const name=[$('volunteerFirstName')?.value,$('volunteerLastName')?.value].join(' ').trim();
      blocked=p2v514BlockIdentity('volunteer',$('volunteerId')?.value||'',name,$('volunteerMobile')?.value||'')
    }else if(f.id==='p2AcharyaForm'){
      blocked=p2v514BlockIdentity('acharya',$('p2AcharyaId')?.value||'',$('p2AcharyaName')?.value||'',$('p2AcharyaMobile')?.value||'')
    }else if(f.id==='p2StudentForm'){
      blocked=p2v514BlockIdentity('student',$('p2StudentId')?.value||'',$('p2StudentName')?.value||'',$('p2StudentMobile')?.value||'')
    }else if(f.id==='kriyabanForm'){
      blocked=p2v514BlockIdentity('kriyaban',$('kriyabanId')?.value||'',$('kriyabanName')?.value||'',$('kriyabanMobile')?.value||'')
    }else if(f.id==='attendeeMasterForm'){
      const id=$('attendeeMasterId')?.value||'',name=$('attendeeMasterName')?.value||'',category=$('attendeeMasterCategory')?.value||'outside';
      const personal=$('attendeeMasterPersonalMobile')?.value||'',main=$('attendeeMasterMobile')?.value||'';
      if(normMobile(personal).length===10)blocked=p2v514BlockIdentity('attendee',id,name,personal);
      if(!blocked&&category!=='family'&&normMobile(main).length===10)blocked=p2v514BlockIdentity('attendee',id,name,main)
    }
    if(blocked){ev.preventDefault();ev.stopImmediatePropagation()}
  },true);

  // Candidate identity is NAME + MOBILE, not MOBILE alone.
  // This prevents one bad/conflicting record from hiding another person's name.
  p2cCandidateList=function(){
    const map=new Map();
    const add=(type,id,name,mobile)=>{
      name=String(name||'').trim();mobile=normMobile(mobile||'');if(!name&&!mobile)return;
      const key=`${normName(name)}|${mobile||'no-mobile'}`;
      let c=map.get(key);if(!c){c={key,name,mobile,sources:[],studentId:''};map.set(key,c)}
      if(name&&!c.name)c.name=name;if(mobile&&!c.mobile)c.mobile=mobile;
      if(!c.sources.some(x=>x.type===type&&x.id===id))c.sources.push({type,id});
      if(type==='student')c.studentId=id
    };
    state.students.forEach(s=>add('student',s.id,s.name,s.mobile));
    state.volunteers.forEach(v=>add('volunteer',v.id,volName(v),v.mobile));
    state.attendeeMaster.forEach(a=>add('attendee',a.id,a.name,a.personalMobile||a.mobile));
    state.kriyabans.forEach(k=>add('kriyaban',k.id,k.name,k.mobile));
    state.acharyas.forEach(a=>add('acharya',a.id,a.name,a.mobile));
    state.classEnrollments.filter(e=>!e.studentId&&e.personName).forEach(e=>add('class-history',e.id,e.personName,e.personMobile));
    return[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'}))
  };
  p2cCandidateTags=function(c){
    const names={student:'Student',volunteer:'Volunteer',attendee:'Attendee',kriyaban:'Kriyaban',acharya:'Acharya','class-history':'Class history'};
    return(c?.sources||[]).map(x=>names[x.type]||x.type).filter((x,i,a)=>a.indexOf(x)===i)
  };

  // Enrolment-created Student Master records must obey the same identity rule.
  const p2v514StudentFromCandidateBase=p2cStudentFromCandidate;
  p2cStudentFromCandidate=function(c,name,mobile){
    const existingStudent=c?.studentId?p2FindSudent(c.studentId):null;
    if(!existingStudent&&normMobile(mobile).length===10&&p2v514BlockIdentity('student','',name,mobile))return null;
    return p2v514StudentFromCandidateBase(c,name,mobile)
  };

  function p2v514EnsurePaymentUi(){
    p2cEnsureEnrollUi();
    if($('p2v514EnrollPayment'))return;
    const dateField=$('p2EnrollDate')?.closest('.field');
    if(!dateField)return;
    dateField.insertAdjacentHTML('beforebegin',`<div id="p2v514EnrollPayment" class="p2v514-pay full">
      <div class="p2v514-pay-title">PAYMENT</div>
      <div class="form-grid">
        <div class="field"><label>PAYMENT STATUS</label><select id="p2v514PaymentStatus"><option value="Unpaid">Unpaid</option><option value="Paid">Paid</option></select></div>
        <div class="field"><label>COURSE FEE /label><input id="p2v514FeeAmount" readonly></div>
        <div class="field"><label>PAYMENT DATE</label><input id="p2v514PaymentDate" type="date"></div>
        <div class="field"><label>MODE</label><select id="p2v514PaymentMode"><option value="">Select mode</option><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Card</option><option>Other</option></select></div>
      </div>
    </div>`);
    $('p2v514PaymentStatus').onchange=p2v514RefreshPaymentUi
  }
  function p2v514RefreshPaymentUi(){
    const paid=$('p2v514PaymentStatus')?.value==='Paid';
    if($('p2v514PaymentDate'))$('p2v514PaymentDate').disabled=!paid;
    if($('p2v514PaymentMode'))$('p2v514PaymentMode').disabled=!paid
  }
  function p2v514ResetPayment(){
    p2v514EnsurePaymentUi();const b=p2ActiveBatch(),fee=String(b?.courseFee??'').trim();
    $('p2v514PaymentStatus').value='Unpaid';
    $('p2v514FeeAmount').value=fee?`₹ ${fee}`:'Free / not set';
    $('p2v514PaymentDate').value=today();
    $('p2v514PaymentMode').value='';
    p2v514RefreshPaymentUi()
  }
  function p2v514ApplyPayment(en){
    if(!en)return false;p2v514EnsurePaymentUi();
    const paid=$('p2v514PaymentStatus')?.value==='Paid',mode=$('p2v514PaymentMode')?.value||'',date=$('p2v514PaymentDate')?.value||today(),b=p2ActiveBatch();
    if(paid&&!mode){toast('Choose payment mode');$('p2v514PaymentMode')?.focus();return false}
    en.paymentStatus=paid?'Paid':'Unpaid';
    en.paymentDate=paid?date:'';
    en.paymentMode=paid?mode:'';
    if(b?.courseFee!==undefined&&b.courseFee!==''&&!en.feeAmount)en.feeAmount=String(b.courseFee);
    return true
  }

  const p2v514ResetEnrollBase=p2cResetEnroll;
  p2cResetEnroll=function(){p2v514ResetEnrollBase();p2v514ResetPayment()};

  // The final enrolment submit keeps the search-first flow, creates/links the Student Master,
  // stores payment in the same action, and refreshes the visible roster immediately.
  $('p2EnrollForm').onsubmit=ev=>{
    ev.preventDefault();const b=p2ActiveBatch();if(!b){toast('No class batch selected');return}
    p2v514EnsurePaymentUi();
    const name=$('p2cEnrollName')?.value.trim()||'',mobile=normMobile($('p2cEnrollMobile')?.value||''),c=p2cEnrollSelection;
    if(!name){toast('Enter the enrollee name');$('p2cEnrollName')?.focus();return}
    if(mobile&&mobile.length!==10){toast('Mobile must be 10 digits or left blank');$('p2cEnrollMobile')?.focus();return}
    let en=null;
    if(c?.studentId)en=p2CreateEnrollment(c.studentId,b.id);
    else{
      const student=p2cStudentFromCandidate(c,name,mobile);if(!student)return;
      en=p2CreateEnrollment(student.id,b.id)
    }
    // When progression needs admin approval p2CreateEnrollment intentionally returns null.
    if(!en)return;
    if(!p2v514ApplyPayment(en)){state.classEnrollments=state.classEnrollments.filter(x=>x.id!==en.id);return}
    en.enrolledAt=$('p2EnrollDate')?.value||today();
    $('p2EnrollModal').classList.remove('open');
    p2cSelectedEnrollmentId=en.id;
    save();
    if(page==='classWorkspace')p2RenderClassWorkspace();
    toast(`${name} enrolled`)
  };

  // Admin-approved progression completes through this function, so payment must be preserved there too.
  if(typeof p2v56FinishEnrollment==='function'){
    const p2v514FinishEnrollmentBase=p2v56FinishEnrollment;
    p2v56FinishEnrollment=function(en){
      if(!en)return null;
      if(!p2v514ApplyPayment(en)){state.classEnrollments=state.classEnrollments.filter(x=>x.id!==en.id);save();return null}
      const r=p2v514FinishEnrollmentBase(en);
      if(page==='classWorkspace')p2RenderClassWorkspace();
      return r
    }
  }

  p2v514EnsurePaymentUi();
  if($('p2EnrollStudentSearch')){
    $('p2EnrollStudentSearch').placeholder='Type student / volunteer / attendee / Kriyaban / Acharya name or mobile'
  }

  (function p2v514Style(){
    if($('p2v514Style'))return;const st=document.createElement('style');st.id='p2v514Style';st.textContent=`
      #p2EnrollModal .modal{max-width:680px}
      .p2v514-pay{margin-top:14px;padding-top:14px;border-top:1px solid #d7e2ec}
      .p2v514-pay-title{font-size:11px;font-weight:900;color:#536b84;margin-bottom:10px;letter-spacing:.02em}
      #p2v514FeeAmount[readonly]{background:#f5f8fb;color:#173f77;font-weight:800}
    `;document.head.appendChild(st)
  })();
'''

html=html.replace(marker,'\n'+patch+marker,1)
p.write_text(html,encoding='utf-8')
print('BETA 5.14 ENROL/PAYMENT/IDENTITY PATCH APPLIED')
