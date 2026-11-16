
  // PATCH 14 — correct edit/add/save for the specific existing family card
  // on ATTENDEES, without changing the frozen registration form or sidebar.
  window.anandaExistingFamilyPatchVersion='14';
  const v14Editing=new Map(),v14Adding=new Set();

  function v14ActualMembers(group){
    const members=group.members||[];
    // Before Patch12 an outside family stored REGISTER UNDER as members[0].
    // Patch12 contact-only groups do not; all members are true attendees.
    const firstIndex=group.type==='outside-family'&&
      group.registrationLayout!=='v12-contact-only'?1:0;
    return members.slice(firstIndex);
  }
  function v14ContactName(group){
    const volunteer=(state.volunteers||[]).find(v=>v.id===group.volunteerId);
    return group.contactName||(volunteer?volName(volunteer):'FAMILY / GROUP');
  }
  function v14Notice(row,message){
    let hint=row.querySelector('.v14-error');
    if(!hint){hint=document.createElement('div');hint.className='v14-error';row.append(hint)}
    hint.textContent=message;hint.hidden=!message;
    if(message)toast(message);
  }
  function v14ValidateMember(group,old,name,relationship,mobile){
    const number=normMobile(mobile),n=normName(name),rel=normName(relationship);
    if(!n&&!rel)return 'Enter a name or relationship.';
    if(name&&v12RelLabels.has(n))
      return 'Use Relationship for MOM, DAD, etc. Enter a real name or leave Name empty.';
    if(mobile&&number.length!==10)return 'Personal mobile must contain 10 digits.';
    if(old&&normName(old.name||'')===n&&normMobile(old.mobile||'')===number)return '';
    // A different mobile number is a different identity even if names match.
    const sameGroup=(group.members||[]).find(m=>m.id!==old?.id&&
      ((number&&normMobile(m.mobile)===number)||
        (n&&normName(m.name||'')===n&&(!number&&!normMobile(m.mobile||'')))));
    if(sameGroup)
      return number?'That personal mobile is already used by another member of this family.':
        'A member with this name already exists. Enter their personal mobile to distinguish them.';
    if(number&&n){
      // Editing a verified existing member may correct a spelling mistake.
      // Ignore only the member's own old name and linked Master identity.
      const ownRename=!!old&&normMobile(old.mobile||'')===number&&
        normName(old.name||'')!==n;
      const owners=p13PhoneOwners(number);
      const unrelated=owners.filter(o=>{
        if(o.kind==='family-member'&&o.id===old?.id)return false;
        if(o.kind==='master'&&o.id===old?.masterId)return false;
        if(ownRename&&normName(o.name)===normName(old.name||''))return false;
        return normName(o.name)!==n;
      });
      if(unrelated.length)return 'Mobile belongs to '+unrelated[0].name+'. Confirm the person.';
      if(!ownRename){
        const status=p13PhoneDecision(name,number,'family-member',old?.id||'');
        if(['conflict','duplicate-event','duplicate-role'].includes(status.type))
          return p13Message(status);
      }
    }
    if(number&&!n)return 'Enter the real name when adding a personal mobile.';
    return '';
  }
  function v14ConnectMaster(group,member,oldName,oldMobile){
    const name=String(member.name||'').trim(),mobile=normMobile(member.mobile||'');
    if(!name||mobile.length!==10)return;
    const current=(state.attendeeMaster||[]).find(p=>p.id===member.masterId);
    if(current&&normMobile(oldMobile)===mobile&&
       normName(current.name)===normName(oldName)&&
       normMobile(current.personalMobile||current.mobile)===mobile){
      current.name=name;
      if(member.relationship)current.relationship=member.relationship;
      return;
    }
    if(current&&normName(current.name)===normName(name)&&
       normMobile(current.personalMobile||current.mobile)===mobile)return;
    // Don't rename a historical Master record when the member identity
    // has changed. Reuse a verified exact match or create a new projection.
    let exact=(state.attendeeMaster||[]).find(p=>normName(p.name)===normName(name)&&
      normMobile(p.personalMobile||p.mobile)===mobile);
    if(!exact){
      exact={id:uid('person'),name,mobile,personalMobile:mobile,
        category:group.type==='volunteer-family'?'family':'outside',
        linkedVolunteerId:group.volunteerId||null,permanentExplicit:true,
        createdAt:new Date().toISOString(),notes:'',city:''};
      state.attendeeMaster.push(exact);
    }
    member.masterId=exact.id;
    if(member.relationship)exact.relationship=member.relationship;
  }
  function v14SaveFromEditor(groupId,memberId,isNew,row){
    const group=(state.familyGroups||[]).find(g=>g.id===groupId&&g.eventId===state.activeEventId);
    if(!group)return;
    const name=row.querySelector('.v14-name')?.value.trim()||'';
    const relationship=row.querySelector('.v14-relationship')?.value.trim()||'';
    const raw=row.querySelector('.v14-mobile')?.value.trim()||'';
    const mobile=normMobile(raw);
    const old=isNew?null:(group.members||[]).find(m=>m.id===memberId);
    if(!isNew&&!old){v14Notice(row,'Member record not found; reload the family.');return}
    const error=v14ValidateMember(group,old,name,relationship,raw);
    if(error){v14Notice(row,error);return}
    const originalName=old?.name||'',originalMobile=old?.mobile||'';
    let member;
    if(isNew){
      if((group.members||[]).length>=40){v14Notice(row,'Maximum 40 family members.');return}
      member={id:uid('fam'),relationship,name,mobile,checkins:[]};
      group.members=group.members||[];
      group.members.push(member);
    }else{
      member=old;
      member.name=name;member.relationship=relationship;member.mobile=mobile;
      // Preserve original member ID, checkins, source, allocation and history.
    }
    v14ConnectMaster(group,member,originalName,originalMobile);
    if(group.registrationLayout==='v12-contact-only')
      group.expectedGuests=group.members.length;
    else
      group.expectedGuests=Math.max(Number(group.expectedGuests)||0,group.members.length);
    v14Editing.delete(groupId);v14Adding.delete(groupId);
    save();
    v56RenderGroupPlanning();
    toast((member.name||member.relationship)+' '+(isNew?'added to ':'saved under ')+v14ContactName(group));
  }
  function v14DeleteMember(groupId,memberId){
    const group=(state.familyGroups||[]).find(g=>g.id===groupId);
    const member=(group?.members||[]).find(m=>m.id===memberId);
    if(!group||!member)return;
    if((member.checkins||[]).length){
      toast('Undo this member’s check-in before removing the registration.');
      return;
    }
    const allocations=Object.entries(state.allocations||{}).filter(([key,value])=>
      key.endsWith('|attendee|'+member.id)&&value&&Object.values(value).some(Boolean));
    if(allocations.length){
      toast('This member has badge/scarf history and cannot be deleted here.');
      return;
    }
    if(!confirm('Remove '+(member.name||member.relationship||'this member')+
      ' from '+v14ContactName(group)+'?'))return;
    group.members=group.members.filter(m=>m.id!==memberId);
    if(group.registrationLayout==='v12-contact-only')
      group.expectedGuests=group.members.length;
    else group.expectedGuests=Math.max(1,group.members.length);
    // Keep Master and historical references intact, never silently delete them.
    v14Editing.delete(groupId);v14Adding.delete(groupId);
    save();v56RenderGroupPlanning();
    toast('Member removed from this family registration');
  }
  function v14CheckMember(groupId,memberId){
    const group=(state.familyGroups||[]).find(g=>g.id===groupId);
    const member=(group?.members||[]).find(m=>m.id===memberId);
    if(!group||!member)return;
    const row=v36AllAttendeeRows().find(r=>r.kind==='family'&&
      r.groupId===groupId&&r.id===memberId);
    if(!row){toast('Family member not found');return}
    v36SetAttendeeCheckin(row,!(member.checkins||[]).includes($('workingDate').value));
    v56RenderGroupPlanning();
  }
  function v14Editor(group,member,isNew){
    const el=document.createElement('div');
    el.className='v14-member-line v14-editing';
    el.dataset.member=member?.id||'new';
    const fields=document.createElement('div');fields.className='v14-member-fields';
    const field=(text,cls,value,placeholder)=>{
      const label=document.createElement('label');
      label.textContent=text;const input=document.createElement('input');
      input.className=cls;input.value=value||'';input.placeholder=placeholder;
      label.append(input);fields.append(label);return input;
    };
    const name=field('NAME','v14-name',member?.name,'Full name (optional)');
    const relationship=field('RELATIONSHIP','v14-relationship',member?.relationship,'Mom, Dad, Son...');
    const mobile=field('PERSONAL MOBILE','v14-mobile',member?.mobile,'Optional');
    mobile.inputMode='numeric';mobile.maxLength=10;
    mobile.oninput=()=>{mobile.value=normMobile(mobile.value).slice(0,10)};
    const actions=document.createElement('div');actions.className='v14-member-buttons';
    const saveBtn=document.createElement('button');saveBtn.type='button';
    saveBtn.className='btn small';saveBtn.textContent='SAVE';
    saveBtn.onclick=()=>v14SaveFromEditor(group.id,member?.id||'',isNew,el);
    const cancel=document.createElement('button');cancel.type='button';
    cancel.className='btn ghost small';cancel.textContent='CANCEL';
    cancel.onclick=()=>{
      v14Editing.delete(group.id);v14Adding.delete(group.id);
      v56RenderGroupPlanning();
    };
    actions.append(saveBtn,cancel);el.append(fields,actions);
    el.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();cancel.click()}
      if(e.key==='Enter'){e.preventDefault();saveBtn.click()}
    });
    return el;
  }
  function v14ReadOnlyRow(group,member){
    const el=document.createElement('div');el.className='v14-member-line';
    el.dataset.member=member.id;
    const copy=document.createElement('div');copy.className='v14-member-info';
    const title=document.createElement('strong');
    title.textContent=member.name||member.relationship||'FAMILY MEMBER';
    const detail=document.createElement('small');
    detail.textContent=[member.name?member.relationship:'',member.mobile||''].filter(Boolean).join(' · ')||
      'Personal mobile not recorded';
    copy.append(title,detail);
    const actions=document.createElement('div');actions.className='v14-member-buttons';
    const edit=document.createElement('button');edit.type='button';edit.className='btn ghost small';
    edit.textContent='EDIT';
    edit.onclick=()=>{
      v14Adding.delete(group.id);v14Editing.set(group.id,member.id);
      v56RenderGroupPlanning();
      const input=[...document.querySelectorAll('.v14-editing')].find(r=>
        r.dataset.member===member.id)?.querySelector('.v14-name');
      input?.focus();
    };
    const remove=document.createElement('button');remove.type='button';
    remove.className='btn ghost small';remove.textContent='DELETE';
    remove.onclick=()=>v14DeleteMember(group.id,member.id);
    const arrived=(member.checkins||[]).includes($('workingDate').value);
    const check=document.createElement('button');check.type='button';
    check.className=arrived?'btn secondary small':'btn small';
    check.textContent=arrived?'UNDO':'CHECK IN';
    check.onclick=()=>v14CheckMember(group.id,member.id);
    actions.append(edit,remove,check);el.append(copy,actions);
    return el;
  }
  function v14ReplaceGroupDetails(){
    const box=$('v56GroupPlanning');
    if(!box)return;
    for(const wrapper of box.querySelectorAll('.v88-card-wrap')){
      const header=wrapper.querySelector('.v88-group-row');
      const group=state.familyGroups.find(g=>g.id===header?.dataset.id);
      if(!header||!group||group.eventId!==state.activeEventId)continue;
      const isLegacyHead=group.type==='outside-family'&&
        group.registrationLayout!=='v12-contact-only';
      const members=v14ActualMembers(group);
      const expected=group.registrationLayout==='v12-contact-only'?
        members.length:Math.max(Number(group.expectedGuests)||0,group.members?.length||0,1);
      const arrived=(group.members||[]).filter(m=>
        (m.checkins||[]).includes($('workingDate').value)).length;
      const extra=group.type==='volunteer-family'?members.length:
        isLegacyHead?Math.max(0,(group.members||[]).length-1):members.length;
      const heading=header.querySelector('.v56-group-name');
      if(heading)heading.textContent=v14ContactName(group)+' +'+extra;
      const counts=header.querySelectorAll('.v56-count strong');
      if(counts[0])counts[0].textContent=String(expected);
      if(counts[1])counts[1].textContent=String(arrived);
      if(counts[2])counts[2].textContent=String(Math.max(0,expected-arrived));
      const info=header.querySelector('.v56-group-mobile');
      if(info)info.textContent=(group.mobile||'')+' · '+members.length+
        ' MEMBER'+(members.length===1?'':'S');
      const add=header.querySelector('.v88-edit-group');
      if(add){
        add.textContent='+ ADD MEMBER';
        add.onclick=e=>{
          e.preventDefault();e.stopPropagation();
          if(!header.classList.contains('v88-open'))header.click();
          v14Editing.delete(group.id);v14Adding.add(group.id);
          v56RenderGroupPlanning();
          const fresh=[...box.querySelectorAll('.v88-card-wrap')]
            .find(w=>w.querySelector('.v88-group-row')?.dataset.id===group.id);
          fresh?.querySelector('.v14-add-new .v14-name')?.focus();
        };
      }
      const old=wrapper.querySelector('.v88-group-details');
      if(!old)continue;
      old.replaceChildren();
      const head=document.createElement('div');head.className='v14-head';
      const title=document.createElement('strong');title.textContent=v14ContactName(group)+' · MEMBERS';
      const label=document.createElement('span');
      label.textContent=members.length+' REGISTERED';
      head.append(title,label);old.append(head);
      for(const member of members){
        if(v14Editing.get(group.id)===member.id)old.append(v14Editor(group,member,false));
        else old.append(v14ReadOnlyRow(group,member));
      }
      if(v14Adding.has(group.id)){
        const inline=v14Editor(group,null,true);inline.classList.add('v14-add-new');
        old.append(inline);
      }
      if(!members.length&&!v14Adding.has(group.id)){
        const empty=document.createElement('p');empty.className='v14-empty';
        empty.textContent='No members added to this registration.';
        old.append(empty);
      }
    }
  }
  const v14GroupRenderOriginal=v56RenderGroupPlanning;
  v56RenderGroupPlanning=function(){
    const result=v14GroupRenderOriginal.apply(this,arguments);
    v14ReplaceGroupDetails();
    return result;
  };
  document.head.insertAdjacentHTML('beforeend','<style id="v14-family-member-style">'+
    '#v56GroupPlanning .v14-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 11px;border-bottom:1px solid #e4e9f1;color:#092c61;font-size:12px}'+
    '#v56GroupPlanning .v14-head span{font-size:11px;font-weight:650;color:#647a92}'+
    '#v56GroupPlanning .v14-member-line{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 14px;border-top:1px solid #e6edf4;background:#fff}'+
    '#v56GroupPlanning .v14-member-info strong,#v56GroupPlanning .v14-member-info small{display:block}'+
    '#v56GroupPlanning .v14-member-info strong{font-size:13px;color:#11366c}'+
    '#v56GroupPlanning .v14-member-info small{font-size:11px;color:#657994;margin-top:4px}'+
    '#v56GroupPlanning .v14-member-buttons{display:flex;flex-wrap:wrap;gap:7px;align-items:center;justify-content:flex-end}'+
    '#v56GroupPlanning .v14-editing{align-items:flex-end;flex-wrap:wrap;background:#f7faff}'+
    '#v56GroupPlanning .v14-member-fields{flex:1;display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px;min-width:300px}'+
    '#v56GroupPlanning .v14-member-fields label{color:#3b5576;font-size:10px;font-weight:750}'+
    '#v56GroupPlanning .v14-member-fields input{width:100%;box-sizing:border-box;margin-top:6px;min-height:38px;padding:7px 10px;border:1px solid #c8d7e8;border-radius:7px;color:#0b346c;font-size:12px;background:#fff}'+
    '#v56GroupPlanning .v14-error{color:#b03026;font-size:11px;flex-basis:100%;padding:4px 6px}'+
    '#v56GroupPlanning .v14-error[hidden]{display:none!important}'+
    '#v56GroupPlanning .v14-empty{padding:13px 15px;color:#66788f;font-size:12px}'+
    '#v56GroupPlanning .v14-add-new{border-left:3px solid #e5b800}'+
    '@media(max-width:900px){#v56GroupPlanning .v14-member-line{align-items:flex-start;flex-direction:column}'+
    '#v56GroupPlanning .v14-member-fields{min-width:0;width:100%;grid-template-columns:1fr}'+
    '#v56GroupPlanning .v14-member-buttons{width:100%;justify-content:flex-end}}'+
    '</style>');
