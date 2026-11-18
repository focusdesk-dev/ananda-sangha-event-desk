  // PATCH 14.2 — Restore the already-approved Event Record entry route.
  // The old eventWorkspace is kept for historical code compatibility but is
  // never used as the visible landing screen for a selected event.
  // Preserve the sidebar, record data, families, counts and the other tabs.
  window.anandaEventRecordRouteVersion='14.2';

  const v142PreviousSwitchPage=switchPage;
  function v142ProtectEventHeader(){
    if(document.querySelector('.page.active')?.id!=='eventRecord')return;
    // The top-bar MASTER LOCK belongs elsewhere, not on approved Event Record.
    document.querySelectorAll('.topbar button').forEach(button=>{
      if((button.textContent||'').trim().toUpperCase().includes('MASTER LOCK')){
        button.style.display='none';
      }
    });
  }
  switchPage=function(destination){
    const target=destination==='eventWorkspace'&&activeEvent()
      ?'eventRecord':destination;
    const result=v142PreviousSwitchPage.call(this,target);
    v142ProtectEventHeader();
    return result;
  };
  // Earlier layout wrappers may rerender the top bar after navigation.
  const v142PreviousUpdateLayout=v6UpdateLayout;
  v6UpdateLayout=function(){
    const result=v142PreviousUpdateLayout.apply(this,arguments);
    v142ProtectEventHeader();
    return result;
  };
