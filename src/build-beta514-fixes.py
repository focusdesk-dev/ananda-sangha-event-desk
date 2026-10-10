from pathlib import Path
import re
p=Path('src/index.html')
html=p.read_text(encoding='utf-8')
if 'PHASE2 BETA513 CURRENT FINAL' not in html:
    raise SystemExit('Beta 5.13 marker missing')
if 'PHASE2 BETA514 ENROL PAYMENT IDENTITY' in html:
    print('already applied');raise SystemExit(0)
old="migrateLegacyPeople();mergeVolunteerAttendeeDuplicates();flagMissingAttendeeMobiles();"
if old in html:
    html=html.replace(old,"migrateLegacyPeople();flagMissingAttendeeMobiles();",1)
else:
    raise SystemExit('Legacy cross-list merge call not found')
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Insertion marker missing')
patch=r'''
  // PHASE2 BETA514 ENROL PAYMENT IDENTITY
  function p2v514IdentityRows(){
    const rows=[];
    state.volunteers.forEach(x=>{const m=normMobile(x.mobile);if(m.length===10)rows.push({role:'Volunteer',id:x.id,name:volName(x),mobile:m})});
    state.acharyas.forEach(x=>{const m=normMobile(x.mobile);if(m.length===10)rows.push({role:'Acharya',id:x.id,name:x.name||'',mobile:m})});
    state.kriyabans.forEach(x=>{const m=normMobile(x.mobile);if(m.length===10)rows.push({role:'Kriyaban',id:x.id,name:x.name||'',mobile:m})});
    state.students.forEach(x=>{const m=normMobile(x.mobile);if(m.length===10)rows.push({role:'Student',id:x.id,name:x.name||'',mobile:m})});
    state.attendeeMaster.forEach(x=>{
      const seen=new Set(),personal=normMobile(x.personalMobile||''),main=normMobile(x.mobile||'');
      if(personal.length===10){seen.add(personal);rows.push({role:'Attendee',id:x.id,name:x.name||'',mobile:personal})}
      if(x.category!=='family'&&main.length===10&&!seen.has(main))rows.push({role:'Attendee',id:x.id,name:x.name||'',mobile:main});
    });
    return rows
  }
  function p2v514MobileConflict(name,mobile,role='',id=''){
    const m=normMobile(mobile),n=normName(name);if(m.length!==10||!n)return null;
    return p2v514IdentityRows().find(x=>!(x.role===role&&x.id===id)&&x.mobile===m&&normName(x.name)!==n)||null
  }
  function p2v514SameRoleDuplicate(name,mobile,role,id=''){
    const m=normMobile(mobile);if(m.length!==10)return null;
    return p2v514IdentityRows().find(x=>x.role===role&&x.id!==id&&x.mobile===m)||null
  }
  function p2v514GuardIdentity(name,mobile,role,id=''){
    const m=normMobile(mobile);if(!m)return true;
    const same=p2v514SameRoleDuplicate(name,m,role,id);
    if(same){toast(`This mobile number already exists for ${same.name} in ${role} Master.`);return false}
    const conflict=p2v514MobileConflict(name,m,role,id);
    if(conflict){toast(`This mobile number already exists for ${conflict.name} (${conflict.role}).`);return false}
    return true
  }
  function p2v514WrapMasterForm(formId,getData){
    const form=$(formId);if(!form||form.dataset.p2v514Identity==='1')return;
    form.dataset.p2v514Identity='1';const base=form.onsubmit;
    form.onsubmit=function(ev){
      const d=getData();
      if(d.mobile&&normMobile(d.mobile).length===10&&!p2v514GuardIdentity(d.name,d.mobile,d.role,d.id)){ev.preventDefault();ev.stopPropagation();return false}
      return base?.call(this,ev)
    }
  }
  p2v514WrapMasterForm('volunteerForm',()=>({id:$('volunteerId').value||'',name:[$('volunteerFirstName').value,$('volunteerLastName').value].filter(Boolean).join(' ').trim(),mobile:$('volunteerMobile').value,role:'Volunteer'}));
  p2v514WrapMasterForm('p2AcharyaForm',()=>({id:$('p2AcharyaId').value||'',name:$('p2AcharyaName').value.trim(),mobile:$('p2AcharyaMobile').value,role:'Acharya'}));
  p2v514WrapMasterForm('kriyabanForm',()=>({id:$('kriyabanId').value||'',name:$('kriyabanName').value.trim(),mobile:$('kriyabanMobile').value,role:'Kriyaban'}));
  p2v514WrapMasterForm('p2StudentForm',()=>({id:$('p2StudentId').value||'',name:$('p2StudentName').value.trim(),mobile:$('p2StudentMobile').value,role:'Student'}));

  if($('attendeeMasterForm'))$('attendeeMasterForm').onsubmit=function(ev){
    ev.preventDefault();
    const id=$('attendeeMasterId').value||'',name=$('attendeeMasterName').value.trim(),mobile=normMobile($('attendeeMasterMobile').value),personalMobile=normMobile($('attendeeMasterPersonalMobile').value),category=$('attendeeMasterCategory').value;
    if(!name){toast('Enter the attendee name');return}
    if(mobile.length!==10){toast('Enter a valid 10-digit main or family mobile');return}
    if(personalMobile&&personalMobile.length!==10){toast('Enter a valid personal mobile or leave it blank');return}
    const identityMobile=personalMobile||(category==='family'?'':mobile);
    if(identityMobile&&!p2v514GuardIdentity(name,identityMobile,'Attendee',id))return;
    const old=state.attendeeMaster.find(x=>x.id===id);
    const sameMaster=state.attendeeMaster.find(x=>x.id!==id&&normName(x.name)===normName(name)&&normMobile(x.mobile)===mobile&&normMobile(x.personalMobile||'')===personalMobile);
    if(sameMaster){toast('This attendee already exists in the master');return}
    const item={id:id||uid('person'),name,mobile,personalMobile,city:old?.city||'',category,linkedVolunteerId:category==='family'?$('attendeeLinkedVolunteer').value||null:null,originalReferenceType:old?.originalReferenceType||null,originalReferenceId:old?.originalReferenceId||null,notes:$('attendeeMasterNotes').value.trim(),needsReview:false,reviewNotes:'',createdAt:old?.createdAt||new Date().toISOString(),permanentExplicit:true};
    if(id){const i=state.attendeeMaster.findIndex(x=>x.id===id);if(i>=0)state.attendeeMaster[i]=item;state.attendees.filter(a=>a.masterId===id).forEach(a=>{a.name=item.name;a.mobile=item.mobile;a.personalMobile=item.personalMobile;a.needsReview=false;a.reviewNotes=''})}else state.attendeeMaster.push(item);
    $('attendeeMasterModal').classList.remove('open');ev.target.reset();save();toast(id?'Attendee updated':'Attendee added to permanent master')
  };

  p2cCandidateList=function(){
    const map=new Map();
    const add=(type,id,name,mobile)=>{
      name=String(name||'').trim();mobile=normMobile(mobile||'');if(!name&&!mobile)return;
      const nn=normName(name),key=mobile?`m:${mobile}|n:${nn}`:`n:${nn}`;
      let c=map.get(key);if(!c){c={key,name,mobile,sources:[],studentId:''};map.set(key,c)}
      if(name&&!c.name)c.name=name;if(mobile&&!c.mobile)c.mobile=mobile;
      if(!c.sources.some(x=>x.type===type&&x.id===id))c.sources.push({type,id});
      if(type==='student')c.studentId=id
    };
    state.students.forEach(s=>add('student',s.id,s.name,s.mobile));
    state.volunteers.forEach(v=>add('volunteer',v.id,volName(v),v.mobile));
    state.attendeeMaster.forEach(a=>add('attendee',a.id,a.name,a.personalMobile||a.mobile));
    state.kriyabans.forEach(k=>add('kriyaban',k.id,k.name,k.mobile));
    state.classEnrollments.filter(e=>!e.studentId&&e.personName).forEach(e=>add('class-history',e.id,e.personName,e.personMobile));
    return[...map.values()].sort((a,b)=>(a.name||'').localeCompare(b.name||'',undefined,{sensitivity:'base',numeric:true}))
  };

  const p2v514StudentFromCandidateBase=p2cStudentFromCandidate;
  p2cStudentFromCandidate=function(c,name,mobile){
    const m=normMobile(mobile),existing=m?state.students.find(s=>normMobile(s.mobile)===m):null;
    if(existing&&normName(existing.name)!==normName(name)){toast(`This mobile number already exists for ${existing.name} (Student).`);return null}
    if(m&&m.length===10){const conflict=p2v514MobileConflict(name,m,'Student',existing?.id||'');if(conflict){toast(`This mobile number already exists for ${conflict.name} (${conflict.role}).`);return null}}
    return p2v514StudentFromCandidateBase(c,name,mobile)
  };

  function p2v514EnsurePaymentUi(){
    p2cEnsureEnrollUi();if($('p2v514PaymentFields'))return;
    const date=$('p2EnrollDate')?.closest('.field');if(!date)return;
    date.insertAdjacentHTML('afterend',`<div id="p2v514PaymentFields" class="p2v514-payment"><div class="form-grid"><div class="field"><label>PAYMENT STATUS</label><select id="p2v514PaymentStatus"><option value="Unpaid">Unpaid</option><option value="Paid">Paid</option></select></div><div class="field"><label>AMOUNT</label><input id="p2v514PaymentAmount" inputmode="decimal" placeholder="Course fee"></div><div class="field"><label>PAYMENT DATE</label><input id="p2v514PaymentDate" type="date"></div><div class="field"><label>MODE</label><select id="p2v514PaymentMode"><option value="">Select mode</option><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Card</option><option>Other</option></select></div></div></div>`);
    $('p2v514PaymentStatus').onchange=p2v514RefreshPaymentUi;p2v514RefreshPaymentUi()
  }
  function p2v514RefreshPaymentUi(){
    const paid=$('p2v514PaymentStatus')?.value==='Paid';
    if($('p2v514PaymentDate'))$('p2v514PaymentDate').disabled=!paid;
    if($('p2v514PaymentMode'))$('p2v514PaymentMode').disabled=!paid
  }
  function p2v514ResetPayment(){
    p2v514EnsurePaymentUi();const b=p2ActiveBatch();
    $('p2v514PaymentStatus').value='Unpaid';$('p2v514PaymentAmount').value=String(b?.courseFee??'');$('p2v514PaymentDate').value=$('p2EnrollDate')?.value||today();$('p2v514PaymentMode').value='';p2v514RefreshPaymentUi()
  }
  function p2v514PaymentData(){
    p2v514EnsurePaymentUi();const b=p2ActiveBatch(),paid=$('p2v514PaymentStatus').value==='Paid';
    return{paymentStatus:paid?'Paid':'Unpaid',feeAmount:$('p2v514PaymentAmount').value.trim()||String(b?.courseFee??''),paymentDate:paid?($('p2v514PaymentDate').value||$('p2EnrollDate').value||today()):'',paymentMode:paid?$('p2v514PaymentMode').value:''}
  }
  function p2v514ApplyPayment(en){if(!en||!$('p2EnrollModal')?.classList.contains('open'))return en;Object.assign(en,p2v514PaymentData());return en}

  const p2v514CreateEnrollmentBase=p2CreateEnrollment;
  p2CreateEnrollment=function(studentId,batchId){return p2v514ApplyPayment(p2v514CreateEnrollmentBase(studentId,batchId))};
  const p2v514DirectEnrollmentBase=p2cDirectEnrollment;
  p2cDirectEnrollment=function(c,name,mobile,b){return p2v514ApplyPayment(p2v514DirectEnrollmentBase(c,name,mobile,b))};
  if(typeof p2v56FinishEnrollment==='function'){
    const p2v514FinishEnrollmentBase=p2v56FinishEnrollment;
    p2v56FinishEnrollment=function(en){p2v514ApplyPayment(en);return p2v514FinishEnrollmentBase(en)}
  }

  p2v514EnsurePaymentUi();
  if($('p2EnrollStudent')){
    const p2v514OpenEnrollBase=$('p2EnrollStudent').onclick;
    $('p2EnrollStudent').onclick=function(ev){const r=p2v514OpenEnrollBase?.call(this,ev);p2v514ResetPayment();return r}
  }
  if($('p2EnrollForm')){
    const p2v514EnrollSubmitBase=$('p2EnrollForm').onsubmit;
    $('p2EnrollForm').onsubmit=function(ev){
      p2v514EnsurePaymentUi();
      if($('p2v514PaymentStatus').value==='Paid'&&!$('p2v514PaymentMode').value){ev.preventDefault();toast('Choose payment mode for a paid enrolment');$('p2v514PaymentMode').focus();return false}
      return p2v514EnrollSubmitBase?.call(this,ev)
    }
  }

  (function p2v514Style(){
    if($('p2v514Style'))return;const st=document.createElement('style');st.id='p2v514Style';st.textContent=`
      #p2EnrollModal .modal{max-width:660px}.p2v514-payment{margin-top:14px;padding-top:14px;border-top:1px solid #d7e3ef}.p2v514-payment .form-grid{gap:12px}
    `;document.head.appendChild(st)
  })();
'''
html=html.replace(marker,'\n'+patch+marker,1)
p.write_text(html,encoding='utf-8')
print('BETA 5.14 FIXES APPLIED',len(html))
