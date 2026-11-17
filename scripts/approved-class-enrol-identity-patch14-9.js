  // Patch 14.9 — prevent cross-person enrolment from stale search selection.
  // An entered 10-digit mobile is the identity key, never merely a visual label.
  // Keep the approved single-click confirmation and every previous enrol rule.
  window.anandaClassEnrolIdentityVersion='14.9';
  (function v149ProtectClassEnrollmentIdentity(){
    const form=$('p2EnrollForm');
    if(!form||typeof form.onsubmit!=='function')throw Error('Enrolment submit handler missing');
    const original=form.onsubmit;
    form.onsubmit=function(event){
      const batch=p2ActiveBatch();
      const name=$('p2cEnrollName')?.value.trim()||'';
      const phone=normMobile($('p2cEnrollMobile')?.value||'');
      const chosen=p2cEnrollSelection;
      const chosenPerson=chosen?.studentId?p2FindStudent(chosen.studentId):null;
      const chosenMobile=normMobile(chosenPerson?.mobile||chosen?.mobile||'');
      const exact=phone.length===10?state.students.find(s=>normMobile(s.mobile)===phone):null;

      // Never silently convert one Master's record to another person's name.
      if(exact&&name&&normName(exact.name)!==normName(name)){
        event.preventDefault();
        toast('This mobile belongs to '+exact.name+' in Student Master. Select that record or correct the number.');
        $('p2cEnrollMobile')?.focus();
        return;
      }
      // A selected search suggestion may be obsolete after the operator edits
      // the mobile/name fields. Resolve it from the ACTUAL entered mobile.
      if(phone.length===10&&(chosenMobile!==phone||(!chosen?.studentId&&exact))){
        if(exact){
          p2cEnrollSelection={key:'m:'+phone,name:exact.name,mobile:phone,
            studentId:exact.id,sources:[{type:'student',id:exact.id}]};
          $('p2EnrollStudentId').value=exact.id;
          $('p2EnrollSelected').innerHTML='<strong>Selected:</strong> '+esc(exact.name)+' · '+esc(phone);
        }else{
          // New mobile, even with an identical name, represents another person.
          p2cEnrollSelection=null;
          $('p2EnrollStudentId').value='';
          $('p2EnrollSelected').textContent='New person · '+name+' · '+phone;
        }
      }else if(chosen?.studentId&&chosenMobile!==phone){
        event.preventDefault();
        toast('The selected record does not match the entered mobile number.');
        $('p2cEnrollMobile')?.focus();
        return;
      }

      // Validate payment BEFORE creating a new Student Master record. Previously
      // a missing mode could cancel class enrolment after the new Master existed.
      if(batch&&!p2v563FreeBatch(batch)&&$('p2v514PaymentStatus')?.value==='Paid'&&
         !$('p2v514PaymentMode')?.value){
        const selectedStudent=p2cEnrollSelection?.studentId||exact?.id||'';
        const waived=selectedStudent&&p2v568RepeatFee({studentId:selectedStudent},batch);
        if(!waived){
          event.preventDefault();
          toast('Choose payment mode before saving the student');
          $('p2v514PaymentMode')?.focus();
          return;
        }
      }

      const beforeStudents=new Set(state.students.map(s=>s.id));
      const beforeEnrolments=new Set(state.classEnrollments.map(e=>e.id));
      try{
        original.call(this,event);
      }finally{
        const savedEnrolment=state.classEnrollments.some(e=>!beforeEnrolments.has(e.id));
        const approvalPending=$('p2v54OverrideModal')?.classList.contains('open')||
          $('v51SecurityModal')?.classList.contains('open');
        // Never leave an accidental new Master-only person if an enrolment was
        // rejected (or payment validation failed). Existing Master is untouched.
        // Deferred administrator approval must retain its intended pending person.
        if(!savedEnrolment&&!approvalPending)
          state.students=state.students.filter(s=>beforeStudents.has(s.id)||
            state.classEnrollments.some(e=>e.studentId===s.id));
      }
    };
  })();
