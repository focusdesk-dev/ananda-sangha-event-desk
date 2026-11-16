
  // PATCH 13 — exact identity links and consistent duplicate-mobile checks.
  // No visual changes to frozen Events, Badge & Scarf, Classes or left sidebar.
  window.anandaStudentVolunteerIntegrityVersion='13';

  const p13Number=value=>normMobile(value||'');
  const p13Name=value=>normName(value||'');
  function p13ValidMobile(value){return p13Number(value).length===10}
  function p13StudentMatchesVolunteer(student,volunteer){
    if(!student||!volunteer)return false;
    const refs=volunteer.linkedIdentityRefs||[];
    if(refs.some(r=>r.kind==='student'&&r.id===student.id))return true;
    if(volunteer.linkedPersonId===student.id)return true;
    const name=p13Name(student.name),mobile=p13Number(student.mobile);
    if(!name||mobile.length!==10||p13Number(volunteer.mobile)!==mobile||
       p13Name(volName(volunteer))!==name)return false;
    // Exact name and personal phone only, with unique identities on both sides.
    const students=state.students.filter(s=>p13Name(s.name)===name&&p13Number(s.mobile)===mobile);
    const volunteers=state.volunteers.filter(v=>p13Name(volName(v))===name&&p13Number(v.mobile)===mobile);
    return students.length===1&&volunteers.length===1;
  }
  function p13ReconcileStudentVolunteerLinks(){
    let changed=false;
    for(const student of state.students||[]){
      const matches=(state.volunteers||[]).filter(v=>p13StudentMatchesVolunteer(student,v));
      if(matches.length!==1)continue;
      const volunteer=matches[0];
      if(student.volunteerId!==volunteer.id){student.volunteerId=volunteer.id;changed=true}
      const refs=volunteer.linkedIdentityRefs||(volunteer.linkedIdentityRefs=[]);
      if(!refs.some(r=>r.kind==='student'&&r.id===student.id)){
        refs.push({kind:'student',id:student.id});changed=true;
      }
      // LinkedPersonId is not overwritten: it can be a master-person ID.
    }
    return changed;
  }
  const p13OldStudentLink=p2LinkStudent;
  p2LinkStudent=function(student){
    const previous=student.volunteerId;
    const result=p13OldStudentLink.apply(this,arguments);
    // The old implementation linked by mobile alone; family contacts can
    // share mobiles. A nonmatching link must not pollute Student Progress.
    const selected=state.volunteers.find(v=>v.id===student.volunteerId);
    if(selected&&!p13StudentMatchesVolunteer(student,selected))
      student.volunteerId=previous&&state.volunteers.some(v=>
        v.id===previous&&p13StudentMatchesVolunteer(student,v))?previous:'';
    p13ReconcileStudentVolunteerLinks();
    return result;
  };
  const p13OldSave=save;
  save=function(){
    p13ReconcileStudentVolunteerLinks();
    return p13OldSave.apply(this,arguments);
  };
  // Link existing students during startup without re-writing attendance dates.
  if(p13ReconcileStudentVolunteerLinks())p13OldSave();

  // Strict, reusable phone registry. Family/group contact phones are attached
  // only to REGISTER UNDER, never to every family member automatically.
  function p13PhoneOwners(raw){
    const mobile=p13Number(raw);
    if(mobile.length!==10)return[];
    const found=[],keys=new Set();
    const add=(name,phone,kind,id)=>{
      if(!name||p13Number(phone)!==mobile)return;
      const k=kind+'|'+id;
      if(keys.has(k))return;keys.add(k);
      found.push({name:String(name).trim(),kind,id,mobile});
    };
    (state.students||[]).forEach(s=>add(s.name,s.mobile,'student',s.id));
    (state.volunteers||[]).forEach(v=>add(volName(v),v.mobile,'volunteer',v.id));
    (state.kriyabans||[]).forEach(k=>add(k.name,k.mobile,'kriyaban',k.id));
    (state.acharyas||[]).forEach(a=>add(a.name,a.mobile,'acharya',a.id));
    (state.attendeeMaster||[]).forEach(a=>{
      // An old "family" Master record may contain only a shared head phone.
      const personal=p13Number(a.personalMobile);
      const p=personal.length===10?personal:(a.category==='family'?'':a.mobile);
      add(a.name,p,'master',a.id);
    });
    (state.attendees||[]).forEach(a=>{
      const own=p13Number(a.personalMobile);
      const phone=own.length===10?own:
        (a.groupId||a.referenceVolunteerId||a.groupName?'':a.mobile);
      add(a.name,phone,'attendee',a.id);
    });
    (state.familyGroups||[]).forEach(g=>{
      if(g.contactName)add(g.contactName,g.mobile,'contact',g.id);
      (g.members||[]).forEach(m=>{
        const name=m.name||'';
        if(name&&!v12RelLabels.has(p13Name(name)))add(name,m.mobile,'family-member',m.id);
      });
    });
    (state.classEnrollments||[]).forEach(e=>{
      if(e.personName&&p13Number(e.personMobile).length===10)
        add(e.personName,e.personMobile,'class-enrolment',e.id);
    });
    (state.vips||[]).forEach(v=>add(v.name,v.mobile,'vip',v.id));
    return found;
  }
  function p13ExistingEvent(name,mobile,kind,editId=''){
    if(!['individual','family-member','family-contact'].includes(kind))return null;
    const n=p13Name(name),m=p13Number(mobile),event=state.activeEventId;
    if(!n||m.length!==10||!event)return null;
    if(kind==='family-contact'){
      return (state.familyGroups||[]).find(g=>g.eventId===event&&g.id!==editId&&
        p13Name(g.contactName)===n&&p13Number(g.mobile)===m)?{
          name,kind:'contact',id:0}:null;
    }
    for(const a of state.attendees||[]){
      const phone=p13Number(a.personalMobile)||
        (!a.groupId&&!a.referenceVolunteerId?p13Number(a.mobile):'');
      if(a.eventId===event&&a.id!==editId&&p13Name(a.name)===n&&phone===m)
        return {name:a.name,kind:'attendee',id:a.id};
    }
    for(const g of state.familyGroups||[]){
      if(g.eventId!==event)continue;
      const member=(g.members||[]).find(memb=>memb.id!==editId&&p13Name(memb.name)===n&&
        p13Number(memb.mobile)===m);
      if(member)return{name:member.name,kind:'family-member',id:member.id,groupId:g.id};
    }
    const vol=(state.volunteerRegistrations||[]).find(r=>r.eventId===event&&
      state.volunteers.some(v=>v.id===r.volunteerId&&p13Name(volName(v))===n&&
        p13Number(v.mobile)===m));
    if(vol)return {name,kind:'volunteer',id:vol.volunteerId};
    return null;
  }
  function p13PhoneDecision(name,raw,kind='',editId=''){
    const mobile=p13Number(raw),n=p13Name(name);
    if(mobile.length!==10)return{type:'empty',mobile,owners:[]};
    const owners=p13PhoneOwners(mobile).filter(o=>!(o.kind===kind&&o.id===editId));
    if(!n)return {type:owners.length?'choose-name':'empty',mobile,owners};
    const different=owners.find(o=>p13Name(o.name)!==n);
    if(different)return {type:'conflict',mobile,owners,who:different};
    const primaryRole={student:'student',volunteer:'volunteer',kriyaban:'kriyaban',
      'attendee-master':'master'}[kind];
    const sameRole=primaryRole?owners.find(o=>o.kind===primaryRole):null;
    if(sameRole)return{type:'duplicate-role',mobile,owners,who:sameRole};
    const eventRecord=p13ExistingEvent(name,mobile,kind,editId);
    if(eventRecord)return{type:'duplicate-event',mobile,owners,who:eventRecord};
    return{type:owners.length?'existing':'new',mobile,owners,
      who:owners.find(o=>p13Name(o.name)===n)||null};
  }
  function p13Message(status){
    if(status.type==='conflict')return 'MOBILE ALREADY REGISTERED TO '+status.who.name+'. VERIFY THE PERSON.';
    if(status.type==='duplicate-role')return 'THIS PERSON ALREADY EXISTS IN '+status.who.kind.toUpperCase().replace('-',' ')+' MASTER.';
    if(status.type==='duplicate-event')return 'ALREADY PRE-REGISTERED FOR THIS EVENT. OPEN THE EXISTING RECORD.';
    if(status.type==='choose-name')return 'MOBILE ALREADY EXISTS. ENTER THE NAME TO VERIFY THE PERSON.';
    if(status.type==='existing')return 'EXISTING PERSON FOUND. REUSE THE RECORD.';
    return '';
  }
  function p13Blocked(status){
    return ['conflict','duplicate-role','duplicate-event'].includes(status.type);
  }
  function p13ShowStatus(input,status){
    if(!input)return;
    const host=input.closest('.v12-field')||input.closest('.field')||input.parentElement;
    if(!host)return;
    let box=host.querySelector('.p13-identity-status');
    if(!box){box=document.createElement('div');box.className='p13-identity-status';host.append(box)}
    const msg=p13Message(status);
    box.textContent=msg;box.hidden=!msg;box.classList.toggle('p13-danger',p13Blocked(status));
  }
  function p13SetFormGuard(formId,nameId,mobileId,kind,editId=()=>'',getExtra=()=>({})){
    const form=$(formId),nameField=$(nameId),phoneField=$(mobileId);
    if(!form||!nameField||!phoneField)return;
    const status=()=>p13PhoneDecision(nameField.value,phoneField.value,kind,editId());
    const render=()=>p13ShowStatus(phoneField,status());
    nameField.addEventListener('input',render);
    phoneField.addEventListener('input',render);
    phoneField.addEventListener('change',render);
    form.addEventListener('submit',e=>{
      if(!p13ValidMobile(phoneField.value))return;
      const check=status();
      if(p13Blocked(check)){
        e.preventDefault();e.stopImmediatePropagation();
        render();toast(p13Message(check));return;
      }
      // Prevent stale UI warnings on successful changes, no data mutation.
    },true);
  }
  p13SetFormGuard('p2StudentForm','p2StudentName','p2StudentMobile','student',
    ()=>$('p2StudentId')?.value||'');
  p13SetFormGuard('kriyabanForm','kriyabanName','kriyabanMobile','kriyaban',
    ()=>$('kriyabanId')?.value||'');
  p13SetFormGuard('volunteerForm','volunteerFirstName','volunteerMobile','volunteer',
    ()=>$('volunteerId')?.value||'');
  // Volunteer name is split across two inputs. Use the combined name.
  const p13VolFirst=$('volunteerFirstName'),p13VolLast=$('volunteerLastName');
  if(p13VolFirst&&p13VolLast&&$('volunteerForm')){
    const checkVol=()=>p13PhoneDecision(
      [p13VolFirst.value,p13VolLast.value].filter(Boolean).join(' '),
      $('volunteerMobile').value,'volunteer',$('volunteerId').value);
    p13VolLast.addEventListener('input',()=>p13ShowStatus($('volunteerMobile'),checkVol()));
    p13VolFirst.addEventListener('input',()=>p13ShowStatus($('volunteerMobile'),checkVol()));
    $('volunteerForm').addEventListener('submit',e=>{
      if(!p13ValidMobile($('volunteerMobile').value))return;
      const state=checkVol();
      if(p13Blocked(state)){e.preventDefault();e.stopImmediatePropagation();
        p13ShowStatus($('volunteerMobile'),state);toast(p13Message(state))}
    },true);
  }
  p13SetFormGuard('attendeeMasterForm','attendeeMasterName','attendeeMasterPersonalMobile',
    'attendee-master',()=>$('attendeeMasterId')?.value||'');
  // For an outside attendee, Main/Family mobile is personal only when there
  // isn't a separate personal mobile. Shared Family numbers are never owners.
  const p13AttendeeMain=$('attendeeMasterMobile');
  if(p13AttendeeMain){
    const show=()=>{
      const own=p13Number($('attendeeMasterPersonalMobile').value);
      const shared=$('attendeeMasterCategory').value==='family';
      if(own.length===10||shared){p13ShowStatus(p13AttendeeMain,{type:'empty'});return}
      p13ShowStatus(p13AttendeeMain,p13PhoneDecision(
        $('attendeeMasterName').value,p13AttendeeMain.value,'attendee-master',
        $('attendeeMasterId').value));
    };
    ['input','change'].forEach(ev=>{
      p13AttendeeMain.addEventListener(ev,show);
      $('attendeeMasterCategory')?.addEventListener(ev,show);
    });
    $('attendeeMasterForm')?.addEventListener('submit',e=>{
      const own=p13Number($('attendeeMasterPersonalMobile').value);
      const shared=$('attendeeMasterCategory').value==='family';
      if(own.length===10||shared||!p13ValidMobile(p13AttendeeMain.value))return;
      const v=p13PhoneDecision($('attendeeMasterName').value,
        p13AttendeeMain.value,'attendee-master',$('attendeeMasterId').value);
      if(p13Blocked(v)){e.preventDefault();e.stopImmediatePropagation();show();toast(p13Message(v))}
    },true);
  }
  const p13OldV80DuplicateState=v80DuplicateState;
  v80DuplicateState=function(){
    const kind=$('v36RegistrationType')?.value||'individual';
    if(kind!=='individual'&&kind!=='friend')return p13OldV80DuplicateState.apply(this,arguments);
    const name=$('v36MainName').value,phone=$('v36MainMobile').value;
    const edit=v36RegistrationEditKey?.startsWith('attendee|')?
      v36RegistrationEditKey.split('|')[1]:'';
    const d=p13PhoneDecision(name,phone,'individual',edit);
    const matches=(d.owners||[]).map(o=>({name:o.name,kind:o.kind,source:o.kind,id:o.id}));
    return {matches,blocking:p13Blocked(d)?(matches.length?matches:[{name,kind:'event'}]):[],
      allowedVolunteer:false};
  };
  $('v36RegistrationForm')?.addEventListener('submit',e=>{
    if(/family/.test($('v36RegistrationType')?.value||''))return;
    const name=$('v36MainName').value,phone=$('v36MainMobile').value;
    const edit=v36RegistrationEditKey?.startsWith('attendee|')?
      v36RegistrationEditKey.split('|')[1]:'';
    const d=p13PhoneDecision(name,phone,'individual',edit);
    if(p13Blocked(d)){e.preventDefault();e.stopImmediatePropagation();
      toast(p13Message(d));v80RenderDuplicateState()}
  },true);

  // Family Submit buttons bypass the old form's onsubmit handler. The exact
  // same checker is called here and also renders live compact warnings.
  const p13OldFamilySave=v12Save;
  v12Save=function(checkSelected){
    const contact=p13PhoneDecision($('v12ContactName').value,$('v12ContactPhone').value,
      'family-contact',v12CurrentEdit.startsWith('family|')?v12CurrentEdit.split('|')[1]:'');
    if(p13Blocked(contact)){p13ShowStatus($('v12ContactPhone'),contact);toast(p13Message(contact));return}
    for(const row of document.querySelectorAll('#v12MemberRows .v12-member')){
      const name=row.querySelector('.v12-name')?.value.trim(),
        mobile=row.querySelector('.v12-mobile')?.value||'';
      if(!name||!p13ValidMobile(mobile))continue;
      const d=p13PhoneDecision(name,mobile,'family-member',row.dataset.id||'');
      if(p13Blocked(d)){p13ShowStatus(row.querySelector('.v12-mobile'),d);
        toast(p13Message(d));return}
    }
    return p13OldFamilySave.apply(this,arguments);
  };
  const p13ContactName=$('v12ContactName'),p13ContactMobile=$('v12ContactPhone');
  if(p13ContactName&&p13ContactMobile){
    const render=()=>p13ShowStatus(p13ContactMobile,p13PhoneDecision(
      p13ContactName.value,p13ContactMobile.value,'family-contact',
      v12CurrentEdit.startsWith('family|')?v12CurrentEdit.split('|')[1]:''));
    p13ContactName.addEventListener('input',render);
    p13ContactMobile.addEventListener('input',render);
    $('v12Matches')?.addEventListener('click',()=>setTimeout(render,0));
  }
  $('v12MemberRows')?.addEventListener('input',e=>{
    const row=e.target.closest('.v12-member');if(!row)return;
    const phone=row.querySelector('.v12-mobile');
    if(!p13ValidMobile(phone.value)){p13ShowStatus(phone,{type:'empty'});return}
    const name=row.querySelector('.v12-name')?.value||'';
    p13ShowStatus(phone,p13PhoneDecision(name,phone.value,'family-member',row.dataset.id||''));
  });

  // Existing person -> volunteer assignment uses the SAME collision check.
  // A student taking a volunteer role does not create a second person.
  const p13OldRegisterVolunteer=v11RegisterExistingVolunteer;
  v11RegisterExistingVolunteer=function(person){
    const d=p13PhoneDecision(person.name,person.mobile,'volunteer-assignment');
    if(d.type==='conflict'){toast(p13Message(d));return false}
    const ok=p13OldRegisterVolunteer.apply(this,arguments);
    if(ok&&p13ReconcileStudentVolunteerLinks())p13OldSave();
    return ok;
  };
  document.head.insertAdjacentHTML('beforeend','<style id="p13-phone-alerts">'+
    '.p13-identity-status{margin-top:6px;font-size:11px;line-height:1.3;color:#556b84;font-weight:650}'+
    '.p13-identity-status[hidden]{display:none!important}'+
    '.p13-identity-status.p13-danger{color:#b12e25}'+
    '#v12MemberRows .v12-member:has(.p13-identity-status:not([hidden])){row-gap:6px}'+
    '</style>');
