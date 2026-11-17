  // Patch 14.8: Critical one-click Enrol Student correction.
  // The legacy repeat-fee code referenced a function scoped inside a later
  // progression IIFE. A ReferenceError interrupted save() after creating
  // enrolment in memory. Preserve the repeat waiver rule; avoid that private
  // function by resolving the course using the existing shared course master.
  window.anandaEnrolSaveAndConfirmVersion='14.8';
  function v148CanonicalCourse(batch){
    if(!batch)return '';
    const course=p2CourseForBatch(batch),raw=String(course?.name||batch.level||'').trim();
    const normalised=raw.toLowerCase().replace(/[^a-z0-9]/g,'');
    return p2FullChain.find(stage=>stage.toLowerCase().replace(/[^a-z0-9]/g,'')===normalised)||raw;
  }
  function v148ShowEnrolSuccess(name){
    // Only called AFTER actual record save() succeeds. The original roster
    // render, duplicate check, payment and progression logic is untouched.
    const old=document.getElementById('v148EnrolSuccessModal');
    if(old)old.remove();
    const dialog=document.createElement('div');
    dialog.id='v148EnrolSuccessModal';
    dialog.className='modal-backdrop open';
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-labelledby','v148EnrolSuccessTitle');
    dialog.innerHTML=
      '<div class="modal" style="max-width:425px">'+
      '<div class="modal-head"><h3 id="v148EnrolSuccessTitle">Student enrolled successfully</h3></div>'+
      '<p id="v148EnrolSuccessPerson" style="margin:12px 0 22px;color:#38506f">'+
        esc(name||'Student')+' has been saved in this class.</p>'+
      '<div class="actions" style="justify-content:flex-end">'+
      '<button id="v148EnrolSuccessOk" class="btn" type="button">OK</button>'+
      '</div></div>';
    document.body.append(dialog);
    const ok=document.getElementById('v148EnrolSuccessOk');
    const finish=()=>{
      dialog.remove();
      document.getElementById('p2EnrollModal')?.classList.remove('open');
      if(p2ActiveBatch()&&page!=='classWorkspace')switchPage('classWorkspace');
      // Roster is already re-rendered by save(). Bring the user back to it.
      const roster=document.getElementById('p2ClassRoster');
      if(roster&&document.getElementById('classWorkspace')?.classList.contains('active'))
        roster.scrollIntoView({block:'start',behavior:'smooth'});
      document.getElementById('p2EnrollStudent')?.focus();
    };
    ok.onclick=finish;
    dialog.addEventListener('keydown',ev=>{
      if(ev.key==='Escape'){ev.preventDefault();finish()}
    });
    ok.focus();
  }
