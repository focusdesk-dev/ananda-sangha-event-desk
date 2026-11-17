  // PATCH 14.4 — TWO NARROW CORRECTIONS ONLY.
  // 1. The Event list VIEW button opens the already-approved Event Record,
  //    exactly like clicking the existing Event Record tab.
  // 2. In all four selected-event tabs retain the single yellow line BELOW
  //    the four navigation buttons; remove the redundant topbar yellow line.
  // Do not redraw frozen screens or change sidebar, records, counts or events.
  window.anandaDirectEventSingleDividerVersion='14.4';

  document.addEventListener('click',function(event){
    const target=event.target;
    const view=target&&target.closest&&target.closest('#eventList .v6-open-event[data-id]');
    if(!view)return;
    const id=view.dataset.id;
    if(!id||(state.events||[]).every(ev=>ev.id!==id))return;
    event.preventDefault();
    event.stopImmediatePropagation(); // old VIEW handler must not open EVENT TASKS
    state.activeEventId=id;
    save(); // preserve original VIEW selected-event persistence
    switchPage('eventRecord'); // same destination as frozen EVENT RECORD tab
  },true);

  // Guard any older internal link that still attempts to open the old landing.
  const v144OldSwitchPage=switchPage;
  switchPage=function(id){
    return v144OldSwitchPage.apply(this,[
      id==='eventWorkspace'&&activeEvent()?'eventRecord':id
    ]);
  };

  document.head.insertAdjacentHTML('beforeend',
    '<style id="v144-single-event-divider">'+
    // Only selected-event pages; do not alter the Events list or Classes.
    'body.v6-event-area:has(#eventRecord.page.active) .topbar,'+
    'body.v6-event-area:has(#daily.page.active) .topbar,'+
    'body.v6-event-area:has(#register.page.active) .topbar,'+
    'body.v6-event-area:has(#checkin.page.active) .topbar,'+
    'body.v6-event-area:has(#items.page.active) .topbar'+
      '{border-bottom:0!important}'+
    // All four tabs share exactly one yellow divider below their buttons.
    'body.v6-event-area #v6EventTabs:not(.hidden)'+
      '{border-bottom:4px solid #ffba12!important;padding-bottom:14px!important}'+
    '</style>');
