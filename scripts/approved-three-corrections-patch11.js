
  // PATCH 11 — restore v89 family interaction INSIDE the existing Family mode,
  // and use the existing Volunteers screen search instead of a second popup.
  // Retain all prior patch9/10 UI and event data. Do not change frozen sidebar.
  window.anandaEventCorrectionsPatchVersion='11';

  // One underlying family member can have an old standalone attendee
  // registration as well. Hide the redundant *view projection*, not the
  // original saved record, when identity is verified. No name-only merging.
  const v11RawRows=v36AllAttendeeRows;
  v36AllAttendeeRows=function(){
    const rows=v11RawRows.apply(this,arguments),members=rows.filter(x=>x.kind==='family');
    return rows.filter(row=>{
      if(row.kind!=='attendee')return true;
      const mobile=normMobile(row.personalMobile||row.mobile||'');
      const n=normName(row.name||'');
      const belongs=members.some(m=>{
        if(normName(m.name||'')!==n)return false;
        const personal=normMobile(m.personalMobile||'');
        if(personal.length===10&&mobile===personal)return true;
        if(row.record?.masterId&&m.record?.masterId&&row.record.masterId===m.record.masterId)return true;
        // An old referral may be a separate attendee entry for someone
        // already registered as a guest in the same volunteer family.
        const linked=row.record?.referenceVolunteerId||
          (row.record?.referenceType==='volunteer'?row.record?.referenceId:'');
        return !!linked&&linked===m.family?.volunteerId&&m.family?.type==='volunteer-family';
      });
      return !belongs;
    });
  };

  // 1: Replace second volunteer search popup with this page's existing search.
  // The 'volunteer' object is a role-specific projection; source student,
  // Kriyaban, attendee and family records remain unchanged and linked.
  function v11PersonDirectory(){
    const persons=new Map();
    const add=(name,personalMobile,source,id)=>{
      const n=normName(name),mobile=normMobile(personalMobile);
      if(!n||mobile.length!==10)return;
      const key=n+'|'+mobile,person=persons.get(key)||{
        name:String(name).trim(),mobile,refs:[]};
      if(source&&id&&!person.refs.some(r=>r.kind===source&&r.id===id))
        person.refs.push({kind:source,id});
      persons.set(key,person);
    };
    (state.volunteers||[]).forEach(p=>add(volName(p),p.mobile,'volunteer',p.id));
    (state.students||[]).forEach(p=>add(p.name||[p.firstName,p.lastName].filter(Boolean).join(' '),p.mobile||p.phone,'student',p.id));
    (state.kriyabans||[]).forEach(p=>add(p.name,p.mobile,'kriyaban',p.id));
    (state.attendeeMaster||[]).forEach(p=>{
      if(p.category==='family'&&!normMobile(p.personalMobile))return;
      add(p.name,p.personalMobile||p.mobile,'master',p.id);
    });
    (state.attendees||[]).forEach(p=>add(p.name,p.personalMobile||p.mobile,'attendee',p.id));
    (state.familyGroups||[]).forEach(g=>{
      if(g.eventId!==state.activeEventId)return;
      g.members?.forEach(m=>{
        // The head's shared family mobile does not identify all members.
        if(normMobile(m.mobile).length===10)add(m.name,m.mobile,'family',m.id);
      });
    });
    return [...persons.values()].sort((a,b)=>a.name.localeCompare(b.name));
  }
  function v11MatchPerson(raw){
    const query=normName(raw||''),digits=normMobile(raw||'');
    return v11PersonDirectory().filter(person=>
      (query&&normName(person.name).includes(query))||
      (digits.length>=3&&person.mobile.includes(digits))).slice(0,18);
  }
  let v11SearchOpen=false,v11NewVolunteerFlow=false;
  function v11RegisterExistingVolunteer(person){
    const event=activeEvent(),date=$('workingDate')?.value;
    if(!event||!date){toast('Select an event and date');return false}
    const mobile=normMobile(person.mobile),name=normName(person.name);
    let volunteer=(state.volunteers||[]).find(v=>
      normName(volName(v))===name&&normMobile(v.mobile)===mobile);
    if(!volunteer){
      const conflict=(state.volunteers||[]).find(v=>normMobile(v.mobile)===mobile);
      if(conflict){
        toast('Mobile is registered to '+volName(conflict)+'. Correct the person record before assigning.');
        return false;
      }
      const words=person.name.trim().split(/\s+/);
      volunteer={id:uid('vol'),firstName:words.shift()||'',lastName:words.join(' '),
        mobile,birthday:'',linkedIdentityRefs:person.refs.map(r=>({kind:r.kind,id:r.id})),
        linkedPersonId:person.refs.find(r=>r.kind==='master'||r.kind==='student'||r.kind==='kriyaban')?.id||''};
      state.volunteers.push(volunteer);
    }else if(person.refs.length){
      volunteer.linkedIdentityRefs=[...new Map([...(volunteer.linkedIdentityRefs||[]),...person.refs]
        .map(r=>[r.kind+'|'+r.id,r])).values()];
    }
    if(v6RegisteredVolunteerIds(event.id).includes(volunteer.id)){
      toast(volName(volunteer)+' already registered for this event');
      return false;
    }
    ensureVolunteerRoster(volunteer,event.id,date,'counter'); // no auto check-in
    save();v5RenderVolunteerUI();
    const search=$('v5VolunteerSearch');if(search){
      search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));
    }
    v11SearchOpen=false;v11RenderVolunteerResults();
    toast(volName(volunteer)+' registered as volunteer. Check-in is still pending.');
    return true;
  }
  function v11RenderVolunteerResults(){
    const results=$('v11VolunteerResults'),input=$('v5VolunteerSearch');
    if(!results||!input)return;
    const q=input.value.trim(),candidates=q?v11MatchPerson(q):[];
    results.replaceChildren();
    results.hidden=!v11SearchOpen&&!q;
    if(results.hidden)return;
    const lead=document.createElement('div');lead.className='v11-search-lead';
    lead.textContent=q?'MATCHING EXISTING PEOPLE':'SEARCH NAME OR MOBILE TO ADD A VOLUNTEER';
    results.append(lead);
    if(q&&candidates.length===0){
      const empty=document.createElement('p');empty.textContent='No matching person found.';results.append(empty);
    }
    const registered=new Set(v6RegisteredVolunteerIds());
    candidates.forEach(person=>{
      const existing=state.volunteers.find(v=>
        normName(volName(v))===normName(person.name)&&normMobile(v.mobile)===person.mobile);
      const row=document.createElement('div');row.className='v11-person';
      const label=document.createElement('div');
      const strong=document.createElement('strong');strong.textContent=person.name;
      const phone=document.createElement('small');phone.textContent=person.mobile;
      label.append(strong,phone);
      row.append(label);
      if(existing&&registered.has(existing.id)){
        const status=document.createElement('span');status.className='v11-registered';
        status.textContent='REGISTERED';row.append(status);
      }else{
        const button=document.createElement('button');button.type='button';
        button.className='btn secondary small';button.textContent='ADD TO EVENT';
        button.onclick=()=>v11RegisterExistingVolunteer(person);
        row.append(button);
      }
      results.append(row);
    });
    const newPerson=document.createElement('button');newPerson.type='button';
    newPerson.id='v11NewVolunteer';newPerson.className='btn ghost small';
    newPerson.textContent='+ NEW PERSON';
    newPerson.onclick=()=>{
      v11SearchOpen=false;v11RenderVolunteerResults();
      v11NewVolunteerFlow=true;v36RosterOnly=true;
      openVolunteer(undefined,true);
      // Search was already performed on the Volunteers screen.
      $('v84VolunteerLookup')?.closest('.v84-volunteer-lookup')?.classList.add('hidden');
    };
    results.append(newPerson);
  }
  function v11InstallVolunteerSearch(){
    const input=$('v5VolunteerSearch'),root=$('v5VolunteersUI'),add=$('v5AddVolunteer');
    if(!root||!input||!add)return;
    if(!$('v11VolunteerResults')){
      const div=document.createElement('div');div.id='v11VolunteerResults';
      div.hidden=true;
      root.querySelector('.v5-tools')?.insertAdjacentElement('afterend',div);
    }
    if(!input.dataset.v11Unified){
      input.dataset.v11Unified='1';input.placeholder='SEARCH ALL PEOPLE BY NAME OR MOBILE';
      input.addEventListener('input',()=>{
        v11SearchOpen=!!input.value.trim();
        v11RenderVolunteerResults();
      });
      input.addEventListener('keydown',e=>{
        if(e.key==='Escape'){v11SearchOpen=false;v11RenderVolunteerResults()}
      });
    }
    add.onclick=()=>{
      v11SearchOpen=true;v11RenderVolunteerResults();input.focus();
    };
    v11RenderVolunteerResults();
  }
  // Protect against a brand-new volunteer role duplicating an existing
  // student/Kriyaban/attendee of the same personal identity.
  $('volunteerForm')?.addEventListener('submit',event=>{
    if(!v11NewVolunteerFlow)return;
    const name=[$('volunteerFirstName')?.value,$('volunteerLastName')?.value]
      .filter(Boolean).join(' '),mobile=normMobile($('volunteerMobile')?.value);
    const found=v11PersonDirectory().find(p=>
      normName(p.name)===normName(name)&&p.mobile===mobile);
    if(found){
      event.preventDefault();event.stopImmediatePropagation();
      toast('Existing person found. Select '+found.name+' from Volunteers search.');
      return;
    }
    const conflict=v11PersonDirectory().find(p=>p.mobile===mobile&&normName(p.name)!==normName(name));
    if(conflict){
      event.preventDefault();event.stopImmediatePropagation();
      toast('Mobile already belongs to another person: '+conflict.name);
      return;
    }
    v36RosterOnly=true; // legacy form saves as assigned, not checked in
    setTimeout(()=>{
      v36RosterOnly=false;v11NewVolunteerFlow=false;v5RenderVolunteerUI();
    },0);
  },true);
  const v11RenderVolunteerBase=v5RenderVolunteerUI;
  v5RenderVolunteerUI=function(){
    const result=v11RenderVolunteerBase.apply(this,arguments);
    v11InstallVolunteerSearch();
    return result;
  };

  // 2: No separate Family Check-In control on the Attendees page.
  function v11RemoveOutsideFamilyButton(){
    $('v10FamilyCheckinButton')?.remove();
    $('v10FamilyCheckinModal')?.classList.remove('open');
  }
  const v11RenderAttBase=v36RenderAttendees;
  v36RenderAttendees=function(){
    const result=v11RenderAttBase.apply(this,arguments);
    v11RemoveOutsideFamilyButton();return result;
  };

  // 3: Earlier v89-style expandable families are available INSIDE the
  // already approved NEW REGISTRATION > FAMILY segment, never a fifth tab.
  let v11ExpandedFamily='',v11FamilyQuery='',v11MemberEditor='';
  function v11HeadName(group){
    const volunteer=state.volunteers.find(v=>v.id===group.volunteerId);
    return group.contactName||volunteer&&volName(volunteer)||'FAMILY';
  }
  function v11Families(){
    return (state.familyGroups||[]).filter(g=>g.eventId===state.activeEventId)
      .sort((a,b)=>v11HeadName(a).localeCompare(v11HeadName(b)));
  }
  function v11BuildFamilyBox(){
    if($('v11FamilyList'))return;
    const segment=$('v10RegistrationMode');if(!segment)return;
    const box=document.createElement('section');box.id='v11FamilyList';
    box.innerHTML='<div class="v11-family-header"><strong>REGISTERED FAMILIES</strong>'+
      '<button type="button" id="v11NewFamily" class="btn secondary small">+ NEW FAMILY</button></div>'+
      '<input type="search" id="v11FamilySearch" class="search" autocomplete="off" placeholder="SEARCH FAMILY OR MEMBER NAME / MOBILE">'+
      '<div id="v11FamilyResults"></div>';
    segment.insertAdjacentElement('afterend',box);
    $('v11FamilySearch').oninput=e=>{
      v11FamilyQuery=e.target.value.trim();v11PaintFamilyList();
    };
    $('v11NewFamily').onclick=()=>{
      v11FamilyQuery='';v11ExpandedFamily='';
      v36OpenRegistration();
      $('v10RegistrationMode').querySelector('[data-v10-mode="family"]').click();
      $('v36MainName').focus();
    };
  }
  function v11PaintFamilyList(){
    const box=$('v11FamilyList');if(!box)return;
    box.hidden=!/family/.test($('v36RegistrationType')?.value||'')||
      !$('v36RegistrationModal')?.classList.contains('open');
    if(box.hidden)return;
    const search=$('v11FamilySearch'),q=normName(v11FamilyQuery),digits=normMobile(v11FamilyQuery);
    if(search.value!==v11FamilyQuery)search.value=v11FamilyQuery;
    const host=$('v11FamilyResults');host.replaceChildren();
    const groups=v11Families().filter(g=>{
      if(!q&&!digits)return true;
      const volunteer=state.volunteers.find(v=>v.id===g.volunteerId);
      const labels=[v11HeadName(g),volunteer?.mobile||'',g.mobile||'',
        ...(g.members||[]).flatMap(m=>[m.name||'',m.relationship||'',m.mobile||''])];
      return labels.some(x=>(q&&normName(x).includes(q))||
        (digits.length>=3&&normMobile(x).includes(digits)));
    });
    if(!groups.length){
      const empty=document.createElement('p');empty.className='v11-empty';
      empty.textContent=v11FamilyQuery?'No matching family.':'No families registered for this event.';
      host.append(empty);return;
    }
    groups.forEach(g=>{
      const name=v11HeadName(g),date=$('workingDate').value,
        isVol=g.type==='volunteer-family',
        volunteer=state.volunteers.find(v=>v.id===g.volunteerId),
        headChecked=isVol&&volunteer&&v36CheckedVolunteerIds(state.activeEventId,date).includes(volunteer.id),
        arrivals=(g.members||[]).filter(m=>(m.checkins||[]).includes(date)).length,
        expected=(g.members||[]).length+(isVol?1:0),
        present=arrivals+(headChecked?1:0),
        expanded=v11ExpandedFamily===g.id;
      const card=document.createElement('div');card.className='v11-family-card';
      const header=document.createElement('button');header.type='button';
      header.className='v11-family-toggle';header.setAttribute('aria-expanded',String(expanded));
      header.innerHTML='<span class="v11-family-name">'+(expanded?'▾':'▸')+' '+esc(name)+' — FAMILY'+
        '<small>'+expected+' PEOPLE · '+present+' ARRIVED · '+Math.max(0,expected-present)+' PENDING</small></span>'+
        '<span class="v11-family-state">'+present+'/'+expected+' CHECKED IN</span>';
      header.onclick=()=>{
        v11ExpandedFamily=expanded?'':g.id;v11PaintFamilyList();
      };
      card.append(header);
      if(expanded){
        const table=document.createElement('div');table.className='v11-member-list';
        if(isVol&&volunteer){
          const row=document.createElement('div');row.className='v11-member-line';
          row.innerHTML='<span><strong>'+esc(volName(volunteer))+'</strong><small>FAMILY HEAD · VOLUNTEER</small></span>'+
            '<span class="v11-member-status">'+(headChecked?'CHECKED IN':'PENDING · VOLUNTEERS TAB')+'</span>';
          table.append(row);
        }
        (g.members||[]).forEach((m,index)=>{
          const arrived=(m.checkins||[]).includes(date);
          const row=document.createElement('div');row.className='v11-member-line';
          const text=document.createElement('span');
          const title=document.createElement('strong');
          title.textContent=m.name||m.relationship||'FAMILY MEMBER '+(index+1);
          const detail=document.createElement('small');
          detail.textContent=[m.name?m.relationship:'FAMILY-ONLY',m.mobile||''].filter(Boolean).join(' · ');
          text.append(title,detail);row.append(text);
          const controls=document.createElement('div');controls.className='v11-member-actions';
          const status=document.createElement('span');status.className='v11-member-status';
          status.textContent=arrived?'✓ CHECKED IN':'NOT ARRIVED';
          const button=document.createElement('button');button.type='button';
          button.className=arrived?'btn secondary small':'btn small';
          button.textContent=arrived?'UNDO':'CHECK IN';
          button.onclick=()=>{
            const person=v36AllAttendeeRows().find(r=>r.kind==='family'&&r.id===m.id&&r.groupId===g.id);
            if(!person){toast('Member record not found');return}
            v36SetAttendeeCheckin(person,!arrived);
            v11PaintFamilyList();
          };
          controls.append(status,button);row.append(controls);table.append(row);
        });
        card.append(table);
        const actions=document.createElement('div');actions.className='v11-family-actions';
        const add=document.createElement('button');add.type='button';
        add.className='btn secondary small';add.textContent='+ ADD MEMBER';
        add.onclick=()=>{
          v11MemberEditor=v11MemberEditor===g.id?'':g.id;v11PaintFamilyList();
        };
        actions.append(add);card.append(actions);
        if(v11MemberEditor===g.id){
          const editor=document.createElement('div');editor.className='v11-add-member';
          editor.innerHTML='<label>RELATIONSHIP<input id="v11Relation" list="v40RelationshipKeywords" placeholder="E.G. MOM"></label>'+
            '<label>REAL NAME (OPTIONAL)<input id="v11MemberName" placeholder="FULL NAME"></label>'+
            '<label>PERSONAL MOBILE (OPTIONAL)<input id="v11MemberMobile" inputmode="numeric" placeholder="10-DIGIT MOBILE"></label>'+
            '<button type="button" class="btn small" id="v11SaveFamilyMember">SAVE MEMBER</button>';
          card.append(editor);
          editor.querySelector('#v11SaveFamilyMember').onclick=()=>{
            const relationship=editor.querySelector('#v11Relation').value.trim(),
              n=editor.querySelector('#v11MemberName').value.trim(),
              raw=editor.querySelector('#v11MemberMobile').value.trim(),
              mobile=normMobile(raw);
            if(!relationship&&!n){toast('Enter a relationship or actual name');return}
            if(raw&&mobile.length!==10){toast('Personal mobile must have 10 digits');return}
            if(n&&v11RelationLabels.has(normName(n))){
              toast('Enter Mom/Dad as a relationship, not a name');return;
            }
            if((g.members||[]).some(m=>(mobile&&normMobile(m.mobile)===mobile)||
              (n&&normName(m.name||'')===normName(n)&&!mobile&&!normMobile(m.mobile)))){
              toast('Member already exists in this family. Use their existing record.');return;
            }
            if(mobile&&v11PersonDirectory().some(p=>p.mobile===mobile&&normName(p.name)!==normName(n))){
              toast('Mobile is linked to another person. Confirm the correct identity.');return;
            }
            const member={id:uid('fam'),relationship,name:n,mobile,checkins:[],masterId:''};
            if(n&&mobile){
              const master=v36EnsureMaster(n,mobile,mobile,'outside',null,'');
              if(master)member.masterId=master.id;
            }
            g.members.push(member);
            save();v11MemberEditor='';v11PaintFamilyList();
            toast('Family member added. Not automatically checked in.');
          };
        }
      }
      host.append(card);
    });
  }
  const v11RelationLabels=new Set(['mom','dad','mother','father','wife','husband',
    'son','daughter','sister','brother','grandmother','grandfather',
    'uncle','aunt','other family member']);
  const v11OpenRegistrationOriginal=v36OpenRegistration;
  v36OpenRegistration=function(){
    const result=v11OpenRegistrationOriginal.apply(this,arguments);
    v11BuildFamilyBox();v11PaintFamilyList();
    return result;
  };
  function v11InstallFamilyMode(){
    v11BuildFamilyBox();
    const tabs=$('v10RegistrationMode');
    if(tabs&&!tabs.dataset.v11Family){
      tabs.dataset.v11Family='1';
      tabs.addEventListener('click',()=>setTimeout(v11PaintFamilyList,0));
    }
    v11PaintFamilyList();
  }
  const v11SwitchOld=switchPage;
  switchPage=function(){
    const result=v11SwitchOld.apply(this,arguments);
    v11RemoveOutsideFamilyButton();
    v11InstallVolunteerSearch();v11InstallFamilyMode();
    return result;
  };
  // Only approved surfaces: current volunteer search, New Registration
  // Family segment and no duplicate attendee/family display.
  document.head.insertAdjacentHTML('beforeend','<style id="v11-event-corrections">'+
    '#v10FamilyCheckinButton,#v10FamilyCheckinModal{display:none!important}'+
    '#daily #v11VolunteerResults{margin:-8px 0 16px;max-width:790px;border:1px solid #d3e0ef;border-radius:12px;padding:9px 14px;background:#fff;box-shadow:0 7px 18px #233e6020}'+
    '#daily #v11VolunteerResults[hidden]{display:none!important}'+
    '.v11-search-lead{font-size:11px;font-weight:800;color:#63758b;padding:7px}'+
    '.v11-person{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #edf0f5;padding:9px 4px}'+
    '.v11-person strong,.v11-person small{display:block}.v11-person strong{color:#0d346d;font-size:13px}'+
    '.v11-person small{color:#62728a;font-size:12px;margin-top:3px}'+
    '.v11-registered{color:#0a7544;font-size:11px;font-weight:750}'+
    '#v11VolunteerResults #v11NewVolunteer{margin-top:8px}'+
    '#v11FamilyList{margin:13px 0 17px;padding:14px;border:1px solid #d8e3ef;border-radius:12px;background:#fbfcff}'+
    '#v11FamilyList[hidden]{display:none!important}'+
    '.v11-family-header{display:flex;justify-content:space-between;align-items:center;color:#0a326a;margin-bottom:9px;font-size:13px}'+
    '#v11FamilySearch{min-height:41px;width:100%;border:1px solid #cbd9e7;border-radius:9px;margin-bottom:9px}'+
    '.v11-empty{font-size:12px;color:#7b899e;margin:12px 0}'+
    '.v11-family-card{background:white;border:1px solid #dbe5ef;border-radius:10px;margin-bottom:6px;overflow:hidden}'+
    '.v11-family-toggle{display:flex;justify-content:space-between;align-items:center;gap:9px;width:100%;border:0;background:#fff;text-align:left;padding:12px;color:#0c356f;cursor:pointer}'+
    '.v11-family-toggle[aria-expanded="true"]{background:#fff5d8}'+
    '.v11-family-name{font-weight:800;font-size:13px}'+
    '.v11-family-name small{display:block;color:#758397;font-size:11px;margin-top:5px;font-weight:500}'+
    '.v11-family-state{font-size:11px;font-weight:750;white-space:nowrap;color:#0f744a}'+
    '.v11-member-list{padding:5px 14px}'+
    '.v11-member-line{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #e8edf4;padding:9px 0}'+
    '.v11-member-line strong,.v11-member-line small{display:block}'+
    '.v11-member-line strong{font-size:13px;color:#0b346c}'+
    '.v11-member-line small{font-size:11px;color:#63748b;margin-top:3px}'+
    '.v11-member-actions{display:flex;gap:9px;align-items:center}'+
    '.v11-member-status{font-size:11px;color:#5a718b;white-space:nowrap}'+
    '.v11-family-actions{padding:6px 15px 12px;text-align:right}'+
    '.v11-add-member{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:12px;border-top:1px solid #e2eaf5}'+
    '.v11-add-member label{font-size:10px;font-weight:750;color:#314b70}'+
    '.v11-add-member input{width:100%;min-width:0;border:1px solid #c5d4e6;padding:8px;border-radius:7px;box-sizing:border-box;margin-top:5px}'+
    '.v11-add-member button{grid-column:3}'+
    '@media(max-width:750px){.v11-member-line{align-items:flex-start;flex-direction:column}.v11-add-member{grid-template-columns:1fr}.v11-add-member button{grid-column:1}}'+
    '</style>');
  v11RemoveOutsideFamilyButton();
  v11InstallVolunteerSearch();
  v11InstallFamilyMode();
