
  // PATCH 10 — only three user-approved event surfaces. This runs inside the
  // existing app IIFE after Patch 9; sidebar, Classes and persistent schema
  // remain unchanged. Reuse original family/group registration records.
  window.anandaThreeScreensPatchVersion='10';
  let v10SelectedHead=null,v10Checks=new Map(),v10Expanded=false;
  let v10FamilyDialogGroupId='';

  function v10Change(node){if(node)node.dispatchEvent(new Event('change',{bubbles:true}))}
  function v10Input(node){if(node)node.dispatchEvent(new Event('input',{bubbles:true}))}
  function v10HeadEntries(query){
    const q=normName(query||'');if(q.length<3)return[];
    const found=[],used=new Set();
    const add=(name,mobile,kind,id)=>{
      const m=normMobile(mobile||'');
      if(!name||m.length!==10||!normName(name).includes(q))return;
      const key=normName(name)+'|'+m;
      if(used.has(key))return;used.add(key);found.push({name,mobile:m,kind,id});
    };
    (state.volunteers||[]).forEach(x=>add(volName(x),x.mobile,'volunteer',x.id));
    (state.attendeeMaster||[]).forEach(x=>{if(x.category==='family'&&!normMobile(x.personalMobile))return;add(x.name,x.personalMobile||x.mobile,'master',x.id)});
    (state.kriyabans||[]).forEach(x=>add(x.name,x.mobile,'kriyaban',x.id));
    return found.sort((a,b)=>a.name.localeCompare(b.name)).slice(0,10);
  }
  function v10HeadSuggestion(){
    const host=$('v10HeadSuggestions');
    if(!host||!$('v36RegistrationModal')?.classList.contains('open')||
       !$('v36RegistrationForm')?.classList.contains('v10-family'))return;
    const raw=$('v36MainName').value.trim(),entries=v10HeadEntries(raw);
    host.innerHTML='';
    if(raw.length<3||v10SelectedHead&&normName(v10SelectedHead.name)===normName(raw))return;
    entries.forEach(person=>{
      const button=document.createElement('button');button.type='button';button.className='v10-head-match';
      button.textContent=person.name+' · '+person.mobile;
      button.onclick=()=>{
        v10SelectedHead=person;
        $('v36MainName').value=person.name;
        $('v36MainMobile').value=person.mobile;
        if(person.kind==='volunteer'){
          $('v36RegistrationType').value='volunteer-family';
          $('v36RegistrationVolunteer').value=person.id;
          if($('v40VolunteerLookup'))$('v40VolunteerLookup').value=person.name;
          v36UpdateRegistrationFields(true);
        }else{
          $('v36RegistrationType').value='outside-family';
          v36UpdateRegistrationFields(true);
        }
        v10Input($('v36MainName'));v10Input($('v36MainMobile'));
        v10SelectedHead=person;host.innerHTML='';
        v5817RegistrationStatus();v10PaintRegistration();
      };
      host.append(button);
    });
  }
  function v10MemberState(){
    document.querySelectorAll('#v36FamilyMembers .v36-member-row').forEach(row=>{
      const c=row.querySelector('.v10-member-check');
      if(c)v10Checks.set(row.dataset.id,c.checked);
    });
  }
  function v10PaintRegistration(){
    const form=$('v36RegistrationForm');if(!form)return;
    let segment=$('v10RegistrationMode');
    if(!segment){
      segment=document.createElement('div');segment.id='v10RegistrationMode';segment.setAttribute('role','group');
      segment.setAttribute('aria-label','Registration type');
      segment.innerHTML='<button type="button" data-v10-mode="individual">INDIVIDUAL</button>'+
                        '<button type="button" data-v10-mode="family">FAMILY</button>';
      $('v36MainRegistrationFields').before(segment);
      segment.querySelectorAll('button').forEach(b=>b.onclick=()=>v10SetMode(b.dataset.v10Mode));
      const suggestions=document.createElement('div');suggestions.id='v10HeadSuggestions';
      $('v36MainRegistrationFields').after(suggestions);
      $('v36MainName').addEventListener('input',()=>{v10SelectedHead=null;v10HeadSuggestion()});
      $('v36MainMobile').addEventListener('input',()=>{if(v10SelectedHead&&normMobile($('v36MainMobile').value)!==v10SelectedHead.mobile)v10SelectedHead=null});
      // Legacy registration code sometimes redraws family rows after a match.
      // Restore only the new selection controls without altering any data.
      const familyHost=$('v36FamilyMembers');
      new MutationObserver(()=>{if($('v36RegistrationModal').classList.contains('open')&&
        /family/.test($('v36RegistrationType').value))v10PaintRegistration()})
        .observe(familyHost,{childList:true});
    }
    const family=/family/.test($('v36RegistrationType').value);
    form.classList.toggle('v10-family',family);
    segment.querySelectorAll('button').forEach(b=>{
      const active=b.dataset.v10Mode===(family?'family':'individual');
      b.classList.toggle('active',active);
      b.setAttribute('aria-pressed',String(active));
    });
    $('v36RegistrationTitle').textContent=v36RegistrationEditKey?'EDIT REGISTRATION':'NEW REGISTRATION';
    $('v36MainNameLabel').textContent=family?'FAMILY HEAD NAME *':'ATTENDEE NAME *';
    $('v36MainMobileLabel').textContent='MOBILE NUMBER *';
    $('v36MainRegistrationFields').classList.toggle('v10-show-head',family);
    $('v39AddFamilyMember').textContent='+ ADD MEMBER';
    const familyHead=$('v36FamilyMemberSection');
    let headRow=$('v10FamilyHeadRow');
    if(!headRow){
      headRow=document.createElement('div');headRow.id='v10FamilyHeadRow';
      headRow.innerHTML='<div><strong id="v10HeadName">FAMILY HEAD</strong><small>Head of this family</small></div>'+
        '<label><input id="v10HeadCheck" type="checkbox" checked> CHECK-IN</label>';
      $('v36FamilyMembers').before(headRow);
    }
    if(family){
      $('v10HeadName').textContent=$('v36MainName').value.trim()||'FAMILY HEAD';
      let known=new Map(v10Checks);
      document.querySelectorAll('#v36FamilyMembers .v36-member-row').forEach(row=>{
        if(!row.querySelector('.v10-member-check')){
          const label=document.createElement('label');label.className='v10-row-check';
          const ch=document.createElement('input');ch.type='checkbox';ch.className='v10-member-check';
          ch.checked=known.has(row.dataset.id)?known.get(row.dataset.id):true;
          ch.onchange=()=>v10Checks.set(row.dataset.id,ch.checked);
          label.append(ch,document.createTextNode(' CHECK-IN'));row.append(label);
        }
        row.querySelector('.v36-member-mobile').placeholder='Mobile (optional)';
        row.querySelector('.v36-member-name').placeholder='Real name (optional)';
      });
    }
    if(!family){$('v10HeadSuggestions').innerHTML='';v10SelectedHead=null}
    const notice=$('v10FamilyMasterNote');
    if(!notice){
      const label=document.createElement('p');label.id='v10FamilyMasterNote';
      label.textContent='Relationship labels stay with this family. Only a real name with a personal mobile can create a new Master person.';
      familyHead.append(label);
    }
  }
  function v10SetMode(mode){
    v10MemberState();
    const family=mode==='family',old=$('v36RegistrationType').value;
    $('v48GroupMode').value=family?'family':'individual';
    v10Change($('v48GroupMode'));
    $('v36RegistrationType').value=family?
      (v10SelectedHead?.kind==='volunteer'?'volunteer-family':'outside-family'):'individual';
    if(family&&!/family/.test(old)&&Number($('v36FamilyCount').value)<2)
      $('v36FamilyCount').value='2';
    v10Change($('v36RegistrationType'));
    v36UpdateRegistrationFields(true);
    v10PaintRegistration();
  }
  const v10OpenOriginal=v36OpenRegistration;
  v36OpenRegistration=function(editKey=''){
    v10SelectedHead=null;v10Checks=new Map();
    const result=v10OpenOriginal.apply(this,arguments);
    v10PaintRegistration();
    return result;
  };
  const v10AddOld=$('v39AddFamilyMember').onclick;
  $('v39AddFamilyMember').onclick=function(event){
    v10MemberState();
    const r=v10AddOld?.call(this,event);
    setTimeout(v10PaintRegistration,0);
    return r;
  };

  const v10RelationOnly=new Set(['mom','dad','mother','father','wife','husband',
    'son','daughter','brother','sister','grandmother','grandfather','aunt','uncle',
    'other family member']);
  const v10SubmitOld=$('v36RegistrationForm').onsubmit;
  $('v36RegistrationForm').onsubmit=function(event){
    const type=$('v36RegistrationType').value;
    if(!/family/.test(type))return v10SubmitOld.call(this,event);
    const submitter=event.submitter;
    if(!submitter)return v10SubmitOld.call(this,event);
    const realName=$('v36MainName').value.trim(),mobile=normMobile($('v36MainMobile').value);
    if(!realName||mobile.length!==10){
      event.preventDefault();toast('Select or enter a family head and a valid mobile number');return;
    }
    if(v10RelationOnly.has(normName(realName))){
      event.preventDefault();toast('Enter the real name of the family head, not a relationship label');return;
    }
    const date=$('workingDate').value,oldIds=new Set(state.familyGroups.map(g=>g.id)),
          oldMasterIds=new Set(state.attendeeMaster.map(p=>p.id)),
          editKey=v36RegistrationEditKey||'';
    const selectedHead=!!$('v10HeadCheck')?.checked,rows=Array.from(document.querySelectorAll('#v36FamilyMembers .v36-member-row')).map(row=>({
      id:row.dataset.id,masterId:row.dataset.masterId||'',
      relationship:row.querySelector('.v36-rel').value.trim(),
      name:row.querySelector('.v36-member-name').value.trim(),
      mobile:normMobile(row.querySelector('.v36-member-mobile').value),
      checkins:JSON.parse(row.dataset.checkins||'[]'),
      selected:!!row.querySelector('.v10-member-check')?.checked
    }));
    for(const r of rows){
      if(r.name&&v10RelationOnly.has(normName(r.name))){
        event.preventDefault();toast('Put '+r.name+' in RELATIONSHIP, not NAME');return;
      }
      if(r.mobile&&r.mobile.length!==10){
        event.preventDefault();toast('Personal mobile numbers must contain 10 digits');return;
      }
    }
    if(v10SelectedHead?.kind==='volunteer'){
      $('v36RegistrationType').value='volunteer-family';
      $('v36RegistrationVolunteer').value=v10SelectedHead.id;
    }
    const originalMode=submitter.dataset.mode,checking=originalMode==='checkin';
    const originalCount=$('v36FamilyCount').value;
    // The old V84 submit wrapper subtracts one from outside-family totals;
    // compensate here to preserve every actual member row, with no off-by-one.
    $('v36FamilyCount').value=String(rows.length+(type==='outside-family'?2:0));
    // The legacy handler checks every family member in. Register first, then
    // apply only explicitly selected individuals. Never wipe past check-ins.
    if(checking)submitter.dataset.mode='register';
    let result;
    try{result=v10SubmitOld.call(this,event)}
    finally{submitter.dataset.mode=originalMode;
      if($('v36RegistrationModal').classList.contains('open'))$('v36FamilyCount').value=originalCount;}
    if($('v36RegistrationModal').classList.contains('open'))return result;
    const group=editKey.startsWith('family|')?
      state.familyGroups.find(g=>g.id===editKey.split('|')[1]):
      state.familyGroups.find(g=>g.eventId===state.activeEventId&&!oldIds.has(g.id));
    if(!group)return result;
    const isVolunteer=group.type==='volunteer-family';
    // Repair legacy family-count off-by-one without changing the database format.
    const currentById=new Map(group.members.map(m=>[m.id,m]));
    const head=isVolunteer?null:group.members[0];
    if(head){
      head.name=realName;head.mobile=mobile;
      head.relationship=head.relationship||'Head';
    }
    const full=rows.map(r=>{
      const prior=currentById.get(r.id);
      return {...(prior||{}),...r,checkins:[...new Set(prior?.checkins||r.checkins||[])]};
    });
    group.members=isVolunteer?full:[head,...full];
    group.contactName=isVolunteer?'':realName;
    group.mobile=isVolunteer?normMobile(state.volunteers.find(v=>v.id===group.volunteerId)?.mobile):mobile;
    for(const [idx,member] of group.members.entries()){
      if(!member)continue;
      const isHead=!isVolunteer&&idx===0;
      const hasPersonalPhone=normMobile(member.mobile||'').length===10;
      if(!isHead&&!hasPersonalPhone){
        if(member.masterId&&!oldMasterIds.has(member.masterId)){
          state.attendeeMaster=state.attendeeMaster.filter(p=>p.id!==member.masterId);
        }
        member.masterId='';
      }else if(!isHead&&member.name&&hasPersonalPhone&&!member.masterId){
        const master=v36EnsureMaster(member.name,member.mobile,member.mobile,
          isVolunteer?'family':'outside',isVolunteer?group.volunteerId:null,'');
        if(master)member.masterId=master.id;
      }
      if(checking&&(isHead?selectedHead:rows[isVolunteer?idx:idx-1]?.selected))
        member.checkins=[...new Set([...(member.checkins||[]),date])];
      // selection=false never cancels an earlier legitimate arrival.
      delete member.selected;
    }
    if(checking&&isVolunteer&&selectedHead){
      const volunteer=state.volunteers.find(v=>v.id===group.volunteerId);
      if(volunteer&&v6RegisteredVolunteerIds(state.activeEventId).includes(volunteer.id))
        ensureVolunteerCheckin(volunteer,state.activeEventId,date,'counter');
    }
    save();
    v36RenderAttendees();
    if(!editKey){
      // Same NEW REGISTRATION heading, freshly blank for a completely new family.
      v36OpenRegistration();
      v10SetMode('family');
      toast('Family saved. Ready for another registration.');
    }
    return result;
  };

  function v10FamilyCheckinModal(){
    let m=$('v10FamilyCheckinModal');
    if(m)return m;
    m=document.createElement('div');m.id='v10FamilyCheckinModal';m.className='modal-backdrop';
    m.innerHTML='<div class="modal v10-family-modal"><div class="modal-head"><h3>FAMILY CHECK-IN</h3>'+
       '<button type="button" class="x" id="v10FamilyClose">×</button></div>'+
       '<label for="v10FamilySelect">SELECT REGISTERED FAMILY</label><select id="v10FamilySelect"></select>'+
       '<div id="v10FamilyPeople"></div>'+
       '<div class="actions"><button type="button" class="btn" id="v10CheckSelected">CHECK-IN SELECTED</button>'+
       '<button type="button" class="btn ghost" id="v10FamilyCancel">CANCEL</button></div></div>';
    document.body.append(m);
    $('v10FamilyClose').onclick=$('v10FamilyCancel').onclick=()=>m.classList.remove('open');
    $('v10FamilySelect').onchange=e=>{v10FamilyDialogGroupId=e.target.value;v10PaintFamilyCheckin()};
    $('v10CheckSelected').onclick=()=>{
      const group=state.familyGroups.find(g=>g.id===v10FamilyDialogGroupId&&g.eventId===state.activeEventId);
      if(!group)return;
      const date=$('workingDate').value;
      const selected=[...document.querySelectorAll('#v10FamilyPeople input[data-member]:checked')];
      selected.forEach(c=>{
        if(c.dataset.member==='volunteer-head'){
          const v=state.volunteers.find(v=>v.id===group.volunteerId);
          if(v&&v6RegisteredVolunteerIds(state.activeEventId).includes(v.id))
            ensureVolunteerCheckin(v,state.activeEventId,date,'counter');
        }else{
          const member=group.members.find(x=>x.id===c.dataset.member);
          if(member)member.checkins=[...new Set([...(member.checkins||[]),date])];
        }
      });
      save();v36RenderAttendees();m.classList.remove('open');
      toast(selected.length+' family member(s) checked in');
    };
    return m;
  }
  function v10PaintFamilyCheckin(){
    const group=state.familyGroups.find(g=>g.id===v10FamilyDialogGroupId&&g.eventId===state.activeEventId);
    const host=$('v10FamilyPeople');if(!host)return;
    if(!group){host.textContent='No family selected.';return}
    const day=$('workingDate').value,items=[];
    if(group.type==='volunteer-family'){
      const v=state.volunteers.find(x=>x.id===group.volunteerId);
      if(v){
        const registration=state.volunteerRegistrations.find(r=>r.eventId===state.activeEventId&&r.volunteerId===v.id);
        const checked=registration?.checkins?.includes(day);
        const assigned=v6RegisteredVolunteerIds(state.activeEventId).includes(v.id);
        items.push({id:'volunteer-head',name:volName(v),relationship:'HEAD',checked,disabled:!assigned});
      }
    }
    (group.members||[]).forEach(m=>items.push({
      id:m.id,name:m.name||m.relationship||'Family member',
      relationship:m.name?(m.relationship||'MEMBER'):'FAMILY ONLY',
      checked:(m.checkins||[]).includes(day),disabled:false
    }));
    host.innerHTML=items.map(m=>'<label class="v10-check-row">'+
      '<span><strong>'+esc(m.name)+'</strong><small>'+esc(m.relationship)+'</small></span>'+
      '<span>'+(m.checked?'✓ CHECKED IN':m.disabled?'CHECK IN ON VOLUNTEERS':
      '<input type="checkbox" data-member="'+esc(m.id)+'" aria-label="Check in '+esc(m.name)+'">')+'</span></label>').join('');
  }
  function v10OpenFamilyCheckin(){
    const families=(state.familyGroups||[]).filter(g=>g.eventId===state.activeEventId);
    if(!families.length){toast('No families registered for this event');return}
    const m=v10FamilyCheckinModal(),selector=$('v10FamilySelect');
    selector.innerHTML=families.map(g=>{
      const volunteer=state.volunteers.find(v=>v.id===g.volunteerId);
      const head=g.contactName||volunteer&&volName(volunteer)||'Family';
      return '<option value="'+esc(g.id)+'">'+esc(head)+' FAMILY</option>';
    }).join('');
    v10FamilyDialogGroupId=families[0].id;
    selector.value=v10FamilyDialogGroupId;v10PaintFamilyCheckin();
    m.classList.add('open');
  }
  function v10FamilyButton(){
    const start=$('v36NewRegistration');if(!start||$('v10FamilyCheckinButton'))return;
    const b=document.createElement('button');b.id='v10FamilyCheckinButton';b.type='button';
    b.className='btn secondary';b.textContent='FAMILY CHECK-IN';
    b.onclick=v10OpenFamilyCheckin;
    start.insertAdjacentElement('afterend',b);
  }
  const v10RenderAttendeesBase=v36RenderAttendees;
  v36RenderAttendees=function(){
    const result=v10RenderAttendeesBase.apply(this,arguments);
    v10FamilyButton();
    return result;
  };

  const v10BadgeOld=v6BadgePanel;
  v6BadgePanel=function(){
    const result=v10BadgeOld.apply(this,arguments);
    const root=$('v6BadgeRoot'),tools=root?.querySelector('.v6-badge-tools'),
          search=$('v6BadgeSearch'),actions=root?.querySelector('.v6-badge-actions');
    if(tools&&search&&actions)tools.insertBefore(search,actions);
    return result;
  };

  function v10EventRecordLayout(){
    const root=$('v36RecordUI');if(!root||!activeEvent())return;
    const stats=$('v36WholeEventStats'),days=$('v36RecordDays'),
          selected=root.querySelector('.v68-record-card');
    if(!stats||!days||!selected)return;
    const whole=stats.closest('.card'),dayCard=days.closest('.card');
    if(!whole||!dayCard)return;
    const head=whole.querySelector('.card-head'),actions=head?.querySelector('.actions');
    if(actions&&!$('v10ExportMenu')){
      const details=document.createElement('details');details.id='v10ExportMenu';
      const summary=document.createElement('summary');summary.textContent='⇩ EXPORT ▾';
      details.append(summary,actions);head.append(details);
      head.querySelector('h3')?.classList.add('hidden');
      head.querySelector('.card-sub')?.classList.add('hidden');
    }
    // Move original live DOM, not cloned markup, so all existing export handlers
    // and six clickable detailed metrics remain in place.
    if(whole.nextElementSibling!==dayCard)root.insertBefore(whole,dayCard);
    if(dayCard.nextElementSibling!==selected)dayCard.insertAdjacentElement('afterend',selected);
    const dayHead=dayCard.querySelector('.card-head');
    if(dayHead&&!$('v10SummaryToggle')){
      const toggle=document.createElement('button');toggle.id='v10SummaryToggle';toggle.type='button';
      toggle.setAttribute('aria-expanded','false');toggle.textContent='DAY-WISE SUMMARY   ▾';
      dayHead.prepend(toggle);
      dayHead.querySelector('h3')?.classList.add('hidden');
      dayHead.querySelector('.card-sub')?.classList.add('hidden');
      toggle.onclick=()=>{
        v10Expanded=!v10Expanded;v10EventRecordLayout();
      };
    }
    const toggle=$('v10SummaryToggle');
    if(toggle){toggle.setAttribute('aria-expanded',String(v10Expanded));
      toggle.textContent='DAY-WISE SUMMARY   '+(v10Expanded?'▴':'▾')}
    selected.hidden=!v10Expanded;
    dayCard.querySelectorAll('tbody tr').forEach((tr,i)=>{
      tr.tabIndex=0;tr.title='Open this day’s selected record';
      tr.onclick=()=>{
        const value=eventDates(activeEvent())[i];
        if(value&&$('workingDate').value!==value){
          $('workingDate').value=value;v10Change($('workingDate'));
        }
        v10Expanded=true;renderV36Record();
      };
      tr.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tr.click()}};
    });
    for(const [id,label] of [['v36RecordAttendees','ATTENDEE PARTICIPATION'],
                              ['v36RecordVolunteers','VOLUNTEER PARTICIPATION']]){
      const node=$(id),card=node?.closest('.card');if(!card)continue;
      let b=card.querySelector('.v10-part-toggle');
      if(!b){
        b=document.createElement('button');b.type='button';b.className='v10-part-toggle';
        b.textContent=label+'   ▾';b.setAttribute('aria-expanded','false');
        const cardHead=card.querySelector('.card-head');cardHead?.prepend(b);
        cardHead?.querySelector('h3')?.classList.add('hidden');
        cardHead?.querySelector('.card-sub')?.classList.add('hidden');
        b.onclick=()=>{
          const expanded=b.getAttribute('aria-expanded')==='true';
          b.setAttribute('aria-expanded',String(!expanded));
          b.textContent=label+'   '+(expanded?'▾':'▴');
          node.hidden=expanded;
        };
        node.hidden=true;
      }
    }
  }
  const v10RecordOld=renderV36Record;
  renderV36Record=function(){
    const result=v10RecordOld.apply(this,arguments);
    v10EventRecordLayout();
    return result;
  };
  function v10BindRecordTab(){
    const b=document.querySelector('#v6EventTabs [data-v6-tab="record"]');
    if(b&&!b.dataset.v10Record){
      b.dataset.v10Record='1';
      b.onclick=()=>switchPage('eventRecord');
    }
  }
  const v10SwitchOld=switchPage;
  switchPage=function(id){
    const r=v10SwitchOld.apply(this,arguments);
    v10BindRecordTab();
    if(id==='eventRecord')v10EventRecordLayout();
    if(id==='checkin'||id==='register')v10FamilyButton();
    return r;
  };
  v10BindRecordTab();v10FamilyButton();v10PaintRegistration();
  // CSS scoped to three approved event surfaces; never override the sidebar.
  document.head.insertAdjacentHTML('beforeend','<style id="v10-approved-event-css">'+
    '#v6BadgeRoot .v6-badge-counter{flex-direction:row!important;min-height:74px!important;gap:20px!important;border-radius:12px!important}'+
    '#v6BadgeRoot .v6-badge-counter strong{font-size:34px!important;line-height:1!important}'+
    '#v6BadgeRoot .v6-badge-counter span{font-size:14px!important;margin-top:0!important}'+
    '#v6BadgeRoot .v6-badge-counters{gap:15px!important;margin:4px 0 18px!important}'+
    '#v6BadgeRoot .v6-badge-tools{display:grid!important;grid-template-columns:auto minmax(170px,1fr) auto!important;gap:15px!important;margin-bottom:17px!important}'+
    '#v6BadgeRoot #v6BadgeSearch{margin:0!important;min-width:0!important;width:100%!important}'+
    '#v6BadgeRoot .v6-badge-filters{grid-template-columns:repeat(3,minmax(95px,1fr))!important}'+
    '#v6BadgeRoot .v6-badge-table td{padding:10px 22px!important}'+
    '#v36RegistrationModal .modal{max-width:890px!important;width:min(890px,96vw)!important;max-height:90vh!important;overflow-y:auto!important}'+
    '#v10RegistrationMode{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #b8cbe2;border-radius:30px;overflow:hidden;margin:10px 0 18px}'+
    '#v10RegistrationMode button{min-height:42px;background:#fff;border:0;color:#0a3268;font-weight:750}'+
    '#v10RegistrationMode button.active{background:#0a3268;color:white;border-radius:30px}'+
    '#v36RegistrationModal #v48GroupMode,#v36RegistrationModal .field:has(> #v48GroupMode){display:none!important}'+
    '#v36RegistrationModal .v10-family #v36MainRegistrationFields{display:grid!important}'+
    '#v36RegistrationModal .v10-family #v36FamilyMemberSection{display:block!important}'+
    '#v36RegistrationModal .v10-family #v36FamilyCountField{display:none!important}'+
    '#v36RegistrationModal #v36FamilyMemberSection:not(.hidden) .card-head{display:flex;justify-content:space-between;align-items:center}'+
    '#v36RegistrationModal #v39AddFamilyMember{border:1px solid #bdd0e6;color:#123d76;padding:9px 17px;border-radius:20px}'+
    '#v10HeadSuggestions{position:relative;z-index:20;background:white;border-radius:8px}'+
    '#v10HeadSuggestions .v10-head-match{display:block;width:100%;text-align:left;background:white;color:#0b356b;border:1px solid #dbe5ef;padding:10px;cursor:pointer}'+
    '#v10FamilyHeadRow{display:flex;justify-content:space-between;align-items:center;border:1px solid #d9e3ef;padding:12px 15px;border-radius:9px;margin:10px 0;background:#f4f8fd}'+
    '#v10FamilyHeadRow strong,#v10FamilyHeadRow small{display:block}'+
    '#v10FamilyHeadRow small{color:#64748b;margin-top:4px}'+
    '#v36FamilyMembers .v36-member-row{display:grid!important;grid-template-columns:minmax(125px,1fr) minmax(155px,1.3fr) minmax(135px,1fr) auto!important;align-items:end;gap:9px}'+
    '#v36FamilyMembers .v36-member-row .field{min-width:0}'+
    '#v36FamilyMembers .v36-member-row input{width:100%;min-width:0}'+
    '.v10-row-check,#v10FamilyHeadRow label{white-space:nowrap;font-weight:650;color:#123d76;display:flex;align-items:center;gap:5px;padding-bottom:9px}'+
    '.v10-row-check input,#v10FamilyHeadRow input{width:18px!important;height:18px!important;accent-color:#0a3268}'+
    '#v10FamilyMasterNote{font-size:11px;color:#63768d;margin:10px 0 0}'+
    '#v10FamilyCheckinButton{margin-left:8px;white-space:nowrap}'+
    '#v10FamilyCheckinModal .v10-family-modal{max-width:700px;max-height:85vh;overflow-y:auto}'+
    '#v10FamilySelect{display:block;width:100%;margin:8px 0 17px;min-height:40px;border:1px solid #ccd9e8;border-radius:8px}'+
    '.v10-check-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px;border-bottom:1px solid #e1e8f1}'+
    '.v10-check-row strong,.v10-check-row small{display:block}.v10-check-row small{color:#6e7f95;margin-top:4px}'+
    '#v36RecordUI #v36RecordHeader{display:none!important}'+
    '#v36RecordUI #v36WholeEventStats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}'+
    '#v36RecordUI #v36WholeEventStats span{display:flex;min-height:95px;align-items:center;justify-content:center;gap:18px;background:#eff5fd;border:1px solid #ceddf0;border-radius:12px;text-transform:uppercase;font-weight:750;font-size:12px;color:#123a72}'+
    '#v36RecordUI #v36WholeEventStats span b{font-size:34px;color:#0b326b}'+
    '#v36RecordUI #v36WholeEventStats span:nth-child(n+4){display:none!important}'+
    '#v36RecordUI #v10ExportMenu{margin-left:auto;position:relative}'+
    '#v36RecordUI #v10ExportMenu summary{list-style:none;cursor:pointer;padding:11px 18px;border:1px solid #cbd9e9;border-radius:12px;color:#0c3270;font-weight:750;font-size:13px}'+
    '#v36RecordUI #v10ExportMenu .actions{position:absolute;right:0;top:46px;z-index:7;display:flex;flex-direction:column;gap:5px;padding:12px;min-width:240px;background:#fff;border:1px solid #d3e1ee;border-radius:12px;box-shadow:0 8px 22px #20344b23}'+
    '#v36RecordUI #v10ExportMenu .actions .btn{width:100%;text-align:left}'+
    '#v36RecordUI #v10SummaryToggle,#v36RecordUI .v10-part-toggle{width:100%;text-align:left;border:0;background:transparent;color:#0a316a;font-size:16px;font-weight:800;padding:6px 0;cursor:pointer}'+
    '#v36RecordUI .v68-record-card[hidden],#v36RecordUI #v36RecordAttendees[hidden],#v36RecordUI #v36RecordVolunteers[hidden]{display:none!important}'+
    '#v36RecordUI #v36RecordDays tbody tr{cursor:pointer}'+
    '#v36RecordUI #v36RecordDays tbody tr:hover{background:#f1f6fd}'+
    '#v36RecordUI .v68-record-card{margin:12px 0 20px!important}'+
    '@media(max-width:1080px){#v6BadgeRoot .v6-badge-tools{grid-template-columns:1fr!important}#v36FamilyMembers .v36-member-row{grid-template-columns:1fr 1fr!important}}'+
    '</style>');
