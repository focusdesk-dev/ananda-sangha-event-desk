// ANANDA SANGHA EVENT DESK — Production patch 1.0.129
// Fixes: volunteer participation accuracy, Esc=Back, automatic focus after Add,
// and Volunteer Name -> Mobile keyboard flow.
(()=>{
  const byId=id=>document.getElementById(id);
  const later=(fn,delay=50)=>setTimeout(()=>{try{fn()}catch{}},delay);
  const visible=el=>!!(el&&!el.disabled&&el.offsetParent!==null);
  const focusIfVisible=el=>{if(visible(el)){el.focus();if(typeof el.select==='function'&&el.type!=='date')el.select();return true}return false};

  // 1) Volunteer Participation must show volunteers actually assigned or checked in.
  // A volunteer being the linked person for attending family members is not participation.
  function participatingVolunteerIds(eventId){
    const ids=new Set();
    Object.entries(state.volunteerRosters||{}).forEach(([key,list])=>{
      if(key.startsWith(eventId+'|'))(list||[]).forEach(id=>ids.add(id));
    });
    Object.entries(state.daily||{}).forEach(([key,list])=>{
      if(key.startsWith(eventId+'|'))(list||[]).forEach(id=>ids.add(id));
    });
    return ids;
  }
  function withParticipationOnly(callback){
    const eventId=state.activeEventId;
    if(!eventId||typeof allEventVolunteerRegistrations!=='function')return callback();
    const participantIds=participatingVolunteerIds(eventId);
    const original=allEventVolunteerRegistrations;
    try{
      allEventVolunteerRegistrations=()=>original().filter(record=>participantIds.has(record.volunteerId));
      return callback();
    }finally{
      allEventVolunteerRegistrations=original;
    }
  }
  if(typeof renderV36Record==='function'){
    const before=renderV36Record;
    renderV36Record=function(){return withParticipationOnly(()=>before())};
  }
  if(typeof v51ReportData==='function'){
    const before=v51ReportData;
    v51ReportData=function(){return withParticipationOnly(()=>before())};
  }

  // 2) Esc = Back. If a modal is open, Esc closes the modal first.
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.isComposing||event.altKey||event.ctrlKey||event.metaKey)return;
    if(String(event.key||'')!=='Escape')return;
    const openModals=[...document.querySelectorAll('.modal-backdrop.open')];
    if(openModals.length){
      const modal=openModals[openModals.length-1];
      const close=modal.querySelector('#v36CancelRegistration, #v36CloseRegistration, [id*="Cancel"], [id*="Close"], [data-close], .x');
      event.preventDefault();
      event.stopImmediatePropagation();
      if(close&&typeof close.click==='function')close.click();else modal.classList.remove('open');
      return;
    }
    if(page!=='dashboard'){
      const back=byId('backButton');
      if(back){
        event.preventDefault();
        event.stopImmediatePropagation();
        back.click();
      }
    }
  },true);

  // 3) Automatically put the cursor in the useful first field when Add/New opens.
  function focusOpenModal(){
    const modals=[...document.querySelectorAll('.modal-backdrop.open')];
    if(!modals.length)return;
    const modal=modals[modals.length-1];
    if(modal.contains(document.activeElement)&&document.activeElement!==document.body)return;
    const preferred={
      volunteerModal:['volunteerFirstName','volunteerMobile'],
      attendeeMasterModal:['attendeeMasterName','attendeeMasterMobile'],
      kriyabanModal:['kriyabanName','kriyabanMobile'],
      vipModal:['vipName'],
      v36RegistrationModal:['v36MainName','v40VolunteerLookup','v36MainMobile']
    }[modal.id]||[];
    for(const id of preferred)if(focusIfVisible(byId(id)))return;
    const fallback=modal.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
    focusIfVisible(fallback);
  }
  const modalObserver=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='attributes'&&m.attributeName==='class'))later(focusOpenModal,40);
  });
  modalObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});

  // Search fields receive focus immediately when their working page is opened.
  if(typeof switchPage==='function'){
    const before=switchPage;
    switchPage=function(id){
      const result=before(id);
      later(()=>{
        const target={volunteers:'volunteerSearch',attendeeMaster:'attendeeMasterSearch',kriyabans:'kriyabanSearch',vips:'vipSearch',daily:'v36VolSearch',checkin:'v36AttendeeSearch',register:'v36AttendeeSearch'}[id];
        if(target)focusIfVisible(byId(target));
      },70);
      return result;
    };
  }

  // 4) Volunteer keyboard flow: First/Last Name -> Mobile -> Birthday.
  function installVolunteerEnterFlow(){
    const first=byId('volunteerFirstName'),last=byId('volunteerLastName'),mobile=byId('volunteerMobile'),birthday=byId('volunteerBirthday'),lookup=byId('v84VolunteerLookup');
    if(!first||first.dataset.v129EnterFlow)return;
    first.dataset.v129EnterFlow='1';
    first.addEventListener('keydown',event=>{
      if(event.key!=='Enter'||event.altKey||event.ctrlKey||event.metaKey)return;
      event.preventDefault();event.stopPropagation();
      const text=first.value.trim();
      if(text.includes(' ')&&!last.value.trim()){
        const parts=text.split(/\s+/);first.value=parts.shift()||'';last.value=parts.join(' ');mobile?.focus();return;
      }
      if(last&&last.value.trim())mobile?.focus();else last?.focus();
    });
    last?.addEventListener('keydown',event=>{
      if(event.key!=='Enter'||event.altKey||event.ctrlKey||event.metaKey)return;
      event.preventDefault();event.stopPropagation();mobile?.focus();
    });
    mobile?.addEventListener('keydown',event=>{
      if(event.key!=='Enter'||event.altKey||event.ctrlKey||event.metaKey)return;
      event.preventDefault();event.stopPropagation();birthday?.focus();
    });
    lookup?.addEventListener('keydown',event=>{
      if(event.key!=='Enter'||event.altKey||event.ctrlKey||event.metaKey)return;
      later(()=>{if(first?.value.trim()||last?.value.trim())mobile?.focus();else first?.focus()},0);
    });
  }
  installVolunteerEnterFlow();

  // If an Add button is clicked directly or by the + shortcut, focus after it opens.
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button)return;
    if(/^add|new/i.test(button.id||'')||['v48AddVolunteer','v36NewRegistration'].includes(button.id))later(focusOpenModal,80);
  },true);

  document.title='ANANDA SANGHA GURGAON Event Desk — Production 1.0.129';
})();
