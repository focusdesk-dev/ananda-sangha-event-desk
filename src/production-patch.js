// ANANDA SANGHA EVENT DESK — Production patch 1.0.129
// Fixes: family-linked volunteer roster, Esc=Back, automatic focus after Add,
// and Volunteer Name -> Mobile keyboard flow.
(()=>{
  const byId=id=>document.getElementById(id);
  const later=(fn,delay=50)=>setTimeout(()=>{try{fn()}catch{}},delay);
  const visible=el=>!!(el&&!el.disabled&&el.offsetParent!==null);
  const focusIfVisible=el=>{if(visible(el)){el.focus();if(typeof el.select==='function'&&el.type!=='date')el.select();return true}return false};

  // 1) A linked volunteer's family registration must never make the volunteer
  //    an assigned/participating volunteer by itself.
  function rosterKeysForVolunteer(eventId,volunteerId){
    return Object.keys(state.volunteerRosters||{}).filter(key=>key.startsWith(`${eventId}|`)&&(state.volunteerRosters[key]||[]).includes(volunteerId));
  }
  function checkedKeysForVolunteer(eventId,volunteerId){
    return Object.keys(state.daily||{}).filter(key=>key.startsWith(`${eventId}|`)&&(state.daily[key]||[]).includes(volunteerId));
  }
  function removeVolunteerRegistrationIfUnused(eventId,volunteerId){
    if(rosterKeysForVolunteer(eventId,volunteerId).length||checkedKeysForVolunteer(eventId,volunteerId).length)return;
    state.volunteerRegistrations=(state.volunteerRegistrations||[]).filter(r=>!(r.eventId===eventId&&r.volunteerId===volunteerId&&!(r.checkins||[]).length));
  }
  function cleanLegacyFamilyOnlyVolunteerAssignments(){
    let changed=false;
    const registrations=[...(state.volunteerRegistrations||[])];
    registrations.forEach(reg=>{
      if(!reg||!reg.eventId||!reg.volunteerId||(reg.checkins||[]).length)return;
      const regTime=Date.parse(reg.registeredAt||'');
      if(!Number.isFinite(regTime))return;
      const matchingGroups=(state.familyGroups||[]).filter(group=>{
        if(group.eventId!==reg.eventId||group.type!=='volunteer-family'||group.volunteerId!==reg.volunteerId)return false;
        const groupTime=Date.parse(group.registeredAt||'');
        return Number.isFinite(groupTime)&&Math.abs(groupTime-regTime)<=5000;
      });
      if(!matchingGroups.length)return;
      matchingGroups.forEach(group=>{
        const date=group.registrationDate||'';
        if(!date)return;
        const key=`${reg.eventId}|${date}`;
        const roster=state.volunteerRosters?.[key]||[];
        const checked=state.daily?.[key]||[];
        if(roster.includes(reg.volunteerId)&&!checked.includes(reg.volunteerId)){
          state.volunteerRosters[key]=roster.filter(id=>id!==reg.volunteerId);
          changed=true;
        }
      });
      const before=(state.volunteerRegistrations||[]).length;
      removeVolunteerRegistrationIfUnused(reg.eventId,reg.volunteerId);
      if((state.volunteerRegistrations||[]).length!==before)changed=true;
    });
    if(changed){save();later(()=>renderAll(),0)}
  }

  const registrationForm=byId('v36RegistrationForm');
  if(registrationForm&&typeof registrationForm.onsubmit==='function'){
    const submitBefore129=registrationForm.onsubmit;
    registrationForm.onsubmit=function(event){
      const isNew=!v36RegistrationEditKey;
      const type=byId('v36RegistrationType')?.value||'';
      const volunteerId=byId('v36RegistrationVolunteer')?.value||'';
      const eventId=state.activeEventId;
      const date=byId('workingDate')?.value||'';
      const key=eventId&&date?`${eventId}|${date}`:'';
      const beforeAssigned=!!(key&&volunteerId&&(state.volunteerRosters?.[key]||[]).includes(volunteerId));
      const beforeRegistration=!!((state.volunteerRegistrations||[]).find(r=>r.eventId===eventId&&r.volunteerId===volunteerId));
      const result=submitBefore129.call(this,event);
      const saved=!!(isNew&&type==='volunteer-family'&&volunteerId&&key&&!byId('v36RegistrationModal')?.classList.contains('open'));
      if(saved&&!beforeAssigned){
        state.volunteerRosters[key]=(state.volunteerRosters?.[key]||[]).filter(id=>id!==volunteerId);
        if(!beforeRegistration)removeVolunteerRegistrationIfUnused(eventId,volunteerId);
        save();
        later(()=>renderAll(),0);
      }
      return result;
    };
  }
  cleanLegacyFamilyOnlyVolunteerAssignments();

  // 2) Esc behaves as Back. If a modal is open, Esc closes that first.
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.isComposing||event.altKey||event.ctrlKey||event.metaKey)return;
    if(String(event.key||'')!=='Escape')return;
    const openModals=[...document.querySelectorAll('.modal-backdrop.open')];
    if(openModals.length){
      const modal=openModals[openModals.length-1];
      const close=modal.querySelector('[data-close], .x, #v36CloseRegistration, #v36CancelRegistration, [id*="Cancel"], [id*="Close"]');
      event.preventDefault();
      if(close&&typeof close.click==='function')close.click();else modal.classList.remove('open');
      return;
    }
    const back=byId('backButton');
    if(back&&!back.classList.contains('hidden')&&page!=='dashboard'){
      event.preventDefault();
      back.click();
    }
  });

  // 3) Any Add action should put the cursor in the useful first field automatically.
  if(typeof openVolunteer==='function'){
    const openVolunteerBefore129=openVolunteer;
    openVolunteer=function(id,forToday=false){
      const result=openVolunteerBefore129(id,forToday);
      later(()=>{
        if(id){focusIfVisible(byId('v84VolunteerLookup'))||focusIfVisible(byId('volunteerFirstName'));return}
        focusIfVisible(byId('volunteerFirstName'))||focusIfVisible(byId('v84VolunteerLookup'));
      },70);
      return result;
    };
  }
  if(typeof v36OpenNewVolunteer==='function'){
    const openNewVolunteerBefore129=v36OpenNewVolunteer;
    v36OpenNewVolunteer=function(){
      const result=openNewVolunteerBefore129.apply(this,arguments);
      later(()=>{
        const first=byId('volunteerFirstName'),last=byId('volunteerLastName'),mobile=byId('volunteerMobile'),birthday=byId('volunteerBirthday');
        if(first&&!first.value.trim())focusIfVisible(first);
        else if(last&&!last.value.trim())focusIfVisible(last);
        else if(mobile&&!mobile.value.trim())focusIfVisible(mobile);
        else focusIfVisible(birthday)||focusIfVisible(mobile);
      },90);
      return result;
    };
  }
  if(typeof openAttendeeMaster==='function'){
    const openAttendeeBefore129=openAttendeeMaster;
    openAttendeeMaster=function(id){const result=openAttendeeBefore129(id);later(()=>focusIfVisible(byId('attendeeMasterName')),70);return result};
  }
  if(typeof v46OpenKriyaban==='function'){
    const openKriyabanBefore129=v46OpenKriyaban;
    v46OpenKriyaban=function(id=''){const result=openKriyabanBefore129(id);later(()=>focusIfVisible(byId('kriyabanName')),70);return result};
  }
  if(typeof v47OpenVip==='function'){
    const openVipBefore129=v47OpenVip;
    v47OpenVip=function(id=''){const result=openVipBefore129(id);later(()=>focusIfVisible(byId('vipName')),70);return result};
  }
  if(typeof v36OpenRegistration==='function'){
    const openRegistrationBefore129=v36OpenRegistration;
    v36OpenRegistration=function(editKey=''){
      const result=openRegistrationBefore129(editKey);
      later(()=>{
        const type=byId('v36RegistrationType')?.value||'';
        if(type==='volunteer-family'||type==='friend')focusIfVisible(byId('v40VolunteerLookup'));
        else focusIfVisible(byId('v36MainName'))||focusIfVisible(byId('v36AttendeeSearch'));
      },80);
      return result;
    };
  }

  // Search bars also receive focus automatically when their page is opened.
  if(typeof switchPage==='function'){
    const switchPageBefore129=switchPage;
    switchPage=function(id){
      const result=switchPageBefore129(id);
      later(()=>{
        const target={volunteers:'volunteerSearch',attendeeMaster:'attendeeMasterSearch',kriyabans:'kriyabanSearch',vips:'vipSearch',daily:'v36VolSearch',checkin:'v36AttendeeSearch'}[id];
        if(target)focusIfVisible(byId(target));
      },80);
      return result;
    };
  }

  // 4) Volunteer keyboard flow: Name -> Mobile -> Birthday.
  function installVolunteerEnterFlow(){
    const first=byId('volunteerFirstName'),last=byId('volunteerLastName'),mobile=byId('volunteerMobile'),birthday=byId('volunteerBirthday'),lookup=byId('v84VolunteerLookup');
    if(!first||first.dataset.v129EnterFlow)return;
    first.dataset.v129EnterFlow='1';
    const move=(from,to)=>from&&from.addEventListener('keydown',event=>{
      if(event.key!=='Enter'||event.altKey||event.ctrlKey||event.metaKey)return;
      event.preventDefault();event.stopPropagation();to?.focus();
    });
    first.addEventListener('keydown',event=>{
      if(event.key!=='Enter'||event.altKey||event.ctrlKey||event.metaKey)return;
      event.preventDefault();event.stopPropagation();
      if(last&&last.value.trim())mobile?.focus();else last?.focus();
    });
    move(last,mobile);
    move(mobile,birthday);
    if(lookup){
      lookup.addEventListener('keydown',event=>{
        if(event.key!=='Enter'||event.altKey||event.ctrlKey||event.metaKey)return;
        later(()=>{
          if((first?.value.trim()||last?.value.trim())&&mobile)mobile.focus();
          else first?.focus();
        },0);
      });
    }
  }
  installVolunteerEnterFlow();
  const observer=new MutationObserver(()=>installVolunteerEnterFlow());
  observer.observe(document.body,{childList:true,subtree:true});

  document.title='ANANDA SANGHA GURGAON Event Desk — Production 1.0.129';
})();
