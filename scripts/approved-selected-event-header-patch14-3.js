  // PATCH 14.3 — Restore the frozen selected-event context above the four tabs.
  // Approved layout: BACK TO EVENTS, prominent EVENT NAME / date / venue / status,
  // four event buttons, then EVENT NAME – ACTIVE TAB. Never change event data,
  // approved sidebar, check-in rules, navigation actions or counters.
  window.anandaEventContextHeaderVersion='14.3';
  const v143Pages=new Set(['eventRecord','daily','register','checkin','items']);
  function v143ApprovedHeader(){
    const event=activeEvent();
    const visible=!!event&&v143Pages.has(page)&&
      !(page==='items'&&v82BadgeMode==='printing');
    const tabs=$('v6EventTabs');
    if(!tabs)return;
    let context=$('v143EventContext');
    if(!context){
      context=document.createElement('section');
      context.id='v143EventContext';
      context.setAttribute('aria-label','Selected event');
      context.innerHTML='<strong id="v143EventName"></strong>'+
        '<div class="v143-event-meta"><span id="v143EventDate"></span>'+
        '<span id="v143EventVenue"></span><span id="v143EventStatus"></span></div>';
      tabs.parentElement.insertBefore(context,tabs);
    }
    let section=$('v143EventSection');
    if(!section){
      section=document.createElement('h2');
      section.id='v143EventSection';
      tabs.insertAdjacentElement('afterend',section);
    }
    context.hidden=!visible;
    section.hidden=!visible;
    document.body.classList.toggle('v143-event-context-active',visible);
    if(!visible)return;
    const eventName=String(event.name||'EVENT').trim().toUpperCase();
    const activeLabel=page==='daily'?'VOLUNTEERS':
      page==='register'||page==='checkin'?'ATTENDEES':
      page==='items'?'BADGE & SCARF':'EVENT RECORD';
    $('v143EventName').textContent=eventName;
    $('v143EventDate').textContent=eventDateText(event);
    const venue=String(event.venue||'').trim();
    $('v143EventVenue').textContent=venue||'—';
    $('v143EventStatus').textContent=v6EventStatusOf(event).toUpperCase();
    section.textContent=eventName+' – '+activeLabel;
  }
  document.head.insertAdjacentHTML('beforeend','<style id="v143-event-context-style">'+
    '#v143EventContext[hidden],#v143EventSection[hidden]{display:none!important}'+
    'body.v143-event-context-active .topbar #pageTitle{display:none!important}'+
    'body.v143-event-context-active .topbar #backButton{margin-right:auto!important}'+
    '#v143EventContext{display:flex;align-items:center;flex-wrap:wrap;gap:16px 28px;'+
      'padding:12px 0 16px;margin:0 0 16px;border-bottom:4px solid #f6b916;color:#092b60}'+
    '#v143EventName{font-size:32px;line-height:1.15;font-weight:800;letter-spacing:-.02em;'+
      'overflow-wrap:anywhere}'+
    '#v143EventContext .v143-event-meta{display:flex;align-items:center;flex-wrap:wrap;gap:14px;'+
      'font-size:15px;font-weight:650;color:#19345a}'+
    '#v143EventDate:not(:empty):before{content:"▦";margin-right:8px;color:#0a316d}'+
    '#v143EventVenue:not(:empty):before{content:"●";font-size:9px;vertical-align:middle;'+
      'margin-right:8px;color:#6f8bad}'+
    '#v143EventStatus{display:inline-block;border-radius:30px;padding:8px 14px;'+
      'background:#e8ecf3;color:#183563;font-size:13px;font-weight:750}'+
    'body.v143-event-context-active #v6EventTabs{border-bottom:0!important;'+
      'padding-bottom:0!important;margin-bottom:8px!important}'+
    '#v143EventSection{font-size:clamp(22px,2.2vw,29px);line-height:1.25;'+
      'font-weight:800;letter-spacing:-.02em;color:#092b60;margin:0 0 22px;'+
      'padding:18px 0 14px;border-bottom:4px solid #f6b916}'+
    '@media(max-width:1050px){#v143EventContext{gap:8px 16px}'+
      '#v143EventName{font-size:27px}#v143EventContext .v143-event-meta{font-size:13px}}'+
    '</style>');
  const v143OldUpdateLayout=v6UpdateLayout;
  v6UpdateLayout=function(){
    const result=v143OldUpdateLayout.apply(this,arguments);
    v143ApprovedHeader();
    return result;
  };
  const v143OldSwitchPage=switchPage;
  switchPage=function(destination){
    const result=v143OldSwitchPage.apply(this,arguments);
    v143ApprovedHeader();
    return result;
  };
  v143ApprovedHeader();
